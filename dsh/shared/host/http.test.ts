import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, test } from "vitest";
import { guardRoute, sendJson, type DshConnection } from "./http.ts";

let server: Server | undefined;

afterEach(async () => {
  const running = server;
  server = undefined;
  if (running !== undefined) await new Promise((done) => running.close(done));
});

/** 在本机随机端口上挂好一条只接受 GET 的守卫路由，返回基地址。 */
async function serve(connection: DshConnection): Promise<string> {
  const handler = guardRoute(connection, "GET", async (_req, res) => {
    sendJson(res, 200, { served: true });
  });
  const http = createServer((req, res) => {
    void handler(req, res);
  });
  server = http;
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  if (address === null || typeof address === "string")
    throw new Error("the test server has no port");
  return `http://127.0.0.1:${String(address.port)}`;
}

describe("guardRoute", () => {
  test("answers the status from requestRejection on DSH before 0.2.3-alpha.1", async () => {
    const base = await serve({
      requestRejection: (req) => (req.headers["x-reject"] === "1" ? 401 : undefined),
    });
    const rejected = await fetch(base, { headers: { "x-reject": "1" } });
    expect(rejected.status).toBe(401);
    expect(await rejected.json()).toEqual({
      message: "the DSH connection check rejected this request",
    });
    expect((await fetch(base)).status).toBe(200);
  });

  test("serves requests on DSH 0.2.3-alpha.1 and later, where the WebServer admits them", async () => {
    const base = await serve({});
    const response = await fetch(base);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ served: true });
    expect((await fetch(base, { method: "POST" })).status).toBe(405);
  });
});
