import { Test, TestingModule } from '@nestjs/testing';
import { ResendEmailUseCase } from './resend-email.use-case';
import { ITicketRepository } from '../../domain/interfaces/ticket-repository.interface';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import {
  TICKET_REPOSITORY,
  EVENT_REPOSITORY,
} from '../../domain/interfaces/repository-tokens';
import { EmailService } from '../../infrastructure/external/email.service';
import { Ticket, TicketStatus } from '../../domain/entities/ticket.entity';
import { Event } from '../../domain/entities/event.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { TicketConfiguration } from '../../domain/entities/ticket-configuration.entity';

describe('ResendEmailUseCase', () => {
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

  describe('resendConfirmationEmail', () => {
    const buyerEmail = 'buyer@example.com';
    const eventDate = new Date('2026-12-31T20:00:00Z');

    const createTestTicket = (id: string, eventId: string) =>
      new Ticket(
        id,
        `TICKET-${id}`,
        eventId,
        TicketType.GENERAL,
        Email.create(buyerEmail),
        Money.create(50, 'USD'),
        new Date(),
        `qr-token-${id}`,
        TicketStatus.PAID,
      );

    const createTestEvent = (id: string) =>
      new Event(
        id,
        'Concert',
        eventDate,
        'Venue',
        'Main Hall',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, 'USD'),
            100,
            50,
          ),
        ],
      );

    it('should resend confirmation email for all tickets of a buyer', async () => {
      const tickets = [
        createTestTicket('1', 'event-1'),
        createTestTicket('2', 'event-2'),
      ];
      const events = [createTestEvent('event-1'), createTestEvent('event-2')];

      mockTicketRepository.findByBuyerEmail.mockResolvedValue(tickets);
      mockEventRepository.findById
        .mockResolvedValueOnce(events[0])
        .mockResolvedValueOnce(events[1]);
      mockEmailService.sendTicketConfirmationEmailEmail.mockResolvedValue(undefined);

      const result = await useCase.resendConfirmationEmail(buyerEmail);

      expect(result).toBe(true);
      expect(mockTicketRepository.findByBuyerEmail).toHaveBeenCalledWith(
        buyerEmail,
      );
      expect(mockEventRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendTicketConfirmationEmailEmail).toHaveBeenCalledTimes(2);
    });

    it('should resend confirmation email for specific ticket', async () => {
      const ticket = createTestTicket('1', 'event-1');
      const event = createTestEvent('event-1');

      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockEventRepository.findById.mockResolvedValue(event);
      mockEmailService.sendTicketConfirmationEmailEmail.mockResolvedValue(undefined);

      const result = await useCase.resendConfirmationEmail(buyerEmail, '1');

      expect(result).toBe(true);
      expect(mockTicketRepository.findById).toHaveBeenCalledWith('1');
      expect(mockEmailService.sendTicketConfirmationEmailEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendTicketConfirmationEmailEmail).toHaveBeenCalledWith(
        Email.create(buyerEmail),
        expect.objectContaining({ id: '1' }),
        event,
      );
    });

    it('should throw error when specific ticket does not belong to buyer', async () => {
      const ticket = createTestTicket('1', 'event-1');
      ticket['_buyerEmail'] = Email.create('other@example.com');

      mockTicketRepository.findById.mockResolvedValue(ticket);

      await expect(
        useCase.resendConfirmationEmail(buyerEmail, '1'),
      ).rejects.toThrow('Ticket not found or does not belong to this email');
      expect(mockEmailService.sendTicketConfirmationEmailEmail).not.toHaveBeenCalled();
    });

    it('should throw error when specific ticket not found', async () => {
      mockTicketRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.resendConfirmationEmail(buyerEmail, 'non-existent'),
      ).rejects.toThrow('Ticket not found or does not belong to this email');
      expect(mockEmailService.sendTicketConfirmationEmailEmail).not.toHaveBeenCalled();
    });

    it('should return false when no tickets found for buyer', async () => {
      mockTicketRepository.findByBuyerEmail.mockResolvedValue([]);

      const result = await useCase.resendConfirmationEmail(buyerEmail);

      expect(result).toBe(false);
      expect(mockEmailService.sendTicketConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should handle email service errors gracefully', async () => {
      const tickets = [createTestTicket('1', 'event-1')];
      const event = createTestEvent('event-1');

      mockTicketRepository.findByBuyerEmail.mockResolvedValue(tickets);
      mockEventRepository.findById.mockResolvedValue(event);
      mockEmailService.sendTicketConfirmationEmailEmail.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      const result = await useCase.resendConfirmationEmail(buyerEmail);

      expect(result).toBe(false);
    });

    it('should handle event not found gracefully', async () => {
      const tickets = [createTestTicket('1', 'event-1')];

      mockTicketRepository.findByBuyerEmail.mockResolvedValue(tickets);
      mockEventRepository.findById.mockResolvedValue(null);

      const result = await useCase.resendConfirmationEmail(buyerEmail);

      expect(result).toBe(false);
      expect(mockEmailService.sendTicketConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendEventReminders', () => {
    const eventDate = new Date('2026-12-31T20:00:00Z');

    it('should send reminders for upcoming events', async () => {
      const events = [
        new Event(
          'event-1',
          'Concert 1',
          eventDate,
          'Venue 1',
          'Hall 1',
          [
            new TicketConfiguration(
              TicketType.GENERAL,
              Money.create(50, 'USD'),
              100,
              50,
            ),
          ],
        ),
        new Event(
          'event-2',
          'Concert 2',
          eventDate,
          'Venue 2',
          'Hall 2',
          [
            new TicketConfiguration(
              TicketType.VIP,
              Money.create(150, 'USD'),
              50,
              25,
            ),
          ],
        ),
      ];

      const tickets = [
        new Ticket(
          '1',
          'TICKET-1',
          'event-1',
          TicketType.GENERAL,
          Email.create('buyer1@example.com'),
          Money.create(50, 'USD'),
          new Date(),
          'qr-1',
          TicketStatus.PAID,
        ),
        new Ticket(
          '2',
          'TICKET-2',
          'event-2',
          TicketType.VIP,
          Email.create('buyer2@example.com'),
          Money.create(150, 'USD'),
          new Date(),
          'qr-2',
          TicketStatus.PAID,
        ),
      ];

      mockEventRepository.findUpcoming.mockResolvedValue(events);
      mockTicketRepository.findByEventId
        .mockResolvedValueOnce([tickets[0]!])
        .mockResolvedValueOnce([tickets[1]!]);
      mockEmailService.sendEventReminderEmail.mockResolvedValue(undefined);

      const result = await useCase.sendEventReminder();

      expect(result).toBe(true);
      expect(mockEventRepository.findUpcoming).toHaveBeenCalled();
      expect(mockTicketRepository.findByEventId).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendEventReminderEmail).toHaveBeenCalledTimes(2);
    });

    it('should handle no upcoming events', async () => {
      mockEventRepository.findUpcoming.mockResolvedValue([]);

      const result = await useCase.sendEventReminder();

      expect(result).toBe(false);
      expect(mockTicketRepository.findByEventId).not.toHaveBeenCalled();
      expect(mockEmailService.sendEventReminderEmail).not.toHaveBeenCalled();
    });

    it('should skip events with no tickets', async () => {
      const events = [
        new Event(
          'event-1',
          'Concert',
          eventDate,
          'Venue',
          'Hall',
          [
            new TicketConfiguration(
              TicketType.GENERAL,
              Money.create(50, 'USD'),
              100,
              100,
            ),
          ],
        ),
      ];

      mockEventRepository.findUpcoming.mockResolvedValue(events);
      mockTicketRepository.findByEventId.mockResolvedValue([]);
      mockEmailService.sendEventReminderEmail.mockResolvedValue(undefined);

      const result = await useCase.sendEventReminder();

      expect(result).toBe(true);
      expect(mockEmailService.sendEventReminderEmail).not.toHaveBeenCalled();
    });

    it('should handle email service errors in reminders', async () => {
      const events = [
        new Event(
          'event-1',
          'Concert',
          eventDate,
          'Venue',
          'Hall',
          [
            new TicketConfiguration(
              TicketType.GENERAL,
              Money.create(50, 'USD'),
              100,
              50,
            ),
          ],
        ),
      ];
      const tickets = [
        new Ticket(
          '1',
          'TICKET-1',
          'event-1',
          TicketType.GENERAL,
          Email.create('buyer@example.com'),
          Money.create(50, 'USD'),
          new Date(),
          'qr-1',
          TicketStatus.PAID,
        ),
      ];

      mockEventRepository.findUpcoming.mockResolvedValue(events);
      mockTicketRepository.findByEventId.mockResolvedValue(tickets);
      mockEmailService.sendEventReminderEmail.mockRejectedValue(
        new Error('Email service down'),
      );

      const result = await useCase.sendEventReminder();

      expect(result).toBe(false);
    });
  });
});
