import { Injectable } from '@angular/core';
import { BUSINESS_RULES } from '../../config/business.constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FileValidationResult extends ValidationResult {
  file?: File;
  size?: number;
  type?: string;
}

/**
 * Validation Service
 * Centralizes validation logic to eliminate duplication and ensure consistency
 * Implements Strategy pattern for different validation types
 */
@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  /**
   * Validate email address
   */
  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!BUSINESS_RULES.EMAIL_REGEX.test(email)) {
      errors.push('Please enter a valid email address');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate password
   */
  validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < BUSINESS_RULES.MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${BUSINESS_RULES.MIN_PASSWORD_LENGTH} characters long`);
      }
      
      if (password.length > BUSINESS_RULES.MAX_PASSWORD_LENGTH) {
        errors.push(`Password must not exceed ${BUSINESS_RULES.MAX_PASSWORD_LENGTH} characters`);
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
        errors.push('Password must contain at least one special character (@$!%*?&)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate phone number
   */
  validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];

    if (!phone) {
      errors.push('Phone number is required');
    } else {
      // Remove all non-digit characters for validation
      const digitsOnly = phone.replace(/\D/g, '');
      
      if (digitsOnly.length < 10) {
        errors.push('Phone number must be at least 10 digits');
      } else if (digitsOnly.length > 15) {
        errors.push('Phone number must not exceed 15 digits');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate name (first name, last name, etc.)
   */
  validateName(name: string, fieldName: string = 'Name'): ValidationResult {
    const errors: string[] = [];

    if (!name) {
      errors.push(`${fieldName} is required`);
    } else {
      const trimmed = name.trim();
      
      if (trimmed.length < 1) {
        errors.push(`${fieldName} cannot be empty`);
      } else if (trimmed.length > 50) {
        errors.push(`${fieldName} must not exceed 50 characters`);
      } else if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
        errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate credit card number
   */
  validateCreditCard(cardNumber: string): ValidationResult {
    const errors: string[] = [];

    if (!cardNumber) {
      errors.push('Card number is required');
    } else {
      const digitsOnly = cardNumber.replace(/\s/g, '');
      
      if (!/^\d+$/.test(digitsOnly)) {
        errors.push('Card number can only contain digits');
      } else if (digitsOnly.length < 13 || digitsOnly.length > 19) {
        errors.push('Card number must be between 13 and 19 digits');
      } else if (!this.luhnCheck(digitsOnly)) {
        errors.push('Invalid card number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate credit card expiry date
   */
  validateExpiryDate(expiryDate: string): ValidationResult {
    const errors: string[] = [];

    if (!expiryDate) {
      errors.push('Expiry date is required');
    } else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      errors.push('Expiry date must be in MM/YY format');
    } else {
      const [month, year] = expiryDate.split('/');
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
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate CVV
   */
  validateCVV(cvv: string): ValidationResult {
    const errors: string[] = [];

    if (!cvv) {
      errors.push('CVV is required');
    } else if (!/^\d{3,4}$/.test(cvv)) {
      errors.push('CVV must be 3 or 4 digits');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file upload
   */
  validateFile(file: File, allowedTypes?: string[], maxSizeMB?: number): FileValidationResult {
    const errors: string[] = [];
    const maxSize = (maxSizeMB || BUSINESS_RULES.MAX_FILE_SIZE_MB) * 1024 * 1024;
    const allowed = allowedTypes || BUSINESS_RULES.ALLOWED_IMAGE_TYPES;

    if (!file) {
      errors.push('File is required');
    } else {
      if (file.size > maxSize) {
        errors.push(`File size must not exceed ${maxSizeMB || BUSINESS_RULES.MAX_FILE_SIZE_MB}MB`);
      }
      
      if (!allowed.some(type => type === file.type)) {
        errors.push(`File type not allowed. Allowed types: ${allowed.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      file,
      size: file?.size,
      type: file?.type
    };
  }

  /**
   * Validate quantity selection
   */
  validateQuantity(quantity: number, available: number, max?: number): ValidationResult {
    const errors: string[] = [];
    const maxAllowed = max || BUSINESS_RULES.MAX_TICKETS_PER_TYPE;

    if (quantity < BUSINESS_RULES.MIN_TICKETS_PER_ORDER) {
      errors.push(`Minimum ${BUSINESS_RULES.MIN_TICKETS_PER_ORDER} ticket required`);
    } else if (quantity > maxAllowed) {
      errors.push(`Maximum ${maxAllowed} tickets allowed per type`);
    } else if (quantity > available) {
      errors.push(`Only ${available} tickets available`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate search query
   */
  validateSearchQuery(query: string): ValidationResult {
    const errors: string[] = [];

    if (query && query.trim().length < BUSINESS_RULES.MIN_SEARCH_QUERY_LENGTH) {
      errors.push(`Search query must be at least ${BUSINESS_RULES.MIN_SEARCH_QUERY_LENGTH} characters`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate event date
   */
  validateEventDate(date: string): ValidationResult {
    const errors: string[] = [];

    if (!date) {
      errors.push('Event date is required');
    } else {
      const eventDate = new Date(date);
      const now = new Date();
      
      if (isNaN(eventDate.getTime())) {
        errors.push('Invalid date format');
      } else if (eventDate < now) {
        errors.push('Event date cannot be in the past');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate price
   */
  validatePrice(price: number): ValidationResult {
    const errors: string[] = [];

    if (price === null || price === undefined) {
      errors.push('Price is required');
    } else if (price < 0) {
      errors.push('Price cannot be negative');
    } else if (price > 10000) {
      errors.push('Price cannot exceed $10,000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Luhn algorithm for credit card validation
   */
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

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
    }
    
    return phone;
  }

  /**
   * Format credit card number for display
   */
  formatCreditCardNumber(cardNumber: string): string {
    const digitsOnly = cardNumber.replace(/\s/g, '');
    return digitsOnly.replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Validate multiple fields at once
   */
  validateMultiple(validations: Array<() => ValidationResult>): ValidationResult {
    const allErrors: string[] = [];
    let isValid = true;

    for (const validation of validations) {
      const result = validation();
      if (!result.isValid) {
        isValid = false;
        allErrors.push(...result.errors);
      }
    }

    return {
      isValid,
      errors: allErrors
    };
  }
}