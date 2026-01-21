import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HTTP_STATUS } from '../../config/api.constants';

/**
 * Base interface for API entities
 */
export interface BaseEntity {
  id: string | number;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for paginated requests
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Abstract base service for HTTP operations
 * Implements common CRUD operations and error handling
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
export abstract class BaseApiService<T extends BaseEntity> {
  protected readonly baseUrl: string;

  constructor(
    protected readonly http: HttpClient,
    protected readonly endpoint: string
  ) {
    this.baseUrl = `${environment.apiUrl}${endpoint}`;
  }

  /**
   * Get all entities with optional pagination
   */
  getAll(query?: PaginationQuery): Observable<T[] | PaginatedResponse<T>> {
    const params = this.buildHttpParams(query);
    return this.http.get<T[] | PaginatedResponse<T>>(this.baseUrl, { params })
      .pipe(
        retry(1),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get entity by ID
   */
  getById(id: string | number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${id}`)
      .pipe(
        retry(1),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Create new entity
   */
  create(entity: Omit<T, 'id'>): Observable<T> {
    return this.http.post<T>(this.baseUrl, entity)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Update existing entity
   */
  update(id: string | number, entity: Partial<T>): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${id}`, entity)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Delete entity
   */
  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Search entities
   */
  search(query: string, filters?: Record<string, any>): Observable<T[]> {
    const params = this.buildHttpParams({ search: query, ...filters });
    return this.http.get<T[]>(`${this.baseUrl}/search`, { params })
      .pipe(
        retry(1),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Build HTTP parameters from query object
   */
  protected buildHttpParams(query?: Record<string, any>): HttpParams {
    let params = new HttpParams();
    
    if (query) {
      Object.keys(query).forEach(key => {
        const value = query[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    
    return params;
  }

  /**
   * Centralized error handling
   * Can be overridden by child classes for specific error handling
   */
  protected handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case HTTP_STATUS.BAD_REQUEST:
          errorMessage = error.error?.message || 'Invalid request';
          break;
        case HTTP_STATUS.UNAUTHORIZED:
          errorMessage = 'Authentication required';
          break;
        case HTTP_STATUS.FORBIDDEN:
          errorMessage = 'Access denied';
          break;
        case HTTP_STATUS.NOT_FOUND:
          errorMessage = 'Resource not found';
          break;
        case HTTP_STATUS.CONFLICT:
          errorMessage = error.error?.message || 'Resource conflict';
          break;
        case HTTP_STATUS.UNPROCESSABLE_ENTITY:
          errorMessage = error.error?.message || 'Validation error';
          break;
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          errorMessage = 'Server error. Please try again later';
          break;
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          errorMessage = 'Service temporarily unavailable';
          break;
        default:
          errorMessage = error.error?.message || `Server Error: ${error.status}`;
      }
    }

    console.error(`[${this.constructor.name}] API Error:`, {
      status: error.status,
      message: errorMessage,
      url: error.url,
      error: error.error
    });

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Log API operations for debugging
   */
  protected logOperation(operation: string, data?: any): void {
    if (!environment.production) {
      console.log(`[${this.constructor.name}] ${operation}`, data);
    }
  }
}