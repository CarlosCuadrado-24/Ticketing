export interface TicketConfiguration {
  type: string;
  price: number;
  currency: string;
  totalQuantity: number;
  availableQuantity: number;
}

export interface TicketType {
  id: number;
  name: string;
  price: number;
  totalQuantity: number;
  availableQuantity?: number;
  tickets?: any[];
}

export interface EventDetails {
  id?: string;
  category?: string;
  minAge?: number | null;
  seating?: string;
  capacity?: number;
  foodSale?: boolean;
  liquorSale?: boolean;
  reducedMobilityAccess?: boolean;
  pregnantAccess?: boolean;
}

// Base event interface - core properties only
export interface BaseEvent {
  id: string | number;
  name: string;
  date: string;
  location: string;
}

// Event with basic metadata
export interface EventWithMetadata extends BaseEvent {
  code?: string;
  imageUrl?: string | null;
  description?: string;
  createdBy?: string | null;
}

// Event with organizer information
export interface EventWithOrganizer extends BaseEvent {
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Event with venue details
export interface EventWithVenue extends BaseEvent {
  venueName: string;
  startTime: string;
  endTime: string;
}

// Event with tickets
export interface EventWithTickets extends BaseEvent {
  ticketTypes: TicketType[];
  ticketConfigurations?: TicketConfiguration[];
}

// Event with additional details
export interface EventWithDetails extends BaseEvent {
  eventDetails: EventDetails[];
  tags?: string[];
}

// Complete event interface - use sparingly, prefer specific interfaces
export interface Event extends EventWithMetadata {
  organizer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  venueName?: string;
  startTime?: string;
  endTime?: string;
  tags?: string[];
  ticketTypes?: TicketType[];
  ticketConfigurations?: TicketConfiguration[];
  eventDetails?: EventDetails[];
}
