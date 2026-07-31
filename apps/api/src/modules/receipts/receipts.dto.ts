import { Transform } from "class-transformer";
import { ExpenseCategory } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength
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
