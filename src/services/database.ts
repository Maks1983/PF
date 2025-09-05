import { db } from './dbConnection';
import { Loan } from '../types';

// Data migration from IndexedDB to MariaDB
export const migrateFromIndexedDB = async (): Promise<void> => {
  try {
    // Check if we already have data in MariaDB
    const existingLoans = await db.query('SELECT COUNT(*) as count FROM loans');
    if (existingLoans[0].count > 0) {
      console.log('MariaDB already contains data, skipping migration');
      return;
    }

    // Try to get data from IndexedDB
    const indexedDB = window.indexedDB;
    if (!indexedDB) {
      console.log('IndexedDB not available, creating example data');
      await createExampleData();
      return;
    }

    // Open the old Dexie database
    const request = indexedDB.open('DebtManagementDB', 1);
    
    request.onsuccess = async (event) => {
      const oldDb = (event.target as IDBOpenDBRequest).result;
      
      try {
        const transaction = oldDb.transaction(['loans'], 'readonly');
        const store = transaction.objectStore('loans');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = async () => {
          const loans = getAllRequest.result;
          
          if (loans && loans.length > 0) {
            console.log(`Migrating ${loans.length} loans from IndexedDB to MariaDB`);
            
            for (const loan of loans) {
              await addLoan({
                id: loan.id,
                name: loan.name,
                type: loan.type,
                principal: loan.principal,
                currentBalance: loan.currentBalance,
                interestRate: loan.interestRate,
                monthlyPayment: loan.monthlyPayment,
                fees: loan.fees || 0,
                startDate: new Date(loan.startDate),
                termMonths: loan.termMonths,
                extraPayment: loan.extraPayment || 0,
                color: loan.color || '#1e40af',
                currency: loan.currency || 'USD'
              });
            }
            
            console.log('Migration completed successfully');
          } else {
            console.log('No loans found in IndexedDB, creating example data');
            await createExampleData();
          }
          
          oldDb.close();
        };
        
        getAllRequest.onerror = async () => {
          console.log('Error reading from IndexedDB, creating example data');
          await createExampleData();
          oldDb.close();
        };
        
      } catch (error) {
        console.error('Error during migration:', error);
        await createExampleData();
        oldDb.close();
      }
    };
    
    request.onerror = async () => {
      console.log('Could not open IndexedDB, creating example data');
      await createExampleData();
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    await createExampleData();
  }
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Initializing MariaDB connection...');
    await db.initialize();
    console.log('MariaDB connection initialized successfully');
    
    // Migrate data from IndexedDB if needed
    await migrateFromIndexedDB();
    console.log('Database initialization completed');
    
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
  await db.query(`
    INSERT INTO loans (
      id, name, type, principal, current_balance, interest_rate, 
      monthly_payment, fees, start_date, term_months, extra_payment, 
      color, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    loan.id,
    loan.name,
    loan.type,
    loan.principal,
    loan.currentBalance,
    loan.interestRate,
    loan.monthlyPayment,
    loan.fees || 0,
    loan.startDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
    loan.termMonths,
    loan.extraPayment || 0,
    loan.color || '#1e40af',
    loan.currency || 'USD'
  ]);
};

export const getAllLoans = async (): Promise<Loan[]> => {
  const rows = await db.query('SELECT * FROM loans ORDER BY created_at ASC');
  
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    principal: parseFloat(row.principal),
    currentBalance: parseFloat(row.current_balance),
    interestRate: parseFloat(row.interest_rate),
    monthlyPayment: parseFloat(row.monthly_payment),
    fees: parseFloat(row.fees),
    startDate: new Date(row.start_date),
    termMonths: row.term_months,
    extraPayment: parseFloat(row.extra_payment || 0),
    color: row.color,
    currency: row.currency
  }));
};

export const updateLoan = async (id: string, updates: Partial<Loan>): Promise<void> => {
  const setClause: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) {
    setClause.push('name = ?');
    values.push(updates.name);
  }
  if (updates.type !== undefined) {
    setClause.push('type = ?');
    values.push(updates.type);
  }
  if (updates.principal !== undefined) {
    setClause.push('principal = ?');
    values.push(updates.principal);
  }
  if (updates.currentBalance !== undefined) {
    setClause.push('current_balance = ?');
    values.push(updates.currentBalance);
  }
  if (updates.interestRate !== undefined) {
    setClause.push('interest_rate = ?');
    values.push(updates.interestRate);
  }
  if (updates.monthlyPayment !== undefined) {
    setClause.push('monthly_payment = ?');
    values.push(updates.monthlyPayment);
  }
  if (updates.fees !== undefined) {
    setClause.push('fees = ?');
    values.push(updates.fees);
  }
  if (updates.startDate !== undefined) {
    setClause.push('start_date = ?');
    values.push(updates.startDate.toISOString().split('T')[0]);
  }
  if (updates.termMonths !== undefined) {
    setClause.push('term_months = ?');
    values.push(updates.termMonths);
  }
  if (updates.extraPayment !== undefined) {
    setClause.push('extra_payment = ?');
    values.push(updates.extraPayment);
  }
  if (updates.color !== undefined) {
    setClause.push('color = ?');
    values.push(updates.color);
  }
  if (updates.currency !== undefined) {
    setClause.push('currency = ?');
    values.push(updates.currency);
  }
  
  if (setClause.length === 0) {
    return; // No updates to make
  }
  
  values.push(id);
  
  await db.query(`
    UPDATE loans 
    SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, values);
};

export const deleteLoan = async (id: string): Promise<void> => {
  await db.query('DELETE FROM loans WHERE id = ?', [id]);
};