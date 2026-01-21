import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../config/api.constants';

/**
 * CSRF Token Service
 * Handles CSRF token retrieval and caching
 * Extracted from AuthService to follow Single Responsibility Principle
 */
@Injectable({
  providedIn: 'root'
})
export class CsrfService {
  private readonly http = inject(HttpClient);
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly TOKEN_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Get CSRF token with caching
   * Returns cached token if still valid, otherwise fetches new one
   */
  getToken(): Observable<string> {
    const now = Date.now();
    
    // Return cached token if still valid
    if (this.cachedToken && now < this.tokenExpiry) {
      return of(this.cachedToken);
    }

    // Fetch new token
    return this.fetchToken().pipe(
      tap(token => {
        this.cachedToken = token;
        this.tokenExpiry = now + this.TOKEN_CACHE_DURATION;
      }),
      catchError(error => {
        console.error('[CsrfService] Error fetching CSRF token:', error);
        this.clearCache();
        throw error;
      })
    );
  }

  /**
   * Force refresh of CSRF token
   */
  refreshToken(): Observable<string> {
    this.clearCache();
    return this.getToken();
  }

  /**
   * Clear cached token
   */
  clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Check if token is cached and valid
   */
  hasValidToken(): boolean {
    return this.cachedToken !== null && Date.now() < this.tokenExpiry;
  }

  /**
   * Fetch CSRF token from server
   */
  private fetchToken(): Observable<string> {
    return this.http.get<{ csrfToken: string }>(`${environment.apiUrl}${API_ENDPOINTS.CSRF.TOKEN}`)
      .pipe(
        tap(response => console.log('[CsrfService] CSRF token received')),
        map(response => response.csrfToken), // Extract token from response
        catchError(error => {
          console.error('[CsrfService] Failed to fetch CSRF token:', error);
          throw error;
        })
      );
  }
}