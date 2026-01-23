import { validate } from "class-validator";
import { ValidateQRDto } from "./validate-qr.dto";

describe("ValidateQRDto", () => {
  let dto: ValidateQRDto;

  beforeEach(() => {
    dto = new ValidateQRDto();
  });

  describe("valid data", () => {
    it("should pass validation with valid UUID and event ID", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";
      dto.eventId = "TICK0009-001";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with different valid UUID and event ID", async () => {
      dto.qrToken = "550e8400-e29b-41d4-a716-446655440000";
      dto.eventId = "TICK0009-999";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("qrToken validation", () => {
    it("should fail validation with invalid UUID format", async () => {
      dto.qrToken = "invalid-uuid";
      dto.eventId = "TICK0009-001";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("qrToken");
      expect(errors[0]?.constraints).toHaveProperty("isUuid");
    });

    it("should fail validation with empty qrToken", async () => {
      dto.qrToken = "";
      dto.eventId = "TICK0009-001";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);

      const qrTokenErrors = errors.filter(
        (error) => error.property === "qrToken",
      );
      expect(qrTokenErrors).toHaveLength(1);

      const constraints = Object.keys(qrTokenErrors[0]?.constraints || {});
      expect(constraints).toContain("isUuid");
      expect(constraints).toContain("isNotEmpty");
    });

    it("should fail validation with missing qrToken", async () => {
      dto.eventId = "TICK0009-001";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("qrToken");
    });

    it("should fail validation with non-string qrToken", async () => {
      (dto as any).qrToken = 123456;
      dto.eventId = "TICK0009-001";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("qrToken");
      expect(errors[0]?.constraints).toHaveProperty("isUuid");
    });
  });

  describe("eventId validation", () => {
    it("should fail validation with invalid event ID format", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";
      dto.eventId = "INVALID-001";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("matches");
      expect(errors[0]?.constraints?.matches).toContain("TICK0009-XXX");
    });

    it("should fail validation with wrong prefix", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";
      dto.eventId = "TICK0008-001";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("matches");
    });

    it("should fail validation with wrong number format", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";
      dto.eventId = "TICK0009-1";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("matches");
    });

    it("should fail validation with four digits", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";
      dto.eventId = "TICK0009-1234";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
      expect(errors[0]?.constraints).toHaveProperty("matches");
    });

    it("should fail validation with empty eventId", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";
      dto.eventId = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);

      const eventIdErrors = errors.filter(
        (error) => error.property === "eventId",
      );
      expect(eventIdErrors).toHaveLength(1);

      const constraints = Object.keys(eventIdErrors[0]?.constraints || {});
      expect(constraints).toContain("matches");
      expect(constraints).toContain("isNotEmpty");
    });

    it("should fail validation with missing eventId", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("eventId");
    });
  });

  describe("multiple validation errors", () => {
    it("should fail validation with multiple invalid fields", async () => {
      dto.qrToken = "invalid-uuid";
      dto.eventId = "invalid-event-id";

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);

      const qrTokenError = errors.find((error) => error.property === "qrToken");
      const eventIdError = errors.find((error) => error.property === "eventId");

      expect(qrTokenError).toBeDefined();
      expect(eventIdError).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should pass validation with minimum valid event ID", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";
      dto.eventId = "TICK0009-000";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with maximum valid event ID", async () => {
      dto.qrToken = "123e4567-e89b-12d3-a456-426614174000";
      dto.eventId = "TICK0009-999";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
