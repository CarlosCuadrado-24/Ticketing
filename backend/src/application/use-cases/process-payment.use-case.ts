import { Injectable, Inject } from "@nestjs/common";
import { Reservation } from "../../domain/entities/reservation.entity";
import { Ticket } from "../../domain/entities/ticket.entity";
import {
  IPaymentGateway,
  PaymentData,
} from "../../domain/interfaces/payment-gateway.interface";
import { IReservationRepository } from "../../domain/interfaces/reservation-repository.interface";
import { ITicketRepository } from "../../domain/interfaces/ticket-repository.interface";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import {
  EVENT_REPOSITORY,
  RESERVATION_REPOSITORY,
  TICKET_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";
import { EmailService } from "../../infrastructure/external/email.service";
import { v4 as uuidv4 } from "uuid";

/**
 * ProcessPaymentUseCase
 *
 * Use case for processing payments for ticket reservations.
 * Implements atomic transaction: validate payment → process → confirm/cancel → generate/release tickets.
 * Follows the Single Responsibility Principle - only responsible for payment processing logic.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 * - 4.1: Process payment with amount validation
 * - 4.2: Successful payment updates payment status to COMPLETED
 * - 4.3: Successful payment changes reservation to CONFIRMED
 * - 4.4: Successful payment generates tickets with correct data
 * - 4.5: Failed payment cancels reservation and releases tickets
 */
export interface ProcessPaymentInput {
  reservationId: string;
  amount: number;
  currency: string;
}

export interface ProcessPaymentOutput {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject("IPaymentGateway")
    private readonly paymentGateway: IPaymentGateway,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: ITicketRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Executes the use case to process a payment for a reservation.
   *
   * Atomic transaction flow:
   * 1. Validate input and load reservation
   * 2. Validate payment amount matches reservation total
   * 3. Load event to access ticket configuration
   * 4. Process payment through gateway
   * 5. If successful:
   *    - Confirm reservation
   *    - Generate tickets with unique codes
   *    - Persist tickets
   *    - Update reservation status
   * 6. If failed:
   *    - Cancel reservation
   *    - Release tickets back to event availability
   *    - Update reservation status
   *
   * @param input - The input data for processing payment
   * @returns Promise resolving to ProcessPaymentOutput with success/failure info
   * @throws Error if validation fails or repositories fail
   */
  async execute(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
    // Validate input
    this.validateInput(input);

    // Load reservation from repository
    const reservation = await this.reservationRepository.findById(
      input.reservationId,
    );
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Validate payment amount matches reservation total
    if (input.amount !== reservation.totalAmount.amount) {
      throw new Error("Payment amount does not match reservation total");
    }

    if (input.currency !== reservation.totalAmount.currency) {
      throw new Error("Payment currency does not match reservation currency");
    }

    // Load event to access ticket configuration
    const event = await this.eventRepository.findById(reservation.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Prepare payment data
    const paymentData: PaymentData = {
      amount: reservation.totalAmount,
      currency: reservation.totalAmount.currency,
      description: `Ticket purchase for event ${reservation.eventId}`,
      metadata: {
        reservationId: reservation.id,
        eventId: reservation.eventId,
        ticketType: reservation.ticketType,
        quantity: reservation.quantity.value.toString(),
        buyerEmail: reservation.buyerEmail.value,
      },
    };

    // Process payment through gateway
    const paymentResult = await this.paymentGateway.processPayment(paymentData);

    // Handle payment result
    if (paymentResult.success) {
      return await this.handleSuccessfulPayment(
        reservation,
        event,
        paymentResult.transactionId,
      );
    } else {
      return await this.handleFailedPayment(
        reservation,
        event,
        paymentResult.errorCode,
        paymentResult.errorMessage,
      );
    }
  }

  /**
   * Handles successful payment flow
   * - Confirms reservation
   * - Generates tickets
   * - Persists tickets and updates reservation
   * - Releases reservation from event (since tickets are now sold)
   * - Sends confirmation email with tickets
   *
   * Requirements: 4.2, 4.3, 4.4
   */
  private async handleSuccessfulPayment(
    reservation: Reservation,
    event: any,
    transactionId: string,
  ): Promise<ProcessPaymentOutput> {
    // Confirm reservation (changes state to CONFIRMED)
    reservation.confirm();

    // Generate tickets with unique codes
    const tickets = this.generateTickets(reservation, event);

    // Persist tickets
    await this.ticketRepository.saveMany(tickets);

    // 🔧 FIX: The reservation is now consumed (tickets are sold)
    // No need to release tickets back to availability since they're now sold
    // The tickets were already deducted during reservation creation
    console.log(
      `✅ [ProcessPayment] Reserva consumida exitosamente - Cantidad: ${reservation.quantity.value}, Tipo: ${reservation.ticketType}`,
    );

    // Update reservation status in repository
    await this.reservationRepository.update(reservation.id, {
      status: "CONFIRMED",
    });

    // Send confirmation email with tickets (async, don't wait for it)
    this.sendConfirmationEmail(tickets, event, reservation).catch((error) => {
      console.error("❌ Error sending confirmation email:", error);
      // Don't throw error - email failure shouldn't fail the payment
    });

    return {
      success: true,
      transactionId,
    };
  }

  /**
   * Handles failed payment flow
   * - Cancels reservation
   * - Releases tickets back to event
   * - Updates reservation and event
   *
   * Requirements: 4.5, 5.1, 5.2
   */
  private async handleFailedPayment(
    reservation: Reservation,
    event: any,
    errorCode: string,
    errorMessage: string,
  ): Promise<ProcessPaymentOutput> {
    // Cancel reservation (changes state to CANCELLED)
    reservation.cancel();

    // Release tickets back to event availability
    event.releaseTickets(reservation.ticketType, reservation.quantity.value);

    // Update reservation status in repository
    await this.reservationRepository.update(reservation.id, {
      status: "CANCELLED",
    });

    // Update event with released tickets
    await this.eventRepository.update(event);

    return {
      success: false,
      errorCode,
      errorMessage,
    };
  }

  /**
   * Generates tickets for a successful payment
   * Creates one ticket per quantity with unique code
   *
   * Requirements: 4.4 - Generate tickets with unique code, event, type and buyer data
   */
  private generateTickets(reservation: Reservation, event: any): Ticket[] {
    const tickets: Ticket[] = [];
    const ticketConfig = event.ticketConfigurations.find(
      (config: any) => config.type === reservation.ticketType,
    );

    if (!ticketConfig) {
      throw new Error(
        `Ticket configuration for type ${reservation.ticketType} not found`,
      );
    }

    for (let i = 0; i < reservation.quantity.value; i++) {
      const ticket = new Ticket(
        uuidv4(),
        this.generateUniqueTicketCode(),
        reservation.eventId,
        reservation.ticketType,
        reservation.buyerEmail,
        ticketConfig.price,
        new Date(),
        uuidv4(), // QR token
      );
      tickets.push(ticket);
    }

    return tickets;
  }

  /**
   * Generates a unique ticket code
   * Format: TKT-{timestamp}-{random}
   */
  private generateUniqueTicketCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TKT-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Validates the input data for payment processing
   *
   * @param input - The input to validate
   * @throws Error if validation fails
   */
  private validateInput(input: ProcessPaymentInput): void {
    if (!input.reservationId || input.reservationId.trim().length === 0) {
      throw new Error("Reservation ID is required and cannot be empty");
    }

    if (
      input.amount === undefined ||
      input.amount === null ||
      input.amount < 0
    ) {
      throw new Error("Amount must be a non-negative number");
    }

    if (!input.currency || input.currency.trim().length !== 3) {
      throw new Error("Currency must be a 3-letter code");
    }
  }

  /**
   * Sends confirmation email with tickets after successful payment
   *
   * @param tickets - Generated tickets
   * @param event - Event information
   * @param reservation - Original reservation
   */
  private async sendConfirmationEmail(
    tickets: Ticket[],
    event: any,
    reservation: Reservation,
  ): Promise<void> {
    try {
      console.log("📧 Enviando email de confirmación...");

      // Extract buyer name from email (simple approach)
      const buyerName = this.extractNameFromEmail(reservation.buyerEmail.value);

      await this.emailService.sendTicketConfirmationEmail({
        buyerEmail: reservation.buyerEmail.value,
        buyerName,
        tickets,
        eventName: event.name,
        eventDate: event.date.toISOString(),
        eventLocation: event.location,
        eventVenueName: event.venueName,
        eventStartTime: undefined, // Event entity doesn't have startTime
        eventEndTime: undefined, // Event entity doesn't have endTime
        eventImage: event.imageUrl,
      });

      console.log("✅ Email de confirmación enviado exitosamente");
    } catch (error) {
      console.error("❌ Error al enviar email de confirmación:", error);
      // Don't re-throw - error is already caught in execute()
    }
  }

  /**
   * Extracts a display name from an email address
   * Simple implementation - in production you might want to store actual names
   *
   * @param email - Email address
   * @returns Display name
   */
  private extractNameFromEmail(email: string): string {
    const localPart = email.split("@")[0];
    if (!localPart) {
      return "Usuario";
    }
    // Convert dots and underscores to spaces and capitalize
    return localPart
      .replace(/[._]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
}
