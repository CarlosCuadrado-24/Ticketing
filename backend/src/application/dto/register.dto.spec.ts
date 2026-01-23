import { validate } from "class-validator";
import { RegisterDto } from "./register.dto";

describe("RegisterDto", () => {
  let dto: RegisterDto;

  beforeEach(() => {
    dto = new RegisterDto();
  });

  describe("valid data", () => {
    it("should pass validation with all valid fields", async () => {
      dto.email = "user@example.com";
      dto.password = "password123";
      dto.firstName = "John";
      dto.lastName = "Doe";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("email validation", () => {
    it("should fail validation with invalid email format", async () => {
      dto.email = "invalid-email";
      dto.password = "password123";
      dto.firstName = "John";
      dto.lastName = "Doe";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
      expect(errors[0]?.constraints).toHaveProperty("isEmail");
    });

    it("should fail validation with empty email", async () => {
      dto.password = "password123";
      dto.firstName = "John";
      dto.lastName = "Doe";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("email");
    });
  });

  describe("password validation", () => {
    it("should fail validation with password shorter than 8 characters", async () => {
      dto.email = "user@example.com";
      dto.password = "short";
      dto.firstName = "John";
      dto.lastName = "Doe";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("password");
      expect(errors[0]?.constraints).toHaveProperty("minLength");
    });

    it("should fail validation with non-string password", async () => {
      dto.email = "user@example.com";
      (dto as any).password = 123456789;
      dto.firstName = "John";
      dto.lastName = "Doe";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("password");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });
  });

  describe("firstName validation", () => {
    it("should fail validation with empty firstName", async () => {
      dto.email = "user@example.com";
      dto.password = "password123";
      dto.firstName = "";
      dto.lastName = "Doe";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("firstName");
      expect(errors[0]?.constraints).toHaveProperty("minLength");
    });

    it("should fail validation with non-string firstName", async () => {
      dto.email = "user@example.com";
      dto.password = "password123";
      (dto as any).firstName = 123;
      dto.lastName = "Doe";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("firstName");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with missing firstName", async () => {
      dto.email = "user@example.com";
      dto.password = "password123";
      dto.lastName = "Doe";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("firstName");
    });
  });

  describe("lastName validation", () => {
    it("should fail validation with empty lastName", async () => {
      dto.email = "user@example.com";
      dto.password = "password123";
      dto.firstName = "John";
      dto.lastName = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("lastName");
      expect(errors[0]?.constraints).toHaveProperty("minLength");
    });

    it("should fail validation with non-string lastName", async () => {
      dto.email = "user@example.com";
      dto.password = "password123";
      dto.firstName = "John";
      (dto as any).lastName = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("lastName");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with missing lastName", async () => {
      dto.email = "user@example.com";
      dto.password = "password123";
      dto.firstName = "John";

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("lastName");
    });
  });

  describe("multiple validation errors", () => {
    it("should fail validation with multiple invalid fields", async () => {
      dto.email = "invalid-email";
      dto.password = "short";
      dto.firstName = "";
      dto.lastName = "";

      const errors = await validate(dto);
      expect(errors).toHaveLength(4);

      const properties = errors.map((error) => error.property);
      expect(properties).toContain("email");
      expect(properties).toContain("password");
      expect(properties).toContain("firstName");
      expect(properties).toContain("lastName");
    });
  });
});
