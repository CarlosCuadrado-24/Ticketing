import { Injectable, Inject } from "@nestjs/common";
import { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { IEventRepository } from "../../domain/interfaces/event-repository.interface";
import { ITicketRepository } from "../../domain/interfaces/ticket-repository.interface";
import { IReservationRepository } from "../../domain/interfaces/reservation-repository.interface";
import {
  USER_REPOSITORY,
  EVENT_REPOSITORY,
  TICKET_REPOSITORY,
  RESERVATION_REPOSITORY,
} from "../../domain/interfaces/repository-tokens";

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: ITicketRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: IReservationRepository,
  ) {}

  async execute() {
    const [
      totalUsers,
      totalEvents,
      totalTicketsSold,
      totalRevenue,
      activeReservations,
      recentEvents,
      topEvents,
      eventsByMonth,
    ] = await Promise.all([
      this.userRepository.count(),
      this.eventRepository.count(),
      this.ticketRepository.countSold(),
      this.ticketRepository.getTotalRevenue(),
      this.reservationRepository.countActive(),
      this.eventRepository.findRecent(5),
      this.ticketRepository.getTopSellingEvents(5),
      this.eventRepository.getEventsByMonth(),
    ]);

    return {
      overview: {
        totalUsers,
        totalEvents,
        totalTicketsSold,
        totalRevenue,
        activeReservations,
      },
      recentEvents,
      topEvents,
      eventsByMonth,
    };
  }
}
