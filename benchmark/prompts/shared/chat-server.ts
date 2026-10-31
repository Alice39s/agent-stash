import { createServer, type IncomingMessage } from "node:http";
import { text } from "node:stream/consumers";

/** 本地 OpenAI 兼容服务收到的一次请求：路径、Authorization 头与 JSON 请求体。 */
export interface ReceivedRequest {
  readonly path: string;
  readonly authorization: string | undefined;
  readonly body: Record<string, unknown>;
}

/** 一次回复：正文与结束原因。给出 `errorMessage` 时改为返回 HTTP 200 加上只有 `error` 的响应体。 */
export interface CannedReply {
  readonly text: string;
  readonly finishReason?: string;
  readonly errorMessage?: string;
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await text(req));
  if (typeof parsed !== "object" || parsed === null)
    throw new Error("request body is not an object");
  return Object.fromEntries(Object.entries(parsed));
}

/**
 * 在本机随机端口起一个只认 `POST /chat/completions` 的服务，依次返回 `replies`，
 * 用来测试评测代码与 OpenAI 兼容接口之间的请求和回复转换。
 */
export async function startChatServer(replies: readonly CannedReply[]) {
  const received: ReceivedRequest[] = [];
  const server = createServer((req, res) => {
    void readBody(req).then((body) => {
      received.push({ path: req.url ?? "", authorization: req.headers.authorization, body });
      const reply = replies[received.length - 1];
      if (reply === undefined) {
        res.writeHead(500).end("no reply left");
        return;
      }
      if (reply.errorMessage !== undefined) {
        res
          .writeHead(200, { "content-type": "application/json" })
          .end(JSON.stringify({ error: { message: reply.errorMessage, type: "upstream_error" } }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 0,
          model: String(body.model),
          system_fingerprint: "",
          choices: [
            {
              index: 0,
              finish_reason: reply.finishReason ?? "stop",
              message: { role: "assistant", content: reply.text },
            },
          ],
          usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("the server has no TCP port");
  const { port } = address;
  return {
    baseURL: `http://127.0.0.1:${String(port)}/v1/`,
    received,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
