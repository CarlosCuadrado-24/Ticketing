import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventDetail } from './event-detail';
import { EventService } from '../../services/event.service';
import { Orders } from '../../services/orders';
import { CheckoutService } from '../../features/checkout/services/checkout.service';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';

describe('EventDetail', () => {
  let component: EventDetail;
  let fixture: ComponentFixture<EventDetail>;
  let eventService: jasmine.SpyObj<EventService>;
  let orders: jasmine.SpyObj<Orders>;
  let checkoutService: jasmine.SpyObj<CheckoutService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let route: any;

  const mockEvent = {
    id: 1,
    name: 'Test Event',
    date: '2026-01-12',
    location: 'Cali',
    imageUrl: '',
    tags: ['#Test'],
    ticketConfigurations: [
      { type: 'VIP', price: 100, currency: 'COP', totalQuantity: 10, availableQuantity: 5 },
    ],
    ticketTypes: [{ id: 1, name: 'General', price: 50, totalQuantity: 100, availableQuantity: 50 }],
    eventDetails: [{ category: 'Music', minAge: 18 }],
  };

  beforeEach(async () => {
    const selectedEventSignal = signal(mockEvent);
    const isLoadingSignal = signal(false);
    
    eventService = jasmine.createSpyObj('EventService', ['loadEventById', 'clearSelectedEvent']);
    Object.defineProperty(eventService, 'selectedEvent', {
      get: () => selectedEventSignal,
      configurable: true
    });
    Object.defineProperty(eventService, 'isLoading', {
      get: () => isLoadingSignal,
      configurable: true
    });
    
    orders = jasmine.createSpyObj('Orders', ['createOrder']);
    checkoutService = jasmine.createSpyObj('CheckoutService', ['clearCart', 'addToCart', 'setEventInfo']);
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    route = { snapshot: { paramMap: { get: () => '1' } } };

    await TestBed.configureTestingModule({
      imports: [EventDetail],
      providers: [
        { provide: EventService, useValue: eventService },
        { provide: Orders, useValue: orders },
        { provide: CheckoutService, useValue: checkoutService },
        { provide: ToastService, useValue: toastService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should call loadEventById', () => {
    component.ngOnInit();
    expect(eventService.loadEventById).toHaveBeenCalledWith(1);
  });

  it('ngOnDestroy should call clearSelectedEvent', () => {
    component.ngOnDestroy();
    expect(eventService.clearSelectedEvent).toHaveBeenCalled();
  });

  it('getTicketConfigurations returns ticketConfigurations', () => {
    expect(component.getTicketConfigurations().length).toBe(1);
  });

  it('getTicketTypes returns ticketTypes', () => {
    expect(component.getTicketTypes().length).toBe(1);
  });

  it('encodeLocation encodes string', () => {
    expect(component.encodeLocation('Cali, Colombia')).toBe('Cali%2C%20Colombia');
  });

  it('increaseQty and decreaseQty work with config', () => {
    const config = mockEvent.ticketConfigurations[0];
    component.selectedQuantities = { VIP: 0 };
    component.increaseQty(config);
    expect(component.selectedQuantities['VIP']).toBe(1);
    component.decreaseQty(config);
    expect(component.selectedQuantities['VIP']).toBe(0);
  });

  it('increaseQty does not exceed max', () => {
    const config = mockEvent.ticketConfigurations[0];
    component.selectedQuantities = { VIP: 5 };
    component.increaseQty(config);
    expect(component.selectedQuantities['VIP']).toBe(5);
  });

  it('decreaseQty does not go below 0', () => {
    const config = mockEvent.ticketConfigurations[0];
    component.selectedQuantities = { VIP: 0 };
    component.decreaseQty(config);
    expect(component.selectedQuantities['VIP']).toBe(0);
  });

  it('getConfigKey returns correct key', () => {
    expect(component.getConfigKey(mockEvent.ticketConfigurations[0])).toBe('VIP');
    expect(component.getConfigKey(mockEvent.ticketTypes[0])).toBe('1');
  });

  it('getMaxQty returns correct max', () => {
    expect(component['getMaxQty'](mockEvent.ticketConfigurations[0])).toBe(5);
    expect(component['getMaxQty'](mockEvent.ticketTypes[0])).toBe(50);
  });

  it('clampSelectedQuantities clamps values', () => {
    component.selectedQuantities = { VIP: 10, 1: 100 };
    component['clampSelectedQuantities']();
    expect(component.selectedQuantities['VIP']).toBe(5);
    expect(component.selectedQuantities[1]).toBe(50);
  });

  it('isTicketSoldOut returns true if 0', () => {
    const soldOut = { ...mockEvent.ticketConfigurations[0], availableQuantity: 0 };
    expect(component.isTicketSoldOut(soldOut)).toBeTrue();
  });

  it('getAvailableCount returns correct value', () => {
    expect(component.getAvailableCount(mockEvent.ticketConfigurations[0])).toBe(5);
  });

  it('getTicketTypeDescription returns correct string', () => {
    expect(component.getTicketTypeDescription(mockEvent.ticketConfigurations[0])).toContain(
      'available',
    );
    const soldOut = { ...mockEvent.ticketConfigurations[0], availableQuantity: 0 };
    expect(component.getTicketTypeDescription(soldOut)).toBe('No longer available');
  });

  it('getTicketName returns correct name', () => {
    expect(component.getTicketName(mockEvent.ticketConfigurations[0])).toBe('VIP');
    expect(component.getTicketName(mockEvent.ticketTypes[0])).toBe('General');
  });

  it('getTicketPrice returns correct price', () => {
    expect(component.getTicketPrice(mockEvent.ticketConfigurations[0])).toBe(100);
    expect(component.getTicketPrice(mockEvent.ticketTypes[0])).toBe(50);
  });

  it('getTotal returns correct sum', () => {
    component.selectedQuantities = { VIP: 2, 1: 3 };
    expect(component.getTotal()).toBe(2 * 100 + 3 * 50);
  });

  it('getSelectedItems returns correct items', () => {
    component.selectedQuantities = { VIP: 2, 1: 3 };
    const items = component.getSelectedItems();
    expect(items.length).toBe(2);
    expect(items[0].quantity).toBe(2);
    expect(items[1].quantity).toBe(3);
  });

  it('checkout shows toast if no tickets', () => {
    component.selectedQuantities = {};
    component.checkout();
    expect(toastService.show).toHaveBeenCalled();
    expect(checkoutService.clearCart).not.toHaveBeenCalled();
  });

  it('checkout adds to cart and navigates', () => {
    component.selectedQuantities = { VIP: 2 };
    component.checkout();
    expect(checkoutService.clearCart).toHaveBeenCalled();
    expect(checkoutService.addToCart).toHaveBeenCalledWith(0, 'VIP', 2, 100);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('getEventTags returns tags or default', () => {
    expect(component.getEventTags()).toEqual(['#Test']);
    (eventService.selectedEvent as any).set({ ...mockEvent, tags: undefined });
    expect(component.getEventTags()).toEqual(['#Event', '#Conference']);
  });

  it('getEventImage returns default if missing', () => {
    (eventService.selectedEvent as any).set({ ...mockEvent, imageUrl: undefined });
    expect(component.getEventImage()).toContain('http');
  });

  it('getEventImage returns minio url if needed', () => {
    (eventService.selectedEvent as any).set({ ...mockEvent, imageUrl: 'minio/test.jpg' });
    expect(component.getEventImage()).toContain('/events/file/');
  });

  it('getEventImage returns direct url if http', () => {
    (eventService.selectedEvent as any).set({ ...mockEvent, imageUrl: 'http://test.com/img.jpg' });
    expect(component.getEventImage()).toBe('http://test.com/img.jpg');
  });
});
