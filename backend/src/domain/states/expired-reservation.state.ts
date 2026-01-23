import {
  IReservationState,
  Reservation,
  ReservationStatusType,
} from "./reservation-state.interface";
import { InvalidStateTransitionException } from "../exceptions/invalid-state-transition.exception";

/**
 * Expired Reservation State - Terminal state after timeout
 * No transitions allowed - this is a final state
 *
 * Requirements: 3.3, 5.2
 * - 3.3: Estado final después de expiración automática
 * - 5.2: Tickets liberados automáticamente
 */
export class ExpiredReservationState implements IReservationState {
  readonly name: ReservationStatusType = "EXPIRED";

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
    throw new InvalidStateTransitionException("EXPIRED", "confirm");
  }

  cancel(__reservation: Reservation): void {
    throw new InvalidStateTransitionException("EXPIRED", "cancel");
  }

  expire(__reservation: Reservation): void {
    throw new InvalidStateTransitionException("EXPIRED", "expire");
  }
}
