import { Test, TestingModule } from '@nestjs/testing';
import { ReleaseTicketsUseCase } from './release-tickets.use-case';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import { IReservationRepository } from '../../domain/interfaces/reservation-repository.interface';
import {
  EVENT_REPOSITORY,
  RESERVATION_REPOSITORY,
} from '../../domain/interfaces/repository-tokens';
import { Reservation } from '../../domain/entities/reservation.entity';
import { Event } from '../../domain/entities/event.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { TicketQuantity } from '../../domain/value-objects/ticket-quantity.vo';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { TicketConfiguration } from '../../domain/entities/ticket-configuration.entity';

describe('ReleaseTicketsUseCase', () => {
  let useCase: ReleaseTicketsUseCase;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockReservationRepository: jest.Mocked<IReservationRepository>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseTicketsUseCase,
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: RESERVATION_REPOSITORY,
          useValue: mockReservationRepository,
        },
      ],
    }).compile();

    useCase = module.get<ReleaseTicketsUseCase>(ReleaseTicketsUseCase);
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

    it('should successfully release tickets from expired reservation', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEventRepository.update.mockResolvedValue(event);

      const result = await useCase.execute({
        reservationId: 'reservation-123',
        reason: 'Expired - 15 minutes timeout',
      });

      expect(result.success).toBe(true);
      expect(result.ticketsReleased).toBe(5);
      expect(result.reason).toBe('Expired - 15 minutes timeout');
      expect(result.releasedAt).toBeInstanceOf(Date);
      expect(mockReservationRepository.findById).toHaveBeenCalledWith(
        'reservation-123',
      );
      expect(mockEventRepository.findById).toHaveBeenCalledWith('event-1');
    });

    it('should throw error when reservationId is empty', async () => {
      await expect(
        useCase.execute({
          reservationId: '',
          reason: 'Test',
        }),
      ).rejects.toThrow('Reservation ID is required');

      expect(mockReservationRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when reason is empty', async () => {
      await expect(
        useCase.execute({
          reservationId: 'reservation-123',
          reason: '   ',
        }),
      ).rejects.toThrow('Reason is required');

      expect(mockReservationRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when reservation not found', async () => {
      mockReservationRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          reservationId: 'non-existent',
          reason: 'Test',
        }),
      ).rejects.toThrow('Reservation not found: non-existent');

      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when event not found', async () => {
      const reservation = createTestReservation();

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          reservationId: 'reservation-123',
          reason: 'Test',
        }),
      ).rejects.toThrow('Event not found: event-1');
    });

    it('should retry on transient repository failures', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();

      // First call fails, second succeeds
      mockReservationRepository.findById
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEventRepository.update.mockResolvedValue(event);

      const result = await useCase.execute({
        reservationId: 'reservation-123',
        reason: 'Expired',
      });

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBeGreaterThan(0);
      expect(mockReservationRepository.findById).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retry attempts', async () => {
      mockReservationRepository.findById.mockRejectedValue(
        new Error('Database is down'),
      );

      const result = await useCase.execute({
        reservationId: 'reservation-123',
        reason: 'Expired',
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Database is down');
      expect(mockReservationRepository.findById).toHaveBeenCalledTimes(3);
    });

    it('should cancel reservation and increment event availability', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();
      const initialAvailability = event.getAvailability(TicketType.GENERAL);

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEventRepository.update.mockImplementation((updatedEvent) => {
        return Promise.resolve(updatedEvent);
      });

      const result = await useCase.execute({
        reservationId: 'reservation-123',
        reason: 'User cancelled',
      });

      expect(result.success).toBe(true);
      expect(result.ticketsReleased).toBe(5);

      // Verify update was called with event that has tickets released
      const updateCall = mockEventRepository.update.mock.calls[0]?.[0];
      const finalAvailability = updateCall?.getAvailability(TicketType.GENERAL);
      expect(finalAvailability).toBe(initialAvailability + 5);
    });

    it('should handle large quantities correctly', async () => {
      const reservation = new Reservation(
        'reservation-456',
        'event-1',
        TicketType.VIP,
        TicketQuantity.create(100),
        Email.create('bulk@example.com'),
        new Date(Date.now() + 15 * 60 * 1000),
      );
      const event = new Event(
        'event-1',
        'Festival',
        eventDate,
        'Park',
        'Outdoor Stage',
        [
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(200, 'USD'),
            500,
            200,
          ),
        ],
      );

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEventRepository.update.mockResolvedValue(event);

      const result = await useCase.execute({
        reservationId: 'reservation-456',
        reason: 'Bulk release',
      });

      expect(result.success).toBe(true);
      expect(result.ticketsReleased).toBe(100);
    });

    it('should use RetryPolicy with correct configuration', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();

      let attemptCount = 0;
      mockReservationRepository.findById.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve(reservation);
      });
      mockEventRepository.findById.mockResolvedValue(event);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEventRepository.update.mockResolvedValue(event);

      const startTime = Date.now();
      const result = await useCase.execute({
        reservationId: 'reservation-123',
        reason: 'Test retry',
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      // Should have delayed due to exponential backoff (at least 100ms)
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(attemptCount).toBe(2);
    });

    it('should complete within 5 seconds requirement', async () => {
      const reservation = createTestReservation();
      const event = createTestEvent();

      mockReservationRepository.findById.mockResolvedValue(reservation);
      mockEventRepository.findById.mockResolvedValue(event);
      mockReservationRepository.update.mockResolvedValue(reservation);
      mockEventRepository.update.mockResolvedValue(event);

      const startTime = Date.now();
      await useCase.execute({
        reservationId: 'reservation-123',
        reason: 'Performance test',
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});
