import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { RankHistoryItem } from '../types';

interface RankChartProps {
  history: RankHistoryItem[];
}

const RankChart: React.FC<RankChartProps> = ({ history }) => {
  // Format data for chart. Reversing rank because lower number is better in SEO.
  const data = history.map(h => ({
    ...h,
    displayRank: h.rank === 0 ? null : h.rank, // Null creates a gap in the line
    originalRank: h.rank
  }));

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm italic">
        Chưa có dữ liệu lịch sử
      </div>
    );
  }

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickFormatter={(value) => value.split('T')[0].slice(5)} // Show MM-DD
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            reversed={true} // Rank 1 is at the top
            domain={[1, 'auto']} 
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ color: '#38bdf8' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [value === 0 ? 'N/A' : `#${value}`, 'Thứ hạng']}
            labelFormatter={(label) => `Ngày: ${label.split('T')[0]}`}
          />
          <Line 
            type="monotone" 
            dataKey="displayRank" 
            stroke="#38bdf8" 
            strokeWidth={2} 
            dot={{ r: 3, fill: '#38bdf8' }}
            activeDot={{ r: 5 }}
            connectNulls={true} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RankChart;