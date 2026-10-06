import React from 'react';
import { Link } from 'react-router-dom';

const Module56App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 relative">
        <Link to="/" className="absolute left-0 top-1 text-blue-600 hover:text-blue-800 font-semibold transition flex items-center">
          &larr; Back to Home
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">CSC 8830: Computer Vision</h1>
          <h2 className="text-2xl text-gray-600">Module 5-6: Object Tracking & Structure from Motion</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">

        {/* Links & Repository */}
        <section className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold mb-1">Project Resources</h3>
            <p className="text-sm text-gray-500">Access the code repository for Module 5/6.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            <a href="https://github.com/yosammy01/CSC8830_COMPUTER_VISION/tree/main/MODULE56" target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#1f2937', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>GitHub Repo</a>
            <a href={`${import.meta.env.BASE_URL}Module56/Module5-6_Report.pdf`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' }}>View Report PDF</a>
          </div>
        </section>

        {/* Video Demonstration */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Working Demonstration</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Demonstration of object tracking (ball and dogs) and the structure from motion python script in action.
          </p>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              src="https://www.youtube.com/embed/J_NfiKz-T2s"
              title="Module 5-6 Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </section>

        {/* Object Tracking Results */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Part 1: Object Tracking Demo</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Demonstration of object tracking using classical computer vision methods. 
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h4 className="font-semibold text-lg text-gray-700">Subject 1: Ball Tracking</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <p className="text-center text-sm font-medium mb-2">Original Video</p>
                <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                  <iframe
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    src="https://www.youtube.com/embed/OOtyGcgz4Zc"
                    title="Ball Tracking Original Video"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div>
                <p className="text-center text-sm font-medium mb-2">Optical Flow Video</p>
                <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                  <iframe
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    src="https://www.youtube.com/embed/pE8ap8qWFTs"
                    title="Ball Optical Flow Video"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div>
                <p className="text-center text-sm font-medium mb-2">Tracking Result Image</p>
                <img src={`${import.meta.env.BASE_URL}Module56/ball_tracking_validation.png`} alt="Ball Tracking Result" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
            </div>

            <h4 className="font-semibold text-lg text-gray-700 mt-6">Subject 2: Dogs Tracking</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <p className="text-center text-sm font-medium mb-2">Original Video</p>
                <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                  <iframe
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    src="https://www.youtube.com/embed/0xZ6q6lOiFU"
                    title="Dogs Tracking Original Video"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div>
                <p className="text-center text-sm font-medium mb-2">Optical Flow Video</p>
                <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                  <iframe
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    src="https://www.youtube.com/embed/qT07yCae1IY"
                    title="Dogs Optical Flow Video"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div>
                <p className="text-center text-sm font-medium mb-2">Tracking Result Image</p>
                <img src={`${import.meta.env.BASE_URL}Module56/dogs_tracking_validation.png`} alt="Dogs Tracking Result" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Structure from Motion Results */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '0' }}>Part 2: Structure from Motion (SfM)</h3>
          <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.5' }}>
            Reconstruction of a planar object's 3D boundary from 4 different viewpoints using Tomasi-Kanade Factorization (SVD).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p className="text-center text-sm font-medium mb-2">Reconstructed 3D Boundary</p>
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <img src={`${import.meta.env.BASE_URL}Module56/Reconstructed_3D_Boundary.png`} alt="Reconstructed 3D Boundary" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
            </div>
            
            <div>
              <p className="text-center text-sm font-medium mb-2 mt-4">Input Images (4 Viewpoints)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <img src={`${import.meta.env.BASE_URL}Module56/book_stack1.jpg`} alt="View 1" style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                <img src={`${import.meta.env.BASE_URL}Module56/book_stack2.jpg`} alt="View 2" style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                <img src={`${import.meta.env.BASE_URL}Module56/book_stack3.jpg`} alt="View 3" style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                <img src={`${import.meta.env.BASE_URL}Module56/book_stack4.jpg`} alt="View 4" style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Module56App;

