import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { TicketController } from "../presentation/controllers/ticket.controller";
import { ReservationController } from "../presentation/controllers/reservation.controller";
import { GetBuyerTicketsUseCase } from "../application/use-cases/get-buyer-tickets.use-case";
import { PurchaseTicketUseCase } from "../application/use-cases/purchase-ticket.use-case";
import { ValidateQRUseCase } from "../application/use-cases/validate-qr.use-case";
import { CreateReservationUseCase } from "../application/use-cases/create-reservation.use-case";
import { ProcessPaymentUseCase } from "../application/use-cases/process-payment.use-case";
import { ReleaseTicketsUseCase } from "../application/use-cases/release-tickets.use-case";
import { ResendEmailUseCase } from "../application/use-cases/resend-email.use-case";
import { TypeOrmTicketRepository } from "../infrastructure/persistence/repositories/typeorm-ticket.repository";
import { TypeOrmReservationRepository } from "../infrastructure/persistence/repositories/typeorm-reservation.repository";
import { TypeOrmEventRepository } from "../infrastructure/persistence/repositories/typeorm-event.repository";
import { MockPaymentGateway } from "../infrastructure/external/mock-payment-gateway.service";
import { EmailService } from "../infrastructure/external/email.service";
import { TicketOrmEntity } from "../infrastructure/persistence/entities/ticket.orm-entity";
import { ReservationOrmEntity } from "../infrastructure/persistence/entities/reservation.orm-entity";
import { EventOrmEntity } from "../infrastructure/persistence/entities/event.orm-entity";
import { TicketConfigurationOrmEntity } from "../infrastructure/persistence/entities/ticket-configuration.orm-entity";
import {
  TICKET_REPOSITORY,
  RESERVATION_REPOSITORY,
  EVENT_REPOSITORY,
} from "../domain/interfaces/repository-tokens";
import { WebSocketModule } from "./websocket.module";
import { ReservationExpirationScheduler } from "../infrastructure/schedulers/reservation-expiration.scheduler";

/**
 * TicketModule
 * Encapsulates all ticket and reservation-related functionality
 * Follows NestJS module pattern with dependency injection
 *
 * Features:
 * - Ticket purchase with automatic QR generation
 * - QR code validation
 * - Ticket queries by buyer
 * - Reservation management
 * - Payment processing
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketOrmEntity,
      ReservationOrmEntity,
      EventOrmEntity,
      TicketConfigurationOrmEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    WebSocketModule,
  ],
  controllers: [TicketController, ReservationController],
  providers: [
    // Ticket Use Cases
    GetBuyerTicketsUseCase,
    PurchaseTicketUseCase,
    ValidateQRUseCase,
    ResendEmailUseCase,

    // Reservation Use Cases
    CreateReservationUseCase,
    ProcessPaymentUseCase,
    ReleaseTicketsUseCase,

    // Schedulers
    ReservationExpirationScheduler,

    // External Services
    EmailService,

    // Repositories
    {
      provide: TICKET_REPOSITORY,
      useClass: TypeOrmTicketRepository,
    },
    {
      provide: RESERVATION_REPOSITORY,
      useClass: TypeOrmReservationRepository,
    },
    {
      provide: EVENT_REPOSITORY,
      useClass: TypeOrmEventRepository,
    },
    {
      provide: "IPaymentGateway",
      useClass: MockPaymentGateway,
    },
  ],
  exports: [
    // Export use cases for potential use in other modules
    GetBuyerTicketsUseCase,
    PurchaseTicketUseCase,
    ValidateQRUseCase,
    CreateReservationUseCase,
    ProcessPaymentUseCase,
    ReleaseTicketsUseCase,
    // Export repositories
    TICKET_REPOSITORY,
    RESERVATION_REPOSITORY,
  ],
})
export class TicketModule {}
