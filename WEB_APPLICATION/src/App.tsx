import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Module2 from './pages/Module2';
import Module2Live from './pages/Module2Live';
import Module3 from './pages/Module3';
import Module3Live from './pages/Module3Live';
import Module4 from './pages/Module4';
import Module4Live from './pages/Module4Live';
import Module56 from './pages/Module56';
import Module56Live from './pages/Module56Live';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/module2" element={<Module2 />} />
        <Route path="/module2/live" element={<Module2Live />} />
        <Route path="/module3" element={<Module3 />} />
        <Route path="/module3/live" element={<Module3Live />} />
        <Route path="/module4" element={<Module4 />} />
        <Route path="/module4/live" element={<Module4Live />} />
        <Route path="/module56" element={<Module56 />} />
        <Route path="/module56/live" element={<Module56Live />} />
      </Routes>
    </Router>
  );
};

export default App;