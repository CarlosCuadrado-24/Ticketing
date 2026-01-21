// Base reservation interface
export interface BaseReservation {
  id: string;
  eventId: string;
  ticketType: string;
  quantity: number;
  status: string;
}

// Reservation with buyer information
export interface ReservationWithBuyer extends BaseReservation {
  buyerEmail: string;
}

// Reservation with pricing
export interface ReservationWithPrice extends BaseReservation {
  totalAmount: number;
  currency: string;
}

// Reservation with timing
export interface ReservationWithTiming extends BaseReservation {
  expiresAt: Date;
  createdAt?: Date;
}

// Complete reservation interface
export interface Reservation extends 
  ReservationWithBuyer,
  ReservationWithPrice,
  ReservationWithTiming {}

// Admin reservation interface
export interface AdminReservation extends Reservation {
  eventName?: string;
}