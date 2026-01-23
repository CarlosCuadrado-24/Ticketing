// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for resending confirmation emails
 */
export class ResendEmailDto {
  @ApiProperty({
    description: "Email address to resend confirmation to",
    example: "buyer@example.com",
  })
  @IsEmail({}, { message: "Must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @ApiProperty({
    description: "Optional ticket ID to resend specific ticket",
    example: "uuid-ticket-id",
    required: false,
  })
  @IsOptional()
  @IsString()
  ticketId?: string;
}

/**
 * DTO for sending event reminders
 */
export class SendReminderDto {
  @ApiProperty({
    description: "Event ID to send reminders for",
    example: "TICK0001-001",
  })
  @IsString()
  @IsNotEmpty({ message: "Event ID is required" })
  eventId!: string;

  @ApiProperty({
    description: "Optional specific email to send reminder to",
    example: "buyer@example.com",
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: "Must be a valid email address" })
  email?: string;
}
