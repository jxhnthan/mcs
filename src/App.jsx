import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Label,
  Line,
} from "recharts";

// NUS color palette and chart line colors
const NUS_BLUE_DARK = "#00205B";
const NUS_BLUE_MEDIUM = "#0055A6";
const NUS_BLUE_LIGHT = "#E6F0FA";
const NUS_GRAY_TEXT = "#4B5563";
const CHART_LINE_ARRIVAL = "#00205B";
const CHART_LINE_SERVED = "#0055A6";
const CHART_LINE_WAITING = "#F59E42";
const CHART_LINE_DROPOUT = "#E63946";

// SliderInputField for better mobile interaction - Refined colors (blue only)
function SliderInputField({ label, value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium" style={{ color: NUS_BLUE_DARK }}>{label}</label>
      <div className="flex items-center space-x-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-grow h-2 rounded-lg appearance-none cursor-pointer transition-colors duration-200"
          style={{ backgroundColor: NUS_BLUE_MEDIUM + '33', accentColor: NUS_BLUE_DARK }} /* NUS Blue Medium with 20% opacity, dark NUS Blue thumb */
        />
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-20 rounded-lg border p-2 text-sm text-center"
          style={{ borderColor: NUS_BLUE_MEDIUM + '33', color: NUS_GRAY_TEXT }} /* NUS Blue Medium with 20% opacity */
          min={min}
          max={max}
          step={step}
        />
        {unit && <span className="text-sm" style={{ color: NUS_BLUE_DARK }}>{unit}</span>}
      </div>
    </div>
  );
}

// New Component: SimulationInsights
function SimulationInsights({ results, initialCapacity, daysSimulated }) {
  const insights = useMemo(() => {
    if (!results || results.length === 0) {
      return null;
    }

    const totalArrivals = results.reduce((sum, day) => sum + day.arrivals, 0);
    const totalServed = results.reduce((sum, day) => sum + day.served, 0);
    const totalDroppedOut = results.reduce((sum, day) => sum + day.droppedOut, 0);
    const totalWaitingSum = results.reduce((sum, day) => sum + day.waiting, 0);
    const averageDailyWaiting = (totalWaitingSum / results.length).toFixed(1);
    const peakWaitingQueue = Math.max(...results.map(day => day.waiting));

    // Capacity utilization: Average served clients per day vs initial capacity
    const averageServedPerDay = totalServed / results.length;
    const utilization = (averageServedPerDay / initialCapacity) * 100;
    const actualDropoutRate = totalArrivals > 0 ? (totalDroppedOut / totalArrivals) * 100 : 0;


    return {
      totalServed,
      totalDroppedOut,
      averageDailyWaiting,
      peakWaitingQueue,
      utilization: utilization.toFixed(1),
      actualDropoutRate: actualDropoutRate.toFixed(1),
      totalArrivals,
      daysSimulated: results.length // Ensure daysSimulated is based on actual results length
    };
  }, [results, initialCapacity]); // Recalculate if results or initialCapacity change

  if (!insights) {
    return null; // Or a loading/placeholder message
  }

  return (
    <section className="mb-6 p-4 rounded-lg shadow-md" style={{ backgroundColor: NUS_BLUE_LIGHT }}>
      <h2 className="text-lg font-semibold mb-3" style={{ color: NUS_BLUE_DARK }}>Key Simulation Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" style={{ color: NUS_GRAY_TEXT }}>
        <div className="p-3 rounded-lg border" style={{ borderColor: NUS_BLUE_MEDIUM + '66' }}>
          <p className="font-semibold" style={{ color: NUS_BLUE_DARK }}>Total Clients Served:</p>
          <p className="text-2xl font-bold" style={{ color: CHART_LINE_SERVED }}>{insights.totalServed}</p>
          <p className="text-xs mt-1">Over {insights.daysSimulated} days, this is your service's total output.</p>
        </div>
        <div className="p-3 rounded-lg border" style={{ borderColor: NUS_BLUE_MEDIUM + '66' }}>
          <p className="font-semibold" style={{ color: NUS_BLUE_DARK }}>Total Clients Dropped Out:</p>
          <p className="text-2xl font-bold" style={{ color: CHART_LINE_DROPOUT }}>{insights.totalDroppedOut}</p>
          <p className="text-xs mt-1">These clients left the queue before being served. High numbers indicate potential access barriers.</p>
        </div>
        <div className="p-3 rounded-lg border" style={{ borderColor: NUS_BLUE_MEDIUM + '66' }}>
          <p className="font-semibold" style={{ color: NUS_BLUE_DARK }}>Avg. Daily Waiting Queue:</p>
          <p className="text-2xl font-bold" style={{ color: CHART_LINE_WAITING }}>{insights.averageDailyWaiting}</p>
          <p className="text-xs mt-1">The average number of clients waiting at the end of each day. A consistently high average signals congestion.</p>
        </div>
        <div className="p-3 rounded-lg border" style={{ borderColor: NUS_BLUE_MEDIUM + '66' }}>
          <p className="font-semibold" style={{ color: NUS_BLUE_DARK }}>Peak Waiting Queue:</p>
          <p className="text-2xl font-bold" style={{ color: CHART_LINE_WAITING }}>{insights.peakWaitingQueue}</p>
          <p className="text-xs mt-1">The highest number of clients waiting on any single day. Helps identify extreme congestion points.</p>
        </div>
        <div className="p-3 rounded-lg border" style={{ borderColor: NUS_BLUE_MEDIUM + '66' }}>
          <p className="font-semibold" style={{ color: NUS_BLUE_DARK }}>Service Utilization:</p>
          <p className="text-2xl font-bold" style={{ color: NUS_BLUE_DARK }}>{insights.utilization}%</p>
          <p className="text-xs mt-1">Measures how busy your service was relative to its capacity. Higher values mean you're using resources efficiently, but too high could mean burnout or no buffer.</p>
        </div>
        <div className="p-3 rounded-lg border" style={{ borderColor: NUS_BLUE_MEDIUM + '66' }}>
          <p className="font-semibold" style={{ color: NUS_BLUE_DARK }}>Actual Dropout Rate:</p>
          <p className="text-2xl font-bold" style={{ color: CHART_LINE_DROPOUT }}>{insights.actualDropoutRate}%</p>
          <p className="text-xs mt-1">The real percentage of arriving clients who dropped out during the simulation, which might differ from your input due to simulation dynamics.</p>
        </div>
      </div>
    </section>
  );
}


