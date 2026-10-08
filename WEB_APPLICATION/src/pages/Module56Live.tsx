import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Plot from 'react-plotly.js';

import opticalFlowScriptRaw from '../../../MODULE56/optical_flow.py?raw';
import trackingScriptRaw from '../../../MODULE56/validate_tracking.py?raw';
import sfmScriptRaw from '../../../MODULE56/sfm_planar.py?raw';

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

interface Point {
  x: number;
  y: number;
  pctX?: number;
  pctY?: number;
}

const Module56Live: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading Python environment...");
  
  // ==========================================
  // SECTION 1: OPTICAL FLOW
  // ==========================================
  const [ofVideoUrl, setOfVideoUrl] = useState<string | null>(null);
  const ofVideoRef = useRef<HTMLVideoElement>(null);
  const [ofLog, setOfLog] = useState<string>("");
  const [isProcessingOf, setIsProcessingOf] = useState<boolean>(false);
  const [ofResultFrames, setOfResultFrames] = useState<string[]>([]);
  const [ofCurrentFrameIdx, setOfCurrentFrameIdx] = useState<number>(0);

  useEffect(() => {
    if (ofResultFrames.length > 0) {
      let idx = 0;
      const interval = setInterval(() => {
        idx = (idx + 1) % ofResultFrames.length;
        setOfCurrentFrameIdx(idx);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [ofResultFrames]);

  // ==========================================
  // SECTION 2: TRACKING VALIDATION
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [trackingPoint, setTrackingPoint] = useState<Point | null>(null);
  const [trackingLog, setTrackingLog] = useState<string>("");
  const [isProcessingTracking, setIsProcessingTracking] = useState<boolean>(false);
  const [trackingResultImg, setTrackingResultImg] = useState<string | null>(null);

  // ==========================================
  // SECTION 3: SFM PLANAR
  // ==========================================
  const [sfmImages, setSfmImages] = useState<{file: File, url: string, points: Point[]}[]>([]);
  const [sfmLog, setSfmLog] = useState<string>("");
  const [isProcessingSfm, setIsProcessingSfm] = useState<boolean>(false);
  const [sfmCurrentImgIdx, setSfmCurrentImgIdx] = useState<number>(0);
  const [sfmResultImg, setSfmResultImg] = useState<string | null>(null);
  const [sfmPoints, setSfmPoints] = useState<{x: number[], y: number[], z: number[]} | null>(null);


  useEffect(() => {
    const loadScript = () => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    async function initPyodide() {
      try {
        await loadScript();
        const py = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
        });
        setLoadingMsg("Installing OpenCV, NumPy, and Matplotlib into browser...");
        await py.loadPackage(['numpy', 'opencv-python', 'matplotlib', 'Pillow']);
        
        py.FS.mkdir('/sfm_images');
        py.FS.mkdir('/videos');
        py.FS.mkdir('/output');
        
        setPyodide(py);
        setLoadingMsg("");
      } catch (err) {
        console.error(err);
        setLoadingMsg("Error loading Python environment.");
      }
    }
    initPyodide();
  }, []);

  const extractFrame = (video: HTMLVideoElement): string => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Returns data:image/jpeg;base64,...
    const dataUrl = canvas.toDataURL('image/jpeg');
    return dataUrl.split(',')[1];
  };

  // --- Optical Flow Handlers ---
  const handleOfVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setOfVideoUrl(URL.createObjectURL(file));
      setOfLog("");
      setOfResultFrames([]);
    }
  };

  const runOpticalFlow = async () => {
    if (!pyodide || !ofVideoRef.current) return;
    setIsProcessingOf(true);
    setOfLog("");
    setOfResultFrames([]);
    setOfCurrentFrameIdx(0);

    try {
      ofVideoRef.current.pause();

      const numFrames = 15;
      for (let i = 0; i < numFrames; i++) {
        const frameBase64 = extractFrame(ofVideoRef.current);
        const fData = Uint8Array.from(atob(frameBase64), c => c.charCodeAt(0));
        pyodide.FS.writeFile(`/of_frame${i}.jpg`, fData);

        ofVideoRef.current.currentTime += 0.033;
        await Promise.race([
          new Promise<void>((resolve) => {
            const onSeeked = () => {
              ofVideoRef.current?.removeEventListener('seeked', onSeeked);
              resolve();
            };
            ofVideoRef.current?.addEventListener('seeked', onSeeked);
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 500))
        ]);
      }
      
      pyodide.FS.writeFile('/videos/dummy.mp4', new Uint8Array());

      const monkeyPatch = `
import cv2
import numpy as np
import sys
import os

__file__ = '/script.py'

class Logger(object):
    def __init__(self):
        self.logs = []
    def write(self, message):
        self.logs.append(message)
    def flush(self):
        pass
sys.stdout = Logger()

class MockCap:
    def __init__(self, path):
        self.frames = []
        for i in range(${numFrames}):
            img = cv2.imread(f'/of_frame{i}.jpg')
            if img is not None:
                self.frames.append(img)
        self.idx = 0
    def isOpened(self): return True
    def get(self, prop): 
        if prop == cv2.CAP_PROP_FPS: return 30.0
        if prop == cv2.CAP_PROP_FRAME_WIDTH: return self.frames[0].shape[1] if len(self.frames) > 0 else 640
        if prop == cv2.CAP_PROP_FRAME_HEIGHT: return self.frames[0].shape[0] if len(self.frames) > 0 else 480
        return 100
    def set(self, prop, val): pass
    def read(self):
        if self.idx < len(self.frames):
            frame = self.frames[self.idx]
            self.idx += 1
            if frame is None:
                return False, None
            return True, frame
        return False, None
    def release(self): pass

cv2.VideoCapture = MockCap

class MockWriter:
    def __init__(self, path, fourcc, fps, size):
        self.idx = 0
    def write(self, frame):
        cv2.imwrite(f'/output/of_result_{self.idx}.png', frame)
        self.idx += 1
    def release(self): pass

cv2.VideoWriter = MockWriter
cv2.VideoWriter_fourcc = lambda *args: 0
`;

      await pyodide.runPythonAsync(monkeyPatch + '\n' + opticalFlowScriptRaw);
      
      const logs = pyodide.runPython('sys.stdout.logs').toJs().join('');
      setOfLog(logs);

      const generatedFrames = [];
      for (let i = 0; i < numFrames - 1; i++) {
        try {
          const outData = pyodide.FS.readFile(`/output/of_result_${i}.png`);
          generatedFrames.push(URL.createObjectURL(new Blob([outData], { type: 'image/png' })));
        } catch (e) {
          break;
        }
      }
      setOfResultFrames(generatedFrames);
      
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsProcessingOf(false);
    }
  };


  // --- Tracking Handlers ---
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setVideoUrl(URL.createObjectURL(file));
      setTrackingPoint(null);
      setTrackingLog("");
      setTrackingResultImg(null);
    }
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.preventDefault();
    if (!videoRef.current) return;
    
    // Force the video to stay paused so clicking doesn't accidentally play it
    videoRef.current.pause();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = videoRef.current.videoWidth / rect.width;
    const scaleY = videoRef.current.videoHeight / rect.height;
    
    const trueX = Math.round(x * scaleX);
    const trueY = Math.round(y * scaleY);
    setTrackingPoint({ x: trueX, y: trueY });
  };

  const runTracking = async () => {
    if (!pyodide || !videoRef.current || !trackingPoint) return;
    setIsProcessingTracking(true);
    setTrackingLog("");
    setTrackingResultImg(null);

    try {
      videoRef.current.pause();

      const frame1Base64 = extractFrame(videoRef.current);
      videoRef.current.currentTime += 0.033;
      await Promise.race([
        new Promise<void>((resolve) => {
          const onSeeked = () => {
            videoRef.current?.removeEventListener('seeked', onSeeked);
            resolve();
          };
          videoRef.current?.addEventListener('seeked', onSeeked);
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 500))
      ]);
      
      const frame2Base64 = extractFrame(videoRef.current);

      const f1Data = Uint8Array.from(atob(frame1Base64), c => c.charCodeAt(0));
      const f2Data = Uint8Array.from(atob(frame2Base64), c => c.charCodeAt(0));
      pyodide.FS.writeFile('/frame1.jpg', f1Data);
      pyodide.FS.writeFile('/frame2.jpg', f2Data);
      
      pyodide.FS.writeFile('/videos/dummy.mp4', new Uint8Array());

      const monkeyPatch = `
import cv2
import numpy as np
import sys
import os

__file__ = '/script.py'

class Logger(object):
    def __init__(self):
        self.logs = []
    def write(self, message):
        self.logs.append(message)
    def flush(self):
        pass
sys.stdout = Logger()

class MockCap:
    def __init__(self, path):
        self.frames = [cv2.imread('/frame1.jpg'), cv2.imread('/frame2.jpg')]
        self.idx = 0
    def isOpened(self): return True
    def get(self, prop): return 100
    def set(self, prop, val): pass
    def read(self):
        if self.idx < len(self.frames):
            frame = self.frames[self.idx]
            self.idx += 1
            if frame is None:
                return False, None
            return True, frame
        return False, None
    def release(self): pass

cv2.VideoCapture = MockCap
`;

      const customProcess = `
def process_validation(video_path, output_dir):
    print(f"\\n--- Validating tracking for: video ---")
    frame1 = cv2.imread('/frame1.jpg')
    frame2 = cv2.imread('/frame2.jpg')
    
    if frame1 is None or frame2 is None:
        print("Error: Could not read video frames.")
        return

    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    
    x_orig, y_orig = ${trackingPoint.x}, ${trackingPoint.y}
    point_orig = (x_orig, y_orig)
    p0 = np.array([[[np.float32(x_orig), np.float32(y_orig)]]])
    
    print(f"Selected Feature (Pixel) in Frame 1: ({x_orig:.2f}, {y_orig:.2f})")
    
    lk_params = dict(winSize=(15, 15), maxLevel=2, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03))
    p1, st, err = cv2.calcOpticalFlowPyrLK(gray1, gray2, p0, None, **lk_params)
    
    x_cv, y_cv = p1[0][0]
    print(f"OpenCV Actual Tracked Location:      ({x_cv:.2f}, {y_cv:.2f})")
    print(f"Actual Pixel Displacement:          u = {(x_cv - x_orig):.4f}, v = {(y_cv - y_orig):.4f}")
    
    u_th, v_th = calculate_theoretical_lk(gray1, gray2, point_orig, window_size=31)
    print(f"Theoretical Math Displacement:      u = {u_th:.4f}, v = {v_th:.4f}")
    print(f"Theoretical Validated Location:     ({(x_orig + u_th):.2f}, {(y_orig + v_th):.2f})")
    
    err_u = abs((x_cv - x_orig) - u_th)
    err_v = abs((y_cv - y_orig) - v_th)
    print(f"Validation Delta Error:             u_diff = {err_u:.4f}, v_diff = {err_v:.4f}")
    
    vis1 = frame1.copy()
    vis2 = frame2.copy()
    cv2.circle(vis1, (int(x_orig), int(y_orig)), 5, (0, 0, 255), -1)
    cv2.putText(vis1, "Frame 1: Original Pixel", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    cv2.circle(vis2, (int(x_cv), int(y_cv)), 8, (0, 255, 0), 2)
    cv2.circle(vis2, (int(x_orig + u_th), int(y_orig + v_th)), 3, (255, 0, 0), -1)
    cv2.line(vis2, (int(x_orig), int(y_orig)), (int(x_cv), int(y_cv)), (0, 255, 0), 1)
    cv2.line(vis2, (int(x_orig), int(y_orig)), (int(x_orig + u_th), int(y_orig + v_th)), (255, 0, 0), 1)
    cv2.putText(vis2, "Frame 2: Tracked Locations", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(vis2, "Green: Actual Tracked (OpenCV)", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(vis2, "Blue: Theoretical Validation", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
    
    combined_vis = np.hstack((vis1, vis2))
    cv2.imwrite('/output/validation.png', combined_vis)
`;
      
      const patchedScript = trackingScriptRaw.replace(/def process_validation[\s\S]*?if __name__ == "__main__":/, customProcess + "\nif __name__ == \"__main__\":");

      await pyodide.runPythonAsync(monkeyPatch + '\n' + patchedScript);
      
      const logs = pyodide.runPython('sys.stdout.logs').toJs().join('');
      setTrackingLog(logs);

      try {
        const outData = pyodide.FS.readFile('/output/validation.png');
        setTrackingResultImg(URL.createObjectURL(new Blob([outData], { type: 'image/png' })));
      } catch (e) {}
      
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsProcessingTracking(false);
    }
  };

  // --- SFM Handlers ---
  const handleSfmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 4);
      const newImages = files.map(f => ({
        file: f,
        url: URL.createObjectURL(f),
        points: []
      }));
      setSfmImages(newImages);
      setSfmCurrentImgIdx(0);
      setSfmLog("");
      setSfmResultImg(null);
      setSfmPoints(null);
    }
  };

  const handleSfmImageClick = (e: React.MouseEvent<HTMLImageElement>, imgIdx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = e.currentTarget.naturalWidth / rect.width;
    const scaleY = e.currentTarget.naturalHeight / rect.height;
    
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;
    
    const trueX = Math.round(x * scaleX);
    const trueY = Math.round(y * scaleY);
    
    setSfmImages(prev => {
      const newArr = [...prev];
      // Create a fresh copy of the points array for this image so we don't mutate the existing state!
      const currentPoints = [...newArr[imgIdx].points];
      
      if (currentPoints.length < 4) {
        currentPoints.push({ x: trueX, y: trueY, pctX, pctY });
        newArr[imgIdx] = { ...newArr[imgIdx], points: currentPoints };
      }
      return newArr;
    });
  };

  const runSfm = async () => {
    if (!pyodide || sfmImages.length < 4) return;
    
    for (let i = 0; i < 4; i++) {
      if (sfmImages[i].points.length < 4) {
        alert("Please click 4 points on all 4 images.");
        return;
      }
    }

    setIsProcessingSfm(true);
    setSfmLog("");
    setSfmResultImg(null);
    setSfmPoints(null);

    try {
      try {
        const existing = pyodide.FS.readdir('/sfm_images');
        for (const file of existing) {
          if (file !== '.' && file !== '..') pyodide.FS.unlink('/sfm_images/' + file);
        }
      } catch (e) {}

      for (let i = 0; i < sfmImages.length; i++) {
        const arrayBuffer = await sfmImages[i].file.arrayBuffer();
        pyodide.FS.writeFile('/sfm_images/img_' + i + '.jpg', new Uint8Array(arrayBuffer));
      }

      const pyPointsStr = sfmImages.map(img => 
        "[" + img.points.map(p => `(${p.x}, ${p.y})`).join(", ") + "]"
      ).join(", ");

      const monkeyPatch = `
import cv2
import numpy as np
import sys
import matplotlib
import matplotlib.pyplot as plt
import os

__file__ = '/script.py'

class Logger(object):
    def __init__(self):
        self.logs = []
    def write(self, message):
        self.logs.append(message)
    def flush(self):
        pass
sys.stdout = Logger()

def dummy_show(*args, **kwargs):
    plt.savefig('/output/sfm_plot.png')
    print("3D Plot generation successful (Saved to image).")
plt.show = dummy_show

_js_points = [${pyPointsStr}]
_point_counter = 0

def my_get_points(image, window_name, num_points=4):
    global _point_counter
    pts = _js_points[_point_counter]
    _point_counter += 1
    return np.array(pts, dtype=np.float32)

`;

      const patchedScript = sfmScriptRaw.replace(/def get_points[\s\S]*?return np\.array\(points, dtype=np\.float32\)/, 
        "def get_points(image, window_name, num_points=4):\n    global _point_counter\n    pts = _js_points[_point_counter]\n    _point_counter += 1\n    return np.array(pts, dtype=np.float32)")
        .replace("plt.show()", "import json\n    with open('/output/sfm_points.json', 'w') as f:\n        json.dump({'x': X_plot.tolist(), 'y': Y_plot.tolist(), 'z': Z_plot.tolist()}, f)\n    plt.show()");

      await pyodide.runPythonAsync(monkeyPatch + '\n' + patchedScript);
      const logs = pyodide.runPython('sys.stdout.logs').toJs().join('');
      setSfmLog(logs);
      
      try {
        const outData = pyodide.FS.readFile('/output/sfm_plot.png');
        setSfmResultImg(URL.createObjectURL(new Blob([outData], { type: 'image/png' })));
      } catch (e) {}

      try {
        const pointsData = pyodide.FS.readFile('/output/sfm_points.json', { encoding: 'utf8' });
        setSfmPoints(JSON.parse(pointsData));
      } catch (e) {}
      
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsProcessingSfm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/module56" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Module 5/6
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Live Demo: Module 5 & 6</h1>
          <h2 className="text-2xl text-gray-600">Object Tracking and Structure from Flow</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {loadingMsg ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center text-blue-600 font-bold py-8">
            {loadingMsg}
          </div>
        ) : (
          <>
            {/* OPTICAL FLOW */}
            <section className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-4">1. Optical Flow Vector Field (optical_flow.py)</h3>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                <p className="font-semibold text-blue-800 mb-2">Instructions:</p>
                <ul className="list-disc pl-5 text-blue-700 space-y-1 text-sm">
                  <li>Upload a video using the button below.</li>
                  <li>Play the video and <strong>pause it exactly where you want to observe the motion</strong>.</li>
                  <li>Click the <strong>Run</strong> button below the video.</li>
                  <li>The script will automatically extract a short 0.5-second clip starting from your paused location, process the frames, and generate an animated vector field visualization!</li>
                </ul>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <input type="file" accept="video/*" onChange={handleOfVideoUpload} className="mb-4" />
                <p className="text-gray-500 text-sm">Upload Video</p>
              </div>

              {ofVideoUrl && (
                <div>
                  <div className="relative border shadow-sm mx-auto w-max group">
                    <video 
                      ref={ofVideoRef}
                      src={ofVideoUrl} 
                      controls 
                      style={{ maxHeight: '400px' }} 
                      className="rounded"
                    />
                  </div>

                  <div className="text-center mt-6 flex flex-col items-center">
                    <button 
                      onClick={runOpticalFlow} 
                      disabled={isProcessingOf}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium shadow disabled:bg-gray-400"
                    >
                      {isProcessingOf ? "Generating Vector Field..." : "Run optical_flow.py"}
                    </button>
                  </div>
                </div>
              )}

              {ofLog && (
                <div className="mt-6 border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <h4 className="font-bold mb-2">Terminal Output</h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm max-h-60 overflow-y-auto">
                    {ofLog}
                  </pre>
                </div>
              )}
              
              {ofResultFrames.length > 0 && (
                <div className="mt-6 border border-gray-200 rounded-xl p-6 bg-white flex flex-col items-center">
                  <h4 className="font-bold mb-4">Vector Field Visualization (0.5s Animation)</h4>
                  <img 
                    src={ofResultFrames[ofCurrentFrameIdx]} 
                    alt="Optical Flow Result Frame" 
                    className="max-w-full rounded border shadow mx-auto" 
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              )}
            </section>

            {/* TRACKING VALIDATION */}
            <section className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-4">2. Tracking Validation (Math vs OpenCV)</h3>
              <p className="text-gray-600 mb-4">Upload a video. Pause the video where you want to track a moving object, then click the object to validate its motion in the next frame.</p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="mb-4" />
                <p className="text-gray-500 text-sm">Upload Video</p>
              </div>

              {videoUrl && (
                <div>
                  <div className="relative border shadow-sm mx-auto w-max cursor-crosshair group">
                    <video 
                      ref={videoRef}
                      src={videoUrl} 
                      controls 
                      style={{ maxHeight: '400px' }} 
                      onClick={handleVideoClick}
                      className="rounded"
                    />
                    {trackingPoint && (
                      <div className="absolute top-2 left-2 bg-green-600 text-white p-2 rounded text-sm shadow">
                        Point Selected! Ready to validate.
                      </div>
                    )}
                  </div>

                  <div className="text-center mt-6 flex flex-col items-center">
                    {!trackingPoint && (
                      <p className="text-sm text-red-500 mb-2 font-semibold">Please click on the video frame to select a tracking point before running.</p>
                    )}
                    <button 
                      onClick={runTracking} 
                      disabled={isProcessingTracking || !trackingPoint}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium shadow disabled:bg-gray-400"
                    >
                      {isProcessingTracking ? "Calculating Tracking Matrices..." : "Run validate_tracking.py"}
                    </button>
                  </div>
                </div>
              )}

              {trackingLog && (
                <div className="mt-6 border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <h4 className="font-bold mb-2">Terminal Output</h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm max-h-60 overflow-y-auto">
                    {trackingLog}
                  </pre>
                </div>
              )}
              
              {trackingResultImg && (
                <div className="mt-6 border border-gray-200 rounded-xl p-6 bg-white flex flex-col items-center">
                  <h4 className="font-bold mb-4">Tracking Visualization</h4>
                  <img 
                    src={trackingResultImg} 
                    alt="Tracking Result" 
                    className="rounded border shadow mx-auto" 
                    style={{ width: '750px', maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              )}
            </section>

            {/* SFM PLANAR */}
            <section className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-4">3. Structure from Motion (Planar SVD)</h3>
              <p className="text-gray-600 mb-4">Upload exactly 4 images of a flat object. Click the 4 corners in the exact same order for each image.</p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <input type="file" accept="image/*" multiple onChange={handleSfmUpload} className="mb-4" />
                <p className="text-gray-500 text-sm">Upload 4 Images</p>
              </div>

              {sfmImages.length === 4 && (
                <div>
                  <div className="flex gap-2 mb-4 justify-center items-center">
                    {sfmImages.map((img, i) => (
                      <button 
                        key={i} 
                        onClick={() => setSfmCurrentImgIdx(i)}
                        className={`px-4 py-2 rounded ${sfmCurrentImgIdx === i ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      >
                        Image {i+1} ({img.points.length}/4 points)
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        setSfmImages(prev => {
                          const newArr = [...prev];
                          newArr[sfmCurrentImgIdx] = { ...newArr[sfmCurrentImgIdx], points: [] };
                          return newArr;
                        });
                      }}
                      className="ml-4 px-4 py-2 rounded bg-red-100 text-red-600 hover:bg-red-200 font-semibold"
                    >
                      Clear Points
                    </button>
                  </div>

                  <div className="relative border shadow-sm mx-auto w-max cursor-crosshair">
                    <img 
                      src={sfmImages[sfmCurrentImgIdx].url} 
                      alt="SFM Input" 
                      style={{ maxHeight: '500px' }} 
                      onClick={(e) => handleSfmImageClick(e, sfmCurrentImgIdx)}
                    />
                    {/* Draw Selected Points */}
                    {sfmImages[sfmCurrentImgIdx].points.map((p, idx) => (
                      <div 
                        key={idx}
                        className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                        style={{ left: `${p.pctX}%`, top: `${p.pctY}%` }}
                      />
                    ))}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white p-2 rounded text-sm pointer-events-none">
                      Points selected: {sfmImages[sfmCurrentImgIdx].points.length}/4
                      {sfmImages[sfmCurrentImgIdx].points.length >= 4 && " (Done)"}
                    </div>
                  </div>

                  <div className="text-center mt-6">
                    <button 
                      onClick={runSfm} 
                      disabled={isProcessingSfm}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium shadow disabled:bg-gray-400"
                    >
                      {isProcessingSfm ? "Running SVD Factorization..." : "Run sfm_planar.py"}
                    </button>
                  </div>
                </div>
              )}
              
              {sfmLog && (
                <div className="mt-6 border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <h4 className="font-bold mb-2">Terminal Output</h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm max-h-60 overflow-y-auto">
                    {sfmLog}
                  </pre>
                </div>
              )}
              
              {(sfmPoints || sfmResultImg) && (
                <div className="mt-6 border border-gray-200 rounded-xl p-6 bg-white flex flex-col items-center">
                  <h4 className="font-bold mb-4">Structure from Motion 3D Plot</h4>
                  {sfmPoints ? (() => {
                    const minX = Math.min(...sfmPoints.x);
                    const maxX = Math.max(...sfmPoints.x);
                    const minY = Math.min(...sfmPoints.y);
                    const maxY = Math.max(...sfmPoints.y);
                    const minZ = Math.min(...sfmPoints.z);
                    const maxZ = Math.max(...sfmPoints.z);
                    
                    const maxRange = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2.0 || 1;
                    const midX = (maxX + minX) / 2.0;
                    const midY = (maxY + minY) / 2.0;
                    const midZ = (maxZ + minZ) / 2.0;

                    return (
                      <Plot
                        data={[
                          {
                            x: sfmPoints.x,
                            y: sfmPoints.y,
                            z: sfmPoints.z,
                            type: 'scatter3d',
                            mode: 'lines+markers',
                            marker: {color: 'red', size: 6},
                            line: {color: 'red', width: 4}
                          }
                        ]}
                        layout={{
                          width: 700, 
                          height: 600, 
                          title: 'Interactive 3D Boundary',
                          margin: { l: 0, r: 0, b: 0, t: 40 },
                          scene: {
                            xaxis: { title: 'X', range: [midX - maxRange, midX + maxRange] },
                            yaxis: { title: 'Y', range: [midY - maxRange, midY + maxRange] },
                            zaxis: { title: 'Depth (Z)', range: [midZ - maxRange, midZ + maxRange] },
                            aspectmode: 'cube'
                          }
                        }}
                        config={{ displayModeBar: true, scrollZoom: true }}
                      />
                    );
                  })() : (
                    <img 
                      src={sfmResultImg as string} 
                      alt="SFM Result Plot" 
                      className="max-w-full h-auto rounded border shadow" 
                    />
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Module56Live;
