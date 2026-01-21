import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderSummary } from './order-summary';
import { CheckoutService } from '../../services/checkout.service';

import { signal } from '@angular/core';

describe('OrderSummary', () => {
  let component: OrderSummary;
  let fixture: ComponentFixture<OrderSummary>;
  let checkoutService: Partial<CheckoutService>;

  beforeEach(async () => {
    checkoutService = {
      cart: signal([
        { ticketTypeId: 1, ticketTypeName: 'VIP', quantity: 2, price: 100 },
        { ticketTypeId: 2, ticketTypeName: 'General', quantity: 1, price: 50 },
      ]),
      subtotal: signal(250),
      tax: signal(25),
      processingFee: signal(5),
      total: signal(275),
      removeFromCart: jasmine.createSpy(),
    };

    await TestBed.configureTestingModule({
      imports: [OrderSummary],
      providers: [{ provide: CheckoutService, useValue: checkoutService }],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display cart items', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    
    const compiled = fixture.nativeElement;
    const items = compiled.querySelectorAll('.cart-item');

    expect(items.length).toBe(2);
  });

  it('should call removeFromCart when remove button clicked', () => {
    component.removeItem(1);

    expect(checkoutService.removeFromCart).toHaveBeenCalledWith(1);
  });

  it('should display subtotal, tax, and total', () => {
    expect(component.subtotal()).toBe(250);
    expect(component.tax()).toBe(25);
    expect(component.total()).toBe(275);
  });
});
