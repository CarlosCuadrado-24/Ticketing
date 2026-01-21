import { Injectable } from '@angular/core';
import { Event, TicketType, TicketConfiguration } from '../../models/event.model';

/**
 * Ticket Mapping Service
 * Centralizes ticket-related mapping logic to eliminate duplication
 * Used by EventDetail, CheckoutService, MyTickets, and Confirmation components
 */
@Injectable({
  providedIn: 'root'
})
export class TicketMappingService {

  /**
   * Map ticket configurations to a standardized format
   */
  mapTicketConfigurations(event: Event): TicketConfiguration[] {
    if (!event.ticketConfigurations) {
      return [];
    }

    return event.ticketConfigurations.map(config => ({
      type: config.type,
      price: Number(config.price),
      currency: config.currency || 'USD',
      totalQuantity: config.totalQuantity,
      availableQuantity: config.availableQuantity
    }));
  }

  /**
   * Map ticket types to a standardized format
   */
  mapTicketTypes(event: Event): TicketType[] {
    if (!event.ticketTypes) {
      return [];
    }

    return event.ticketTypes.map(type => ({
      id: type.id,
      name: type.name,
      price: Number(type.price),
      totalQuantity: type.totalQuantity,
      availableQuantity: type.availableQuantity || type.totalQuantity,
      tickets: type.tickets || []
    }));
  }

  /**
   * Get available quantity for a specific ticket type
   */
  getAvailableQuantity(event: Event, ticketTypeId: number): number {
    // Check ticket types first
    const ticketType = event.ticketTypes?.find(t => t.id === ticketTypeId);
    if (ticketType) {
      return ticketType.availableQuantity ?? ticketType.totalQuantity;
    }

    // Fallback to ticket configurations
    const config = event.ticketConfigurations?.find(c => c.type === String(ticketTypeId));
    if (config) {
      return config.availableQuantity;
    }

    return 0;
  }

  /**
   * Get ticket type by ID
   */
  getTicketTypeById(event: Event, ticketTypeId: number): TicketType | undefined {
    return event.ticketTypes?.find(t => t.id === ticketTypeId);
  }

  /**
   * Get ticket configuration by type
   */
  getTicketConfigurationByType(event: Event, type: string): TicketConfiguration | undefined {
    return event.ticketConfigurations?.find(c => c.type === type);
  }

  /**
   * Get minimum price from all ticket types
   */
  getMinPrice(event: Event): number {
    const ticketTypes = this.mapTicketTypes(event);
    const configurations = this.mapTicketConfigurations(event);
    
    const allPrices = [
      ...ticketTypes.map(t => t.price),
      ...configurations.map(c => c.price)
    ].filter(price => price > 0);

    return allPrices.length > 0 ? Math.min(...allPrices) : 0;
  }

  /**
   * Get maximum price from all ticket types
   */
  getMaxPrice(event: Event): number {
    const ticketTypes = this.mapTicketTypes(event);
    const configurations = this.mapTicketConfigurations(event);
    
    const allPrices = [
      ...ticketTypes.map(t => t.price),
      ...configurations.map(c => c.price)
    ].filter(price => price > 0);

    return allPrices.length > 0 ? Math.max(...allPrices) : 0;
  }

  /**
   * Check if any tickets are available for the event
   */
  hasAvailableTickets(event: Event): boolean {
    const ticketTypes = this.mapTicketTypes(event);
    const configurations = this.mapTicketConfigurations(event);
    
    return ticketTypes.some(t => (t.availableQuantity ?? t.totalQuantity) > 0) ||
           configurations.some(c => c.availableQuantity > 0);
  }

  /**
   * Get total available tickets for the event
   */
  getTotalAvailableTickets(event: Event): number {
    const ticketTypes = this.mapTicketTypes(event);
    const configurations = this.mapTicketConfigurations(event);
    
    const typeTotal = ticketTypes.reduce((sum, t) => 
      sum + (t.availableQuantity ?? t.totalQuantity), 0);
    
    const configTotal = configurations.reduce((sum, c) => 
      sum + c.availableQuantity, 0);
    
    // Return the higher of the two (in case both are present)
    return Math.max(typeTotal, configTotal);
  }

  /**
   * Map ticket type name for backend compatibility
   */
  mapTicketTypeNameForBackend(ticketTypeName: string): string {
    const mapping: Record<string, string> = {
      'General': 'GENERAL',
      'VIP': 'VIP',
      'Premium': 'PREMIUM',
      'Student': 'STUDENT',
      'Senior': 'SENIOR',
      'Early Bird': 'EARLY_BIRD',
      'Regular': 'REGULAR',
      'Last Minute': 'LAST_MINUTE'
    };
    
    return mapping[ticketTypeName] || ticketTypeName.toUpperCase().replace(/\s+/g, '_');
  }

  /**
   * Map backend ticket type name to display name
   */
  mapTicketTypeNameForDisplay(backendName: string): string {
    const mapping: Record<string, string> = {
      'GENERAL': 'General',
      'VIP': 'VIP',
      'PREMIUM': 'Premium',
      'STUDENT': 'Student',
      'SENIOR': 'Senior',
      'EARLY_BIRD': 'Early Bird',
      'REGULAR': 'Regular',
      'LAST_MINUTE': 'Last Minute'
    };
    
    return mapping[backendName] || backendName.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Validate ticket selection
   */
  validateTicketSelection(event: Event, ticketTypeId: number, quantity: number): {
    isValid: boolean;
    error?: string;
  } {
    if (quantity <= 0) {
      return { isValid: false, error: 'Quantity must be greater than 0' };
    }

    const availableQuantity = this.getAvailableQuantity(event, ticketTypeId);
    
    if (quantity > availableQuantity) {
      return { 
        isValid: false, 
        error: `Only ${availableQuantity} tickets available for this type` 
      };
    }

    return { isValid: true };
  }

  /**
   * Format price with currency
   */
  formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  }

  /**
   * Calculate total price for ticket selection
   */
  calculateTotalPrice(selections: Array<{ ticketTypeId: number; quantity: number }>, event: Event): number {
    return selections.reduce((total, selection) => {
      const ticketType = this.getTicketTypeById(event, selection.ticketTypeId);
      if (ticketType) {
        return total + (ticketType.price * selection.quantity);
      }
      return total;
    }, 0);
  }
}