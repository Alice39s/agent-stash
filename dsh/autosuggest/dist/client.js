window.__ModuleLoader__.load({
	id: "@agent-stash/dsh-autosuggest",
	factory(require) {
		const exports = {};
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region dsh/shared/client/keys.ts
		function keyInput(event) {
			return {
				key: event.key,
				shift: event.shiftKey,
				alt: event.altKey,
				ctrl: event.ctrlKey,
				meta: event.metaKey,
				composing: event.isComposing || event.keyCode === 229
			};
		}
		function isPlain(input, key) {
			return input.key === key && !input.shift && !input.alt && !input.ctrl && !input.meta && !input.composing;
		}
		//#endregion
		//#region dsh/shared/client/composer.ts
		function findComposer(anchor) {
			const card = anchor.closest("[data-composer-card]");
			const editable = card?.querySelector("[contenteditable=\"true\"]");
			return card === null || card === void 0 || editable === null || editable === void 0 ? void 0 : {
				card,
				editable
			};
		}
		function caretEdges(editable) {
			const selection = editable.ownerDocument.getSelection();
			if (selection === null || selection.rangeCount === 0 || !selection.isCollapsed) return {
				atStart: false,
				atEnd: false
			};
			const caret = selection.getRangeAt(0);
			if (!editable.contains(caret.startContainer)) return {
				atStart: false,
				atEnd: false
			};
			const before = editable.ownerDocument.createRange();
			before.selectNodeContents(editable);
			before.setEnd(caret.startContainer, caret.startOffset);
			const after = editable.ownerDocument.createRange();
			after.selectNodeContents(editable);
			after.setStart(caret.startContainer, caret.startOffset);
			return {
				atStart: before.toString() === "",
				atEnd: after.toString() === ""
			};
		}
		function triggerMenuOpen(card) {
			return card.querySelector("[data-trigger-menu]") !== null;
		}
		function useComposer() {
			const [elements, setElements] = (0, react.useState)();
			return [(0, react.useCallback)((node) => {
				setElements(node === null ? void 0 : findComposer(node));
			}, []), elements];
		}
		function useLatest(value) {
			const latest = (0, react.useRef)(value);
			(0, react.useLayoutEffect)(() => {
				latest.current = value;
			});
			return latest;
		}
		function useComposerKeys(elements, handle) {
			const latest = useLatest(handle);
			(0, react.useLayoutEffect)(() => {
				if (elements === void 0) return void 0;
				const onKeyDown = (event) => {
					if (!(event.target instanceof Node) || !elements.editable.contains(event.target)) return;
					if (!latest.current(keyInput(event), elements)) return;
					event.preventDefault();
					event.stopImmediatePropagation();
				};
				elements.card.addEventListener("keydown", onKeyDown, true);
				return () => elements.card.removeEventListener("keydown", onKeyDown, true);
			}, [elements, latest]);
		}
		const IDLE = {
			caretAtEnd: false,
			composing: false,
			menuOpen: false,
			inputCount: 0
		};
		function signalStore(elements) {
			const { card, editable } = elements;
			let composing = false;
			let inputCount = 0;
			let current = IDLE;
			return {
				subscribe: (notify) => {
					const document = card.ownerDocument;
					const onCompositionStart = () => {
						composing = true;
						notify();
					};
					const onCompositionEnd = () => {
						composing = false;
						notify();
					};
					const onBeforeInput = () => {
						inputCount += 1;
						notify();
					};
					const observer = new MutationObserver(notify);
					const overlay = card.querySelector("[data-composer-overlay]");
					if (overlay !== null) observer.observe(overlay, {
						childList: true,
						subtree: true
					});
					document.addEventListener("selectionchange", notify);
					editable.addEventListener("compositionstart", onCompositionStart);
					editable.addEventListener("compositionend", onCompositionEnd);
					editable.addEventListener("beforeinput", onBeforeInput, true);
					return () => {
						observer.disconnect();
						document.removeEventListener("selectionchange", notify);
						editable.removeEventListener("compositionstart", onCompositionStart);
						editable.removeEventListener("compositionend", onCompositionEnd);
						editable.removeEventListener("beforeinput", onBeforeInput, true);
					};
				},
				snapshot: () => {
					const next = {
						caretAtEnd: caretEdges(editable).atEnd,
						composing,
						menuOpen: triggerMenuOpen(card),
						inputCount
					};
					if (next.caretAtEnd !== current.caretAtEnd || next.composing !== current.composing || next.menuOpen !== current.menuOpen || next.inputCount !== current.inputCount) current = next;
					return current;
				}
			};
		}
		const IDLE_STORE = {
			subscribe: () => () => {},
			snapshot: () => IDLE
		};
		function useEditorSignals(elements) {
			const store = (0, react.useMemo)(() => elements === void 0 ? IDLE_STORE : signalStore(elements), [elements]);
			return (0, react.useSyncExternalStore)(store.subscribe, store.snapshot);
		}
		//#endregion
		//#region dsh/shared/client/dsh.ts
		const CLIENT_INJECT = [
			"slots",
			"locale",
			"stashKit"
		];
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
		function getDefault(schema, dataset, config$1) {
			return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
		}
		/* @__NO_SIDE_EFFECTS__ */
		function array(item, message$1) {
			return _standardSchema({
				kind: "schema",
				type: "array",
				reference: array,
				expects: "Array",
				async: false,
				item,
				message: message$1,
				"~run"(dataset, config$1) {
					const input = dataset.value;
					if (Array.isArray(input)) {
						dataset.typed = true;
						dataset.value = [];
						for (let key = 0; key < input.length; key++) {
							const value$1 = input[key];
							const itemDataset = this.item["~run"]({ value: value$1 }, config$1);
							if (itemDataset.issues) {
								const pathItem = {
									type: "array",
									origin: "value",
									input,
									key,
									value: value$1
								};
								for (const issue of itemDataset.issues) {
									if (issue.path) issue.path.unshift(pathItem);
									else issue.path = [pathItem];
									dataset.issues?.push(issue);
								}
								if (!dataset.issues) dataset.issues = itemDataset.issues;
								if (config$1.abortEarly) {
									dataset.typed = false;
									break;
								}
							}
							if (!itemDataset.typed) dataset.typed = false;
							dataset.value.push(itemDataset.value);
						}
					} else _addIssue(this, "type", dataset, config$1);
					return dataset;
				}
			});
		}
		/* @__NO_SIDE_EFFECTS__ */
		function number(message$1) {
			return _standardSchema({
				kind: "schema",
				type: "number",
				reference: number,
				expects: "number",
				async: false,
				message: message$1,
				"~run"(dataset, config$1) {
					if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
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
		function optional(wrapped, default_) {
			return _standardSchema({
				kind: "schema",
				type: "optional",
				reference: optional,
				expects: `(${wrapped.expects} | undefined)`,
				async: false,
				wrapped,
				default: default_,
				"~run"(dataset, config$1) {
					if (dataset.value === void 0) {
						if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
						if (dataset.value === void 0) {
							dataset.typed = true;
							return dataset;
						}
					}
					return this.wrapped["~run"](dataset, config$1);
				}
			});
		}
		/* @__NO_SIDE_EFFECTS__ */
		function string(message$1) {
			return _standardSchema({
				kind: "schema",
				type: "string",
				reference: string,
				expects: "string",
				async: false,
				message: message$1,
				"~run"(dataset, config$1) {
					if (typeof dataset.value === "string") dataset.typed = true;
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
		const GlobalItemsSchema = /* @__PURE__ */ object({ items: /* @__PURE__ */ array(/* @__PURE__ */ object({
			text: /* @__PURE__ */ string(),
			time: /* @__PURE__ */ number(),
			sessionId: /* @__PURE__ */ string(),
			title: /* @__PURE__ */ optional(/* @__PURE__ */ string())
		})) });
		async function requestJson(url, init) {
			const response = await fetch(url, init);
			const body = await response.json();
			if (!response.ok) {
				const message = typeof body === "object" && body !== null && "message" in body ? String(body.message) : response.statusText;
				throw new Error(`${init.method ?? "GET"} ${url} answered ${response.status}: ${message}`);
			}
			return body;
		}
		function getJson(url, signal) {
			return requestJson(url, {
				signal,
				headers: { accept: "application/json" }
			});
		}
		async function fetchGlobalPrompts(route, signal) {
			return parse(GlobalItemsSchema, await getJson(route, signal)).items;
		}
		//#endregion
		//#region dsh/shared/prompts.ts
		function promptCandidates(history, draft, limit) {
			if (draft === "") return [];
			const candidates = [];
			for (const entry of history) {
				if (candidates.length >= limit) break;
				if (entry.text.length > draft.length && entry.text.startsWith(draft)) candidates.push(entry);
			}
			return candidates;
		}
		function startOfDay(time) {
			const date = new Date(time);
			return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
		}
		function promptDay(time, now) {
			const day = startOfDay(time);
			const today = startOfDay(now);
			if (day === today) return { kind: "today" };
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			if (day === yesterday.getTime()) return { kind: "yesterday" };
			return {
				kind: "date",
				time
			};
		}
		//#endregion
		//#region dsh/shared/client/format.ts
		function useRemoteList(label, load, key) {
			const [list, setList] = (0, react.useState)({
				items: [],
				loadedAt: 0
			});
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				load(controller.signal).then((items) => setList({
					items,
					loadedAt: Date.now()
				}), (error) => {
					if (controller.signal.aborted) return;
					console.error(`[${label}] loading prompt history failed:`, error);
				});
				return () => controller.abort();
			}, [key]);
			return list;
		}
		const pad = (value) => String(value).padStart(2, "0");
		function dayLabel(day, words) {
			if (day.kind === "today") return words.today;
			if (day.kind === "yesterday") return words.yesterday;
			const date = new Date(day.time);
			return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		}
		function relativeDay(time, now, words) {
			return dayLabel(promptDay(time, now), words);
		}
		function counter(current, total) {
			return `${pad(current)} / ${pad(total)}`;
		}
		//#endregion
		//#region dsh/shared/client/resources.ts
		function installDictionaries(ctx, ns, dictionaries) {
			for (const [locale, dict] of Object.entries(dictionaries)) ctx.effect(() => ctx.locale.register(ns, locale, dict), `${ns}: ${locale} dictionary`);
		}
		//#endregion
		//#region dsh/autosuggest/src/locales.ts
		const en = {
			title: "History suggestions",
			today: "Today",
			yesterday: "Yesterday",
			untitled: "Untitled session",
			switch: "Switch",
			fill: "Fill",
			dismiss: "Close"
		};
		const zh = {
			title: "全局历史补全",
			today: "今天",
			yesterday: "昨天",
			untitled: "未命名会话",
			switch: "切换建议",
			fill: "填充",
			dismiss: "关闭"
		};
		//#endregion
		//#region dsh/autosuggest/src/suggest.ts
		const PASS = {
			action: { kind: "none" },
			consume: false
		};
		function suggestKey(view, input) {
			if (view.count === 0) return PASS;
			if (isPlain(input, "Tab") || isPlain(input, "ArrowRight")) return {
				action: {
					kind: "accept",
					index: view.index
				},
				consume: true
			};
			if (isPlain(input, "Escape")) return {
				action: { kind: "dismiss" },
				consume: true
			};
			if (view.count < 2) return PASS;
			const step = isPlain(input, "ArrowDown") ? 1 : isPlain(input, "ArrowUp") ? -1 : 0;
			if (step === 0) return PASS;
			const index = view.index + step;
			if (index < 0 || index >= view.count) return {
				action: { kind: "none" },
				consume: true
			};
			return {
				action: {
					kind: "highlight",
					index
				},
				consume: true
			};
		}
		//#endregion
		//#region dsh/autosuggest/src/client.tsx
		const PLUGIN = "dsh-autosuggest";
		const ROUTE = "dsh-autosuggest/prompts";
		const MARKER = "data-dsh-autosuggest";
		const MAX_CANDIDATES = 5;
		function createSuggestOverlay(kit) {
			const { Panel, Ghost } = kit;
			return function SuggestOverlay(props) {
				const { sessionId, useInput, inputActions, useProjection, t } = props;
				const marker = (0, react.useId)();
				const [anchor, composer] = useComposer();
				const signals = useEditorSignals(composer);
				const draft = useInput((state) => state.draft);
				const editable = useInput((state) => state.phase === "plain" && state.occurrences.length === 0);
				const stamp = useProjection("sessionListMetadata", (value) => value?.lastPromptAt ?? null);
				const { items: history, loadedAt } = useRemoteList(PLUGIN, (signal) => fetchGlobalPrompts(ROUTE, signal), `${sessionId}:${String(stamp)}`);
				const [seen, setSeen] = (0, react.useState)({
					draft,
					inputs: signals.inputCount,
					typed: false
				});
				const [index, setIndex] = (0, react.useState)(0);
				const [dismissed, setDismissed] = (0, react.useState)();
				if (seen.draft !== draft) {
					setSeen({
						draft,
						inputs: signals.inputCount,
						typed: signals.inputCount !== seen.inputs
					});
					setIndex(0);
					setDismissed(void 0);
				}
				const candidates = seen.draft === draft && seen.typed && editable && signals.caretAtEnd && !signals.composing && !signals.menuOpen && dismissed !== draft ? promptCandidates(history, draft, MAX_CANDIDATES) : [];
				const highlighted = Math.min(index, Math.max(0, candidates.length - 1));
				const suggestion = candidates[highlighted];
				const accept = (pick) => {
					const candidate = candidates[pick];
					if (candidate !== void 0) inputActions.setDraft(candidate.text);
				};
				useComposerKeys(composer, (input, elements) => {
					if (!caretEdges(elements.editable).atEnd) return false;
					const step = suggestKey({
						count: candidates.length,
						index: highlighted
					}, input);
					const { action } = step;
					if (action.kind === "accept") accept(action.index);
					else if (action.kind === "highlight") setIndex(action.index);
					else if (action.kind === "dismiss") setDismissed(draft);
					return step.consume;
				});
				const words = {
					today: t("today"),
					yesterday: t("yesterday")
				};
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: anchor,
					[MARKER]: marker,
					children: [suggestion !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Ghost, {
						attribute: MARKER,
						marker,
						suffix: suggestion.text.slice(draft.length),
						identity: `${suggestion.sessionId}:${suggestion.text}`
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, {
						owner: PLUGIN,
						open: suggestion !== void 0,
						title: t("title"),
						counter: counter(highlighted + 1, candidates.length),
						rows: candidates.map((candidate, row) => ({
							key: `${candidate.sessionId}:${String(row)}`,
							text: candidate.text,
							meta: `${candidate.title ?? t("untitled")} · ${relativeDay(candidate.time, loadedAt, words)}`
						})),
						active: highlighted,
						hints: candidates.length > 1 ? [{
							keys: ["↑", "↓"],
							label: t("switch")
						}] : [],
						trailingHints: [{
							keys: ["Tab", "→"],
							label: t("fill")
						}, {
							keys: ["Esc"],
							label: t("dismiss")
						}],
						onPick: accept,
						onHover: setIndex
					})]
				});
			};
		}
		const inject = CLIENT_INJECT;
		function apply(ctx) {
			installDictionaries(ctx, PLUGIN, {
				en,
				zh
			});
			const SuggestOverlay = createSuggestOverlay(ctx.stashKit);
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
				id: PLUGIN,
				order: 21,
				locale: PLUGIN
			}, SuggestOverlay));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return exports;
	}
});
