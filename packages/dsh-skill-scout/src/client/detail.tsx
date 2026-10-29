/**
 * 一条建议的详情：摘要、证据、Skill 预览与编辑、文件改动，以及生成摘要、同意生成草稿、保存、忽略、撤销。
 * 证据、摘要与草稿从 Host 读取；建议的状态跟随收件箱刷新，状态或更新时间变化时重新读取详情。
 */
import {
  Button,
  DiffBlock,
  IconCheckOutlineRegular,
  IconCloseOutlineRegular,
  MarkdownText,
  SegmentedControl,
  TextShimmer,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import * as v from "valibot";
import {
  SkillFieldsSchema,
  type Action,
  type DetailView,
  type EvidenceEpisode,
  type ItemView,
  type PreviewView,
  type SkillFields,
} from "../shared.ts";
import { Dialog } from "./dialog.tsx";
import styles from "./detail.module.css";
import { ago, sessionCount, shortPath, stateLabel, titleOf } from "./format.ts";
import type { ScoutKey, ScoutTranslate } from "./locale.ts";
import type { InboxStore, Notice } from "./store.ts";

type Tab = "summary" | "evidence" | "skill" | "changes";
type Busy = "summarize" | "draft" | "save" | "dismiss" | "undo" | "restore" | null;

/** 两个阶段此刻使用的模型名称；没有可用模型时为 null。 */
export interface StageModels {
  readonly summary: string | null;
  readonly draft: string | null;
}

export interface DetailProps {
  readonly id: string;
  readonly item: ItemView;
  readonly inbox: InboxStore;
  /** 读取详情；`version` 标识建议的状态，变化时重新读取。 */
  readonly loadDetail: (id: string, version: string, signal: AbortSignal) => Promise<DetailView>;
  readonly models: StageModels;
  readonly defaultScope: "project" | "user";
  readonly openSession: ((sessionId: string) => void) | null;
  readonly t: ScoutTranslate;
  readonly onClose: () => void;
}

type Loaded<T> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: T }
  | { readonly status: "error"; readonly error: string };

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
        expand: (count: number) => t("diff.expand", { count }),
        expandAria: (count: number) => t("diff.expand", { count }),
      },
    };
  }, [t]);
}

interface EvidenceProps {
  readonly episode: EvidenceEpisode;
  readonly now: number;
  readonly openSession: ((sessionId: string) => void) | null;
  readonly t: ScoutTranslate;
}

const ROLE_KEYS: Readonly<Record<NonNullable<EvidenceEpisode["ops"][number]["role"]>, ScoutKey>> = {
  verify: "role.verify",
  failure: "role.failure",
  fix: "role.fix",
  recovered: "role.recovered",
};

function Episode({ episode, now, openSession, t }: EvidenceProps): ReactNode {
  const outcome = `outcome.${episode.outcome}`;
  return (
    <section className={styles.episode} aria-label={episode.goal}>
      <div className={styles.episodeHead}>
        <span className={styles.ref}>{episode.ref}</span>
        <div className={styles.episodeText}>
          <p className={styles.goal}>{episode.goal}</p>
          <p className={styles.meta}>
            <span data-outcome={episode.outcome}>
              {isKey(outcome) ? t(outcome) : episode.outcome}
            </span>
            <span>{ago(t, episode.at, now)}</span>
            {episode.cwd !== null && <span className={styles.path}>{shortPath(episode.cwd)}</span>}
          </p>
        </div>
        {openSession !== null && (
          <Button size="sm" variant="ghost" onClick={() => openSession(episode.sessionId)}>
            {t("detail.openSession")}
          </Button>
        )}
      </div>
      <ol className={styles.ops} aria-label={t("evidence.list", { ref: episode.ref })}>
        {episode.ops.map((op) => (
          <li key={op.ref} className={styles.op} data-ok={op.ok} data-cited={op.cited || undefined}>
            <span className={styles.opGlyph} aria-hidden="true">
              {op.ok ? (
                <IconCheckOutlineRegular size={12} />
              ) : (
                <IconCloseOutlineRegular size={12} />
              )}
            </span>
            <span className={styles.opBody}>
              <code className={styles.opLabel} data-kind={op.kind}>
                {op.label}
              </code>
              <span className={styles.opTags}>
                {op.role !== null && <span className={styles.tag}>{t(ROLE_KEYS[op.role])}</span>}
                {op.cited && (
                  <span className={styles.tag} data-cited="">
                    {t("role.cited")}
                  </span>
                )}
                {op.exit !== null && op.exit !== 0 && (
                  <span className={styles.tag}>{t("evidence.exit", { code: op.exit })}</span>
                )}
              </span>
              {op.error !== null && <span className={styles.opError}>{op.error}</span>}
            </span>
            <span className={styles.opRef}>{op.ref}</span>
          </li>
        ))}
      </ol>
      {episode.reads > 0 && (
        <p className={styles.note}>
          {t(episode.reads === 1 ? "evidence.reads.one" : "evidence.reads.other", {
            count: episode.reads,
          })}
        </p>
      )}
      {keyed(episode.steering).map(({ key, text }) => (
        <p key={key} className={styles.note}>
          {t("evidence.steering")}: {text}
        </p>
      ))}
      {episode.followup !== null && (
        <p className={styles.note}>
          {t("evidence.followup")}: {episode.followup}
        </p>
      )}
    </section>
  );
}

