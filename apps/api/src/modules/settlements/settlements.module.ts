import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { SettlementsController } from "./settlements.controller";
import { SettlementsService } from "./settlements.service";

@Module({
  imports: [ExpensesModule],
  controllers: [SettlementsController],
  providers: [SettlementsService]
})
export class SettlementsModule {}
