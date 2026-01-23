import 'reflect-metadata';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from '../../domain/interfaces/user-repository.interface';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { UserRole } from '../../domain/enums/user-role.enum';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockJwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      count: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
    } as any;

    service = new AuthService(mockUserRepository, mockJwtService);
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const firstName = 'John';
      const lastName = 'Doe';

      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      const mockSavedUser = new User(
        'user-id',
        Email.create(email),
        'hashed-password',
        firstName,
        lastName,
        UserRole.BUYER
      );
      mockUserRepository.save.mockResolvedValue(mockSavedUser);

      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.register(email, password, firstName, lastName);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-id',
          email: email,
          firstName: firstName,
          lastName: lastName,
          role: UserRole.BUYER,
        },
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(Email.create(email));
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should throw ConflictException when user already exists', async () => {
      const email = 'existing@example.com';
      const existingUser = new User(
        'existing-id',
        Email.create(email),
        'hashed-password',
        'Jane',
        'Doe',
        UserRole.BUYER
      );

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(
        service.register(email, 'password123', 'John', 'Doe')
      ).rejects.toThrow(new ConflictException('User with this email already exists'));

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for invalid email format', async () => {
      const invalidEmail = 'invalid-email';

      await expect(
        service.register(invalidEmail, 'password123', 'John', 'Doe')
      ).rejects.toThrow();
    });

    it('should create user with BUYER role by default', async () => {
      const email = 'test@example.com';
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      const mockSavedUser = new User(
        'user-id',
        Email.create(email),
        'hashed-password',
        'John',
        'Doe',
        UserRole.BUYER
      );
      mockUserRepository.save.mockResolvedValue(mockSavedUser);

      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.register(email, 'password123', 'John', 'Doe');

      expect(result.user.role).toBe(UserRole.BUYER);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const mockUser = new User(
        'user-id',
        Email.create(email),
        'hashed-password',
        'John',
        'Doe',
        UserRole.BUYER
      );

      // Mock password verification
      jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(email, password);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-id',
          email: email,
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
        },
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(Email.create(email));
      expect(mockUser.verifyPassword).toHaveBeenCalledWith(password, 'hashed-password');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const email = 'nonexistent@example.com';
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login(email, 'password123')
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const email = 'test@example.com';
      const mockUser = new User(
        'user-id',
        Email.create(email),
        'hashed-password',
        'John',
        'Doe',
        UserRole.BUYER
      );

      jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(false);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login(email, 'wrong-password')
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('should throw error for invalid email format', async () => {
      const invalidEmail = 'invalid-email';

      await expect(
        service.login(invalidEmail, 'password123')
      ).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: UserRole.BUYER,
      };

      const mockUser = new User(
        'user-id',
        Email.create('test@example.com'),
        'hashed-password',
        'John',
        'Doe',
        UserRole.BUYER
      );

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
        },
      });

      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'your-secret-key',
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const invalidRefreshToken = 'invalid-refresh-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.refreshToken(invalidRefreshToken)
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        sub: 'nonexistent-user-id',
        email: 'test@example.com',
        role: UserRole.BUYER,
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.refreshToken(refreshToken)
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });
  });

  describe('validateJwtPayload', () => {
    it('should return user when payload is valid', async () => {
      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: UserRole.BUYER,
      };

      const mockUser = new User(
        'user-id',
        Email.create('test@example.com'),
        'hashed-password',
        'John',
        'Doe',
        UserRole.BUYER
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.validateJwtPayload(payload);

      expect(result).toBe(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id');
    });

    it('should return null when user not found', async () => {
      const payload = {
        sub: 'nonexistent-user-id',
        email: 'test@example.com',
        role: UserRole.BUYER,
      };

      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.validateJwtPayload(payload);

      expect(result).toBeNull();
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', async () => {
      const email = 'test@example.com';
      const mockUser = new User(
        'user-id',
        Email.create(email),
        'hashed-password',
        'John',
        'Doe',
        UserRole.BUYER
      );

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await service.register(email, 'password123', 'John', 'Doe');

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-id',
          email: email,
          role: UserRole.BUYER,
        },
        {
          secret: 'your-secret-key',
          expiresIn: '24h',
        }
      );

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-id',
          email: email,
          role: UserRole.BUYER,
        },
        {
          secret: 'your-secret-key',
          expiresIn: '7d',
        }
      );
    });

    it('should use custom JWT_SECRET from environment', async () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'custom-secret';

      const customService = new AuthService(mockUserRepository, mockJwtService);
      const email = 'test@example.com';
      const mockUser = new User(
        'user-id',
        Email.create(email),
        'hashed-password',
        'John',
        'Doe',
        UserRole.BUYER
      );

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await customService.register(email, 'password123', 'John', 'Doe');

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          secret: 'custom-secret',
        })
      );

      // Restore original environment
      process.env.JWT_SECRET = originalEnv;
    });
  });

  describe('edge cases', () => {
    it('should handle user with email as string vs Email object', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-id',
        email: email, // string instead of Email object
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.BUYER,
        passwordHash: 'hashed-password',
        verifyPassword: jest.fn().mockResolvedValue(true),
      } as any;

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(email, 'password123');

      expect(result.user.email).toBe(email);
    });

    it('should handle user with email as Email object', async () => {
      const email = 'test@example.com';
      const mockUser = new User(
        'user-id',
        Email.create(email),
        'hashed-password',
        'John',
        'Doe',
        UserRole.BUYER
      );

      jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(email, 'password123');

      expect(result.user.email).toBe(email);
    });
  });
});