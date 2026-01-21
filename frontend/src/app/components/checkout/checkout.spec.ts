import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { Checkout } from './checkout';
import { CheckoutService } from '../../features/checkout/services/checkout.service';
import { ContactForm } from '../../features/checkout/components/contact-form/contact-form';
import { PaymentForm } from '../../features/checkout/components/payment-form/payment-form';

import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;
  let router: Router;
  let checkoutService: Partial<CheckoutService>;

  beforeEach(async () => {
    const routerMock = {
      navigate: jasmine.createSpy(),
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
      serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue('/'),
      events: of({}),
    };

    checkoutService = {
      cart: signal([{ ticketTypeId: 1, ticketTypeName: 'VIP', quantity: 2, price: 100 }]),
      isLoading: signal(false),
      reservation: signal(null),
      cartItemCount: signal(2),
      confirmOrder: jasmine.createSpy(),
      createReservations: jasmine.createSpy().and.returnValue(Promise.resolve(true)),
      setEventInfo: jasmine.createSpy(),
      reservationExpired: signal(false),
      completedOrder: signal(null),
      resetExpiredState: jasmine.createSpy(),
      subtotal: signal(200),
      tax: signal(10),
      total: signal(210),
      processingFee: signal(5),
    };

    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: CheckoutService, useValue: checkoutService },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should redirect if cart is empty', () => {
      (checkoutService as any).cart = signal([]);
      component.ngOnInit();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should not redirect if cart has items', () => {
      component.ngOnInit();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('step navigation', () => {
    it('should start at contact step', () => {
      expect(component.step).toBe('contact');
    });

    it('should move to payment step when contact form is valid', () => {
      component.contactForm = {
        validate: jasmine.createSpy().and.returnValue(true),
        getFormData: jasmine
          .createSpy()
          .and.returnValue({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' }),
      } as any;

      component.nextStep();

      expect(component.step).toBe('payment');
    });

    it('should not move to payment step when contact form is invalid', () => {
      component.contactForm = {
        validate: jasmine.createSpy().and.returnValue(false),
        getFormData: jasmine.createSpy(),
      } as any;

      component.nextStep();

      expect(component.step).toBe('contact');
    });

    it('should confirm order when payment form is valid', () => {
      component.step = 'payment';
      component.paymentForm = {
        validate: jasmine.createSpy().and.returnValue(true),
        getFormData: jasmine
          .createSpy()
          .and.returnValue({ cardNumber: '4111111111111111', expiryDate: '12/28', cvv: '123', cardholderName: 'John Doe' }),
      } as any;
      (component as any).contactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123456789',
      };

      component.nextStep();

      expect(checkoutService.confirmOrder).toHaveBeenCalledWith('stripe', 'john@example.com', {
        cardNumber: '4111111111111111',
        expiryDate: '12/28',
        cvv: '123',
        cardholderName: 'John Doe',
      });
    });

    it('should go back from payment to contact', () => {
      component.step = 'payment';
      component.previousStep();

      expect(component.step).toBe('contact');
    });

    it('should not go back from contact step', () => {
      component.step = 'contact';
      component.previousStep();

      expect(component.step).toBe('contact');
    });
  });

  describe('confirmOrder', () => {
    it('should confirm order and navigate to confirmation', async () => {
      (component as any).contactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123456789',
      };
      (component as any).paymentData = { 
        cardNumber: '4111111111111111', 
        expiryDate: '12/28', // Fecha futura válida
        cvv: '123', 
        cardholderName: 'John Doe' 
      };

      (checkoutService.confirmOrder as jasmine.Spy).and.returnValue(Promise.resolve());

      await component.confirmOrder();

      expect(checkoutService.confirmOrder).toHaveBeenCalledWith('stripe', 'john@example.com', {
        cardNumber: '4111111111111111',
        expiryDate: '12/28',
        cvv: '123',
        cardholderName: 'John Doe',
      });

      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(router.navigate).toHaveBeenCalledWith(['/confirmation'], { queryParams: {} });
    });
  });
});
