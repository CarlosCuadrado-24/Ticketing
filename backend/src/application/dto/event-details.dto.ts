import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
} from "class-validator";

export class EventDetailsDto {
  @IsString()
  category!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minAge?: number;

  @IsOptional()
  @IsString()
  seating?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsBoolean()
  foodSale!: boolean;

  @IsBoolean()
  liquorSale!: boolean;

  @IsBoolean()
  reducedMobilityAccess!: boolean;

  @IsBoolean()
  pregnantAccess!: boolean;
}
