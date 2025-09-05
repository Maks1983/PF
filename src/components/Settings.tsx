import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { useSettingsContext } from './SettingsProvider';
import { Currency } from '../types';
import { Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'NOK', label: 'Norwegian Krone (kr)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' }
];

const DATE_FORMATS = [
  { value: 'YYYY-MM-DD', label: '2024-01-15' },
  { value: 'MM/DD/YYYY', label: '01/15/2024' },
  { value: 'DD/MM/YYYY', label: '15/01/2024' },
  { value: 'MMM DD, YYYY', label: 'Jan 15, 2024' }
];

export const Settings: React.FC = () => {
  const { settings, updateSettings, resetSettings, loading } = useSettingsContext();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleDefaultRateChange = (loanType: string, rate: number) => {
    setLocalSettings(prev => ({
      ...prev,
      defaultInterestRates: {
        ...prev.defaultInterestRates,
        [loanType]: rate
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card title="General Settings" subtitle="Configure display preferences">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Default Currency"
            value={localSettings.defaultCurrency}
            onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
          >
            {CURRENCIES.map(currency => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </Select>

          <Select
            label="Date Format"
            value={localSettings.dateFormat}
            onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
          >
            {DATE_FORMATS.map(format => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </Select>

          <Input
            label="Interest Rate Precision (Decimal Places)"
            type="number"
            value={localSettings.interestPrecision}
            onChange={(e) => handleSettingChange('interestPrecision', parseInt(e.target.value))}
            min="0"
            max="4"
          />
        </div>
      </Card>

      {/* Default Interest Rates */}
      <Card title="Default Interest Rates" subtitle="Set default rates for new loans by type">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Input
            label="Mortgage (%)"
            type="number"
            value={localSettings.defaultInterestRates.mortgage}
            onChange={(e) => handleDefaultRateChange('mortgage', parseFloat(e.target.value))}
            step="0.01"
            min="0"
            max="30"
          />
          
          <Input
            label="Personal Loan (%)"
            type="number"
            value={localSettings.defaultInterestRates.personal}
            onChange={(e) => handleDefaultRateChange('personal', parseFloat(e.target.value))}
            step="0.01"
            min="0"
            max="30"
          />
          
          <Input
            label="Auto Loan (%)"
            type="number"
            value={localSettings.defaultInterestRates.auto}
            onChange={(e) => handleDefaultRateChange('auto', parseFloat(e.target.value))}
            step="0.01"
            min="0"
            max="30"
          />
          
          <Input
            label="Student Loan (%)"
            type="number"
            value={localSettings.defaultInterestRates.student}
            onChange={(e) => handleDefaultRateChange('student', parseFloat(e.target.value))}
            step="0.01"
            min="0"
            max="30"
          />
          
          <Input
            label="Credit Card (%)"
            type="number"
            value={localSettings.defaultInterestRates.credit_card}
            onChange={(e) => handleDefaultRateChange('credit_card', parseFloat(e.target.value))}
            step="0.01"
            min="0"
            max="30"
          />
          
          <Input
            label="Other (%)"
            type="number"
            value={localSettings.defaultInterestRates.other}
            onChange={(e) => handleDefaultRateChange('other', parseFloat(e.target.value))}
            step="0.01"
            min="0"
            max="30"
          />
        </div>
      </Card>

      {/* Currency Information */}
      <Card title="Supported Currencies">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CURRENCIES.map(currency => (
            <div key={currency.value} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">{currency.value}</p>
                <p className="text-sm text-gray-600">{currency.label.split(' (')[0]}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-amber-600" />
            <p className="text-amber-800 font-medium">You have unsaved changes</p>
          </div>
          <p className="text-amber-700 text-sm mt-1">
            Don't forget to save your changes. Currency changes will be applied throughout the app immediately.
          </p>
        </div>
      )}
    </div>
  );
};