import { PaymentRequest, PaymentResponse, Currency } from '../types';

// Mock Bank API Service
class BankApiService {
  private baseUrl = 'https://api.mockbank.com'; // Mock endpoint
  
  async makePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock validation
    if (request.amount <= 0) {
      return {
        success: false,
        error: 'Invalid payment amount',
        timestamp: new Date()
      };
    }
    
    if (request.amount > 100000) {
      return {
        success: false,
        error: 'Payment amount exceeds daily limit',
        timestamp: new Date()
      };
    }
    
    // Mock successful payment
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      transactionId,
      timestamp: new Date()
    };
  }
  
  async validatePayment(request: PaymentRequest): Promise<{ valid: boolean; error?: string }> {
    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (request.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }
    
    if (request.amount > 100000) {
      return { valid: false, error: 'Amount exceeds daily limit of 100,000' };
    }
    
    return { valid: true };
  }
  
  getSupportedCurrencies(): Currency[] {
    return ['NOK', 'EUR', 'USD'];
  }
}

export const bankApi = new BankApiService();