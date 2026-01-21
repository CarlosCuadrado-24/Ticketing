import { Component, OnInit, signal, ChangeDetectionStrategy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topEventsChart') topEventsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ticketsStatusChart') ticketsStatusChartRef!: ElementRef<HTMLCanvasElement>;

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private salesChart?: Chart;
  private revenueChart?: Chart;
  private topEventsChart?: Chart;
  private ticketsStatusChart?: Chart;

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

    this.createSalesChart(stats);
    this.createRevenueChart(stats);
    this.createTopEventsChart(stats);
    this.createTicketsStatusChart(stats);
  }

  private createSalesChart(stats: DashboardStats) {
    if (!this.salesChartRef?.nativeElement) return;

    const ctx = this.salesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Generate last 6 months data (mock for now - could come from backend)
    const months = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'];
    const salesData = this.generateMockSalesData(6);

    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Tickets Vendidos',
          data: salesData,
          borderColor: '#FF4D00',
          backgroundColor: 'rgba(255, 77, 0, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#FF4D00',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#fff', font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: '#1A1A1A',
            borderColor: '#FF4D00',
            borderWidth: 1,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#999' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          x: {
            ticks: { color: '#999' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        }
      }
    });
  }

  private createRevenueChart(stats: DashboardStats) {
    if (!this.revenueChartRef?.nativeElement) return;

    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const months = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'];
    const revenueData = this.generateMockRevenueData(6);

    this.revenueChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Ingresos (COP)',
          data: revenueData,
          backgroundColor: 'rgba(57, 255, 20, 0.7)',
          borderColor: '#39FF14',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#fff', font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: '#1A1A1A',
            borderColor: '#39FF14',
            borderWidth: 1,
            callbacks: {
              label: (context) => `Ingresos: $${context.parsed.y?.toLocaleString() || '0'}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#999',
              callback: (value) => `$${Number(value).toLocaleString()}`
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          x: {
            ticks: { color: '#999' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        }
      }
    });
  }

  private createTopEventsChart(stats: DashboardStats) {
    if (!this.topEventsChartRef?.nativeElement) return;

    const ctx = this.topEventsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const topEvents = stats.topEvents.slice(0, 5);
    const labels = topEvents.map(e => e.eventName.length > 20 ? e.eventName.substring(0, 20) + '...' : e.eventName);
    const data = topEvents.map(e => e.ticketsSold);

    this.topEventsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
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
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#fff', font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: '#1A1A1A',
            borderColor: '#FF4D00',
            borderWidth: 1,
          }
        }
      }
    });
  }

  private createTicketsStatusChart(stats: DashboardStats) {
    if (!this.ticketsStatusChartRef?.nativeElement) return;

    const ctx = this.ticketsStatusChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Mock status distribution
    const soldPercentage = 70;
    const reservedPercentage = 15;
    const availablePercentage = 15;

    this.ticketsStatusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Vendidos', 'Reservados', 'Disponibles'],
        datasets: [{
          data: [soldPercentage, reservedPercentage, availablePercentage],
          backgroundColor: [
            'rgba(57, 255, 20, 0.8)',
            'rgba(255, 193, 7, 0.8)',
            'rgba(255, 77, 0, 0.8)',
          ],
          borderColor: '#0A0A0A',
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#fff', font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: '#1A1A1A',
            borderColor: '#FF4D00',
            borderWidth: 1,
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}%`
            }
          }
        }
      }
    });
  }

  private generateMockSalesData(count: number): number[] {
    const base = this.stats()?.overview.totalTicketsSold || 100;
    return Array.from({ length: count }, (_, i) => Math.floor(base * (0.5 + Math.random() * 0.5) / count));
  }

  private generateMockRevenueData(count: number): number[] {
    const base = this.stats()?.overview.totalRevenue || 1000000;
    return Array.from({ length: count }, (_, i) => Math.floor(base * (0.5 + Math.random() * 0.5) / count));
  }
}
