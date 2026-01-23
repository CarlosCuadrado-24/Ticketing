import "reflect-metadata";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { ExecutionContext } from "@nestjs/common";
import { Request } from "express";

describe("OptionalJwtAuthGuard", () => {
  let guard: OptionalJwtAuthGuard;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: jest.fn(),
    } as any;

    mockRequest = {
      headers: {},
      cookies: {},
    };

    const mockHttpArgumentsHost = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
    } as any;

    guard = new OptionalJwtAuthGuard(mockJwtService);
  });

  describe("canActivate", () => {
    it("should return true when valid token is provided in Authorization header", async () => {
      const mockPayload = {
        sub: "user-id",
        email: "test@example.com",
        role: "BUYER",
      };

      mockRequest.headers = {
        authorization: "Bearer valid-token",
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("valid-token", {
        secret: "your-secret-key",
      });
      expect((mockRequest as any).user).toEqual({
        id: "user-id",
        email: "test@example.com",
        role: "BUYER",
      });
    });

    it("should return true when valid token is provided in cookie", async () => {
      const mockPayload = {
        sub: "user-id",
        email: "test@example.com",
        role: "ADMIN",
      };

      mockRequest.cookies = {
        accessToken: "cookie-token",
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("cookie-token", {
        secret: "your-secret-key",
      });
      expect((mockRequest as any).user).toEqual({
        id: "user-id",
        email: "test@example.com",
        role: "ADMIN",
      });
    });

    it("should return true when no token is provided (optional auth)", async () => {
      mockRequest.headers = {};
      mockRequest.cookies = {};

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect((mockRequest as any).user).toBeUndefined();
    });

    it("should return true when token contains Postman placeholders (graceful degradation)", async () => {
      mockRequest.headers = {
        authorization: "Bearer {{accessToken}}",
      };

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect((mockRequest as any).user).toBeUndefined();
    });

    it("should return true when token verification fails (graceful degradation)", async () => {
      mockRequest.headers = {
        authorization: "Bearer invalid-token",
      };
      mockJwtService.verifyAsync.mockRejectedValue(new Error("Invalid token"));

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect((mockRequest as any).user).toBeUndefined();
    });

    it("should prioritize Authorization header over cookie", async () => {
      const mockPayload = {
        sub: "user-id",
        email: "test@example.com",
        role: "BUYER",
      };

      mockRequest.headers = {
        authorization: "Bearer header-token",
      };
      mockRequest.cookies = {
        accessToken: "cookie-token",
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await guard.canActivate(mockExecutionContext);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("header-token", {
        secret: "your-secret-key",
      });
    });

    it("should handle malformed Authorization header gracefully", async () => {
      mockRequest.headers = {
        authorization: "InvalidFormat",
      };

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect((mockRequest as any).user).toBeUndefined();
    });

    it("should handle empty Authorization header gracefully", async () => {
      mockRequest.headers = {
        authorization: "",
      };

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect((mockRequest as any).user).toBeUndefined();
    });

    it("should handle Authorization header with wrong type gracefully", async () => {
      mockRequest.headers = {
        authorization: "Basic dGVzdDp0ZXN0",
      };

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect((mockRequest as any).user).toBeUndefined();
    });

    it("should handle JWT verification with expired token gracefully", async () => {
      mockRequest.headers = {
        authorization: "Bearer expired-token",
      };
      mockJwtService.verifyAsync.mockRejectedValue(new Error("Token expired"));

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect((mockRequest as any).user).toBeUndefined();
    });

    it("should use JWT_SECRET from environment variable", async () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "custom-secret";

      const customGuard = new OptionalJwtAuthGuard(mockJwtService);
      const mockPayload = {
        sub: "user-id",
        email: "test@example.com",
        role: "BUYER",
      };

      mockRequest.headers = {
        authorization: "Bearer valid-token",
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await customGuard.canActivate(mockExecutionContext);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("valid-token", {
        secret: "custom-secret",
      });

      // Restore original environment
      process.env.JWT_SECRET = originalEnv;
    });

    it("should handle multiple Postman placeholder formats", async () => {
      const testCases = [
        "Bearer {{token}}",
        "Bearer {{accessToken}}",
        "Bearer {{jwt_token}}",
        "Bearer {{authToken}}",
      ];

      for (const authHeader of testCases) {
        mockRequest.headers = {
          authorization: authHeader,
        };

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect((mockRequest as any).user).toBeUndefined();
      }
    });
  });

  describe("token extraction", () => {
    it("should extract token from Bearer authorization header", async () => {
      const mockPayload = {
        sub: "user-id",
        email: "test@example.com",
        role: "BUYER",
      };
      mockRequest.headers = {
        authorization: "Bearer my-token-123",
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await guard.canActivate(mockExecutionContext);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("my-token-123", {
        secret: process.env.JWT_SECRET ?? "your-secret-key",
      });
    });

    it("should extract token from accessToken cookie when no header", async () => {
      const mockPayload = {
        sub: "user-id",
        email: "test@example.com",
        role: "BUYER",
      };
      mockRequest.headers = {};
      mockRequest.cookies = {
        accessToken: "cookie-token-456",
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await guard.canActivate(mockExecutionContext);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        "cookie-token-456",
        {
          secret: process.env.JWT_SECRET ?? "your-secret-key",
        },
      );
    });

    it("should not attempt token extraction when both header and cookie are missing", async () => {
      mockRequest.headers = {};
      mockRequest.cookies = {};

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });
});
