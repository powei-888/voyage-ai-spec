import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import {
  CreateFundDto,
  CreateFundTransactionDto,
  VoidFundTransactionDto
} from "./funds.dto";
import { FundsService } from "./funds.service";

@Controller("trips/:tripId/funds")
export class FundsController {
  constructor(private readonly funds: FundsService) {}

  @Get()
  async list(@CurrentUserId() userId: string, @Param("tripId") tripId: string) {
    return ok(await this.funds.list(userId, tripId));
  }

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: CreateFundDto
  ) {
    return ok(await this.funds.create(userId, tripId, dto));
  }

  @Get(":fundId")
  async get(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("fundId") fundId: string
  ) {
    return ok(await this.funds.get(userId, tripId, fundId));
  }

  @Post(":fundId/transactions")
  async createTransaction(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("fundId") fundId: string,
    @Body() dto: CreateFundTransactionDto
  ) {
    return ok(await this.funds.createTransaction(userId, tripId, fundId, dto));
  }

  @Delete(":fundId/transactions/:transactionId")
  async voidTransaction(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("fundId") fundId: string,
    @Param("transactionId") transactionId: string,
    @Body() dto: VoidFundTransactionDto
  ) {
    return ok(
      await this.funds.voidTransaction(userId, tripId, fundId, transactionId, dto)
    );
  }
}
