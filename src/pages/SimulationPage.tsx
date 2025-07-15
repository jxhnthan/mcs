import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import '../styles/SimulationPage.css';

// Register the required Chart.js components and plugins
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, annotationPlugin);

// The Monte Carlo Simulation Engine
const runMonteCarloSimulation = ({ dailyInquiries, dailyCapacity }: { dailyInquiries: number; dailyCapacity: number }) => {
  const NUM_SIMULATIONS = 5000; // Number of "what-if" futures to run
  const SIMULATION_PERIOD_DAYS = 90; // Simulate over 3 months
  const INITIAL_WAITLIST_SIZE = 50;

  const finalWaitlistResults: number[] = [];

  // Run the simulation thousands of times
  for (let i = 0; i < NUM_SIMULATIONS; i++) {
    let currentWaitlist = INITIAL_WAITLIST_SIZE;
    // Simulate day-by-day for the period
    for (let day = 0; day < SIMULATION_PERIOD_DAYS; day++) {
      // Introduce randomness for daily fluctuations
      const newPatients = Math.max(0, dailyInquiries + (Math.random() - 0.5) * dailyInquiries);
      const seenPatients = Math.max(0, dailyCapacity + (Math.random() - 0.5) * dailyCapacity);

      currentWaitlist += newPatients - seenPatients;
    }
    finalWaitlistResults.push(Math.max(0, currentWaitlist)); // Store the result of this one simulation
  }

  // Process the thousands of results to find key metrics
  finalWaitlistResults.sort((a, b) => a - b);

  const peakTime = Math.round(finalWaitlistResults[Math.floor(NUM_SIMULATIONS / 2)]); // Median result
  const ciLower = Math.round(finalWaitlistResults[Math.floor(NUM_SIMULATIONS * 0.025)]); // 2.5th percentile
  const ciUpper = Math.round(finalWaitlistResults[Math.floor(NUM_SIMULATIONS * 0.975)]); // 97.5th percentile

  // Group results into bins to create the distribution chart data
  const binSize = 2;
  const bins: { [key: number]: number } = {};
  finalWaitlistResults.forEach(result => {
    const binKey = Math.round(result / binSize) * binSize;
    bins[binKey] = (bins[binKey] || 0) + 1;
  });

  const chartData = Object.keys(bins).map(key => ({
    x: Number(key),
    y: bins[Number(key)],
  }));

  return { data: chartData, peakTime, ciLower, ciUpper };
};

// Scenarios now hold INPUTS for the simulation engine
const scenarios = {
  baseline: {
    label: "Current State",
    insight: "Currently, wait times are unpredictable, averaging 4 weeks.",
    color: "rgba(255, 159, 64, 0.5)",
    borderColor: "rgba(255, 159, 64, 1)",
    params: { dailyInquiries: 2.8, dailyCapacity: 2.0 },
  },
  hireTherapist: {
    label: "Hire 1 New Therapist",
    insight: "Adding staff reduces the average wait time and makes our service more predictable.",
    color: "rgba(75, 192, 192, 0.5)",
    borderColor: "rgba(75, 192, 192, 1)",
    params: { dailyInquiries: 2.8, dailyCapacity: 3.0 },
  },
  crisis: {
    label: "Crisis Hits",
    insight: "A sudden demand surge could overwhelm our system, leading to long delays.",
    color: "rgba(255, 99, 132, 0.5)",
    borderColor: "rgba(255, 99, 132, 1)",
    params: { dailyInquiries: 4.5, dailyCapacity: 2.0 },
  },
};

type ScenarioKey = keyof typeof scenarios;

// The React Component
const SimulationPage: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('baseline');
  const currentScenarioDetails = scenarios[activeScenario];

  // useMemo hook prevents re-running the expensive simulation on every render
  const simulationResults = useMemo(() => {
    return runMonteCarloSimulation(currentScenarioDetails.params);
    // FIXED: Added the missing dependency to the array
  }, [activeScenario, currentScenarioDetails.params]);

  const chartData = {
    datasets: [
      {
        label: 'Likelihood',
        data: simulationResults.data,
        fill: true,
        backgroundColor: currentScenarioDetails.color,
        borderColor: currentScenarioDetails.borderColor,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 750 },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      annotation: {
        annotations: {
          confidenceBox: {
            type: 'box' as const,
            xMin: simulationResults.ciLower,
            xMax: simulationResults.ciUpper,
            backgroundColor: 'rgba(71, 85, 105, 0.05)',
            borderColor: 'rgba(100, 116, 139, 0.2)',
            borderWidth: 1,
            borderDash: [6, 6],
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Projected Waitlist Size (at 90 days)',
          font: { size: 14 },
          color: '#64748b',
        },
        ticks: { color: '#64748b' },
        min: 0,
        // The axis max is dynamic to prevent the graph from going off-screen
        max: Math.ceil((simulationResults.ciUpper + 10) / 10) * 10,
      },
      y: { display: false },
    },
  };

  return (
    <div className="explainer-container">
      <div className="chart-wrapper">
        <Line data={chartData} options={chartOptions as any} />
      </div>

      <div className="metrics-display">
        <span className="peak-time-value">{simulationResults.peakTime}</span>
        <span className="peak-time-label">Most Likely Waitlist Size</span>

        <div className="ci-display">
          <span className="ci-value">{`${simulationResults.ciLower} - ${simulationResults.ciUpper}`}</span>
          <span className="ci-label">95% Confidence Interval</span>
        </div>
      </div>

      <p className="insight-text">{currentScenarioDetails.insight}</p>

      <div className="scenario-buttons">
        {Object.keys(scenarios).map((key) => (
          <button
            key={key}
            className={`scenario-btn ${activeScenario === key ? 'active' : ''}`}
            onClick={() => setActiveScenario(key as ScenarioKey)}
          >
            {scenarios[key as ScenarioKey].label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimulationPage;




