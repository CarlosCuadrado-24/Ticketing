// Utiliza variable de entorno para la contraseña de test
const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestPassword123";
import { User } from "./user.entity";
import { Email } from "../value-objects/email.vo";
import { UserRole } from "../enums/user-role.enum";

describe("User Entity", () => {
  describe("constructor", () => {
    it("should create User with valid data", () => {
      const email = Email.create("user@example.com");
      const password = TEST_PASSWORD;

      const user = new User(
        "user-123",
        email,
        password,
        "John",
        "Doe",
        UserRole.BUYER,
      );

      expect(user.id).toBe("user-123");
      expect(user.email).toEqual(email);
      expect(user.firstName).toBe("John");
      expect(user.lastName).toBe("Doe");
      expect(user.role).toBe(UserRole.BUYER);
    });
  });

  describe("hashPassword", () => {
    it("should hash password correctly", async () => {
      const email = Email.create("user@example.com");
      const password = TEST_PASSWORD;

      const user = new User(
        "user-123",
        email,
        password,
        "John",
        "Doe",
        UserRole.BUYER,
      );

      const hashedPassword = await user.hashPassword(password);

      // Hashed password should be different from original
      expect(hashedPassword).not.toBe(password);
      // Hashed password should be a string
      expect(typeof hashedPassword).toBe("string");
      // Hashed password should have reasonable length (bcrypt hashes are typically 60 chars)
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it("should produce different hashes for the same password", async () => {
      const email = Email.create("user@example.com");
      const password = TEST_PASSWORD;

      const user = new User(
        "user-123",
        email,
        password,
        "John",
        "Doe",
        UserRole.BUYER,
      );

      const hash1 = await user.hashPassword(password);
      const hash2 = await user.hashPassword(password);

      // Bcrypt produces different hashes due to salt
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should return true when password is correct", async () => {
      const email = Email.create("user@example.com");
      const password = TEST_PASSWORD;

      const user = new User(
        "user-123",
        email,
        password,
        "John",
        "Doe",
        UserRole.BUYER,
      );

      const hashedPassword = await user.hashPassword(password);
      const isValid = await user.verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it("should return false when password is incorrect", async () => {
      const email = Email.create("user@example.com");
      const password = TEST_PASSWORD;
      const wrongPassword =
        process.env.TEST_WRONG_PASSWORD || "WrongPassword123";

      const user = new User(
        "user-123",
        email,
        password,
        "John",
        "Doe",
        UserRole.BUYER,
      );

      const hashedPassword = await user.hashPassword(password);
      const isValid = await user.verifyPassword(wrongPassword, hashedPassword);

      expect(isValid).toBe(false);
    });

    it("should return false when comparing with empty password", async () => {
      const email = Email.create("user@example.com");
      const password = TEST_PASSWORD;

      const user = new User(
        "user-123",
        email,
        password,
        "John",
        "Doe",
        UserRole.BUYER,
      );

      const hashedPassword = await user.hashPassword(password);
      const isValid = await user.verifyPassword("", hashedPassword);

      expect(isValid).toBe(false);
    });
  });

  describe("integration tests", () => {
    it("should hash and verify password correctly in sequence", async () => {
      const email = Email.create("user@example.com");
      const password = TEST_PASSWORD;

      const user = new User(
        "user-123",
        email,
        password,
        "John",
        "Doe",
        UserRole.BUYER,
      );

      // Hash the password
      const hashedPassword = await user.hashPassword(password);

      // Verify correct password
      const correctVerification = await user.verifyPassword(
        password,
        hashedPassword,
      );
      expect(correctVerification).toBe(true);

      // Verify incorrect password
      const incorrectVerification = await user.verifyPassword(
        "WrongPassword",
        hashedPassword,
      );
      expect(incorrectVerification).toBe(false);
    });
  });
});
