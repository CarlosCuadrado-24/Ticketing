import { Injectable, Inject } from "@nestjs/common";
import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { Ticket, TicketStatus } from "../../domain/entities/ticket.entity";
import { ITicketRepository } from "../../domain/interfaces/ticket-repository.interface";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import {
  TICKET_REPOSITORY,
  EVENT_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";
import { Email } from "../../domain/value-objects/email.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";
import { TicketAvailabilityService } from "../../infrastructure/websocket/ticket-availability.service";
import { EmailService } from "../../infrastructure/external/email.service";

/**
 * PurchaseTicketUseCase
 * Handles the business logic for purchasing tickets
 *
 * Requirements:
 * - Validate event exists and has availability
 * - Create tickets with unique code and QR token
 * - Process payment
 * - Generate tickets with PAID status
 */
@Injectable()
export class PurchaseTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: ITicketRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    private readonly ticketAvailabilityService: TicketAvailabilityService,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  async execute(params: {
    eventId: string;
    ticketType: TicketType;
    quantity: number;
    buyerEmail: string;
    paymentInfo: {
      cardNumber: string;
      expiryDate: string;
      cvv: string;
    };
  }): Promise<Ticket[]> {
    console.log("🎫 [PurchaseTicketUseCase] Iniciando compra...");
    console.log("🎫 Params:", {
      eventId: params.eventId,
      ticketType: params.ticketType,
      quantity: params.quantity,
      buyerEmail: params.buyerEmail,
    });

    // Use database transaction to ensure atomicity
    const result = await this.dataSource.transaction(async (_manager) => {
      console.log("🔒 [PurchaseTicketUseCase] Iniciando transacción...");

      // 1. Validate event exists (without lock for now, we'll add proper locking later)
      console.log("🔍 Buscando evento:", params.eventId);
      const event = await this.eventRepository.findById(params.eventId);
      if (!event) {
        throw new Error("Event not found");
      }
      console.log("✅ Evento encontrado:", event.name);

      // 2. Check availability
      const availability = event.getAvailability(params.ticketType);
      console.log(
        `🎫 Disponibilidad para ${params.ticketType}: ${availability}, solicitados: ${params.quantity}`,
      );
      if (availability < params.quantity) {
        throw new Error(
          `Insufficient tickets available. Requested: ${params.quantity}, Available: ${availability}`,
        );
      }

      // 3. Get ticket configuration for pricing
      const ticketConfig = event.ticketConfigurations.find(
        (config) => config.type === params.ticketType,
      );
      if (!ticketConfig) {
        throw new Error(
          `Ticket type ${params.ticketType} not found for this event`,
        );
      }
      console.log(
        "💰 Precio por ticket:",
        ticketConfig.price.amount,
        ticketConfig.price.currency,
      );

      // 4. Process payment (simplified - in real world would integrate with payment gateway)
      const totalAmount = ticketConfig.price.amount * params.quantity;
      console.log("💳 Procesando pago:", {
        totalAmount,
        currency: ticketConfig.price.currency,
      });
      const paymentSuccessful = await this.processPayment(
        totalAmount,
        ticketConfig.price.currency,
        params.paymentInfo,
      );

      if (!paymentSuccessful) {
        console.error("❌ Pago fallido");
        throw new Error("Payment failed");
      }
      console.log("✅ Pago procesado exitosamente");

      // 5. Reserve tickets AFTER successful payment (this modifies the event entity)
      console.log("🔐 Reservando tickets DESPUÉS del pago exitoso...");
      const availabilityBefore = event.getAvailability(params.ticketType);
      event.reserveTickets(params.ticketType, params.quantity);
      const availabilityAfter = event.getAvailability(params.ticketType);
      console.log(
        `📊 Disponibilidad: ${availabilityBefore} → ${availabilityAfter}`,
      );

      // 6. Update availability directly in the database to ensure consistency (within transaction)
      console.log("💾 Actualizando disponibilidad directamente en BD...");
      await this.eventRepository.updateTicketAvailability(
        params.eventId,
        params.ticketType,
        availabilityAfter,
      );
      console.log(
        `✅ Disponibilidad actualizada directamente en BD: ${availabilityAfter}`,
      );

      // 7. Generate tickets
      console.log("🎫 Generando tickets...");
      const tickets: Ticket[] = [];
      const buyerEmail = Email.create(params.buyerEmail);
      const purchaseDate = new Date();

      for (let i = 0; i < params.quantity; i++) {
        const ticket = new Ticket(
          uuidv4(),
          this.generateTicketCode(),
          params.eventId,
          params.ticketType,
          buyerEmail,
          Money.create(ticketConfig.price.amount, ticketConfig.price.currency),
          purchaseDate,
          uuidv4(), // QR token
          TicketStatus.PAID,
          null,
        );
        tickets.push(ticket);
      }
      console.log(`✅ ${tickets.length} tickets generados`);

      // 8. Save tickets (within transaction)
      console.log("💾 Guardando tickets en BD...");
      const savedTickets = await this.ticketRepository.saveMany(tickets);
      console.log(`✅ ${savedTickets.length} tickets guardados en BD`);
      console.log(
        "✅ IDs guardados:",
        savedTickets.map((t) => ({ id: t.id, code: t.code })),
      );

      console.log(
        "✅ [PurchaseTicketUseCase] Transacción completada exitosamente",
      );

      return { savedTickets, ticketConfig, event };
    });

    // 9. Broadcast availability update via WebSocket (after transaction commits)
    // Get real-time availability after the purchase
    const newAvailability = await this.eventRepository.getRealTimeAvailability(
      params.eventId,
      params.ticketType,
    );

    console.log(
      `📡 Broadcasting availability update: ${newAvailability} remaining for ${params.ticketType}`,
    );
    this.ticketAvailabilityService.broadcastAvailabilityUpdate({
      eventId: params.eventId,
      ticketType: params.ticketType,
      availableQuantity: newAvailability,
      totalQuantity: result.ticketConfig.totalQuantity,
      timestamp: new Date().toISOString(),
    });

    // 10. Send confirmation email (async, don't wait for it)
    this.sendConfirmationEmail(
      result.savedTickets,
      result.event,
      params.buyerEmail,
    ).catch((error) => {
      console.error("❌ Error sending confirmation email:", error);
      // Don't throw error - email failure shouldn't fail the purchase
    });

    return result.savedTickets;
  }

  /**
   * Simulated payment processing
   * In production, this would integrate with Stripe, PayPal, etc.
   */
  private async processPayment(
    _amount: number,
    _currency: string,
    _paymentInfo: { cardNumber: string; expiryDate: string; cvv: string },
  ): Promise<boolean> {
    // Simulate payment processing
    // In real implementation: call payment gateway API
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 95% success rate
        resolve(Math.random() > 0.05);
      }, 100);
    });
  }

  /**
   * Generates a unique ticket code
   * Format: TKT-XXXXXX (6 random uppercase alphanumeric characters)
   */
  private generateTicketCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "TKT-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Sends confirmation email with tickets after successful purchase
   *
   * @param tickets - Generated tickets
   * @param event - Event information
   * @param buyerEmail - Buyer's email address
   */
  private async sendConfirmationEmail(
    tickets: Ticket[],
    event: any,
    buyerEmail: string,
  ): Promise<void> {
    try {
      console.log("📧 Enviando email de confirmación de compra directa...");

      // Extract buyer name from email (simple approach)
      const buyerName = this.extractNameFromEmail(buyerEmail);

      await this.emailService.sendTicketConfirmationEmail({
        buyerEmail,
        buyerName,
        tickets,
        eventName: event.name,
        eventDate: event.date.toISOString(),
        eventLocation: event.location,
        eventVenueName: event.venueName,
        eventStartTime: undefined, // Event entity doesn't have startTime
        eventEndTime: undefined, // Event entity doesn't have endTime
        eventImage: event.imageUrl,
      });

      console.log("✅ Email de confirmación enviado exitosamente");
    } catch (error) {
      console.error("❌ Error al enviar email de confirmación:", error);
      throw error;
    }
  }

  /**
   * Extracts a display name from an email address
   * Simple implementation - in production you might want to store actual names
   *
   * @param email - Email address
   * @returns Display name
   */
  private extractNameFromEmail(email: string): string {
    const localPart = email.split("@")[0];
    if (!localPart) {
      return "Usuario";
    }
    // Convert dots and underscores to spaces and capitalize
    return localPart
      .replace(/[._]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
}
