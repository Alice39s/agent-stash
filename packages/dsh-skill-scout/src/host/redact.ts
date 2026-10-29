/**
 * 本地脱敏与裁剪。会话文本在进入插件存储、提示词和界面之前都经过这里：
 * 先替换凭据与个人路径，再按长度裁剪。脱敏发生在 Host 进程内，原文不离开本机。
 */

/** 内置的凭据模式；命中的片段整体替换为占位符。 */
const SECRET_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/gu,
  /\b(?:sk|pk|rk)-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{16,}/gu,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/gu,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/gu,
  /\bglpat-[A-Za-z0-9_-]{16,}\b/gu,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/gu,
  /\bAKIA[0-9A-Z]{16}\b/gu,
  /\bAIza[0-9A-Za-z_-]{35}\b/gu,
  /\bnpm_[A-Za-z0-9]{36}\b/gu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/gu,
];

/** `Bearer xxx`：保留认证方案，只替换凭据。 */
const AUTH_HEADER = /\b(bearer|basic)(\s+)[A-Za-z0-9._~+/=-]{12,}/giu;

/** `Authorization: Token xxx` 一类请求头：任何认证方案都只保留方案名。 */
const AUTHORIZATION = /(\bauthorization["']?\s*[:=]\s*["']?)(?:([A-Za-z]+)(\s+))?[^\s"'`]{6,}/giu;

/**
 * 凭据的键名：含凭据词，可以带前缀，也可以带 `_KEY`、`Token` 这类后缀，
 * 例如 `DB_PASSWORD`、`SECRET_KEY`、`_authToken`、`--api-key`。
 */
const SECRET_KEY = String.raw`[A-Za-z0-9_.-]*?(?:api[_-]?key|secret|token|passw(?:or)?d|pwd|access[_-]?key|private[_-]?key|credentials?|auth)(?:[_-]?(?:key|token|secret|id|value|hash|string))*`;

/** 引号里的值整段替换：`password="a b c"`、`"token": "xxx"`。 */
const QUOTED_ASSIGNMENT = new RegExp(
  String.raw`\b(${SECRET_KEY})(["']?\s*[:=]\s*)(["'])[^"'\n]+?\3`,
  "giu",
);

/** `api_key=xxx`、`SECRET_KEY: xxx` 这类赋值：保留键名，只替换值。 */
const SECRET_ASSIGNMENT = new RegExp(
  String.raw`\b(${SECRET_KEY})(["']?\s*[:=]\s*["']?)([^\s"'\x60,;]{6,})`,
  "giu",
);

/** 用空格隔开的命令行参数：`--password xxx`、`--token "xxx"`。 */
const SECRET_FLAG = new RegExp(
  String.raw`(^|\s)(--?${SECRET_KEY})(\s+)(?!-)(?:"[^"\n]*"|'[^'\n]*'|[^\s"'\x60]{4,})`,
  "giu",
);

/** MySQL 客户端紧跟在 `-p` 后面的密码。 */
const MYSQL_PASSWORD = /(\bmysql(?:dump|admin)?\b[^\n;&|]*?\s-p)(?!\s)[^\s"'`]+/gu;

/** `curl -u user:pass`、`--user user:pass`：保留用户名。 */
const USER_PASSWORD = /(^|\s)(-u|--user)(\s+|=)([^\s:"'`]+):[^\s"'`]+/gu;

/** `docker login -p xxx` 一类登录命令的 `-p`。 */
const LOGIN_PASSWORD = /(\blogin\b[^\n;&|]*?\s-p)(\s+|=)(?!-)[^\s"'`]+/gu;

/** `aws configure set aws_secret_access_key xxx`：键名与值之间是空格。 */
const SET_SECRET = new RegExp(String.raw`(\bset\s+${SECRET_KEY})(\s+)(?!-)[^\s"'\x60]{4,}`, "giu");

/** 凭据类命令的 here-string：`wrangler secret put NAME <<< "xxx"`。 */
const SECRET_HERE_STRING =
  /(\b(?:secrets?|token|passw(?:or)?d|login)\b[^\n]*?<<<\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s"'`]+)/giu;

/** 用管道交给 `--password-stdin` 的值：`echo xxx | docker login --password-stdin`。 */
const PASSWORD_STDIN =
  /(\b(?:echo|printf)\s+)(?:"[^"\n]*"|'[^'\n]*'|[^\s|]+)(\s*\|[^\n|]*--password-stdin)/gu;

/** `Cookie` 与 `Set-Cookie` 头的值。 */
const COOKIE = /(\b(?:set-)?cookie["']?\s*:\s*)[^\n"']+/giu;

/** URL 里的 `user:password@`。 */
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/giu;

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu;

/** macOS 与 Linux 的用户主目录，替换成 `~` 后不再暴露用户名。 */
const HOME_PATH = /(?:\/Users|\/home)\/[^/\s"'`]+/gu;

/** 替换占位符；模型与界面看到的是它而不是原值。 */
export const REDACTED = "[redacted]";

/**
 * 把用户配置的正则编译成全局匹配；非法写法让插件在加载时报错。
 * @param sources - 设置里的正则源码。
 * @returns 编译后的正则。
 */
export function compilePatterns(sources: readonly string[]): readonly RegExp[] {
  return sources.filter((source) => source.trim() !== "").map((source) => new RegExp(source, "gu"));
}

/**
 * 脱敏一段文本。
 * @param text - 会话里的原文。
 * @param extra - 用户追加的正则，整段匹配替换为占位符。
 * @returns 脱敏后的文本。
 */
export function redact(text: string, extra: readonly RegExp[] = []): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) result = result.replace(pattern, REDACTED);
  for (const pattern of extra) result = result.replace(pattern, REDACTED);
  result = result.replace(AUTH_HEADER, `$1$2${REDACTED}`);
  result = result.replace(AUTHORIZATION, `$1$2$3${REDACTED}`);
  result = result.replace(QUOTED_ASSIGNMENT, `$1$2$3${REDACTED}$3`);
  result = result.replace(SECRET_ASSIGNMENT, `$1$2${REDACTED}`);
  result = result.replace(SECRET_FLAG, `$1$2$3${REDACTED}`);
  result = result.replace(MYSQL_PASSWORD, `$1${REDACTED}`);
  result = result.replace(USER_PASSWORD, `$1$2$3$4:${REDACTED}`);
  result = result.replace(LOGIN_PASSWORD, `$1$2${REDACTED}`);
  result = result.replace(SET_SECRET, `$1$2${REDACTED}`);
  result = result.replace(SECRET_HERE_STRING, `$1${REDACTED}`);
  result = result.replace(PASSWORD_STDIN, `$1${REDACTED}$2`);
  result = result.replace(COOKIE, `$1${REDACTED}`);
  result = result.replace(URL_CREDENTIALS, `$1${REDACTED}@`);
  result = result.replace(EMAIL, "[email]");
  return result.replace(HOME_PATH, "~");
}

/**
 * 判断文本是否还含有凭据形态的片段，用于检查模型输出。
 * @param text - 待检查的文本。
 * @returns 命中任一内置凭据模式时为 true。
 */
export function containsSecret(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * 按字符数裁剪，保留开头与结尾。
 * @param text - 原文。
 * @param max - 结果的最大字符数。
 * @returns 不超过 `max` 个字符的文本；裁掉的部分用 `…` 表示。
 */
export function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  if (max < 8) return trimmed.slice(0, max);
  const head = Math.ceil((max - 1) * 0.7);
  const tail = max - 1 - head;
  return `${trimmed.slice(0, head)}…${tail > 0 ? trimmed.slice(-tail) : ""}`;
}

/** 把多行文本压成一行，便于做签名与比较。 */
export function oneLine(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}
