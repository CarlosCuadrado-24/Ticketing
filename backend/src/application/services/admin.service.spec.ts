import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateAdminUserUseCase } from '../use-cases/create-admin-user.use-case';
import { GetUsersUseCase } from '../use-cases/get-users.use-case';
import { GetEventStatsUseCase } from '../use-cases/get-event-stats.use-case';
import { GetTicketStatsUseCase } from '../use-cases/get-ticket-stats.use-case';
import { GetDashboardStatsUseCase } from '../use-cases/get-dashboard-stats.use-case';
import { IUserRepository } from '../../domain/interfaces/user-repository.interface';
import { ITicketRepository } from '../../domain/interfaces/ticket-repository.interface';
import { IEventRepository } from '../../domain/interfaces/event-repository.interface';
import { IReservationRepository } from '../../domain/interfaces/reservation-repository.interface';
import {
  USER_REPOSITORY,
  TICKET_REPOSITORY,
  EVENT_REPOSITORY,
  RESERVATION_REPOSITORY,
} from '../../domain/interfaces/repository-tokens';
import { Email } from '../../domain/value-objects/email.vo';
import { UserRole } from '../../domain/enums/user-role.enum';

describe('AdminService', () => {
  let service: AdminService;
  let mockCreateAdminUserUseCase: jest.Mocked<CreateAdminUserUseCase>;
  let mockGetUsersUseCase: jest.Mocked<GetUsersUseCase>;
  let mockGetEventStatsUseCase: jest.Mocked<GetEventStatsUseCase>;
  let mockGetTicketStatsUseCase: jest.Mocked<GetTicketStatsUseCase>;
  let mockGetDashboardStatsUseCase: jest.Mocked<GetDashboardStatsUseCase>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockReservationRepository: jest.Mocked<IReservationRepository>;

  beforeEach(async () => {
    mockCreateAdminUserUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetUsersUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetEventStatsUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetTicketStatsUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetDashboardStatsUseCase = {
      execute: jest.fn(),
    } as any;

    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      save: jest.fn(),
      findByRole: jest.fn(),
    } as any;

    mockTicketRepository = {
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      findByBuyer: jest.fn(),
      findById: jest.fn(),
      findByQRToken: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      findByEvent: jest.fn(),
      getRevenueByEvent: jest.fn(),
      getRevenueByTicketType: jest.fn(),
      countSold: jest.fn(),
      getTotalRevenue: jest.fn(),
      getTopSellingEvents: jest.fn(),
    } as any;

    mockEventRepository = {
      findById: jest.fn(),
      findByCreatedBy: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findRecent: jest.fn(),
      findUpcoming: jest.fn(),
      findPast: jest.fn(),
      getEventsByCategory: jest.fn(),
      getEventsByMonth: jest.fn(),
      getRealTimeAvailability: jest.fn(),
      updateTicketAvailability: jest.fn(),
    } as any;

    mockReservationRepository = {
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      findById: jest.fn(),
      findByBuyerEmail: jest.fn(),
      findActiveByEvent: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findExpired: jest.fn(),
      countActive: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: CreateAdminUserUseCase,
          useValue: mockCreateAdminUserUseCase,
        },
        {
          provide: GetUsersUseCase,
          useValue: mockGetUsersUseCase,
        },
        {
          provide: GetEventStatsUseCase,
          useValue: mockGetEventStatsUseCase,
        },
        {
          provide: GetTicketStatsUseCase,
          useValue: mockGetTicketStatsUseCase,
        },
        {
          provide: GetDashboardStatsUseCase,
          useValue: mockGetDashboardStatsUseCase,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
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
          provide: RESERVATION_REPOSITORY,
          useValue: mockReservationRepository,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAdminUser', () => {
    it('should create a new admin user when email does not exist', async () => {
      const createAdminUserDto = {
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockCreateAdminUserUseCase.execute.mockResolvedValue({
        id: '1',
        email: Email.create(createAdminUserDto.email),
        firstName: createAdminUserDto.firstName,
        lastName: createAdminUserDto.lastName,
        role: UserRole.ADMIN,
        createdAt: new Date(),
      } as any);

      const result = await service.createAdminUser(createAdminUserDto);

      expect(result).toBeDefined();
      expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockCreateAdminUserUseCase.execute).toHaveBeenCalledWith(
        createAdminUserDto,
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const createAdminUserDto = {
        email: 'existing@test.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
      };

      mockUserRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: Email.create(createAdminUserDto.email),
      } as any);

      await expect(service.createAdminUser(createAdminUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockCreateAdminUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user without password when user exists', async () => {
      const userId = '123';
      const mockUser = {
        id: userId,
        email: Email.create('user@test.com'),
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password',
        role: UserRole.BUYER,
        createdAt: new Date(),
      };

      mockUserRepository.findById.mockResolvedValue(mockUser as any);

      const result = await service.getUserById(userId);

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe(userId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'non-existent-id';

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.getUserById(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = '123';
      const updateDto = { firstName: 'Updated', lastName: 'Name' };
      const existingUser = {
        id: userId,
        email: Email.create('user@test.com'),
        firstName: 'Old',
        lastName: 'Name',
        passwordHash: 'hashed_password',
        role: UserRole.BUYER,
        createdAt: new Date(),
      };
      const updatedUser = {
        ...existingUser,
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
      };

      mockUserRepository.findById.mockResolvedValue(existingUser as any);
      mockUserRepository.update.mockResolvedValue(updatedUser as any);

      const result = await service.updateUser(userId, updateDto);

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.firstName).toBe(updateDto.firstName);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateDto);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'non-existent-id';
      const updateDto = { firstName: 'Updated' };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new email already exists', async () => {
      const userId = '123';
      const newEmail = 'newemail@test.com';
      const updateDto = { email: newEmail };
      const existingUser = {
        id: userId,
        email: Email.create('oldemail@test.com'),
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.BUYER,
        createdAt: new Date(),
      };
      const anotherUser = {
        id: '456',
        email: Email.create(newEmail),
      };

      mockUserRepository.findById.mockResolvedValue(existingUser as any);
      mockUserRepository.findByEmail.mockResolvedValue(anotherUser as any);

      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = '123';
      const existingUser = {
        id: userId,
        email: Email.create('user@test.com'),
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.BUYER,
        createdAt: new Date(),
      };

      mockUserRepository.findById.mockResolvedValue(existingUser as any);
      mockUserRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteUser(userId);

      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'non-existent-id';

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.deleteUser(userId)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = {
        overview: {
          totalUsers: 100,
          totalEvents: 50,
          totalTicketsSold: 500,
          totalRevenue: 10000,
          activeReservations: 20,
        },
        recentEvents: [],
        topEvents: [],
        eventsByMonth: [],
      };

      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockStats);

      const result = await service.getDashboardStats();

      expect(result).toEqual(mockStats);
      expect(mockGetDashboardStatsUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTickets', () => {
    it('should return paginated tickets for admin', async () => {
      const filters = { page: 1, limit: 10 };
      const mockTickets = [
        {
          id: 'ticket-1',
          code: 'TKT-001',
          eventId: 'event-1',
          type: 'GENERAL',
          buyerEmail: 'buyer@test.com',
          price: { amount: 100, currency: 'USD' },
          purchaseDate: new Date(),
          status: 'PAID',
          usedAt: null,
        },
      ];
      const mockEvent = { id: 'event-1', name: 'Test Event' };

      mockTicketRepository.findWithFilters.mockResolvedValue(mockTickets as any);
      mockTicketRepository.countWithFilters.mockResolvedValue(1);
      mockEventRepository.findById.mockResolvedValue(mockEvent as any);

      const result = await service.getTickets(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.eventName).toBe('Test Event');
      expect(result.pagination.total).toBe(1);
      expect(mockTicketRepository.findWithFilters).toHaveBeenCalled();
    });

    it('should return empty array for organizer with no events', async () => {
      const filters = { page: 1, limit: 10 };
      const user = { id: 'organizer-1', role: UserRole.ORGANIZER };

      mockEventRepository.findByCreatedBy.mockResolvedValue([]);

      const result = await service.getTickets(filters, user);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(mockTicketRepository.findWithFilters).not.toHaveBeenCalled();
    });
  });

  describe('getReservations', () => {
    it('should return paginated reservations', async () => {
      const filters = { page: 1, limit: 10 };
      const mockReservations = [
        {
          id: 'reservation-1',
          eventId: 'event-1',
          ticketType: 'GENERAL',
          quantity: 2,
          buyerEmail: Email.create('buyer@test.com'),
        },
      ];

      mockReservationRepository.findWithFilters.mockResolvedValue(
        mockReservations as any,
      );
      mockReservationRepository.countWithFilters.mockResolvedValue(1);

      const result = await service.getReservations(filters);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter reservations by status', async () => {
      const filters = { status: 'ACTIVE', page: 1, limit: 10 };

      mockReservationRepository.findWithFilters.mockResolvedValue([]);
      mockReservationRepository.countWithFilters.mockResolvedValue(0);

      const result = await service.getReservations(filters);

      expect(mockReservationRepository.findWithFilters).toHaveBeenCalledWith({
        status: 'ACTIVE',
        limit: 10,
        offset: 0,
      });
      expect(result.data).toEqual([]);
    });
  });
});
