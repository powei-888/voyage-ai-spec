import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+(?:\.\d{1,3})?$/;

export class CreateSettlementDto {
  @IsString()
  @IsNotEmpty()
  fromMemberId!: string;

  @IsString()
  @IsNotEmpty()
  toMemberId!: string;

  @Transform(({ value }) => String(value))
  @Matches(MONEY)
  amount!: string;

  @Transform(({ value }) => String(value).toUpperCase())
  @Length(3, 3)
  currency!: string;

  @Matches(DATE_ONLY)
  settledAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
