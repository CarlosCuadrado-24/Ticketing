import { validate } from "class-validator";
import { EventDetailsDto } from "./event-details.dto";

describe("EventDetailsDto", () => {
  let dto: EventDetailsDto;

  beforeEach(() => {
    dto = new EventDetailsDto();
  });

  describe("valid data", () => {
    it("should pass validation with all required fields", async () => {
      dto.category = "Music";
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with all fields including optional ones", async () => {
      dto.category = "Sports";
      dto.minAge = 18;
      dto.seating = "Reserved";
      dto.capacity = 1000;
      dto.foodSale = true;
      dto.liquorSale = true;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation without optional fields", async () => {
      dto.category = "Conference";
      dto.foodSale = false;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("category validation", () => {
    it("should fail validation with non-string category", async () => {
      (dto as any).category = 123;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("category");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });

    it("should fail validation with missing category", async () => {
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("category");
    });
  });

  describe("minAge validation (optional)", () => {
    it("should pass validation with valid minAge", async () => {
      dto.category = "Music";
      dto.minAge = 21;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with minAge 0", async () => {
      dto.category = "Family";
      dto.minAge = 0;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with negative minAge", async () => {
      dto.category = "Music";
      dto.minAge = -1;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("minAge");
      expect(errors[0]?.constraints).toHaveProperty("min");
    });

    it("should fail validation with non-integer minAge", async () => {
      dto.category = "Music";
      (dto as any).minAge = 18.5;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("minAge");
      expect(errors[0]?.constraints).toHaveProperty("isInt");
    });

    it("should fail validation with string minAge", async () => {
      dto.category = "Music";
      (dto as any).minAge = "eighteen";
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("minAge");
      expect(errors[0]?.constraints).toHaveProperty("isInt");
    });
  });

  describe("seating validation (optional)", () => {
    it("should pass validation with valid seating", async () => {
      dto.category = "Theater";
      dto.seating = "Reserved seating";
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with non-string seating", async () => {
      dto.category = "Theater";
      (dto as any).seating = 123;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("seating");
      expect(errors[0]?.constraints).toHaveProperty("isString");
    });
  });

  describe("capacity validation (optional)", () => {
    it("should pass validation with valid capacity", async () => {
      dto.category = "Concert";
      dto.capacity = 5000;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass validation with capacity 0", async () => {
      dto.category = "Virtual";
      dto.capacity = 0;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with negative capacity", async () => {
      dto.category = "Concert";
      dto.capacity = -100;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("capacity");
      expect(errors[0]?.constraints).toHaveProperty("min");
    });

    it("should fail validation with non-integer capacity", async () => {
      dto.category = "Concert";
      (dto as any).capacity = 100.5;
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("capacity");
      expect(errors[0]?.constraints).toHaveProperty("isInt");
    });
  });

  describe("boolean fields validation", () => {
    it("should fail validation with non-boolean foodSale", async () => {
      dto.category = "Music";
      (dto as any).foodSale = "yes";
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("foodSale");
      expect(errors[0]?.constraints).toHaveProperty("isBoolean");
    });

    it("should fail validation with non-boolean liquorSale", async () => {
      dto.category = "Music";
      dto.foodSale = true;
      (dto as any).liquorSale = 1;
      dto.reducedMobilityAccess = true;
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("liquorSale");
      expect(errors[0]?.constraints).toHaveProperty("isBoolean");
    });

    it("should fail validation with non-boolean reducedMobilityAccess", async () => {
      dto.category = "Music";
      dto.foodSale = true;
      dto.liquorSale = false;
      (dto as any).reducedMobilityAccess = "true";
      dto.pregnantAccess = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("reducedMobilityAccess");
      expect(errors[0]?.constraints).toHaveProperty("isBoolean");
    });

    it("should fail validation with non-boolean pregnantAccess", async () => {
      dto.category = "Music";
      dto.foodSale = true;
      dto.liquorSale = false;
      dto.reducedMobilityAccess = true;
      (dto as any).pregnantAccess = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe("pregnantAccess");
      expect(errors[0]?.constraints).toHaveProperty("isBoolean");
    });

    it("should fail validation with missing required boolean fields", async () => {
      dto.category = "Music";

      const errors = await validate(dto);
      expect(errors).toHaveLength(4);

      const properties = errors.map((error) => error.property);
      expect(properties).toContain("foodSale");
      expect(properties).toContain("liquorSale");
      expect(properties).toContain("reducedMobilityAccess");
      expect(properties).toContain("pregnantAccess");
    });
  });

  describe("multiple validation errors", () => {
    it("should fail validation with multiple invalid fields", async () => {
      (dto as any).category = 123;
      dto.minAge = -5;
      (dto as any).seating = 456;
      dto.capacity = -100;
      (dto as any).foodSale = "yes";
      (dto as any).liquorSale = 1;
      (dto as any).reducedMobilityAccess = "true";
      (dto as any).pregnantAccess = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(8);

      const properties = errors.map((error) => error.property);
      expect(properties).toContain("category");
      expect(properties).toContain("minAge");
      expect(properties).toContain("seating");
      expect(properties).toContain("capacity");
      expect(properties).toContain("foodSale");
      expect(properties).toContain("liquorSale");
      expect(properties).toContain("reducedMobilityAccess");
      expect(properties).toContain("pregnantAccess");
    });
  });
});
