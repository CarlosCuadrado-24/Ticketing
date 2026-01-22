import { TicketConfiguration } from "./ticket-configuration.entity";
import { TicketType } from "../value-objects/ticket-type.vo";
import { TicketTypeNotFoundException } from "../exceptions/ticket-type-not-found.exception";

/**
 * Event Entity - Aggregate Root.
 * Represents an event with ticket configurations and manages ticket availability.
 * Follows Domain-Driven Design principles with encapsulated business logic.
 */
export class Event {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly date: Date,
    public readonly location: string,
    public readonly venueName: string,
    private _ticketConfigurations: TicketConfiguration[],
    public readonly imageUrl?: string,
    public readonly description?: string,
    public readonly details?: any[], // EventDetails[] (puedes tipar luego)
    public readonly createdBy?: string,
  ) {}

  /**
   * Returns a readonly copy of ticket configurations.
   * Prevents external modification of the internal array.
   */
  get ticketConfigurations(): ReadonlyArray<TicketConfiguration> {
    return [...this._ticketConfigurations];
  }

  /**
   * Gets the available quantity for a specific ticket type.
   * @param ticketType - The ticket type to check availability for
   * @returns The available quantity, or 0 if the ticket type doesn't exist
   */
  getAvailability(ticketType: TicketType): number {
    const config = this._ticketConfigurations.find(
      (c) => c.type === ticketType,
    );
    return config?.availableQuantity ?? 0;
  }

  /**
   * Reserves tickets of a specific type by decrementing availability.
   * @param ticketType - The type of ticket to reserve
   * @param quantity - The quantity to reserve
   * @throws TicketTypeNotFoundException if the ticket type doesn't exist
   * @throws InsufficientTicketsException if not enough tickets are available
   */
  reserveTickets(ticketType: TicketType, quantity: number): void {
    const config = this._ticketConfigurations.find(
      (c) => c.type === ticketType,
    );
    if (!config) {
      throw new TicketTypeNotFoundException(ticketType);
    }
    config.decrementAvailability(quantity);
  }

  /**
   * Releases tickets of a specific type by incrementing availability.
   * Does nothing if the ticket type doesn't exist (graceful handling).
   * @param ticketType - The type of ticket to release
   * @param quantity - The quantity to release
   */
  releaseTickets(ticketType: TicketType, quantity: number): void {
    const config = this._ticketConfigurations.find(
      (c) => c.type === ticketType,
    );
    if (config) {
      config.incrementAvailability(quantity);
    }
  }
}
