import { afterEach, describe, expect, test } from "vitest";
import { complete } from "./chat.ts";
import { startChatServer } from "./chat-server.ts";

let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  await close?.();
  close = undefined;
});

describe("chat completion", () => {
  test("sends the system prompt, the user message, and the extra body fields", async () => {
    const server = await startChatServer([{ text: "ok" }]);
    close = server.close;
    const reply = await complete(
      { baseURL: server.baseURL, apiKey: "key-1", model: "m-1", body: { reasoning_effort: "low" } },
      {
        system: "be brief",
        user: "hi",
        signal: new AbortController().signal,
        body: { temperature: 0 },
      },
    );
    expect(reply).toEqual({ text: "ok", truncated: false, inputTokens: 120, outputTokens: 30 });
    expect(server.received).toHaveLength(1);
    const [request] = server.received;
    expect(request?.path).toBe("/v1/chat/completions");
    expect(request?.authorization).toBe("Bearer key-1");
    expect(request?.body).toMatchObject({
      model: "m-1",
      reasoning_effort: "low",
      temperature: 0,
      messages: [
        { role: "system", content: "be brief" },
        { role: "user", content: "hi" },
      ],
    });
  });

  test("reports a reply cut off by the output limit", async () => {
    const server = await startChatServer([
      { text: "<rewritten_prompt>Fix", finishReason: "length" },
    ]);
    close = server.close;
    const reply = await complete(
      { baseURL: server.baseURL, apiKey: "k", model: "m", body: {} },
      { system: "s", user: "u", signal: new AbortController().signal },
    );
    expect(reply.truncated).toBe(true);
  });

  test("reports the upstream message when the gateway puts an error in a 200 response", async () => {
    const server = await startChatServer([
      { text: "", errorMessage: "Our servers are currently busy." },
    ]);
    close = server.close;
    await expect(
      complete(
        { baseURL: server.baseURL, apiKey: "k", model: "m", body: {} },
        { system: "s", user: "u", signal: new AbortController().signal },
      ),
    ).rejects.toThrow("HTTP 200 with an error body: Our servers are currently busy.");
  });
});
