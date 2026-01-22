import { Injectable, Inject } from "@nestjs/common";
import { Event } from "../../domain/entities/event.entity";
import { TicketConfiguration } from "../../domain/entities/ticket-configuration.entity";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { EVENT_REPOSITORY } from "../../domain/interfaces/repository-tokens";

/**
 * UpdateEventUseCase
 *
 * Use case for updating existing events.
 * Validates that the event exists and updates its information.
 */
export interface UpdateEventInput {
  id: string;
  name: string;
  date: Date;
  location: string;
  venueName: string;
  imageUrl?: string;
  ticketConfigurations: Array<{
    type: TicketType;
    price: number;
    currency: string;
    quantity: number;
  }>;
  eventDetails?: any[];
}

@Injectable()
export class UpdateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
  ) {}

  /**
   * Executes the use case to update an existing event.
   *
   * @param input - The input data for updating an event
   * @returns Promise resolving to the updated Event
   * @throws Error if event not found or validation fails
   */
  async execute(input: UpdateEventInput): Promise<Event> {
    // Validate input
    this.validateInput(input);

    // Check if event exists
    const existingEvent = await this.eventRepository.findById(input.id);
    if (!existingEvent) {
      throw new Error("Event not found");
    }

    // Preserve existing ticket configuration IDs to ensure UPDATE instead of INSERT
    const ticketConfigurations = input.ticketConfigurations.map((config) => {
      const existingConfig = existingEvent.ticketConfigurations.find(
        (ec) => ec.type === config.type,
      );

      return new TicketConfiguration(
        config.type,
        Money.create(config.price, config.currency),
        config.quantity,
        config.quantity,
        existingConfig?.id,
      );
    });

    // Create updated event entity
    const updatedEvent = new Event(
      input.id,
      input.name,
      input.date,
      input.location,
      input.venueName,
      ticketConfigurations,
      input.imageUrl,
      input.eventDetails || [],
    );

    // Update event
    const savedEvent = await this.eventRepository.update(updatedEvent);

    return savedEvent;
  }

  /**
   * Validates the input data for event update.
   *
   * @param input - The input to validate
   * @throws Error if validation fails
   */
  private validateInput(input: UpdateEventInput): void {
    if (!input.id || input.id.trim().length === 0) {
      throw new Error("Event ID is required");
    }

    if (!input.name || input.name.trim().length === 0) {
      throw new Error("Event name is required and cannot be empty");
    }

    if (!input.date) {
      throw new Error("Event date is required");
    }

    if (input.date < new Date()) {
      throw new Error("Event date cannot be in the past");
    }

    if (!input.location || input.location.trim().length === 0) {
      throw new Error("Event location is required and cannot be empty");
    }

    if (!input.venueName || input.venueName.trim().length === 0) {
      throw new Error("Venue name is required and cannot be empty");
    }
    if (
      !input.ticketConfigurations ||
      input.ticketConfigurations.length === 0
    ) {
      throw new Error("At least one ticket configuration is required");
    }

    // Validate each ticket configuration
    input.ticketConfigurations.forEach((config, index) => {
      if (!config.type) {
        throw new Error(`Ticket configuration ${index} is missing type`);
      }

      if (config.price < 0) {
        throw new Error(`Ticket configuration ${index} has invalid price`);
      }

      if (!config.currency || config.currency.length !== 3) {
        throw new Error(`Ticket configuration ${index} has invalid currency`);
      }

      if (config.quantity <= 0) {
        throw new Error(`Ticket configuration ${index} has invalid quantity`);
      }
    });
  }
}
