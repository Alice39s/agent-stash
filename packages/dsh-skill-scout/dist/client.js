window.__ModuleLoader__.load({
	id: "@agent-stash/dsh-skill-scout",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_dom = require("react-dom");
		let react_jsx_runtime = require("react/jsx-runtime");
		const DEFAULT_CONFIG = {
			lang: void 0,
			message: void 0,
			abortEarly: void 0,
			abortPipeEarly: void 0
		};
		/**
		* Returns the global configuration.
		*
		* @param config The config to merge.
		*
		* @returns The configuration.
		*/
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
		/**
		* Stringifies an unknown input to a literal or type string.
		*
		* @param input The unknown input.
		*
		* @returns A literal or type string.
		*
		* @internal
		*/
		/* @__NO_SIDE_EFFECTS__ */
		function _stringify(input) {
			const type = typeof input;
			if (type === "string") return `"${input}"`;
			if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
			if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
			return type;
		}
		/**
		* Adds an issue to the dataset.
		*
		* @param context The issue context.
		* @param label The issue label.
		* @param dataset The input dataset.
		* @param config The configuration.
		* @param other The optional props.
		*
		* @internal
		*/
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
		/**
		* Compares two values using the SameValueZero algorithm, which treats `NaN`
		* as equal to itself unlike `===`.
		*
		* @param value1 The first value.
		* @param value2 The second value.
		*
		* @returns Whether the values are equal.
		*
		* @internal
		*/
		/* @__NO_SIDE_EFFECTS__ */
		function _isSameValueZero(value1, value2) {
			return value1 === value2 || Number.isNaN(value1) && Number.isNaN(value2);
		}
		/**
		* Joins multiple `expects` values with the given separator.
		*
		* @param values The `expects` values.
		* @param separator The separator.
		*
		* @returns The joined `expects` property.
		*
		* @internal
		*/
		/* @__NO_SIDE_EFFECTS__ */
		function _joinExpects(values$1, separator) {
			const list = [...new Set(values$1)];
			if (list.length > 1) return `(${list.join(` ${separator} `)})`;
			return list[0] ?? "never";
		}
		/**
		* Eagerly creates and attaches the Standard Schema properties of a schema.
		*
		* Hint: The contextual `this` type includes the standard properties that are
		* attached before the schema is returned.
		*
		* @param schema The schema to attach standard properties to.
		*
		* @returns The schema with standard properties attached.
		*
		* @internal
		*/
		function _standardSchema(schema) {
			schema["~standard"] = {
				version: 1,
				vendor: "valibot",
				validate: (value$1) => schema["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig())
			};
			return schema;
		}
		/**
		* A Valibot error with useful information.
		*/
		var ValiError = class extends Error {
			/**
			* Creates a Valibot error with useful information.
			*
			* @param issues The error issues.
			*/
			constructor(issues) {
				super(issues[0].message);
				this.name = "ValiError";
				this.issues = issues;
			}
		};
		/* @__NO_SIDE_EFFECTS__ */
		function maxLength(requirement, message$1) {
			return {
				kind: "validation",
				type: "max_length",
				reference: maxLength,
				async: false,
				expects: `<=${requirement}`,
				requirement,
				message: message$1,
				"~run"(dataset, config$1) {
					if (dataset.typed && dataset.value.length > this.requirement) _addIssue(this, "length", dataset, config$1, { received: `${dataset.value.length}` });
					return dataset;
				}
			};
		}
		/* @__NO_SIDE_EFFECTS__ */
		function minLength(requirement, message$1) {
			return {
				kind: "validation",
				type: "min_length",
				reference: minLength,
				async: false,
				expects: `>=${requirement}`,
				requirement,
				message: message$1,
				"~run"(dataset, config$1) {
					if (dataset.typed && dataset.value.length < this.requirement) _addIssue(this, "length", dataset, config$1, { received: `${dataset.value.length}` });
					return dataset;
				}
			};
		}
		/* @__NO_SIDE_EFFECTS__ */
		function parseJson(config$1, message$1) {
			return {
				kind: "transformation",
				type: "parse_json",
				reference: parseJson,
				config: config$1,
				message: message$1,
				async: false,
				"~run"(dataset, config$2) {
					try {
						dataset.value = JSON.parse(dataset.value, this.config?.reviver);
					} catch (error) {
						if (error instanceof Error) {
							_addIssue(this, "JSON", dataset, config$2, { received: `"${error.message}"` });
							dataset.typed = false;
						} else throw error;
					}
					return dataset;
				}
			};
		}
		/* @__NO_SIDE_EFFECTS__ */
		function regex(requirement, message$1) {
			return {
				kind: "validation",
				type: "regex",
				reference: regex,
				async: false,
				expects: `${requirement}`,
				requirement,
				message: message$1,
				"~run"(dataset, config$1) {
					if (dataset.typed && !this.requirement.test(dataset.value)) _addIssue(this, "format", dataset, config$1);
					return dataset;
				}
			};
		}
		/**
		* Creates a trim transformation action.
		*
		* @returns A trim action.
		*/
		/* @__NO_SIDE_EFFECTS__ */
		function trim() {
			return {
				kind: "transformation",
				type: "trim",
				reference: trim,
				async: false,
				"~run"(dataset) {
					dataset.value = dataset.value.trim();
					return dataset;
				}
			};
		}
		const ABORT_EARLY_CONFIG = { abortEarly: true };
		/**
		* Returns the fallback value of the schema.
		*
		* @param schema The schema to get it from.
		* @param dataset The output dataset if available.
		* @param config The config if available.
		*
		* @returns The fallback value.
		*/
		/* @__NO_SIDE_EFFECTS__ */
		function getFallback(schema, dataset, config$1) {
			return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
		}
		/**
		* Returns a fallback value as output if the input does not match the schema.
		*
		* @param schema The schema to catch.
		* @param fallback The fallback value.
		*
		* @returns The passed schema.
		*/
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
		/**
		* Returns the default value of the schema.
		*
		* @param schema The schema to get it from.
		* @param dataset The input dataset if available.
		* @param config The config if available.
		*
		* @returns The default value.
		*/
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
		function literal(literal_, message$1) {
			return _standardSchema({
				kind: "schema",
				type: "literal",
				reference: literal,
				expects: /* @__PURE__ */ _stringify(literal_),
				async: false,
				literal: literal_,
				message: message$1,
				"~run"(dataset, config$1) {
					if (/* @__PURE__ */ _isSameValueZero(dataset.value, this.literal)) dataset.typed = true;
					else _addIssue(this, "type", dataset, config$1);
					return dataset;
				}
			});
		}
		/* @__NO_SIDE_EFFECTS__ */
		function nullable(wrapped, default_) {
			return _standardSchema({
				kind: "schema",
				type: "nullable",
				reference: nullable,
				expects: `(${wrapped.expects} | null)`,
				async: false,
				wrapped,
				default: default_,
				"~run"(dataset, config$1) {
					if (dataset.value === null) {
						if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
						if (dataset.value === null) {
							dataset.typed = true;
							return dataset;
						}
					}
					return this.wrapped["~run"](dataset, config$1);
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
		/* @__NO_SIDE_EFFECTS__ */
		function variant(key, options, message$1) {
			return _standardSchema({
				kind: "schema",
				type: "variant",
				reference: variant,
				expects: "Object",
				async: false,
				key,
				options,
				message: message$1,
				"~run"(dataset, config$1) {
					const input = dataset.value;
					if (input && typeof input === "object") {
						let outputDataset;
						let maxDiscriminatorPriority = 0;
						let invalidDiscriminatorKey = this.key;
						let expectedDiscriminators = [];
						const parseOptions = (variant$1, allKeys) => {
							for (const schema of variant$1.options) {
								if (schema.type === "variant") parseOptions(schema, new Set(allKeys).add(schema.key));
								else {
									let keysAreValid = true;
									let currentPriority = 0;
									for (const currentKey of allKeys) {
										const discriminatorSchema = schema.entries[currentKey];
										if (currentKey in input ? discriminatorSchema["~run"]({
											typed: false,
											value: input[currentKey]
										}, ABORT_EARLY_CONFIG).issues : discriminatorSchema.type !== "exact_optional" && discriminatorSchema.type !== "optional" && discriminatorSchema.type !== "nullish") {
											keysAreValid = false;
											if (invalidDiscriminatorKey !== currentKey && (maxDiscriminatorPriority < currentPriority || maxDiscriminatorPriority === currentPriority && currentKey in input && !(invalidDiscriminatorKey in input))) {
												maxDiscriminatorPriority = currentPriority;
												invalidDiscriminatorKey = currentKey;
												expectedDiscriminators = [];
											}
											if (invalidDiscriminatorKey === currentKey) expectedDiscriminators.push(schema.entries[currentKey].expects);
											break;
										}
										currentPriority++;
									}
									if (keysAreValid) {
										const optionDataset = schema["~run"]({ value: input }, config$1);
										if (!outputDataset || !outputDataset.typed && optionDataset.typed) outputDataset = optionDataset;
									}
								}
								if (outputDataset && !outputDataset.issues) break;
							}
						};
						parseOptions(this, /* @__PURE__ */ new Set([this.key]));
						if (outputDataset) return outputDataset;
						_addIssue(this, "type", dataset, config$1, {
							input: input[invalidDiscriminatorKey],
							expected: /* @__PURE__ */ _joinExpects(expectedDiscriminators, "|"),
							path: [{
								type: "object",
								origin: "value",
								input,
								key: invalidDiscriminatorKey,
								value: input[invalidDiscriminatorKey]
							}]
						});
					} else _addIssue(this, "type", dataset, config$1);
					return dataset;
				}
			});
		}
		/**
		* Parses an unknown input based on a schema.
		*
		* @param schema The schema to be used.
		* @param input The input to be parsed.
		* @param config The parse configuration.
		*
		* @returns The parsed input.
		*/
		function parse$1(schema, input, config$1) {
			const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
			if (dataset.issues) throw new ValiError(dataset.issues);
			return dataset.value;
		}
		/* @__NO_SIDE_EFFECTS__ */
		function pipe(...pipe$1) {
			return _standardSchema({
				...pipe$1[0],
				pipe: pipe$1,
				"~run"(dataset, config$1) {
					for (const item of pipe$1) if (item.kind !== "metadata") {
						if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
							dataset.typed = false;
							break;
						}
						if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly) dataset = item["~run"](dataset, config$1);
					}
					return dataset;
				}
			});
		}
		/**
		* Parses an unknown input based on a schema.
		*
		* @param schema The schema to be used.
		* @param input The input to be parsed.
		* @param config The parse configuration.
		*
		* @returns The parse result.
		*/
		/* @__NO_SIDE_EFFECTS__ */
		function safeParse(schema, input, config$1) {
			const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
			return {
				typed: dataset.typed,
				success: !dataset.issues,
				output: dataset.value,
				issues: dataset.issues
			};
		}
		//#endregion
		//#region src/shared.ts
		/**
		* Host 与浏览器两半共用的路由路径、视图 schema 与请求 schema。
		* 视图里的文本都已在 Host 侧脱敏、裁剪；浏览器收到响应后按同一份 schema 校验。
		*/
		const ROUTE_BASE = "/agent-stash-skill-scout";
		const INBOX_PATH = `${ROUTE_BASE}/inbox`;
		const DETAIL_PATH = `${ROUTE_BASE}/detail`;
		const ACTION_PATH = `${ROUTE_BASE}/action`;
		/** 插件页里本插件配置页的键：`<包名>#<条目 id>`。 */
		const PACKAGE_NAME = "@agent-stash/dsh-skill-scout";
		const ROW_ID = "agent-stash-skill-scout";
		const Nullable = (schema) => /* @__PURE__ */ nullable(schema);
		const SignalKindViewSchema = /* @__PURE__ */ picklist([
			"repeated",
			"recovery",
			"complex"
		]);
		/** 建议在界面上的状态；reviewing 只存在于 Host 内存，表示模型正在复核它。 */
		const ItemStateSchema = /* @__PURE__ */ picklist([
			"detected",
			"reviewing",
			"ready",
			"skipped",
			"failed",
			"dismissed",
			"written"
		]);
		const DecisionSchema = /* @__PURE__ */ picklist([
			"skip",
			"suggest_create",
			"suggest_improve"
		]);
		const FailureKindViewSchema = /* @__PURE__ */ picklist([
			"timeout",
			"model",
			"format",
			"evidence",
			"unsafe"
		]);
		/** 证据来自的一次任务。 */
		const SessionRefSchema = /* @__PURE__ */ object({
			sessionId: /* @__PURE__ */ string(),
			episodeId: /* @__PURE__ */ string(),
			at: /* @__PURE__ */ number(),
			goal: /* @__PURE__ */ string(),
			outcome: /* @__PURE__ */ string()
		});
		/** 收件箱里的一条建议。 */
		const ItemViewSchema = /* @__PURE__ */ object({
			id: /* @__PURE__ */ string(),
			kind: SignalKindViewSchema,
			state: ItemStateSchema,
			/** 模型给出的标题；未复核时为 null，界面用 goal 代替。 */
			title: Nullable(/* @__PURE__ */ string()),
			goal: /* @__PURE__ */ string(),
			/** 模型给出的理由。 */
			reason: Nullable(/* @__PURE__ */ string()),
			occurrences: /* @__PURE__ */ number(),
			sessions: /* @__PURE__ */ array(SessionRefSchema),
			score: /* @__PURE__ */ number(),
			detectedAt: /* @__PURE__ */ number(),
			updatedAt: /* @__PURE__ */ number(),
			decision: Nullable(DecisionSchema),
			/** 新建的 Skill 名称或要改进的 Skill。 */
			skill: Nullable(/* @__PURE__ */ string()),
			cautions: /* @__PURE__ */ array(/* @__PURE__ */ string()),
			failure: Nullable(/* @__PURE__ */ object({
				kind: FailureKindViewSchema,
				message: /* @__PURE__ */ string(),
				at: /* @__PURE__ */ number(),
				attempts: /* @__PURE__ */ number()
			})),
			write: Nullable(/* @__PURE__ */ object({
				at: /* @__PURE__ */ number(),
				scope: /* @__PURE__ */ picklist([
					"project",
					"user",
					"existing"
				]),
				skill: /* @__PURE__ */ string(),
				path: /* @__PURE__ */ string(),
				discovered: /* @__PURE__ */ boolean(),
				/** DSH 还没列出，后台仍在核对。 */
				checking: /* @__PURE__ */ boolean()
			})),
			dismissedSimilar: /* @__PURE__ */ boolean()
		});
		const InboxViewSchema = /* @__PURE__ */ object({
			status: /* @__PURE__ */ object({
				discovery: /* @__PURE__ */ boolean(),
				review: /* @__PURE__ */ boolean(),
				notify: /* @__PURE__ */ picklist(["badge", "quiet"]),
				scope: /* @__PURE__ */ picklist(["project", "user"]),
				model: Nullable(/* @__PURE__ */ object({
					provider: /* @__PURE__ */ string(),
					model: /* @__PURE__ */ string(),
					effort: Nullable(/* @__PURE__ */ string()),
					source: /* @__PURE__ */ picklist(["config", "default"])
				})),
				/** 本进程持有工作锁，负责分析与复核。 */
				lead: /* @__PURE__ */ boolean(),
				scanning: /* @__PURE__ */ boolean(),
				/** 回合已结束、等静默期过去后再分析的会话数。 */
				waiting: /* @__PURE__ */ number(),
				reviewing: Nullable(/* @__PURE__ */ string()),
				usage: /* @__PURE__ */ object({
					reviews: /* @__PURE__ */ number(),
					limit: /* @__PURE__ */ number(),
					inputTokens: /* @__PURE__ */ number(),
					outputTokens: /* @__PURE__ */ number()
				}),
				lastError: Nullable(/* @__PURE__ */ object({
					kind: /* @__PURE__ */ string(),
					message: /* @__PURE__ */ string(),
					at: /* @__PURE__ */ number()
				})),
				analyzed: /* @__PURE__ */ object({
					sessions: /* @__PURE__ */ number(),
					episodes: /* @__PURE__ */ number()
				})
			}),
			items: /* @__PURE__ */ array(ItemViewSchema)
		});
		/** 证据里的一次操作。 */
		const EvidenceOpSchema = /* @__PURE__ */ object({
			/** 证据编号，与模型引用一致，例如 `E1.42`。 */
			ref: /* @__PURE__ */ string(),
			kind: /* @__PURE__ */ picklist([
				"read",
				"edit",
				"exec",
				"delegate"
			]),
			label: /* @__PURE__ */ string(),
			ok: /* @__PURE__ */ boolean(),
			exit: Nullable(/* @__PURE__ */ number()),
			error: Nullable(/* @__PURE__ */ string()),
			/** 在结果判定或恢复链里的角色。 */
			role: Nullable(/* @__PURE__ */ picklist([
				"verify",
				"failure",
				"fix",
				"recovered"
			])),
			/** 模型的结论引用了它。 */
			cited: /* @__PURE__ */ boolean()
		});
		const EvidenceEpisodeSchema = /* @__PURE__ */ object({
			ref: /* @__PURE__ */ string(),
			episodeId: /* @__PURE__ */ string(),
			sessionId: /* @__PURE__ */ string(),
			at: /* @__PURE__ */ number(),
			cwd: Nullable(/* @__PURE__ */ string()),
			goal: /* @__PURE__ */ string(),
			outcome: /* @__PURE__ */ string(),
			reads: /* @__PURE__ */ number(),
			ops: /* @__PURE__ */ array(EvidenceOpSchema),
			reply: Nullable(/* @__PURE__ */ string()),
			followup: Nullable(/* @__PURE__ */ string())
		});
		/** 可编辑的 Skill 字段。 */
		const SkillFieldsSchema = /* @__PURE__ */ object({
			name: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ trim(), /* @__PURE__ */ regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u), /* @__PURE__ */ maxLength(64)),
			description: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ trim(), /* @__PURE__ */ minLength(1), /* @__PURE__ */ maxLength(500)),
			whenToUse: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ trim(), /* @__PURE__ */ maxLength(500)),
			body: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ trim(), /* @__PURE__ */ minLength(1), /* @__PURE__ */ maxLength(2e4))
		});
		/** 一条建议的完整信息：证据、模型结论与草稿。 */
		const DetailViewSchema = /* @__PURE__ */ object({
			item: ItemViewSchema,
			episodes: /* @__PURE__ */ array(EvidenceEpisodeSchema),
			review: Nullable(/* @__PURE__ */ object({
				provider: /* @__PURE__ */ string(),
				model: /* @__PURE__ */ string(),
				at: /* @__PURE__ */ number(),
				inputTokens: /* @__PURE__ */ number(),
				outputTokens: /* @__PURE__ */ number()
			})),
			/** suggest_create 的草稿字段。 */
			draft: Nullable(SkillFieldsSchema),
			/** suggest_improve 的追加内容。 */
			section: Nullable(/* @__PURE__ */ string())
		});
		/** 写入前的预览。 */
		const PreviewViewSchema = /* @__PURE__ */ variant("kind", [/* @__PURE__ */ object({
			kind: /* @__PURE__ */ literal("create"),
			scope: /* @__PURE__ */ picklist(["project", "user"]),
			path: /* @__PURE__ */ string(),
			content: /* @__PURE__ */ string(),
			exists: /* @__PURE__ */ boolean()
		}), /* @__PURE__ */ object({
			kind: /* @__PURE__ */ literal("improve"),
			skill: /* @__PURE__ */ string(),
			path: Nullable(/* @__PURE__ */ string()),
			/** 目标在 DSH 扫描的项目或用户 Skill 目录里，可以写入。 */
			writable: /* @__PURE__ */ boolean(),
			before: /* @__PURE__ */ string(),
			after: /* @__PURE__ */ string(),
			baseHash: /* @__PURE__ */ string()
		})]);
		const ActionResultSchema = /* @__PURE__ */ variant("ok", [/* @__PURE__ */ object({
			ok: /* @__PURE__ */ literal(true),
			inbox: InboxViewSchema,
			preview: /* @__PURE__ */ optional(PreviewViewSchema)
		}), /* @__PURE__ */ object({
			ok: /* @__PURE__ */ literal(false),
			error: /* @__PURE__ */ object({
				kind: /* @__PURE__ */ picklist([
					"invalid",
					"missing",
					"busy",
					"no-model",
					"exists",
					"changed",
					"outside",
					"unsafe"
				]),
				message: /* @__PURE__ */ string()
			}),
			inbox: InboxViewSchema
		})]);
		/** 非 2xx 且不是操作失败的响应体。 */
		const ErrorBodySchema = /* @__PURE__ */ object({ error: /* @__PURE__ */ string() });
		//#endregion
		//#region src/client/api.ts
		/** 浏览器端访问 Host 路由：响应按 shared.ts 的 schema 校验。 */
		/** 解析响应；操作失败（409/404）也带收件箱，按结果返回而不是抛出。 */
		async function parse(response, schema, path) {
			const body = await response.json();
			const result = /* @__PURE__ */ safeParse(schema, body);
			if (result.success) return result.output;
			const error = /* @__PURE__ */ safeParse(ErrorBodySchema, body);
			throw new Error(error.success ? error.output.error : `${path} 返回了 ${String(response.status)}`);
		}
		/** 读取收件箱与工作状态。 */
		async function fetchInbox(signal) {
			return parse(await fetch(INBOX_PATH, {
				headers: { accept: "application/json" },
				cache: "no-store",
				...signal === void 0 ? {} : { signal }
			}), InboxViewSchema, INBOX_PATH);
		}
		/** 读取一条建议的证据与草稿。 */
		async function fetchDetail(id, signal) {
			return parse(await fetch(`${DETAIL_PATH}?${new URLSearchParams({ id }).toString()}`, {
				headers: { accept: "application/json" },
				cache: "no-store",
				...signal === void 0 ? {} : { signal }
			}), DetailViewSchema, DETAIL_PATH);
		}
		/** 提交一个操作。 */
		async function postAction(action) {
			return parse(await fetch(ACTION_PATH, {
				method: "POST",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(action)
			}), ActionResultSchema, ACTION_PATH);
		}
		//#endregion
		//#region \0dsh-css:src/client/dialog.module.css.mjs
		const css$3 = ".EFkxwG_dialog{box-sizing:border-box;border-radius:var(--dsw-radius-panel);background:var(--dsw-alias-bg-layer-2);width:min(760px,100% - 48px);max-width:none;height:min(720px,100% - 48px);max-height:none;box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);border:0;margin:auto;padding:0;font-size:14px;line-height:22px;overflow:hidden}.EFkxwG_dialog[open]{animation:EFkxwG_enter var(--ds-transition-duration,.2s) var(--ds-ease-in-out,ease);flex-direction:column;display:flex}.EFkxwG_dialog::backdrop{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);animation:EFkxwG_enter var(--ds-transition-duration,.2s) var(--ds-ease-in-out,ease)}.EFkxwG_dialog:focus{outline:none}@keyframes EFkxwG_enter{0%{opacity:0}to{opacity:1}}.EFkxwG_header{flex:none;justify-content:space-between;align-items:flex-start;gap:12px;padding:22px 14px 12px 24px;display:flex}.EFkxwG_heading{flex-direction:column;gap:2px;min-width:0;display:flex}.EFkxwG_title{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0;font-size:16px;font-weight:500;line-height:24px}.EFkxwG_subtitle{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.EFkxwG_close{border-radius:var(--dsw-radius-sm);width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}@media (hover:hover){.EFkxwG_close:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}}.EFkxwG_close:disabled{opacity:.4;cursor:default}.EFkxwG_close:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.EFkxwG_body{flex-direction:column;flex:auto;min-height:0;padding:2px 24px 16px;display:flex;overflow-y:auto}.EFkxwG_footer{border-top:.5px solid var(--dsw-alias-border-l2);flex-wrap:wrap;flex:none;align-items:center;gap:8px;padding:14px 24px 20px;display:flex}@media (prefers-reduced-motion:reduce){.EFkxwG_dialog[open],.EFkxwG_dialog::backdrop{animation:none}}";
		const tag$3 = "@agent-stash/dsh-skill-scout/dialog.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$3)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$3;
			style.textContent = css$3;
			document.head.appendChild(style);
		}
		var dialog_module_css_default = {
			"body": "EFkxwG_body",
			"close": "EFkxwG_close",
			"dialog": "EFkxwG_dialog",
			"enter": "EFkxwG_enter",
			"footer": "EFkxwG_footer",
			"header": "EFkxwG_header",
			"heading": "EFkxwG_heading",
			"subtitle": "EFkxwG_subtitle",
			"title": "EFkxwG_title"
		};
		//#endregion
		//#region src/client/dialog.tsx
		/**
		* 模态对话框：原生 `<dialog>` 加 `showModal()`，卡片外观取自宿主 `Modal`，宽度适合并排阅读证据与预览。
		* 挂上时进入 top layer，卸载时浏览器把焦点还给打开前的控件。初始焦点给带 `data-autofocus` 的控件。
		* `busy` 期间点遮罩、按 Escape 与关闭按钮都不生效。
		*/
		/** 点击落在卡片矩形之外，即遮罩上。 */
		function onBackdrop(event) {
			if (event.target !== event.currentTarget) return false;
			const box = event.currentTarget.getBoundingClientRect();
			return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
		}
		function Dialog({ title, closeLabel, subtitle, busy, onClose, children, footer }) {
			const element = (0, react.useRef)(null);
			const pressedOutside = (0, react.useRef)(false);
			const attach = (0, react.useCallback)((node) => {
				if (node === null) {
					element.current?.close();
					element.current = null;
					return;
				}
				element.current = node;
				if (!node.open) node.showModal();
				node.querySelector("[data-autofocus]")?.focus();
			}, []);
			const close = () => {
				if (!busy) onClose();
			};
			/** Escape 触发的 cancel 一律接管，忙时不关闭。 */
			const onCancel = (event) => {
				event.preventDefault();
				close();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dialog", {
				ref: attach,
				"aria-label": title,
				"aria-busy": busy || void 0,
				className: dialog_module_css_default.dialog,
				onCancel,
				onPointerDown: (event) => {
					pressedOutside.current = onBackdrop(event);
				},
				onClick: (event) => {
					if (pressedOutside.current && onBackdrop(event)) close();
					pressedOutside.current = false;
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: dialog_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: dialog_module_css_default.heading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: dialog_module_css_default.title,
								children: title
							}), subtitle !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: dialog_module_css_default.subtitle,
								children: subtitle
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: dialog_module_css_default.close,
							"aria-label": closeLabel,
							disabled: busy,
							onClick: close,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: dialog_module_css_default.body,
						children
					}),
					footer !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: dialog_module_css_default.footer,
						children: footer
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/detail.module.css.mjs
		const css$2 = ".FSsC8q_tabs{z-index:1;background:var(--dsw-alias-bg-layer-2);padding:0 0 12px;position:sticky;top:0}.FSsC8q_panel{min-width:0}.FSsC8q_stack{flex-direction:column;gap:14px;min-width:0;display:flex}.FSsC8q_heading{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;font-weight:600;line-height:18px}.FSsC8q_why p{color:var(--dsw-alias-label-primary);margin:4px 0 0;font-size:13px;line-height:20px}.FSsC8q_callout{border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-interactive-bg-hover);flex-direction:column;gap:8px;margin:0;padding:12px 14px;font-size:13px;line-height:20px;display:flex}.FSsC8q_callout p{margin:0}.FSsC8q_note{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.FSsC8q_caution{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-label);margin:0;padding:8px 12px;font-size:12px;line-height:18px}.FSsC8q_failure{color:var(--dsw-alias-state-error-label,var(--dsw-alias-state-warn-label));flex-direction:column;gap:2px;margin:0;font-size:13px;line-height:20px;display:flex}.FSsC8q_failureDetail{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;font-size:12px;line-height:18px}.FSsC8q_episode{border-top:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:12px 0 0;display:flex}.FSsC8q_episodeHead{align-items:flex-start;gap:10px;display:flex}.FSsC8q_ref{border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-interactive-bg-hover);min-width:24px;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums;flex:none;padding:1px 6px;font-size:11px;line-height:18px}.FSsC8q_episodeText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.FSsC8q_goal{-webkit-line-clamp:2;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;-webkit-box-orient:vertical;margin:0;font-size:13px;line-height:20px;display:-webkit-box;overflow:hidden}.FSsC8q_meta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:4px 10px;margin:0;font-size:12px;line-height:18px;display:flex}.FSsC8q_path{font-family:var(--dsw-font-family-mono,ui-monospace, monospace);font-size:11px}.FSsC8q_ops{flex-direction:column;margin:0;padding:0 0 0 34px;list-style:none;display:flex}.FSsC8q_op{border-radius:var(--dsw-radius-md);align-items:flex-start;gap:8px;padding:4px 8px;font-size:12px;line-height:18px;display:flex}.FSsC8q_op[data-cited]{background:var(--dsw-alias-interactive-bg-hover)}.FSsC8q_opGlyph{width:14px;height:18px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}.FSsC8q_op[data-ok=false] .FSsC8q_opGlyph{color:var(--dsw-alias-state-warn-label)}.FSsC8q_opBody{flex-wrap:wrap;flex:1;align-items:baseline;gap:2px 8px;min-width:0;display:flex}.FSsC8q_opLabel{min-width:0;font-family:var(--dsw-font-family-mono,ui-monospace, monospace);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-size:12px}.FSsC8q_opLabel[data-kind=edit]{color:var(--dsw-alias-label-secondary)}.FSsC8q_opTags{flex-wrap:wrap;gap:4px;display:inline-flex}.FSsC8q_tag{border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);padding:0 6px;font-size:11px;line-height:16px}.FSsC8q_tag[data-cited]{color:var(--dsw-alias-state-business-primary)}.FSsC8q_opError{color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-family-mono,ui-monospace, monospace);overflow-wrap:anywhere;flex-basis:100%;font-size:11px}.FSsC8q_opRef{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary));font-variant-numeric:tabular-nums;flex:none;font-size:11px}.FSsC8q_toolbar{justify-content:space-between;align-items:center;gap:8px;display:flex}.FSsC8q_facts{grid-template-columns:max-content 1fr;gap:4px 16px;margin:0;font-size:13px;line-height:20px;display:grid}.FSsC8q_facts dt{color:var(--dsw-alias-label-tertiary)}.FSsC8q_facts dd{overflow-wrap:anywhere;min-width:0;margin:0}.FSsC8q_markdown{border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);padding:4px 16px}.FSsC8q_editor{flex-direction:column;gap:12px;display:flex}.FSsC8q_field{flex-direction:column;gap:4px;display:flex}.FSsC8q_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}.FSsC8q_input{box-sizing:border-box;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));width:100%;box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;resize:vertical;border:0;padding:7px 10px;font-size:13px;line-height:20px}.FSsC8q_input:focus-visible{box-shadow:0 0 0 1.5px var(--dsw-alias-state-business-primary);outline:none}.FSsC8q_mono{font-family:var(--dsw-font-family-mono,ui-monospace, monospace);font-size:12px;line-height:18px}.FSsC8q_spacer{flex:1}.FSsC8q_actionError{color:var(--dsw-alias-state-error-label,var(--dsw-alias-state-warn-label));flex-basis:100%;margin:0;font-size:12px;line-height:18px}.FSsC8q_written{min-width:0;color:var(--dsw-alias-label-secondary);flex-direction:column;margin:0;font-size:12px;line-height:18px;display:flex}.FSsC8q_writtenPath{color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family-mono,ui-monospace, monospace);overflow-wrap:anywhere}";
		const tag$2 = "@agent-stash/dsh-skill-scout/detail.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$2)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$2;
			style.textContent = css$2;
			document.head.appendChild(style);
		}
		var detail_module_css_default = {
			"actionError": "FSsC8q_actionError",
			"callout": "FSsC8q_callout",
			"caution": "FSsC8q_caution",
			"editor": "FSsC8q_editor",
			"episode": "FSsC8q_episode",
			"episodeHead": "FSsC8q_episodeHead",
			"episodeText": "FSsC8q_episodeText",
			"facts": "FSsC8q_facts",
			"failure": "FSsC8q_failure",
			"failureDetail": "FSsC8q_failureDetail",
			"field": "FSsC8q_field",
			"fieldLabel": "FSsC8q_fieldLabel",
			"goal": "FSsC8q_goal",
			"heading": "FSsC8q_heading",
			"input": "FSsC8q_input",
			"markdown": "FSsC8q_markdown",
			"meta": "FSsC8q_meta",
			"mono": "FSsC8q_mono",
			"note": "FSsC8q_note",
			"op": "FSsC8q_op",
			"opBody": "FSsC8q_opBody",
			"opError": "FSsC8q_opError",
			"opGlyph": "FSsC8q_opGlyph",
			"opLabel": "FSsC8q_opLabel",
			"opRef": "FSsC8q_opRef",
			"ops": "FSsC8q_ops",
			"opTags": "FSsC8q_opTags",
			"panel": "FSsC8q_panel",
			"path": "FSsC8q_path",
			"ref": "FSsC8q_ref",
			"spacer": "FSsC8q_spacer",
			"stack": "FSsC8q_stack",
			"tabs": "FSsC8q_tabs",
			"tag": "FSsC8q_tag",
			"toolbar": "FSsC8q_toolbar",
			"why": "FSsC8q_why",
			"written": "FSsC8q_written",
			"writtenPath": "FSsC8q_writtenPath"
		};
		//#endregion
		//#region src/client/format.ts
		const MINUTE = 6e4;
		const HOUR = 60 * MINUTE;
		const DAY = 24 * HOUR;
		/** 相对时间：刚刚、N 分钟前、N 小时前、N 天前。 */
		function ago(t, at, now) {
			const elapsed = Math.max(0, now - at);
			if (elapsed < MINUTE) return t("time.now");
			if (elapsed < HOUR) return t("time.minutes", { count: Math.floor(elapsed / MINUTE) });
			if (elapsed < DAY) return t("time.hours", { count: Math.floor(elapsed / HOUR) });
			return t("time.days", { count: Math.floor(elapsed / DAY) });
		}
		/** 「N 个会话」。 */
		function sessionCount(t, count) {
			return t(count === 1 ? "meta.sessions.one" : "meta.sessions.other", { count });
		}
		/** 卡片标题：模型标题，未复核时用用户请求。 */
		function titleOf(item) {
			return item.title ?? item.goal;
		}
		/** 一行元信息：信号类型 · 会话数 · 时间。 */
		function metaOf(t, item, now) {
			return [
				t(`kind.${item.kind}`),
				sessionCount(t, item.occurrences),
				ago(t, item.updatedAt, now)
			].join(" · ");
		}
		/** 按状态分组：可保存、本地发现（含复核中与失败）、历史。 */
		function groupItems(items) {
			return {
				ready: items.filter((item) => item.state === "ready"),
				found: items.filter((item) => item.state === "detected" || item.state === "reviewing" || item.state === "failed"),
				history: items.filter((item) => item.state === "written" || item.state === "skipped" || item.state === "dismissed")
			};
		}
		/** 把 `~` 开头之外的长路径缩短到末尾几段。 */
		function shortPath(path) {
			const parts = path.split("/");
			return parts.length <= 4 ? path : `…/${parts.slice(-4).join("/")}`;
		}
		//#endregion
		//#region src/client/detail.tsx
		/**
		* 一条建议的详情：证据、Skill 预览与编辑、文件改动，以及保存、忽略、撤销。
		* 证据与草稿从 Host 读取；建议的状态跟随收件箱刷新，状态或更新时间变化时重新读取详情。
		*/
		function message(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/** Markdown 与 diff 视图的文案。 */
		function useLabels(t) {
			return (0, react.useMemo)(() => {
				const toolbar = {
					codeLabel: t("code.label"),
					wrapLabel: t("code.wrap"),
					unwrapLabel: t("code.unwrap")
				};
				return {
					markdown: {
						code: {
							copyLabel: t("code.copy"),
							copiedLabel: t("code.copied"),
							toolbarLabels: toolbar
						},
						footnotes: t("code.footnotes")
					},
					diff: {
						...toolbar,
						copy: t("code.copy"),
						copied: t("code.copied"),
						collapse: t("diff.collapse"),
						collapseAria: t("diff.collapseAria"),
						expand: (count) => t("diff.expand", { count }),
						expandAria: (count) => t("diff.expand", { count })
					}
				};
			}, [t]);
		}
		const ROLE_KEYS = {
			verify: "role.verify",
			failure: "role.failure",
			fix: "role.fix",
			recovered: "role.recovered"
		};
		function Episode({ episode, now, openSession, t }) {
			const outcome = `outcome.${episode.outcome}`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: detail_module_css_default.episode,
				"aria-label": episode.goal,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.episodeHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.ref,
								children: episode.ref
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.episodeText,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: detail_module_css_default.goal,
									children: episode.goal
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: detail_module_css_default.meta,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											"data-outcome": episode.outcome,
											children: isKey(outcome) ? t(outcome) : episode.outcome
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: ago(t, episode.at, now) }),
										episode.cwd !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: detail_module_css_default.path,
											children: shortPath(episode.cwd)
										})
									]
								})]
							}),
							openSession !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => openSession(episode.sessionId),
								children: t("detail.openSession")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: detail_module_css_default.ops,
						"aria-label": t("evidence.list", { ref: episode.ref }),
						children: episode.ops.map((op) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: detail_module_css_default.op,
							"data-ok": op.ok,
							"data-cited": op.cited || void 0,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: detail_module_css_default.opGlyph,
									"aria-hidden": "true",
									children: op.ok ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: detail_module_css_default.opBody,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											className: detail_module_css_default.opLabel,
											"data-kind": op.kind,
											children: op.label
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: detail_module_css_default.opTags,
											children: [
												op.role !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: detail_module_css_default.tag,
													children: t(ROLE_KEYS[op.role])
												}),
												op.cited && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: detail_module_css_default.tag,
													"data-cited": "",
													children: t("role.cited")
												}),
												op.exit !== null && op.exit !== 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: detail_module_css_default.tag,
													children: t("evidence.exit", { code: op.exit })
												})
											]
										}),
										op.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: detail_module_css_default.opError,
											children: op.error
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: detail_module_css_default.opRef,
									children: op.ref
								})
							]
						}, op.ref))
					}),
					episode.reads > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.note,
						children: t(episode.reads === 1 ? "evidence.reads.one" : "evidence.reads.other", { count: episode.reads })
					}),
					episode.followup !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: detail_module_css_default.note,
						children: [
							t("evidence.followup"),
							": ",
							episode.followup
						]
					})
				]
			});
		}
		const KEYS = /* @__PURE__ */ new Set([
			"outcome.verified",
			"outcome.succeeded",
			"outcome.unverified",
			"outcome.disputed",
			"outcome.failed",
			"outcome.aborted"
		]);
		function isKey(key) {
			return KEYS.has(key);
		}
		function FieldsEditor({ fields, onChange, t }) {
			const id = (0, react.useId)();
			const field = (key, rows, mono = false) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: detail_module_css_default.field,
				htmlFor: `${id}-${key}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: detail_module_css_default.fieldLabel,
					children: t(`skill.${key}`)
				}), rows === 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: `${id}-${key}`,
					className: detail_module_css_default.input,
					value: fields[key],
					spellCheck: false,
					onChange: (event) => onChange({
						...fields,
						[key]: event.target.value
					})
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					id: `${id}-${key}`,
					className: mono ? `${detail_module_css_default.input} ${detail_module_css_default.mono}` : detail_module_css_default.input,
					rows,
					value: fields[key],
					onChange: (event) => onChange({
						...fields,
						[key]: event.target.value
					})
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: detail_module_css_default.editor,
				children: [
					field("name", 1),
					field("description", 2),
					field("whenToUse", 2),
					field("body", 14, true)
				]
			});
		}
		/** 一条建议的详情对话框。 */
		function Detail({ id, item, inbox, loadDetail, modelName, defaultScope, openSession, t, onClose }) {
			const tabsId = (0, react.useId)();
			const labels = useLabels(t);
			const [detail, setDetail] = (0, react.useState)({ status: "loading" });
			const [tab, setTab] = (0, react.useState)("evidence");
			const [scope, setScope] = (0, react.useState)(defaultScope);
			const [editing, setEditing] = (0, react.useState)(false);
			const [fields, setFields] = (0, react.useState)(null);
			const [section, setSection] = (0, react.useState)(null);
			const [preview, setPreview] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [now] = (0, react.useState)(() => Date.now());
			const version = `${item.state}:${String(item.updatedAt)}`;
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				loadDetail(id, version, controller.signal).then((value) => {
					if (controller.signal.aborted) return;
					setDetail({
						status: "ready",
						value
					});
				}, (reason) => {
					if (controller.signal.aborted) return;
					setDetail({
						status: "error",
						error: message(reason)
					});
				});
				return () => controller.abort();
			}, [
				id,
				version,
				loadDetail
			]);
			const value = detail.status === "ready" ? detail.value : null;
			const create = item.decision === "suggest_create";
			const improve = item.decision === "suggest_improve";
			const reviewed = create || improve;
			const draft = fields ?? value?.draft ?? null;
			const shownSection = section ?? value?.section ?? null;
			const parsed = draft === null ? null : /* @__PURE__ */ safeParse(SkillFieldsSchema, draft);
			const invalid = create && parsed !== null && !parsed.success;
			const wantPreview = reviewed && item.state === "ready" && value !== null;
			(0, react.useEffect)(() => {
				if (!wantPreview || invalid) return void 0;
				let stale = false;
				const timer = setTimeout(() => {
					setPreview((current) => current === null ? { status: "loading" } : current);
					const action = {
						action: "preview",
						id,
						...create ? { scope } : {},
						...fields === null ? {} : { fields },
						...section === null ? {} : { section }
					};
					inbox.act(action).then((result) => {
						if (stale) return;
						if (result.ok && result.preview !== void 0) setPreview({
							status: "ready",
							value: result.preview
						});
						else setPreview({
							status: "error",
							error: result.ok ? "" : t(`error.${result.error.kind}`)
						});
					}, (reason) => {
						if (!stale) setPreview({
							status: "error",
							error: message(reason)
						});
					});
				}, fields === null && section === null ? 0 : 300);
				return () => {
					stale = true;
					clearTimeout(timer);
				};
			}, [
				wantPreview,
				invalid,
				id,
				create,
				scope,
				fields,
				section,
				inbox,
				t
			]);
			const run = async (kind, action, notice) => {
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
			const dismiss = async (similar) => {
				if (await run("dismiss", {
					action: "dismiss",
					id,
					similar
				}, {
					key: similar ? "notice.dismissedSimilar" : "notice.dismissed",
					params: {},
					undo: {
						action: "restore",
						id
					}
				})) onClose();
			};
			const save = async () => {
				if (await run("save", {
					action: "write",
					id,
					...create ? { scope } : {},
					...fields === null ? {} : { fields },
					...section === null ? {} : { section },
					...preview?.status === "ready" && preview.value.kind === "improve" ? { baseHash: preview.value.baseHash } : {}
				}, {
					key: "notice.written",
					params: { skill: draft?.name ?? skillName },
					undo: {
						action: "undo",
						id
					}
				})) {
					setEditing(false);
					setPreview(null);
				}
			};
			const tabs = [{
				value: "evidence",
				label: t("detail.tab.evidence")
			}, ...reviewed ? [{
				value: "skill",
				label: t("detail.tab.skill")
			}, ...item.state === "ready" ? [{
				value: "changes",
				label: t("detail.tab.changes")
			}] : []] : []];
			const activeTab = tabs.some((entry) => entry.value === tab) ? tab : "evidence";
			const subtitle = [
				t(`kind.${item.kind}`),
				sessionCount(t, item.occurrences),
				value?.review === null || value === null ? t(`state.${item.state}`) : t("detail.reviewedBy", { model: value.review.model })
			].join(" · ");
			const reviewPanel = () => {
				if (reviewed || item.state === "dismissed" || item.state === "written") return null;
				if (item.state === "skipped") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.callout,
					children: t("detail.skipped")
				});
				if (item.state === "reviewing") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.callout,
					role: "status",
					children: t("detail.reviewing", { model: modelName ?? "" })
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.callout,
					children: [
						item.failure !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: detail_module_css_default.failure,
							role: "alert",
							children: [t("detail.failed", { kind: t(`failure.${item.failure.kind}`) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.failureDetail,
								children: item.failure.message
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("detail.local") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: detail_module_css_default.note,
							children: modelName === null ? t("detail.noModel") : t("detail.reviewNote", {
								count: item.sessions.length,
								model: modelName
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							"data-autofocus": "",
							disabled: modelName === null || busy !== null,
							onClick: () => void run("review", {
								action: "analyze",
								id
							}),
							children: item.failure === null ? t("detail.review") : t("detail.retry")
						}) })
					]
				});
			};
			const evidence = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: detail_module_css_default.stack,
				children: [
					reviewPanel(),
					item.reason !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: detail_module_css_default.why,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: detail_module_css_default.heading,
							children: t("detail.why")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: item.reason })]
					}),
					item.cautions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.caution,
						role: "note",
						children: t("detail.cautions", { list: item.cautions.map((caution) => {
							const key = `caution.${caution}`;
							return isCaution(key) ? t(key) : caution;
						}).join(", ") })
					}),
					value?.episodes.map((episode) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Episode, {
						episode,
						now,
						openSession,
						t
					}, episode.episodeId))
				]
			});
			const skill = () => {
				if (create && draft !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.stack,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.toolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => setEditing(!editing),
							disabled: item.state !== "ready",
							children: editing ? t("skill.preview") : t("skill.edit")
						}), fields !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => setFields(null),
							children: t("skill.reset")
						})]
					}), editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldsEditor, {
						fields: draft,
						onChange: setFields,
						t
					}), invalid && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.failure,
						role: "alert",
						children: t("skill.invalid")
					})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
						className: detail_module_css_default.facts,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("skill.name") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: draft.name }) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("skill.description") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: draft.description }),
							draft.whenToUse !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("skill.whenToUse") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: draft.whenToUse })] })
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: detail_module_css_default.markdown,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
							text: draft.body,
							labels: labels.markdown
						})
					})] })]
				});
				if (improve && shownSection !== null) {
					const notWritable = preview?.status === "ready" && preview.value.kind === "improve" && !preview.value.writable;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.stack,
						children: [
							notWritable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: detail_module_css_default.caution,
								children: t("skill.notWritable", { skill: skillName })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.toolbar,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: detail_module_css_default.heading,
									children: t("skill.section", { skill: skillName })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => setEditing(!editing),
									disabled: item.state !== "ready",
									children: editing ? t("skill.preview") : t("skill.edit")
								})]
							}),
							editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: `${detail_module_css_default.input} ${detail_module_css_default.mono}`,
								"aria-label": t("skill.section", { skill: skillName }),
								rows: 12,
								value: shownSection,
								onChange: (event) => setSection(event.target.value)
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: detail_module_css_default.markdown,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
									text: shownSection,
									labels: labels.markdown
								})
							})
						]
					});
				}
				return null;
			};
			const changes = () => {
				if (preview === null || preview.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.note,
					role: "status",
					children: t("changes.loading")
				});
				if (preview.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.failure,
					role: "alert",
					children: t("changes.error", { error: preview.error })
				});
				const file = preview.value;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.stack,
					children: [file.kind === "create" && file.exists && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.caution,
						children: t("changes.exists")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DiffBlock, {
						diffs: [file.kind === "create" ? {
							path: file.path,
							oldText: null,
							newText: file.content
						} : {
							path: file.path ?? file.skill,
							oldText: file.before,
							newText: file.after
						}],
						labels: labels.diff,
						maxLines: 400
					})]
				});
			};
			const footer = () => {
				if (item.state === "written" && item.write !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: detail_module_css_default.written,
						role: "status",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: detail_module_css_default.writtenPath,
							children: t("written.path", { path: shortPath(item.write.path) })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: item.write.discovered ? t("written.discovered") : item.write.checking ? t("written.checking") : t("written.missing") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: detail_module_css_default.spacer }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "outline",
						disabled: busy !== null,
						onClick: () => void run("undo", {
							action: "undo",
							id
						}, {
							key: "notice.undone",
							params: { skill: item.write?.skill ?? skillName },
							undo: null
						}),
						children: t("action.undo")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "primary",
						onClick: onClose,
						"data-autofocus": "",
						children: t("action.done")
					})
				] });
				if (item.state === "dismissed") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: detail_module_css_default.spacer }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					disabled: busy !== null,
					onClick: () => void run("restore", {
						action: "restore",
						id
					}, {
						key: "notice.restored",
						params: {},
						undo: null
					}),
					children: t("action.restore")
				})] });
				const writable = !(preview?.status === "ready" && preview.value.kind === "improve" && !preview.value.writable);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						disabled: busy !== null,
						onClick: () => void dismiss(false),
						children: t("action.dismiss")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						disabled: busy !== null,
						onClick: () => void dismiss(true),
						children: t("action.dismissSimilar")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: detail_module_css_default.spacer }),
					item.state === "ready" && create && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
						id: `${tabsId}-scope`,
						label: t("scope.label"),
						value: scope,
						disabled: busy !== null,
						options: [{
							value: "project",
							label: t("scope.project")
						}, {
							value: "user",
							label: t("scope.user")
						}],
						onChange: setScope
					}),
					item.state === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "primary",
						"data-autofocus": "",
						disabled: busy !== null || invalid || !writable,
						onClick: () => void save(),
						children: busy === "save" ? t("action.saving") : create ? t("action.save") : t("action.improve", { skill: skillName })
					})
				] });
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Dialog, {
				title: titleOf(item),
				subtitle,
				closeLabel: t("detail.close"),
				busy: busy === "save" || busy === "undo",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.actionError,
					role: "alert",
					children: error
				}), footer()] }),
				children: [
					detail.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.note,
						role: "status",
						children: t("detail.loading")
					}),
					detail.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: detail_module_css_default.failure,
						role: "alert",
						children: [
							t("detail.error"),
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.failureDetail,
								children: detail.error
							})
						]
					}),
					value !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [tabs.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: detail_module_css_default.tabs,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: tabsId,
							label: t("detail.tabs"),
							value: activeTab,
							options: tabs,
							onChange: setTab
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.panel,
						role: tabs.length > 1 ? "tabpanel" : void 0,
						"aria-labelledby": tabs.length > 1 ? `${tabsId}-${activeTab}` : void 0,
						children: [
							activeTab === "evidence" && evidence(),
							activeTab === "skill" && skill(),
							activeTab === "changes" && changes()
						]
					})] })
				]
			});
		}
		const CAUTIONS = /* @__PURE__ */ new Set([
			"caution.sudo",
			"caution.force-push",
			"caution.no-verify",
			"caution.chmod-777",
			"caution.recursive-delete"
		]);
		function isCaution(key) {
			return CAUTIONS.has(key);
		}
		//#endregion
		//#region src/client/hooks.ts
		/** 订阅 Observable 的 React Hook。 */
		function useSnapshot(source) {
			return (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot, source.getSnapshot);
		}
		//#endregion
		//#region \0dsh-css:src/client/inbox.module.css.mjs
		const css$1 = ".Wfa-jG_root{margin-left:4px;position:relative}.Wfa-jG_trigger{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:28px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex;position:relative}.Wfa-jG_trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px;color:var(--dsw-alias-label-secondary)}@media (hover:hover){.Wfa-jG_trigger:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}}.Wfa-jG_trigger[aria-expanded=true]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}.Wfa-jG_trigger svg{flex:none}.Wfa-jG_badge{box-sizing:border-box;background:var(--dsw-alias-label-secondary);min-width:14px;height:14px;color:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));text-align:center;font-variant-numeric:tabular-nums;pointer-events:none;border-radius:7px;padding:0 3px;font-size:9px;font-weight:600;line-height:14px;position:absolute;top:1px;right:0}.Wfa-jG_panel{z-index:100;box-sizing:border-box;background:var(--dsw-specific-menu);width:360px;max-width:calc(100vw - 32px);max-height:min(480px,100vh - 140px);backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);animation:Wfa-jG_panel-in .14s var(--ds-ease-in-out,ease);border:0;border-radius:16px;flex-direction:column;padding:4px;display:flex;position:fixed}.Wfa-jG_panel:focus{outline:none}@keyframes Wfa-jG_panel-in{0%{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:none}}.Wfa-jG_head{flex:none;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px 6px 12px;display:flex}.Wfa-jG_title{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;font-weight:600;line-height:18px}.Wfa-jG_working{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.Wfa-jG_scroll{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;flex:auto;gap:6px;min-height:0;display:flex;overflow-y:auto}.Wfa-jG_section{flex-direction:column;display:flex}.Wfa-jG_sectionTitle{color:var(--dsw-alias-label-tertiary);margin:0;padding:5px 12px 2px;font-size:11px;font-weight:500;line-height:16px}.Wfa-jG_list{flex-direction:column;gap:1px;margin:0;padding:0;list-style:none;display:flex}.Wfa-jG_card{border-radius:10px;align-items:flex-start;gap:4px;display:flex;position:relative}@media (hover:hover){.Wfa-jG_card:hover{background:var(--dsw-alias-interactive-bg-hover)}}.Wfa-jG_open{min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:10px;flex-direction:column;flex:1;gap:2px;padding:8px 4px 8px 12px;display:flex}.Wfa-jG_open:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.Wfa-jG_cardTitle{-webkit-line-clamp:2;overflow-wrap:anywhere;-webkit-box-orient:vertical;font-size:13px;line-height:18px;display:-webkit-box;overflow:hidden}.Wfa-jG_card[data-state=detected] .Wfa-jG_cardTitle,.Wfa-jG_card[data-state=failed] .Wfa-jG_cardTitle,.Wfa-jG_card[data-state=reviewing] .Wfa-jG_cardTitle{color:var(--dsw-alias-label-secondary)}.Wfa-jG_cardMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:2px 6px;font-size:11px;line-height:16px;display:flex}.Wfa-jG_state{color:var(--dsw-alias-label-secondary)}.Wfa-jG_card[data-state=failed] .Wfa-jG_state{color:var(--dsw-alias-state-warn-label)}.Wfa-jG_dismiss{width:22px;height:22px;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0;background:0 0;border:0;border-radius:6px;flex:none;justify-content:center;align-items:center;margin:7px 6px 0 0;padding:0;display:inline-flex}.Wfa-jG_card:hover .Wfa-jG_dismiss,.Wfa-jG_card:focus-within .Wfa-jG_dismiss{opacity:1}.Wfa-jG_dismiss:focus-visible{opacity:1;outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}@media (hover:hover){.Wfa-jG_dismiss:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}}@media (hover:none){.Wfa-jG_dismiss{opacity:1}}.Wfa-jG_historyToggle{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;align-self:flex-start;margin:2px 0 2px 8px;padding:2px 4px;font-size:11px;line-height:16px}.Wfa-jG_historyToggle:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary)}@media (hover:hover){.Wfa-jG_historyToggle:hover{color:var(--dsw-alias-label-secondary)}}.Wfa-jG_banner{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:10px;margin:2px 4px 4px;padding:8px 10px;font-size:12px;line-height:18px}.Wfa-jG_empty{flex-direction:column;gap:4px;padding:10px 12px 14px;display:flex}.Wfa-jG_emptyTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;line-height:20px}.Wfa-jG_emptyBody{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}.Wfa-jG_caption{color:var(--dsw-alias-label-tertiary);margin:4px 0 0;padding:0 12px;font-size:11px;line-height:16px}.Wfa-jG_empty .Wfa-jG_caption{padding:0}.Wfa-jG_errorRow{color:var(--dsw-alias-state-warn-label);justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;font-size:12px;line-height:18px;display:flex}.Wfa-jG_link{color:var(--dsw-alias-state-business-primary);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;font-size:12px}.Wfa-jG_link:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;border-radius:4px}.Wfa-jG_notice{border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);flex:none;justify-content:space-between;align-items:center;gap:8px;margin-top:4px;padding:8px 12px;font-size:12px;line-height:18px;display:flex}.Wfa-jG_noticeText{overflow-wrap:anywhere;min-width:0}@media (prefers-reduced-motion:reduce){.Wfa-jG_panel{animation:none}}";
		const tag$1 = "@agent-stash/dsh-skill-scout/inbox.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$1)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$1;
			style.textContent = css$1;
			document.head.appendChild(style);
		}
		var inbox_module_css_default = {
			"badge": "Wfa-jG_badge",
			"banner": "Wfa-jG_banner",
			"caption": "Wfa-jG_caption",
			"card": "Wfa-jG_card",
			"cardMeta": "Wfa-jG_cardMeta",
			"cardTitle": "Wfa-jG_cardTitle",
			"dismiss": "Wfa-jG_dismiss",
			"empty": "Wfa-jG_empty",
			"emptyBody": "Wfa-jG_emptyBody",
			"emptyTitle": "Wfa-jG_emptyTitle",
			"errorRow": "Wfa-jG_errorRow",
			"head": "Wfa-jG_head",
			"historyToggle": "Wfa-jG_historyToggle",
			"link": "Wfa-jG_link",
			"list": "Wfa-jG_list",
			"notice": "Wfa-jG_notice",
			"noticeText": "Wfa-jG_noticeText",
			"open": "Wfa-jG_open",
			"panel": "Wfa-jG_panel",
			"panel-in": "Wfa-jG_panel-in",
			"root": "Wfa-jG_root",
			"scroll": "Wfa-jG_scroll",
			"section": "Wfa-jG_section",
			"sectionTitle": "Wfa-jG_sectionTitle",
			"state": "Wfa-jG_state",
			"title": "Wfa-jG_title",
			"trigger": "Wfa-jG_trigger",
			"working": "Wfa-jG_working"
		};
		//#endregion
		//#region src/client/inbox.tsx
		/**
		* 会话标题栏里的经验提炼入口：一个图标按钮，有新建议时带一个小计数；点开是收件箱浮层，
		* 点卡片打开详情对话框。入口在第一次读取完成前不渲染，避免标题栏闪动。
		* 计数只算打开收件箱之后出现的可保存建议，看过即清零。
		*/
		const SEEN_KEY = "agent-stash-skill-scout:seen";
		const SeenSchema = /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ parseJson(), /* @__PURE__ */ array(/* @__PURE__ */ string()));
		/**
		* 以 localStorage 保存看过的建议 id，只保留最近的一部分。
		* localStorage 是页面共享的外部存储：内容损坏时当作没有记录，写不进去（无痕模式、配额已满）时只记在内存里，
		* 两种情况都只影响角标计数。
		*/
		function createSeenStore(storage) {
			let memory = [];
			const read = () => {
				const raw = storage.getItem(SEEN_KEY);
				if (raw === null) return memory;
				const parsed = /* @__PURE__ */ safeParse(SeenSchema, raw);
				return parsed.success ? [.../* @__PURE__ */ new Set([...parsed.output, ...memory])] : memory;
			};
			return {
				has: (id) => read().includes(id),
				add(ids) {
					memory = [.../* @__PURE__ */ new Set([...read(), ...ids])].slice(-200);
					try {
						storage.setItem(SEEN_KEY, JSON.stringify(memory));
					} catch (error) {
						if (!(error instanceof DOMException)) throw error;
					}
				}
			};
		}
		const MEASURE_STYLE = {
			visibility: "hidden",
			left: 0,
			top: 0
		};
		/** 新建议数：可保存且还没看过。 */
		function unseen(inbox, seen) {
			if (inbox === null) return 0;
			return inbox.items.filter((item) => item.state === "ready" && !seen.has(item.id)).length;
		}
		function Card({ item, now, t, onOpen, onDismiss }) {
			const title = titleOf(item);
			const showState = item.state !== "ready";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: inbox_module_css_default.card,
				"data-state": item.state,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: inbox_module_css_default.open,
					"data-item": item.id,
					onClick: () => onOpen(item.id),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: inbox_module_css_default.cardTitle,
						children: title
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: inbox_module_css_default.cardMeta,
						children: [showState && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: inbox_module_css_default.state,
							children: t(`state.${item.state}`)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: metaOf(t, item, now) })]
					})]
				}), onDismiss !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: inbox_module_css_default.dismiss,
					"aria-label": `${t("action.dismiss")}: ${title}`,
					title: t("action.dismiss"),
					onClick: () => onDismiss(item.id),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
				})]
			});
		}
		function Banner({ inbox, t }) {
			const { status } = inbox;
			const pending = inbox.items.some((item) => item.state === "detected" || item.state === "failed");
			let key = null;
			if (!status.discovery) key = "banner.discoveryOff";
			else if (status.model === null && pending) key = "banner.noModel";
			else if (!status.lead) key = "banner.secondary";
			if (key === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: inbox_module_css_default.banner,
				children: t(key)
			});
		}
		function PanelBody({ inbox, now, t, onOpen, onDismiss }) {
			const [history, setHistory] = (0, react.useState)(false);
			const groups = groupItems(inbox.items);
			if (groups.ready.length === 0 && groups.found.length === 0 && groups.history.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: inbox_module_css_default.empty,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
						inbox,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: inbox_module_css_default.emptyTitle,
						children: t("panel.empty.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: inbox_module_css_default.emptyBody,
						children: t("panel.empty.body")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: inbox_module_css_default.caption,
						children: t("panel.analyzed", { sessions: inbox.status.analyzed.sessions })
					})
				]
			});
			const section = (key, items) => items.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: inbox_module_css_default.section,
				"aria-label": t(key),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: inbox_module_css_default.sectionTitle,
					children: t(key)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: inbox_module_css_default.list,
					children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
						item,
						now,
						t,
						onOpen,
						onDismiss: item.state === "reviewing" ? void 0 : onDismiss
					}, item.id))
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
					inbox,
					t
				}),
				section("section.ready", groups.ready),
				section("section.found", groups.found),
				groups.history.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: inbox_module_css_default.section,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: inbox_module_css_default.historyToggle,
						"aria-expanded": history,
						onClick: () => setHistory(!history),
						children: history ? t("history.hide") : t("history.show", { count: groups.history.length })
					}), history && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: inbox_module_css_default.list,
						children: groups.history.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
							item,
							now,
							t,
							onOpen
						}, item.id))
					})]
				})
			] });
		}
		/** 标题栏入口与收件箱浮层。 */
		function InboxEntry({ inbox, seen, loadDetail, openSession, t }) {
			const state = useSnapshot(inbox);
			const [open, setOpen] = (0, react.useState)(false);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const [detailId, setDetailId] = (0, react.useState)(null);
			/** 详情关闭、收件箱重新打开后要聚焦的卡片。 */
			const [returnTo, setReturnTo] = (0, react.useState)(null);
			const [, setSeenVersion] = (0, react.useState)(0);
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const position = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open,
				anchorRef: triggerRef,
				panelRef,
				side: "bottom",
				gap: 5,
				margin: 16
			});
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open && detailId === null, setOpen, panelRef);
			(0, react.useEffect)(() => {
				if (!open || returnTo === null || position === null) return;
				const panelElement = panelRef.current;
				(panelElement?.querySelector(`[data-item="${CSS.escape(returnTo)}"]`) ?? panelElement)?.focus();
			}, [
				open,
				returnTo,
				position
			]);
			(0, react.useEffect)(() => {
				if (!open || state.inbox === null) return;
				const ready = state.inbox.items.filter((item) => item.state === "ready").map((item) => item.id);
				if (ready.some((id) => !seen.has(id))) seen.add(ready);
			}, [
				open,
				state.inbox,
				seen
			]);
			if (state.inbox === null && state.status !== "error") return null;
			const fresh = unseen(state.inbox, seen);
			const badge = state.inbox?.status.notify === "badge" && fresh > 0;
			const label = fresh === 0 ? t("entry.label") : t(fresh === 1 ? "entry.count.one" : "entry.count.other", { count: fresh });
			const working = state.inbox !== null && (state.inbox.status.scanning || state.inbox.status.reviewing !== null);
			/** 打开收件箱：刷新状态，并把当前的可保存建议记为看过。 */
			const show = () => {
				const ready = state.inbox?.items.filter((item) => item.state === "ready").map((item) => item.id) ?? [];
				seen.add(ready);
				setSeenVersion((version) => version + 1);
				setNow(Date.now());
				setOpen(true);
				inbox.refresh();
			};
			const close = () => {
				setOpen(false);
				setReturnTo(null);
				setSeenVersion((version) => version + 1);
				triggerRef.current?.focus();
			};
			const onKeyDown = (event) => {
				if (event.key !== "Escape" || !open || detailId !== null) return;
				event.preventDefault();
				close();
			};
			const openDetail = (id) => {
				setOpen(false);
				setDetailId(id);
			};
			const closeDetail = () => {
				setReturnTo(detailId);
				setDetailId(null);
				show();
			};
			const dismiss = (id) => {
				inbox.act({
					action: "dismiss",
					id,
					similar: false
				}, {
					key: "notice.dismissed",
					params: {},
					undo: {
						action: "restore",
						id
					}
				});
			};
			const detailItem = detailId === null ? void 0 : state.inbox?.items.find((item) => item.id === detailId);
			const notice = state.notice;
			const panel = open ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: panelRef,
				className: inbox_module_css_default.panel,
				style: position ?? MEASURE_STYLE,
				role: "dialog",
				"aria-label": t("panel.title"),
				tabIndex: -1,
				onKeyDown,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: inbox_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: inbox_module_css_default.title,
							children: t("panel.title")
						}), working && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: inbox_module_css_default.working,
							role: "status",
							children: state.inbox?.status.reviewing === null ? t("panel.analyzing") : t("panel.reviewing")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: inbox_module_css_default.scroll,
						children: [
							state.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: inbox_module_css_default.errorRow,
								role: "alert",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.error") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: inbox_module_css_default.link,
									onClick: () => void inbox.refresh(),
									children: t("panel.retry")
								})]
							}),
							state.inbox === null && state.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: inbox_module_css_default.caption,
								role: "status",
								children: t("panel.loading")
							}),
							state.inbox !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelBody, {
								inbox: state.inbox,
								now,
								t,
								onOpen: openDetail,
								onDismiss: dismiss
							})
						]
					}),
					notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: inbox_module_css_default.notice,
						role: "status",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: inbox_module_css_default.noticeText,
							children: t(notice.key, notice.params)
						}), notice.undo !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: inbox_module_css_default.link,
							onClick: () => {
								const action = notice.undo;
								inbox.clearNotice();
								if (action !== null) inbox.act(action);
							},
							children: t("notice.undo")
						})]
					})
				]
			}), document.body) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: inbox_module_css_default.root,
				onKeyDown,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						ref: triggerRef,
						type: "button",
						className: inbox_module_css_default.trigger,
						"aria-label": label,
						"aria-expanded": open,
						"aria-haspopup": "dialog",
						title: t("entry.label"),
						onClick: () => open ? close() : show(),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutlineRegular, { size: 16 }), badge && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: inbox_module_css_default.badge,
							"aria-hidden": "true",
							children: fresh > 9 ? "9+" : fresh
						})]
					}),
					panel,
					detailId !== null && detailItem !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Detail, {
						id: detailId,
						item: detailItem,
						inbox,
						loadDetail,
						modelName: state.inbox?.status.model?.model ?? null,
						defaultScope: state.inbox?.status.scope ?? "project",
						openSession,
						t,
						onClose: closeDetail
					})
				]
			});
		}
		//#endregion
		//#region src/client/locale.ts
		const SCOUT_LOCALE = "agent-stash-skill-scout";
		/** 两种语言的字典。 */
		const SCOUT_DICTIONARIES = {
			en: {
				"entry.label": "Skill suggestions",
				"entry.count.one": "Skill suggestions, {count} new",
				"entry.count.other": "Skill suggestions, {count} new",
				"panel.title": "Skill suggestions",
				"panel.analyzing": "Analyzing sessions",
				"panel.reviewing": "Reviewing",
				"panel.loading": "Loading",
				"panel.error": "Could not load suggestions.",
				"panel.retry": "Retry",
				"panel.empty.title": "No suggestions",
				"panel.empty.body": "A suggestion appears when a workflow repeats across sessions or a fix passes a check.",
				"panel.analyzed": "{sessions} sessions analyzed",
				"section.ready": "Ready to save",
				"section.found": "Found locally",
				"history.show": "History ({count})",
				"history.hide": "Hide history",
				"banner.noModel": "No review model is available. Choose one in Skill Scout settings.",
				"banner.reviewOff": "Background review is off. Open a finding to review it.",
				"banner.discoveryOff": "Session analysis is off.",
				"banner.secondary": "Another DSH window is analyzing sessions.",
				"notice.dismissed": "Dismissed",
				"notice.dismissedSimilar": "Dismissed this and similar suggestions",
				"notice.restored": "Restored",
				"notice.written": "Saved {skill}",
				"notice.undone": "Undid the change to {skill}",
				"notice.undo": "Undo",
				"kind.repeated": "Repeated workflow",
				"kind.recovery": "Verified fix",
				"kind.complex": "Long verified task",
				"meta.sessions.one": "{count} session",
				"meta.sessions.other": "{count} sessions",
				"state.detected": "Not reviewed",
				"state.reviewing": "Reviewing",
				"state.ready": "Ready",
				"state.skipped": "Not worth saving",
				"state.failed": "Review failed",
				"state.dismissed": "Dismissed",
				"state.written": "Saved",
				"time.now": "just now",
				"time.minutes": "{count} min ago",
				"time.hours": "{count} h ago",
				"time.days": "{count} d ago",
				"detail.close": "Close",
				"detail.tab.evidence": "Evidence",
				"detail.tab.skill": "Skill",
				"detail.tab.changes": "Changes",
				"detail.tabs": "Suggestion sections",
				"detail.why": "Why",
				"detail.loading": "Loading the evidence",
				"detail.error": "Could not load this suggestion.",
				"detail.reviewedBy": "Reviewed by {model}",
				"detail.local": "Found by local rules from tool results. Not reviewed yet.",
				"detail.reviewNote": "Review sends a redacted summary of {count} tasks to {model}: requests, commands, exit codes, and one error line per failed command.",
				"detail.review": "Review with model",
				"detail.reviewing": "Reviewing with {model}",
				"detail.noModel": "No review model is available.",
				"detail.skipped": "The review found nothing worth saving.",
				"detail.failed": "Review failed: {kind}",
				"detail.retry": "Review again",
				"detail.openSession": "Open session",
				"detail.cautions": "Check before saving: {list}",
				"failure.timeout": "timed out",
				"failure.model": "model error",
				"failure.format": "the reply did not match the expected format",
				"failure.evidence": "the reply was not supported by the evidence",
				"failure.unsafe": "the reply contained unsafe content",
				"outcome.verified": "Check passed",
				"outcome.succeeded": "Succeeded",
				"outcome.unverified": "Unverified",
				"outcome.disputed": "User disagreed",
				"outcome.failed": "Failed",
				"outcome.aborted": "Cancelled",
				"role.verify": "check passed",
				"role.failure": "failed",
				"role.fix": "fix",
				"role.recovered": "passed after fix",
				"role.cited": "cited",
				"evidence.reads.one": "{count} read not shown",
				"evidence.reads.other": "{count} reads not shown",
				"evidence.exit": "exit {code}",
				"evidence.followup": "Next message",
				"evidence.list": "Operations in task {ref}",
				"caution.sudo": "uses sudo",
				"caution.force-push": "force-pushes",
				"caution.no-verify": "skips hooks",
				"caution.chmod-777": "chmod 777",
				"caution.recursive-delete": "deletes recursively",
				"skill.name": "Name",
				"skill.description": "Description",
				"skill.whenToUse": "When to use",
				"skill.body": "Instructions",
				"skill.edit": "Edit",
				"skill.preview": "Preview",
				"skill.reset": "Reset",
				"skill.invalid": "Name must be lowercase words joined by hyphens; description and instructions are required.",
				"skill.section": "Section added to {skill}",
				"skill.notWritable": "{skill} is not in a project or user Skill folder, so Skill Scout cannot change it.",
				"changes.loading": "Preparing the file",
				"changes.error": "Could not prepare the file: {error}",
				"changes.exists": "A file already exists at this path.",
				"scope.label": "Save to",
				"scope.project": "Project",
				"scope.user": "User",
				"action.save": "Save Skill",
				"action.improve": "Add to {skill}",
				"action.saving": "Saving",
				"action.dismiss": "Dismiss",
				"action.dismissSimilar": "Dismiss similar",
				"action.restore": "Restore",
				"action.undo": "Undo",
				"action.done": "Done",
				"written.path": "Saved to {path}",
				"written.discovered": "DSH lists the Skill.",
				"written.checking": "Waiting for DSH to list the Skill.",
				"written.missing": "DSH does not list the Skill yet. Check the file.",
				"error.invalid": "This action does not apply to the suggestion in its current state.",
				"error.missing": "The suggestion no longer exists.",
				"error.busy": "Another review is running. Try again when it finishes.",
				"error.no-model": "No review model is available.",
				"error.exists": "A Skill file already exists at that path.",
				"error.changed": "The file changed after the preview. Nothing was written.",
				"error.outside": "The target is outside the project and user Skill folders.",
				"error.unsafe": "The content contains a credential. Remove it and try again.",
				"error.request": "The request failed: {error}",
				"code.copy": "Copy",
				"code.copied": "Copied",
				"code.label": "Code",
				"code.wrap": "Wrap lines",
				"code.unwrap": "Do not wrap lines",
				"code.footnotes": "Footnotes",
				"diff.collapse": "Collapse",
				"diff.collapseAria": "Collapse the diff",
				"diff.expand": "Show {count} more lines",
				"settings.summary": "Suggests Skills from workflows that worked in finished sessions.",
				"settings.unavailable": "Settings are not available.",
				"settings.readOnly": "This profile is read-only.",
				"settings.saveFailed": "Could not save. The settings changed elsewhere or the write was refused.",
				"settings.save": "Save",
				"settings.saving": "Saving",
				"settings.section.discovery": "Discovery",
				"settings.section.review": "Model review",
				"settings.section.limits": "Limits",
				"settings.section.privacy": "Privacy",
				"settings.section.inbox": "Inbox",
				"settings.discovery": "Analyze finished sessions",
				"settings.discoveryHint": "Runs on this machine and reads only the session logs DSH already keeps.",
				"settings.review": "Review in the background",
				"settings.reviewHint": "Sends redacted evidence of strong findings to the review model. When off, a review runs only when you ask for one.",
				"settings.model": "Review model",
				"settings.modelHint": "The default follows the Agent's default model.",
				"settings.modelDefault": "Default ({model})",
				"settings.modelDefaultUnknown": "Default model",
				"settings.modelLoading": "Loading models",
				"settings.modelError": "Could not load the model list.",
				"settings.modelMissing": "{model} (not available)",
				"settings.effort": "Reasoning effort",
				"settings.effortHint": "Lower effort is cheaper and faster.",
				"settings.effortDefault": "Model default",
				"settings.timeout": "Timeout",
				"settings.timeoutHint": "Seconds before a review is abandoned.",
				"settings.dailyReviews": "Reviews per day",
				"settings.dailyReviewsHint": "Background reviews allowed each day.",
				"settings.reviewInterval": "Review interval",
				"settings.reviewIntervalHint": "Minutes between background reviews.",
				"settings.quietPeriod": "Quiet period",
				"settings.quietPeriodHint": "Minutes a session stays idle before it is analyzed.",
				"settings.historyDays": "History",
				"settings.historyDaysHint": "Days of past sessions to analyze.",
				"settings.maxSessions": "Startup scan",
				"settings.maxSessionsHint": "Past sessions read when DSH starts.",
				"settings.minOccurrences": "Repeats needed",
				"settings.minOccurrencesHint": "Independent sessions before a repeated workflow counts.",
				"settings.evidenceBudget": "Evidence budget",
				"settings.evidenceBudgetHint": "Characters of evidence sent with one review.",
				"settings.readOutput": "Include error lines",
				"settings.readOutputHint": "Keep one redacted line from each failed command as evidence.",
				"settings.redactPatterns": "Extra redaction",
				"settings.redactPatternsHint": "One regular expression per line. Matches are replaced before anything is stored or sent.",
				"settings.redactInvalid": "Line {line} is not a valid regular expression.",
				"settings.notify": "Header badge",
				"settings.notifyHint": "Show the number of new suggestions on the header icon.",
				"settings.notify.badge": "Count",
				"settings.notify.quiet": "Icon only",
				"settings.scope": "New Skills go to",
				"settings.scopeHint": "Project: .agents/skills in the repository. User: ~/.agents/skills.",
				"settings.prompt": "Review guidance",
				"settings.promptHint": "Replaces the built-in guidance. The reply format is always added.",
				"settings.promptPlaceholder": "Built-in guidance",
				"unit.seconds": "s",
				"unit.minutes": "min",
				"unit.days": "days",
				"unit.sessions": "sessions",
				"unit.characters": "chars"
			},
			zh: {
				"entry.label": "Skill 建议",
				"entry.count.one": "Skill 建议，{count} 条新建议",
				"entry.count.other": "Skill 建议，{count} 条新建议",
				"panel.title": "Skill 建议",
				"panel.analyzing": "正在分析会话",
				"panel.reviewing": "正在复核",
				"panel.loading": "正在加载",
				"panel.error": "无法加载建议。",
				"panel.retry": "重试",
				"panel.empty.title": "暂无建议",
				"panel.empty.body": "同一流程在多个会话里重复出现，或某次修复经检查命令验证后，这里会出现建议。",
				"panel.analyzed": "已分析 {sessions} 个会话",
				"section.ready": "可以保存",
				"section.found": "本地发现",
				"history.show": "历史（{count}）",
				"history.hide": "收起历史",
				"banner.noModel": "没有可用的复核模型，请在经验提炼的设置里选择。",
				"banner.reviewOff": "后台复核已关闭，打开一条发现即可手动复核。",
				"banner.discoveryOff": "会话分析已关闭。",
				"banner.secondary": "另一个 DSH 窗口正在分析会话。",
				"notice.dismissed": "已忽略",
				"notice.dismissedSimilar": "已忽略这条及类似建议",
				"notice.restored": "已恢复",
				"notice.written": "已保存 {skill}",
				"notice.undone": "已撤销对 {skill} 的改动",
				"notice.undo": "撤销",
				"kind.repeated": "重复流程",
				"kind.recovery": "已验证的修复",
				"kind.complex": "经验证的长任务",
				"meta.sessions.one": "{count} 个会话",
				"meta.sessions.other": "{count} 个会话",
				"state.detected": "未复核",
				"state.reviewing": "复核中",
				"state.ready": "可以保存",
				"state.skipped": "不值得保存",
				"state.failed": "复核失败",
				"state.dismissed": "已忽略",
				"state.written": "已保存",
				"time.now": "刚刚",
				"time.minutes": "{count} 分钟前",
				"time.hours": "{count} 小时前",
				"time.days": "{count} 天前",
				"detail.close": "关闭",
				"detail.tab.evidence": "证据",
				"detail.tab.skill": "Skill",
				"detail.tab.changes": "改动",
				"detail.tabs": "建议的内容",
				"detail.why": "理由",
				"detail.loading": "正在加载证据",
				"detail.error": "无法加载这条建议。",
				"detail.reviewedBy": "由 {model} 复核",
				"detail.local": "由本地规则依据工具结果发现，尚未复核。",
				"detail.reviewNote": "复核会把 {count} 个任务的脱敏摘要发给 {model}：用户请求、命令、退出码，以及每条失败命令的一行错误输出。",
				"detail.review": "用模型复核",
				"detail.reviewing": "{model} 正在复核",
				"detail.noModel": "没有可用的复核模型。",
				"detail.skipped": "复核认为没有值得保存的内容。",
				"detail.failed": "复核失败：{kind}",
				"detail.retry": "重新复核",
				"detail.openSession": "打开会话",
				"detail.cautions": "保存前请确认：{list}",
				"failure.timeout": "超时",
				"failure.model": "模型出错",
				"failure.format": "回复格式不符合约定",
				"failure.evidence": "回复没有证据支持",
				"failure.unsafe": "回复含有不安全的内容",
				"outcome.verified": "检查通过",
				"outcome.succeeded": "已完成",
				"outcome.unverified": "未验证",
				"outcome.disputed": "用户表示不对",
				"outcome.failed": "失败",
				"outcome.aborted": "已取消",
				"role.verify": "检查通过",
				"role.failure": "失败",
				"role.fix": "修复",
				"role.recovered": "修复后通过",
				"role.cited": "被引用",
				"evidence.reads.one": "另有 {count} 次读取未列出",
				"evidence.reads.other": "另有 {count} 次读取未列出",
				"evidence.exit": "退出码 {code}",
				"evidence.followup": "下一条消息",
				"evidence.list": "任务 {ref} 的操作",
				"caution.sudo": "使用 sudo",
				"caution.force-push": "强制推送",
				"caution.no-verify": "跳过钩子",
				"caution.chmod-777": "chmod 777",
				"caution.recursive-delete": "递归删除",
				"skill.name": "名称",
				"skill.description": "描述",
				"skill.whenToUse": "适用场景",
				"skill.body": "内容",
				"skill.edit": "编辑",
				"skill.preview": "预览",
				"skill.reset": "还原",
				"skill.invalid": "名称只能是用连字符连接的小写单词；描述与内容不能为空。",
				"skill.section": "追加到 {skill} 的内容",
				"skill.notWritable": "{skill} 不在项目或用户的 Skill 目录里，经验提炼无法修改它。",
				"changes.loading": "正在生成文件",
				"changes.error": "无法生成文件：{error}",
				"changes.exists": "这个路径已经有文件。",
				"scope.label": "保存到",
				"scope.project": "项目",
				"scope.user": "用户",
				"action.save": "保存 Skill",
				"action.improve": "追加到 {skill}",
				"action.saving": "正在保存",
				"action.dismiss": "忽略",
				"action.dismissSimilar": "忽略类似建议",
				"action.restore": "恢复",
				"action.undo": "撤销",
				"action.done": "完成",
				"written.path": "已保存到 {path}",
				"written.discovered": "DSH 已列出这个 Skill。",
				"written.checking": "正在等 DSH 列出这个 Skill。",
				"written.missing": "DSH 还没有列出这个 Skill，请检查文件。",
				"error.invalid": "这条建议当前的状态不支持这个操作。",
				"error.missing": "这条建议已不存在。",
				"error.busy": "另一条建议正在复核，完成后再试。",
				"error.no-model": "没有可用的复核模型。",
				"error.exists": "这个路径已经有 Skill 文件。",
				"error.changed": "预览之后文件被改过，没有写入任何内容。",
				"error.outside": "目标不在项目或用户的 Skill 目录里。",
				"error.unsafe": "内容里有凭据，删除后再试。",
				"error.request": "请求失败：{error}",
				"code.copy": "复制",
				"code.copied": "已复制",
				"code.label": "代码",
				"code.wrap": "自动换行",
				"code.unwrap": "不换行",
				"code.footnotes": "脚注",
				"diff.collapse": "收起",
				"diff.collapseAria": "收起改动",
				"diff.expand": "展开其余 {count} 行",
				"settings.summary": "从已结束会话里做成过的流程中提炼 Skill 建议。",
				"settings.unavailable": "设置不可用。",
				"settings.readOnly": "当前 profile 是只读的。",
				"settings.saveFailed": "保存失败：设置已在别处改动，或写入被拒绝。",
				"settings.save": "保存",
				"settings.saving": "正在保存",
				"settings.section.discovery": "发现",
				"settings.section.review": "模型复核",
				"settings.section.limits": "限额",
				"settings.section.privacy": "隐私",
				"settings.section.inbox": "收件箱",
				"settings.discovery": "分析已结束的会话",
				"settings.discoveryHint": "在本机运行，只读取 DSH 已保存的会话日志。",
				"settings.review": "后台复核",
				"settings.reviewHint": "把较强发现的脱敏证据发给复核模型。关闭时只在你手动要求时复核。",
				"settings.model": "复核模型",
				"settings.modelHint": "默认跟随 Agent 的默认模型。",
				"settings.modelDefault": "默认（{model}）",
				"settings.modelDefaultUnknown": "默认模型",
				"settings.modelLoading": "正在加载模型",
				"settings.modelError": "无法加载模型列表。",
				"settings.modelMissing": "{model}（不可用）",
				"settings.effort": "推理强度",
				"settings.effortHint": "强度越低，越便宜也越快。",
				"settings.effortDefault": "模型默认",
				"settings.timeout": "超时",
				"settings.timeoutHint": "单次复核等待的秒数。",
				"settings.dailyReviews": "每日复核次数",
				"settings.dailyReviewsHint": "每天允许的后台复核次数。",
				"settings.reviewInterval": "复核间隔",
				"settings.reviewIntervalHint": "两次后台复核之间的分钟数。",
				"settings.quietPeriod": "静默期",
				"settings.quietPeriodHint": "会话空闲多少分钟后开始分析。",
				"settings.historyDays": "历史范围",
				"settings.historyDaysHint": "分析最近多少天的会话。",
				"settings.maxSessions": "启动时扫描",
				"settings.maxSessionsHint": "DSH 启动时读取的历史会话数。",
				"settings.minOccurrences": "重复次数",
				"settings.minOccurrencesHint": "重复流程至少要出现在多少个独立会话里。",
				"settings.evidenceBudget": "证据上限",
				"settings.evidenceBudgetHint": "单次复核发送的证据字符数。",
				"settings.readOutput": "包含错误行",
				"settings.readOutputHint": "每条失败命令保留一行脱敏后的输出作为证据。",
				"settings.redactPatterns": "追加脱敏规则",
				"settings.redactPatternsHint": "每行一个正则表达式，匹配内容在存储与发送前被替换。",
				"settings.redactInvalid": "第 {line} 行不是有效的正则表达式。",
				"settings.notify": "标题栏角标",
				"settings.notifyHint": "在标题栏图标上显示新建议的数量。",
				"settings.notify.badge": "显示数量",
				"settings.notify.quiet": "只显示图标",
				"settings.scope": "新 Skill 保存到",
				"settings.scopeHint": "项目：仓库里的 .agents/skills。用户：~/.agents/skills。",
				"settings.prompt": "复核要求",
				"settings.promptHint": "替换内置的判断标准，回复格式的约定始终保留。",
				"settings.promptPlaceholder": "内置的判断标准",
				"unit.seconds": "秒",
				"unit.minutes": "分钟",
				"unit.days": "天",
				"unit.sessions": "个",
				"unit.characters": "字符"
			}
		};
		/** 注册两种语言的字典，返回注销函数。 */
		function registerLocale(locale) {
			const disposers = Object.entries(SCOUT_DICTIONARIES).map(([language, dictionary]) => locale.register(SCOUT_LOCALE, language, { ...dictionary }));
			return () => {
				for (const dispose of disposers) dispose();
			};
		}
		//#endregion
		//#region \0dsh-css:src/client/settings.module.css.mjs
		const css = ".TurwOW_page{flex-direction:column;gap:20px;display:flex}.TurwOW_section{flex-direction:column;display:flex}.TurwOW_title{color:var(--dsw-alias-label-secondary);margin:0 0 4px;font-size:12px;font-weight:600;line-height:18px}.TurwOW_field{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:16px;min-height:48px;padding:8px 0;display:flex}.TurwOW_section .TurwOW_field:last-child{border-bottom:0}.TurwOW_wide{flex-direction:column;align-items:stretch;gap:8px}.TurwOW_text{flex-direction:column;gap:2px;min-width:0;display:flex}.TurwOW_label{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}.TurwOW_hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.TurwOW_control{flex-direction:column;flex:none;align-items:flex-end;gap:4px;max-width:60%;display:flex}.TurwOW_wide .TurwOW_control{align-items:stretch;max-width:none}.TurwOW_input,.TurwOW_select{box-sizing:border-box;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));min-height:28px;box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;border:0;padding:4px 8px;font-size:13px;line-height:20px}.TurwOW_select{max-width:260px}.TurwOW_input:focus-visible,.TurwOW_select:focus-visible{box-shadow:0 0 0 1.5px var(--dsw-alias-state-business-primary);outline:none}.TurwOW_input[aria-invalid=true]{box-shadow:0 0 0 1px var(--dsw-alias-state-warn-label)}.TurwOW_input:disabled,.TurwOW_select:disabled{opacity:.5}.TurwOW_number{align-items:center;gap:6px;display:inline-flex}.TurwOW_number .TurwOW_input{text-align:right;font-variant-numeric:tabular-nums;width:92px}.TurwOW_unit{min-width:40px;color:var(--dsw-alias-label-tertiary);font-size:12px}.TurwOW_area{resize:vertical;width:100%}.TurwOW_mono{font-family:var(--dsw-font-family-mono,ui-monospace, monospace);font-size:12px}.TurwOW_status{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.TurwOW_status[role=alert]{color:var(--dsw-alias-state-warn-label)}";
		const tag = "@agent-stash/dsh-skill-scout/settings.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag;
			style.textContent = css;
			document.head.appendChild(style);
		}
		var settings_module_css_default = {
			"area": "TurwOW_area",
			"control": "TurwOW_control",
			"field": "TurwOW_field",
			"hint": "TurwOW_hint",
			"input": "TurwOW_input",
			"label": "TurwOW_label",
			"mono": "TurwOW_mono",
			"number": "TurwOW_number",
			"page": "TurwOW_page",
			"section": "TurwOW_section",
			"select": "TurwOW_select",
			"status": "TurwOW_status",
			"text": "TurwOW_text",
			"title": "TurwOW_title",
			"unit": "TurwOW_unit",
			"wide": "TurwOW_wide"
		};
		//#endregion
		//#region src/client/settings.tsx
		/**
		* 插件页里经验提炼条目的配置页。改动先暂存，点保存才按读到的版本号写回 profile；
		* 写入被拒绝或传输失败时保留暂存值并提示。复核模型从 Host 的模型目录里选，
		* 留空时跟随 Agent 的默认模型。
		*/
		/** 与 Host `Config` 相同的默认值。 */
		const DEFAULT_SETTINGS = {
			discovery: true,
			review: false,
			provider: "",
			model: "",
			effort: "",
			timeout: 90,
			dailyReviews: 6,
			reviewInterval: 10,
			quietPeriod: 2,
			historyDays: 30,
			maxSessions: 200,
			minOccurrences: 2,
			evidenceBudget: 24e3,
			readOutput: true,
			redactPatterns: [],
			notify: "badge",
			scope: "project",
			prompt: ""
		};
		/** 数值字段的范围与单位，与 Host `Config` 一致。 */
		const NUMBERS = {
			timeout: {
				min: 10,
				max: 600,
				unit: "unit.seconds"
			},
			dailyReviews: {
				min: 1,
				max: 100,
				unit: "unit.sessions"
			},
			reviewInterval: {
				min: 1,
				max: 1440,
				unit: "unit.minutes"
			},
			quietPeriod: {
				min: 0,
				max: 120,
				unit: "unit.minutes"
			},
			historyDays: {
				min: 1,
				max: 365,
				unit: "unit.days"
			},
			maxSessions: {
				min: 1,
				max: 2e3,
				unit: "unit.sessions"
			},
			minOccurrences: {
				min: 2,
				max: 10,
				unit: "unit.sessions"
			},
			evidenceBudget: {
				min: 4e3,
				max: 2e5,
				unit: "unit.characters"
			}
		};
		/** 设置服务快照值的结构；缺失或类型不符的字段取默认值。 */
		const SettingsSchema = /* @__PURE__ */ object({
			discovery: /* @__PURE__ */ fallback(/* @__PURE__ */ boolean(), DEFAULT_SETTINGS.discovery),
			review: /* @__PURE__ */ fallback(/* @__PURE__ */ boolean(), DEFAULT_SETTINGS.review),
			provider: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.provider),
			model: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.model),
			effort: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.effort),
			timeout: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.timeout),
			dailyReviews: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.dailyReviews),
			reviewInterval: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.reviewInterval),
			quietPeriod: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.quietPeriod),
			historyDays: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.historyDays),
			maxSessions: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.maxSessions),
			minOccurrences: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.minOccurrences),
			evidenceBudget: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.evidenceBudget),
			readOutput: /* @__PURE__ */ fallback(/* @__PURE__ */ boolean(), DEFAULT_SETTINGS.readOutput),
			redactPatterns: /* @__PURE__ */ fallback(/* @__PURE__ */ array(/* @__PURE__ */ string()), [...DEFAULT_SETTINGS.redactPatterns]),
			notify: /* @__PURE__ */ fallback(/* @__PURE__ */ picklist(["badge", "quiet"]), DEFAULT_SETTINGS.notify),
			scope: /* @__PURE__ */ fallback(/* @__PURE__ */ picklist(["project", "user"]), DEFAULT_SETTINGS.scope),
			prompt: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.prompt)
		});
		/** 从设置服务的快照值读出完整设置。 */
		function parseSettings(value) {
			return parse$1(SettingsSchema, typeof value === "object" && value !== null ? value : {});
		}
		const SETTING_KEYS = [
			"discovery",
			"review",
			"provider",
			"model",
			"effort",
			"timeout",
			"dailyReviews",
			"reviewInterval",
			"quietPeriod",
			"historyDays",
			"maxSessions",
			"minOccurrences",
			"evidenceBudget",
			"readOutput",
			"redactPatterns",
			"notify",
			"scope",
			"prompt"
		];
		const NUMBER_KEYS = [
			"timeout",
			"dailyReviews",
			"reviewInterval",
			"quietPeriod",
			"historyDays",
			"maxSessions",
			"minOccurrences",
			"evidenceBudget"
		];
		/** 暂存值与已保存值的差异，转换成写操作。 */
		function diffOps(saved, staged) {
			return SETTING_KEYS.flatMap((key) => {
				const next = staged[key];
				return JSON.stringify(saved[key]) === JSON.stringify(next) ? [] : [{
					op: "set",
					path: [key],
					value: next
				}];
			});
		}
		/** 正则源码能否编译。 */
		function compiles(source) {
			try {
				return new RegExp(source, "u").source !== "";
			} catch (error) {
				return false;
			}
		}
		/** 每行一个正则；返回第一条不合法的行号（从 1 开始），都合法时返回 null。 */
		function invalidPattern(lines) {
			const index = lines.findIndex((line) => line.trim() !== "" && !compiles(line));
			return index === -1 ? null : index + 1;
		}
		function Field({ id, label, hint, children, wide = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: wide ? `${settings_module_css_default.field} ${settings_module_css_default.wide}` : settings_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_module_css_default.text,
					children: [id === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_module_css_default.label,
						children: label
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: settings_module_css_default.label,
						htmlFor: id,
						children: label
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_module_css_default.hint,
						children: hint
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: settings_module_css_default.control,
					children
				})]
			});
		}
		/** 模型选项的值：`provider\u0000model`，空串表示默认模型。 */
		const SEPARATOR = "\0";
		function modelValue(provider, model) {
			return provider === "" || model === "" ? "" : `${provider}${SEPARATOR}${model}`;
		}
		function ModelFields({ staged, catalog, disabled, onChange, t }) {
			const id = (0, react.useId)();
			const groups = catalog.status === "ready" ? catalog.catalog.groups : [];
			const current = modelValue(staged.provider, staged.model);
			const fallback = catalog.status === "ready" ? catalog.catalog.default : null;
			const fallbackName = fallback === null ? null : groups.find((group) => group.id === fallback.provider)?.models.find((model) => model.id === fallback.model)?.name ?? fallback.model;
			const routeProvider = staged.provider === "" ? fallback?.provider ?? "" : staged.provider;
			const routeModel = staged.model === "" ? fallback?.model ?? "" : staged.model;
			const efforts = (groups.find((group) => group.id === routeProvider)?.models.find((model) => model.id === routeModel))?.reasoning?.efforts ?? [];
			const listed = groups.some((group) => group.models.some((model) => modelValue(group.id, model.id) === current));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Field, {
				id: `${id}-model`,
				label: t("settings.model"),
				hint: t("settings.modelHint"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						id: `${id}-model`,
						className: settings_module_css_default.select,
						value: current,
						disabled,
						onChange: (event) => {
							const [provider = "", model = ""] = event.target.value.split(SEPARATOR);
							onChange({
								provider,
								model,
								effort: ""
							});
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: fallbackName === null ? t("settings.modelDefaultUnknown") : t("settings.modelDefault", { model: fallbackName })
							}),
							current !== "" && !listed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: current,
								children: t("settings.modelMissing", { model: staged.model })
							}),
							groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("optgroup", {
								label: group.name,
								children: group.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: modelValue(group.id, model.id),
									children: model.name
								}, model.id))
							}, group.id))
						]
					}),
					catalog.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_module_css_default.status,
						children: t("settings.modelLoading")
					}),
					catalog.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_module_css_default.status,
						role: "alert",
						children: t("settings.modelError")
					})
				]
			}), efforts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
				id: `${id}-effort`,
				label: t("settings.effort"),
				hint: t("settings.effortHint"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					id: `${id}-effort`,
					className: settings_module_css_default.select,
					value: staged.effort,
					disabled,
					onChange: (event) => onChange({ effort: event.target.value }),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: t("settings.effortDefault")
					}), efforts.map((effort) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: effort.id,
						children: effort.name
					}, effort.id))]
				})
			})] });
		}
		/**
		* 创建配置页组件。
		* @param catalog - 模型目录的读取状态；页面打开时订阅。
		*/
		function createSettingsPage(catalog) {
			return function SettingsPage({ view, form, t }) {
				const translate = t;
				const id = (0, react.useId)();
				const saved = parseSettings(form?.state.value);
				const [draft, setDraft] = (0, react.useState)({});
				const [patterns, setPatterns] = (0, react.useState)(null);
				const [saving, setSaving] = (0, react.useState)(false);
				const [failed, setFailed] = (0, react.useState)(false);
				const models = useSnapshot(catalog);
				if (view === "summary" || form === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: translate("settings.summary") });
				const lines = patterns === null ? saved.redactPatterns : patterns.split("\n");
				const staged = {
					...saved,
					...draft,
					redactPatterns: lines.map((line) => line.trim()).filter((line) => line !== "")
				};
				const ops = diffOps(saved, staged);
				const badLine = invalidPattern(lines);
				const badNumber = NUMBER_KEYS.some((key) => {
					const value = staged[key];
					return !Number.isInteger(value) || value < NUMBERS[key].min || value > NUMBERS[key].max;
				});
				const writable = form.state.writable && !saving;
				const update = (next) => {
					setDraft((current) => ({
						...current,
						...next
					}));
					setFailed(false);
				};
				const discard = () => {
					setDraft({});
					setPatterns(null);
					setFailed(false);
				};
				const save = async () => {
					setSaving(true);
					setFailed(false);
					try {
						if (await form.mutate(ops, form.state.revision)) discard();
						else setFailed(true);
					} catch (error) {
						setFailed(true);
					} finally {
						setSaving(false);
					}
				};
				const toggle = (key, label, hint) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					label: translate(label),
					hint: translate(hint),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
						checked: staged[key],
						label: translate(label),
						disabled: !writable,
						onChange: (next) => update({ [key]: next })
					})
				});
				const number = (key) => {
					const range = NUMBERS[key];
					const fieldId = `${id}-${key}`;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						id: fieldId,
						label: translate(`settings.${key}`),
						hint: translate(`settings.${key}Hint`),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: settings_module_css_default.number,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: fieldId,
								className: settings_module_css_default.input,
								type: "number",
								inputMode: "numeric",
								min: range.min,
								max: range.max,
								step: 1,
								value: Number.isFinite(staged[key]) ? staged[key] : "",
								disabled: !writable,
								"aria-invalid": staged[key] < range.min || staged[key] > range.max || void 0,
								onChange: (event) => update({ [key]: event.target.valueAsNumber })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.unit,
								children: translate(range.unit)
							})]
						})
					});
				};
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
					labels: {
						unavailable: translate("settings.unavailable"),
						readOnly: translate("settings.readOnly"),
						saveFailed: translate("settings.saveFailed"),
						save: translate("settings.save"),
						saving: translate("settings.saving")
					},
					state: {
						available: form.state.status === "ready",
						writable: form.state.writable,
						dirty: ops.length > 0,
						invalid: badLine !== null || badNumber,
						saving,
						failed
					},
					onSave: () => void save(),
					onDiscard: discard,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.page,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: settings_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: settings_module_css_default.title,
										children: translate("settings.section.discovery")
									}),
									toggle("discovery", "settings.discovery", "settings.discoveryHint"),
									number("historyDays"),
									number("maxSessions"),
									number("quietPeriod"),
									number("minOccurrences")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: settings_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: settings_module_css_default.title,
										children: translate("settings.section.review")
									}),
									toggle("review", "settings.review", "settings.reviewHint"),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelFields, {
										staged,
										catalog: models,
										disabled: !writable,
										onChange: update,
										t: translate
									}),
									number("timeout"),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										id: `${id}-prompt`,
										label: translate("settings.prompt"),
										hint: translate("settings.promptHint"),
										wide: true,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											id: `${id}-prompt`,
											className: `${settings_module_css_default.input} ${settings_module_css_default.area}`,
											rows: 4,
											placeholder: translate("settings.promptPlaceholder"),
											value: staged.prompt,
											disabled: !writable,
											onChange: (event) => update({ prompt: event.target.value })
										})
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: settings_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: settings_module_css_default.title,
										children: translate("settings.section.limits")
									}),
									number("dailyReviews"),
									number("reviewInterval"),
									number("evidenceBudget")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: settings_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: settings_module_css_default.title,
										children: translate("settings.section.privacy")
									}),
									toggle("readOutput", "settings.readOutput", "settings.readOutputHint"),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Field, {
										id: `${id}-redact`,
										label: translate("settings.redactPatterns"),
										hint: translate("settings.redactPatternsHint"),
										wide: true,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											id: `${id}-redact`,
											className: `${settings_module_css_default.input} ${settings_module_css_default.area} ${settings_module_css_default.mono}`,
											rows: 3,
											spellCheck: false,
											value: patterns ?? saved.redactPatterns.join("\n"),
											disabled: !writable,
											"aria-invalid": badLine !== null || void 0,
											onChange: (event) => {
												setPatterns(event.target.value);
												setFailed(false);
											}
										}), badLine !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: settings_module_css_default.status,
											role: "alert",
											children: translate("settings.redactInvalid", { line: badLine })
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: settings_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: settings_module_css_default.title,
										children: translate("settings.section.inbox")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: translate("settings.notify"),
										hint: translate("settings.notifyHint"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
											id: `${id}-notify`,
											label: translate("settings.notify"),
											value: staged.notify,
											disabled: !writable,
											options: [{
												value: "badge",
												label: translate("settings.notify.badge")
											}, {
												value: "quiet",
												label: translate("settings.notify.quiet")
											}],
											onChange: (notify) => update({ notify })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: translate("settings.scope"),
										hint: translate("settings.scopeHint"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
											id: `${id}-scope`,
											label: translate("settings.scope"),
											value: staged.scope,
											disabled: !writable,
											options: [{
												value: "project",
												label: translate("scope.project")
											}, {
												value: "user",
												label: translate("scope.user")
											}],
											onChange: (scope) => update({ scope })
										})
									})
								]
							})
						]
					})
				});
			};
		}
		//#endregion
		//#region src/client/store.ts
		/** 进行中时的读取间隔。 */
		const BUSY_INTERVAL = 3e3;
		/** 空闲时的读取间隔。 */
		const IDLE_INTERVAL = 45e3;
		/** 操作提示停留的时间。 */
		const NOTICE_TTL = 8e3;
		const INITIAL = {
			status: "idle",
			inbox: null,
			error: null,
			notice: null
		};
		/** 有后台工作正在进行：分析、复核，或写入后核对 DSH 能否发现。 */
		function busy(inbox) {
			return inbox !== null && (inbox.status.scanning || inbox.status.reviewing !== null || inbox.items.some((item) => item.write?.checking === true));
		}
		/**
		* 创建收件箱状态。
		* @param transport - 读取与写入 Host 路由的函数。
		*/
		function createInboxStore(transport) {
			let state = INITIAL;
			const listeners = /* @__PURE__ */ new Set();
			let timer;
			let noticeTimer;
			let generation = 0;
			const set = (next) => {
				state = next;
				for (const listener of listeners) listener();
			};
			const schedule = () => {
				clearTimeout(timer);
				if (listeners.size === 0) return;
				timer = setTimeout(() => {
					if (document.visibilityState === "hidden") schedule();
					else refresh();
				}, busy(state.inbox) ? BUSY_INTERVAL : IDLE_INTERVAL);
			};
			async function refresh() {
				const current = ++generation;
				if (state.inbox === null) set({
					...state,
					status: "loading",
					error: null
				});
				try {
					const inbox = await transport.fetchInbox();
					if (current === generation) set({
						...state,
						status: "ready",
						inbox,
						error: null
					});
				} catch (error) {
					if (current === generation) set({
						...state,
						status: "error",
						error: error instanceof Error ? error.message : String(error)
					});
				} finally {
					if (current === generation) schedule();
				}
			}
			const onFocus = () => {
				if (listeners.size > 0) refresh();
			};
			const showNotice = (notice) => {
				clearTimeout(noticeTimer);
				set({
					...state,
					notice
				});
				if (notice !== null) noticeTimer = setTimeout(() => set({
					...state,
					notice: null
				}), NOTICE_TTL);
			};
			return {
				getSnapshot: () => state,
				subscribe(listener) {
					listeners.add(listener);
					if (listeners.size === 1) {
						window.addEventListener("focus", onFocus);
						refresh();
					}
					return () => {
						listeners.delete(listener);
						if (listeners.size === 0) {
							window.removeEventListener("focus", onFocus);
							clearTimeout(timer);
						}
					};
				},
				refresh,
				async act(action, notice) {
					const result = await transport.postAction(action);
					generation += 1;
					set({
						...state,
						status: "ready",
						inbox: result.inbox,
						error: null
					});
					if (result.ok && notice !== void 0) showNotice(notice);
					schedule();
					return result;
				},
				clearNotice() {
					showNotice(null);
				},
				dispose() {
					clearTimeout(timer);
					clearTimeout(noticeTimer);
					window.removeEventListener("focus", onFocus);
					listeners.clear();
				}
			};
		}
		//#endregion
		//#region src/client/source.ts
		function createSnapshotSource(initial, load) {
			let value = initial;
			let loaded = false;
			let generation = 0;
			const listeners = /* @__PURE__ */ new Set();
			const run = () => {
				loaded = true;
				const current = ++generation;
				const set = (next) => {
					if (current !== generation) return;
					value = next;
					for (const listener of listeners) listener();
				};
				load(set).catch(() => set(initial));
			};
			return {
				getSnapshot: () => value,
				subscribe(listener) {
					listeners.add(listener);
					if (!loaded) run();
					return () => {
						listeners.delete(listener);
					};
				},
				reload() {
					if (loaded) run();
				}
			};
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* 浏览器半部入口：注册文案、会话标题栏里的收件箱入口，以及插件页里的配置页。
		* 收件箱状态全局共用一份，所有会话的标题栏入口订阅同一个 store。
		*/
		/** 宿主提醒入口的 order 是 20；本入口排在它后面。 */
		const HEADER_ORDER = 30;
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.session"
		];
		function apply(ctx) {
			ctx.effect(() => registerLocale(ctx.locale), "skill-scout: locale");
			const inbox = createInboxStore({
				fetchInbox: () => fetchInbox(),
				postAction
			});
			ctx.effect(() => () => inbox.dispose(), "skill-scout: inbox");
			ctx.on("connection/reset", () => void inbox.refresh());
			const face = {
				inbox,
				seen: createSeenStore(window.localStorage),
				loadDetail: (id, _version, signal) => fetchDetail(id, signal),
				openSession: (sessionId) => ctx.get("uiWorkspace")?.openSession(sessionId)
			};
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "skill-scout-inbox",
				order: HEADER_ORDER,
				locale: SCOUT_LOCALE,
				inject: () => face
			}, InboxEntry));
			const catalog = createSnapshotSource({ status: "loading" }, async (set) => {
				const response = await ctx.remote.session.modelCatalog();
				set(response.ok ? {
					status: "ready",
					catalog: response.value
				} : { status: "error" });
			});
			ctx.effect(() => ctx.remote.$on("llm/adapters-updated", () => catalog.reload()), "skill-scout: adapters");
			ctx.effect(() => ctx.remote.$on("llm/models-updated", () => catalog.reload()), "skill-scout: models");
			ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
				name: "plugins.row.config",
				key: `${PACKAGE_NAME}#${ROW_ID}`,
				locale: SCOUT_LOCALE
			}, createSettingsPage(catalog)));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map