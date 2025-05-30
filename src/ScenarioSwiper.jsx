import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import ScenarioChart from './ScenarioChart'; // Your existing chart component
import QueueChart from './QueueChart'; // Import the new QueueChart component

// --- Monte Carlo simulation helpers ---

// Generate Poisson arrivals (minutes from 9am to 6pm)
function generateArrivals(lambdaPerHour = 15) {
  const arrivals = [];
  let time = 0;
  const workdayMinutes = 9 * 60; // 9 hours * 60 minutes/hour

  while (time < workdayMinutes) {
    const u = Math.random();
    // Inter-arrival time for Poisson process is exponentially distributed
    const interArrival = -Math.log(1 - u) * (60 / lambdaPerHour); // Convert lambda per hour to average time between arrivals in minutes
    time += interArrival;
    if (time < workdayMinutes) arrivals.push(time);
  }
  return arrivals;
}

// *** REVISED simulateDay function for better queue tracking ***
function simulateDay(staffCount = 3, dropoutThreshold = 30, lambdaPerHour = 15, meanServiceTime = 60) {
    const arrivals = generateArrivals(lambdaPerHour);
    const clientResults = []; // Individual client outcomes

    const workdayMinutes = 9 * 60; // Total simulation duration (9 hours)
    const samplingInterval = 10; // Record state every 10 minutes for queue chart

    // System state variables
    let staffAvailableTimes = Array(staffCount).fill(0); // Time each staff member becomes free
    let clientsInQueue = []; // Array of client arrival times currently in queue
    let currentBusyStaffCount = 0;

    // Event queue: { time, type: 'arrival' | 'serviceEnd', clientId (optional), staffIndex (for serviceEnd) }
    const eventQueue = [];
    arrivals.forEach((arrivalTime, index) => {
        eventQueue.push({ time: arrivalTime, type: 'arrival', clientID: index });
    });

    // To process events chronologically, sort the event queue
    eventQueue.sort((a, b) => a.time - b.time);

    // Data for the QueueChart (time-series)
    const timeSeriesStates = [];

    // Record initial state at time 0
    timeSeriesStates.push({ time: 0, queueLength: 0, busyStaff: 0 });

    let lastEventTime = 0; // To track time since last state change

    // Process events
    while (eventQueue.length > 0) {
        const event = eventQueue.shift(); // Get next chronological event
        const currentTime = event.time;

        // Ensure we don't process events beyond workday
        if (currentTime > workdayMinutes && event.type === 'arrival') {
            continue; // Ignore arrivals after workday ends
        }

        // Add a state point for the time *just before* the current event, if it's different from lastEventTime
        // This helps capture the state *before* the current event changes things
        if (currentTime > lastEventTime) {
            timeSeriesStates.push({
                time: currentTime - 0.001, // A tiny bit before current event
                queueLength: clientsInQueue.length,
                busyStaff: currentBusyStaffCount
            });
        }


        // --- Update staff availability (process service completions that occurred *by* this time) ---
        for (let s = 0; s < staffCount; s++) {
            if (staffAvailableTimes[s] <= currentTime && currentBusyStaffCount > 0) {
                // If this staff member was busy and is now free, decrement busy count
                // We ensure staff is only decremented if they were marked busy
                // (This check needs to be careful not to double decrement for initial idle staff)
                let wasBusy = false;
                for(let i=0; i<timeSeriesStates.length; i++) {
                  if (timeSeriesStates[i].time < currentTime && timeSeriesStates[i].busyStaff > timeSeriesStates[i-1]?.busyStaff) {
                    wasBusy = true; // Simplified check if staff was busy before
                  }
                }
                if (wasBusy) { // More robust logic would track individual staff status
                  // For simplicity, let's assume staff getting free implies they were busy.
                  // The crucial part is to only decrement if they were actually working, not initially idle.
                  // A direct track of individual staff status (busy/idle) is best.
                }
            }
        }

        // Re-evaluate busy staff based on who is occupied until when
        currentBusyStaffCount = staffAvailableTimes.filter(t => t > currentTime).length;

        // --- Process the current event ---
        if (event.type === 'arrival') {
            let clientArrivedTime = event.time;
            let assignedStaffIndex = -1;

            // Try to find an idle staff member
            for (let s = 0; s < staffCount; s++) {
                if (staffAvailableTimes[s] <= clientArrivedTime) { // Staff is available now
                    assignedStaffIndex = s;
                    break;
                }
            }

            if (assignedStaffIndex !== -1) {
                // Client starts service immediately
                const startTime = clientArrivedTime;
                const waitTime = 0;

                const serviceTime = -Math.log(1 - Math.random()) * meanServiceTime;
                const serviceEndTime = startTime + serviceTime;

                staffAvailableTimes[assignedStaffIndex] = serviceEndTime; // Staff busy until this time

                clientResults.push({ arrivalTime: clientArrivedTime, waitTime, serviceTime, dropout: false, serviceEndTime });

                // Schedule service end event
                eventQueue.push({ time: serviceEndTime, type: 'serviceEnd', clientID: event.clientID, staffIndex: assignedStaffIndex });
                eventQueue.sort((a, b) => a.time - b.time); // Re-sort after adding new event

            } else {
                // No staff available, client enters queue
                clientsInQueue.push(clientArrivedTime); // Add arrival time to queue

                // Check for dropout based on current queue length and expected service time
                const potentialWaitTime = clientsInQueue.length * meanServiceTime / staffCount; // A rough estimate
                if (potentialWaitTime > dropoutThreshold) {
                    clientResults.push({ arrivalTime: clientArrivedTime, waitTime: potentialWaitTime, dropout: true });
                    clientsInQueue.pop(); // Remove from queue, as they dropped out
                }
            }
        } else if (event.type === 'serviceEnd') {
            // A staff member has just become free (at event.time)
            // If there are clients in the queue, assign the first one to this now-free staff
            if (clientsInQueue.length > 0) {
                const nextClientArrivalInQueue = clientsInQueue.shift(); // Remove from queue
                const startTime = event.time; // Starts service immediately after staff frees up
                const waitTime = startTime - nextClientArrivalInQueue;

                const serviceTime = -Math.log(1 - Math.random()) * meanServiceTime;
                const serviceEndTime = startTime + serviceTime;

                staffAvailableTimes[event.staffIndex] = serviceEndTime; // Staff busy again

                clientResults.push({ arrivalTime: nextClientArrivalInQueue, waitTime, serviceTime, dropout: false, serviceEndTime });

                // Schedule new service end event for this client
                eventQueue.push({ time: serviceEndTime, type: 'serviceEnd', clientID: event.clientID, staffIndex: event.staffIndex });
                eventQueue.sort((a, b) => a.time - b.time); // Re-sort
            }
        }

        // Recalculate busy staff after processing event
        currentBusyStaffCount = staffAvailableTimes.filter(t => t > currentTime).length;

        // Record the state AFTER the event and all its immediate consequences
        timeSeriesStates.push({
            time: currentTime,
            queueLength: Math.max(0, clientsInQueue.length), // Ensure non-negative
            busyStaff: Math.max(0, currentBusyStaffCount)   // Ensure non-negative
        });

        lastEventTime = currentTime;
    }

    // After all events, add a final state for the end of the workday if needed
    if (timeSeriesStates[timeSeriesStates.length - 1].time < workdayMinutes) {
        timeSeriesStates.push({
            time: workdayMinutes,
            queueLength: 0, // Assume queue clears by end of day for visualization
            busyStaff: 0    // Assume staff finish by end of day
        });
    }

    // --- Post-simulation sampling for smoother chart data ---
    // Sort all gathered states for proper sampling
    timeSeriesStates.sort((a,b) => a.time - b.time);

    const sampledTimeSeries = [];
    let currentSampledQueue = 0;
    let currentSampledBusy = 0;
    let stateIndex = 0;

    for (let t = 0; t <= workdayMinutes; t += samplingInterval) {
        // Find the most recent state recorded before or at time 't'
        while (stateIndex < timeSeriesStates.length - 1 && timeSeriesStates[stateIndex + 1].time <= t) {
            stateIndex++;
        }
        currentSampledQueue = timeSeriesStates[stateIndex]?.queueLength || 0;
        currentSampledBusy = timeSeriesStates[stateIndex]?.busyStaff || 0;

        sampledTimeSeries.push({
            time: t,
            queueLength: currentSampledQueue,
            busyStaff: currentSampledBusy
        });
    }

    // Sort clientResults by arrival time for runMonteCarlo
    clientResults.sort((a, b) => a.arrivalTime - b.arrivalTime);

    return { clientResults, timeSeriesData: sampledTimeSeries };
}

