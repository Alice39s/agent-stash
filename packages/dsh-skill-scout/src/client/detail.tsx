/**
 * 一条建议的详情：证据、Skill 预览与编辑、文件改动，以及保存、忽略、撤销。
 * 证据与草稿从 Host 读取；建议的状态跟随收件箱刷新，状态或更新时间变化时重新读取详情。
 */
import {
  Button,
  DiffBlock,
  IconCheckOutlineRegular,
  IconCloseOutlineRegular,
  MarkdownText,
  SegmentedControl,
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
import { ago, sessionCount, shortPath, titleOf } from "./format.ts";
import type { ScoutKey, ScoutTranslate } from "./locale.ts";
import type { InboxStore, Notice } from "./store.ts";

type Tab = "evidence" | "skill" | "changes";
type Busy = "review" | "save" | "dismiss" | "undo" | "restore" | null;

export interface DetailProps {
  readonly id: string;
  readonly item: ItemView;
  readonly inbox: InboxStore;
  /** 读取详情；`version` 标识建议的状态，变化时重新读取。 */
  readonly loadDetail: (id: string, version: string, signal: AbortSignal) => Promise<DetailView>;
  readonly modelName: string | null;
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

/** 一条建议的详情对话框。 */
export function Detail({
  id,
  item,
  inbox,
  loadDetail,
  modelName,
  defaultScope,
  openSession,
  t,
  onClose,
}: DetailProps): ReactNode {
  const tabsId = useId();
  const labels = useLabels(t);
  const [detail, setDetail] = useState<Loaded<DetailView>>({ status: "loading" });
  const [tab, setTab] = useState<Tab>("evidence");
  const [scope, setScope] = useState(defaultScope);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<SkillFields | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [preview, setPreview] = useState<Loaded<PreviewView> | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  // 建议的状态或更新时间变化时重新读取详情：复核完成后才有结论与草稿。
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
  const reviewed = create || improve;
  const draft = fields ?? value?.draft ?? null;
  const shownSection = section ?? value?.section ?? null;
  const parsed = draft === null ? null : v.safeParse(SkillFieldsSchema, draft);
  const invalid = create && parsed !== null && !parsed.success;

  // 「改动」页与保存前都需要 Host 渲染的最终文件；编辑后稍等再请求。
  const wantPreview = reviewed && item.state === "ready" && value !== null;
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
    { value: "evidence", label: t("detail.tab.evidence") },
    ...(reviewed
      ? [
          { value: "skill" as const, label: t("detail.tab.skill") },
          ...(item.state === "ready"
            ? [{ value: "changes" as const, label: t("detail.tab.changes") }]
            : []),
        ]
      : []),
  ];
  const activeTab = tabs.some((entry) => entry.value === tab) ? tab : "evidence";

  const subtitle = [
    t(`kind.${item.kind}`),
    sessionCount(t, item.occurrences),
    value?.review === null || value === null
      ? t(`state.${item.state}`)
      : t("detail.reviewedBy", { model: value.review.model }),
  ].join(" · ");

  const reviewPanel = (): ReactNode => {
    if (reviewed || item.state === "dismissed" || item.state === "written") return null;
    if (item.state === "skipped") {
      return <p className={styles.callout}>{t("detail.skipped")}</p>;
    }
    if (item.state === "reviewing") {
      return (
        <p className={styles.callout} role="status">
          {t("detail.reviewing", { model: modelName ?? "" })}
        </p>
      );
    }
    return (
      <div className={styles.callout}>
        {item.failure !== null && (
          <p className={styles.failure} role="alert">
            {t("detail.failed", { kind: t(`failure.${item.failure.kind}`) })}
            <span className={styles.failureDetail}>{item.failure.message}</span>
          </p>
        )}
        <p>{t("detail.local")}</p>
        <p className={styles.note}>
          {modelName === null
            ? t("detail.noModel")
            : t("detail.reviewNote", { count: item.sessions.length, model: modelName })}
        </p>
        <div>
          <Button
            size="sm"
            variant="outline"
            data-autofocus=""
            disabled={modelName === null || busy !== null}
            onClick={() => void run("review", { action: "analyze", id })}
          >
            {item.failure === null ? t("detail.review") : t("detail.retry")}
          </Button>
        </div>
      </div>
    );
  };

  const evidence = (): ReactNode => (
    <div className={styles.stack}>
      {reviewPanel()}
      {item.reason !== null && (
        <section className={styles.why}>
          <h3 className={styles.heading}>{t("detail.why")}</h3>
          <p>{item.reason}</p>
        </section>
      )}
      {item.cautions.length > 0 && (
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
      )}
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

  const skill = (): ReactNode => {
    if (create && draft !== null) {
      return (
        <div className={styles.stack}>
          <div className={styles.toolbar}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(!editing)}
              disabled={item.state !== "ready"}
            >
              {editing ? t("skill.preview") : t("skill.edit")}
            </Button>
            {fields !== null && (
              <Button size="sm" variant="ghost" onClick={() => setFields(null)}>
                {t("skill.reset")}
              </Button>
            )}
          </div>
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
          <div className={styles.toolbar}>
            <span className={styles.heading}>{t("skill.section", { skill: skillName })}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(!editing)}
              disabled={item.state !== "ready"}
            >
              {editing ? t("skill.preview") : t("skill.edit")}
            </Button>
          </div>
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
    const writable = !(
      preview?.status === "ready" &&
      preview.value.kind === "improve" &&
      !preview.value.writable
    );
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
        {item.state === "ready" && create && (
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
        {item.state === "ready" && (
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
        )}
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
          {tabs.length > 1 && (
            <div className={styles.tabs}>
              <SegmentedControl
                id={tabsId}
                label={t("detail.tabs")}
                value={activeTab}
                options={tabs}
                onChange={setTab}
              />
            </div>
          )}
          <div
            className={styles.panel}
            role={tabs.length > 1 ? "tabpanel" : undefined}
            aria-labelledby={tabs.length > 1 ? `${tabsId}-${activeTab}` : undefined}
          >
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
