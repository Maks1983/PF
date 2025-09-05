import Dexie, { Table } from 'dexie';
import { Loan } from '../types';

export class DebtManagementDB extends Dexie {
  loans!: Table<Loan>;

  constructor() {
    super('DebtManagementDB');
    this.version(1).stores({
      loans: 'id, name, type, principal, currentBalance, interestRate, monthlyPayment, fees, startDate, termMonths, extraPayment, color, currency'
    });
  }
}

export const db = new DebtManagementDB();

export const initializeDatabase = async (): Promise<void> => {
  try {
    await db.open();
    console.log('Database initialized successfully');
    
    // Check if we need to create example data
    const loanCount = await db.loans.count();
    if (loanCount === 0) {
      await createExampleData();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const createExampleData = async (): Promise<void> => {
  try {
    const exampleLoans: Omit<Loan, 'id'>[] = [
      {
        name: 'Primary Mortgage',
        type: 'mortgage',
        principal: 350000,
        currentBalance: 320000,
        interestRate: 3.25,
        monthlyPayment: 1520,
        fees: 0,
        startDate: new Date('2020-01-01'),
        termMonths: 360,
        color: '#1e40af',
        currency: 'USD'
      },
      {
        name: 'Car Loan',
        type: 'auto',
        principal: 28000,
        currentBalance: 22000,
        interestRate: 4.5,
        monthlyPayment: 520,
        fees: 0,
        startDate: new Date('2022-06-01'),
        termMonths: 60,
        color: '#059669',
        currency: 'USD'
      },
      {
        name: 'Personal Loan',
        type: 'personal',
        principal: 15000,
        currentBalance: 12000,
        interestRate: 7.2,
        monthlyPayment: 450,
        fees: 10,
        startDate: new Date('2023-01-01'),
        termMonths: 36,
        color: '#d97706',
        currency: 'USD'
      }
    ];

    for (const loan of exampleLoans) {
      const id = `loan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await addLoan({ ...loan, id });
    }
    
    console.log('Example data created successfully');
  } catch (error) {
    console.error('Failed to create example data:', error);
    throw error;
  }
};

// CRUD operations for loans
export const addLoan = async (loan: Loan): Promise<void> => {
  await db.loans.add(loan);
};

export const getAllLoans = async (): Promise<Loan[]> => {
  return await db.loans.orderBy('name').toArray();
};

export const updateLoan = async (id: string, updates: Partial<Loan>): Promise<void> => {
  await db.loans.update(id, updates);
};

export const deleteLoan = async (id: string): Promise<void> => {
  await db.loans.delete(id);
};