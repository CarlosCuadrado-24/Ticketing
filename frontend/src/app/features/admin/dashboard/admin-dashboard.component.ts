import {
  Component,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { DashboardStats } from '../../../models/admin.model';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('topEventsChart') topEventsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('eventsByMonthChart') eventsByMonthChartRef!: ElementRef<HTMLCanvasElement>;

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private topEventsChart?: Chart;
  private eventsByMonthChart?: Chart;

  constructor(private adminService: AdminService) {
    console.log('[AdminDashboard] Constructor called');
  }

  ngOnInit() {
    console.log('[AdminDashboard] ngOnInit called');
    this.loadDashboardStats();
  }

  ngAfterViewInit() {
    // Charts will be created after data is loaded
  }

  loadDashboardStats() {
    this.loading.set(true);
    this.error.set(null);

    console.log('[AdminDashboard] Loading dashboard stats...');
    this.adminService.getDashboardStats().subscribe({
      next: (stats) => {
        console.log('[AdminDashboard] Stats received:', stats);
        this.stats.set(stats);
        this.loading.set(false);
        console.log('[AdminDashboard] Stats set, loading = false');

        // Create charts after data is loaded
        setTimeout(() => this.createCharts(), 100);
      },
      error: (error) => {
        console.error('[AdminDashboard] Error loading stats:', error);
        this.error.set(error.message || 'Error al cargar las estadísticas');
        this.loading.set(false);
      },
    });
  }

  private createCharts() {
    const stats = this.stats();
    if (!stats) return;

    // Only create charts with real data from backend
    this.createTopEventsChart(stats);
    this.createEventsByMonthChart(stats);
  }

  private createTopEventsChart(stats: DashboardStats) {
    if (!this.topEventsChartRef?.nativeElement) return;

    const ctx = this.topEventsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const topEvents = stats.topEvents.slice(0, 5);
    const labels = topEvents.map((e) =>
      e.eventName.length > 20 ? e.eventName.substring(0, 20) + '...' : e.eventName,
    );
    const data = topEvents.map((e) => e.ticketsSold);

    this.topEventsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              'rgba(255, 77, 0, 0.8)',
              'rgba(57, 255, 20, 0.8)',
              'rgba(255, 193, 7, 0.8)',
              'rgba(33, 150, 243, 0.8)',
              'rgba(156, 39, 176, 0.8)',
            ],
            borderColor: '#0A0A0A',
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#fff', font: { size: 11 } },
          },
          tooltip: {
            backgroundColor: '#1A1A1A',
            borderColor: '#FF4D00',
            borderWidth: 1,
          },
        },
      },
    });
  }

  private createEventsByMonthChart(stats: DashboardStats) {
    if (!this.eventsByMonthChartRef?.nativeElement) return;

    const ctx = this.eventsByMonthChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Take last 6 months and reverse to show chronologically
    const monthsData = stats.eventsByMonth.slice(0, 6).reverse();
    const labels = monthsData.map((m) => {
      const [year, month] = m.month.split('-');
      const monthNames = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
      ];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    });
    const data = monthsData.map((m) => m.count);

    this.eventsByMonthChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Eventos Creados',
            data,
            backgroundColor: 'rgba(255, 77, 0, 0.7)',
            borderColor: '#FF4D00',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#fff', font: { size: 12 } },
          },
          tooltip: {
            backgroundColor: '#1A1A1A',
            borderColor: '#FF4D00',
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#999',
              stepSize: 1,
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
          },
          x: {
            ticks: { color: '#999' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
          },
        },
      },
    });
  }
}
