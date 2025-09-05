import { addMonths, differenceInMonths } from 'date-fns';
import { generateAmortizationSchedule } from './calculations';
import { Loan, PaymentScheduleItem, DebtOptimizationStrategy, UserPriorities, OptimizationResult } from '../types';

// Export calculateBaselineSchedule for use in components
export interface DebtPaymentPlan {
  loanId: string;
  month: number;
  currentBalance: number;
  monthlyInterest: number;
  minimumPayment: number;
  principalPayment: number;
  extraPayment: number;
  totalPayment: number;
  remainingBalance: number;
  isExtraPayment: boolean;
  isPaidOff: boolean;
  freedPayment?: number;
  scrapeSaving?: number;
}

export interface MonthlyPaymentPlan {
  month: number;
  date: Date;
  payments: DebtPaymentPlan[];
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  remainingDebts: number;
  extraPaymentPool: number;
  totalScrapeSavings: number;
  totalFreedPayments: number;
  activeLoanCount: number;
}

interface LoanState {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  interestRate: number;
  originalMonthlyPayment: number;
  currentMinimumPayment: number;
  termMonths: number;
  isPaidOff: boolean;
  paidOffMonth?: number;
  previousBalance?: number;
  previousInterest?: number;
}

// Calculate baseline scenario (minimum payments only)
export const calculateBaselineSchedule = (loans: Loan[]): MonthlyPaymentPlan[] => {
  console.log('\n=== CALCULATING BASELINE SCHEDULE ===');
  const schedule: MonthlyPaymentPlan[] = [];
  const loanStates: LoanState[] = loans.map(loan => ({
    id: loan.id,
    name: loan.name,
    type: loan.type,
    currentBalance: loan.currentBalance,
    interestRate: loan.interestRate,
    originalMonthlyPayment: loan.monthlyPayment,
    currentMinimumPayment: loan.monthlyPayment,
    termMonths: loan.termMonths,
    isPaidOff: false
  }));

  loanStates.forEach(loan => {
    console.log(`${loan.name}: Balance ${loan.currentBalance}, Payment ${loan.originalMonthlyPayment}, Rate ${loan.interestRate}%`);
  });
  let month = 1;
  let currentDate = new Date();

  while (loanStates.some(loan => !loan.isPaidOff) && month <= 600) {
    const monthlyPlan: MonthlyPaymentPlan = {
      month,
      date: new Date(currentDate),
      payments: [],
      totalPayment: 0,
      totalInterest: 0,
      totalPrincipal: 0,
      remainingDebts: loanStates.filter(loan => !loan.isPaidOff).length,
      extraPaymentPool: 0,
      totalScrapeSavings: 0,
      totalFreedPayments: 0,
      activeLoanCount: loanStates.filter(loan => !loan.isPaidOff).length
    };

    loanStates.forEach(loanState => {
      if (!loanState.isPaidOff && loanState.currentBalance > 0.01) {
        // Calculate monthly interest
        const monthlyInterest = loanState.currentBalance * (loanState.interestRate / 100 / 12);
        
        // Calculate principal payment (minimum payment minus interest)
        let principalPayment = loanState.currentMinimumPayment - monthlyInterest;
        
        // Ensure we don't pay more than the remaining balance
        if (principalPayment > loanState.currentBalance) {
          principalPayment = loanState.currentBalance;
        }
        
        // Ensure principal payment is not negative
        if (principalPayment < 0) {
          principalPayment = 0;
        }

        // Update balance
        loanState.currentBalance -= principalPayment;
        
        // Check if paid off
        if (loanState.currentBalance <= 0.01) {
          loanState.isPaidOff = true;
          loanState.paidOffMonth = month;
          loanState.currentBalance = 0;
          console.log(`BASELINE: ${loanState.name} paid off in month ${month}`);
        }

        monthlyPlan.payments.push({
          loanId: loanState.id,
          month,
          currentBalance: loanState.currentBalance + principalPayment,
          monthlyInterest,
          minimumPayment: loanState.currentMinimumPayment,
          principalPayment,
          extraPayment: 0,
          totalPayment: loanState.currentMinimumPayment,
          remainingBalance: loanState.currentBalance,
          isExtraPayment: false,
          isPaidOff: loanState.isPaidOff
        });

        monthlyPlan.totalPayment += loanState.currentMinimumPayment;
        monthlyPlan.totalInterest += monthlyInterest;
        monthlyPlan.totalPrincipal += principalPayment;
      }
    });

    schedule.push(monthlyPlan);
    currentDate = addMonths(currentDate, 1);
    month++;
  }

  return schedule;
};

