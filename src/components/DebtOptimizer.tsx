import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { useSettingsContext } from './SettingsProvider';
import { useLoans } from '../hooks/useLoans';
import { optimizeDebtPayoff, calculateBaselineSchedule } from '../utils/debtOptimizer';
import { formatCurrency, formatDate } from '../utils/calculations';
import { format } from 'date-fns';
import { UserPriorities, ScheduledPayment, AppliedStrategy } from '../types';
import { TrendingUp, Clock, DollarSign, Zap, Target, Award, Download, Calendar, Play, Settings } from 'lucide-react';

export const DebtOptimizer: React.FC = () => {
  const { loans } = useLoans();
  const { settings } = useSettingsContext();
  const [extraPayment, setExtraPayment] = useState<number>(500);
  const [lumpSum, setLumpSum] = useState<number>(0);
  const [enableLumpSum, setEnableLumpSum] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [appliedStrategy, setAppliedStrategy] = useState<AppliedStrategy | null>(null);
  const [userPriorities, setUserPriorities] = useState<UserPriorities>({
    speed: 40,
    savings: 40,
    cashFlow: 20
  });
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [selectedScheduleLoan, setSelectedScheduleLoan] = useState<string>('');

  // Ensure priorities sum to 100
  const handlePriorityChange = (priority: keyof UserPriorities, value: number) => {
    const newPriorities = { ...userPriorities, [priority]: value };
    const total = Object.values(newPriorities).reduce((sum, val) => sum + val, 0);
    
    if (total <= 100) {
      setUserPriorities(newPriorities);
    }
  };

  const optimizationResult = useMemo(() => {
    if (loans.length === 0) return null;
    
    try {
      return optimizeDebtPayoff(
        loans,
        extraPayment,
        enableLumpSum ? lumpSum : 0,
        userPriorities
      );
    } catch (error) {
      console.error('Optimization error:', error);
      return null;
    }
  }, [loans, extraPayment, lumpSum, enableLumpSum, userPriorities]);

  // Calculate baseline for comparison
  const baselineResult = useMemo(() => {
    if (loans.length === 0) return null;
    try {
      const baselineSchedule = calculateBaselineSchedule(loans);
      const baselineTotalInterest = baselineSchedule.reduce((sum, month) => sum + month.totalInterest, 0);
      const baselinePayoffDate = baselineSchedule[baselineSchedule.length - 1]?.date || new Date();
      return {
        totalInterest: baselineTotalInterest,
        payoffDate: baselinePayoffDate,
        monthsRemaining: baselineSchedule.length
      };
    } catch (error) {
      console.error('Baseline calculation error:', error);
      return null;
    }
  }, [loans]);

  const exportResults = () => {
    if (!optimizationResult) return;
    
    const csvContent = [
      ['Strategy', 'Total Interest', 'Interest Saved', 'Months Saved', 'Payoff Date', 'Score'],
      ...optimizationResult.strategies.map(strategy => [
        strategy.name,
        formatCurrency(strategy.totalInterest, settings.defaultCurrency),
        formatCurrency(strategy.interestSaved, settings.defaultCurrency),
        strategy.monthsSaved.toString(),
        formatDate(strategy.payoffDate, 'yyyy-MM-dd'),
        (strategy.score || 0).toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'debt-optimization-results.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApplyStrategy = (strategy: any) => {
    setSelectedStrategy(strategy);
    setShowApplyModal(true);
  };

  const confirmApplyStrategy = () => {
    if (!selectedStrategy) return;

    const newAppliedStrategy: AppliedStrategy = {
      id: `applied-${Date.now()}`,
      strategyId: selectedStrategy.id,
      strategyName: selectedStrategy.name,
      appliedAt: new Date(),
      extraPayment,
      lumpSum: enableLumpSum ? lumpSum : 0,
      hybridWeight: 0,
      enableScrapes: selectedStrategy.type.includes('scrapes'),
      scheduledPayments: scheduledPayments.filter(sp => sp.isActive)
    };

    setAppliedStrategy(newAppliedStrategy);
    setShowApplyModal(false);
    
    localStorage.setItem('appliedStrategy', JSON.stringify(newAppliedStrategy));
  };

  const handleSchedulePayment = () => {
    setShowScheduleModal(true);
  };

  const addScheduledPayment = (loanId: string, amount: number, dayOfMonth: number, description: string) => {
    const newPayment: ScheduledPayment = {
      id: `scheduled-${Date.now()}`,
      loanId,
      amount,
      dayOfMonth,
      isActive: true,
      startDate: new Date(),
      description,
      createdAt: new Date()
    };

    setScheduledPayments(prev => [...prev, newPayment]);
    setShowScheduleModal(false);
  };

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Debt Optimizer</h1>
        </div>
        <Card title="No Loans Found">
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Add Loans to Get Started</h3>
            <p className="text-gray-600">
              Go to the Loans section to add your debts, then return here to optimize your payoff strategy.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Debt Optimizer</h1>
        <div className="flex gap-2">
          {optimizationResult && (
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          )}
          <Button onClick={handleSchedulePayment} variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Payments
          </Button>
        </div>
      </div>

      {/* Applied Strategy Banner */}
      {appliedStrategy && (
        <Card>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <Play className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Active Strategy: {appliedStrategy.strategyName}</h3>
                <p className="text-sm text-green-700">
                  Applied on {formatDate(appliedStrategy.appliedAt, 'MMM dd, yyyy')} • 
                  Extra Payment: {formatCurrency(appliedStrategy.extraPayment, settings.defaultCurrency)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAppliedStrategy(null)}>
              <Settings className="w-4 h-4 mr-2" />
              Change
            </Button>
          </div>
        </Card>
      )}

      {/* Configuration */}
      <div className="grid grid-cols-1 gap-6">
        {/* Payment Configuration */}
        <Card title="Payment Configuration">
          <div className="space-y-4">
            <Input
              label="Extra Monthly Payment"
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value) || 0)}
              step="0.01"
              min="0"
              placeholder="500"
              helperText="Amount above minimum payments you can afford monthly"
            />
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-lump-sum"
                  checked={enableLumpSum}
                  onChange={(e) => setEnableLumpSum(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enable-lump-sum" className="text-sm font-medium text-gray-700">
                  Include One-time Lump Sum Payment
                </label>
              </div>
              
              {enableLumpSum && (
                <Input
                  label="Lump Sum Amount"
                  type="number"
                  value={lumpSum}
                  onChange={(e) => setLumpSum(Number(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  placeholder="0"
                  helperText="One-time payment applied immediately"
                />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Baseline Scenario */}
      {baselineResult && (
        <Card title="Baseline Scenario (Minimum Payments Only)" subtitle="Your current path without any changes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <DollarSign className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <p className="text-sm text-red-700 mb-1">Total Interest</p>
              <p className="text-xl font-bold text-red-900">
                {formatCurrency(baselineResult.totalInterest, settings.defaultCurrency)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Calendar className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-700 mb-1">Payoff Date</p>
              <p className="text-xl font-bold text-gray-900">
                {formatDate(baselineResult.payoffDate, 'MMM yyyy')}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-700 mb-1">Total Months</p>
              <p className="text-xl font-bold text-gray-900">
                {baselineResult.monthsRemaining} months
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Strategy Results */}
      {optimizationResult ? (
        <div className="space-y-6">
          {/* Objective Comparison */}
          <Card title="Best Strategy by Objective" subtitle="Choose the strategy that matches your primary goal">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Most Interest Saved */}
              <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">Most Interest Saved</h3>
                <div className="space-y-2">
                  <p className="font-bold text-green-900 text-xl">
                    {optimizationResult.strategies
                      .reduce((best, current) => 
                        (current.interestSaved > best.interestSaved) ? current : best
                      ).name}
                  </p>
                  <p className="text-green-700 font-medium">
                    {formatCurrency(
                      optimizationResult.strategies
                        .reduce((best, current) => 
                          (current.interestSaved > best.interestSaved) ? current : best
                        ).interestSaved, 
                      settings.defaultCurrency
                    )} saved
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => handleApplyStrategy(
                      optimizationResult.strategies
                        .reduce((best, current) => 
                          (current.interestSaved > best.interestSaved) ? current : best
                        )
                    )}
                  >
                    Apply Strategy
                  </Button>
                </div>
              </div>

              {/* Fastest Payoff */}
              <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Fastest Payoff</h3>
                <div className="space-y-2">
                  <p className="font-bold text-blue-900 text-xl">
                    {optimizationResult.strategies
                      .reduce((best, current) => 
                        (current.monthsSaved > best.monthsSaved) ? current : best
                      ).name}
                  </p>
                  <p className="text-blue-700 font-medium">
                    {optimizationResult.strategies
                      .reduce((best, current) => 
                        (current.monthsSaved > best.monthsSaved) ? current : best
                      ).monthsSaved} months saved
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => handleApplyStrategy(
                      optimizationResult.strategies
                        .reduce((best, current) => 
                          (current.monthsSaved > best.monthsSaved) ? current : best
                        )
                    )}
                  >
                    Apply Strategy
                  </Button>
                </div>
              </div>

              {/* Best Cash Flow (Snowball) */}
              <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Best Cash Flow</h3>
                <div className="space-y-2">
                  <p className="font-bold text-purple-900 text-xl">
                    {optimizationResult.strategies
                      .find(s => s.type.includes('snowball'))?.name || 'Snowball Method'}
                  </p>
                  <p className="text-purple-700 font-medium">
                    Psychological wins
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => handleApplyStrategy(
                      optimizationResult.strategies
                        .find(s => s.type.includes('snowball')) || optimizationResult.strategies[0]
                    )}
                  >
                    Apply Strategy
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Strategy Comparison Cards */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Strategy Comparison</h2>
            
            {optimizationResult.strategies
              .sort((a, b) => {
                // Primary sort: Interest saved (descending)
                if (Math.abs(a.interestSaved - b.interestSaved) > 1000) {
                  return b.interestSaved - a.interestSaved;
                }
                // Secondary sort: Months saved (descending)
                return b.monthsSaved - a.monthsSaved;
              })
              .map((strategy) => {
                const isBestSavings = strategy.interestSaved === Math.max(...optimizationResult.strategies.map(s => s.interestSaved));
                const isFastest = strategy.monthsSaved === Math.max(...optimizationResult.strategies.map(s => s.monthsSaved));
                
                return (
                  <Card key={strategy.id}>
                    <div className="p-6 rounded-lg border-2 bg-white border-gray-200">
                      {/* Strategy Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          {strategy.type.includes('scrapes') && (
                            <Zap className="w-6 h-6 text-yellow-500" />
                          )}
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              {strategy.name}
                              {isBestSavings && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  💰 Best Savings
                                </span>
                              )}
                              {isFastest && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  ⚡ Fastest
                                </span>
                              )}
                            </h3>
                            <p className="text-gray-600 mt-1">{strategy.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Rank</p>
                          <p className="text-2xl font-bold text-gray-900">#{optimizationResult.strategies.indexOf(strategy) + 1}</p>
                        </div>
                      </div>

                      {/* Strategy Features */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {strategy.type.includes('scrapes') && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            ⚡ Scrapes Feature
                          </span>
                        )}
                        {strategy.type.includes('snowball') && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            ❄️ Snowball Method
                          </span>
                        )}
                        {strategy.type.includes('avalanche') && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                            🏔️ Avalanche Method
                          </span>
                        )}
                      </div>

                      {/* Strategy Summary Metrics */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 mb-1">Interest Saved</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(strategy.interestSaved, settings.defaultCurrency)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 mb-1">Time Saved</p>
                          <p className="text-lg font-bold text-blue-600">
                            {strategy.monthsSaved} months
                          </p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 mb-1">Total Interest</p>
                          <p className="text-lg font-bold text-purple-600">
                            {formatCurrency(strategy.totalInterest, settings.defaultCurrency)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <Target className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 mb-1">Payoff Date</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatDate(strategy.payoffDate, 'MMM yyyy')}
                          </p>
                        </div>
                      </div>

                      {/* Individual Loan Impact Table */}
                      <div className="bg-white rounded-lg border overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b">
                          <h4 className="font-medium text-gray-900">Impact on Individual Loans</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Loan
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Current Balance
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Interest Rate
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Interest Paid
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Interest Saved
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Months Saved
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Payoff Date
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Payoff Order
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {loans.map((loan, index) => {
                                // Find debt details for this loan in this strategy
                                const debtDetail = strategy.perDebtDetails?.find(d => d.loanId === loan.id);
                                
                                // Calculate payoff order (1st, 2nd, 3rd, etc.)
                                const allPayoffMonths = strategy.perDebtDetails
                                  ?.map(d => d.payoffMonth)
                                  .filter(month => month > 0)
                                  .sort((a, b) => a - b) || [];
                                
                                const payoffOrder = debtDetail?.payoffMonth 
                                  ? allPayoffMonths.indexOf(debtDetail.payoffMonth) + 1 
                                  : null;
                                
                                return (
                                  <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div 
                                          className="w-3 h-3 rounded-full mr-3" 
                                          style={{ backgroundColor: loan.color || '#1e40af' }}
                                        ></div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{loan.name}</div>
                                          <div className="text-xs text-gray-500">{loan.type}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                                      {formatCurrency(loan.currentBalance, loan.currency || settings.defaultCurrency)}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                                      {loan.interestRate.toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-red-600">
                                      {debtDetail ? formatCurrency(debtDetail.totalInterest, loan.currency || settings.defaultCurrency) : '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                                      {debtDetail ? formatCurrency(debtDetail.interestSaved, loan.currency || settings.defaultCurrency) : '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-blue-600 font-medium">
                                      {debtDetail && debtDetail.monthsSaved > 0 ? `${debtDetail.monthsSaved} months` : 'Same timeline'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">
                                      {debtDetail ? formatDate(debtDetail.payoffDate, 'MMM yyyy') : '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                      {payoffOrder && (
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          {payoffOrder}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Apply Strategy Button */}
                      <div className="mt-6 flex justify-end">
                        <div className="flex space-x-3">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedStrategy(expandedStrategy === strategy.id ? null : strategy.id)}
                          >
                            {expandedStrategy === strategy.id ? 'Hide' : 'Show'} Strategy Schedule
                          </Button>
                          <Button 
                            onClick={() => handleApplyStrategy(strategy)}
                            variant="outline"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Apply This Strategy
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Strategy Schedule */}
                      {expandedStrategy === strategy.id && (
                        <div className="mt-6 border-t pt-6">
                          <h4 className="font-medium text-gray-900 mb-4">Complete Strategy Schedule - All Loans</h4>
                          <div className="max-h-96 overflow-y-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min Payment</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Extra</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Freed</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {strategy.monthlySchedule.map((month) => (
                                  // Group all loans for this month
                                  month.payments.map((payment, paymentIndex) => {
                                    const loan = loans.find(l => l.id === payment.loanId);
                                    if (!loan) return null;
                                    
                                    const isFirstPaymentInMonth = paymentIndex === 0;
                                    
                                    return (
                                      <tr 
                                        key={`${month.month}-${payment.loanId}`} 
                                        className={`hover:bg-gray-50 ${isFirstPaymentInMonth ? 'border-t-2 border-gray-300' : ''}`}
                                      >
                                        {/* Month and Date - only show for first loan in the month */}
                                        <td className={`px-3 py-2 text-sm ${isFirstPaymentInMonth ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                                          {isFirstPaymentInMonth ? month.month : ''}
                                        </td>
                                        <td className={`px-3 py-2 text-sm ${isFirstPaymentInMonth ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                                          {isFirstPaymentInMonth ? format(month.date, 'MMM yyyy') : ''}
                                        </td>
                                        
                                        {/* Loan Name with color indicator */}
                                        <td className="px-3 py-2 text-sm">
                                          <div className="flex items-center space-x-2">
                                            <div 
                                              className="w-3 h-3 rounded-full" 
                                              style={{ backgroundColor: loan.color || '#1e40af' }}
                                            ></div>
                                            <span className={`font-medium ${payment.isPaidOff ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                              {loan.name}
                                            </span>
                                          </div>
                                        </td>
                                        
                                        {/* Payment Details */}
                                        <td className="px-3 py-2 text-sm text-gray-900">
                                          {payment.isPaidOff ? '-' : formatCurrency(payment.minimumPayment, settings.defaultCurrency)}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-blue-600 font-medium">
                                          {payment.principalPayment > 0 ? formatCurrency(payment.principalPayment, settings.defaultCurrency) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-red-600">
                                          {payment.monthlyInterest > 0 ? formatCurrency(payment.monthlyInterest, settings.defaultCurrency) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-green-600 font-bold">
                                          {payment.extraPayment > 0 ? (
                                            <span className="bg-green-100 px-2 py-1 rounded">
                                              {formatCurrency(payment.extraPayment, settings.defaultCurrency)}
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-purple-600 font-medium">
                                          {payment.freedPayment > 0 ? (
                                            <span className="bg-purple-100 px-2 py-1 rounded text-xs">
                                              {payment.isPaidOff && payment.freedPayment > 100 ? 
                                                `${formatCurrency(payment.freedPayment, loan?.currency || settings.defaultCurrency)} (Loan Paid Off)` :
                                                formatCurrency(payment.freedPayment, loan?.currency || settings.defaultCurrency)
                                              }
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                          {payment.isPaidOff ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              ✓ Paid Off
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                              Active
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-900 font-medium">
                                          {formatCurrency(payment.remainingBalance, settings.defaultCurrency)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )).flat().filter(Boolean)}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Strategy Summary for this month view */}
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <h5 className="font-medium text-blue-900 mb-2">Strategy Explanation</h5>
                            <div className="text-sm text-blue-800 space-y-1">
                              {strategy.type.includes('snowball') && (
                                <p>• <strong>Snowball Method:</strong> Extra payments target the smallest balance first</p>
                              )}
                              {strategy.type.includes('avalanche') && (
                                <p>• <strong>Avalanche Method:</strong> Extra payments target the highest interest rate first</p>
                              )}
                              {strategy.type.includes('scrapes') && (
                                <p>• <strong>Scrapes Feature:</strong> Freed payments from paid-off loans accelerate remaining debts</p>
                              )}
                              <p>• <strong>Green highlights:</strong> Show where extra payments are applied each month</p>
                              <p>• <strong>Purple highlights:</strong> Show freed payments being redistributed</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      ) : (
        <Card title="Strategy Analysis">
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Optimize Your Debt?</h3>
            <p className="text-gray-600 mb-4">
              Your configuration is set. The analysis will show personalized debt payoff strategies.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>• Compare Avalanche, Snowball, and Hybrid methods</p>
              <p>• See the impact of automatic scrapes</p>
              <p>• Get recommendations based on your priorities</p>
            </div>
          </div>
        </Card>
      )}

      {/* Apply Strategy Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply Strategy to Dashboard"
        size="lg"
      >
        {selectedStrategy && (
          <div className="space-y-6 p-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Strategy Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Strategy</p>
                  <p className="font-semibold text-blue-900">{selectedStrategy.name}</p>
                </div>
                <div>
                  <p className="text-blue-700">Interest Saved</p>
                  <p className="font-semibold text-blue-900">
                    {formatCurrency(selectedStrategy.interestSaved, settings.defaultCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">Time Saved</p>
                  <p className="font-semibold text-blue-900">{selectedStrategy.monthsSaved} months</p>
                </div>
                <div>
                  <p className="text-blue-700">Payoff Date</p>
                  <p className="font-semibold text-blue-900">
                    {formatDate(selectedStrategy.payoffDate, 'MMM yyyy')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h4 className="font-medium text-amber-900 mb-2">What happens when you apply this strategy?</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Your dashboard will show progress with this strategy applied</li>
                <li>• Charts will compare baseline vs. strategy performance</li>
                <li>• You can schedule automatic extra payments</li>
                <li>• Strategy can be changed or removed at any time</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowApplyModal(false)}>
                Cancel
              </Button>
              <Button onClick={confirmApplyStrategy}>
                <Play className="w-4 h-4 mr-2" />
                Apply Strategy
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Schedule Payment Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Automatic Payments"
        size="lg"
      >
        <SchedulePaymentForm
          loans={loans}
          onSchedule={addScheduledPayment}
          onClose={() => setShowScheduleModal(false)}
        />
      </Modal>
    </div>
  );
};

// Schedule Payment Form Component
const SchedulePaymentForm: React.FC<{
  loans: any[];
  onSchedule: (loanId: string, amount: number, dayOfMonth: number, description: string) => void;
  onClose: () => void;
}> = ({ loans, onSchedule, onClose }) => {
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLoanId && amount) {
      onSchedule(selectedLoanId, parseFloat(amount), dayOfMonth, description);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Loan
          </label>
          <select
            value={selectedLoanId}
            onChange={(e) => setSelectedLoanId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Choose a loan...</option>
            {loans.map(loan => (
              <option key={loan.id} value={loan.id}>
                {loan.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Day of Month
          </label>
          <select
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Extra principal payment"
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Scheduled Payment Preview</h4>
        <p className="text-sm text-blue-800">
          This will schedule a recurring payment that can be integrated with your bank API in the future.
          For now, it will be stored locally and displayed in your dashboard.
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Payment
        </Button>
      </div>
    </form>
  );
};