import { Injectable, Inject } from "@nestjs/common";
import { ITicketRepository } from "../../domain/interfaces/ticket-repository.interface";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import {
  TICKET_REPOSITORY,
  EVENT_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";
import { EmailService } from "../../infrastructure/external/email.service";

/**
 * ResendEmailUseCase
 * Use case for resending confirmation emails and event reminders
 */
@Injectable()
export class ResendEmailUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: ITicketRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Resends confirmation email for a specific buyer
   *
   * @param email - Buyer's email address
   * @param ticketId - Optional specific ticket ID
   * @returns Success status
   */
  async resendConfirmationEmail(
    email: string,
    ticketId?: string,
  ): Promise<boolean> {
    try {
      console.log(
        `🔍 [ResendEmailUseCase] Buscando tickets para email: ${email}`,
      );

      // Get tickets for the buyer
      let tickets;
      if (ticketId) {
        console.log(
          `🎫 [ResendEmailUseCase] Buscando ticket específico: ${ticketId}`,
        );
        const ticket = await this.ticketRepository.findById(ticketId);
        if (!ticket || ticket.buyerEmail.value !== email) {
          throw new Error("Ticket not found or does not belong to this email");
        }
        tickets = [ticket];
      } else {
        console.log(
          `📧 [ResendEmailUseCase] Buscando todos los tickets para: ${email}`,
        );
        tickets = await this.ticketRepository.findByBuyerEmail(email);
        console.log(
          `📊 [ResendEmailUseCase] Encontrados ${tickets.length} tickets`,
        );

        if (tickets.length === 0) {
          console.log(
            `❌ [ResendEmailUseCase] No se encontraron tickets para: ${email}`,
          );
          return false; // No tickets found, return false instead of throwing
        }
      }

      // Group tickets by event
      const ticketsByEvent = new Map();
      for (const ticket of tickets) {
        if (!ticketsByEvent.has(ticket.eventId)) {
          ticketsByEvent.set(ticket.eventId, []);
        }
        ticketsByEvent.get(ticket.eventId).push(ticket);
      }

      // Send email for each event
      let allSuccessful = true;
      for (const [eventId, eventTickets] of ticketsByEvent) {
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
          console.error(`Event ${eventId} not found`);
          allSuccessful = false;
          continue;
        }

        const buyerName = this.extractNameFromEmail(email);
        const success = await this.emailService.sendTicketConfirmationEmail({
          buyerEmail: email,
          buyerName,
          tickets: eventTickets,
          eventName: event.name,
          eventDate: event.date.toISOString(),
          eventLocation: event.location,
          eventVenueName: event.venueName || undefined,
          eventStartTime: undefined, // Event entity doesn't have startTime
          eventEndTime: undefined, // Event entity doesn't have endTime
          eventImage: event.imageUrl || undefined,
        });

        if (!success) {
          allSuccessful = false;
        }
      }

      return allSuccessful;
    } catch (error) {
      console.error("Error resending confirmation email:", error);
      throw error;
    }
  }

  /**
   * Sends event reminder emails
   *
   * @param eventId - Event ID to send reminders for
   * @param specificEmail - Optional specific email to send to
   * @returns Success status
   */
  async sendEventReminder(
    eventId: string,
    specificEmail?: string,
  ): Promise<boolean> {
    try {
      // Get event information
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        console.error(`Event ${eventId} not found`);
        return false;
      }

      // Get tickets for the event
      let tickets;
      if (specificEmail) {
        // Find tickets by buyer email for this event
        const allTickets =
          await this.ticketRepository.findByBuyerEmail(specificEmail);
        tickets = allTickets.filter((ticket) => ticket.eventId === eventId);
        if (tickets.length === 0) {
          console.warn(
            `No tickets found for email ${specificEmail} and event ${eventId}`,
          );
          return false;
        }
      } else {
        tickets = await this.ticketRepository.findByEventId(eventId);
        if (tickets.length === 0) {
          console.warn(`No tickets found for event ${eventId}`);
          return true; // Not an error, just no tickets to send reminders for
        }
      }

      // Group tickets by buyer email
      const ticketsByBuyer = new Map();
      for (const ticket of tickets) {
        const buyerEmail = ticket.buyerEmail.value;
        if (!ticketsByBuyer.has(buyerEmail)) {
          ticketsByBuyer.set(buyerEmail, []);
        }
        ticketsByBuyer.get(buyerEmail).push(ticket);
      }

      // Send reminder to each buyer
      let allSuccessful = true;
      for (const [buyerEmail, buyerTickets] of ticketsByBuyer) {
        const buyerName = this.extractNameFromEmail(buyerEmail);
        try {
          const success = await this.emailService.sendEventReminderEmail({
            buyerEmail,
            buyerName,
            tickets: buyerTickets,
            eventName: event.name,
            eventDate: event.date.toISOString(),
            eventLocation: event.location,
            eventVenueName: event.venueName || undefined,
            eventStartTime: undefined, // Event entity doesn't have startTime
            eventEndTime: undefined, // Event entity doesn't have endTime
            eventImage: event.imageUrl || undefined,
          });

          if (!success) {
            allSuccessful = false;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `Failed to send reminder to ${buyerEmail}:`,
            errorMessage,
          );
          allSuccessful = false;
        }
      }

      return allSuccessful;
    } catch (error) {
      console.error("Error sending event reminders:", error);
      return false;
    }
  }

  /**
   * Extracts a display name from an email address
   *
   * @param email - Email address
   * @returns Display name
   */
  private extractNameFromEmail(email: string): string {
    const localPart = email.split("@")[0];
    if (!localPart) {
      return "Usuario";
    }
    return localPart
      .replace(/[._]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
}