// *** REVISED runMonteCarlo function to correctly average time series ***
function runMonteCarlo(runs = 1000, staffCount = 3, lambdaPerHour = 15, meanServiceTime = 60) {
  let allClientResults = [];
  const aggregatedTimeSeriesSums = new Map(); // Map: time -> { queueSum, busySum, count }

  // Initialize aggregatedTimeSeriesSums with all possible time points to ensure consistency
  const workdayMinutes = 9 * 60;
  const samplingInterval = 10;
  for (let t = 0; t <= workdayMinutes; t += samplingInterval) {
      aggregatedTimeSeriesSums.set(t, { queueSum: 0, busySum: 0, count: 0 });
  }

  for (let i = 0; i < runs; i++) {
    const { clientResults, timeSeriesData } = simulateDay(staffCount, 30, lambdaPerHour, meanServiceTime);
    allClientResults = allClientResults.concat(clientResults);

    timeSeriesData.forEach(point => {
        const timeKey = point.time;
        // Only update if the timeKey exists in our pre-initialized map (should always for sampled data)
        if (aggregatedTimeSeriesSums.has(timeKey)) {
            const current = aggregatedTimeSeriesSums.get(timeKey);
            current.queueSum += point.queueLength;
            current.busySum += point.busyStaff;
            current.count++;
        }
    });
  }

  // Convert aggregated data to averages
  const avgQueueAndUtilizationData = Array.from(aggregatedTimeSeriesSums.entries())
    .map(([time, sums]) => ({
      time: time,
      // Only divide by count if runs actually contributed to that time point.
      // With pre-initialized points and consistent sampling, count should usually be 'runs'.
      queueLength: sums.count > 0 ? sums.queueSum / sums.count : 0,
      busyStaff: sums.count > 0 ? sums.busySum / sums.count : 0
    }))
    .sort((a, b) => a.time - b.time); // Ensure sorted by time for charting


  const served = allClientResults.filter(r => !r.dropout);
  const dropouts = allClientResults.filter(r => r.dropout);

  const avgWait = served.length > 0 ? served.reduce((sum, r) => sum + r.waitTime, 0) / served.length : 0;
  const sortedWaits = served.length > 0 ? served.map(r => r.waitTime).sort((a, b) => a - b) : [];

  const medianWait = sortedWaits.length > 0 ? sortedWaits[Math.floor(sortedWaits.length / 2)] : 0;
  const p95Wait = sortedWaits.length > 0 ? sortedWaits[Math.floor(sortedWaits.length * 0.95)] : 0;
  const variance = served.length > 0 ? served.reduce((sum, r) => sum + (r.waitTime - avgWait) ** 2, 0) / served.length : 0;

  const dropoutRate = allClientResults.length > 0 ? (dropouts.length / allClientResults.length) * 100 : 0;
  const throughput = served.length;

  // Chart data focuses only on served clients' wait times for visualization
  const chartData = served.map((r, i) => ({ waitTime: r.waitTime }));

  return {
    chartData, // For percentile chart
    queueAndUtilizationData: avgQueueAndUtilizationData, // For new queue chart
    avgWait: avgWait.toFixed(1),
    medianWait: medianWait.toFixed(1), // Corrected typo here
    p95Wait: p95Wait.toFixed(1),
    variance: variance.toFixed(1),
    dropoutCount: dropouts.length,
    dropoutRate: dropoutRate.toFixed(1),
    throughput,
    totalClients: allClientResults.length,
    lambdaPerHour,
    staffCount,
    meanServiceTime
  };
}

