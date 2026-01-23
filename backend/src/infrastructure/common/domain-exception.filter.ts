import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
  HttpException,
} from "@nestjs/common";
import { Response } from "express";
import { InsufficientTicketsException } from "../../domain/exceptions/insufficient-tickets.exception";
import { InvalidEmailException } from "../../domain/exceptions/invalid-email.exception";
import { InvalidMoneyException } from "../../domain/exceptions/invalid-money.exception";
import { InvalidQuantityException } from "../../domain/exceptions/invalid-quantity.exception";
import { InvalidStateTransitionException } from "../../domain/exceptions/invalid-state-transition.exception";
import { TicketTypeNotFoundException } from "../../domain/exceptions/ticket-type-not-found.exception";

/**
 * Maps domain exceptions to HTTP status codes and error responses.
 * Provides consistent error formatting across the API.
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const errorResponse = this.mapExceptionToResponse(exception);

    this.logger.warn(
      `Domain exception caught: ${errorResponse.error} - ${errorResponse.message}`,
    );

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private mapExceptionToResponse(exception: unknown): ErrorResponse {
    const timestamp = new Date().toISOString();

    // NestJS built-in HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      return {
        statusCode: status,
        message:
          typeof response === "string"
            ? response
            : (response as any).message || exception.message,
        error: exception.name,
        timestamp,
      };
    }

    // Domain validation exceptions (400 Bad Request)
    if (exception instanceof InvalidEmailException) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: "InvalidEmailException",
        timestamp,
      };
    }

    if (exception instanceof InvalidMoneyException) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: "InvalidMoneyException",
        timestamp,
      };
    }

    if (exception instanceof InvalidQuantityException) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: "InvalidQuantityException",
        timestamp,
      };
    }

    // Business logic exceptions (409 Conflict)
    if (exception instanceof InsufficientTicketsException) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
        error: "InsufficientTicketsException",
        timestamp,
      };
    }

    if (exception instanceof InvalidStateTransitionException) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
        error: "InvalidStateTransitionException",
        timestamp,
      };
    }

    // Not found exceptions (404 Not Found)
    if (exception instanceof TicketTypeNotFoundException) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: "TicketTypeNotFoundException",
        timestamp,
      };
    }

    // Fallback for unknown exceptions
    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || "Internal server error",
        error: exception.name || "UnknownException",
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      error: "UnknownException",
      timestamp,
    };
  }
}