// 1. Avalanche Method (Lower Term - No Scrapes)
export const calculateAvalancheFixedStrategy = (
  loans: Loan[], 
  extraPaymentBase: number, 
  lumpSum: number = 0
): DebtOptimizationStrategy => {
  console.log('\n=== CALCULATING AVALANCHE (LOWER TERM) ===');
  console.log('Extra payment base:', extraPaymentBase);
  console.log('Lump sum:', lumpSum);
  
  const schedule: MonthlyPaymentPlan[] = [];
  const loanStates: LoanState[] = loans.map(loan => ({
    id: loan.id,
    name: loan.name,
    type: loan.type,
    currentBalance: loan.currentBalance - (lumpSum * (loan.currentBalance / loans.reduce((sum, l) => sum + l.currentBalance, 0))),
    interestRate: loan.interestRate,
    originalMonthlyPayment: loan.monthlyPayment,
    currentMinimumPayment: loan.monthlyPayment,
    termMonths: loan.termMonths,
    isPaidOff: false
  }));

  let month = 1;
  let currentDate = new Date();
  let totalInterest = 0;
  // Avalanche: Fixed extra payment throughout, no freed payments
  const fixedExtraPayment = extraPaymentBase;

  while (loanStates.some(loan => !loan.isPaidOff) && month <= 600) {
    const monthlyPlan: MonthlyPaymentPlan = {
      month,
      date: new Date(currentDate),
      payments: [],
      totalPayment: 0,
      totalInterest: 0,
      totalPrincipal: 0,
      remainingDebts: loanStates.filter(loan => !loan.isPaidOff).length,
      extraPaymentPool: fixedExtraPayment,
      totalScrapeSavings: 0,
      totalFreedPayments: 0, // No freed payments in Avalanche
      activeLoanCount: loanStates.filter(loan => !loan.isPaidOff).length
    };

    // Step 1: Pay minimum payments on all active loans
    loanStates.forEach(loanState => {
      if (!loanState.isPaidOff) {
        const monthlyInterest = loanState.currentBalance * (loanState.interestRate / 100 / 12);
        const principalPayment = Math.min(
          loanState.currentMinimumPayment - monthlyInterest,
          loanState.currentBalance
        );

        loanState.currentBalance -= principalPayment;
        totalInterest += monthlyInterest;

        // Check if paid off by minimum payment
        if (loanState.currentBalance <= 0.01) {
          loanState.isPaidOff = true;
          loanState.paidOffMonth = month;
          loanState.currentBalance = 0;
          console.log(`AVALANCHE: ${loanState.name} paid off in month ${month}`);
        }

        monthlyPlan.payments.push({
          loanId: loanState.id,
          month,
          currentBalance: loanState.currentBalance + principalPayment,
          monthlyInterest,
          minimumPayment: loanState.currentMinimumPayment,
          principalPayment,
          extraPayment: 0,
          totalPayment: loanState.currentMinimumPayment,
          remainingBalance: loanState.currentBalance,
          isExtraPayment: false,
          isPaidOff: loanState.isPaidOff,
          freedPayment: 0 // No freed payments in Avalanche
        });

        monthlyPlan.totalPayment += loanState.currentMinimumPayment;
        monthlyPlan.totalInterest += monthlyInterest;
        monthlyPlan.totalPrincipal += principalPayment;
      }
    });

    // Step 2: Apply fixed extra payment to highest interest rate debt
    if (fixedExtraPayment > 0) {
      // Sort by highest interest rate first, then by largest balance for ties
      const targetLoan = loanStates
        .filter(loan => !loan.isPaidOff)
        .sort((a, b) => {
          if (Math.abs(a.interestRate - b.interestRate) < 0.01) {
            return b.currentBalance - a.currentBalance; // Larger balance for ties
          }
          return b.interestRate - a.interestRate; // Highest interest rate first
        })[0];

      if (targetLoan) {
        const extraPrincipal = Math.min(fixedExtraPayment, targetLoan.currentBalance);
        targetLoan.currentBalance -= extraPrincipal;

        // Check if paid off by extra payment
        if (targetLoan.currentBalance <= 0.01) {
          targetLoan.isPaidOff = true;
          targetLoan.paidOffMonth = month;
          targetLoan.currentBalance = 0;
          console.log(`AVALANCHE: ${targetLoan.name} paid off in month ${month} with extra payment`);
        }

        // Update the payment record
        const paymentRecord = monthlyPlan.payments.find(p => p.loanId === targetLoan.id);
        if (paymentRecord) {
          paymentRecord.extraPayment = extraPrincipal;
          paymentRecord.principalPayment += extraPrincipal;
          paymentRecord.totalPayment += extraPrincipal;
          paymentRecord.remainingBalance = targetLoan.currentBalance;
          paymentRecord.isExtraPayment = true;
          paymentRecord.isPaidOff = targetLoan.isPaidOff;
        }

        monthlyPlan.totalPayment += extraPrincipal;
        monthlyPlan.totalPrincipal += extraPrincipal;
      }
    }

    schedule.push(monthlyPlan);
    currentDate = addMonths(currentDate, 1);
    month++;
    
    // Safety check: if all loans are paid off, break
    if (loanStates.every(loan => loan.isPaidOff)) {
      break;
    }
  }

  const payoffDate = schedule[schedule.length - 1]?.date || new Date();

  return {
    id: 'avalanche_fixed',
    name: 'Avalanche (Lower Term)',
    type: 'avalanche_fixed',
    description: 'Pay minimums on all debts. Fixed extra payment goes to highest interest rate debt. Maintains same total monthly payment throughout.',
    totalInterest,
    interestSaved: 0,
    monthsSaved: 0,
    payoffDate,
    monthlySchedule: schedule,
    notes: 'Mathematically optimal for minimizing total interest paid. Goal: Lower term, not total time.',
    perDebtDetails: calculatePerDebtDetails(loans, schedule)
  };
};

