import React, { useState } from 'react';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LoanForm } from './forms/LoanForm';
import { LoanDetails } from './LoanDetails';
import { useLoans } from '../hooks/useLoans';
import { useSettingsContext } from './SettingsProvider';
import { formatCurrency, formatPercentage } from '../utils/calculations';
import { Loan } from '../types';

export const LoanList: React.FC = () => {
  const { loans, loading, deleteLoan } = useLoans();
  const { settings } = useSettingsContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [viewingLoan, setViewingLoan] = useState<Loan | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleDeleteLoan = async (loanId: string) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      try {
        await deleteLoan(loanId);
      } catch (error) {
        console.error('Failed to delete loan:', error);
      }
    }
  };

  const getLoanTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      mortgage: 'Mortgage',
      personal: 'Personal Loan',
      auto: 'Auto Loan',
      student: 'Student Loan',
      credit_card: 'Credit Card',
      other: 'Other'
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Loans</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Loan
        </Button>
      </div>

      {loans.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No loans yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first loan.</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Loan
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6">
          {loans.map((loan) => (
            <Card key={loan.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: loan.color || '#1e40af' }}
                  ></div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{loan.name}</h3>
                    <p className="text-sm text-gray-600">{getLoanTypeDisplay(loan.type)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setViewingLoan(loan)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingLoan(loan)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteLoan(loan.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <p className="text-sm font-medium text-gray-500">Term</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {loan.termMonths} months
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Loan Modal */}
      <LoanForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={() => setShowAddForm(false)}
      />

      {/* Edit Loan Modal */}
      {editingLoan && (
        <LoanForm
          isOpen={true}
          onClose={() => setEditingLoan(null)}
          onSuccess={() => setEditingLoan(null)}
          loan={editingLoan}
        />
      )}

      {/* View Loan Details Modal */}
      {viewingLoan && (
        <LoanDetails
          loan={viewingLoan}
          isOpen={true}
          onClose={() => setViewingLoan(null)}
        />
      )}
    </div>
  );
};