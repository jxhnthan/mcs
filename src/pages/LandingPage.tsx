import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import "../styles/LandingPage.css";
import logo from "../images/logo.png";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <motion.img
        src={logo}
        alt="H&W Logo"
        className="landing-logo"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      />

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="landing-title"
      >
        Monte Carlo Simulations
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="landing-subtitle"
      >
        This interactive demo lets you experiment with different assumptions and
        see how uncertainty plays out — in real time.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Button onClick={() => navigate("/simulate")}>Start Exploring</Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="footer-container"
      >
        <hr className="footer-divider" />
        <p className="footer-text">
          Built for SMHC 2025 by NUS Health and Wellbeing
        </p>
      </motion.div>
    </div>
  );
};

export default LandingPage;



