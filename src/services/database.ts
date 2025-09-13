import Dexie, { Table } from 'dexie';
import { Loan, Payment, AppSettings } from '../types';

export class DebtDatabase extends Dexie {
  loans!: Table<Loan>;

  constructor() {
    super('DebtManagementDB');
    this.version(1).stores({
      loans: 'id, name, type, principal, currentBalance, interestRate',
      scenarios: 'id, name, createdAt, updatedAt'
    });
  }
}

export const db = new DebtDatabase();

export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Opening database...');
    await db.open();
    console.log('Database opened successfully');
    
    // Check if we have example data, if not create it
    const loanCount = await db.loans.count();
    console.log('Current loan count:', loanCount);
    
    if (loanCount === 0) {
      console.log('Creating example data...');
      await createExampleData();
      console.log('Example data created');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const createExampleData = async (): Promise<void> => {
  try {
    const exampleLoans: Loan[] = [
      {
        id: 'loan-1',
        name: 'Primary Mortgage',
        type: 'mortgage',
        principal: 350000,
        currentBalance: 320000,
        interestRate: 3.25,
        monthlyPayment: 1520,
        fees: 0,
        startDate: new Date('2020-01-01'),
        termMonths: 360,
        color: '#1e40af'
      },
      {
        id: 'loan-2',
        name: 'Car Loan',
        type: 'auto',
        principal: 28000,
        currentBalance: 22000,
        interestRate: 4.5,
        monthlyPayment: 520,
        fees: 0,
        startDate: new Date('2022-06-01'),
        termMonths: 60,
        color: '#059669'
      },
      {
        id: 'loan-3',
        name: 'Personal Loan',
        type: 'personal',
        principal: 15000,
        currentBalance: 12000,
        interestRate: 7.2,
        monthlyPayment: 450,
        fees: 10,
        startDate: new Date('2023-01-01'),
        termMonths: 36,
        color: '#d97706'
      }
    ];

    await db.loans.bulkAdd(exampleLoans);
  } catch (error) {
    console.error('Failed to create example data:', error);
    throw error;
  }
};