// 2. Snowball Method (Lower Term - No Scrapes)  
export const calculateSnowballFixedStrategy = (
  loans: Loan[], 
  extraPaymentBase: number, 
  lumpSum: number = 0
): DebtOptimizationStrategy => {
  console.log('\n=== CALCULATING SNOWBALL (LOWER TERM) ===');
  console.log('Extra payment base:', extraPaymentBase);
  console.log('Lump sum:', lumpSum);
  
  const schedule: MonthlyPaymentPlan[] = [];
  const loanStates: LoanState[] = loans.map(loan => ({
    id: loan.id,
    name: loan.name,
    type: loan.type,
    currentBalance: loan.currentBalance - (lumpSum * (loan.currentBalance / loans.reduce((sum, l) => sum + l.currentBalance, 0))),
    interestRate: loan.interestRate,
    originalMonthlyPayment: loan.monthlyPayment,
    currentMinimumPayment: loan.monthlyPayment,
    termMonths: loan.termMonths,
    isPaidOff: false
  }));

  let month = 1;
  let currentDate = new Date();
  let totalInterest = 0;
  // Snowball: Fixed extra payment throughout, no freed payments
  const fixedExtraPayment = extraPaymentBase;

  while (loanStates.some(loan => !loan.isPaidOff) && month <= 600) {
    const monthlyPlan: MonthlyPaymentPlan = {
      month,
      date: new Date(currentDate),
      payments: [],
      totalPayment: 0,
      totalInterest: 0,
      totalPrincipal: 0,
      remainingDebts: loanStates.filter(loan => !loan.isPaidOff).length,
      extraPaymentPool: fixedExtraPayment,
      totalScrapeSavings: 0,
      totalFreedPayments: 0, // No freed payments in fixed Snowball
      activeLoanCount: loanStates.filter(loan => !loan.isPaidOff).length
    };

    // Step 1: Pay minimum payments on all active loans
    loanStates.forEach(loanState => {
      if (!loanState.isPaidOff) {
        const monthlyInterest = loanState.currentBalance * (loanState.interestRate / 100 / 12);
        let principalPayment = Math.min(
          loanState.currentMinimumPayment - monthlyInterest,
          loanState.currentBalance
        );
        
        // Ensure principal payment is not negative
        if (principalPayment < 0) {
          principalPayment = Math.min(loanState.currentBalance, 50); // Minimum principal payment
        }

        loanState.currentBalance -= principalPayment;
        totalInterest += monthlyInterest;

        // Check if paid off by minimum payment
        if (loanState.currentBalance <= 0.01) {
          loanState.isPaidOff = true;
          loanState.paidOffMonth = month;
          loanState.currentBalance = 0;
          console.log(`SNOWBALL: ${loanState.name} paid off in month ${month}`);
        }

        monthlyPlan.payments.push({
          loanId: loanState.id,
          month,
          currentBalance: loanState.currentBalance + principalPayment,
          monthlyInterest,
          minimumPayment: loanState.currentMinimumPayment,
          principalPayment,
          extraPayment: 0,
          totalPayment: loanState.currentMinimumPayment,
          remainingBalance: loanState.currentBalance,
          isExtraPayment: false,
          isPaidOff: loanState.isPaidOff,
          freedPayment: 0, // No freed payments in fixed Snowball
          scrapeSaving: 0  // No scrapes in fixed Snowball
        });

        monthlyPlan.totalPayment += loanState.currentMinimumPayment;
        monthlyPlan.totalInterest += monthlyInterest;
        monthlyPlan.totalPrincipal += principalPayment;
      }
    });

    // Step 2: Apply fixed extra payment to smallest balance debt
    if (fixedExtraPayment > 0) {
      const targetLoan = loanStates
        .filter(loan => !loan.isPaidOff)
        .sort((a, b) => {
          if (Math.abs(a.interestRate - b.interestRate) < 0.01) {
            return b.interestRate - a.interestRate; // Higher interest rate for ties
          }
          return a.currentBalance - b.currentBalance; // Smallest balance first
        })[0];

      if (targetLoan) {
        const extraPrincipal = Math.min(fixedExtraPayment, targetLoan.currentBalance);
        targetLoan.currentBalance -= extraPrincipal;
        
        console.log(`Month ${month}: Applied ${extraPrincipal} extra to ${targetLoan.name} (balance: ${targetLoan.currentBalance})`);

        // Check if paid off by extra payment
        if (targetLoan.currentBalance <= 0.01) {
          targetLoan.isPaidOff = true;
          targetLoan.paidOffMonth = month;
          targetLoan.currentBalance = 0;
          console.log(`SNOWBALL: ${targetLoan.name} paid off in month ${month} with extra payment`);
        }

        const paymentRecord = monthlyPlan.payments.find(p => p.loanId === targetLoan.id);
        if (paymentRecord) {
          paymentRecord.extraPayment = extraPrincipal;
          paymentRecord.principalPayment += extraPrincipal;
          paymentRecord.totalPayment += extraPrincipal;
          paymentRecord.remainingBalance = targetLoan.currentBalance;
          paymentRecord.isExtraPayment = true;
          paymentRecord.isPaidOff = targetLoan.isPaidOff;
        }

        monthlyPlan.totalPayment += extraPrincipal;
        monthlyPlan.totalPrincipal += extraPrincipal;
      }
    }

    schedule.push(monthlyPlan);
    currentDate = addMonths(currentDate, 1);
    month++;
    
    // Safety check: if all loans are paid off, break
    if (loanStates.every(loan => loan.isPaidOff)) {
      break;
    }
  }

  const payoffDate = schedule[schedule.length - 1]?.date || new Date();
  
  console.log(`SNOWBALL completed in ${schedule.length} months`);
  console.log(`Total interest: ${totalInterest}`);
  console.log(`Payoff date: ${payoffDate}`);

  return {
    id: 'snowball_fixed',
    name: 'Snowball (Lower Term)',
    type: 'snowball_fixed',
    description: 'Pay minimums on all debts. Fixed extra payment goes to smallest balance debt. Maintains same total monthly payment throughout.',
    totalInterest,
    interestSaved: 0,
    monthsSaved: 0,
    payoffDate,
    monthlySchedule: schedule,
    notes: 'Psychologically satisfying for quick wins. Goal: Lower term, not total time.',
    perDebtDetails: calculatePerDebtDetails(loans, schedule)
  };
};

