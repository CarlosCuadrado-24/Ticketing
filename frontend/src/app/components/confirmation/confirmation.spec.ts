import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { Confirmation } from './confirmation';
import { CheckoutService } from '../../features/checkout/services/checkout.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('Confirmation', () => {
  let component: Confirmation;
  let fixture: ComponentFixture<Confirmation>;
  let router: Router;
  let checkoutService: Partial<CheckoutService>;

  beforeEach(async () => {
    const routerMock = {
      navigate: jasmine.createSpy('navigate'),
    };

    checkoutService = {
      total: signal(220),
      cartItemCount: signal(2),
      clearCart: jasmine.createSpy('clearCart'),
      completedOrder: signal(null),
      getBuyerInfo: jasmine.createSpy('getBuyerInfo').and.returnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [Confirmation],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: CheckoutService, useValue: checkoutService },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Confirmation);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have tickets signal', () => {
    expect(component.tickets).toBeDefined();
  });

  it('should download ticket when downloadTicket is called', () => {
    const mockTicket = {
      id: '1',
      code: 'TICKET-001',
      qrToken: 'qr-token-123',
      eventId: 'event-1',
      type: 'VIP',
      buyerEmail: 'test@example.com',
      price: 100,
      currency: 'COP',
      status: 'PAID',
      purchaseDate: new Date().toISOString(),
      usedAt: null,
      eventName: 'Test Event',
      eventDate: new Date().toISOString(),
      eventLocation: 'Test Location',
    };

    // Mock canvas methods
    const mockCanvas = {
      getContext: jasmine.createSpy('getContext').and.returnValue({
        fillStyle: '',
        fillRect: jasmine.createSpy('fillRect'),
        drawImage: jasmine.createSpy('drawImage'),
        createLinearGradient: jasmine.createSpy('createLinearGradient').and.returnValue({
          addColorStop: jasmine.createSpy('addColorStop'),
        }),
        fillText: jasmine.createSpy('fillText'),
        strokeStyle: '',
        lineWidth: 0,
        strokeRect: jasmine.createSpy('strokeRect'),
        textAlign: '',
        measureText: jasmine.createSpy('measureText').and.returnValue({ width: 100 }),
      }),
      width: 900,
      height: 600,
      toBlob: jasmine.createSpy('toBlob').and.callFake((callback) => {
        callback(new Blob());
      }),
    };

    spyOn(document, 'createElement').and.returnValue(mockCanvas as any);
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
    spyOn(window.URL, 'revokeObjectURL').and.callFake(() => {});

    const mockLink = {
      href: '',
      download: '',
      click: jasmine.createSpy('click'),
    };
    (document.createElement as jasmine.Spy).and.returnValue(mockCanvas as any);
    (document.createElement as jasmine.Spy).and.returnValue(mockLink as any);

    component.downloadTicket(mockTicket);

    // Verify canvas was created
    expect(document.createElement).toHaveBeenCalledWith('canvas');
  });

  it('should navigate to home and clear cart when continue shopping', () => {
    component.continueShopping();

    expect(checkoutService.clearCart).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
