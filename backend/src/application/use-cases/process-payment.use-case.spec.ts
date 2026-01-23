import { Test, TestingModule } from '@nestjs/testing';
import { ProcessPaymentUseCase } from './process-payment.use-case';
import { IReservationRepository } from '../../domain/interfaces/reservation-repository.interface';
import { ITicketRepository } from '../../domain/interfaces/ticket-repository.interface';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import { IPaymentGateway } from '../../domain/interfaces/payment-gateway.interface';
import {
  EVENT_REPOSITORY,
  RESERVATION_REPOSITORY,
  TICKET_REPOSITORY,
} from '../../domain/interfaces/repository-tokens';
import { EmailService } from '../../infrastructure/external/email.service';
import { Reservation } from '../../domain/entities/reservation.entity';
import { Event } from '../../domain/entities/event.entity';
import { TicketConfiguration } from '../../domain/entities/ticket-configuration.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { TicketQuantity } from '../../domain/value-objects/ticket-quantity.vo';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { Money } from '../../domain/value-objects/money.vo';

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  let mockPaymentGateway: jest.Mocked<IPaymentGateway>;
  let mockReservationRepository: jest.Mocked<IReservationRepository>;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    mockPaymentGateway = {
      processPayment: jest.fn(),
      refundPayment: jest.fn(),
      getPaymentStatus: jest.fn(),
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
        ProcessPaymentUseCase,
        {
          provide: 'IPaymentGateway',
          useValue: mockPaymentGateway,
        },
        {
          provide: RESERVATION_REPOSITORY,
          useValue: mockReservationRepository,
        },
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

    useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const eventDate = new Date('2026-12-31T20:00:00Z');

    const createTestReservation = () =>
      new Reservation(
        'reservation-123',
        'event-1',
        TicketType.GENERAL,
        TicketQuantity.create(5),
        Email.create('buyer@example.com'),
        Money.create(250, 'USD'),
        new Date(Date.now() + 15 * 60 * 1000),
      );

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
        ],
      );

    it('should process payment successfully', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-456',        processedAt: new Date(),      });
      mockTicketRepository.saveMany.mockResolvedValue([]);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEmailService.sendTicketConfirmationEmail.mockResolvedValue(true);

      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-456');
      expect(mockPaymentGateway.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.objectContaining({ amount: 250, currency: 'USD' }),
        }),
      );
      expect(mockTicketRepository.saveMany).toHaveBeenCalled();
      expect(mockReservationRepository.update).toHaveBeenCalledWith(
        'reservation-123',
        expect.objectContaining({ status: 'CONFIRMED' }),
      );
    });

    it('should throw error when reservation not found', async () => {
      const input = {
        reservationId: 'non-existent',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Reservation not found',
      );
      expect(mockPaymentGateway.processPayment).not.toHaveBeenCalled();
    });

    it('should throw error when payment amount does not match', async () => {
      const reservation = createTestReservation();
      const input = {
        reservationId: 'reservation-123',
        amount: 100,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Payment amount does not match reservation total',
      );
      expect(mockPaymentGateway.processPayment).not.toHaveBeenCalled();
    });

    it('should throw error when currency does not match', async () => {
      const reservation = createTestReservation();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'EUR',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Payment currency does not match reservation currency',
      );
      expect(mockPaymentGateway.processPayment).not.toHaveBeenCalled();
    });

    it('should throw error when event not found', async () => {
      const reservation = createTestReservation();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow('Event not found');
      expect(mockPaymentGateway.processPayment).not.toHaveBeenCalled();
    });

    it('should handle failed payment and cancel reservation', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: false,
        errorCode: 'INSUFFICIENT_FUNDS',
        errorMessage: 'Card declined',
      });
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEventRepository.update.mockResolvedValue(event);

      const result = await useCase.execute(input);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_FUNDS');
      expect(result.errorMessage).toBe('Card declined');
      expect(mockTicketRepository.saveMany).not.toHaveBeenCalled();
      expect(mockReservationRepository.update).toHaveBeenCalledWith(
        'reservation-123',
        expect.objectContaining({ status: 'CANCELLED' }),
      );
    });

    it('should generate correct number of tickets on successful payment', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-456',        processedAt: new Date(),      });
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockReservationRepository.update.mockResolvedValue(reservation);

      await useCase.execute(input);

      expect(mockTicketRepository.saveMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventId: 'event-1',
            type: TicketType.GENERAL,
          }),
        ]),
      );

      const savedTickets =
        mockTicketRepository.saveMany.mock.calls[0]?.[0] || [];
      expect(savedTickets).toHaveLength(5);
    });

    it('should include payment metadata', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-456',
      });
      mockTicketRepository.saveMany.mockResolvedValue([]);
      mockReservationRepository.update.mockResolvedValue(reservation);

      await useCase.execute(input);

      expect(mockPaymentGateway.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            reservationId: 'reservation-123',
            eventId: 'event-1',
            ticketType: TicketType.GENERAL,
            quantity: '5',
            buyerEmail: 'buyer@example.com',
          }),
        }),
      );
    });

    it('should validate input parameters', async () => {
      const invalidInputs = [
        { reservationId: '', amount: 250, currency: 'USD' },
        { reservationId: 'res-123', amount: -10, currency: 'USD' },
        { reservationId: 'res-123', amount: 250, currency: '' },
      ];

      for (const input of invalidInputs) {
        await expect(useCase.execute(input)).rejects.toThrow();
      }

      expect(mockReservationRepository.findById).not.toHaveBeenCalled();
    });

    it('should send confirmation email after successful payment', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-456',
      });
      mockTicketRepository.saveMany.mockResolvedValue([]);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEmailService.sendTicketConfirmationEmail.mockResolvedValue(true);

      await useCase.execute(input);

      // Email is sent asynchronously, wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockEmailService.sendTicketConfirmationEmail).toHaveBeenCalled();
    });

    it('should not fail purchase if email sending fails', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-456',
        processedAt: new Date(),
      });
      mockTicketRepository.saveMany.mockResolvedValue([]);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEmailService.sendTicketConfirmationEmail.mockRejectedValue(
        new Error('Email service down'),
      );

      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
    });

    it('should release tickets back to event on failed payment', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.GENERAL);
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: false,
        errorCode: 'CARD_DECLINED',
        errorMessage: 'Payment declined',
      });
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEventRepository.update.mockImplementation((updatedEvent) =>
        Promise.resolve(updatedEvent),
      );

      await useCase.execute(input);

      const updateCall = mockEventRepository.update.mock.calls[0]?.[0];
      const finalAvailability = updateCall?.getAvailability(TicketType.GENERAL);
      expect(finalAvailability).toBe(initialAvailability + 5);
    });

    it('should handle gateway timeout errors', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const input = {
        reservationId: 'reservation-123',
        amount: 250,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockRejectedValue(
        new Error('Gateway timeout'),
      );

      await expect(useCase.execute(input)).rejects.toThrow('Gateway timeout');
    });

    it('should handle large ticket quantities', async () => {
      const reservation = new Reservation(
        'reservation-456',
        'event-1',
        TicketType.GENERAL,
        TicketQuantity.create(50),
        Email.create('bulk@example.com'),
        Money.create(2500, 'USD'),
        new Date(Date.now() + 15 * 60 * 1000),
      );
      const event = createTestEvent();
      const input = {
        reservationId: 'reservation-456',
        amount: 2500,
        currency: 'USD',
      };

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-789',
        processedAt: new Date(),
      });
      mockTicketRepository.saveMany.mockImplementation((tickets) =>
        Promise.resolve(tickets),
      );
      mockReservationRepository.update.mockResolvedValue(reservation);

      await useCase.execute(input);

      const savedTickets =
        mockTicketRepository.saveMany.mock.calls[0]?.[0] || [];
      expect(savedTickets).toHaveLength(50);
    });
  });
});
