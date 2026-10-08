import React from 'react';
import { Link } from 'react-router-dom';

const Module4App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Home
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">CSC 8830: Computer Vision</h1>
          <h2 className="text-2xl text-gray-600">Module 4: Human Segmentation Demonstration</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">

        <section className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold mb-1">Project Resources</h3>
            <p className="text-sm text-gray-500">Access the code repository, report, and theory PDF.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            <Link to="/module4/live" style={{ display: 'block', backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>Try Live Interactive Demo</Link>
            <a href="https://github.com/yosammy01/CSC8830_COMPUTER_VISION/tree/main/MODULE4" target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#1f2937', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>GitHub Repo</a>
            <a href={`${import.meta.env.BASE_URL}Module4/Module4_Report.pdf`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>View Report PDF</a>
            <a href={`${import.meta.env.BASE_URL}Module4/Module4_Theory.pdf`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#8b5cf6', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>View Theory PDF</a>
          </div>
        </section>

        {/* Video Demonstration */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Working Demonstration</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Demonstration of human segmentation using GrabCut and Otsu's thresholding compared against SAM 2.
          </p>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              src="https://www.youtube.com/embed/Gu_zXsU9UhU"
              title="Module 4 Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </section>

        {/* RGB Segmentation Results */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>RGB Human Segmentation Results</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Comparison between classical computer vision (GrabCut) and Meta's SAM 2 deep learning model.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h4 className="font-semibold text-lg text-gray-700">Test Subject 1: Man</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-center text-sm font-medium mb-2">GrabCut Result</p>
                <img src={`${import.meta.env.BASE_URL}Module4/man_segmented.png`} alt="Man GrabCut" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
              <div>
                <p className="text-center text-sm font-medium mb-2">SAM 2 Demo Result</p>
                <img src={`${import.meta.env.BASE_URL}Module4/man_SAM_demo.png`} alt="Man SAM2" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
            </div>

            <h4 className="font-semibold text-lg text-gray-700 mt-6">Test Subject 2: Girl</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-center text-sm font-medium mb-2">GrabCut Result</p>
                <img src={`${import.meta.env.BASE_URL}Module4/girl_segmented.png`} alt="Girl GrabCut" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
              <div>
                <p className="text-center text-sm font-medium mb-2">SAM 2 Demo Result</p>
                <img src={`${import.meta.env.BASE_URL}Module4/girl_SAM_demo.png`} alt="Girl SAM2" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Thermal Segmentation Results */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Thermal Human Segmentation Results</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Comparison between classical computer vision (Otsu's Thresholding) and Meta's SAM 2 on thermal infrared images.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h4 className="font-semibold text-lg text-gray-700">Thermal Subject 1: Man</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-center text-sm font-medium mb-2">Thresholding Result</p>
                <img src={`${import.meta.env.BASE_URL}Module4/man_thermal_boundaries_segmented.png`} alt="Man Thermal Thresholding" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
              <div>
                <p className="text-center text-sm font-medium mb-2">SAM 2 Demo Result</p>
                <img src={`${import.meta.env.BASE_URL}Module4/man_thermal_SAM_demo.png`} alt="Man Thermal SAM2" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
            </div>

            <h4 className="font-semibold text-lg text-gray-700 mt-6">Thermal Subject 2: Girl</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-center text-sm font-medium mb-2">Thresholding Result</p>
                <img src={`${import.meta.env.BASE_URL}Module4/girl_thermal_boundaries_segmented.png`} alt="Girl Thermal Thresholding" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
              <div>
                <p className="text-center text-sm font-medium mb-2">SAM 2 Demo Result</p>
                <img src={`${import.meta.env.BASE_URL}Module4/girl_thermal_SAM_demo.png`} alt="Girl Thermal SAM2" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Module4App;
