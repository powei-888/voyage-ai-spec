import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { LocalOcrProvider } from "./local-ocr.provider";
import { LocalReceiptStorageService } from "./local-receipt-storage.service";
import { MockOcrProvider } from "./mock-ocr.provider";
import { OCR_PROVIDER, OcrProvider } from "./ocr-provider";
import { ReceiptConfirmationService } from "./receipt-confirmation.service";
import { RECEIPT_STORAGE } from "./receipt-storage";
import { ReceiptsController } from "./receipts.controller";
import { ReceiptsService } from "./receipts.service";

@Module({
  imports: [ExpensesModule],
  controllers: [ReceiptsController],
  providers: [
    ReceiptsService,
    ReceiptConfirmationService,
    LocalOcrProvider,
    MockOcrProvider,
    LocalReceiptStorageService,
    {
      provide: OCR_PROVIDER,
      inject: [LocalOcrProvider, MockOcrProvider],
      useFactory: (local: LocalOcrProvider, mock: MockOcrProvider): OcrProvider =>
        (process.env.OCR_PROVIDER ?? "local").toLowerCase() === "mock"
          ? mock
          : local
    },
    { provide: RECEIPT_STORAGE, useExisting: LocalReceiptStorageService }
  ]
})
export class ReceiptsModule {}
