window.__ModuleLoader__.load({
	id: "@agent-stash/dsh-recall",
	factory(require) {
		const exports = {};
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region dsh/shared/client/keys.ts
		const MODIFIER_KEYS = /* @__PURE__ */ new Set([
			"Shift",
			"Control",
			"Alt",
			"Meta",
			"CapsLock",
			"AltGraph",
			"Fn"
		]);
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
		function isModifierOnly(input) {
			return MODIFIER_KEYS.has(input.key);
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
		function usePointerOutside(elements, active, onOutside) {
			const latest = useLatest(onOutside);
			(0, react.useLayoutEffect)(() => {
				if (elements === void 0 || !active) return void 0;
				const document = elements.card.ownerDocument;
				const onPointerDown = (event) => {
					if (event.target instanceof Node && elements.card.contains(event.target)) return;
					latest.current();
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				return () => document.removeEventListener("pointerdown", onPointerDown, true);
			}, [
				elements,
				active,
				latest
			]);
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
		//#endregion
		//#region dsh/shared/client/fetch.ts
		const SessionItemsSchema = /* @__PURE__ */ object({ items: /* @__PURE__ */ array(/* @__PURE__ */ object({
			text: /* @__PURE__ */ string(),
			time: /* @__PURE__ */ number()
		})) });
		async function requestJson(url, init) {
			const response = await fetch(url, init);
			const body = /^application\/json\b/iu.test(response.headers.get("content-type") ?? "") ? await response.json() : void 0;
			if (!response.ok) {
				const message = typeof body === "object" && body !== null && "message" in body ? String(body.message) : response.statusText;
				throw new Error(message, { cause: {
					request: `${init.method ?? "GET"} ${url}`,
					status: response.status
				} });
			}
			return body;
		}
		function getJson(url, signal) {
			return requestJson(url, {
				signal,
				headers: { accept: "application/json" }
			});
		}
		async function fetchSessionPrompts(route, sessionId, signal) {
			const url = `${route}?session=${encodeURIComponent(sessionId)}`;
			return parse(SessionItemsSchema, await getJson(url, signal)).items;
		}
		//#endregion
		//#region dsh/shared/prompts.ts
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
		function daySections(prompts, now) {
			const sections = [];
			prompts.forEach((prompt, index) => {
				const key = startOfDay(prompt.time);
				const last = sections.at(-1);
				if (last?.key === key) {
					last.items.push({ index });
					return;
				}
				sections.push({
					day: promptDay(prompt.time, now),
					key,
					items: [{ index }]
				});
			});
			return sections.map(({ day, items }) => ({
				day,
				items
			}));
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
		function clockTime(time) {
			const date = new Date(time);
			return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
		}
		function dayLabel(day, words) {
			if (day.kind === "today") return words.today;
			if (day.kind === "yesterday") return words.yesterday;
			const date = new Date(day.time);
			return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
		//#region dsh/recall/src/locales.ts
		const en = {
			title: "Prompt history",
			today: "Today",
			yesterday: "Yesterday",
			browse: "Browse",
			send: "Send",
			edit: "Edit",
			restore: "Restore draft"
		};
		const zh = {
			title: "历史记录",
			today: "今天",
			yesterday: "昨天",
			browse: "切换提示词",
			send: "发送",
			edit: "编辑",
			restore: "返回编辑"
		};
		//#endregion
		//#region dsh/recall/src/recall.ts
		const CLOSED = { open: false };
		const NONE = { kind: "none" };
		function recallKey(state, input, context) {
			if (!state.open) {
				if (isPlain(input, "ArrowUp") && context.ready && context.caretAtStart && context.count > 0) {
					const index = context.count - 1;
					return {
						state: {
							open: true,
							index,
							original: context.draft
						},
						effect: {
							kind: "show",
							index
						},
						consume: true
					};
				}
				return {
					state,
					effect: NONE,
					consume: false
				};
			}
			if (input.composing || isModifierOnly(input)) return {
				state,
				effect: NONE,
				consume: false
			};
			if (isPlain(input, "ArrowUp")) {
				if (state.index === 0) return {
					state,
					effect: NONE,
					consume: true
				};
				const index = state.index - 1;
				return {
					state: {
						...state,
						index
					},
					effect: {
						kind: "show",
						index
					},
					consume: true
				};
			}
			if (isPlain(input, "ArrowDown")) {
				if (state.index >= context.count - 1) return {
					state: CLOSED,
					effect: {
						kind: "restore",
						text: state.original
					},
					consume: true
				};
				const index = state.index + 1;
				return {
					state: {
						...state,
						index
					},
					effect: {
						kind: "show",
						index
					},
					consume: true
				};
			}
			if (isPlain(input, "Escape")) return {
				state: CLOSED,
				effect: {
					kind: "restore",
					text: state.original
				},
				consume: true
			};
			if (isPlain(input, "Tab")) return {
				state: CLOSED,
				effect: NONE,
				consume: true
			};
			return {
				state: CLOSED,
				effect: NONE,
				consume: false
			};
		}
		//#endregion
		//#region dsh/recall/src/client.tsx
		const PLUGIN = "dsh-recall";
		const ROUTE = "dsh-recall/prompts";
		function panelRows(prompts, now, words) {
			const rows = [];
			for (const section of daySections(prompts, now)) {
				const label = dayLabel(section.day, words);
				for (const { index } of section.items) {
					const prompt = prompts[index];
					if (prompt === void 0) continue;
					rows.push({
						key: String(index),
						text: prompt.text,
						meta: clockTime(prompt.time),
						section: label
					});
				}
			}
			return rows;
		}
		function swapDirection(previous, effect) {
			if (effect.kind === "restore") return "restore";
			if (effect.kind !== "show") return void 0;
			if (!previous.open) return "older";
			return effect.index < previous.index ? "older" : "newer";
		}
		function createRecallOverlay(kit) {
			const { Panel } = kit;
			return function RecallOverlay(props) {
				const { sessionId, useInput, inputActions, useProjection, t } = props;
				const [anchor, composer] = useComposer();
				const draft = useInput((state) => state.draft);
				const editable = useInput((state) => state.phase === "plain" && state.occurrences.length === 0);
				const stamp = useProjection("sessionListMetadata", (value) => value?.lastPromptAt ?? null);
				const { items: prompts, loadedAt } = useRemoteList(PLUGIN, (signal) => fetchSessionPrompts(ROUTE, sessionId, signal), `${sessionId}:${String(stamp)}`);
				const [state, setState] = (0, react.useState)(CLOSED);
				const latest = (0, react.useRef)(CLOSED);
				const update = (next, effect) => {
					const direction = swapDirection(latest.current, effect);
					latest.current = next;
					setState(next);
					if (effect.kind === "show") {
						const prompt = prompts[effect.index];
						if (prompt !== void 0) inputActions.setDraft(prompt.text);
					} else if (effect.kind === "restore") inputActions.setDraft(effect.text);
					if (direction !== void 0 && composer !== void 0) kit.swapDraft(composer.card, direction);
				};
				useComposerKeys(composer, (input, elements) => {
					const step = recallKey(latest.current, input, {
						count: prompts.length,
						draft,
						caretAtStart: caretEdges(elements.editable).atStart,
						ready: editable && !triggerMenuOpen(elements.card)
					});
					if (step.state !== latest.current || step.effect.kind !== "none") update(step.state, step.effect);
					return step.consume;
				});
				usePointerOutside(composer, state.open, () => update(CLOSED, { kind: "none" }));
				const words = {
					today: t("today"),
					yesterday: t("yesterday")
				};
				const index = state.open ? state.index : 0;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: anchor,
					"data-dsh-recall": "",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, {
						owner: PLUGIN,
						open: state.open,
						title: t("title"),
						counter: counter(prompts.length - index, prompts.length),
						rows: state.open ? panelRows(prompts, loadedAt, words) : [],
						active: index,
						hoverTint: true,
						hints: [{
							keys: ["↑", "↓"],
							label: t("browse")
						}],
						trailingHints: [
							{
								keys: ["Enter"],
								label: t("send")
							},
							{
								keys: ["Tab"],
								label: t("edit")
							},
							{
								keys: ["Esc"],
								label: t("restore")
							}
						],
						onPick: (row) => update(CLOSED, {
							kind: "show",
							index: row
						}),
						onHover: () => {}
					})
				});
			};
		}
		const inject = CLIENT_INJECT;
		function apply(ctx) {
			installDictionaries(ctx, PLUGIN, {
				en,
				zh
			});
			const RecallOverlay = createRecallOverlay(ctx.stashKit);
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
				id: PLUGIN,
				order: 20,
				locale: PLUGIN
			}, RecallOverlay));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return exports;
	}
});
