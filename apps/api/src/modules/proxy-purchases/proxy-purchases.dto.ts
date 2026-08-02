import { Transform, Type } from "class-transformer";
import { ExpensePaymentSource } from "@prisma/client";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+(?:\.\d{1,3})?$/;

export class ProxyPurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number = 1;

  @Transform(({ value }) => String(value))
  @Matches(MONEY)
  unitPrice!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}

export class CreateProxyPurchaseDto {
  @IsOptional()
  @IsString()
  externalMemberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  newExternalName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProxyPurchaseItemDto)
  items!: ProxyPurchaseItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  payerMemberId?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentSource)
  paymentSource?: ExpensePaymentSource;

  @IsOptional()
  @IsString()
  fundId?: string;

  @IsOptional()
  @Matches(DATE_ONLY)
  purchasedAt?: string;
}

export class UpdateProxyPurchaseDto {
  @IsString()
  @IsNotEmpty()
  externalMemberId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProxyPurchaseItemDto)
  items!: ProxyPurchaseItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ConfirmProxyPurchaseDto {
  @IsOptional()
  @IsString()
  payerMemberId?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentSource)
  paymentSource?: ExpensePaymentSource;

  @IsOptional()
  @IsString()
  fundId?: string;

  @Matches(DATE_ONLY)
  purchasedAt!: string;
}
