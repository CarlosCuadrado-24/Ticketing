import { Injectable, Inject } from "@nestjs/common";
import { Event } from "../../domain/entities/event.entity";
import { TicketConfiguration } from "../../domain/entities/ticket-configuration.entity";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { EVENT_REPOSITORY } from "../../domain/interfaces/repository-tokens";
import { EventIdGeneratorService } from "../services/event-id-generator.service";

/**
 * CreateEventUseCase
 *
 * Use case for creating new events with ticket configurations.
 * Follows the Single Responsibility Principle - only responsible for event creation logic.
 *
 * Requirements: 1.1, 1.2
 * - 1.1: Persist event and return unique identifier
 * - 1.2: Store ticket configuration with price and quantity
 */
export interface CreateEventInput {
  name: string;
  date: Date;
  location: string;
  venueName: string;
  imageUrl?: string;
  description?: string;
  ticketConfigurations: Array<{
    type: TicketType;
    price: number;
    currency: string;
    quantity: number;
  }>;
  eventDetails?: any[];
  createdBy?: string;
}

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    private readonly eventIdGenerator: EventIdGeneratorService,
  ) {}

  /**
   * Executes the use case to create a new event.
   *
   * @param input - The input data for creating an event
   * @returns Promise resolving to the created Event with ID
   * @throws Error if input validation fails or repository operation fails
   */
  async execute(input: CreateEventInput): Promise<Event> {
    // Validate input
    this.validateInput(input);

    // Generate sequential event ID
    const eventId = await this.eventIdGenerator.generateNextId();

    // Create ticket configurations
    const ticketConfigurations = input.ticketConfigurations.map(
      (config) =>
        new TicketConfiguration(
          config.type,
          Money.create(config.price, config.currency),
          config.quantity,
          config.quantity, // Initially, all tickets are available
        ),
    );

    // Create event entity
    const event = new Event(
      eventId,
      input.name,
      input.date,
      input.location,
      input.venueName,
      ticketConfigurations,
      input.imageUrl,
      input.description,
      input.eventDetails || [],
      input.createdBy,
    );

    // Persist event
    const savedEvent = await this.eventRepository.save(event);

    return savedEvent;
  }

  /**
   * Validates the input data for event creation.
   *
   * @param input - The input to validate
   * @throws Error if validation fails
   */
  private validateInput(input: CreateEventInput): void {
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
