import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import {
  ConfirmProxyPurchaseDto,
  CreateProxyPurchaseDto,
  UpdateProxyPurchaseDto
} from "./proxy-purchases.dto";
import { ProxyPurchasesService } from "./proxy-purchases.service";

@Controller("trips/:tripId/proxy-purchases")
export class ProxyPurchasesController {
  constructor(private readonly proxyPurchases: ProxyPurchasesService) {}

  @Get()
  async list(@CurrentUserId() userId: string, @Param("tripId") tripId: string) {
    return ok(await this.proxyPurchases.list(userId, tripId));
  }

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: CreateProxyPurchaseDto
  ) {
    return ok(await this.proxyPurchases.create(userId, tripId, dto));
  }

  @Patch(":purchaseId")
  async update(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("purchaseId") purchaseId: string,
    @Body() dto: UpdateProxyPurchaseDto
  ) {
    return ok(await this.proxyPurchases.update(userId, tripId, purchaseId, dto));
  }

  @Post(":purchaseId/confirm")
  async confirmPurchase(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("purchaseId") purchaseId: string,
    @Body() dto: ConfirmProxyPurchaseDto
  ) {
    return ok(
      await this.proxyPurchases.confirmPurchase(userId, tripId, purchaseId, dto)
    );
  }

  @Delete(":purchaseId")
  async cancel(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("purchaseId") purchaseId: string
  ) {
    return ok(await this.proxyPurchases.cancel(userId, tripId, purchaseId));
  }
}
