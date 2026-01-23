import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketsService, Ticket } from '../../core/services/tickets.service';
import { AuthService } from '../../core/services/auth.service';
import { Events } from '../../services/events';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { environment } from '../../../environments/environment';

interface DisplayTicket {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketType: string;
  price: number;
  qrCode: string;
  purchaseDate: string;
  status: 'upcoming' | 'past' | 'cancelled';
  seatNumber?: string;
}

interface EventGroup {
  eventId: string;
  eventName: string;
  eventImageUrl: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  status: 'upcoming' | 'past' | 'cancelled';
  tickets: DisplayTicket[];
  ticketCount: number;
  totalPrice: number;
  currentTicketIndex: number;
}

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyFormatPipe],
  templateUrl: './my-tickets.html',
  styleUrl: './my-tickets.css',
})
export class MyTicketsComponent implements OnInit {
  private readonly ticketsService = inject(TicketsService);
  private readonly authService = inject(AuthService);
  private readonly eventsService = inject(Events);
  readonly router = inject(Router); // Make router public for template

  // Signals
  protected readonly tickets = signal<DisplayTicket[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showAuthWarning = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly activeTab = signal<'upcoming' | 'history'>('upcoming');
  protected readonly expandedEventId = signal<string | null>(null);

  // Computed - Grouped tickets
  protected readonly groupedTickets = computed(() => {
    const tickets = this.tickets();
    const query = this.searchQuery().toLowerCase();
    const tab = this.activeTab();

    // Filter tickets
    const filtered = tickets.filter((ticket) => {
      const matchesTab =
        tab === 'upcoming'
          ? ticket.status === 'upcoming'
          : ticket.status === 'past' || ticket.status === 'cancelled';

      const matchesSearch =
        query === '' ||
        ticket.eventName.toLowerCase().includes(query) ||
        ticket.venue.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });

    // Group by eventId
    const groups = new Map<string, DisplayTicket[]>();
    filtered.forEach((ticket) => {
      if (!groups.has(ticket.eventId)) {
        groups.set(ticket.eventId, []);
      }
      groups.get(ticket.eventId)!.push(ticket);
    });

    // Create EventGroup objects
    const eventGroups: EventGroup[] = [];
    groups.forEach((ticketsInGroup, eventId) => {
      if (ticketsInGroup.length > 0) {
        const firstTicket = ticketsInGroup[0];
        eventGroups.push({
          eventId,
          eventName: firstTicket.eventName,
          eventImageUrl: firstTicket.eventImageUrl,
          eventDate: firstTicket.eventDate,
          eventTime: firstTicket.eventTime,
          venue: firstTicket.venue,
          status: firstTicket.status,
          tickets: ticketsInGroup,
          ticketCount: ticketsInGroup.length,
          totalPrice: ticketsInGroup.reduce((sum, t) => sum + t.price, 0),
          currentTicketIndex: 0,
        });
      }
    });

    return eventGroups;
  });

  // Computed - Tab counts
  protected readonly upcomingCount = computed(() => {
    return this.tickets().filter((t) => t.status === 'upcoming').length;
  });

  protected readonly historyCount = computed(() => {
    return this.tickets().filter((t) => t.status === 'past' || t.status === 'cancelled').length;
  });

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading.set(true);
    this.error.set(null);

    console.log('[MyTickets] Loading tickets...');
    console.log('[MyTickets] Is authenticated?', this.authService.isAuthenticated());

    // Check authentication
    if (!this.authService.isAuthenticated()) {
      console.warn('[MyTickets] User not authenticated');
      this.showAuthWarning.set(true);
    }

    // Try to load from backend
    this.ticketsService.getUserTickets().subscribe({
      next: (backendTickets) => {
        console.log('[MyTickets] Backend tickets loaded:', backendTickets.length);

        // Get unique event IDs
        const eventIds = [...new Set(backendTickets.map((t) => t.eventId))];
        console.log('[MyTickets] Fetching event details for:', eventIds);

        if (eventIds.length === 0) {
          // No tickets from backend
          this.tickets.set([]);
          this.isLoading.set(false);
          return;
        }

        // Fetch event details
        const eventRequests = eventIds.map((id) =>
          this.eventsService.getEvent(id).pipe(
            catchError((err) => {
              console.error(`[MyTickets] Error loading event ${id}:`, err);
              return of(null);
            }),
          ),
        );

        forkJoin(eventRequests).subscribe({
          next: (events) => {
            console.log('[MyTickets] Events loaded:', events.length);

            // Create event map
            const eventMap = new Map<string, any>();
            events.forEach((event) => {
              if (event && event.id) {
                eventMap.set(event.id.toString(), event);
              }
            });

            // Map tickets with event data
            const enrichedTickets = this.mapBackendTicketsWithEvents(backendTickets, eventMap);

            console.log('[MyTickets] Total tickets:', enrichedTickets.length);
            this.tickets.set(enrichedTickets);
            this.isLoading.set(false);
            this.showAuthWarning.set(false);
          },
          error: (err: any) => {
            console.error('[MyTickets] Error loading events:', err);
            // Still show tickets without event enrichment
            const tickets = this.mapBackendTickets(backendTickets);
            this.tickets.set(tickets);
            this.isLoading.set(false);
          },
        });
      },
      error: (error) => {
        console.error('[MyTickets] Error loading tickets from backend:', error);

        // Handle authentication errors
        if (error.status === 401 || error.status === 403 || error.status === 500) {
          this.showAuthWarning.set(true);
          this.error.set('Por favor inicia sesión para ver tus entradas.');
        } else {
          this.error.set('No se pudieron cargar las entradas del servidor.');
        }

        this.tickets.set([]);
        this.isLoading.set(false);
      },
    });
  }

