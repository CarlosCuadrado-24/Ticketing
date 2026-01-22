import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "../presentation/controllers/auth.controller";
import { CsrfController } from "../presentation/controllers/csrf.controller";
import { AuthService } from "../application/services/auth.service";
import { CsrfService } from "../infrastructure/external/csrf.service";
import { JwtStrategy } from "../infrastructure/auth/jwt.strategy";
import { TypeOrmUserRepository } from "../infrastructure/persistence/repositories/typeorm-user.repository";
import { UserOrmEntity } from "../infrastructure/persistence/entities/user.orm-entity";
import { USER_REPOSITORY } from "../domain/interfaces/repository-tokens";

/**
 * AuthModule
 * Encapsulates all authentication-related functionality
 * Follows NestJS module pattern with dependency injection
 * Requirements: 9.1, 9.2, 9.3, 9.4
 * Security: A01:2021 - CSRF Token Protection
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [AuthController, CsrfController],
  providers: [
    AuthService,
    CsrfService,
    JwtStrategy,
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
  ],
  exports: [AuthService, CsrfService, JwtStrategy, USER_REPOSITORY],
})
export class AuthModule {}
