import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  readonly menuItems: MenuItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'icon-dashboard', adminOnly: true },
    { path: '/admin/events', label: 'Eventos', icon: 'icon-events' },
    { path: '/admin/tickets', label: 'Tickets', icon: 'icon-tickets' },
    { path: '/admin/qr-scanner', label: 'Escáner QR', icon: 'icon-qr-scanner' },
    { path: '/admin/users', label: 'Usuarios', icon: 'icon-users', adminOnly: true },
  ];

  readonly visibleMenuItems = computed(() => {
    const user = this.currentUser();
    if (!user) return [];

    return this.menuItems.filter((item) => {
      if (item.adminOnly && user.role !== 'ADMIN') {
        return false;
      }
      return true;
    });
  });

  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  readonly isOrganizer = computed(() => this.currentUser()?.role === 'ORGANIZER');

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        console.log('[AdminLayout] Logout successful');
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('[AdminLayout] Logout error:', error);
        // Navigate anyway since auth data is cleared
        this.router.navigate(['/']);
      }
    });
  }
}
