window.__ModuleLoader__.load({
	id: "@agent-stash/dsh-stash-kit",
	factory(require) {
		const exports = {};
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const DEFAULT_CONFIG = {
			lang: void 0,
			message: void 0,
			abortEarly: void 0,
			abortPipeEarly: void 0
		};
		/* @__NO_SIDE_EFFECTS__ */
		function getGlobalConfig(config$1) {
			if (!config$1 && true) return DEFAULT_CONFIG;
			return {
				lang: config$1?.lang ?? void 0,
				message: config$1?.message,
				abortEarly: config$1?.abortEarly ?? void 0,
				abortPipeEarly: config$1?.abortPipeEarly ?? void 0
			};
		}
		/* @__NO_SIDE_EFFECTS__ */
		function _stringify(input) {
			const type = typeof input;
			if (type === "string") return `"${input}"`;
			if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
			if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
			return type;
		}
		function _addIssue(context, label, dataset, config$1, other) {
			const input = other && "input" in other ? other.input : dataset.value;
			const expected = other?.expected ?? context.expects ?? null;
			const received = other?.received ?? /* @__PURE__ */ _stringify(input);
			const issue = {
				kind: context.kind,
				type: context.type,
				input,
				expected,
				received,
				message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
				requirement: context.requirement,
				path: other?.path,
				issues: other?.issues,
				lang: config$1.lang,
				abortEarly: config$1.abortEarly,
				abortPipeEarly: config$1.abortPipeEarly
			};
			const isSchema = context.kind === "schema";
			const message$1 = other?.message ?? context.message ?? (context.reference, issue.lang, void 0) ?? (isSchema ? (issue.lang, void 0) : null) ?? config$1.message ?? (issue.lang, void 0);
			if (message$1 !== void 0) issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
			if (isSchema) dataset.typed = false;
			if (dataset.issues) dataset.issues.push(issue);
			else dataset.issues = [issue];
		}
		/* @__NO_SIDE_EFFECTS__ */
		function _joinExpects(values$1, separator) {
			const list = [...new Set(values$1)];
			if (list.length > 1) return `(${list.join(` ${separator} `)})`;
			return list[0] ?? "never";
		}
		function _standardSchema(schema) {
			schema["~standard"] = {
				version: 1,
				vendor: "valibot",
				validate: (value$1) => schema["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig())
			};
			return schema;
		}
		var ValiError = class extends Error {
			constructor(issues) {
				super(issues[0].message);
				this.name = "ValiError";
				this.issues = issues;
			}
		};
		/* @__NO_SIDE_EFFECTS__ */
		function getFallback(schema, dataset, config$1) {
			return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
		}
		/* @__NO_SIDE_EFFECTS__ */
		function fallback(schema, fallback$1) {
			return _standardSchema({
				...schema,
				fallback: fallback$1,
				"~run"(dataset, config$1) {
					const outputDataset = schema["~run"](dataset, config$1);
					return outputDataset.issues ? {
						typed: true,
						value: /* @__PURE__ */ getFallback(this, outputDataset, config$1)
					} : outputDataset;
				}
			});
		}
		/* @__NO_SIDE_EFFECTS__ */
		function getDefault(schema, dataset, config$1) {
			return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
		}
		/* @__NO_SIDE_EFFECTS__ */
		function boolean(message$1) {
			return _standardSchema({
				kind: "schema",
				type: "boolean",
				reference: boolean,
				expects: "boolean",
				async: false,
				message: message$1,
				"~run"(dataset, config$1) {
					if (typeof dataset.value === "boolean") dataset.typed = true;
					else _addIssue(this, "type", dataset, config$1);
					return dataset;
				}
			});
		}
		/* @__NO_SIDE_EFFECTS__ */
		function object(entries$1, message$1) {
			return _standardSchema({
				kind: "schema",
				type: "object",
				reference: object,
				expects: "Object",
				async: false,
				entries: entries$1,
				message: message$1,
				"~run"(dataset, config$1) {
					const input = dataset.value;
					if (input && typeof input === "object") {
						dataset.typed = true;
						dataset.value = {};
						for (const key in this.entries) {
							const valueSchema = this.entries[key];
							if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
								const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
								const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
								if (valueDataset.issues) {
									const pathItem = {
										type: "object",
										origin: "value",
										input,
										key,
										value: value$1
									};
									for (const issue of valueDataset.issues) {
										if (issue.path) issue.path.unshift(pathItem);
										else issue.path = [pathItem];
										dataset.issues?.push(issue);
									}
									if (!dataset.issues) dataset.issues = valueDataset.issues;
									if (config$1.abortEarly) {
										dataset.typed = false;
										break;
									}
								}
								if (!valueDataset.typed) dataset.typed = false;
								dataset.value[key] = valueDataset.value;
							} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
							else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
								_addIssue(this, "key", dataset, config$1, {
									input: void 0,
									expected: `"${key}"`,
									path: [{
										type: "object",
										origin: "key",
										input,
										key,
										value: input[key]
									}]
								});
								if (config$1.abortEarly) break;
							}
						}
					} else _addIssue(this, "type", dataset, config$1);
					return dataset;
				}
			});
		}
		/* @__NO_SIDE_EFFECTS__ */
		function picklist(options, message$1) {
			return _standardSchema({
				kind: "schema",
				type: "picklist",
				reference: picklist,
				expects: /* @__PURE__ */ _joinExpects(options.map(_stringify), "|"),
				async: false,
				options,
				message: message$1,
				"~run"(dataset, config$1) {
					if (this.options.includes(dataset.value)) dataset.typed = true;
					else _addIssue(this, "type", dataset, config$1);
					return dataset;
				}
			});
		}
		function parse(schema, input, config$1) {
			const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
			if (dataset.issues) throw new ValiError(dataset.issues);
			return dataset.value;
		}
		//#endregion
		//#region dsh/kit/src/appearance.ts
		const MOTIONS = [
			"lively",
			"subtle",
			"off"
		];
		const GHOST_EFFECTS = [
			"wave",
			"fade",
			"none"
		];
		const HIGHLIGHTS = ["glide", "instant"];
		const DENSITIES = ["comfortable", "compact"];
		const DEFAULT_APPEARANCE = {
			glass: true,
			motion: "lively",
			ghost: "wave",
			highlight: "glide",
			density: "comfortable",
			hints: true
		};
		const AppearanceSchema = /* @__PURE__ */ object({
			glass: /* @__PURE__ */ fallback(/* @__PURE__ */ boolean(), DEFAULT_APPEARANCE.glass),
			motion: /* @__PURE__ */ fallback(/* @__PURE__ */ picklist(MOTIONS), DEFAULT_APPEARANCE.motion),
			ghost: /* @__PURE__ */ fallback(/* @__PURE__ */ picklist(GHOST_EFFECTS), DEFAULT_APPEARANCE.ghost),
			highlight: /* @__PURE__ */ fallback(/* @__PURE__ */ picklist(HIGHLIGHTS), DEFAULT_APPEARANCE.highlight),
			density: /* @__PURE__ */ fallback(/* @__PURE__ */ picklist(DENSITIES), DEFAULT_APPEARANCE.density),
			hints: /* @__PURE__ */ fallback(/* @__PURE__ */ boolean(), DEFAULT_APPEARANCE.hints)
		});
		function parseAppearance(value) {
			return parse(AppearanceSchema, typeof value === "object" && value !== null ? value : {});
		}
		function sameAppearance(left, right) {
			return left.glass === right.glass && left.motion === right.motion && left.ghost === right.ghost && left.highlight === right.highlight && left.density === right.density && left.hints === right.hints;
		}
		function changedFields(base, next) {
			return [
				"glass",
				"motion",
				"ghost",
				"highlight",
				"density",
				"hints"
			].filter((key) => base[key] !== next[key]);
		}
		function ghostEffectOf(appearance) {
			return appearance.motion === "off" ? "none" : appearance.ghost;
		}
		//#endregion
		//#region dsh/kit/src/store.ts
		function createAppearanceStore(initial = DEFAULT_APPEARANCE) {
			let current = initial;
			const listeners = /* @__PURE__ */ new Set();
			return {
				get: () => current,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				set: (next) => {
					if (sameAppearance(current, next)) return;
					current = next;
					for (const listener of listeners) listener();
				}
			};
		}
		function useAppearance(store) {
			return (0, react.useSyncExternalStore)(store.subscribe, store.get);
		}
		//#endregion
		//#region dsh/kit/src/styles.ts
		const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
		function kitCss(k) {
			const p = `.${k}`;
			const panel = `${p}-panel`;
			return `
${panel} {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 4px);
  z-index: 100;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 4px;
  border: 0;
  border-radius: var(--dsw-radius-lg);
  isolation: isolate;
  anchor-name: var(--dsh-stash-anchor);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
  box-shadow: var(--dsw-elevation-prominent);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  cursor: default;
  transform-origin: 50% 100%;
}
${panel}[data-preview] {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  z-index: auto;
}
/*
 * 材质单独成层，只模糊背景，面板内容不受 backdrop-filter 影响。底色完全不透明：分组标题的填充色叠在页面底色上；
 * 毛玻璃档在此之上加背景模糊。
 */
${panel}::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background:
    linear-gradient(var(--dsw-alias-menu-group-header-fill), var(--dsw-alias-menu-group-header-fill)),
    var(--dsw-alias-bg-base);
  pointer-events: none;
}
${panel}[data-glass]::before {
  backdrop-filter: var(--dsw-menu-backdrop-filter);
}
${p}-backing {
  display: none;
}
html[data-platform="darwin"] ${p}-backing[data-glass] {
  display: block;
  position: fixed;
  position-anchor: var(--dsh-stash-anchor);
  top: anchor(top);
  left: anchor(left);
  width: anchor-size(width, 0px);
  height: anchor-size(height, 0px);
  z-index: -1;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-base);
  pointer-events: none;
}

/* 进场：灵动档从输入框方向浮起并由模糊变清晰，轻柔档只做短淡入。 */
${panel}[data-motion="lively"][data-state="open"] {
  animation: ${k}-rise 200ms ${EASE_OUT} both;
}
${panel}[data-motion="subtle"][data-state="open"] {
  animation: ${k}-fade 140ms ${EASE_OUT} both;
}
${panel}[data-motion="lively"][data-state="closing"] {
  animation: ${k}-sink 140ms ${EASE_OUT} both;
  pointer-events: none;
}
${panel}[data-motion="subtle"][data-state="closing"] {
  animation: ${k}-fade-out 100ms ${EASE_OUT} both;
  pointer-events: none;
}
/* 刚打开时各行从贴近输入框的一行起依次浮现，错开的延迟写在每行的行内样式上。 */
${panel}[data-motion="lively"][data-fresh] ${p}-item {
  animation: ${k}-row 220ms ${EASE_OUT} both;
}
@keyframes ${k}-rise {
  from { opacity: 0; transform: translateY(8px) scale(0.97); filter: blur(4px); }
}
@keyframes ${k}-sink {
  to { opacity: 0; transform: translateY(6px) scale(0.98); filter: blur(2px); }
}
@keyframes ${k}-fade {
  from { opacity: 0; transform: translateY(3px); }
}
@keyframes ${k}-fade-out {
  to { opacity: 0; }
}
@keyframes ${k}-row {
  from { opacity: 0; transform: translateY(6px); }
}

${p}-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 10px 6px;
  margin-bottom: 2px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}
${p}-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}
${p}-counter {
  flex: none;
  font-size: 11px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}
${p}-list {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
  --dsh-scrollbar-width: 6px;
  --dsh-scrollbar-thumb-border: 2px;
  --dsh-scrollbar-track-margin: 4px;
}
${p}-section {
  box-sizing: border-box;
  min-height: 23px;
  padding: 5px 10px 2px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-list > ${p}-item:not(:nth-child(1 of ${p}-item)) > ${p}-section {
  margin-top: 3px;
}
${p}-row {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: var(--dsw-radius-md);
  cursor: pointer;
}
${panel}[data-density="compact"] ${p}-row {
  min-height: 28px;
  padding: 3px 10px;
}
${panel}[data-density="compact"] ${p}-section {
  min-height: 20px;
  padding-top: 3px;
}
${panel}[data-highlight="instant"] ${p}-row[data-active] {
  background: var(--dsw-alias-interactive-bg-hover);
}
/* 滑动高亮：一块共用的底色跟着高亮行移动，连续按键时从当前位置转向。 */
${p}-glide {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-interactive-bg-hover);
  pointer-events: none;
}
${panel}:not([data-motion="off"]) ${p}-glide[data-placed] {
  transition: transform 160ms ${EASE_OUT};
}
@media (hover: hover) and (pointer: fine) {
  ${panel}[data-hover-tint] ${p}-row:not([data-active]):hover {
    background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 50%, transparent);
  }
}
${p}-icon {
  display: inline-flex;
  flex: none;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-menu-icon);
}
${p}-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
${p}-meta {
  flex: none;
  max-width: 40%;
  padding-left: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}
${p}-footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
  padding: 6px 10px 4px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
${p}-hints {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}
${p}-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
${p}-keys {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
${p}-slash {
  color: var(--dsw-alias-label-caption);
}
${p}-kbd {
  box-sizing: border-box;
  display: inline-grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 10px;
  line-height: 16px;
}

/* 回溯切换草稿：新草稿从翻看的方向滑入，由模糊变清晰。 */
[data-composer-card] [contenteditable="true"][data-${k}-swap="older"] {
  animation: ${k}-swap-older 160ms ${EASE_OUT};
}
[data-composer-card] [contenteditable="true"][data-${k}-swap="newer"] {
  animation: ${k}-swap-newer 160ms ${EASE_OUT};
}
[data-composer-card] [contenteditable="true"][data-${k}-swap="restore"] {
  animation: ${k}-swap-restore 160ms ${EASE_OUT};
}
@keyframes ${k}-swap-older {
  from { opacity: 0.2; transform: translateY(-5px); filter: blur(2px); }
}
@keyframes ${k}-swap-newer {
  from { opacity: 0.2; transform: translateY(5px); filter: blur(2px); }
}
@keyframes ${k}-swap-restore {
  from { opacity: 0.2; filter: blur(2px); }
}

@media (prefers-reduced-motion: reduce) {
  ${panel}:not([data-motion="off"])[data-state="open"] {
    animation: ${k}-fade-out 140ms ease reverse both;
  }
  ${panel}:not([data-motion="off"])[data-state="closing"] {
    animation: ${k}-fade-out 100ms ease both;
  }
  ${panel}[data-motion="lively"][data-fresh] ${p}-item {
    animation: none;
  }
  ${panel} ${p}-glide[data-placed] {
    transition: none;
  }
  [data-composer-card] [contenteditable="true"][data-${k}-swap] {
    animation: none;
  }
}
`;
		}
		//#endregion
		//#region dsh/kit/src/ghost.tsx
		function cssString(text) {
			let body = "";
			for (const char of text) {
				const code = char.codePointAt(0) ?? 0;
				if (char === "\"" || char === "\\") body += `\\${char}`;
				else if (code < 32 || code === 127) body += `\\${code.toString(16)} `;
				else body += char;
			}
			return `"${body}"`;
		}
		function ghostKeyframes(k) {
			return ["a", "b"].map((phase) => `
@keyframes ${k}-ghost-wave-${phase} {
  from { opacity: 0.4; filter: blur(1.5px); mask-position: 100% 0; }
  to { mask-position: 0 0; }
}
@keyframes ${k}-ghost-fade-${phase} {
  from { opacity: 0; filter: blur(2px); }
}`).join("");
		}
		function ghostCss(k, props, effect, phase) {
			const card = `[data-composer-card]:has([${props.attribute}=${cssString(props.marker)}])`;
			const paragraph = "[contenteditable=\"true\"]:not([data-composer-composing]) > p:last-child";
			const motion = effect === "wave" ? `
  mask-image: linear-gradient(90deg, black 0 40%, transparent 60% 100%);
  mask-size: 250% 100%;
  mask-position: 0 0;
  animation: ${k}-ghost-wave-${phase} 280ms ${EASE_OUT} both;` : effect === "fade" ? `
  animation: ${k}-ghost-fade-${phase} 180ms ${EASE_OUT} both;` : "";
			return `${card} ${paragraph}::after {
  content: ${cssString(props.suffix)};
  color: var(--dsw-alias-label-caption);
  pointer-events: none;${motion}
}
@media (prefers-reduced-motion: reduce) {
  ${card} ${paragraph}::after {
    mask-image: none;
    filter: none;
    animation-duration: 1ms;
  }
}`;
		}
		function createGhost(k, store) {
			return function Ghost(props) {
				const appearance = useAppearance(store);
				const [shown, setShown] = (0, react.useState)({
					identity: props.identity,
					phase: "a"
				});
				if (shown.identity !== props.identity) setShown({
					identity: props.identity,
					phase: shown.phase === "a" ? "b" : "a"
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: ghostCss(k, props, ghostEffectOf(appearance), shown.phase) });
			};
		}
		//#endregion
		//#region dsh/kit/src/locales.ts
		const en = {
			summary: "Appearance and motion for the Agent Stash panels",
			unavailable: "This profile does not expose these settings to the page.",
			readOnly: "This profile does not accept changes from the page.",
			saveFailed: "Saving failed. The settings are unchanged.",
			save: "Save",
			saving: "Saving…",
			preview: "Preview",
			replay: "Replay",
			previewTitle: "Prompt history",
			previewDraft: "Summarize the meeting",
			previewGhost: " notes and list the action items.",
			previewRow1: "Analyze the cache hit rate of this project.",
			previewRow2: "Write unit tests for the parser.",
			previewRow3: "Summarize the meeting notes and list the action items.",
			previewHintBrowse: "Browse",
			previewHintFill: "Fill",
			glass: "Frosted glass",
			glassHint: "Blur what is behind the panels. The panel background stays opaque.",
			motion: "Motion",
			motionHint: "Lively panels rise from the composer and rows appear one by one.",
			"motion.lively": "Lively",
			"motion.subtle": "Subtle",
			"motion.off": "Off",
			ghost: "Ghost text",
			ghostHint: "How a completion appears after the caret.",
			"ghost.wave": "Wave",
			"ghost.fade": "Fade",
			"ghost.none": "Instant",
			highlight: "Highlight",
			highlightHint: "How the highlight moves when you browse with ↑ and ↓.",
			"highlight.glide": "Glide",
			"highlight.instant": "Instant",
			density: "Row height",
			densityHint: "Comfortable matches the / menu.",
			"density.comfortable": "Comfortable",
			"density.compact": "Compact",
			hints: "Key hints",
			hintsHint: "Show the keys at the foot of the panels."
		};
		const zh = {
			summary: "Agent Stash 面板的外观与动画",
			unavailable: "当前 profile 没有向页面开放这些配置。",
			readOnly: "当前 profile 不接受页面修改配置。",
			saveFailed: "保存失败，配置没有变化。",
			save: "保存",
			saving: "正在保存…",
			preview: "预览",
			replay: "重播",
			previewTitle: "Prompt 回溯",
			previewDraft: "总结会议纪要",
			previewGhost: "，并提取待办事项。",
			previewRow1: "帮我分析这个项目的缓存命中率。",
			previewRow2: "给解析器补上单元测试。",
			previewRow3: "总结会议纪要，并提取待办事项。",
			previewHintBrowse: "浏览",
			previewHintFill: "填入",
			glass: "毛玻璃效果",
			glassHint: "模糊面板后面的内容，面板底色保持不透明。",
			motion: "动画",
			motionHint: "灵动：面板从输入框浮起，各行依次出现。",
			"motion.lively": "灵动",
			"motion.subtle": "轻柔",
			"motion.off": "关闭",
			ghost: "补全灰字",
			ghostHint: "补全建议在光标后出现的方式。",
			"ghost.wave": "波浪",
			"ghost.fade": "淡入",
			"ghost.none": "直接显示",
			highlight: "高亮移动",
			highlightHint: "用 ↑ ↓ 浏览时高亮块的移动方式。",
			"highlight.glide": "滑动",
			"highlight.instant": "即时",
			density: "行高",
			densityHint: "舒适与 / 菜单一致。",
			"density.comfortable": "舒适",
			"density.compact": "紧凑",
			hints: "按键提示",
			hintsHint: "在面板底部显示可用的按键。"
		};
		//#endregion
		//#region dsh/kit/src/panel.tsx
		const KIT = "dsh-stash";
		const TOP_MARGIN = 84;
		const MAX_LIST_HEIGHT = 228;
		const EXIT_LIMIT_MS = 400;
		const FRESH_MS = 420;
		const STAGGER_ROWS = 7;
		const STAGGER_MS = 30;
		function DocumentIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 16 16",
				width: "14",
				height: "14",
				"aria-hidden": "true",
				focusable: "false",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "2.5",
					y: "2.5",
					width: "11",
					height: "11",
					rx: "2.5",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M5.25 6h5.5M5.25 8h5.5M5.25 10h3.5",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round"
				})]
			});
		}
		function Hint({ hint }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: `${KIT}-hint`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: `${KIT}-keys`,
					children: hint.keys.map((key, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [index > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `dsh-stash-slash`,
						children: "/"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("kbd", {
						className: `${KIT}-kbd`,
						children: key
					})] }, key))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: hint.label })]
			});
		}
		function useBacking(anchor, surface, shown, glass) {
			(0, react.useLayoutEffect)(() => {
				if (!shown) return void 0;
				surface.current?.style.setProperty("--dsh-stash-anchor", anchor);
				const backing = document.createElement("div");
				backing.className = `${KIT}-backing`;
				backing.setAttribute("aria-hidden", "true");
				backing.style.setProperty("--dsh-stash-anchor", anchor);
				if (glass) backing.dataset["glass"] = "";
				document.body.append(backing);
				return () => backing.remove();
			}, [
				anchor,
				surface,
				shown,
				glass
			]);
		}
		function offsetWithin(listbox, option) {
			let top = 0;
			let node = option;
			while (node instanceof HTMLElement && node !== listbox) {
				top += node.offsetTop;
				node = node.offsetParent;
			}
			return top;
		}
		function followActive(listbox, option) {
			const top = offsetWithin(listbox, option);
			const bottom = top + option.offsetHeight;
			if (top < listbox.scrollTop) listbox.scrollTop = top;
			else if (bottom > listbox.scrollTop + listbox.clientHeight) listbox.scrollTop = bottom - listbox.clientHeight;
			const glide = listbox.querySelector(`.${KIT}-glide`);
			if (glide === null) return;
			glide.style.transform = `translateY(${top}px)`;
			glide.style.height = `${option.offsetHeight}px`;
			if (glide.dataset["placed"] === void 0) requestAnimationFrame(() => {
				glide.dataset["placed"] = "";
			});
		}
		function createPanel(store) {
			return function Panel(props) {
				const live = useAppearance(store);
				const appearance = props.preview ?? live;
				const [view, setView] = (0, react.useState)(props.open ? {
					props,
					closing: false,
					opening: 0
				} : null);
				const [settled, setSettled] = (0, react.useState)(-1);
				if (props.open) {
					if (view === null || view.closing) setView({
						props,
						closing: false,
						opening: (view?.opening ?? 0) + 1
					});
					else if (view.props !== props) setView({
						...view,
						props
					});
				} else if (view !== null && !view.closing) setView(appearance.motion === "off" ? null : {
					...view,
					closing: true
				});
				const closing = view?.closing === true;
				const opening = view?.opening ?? 0;
				const visible = view !== null && !closing;
				(0, react.useEffect)(() => {
					if (!closing) return void 0;
					const timer = setTimeout(() => setView(null), EXIT_LIMIT_MS);
					return () => clearTimeout(timer);
				}, [closing]);
				(0, react.useEffect)(() => {
					if (!visible) return void 0;
					const timer = setTimeout(() => setSettled(opening), FRESH_MS);
					return () => clearTimeout(timer);
				}, [visible, opening]);
				const surface = (0, react.useRef)(null);
				const list = (0, react.useRef)(null);
				useBacking(`--${KIT}-${(0, react.useId)().replaceAll(":", "")}`, surface, visible && props.preview === void 0, appearance.glass);
				const shown = view?.props;
				const optionId = (index) => `${shown?.owner ?? "dsh-stash"}-option-${index}`;
				(0, react.useLayoutEffect)(() => {
					const panel = surface.current;
					const listbox = list.current;
					const overlay = panel?.parentElement;
					if (shown === void 0 || panel === null || listbox === null) return;
					if (overlay !== null && overlay !== void 0 && shown.preview === void 0) {
						const chrome = panel.offsetHeight - listbox.offsetHeight;
						const room = overlay.getBoundingClientRect().top - TOP_MARGIN - chrome;
						listbox.style.maxHeight = `${Math.max(72, Math.min(MAX_LIST_HEIGHT, room))}px`;
					}
					const option = listbox.querySelector(`#${CSS.escape(optionId(shown.active))}`);
					if (option !== null) followActive(listbox, option);
				});
				if (view === null || shown === void 0) return null;
				const { rows, active } = shown;
				const fresh = settled !== opening && !closing;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: surface,
					className: `${KIT}-panel`,
					"data-dsh-history-panel": shown.owner,
					"data-state": closing ? "closing" : "open",
					"data-fresh": fresh ? "" : void 0,
					"data-glass": appearance.glass ? "" : void 0,
					"data-motion": appearance.motion,
					"data-highlight": appearance.highlight,
					"data-density": appearance.density,
					"data-preview": shown.preview === void 0 ? void 0 : "",
					"data-hover-tint": shown.hoverTint === true ? "" : void 0,
					"aria-hidden": closing || void 0,
					onAnimationEnd: (event) => {
						if (closing && event.target === event.currentTarget) setView(null);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${KIT}-header`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${KIT}-title`,
								children: shown.title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${KIT}-counter`,
								children: shown.counter
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							ref: list,
							className: `${KIT}-list`,
							role: "listbox",
							"aria-label": shown.title,
							"aria-activedescendant": optionId(active),
							children: [appearance.highlight === "glide" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `dsh-stash-glide`,
								"aria-hidden": "true"
							}), rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "presentation",
								className: `${KIT}-item`,
								style: { animationDelay: `${String(Math.min(rows.length - 1 - index, STAGGER_ROWS) * STAGGER_MS)}ms` },
								children: [row.section !== void 0 && row.section !== rows[index - 1]?.section && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: `dsh-stash-section`,
									role: "presentation",
									children: row.section
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									id: optionId(index),
									role: "option",
									"aria-selected": index === active,
									className: `${KIT}-row`,
									"data-active": index === active ? "" : void 0,
									onMouseDown: (event) => {
										event.preventDefault();
										if (!closing) shown.onPick(index);
									},
									onMouseMove: index === active || closing ? void 0 : () => shown.onHover(index),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: `${KIT}-icon`,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DocumentIcon, {})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: `${KIT}-text`,
											children: row.text
										}),
										row.meta !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: `dsh-stash-meta`,
											children: row.meta
										})
									]
								})]
							}, row.key))]
						}),
						appearance.hints && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `dsh-stash-footer`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `dsh-stash-hints`,
								children: shown.hints.map((hint) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Hint, { hint }, hint.label))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `dsh-stash-hints`,
								children: shown.trailingHints.map((hint) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Hint, { hint }, hint.label))
							})]
						})
					]
				});
			};
		}
		//#endregion
		//#region dsh/kit/src/settings.tsx
		const CHOICES = {
			motion: [
				["lively", "motion.lively"],
				["subtle", "motion.subtle"],
				["off", "motion.off"]
			],
			ghost: [
				["wave", "ghost.wave"],
				["fade", "ghost.fade"],
				["none", "ghost.none"]
			],
			highlight: [["glide", "highlight.glide"], ["instant", "highlight.instant"]],
			density: [["comfortable", "density.comfortable"], ["compact", "density.compact"]]
		};
		function Field({ k, label, hint, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${k}-field`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${k}-field-text`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${k}-field-label`,
						children: label
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${k}-field-hint`,
						children: hint
					})]
				}), children]
			});
		}
		function Preview({ k, appearance, Panel, t }) {
			const [round, setRound] = (0, react.useState)(0);
			const [active, setActive] = (0, react.useState)(2);
			const effect = ghostEffectOf(appearance);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: `${k}-preview`,
				"aria-label": t("preview"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${k}-preview-head`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${k}-field-label`,
						children: t("preview")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						onClick: () => setRound(round + 1),
						children: t("replay")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${k}-preview-stage`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, {
						owner: `${k}-preview`,
						open: true,
						title: t("previewTitle"),
						counter: `0${String(active + 1)} / 03`,
						rows: [
							{
								key: "1",
								text: t("previewRow1"),
								meta: "09:12"
							},
							{
								key: "2",
								text: t("previewRow2"),
								meta: "11:40"
							},
							{
								key: "3",
								text: t("previewRow3"),
								meta: "16:33"
							}
						],
						active,
						hints: [{
							keys: ["↑", "↓"],
							label: t("previewHintBrowse")
						}],
						trailingHints: [{
							keys: ["Tab", "→"],
							label: t("previewHintFill")
						}],
						onPick: setActive,
						onHover: setActive,
						preview: appearance
					}, `panel-${String(round)}`), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: `${k}-preview-draft`,
						children: [t("previewDraft"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${k}-preview-ghost`,
							"data-effect": effect,
							children: t("previewGhost")
						}, `ghost-${String(round)}`)]
					})]
				})]
			});
		}
		function createSettingsPage(k, Panel) {
			return function SettingsPage({ view, form, t }) {
				const id = (0, react.useId)();
				const [draft, setDraft] = (0, react.useState)();
				const [saving, setSaving] = (0, react.useState)(false);
				const [failed, setFailed] = (0, react.useState)(false);
				if (view === "summary") return t("summary");
				const current = parseAppearance(form?.state.value);
				const shown = draft ?? current;
				const dirty = draft !== void 0 && !sameAppearance(draft, current);
				const available = form !== void 0 && form.state.status !== "unavailable";
				const writable = available && form.state.status === "ready" && form.state.writable;
				const locked = !writable || saving;
				const stage = (next) => {
					setDraft(next);
					setFailed(false);
				};
				const save = async () => {
					if (form === void 0 || draft === void 0) return;
					setSaving(true);
					setFailed(false);
					try {
						const ops = changedFields(current, draft).map((field) => ({
							op: "set",
							path: [field],
							value: draft[field]
						}));
						if (await form.mutate(ops, form.state.revision)) setDraft(void 0);
						else setFailed(true);
					} catch (error) {
						console.error(`[${k}] saving the appearance settings failed:`, error);
						setFailed(true);
					} finally {
						setSaving(false);
					}
				};
				const toggle = (field) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					k,
					label: t(field),
					hint: t(`${field}Hint`),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
						checked: shown[field],
						label: t(field),
						disabled: locked,
						onChange: (next) => stage({
							...shown,
							[field]: next
						})
					})
				});
				const choice = (field) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					k,
					label: t(field),
					hint: t(`${field}Hint`),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
						id: `${id}-${field}`,
						label: t(field),
						value: shown[field],
						disabled: locked,
						options: CHOICES[field].map(([value, label]) => ({
							value,
							label: t(label)
						})),
						onChange: (next) => stage(parseAppearance({
							...shown,
							[field]: next
						}))
					})
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: `${k}-settings`,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
						labels: {
							unavailable: t("unavailable"),
							readOnly: t("readOnly"),
							saveFailed: t("saveFailed"),
							save: t("save"),
							saving: t("saving")
						},
						state: {
							available,
							writable,
							dirty,
							invalid: false,
							saving,
							failed
						},
						onSave: () => void save(),
						onDiscard: () => setDraft(void 0),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Preview, {
								k,
								appearance: shown,
								Panel,
								t
							}),
							toggle("glass"),
							choice("motion"),
							choice("ghost"),
							choice("highlight"),
							choice("density"),
							toggle("hints")
						]
					})
				});
			};
		}
		function settingsCss(k) {
			const p = `.${k}`;
			return `
${p}-settings {
  padding: 4px 0 8px;
}
${p}-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}
${p}-field-text {
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
${p}-field-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-field-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 16px;
}
${p}-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
${p}-preview-stage {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-interactive-bg-hover));
}
${p}-preview-draft {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--dsw-radius-panel);
  background: var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base));
  box-shadow: var(--dsw-elevation-soft);
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
}
${p}-preview-ghost {
  color: var(--dsw-alias-label-caption);
}
${p}-preview-ghost[data-effect="wave"] {
  mask-image: linear-gradient(90deg, black 0 40%, transparent 60% 100%);
  mask-size: 250% 100%;
  mask-position: 0 0;
  animation: ${k}-ghost-wave-a 280ms ${EASE_OUT} 240ms both;
}
${p}-preview-ghost[data-effect="fade"] {
  animation: ${k}-ghost-fade-a 180ms ${EASE_OUT} 240ms both;
}
@media (prefers-reduced-motion: reduce) {
  ${p}-preview-ghost[data-effect] {
    mask-image: none;
    animation-duration: 1ms;
  }
}
`;
		}
		//#endregion
		//#region dsh/kit/src/swap.ts
		function createSwap(k, store) {
			const attribute = `data-${k}-swap`;
			return (card, direction) => {
				if (store.get().motion !== "lively") return;
				const editable = card.querySelector("[contenteditable=\"true\"]");
				if (editable === null) return;
				editable.removeAttribute(attribute);
				editable.offsetWidth;
				editable.setAttribute(attribute, direction);
				editable.addEventListener("animationend", (event) => {
					if (event.target === editable) editable.removeAttribute(attribute);
				}, { once: true });
			};
		}
		//#endregion
		//#region dsh/kit/src/client.tsx
		const PLUGIN = "dsh-stash-kit";
		const PACKAGE = "@agent-stash/dsh-stash-kit";
		const inject = ["slots", "locale"];
		function createStashKit(appearance) {
			return {
				appearance,
				Panel: createPanel(appearance),
				Ghost: createGhost(KIT, appearance),
				swapDraft: createSwap(KIT, appearance)
			};
		}
		function stashKitCss() {
			return kitCss(KIT) + ghostKeyframes(KIT) + settingsCss(KIT);
		}
		function apply(ctx) {
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset["plugin"] = PLUGIN;
				tag.textContent = stashKitCss();
				document.head.append(tag);
				return () => tag.remove();
			}, `${PLUGIN}: stylesheet`);
			for (const [locale, dict] of Object.entries({
				en,
				zh
			})) ctx.effect(() => ctx.locale.register(PLUGIN, locale, dict), `${PLUGIN}: ${locale} dictionary`);
			const appearance = createAppearanceStore(DEFAULT_APPEARANCE);
			ctx.inject(["configForms"], (inner) => {
				const form = inner.configForms.get(PLUGIN);
				inner.effect(() => {
					const update = () => {
						const snapshot = form.getSnapshot();
						if (snapshot.status === "ready") appearance.set(parseAppearance(snapshot.value));
					};
					update();
					return form.subscribe(update);
				}, `${PLUGIN}: appearance settings`);
			});
			const kit = createStashKit(appearance);
			ctx.provide("stashKit", kit);
			const Page = createSettingsPage(KIT, kit.Panel);
			ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
				name: "plugins.row.config",
				key: `${PACKAGE}#${PLUGIN}`,
				locale: PLUGIN
			}, Page));
		}
		//#endregion
		exports.apply = apply;
		exports.createStashKit = createStashKit;
		exports.inject = inject;
		exports.stashKitCss = stashKitCss;
		return exports;
	}
});
