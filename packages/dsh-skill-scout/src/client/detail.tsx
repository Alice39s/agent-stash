/**
 * 一条建议的详情面板，嵌在会话视图与「历史回溯提炼」页的详情栏（design 3.6）：
 * 固定的标题区（标题、来源标签、元信息、同一线索的分页器、生命周期步骤与下一步说明）、内容 Tab 条
 * （摘要、Skill、改动、证据，尾部是作用于当前 Tab 的图标按钮）、唯一滚动的正文，以及固定的底部操作栏。
 * 证据、摘要与草稿从 Host 读取；卡片的状态跟随收件箱刷新，状态或更新时间变化时重新读取详情。
 */
import {
  DiffBlock,
  IconChevronLeftOutlineRegular,
  IconChevronRightOutlineRegular,
  IconEditOutlineRegular,
  IconEllipsisOutlineRegular,
  IconRefreshOutlineRegular,
  MarkdownText,
  Menu,
  PathLabel,
  StateDot,
  Tag,
  type StateDotState,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import * as v from "valibot";
import {
  SkillFieldsSchema,
  type Action,
  type DetailView,
  type EvidenceEpisode,
  type EvidenceOp,
  type InboxView,
  type ItemView,
  type PreviewView,
  type SkillFields,
  type TaskView,
} from "../shared.ts";
import styles from "./detail.module.css";
import type { ScoutFace } from "./face.ts";
import { absolute, ago, counted, itemStatus, stateLabel, taskStatus, titleOf } from "./format.ts";
import { errorText, useLoaded, useNow, type Loaded } from "./hooks.ts";
import { lifecycleOf } from "./lifecycle.ts";
import type { ScoutKey, ScoutTranslate } from "./locale.ts";
import { Working } from "./progress.tsx";
import type { InboxStore, Notice } from "./store.ts";
import { ActionButton } from "./ui/action-button.tsx";
import { DetailTabs } from "./ui/detail-tabs.tsx";
import { IconButton } from "./ui/icon-button.tsx";
import { ErrorNotice, LimitNotice } from "./ui/notice.tsx";
import { Pager } from "./ui/pager.tsx";
import { Skeleton } from "./ui/skeleton.tsx";
import { SplitButton } from "./ui/split-button.tsx";
import { Steps } from "./ui/steps.tsx";

type Tab = "summary" | "skill" | "changes" | "evidence";
type Busy = "summarize" | "draft" | "save" | "dismiss" | "similar" | "undo" | "restore" | null;

/** 两个阶段此刻使用的模型名称；没有可用模型时为 null。 */
export interface StageModels {
  readonly summary: string | null;
  readonly draft: string | null;
}

export interface DetailProps {
  readonly item: ItemView;
  readonly inbox: InboxStore;
  readonly loadDetail: (id: string, signal: AbortSignal) => Promise<DetailView>;
  readonly models: StageModels;
  readonly defaultScope: "project" | "user";
  readonly openSession: ((sessionId: string) => void) | null;
  readonly t: ScoutTranslate;
  /** 切换到同一线索的另一个 idea。 */
  readonly onSelect: (id: string) => void;
  /** `page`：主区域的详情栏；`pane`：会话视图的详情栏。 */
  readonly size: "page" | "pane";
  /** 单栏布局里回到列表；只在单栏时传入，两栏时不渲染返回按钮。 */
  readonly onBack?: (() => void) | undefined;
}

/** Markdown 与 diff 视图的文案。 */
function useLabels(t: ScoutTranslate) {
  return useMemo(() => {
    const toolbar = {
      codeLabel: t("code.label"),
      wrapLabel: t("code.wrap"),
      unwrapLabel: t("code.unwrap"),
    };
    return {
      markdown: {
        code: { copyLabel: t("code.copy"), copiedLabel: t("code.copied"), toolbarLabels: toolbar },
        footnotes: t("code.footnotes"),
      },
      diff: {
        ...toolbar,
        copy: t("code.copy"),
        copied: t("code.copied"),
        collapse: t("diff.collapse"),
        collapseAria: t("diff.collapseAria"),
        expand: (count: number) =>
          t(count === 1 ? "diff.expand.one" : "diff.expand.other", { count }),
        expandAria: (count: number) =>
          t(count === 1 ? "diff.expand.one" : "diff.expand.other", { count }),
      },
    };
  }, [t]);
}

const ROLE_KEYS: Readonly<Record<NonNullable<EvidenceOp["role"]>, ScoutKey>> = {
  verify: "role.verify",
  failure: "role.failure",
  fix: "role.fix",
  recovered: "role.recovered",
};

const OUTCOMES: ReadonlySet<string> = new Set<TaskView["outcome"]>([
  "verified",
  "succeeded",
  "unverified",
  "disputed",
  "failed",
  "aborted",
]);

function isOutcome(outcome: string): outcome is TaskView["outcome"] {
  return OUTCOMES.has(outcome);
}

/** 一次操作的状态点：失败为错误，通过检查或修复后通过为完成，其余为空闲。 */
function opDot(op: EvidenceOp): "error" | "done" | "idle" {
  if (!op.ok) return "error";
  return op.role === "verify" || op.role === "recovered" ? "done" : "idle";
}

interface EpisodeProps {
  readonly episode: EvidenceEpisode;
  readonly now: number;
  readonly openSession: ((sessionId: string) => void) | null;
  readonly t: ScoutTranslate;
}

/** 证据里的一个任务：请求、结果与时间，以及按顺序列出的全部操作。 */
function Episode({ episode, now, openSession, t }: EpisodeProps): ReactNode {
  const status = isOutcome(episode.outcome) ? taskStatus(t, episode.outcome) : null;
  return (
    <section className={styles.episode} aria-label={episode.goal}>
      <div className={styles.episodeHead}>
        <span className={styles.marker}>
          <StateDot state={status?.dot ?? "idle"} />
        </span>
        <div className={styles.episodeText}>
          <h3 className={styles.episodeGoal}>
            <span className={styles.ref}>{episode.ref}</span>
            {episode.goal}
          </h3>
          <p className={styles.meta}>
            <span className={styles.metaItem} data-ink={status?.ink ?? "tertiary"}>
              {status?.word ?? episode.outcome}
            </span>
            <time className={styles.metaItem} title={absolute(episode.at)}>
              {ago(t, episode.at, now)}
            </time>
            {episode.cwd !== null && (
              <span className={styles.metaItem} data-fill="">
                <PathLabel path={episode.cwd} />
              </span>
            )}
          </p>
        </div>
        {openSession !== null && (
          <IconButton
            size={24}
            label={t("detail.openSession")}
            onClick={() => openSession(episode.sessionId)}
          >
            <IconChevronRightOutlineRegular size={14} />
          </IconButton>
        )}
      </div>
      <ol className={styles.ops} aria-label={t("evidence.list", { ref: episode.ref })}>
        {episode.ops.map((op) => {
          const notes = [
            ...(op.role === null ? [] : [t(ROLE_KEYS[op.role])]),
            ...(op.cited ? [t("role.cited")] : []),
            ...(op.exit !== null && op.exit !== 0 ? [t("evidence.exit", { code: op.exit })] : []),
          ];
          return (
            <li
              key={op.ref}
              className={styles.op}
              data-ok={op.ok}
              data-cited={op.cited || undefined}
            >
              <span className={styles.marker}>
                <StateDot state={opDot(op)} />
              </span>
              <span className={styles.opBody}>
                <code className={styles.opLabel} data-kind={op.kind}>
                  {op.label}
                </code>
                {notes.length > 0 && (
                  <span className={styles.meta}>
                    {notes.map((note) => (
                      <span key={note} className={styles.metaItem}>
                        {note}
                      </span>
                    ))}
                  </span>
                )}
                {op.error !== null && <code className={styles.opError}>{op.error}</code>}
              </span>
              <span className={styles.opRef}>{op.ref}</span>
            </li>
          );
        })}
      </ol>
      {episode.reads > 0 && (
        <p className={styles.note}>
          {t(episode.reads === 1 ? "evidence.reads.one" : "evidence.reads.other", {
            count: episode.reads,
          })}
        </p>
      )}
      {keyed(episode.steering).map(({ key, text }) => (
        <p key={key} className={styles.quote}>
          <span className={styles.label}>{t("evidence.steering")}</span>
          {text}
        </p>
      ))}
      {episode.followup !== null && (
        <p className={styles.quote}>
          <span className={styles.label}>{t("evidence.followup")}</span>
          {episode.followup}
        </p>
      )}
    </section>
  );
}

interface FieldsEditorProps {
  readonly fields: SkillFields;
  readonly onChange: (next: SkillFields) => void;
  readonly t: ScoutTranslate;
}

function FieldsEditor({ fields, onChange, t }: FieldsEditorProps): ReactNode {
  const id = useId();
  const field = (key: keyof SkillFields, rows: number, mono = false): ReactNode => (
    <label className={styles.field} htmlFor={`${id}-${key}`}>
      <span className={styles.label}>{t(`skill.${key}`)}</span>
      {rows === 1 ? (
        <input
          id={`${id}-${key}`}
          className={`${styles.input} ${styles.mono}`}
          value={fields[key]}
          spellCheck={false}
          onChange={(event) => onChange({ ...fields, [key]: event.target.value })}
        />
      ) : (
        <textarea
          id={`${id}-${key}`}
          className={mono ? `${styles.input} ${styles.mono}` : styles.input}
          rows={rows}
          value={fields[key]}
          onChange={(event) => onChange({ ...fields, [key]: event.target.value })}
        />
      )}
    </label>
  );
  return (
    <div className={styles.editor}>
      {field("name", 1)}
      {field("description", 2)}
      {field("whenToUse", 2)}
      {field("body", 14, true)}
    </div>
  );
}

/** 给可能重复的文本行配上稳定的 key：文本加上它第几次出现。 */
function keyed(lines: readonly string[]): { readonly key: string; readonly text: string }[] {
  const seen = new Map<string, number>();
  return lines.map((text) => {
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { key: `${text}#${String(count)}`, text };
  });
}

/** 比较标题时忽略大小写、空白与连字符。 */
function normalized(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(/[\s_-]+/gu, " ");
}

/**
 * 去掉正文开头与面板标题或 Skill 名称重复的一、二级标题。
 * @internal 导出供测试使用。
 */
export function withoutTitle(body: string, titles: readonly string[]): string {
  const match = /^\s*#{1,2}[ \t]+([^\n]+?)[ \t#]*(?:\n|$)/u.exec(body);
  if (match === null) return body;
  const heading = normalized(match[1] ?? "");
  return titles.some((title) => normalized(title) === heading)
    ? body.slice(match[0].length).trimStart()
    : body;
}

/** 一段带标签的正文。 */
/** 步骤条下面一行的文字；失败时用错误墨色。 */
interface NextLine {
  readonly text: string;
  readonly failed: boolean;
}

function line(text: string): NextLine {
  return { text, failed: false };
}

function block(label: string, children: ReactNode): ReactNode {
  return (
    <section className={styles.block} aria-label={label}>
      <h3 className={styles.label}>{label}</h3>
      {children}
    </section>
  );
}

/** 详情面板；换一张卡片时编辑、预览与页签都重新开始。 */
export function DetailPanel(props: DetailProps): ReactNode {
  return <Detail key={props.item.id} {...props} />;
}

/** 按收件箱里的工作状态（两个阶段的模型、默认保存位置）显示一张卡片的详情。 */
export function ItemDetail({
  face,
  view,
  item,
  t,
  onSelect,
  size,
  onBack,
}: {
  readonly face: ScoutFace;
  readonly view: InboxView;
  readonly item: ItemView;
  readonly t: ScoutTranslate;
  readonly onSelect: (id: string) => void;
  readonly size: "page" | "pane";
  readonly onBack?: (() => void) | undefined;
}): ReactNode {
  const { models, scope } = view.status;
  return (
    <DetailPanel
      item={item}
      inbox={face.inbox}
      loadDetail={face.loadDetail}
      models={{ summary: models.summary?.model ?? null, draft: models.draft?.model ?? null }}
      defaultScope={scope}
      openSession={face.openSession}
      t={t}
      onSelect={onSelect}
      size={size}
      onBack={onBack}
    />
  );
}

const CAUTIONS = new Set<string>([
  "caution.sudo",
  "caution.force-push",
  "caution.no-verify",
  "caution.chmod-777",
  "caution.recursive-delete",
]);

function isCaution(key: string): key is ScoutKey {
  return CAUTIONS.has(key);
}

function Detail({
  item,
  inbox,
  loadDetail,
  models,
  defaultScope,
  openSession,
  t,
  onSelect,
  size,
  onBack,
}: DetailProps): ReactNode {
  const id = item.id;
  const tabsId = useId();
  const labels = useLabels(t);
  /** 用户选中的页签；为 null 时跟随状态：草稿生成中与可以保存时看 Skill，其余看摘要。 */
  const [chosenTab, setChosenTab] = useState<Tab | null>(null);
  const [scope, setScope] = useState(defaultScope);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<SkillFields | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [preview, setPreview] = useState<Loaded<PreviewView> | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const now = useNow(60_000);

  // 面板开着时这张卡片的请求结束不另行提示，待决定的摘要与草稿也算看过。
  useEffect(() => inbox.watch(id), [inbox, id]);

  // 卡片的状态或更新时间变化时重新读取详情：摘要与草稿都在模型回复之后才有。
  const version = `${item.state}:${String(item.updatedAt)}`;
  const load = useCallback(
    (_version: string, signal: AbortSignal) => loadDetail(id, signal),
    [loadDetail, id],
  );
  const detail = useLoaded(load, version);

  const value = detail.status === "ready" ? detail.value : null;
  const create = item.decision === "suggest_create";
  const improve = item.decision === "suggest_improve";
  const proposal = create || improve;
  const drafted = value !== null && (value.draft !== null || value.section !== null);
  const draft = fields ?? value?.draft ?? null;
  const shownSection = section ?? value?.section ?? null;
  const parsed = draft === null ? null : v.safeParse(SkillFieldsSchema, draft);
  const invalid = create && parsed !== null && !parsed.success;
  const draftFailed = item.state === "failed" && item.failure?.stage === "draft";
  /** 摘要已经给出计划，等用户同意生成草稿。 */
  const awaitingConsent = proposal && (item.state === "proposed" || draftFailed);
  const edited = (create ? fields : section) !== null;

  // 「改动」页与保存前都需要 Host 渲染的最终文件；编辑后稍等再请求。
  const wantPreview = drafted && item.state === "ready";
  useEffect(() => {
    if (!wantPreview || invalid) return undefined;
    let stale = false;
    const timer = setTimeout(
      () => {
        setPreview((current) => (current === null ? { status: "loading" } : current));
        const action: Action = {
          action: "preview",
          id,
          ...(create ? { scope } : {}),
          ...(fields === null ? {} : { fields }),
          ...(section === null ? {} : { section }),
        };
        inbox.act(action).then(
          (result) => {
            if (stale) return;
            if (result.ok && result.preview !== undefined)
              setPreview({ status: "ready", value: result.preview });
            else
              setPreview({
                status: "error",
                error: result.ok ? "" : t(`error.${result.error.kind}`),
              });
          },
          (reason: unknown) => {
            if (!stale) setPreview({ status: "error", error: errorText(reason) });
          },
        );
      },
      fields === null && section === null ? 0 : 300,
    );
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [wantPreview, invalid, id, create, scope, fields, section, inbox, t]);

  const run = async (
    kind: Exclude<Busy, null>,
    action: Action,
    notice?: Notice,
  ): Promise<boolean> => {
    setBusy(kind);
    setError(null);
    try {
      const result = await inbox.act(action, notice);
      if (!result.ok) setError(t(`error.${result.error.kind}`));
      return result.ok;
    } catch (reason) {
      setError(t("error.request", { error: errorText(reason) }));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const skillName = item.skill ?? "";
  const summarize = (): void => {
    void run("summarize", { action: "summarize", id });
  };
  /** 同意摘要，生成草稿；之前的编辑与预览作废，页签回到跟随状态。 */
  const generate = (): void => {
    setFields(null);
    setSection(null);
    setEditing(false);
    setPreview(null);
    setChosenTab(null);
    void run("draft", { action: "draft", id });
  };
  const dismiss = (similar: boolean): void => {
    void run(
      similar ? "similar" : "dismiss",
      { action: "dismiss", id, similar },
      {
        key: similar ? "notice.dismissedSimilar" : "notice.dismissed",
        params: {},
        undo: { action: "restore", id },
        view: null,
      },
    );
  };
  const reset = (): void => {
    if (create) setFields(null);
    else setSection(null);
  };
  const save = async (): Promise<void> => {
    const ok = await run(
      "save",
      {
        action: "write",
        id,
        ...(create ? { scope } : {}),
        ...(fields === null ? {} : { fields }),
        ...(section === null ? {} : { section }),
        ...(preview?.status === "ready" && preview.value.kind === "improve"
          ? { baseHash: preview.value.baseHash }
          : {}),
      },
      {
        key: "notice.written",
        params: { skill: draft?.name ?? skillName },
        undo: { action: "undo", id },
        view: null,
      },
    );
    if (ok) {
      setEditing(false);
      setPreview(null);
    }
  };
  const undo = (): void => {
    void run(
      "undo",
      { action: "undo", id },
      {
        key: "notice.undone",
        params: { skill: item.write?.skill ?? skillName },
        undo: null,
        view: null,
      },
    );
  };
  const restore = (): void => {
    void run(
      "restore",
      { action: "restore", id },
      { key: "notice.restored", params: {}, undo: null, view: null },
    );
  };

  // 内容 Tab 的顺序固定，没有内容的 Tab 不出现。
  const tabs: { value: Tab; label: string }[] = [
    { value: "summary", label: t("detail.tab.summary") },
    ...(item.state === "drafting" || drafted
      ? [{ value: "skill" as const, label: t("detail.tab.skill") }]
      : []),
    ...(item.state === "ready" && drafted
      ? [{ value: "changes" as const, label: t("detail.tab.changes") }]
      : []),
    ...((value?.episodes.length ?? 0) > 0
      ? [{ value: "evidence" as const, label: t("detail.tab.evidence") }]
      : []),
  ];
  const autoTab: Tab = item.state === "drafting" || item.state === "ready" ? "skill" : "summary";
  const wanted = chosenTab ?? autoTab;
  const activeTab = tabs.some((entry) => entry.value === wanted) ? wanted : "summary";

  const writable = !(
    preview?.status === "ready" &&
    preview.value.kind === "improve" &&
    !preview.value.writable
  );
  const notWritable = writable ? null : t("skill.notWritable", { skill: skillName });

  /**
   * 步骤条下面一行（design 4.6），每种状态都有：能操作时以底栏主操作的动词开头，
   * 运行中写这一步会产出什么，失败时写原因。
   */
  const nextStep = (): NextLine => {
    const { state } = item;
    if (state === "failed") {
      return {
        text:
          item.failure === null
            ? t(draftFailed ? "state.draftFailed" : "state.failed")
            : t(draftFailed ? "detail.failed.draft" : "detail.failed.summary", {
                kind: t(`failure.${item.failure.kind}`),
              }),
        failed: true,
      };
    }
    if (state === "detected" || state === "skipped") {
      if (models.summary === null) return line(t("detail.noSummaryModel"));
      return line(
        t(state === "detected" ? "detail.next.summarize" : "detail.next.resummarize", {
          model: models.summary,
        }),
      );
    }
    if (state === "summarizing") return line(t("detail.next.summarizing"));
    if (state === "proposed") {
      return line(
        models.draft === null
          ? t("detail.noDraftModel")
          : t("detail.next.draft", { model: models.draft }),
      );
    }
    if (state === "drafting") {
      return line(
        create ? t("detail.next.drafting") : t("detail.next.draftingImprove", { skill: skillName }),
      );
    }
    if (state === "ready") {
      return line(create ? t("detail.next.save") : t("detail.next.improve", { skill: skillName }));
    }
    if (state === "dismissed") return line(t("detail.next.restore"));
    if (item.write === null) return line(t("written.unknown"));
    return line(
      `${t("written.path", { path: item.write.path })} · ${
        item.write.discovered
          ? t("written.discovered")
          : item.write.checking
            ? t("written.checking")
            : t("written.missing")
      }`,
    );
  };

  /** 规则匹配到的步骤，原来的写法，按顺序列出。 */
  const steps = (): ReactNode =>
    item.steps.length === 0 ? null : (
      <section className={styles.block} aria-label={t("detail.steps")}>
        <h3 className={styles.label}>{t("detail.steps")}</h3>
        <ol className={styles.sequence}>
          {keyed(item.steps).map(({ key, text }) => (
            <li key={key}>
              <code>{text}</code>
            </li>
          ))}
        </ol>
      </section>
    );

  /** 失败时模型或 Host 给出的原始说明。 */
  const failureDetail = (stage: "summary" | "draft"): ReactNode =>
    item.state === "failed" && item.failure?.stage === stage && item.failure.message !== "" ? (
      <section className={styles.block} aria-label={t("detail.failureDetail")}>
        <h3 className={styles.label}>{t("detail.failureDetail")}</h3>
        <p className={styles.failureDetail}>{item.failure.message}</p>
      </section>
    ) : null;

  /** 摘要里的方案：发现了什么、Skill 做什么、何时使用、将要新建或改进哪个 Skill 与提纲、风险、验证方式。 */
  const plan = (): ReactNode => (
    <>
      {item.found !== null &&
        block(t("detail.found"), <p className={styles.prose}>{item.found}</p>)}
      {item.description !== null &&
        block(t("detail.description"), <p className={styles.prose}>{item.description}</p>)}
      {item.trigger !== null &&
        block(t("detail.trigger"), <p className={styles.prose}>{item.trigger}</p>)}
      {block(
        t("detail.plan"),
        <>
          <p className={styles.prose}>
            {t(create ? "detail.plan.create" : "detail.plan.improve")}{" "}
            <code className={styles.code}>{skillName}</code>
          </p>
          <ol className={styles.outline}>
            {keyed(item.outline).map(({ key, text }) => (
              <li key={key}>{text}</li>
            ))}
          </ol>
        </>,
      )}
      {item.risks.length > 0 &&
        block(
          t("detail.risks"),
          <ul className={styles.outline}>
            {keyed(item.risks).map(({ key, text }) => (
              <li key={key}>{text}</li>
            ))}
          </ul>,
        )}
      {item.verification !== null &&
        block(t("detail.verification"), <p className={styles.prose}>{item.verification}</p>)}
    </>
  );

  const summaryTab = (): ReactNode => {
    if (item.state === "summarizing") {
      return (
        <>
          <Working stage="summary" progress={item.progress} model={models.summary} t={t} />
          {steps()}
        </>
      );
    }
    if (proposal) {
      return (
        <>
          {failureDetail("draft")}
          {plan()}
          {awaitingConsent && models.draft !== null && (
            <p className={styles.note}>{t("detail.consent", { model: models.draft })}</p>
          )}
        </>
      );
    }
    if (item.decision === "skip") {
      return (
        <>
          <p className={styles.prose}>{t("detail.skipped")}</p>
          {item.reason !== null &&
            block(t("detail.reason"), <p className={styles.prose}>{item.reason}</p>)}
          {steps()}
        </>
      );
    }
    return (
      <>
        {failureDetail("summary")}
        <p className={styles.prose}>{t("detail.local")}</p>
        {item.state !== "written" && item.state !== "dismissed" && models.summary !== null && (
          <p className={styles.note}>
            {t(item.sessions.length === 1 ? "detail.summaryNote.one" : "detail.summaryNote.other", {
              count: item.sessions.length,
              model: models.summary,
            })}
          </p>
        )}
        {steps()}
      </>
    );
  };

  const evidence = (): ReactNode =>
    value?.episodes.map((episode) => (
      <Episode
        key={episode.episodeId}
        episode={episode}
        now={now}
        openSession={openSession}
        t={t}
      />
    ));

  const cautions = (): ReactNode =>
    item.cautions.length === 0 ? null : (
      <LimitNotice
        text={t("detail.cautions", {
          list: item.cautions
            .map((caution) => {
              const key = `caution.${caution}`;
              return isCaution(key) ? t(key) : caution;
            })
            .join(t("list.separator")),
        })}
      />
    );

  const skill = (): ReactNode => {
    if (item.state === "drafting") {
      return <Working stage="draft" progress={item.progress} model={models.draft} t={t} />;
    }
    if (create && draft !== null) {
      return (
        <>
          {cautions()}
          {editing ? (
            <>
              <FieldsEditor fields={draft} onChange={setFields} t={t} />
              {invalid && (
                <p className={styles.failure} role="alert">
                  {t("skill.invalid")}
                </p>
              )}
            </>
          ) : (
            <>
              <dl className={styles.fields}>
                <dt>{t("skill.name")}</dt>
                <dd>
                  <code className={styles.code}>{draft.name}</code>
                </dd>
                <dt>{t("skill.description")}</dt>
                <dd>{draft.description}</dd>
                {draft.whenToUse !== "" && (
                  <>
                    <dt>{t("skill.whenToUse")}</dt>
                    <dd>{draft.whenToUse}</dd>
                  </>
                )}
              </dl>
              <div className={styles.document}>
                <MarkdownText
                  text={withoutTitle(draft.body, [titleOf(item), draft.name])}
                  labels={labels.markdown}
                />
              </div>
            </>
          )}
        </>
      );
    }
    if (improve && shownSection !== null) {
      return (
        <>
          {notWritable !== null && <LimitNotice text={notWritable} />}
          {cautions()}
          <h3 className={styles.label}>{t("skill.section", { skill: skillName })}</h3>
          {editing ? (
            <textarea
              className={`${styles.input} ${styles.mono}`}
              aria-label={t("skill.section", { skill: skillName })}
              rows={12}
              value={shownSection}
              onChange={(event) => setSection(event.target.value)}
            />
          ) : (
            <div className={styles.document}>
              <MarkdownText
                text={withoutTitle(shownSection, [titleOf(item)])}
                labels={labels.markdown}
              />
            </div>
          )}
        </>
      );
    }
    return null;
  };

  const changes = (): ReactNode => {
    if (preview === null || preview.status === "loading") {
      return (
        <p className={styles.note} role="status">
          {t("changes.loading")}
        </p>
      );
    }
    if (preview.status === "error") {
      return <ErrorNotice text={t("changes.error", { error: preview.error })} />;
    }
    const file = preview.value;
    return (
      <>
        {file.kind === "create" && file.exists && <LimitNotice text={t("changes.exists")} />}
        <DiffBlock
          diffs={[
            file.kind === "create"
              ? { path: file.path, oldText: null, newText: file.content }
              : { path: file.path ?? file.skill, oldText: file.before, newText: file.after },
          ]}
          labels={labels.diff}
          maxLines={400}
        />
      </>
    );
  };

  /** 底栏右侧的主操作：随阶段从生成摘要、同意生成草稿到保存；失败时是重试。 */
  const primary = (): ReactNode => {
    if (item.state === "summarizing" || item.state === "drafting") {
      const label = stateLabel(t, item);
      return (
        <ActionButton
          variant="primary"
          label={label}
          busyLabel={label}
          busy
          onClick={item.state === "summarizing" ? summarize : generate}
        />
      );
    }
    if (awaitingConsent) {
      return (
        <ActionButton
          variant="primary"
          label={
            draftFailed
              ? t("action.retry")
              : create
                ? t("detail.draft.create")
                : t("detail.draft.improve")
          }
          busyLabel={t("state.drafting")}
          busy={busy === "draft"}
          disabled={busy !== null}
          unavailable={models.draft === null ? t("detail.noDraftModel") : null}
          onClick={generate}
        />
      );
    }
    if (item.state === "ready") {
      const blocked = invalid ? t("skill.invalid") : notWritable;
      if (create) {
        return (
          <SplitButton
            label={t(scope === "project" ? "action.save.project" : "action.save.user")}
            busyLabel={t("action.saving")}
            busy={busy === "save"}
            disabled={busy !== null}
            unavailable={blocked}
            onClick={() => void save()}
            choices={[
              { id: "project", label: t("scope.project") },
              { id: "user", label: t("scope.user") },
            ]}
            selected={scope}
            onChoose={setScope}
            labels={{ group: t("scope.label"), choose: t("scope.choose") }}
          />
        );
      }
      return (
        <ActionButton
          variant="primary"
          label={t("action.improve", { skill: skillName })}
          busyLabel={t("action.saving")}
          busy={busy === "save"}
          disabled={busy !== null}
          unavailable={blocked}
          onClick={() => void save()}
        />
      );
    }
    const failed = item.state === "failed";
    return (
      <ActionButton
        variant={item.decision === "skip" ? "outline" : "primary"}
        label={
          failed
            ? t("action.retry")
            : item.decision === "skip"
              ? t("detail.resummarize")
              : t("detail.summarize")
        }
        busyLabel={t("state.summarizing")}
        busy={busy === "summarize"}
        disabled={busy !== null}
        unavailable={models.summary === null ? t("detail.noSummaryModel") : null}
        onClick={summarize}
      />
    );
  };

  /** 底栏左侧的溢出菜单：忽略类似建议、放弃编辑。 */
  const overflow = (): ReactNode => {
    const entries = [
      { id: "similar", label: t("action.dismissSimilar") },
      ...(edited ? [{ id: "reset", label: t("skill.reset"), danger: true }] : []),
    ];
    return (
      <Menu
        open={more}
        onClose={() => setMore(false)}
        align="start"
        side="top"
        portal
        autoFocus
        items={entries}
        onSelect={(entry) => {
          setMore(false);
          if (entry === "similar") dismiss(true);
          if (entry === "reset") reset();
        }}
        anchor={
          <IconButton
            label={t("action.more")}
            haspopup="menu"
            expanded={more}
            disabled={busy !== null}
            onClick={() => setMore(!more)}
          >
            <IconEllipsisOutlineRegular size={14} />
          </IconButton>
        }
      />
    );
  };

  const footer = (): ReactNode => {
    if (item.state === "written" || item.state === "dismissed") {
      const written = item.state === "written";
      return (
        <>
          <span className={styles.spacer} />
          <ActionButton
            variant="outline"
            label={t(written ? "action.undo" : "action.restore")}
            busyLabel={t(written ? "action.undoing" : "action.restoring")}
            busy={busy === (written ? "undo" : "restore")}
            disabled={busy !== null}
            onClick={written ? undo : restore}
          />
        </>
      );
    }
    return (
      <>
        <ActionButton
          variant="ghost"
          label={t("action.dismiss")}
          busyLabel={t("action.dismissing")}
          busy={busy === "dismiss" || busy === "similar"}
          disabled={busy !== null}
          onClick={() => dismiss(false)}
        />
        {overflow()}
        <span className={styles.spacer} />
        {primary()}
      </>
    );
  };

  /** Skill Tab 尾部的图标按钮：编辑开关与按同一份摘要重新生成。 */
  const tabActions =
    activeTab === "skill" && item.state === "ready" && drafted ? (
      <>
        <IconButton label={t("skill.edit")} pressed={editing} onClick={() => setEditing(!editing)}>
          <IconEditOutlineRegular size={14} />
        </IconButton>
        <IconButton
          label={t("detail.redraft")}
          disabled={busy !== null}
          unavailable={models.draft === null ? t("detail.noDraftModel") : null}
          onClick={generate}
        >
          <IconRefreshOutlineRegular size={14} />
        </IconButton>
      </>
    ) : undefined;

  const title = titleOf(item);
  const lifecycle = lifecycleOf(t, item);
  const next = nextStep();
  const model =
    value?.draftCall != null
      ? t("detail.draftedBy", { model: value.draftCall.model })
      : value?.summary != null
        ? t("detail.summarizedBy", { model: value.summary.model })
        : null;
  const metadata = [
    counted(t, "meta.sessions", item.occurrences),
    ...(item.merged > 0 ? [t("meta.merged", { count: item.merged })] : []),
    ...(model === null ? [] : [model]),
  ];
  const siblings = value?.siblings ?? [];

  return (
    <section
      className={styles.detail}
      data-size={size}
      data-state={item.state}
      aria-label={title}
      aria-busy={busy !== null || undefined}
    >
      <header className={styles.header}>
        <div className={styles.titleRow}>
          {onBack !== undefined && (
            <span className={styles.back}>
              <IconButton label={t("detail.back")} onClick={onBack}>
                <IconChevronLeftOutlineRegular size={14} />
              </IconButton>
            </span>
          )}
          <div className={styles.heading}>
            <h2 className={styles.title}>{title}</h2>
            <Tag tone="outline" className={styles.kind}>
              {t(`kind.${item.kind}`)}
            </Tag>
          </div>
          <Pager
            entries={siblings.map((sibling) => {
              const shown = siblingStatus(t, sibling.state, sibling.id === id ? item : null);
              return { id: sibling.id, title: sibling.title, dot: shown.dot, word: shown.word };
            })}
            current={id}
            onSelect={onSelect}
            labels={{
              group: t("detail.siblings"),
              previous: t("pager.previous"),
              next: t("pager.next"),
              position: (index, total) => t("pager.position", { index, total }),
            }}
          />
        </div>
        <p className={styles.meta}>
          {metadata.map((entry) => (
            <span key={entry} className={styles.metaItem}>
              {entry}
            </span>
          ))}
          <time className={styles.metaItem} title={absolute(item.updatedAt)}>
            {ago(t, item.updatedAt, now)}
          </time>
        </p>
        <div className={styles.steps}>
          <Steps
            label={t("step.label")}
            closed={lifecycle.closed}
            steps={lifecycle.steps}
            next={next.text}
            failed={next.failed}
          />
        </div>
      </header>
      {value !== null && (
        <DetailTabs
          size={size}
          items={tabs}
          value={activeTab}
          onChange={setChosenTab}
          label={t("detail.tabs")}
          idBase={tabsId}
          actions={tabActions}
        />
      )}
      <div
        className={styles.body}
        {...(value === null
          ? { "aria-busy": detail.status === "loading" || undefined }
          : {
              role: "tabpanel",
              id: `${tabsId}-panel`,
              "aria-labelledby": `${tabsId}-${activeTab}`,
              tabIndex: 0,
            })}
      >
        {detail.status === "loading" && (
          <div className={styles.loading} role="status" aria-label={t("detail.loading")}>
            <Skeleton width="min(320px, 80%)" />
            <Skeleton width="min(440px, 95%)" />
            <Skeleton width="min(260px, 60%)" />
          </div>
        )}
        {detail.status === "error" && (
          <ErrorNotice text={t("detail.error", { error: detail.error })} />
        )}
        {value !== null && (
          <div className={styles.stack} data-tab={activeTab}>
            {activeTab === "summary" && summaryTab()}
            {activeTab === "evidence" && evidence()}
            {activeTab === "skill" && skill()}
            {activeTab === "changes" && changes()}
          </div>
        )}
      </div>
      <footer className={styles.footer}>
        {error !== null && (
          <p className={styles.actionError} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>{footer()}</div>
      </footer>
    </section>
  );
}

/** 分页器菜单里一个 idea 的状态点与状态词；当前这个用完整的卡片状态，其余只有状态。 */
function siblingStatus(
  t: ScoutTranslate,
  state: ItemView["state"],
  current: ItemView | null,
): { readonly dot: StateDotState; readonly word: string } {
  const status = itemStatus(t, current ?? { state, failure: null });
  return { dot: status.dot, word: status.word };
}
