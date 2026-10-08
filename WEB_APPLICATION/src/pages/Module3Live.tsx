import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Import the EXACT script from Module 3 as raw text!
import spatialBlurScript from '../../../MODULE3/spatial_blurring_filter.py?raw';

import frequencyBlurScript from '../../../MODULE3/spatial_vs_frequency_blurring_filter.py?raw';

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

interface OutputImage {
  title: string;
  url: string;
}

const Module3Live: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading Python environment (this may take a minute)...");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [script1Images, setScript1Images] = useState<OutputImage[]>([]);
  const [script1Log, setScript1Log] = useState<string>("");
  const [script2Images, setScript2Images] = useState<OutputImage[]>([]);
  const [script2Log, setScript2Log] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
        setPyodide(py);
        setLoadingMsg("");
      } catch (err) {
        console.error(err);
        setLoadingMsg("Error loading Python environment. Check console for details.");
      }
    }
    initPyodide();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      setOriginalImageUrl(URL.createObjectURL(file));
      setScript1Images([]);
      setScript1Log("");
      setScript2Images([]);
      setScript2Log("");
    }
  };

  const processImage = async () => {
    if (!pyodide || !imageFile) return;
    setIsProcessing(true);
    setScript1Log("");
    setScript2Log("");

    try {
      // Write uploaded file to virtual file system
      const arrayBuffer = await imageFile.arrayBuffer();
      pyodide.FS.writeFile('/input.jpg', new Uint8Array(arrayBuffer));

      // MONKEY PATCH: We hijack cv2 functions so the exact script runs without modification!
      const monkeyPatch = `
import cv2
import numpy as np
from PIL import Image
import sys

# Hijack stdout
class Logger(object):
    def __init__(self):
        self.logs = []
    def write(self, message):
        self.logs.append(message)
    def flush(self):
        pass
sys.stdout = Logger()

# Hijack imread: Ignore the script's hardcoded path, load our uploaded image via Pillow
def my_imread(path, *args, **kwargs):
    pil_img = Image.open('/input.jpg').convert('RGB')
    open_cv_image = np.array(pil_img)
    
    flag = None
    if len(args) > 0:
        flag = args[0]
    elif 'flags' in kwargs:
        flag = kwargs['flags']
        
    bgr_img = open_cv_image[:, :, ::-1].copy()
    if flag == cv2.IMREAD_GRAYSCALE or flag == 0:
        return cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    return bgr_img
cv2.imread = my_imread

# Hijack imshow: Save the image via Pillow to the virtual filesystem
_output_titles = []
_imshow_counter = 0
def my_imshow(title, img):
    global _imshow_counter
    _imshow_counter += 1
    filename = f'/output_{_imshow_counter}.jpg'
    
    if len(img.shape) == 2:
        pil_img = Image.fromarray(img).convert('RGB')
    else:
        rgb_img = img[:, :, ::-1]
        pil_img = Image.fromarray(rgb_img)
        
    pil_img.save(filename)
    _output_titles.append((title, filename))
cv2.imshow = my_imshow

# Silence waitKey and destroyAllWindows
cv2.waitKey = lambda *args, **kwargs: None
cv2.destroyAllWindows = lambda *args, **kwargs: None
`;

      await pyodide.runPythonAsync(monkeyPatch);

      // Run Script 1
      await pyodide.runPythonAsync('print("--- Running spatial_blurring_filter.py ---")\n' + spatialBlurScript);
      const outputs1 = pyodide.runPython('_output_titles').toJs();
      const logs1 = pyodide.runPython('sys.stdout.logs').toJs().join('');
      setScript1Log(logs1);
      
      const newOutputs1: OutputImage[] = [];
      for (const item of outputs1) {
        const outputData = pyodide.FS.readFile(item[1]);
        newOutputs1.push({ title: item[0], url: URL.createObjectURL(new Blob([outputData], { type: 'image/jpeg' })) });
      }
      setScript1Images(newOutputs1);

      // Clear for Script 2
      await pyodide.runPythonAsync('_output_titles = []; sys.stdout.logs = []');

      // Run Script 2
      await pyodide.runPythonAsync('print("--- Running spatial_vs_frequency_blurring_filter.py ---")\n' + frequencyBlurScript);
      const outputs2 = pyodide.runPython('_output_titles').toJs();
      const logs2 = pyodide.runPython('sys.stdout.logs').toJs().join('');
      setScript2Log(logs2);
      
      const newOutputs2: OutputImage[] = [];
      for (const item of outputs2) {
        const outputData = pyodide.FS.readFile(item[1]);
        newOutputs2.push({ title: item[0], url: URL.createObjectURL(new Blob([outputData], { type: 'image/jpeg' })) });
      }
      setScript2Images(newOutputs2);

    } catch (err: any) {
      console.error(err);
      alert("Error processing image: \\n\\n" + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/module3" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Module 3
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Live Demo: Module 3</h1>
          <h2 className="text-2xl text-gray-600">Running Spatial and Frequency Filtering Natively</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <section className="bg-white p-6 rounded-lg shadow-md">
          {loadingMsg ? (
            <div className="text-center text-blue-600 font-bold py-8">
              {loadingMsg}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="mb-4" />
                <p className="text-gray-500 text-sm">Upload an image to process</p>
              </div>

              {originalImageUrl && (
                <div className="text-center">
                  <button 
                    onClick={processImage} 
                    disabled={isProcessing}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400"
                  >
                    {isProcessing ? "Processing Scripts..." : "Run Module 3 Scripts"}
                  </button>
                </div>
              )}

              {(script1Images.length > 0 || script1Log) && (
                <div className="mt-8 border-t pt-8">
                  {script1Log && (
                    <div className="mb-6 border border-gray-200 rounded-xl p-6 bg-gray-50">
                      <h4 className="font-bold mb-2">Terminal Output</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">{script1Log}</pre>
                    </div>
                  )}
                  {script1Images.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {script1Images.map((img, idx) => (
                        <div key={idx} className="bg-gray-100 p-4 rounded-lg">
                          <h4 className="font-semibold text-center mb-2">{img.title}</h4>
                          <img src={img.url} alt={img.title} className="w-full h-auto rounded shadow-sm border border-gray-200" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(script2Images.length > 0 || script2Log) && (
                <div className="mt-8 border-t pt-8">
                  {script2Log && (
                    <div className="mb-6 border border-gray-200 rounded-xl p-6 bg-gray-50">
                      <h4 className="font-bold mb-2">Terminal Output</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">{script2Log}</pre>
                    </div>
                  )}
                  {script2Images.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {script2Images.map((img, idx) => (
                        <div key={idx} className="bg-gray-100 p-4 rounded-lg">
                          <h4 className="font-semibold text-center mb-2">{img.title}</h4>
                          <img src={img.url} alt={img.title} className="w-full h-auto rounded shadow-sm border border-gray-200" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Module3Live;

