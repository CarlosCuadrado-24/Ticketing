import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Ticket, TicketStatus } from "../../../domain/entities/ticket.entity";
import { ITicketRepository } from "../../../domain/interfaces/ticket-repository.interface";
import { Email } from "../../../domain/value-objects/email.vo";
import { TicketOrmEntity } from "../entities/ticket.orm-entity";
import { TicketMapper } from "../mappers/ticket.mapper";

/**
 * TypeOrmTicketRepository
 * Implements the ITicketRepository interface using TypeORM
 * Handles persistence of Ticket entities to PostgreSQL database
 *
 * Requirements: 4.4, 6.1, 6.2, 8.3
 * - 4.4: Generate tickets with unique code, event, type and buyer data
 * - 6.1: Return all confirmed tickets for a buyer
 * - 6.2: Each ticket includes all required fields
 * - 8.3: Ensure round-trip serialization/deserialization
 */
@Injectable()
export class TypeOrmTicketRepository implements ITicketRepository {
  private readonly repository: Repository<TicketOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(TicketOrmEntity);
  }

  /**
   * Saves a single ticket to the database
   * @param ticket - The Ticket entity to save
   * @returns Promise resolving to the saved Ticket with ID
   * @throws Error if save operation fails
   */
  async save(ticket: Ticket): Promise<Ticket> {
    const ormEntity = TicketMapper.toPersistence(ticket);
    const savedOrmEntity = await this.repository.save(ormEntity);
    return TicketMapper.toDomain(savedOrmEntity);
  }

  /**
   * Saves multiple tickets in a single operation
   * Useful for batch operations after successful payment
   * @param tickets - Array of Ticket entities to save
   * @returns Promise resolving to array of saved Tickets
   * @throws Error if any save operation fails
   */
  async saveMany(tickets: Ticket[]): Promise<Ticket[]> {
    const ormEntities = tickets.map((ticket) =>
      TicketMapper.toPersistence(ticket),
    );
    const savedOrmEntities = await this.repository.save(ormEntities);
    return savedOrmEntities.map((ormEntity) =>
      TicketMapper.toDomain(ormEntity),
    );
  }

  /**
   * Finds all tickets purchased by a specific buyer
   * Requirements: 6.1 - Return all confirmed tickets for a buyer
   * @param email - The Email value object of the buyer
   * @returns Promise resolving to array of Tickets for the buyer
   */
  async findByBuyer(email: Email): Promise<Ticket[]> {
    const ormEntities = await this.repository.find({
      where: { buyerEmail: email.value },
    });

    return ormEntities.map((ormEntity) => TicketMapper.toDomain(ormEntity));
  }

  /**
   * Finds all tickets purchased by a specific buyer email (string version)
   * @param email - The email string of the buyer
   * @returns Promise resolving to array of Tickets for the buyer
   */
  async findByBuyerEmail(email: string): Promise<Ticket[]> {
    const ormEntities = await this.repository.find({
      where: { buyerEmail: email },
    });

    return ormEntities.map((ormEntity) => TicketMapper.toDomain(ormEntity));
  }

  /**
   * Finds all tickets for a specific event
   * Useful for event statistics and availability tracking
   * @param eventId - The ID of the event
   * @returns Promise resolving to array of Tickets for the event
   */
  async findByEvent(eventId: string): Promise<Ticket[]> {
    const ormEntities = await this.repository.find({
      where: { eventId },
    });

    return ormEntities.map((ormEntity) => TicketMapper.toDomain(ormEntity));
  }

  /**
   * Finds all tickets for a specific event (alias for findByEvent)
   * @param eventId - The ID of the event
   * @returns Promise resolving to array of Tickets for the event
   */
  async findByEventId(eventId: string): Promise<Ticket[]> {
    return this.findByEvent(eventId);
  }

  /**
   * Finds tickets for a specific event and buyer
   * @param eventId - The ID of the event
   * @param buyerEmail - The email of the buyer
   * @returns Promise resolving to array of Tickets
   */
  async findByEventAndBuyer(
    eventId: string,
    buyerEmail: string,
  ): Promise<Ticket[]> {
    const ormEntities = await this.repository.find({
      where: {
        eventId,
        buyerEmail,
      },
    });

    return ormEntities.map((ormEntity) => TicketMapper.toDomain(ormEntity));
  }

  /**
   * Finds a ticket by its QR token
   * Used for ticket validation at event entrance
   * @param qrToken - The unique QR token (UUID)
   * @returns Promise resolving to the Ticket or null if not found
   */
  async findByQRToken(qrToken: string): Promise<Ticket | null> {
    const ormEntity = await this.repository.findOne({
      where: { qrToken },
    });

    return ormEntity ? TicketMapper.toDomain(ormEntity) : null;
  }

  /**
   * Finds a ticket by its ID
   * @param id - The ticket ID
   * @returns Promise resolving to the Ticket or null if not found
   */
  async findById(id: string): Promise<Ticket | null> {
    const ormEntity = await this.repository.findOne({
      where: { id },
    });

    return ormEntity ? TicketMapper.toDomain(ormEntity) : null;
  }

  // Admin methods for statistics and management
  async findWithFilters(filters: {
    eventId?: string;
    eventIds?: string[]; // Added to support filtering by multiple events
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Ticket[]> {
    const queryBuilder = this.repository.createQueryBuilder("ticket");

    if (filters.eventId) {
      queryBuilder.andWhere("ticket.eventId = :eventId", {
        eventId: filters.eventId,
      });
    }

    // Support filtering by multiple event IDs (for organizers)
    if (filters.eventIds && filters.eventIds.length > 0) {
      queryBuilder.andWhere("ticket.eventId IN (:...eventIds)", {
        eventIds: filters.eventIds,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere("ticket.status = :status", {
        status: filters.status,
      });
    }

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    const ormEntities = await queryBuilder.getMany();
    return ormEntities.map((entity) => TicketMapper.toDomain(entity));
  }

  async countWithFilters(filters: {
    eventId?: string;
    eventIds?: string[]; // Added to support filtering by multiple events
    status?: string;
  }): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder("ticket");

    if (filters.eventId) {
      queryBuilder.andWhere("ticket.eventId = :eventId", {
        eventId: filters.eventId,
      });
    }

    // Support filtering by multiple event IDs (for organizers)
    if (filters.eventIds && filters.eventIds.length > 0) {
      queryBuilder.andWhere("ticket.eventId IN (:...eventIds)", {
        eventIds: filters.eventIds,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere("ticket.status = :status", {
        status: filters.status,
      });
    }

    return await queryBuilder.getCount();
  }

  async countSold(): Promise<number> {
    return await this.repository.count({
      where: { status: TicketStatus.PAID },
    });
  }

  async countByEvent(eventId: string): Promise<number> {
    return await this.repository.count({
      where: { eventId },
    });
  }

  async countSoldByEvent(eventId: string): Promise<number> {
    return await this.repository.count({
      where: { eventId, status: TicketStatus.PAID },
    });
  }

  async countUsedByEvent(eventId: string): Promise<number> {
    return await this.repository.count({
      where: { eventId, status: TicketStatus.USED },
    });
  }

  async countTotalByEvent(eventId: string): Promise<number> {
    return await this.repository.count({
      where: { eventId },
    });
  }

  async getTotalRevenue(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder("ticket")
      .select("SUM(ticket.price)", "total")
      .where("ticket.status = :status", { status: TicketStatus.PAID })
      .getRawOne();

    return parseFloat(result?.total || "0");
  }

  async getRevenueByEvent(eventId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder("ticket")
      .select("SUM(ticket.price)", "total")
      .where("ticket.eventId = :eventId", { eventId })
      .andWhere("ticket.status = :status", { status: TicketStatus.PAID })
      .getRawOne();

    return parseFloat(result?.total || "0");
  }

  async getTicketsByStatus(): Promise<
    Array<{ status: string; count: number }>
  > {
    const result = await this.repository
      .createQueryBuilder("ticket")
      .select("ticket.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("ticket.status")
      .getRawMany();

    return result.map((row) => ({
      status: row.status,
      count: parseInt(row.count, 10),
    }));
  }

  async getTicketsByType(): Promise<Array<{ type: string; count: number }>> {
    const result = await this.repository
      .createQueryBuilder("ticket")
      .select("ticket.type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("ticket.type")
      .getRawMany();

    return result.map((row) => ({
      type: row.type,
      count: parseInt(row.count, 10),
    }));
  }

  async getTicketsByTypeForEvent(
    eventId: string,
  ): Promise<Array<{ type: string; count: number }>> {
    const result = await this.repository
      .createQueryBuilder("ticket")
      .select("ticket.type", "type")
      .addSelect("COUNT(*)", "count")
      .where("ticket.eventId = :eventId", { eventId })
      .groupBy("ticket.type")
      .getRawMany();

    return result.map((row) => ({
      type: row.type,
      count: parseInt(row.count, 10),
    }));
  }

  async getSalesByMonth(): Promise<
    Array<{ month: string; count: number; revenue: number }>
  > {
    const result = await this.repository
      .createQueryBuilder("ticket")
      .select("TO_CHAR(ticket.purchaseDate, 'YYYY-MM')", "month")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(ticket.price)", "revenue")
      .where("ticket.status = :status", { status: TicketStatus.PAID })
      .groupBy("TO_CHAR(ticket.purchaseDate, 'YYYY-MM')")
      .orderBy("month", "DESC")
      .getRawMany();

    return result.map((row) => ({
      month: row.month,
      count: parseInt(row.count, 10),
      revenue: parseFloat(row.revenue || "0"),
    }));
  }

  async getSalesByDateForEvent(
    eventId: string,
  ): Promise<Array<{ date: string; count: number }>> {
    const result = await this.repository
      .createQueryBuilder("ticket")
      .select("TO_CHAR(ticket.purchaseDate, 'YYYY-MM-DD')", "date")
      .addSelect("COUNT(*)", "count")
      .where("ticket.eventId = :eventId", { eventId })
      .andWhere("ticket.status = :status", { status: TicketStatus.PAID })
      .groupBy("TO_CHAR(ticket.purchaseDate, 'YYYY-MM-DD')")
      .orderBy("date", "DESC")
      .getRawMany();

    return result.map((row) => ({
      date: row.date,
      count: parseInt(row.count, 10),
    }));
  }

  async getSalesTrendForEvent(
    eventId: string,
  ): Promise<Array<{ date: string; count: number }>> {
    return this.getSalesByDateForEvent(eventId);
  }

  async getTopSellingEvents(limit: number): Promise<
    Array<{
      eventId: string;
      eventName: string;
      ticketsSold: number;
      revenue: number;
    }>
  > {
    const result = await this.repository
      .createQueryBuilder("ticket")
      .leftJoin("events", "event", "event.id = ticket.eventId")
      .select("ticket.eventId", "eventId")
      .addSelect("event.name", "eventName")
      .addSelect("COUNT(*)", "ticketsSold")
      .addSelect("SUM(ticket.price)", "revenue")
      .where("ticket.status = :status", { status: TicketStatus.PAID })
      .groupBy("ticket.eventId")
      .addGroupBy("event.name")
      .orderBy("COUNT(*)", "DESC")
      .limit(limit)
      .getRawMany();

    return result.map((row) => ({
      eventId: row.eventId,
      eventName: row.eventName || `Event ${row.eventId}`,
      ticketsSold: parseInt(row.ticketsSold, 10),
      revenue: parseFloat(row.revenue || "0"),
    }));
  }
}
