import { Module } from "@nestjs/common";
import { FundsModule } from "../funds/funds.module";
import { ProxyPurchasesController } from "./proxy-purchases.controller";
import { ProxyPurchasesService } from "./proxy-purchases.service";

@Module({
  imports: [FundsModule],
  controllers: [ProxyPurchasesController],
  providers: [ProxyPurchasesService],
  exports: [ProxyPurchasesService]
})
export class ProxyPurchasesModule {}
