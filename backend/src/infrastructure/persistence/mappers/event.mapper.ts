import { Event } from "../../../domain/entities/event.entity";
import { TicketConfiguration } from "../../../domain/entities/ticket-configuration.entity";
import { EventOrmEntity } from "../entities/event.orm-entity";
import { TicketConfigurationOrmEntity } from "../entities/ticket-configuration.orm-entity";
import { EventDetailsOrmEntity } from "../entities/event-details.orm-entity";
import { Money } from "../../../domain/value-objects/money.vo";

/**
 * EventMapper
 * Converts between domain Event entities and ORM EventOrmEntity
 * Implements the Mapper pattern for clean separation of concerns
 *
 * Requirements: 8.3 (Persistence round-trip)
 */
export class EventMapper {
  /**
   * Converts an ORM entity to a domain entity
   * @param ormEntity - The ORM entity from the database
   * @returns Domain Event entity
   */
  static toDomain(ormEntity: EventOrmEntity): Event {
    const ticketConfigurations = ormEntity.ticketConfigurations.map((config) =>
      this.ticketConfigToDomain(config),
    );
    // Map event details if present
    const details =
      ormEntity.details?.map((d: EventDetailsOrmEntity) => ({
        id: d.id,
        category: d.category,
        minAge: d.minAge,
        seating: d.seating,
        capacity: d.capacity,
        foodSale: d.foodSale,
        liquorSale: d.liquorSale,
        reducedMobilityAccess: d.reducedMobilityAccess,
        pregnantAccess: d.pregnantAccess,
      })) || [];

    return new Event(
      ormEntity.id,
      ormEntity.name,
      ormEntity.date,
      ormEntity.location,
      ormEntity.venueName,
      ticketConfigurations,
      ormEntity.imageUrl,
      ormEntity.description,
      details,
      ormEntity.createdBy,
    );
  }

  /**
   * Converts a domain entity to an ORM entity
   * @param domainEvent - The domain Event entity
   * @returns ORM EventOrmEntity
   */
  static toPersistence(domainEvent: Event): EventOrmEntity {
    const ormEntity = new EventOrmEntity();
    ormEntity.id = domainEvent.id;
    ormEntity.name = domainEvent.name;
    ormEntity.date = domainEvent.date;
    ormEntity.location = domainEvent.location;
    ormEntity.venueName = domainEvent.venueName;
    ormEntity.imageUrl = domainEvent.imageUrl;
    ormEntity.description = domainEvent.description;
    ormEntity.createdBy = domainEvent.createdBy;

    // Create ticket configurations with proper relationships
    ormEntity.ticketConfigurations = domainEvent.ticketConfigurations.map(
      (config) => {
        const ormConfig = this.ticketConfigToPersistence(
          config,
          domainEvent.id,
        );
        ormConfig.event = ormEntity; // Set the event relationship
        return ormConfig;
      },
    );

    // Map event details if present
    if (domainEvent.details && domainEvent.details.length > 0) {
      ormEntity.details = domainEvent.details.map((d: any) => {
        const detail = new EventDetailsOrmEntity();
        detail.eventId = domainEvent.id; // Set the eventId FIRST
        detail.event = ormEntity; // Set the event relationship
        detail.category = d.category;
        detail.minAge = d.minAge;
        detail.seating = d.seating;
        detail.capacity = d.capacity;
        detail.foodSale = d.foodSale;
        detail.liquorSale = d.liquorSale;
        detail.reducedMobilityAccess = d.reducedMobilityAccess;
        detail.pregnantAccess = d.pregnantAccess;
        // If the detail has an ID, preserve it for updates
        if (d.id) {
          detail.id = d.id;
        }
        return detail;
      });
    }
    return ormEntity;
  }

  /**
   * Converts an ORM ticket configuration to a domain ticket configuration
   * @param ormConfig - The ORM ticket configuration
   * @returns Domain TicketConfiguration
   */
  private static ticketConfigToDomain(
    ormConfig: TicketConfigurationOrmEntity,
  ): TicketConfiguration {
    // Handle decimal values that may come as strings from the database
    const price =
      typeof ormConfig.price === "string"
        ? parseFloat(ormConfig.price)
        : ormConfig.price;

    return new TicketConfiguration(
      ormConfig.type,
      Money.create(price, ormConfig.currency || "USD"),
      ormConfig.totalQuantity,
      ormConfig.availableQuantity,
      ormConfig.id, // Preserve the ID
    );
  }

  /**
   * Converts a domain ticket configuration to an ORM ticket configuration
   * @param domainConfig - The domain TicketConfiguration
   * @param eventId - The event ID to associate with this configuration
   * @returns ORM TicketConfigurationOrmEntity
   */
  private static ticketConfigToPersistence(
    domainConfig: TicketConfiguration,
    eventId: string,
  ): TicketConfigurationOrmEntity {
    const ormConfig = new TicketConfigurationOrmEntity();

    // Preserve the ID if it exists (for updates)
    if (domainConfig.id) {
      ormConfig.id = domainConfig.id;
    }

    ormConfig.type = domainConfig.type;
    ormConfig.price = domainConfig.price.amount;
    ormConfig.currency = domainConfig.price.currency;
    ormConfig.totalQuantity = domainConfig.totalQuantity;
    ormConfig.availableQuantity = domainConfig.availableQuantity;
    ormConfig.eventId = eventId; // Set the eventId to establish the relationship

    return ormConfig;
  }
}
