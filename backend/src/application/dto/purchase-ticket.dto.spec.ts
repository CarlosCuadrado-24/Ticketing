import { validate } from "class-validator";
import { PurchaseTicketDto } from "./purchase-ticket.dto";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";

describe("PurchaseTicketDto", () => {
  let dto: PurchaseTicketDto;

  beforeEach(() => {
    dto = new PurchaseTicketDto();
  });

  describe("valid data", () => {
    it("should pass validation with all valid fields", async () => {
      dto.eventId = "TICK0001-001";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 2;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with different ticket type", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.GENERAL;
      dto.quantity = 1;
      dto.buyerEmail = "test@example.com";
      dto.paymentInfo = {
        cardNumber: "4111111111111111",
        expiryDate: "06/26",
        cvv: "456",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("eventId validation", () => {
    it("should fail validation with empty eventId", async () => {
      dto.eventId = "";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("isNotEmpty");
    });

    it("should fail validation with non-string eventId", async () => {
      (dto as any).eventId = 123;
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with missing eventId", async () => {
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
    });
  });

  describe("ticketType validation", () => {
    it("should pass validation with VIP ticket type", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with GENERAL ticket type", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.GENERAL;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with EARLY_BIRD ticket type", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.EARLY_BIRD;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with invalid ticket type", async () => {
      dto.eventId = "EVENT-123";
      (dto as any).ticketType = "INVALID_TYPE";
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("ticketType");
      expect(errors[0]?.constraints).toHaveProperty("isEnum");
    });

    it("should fail validation with missing ticket type", async () => {
      dto.eventId = "EVENT-123";
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("ticketType");
    });
  });

  describe("quantity validation", () => {
    it("should pass validation with quantity 1", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with large quantity", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 100;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with quantity 0", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 0;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("quantity");
      expect(errors[0]?.constraints).toHaveProperty("min");
    });

    it("should fail validation with negative quantity", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = -1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("quantity");
      expect(errors[0]?.constraints).toHaveProperty("min");
    });

    it("should fail validation with non-number quantity", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      (dto as any).quantity = "two";
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("quantity");
      expect(errors[0]?.constraints).toHaveProperty("isNumber");
    });

    it("should fail validation with missing quantity", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("quantity");
    });
  });

  describe("buyerEmail validation", () => {
    it("should fail validation with invalid email format", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "invalid-email";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("buyerEmail");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });

    it("should fail validation with empty buyerEmail", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);

      const emailErrors = errors.filter(
        (error) => error.property === "buyerEmail",
      );
      expect(emailErrors).toHaveLength(1);

      const constraints = Object.keys(emailErrors[0]?.constraints || {});
      expect(constraints).toContain("isEmail");
      expect(constraints).toContain("isNotEmpty");
    });

    it("should fail validation with missing buyerEmail", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("buyerEmail");
    });
  });

  describe("paymentInfo validation", () => {
    it("should fail validation with missing paymentInfo", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("paymentInfo");
      expect(errors[0]?.constraints).toHaveProperty("isNotEmpty");
    });

    it("should fail validation with null paymentInfo", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      (dto as any).paymentInfo = null;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("paymentInfo");
      expect(errors[0]?.constraints).toHaveProperty("isNotEmpty");
    });

    it("should pass validation with valid paymentInfo object", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 1;
      dto.buyerEmail = "buyer@example.com";
      dto.paymentInfo = {
        cardNumber: "4242424242424242",
        expiryDate: "12/25",
        cvv: "123",
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("multiple validation errors", () => {
    it("should fail validation with multiple invalid fields", async () => {
      dto.eventId = "";
      (dto as any).ticketType = "INVALID";
      dto.quantity = -1;
      dto.buyerEmail = "invalid-email";

      const errors = await validate(dto);
      expect(errors).toHaveLength(5);

      const properties = errors.map((error) => error.property);
      expect(properties).toContain("eventId");
      expect(properties).toContain("ticketType");
      expect(properties).toContain("quantity");
      expect(properties).toContain("buyerEmail");
      expect(properties).toContain("paymentInfo");
    });
  });
});
