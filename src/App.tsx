import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SimulationPage from "./pages/SimulationPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/simulate" element={<SimulationPage />} />
      </Routes>
    </Router>
  );
}

export default App;

