import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseTicketUseCase } from './purchase-ticket.use-case';
import { ITicketRepository } from '../../domain/interfaces/ticket-repository.interface';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import {
  TICKET_REPOSITORY,
  EVENT_REPOSITORY,
} from '../../domain/interfaces/repository-tokens';
import { TicketAvailabilityService } from '../../infrastructure/websocket/ticket-availability.service';
import { EmailService } from '../../infrastructure/external/email.service';
import { DataSource } from 'typeorm';
import { Event } from '../../domain/entities/event.entity';
import { Ticket, TicketStatus } from '../../domain/entities/ticket.entity';
import { TicketConfiguration } from '../../domain/entities/ticket-configuration.entity';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { Email } from '../../domain/value-objects/email.vo';

describe('PurchaseTicketUseCase', () => {
  let useCase: PurchaseTicketUseCase;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockTicketAvailabilityService: jest.Mocked<TicketAvailabilityService>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    mockTicketRepository = {
      save: jest.fn(),
      saveMany: jest.fn(),
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
      updateTicketAvailability: jest.fn(),
      findByIdWithTickets: jest.fn(),
      getEventsByCategory: jest.fn(),
      getEventsByMonth: jest.fn(),
      findUpcoming: jest.fn(),
      findPast: jest.fn(),
    } as any;

    mockTicketAvailabilityService = {
      broadcastUpdate: jest.fn(),
      broadcastAvailabilityUpdate: jest.fn(),
    } as any;

    mockEmailService = {
      sendTicketConfirmation: jest.fn(),
      sendTicketConfirmationEmail: jest.fn(),
      sendEventReminder: jest.fn(),
      sendEmail: jest.fn(),
    } as any;

    // Mock DataSource.transaction to execute callback immediately
    mockDataSource = {
      transaction: jest.fn((callback) => callback({})),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseTicketUseCase,
        {
          provide: TICKET_REPOSITORY,
          useValue: mockTicketRepository,
        },
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: TicketAvailabilityService,
          useValue: mockTicketAvailabilityService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    useCase = module.get<PurchaseTicketUseCase>(PurchaseTicketUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const eventDate = new Date('2026-12-31T20:00:00Z');

    const createTestEvent = () =>
      new Event(
        'event-1',
        'Rock Concert',
        eventDate,
        'Stadium',
        'Main Arena',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, 'USD'),
            100,
            70,
          ),
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(150, 'USD'),
            50,
            25,
          ),
        ],
      );

    const createValidParams = () => ({
      eventId: 'event-1',
      ticketType: TicketType.GENERAL,
      quantity: 3,
      buyerEmail: 'buyer@example.com',
      paymentInfo: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
      },
    });

    it('should purchase tickets successfully', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      mockEmailService.sendTicketConfirmationEmail.mockResolvedValue(true);

      // Mock successful payment
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      const result = await useCase.execute(params);

      expect(result).toHaveLength(3);
      expect(result[0]?.eventId).toBe('event-1');
      expect(result[0]?.type).toBe(TicketType.GENERAL);
      expect(result[0]?.status).toBe(TicketStatus.PAID);
      expect(mockEventRepository.findById).toHaveBeenCalledWith('event-1');
      expect(mockTicketRepository.saveMany).toHaveBeenCalled();
      expect(
        mockTicketAvailabilityService.broadcastAvailabilityUpdate,
      ).toHaveBeenCalled();
    });

    it('should throw error when event not found', async () => {
      const params = createValidParams();

      mockEventRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(params)).rejects.toThrow('Event not found');
      expect(mockTicketRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should throw error when insufficient tickets available', async () => {
      const params = createValidParams();
      params.quantity = 100;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);

      await expect(useCase.execute(params)).rejects.toThrow(
        'Insufficient tickets available',
      );
      expect(mockTicketRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should throw error when ticket type not found', async () => {
      const params = createValidParams();
      params.ticketType = TicketType.EARLY_BIRD;
      const event = new Event(
        'event-1',
        'Rock Concert',
        eventDate,
        'Stadium',
        'Main Arena',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, 'USD'),
            100,
            70,
          ),
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(150, 'USD'),
            50,
            25,
          ),
          // Note: EARLY_BIRD not included
        ],
      );

      mockEventRepository.findById.mockResolvedValue(event);

      await expect(useCase.execute(params)).rejects.toThrow(
        'Insufficient tickets available',
      );
      expect(mockTicketRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should throw error when payment fails', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(false);

      await expect(useCase.execute(params)).rejects.toThrow('Payment failed');
      expect(mockTicketRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should generate unique ticket codes', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      const result = await useCase.execute(params);

      const codes = result.map((t) => t.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
      expect(result[0]?.code).toMatch(/^TKT-[A-Z0-9]{6}$/);
    });

    it('should generate unique QR tokens', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      const result = await useCase.execute(params);

      const qrTokens = result.map((t) => t.qrToken);
      const uniqueTokens = new Set(qrTokens);
      expect(uniqueTokens.size).toBe(qrTokens.length);
    });

    it('should update event availability after purchase', async () => {
      const params = createValidParams();
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.GENERAL);

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      await useCase.execute(params);

      expect(mockEventRepository.updateTicketAvailability).toHaveBeenCalledWith(
        'event-1',
        TicketType.GENERAL,
        initialAvailability - 3,
      );
    });

    it('should broadcast availability update after purchase', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      await useCase.execute(params);

      expect(
        mockTicketAvailabilityService.broadcastAvailabilityUpdate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-1',
          ticketType: TicketType.GENERAL,
          availableQuantity: 67,
        }),
      );
    });

    it('should send confirmation email after successful purchase', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      mockEmailService.sendTicketConfirmationEmail.mockResolvedValue(true);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      await useCase.execute(params);

      // Wait for async email to be triggered
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockEmailService.sendTicketConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerEmail: 'buyer@example.com',
          eventName: 'Rock Concert',
        }),
      );
    });

    it('should not fail purchase if email sending fails', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      mockEmailService.sendTicketConfirmationEmail.mockRejectedValue(
        new Error('Email service down'),
      );
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      const result = await useCase.execute(params);

      expect(result).toHaveLength(3);
    });

    it('should handle VIP ticket purchases', async () => {
      const params = createValidParams();
      params.ticketType = TicketType.VIP;
      params.quantity = 2;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(23);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      const result = await useCase.execute(params);

      expect(result).toHaveLength(2);
      expect(result[0]?.type).toBe(TicketType.VIP);
      expect(result[0]?.price.amount).toBe(150);
    });

    it('should use database transaction for atomicity', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      await useCase.execute(params);

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should rollback on transaction failure', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockTicketRepository.saveMany.mockRejectedValue(
        new Error('Database error'),
      );
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      // Transaction should fail and throw error
      mockDataSource.transaction = jest.fn((callback) => {
        return callback({}).catch((err: Error) => {
          throw err;
        });
      }) as any;

      await expect(useCase.execute(params)).rejects.toThrow('Database error');
    });

    it('should calculate correct total amount', async () => {
      const params = createValidParams();
      params.quantity = 5;
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(65);

      const processPaymentSpy = jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      await useCase.execute(params);

      expect(processPaymentSpy).toHaveBeenCalledWith(
        250,
        'USD',
        expect.any(Object),
      );
    });

    it('should extract display name from email', async () => {
      const params = createValidParams();
      params.buyerEmail = 'john.doe@example.com';
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      mockEmailService.sendTicketConfirmationEmail.mockResolvedValue(true);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      await useCase.execute(params);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockEmailService.sendTicketConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerName: 'John Doe',
        }),
      );
    });

    it('should handle large quantity purchases', async () => {
      const params = createValidParams();
      params.quantity = 50;
      const event = new Event(
        'event-1',
        'Festival',
        eventDate,
        'Park',
        'Main Stage',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(30, 'USD'),
            500,
            400,
          ),
        ],
      );

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(350);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      const result = await useCase.execute(params);

      expect(result).toHaveLength(50);
      expect(mockTicketRepository.saveMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Ticket)]),
      );
    });

    it('should use Email value object for buyer email', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) => {
        // Verify tickets have Email value object
        expect(tickets[0]?.buyerEmail).toBeInstanceOf(Email);
        expect(tickets[0]?.buyerEmail.value).toBe(params.buyerEmail);
        return Promise.resolve(tickets);
      });
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      await useCase.execute(params);
    });

    it('should use Money value object for ticket price', async () => {
      const params = createValidParams();
      const event = createTestEvent();

      mockEventRepository.findById.mockResolvedValue(event);
      mockEventRepository.updateTicketAvailability.mockResolvedValue(undefined);
      mockTicketRepository.saveMany.mockImplementation((tickets) => {
        expect(tickets[0]?.price).toBeInstanceOf(Money);
        expect(tickets[0]?.price.amount).toBe(50);
        expect(tickets[0]?.price.currency).toBe('USD');
        return Promise.resolve(tickets);
      });
      mockEventRepository.getRealTimeAvailability.mockResolvedValue(67);
      jest
        .spyOn(useCase as any, 'processPayment')
        .mockResolvedValue(true);

      await useCase.execute(params);
    });
  });
});
