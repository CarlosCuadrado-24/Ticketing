import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { STORAGE_KEYS } from '../../../config/storage.constants';
import { BUSINESS_RULES } from '../../../config/business.constants';
import { API_ENDPOINTS } from '../../../config/api.constants';
import { Reservation } from '../../../models/reservation.model';
import { CartItem } from './cart.service';

/**
 * Reservation Service - Manages ticket reservations and timers
 * Follows Single Responsibility Principle - only handles reservation logic
 */
@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private readonly http = inject(HttpClient);

  // Private signals
  private readonly _reservation = signal<Reservation | null>(null);
  private readonly _timeRemaining = signal<number>(0); // seconds
  private readonly _isLoading = signal(false);
  private readonly _reservationExpired = signal<boolean>(false);

  // Timer reference
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Public read-only signals
  readonly reservation = this._reservation.asReadonly();
  readonly timeRemaining = this._timeRemaining.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly reservationExpired = this._reservationExpired.asReadonly();

  // Computed signals
  readonly hasActiveReservation = computed(() => {
    const reservation = this._reservation();
    return reservation !== null && !this._reservationExpired();
  });

  readonly timeRemainingFormatted = computed(() => {
    const seconds = this._timeRemaining();
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  });

  readonly isNearExpiration = computed(() => {
    const minutes = Math.floor(this._timeRemaining() / 60);
    return minutes <= BUSINESS_RULES.RESERVATION_WARNING_MINUTES;
  });

  /**
   * Create reservations for cart items
   */
  async createReservations(
    cartItems: CartItem[], 
    eventId: string | number, 
    buyerEmail: string
  ): Promise<boolean> {
    if (!eventId || !buyerEmail || cartItems.length === 0) {
      console.warn('[ReservationService] Cannot create reservations: missing required data');
      return false;
    }

    this._isLoading.set(true);
    this._reservationExpired.set(false);
    const reservations: Reservation[] = [];

    try {
      // Create a reservation for each ticket type in the cart
      for (const item of cartItems) {
        const reservationDto = {
          eventId: String(eventId),
          ticketType: this.mapTicketTypeName(item.ticketTypeName),
          quantity: item.quantity,
          buyerEmail: buyerEmail,
        };

        console.log('[ReservationService] Creating reservation:', reservationDto);

        const response = await this.http
          .post<any>(`${environment.apiUrl}${API_ENDPOINTS.RESERVATIONS.BASE}`, reservationDto)
          .toPromise();

        console.log('[ReservationService] Reservation created:', response);

        reservations.push({
          id: response.id,
          eventId: response.eventId,
          ticketType: response.ticketType,
          quantity: response.quantity,
          totalAmount: response.totalAmount,
          expiresAt: new Date(response.expiresAt),
          status: response.status,
          buyerEmail: response.buyerEmail,
          currency: response.currency || 'USD'
        });
      }

      // Store reservations
      this.saveReservations(reservations);

      // Set the first reservation for the timer (all should have same expiration)
      if (reservations.length > 0) {
        this._reservation.set(reservations[0]);
        this.startTimer();
      }

      this._isLoading.set(false);
      return true;
    } catch (error: any) {
      console.error('[ReservationService] Error creating reservations:', error);
      this._isLoading.set(false);

      // If reservation fails due to insufficient tickets, show error
      if (error?.error?.message?.includes('Insufficient')) {
        throw new Error(error.error.message);
      }

      return false;
    }
  }

  /**
   * Cancel all reservations
   */
  async cancelReservations(): Promise<void> {
    const reservations = this.getStoredReservations();
    
    if (reservations.length === 0) {
      return;
    }

    try {
      // Cancel each reservation
      for (const reservation of reservations) {
        await this.http
          .delete(`${environment.apiUrl}${API_ENDPOINTS.RESERVATIONS.CANCEL(reservation.id)}`)
          .toPromise();
      }

      console.log('[ReservationService] All reservations cancelled');
    } catch (error) {
      console.error('[ReservationService] Error cancelling reservations:', error);
    } finally {
      this.clearReservations();
    }
  }

  /**
   * Start reservation timer
   */
  private startTimer(): void {
    const reservation = this._reservation();
    if (!reservation) return;

    this.stopTimer(); // Clear any existing timer

    const updateTimer = () => {
      const now = new Date().getTime();
      const expirationTime = reservation.expiresAt.getTime();
      const timeLeft = Math.max(0, Math.floor((expirationTime - now) / 1000));

      this._timeRemaining.set(timeLeft);

      if (timeLeft <= 0) {
        this.handleExpiration();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  /**
   * Stop reservation timer
   */
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Handle reservation expiration
   */
  private handleExpiration(): void {
    console.log('[ReservationService] Reservation expired');
    this._reservationExpired.set(true);
    this.stopTimer();
    this.clearReservations();
  }

  /**
   * Clear all reservation data
   */
  clearReservations(): void {
    this._reservation.set(null);
    this._timeRemaining.set(0);
    this._reservationExpired.set(false);
    this.stopTimer();
    this.clearStorage();
  }

  /**
   * Get stored reservations
   */
  getStoredReservations(): Reservation[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.map(r => ({
        ...r,
        expiresAt: new Date(r.expiresAt),
        createdAt: r.createdAt ? new Date(r.createdAt) : undefined
      })) : [];
    } catch (error) {
      console.error('[ReservationService] Error loading reservations:', error);
      return [];
    }
  }

  /**
   * Save reservations to storage
   */
  private saveReservations(reservations: Reservation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
    } catch (error) {
      console.error('[ReservationService] Error saving reservations:', error);
    }
  }

  /**
   * Clear reservation storage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.RESERVATIONS);
    } catch (error) {
      console.error('[ReservationService] Error clearing reservation storage:', error);
    }
  }

  /**
   * Map ticket type name for backend compatibility
   */
  private mapTicketTypeName(ticketTypeName: string): string {
    const mapping: Record<string, string> = {
      'General': 'GENERAL',
      'VIP': 'VIP',
      'Premium': 'PREMIUM',
      'Student': 'STUDENT',
      'Senior': 'SENIOR'
    };
    
    return mapping[ticketTypeName] || ticketTypeName.toUpperCase();
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    this.stopTimer();
  }
}