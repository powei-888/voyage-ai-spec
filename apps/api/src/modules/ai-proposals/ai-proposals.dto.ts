import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { AIProposalType } from "@prisma/client";

export class CreateProposalDto {
  @IsEnum(AIProposalType)
  type!: AIProposalType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  inputText?: string;
}
