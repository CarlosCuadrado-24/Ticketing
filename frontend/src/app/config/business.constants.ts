/**
 * Business rules and configuration constants
 * Centralized to avoid magic numbers and make business rules configurable
 */
export const BUSINESS_RULES = {
  // Pricing
  PROCESSING_FEE: 5,
  TAX_RATE: 0.05, // 5%
  
  // Reservations
  RESERVATION_TIMEOUT_MINUTES: 15,
  RESERVATION_WARNING_MINUTES: 5,
  MIN_RESERVATION_TIME_SECONDS: 60,
  
  // Tickets
  MAX_TICKETS_PER_TYPE: 10,
  MIN_TICKETS_PER_ORDER: 1,
  MAX_TICKETS_PER_ORDER: 50,
  
  // File uploads
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
  
  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // Search
  MIN_SEARCH_QUERY_LENGTH: 2,
  SEARCH_DEBOUNCE_MS: 300,
  
  // UI
  TOAST_DURATION_MS: 5000,
  LOADING_DELAY_MS: 200,
  
  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const;

export type BusinessRule = typeof BUSINESS_RULES[keyof typeof BUSINESS_RULES];