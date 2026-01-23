import "reflect-metadata";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import {
  UpdateEventDto,
  UpdateTicketConfigurationDto,
} from "./update-event.dto";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";

describe("UpdateTicketConfigurationDto", () => {
  it("should validate a valid update ticket configuration", async () => {
    const dto = plainToClass(UpdateTicketConfigurationDto, {
      type: TicketType.VIP,
      price: 100,
      currency: "USD",
      quantity: 50,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should fail validation with invalid ticket type", async () => {
    const dto = plainToClass(UpdateTicketConfigurationDto, {
      type: "INVALID_TYPE",
      price: 100,
      currency: "USD",
      quantity: 50,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("type");
    expect(errors[0]?.constraints?.isEnum).toContain(
      "Ticket type must be one of",
    );
  });

  it("should fail validation with negative price", async () => {
    const dto = plainToClass(UpdateTicketConfigurationDto, {
      type: TicketType.GENERAL,
      price: -10,
      currency: "USD",
      quantity: 50,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("price");
    expect(errors[0]?.constraints?.min).toBe("Price cannot be negative");
  });

  it("should fail validation with non-number price", async () => {
    const dto = plainToClass(UpdateTicketConfigurationDto, {
      type: TicketType.GENERAL,
      price: "invalid",
      currency: "USD",
      quantity: 50,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("price");
    expect(errors[0]?.constraints?.isNumber).toBe("Price must be a number");
  });

  it("should fail validation with empty currency", async () => {
    const dto = plainToClass(UpdateTicketConfigurationDto, {
      type: TicketType.GENERAL,
      price: 100,
      currency: "",
      quantity: 50,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("currency");
    expect(errors[0]?.constraints?.isNotEmpty).toBe("Currency is required");
  });

  it("should fail validation with quantity less than 1", async () => {
    const dto = plainToClass(UpdateTicketConfigurationDto, {
      type: TicketType.GENERAL,
      price: 100,
      currency: "USD",
      quantity: 0,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("quantity");
    expect(errors[0]?.constraints?.min).toBe("Quantity must be at least 1");
  });

  it("should fail validation with non-number quantity", async () => {
    const dto = plainToClass(UpdateTicketConfigurationDto, {
      type: TicketType.GENERAL,
      price: 100,
      currency: "USD",
      quantity: "invalid",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("quantity");
    expect(errors[0]?.constraints?.isNumber).toBe("Quantity must be a number");
  });
});

describe("UpdateEventDto", () => {
  const validTicketConfig = {
    type: TicketType.VIP,
    price: 100,
    currency: "USD",
    quantity: 50,
  };

  const validEventDetails = {
    category: "Music",
    duration: 120,
    foodSale: true,
    liquorSale: false,
    reducedMobilityAccess: true,
    pregnantAccess: true,
  };

  it("should validate an empty update event DTO (all fields optional)", async () => {
    const dto = plainToClass(UpdateEventDto, {});

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should validate a complete update event DTO", async () => {
    const dto = plainToClass(UpdateEventDto, {
      eventDetails: [validEventDetails],
      name: "Updated Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "Updated Location",
      venueName: "Updated Venue",
      ticketConfigurations: [validTicketConfig],
      imageUrl: "https://example.com/updated-image.jpg",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should validate with only name update", async () => {
    const dto = plainToClass(UpdateEventDto, {
      name: "Updated Event Name",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should validate with only date update", async () => {
    const dto = plainToClass(UpdateEventDto, {
      date: "2024-12-31T23:59:59.000Z",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should fail validation with empty name when provided", async () => {
    const dto = plainToClass(UpdateEventDto, {
      name: "",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("name");
    expect(errors[0]?.constraints?.isNotEmpty).toBe(
      "Event name cannot be empty",
    );
  });

  it("should fail validation with non-string name", async () => {
    const dto = plainToClass(UpdateEventDto, {
      name: 123,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("name");
    expect(errors[0]?.constraints?.isString).toBe(
      "Event name must be a string",
    );
  });

  it("should fail validation with invalid date format", async () => {
    const dto = plainToClass(UpdateEventDto, {
      date: "invalid-date",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("date");
    expect(errors[0]?.constraints?.isIso8601).toBe(
      "Event date must be a valid ISO 8601 date",
    );
  });

  it("should fail validation with empty date when provided", async () => {
    const dto = plainToClass(UpdateEventDto, {
      date: "",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("date");
    expect(errors[0]?.constraints?.isNotEmpty).toBe(
      "Event date cannot be empty",
    );
  });

  it("should fail validation with empty location when provided", async () => {
    const dto = plainToClass(UpdateEventDto, {
      location: "",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("location");
    expect(errors[0]?.constraints?.isNotEmpty).toBe(
      "Event location cannot be empty",
    );
  });

  it("should fail validation with empty venue name when provided", async () => {
    const dto = plainToClass(UpdateEventDto, {
      venueName: "",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("venueName");
    expect(errors[0]?.constraints?.isNotEmpty).toBe(
      "Venue name cannot be empty",
    );
  });

  it("should fail validation with empty ticket configurations array when provided", async () => {
    const dto = plainToClass(UpdateEventDto, {
      ticketConfigurations: [],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("ticketConfigurations");
    expect(errors[0]?.constraints?.arrayMinSize).toBe(
      "At least one ticket configuration is required",
    );
  });

  it("should fail validation with non-array ticket configurations", async () => {
    const dto = plainToClass(UpdateEventDto, {
      ticketConfigurations: "invalid",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("ticketConfigurations");
    expect(errors[0]?.constraints?.isArray).toBe(
      "Ticket configurations must be an array",
    );
  });

  it("should validate with multiple ticket configurations", async () => {
    const dto = plainToClass(UpdateEventDto, {
      ticketConfigurations: [
        validTicketConfig,
        {
          type: TicketType.GENERAL,
          price: 50,
          currency: "USD",
          quantity: 100,
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should fail validation with invalid imageUrl type", async () => {
    const dto = plainToClass(UpdateEventDto, {
      imageUrl: 123,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("imageUrl");
    expect(errors[0]?.constraints?.isString).toBe("Image URL must be a string");
  });

  it("should validate partial updates with mixed valid fields", async () => {
    const dto = plainToClass(UpdateEventDto, {
      name: "Partially Updated Event",
      location: "New Location",
      imageUrl: "https://example.com/new-image.jpg",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
