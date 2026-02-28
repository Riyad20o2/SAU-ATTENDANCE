import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { StudentAttendance } from '../types';

interface AttendanceChartProps {
  data: StudentAttendance[];
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data }) => {
  // Only show the current active session count, removing fake historical data
  const chartData = [
    { name: 'Current Session', count: data.length },
  ];

  return (
    <div className="w-full h-64 bg-[#163050]/50 p-4 rounded-xl border border-white/10">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Attendance Trends</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            hide 
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ 
                backgroundColor: '#0f2846', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                color: '#fff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={60}>
            <Cell fill="#f97316" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceChart;