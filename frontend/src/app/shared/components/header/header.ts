import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MobileMenu } from '../mobile-menu/mobile-menu';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileMenu],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly currentUser = this.authService.currentUser;
  protected readonly mobileMenuOpen = signal(false);

  isBuyer() {
    const user = this.currentUser();
    return user && user.role === 'BUYER';
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update((value) => !value);
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        console.log('[Header] Logout successful');
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('[Header] Logout error:', error);
        // Navigate anyway since auth data is cleared
        this.router.navigate(['/']);
      }
    });
  }
}
