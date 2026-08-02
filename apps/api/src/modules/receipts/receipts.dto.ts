import { Transform, Type } from "class-transformer";
import { ExpenseCategory } from "@prisma/client";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";
import { CreateExpenseDto } from "../expenses/expenses.dto";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+(?:\.\d{1,3})?$/;

export class ConfirmReceiptDto extends CreateExpenseDto {}

export class UpdateReceiptDraftDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  merchant?: string;

  @Transform(({ value }) => (value == null ? undefined : String(value)))
  @IsOptional()
  @Matches(MONEY)
  amount?: string;

  @Transform(({ value }) => (value == null ? undefined : String(value).toUpperCase()))
  @IsOptional()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @Matches(DATE_ONLY)
  date?: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}

export class ReceiptTranslationItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  translatedDescription!: string;
}

export class UpdateReceiptTranslationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ReceiptTranslationItemDto)
  items!: ReceiptTranslationItemDto[];
}

export class ReceiptProxyAmountDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index!: number;

  @Transform(({ value }) => String(value))
  @Matches(MONEY)
  amount!: string;
}

export class CreateReceiptProxyPurchaseDto {
  @IsOptional()
  @IsString()
  externalMemberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  newExternalName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  itemIndexes!: number[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ReceiptProxyAmountDto)
  itemAmounts?: ReceiptProxyAmountDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
