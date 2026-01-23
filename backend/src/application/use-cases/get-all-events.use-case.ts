import { Injectable, Inject } from "@nestjs/common";
import { Event } from "../../domain/entities/event.entity";
import { TicketConfiguration } from "../../domain/entities/ticket-configuration.entity";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { EVENT_REPOSITORY } from "../../domain/interfaces/repository-tokens";

/**
 * GetAllEventsUseCase
 *
 * Use case for retrieving all events with real-time availability.
 * Returns a list of all events with their ticket configurations and calculated availability.
 */
@Injectable()
export class GetAllEventsUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
  ) {}

  /**
   * Executes the use case to retrieve all events with real-time availability.
   *
   * @returns Promise resolving to an array of all Events with updated availability
   */
  async execute(): Promise<Event[]> {
    const events = await this.eventRepository.findAll();

    // Update each event with real-time availability
    const eventsWithRealAvailability = await Promise.all(
      events.map(async (event) => {
        const updatedConfigurations = await Promise.all(
          event.ticketConfigurations.map(async (config) => {
            const realAvailability =
              await this.eventRepository.getRealTimeAvailability(
                event.id,
                config.type,
              );

            // Create new TicketConfiguration with real availability
            return new TicketConfiguration(
              config.type,
              config.price,
              config.totalQuantity,
              realAvailability, // Use real-time calculated availability
              config.id,
            );
          }),
        );

        // Create new Event with updated configurations
        return new Event(
          event.id,
          event.name,
          event.date,
          event.location,
          event.venueName,
          updatedConfigurations,
          event.imageUrl,
          event.description,
          event.details,
          event.createdBy,
        );
      }),
    );

    return eventsWithRealAvailability;
  }
}
