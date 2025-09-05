import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeServer } from '../server/index';

console.log('Starting React app...');

// Initialize server before rendering React app
initializeServer().then(() => {
  console.log('Server initialized, starting React app...');
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  console.log('React app rendered');
}).catch((error) => {
  console.error('Failed to initialize server:', error);
  
  // Still render the app but show error state
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Database Connection Error</h1>
          <p className="text-red-700 mb-4">Failed to connect to the database.</p>
          <p className="text-sm text-red-600">Check your .env configuration and database connection.</p>
          <pre className="mt-4 p-4 bg-red-100 rounded text-left text-xs text-red-800">
            {error.message}
          </pre>
        </div>
      </div>
    </StrictMode>
  );
