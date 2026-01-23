import { Test, TestingModule } from '@nestjs/testing';
import { UpdateEventUseCase } from './update-event.use-case';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import { EVENT_REPOSITORY } from '../../domain/interfaces/repository-tokens';
import { Event } from '../../domain/entities/event.entity';
import { TicketConfiguration } from '../../domain/entities/ticket-configuration.entity';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { Money } from '../../domain/value-objects/money.vo';

describe('UpdateEventUseCase', () => {
  let useCase: UpdateEventUseCase;
  let mockEventRepository: jest.Mocked<IEventRepository>;

  beforeEach(async () => {
    mockEventRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      getRealTimeAvailability: jest.fn(),
      findByIdWithTickets: jest.fn(),
      getEventsByCategory: jest.fn(),
      getEventsByMonth: jest.fn(),
      findUpcoming: jest.fn(),
      findPast: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateEventUseCase,
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateEventUseCase>(UpdateEventUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const futureDate = new Date('2026-12-31T20:00:00Z');

    const createValidInput = () => ({
      id: 'EVENT-001',
      name: 'Updated Concert',
      date: futureDate,
      location: 'New Venue',
      venueName: 'Main Stage',
      imageUrl: 'https://example.com/updated.jpg',
      description: 'Updated description',
      ticketConfigurations: [
        {
          type: TicketType.GENERAL,
          price: 60,
          currency: 'USD',
          quantity: 150,
        },
        {
          type: TicketType.VIP,
          price: 180,
          currency: 'USD',
          quantity: 75,
        },
      ],
    });

    const createExistingEvent = () => {
      return new Event(
        'EVENT-001',
        'Old Concert',
        new Date('2026-11-01'),
        'Old Venue',
        'Old Stage',
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, 'USD'),
            100,
            80,
            'CONFIG-001',
          ),
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(150, 'USD'),
            50,
            40,
            'CONFIG-002',
          ),
        ],
      );
    };

    it('should update an existing event successfully', async () => {
      const input = createValidInput();
      const existingEvent = createExistingEvent();

      const updatedEvent = new Event(
        input.id,
        input.name,
        input.date,
        input.location,
        input.venueName,
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(60, 'USD'),
            150,
            150,
            'CONFIG-001',
          ),
          new TicketConfiguration(
            TicketType.VIP,
            Money.create(180, 'USD'),
            75,
            75,
            'CONFIG-002',
          ),
        ],
        input.imageUrl,
        input.description,
        [],
      );

      mockEventRepository.findById.mockResolvedValue(existingEvent);
      mockEventRepository.update.mockResolvedValue(updatedEvent);

      const result = await useCase.execute(input);

      expect(result.id).toBe(input.id);
      expect(result.name).toBe(input.name);
      expect(result.date).toEqual(input.date);
      expect(result.location).toBe(input.location);
      expect(result.venueName).toBe(input.venueName);
      expect(result.imageUrl).toBe(input.imageUrl);
      expect(result.description).toBe(input.description);
      expect(mockEventRepository.findById).toHaveBeenCalledWith(input.id);
      expect(mockEventRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: input.id,
          name: input.name,
        }),
      );
    });

    it('should preserve ticket configuration IDs when updating', async () => {
      const input = createValidInput();
      const existingEvent = createExistingEvent();

      mockEventRepository.findById.mockResolvedValue(existingEvent);
      mockEventRepository.update.mockImplementation((event) =>
        Promise.resolve(event),
      );

      await useCase.execute(input);

      const updateCall = mockEventRepository.update.mock.calls[0]?.[0];
      expect(updateCall?.ticketConfigurations[0]?.id).toBe('CONFIG-001');
      expect(updateCall?.ticketConfigurations[1]?.id).toBe('CONFIG-002');
    });

    it('should throw error when event not found', async () => {
      const input = createValidInput();
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow('Event not found');
      expect(mockEventRepository.findById).toHaveBeenCalledWith(input.id);
      expect(mockEventRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when ID is empty', async () => {
      const input = createValidInput();
      input.id = '';

      await expect(useCase.execute(input)).rejects.toThrow(
        'Event ID is required',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when name is empty', async () => {
      const input = createValidInput();
      input.name = '   ';

      await expect(useCase.execute(input)).rejects.toThrow(
        'Event name is required and cannot be empty',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when date is in the past', async () => {
      const input = createValidInput();
      input.date = new Date('2020-01-01');

      await expect(useCase.execute(input)).rejects.toThrow(
        'Event date cannot be in the past',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when location is empty', async () => {
      const input = createValidInput();
      input.location = '';

      await expect(useCase.execute(input)).rejects.toThrow(
        'Event location is required and cannot be empty',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when venue name is empty', async () => {
      const input = createValidInput();
      input.venueName = '   ';

      await expect(useCase.execute(input)).rejects.toThrow(
        'Venue name is required and cannot be empty',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when no ticket configurations provided', async () => {
      const input = createValidInput();
      input.ticketConfigurations = [];

      await expect(useCase.execute(input)).rejects.toThrow(
        'At least one ticket configuration is required',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when ticket configuration has invalid price', async () => {
      const input = createValidInput();
      input.ticketConfigurations[0]!.price = -10;

      await expect(useCase.execute(input)).rejects.toThrow(
        'Ticket configuration 0 has invalid price',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when ticket configuration has invalid currency', async () => {
      const input = createValidInput();
      input.ticketConfigurations[0]!.currency = 'US';

      await expect(useCase.execute(input)).rejects.toThrow(
        'Ticket configuration 0 has invalid currency',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when ticket configuration has invalid quantity', async () => {
      const input = createValidInput();
      input.ticketConfigurations[0]!.quantity = 0;

      await expect(useCase.execute(input)).rejects.toThrow(
        'Ticket configuration 0 has invalid quantity',
      );
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle update with different ticket types', async () => {
      const input = createValidInput();
      input.ticketConfigurations = [
        {
          type: TicketType.EARLY_BIRD,
          price: 40,
          currency: 'USD',
          quantity: 200,
        },
      ];

      const existingEvent = createExistingEvent();
      const updatedEvent = new Event(
        input.id,
        input.name,
        input.date,
        input.location,
        input.venueName,
        [
          new TicketConfiguration(
            TicketType.EARLY_BIRD,
            Money.create(40, 'USD'),
            200,
            200,
          ),
        ],
      );

      mockEventRepository.findById.mockResolvedValue(existingEvent);
      mockEventRepository.update.mockResolvedValue(updatedEvent);

      const result = await useCase.execute(input);

      expect(result.ticketConfigurations[0]?.type).toBe(TicketType.EARLY_BIRD);
      expect(result.ticketConfigurations[0]?.totalQuantity).toBe(200);
    });

    it('should handle repository errors gracefully', async () => {
      const input = createValidInput();
      const existingEvent = createExistingEvent();

      mockEventRepository.findById.mockResolvedValue(existingEvent);
      mockEventRepository.update.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle update without optional fields', async () => {
      const input = {
        id: 'EVENT-001',
        name: 'Simple Event',
        date: futureDate,
        location: 'Simple Location',
        venueName: 'Simple Venue',
        ticketConfigurations: [
          {
            type: TicketType.GENERAL,
            price: 50,
            currency: 'USD',
            quantity: 100,
          },
        ],
      };

      const existingEvent = createExistingEvent();
      const updatedEvent = new Event(
        input.id,
        input.name,
        input.date,
        input.location,
        input.venueName,
        [
          new TicketConfiguration(
            TicketType.GENERAL,
            Money.create(50, 'USD'),
            100,
            100,
            'CONFIG-001',
          ),
        ],
        undefined,
        undefined,
        [],
      );

      mockEventRepository.findById.mockResolvedValue(existingEvent);
      mockEventRepository.update.mockResolvedValue(updatedEvent);

      const result = await useCase.execute(input);

      expect(result.imageUrl).toBeUndefined();
      expect(result.description).toBeUndefined();
    });

    it('should use Money.create for price conversion', async () => {
      const input = createValidInput();
      const existingEvent = createExistingEvent();
      const moneySpy = jest.spyOn(Money, 'create');

      mockEventRepository.findById.mockResolvedValue(existingEvent);
      mockEventRepository.update.mockResolvedValue(existingEvent);

      await useCase.execute(input);

      expect(moneySpy).toHaveBeenCalledWith(60, 'USD');
      expect(moneySpy).toHaveBeenCalledWith(180, 'USD');
      moneySpy.mockRestore();
    });
  });
});
