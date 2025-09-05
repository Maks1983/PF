import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSettingsContext } from '../SettingsProvider';
import { Loan, AppliedStrategy } from '../../types';
import { generateAmortizationSchedule, formatCurrency, calculateDebtSummary } from '../../utils/calculations';
import { optimizeDebtPayoff } from '../../utils/debtOptimizer';
import { format } from 'date-fns';

interface StrategyComparisonChartProps {
  loans: Loan[];
  appliedStrategy: AppliedStrategy;
}

export const StrategyComparisonChart: React.FC<StrategyComparisonChartProps> = ({ 
  loans, 
  appliedStrategy 
}) => {
  const { settings } = useSettingsContext();
  
  // Generate baseline schedule (minimum payments only)
  const baselineData: any[] = [];
  const maxMonths = Math.max(...loans.map(loan => {
    const schedule = generateAmortizationSchedule(loan);
    return schedule.length;
  }));

  for (let month = 1; month <= Math.min(maxMonths, 120); month++) { // Limit to 10 years for chart
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
      baselineData.push({
        month,
        date: format(new Date(2024, month - 1), 'MMM yyyy'),
        baselineBalance: totalBalance,
        baselineInterest: totalCumulativeInterest
      });
    }
  }

  // Generate strategy schedule
  const strategyResult = optimizeDebtPayoff(
    loans,
    appliedStrategy.extraPayment,
    appliedStrategy.lumpSum || 0,
    { speed: 40, savings: 40, cashFlow: 20 } // Default priorities
  );

  const strategySchedule = strategyResult.strategies.find(s => s.id === appliedStrategy.strategyId);
  
  // Combine data for chart
  const combinedData = baselineData.map((baseline, index) => {
    // For now, we'll simulate strategy data based on the optimization results
    // In a real implementation, you'd generate the actual month-by-month schedule
    const progressRatio = index / baselineData.length;
    const strategyBalance = baseline.baselineBalance * (1 - progressRatio * 0.3); // Simplified
    const strategyInterest = baseline.baselineInterest * 0.7; // Simplified
    
    return {
      ...baseline,
      strategyBalance: Math.max(0, strategyBalance),
      strategyInterest
    };
  });

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Strategy vs Baseline Comparison</h3>
        <div className="text-sm text-gray-600">
          Applied: {appliedStrategy.strategyName}
        </div>
      </div>
      
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
              dataKey="baselineBalance"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Baseline Balance"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="strategyBalance"
              stroke="#1e40af"
              strokeWidth={3}
              name="Strategy Balance"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="baselineInterest"
              stroke="#f87171"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Baseline Interest"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="strategyInterest"
              stroke="#dc2626"
              strokeWidth={3}
              name="Strategy Interest"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-green-700 font-medium">Interest Saved</p>
          <p className="text-lg font-bold text-green-900">
            {strategySchedule ? formatCurrency(strategySchedule.interestSaved, settings.defaultCurrency) : 'Calculating...'}
          </p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-700 font-medium">Time Saved</p>
          <p className="text-lg font-bold text-blue-900">
            {strategySchedule ? `${strategySchedule.monthsSaved} months` : 'Calculating...'}
          </p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-purple-700 font-medium">Extra Payment</p>
          <p className="text-lg font-bold text-purple-900">
            {formatCurrency(appliedStrategy.extraPayment, settings.defaultCurrency)}
          </p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-orange-700 font-medium">Strategy Type</p>
          <p className="text-lg font-bold text-orange-900">
            {appliedStrategy.enableScrapes ? 'With Scrapes' : 'Standard'}
          </p>
        </div>
      </div>
    </div>
  );
};