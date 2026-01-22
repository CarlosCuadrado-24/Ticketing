import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { EventCard } from '../../shared/components/event-card/event-card';
import { EventFiltersComponent } from '../../shared/components/event-filters/event-filters';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinner, EventCard, EventFiltersComponent],
  templateUrl: './event-list.html',
  styleUrl: './event-list.css',
})
export class EventList implements OnInit, OnDestroy {
  private readonly eventService = inject(EventService);
  
  // Exponer Math para el template
  readonly Math = Math;

  // Access signals from service
  readonly events = this.eventService.filteredEvents;
  readonly isLoading = this.eventService.isLoading;

  // Mobile filters modal
  readonly showFilters = signal(false);
  
  // Search query
  searchQuery = '';
  
  // Pagination
  readonly currentPage = signal(1);
  readonly eventsPerPage = 4; // Mostrar 4 eventos por página (2x2 en grid)

  toggleFilters(): void {
    this.showFilters.update((v) => !v);
  }
  
  onSearch(): void {
    this.eventService.updateFilters({ searchQuery: this.searchQuery });
  }
  
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.onSearch();
  }

  ngOnInit(): void {
    this.eventService.loadEvents();
  }

  ngOnDestroy(): void {
    this.eventService.clearFilters();
  }
  
  // Métodos de paginación
  get totalPages(): number {
    const total = this.events().length;
    return Math.max(1, Math.ceil(total / this.eventsPerPage));
  }
  
  get paginatedEvents() {
    const allEvents = this.events();
    const start = (this.currentPage() - 1) * this.eventsPerPage;
    return allEvents.slice(start, start + this.eventsPerPage);
  }
  
  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
      // Scroll to top suavemente
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  nextPage(): void {
    if (this.currentPage() < this.totalPages) {
      this.goToPage(this.currentPage() + 1);
    }
  }
  
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }
}
