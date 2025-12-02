import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { INDIAN_RUPEE, PIE_CHART_COLORS } from '../constants';

interface BreakdownData {
  name: string;
  value: number;
  color?: string;
}

interface BreakdownPieChartProps {
  title: string;
  data: BreakdownData[];
}

const BreakdownPieChart: React.FC<BreakdownPieChartProps> = ({ title, data }) => {
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
  }));

  const totalValue = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="bg-panel border border-white/5 p-4 md:p-6 flex flex-col relative h-[300px] md:h-[350px] min-h-[300px] rounded-3xl">
      <h3 className="text-xs font-bold text-gray-200 mb-1 uppercase tracking-wider border-l-4 border-mint pl-3">
        {title}
      </h3>
       <p className="text-[10px] text-gray-500 mb-2 pl-4 font-bold uppercase tracking-widest">{INDIAN_RUPEE.format(totalValue)}</p>

      {totalValue > 0 ? (
        // Fix: Explicit height wrapper
        <div className="w-full h-[220px] md:h-[270px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={2}
                    stroke="none"
                >
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                      backgroundColor: '#131635',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '1rem',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      fontFamily: 'Urbanist'
                    }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [
                    `${INDIAN_RUPEE.format(value)} (${((value / totalValue) * 100).toFixed(1)}%)`,
                    name
                    ]}
                />
                </PieChart>
            </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
            No data available.
        </div>
      )}
    </div>
  );
};

export default BreakdownPieChart;