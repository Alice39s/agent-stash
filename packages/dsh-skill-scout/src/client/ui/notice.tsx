/**
 * 提示带（design 4.9）：
 * - `limit`：限制当前区域的条件（缺少设置、由另一个窗口分析），照宿主 DiscoverSection 的 `.notice`，警示底色与图标，至多一个链接；
 * - `error`：读取失败，错误色文字与一个 `outline` 的重试按钮，保留已有内容；
 * - `result`：操作的结果，一行文字与查看、撤销链接、关闭按钮，出现在操作发生的地方。
 */
import {
  Button,
  IconCloseOutlineRegular,
  IconWarningOutlineRegular,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode } from "react";
import { IconButton } from "./icon-button.tsx";
import styles from "./notice.module.css";

export function LimitNotice({
  text,
  link,
}: {
  readonly text: string;
  readonly link?: { readonly label: string; readonly onClick: () => void } | undefined;
}): ReactNode {
  return (
    <div className={styles.limit} data-notice="limit">
      <IconWarningOutlineRegular size={14} />
      <p className={styles.text}>{text}</p>
      {link !== undefined && (
        <button type="button" className={styles.link} onClick={link.onClick}>
          {link.label}
        </button>
      )}
    </div>
  );
}

export function ErrorNotice({
  text,
  retry,
}: {
  readonly text: string;
  readonly retry?: { readonly label: string; readonly onClick: () => void } | undefined;
}): ReactNode {
  return (
    <div className={styles.error} role="alert" data-notice="error">
      <p className={styles.text}>{text}</p>
      {retry !== undefined && (
        <Button variant="outline" size="sm" onClick={retry.onClick}>
          {retry.label}
        </Button>
      )}
    </div>
  );
}

export interface ResultLink {
  readonly label: string;
  readonly onClick: () => void;
}

export function ResultNotice({
  text,
  links,
  close,
  framed = true,
}: {
  readonly text: string;
  readonly links: readonly ResultLink[];
  readonly close?: { readonly label: string; readonly onClick: () => void } | undefined;
  /** 页面与浮层底部用一条带底色的提示；弹出的提示由外层给出材质。 */
  readonly framed?: boolean;
}): ReactNode {
  return (
    <div
      className={styles.result}
      data-framed={framed || undefined}
      role="status"
      data-notice="result"
    >
      <p className={styles.text}>{text}</p>
      {links.map((link) => (
        <button key={link.label} type="button" className={styles.link} onClick={link.onClick}>
          {link.label}
        </button>
      ))}
      {close !== undefined && (
        <IconButton size={24} label={close.label} onClick={close.onClick}>
          <IconCloseOutlineRegular size={12} />
        </IconButton>
      )}
    </div>
  );
}
