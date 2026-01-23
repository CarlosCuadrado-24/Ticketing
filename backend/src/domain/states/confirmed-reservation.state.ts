import {
  IReservationState,
  Reservation,
  ReservationStatusType,
} from "./reservation-state.interface";
import { InvalidStateTransitionException } from "../exceptions/invalid-state-transition.exception";

/**
 * Confirmed Reservation State - Terminal state after successful payment
 * No transitions allowed - this is a final state
 *
 * Requirements: 3.1, 4.3
 * - 3.1: Estado final después de confirmación
 * - 4.3: Pago exitoso confirma reserva permanentemente
 */
export class ConfirmedReservationState implements IReservationState {
  readonly name: ReservationStatusType = "CONFIRMED";

  canConfirm(): boolean {
    return false;
  }

  canCancel(): boolean {
    return false;
  }

  canExpire(): boolean {
    return false;
  }

  confirm(__reservation: Reservation): void {
    throw new InvalidStateTransitionException("CONFIRMED", "confirm");
  }

  cancel(__reservation: Reservation): void {
    throw new InvalidStateTransitionException("CONFIRMED", "cancel");
  }

  expire(__reservation: Reservation): void {
    throw new InvalidStateTransitionException("CONFIRMED", "expire");
  }
}
