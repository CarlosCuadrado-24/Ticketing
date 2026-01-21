import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Payment processor interfaces
export interface PaymentProcessor {
  processPayment(paymentData: PaymentData): Observable<PaymentResult>;
  validatePaymentData(paymentData: PaymentData): ValidationResult;
  getProcessorName(): string;
  getSupportedCardTypes(): string[];
}

export interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  amount: number;
  currency: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  processorResponse?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export enum PaymentProcessorType {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  MOCK = 'mock'
}

/**
 * Mock Payment Processor for development/testing
 */
class MockPaymentProcessor implements PaymentProcessor {
  processPayment(paymentData: PaymentData): Observable<PaymentResult> {
    return new Observable(observer => {
      // Simulate processing delay
      setTimeout(() => {
        // Simulate different scenarios based on card number
        const cardNumber = paymentData.cardNumber.replace(/\s/g, '');
        
        if (cardNumber.endsWith('0000')) {
          observer.next({
            success: false,
            error: 'Card declined'
          });
        } else if (cardNumber.endsWith('1111')) {
          observer.next({
            success: false,
            error: 'Insufficient funds'
          });
        } else {
          observer.next({
            success: true,
            transactionId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            processorResponse: {
              processor: 'mock',
              timestamp: new Date().toISOString()
            }
          });
        }
        observer.complete();
      }, 2000);
    });
  }

  validatePaymentData(paymentData: PaymentData): ValidationResult {
    const errors: string[] = [];

    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 13) {
      errors.push('Invalid card number');
    }

    if (!paymentData.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentData.expiryDate)) {
      errors.push('Invalid expiry date');
    }

    if (!paymentData.cvv || paymentData.cvv.length < 3) {
      errors.push('Invalid CVV');
    }

    if (!paymentData.cardholderName || paymentData.cardholderName.trim().length < 2) {
      errors.push('Invalid cardholder name');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Invalid amount');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getProcessorName(): string {
    return 'Mock Payment Processor';
  }

  getSupportedCardTypes(): string[] {
    return ['Visa', 'Mastercard', 'American Express', 'Discover'];
  }
}

/**
 * Stripe Payment Processor (placeholder implementation)
 */
class StripePaymentProcessor implements PaymentProcessor {
  processPayment(paymentData: PaymentData): Observable<PaymentResult> {
    // In a real implementation, this would integrate with Stripe's API
    return new Observable(observer => {
      observer.next({
        success: false,
        error: 'Stripe integration not implemented'
      });
      observer.complete();
    });
  }

  validatePaymentData(paymentData: PaymentData): ValidationResult {
    // Stripe-specific validation would go here
    return {
      isValid: false,
      errors: ['Stripe validation not implemented']
    };
  }

  getProcessorName(): string {
    return 'Stripe';
  }

  getSupportedCardTypes(): string[] {
    return ['Visa', 'Mastercard', 'American Express', 'Discover', 'Diners Club', 'JCB'];
  }
}

/**
 * PayPal Payment Processor (placeholder implementation)
 */
class PayPalPaymentProcessor implements PaymentProcessor {
  processPayment(paymentData: PaymentData): Observable<PaymentResult> {
    // In a real implementation, this would integrate with PayPal's API
    return new Observable(observer => {
      observer.next({
        success: false,
        error: 'PayPal integration not implemented'
      });
      observer.complete();
    });
  }

  validatePaymentData(paymentData: PaymentData): ValidationResult {
    // PayPal-specific validation would go here
    return {
      isValid: false,
      errors: ['PayPal validation not implemented']
    };
  }

  getProcessorName(): string {
    return 'PayPal';
  }

  getSupportedCardTypes(): string[] {
    return ['Visa', 'Mastercard', 'American Express', 'Discover'];
  }
}

/**
 * Payment Processor Factory
 * Implements Factory Pattern to create payment processors
 * Follows Open/Closed Principle - easy to add new processors without modifying existing code
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentProcessorFactory {
  
  /**
   * Create payment processor based on type
   */
  createProcessor(type: PaymentProcessorType): PaymentProcessor {
    switch (type) {
      case PaymentProcessorType.STRIPE:
        return new StripePaymentProcessor();
      
      case PaymentProcessorType.PAYPAL:
        return new PayPalPaymentProcessor();
      
      case PaymentProcessorType.MOCK:
      default:
        return new MockPaymentProcessor();
    }
  }

  /**
   * Get available processor types
   */
  getAvailableProcessors(): PaymentProcessorType[] {
    return Object.values(PaymentProcessorType);
  }

  /**
   * Get processor by name
   */
  getProcessorByName(name: string): PaymentProcessor | null {
    const type = Object.values(PaymentProcessorType).find(t => t === name.toLowerCase());
    return type ? this.createProcessor(type) : null;
  }

  /**
   * Get default processor (for current environment)
   */
  getDefaultProcessor(): PaymentProcessor {
    // In development, use mock processor
    // In production, this would be determined by configuration
    return this.createProcessor(PaymentProcessorType.MOCK);
  }

  /**
   * Validate processor availability
   */
  isProcessorAvailable(type: PaymentProcessorType): boolean {
    try {
      const processor = this.createProcessor(type);
      return processor !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get processor capabilities
   */
  getProcessorCapabilities(type: PaymentProcessorType): {
    name: string;
    supportedCardTypes: string[];
    features: string[];
  } {
    const processor = this.createProcessor(type);
    
    const features: string[] = [];
    
    switch (type) {
      case PaymentProcessorType.STRIPE:
        features.push('3D Secure', 'Recurring Payments', 'Multi-currency');
        break;
      case PaymentProcessorType.PAYPAL:
        features.push('PayPal Wallet', 'Buy Now Pay Later', 'Fraud Protection');
        break;
      case PaymentProcessorType.MOCK:
        features.push('Testing', 'Simulation', 'Development');
        break;
    }

    return {
      name: processor.getProcessorName(),
      supportedCardTypes: processor.getSupportedCardTypes(),
      features
    };
  }
}