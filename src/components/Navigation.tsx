import React from 'react';
import { BarChart3, CreditCard, TrendingUp, Settings as SettingsIcon, Banknote, Target } from 'lucide-react';
import { clsx } from 'clsx';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const navigationItems = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
  { id: 'loans', name: 'Loans', icon: CreditCard },
  { id: 'strategies', name: 'Strategy Simulator', icon: TrendingUp },
  { id: 'optimizer', name: 'Debt Optimizer', icon: Target },
  { id: 'bank', name: 'Bank Integration', icon: Banknote },
  { id: 'settings', name: 'Settings', icon: SettingsIcon },
];


export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  return (
    <nav className="bg-white shadow-sm border-r border-gray-200 min-h-screen w-64">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Debt Manager</h1>
        <p className="text-sm text-gray-600 mt-1">Personal Finance Tool</p>
      </div>
      
      <div className="px-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={clsx(
                'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1',
                currentView === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>© 2024 Personal Debt Manager</p>
          <p className="mt-1">Self-hosted financial tool</p>
        </div>
      </div>
    </nav>
  );
};