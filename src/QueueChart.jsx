// QueueChart.jsx
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export default function QueueChart({ data, staffCount }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-10">No detailed daily data for this scenario.</div>;
  }

  // Determine appropriate Y-axis domain to fit both queue and staff counts
  const maxQueue = Math.max(...data.map(d => d.queueLength)) || 0;
  const maxBusyStaff = Math.max(...data.map(d => d.busyStaff)) || 0;
  const yAxisDomainUpper = Math.max(maxQueue * 1.2, maxBusyStaff * 1.2, staffCount * 1.2, 5); // Ensure enough space and always show at least 5

  return (
    <ResponsiveContainer width="100%" height={280} aria-label="Queue Length and Staff Utilization Chart">
      <AreaChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="time"
          label={{ value: 'Time (minutes from 9 AM)', position: 'insideBottom', offset: -30, fontSize: 13, fill: '#555' }}
          tickFormatter={time => `${time} min`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          label={{ value: 'Count (Clients/Staff)', angle: -90, position: 'left', offset: -10, fontSize: 13, fill: '#555' }}
          domain={[0, yAxisDomainUpper]}
          tickFormatter={tick => tick.toFixed(0)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, name) => `${name}: ${value.toFixed(1)}`}
          labelFormatter={(label) => `Time: ${label} min`}
          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc', borderRadius: '4px' }}
          labelStyle={{ color: '#333', fontWeight: 'bold' }}
        />
        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingTop: 0, paddingBottom: 10 }} />

        {/* Total Staff Available (as a reference line) */}
        <ReferenceLine
          y={staffCount}
          stroke="#8884d8"
          strokeDasharray="3 3"
          label={{ value: 'Total Staff', position: 'insideTopLeft', fill: '#8884d8', fontSize: 12 }}
        />

        {/* Area for Busy Staff */}
        <Area
          type="monotone"
          dataKey="busyStaff"
          stroke="#8884d8"
          fill="#8884d8"
          fillOpacity={0.6}
          name="Busy Staff"
        />
        {/* Area for Queue Length */}
        <Area
          type="monotone"
          dataKey="queueLength"
          stroke="#ff7300" // Orange for queue
          fill="#ff7300"
          fillOpacity={0.4}
          name="Clients in Queue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}