import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CsrfService } from "../../infrastructure/external/csrf.service";

/**
 * CSRF Controller
 * Provides endpoints for CSRF token generation and validation
 *
 * Security: A01:2021 - Broken Access Control (CSRF Protection)
 */
@ApiTags("csrf")
@Controller("csrf")
export class CsrfController {
  constructor(private readonly csrfService: CsrfService) {}

  /**
   * Get CSRF token for form submission
   * GET /csrf/token
   *
   * @returns Object with CSRF token
   */
  @Get("token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get CSRF token",
    description: "Generates a new CSRF token for form submissions",
  })
  @ApiResponse({
    status: 200,
    description: "CSRF token generated successfully",
    schema: {
      type: "object",
      properties: {
        csrfToken: {
          type: "string",
          description: "CSRF token for form submission",
        },
      },
    },
  })
  getToken(): { csrfToken: string } {
    const token = this.csrfService.generateToken();
    return { csrfToken: token };
  }

  /**
   * Validate CSRF token
   * POST /csrf/validate
   *
   * @param token - CSRF token to validate
   * @returns Validation result
   */
  @Post("validate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Validate CSRF token",
    description: "Validates a CSRF token",
  })
  @ApiResponse({
    status: 200,
    description: "CSRF token validation result",
    schema: {
      type: "object",
      properties: {
        valid: { type: "boolean", description: "Whether token is valid" },
      },
    },
  })
  validateToken(@Body() body: { csrfToken: string }): { valid: boolean } {
    if (!body.csrfToken) {
      throw new BadRequestException("CSRF token is required");
    }

    const isValid = this.csrfService.validateToken(body.csrfToken);
    return { valid: isValid };
  }
}
