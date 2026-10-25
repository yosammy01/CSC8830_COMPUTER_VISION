import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import stereoCalibrationParamsJson from '../../../MODULE7/stereo_calibration_params.json?raw';

interface ObjectData {
  id: string;
  name: string;
  left: string;
  right: string;
  disparity: number;
  depthZ: number;
  estWidth: number;
  actWidth: number;
  widthErr: number;
  estHeight: number;
  actHeight: number;
  heightErr: number;
}

const OBJECT_ITEMS: ObjectData[] = [
  { id: 'air_purifier', name: 'Air Purifier', left: 'air_purifier_LEFT.jpg', right: 'air_purifier_RIGHT.jpg', disparity: 442.31, depthZ: 1368.68, estWidth: 259.57, actWidth: 282.60, widthErr: 8.15, estHeight: 363.88, actHeight: 381.00, heightErr: 4.49 },
  { id: 'black_box', name: 'Black Box', left: 'black_box_LEFT.jpg', right: 'black_box_RIGHT.jpg', disparity: 429.91, depthZ: 1382.45, estWidth: 204.86, actWidth: 230.20, widthErr: 11.01, estHeight: 254.52, actHeight: 277.80, heightErr: 8.38 },
  { id: 'book', name: 'Book', left: 'book_LEFT.jpg', right: 'book_RIGHT.jpg', disparity: 352.23, depthZ: 1542.25, estWidth: 106.09, actWidth: 112.70, widthErr: 5.87, estHeight: 169.27, actHeight: 177.80, heightErr: 4.80 },
  { id: 'box', name: 'Box', left: 'box_LEFT.jpg', right: 'BOX_RIGHT.jpg', disparity: 398.18, depthZ: 1453.23, estWidth: 235.90, actWidth: 254.00, widthErr: 7.13, estHeight: 331.63, actHeight: 336.50, heightErr: 1.45 },
  { id: 'brick', name: 'Brick', left: 'brick_LEFT.jpg', right: 'brick_RIGHT.jpg', disparity: 394.07, depthZ: 1447.57, estWidth: 176.82, actWidth: 203.20, widthErr: 12.98, estHeight: 88.99, actHeight: 92.07, heightErr: 3.35 },
  { id: 'catalog_case', name: 'Catalog Case', left: 'catalog_case_LEFT.jpg', right: 'catalog_case_RIGHT.jpg', disparity: 410.42, depthZ: 1385.90, estWidth: 463.31, actWidth: 457.20, widthErr: 1.34, estHeight: 365.78, actHeight: 379.41, heightErr: 3.59 },
  { id: 'clock_radio', name: 'Clock Radio', left: 'clock_radio_LEFT.jpg', right: 'clock_radio_RIGHT.jpg', disparity: 382.81, depthZ: 1465.89, estWidth: 96.60, actWidth: 107.90, widthErr: 10.47, estHeight: 122.67, actHeight: 127.00, heightErr: 3.41 },
  { id: 'large_circle_lid', name: 'Large Circle Lid', left: 'large_circle_lid_LEFT.jpg', right: 'large_circle_lid_RIGHT.jpg', disparity: 356.66, depthZ: 1526.53, estWidth: 174.44, actWidth: 190.50, widthErr: 8.43, estHeight: 174.44, actHeight: 190.50, heightErr: 8.43 },
  { id: 'large_rectangle_lid', name: 'Large Rectangle Lid', left: 'large_rectangle_lid_LEFT.jpg', right: 'large_rectangle_lid_RIGHT.jpg', disparity: 380.75, depthZ: 1471.03, estWidth: 215.15, actWidth: 247.60, widthErr: 13.11, estHeight: 184.18, actHeight: 225.40, heightErr: 18.29 },
  { id: 'remote_control', name: 'Remote Control', left: 'remote_control_LEFT.jpg', right: 'remote_control_RIGHT.jpg', disparity: 373.40, depthZ: 1490.18, estWidth: 145.62, actWidth: 169.86, widthErr: 14.27, estHeight: 46.53, actHeight: 49.21, heightErr: 5.45 },
  { id: 'rice_cooker', name: 'Rice Cooker', left: 'rice_cooker_LEFT.jpg', right: 'rice_cooker_RIGHT.jpg', disparity: 395.21, depthZ: 1444.98, estWidth: 163.96, actWidth: 214.31, widthErr: 23.49, estHeight: 129.30, actHeight: 157.16, heightErr: 17.73 },
  { id: 'sandal', name: 'Sandal', left: 'sandal_LEFT.jpg', right: 'sandal_RIGHT.jpg', disparity: 374.21, depthZ: 1486.02, estWidth: 256.03, actWidth: 295.27, widthErr: 13.29, estHeight: 92.31, actHeight: 95.25, heightErr: 3.09 },
  { id: 'shoe_box', name: 'Shoe Box', left: 'shoe_box_LEFT.jpg', right: 'shoe_box_RIGHT.jpg', disparity: 379.71, depthZ: 1481.81, estWidth: 300.56, actWidth: 330.20, widthErr: 8.98, estHeight: 129.75, actHeight: 114.30, heightErr: 13.08 },
  { id: 'small_rectangle_lid', name: 'Small Rectangle Lid', left: 'small_rectangle_lid_LEFT.jpg', right: 'small_rectangle_lid_RIGHT.jpg', disparity: 343.35, depthZ: 1538.27, estWidth: 169.11, actWidth: 206.40, widthErr: 18.07, estHeight: 133.19, actHeight: 133.30, heightErr: 0.08 },
  { id: 'small_round_lid', name: 'Small Round Lid', left: 'small_round_lid_LEFT.jpg', right: 'small_round_lid_RIGHT.jpg', disparity: 387.86, depthZ: 1457.09, estWidth: 129.74, actWidth: 152.40, widthErr: 14.87, estHeight: 129.74, actHeight: 152.40, heightErr: 14.87 },
  { id: 'small_safe', name: 'Small Safe', left: 'small_safe_LEFT.jpg', right: 'small_safe_RIGHT.jpg', disparity: 379.44, depthZ: 1463.90, estWidth: 290.81, actWidth: 323.85, widthErr: 10.20, estHeight: 244.07, actHeight: 254.00, heightErr: 3.91 },
  { id: 'smart_phone', name: 'Smart Phone', left: 'smart_phone_LEFT.jpg', right: 'smart_phone_RIGHT.jpg', disparity: 332.12, depthZ: 1562.31, estWidth: 68.80, actWidth: 79.38, widthErr: 13.33, estHeight: 150.35, actHeight: 158.75, heightErr: 5.29 },
  { id: 'speaker_box', name: 'Speaker Box', left: 'speaker_box_LEFT.jpg', right: 'speaker_box_RIGHT.jpg', disparity: 404.30, depthZ: 1430.13, estWidth: 184.34, actWidth: 206.38, widthErr: 10.68, estHeight: 182.28, actHeight: 214.31, heightErr: 14.95 },
  { id: 'sponge', name: 'Sponge', left: 'sponge_LEFT.jpg', right: 'sponge_RIGHT.jpg', disparity: 326.39, depthZ: 1595.15, estWidth: 94.35, actWidth: 104.77, widthErr: 9.95, estHeight: 58.02, actHeight: 61.91, heightErr: 6.28 },
  { id: 'table_top', name: 'Table Top', left: 'table_top_LEFT.jpg', right: 'table_top_RIGHT.jpg', disparity: 403.43, depthZ: 1411.73, estWidth: 425.66, actWidth: 481.00, widthErr: 11.51, estHeight: 326.71, actHeight: 368.30, heightErr: 11.29 },
];

