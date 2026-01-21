import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe],
  templateUrl: './order-summary.html',
  styleUrl: './order-summary.css',
})
export class OrderSummary {
  readonly checkoutService = inject(CheckoutService);

  readonly cart = this.checkoutService.cart;
  readonly subtotal = this.checkoutService.subtotal;
  readonly tax = this.checkoutService.tax; // now used as service fee (5%)
  readonly processingFee = this.checkoutService.processingFee;
  readonly total = this.checkoutService.total;

  removeItem(ticketTypeId: number): void {
    this.checkoutService.removeFromCart(ticketTypeId);
  }
}
