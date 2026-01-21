import { Component, OnInit, OnDestroy, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CheckoutService } from '../../features/checkout/services/checkout.service';
import { OrderSummary } from '../../features/checkout/components/order-summary/order-summary';
import { ReservationTimer } from '../../features/checkout/components/reservation-timer/reservation-timer';
import { ContactForm } from '../../features/checkout/components/contact-form/contact-form';
import { PaymentForm } from '../../features/checkout/components/payment-form/payment-form';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    OrderSummary,
    ReservationTimer,
    ContactForm,
    PaymentForm,
    LoadingSpinner,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit, OnDestroy {
  private readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  @ViewChild(ContactForm) contactForm?: ContactForm;
  @ViewChild(PaymentForm) paymentForm?: PaymentForm;

  readonly isLoading = this.checkoutService.isLoading;
  readonly reservation = this.checkoutService.reservation;
  readonly cartItemCount = this.checkoutService.cartItemCount;
  readonly timeRemaining = this.checkoutService.timeRemaining;
  readonly reservationExpired = this.checkoutService.reservationExpired;

  step: 'contact' | 'payment' | 'confirm' = 'contact';
  errors: string[] = [];
  reservationCreated = false;
  private eventId: string | null = null;

  // Store form data between steps
  private contactData?: { firstName: string; lastName: string; email: string; phone: string };
  private paymentData?: { cardNumber: string; expiryDate: string; cvv: string; cardholderName: string };

  constructor() {
    // Watch for reservation expiration
    effect(() => {
      const expired = this.reservationExpired();
      if (expired) {
        this.handleExpiration();
      }
    });
  }

  ngOnInit(): void {
    // Check if cart is empty
    if (this.checkoutService.cart().length === 0) {
      this.router.navigate(['/']);
      return;
    }

    // Read event info from query params and set in service
    this.route.queryParams.subscribe(async (params) => {
      this.eventId = params['eventId'];
      const eventName = params['eventName'];
      if (this.eventId) {
        this.checkoutService.setEventInfo(this.eventId, eventName);

        // Create reservations when checkout starts (if authenticated)
        if (!this.reservationCreated) {
          try {
            const success = await this.checkoutService.createReservations();
            if (success) {
              this.reservationCreated = true;
              console.log('✅ [Checkout] Reservations created successfully');
            }
          } catch (error: any) {
            console.error('❌ [Checkout] Error creating reservations:', error);
            this.toastService.show(error.message || 'Error al crear la reserva', 'error');
            this.router.navigate(['/event', this.eventId]);
          }
        }
      }
    });
  }

  private handleExpiration(): void {
    this.toastService.show(
      '⏰ Tu reserva ha expirado. Por favor, vuelve a seleccionar tus entradas.',
      'error',
    );

    // Clear the cart and redirect after a short delay
    setTimeout(() => {
      this.checkoutService.clearCart();
      if (this.eventId) {
        this.router.navigate(['/event', this.eventId]);
      } else {
        this.router.navigate(['/']);
      }
    }, 2000);
  }

  nextStep(): void {
    this.errors = [];

    if (this.step === 'contact') {
      if (this.contactForm?.validate()) {
        // Store contact data before moving to next step
        this.contactData = this.contactForm.getFormData();
        this.step = 'payment';
      }
    } else if (this.step === 'payment') {
      if (this.paymentForm?.validate()) {
        // Store payment data before confirming
        const formData = this.paymentForm.getFormData();
        this.paymentData = {
          cardNumber: formData.cardNumber,
          expiryDate: formData.expiryDate,
          cvv: formData.cvv,
          cardholderName: formData.cardholderName || `${this.contactData?.firstName} ${this.contactData?.lastName}` || 'Cardholder'
        };
        this.confirmOrder();
      }
    }
  }

  previousStep(): void {
    if (this.step === 'payment') {
      this.step = 'contact';
    }
  }

  confirmOrder(): void {
    // Use stored data from previous steps
    if (!this.paymentData || !this.contactData) {
      this.errors = ['Missing payment or contact information'];
      return;
    }

    // Save buyer info to localStorage for confirmation page
    const buyerInfo = {
      name: `${this.contactData.firstName} ${this.contactData.lastName}`,
      email: this.contactData.email,
    };
    localStorage.setItem('currentBuyerInfo', JSON.stringify(buyerInfo));

    this.checkoutService.confirmOrder('stripe', this.contactData, this.paymentData);
    setTimeout(() => {
      const completed = this.checkoutService.completedOrder();
      const ids = completed?.tickets?.map((t) => t.id) || [];
      const queryParams: any = {};
      if (ids.length > 0) {
        queryParams.t = ids.join(',');
      }
      this.router.navigate(['/confirmation'], { queryParams });
    }, 1000);
  }

  ngOnDestroy(): void {
    // Timer cleanup is handled by the service
    // Reset expired state when leaving checkout
    this.checkoutService.resetExpiredState();
  }
}
