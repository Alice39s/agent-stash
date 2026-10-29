/**
 * 识别常见的密钥与凭据。规则取自 DSH 发送消息时遮盖凭据的格式表：模型服务与云厂商的 API Key、
 * 代码托管与包仓库的 Token、协作与支付服务的 Token、JWT、私钥块，以及地址里的密码。
 */
const PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gu,
  /\bsk-(?=[\w-]{0,255}\d)[\w-]{20,}/gu,
  /\bAIza[\w-]{35}\b/gu,
  /\bgh[pousr]_[A-Za-z0-9]{36,}/gu,
  /\bgithub_pat_\w{22,}/gu,
  /\bglpat-[\w-]{20,}/gu,
  /\bnpm_[A-Za-z0-9]{36,}/gu,
  /\bhf_[A-Za-z0-9]{30,}/gu,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu,
  /\bLTAI[A-Za-z0-9]{12,20}\b/gu,
  /\bAKID[A-Za-z0-9]{28,36}\b/gu,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/gu,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/gu,
  /\bwhsec_[A-Za-z0-9]{24,}/gu,
  /\beyJ[\w-]{8,}\.eyJ[\w-]{8,}\.[\w-]{8,}/gu,
];

/** 地址里 `user:password@` 的密码部分。 */
const ADDRESS_PASSWORD = /(?<=:\/\/[^\s/:@?#]+:)[^\s/@?#]+(?=@)/gu;

/** 草稿里的凭据换成占位符后的文本，以及把占位符换回原文的对照表。 */
export interface MaskedText {
  readonly text: string;
  readonly secrets: readonly string[];
}

/** 第 `index` 个凭据的占位符，从 1 开始编号。 */
export function placeholder(index: number): string {
  return `⟦secret-${String(index)}⟧`;
}

/** 每种格式依次替换；同一个凭据重复出现时共用一个编号。 */
function replaceAll(text: string, replace: (secret: string) => string): string {
  let result = text;
  for (const pattern of [...PATTERNS, ADDRESS_PASSWORD]) {
    result = result.replace(pattern, replace);
  }
  return result;
}

/** 把草稿里的凭据换成 `⟦secret-N⟧`，改写结果用 {@link unmaskSecrets} 换回原文。 */
export function maskSecrets(text: string): MaskedText {
  const secrets: string[] = [];
  const masked = replaceAll(text, (secret) => {
    const known = secrets.indexOf(secret);
    if (known >= 0) return placeholder(known + 1);
    secrets.push(secret);
    return placeholder(secrets.length);
  });
  return { text: masked, secrets };
}

/** 把改写结果里的占位符换回草稿里的原文。 */
export function unmaskSecrets(text: string, secrets: readonly string[]): string {
  return secrets.reduce(
    (result, secret, index) => result.replaceAll(placeholder(index + 1), secret),
    text,
  );
}

/** 会话上下文里的凭据直接抹去，只留一个标记。 */
export function redactSecrets(text: string): string {
  return replaceAll(text, () => "[redacted]");
}
