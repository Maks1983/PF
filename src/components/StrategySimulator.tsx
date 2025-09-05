import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { useSettingsContext } from './SettingsProvider';
import { useLoans } from '../hooks/useLoans';
import { optimizeDebtPayoff, calculateBaselineSchedule } from '../utils/debtOptimizer';
import { formatCurrency, formatPercentage, formatDate } from '../utils/calculations';
import { generateAmortizationSchedule } from '../utils/calculations';
import { format } from 'date-fns';
import { Loan, UserPriorities } from '../types';
import { TrendingUp, Clock, DollarSign, Zap, Calculator, Target } from 'lucide-react';

export const StrategySimulator: React.FC = () => {
  const { loans } = useLoans();
  const { settings } = useSettingsContext();
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [extraPayment, setExtraPayment] = useState<number>(0);
  const [lumpSum, setLumpSum] = useState<number>(0);
  const [enableLumpSum, setEnableLumpSum] = useState(false);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [userPriorities, setUserPriorities] = useState<UserPriorities>({
    speed: 40,
    savings: 40,
    cashFlow: 20
  });

  const selectedLoan = loans.find(loan => loan.id === selectedLoanId);

  // Calculate strategy results for single loan
  const singleLoanResults = useMemo(() => {
    if (!selectedLoan || extraPayment <= 0) return null;

    const singleLoanArray = [selectedLoan];
    const lumpSumAmount = enableLumpSum ? lumpSum : 0;
    
    return optimizeDebtPayoff(
      singleLoanArray,
      extraPayment,
      lumpSumAmount,
      userPriorities
    );
  }, [selectedLoan, extraPayment, lumpSum, enableLumpSum, userPriorities]);

  // Base loan information for comparison
  const baseLoanInfo = useMemo(() => {
    if (!selectedLoan) return null;
    
    const baselineSchedule = calculateBaselineSchedule([selectedLoan]);
    const baseTotalInterest = baselineSchedule.reduce((sum, month) => sum + month.totalInterest, 0);
    const basePayoffDate = baselineSchedule[baselineSchedule.length - 1]?.date || new Date();
    
    return {
      totalInterest: baseTotalInterest,
      payoffDate: basePayoffDate,
      monthsRemaining: baselineSchedule.length
    };
  }, [selectedLoan]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Strategy Simulator</h1>
      </div>

      {/* Loan Selection */}
      <Card title="Select Loan to Analyze">
        <Select
          value={selectedLoanId}
          onChange={(e) => setSelectedLoanId(e.target.value)}
        >
          <option value="">Select a loan...</option>
          {loans.map(loan => (
            <option key={loan.id} value={loan.id}>
              {loan.name} - {formatCurrency(loan.currentBalance, loan.currency || settings.defaultCurrency)}
            </option>
          ))}
        </Select>

        {selectedLoan && baseLoanInfo && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Current Loan Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Current Balance</p>
                <p className="font-semibold">{formatCurrency(selectedLoan.currentBalance, selectedLoan.currency || settings.defaultCurrency)}</p>
              </div>
              <div>
                <p className="text-gray-500">Interest Rate</p>
                <p className="font-semibold">{formatPercentage(selectedLoan.interestRate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Payment</p>
                <p className="font-semibold">{formatCurrency(selectedLoan.monthlyPayment, selectedLoan.currency || settings.defaultCurrency)}</p>
              </div>
              <div>
                <p className="text-gray-500">Current Payoff Date</p>
                <p className="font-semibold">{formatDate(baseLoanInfo.payoffDate, 'MMM yyyy')}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Interest (Current Plan)</p>
                  <p className="font-semibold text-red-600">{formatCurrency(baseLoanInfo.totalInterest, selectedLoan.currency || settings.defaultCurrency)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Remaining Term</p>
                  <p className="font-semibold">{baseLoanInfo.monthsRemaining} months</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {selectedLoan && (
        <>
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
                  placeholder="0"
                  helperText="Additional amount to pay each month"
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

          {/* Strategy Results */}
          {singleLoanResults ? (
            <Card title="Single Loan Strategy Results" subtitle="Compare different approaches for this specific loan">
              <div className="space-y-6">
                {singleLoanResults.strategies.map((result, index) => (
                  <div key={index} className="p-6 border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-green-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {result.type.includes('scrapes') ? (
                          <Zap className="w-6 h-6 text-green-600" />
                        ) : (
                          <TrendingUp className="w-6 h-6 text-blue-600" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{result.name}</h3>
                          <p className="text-sm text-gray-600">{result.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Score</p>
                        <p className="font-semibold text-gray-900">{(result.score || 0).toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 mb-1">Interest Saved</p>
                        <p className="font-bold text-green-600">
                          {formatCurrency(result.interestSaved, selectedLoan.currency || settings.defaultCurrency)}
                        </p>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 mb-1">Time Saved</p>
                        <p className="font-bold text-blue-600">
                          {result.monthsSaved} months
                        </p>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Calculator className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 mb-1">Total Interest</p>
                        <p className="font-bold text-purple-600">
                          {formatCurrency(result.totalInterest, selectedLoan.currency || settings.defaultCurrency)}
                        </p>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <TrendingUp className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 mb-1">New Payoff Date</p>
                        <p className="font-bold text-orange-600">
                          {formatDate(result.payoffDate, 'MMM yyyy')}
                        </p>
                      </div>
                    </div>

                    {result.type.includes('scrapes') && (
                      <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-green-600" />
                          <p className="text-sm font-medium text-green-800">Scrapes Feature Active</p>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          Interest saved each month is automatically added to next month's extra payment, accelerating payoff.
                        </p>
                      </div>
                    )}

                    {/* Show Schedule Button */}
                    <div className="mt-4 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setExpandedStrategy(expandedStrategy === result.id ? null : result.id)}
                      >
                        {expandedStrategy === result.id ? 'Hide' : 'Show'} Amortization Schedule
                      </Button>
                    </div>

                    {/* Expanded Schedule */}
                    {expandedStrategy === result.id && selectedLoan && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Amortization Schedule - {selectedLoan.name}
                        </h4>
                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Extra</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {generateAmortizationSchedule(
                                selectedLoan, 
                                extraPayment, 
                                enableLumpSum ? lumpSum : 0
                              ).map((item) => (
                                <tr key={item.month} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-sm text-gray-900">{item.month}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900">{format(item.date, 'MMM yyyy')}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900">
                                    {formatCurrency(item.monthlyPayment + item.extraPayment, selectedLoan.currency || settings.defaultCurrency)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-blue-600 font-medium">
                                    {formatCurrency(item.principal, selectedLoan.currency || settings.defaultCurrency)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-red-600">
                                    {formatCurrency(item.interest, selectedLoan.currency || settings.defaultCurrency)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-green-600 font-medium">
                                    {item.extraPayment > 0 ? formatCurrency(item.extraPayment, selectedLoan.currency || settings.defaultCurrency) : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-900">
                                    {formatCurrency(item.remainingBalance, selectedLoan.currency || settings.defaultCurrency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Recommendation */}
                {singleLoanResults.recommendedStrategy && (
                  <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <h4 className="font-medium text-amber-900 mb-2">Recommended Strategy</h4>
                    <p className="text-sm text-amber-800">
                      <strong>{singleLoanResults.recommendedStrategy.name}</strong> is recommended based on your priorities. 
                      {singleLoanResults.explanation}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card title="Strategy Results">
              <div className="text-center py-8">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Enter Extra Payment Amount</h3>
                <p className="text-gray-600">
                  Add an extra monthly payment amount above to see how different strategies can save you money and time on this specific loan.
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      {!selectedLoan && (
        <Card title="Strategy Simulator">
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Loan to Analyze</h3>
            <p className="text-gray-600">
              Choose a specific loan from the dropdown above to see detailed strategy comparisons and recommendations.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};