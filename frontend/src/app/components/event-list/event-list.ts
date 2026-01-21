import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../services/event.service';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { EventCard } from '../../shared/components/event-card/event-card';
import { EventFiltersComponent } from '../../shared/components/event-filters/event-filters';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, LoadingSpinner, EventCard, EventFiltersComponent],
  templateUrl: './event-list.html',
  styleUrl: './event-list.css',
})
export class EventList implements OnInit, OnDestroy {
  private readonly eventService = inject(EventService);

  // Access signals from service
  readonly events = this.eventService.filteredEvents;
  readonly isLoading = this.eventService.isLoading;

  // Mobile filters modal
  readonly showFilters = signal(false);

  toggleFilters(): void {
    this.showFilters.update((v) => !v);
  }

  ngOnInit(): void {
    this.eventService.loadEvents();
  }

  ngOnDestroy(): void {
    this.eventService.clearFilters();
  }
}
