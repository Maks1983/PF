import { useState, useEffect } from 'react';
import { Currency } from '../types';
import { createContext, useContext } from 'react';

export interface AppSettings {
  defaultCurrency: Currency;
  dateFormat: string;
  interestPrecision: number;
  defaultInterestRates: {
    mortgage: number;
    personal: number;
    auto: number;
    student: number;
    credit_card: number;
    other: number;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: 'USD' as Currency,
  dateFormat: 'YYYY-MM-DD',
  interestPrecision: 2,
  defaultInterestRates: {
    mortgage: 3.5,
    personal: 7.0,
    auto: 4.5,
    student: 5.0,
    credit_card: 18.0,
    other: 6.0
  }
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load settings from localStorage on mount
    try {
      const savedSettings = localStorage.getItem('debtManagerSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    }
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      setLoading(true);
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem('debtManagerSettings', JSON.stringify(updatedSettings));
      setError(null);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('debtManagerSettings');
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings
  };
};

// Create settings context for global access
export const SettingsContext = createContext<{
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => void;
}>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  resetSettings: () => {}
});