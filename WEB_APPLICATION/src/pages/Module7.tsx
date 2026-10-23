import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const OBJECT_ITEMS = [
  { id: 'air_purifier', name: 'Air Purifier', left: 'air_purifier_LEFT.jpg', right: 'air_purifier_RIGHT.jpg' },
  { id: 'black_box', name: 'Black Box', left: 'black_box_LEFT.jpg', right: 'black_box_RIGHT.jpg' },
  { id: 'book', name: 'Book', left: 'book_LEFT.jpg', right: 'book_RIGHT.jpg' },
  { id: 'box', name: 'Box', left: 'box_LEFT.jpg', right: 'BOX_RIGHT.jpg' },
  { id: 'brick', name: 'Brick', left: 'brick_LEFT.jpg', right: 'brick_RIGHT.jpg' },
  { id: 'catalog_case', name: 'Catalog Case', left: 'catalog_case_LEFT.jpg', right: 'catalog_case_RIGHT.jpg' },
  { id: 'clock_radio', name: 'Clock Radio', left: 'clock_radio_LEFT.jpg', right: 'clock_radio_RIGHT.jpg' },
  { id: 'large_circle_lid', name: 'Large Circle Lid', left: 'large_circle_lid_LEFT.jpg', right: 'large_circle_lid_RIGHT.jpg' },
  { id: 'large_rectangle_lid', name: 'Large Rectangle Lid', left: 'large_rectangle_lid_LEFT.jpg', right: 'large_rectangle_lid_RIGHT.jpg' },
  { id: 'remote_control', name: 'Remote Control', left: 'remote_control_LEFT.jpg', right: 'remote_control_RIGHT.jpg' },
  { id: 'rice_cooker', name: 'Rice Cooker', left: 'rice_cooker_LEFT.jpg', right: 'rice_cooker_RIGHT.jpg' },
  { id: 'sandal', name: 'Sandal', left: 'sandal_LEFT.jpg', right: 'sandal_RIGHT.jpg' },
  { id: 'shoe_box', name: 'Shoe Box', left: 'shoe_box_LEFT.jpg', right: 'shoe_box_RIGHT.jpg' },
  { id: 'small_rectangle_lid', name: 'Small Rectangle Lid', left: 'small_rectangle_lid_LEFT.jpg', right: 'small_rectangle_lid_RIGHT.jpg' },
  { id: 'small_round_lid', name: 'Small Round Lid', left: 'small_round_lid_LEFT.jpg', right: 'small_round_lid_RIGHT.jpg' },
  { id: 'small_safe', name: 'Small Safe', left: 'small_safe_LEFT.jpg', right: 'small_safe_RIGHT.jpg' },
  { id: 'smart_phone', name: 'Smart Phone', left: 'smart_phone_LEFT.jpg', right: 'smart_phone_RIGHT.jpg' },
  { id: 'speaker_box', name: 'Speaker Box', left: 'speaker_box_LEFT.jpg', right: 'speaker_box_RIGHT.jpg' },
  { id: 'sponge', name: 'Sponge', left: 'sponge_LEFT.jpg', right: 'sponge_RIGHT.jpg' },
  { id: 'table_top', name: 'Table Top', left: 'table_top_LEFT.jpg', right: 'table_top_RIGHT.jpg' },
];

const CALIBRATION_PAIRS = Array.from({ length: 18 }, (_, i) => ({
  pairNum: i + 1,
  left: `LEFT${i + 1}.jpg`,
  right: `RIGHT${i + 1}.jpg`,
  valid: i + 1 !== 5, // Pair 5 was skipped during calibration due to pattern occlusion
}));

