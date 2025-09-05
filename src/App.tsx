import React, { useState, useEffect } from 'react';
import { SettingsProvider } from './components/SettingsProvider';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { LoanList } from './components/LoanList';
import { StrategySimulator } from './components/StrategySimulator';
import { DebtOptimizer } from './components/DebtOptimizer';
import { BankIntegration } from './components/BankIntegration';
import { Settings } from './components/Settings';
import { initializeDatabase } from './services/database';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsInitialized(true); // Still show the app even if DB init fails
      }
    };

    initialize();
  }, []);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'loans':
        return <LoanList />;
      case 'strategies':
        return <StrategySimulator />;
      case 'optimizer':
        return <DebtOptimizer />;
      case 'bank':
        return <BankIntegration />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Initializing Debt Manager...</h2>
          <p className="mt-2 text-sm text-gray-600">Setting up your personal finance dashboard</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
  return (
    <SettingsProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 p-8">
          {renderCurrentView()}
        </main>
      </div>
    </SettingsProvider>
  );
}

export default App;