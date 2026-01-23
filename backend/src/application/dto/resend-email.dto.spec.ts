import { validate } from "class-validator";
import { ResendEmailDto, SendReminderDto } from "./resend-email.dto";

describe("ResendEmailDto", () => {
  let dto: ResendEmailDto;

  beforeEach(() => {
    dto = new ResendEmailDto();
  });

  describe("valid data", () => {
    it("should pass validation with valid email only", async () => {
      dto.email = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with email and ticketId", async () => {
      dto.email = "buyer@example.com";
      dto.ticketId = "uuid-ticket-123";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with different email formats", async () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user+tag@example.org",
        "123@numbers.com",
      ];

      for (const email of validEmails) {
        const testDto = new ResendEmailDto();
        testDto.email = email;

        const errors = await validate(testDto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe("email validation", () => {
    it("should fail validation with invalid email format", async () => {
      dto.email = "invalid-email";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });

    it("should fail validation with empty email", async () => {
      dto.email = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);

      const emailErrors = errors.filter((error) => error.property === "email");
      expect(emailErrors).toHaveLength(1);

      const constraints = Object.keys(emailErrors[0]?.constraints || {});
      expect(constraints).toContain("isEmail");
      expect(constraints).toContain("isNotEmpty");
    });

    it("should fail validation with missing email", async () => {
      dto.ticketId = "some-ticket-id";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
    });

    it("should fail validation with non-string email", async () => {
      (dto as any).email = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });
  });

  describe("ticketId validation (optional)", () => {
    it("should pass validation without ticketId", async () => {
      dto.email = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with valid ticketId", async () => {
      dto.email = "buyer@example.com";
      dto.ticketId = "ticket-uuid-123";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with non-string ticketId", async () => {
      dto.email = "buyer@example.com";
      (dto as any).ticketId = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("ticketId");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should pass validation with empty string ticketId", async () => {
      dto.email = "buyer@example.com";
      dto.ticketId = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe("SendReminderDto", () => {
  let dto: SendReminderDto;

  beforeEach(() => {
    dto = new SendReminderDto();
  });

  describe("valid data", () => {
    it("should pass validation with valid eventId only", async () => {
      dto.eventId = "TICK0001-001";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with eventId and email", async () => {
      dto.eventId = "EVENT-123";
      dto.email = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("eventId validation", () => {
    it("should fail validation with empty eventId", async () => {
      dto.eventId = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("isNotEmpty");
    });

    it("should fail validation with non-string eventId", async () => {
      (dto as any).eventId = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with missing eventId", async () => {
      dto.email = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
    });
  });

  describe("email validation (optional)", () => {
    it("should pass validation without email", async () => {
      dto.eventId = "EVENT-123";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with valid email", async () => {
      dto.eventId = "EVENT-123";
      dto.email = "buyer@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with invalid email format", async () => {
      dto.eventId = "EVENT-123";
      dto.email = "invalid-email";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });

    it("should pass validation with empty string email", async () => {
      dto.eventId = "EVENT-123";
      dto.email = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });

    it("should fail validation with non-string email", async () => {
      dto.eventId = "EVENT-123";
      (dto as any).email = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });
  });

  describe("multiple validation errors", () => {
    it("should fail validation with multiple invalid fields", async () => {
      dto.eventId = "";
      dto.email = "invalid-email";

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);

      const eventIdError = errors.find((error) => error.property === "eventId");
      const emailError = errors.find((error) => error.property === "email");

      expect(eventIdError).toBeDefined();
      expect(emailError).toBeDefined();
    });
  });
});
