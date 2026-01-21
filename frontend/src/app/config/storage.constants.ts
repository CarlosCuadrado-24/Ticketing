/**
 * Storage keys constants for localStorage and sessionStorage
 * Centralized to avoid magic strings throughout the application
 */
export const STORAGE_KEYS = {
  // Cart and checkout
  CART: 'ticketing_cart',
  PENDING_CHECKOUT: 'ticketing_pending_checkout',
  RESERVATIONS: 'ticketing_reservations',
  
  // Authentication
  USER: 'user',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  
  // User preferences
  THEME: 'user_theme',
  LANGUAGE: 'user_language',
  
  // Temporary data
  BUYER_INFO: 'buyer_info',
  LAST_VISITED_EVENT: 'last_visited_event'
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];