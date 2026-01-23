import { Test, TestingModule } from "@nestjs/testing";
import { CreateEventUseCase } from "./create-event.use-case";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { EVENT_REPOSITORY } from "../../domain/interfaces/repository-tokens";
import { EventIdGeneratorService } from "../services/event-id-generator.service";
import { Event } from "../../domain/entities/event.entity";
import { TicketConfiguration } from "../../domain/entities/ticket-configuration.entity";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";
import { Money } from "../../domain/value-objects/money.vo";

describe("CreateEventUseCase", () => {
  let useCase: CreateEventUseCase;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockEventIdGenerator: jest.Mocked<EventIdGeneratorService>;

  beforeEach(async () => {
    mockEventRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRealTimeAvailability: jest.fn(),
      findByIdWithTickets: jest.fn(),
      getEventsByCategory: jest.fn(),
      getEventsByMonth: jest.fn(),
      findUpcoming: jest.fn(),
      findPast: jest.fn(),
    } as any;

    mockEventIdGenerator = {
      generateNextId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEventUseCase,
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: EventIdGeneratorService,
          useValue: mockEventIdGenerator,
        },
      ],
    }).compile();

    useCase = module.get<CreateEventUseCase>(CreateEventUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("execute", () => {
    const futureDate = new Date("2026-12-31T20:00:00Z");

    const createValidInput = () => ({
      name: "Rock Concert",
      date: futureDate,
      location: "Madison Square Garden",
      venueName: "Main Arena",
      imageUrl: "https://example.com/concert.jpg",
      description: "Amazing rock concert",
      ticketConfigurations: [
        {
          type: TicketType.GENERAL,
          price: 50,
          currency: "USD",
          quantity: 100,
        },
        {
          type: TicketType.VIP,
          price: 150,
          currency: "USD",
          quantity: 50,
        },
      ],
      createdBy: "organizer-123",
    });

    it("should create a new event successfully", async () => {
      const input = createValidInput();
      const generatedId = "EVENT-001";

      const savedEvent = new Event(
        generatedId,
        input.name,
        input.date,
        input.location,
        input.venueName,
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, "USD"),
            100,
            100,
          ),
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(150, "USD"),
            50,
            50,
          ),
        ],
        input.imageUrl,
        input.description,
        [],
        input.createdBy,
      );

      mockEventIdGenerator.generateNextId.mockResolvedValue(generatedId);
      mockEventRepository.save.mockResolvedValue(savedEvent);

      const result = await useCase.execute(input);

      expect(result.id).toBe(generatedId);
      expect(result.name).toBe(input.name);
      expect(result.date).toEqual(input.date);
      expect(result.location).toBe(input.location);
      expect(result.venueName).toBe(input.venueName);
      expect(result.ticketConfigurations).toHaveLength(2);
      expect(mockEventIdGenerator.generateNextId).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: generatedId,
          name: input.name,
        }),
      );
    });

    it("should initialize ticket availability equal to quantity", async () => {
      const input = createValidInput();
      mockEventIdGenerator.generateNextId.mockResolvedValue("EVENT-002");
      mockEventRepository.save.mockImplementation((event) =>
        Promise.resolve(event),
      );

      const result = await useCase.execute(input);

      expect(result.ticketConfigurations[0]?.totalQuantity).toBe(100);
      expect(result.ticketConfigurations[0]?.availableQuantity).toBe(100);
      expect(result.ticketConfigurations[1]?.totalQuantity).toBe(50);
      expect(result.ticketConfigurations[1]?.availableQuantity).toBe(50);
    });

    it("should throw error when name is empty", async () => {
      const input = createValidInput();
      input.name = "   ";

      await expect(useCase.execute(input)).rejects.toThrow(
        "Event name is required and cannot be empty",
      );
      expect(mockEventIdGenerator.generateNextId).not.toHaveBeenCalled();
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it("should throw error when date is in the past", async () => {
      const input = createValidInput();
      input.date = new Date("2020-01-01");

      await expect(useCase.execute(input)).rejects.toThrow(
        "Event date cannot be in the past",
      );
      expect(mockEventIdGenerator.generateNextId).not.toHaveBeenCalled();
    });

    it("should throw error when location is empty", async () => {
      const input = createValidInput();
      input.location = "";

      await expect(useCase.execute(input)).rejects.toThrow(
        "Event location is required and cannot be empty",
      );
      expect(mockEventIdGenerator.generateNextId).not.toHaveBeenCalled();
    });

    it("should throw error when venue name is empty", async () => {
      const input = createValidInput();
      input.venueName = "   ";

      await expect(useCase.execute(input)).rejects.toThrow(
        "Venue name is required and cannot be empty",
      );
      expect(mockEventIdGenerator.generateNextId).not.toHaveBeenCalled();
    });

    it("should throw error when no ticket configurations provided", async () => {
      const input = createValidInput();
      input.ticketConfigurations = [];

      await expect(useCase.execute(input)).rejects.toThrow(
        "At least one ticket configuration is required",
      );
      expect(mockEventIdGenerator.generateNextId).not.toHaveBeenCalled();
    });

    it("should throw error when ticket price is negative", async () => {
      const input = createValidInput();
      input.ticketConfigurations[0]!.price = -10;

      await expect(useCase.execute(input)).rejects.toThrow(
        "Ticket configuration 0 has invalid price",
      );
      expect(mockEventIdGenerator.generateNextId).not.toHaveBeenCalled();
    });

    it("should throw error when ticket currency is invalid", async () => {
      const input = createValidInput();
      input.ticketConfigurations[0]!.currency = "US";

      await expect(useCase.execute(input)).rejects.toThrow(
        "Ticket configuration 0 has invalid currency",
      );
      expect(mockEventIdGenerator.generateNextId).not.toHaveBeenCalled();
    });

    it("should throw error when ticket quantity is zero or negative", async () => {
      const input = createValidInput();
      input.ticketConfigurations[0]!.quantity = 0;

      await expect(useCase.execute(input)).rejects.toThrow(
        "Ticket configuration 0 has invalid quantity",
      );
      expect(mockEventIdGenerator.generateNextId).not.toHaveBeenCalled();
    });

    it("should create event without optional fields", async () => {
      const input = {
        name: "Simple Event",
        date: futureDate,
        location: "Simple Location",
        venueName: "Simple Venue",
        ticketConfigurations: [
          {
            type: TicketType.GENERAL,
            price: 40,
            currency: "USD",
            quantity: 200,
          },
        ],
      };

      mockEventIdGenerator.generateNextId.mockResolvedValue("EVENT-003");
      mockEventRepository.save.mockImplementation((event) =>
        Promise.resolve(event),
      );

      const result = await useCase.execute(input);

      expect(result.imageUrl).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.createdBy).toBeUndefined();
    });

    it("should handle multiple ticket types correctly", async () => {
      const input = createValidInput();
      input.ticketConfigurations.push({
        type: TicketType.EARLY_BIRD,
        price: 35,
        currency: "USD",
        quantity: 150,
      });

      mockEventIdGenerator.generateNextId.mockResolvedValue("EVENT-004");
      mockEventRepository.save.mockImplementation((event) =>
        Promise.resolve(event),
      );

      const result = await useCase.execute(input);

      expect(result.ticketConfigurations).toHaveLength(3);
      expect(result.ticketConfigurations[2]?.type).toBe(TicketType.EARLY_BIRD);
      expect(result.ticketConfigurations[2]?.totalQuantity).toBe(150);
    });

    it("should use Money.create for price conversion", async () => {
      const input = createValidInput();
      const moneySpy = jest.spyOn(Money, "create");

      mockEventIdGenerator.generateNextId.mockResolvedValue("EVENT-005");
      mockEventRepository.save.mockImplementation((event) =>
        Promise.resolve(event),
      );

      await useCase.execute(input);

      expect(moneySpy).toHaveBeenCalledWith(50, "USD");
      expect(moneySpy).toHaveBeenCalledWith(150, "USD");
      moneySpy.mockRestore();
    });

    it("should handle repository errors gracefully", async () => {
      const input = createValidInput();
      mockEventIdGenerator.generateNextId.mockResolvedValue("EVENT-006");
      mockEventRepository.save.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("should handle ID generator errors gracefully", async () => {
      const input = createValidInput();
      mockEventIdGenerator.generateNextId.mockRejectedValue(
        new Error("ID generation failed"),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        "ID generation failed",
      );
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it("should create event with empty eventDetails array by default", async () => {
      const input = createValidInput();
      mockEventIdGenerator.generateNextId.mockResolvedValue("EVENT-007");
      mockEventRepository.save.mockImplementation((event) =>
        Promise.resolve(event),
      );

      await useCase.execute(input);

      const saveCall = mockEventRepository.save.mock.calls[0]?.[0];
      expect(saveCall?.details).toEqual([]);
    });
  });
});
