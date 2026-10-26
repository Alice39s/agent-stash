window.__ModuleLoader__.load({
	id: "@agent-stash/init",
	factory(require) {
		const exports = {};
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
		function postJson(url, payload) {
			return requestJson(url, {
				method: "POST",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(payload)
			});
		}
		//#endregion
		//#region dsh/shared/client/resources.ts
		function installDictionaries(ctx, ns, dictionaries) {
			for (const [locale, dict] of Object.entries(dictionaries)) ctx.effect(() => ctx.locale.register(ns, locale, dict), `${ns}: ${locale} dictionary`);
		}
		//#endregion
		//#region dsh/init/locales.ts
		const en = {
			label: "Init",
			description: "Analyze the project and write AGENTS.md",
			hint: "[preset] [extra prompt]",
			searchPlaceholder: "Search presets…",
			searchEmpty: "No presets available",
			searchNoResults: "No matching presets",
			customGroup: "Custom"
		};
		const zh = {
			label: "初始化",
			description: "分析项目并写出 AGENTS.md",
			hint: "[预设] [额外指令]",
			searchPlaceholder: "搜索预设…",
			searchEmpty: "没有可用的预设",
			searchNoResults: "没有匹配的预设",
			customGroup: "自定义"
		};
		//#endregion
		//#region dsh/init/wire.ts
		const ROUTE_PREFIX = "agent-stash-init";
		const PRESETS_PATH = `${ROUTE_PREFIX}/presets`;
		const RUN_PATH = `${ROUTE_PREFIX}/run`;
		const PresetListSchema = /* @__PURE__ */ object({
			defaultPreset: /* @__PURE__ */ string(),
			presets: /* @__PURE__ */ array(/* @__PURE__ */ object({
				name: /* @__PURE__ */ string(),
				title: /* @__PURE__ */ string(),
				custom: /* @__PURE__ */ boolean()
			}))
		});
		const RunResultSchema = /* @__PURE__ */ object({ preset: /* @__PURE__ */ string() });
		//#endregion
		//#region dsh/init/client.ts
		const NS = "agent-stash-init";
		const COMMAND = "init";
		const TOKEN = `/${COMMAND}`;
		const WITH_ARGUMENTS = /^\/init\s/u;
		async function fetchPresets(signal) {
			return parse(PresetListSchema, await getJson(PRESETS_PATH, signal));
		}
		async function runInit(sessionId, input) {
			const result = await postJson(RUN_PATH, {
				session: sessionId,
				input
			});
			return parse(RunResultSchema, result).preset;
		}
		function presetOptions(list, customGroup) {
			return list.presets.map((preset) => ({
				id: preset.name,
				label: preset.title,
				...preset.title === preset.name ? {} : { detail: preset.name },
				...preset.name === list.defaultPreset ? { active: true } : {},
				...preset.custom ? { group: {
					name: "custom",
					label: customGroup
				} } : {}
			}));
		}
		function initContribution(t, available) {
			return {
				name: COMMAND,
				label: () => t("label"),
				description: () => t("description"),
				icon: _deepseek_ai_dsh_client_ui_primitives.IconListPenOutlineRegular,
				available,
				ui: {
					kind: "popupSelect",
					searchLabels: () => ({
						placeholder: t("searchPlaceholder"),
						empty: t("searchEmpty"),
						noResults: t("searchNoResults")
					}),
					options: async (_session, signal) => presetOptions(await fetchPresets(signal), t("customGroup")),
					onSelect: async (option, session) => {
						await runInit(session.sessionId, option.id);
					}
				}
			};
		}
		function initSource(available, hint) {
			const claimFor = (session) => available(session) ? {
				name: COMMAND,
				token: `${TOKEN} `,
				hint: hint(),
				submit: async (args) => {
					await runInit(session.sessionId, args);
					return { kind: "success" };
				}
			} : void 0;
			const claimed = (session) => {
				const claim = claimFor(session);
				return claim === void 0 ? void 0 : { claim };
			};
			return {
				trigger: "/",
				name: NS,
				showGroupTitle: false,
				order: 100,
				candidates: () => Promise.resolve([]),
				matchSpace: (session, token) => token === TOKEN ? claimed(session) : void 0,
				matchEnter: (session, line) => Promise.resolve(WITH_ARGUMENTS.test(line) ? claimed(session) : void 0),
				matchClaim: (session, token) => Promise.resolve(token === TOKEN ? claimFor(session) : void 0)
			};
		}
		const inject = [
			"commandUi",
			"inputTriggers",
			"sessions",
			"locale"
		];
		function apply(ctx) {
			installDictionaries(ctx, NS, {
				en,
				zh
			});
			const t = ctx.locale.bind(NS);
			const available = (session) => ctx.sessions.subagentAddress(session.sessionId) === void 0;
			ctx.effect(() => ctx.commandUi.register(initContribution(t, available)), `${NS}: /init command`);
			ctx.effect(() => ctx.inputTriggers.registerSource(initSource(available, () => t("hint"))), `${NS}: /init arguments`);
		}
		//#endregion
		exports.apply = apply;
		exports.initContribution = initContribution;
		exports.initSource = initSource;
		exports.inject = inject;
		exports.presetOptions = presetOptions;
		return exports;
	}
});
