import dbConnection, { ensureDbInitialized } from './dbConnection.js';
import { Loan } from '../src/types/index.js';

// Ensure database is initialized before any operations
const initializeIfNeeded = async () => {
  await ensureDbInitialized();
};

// Convert database row to Loan object
const mapRowToLoan = (row: any): Loan => {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    principal: parseFloat(row.principal),
    currentBalance: parseFloat(row.current_balance),
    interestRate: parseFloat(row.interest_rate),
    monthlyPayment: parseFloat(row.monthly_payment),
    fees: parseFloat(row.fees || 0),
    startDate: new Date(row.start_date),
    termMonths: row.term_months,
    extraPayment: parseFloat(row.extra_payment || 0),
    color: row.color,
    currency: row.currency
  };
};

// Convert Loan object to database format
const mapLoanToRow = (loan: Omit<Loan, 'id'> | Loan) => {
  return {
    name: loan.name,
    type: loan.type,
    principal: loan.principal,
    current_balance: loan.currentBalance,
    interest_rate: loan.interestRate,
    monthly_payment: loan.monthlyPayment,
    fees: loan.fees || 0,
    start_date: loan.startDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
    term_months: loan.termMonths,
    extra_payment: loan.extraPayment || 0,
    color: loan.color || '#1e40af',
    currency: loan.currency || 'USD'
  };
};

export const getAllLoans = async (): Promise<Loan[]> => {
  await initializeIfNeeded();
  
  try {
    const rows = await dbConnection.query(
      'SELECT * FROM loans ORDER BY name ASC'
    );
    
    return rows.map(mapRowToLoan);
  } catch (error) {
    console.error('Error fetching loans:', error);
    throw new Error(`Failed to fetch loans: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const addLoan = async (loan: Omit<Loan, 'id'>): Promise<Loan> => {
  await initializeIfNeeded();
  
  try {
    const id = `loan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const loanData = mapLoanToRow(loan);
    
    await dbConnection.query(
      `INSERT INTO loans (id, name, type, principal, current_balance, interest_rate, 
       monthly_payment, fees, start_date, term_months, extra_payment, color, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        loanData.name,
        loanData.type,
        loanData.principal,
        loanData.current_balance,
        loanData.interest_rate,
        loanData.monthly_payment,
        loanData.fees,
        loanData.start_date,
        loanData.term_months,
        loanData.extra_payment,
        loanData.color,
        loanData.currency
      ]
    );
    
    return { ...loan, id };
  } catch (error) {
    console.error('Error adding loan:', error);
    throw new Error(`Failed to add loan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const updateLoan = async (id: string, updates: Partial<Loan>): Promise<void> => {
  await initializeIfNeeded();
  
  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    // Build dynamic update query based on provided fields
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return; // Skip ID field
      
      // Map frontend field names to database column names
      const columnMap: Record<string, string> = {
        currentBalance: 'current_balance',
        interestRate: 'interest_rate',
        monthlyPayment: 'monthly_payment',
        startDate: 'start_date',
        termMonths: 'term_months',
        extraPayment: 'extra_payment'
      };
      
      const columnName = columnMap[key] || key;
      updateFields.push(`${columnName} = ?`);
      
      // Handle date conversion
      if (key === 'startDate' && value instanceof Date) {
        updateValues.push(value.toISOString().split('T')[0]);
      } else {
        updateValues.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      return; // No fields to update
    }
    
    updateValues.push(id); // Add ID for WHERE clause
    
    await dbConnection.query(
      `UPDATE loans SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );
  } catch (error) {
    console.error('Error updating loan:', error);
    throw new Error(`Failed to update loan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const deleteLoan = async (id: string): Promise<void> => {
  await initializeIfNeeded();
  
  try {
    const result = await dbConnection.query(
      'DELETE FROM loans WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Loan not found');
    }
  } catch (error) {
    console.error('Error deleting loan:', error);
    throw new Error(`Failed to delete loan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getLoanById = async (id: string): Promise<Loan | null> => {
  await initializeIfNeeded();
  
  try {
    const rows = await dbConnection.query(
      'SELECT * FROM loans WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return mapRowToLoan(rows[0]);
  } catch (error) {
    console.error('Error fetching loan by ID:', error);
    throw new Error(`Failed to fetch loan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getLoansByType = async (type: string): Promise<Loan[]> => {
  await initializeIfNeeded();
  
  try {
    const rows = await dbConnection.query(
      'SELECT * FROM loans WHERE type = ? ORDER BY name ASC',
      [type]
    );
    
    return rows.map(mapRowToLoan);
  } catch (error) {
    console.error('Error fetching loans by type:', error);
    throw new Error(`Failed to fetch loans by type: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Initialize with example data if database is empty
export const initializeExampleData = async (): Promise<void> => {
  await initializeIfNeeded();
  
  try {
    const existingLoans = await getAllLoans();
    if (existingLoans.length > 0) {
      console.log('Database already has loan data, skipping example data creation');
      return;
    }
    
    console.log('Creating example loan data...');
    
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
      await addLoan(loan);
    }
    
    console.log('Example loan data created successfully');
  } catch (error) {
    console.error('Failed to create example data:', error);
    throw error;
  }
};
