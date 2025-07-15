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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, annotationPlugin);

// --- 1. NEW: Helper function to calculate insightful KPIs ---
const calculateInsights = (results: number[], initialSize: number) => {
  // Calculate the percentage of simulation runs where the waitlist grew
  const grewCount = results.filter(finalSize => finalSize > initialSize).length;
  const growthProbability = Math.round((grewCount / results.length) * 100);
  return { growthProbability };
};

const runMonteCarloSimulation = ({ dailyInquiries, dailyCapacity }: { dailyInquiries: number; dailyCapacity: number }) => {
  const NUM_SIMULATIONS = 5000;
  const SIMULATION_PERIOD_DAYS = 90;
  const INITIAL_WAITLIST_SIZE = 50;

  const finalWaitlistResults: number[] = [];

  for (let i = 0; i < NUM_SIMULATIONS; i++) {
    let currentWaitlist = INITIAL_WAITLIST_SIZE;
    for (let day = 0; day < SIMULATION_PERIOD_DAYS; day++) {
      const newPatients = Math.max(0, dailyInquiries + (Math.random() - 0.5) * dailyInquiries);
      const seenPatients = Math.max(0, dailyCapacity + (Math.random() - 0.5) * dailyCapacity);
      currentWaitlist += newPatients - seenPatients;
    }
    finalWaitlistResults.push(Math.max(0, currentWaitlist));
  }

  finalWaitlistResults.sort((a, b) => a - b);

  const peakTime = Math.round(finalWaitlistResults[Math.floor(NUM_SIMULATIONS / 2)]);
  const ciLower = Math.round(finalWaitlistResults[Math.floor(NUM_SIMULATIONS * 0.025)]);
  const ciUpper = Math.round(finalWaitlistResults[Math.floor(NUM_SIMULATIONS * 0.975)]);
  
  // Calculate insights from the raw results
  const insights = calculateInsights(finalWaitlistResults, INITIAL_WAITLIST_SIZE);

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
  
  // Return the calculated insights along with other data
  return { data: chartData, peakTime, ciLower, ciUpper, insights };
};

// --- 2. UPDATED: Scenarios now have functions to generate dynamic insights ---
const scenarios = {
  baseline: {
    label: "Current State",
    // This function creates a data-driven insight
    getInsight: (insights: { growthProbability: number }) => 
      `With current capacity, there's a ${insights.growthProbability}% chance the waitlist will be larger in 90 days, indicating an unsustainable model.`,
    color: "rgba(255, 159, 64, 0.5)",
    borderColor: "rgba(255, 159, 64, 1)",
    params: { dailyInquiries: 2.8, dailyCapacity: 2.0 },
  },
  hireTherapist: {
    label: "Hire 1 New Therapist",
    getInsight: (insights: { growthProbability: number }) => 
      `By adding one therapist, the probability of waitlist growth drops to just ${insights.growthProbability}%, creating a more resilient and predictable service.`,
    color: "rgba(75, 192, 192, 0.5)",
    borderColor: "rgba(75, 192, 192, 1)",
    params: { dailyInquiries: 2.8, dailyCapacity: 3.0 },
  },
  crisis: {
    label: "Crisis Hits",
    getInsight: (insights: { growthProbability: number }) => 
      `A demand surge creates a near-certainty (${insights.growthProbability}%) of overwhelming the waitlist, highlighting a critical need for a crisis response plan.`,
    color: "rgba(255, 99, 132, 0.5)",
    borderColor: "rgba(255, 99, 132, 1)",
    params: { dailyInquiries: 4.5, dailyCapacity: 2.0 },
  },
};

type ScenarioKey = keyof typeof scenarios;

const SimulationPage: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('baseline');
  const currentScenarioDetails = scenarios[activeScenario];

  const simulationResults = useMemo(() => {
    return runMonteCarloSimulation(currentScenarioDetails.params);
  }, [activeScenario, currentScenarioDetails.params]);

  // --- 3. UPDATED: Generate the insight text dynamically ---
  const insightText = currentScenarioDetails.getInsight(simulationResults.insights);

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
      
      {/* Use the dynamic insight text here */}
      <p className="insight-text">{insightText}</p>

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




