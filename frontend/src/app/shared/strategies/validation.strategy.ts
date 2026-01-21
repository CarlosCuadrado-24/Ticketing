import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

// Strategy interfaces
export interface ValidationStrategy {
  validate(data: any): Observable<ValidationResult>;
  getStrategyName(): string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export enum ValidationType {
  EMAIL = 'email',
  PASSWORD = 'password',
  PHONE = 'phone',
  CREDIT_CARD = 'creditCard',
  EVENT_DATA = 'eventData',
  USER_PROFILE = 'userProfile',
  TICKET_SELECTION = 'ticketSelection'
}

/**
 * Email Validation Strategy
 */
class EmailValidationStrategy implements ValidationStrategy {
  validate(email: string): Observable<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
      } else {
        // Check for common typos
        const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
        const domain = email.split('@')[1];
        
        if (domain && !commonDomains.includes(domain)) {
          const suggestions = this.suggestDomain(domain, commonDomains);
          if (suggestions.length > 0) {
            warnings.push(`Did you mean ${suggestions[0]}?`);
          }
        }
      }
    }

    return of({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  getStrategyName(): string {
    return 'Email Validation';
  }

  private suggestDomain(domain: string, commonDomains: string[]): string[] {
    return commonDomains.filter(common => 
      this.levenshteinDistance(domain, common) <= 2
    );
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

/**
 * Password Validation Strategy
 */
class PasswordValidationStrategy implements ValidationStrategy {
  validate(password: string): Observable<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      
      if (password.length > 128) {
        errors.push('Password must not exceed 128 characters');
      }
      
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      
      if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push('Password must contain at least one special character');
      }
      
      // Check for common weak passwords
      const commonPasswords = ['password', '123456', 'qwerty', 'abc123'];
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('This password is too common and easily guessed');
      }
      
      // Check for sequential characters
      if (/123|abc|qwe/i.test(password)) {
        warnings.push('Avoid using sequential characters for better security');
      }
    }

    return of({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  getStrategyName(): string {
    return 'Password Validation';
  }
}

/**
 * Credit Card Validation Strategy
 */
class CreditCardValidationStrategy implements ValidationStrategy {
  validate(cardData: { cardNumber: string; expiryDate: string; cvv: string }): Observable<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate card number
    if (!cardData.cardNumber) {
      errors.push('Card number is required');
    } else {
      const cardNumber = cardData.cardNumber.replace(/\s/g, '');
      
      if (!/^\d+$/.test(cardNumber)) {
        errors.push('Card number can only contain digits');
      } else if (cardNumber.length < 13 || cardNumber.length > 19) {
        errors.push('Card number must be between 13 and 19 digits');
      } else if (!this.luhnCheck(cardNumber)) {
        errors.push('Invalid card number');
      }
    }

    // Validate expiry date
    if (!cardData.expiryDate) {
      errors.push('Expiry date is required');
    } else if (!/^\d{2}\/\d{2}$/.test(cardData.expiryDate)) {
      errors.push('Expiry date must be in MM/YY format');
    } else {
      const [month, year] = cardData.expiryDate.split('/');
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (monthNum < 1 || monthNum > 12) {
        errors.push('Invalid month');
      } else {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;
        
        if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
          errors.push('Card has expired');
        } else if (yearNum === currentYear && monthNum === currentMonth) {
          warnings.push('Card expires this month');
        }
      }
    }

    // Validate CVV
    if (!cardData.cvv) {
      errors.push('CVV is required');
    } else if (!/^\d{3,4}$/.test(cardData.cvv)) {
      errors.push('CVV must be 3 or 4 digits');
    }

    return of({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  getStrategyName(): string {
    return 'Credit Card Validation';
  }

  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }
}

/**
 * Event Data Validation Strategy
 */
class EventDataValidationStrategy implements ValidationStrategy {
  validate(eventData: any): Observable<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!eventData.name) {
      errors.push('Event name is required');
    } else if (eventData.name.length < 3) {
      errors.push('Event name must be at least 3 characters');
    } else if (eventData.name.length > 100) {
      errors.push('Event name must not exceed 100 characters');
    }

    if (!eventData.date) {
      errors.push('Event date is required');
    } else {
      const eventDate = new Date(eventData.date);
      const now = new Date();
      
      if (isNaN(eventDate.getTime())) {
        errors.push('Invalid date format');
      } else if (eventDate < now) {
        errors.push('Event date cannot be in the past');
      } else if (eventDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        warnings.push('Event is scheduled for less than 24 hours from now');
      }
    }

    if (!eventData.location) {
      errors.push('Event location is required');
    } else if (eventData.location.length < 5) {
      errors.push('Event location must be at least 5 characters');
    }

    if (eventData.ticketTypes && eventData.ticketTypes.length === 0) {
      warnings.push('Consider adding ticket types for better organization');
    }

    return of({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  getStrategyName(): string {
    return 'Event Data Validation';
  }
}

/**
 * Validation Strategy Factory
 * Implements Strategy Pattern for different validation types
 */
@Injectable({
  providedIn: 'root'
})
export class ValidationStrategyFactory {
  
  /**
   * Create validation strategy based on type
   */
  createStrategy(type: ValidationType): ValidationStrategy {
    switch (type) {
      case ValidationType.EMAIL:
        return new EmailValidationStrategy();
      
      case ValidationType.PASSWORD:
        return new PasswordValidationStrategy();
      
      case ValidationType.CREDIT_CARD:
        return new CreditCardValidationStrategy();
      
      case ValidationType.EVENT_DATA:
        return new EventDataValidationStrategy();
      
      default:
        throw new Error(`Validation strategy not implemented for type: ${type}`);
    }
  }

  /**
   * Validate data using appropriate strategy
   */
  validate(type: ValidationType, data: any): Observable<ValidationResult> {
    const strategy = this.createStrategy(type);
    return strategy.validate(data);
  }

  /**
   * Get available validation types
   */
  getAvailableTypes(): ValidationType[] {
    return Object.values(ValidationType);
  }

  /**
   * Validate multiple fields using different strategies
   */
  validateMultiple(validations: Array<{ type: ValidationType; data: any }>): Observable<ValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let isValid = true;

    return new Observable(observer => {
      const validationPromises = validations.map(({ type, data }) => 
        this.validate(type, data).toPromise()
      );

      Promise.all(validationPromises).then(results => {
        results.forEach(result => {
          if (result && !result.isValid) {
            isValid = false;
            allErrors.push(...result.errors);
          }
          if (result && result.warnings) {
            allWarnings.push(...result.warnings);
          }
        });

        observer.next({
          isValid,
          errors: allErrors,
          warnings: allWarnings
        });
        observer.complete();
      });
    });
  }

  /**
   * Get strategy information
   */
  getStrategyInfo(type: ValidationType): { name: string; description: string } {
    const strategy = this.createStrategy(type);
    
    const descriptions: Record<ValidationType, string> = {
      [ValidationType.EMAIL]: 'Validates email format and suggests corrections',
      [ValidationType.PASSWORD]: 'Ensures password meets security requirements',
      [ValidationType.PHONE]: 'Validates phone number format',
      [ValidationType.CREDIT_CARD]: 'Validates credit card data using Luhn algorithm',
      [ValidationType.EVENT_DATA]: 'Validates event information completeness',
      [ValidationType.USER_PROFILE]: 'Validates user profile data',
      [ValidationType.TICKET_SELECTION]: 'Validates ticket selection constraints'
    };

    return {
      name: strategy.getStrategyName(),
      description: descriptions[type] || 'No description available'
    };
  }
}