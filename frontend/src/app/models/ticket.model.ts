// Base ticket interface
export interface BaseTicket {
  id: string;
  code: string;
  eventId: string;
  type: string;
  status: string;
}

// Ticket with buyer information
export interface TicketWithBuyer extends BaseTicket {
  buyerEmail: string;
}

// Ticket with pricing information
export interface TicketWithPrice extends BaseTicket {
  price: {
    amount: number;
    currency: string;
  };
}

// Ticket with dates
export interface TicketWithDates extends BaseTicket {
  purchaseDate: Date;
  usedAt?: Date;
}

// Ticket with QR code
export interface TicketWithQR extends BaseTicket {
  qrToken: string;
}

// Admin ticket interface - combines multiple concerns
export interface AdminTicket extends 
  TicketWithBuyer, 
  TicketWithPrice, 
  TicketWithDates {
  eventName?: string;
}

// User ticket interface - for end users
export interface UserTicket extends 
  BaseTicket,
  TicketWithPrice,
  TicketWithDates,
  TicketWithQR {
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  eventImage?: string;
}

// Backend ticket response interface
export interface BackendTicket {
  id: string;
  code: string;
  qrToken: string;
  eventId: string;
  type: string;
  buyerEmail: string;
  price: number;
  currency: string;
  status: string;
  purchaseDate: string;
  usedAt: string | null;
}