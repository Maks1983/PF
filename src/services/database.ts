// This file now acts as a bridge between the React frontend and server functions
import { 
  getAllLoans as serverGetAllLoans,
  addLoan as serverAddLoan,
  updateLoan as serverUpdateLoan,
  deleteLoan as serverDeleteLoan,
  initializeExampleData as serverInitializeExampleData
} from '../../server/debtFunctions';
import { Loan } from '../types';

export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Initializing database connection...');
    
    // Initialize example data if needed
    await serverInitializeExampleData();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Re-export server functions for use in React components
export const getAllLoans = serverGetAllLoans;
export const addLoan = serverAddLoan;
export const updateLoan = serverUpdateLoan;
export const deleteLoan = serverDeleteLoan;

// Legacy functions for compatibility (these are no longer needed but kept for smooth transition)
export class DebtManagementDB {
  // This class is kept for compatibility but no longer used
}

export const db = null; // No longer needed

export const createExampleData = async (): Promise<void> => {
  // This is now handled by serverInitializeExampleData
  await serverInitializeExampleData();
};