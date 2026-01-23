import { Test, TestingModule } from "@nestjs/testing";
import { GetTicketStatsUseCase } from "./get-ticket-stats.use-case";
import { ITicketRepository } from "../../domain/interfaces/ticket-repository.interface";
import { TICKET_REPOSITORY } from "../../domain/interfaces/repository-tokens";

describe("GetTicketStatsUseCase", () => {
  let useCase: GetTicketStatsUseCase;
  let mockTicketRepository: jest.Mocked<ITicketRepository>;

  beforeEach(async () => {
    mockTicketRepository = {
      countTotalByEvent: jest.fn(),
      countSoldByEvent: jest.fn(),
      countUsedByEvent: jest.fn(),
      getRevenueByEvent: jest.fn(),
      getTicketsByTypeForEvent: jest.fn(),
      getSalesTrendForEvent: jest.fn(),
      countSold: jest.fn(),
      getTotalRevenue: jest.fn(),
      getTicketsByStatus: jest.fn(),
      getTicketsByType: jest.fn(),
      getSalesByMonth: jest.fn(),
      getTopSellingEvents: jest.fn(),
      findById: jest.fn(),
      findByBuyer: jest.fn(),
      findByBuyerEmail: jest.fn(),
      findByQRToken: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByEventId: jest.fn(),
      countByEvent: jest.fn(),
      getSalesByDateForEvent: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTicketStatsUseCase,
        {
          provide: TICKET_REPOSITORY,
          useValue: mockTicketRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetTicketStatsUseCase>(GetTicketStatsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("execute with eventId", () => {
    it("should return ticket statistics for specific event", async () => {
      const eventId = "EVENT-001";

      const ticketsByType = [
        { type: "GENERAL", count: 80, revenue: 4000 },
        { type: "VIP", count: 20, revenue: 3000 },
      ];

      const salesTrend = [
        { date: "2026-01-10", count: 30 },
        { date: "2026-01-11", count: 40 },
        { date: "2026-01-12", count: 30 },
      ];

      mockTicketRepository.countTotalByEvent.mockResolvedValue(150);
      mockTicketRepository.countSoldByEvent.mockResolvedValue(100);
      mockTicketRepository.countUsedByEvent.mockResolvedValue(80);
      mockTicketRepository.getRevenueByEvent.mockResolvedValue(7000);
      mockTicketRepository.getTicketsByTypeForEvent.mockResolvedValue(
        ticketsByType,
      );
      mockTicketRepository.getSalesTrendForEvent.mockResolvedValue(salesTrend);

      const result = await useCase.execute(eventId);

      expect(result).toHaveProperty("eventId", eventId);
      expect(result).toHaveProperty("totalTickets", 150);
      expect(result).toHaveProperty("soldTickets", 100);
      expect(result).toHaveProperty("usedTickets", 80);
      expect(result).toHaveProperty("availableTickets", 50); // 150 - 100
      expect(result).toHaveProperty("revenue", 7000);
      expect(result).toHaveProperty("ticketsByType", ticketsByType);
      expect(result).toHaveProperty("salesTrend", salesTrend);

      expect(mockTicketRepository.countTotalByEvent).toHaveBeenCalledWith(
        eventId,
      );
      expect(mockTicketRepository.countSoldByEvent).toHaveBeenCalledWith(
        eventId,
      );
      expect(mockTicketRepository.countUsedByEvent).toHaveBeenCalledWith(
        eventId,
      );
      expect(mockTicketRepository.getRevenueByEvent).toHaveBeenCalledWith(
        eventId,
      );
      expect(
        mockTicketRepository.getTicketsByTypeForEvent,
      ).toHaveBeenCalledWith(eventId);
      expect(mockTicketRepository.getSalesTrendForEvent).toHaveBeenCalledWith(
        eventId,
      );
    });

    it("should calculate available tickets correctly", async () => {
      const eventId = "EVENT-002";

      mockTicketRepository.countTotalByEvent.mockResolvedValue(500);
      mockTicketRepository.countSoldByEvent.mockResolvedValue(350);
      mockTicketRepository.countUsedByEvent.mockResolvedValue(300);
      mockTicketRepository.getRevenueByEvent.mockResolvedValue(17500);
      mockTicketRepository.getTicketsByTypeForEvent.mockResolvedValue([]);
      mockTicketRepository.getSalesTrendForEvent.mockResolvedValue([]);

      const result = await useCase.execute(eventId);

      expect(result).toHaveProperty("totalTickets", 500);
      expect(result).toHaveProperty("soldTickets", 350);
      expect(result).toHaveProperty("availableTickets", 150); // 500 - 350
    });

    it("should handle event with no tickets sold", async () => {
      const eventId = "EVENT-003";

      mockTicketRepository.countTotalByEvent.mockResolvedValue(200);
      mockTicketRepository.countSoldByEvent.mockResolvedValue(0);
      mockTicketRepository.countUsedByEvent.mockResolvedValue(0);
      mockTicketRepository.getRevenueByEvent.mockResolvedValue(0);
      mockTicketRepository.getTicketsByTypeForEvent.mockResolvedValue([]);
      mockTicketRepository.getSalesTrendForEvent.mockResolvedValue([]);

      const result = await useCase.execute(eventId);

      expect(result).toHaveProperty("totalTickets", 200);
      expect(result).toHaveProperty("soldTickets", 0);
      expect(result).toHaveProperty("usedTickets", 0);
      expect(result).toHaveProperty("availableTickets", 200);
      expect(result).toHaveProperty("revenue", 0);
    });

    it("should execute all queries in parallel", async () => {
      const eventId = "EVENT-004";

      mockTicketRepository.countTotalByEvent.mockResolvedValue(100);
      mockTicketRepository.countSoldByEvent.mockResolvedValue(75);
      mockTicketRepository.countUsedByEvent.mockResolvedValue(60);
      mockTicketRepository.getRevenueByEvent.mockResolvedValue(3750);
      mockTicketRepository.getTicketsByTypeForEvent.mockResolvedValue([]);
      mockTicketRepository.getSalesTrendForEvent.mockResolvedValue([]);

      await useCase.execute(eventId);

      expect(mockTicketRepository.countTotalByEvent).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.countSoldByEvent).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.countUsedByEvent).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getRevenueByEvent).toHaveBeenCalledTimes(1);
      expect(
        mockTicketRepository.getTicketsByTypeForEvent,
      ).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getSalesTrendForEvent).toHaveBeenCalledTimes(
        1,
      );
    });

    it("should handle repository errors gracefully", async () => {
      const eventId = "EVENT-ERROR";

      mockTicketRepository.countTotalByEvent.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(useCase.execute(eventId)).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("should handle high volume events", async () => {
      const eventId = "EVENT-STADIUM";

      mockTicketRepository.countTotalByEvent.mockResolvedValue(80000);
      mockTicketRepository.countSoldByEvent.mockResolvedValue(75000);
      mockTicketRepository.countUsedByEvent.mockResolvedValue(70000);
      mockTicketRepository.getRevenueByEvent.mockResolvedValue(7500000);
      mockTicketRepository.getTicketsByTypeForEvent.mockResolvedValue([
        { type: "GENERAL", count: 60000 },
        { type: "VIP", count: 15000 },
      ]);
      mockTicketRepository.getSalesTrendForEvent.mockResolvedValue([]);

      const result = await useCase.execute(eventId);

      expect(result).toHaveProperty("totalTickets", 80000);
      expect(result).toHaveProperty("soldTickets", 75000);
      expect(result).toHaveProperty("availableTickets", 5000);
      expect(result).toHaveProperty("revenue", 7500000);
    });
  });

  describe("execute without eventId", () => {
    it("should return all tickets statistics", async () => {
      const ticketsByStatus = [
        { status: "PAID", count: 1500 },
        { status: "USED", count: 1200 },
      ];

      const ticketsByType = [
        { type: "GENERAL", count: 2000, revenue: 100000 },
        { type: "VIP", count: 500, revenue: 75000 },
        { type: "EARLY_BIRD", count: 200, revenue: 16000 },
      ];

      const salesByMonth = [
        { month: "2026-01", count: 500, revenue: 25000 },
        { month: "2026-02", count: 700, revenue: 35000 },
      ];

      const topSellingEvents = [
        {
          eventId: "EVENT-001",
          eventName: "Concert A",
          ticketsSold: 500,
          revenue: 25000,
        },
        {
          eventId: "EVENT-002",
          eventName: "Concert B",
          ticketsSold: 450,
          revenue: 22500,
        },
      ];

      mockTicketRepository.countSold.mockResolvedValue(2700);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(191000);
      mockTicketRepository.getTicketsByStatus.mockResolvedValue(
        ticketsByStatus,
      );
      mockTicketRepository.getTicketsByType.mockResolvedValue(ticketsByType);
      mockTicketRepository.getSalesByMonth.mockResolvedValue(salesByMonth);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue(
        topSellingEvents,
      );

      const result = await useCase.execute();

      expect(result).toHaveProperty("totalTicketsSold", 2700);
      expect(result).toHaveProperty("totalRevenue", 191000);
      expect(result).toHaveProperty("ticketsByStatus", ticketsByStatus);
      expect(result).toHaveProperty("ticketsByType", ticketsByType);
      expect(result).toHaveProperty("salesByMonth", salesByMonth);
      expect(result).toHaveProperty("topSellingEvents", topSellingEvents);

      expect(mockTicketRepository.countSold).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTotalRevenue).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTicketsByStatus).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTicketsByType).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getSalesByMonth).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTopSellingEvents).toHaveBeenCalledWith(10);
    });

    it("should handle empty statistics", async () => {
      mockTicketRepository.countSold.mockResolvedValue(0);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(0);
      mockTicketRepository.getTicketsByStatus.mockResolvedValue([]);
      mockTicketRepository.getTicketsByType.mockResolvedValue([]);
      mockTicketRepository.getSalesByMonth.mockResolvedValue([]);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toHaveProperty("totalTicketsSold", 0);
      expect(result).toHaveProperty("totalRevenue", 0);
      expect(result).toHaveProperty("ticketsByStatus");
      expect(result).toHaveProperty("ticketsByType");
      expect(result).toHaveProperty("salesByMonth");
      expect(result).toHaveProperty("topSellingEvents");
    });

    it("should execute all queries in parallel for all tickets", async () => {
      mockTicketRepository.countSold.mockResolvedValue(0);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(0);
      mockTicketRepository.getTicketsByStatus.mockResolvedValue([]);
      mockTicketRepository.getTicketsByType.mockResolvedValue([]);
      mockTicketRepository.getSalesByMonth.mockResolvedValue([]);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue([]);

      await useCase.execute();

      expect(mockTicketRepository.countSold).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTotalRevenue).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTicketsByStatus).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTicketsByType).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getSalesByMonth).toHaveBeenCalledTimes(1);
      expect(mockTicketRepository.getTopSellingEvents).toHaveBeenCalledTimes(1);
    });

    it("should handle repository errors for all tickets stats", async () => {
      mockTicketRepository.countSold.mockRejectedValue(
        new Error("Query timeout"),
      );

      await expect(useCase.execute()).rejects.toThrow("Query timeout");
    });

    it("should not call event-specific methods when no eventId provided", async () => {
      mockTicketRepository.countSold.mockResolvedValue(0);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(0);
      mockTicketRepository.getTicketsByStatus.mockResolvedValue([]);
      mockTicketRepository.getTicketsByType.mockResolvedValue([]);
      mockTicketRepository.getSalesByMonth.mockResolvedValue([]);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue([]);

      await useCase.execute();

      expect(mockTicketRepository.countTotalByEvent).not.toHaveBeenCalled();
      expect(mockTicketRepository.countSoldByEvent).not.toHaveBeenCalled();
      expect(mockTicketRepository.countUsedByEvent).not.toHaveBeenCalled();
      expect(mockTicketRepository.getSalesTrendForEvent).not.toHaveBeenCalled();
    });

    it("should handle large scale statistics", async () => {
      mockTicketRepository.countSold.mockResolvedValue(1000000);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(50000000);
      mockTicketRepository.getTicketsByStatus.mockResolvedValue([
        { status: "PAID", count: 800000 },
        { status: "USED", count: 200000 },
      ]);
      mockTicketRepository.getTicketsByType.mockResolvedValue([
        { type: "GENERAL", count: 700000 },
        { type: "VIP", count: 300000 },
      ]);
      mockTicketRepository.getSalesByMonth.mockResolvedValue([]);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toHaveProperty("totalTicketsSold", 1000000);
      expect(result).toHaveProperty("totalRevenue", 50000000);
    });
  });

  describe("execute with undefined eventId", () => {
    it("should treat undefined as no eventId", async () => {
      mockTicketRepository.countSold.mockResolvedValue(0);
      mockTicketRepository.getTotalRevenue.mockResolvedValue(0);
      mockTicketRepository.getTicketsByStatus.mockResolvedValue([]);
      mockTicketRepository.getTicketsByType.mockResolvedValue([]);
      mockTicketRepository.getSalesByMonth.mockResolvedValue([]);
      mockTicketRepository.getTopSellingEvents.mockResolvedValue([]);

      const result = await useCase.execute(undefined);

      expect(result).toHaveProperty("totalTicketsSold");
      expect(result).toHaveProperty("totalRevenue");
      expect(mockTicketRepository.countTotalByEvent).not.toHaveBeenCalled();
    });
  });
});
