import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../services/event.service';
import { AdminService } from '../../../services/admin.service';
import { Event } from '../../../models/event.model';
import { EventCategory } from '../../../models/admin.model';
import { finalize } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-events.component.html',
  styleUrl: './admin-events.component.css',
})
export class AdminEventsComponent implements OnInit {
  events = signal<Event[]>([]);
  filteredEvents = signal<Event[]>([]);
  categories = Object.values(EventCategory);
  selectedCategory = signal('');
  searchTerm = signal('');
  page = signal(1);
  private readonly pageSize = 6;
  loading = signal(true);
  error = signal<string | null>(null);

  private readonly eventService = inject(EventService);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  // Mock data for tickets sold and revenue - in real app, this would come from API
  private eventStats: { [eventId: string]: { ticketsSold: number; revenue: number } } = {};

  ngOnInit() {
    this.initializeData();
  }

  private async initializeData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.loadEventsPromise();
      this.loadEventStats();
    } catch (err) {
      this.error.set('Error al cargar los datos. Intenta nuevamente.');
      console.warn('[AdminEvents] Error inicializando datos');
    } finally {
      this.loading.set(false);
    }
  }

  private loadEventsPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[AdminEvents] Starting to load events...');

      this.eventService.events$.subscribe({
        next: (loadedEvents) => {
          console.log('[AdminEvents] Events loaded from service:', loadedEvents.length);
          this.events.set(loadedEvents);
          this.filteredEvents.set(loadedEvents);
          resolve();
        },
        error: (err: any) => {
          console.warn('[AdminEvents] Error loading events');
          reject(err);
        },
      });

      // Trigger the API call
      this.eventService.loadEvents();
    });
  }

  loadEvents() {
    this.initializeData();
  }

  loadEventStats() {
    console.log('[AdminEvents] Loading stats for events...');
    const events = this.events();

    if (events.length === 0) {
      return;
    }

    // Load stats for each event with Promise.all for better performance
    const statsPromises = events.map(
      (event) =>
        new Promise<void>((resolve) => {
          this.adminService.getTicketStats(event.id.toString()).subscribe({
            next: (stats) => {
              this.eventStats[event.id] = {
                ticketsSold: stats.totalTicketsSold,
                revenue: stats.totalRevenue,
              };
              console.log(`[AdminEvents] Stats loaded for event ${event.id}`);
              resolve();
            },
            error: (error: any) => {
              console.warn(`Error loading stats for event ${event.id}`);
              resolve();
            },
          });
        }),
    );

    // Wait for all stats to load
    Promise.all(statsPromises).then(() => {
      console.log('[AdminEvents] All stats loaded');
    });
  }

  filterEvents() {
    const filtered = this.events().filter((event) => {
      const matchesCategory =
        !this.selectedCategory() || event.eventDetails?.[0]?.category === this.selectedCategory();

      const matchesSearch =
        !this.searchTerm() ||
        event.name.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
        event.location.toLowerCase().includes(this.searchTerm().toLowerCase());

      return matchesCategory && matchesSearch;
    });
    this.filteredEvents.set(filtered);
    this.page.set(1);
  }

  /**
   * Pagination helpers
   */
  getTotalPages(): number {
    const total = this.filteredEvents().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  getVisibleEvents(): Event[] {
    const all = this.filteredEvents();
    const start = (this.page() - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  }

  changePage(newPage: number) {
    const total = this.getTotalPages();
    const target = Math.min(Math.max(1, Math.trunc(newPage)), total);
    this.page.set(target);
  }

  onCategoryChange(event: any) {
    this.selectedCategory.set(event.target.value);
    this.filterEvents();
  }

  getTicketsSold(eventId: string): number {
    return this.eventStats[eventId]?.ticketsSold || 0;
  }

  /**
   * Calcula los tickets vendidos de un evento basándose en su configuración
   * Tickets Vendidos = Total Quantity - Available Quantity
   */
  getTicketsSoldByEvent(event: Event): number {
    if (!event.ticketConfigurations || !event.ticketConfigurations[0]) {
      return 0;
    }
    const config = event.ticketConfigurations[0];
    return (config.totalQuantity || 0) - (config.availableQuantity || 0);
  }

  /**
   * Calcula la capacidad total del evento
   */
  getTotalCapacity(event: Event): number {
    if (!event.ticketConfigurations || !event.ticketConfigurations[0]) {
      return 0;
    }
    return event.ticketConfigurations[0].totalQuantity || 0;
  }

  /**
   * Calcula el porcentaje de tickets vendidos
   */
  getTicketPercentage(event: Event): number {
    const total = this.getTotalCapacity(event);
    if (total === 0) return 0;
    const sold = this.getTicketsSoldByEvent(event);
    return Math.round((sold / total) * 100);
  }

  /**
   * VIP helpers
   */
  getVipSoldByEvent(event: Event): number {
    if (!event.ticketConfigurations || !event.ticketConfigurations[1]) {
      return 0;
    }
    const cfg = event.ticketConfigurations[1];
    return (cfg.totalQuantity || 0) - (cfg.availableQuantity || 0);
  }

  getVipTotalCapacity(event: Event): number {
    if (!event.ticketConfigurations || !event.ticketConfigurations[1]) {
      return 0;
    }
    return event.ticketConfigurations[1].totalQuantity || 0;
  }

  getVipPercentage(event: Event): number {
    const total = this.getVipTotalCapacity(event);
    if (total === 0) return 0;
    const sold = this.getVipSoldByEvent(event);
    return Math.round((sold / total) * 100);
  }

  /**
   * Obtiene la imagen del evento o usa un placeholder
   */
  getEventImage(event: Event): string {
    return event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400';
  }

  /**
   * Determina si el evento está publicado
   */
  isPublished(event: Event): boolean {
    // Puedes ajustar esta lógica según tu modelo
    return event.date ? new Date(event.date) > new Date() : false;
  }

  /**
   * Calcula el ingreso total de un evento
   * Ingresos = Tickets Vendidos × Precio
   */
  calculateEventRevenue(event: Event): number {
    const ticketsSold = this.getTicketsSoldByEvent(event);
    const price = event.ticketConfigurations?.[0]?.price || 0;
    return ticketsSold * price;
  }

  getRevenue(eventId: string): number {
    return this.eventStats[eventId]?.revenue || 0;
  }

  deleteEvent(eventId: string, eventName: string) {
    const confirmed = confirm(
      `¿Estás seguro de que deseas eliminar el evento "${eventName}"?\n\n` +
        'Esta acción no se puede deshacer. Se eliminarán:\n' +
        '• El evento\n' +
        '• Todas las configuraciones de tickets\n' +
        '• Los registros asociados\n\n' +
        '⚠️ ADVERTENCIA: Esta acción es permanente.',
    );

    if (!confirmed) {
      return;
    }

    this.loading.set(true);
    this.eventService
      .deleteEvent(eventId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success(`Evento "${eventName}" eliminado exitosamente`);
          // Update local state
          const updatedEvents = this.events().filter((e) => e.id.toString() !== eventId);
          this.events.set(updatedEvents);
          this.filterEvents();
        },
        error: (error) => {
          console.error('[AdminEvents] Error deleting event:', error);
          this.toastService.error(
            'Error al eliminar el evento. ' + (error.message || 'Intenta nuevamente.'),
          );
        },
      });
  }
}
