import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService, type EventFilters as IEventFilters } from '../../../services/event.service';

@Component({
  selector: 'app-event-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-filters.html',
  styleUrl: './event-filters.css',
})
export class EventFiltersComponent implements OnInit, OnDestroy {
  private readonly eventService = inject(EventService);

  // Filter form model
  searchQuery = '';
  location = '';
  selectedCategory = 'All';
  priceMax = 500;
  dateFrom = '';

  // Available categories
  categories = ['All', 'Music', 'Arts & Theater', 'Sports', 'Technology', 'Business'];

  ngOnInit(): void {
    // Initialize from service filters if they exist
    const currentFilters = this.eventService.filters();
    if (currentFilters.searchQuery) this.searchQuery = currentFilters.searchQuery;
    if (currentFilters.location) this.location = currentFilters.location;
    if (currentFilters.category) this.selectedCategory = currentFilters.category;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  applyFilters(): void {
    const filters: IEventFilters = {
      searchQuery: this.searchQuery || undefined,
      location: this.location || undefined,
      category: this.selectedCategory && this.selectedCategory !== 'All' ? this.selectedCategory : undefined,
    };
    this.eventService.updateFilters(filters);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.location = '';
    this.selectedCategory = 'All';
    this.priceMax = 500;
    this.dateFrom = '';
    this.eventService.clearFilters();
  }

  ngOnDestroy(): void {
    // Filters persist in service
  }
}
