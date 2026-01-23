import 'reflect-metadata';
import { DeleteEventUseCase } from './delete-event.use-case';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import { Event } from '../../domain/entities/event.entity';
import { TicketConfiguration } from '../../domain/entities/ticket-configuration.entity';
import { TicketType } from '../../domain/value-objects/ticket-type.vo';
import { Money } from '../../domain/value-objects/money.vo';

describe('DeleteEventUseCase', () => {
  let useCase: DeleteEventUseCase;
  let mockEventRepository: jest.Mocked<IEventRepository>;

  beforeEach(() => {
    mockEventRepository = {
      findById: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      getRealTimeAvailability: jest.fn(),
      findByIdWithTickets: jest.fn(),
    } as any;

    useCase = new DeleteEventUseCase(mockEventRepository);
  });

  describe('execute', () => {
    it('should delete an existing event successfully', async () => {
      const eventId = 'EVENT-001';
      const mockEvent = new Event(
        eventId,
        'Rock Concert',
        new Date('2024-12-31'),
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

      mockEventRepository.findById.mockResolvedValue(mockEvent);
      mockEventRepository.delete.mockResolvedValue(undefined);

      await useCase.execute(eventId);

      expect(mockEventRepository.findById).toHaveBeenCalledWith(eventId);
      expect(mockEventRepository.delete).toHaveBeenCalledWith(eventId);
    });

    it('should throw error when event ID is empty', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Event ID is required');
      await expect(useCase.execute('   ')).rejects.toThrow('Event ID is required');

      expect(mockEventRepository.findById).not.toHaveBeenCalled();
      expect(mockEventRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error when event not found', async () => {
      const eventId = 'NON-EXISTENT';
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(eventId)).rejects.toThrow('Event not found');

      expect(mockEventRepository.findById).toHaveBeenCalledWith(eventId);
      expect(mockEventRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      const eventId = 'EVENT-001';
      mockEventRepository.findById.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(useCase.execute(eventId)).rejects.toThrow(
        'Database connection error',
      );
    });
  });
});
