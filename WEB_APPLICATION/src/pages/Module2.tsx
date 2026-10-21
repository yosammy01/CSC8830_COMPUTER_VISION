import React from 'react';
import { Link } from 'react-router-dom';
import calibrationOutputTxt from '../../../MODULE2/calibration_output.txt?raw';
import dimensionsOutputTxt from '../../../MODULE2/dimensions_output.txt?raw';

const calibrationGlob = import.meta.glob('../../../MODULE2/images/*.jpg', { query: '?url', import: 'default', eager: true });
const measurementsGlob = import.meta.glob('../../../MODULE2/measurements/*.jpg', { query: '?url', import: 'default', eager: true });

const Module2App: React.FC = () => {
  const calibrationImages = Object.entries(calibrationGlob).map(([path, mod]) => ({
    name: path.split('/').pop() || 'Calibration Image',
    url: typeof mod === 'string' ? mod : (mod as any)?.default || '',
  }));

  const measurementImages = Object.entries(measurementsGlob).map(([path, mod]) => ({
    name: path.split('/').pop() || 'Measurement Image',
    url: typeof mod === 'string' ? mod : (mod as any)?.default || '',
  }));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Home
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">CSC 8830: Computer Vision</h1>
          <h2 className="text-2xl text-gray-600">Module 2: Camera Calibration & Dimensions Demonstration</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">

        {/* Links & Repository */}
        <section className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold mb-1">Project Resources</h3>
            <p className="text-sm text-gray-500">Access the code repository and written PDF derivations.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            <Link to="/module2/live" style={{ display: 'block', backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>Try Live Interactive Demo</Link>
            <a href="https://github.com/yosammy01/CSC8830_COMPUTER_VISION/tree/main/MODULE2" target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#1f2937', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>GitHub Repo</a>
            <a href={`${import.meta.env.BASE_URL}Module2/Module2_Report.pdf`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>View Final PDF</a>
          </div>
        </section>

        {/* Video Demonstration */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Working Demonstration</h3>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe
              src="https://www.youtube.com/embed/fcLAOd-B5mQ"
              title="Module 2 Demonstration"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            ></iframe>
          </div>
        </section>

        {/* Step 1: Calibration Images */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Step 1: Camera Calibration Dataset</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Below are the {calibrationImages.length} checkerboard calibration images (captured by a smartphone) used to find chessboard corners and compute the intrinsic camera matrix and distortion coefficients.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {calibrationImages.map((img, idx) => (
              <div key={idx} style={{ backgroundColor: '#f9fafb', padding: '6px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
                <img src={img.url} alt={img.name} style={{ height: '80px', width: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #d1d5db', marginBottom: '4px' }} />
                <span style={{ fontSize: '10px', color: '#4b5563', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={img.name}>{img.name}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Calibration Terminal Output</h4>
            <pre style={{ backgroundColor: '#111827', color: '#60a5fa', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '13px', maxHeight: '260px', overflowY: 'auto', textAlign: 'left', margin: 0 }}>
              {calibrationOutputTxt}
            </pre>
          </div>
        </section>

        {/* Step 2: Measurement Images */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Step 2: Object Measurement Dataset</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Below are the {measurementImages.length} object measurement images processed with the calibration parameters to undistort the images, isolate the objects, and compute their real-world 2D dimensions.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {measurementImages.map((img, idx) => (
              <div key={idx} style={{ backgroundColor: '#f9fafb', padding: '6px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
                <img src={img.url} alt={img.name} style={{ height: '80px', width: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #d1d5db', marginBottom: '4px' }} />
                <span style={{ fontSize: '10px', color: '#4b5563', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={img.name}>{img.name}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Measurement Terminal Output</h4>
            <pre style={{ backgroundColor: '#111827', color: '#4ade80', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '13px', maxHeight: '320px', overflowY: 'auto', textAlign: 'left', margin: 0 }}>
              {dimensionsOutputTxt}
            </pre>
          </div>
        </section>

        {/* Validation Data */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Step 3: Validation & Error Statistics</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Below are the experimental results computing the real-world 2D dimensions of 20 objects using perspective projection equations, alongside the calculated statistical error metrics.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <img src={`${import.meta.env.BASE_URL}Module2/real_world_dimensions.png`} alt="Real World Dimensions" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
            <img src={`${import.meta.env.BASE_URL}Module2/projected_dimensions.png`} alt="Projected Dimensions" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
            <img src={`${import.meta.env.BASE_URL}Module2/percent_error.png`} alt="Percent Error" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
            <img src={`${import.meta.env.BASE_URL}Module2/Error_Statistics.png`} alt="Error Statistics" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
          </div>
        </section>

      </main>
    </div>
  );
};

export default Module2App;