const KEYS = new Set<string>([
  "outcome.verified",
  "outcome.succeeded",
  "outcome.unverified",
  "outcome.disputed",
  "outcome.failed",
  "outcome.aborted",
]);

function isKey(key: string): key is ScoutKey {
  return KEYS.has(key);
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
      <span className={styles.fieldLabel}>{t(`skill.${key}`)}</span>
      {rows === 1 ? (
        <input
          id={`${id}-${key}`}
          className={styles.input}
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

/** 摘要占位条的宽度：几行短文本。 */
const SUMMARY_BARS = ["88%", "72%", "46%"] as const;
/** 草稿占位条的宽度，按 SKILL.md 的排版：标题、描述，空一行，一节标题与几行步骤；空串是段间空行。 */
const DRAFT_BARS = ["36%", "94%", "82%", "", "22%", "90%", "74%", "84%", "58%"] as const;
/** 相邻占位条的起伏错开的时间，连起来是一道自上而下的波。 */
const BAR_STAGGER = 70;

/** 模型写作时的占位：按最终排版画出的几条横条，依次快速明暗起伏；减少动态效果时静止。 */
function Skeleton({ bars }: { readonly bars: readonly string[] }): ReactNode {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      {keyed(bars).map(({ key, text: width }, index) =>
        width === "" ? (
          <span key={key} className={styles.skeletonGap} />
        ) : (
          <span
            key={key}
            className={styles.skeletonBar}
            style={{ width, animationDelay: `${String(index * BAR_STAGGER)}ms` }}
          />
        ),
      )}
    </div>
  );
}

/** 模型正在处理时的一行状态与占位。 */
function Working({
  label,
  bars,
}: {
  readonly label: string;
  readonly bars: readonly string[];
}): ReactNode {
  return (
    <div className={styles.working}>
      <p className={styles.workingLabel} role="status">
        <TextShimmer active>{label}</TextShimmer>
      </p>
      <Skeleton bars={bars} />
    </div>
  );
}

/** 一条建议的详情对话框。 */
export function Detail({
  id,
  item,
  inbox,
  loadDetail,
  models,
  defaultScope,
  openSession,
  t,
  onClose,
}: DetailProps): ReactNode {
  const tabsId = useId();
  const labels = useLabels(t);
  const [detail, setDetail] = useState<Loaded<DetailView>>({ status: "loading" });
  /** 用户选中的页签；为 null 时跟随状态：草稿生成中与可以保存时看 Skill，其余看摘要。 */
  const [chosenTab, setChosenTab] = useState<Tab | null>(null);
  const [scope, setScope] = useState(defaultScope);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<SkillFields | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [preview, setPreview] = useState<Loaded<PreviewView> | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  // 建议的状态或更新时间变化时重新读取详情：摘要与草稿都在模型回复之后才有。
  const version = `${item.state}:${String(item.updatedAt)}`;
  useEffect(() => {
    const controller = new AbortController();
    loadDetail(id, version, controller.signal).then(
      (value) => {
        if (controller.signal.aborted) return;
        setDetail({ status: "ready", value });
      },
      (reason: unknown) => {
        if (controller.signal.aborted) return;
        setDetail({ status: "error", error: message(reason) });
      },
    );
    return () => controller.abort();
  }, [id, version, loadDetail]);

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
            if (!stale) setPreview({ status: "error", error: message(reason) });
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
      setError(t("error.request", { error: message(reason) }));
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
  const dismiss = async (similar: boolean): Promise<void> => {
    const ok = await run(
      "dismiss",
      { action: "dismiss", id, similar },
      {
        key: similar ? "notice.dismissedSimilar" : "notice.dismissed",
        params: {},
        undo: { action: "restore", id },
      },
    );
    if (ok) onClose();
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
      },
    );
    if (ok) {
      setEditing(false);
      setPreview(null);
    }
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: "summary", label: t("detail.tab.summary") },
    ...(item.state === "drafting" || drafted
      ? [{ value: "skill" as const, label: t("detail.tab.skill") }]
      : []),
    ...(item.state === "ready" && drafted
      ? [{ value: "changes" as const, label: t("detail.tab.changes") }]
      : []),
    { value: "evidence", label: t("detail.tab.evidence") },
  ];
  const autoTab: Tab = item.state === "drafting" || item.state === "ready" ? "skill" : "summary";
  const wanted = chosenTab ?? autoTab;
  const activeTab = tabs.some((entry) => entry.value === wanted) ? wanted : "summary";

  const subtitle = [
    t(`kind.${item.kind}`),
    sessionCount(t, item.occurrences),
    value?.draftCall != null
      ? t("detail.draftedBy", { model: value.draftCall.model })
      : value?.summary != null
        ? t("detail.summarizedBy", { model: value.summary.model })
        : stateLabel(t, item),
  ].join(" · ");

  const failure = (stage: "summary" | "draft"): ReactNode =>
    item.state === "failed" && item.failure?.stage === stage ? (
      <p className={styles.failure} role="alert">
        {t(stage === "summary" ? "detail.failed.summary" : "detail.failed.draft", {
          kind: t(`failure.${item.failure.kind}`),
        })}
        <span className={styles.failureDetail}>{item.failure.message}</span>
      </p>
    ) : null;

  /** 规则匹配到的步骤，原来的写法。 */
  const steps = (): ReactNode =>
    item.steps.length === 0 ? null : (
      <section className={styles.block}>
        <h3 className={styles.heading}>{t("detail.steps")}</h3>
        <ol className={styles.steps}>
          {keyed(item.steps).map(({ key, text }) => (
            <li key={key}>
              <code>{text}</code>
            </li>
          ))}
        </ol>
      </section>
    );

  /** 摘要里的方案：发现了什么、Skill 做什么、何时使用、将要新建或改进哪个 Skill 与提纲、风险、验证方式。 */
  const plan = (): ReactNode => (
    <dl className={styles.summary}>
      <dt>{t("detail.found")}</dt>
      <dd>{item.found}</dd>
      <dt>{t("detail.description")}</dt>
      <dd>{item.description}</dd>
      {item.trigger !== null && (
        <>
          <dt>{t("detail.trigger")}</dt>
          <dd>{item.trigger}</dd>
        </>
      )}
      <dt>{t("detail.plan")}</dt>
      <dd>
        <p className={styles.planTarget}>
          <span>{t(create ? "detail.plan.create" : "detail.plan.improve")}</span>
          <code>{skillName}</code>
        </p>
        <ol className={styles.outline}>
          {keyed(item.outline).map(({ key, text }) => (
            <li key={key}>{text}</li>
          ))}
        </ol>
      </dd>
      {item.risks.length > 0 && (
        <>
          <dt>{t("detail.risks")}</dt>
          <dd>
            <ul className={styles.risks}>
              {keyed(item.risks).map(({ key, text }) => (
                <li key={key}>{text}</li>
              ))}
            </ul>
          </dd>
        </>
      )}
      {item.verification !== null && (
        <>
          <dt>{t("detail.verification")}</dt>
          <dd>{item.verification}</dd>
        </>
      )}
    </dl>
  );

  const summaryTab = (): ReactNode => {
    if (item.state === "summarizing") {
      return (
        <div className={styles.stack}>
          <Working
            label={t("detail.summarizing", { model: models.summary ?? "" })}
            bars={SUMMARY_BARS}
          />
          {steps()}
        </div>
      );
    }
    if (proposal) {
      return (
        <div className={styles.stack}>
          {plan()}
          {awaitingConsent && (
            <div className={styles.callout}>
              {failure("draft")}
              <p className={styles.note}>
                {models.draft === null
                  ? t("detail.noDraftModel")
                  : t("detail.consent", { model: models.draft })}
              </p>
            </div>
          )}
        </div>
      );
    }
    if (item.decision === "skip") {
      return (
        <div className={styles.stack}>
          <div className={styles.callout}>
            <p>{t("detail.skipped")}</p>
            {item.reason !== null && <p className={styles.note}>{item.reason}</p>}
          </div>
          {steps()}
        </div>
      );
    }
    return (
      <div className={styles.stack}>
        <div className={styles.callout}>
          {failure("summary")}
          <p>{t("detail.local")}</p>
          {item.state !== "written" && item.state !== "dismissed" && (
            <p className={styles.note}>
              {models.summary === null
                ? t("detail.noSummaryModel")
                : t("detail.summaryNote", { count: item.sessions.length, model: models.summary })}
            </p>
          )}
        </div>
        {steps()}
      </div>
    );
  };

  const evidence = (): ReactNode => (
    <div className={styles.stack}>
      {value?.episodes.map((episode) => (
        <Episode
          key={episode.episodeId}
          episode={episode}
          now={now}
          openSession={openSession}
          t={t}
        />
      ))}
    </div>
  );

  const cautions = (): ReactNode =>
    item.cautions.length === 0 ? null : (
      <p className={styles.caution} role="note">
        {t("detail.cautions", {
          list: item.cautions
            .map((caution) => {
              const key = `caution.${caution}`;
              return isCaution(key) ? t(key) : caution;
            })
            .join(", "),
        })}
      </p>
    );

  /** 草稿页签的工具栏：编辑、还原，以及按同一份摘要重新生成。 */
  const toolbar = (lead: ReactNode): ReactNode => (
    <div className={styles.toolbar}>
      {lead}
      <span className={styles.toolbarActions}>
        {item.state === "ready" && (
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={generate}>
            {t("detail.redraft")}
          </Button>
        )}
        {(create ? fields : section) !== null && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (create ? setFields(null) : setSection(null))}
          >
            {t("skill.reset")}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(!editing)}
          disabled={item.state !== "ready"}
        >
          {editing ? t("skill.preview") : t("skill.edit")}
        </Button>
      </span>
    </div>
  );

  const skill = (): ReactNode => {
    if (item.state === "drafting") {
      return (
        <Working label={t("detail.drafting", { model: models.draft ?? "" })} bars={DRAFT_BARS} />
      );
    }
    if (create && draft !== null) {
      return (
        <div className={styles.stack}>
          {cautions()}
          {toolbar(<span />)}
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
              <dl className={styles.facts}>
                <dt>{t("skill.name")}</dt>
                <dd>
                  <code>{draft.name}</code>
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
              <div className={styles.markdown}>
                <MarkdownText text={draft.body} labels={labels.markdown} />
              </div>
            </>
          )}
        </div>
      );
    }
    if (improve && shownSection !== null) {
      const notWritable =
        preview?.status === "ready" && preview.value.kind === "improve" && !preview.value.writable;
      return (
        <div className={styles.stack}>
          {notWritable && (
            <p className={styles.caution}>{t("skill.notWritable", { skill: skillName })}</p>
          )}
          {cautions()}
          {toolbar(
            <span className={styles.heading}>{t("skill.section", { skill: skillName })}</span>,
          )}
          {editing ? (
            <textarea
              className={`${styles.input} ${styles.mono}`}
              aria-label={t("skill.section", { skill: skillName })}
              rows={12}
              value={shownSection}
              onChange={(event) => setSection(event.target.value)}
            />
          ) : (
            <div className={styles.markdown}>
              <MarkdownText text={shownSection} labels={labels.markdown} />
            </div>
          )}
        </div>
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
      return (
        <p className={styles.failure} role="alert">
          {t("changes.error", { error: preview.error })}
        </p>
      );
    }
    const file = preview.value;
    return (
      <div className={styles.stack}>
        {file.kind === "create" && file.exists && (
          <p className={styles.caution}>{t("changes.exists")}</p>
        )}
        <DiffBlock
          diffs={[
            file.kind === "create"
              ? { path: file.path, oldText: null, newText: file.content }
              : { path: file.path ?? file.skill, oldText: file.before, newText: file.after },
          ]}
          labels={labels.diff}
          maxLines={400}
        />
      </div>
    );
  };

  /** 右侧的主操作：随阶段从生成摘要、同意生成草稿到保存。 */
  const primary = (): ReactNode => {
    if (item.state === "summarizing" || item.state === "drafting") {
      return (
        <Button size="sm" variant="primary" disabled>
          {stateLabel(t, item)}
        </Button>
      );
    }
    if (awaitingConsent) {
      return (
        <Button
          size="sm"
          variant="primary"
          data-autofocus=""
          disabled={models.draft === null || busy !== null}
          onClick={generate}
        >
          {draftFailed
            ? t("detail.redraft")
            : create
              ? t("detail.draft.create")
              : t("detail.draft.improve")}
        </Button>
      );
    }
    if (item.state === "ready") {
      const writable = !(
        preview?.status === "ready" &&
        preview.value.kind === "improve" &&
        !preview.value.writable
      );
      return (
        <>
          {create && (
            <SegmentedControl
              id={`${tabsId}-scope`}
              label={t("scope.label")}
              value={scope}
              disabled={busy !== null}
              options={[
                { value: "project", label: t("scope.project") },
                { value: "user", label: t("scope.user") },
              ]}
              onChange={setScope}
            />
          )}
          <Button
            size="sm"
            variant="primary"
            data-autofocus=""
            disabled={busy !== null || invalid || !writable}
            onClick={() => void save()}
          >
            {busy === "save"
              ? t("action.saving")
              : create
                ? t("action.save")
                : t("action.improve", { skill: skillName })}
          </Button>
        </>
      );
    }
    const again = item.decision === "skip" || item.failure !== null;
    return (
      <Button
        size="sm"
        variant={item.decision === "skip" ? "outline" : "primary"}
        data-autofocus=""
        disabled={models.summary === null || busy !== null}
        onClick={summarize}
      >
        {again ? t("detail.resummarize") : t("detail.summarize")}
      </Button>
    );
  };

  const footer = (): ReactNode => {
    if (item.state === "written" && item.write !== null) {
      return (
        <>
          <p className={styles.written} role="status">
            <span className={styles.writtenPath}>
              {t("written.path", { path: shortPath(item.write.path) })}
            </span>
            <span>
              {item.write.discovered
                ? t("written.discovered")
                : item.write.checking
                  ? t("written.checking")
                  : t("written.missing")}
            </span>
          </p>
          <span className={styles.spacer} />
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              void run(
                "undo",
                { action: "undo", id },
                {
                  key: "notice.undone",
                  params: { skill: item.write?.skill ?? skillName },
                  undo: null,
                },
              )
            }
          >
            {t("action.undo")}
          </Button>
          <Button size="sm" variant="primary" onClick={onClose} data-autofocus="">
            {t("action.done")}
          </Button>
        </>
      );
    }
    if (item.state === "dismissed") {
      return (
        <>
          <span className={styles.spacer} />
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              void run(
                "restore",
                { action: "restore", id },
                { key: "notice.restored", params: {}, undo: null },
              )
            }
          >
            {t("action.restore")}
          </Button>
        </>
      );
    }
    return (
      <>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => void dismiss(false)}
        >
          {t("action.dismiss")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => void dismiss(true)}
        >
          {t("action.dismissSimilar")}
        </Button>
        <span className={styles.spacer} />
        {primary()}
      </>
    );
  };

  return (
    <Dialog
      title={titleOf(item)}
      subtitle={subtitle}
      closeLabel={t("detail.close")}
      busy={busy === "save" || busy === "undo"}
      onClose={onClose}
      footer={
        <>
          {error !== null && (
            <p className={styles.actionError} role="alert">
              {error}
            </p>
          )}
          {footer()}
        </>
      }
    >
      {detail.status === "loading" && (
        <p className={styles.note} role="status">
          {t("detail.loading")}
        </p>
      )}
      {detail.status === "error" && (
        <p className={styles.failure} role="alert">
          {t("detail.error")} <span className={styles.failureDetail}>{detail.error}</span>
        </p>
      )}
      {value !== null && (
        <>
          <div className={styles.tabs}>
            <SegmentedControl
              id={tabsId}
              label={t("detail.tabs")}
              value={activeTab}
              options={tabs}
              onChange={setChosenTab}
            />
          </div>
          <div className={styles.panel} role="tabpanel" aria-labelledby={`${tabsId}-${activeTab}`}>
            {activeTab === "summary" && summaryTab()}
            {activeTab === "evidence" && evidence()}
            {activeTab === "skill" && skill()}
            {activeTab === "changes" && changes()}
          </div>
        </>
      )}
    </Dialog>
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
