import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import sfmScriptRaw from '../../../MODULE56/sfm_planar.py?raw';
import trackingScriptRaw from '../../../MODULE56/validate_tracking.py?raw';

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

interface Point {
  x: number;
  y: number;
}

const Module56Live: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading Python environment...");
  
  // ==========================================
  // SECTION 1: SFM PLANAR STATE
  // ==========================================
  const [sfmImages, setSfmImages] = useState<{file: File, url: string, points: Point[]}[]>([]);
  const [sfmLog, setSfmLog] = useState<string>("");
  const [isProcessingSfm, setIsProcessingSfm] = useState<boolean>(false);
  const [sfmCurrentImgIdx, setSfmCurrentImgIdx] = useState<number>(0);

  // ==========================================
  // SECTION 2: TRACKING VALIDATION STATE
  // ==========================================
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [trackingPoint, setTrackingPoint] = useState<Point | null>(null);
  const [trackingLog, setTrackingLog] = useState<string>("");
  const [isProcessingTracking, setIsProcessingTracking] = useState<boolean>(false);
  const [trackingResultImg, setTrackingResultImg] = useState<string | null>(null);

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
    }
  };

  const handleSfmImageClick = (e: React.MouseEvent<HTMLImageElement>, imgIdx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coords to original image size
    const scaleX = e.currentTarget.naturalWidth / rect.width;
    const scaleY = e.currentTarget.naturalHeight / rect.height;
    
    const trueX = Math.round(x * scaleX);
    const trueY = Math.round(y * scaleY);
    
    setSfmImages(prev => {
      const newArr = [...prev];
      if (newArr[imgIdx].points.length < 4) {
        newArr[imgIdx].points.push({ x: trueX, y: trueY });
      }
      return newArr;
    });
  };

  const runSfm = async () => {
    if (!pyodide || sfmImages.length < 4) return;
    
    // Check if all have 4 points
    for (let i = 0; i < 4; i++) {
      if (sfmImages[i].points.length < 4) {
        alert("Please click 4 points on all 4 images.");
        return;
      }
    }

    setIsProcessingSfm(true);
    setSfmLog("");

    try {
      // Clear dir
      try {
        const existing = pyodide.FS.readdir('/sfm_images');
        for (const file of existing) {
          if (file !== '.' && file !== '..') pyodide.FS.unlink('/sfm_images/' + file);
        }
      } catch (e) {}

      // Write files
      for (let i = 0; i < sfmImages.length; i++) {
        const arrayBuffer = await sfmImages[i].file.arrayBuffer();
        pyodide.FS.writeFile('/sfm_images/img_' + i + '.jpg', new Uint8Array(arrayBuffer));
      }

      // Convert points to string for monkey patch injection
      const pyPointsStr = sfmImages.map(img => 
        "[" + img.points.map(p => \`(\${p.x}, \${p.y})\`).join(", ") + "]"
      ).join(", ");

      const monkeyPatch = \`
import cv2
import numpy as np
import sys
import matplotlib
import matplotlib.pyplot as plt
import os

__file__ = '/script.py'

# Hijack stdout
class Logger(object):
    def __init__(self):
        self.logs = []
    def write(self, message):
        self.logs.append(message)
    def flush(self):
        pass
sys.stdout = Logger()

# Hijack plt.show to do nothing so it doesn't crash in Pyodide
def dummy_show(*args, **kwargs):
    print("3D Plot generation successful (Matplotlib window disabled in browser).")
plt.show = dummy_show

# Inject hardcoded points from JS!
_js_points = [\${pyPointsStr}]
_point_counter = 0

def my_get_points(image, window_name, num_points=4):
    global _point_counter
    pts = _js_points[_point_counter]
    _point_counter += 1
    return np.array(pts, dtype=np.float32)

# Overwrite the function before the script runs
# Since sfm_planar defines get_points, we can just inject our definition!
\`;

      // We need to inject my_get_points over get_points. We will append the script but replace the def get_points
      const patchedScript = sfmScriptRaw.replace(/def get_points[\\s\\S]*?return np\\.array\\(points, dtype=np\\.float32\\)/, 
        "def get_points(image, window_name, num_points=4):\\n    global _point_counter\\n    pts = _js_points[_point_counter]\\n    _point_counter += 1\\n    return np.array(pts, dtype=np.float32)");

      await pyodide.runPythonAsync(monkeyPatch + '\\n' + patchedScript);
      const logs = pyodide.runPython('sys.stdout.logs').toJs().join('');
      setSfmLog(logs);
      
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsProcessingSfm(false);
    }
  };

  // --- Tracking Handlers ---
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setTrackingPoint(null);
      setTrackingLog("");
      setTrackingResultImg(null);
    }
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coords to original video resolution
    const scaleX = videoRef.current.videoWidth / rect.width;
    const scaleY = videoRef.current.videoHeight / rect.height;
    
    const trueX = Math.round(x * scaleX);
    const trueY = Math.round(y * scaleY);
    setTrackingPoint({ x: trueX, y: trueY });
  };

  const extractFrame = (video: HTMLVideoElement): string => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg").split(',')[1];
  };

  const runTracking = async () => {
    if (!pyodide || !videoRef.current || !trackingPoint) return;
    setIsProcessingTracking(true);
    setTrackingLog("");
    setTrackingResultImg(null);

    try {
      // Pause video if playing
      videoRef.current.pause();

      // Extract current frame
      const frame1Base64 = extractFrame(videoRef.current);
      
      // Step forward ~1 frame (assume 30fps = 0.033s)
      videoRef.current.currentTime += 0.033;
      
      // Wait for seeked event to ensure frame is loaded
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          videoRef.current?.removeEventListener('seeked', onSeeked);
          resolve();
        };
        videoRef.current?.addEventListener('seeked', onSeeked);
      });
      
      // Extract next frame
      const frame2Base64 = extractFrame(videoRef.current);

      // Write to Pyodide
      const f1Data = Uint8Array.from(atob(frame1Base64), c => c.charCodeAt(0));
      const f2Data = Uint8Array.from(atob(frame2Base64), c => c.charCodeAt(0));
      pyodide.FS.writeFile('/frame1.jpg', f1Data);
      pyodide.FS.writeFile('/frame2.jpg', f2Data);
      
      // Dummy video file for the script to find
      pyodide.FS.writeFile('/videos/dummy.mp4', new Uint8Array());

      const monkeyPatch = \`
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

# Mock VideoCapture to return our two frames!
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
            return True, frame
        return False, None
    def release(self): pass

cv2.VideoCapture = MockCap

# Override the process_validation function to skip UI
\`;

      // We will override process_validation to just do the math using hardcoded inputs
      const customProcess = \`
def process_validation(video_path, output_dir):
    print(f"\\n--- Validating tracking for: video ---")
    frame1 = cv2.imread('/frame1.jpg')
    frame2 = cv2.imread('/frame2.jpg')
    
    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    
    x_orig, y_orig = \${trackingPoint.x}, \${trackingPoint.y}
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
\`;
      
      // Inject into script
      const patchedScript = trackingScriptRaw.replace(/def process_validation[\\s\\S]*?if __name__ == "__main__":/, customProcess + "\\nif __name__ == \\\"__main__\\\":");

      await pyodide.runPythonAsync(monkeyPatch + '\\n' + patchedScript);
      
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/module56" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Module 5/6
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Live Demo: Module 5 & 6</h1>
          <h2 className="text-2xl text-gray-600">SfM and Optical Flow Validation</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {loadingMsg ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center text-blue-600 font-bold py-8">
            {loadingMsg}
          </div>
        ) : (
          <>
            <section className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-4">1. Structure from Motion (Planar SVD)</h3>
              <p className="text-gray-600 mb-4">Upload exactly 4 images of a flat object. Click the 4 corners in the exact same order for each image.</p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <input type="file" accept="image/*" multiple onChange={handleSfmUpload} className="mb-4" />
                <p className="text-gray-500 text-sm">Upload 4 Images</p>
              </div>

              {sfmImages.length === 4 && (
                <div>
                  <div className="flex gap-2 mb-4 justify-center">
                    {sfmImages.map((img, i) => (
                      <button 
                        key={i} 
                        onClick={() => setSfmCurrentImgIdx(i)}
                        className={\`px-4 py-2 rounded \${sfmCurrentImgIdx === i ? 'bg-blue-600 text-white' : 'bg-gray-200'}\`}
                      >
                        Image {i+1} ({img.points.length}/4 points)
                      </button>
                    ))}
                  </div>

                  <div className="relative border shadow-sm mx-auto w-max cursor-crosshair">
                    <img 
                      src={sfmImages[sfmCurrentImgIdx].url} 
                      alt="SFM Input" 
                      style={{ maxHeight: '500px' }} 
                      onClick={(e) => handleSfmImageClick(e, sfmCurrentImgIdx)}
                    />
                    {/* Draw Points */}
                    {sfmImages[sfmCurrentImgIdx].points.map((p, idx) => {
                      // We don't have the natural scale here easily in React without tracking the actual displayed size,
                      // but for visual purposes, we can just display it roughly or rely on the python script.
                      // To draw it correctly in React overlay, we need exact scaling, so let's skip visual overlay for now 
                      // and just show a message.
                      return null;
                    })}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white p-2 rounded text-sm">
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
            </section>

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

                  {trackingPoint && (
                    <div className="text-center mt-6">
                      <button 
                        onClick={runTracking} 
                        disabled={isProcessingTracking}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium shadow disabled:bg-gray-400"
                      >
                        {isProcessingTracking ? "Calculating Tracking Matrices..." : "Run validate_tracking.py"}
                      </button>
                    </div>
                  )}
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
                <div className="mt-6 border border-gray-200 rounded-xl p-6 bg-white text-center">
                  <h4 className="font-bold mb-4">Tracking Visualization</h4>
                  <img src={trackingResultImg} alt="Tracking Result" className="max-w-full h-auto rounded border shadow mx-auto" />
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
