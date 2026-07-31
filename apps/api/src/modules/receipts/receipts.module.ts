import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { LocalReceiptStorageService } from "./local-receipt-storage.service";
import { MockOcrProvider } from "./mock-ocr.provider";
import { OCR_PROVIDER } from "./ocr-provider";
import { RECEIPT_STORAGE } from "./receipt-storage";
import { ReceiptsController } from "./receipts.controller";
import { ReceiptsService } from "./receipts.service";

@Module({
  imports: [ExpensesModule],
  controllers: [ReceiptsController],
  providers: [
    ReceiptsService,
    MockOcrProvider,
    LocalReceiptStorageService,
    { provide: OCR_PROVIDER, useExisting: MockOcrProvider },
    { provide: RECEIPT_STORAGE, useExisting: LocalReceiptStorageService }
  ]
})
export class ReceiptsModule {}
