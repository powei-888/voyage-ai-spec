import { Global, Module } from "@nestjs/common";
import { LocalInferenceCoordinator } from "./local-inference-coordinator";
import { OllamaClient } from "./ollama-client";

@Global()
@Module({
  providers: [LocalInferenceCoordinator, OllamaClient],
  exports: [LocalInferenceCoordinator, OllamaClient]
})
export class LocalModelModule {}
