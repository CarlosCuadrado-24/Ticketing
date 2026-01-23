/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsString,
  IsUUID,
  IsEmail,
  IsNumber,
  IsEnum,
  Min,
  IsNotEmpty,
} from "class-validator";
/* eslint-enable @typescript-eslint/no-unused-vars */
import { ApiProperty } from "@nestjs/swagger";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";

/**
 * DTO for purchasing a ticket
 * Used when a user buys a ticket directly
 */
export class PurchaseTicketDto {
  @ApiProperty({
    description: "Event ID for which the ticket is being purchased",
    example: "TICK0001-001",
  })
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({
    description: "Type of ticket to purchase",
    enum: TicketType,
    example: TicketType.VIP,
  })
  @IsEnum(TicketType)
  @IsNotEmpty()
  ticketType!: TicketType;

  @ApiProperty({
    description: "Number of tickets to purchase",
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity!: number;

  @ApiProperty({
    description: "Email of the buyer",
    example: "buyer@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  buyerEmail!: string;

  @ApiProperty({
    description: "Payment information",
    example: {
      cardNumber: "4242424242424242",
      expiryDate: "12/25",
      cvv: "123",
    },
  })
  @IsNotEmpty()
  paymentInfo!: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
  };
}
