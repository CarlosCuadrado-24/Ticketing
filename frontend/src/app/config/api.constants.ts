/**
 * API endpoints constants
 * Centralized to avoid hardcoded URLs and make API changes easier
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    BASE: '/auth',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile'
  },
  
  // CSRF
  CSRF: {
    TOKEN: '/csrf/token'
  },
  
  // Events
  EVENTS: {
    BASE: '/events',
    BY_ID: (id: string | number) => `/events/${id}`,
    FILE: (filename: string) => `/events/file/${filename}`,
    SEARCH: '/events/search',
    CATEGORIES: '/events/categories'
  },
  
  // Tickets
  TICKETS: {
    BASE: '/tickets',
    BY_ID: (id: string) => `/tickets/${id}`,
    BY_USER: '/tickets/user',
    VALIDATE: (id: string) => `/tickets/${id}/validate`
  },
  
  // Reservations
  RESERVATIONS: {
    BASE: '/reservations',
    BY_ID: (id: string) => `/reservations/${id}`,
    CANCEL: (id: string) => `/reservations/${id}/cancel`
  },
  
  // Orders
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id: string) => `/orders/${id}`,
    BY_USER: '/orders/user',
    COMPLETE: '/orders/complete'
  },
  
  // Admin
  ADMIN: {
    BASE: '/admin',
    USERS: '/admin/users',
    USER_BY_ID: (id: string) => `/admin/users/${id}`,
    DASHBOARD: '/admin/dashboard/stats',
    EVENT_STATS: '/admin/events/stats',
    TICKET_STATS: '/admin/tickets/stats'
  },
  
  // Profile
  PROFILE: {
    BASE: '/profile',
    UPDATE: '/profile/update',
    AVATAR: '/profile/avatar'
  },
  
  // Email
  EMAIL: {
    SEND_TICKETS: '/email/send-tickets'
  }
} as const;

/**
 * HTTP status codes for consistent error handling
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Default HTTP headers
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
} as const;