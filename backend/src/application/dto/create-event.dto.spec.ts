import "reflect-metadata";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { CreateEventDto, TicketConfigurationDto } from "./create-event.dto";
import { TicketType } from "../../domain/value-objects/ticket-type.vo";

describe("TicketConfigurationDto", () => {
  it("should validate a valid ticket configuration", async () => {
    const dto = plainToClass(TicketConfigurationDto, {
      type: TicketType.VIP,
      price: 100,
      currency: "USD",
      quantity: 50,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should fail validation with invalid ticket type", async () => {
    const dto = plainToClass(TicketConfigurationDto, {
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
    const dto = plainToClass(TicketConfigurationDto, {
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
    const dto = plainToClass(TicketConfigurationDto, {
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
    const dto = plainToClass(TicketConfigurationDto, {
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
    const dto = plainToClass(TicketConfigurationDto, {
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
    const dto = plainToClass(TicketConfigurationDto, {
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

describe("CreateEventDto", () => {
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

  it("should validate a valid create event DTO", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "Test Venue",
      ticketConfigurations: [validTicketConfig],
      imageUrl: "https://example.com/image.jpg",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should validate without optional imageUrl", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "Test Venue",
      ticketConfigurations: [validTicketConfig],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should fail validation with empty name", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "",
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "Test Venue",
      ticketConfigurations: [validTicketConfig],
    });

    const errors = await validate(dto);
    const nameError = errors.find((error) => error.property === "name");
    expect(nameError).toBeDefined();
    expect(nameError?.constraints?.isNotEmpty).toBe("Event name is required");
  });

  it("should fail validation with non-string name", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: 123,
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "Test Venue",
      ticketConfigurations: [validTicketConfig],
    });

    const errors = await validate(dto);
    const nameError = errors.find((error) => error.property === "name");
    expect(nameError).toBeDefined();
    expect(nameError?.constraints?.isString).toBe(
      "Event name must be a string",
    );
  });

  it("should fail validation with invalid date format", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "invalid-date",
      location: "Test Location",
      venueName: "Test Venue",
      ticketConfigurations: [validTicketConfig],
    });

    const errors = await validate(dto);
    const dateError = errors.find((error) => error.property === "date");
    expect(dateError).toBeDefined();
    expect(dateError?.constraints?.isIso8601).toBe(
      "Event date must be a valid ISO 8601 date",
    );
  });

  it("should fail validation with empty location", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "",
      venueName: "Test Venue",
      ticketConfigurations: [validTicketConfig],
    });

    const errors = await validate(dto);
    const locationError = errors.find((error) => error.property === "location");
    expect(locationError).toBeDefined();
    expect(locationError?.constraints?.isNotEmpty).toBe(
      "Event location is required",
    );
  });

  it("should fail validation with empty venue name", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "",
      ticketConfigurations: [validTicketConfig],
    });

    const errors = await validate(dto);
    const venueError = errors.find((error) => error.property === "venueName");
    expect(venueError).toBeDefined();
    expect(venueError?.constraints?.isNotEmpty).toBe("Venue name is required");
  });

  it("should fail validation with empty ticket configurations array", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "Test Venue",
      ticketConfigurations: [],
    });

    const errors = await validate(dto);
    const ticketError = errors.find(
      (error) => error.property === "ticketConfigurations",
    );
    expect(ticketError).toBeDefined();
    expect(ticketError?.constraints?.arrayMinSize).toBe(
      "At least one ticket configuration is required",
    );
  });

  it("should fail validation with non-array ticket configurations", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "Test Venue",
      ticketConfigurations: "invalid",
    });

    const errors = await validate(dto);
    const ticketError = errors.find(
      (error) => error.property === "ticketConfigurations",
    );
    expect(ticketError).toBeDefined();
    expect(ticketError?.constraints?.isArray).toBe(
      "Ticket configurations must be an array",
    );
  });

  it("should validate with multiple ticket configurations", async () => {
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "Test Venue",
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
    const dto = plainToClass(CreateEventDto, {
      eventDetails: [validEventDetails],
      name: "Test Event",
      date: "2024-12-31T23:59:59.000Z",
      location: "Test Location",
      venueName: "Test Venue",
      ticketConfigurations: [validTicketConfig],
      imageUrl: 123,
    });

    const errors = await validate(dto);
    const imageError = errors.find((error) => error.property === "imageUrl");
    expect(imageError).toBeDefined();
    expect(imageError?.constraints?.isString).toBe(
      "Image URL must be a string",
    );
  });
});
