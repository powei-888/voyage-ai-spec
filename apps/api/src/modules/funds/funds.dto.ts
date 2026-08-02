import { Transform } from "class-transformer";
import { FundTransactionType } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength
} from "class-validator";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+(?:\.\d{1,3})?$/;

export class CreateFundDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @Transform(({ value }) => String(value).toUpperCase())
  @Length(3, 3)
  currency!: string;
}

export class CreateFundTransactionDto {
  @IsEnum(FundTransactionType)
  type!: FundTransactionType;

  @IsOptional()
  @IsString()
  memberId?: string;

  @Transform(({ value }) => String(value))
  @Matches(MONEY)
  amount!: string;

  @Matches(DATE_ONLY)
  transactionDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @IsOptional()
  @IsString()
  proxyPurchaseId?: string;
}

export class VoidFundTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  reason!: string;
}
