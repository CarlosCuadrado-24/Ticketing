import { Test, TestingModule } from "@nestjs/testing";
import { ResendEmailUseCase } from "./resend-email.use-case";
import { ITicketRepository } from "../../domain/interfaces/ticket-repository.interface";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import {
  TICKET_REPOSITORY,
  EVENT_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";
import { EmailService } from "../../infrastructure/external/email.service";
import { Ticket, TicketStatus } from "../../domain/entities/ticket.entity";
import { Event } from "../../domain/entities/event.entity";
import { Email } from "../../domain/value-objects/email.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";
import { TicketConfiguration } from "../../domain/entities/ticket-configuration.entity";

describe("ResendEmailUseCase", () => {
  let useCase: ResendEmailUseCase;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    mockTicketRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByBuyerEmail: jest.fn(),
      findByEventId: jest.fn(),
      findByQRToken: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
      count: jest.fn(),
      getTicketsByEventId: jest.fn(),
      getSalesTrendForEvent: jest.fn(),
      getTicketsByTypeForEvent: jest.fn(),
      getTopSellingEvents: jest.fn(),
    } as any;

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

    mockEmailService = {
      sendTicketConfirmationEmail: jest.fn(),
      sendEventReminderEmail: jest.fn(),
      sendEmail: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResendEmailUseCase,
        {
          provide: TICKET_REPOSITORY,
          useValue: mockTicketRepository,
        },
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    useCase = module.get<ResendEmailUseCase>(ResendEmailUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("resendConfirmationEmail", () => {
    const buyerEmail = "buyer@example.com";
    const eventDate = new Date("2026-12-31T20:00:00Z");

    const createTestTicket = (id: string, eventId: string) =>
      new Ticket(
        id,
        `TICKET-${id}`,
        eventId,
        TicketType.GENERAL,
        Email.create(buyerEmail),
        Money.create(50, "USD"),
        new Date(),
        `qr-token-${id}`,
        TicketStatus.PAID,
      );

    const createTestEvent = (id: string) =>
      new Event(id, "Concert", eventDate, "Venue", "Main Hall", [
        new TicketConfiguration(
          TicketType.GENERAL,
          Money.create(50, "USD"),
          100,
          50,
        ),
      ]);

    it("should resend confirmation email for all tickets of a buyer", async () => {
      const tickets = [
        createTestTicket("1", "event-1"),
        createTestTicket("2", "event-2"),
      ];
      const events = [createTestEvent("event-1"), createTestEvent("event-2")];

      mockTicketRepository.findByBuyerEmail.mockResolvedValue(tickets);
      mockEventRepository.findById
        .mockResolvedValueOnce(events[0]!)
        .mockResolvedValueOnce(events[1]!);
      mockEmailService.sendTicketConfirmationEmail.mockResolvedValue(true);

      const result = await useCase.resendConfirmationEmail(buyerEmail);

      expect(result).toBe(true);
      expect(mockTicketRepository.findByBuyerEmail).toHaveBeenCalledWith(
        buyerEmail,
      );
      expect(mockEventRepository.findById).toHaveBeenCalledTimes(2);
      expect(
        mockEmailService.sendTicketConfirmationEmail,
      ).toHaveBeenCalledTimes(2);

      // Verify the structure of the email data object
      expect(mockEmailService.sendTicketConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerEmail,
          buyerName: expect.any(String),
          tickets: expect.arrayContaining([
            expect.objectContaining({ id: "1" }),
          ]),
          eventName: "Concert",
          eventDate: expect.any(String),
          eventLocation: "Venue",
        }),
      );
    });

    it("should resend confirmation email for specific ticket", async () => {
      const ticket = createTestTicket("1", "event-1");
      const event = createTestEvent("event-1");

      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockEventRepository.findById.mockResolvedValue(event);
      mockEmailService.sendTicketConfirmationEmail.mockResolvedValue(true);

      const result = await useCase.resendConfirmationEmail(buyerEmail, "1");

      expect(result).toBe(true);
      expect(mockTicketRepository.findById).toHaveBeenCalledWith("1");
      expect(
        mockEmailService.sendTicketConfirmationEmail,
      ).toHaveBeenCalledTimes(1);

      // Verify complete email data structure
      expect(mockEmailService.sendTicketConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerEmail,
          buyerName: expect.any(String),
          tickets: expect.arrayContaining([
            expect.objectContaining({ id: "1", code: "TICKET-1" }),
          ]),
          eventName: "Concert",
          eventDate: expect.any(String),
          eventLocation: "Venue",
          eventVenueName: "Main Hall",
        }),
      );
    });

    it("should throw error when specific ticket does not belong to buyer", async () => {
      const ticket = createTestTicket("1", "event-1");
      // Create ticket with different buyer email
      const otherTicket = new Ticket(
        ticket.id,
        ticket.code,
        ticket.eventId,
        ticket.type,
        Email.create("other@example.com"),
        ticket.price,
        ticket.purchaseDate,
        ticket.qrToken,
      );

      mockTicketRepository.findById.mockResolvedValue(otherTicket);

      await expect(
        useCase.resendConfirmationEmail(buyerEmail, "1"),
      ).rejects.toThrow("Ticket not found or does not belong to this email");

      // Email service should not be called when ticket doesn't belong to buyer
      expect(
        mockEmailService.sendTicketConfirmationEmail,
      ).not.toHaveBeenCalled();
    });

    it("should throw error when specific ticket not found", async () => {
      mockTicketRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.resendConfirmationEmail(buyerEmail, "non-existent"),
      ).rejects.toThrow("Ticket not found or does not belong to this email");

      // Email service should not be called when ticket doesn't exist
      expect(
        mockEmailService.sendTicketConfirmationEmail,
      ).not.toHaveBeenCalled();
    });

    it("should return false when no tickets found for buyer", async () => {
      mockTicketRepository.findByBuyerEmail.mockResolvedValue([]);

      const result = await useCase.resendConfirmationEmail(buyerEmail);

      // Should return false gracefully instead of throwing error
      expect(result).toBe(false);
      expect(mockTicketRepository.findByBuyerEmail).toHaveBeenCalledWith(
        buyerEmail,
      );
      // Email service should not be called when no tickets exist
      expect(
        mockEmailService.sendTicketConfirmationEmail,
      ).not.toHaveBeenCalled();
    });

    it("should handle email service errors gracefully", async () => {
      const tickets = [createTestTicket("1", "event-1")];
      const event = createTestEvent("event-1");

      mockTicketRepository.findByBuyerEmail.mockResolvedValue(tickets);
      mockEventRepository.findById.mockResolvedValue(event);
      // Simulate email service failure
      mockEmailService.sendTicketConfirmationEmail.mockResolvedValue(false);

      const result = await useCase.resendConfirmationEmail(buyerEmail);

      // Should return false when email service fails, not throw error
      expect(result).toBe(false);
      expect(mockEmailService.sendTicketConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerEmail,
          tickets: expect.arrayContaining([
            expect.objectContaining({ id: "1" }),
          ]),
        }),
      );
    });

    it("should handle event not found gracefully", async () => {
      const tickets = [createTestTicket("1", "event-1")];

      mockTicketRepository.findByBuyerEmail.mockResolvedValue(tickets);
      mockEventRepository.findById.mockResolvedValue(null);

      const result = await useCase.resendConfirmationEmail(buyerEmail);

      // Should return false when event doesn't exist, not crash
      expect(result).toBe(false);
      expect(mockEventRepository.findById).toHaveBeenCalledWith("event-1");
      // Email service should not be called when event is missing
      expect(
        mockEmailService.sendTicketConfirmationEmail,
      ).not.toHaveBeenCalled();
    });
  });

  describe("sendEventReminders", () => {
    const eventDate = new Date("2026-12-31T20:00:00Z");

    it("should send reminders for upcoming events", async () => {
      const event = new Event(
        "event-1",
        "Concert 1",
        eventDate,
        "Venue 1",
        "Hall 1",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, "USD"),
            100,
            50,
          ),
        ],
      );

      const tickets = [
        new Ticket(
          "1",
          "TICKET-1",
          "event-1",
          TicketType.GENERAL,
          Email.create("buyer1@example.com"),
          Money.create(50, "USD"),
          new Date(),
          "qr-1",
          TicketStatus.PAID,
        ),
        new Ticket(
          "2",
          "TICKET-2",
          "event-1",
          TicketType.GENERAL,
          Email.create("buyer2@example.com"),
          Money.create(50, "USD"),
          new Date(),
          "qr-2",
          TicketStatus.PAID,
        ),
      ];

      mockEventRepository.findById.mockResolvedValue(event);
      mockTicketRepository.findByEventId.mockResolvedValue(tickets);
      mockEmailService.sendEventReminderEmail.mockResolvedValue(true);

      const result = await useCase.sendEventReminder("event-1");

      expect(result).toBe(true);
      expect(mockEventRepository.findById).toHaveBeenCalledWith("event-1");
      expect(mockTicketRepository.findByEventId).toHaveBeenCalledWith(
        "event-1",
      );
      // Should send one email per unique buyer (2 buyers)
      expect(mockEmailService.sendEventReminderEmail).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendEventReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerEmail: "buyer1@example.com",
          eventName: "Concert 1",
          tickets: expect.arrayContaining([
            expect.objectContaining({ id: "1" }),
          ]),
        }),
      );
    });

    it("should handle no upcoming events", async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      const result = await useCase.sendEventReminder("non-existent-event");

      // Should return false when event not found
      expect(result).toBe(false);
      expect(mockEventRepository.findById).toHaveBeenCalledWith(
        "non-existent-event",
      );
      // Should not attempt to find tickets or send emails
      expect(mockTicketRepository.findByEventId).not.toHaveBeenCalled();
      expect(mockEmailService.sendEventReminderEmail).not.toHaveBeenCalled();
    });

    it("should skip events with no tickets", async () => {
      const event = new Event(
        "event-1",
        "Concert",
        eventDate,
        "Venue",
        "Hall",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, "USD"),
            100,
            100,
          ),
        ],
      );

      mockEventRepository.findById.mockResolvedValue(event);
      mockTicketRepository.findByEventId.mockResolvedValue([]);

      const result = await useCase.sendEventReminder("event-1");

      // Should return true (success) even when no tickets - it's not an error condition
      expect(result).toBe(true);
      expect(mockEventRepository.findById).toHaveBeenCalledWith("event-1");
      expect(mockTicketRepository.findByEventId).toHaveBeenCalledWith(
        "event-1",
      );
      // No emails should be sent if no tickets exist
      expect(mockEmailService.sendEventReminderEmail).not.toHaveBeenCalled();
    });

    it("should handle email service errors in reminders", async () => {
      const event = new Event(
        "event-1",
        "Concert",
        eventDate,
        "Venue",
        "Hall",
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, "USD"),
            100,
            50,
          ),
        ],
      );
      const tickets = [
        new Ticket(
          "1",
          "TICKET-1",
          "event-1",
          TicketType.GENERAL,
          Email.create("buyer@example.com"),
          Money.create(50, "USD"),
          new Date(),
          "qr-1",
          TicketStatus.PAID,
        ),
      ];

      mockEventRepository.findById.mockResolvedValue(event);
      mockTicketRepository.findByEventId.mockResolvedValue(tickets);
      // Simulate email service failure
      mockEmailService.sendEventReminderEmail.mockRejectedValue(
        new Error("Email service down"),
      );

      const result = await useCase.sendEventReminder("event-1");

      // Should return false when email service fails, not crash
      expect(result).toBe(false);
      expect(mockEventRepository.findById).toHaveBeenCalledWith("event-1");
      expect(mockEmailService.sendEventReminderEmail).toHaveBeenCalled();
    });
  });
});
