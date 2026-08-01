import { Module } from "@nestjs/common";
import { ProxyPurchasesController } from "./proxy-purchases.controller";
import { ProxyPurchasesService } from "./proxy-purchases.service";

@Module({
  controllers: [ProxyPurchasesController],
  providers: [ProxyPurchasesService],
  exports: [ProxyPurchasesService]
})
export class ProxyPurchasesModule {}
