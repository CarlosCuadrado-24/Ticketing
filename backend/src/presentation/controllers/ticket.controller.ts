import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { GetBuyerTicketsUseCase } from "../../application/use-cases/get-buyer-tickets.use-case";
import { PurchaseTicketUseCase } from "../../application/use-cases/purchase-ticket.use-case";
import { ValidateQRUseCase } from "../../application/use-cases/validate-qr.use-case";
import { ResendEmailUseCase } from "../../application/use-cases/resend-email.use-case";
import { Ticket, TicketStatus } from "../../domain/entities/ticket.entity";
import { PurchaseTicketDto } from "../../application/dto/purchase-ticket.dto";
import {
  ValidateQRDto,
  ValidateQRResponse,
} from "../../application/dto/validate-qr.dto";
import {
  ResendEmailDto,
  SendReminderDto,
} from "../../application/dto/resend-email.dto";
import { JwtAuthGuard } from "../../application/services/jwt-auth.guard";
import { EmailService } from "../../infrastructure/external/email.service";
import { TypeOrmTicketRepository } from "../../infrastructure/persistence/repositories/typeorm-ticket.repository";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { Inject } from "@nestjs/common";
import { EVENT_REPOSITORY } from "../../domain/interfaces/repository-tokens";

/**
 * TicketController
 * Handles HTTP requests for ticket management
 * Follows REST conventions and NestJS best practices
 * Requirements: 6.1, 6.3, QR generation and validation
 */
@ApiTags("tickets")
@Controller("tickets")
export class TicketController {
  constructor(
    private readonly getBuyerTicketsUseCase: GetBuyerTicketsUseCase,
    private readonly purchaseTicketUseCase: PurchaseTicketUseCase,
    private readonly validateQRUseCase: ValidateQRUseCase,
    private readonly resendEmailUseCase: ResendEmailUseCase,
    private readonly emailService: EmailService,
    private readonly ticketRepository: TypeOrmTicketRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
  ) {}

