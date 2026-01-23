import { Test, TestingModule } from "@nestjs/testing";
import { GetDashboardStatsUseCase } from "./get-dashboard-stats.use-case";
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

describe("GetDashboardStatsUseCase", () => {
  let useCase: GetDashboardStatsUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockEventRepository: jest.Mocked<IEventRepository>;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;
  let mockReservationRepository: jest.Mocked<IReservationRepository>;

  beforeEach(async () => {
    mockUserRepository = {
      count: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      findByRole: jest.fn(),
    } as any;

    mockEventRepository = {
      count: jest.fn(),
      findRecent: jest.fn(),
      getEventsByMonth: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByCreatedBy: jest.fn(),
      findUpcoming: jest.fn(),
      findPast: jest.fn(),
      getEventsByCategory: jest.fn(),
      getRealTimeAvailability: jest.fn(),
      updateTicketAvailability: jest.fn(),
    } as any;

    mockTicketRepository = {
      countSold: jest.fn(),
      getTotalRevenue: jest.fn(),
      getTopSellingEvents: jest.fn(),
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      findByBuyer: jest.fn(),
      findById: jest.fn(),
      findByQRToken: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      findByEvent: jest.fn(),
      getRevenueByEvent: jest.fn(),
      getRevenueByTicketType: jest.fn(),
      countByEvent: jest.fn(),
      getTicketsByTypeForEvent: jest.fn(),
      getSalesByDateForEvent: jest.fn(),
    } as any;

    mockReservationRepository = {
      countActive: jest.fn(),
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      findById: jest.fn(),
      findByBuyerEmail: jest.fn(),
      findActiveByEvent: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findExpired: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDashboardStatsUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: TICKET_REPOSITORY,
          useValue: mockTicketRepository,
        },
        {
          provide: RESERVATION_REPOSITORY,
          useValue: mockReservationRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetDashboardStatsUseCase>(GetDashboardStatsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should return complete dashboard statistics", async () => {
      const mockRecentEvents = [
        { id: "1", name: "Event 1" },
        { id: "2", name: "Event 2" },
      ];
      const mockTopEvents = [
        { eventId: "1", name: "Popular Event", ticketsSold: 500 },
      ];
      const mockEventsByMonth = [
        { month: "2026-01", count: 10 },
        { month: "2026-02", count: 15 },
      ];

      mockUserRepository.count.mockResolvedValue(1500);
      mockEventRepository.count.mockResolvedValue(50);
      mockTicketRepository.countSold.mockResolvedValue(5000);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(500000);
      mockReservationRepository.countActive.mockResolvedValue(25);
      mockEventRepository.findRecent.mockResolvedValue(mockRecentEvents as any);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue(
        mockTopEvents as any,
      );
      mockEventRepository.getEventsByMonth.mockResolvedValue(
        mockEventsByMonth as any,
      );

      const result = await useCase.execute();

      expect(result.overview.totalUsers).toBe(1500);
      expect(result.overview.totalEvents).toBe(50);
      expect(result.overview.totalTicketsSold).toBe(5000);
      expect(result.overview.totalRevenue).toBe(500000);
      expect(result.overview.activeReservations).toBe(25);
      expect(result.recentEvents).toEqual(mockRecentEvents);
      expect(result.topEvents).toEqual(mockTopEvents);
      expect(result.eventsByMonth).toEqual(mockEventsByMonth);
      expect(mockUserRepository.count).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.count).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.findRecent).toHaveBeenCalledWith(5);
      expect(mockTicketRepository.getTopSellingEvents).toHaveBeenCalledWith(5);
    });

    it("should handle zero values gracefully", async () => {
      mockUserRepository.count.mockResolvedValue(0);
      mockEventRepository.count.mockResolvedValue(0);
      mockTicketRepository.countSold.mockResolvedValue(0);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(0);
      mockReservationRepository.countActive.mockResolvedValue(0);
      mockEventRepository.findRecent.mockResolvedValue([]);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue([]);
      mockEventRepository.getEventsByMonth.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result.overview.totalUsers).toBe(0);
      expect(result.overview.totalEvents).toBe(0);
      expect(result.overview.totalTicketsSold).toBe(0);
      expect(result.overview.totalRevenue).toBe(0);
      expect(result.overview.activeReservations).toBe(0);
      expect(result.recentEvents).toEqual([]);
      expect(result.topEvents).toEqual([]);
    });

    it("should execute all queries in parallel", async () => {
      mockUserRepository.count.mockResolvedValue(100);
      mockEventRepository.count.mockResolvedValue(10);
      mockTicketRepository.countSold.mockResolvedValue(500);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(50000);
      mockReservationRepository.countActive.mockResolvedValue(5);
      mockEventRepository.findRecent.mockResolvedValue([]);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue([]);
      mockEventRepository.getEventsByMonth.mockResolvedValue([]);

      await useCase.execute();

      expect(mockUserRepository.count).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.count).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.countSold).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTotalRevenue).toHaveBeenCalledTimes(1);
      expect(mockReservationRepository.countActive).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.findRecent).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTopSellingEvents).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.getEventsByMonth).toHaveBeenCalledTimes(1);
    });
  });
});
