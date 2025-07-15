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

// Register Chart.js components and plugins
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, annotationPlugin);

// --- Helper: Normal Distribution ---
function randomNormal(mean: number, stdDev: number): number {
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

  return { growthProbability, ciLower, ciUpper, median };
};

// --- Main Monte Carlo Simulation ---
const runMonteCarloSimulation = (
  {
    dailyInquiries,
    dailyCapacity,
    shortageStartDay = -1,
    shortageLength = 0,
    shortageCapacityFactor = 1,
  }: {
    dailyInquiries: number;
    dailyCapacity: number;
    shortageStartDay?: number;
    shortageLength?: number;
    shortageCapacityFactor?: number;
  },
  config = { days: 90, runs: 5000, initialSize: 50 }
) => {
  const { days, runs, initialSize } = config;
  const finalWaitlistResults: number[] = [];

  for (let i = 0; i < runs; i++) {
    let waitlist = initialSize;

    for (let day = 0; day < days; day++) {
      const isLeaveDay = Math.random() < 0.05;
      const isPeakSeason = day >= 60 && day <= 75;

      const demandMean = isPeakSeason ? dailyInquiries * 1.5 : dailyInquiries;
      const newPatients = Math.min(15, Math.max(0, randomNormal(demandMean, demandMean * 0.2)));

      let capacityToday = dailyCapacity;
      if (day >= shortageStartDay && day < shortageStartDay + shortageLength) {
        capacityToday *= shortageCapacityFactor;
      }

      const seenPatients = isLeaveDay
        ? 0
        : Math.min(6, Math.max(0, randomNormal(capacityToday, capacityToday * 0.1)));

      waitlist += newPatients - seenPatients;
      waitlist = Math.max(0, waitlist);
    }
    finalWaitlistResults.push(Math.round(waitlist));
  }

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
  staffShortage: {
    label: "Staff Shortage (Sick Leave)",
    getInsight: (i: ReturnType<typeof calculateInsights>) =>
      `A 2-week staff shortage period causes waitlist growth probability to rise to ${i.growthProbability}%, highlighting the impact of temporary capacity loss.`,
    color: "rgba(153, 102, 255, 0.5)",
    borderColor: "rgba(153, 102, 255, 1)",
    params: {
      dailyInquiries: 2.8,
      dailyCapacity: 2.0,
      shortageStartDay: 30,
      shortageLength: 14,
      shortageCapacityFactor: 0.3,
    },
  },
};

type ScenarioKey = keyof typeof scenarios;

// ==================================================================
//  Collapsible Sidebar Component (Defined in the same file)
// ==================================================================
interface AssumptionsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AssumptionsSidebar: React.FC<AssumptionsSidebarProps> = ({ isOpen, onClose }) => {
  return (
    <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className={`sidebar ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <h3>Modeling Assumptions</h3>
          <button onClick={onClose} className="close-btn" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="sidebar-content">
          {/* 👇 Text is now normal without <strong> tags */}
          <ul>
            <li>
              Simulation Runs: Each scenario is simulated 5,000 times to ensure a stable and reliable distribution of potential outcomes.
            </li>
            <li>
              Time Horizon: The model projects the waitlist size over a 90-day period.
            </li>
            <li>
              Initial State: The simulation starts with a baseline waitlist of 50 people.
            </li>
            <li>
              Demand Model: New client enquiries follow a Normal (Gaussian) distribution, with the standard deviation set to 20% of the mean to model realistic daily fluctuations.
            </li>
            <li>
              Capacity Model: The number of clients seen daily also follows a Normal distribution, with a smaller standard deviation (10% of the mean) to reflect a more controlled process.
            </li>
            <li>
              Peak Seasonality: A predictable "peak season" is modelled between days 60 and 75, causing a 50% increase in daily client enquiries.
            </li>
            <li>
              Random Shocks: The model includes a 5% daily probability of an unexpected staff absence, which reduces service capacity to zero for that day.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ==================================================================
//  Main Simulation Page Component
// ==================================================================
const SimulationPage: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('baseline');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
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
        max: Math.ceil((simulationResults.ciUpper + 20)),
      },
      y: { display: false },
    },
  };

  return (
    <div className="simulation-page-layout">
      <div className="explainer-container">
        <button className="assumptions-toggle-btn" onClick={() => setSidebarOpen(true)}>
          View Assumptions
        </button>

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
      
      <AssumptionsSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
};

export default SimulationPage;





