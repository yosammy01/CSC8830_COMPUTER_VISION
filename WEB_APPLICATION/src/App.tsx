import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Module2 from './pages/Module2';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/module2" element={<Module2 />} />
      </Routes>
    </Router>
  );
};

export default App;