import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { STORAGE_KEYS } from '../../../config/storage.constants';
import { API_ENDPOINTS } from '../../../config/api.constants';
import { Orders } from '../../../services/orders';
import { CreateOrderDto } from '../../../models/order.model';
import { CacheInvalidationService } from '../../../core/services/cache-invalidation.service';
import { CartItem } from './cart.service';
import { Reservation } from '../../../models/reservation.model';

export interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface PurchasedTicket {
  id: string;
  ticketTypeName: string;
  price: number;
  qrCode: string;
}

export interface CompletedOrder {
  orderId: string;
  tickets: PurchasedTicket[];
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  processingFee: number;
  total: number;
  purchaseDate: string;
  eventId?: string | number;
  eventName?: string;
}

/**
 * Payment Service - Handles payment processing and order completion
 * Follows Single Responsibility Principle - only handles payment logic
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly ordersService = inject(Orders);
  private readonly cacheInvalidationService = inject(CacheInvalidationService);

  // Private signals
  private readonly _isProcessing = signal(false);
  private readonly _completedOrder = signal<CompletedOrder | null>(null);

  // Public read-only signals
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly completedOrder = this._completedOrder.asReadonly();

  /**
   * Process payment and complete order
   */
  async processPayment(
    cartItems: CartItem[],
    contactData: ContactData,
    paymentData: PaymentData,
    subtotal: number,
    tax: number,
    processingFee: number,
    eventId?: string | number,
    eventName?: string
  ): Promise<CompletedOrder> {
    if (this._isProcessing()) {
      throw new Error('Payment is already being processed');
    }

    this._isProcessing.set(true);

    try {
      // Validate payment data
      this.validatePaymentData(paymentData);
      this.validateContactData(contactData);

      // Validate event ID
      if (!eventId) {
        throw new Error('Event ID is required for ticket purchase');
      }

      // Purchase tickets using the backend endpoint
      const purchasePayload = {
        eventId: String(eventId),
        ticketType: cartItems[0].ticketTypeName, // Get ticket type from cart item
        quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        buyerEmail: contactData.email,
        paymentInfo: {
          cardNumber: paymentData.cardNumber,
          expiryDate: paymentData.expiryDate,
          cvv: paymentData.cvv
        }
      };

      console.log('[PaymentService] Processing payment for tickets:', purchasePayload);

      // Process payment through tickets/purchase endpoint
      const response = await this.http.post<any[]>(`${environment.apiUrl}/tickets/purchase`, purchasePayload).toPromise();

      if (!response || response.length === 0) {
        throw new Error('No response from payment service');
      }

      console.log('[PaymentService] Payment processed successfully:', response);

      // Map backend tickets to PurchasedTicket format
      const tickets: PurchasedTicket[] = response.map(ticket => ({
        id: ticket.id,
        ticketTypeName: ticket.type,
        price: ticket.price,
        qrCode: ticket.qrToken || ''
      }));

      // Create completed order object
      const completedOrder: CompletedOrder = {
        orderId: response[0]?.id || 'unknown',
        tickets,
        cartItems,
        subtotal,
        tax,
        processingFee,
        total: subtotal + tax + processingFee,
        purchaseDate: new Date().toISOString(),
        eventId,
        eventName
      };

      this._completedOrder.set(completedOrder);

      // Store buyer info for confirmation page
      this.storeBuyerInfo(contactData);

      // Invalidate relevant caches
      this.invalidateCaches(eventId);

      return completedOrder;

    } catch (error: any) {
      console.error('[PaymentService] Payment processing failed:', error);
      
      // Handle specific payment errors
      if (error?.error?.message) {
        throw new Error(error.error.message);
      }
      
      throw new Error('Payment processing failed. Please try again.');
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * Validate payment data
   */
  private validatePaymentData(paymentData: PaymentData): void {
    if (!paymentData.cardNumber || paymentData.cardNumber.length < 13) {
      throw new Error('Invalid card number');
    }

    if (!paymentData.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentData.expiryDate)) {
      throw new Error('Invalid expiry date format (MM/YY)');
    }

    if (!paymentData.cvv || paymentData.cvv.length < 3) {
      throw new Error('Invalid CVV');
    }

    if (!paymentData.cardholderName || paymentData.cardholderName.trim().length < 2) {
      throw new Error('Invalid cardholder name');
    }

    // Check if card is expired
    const [month, year] = paymentData.expiryDate.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    
    if (expiryDate < now) {
      throw new Error('Card has expired');
    }
  }

  /**
   * Validate contact data
   */
  private validateContactData(contactData: ContactData): void {
    if (!contactData.firstName || contactData.firstName.trim().length < 1) {
      throw new Error('First name is required');
    }

    if (!contactData.lastName || contactData.lastName.trim().length < 1) {
      throw new Error('Last name is required');
    }

    if (!contactData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      throw new Error('Valid email is required');
    }

    if (!contactData.phone || contactData.phone.trim().length < 10) {
      throw new Error('Valid phone number is required');
    }
  }

  /**
   * Detect card type from card number
   */
  private detectCardType(cardNumber: string): string {
    const number = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(number)) return 'Visa';
    if (/^5[1-5]/.test(number)) return 'Mastercard';
    if (/^3[47]/.test(number)) return 'American Express';
    if (/^6/.test(number)) return 'Discover';
    
    return 'Unknown';
  }

  /**
   * Store buyer info for confirmation page
   */
  private storeBuyerInfo(contactData: ContactData): void {
    try {
      const buyerInfo = {
        name: `${contactData.firstName} ${contactData.lastName}`,
        email: contactData.email,
        phone: contactData.phone
      };
      
      localStorage.setItem(STORAGE_KEYS.BUYER_INFO, JSON.stringify(buyerInfo));
    } catch (error) {
      console.error('[PaymentService] Error storing buyer info:', error);
    }
  }

  /**
   * Invalidate relevant caches after successful payment
   */
  private invalidateCaches(eventId?: string | number): void {
    try {
      // Invalidate event cache if event ID is available
      if (eventId) {
        this.cacheInvalidationService.invalidateEvent(String(eventId));
      }
      
      // Note: Add these methods to CacheInvalidationService if needed
      // this.cacheInvalidationService.invalidateUserTickets();
      // this.cacheInvalidationService.invalidateOrders();
    } catch (error) {
      console.error('[PaymentService] Error invalidating caches:', error);
    }
  }

  /**
   * Clear completed order
   */
  clearCompletedOrder(): void {
    this._completedOrder.set(null);
  }

  /**
   * Get stored buyer info
   */
  getBuyerInfo(): { name: string; email: string; phone: string } | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BUYER_INFO);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[PaymentService] Error retrieving buyer info:', error);
      return null;
    }
  }

  /**
   * Clear buyer info
   */
  clearBuyerInfo(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.BUYER_INFO);
    } catch (error) {
      console.error('[PaymentService] Error clearing buyer info:', error);
    }
  }
}