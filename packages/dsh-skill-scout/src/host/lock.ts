/**
 * 工作锁：同一个 DSH_HOME 下可能同时运行多个 DSH 进程（桌面端、命令行），只有持有锁的进程做分析与后台摘要，
 * 避免重复读取日志和重复调用模型。锁文件记录持有者的 pid；持有者进程已经退出时锁可以被接管。
 * 两个进程同时接管同一把失效锁时，后写入的一方留下锁文件；持有者每次定时检查都确认锁文件仍记着自己，
 * 不再是自己就交出工作。
 */
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { dirname } from "pathe";
import * as v from "valibot";
import { errorCode } from "./writer.ts";

const LockSchema = v.pipe(v.string(), v.parseJson(), v.object({ pid: v.number(), at: v.number() }));

/** 进程是否还在运行；没有权限发信号也说明进程存在。 */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return errorCode(error) === "EPERM";
  }
}

/** 锁文件记录的 pid；文件不存在或内容不完整时返回 null。 */
async function holder(path: string): Promise<number | null> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  }
  const parsed = v.safeParse(LockSchema, text);
  return parsed.success ? parsed.output.pid : null;
}

/** 以独占方式新建锁文件；文件已存在时返回 false。 */
async function create(path: string): Promise<boolean> {
  try {
    const handle = await open(path, "wx");
    await handle.writeFile(JSON.stringify({ pid: process.pid, at: Date.now() }));
    await handle.close();
    return true;
  } catch (error) {
    if (errorCode(error) === "EEXIST") return false;
    throw error;
  }
}

/** 锁文件此刻是否记着本进程。 */
export async function holdsLock(path: string): Promise<boolean> {
  return (await holder(path)) === process.pid;
}

/**
 * 尝试获取锁。
 * @param path - 锁文件路径。
 * @returns 获取成功时返回释放函数，被其它存活进程持有时返回 null。
 */
export async function acquireLock(path: string): Promise<(() => Promise<void>) | null> {
  await mkdir(dirname(path), { recursive: true });
  const release = async (): Promise<void> => {
    if ((await holder(path)) === process.pid) await unlink(path);
  };
  if (await create(path)) return release;
  const pid = await holder(path);
  if (pid !== null && pid !== process.pid && alive(pid)) return null;
  // 持有者已退出或是本进程的旧实例：删除旧锁后再试一次。
  try {
    await unlink(path);
  } catch (error) {
    if (errorCode(error) !== "ENOENT") throw error;
  }
  return (await create(path)) ? release : null;
}
