import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { AddMemberDto, UpdateMemberDto } from "./members.dto";
import { MembersService } from "./members.service";

@Controller("trips/:tripId/members")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  async list(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.members.list(userId, tripId));
  }

  @Post()
  async add(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: AddMemberDto
  ) {
    return ok(await this.members.add(userId, tripId, dto));
  }

  @Patch(":memberId")
  async update(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateMemberDto
  ) {
    return ok(await this.members.update(userId, tripId, memberId, dto));
  }

  @Delete(":memberId")
  async remove(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("memberId") memberId: string
  ) {
    return ok(await this.members.remove(userId, tripId, memberId));
  }
}
