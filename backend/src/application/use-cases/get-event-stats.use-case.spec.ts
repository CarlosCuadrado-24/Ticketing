import { Test, TestingModule } from '@nestjs/testing';
import { GetEventStatsUseCase } from './get-event-stats.use-case';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import { ITicketRepository } from '../../domain/interfaces/ticket-repository.interface';
import {
  EVENT_REPOSITORY,
  TICKET_REPOSITORY,
} from '../../domain/interfaces/repository-tokens';
import { Event } from '../../domain/entities/event.entity';
import { TicketConfiguration } from '../../domain/entities/ticket-configuration.entity';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { Money } from '../../domain/value-objects/money.vo';

describe('GetEventStatsUseCase', () => {
  let useCase: GetEventStatsUseCase;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;

  beforeEach(async () => {
    mockEventRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
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

    mockTicketRepository = {
      countByEvent: jest.fn(),
      getRevenueByEvent: jest.fn(),
      getTicketsByTypeForEvent: jest.fn(),
      getSalesByDateForEvent: jest.fn(),
      countTotalByEvent: jest.fn(),
      countSoldByEvent: jest.fn(),
      countUsedByEvent: jest.fn(),
      getSalesTrendForEvent: jest.fn(),
      countSold: jest.fn(),
      getTotalRevenue: jest.fn(),
      getTicketsByStatus: jest.fn(),
      getTicketsByType: jest.fn(),
      getSalesByMonth: jest.fn(),
      getTopSellingEvents: jest.fn(),
      findById: jest.fn(),
      findByBuyer: jest.fn(),
      findByBuyerEmail: jest.fn(),
      findByQRToken: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByEventId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetEventStatsUseCase,
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: TICKET_REPOSITORY,
          useValue: mockTicketRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetEventStatsUseCase>(GetEventStatsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute with eventId', () => {
    it('should return event-specific statistics', async () => {
      const eventId = 'EVENT-001';
      
      // Create real Event object
      const event = new Event(
        eventId,
        'Rock Concert',
        new Date('2026-12-31'),
        'Madison Square Garden',
        'Main Arena',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, 'USD'),
            100,
            80,
          ),
        ],
      );

      const ticketsByType = [
        { type: 'GENERAL', count: 20, revenue: 1000 },
        { type: 'VIP', count: 10, revenue: 1500 },
      ];

      const salesByDate = [
        { date: '2026-01-15', count: 15 },
        { date: '2026-01-16', count: 15 },
      ];

      mockEventRepository.findById.mockResolvedValue(event);
      mockTicketRepository.countByEvent.mockResolvedValue(30);
      mockTicketRepository.getRevenueByEvent.mockResolvedValue(2500);
      mockTicketRepository.getTicketsByTypeForEvent.mockResolvedValue(ticketsByType);
      mockTicketRepository.getSalesByDateForEvent.mockResolvedValue(salesByDate);

      const result = await useCase.execute(eventId);

      expect(result).toHaveProperty('event');
      expect(result).toHaveProperty('ticketsSold', 30);
      expect(result).toHaveProperty('revenue', 2500);
      expect(result).toHaveProperty('ticketsByType', ticketsByType);
      expect(result).toHaveProperty('salesByDate', salesByDate);

      expect(mockEventRepository.findById).toHaveBeenCalledWith(eventId);
      expect(mockTicketRepository.countByEvent).toHaveBeenCalledWith(eventId);
      expect(mockTicketRepository.getRevenueByEvent).toHaveBeenCalledWith(eventId);
      expect(mockTicketRepository.getTicketsByTypeForEvent).toHaveBeenCalledWith(eventId);
      expect(mockTicketRepository.getSalesByDateForEvent).toHaveBeenCalledWith(eventId);
    });

    it('should handle event with no sales', async () => {
      const eventId = 'EVENT-002';
      
      const event = new Event(
        eventId,
        'New Event',
        new Date('2027-01-01'),
        'Convention Center',
        'Hall A',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(40, 'USD'),
            200,
            200,
          ),
        ],
      );

      mockEventRepository.findById.mockResolvedValue(event);
      mockTicketRepository.countByEvent.mockResolvedValue(0);
      mockTicketRepository.getRevenueByEvent.mockResolvedValue(0);
      mockTicketRepository.getTicketsByTypeForEvent.mockResolvedValue([]);
      mockTicketRepository.getSalesByDateForEvent.mockResolvedValue([]);

      const result = await useCase.execute(eventId);

      expect(result).toHaveProperty('ticketsSold', 0);
      expect(result).toHaveProperty('revenue', 0);
      expect(result).toHaveProperty('ticketsByType');
      expect(result).toHaveProperty('salesByDate');
    });

    it('should execute all queries in parallel', async () => {
      const eventId = 'EVENT-003';
      
      const event = new Event(
        eventId,
        'Test Event',
        new Date('2026-06-15'),
        'Test Location',
        'Test Venue',
        [
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(100, 'USD'),
            50,
            30,
          ),
        ],
      );

      mockEventRepository.findById.mockResolvedValue(event);
      mockTicketRepository.countByEvent.mockResolvedValue(20);
      mockTicketRepository.getRevenueByEvent.mockResolvedValue(2000);
      mockTicketRepository.getTicketsByTypeForEvent.mockResolvedValue([]);
      mockTicketRepository.getSalesByDateForEvent.mockResolvedValue([]);

      await useCase.execute(eventId);

      // Verify all methods were called exactly once
      expect(mockEventRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.countByEvent).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getRevenueByEvent).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTicketsByTypeForEvent).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getSalesByDateForEvent).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors gracefully', async () => {
      const eventId = 'EVENT-ERROR';
      
      mockEventRepository.findById.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute(eventId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('execute without eventId', () => {
    it('should return all events statistics', async () => {
      const upcomingEvent = new Event(
        'EVENT-UPCOMING',
        'Future Concert',
        new Date('2027-06-01'),
        'Stadium',
        'Main Stage',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(75, 'USD'),
            500,
            400,
          ),
        ],
      );

      const pastEvent = new Event(
        'EVENT-PAST',
        'Past Concert',
        new Date('2025-12-01'),
        'Arena',
        'Stage 1',
        [
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(200, 'USD'),
            100,
            0,
          ),
        ],
      );

      const eventsByCategory = [
        { category: 'Music', count: 50 },
        { category: 'Sports', count: 30 },
      ];

      const eventsByMonth = [
        { month: '2026-01', count: 10 },
        { month: '2026-02', count: 15 },
      ];

      mockEventRepository.getEventsByCategory.mockResolvedValue(eventsByCategory);
      mockEventRepository.getEventsByMonth.mockResolvedValue(eventsByMonth);
      mockEventRepository.findUpcoming.mockResolvedValue([upcomingEvent]);
      mockEventRepository.findPast.mockResolvedValue([pastEvent]);

      const result = await useCase.execute();

      expect(result).toHaveProperty('eventsByCategory', eventsByCategory);
      expect(result).toHaveProperty('eventsByMonth', eventsByMonth);
      expect(result).toHaveProperty('upcomingEvents');
      expect(result).toHaveProperty('pastEvents');

      expect(mockEventRepository.getEventsByCategory).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.getEventsByMonth).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.findUpcoming).toHaveBeenCalledWith(10);
      expect(mockEventRepository.findPast).toHaveBeenCalledWith(10);
    });

    it('should handle empty statistics', async () => {
      mockEventRepository.getEventsByCategory.mockResolvedValue([]);
      mockEventRepository.getEventsByMonth.mockResolvedValue([]);
      mockEventRepository.findUpcoming.mockResolvedValue([]);
      mockEventRepository.findPast.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toHaveProperty('eventsByCategory');
      expect(result).toHaveProperty('eventsByMonth');
      expect(result).toHaveProperty('upcomingEvents');
      expect(result).toHaveProperty('pastEvents');
    });

    it('should execute all queries in parallel for all events', async () => {
      mockEventRepository.getEventsByCategory.mockResolvedValue([]);
      mockEventRepository.getEventsByMonth.mockResolvedValue([]);
      mockEventRepository.findUpcoming.mockResolvedValue([]);
      mockEventRepository.findPast.mockResolvedValue([]);

      await useCase.execute();

      expect(mockEventRepository.getEventsByCategory).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.getEventsByMonth).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.findUpcoming).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.findPast).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors for all events stats', async () => {
      mockEventRepository.getEventsByCategory.mockRejectedValue(
        new Error('Query timeout'),
      );

      await expect(useCase.execute()).rejects.toThrow('Query timeout');
    });

    it('should not call ticket repository methods when no eventId provided', async () => {
      mockEventRepository.getEventsByCategory.mockResolvedValue([]);
      mockEventRepository.getEventsByMonth.mockResolvedValue([]);
      mockEventRepository.findUpcoming.mockResolvedValue([]);
      mockEventRepository.findPast.mockResolvedValue([]);

      await useCase.execute();

      expect(mockTicketRepository.countByEvent).not.toHaveBeenCalled();
      expect(mockTicketRepository.getRevenueByEvent).not.toHaveBeenCalled();
      expect(mockTicketRepository.getTicketsByTypeForEvent).not.toHaveBeenCalled();
      expect(mockTicketRepository.getSalesByDateForEvent).not.toHaveBeenCalled();
    });
  });

  describe('execute with undefined eventId', () => {
    it('should treat undefined as no eventId', async () => {
      mockEventRepository.getEventsByCategory.mockResolvedValue([]);
      mockEventRepository.getEventsByMonth.mockResolvedValue([]);
      mockEventRepository.findUpcoming.mockResolvedValue([]);
      mockEventRepository.findPast.mockResolvedValue([]);

      const result = await useCase.execute(undefined);

      expect(result).toHaveProperty('eventsByCategory');
      expect(result).toHaveProperty('eventsByMonth');
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });
  });
});
