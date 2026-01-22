import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { TicketConfigurationOrmEntity } from "./ticket-configuration.orm-entity";
import { EventDetailsOrmEntity } from "./event-details.orm-entity";

/**
 * Event ORM Entity
 * Represents the database schema for events.
 * Separated from domain Event entity to maintain clean architecture.
 *
 * Requirements: 1.1, 1.3, 8.3
 */
@Entity("events")
export class EventOrmEntity {
  @PrimaryColumn("varchar", { length: 12 })
  id!: string;

  @OneToMany(() => EventDetailsOrmEntity, (detail) => detail.event, {
    cascade: true,
    eager: true,
  })
  details!: EventDetailsOrmEntity[];

  @Column({ length: 255 })
  name!: string;

  @Column("timestamp")
  date!: Date;

  @Column({ length: 500 })
  location!: string;

  @Column({ length: 255, name: "venuename" })
  venueName!: string;

  @Column({ type: "text", nullable: true })
  imageUrl?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "uuid", nullable: true, name: "created_by" })
  createdBy?: string;

  @OneToMany(() => TicketConfigurationOrmEntity, (config) => config.event, {
    cascade: true,
    eager: true,
    onDelete: "CASCADE",
  })
  ticketConfigurations!: TicketConfigurationOrmEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
