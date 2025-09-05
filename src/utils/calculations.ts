import { addMonths, differenceInMonths } from 'date-fns';
import { format } from 'date-fns';
import { Loan, PaymentScheduleItem, DebtSummary, StrategyResult, RepaymentStrategy, Currency } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  NOK: 'kr',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥'
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  NOK: 'nb-NO',
  GBP: 'en-GB',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP'
};

export const calculateMonthlyPayment = (
  principal: number,
  annualRate: number,
  termMonths: number
): number => {
  if (annualRate === 0) return principal / termMonths;
  
  const monthlyRate = annualRate / 100 / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
};

export const generateAmortizationSchedule = (
  loan: Loan,
  extraPayment: number = 0,
  lumpSum: number = 0
): PaymentScheduleItem[] => {
  console.log(`\n=== Generating schedule for ${loan.name} ===`);
  console.log(`Balance: ${loan.currentBalance}, Extra: ${extraPayment}, Lump: ${lumpSum}`);
  
  const schedule: PaymentScheduleItem[] = [];
  const monthlyRate = loan.interestRate / 100 / 12;
  let remainingBalance = loan.currentBalance - lumpSum;
  let cumulativeInterest = 0;
  let cumulativePrincipal = lumpSum; // Start with lump sum if provided
  
  let currentDate = new Date();
  let month = 1;

  while (remainingBalance > 0.01 && month <= loan.termMonths * 3) {
    const interestPayment = remainingBalance * monthlyRate;
    let principalPayment = loan.monthlyPayment - interestPayment;
    let extraPaymentThisMonth = extraPayment;

    principalPayment = Math.min(principalPayment + extraPaymentThisMonth, remainingBalance);

    remainingBalance -= principalPayment;
    cumulativeInterest += interestPayment;
    cumulativePrincipal += principalPayment;

    schedule.push({
      month,
      date: new Date(currentDate),
      monthlyPayment: loan.monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      fees: loan.fees,
      extraPayment: extraPaymentThisMonth,
      remainingBalance: Math.max(0, remainingBalance),
      cumulativeInterest,
      cumulativePrincipal
    });

    currentDate = addMonths(currentDate, 1);
    month++;

    if (remainingBalance <= 0) break;
  }

  console.log(`Schedule length: ${schedule.length} months`);
  console.log(`Total interest: ${cumulativeInterest}`);
  return schedule;
};

export const compareStrategies = (loan: Loan, extraPayment: number) => {
  const baseSchedule = generateAmortizationSchedule(loan);
  const strategySchedule = generateAmortizationSchedule(loan, extraPayment);

  const baseTotalInterest = baseSchedule.reduce((sum, item) => sum + item.interest, 0);
  const strategyTotalInterest = strategySchedule.reduce((sum, item) => sum + item.interest, 0);

  const basePayoffDate = baseSchedule[baseSchedule.length - 1]?.date || new Date();
  const strategyPayoffDate = strategySchedule[strategySchedule.length - 1]?.date || new Date();

  return {
    base: {
      totalInterest: baseTotalInterest,
      payoffDate: basePayoffDate,
      monthsRemaining: differenceInMonths(basePayoffDate, new Date())
    },
    withStrategy: {
      totalInterest: strategyTotalInterest,
      payoffDate: strategyPayoffDate,
      monthsRemaining: differenceInMonths(strategyPayoffDate, new Date()),
      savings: baseTotalInterest - strategyTotalInterest,
      timeSaved: differenceInMonths(basePayoffDate, strategyPayoffDate)
    }
  };
};

export const calculateDebtSummary = (loans: Loan[]): DebtSummary => {
  const totalDebt = loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  
  let totalInterest = 0;
  let weightedRate = 0;
  let latestPayoffDate = new Date();

  loans.forEach(loan => {
    const schedule = generateAmortizationSchedule(loan);
    const loanInterest = schedule.reduce((sum, item) => sum + item.interest, 0);
    totalInterest += loanInterest;
    
    weightedRate += loan.interestRate * (loan.currentBalance / totalDebt);
    
    if (schedule.length > 0) {
      const payoffDate = schedule[schedule.length - 1].date;
      if (payoffDate > latestPayoffDate) {
        latestPayoffDate = payoffDate;
      }
    }
  });

  const monthsRemaining = differenceInMonths(latestPayoffDate, new Date());

  return {
    totalDebt,
    totalMonthlyPayment,
    totalInterest,
    averageRate: weightedRate,
    payoffDate: latestPayoffDate,
    monthsRemaining
  };
};

export const formatCurrency = (amount: number, currency: Currency = 'USD'): string => {
  const locale = CURRENCY_LOCALES[currency];
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2
  }).format(amount);
};

export const formatPercentage = (rate: number): string => {
  return `${rate.toFixed(2)}%`;
};

export const formatDate = (date: Date, formatString: string = 'MMM dd, yyyy'): string => {
  return format(date, formatString);
};

export const exportToJSON = (data: any, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};