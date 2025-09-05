import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useSettingsContext } from '../SettingsProvider';
import { useLoans } from '../../hooks/useLoans';
import { Loan, Currency } from '../../types';

interface LoanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loan?: Loan;
}

const LOAN_TYPES = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'student', label: 'Student Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' }
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'NOK', label: 'Norwegian Krone (kr)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' }
];

const COLORS = [
  '#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2',
  '#be185d', '#b45309', '#374151', '#1f2937'
];

export const LoanForm: React.FC<LoanFormProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  loan 
}) => {
  const { addLoan, updateLoan } = useLoans();
  const { settings } = useSettingsContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal' as const,
    principal: '',
    currentBalance: '',
    interestRate: '',
    monthlyPayment: '',
    fees: '',
    startDate: '',
    termMonths: '',
    color: COLORS[0],
    currency: settings.defaultCurrency
  });

  useEffect(() => {
    if (loan) {
      setFormData({
        name: loan.name,
        type: loan.type,
        principal: loan.principal.toString(),
        currentBalance: loan.currentBalance.toString(),
        interestRate: loan.interestRate.toString(),
        monthlyPayment: loan.monthlyPayment.toString(),
        fees: loan.fees.toString(),
        startDate: loan.startDate.toISOString().split('T')[0],
        termMonths: loan.termMonths.toString(),
        color: loan.color || COLORS[0],
        currency: loan.currency || settings.defaultCurrency
      });
    } else {
      setFormData({
        name: '',
        type: 'personal',
        principal: '',
        currentBalance: '',
        interestRate: '',
        monthlyPayment: '',
        fees: '',
        startDate: '',
        termMonths: '',
        color: COLORS[0],
        currency: settings.defaultCurrency
      });
    }
  }, [loan, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loanData = {
        name: formData.name,
        type: formData.type,
        principal: parseFloat(formData.principal),
        currentBalance: parseFloat(formData.currentBalance),
        interestRate: parseFloat(formData.interestRate),
        monthlyPayment: parseFloat(formData.monthlyPayment),
        fees: parseFloat(formData.fees) || 0,
        startDate: new Date(formData.startDate),
        termMonths: parseInt(formData.termMonths),
        color: formData.color,
        currency: formData.currency as Currency
      };

      if (loan) {
        await updateLoan(loan.id, loanData);
      } else {
        await addLoan(loanData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving loan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={loan ? 'Edit Loan' : 'Add New Loan'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Loan Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            placeholder="e.g., Primary Mortgage"
          />

          <Select
            label="Loan Type"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            required
          >
            {LOAN_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Currency"
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            required
          >
            {CURRENCIES.map(currency => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </Select>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Original Principal"
            type="number"
            value={formData.principal}
            onChange={(e) => handleInputChange('principal', e.target.value)}
            required
            placeholder="250000"
            step="0.01"
          />

          <Input
            label="Current Balance"
            type="number"
            value={formData.currentBalance}
            onChange={(e) => handleInputChange('currentBalance', e.target.value)}
            required
            placeholder="235000"
            step="0.01"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Interest Rate (%)"
            type="number"
            value={formData.interestRate}
            onChange={(e) => handleInputChange('interestRate', e.target.value)}
            required
            placeholder="3.25"
            step="0.01"
            min="0"
            max="100"
          />

          <Input
            label="Monthly Payment"
            type="number"
            value={formData.monthlyPayment}
            onChange={(e) => handleInputChange('monthlyPayment', e.target.value)}
            required
            placeholder="1250"
            step="0.01"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Monthly Fees"
            type="number"
            value={formData.fees}
            onChange={(e) => handleInputChange('fees', e.target.value)}
            placeholder="0"
            step="0.01"
            min="0"
          />

          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Term (Months)"
            type="number"
            value={formData.termMonths}
            onChange={(e) => handleInputChange('termMonths', e.target.value)}
            required
            placeholder="360"
            min="1"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : loan ? 'Update Loan' : 'Add Loan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};