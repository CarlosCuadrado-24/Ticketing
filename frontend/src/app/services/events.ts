import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Event } from '../models/event.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Events {
  private apiUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  getEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(this.apiUrl).pipe(catchError(this.handleError('getEvents')));
  }

  getEvent(id: number | string): Observable<Event> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Event>(url).pipe(catchError(this.handleError('getEvent')));
  }

  /**
   * Creates a new event with optional image upload
   * @param formData - FormData containing event data and optional image file
   * @returns Observable<Event> - The created event with imageUrl
   */
  createEvent(formData: FormData): Observable<Event> {
    return this.http
      .post<Event>(this.apiUrl, formData)
      .pipe(catchError(this.handleError('createEvent')));
  }

  /**
   * Updates an event with optional image upload
   * @param id - Event ID
   * @param formData - FormData containing event data and optional image file
   * @returns Observable<Event> - The updated event
   */
  updateEvent(id: string | number, formData: FormData): Observable<Event> {
    return this.http
      .put<Event>(`${this.apiUrl}/${id}`, formData)
      .pipe(catchError(this.handleError('updateEvent')));
  }

  /**
   * Deletes an event by ID
   * @param id - Event ID
   * @returns Observable<void>
   */
  deleteEvent(id: string | number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError('deleteEvent')));
  }

  private handleError(operation = 'operation') {
    return (error: HttpErrorResponse): Observable<never> => {
      console.error(`[Events Service] ${operation} failed:`, error.message);

      let errorMessage = 'Unknown error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Client error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage = `Server error: ${error.status} ${error.statusText}`;
      }

      return throwError(() => new Error(errorMessage));
    };
  }
}
