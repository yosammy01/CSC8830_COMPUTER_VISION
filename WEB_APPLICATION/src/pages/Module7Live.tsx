import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import calibrationScript from '../../../MODULE7/stereo_calibration.py?raw';
import objectScript from '../../../MODULE7/stereo_object_dimensions.py?raw';
import roomScript from '../../../MODULE7/stereo_room_dimensions.py?raw';

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

interface OutputImage {
  name: string;
  url: string;
}

interface UploadEntry {
  file: File;
  directory: string;
  targetName?: string;
}

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/';

const Module7Live: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [loading, setLoading] = useState('Loading Python environment (this may take a minute)...');
  const [calibrationLeftFiles, setCalibrationLeftFiles] = useState<File[]>([]);
  const [calibrationRightFiles, setCalibrationRightFiles] = useState<File[]>([]);
  const [leftCameraCalibration, setLeftCameraCalibration] = useState<File | null>(null);
  const [rightCameraCalibration, setRightCameraCalibration] = useState<File | null>(null);
  const [objectLeftFiles, setObjectLeftFiles] = useState<File[]>([]);
  const [objectRightFiles, setObjectRightFiles] = useState<File[]>([]);
  const [leftVideo, setLeftVideo] = useState<File | null>(null);
  const [rightVideo, setRightVideo] = useState<File | null>(null);
  const [log, setLog] = useState('');
  const [images, setImages] = useState<OutputImage[]>([]);
  const [roomVideoUrl, setRoomVideoUrl] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const liveCalibrationPath = '/MODULE7/live_stereo_calibration_params.json';

  useEffect(() => {
    const loadPyodide = async () => {
      try {
        if (!document.querySelector('script[data-pyodide]')) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.dataset.pyodide = 'true';
            script.src = `${PYODIDE_URL}pyodide.js`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Unable to download Pyodide.'));
            document.body.appendChild(script);
          });
        }
        const py = await window.loadPyodide({ indexURL: PYODIDE_URL });
        setLoading('Installing NumPy, OpenCV, and Pillow...');
        await py.loadPackage(['numpy', 'opencv-python', 'Pillow']);
        setPyodide(py);
        setLoading('');
      } catch (error) {
        setLoading(`Unable to load the browser Python environment: ${String(error)}`);
      }
    };
    void loadPyodide();
  }, []);

  const ensureDirectory = (py: any, path: string) => {
    try {
      py.FS.mkdir(path);
    } catch {
      // The directory is already present from a previous run.
    }
  };

  const resetWorkspace = (py: any, clearCalibrationOutput: boolean) => {
    ensureDirectory(py, '/MODULE7');
    ensureDirectory(py, '/MODULE7/left_images');
    ensureDirectory(py, '/MODULE7/right_images');
    ensureDirectory(py, '/MODULE7/stereo_measurements_left');
    ensureDirectory(py, '/MODULE7/stereo_measurements_right');
    ensureDirectory(py, '/MODULE7/room_videos_left');
    ensureDirectory(py, '/MODULE7/room_videos_right');
    ensureDirectory(py, '/MODULE7/output');
    for (const directory of ['/MODULE7/left_images', '/MODULE7/right_images', '/MODULE7/stereo_measurements_left', '/MODULE7/stereo_measurements_right', '/MODULE7/room_videos_left', '/MODULE7/room_videos_right', '/MODULE7/output']) {
      for (const name of py.FS.readdir(directory)) {
        if (name !== '.' && name !== '..') py.FS.unlink(`${directory}/${name}`);
      }
    }
    if (clearCalibrationOutput) {
      try {
        py.FS.unlink(liveCalibrationPath);
      } catch {
        // No previous calibration output exists.
      }
    }
  };

  const liveObjectScript = objectScript
    .replace(
      /STEREO_PARAMS_PATH = os\.path\.join\(SCRIPT_DIR, "stereo_calibration_params\.json"\)/,
      `STEREO_PARAMS_PATH = os.path.join(SCRIPT_DIR, "${liveCalibrationPath.split('/').pop()}")`,
    )
    .replace(
      /        if os\.environ\.get\("HEADLESS", "0"\) != "1":[\s\S]*?            cv2\.waitKey\(0\)\r?\n/,
      '',
    )
    .replace(/    cv2\.destroyAllWindows\(\)\r?\n/, '');
  const liveCalibrationScript = calibrationScript
    .replace(/cv2\.destroyAllWindows\(\)/g, '')
    .replace(
      /with open\(INTRINSIC_PARAMS_PATH[\s\S]*?print\("Distortion Coefficients \(dist\):\\n", dist\)\r?\n/,
      String.raw`with open(INTRINSIC_PARAMS_PATH, "r", encoding="utf-8") as f:
    left_intrinsic_data = json.load(f)
with open(os.path.join(SCRIPT_DIR, "right_calibration_params.json"), "r", encoding="utf-8") as f:
    right_intrinsic_data = json.load(f)

K1 = np.array(left_intrinsic_data["camera_matrix"], dtype=np.float64)
dist1 = np.array(left_intrinsic_data["dist_coeffs"], dtype=np.float64)
K2 = np.array(right_intrinsic_data["camera_matrix"], dtype=np.float64)
dist2 = np.array(right_intrinsic_data["dist_coeffs"], dtype=np.float64)

print("=== Loaded Separate Intrinsic Calibration Parameters ===")
print("Left Camera Matrix (K1):\n", K1)
print("Left Distortion Coefficients (dist1):\n", dist1)
print("Right Camera Matrix (K2):\n", K2)
print("Right Distortion Coefficients (dist2):\n", dist2)
`,
    )
    .replace(
      /STEREO_PARAMS_OUTPUT_PATH = os\.path\.join\(SCRIPT_DIR, "stereo_calibration_params\.json"\)/,
      'STEREO_PARAMS_OUTPUT_PATH = os.path.join(SCRIPT_DIR, "live_stereo_calibration_params.json")',
    );
  const liveRoomScript = roomScript.replace(
    /DEFAULT_CALIB_PATH = os\.path\.join\(SCRIPT_DIR, "stereo_calibration_params\.json"\)/,
    `DEFAULT_CALIB_PATH = os.path.join(SCRIPT_DIR, "${liveCalibrationPath.split('/').pop()}")`,
  );

  const safeFileName = (file: File) => file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const writeFiles = async (py: any, entries: UploadEntry[], onProgress?: (completed: number) => void) => {
    for (const [index, { file, directory, targetName }] of entries.entries()) {
      py.FS.writeFile(`${directory}/${targetName ?? safeFileName(file)}`, new Uint8Array(await file.arrayBuffer()));
      onProgress?.(index + 1);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    }
  };

  const readText = (py: any, path: string) => {
    try {
      return new TextDecoder().decode(py.FS.readFile(path));
    } catch {
      return '';
    }
  };

  const readOutputImages = (py: any) => {
    const output: OutputImage[] = [];
    for (const name of py.FS.readdir('/MODULE7/output')) {
      if (!/\.(jpg|jpeg|png)$/i.test(name)) continue;
      try {
        const bytes = py.FS.readFile(`/MODULE7/output/${name}`);
        output.push({ name, url: URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })) });
      } catch {
        // Ignore a partially written output from a failed Python run.
      }
    }
    return output;
  };

  const runPython = async (stage: string, script: string, entries: UploadEntry[], args: string[] = []) => {
    if (!pyodide) return;
    const calibrationImageCount = entries.filter(({ directory }) => directory === '/MODULE7/left_images' || directory === '/MODULE7/right_images').length;
    const calibrationJsonCount = entries.filter(({ targetName }) => targetName === 'calibration_params.json' || targetName === 'right_calibration_params.json').length;
    const stagingSummary = stage === 'Calibration'
      ? `${entries.length} total file(s): ${calibrationImageCount} calibration image(s) and ${calibrationJsonCount} camera JSON file(s)`
      : `${entries.length} uploaded file(s)`;
    setRunning(stage);
    setLog(`${stage} started.\n\nStaging ${stagingSummary}...\n`);
    setImages([]);
    if (roomVideoUrl) {
      URL.revokeObjectURL(roomVideoUrl);
      setRoomVideoUrl(null);
    }
    try {
      const isCalibration = stage === 'Calibration';
      if (isCalibration) setCalibrationComplete(false);
      resetWorkspace(pyodide, isCalibration);
      await writeFiles(pyodide, entries, (completed) => {
        setLog(`${stage} started.\n\nStaging files: ${completed}/${entries.length} total\n${stage === 'Calibration' ? `This includes ${calibrationImageCount} calibration image(s) and ${calibrationJsonCount} camera JSON file(s).\n` : ''}`);
      });
      setLog(`${stage} started.\n\nStaged ${stagingSummary}.\nRunning OpenCV in browser-safe single-thread mode...\nThe original calibration settings are being used.\n`);
      pyodide.runPython(`import sys\nimport cv2\ncv2.setNumThreads(1)\ntry:\n    cv2.ocl.setUseOpenCL(False)\nexcept Exception:\n    pass\ncv2.destroyAllWindows = lambda *args, **kwargs: None\ncv2.waitKey = lambda *args, **kwargs: -1\ncv2.namedWindow = lambda *args, **kwargs: None\ncv2.resizeWindow = lambda *args, **kwargs: None\ncv2.imshow = lambda *args, **kwargs: None\nsys.path.insert(0, "/MODULE7")\nsys.argv = ${JSON.stringify(['script.py', ...args])}`);
      const scriptToRun = stage === 'Object dimensions' ? liveObjectScript
        : stage === 'Room dimensions' ? liveRoomScript
        : stage === 'Calibration' ? liveCalibrationScript
        : script;
      await pyodide.runPythonAsync(`__file__ = "/MODULE7/script.py"\n${scriptToRun}`);
      if (isCalibration) setCalibrationComplete(true);
      const logName = stage === 'Calibration' ? 'stereo_calibration_output.txt'
        : stage === 'Object dimensions' ? 'stereo_dimensions_output.txt' : 'room_dimensions_output.txt';
      setLog(readText(pyodide, `/MODULE7/${logName}`) || `${stage} completed without a text log.`);
      setImages(readOutputImages(pyodide));
      if (stage === 'Room dimensions') {
        try {
          const videoBytes = pyodide.FS.readFile('/MODULE7/output/room_dimensions_annotated.mp4');
          setRoomVideoUrl(URL.createObjectURL(new Blob([videoBytes], { type: 'video/mp4' })));
        } catch {
          // The room script may stop before producing a video when uploaded codecs are unsupported.
        }
      }
    } catch (error) {
      const logName = stage === 'Object dimensions' ? 'stereo_dimensions_output.txt'
        : stage === 'Room dimensions' ? 'room_dimensions_output.txt'
        : 'stereo_calibration_output.txt';
      setLog(`${stage} failed:\n${String(error)}\n\n${readText(pyodide, `/MODULE7/${logName}`)}`);
    } finally {
      setRunning(null);
    }
  };

  const runCalibration = () => {
    if (!leftCameraCalibration || !rightCameraCalibration || !calibrationLeftFiles.length || !calibrationRightFiles.length) return;
    const entries = [
      ...calibrationLeftFiles.map((file) => ({ file, directory: '/MODULE7/left_images' })),
      ...calibrationRightFiles.map((file) => ({ file, directory: '/MODULE7/right_images' })),
      { file: leftCameraCalibration, directory: '/MODULE7', targetName: 'calibration_params.json' },
      { file: rightCameraCalibration, directory: '/MODULE7', targetName: 'right_calibration_params.json' },
    ];
    void runPython('Calibration', calibrationScript, entries);
  };
  const runObjects = () => runPython(
    'Object dimensions',
    objectScript,
    [
      ...objectLeftFiles.map((file) => ({ file, directory: '/MODULE7/stereo_measurements_left' })),
      ...objectRightFiles.map((file) => ({ file, directory: '/MODULE7/stereo_measurements_right' })),
    ],
  );
  const runRoom = () => {
    if (!leftVideo || !rightVideo) return;
    return runPython(
      'Room dimensions',
      roomScript,
      [
        { file: leftVideo, directory: '/MODULE7/room_videos_left' },
        { file: rightVideo, directory: '/MODULE7/room_videos_right' },
      ],
      ['--left', `/MODULE7/room_videos_left/${safeFileName(leftVideo)}`, '--right', `/MODULE7/room_videos_right/${safeFileName(rightVideo)}`, '--headless'],
    );
  };

  const onFiles = (event: React.ChangeEvent<HTMLInputElement>, setter: (files: File[]) => void) => {
    setter(Array.from(event.target.files ?? []));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-10 relative">
        <Link to="/module7" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold">
          &larr; Back to Module 7
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Live Demo: Module 7</h1>
          <h2 className="text-2xl text-gray-600">Upload stereo data and rerun the calibrated 3D experiments</h2>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-8">
        {loading && <section className="bg-white p-6 rounded-lg shadow-md text-center text-blue-600 font-bold">{loading}</section>}

        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold mb-2">1. Stereo camera calibration</h3>
          <p className="text-gray-600 mb-4">Upload the intrinsic calibration JSON for each camera, then upload matching checkerboard pairs. Module 2 can generate the camera calibration JSON files.</p>
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 text-center">
            Complete the camera calibration in Module 2 first and upload the resulting <code>calibration_params.json</code> for the left and right cameras.
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 0 }}>Left camera calibration JSON
              <input className="block mt-2" type="file" accept="application/json,.json" onChange={(e) => setLeftCameraCalibration(e.target.files?.[0] ?? null)} />
              <span className="text-sm text-gray-500 mt-2 block">{leftCameraCalibration?.name ?? 'No file selected'}</span>
            </label>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 0 }}>Right camera calibration JSON
              <input className="block mt-2" type="file" accept="application/json,.json" onChange={(e) => setRightCameraCalibration(e.target.files?.[0] ?? null)} />
              <span className="text-sm text-gray-500 mt-2 block">{rightCameraCalibration?.name ?? 'No file selected'}</span>
            </label>
          </div>
          <div className="grid md:grid-cols-2 gap-4" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 0 }}>Left calibration images
              <input className="block mt-2" type="file" accept="image/*" multiple onChange={(e) => onFiles(e, setCalibrationLeftFiles)} />
              <span className="text-sm text-gray-500 mt-2 block">{calibrationLeftFiles.length} selected</span>
            </label>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 0 }}>Right calibration images
              <input className="block mt-2" type="file" accept="image/*" multiple onChange={(e) => onFiles(e, setCalibrationRightFiles)} />
              <span className="text-sm text-gray-500 mt-2 block">{calibrationRightFiles.length} selected</span>
            </label>
          </div>
          <button onClick={runCalibration} disabled={!pyodide || !leftCameraCalibration || !rightCameraCalibration || !calibrationLeftFiles.length || !calibrationRightFiles.length || !!running} className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg disabled:bg-gray-400">
            {running === 'Calibration' ? 'Calibrating...' : 'Run calibration'}
          </button>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold mb-2">2. Stereo object dimensions</h3>
          <p className="text-gray-600 mb-4">Upload one or more left/right object-photo pairs. Pair filenames should match or share a number.</p>
          <div className="grid md:grid-cols-2 gap-4" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 0 }}>Left object images
              <input className="block mt-2" type="file" accept="image/*" multiple onChange={(e) => onFiles(e, setObjectLeftFiles)} />
              <span className="text-sm text-gray-500 mt-2 block">{objectLeftFiles.length} selected</span>
            </label>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 0 }}>Right object images
              <input className="block mt-2" type="file" accept="image/*" multiple onChange={(e) => onFiles(e, setObjectRightFiles)} />
              <span className="text-sm text-gray-500 mt-2 block">{objectRightFiles.length} selected</span>
            </label>
          </div>
          <button onClick={runObjects} disabled={!pyodide || !calibrationComplete || !objectLeftFiles.length || !objectRightFiles.length || !!running} className="mt-4 bg-green-600 text-white px-5 py-2 rounded-lg disabled:bg-gray-400">
            {running === 'Object dimensions' ? 'Measuring...' : 'Run object measurement'}
          </button>
          {!calibrationComplete && <p className="text-sm text-amber-700 mt-2">Run stereo camera calibration successfully before measuring objects.</p>}
        </section>

        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold mb-2">3. Room dimensions from stereo video</h3>
          <p className="text-gray-600 mb-4">Upload synchronized left and right room videos. The headless pipeline generates an annotated MP4 and summary log.</p>
          <div className="grid md:grid-cols-2 gap-4" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 0 }}>Left room video
              <input className="block mt-2" type="file" accept="video/*" onChange={(e) => setLeftVideo(e.target.files?.[0] ?? null)} />
              <span className="text-sm text-gray-500 mt-2 block">{leftVideo?.name ?? 'No file selected'}</span>
            </label>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 0 }}>Right room video
              <input className="block mt-2" type="file" accept="video/*" onChange={(e) => setRightVideo(e.target.files?.[0] ?? null)} />
              <span className="text-sm text-gray-500 mt-2 block">{rightVideo?.name ?? 'No file selected'}</span>
            </label>
          </div>
          <button onClick={() => void runRoom()} disabled={!pyodide || !calibrationComplete || !leftVideo || !rightVideo || !!running} className="mt-4 bg-purple-600 text-white px-5 py-2 rounded-lg disabled:bg-gray-400">
            {running === 'Room dimensions' ? 'Estimating room...' : 'Run room experiment'}
          </button>
          {!calibrationComplete && <p className="text-sm text-amber-700 mt-2">Run stereo camera calibration successfully before measuring the room.</p>}
        </section>

        {(log || images.length > 0 || roomVideoUrl) && (
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold mb-4">Experiment output</h3>
            {log && (
              <pre
                className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap"
                style={{
                  height: '320px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  textAlign: 'left',
                  margin: 0,
                }}
              >
                {log}
              </pre>
            )}
            {roomVideoUrl && <video className="w-full mt-6 rounded-lg" controls src={roomVideoUrl} />}
            {images.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {images.map((image) => (
                  <figure
                    key={image.url}
                    className="bg-gray-50 p-1.5 rounded-lg border border-gray-200 flex flex-col items-center"
                    style={{ width: '880px', margin: '0 auto' }}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="rounded border border-gray-300 mb-1"
                      style={{ height: '640px', width: '100%', objectFit: 'cover' }}
                    />
                    <figcaption
                      className="text-gray-600 text-center overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ fontSize: '10px', width: '100%' }}
                      title={image.name}
                    >
                      {image.name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Module7Live;
