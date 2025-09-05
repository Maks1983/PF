import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSettingsContext } from '../SettingsProvider';
import { PaymentScheduleItem } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { format } from 'date-fns';

interface PaymentBreakdownChartProps {
  schedule: PaymentScheduleItem[];
  title?: string;
}

export const PaymentBreakdownChart: React.FC<PaymentBreakdownChartProps> = ({ 
  schedule, 
  title = "Payment Breakdown Over Time" 
}) => {
  const { settings } = useSettingsContext();
  
  const data = schedule.map(item => ({
    month: item.month,
    date: format(item.date, 'MMM yyyy'),
    principal: item.principal,
    interest: item.interest,
    fees: item.fees,
    balance: item.remainingBalance
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, settings.defaultCurrency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => formatCurrency(value, settings.defaultCurrency)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="principal"
              stackId="1"
              stroke="#059669"
              fill="#059669"
              name="Principal"
            />
            <Area
              type="monotone"
              dataKey="interest"
              stackId="1"
              stroke="#d97706"
              fill="#d97706"
              name="Interest"
            />
            {data.some(d => d.fees > 0) && (
              <Area
                type="monotone"
                dataKey="fees"
                stackId="1"
                stroke="#dc2626"
                fill="#dc2626"
                name="Fees"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};