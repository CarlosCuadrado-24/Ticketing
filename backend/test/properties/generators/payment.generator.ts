import * as fc from "fast-check";
import { Money } from "../../../src/domain/value-objects/money.vo";
import { TicketType } from "../../../src/domain/value-objects/ticket-type.vo";
import { Email } from "../../../src/domain/value-objects/email.vo";
import { TicketQuantity } from "../../../src/domain/value-objects/ticket-quantity.vo";
import { Reservation } from "../../../src/domain/entities/reservation.entity";

/**
 * Generator for valid money amounts (positive numbers)
 */
export const moneyAmountArbitrary = fc.integer({ min: 1000, max: 1000000 });

/**
 * Generator for currency codes (3-letter codes)
 */
export const currencyArbitrary = fc.constantFrom("USD", "COP", "EUR", "MXN");

/**
 * Generator for ticket types
 */
export const ticketTypeArbitrary = fc.constantFrom(
  TicketType.VIP,
  TicketType.GENERAL,
  TicketType.EARLY_BIRD,
);

/**
 * Generator for ticket quantities (1-10)
 */
export const ticketQuantityArbitrary = fc.integer({ min: 1, max: 10 });

/**
 * Generator for valid email addresses
 */
export const emailArbitrary = fc
  .tuple(fc.emailAddress())
  .map(([email]) => email);

/**
 * Generator for Money value objects
 */
export const moneyArbitrary = fc
  .tuple(moneyAmountArbitrary, currencyArbitrary)
  .map(([amount, currency]) => Money.create(amount, currency));

/**
 * Generator for Email value objects
 */
export const emailVOArbitrary = emailArbitrary.map((email) =>
  Email.create(email),
);

/**
 * Generator for TicketQuantity value objects
 */
export const ticketQuantityVOArbitrary = ticketQuantityArbitrary.map(
  (quantity) => TicketQuantity.create(quantity),
);

/**
 * Generator for valid reservation data
 */
export const validReservationArbitrary = fc.record({
  id: fc.uuid(),
  eventId: fc.uuid(),
  ticketType: ticketTypeArbitrary,
  quantity: ticketQuantityVOArbitrary,
  buyerEmail: emailVOArbitrary,
  totalAmount: moneyArbitrary,
  expiresAt: fc.date({ min: new Date() }),
});

/**
 * Generator for payment scenarios with matching amounts
 */
export const matchingPaymentArbitrary = fc
  .tuple(moneyArbitrary, currencyArbitrary)
  .map(([money, _currency]) => ({
    amount: money.amount,
    currency: money.currency,
    expectedMatch: true,
  }));

/**
 * Generator for payment scenarios with mismatched amounts
 */
export const mismatchedPaymentArbitrary = fc
  .tuple(moneyAmountArbitrary, moneyAmountArbitrary, currencyArbitrary)
  .filter(([amount1, amount2]) => amount1 !== amount2)
  .map(([reservationAmount, paymentAmount, currency]) => ({
    reservationAmount,
    paymentAmount,
    currency,
    expectedMatch: false,
  }));

/**
 * Generator for payment result scenarios
 */
export const paymentResultArbitrary = fc.oneof(
  fc.record({
    success: fc.constant(true),
    transactionId: fc.hexaString({ minLength: 10, maxLength: 50 }),
    processedAt: fc.date(),
  }),
  fc.record({
    success: fc.constant(false),
    errorCode: fc.constantFrom(
      "CARD_DECLINED",
      "INSUFFICIENT_FUNDS",
      "INVALID_CARD",
      "NETWORK_ERROR",
    ),
    errorMessage: fc.string({ minLength: 5, maxLength: 100 }),
  }),
);

/**
 * Helper to create a reservation with specific amount
 */
export function createReservationWithAmount(
  amount: number,
  currency: string,
  ticketType: TicketType = TicketType.VIP,
  quantity: number = 1,
): Reservation {
  return new Reservation(
    fc.sample(fc.uuid(), 1)[0] as string,
    fc.sample(fc.uuid(), 1)[0] as string,
    ticketType,
    TicketQuantity.create(quantity),
    Email.create("test@example.com"),
    Money.create(amount, currency),
    new Date(Date.now() + 15 * 60 * 1000),
  );
}