// --- UI Helpers (keep as is) ---
function getInsight(stats, baselineStats) {
  const currentAvgWait = parseFloat(stats.avgWait);
  const currentDropoutRate = parseFloat(stats.dropoutRate);
  const baselineAvgWait = baselineStats ? parseFloat(baselineStats.avgWait) : null;

  if (currentAvgWait > 60)
    return 'Clients are waiting excessively long; capacity is likely insufficient.';
  if (currentDropoutRate > 25)
    return 'Dropout rate is high; wait time may be impacting retention.';
  if (baselineAvgWait !== null && currentAvgWait < baselineAvgWait)
    return 'Improved average wait time compared to baseline.';
  return 'System performance is balanced under current settings.';
}

function statDelta(current, baseline) {
  const currentVal = parseFloat(current);
  const baselineVal = parseFloat(baseline);

  if (isNaN(currentVal) || isNaN(baselineVal)) return <span>N/A</span>;

  const delta = currentVal - baselineVal;
  if (delta < 0) return <span className="text-green-600">↓{Math.abs(delta).toFixed(1)}</span>;
  if (delta > 0) return <span className="text-red-600">↑{delta.toFixed(1)}</span>;
  return <span>–</span>;
}

// --- Define 6 scenarios with simulation ---
const scenarios = [
  {
    name: 'Baseline',
    ...runMonteCarlo(1000, 10, 15, 60),
  },
  {
    name: 'Increased Staff',
    ...runMonteCarlo(1000, 20, 15, 60),
  },
  {
    name: 'Reduced Intake',
    ...runMonteCarlo(1000, 10, 10, 60),
  },
  {
    name: 'High Demand',
    ...runMonteCarlo(1000, 10, 25, 60),
  },
  {
    name: 'Understaffed Shift',
    ...runMonteCarlo(10000, 5, 15, 60),
  },
  {
    name: 'Faster Counselling',
    ...runMonteCarlo(10000, 10, 15, 45),
  },
];

