import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile
} from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { DomainError } from "../../common/domain-error";
import { ConfirmReceiptDto } from "./receipts.dto";
import { ReceiptsService } from "./receipts.service";

type MultipartRequest = {
  file: () => Promise<MultipartFile | undefined>;
};

type HeaderReply = {
  header: (name: string, value: string) => void;
};

@Controller("trips/:tripId/receipts")
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Get()
  async list(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.receipts.list(userId, tripId));
  }

  @Post()
  async upload(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Req() request: MultipartRequest
  ) {
    const file = await request.file();
    if (!file) {
      throw new DomainError("RECEIPT_FILE_REQUIRED", "Receipt file is required.");
    }
    return ok(
      await this.receipts.upload(userId, tripId, {
        originalName: file.filename,
        mimeType: file.mimetype,
        buffer: await file.toBuffer()
      })
    );
  }

  @Get(":receiptId/image")
  async image(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("receiptId") receiptId: string,
    @Res({ passthrough: true }) reply: HeaderReply
  ) {
    const image = await this.receipts.readImage(userId, tripId, receiptId);
    reply.header("Content-Type", image.mimeType);
    reply.header("Content-Disposition", `inline; filename="${image.originalName.replace(/"/g, "")}"`);
    return new StreamableFile(image.buffer);
  }

  @Get(":receiptId")
  async get(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("receiptId") receiptId: string
  ) {
    return ok(await this.receipts.get(userId, tripId, receiptId));
  }

  @Post(":receiptId/confirm")
  async confirm(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("receiptId") receiptId: string,
    @Body() dto: ConfirmReceiptDto
  ) {
    return ok(await this.receipts.confirm(userId, tripId, receiptId, dto));
  }
}
