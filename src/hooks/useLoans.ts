import { useState, useEffect } from 'react';
import { Loan } from '../types';
import { db } from '../services/database';

export const useLoans = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const allLoans = await db.loans.toArray();
      setLoans(allLoans);
      setError(null);
    } catch (err) {
      setError('Failed to fetch loans');
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLoan = async (loan: Omit<Loan, 'id'>) => {
    try {
      const id = `loan-${Date.now()}`;
      const newLoan = { ...loan, id };
      await db.loans.add(newLoan);
      await fetchLoans();
      return newLoan;
    } catch (err) {
      setError('Failed to add loan');
      console.error('Error adding loan:', err);
      throw err;
    }
  };

  const updateLoan = async (id: string, updates: Partial<Loan>) => {
    try {
      await db.loans.update(id, updates);
      await fetchLoans();
    } catch (err) {
      setError('Failed to update loan');
      console.error('Error updating loan:', err);
      throw err;
    }
  };

  const deleteLoan = async (id: string) => {
    try {
      await db.loans.delete(id);
      await fetchLoans();
    } catch (err) {
      setError('Failed to delete loan');
      console.error('Error deleting loan:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  return {
    loans,
    loading,
    error,
    addLoan,
    updateLoan,
    deleteLoan,
    refetch: fetchLoans
  };
};