import { Module } from "@nestjs/common";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";
import { SplitCalculatorService } from "./split-calculator.service";

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, SplitCalculatorService],
  exports: [ExpensesService, SplitCalculatorService]
})
export class ExpensesModule {}
