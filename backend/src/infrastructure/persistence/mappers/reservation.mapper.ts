import { Reservation } from "../../../domain/entities/reservation.entity";
import { ReservationOrmEntity } from "../entities/reservation.orm-entity";
import { Email } from "../../../domain/value-objects/email.vo";
import { Money } from "../../../domain/value-objects/money.vo";
import { TicketQuantity } from "../../../domain/value-objects/ticket-quantity.vo";

/**
 * ReservationMapper
 * Converts between domain Reservation entities and ORM ReservationOrmEntity
 * Implements the Mapper pattern for clean separation of concerns
 *
 * Requirements: 3.1, 3.3, 3.4, 8.3
 * - 8.3: Persistence round-trip (serialize/deserialize)
 */
export class ReservationMapper {
  /**
   * Converts an ORM entity to a domain entity
   * @param ormEntity - The ORM entity from the database
   * @returns Domain Reservation entity
   */
  static toDomain(ormEntity: ReservationOrmEntity): Reservation {
    const reservation = new Reservation(
      ormEntity.id,
      ormEntity.eventId,
      ormEntity.ticketType,
      TicketQuantity.create(ormEntity.quantity),
      Email.create(ormEntity.buyerEmail),
      Money.create(
        typeof ormEntity.totalAmount === "string"
          ? parseFloat(ormEntity.totalAmount)
          : ormEntity.totalAmount,
        ormEntity.currency,
      ),
      ormEntity.expiresAt,
      ormEntity.createdAt,
    );

    // Restore the state from the persisted status
    this.restoreState(reservation, ormEntity.status);

    return reservation;
  }

  /**
   * Converts a domain entity to an ORM entity
   * @param domainReservation - The domain Reservation entity
   * @returns ORM ReservationOrmEntity
   */
  static toPersistence(domainReservation: Reservation): ReservationOrmEntity {
    const ormEntity = new ReservationOrmEntity();
    ormEntity.id = domainReservation.id;
    ormEntity.eventId = domainReservation.eventId;
    ormEntity.ticketType = domainReservation.ticketType;
    ormEntity.quantity = domainReservation.quantity.value;
    ormEntity.buyerEmail = domainReservation.buyerEmail.value;
    ormEntity.totalAmount = domainReservation.totalAmount.amount;
    ormEntity.currency = domainReservation.totalAmount.currency;
    ormEntity.status = domainReservation.status;
    ormEntity.expiresAt = domainReservation.expiresAt;
    ormEntity.createdAt = domainReservation.createdAt;

    return ormEntity;
  }

  /**
   * Restores the internal state of a Reservation based on the persisted status
   * This is necessary because the State Pattern uses internal state objects
   * that are not persisted, only the status string is persisted
   *
   * @param reservation - The domain Reservation entity to restore state for
   * @param status - The persisted status string
   */
  private static restoreState(reservation: Reservation, status: string): void {
    // Import state classes dynamically to avoid circular dependencies
    /* eslint-disable @typescript-eslint/no-var-requires */
    const {
      ActiveReservationState,
    } = require("../../../domain/states/active-reservation.state");
    const {
      ConfirmedReservationState,
    } = require("../../../domain/states/confirmed-reservation.state");
    const {
      ExpiredReservationState,
    } = require("../../../domain/states/expired-reservation.state");
    const {
      CancelledReservationState,
    } = require("../../../domain/states/cancelled-reservation.state");
    /* eslint-enable @typescript-eslint/no-var-requires */

    let state;
    switch (status) {
      case "ACTIVE":
        state = new ActiveReservationState();
        break;
      case "CONFIRMED":
        state = new ConfirmedReservationState();
        break;
      case "EXPIRED":
        state = new ExpiredReservationState();
        break;
      case "CANCELLED":
        state = new CancelledReservationState();
        break;
      default:
        state = new ActiveReservationState();
    }

    reservation.setState(state);
  }
}
