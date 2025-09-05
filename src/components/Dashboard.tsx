import React from 'react';
import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, Percent } from 'lucide-react';
import { Card } from './ui/Card';
import { DebtOverviewChart } from './charts/DebtOverviewChart';
import { DebtProgressChart } from './charts/DebtProgressChart';
import { StrategyComparisonChart } from './charts/StrategyComparisonChart';
import { useSettingsContext } from './SettingsProvider';
import { useLoans } from '../hooks/useLoans';
import { calculateDebtSummary, formatCurrency, formatPercentage } from '../utils/calculations';
import { AppliedStrategy } from '../types';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { loans, loading } = useLoans();
  const { settings } = useSettingsContext();
  const [appliedStrategy, setAppliedStrategy] = useState<AppliedStrategy | null>(null);

  useEffect(() => {
    // Load applied strategy from localStorage
    const stored = localStorage.getItem('appliedStrategy');
    if (stored) {
      try {
        setAppliedStrategy(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load applied strategy:', error);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const debtSummary = calculateDebtSummary(loans);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Debt Overview</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Debt</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(debtSummary.totalDebt, settings.defaultCurrency)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Monthly Payment</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(debtSummary.totalMonthlyPayment, settings.defaultCurrency)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Percent className="w-6 h-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Avg Interest Rate</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(debtSummary.averageRate)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Payoff Date</h3>
              <p className="text-2xl font-bold text-gray-900">
                {format(debtSummary.payoffDate, 'MMM yyyy')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Debt Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Debt Composition">
          <DebtOverviewChart loans={loans} />
        </Card>

        <Card title="Loan Overview">
          <div className="space-y-4">
            {loans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: loan.color || '#1e40af' }}
                  ></div>
                  <div>
                    <h4 className="font-medium text-gray-900">{loan.name}</h4>
                    <p className="text-sm text-gray-500">{loan.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(loan.currentBalance, loan.currency || settings.defaultCurrency)}</p>
                  <p className="text-sm text-gray-500">{formatPercentage(loan.interestRate)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Progress Chart */}
      {appliedStrategy ? (
        <Card>
          <StrategyComparisonChart 
            loans={loans} 
            appliedStrategy={appliedStrategy}
          />
        </Card>
      ) : (
        <Card>
          <DebtProgressChart loans={loans} />
        </Card>
      )}
    </div>
  );
};