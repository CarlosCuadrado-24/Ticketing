import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CheckoutService } from '../../services/checkout.service';
import { CartItem } from '../../services/cart.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'checkout-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-button.html',
  styleUrl: './checkout-button.css',
})
export class CheckoutButton {
  private readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  @Input() items: CartItem[] = [];
  @Input() eventId?: string | number;
  @Input() eventName?: string;
  @Input() disabled: boolean = false;

  goToCheckout(): void {
    // Validate items
    const validItems = (this.items || []).filter((i) => i && i.quantity > 0);
    if (validItems.length === 0) {
      this.toastService.show('Selecciona al menos una entrada', 'warning');
      return;
    }

    // Require authentication before proceeding
    if (!this.authService.isAuthenticated()) {
      this.toastService.show('Inicia sesión para continuar con el pago', 'info');
      // Save intended checkout so we can resume after login
      this.checkoutService.savePendingCheckout();
      this.router.navigate(['/login'], { queryParams: { redirect: '/checkout' } });
      return;
    }

    console.log('Starting checkout with items:', validItems);

    // Load items into cart
    this.checkoutService.clearCart();
    for (const item of validItems) {
      this.checkoutService.addToCart(
        item.ticketTypeId,
        item.ticketTypeName,
        item.quantity,
        item.price,
      );
    }

    // Save event info for confirmation page
    this.checkoutService.setEventInfo(this.eventId, this.eventName);

    // Navigate to checkout
    this.router.navigate(['/checkout'], {
      queryParams: {
        eventId: this.eventId,
        eventName: this.eventName,
      },
    });
  }
}
