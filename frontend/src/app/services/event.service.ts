import { Injectable, signal, computed } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Events } from './events';
import { Event } from '../models/event.model';
import { WebSocketService } from '../core/services/websocket.service';

export interface EventFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  searchQuery?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EventService {
  // Signals
  private readonly _events = signal<Event[]>([]);
  private readonly _selectedEvent = signal<Event | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _filters = signal<EventFilters>({});

  // Observable for components that need to wait for events
  private readonly eventsLoaded$ = new Subject<Event[]>();
  readonly events$ = this.eventsLoaded$.asObservable();

  // Track active WebSocket subscriptions by eventId
  private wsSubscriptions = new Map<string | number, any>();

  // Public read-only signals
  readonly events = this._events.asReadonly();
  readonly selectedEvent = this._selectedEvent.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly filters = this._filters.asReadonly();

  // Computed signals
  readonly filteredEvents = computed(() => {
    const events = this._events();
    const filters = this._filters();

    return events.filter((event) => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (
          !event.name.toLowerCase().includes(query) &&
          !event.location.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (filters.category && event.id) {
        // TODO: Add category filtering when Event model includes category
      }

      if (filters.location) {
        if (!event.location.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
      }

      if (filters.dateFrom) {
        if (new Date(event.date) < new Date(filters.dateFrom)) {
          return false;
        }
      }

      if (filters.dateTo) {
        if (new Date(event.date) > new Date(filters.dateTo)) {
          return false;
        }
      }

      return true;
    });
  });

  constructor(
    private eventsApi: Events,
    private wsService: WebSocketService,
  ) {}

  loadEvents(): void {
    this._isLoading.set(true);
    this.eventsApi.getEvents().subscribe({
      next: (data) => {
        console.log('[EventService] Events loaded:', data.length);
        this._events.set(data);
        this._isLoading.set(false);
        // Emit the events for subscribers waiting for the data
        this.eventsLoaded$.next(data);
      },
      error: (err: any) => {
        console.error('Error loading events:', err);
        this._isLoading.set(false);
        this.eventsLoaded$.error(err);
      },
    });
  }

  loadEventById(id: number | string): void {
    this._isLoading.set(true);
    this.eventsApi.getEvent(id).subscribe({
      next: (data) => {
        this._selectedEvent.set(data);
        this._isLoading.set(false);

        // Subscribe to WebSocket updates using the actual event ID (UUID) from the API response
        // not the URL parameter which might be a code like "TICK0009-004"
        if (data && data.id) {
          this.subscribeToEventUpdates(data.id);
        }
      },
      error: (err: any) => {
        console.error('Error loading event:', err);
        this._isLoading.set(false);
      },
    });
  }

  /**
   * Subscribe to real-time availability updates via WebSocket.
   * When an update arrives, refetch the event to get the latest data.
   */
  private subscribeToEventUpdates(eventId: string | number): void {
    const eventIdStr = String(eventId);

    console.log(
      '%c[EventService] 🔔 Attempting WebSocket subscription for event UUID:',
      'color: blue; font-weight: bold;',
      eventIdStr,
    );

    // Check if already subscribed with a valid subscription
    const existingSub = this.wsSubscriptions.get(eventIdStr);
    if (existingSub && !existingSub.closed) {
      console.log('[EventService] Already subscribed to event:', eventIdStr);
      return;
    }

    // Clean up old subscription if it exists but is closed
    if (existingSub) {
      console.log('[EventService] Cleaning up closed subscription for event:', eventIdStr);
      this.wsSubscriptions.delete(eventIdStr);
    }

    console.log(
      '%c[EventService] 🔔 Setting up WebSocket subscription for event:',
      'color: blue; font-weight: bold;',
      eventIdStr,
    );

    const subscription = this.wsService.subscribeToEvent(eventIdStr).subscribe(
      (update) => {
        if (update) {
          console.log(
            '%c[EventService] 🎫 AVAILABILITY UPDATE RECEIVED!',
            'color: green; font-size: 14px; font-weight: bold;',
          );
          console.log('[EventService] Update details:', update);
          console.log('[EventService] Refetching event:', eventIdStr);

          // Refetch the event to get updated availability
          this.eventsApi.getEvent(eventIdStr).subscribe({
            next: (data) => {
              console.log(
                '%c[EventService] ✅ Event refetched successfully',
                'color: green; font-weight: bold;',
              );
              console.log('[EventService] New ticketConfigurations:', data.ticketConfigurations);
              // Force a new object reference to ensure change detection
              this._selectedEvent.set({ ...data });
            },
            error: (err: any) => {
              console.error('[EventService] Error refetching event after WebSocket update:', err);
            },
          });
        }
      },
      (error) => {
        console.error('[EventService] WebSocket subscription error:', error);
      },
    );

    this.wsSubscriptions.set(eventIdStr, subscription);
  }

  updateFilters(filters: Partial<EventFilters>): void {
    this._filters.update((current) => ({ ...current, ...filters }));
  }

  clearFilters(): void {
    this._filters.set({});
  }

  clearSelectedEvent(): void {
    console.log('[EventService] Clearing selected event and WebSocket subscriptions');
    this._selectedEvent.set(null);
    // Cleanup WebSocket subscriptions
    this.wsSubscriptions.forEach((sub, eventId) => {
      console.log('[EventService] Unsubscribing from event:', eventId);
      this.wsService.unsubscribeFromEvent(String(eventId));
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.wsSubscriptions.clear();
  }

  deleteEvent(id: string | number): Observable<void> {
    return new Observable((observer) => {
      this.eventsApi.deleteEvent(id).subscribe({
        next: () => {
          console.log('[EventService] Event deleted successfully:', id);
          const events = this._events();
          const updatedEvents = events.filter((event) => event.id !== id);
          this._events.set(updatedEvents);
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          console.error('[EventService] Error deleting event:', err);
          observer.error(err);
        },
      });
    });
  }
}
