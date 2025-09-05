import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSettingsContext } from '../SettingsProvider';
import { Loan } from '../../types';
import { generateAmortizationSchedule, formatCurrency } from '../../utils/calculations';
import { format } from 'date-fns';

interface DebtProgressChartProps {
  loans: Loan[];
}

export const DebtProgressChart: React.FC<DebtProgressChartProps> = ({ loans }) => {
  const { settings } = useSettingsContext();
  
  // Generate combined schedule for all loans
  const maxMonths = Math.max(...loans.map(loan => {
    const schedule = generateAmortizationSchedule(loan);
    return schedule.length;
  }));

  const combinedData: any[] = [];

  for (let month = 1; month <= maxMonths; month++) {
    let totalBalance = 0;
    let totalCumulativeInterest = 0;

    loans.forEach(loan => {
      const schedule = generateAmortizationSchedule(loan);
      if (schedule[month - 1]) {
        totalBalance += schedule[month - 1].remainingBalance;
        totalCumulativeInterest += schedule[month - 1].cumulativeInterest;
      }
    });

    if (totalBalance > 0) {
      combinedData.push({
        month,
        date: format(new Date(2024, month - 1), 'MMM yyyy'),
        totalBalance,
        totalCumulativeInterest
      });
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name === 'totalBalance' ? 'Remaining Balance' : 'Total Interest Paid'}: {formatCurrency(entry.value, settings.defaultCurrency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Debt Progress Over Time</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => formatCurrency(value, settings.defaultCurrency)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalBalance"
              stroke="#1e40af"
              strokeWidth={2}
              name="Remaining Balance"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="totalCumulativeInterest"
              stroke="#dc2626"
              strokeWidth={2}
              name="Total Interest Paid"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};