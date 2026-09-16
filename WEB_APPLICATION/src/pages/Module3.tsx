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
          <h2 className="text-2xl text-gray-600">Module 3 Assignment Demonstration</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">

        {/* Links & Repository */}
        <section className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold mb-1">Project Resources</h3>
            <p className="text-sm text-gray-500">Access the code repository for image blurring filtering.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            <a href="https://github.com/yosammy01/CSC8830_COMPUTER_VISION/tree/main/MODULE3" target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#1f2937', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>GitHub Repo</a>
          </div>
        </section>

        {/* Video Demonstration */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Working Demonstration</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Demonstration of image blurring using a filtering approach (Custom Box Filter vs Built-in Gaussian Blur).
          </p>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="text-gray-400 absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Video demonstration coming soon</p>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Module3App;
