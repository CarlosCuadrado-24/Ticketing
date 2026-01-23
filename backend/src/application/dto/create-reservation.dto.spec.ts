import { validate } from "class-validator";
import {
  CreateReservationDto,
  ProcessPaymentDto,
} from "./create-reservation.dto";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";

describe("CreateReservationDto", () => {
  let dto: CreateReservationDto;

  beforeEach(() => {
    dto = new CreateReservationDto();
  });

  describe("valid data", () => {
    it("should pass validation with all valid fields", async () => {
      dto.eventId = "TICK0001-001";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 2;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with minimum quantity", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.GENERAL;
      dto.quantity = 1;
      dto.buyerEmail = "test@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with maximum quantity", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.EARLY_BIRD;
      dto.quantity = 10;
      dto.buyerEmail = "test@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("eventId validation", () => {
    it("should fail validation with empty eventId", async () => {
      dto.eventId = "";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 2;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("isNotEmpty");
    });

    it("should fail validation with non-string eventId", async () => {
      (dto as any).eventId = 123;
      dto.ticketType = TicketType.VIP;
      dto.quantity = 2;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with missing eventId", async () => {
      dto.ticketType = TicketType.VIP;
      dto.quantity = 2;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
    });
  });

  describe("ticketType validation", () => {
    it("should pass validation with all valid ticket types", async () => {
      const ticketTypes = [
        TicketType.VIP,
        TicketType.GENERAL,
        TicketType.EARLY_BIRD,
      ];

      for (const ticketType of ticketTypes) {
        const testDto = new CreateReservationDto();
        testDto.eventId = "EVENT-123";
        testDto.ticketType = ticketType;
        testDto.quantity = 2;
        testDto.buyerEmail = "buyer@example.com";

        const errors = await validate(testDto);
        expect(errors).toHaveLength(0);
      }
    });

    it("should fail validation with invalid ticket type", async () => {
      dto.eventId = "EVENT-123";
      (dto as any).ticketType = "INVALID_TYPE";
      dto.quantity = 2;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("ticketType");
      expect(errors[0]?.constraints).toHaveProperty("isEnum");
    });

    it("should fail validation with missing ticket type", async () => {
      dto.eventId = "EVENT-123";
      dto.quantity = 2;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("ticketType");
    });
  });

  describe("quantity validation", () => {
    it("should fail validation with quantity 0", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 0;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("quantity");
      expect(errors[0]?.constraints).toHaveProperty("min");
    });

    it("should fail validation with quantity greater than 10", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 11;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("quantity");
      expect(errors[0]?.constraints).toHaveProperty("max");
    });

    it("should fail validation with negative quantity", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = -1;
      dto.buyerEmail = "buyer@example.com";

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

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("quantity");
      expect(errors[0]?.constraints).toHaveProperty("isNumber");
    });

    it("should fail validation with missing quantity", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.buyerEmail = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("quantity");
    });
  });

  describe("buyerEmail validation", () => {
    it("should fail validation with invalid email format", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 2;
      dto.buyerEmail = "invalid-email";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("buyerEmail");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });

    it("should fail validation with empty buyerEmail", async () => {
      dto.eventId = "EVENT-123";
      dto.ticketType = TicketType.VIP;
      dto.quantity = 2;
      dto.buyerEmail = "";

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
      dto.quantity = 2;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("buyerEmail");
    });
  });
});

describe("ProcessPaymentDto", () => {
  let dto: ProcessPaymentDto;

  beforeEach(() => {
    dto = new ProcessPaymentDto();
  });

  describe("valid data", () => {
    it("should pass validation with valid amount and currency", async () => {
      dto.amount = 100.5;
      dto.currency = "COP";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with zero amount", async () => {
      dto.amount = 0;
      dto.currency = "USD";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with large amount", async () => {
      dto.amount = 999999.99;
      dto.currency = "EUR";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("amount validation", () => {
    it("should fail validation with negative amount", async () => {
      dto.amount = -10;
      dto.currency = "COP";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("amount");
      expect(errors[0]?.constraints).toHaveProperty("min");
    });

    it("should fail validation with non-number amount", async () => {
      (dto as any).amount = "hundred";
      dto.currency = "COP";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("amount");
      expect(errors[0]?.constraints).toHaveProperty("isNumber");
    });

    it("should fail validation with missing amount", async () => {
      dto.currency = "COP";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("amount");
    });
  });

  describe("currency validation", () => {
    it("should fail validation with empty currency", async () => {
      dto.amount = 100;
      dto.currency = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("currency");
      expect(errors[0]?.constraints).toHaveProperty("isNotEmpty");
    });

    it("should fail validation with non-string currency", async () => {
      dto.amount = 100;
      (dto as any).currency = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("currency");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with missing currency", async () => {
      dto.amount = 100;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("currency");
    });
  });
});
