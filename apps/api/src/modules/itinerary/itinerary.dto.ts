import { Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min
} from "class-validator";
import { EventCategory } from "@prisma/client";

const MONEY = /^\d+(?:\.\d{1,3})?$/;

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsEnum(EventCategory)
  category: EventCategory = EventCategory.other;

  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @IsOptional()
  @IsISO8601()
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @Transform(({ value }) => (value === "" || value == null ? undefined : String(value)))
  @IsOptional()
  @Matches(MONEY)
  estimatedCostAmount?: string;

  @Transform(({ value }) => (value == null ? undefined : String(value).toUpperCase()))
  @IsOptional()
  @Length(3, 3)
  estimatedCostCurrency?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  participantMemberIds?: string[];
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @IsOptional()
  @IsISO8601()
  startTime?: string | null;

  @IsOptional()
  @IsISO8601()
  endTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @Transform(({ value }) => (value === "" ? null : value == null ? value : String(value)))
  @IsOptional()
  @Matches(MONEY)
  estimatedCostAmount?: string | null;

  @Transform(({ value }) => (value == null ? value : String(value).toUpperCase()))
  @IsOptional()
  @Length(3, 3)
  estimatedCostCurrency?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  participantMemberIds?: string[];
}

export class MoveEventDto {
  @IsString()
  @IsNotEmpty()
  targetDayId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  targetIndex?: number;
}

export class ReorderEventsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  eventIds!: string[];
}