const Module7App: React.FC = () => {
  const [selectedObjIndex, setSelectedObjIndex] = useState<number>(0);
  const [selectedCalibIndex, setSelectedCalibIndex] = useState<number>(0);
  const [selectedFrameView, setSelectedFrameView] = useState<'first' | 'last'>('first');
  const [calibLog, setCalibLog] = useState<string>('Loading stereo calibration log...');
  const [dimLog, setDimLog] = useState<string>('Loading stereo dimensions log...');
  const [roomLog, setRoomLog] = useState<string>('Loading room dimensions log...');

  const baseUrl = import.meta.env.BASE_URL;

  useEffect(() => {
    fetch(`${baseUrl}module7/stereo_calibration_output.txt`)
      .then((r) => r.text())
      .then(setCalibLog)
      .catch((err) => setCalibLog(`Unable to load calibration log: ${err}`));

    fetch(`${baseUrl}module7/stereo_dimensions_output.txt`)
      .then((r) => r.text())
      .then(setDimLog)
      .catch((err) => setDimLog(`Unable to load dimensions log: ${err}`));

    fetch(`${baseUrl}module7/room_dimensions_output.txt`)
      .then((r) => r.text())
      .then(setRoomLog)
      .catch((err) => setRoomLog(`Unable to load room dimensions log: ${err}`));
  }, [baseUrl]);

  const currentObj = OBJECT_ITEMS[selectedObjIndex];
  const currentCalib = CALIBRATION_PAIRS[selectedCalibIndex];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      {/* Navigation Header */}
      <header className="max-w-5xl mx-auto mb-10 relative">
        <Link
          to="/"
          className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center"
        >
          &larr; Back to Home
        </Link>
        <div className="text-center pt-6 md:pt-0">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">CSC 8830: Computer Vision</h1>
          <h2 className="text-2xl text-gray-600">Module 7: Stereo Vision, 3D Reconstruction, & Room Dimensions</h2>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-8">
        {/* Project Resources & PDFs */}
        <section className="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Project Resources</h3>
            <p className="text-sm text-gray-500">
              Access the source code, technical reports, and theoretical derivations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center md:justify-end">
            <a
              href="https://github.com/yosammy01/CSC8830_COMPUTER_VISION/tree/main/MODULE7"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800 text-white px-5 py-2.5 rounded-lg hover:bg-gray-900 transition font-medium text-sm shadow-sm"
            >
              GitHub Repo
            </a>
            <a
              href={`${baseUrl}module7/Module7_Report.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium text-sm shadow-sm"
            >
              View Report PDF
            </a>
            <a
              href={`${baseUrl}module7/Theory_Uncalibrated_Stereo_Dimensions.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
            >
              Theory & Derivation PDF
            </a>
            <a
              href={`${baseUrl}module7/Uncalibrated_Stereo_Dimensions.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 transition font-medium text-sm shadow-sm"
            >
              Uncalibrated Stereo PDF
            </a>
          </div>
        </section>

        {/* Working Video Demonstrations */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-4 text-gray-800">
            Working Demonstrations
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Live video demonstrations demonstrating 3D object size and shape estimation via stereo triangulation, as well as real-time patio room dimension estimation from synchronized stereo video streams.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Demonstration 1 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col items-center">
              <h4 className="font-semibold text-gray-800 mb-2 text-center">
                Demonstration 1: Stereo Triangulation & Object Dimension Estimation
              </h4>
              <div className="w-full max-w-xs aspect-[9/16] bg-black rounded-lg overflow-hidden shadow">
                <iframe
                  className="w-full h-full border-0"
                  src="https://www.youtube.com/embed/W1lUVtJKRtM"
                  title="Module 7 Demonstration 1"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                3D object dimensioning with shape classification and contour bounding.
              </p>
            </div>

            {/* Demonstration 2 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col items-center">
              <h4 className="font-semibold text-gray-800 mb-2 text-center">
                Demonstration 2: Continuous Room Dimension Estimation from Stereo Videos
              </h4>
              <div className="w-full max-w-xs aspect-[9/16] bg-black rounded-lg overflow-hidden shadow">
                <iframe
                  className="w-full h-full border-0"
                  src="https://www.youtube.com/embed/T6qNHnZRI2c"
                  title="Module 7 Demonstration 2"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Synchronized stereo video tracking, WLS disparity depth map, and 3D perimeter projection.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* Requirement 1: Stereo Camera Calibration */}
        {/* ========================================================================= */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-4 text-gray-800">
            Requirement 1: Stereo Camera Calibration
          </h3>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Stereo camera calibration fixes the single-camera intrinsics calculated in Module 2 (K₁ = K₂), solving for the stereo extrinsics: rotation matrix (R), translation vector (T, baseline B = 343.45 mm), Essential Matrix (E), Fundamental Matrix (F), and stereo rectification matrices (R₁, R₂, P₁, P₂, Q) across 17 valid checkerboard pairs.
          </p>

          {/* Calibration Matrices & Data Graphics */}
          <div className="space-y-4 mb-6">
            <h4 className="font-semibold text-lg text-gray-700">Stereo Calibration Results & Matrices</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden p-2 bg-gray-50">
                <p className="text-center font-medium text-sm text-gray-700 mb-2">Calibration Parameters & Baseline</p>
                <img
                  src={`${baseUrl}module7/Stereo_Calibration_Data.png`}
                  alt="Stereo Calibration Data"
                  className="w-full h-auto rounded border border-gray-200"
                />
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden p-2 bg-gray-50">
                <p className="text-center font-medium text-sm text-gray-700 mb-2">Camera & Rectification Matrices (Part 1)</p>
                <img
                  src={`${baseUrl}module7/Stereo_Calibration_Matrices_1.png`}
                  alt="Stereo Calibration Matrices 1"
                  className="w-full h-auto rounded border border-gray-200"
                />
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden p-2 bg-gray-50">
              <p className="text-center font-medium text-sm text-gray-700 mb-2">Rectification & Projection Matrices (Part 2)</p>
              <img
                src={`${baseUrl}module7/Stereo_Calibration_Matrices_2.png`}
                alt="Stereo Calibration Matrices 2"
                className="w-full max-w-2xl mx-auto h-auto rounded border border-gray-200"
              />
            </div>
          </div>

          {/* Interactive Stereo Checkerboard Pair Viewer */}
          <div className="mt-6">
            <h4 className="font-semibold text-lg text-gray-700 mb-2">
              Checkerboard Image Dataset (18 Stereo Pairs)
            </h4>
            <p className="text-sm text-gray-500 mb-3">
              Select a pair below to view the synchronized Left and Right checkerboard images used in stereo calibration.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {CALIBRATION_PAIRS.map((p, idx) => (
                <button
                  key={p.pairNum}
                  onClick={() => setSelectedCalibIndex(idx)}
                  className={`px-3 py-1 text-xs font-semibold rounded transition ${
                    selectedCalibIndex === idx
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  Pair {p.pairNum} {p.valid ? '' : '(Skipped)'}
                </button>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700 text-sm">
                  Displaying Pair {currentCalib.pairNum}: {currentCalib.left} & {currentCalib.right}
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    currentCalib.valid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {currentCalib.valid ? 'Valid Calibration Pair' : 'Skipped (Occluded Pattern)'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-500 mb-1 block">Left Camera View</span>
                  <img
                    src={`${baseUrl}module7/left_images/${currentCalib.left}`}
                    alt={`Left calibration pair ${currentCalib.pairNum}`}
                    className="w-full h-64 object-contain bg-black rounded border border-gray-200"
                  />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-500 mb-1 block">Right Camera View</span>
                  <img
                    src={`${baseUrl}module7/right_images/${currentCalib.right}`}
                    alt={`Right calibration pair ${currentCalib.pairNum}`}
                    className="w-full h-64 object-contain bg-black rounded border border-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Output Log */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-2 text-sm">Calibration Terminal Output Log</h4>
            <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto text-xs max-h-64 overflow-y-auto font-mono">
              {calibLog}
            </pre>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* Requirement 2: 3D Object Size and Shape Estimation */}
        {/* ========================================================================= */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-4 text-gray-800">
            Requirement 2: 3D Object Size and Shape Estimation
          </h3>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Estimates 3D physical dimensions and shapes of 20 household objects from calibrated stereo pairs. Disparity is computed across corresponding features and triangulated into 3D world space using <code>cv2.triangulatePoints</code>. Each object is classified as either <strong>RECTANGULAR</strong> or <strong>CIRCULAR</strong> based on geometric circularity and contour fill ratio.
          </p>

          {/* Measurement Experiment Results Graphic */}
          <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden p-2 bg-gray-50">
            <p className="text-center font-medium text-sm text-gray-700 mb-2">
              Experimental Measurement Results & Shape Analysis (20 Objects)
            </p>
            <img
              src={`${baseUrl}module7/Stereo_Experiment_Results.png`}
              alt="Stereo Object Measurement Experiment Results"
              className="w-full h-auto rounded border border-gray-200"
            />
          </div>

          {/* Interactive Object Dataset Viewer */}
          <div className="mt-6">
            <h4 className="font-semibold text-lg text-gray-700 mb-2">
              Stereo Object Measurement Dataset (20 Objects)
            </h4>
            <p className="text-sm text-gray-500 mb-3">
              Select an object to inspect its rectified Left and Right stereo measurement pair.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {OBJECT_ITEMS.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedObjIndex(idx)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                    selectedObjIndex === idx
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-800 text-sm">
                  {currentObj.name} (Object {selectedObjIndex + 1} of {OBJECT_ITEMS.length})
                </span>
                <span className="text-xs text-gray-500">
                  Left: <code>{currentObj.left}</code> | Right: <code>{currentObj.right}</code>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-500 mb-1 block">Left Stereo View</span>
                  <img
                    src={`${baseUrl}module7/stereo_measurements_left/${currentObj.left}`}
                    alt={`${currentObj.name} Left View`}
                    className="w-full h-64 object-contain bg-black rounded border border-gray-200"
                  />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-500 mb-1 block">Right Stereo View</span>
                  <img
                    src={`${baseUrl}module7/stereo_measurements_right/${currentObj.right}`}
                    alt={`${currentObj.name} Right View`}
                    className="w-full h-64 object-contain bg-black rounded border border-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Output Log */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-2 text-sm">Object Dimension Terminal Output Log</h4>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-72 overflow-y-auto font-mono">
              {dimLog}
            </pre>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* Requirement 3: Continuous Room Dimension Estimation from Stereo Videos */}
        {/* ========================================================================= */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-4 text-gray-800">
            Requirement 3: Continuous Room Dimension Estimation from Stereo Videos
          </h3>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Continuously processes synchronized stereo video streams of an outdoor patio room across 360 frames. Applies dynamic uncropped stereo rectification ($\alpha = 0.85$) to preserve the entire camera field of view, computes high-density disparity depth maps using StereoSGBM + Weighted Least Squares (WLS) filtering, detects the 2D perimeter of the wall, and extrapolates true 3D room dimensions via RANSAC plane fitting and camera ray-casting.
          </p>

          {/* Room Dimensions Graphic */}
          <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden p-2 bg-gray-50">
            <p className="text-center font-medium text-sm text-gray-700 mb-2">
              Patio Room Geometry, Boundary Alignment, & 3D Extrapolation
            </p>
            <img
              src={`${baseUrl}module7/Stereo_Room_Dimensions.png`}
              alt="Stereo Room Dimensions Analysis"
              className="w-full h-auto rounded border border-gray-200"
            />
          </div>

          {/* Key Metrics Display Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
            <h4 className="text-blue-900 font-bold text-lg mb-3">Estimated Room Dimensions Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="bg-white p-3 rounded shadow-sm border border-blue-100">
                <span className="text-xs text-gray-500 block uppercase font-semibold">Room Width</span>
                <span className="text-xl font-bold text-blue-900">2.528 m</span>
                <span className="text-xs text-gray-600 block">8 ft 3.5 in</span>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-blue-100">
                <span className="text-xs text-gray-500 block uppercase font-semibold">Room Height</span>
                <span className="text-xl font-bold text-blue-900">1.294 m</span>
                <span className="text-xs text-gray-600 block">4 ft 2.9 in</span>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-blue-100">
                <span className="text-xs text-gray-500 block uppercase font-semibold">Wall Depth (Z)</span>
                <span className="text-xl font-bold text-blue-900">3.250 m</span>
                <span className="text-xs text-gray-600 block">10 ft 8.0 in</span>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-blue-100">
                <span className="text-xs text-gray-500 block uppercase font-semibold">Floor Area</span>
                <span className="text-xl font-bold text-blue-900">8.22 m²</span>
                <span className="text-xs text-gray-600 block">88.4 sq ft</span>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-blue-100">
                <span className="text-xs text-gray-500 block uppercase font-semibold">Room Volume</span>
                <span className="text-xl font-bold text-blue-900">10.63 m³</span>
                <span className="text-xs text-gray-600 block">375.4 cu ft</span>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-3 text-center">
              Evaluated over 360 video frames @ 59.85 FPS with continuous temporal Exponential Moving Average (EMA) smoothing.
            </p>
          </div>

          {/* Ground Truth Comparison & Error Analysis Table */}
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-5">
            <h4 className="font-semibold text-lg text-gray-800 mb-2">Ground Truth vs. Stereo Script Estimate Comparison</h4>
            <p className="text-sm text-gray-600 mb-4">
              Comparison between physical tape-measured ground truth values and 3D stereo reconstruction estimates on the outdoor patio wall:
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Dimension</th>
                    <th className="py-3 px-4">True Measurement</th>
                    <th className="py-3 px-4">New Script Estimate</th>
                    <th className="py-3 px-4">Absolute Error</th>
                    <th className="py-3 px-4">Percentage Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-t border-gray-200 text-gray-800">
                  <tr className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-bold">Width</td>
                    <td className="py-3 px-4">2.965 m (116.75 in)</td>
                    <td className="py-3 px-4">2.528 m</td>
                    <td className="py-3 px-4">0.437 m</td>
                    <td className="py-3 px-4 font-semibold text-orange-600">14.75%</td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-bold">Height</td>
                    <td className="py-3 px-4">2.146 m (84.5 in)</td>
                    <td className="py-3 px-4">1.294 m</td>
                    <td className="py-3 px-4">0.852 m</td>
                    <td className="py-3 px-4 font-semibold text-red-600">39.71%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              * Note: The observed error stems primarily from the fixed stereo baseline calibration geometry, slight disparity smoothing across non-textured patio siding, and optical projection onto the slanted roofline.
            </p>
          </div>

          {/* Wall Bounding Box Snapshots Viewer */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg text-gray-700">Wall Perimeter & Bounding Box Snapshots</h4>
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
                <span className="text-xs text-gray-500">
                  {selectedFrameView === 'first'
                    ? 'wall_bbox_first_frame_LEFT.jpg & wall_bbox_first_frame_RIGHT.jpg'
                    : 'wall_bbox_last_frame_LEFT.jpg & wall_bbox_last_frame_RIGHT.jpg'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-500 mb-1 block">Left Camera View</span>
                  <img
                    src={`${baseUrl}module7/${
                      selectedFrameView === 'first' ? 'wall_bbox_first_frame_LEFT.jpg' : 'wall_bbox_last_frame_LEFT.jpg'
                    }`}
                    alt={`${selectedFrameView} Frame Left`}
                    className="w-full h-80 object-contain bg-black rounded border border-gray-200"
                  />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-500 mb-1 block">Right Camera View</span>
                  <img
                    src={`${baseUrl}module7/${
                      selectedFrameView === 'first' ? 'wall_bbox_first_frame_RIGHT.jpg' : 'wall_bbox_last_frame_RIGHT.jpg'
                    }`}
                    alt={`${selectedFrameView} Frame Right`}
                    className="w-full h-80 object-contain bg-black rounded border border-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Output Log */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2 text-sm">Room Dimensions Terminal Output Log</h4>
            <pre className="bg-gray-900 text-yellow-400 p-4 rounded-lg overflow-x-auto text-xs max-h-72 overflow-y-auto font-mono">
              {roomLog}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Module7App;