const CALIBRATION_PAIRS = Array.from({ length: 18 }, (_, i) => ({
  pairNum: i + 1,
  left: `LEFT${i + 1}.jpg`,
  right: `RIGHT${i + 1}.jpg`,
  valid: i + 1 !== 5,
}));

const Module7App: React.FC = () => {
  const [calibViewMode, setCalibViewMode] = useState<'left' | 'right'>('left');
  const [objViewMode, setObjViewMode] = useState<'left' | 'right'>('left');
  const [selectedFrameView, setSelectedFrameView] = useState<'first' | 'last'>('first');

  const [calibLog, setCalibLog] = useState<string>('Loading stereo calibration log...');
  const [dimLog, setDimLog] = useState<string>('Loading stereo dimensions log...');
  const [roomLog, setRoomLog] = useState<string>('Loading room dimensions log...');

  const baseUrl = import.meta.env.BASE_URL;

  useEffect(() => {
    fetch(`${baseUrl}Module7/stereo_calibration_output.txt`)
      .then((r) => r.text())
      .then(setCalibLog)
      .catch((err) => setCalibLog(`Unable to load calibration log: ${err}`));

    fetch(`${baseUrl}Module7/stereo_dimensions_output.txt`)
      .then((r) => r.text())
      .then(setDimLog)
      .catch((err) => setDimLog(`Unable to load dimensions log: ${err}`));

    fetch(`${baseUrl}Module7/room_dimensions_output.txt`)
      .then((r) => r.text())
      .then(setRoomLog)
      .catch((err) => setRoomLog(`Unable to load room dimensions log: ${err}`));
  }, [baseUrl]);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link
          to="/"
          className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center"
        >
          &larr; Back to Home
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">CSC 8830: Computer Vision</h1>
          <h2 className="text-2xl text-gray-600">Module 7: Calibrated Stereo 3D Object & Room Dimensions Demonstration</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {/* Links & Repository */}
        <section className="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Project Resources</h3>
            <p className="text-sm text-gray-500">Access the code repository, technical report, and mathematical derivations.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            <Link
              to="/module7/live"
              style={{
                display: 'block',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                textAlign: 'center',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              Try Live Interactive Demo
            </Link>
            <a
              href="https://github.com/yosammy01/CSC8830_COMPUTER_VISION/tree/main/MODULE7"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                backgroundColor: '#1f2937',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                textAlign: 'center',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              GitHub Repo
            </a>
            <a
              href={`${baseUrl}Module7/Module7_Report.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                textAlign: 'center',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              View Report PDF
            </a>
            <a
              href={`${baseUrl}Module7/Theory_Uncalibrated_Stereo_Dimensions.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                backgroundColor: '#4f46e5',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                textAlign: 'center',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              View Derivations PDF
            </a>
          </div>
        </section>

        {/* Video Demonstration */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Working Demonstration</h3>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe
              src="https://www.youtube.com/embed/dK5RpxeqG9M"
              title="Module 7 Demonstration"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            ></iframe>
          </div>
        </section>

        {/* Step 1: Camera Calibration Dataset */}
        <section
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            marginBottom: '32px',
          }}
        >
          <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
              Step 1: Stereo Camera Calibration Dataset
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCalibViewMode('left')}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  calibViewMode === 'left' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Left Camera (18)
              </button>
              <button
                onClick={() => setCalibViewMode('right')}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  calibViewMode === 'right' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Right Camera (18)
              </button>
            </div>
          </div>

          <p style={{ marginBottom: '20px', color: '#4b5563', lineHeight: '1.5' }}>
            Below are the 18 stereo checkerboard calibration pairs (36 total Left & Right images captured with a smartphone camera) used to find chessboard corners, solve for stereo extrinsics, and compute the stereo baseline (B = 343.45 mm) and rectification parameters. Pair 5 was excluded due to an occluded checkerboard in the right view.
          </p>

          {/* Module 2-style flex-wrap gallery (static, non-interactive) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {CALIBRATION_PAIRS.map((p) => {
              const imgFile = calibViewMode === 'left' ? p.left : p.right;
              const folder = calibViewMode === 'left' ? 'left_images' : 'right_images';

              return (
                <div
                  key={p.pairNum}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: '6px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '110px',
                  }}
                >
                  <img
                    src={`${baseUrl}Module7/${folder}/${imgFile}`}
                    alt={`Pair ${p.pairNum}`}
                    style={{
                      height: '80px',
                      width: '100%',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      marginBottom: '4px',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#4b5563',
                      width: '100%',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={imgFile}
                  >
                    Pair {p.pairNum} {!p.valid && '(Skip)'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Calibration Matrices Diagrams */}
          <div className="mt-6 space-y-4">
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Calibration Parameters & Matrices</h4>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', overflow: 'hidden' }}>
              <img
                src={`${baseUrl}Module7/Stereo_Calibration_Data_crop.png`}
                alt="Calibration Data"
                style={{ display: 'block', width: '100%', maxWidth: '860px', height: 'auto', margin: '0 auto', borderRadius: '4px', border: '1px solid #e5e7eb', boxSizing: 'border-box' }}
              />
              <img
                src={`${baseUrl}Module7/Stereo_Calibration_Matrices_1_crop.png`}
                alt="Calibration Matrices 1"
                style={{ display: 'block', width: '100%', maxWidth: '560px', height: 'auto', margin: '0 auto', borderRadius: '4px', border: '1px solid #e5e7eb', boxSizing: 'border-box' }}
              />
              <img
                src={`${baseUrl}Module7/Stereo_Calibration_Matrices_2_crop.png`}
                alt="Calibration Matrices 2"
                style={{ display: 'block', width: '100%', maxWidth: '560px', height: 'auto', margin: '0 auto', borderRadius: '4px', border: '1px solid #e5e7eb', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Calibration Terminal Output */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Calibration Terminal Output</h4>
            <pre
              style={{
                backgroundColor: '#111827',
                color: '#60a5fa',
                padding: '16px',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '13px',
                maxHeight: '260px',
                overflowY: 'auto',
                textAlign: 'left',
                margin: 0,
              }}
            >
              {calibLog}
            </pre>
          </div>

          {/* Static calibration JSON from the completed personal experiment */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Stereo Calibration JSON (Completed Experiment)</h4>
            <pre
              style={{
                backgroundColor: '#111827',
                color: '#a7f3d0',
                padding: '16px',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '13px',
                maxHeight: '360px',
                overflowY: 'auto',
                textAlign: 'left',
                margin: 0,
              }}
            >
              {stereoCalibrationParamsJson}
            </pre>
          </div>
        </section>

        {/* Step 2: Object Measurement Dataset */}
        <section
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            marginBottom: '32px',
          }}
        >
          <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
              Step 2: Object Measurement Dataset (Calibrated Stereo)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setObjViewMode('left')}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  objViewMode === 'left' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Left Views (20)
              </button>
              <button
                onClick={() => setObjViewMode('right')}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  objViewMode === 'right' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Right Views (20)
              </button>
            </div>
          </div>

          <p style={{ marginBottom: '20px', color: '#4b5563', lineHeight: '1.5' }}>
            Below are the 20 object measurement stereo pairs (the same household objects from Module 2) processed with calibrated stereo parameters. Unlike Module 2, where the object distance Zworld was measured and hardcoded, calibrated stereo dynamically estimates Zworld from disparity triangulation: Xworld = (Xim * Zworld) / fx and Yworld = (Yim * Zworld) / fy.
          </p>

          {/* Module 2-style flex-wrap gallery (static, non-interactive) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {OBJECT_ITEMS.map((item) => {
              const imgFile = objViewMode === 'left' ? item.left : item.right;
              const folder = objViewMode === 'left' ? 'stereo_measurements_left' : 'stereo_measurements_right';

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: '6px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '110px',
                  }}
                >
                  <img
                    src={`${baseUrl}Module7/${folder}/${imgFile}`}
                    alt={item.name}
                    style={{
                      height: '80px',
                      width: '100%',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      marginBottom: '4px',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#4b5563',
                      width: '100%',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Measurement Terminal Output */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Measurement Terminal Output</h4>
            <pre
              style={{
                backgroundColor: '#111827',
                color: '#4ade80',
                padding: '16px',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '13px',
                maxHeight: '320px',
                overflowY: 'auto',
                textAlign: 'left',
                margin: 0,
              }}
            >
              {dimLog}
            </pre>
          </div>
        </section>

        {/* Step 3: Validation & Error Statistics */}
        <section
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            marginBottom: '32px',
          }}
        >
          <h3
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '8px',
              marginBottom: '16px',
              marginTop: '0',
            }}
          >
            Step 3: Object Dimensions Validation & Error Statistics
          </h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Below are the experimental results computing the real-world 2D dimensions of 20 objects using calibrated stereo triangulation, alongside the calculated statistical error metrics (from Report Page 3).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <img
              src={`${baseUrl}Module7/Stereo_Experiment_Results.png`}
              alt="Stereo Object Dimension Results"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            />
          </div>
        </section>

        {/* Step 4: Continuous Room Dimension Estimation from Stereo Videos (Last Part of Report) */}
        <section
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            marginBottom: '32px',
          }}
        >
          <h3
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '8px',
              marginBottom: '16px',
              marginTop: '0',
            }}
          >
            Step 4: Continuous Room Dimension Estimation from Stereo Videos
          </h3>
          <p style={{ marginBottom: '20px', color: '#4b5563', lineHeight: '1.5' }}>
            Demonstration of finding the dimensions of a room using continuous stereo video streams (Report Page 6). Using the same calibrated stereo setup, stationary video footage of an outdoor patio wall was captured from two translated baseline positions (6 seconds duration at 59.85 FPS, 360 frames total). Assuming a rectangular room geometry derived from the primary wall, the script estimates real-world width, height, depth, floor area, and volume.
          </p>

          {/* The 2 Videos Supplied for the Last Part of the Report */}
          <div className="mb-6">
            <h4 style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '16px' }}>
              Stationary Stereo Video Streams (Patio Wall)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col items-center">
                <h5 className="font-semibold text-gray-800 mb-2 text-sm text-center">
                  Left Camera Video Stream (video_LEFT.mp4)
                </h5>
                <div className="w-full max-w-xs aspect-[9/16] bg-black rounded-lg overflow-hidden shadow">
                  <iframe
                    className="w-full h-full border-0"
                    src="https://www.youtube.com/embed/W1lUVtJKRtM"
                    title="Patio Wall Left View Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Stationary left video footage (6s @ 59.85 FPS)
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col items-center">
                <h5 className="font-semibold text-gray-800 mb-2 text-sm text-center">
                  Right Camera Video Stream (video_RIGHT.mp4)
                </h5>
                <div className="w-full max-w-xs aspect-[9/16] bg-black rounded-lg overflow-hidden shadow">
                  <iframe
                    className="w-full h-full border-0"
                    src="https://www.youtube.com/embed/T6qNHnZRI2c"
                    title="Patio Wall Right View Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Stationary right video footage (6s @ 59.85 FPS)
                </p>
              </div>
            </div>
          </div>

          {/* Wall Bounding Box Snapshots (First & Last Frames) */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 style={{ fontWeight: 'bold', margin: 0, fontSize: '16px' }}>
                Wall Boundary Tracking Snapshots (First & Last Frames)
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedFrameView('first')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                    selectedFrameView === 'first'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  First Frame (Frame 1)
                </button>
                <button
                  onClick={() => setSelectedFrameView('last')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                    selectedFrameView === 'last'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  Last Frame (Frame 360)
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700 text-sm">
                  {selectedFrameView === 'first'
                    ? 'Frame 1: Width 2.528 m (8 ft 3.5 in) | Height 1.294 m (4 ft 2.9 in)'
                    : 'Frame 360: Width 2.531 m (8 ft 3.6 in) | Height 1.300 m (4 ft 3.2 in)'}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {selectedFrameView === 'first'
                    ? 'wall_bbox_first_frame_LEFT.jpg & wall_bbox_first_frame_RIGHT.jpg'
                    : 'wall_bbox_last_frame_LEFT.jpg & wall_bbox_last_frame_RIGHT.jpg'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-500 mb-1 block">Left Camera View</span>
                  <img
                    src={`${baseUrl}Module7/${
                      selectedFrameView === 'first' ? 'wall_bbox_first_frame_LEFT.jpg' : 'wall_bbox_last_frame_LEFT.jpg'
                    }`}
                    alt={`${selectedFrameView} Frame Left`}
                    className="w-full h-80 object-contain bg-black rounded border border-gray-200"
                  />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-500 mb-1 block">Right Camera View</span>
                  <img
                    src={`${baseUrl}Module7/${
                      selectedFrameView === 'first' ? 'wall_bbox_first_frame_RIGHT.jpg' : 'wall_bbox_last_frame_RIGHT.jpg'
                    }`}
                    alt={`${selectedFrameView} Frame Right`}
                    className="w-full h-80 object-contain bg-black rounded border border-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Diagram Graphic */}
          <div className="mb-6">
            <img
              src={`${baseUrl}Module7/Stereo_Room_Dimensions.png`}
              alt="Stereo Room Dimensions Analysis"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            />
          </div>

          {/* Room Dimensions Terminal Output */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Room Dimensions Terminal Output</h4>
            <pre
              style={{
                backgroundColor: '#111827',
                color: '#facc15',
                padding: '16px',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '13px',
                maxHeight: '300px',
                overflowY: 'auto',
                textAlign: 'left',
                margin: 0,
              }}
            >
              {roomLog}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Module7App;