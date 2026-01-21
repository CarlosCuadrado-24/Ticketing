import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - clear auth and redirect to login
        authService.logout().subscribe({
          next: () => router.navigate(['/login']),
          error: () => router.navigate(['/login']) // Navigate anyway
        });
      } else if (error.status === 403) {
        // Forbidden
        console.error('Access forbidden', error);
      } else if (error.status === 500) {
        // Server error
        console.error('Server error', error);
      }

      return throwError(() => error);
    }),
  );
};
