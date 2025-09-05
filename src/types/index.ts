export interface Loan {
  id: string;
  name: string;
  type: 'mortgage' | 'personal' | 'auto' | 'student' | 'credit_card' | 'other';
  principal: number;
  currentBalance: number;
  interestRate: number; // Annual percentage rate
  monthlyPayment: number;
  fees: number; // Monthly fees
  startDate: Date;
  termMonths: number;
  extraPayment?: number;
  color?: string;
  currency?: Currency;
}

export interface PaymentScheduleItem {
  month: number;
  date: Date;
  monthlyPayment: number;
  principal: number;
  interest: number;
  fees: number;
  extraPayment: number;
  remainingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface RepaymentStrategy {
  id: string;
  name: string;
  type: 'avalanche' | 'snowball' | 'hybrid' | 'avalanche_scrapes' | 'snowball_scrapes' | 'hybrid_scrapes';
  extraPayment: number;
  lumpSum?: number;
  enableScrapes: boolean;
  startDate?: Date;
  hybridWeight?: number; // For hybrid method: 0-100, where 100 = pure avalanche, 0 = pure snowball
}

export interface DebtSummary {
  totalDebt: number;
  totalMonthlyPayment: number;
  totalInterest: number;
  averageRate: number;
  payoffDate: Date;
  monthsRemaining: number;
}

export interface StrategyResult {
  totalInterest: number;
  payoffDate: Date;
  monthsRemaining: number;
  newMonthlyPayment?: number;
  interestSaved: number;
  timeSaved: number;
  totalScrapes?: number;
}

export interface DebtOptimizationStrategy {
  id: string;
  name: string;
  type: 'avalanche' | 'snowball' | 'avalanche_scrapes' | 'snowball_scrapes';
  description: string;
  totalInterest: number;
  interestSaved: number;
  monthsSaved: number;
  payoffDate: Date;
  monthlySchedule: any[];
  score?: number;
  notes?: string;
}

export interface ScheduledPayment {
  id: string;
  loanId: string;
  amount: number;
  dayOfMonth: number; // 1-31
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  description?: string;
  createdAt: Date;
}

export interface AppliedStrategy {
  id: string;
  strategyId: string;
  strategyName: string;
  appliedAt: Date;
  extraPayment: number;
  lumpSum?: number;
  hybridWeight?: number;
  enableScrapes: boolean;
  scheduledPayments: ScheduledPayment[];
}

export interface UserPriorities {
  speed: number; // 0-100
  savings: number; // 0-100
  cashFlow: number; // 0-100
}

export interface OptimizationResult {
  strategies: DebtOptimizationStrategy[];
  recommendedStrategy: DebtOptimizationStrategy;
  explanation: string;
  userPriorities: UserPriorities;
  baselineSchedule: any[];
}

export type Currency = 'USD' | 'EUR' | 'NOK' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export interface PaymentRequest {
  loanId: string;
  amount: number;
  currency: Currency;
  type: 'regular' | 'extra' | 'strategy';
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
  timestamp: Date;
}