export default function App() {
  const [clientsPerDay, setClientsPerDay] = useState(10);
  const [serviceTime, setServiceTime] = useState(30); // minutes
  const [capacity, setCapacity] = useState(5);
  const [dropoutRate, setDropoutRate] = useState(0.2); // 20%
  const [simulationDays, setSimulationDays] = useState(30); // New state for simulation days
  const [results, setResults] = useState([]);
  const [showInputs, setShowInputs] = useState(true);
  const [selectedChartTab, setSelectedChartTab] = useState('all');
  const [showMCSInfo, setShowMCSInfo] = useState(false); // State for MCS info visibility

  const handleRun = () => {
    const simResults = runSimulation({
      clientsPerDay,
      serviceTime,
      capacity,
      dropoutRate,
      days: simulationDays, // Pass simulationDays to runSimulation
    });
    setResults(simResults);
    setShowInputs(false); // Collapse inputs after running simulation
  };

  const explainer = () => {
    if (results.length === 0) return "Run the simulation to analyse client behavior.";
    const last = results[results.length - 1];
    return (
      <p style={{ color: NUS_GRAY_TEXT }}>
        On day <span className="font-bold" style={{ color: NUS_BLUE_DARK }}>{last.day}</span>,{" "}
        <span className="font-bold" style={{ color: CHART_LINE_ARRIVAL }}>{last.arrivals}</span> clients arrived.{" "}
        <span className="font-bold" style={{ color: CHART_LINE_SERVED }}>{last.served}</span> were served,{" "}
        <span className="font-bold" style={{ color: CHART_LINE_WAITING }}>{last.waiting}</span> were still waiting, and{" "}
        <span className="font-bold" style={{ color: CHART_LINE_DROPOUT }}>{last.droppedOut}</span> dropped out.
      </p>
    );
  };

  const chartTabs = [
    { key: 'all', label: 'All Metrics' },
    { key: 'arrivals', label: 'Arrivals' },
    { key: 'served', label: 'Served' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'droppedOut', label: 'Dropped Out' },
  ];

  return (
    <div className="min-h-screen p-4 font-sans" style={{ backgroundColor: NUS_BLUE_LIGHT }}>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight leading-tight" style={{ color: NUS_BLUE_DARK }}>
          Simulation Example<br /> 
        </h1>
        <p className="mt-2 text-sm max-w-sm mx-auto" style={{ color: NUS_BLUE_MEDIUM }}>
          Modelling client flow, wait times, and capacity challenges.
        </p>
      </header>

      <main className="max-w-md mx-auto bg-white shadow-xl rounded-3xl p-6 space-y-8">
        {/* MCS Logic Info */}
        <section className="relative">
          <div
            className="flex justify-between items-center cursor-pointer p-3 rounded-lg transition-colors"
            style={{ backgroundColor: NUS_BLUE_LIGHT, color: NUS_BLUE_DARK }}
            onClick={() => setShowMCSInfo(!showMCSInfo)}
          >
            <h2 className="text-lg font-semibold">What is it about?</h2>
            <motion.div
              initial={false}
              animate={{ rotate: showMCSInfo ? 90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ color: NUS_BLUE_DARK }}
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.div>
          </div>
          <AnimatePresence>
            {showMCSInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="mt-4 overflow-hidden text-sm p-3 rounded-lg border"
                style={{ backgroundColor: NUS_BLUE_LIGHT, color: NUS_GRAY_TEXT, borderColor: NUS_BLUE_MEDIUM + '99' }}
              >
                {/* START of updated succinct explanation for services */}
                <p className="mb-2">
                  Monte Carlo Simulation is a method to predict outcomes in unpredictable real-world situations. Instead of just one guess, it runs countless "what-if" scenarios by:
                </p>
                <ul className="list-disc list-inside mb-2 ml-2">
                  <li className="mb-1">
                    <strong>Varying Daily Arrivals:</strong> Client numbers fluctuate randomly.
                  </li>
                  <li className="mb-1">
                    <strong>Modelling Dropout Risk:</strong> Clients may leave if waiting too long.
                  </li>
                </ul>
                <p>
                  This reveals the full spectrum of likely results (e.g., served, waiting, dropped), allowing for more effective planning under uncertainty for services.
                </p>
                {/* END of updated explanation */}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Inputs */}
        <section className="relative">
          <div
            className="flex justify-between items-center cursor-pointer p-3 rounded-lg transition-colors"
            style={{ backgroundColor: NUS_BLUE_LIGHT, color: NUS_BLUE_DARK }}
            onClick={() => setShowInputs(!showInputs)}
          >
            <h2 className="text-lg font-semibold">Simulation Inputs</h2>
            <motion.div
              initial={false}
              animate={{ rotate: showInputs ? 90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ color: NUS_BLUE_DARK }}
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.div>
          </div>
          <AnimatePresence>
            {showInputs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="mt-4 overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-y-4">
                  <SliderInputField
                    label="Clients per Day"
                    value={clientsPerDay}
                    onChange={setClientsPerDay}
                    min={1}
                    max={500}
                  />
                  <SliderInputField
                    label="Service Time (min)"
                    value={serviceTime}
                    onChange={setServiceTime}
                    min={5}
                    max={120}
                    step={5}
                  />
                  <SliderInputField
                    label="Daily Capacity"
                    value={capacity}
                    onChange={setCapacity}
                    min={1}
                    max={100}
                  />
                  <SliderInputField
                    label="Dropout Rate (%)"
                    value={dropoutRate * 100}
                    onChange={(val) => setDropoutRate(val / 100)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                  />
                   <SliderInputField
                    label="Simulation Duration (Days)"
                    value={simulationDays}
                    onChange={setSimulationDays}
                    min={10}
                    max={365}
                    step={1}
                    unit="days"
                  />
                </div>
                <button
                  onClick={handleRun}
                  className="mt-6 w-full text-white font-bold py-3 px-4 rounded-xl shadow-lg transform transition-transform duration-200 active:scale-95"
                  style={{ backgroundColor: NUS_BLUE_DARK }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = NUS_BLUE_MEDIUM}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = NUS_BLUE_DARK}
                >
                  Run Simulation
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Dynamic Explainer */}
        <section className="text-sm border-l-4 p-4 rounded-lg shadow-sm" style={{ color: NUS_GRAY_TEXT, backgroundColor: NUS_BLUE_LIGHT, borderColor: NUS_BLUE_MEDIUM }}>
          {explainer()}
        </section>

        {/* Chart */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: NUS_BLUE_DARK }}>Simulation Results</h2>
          {results.length > 0 ? (
            <>
              {/* Chart Tabs */}
              <div className="flex justify-around rounded-xl p-1 mb-4" style={{ backgroundColor: NUS_BLUE_LIGHT }}>
                {chartTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedChartTab(tab.key)}
                    className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: selectedChartTab === tab.key ? NUS_BLUE_DARK : 'transparent',
                      color: selectedChartTab === tab.key ? 'white' : NUS_BLUE_DARK,
                      boxShadow: selectedChartTab === tab.key ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
                    }}
                    onMouseEnter={e => { if (selectedChartTab !== tab.key) e.currentTarget.style.backgroundColor = NUS_BLUE_MEDIUM + '33'; }}
                    onMouseLeave={e => { if (selectedChartTab !== tab.key) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="w-full h-64 bg-white rounded-lg shadow-md p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={results}
                    // Adjusted margins for better axis label visibility
                    margin={{ top: 40, right: 10, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: NUS_GRAY_TEXT }}
                      axisLine={false}
                      tickLine={false}
                    >
                      <Label
                        value="Day"
                        offset={0} // Adjusted offset to give more space from ticks
                        position="insideBottom"
                        style={{ fontSize: 13, fill: NUS_GRAY_TEXT }}
                      />
                    </XAxis>
                    <YAxis
                      tick={{ fontSize: 11, fill: NUS_GRAY_TEXT }}
                      axisLine={false}
                      tickLine={false}
                    >
                      <Label
                        value="Number of Clients"
                        angle={-90}
                        position="insideLeft"
                        style={{ textAnchor: 'middle', fontSize: 13, fill: NUS_GRAY_TEXT }}
                      />
                    </YAxis>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        borderColor: '#e5e7eb',
                        fontSize: '13px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      }}
                      labelStyle={{ color: NUS_GRAY_TEXT, fontWeight: 'bold' }}
                    />
                    <Legend
                      iconType="circle"
                      verticalAlign="top" // Position legend at the top
                      align="center"     // Center align horizontally
                      wrapperStyle={{
                        paddingBottom: '10px', // Space between legend and chart
                        color: NUS_GRAY_TEXT,
                        fontSize: '12px'     // Slightly smaller font for mobile readability
                      }}
                    />

                    {(selectedChartTab === 'all' || selectedChartTab === 'arrivals') && (
                      <Line
                        type="monotone"
                        dataKey="arrivals"
                        stroke={CHART_LINE_ARRIVAL} // NUS Blue Dark
                        strokeWidth={2}
                        name="Arrivals"
                        dot={false}
                      />
                    )}
                    {(selectedChartTab === 'all' || selectedChartTab === 'served') && (
                      <Line
                        type="monotone"
                        dataKey="served"
                        stroke={CHART_LINE_SERVED}
                        strokeWidth={2}
                        name="Served"
                        dot={false}
                      />
                    )}
                    {(selectedChartTab === 'all' || selectedChartTab === 'waiting') && (
                      <Line
                        type="monotone"
                        dataKey="waiting"
                        stroke={CHART_LINE_WAITING}
                        strokeWidth={2}
                        name="Waiting"
                        dot={false}
                      />
                    )}
                    {(selectedChartTab === 'all' || selectedChartTab === 'droppedOut') && (
                      <Line
                        type="monotone"
                        dataKey="droppedOut"
                        stroke={CHART_LINE_DROPOUT}
                        strokeWidth={2}
                        name="Dropped Out"
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="text-center mt-4 p-4 rounded-lg" style={{ color: NUS_GRAY_TEXT, backgroundColor: NUS_BLUE_LIGHT }}>
              Run a simulation to see results appear here!
            </p>
          )}
        </section>

        {/* New: Simulation Insights (Moved to the end) */}
        {results.length > 0 && (
          <SimulationInsights results={results} initialCapacity={capacity} daysSimulated={simulationDays} />
        )}
      </main>
    </div>
  );
}

// runSimulation function - remains unchanged
function runSimulation({ clientsPerDay, serviceTime, capacity, dropoutRate, days = 30 }) {
  let queue = [];
  let results = [];
  let idCounter = 1;

  for (let day = 1; day <= days; day++) {
    const variation = 0.2;
    const arrivals = Math.round(clientsPerDay * (1 + (Math.random() * 2 - 1) * variation));

    for (let i = 0; i < arrivals; i++) {
      queue.push({ id: idCounter++, arrivalDay: day });
    }

    const servedToday = Math.min(queue.length, capacity);
    const servedClients = queue.splice(0, servedToday);

    let remainingQueue = [];
    let droppedOutToday = 0;

    for (const client of queue) {
      if (Math.random() < dropoutRate) {
        droppedOutToday++;
      } else {
        remainingQueue.push(client);
      }
    }
    queue = remainingQueue;

    results.push({
      day,
      arrivals,
      served: servedClients.length,
      waiting: queue.length,
      droppedOut: droppedOutToday,
    });
  }

  return results;
}




