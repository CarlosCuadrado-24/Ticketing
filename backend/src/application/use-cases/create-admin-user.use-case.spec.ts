import { Test, TestingModule } from '@nestjs/testing';
import { CreateAdminUserUseCase } from './create-admin-user.use-case';
import { IUserRepository } from '../../domain/interfaces/user-repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repository-tokens';
import { User } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import { ConflictException } from '@nestjs/common';
import { Email } from '../../domain/value-objects/email.vo';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('CreateAdminUserUseCase', () => {
  let useCase: CreateAdminUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAdminUserUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateAdminUserUseCase>(CreateAdminUserUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validDto = {
      email: 'admin@test.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.ADMIN,
    };

    it('should create a new admin user successfully', async () => {
      const mockUser = new User(
        'user-123',
        validDto.email,
        'hashedPassword',
        validDto.firstName,
        validDto.lastName,
        validDto.role,
        new Date(),
      );

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await useCase.execute(validDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: validDto.email }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(validDto.password, 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validDto.email,
          firstName: validDto.firstName,
          lastName: validDto.lastName,
          role: validDto.role,
        }),
      );
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', validDto.email);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = new User(
        'existing-user',
        validDto.email,
        'hashedPassword',
        'Existing',
        'User',
        UserRole.ADMIN,
        new Date(),
      );

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(useCase.execute(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(useCase.execute(validDto)).rejects.toThrow(
        'User with this email already exists',
      );

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: validDto.email }),
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should use default ADMIN role if role is not provided', async () => {
      const dtoWithoutRole = {
        email: 'newadmin@test.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockUser = new User(
        'user-456',
        dtoWithoutRole.email,
        'hashedPassword',
        dtoWithoutRole.firstName,
        dtoWithoutRole.lastName,
        UserRole.ADMIN,
        new Date(),
      );

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await useCase.execute(dtoWithoutRole as any);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.ADMIN,
        }),
      );
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should create user with ORGANIZER role if specified', async () => {
      const organizerDto = {
        ...validDto,
        role: UserRole.ORGANIZER,
      };

      const mockUser = new User(
        'user-789',
        organizerDto.email,
        'hashedPassword',
        organizerDto.firstName,
        organizerDto.lastName,
        UserRole.ORGANIZER,
        new Date(),
      );

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await useCase.execute(organizerDto);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.ORGANIZER,
        }),
      );
      expect(result.role).toBe(UserRole.ORGANIZER);
    });

    it('should handle repository errors gracefully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute(validDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should hash password with 10 salt rounds', async () => {
      const mockUser = new User(
        'user-123',
        validDto.email,
        'hashedPassword',
        validDto.firstName,
        validDto.lastName,
        validDto.role,
        new Date(),
      );

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue(mockUser);

      await useCase.execute(validDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(validDto.password, 10);
    });
  });
});