  /**
   * GET /tickets/:id/download
   * Download ticket as PNG with brutalist design
   *
   * @param id - Ticket ID
   * @param res - Express response
   * @returns PNG file stream
   */
  @Get(":id/download")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Download ticket as PNG",
    description: "Downloads a ticket with brutalist design as PNG file",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "Ticket ID",
    example: "9c53eb32-48db-4379-8eeb-6defb90b8f7c",
  })
  @ApiResponse({
    status: 200,
    description: "PNG file downloaded",
    content: {
      "image/png": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Ticket not found",
  })
  async downloadTicketPNG(
    @Param("id") id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Get ticket from repository
      const ticket = await this.ticketRepository.findById(id);
      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${id} not found`);
      }

      // Get event to retrieve event name
      const event = await this.eventRepository.findById(ticket.eventId);
      const eventName = event ? event.name : 'Event';

      // Generate PNG using the same method as email attachments
      const pngBuffer = await this.emailService['generateSimpleTicketPNG'](ticket, eventName);

      // Set headers and send file
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="ticket-${ticket.code}.png"`,
        'Content-Length': pngBuffer.length,
      });

      res.send(pngBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * GET /tickets/user OR /tickets/me
   * Get all tickets for the authenticated user
   *
   * @param req - Request with user info from JWT
   * @returns Array of tickets for the authenticated user
   */
  @Get(["user", "me"])
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get tickets for authenticated user",
    description:
      "Retrieve all tickets purchased by the currently authenticated user (supports /tickets/user or /tickets/me)",
  })
  @ApiResponse({
    status: 200,
    description: "List of tickets for the authenticated user",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing token",
  })
  async findUserTickets(@Req() req: any): Promise<TicketResponse[]> {
    try {
      // Get email from the authenticated user (from JWT)
      const userEmail = req.user?.email;
      if (!userEmail) {
        throw new BadRequestException("User email not found in token");
      }

      // Execute use case to retrieve tickets
      const tickets = await this.getBuyerTicketsUseCase.execute(userEmail);

      // Format and return tickets with event info
      return tickets.map((ticket) => this.formatTicketResponse(ticket));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /tickets/purchase
   * Purchase tickets directly
   *
   * @param purchaseTicketDto - Purchase details
   * @returns Array of purchased tickets with QR tokens
   * @throws BadRequestException if validation fails or insufficient tickets
   */
  @Post("purchase")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Purchase tickets",
    description: "Purchase tickets for an event with automatic QR generation",
  })
  @ApiBody({ type: PurchaseTicketDto })
  @ApiResponse({
    status: 201,
    description: "Tickets purchased successfully",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          code: { type: "string" },
          eventId: { type: "string" },
          type: { type: "string" },
          buyerEmail: { type: "string" },
          price: { type: "number" },
          currency: { type: "string" },
          purchaseDate: { type: "string" },
          qrToken: { type: "string" },
          status: { type: "string", enum: ["PAID", "USED"] },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed or insufficient tickets",
  })
  async purchase(
    @Body() purchaseTicketDto: PurchaseTicketDto,
  ): Promise<TicketResponse[]> {
    try {
      console.log("📨 [TicketController] POST /tickets/purchase recibido");
      console.log(
        "📨 DTO recibido:",
        JSON.stringify(purchaseTicketDto, null, 2),
      );

      const tickets =
        await this.purchaseTicketUseCase.execute(purchaseTicketDto);
      console.log("✅ [TicketController] Tickets generados:", tickets.length);
      console.log(
        "✅ Tickets:",
        tickets.map((t) => ({ id: t.id, code: t.code, status: t.status })),
      );

      const response = tickets.map((ticket) =>
        this.formatTicketResponse(ticket),
      );
      console.log("✅ Response formateada:", response);
      return response;
    } catch (error) {
      console.error("❌ [TicketController] Error en purchase:", error);
      if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /tickets/validate-qr
   * Validate a QR code at event entrance
   *
   * @param validateQRDto - QR token and event ID
   * @returns Validation result with ticket details
   */
  @Post("validate-qr")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Validate QR code",
    description: "Validate a ticket QR code and mark as used",
  })
  @ApiBody({ type: ValidateQRDto })
  @ApiResponse({
    status: 200,
    description: "QR validation result",
    schema: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        message: { type: "string" },
        ticket: {
          type: "object",
          properties: {
            id: { type: "string" },
            code: { type: "string" },
            type: { type: "string" },
            buyerEmail: { type: "string" },
            usedAt: { type: "string", nullable: true },
          },
        },
      },
    },
  })
  async validateQR(
    @Body() validateQRDto: ValidateQRDto,
  ): Promise<ValidateQRResponse> {
    return await this.validateQRUseCase.execute(validateQRDto);
  }

  /**
   * GET /tickets?email=x
   * Retrieves all confirmed tickets purchased by a buyer
   *
   * @param email - The buyer's email address (query parameter)
   * @returns Array of tickets for the buyer
   * @throws BadRequestException if email is missing or invalid
   *
   * Requirement 6.1: Return all confirmed tickets for a buyer
   * Requirement 6.2: Each ticket includes code, event, type, purchase date
   * Requirement 6.3: Return empty list without error if buyer has no tickets
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get tickets by buyer email",
    description: "Retrieve all tickets purchased by a specific buyer",
  })
  @ApiQuery({
    name: "email",
    required: true,
    description: "Buyer email address",
    example: "buyer@example.com",
  })
  @ApiResponse({
    status: 200,
    description: "List of tickets for the buyer",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          code: { type: "string" },
          eventId: { type: "string" },
          type: { type: "string" },
          buyerEmail: { type: "string" },
          price: { type: "number" },
          currency: { type: "string" },
          purchaseDate: { type: "string" },
          qrToken: { type: "string" },
          status: { type: "string", enum: ["PAID", "USED"] },
          usedAt: { type: "string", nullable: true },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - email parameter missing or invalid",
  })
  async findByBuyer(@Query("email") email?: string): Promise<TicketResponse[]> {
    try {
      // Validate email parameter is provided
      if (!email) {
        throw new BadRequestException("Email query parameter is required");
      }

      // Execute use case to retrieve tickets
      const tickets = await this.getBuyerTicketsUseCase.execute(email);

      // Format and return tickets
      return tickets.map((ticket) => this.formatTicketResponse(ticket));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /tickets/resend-email
   * Resends confirmation email for tickets
   *
   * @param resendEmailDto - Email and optional ticket ID
   * @returns Success status
   */
  @Post("resend-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Resend confirmation email",
    description: "Resends confirmation email with tickets for a specific buyer",
  })
  @ApiBody({ type: ResendEmailDto })
  @ApiResponse({
    status: 200,
    description: "Email resent successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid email or no tickets found",
  })
  async resendEmail(
    @Body() resendEmailDto: ResendEmailDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.resendEmailUseCase.resendConfirmationEmail(
        resendEmailDto.email,
        resendEmailDto.ticketId,
      );

      return {
        success,
        message: success
          ? "Email de confirmación reenviado exitosamente"
          : "Error al reenviar el email de confirmación",
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /tickets/send-reminder
   * Sends event reminder emails
   *
   * @param sendReminderDto - Event ID and optional specific email
   * @returns Success status
   */
  @Post("send-reminder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Send event reminder",
    description: "Sends reminder emails for an upcoming event",
  })
  @ApiBody({ type: SendReminderDto })
  @ApiResponse({
    status: 200,
    description: "Reminders sent successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid event ID or no tickets found",
  })
  async sendReminder(
    @Body() sendReminderDto: SendReminderDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.resendEmailUseCase.sendEventReminder(
        sendReminderDto.eventId,
        sendReminderDto.email,
      );

      return {
        success,
        message: success
          ? "Recordatorios enviados exitosamente"
          : "Error al enviar recordatorios",
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Formats a Ticket entity into an HTTP response
   *
   * @param ticket - The Ticket entity to format
   * @returns Formatted ticket response
   */
  private formatTicketResponse(ticket: Ticket): TicketResponse {
    return {
      id: ticket.id,
      code: ticket.code,
      eventId: ticket.eventId,
      type: ticket.type,
      buyerEmail: ticket.buyerEmail.value,
      price: ticket.price.amount,
      currency: ticket.price.currency,
      purchaseDate: ticket.purchaseDate.toISOString(),
      qrToken: ticket.qrToken,
      status: ticket.status,
      usedAt: ticket.usedAt ? ticket.usedAt.toISOString() : null,
    };
  }
}

/**
 * TicketResponse
 * HTTP response format for tickets
 */
interface TicketResponse {
  id: string;
  code: string;
  eventId: string;
  type: string;
  buyerEmail: string;
  price: number;
  currency: string;
  purchaseDate: string;
  qrToken: string;
  status: TicketStatus;
  usedAt: string | null;
}
