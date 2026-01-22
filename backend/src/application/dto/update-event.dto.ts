import { EventDetailsDto } from "./event-details.dto";
import {
  IsString,
  IsNotEmpty,
  IsISO8601,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";

/**
 * UpdateTicketConfigurationDto
 * DTO for ticket configuration data in event update
 * Validates ticket type, price, and quantity
 */
export class UpdateTicketConfigurationDto {
  @IsEnum(TicketType, {
    message: `Ticket type must be one of: ${Object.values(TicketType).join(", ")}`,
  })
  type!: TicketType;

  @IsNumber({}, { message: "Price must be a number" })
  @Min(0, { message: "Price cannot be negative" })
  price!: number;

  @IsString({ message: "Currency must be a string" })
  @IsNotEmpty({ message: "Currency is required" })
  currency!: string;

  @IsNumber({}, { message: "Quantity must be a number" })
  @Min(1, { message: "Quantity must be at least 1" })
  quantity!: number;
}

/**
 * UpdateEventDto
 * DTO for updating an existing event
 * All fields are optional to support partial updates
 */

export class UpdateEventDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventDetailsDto)
  eventDetails?: EventDetailsDto[];
  @IsOptional()
  @IsString({ message: "Event name must be a string" })
  @IsNotEmpty({ message: "Event name cannot be empty" })
  name?: string;

  @IsOptional()
  @IsISO8601({}, { message: "Event date must be a valid ISO 8601 date" })
  @IsNotEmpty({ message: "Event date cannot be empty" })
  date?: string;

  @IsOptional()
  @IsString({ message: "Event location must be a string" })
  @IsNotEmpty({ message: "Event location cannot be empty" })
  location?: string;

  @IsOptional()
  @IsString({ message: "Venue name must be a string" })
  @IsNotEmpty({ message: "Venue name cannot be empty" })
  venueName?: string;

  @IsOptional()
  @IsArray({ message: "Ticket configurations must be an array" })
  @ArrayMinSize(1, { message: "At least one ticket configuration is required" })
  @ValidateNested({ each: true })
  @Type(() => UpdateTicketConfigurationDto)
  ticketConfigurations?: UpdateTicketConfigurationDto[];

  @IsOptional()
  @IsString({ message: "Image URL must be a string" })
  imageUrl?: string;

  @IsOptional()
  @IsString({ message: "Description must be a string" })
  description?: string;
}
