import { Module } from "@nestjs/common";
import { AI_PROVIDER } from "./ai-provider";
import { AiProposalsController } from "./ai-proposals.controller";
import { AiProposalsService } from "./ai-proposals.service";
import { MockAiProvider } from "./mock-ai.provider";

@Module({
  controllers: [AiProposalsController],
  providers: [
    AiProposalsService,
    MockAiProvider,
    { provide: AI_PROVIDER, useExisting: MockAiProvider }
  ]
})
export class AiProposalsModule {}
