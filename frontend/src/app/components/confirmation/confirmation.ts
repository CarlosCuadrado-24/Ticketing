import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CheckoutService } from '../../features/checkout/services/checkout.service';
import { TicketsService } from '../../core/services/tickets.service';
import { AuthService } from '../../core/services/auth.service';
import { EmailService } from '../../services/email.service';
import { Events } from '../../services/events';
import { ImageService } from '../../shared/services/image.service';
import { TicketMappingService } from '../../shared/services/ticket-mapping.service';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '../../config/storage.constants';
import { BackendTicket, UserTicket } from '../../models/ticket.model';
import { BaseEvent } from '../../models/event.model';

interface EventInfo {
  id: string;
  name: string;
  date: string;
  location: string;
  venueName?: string;
  startTime?: string;
  endTime?: string;
  imageUrl?: string;
}

interface EnrichedTicket extends BackendTicket {
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  eventVenueName?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  eventImage?: string;
}

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyFormatPipe, DateFormatPipe],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.css',
})
export class Confirmation implements OnInit {
  private readonly checkoutService = inject(CheckoutService);
  private readonly ticketsService = inject(TicketsService);
  private readonly authService = inject(AuthService);
  private readonly eventsService = inject(Events);
  private readonly emailService = inject(EmailService);
  private readonly imageService = inject(ImageService);
  private readonly ticketMappingService = inject(TicketMappingService);
  readonly router = inject(Router); // Make router public for template
  private readonly route = inject(ActivatedRoute);

  private readonly _tickets = signal<EnrichedTicket[]>([]);
  private readonly _isLoading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _eventCache = new Map<string, EventInfo>();
  private readonly _showAuthWarning = signal(false);
  private readonly _buyerName = signal<string>('');
  private readonly _buyerEmail = signal<string>('');
  private readonly _ticketCount = signal<number>(0);
  private readonly _emailSending = signal(false);
  private readonly _emailSent = signal(false);

