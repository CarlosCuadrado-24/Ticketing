import { Injectable } from '@angular/core';
import { STORAGE_KEYS } from '../../config/storage.constants';

/**
 * Token Management Service
 * Handles storage and retrieval of authentication tokens
 * Extracted from AuthService to follow Single Responsibility Principle
 */
@Injectable({
  providedIn: 'root'
})
export class TokenService {
  
  /**
   * Store access token in sessionStorage
   */
  setAccessToken(token: string): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (error) {
      console.error('[TokenService] Error storing access token:', error);
    }
  }

  /**
   * Get access token from sessionStorage
   */
  getAccessToken(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('[TokenService] Error retrieving access token:', error);
      return null;
    }
  }

  /**
   * Store refresh token in sessionStorage
   */
  setRefreshToken(token: string): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    } catch (error) {
      console.error('[TokenService] Error storing refresh token:', error);
    }
  }

  /**
   * Get refresh token from sessionStorage
   */
  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('[TokenService] Error retrieving refresh token:', error);
      return null;
    }
  }

  /**
   * Clear all tokens from storage
   */
  clearTokens(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('[TokenService] Error clearing tokens:', error);
    }
  }

  /**
   * Check if access token exists
   */
  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Check if refresh token exists
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * Check if token is expired (basic check based on JWT structure)
   * Note: This is a simple check, for production use a proper JWT library
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeTokenPayload(token);
      if (!payload.exp) return false;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.error('[TokenService] Error checking token expiration:', error);
      return true; // Assume expired if we can't decode
    }
  }

  /**
   * Decode JWT token payload (without verification)
   * Note: This is for client-side convenience only, server must always verify
   */
  private decodeTokenPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Failed to decode token payload');
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const payload = this.decodeTokenPayload(token);
      if (!payload.exp) return null;
      
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('[TokenService] Error getting token expiration:', error);
      return null;
    }
  }

  /**
   * Get user info from token payload
   */
  getUserFromToken(token: string): any {
    try {
      const payload = this.decodeTokenPayload(token);
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
        lastName: payload.lastName
      };
    } catch (error) {
      console.error('[TokenService] Error extracting user from token:', error);
      return null;
    }
  }
}