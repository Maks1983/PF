import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useSettingsContext } from '../SettingsProvider';
import { Loan } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface DebtOverviewChartProps {
  loans: Loan[];
}

const COLORS = ['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export const DebtOverviewChart: React.FC<DebtOverviewChartProps> = ({ loans }) => {
  const { settings } = useSettingsContext();
  
  const data = loans.map((loan, index) => ({
    name: loan.name,
    value: loan.currentBalance,
    color: loan.color || COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-blue-600">{formatCurrency(data.value, loans.find(l => l.name === data.name)?.currency || settings.defaultCurrency)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};