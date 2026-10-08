import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Import the EXACT files from Module 2 as raw text!
import dimensionsScript from '../../../MODULE2/get_real_world_2d_dimensions_code.py?raw';
import calibrationScriptRaw from '../../../MODULE2/calibration_code.py?raw';
import initialCalibrationParamsJson from '../../../MODULE2/calibration_params.json?raw';

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

interface OutputImage {
  title: string;
  url: string;
}

// Import all images from MODULE2/measurements and MODULE2/images
const measurementsGlob = import.meta.glob('../../../MODULE2/measurements/*.jpg', { as: 'url', eager: true });
const calibrationGlob = import.meta.glob('../../../MODULE2/images/*.jpg', { as: 'url', eager: true });

const Module2Live: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading Python environment (this may take a minute)...");
  
  const [outputImages, setOutputImages] = useState<OutputImage[]>([]);
  const [measurementLog, setMeasurementLog] = useState<string>("");
  const [isProcessingMeasurements, setIsProcessingMeasurements] = useState<boolean>(false);
  
  const [calibrationLog, setCalibrationLog] = useState<string>("");
  const [isProcessingCalibration, setIsProcessingCalibration] = useState<boolean>(false);
  const [calibrationParamsDisplay, setCalibrationParamsDisplay] = useState<string>("");

  const calibrationImagesUrls = Object.values(calibrationGlob) as string[];

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
        setLoadingMsg("Installing OpenCV, NumPy, and Pillow into browser...");
        await py.loadPackage(['numpy', 'opencv-python', 'Pillow']);
        
        setLoadingMsg("Loading image datasets into virtual filesystem...");
        
        // Setup initial file system structure needed by the script
        py.FS.mkdir('/measurements');
        py.FS.mkdir('/images');
        
        // Write default params just in case they don't run calibration first
        py.FS.writeFile('/calibration_params.json', initialCalibrationParamsJson);
        
        // Load measurement images
        for (const [path, url] of Object.entries(measurementsGlob)) {
          const filename = path.split('/').pop();
          if (filename && typeof url === 'string') {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            py.FS.writeFile('/measurements/' + filename, new Uint8Array(arrayBuffer));
          }
        }
        
        // Load calibration images
        for (const [path, url] of Object.entries(calibrationGlob)) {
          const filename = path.split('/').pop();
          if (filename && typeof url === 'string') {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            py.FS.writeFile('/images/' + filename, new Uint8Array(arrayBuffer));
          }
        }
        
        setPyodide(py);
        setLoadingMsg("");
      } catch (err) {
        console.error(err);
        setLoadingMsg("Error loading Python environment. Check console for details.");
      }
    }
    initPyodide();
  }, []);

  const runCalibration = async () => {
    if (!pyodide) return;
    setIsProcessingCalibration(true);
    setCalibrationLog("");

    try {
      try { pyodide.FS.unlink('/calibration_output.txt'); } catch(e) {}
      
      const monkeyPatch = `
import cv2
import numpy as np
from PIL import Image, ImageOps
import os
import sys

os.chdir('/')

# Hijack imread
_original_imread = cv2.imread
def my_imread(path, *args, **kwargs):
    if not os.path.exists(path):
        return None
    try:
        pil_img = Image.open(path).convert('RGB')
        pil_img = ImageOps.exif_transpose(pil_img)
        open_cv_image = np.array(pil_img)
        return open_cv_image[:, :, ::-1].copy()
    except Exception as e:
        return None
cv2.imread = my_imread

cv2.waitKey = lambda *args, **kwargs: None
cv2.destroyAllWindows = lambda *args, **kwargs: None
cv2.namedWindow = lambda *args, **kwargs: None
cv2.resizeWindow = lambda *args, **kwargs: None
`;

      await pyodide.runPythonAsync(monkeyPatch + '\n' + calibrationScriptRaw);

      try {
        const textLog = pyodide.FS.readFile('/calibration_output.txt', { encoding: 'utf8' });
        setCalibrationLog(textLog);
      } catch (e) {
        setCalibrationLog("No calibration output found.");
      }
      
      try {
        const generatedParams = pyodide.FS.readFile('/calibration_params.json', { encoding: 'utf8' });
        setCalibrationParamsDisplay(generatedParams);
      } catch (e) {}
      
    } catch (err: any) {
      console.error(err);
      alert("Error running calibration: \\n\\n" + err.message);
    } finally {
      setIsProcessingCalibration(false);
    }
  };

  const runMeasurements = async () => {
    if (!pyodide) return;
    setIsProcessingMeasurements(true);
    setOutputImages([]);
    setMeasurementLog("");

    try {
      try { pyodide.FS.unlink('/dimensions_output.txt'); } catch(e) {}

      const monkeyPatch = `
import cv2
import numpy as np
from PIL import Image, ImageOps
import os
import sys

os.chdir('/')

_last_imread_path = None
_original_imread = cv2.imread
def my_imread(path, *args, **kwargs):
    global _last_imread_path
    _last_imread_path = path
    if not os.path.exists(path):
        return None
    try:
        pil_img = Image.open(path).convert('RGB')
        pil_img = ImageOps.exif_transpose(pil_img)
        open_cv_image = np.array(pil_img)
        return open_cv_image[:, :, ::-1].copy()
    except Exception as e:
        return None
cv2.imread = my_imread

_output_titles = []
def my_imshow(title, img):
    global _imshow_counter
    global _last_imread_path
    if '_imshow_counter' not in globals():
        _imshow_counter = 0
    _imshow_counter += 1
    
    display_title = os.path.basename(_last_imread_path) if _last_imread_path else f"{title}_{_imshow_counter}"
    
    filename = f'/output_{_imshow_counter}.jpg'
    rgb_img = img[:, :, ::-1]
    pil_img = Image.fromarray(rgb_img)
    pil_img.save(filename)
    _output_titles.append((display_title, filename))
cv2.imshow = my_imshow

cv2.waitKey = lambda *args, **kwargs: None
cv2.destroyAllWindows = lambda *args, **kwargs: None
cv2.namedWindow = lambda *args, **kwargs: None
cv2.resizeWindow = lambda *args, **kwargs: None
`;

      await pyodide.runPythonAsync(monkeyPatch + '\n' + dimensionsScript);

      const outputMeta = pyodide.runPython('_output_titles').toJs();
      const newOutputs: OutputImage[] = [];
      for (const item of outputMeta) {
        const title = item[0];
        const filename = item[1];
        try {
          const outputData = pyodide.FS.readFile(filename);
          const blob = new Blob([outputData], { type: 'image/jpeg' });
          newOutputs.push({
            title: title,
            url: URL.createObjectURL(blob)
          });
        } catch (e) {
            console.error("Could not load", filename);
        }
      }
      setOutputImages(newOutputs);

      try {
        const textLog = pyodide.FS.readFile('/dimensions_output.txt', { encoding: 'utf8' });
        setMeasurementLog(textLog);
      } catch (e) {
        setMeasurementLog("No dimensions output found.");
      }
      
    } catch (err: any) {
      console.error(err);
      alert("Error processing measurements: \\n\\n" + err.message);
    } finally {
      setIsProcessingMeasurements(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/module2" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Module 2
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Live Demo: Module 2</h1>
          <h2 className="text-2xl text-gray-600">Full Camera Calibration & Measurement Pipeline</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <section className="bg-white p-6 rounded-lg shadow-md">
          {loadingMsg ? (
            <div className="text-center text-blue-600 font-bold py-8">
              {loadingMsg}
            </div>
          ) : (
            <div className="space-y-12">
              
              {/* STEP 1: CALIBRATION */}
              <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                <h3 className="text-2xl font-bold mb-4">Step 1: Camera Calibration</h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-sm text-blue-800">
                  <p><strong>Pre-loaded Data:</strong> We have automatically loaded 14 checkerboard calibration images (captured by a smartphone) into the virtual filesystem.</p>
                  
                  <div className="flex flex-wrap gap-2 mt-4 mb-4 justify-center">
                    {calibrationImagesUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Calibration ${idx}`} className="rounded border border-blue-300 shadow-sm" style={{ height: '64px', width: 'auto', objectFit: 'cover' }} />
                    ))}
                  </div>

                  <p className="mt-2">Run the calibration script to analyze these images, find the chessboard corners, and compute the intrinsic camera matrix and distortion coefficients.</p>
                </div>

                <div className="text-center mb-6">
                  <button 
                    onClick={runCalibration} 
                    disabled={isProcessingCalibration}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-lg shadow disabled:bg-gray-400"
                  >
                    {isProcessingCalibration ? "Processing 14 Images..." : "Run calibration_code.py"}
                  </button>
                </div>

                {calibrationLog && (
                  <div className="mt-4">
                    <h4 className="font-bold mb-2">Calibration Terminal Output</h4>
                    <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto text-sm max-h-60 overflow-y-auto">
                      {calibrationLog}
                    </pre>
                  </div>
                )}
                
                {calibrationParamsDisplay && (
                  <div className="mt-4">
                    <h4 className="font-bold mb-2">Generated calibration_params.json</h4>
                    <pre className="bg-white border border-gray-300 p-4 rounded-lg text-xs overflow-x-auto max-h-60 overflow-y-auto">
                      {calibrationParamsDisplay}
                    </pre>
                  </div>
                )}
              </div>

              {/* STEP 2: MEASUREMENTS */}
              <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                <h3 className="text-2xl font-bold mb-4">Step 2: Object Measurement</h3>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6 text-sm text-green-800">
                  <p><strong>Pre-loaded Data:</strong> We have loaded 20 pre-captured measurement images.</p>
                  <p className="mt-2">This script will read the <code>calibration_params.json</code> generated above, undistort the images, isolate the objects, and compute their real-world dimensions using perspective projection.</p>
                </div>

                <div className="text-center mb-6">
                  <button 
                    onClick={runMeasurements} 
                    disabled={isProcessingMeasurements}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-medium text-lg shadow disabled:bg-gray-400"
                  >
                    {isProcessingMeasurements ? "Processing 20 Images..." : "Run get_real_world_2d_dimensions_code.py"}
                  </button>
                </div>

                {measurementLog && (
                  <div className="mt-4">
                    <h4 className="font-bold mb-2">Measurement Terminal Output</h4>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm max-h-60 overflow-y-auto">
                      {measurementLog}
                    </pre>
                  </div>
                )}

                {outputImages.length > 0 && (
                  <div className="mt-8 border-t pt-8">
                    <h4 className="text-xl font-bold mb-4 text-center">Script Output ({outputImages.length} images processed)</h4>
                    <div className="flex flex-col gap-8 w-full">
                      {outputImages.map((img, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg shadow border border-gray-200 w-full overflow-hidden flex flex-col items-center">
                          <h5 className="text-xl font-bold text-center mb-4 text-gray-700">{img.title}</h5>
                          <img src={img.url} alt={img.title} className="rounded" style={{ width: '100%', maxWidth: '100%', height: 'auto', display: 'block' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Module2Live;

