import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PaymentBreakdownChart } from './charts/PaymentBreakdownChart';
import { useSettingsContext } from './SettingsProvider';
import { Loan } from '../types';
import { generateAmortizationSchedule, compareStrategies, formatCurrency, formatPercentage } from '../utils/calculations';
import { format } from 'date-fns';

interface LoanDetailsProps {
  loan: Loan;
  isOpen: boolean;
  onClose: () => void;
}

export const LoanDetails: React.FC<LoanDetailsProps> = ({ loan, isOpen, onClose }) => {
  const [extraPayment, setExtraPayment] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const { settings } = useSettingsContext();

  const baseSchedule = generateAmortizationSchedule(loan);
  const strategySchedule = extraPayment > 0 ? generateAmortizationSchedule(loan, extraPayment) : [];
  const comparison = extraPayment > 0 ? compareStrategies(loan, extraPayment) : null;

  const totalInterest = baseSchedule.reduce((sum, item) => sum + item.interest, 0);
  const payoffDate = baseSchedule[baseSchedule.length - 1]?.date;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={loan.name} size="xl">
      <div className="space-y-6">
        {/* Loan Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-500">Current Balance</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(loan.currentBalance, loan.currency || settings.defaultCurrency)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Interest Rate</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatPercentage(loan.interestRate)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Monthly Payment</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(loan.monthlyPayment, loan.currency || settings.defaultCurrency)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Payoff Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {payoffDate ? format(payoffDate, 'MMM dd, yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Extra Payment Strategy */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Repayment Strategy</h3>
          <div className="flex items-end space-x-4">
            <Input
              label="Extra Monthly Payment"
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
              placeholder="0"
            />
            <Button 
              onClick={() => setShowComparison(!showComparison)}
              disabled={extraPayment <= 0}
            >
              {showComparison ? 'Hide' : 'Show'} Comparison
            </Button>
          </div>

          {comparison && showComparison && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">Strategy Impact</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Interest Savings</p>
                  <p className="font-semibold text-blue-900">
                    {formatCurrency(comparison.withStrategy.savings, loan.currency || settings.defaultCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">Time Saved</p>
                  <p className="font-semibold text-blue-900">
                    {comparison.withStrategy.timeSaved} months
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">New Payoff Date</p>
                  <p className="font-semibold text-blue-900">
                    {format(comparison.withStrategy.payoffDate, 'MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">Total Interest</p>
                  <p className="font-semibold text-blue-900">
                    {formatCurrency(comparison.withStrategy.totalInterest, loan.currency || settings.defaultCurrency)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Breakdown Chart */}
        <div className="border-t pt-6">
          <PaymentBreakdownChart 
            schedule={showComparison && strategySchedule.length > 0 ? strategySchedule : baseSchedule}
            title={showComparison && extraPayment > 0 ? "Payment Breakdown (With Strategy)" : "Payment Breakdown"}
          />
        </div>

        {/* Amortization Schedule */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Amortization Schedule (First 12 Months)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Principal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(showComparison && strategySchedule.length > 0 ? strategySchedule : baseSchedule)
                  .slice(0, 12)
                  .map((item) => (
                    <tr key={item.month}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.month}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {format(item.date, 'MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.monthlyPayment + item.extraPayment + item.fees, loan.currency || settings.defaultCurrency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.principal, loan.currency || settings.defaultCurrency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.interest, loan.currency || settings.defaultCurrency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.remainingBalance, loan.currency || settings.defaultCurrency)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => setShowFullSchedule(!showFullSchedule)}
          >
            {showFullSchedule ? 'Hide' : 'Show'} Full Amortization Schedule
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Full Amortization Schedule */}
        {showFullSchedule && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Complete Amortization Schedule
              {showComparison && extraPayment > 0 && " (With Strategy)"}
            </h3>
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Principal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interest
                    </th>
                    {showComparison && extraPayment > 0 && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Extra Payment
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(showComparison && strategySchedule.length > 0 ? strategySchedule : baseSchedule)
                    .map((item) => (
                      <tr key={item.month} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.month}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {format(item.date, 'MMM yyyy')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.monthlyPayment + item.extraPayment + item.fees, loan.currency || settings.defaultCurrency)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {formatCurrency(item.principal, loan.currency || settings.defaultCurrency)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">
                          {formatCurrency(item.interest, loan.currency || settings.defaultCurrency)}
                        </td>
                        {showComparison && extraPayment > 0 && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                            {item.extraPayment > 0 ? formatCurrency(item.extraPayment, loan.currency || settings.defaultCurrency) : '-'}
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.remainingBalance, loan.currency || settings.defaultCurrency)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};