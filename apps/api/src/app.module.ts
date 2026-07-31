import { Module } from "@nestjs/common";
import { CommonModule } from "./common/common.module";
import { HealthModule } from "./health/health.module";
import { DatabaseModule } from "./infra/database/database.module";
import { LocalModelModule } from "./infra/local-model/local-model.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AiProposalsModule } from "./modules/ai-proposals/ai-proposals.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { ItineraryModule } from "./modules/itinerary/itinerary.module";
import { MembersModule } from "./modules/members/members.module";
import { ReceiptsModule } from "./modules/receipts/receipts.module";
import { SettlementsModule } from "./modules/settlements/settlements.module";
import { TripsModule } from "./modules/trips/trips.module";

@Module({
  imports: [
    DatabaseModule,
    LocalModelModule,
    CommonModule,
    HealthModule,
    AuthModule,
    TripsModule,
    MembersModule,
    ItineraryModule,
    ExpensesModule,
    SettlementsModule,
    ReceiptsModule,
    BookingsModule,
    AiProposalsModule
  ]
})
export class AppModule {}