// 3. Snowball + Scrapes (Lower Total Time)
export const calculateSnowballScrapesStrategy = (
  loans: Loan[], 
  extraPaymentBase: number, 
  lumpSum: number = 0
): DebtOptimizationStrategy => {
  console.log('\n=== CALCULATING SNOWBALL + SCRAPES (LOWER TOTAL TIME) ===');
  console.log('Extra payment base:', extraPaymentBase);
  console.log('Lump sum:', lumpSum);
  
  const schedule: MonthlyPaymentPlan[] = [];
  
  // Apply lump sum to smallest balance first (snowball method)
  const sortedLoans = [...loans].sort((a, b) => a.currentBalance - b.currentBalance);
  let remainingLumpSum = lumpSum;
  
  const loanStates: LoanState[] = loans.map(loan => {
    let newBalance = loan.currentBalance;
    
    // Apply lump sum to this loan if it's the next smallest and we have lump sum remaining
    const loanIndex = sortedLoans.findIndex(l => l.id === loan.id);
    if (remainingLumpSum > 0) {
      // Check if this loan should receive lump sum based on snowball order
      let shouldReceiveLumpSum = true;
      for (let i = 0; i < loanIndex; i++) {
        const smallerLoan = sortedLoans[i];
        const smallerLoanState = loans.find(l => l.id === smallerLoan.id);
        if (smallerLoanState && smallerLoanState.currentBalance > 0) {
          shouldReceiveLumpSum = false;
          break;
        }
      }
      
      if (shouldReceiveLumpSum) {
        const lumpSumToApply = Math.min(remainingLumpSum, loan.currentBalance);
        newBalance = Math.max(0, loan.currentBalance - lumpSumToApply);
        remainingLumpSum -= lumpSumToApply;
        console.log(`Applied ${lumpSumToApply} lump sum to ${loan.name}, new balance: ${newBalance}`);
      }
    }
    
    return {
      id: loan.id,
      name: loan.name,
      type: loan.type,
      currentBalance: newBalance,
      interestRate: loan.interestRate,
      originalMonthlyPayment: loan.monthlyPayment,
      currentMinimumPayment: loan.monthlyPayment,
      termMonths: loan.termMonths,
      isPaidOff: newBalance <= 0.01,
      previousBalance: newBalance, // Track previous balance for scrapes calculation
      previousInterest: 0 // Track previous month's interest
    };
  });

  // Log initial state
  loanStates.forEach(loan => {
    console.log(`${loan.name}: Balance ${loan.currentBalance}, Payment ${loan.originalMonthlyPayment}, Rate ${loan.interestRate}%`);
  });
  
  // Check if any loans are already paid off by lump sum
  let initialFreedPayments = 0;
  loanStates.forEach(loan => {
    if (loan.isPaidOff) {
      initialFreedPayments += loan.originalMonthlyPayment;
      console.log(`${loan.name} paid off by lump sum, freed payment: ${loan.originalMonthlyPayment}`);
    }
  });
  
  let month = 1;
  let currentDate = new Date();
  let totalInterest = 0;
  let freedPaymentPool = initialFreedPayments;
  let scrapeSavingsPool = 0; // Track accumulated scrape savings
  
  console.log(`Starting with freed payment pool: ${freedPaymentPool}`);

  while (loanStates.some(loan => !loan.isPaidOff && loan.currentBalance > 0.01) && month <= 600) {
    console.log(`\n--- Month ${month} ---`);
    console.log(`Freed payment pool: ${freedPaymentPool}`);
    console.log(`Scrape savings pool: ${scrapeSavingsPool}`);
    console.log(`Extra payment base: ${extraPaymentBase}`);
    
    let thisMonthScrapeSavings = 0;
    
    const monthlyPlan: MonthlyPaymentPlan = {
      month,
      date: new Date(currentDate),
      payments: [],
      totalPayment: 0,
      totalInterest: 0,
      totalPrincipal: 0,
      remainingDebts: loanStates.filter(loan => !loan.isPaidOff).length,
      extraPaymentPool: extraPaymentBase + freedPaymentPool,
      totalScrapeSavings: thisMonthScrapeSavings,
      totalFreedPayments: freedPaymentPool,
      activeLoanCount: loanStates.filter(loan => !loan.isPaidOff).length
    };

    let newFreedPayments = 0;

    // Step 1: Pay minimum payments on all active loans
    loanStates.forEach(loanState => {
      if (!loanState.isPaidOff && loanState.currentBalance > 0.01) {
        const monthlyInterest = loanState.currentBalance * (loanState.interestRate / 100 / 12);
        let principalPayment = Math.min(
          loanState.currentMinimumPayment - monthlyInterest,
          loanState.currentBalance
        );
        
        if (principalPayment < 0) {
          principalPayment = Math.min(loanState.currentBalance, 50);
        }

        loanState.currentBalance -= principalPayment;
        totalInterest += monthlyInterest;
        
        if (loanState.currentBalance <= 0.01) {
          loanState.isPaidOff = true;
          loanState.paidOffMonth = month;
          loanState.currentBalance = 0;
          newFreedPayments += loanState.originalMonthlyPayment;
          console.log(`${loanState.name} PAID OFF in month ${month}!`);
        }

        monthlyPlan.payments.push({
          loanId: loanState.id,
          month,
          currentBalance: loanState.currentBalance + principalPayment,
          monthlyInterest,
          minimumPayment: loanState.originalMonthlyPayment,
          principalPayment,
          extraPayment: 0,
          totalPayment: loanState.originalMonthlyPayment,
          remainingBalance: loanState.currentBalance,
          isExtraPayment: false,
          isPaidOff: loanState.isPaidOff,
          freedPayment: 0,
          scrapeSaving: 0
        });

        monthlyPlan.totalPayment += loanState.originalMonthlyPayment;
        monthlyPlan.totalInterest += monthlyInterest;
        monthlyPlan.totalPrincipal += principalPayment;
      }
    });

    // Step 2: Apply extra payment pool to smallest balance debt
    const totalExtraPayment = extraPaymentBase + freedPaymentPool;
    if (totalExtraPayment > 0) {
      const targetLoan = loanStates
        .filter(loan => !loan.isPaidOff && loan.currentBalance > 0.01)
        .sort((a, b) => {
          if (Math.abs(a.currentBalance - b.currentBalance) < 0.01) {
            return b.interestRate - a.interestRate;
          }
          return a.currentBalance - b.currentBalance;
        })[0];

      if (targetLoan) {
        const extraPrincipal = Math.min(totalExtraPayment, targetLoan.currentBalance);
        targetLoan.currentBalance -= extraPrincipal;

        if (targetLoan.currentBalance <= 0.01) {
          targetLoan.isPaidOff = true;
          targetLoan.paidOffMonth = month;
          targetLoan.currentBalance = 0;
          newFreedPayments += targetLoan.originalMonthlyPayment;
          console.log(`${targetLoan.name} extra payment: ${extraPrincipal}, remaining: ${targetLoan.currentBalance}`);
          console.log(`${targetLoan.name} freed payment: ${targetLoan.originalMonthlyPayment}`);
        }

        const paymentRecord = monthlyPlan.payments.find(p => p.loanId === targetLoan.id);
        if (paymentRecord) {
          paymentRecord.extraPayment = extraPrincipal;
          paymentRecord.principalPayment += extraPrincipal;
          paymentRecord.totalPayment += extraPrincipal;
          paymentRecord.remainingBalance = targetLoan.currentBalance;
          paymentRecord.isExtraPayment = true;
          paymentRecord.isPaidOff = targetLoan.isPaidOff;
          
          paymentRecord.freedPayment = targetLoan.isPaidOff ? targetLoan.originalMonthlyPayment : 0;
        }

        monthlyPlan.totalPayment += extraPrincipal;
        monthlyPlan.totalPrincipal += extraPrincipal;
      }
    }

    // Update pools for next month
    freedPaymentPool += newFreedPayments;
    monthlyPlan.totalFreedPayments = newFreedPayments;
    monthlyPlan.totalScrapeSavings = 0;

    schedule.push(monthlyPlan);
    currentDate = addMonths(currentDate, 1);
    month++;
    
    if (loanStates.every(loan => loan.isPaidOff || loan.currentBalance <= 0.01)) {
      break;
    }
  }

  const payoffDate = schedule[schedule.length - 1]?.date || new Date();

  return {
    id: 'snowball_scrapes',
    name: 'Snowball + Scrapes (Lower Total Time)',
    type: 'snowball_scrapes',
    description: 'Pay minimums on all debts. Extra payments go to smallest balance debt. Freed payments from paid-off loans accelerate remaining debts.',
    totalInterest,
    interestSaved: 0,
    monthsSaved: 0,
    payoffDate,
    monthlySchedule: schedule,
    notes: 'Best for minimizing total time to debt freedom. Freed payments create compound acceleration effect.',
    perDebtDetails: calculatePerDebtDetails(loans, schedule)
  };
};