  readonly tickets = this._tickets.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly showAuthWarning = this._showAuthWarning.asReadonly();
  readonly buyerName = this._buyerName.asReadonly();
  readonly buyerEmail = this._buyerEmail.asReadonly();
  readonly emailSending = this._emailSending.asReadonly();
  readonly emailSent = this._emailSent.asReadonly();
  readonly ticketCount = computed(() => {
    const count = this._ticketCount();
    return count > 0 ? count : this._tickets().length;
  });

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.warn('[Confirmation] User not authenticated');
      this._showAuthWarning.set(true);
      // Still try to load tickets, backend will return 401 if no cookies
    }

    // Load buyer info if available (set in checkout)
    const buyerInfo = this.getBuyerInfoFromStorage();
    if (buyerInfo) {
      this._buyerName.set(buyerInfo.name || '');
      this._buyerEmail.set(buyerInfo.email || '');
    }

    this.loadTickets();
  }

  private loadTickets(): void {
    // If ticket IDs were passed via query, prefer those
    this.route.queryParams.subscribe((params) => {
      const idsParam = params['t'];
      if (idsParam) {
        const ids = String(idsParam)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (ids.length > 0) {
          this._ticketCount.set(ids.length);
          this.loadTicketsByIds(ids);
          return;
        }
      }

      // Otherwise proceed with completed order or recent
      const completedOrder = this.checkoutService.completedOrder();
      if (completedOrder) {
        this._ticketCount.set(completedOrder.tickets.length);
        this.loadTicketsFromCompletedOrder(completedOrder);
      } else {
        this.loadRecentTickets();
      }
    });
  }
  private loadTicketsByIds(ids: string[]): void {
    this._isLoading.set(true);
    this._error.set(null);

    this.ticketsService.getUserTickets().subscribe({
      next: (allTickets: BackendTicket[]) => {
        const matched = allTickets.filter((t) => ids.includes(t.id) || ids.includes(t.code));
        const eventIds = [...new Set(matched.map((t) => t.eventId))];
        const eventRequests = eventIds.map((id) => this.eventsService.getEvent(id));

        if (eventRequests.length === 0) {
          this._tickets.set(matched as EnrichedTicket[]);
          this._isLoading.set(false);
          return;
        }

        forkJoin(eventRequests).subscribe({
          next: (events: any[]) => {
            events.forEach((event) => {
              this._eventCache.set(event.id.toString(), {
                id: event.id.toString(),
                name: event.name,
                date: event.date,
                location: event.location,
                venueName: event.venueName,
                startTime: event.startTime,
                endTime: event.endTime,
                imageUrl: event.imageUrl,
              });
            });

            const enriched: EnrichedTicket[] = matched.map((ticket) => {
              const eventInfo = this._eventCache.get(ticket.eventId);
              return {
                ...ticket,
                eventName: eventInfo?.name || 'Event',
                eventDate: eventInfo?.date,
                eventLocation: eventInfo?.location,
                eventVenueName: eventInfo?.venueName,
                eventStartTime: eventInfo?.startTime,
                eventEndTime: eventInfo?.endTime,
                eventImage: eventInfo?.imageUrl,
              };
            });

            this._tickets.set(enriched);
            this._isLoading.set(false);
          },
          error: () => {
            this._tickets.set(matched as EnrichedTicket[]);
            this._isLoading.set(false);
          },
        });
      },
      error: (err) => {
        console.error('[Confirmation] Error loading tickets (by ids):', err);
        this._error.set('No se pudieron cargar tus entradas');
        this._isLoading.set(false);
      },
    });
  }

  private loadRecentTickets(): void {
    this._isLoading.set(true);
    this._error.set(null);

    this.ticketsService.getUserTickets().subscribe({
      next: (tickets: BackendTicket[]) => {
        // Sort by purchase date descending
        const sortedByDate = tickets.sort(
          (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime(),
        );

        // Filter tickets from the last 30 minutes (current purchase session)
        const now = Date.now();
        const thirtyMinutesAgo = now - 30 * 60 * 1000;

        const recentPurchase = sortedByDate.filter((t) => {
          const purchaseTime = new Date(t.purchaseDate).getTime();
          return purchaseTime >= thirtyMinutesAgo;
        });

        // If we found tickets from recent purchase, use them; otherwise use last ticket
        const ticketsToShow = recentPurchase.length > 0 ? recentPurchase : sortedByDate.slice(0, 1);

        // Set the ticket count from the completed order or actual tickets
        this._ticketCount.set(ticketsToShow.length);

        // Get unique event IDs
        const eventIds = [...new Set(ticketsToShow.map((t) => t.eventId))];

        // Fetch event details for all tickets
        const eventRequests = eventIds.map((id) => this.eventsService.getEvent(id));

        if (eventRequests.length === 0) {
          this._tickets.set(ticketsToShow as EnrichedTicket[]);
          this._isLoading.set(false);
          return;
        }

        forkJoin(eventRequests).subscribe({
          next: (events: any[]) => {
            // Cache events
            events.forEach((event) => {
              this._eventCache.set(event.id.toString(), {
                id: event.id.toString(),
                name: event.name,
                date: event.date,
                location: event.location,
                venueName: event.venueName,
                startTime: event.startTime,
                endTime: event.endTime,
                imageUrl: event.imageUrl,
              });
            });

            // Enrich tickets with event info
            const enriched: EnrichedTicket[] = ticketsToShow.map((ticket) => {
              const eventInfo = this._eventCache.get(ticket.eventId);
              return {
                ...ticket,
                eventName: eventInfo?.name || 'Event',
                eventDate: eventInfo?.date,
                eventLocation: eventInfo?.location,
                eventVenueName: eventInfo?.venueName,
                eventStartTime: eventInfo?.startTime,
                eventEndTime: eventInfo?.endTime,
                eventImage: eventInfo?.imageUrl,
              };
            });

            this._tickets.set(enriched);
            this._isLoading.set(false);
          },
          error: (err) => {
            console.error('Error loading event details:', err);
            // Still show tickets without event details
            this._tickets.set(ticketsToShow as EnrichedTicket[]);
            this._isLoading.set(false);
          },
        });
      },
      error: (err) => {
        console.error('[Confirmation] Error loading tickets:', err);
        console.error('[Confirmation] Error status:', err.status);
        console.error('[Confirmation] Error details:', err.error);

        // Handle authentication errors (401, 403, or 500 caused by auth)
        if (err.status === 401 || err.status === 403 || err.status === 500) {
          this._showAuthWarning.set(true);
          this._error.set('Unable to load tickets. You may need to login again.');
          this._isLoading.set(false);

          console.warn('[Confirmation] Authentication issue detected. User should login.');
          console.warn('[Confirmation] If you just completed a purchase, your tickets were saved.');
          console.warn('[Confirmation] Please login to view your tickets.');
        } else {
          this._error.set('Failed to load tickets. Please refresh the page or try again later.');
          this._isLoading.set(false);
        }
      },
    });
  }

  private loadTicketsFromCompletedOrder(order: {
    tickets: { id: string; ticketTypeName: string }[];
  }): void {
    this._isLoading.set(true);
    this._error.set(null);

    // Collect ids and codes from completed order
    const ids = order.tickets.map((t) => t.id);
    const codes = order.tickets.map((t) => t.id); // when id stored as code fallback

    this.ticketsService.getUserTickets().subscribe({
      next: (allTickets: BackendTicket[]) => {
        // Filter backend tickets by id or code present in completed order
        const matched = allTickets.filter((t) => ids.includes(t.id) || codes.includes(t.code));

        // If nothing matched (e.g., id mapping differs), fallback to recent tickets
        const ticketsToUse =
          matched.length > 0
            ? matched
            : allTickets
                .sort(
                  (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime(),
                )
                .slice(0, order.tickets.length);

        const eventIds = [...new Set(ticketsToUse.map((t) => t.eventId))];
        const eventRequests = eventIds.map((id) => this.eventsService.getEvent(id));

        if (eventRequests.length === 0) {
          this._tickets.set(ticketsToUse as EnrichedTicket[]);
          this._isLoading.set(false);
          return;
        }

        forkJoin(eventRequests).subscribe({
          next: (events: any[]) => {
            events.forEach((event) => {
              this._eventCache.set(event.id.toString(), {
                id: event.id.toString(),
                name: event.name,
                date: event.date,
                location: event.location,
                venueName: event.venueName,
                startTime: event.startTime,
                endTime: event.endTime,
                imageUrl: event.imageUrl,
              });
            });

            const enriched: EnrichedTicket[] = ticketsToUse.map((ticket) => {
              const eventInfo = this._eventCache.get(ticket.eventId);
              return {
                ...ticket,
                eventName: eventInfo?.name || 'Event',
                eventDate: eventInfo?.date,
                eventLocation: eventInfo?.location,
                eventVenueName: eventInfo?.venueName,
                eventStartTime: eventInfo?.startTime,
                eventEndTime: eventInfo?.endTime,
                eventImage: eventInfo?.imageUrl,
              };
            });

            this._tickets.set(enriched);
            this._isLoading.set(false);
          },
          error: () => {
            this._tickets.set(ticketsToUse as EnrichedTicket[]);
            this._isLoading.set(false);
          },
        });
      },
      error: (err) => {
        console.error('[Confirmation] Error loading tickets (order):', err);
        this._error.set('Unable to load your tickets');
        this._isLoading.set(false);
      },
    });
  }

  private getBuyerInfoFromStorage(): { name: string; email: string; phone: string } | null {
    return this.checkoutService.getBuyerInfo();
  }

  /**
   * Constructs the full image URL from the imageUrl field
   * Handles both full URLs and filename-only values
   */
  getEventImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return '';
    }

    // If it's already a full URL (http/https) and not from minio, return as-is
    if (imageUrl.startsWith('http') && !imageUrl.includes('minio')) {
      return imageUrl;
    }

    // Extract filename if it contains a path
    let filename = imageUrl;
    if (filename.includes('/')) {
      filename = filename.split('/').pop() || filename;
    }

    // Build the full URL using the API endpoint
    return `${environment.apiUrl}/events/file/${filename}`;
  }

  continueShopping(): void {
    this.checkoutService.clearCart();
    // Clear buyer info from localStorage
    localStorage.removeItem('currentBuyerInfo');
    this.router.navigate(['/']);
  }

  downloadTicket(ticket: EnrichedTicket): void {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${ticket.qrToken}`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Professional ticket size
    canvas.width = 900;
    canvas.height = 600;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw event image banner if available
    if (ticket.eventImage) {
      const eventImg = new Image();
      eventImg.crossOrigin = 'anonymous';
      eventImg.onload = () => {
        // Draw event image at top
        ctx.drawImage(eventImg, 0, 0, 600, 250);
        this.drawTicketContent(ctx, ticket, qrImageUrl, canvas);
      };
      eventImg.onerror = () => {
        // If image fails, draw gradient background
        this.drawGradientHeader(ctx, ticket);
        this.drawTicketContent(ctx, ticket, qrImageUrl, canvas);
      };
      // Use the helper method to get the correct URL
      eventImg.src = this.getEventImageUrl(ticket.eventImage);
    } else {
      // Draw gradient header
      this.drawGradientHeader(ctx, ticket);
      this.drawTicketContent(ctx, ticket, qrImageUrl, canvas);
    }
  }

  private drawGradientHeader(ctx: CanvasRenderingContext2D, ticket: EnrichedTicket): void {
    // Gradient background for header
    const gradient = ctx.createLinearGradient(0, 0, 600, 250);
    gradient.addColorStop(0, '#4c1d95');
    gradient.addColorStop(1, '#7c3aed');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 250);

    // Ticket type badge
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(20, 30, 140, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`${ticket.type.toUpperCase()}`, 30, 52);

    // Event name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    const eventName = ticket.eventName || 'Evento';
    // Truncate long event names to fit
    const maxWidth = 540;
    let fontSize = 40;
    ctx.font = `bold ${fontSize}px Arial`;

    while (ctx.measureText(eventName).width > maxWidth && fontSize > 20) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Arial`;
    }

    ctx.fillText(eventName, 30, 180);

    // Event date below name
    if (ticket.eventDate) {
      ctx.fillStyle = '#e0e7ff';
      ctx.font = '18px Arial';
      const eventDate = new Date(ticket.eventDate).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      ctx.fillText(eventDate, 30, 210);
    }
  }

  private drawTicketContent(
    ctx: CanvasRenderingContext2D,
    ticket: EnrichedTicket,
    qrImageUrl: string,
    canvas: HTMLCanvasElement,
  ): void {
    // Main content background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 250, canvas.width, canvas.height - 250);

    // Date & Time section
    ctx.fillStyle = '#6366f1';
    ctx.font = '16px Arial';
    ctx.fillText('📅 FECHA Y HORA', 30, 300);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px Arial';

    // Use real event date and format it properly
    let eventDateText = 'TBD';
    let eventTimeText = 'Hora por confirmar';

    if (ticket.eventDate) {
      const eventDate = new Date(ticket.eventDate);
      eventDateText = eventDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    if (ticket.eventStartTime) {
      eventTimeText = `Inicio: ${ticket.eventStartTime}`;
      if (ticket.eventEndTime) {
        eventTimeText += ` - Fin: ${ticket.eventEndTime}`;
      }
    }

    ctx.fillText(eventDateText, 30, 330);
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px Arial';
    ctx.fillText(eventTimeText, 30, 355);

    // Location section
    ctx.fillStyle = '#6366f1';
    ctx.font = '16px Arial';
    ctx.fillText('📍 UBICACIÓN', 30, 400);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px Arial';

    // Use real venue name and location
    const locationText = ticket.eventVenueName
      ? `${ticket.eventVenueName} - ${ticket.eventLocation || 'Ubicación por confirmar'}`
      : ticket.eventLocation || 'Ubicación por confirmar';
    ctx.fillText(locationText, 30, 425);

    // Ticket details
    ctx.fillStyle = '#6b7280';
    ctx.font = '13px Arial';
    ctx.fillText('Titular', 30, 475);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 16px Arial';
    // Use real buyer email from ticket
    ctx.fillText(ticket.buyerEmail || this._buyerEmail() || 'Comprador', 30, 495);

    ctx.fillStyle = '#6b7280';
    ctx.font = '13px Arial';
    ctx.fillText('Código de Entrada', 200, 475);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(ticket.code, 200, 495);

    ctx.fillStyle = '#6b7280';
    ctx.font = '13px Arial';
    ctx.fillText('Precio', 370, 475);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 16px Arial';
    // Use real price and currency from ticket
    const currency = ticket.currency || 'COP';
    const formattedPrice = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(Number(ticket.price));
    ctx.fillText(formattedPrice, 370, 495);

    // Ticket type
    ctx.fillStyle = '#6b7280';
    ctx.font = '13px Arial';
    ctx.fillText('Tipo de Entrada', 30, 520);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(ticket.type, 30, 540);

    // Status badge
    const statusColor =
      ticket.status === 'PAID' ? '#10b981' : ticket.status === 'USED' ? '#6b7280' : '#f59e0b';
    const statusText =
      ticket.status === 'PAID' ? 'PAGADO' : ticket.status === 'USED' ? 'USADO' : ticket.status;

    ctx.fillStyle = statusColor;
    ctx.fillRect(200, 520, 100, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, 250, 540);
    ctx.textAlign = 'left';

    // Load and draw QR code
    const qrImage = new Image();
    qrImage.crossOrigin = 'anonymous';
    qrImage.onload = () => {
      // QR container background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(650, 280, 220, 280);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(650, 280, 220, 280);

      // "SCAN FOR ENTRY" text
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ESCANEAR PARA INGRESAR', 760, 305);

      // Draw QR code
      ctx.drawImage(qrImage, 680, 325, 160, 160);

      // Ticket code below QR
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(ticket.code, 760, 510);

      // Purchase date
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Arial';
      const purchaseDate = new Date(ticket.purchaseDate).toLocaleDateString('es-ES');
      ctx.fillText(`Comprado: ${purchaseDate}`, 760, 530);

      ctx.textAlign = 'left';

      // Border
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `entrada-${ticket.code}.png`;
        a.click();
        window.URL.revokeObjectURL(url);
      }, 'image/png');
    };
    qrImage.src = qrImageUrl;
  }

  /**
   * Reenvía el email de confirmación con las entradas
   */
  resendConfirmationEmail(): void {
    const email = this._buyerEmail();
    if (!email) {
      console.error('No buyer email available for resending');
      return;
    }

    this._emailSending.set(true);
    this._emailSent.set(false);

    this.emailService.resendConfirmationEmail({ email }).subscribe({
      next: (response) => {
        this._emailSending.set(false);
        if (response.success) {
          this._emailSent.set(true);
          console.log('✅ Email reenviado exitosamente');
          // Reset the flag after 5 seconds
          setTimeout(() => this._emailSent.set(false), 5000);
        } else {
          console.error('❌ Error al reenviar email:', response.message);
        }
      },
      error: (error) => {
        this._emailSending.set(false);
        console.error('❌ Error al reenviar email:', error);
      },
    });
  }
}
