// Server initialization file
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize database connection
import dbConnection from './dbConnection.js';

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

// Export all server functions for easy access
export * from './debtFunctions.js';
