import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { TripInviteMode } from "@prisma/client";

export class CreateTripInviteDto {
  @IsEnum(TripInviteMode)
  mode!: TripInviteMode;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays = 7;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxUses?: number;
}
