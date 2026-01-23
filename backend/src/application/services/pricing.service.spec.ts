import "reflect-metadata";
import { PricingService } from "./pricing.service";
import { Money } from "../../domain/value-objects/money.vo";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";

describe("PricingService", () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  describe("calculatePrice", () => {
    it("should calculate VIP ticket price with 1.5x multiplier", () => {
      const basePrice = Money.create(100, "COP");
      const quantity = 2;

      const result = service.calculatePrice(
        TicketType.VIP,
        basePrice,
        quantity,
      );

      expect(result.amount).toBe(300); // 100 * 2 * 1.5
      expect(result.currency).toBe("COP");
    });

    it("should calculate GENERAL ticket price with 1.0x multiplier", () => {
      const basePrice = Money.create(100, "COP");
      const quantity = 3;

      const result = service.calculatePrice(
        TicketType.GENERAL,
        basePrice,
        quantity,
      );

      expect(result.amount).toBe(300); // 100 * 3 * 1.0
      expect(result.currency).toBe("COP");
    });

    it("should calculate EARLY_BIRD ticket price with 0.8x multiplier", () => {
      const basePrice = Money.create(100, "COP");
      const quantity = 2;

      const result = service.calculatePrice(
        TicketType.EARLY_BIRD,
        basePrice,
        quantity,
      );

      expect(result.amount).toBe(160); // 100 * 2 * 0.8
      expect(result.currency).toBe("COP");
    });

    it("should handle single ticket purchase", () => {
      const basePrice = Money.create(50, "USD");
      const quantity = 1;

      const result = service.calculatePrice(
        TicketType.VIP,
        basePrice,
        quantity,
      );

      expect(result.amount).toBe(75); // 50 * 1 * 1.5
      expect(result.currency).toBe("USD");
    });

    it("should handle large quantities", () => {
      const basePrice = Money.create(25, "EUR");
      const quantity = 10;

      const result = service.calculatePrice(
        TicketType.GENERAL,
        basePrice,
        quantity,
      );

      expect(result.amount).toBe(250); // 25 * 10 * 1.0
      expect(result.currency).toBe("EUR");
    });

    it("should handle zero quantity", () => {
      const basePrice = Money.create(100, "COP");
      const quantity = 0;

      const result = service.calculatePrice(
        TicketType.VIP,
        basePrice,
        quantity,
      );

      expect(result.amount).toBe(0); // 100 * 0 * 1.5
      expect(result.currency).toBe("COP");
    });

    it("should preserve currency from base price", () => {
      const basePrice = Money.create(200, "GBP");
      const quantity = 1;

      const result = service.calculatePrice(
        TicketType.EARLY_BIRD,
        basePrice,
        quantity,
      );

      expect(result.amount).toBe(160); // 200 * 1 * 0.8
      expect(result.currency).toBe("GBP");
    });

    it("should throw error for invalid ticket type", () => {
      const basePrice = Money.create(100, "COP");
      const quantity = 1;
      const invalidTicketType = "INVALID" as TicketType;

      expect(() => {
        service.calculatePrice(invalidTicketType, basePrice, quantity);
      }).toThrow("No pricing strategy found for ticket type: INVALID");
    });
  });

  describe("edge cases", () => {
    it("should handle decimal base prices", () => {
      const basePrice = Money.create(99.99, "USD");
      const quantity = 2;

      const result = service.calculatePrice(
        TicketType.VIP,
        basePrice,
        quantity,
      );

      expect(result.amount).toBeCloseTo(299.97, 2); // 99.99 * 2 * 1.5
      expect(result.currency).toBe("USD");
    });

    it("should handle fractional results from early bird discount", () => {
      const basePrice = Money.create(125, "COP");
      const quantity = 1;

      const result = service.calculatePrice(
        TicketType.EARLY_BIRD,
        basePrice,
        quantity,
      );

      expect(result.amount).toBe(100); // 125 * 1 * 0.8
      expect(result.currency).toBe("COP");
    });
  });
});
