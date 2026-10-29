import { readFile, writeFile } from "node:fs/promises";
import { join } from "pathe";
import { afterEach, expect, test } from "vitest";
import { acquireLock, holdsLock } from "./lock.ts";
import { workspace } from "./testing.ts";

let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

async function lockPath(): Promise<string> {
  const ws = await workspace();
  cleanup = () => ws.cleanup();
  return join(ws.home, "skill-scout", "worker.lock");
}

test("refuses a lock that a running process holds", async () => {
  const path = await lockPath();
  const release = await acquireLock(path);
  expect(release).not.toBeNull();
  expect(await holdsLock(path)).toBe(true);
  // 父进程一定还在运行：把锁改记成它，模拟另一个 DSH 进程持有。
  await writeFile(path, JSON.stringify({ pid: process.ppid, at: Date.now() }));
  expect(await acquireLock(path)).toBeNull();
  expect(await holdsLock(path)).toBe(false);
  // 锁已经不是本进程的，释放不能删掉别人的锁。
  await release?.();
  expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({ pid: process.ppid });
});

test("takes over a lock whose holder has exited", async () => {
  const path = await lockPath();
  await acquireLock(path);
  await writeFile(path, JSON.stringify({ pid: 2 ** 22 + 12_345, at: 0 }));
  const release = await acquireLock(path);
  expect(release).not.toBeNull();
  expect(await holdsLock(path)).toBe(true);
});
