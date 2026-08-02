import { Module } from "@nestjs/common";
import { AI_PROVIDER, AiProvider } from "./ai-provider";
import { AiProposalsController } from "./ai-proposals.controller";
import { AiProposalsService } from "./ai-proposals.service";
import { LocalAiProvider } from "./local-ai.provider";
import { MockAiProvider } from "./mock-ai.provider";

@Module({
  controllers: [AiProposalsController],
  providers: [
    AiProposalsService,
    LocalAiProvider,
    MockAiProvider,
    {
      provide: AI_PROVIDER,
      inject: [LocalAiProvider, MockAiProvider],
      useFactory: (local: LocalAiProvider, mock: MockAiProvider): AiProvider =>
        (process.env.AI_PROVIDER ?? "local").toLowerCase() === "mock"
          ? mock
          : local
    }
  ]
})
export class AiProposalsModule {}
