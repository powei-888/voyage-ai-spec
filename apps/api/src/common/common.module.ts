import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "../infra/database/database.module";
import { TripAccessService } from "./trip-access.service";

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [TripAccessService],
  exports: [TripAccessService]
})
export class CommonModule {}
