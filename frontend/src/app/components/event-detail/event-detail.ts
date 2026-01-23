import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  effect,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { Orders } from '../../services/orders';
import { CheckoutService } from '../../features/checkout/services/checkout.service';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { CheckoutButton } from '../../features/checkout/components/checkout-button/checkout-button';
import { MapViewerComponent } from './map-viewer';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { Event, TicketType, TicketConfiguration } from '../../models/event.model';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingSpinner,
    CurrencyFormatPipe,
    DateFormatPipe,
    CheckoutButton,
    MapViewerComponent,
  ],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly ordersService = inject(Orders);
  private readonly checkoutService = inject(CheckoutService);
  private readonly toastService = inject(ToastService);

  readonly event = this.eventService.selectedEvent;
  readonly isLoading = this.eventService.isLoading;

  readonly ticketConfigurations = computed(() => {
    const event = this.event();
    const configs = event?.ticketConfigurations || [];
    return configs;
  });

  readonly ticketTypes = computed(() => {
    const event = this.event();
    const types = event?.ticketTypes || [];
    return types;
  });

  selectedQuantities: { [key: string]: number } = {};

  constructor() {
    effect(() => {
      const eventData = this.event();
      if (eventData) {
        console.log('%c=== EVENT LOADED ===', 'color: green; font-size: 14px; font-weight: bold;');
        console.log('ID:', eventData.id);
        console.log('Name:', eventData.name);
        console.log('Description:', eventData.description);
        console.log('Start Time:', eventData.startTime);
        console.log('End Time:', eventData.endTime);
        console.log('Date:', eventData.date);
        console.log('ticketConfigurations:', eventData.ticketConfigurations);
        console.log('Full Event Object:', eventData);
        // Clamp selected quantities if new availability is lower
        this.clampSelectedQuantities();
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = Number(id);
      this.eventService.loadEventById(isNaN(numId) ? id : numId);
    }
  }

  ngOnDestroy(): void {
    this.eventService.clearSelectedEvent();
  }

  getTicketConfigurations(): TicketConfiguration[] {
    return this.ticketConfigurations();
  }

  getTicketTypes(): TicketType[] {
    return this.ticketTypes();
  }

  encodeLocation(location: string): string {
    return encodeURIComponent(location);
  }

  increaseQty(config: TicketConfiguration | TicketType) {
    const key = this.getConfigKey(config);
    const currentQty = this.selectedQuantities[key] || 0;
    const max = this.getMaxQty(config);
    if (currentQty < max) {
      this.selectedQuantities[key] = currentQty + 1;
    }
  }

  decreaseQty(config: TicketConfiguration | TicketType) {
    const key = this.getConfigKey(config);
    const currentQty = this.selectedQuantities[key] || 0;
    if (currentQty > 0) {
      this.selectedQuantities[key] = currentQty - 1;
    }
  }

  getConfigKey(config: TicketConfiguration | TicketType): string {
    if ('type' in config && typeof config.type === 'string') {
      return config.type;
    }
    return String((config as TicketType).id);
  }

  private getMaxQty(config: TicketConfiguration | TicketType): number {
    if ('type' in config && typeof config.type === 'string') {
      return (config as TicketConfiguration).availableQuantity || 0;
    }
    const type = config as TicketType;
    // Prefer DB-provided availableQuantity when present
    if (typeof type.availableQuantity === 'number') {
      return type.availableQuantity;
    }
    // Fallback to tickets length if backend returns only remaining tickets
    if (Array.isArray(type.tickets)) {
      return type.tickets.length;
    }
    // Last fallback: totalQuantity (may not reflect sales without DB-provided availability)
    return typeof type.totalQuantity === 'number' ? type.totalQuantity : 0;
  }

  private clampSelectedQuantities(): void {
    const evt = this.event();
    if (!evt) return;

    // For ticketConfigurations (new format)
    if (evt.ticketConfigurations && evt.ticketConfigurations.length > 0) {
      evt.ticketConfigurations.forEach((config: TicketConfiguration) => {
        const key = config.type;
        const max = this.getMaxQty(config);
        const current = this.selectedQuantities[key] || 0;
        if (current > max) {
          this.selectedQuantities[key] = max;
        }
      });
    }

    // For ticketTypes (old format)
    if (evt.ticketTypes && evt.ticketTypes.length > 0) {
      evt.ticketTypes.forEach((type: TicketType) => {
        const key = String(type.id);
        const max = this.getMaxQty(type);
        const current = this.selectedQuantities[key] || 0;
        if (current > max) {
          this.selectedQuantities[key] = max;
        }
      });
    }
  }

  isTicketSoldOut(config: TicketConfiguration | TicketType): boolean {
    return this.getMaxQty(config) === 0;
  }

  getAvailableCount(config: TicketConfiguration | TicketType): number {
    return this.getMaxQty(config);
  }

  getTicketTypeDescription(config: TicketConfiguration | TicketType): string {
    const available = this.getAvailableCount(config);
    if (available === 0) {
      return 'No longer available';
    }
    return `${available} available`;
  }

  getTicketName(config: TicketConfiguration | TicketType): string {
    if ('type' in config && typeof config.type === 'string') {
      return (config as TicketConfiguration).type;
    }
    return (config as TicketType).name;
  }

  getTicketPrice(config: TicketConfiguration | TicketType): number {
    return (config as any).price;
  }

  getTotal(): number {
    const event = this.event();
    if (!event) return 0;
    let total = 0;

    if (event.ticketConfigurations) {
      event.ticketConfigurations.forEach((config: TicketConfiguration) => {
        const qty = this.selectedQuantities[config.type] || 0;
        total += qty * config.price;
      });
    } else if (event.ticketTypes) {
      event.ticketTypes.forEach((type: TicketType) => {
        const qty = this.selectedQuantities[String(type.id)] || 0;
        total += qty * Number(type.price);
      });
    }
    return total;
  }

  getSelectedItems() {
    const currentEvent = this.event();
    const items: {
      ticketTypeId: number;
      ticketTypeName: string;
      quantity: number;
      price: number;
    }[] = [];
    if (!currentEvent) return items;

    if (currentEvent.ticketConfigurations && currentEvent.ticketConfigurations.length > 0) {
      currentEvent.ticketConfigurations.forEach((config: TicketConfiguration, idx: number) => {
        const qty = this.selectedQuantities[config.type] || 0;
        if (qty > 0) {
          items.push({
            ticketTypeId: (config as any).id ?? idx,
            ticketTypeName: config.type,
            quantity: qty,
            price: config.price,
          });
        }
      });
    } else if (currentEvent.ticketTypes && currentEvent.ticketTypes.length > 0) {
      currentEvent.ticketTypes.forEach((type: TicketType) => {
        const qty = this.selectedQuantities[String(type.id)] || 0;
        if (qty > 0) {
          items.push({
            ticketTypeId: Number(type.id),
            ticketTypeName: type.name,
            quantity: qty,
            price: Number(type.price),
          });
        }
      });
    }
    return items;
  }

  checkout() {
    const currentEvent = this.event();
    if (!currentEvent) return;

    const hasSelectedTickets = Object.values(this.selectedQuantities).some((qty: any) => qty > 0);
    if (!hasSelectedTickets) {
      this.toastService.show('Selecciona al menos una entrada', 'warning');
      return;
    }

    this.checkoutService.clearCart();

    if (currentEvent.ticketConfigurations && currentEvent.ticketConfigurations.length > 0) {
      currentEvent.ticketConfigurations.forEach((config: TicketConfiguration, idx: number) => {
        const qty = this.selectedQuantities[config.type] || 0;
        if (qty > 0) {
          this.checkoutService.addToCart(idx, config.type, qty, config.price);
        }
      });
    } else if (currentEvent.ticketTypes && currentEvent.ticketTypes.length > 0) {
      currentEvent.ticketTypes.forEach((type: TicketType) => {
        const qty = this.selectedQuantities[String(type.id)] || 0;
        if (qty > 0) {
          this.checkoutService.addToCart(type.id, type.name, qty, Number(type.price));
        }
      });
    }

    this.router.navigate(['/checkout'], {
      queryParams: {
        eventId: currentEvent.id,
        eventName: currentEvent.name,
        eventImageUrl: currentEvent.imageUrl || this.getEventImage(),
      },
    });
  }

  getEventTags(): string[] {
    const event = this.event();
    if (!event) return [];
    return event.tags || ['#Event', '#Conference'];
  }

  getEventImage(): string {
    const currentEvent = this.event();
    if (!currentEvent?.imageUrl) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdX0ORt3oDTckbcZm16R0Ry13cdxFGeTB4nvNJdrKj3cjIwp6gp5xrHCQbSYoWx7AIgqr_HS1ziiC_QlBfU0WnAYxoDnDSWxg4QEm98wIDgfStLgi1k_dyX-550xTZEciAG6FpJFJ2bidK1IcfWSwMng1uM02GnEolGh2ZizOi1GkQCiWxHusJ_2-nfJQ3Va5T2324Eje8gnj1Vj4oL1VLBMkiQ4bw5ULisBO8yV8Ryfr7by6ynWcE9wl2ZC5uKBMU-dHj-sSaAw3S';
    }

    if (currentEvent.imageUrl.startsWith('http') && !currentEvent.imageUrl.includes('minio')) {
      return currentEvent.imageUrl;
    }

    let filename = currentEvent.imageUrl;
    if (filename.includes('/')) {
      filename = filename.split('/').pop() || filename;
    }

    return `${environment.apiUrl}/events/file/${filename}`;
  }

  hasLowStock(): boolean {
    const configs = this.ticketConfigurations();
    const types = this.ticketTypes();

    return (
      configs.some((c) => this.getAvailableCount(c) < 50 && this.getAvailableCount(c) > 0) ||
      types.some((t) => this.getAvailableCount(t) < 50 && this.getAvailableCount(t) > 0)
    );
  }

  getDuration(): string {
    const event = this.event();
    if (!event?.startTime || !event?.endTime) {
      return '3-4 HOURS APPROX.';
    }

    const start = event.startTime.split(':');
    const end = event.endTime.split(':');
    const startHour = parseInt(start[0]);
    const endHour = parseInt(end[0]);
    const duration = endHour - startHour;

    return `${duration} HOURS`;
  }

  getDoorsTime(): string {
    const event = this.event();
    if (!event?.date) {
      return '19:00';
    }

    // Extraer hora del campo date en formato ISO
    const eventDate = new Date(event.date);
    const hours = eventDate.getHours().toString().padStart(2, '0');
    const minutes = eventDate.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  getStartTime(): string {
    const event = this.event();
    if (!event?.date) {
      return '20:00';
    }

    // Extraer hora del campo date y agregar 1 hora
    const eventDate = new Date(event.date);
    const startHour = (eventDate.getHours() + 1) % 24;
    const minutes = eventDate.getMinutes().toString().padStart(2, '0');

    return `${startHour.toString().padStart(2, '0')}:${minutes}`;
  }
}
