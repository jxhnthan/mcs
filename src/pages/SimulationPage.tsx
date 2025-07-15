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

// --- Helper: Normal Distribution ---
function randomNormal(mean: number, stdDev: number) {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// --- Helper: Calculate KPIs ---
const calculateInsights = (results: number[], initialSize: number) => {
  const sorted = [...results].sort((a, b) => a - b);
  const grewCount = results.filter(val => val > initialSize).length;
  const growthProbability = Math.round((grewCount / results.length) * 100);
  const ciLower = Math.round(sorted[Math.floor(results.length * 0.025)]);
  const ciUpper = Math.round(sorted[Math.floor(results.length * 0.975)]);
  const median = Math.round(sorted[Math.floor(results.length / 2)]);
  const over100 = results.filter(val => val > 100).length;
  const overThresholdPct = Math.round((over100 / results.length) * 100);

  return { growthProbability, ciLower, ciUpper, median, overThresholdPct };
};

// --- Main Monte Carlo Simulation (Improved Realism) ---
const runMonteCarloSimulation = (
  { dailyInquiries, dailyCapacity }: { dailyInquiries: number; dailyCapacity: number },
  config = { days: 90, runs: 5000, initialSize: 50 }
) => {
  const { days, runs, initialSize } = config;
  const finalWaitlistResults: number[] = [];

  for (let i = 0; i < runs; i++) {
    let waitlist = initialSize;

    for (let day = 0; day < days; day++) {
      const isLeaveDay = Math.random() < 0.05; // 5% chance capacity drops to 0
      const isPeakSeason = day >= 60 && day <= 75;

      const demandMean = isPeakSeason ? dailyInquiries * 1.5 : dailyInquiries;
      const newPatients = Math.min(15, Math.max(0, randomNormal(demandMean, demandMean * 0.2)));

      const seenPatients = isLeaveDay
        ? 0
        : Math.min(6, Math.max(0, randomNormal(dailyCapacity, dailyCapacity * 0.1)));

      waitlist += newPatients - seenPatients;
      waitlist = Math.max(0, waitlist);
    }

    finalWaitlistResults.push(Math.round(waitlist));
  }

  // Build histogram
  const binSize = 2;
  const bins: Record<number, number> = {};
  finalWaitlistResults.forEach(result => {
    const bin = Math.round(result / binSize) * binSize;
    bins[bin] = (bins[bin] || 0) + 1;
  });

  const chartData = Object.keys(bins).map(key => ({
    x: Number(key),
    y: bins[Number(key)],
  }));

  const insights = calculateInsights(finalWaitlistResults, initialSize);

  return { data: chartData, ...insights };
};

// --- Scenarios ---
const scenarios = {
  baseline: {
    label: "Current State",
    getInsight: (i: ReturnType<typeof calculateInsights>) =>
      `With current capacity, there's a ${i.growthProbability}% chance the waitlist will be larger in 90 days, indicating an unsustainable model.`,
    color: "rgba(255, 159, 64, 0.5)",
    borderColor: "rgba(255, 159, 64, 1)",
    params: { dailyInquiries: 2.8, dailyCapacity: 2.0 },
  },
  hireTherapist: {
    label: "Hire 1 New Therapist",
    getInsight: (i: ReturnType<typeof calculateInsights>) =>
      `By adding one therapist, the probability of waitlist growth drops to just ${i.growthProbability}%, creating a more resilient and predictable service.`,
    color: "rgba(75, 192, 192, 0.5)",
    borderColor: "rgba(75, 192, 192, 1)",
    params: { dailyInquiries: 2.8, dailyCapacity: 3.0 },
  },
  crisis: {
    label: "Crisis Hits",
    getInsight: (i: ReturnType<typeof calculateInsights>) =>
      `A demand surge creates a near-certainty (${i.growthProbability}%) of overwhelming the waitlist, highlighting a critical need for a crisis response plan.`,
    color: "rgba(255, 99, 132, 0.5)",
    borderColor: "rgba(255, 99, 132, 1)",
    params: { dailyInquiries: 4.5, dailyCapacity: 2.0 },
  },
};

type ScenarioKey = keyof typeof scenarios;

const SimulationPage: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('baseline');
  const scenario = scenarios[activeScenario];

  const simulationResults = useMemo(() => {
    return runMonteCarloSimulation(scenario.params);
  }, [activeScenario]);

  const insightText = scenario.getInsight(simulationResults);

  const chartData = {
    datasets: [
      {
        label: 'Final Waitlist Size Distribution',
        data: simulationResults.data,
        fill: true,
        backgroundColor: scenario.color,
        borderColor: scenario.borderColor,
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
        <span className="peak-time-value">{simulationResults.median}</span>
        <span className="peak-time-label">Most Likely Waitlist Size</span>

        <div className="ci-display">
          <span className="ci-value">{`${simulationResults.ciLower} - ${simulationResults.ciUpper}`}</span>
          <span className="ci-label">95% Confidence Interval</span>
        </div>
      </div>

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




