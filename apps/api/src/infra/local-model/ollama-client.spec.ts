import { OllamaClient } from "./ollama-client";

describe("OllamaClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.LOCAL_LLM_KEEP_ALIVE;
  });

  it("requests structured local inference and unloads the model by default", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ message: { content: "{\"summary\":\"完成\",\"analysis\":{}}" } }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    global.fetch = fetchMock;

    const result = await new OllamaClient().chatJson({
      system: "system",
      prompt: "prompt",
      images: ["aW1hZ2U="]
    });

    expect(result.summary).toBe("完成");
    const request = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(request).toMatchObject({
      stream: false,
      think: false,
      format: "json",
      keep_alive: "0"
    });
    expect(request.messages[1].images).toEqual(["aW1hZ2U="]);
  });

  it("regenerates once when the model returns malformed JSON", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: { content: '{"summary":"缺少結尾"' } }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: { content: '{"summary":"已修正","analysis":{}}' } }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    global.fetch = fetchMock;

    const result = await new OllamaClient().chatJson({
      system: "system",
      prompt: "prompt"
    });

    expect(result.summary).toBe("已修正");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retry = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(retry.messages).toHaveLength(4);
    expect(retry.messages[2]).toEqual({
      role: "assistant",
      content: '{"summary":"缺少結尾"'
    });
    expect(retry.messages[3].content).toContain("不是有效 JSON");
  });
});
