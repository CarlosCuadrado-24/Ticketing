import { Event } from "./event.entity";
import { TicketConfiguration } from "./ticket-configuration.entity";
import { TicketType } from "../value-objects/ticket-type.vo";
import { Money } from "../value-objects/money.vo";
import { TicketTypeNotFoundException } from "../exceptions/ticket-type-not-found.exception";
import { InsufficientTicketsException } from "../exceptions/insufficient-tickets.exception";

describe("Event Entity", () => {
  const eventDate = new Date("2026-12-31T20:00:00Z");

  const createTestEvent = () =>
    new Event(
      "event-1",
      "Rock Concert",
      eventDate,
      "Madison Square Garden",
      "Main Arena",
      [
        new TicketConfiguration(
          TicketType.GENERAL,
          Money.create(50, "USD"),
          100,
          70,
        ),
        new TicketConfiguration(
          TicketType.VIP,
          Money.create(150, "USD"),
          50,
          25,
        ),
      ],
      "https://example.com/image.jpg",
      "Amazing concert",
      [],
      "organizer-123",
    );

  describe("constructor", () => {
    it("should create event with all required properties", () => {
      const event = createTestEvent();

      expect(event.id).toBe("event-1");
      expect(event.name).toBe("Rock Concert");
      expect(event.date).toEqual(eventDate);
      expect(event.location).toBe("Madison Square Garden");
      expect(event.venueName).toBe("Main Arena");
      expect(event.ticketConfigurations).toHaveLength(2);
    });

    it("should create event with optional properties", () => {
      const event = createTestEvent();

      expect(event.imageUrl).toBe("https://example.com/image.jpg");
      expect(event.description).toBe("Amazing concert");
      expect(event.details).toEqual([]);
      expect(event.createdBy).toBe("organizer-123");
    });

    it("should create event without optional properties", () => {
      const event = new Event(
        "event-2",
        "Simple Event",
        eventDate,
        "Location",
        "Venue",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(30, "USD"),
            50,
            50,
          ),
        ],
      );

      expect(event.imageUrl).toBeUndefined();
      expect(event.description).toBeUndefined();
      expect(event.details).toBeUndefined();
      expect(event.createdBy).toBeUndefined();
    });
  });

  describe("ticketConfigurations getter", () => {
    it("should return readonly copy of configurations", () => {
      const event = createTestEvent();
      const configs = event.ticketConfigurations;

      expect(configs).toHaveLength(2);
      expect(configs[0]?.type).toBe(TicketType.GENERAL);
      expect(configs[1]?.type).toBe(TicketType.VIP);
    });

    it("should prevent external modification of array", () => {
      const event = createTestEvent();
      const configs = event.ticketConfigurations as any;

      expect(() => {
        configs.push(
          new TicketConfiguration(
            TicketType.EARLY_BIRD,
            Money.create(40, "USD"),
            20,
            20,
          ),
        );
      }).not.toThrow();

      // Original should not be modified
      expect(event.ticketConfigurations).toHaveLength(2);
    });

    it("should return new array instance each time", () => {
      const event = createTestEvent();

      const configs1 = event.ticketConfigurations;
      const configs2 = event.ticketConfigurations;

      expect(configs1).not.toBe(configs2);
      expect(configs1).toEqual(configs2);
    });
  });

  describe("getAvailability", () => {
    it("should return correct availability for existing ticket type", () => {
      const event = createTestEvent();

      expect(event.getAvailability(TicketType.GENERAL)).toBe(70);
      expect(event.getAvailability(TicketType.VIP)).toBe(25);
    });

    it("should return 0 for non-existent ticket type", () => {
      const event = createTestEvent();

      expect(event.getAvailability(TicketType.EARLY_BIRD)).toBe(0);
    });

    it("should reflect changes after reserving tickets", () => {
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.GENERAL);

      event.reserveTickets(TicketType.GENERAL, 10);

      expect(event.getAvailability(TicketType.GENERAL)).toBe(
        initialAvailability - 10,
      );
    });

    it("should reflect changes after releasing tickets", () => {
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.VIP);

      event.releaseTickets(TicketType.VIP, 5);

      expect(event.getAvailability(TicketType.VIP)).toBe(
        initialAvailability + 5,
      );
    });
  });

  describe("reserveTickets", () => {
    it("should decrease availability when reserving tickets", () => {
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.GENERAL);

      event.reserveTickets(TicketType.GENERAL, 20);

      expect(event.getAvailability(TicketType.GENERAL)).toBe(
        initialAvailability - 20,
      );
    });

    it("should throw error for non-existent ticket type", () => {
      const event = createTestEvent();

      expect(() => {
        event.reserveTickets(TicketType.EARLY_BIRD, 5);
      }).toThrow(TicketTypeNotFoundException);
    });

    it("should throw error when insufficient tickets available", () => {
      const event = createTestEvent();

      expect(() => {
        event.reserveTickets(TicketType.VIP, 100);
      }).toThrow(InsufficientTicketsException);
    });

    it("should handle multiple reservations", () => {
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.GENERAL);

      event.reserveTickets(TicketType.GENERAL, 10);
      event.reserveTickets(TicketType.GENERAL, 15);

      expect(event.getAvailability(TicketType.GENERAL)).toBe(
        initialAvailability - 25,
      );
    });

    it("should reserve exact available quantity", () => {
      const event = createTestEvent();
      const availability = event.getAvailability(TicketType.VIP);

      event.reserveTickets(TicketType.VIP, availability);

      expect(event.getAvailability(TicketType.VIP)).toBe(0);
    });
  });

  describe("releaseTickets", () => {
    it("should increase availability when releasing tickets", () => {
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.GENERAL);

      event.releaseTickets(TicketType.GENERAL, 15);

      expect(event.getAvailability(TicketType.GENERAL)).toBe(
        initialAvailability + 15,
      );
    });

    it("should not throw error for non-existent ticket type", () => {
      const event = createTestEvent();

      expect(() => {
        event.releaseTickets(TicketType.EARLY_BIRD, 5);
      }).not.toThrow();
    });

    it("should handle release after reserve", () => {
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.VIP);

      event.reserveTickets(TicketType.VIP, 10);
      event.releaseTickets(TicketType.VIP, 10);

      expect(event.getAvailability(TicketType.VIP)).toBe(initialAvailability);
    });

    it("should allow releasing more than total capacity", () => {
      const event = createTestEvent();
      const _initialAvailability = event.getAvailability(TicketType.GENERAL);

      event.releaseTickets(TicketType.GENERAL, 200);

      // Should cap at total capacity of 100
      expect(event.getAvailability(TicketType.GENERAL)).toBe(100);
    });

    it("should handle multiple releases", () => {
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.VIP);

      event.releaseTickets(TicketType.VIP, 5);
      event.releaseTickets(TicketType.VIP, 3);

      expect(event.getAvailability(TicketType.VIP)).toBe(
        initialAvailability + 8,
      );
    });
  });

  describe("complex scenarios", () => {
    it("should handle reserve and release cycles correctly", () => {
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.GENERAL);

      event.reserveTickets(TicketType.GENERAL, 30);
      expect(event.getAvailability(TicketType.GENERAL)).toBe(
        initialAvailability - 30,
      );

      event.releaseTickets(TicketType.GENERAL, 10);
      expect(event.getAvailability(TicketType.GENERAL)).toBe(
        initialAvailability - 20,
      );

      event.reserveTickets(TicketType.GENERAL, 5);
      expect(event.getAvailability(TicketType.GENERAL)).toBe(
        initialAvailability - 25,
      );
    });

    it("should manage different ticket types independently", () => {
      const event = createTestEvent();

      event.reserveTickets(TicketType.GENERAL, 20);
      event.reserveTickets(TicketType.VIP, 10);

      expect(event.getAvailability(TicketType.GENERAL)).toBe(50);
      expect(event.getAvailability(TicketType.VIP)).toBe(15);
    });

    it("should return a copy of configurations through getter", () => {
      const event = createTestEvent();
      const configs1 = event.ticketConfigurations;
      const configs2 = event.ticketConfigurations;

      // Getter should return array (may or may not be same reference)
      expect(configs1.length).toBe(configs2.length);
      expect(configs1[0]?.type).toBe(configs2[0]?.type);
    });

    it("should handle events with single ticket configuration", () => {
      const event = new Event(
        "event-single",
        "Simple Event",
        eventDate,
        "Venue",
        "Hall",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(25, "USD"),
            200,
            150,
          ),
        ],
      );

      expect(event.ticketConfigurations).toHaveLength(1);
      expect(event.getAvailability(TicketType.GENERAL)).toBe(150);
      expect(event.getAvailability(TicketType.VIP)).toBe(0);
    });

    it("should handle events with all ticket types", () => {
      const event = new Event(
        "event-all-types",
        "Mega Festival",
        eventDate,
        "Stadium",
        "Main Field",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, "USD"),
            1000,
            800,
          ),
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(200, "USD"),
            200,
            150,
          ),
          new TicketConfiguration(
            TicketType.EARLY_BIRD,
            Money.create(35, "USD"),
            300,
            100,
          ),
        ],
      );

      expect(event.ticketConfigurations).toHaveLength(3);
      expect(event.getAvailability(TicketType.GENERAL)).toBe(800);
      expect(event.getAvailability(TicketType.VIP)).toBe(150);
      expect(event.getAvailability(TicketType.EARLY_BIRD)).toBe(100);
    });
  });
});
