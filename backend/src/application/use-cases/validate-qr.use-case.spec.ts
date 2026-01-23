import { Test, TestingModule } from '@nestjs/testing';
import { ValidateQRUseCase } from './validate-qr.use-case';
import { ITicketRepository } from '../../domain/interfaces/ticket-repository.interface';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import {
  TICKET_REPOSITORY,
  EVENT_REPOSITORY,
} from '../../domain/interfaces/repository-tokens';
import { Ticket, TicketStatus } from '../../domain/entities/ticket.entity';
import { Event } from '../../domain/entities/event.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { TicketConfiguration } from '../../domain/entities/ticket-configuration.entity';

describe('ValidateQRUseCase', () => {
  let useCase: ValidateQRUseCase;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;
  let mockEventRepository: jest.Mocked<IEventRepository>;

  beforeEach(async () => {
    mockTicketRepository = {
      findByQRToken: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByBuyerEmail: jest.fn(),
      findByEventId: jest.fn(),
      delete: jest.fn(),
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
    } as any;

    mockEventRepository = {
      findById: jest.fn(),
      save: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateQRUseCase,
        {
          provide: TICKET_REPOSITORY,
          useValue: mockTicketRepository,
        },
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    useCase = module.get<ValidateQRUseCase>(ValidateQRUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const futureDate = new Date(Date.now() + 86400000); // Tomorrow
    const pastDate = new Date(Date.now() - 86400000); // Yesterday

    const createMockTicket = (
      status: TicketStatus,
      eventId: string,
      usedAt?: Date,
    ): Ticket => {
      const ticket = new Ticket(
        'TICKET-123',
        'TICKET-CODE-123',
        eventId,
        TicketType.GENERAL,
        Email.create('buyer@test.com'),
        Money.create(50, 'USD'),
        new Date(),
        'QR-TOKEN-123',
        status,
        usedAt || null,
      );

      return ticket;
    };

    const createMockEvent = (date: Date): Event => {
      return new Event(
        'EVENT-001',
        'Rock Concert',
        date,
        'Madison Square Garden',
        'Main Arena',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, 'USD'),
            100,
            100,
          ),
        ],
      );
    };

    it('should validate QR and mark ticket as used successfully', async () => {
      const mockTicket = createMockTicket(
        TicketStatus.PAID,
        'EVENT-001',
      );
      const mockEvent = createMockEvent(futureDate);

      const usedTicket = createMockTicket(
        TicketStatus.USED,
        'EVENT-001',
        new Date(),
      );

      mockTicketRepository.findByQRToken.mockResolvedValue(mockTicket);
      mockEventRepository.findById.mockResolvedValue(mockEvent);
      
      // Mock the markAsUsed method
      jest.spyOn(mockTicket, 'markAsUsed').mockReturnValue(usedTicket);
      mockTicketRepository.save.mockResolvedValue(usedTicket);

      const result = await useCase.execute({
        qrToken: 'QR-TOKEN-123',
        eventId: 'EVENT-001',
      });

      expect(result.valid).toBe(true);
      expect(result.message).toContain('Bienvenido');
      expect(result.ticket).toBeDefined();
      expect(result.ticket?.id).toBe('TICKET-123');
      expect(mockTicketRepository.findByQRToken).toHaveBeenCalledWith(
        'QR-TOKEN-123',
      );
      expect(mockEventRepository.findById).toHaveBeenCalledWith('EVENT-001');
      expect(mockTicketRepository.save).toHaveBeenCalledWith(usedTicket);
    });

    it('should return invalid when ticket not found', async () => {
      mockTicketRepository.findByQRToken.mockResolvedValue(null);

      const result = await useCase.execute({
        qrToken: 'INVALID-TOKEN',
        eventId: 'EVENT-001',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Entrada no encontrada');
      expect(mockTicketRepository.findByQRToken).toHaveBeenCalledWith(
        'INVALID-TOKEN',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
      expect(mockTicketRepository.save).not.toHaveBeenCalled();
    });

    it('should return invalid when ticket does not belong to the event', async () => {
      const mockTicket = createMockTicket(
        TicketStatus.PAID,
        'EVENT-DIFFERENT',
      );

      mockTicketRepository.findByQRToken.mockResolvedValue(mockTicket);

      const result = await useCase.execute({
        qrToken: 'QR-TOKEN-123',
        eventId: 'EVENT-001',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('no es válida para este evento');
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
      expect(mockTicketRepository.save).not.toHaveBeenCalled();
    });

    it('should return invalid when ticket is already used', async () => {
      const usedDate = new Date('2024-01-15T18:30:00Z');
      const mockTicket = createMockTicket(
        TicketStatus.USED,
        'EVENT-001',
        usedDate,
      );

      mockTicketRepository.findByQRToken.mockResolvedValue(mockTicket);

      const result = await useCase.execute({
        qrToken: 'QR-TOKEN-123',
        eventId: 'EVENT-001',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('ya fue utilizada');
      expect(result.ticket).toBeDefined();
      expect(result.ticket?.id).toBe('TICKET-123');
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
      expect(mockTicketRepository.save).not.toHaveBeenCalled();
    });

    it('should return invalid when event not found', async () => {
      const mockTicket = createMockTicket(
        TicketStatus.PAID,
        'EVENT-001',
      );

      mockTicketRepository.findByQRToken.mockResolvedValue(mockTicket);
      mockEventRepository.findById.mockResolvedValue(null);

      const result = await useCase.execute({
        qrToken: 'QR-TOKEN-123',
        eventId: 'EVENT-001',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Evento no encontrado');
      expect(mockTicketRepository.save).not.toHaveBeenCalled();
    });

    it('should return invalid when event has already finished', async () => {
      const mockTicket = createMockTicket(
        TicketStatus.PAID,
        'EVENT-001',
      );
      const mockEvent = createMockEvent(pastDate);

      mockTicketRepository.findByQRToken.mockResolvedValue(mockTicket);
      mockEventRepository.findById.mockResolvedValue(mockEvent);

      const result = await useCase.execute({
        qrToken: 'QR-TOKEN-123',
        eventId: 'EVENT-001',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('ya ha finalizado');
      expect(mockTicketRepository.save).not.toHaveBeenCalled();
    });
  });
});
