// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * RefreshTokenDto
 * Data Transfer Object for token refresh
 *
 * Requirements: 9.3
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: "JWT refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  refreshToken!: string;
}
