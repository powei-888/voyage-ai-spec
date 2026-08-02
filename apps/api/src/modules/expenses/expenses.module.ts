import { Module } from "@nestjs/common";
import { FundsModule } from "../funds/funds.module";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";
import { SplitCalculatorService } from "./split-calculator.service";

@Module({
  imports: [FundsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, SplitCalculatorService],
  exports: [ExpensesService, SplitCalculatorService]
})
export class ExpensesModule {}
