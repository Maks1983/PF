// server/index.ts
import dotenv from 'dotenv';
dotenv.config();

import dbConnection from './dbConnection.js';

// Function to initialize the server
export const initializeServer = async (): Promise<void> => {
  try {
    console.log('Initializing server...');
    await dbConnection.initialize();
    console.log('Server initialized successfully');
  } catch (error) {
    console.error('Failed to initialize server:', error);
    throw error;
  }
};

// Export server functions for easy access
export * from './debtFunctions.js';

// Run initialization immediately when starting this file
initializeServer()
  .then(() => console.log('Database ready and tables verified'))
  .catch((err) => {
    console.error('Startup error:', err);
    process.exit(1);
  });
