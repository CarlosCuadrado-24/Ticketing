import { validate } from "class-validator";
import { RefreshTokenDto } from "./refresh-token.dto";

describe("RefreshTokenDto", () => {
  let dto: RefreshTokenDto;

  beforeEach(() => {
    dto = new RefreshTokenDto();
  });

  describe("valid data", () => {
    it("should pass validation with valid refresh token", async () => {
      dto.refreshToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with any string token", async () => {
      dto.refreshToken = "simple-token-string";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("refreshToken validation", () => {
    it("should fail validation with non-string refreshToken", async () => {
      (dto as any).refreshToken = 123456;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("refreshToken");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with missing refreshToken", async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("refreshToken");
    });

    it("should fail validation with null refreshToken", async () => {
      (dto as any).refreshToken = null;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("refreshToken");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with undefined refreshToken", async () => {
      (dto as any).refreshToken = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("refreshToken");
    });

    it("should pass validation with empty string refreshToken", async () => {
      dto.refreshToken = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