// Helper function to calculate per-debt details for any strategy
const calculatePerDebtDetails = (loans: Loan[], schedule: MonthlyPaymentPlan[]) => {
  return loans.map(loan => {
    console.log(`\n=== Calculating details for ${loan.name} ===`);
    console.log(`Current balance: ${loan.currentBalance}`);
    console.log(`Monthly payment: ${loan.monthlyPayment}`);
    console.log(`Interest rate: ${loan.interestRate}%`);
    
    // Find when this loan gets paid off
    const payoffMonth = schedule.findIndex(month => 
      month.payments.find(p => p.loanId === loan.id && p.isPaidOff)
    ) + 1;
    console.log(`Strategy payoff month: ${payoffMonth}`);
    
    // Calculate total interest paid for this loan in this strategy
    const loanTotalInterest = schedule.reduce((sum, month) => {
      const payment = month.payments.find(p => p.loanId === loan.id);
      return sum + (payment?.monthlyInterest || 0);
    }, 0);
    console.log(`Strategy total interest: ${loanTotalInterest}`);
    
    // Calculate baseline for this loan for comparison (minimum payments only)
    const baselineSchedule = generateAmortizationSchedule(loan, 0, 0);
    const baselineTotalInterest = baselineSchedule.reduce((sum, item) => sum + item.interest, 0);
    const baselineMonths = baselineSchedule.length;
    console.log(`Baseline months: ${baselineMonths}`);
    console.log(`Baseline total interest: ${baselineTotalInterest}`);
    
    // Calculate actual months saved (baseline months - strategy months)
    const actualMonthsSaved = Math.max(0, baselineMonths - (payoffMonth || baselineMonths));
    console.log(`Months saved: ${actualMonthsSaved} (${baselineMonths} - ${payoffMonth})`);
    
    return {
      loanId: loan.id,
      loanName: loan.name,
      totalInterest: loanTotalInterest,
      interestSaved: baselineTotalInterest - loanTotalInterest,
      monthsSaved: actualMonthsSaved,
      payoffDate: payoffMonth > 0 ? schedule[payoffMonth - 1]?.date || new Date() : new Date(),
      payoffMonth: payoffMonth || baselineMonths
    };
  });
};

