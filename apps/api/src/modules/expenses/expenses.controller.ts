import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { CreateExpenseDto, UpdateExpenseDto } from "./expenses.dto";
import { ExpensesService } from "./expenses.service";

@Controller("trips/:tripId")
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get("expenses/balances")
  async canonicalBalances(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.expenses.balances(userId, tripId));
  }

  @Get("expense-balances")
  async balances(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.expenses.balances(userId, tripId));
  }

  @Get("expenses")
  async list(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.expenses.list(userId, tripId));
  }

  @Post("expenses")
  async create(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: CreateExpenseDto
  ) {
    return ok(await this.expenses.create(userId, tripId, dto));
  }

  @Get("expenses/:expenseId")
  async get(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("expenseId") expenseId: string
  ) {
    return ok(await this.expenses.get(userId, tripId, expenseId));
  }

  @Patch("expenses/:expenseId")
  async update(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("expenseId") expenseId: string,
    @Body() dto: UpdateExpenseDto
  ) {
    return ok(await this.expenses.update(userId, tripId, expenseId, dto));
  }

  @Delete("expenses/:expenseId")
  async voidExpense(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("expenseId") expenseId: string
  ) {
    return ok(await this.expenses.void(userId, tripId, expenseId));
  }
}
