import {
  IReservationState,
  Reservation,
  ReservationStatusType,
} from "./reservation-state.interface";
import { InvalidStateTransitionException } from "../exceptions/invalid-state-transition.exception";

/**
 * Cancelled Reservation State - Terminal state after cancellation
 * No transitions allowed - this is a final state
 *
 * Requirements: 5.1, 5.2
 * - 5.1: Estado final después de pago fallido
 * - 5.2: Tickets liberados automáticamente
 */
export class CancelledReservationState implements IReservationState {
  readonly name: ReservationStatusType = "CANCELLED";

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
    throw new InvalidStateTransitionException("CANCELLED", "confirm");
  }

  cancel(__reservation: Reservation): void {
    throw new InvalidStateTransitionException("CANCELLED", "cancel");
  }

  expire(__reservation: Reservation): void {
    throw new InvalidStateTransitionException("CANCELLED", "expire");
  }
}
