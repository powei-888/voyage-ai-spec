import { Transform } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength
} from "class-validator";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+(?:\.\d{1,3})?$/;

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  destinationCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  destinationCity?: string;

  @IsString()
  @Matches(DATE_ONLY)
  startDate!: string;

  @IsString()
  @Matches(DATE_ONLY)
  endDate!: string;

  @Transform(({ value }) => String(value || "USD").toUpperCase())
  @IsString()
  @Length(3, 3)
  baseCurrency = "USD";

  @Transform(({ value }) => (value === "" || value == null ? undefined : String(value)))
  @IsOptional()
  @Matches(MONEY)
  budgetAmount?: string;
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  destinationCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  destinationCity?: string;

  @IsOptional()
  @Matches(DATE_ONLY)
  startDate?: string;

  @IsOptional()
  @Matches(DATE_ONLY)
  endDate?: string;

  @Transform(({ value }) => (value == null ? undefined : String(value).toUpperCase()))
  @IsOptional()
  @Length(3, 3)
  baseCurrency?: string;

  @Transform(({ value }) => (value === "" || value == null ? undefined : String(value)))
  @IsOptional()
  @Matches(MONEY)
  budgetAmount?: string;

  @IsOptional()
  @IsIn([null])
  clearBudget?: null;
}
