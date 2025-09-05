import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Modal } from './ui/Modal';
import { useSettingsContext } from './SettingsProvider';
import { useLoans } from '../hooks/useLoans';
import { bankApi } from '../services/bankApi';
import { formatCurrency } from '../utils/calculations';
import { format } from 'date-fns';
import { PaymentRequest, PaymentResponse, Loan } from '../types';
import { CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const BankIntegration: React.FC = () => {
  const { loans, updateLoan } = useLoans();
  const { settings } = useSettingsContext();
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'regular' | 'extra'>('regular');
  const [description, setDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);

  const selectedLoan = loans.find(loan => loan.id === selectedLoanId);

  const calculatePaymentImpact = (loan: Loan, amount: number) => {
    const monthlyRate = loan.interestRate / 100 / 12;
    const currentBalance = loan.currentBalance;
    const newBalance = Math.max(0, currentBalance - amount);
    
    // Calculate interest saved this month
    const interestSaved = (currentBalance - newBalance) * monthlyRate;
    
    // Estimate time saved (simplified calculation)
    const originalMonths = Math.ceil(Math.log(1 + (currentBalance * monthlyRate) / loan.monthlyPayment) / Math.log(1 + monthlyRate));
    const newMonths = newBalance > 0 ? Math.ceil(Math.log(1 + (newBalance * monthlyRate) / loan.monthlyPayment) / Math.log(1 + monthlyRate)) : 0;
    const timeSaved = originalMonths - newMonths;
    
    return {
      newBalance,
      interestSaved,
      timeSaved,
      newPayoffDate: new Date(Date.now() + (newMonths * 30 * 24 * 60 * 60 * 1000))
    };
  };

  const handlePreviewPayment = async () => {
    if (!selectedLoan || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedLoan.currentBalance) {
      alert('Invalid payment amount');
      return;
    }

    const impact = calculatePaymentImpact(selectedLoan, amount);
    
    setPreviewData({
      loan: selectedLoan,
      amount,
      impact,
      paymentType,
      description
    });
    setShowPreview(true);
  };

  const handleExecutePayment = async () => {
    if (!previewData) return;

    setIsProcessing(true);
    
    try {
      const paymentRequest: PaymentRequest = {
        loanId: previewData.loan.id,
        amount: previewData.amount,
        currency: 'USD',
        type: previewData.paymentType,
        description: previewData.description
      };

      // Validate payment first
      const validation = await bankApi.validatePayment(paymentRequest);
      if (!validation.valid) {
        setPaymentResult({
          success: false,
          error: validation.error,
          timestamp: new Date()
        });
        return;
      }

      // Execute payment
      const response = await bankApi.makePayment(paymentRequest);
      setPaymentResult(response);

      if (response.success) {
        // Update loan balance
        await updateLoan(previewData.loan.id, {
          currentBalance: previewData.impact.newBalance
        });
        
        // Reset form
        setPaymentAmount('');
        setDescription('');
        setShowPreview(false);
        setPreviewData(null);
      }
    } catch (error) {
      setPaymentResult({
        success: false,
        error: 'Payment processing failed',
        timestamp: new Date()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Bank Integration</h1>
      </div>

      {/* Payment Form */}
      <Card title="Make Payment" subtitle="Send payments directly to your loans">
        <div className="space-y-4">
          <Select
            label="Select Loan"
            value={selectedLoanId}
            onChange={(e) => setSelectedLoanId(e.target.value)}
          >
            <option value="">Choose a loan...</option>
            {loans.map(loan => (
              <option key={loan.id} value={loan.id}>
               {loan.name} - {formatCurrency(loan.currentBalance, loan.currency || settings.defaultCurrency)} ({loan.currency || settings.defaultCurrency})
              </option>
            ))}
          </Select>

          {selectedLoan && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Payment Amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  max={selectedLoan.currentBalance}
                 helperText={`Maximum: ${formatCurrency(selectedLoan.currentBalance, selectedLoan.currency || settings.defaultCurrency)}`}
                />

                <Select
                  label="Payment Type"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as 'regular' | 'extra')}
                >
                  <option value="regular">Regular Payment</option>
                  <option value="extra">Extra Payment</option>
                </Select>
              </div>

              <Input
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Monthly payment, Extra principal payment"
              />

              <div className="flex justify-end">
                <Button
                  onClick={handlePreviewPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  Preview Payment
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Supported Currencies */}
      <Card title="Supported Currencies">
        <div className="flex items-center space-x-4">
          {bankApi.getSupportedCurrencies().map(currency => (
            <div key={currency} className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">{currency}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Payment Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Payment Preview"
        size="lg"
      >
        {previewData && (
          <div className="space-y-6">
            {/* Payment Details */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-3">Payment Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Loan</p>
                  <p className="font-semibold text-blue-900">{previewData.loan.name}</p>
                </div>
                <div>
                  <p className="text-blue-700">Amount</p>
                  <p className="font-semibold text-blue-900">
                    {formatCurrency(previewData.amount, previewData.loan.currency || settings.defaultCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">Type</p>
                  <p className="font-semibold text-blue-900 capitalize">{previewData.paymentType}</p>
                </div>
                <div>
                  <p className="text-blue-700">Color</p>
                  <p className="font-semibold text-blue-900">{previewData.loan.currency || settings.defaultCurrency}</p>
                </div>
              </div>
            </div>

            {/* Impact Analysis */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-3">Payment Impact</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-green-700">Current Balance</p>
                  <p className="font-semibold text-green-900">
                    {formatCurrency(previewData.loan.currentBalance, previewData.loan.currency || settings.defaultCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-green-700">New Balance</p>
                  <p className="font-semibold text-green-900">
                    {formatCurrency(previewData.impact.newBalance, previewData.loan.currency || settings.defaultCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-green-700">Interest Saved</p>
                  <p className="font-semibold text-green-900">
                    {formatCurrency(previewData.impact.interestSaved, previewData.loan.currency || settings.defaultCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-green-700">Time Saved</p>
                  <p className="font-semibold text-green-900">
                    {previewData.impact.timeSaved} months
                  </p>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Confirm Payment</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    This payment will be sent directly to your loan servicer. Please verify all details before proceeding.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExecutePayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    {loan.name} - {formatCurrency(loan.currentBalance)} ({loan.color})
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Execute Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Result Modal */}
      <Modal
        isOpen={!!paymentResult}
        onClose={() => setPaymentResult(null)}
        title={paymentResult?.success ? 'Payment Successful' : 'Payment Failed'}
      >
        {paymentResult && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${paymentResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center space-x-3">
                {paymentResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <h3 className={`font-medium ${paymentResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {paymentResult.success ? 'Payment Processed Successfully' : 'Payment Failed'}
                  </h3>
                  <p className={`text-sm mt-1 ${paymentResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {paymentResult.success 
                      ? `Transaction ID: ${paymentResult.transactionId}`
                      : paymentResult.error
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(paymentResult.timestamp, 'MMM dd, yyyy')} at {paymentResult.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setPaymentResult(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};