import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { CreateAdminUserUseCase } from "../use-cases/create-admin-user.use-case";
import { GetUsersUseCase } from "../use-cases/get-users.use-case";
import { GetEventStatsUseCase } from "../use-cases/get-event-stats.use-case";
import { GetTicketStatsUseCase } from "../use-cases/get-ticket-stats.use-case";
import { GetDashboardStatsUseCase } from "../use-cases/get-dashboard-stats.use-case";
import { CreateAdminUserDto } from "../../presentation/dtos/create-admin-user.dto";
import { UpdateUserDto } from "../../presentation/dtos/update-user.dto";
import { GetUsersQueryDto } from "../../presentation/dtos/get-users-query.dto";
import { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { ITicketRepository } from "../../domain/interfaces/ticket-repository.interface";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { IReservationRepository } from "../../domain/interfaces/reservation-repository.interface";
import { Email } from "../../domain/value-objects/email.vo";
import { UserRole } from "../../domain/enums/user-role.enum";
import {
  USER_REPOSITORY,
  TICKET_REPOSITORY,
  RESERVATION_REPOSITORY,
  EVENT_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";

@Injectable()
export class AdminService {
  constructor(
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly getEventStatsUseCase: GetEventStatsUseCase,
    private readonly getTicketStatsUseCase: GetTicketStatsUseCase,
    private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: ITicketRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
  ) {}

  async createAdminUser(createAdminUserDto: CreateAdminUserDto) {
    // Check if email already exists
    const emailObj = Email.create(createAdminUserDto.email);
    const existingUser = await this.userRepository.findByEmail(emailObj);
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    return this.createAdminUserUseCase.execute(createAdminUserDto);
  }

  async getUsers(query: GetUsersQueryDto) {
    return this.getUsersUseCase.execute(query);
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Remove password from response
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if email is being changed and if it already exists
    const currentEmailValue =
      typeof user.email === "string" ? user.email : user.email.value;
    if (updateUserDto.email && updateUserDto.email !== currentEmailValue) {
      const emailObj = Email.create(updateUserDto.email);
      const existingUser = await this.userRepository.findByEmail(emailObj);
      if (existingUser) {
        throw new ConflictException("Email already exists");
      }
    }

    const updatedUser = await this.userRepository.update(id, updateUserDto);
    const { passwordHash: _passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.userRepository.delete(id);
    return { message: "User deleted successfully" };
  }

  async getDashboardStats() {
    return this.getDashboardStatsUseCase.execute();
  }

  async getEventStats(eventId?: string) {
    return this.getEventStatsUseCase.execute(eventId);
  }

  async getTicketStats(eventId?: string, user?: any) {
    // If user is organizer, only allow their events
    if (user?.role === UserRole.ORGANIZER) {
      if (eventId) {
        const event = await this.eventRepository.findById(eventId);
        if (!event || event.createdBy !== user.id) {
          throw new NotFoundException(
            "Event not found or you don't have access to it",
          );
        }
        // Return stats for this specific event
        return this.getTicketStatsUseCase.execute(eventId);
      } else {
        // For organizers without specific eventId, we need to aggregate stats from all their events
        // Get all events created by this organizer
        const organizerEvents = await this.eventRepository.findByCreatedBy(
          user.id,
        );

        if (organizerEvents.length === 0) {
          return {
            totalTicketsSold: 0,
            totalRevenue: 0,
            ticketsByStatus: [],
            ticketsByType: [],
            salesByMonth: [],
            topSellingEvents: [],
          };
        }

        // Aggregate stats from all organizer's events
        const eventIds = organizerEvents.map((e) => e.id);
        const stats = await Promise.all(
          eventIds.map((id) => this.getTicketStatsUseCase.execute(id)),
        );

        // Aggregate the results (stats is an array of event-specific stats)
        const totalTicketsSold = stats.reduce(
          (sum, s: any) => sum + (s.soldTickets || 0),
          0,
        );
        const totalRevenue = stats.reduce(
          (sum, s: any) => sum + (s.revenue || 0),
          0,
        );

        return {
          totalTicketsSold,
          totalRevenue,
          events: stats,
        };
      }
    }

    return this.getTicketStatsUseCase.execute(eventId);
  }

  async getTickets(
    filters: {
      eventId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
    user?: any,
  ) {
    const { page = 1, limit = 10, eventId, status } = filters;
    const offset = (page - 1) * limit;

    // If user is organizer, filter by their events only
    let allowedEventIds: string[] | undefined;
    if (user?.role === UserRole.ORGANIZER) {
      if (eventId) {
        // Validate organizer owns this specific event
        const event = await this.eventRepository.findById(eventId);
        if (!event || event.createdBy !== user.id) {
          throw new NotFoundException(
            "Event not found or you don't have access to it",
          );
        }
        allowedEventIds = [eventId];
      } else {
        // Get all events created by this organizer
        const organizerEvents = await this.eventRepository.findByCreatedBy(
          user.id,
        );
        allowedEventIds = organizerEvents.map((e) => e.id);

        if (allowedEventIds.length === 0) {
          // Organizer has no events, return empty
          return {
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          };
        }
      }
    }

    const tickets = await this.ticketRepository.findWithFilters({
      eventId: allowedEventIds ? undefined : eventId,
      eventIds: allowedEventIds,
      status,
      limit,
      offset,
    });

    const total = await this.ticketRepository.countWithFilters({
      eventId: allowedEventIds ? undefined : eventId,
      eventIds: allowedEventIds,
      status,
    });

    // Resolve event names for returned tickets (handles mixed IDs)
    const uniqueEventIds = Array.from(new Set(tickets.map((t) => t.eventId)));
    const eventNameMap = new Map<string, string>();
    for (const id of uniqueEventIds) {
      try {
        const ev = await this.eventRepository.findById(id);
        if (ev) {
          eventNameMap.set(id, ev.name);
        }
      } catch {}
    }

    const enriched = tickets.map((t) => ({
      id: t.id,
      code: t.code,
      eventId: t.eventId,
      eventName: eventNameMap.get(t.eventId) || "Evento no encontrado",
      type: t.type,
      buyerEmail:
        typeof t.buyerEmail === "string" ? t.buyerEmail : t.buyerEmail.value,
      price: {
        amount: t.price.amount,
        currency: t.price.currency,
      },
      purchaseDate: t.purchaseDate,
      status: t.status,
      usedAt: t.usedAt,
    }));

    return {
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReservations(filters: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 10, status } = filters;
    const offset = (page - 1) * limit;

    const reservations = await this.reservationRepository.findWithFilters({
      status,
      limit,
      offset,
    });

    const total = await this.reservationRepository.countWithFilters({
      status,
    });

    return {
      data: reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
