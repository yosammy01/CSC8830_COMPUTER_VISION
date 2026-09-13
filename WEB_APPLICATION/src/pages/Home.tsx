import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans flex flex-col items-center justify-center">
      <header className="max-w-4xl mx-auto mb-10 text-center">
        <h1 className="text-5xl font-bold text-blue-900 mb-4">CSC 8830 Projects</h1>
        <h2 className="text-xl text-gray-600">Computer Vision Course Portfolio</h2>
      </header>

      <main className="max-w-4xl w-full space-y-6">
        <section className="bg-white p-8 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">Module 2: Camera Calibration & Dimensions</h3>
              <p className="text-gray-600">
                A demonstration of finding real-world dimensions using perspective projection equations and camera calibration.
              </p>
            </div>
            <Link 
              to="/module2" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap shadow-sm hover:shadow"
            >
              View Demonstration
            </Link>
          </div>
        </section>

        {/* Future modules can go here */}
        <section className="bg-gray-100 p-8 rounded-lg shadow-inner border border-gray-200 opacity-70">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2 text-gray-500">Module 3: Coming Soon</h3>
            <p className="text-gray-400">Future assignments will be listed here.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
