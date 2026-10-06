import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Module2 from './pages/Module2';
import Module3 from './pages/Module3';
import Module4 from './pages/Module4';
import Module56 from './pages/Module56';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/module2" element={<Module2 />} />
        <Route path="/module3" element={<Module3 />} />
        <Route path="/module4" element={<Module4 />} />
        <Route path="/module56" element={<Module56 />} />
      </Routes>
    </Router>
  );
};

export default App;