  private mapBackendTickets(tickets: Ticket[]): DisplayTicket[] {
    return tickets.map((t) => ({
      id: t.id,
      eventId: t.eventId,
      eventName: `Event ${t.eventId.substring(0, 8)}`, // Placeholder - backend should return eventName
      eventImageUrl: '', // Placeholder - backend should return eventImageUrl
      eventDate: t.purchaseDate, // Use purchase date as placeholder
      eventTime: '00:00', // Placeholder - backend should return eventDate and eventTime
      venue: 'Ver detalles del evento', // Placeholder - backend should return venue
      ticketType: t.type,
      price: t.price,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.qrToken}`,
      purchaseDate: t.purchaseDate,
      status: this.mapTicketStatus(t.status, t.purchaseDate),
      seatNumber: undefined,
    }));
  }

  private mapBackendTicketsWithEvents(
    tickets: Ticket[],
    eventMap: Map<string, any>,
  ): DisplayTicket[] {
    return tickets.map((t) => {
      const event = eventMap.get(t.eventId);
      return {
        id: t.id,
        eventId: t.eventId,
        eventName: event?.name || `Event ${t.eventId.substring(0, 8)}`,
        eventImageUrl: this.getEventImageUrl(event?.imageUrl),
        eventDate: event?.date || t.purchaseDate,
        eventTime: event?.time || '00:00',
        venue: event?.location || 'Ver detalles del evento',
        ticketType: t.type,
        price: t.price,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.qrToken}`,
        purchaseDate: t.purchaseDate,
        status: this.mapTicketStatus(t.status, t.purchaseDate),
        seatNumber: undefined,
      };
    });
  }

  /**
   * Constructs the full image URL from the imageUrl field
   * Handles both full URLs and filename-only values
   */
  private getEventImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return '';
    }

    // If it's already a full URL (http/https) and not from minio, return as-is
    if (imageUrl.startsWith('http') && !imageUrl.includes('minio')) {
      return imageUrl;
    }

    // Extract filename if it contains a path
    let filename = imageUrl;
    if (filename.includes('/')) {
      filename = filename.split('/').pop() || filename;
    }

    // Build the full URL using the API endpoint
    return `${environment.apiUrl}/events/file/${filename}`;
  }

  /**
   * Maps backend ticket status (PAID, USED) to display status (upcoming, past, cancelled)
   * PAID → upcoming (not yet used)
   * USED → past (already used)
   */
  private mapTicketStatus(
    backendStatus: string,
    purchaseDate: string,
  ): 'upcoming' | 'past' | 'cancelled' {
    if (backendStatus === 'USED') {
      return 'past';
    }
    // PAID tickets are considered upcoming until used
    return 'upcoming';
  }

  setActiveTab(tab: 'upcoming' | 'history') {
    this.activeTab.set(tab);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  toggleEventDetails(eventId: string) {
    if (this.expandedEventId() === eventId) {
      this.expandedEventId.set(null);
    } else {
      this.expandedEventId.set(eventId);
    }
  }

  nextTicket(eventGroup: EventGroup) {
    if (eventGroup.currentTicketIndex < eventGroup.tickets.length - 1) {
      eventGroup.currentTicketIndex++;
    }
  }

  previousTicket(eventGroup: EventGroup) {
    if (eventGroup.currentTicketIndex > 0) {
      eventGroup.currentTicketIndex--;
    }
  }

  getCurrentTicket(eventGroup: EventGroup): DisplayTicket {
    return eventGroup.tickets[eventGroup.currentTicketIndex];
  }

  downloadTicket(ticketId: string) {
    const allTickets = this.tickets();
    const ticket = allTickets.find((t) => t.id === ticketId);

    if (!ticket) {
      console.error('Ticket not found:', ticketId);
      return;
    }

    // Use backend endpoint to download PNG with brutalist design
    const downloadUrl = `${environment.apiUrl}/tickets/${ticketId}/download`;

    // Open in new tab to force download
    window.open(downloadUrl, '_blank');
  }

  cancelTicket(ticketId: string) {
    if (confirm('¿Estás seguro de que quieres cancelar esta entrada?')) {
      this.ticketsService.cancelTicket(ticketId).subscribe({
        next: () => {
          this.loadTickets();
        },
        error: (error) => console.error('Error cancelling ticket:', error),
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'upcoming':
        return 'bg-green-100 text-green-800';
      case 'past':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(time: string): string {
    if (!time || time === '00:00') return 'Ver evento';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
