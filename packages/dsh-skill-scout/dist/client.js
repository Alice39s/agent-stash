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
		const SESSION_PATH = `${ROUTE_BASE}/session`;
		const SEARCH_PATH = `${ROUTE_BASE}/search`;
		const STATS_PATH = `${ROUTE_BASE}/stats`;
		/** 会话 Tab 与「历史回溯提炼」页在 DSH 槽位里的 id。 */
		const VIEW_ID = "skill-scout";
		/** 插件页里本插件配置页的键：`<包名>#<条目 id>`。 */
		const PACKAGE_NAME = "@agent-stash/dsh-skill-scout";
		const ROW_ID = "agent-stash-skill-scout";
		const Nullable = (schema) => /* @__PURE__ */ nullable(schema);
		/** 线索的来源：三种规则信号，加上用户发起的「提炼本会话」与「提炼所选」。 */
		const SignalKindViewSchema = /* @__PURE__ */ picklist([
			"repeated",
			"recovery",
			"complex",
			"session",
			"selected"
		]);
		/**
		* 一张卡片在界面上的状态。还没有可同意的 idea 时，卡片代表整条线索：detected、summarizing、skipped、
		* failed（摘要失败）、dismissed；摘要给出 idea 后，每个 idea 一张卡片：proposed、drafting、ready、
		* failed（草稿失败）、dismissed、written。summarizing 与 drafting 只存在于 Host 内存。
		*/
		const ItemStateSchema = /* @__PURE__ */ picklist([
			"detected",
			"summarizing",
			"proposed",
			"skipped",
			"drafting",
			"ready",
			"failed",
			"dismissed",
			"written"
		]);
		/** 模型调用的两个阶段：摘要与草稿。 */
		const StageViewSchema = /* @__PURE__ */ picklist(["summary", "draft"]);
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
		const ProgressViewSchema = /* @__PURE__ */ object({
			stage: /* @__PURE__ */ picklist(["summary", "draft"]),
			phase: /* @__PURE__ */ picklist([
				"queued",
				"preparing",
				"waiting",
				"thinking",
				"writing",
				"checking"
			]),
			/** 请求开始的时间。 */
			startedAt: /* @__PURE__ */ number(),
			/** 进入当前阶段的时间。 */
			phaseAt: /* @__PURE__ */ number(),
			/** 已收到的正文字数。 */
			chars: /* @__PURE__ */ number(),
			/** 这类回复通常的字数，界面据此估算进度；不是上限。 */
			expected: /* @__PURE__ */ number()
		});
		/** 证据来自的一次任务。 */
		const SessionRefSchema = /* @__PURE__ */ object({
			sessionId: /* @__PURE__ */ string(),
			episodeId: /* @__PURE__ */ string(),
			at: /* @__PURE__ */ number(),
			goal: /* @__PURE__ */ string(),
			outcome: /* @__PURE__ */ string()
		});
		/** 收件箱里的一张卡片：一个 idea，或者还没有 idea 的一条线索。 */
		const ItemViewSchema = /* @__PURE__ */ object({
			/** idea 是 `<线索 id>~<下标>`，线索就是线索 id。 */
			id: /* @__PURE__ */ string(),
			leadId: /* @__PURE__ */ string(),
			/** idea 在摘要里的下标；卡片代表整条线索时为 null。 */
			ideaIndex: Nullable(/* @__PURE__ */ number()),
			/** 这条线索的摘要给出的 idea 数。 */
			ideaCount: /* @__PURE__ */ number(),
			/** 其他线索里同名、未结束的 idea 折叠进这张卡片的数量。 */
			merged: /* @__PURE__ */ number(),
			kind: SignalKindViewSchema,
			state: ItemStateSchema,
			/** 摘要给出的标题；还没有摘要时为 null，界面用 goal 代替。 */
			title: Nullable(/* @__PURE__ */ string()),
			goal: /* @__PURE__ */ string(),
			/** 规则在这组任务里找到的共有步骤，原来的写法。 */
			steps: /* @__PURE__ */ array(/* @__PURE__ */ string()),
			/** 摘要：在会话里发现了什么。 */
			found: Nullable(/* @__PURE__ */ string()),
			/** 摘要：Skill 做什么；改进时是追加的内容补上了什么。 */
			description: Nullable(/* @__PURE__ */ string()),
			/** 摘要：什么时候用。 */
			trigger: Nullable(/* @__PURE__ */ string()),
			/** 摘要：打算写进 Skill 的步骤或追加的内容。 */
			outline: /* @__PURE__ */ array(/* @__PURE__ */ string()),
			/** 摘要：照着做的风险。 */
			risks: /* @__PURE__ */ array(/* @__PURE__ */ string()),
			/** 摘要：怎么确认照着做成功了。 */
			verification: Nullable(/* @__PURE__ */ string()),
			/** 摘要判为跳过的理由。 */
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
				stage: StageViewSchema,
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
			dismissedSimilar: /* @__PURE__ */ boolean(),
			/** 正在进行的模型请求；没有时为 null。 */
			progress: Nullable(ProgressViewSchema)
		});
		/** 一个阶段此刻使用的模型；没有可用模型时为 null。 */
		const ModelViewSchema = Nullable(/* @__PURE__ */ object({
			provider: /* @__PURE__ */ string(),
			model: /* @__PURE__ */ string(),
			effort: Nullable(/* @__PURE__ */ string()),
			source: /* @__PURE__ */ picklist(["config", "default"])
		}));
		const InboxViewSchema = /* @__PURE__ */ object({
			status: /* @__PURE__ */ object({
				discovery: /* @__PURE__ */ boolean(),
				/** 后台自动写摘要。 */
				summarize: /* @__PURE__ */ boolean(),
				notify: /* @__PURE__ */ picklist(["badge", "quiet"]),
				scope: /* @__PURE__ */ picklist(["project", "user"]),
				models: /* @__PURE__ */ object({
					summary: ModelViewSchema,
					draft: ModelViewSchema
				}),
				/** 本进程持有工作锁，负责分析与后台摘要。 */
				lead: /* @__PURE__ */ boolean(),
				scanning: /* @__PURE__ */ boolean(),
				/** 回合已结束、等静默期过去后再分析的会话数。 */
				waiting: /* @__PURE__ */ number(),
				/** 正在进行的摘要与草稿请求数。 */
				working: /* @__PURE__ */ number(),
				usage: /* @__PURE__ */ object({
					/** 今天的后台摘要次数与上限。 */
					summaries: /* @__PURE__ */ number(),
					limit: /* @__PURE__ */ number(),
					/** 今天用户发起的摘要与草稿次数。 */
					requested: /* @__PURE__ */ number(),
					/** 未命中缓存的输入。 */
					inputTokens: /* @__PURE__ */ number(),
					cacheReadTokens: /* @__PURE__ */ number(),
					cacheWriteTokens: /* @__PURE__ */ number(),
					outputTokens: /* @__PURE__ */ number()
				}),
				/** 回溯更早的会话；没有在回溯时为 null。 */
				backfill: Nullable(/* @__PURE__ */ object({
					range: /* @__PURE__ */ picklist(["90d", "all"]),
					state: /* @__PURE__ */ picklist([
						"listing",
						"running",
						"paused",
						"done"
					]),
					total: /* @__PURE__ */ number(),
					done: /* @__PURE__ */ number(),
					failed: /* @__PURE__ */ number()
				})),
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
			/** 摘要或草稿引用了它。 */
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
			steering: /* @__PURE__ */ array(/* @__PURE__ */ string()),
			followup: Nullable(/* @__PURE__ */ string())
		});
		/** 可编辑的 Skill 字段。 */
		const SkillFieldsSchema = /* @__PURE__ */ object({
			name: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ trim(), /* @__PURE__ */ regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u), /* @__PURE__ */ maxLength(64)),
			description: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ trim(), /* @__PURE__ */ minLength(1), /* @__PURE__ */ maxLength(500)),
			whenToUse: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ trim(), /* @__PURE__ */ maxLength(500)),
			body: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ trim(), /* @__PURE__ */ minLength(1), /* @__PURE__ */ maxLength(2e4))
		});
		/** 一次模型调用的来源与用量。 */
		const CallViewSchema = Nullable(/* @__PURE__ */ object({
			provider: /* @__PURE__ */ string(),
			model: /* @__PURE__ */ string(),
			at: /* @__PURE__ */ number(),
			inputTokens: /* @__PURE__ */ number(),
			outputTokens: /* @__PURE__ */ number()
		}));
		/** 一条建议的完整信息：证据、摘要与草稿。 */
		const DetailViewSchema = /* @__PURE__ */ object({
			item: ItemViewSchema,
			/** 同一线索的全部 idea（含这一个），按摘要里的顺序。 */
			siblings: /* @__PURE__ */ array(/* @__PURE__ */ object({
				id: /* @__PURE__ */ string(),
				title: /* @__PURE__ */ string(),
				state: ItemStateSchema
			})),
			episodes: /* @__PURE__ */ array(EvidenceEpisodeSchema),
			summary: CallViewSchema,
			draftCall: CallViewSchema,
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
		/** 一个任务（Episode）的概要，用于会话 Tab 与搜索结果。 */
		const TaskViewSchema = /* @__PURE__ */ object({
			episodeId: /* @__PURE__ */ string(),
			sessionId: /* @__PURE__ */ string(),
			at: /* @__PURE__ */ number(),
			cwd: Nullable(/* @__PURE__ */ string()),
			goal: /* @__PURE__ */ string(),
			outcome: /* @__PURE__ */ picklist([
				"verified",
				"succeeded",
				"unverified",
				"disputed",
				"failed",
				"aborted"
			]),
			commands: /* @__PURE__ */ number(),
			edits: /* @__PURE__ */ number(),
			recoveries: /* @__PURE__ */ number(),
			/** 前几步的命令签名或改动文件。 */
			steps: /* @__PURE__ */ array(/* @__PURE__ */ string()),
			/** 搜索命中的片段（命令、错误行、文件路径或插话）；不是搜索结果时为空。 */
			matches: /* @__PURE__ */ array(/* @__PURE__ */ string())
		});
		/** 一个会话在插件里的分析情况。 */
		const SessionViewSchema = /* @__PURE__ */ object({
			sessionId: /* @__PURE__ */ string(),
			/**
			* - analyzed：已分析，日志之后没有变化或正在等静默期；
			* - waiting：回合已结束，等静默期过去；
			* - pending：还没分析（超出历史范围、分析关闭，或启动时还没读到）；
			* - failed：分析出错，`error` 是原因；
			* - subagent：子代理会话，不单独分析；
			* - missing：DSH 里找不到这个会话。
			*/
			state: /* @__PURE__ */ picklist([
				"analyzed",
				"waiting",
				"pending",
				"failed",
				"subagent",
				"missing"
			]),
			scannedAt: Nullable(/* @__PURE__ */ number()),
			error: Nullable(/* @__PURE__ */ string()),
			tasks: /* @__PURE__ */ array(TaskViewSchema)
		});
		const SearchViewSchema = /* @__PURE__ */ object({
			query: /* @__PURE__ */ string(),
			/** 命中总数；`hits` 只含前 `limit` 条，按命中词数与时间排序。 */
			total: /* @__PURE__ */ number(),
			hits: /* @__PURE__ */ array(TaskViewSchema),
			/** 索引覆盖的范围。 */
			indexed: /* @__PURE__ */ object({
				sessions: /* @__PURE__ */ number(),
				episodes: /* @__PURE__ */ number()
			})
		});
		/** 一次模型调用的记录。 */
		const CallLogViewSchema = /* @__PURE__ */ object({
			at: /* @__PURE__ */ number(),
			stage: StageViewSchema,
			/** 线索或 idea 的 id，用来跳到那张卡片。 */
			itemId: /* @__PURE__ */ string(),
			title: /* @__PURE__ */ string(),
			provider: /* @__PURE__ */ string(),
			model: /* @__PURE__ */ string(),
			durationMs: /* @__PURE__ */ number(),
			inputTokens: /* @__PURE__ */ number(),
			cacheReadTokens: /* @__PURE__ */ number(),
			cacheWriteTokens: /* @__PURE__ */ number(),
			outputTokens: /* @__PURE__ */ number(),
			result: /* @__PURE__ */ picklist([
				"proposed",
				"skipped",
				"drafted",
				"failed"
			]),
			/** 不值得保存的理由、idea 数或失败原因。 */
			detail: Nullable(/* @__PURE__ */ string())
		});
		const Count = /* @__PURE__ */ number();
		const StatsViewSchema = /* @__PURE__ */ object({
			coverage: /* @__PURE__ */ object({
				analyzed: Count,
				/** 历史范围内、不是子代理的会话数；还没列出会话时为 null。 */
				inRange: Nullable(Count),
				/** DSH 里全部不是子代理的会话数。 */
				total: Nullable(Count),
				backfilled: Count,
				failed: /* @__PURE__ */ array(/* @__PURE__ */ object({
					sessionId: /* @__PURE__ */ string(),
					message: /* @__PURE__ */ string(),
					at: /* @__PURE__ */ number()
				}))
			}),
			outcomes: /* @__PURE__ */ object({
				verified: Count,
				succeeded: Count,
				unverified: Count,
				disputed: Count,
				failed: Count,
				aborted: Count
			}),
			funnel: /* @__PURE__ */ object({
				leads: Count,
				summarized: Count,
				skipped: Count,
				ideas: Count,
				drafted: Count,
				written: Count,
				dismissed: Count
			}),
			/** 跨会话出现最多的动作（日常动作与查看类命令除外）。 */
			actions: /* @__PURE__ */ array(/* @__PURE__ */ object({
				key: /* @__PURE__ */ string(),
				label: /* @__PURE__ */ string(),
				sessions: Count
			})),
			/** 在多个会话里出现的同一类错误。 */
			errors: /* @__PURE__ */ array(/* @__PURE__ */ object({
				signature: /* @__PURE__ */ string(),
				example: /* @__PURE__ */ string(),
				sessions: Count
			})),
			/** 近 7 天每天的模型用量，最早的在前。 */
			usage: /* @__PURE__ */ array(/* @__PURE__ */ object({
				day: /* @__PURE__ */ string(),
				summaries: Count,
				requested: Count,
				failures: Count,
				inputTokens: Count,
				cacheReadTokens: Count,
				cacheWriteTokens: Count,
				outputTokens: Count
			})),
			/** 最近的模型调用，最新的在前。 */
			calls: /* @__PURE__ */ array(CallLogViewSchema)
		});
		const ActionResultSchema = /* @__PURE__ */ variant("ok", [/* @__PURE__ */ object({
			ok: /* @__PURE__ */ literal(true),
			inbox: InboxViewSchema,
			preview: /* @__PURE__ */ optional(PreviewViewSchema),
			/** extract-session 与 extract-selected 建立或沿用的线索 id。 */
			leadId: /* @__PURE__ */ optional(/* @__PURE__ */ string())
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
					"unsafe",
					"empty"
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
		/** GET 一个路由并按 schema 校验。 */
		async function get(path, schema, params, signal) {
			const query = new URLSearchParams(params).toString();
			return parse(await fetch(query === "" ? path : `${path}?${query}`, {
				headers: { accept: "application/json" },
				cache: "no-store",
				...signal === void 0 ? {} : { signal }
			}), schema, path);
		}
		/** 读取收件箱与工作状态。 */
		function fetchInbox(signal) {
			return get(INBOX_PATH, InboxViewSchema, {}, signal);
		}
		/** 读取一张卡片（线索或 idea）的证据、摘要与草稿。 */
		function fetchDetail(id, signal) {
			return get(DETAIL_PATH, DetailViewSchema, { id }, signal);
		}
		/** 读取一个会话的分析情况与任务。 */
		function fetchSession(sessionId, signal) {
			return get(SESSION_PATH, SessionViewSchema, { id: sessionId }, signal);
		}
		/** 在已存的任务索引里搜索。 */
		function search(query, signal) {
			return get(SEARCH_PATH, SearchViewSchema, {
				q: query.q,
				limit: String(query.limit),
				...query.outcome === null ? {} : { outcome: query.outcome }
			}, signal);
		}
		/** 读取统计。 */
		function fetchStats(signal) {
			return get(STATS_PATH, StatsViewSchema, {}, signal);
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
		//#region src/client/face.ts
		/** 打开页面的「建议」分栏并选中一张卡片。 */
		function showItem(face, id) {
			face.page.update({
				tab: "suggestions",
				selected: id
			});
			face.openPage();
		}
		//#endregion
		//#region src/client/format.ts
		const SECOND = 1e3;
		const MINUTE = 60 * SECOND;
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
		/** 一段时长：N 秒、N 分 N 秒。 */
		function duration(t, ms) {
			const seconds = Math.floor(Math.max(0, ms) / SECOND);
			if (seconds < 60) return t("duration.seconds", { seconds });
			return t("duration.minutes", {
				minutes: Math.floor(seconds / 60),
				seconds: String(seconds % 60).padStart(2, "0")
			});
		}
		const COMPACT = new Intl.NumberFormat("en", {
			notation: "compact",
			maximumFractionDigits: 1
		});
		/** token 数一类的大数：1.2K、3.4M。 */
		function compact(value) {
			return COMPACT.format(value);
		}
		/** 「N 个会话」「N 条命令」一类的数量。 */
		function counted(t, key, count) {
			return t(`${key}.${count === 1 ? "one" : "other"}`, { count });
		}
		/** 卡片标题：摘要里的标题，还没有摘要时用用户请求。 */
		function titleOf(item) {
			return item.title ?? item.goal;
		}
		/** 状态文案；失败按阶段区分。 */
		function stateLabel(t, item) {
			return item.state === "failed" && item.failure?.stage === "draft" ? t("state.draftFailed") : t(`state.${item.state}`);
		}
		/** 模型正在处理这张卡片。 */
		function inFlight(item) {
			return item.state === "summarizing" || item.state === "drafting";
		}
		/** 来源与规模：线索来源 · 会话数 · 同名折叠数。 */
		function sourceOf(t, item) {
			return [
				t(`kind.${item.kind}`),
				counted(t, "meta.sessions", item.occurrences),
				...item.merged > 0 ? [t("meta.merged", { count: item.merged })] : []
			].join(" · ");
		}
		/** 一行元信息：来源与规模 · 时间。 */
		function metaOf(t, item, now) {
			return `${sourceOf(t, item)} · ${ago(t, item.updatedAt, now)}`;
		}
		/** 模型请求此刻在做什么。 */
		function phaseLabel(t, progress) {
			return progress.phase === "writing" ? t(progress.chars === 1 ? "phase.writing.one" : "phase.writing.other", { count: progress.chars }) : t(`phase.${progress.phase}`);
		}
		/** 失败在草稿阶段的 idea 仍有摘要，留在待决定的分组里。 */
		function draftFailed(item) {
			return item.state === "failed" && item.failure?.stage === "draft";
		}
		/** 等用户决定的卡片：标题栏的数字只数这些。 */
		function needsReview(item) {
			return item.state === "proposed" || item.state === "drafting" || item.state === "ready" || draftFailed(item);
		}
		/** 按状态分组：待决定、本地发现、历史。 */
		function groupItems(items) {
			return {
				review: items.filter(needsReview),
				found: items.filter((item) => item.state === "detected" || item.state === "summarizing" || item.state === "failed" && !draftFailed(item)),
				history: items.filter((item) => item.state === "written" || item.state === "skipped" || item.state === "dismissed")
			};
		}
		/**
		* 找到选中的卡片。线索的摘要给出 idea 后，线索卡片换成 idea 卡片，选中落到它的第一个 idea；
		* idea 被重新摘要、回到线索卡片时，落到线索上。
		*/
		function resolveItem(items, id) {
			if (id === null) return void 0;
			const exact = items.find((item) => item.id === id);
			if (exact !== void 0) return exact;
			const lead = id.split("~")[0];
			return items.find((item) => item.leadId === lead && item.ideaIndex !== null) ?? items.find((item) => item.id === lead);
		}
		/** 证据里有这个会话的卡片。 */
		function citing(items, sessionId) {
			return items.filter((item) => item.sessions.some((ref) => ref.sessionId === sessionId));
		}
		/** 把 `~` 开头之外的长路径缩短到末尾几段。 */
		function shortPath(path) {
			const parts = path.split("/");
			return parts.length <= 4 ? path : `…/${parts.slice(-4).join("/")}`;
		}
		//#endregion
		//#region \0dsh-css:src/client/cards.module.css.mjs
		const css$7 = ".TtiZra_section{flex-direction:column;display:flex}.TtiZra_sectionTitle{color:var(--dsw-alias-label-tertiary);margin:0;padding:5px 12px 2px;font-size:11px;font-weight:500;line-height:16px}.TtiZra_list{flex-direction:column;gap:1px;margin:0;padding:0;list-style:none;display:flex}.TtiZra_card{border-radius:10px;align-items:flex-start;gap:4px;display:flex;position:relative}@media (hover:hover){.TtiZra_card:hover{background:var(--dsw-alias-interactive-bg-hover)}}.TtiZra_card:has(.TtiZra_open[aria-current=true]){background:var(--dsw-alias-interactive-bg-active,var(--dsw-alias-interactive-bg-hover))}.TtiZra_open{min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:10px;flex-direction:column;flex:1;gap:2px;padding:8px 4px 8px 12px;display:flex}.TtiZra_open:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.TtiZra_cardTitle{-webkit-line-clamp:2;overflow-wrap:anywhere;-webkit-box-orient:vertical;font-size:13px;line-height:18px;display:-webkit-box;overflow:hidden}.TtiZra_card[data-state=detected] .TtiZra_cardTitle,.TtiZra_card[data-state=summarizing] .TtiZra_cardTitle,.TtiZra_card[data-state=failed]:not([data-stage=draft]) .TtiZra_cardTitle{color:var(--dsw-alias-label-secondary)}.TtiZra_cardSummary{-webkit-line-clamp:2;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;-webkit-box-orient:vertical;font-size:12px;line-height:17px;display:-webkit-box;overflow:hidden}.TtiZra_cardMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:2px 6px;font-size:11px;line-height:16px;display:flex}.TtiZra_state{color:var(--dsw-alias-label-secondary)}.TtiZra_card[data-state=failed] .TtiZra_state{color:var(--dsw-alias-state-warn-label)}.TtiZra_dismiss{width:22px;height:22px;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0;background:0 0;border:0;border-radius:6px;flex:none;justify-content:center;align-items:center;margin:7px 6px 0 0;padding:0;display:inline-flex}.TtiZra_card:hover .TtiZra_dismiss,.TtiZra_card:focus-within .TtiZra_dismiss{opacity:1}.TtiZra_dismiss:focus-visible{opacity:1;outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}@media (hover:hover){.TtiZra_dismiss:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}}@media (hover:none){.TtiZra_dismiss{opacity:1}}.TtiZra_historyToggle{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;align-self:flex-start;margin:2px 0 2px 8px;padding:2px 4px;font-size:11px;line-height:16px}.TtiZra_historyToggle:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary)}@media (hover:hover){.TtiZra_historyToggle:hover{color:var(--dsw-alias-label-secondary)}}.TtiZra_banner{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:10px;margin:2px 4px 4px;padding:8px 10px;font-size:12px;line-height:18px}.TtiZra_empty{flex-direction:column;gap:4px;padding:10px 12px 14px;display:flex}.TtiZra_emptyTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;line-height:20px}.TtiZra_emptyBody{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}.TtiZra_caption{color:var(--dsw-alias-label-tertiary);margin:4px 0 0;font-size:11px;line-height:16px}.TtiZra_noticeText{overflow-wrap:anywhere;flex:1;min-width:0}.TtiZra_noticeActions{flex:none;gap:12px;display:inline-flex}.TtiZra_link{color:var(--dsw-alias-state-business-primary);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;font-size:12px}.TtiZra_link:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;border-radius:4px}";
		const tag$7 = "@agent-stash/dsh-skill-scout/cards.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$7)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$7;
			style.textContent = css$7;
			document.head.appendChild(style);
		}
		var cards_module_css_default = {
			"banner": "TtiZra_banner",
			"caption": "TtiZra_caption",
			"card": "TtiZra_card",
			"cardMeta": "TtiZra_cardMeta",
			"cardSummary": "TtiZra_cardSummary",
			"cardTitle": "TtiZra_cardTitle",
			"dismiss": "TtiZra_dismiss",
			"empty": "TtiZra_empty",
			"emptyBody": "TtiZra_emptyBody",
			"emptyTitle": "TtiZra_emptyTitle",
			"historyToggle": "TtiZra_historyToggle",
			"link": "TtiZra_link",
			"list": "TtiZra_list",
			"noticeActions": "TtiZra_noticeActions",
			"noticeText": "TtiZra_noticeText",
			"open": "TtiZra_open",
			"section": "TtiZra_section",
			"sectionTitle": "TtiZra_sectionTitle",
			"state": "TtiZra_state"
		};
		//#endregion
		//#region src/client/cards.tsx
		/**
		* 卡片列表：收件箱浮层、「历史回溯提炼」页与会话 Tab 共用。卡片以 idea 为单位，还没有 idea 的线索一张卡；
		* 按待你决定、本地发现、历史分组，历史默认收起。
		*/
		function Card({ item, now, t, selected, onOpen, onDismiss }) {
			const title = titleOf(item);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: cards_module_css_default.card,
				"data-state": item.state,
				"data-stage": item.failure?.stage,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: cards_module_css_default.open,
					"data-item": item.id,
					"aria-current": selected || void 0,
					onClick: () => onOpen(item.id),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cards_module_css_default.cardTitle,
							children: title
						}),
						item.description !== null && item.state !== "written" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cards_module_css_default.cardSummary,
							children: item.description
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: cards_module_css_default.cardMeta,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: cards_module_css_default.state,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TextShimmer, {
									active: inFlight(item),
									children: stateLabel(t, item)
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: metaOf(t, item, now) })]
						})
					]
				}), onDismiss !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: cards_module_css_default.dismiss,
					"aria-label": `${t("action.dismiss")}: ${title}`,
					title: t("action.dismiss"),
					onClick: () => onDismiss(item.id),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
				})]
			});
		}
		/** 没有可用模型、分析关闭或由另一个窗口分析时的一行说明。 */
		function Banner({ inbox, t }) {
			const { status } = inbox;
			const pending = inbox.items.some((item) => item.state === "detected" || item.state === "failed");
			let key = null;
			if (!status.discovery) key = "banner.discoveryOff";
			else if (status.models.summary === null && pending) key = "banner.noModel";
			else if (!status.lead) key = "banner.secondary";
			if (key === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: cards_module_css_default.banner,
				children: t(key)
			});
		}
		/** 从卡片上忽略一条，提示里带撤销。 */
		function dismissItem(inbox, id) {
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
				},
				view: null
			});
		}
		/** 可以从卡片上直接忽略：不在等模型，也还没有结论。 */
		function dismissable(item) {
			return !inFlight(item) && item.state !== "written" && item.state !== "skipped" && item.state !== "dismissed";
		}
		/** 一组卡片，不分组。 */
		function CardList({ items, now, t, selected, onOpen, onDismiss }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: cards_module_css_default.list,
				children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
					item,
					now,
					t,
					selected: item.id === selected,
					onOpen,
					onDismiss: dismissable(item) ? onDismiss : void 0
				}, item.id))
			});
		}
		/** 按状态分组的卡片；历史默认收起，选中的卡片在历史里时展开，用户点过之后按用户的选择。 */
		function GroupedCards(props) {
			const { items, selected, t } = props;
			const groups = groupItems(items);
			/** 用户展开或收起过历史；为 null 时跟随选中的卡片。 */
			const [expanded, setExpanded] = (0, react.useState)(null);
			const history = expanded ?? groups.history.some((item) => item.id === selected);
			const section = (key, entries) => entries.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: cards_module_css_default.section,
				"aria-label": t(key),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: cards_module_css_default.sectionTitle,
					children: t(key)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardList, {
					...props,
					items: entries
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				section("section.review", groups.review),
				section("section.found", groups.found),
				groups.history.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: cards_module_css_default.section,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: cards_module_css_default.historyToggle,
						"aria-expanded": history,
						onClick: () => setExpanded(!history),
						children: history ? t("history.hide") : t("history.show", { count: groups.history.length })
					}), history && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardList, {
						...props,
						items: groups.history
					})]
				})
			] });
		}
		/** 没有任何卡片时的说明。 */
		function EmptyInbox({ inbox, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cards_module_css_default.empty,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: cards_module_css_default.emptyTitle,
						children: t("panel.empty.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: cards_module_css_default.emptyBody,
						children: t("panel.empty.body")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: cards_module_css_default.caption,
						children: t(inbox.status.analyzed.sessions === 1 ? "panel.analyzed.one" : "panel.analyzed.other", { sessions: inbox.status.analyzed.sessions })
					})
				]
			});
		}
		/** 一条提示的正文与按钮：查看、撤销、关闭。 */
		function NoticeBar({ notice, face, t, onView }) {
			const { inbox } = face;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: cards_module_css_default.noticeText,
				children: t(notice.key, notice.params)
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: cards_module_css_default.noticeActions,
				children: [notice.view !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: cards_module_css_default.link,
					onClick: () => {
						const target = notice.view;
						inbox.clearNotice();
						onView?.();
						showItem(face, target);
					},
					children: t("notice.view")
				}), notice.undo !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: cards_module_css_default.link,
					onClick: () => {
						const action = notice.undo;
						inbox.clearNotice();
						if (action !== null) inbox.act(action);
					},
					children: t("notice.undo")
				})]
			})] });
		}
		//#endregion
		//#region src/client/hooks.ts
		/** 订阅 Observable、读取 Host 路由、读取时钟与「减少动态效果」偏好的 React Hook。 */
		function useSnapshot(source) {
			return (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot, source.getSnapshot);
		}
		/** 错误的说明文字。 */
		function errorText(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* 读取一次，`load` 或 `revision` 变化时重新读取；重新读取期间保留上一次的结果，界面不闪回加载中。
		* `revision` 标识数据可能变了的时机（例如收件箱里的工作状态），原样传给 `load`。
		* 组件卸载或换了读取时，进行中的请求随 AbortSignal 取消。
		*/
		function useLoaded(load, revision) {
			const [state, setState] = (0, react.useState)({ status: "loading" });
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				load(revision, controller.signal).then((value) => {
					if (!controller.signal.aborted) setState({
						status: "ready",
						value
					});
				}, (reason) => {
					if (!controller.signal.aborted) setState({
						status: "error",
						error: errorText(reason)
					});
				});
				return () => controller.abort();
			}, [load, revision]);
			return state;
		}
		/** 当前时间，每隔 `interval` 毫秒更新一次。 */
		function useNow(interval) {
			const [now, setNow] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => setNow(Date.now()), interval);
				return () => clearInterval(timer);
			}, [interval]);
			return now;
		}
		const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
		function subscribeMotion(listener) {
			const query = window.matchMedia(REDUCED_MOTION);
			query.addEventListener("change", listener);
			return () => query.removeEventListener("change", listener);
		}
		/** 系统设置了减少动态效果。 */
		function useReducedMotion() {
			return (0, react.useSyncExternalStore)(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
		}
		/** 提交操作的忙碌状态与失败说明；操作被拒绝或请求失败时把原因翻译成界面文案。 */
		function useAction(inbox, t) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const run = async (action, notice) => {
				setBusy(true);
				setError(null);
				try {
					const result = await inbox.act(action, notice);
					if (!result.ok) setError(t(`error.${result.error.kind}`));
					return result;
				} catch (reason) {
					setError(t("error.request", { error: errorText(reason) }));
					return null;
				} finally {
					setBusy(false);
				}
			};
			return {
				busy,
				error,
				run
			};
		}
		//#endregion
		//#region \0dsh-css:src/client/inbox.module.css.mjs
		const css$6 = ".Wfa-jG_root{margin-left:4px;position:relative}.Wfa-jG_trigger{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:28px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex;position:relative}.Wfa-jG_trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px;color:var(--dsw-alias-label-secondary)}@media (hover:hover){.Wfa-jG_trigger:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}}.Wfa-jG_trigger[aria-expanded=true]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}.Wfa-jG_trigger svg{flex:none}.Wfa-jG_badge{box-sizing:border-box;background:var(--dsw-alias-label-secondary);min-width:14px;height:14px;color:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));text-align:center;font-variant-numeric:tabular-nums;pointer-events:none;border-radius:7px;padding:0 3px;font-size:9px;font-weight:600;line-height:14px;position:absolute;top:1px;right:0}.Wfa-jG_panel,.Wfa-jG_toast{z-index:100;box-sizing:border-box;background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);animation:Wfa-jG_panel-in .14s var(--ds-ease-in-out,ease);border:0;border-radius:16px;position:fixed}.Wfa-jG_panel{flex-direction:column;width:360px;max-width:calc(100vw - 32px);max-height:min(480px,100vh - 140px);padding:4px;display:flex}.Wfa-jG_panel:focus{outline:none}@keyframes Wfa-jG_panel-in{0%{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:none}}.Wfa-jG_head{flex:none;align-items:center;gap:8px;padding:8px 12px 6px;display:flex}.Wfa-jG_title{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;font-weight:600;line-height:18px}.Wfa-jG_working{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.Wfa-jG_spacer{flex:1}.Wfa-jG_scroll{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;flex:auto;gap:6px;min-height:0;display:flex;overflow-y:auto}.Wfa-jG_errorRow{color:var(--dsw-alias-state-warn-label);justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;font-size:12px;line-height:18px;display:flex}.Wfa-jG_link{color:var(--dsw-alias-state-business-primary);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;font-size:12px}.Wfa-jG_link:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;border-radius:4px}.Wfa-jG_notice{border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);flex:none;align-items:center;gap:8px;margin-top:4px;padding:8px 12px;font-size:12px;line-height:18px;display:flex}.Wfa-jG_toast{width:max-content;max-width:min(360px,100vw - 32px);color:var(--dsw-alias-label-secondary);align-items:center;gap:10px;padding:8px 8px 8px 14px;font-size:12px;line-height:18px;display:flex}.Wfa-jG_toastClose{width:22px;height:22px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.Wfa-jG_toastClose:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}@media (hover:hover){.Wfa-jG_toastClose:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}}@media (prefers-reduced-motion:reduce){.Wfa-jG_panel,.Wfa-jG_toast{animation:none}}";
		const tag$6 = "@agent-stash/dsh-skill-scout/inbox.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$6)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$6;
			style.textContent = css$6;
			document.head.appendChild(style);
		}
		var inbox_module_css_default = {
			"badge": "Wfa-jG_badge",
			"errorRow": "Wfa-jG_errorRow",
			"head": "Wfa-jG_head",
			"link": "Wfa-jG_link",
			"notice": "Wfa-jG_notice",
			"panel": "Wfa-jG_panel",
			"panel-in": "Wfa-jG_panel-in",
			"root": "Wfa-jG_root",
			"scroll": "Wfa-jG_scroll",
			"spacer": "Wfa-jG_spacer",
			"title": "Wfa-jG_title",
			"toast": "Wfa-jG_toast",
			"toastClose": "Wfa-jG_toastClose",
			"trigger": "Wfa-jG_trigger",
			"working": "Wfa-jG_working"
		};
		//#endregion
		//#region src/client/inbox.tsx
		/**
		* 会话标题栏里的经验提炼入口：一个图标按钮，有新建议时带一个小计数；点开是收件箱浮层，
		* 点卡片在主区域打开「历史回溯提炼」页并选中这条。入口在第一次读取完成前不渲染，避免标题栏闪动。
		* 计数只算打开收件箱之后出现的、等用户决定的摘要与草稿，看过即清零；详情面板里正显示的那条在眼前，不计入。
		* 页面没开着时，提示从入口下方弹出。
		*/
		const MEASURE_STYLE = {
			visibility: "hidden",
			left: 0,
			top: 0
		};
		/** 等用户决定的摘要与草稿。 */
		function awaiting(inbox) {
			return (inbox?.items ?? []).filter((item) => item.state === "proposed" || item.state === "ready").map((item) => item.id);
		}
		/** 新建议数：等用户决定、还没看过，也不在打开的详情里。 */
		function unseen(inbox, seen, viewing) {
			return awaiting(inbox).filter((id) => !viewing.includes(id) && !seen.has(id)).length;
		}
		/** 标题栏入口、收件箱浮层与弹出提示。 */
		function InboxEntry(props) {
			const { inbox, seen, t } = props;
			const state = useSnapshot(inbox);
			const [open, setOpen] = (0, react.useState)(false);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const [, setSeenVersion] = (0, react.useState)(0);
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const toastRef = (0, react.useRef)(null);
			const position = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open,
				anchorRef: triggerRef,
				panelRef,
				side: "bottom",
				gap: 5,
				margin: 16
			});
			const toast = !open && !state.paged ? state.notice : null;
			const toastPosition = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open: toast !== null,
				anchorRef: triggerRef,
				panelRef: toastRef,
				side: "bottom",
				gap: 5,
				margin: 16
			});
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, setOpen, panelRef);
			(0, react.useEffect)(() => {
				if (state.inbox === null) return;
				const ids = awaiting(state.inbox).filter((id) => open || state.viewing.includes(id));
				if (ids.some((id) => !seen.has(id))) seen.add(ids);
			}, [
				open,
				state.viewing,
				state.inbox,
				seen
			]);
			if (state.inbox === null && state.status !== "error") return null;
			const fresh = unseen(state.inbox, seen, state.viewing);
			const badge = state.inbox?.status.notify === "badge" && fresh > 0;
			const label = fresh === 0 ? t("entry.label") : t(fresh === 1 ? "entry.count.one" : "entry.count.other", { count: fresh });
			const asking = (state.inbox?.status.working ?? 0) > 0;
			const working = asking || state.inbox?.status.scanning === true;
			/** 打开收件箱：刷新状态，并把当前的待决定建议记为看过。 */
			const show = () => {
				seen.add(awaiting(state.inbox));
				setSeenVersion((version) => version + 1);
				setNow(Date.now());
				setOpen(true);
				inbox.refresh();
			};
			const close = () => {
				setOpen(false);
				setSeenVersion((version) => version + 1);
				triggerRef.current?.focus();
			};
			const onKeyDown = (event) => {
				if (event.key !== "Escape" || !open) return;
				event.preventDefault();
				close();
			};
			/** 在页面里打开一张卡片；不传 id 时只打开页面。 */
			const openPage = (id) => {
				setOpen(false);
				showItem(props, id);
			};
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
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: inbox_module_css_default.title,
								children: t("panel.title")
							}),
							working && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: inbox_module_css_default.working,
								role: "status",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TextShimmer, {
									active: true,
									children: asking ? t("panel.working") : t("panel.analyzing")
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: inbox_module_css_default.spacer }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: inbox_module_css_default.link,
								onClick: () => openPage(null),
								children: t("page.title")
							})
						]
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
							state.inbox !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
								inbox: state.inbox,
								t
							}),
							state.inbox !== null && (state.inbox.items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyInbox, {
								inbox: state.inbox,
								t
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupedCards, {
								items: state.inbox.items,
								now,
								t,
								selected: null,
								onOpen: openPage,
								onDismiss: (id) => dismissItem(inbox, id)
							}))
						]
					}),
					state.notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: inbox_module_css_default.notice,
						role: "status",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NoticeBar, {
							notice: state.notice,
							face: props,
							t,
							onView: () => setOpen(false)
						})
					})
				]
			}), document.body) : null;
			const popup = toast === null ? null : (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: toastRef,
				className: inbox_module_css_default.toast,
				style: toastPosition ?? MEASURE_STYLE,
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NoticeBar, {
					notice: toast,
					face: props,
					t
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: inbox_module_css_default.toastClose,
					"aria-label": t("notice.close"),
					onClick: () => inbox.clearNotice(),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
				})]
			}), document.body);
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
					popup
				]
			});
		}
		//#endregion
		//#region src/client/locale.ts
		const SCOUT_LOCALE = "agent-stash-skill-scout";
		/** 两种语言的字典。 */
		const SCOUT_DICTIONARIES = {
			en: {
				"view.label": "Skill Scout",
				"page.title": "Skill Scout History",
				"page.tabs": "Skill Scout History sections",
				"page.tab.suggestions": "Suggestions",
				"page.tab.search": "Search",
				"page.tab.stats": "Stats",
				"entry.label": "Skill suggestions",
				"entry.count.one": "Skill suggestions, {count} new",
				"entry.count.other": "Skill suggestions, {count} new",
				"panel.title": "Skill suggestions",
				"panel.analyzing": "Analyzing sessions",
				"panel.working": "Asking the model",
				"panel.loading": "Loading",
				"panel.error": "Could not load suggestions.",
				"panel.retry": "Retry",
				"panel.empty.title": "No suggestions",
				"panel.empty.body": "A suggestion appears when a workflow repeats across sessions or a fix passes a check.",
				"panel.analyzed.one": "{sessions} session analyzed",
				"panel.analyzed.other": "{sessions} sessions analyzed",
				"section.review": "Needs your decision",
				"section.found": "Found locally",
				"history.show": "History ({count})",
				"history.hide": "Hide history",
				"banner.noModel": "No discovery model is available. Choose one in Skill Scout settings.",
				"banner.discoveryOff": "Session analysis is off.",
				"banner.secondary": "Another DSH window is analyzing sessions.",
				"notice.dismissed": "Dismissed",
				"notice.dismissedSimilar": "Dismissed this and similar suggestions",
				"notice.restored": "Restored",
				"notice.written": "Saved {skill}",
				"notice.undone": "Undid the change to {skill}",
				"notice.undo": "Undo",
				"notice.view": "View",
				"notice.close": "Close",
				"notice.done.proposed": "Summary ready: {title}",
				"notice.done.ideas": "Summary proposed {count} ideas: {title}",
				"notice.done.skipped": "Not worth saving: {title}",
				"notice.done.ready": "Draft ready: {title}",
				"notice.done.failed": "Summary failed: {title}",
				"notice.done.draftFailed": "Drafting failed: {title}",
				"notice.done.many": "{count} requests finished",
				"kind.repeated": "Repeated workflow",
				"kind.recovery": "Verified fix",
				"kind.complex": "Long verified task",
				"kind.session": "Session extract",
				"kind.selected": "Selected tasks",
				"meta.sessions.one": "{count} session",
				"meta.sessions.other": "{count} sessions",
				"meta.merged": "{count} more with this name",
				"state.detected": "No summary yet",
				"state.summarizing": "Summarizing",
				"state.proposed": "Summary ready",
				"state.skipped": "Not worth saving",
				"state.drafting": "Drafting",
				"state.ready": "Draft ready",
				"state.failed": "Summary failed",
				"state.draftFailed": "Draft failed",
				"state.dismissed": "Dismissed",
				"state.written": "Saved",
				"time.now": "just now",
				"time.minutes": "{count} min ago",
				"time.hours": "{count} h ago",
				"time.days": "{count} d ago",
				"duration.seconds": "{seconds}s",
				"duration.minutes": "{minutes}m {seconds}s",
				"phase.queued": "Queued",
				"phase.preparing": "Preparing the evidence",
				"phase.waiting": "Waiting for the model",
				"phase.thinking": "The model is thinking",
				"phase.writing.one": "Writing ({count} character received)",
				"phase.writing.other": "Writing ({count} characters received)",
				"phase.checking": "Checking against the evidence",
				"progress.elapsed": "{time} elapsed",
				"detail.none": "Select a suggestion.",
				"detail.siblings": "Other ideas from this summary",
				"detail.tab.summary": "Summary",
				"detail.tab.evidence": "Evidence",
				"detail.tab.skill": "Skill",
				"detail.tab.changes": "Changes",
				"detail.tabs": "Suggestion sections",
				"detail.loading": "Loading the evidence",
				"detail.error": "Could not load this suggestion.",
				"detail.summarizedBy": "Summary by {model}",
				"detail.draftedBy": "Draft by {model}",
				"detail.local": "Local rules found this in tool results. No model has read it yet.",
				"detail.steps": "Steps the rules matched",
				"detail.summaryNote.one": "A summary sends redacted evidence from {count} task to {model}: requests, messages during the task, commands, exit codes, and one error line per failed command. It returns a few lines, not a Skill.",
				"detail.summaryNote.other": "A summary sends redacted evidence from {count} tasks to {model}: requests, messages during the task, commands, exit codes, and one error line per failed command. It returns a few lines, not a Skill.",
				"detail.summarize": "Summarize",
				"detail.resummarize": "Summarize again",
				"detail.summarizing": "{model} is writing the summary",
				"detail.noSummaryModel": "No discovery model is available.",
				"detail.found": "Found",
				"detail.description": "Purpose",
				"detail.trigger": "When to use",
				"detail.plan": "Plan",
				"detail.risks": "Risks",
				"detail.verification": "Verify",
				"detail.plan.create": "Create",
				"detail.plan.improve": "Add to",
				"detail.consent": "Drafting sends the same evidence and this plan to {model}, which writes the Skill. You review and edit it before anything is saved.",
				"detail.noDraftModel": "No drafting model is available.",
				"detail.draft.create": "Draft Skill",
				"detail.draft.improve": "Draft addition",
				"detail.redraft": "Draft again",
				"detail.drafting": "{model} is drafting the Skill",
				"detail.skipped": "The summary found nothing worth saving.",
				"detail.failed.summary": "Summary failed: {kind}",
				"detail.failed.draft": "Drafting failed: {kind}",
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
				"evidence.steering": "During the task",
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
				"written.path": "Saved to {path}",
				"written.discovered": "DSH lists the Skill.",
				"written.checking": "Waiting for DSH to list the Skill.",
				"written.missing": "DSH does not list the Skill yet. Check the file.",
				"error.invalid": "This action does not apply to the suggestion in its current state.",
				"error.missing": "The suggestion no longer exists.",
				"error.busy": "This suggestion is already with the model.",
				"error.no-model": "No model is available for this step.",
				"error.exists": "A Skill file already exists at that path.",
				"error.changed": "The file changed after the preview. Nothing was written.",
				"error.outside": "The target is outside the project and user Skill folders.",
				"error.unsafe": "The content contains a credential. Remove it and try again.",
				"error.empty": "There are no tasks to extract.",
				"error.request": "The request failed: {error}",
				"session.state.analyzed.one": "{count} task analyzed",
				"session.state.analyzed.other": "{count} tasks analyzed",
				"session.state.waiting": "Analyzed after the quiet period",
				"session.state.pending": "Not analyzed yet",
				"session.state.failed": "Analysis failed: {error}",
				"session.state.subagent": "Subagent sessions are not analyzed on their own.",
				"session.state.missing": "DSH has no record of this session.",
				"session.analyze": "Analyze now",
				"session.extract": "Extract from this session",
				"session.items": "Suggestions citing this session",
				"session.items.empty": "No suggestion cites this session.",
				"session.tasks": "Tasks in this session",
				"session.tasks.empty": "No tasks recorded.",
				"session.error": "Could not load this session: {error}",
				"task.commands.one": "{count} command",
				"task.commands.other": "{count} commands",
				"task.edits.one": "{count} edit",
				"task.edits.other": "{count} edits",
				"task.recoveries.one": "{count} fix",
				"task.recoveries.other": "{count} fixes",
				"search.label": "Search tasks",
				"search.placeholder": "Commands, errors, file paths, or requests",
				"search.outcome": "Outcome",
				"search.outcome.all": "All outcomes",
				"search.scope": "Searches {tasks} from {sessions}.",
				"search.scope.tasks.one": "{count} task",
				"search.scope.tasks.other": "{count} tasks",
				"search.scope.sessions.one": "{count} analyzed session",
				"search.scope.sessions.other": "{count} analyzed sessions",
				"search.total.one": "{total} matching task",
				"search.total.other": "{total} matching tasks",
				"search.totalShown": "{total} matching tasks, showing the first {count}",
				"search.empty": "No matching tasks.",
				"search.error": "Search failed: {error}",
				"search.pick": "Select {goal}",
				"search.picked": "{count} selected",
				"search.limit": "Up to {count} tasks",
				"search.clear": "Clear",
				"search.extract": "Extract selected",
				"backfill.90d": "Read past 90 days",
				"backfill.all": "Read all sessions",
				"backfill.progress": "Reading earlier sessions",
				"backfill.listing": "Listing sessions",
				"backfill.running": "Reading earlier sessions: {done} of {total}",
				"backfill.paused": "Paused: {done} of {total}",
				"backfill.done.one": "Read {done} earlier session",
				"backfill.done.other": "Read {done} earlier sessions",
				"backfill.failed": "{count} failed",
				"backfill.pause": "Pause",
				"backfill.resume": "Resume",
				"stats.error": "Could not load stats: {error}",
				"stats.empty": "Nothing yet.",
				"stats.unknown": "not listed yet",
				"stats.coverage": "Coverage",
				"stats.coverage.analyzed": "Analyzed",
				"stats.coverage.inRange": "In range",
				"stats.coverage.total": "All sessions",
				"stats.coverage.backfilled": "Read by backfill",
				"stats.failed": "Sessions that failed analysis",
				"stats.outcomes": "Task outcomes",
				"stats.funnel": "Leads and ideas",
				"funnel.leads": "Leads",
				"funnel.summarized": "Summarized",
				"funnel.skipped": "Not worth saving",
				"funnel.ideas": "Ideas",
				"funnel.drafted": "Drafted",
				"funnel.written": "Saved",
				"funnel.dismissed": "Dismissed",
				"stats.actions": "Frequent actions",
				"stats.errors": "Recurring errors",
				"stats.searchFor": "Search for {text}",
				"stats.usage": "Model usage, last 7 days",
				"usage.input": "Input",
				"usage.cacheRead": "Cache read",
				"usage.cacheWrite": "Cache write",
				"usage.output": "Output",
				"usage.requests": "{summaries} background · {requested} requested · {failures} failed",
				"stats.calls": "Recent model calls",
				"stage.summary": "Summary",
				"stage.draft": "Draft",
				"call.proposed": "Proposed",
				"call.skipped": "Not worth saving",
				"call.drafted": "Drafted",
				"call.failed": "Failed",
				"call.tokens": "{input} in · {output} out",
				"call.ideas.one": "{count} idea",
				"call.ideas.other": "{count} ideas",
				"call.detail": "{result}: {detail}",
				"code.copy": "Copy",
				"code.copied": "Copied",
				"code.label": "Code",
				"code.wrap": "Wrap lines",
				"code.unwrap": "Do not wrap lines",
				"code.footnotes": "Footnotes",
				"diff.collapse": "Collapse",
				"diff.collapseAria": "Collapse the diff",
				"diff.expand.one": "Show {count} more line",
				"diff.expand.other": "Show {count} more lines",
				"settings.summary": "Suggests Skills from workflows that worked in finished sessions.",
				"settings.unavailable": "Settings are not available.",
				"settings.readOnly": "This profile is read-only.",
				"settings.saveFailed": "Could not save. The settings changed elsewhere or the write was refused.",
				"settings.save": "Save",
				"settings.saving": "Saving",
				"settings.section.discovery": "Discovery",
				"settings.section.summary": "Summaries",
				"settings.section.draft": "Drafting",
				"settings.section.limits": "Limits",
				"settings.section.privacy": "Privacy",
				"settings.section.inbox": "Inbox",
				"settings.discovery": "Analyze finished sessions",
				"settings.discoveryHint": "Runs on this machine and reads only the session logs DSH already keeps.",
				"settings.summarize": "Summarize in the background",
				"settings.summarizeHint": "Sends redacted evidence of strong findings to the discovery model for a short summary. A Skill is drafted only after you approve its summary.",
				"settings.summaryModel": "Discovery model",
				"settings.summaryModelHint": "Writes the summaries; a small, fast model is enough. The default follows the Agent's default model.",
				"settings.draftModel": "Drafting model",
				"settings.draftModelHint": "Writes the Skill after you approve a summary. The default follows the Agent's default model.",
				"settings.modelDefault": "Default ({model})",
				"settings.modelDefaultUnknown": "Default model",
				"settings.modelLoading": "Loading models",
				"settings.modelError": "Could not load the model list.",
				"settings.modelMissing": "{model} (not available)",
				"settings.effort": "Reasoning effort",
				"settings.effortHint": "Lower effort is cheaper and faster.",
				"settings.effortDefault": "Model default",
				"settings.summaryTimeout": "Timeout",
				"settings.summaryTimeoutHint": "Seconds before a summary is abandoned.",
				"settings.draftTimeout": "Timeout",
				"settings.draftTimeoutHint": "Seconds before a draft is abandoned.",
				"settings.dailySummaries": "Summaries per day",
				"settings.dailySummariesHint": "Background summaries allowed each day. Your own requests do not count.",
				"settings.summaryInterval": "Summary interval",
				"settings.summaryIntervalHint": "Minutes between background summaries.",
				"settings.quietPeriod": "Quiet period",
				"settings.quietPeriodHint": "Minutes a session stays idle before it is analyzed.",
				"settings.historyDays": "History",
				"settings.historyDaysHint": "Days of past sessions to analyze.",
				"settings.maxSessions": "Startup scan",
				"settings.maxSessionsHint": "Past sessions read when DSH starts.",
				"settings.minOccurrences": "Repeats needed",
				"settings.minOccurrencesHint": "Independent sessions before a repeated workflow counts.",
				"settings.evidenceBudget": "Evidence budget",
				"settings.evidenceBudgetHint": "Characters of evidence sent with one request.",
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
				"settings.prompt": "Summary guidance",
				"settings.promptHint": "Replaces the built-in guidance for deciding what is worth saving. The reply format is always added.",
				"settings.promptPlaceholder": "Built-in guidance",
				"unit.seconds": "s",
				"unit.minutes": "min",
				"unit.days": "days",
				"unit.sessions": "sessions",
				"unit.requests": "requests",
				"unit.characters": "chars"
			},
			zh: {
				"view.label": "经验提炼",
				"page.title": "历史回溯提炼",
				"page.tabs": "历史回溯提炼的分栏",
				"page.tab.suggestions": "建议",
				"page.tab.search": "搜索",
				"page.tab.stats": "统计",
				"entry.label": "Skill 建议",
				"entry.count.one": "Skill 建议，{count} 条新建议",
				"entry.count.other": "Skill 建议，{count} 条新建议",
				"panel.title": "Skill 建议",
				"panel.analyzing": "正在分析会话",
				"panel.working": "正在请求模型",
				"panel.loading": "正在加载",
				"panel.error": "无法加载建议。",
				"panel.retry": "重试",
				"panel.empty.title": "暂无建议",
				"panel.empty.body": "同一流程在多个会话里重复出现，或某次修复经检查命令验证后，这里会出现建议。",
				"panel.analyzed.one": "已分析 {sessions} 个会话",
				"panel.analyzed.other": "已分析 {sessions} 个会话",
				"section.review": "待你决定",
				"section.found": "本地发现",
				"history.show": "历史（{count}）",
				"history.hide": "收起历史",
				"banner.noModel": "没有可用的发现模型，请在经验提炼的设置里选择。",
				"banner.discoveryOff": "会话分析已关闭。",
				"banner.secondary": "另一个 DSH 窗口正在分析会话。",
				"notice.dismissed": "已忽略",
				"notice.dismissedSimilar": "已忽略这条及类似建议",
				"notice.restored": "已恢复",
				"notice.written": "已保存 {skill}",
				"notice.undone": "已撤销对 {skill} 的改动",
				"notice.undo": "撤销",
				"notice.view": "查看",
				"notice.close": "关闭",
				"notice.done.proposed": "摘要已完成：{title}",
				"notice.done.ideas": "摘要给出 {count} 个 idea：{title}",
				"notice.done.skipped": "不值得保存：{title}",
				"notice.done.ready": "草稿已生成：{title}",
				"notice.done.failed": "摘要失败：{title}",
				"notice.done.draftFailed": "生成失败：{title}",
				"notice.done.many": "{count} 个请求已完成",
				"kind.repeated": "重复流程",
				"kind.recovery": "已验证的修复",
				"kind.complex": "经验证的长任务",
				"kind.session": "本会话提炼",
				"kind.selected": "所选任务提炼",
				"meta.sessions.one": "{count} 个会话",
				"meta.sessions.other": "{count} 个会话",
				"meta.merged": "另有 {count} 条同名",
				"state.detected": "尚未摘要",
				"state.summarizing": "正在摘要",
				"state.proposed": "摘要待确认",
				"state.skipped": "不值得保存",
				"state.drafting": "正在生成",
				"state.ready": "草稿待保存",
				"state.failed": "摘要失败",
				"state.draftFailed": "生成失败",
				"state.dismissed": "已忽略",
				"state.written": "已保存",
				"time.now": "刚刚",
				"time.minutes": "{count} 分钟前",
				"time.hours": "{count} 小时前",
				"time.days": "{count} 天前",
				"duration.seconds": "{seconds} 秒",
				"duration.minutes": "{minutes} 分 {seconds} 秒",
				"phase.queued": "排队中",
				"phase.preparing": "正在准备证据",
				"phase.waiting": "等待模型响应",
				"phase.thinking": "模型正在思考",
				"phase.writing.one": "正在写（已收到 {count} 字）",
				"phase.writing.other": "正在写（已收到 {count} 字）",
				"phase.checking": "正在核对证据",
				"progress.elapsed": "已用 {time}",
				"detail.none": "选择一条建议。",
				"detail.siblings": "同一线索的其他 idea",
				"detail.tab.summary": "摘要",
				"detail.tab.evidence": "证据",
				"detail.tab.skill": "Skill",
				"detail.tab.changes": "改动",
				"detail.tabs": "建议的内容",
				"detail.loading": "正在加载证据",
				"detail.error": "无法加载这条建议。",
				"detail.summarizedBy": "摘要：{model}",
				"detail.draftedBy": "草稿：{model}",
				"detail.local": "由本地规则依据工具结果发现，还没有发给任何模型。",
				"detail.steps": "规则匹配到的步骤",
				"detail.summaryNote.one": "生成摘要会把 {count} 个任务的脱敏证据发给 {model}：用户请求、任务中的插话、命令、退出码，以及每条失败命令的一行错误输出。模型只返回几行摘要，不写 Skill。",
				"detail.summaryNote.other": "生成摘要会把 {count} 个任务的脱敏证据发给 {model}：用户请求、任务中的插话、命令、退出码，以及每条失败命令的一行错误输出。模型只返回几行摘要，不写 Skill。",
				"detail.summarize": "生成摘要",
				"detail.resummarize": "重新摘要",
				"detail.summarizing": "{model} 正在写摘要",
				"detail.noSummaryModel": "没有可用的发现模型。",
				"detail.found": "发现",
				"detail.description": "用途",
				"detail.trigger": "何时使用",
				"detail.plan": "将要做",
				"detail.risks": "风险",
				"detail.verification": "验证方式",
				"detail.plan.create": "新建",
				"detail.plan.improve": "追加到",
				"detail.consent": "生成草稿会把同样的证据和这份计划发给 {model}，由它写出 Skill。保存之前你可以审阅和修改。",
				"detail.noDraftModel": "没有可用的生成模型。",
				"detail.draft.create": "生成 Skill 草稿",
				"detail.draft.improve": "生成追加内容",
				"detail.redraft": "重新生成",
				"detail.drafting": "{model} 正在生成 Skill",
				"detail.skipped": "摘要认为没有值得保存的内容。",
				"detail.failed.summary": "摘要失败：{kind}",
				"detail.failed.draft": "生成草稿失败：{kind}",
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
				"evidence.steering": "任务中插话",
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
				"written.path": "已保存到 {path}",
				"written.discovered": "DSH 已列出这个 Skill。",
				"written.checking": "正在等 DSH 列出这个 Skill。",
				"written.missing": "DSH 还没有列出这个 Skill，请检查文件。",
				"error.invalid": "这条建议当前的状态不支持这个操作。",
				"error.missing": "这条建议已不存在。",
				"error.busy": "这条建议正在等模型回复。",
				"error.no-model": "这一步没有可用的模型。",
				"error.exists": "这个路径已经有 Skill 文件。",
				"error.changed": "预览之后文件被改过，没有写入任何内容。",
				"error.outside": "目标不在项目或用户的 Skill 目录里。",
				"error.unsafe": "内容里有凭据，删除后再试。",
				"error.empty": "没有可提炼的任务。",
				"error.request": "请求失败：{error}",
				"session.state.analyzed.one": "已分析 {count} 个任务",
				"session.state.analyzed.other": "已分析 {count} 个任务",
				"session.state.waiting": "等静默期过后分析",
				"session.state.pending": "尚未分析",
				"session.state.failed": "分析失败：{error}",
				"session.state.subagent": "子代理会话不单独分析。",
				"session.state.missing": "DSH 里找不到这个会话。",
				"session.analyze": "立即分析",
				"session.extract": "提炼本会话",
				"session.items": "引用本会话的建议",
				"session.items.empty": "还没有建议引用本会话。",
				"session.tasks": "本会话的任务",
				"session.tasks.empty": "没有记录到任务。",
				"session.error": "无法读取这个会话：{error}",
				"task.commands.one": "{count} 条命令",
				"task.commands.other": "{count} 条命令",
				"task.edits.one": "{count} 处改动",
				"task.edits.other": "{count} 处改动",
				"task.recoveries.one": "{count} 次修复",
				"task.recoveries.other": "{count} 次修复",
				"search.label": "搜索任务",
				"search.placeholder": "命令、错误、文件路径或请求",
				"search.outcome": "结果",
				"search.outcome.all": "全部结果",
				"search.scope": "搜索范围：已分析的 {sessions}、{tasks}。",
				"search.scope.tasks.one": "{count} 个任务",
				"search.scope.tasks.other": "{count} 个任务",
				"search.scope.sessions.one": "{count} 个会话",
				"search.scope.sessions.other": "{count} 个会话",
				"search.total.one": "{total} 个任务匹配",
				"search.total.other": "{total} 个任务匹配",
				"search.totalShown": "{total} 个任务匹配，显示前 {count} 个",
				"search.empty": "没有匹配的任务。",
				"search.error": "搜索失败：{error}",
				"search.pick": "选择 {goal}",
				"search.picked": "已选 {count} 个",
				"search.limit": "最多 {count} 个任务",
				"search.clear": "清除",
				"search.extract": "提炼所选",
				"backfill.90d": "回溯 90 天",
				"backfill.all": "回溯全部",
				"backfill.progress": "正在读取更早的会话",
				"backfill.listing": "正在列出会话",
				"backfill.running": "正在读取更早的会话：{done}/{total}",
				"backfill.paused": "已暂停：{done}/{total}",
				"backfill.done.one": "已读取 {done} 个更早的会话",
				"backfill.done.other": "已读取 {done} 个更早的会话",
				"backfill.failed": "{count} 个失败",
				"backfill.pause": "暂停",
				"backfill.resume": "继续",
				"stats.error": "无法读取统计：{error}",
				"stats.empty": "暂无记录。",
				"stats.unknown": "尚未列出",
				"stats.coverage": "覆盖率",
				"stats.coverage.analyzed": "已分析",
				"stats.coverage.inRange": "范围内",
				"stats.coverage.total": "全部会话",
				"stats.coverage.backfilled": "回溯读入",
				"stats.failed": "分析失败的会话",
				"stats.outcomes": "任务结果",
				"stats.funnel": "线索与 idea",
				"funnel.leads": "线索",
				"funnel.summarized": "已摘要",
				"funnel.skipped": "不值得保存",
				"funnel.ideas": "idea",
				"funnel.drafted": "已生成草稿",
				"funnel.written": "已保存",
				"funnel.dismissed": "已忽略",
				"stats.actions": "高频动作",
				"stats.errors": "反复出现的错误",
				"stats.searchFor": "搜索 {text}",
				"stats.usage": "近 7 天模型用量",
				"usage.input": "输入",
				"usage.cacheRead": "缓存读取",
				"usage.cacheWrite": "缓存写入",
				"usage.output": "输出",
				"usage.requests": "后台 {summaries} · 手动 {requested} · 失败 {failures}",
				"stats.calls": "最近的模型调用",
				"stage.summary": "摘要",
				"stage.draft": "草稿",
				"call.proposed": "给出 idea",
				"call.skipped": "不值得保存",
				"call.drafted": "已生成草稿",
				"call.failed": "失败",
				"call.tokens": "输入 {input} · 输出 {output}",
				"call.ideas.one": "{count} 个 idea",
				"call.ideas.other": "{count} 个 idea",
				"call.detail": "{result}：{detail}",
				"code.copy": "复制",
				"code.copied": "已复制",
				"code.label": "代码",
				"code.wrap": "自动换行",
				"code.unwrap": "不换行",
				"code.footnotes": "脚注",
				"diff.collapse": "收起",
				"diff.collapseAria": "收起改动",
				"diff.expand.one": "展开其余 {count} 行",
				"diff.expand.other": "展开其余 {count} 行",
				"settings.summary": "从已结束会话里做成过的流程中提炼 Skill 建议。",
				"settings.unavailable": "设置不可用。",
				"settings.readOnly": "当前 profile 是只读的。",
				"settings.saveFailed": "保存失败：设置已在别处改动，或写入被拒绝。",
				"settings.save": "保存",
				"settings.saving": "正在保存",
				"settings.section.discovery": "发现",
				"settings.section.summary": "摘要",
				"settings.section.draft": "生成 Skill",
				"settings.section.limits": "限额",
				"settings.section.privacy": "隐私",
				"settings.section.inbox": "收件箱",
				"settings.discovery": "分析已结束的会话",
				"settings.discoveryHint": "在本机运行，只读取 DSH 已保存的会话日志。",
				"settings.summarize": "后台生成摘要",
				"settings.summarizeHint": "把较强发现的脱敏证据发给发现模型，只生成简短摘要。你同意摘要之后才会生成 Skill 草稿。",
				"settings.summaryModel": "发现模型",
				"settings.summaryModelHint": "写摘要用，小而快的模型就够。默认跟随 Agent 的默认模型。",
				"settings.draftModel": "生成模型",
				"settings.draftModelHint": "你同意摘要后写 Skill 用。默认跟随 Agent 的默认模型。",
				"settings.modelDefault": "默认（{model}）",
				"settings.modelDefaultUnknown": "默认模型",
				"settings.modelLoading": "正在加载模型",
				"settings.modelError": "无法加载模型列表。",
				"settings.modelMissing": "{model}（不可用）",
				"settings.effort": "推理强度",
				"settings.effortHint": "强度越低，越便宜也越快。",
				"settings.effortDefault": "模型默认",
				"settings.summaryTimeout": "超时",
				"settings.summaryTimeoutHint": "单次摘要等待的秒数。",
				"settings.draftTimeout": "超时",
				"settings.draftTimeoutHint": "单次生成等待的秒数。",
				"settings.dailySummaries": "每日摘要次数",
				"settings.dailySummariesHint": "每天允许的后台摘要次数，手动发起的不计入。",
				"settings.summaryInterval": "摘要间隔",
				"settings.summaryIntervalHint": "两次后台摘要之间的分钟数。",
				"settings.quietPeriod": "静默期",
				"settings.quietPeriodHint": "会话空闲多少分钟后开始分析。",
				"settings.historyDays": "历史范围",
				"settings.historyDaysHint": "分析最近多少天的会话。",
				"settings.maxSessions": "启动时扫描",
				"settings.maxSessionsHint": "DSH 启动时读取的历史会话数。",
				"settings.minOccurrences": "重复次数",
				"settings.minOccurrencesHint": "重复流程至少要出现在多少个独立会话里。",
				"settings.evidenceBudget": "证据上限",
				"settings.evidenceBudgetHint": "单次请求发送的证据字符数。",
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
				"settings.prompt": "摘要要求",
				"settings.promptHint": "替换内置的「是否值得保存」判断标准，回复格式的约定始终保留。",
				"settings.promptPlaceholder": "内置的判断标准",
				"unit.seconds": "秒",
				"unit.minutes": "分钟",
				"unit.days": "天",
				"unit.sessions": "个",
				"unit.requests": "次",
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
		//#region src/client/navigation.ts
		const INITIAL_PAGE = {
			tab: "suggestions",
			selected: null,
			query: "",
			outcome: null,
			picked: []
		};
		function createPageStore(initial = INITIAL_PAGE) {
			let state = initial;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => state,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				update(patch) {
					state = {
						...state,
						...patch
					};
					for (const listener of listeners) listener();
				}
			};
		}
		//#endregion
		//#region \0dsh-css:src/client/detail.module.css.mjs
		const css$5 = ".FSsC8q_detail{height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;font-size:14px;line-height:22px;display:flex}.FSsC8q_header{flex-direction:column;flex:none;gap:2px;padding:16px 20px 10px;display:flex}.FSsC8q_title{overflow-wrap:anywhere;margin:0;font-size:16px;font-weight:500;line-height:24px}.FSsC8q_subtitle{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.FSsC8q_siblings{flex-direction:column;flex:none;gap:4px;padding:0 20px 10px;display:flex}.FSsC8q_siblingList{flex-wrap:wrap;gap:4px;margin:0;padding:0;list-style:none;display:flex}.FSsC8q_sibling{border-radius:var(--dsw-radius-md);max-width:100%;box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:baseline;gap:6px;padding:3px 10px;font-size:12px;line-height:18px;display:inline-flex}.FSsC8q_sibling[aria-current=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}@media (hover:hover){.FSsC8q_sibling:hover{background:var(--dsw-alias-interactive-bg-hover)}}.FSsC8q_sibling:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.FSsC8q_siblingTitle{overflow-wrap:anywhere;min-width:0}.FSsC8q_siblingState{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px}.FSsC8q_body{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;flex:auto;min-height:0;padding:0 20px 16px;display:flex;overflow-y:auto}.FSsC8q_footer{border-top:.5px solid var(--dsw-alias-border-l2);flex-wrap:wrap;flex:none;align-items:center;gap:8px;padding:12px 20px 16px;display:flex}.FSsC8q_tabs{padding:0 0 12px}.FSsC8q_panel{min-width:0}.FSsC8q_stack{flex-direction:column;gap:14px;min-width:0;display:flex}.FSsC8q_heading{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;font-weight:600;line-height:18px}.FSsC8q_block{flex-direction:column;gap:6px;display:flex}.FSsC8q_steps{color:var(--dsw-alias-label-tertiary);flex-direction:column;gap:2px;margin:0;padding:0 0 0 20px;font-size:12px;line-height:18px;display:flex}.FSsC8q_steps code{font-family:var(--dsw-font-family-mono,ui-monospace, monospace);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}.FSsC8q_summary{grid-template-columns:max-content 1fr;gap:10px 16px;margin:0;font-size:13px;line-height:20px;display:grid}.FSsC8q_summary dt{color:var(--dsw-alias-label-tertiary)}.FSsC8q_summary dd{min-width:0;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0}.FSsC8q_planTarget{flex-wrap:wrap;align-items:baseline;gap:6px;margin:0;display:flex}.FSsC8q_planTarget code{font-family:var(--dsw-font-family-mono,ui-monospace, monospace);font-size:12px}.FSsC8q_outline{color:var(--dsw-alias-label-secondary);margin:4px 0 0;padding:0 0 0 20px}.FSsC8q_risks{margin:0;padding:0 0 0 16px}.FSsC8q_working{flex-direction:column;gap:10px;display:flex}.FSsC8q_workingLabel{color:var(--dsw-alias-label-secondary);flex-wrap:wrap;align-items:baseline;gap:2px 8px;margin:0;font-size:12px;line-height:18px;display:flex}.FSsC8q_model,.FSsC8q_elapsed{color:var(--dsw-alias-label-tertiary)}.FSsC8q_elapsed{font-variant-numeric:tabular-nums}.FSsC8q_skeleton{border-radius:var(--dsw-radius-lg);box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);flex-direction:column;gap:10px;padding:16px;display:flex}.FSsC8q_skeletonBar{border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-skeleton);height:10px;animation:1.1s cubic-bezier(.36,0,.64,1) infinite both FSsC8q_scout-skeleton}.FSsC8q_skeletonGap{height:4px}@keyframes FSsC8q_scout-skeleton{0%,to{opacity:1}50%{opacity:.5}}.FSsC8q_skeletonBar[data-lit]{background:var(--dsw-alias-state-business-primary);opacity:.35;animation:none}.FSsC8q_working[data-motion=reduce] .FSsC8q_skeletonBar{animation:none}.FSsC8q_callout{border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-interactive-bg-hover);flex-direction:column;gap:8px;margin:0;padding:12px 14px;font-size:13px;line-height:20px;display:flex}.FSsC8q_callout p{margin:0}.FSsC8q_note{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.FSsC8q_caution{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-label);margin:0;padding:8px 12px;font-size:12px;line-height:18px}.FSsC8q_failure{color:var(--dsw-alias-state-error-label,var(--dsw-alias-state-warn-label));flex-direction:column;gap:2px;margin:0;font-size:13px;line-height:20px;display:flex}.FSsC8q_failureDetail{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;font-size:12px;line-height:18px}.FSsC8q_episode{border-top:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:12px 0 0;display:flex}.FSsC8q_episodeHead{align-items:flex-start;gap:10px;display:flex}.FSsC8q_ref{border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-interactive-bg-hover);min-width:24px;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums;flex:none;padding:1px 6px;font-size:11px;line-height:18px}.FSsC8q_episodeText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.FSsC8q_goal{-webkit-line-clamp:2;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;-webkit-box-orient:vertical;margin:0;font-size:13px;line-height:20px;display:-webkit-box;overflow:hidden}.FSsC8q_meta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:4px 10px;margin:0;font-size:12px;line-height:18px;display:flex}.FSsC8q_path{font-family:var(--dsw-font-family-mono,ui-monospace, monospace);font-size:11px}.FSsC8q_ops{flex-direction:column;margin:0;padding:0 0 0 34px;list-style:none;display:flex}.FSsC8q_op{border-radius:var(--dsw-radius-md);align-items:flex-start;gap:8px;padding:4px 8px;font-size:12px;line-height:18px;display:flex}.FSsC8q_op[data-cited]{background:var(--dsw-alias-interactive-bg-hover)}.FSsC8q_opGlyph{width:14px;height:18px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}.FSsC8q_op[data-ok=false] .FSsC8q_opGlyph{color:var(--dsw-alias-state-warn-label)}.FSsC8q_opBody{flex-wrap:wrap;flex:1;align-items:baseline;gap:2px 8px;min-width:0;display:flex}.FSsC8q_opLabel{min-width:0;font-family:var(--dsw-font-family-mono,ui-monospace, monospace);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-size:12px}.FSsC8q_opLabel[data-kind=edit]{color:var(--dsw-alias-label-secondary)}.FSsC8q_opTags{flex-wrap:wrap;gap:4px;display:inline-flex}.FSsC8q_tag{border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);padding:0 6px;font-size:11px;line-height:16px}.FSsC8q_tag[data-cited]{color:var(--dsw-alias-state-business-primary)}.FSsC8q_opError{color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-family-mono,ui-monospace, monospace);overflow-wrap:anywhere;flex-basis:100%;font-size:11px}.FSsC8q_opRef{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary));font-variant-numeric:tabular-nums;flex:none;font-size:11px}.FSsC8q_toolbar{justify-content:space-between;align-items:center;gap:8px;display:flex}.FSsC8q_toolbarActions{align-items:center;gap:4px;display:flex}.FSsC8q_facts{grid-template-columns:max-content 1fr;gap:4px 16px;margin:0;font-size:13px;line-height:20px;display:grid}.FSsC8q_facts dt{color:var(--dsw-alias-label-tertiary)}.FSsC8q_facts dd{overflow-wrap:anywhere;min-width:0;margin:0}.FSsC8q_markdown{border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);padding:4px 16px}.FSsC8q_editor{flex-direction:column;gap:12px;display:flex}.FSsC8q_field{flex-direction:column;gap:4px;display:flex}.FSsC8q_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}.FSsC8q_input{box-sizing:border-box;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));width:100%;box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;resize:vertical;border:0;padding:7px 10px;font-size:13px;line-height:20px}.FSsC8q_input:focus-visible{box-shadow:0 0 0 1.5px var(--dsw-alias-state-business-primary);outline:none}.FSsC8q_mono{font-family:var(--dsw-font-family-mono,ui-monospace, monospace);font-size:12px;line-height:18px}.FSsC8q_spacer{flex:1}.FSsC8q_actionError{color:var(--dsw-alias-state-error-label,var(--dsw-alias-state-warn-label));flex-basis:100%;margin:0;font-size:12px;line-height:18px}.FSsC8q_written{min-width:0;color:var(--dsw-alias-label-secondary);flex-direction:column;margin:0;font-size:12px;line-height:18px;display:flex}.FSsC8q_writtenPath{color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family-mono,ui-monospace, monospace);overflow-wrap:anywhere}";
		const tag$5 = "@agent-stash/dsh-skill-scout/detail.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$5)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$5;
			style.textContent = css$5;
			document.head.appendChild(style);
		}
		var detail_module_css_default = {
			"actionError": "FSsC8q_actionError",
			"block": "FSsC8q_block",
			"body": "FSsC8q_body",
			"callout": "FSsC8q_callout",
			"caution": "FSsC8q_caution",
			"detail": "FSsC8q_detail",
			"editor": "FSsC8q_editor",
			"elapsed": "FSsC8q_elapsed",
			"episode": "FSsC8q_episode",
			"episodeHead": "FSsC8q_episodeHead",
			"episodeText": "FSsC8q_episodeText",
			"facts": "FSsC8q_facts",
			"failure": "FSsC8q_failure",
			"failureDetail": "FSsC8q_failureDetail",
			"field": "FSsC8q_field",
			"fieldLabel": "FSsC8q_fieldLabel",
			"footer": "FSsC8q_footer",
			"goal": "FSsC8q_goal",
			"header": "FSsC8q_header",
			"heading": "FSsC8q_heading",
			"input": "FSsC8q_input",
			"markdown": "FSsC8q_markdown",
			"meta": "FSsC8q_meta",
			"model": "FSsC8q_model",
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
			"outline": "FSsC8q_outline",
			"panel": "FSsC8q_panel",
			"path": "FSsC8q_path",
			"planTarget": "FSsC8q_planTarget",
			"ref": "FSsC8q_ref",
			"risks": "FSsC8q_risks",
			"scout-skeleton": "FSsC8q_scout-skeleton",
			"sibling": "FSsC8q_sibling",
			"siblingList": "FSsC8q_siblingList",
			"siblings": "FSsC8q_siblings",
			"siblingState": "FSsC8q_siblingState",
			"siblingTitle": "FSsC8q_siblingTitle",
			"skeleton": "FSsC8q_skeleton",
			"skeletonBar": "FSsC8q_skeletonBar",
			"skeletonGap": "FSsC8q_skeletonGap",
			"spacer": "FSsC8q_spacer",
			"stack": "FSsC8q_stack",
			"steps": "FSsC8q_steps",
			"subtitle": "FSsC8q_subtitle",
			"summary": "FSsC8q_summary",
			"tabs": "FSsC8q_tabs",
			"tag": "FSsC8q_tag",
			"title": "FSsC8q_title",
			"toolbar": "FSsC8q_toolbar",
			"toolbarActions": "FSsC8q_toolbarActions",
			"working": "FSsC8q_working",
			"workingLabel": "FSsC8q_workingLabel",
			"written": "FSsC8q_written",
			"writtenPath": "FSsC8q_writtenPath"
		};
		//#endregion
		//#region src/client/progress.tsx
		/**
		* 模型请求进行中的占位：一行阶段与已用时间，下面是按最终排版画出的占位条。
		* 正文开始到达后，占位条按「已收到字数 / 预计字数」从上往下逐条点亮，点亮的条不再起伏；
		* 减少动态效果时所有条都静止，只有文字在变。
		*/
		/** 摘要占位条的宽度：几行短文本。 */
		const SUMMARY_BARS = [
			"88%",
			"72%",
			"94%",
			"64%",
			"46%"
		];
		/** 草稿占位条的宽度，按 SKILL.md 的排版：标题、描述，空一行，一节标题与几行步骤；空串是段间空行。 */
		const DRAFT_BARS = [
			"36%",
			"94%",
			"82%",
			"",
			"22%",
			"90%",
			"74%",
			"84%",
			"58%"
		];
		/** 相邻占位条的起伏错开的时间，连起来是一道自上而下的波。 */
		const BAR_STAGGER = 70;
		/**
		* 点亮的占位条数：正文按收到的比例点亮，核对阶段全亮，之前的阶段都不亮。
		* @internal 导出供测试使用。
		*/
		function litBars(progress, count) {
			if (progress === null) return 0;
			if (progress.phase === "checking") return count;
			if (progress.phase !== "writing" || progress.expected <= 0) return 0;
			return Math.min(count, Math.floor(progress.chars / progress.expected * count));
		}
		/** 模型正在处理时的状态行与占位条。 */
		function Working({ stage, progress, model, t }) {
			const now = useNow(1e3);
			const reduced = useReducedMotion();
			const widths = stage === "summary" ? SUMMARY_BARS : DRAFT_BARS;
			const lit = litBars(progress, widths.filter((width) => width !== "").length);
			const label = progress === null ? t(stage === "summary" ? "detail.summarizing" : "detail.drafting", { model: model ?? "" }) : phaseLabel(t, progress);
			/** 每条占位条在非空行里的序号，从 1 开始；空行为 0。 */
			const ordinals = widths.map((width, index) => width === "" ? 0 : widths.slice(0, index + 1).filter((entry) => entry !== "").length);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: detail_module_css_default.working,
				"data-motion": reduced ? "reduce" : "full",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: detail_module_css_default.workingLabel,
					children: [
						progress !== null && model !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: detail_module_css_default.model,
							children: model
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							role: "status",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TextShimmer, {
								active: !reduced,
								children: label
							})
						}),
						progress !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: detail_module_css_default.elapsed,
							children: t("progress.elapsed", { time: duration(t, now - progress.startedAt) })
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: detail_module_css_default.skeleton,
					"aria-hidden": "true",
					children: widths.map((width, index) => {
						if (width === "") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: detail_module_css_default.skeletonGap }, `gap-${String(index)}`);
						const on = (ordinals[index] ?? 0) <= lit;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: detail_module_css_default.skeletonBar,
							"data-bar": "",
							"data-lit": on || void 0,
							style: {
								width,
								...on || reduced ? {} : { animationDelay: `${String(index * BAR_STAGGER)}ms` }
							}
						}, `bar-${String(index)}`);
					})
				})]
			});
		}
		//#endregion
		//#region src/client/detail.tsx
		/**
		* 一张卡片的详情面板，嵌在会话 Tab 与「历史回溯提炼」页的右栏：摘要、证据、Skill 预览与编辑、文件改动，
		* 以及生成摘要、同意生成草稿、保存、忽略、撤销。同一线索给出多个 idea 时可以在面板里切换。
		* 证据、摘要与草稿从 Host 读取；卡片的状态跟随收件箱刷新，状态或更新时间变化时重新读取详情。
		*/
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
						expand: (count) => t(count === 1 ? "diff.expand.one" : "diff.expand.other", { count }),
						expandAria: (count) => t(count === 1 ? "diff.expand.one" : "diff.expand.other", { count })
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
					keyed(episode.steering).map(({ key, text }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: detail_module_css_default.note,
						children: [
							t("evidence.steering"),
							": ",
							text
						]
					}, key)),
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
		/** 给可能重复的文本行配上稳定的 key：文本加上它第几次出现。 */
		function keyed(lines) {
			const seen = /* @__PURE__ */ new Map();
			return lines.map((text) => {
				const count = (seen.get(text) ?? 0) + 1;
				seen.set(text, count);
				return {
					key: `${text}#${String(count)}`,
					text
				};
			});
		}
		/** 详情面板；换一张卡片时编辑、预览与页签都重新开始。 */
		function DetailPanel(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Detail, { ...props }, props.item.id);
		}
		/** 按收件箱里的工作状态（两个阶段的模型、默认保存位置）显示一张卡片的详情。 */
		function ItemDetail({ face, view, item, t, onSelect }) {
			const { models, scope } = view.status;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailPanel, {
				item,
				inbox: face.inbox,
				loadDetail: face.loadDetail,
				models: {
					summary: models.summary?.model ?? null,
					draft: models.draft?.model ?? null
				},
				defaultScope: scope,
				openSession: face.openSession,
				t,
				onSelect
			});
		}
		function Detail({ item, inbox, loadDetail, models, defaultScope, openSession, t, onSelect }) {
			const id = item.id;
			const tabsId = (0, react.useId)();
			const labels = useLabels(t);
			/** 用户选中的页签；为 null 时跟随状态：草稿生成中与可以保存时看 Skill，其余看摘要。 */
			const [chosenTab, setChosenTab] = (0, react.useState)(null);
			const [scope, setScope] = (0, react.useState)(defaultScope);
			const [editing, setEditing] = (0, react.useState)(false);
			const [fields, setFields] = (0, react.useState)(null);
			const [section, setSection] = (0, react.useState)(null);
			const [preview, setPreview] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [now] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => inbox.watch(id), [inbox, id]);
			const version = `${item.state}:${String(item.updatedAt)}`;
			const detail = useLoaded((0, react.useCallback)((_version, signal) => loadDetail(id, signal), [loadDetail, id]), version);
			const value = detail.status === "ready" ? detail.value : null;
			const create = item.decision === "suggest_create";
			const improve = item.decision === "suggest_improve";
			const proposal = create || improve;
			const drafted = value !== null && (value.draft !== null || value.section !== null);
			const draft = fields ?? value?.draft ?? null;
			const shownSection = section ?? value?.section ?? null;
			const parsed = draft === null ? null : /* @__PURE__ */ safeParse(SkillFieldsSchema, draft);
			const invalid = create && parsed !== null && !parsed.success;
			const draftFailed = item.state === "failed" && item.failure?.stage === "draft";
			/** 摘要已经给出计划，等用户同意生成草稿。 */
			const awaitingConsent = proposal && (item.state === "proposed" || draftFailed);
			const wantPreview = drafted && item.state === "ready";
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
							error: errorText(reason)
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
					setError(t("error.request", { error: errorText(reason) }));
					return false;
				} finally {
					setBusy(null);
				}
			};
			const skillName = item.skill ?? "";
			const summarize = () => {
				run("summarize", {
					action: "summarize",
					id
				});
			};
			/** 同意摘要，生成草稿；之前的编辑与预览作废，页签回到跟随状态。 */
			const generate = () => {
				setFields(null);
				setSection(null);
				setEditing(false);
				setPreview(null);
				setChosenTab(null);
				run("draft", {
					action: "draft",
					id
				});
			};
			const dismiss = (similar) => {
				run("dismiss", {
					action: "dismiss",
					id,
					similar
				}, {
					key: similar ? "notice.dismissedSimilar" : "notice.dismissed",
					params: {},
					undo: {
						action: "restore",
						id
					},
					view: null
				});
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
					},
					view: null
				})) {
					setEditing(false);
					setPreview(null);
				}
			};
			const tabs = [
				{
					value: "summary",
					label: t("detail.tab.summary")
				},
				...item.state === "drafting" || drafted ? [{
					value: "skill",
					label: t("detail.tab.skill")
				}] : [],
				...item.state === "ready" && drafted ? [{
					value: "changes",
					label: t("detail.tab.changes")
				}] : [],
				{
					value: "evidence",
					label: t("detail.tab.evidence")
				}
			];
			const autoTab = item.state === "drafting" || item.state === "ready" ? "skill" : "summary";
			const wanted = chosenTab ?? autoTab;
			const activeTab = tabs.some((entry) => entry.value === wanted) ? wanted : "summary";
			const subtitle = [sourceOf(t, item), value?.draftCall != null ? t("detail.draftedBy", { model: value.draftCall.model }) : value?.summary != null ? t("detail.summarizedBy", { model: value.summary.model }) : stateLabel(t, item)].join(" · ");
			const failure = (stage) => item.state === "failed" && item.failure?.stage === stage ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: detail_module_css_default.failure,
				role: "alert",
				children: [t(stage === "summary" ? "detail.failed.summary" : "detail.failed.draft", { kind: t(`failure.${item.failure.kind}`) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: detail_module_css_default.failureDetail,
					children: item.failure.message
				})]
			}) : null;
			/** 规则匹配到的步骤，原来的写法。 */
			const steps = () => item.steps.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: detail_module_css_default.block,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: detail_module_css_default.heading,
					children: t("detail.steps")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
					className: detail_module_css_default.steps,
					children: keyed(item.steps).map(({ key, text }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: text }) }, key))
				})]
			});
			/** 摘要里的方案：发现了什么、Skill 做什么、何时使用、将要新建或改进哪个 Skill 与提纲、风险、验证方式。 */
			const plan = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
				className: detail_module_css_default.summary,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.found") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: item.found }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.description") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: item.description }),
					item.trigger !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.trigger") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: item.trigger })] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.plan") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: detail_module_css_default.planTarget,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(create ? "detail.plan.create" : "detail.plan.improve") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: skillName })]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: detail_module_css_default.outline,
						children: keyed(item.outline).map(({ key, text }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: text }, key))
					})] }),
					item.risks.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.risks") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: detail_module_css_default.risks,
						children: keyed(item.risks).map(({ key, text }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: text }, key))
					}) })] }),
					item.verification !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.verification") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: item.verification })] })
				]
			});
			const summaryTab = () => {
				if (item.state === "summarizing") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.stack,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Working, {
						stage: "summary",
						progress: item.progress,
						model: models.summary,
						t
					}), steps()]
				});
				if (proposal) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.stack,
					children: [plan(), awaitingConsent && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.callout,
						children: [failure("draft"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: detail_module_css_default.note,
							children: models.draft === null ? t("detail.noDraftModel") : t("detail.consent", { model: models.draft })
						})]
					})]
				});
				if (item.decision === "skip") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.stack,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.callout,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("detail.skipped") }), item.reason !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: detail_module_css_default.note,
							children: item.reason
						})]
					}), steps()]
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.stack,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.callout,
						children: [
							failure("summary"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("detail.local") }),
							item.state !== "written" && item.state !== "dismissed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: detail_module_css_default.note,
								children: models.summary === null ? t("detail.noSummaryModel") : t(item.sessions.length === 1 ? "detail.summaryNote.one" : "detail.summaryNote.other", {
									count: item.sessions.length,
									model: models.summary
								})
							})
						]
					}), steps()]
				});
			};
			const evidence = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: detail_module_css_default.stack,
				children: value?.episodes.map((episode) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Episode, {
					episode,
					now,
					openSession,
					t
				}, episode.episodeId))
			});
			const cautions = () => item.cautions.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: detail_module_css_default.caution,
				role: "note",
				children: t("detail.cautions", { list: item.cautions.map((caution) => {
					const key = `caution.${caution}`;
					return isCaution(key) ? t(key) : caution;
				}).join(", ") })
			});
			/** 草稿页签的工具栏：编辑、还原，以及按同一份摘要重新生成。 */
			const toolbar = (lead) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: detail_module_css_default.toolbar,
				children: [lead, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: detail_module_css_default.toolbarActions,
					children: [
						item.state === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							disabled: busy !== null,
							onClick: generate,
							children: t("detail.redraft")
						}),
						(create ? fields : section) !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => create ? setFields(null) : setSection(null),
							children: t("skill.reset")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => setEditing(!editing),
							disabled: item.state !== "ready",
							children: editing ? t("skill.preview") : t("skill.edit")
						})
					]
				})]
			});
			const skill = () => {
				if (item.state === "drafting") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Working, {
					stage: "draft",
					progress: item.progress,
					model: models.draft,
					t
				});
				if (create && draft !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.stack,
					children: [
						cautions(),
						toolbar(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})),
						editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldsEditor, {
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
						})] })
					]
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
							cautions(),
							toolbar(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.heading,
								children: t("skill.section", { skill: skillName })
							})),
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
			/** 右侧的主操作：随阶段从生成摘要、同意生成草稿到保存。 */
			const primary = () => {
				if (item.state === "summarizing" || item.state === "drafting") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "primary",
					disabled: true,
					children: stateLabel(t, item)
				});
				if (awaitingConsent) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "primary",
					disabled: models.draft === null || busy !== null,
					onClick: generate,
					children: draftFailed ? t("detail.redraft") : create ? t("detail.draft.create") : t("detail.draft.improve")
				});
				if (item.state === "ready") {
					const writable = !(preview?.status === "ready" && preview.value.kind === "improve" && !preview.value.writable);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [create && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
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
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "primary",
						disabled: busy !== null || invalid || !writable,
						onClick: () => void save(),
						children: busy === "save" ? t("action.saving") : create ? t("action.save") : t("action.improve", { skill: skillName })
					})] });
				}
				const again = item.decision === "skip" || item.failure !== null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: item.decision === "skip" ? "outline" : "primary",
					disabled: models.summary === null || busy !== null,
					onClick: summarize,
					children: again ? t("detail.resummarize") : t("detail.summarize")
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
							undo: null,
							view: null
						}),
						children: t("action.undo")
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
						undo: null,
						view: null
					}),
					children: t("action.restore")
				})] });
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						disabled: busy !== null,
						onClick: () => dismiss(false),
						children: t("action.dismiss")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						disabled: busy !== null,
						onClick: () => dismiss(true),
						children: t("action.dismissSimilar")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: detail_module_css_default.spacer }),
					primary()
				] });
			};
			const title = titleOf(item);
			const siblings = value?.siblings ?? [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: detail_module_css_default.detail,
				"aria-label": title,
				"aria-busy": busy !== null || void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: detail_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: detail_module_css_default.title,
							children: title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: detail_module_css_default.subtitle,
							children: subtitle
						})]
					}),
					siblings.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
						className: detail_module_css_default.siblings,
						"aria-label": t("detail.siblings"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: detail_module_css_default.heading,
							children: t("detail.siblings")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: detail_module_css_default.siblingList,
							children: siblings.map((sibling) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: detail_module_css_default.sibling,
								"aria-current": sibling.id === id || void 0,
								onClick: () => onSelect(sibling.id),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: detail_module_css_default.siblingTitle,
									children: sibling.title
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: detail_module_css_default.siblingState,
									children: t(`state.${sibling.state}`)
								})]
							}) }, sibling.id))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.body,
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
							value !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: detail_module_css_default.tabs,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
									id: tabsId,
									label: t("detail.tabs"),
									value: activeTab,
									options: tabs,
									onChange: setChosenTab
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.panel,
								role: "tabpanel",
								"aria-labelledby": `${tabsId}-${activeTab}`,
								children: [
									activeTab === "summary" && summaryTab(),
									activeTab === "evidence" && evidence(),
									activeTab === "skill" && skill(),
									activeTab === "changes" && changes()
								]
							})] })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						className: detail_module_css_default.footer,
						children: [error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: detail_module_css_default.actionError,
							role: "alert",
							children: error
						}), footer()]
					})
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
		//#region \0dsh-css:src/client/tasks.module.css.mjs
		const css$4 = ".dJ7M_W_task{border-radius:10px;align-items:flex-start;gap:10px;padding:8px 12px;display:flex}@media (hover:hover){.dJ7M_W_task:hover{background:var(--dsw-alias-interactive-bg-hover)}}.dJ7M_W_pick{accent-color:var(--dsw-alias-state-business-primary);flex:none;margin:3px 0 0}.dJ7M_W_body{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.dJ7M_W_goal{-webkit-line-clamp:2;overflow-wrap:anywhere;-webkit-box-orient:vertical;margin:0;font-size:13px;line-height:18px;display:-webkit-box;overflow:hidden}.dJ7M_W_meta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:2px 8px;margin:0;font-size:11px;line-height:16px;display:flex}.dJ7M_W_outcome{color:var(--dsw-alias-label-secondary)}.dJ7M_W_task[data-outcome=failed] .dJ7M_W_outcome,.dJ7M_W_task[data-outcome=disputed] .dJ7M_W_outcome{color:var(--dsw-alias-state-warn-label)}.dJ7M_W_path{font-family:var(--dsw-font-family-mono,ui-monospace, monospace)}.dJ7M_W_lines{flex-direction:column;gap:1px;margin:2px 0 0;padding:0;font-size:11px;line-height:16px;list-style:none;display:flex}.dJ7M_W_lines code{font-family:var(--dsw-font-family-mono,ui-monospace, monospace);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.dJ7M_W_task mark{background:var(--dsw-alias-state-warn-tertiary);color:inherit;border-radius:2px}";
		const tag$4 = "@agent-stash/dsh-skill-scout/tasks.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$4)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$4;
			style.textContent = css$4;
			document.head.appendChild(style);
		}
		var tasks_module_css_default = {
			"body": "dJ7M_W_body",
			"goal": "dJ7M_W_goal",
			"lines": "dJ7M_W_lines",
			"meta": "dJ7M_W_meta",
			"outcome": "dJ7M_W_outcome",
			"path": "dJ7M_W_path",
			"pick": "dJ7M_W_pick",
			"task": "dJ7M_W_task"
		};
		//#endregion
		//#region src/client/tasks.tsx
		/**
		* 任务（Episode）的一行：用户请求、结果、命令与改动数量、前几步或搜索命中的片段。
		* 会话 Tab 列出本会话的任务；搜索结果在前面加一个勾选框，命中的词高亮。
		*/
		/** 正则里有特殊含义的字符。 */
		const SPECIAL = /[.*+?^${}()|[\]\\]/gu;
		/** 查询词：按空白切开，去掉空串。 */
		function termsOf(query) {
			return query.split(/\s+/u).filter((term) => term !== "");
		}
		/** 把文本里出现的查询词包进 mark，不区分大小写。 */
		function Highlight({ text, terms }) {
			if (terms.length === 0) return text;
			const pattern = new RegExp(`(${terms.map((term) => term.replaceAll(SPECIAL, "\\$&")).join("|")})`, "iu");
			const parts = [];
			let rest = text;
			let match = pattern.exec(rest);
			while (match !== null && match[0] !== "") {
				if (match.index > 0) parts.push(rest.slice(0, match.index));
				parts.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mark", { children: match[0] }, parts.length));
				rest = rest.slice(match.index + match[0].length);
				match = pattern.exec(rest);
			}
			if (rest !== "") parts.push(rest);
			return parts;
		}
		function TaskRow({ task, now, t, terms, pick, openSession }) {
			const counts = [
				task.commands > 0 ? counted(t, "task.commands", task.commands) : null,
				task.edits > 0 ? counted(t, "task.edits", task.edits) : null,
				task.recoveries > 0 ? counted(t, "task.recoveries", task.recoveries) : null
			].filter((entry) => entry !== null);
			const lines = task.matches.length > 0 ? task.matches : task.steps;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: tasks_module_css_default.task,
				"data-outcome": task.outcome,
				"data-episode": task.episodeId,
				children: [
					pick !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						className: tasks_module_css_default.pick,
						"aria-label": t("search.pick", { goal: task.goal }),
						checked: pick.checked,
						disabled: pick.disabled,
						onChange: (event) => pick.onChange(event.target.checked)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: tasks_module_css_default.body,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: tasks_module_css_default.goal,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Highlight, {
									text: task.goal,
									terms
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: tasks_module_css_default.meta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tasks_module_css_default.outcome,
										children: t(`outcome.${task.outcome}`)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: ago(t, task.at, now) }),
									counts.map((count) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: count }, count)),
									task.cwd !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tasks_module_css_default.path,
										children: shortPath(task.cwd)
									})
								]
							}),
							lines.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: tasks_module_css_default.lines,
								"data-matches": task.matches.length > 0 || void 0,
								children: lines.map((line, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Highlight, {
									text: line,
									terms
								}) }) }, `${String(index)}:${line}`))
							})
						]
					}),
					openSession !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => openSession(task.sessionId),
						children: t("detail.openSession")
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/layout.module.css.mjs
		const css$3 = ".wUOHyq_page{box-sizing:border-box;background:var(--dsw-alias-bg-base);height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;padding:20px 24px 0;font-size:14px;line-height:22px;display:flex}.wUOHyq_pageHead{flex-wrap:wrap;flex:none;justify-content:space-between;align-items:center;gap:12px;display:flex}.wUOHyq_pageTitle{margin:0;font-size:18px;font-weight:500;line-height:26px}.wUOHyq_tabPanel{flex-direction:column;flex:auto;min-height:0;display:flex}.wUOHyq_notice{border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);flex:none;align-items:center;gap:10px;padding:8px 8px 8px 14px;font-size:12px;line-height:18px;display:flex}.wUOHyq_noticeClose{width:22px;height:22px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.wUOHyq_noticeClose:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.wUOHyq_root{height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;flex:auto;gap:8px;font-size:14px;line-height:22px;display:flex;container-type:inline-size}.wUOHyq_root[data-view=session]{box-sizing:border-box;padding:12px 16px calc(var(--dsh-composer-height,152px) + 16px)}.wUOHyq_bar{flex-wrap:wrap;flex:none;align-items:center;gap:8px;display:flex}.wUOHyq_state{min-width:0;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px}.wUOHyq_state[data-state=failed]{color:var(--dsw-alias-state-warn-label)}.wUOHyq_spacer{flex:1}.wUOHyq_error{color:var(--dsw-alias-state-error-label,var(--dsw-alias-state-warn-label));margin:0;font-size:12px;line-height:18px}.wUOHyq_note{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.wUOHyq_placeholder{color:var(--dsw-alias-label-tertiary);margin:0;padding:24px 20px;font-size:13px;line-height:20px}.wUOHyq_columns{border-top:.5px solid var(--dsw-alias-border-l2);flex:auto;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(260px,360px) minmax(0,1fr);min-height:0;display:grid}.wUOHyq_list{border-right:.5px solid var(--dsw-alias-border-l2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;gap:12px;min-height:0;padding:8px 8px 16px 0;display:flex;overflow-y:auto}.wUOHyq_detail{min-width:0;min-height:0}@container (width<=720px){.wUOHyq_columns{grid-template-rows:none;grid-template-columns:minmax(0,1fr);grid-auto-rows:auto;overflow-y:auto}.wUOHyq_list{border-right:0;border-bottom:.5px solid var(--dsw-alias-border-l2);padding-right:0;overflow-y:visible}.wUOHyq_detail{min-height:auto}}.wUOHyq_group{flex-direction:column;gap:4px;display:flex}.wUOHyq_groupTitle{color:var(--dsw-alias-label-tertiary);margin:0;padding:0 12px;font-size:11px;font-weight:500;line-height:16px}.wUOHyq_group>.wUOHyq_note{padding:0 12px}.wUOHyq_tasks{flex-direction:column;gap:1px;margin:0;padding:0;list-style:none;display:flex}";
		const tag$3 = "@agent-stash/dsh-skill-scout/layout.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$3)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$3;
			style.textContent = css$3;
			document.head.appendChild(style);
		}
		var layout_module_css_default = {
			"bar": "wUOHyq_bar",
			"columns": "wUOHyq_columns",
			"detail": "wUOHyq_detail",
			"error": "wUOHyq_error",
			"group": "wUOHyq_group",
			"groupTitle": "wUOHyq_groupTitle",
			"list": "wUOHyq_list",
			"note": "wUOHyq_note",
			"notice": "wUOHyq_notice",
			"noticeClose": "wUOHyq_noticeClose",
			"page": "wUOHyq_page",
			"pageHead": "wUOHyq_pageHead",
			"pageTitle": "wUOHyq_pageTitle",
			"placeholder": "wUOHyq_placeholder",
			"root": "wUOHyq_root",
			"spacer": "wUOHyq_spacer",
			"state": "wUOHyq_state",
			"tabPanel": "wUOHyq_tabPanel",
			"tasks": "wUOHyq_tasks"
		};
		//#endregion
		//#region \0dsh-css:src/client/search.module.css.mjs
		const css$2 = "._5q2odW_search{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;flex:auto;gap:10px;min-height:0;padding-bottom:16px;display:flex;overflow-y:auto}._5q2odW_controls{flex-wrap:wrap;gap:8px;display:flex}._5q2odW_input,._5q2odW_select{box-sizing:border-box;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));height:32px;box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;border:0;padding:0 10px;font-size:13px}._5q2odW_input{flex:280px;min-width:0}._5q2odW_input:focus-visible,._5q2odW_select:focus-visible{box-shadow:0 0 0 1.5px var(--dsw-alias-state-business-primary);outline:none}._5q2odW_backfill{color:var(--dsw-alias-label-secondary);flex-wrap:wrap;align-items:center;gap:8px;font-size:12px;line-height:18px;display:flex}._5q2odW_meter{background:var(--dsw-alias-bg-skeleton);border-radius:2px;flex:0 160px;height:4px;overflow:hidden}._5q2odW_meterFill{background:var(--dsw-alias-state-business-primary);height:100%;transition:width var(--ds-transition-duration,.2s) var(--ds-ease-in-out,ease);display:block}._5q2odW_backfillText{font-variant-numeric:tabular-nums;flex-wrap:wrap;gap:0 8px;margin:0;display:flex}._5q2odW_failed{color:var(--dsw-alias-state-warn-label)}._5q2odW_picked{border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-interactive-bg-hover);flex-wrap:wrap;align-items:center;gap:8px;padding:6px 8px 6px 12px;font-size:12px;line-height:18px;display:flex}@media (prefers-reduced-motion:reduce){._5q2odW_meterFill{transition:none}}";
		const tag$2 = "@agent-stash/dsh-skill-scout/search.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$2)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$2;
			style.textContent = css$2;
			document.head.appendChild(style);
		}
		var search_module_css_default = {
			"backfill": "_5q2odW_backfill",
			"backfillText": "_5q2odW_backfillText",
			"controls": "_5q2odW_controls",
			"failed": "_5q2odW_failed",
			"input": "_5q2odW_input",
			"meter": "_5q2odW_meter",
			"meterFill": "_5q2odW_meterFill",
			"picked": "_5q2odW_picked",
			"search": "_5q2odW_search",
			"select": "_5q2odW_select"
		};
		//#endregion
		//#region src/client/search.tsx
		/**
		* 「历史回溯提炼」页的「搜索」分栏：在插件存的脱敏任务索引里搜索命令、错误行、文件路径、请求与插话。
		* 输入停顿后自动搜索，回车立即搜索；结果可勾选 1 到 12 个任务交给发现模型提炼。
		* 索引默认只含已分析的会话，「回溯 90 天」「回溯全部」在后台读入更早的会话，可暂停。
		*/
		/** 一次搜索最多显示的任务数。 */
		const LIMIT = 50;
		/** 输入停顿多久后搜索。 */
		const DEBOUNCE = 250;
		const OUTCOMES$1 = [
			"verified",
			"succeeded",
			"unverified",
			"disputed",
			"failed",
			"aborted"
		];
		/** 回溯更早的会话：两个范围的按钮，进行中显示真实进度与暂停、继续。 */
		function Backfill({ face, status, t }) {
			const { busy, error, run } = useAction(face.inbox, t);
			const backfill = status.backfill;
			const failed = backfill !== null && backfill.failed > 0 ? t("backfill.failed", { count: backfill.failed }) : null;
			const active = backfill !== null && backfill.state !== "done";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: search_module_css_default.backfill,
				children: [
					active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: search_module_css_default.meter,
						role: "progressbar",
						"aria-label": t("backfill.progress"),
						"aria-valuemin": 0,
						"aria-valuemax": backfill.total,
						"aria-valuenow": backfill.done,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: search_module_css_default.meterFill,
							style: { width: backfill.total === 0 ? "0%" : `${String(backfill.done / backfill.total * 100)}%` }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: search_module_css_default.backfillText,
						role: "status",
						children: [backfill === null ? null : backfill.state === "listing" ? t("backfill.listing") : backfill.state === "done" ? t(backfill.done === 1 ? "backfill.done.one" : "backfill.done.other", { done: backfill.done }) : t(backfill.state === "paused" ? "backfill.paused" : "backfill.running", {
							done: backfill.done,
							total: backfill.total
						}), failed !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: search_module_css_default.failed,
							children: failed
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: layout_module_css_default.spacer }),
					active ? backfill.state === "paused" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "outline",
						disabled: busy,
						onClick: () => void run({
							action: "backfill",
							range: backfill.range
						}),
						children: t("backfill.resume")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "outline",
						disabled: busy,
						onClick: () => void run({ action: "backfill-pause" }),
						children: t("backfill.pause")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "outline",
						disabled: busy,
						onClick: () => void run({
							action: "backfill",
							range: "90d"
						}),
						children: t("backfill.90d")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "outline",
						disabled: busy,
						onClick: () => void run({
							action: "backfill",
							range: "all"
						}),
						children: t("backfill.all")
					})] }),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: layout_module_css_default.error,
						role: "alert",
						children: error
					})
				]
			});
		}
		function SearchTab({ face, view, t }) {
			const { page, search } = face;
			const nav = useSnapshot(page);
			const now = useNow(6e4);
			const { busy, error, run } = useAction(face.inbox, t);
			const [settled, setSettled] = (0, react.useState)(nav.query);
			(0, react.useEffect)(() => {
				if (nav.query === settled) return void 0;
				const timer = setTimeout(() => setSettled(nav.query), DEBOUNCE);
				return () => clearTimeout(timer);
			}, [nav.query, settled]);
			const q = settled.trim();
			const result = useLoaded((0, react.useCallback)((_revision, signal) => q === "" ? Promise.resolve(null) : search({
				q,
				outcome: nav.outcome,
				limit: LIMIT
			}, signal), [
				search,
				q,
				nav.outcome
			]), String(view.status.analyzed.episodes));
			const found = result.status === "ready" ? result.value : null;
			const terms = termsOf(q);
			const indexed = found?.indexed ?? view.status.analyzed;
			/** 勾选或取消一个任务；按 store 里最新的勾选计算，连续点击不会丢。 */
			const toggle = (episodeId, checked) => {
				const { picked } = page.getSnapshot();
				page.update({ picked: checked ? [...picked, episodeId] : picked.filter((id) => id !== episodeId) });
			};
			const extract = async () => {
				const sent = await run({
					action: "extract-selected",
					episodeIds: [...nav.picked]
				});
				if (sent?.ok !== true) return;
				page.update({
					picked: [],
					tab: "suggestions",
					selected: sent.leadId ?? null
				});
			};
			const full = nav.picked.length >= 12;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: search_module_css_default.search,
				"data-view": "search",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: search_module_css_default.controls,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "search",
							className: search_module_css_default.input,
							"aria-label": t("search.label"),
							placeholder: t("search.placeholder"),
							value: nav.query,
							onChange: (event) => page.update({ query: event.target.value }),
							onKeyDown: (event) => {
								if (event.key === "Enter") setSettled(nav.query);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: search_module_css_default.select,
							"aria-label": t("search.outcome"),
							value: nav.outcome ?? "",
							onChange: (event) => page.update({ outcome: OUTCOMES$1.find((outcome) => outcome === event.target.value) ?? null }),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("search.outcome.all")
							}), OUTCOMES$1.map((outcome) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: outcome,
								children: t(`outcome.${outcome}`)
							}, outcome))]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: layout_module_css_default.note,
						children: t("search.scope", {
							sessions: t(indexed.sessions === 1 ? "search.scope.sessions.one" : "search.scope.sessions.other", { count: indexed.sessions }),
							tasks: t(indexed.episodes === 1 ? "search.scope.tasks.one" : "search.scope.tasks.other", { count: indexed.episodes })
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Backfill, {
						face,
						status: view.status,
						t
					}),
					nav.picked.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: search_module_css_default.picked,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("search.picked", { count: nav.picked.length }) }),
							full && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: layout_module_css_default.note,
								children: t("search.limit", { count: 12 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: layout_module_css_default.spacer }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => page.update({ picked: [] }),
								children: t("search.clear")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "primary",
								disabled: busy || view.status.models.summary === null,
								onClick: () => void extract(),
								children: t("search.extract")
							})
						]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: layout_module_css_default.error,
						role: "alert",
						children: error
					}),
					result.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: layout_module_css_default.error,
						role: "alert",
						children: t("search.error", { error: result.error })
					}),
					found !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: layout_module_css_default.group,
						"aria-label": t("search.label"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: layout_module_css_default.note,
							role: "status",
							children: found.hits.length === 0 ? t("search.empty") : found.total > found.hits.length ? t("search.totalShown", {
								total: found.total,
								count: found.hits.length
							}) : t(found.total === 1 ? "search.total.one" : "search.total.other", { total: found.total })
						}), found.hits.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: layout_module_css_default.tasks,
							children: found.hits.map((task) => {
								const checked = nav.picked.includes(task.episodeId);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskRow, {
									task,
									now,
									t,
									terms,
									pick: {
										checked,
										disabled: !checked && full,
										onChange: (next) => toggle(task.episodeId, next)
									},
									openSession: face.openSession
								}, task.episodeId);
							})
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/stats.module.css.mjs
		const css$1 = ".rbjRhq_grid{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);grid-template-columns:repeat(auto-fill,minmax(320px,1fr));align-content:start;gap:12px;min-height:0;padding-bottom:16px;display:grid;overflow-y:auto}.rbjRhq_card{border-radius:var(--dsw-radius-lg);min-width:0;box-shadow:0 0 0 .5px var(--dsw-alias-border-l2);flex-direction:column;gap:10px;padding:14px 16px;font-size:12px;line-height:18px;display:flex}.rbjRhq_card[data-wide]{grid-column:1/-1}.rbjRhq_title{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:500;line-height:20px}.rbjRhq_subtitle{color:var(--dsw-alias-label-secondary);margin:4px 0 0;font-size:12px;font-weight:500;line-height:18px}.rbjRhq_figures{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0;display:grid}.rbjRhq_figure dt{color:var(--dsw-alias-label-tertiary)}.rbjRhq_figure dd{font-variant-numeric:tabular-nums;margin:0;font-size:18px;line-height:26px}.rbjRhq_bar{background:var(--dsw-alias-bg-skeleton);border-radius:4px;flex:auto;min-width:40px;height:8px;display:flex;overflow:hidden}.rbjRhq_segment{background:var(--dsw-alias-state-business-primary);height:100%}[data-segment=verified]{--scout-swatch:var(--dsw-alias-state-business-primary)}[data-segment=succeeded]{--scout-swatch:color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent)}[data-segment=unverified]{--scout-swatch:var(--dsw-alias-label-tertiary)}[data-segment=disputed]{--scout-swatch:var(--dsw-alias-state-warn-label)}[data-segment=failed]{--scout-swatch:var(--dsw-alias-state-error-primary,var(--dsw-alias-state-warn-label))}[data-segment=aborted]{--scout-swatch:var(--dsw-alias-border-l4)}[data-segment=inputTokens]{--scout-swatch:var(--dsw-alias-state-business-primary)}[data-segment=cacheReadTokens]{--scout-swatch:color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent)}[data-segment=cacheWriteTokens]{--scout-swatch:var(--dsw-alias-state-warn-label)}[data-segment=outputTokens]{--scout-swatch:var(--dsw-alias-label-secondary)}.rbjRhq_segment[data-segment]{background:var(--scout-swatch,var(--dsw-alias-state-business-primary))}.rbjRhq_legend{color:var(--dsw-alias-label-secondary);flex-wrap:wrap;gap:4px 12px;margin:0;padding:0;list-style:none;display:flex}.rbjRhq_legend li{align-items:center;gap:6px;display:inline-flex}.rbjRhq_swatch{background:var(--scout-swatch,var(--dsw-alias-state-business-primary));border-radius:2px;width:8px;height:8px}.rbjRhq_count{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}.rbjRhq_funnel,.rbjRhq_days{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.rbjRhq_step{grid-template-columns:96px minmax(0,1fr) 40px;align-items:center;gap:8px;display:grid}.rbjRhq_step .rbjRhq_count{text-align:right}.rbjRhq_stepLabel{color:var(--dsw-alias-label-secondary)}.rbjRhq_day{grid-template-columns:44px minmax(0,1fr);align-items:center;gap:2px 8px;display:grid}.rbjRhq_dayLabel{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}.rbjRhq_dayFigures,.rbjRhq_day .rbjRhq_rowMeta{grid-column:2}.rbjRhq_dayFigures{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}.rbjRhq_rows{flex-direction:column;gap:1px;margin:0;padding:0;list-style:none;display:flex}.rbjRhq_row,.rbjRhq_rowButton{border-radius:var(--dsw-radius-md);flex-wrap:wrap;align-items:center;gap:2px 8px;padding:6px 8px;display:flex}.rbjRhq_rowButton{width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0}@media (hover:hover){.rbjRhq_rowButton:hover{background:var(--dsw-alias-interactive-bg-hover)}}.rbjRhq_rowButton:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.rbjRhq_rowMain{flex-direction:column;flex:200px;min-width:0;display:flex}.rbjRhq_callTitle{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-size:13px;line-height:20px}.rbjRhq_rowNote{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.rbjRhq_rowButton[data-result=failed] .rbjRhq_rowNote{color:var(--dsw-alias-state-warn-label)}.rbjRhq_rowMeta{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}.rbjRhq_mono{min-width:0;font-family:var(--dsw-font-family-mono,ui-monospace, monospace);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;flex:200px;font-size:11px}";
		const tag$1 = "@agent-stash/dsh-skill-scout/stats.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$1)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$1;
			style.textContent = css$1;
			document.head.appendChild(style);
		}
		var stats_module_css_default = {
			"bar": "rbjRhq_bar",
			"callTitle": "rbjRhq_callTitle",
			"card": "rbjRhq_card",
			"count": "rbjRhq_count",
			"day": "rbjRhq_day",
			"dayFigures": "rbjRhq_dayFigures",
			"dayLabel": "rbjRhq_dayLabel",
			"days": "rbjRhq_days",
			"figure": "rbjRhq_figure",
			"figures": "rbjRhq_figures",
			"funnel": "rbjRhq_funnel",
			"grid": "rbjRhq_grid",
			"legend": "rbjRhq_legend",
			"mono": "rbjRhq_mono",
			"row": "rbjRhq_row",
			"rowButton": "rbjRhq_rowButton",
			"rowMain": "rbjRhq_rowMain",
			"rowMeta": "rbjRhq_rowMeta",
			"rowNote": "rbjRhq_rowNote",
			"rows": "rbjRhq_rows",
			"segment": "rbjRhq_segment",
			"step": "rbjRhq_step",
			"stepLabel": "rbjRhq_stepLabel",
			"subtitle": "rbjRhq_subtitle",
			"swatch": "rbjRhq_swatch",
			"title": "rbjRhq_title"
		};
		//#endregion
		//#region src/client/stats.tsx
		/**
		* 「历史回溯提炼」页的「统计」分栏：覆盖率与分析失败的会话、任务结果分布、线索与 idea 的漏斗、
		* 跨会话的高频动作与反复出现的错误（点开在「搜索」里查）、近 7 天的模型用量与最近的模型调用（点开对应卡片）。
		* 图表都是按比例宽度的横条，不依赖图表库。
		*/
		/** 占比，0 到 100。 */
		function percent(value, total) {
			return total <= 0 ? "0%" : `${String(Math.min(100, value / total * 100))}%`;
		}
		/** 一条按比例分段的横条；每段一个 data-segment 便于样式着色。 */
		function Bar({ segments, total }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: stats_module_css_default.bar,
				"aria-hidden": "true",
				children: segments.filter((segment) => segment.value > 0).map((segment) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: stats_module_css_default.segment,
					"data-segment": segment.key,
					style: { width: percent(segment.value, total) }
				}, segment.key))
			});
		}
		/** 统计里的一块卡片；`wide` 时占满整行。 */
		function Section({ title, wide = false, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: stats_module_css_default.card,
				"aria-label": title,
				"data-wide": wide || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: stats_module_css_default.title,
					children: title
				}), children]
			});
		}
		const OUTCOMES = [
			"verified",
			"succeeded",
			"unverified",
			"disputed",
			"failed",
			"aborted"
		];
		const FUNNEL = [
			"leads",
			"summarized",
			"skipped",
			"ideas",
			"drafted",
			"written",
			"dismissed"
		];
		const USAGE = [
			"inputTokens",
			"cacheReadTokens",
			"cacheWriteTokens",
			"outputTokens"
		];
		const USAGE_KEYS = {
			inputTokens: "usage.input",
			cacheReadTokens: "usage.cacheRead",
			cacheWriteTokens: "usage.cacheWrite",
			outputTokens: "usage.output"
		};
		/** 一次调用的结论：idea 数、理由或失败原因。 */
		function callResult(t, call) {
			const result = t(`call.${call.result}`);
			if (call.detail === null) return result;
			if (call.result === "proposed") return t(call.detail === "1" ? "call.ideas.one" : "call.ideas.other", { count: call.detail });
			return t("call.detail", {
				result,
				detail: call.detail
			});
		}
		function Coverage({ stats, face, t, now }) {
			const { coverage } = stats;
			const base = coverage.total ?? coverage.inRange ?? coverage.analyzed;
			const figures = [
				["stats.coverage.analyzed", coverage.analyzed],
				["stats.coverage.inRange", coverage.inRange],
				["stats.coverage.total", coverage.total],
				["stats.coverage.backfilled", coverage.backfilled]
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: t("stats.coverage"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
						className: stats_module_css_default.figures,
						children: figures.map(([key, value]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: stats_module_css_default.figure,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t(key) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: value === null ? t("stats.unknown") : value })]
						}, key))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bar, {
						segments: [{
							key: "analyzed",
							value: coverage.analyzed
						}],
						total: base
					}),
					coverage.failed.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
						className: stats_module_css_default.subtitle,
						children: t("stats.failed")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: stats_module_css_default.rows,
						children: coverage.failed.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: stats_module_css_default.row,
							"data-session": entry.sessionId,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: stats_module_css_default.rowMain,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: stats_module_css_default.mono,
										children: entry.sessionId
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: stats_module_css_default.rowNote,
										children: entry.message
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: stats_module_css_default.rowMeta,
									children: ago(t, entry.at, now)
								}),
								face.openSession !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => face.openSession?.(entry.sessionId),
									children: t("detail.openSession")
								})
							]
						}, entry.sessionId))
					})] })
				]
			});
		}
		function Outcomes({ stats, t }) {
			const total = OUTCOMES.reduce((sum, outcome) => sum + stats.outcomes[outcome], 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: t("stats.outcomes"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bar, {
					segments: OUTCOMES.map((outcome) => ({
						key: outcome,
						value: stats.outcomes[outcome]
					})),
					total
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: stats_module_css_default.legend,
					children: OUTCOMES.map((outcome) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						"data-segment": outcome,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.swatch,
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`outcome.${outcome}`) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.count,
								children: stats.outcomes[outcome]
							})
						]
					}, outcome))
				})]
			});
		}
		function Funnel({ stats, t }) {
			const top = Math.max(stats.funnel.leads, stats.funnel.ideas);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("stats.funnel"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: stats_module_css_default.funnel,
					children: FUNNEL.map((step) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: stats_module_css_default.step,
						"data-step": step,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.stepLabel,
								children: t(`funnel.${step}`)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bar, {
								segments: [{
									key: step,
									value: stats.funnel[step]
								}],
								total: top
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.count,
								children: stats.funnel[step]
							})
						]
					}, step))
				})
			});
		}
		/** 高频动作与反复出现的错误：点开后在「搜索」里查这段文字。 */
		function Patterns({ stats, face, t }) {
			const find = (text) => face.page.update({
				tab: "search",
				query: text
			});
			const list = (entries) => entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: layout_module_css_default.note,
				children: t("stats.empty")
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: stats_module_css_default.rows,
				children: entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: stats_module_css_default.rowButton,
					"aria-label": t("stats.searchFor", { text: entry.text }),
					onClick: () => find(entry.text),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
						className: stats_module_css_default.mono,
						children: entry.text
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: stats_module_css_default.rowMeta,
						children: counted(t, "meta.sessions", entry.sessions)
					})]
				}) }, entry.key))
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("stats.actions"),
				children: list(stats.actions.map((action) => ({
					key: action.key,
					text: action.label,
					sessions: action.sessions
				})))
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("stats.errors"),
				children: list(stats.errors.map((error) => ({
					key: error.signature,
					text: error.example,
					sessions: error.sessions
				})))
			})] });
		}
		function Usage({ stats, t }) {
			const totals = stats.usage.map((day) => USAGE.reduce((sum, key) => sum + day[key], 0));
			const top = Math.max(0, ...totals);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: t("stats.usage"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: stats_module_css_default.legend,
					children: USAGE.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						"data-segment": key,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: stats_module_css_default.swatch,
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(USAGE_KEYS[key]) })]
					}, key))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: stats_module_css_default.days,
					children: stats.usage.map((day, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: stats_module_css_default.day,
						"data-day": day.day,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.dayLabel,
								children: day.day.slice(5)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bar, {
								segments: USAGE.map((key) => ({
									key,
									value: day[key]
								})),
								total: top
							}),
							totals[index] === 0 && day.summaries + day.requested + day.failures === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.dayFigures,
								children: USAGE.map((key) => `${t(USAGE_KEYS[key])} ${compact(day[key])}`).join(" · ")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.rowMeta,
								children: t("usage.requests", {
									summaries: day.summaries,
									requested: day.requested,
									failures: day.failures
								})
							})] })
						]
					}, day.day))
				})]
			});
		}
		function Calls({ stats, face, t, now }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("stats.calls"),
				wide: true,
				children: stats.calls.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: layout_module_css_default.note,
					children: t("stats.empty")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: stats_module_css_default.rows,
					children: stats.calls.map((call) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: stats_module_css_default.rowButton,
						"data-result": call.result,
						onClick: () => face.page.update({
							tab: "suggestions",
							selected: call.itemId
						}),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: stats_module_css_default.rowMain,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.callTitle,
								children: call.title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: stats_module_css_default.rowNote,
								children: callResult(t, call)
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: stats_module_css_default.rowMeta,
							children: [
								t(`stage.${call.stage}`),
								call.model,
								duration(t, call.durationMs),
								t("call.tokens", {
									input: compact(call.inputTokens + call.cacheReadTokens + call.cacheWriteTokens),
									output: compact(call.outputTokens)
								}),
								ago(t, call.at, now)
							].join(" · ")
						})]
					}) }, `${String(call.at)}:${call.itemId}:${call.stage}`))
				})
			});
		}
		function StatsTab({ face, view, t }) {
			const { status } = view;
			const revision = [
				status.analyzed.sessions,
				status.analyzed.episodes,
				status.working,
				status.usage.summaries,
				status.usage.requested,
				status.backfill?.done ?? 0
			].join(":");
			const { loadStats } = face;
			const stats = useLoaded((0, react.useCallback)((_revision, signal) => loadStats(signal), [loadStats]), revision);
			const now = useNow(6e4);
			if (stats.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: layout_module_css_default.note,
				role: "status",
				children: t("panel.loading")
			});
			if (stats.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: layout_module_css_default.error,
				role: "alert",
				children: t("stats.error", { error: stats.error })
			});
			const value = stats.value;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: stats_module_css_default.grid,
				"data-view": "stats",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Coverage, {
						stats: value,
						face,
						t,
						now
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Outcomes, {
						stats: value,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Funnel, {
						stats: value,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Patterns, {
						stats: value,
						face,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Usage, {
						stats: value,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Calls, {
						stats: value,
						face,
						t,
						now
					})
				]
			});
		}
		//#endregion
		//#region src/client/page.tsx
		/**
		* 「历史回溯提炼」页：侧栏入口与主区域页面。页内三个分栏：建议（完整收件箱，左列表右详情）、搜索、统计。
		* 页面开着时，操作与请求结束的提示显示在页头下方。
		*/
		/** 侧栏入口的图标；宿主传入边长与是否选中。 */
		function PageIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutlineRegular, { size: size ?? 16 });
		}
		/** 「建议」分栏：分组的卡片与选中卡片的详情；没有选中时显示第一张等你决定的卡片。 */
		function Suggestions({ face, view, t }) {
			const { page, inbox } = face;
			const { selected } = useSnapshot(page);
			const now = useNow(6e4);
			const groups = groupItems(view.items);
			const current = resolveItem(view.items, selected) ?? groups.review[0] ?? groups.found[0] ?? view.items[0];
			const select = (id) => page.update({ selected: id });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: layout_module_css_default.root,
				"data-view": "suggestions",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
					inbox: view,
					t
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: layout_module_css_default.columns,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: layout_module_css_default.list,
						children: view.items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyInbox, {
							inbox: view,
							t
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupedCards, {
							items: view.items,
							now,
							t,
							selected: current?.id ?? null,
							onOpen: select,
							onDismiss: (id) => dismissItem(inbox, id)
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: layout_module_css_default.detail,
						children: current === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: layout_module_css_default.placeholder,
							children: t("detail.none")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemDetail, {
							face,
							view,
							item: current,
							t,
							onSelect: select
						})
					})]
				})]
			});
		}
		function HistoryPage(props) {
			const { inbox, page, t } = props;
			const state = useSnapshot(inbox);
			const nav = useSnapshot(page);
			const tabsId = (0, react.useId)();
			(0, react.useEffect)(() => inbox.hostNotices(), [inbox]);
			const tabs = [
				{
					value: "suggestions",
					label: t("page.tab.suggestions")
				},
				{
					value: "search",
					label: t("page.tab.search")
				},
				{
					value: "stats",
					label: t("page.tab.stats")
				}
			];
			const view = state.inbox;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: layout_module_css_default.page,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: layout_module_css_default.pageHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
							className: layout_module_css_default.pageTitle,
							children: t("page.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: tabsId,
							label: t("page.tabs"),
							value: nav.tab,
							options: tabs,
							onChange: (tab) => page.update({ tab })
						})]
					}),
					state.notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: layout_module_css_default.notice,
						role: "status",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NoticeBar, {
							notice: state.notice,
							face: props,
							t
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: layout_module_css_default.noticeClose,
							"aria-label": t("notice.close"),
							onClick: () => inbox.clearNotice(),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
						})]
					}),
					state.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: layout_module_css_default.error,
						role: "alert",
						children: t("panel.error")
					}),
					view === null ? state.status !== "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: layout_module_css_default.note,
						role: "status",
						children: t("panel.loading")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: layout_module_css_default.tabPanel,
						role: "tabpanel",
						"aria-labelledby": `${tabsId}-${nav.tab}`,
						children: [
							nav.tab === "suggestions" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Suggestions, {
								face: props,
								view,
								t
							}),
							nav.tab === "search" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchTab, {
								face: props,
								view,
								t
							}),
							nav.tab === "stats" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatsTab, {
								face: props,
								view,
								t
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/seen.ts
		/**
		* 看过的待决定卡片；存在 localStorage 里，跨窗口共享。
		* localStorage 是页面共享的外部存储：内容损坏时当作没有记录，写不进去（无痕模式、配额已满）时只记在内存里，
		* 两种情况都只影响角标计数。
		*/
		const SEEN_KEY = "agent-stash-skill-scout:seen";
		const SeenSchema = /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ parseJson(), /* @__PURE__ */ array(/* @__PURE__ */ string()));
		/** 以 localStorage 保存看过的卡片 id，只保留最近的一部分。 */
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
		//#endregion
		//#region src/client/session.tsx
		/**
		* 会话 Tab「经验提炼」：本会话的分析状态与「立即分析」「提炼本会话」，左栏是引用本会话的建议与本会话的任务，
		* 右栏就地显示选中建议的详情。会话的分析情况随收件箱的工作状态重新读取。
		*/
		/** 会话分析状态的一行文案。 */
		function stateText(t, view, now) {
			switch (view.state) {
				case "analyzed": {
					const count = view.tasks.length;
					const text = t(count === 1 ? "session.state.analyzed.one" : "session.state.analyzed.other", { count });
					return view.scannedAt === null ? text : `${text} · ${ago(t, view.scannedAt, now)}`;
				}
				case "failed": return t("session.state.failed", { error: view.error ?? "" });
				default: return t(`session.state.${view.state}`);
			}
		}
		function SessionTab(props) {
			const { inbox, sessionId, loadSession, t } = props;
			const state = useSnapshot(inbox);
			const [selected, setSelected] = (0, react.useState)(null);
			const { busy, error, run } = useAction(inbox, t);
			const now = useNow(6e4);
			const status = state.inbox?.status;
			const [acted, setActed] = (0, react.useState)(0);
			const revision = [
				status?.scanning,
				status?.waiting,
				status?.analyzed.sessions,
				status?.analyzed.episodes,
				acted
			].join(":");
			const session = useLoaded((0, react.useCallback)((_revision, signal) => loadSession(sessionId, signal), [loadSession, sessionId]), revision);
			const view = state.inbox;
			const items = citing(view?.items ?? [], sessionId);
			const current = resolveItem(items, selected) ?? items[0];
			const value = session.status === "ready" ? session.value : null;
			const closed = value === null || value.state === "subagent" || value.state === "missing";
			/** 分析或提炼本会话；提炼成功后选中 Host 返回的线索，它已有 idea 时落到第一个 idea。 */
			const send = async (action) => {
				const result = await run(action);
				setActed((count) => count + 1);
				if (result?.ok === true && result.leadId !== void 0) setSelected(result.leadId);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: layout_module_css_default.root,
				"data-view": "session",
				"data-conversation-composer-overlay": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: layout_module_css_default.bar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: layout_module_css_default.state,
								"data-state": value?.state,
								role: "status",
								children: session.status === "error" ? t("session.error", { error: session.error }) : value === null ? t("panel.loading") : stateText(t, value, now)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: layout_module_css_default.spacer }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "outline",
								disabled: closed || busy,
								onClick: () => void send({
									action: "analyze-session",
									sessionId
								}),
								children: t("session.analyze")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "primary",
								disabled: closed || value.tasks.length === 0 || status?.models.summary == null || busy,
								onClick: () => void send({
									action: "extract-session",
									sessionId
								}),
								children: t("session.extract")
							})
						]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: layout_module_css_default.error,
						role: "alert",
						children: error
					}),
					view !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
						inbox: view,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: layout_module_css_default.columns,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: layout_module_css_default.list,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: layout_module_css_default.group,
								"aria-label": t("session.items"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: layout_module_css_default.groupTitle,
									children: t("session.items")
								}), items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: layout_module_css_default.note,
									children: t("session.items.empty")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardList, {
									items,
									now,
									t,
									selected: current?.id ?? null,
									onOpen: setSelected,
									onDismiss: (id) => dismissItem(inbox, id)
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: layout_module_css_default.group,
								"aria-label": t("session.tasks"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: layout_module_css_default.groupTitle,
										children: t("session.tasks")
									}),
									value !== null && value.tasks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: layout_module_css_default.note,
										children: t("session.tasks.empty")
									}),
									value !== null && value.tasks.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: layout_module_css_default.tasks,
										children: value.tasks.map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskRow, {
											task,
											now,
											t,
											terms: [],
											pick: null,
											openSession: null
										}, task.episodeId))
									})
								]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: layout_module_css_default.detail,
							children: view !== null && current !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemDetail, {
								face: props,
								view,
								item: current,
								t,
								onSelect: setSelected
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: layout_module_css_default.placeholder,
								children: t("detail.none")
							})
						})]
					})
				]
			});
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
		* 写入被拒绝或传输失败时保留暂存值并提示。发现模型（写摘要）与生成模型（写 Skill 草稿）
		* 分别从 Host 的模型目录里选，留空时跟随 Agent 的默认模型。
		*/
		/** 与 Host `Config` 相同的默认值。 */
		const DEFAULT_SETTINGS = {
			discovery: true,
			summarize: false,
			summaryProvider: "",
			summaryModel: "",
			summaryEffort: "",
			summaryTimeout: 60,
			draftProvider: "",
			draftModel: "",
			draftEffort: "",
			draftTimeout: 180,
			dailySummaries: 6,
			summaryInterval: 10,
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
			summaryTimeout: {
				min: 10,
				max: 600,
				unit: "unit.seconds"
			},
			draftTimeout: {
				min: 10,
				max: 900,
				unit: "unit.seconds"
			},
			dailySummaries: {
				min: 1,
				max: 100,
				unit: "unit.requests"
			},
			summaryInterval: {
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
			summarize: /* @__PURE__ */ fallback(/* @__PURE__ */ boolean(), DEFAULT_SETTINGS.summarize),
			summaryProvider: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.summaryProvider),
			summaryModel: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.summaryModel),
			summaryEffort: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.summaryEffort),
			summaryTimeout: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.summaryTimeout),
			draftProvider: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.draftProvider),
			draftModel: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.draftModel),
			draftEffort: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.draftEffort),
			draftTimeout: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.draftTimeout),
			dailySummaries: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.dailySummaries),
			summaryInterval: /* @__PURE__ */ fallback(/* @__PURE__ */ number(), DEFAULT_SETTINGS.summaryInterval),
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
			"summarize",
			"summaryProvider",
			"summaryModel",
			"summaryEffort",
			"summaryTimeout",
			"draftProvider",
			"draftModel",
			"draftEffort",
			"draftTimeout",
			"dailySummaries",
			"summaryInterval",
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
			"summaryTimeout",
			"draftTimeout",
			"dailySummaries",
			"summaryInterval",
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
		/** 每个阶段的 provider、模型与推理强度对应的设置字段。 */
		const MODEL_KEYS = {
			summary: {
				provider: "summaryProvider",
				model: "summaryModel",
				effort: "summaryEffort"
			},
			draft: {
				provider: "draftProvider",
				model: "draftModel",
				effort: "draftEffort"
			}
		};
		function ModelFields({ stage, staged: values, catalog, disabled, onChange, t }) {
			const id = (0, react.useId)();
			const keys = MODEL_KEYS[stage];
			const staged = {
				provider: values[keys.provider],
				model: values[keys.model],
				effort: values[keys.effort]
			};
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
				label: t(stage === "summary" ? "settings.summaryModel" : "settings.draftModel"),
				hint: t(stage === "summary" ? "settings.summaryModelHint" : "settings.draftModelHint"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						id: `${id}-model`,
						className: settings_module_css_default.select,
						value: current,
						disabled,
						onChange: (event) => {
							const [provider = "", model = ""] = event.target.value.split(SEPARATOR);
							onChange({
								[keys.provider]: provider,
								[keys.model]: model,
								[keys.effort]: ""
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
					onChange: (event) => onChange({ [keys.effort]: event.target.value }),
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
										children: translate("settings.section.summary")
									}),
									toggle("summarize", "settings.summarize", "settings.summarizeHint"),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelFields, {
										stage: "summary",
										staged,
										catalog: models,
										disabled: !writable,
										onChange: update,
										t: translate
									}),
									number("summaryTimeout"),
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
										children: translate("settings.section.draft")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelFields, {
										stage: "draft",
										staged,
										catalog: models,
										disabled: !writable,
										onChange: update,
										t: translate
									}),
									number("draftTimeout")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: settings_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: settings_module_css_default.title,
										children: translate("settings.section.limits")
									}),
									number("dailySummaries"),
									number("summaryInterval"),
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
		//#region src/client/store.ts
		/** 模型正在写摘要或草稿时的读取间隔：回复一到，界面在一秒内换掉进行中的占位。 */
		const MODEL_INTERVAL = 1e3;
		/** 分析会话、回溯或核对写入时的读取间隔。 */
		const BUSY_INTERVAL = 3e3;
		/** 空闲时的读取间隔。 */
		const IDLE_INTERVAL = 45e3;
		/** 提示停留的时间。 */
		const NOTICE_TTL = 8e3;
		const INITIAL = {
			status: "idle",
			inbox: null,
			error: null,
			notice: null,
			viewing: [],
			paged: false
		};
		/**
		* 下一次读取的间隔：模型调用进行中最短；分析会话、回溯或写入后核对 DSH 能否发现时居中；其余时候最长。
		* @internal 导出供测试使用。
		*/
		function pollInterval(inbox) {
			if (inbox === null) return IDLE_INTERVAL;
			if (inbox.status.working > 0) return MODEL_INTERVAL;
			const backfill = inbox.status.backfill?.state;
			if (inbox.status.scanning || backfill === "listing" || backfill === "running" || inbox.items.some((item) => item.write?.checking === true)) return BUSY_INTERVAL;
			return IDLE_INTERVAL;
		}
		/** 请求结束后会提示的状态。 */
		const SETTLED = /* @__PURE__ */ new Set([
			"proposed",
			"skipped",
			"ready",
			"failed"
		]);
		/**
		* 上一份收件箱里在等模型、这一份里结束了的卡片。线索的摘要给出 idea 后，原来的线索卡片换成 idea 卡片，
		* 结果记在第一个 idea 上。正在详情里显示的卡片不算：用户就在看着它。
		* @internal 导出供测试使用。
		*/
		function finishedItems(before, after, viewing) {
			if (before === null) return [];
			const results = [];
			for (const previous of before.items) {
				if (!inFlight(previous) || viewing.includes(previous.id)) continue;
				const same = after.items.find((entry) => entry.id === previous.id);
				const ideas = same === void 0 && previous.ideaIndex === null ? after.items.filter((entry) => entry.leadId === previous.leadId && entry.ideaIndex !== null) : [];
				const next = same ?? ideas[0];
				if (next === void 0 || !SETTLED.has(next.state) || viewing.includes(next.id)) continue;
				results.push({
					item: next,
					ideas: ideas.length
				});
			}
			return results;
		}
		/** 请求结束的提示；同时结束几条时只说条数，「查看」打开第一条。 */
		function finishedNotice(results) {
			const [first] = results;
			if (first === void 0) return null;
			if (results.length > 1) return {
				key: "notice.done.many",
				params: { count: String(results.length) },
				undo: null,
				view: first.item.id
			};
			const { item, ideas } = first;
			const title = titleOf(item);
			let key;
			if (item.state === "proposed") key = ideas > 1 ? "notice.done.ideas" : "notice.done.proposed";
			else if (item.state === "skipped") key = "notice.done.skipped";
			else if (item.state === "ready") key = "notice.done.ready";
			else key = item.failure?.stage === "draft" ? "notice.done.draftFailed" : "notice.done.failed";
			return {
				key,
				params: {
					title,
					count: String(ideas)
				},
				undo: null,
				view: item.id
			};
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
			/** 每张卡片被几个详情显示着。 */
			const watching = /* @__PURE__ */ new Map();
			let hosts = 0;
			const set = (next) => {
				state = next;
				for (const listener of listeners) listener();
			};
			/** 安排下一次读取；`soon` 时最多等忙碌间隔，用于操作之后 Host 还在收尾的情形。 */
			const schedule = (soon = false) => {
				clearTimeout(timer);
				if (listeners.size === 0) return;
				const interval = pollInterval(state.inbox);
				timer = setTimeout(() => {
					if (document.visibilityState === "hidden") schedule();
					else refresh();
				}, soon ? Math.min(interval, BUSY_INTERVAL) : interval);
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
			/** 换上新的收件箱；有请求结束时发出提示。 */
			const receive = (inbox) => {
				const notice = finishedNotice(finishedItems(state.inbox, inbox, state.viewing));
				set({
					...state,
					status: "ready",
					inbox,
					error: null
				});
				if (notice !== null) showNotice(notice);
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
					if (current === generation) receive(inbox);
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
					receive(result.inbox);
					if (result.ok && notice !== void 0) showNotice(notice);
					schedule(true);
					return result;
				},
				clearNotice() {
					showNotice(null);
				},
				watch(id) {
					watching.set(id, (watching.get(id) ?? 0) + 1);
					set({
						...state,
						viewing: [...watching.keys()]
					});
					return () => {
						const count = (watching.get(id) ?? 1) - 1;
						if (count === 0) watching.delete(id);
						else watching.set(id, count);
						set({
							...state,
							viewing: [...watching.keys()]
						});
					};
				},
				hostNotices() {
					hosts += 1;
					set({
						...state,
						paged: true
					});
					return () => {
						hosts -= 1;
						set({
							...state,
							paged: hosts > 0
						});
					};
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
		//#region src/client/index.ts
		/**
		* 浏览器半部入口：注册文案、会话标题栏里的收件箱入口、会话 Tab「经验提炼」、侧栏入口与主区域的
		* 「历史回溯提炼」页，以及插件页里的配置页。收件箱与页面位置全局共用一份，各处订阅同一个 store。
		*/
		/** 宿主提醒入口的 order 是 20；本入口排在它后面。 */
		const HEADER_ORDER = 30;
		/** 会话 Tab 排在「上下文」「编队」之后。 */
		const VIEW_ORDER = 40;
		/** 侧栏入口排在「上下文洞察」之后。 */
		const PANEL_ORDER = 30;
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.session"
		];
		function apply(ctx) {
			ctx.effect(() => registerLocale(ctx.locale), "skill-scout: locale");
			const t = ctx.locale.bind(SCOUT_LOCALE);
			const inbox = createInboxStore({
				fetchInbox: () => fetchInbox(),
				postAction
			});
			ctx.effect(() => () => inbox.dispose(), "skill-scout: inbox");
			ctx.on("connection/reset", () => void inbox.refresh());
			const face = {
				inbox,
				page: createPageStore(),
				seen: createSeenStore(window.localStorage),
				loadDetail: fetchDetail,
				loadSession: fetchSession,
				search,
				loadStats: fetchStats,
				openSession: (sessionId) => ctx.get("uiWorkspace")?.openSession(sessionId),
				openPage: () => ctx.get("layout")?.selectPanel(VIEW_ID)
			};
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "skill-scout-inbox",
				order: HEADER_ORDER,
				locale: SCOUT_LOCALE,
				inject: () => face
			}, InboxEntry));
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: VIEW_ID,
				order: VIEW_ORDER,
				locale: SCOUT_LOCALE,
				label: () => t("view.label"),
				inject: (sessionId) => ({
					sessionId,
					...face
				})
			}, SessionTab));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: VIEW_ID,
				order: PANEL_ORDER,
				locale: SCOUT_LOCALE,
				label: () => t("page.title")
			}, PageIcon));
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: VIEW_ID,
				locale: SCOUT_LOCALE,
				inject: () => face
			}, HistoryPage));
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