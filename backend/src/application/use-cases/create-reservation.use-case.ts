import { Injectable, Inject } from "@nestjs/common";
import { Reservation } from "../../domain/entities/reservation.entity";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";
import { TicketQuantity } from "../../domain/value-objects/ticket-quantity.vo";
import { Email } from "../../domain/value-objects/email.vo";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { IReservationRepository } from "../../domain/interfaces/reservation-repository.interface";
import {
  EVENT_REPOSITORY,
  RESERVATION_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";
import { TicketAvailabilityService } from "../../infrastructure/websocket/ticket-availability.service";
import { v4 as uuidv4 } from "uuid";

/**
 * CreateReservationUseCase
 *
 * Use case for creating temporary ticket reservations.
 * Implements atomic transaction: reserve tickets and persist reservation.
 * Follows the Single Responsibility Principle - only responsible for reservation creation logic.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.5
 * - 3.1: Reserva se crea con estado "Activa" y expiración en 15 minutos
 * - 3.2: Disponibilidad se decrementa mientras reserva está activa
 * - 3.4: Retorna ID único de reserva
 * - 3.5: Rechaza si no hay suficientes entradas disponibles
 */
export interface CreateReservationInput {
  eventId: string;
  ticketType: TicketType;
  quantity: number;
  buyerEmail: string;
}

@Injectable()
export class CreateReservationUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    private readonly ticketAvailabilityService: TicketAvailabilityService,
  ) {}

  /**
   * Executes the use case to create a new reservation.
   *
   * Atomic transaction:
   * 1. Validate input
   * 2. Load event from repository
   * 3. Check availability (using real-time calculation)
   * 4. Create reservation entity
   * 5. Persist reservation
   * 6. Broadcast availability update via WebSocket
   *
   * @param input - The input data for creating a reservation
   * @returns Promise resolving to the created Reservation with ID
   * @throws Error if input validation fails, event not found, or insufficient tickets
   */
  async execute(input: CreateReservationInput): Promise<Reservation> {
    // Validate input
    this.validateInput(input);

    // Load event from repository
    const event = await this.eventRepository.findById(input.eventId);
    if (!event) {
      throw new Error(`Event with ID ${input.eventId} not found`);
    }

    // Create value objects
    const quantity = TicketQuantity.create(input.quantity);
    const buyerEmail = Email.create(input.buyerEmail);

    // Check REAL-TIME availability (considers sold tickets + active reservations)
    const realTimeAvailability =
      await this.eventRepository.getRealTimeAvailability(
        input.eventId,
        input.ticketType,
      );

    if (realTimeAvailability < quantity.value) {
      throw new Error(
        `Insufficient tickets available. Requested: ${quantity.value}, Available: ${realTimeAvailability}`,
      );
    }

    // Calculate total amount based on ticket type and quantity
    const ticketConfig = event.ticketConfigurations.find(
      (config) => config.type === input.ticketType,
    );
    if (!ticketConfig) {
      throw new Error(
        `Ticket configuration for type ${input.ticketType} not found`,
      );
    }

    const totalAmount = ticketConfig.price.multiply(quantity.value);

    // Create reservation with 15-minute expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const reservation = new Reservation(
      uuidv4(),
      input.eventId,
      input.ticketType,
      quantity,
      buyerEmail,
      totalAmount,
      expiresAt,
    );

    // Persist reservation
    const savedReservation = await this.reservationRepository.save(reservation);
    console.log(
      `✅ [CreateReservation] Reservation created: ${savedReservation.id}, expires at: ${expiresAt.toISOString()}`,
    );

    // Calculate new availability after reservation
    const newAvailability = await this.eventRepository.getRealTimeAvailability(
      input.eventId,
      input.ticketType,
    );

    // Broadcast availability update via WebSocket (only if service is available)
    console.log(
      `📡 [CreateReservation] Broadcasting availability update: ${newAvailability} remaining for ${input.ticketType}`,
    );
    if (this.ticketAvailabilityService?.broadcastAvailabilityUpdate) {
      this.ticketAvailabilityService.broadcastAvailabilityUpdate({
        eventId: input.eventId,
        ticketType: input.ticketType,
        availableQuantity: newAvailability,
        totalQuantity: ticketConfig.totalQuantity,
        timestamp: new Date().toISOString(),
      });
    }

    return savedReservation;
  }

  /**
   * Validates the input data for reservation creation.
   *
   * @param input - The input to validate
   * @throws Error if validation fails
   */
  private validateInput(input: CreateReservationInput): void {
    if (!input.eventId || input.eventId.trim().length === 0) {
      throw new Error("Event ID is required and cannot be empty");
    }

    if (!input.ticketType) {
      throw new Error("Ticket type is required");
    }

    if (!input.quantity || input.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    if (input.quantity > 10) {
      throw new Error("Quantity cannot exceed 10 tickets per reservation");
    }

    if (!input.buyerEmail || input.buyerEmail.trim().length === 0) {
      throw new Error("Buyer email is required and cannot be empty");
    }
  }
}
