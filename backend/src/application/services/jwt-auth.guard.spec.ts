import "reflect-metadata";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
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

    guard = new JwtAuthGuard(mockJwtService);
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

    it("should throw UnauthorizedException when no token is provided", async () => {
      mockRequest.headers = {};
      mockRequest.cookies = {};

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException("No token provided"),
      );
    });

    it("should throw UnauthorizedException when token contains Postman placeholders", async () => {
      mockRequest.headers = {
        authorization: "Bearer {{accessToken}}",
      };

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException(
          "Token contains unresolved variable. Please login first to get a valid token.",
        ),
      );
    });

    it("should throw UnauthorizedException when token verification fails", async () => {
      mockRequest.headers = {
        authorization: "Bearer invalid-token",
      };
      mockJwtService.verifyAsync.mockRejectedValue(new Error("Invalid token"));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException("Invalid token"),
      );
    });

    it("should handle malformed Authorization header", async () => {
      mockRequest.headers = {
        authorization: "InvalidFormat",
      };

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException("No token provided"),
      );
    });

    it("should handle empty Authorization header", async () => {
      mockRequest.headers = {
        authorization: "",
      };

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException("No token provided"),
      );
    });

    it("should handle Authorization header with wrong type", async () => {
      mockRequest.headers = {
        authorization: "Basic dGVzdDp0ZXN0",
      };

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException("No token provided"),
      );
    });

    it("should handle JWT verification with expired token", async () => {
      mockRequest.headers = {
        authorization: "Bearer expired-token",
      };
      mockJwtService.verifyAsync.mockRejectedValue(new Error("Token expired"));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException("Invalid token"),
      );
    });

    it("should use JWT_SECRET from environment variable", async () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "custom-secret";

      const customGuard = new JwtAuthGuard(mockJwtService);
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
  });
});
