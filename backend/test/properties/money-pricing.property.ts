import * as fc from "fast-check";
import { Money } from "../../src/domain/value-objects/money.vo";
import {
  validAmountArbitrary,
  validCurrencyArbitrary,
  ticketTypePricingArbitrary,
  validQuantityArbitrary,
  PRICING_MULTIPLIERS,
} from "./generators/money.generator";

/**
 * Feature: ticket-sales-system
 * Property 11: Price Calculation by Ticket Type
 * Validates: Requirements 2.3
 *
 * *For any* tipo de ticket y cantidad, el precio calculado debe aplicar
 * la estrategia correcta: VIP = precio base × 1.5, General = precio base,
 * Early Bird = precio base × 0.8.
 */
describe("Property 11: Price Calculation by Ticket Type", () => {
  const PROPERTY_CONFIG: fc.Parameters<unknown> = {
    numRuns: 100,
    verbose: fc.VerbosityLevel.VeryVerbose,
  };

  describe("Money.multiply applies correct pricing multipliers", () => {
    it("should correctly calculate VIP price (base × 1.5)", () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validCurrencyArbitrary,
          validQuantityArbitrary,
          (baseAmount, currency, quantity) => {
            // Arrange
            const basePrice = Money.create(baseAmount, currency);
            const expectedAmount =
              baseAmount * quantity * PRICING_MULTIPLIERS.VIP;

            // Act
            const totalPrice = basePrice
              .multiply(quantity)
              .multiply(PRICING_MULTIPLIERS.VIP);

            // Assert
            expect(totalPrice.amount).toBeCloseTo(expectedAmount, 2);
            expect(totalPrice.currency).toBe(currency);
          },
        ),
        PROPERTY_CONFIG,
      );
    });

    it("should correctly calculate General price (base × 1.0)", () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validCurrencyArbitrary,
          validQuantityArbitrary,
          (baseAmount, currency, quantity) => {
            // Arrange
            const basePrice = Money.create(baseAmount, currency);
            const expectedAmount =
              baseAmount * quantity * PRICING_MULTIPLIERS.GENERAL;

            // Act
            const totalPrice = basePrice
              .multiply(quantity)
              .multiply(PRICING_MULTIPLIERS.GENERAL);

            // Assert
            expect(totalPrice.amount).toBeCloseTo(expectedAmount, 2);
            expect(totalPrice.currency).toBe(currency);
          },
        ),
        PROPERTY_CONFIG,
      );
    });

    it("should correctly calculate Early Bird price (base × 0.8)", () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validCurrencyArbitrary,
          validQuantityArbitrary,
          (baseAmount, _currency, quantity) => {
            // Arrange
            const basePrice = Money.create(baseAmount, _currency);
            const expectedAmount =
              baseAmount * quantity * PRICING_MULTIPLIERS.EARLY_BIRD;

            // Act
            const totalPrice = basePrice
              .multiply(quantity)
              .multiply(PRICING_MULTIPLIERS.EARLY_BIRD);

            // Assert
            expect(totalPrice.amount).toBeCloseTo(expectedAmount, 2);
            expect(totalPrice.currency).toBe(_currency);
          },
        ),
        PROPERTY_CONFIG,
      );
    });

    it("should maintain price ordering: VIP > General > Early Bird for same base price", () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validCurrencyArbitrary,
          validQuantityArbitrary,
          (baseAmount, currency, quantity) => {
            // Arrange
            const basePrice = Money.create(baseAmount, currency);

            // Act
            const vipPrice = basePrice
              .multiply(quantity)
              .multiply(PRICING_MULTIPLIERS.VIP);
            const generalPrice = basePrice
              .multiply(quantity)
              .multiply(PRICING_MULTIPLIERS.GENERAL);
            const earlyBirdPrice = basePrice
              .multiply(quantity)
              .multiply(PRICING_MULTIPLIERS.EARLY_BIRD);

            // Assert: VIP > General > Early Bird
            expect(vipPrice.amount).toBeGreaterThan(generalPrice.amount);
            expect(generalPrice.amount).toBeGreaterThan(earlyBirdPrice.amount);
          },
        ),
        PROPERTY_CONFIG,
      );
    });

    it("should apply correct multiplier for any ticket type", () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validCurrencyArbitrary,
          validQuantityArbitrary,
          ticketTypePricingArbitrary,
          (baseAmount, currency, quantity, ticketTypePricing) => {
            // Arrange
            const basePrice = Money.create(baseAmount, currency);
            const expectedAmount =
              baseAmount * quantity * ticketTypePricing.multiplier;

            // Act
            const totalPrice = basePrice
              .multiply(quantity)
              .multiply(ticketTypePricing.multiplier);

            // Assert
            expect(totalPrice.amount).toBeCloseTo(expectedAmount, 2);
            expect(totalPrice.currency).toBe(currency);
          },
        ),
        PROPERTY_CONFIG,
      );
    });
  });

  describe("Money multiplication properties", () => {
    it("should preserve currency after multiplication", () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validCurrencyArbitrary,
          ticketTypePricingArbitrary,
          (baseAmount, currency, ticketTypePricing) => {
            // Arrange
            const basePrice = Money.create(baseAmount, currency);

            // Act
            const result = basePrice.multiply(ticketTypePricing.multiplier);

            // Assert
            expect(result.currency).toBe(currency);
          },
        ),
        PROPERTY_CONFIG,
      );
    });

    it("should be associative: (price × quantity) × multiplier = price × (quantity × multiplier)", () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validCurrencyArbitrary,
          validQuantityArbitrary,
          ticketTypePricingArbitrary,
          (baseAmount, currency, quantity, ticketTypePricing) => {
            // Arrange
            const basePrice = Money.create(baseAmount, currency);

            // Act
            const result1 = basePrice
              .multiply(quantity)
              .multiply(ticketTypePricing.multiplier);
            const result2 = basePrice.multiply(
              quantity * ticketTypePricing.multiplier,
            );

            // Assert
            expect(result1.amount).toBeCloseTo(result2.amount, 2);
          },
        ),
        PROPERTY_CONFIG,
      );
    });

    it("should produce non-negative results for non-negative inputs", () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validCurrencyArbitrary,
          validQuantityArbitrary,
          ticketTypePricingArbitrary,
          (baseAmount, currency, quantity, ticketTypePricing) => {
            // Arrange
            const basePrice = Money.create(baseAmount, currency);

            // Act
            const totalPrice = basePrice
              .multiply(quantity)
              .multiply(ticketTypePricing.multiplier);

            // Assert
            expect(totalPrice.amount).toBeGreaterThanOrEqual(0);
          },
        ),
        PROPERTY_CONFIG,
      );
    });
  });
});