// Calculate all strategies and provide recommendations
export const optimizeDebtPayoff = (
  loans: Loan[],
  extraPaymentBase: number,
  lumpSum: number = 0
): OptimizationResult => {
  console.log('\n=== DEBT OPTIMIZATION ===');
  console.log('Extra Payment:', extraPaymentBase);
  console.log('Lump Sum:', lumpSum);
  
  // Calculate baseline (minimum payments only)
  const baselineSchedule = calculateBaselineSchedule(loans);
  const baselineTotalInterest = baselineSchedule.reduce((sum, month) => sum + month.totalInterest, 0);
  const baselineMonths = baselineSchedule.length;
  const baselinePayoffDate = baselineSchedule[baselineSchedule.length - 1]?.date || new Date();
  
  console.log('Baseline:', {
    totalInterest: baselineTotalInterest,
    months: baselineMonths,
    payoffDate: baselinePayoffDate
  });

  // Calculate all strategies
  const strategies: DebtOptimizationStrategy[] = [
    calculateAvalancheFixedStrategy(loans, extraPaymentBase, lumpSum),
    calculateSnowballFixedStrategy(loans, extraPaymentBase, lumpSum),
    calculateSnowballScrapesStrategy(loans, extraPaymentBase, lumpSum)
  ];

  // Calculate savings and score each strategy
  const scoredStrategies = strategies.map(strategy => {
    const interestSaved = baselineTotalInterest - strategy.totalInterest;
    const monthsSaved = Math.max(0, baselineMonths - strategy.monthlySchedule.length);
    
    console.log(`\n=== SCORING ${strategy.name} ===`);
    console.log('Interest saved:', interestSaved);
    console.log('Months saved:', monthsSaved);
    console.log('Total interest:', strategy.totalInterest);
    console.log('Payoff date:', strategy.payoffDate);

    return {
      ...strategy,
      interestSaved,
      monthsSaved
    };
  });

  console.log('\n=== STRATEGY COMPARISON ===');
  scoredStrategies.forEach(strategy => {
    console.log(`${strategy.name}: Interest Saved: ${strategy.interestSaved}, Months Saved: ${strategy.monthsSaved}`);
  });

  // Find best strategy by interest savings (primary) and time savings (secondary)
  const bestStrategy = scoredStrategies.reduce((best, current) => {
    if (Math.abs((current.interestSaved || 0) - (best.interestSaved || 0)) > 1000) {
      return (current.interestSaved || 0) > (best.interestSaved || 0) ? current : best;
    }
    return (current.monthsSaved || 0) > (best.monthsSaved || 0) ? current : best;
  });

  // Generate objective explanation
  const explanation = `The ${bestStrategy.name} provides the optimal balance of interest savings (${Math.round(bestStrategy.interestSaved || 0).toLocaleString()}) and time savings (${bestStrategy.monthsSaved} months). ${
    bestStrategy.type.includes('scrapes') 
      ? 'The scrapes feature automatically reduces payments as interest decreases, accelerating payoff.' 
      : ''
  }`;

  return {
    strategies: scoredStrategies,
    recommendedStrategy: bestStrategy,
    explanation,
    userPriorities: { speed: 0, savings: 0, cashFlow: 0 }, // Not used anymore
    baselineSchedule
  };
};

const generateRecommendationExplanation = (
  recommended: DebtOptimizationStrategy,
  priorities: UserPriorities,
  allStrategies: DebtOptimizationStrategy[]
): string => {
  // This function is no longer used but keeping for compatibility
  return `The ${recommended.name} provides optimal results based on mathematical analysis of interest savings and payoff time.`;
};