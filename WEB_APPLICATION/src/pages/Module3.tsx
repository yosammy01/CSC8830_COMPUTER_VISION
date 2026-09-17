import React from 'react';
import { Link } from 'react-router-dom';

const Module3App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Home
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">CSC 8830: Computer Vision</h1>
          <h2 className="text-2xl text-gray-600">Module 3: Image Blurring Assignment Demonstration</h2>
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
            <a href="https://github.com/yosammy01/CSC8830_COMPUTER_VISION/tree/main/MODULE3" target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#1f2937', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>GitHub Repo</a>
            <a href={`${import.meta.env.BASE_URL}Module3_Report.pdf`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>View Final PDF</a>
          </div>
        </section>

        {/* Video Demonstration */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Working Demonstration</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Demonstration of image blurring (Custom Box Filter vs Built-in Gaussian Blur and Convolution in Frequency Domain).
          </p>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="text-gray-400 absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Video demonstration coming soon</p>
          </div>
        </section>

        {/* Validation Data */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Validation & Error Statistics</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Below are the theoretical derivation, implementation results, and error statistics validating the spatial versus frequency domain filtering approaches.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <img src={`${import.meta.env.BASE_URL}Module3_Theory_Math.png`} alt="Theory and Math" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
            <img src={`${import.meta.env.BASE_URL}Module3_Implementation_Results.png`} alt="Implementation Results" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
            <img src={`${import.meta.env.BASE_URL}Module3_Evidence_Validation.png`} alt="Evidence and Validation" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
          </div>
        </section>

      </main>
    </div>
  );
};

export default Module3App;
