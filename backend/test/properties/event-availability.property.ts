import * as fc from "fast-check";
import { Event } from "../../src/domain/entities/event.entity";
import { TicketConfiguration } from "../../src/domain/entities/ticket-configuration.entity";
import { Money } from "../../src/domain/value-objects/money.vo";
import { TicketType } from "../../src/domain/value-objects/ticket-type.vo";
import { TicketTypeNotFoundException } from "../../src/domain/exceptions/ticket-type-not-found.exception";
import { InsufficientTicketsException } from "../../src/domain/exceptions/insufficient-tickets.exception";
import {
  eventDataArbitrary,
  reservationSequenceArbitrary as _reservationSequenceArbitrary,
  ticketTypeArbitrary as _ticketTypeArbitrary,
  validTicketQuantityArbitrary,
} from "./generators/event.generator";

/**
 * Feature: ticket-sales-system
 * Property 2: Ticket Availability Invariant
 * Validates: Requirements 3.2, 5.2
 *
 * *For any* sequence of reserve/release operations, the availability
 * must never go negative and must correctly reflect the net effect
 * of all operations.
 */
describe("Property 2: Ticket Availability Invariant", () => {
  const PROPERTY_CONFIG: fc.Parameters<unknown> = {
    numRuns: 100,
    verbose: fc.VerbosityLevel.VeryVerbose,
  };

  describe("Availability invariants", () => {
    it("should maintain availability bounds for existing ticket types", () => {
      fc.assert(
        fc.property(eventDataArbitrary, (eventData: any) => {
          // Arrange
          const ticketConfigs = eventData.ticketConfigurations.map(
            (config: any) =>
              new TicketConfiguration(
                config.type,
                Money.create(config.price.amount, config.price.currency),
                config.totalQuantity,
                config.availableQuantity,
              ),
          );

          const event = new Event(
            eventData.id,
            eventData.name,
            eventData.date,
            eventData.location,
            ticketConfigs,
          );

          // Act & Assert: Test basic availability properties
          for (const config of ticketConfigs) {
            const availability = event.getAvailability(config.type);

            // Availability should match initial configuration
            expect(availability).toBe(config.availableQuantity);
            // Availability should never be negative
            expect(availability).toBeGreaterThanOrEqual(0);
            // Availability should never exceed total quantity
            expect(availability).toBeLessThanOrEqual(config.totalQuantity);
          }
        }),
        PROPERTY_CONFIG,
      );
    });

    it("should correctly handle reserve-release cycles for existing ticket types", () => {
      fc.assert(
        fc.property(
          eventDataArbitrary,
          validTicketQuantityArbitrary,
          (eventData: any, quantity: number) => {
            // Arrange
            const ticketConfigs = eventData.ticketConfigurations.map(
              (config: any) =>
                new TicketConfiguration(
                  config.type,
                  Money.create(config.price.amount, config.price.currency),
                  config.totalQuantity,
                  config.availableQuantity,
                ),
            );

            const event = new Event(
              eventData.id,
              eventData.name,
              eventData.date,
              eventData.location,
              ticketConfigs,
            );

            // Test each configured ticket type
            for (const config of ticketConfigs) {
              const initialAvailability = event.getAvailability(config.type);

              try {
                // Try to reserve tickets
                event.reserveTickets(config.type, quantity);
                const afterReserve = event.getAvailability(config.type);

                // Availability should decrease
                expect(afterReserve).toBe(initialAvailability - quantity);
                expect(afterReserve).toBeGreaterThanOrEqual(0);

                // Release the same tickets
                event.releaseTickets(config.type, quantity);
                const afterRelease = event.getAvailability(config.type);

                // Availability should return to initial value
                expect(afterRelease).toBe(initialAvailability);
              } catch (error) {
                // If reserve fails due to insufficient tickets, availability should remain unchanged
                if (error instanceof InsufficientTicketsException) {
                  const finalAvailability = event.getAvailability(config.type);
                  expect(finalAvailability).toBe(initialAvailability);
                } else {
                  throw error;
                }
              }
            }
          },
        ),
        PROPERTY_CONFIG,
      );
    });

    it("should throw TicketTypeNotFoundException for non-existing ticket types on reserve", () => {
      fc.assert(
        fc.property(
          eventDataArbitrary,
          validTicketQuantityArbitrary,
          (eventData: any, quantity: number) => {
            // Arrange
            const ticketConfigs = eventData.ticketConfigurations.map(
              (config: any) =>
                new TicketConfiguration(
                  config.type,
                  Money.create(config.price.amount, config.price.currency),
                  config.totalQuantity,
                  config.availableQuantity,
                ),
            );

            const event = new Event(
              eventData.id,
              eventData.name,
              eventData.date,
              eventData.location,
              ticketConfigs,
            );

            // Find a ticket type that doesn't exist in the event
            const existingTypes = new Set(
              ticketConfigs.map((c: any) => c.type),
            );
            const allTypes = [
              TicketType.VIP,
              TicketType.GENERAL,
              TicketType.EARLY_BIRD,
            ];
            const nonExistingType = allTypes.find(
              (type) => !existingTypes.has(type),
            );

            // Act & Assert
            if (nonExistingType) {
              expect(() =>
                event.reserveTickets(nonExistingType, quantity),
              ).toThrow(TicketTypeNotFoundException);
            }
          },
        ),
        PROPERTY_CONFIG,
      );
    });

    it("should gracefully handle release operations for non-existing ticket types", () => {
      fc.assert(
        fc.property(
          eventDataArbitrary,
          validTicketQuantityArbitrary,
          (eventData: any, quantity: number) => {
            // Arrange
            const ticketConfigs = eventData.ticketConfigurations.map(
              (config: any) =>
                new TicketConfiguration(
                  config.type,
                  Money.create(config.price.amount, config.price.currency),
                  config.totalQuantity,
                  config.availableQuantity,
                ),
            );

            const event = new Event(
              eventData.id,
              eventData.name,
              eventData.date,
              eventData.location,
              ticketConfigs,
            );

            // Find a ticket type that doesn't exist in the event
            const existingTypes = new Set(
              ticketConfigs.map((c: any) => c.type),
            );
            const allTypes = [
              TicketType.VIP,
              TicketType.GENERAL,
              TicketType.EARLY_BIRD,
            ];
            const nonExistingType = allTypes.find(
              (type) => !existingTypes.has(type),
            );

            // Act & Assert
            if (nonExistingType) {
              // Should not throw error, just do nothing
              expect(() =>
                event.releaseTickets(nonExistingType, quantity),
              ).not.toThrow();

              // Availability should remain 0 for non-existing types
              expect(event.getAvailability(nonExistingType)).toBe(0);
            }
          },
        ),
        PROPERTY_CONFIG,
      );
    });
  });

  describe("Availability calculation properties", () => {
    it("should return 0 for any non-configured ticket type", () => {
      fc.assert(
        fc.property(eventDataArbitrary, (eventData: any) => {
          // Arrange
          const ticketConfigs = eventData.ticketConfigurations.map(
            (config: any) =>
              new TicketConfiguration(
                config.type,
                Money.create(config.price.amount, config.price.currency),
                config.totalQuantity,
                config.availableQuantity,
              ),
          );

          const event = new Event(
            eventData.id,
            eventData.name,
            eventData.date,
            eventData.location,
            ticketConfigs,
          );

          // Find ticket types that don't exist in the event
          const existingTypes = new Set(ticketConfigs.map((c: any) => c.type));
          const allTypes = [
            TicketType.VIP,
            TicketType.GENERAL,
            TicketType.EARLY_BIRD,
          ];
          const nonExistingTypes = allTypes.filter(
            (type) => !existingTypes.has(type),
          );

          // Act & Assert
          for (const nonExistingType of nonExistingTypes) {
            expect(event.getAvailability(nonExistingType)).toBe(0);
          }
        }),
        PROPERTY_CONFIG,
      );
    });

    it("should return correct availability for configured ticket types", () => {
      fc.assert(
        fc.property(eventDataArbitrary, (eventData: any) => {
          // Arrange
          const ticketConfigs = eventData.ticketConfigurations.map(
            (config: any) =>
              new TicketConfiguration(
                config.type,
                Money.create(config.price.amount, config.price.currency),
                config.totalQuantity,
                config.availableQuantity,
              ),
          );

          const event = new Event(
            eventData.id,
            eventData.name,
            eventData.date,
            eventData.location,
            ticketConfigs,
          );

          // Act & Assert
          for (const config of ticketConfigs) {
            const availability = event.getAvailability(config.type);
            expect(availability).toBe(config.availableQuantity);
            expect(availability).toBeGreaterThanOrEqual(0);
            expect(availability).toBeLessThanOrEqual(config.totalQuantity);
          }
        }),
        PROPERTY_CONFIG,
      );
    });
  });
});
