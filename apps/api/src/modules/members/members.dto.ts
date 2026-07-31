import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { TripRole } from "@prisma/client";

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsEnum(TripRole)
  role?: TripRole;
}
