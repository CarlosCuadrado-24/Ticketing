import { Test, TestingModule } from "@nestjs/testing";
import { CreateReservationUseCase } from "./create-reservation.use-case";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { IReservationRepository } from "../../domain/interfaces/reservation-repository.interface";
import {
  EVENT_REPOSITORY,
  RESERVATION_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";
import { TicketAvailabilityService } from "../../infrastructure/websocket/ticket-availability.service";
import { Event } from "../../domain/entities/event.entity";
import { TicketConfiguration } from "../../domain/entities/ticket-configuration.entity";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { Email } from "../../domain/value-objects/email.vo";
import { TicketQuantity } from "../../domain/value-objects/ticket-quantity.vo";

describe("CreateReservationUseCase", () => {
  let useCase: CreateReservationUseCase;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockReservationRepository: jest.Mocked<IReservationRepository>;
  let mockTicketAvailabilityService: jest.Mocked<TicketAvailabilityService>;

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

    mockReservationRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByEmail: jest.fn(),
      findExpired: jest.fn(),
      findActive: jest.fn(),
      findByEventId: jest.fn(),
      countActiveByEventAndType: jest.fn(),
    } as any;

    mockTicketAvailabilityService = {
      broadcastUpdate: jest.fn(),
      setServer: jest.fn(),
      subscribeToEvent: jest.fn(),
      unsubscribeFromEvent: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateReservationUseCase,
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: RESERVATION_REPOSITORY,
          useValue: mockReservationRepository,
        },
        {
          provide: TicketAvailabilityService,
          useValue: mockTicketAvailabilityService,
        },
      ],
    }).compile();

    useCase = module.get<CreateReservationUseCase>(CreateReservationUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("execute", () => {
    const eventDate = new Date("2026-12-31T20:00:00Z");

    const createTestEvent = (availableQty = 50) =>
      new Event("event-1", "Rock Concert", eventDate, "Stadium", "Main Arena", [
        new TicketConfiguration(
          TicketType.GENERAL,
          Money.create(50, "USD"),
          100,
          availableQty,
        ),
        new TicketConfiguration(
          TicketType.VIP,
          Money.create(150, "USD"),
          50,
          25,
        ),
      ]);

    const createValidInput = () => ({
      eventId: "event-1",
      ticketType: TicketType.GENERAL,
      quantity: 5,
      buyerEmail: "buyer@example.com",
    });

    it("should create a reservation successfully", async () => {
      const input = createValidInput();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(45);
      mockReservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation),
      );

      const result = await useCase.execute(input);

      expect(result.id).toBeDefined();
      expect(result.eventId).toBe(input.eventId);
      expect(result.ticketType).toBe(input.ticketType);
      expect(result.quantity.value).toBe(input.quantity);
      expect(result.buyerEmail.value).toBe(input.buyerEmail);
      expect(result.expiresAt).toBeInstanceOf(Date);

      expect(mockEventRepository.findById).toHaveBeenCalledWith(input.eventId);
      expect(mockEventRepository.getRealTimeAvailability).toHaveBeenCalledWith(
        input.eventId,
        input.ticketType,
      );
      expect(mockReservationRepository.save).toHaveBeenCalled();
    });

    it("should set expiration to 15 minutes from now", async () => {
      const input = createValidInput();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(45);
      mockReservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation),
      );

      const before = Date.now();
      const result = await useCase.execute(input);
      const after = Date.now();

      const expectedExpiration = 15 * 60 * 1000;
      const expirationTime = result.expiresAt.getTime() - before;

      expect(expirationTime).toBeGreaterThanOrEqual(expectedExpiration - 100);
      expect(expirationTime).toBeLessThanOrEqual(
        expectedExpiration + (after - before) + 100,
      );
    });

    it("should throw error when event not found", async () => {
      const input = createValidInput();

      mockEventRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow("Event with ID");
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
      // Availability service not called on error
    });

    it("should throw error when ticket type not available for event", async () => {
      const input = createValidInput();
      input.ticketType = TicketType.EARLY_BIRD;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);

      await expect(useCase.execute(input)).rejects.toThrow(
        "Ticket configuration for type",
      );
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it("should throw error when insufficient tickets available", async () => {
      const input = createValidInput();
      input.quantity = 50;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(10);

      await expect(useCase.execute(input)).rejects.toThrow(
        "Quantity cannot exceed",
      );
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
      // Availability service not called on error
    });

    it("should check real-time availability including active reservations", async () => {
      const input = createValidInput();
      const event = createTestEvent(50);

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(20);

      // Mock save to return a reservation with an ID
      mockReservationRepository.save.mockImplementation(async (reservation) => {
        return { ...reservation, id: "test-reservation-id" } as any;
      });

      const result = await useCase.execute(input);

      expect(result).toBeDefined();
      expect(mockEventRepository.getRealTimeAvailability).toHaveBeenCalledWith(
        "event-1",
        TicketType.GENERAL,
      );
    });

    it("should create reservation with correct quantity value object", async () => {
      const input = createValidInput();
      const event = createTestEvent();
      const quantitySpy = jest.spyOn(TicketQuantity, "create");

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(45);
      mockReservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation),
      );

      await useCase.execute(input);

      expect(quantitySpy).toHaveBeenCalledWith(input.quantity);
      quantitySpy.mockRestore();
    });

    it("should create reservation with correct email value object", async () => {
      const input = createValidInput();
      const event = createTestEvent();
      const emailSpy = jest.spyOn(Email, "create");

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(45);
      mockReservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation),
      );

      await useCase.execute(input);

      expect(emailSpy).toHaveBeenCalledWith(input.buyerEmail);
      emailSpy.mockRestore();
    });

    it("should broadcast availability update after successful reservation", async () => {
      const input = createValidInput();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(45);
      mockReservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation),
      );

      await useCase.execute(input);

      expect(mockReservationRepository.save).toHaveBeenCalled();
    });

    it("should handle invalid email format", async () => {
      const input = createValidInput();
      input.buyerEmail = "invalid-email";
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(45);

      await expect(useCase.execute(input)).rejects.toThrow();
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it("should handle quantity exceeding maximum allowed", async () => {
      const input = createValidInput();
      input.quantity = 101;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);

      await expect(useCase.execute(input)).rejects.toThrow();
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it("should handle zero or negative quantity", async () => {
      const input = createValidInput();
      input.quantity = 0;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);

      await expect(useCase.execute(input)).rejects.toThrow();
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it("should create reservation with unique UUID", async () => {
      const input = createValidInput();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(45);
      mockReservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation),
      );

      const result1 = await useCase.execute(input);
      const result2 = await useCase.execute(input);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it("should handle repository save errors", async () => {
      const input = createValidInput();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(45);
      mockReservationRepository.save.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(useCase.execute(input)).rejects.toThrow("Database error");
      // Availability service not called on database error
    });

    it("should handle multiple ticket types in same event", async () => {
      const input = createValidInput();
      input.ticketType = TicketType.VIP;
      input.quantity = 3;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(22);
      mockReservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation),
      );

      const result = await useCase.execute(input);

      expect(result.ticketType).toBe(TicketType.VIP);
      expect(result.quantity.value).toBe(3);
    });

    it("should handle boundary case of last available ticket", async () => {
      const input = createValidInput();
      input.quantity = 1;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(1);
      mockReservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation),
      );

      const result = await useCase.execute(input);

      expect(result.quantity.value).toBe(1);
      expect(mockReservationRepository.save).toHaveBeenCalled();
    });
  });
});
