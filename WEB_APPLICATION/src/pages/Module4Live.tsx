import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import humanScriptRaw from '../../../MODULE4/human_segmentation.py?raw';
import thermalScriptRaw from '../../../MODULE4/thermal_segmentation.py?raw';

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

interface OutputImage {
  title: string;
  url: string;
}

const Module4Live: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading Python environment (this may take a minute)...");
  
  // RGB State
  const [rgbImageFile, setRgbImageFile] = useState<File | null>(null);
  const [rgbOriginalUrl, setRgbOriginalUrl] = useState<string | null>(null);
  const [rgbOutputs, setRgbOutputs] = useState<OutputImage[]>([]);
  const [isProcessingRgb, setIsProcessingRgb] = useState<boolean>(false);

  // Thermal State
  const [thermalImageFile, setThermalImageFile] = useState<File | null>(null);
  const [thermalOriginalUrl, setThermalOriginalUrl] = useState<string | null>(null);
  const [thermalOutputs, setThermalOutputs] = useState<OutputImage[]>([]);
  const [isProcessingThermal, setIsProcessingThermal] = useState<boolean>(false);

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
        
        // Setup initial directories
        py.FS.mkdir('/image');
        py.FS.mkdir('/thermal_image');
        
        setPyodide(py);
        setLoadingMsg("");
      } catch (err) {
        console.error(err);
        setLoadingMsg("Error loading Python environment. Check console for details.");
      }
    }
    initPyodide();
  }, []);

  const handleRgbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setRgbImageFile(file);
      setRgbOriginalUrl(URL.createObjectURL(file));
      setRgbOutputs([]);
    }
  };

  const handleThermalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setThermalImageFile(file);
      setThermalOriginalUrl(URL.createObjectURL(file));
      setThermalOutputs([]);
    }
  };

  const getMonkeyPatch = () => `
import cv2
import numpy as np
from PIL import Image
import os
import sys

__file__ = '/script.py'
os.chdir('/')

_original_imread = cv2.imread
def my_imread(path, *args, **kwargs):
    if not os.path.exists(path):
        return None
    try:
        pil_img = Image.open(path).convert('RGB')
        open_cv_image = np.array(pil_img)
        return open_cv_image[:, :, ::-1].copy()
    except Exception as e:
        return None
cv2.imread = my_imread

_output_titles = []
def my_imshow(title, img):
    global _imshow_counter
    if '_imshow_counter' not in globals():
        _imshow_counter = 0
    _imshow_counter += 1
    
    filename = f'/output_{title.replace(" ", "_")}_{_imshow_counter}.jpg'
    
    if len(img.shape) == 2:
        pil_img = Image.fromarray(img).convert('RGB')
    else:
        rgb_img = img[:, :, ::-1]
        pil_img = Image.fromarray(rgb_img)
        
    pil_img.save(filename)
    _output_titles.append((title, filename))
cv2.imshow = my_imshow

cv2.waitKey = lambda *args, **kwargs: None
cv2.destroyAllWindows = lambda *args, **kwargs: None
cv2.namedWindow = lambda *args, **kwargs: None
cv2.resizeWindow = lambda *args, **kwargs: None
`;

  const readOutputs = (py: any) => {
    const outputMeta = py.runPython('_output_titles').toJs();
    const newOutputs: OutputImage[] = [];
    for (const item of outputMeta) {
      const title = item[0];
      const filename = item[1];
      try {
        const outputData = py.FS.readFile(filename);
        const blob = new Blob([outputData], { type: 'image/jpeg' });
        newOutputs.push({
          title: title,
          url: URL.createObjectURL(blob)
        });
      } catch (e) {
          console.error("Could not load", filename);
      }
    }
    return newOutputs;
  };

  const runRgb = async () => {
    if (!pyodide || !rgbImageFile) return;
    setIsProcessingRgb(true);
    setRgbOutputs([]);

    try {
      try {
        const existing = pyodide.FS.readdir('/image');
        for (const file of existing) {
          if (file !== '.' && file !== '..') pyodide.FS.unlink('/image/' + file);
        }
      } catch (e) {}

      const arrayBuffer = await rgbImageFile.arrayBuffer();
      pyodide.FS.writeFile('/image/uploaded.jpg', new Uint8Array(arrayBuffer));

      await pyodide.runPythonAsync(getMonkeyPatch() + '\n' + humanScriptRaw);
      setRgbOutputs(readOutputs(pyodide));
      
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsProcessingRgb(false);
    }
  };

  const runThermal = async () => {
    if (!pyodide || !thermalImageFile) return;
    setIsProcessingThermal(true);
    setThermalOutputs([]);

    try {
      try {
        const existing = pyodide.FS.readdir('/thermal_image');
        for (const file of existing) {
          if (file !== '.' && file !== '..') pyodide.FS.unlink('/thermal_image/' + file);
        }
      } catch (e) {}

      const arrayBuffer = await thermalImageFile.arrayBuffer();
      pyodide.FS.writeFile('/thermal_image/uploaded.jpg', new Uint8Array(arrayBuffer));

      await pyodide.runPythonAsync(getMonkeyPatch() + '\n' + thermalScriptRaw);
      setThermalOutputs(readOutputs(pyodide));
      
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsProcessingThermal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/module4" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Module 4
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Live Demo: Module 4</h1>
          <h2 className="text-2xl text-gray-600">Classical Human Segmentation</h2>
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
              <h3 className="text-2xl font-bold mb-4">1. RGB Human Segmentation (GrabCut)</h3>
              <p className="text-gray-600 mb-4">Upload a standard photo of a person. The script will automatically draw a bounding box in the center and run GrabCut to extract the human.</p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <input type="file" accept="image/*" onChange={handleRgbUpload} className="mb-4" />
                <p className="text-gray-500 text-sm">Upload standard RGB image</p>
              </div>

              {rgbOriginalUrl && (
                <div className="text-center">
                  <button 
                    onClick={runRgb} 
                    disabled={isProcessingRgb}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium shadow disabled:bg-gray-400"
                  >
                    {isProcessingRgb ? "Processing..." : "Run human_segmentation.py"}
                  </button>
                </div>
              )}

              {rgbOutputs.length > 0 && (
                <div className="mt-8 border-t pt-8">
                  <h4 className="text-xl font-bold mb-4 text-center">GrabCut Results</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rgbOutputs.map((img, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg border">
                        <h5 className="font-semibold text-center mb-2">{img.title}</h5>
                        <img src={img.url} alt={img.title} className="w-full h-auto rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-4">2. Thermal Human Segmentation</h3>
              <p className="text-gray-600 mb-4">Upload a thermal camera image. The script uses Otsu's thresholding and morphological operations to isolate warm bodies.</p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <input type="file" accept="image/*" onChange={handleThermalUpload} className="mb-4" />
                <p className="text-gray-500 text-sm">Upload thermal image</p>
              </div>

              {thermalOriginalUrl && (
                <div className="text-center">
                  <button 
                    onClick={runThermal} 
                    disabled={isProcessingThermal}
                    className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition font-medium shadow disabled:bg-gray-400"
                  >
                    {isProcessingThermal ? "Processing..." : "Run thermal_segmentation.py"}
                  </button>
                </div>
              )}

              {thermalOutputs.length > 0 && (
                <div className="mt-8 border-t pt-8">
                  <h4 className="text-xl font-bold mb-4 text-center">Thermal Results</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {thermalOutputs.map((img, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg border">
                        <h5 className="font-semibold text-center mb-2">{img.title}</h5>
                        <img src={img.url} alt={img.title} className="w-full h-auto rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Module4Live;

