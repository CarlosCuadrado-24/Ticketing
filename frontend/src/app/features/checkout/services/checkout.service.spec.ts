import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CheckoutService } from './checkout.service';
import { Orders } from '../../../services/orders';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let ordersService: Partial<Orders>;

  beforeEach(() => {
    ordersService = {
      createOrder: jasmine.createSpy().and.returnValue({ toPromise: () => Promise.resolve({ id: 1 }) }),
      confirmOrder: jasmine.createSpy(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CheckoutService, { provide: Orders, useValue: ordersService }],
    });

    service = TestBed.inject(CheckoutService);
    // Clear cart before each test
    service.clearCart();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('cart operations', () => {
    it('should add item to cart', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);

      expect(service.cart().length).toBeGreaterThan(0);
      const item = service.cart().find(i => i.ticketTypeId === 1);
      expect(item).toBeDefined();
      expect(item?.ticketTypeName).toBe('VIP Ticket');
      expect(item?.quantity).toBe(2);
      expect(item?.price).toBe(100);
    });

    it('should update existing item quantity in cart', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);
      service.addToCart(1, 'VIP Ticket', 3, 100);

      const item = service.cart().find(i => i.ticketTypeId === 1);
      expect(item?.quantity).toBe(5);
    });

    it('should remove item from cart', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);
      service.addToCart(2, 'General', 1, 50);

      service.removeFromCart(1);

      expect(service.cart().find(i => i.ticketTypeId === 1)).toBeUndefined();
      expect(service.cart().find(i => i.ticketTypeId === 2)).toBeDefined();
    });

    it('should update item quantity', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);
      service.updateQuantity(1, 5);

      const item = service.cart().find(i => i.ticketTypeId === 1);
      expect(item?.quantity).toBe(5);
    });

    it('should remove item when quantity is 0 or less', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);
      service.updateQuantity(1, 0);

      expect(service.cart().find(i => i.ticketTypeId === 1)).toBeUndefined();
    });

    it('should clear cart', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);
      service.addToCart(2, 'General', 1, 50);

      service.clearCart();

      expect(service.cart().length).toBe(0);
    });
  });

  describe('computed values', () => {
    it('should calculate subtotal correctly', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);
      service.addToCart(2, 'General', 3, 50);

      expect(service.subtotal()).toBe(350); // (2 * 100) + (3 * 50)
    });

    it('should calculate tax correctly', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);

      expect(service.tax()).toBe(10); // 200 * 0.05 (5% service fee)
    });

    it('should calculate total correctly', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);

      expect(service.total()).toBe(215); // 200 + 10 (tax) + 5 (processing fee)
    });

    it('should calculate cart item count', () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);
      service.addToCart(2, 'General', 3, 50);

      expect(service.cartItemCount()).toBe(5); // 2 + 3
    });
  });

  describe('reservation', () => {
    afterEach(() => {
      try {
        jasmine.clock().uninstall();
      } catch {}
    });
    
    it('should have reservation from reservation service', () => {
      // The reservation is now managed by ReservationService
      // We can only test that the signal is exposed
      expect(service.reservation).toBeDefined();
      expect(service.timeRemaining).toBeDefined();
    });

    it('should expose time remaining from reservation service', () => {
      expect(service.timeRemaining()).toBeGreaterThanOrEqual(0);
    });

    it('should expose reservation expired state', () => {
      expect(service.reservationExpired()).toBeDefined();
    });
  });

  describe('confirmOrder', () => {
    it('should confirm order successfully', async () => {
      service.addToCart(1, 'VIP Ticket', 2, 100);
      
      const paymentData = {
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'Test User'
      };

      // Just verify the method exists and can be called
      // The actual payment processing is tested in PaymentService
      expect(() => {
        service.confirmOrder('stripe', 'test@example.com', paymentData);
      }).not.toThrow();
    });
  });
});
