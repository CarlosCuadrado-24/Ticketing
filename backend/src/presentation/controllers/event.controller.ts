import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Inject,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CreateEventUseCase } from "../../application/use-cases/create-event.use-case";
import { GetAllEventsUseCase } from "../../application/use-cases/get-all-events.use-case";
import { TicketConfiguration } from "../../domain/entities/ticket-configuration.entity";
import { Event as EventEntity } from "../../domain/entities/event.entity";
import { UpdateEventUseCase } from "../../application/use-cases/update-event.use-case";
import { DeleteEventUseCase } from "../../application/use-cases/delete-event.use-case";
import { CreateEventDto } from "../../application/dto/create-event.dto";
import { UpdateEventDto } from "../../application/dto/update-event.dto";
import { Event } from "../../domain/entities/event.entity";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import {
  EVENT_REPOSITORY,
  USER_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";
import { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { User } from "../../domain/entities/user.entity";
import { MinioService } from "../../infrastructure/external/minio.service";
import { OptionalJwtAuthGuard } from "../../application/services/optional-jwt-auth.guard";
import { JwtAuthGuard } from "../../application/services/jwt-auth.guard";

/**
 * EventController
 * Handles HTTP requests for event management - Complete CRUD operations
 * Follows REST conventions and NestJS best practices
 * Requirements: 1.1, 1.3, 1.4
 */
@ApiTags("events")
@Controller("events")
export class EventController {
  constructor(
    private readonly createEventUseCase: CreateEventUseCase,
    private readonly getAllEventsUseCase: GetAllEventsUseCase,
    private readonly updateEventUseCase: UpdateEventUseCase,
    private readonly deleteEventUseCase: DeleteEventUseCase,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly minioService: MinioService,
  ) {}

  /**
   * POST /events
   * Creates a new event with ticket configurations and optional image
   *
   * @param createEventDto - The event data to create
   * @param file - Optional image file for the event
   * @returns The created event with ID
   * @throws BadRequestException if input validation fails
   *
   * Requirement 1.1: Persist event and return unique identifier
   * Requirement 1.2: Store ticket configuration with price and quantity
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("image"))
  @ApiConsumes("multipart/form-data")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a new event",
    description:
      "Creates a new event with ticket configurations and an optional image. Requires authentication.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Event name" },
        date: {
          type: "string",
          format: "date-time",
          description: "Event date in ISO 8601 format",
        },
        location: { type: "string", description: "Event location" },
        ticketConfigurations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["VIP", "GENERAL", "EARLY_BIRD"] },
              price: { type: "number" },
              currency: { type: "string" },
              quantity: { type: "number" },
            },
          },
        },
        image: {
          type: "string",
          format: "binary",
          description: "Event image file (optional, jpg/png/gif)",
        },
      },
      required: ["name", "date", "location", "ticketConfigurations"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Event successfully created",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Event unique identifier" },
        name: { type: "string", description: "Event name" },
        date: {
          type: "string",
          format: "date-time",
          description: "Event date and time",
        },
        location: { type: "string", description: "Event location" },
        imageUrl: {
          type: "string",
          nullable: true,
          description: "URL of the event image",
        },
        ticketConfigurations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["VIP", "GENERAL", "EARLY_BIRD"],
                description: "Ticket type",
              },
              price: { type: "number", description: "Ticket price" },
              currency: { type: "string", description: "Price currency" },
              totalQuantity: {
                type: "number",
                description: "Total tickets available",
              },
              availableQuantity: {
                type: "number",
                description: "Currently available tickets",
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        message: { type: "string", example: "Validation failed" },
        error: { type: "string", example: "Bad Request" },
      },
    },
  })
  async create(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
    @Request() req?: any,
  ): Promise<EventResponse> {
    try {
      // Parse and validate data (handles both JSON and form-data)
      const name = body.name;
      const date = body.date;
      const location = body.location;
      const venueName = body.venueName;

      if (!name || !date || !location || !venueName) {
        throw new BadRequestException(
          "name, date, location, and venueName are required",
        );
      }

      // Convert ISO string to Date
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        throw new BadRequestException(
          "Invalid date format. Use ISO 8601 format",
        );
      }

      // Parse ticket configurations
      let ticketConfigurations;
      try {
        ticketConfigurations =
          typeof body.ticketConfigurations === "string"
            ? JSON.parse(body.ticketConfigurations)
            : body.ticketConfigurations;
      } catch (error) {
        throw new BadRequestException(
          "Invalid ticketConfigurations JSON format",
        );
      }

      if (
        !Array.isArray(ticketConfigurations) ||
        ticketConfigurations.length === 0
      ) {
        throw new BadRequestException(
          "At least one ticket configuration is required",
        );
      }

      // Validate each ticket configuration
      for (const config of ticketConfigurations) {
        if (
          !config.type ||
          !config.price ||
          !config.currency ||
          !config.quantity
        ) {
          throw new BadRequestException(
            "Each ticket configuration must have type, price, currency, and quantity",
          );
        }
        if (typeof config.price !== "number" || config.price < 0) {
          throw new BadRequestException("Price must be a positive number");
        }
        if (typeof config.quantity !== "number" || config.quantity < 1) {
          throw new BadRequestException("Quantity must be at least 1");
        }
      }

      // Upload image if provided
      let imageUrl: string | undefined;
      if (file) {
        // Validate file type
        const allowedMimes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedMimes.includes(file.mimetype)) {
          throw new BadRequestException(
            "Only JPEG, PNG, and GIF images are allowed",
          );
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException("Image file size cannot exceed 5MB");
        }

        // Upload to MinIO
        imageUrl = await this.minioService.uploadFile(file);
      }

      // Parse event details if provided, otherwise create default details
      let eventDetails;
      try {
        eventDetails = body.eventDetails
          ? typeof body.eventDetails === "string"
            ? JSON.parse(body.eventDetails)
            : body.eventDetails
          : [
              {
                category: "General",
                minAge: null,
                seating: "General Admission",
                capacity: ticketConfigurations.reduce(
                  (total: number, config: any) => total + config.quantity,
                  0,
                ),
                foodSale: false,
                liquorSale: false,
                reducedMobilityAccess: false,
                pregnantAccess: false,
              },
            ];
      } catch (error) {
        throw new BadRequestException("Invalid eventDetails JSON format");
      }

      // Execute use case
      const event = await this.createEventUseCase.execute({
        name,
        date: eventDate,
        location,
        venueName,
        imageUrl,
        ticketConfigurations,
        eventDetails,
        createdBy: req?.user?.id, // Extract user ID from JWT token
      });

      return await this.formatEventResponse(event);
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
   * PUT /events/:id
   * Updates an existing event
   *
   * @param id - The event ID
   * @returns The event with all ticket configurations and availability
   * @throws NotFoundException if event does not exist
   *
   * Requirement 1.3: Return event with all ticket types and current availability
   * Requirement 1.4: Return error with message "Evento no encontrado" if not found
   */
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get event by ID",
    description:
      "Retrieves an event by its unique identifier with all ticket configurations and current availability",
  })
  @ApiParam({
    name: "id",
    description: "Event unique identifier",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "Event found successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Event unique identifier" },
        name: { type: "string", description: "Event name" },
        date: {
          type: "string",
          format: "date-time",
          description: "Event date and time",
        },
        location: { type: "string", description: "Event location" },
        ticketConfigurations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["VIP", "GENERAL", "EARLY_BIRD"],
                description: "Ticket type",
              },
              price: { type: "number", description: "Ticket price" },
              currency: { type: "string", description: "Price currency" },
              totalQuantity: {
                type: "number",
                description: "Total tickets available",
              },
              availableQuantity: {
                type: "number",
                description: "Currently available tickets",
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Event not found",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 404 },
        message: { type: "string", example: "Event not found" },
        error: { type: "string", example: "Not Found" },
      },
    },
  })
  async findById(@Param("id") id: string): Promise<EventResponse> {
    const event = await this.eventRepository.findById(id);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Calculate real-time availability for this specific event
    const updatedConfigurations = await Promise.all(
      event.ticketConfigurations.map(async (config) => {
        const realAvailability =
          await this.eventRepository.getRealTimeAvailability(
            event.id,
            config.type,
          );

        // Create new TicketConfiguration with real availability
        return new TicketConfiguration(
          config.type,
          config.price,
          config.totalQuantity,
          realAvailability, // Use real-time calculated availability
          config.id,
        );
      }),
    );

    // Create new Event with updated configurations
    const eventWithRealAvailability = new EventEntity(
      event.id,
      event.name,
      event.date,
      event.location,
      event.venueName,
      updatedConfigurations,
      event.imageUrl,
      event.details,
      event.createdBy,
    );

    return await this.formatEventResponse(eventWithRealAvailability);
  }

  /**
   * PUT /events/:id
   * Updates an existing event with optional image upload
   *
   * @param id - The event ID
   * @param updateEventDto - The event data to update
   * @param file - Optional image file for the event
   * @returns The updated event
   * @throws NotFoundException if event does not exist
   * @throws BadRequestException if input validation fails
   */
  @Put(":id")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({
    summary: "Update event by ID",
    description: "Updates an existing event with new data and optional image",
  })
  @ApiParam({
    name: "id",
    description: "Event unique identifier",
    type: "string",
    format: "uuid",
  })
  @ApiBody({
    type: UpdateEventDto,
    description: "Event update data with optional image",
  })
  @ApiResponse({
    status: 200,
    description: "Event updated successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Event unique identifier" },
        name: { type: "string", description: "Event name" },
        date: {
          type: "string",
          format: "date-time",
          description: "Event date and time",
        },
        location: { type: "string", description: "Event location" },
        imageUrl: { type: "string", description: "URL of the event image" },
        ticketConfigurations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["VIP", "GENERAL", "EARLY_BIRD"],
                description: "Ticket type",
              },
              price: { type: "number", description: "Ticket price" },
              currency: { type: "string", description: "Price currency" },
              totalQuantity: {
                type: "number",
                description: "Total tickets available",
              },
              availableQuantity: {
                type: "number",
                description: "Currently available tickets",
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        message: { type: "string", example: "Validation failed" },
        error: { type: "string", example: "Bad Request" },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Event not found",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 404 },
        message: { type: "string", example: "Event not found" },
        error: { type: "string", example: "Not Found" },
      },
    },
  })
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<EventResponse> {
    try {
      // Get existing event to merge with updates
      const existingEvent = await this.eventRepository.findById(id);
      if (!existingEvent) {
        throw new NotFoundException("Event not found");
      }

      // Handle image upload if provided
      let imageUrl = existingEvent.imageUrl;
      if (file) {
        const allowedMimes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedMimes.includes(file.mimetype)) {
          throw new BadRequestException(
            "Only JPEG, PNG, and GIF images are allowed",
          );
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException("Image file size cannot exceed 5MB");
        }
        imageUrl = await this.minioService.uploadFile(file);
      }

      // Merge existing data with updates (body may come from multipart/form-data)
      const eventDate = body.date ? new Date(body.date) : existingEvent.date;
      const name = body.name ?? existingEvent.name;
      const location = body.location ?? existingEvent.location;
      const venueName = body.venueName ?? existingEvent.venueName;

      // Parse ticketConfigurations when provided as string (multipart) or object
      let ticketConfigurations: any;
      try {
        ticketConfigurations = body.ticketConfigurations
          ? typeof body.ticketConfigurations === 'string'
            ? JSON.parse(body.ticketConfigurations)
            : body.ticketConfigurations
          : existingEvent.ticketConfigurations.map((config) => ({
              type: config.type,
              price: config.price.amount,
              currency: config.price.currency,
              quantity: config.totalQuantity,
            }));
      } catch (err) {
        throw new BadRequestException('Invalid ticketConfigurations JSON format');
      }

      if (body.ticketConfigurations && (!Array.isArray(ticketConfigurations) || ticketConfigurations.length === 0)) {
        throw new BadRequestException('At least one ticket configuration is required');
      }

      // Execute use case
      const event = await this.updateEventUseCase.execute({
        id,
        name,
        date: eventDate,
        location,
        venueName,
        ticketConfigurations,
      });

      // Update event with new image URL if it changed
      if (imageUrl && imageUrl !== existingEvent.imageUrl) {
        const updatedEvent = new EventEntity(
          event.id,
          event.name,
          event.date,
          event.location,
          event.venueName,
          [...event.ticketConfigurations], // Convert readonly to mutable array
          imageUrl, // Set new image URL
          event.details,
          event.createdBy,
        );
        await this.eventRepository.update(updatedEvent);
      }

      // Return formatted response with final imageUrl
      const finalEvent = new EventEntity(
        event.id,
        event.name,
        event.date,
        event.location,
        event.venueName,
        [...event.ticketConfigurations], // Convert readonly to mutable array
        imageUrl,
        event.details,
        event.createdBy,
      );
      return await this.formatEventResponse(finalEvent);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.message === "Event not found") {
          throw new NotFoundException("Event not found");
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * DELETE /events/:id
   * Deletes an event
   *
   * @param id - The event ID
   * @throws NotFoundException if event does not exist
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete event by ID",
    description: "Deletes an existing event",
  })
  @ApiParam({
    name: "id",
    description: "Event unique identifier",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 204,
    description: "Event deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Event not found",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 404 },
        message: { type: "string", example: "Event not found" },
        error: { type: "string", example: "Not Found" },
      },
    },
  })
  async delete(@Param("id") id: string): Promise<void> {
    try {
      await this.deleteEventUseCase.execute(id);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Event not found") {
          throw new NotFoundException("Event not found");
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * GET /events
   * Retrieves all events or events filtered by current user (for organizers)
   *
   * @param req - Request object containing user info from JWT
   * @returns Array of events with their ticket configurations
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get all events",
    description:
      "Retrieves all events with their ticket configurations and current availability. For organizers, returns only their own events.",
  })
  @ApiResponse({
    status: 200,
    description: "Events retrieved successfully",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Event unique identifier" },
          name: { type: "string", description: "Event name" },
          date: {
            type: "string",
            format: "date-time",
            description: "Event date and time",
          },
          location: { type: "string", description: "Event location" },
          ticketConfigurations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["VIP", "GENERAL", "EARLY_BIRD"],
                  description: "Ticket type",
                },
                price: { type: "number", description: "Ticket price" },
                currency: { type: "string", description: "Price currency" },
                totalQuantity: {
                  type: "number",
                  description: "Total tickets available",
                },
                availableQuantity: {
                  type: "number",
                  description: "Currently available tickets",
                },
              },
            },
          },
        },
      },
    },
  })
  async findAll(@Request() req?: any): Promise<EventResponse[]> {
    let events: Event[];

    // If user is authenticated and is an organizer, filter by their events
    if (req?.user?.id && req?.user?.role === "ORGANIZER") {
      events = await this.eventRepository.findByCreatedBy(req.user.id);
    } else {
      // For admins and public access, return all events
      events = await this.getAllEventsUseCase.execute();
    }

    return await Promise.all(
      events.map((event) => this.formatEventResponse(event)),
    );
  }

  /**
   * GET /events/file/:filename
   * Serves a file from MinIO storage by streaming it directly
   * This endpoint acts as a proxy to avoid CORS issues with MinIO
   */
  @Get("file/:filename")
  @ApiOperation({ summary: "Get a file from storage" })
  @ApiResponse({ status: 200, description: "Returns the file" })
  @ApiResponse({ status: 404, description: "File not found" })
  @ApiParam({ name: "filename", description: "The filename to retrieve" })
  async getFile(
    @Param("filename") filename: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Security: Validate filename to prevent path traversal attacks (A01:2021 - Broken Access Control)
      if (
        !filename ||
        filename.includes("..") ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        throw new BadRequestException("Invalid filename");
      }

      // Construct the object path in MinIO
      const objectPath = `event-images/${filename}`;

      // Get file metadata to set proper headers
      const metadata = await this.minioService.getFileMetadata(objectPath);

      // Get file stream from MinIO
      const stream = await this.minioService.getFileStream(objectPath);

      // Set appropriate headers
      res.setHeader(
        "Content-Type",
        metadata.metaData["content-type"] || "application/octet-stream",
      );
      res.setHeader("Content-Length", metadata.size);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.setHeader("Access-Control-Allow-Origin", "*"); // Allow CORS

      // Pipe the stream to the response
      stream.pipe(res);
    } catch (error) {
      throw new NotFoundException(`File not found: ${filename}`);
    }
  }

  /**
   * Formats an Event entity into an HTTP response
   *
   * @param event - The Event entity to format
   * @returns Formatted event response
   */
  private async formatEventResponse(event: Event): Promise<EventResponse> {
    let organizer = null;

    // Si el evento tiene un createdBy, obtener la información del usuario
    if (event.createdBy) {
      const user = await this.userRepository.findById(event.createdBy);
      if (user) {
        organizer = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: typeof user.email === "string" ? user.email : user.email.value,
        };
      }
    }

    return {
      id: event.id,
      name: event.name,
      date: event.date.toISOString(),
      location: event.location,
      venueName: event.venueName,
      imageUrl: event.imageUrl || null,
      createdBy: event.createdBy || null,
      organizer,
      ticketConfigurations: event.ticketConfigurations.map((config) => ({
        type: config.type,
        price: config.price.amount,
        currency: config.price.currency,
        totalQuantity: config.totalQuantity,
        availableQuantity: config.availableQuantity,
      })),
      eventDetails: event.details || [],
    };
  }
}

/**
 * EventResponse
 * HTTP response format for events
 */
interface EventResponse {
  id: string;
  name: string;
  date: string;
  location: string;
  venueName: string;
  imageUrl: string | null;
  createdBy: string | null;
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  ticketConfigurations: Array<{
    type: string;
    price: number;
    currency: string;
    totalQuantity: number;
    availableQuantity: number;
  }>;
  eventDetails: any[];
}
