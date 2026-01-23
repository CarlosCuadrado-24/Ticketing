import { validate } from "class-validator";
import { LoginDto } from "./login.dto";

describe("LoginDto", () => {
  let dto: LoginDto;

  beforeEach(() => {
    dto = new LoginDto();
  });

  describe("valid data", () => {
    it("should pass validation with valid email and password", async () => {
      dto.email = "user@example.com";
      dto.password = "password123";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("email validation", () => {
    it("should fail validation with invalid email format", async () => {
      dto.email = "invalid-email";
      dto.password = "password123";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });

    it("should fail validation with empty email", async () => {
      dto.password = "password123";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
    });
  });

  describe("password validation", () => {
    it("should fail validation with password shorter than 8 characters", async () => {
      dto.email = "user@example.com";
      dto.password = "short";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("password");
      expect(errors[0]?.constraints).toHaveProperty("minLength");
    });

    it("should fail validation with non-string password", async () => {
      dto.email = "user@example.com";
      (dto as any).password = 123456789;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("password");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with empty password", async () => {
      dto.email = "user@example.com";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("password");
    });
  });

  describe("multiple validation errors", () => {
    it("should fail validation with multiple invalid fields", async () => {
      dto.email = "invalid-email";
      dto.password = "short";

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);

      const emailError = errors.find((error) => error.property === "email");
      const passwordError = errors.find(
        (error) => error.property === "password",
      );

      expect(emailError).toBeDefined();
      expect(passwordError).toBeDefined();
    });
  });
});
