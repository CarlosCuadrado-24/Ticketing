import { Injectable, signal, computed } from '@angular/core';
import { STORAGE_KEYS } from '../../../config/storage.constants';
import { BUSINESS_RULES } from '../../../config/business.constants';

export interface CartItem {
  ticketTypeId: number;
  ticketTypeName: string;
  quantity: number;
  price: number;
}

/**
 * Cart Service - Manages shopping cart state and operations
 * Follows Single Responsibility Principle - only handles cart logic
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Private signals
  private readonly _cart = signal<CartItem[]>(this.loadCart());
  private readonly _eventId = signal<string | number | undefined>(undefined);
  private readonly _eventName = signal<string | undefined>(undefined);

  // Public read-only signals
  readonly cart = this._cart.asReadonly();
  readonly eventId = this._eventId.asReadonly();
  readonly eventName = this._eventName.asReadonly();

  // Computed signals
  readonly cartItemCount = computed(() => 
    this._cart().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() => 
    this._cart().reduce((total, item) => total + (item.price * item.quantity), 0)
  );

  readonly tax = computed(() => 
    Math.round(this.subtotal() * BUSINESS_RULES.TAX_RATE * 100) / 100
  );

  readonly processingFee = computed(() => BUSINESS_RULES.PROCESSING_FEE);

  readonly total = computed(() => 
    this.subtotal() + this.tax() + this.processingFee()
  );

  readonly isEmpty = computed(() => this._cart().length === 0);

  readonly isValid = computed(() => {
    const cart = this._cart();
    return cart.length > 0 && 
           cart.every(item => item.quantity > 0 && item.quantity <= BUSINESS_RULES.MAX_TICKETS_PER_TYPE) &&
           this.cartItemCount() <= BUSINESS_RULES.MAX_TICKETS_PER_ORDER;
  });

  /**
   * Add item to cart or update quantity if already exists
   */
  addToCart(ticketTypeId: number, ticketTypeName: string, quantity: number, price: number): void {
    if (quantity <= 0 || quantity > BUSINESS_RULES.MAX_TICKETS_PER_TYPE) {
      throw new Error(`Quantity must be between 1 and ${BUSINESS_RULES.MAX_TICKETS_PER_TYPE}`);
    }

    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    const currentCart = this._cart();
    const existingItemIndex = currentCart.findIndex(item => item.ticketTypeId === ticketTypeId);

    let updatedCart: CartItem[];
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const newQuantity = Math.min(
        currentCart[existingItemIndex].quantity + quantity,
        BUSINESS_RULES.MAX_TICKETS_PER_TYPE
      );
      
      updatedCart = currentCart.map((item, index) => 
        index === existingItemIndex 
          ? { ...item, quantity: newQuantity }
          : item
      );
    } else {
      // Add new item
      const newItem: CartItem = {
        ticketTypeId,
        ticketTypeName,
        quantity,
        price
      };
      updatedCart = [...currentCart, newItem];
    }

    // Validate total items
    const totalItems = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > BUSINESS_RULES.MAX_TICKETS_PER_ORDER) {
      throw new Error(`Maximum ${BUSINESS_RULES.MAX_TICKETS_PER_ORDER} tickets allowed per order`);
    }

    this._cart.set(updatedCart);
    this.saveCart();
  }

  /**
   * Update quantity for specific ticket type
   */
  updateQuantity(ticketTypeId: number, quantity: number): void {
    if (quantity < 0 || quantity > BUSINESS_RULES.MAX_TICKETS_PER_TYPE) {
      throw new Error(`Quantity must be between 0 and ${BUSINESS_RULES.MAX_TICKETS_PER_TYPE}`);
    }

    const currentCart = this._cart();
    let updatedCart: CartItem[];

    if (quantity === 0) {
      // Remove item if quantity is 0
      updatedCart = currentCart.filter(item => item.ticketTypeId !== ticketTypeId);
    } else {
      // Update quantity
      updatedCart = currentCart.map(item => 
        item.ticketTypeId === ticketTypeId 
          ? { ...item, quantity }
          : item
      );
    }

    this._cart.set(updatedCart);
    this.saveCart();
  }

  /**
   * Remove item from cart
   */
  removeFromCart(ticketTypeId: number): void {
    const updatedCart = this._cart().filter(item => item.ticketTypeId !== ticketTypeId);
    this._cart.set(updatedCart);
    this.saveCart();
  }

  /**
   * Clear entire cart
   */
  clearCart(): void {
    this._cart.set([]);
    this.clearStorage();
  }

  /**
   * Set event information for the cart
   */
  setEventInfo(eventId: string | number | undefined, eventName: string | undefined): void {
    this._eventId.set(eventId);
    this._eventName.set(eventName);
  }

  /**
   * Get cart item by ticket type ID
   */
  getCartItem(ticketTypeId: number): CartItem | undefined {
    return this._cart().find(item => item.ticketTypeId === ticketTypeId);
  }

  /**
   * Check if ticket type is in cart
   */
  isInCart(ticketTypeId: number): boolean {
    return this._cart().some(item => item.ticketTypeId === ticketTypeId);
  }

  /**
   * Get quantity for specific ticket type
   */
  getQuantity(ticketTypeId: number): number {
    const item = this.getCartItem(ticketTypeId);
    return item ? item.quantity : 0;
  }

  /**
   * Load cart from localStorage
   */
  private loadCart(): CartItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CART);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[CartService] Error loading cart from storage:', error);
      return [];
    }
  }

  /**
   * Save cart to localStorage
   */
  private saveCart(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(this._cart()));
    } catch (error) {
      console.error('[CartService] Error saving cart to storage:', error);
    }
  }

  /**
   * Clear cart storage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CART);
    } catch (error) {
      console.error('[CartService] Error clearing cart storage:', error);
    }
  }
}