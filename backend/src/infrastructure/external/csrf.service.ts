import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

/**
 * CSRF Service
 * Generates and validates CSRF tokens to prevent Cross-Site Request Forgery attacks
 *
 * Security: A01:2021 - Broken Access Control (CSRF Protection)
 */
@Injectable()
export class CsrfService {
  // Store tokens in memory (in production, use Redis or similar)
  private tokens: Map<string, { createdAt: number; expiresAt: number }> =
    new Map();
  private readonly TOKEN_EXPIRATION = 1 * 60 * 60 * 1000; // 1 hour

  /**
   * Generate a new CSRF token
   * @returns CSRF token string
   */
  generateToken(): string {
    // Generate random token
    const token = randomBytes(32).toString("hex");

    // Store token with expiration
    const now = Date.now();
    this.tokens.set(token, {
      createdAt: now,
      expiresAt: now + this.TOKEN_EXPIRATION,
    });

    // Cleanup old tokens (every 100 token generations)
    if (this.tokens.size % 100 === 0) {
      this.cleanupExpiredTokens();
    }

    return token;
  }

  /**
   * Validate CSRF token
   * @param token - Token to validate
   * @returns true if token is valid, false otherwise
   */
  validateToken(token: string): boolean {
    if (!token) {
      return false;
    }

    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return false;
    }

    // Check if token has expired
    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(token);
      return false;
    }

    // Token is valid, delete it (one-time use)
    this.tokens.delete(token);
    return true;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    const expiredTokens: string[] = [];

    this.tokens.forEach((value, key) => {
      if (now > value.expiresAt) {
        expiredTokens.push(key);
      }
    });

    expiredTokens.forEach((token) => {
      this.tokens.delete(token);
    });
  }
}
