import { Test, TestingModule } from '@nestjs/testing';
import { GetBuyerTicketsUseCase } from './get-buyer-tickets.use-case';
import { ITicketRepository } from '../../domain/interfaces/ticket-repository.interface';
import { TICKET_REPOSITORY } from '../../domain/interfaces/repository-tokens';
import { Ticket, TicketStatus } from '../../domain/entities/ticket.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { InvalidEmailException } from '../../domain/exceptions/invalid-email.exception';

describe('GetBuyerTicketsUseCase', () => {
  let useCase: GetBuyerTicketsUseCase;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;

  beforeEach(async () => {
    mockTicketRepository = {
      findByBuyer: jest.fn(),
      findByBuyerEmail: jest.fn(),
      findById: jest.fn(),
      findByQRToken: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByEventId: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBuyerTicketsUseCase,
        {
          provide: TICKET_REPOSITORY,
          useValue: mockTicketRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetBuyerTicketsUseCase>(GetBuyerTicketsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const createTicket = (
      id: string,
      eventId: string,
      type: TicketType,
      price: number,
      buyerEmail: string,
      status: TicketStatus = TicketStatus.PAID,
    ): Ticket => {
      return new Ticket(
        id,
        `CODE-${id}`,
        eventId,
        type,
        Email.create(buyerEmail),
        Money.create(price, 'USD'),
        new Date(),
        `QR-${id}`,
        status,
        status === TicketStatus.USED ? new Date() : null,
      );
    };

    it('should return all tickets for a valid buyer email', async () => {
      // Arrange: Create real Ticket domain objects
      const buyerEmail = 'john.doe@example.com';
      const tickets = [
        createTicket(
          'TICKET-001',
          'EVENT-001',
          TicketType.GENERAL,
          50,
          buyerEmail,
        ),
        createTicket('TICKET-002', 'EVENT-001', TicketType.VIP, 150, buyerEmail),
        createTicket(
          'TICKET-003',
          'EVENT-002',
          TicketType.GENERAL,
          40,
          buyerEmail,
        ),
      ];

      mockTicketRepository.findByBuyer.mockResolvedValue(tickets);

      // Act
      const result = await useCase.execute(buyerEmail);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toEqual(tickets);
      expect(mockTicketRepository.findByBuyer).toHaveBeenCalledWith(
        expect.objectContaining({ value: buyerEmail }),
      );
      expect(mockTicketRepository.findByBuyer).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when buyer has no tickets', async () => {
      const buyerEmail = 'newbuyer@example.com';
      mockTicketRepository.findByBuyer.mockResolvedValue([]);

      const result = await useCase.execute(buyerEmail);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockTicketRepository.findByBuyer).toHaveBeenCalledWith(
        expect.objectContaining({ value: buyerEmail }),
      );
    });

    it('should throw InvalidEmailException for invalid email format', async () => {
      const invalidEmail = 'not-an-email';

      await expect(useCase.execute(invalidEmail)).rejects.toThrow(
        InvalidEmailException,
      );
      await expect(useCase.execute(invalidEmail)).rejects.toThrow(
        `Invalid email format: ${invalidEmail}`,
      );
      expect(mockTicketRepository.findByBuyer).not.toHaveBeenCalled();
    });

    it('should handle different ticket types correctly', async () => {
      const buyerEmail = 'jane.smith@example.com';
      const tickets = [
        createTicket(
          'TICKET-004',
          'EVENT-003',
          TicketType.GENERAL,
          60,
          buyerEmail,
        ),
        createTicket('TICKET-005', 'EVENT-003', TicketType.VIP, 200, buyerEmail),
        createTicket(
          'TICKET-006',
          'EVENT-003',
          TicketType.EARLY_BIRD,
          45,
          buyerEmail,
        ),
      ];

      mockTicketRepository.findByBuyer.mockResolvedValue(tickets);

      const result = await useCase.execute(buyerEmail);

      expect(result).toHaveLength(3);
      expect(result[0]?.type).toBe(TicketType.GENERAL);
      expect(result[1]?.type).toBe(TicketType.VIP);
      expect(result[2]?.type).toBe(TicketType.EARLY_BIRD);
    });

    it('should handle both PAID and USED ticket statuses', async () => {
      const buyerEmail = 'status@example.com';
      const tickets = [
        createTicket(
          'TICKET-007',
          'EVENT-004',
          TicketType.GENERAL,
          50,
          buyerEmail,
          TicketStatus.PAID,
        ),
        createTicket(
          'TICKET-008',
          'EVENT-005',
          TicketType.VIP,
          150,
          buyerEmail,
          TicketStatus.USED,
        ),
      ];

      mockTicketRepository.findByBuyer.mockResolvedValue(tickets);

      const result = await useCase.execute(buyerEmail);

      expect(result).toHaveLength(2);
      expect(result[0]?.status).toBe(TicketStatus.PAID);
      expect(result[0]?.usedAt).toBeNull();
      expect(result[1]?.status).toBe(TicketStatus.USED);
      expect(result[1]?.usedAt).toBeInstanceOf(Date);
    });

    it('should preserve all ticket properties', async () => {
      const buyerEmail = 'properties@example.com';
      const purchaseDate = new Date('2026-01-15T10:30:00Z');
      const ticket = new Ticket(
        'TICKET-009',
        'CODE-ABC123',
        'EVENT-006',
        TicketType.VIP,
        Email.create(buyerEmail),
        Money.create(250, 'USD'),
        purchaseDate,
        'QR-XYZ789',
        TicketStatus.PAID,
        null,
      );

      mockTicketRepository.findByBuyer.mockResolvedValue([ticket]);

      const result = await useCase.execute(buyerEmail);

      expect(result[0]?.id).toBe('TICKET-009');
      expect(result[0]?.code).toBe('CODE-ABC123');
      expect(result[0]?.eventId).toBe('EVENT-006');
      expect(result[0]?.type).toBe(TicketType.VIP);
      expect(result[0]?.buyerEmail.value).toBe(buyerEmail);
      expect(result[0]?.price.amount).toBe(250);
      expect(result[0]?.price.currency).toBe('USD');
      expect(result[0]?.purchaseDate).toEqual(purchaseDate);
      expect(result[0]?.qrToken).toBe('QR-XYZ789');
      expect(result[0]?.status).toBe(TicketStatus.PAID);
    });

    it('should handle repository errors gracefully', async () => {
      const buyerEmail = 'error@example.com';
      mockTicketRepository.findByBuyer.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute(buyerEmail)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should call Email.create with the provided email', async () => {
      const buyerEmail = 'test@example.com';
      const emailSpy = jest.spyOn(Email, 'create');
      mockTicketRepository.findByBuyer.mockResolvedValue([]);

      await useCase.execute(buyerEmail);

      expect(emailSpy).toHaveBeenCalledWith(buyerEmail);
      emailSpy.mockRestore();
    });

    it('should handle emails with different formats', async () => {
      const testEmails = [
        'simple@example.com',
        'user.name+tag@example.co.uk',
        'test_user123@sub.domain.com',
      ];

      for (const email of testEmails) {
        mockTicketRepository.findByBuyer.mockResolvedValue([]);

        const result = await useCase.execute(email);

        expect(result).toEqual([]);
        expect(mockTicketRepository.findByBuyer).toHaveBeenCalledWith(
          expect.objectContaining({ value: email }),
        );
      }
    });

    it('should handle large number of tickets efficiently', async () => {
      const buyerEmail = 'frequent@example.com';
      const tickets = Array.from({ length: 50 }, (_, i) =>
        createTicket(
          `TICKET-${i + 100}`,
          `EVENT-${Math.floor(i / 5)}`,
          i % 3 === 0
            ? TicketType.VIP
            : i % 3 === 1
              ? TicketType.GENERAL
              : TicketType.EARLY_BIRD,
          50 + i * 10,
          buyerEmail,
        ),
      );

      mockTicketRepository.findByBuyer.mockResolvedValue(tickets);

      const result = await useCase.execute(buyerEmail);

      expect(result).toHaveLength(50);
      expect(result).toEqual(tickets);
    });
  });
});
