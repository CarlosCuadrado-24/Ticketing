import 'reflect-metadata';
import { EventIdGeneratorService } from './event-id-generator.service';
import { DataSource, Repository } from 'typeorm';
import { EventOrmEntity } from '../../infrastructure/persistence/entities/event.orm-entity';

describe('EventIdGeneratorService', () => {
  let service: EventIdGeneratorService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<EventOrmEntity>>;

  beforeEach(() => {
    mockRepository = {
      find: jest.fn(),
    } as any;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    service = new EventIdGeneratorService(mockDataSource);
  });

  describe('generateNextId', () => {
    it('should generate TICK0009-001 when no events exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-001');
      expect(mockRepository.find).toHaveBeenCalledWith({ select: ['id'] });
    });

    it('should generate next consecutive ID when events exist', async () => {
      const mockEvents = [
        { id: 'TICK0009-001' },
        { id: 'TICK0009-002' },
        { id: 'TICK0009-003' },
      ] as EventOrmEntity[];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-004');
    });

    it('should handle non-consecutive IDs and find the highest', async () => {
      const mockEvents = [
        { id: 'TICK0009-001' },
        { id: 'TICK0009-005' },
        { id: 'TICK0009-003' },
        { id: 'TICK0009-010' },
      ] as EventOrmEntity[];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-011');
    });

    it('should ignore events with different prefixes', async () => {
      const mockEvents = [
        { id: 'TICK0009-001' },
        { id: 'OTHER-002' },
        { id: 'TICK0009-003' },
        { id: 'DIFFERENT-999' },
      ] as EventOrmEntity[];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-004');
    });

    it('should ignore events with invalid number formats', async () => {
      const mockEvents = [
        { id: 'TICK0009-001' },
        { id: 'TICK0009-abc' },
        { id: 'TICK0009-002' },
        { id: 'TICK0009-' },
      ] as EventOrmEntity[];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-003');
    });

    it('should pad numbers with leading zeros', async () => {
      const mockEvents = [
        { id: 'TICK0009-099' },
      ] as EventOrmEntity[];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-100');
    });

    it('should handle large numbers correctly', async () => {
      const mockEvents = [
        { id: 'TICK0009-999' },
      ] as EventOrmEntity[];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-1000');
    });

    it('should return fallback ID when database error occurs', async () => {
      mockRepository.find.mockRejectedValue(new Error('Database error'));

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-001');
    });

    it('should handle empty string IDs', async () => {
      const mockEvents = [
        { id: '' },
        { id: 'TICK0009-001' },
      ] as EventOrmEntity[];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-002');
    });

    it('should handle null/undefined IDs gracefully', async () => {
      const mockEvents = [
        { id: null as any },
        { id: 'TICK0009-001' },
        { id: undefined as any },
      ] as EventOrmEntity[];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.generateNextId();

      expect(result).toBe('TICK0009-001');
    });
  });

  describe('isValidEventId', () => {
    it('should return true for valid event IDs', () => {
      expect(service.isValidEventId('TICK0009-001')).toBe(true);
      expect(service.isValidEventId('TICK0009-123')).toBe(true);
      expect(service.isValidEventId('TICK0009-999')).toBe(true);
    });

    it('should return false for invalid prefixes', () => {
      expect(service.isValidEventId('TICK0008-001')).toBe(false);
      expect(service.isValidEventId('OTHER-001')).toBe(false);
      expect(service.isValidEventId('tick0009-001')).toBe(false);
    });

    it('should return false for invalid number formats', () => {
      expect(service.isValidEventId('TICK0009-1')).toBe(false); // not 3 digits
      expect(service.isValidEventId('TICK0009-12')).toBe(false); // not 3 digits
      expect(service.isValidEventId('TICK0009-1234')).toBe(false); // too many digits
      expect(service.isValidEventId('TICK0009-abc')).toBe(false); // not numeric
    });

    it('should return false for malformed IDs', () => {
      expect(service.isValidEventId('TICK0009')).toBe(false);
      expect(service.isValidEventId('TICK0009-')).toBe(false);
      expect(service.isValidEventId('-001')).toBe(false);
      expect(service.isValidEventId('')).toBe(false);
      expect(service.isValidEventId('TICK0009--001')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(service.isValidEventId(null as any)).toBe(false);
      expect(service.isValidEventId(undefined as any)).toBe(false);
    });
  });
});