import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, switchMap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '../../config/storage.constants';
import { API_ENDPOINTS } from '../../config/api.constants';
import { CsrfService } from './csrf.service';
import { TokenService } from './token.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Authentication Service - Refactored for better maintainability
 * Follows Single Responsibility Principle and eliminates long methods
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly csrfService = inject(CsrfService);
  private readonly tokenService = inject(TokenService);

  // Signals
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal(false);

  // Public read-only signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => {
    const user = this._currentUser();
    const hasToken = this.tokenService.hasAccessToken();
    return !!user && hasToken;
  });

  readonly userRole = computed(() => this._currentUser()?.role || null);
  readonly userName = computed(() => {
    const user = this._currentUser();
    return user ? `${user.firstName} ${user.lastName}` : null;
  });

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initialize user state from storage
   */
  private initializeFromStorage(): void {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser && this.tokenService.hasAccessToken()) {
        const user = JSON.parse(storedUser);
        this._currentUser.set(user);
      }
    } catch (error) {
      console.error('[AuthService] Error loading user from storage:', error);
      this.clearAuthData();
    }
  }

  /**
   * Get the default redirect route based on user role
   */
  getDefaultRouteForUser(user: User): string {
    const roleRoutes: Record<string, string> = {
      'ADMIN': '/admin/dashboard',
      'ORGANIZER': '/admin/events',
      'BUYER': '/'
    };
    
    return roleRoutes[user.role] || '/';
  }

  /**
   * Login user with credentials
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    
    return this.csrfService.getToken().pipe(
      switchMap(csrfToken => this.performLogin(credentials, csrfToken)),
      tap(response => this.handleSuccessfulAuth(response)),
      catchError(error => this.handleAuthError(error, 'login'))
    );
  }

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    
    return this.csrfService.getToken().pipe(
      switchMap(csrfToken => this.performRegistration(userData, csrfToken)),
      tap(response => this.handleSuccessfulAuth(response)),
      catchError(error => this.handleAuthError(error, 'register'))
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<void> {
    this._isLoading.set(true);
    
    return this.http.post<void>(`${environment.apiUrl}${API_ENDPOINTS.AUTH.LOGOUT}`, {}).pipe(
      tap(() => this.clearAuthData()),
      catchError(error => {
        // Clear auth data even if logout request fails
        this.clearAuthData();
        console.error('[AuthService] Logout error:', error);
        return new Observable<void>(observer => {
          observer.next();
          observer.complete();
        });
      })
    );
  }

  /**
   * Logout user immediately (synchronous)
   * Use this when you need immediate logout without HTTP request
   */
  logoutImmediate(): void {
    this.clearAuthData();
    console.log('[AuthService] Immediate logout completed');
  }

  /**
   * Refresh authentication token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.tokenService.getRefreshToken();
    
    if (!refreshToken) {
      this.clearAuthData();
      throw new Error('No refresh token available');
    }

    return this.http.post<AuthResponse>(`${environment.apiUrl}${API_ENDPOINTS.AUTH.REFRESH}`, {
      refreshToken
    }).pipe(
      tap(response => this.handleSuccessfulAuth(response)),
      catchError(error => {
        this.clearAuthData();
        throw error;
      })
    );
  }

  /**
   * Check if current token is expired and refresh if needed
   */
  ensureValidToken(): Observable<boolean> {
    const accessToken = this.tokenService.getAccessToken();
    
    if (!accessToken) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    if (this.tokenService.isTokenExpired(accessToken)) {
      return this.refreshToken().pipe(
        map(() => true), // Convert AuthResponse to boolean
        catchError(() => {
          this.clearAuthData();
          return [false];
        })
      );
    }

    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  /**
   * Perform login HTTP request
   */
  private performLogin(credentials: LoginRequest, csrfToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}${API_ENDPOINTS.AUTH.LOGIN}`, credentials, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
  }

  /**
   * Perform registration HTTP request
   */
  private performRegistration(userData: RegisterRequest, csrfToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}${API_ENDPOINTS.AUTH.REGISTER}`, userData, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
  }

  /**
   * Handle successful authentication response
   */
  private handleSuccessfulAuth(response: AuthResponse): void {
    this._currentUser.set(response.user);
    this.tokenService.setAccessToken(response.accessToken);
    
    if (response.refreshToken) {
      this.tokenService.setRefreshToken(response.refreshToken);
    }
    
    this.saveUserToStorage(response.user);
    this._isLoading.set(false);
    
    console.log('[AuthService] Authentication successful for user:', response.user.email);
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any, operation: string): Observable<never> {
    this._isLoading.set(false);
    console.error(`[AuthService] ${operation} error:`, error);
    
    let errorMessage = 'Authentication failed';
    
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.status === 401) {
      errorMessage = 'Invalid credentials';
    } else if (error?.status === 429) {
      errorMessage = 'Too many attempts. Please try again later';
    }
    
    throw new Error(errorMessage);
  }

  /**
   * Save user data to localStorage
   */
  private saveUserToStorage(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('[AuthService] Error saving user to storage:', error);
    }
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    this._currentUser.set(null);
    this._isLoading.set(false);
    this.tokenService.clearTokens();
    this.csrfService.clearCache();
    
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('[AuthService] Error clearing user storage:', error);
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this._currentUser()?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this._currentUser()?.role;
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this._currentUser()?.id || null;
  }

  /**
   * Update current user data
   */
  updateCurrentUser(userData: Partial<User>): void {
    const currentUser = this._currentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      this._currentUser.set(updatedUser);
      this.saveUserToStorage(updatedUser);
    }
  }
}