import React, { useState, useEffect } from 'react';

interface ChartData {
  name: string;
  매출: number;
  방문자: number;
}

interface ChartComponentProps {
  data: ChartData[];
}

const ChartComponent: React.FC<ChartComponentProps> = ({ data }) => {
  const [ChartModule, setChartModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChart = async () => {
      try {
        const module = await import('recharts');
        setChartModule(module);
      } catch (error) {
        console.error('Failed to load chart module:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChart();
  }, []);

  if (loading || !ChartModule) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 매출 추이</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = ChartModule;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 매출 추이</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="매출"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6' }}
          />
          <Line
            type="monotone"
            dataKey="방문자"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartComponent;
