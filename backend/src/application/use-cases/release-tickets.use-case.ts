import { Injectable, Inject } from "@nestjs/common";
import { Reservation } from "../../domain/entities/reservation.entity";
import { IReservationRepository } from "../../domain/interfaces/reservation-repository.interface";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import {
  EVENT_REPOSITORY,
  RESERVATION_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";
import { RetryPolicy } from "../../infrastructure/common/retry-policy";

/**
 * ReleaseTicketsUseCase
 *
 * Use case for releasing tickets when payment fails or reservation expires.
 * Implements retry logic with exponential backoff to handle transient failures.
 * Follows the Single Responsibility Principle - only responsible for ticket release logic.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5
 * - 5.1: Cancel reservation and increment availability
 * - 5.2: Register release event with timestamp and reason
 * - 5.3: Process release in less than 5 seconds
 * - 5.5: Retry up to 3 times before escalating
 */
export interface ReleaseTicketsInput {
  reservationId: string;
  reason: string;
}

export interface ReleaseTicketsOutput {
  success: boolean;
  ticketsReleased?: number;
  reason?: string;
  releasedAt?: Date;
  retryAttempts?: number;
  errorMessage?: string;
}

@Injectable()
export class ReleaseTicketsUseCase {
  private readonly retryPolicy: RetryPolicy;

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {
    // Configure retry policy: 3 attempts with exponential backoff
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3,
      initialDelayMs: 100,
      backoffMultiplier: 2,
    });
  }

  /**
   * Executes the use case to release tickets for a reservation.
   *
   * Flow:
   * 1. Validate input
   * 2. Load reservation from repository (with retry)
   * 3. Load event from repository
   * 4. Cancel reservation (changes state to CANCELLED)
   * 5. Release tickets back to event availability
   * 6. Update reservation and event in repositories
   * 7. Return release result with timestamp and reason
   *
   * Requirements: 5.1, 5.2, 5.3, 5.5
   *
   * @param input - The input data for releasing tickets
   * @returns Promise resolving to ReleaseTicketsOutput with success/failure info
   * @throws Error if validation fails or repositories fail after retries
   */
  async execute(input: ReleaseTicketsInput): Promise<ReleaseTicketsOutput> {
    // Validate input
    this.validateInput(input);

    const startTime = Date.now();

    try {
      // Load reservation with retry logic
      const { result: reservation, attempts: loadAttempts } =
        await this.retryPolicy.execute<Reservation | null>(
          () => this.reservationRepository.findById(input.reservationId),
          "Load reservation",
        );

      if (!reservation) {
        throw new Error("Reservation not found");
      }

      // Load event from repository
      const event = await this.eventRepository.findById(reservation.eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      // Cancel reservation (changes state to CANCELLED)
      // Requirements: 5.1 - Cancel reservation
      reservation.cancel();

      // NOTE: No need to release tickets back to event availability
      // since we don't decrement availability during reservation anymore
      // Availability is calculated dynamically based on sold tickets

      // Update reservation status in repository
      await this.reservationRepository.update(reservation.id, {
        status: "CANCELLED",
      });

      // NOTE: No need to update event availability

      const releasedAt = new Date();
      const elapsedMs = Date.now() - startTime;

      // Requirements: 5.3 - Process in less than 5 seconds
      if (elapsedMs > 5000) {
        console.warn(
          `Release tickets operation took ${elapsedMs}ms, exceeding 5 second target`,
        );
      }

      // Requirements: 5.2 - Register release event with timestamp and reason
      return {
        success: true,
        ticketsReleased: reservation.quantity.value,
        reason: input.reason,
        releasedAt,
        retryAttempts: loadAttempts,
      };
    } catch (error) {
      // If retry logic exhausted, return failure result
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Extract retry attempts from error message if available
      const retryMatch = errorMessage.match(/after (\d+) attempts/);
      const retryAttempts = retryMatch ? parseInt(retryMatch[1] ?? "1", 10) : 1;

      return {
        success: false,
        retryAttempts,
        errorMessage,
      };
    }
  }

  /**
   * Validates the input data for ticket release
   *
   * @param input - The input to validate
   * @throws Error if validation fails
   */
  private validateInput(input: ReleaseTicketsInput): void {
    if (!input.reservationId || input.reservationId.trim().length === 0) {
      throw new Error("Reservation ID is required and cannot be empty");
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new Error("Reason is required");
    }
  }
}