// --- Simulation Description ---
const simulationDescription = [
  "This tool is a Discrete Event Simulation, using Monte Carlo methods to model the flow and experience within a mental health service.",
  "It simulates client intake stochastically; new client requests for appointments arrive randomly, following a Poisson process.",
  "Session durations are also random, reflecting the natural variability in client needs and therapeutic processes, sampled from an exponential distribution.",
  "The simulation dynamically tracks crucial operational aspects: the number of clients awaiting care (waitlist length), clinician utilisation, and the time each client spends waiting for their initial appointment or next session.",
  "Crucially, it models client disengagement: if the waiting time for support becomes too long, clients may opt to disengage from the service.",
  "Aggregated results provide key insights into possible service delivery: average and critical wait times (e.g., 95th percentile), clinician workload, overall client throughput, and patterns of service accessibility throughout the day."
];

// --- Main component ---

export default function ScenarioSwiper() {
  const baselineStats = scenarios[0];
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [activeTab, setActiveTab] = useState('percentile'); // State for active tab within each slide

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6 relative overflow-hidden">
      {/* Main content area (Swiper) */}
      <div className="w-full max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">DES x Monte Carlo</h1>

        {/* Swiper Component for Scenarios */}
        <Swiper
          spaceBetween={24}
          slidesPerView={1}
          pagination={{ clickable: true }}
          modules={[Pagination]}
          className="rounded-lg pb-10"
          onSlideChange={() => setActiveTab('percentile')} // Reset tab to percentile when slide changes
        >
          {scenarios.map((scenario, index) => {
            const stats = scenario;
            const insight = getInsight(stats, baselineStats);

            return (
              <SwiperSlide key={index}>
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-300">
                  <h2 className="text-2xl font-semibold mb-6 text-indigo-700 text-center">{scenario.name}</h2>

                  {/* Tabs Navigation */}
                  <div className="flex justify-center mb-6 border-b border-gray-200">
                    <button
                      className={`py-2 px-4 text-sm font-medium ${
                        activeTab === 'percentile'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('percentile')}
                    >
                      Wait Time Percentiles
                    </button>
                    <button
                      className={`py-2 px-4 text-sm font-medium ${
                        activeTab === 'queue'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-500 hover:text-gray-700'
                      } ml-4`}
                      onClick={() => setActiveTab('queue')}
                    >
                      Daily Operations
                    </button>
                  </div>

                  {/* Chart Content based on activeTab */}
                  <div className="chart-container">
                    {activeTab === 'percentile' && (
                      <ScenarioChart data={stats.chartData} />
                    )}
                    {activeTab === 'queue' && (
                      <QueueChart data={stats.queueAndUtilizationData} staffCount={stats.staffCount} />
                    )}
                  </div>

                  {/* Stats and Insights */}
                  <div className="mt-8 space-y-4 text-gray-800 text-sm leading-relaxed">
                    <div className="flex justify-between font-medium">
                      <span>Staff Count:</span>
                      <span>{stats.staffCount}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Arrivals per Hour:</span>
                      <span>{stats.lambdaPerHour}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Avg Service Time:</span>
                      <span>{stats.meanServiceTime} min</span>
                    </div>
                    <hr className="my-2 border-gray-200" />
                    <div className="flex justify-between font-medium">
                      <span>Average wait time:</span>
                      <span>
                        {stats.avgWait} min{' '}
                        {index !== 0 && statDelta(stats.avgWait, baselineStats.avgWait)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Median wait time:</span>
                      <span>{stats.medianWait} min</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>95th percentile wait:</span>
                      <span>{stats.p95Wait} min</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Variance:</span>
                      <span>{stats.variance}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Dropout count:</span>
                      <span>{stats.dropoutCount}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Dropout rate:</span>
                      <span>
                        {stats.dropoutRate}%{' '}
                        {index !== 0 && statDelta(stats.dropoutRate, baselineStats.dropoutRate)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Throughput:</span>
                      <span>{stats.throughput}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total clients:</span>
                      <span>{stats.totalClients}</span>
                    </div>
                  </div>

                  <p className="mt-6 text-gray-600 italic text-sm text-center">{insight}</p>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      {/* Toggle Button for the About This Simulation Panel */}
      <button
        onClick={() => setShowAssumptions(!showAssumptions)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-300"
        aria-label={showAssumptions ? "Close simulation details" : "Open simulation details"}
      >
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${
            showAssumptions ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
      </button>

      {/* Right Collapsible About This Simulation Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 p-6 overflow-y-auto ${
          showAssumptions ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">About This Simulation</h3>
          <button
            onClick={() => setShowAssumptions(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Close panel"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <ul className="list-disc pl-5 text-gray-700 space-y-2 text-sm">
          {simulationDescription.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}







