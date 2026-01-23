import { ActiveReservationState } from "./active-reservation.state";
import { ConfirmedReservationState } from "./confirmed-reservation.state";
import { CancelledReservationState } from "./cancelled-reservation.state";
import { ExpiredReservationState } from "./expired-reservation.state";
import { InvalidStateTransitionException } from "../exceptions/invalid-state-transition.exception";
import { IReservationState } from "./reservation-state.interface";

// Mock Reservation for testing
class MockReservation {
  private state: IReservationState;

  constructor(initialState: IReservationState) {
    this.state = initialState;
  }

  setState(newState: IReservationState): void {
    this.state = newState;
  }

  getState(): IReservationState {
    return this.state;
  }
}

describe("Reservation States", () => {
  describe("ActiveReservationState", () => {
    let state: ActiveReservationState;
    let mockReservation: MockReservation;

    beforeEach(() => {
      state = new ActiveReservationState();
      mockReservation = new MockReservation(state);
    });

    it("should have correct name", () => {
      expect(state.name).toBe("ACTIVE");
    });

    it("should allow confirming", () => {
      expect(state.canConfirm()).toBe(true);
    });

    it("should allow cancelling", () => {
      expect(state.canCancel()).toBe(true);
    });

    it("should allow expiring", () => {
      expect(state.canExpire()).toBe(true);
    });

    it("should transition to CONFIRMED state", () => {
      state.confirm(mockReservation as any);
      expect(mockReservation.getState()).toBeInstanceOf(
        ConfirmedReservationState,
      );
      expect(mockReservation.getState().name).toBe("CONFIRMED");
    });

    it("should transition to CANCELLED state", () => {
      state.cancel(mockReservation as any);
      expect(mockReservation.getState()).toBeInstanceOf(
        CancelledReservationState,
      );
      expect(mockReservation.getState().name).toBe("CANCELLED");
    });

    it("should transition to EXPIRED state", () => {
      state.expire(mockReservation as any);
      expect(mockReservation.getState()).toBeInstanceOf(
        ExpiredReservationState,
      );
      expect(mockReservation.getState().name).toBe("EXPIRED");
    });

    it("should allow all valid transitions", () => {
      expect(() => state.confirm(mockReservation as any)).not.toThrow();

      const mockReservation2 = new MockReservation(
        new ActiveReservationState(),
      );
      expect(() => state.cancel(mockReservation2 as any)).not.toThrow();

      const mockReservation3 = new MockReservation(
        new ActiveReservationState(),
      );
      expect(() => state.expire(mockReservation3 as any)).not.toThrow();
    });
  });

  describe("ConfirmedReservationState", () => {
    let state: ConfirmedReservationState;
    let mockReservation: MockReservation;

    beforeEach(() => {
      state = new ConfirmedReservationState();
      mockReservation = new MockReservation(state);
    });

    it("should have correct name", () => {
      expect(state.name).toBe("CONFIRMED");
    });

    it("should not allow confirming", () => {
      expect(state.canConfirm()).toBe(false);
    });

    it("should not allow cancelling", () => {
      expect(state.canCancel()).toBe(false);
    });

    it("should not allow expiring", () => {
      expect(state.canExpire()).toBe(false);
    });

    it("should throw error when trying to confirm again", () => {
      expect(() => state.confirm(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.confirm(mockReservation as any)).toThrow(
        "Cannot confirm reservation in CONFIRMED state",
      );
    });

    it("should throw error when trying to cancel", () => {
      expect(() => state.cancel(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.cancel(mockReservation as any)).toThrow(
        "Cannot cancel reservation in CONFIRMED state",
      );
    });

    it("should throw error when trying to expire", () => {
      expect(() => state.expire(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.expire(mockReservation as any)).toThrow(
        "Cannot expire reservation in CONFIRMED state",
      );
    });

    it("should be a terminal state", () => {
      expect(() => state.confirm(mockReservation as any)).toThrow();
      expect(() => state.cancel(mockReservation as any)).toThrow();
      expect(() => state.expire(mockReservation as any)).toThrow();
    });
  });

  describe("CancelledReservationState", () => {
    let state: CancelledReservationState;
    let mockReservation: MockReservation;

    beforeEach(() => {
      state = new CancelledReservationState();
      mockReservation = new MockReservation(state);
    });

    it("should have correct name", () => {
      expect(state.name).toBe("CANCELLED");
    });

    it("should not allow confirming", () => {
      expect(state.canConfirm()).toBe(false);
    });

    it("should not allow cancelling", () => {
      expect(state.canCancel()).toBe(false);
    });

    it("should not allow expiring", () => {
      expect(state.canExpire()).toBe(false);
    });

    it("should throw error when trying to confirm", () => {
      expect(() => state.confirm(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.confirm(mockReservation as any)).toThrow(
        "Cannot confirm reservation in CANCELLED state",
      );
    });

    it("should throw error when trying to cancel again", () => {
      expect(() => state.cancel(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.cancel(mockReservation as any)).toThrow(
        "Cannot cancel reservation in CANCELLED state",
      );
    });

    it("should throw error when trying to expire", () => {
      expect(() => state.expire(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.expire(mockReservation as any)).toThrow(
        "Cannot expire reservation in CANCELLED state",
      );
    });

    it("should be a terminal state", () => {
      expect(() => state.confirm(mockReservation as any)).toThrow();
      expect(() => state.cancel(mockReservation as any)).toThrow();
      expect(() => state.expire(mockReservation as any)).toThrow();
    });
  });

  describe("ExpiredReservationState", () => {
    let state: ExpiredReservationState;
    let mockReservation: MockReservation;

    beforeEach(() => {
      state = new ExpiredReservationState();
      mockReservation = new MockReservation(state);
    });

    it("should have correct name", () => {
      expect(state.name).toBe("EXPIRED");
    });

    it("should not allow confirming", () => {
      expect(state.canConfirm()).toBe(false);
    });

    it("should not allow cancelling", () => {
      expect(state.canCancel()).toBe(false);
    });

    it("should not allow expiring", () => {
      expect(state.canExpire()).toBe(false);
    });

    it("should throw error when trying to confirm", () => {
      expect(() => state.confirm(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.confirm(mockReservation as any)).toThrow(
        "Cannot confirm reservation in EXPIRED state",
      );
    });

    it("should throw error when trying to cancel", () => {
      expect(() => state.cancel(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.cancel(mockReservation as any)).toThrow(
        "Cannot cancel reservation in EXPIRED state",
      );
    });

    it("should throw error when trying to expire again", () => {
      expect(() => state.expire(mockReservation as any)).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => state.expire(mockReservation as any)).toThrow(
        "Cannot expire reservation in EXPIRED state",
      );
    });

    it("should be a terminal state", () => {
      expect(() => state.confirm(mockReservation as any)).toThrow();
      expect(() => state.cancel(mockReservation as any)).toThrow();
      expect(() => state.expire(mockReservation as any)).toThrow();
    });
  });

  describe("State Transitions", () => {
    it("should follow valid state machine flow: ACTIVE → CONFIRMED", () => {
      const activeState = new ActiveReservationState();
      const mockReservation = new MockReservation(activeState);

      expect(mockReservation.getState().name).toBe("ACTIVE");
      activeState.confirm(mockReservation as any);
      expect(mockReservation.getState().name).toBe("CONFIRMED");
    });

    it("should follow valid state machine flow: ACTIVE → CANCELLED", () => {
      const activeState = new ActiveReservationState();
      const mockReservation = new MockReservation(activeState);

      expect(mockReservation.getState().name).toBe("ACTIVE");
      activeState.cancel(mockReservation as any);
      expect(mockReservation.getState().name).toBe("CANCELLED");
    });

    it("should follow valid state machine flow: ACTIVE → EXPIRED", () => {
      const activeState = new ActiveReservationState();
      const mockReservation = new MockReservation(activeState);

      expect(mockReservation.getState().name).toBe("ACTIVE");
      activeState.expire(mockReservation as any);
      expect(mockReservation.getState().name).toBe("EXPIRED");
    });

    it("should not allow invalid transitions from terminal states", () => {
      const confirmedState = new ConfirmedReservationState();
      const cancelledState = new CancelledReservationState();
      const expiredState = new ExpiredReservationState();

      const mockConfirmed = new MockReservation(confirmedState);
      const mockCancelled = new MockReservation(cancelledState);
      const mockExpired = new MockReservation(expiredState);

      expect(() => confirmedState.confirm(mockConfirmed as any)).toThrow();
      expect(() => confirmedState.cancel(mockConfirmed as any)).toThrow();
      expect(() => confirmedState.expire(mockConfirmed as any)).toThrow();

      expect(() => cancelledState.confirm(mockCancelled as any)).toThrow();
      expect(() => cancelledState.cancel(mockCancelled as any)).toThrow();
      expect(() => cancelledState.expire(mockCancelled as any)).toThrow();

      expect(() => expiredState.confirm(mockExpired as any)).toThrow();
      expect(() => expiredState.cancel(mockExpired as any)).toThrow();
      expect(() => expiredState.expire(mockExpired as any)).toThrow();
    });

    it("should change state instances on transition", () => {
      const activeState = new ActiveReservationState();
      const mockReservation1 = new MockReservation(activeState);
      const mockReservation2 = new MockReservation(activeState);
      const mockReservation3 = new MockReservation(activeState);

      activeState.confirm(mockReservation1 as any);
      activeState.cancel(mockReservation2 as any);
      activeState.expire(mockReservation3 as any);

      expect(mockReservation1.getState()).not.toBe(activeState);
      expect(mockReservation2.getState()).not.toBe(activeState);
      expect(mockReservation3.getState()).not.toBe(activeState);
    });

    it("should maintain state name consistency", () => {
      const states = [
        new ActiveReservationState(),
        new ConfirmedReservationState(),
        new CancelledReservationState(),
        new ExpiredReservationState(),
      ];

      const names = states.map((s) => s.name);
      expect(names).toEqual(["ACTIVE", "CONFIRMED", "CANCELLED", "EXPIRED"]);
    });

    it("should verify canX methods match transition behavior for ACTIVE", () => {
      const activeState = new ActiveReservationState();
      const mockReservation = new MockReservation(activeState);

      expect(activeState.canConfirm()).toBe(true);
      expect(() => activeState.confirm(mockReservation as any)).not.toThrow();

      const mockReservation2 = new MockReservation(
        new ActiveReservationState(),
      );
      expect(activeState.canCancel()).toBe(true);
      expect(() => activeState.cancel(mockReservation2 as any)).not.toThrow();

      const mockReservation3 = new MockReservation(
        new ActiveReservationState(),
      );
      expect(activeState.canExpire()).toBe(true);
      expect(() => activeState.expire(mockReservation3 as any)).not.toThrow();
    });

    it("should verify canX methods match transition behavior for terminal states", () => {
      const confirmedState = new ConfirmedReservationState();
      const cancelledState = new CancelledReservationState();
      const expiredState = new ExpiredReservationState();

      expect(confirmedState.canConfirm()).toBe(false);
      expect(confirmedState.canCancel()).toBe(false);
      expect(confirmedState.canExpire()).toBe(false);

      expect(cancelledState.canConfirm()).toBe(false);
      expect(cancelledState.canCancel()).toBe(false);
      expect(cancelledState.canExpire()).toBe(false);

      expect(expiredState.canConfirm()).toBe(false);
      expect(expiredState.canCancel()).toBe(false);
      expect(expiredState.canExpire()).toBe(false);
    });
  });
});
