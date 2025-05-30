// ScenarioChart.jsx

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine, // Make sure to import this if you're using it
  ReferenceArea, // Make sure to import this if you're using it
} from 'recharts';

// ====================================================================
// THIS IS THE CRUCIAL PART:
// Place the getPercentiles function HERE, outside of any React component.
// It should be after your imports and before your default export.
// ====================================================================
function getPercentiles(data) {
  if (!data || data.length === 0) return [];

  const numericWaitTimes = data
    .map(d => parseFloat(d.waitTime))
    .filter(val => typeof val === 'number' && isFinite(val));

  if (numericWaitTimes.length === 0) return [];

  const sorted = [...numericWaitTimes].sort((a, b) => a - b);
  const percentiles = [0, 10, 25, 50, 75, 90, 95, 99, 100];

  return percentiles.map(p => {
    const index = Math.min(
      Math.max(0, Math.floor((p / 100) * sorted.length) - (p === 100 ? 1 : 0)),
      sorted.length - 1
    );
    return { percentile: p, waitTime: sorted[index] };
  });
}

// ====================================================================
// Your React Component starts HERE
// ====================================================================
export default function ScenarioChart({ data }) {
  // Now, getPercentiles is defined and accessible here
  const percentileData = getPercentiles(data);

  // Define your bottleneck thresholds (adjust as needed for your chosen visualization)
  const bottleneckThreshold = 10; // For ReferenceLine
  const bottleneckPercentileStart = 90; // For ReferenceArea
  const bottleneckPercentileEnd = 100; // For ReferenceArea

  // Calculate maxWaitTime for ReferenceArea if needed
  const maxWaitTime = percentileData.length > 0
    ? Math.max(...percentileData.map(d => d.waitTime))
    : 0;

  const criticalWaitTime = 10; // For custom dots

  return (
    <ResponsiveContainer width="100%" height={280} aria-label="Wait Time Percentile Chart">
      <LineChart
        data={percentileData}
        margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="percentile"
          type="number"
          domain={[0, 100]}
          ticks={[0, 10, 25, 50, 75, 90, 95, 100]}
          label={{
            value: 'Wait Time Percentile',
            position: 'insideBottom',
            offset: -30,
            fontSize: 13,
            fill: '#555',
          }}
          tickFormatter={tick => `${tick}%`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          label={{
            value: 'Wait Time (minutes)',
            angle: -90,
            position: 'left',
            offset: -10,
            fontSize: 13,
            fill: '#555',
          }}
          domain={[0, (dataMax) => Math.max(10, dataMax + (dataMax * 0.15 || 5))]}
          tickFormatter={tick => tick.toFixed(0)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={val => `${parseFloat(val).toFixed(1)} min`}
          labelFormatter={label => `Percentile: ${label}%`}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
          labelStyle={{ color: '#333', fontWeight: 'bold' }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          wrapperStyle={{ paddingTop: 0, paddingBottom: 10 }}
        />
        <Line
          type="monotone"
          dataKey="waitTime"
          stroke="#4f46e5"
          strokeWidth={3}
          // Choose one of these options for dot rendering or keep your original
          dot={{ r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} // Default dot style
          // OR custom dot logic:
          // dot={({ cx, cy, stroke, key, payload }) => {
          //   if (payload.waitTime > criticalWaitTime) {
          //     return (
          //       <circle
          //         key={`dot-${key}`}
          //         cx={cx}
          //         cy={cy}
          //         r={6}
          //         fill="red"
          //         stroke="#fff"
          //         strokeWidth={2}
          //       />
          //     );
          //   }
          //   return (
          //     <circle
          //       key={`dot-${key}`}
          //       cx={cx}
          //       cy={cy}
          //       r={4}
          //       fill={stroke}
          //       stroke="#fff"
          //       strokeWidth={2}
          //     />
          //   );
          // }}
          activeDot={{ r: 6, stroke: '#4f46e5', strokeWidth: 2, fill: '#fff' }}
          name="Wait Time"
        />

        {/* Uncomment the bottleneck visualization you want to use */}
        {/* Example: ReferenceLine */}
        {/* <ReferenceLine
          y={bottleneckThreshold}
          stroke="red"
          strokeDasharray="3 3"
          label={{
            value: `Bottleneck: >${bottleneckThreshold} min`,
            position: 'insideTopRight',
            fill: 'red',
            fontSize: 12,
          }}
        /> */}

        {/* Example: ReferenceArea */}
        {/* <ReferenceArea
          x1={bottleneckPercentileStart}
          x2={bottleneckPercentileEnd}
          y1={0}
          y2={maxWaitTime > 0 ? maxWaitTime * 1.15 : 10} // Ensure y2 has a reasonable value even if maxWaitTime is 0
          stroke="none"
          fill="red"
          fillOpacity={0.1}
          label={{
            value: 'Potential Bottleneck Zone',
            position: 'top',
            fill: 'red',
            fontSize: 12,
          }}
        /> */}

      </LineChart>
    </ResponsiveContainer>
  );
}


