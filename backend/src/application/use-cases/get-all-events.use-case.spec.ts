import { Test, TestingModule } from "@nestjs/testing";
import { GetAllEventsUseCase } from "./get-all-events.use-case";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { EVENT_REPOSITORY } from "../../domain/interfaces/repository-tokens";
import { Event } from "../../domain/entities/event.entity";
import { TicketConfiguration } from "../../domain/entities/ticket-configuration.entity";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";
import { Money } from "../../domain/value-objects/money.vo";

describe("GetAllEventsUseCase", () => {
  let useCase: GetAllEventsUseCase;
  let mockEventRepository: jest.Mocked<IEventRepository>;

  beforeEach(async () => {
    mockEventRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRealTimeAvailability: jest.fn(),
      findByIdWithTickets: jest.fn(),
      getEventsByCategory: jest.fn(),
      getEventsByMonth: jest.fn(),
      findUpcoming: jest.fn(),
      findPast: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllEventsUseCase,
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAllEventsUseCase>(GetAllEventsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should return all events with real-time availability", async () => {
      // Arrange: Create real domain objects
      const futureDate = new Date("2026-12-31T20:00:00Z");

      const generalConfig = new TicketConfiguration(
        TicketType.GENERAL,
        Money.create(50, "USD"),
        100,
        80, // Initial availability
      );

      const vipConfig = new TicketConfiguration(
        TicketType.VIP,
        Money.create(150, "USD"),
        50,
        45, // Initial availability
      );

      const event1 = new Event(
        "EVENT-001",
        "Rock Concert",
        futureDate,
        "Madison Square Garden",
        "Main Arena",
        [generalConfig, vipConfig],
        "https://example.com/concert.jpg",
        "Amazing rock concert",
      );

      const event2 = new Event(
        "EVENT-002",
        "Jazz Night",
        new Date("2026-11-15T19:00:00Z"),
        "Blue Note",
        "Main Stage",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(40, "USD"),
            200,
            150,
          ),
        ],
      );

      mockEventRepository.findAll.mockResolvedValue([event1, event2]);

      // Mock real-time availability for event1
      mockEventRepository.getRealTimeAvailability
        .mockResolvedValueOnce(75) // GENERAL availability for event1
        .mockResolvedValueOnce(40) // VIP availability for event1
        .mockResolvedValueOnce(140); // GENERAL availability for event2

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockEventRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.getRealTimeAvailability).toHaveBeenCalledTimes(
        3,
      );

      // Verify first event
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.id).toBe("EVENT-001");
      expect(result[0]?.name).toBe("Rock Concert");
      expect(result[0]?.ticketConfigurations).toHaveLength(2);
      expect(result[0]?.ticketConfigurations[0]?.availableQuantity).toBe(75);
      expect(result[0]?.ticketConfigurations[1]?.availableQuantity).toBe(40);

      // Verify second event
      expect(result[1]?.id).toBe("EVENT-002");
      expect(result[1]?.name).toBe("Jazz Night");
      expect(result[1]?.ticketConfigurations).toHaveLength(1);
      expect(result[1]?.ticketConfigurations[0]?.availableQuantity).toBe(140);
    });

    it("should return empty array when no events exist", async () => {
      mockEventRepository.findAll.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
      expect(mockEventRepository.findAll).toHaveBeenCalledTimes(1);
      expect(
        mockEventRepository.getRealTimeAvailability,
      ).not.toHaveBeenCalled();
    });

    it("should handle events with multiple ticket types", async () => {
      const event = new Event(
        "EVENT-003",
        "Conference",
        new Date("2026-10-01T09:00:00Z"),
        "Convention Center",
        "Hall A",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(100, "USD"),
            500,
            400,
          ),
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(300, "USD"),
            100,
            80,
          ),
          new TicketConfiguration(
            TicketType.EARLY_BIRD,
            Money.create(80, "USD"),
            200,
            150,
          ),
        ],
      );

      mockEventRepository.findAll.mockResolvedValue([event]);
      mockEventRepository.getRealTimeAvailability
        .mockResolvedValueOnce(380)
        .mockResolvedValueOnce(75)
        .mockResolvedValueOnce(140);

      const result = await useCase.execute();

      expect(result).toHaveLength(1);
      expect(result[0]?.ticketConfigurations).toHaveLength(3);
      expect(result[0]?.ticketConfigurations[0]?.type).toBe(TicketType.GENERAL);
      expect(result[0]?.ticketConfigurations[0]?.availableQuantity).toBe(380);
      expect(result[0]?.ticketConfigurations[1]?.type).toBe(TicketType.VIP);
      expect(result[0]?.ticketConfigurations[1]?.availableQuantity).toBe(75);
      expect(result[0]?.ticketConfigurations[2]?.type).toBe(
        TicketType.EARLY_BIRD,
      );
      expect(result[0]?.ticketConfigurations[2]?.availableQuantity).toBe(140);
    });

    it("should preserve event properties", async () => {
      const eventDate = new Date("2026-08-20T18:00:00Z");
      const event = new Event(
        "EVENT-004",
        "Theater Play",
        eventDate,
        "Broadway Theater",
        "Stage 1",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(75, "USD"),
            300,
            250,
          ),
        ],
        "https://example.com/play.jpg",
        "A wonderful theater experience",
        undefined,
        "organizer-123",
      );

      mockEventRepository.findAll.mockResolvedValue([event]);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(245);

      const result = await useCase.execute();

      expect(result[0]?.id).toBe("EVENT-004");
      expect(result[0]?.name).toBe("Theater Play");
      expect(result[0]?.date).toEqual(eventDate);
      expect(result[0]?.location).toBe("Broadway Theater");
      expect(result[0]?.venueName).toBe("Stage 1");
      expect(result[0]?.imageUrl).toBe("https://example.com/play.jpg");
      expect(result[0]?.description).toBe("A wonderful theater experience");
      expect(result[0]?.createdBy).toBe("organizer-123");
    });

    it("should handle repository errors gracefully", async () => {
      mockEventRepository.findAll.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(useCase.execute()).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("should handle getRealTimeAvailability errors", async () => {
      const event = new Event(
        "EVENT-005",
        "Test Event",
        new Date("2026-09-01"),
        "Test Location",
        "Test Venue",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, "USD"),
            100,
            80,
          ),
        ],
      );

      mockEventRepository.findAll.mockResolvedValue([event]);
      mockEventRepository.getRealTimeAvailability.mockRejectedValue(
        new Error("Availability calculation failed"),
      );

      await expect(useCase.execute()).rejects.toThrow(
        "Availability calculation failed",
      );
    });

    it("should create new instances with updated availability", async () => {
      const originalConfig = new TicketConfiguration(
        TicketType.GENERAL,
        Money.create(50, "USD"),
        100,
        100, // Original availability
      );

      const event = new Event(
        "EVENT-006",
        "Updated Event",
        new Date("2026-07-01"),
        "Location",
        "Venue",
        [originalConfig],
      );

      mockEventRepository.findAll.mockResolvedValue([event]);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(85); // Updated availability

      const result = await useCase.execute();

      // Verify that a new configuration was created
      expect(result[0]?.ticketConfigurations[0]).not.toBe(originalConfig);
      expect(result[0]?.ticketConfigurations[0]?.availableQuantity).toBe(85);
      expect(result[0]?.ticketConfigurations[0]?.totalQuantity).toBe(100);

      // Verify that a new event was created
      expect(result[0]).not.toBe(event);
      expect(result[0]?.id).toBe(event.id);
      expect(result[0]?.name).toBe(event.name);
    });
  });
});
