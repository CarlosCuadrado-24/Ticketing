import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { CacheInvalidationService } from '../../../core/services/cache-invalidation.service';
import { CartService, CartItem } from './cart.service';
import { ReservationService } from './reservation.service';
import { PaymentService, PaymentData, ContactData, CompletedOrder } from './payment.service';
import { STORAGE_KEYS } from '../../../config/storage.constants';

/**
 * Checkout Service - Refactored to use composition over inheritance
 * Now orchestrates cart, reservation, and payment services
 * Follows Single Responsibility Principle
 */
@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cacheInvalidationService = inject(CacheInvalidationService);
  private readonly cartService = inject(CartService);
  private readonly reservationService = inject(ReservationService);
  private readonly paymentService = inject(PaymentService);

  // Delegate to composed services
  readonly cart = this.cartService.cart;
  readonly cartItemCount = this.cartService.cartItemCount;
  readonly subtotal = this.cartService.subtotal;
  readonly tax = this.cartService.tax;
  readonly processingFee = this.cartService.processingFee;
  readonly total = this.cartService.total;
  readonly isEmpty = this.cartService.isEmpty;
  readonly isValid = this.cartService.isValid;

  readonly reservation = this.reservationService.reservation;
  readonly timeRemaining = this.reservationService.timeRemaining;
  readonly reservationExpired = this.reservationService.reservationExpired;
  readonly hasActiveReservation = this.reservationService.hasActiveReservation;
  readonly timeRemainingFormatted = this.reservationService.timeRemainingFormatted;
  readonly isNearExpiration = this.reservationService.isNearExpiration;

  readonly isProcessing = this.paymentService.isProcessing;
  readonly completedOrder = this.paymentService.completedOrder;
  readonly isLoading = this.paymentService.isProcessing; // Alias for backward compatibility

  // Additional computed signals
  readonly canProceedToCheckout = computed(() => 
    !this.isEmpty() && this.isValid() && this.authService.isAuthenticated()
  );

  readonly checkoutSummary = computed(() => ({
    items: this.cart(),
    subtotal: this.subtotal(),
    tax: this.tax(),
    processingFee: this.processingFee(),
    total: this.total(),
    itemCount: this.cartItemCount()
  }));

  constructor() {
    // Watch for reservation expiration and clear cart
    effect(() => {
      if (this.reservationExpired()) {
        console.log('[CheckoutService] Reservation expired, clearing cart');
        this.clearCart();
      }
    });
  }

  // Cart operations - delegate to CartService
  addToCart(ticketTypeId: number, ticketTypeName: string, quantity: number, price: number): void {
    this.cartService.addToCart(ticketTypeId, ticketTypeName, quantity, price);
  }

  updateQuantity(ticketTypeId: number, quantity: number): void {
    this.cartService.updateQuantity(ticketTypeId, quantity);
  }

  removeFromCart(ticketTypeId: number): void {
    this.cartService.removeFromCart(ticketTypeId);
  }

  clearCart(): void {
    this.cartService.clearCart();
    this.reservationService.clearReservations();
    this.clearPendingCheckout();
  }

  setEventInfo(eventId: string | number | undefined, eventName: string | undefined): void {
    this.cartService.setEventInfo(eventId, eventName);
  }

  getCartItem(ticketTypeId: number): CartItem | undefined {
    return this.cartService.getCartItem(ticketTypeId);
  }

  isInCart(ticketTypeId: number): boolean {
    return this.cartService.isInCart(ticketTypeId);
  }

  getQuantity(ticketTypeId: number): number {
    return this.cartService.getQuantity(ticketTypeId);
  }

  // Reservation operations - delegate to ReservationService
  async createReservations(): Promise<boolean> {
    const cartItems = this.cart();
    const eventId = this.cartService.eventId();
    const userEmail = this.authService.currentUser()?.email;

    if (!eventId || !userEmail || cartItems.length === 0) {
      return false;
    }

    try {
      const success = await this.reservationService.createReservations(cartItems, eventId, userEmail);
      if (success) {
        this.cacheInvalidationService.invalidateEvent(String(eventId));
      }
      return success;
    } catch (error) {
      console.error('[CheckoutService] Error creating reservations:', error);
      throw error;
    }
  }

  async cancelReservations(): Promise<void> {
    await this.reservationService.cancelReservations();
  }

  // Payment operations - delegate to PaymentService
  async processPayment(contactData: ContactData, paymentData: PaymentData): Promise<CompletedOrder> {
    const cartItems = this.cart();
    const eventId = this.cartService.eventId();
    const eventName = this.cartService.eventName();

    console.log('[CheckoutService] processPayment called with:', { 
      cartItemsCount: cartItems.length, 
      eventId, 
      eventName,
      contactEmail: contactData.email
    });

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    try {
      const completedOrder = await this.paymentService.processPayment(
        cartItems,
        contactData,
        paymentData,
        this.subtotal(),
        this.tax(),
        this.processingFee(),
        eventId,
        eventName
      );

      // Clear cart and reservations after successful payment
      this.clearCart();
      
      // Invalidate caches
      if (eventId) {
        this.cacheInvalidationService.invalidateEvent(String(eventId));
      }

      return completedOrder;
    } catch (error) {
      console.error('[CheckoutService] Payment processing failed:', error);
      throw error;
    }
  }

  // Utility methods
  getBuyerInfo(): { name: string; email: string; phone: string } | null {
    return this.paymentService.getBuyerInfo();
  }

  clearBuyerInfo(): void {
    this.paymentService.clearBuyerInfo();
  }

  clearCompletedOrder(): void {
    this.paymentService.clearCompletedOrder();
  }

  /**
   * Save checkout state for recovery
   */
  savePendingCheckout(): void {
    try {
      const checkoutData = {
        cart: this.cart(),
        eventId: this.cartService.eventId(),
        eventName: this.cartService.eventName(),
        timestamp: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEYS.PENDING_CHECKOUT, JSON.stringify(checkoutData));
    } catch (error) {
      console.error('[CheckoutService] Error saving pending checkout:', error);
    }
  }

  /**
   * Restore checkout state
   */
  restorePendingCheckout(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_CHECKOUT);
      if (!stored) return false;

      const checkoutData = JSON.parse(stored);
      const age = Date.now() - checkoutData.timestamp;
      
      // Don't restore if older than 1 hour
      if (age > 60 * 60 * 1000) {
        this.clearPendingCheckout();
        return false;
      }

      // Restore cart items
      checkoutData.cart.forEach((item: CartItem) => {
        this.addToCart(item.ticketTypeId, item.ticketTypeName, item.quantity, item.price);
      });

      // Restore event info
      if (checkoutData.eventId) {
        this.setEventInfo(checkoutData.eventId, checkoutData.eventName);
      }

      this.clearPendingCheckout();
      return true;
    } catch (error) {
      console.error('[CheckoutService] Error restoring pending checkout:', error);
      this.clearPendingCheckout();
      return false;
    }
  }

  /**
   * Clear pending checkout data
   */
  private clearPendingCheckout(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_CHECKOUT);
    } catch (error) {
      console.error('[CheckoutService] Error clearing pending checkout:', error);
    }
  }

  /**
   * Confirm order - backward compatibility method
   */
  async confirmOrder(paymentMethod: string, contactData: ContactData, paymentData: PaymentData): Promise<void> {
    try {
      await this.processPayment(contactData, paymentData);
    } catch (error) {
      console.error('[CheckoutService] Order confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Reset expired state - backward compatibility method
   */
  resetExpiredState(): void {
    this.reservationService.clearReservations();
  }

  /**
   * Get checkout progress
   */
  getCheckoutProgress(): {
    step: 'cart' | 'reservation' | 'payment' | 'complete';
    canProceed: boolean;
    nextAction: string;
  } {
    if (this.completedOrder()) {
      return {
        step: 'complete',
        canProceed: false,
        nextAction: 'View confirmation'
      };
    }

    if (this.hasActiveReservation()) {
      return {
        step: 'payment',
        canProceed: true,
        nextAction: 'Complete payment'
      };
    }

    if (!this.isEmpty() && this.authService.isAuthenticated()) {
      return {
        step: 'reservation',
        canProceed: true,
        nextAction: 'Create reservation'
      };
    }

    return {
      step: 'cart',
      canProceed: this.canProceedToCheckout(),
      nextAction: this.authService.isAuthenticated() ? 'Add items to cart' : 'Login to continue'
    };
  }
}