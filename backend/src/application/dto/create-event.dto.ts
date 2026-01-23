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
 * TicketConfigurationDto
 * DTO for ticket configuration data in event creation
 * Validates ticket type, price, and quantity
 */
export class TicketConfigurationDto {
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
 * CreateEventDto
 * DTO for creating a new event
 * Validates all required fields for event creation
 * Requirements: 1.1, 1.2
 */

export class CreateEventDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventDetailsDto)
  eventDetails!: EventDetailsDto[];
  @IsString({ message: "Event name must be a string" })
  @IsNotEmpty({ message: "Event name is required" })
  name!: string;

  @IsISO8601({}, { message: "Event date must be a valid ISO 8601 date" })
  @IsNotEmpty({ message: "Event date is required" })
  date!: string;

  @IsString({ message: "Event location must be a string" })
  @IsNotEmpty({ message: "Event location is required" })
  location!: string;

  @IsString({ message: "Venue name must be a string" })
  @IsNotEmpty({ message: "Venue name is required" })
  venueName!: string;

  @IsArray({ message: "Ticket configurations must be an array" })
  @ArrayMinSize(1, { message: "At least one ticket configuration is required" })
  @ValidateNested({ each: true })
  @Type(() => TicketConfigurationDto)
  ticketConfigurations!: TicketConfigurationDto[];

  @IsOptional()
  @IsString({ message: "Image URL must be a string" })
  imageUrl?: string;

  @IsOptional()
  @IsString({ message: "Description must be a string" })
  description?: string;
}
