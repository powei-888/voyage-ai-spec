import { Type, Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested
} from "class-validator";
import {
  ExpenseCategory,
  ExpensePaymentSource,
  ExpenseSplitMethod,
  ExpenseStatus
} from "@prisma/client";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+(?:\.\d{1,3})?$/;

export class ExpenseSplitShareDto {
  @IsString()
  @IsNotEmpty()
  memberId!: string;

  @Transform(({ value }) => String(value))
  @Matches(MONEY)
  shareAmount!: string;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  merchant?: string;

  @Transform(({ value }) => String(value))
  @Matches(MONEY)
  amount!: string;

  @Transform(({ value }) => String(value).toUpperCase())
  @Length(3, 3)
  currency!: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory = ExpenseCategory.other;

  @IsOptional()
  @Matches(DATE_ONLY)
  expenseDate?: string;

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
  @IsEnum(ExpenseSplitMethod)
  splitMethod: ExpenseSplitMethod = ExpenseSplitMethod.equal;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  participantMemberIds: string[] = [];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitShareDto)
  splitShares: ExpenseSplitShareDto[] = [];

  @IsOptional()
  @IsString()
  linkedEventId?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
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
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @Matches(DATE_ONLY)
  expenseDate?: string | null;

  @IsOptional()
  @IsString()
  payerMemberId?: string | null;

  @IsOptional()
  @IsEnum(ExpensePaymentSource)
  paymentSource?: ExpensePaymentSource;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  fundId?: string | null;

  @IsOptional()
  @IsEnum(ExpenseSplitMethod)
  splitMethod?: ExpenseSplitMethod;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  participantMemberIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitShareDto)
  splitShares?: ExpenseSplitShareDto[];

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  linkedEventId?: string | null;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;
}

export type ConfirmedExpenseInput = CreateExpenseDto & {
  linkedReceiptId: string;
  createdByMemberId: string;
};
