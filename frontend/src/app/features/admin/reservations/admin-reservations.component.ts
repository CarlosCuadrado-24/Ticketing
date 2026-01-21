import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { EventService } from '../../../services/event.service';
import { AdminReservationData, ReservationsQuery } from '../../../models/admin.model';
import { Event } from '../../../models/event.model';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe],
  templateUrl: './admin-reservations.component.html',
  styleUrl: './admin-reservations.component.css',
})
export class AdminReservationsComponent implements OnInit {
  reservations: AdminReservationData[] = [];
  events: Event[] = [];
  filters: ReservationsQuery = { page: 1, limit: 10 };
  pagination: any = null;
  loading = true;
  error: string | null = null;

  constructor(
    private adminService: AdminService,
    private eventService: EventService,
  ) {}

  ngOnInit() {
    this.initializeData();
  }

  private async initializeData() {
    this.loading = true;
    this.error = null;

    try {
      // Esperar a que se carguen los eventos primero
      await this.loadEventsPromise();
      // Luego cargar las reservas
      await this.loadReservationsPromise();
    } catch (err) {
      this.error = 'Error al cargar los datos';
      console.warn('Error cargando datos iniciales');
    } finally {
      this.loading = false;
    }
  }

  private loadEventsPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.eventService.loadEvents();
      // Pequeño delay para asegurar que el signal se actualice
      setTimeout(() => {
        this.events = this.eventService.events();
        resolve();
      }, 100);
    });
  }

  private loadReservationsPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.adminService.getReservations(this.filters).subscribe({
        next: (response) => {
          this.reservations = response.data.map((reservation) => ({
            ...reservation,
            eventName: this.getEventName(reservation.eventId),
          }));
          this.pagination = response.pagination;
          resolve();
        },
        error: (error) => {
          this.error = error.message || 'Error al cargar las reservas';
          reject(error);
        },
      });
    });
  }

  loadReservations() {
    this.filters.page = 1;
    this.loadPageData();
  }

  changePage(page: number) {
    this.filters.page = page;
    this.loadPageData();
  }

  private loadPageData() {
    this.loading = true;
    this.error = null;

    this.loadReservationsPromise()
      .then(() => {
        this.loading = false;
      })
      .catch(() => {
        this.loading = false;
      });
  }

  isExpired(expiresAt: Date): boolean {
    return new Date(expiresAt) < new Date();
  }

  private getEventName(eventId: string): string {
    const event = this.events.find((e) => e.id === eventId);
    return event ? event.name : 'Evento no encontrado';
  }
}
