import { Injectable } from "@nestjs/common";

type ChatJsonInput = {
  system: string;
  prompt: string;
  images?: string[];
  maxTokens?: number;
};

type OllamaChatResponse = {
  message?: { content?: string };
};

function envInteger(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseJsonObject(content: string): Record<string, unknown> {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed: unknown = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Local model returned a non-object JSON response.");
  }
  return parsed as Record<string, unknown>;
}

@Injectable()
export class OllamaClient {
  readonly model = process.env.LOCAL_LLM_MODEL ?? "qwen3.5:9b";
  private readonly baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434")
    .replace(/\/$/, "");
  private readonly timeoutMs = envInteger("LOCAL_LLM_TIMEOUT_MS", 180_000);

  async chatJson(input: ChatJsonInput): Promise<Record<string, unknown>> {
    const firstContent = await this.request(input);
    try {
      return parseJsonObject(firstContent);
    } catch {
      const retryContent = await this.request(input, firstContent);
      try {
        return parseJsonObject(retryContent);
      } catch (error) {
        throw new Error(
          `Local model returned invalid JSON after one retry: ${
            error instanceof Error ? error.message : "Unknown parse error"
          }`
        );
      }
    }
  }

  private async request(input: ChatJsonInput, invalidContent?: string): Promise<string> {
    const messages = [
      { role: "system", content: input.system },
      {
        role: "user",
        content: input.prompt,
        ...(input.images?.length ? { images: input.images } : {})
      },
      ...(invalidContent
        ? [
            { role: "assistant", content: invalidContent },
            {
              role: "user",
              content:
                "上一個回應不是有效 JSON。請重新輸出完整且可解析的 JSON 物件，不要加入 Markdown 或說明文字。"
            }
          ]
        : [])
    ];
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({
        model: this.model,
        stream: false,
        think: false,
        format: "json",
        keep_alive: process.env.LOCAL_LLM_KEEP_ALIVE ?? "0",
        messages,
        options: {
          temperature: 0.1,
          num_ctx: envInteger("LOCAL_LLM_NUM_CTX", 8192),
          num_predict: input.maxTokens ?? 700
        }
      })
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Ollama request failed (${response.status}): ${detail}`);
    }
    const payload = (await response.json()) as OllamaChatResponse;
    if (!payload.message?.content) {
      throw new Error("Ollama returned an empty response.");
    }
    return payload.message.content;
  }
}
