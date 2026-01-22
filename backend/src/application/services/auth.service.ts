import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { USER_REPOSITORY } from "../../domain/interfaces/repository-tokens";
import { User } from "../../domain/entities/user.entity";
import { Email } from "../../domain/value-objects/email.vo";
import { UserRole } from "../../domain/enums/user-role.enum";
import { v4 as uuidv4 } from "uuid";

/**
 * JWT Payload interface
 * Defines the structure of the JWT payload
 */
interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Auth Response interface
 * Defines the structure of authentication responses
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * AuthService
 * Handles user authentication including registration, login, and token refresh
 *
 * Requirements: 9.1, 9.2, 9.3
 * - 9.1: User registration with email and password
 * - 9.2: JWT token generation and validation
 * - 9.3: Token refresh functionality
 */
@Injectable()
export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET ?? "your-secret-key";
  private readonly JWT_EXPIRATION = "24h";
  private readonly REFRESH_TOKEN_EXPIRATION = "7d";

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   * @param email - User email address
   * @param password - Plain text password
   * @param firstName - User first name
   * @param lastName - User last name
   * @returns AuthResponse with tokens and user data
   * @throws ConflictException if user already exists
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<AuthResponse> {
    // Validate email format
    const emailVo = Email.create(email);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(emailVo);
    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Create new user
    const userId = uuidv4();
    const user = new User(
      userId,
      emailVo,
      "", // placeholder, will be hashed
      firstName,
      lastName,
      UserRole.BUYER, // default role
    );

    // Hash password
    const hashedPassword = await user.hashPassword(password);

    // Create user with hashed password
    const userWithHash = new User(
      userId,
      emailVo,
      hashedPassword,
      firstName,
      lastName,
      UserRole.BUYER,
    );

    // Save user
    const savedUser = await this.userRepository.save(userWithHash);

    // Generate tokens
    const tokens = this.generateTokens(savedUser);

    return {
      ...tokens,
      user: {
        id: savedUser.id,
        email:
          typeof savedUser.email === "string"
            ? savedUser.email
            : savedUser.email.value,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
      },
    };
  }

  /**
   * Login user with email and password
   * @param email - User email address
   * @param password - Plain text password
   * @returns AuthResponse with tokens and user data
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Validate email format
    const emailVo = Email.create(email);

    // Find user by email
    const user = await this.userRepository.findByEmail(emailVo);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: typeof user.email === "string" ? user.email : user.email.value,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Valid refresh token
   * @returns AuthResponse with new tokens and user data
   * @throws UnauthorizedException if refresh token is invalid
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.JWT_SECRET,
      });

      // Find user
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } =
        this.generateTokens(user);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: typeof user.email === "string" ? user.email : user.email.value,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  /**
   * Generate access and refresh tokens for a user
   * @param user - User entity
   * @returns Object with accessToken and refreshToken
   */
  private generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JwtPayload = {
      sub: user.id,
      email: typeof user.email === "string" ? user.email : user.email.value,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.JWT_SECRET,
      expiresIn: this.JWT_EXPIRATION,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.JWT_SECRET,
      expiresIn: this.REFRESH_TOKEN_EXPIRATION,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Validate JWT payload
   * @param payload - JWT payload
   * @returns User if valid, null otherwise
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    return this.userRepository.findById(payload.sub);
  }
}
