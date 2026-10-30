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
		function number$2(message$1) {
			return _standardSchema({
				kind: "schema",
				type: "number",
				reference: number$2,
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
			startedAt: /* @__PURE__ */ number$2(),
			/** 进入当前阶段的时间。 */
			phaseAt: /* @__PURE__ */ number$2(),
			/** 已收到的正文字数。 */
			chars: /* @__PURE__ */ number$2(),
			/** 这类回复通常的字数，界面据此估算进度；不是上限。 */
			expected: /* @__PURE__ */ number$2()
		});
		/** 证据来自的一次任务。 */
		const SessionRefSchema = /* @__PURE__ */ object({
			sessionId: /* @__PURE__ */ string(),
			episodeId: /* @__PURE__ */ string(),
			at: /* @__PURE__ */ number$2(),
			goal: /* @__PURE__ */ string(),
			outcome: /* @__PURE__ */ string()
		});
		/** 收件箱里的一张卡片：一个 idea，或者还没有 idea 的一条线索。 */
		const ItemViewSchema = /* @__PURE__ */ object({
			/** idea 是 `<线索 id>~<下标>`，线索就是线索 id。 */
			id: /* @__PURE__ */ string(),
			leadId: /* @__PURE__ */ string(),
			/** idea 在摘要里的下标；卡片代表整条线索时为 null。 */
			ideaIndex: Nullable(/* @__PURE__ */ number$2()),
			/** 这条线索的摘要给出的 idea 数。 */
			ideaCount: /* @__PURE__ */ number$2(),
			/** 其他线索里同名、未结束的 idea 折叠进这张卡片的数量。 */
			merged: /* @__PURE__ */ number$2(),
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
			occurrences: /* @__PURE__ */ number$2(),
			sessions: /* @__PURE__ */ array(SessionRefSchema),
			score: /* @__PURE__ */ number$2(),
			detectedAt: /* @__PURE__ */ number$2(),
			updatedAt: /* @__PURE__ */ number$2(),
			decision: Nullable(DecisionSchema),
			/** 新建的 Skill 名称或要改进的 Skill。 */
			skill: Nullable(/* @__PURE__ */ string()),
			cautions: /* @__PURE__ */ array(/* @__PURE__ */ string()),
			failure: Nullable(/* @__PURE__ */ object({
				stage: StageViewSchema,
				kind: FailureKindViewSchema,
				message: /* @__PURE__ */ string(),
				at: /* @__PURE__ */ number$2(),
				attempts: /* @__PURE__ */ number$2()
			})),
			write: Nullable(/* @__PURE__ */ object({
				at: /* @__PURE__ */ number$2(),
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
				waiting: /* @__PURE__ */ number$2(),
				/** 正在进行的摘要与草稿请求数。 */
				working: /* @__PURE__ */ number$2(),
				usage: /* @__PURE__ */ object({
					/** 今天的后台摘要次数与上限。 */
					summaries: /* @__PURE__ */ number$2(),
					limit: /* @__PURE__ */ number$2(),
					/** 今天用户发起的摘要与草稿次数。 */
					requested: /* @__PURE__ */ number$2(),
					/** 未命中缓存的输入。 */
					inputTokens: /* @__PURE__ */ number$2(),
					cacheReadTokens: /* @__PURE__ */ number$2(),
					cacheWriteTokens: /* @__PURE__ */ number$2(),
					outputTokens: /* @__PURE__ */ number$2()
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
					total: /* @__PURE__ */ number$2(),
					done: /* @__PURE__ */ number$2(),
					failed: /* @__PURE__ */ number$2()
				})),
				lastError: Nullable(/* @__PURE__ */ object({
					kind: /* @__PURE__ */ string(),
					message: /* @__PURE__ */ string(),
					at: /* @__PURE__ */ number$2()
				})),
				analyzed: /* @__PURE__ */ object({
					sessions: /* @__PURE__ */ number$2(),
					episodes: /* @__PURE__ */ number$2()
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
			exit: Nullable(/* @__PURE__ */ number$2()),
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
			at: /* @__PURE__ */ number$2(),
			cwd: Nullable(/* @__PURE__ */ string()),
			goal: /* @__PURE__ */ string(),
			outcome: /* @__PURE__ */ string(),
			reads: /* @__PURE__ */ number$2(),
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
			at: /* @__PURE__ */ number$2(),
			inputTokens: /* @__PURE__ */ number$2(),
			outputTokens: /* @__PURE__ */ number$2()
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
			at: /* @__PURE__ */ number$2(),
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
			commands: /* @__PURE__ */ number$2(),
			edits: /* @__PURE__ */ number$2(),
			recoveries: /* @__PURE__ */ number$2(),
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
			scannedAt: Nullable(/* @__PURE__ */ number$2()),
			error: Nullable(/* @__PURE__ */ string()),
			tasks: /* @__PURE__ */ array(TaskViewSchema)
		});
		const SearchViewSchema = /* @__PURE__ */ object({
			query: /* @__PURE__ */ string(),
			/** 命中总数；`hits` 只含前 `limit` 条，按命中词数与时间排序。 */
			total: /* @__PURE__ */ number$2(),
			hits: /* @__PURE__ */ array(TaskViewSchema),
			/** 索引覆盖的范围。 */
			indexed: /* @__PURE__ */ object({
				sessions: /* @__PURE__ */ number$2(),
				episodes: /* @__PURE__ */ number$2()
			})
		});
		/** 一次模型调用的记录。 */
		const CallLogViewSchema = /* @__PURE__ */ object({
			at: /* @__PURE__ */ number$2(),
			stage: StageViewSchema,
			/** 线索或 idea 的 id，用来跳到那张卡片。 */
			itemId: /* @__PURE__ */ string(),
			title: /* @__PURE__ */ string(),
			provider: /* @__PURE__ */ string(),
			model: /* @__PURE__ */ string(),
			durationMs: /* @__PURE__ */ number$2(),
			inputTokens: /* @__PURE__ */ number$2(),
			cacheReadTokens: /* @__PURE__ */ number$2(),
			cacheWriteTokens: /* @__PURE__ */ number$2(),
			outputTokens: /* @__PURE__ */ number$2(),
			result: /* @__PURE__ */ picklist([
				"proposed",
				"skipped",
				"drafted",
				"failed"
			]),
			/** 不值得保存的理由、idea 数或失败原因。 */
			detail: Nullable(/* @__PURE__ */ string())
		});
		const Count = /* @__PURE__ */ number$2();
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
					at: /* @__PURE__ */ number$2()
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
			/**
			* 线索与 idea 各自按存储里的状态计数，两者单位不同，分开统计。正在摘要的线索计入 detected，
			* 正在生成草稿的 idea 计入它请求前的状态。
			*/
			funnel: /* @__PURE__ */ object({
				leads: /* @__PURE__ */ object({
					detected: Count,
					summarized: Count,
					skipped: Count,
					failed: Count,
					dismissed: Count
				}),
				ideas: /* @__PURE__ */ object({
					proposed: Count,
					ready: Count,
					failed: Count,
					written: Count,
					dismissed: Count
				})
			}),
			/** 跨会话出现最多的动作（日常动作与查看类命令除外）。 */
			actions: /* @__PURE__ */ array(/* @__PURE__ */ object({
				key: /* @__PURE__ */ string(),
				label: /* @__PURE__ */ string(),
				sessions: Count,
				/** 近 8 周每周用到这个动作的会话数，最早的在前。 */
				weeks: /* @__PURE__ */ array(Count)
			})),
			/** 在多个会话里出现的同一类错误。 */
			errors: /* @__PURE__ */ array(/* @__PURE__ */ object({
				signature: /* @__PURE__ */ string(),
				example: /* @__PURE__ */ string(),
				sessions: Count
			})),
			/**
			* 近 30 天每天结束的任务数（按结果分）与新出现的线索数，最早的在前；没有记录的日子也列出，各项为 0。
			* 只统计已分析的会话（含回溯读入的）。
			*/
			daily: /* @__PURE__ */ array(/* @__PURE__ */ object({
				day: /* @__PURE__ */ string(),
				verified: Count,
				succeeded: Count,
				unverified: Count,
				disputed: Count,
				failed: Count,
				aborted: Count,
				leads: Count
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
		/** 打开页面的「建议」分栏并选中一张卡片，页面把它滚到可见处并高亮一次。 */
		function showItem(face, id) {
			face.page.update({
				tab: "suggestions",
				selected: id,
				reveal: id
			});
			face.openPage();
		}
		//#endregion
		//#region src/client/format.ts
		const SECOND = 1e3;
		const MINUTE = 60 * SECOND;
		const HOUR = 60 * MINUTE;
		const DAY$1 = 24 * HOUR;
		/** 相对时间：刚刚、N 分钟前、N 小时前、N 天前。 */
		function ago(t, at, now) {
			const elapsed = Math.max(0, now - at);
			if (elapsed < MINUTE) return t("time.now");
			if (elapsed < HOUR) return t("time.minutes", { count: Math.floor(elapsed / MINUTE) });
			if (elapsed < DAY$1) return t("time.hours", { count: Math.floor(elapsed / HOUR) });
			return t("time.days", { count: Math.floor(elapsed / DAY$1) });
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
		const CLASS_STYLE = {
			decision: {
				dot: "warning",
				ink: "secondary",
				shimmer: false,
				title: "primary"
			},
			working: {
				dot: "ongoing",
				ink: "tertiary",
				shimmer: true,
				title: "primary"
			},
			failed: {
				dot: "error",
				ink: "error",
				shimmer: false,
				title: "primary"
			},
			done: {
				dot: "done",
				ink: "secondary",
				shimmer: false,
				title: "primary"
			},
			notStarted: {
				dot: "idle",
				ink: "tertiary",
				shimmer: false,
				title: "secondary"
			},
			closed: {
				dot: "idle",
				ink: "tertiary",
				shimmer: false,
				title: "tertiary"
			},
			unknown: {
				dot: "idle",
				ink: "tertiary",
				shimmer: false,
				title: "primary"
			}
		};
		/** 卡片：摘要或草稿等你同意、模型在写、失败、已保存、尚未摘要、不值得保存或已忽略。 */
		const ITEM_CLASS = {
			proposed: "decision",
			ready: "decision",
			summarizing: "working",
			drafting: "working",
			failed: "failed",
			written: "done",
			detected: "notStarted",
			skipped: "closed",
			dismissed: "closed"
		};
		/** 任务结果：检查通过与已完成算正面，用户表示不对算有争议，失败算负面，未验证与已取消不明。 */
		const OUTCOME_CLASS = {
			verified: "done",
			succeeded: "done",
			disputed: "decision",
			failed: "failed",
			unverified: "unknown",
			aborted: "unknown"
		};
		function itemStatus(t, item) {
			return {
				...CLASS_STYLE[ITEM_CLASS[item.state]],
				word: stateLabel(t, item)
			};
		}
		function taskStatus(t, outcome) {
			return {
				...CLASS_STYLE[OUTCOME_CLASS[outcome]],
				word: t(`outcome.${outcome}`)
			};
		}
		/** 命令序列的一行写法：前三步，以及其余步数。 */
		function sequenceOf(steps) {
			return {
				shown: steps.slice(0, 3),
				more: Math.max(0, steps.length - 3)
			};
		}
		/** 绝对时间，放在相对时间的 `title` 里。 */
		function absolute(at) {
			return new Date(at).toLocaleString();
		}
		/** 元信息的各项：来源、会话数、同名折叠数、时间；界面用「 · 」隔开。 */
		function metaItems(t, item, now) {
			return [
				t(`kind.${item.kind}`),
				counted(t, "meta.sessions", item.occurrences),
				...item.merged > 0 ? [t("meta.merged", { count: item.merged })] : [],
				ago(t, item.updatedAt, now)
			];
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
		/** 卡片的证据里有这个会话。 */
		function cites(item, sessionId) {
			return item.sessions.some((ref) => ref.sessionId === sessionId);
		}
		/** 证据里有这个会话的卡片。 */
		function citing(items, sessionId) {
			return items.filter((item) => cites(item, sessionId));
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/icon-button.module.css.mjs
		const css$23 = ".mHM1WG_button{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out), color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;border-radius:50%;flex:none;place-items:center;padding:0;display:inline-grid}.mHM1WG_button[data-size=\"24\"]{width:24px;height:24px}.mHM1WG_button:hover:not(:disabled),.mHM1WG_button[aria-pressed=true],.mHM1WG_button[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.mHM1WG_button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.mHM1WG_button:disabled,.mHM1WG_button[aria-disabled=true]{opacity:.4;cursor:default}@media (prefers-reduced-motion:reduce){.mHM1WG_button{transition:none}}";
		const tag$23 = "@agent-stash/dsh-skill-scout/icon-button.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$23)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$23;
			style.textContent = css$23;
			document.head.appendChild(style);
		}
		var icon_button_module_css_default = { "button": "mHM1WG_button" };
		//#endregion
		//#region src/client/ui/icon-button.tsx
		/**
		* 只有图标的按钮：24px 用在行尾与分页器，28px 用在 Tab 条尾部、详情底栏与视图头部。
		* 悬停或聚焦时用宿主 `Tooltip` 在下方显示名称，名称同时是 `aria-label`。
		* `unavailable` 给出读者能解决的原因时，按钮仍可聚焦，带 `aria-disabled` 与禁用外观，提示改为原因。
		*/
		function IconButton({ label, size = 28, onClick, pressed, disabled, unavailable, expanded, haspopup, buttonRef, children }) {
			const blocked = unavailable !== null && unavailable !== void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: blocked ? unavailable : label,
				side: "bottom",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					ref: buttonRef,
					type: "button",
					className: icon_button_module_css_default.button,
					"data-size": size,
					"aria-label": label,
					"aria-pressed": pressed,
					"aria-expanded": expanded,
					"aria-haspopup": haspopup,
					"aria-disabled": blocked || void 0,
					disabled,
					onClick: () => {
						if (!blocked) onClick();
					},
					children
				})
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/group-header.module.css.mjs
		const css$22 = "._9f5jYa_group+._9f5jYa_group{margin-top:16px}._9f5jYa_group[data-size=page]+._9f5jYa_group[data-size=page]{margin-top:32px}._9f5jYa_group[data-size=popover]+._9f5jYa_group[data-size=popover]{margin-top:0}._9f5jYa_head{align-items:center;gap:8px;height:36px;margin-bottom:8px;padding:0 8px;display:flex}._9f5jYa_head[data-sticky]{z-index:2;background:var(--scout-pane-bg);position:sticky;top:0}._9f5jYa_title{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-s-strong-14);color:var(--dsw-alias-label-primary);margin:0;overflow:hidden}._9f5jYa_count{font:var(--dsw-font-xs-13);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:1}._9f5jYa_head[data-size=popover]{border-top:.5px solid var(--dsw-alias-border-l1);height:auto;margin:4px 4px 1px;padding:4px 8px 3px}._9f5jYa_group[data-size=popover]:first-child ._9f5jYa_head{border-top:0;margin-top:0}._9f5jYa_head[data-size=popover] ._9f5jYa_title,._9f5jYa_head[data-size=popover] ._9f5jYa_count{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}._9f5jYa_head[data-size=popover] ._9f5jYa_count{flex:1}._9f5jYa_note{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);margin:0;padding:0 8px 8px}";
		const tag$22 = "@agent-stash/dsh-skill-scout/group-header.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$22)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$22;
			style.textContent = css$22;
			document.head.appendChild(style);
		}
		var group_header_module_css_default = {
			"count": "_9f5jYa_count",
			"group": "_9f5jYa_group",
			"head": "_9f5jYa_head",
			"note": "_9f5jYa_note",
			"title": "_9f5jYa_title"
		};
		//#endregion
		//#region src/client/ui/group-header.tsx
		/**
		* 列表分组的标题行（design 3.1）：36px 高，标题、数量，可选的尾部箭头按钮收起或展开这一组。
		* 窗格里可以粘在滚动区顶部；浮层里是宿主 JobListAction 的 `.sectionHeader` 小标签，上方一条细线。
		*/
		function GroupHeader({ title, count, size, sticky = false, toggle }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: group_header_module_css_default.head,
				"data-size": size,
				"data-sticky": sticky || void 0,
				children: [
					size === "popover" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: group_header_module_css_default.title,
						children: title
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: group_header_module_css_default.title,
						children: title
					}),
					count !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: group_header_module_css_default.count,
						children: count
					}),
					toggle !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						size: 24,
						label: toggle.label,
						expanded: toggle.expanded,
						onClick: toggle.onToggle,
						children: toggle.expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 })
					})
				]
			});
		}
		/** 一组：标题行与行列表；`aria-label` 是分组标题。 */
		function Group({ title, size, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				className: group_header_module_css_default.group,
				"data-size": size,
				"aria-label": title,
				children
			});
		}
		/** 组内没有行时的一行说明。 */
		function GroupNote({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: group_header_module_css_default.note,
				children
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/list-row.module.css.mjs
		const css$21 = ".sp6Txq_list{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.sp6Txq_row{--scout-row-title:var(--dsw-font-xs-strong-13);--scout-row-text:var(--dsw-font-xxs-12);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-primary);transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);grid-template-columns:16px minmax(0,1fr) auto;column-gap:8px;padding:8px;display:grid;position:relative}.sp6Txq_row[data-size=page]{--scout-row-title:var(--dsw-font-s-strong-14);--scout-row-text:var(--dsw-font-xs-13);column-gap:12px}.sp6Txq_row[data-variant=popover]{--scout-row-title:var(--dsw-font-xs-13);border-radius:10px;padding:10px 12px}.sp6Txq_row[data-openable]:hover,.sp6Txq_row[data-variant=select]:hover{background:var(--dsw-alias-interactive-bg-hover)}.sp6Txq_row[data-selected]{background:var(--dsw-alias-interactive-bg-active)}.sp6Txq_marker{height:1lh;font:var(--scout-row-title);justify-content:center;align-items:center;display:flex;overflow:hidden}.sp6Txq_content{flex-direction:column;gap:2px;min-width:0;display:flex}.sp6Txq_titleLine{min-width:0;font:var(--scout-row-title);color:var(--dsw-alias-label-primary);align-items:center;gap:6px;display:flex}.sp6Txq_titleLine[data-ink=secondary]{color:var(--dsw-alias-label-secondary)}.sp6Txq_titleLine[data-ink=tertiary]{color:var(--dsw-alias-label-tertiary)}.sp6Txq_row:hover .sp6Txq_titleLine[data-ink=tertiary],.sp6Txq_row[data-selected] .sp6Txq_titleLine[data-ink=tertiary]{color:var(--dsw-alias-label-secondary)}.sp6Txq_titleDot{flex:none;display:inline-flex}.sp6Txq_title{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.sp6Txq_open{color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;padding:0}.sp6Txq_open:after{content:\"\";border-radius:var(--dsw-radius-md);position:absolute;inset:0}.sp6Txq_row[data-variant=popover] .sp6Txq_open:after{border-radius:10px}.sp6Txq_open:focus-visible{outline:none}.sp6Txq_open:focus-visible:after{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.sp6Txq_summary{-webkit-line-clamp:2;font:var(--scout-row-text);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.sp6Txq_meta{white-space:nowrap;min-width:0;font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex-wrap:nowrap;display:flex;overflow:hidden}.sp6Txq_metaItem{flex:none}.sp6Txq_metaItem[data-fill]{flex:auto;min-width:0;display:flex}.sp6Txq_metaItem:last-child:not([data-fill]){text-overflow:ellipsis;flex-shrink:1;min-width:0;overflow:hidden}.sp6Txq_metaItem+.sp6Txq_metaItem:before{content:\" · \";white-space:pre;flex:none}.sp6Txq_metaItem[data-ink=secondary]{color:var(--dsw-alias-label-secondary)}.sp6Txq_metaItem[data-ink=error]{color:var(--dsw-alias-state-error-primary)}.sp6Txq_actions{z-index:1;opacity:0;transition:opacity var(--ds-transition-duration-fast) var(--ds-ease-in-out);align-self:start;align-items:center;gap:2px;display:flex;position:relative}.sp6Txq_row:hover .sp6Txq_actions,.sp6Txq_row:focus-within .sp6Txq_actions{opacity:1}@media (hover:none){.sp6Txq_actions{opacity:1}}.sp6Txq_row mark{background:var(--dsw-alias-state-warn-tertiary);color:inherit;border-radius:2px}.sp6Txq_row[data-highlight]{animation:2.4s ease-out sp6Txq_scout-row-highlight}@keyframes sp6Txq_scout-row-highlight{0%,55%{box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent)}to{box-shadow:0 0 #0000}}@media (prefers-reduced-motion:reduce){.sp6Txq_row,.sp6Txq_actions{transition:none}.sp6Txq_row[data-highlight]{box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);animation:none}}";
		const tag$21 = "@agent-stash/dsh-skill-scout/list-row.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$21)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$21;
			style.textContent = css$21;
			document.head.appendChild(style);
		}
		var list_row_module_css_default = {
			"actions": "sp6Txq_actions",
			"content": "sp6Txq_content",
			"list": "sp6Txq_list",
			"marker": "sp6Txq_marker",
			"meta": "sp6Txq_meta",
			"metaItem": "sp6Txq_metaItem",
			"open": "sp6Txq_open",
			"row": "sp6Txq_row",
			"scout-row-highlight": "sp6Txq_scout-row-highlight",
			"summary": "sp6Txq_summary",
			"title": "sp6Txq_title",
			"titleDot": "sp6Txq_titleDot",
			"titleLine": "sp6Txq_titleLine"
		};
		//#endregion
		//#region src/client/ui/list-row.tsx
		/**
		* 列表的一行（design 3.1）：16px 标记列（状态点或勾选框）、内容列（标题行、至多两行摘要或一行代码、
		* 以状态词开头的元信息行，行间 2px）、尾部动作列（悬停或焦点在行内时出现）。
		* 能打开的行把整行做成标题按钮的点击区，尾部动作浮在它上面，照宿主 ScheduleCatalogAction 的 `.openButton::after`。
		* - `item`：待决定的建议；`record`：建议引用的任务记录，带一行代码、没有摘要；
		* - `select`：可勾选的搜索结果，标题前是结果状态点；`popover`：收件箱浮层里的行。
		* 元信息只占一行：各项保持完整宽度，最后的 `metaFill`（工作目录）占满剩下的宽度，放不下时由它自己收窄。
		*/
		function ListRow({ variant, size, marker, title, titleInk = "primary", titleDot, summary, code, status, metadata, metaFill, actions, selected = false, highlight = false, onOpen, itemId, rowData }) {
			const ref = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (highlight) ref.current?.scrollIntoView({ block: "nearest" });
			}, [highlight]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				...rowData,
				ref,
				className: list_row_module_css_default.row,
				"data-variant": variant,
				"data-size": size,
				"data-selected": selected || void 0,
				"data-highlight": highlight || void 0,
				"data-openable": onOpen === void 0 ? void 0 : "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: list_row_module_css_default.marker,
						children: marker
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: list_row_module_css_default.content,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: list_row_module_css_default.titleLine,
								"data-ink": titleInk,
								children: [titleDot !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: list_row_module_css_default.titleDot,
									children: titleDot
								}), onOpen === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: list_row_module_css_default.title,
									children: title
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${list_row_module_css_default.title} ${list_row_module_css_default.open}`,
									"data-item": itemId,
									"aria-current": selected || void 0,
									onClick: onOpen,
									children: title
								})]
							}),
							summary !== void 0 && summary !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: list_row_module_css_default.summary,
								children: summary
							}),
							code,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: list_row_module_css_default.meta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: list_row_module_css_default.metaItem,
										"data-ink": status.ink,
										"data-status": "",
										children: status.shimmer ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TextShimmer, {
											active: true,
											children: status.word
										}) : status.word
									}),
									react.Children.map(metadata, (entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: list_row_module_css_default.metaItem,
										children: entry
									})),
									metaFill !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: list_row_module_css_default.metaItem,
										"data-fill": "",
										children: metaFill
									})
								]
							})
						]
					}),
					actions !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: list_row_module_css_default.actions,
						children: actions
					})
				]
			});
		}
		/** 一组行；行间 2px。 */
		function RowList({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: list_row_module_css_default.list,
				children
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/notice.module.css.mjs
		const css$20 = "._0OpNaW_limit,._0OpNaW_error,._0OpNaW_result{border-radius:var(--dsw-radius-md);font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);align-items:flex-start;gap:8px;margin:0;padding:10px 12px;display:flex}._0OpNaW_limit{background:var(--dsw-alias-state-warn-tertiary)}._0OpNaW_limit>svg{color:var(--dsw-alias-state-warn-primary);flex:none;margin-top:2px}._0OpNaW_error{color:var(--dsw-alias-state-error-primary);align-items:center;padding:6px 0}._0OpNaW_result{align-items:center;padding:4px 4px 4px 12px}._0OpNaW_result[data-framed]{background:var(--dsw-alias-interactive-bg-hover)}._0OpNaW_text{overflow-wrap:anywhere;flex:1;min-width:0;margin:0}._0OpNaW_link{border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-state-business-primary);cursor:pointer;background:0 0;border:0;flex:none;padding:0 4px}._0OpNaW_link:hover{text-decoration:underline}._0OpNaW_link:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}";
		const tag$20 = "@agent-stash/dsh-skill-scout/notice.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$20)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$20;
			style.textContent = css$20;
			document.head.appendChild(style);
		}
		var notice_module_css_default = {
			"error": "_0OpNaW_error",
			"limit": "_0OpNaW_limit",
			"link": "_0OpNaW_link",
			"result": "_0OpNaW_result",
			"text": "_0OpNaW_text"
		};
		//#endregion
		//#region src/client/ui/notice.tsx
		/**
		* 提示带（design 4.9）：
		* - `limit`：限制当前区域的条件（缺少设置、由另一个窗口分析），照宿主 DiscoverSection 的 `.notice`，警示底色与图标，至多一个链接；
		* - `error`：读取失败，错误色文字与一个 `outline` 的重试按钮，保留已有内容；
		* - `result`：操作的结果，一行文字与查看、撤销链接、关闭按钮，出现在操作发生的地方。
		*/
		function LimitNotice({ text, link }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: notice_module_css_default.limit,
				"data-notice": "limit",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 14 }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: notice_module_css_default.text,
						children: text
					}),
					link !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: notice_module_css_default.link,
						onClick: link.onClick,
						children: link.label
					})
				]
			});
		}
		function ErrorNotice({ text, retry }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: notice_module_css_default.error,
				role: "alert",
				"data-notice": "error",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: notice_module_css_default.text,
					children: text
				}), retry !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					size: "sm",
					onClick: retry.onClick,
					children: retry.label
				})]
			});
		}
		function ResultNotice({ text, links, close, framed = true }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: notice_module_css_default.result,
				"data-framed": framed || void 0,
				role: "status",
				"data-notice": "result",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: notice_module_css_default.text,
						children: text
					}),
					links.map((link) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: notice_module_css_default.link,
						onClick: link.onClick,
						children: link.label
					}, link.label)),
					close !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						size: 24,
						label: close.label,
						onClick: close.onClick,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
					})
				]
			});
		}
		//#endregion
		//#region src/client/cards.tsx
		/**
		* 建议的列表：收件箱浮层、「历史回溯提炼」页与会话视图共用。每行一个 idea，还没有 idea 的线索一行；
		* 按待你决定、本地发现、历史分组，历史默认收起。行的标记列是状态点，元信息行以状态词开头。
		*/
		/** 一条建议：状态点、标题、摘要、以状态词开头的元信息，悬停时行尾出现忽略按钮。 */
		function ItemRow({ item, now, t, size, selected, highlight, onOpen, onDismiss }) {
			const title = titleOf(item);
			const status = itemStatus(t, item);
			const [source, ...rest] = metaItems(t, item, now);
			const time = rest.pop() ?? "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListRow, {
				variant: size === "popover" ? "popover" : "item",
				size: size === "page" ? "page" : "pane",
				marker: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.dot }),
				title,
				titleInk: status.title,
				summary: item.description !== null && item.state !== "written" ? item.description : void 0,
				status,
				metadata: [
					source,
					...rest,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
						dateTime: new Date(item.updatedAt).toISOString(),
						title: absolute(item.updatedAt),
						children: time
					}, "time")
				],
				selected,
				highlight,
				itemId: item.id,
				onOpen: () => onOpen(item.id),
				rowData: {
					"data-state": item.state,
					"data-stage": item.failure?.stage
				},
				actions: onDismiss === void 0 ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
					size: 24,
					label: `${t("action.dismiss")}: ${title}`,
					onClick: () => onDismiss(item.id),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
				})
			});
		}
		/** 限制当前区域的条件：没有可用模型、分析关闭、由另一个窗口分析。 */
		function Banner({ inbox, t }) {
			const { status } = inbox;
			const pending = inbox.items.some((item) => item.state === "detected" || item.state === "failed");
			let key = null;
			if (!status.discovery) key = "banner.discoveryOff";
			else if (status.models.summary === null && pending) key = "banner.noModel";
			else if (!status.lead) key = "banner.secondary";
			if (key === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LimitNotice, { text: t(key) });
		}
		/** 从行上忽略一条，提示里带撤销。 */
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
		/** 可以从行上直接忽略：不在等模型，也还没有结论。 */
		function dismissable(item) {
			return !inFlight(item) && item.state !== "written" && item.state !== "skipped" && item.state !== "dismissed";
		}
		/** 一组行，不分组。 */
		function ItemList({ items, now, t, size, selected, highlight = null, onOpen, onDismiss }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowList, { children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemRow, {
				item,
				now,
				t,
				size,
				selected: item.id === selected,
				highlight: item.id === highlight,
				onOpen,
				onDismiss: dismissable(item) ? onDismiss : void 0
			}, item.id)) });
		}
		/** 按状态分组的行；历史默认收起，选中的行在历史里时展开，用户点过之后按用户的选择。 */
		function GroupedItems(props) {
			const { items, selected, t, size, sticky = false } = props;
			const groups = groupItems(items);
			/** 用户展开或收起过历史；为 null 时跟随选中的行。 */
			const [expanded, setExpanded] = (0, react.useState)(null);
			const history = expanded ?? groups.history.some((item) => item.id === selected);
			const group = (key, entries) => entries.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Group, {
				title: t(key),
				size,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupHeader, {
					title: t(key),
					count: entries.length,
					size,
					sticky
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemList, {
					...props,
					items: entries
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				group("section.review", groups.review),
				group("section.found", groups.found),
				groups.history.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Group, {
					title: t("section.history"),
					size,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupHeader, {
						title: t("section.history"),
						count: groups.history.length,
						size,
						sticky,
						toggle: {
							expanded: history,
							label: t(history ? "group.collapse" : "group.expand", { group: t("section.history") }),
							onToggle: () => setExpanded(!history)
						}
					}), history && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemList, {
						...props,
						items: groups.history
					})]
				})
			] });
		}
		/** 一条提示的查看与撤销链接。 */
		function noticeLinks(notice, face, t, onView) {
			const { inbox } = face;
			const view = notice.view;
			const undo = notice.undo;
			return [...view === null ? [] : [{
				label: t("notice.view"),
				onClick: () => {
					inbox.clearNotice();
					onView?.();
					showItem(face, view);
				}
			}], ...undo === null ? [] : [{
				label: t("notice.undo"),
				onClick: () => {
					inbox.clearNotice();
					inbox.act(undo);
				}
			}]];
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/ascending.js
		function ascending(a, b) {
			return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/descending.js
		function descending(a, b) {
			return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/bisector.js
		function bisector(f) {
			let compare1, compare2, delta;
			if (f.length !== 2) {
				compare1 = ascending;
				compare2 = (d, x) => ascending(f(d), x);
				delta = (d, x) => f(d) - x;
			} else {
				compare1 = f === ascending || f === descending ? f : zero$1;
				compare2 = f;
				delta = f;
			}
			function left(a, x, lo = 0, hi = a.length) {
				if (lo < hi) {
					if (compare1(x, x) !== 0) return hi;
					do {
						const mid = lo + hi >>> 1;
						if (compare2(a[mid], x) < 0) lo = mid + 1;
						else hi = mid;
					} while (lo < hi);
				}
				return lo;
			}
			function right(a, x, lo = 0, hi = a.length) {
				if (lo < hi) {
					if (compare1(x, x) !== 0) return hi;
					do {
						const mid = lo + hi >>> 1;
						if (compare2(a[mid], x) <= 0) lo = mid + 1;
						else hi = mid;
					} while (lo < hi);
				}
				return lo;
			}
			function center(a, x, lo = 0, hi = a.length) {
				const i = left(a, x, lo, hi - 1);
				return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
			}
			return {
				left,
				center,
				right
			};
		}
		function zero$1() {
			return 0;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/number.js
		function number$1(x) {
			return x === null ? NaN : +x;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/bisect.js
		const ascendingBisect = bisector(ascending);
		const bisectRight = ascendingBisect.right;
		ascendingBisect.left;
		bisector(number$1).center;
		//#endregion
		//#region ../../node_modules/.pnpm/internmap@2.0.3/node_modules/internmap/src/index.js
		var InternMap = class extends Map {
			constructor(entries, key = keyof) {
				super();
				Object.defineProperties(this, {
					_intern: { value: /* @__PURE__ */ new Map() },
					_key: { value: key }
				});
				if (entries != null) for (const [key, value] of entries) this.set(key, value);
			}
			get(key) {
				return super.get(intern_get(this, key));
			}
			has(key) {
				return super.has(intern_get(this, key));
			}
			set(key, value) {
				return super.set(intern_set(this, key), value);
			}
			delete(key) {
				return super.delete(intern_delete(this, key));
			}
		};
		function intern_get({ _intern, _key }, value) {
			const key = _key(value);
			return _intern.has(key) ? _intern.get(key) : value;
		}
		function intern_set({ _intern, _key }, value) {
			const key = _key(value);
			if (_intern.has(key)) return _intern.get(key);
			_intern.set(key, value);
			return value;
		}
		function intern_delete({ _intern, _key }, value) {
			const key = _key(value);
			if (_intern.has(key)) {
				value = _intern.get(key);
				_intern.delete(key);
			}
			return value;
		}
		function keyof(value) {
			return value !== null && typeof value === "object" ? value.valueOf() : value;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/ticks.js
		const e10 = Math.sqrt(50);
		const e5 = Math.sqrt(10);
		const e2 = Math.sqrt(2);
		function tickSpec(start, stop, count) {
			const step = (stop - start) / Math.max(0, count), power = Math.floor(Math.log10(step)), error = step / Math.pow(10, power), factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
			let i1, i2, inc;
			if (power < 0) {
				inc = Math.pow(10, -power) / factor;
				i1 = Math.round(start * inc);
				i2 = Math.round(stop * inc);
				if (i1 / inc < start) ++i1;
				if (i2 / inc > stop) --i2;
				inc = -inc;
			} else {
				inc = Math.pow(10, power) * factor;
				i1 = Math.round(start / inc);
				i2 = Math.round(stop / inc);
				if (i1 * inc < start) ++i1;
				if (i2 * inc > stop) --i2;
			}
			if (i2 < i1 && .5 <= count && count < 2) return tickSpec(start, stop, count * 2);
			return [
				i1,
				i2,
				inc
			];
		}
		function ticks(start, stop, count) {
			stop = +stop, start = +start, count = +count;
			if (!(count > 0)) return [];
			if (start === stop) return [start];
			const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
			if (!(i2 >= i1)) return [];
			const n = i2 - i1 + 1, ticks = new Array(n);
			if (reverse) {
				if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) / -inc;
				else for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) * inc;
			} else if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) / -inc;
			else for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) * inc;
			return ticks;
		}
		function tickIncrement(start, stop, count) {
			stop = +stop, start = +start, count = +count;
			return tickSpec(start, stop, count)[2];
		}
		function tickStep(start, stop, count) {
			stop = +stop, start = +start, count = +count;
			const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
			return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/range.js
		function range(start, stop, step) {
			start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
			var i = -1, n = Math.max(0, Math.ceil((stop - start) / step)) | 0, range = new Array(n);
			while (++i < n) range[i] = start + i * step;
			return range;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/init.js
		function initRange(domain, range) {
			switch (arguments.length) {
				case 0: break;
				case 1:
					this.range(domain);
					break;
				default: this.range(range).domain(domain);
			}
			return this;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/ordinal.js
		const implicit = Symbol("implicit");
		function ordinal() {
			var index = new InternMap(), domain = [], range = [], unknown = implicit;
			function scale(d) {
				let i = index.get(d);
				if (i === void 0) {
					if (unknown !== implicit) return unknown;
					index.set(d, i = domain.push(d) - 1);
				}
				return range[i % range.length];
			}
			scale.domain = function(_) {
				if (!arguments.length) return domain.slice();
				domain = [], index = new InternMap();
				for (const value of _) {
					if (index.has(value)) continue;
					index.set(value, domain.push(value) - 1);
				}
				return scale;
			};
			scale.range = function(_) {
				return arguments.length ? (range = Array.from(_), scale) : range.slice();
			};
			scale.unknown = function(_) {
				return arguments.length ? (unknown = _, scale) : unknown;
			};
			scale.copy = function() {
				return ordinal(domain, range).unknown(unknown);
			};
			initRange.apply(scale, arguments);
			return scale;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/band.js
		function band() {
			var scale = ordinal().unknown(void 0), domain = scale.domain, ordinalRange = scale.range, r0 = 0, r1 = 1, step, bandwidth, round = false, paddingInner = 0, paddingOuter = 0, align = .5;
			delete scale.unknown;
			function rescale() {
				var n = domain().length, reverse = r1 < r0, start = reverse ? r1 : r0, stop = reverse ? r0 : r1;
				step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
				if (round) step = Math.floor(step);
				start += (stop - start - step * (n - paddingInner)) * align;
				bandwidth = step * (1 - paddingInner);
				if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
				var values = range(n).map(function(i) {
					return start + step * i;
				});
				return ordinalRange(reverse ? values.reverse() : values);
			}
			scale.domain = function(_) {
				return arguments.length ? (domain(_), rescale()) : domain();
			};
			scale.range = function(_) {
				return arguments.length ? ([r0, r1] = _, r0 = +r0, r1 = +r1, rescale()) : [r0, r1];
			};
			scale.rangeRound = function(_) {
				return [r0, r1] = _, r0 = +r0, r1 = +r1, round = true, rescale();
			};
			scale.bandwidth = function() {
				return bandwidth;
			};
			scale.step = function() {
				return step;
			};
			scale.round = function(_) {
				return arguments.length ? (round = !!_, rescale()) : round;
			};
			scale.padding = function(_) {
				return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
			};
			scale.paddingInner = function(_) {
				return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
			};
			scale.paddingOuter = function(_) {
				return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
			};
			scale.align = function(_) {
				return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
			};
			scale.copy = function() {
				return band(domain(), [r0, r1]).round(round).paddingInner(paddingInner).paddingOuter(paddingOuter).align(align);
			};
			return initRange.apply(rescale(), arguments);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/define.js
		function define_default(constructor, factory, prototype) {
			constructor.prototype = factory.prototype = prototype;
			prototype.constructor = constructor;
		}
		function extend(parent, definition) {
			var prototype = Object.create(parent.prototype);
			for (var key in definition) prototype[key] = definition[key];
			return prototype;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/color.js
		function Color() {}
		var darker = .7;
		var brighter = 1 / darker;
		var reI = "\\s*([+-]?\\d+)\\s*";
		var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
		var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
		var reHex = /^#([0-9a-f]{3,8})$/;
		var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
		var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
		var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
		var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
		var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
		var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
		var named = {
			aliceblue: 15792383,
			antiquewhite: 16444375,
			aqua: 65535,
			aquamarine: 8388564,
			azure: 15794175,
			beige: 16119260,
			bisque: 16770244,
			black: 0,
			blanchedalmond: 16772045,
			blue: 255,
			blueviolet: 9055202,
			brown: 10824234,
			burlywood: 14596231,
			cadetblue: 6266528,
			chartreuse: 8388352,
			chocolate: 13789470,
			coral: 16744272,
			cornflowerblue: 6591981,
			cornsilk: 16775388,
			crimson: 14423100,
			cyan: 65535,
			darkblue: 139,
			darkcyan: 35723,
			darkgoldenrod: 12092939,
			darkgray: 11119017,
			darkgreen: 25600,
			darkgrey: 11119017,
			darkkhaki: 12433259,
			darkmagenta: 9109643,
			darkolivegreen: 5597999,
			darkorange: 16747520,
			darkorchid: 10040012,
			darkred: 9109504,
			darksalmon: 15308410,
			darkseagreen: 9419919,
			darkslateblue: 4734347,
			darkslategray: 3100495,
			darkslategrey: 3100495,
			darkturquoise: 52945,
			darkviolet: 9699539,
			deeppink: 16716947,
			deepskyblue: 49151,
			dimgray: 6908265,
			dimgrey: 6908265,
			dodgerblue: 2003199,
			firebrick: 11674146,
			floralwhite: 16775920,
			forestgreen: 2263842,
			fuchsia: 16711935,
			gainsboro: 14474460,
			ghostwhite: 16316671,
			gold: 16766720,
			goldenrod: 14329120,
			gray: 8421504,
			green: 32768,
			greenyellow: 11403055,
			grey: 8421504,
			honeydew: 15794160,
			hotpink: 16738740,
			indianred: 13458524,
			indigo: 4915330,
			ivory: 16777200,
			khaki: 15787660,
			lavender: 15132410,
			lavenderblush: 16773365,
			lawngreen: 8190976,
			lemonchiffon: 16775885,
			lightblue: 11393254,
			lightcoral: 15761536,
			lightcyan: 14745599,
			lightgoldenrodyellow: 16448210,
			lightgray: 13882323,
			lightgreen: 9498256,
			lightgrey: 13882323,
			lightpink: 16758465,
			lightsalmon: 16752762,
			lightseagreen: 2142890,
			lightskyblue: 8900346,
			lightslategray: 7833753,
			lightslategrey: 7833753,
			lightsteelblue: 11584734,
			lightyellow: 16777184,
			lime: 65280,
			limegreen: 3329330,
			linen: 16445670,
			magenta: 16711935,
			maroon: 8388608,
			mediumaquamarine: 6737322,
			mediumblue: 205,
			mediumorchid: 12211667,
			mediumpurple: 9662683,
			mediumseagreen: 3978097,
			mediumslateblue: 8087790,
			mediumspringgreen: 64154,
			mediumturquoise: 4772300,
			mediumvioletred: 13047173,
			midnightblue: 1644912,
			mintcream: 16121850,
			mistyrose: 16770273,
			moccasin: 16770229,
			navajowhite: 16768685,
			navy: 128,
			oldlace: 16643558,
			olive: 8421376,
			olivedrab: 7048739,
			orange: 16753920,
			orangered: 16729344,
			orchid: 14315734,
			palegoldenrod: 15657130,
			palegreen: 10025880,
			paleturquoise: 11529966,
			palevioletred: 14381203,
			papayawhip: 16773077,
			peachpuff: 16767673,
			peru: 13468991,
			pink: 16761035,
			plum: 14524637,
			powderblue: 11591910,
			purple: 8388736,
			rebeccapurple: 6697881,
			red: 16711680,
			rosybrown: 12357519,
			royalblue: 4286945,
			saddlebrown: 9127187,
			salmon: 16416882,
			sandybrown: 16032864,
			seagreen: 3050327,
			seashell: 16774638,
			sienna: 10506797,
			silver: 12632256,
			skyblue: 8900331,
			slateblue: 6970061,
			slategray: 7372944,
			slategrey: 7372944,
			snow: 16775930,
			springgreen: 65407,
			steelblue: 4620980,
			tan: 13808780,
			teal: 32896,
			thistle: 14204888,
			tomato: 16737095,
			turquoise: 4251856,
			violet: 15631086,
			wheat: 16113331,
			white: 16777215,
			whitesmoke: 16119285,
			yellow: 16776960,
			yellowgreen: 10145074
		};
		define_default(Color, color, {
			copy(channels) {
				return Object.assign(new this.constructor(), this, channels);
			},
			displayable() {
				return this.rgb().displayable();
			},
			hex: color_formatHex,
			formatHex: color_formatHex,
			formatHex8: color_formatHex8,
			formatHsl: color_formatHsl,
			formatRgb: color_formatRgb,
			toString: color_formatRgb
		});
		function color_formatHex() {
			return this.rgb().formatHex();
		}
		function color_formatHex8() {
			return this.rgb().formatHex8();
		}
		function color_formatHsl() {
			return hslConvert(this).formatHsl();
		}
		function color_formatRgb() {
			return this.rgb().formatRgb();
		}
		function color(format) {
			var m, l;
			format = (format + "").trim().toLowerCase();
			return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
		}
		function rgbn(n) {
			return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
		}
		function rgba(r, g, b, a) {
			if (a <= 0) r = g = b = NaN;
			return new Rgb(r, g, b, a);
		}
		function rgbConvert(o) {
			if (!(o instanceof Color)) o = color(o);
			if (!o) return new Rgb();
			o = o.rgb();
			return new Rgb(o.r, o.g, o.b, o.opacity);
		}
		function rgb(r, g, b, opacity) {
			return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
		}
		function Rgb(r, g, b, opacity) {
			this.r = +r;
			this.g = +g;
			this.b = +b;
			this.opacity = +opacity;
		}
		define_default(Rgb, rgb, extend(Color, {
			brighter(k) {
				k = k == null ? brighter : Math.pow(brighter, k);
				return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
			},
			darker(k) {
				k = k == null ? darker : Math.pow(darker, k);
				return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
			},
			rgb() {
				return this;
			},
			clamp() {
				return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
			},
			displayable() {
				return -.5 <= this.r && this.r < 255.5 && -.5 <= this.g && this.g < 255.5 && -.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
			},
			hex: rgb_formatHex,
			formatHex: rgb_formatHex,
			formatHex8: rgb_formatHex8,
			formatRgb: rgb_formatRgb,
			toString: rgb_formatRgb
		}));
		function rgb_formatHex() {
			return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
		}
		function rgb_formatHex8() {
			return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
		}
		function rgb_formatRgb() {
			const a = clampa(this.opacity);
			return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
		}
		function clampa(opacity) {
			return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
		}
		function clampi(value) {
			return Math.max(0, Math.min(255, Math.round(value) || 0));
		}
		function hex(value) {
			value = clampi(value);
			return (value < 16 ? "0" : "") + value.toString(16);
		}
		function hsla(h, s, l, a) {
			if (a <= 0) h = s = l = NaN;
			else if (l <= 0 || l >= 1) h = s = NaN;
			else if (s <= 0) h = NaN;
			return new Hsl(h, s, l, a);
		}
		function hslConvert(o) {
			if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
			if (!(o instanceof Color)) o = color(o);
			if (!o) return new Hsl();
			if (o instanceof Hsl) return o;
			o = o.rgb();
			var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h = NaN, s = max - min, l = (max + min) / 2;
			if (s) {
				if (r === max) h = (g - b) / s + (g < b) * 6;
				else if (g === max) h = (b - r) / s + 2;
				else h = (r - g) / s + 4;
				s /= l < .5 ? max + min : 2 - max - min;
				h *= 60;
			} else s = l > 0 && l < 1 ? 0 : h;
			return new Hsl(h, s, l, o.opacity);
		}
		function hsl(h, s, l, opacity) {
			return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
		}
		function Hsl(h, s, l, opacity) {
			this.h = +h;
			this.s = +s;
			this.l = +l;
			this.opacity = +opacity;
		}
		define_default(Hsl, hsl, extend(Color, {
			brighter(k) {
				k = k == null ? brighter : Math.pow(brighter, k);
				return new Hsl(this.h, this.s, this.l * k, this.opacity);
			},
			darker(k) {
				k = k == null ? darker : Math.pow(darker, k);
				return new Hsl(this.h, this.s, this.l * k, this.opacity);
			},
			rgb() {
				var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < .5 ? l : 1 - l) * s, m1 = 2 * l - m2;
				return new Rgb(hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2), hsl2rgb(h, m1, m2), hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2), this.opacity);
			},
			clamp() {
				return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
			},
			displayable() {
				return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
			},
			formatHsl() {
				const a = clampa(this.opacity);
				return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
			}
		}));
		function clamph(value) {
			value = (value || 0) % 360;
			return value < 0 ? value + 360 : value;
		}
		function clampt(value) {
			return Math.max(0, Math.min(1, value || 0));
		}
		function hsl2rgb(h, m1, m2) {
			return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/constant.js
		var constant_default$1 = (x) => () => x;
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/color.js
		function linear$1(a, d) {
			return function(t) {
				return a + t * d;
			};
		}
		function exponential(a, b, y) {
			return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
				return Math.pow(a + t * b, y);
			};
		}
		function gamma(y) {
			return (y = +y) === 1 ? nogamma : function(a, b) {
				return b - a ? exponential(a, b, y) : constant_default$1(isNaN(a) ? b : a);
			};
		}
		function nogamma(a, b) {
			var d = b - a;
			return d ? linear$1(a, d) : constant_default$1(isNaN(a) ? b : a);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/rgb.js
		var rgb_default = (function rgbGamma(y) {
			var color = gamma(y);
			function rgb$1(start, end) {
				var r = color((start = rgb(start)).r, (end = rgb(end)).r), g = color(start.g, end.g), b = color(start.b, end.b), opacity = nogamma(start.opacity, end.opacity);
				return function(t) {
					start.r = r(t);
					start.g = g(t);
					start.b = b(t);
					start.opacity = opacity(t);
					return start + "";
				};
			}
			rgb$1.gamma = rgbGamma;
			return rgb$1;
		})(1);
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/numberArray.js
		function numberArray_default(a, b) {
			if (!b) b = [];
			var n = a ? Math.min(b.length, a.length) : 0, c = b.slice(), i;
			return function(t) {
				for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
				return c;
			};
		}
		function isNumberArray(x) {
			return ArrayBuffer.isView(x) && !(x instanceof DataView);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/array.js
		function genericArray(a, b) {
			var nb = b ? b.length : 0, na = a ? Math.min(nb, a.length) : 0, x = new Array(na), c = new Array(nb), i = 0;
			for (; i < na; ++i) x[i] = value_default(a[i], b[i]);
			for (; i < nb; ++i) c[i] = b[i];
			return function(t) {
				for (i = 0; i < na; ++i) c[i] = x[i](t);
				return c;
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/date.js
		function date_default(a, b) {
			var d = /* @__PURE__ */ new Date();
			return a = +a, b = +b, function(t) {
				return d.setTime(a * (1 - t) + b * t), d;
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/number.js
		function number_default(a, b) {
			return a = +a, b = +b, function(t) {
				return a * (1 - t) + b * t;
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/object.js
		function object_default(a, b) {
			var i = {}, c = {}, k;
			if (a === null || typeof a !== "object") a = {};
			if (b === null || typeof b !== "object") b = {};
			for (k in b) if (k in a) i[k] = value_default(a[k], b[k]);
			else c[k] = b[k];
			return function(t) {
				for (k in i) c[k] = i[k](t);
				return c;
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/string.js
		var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
		var reB = new RegExp(reA.source, "g");
		function zero(b) {
			return function() {
				return b;
			};
		}
		function one(b) {
			return function(t) {
				return b(t) + "";
			};
		}
		function string_default(a, b) {
			var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
			a = a + "", b = b + "";
			while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
				if ((bs = bm.index) > bi) {
					bs = b.slice(bi, bs);
					if (s[i]) s[i] += bs;
					else s[++i] = bs;
				}
				if ((am = am[0]) === (bm = bm[0])) {
					if (s[i]) s[i] += bm;
					else s[++i] = bm;
				} else {
					s[++i] = null;
					q.push({
						i,
						x: number_default(am, bm)
					});
				}
				bi = reB.lastIndex;
			}
			if (bi < b.length) {
				bs = b.slice(bi);
				if (s[i]) s[i] += bs;
				else s[++i] = bs;
			}
			return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
				for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
				return s.join("");
			});
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/value.js
		function value_default(a, b) {
			var t = typeof b, c;
			return b == null || t === "boolean" ? constant_default$1(b) : (t === "number" ? number_default : t === "string" ? (c = color(b)) ? (b = c, rgb_default) : string_default : b instanceof color ? rgb_default : b instanceof Date ? date_default : isNumberArray(b) ? numberArray_default : Array.isArray(b) ? genericArray : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object_default : number_default)(a, b);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/round.js
		function round_default(a, b) {
			return a = +a, b = +b, function(t) {
				return Math.round(a * (1 - t) + b * t);
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/constant.js
		function constants(x) {
			return function() {
				return x;
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/number.js
		function number(x) {
			return +x;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/continuous.js
		var unit = [0, 1];
		function identity(x) {
			return x;
		}
		function normalize(a, b) {
			return (b -= a = +a) ? function(x) {
				return (x - a) / b;
			} : constants(isNaN(b) ? NaN : .5);
		}
		function clamper(a, b) {
			var t;
			if (a > b) t = a, a = b, b = t;
			return function(x) {
				return Math.max(a, Math.min(b, x));
			};
		}
		function bimap(domain, range, interpolate) {
			var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
			if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
			else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
			return function(x) {
				return r0(d0(x));
			};
		}
		function polymap(domain, range, interpolate) {
			var j = Math.min(domain.length, range.length) - 1, d = new Array(j), r = new Array(j), i = -1;
			if (domain[j] < domain[0]) {
				domain = domain.slice().reverse();
				range = range.slice().reverse();
			}
			while (++i < j) {
				d[i] = normalize(domain[i], domain[i + 1]);
				r[i] = interpolate(range[i], range[i + 1]);
			}
			return function(x) {
				var i = bisectRight(domain, x, 1, j) - 1;
				return r[i](d[i](x));
			};
		}
		function copy(source, target) {
			return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp()).unknown(source.unknown());
		}
		function transformer() {
			var domain = unit, range = unit, interpolate = value_default, transform, untransform, unknown, clamp = identity, piecewise, output, input;
			function rescale() {
				var n = Math.min(domain.length, range.length);
				if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
				piecewise = n > 2 ? polymap : bimap;
				output = input = null;
				return scale;
			}
			function scale(x) {
				return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate)))(transform(clamp(x)));
			}
			scale.invert = function(y) {
				return clamp(untransform((input || (input = piecewise(range, domain.map(transform), number_default)))(y)));
			};
			scale.domain = function(_) {
				return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
			};
			scale.range = function(_) {
				return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
			};
			scale.rangeRound = function(_) {
				return range = Array.from(_), interpolate = round_default, rescale();
			};
			scale.clamp = function(_) {
				return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
			};
			scale.interpolate = function(_) {
				return arguments.length ? (interpolate = _, rescale()) : interpolate;
			};
			scale.unknown = function(_) {
				return arguments.length ? (unknown = _, scale) : unknown;
			};
			return function(t, u) {
				transform = t, untransform = u;
				return rescale();
			};
		}
		function continuous() {
			return transformer()(identity, identity);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatDecimal.js
		function formatDecimal_default(x) {
			return Math.abs(x = Math.round(x)) >= 1e21 ? x.toLocaleString("en").replace(/,/g, "") : x.toString(10);
		}
		function formatDecimalParts(x, p) {
			if (!isFinite(x) || x === 0) return null;
			var i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e"), coefficient = x.slice(0, i);
			return [coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient, +x.slice(i + 1)];
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/exponent.js
		function exponent_default(x) {
			return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatGroup.js
		function formatGroup_default(grouping, thousands) {
			return function(value, width) {
				var i = value.length, t = [], j = 0, g = grouping[0], length = 0;
				while (i > 0 && g > 0) {
					if (length + g + 1 > width) g = Math.max(1, width - length);
					t.push(value.substring(i -= g, i + g));
					if ((length += g + 1) > width) break;
					g = grouping[j = (j + 1) % grouping.length];
				}
				return t.reverse().join(thousands);
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatNumerals.js
		function formatNumerals_default(numerals) {
			return function(value) {
				return value.replace(/[0-9]/g, function(i) {
					return numerals[+i];
				});
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatSpecifier.js
		var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
		function formatSpecifier(specifier) {
			if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
			var match;
			return new FormatSpecifier({
				fill: match[1],
				align: match[2],
				sign: match[3],
				symbol: match[4],
				zero: match[5],
				width: match[6],
				comma: match[7],
				precision: match[8] && match[8].slice(1),
				trim: match[9],
				type: match[10]
			});
		}
		formatSpecifier.prototype = FormatSpecifier.prototype;
		function FormatSpecifier(specifier) {
			this.fill = specifier.fill === void 0 ? " " : specifier.fill + "";
			this.align = specifier.align === void 0 ? ">" : specifier.align + "";
			this.sign = specifier.sign === void 0 ? "-" : specifier.sign + "";
			this.symbol = specifier.symbol === void 0 ? "" : specifier.symbol + "";
			this.zero = !!specifier.zero;
			this.width = specifier.width === void 0 ? void 0 : +specifier.width;
			this.comma = !!specifier.comma;
			this.precision = specifier.precision === void 0 ? void 0 : +specifier.precision;
			this.trim = !!specifier.trim;
			this.type = specifier.type === void 0 ? "" : specifier.type + "";
		}
		FormatSpecifier.prototype.toString = function() {
			return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
		};
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatTrim.js
		function formatTrim_default(s) {
			out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) switch (s[i]) {
				case ".":
					i0 = i1 = i;
					break;
				case "0":
					if (i0 === 0) i0 = i;
					i1 = i;
					break;
				default:
					if (!+s[i]) break out;
					if (i0 > 0) i0 = 0;
			}
			return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatPrefixAuto.js
		var prefixExponent;
		function formatPrefixAuto_default(x, p) {
			var d = formatDecimalParts(x, p);
			if (!d) return prefixExponent = void 0, x.toPrecision(p);
			var coefficient = d[0], exponent = d[1], i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1, n = coefficient.length;
			return i === n ? coefficient : i > n ? coefficient + new Array(i - n + 1).join("0") : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i) : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0];
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatRounded.js
		function formatRounded_default(x, p) {
			var d = formatDecimalParts(x, p);
			if (!d) return x + "";
			var coefficient = d[0], exponent = d[1];
			return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1) : coefficient + new Array(exponent - coefficient.length + 2).join("0");
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatTypes.js
		var formatTypes_default = {
			"%": (x, p) => (x * 100).toFixed(p),
			"b": (x) => Math.round(x).toString(2),
			"c": (x) => x + "",
			"d": formatDecimal_default,
			"e": (x, p) => x.toExponential(p),
			"f": (x, p) => x.toFixed(p),
			"g": (x, p) => x.toPrecision(p),
			"o": (x) => Math.round(x).toString(8),
			"p": (x, p) => formatRounded_default(x * 100, p),
			"r": formatRounded_default,
			"s": formatPrefixAuto_default,
			"X": (x) => Math.round(x).toString(16).toUpperCase(),
			"x": (x) => Math.round(x).toString(16)
		};
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/identity.js
		function identity_default(x) {
			return x;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/locale.js
		var map = Array.prototype.map;
		var prefixes = [
			"y",
			"z",
			"a",
			"f",
			"p",
			"n",
			"µ",
			"m",
			"",
			"k",
			"M",
			"G",
			"T",
			"P",
			"E",
			"Z",
			"Y"
		];
		function locale_default(locale) {
			var group = locale.grouping === void 0 || locale.thousands === void 0 ? identity_default : formatGroup_default(map.call(locale.grouping, Number), locale.thousands + ""), currencyPrefix = locale.currency === void 0 ? "" : locale.currency[0] + "", currencySuffix = locale.currency === void 0 ? "" : locale.currency[1] + "", decimal = locale.decimal === void 0 ? "." : locale.decimal + "", numerals = locale.numerals === void 0 ? identity_default : formatNumerals_default(map.call(locale.numerals, String)), percent = locale.percent === void 0 ? "%" : locale.percent + "", minus = locale.minus === void 0 ? "−" : locale.minus + "", nan = locale.nan === void 0 ? "NaN" : locale.nan + "";
			function newFormat(specifier, options) {
				specifier = formatSpecifier(specifier);
				var fill = specifier.fill, align = specifier.align, sign = specifier.sign, symbol = specifier.symbol, zero = specifier.zero, width = specifier.width, comma = specifier.comma, precision = specifier.precision, trim = specifier.trim, type = specifier.type;
				if (type === "n") comma = true, type = "g";
				else if (!formatTypes_default[type]) precision === void 0 && (precision = 12), trim = true, type = "g";
				if (zero || fill === "0" && align === "=") zero = true, fill = "0", align = "=";
				var prefix = (options && options.prefix !== void 0 ? options.prefix : "") + (symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : ""), suffix = (symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "") + (options && options.suffix !== void 0 ? options.suffix : "");
				var formatType = formatTypes_default[type], maybeSuffix = /[defgprs%]/.test(type);
				precision = precision === void 0 ? 6 : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision)) : Math.max(0, Math.min(20, precision));
				function format(value) {
					var valuePrefix = prefix, valueSuffix = suffix, i, n, c;
					if (type === "c") {
						valueSuffix = formatType(value) + valueSuffix;
						value = "";
					} else {
						value = +value;
						var valueNegative = value < 0 || 1 / value < 0;
						value = isNaN(value) ? nan : formatType(Math.abs(value), precision);
						if (trim) value = formatTrim_default(value);
						if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;
						valuePrefix = (valueNegative ? sign === "(" ? sign : minus : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
						valueSuffix = (type === "s" && !isNaN(value) && prefixExponent !== void 0 ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");
						if (maybeSuffix) {
							i = -1, n = value.length;
							while (++i < n) if (c = value.charCodeAt(i), 48 > c || c > 57) {
								valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
								value = value.slice(0, i);
								break;
							}
						}
					}
					if (comma && !zero) value = group(value, Infinity);
					var length = valuePrefix.length + value.length + valueSuffix.length, padding = length < width ? new Array(width - length + 1).join(fill) : "";
					if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";
					switch (align) {
						case "<":
							value = valuePrefix + value + valueSuffix + padding;
							break;
						case "=":
							value = valuePrefix + padding + value + valueSuffix;
							break;
						case "^":
							value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
							break;
						default: value = padding + valuePrefix + value + valueSuffix;
					}
					return numerals(value);
				}
				format.toString = function() {
					return specifier + "";
				};
				return format;
			}
			function formatPrefix(specifier, value) {
				var e = Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3, k = Math.pow(10, -e), f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier), { suffix: prefixes[8 + e / 3] });
				return function(value) {
					return f(k * value);
				};
			}
			return {
				format: newFormat,
				formatPrefix
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/defaultLocale.js
		var locale;
		var format;
		var formatPrefix;
		defaultLocale({
			thousands: ",",
			grouping: [3],
			currency: ["$", ""]
		});
		function defaultLocale(definition) {
			locale = locale_default(definition);
			format = locale.format;
			formatPrefix = locale.formatPrefix;
			return locale;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/precisionFixed.js
		function precisionFixed_default(step) {
			return Math.max(0, -exponent_default(Math.abs(step)));
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/precisionPrefix.js
		function precisionPrefix_default(step, value) {
			return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3 - exponent_default(Math.abs(step)));
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/precisionRound.js
		function precisionRound_default(step, max) {
			step = Math.abs(step), max = Math.abs(max) - step;
			return Math.max(0, exponent_default(max) - exponent_default(step)) + 1;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/tickFormat.js
		function tickFormat(start, stop, count, specifier) {
			var step = tickStep(start, stop, count), precision;
			specifier = formatSpecifier(specifier == null ? ",f" : specifier);
			switch (specifier.type) {
				case "s":
					var value = Math.max(Math.abs(start), Math.abs(stop));
					if (specifier.precision == null && !isNaN(precision = precisionPrefix_default(step, value))) specifier.precision = precision;
					return formatPrefix(specifier, value);
				case "":
				case "e":
				case "g":
				case "p":
				case "r":
					if (specifier.precision == null && !isNaN(precision = precisionRound_default(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
					break;
				case "f":
				case "%": if (specifier.precision == null && !isNaN(precision = precisionFixed_default(step))) specifier.precision = precision - (specifier.type === "%") * 2;
			}
			return format(specifier);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/linear.js
		function linearish(scale) {
			var domain = scale.domain;
			scale.ticks = function(count) {
				var d = domain();
				return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
			};
			scale.tickFormat = function(count, specifier) {
				var d = domain();
				return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
			};
			scale.nice = function(count) {
				if (count == null) count = 10;
				var d = domain();
				var i0 = 0;
				var i1 = d.length - 1;
				var start = d[i0];
				var stop = d[i1];
				var prestep;
				var step;
				var maxIter = 10;
				if (stop < start) {
					step = start, start = stop, stop = step;
					step = i0, i0 = i1, i1 = step;
				}
				while (maxIter-- > 0) {
					step = tickIncrement(start, stop, count);
					if (step === prestep) {
						d[i0] = start;
						d[i1] = stop;
						return domain(d);
					} else if (step > 0) {
						start = Math.floor(start / step) * step;
						stop = Math.ceil(stop / step) * step;
					} else if (step < 0) {
						start = Math.ceil(start * step) / step;
						stop = Math.floor(stop * step) / step;
					} else break;
					prestep = step;
				}
				return scale;
			};
			return scale;
		}
		function linear() {
			var scale = continuous();
			scale.copy = function() {
				return copy(scale, linear());
			};
			initRange.apply(scale, arguments);
			return linearish(scale);
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/charts/charts.module.css.mjs
		const css$19 = ".D_mmLG_chart{--chart-text:var(--dsw-alias-label-primary);--chart-text-2:var(--dsw-alias-label-secondary);--chart-text-3:var(--dsw-alias-label-tertiary);--chart-grid:var(--dsw-alias-border-l1);--chart-axis:var(--dsw-alias-border-l2);--chart-surface:var(--dsw-alias-settings-card-fill);--chart-track:var(--dsw-alias-interactive-bg-hover);--chart-accent:var(--dsw-alias-state-business-primary);--chart-success:var(--dsw-alias-state-success-primary);--chart-warning:var(--dsw-alias-state-warn-primary);--chart-danger:var(--dsw-alias-state-error-primary);--chart-font:inherit;box-sizing:border-box;width:100%;min-width:0;color:var(--chart-text);font-variant-numeric:tabular-nums;position:relative}.D_mmLG_plot{position:relative}.D_mmLG_svg{display:block;overflow:visible}.D_mmLG_svg:focus-visible,.D_mmLG_bulletList:focus-visible,.D_mmLG_shareBar:focus-visible{outline:2px solid var(--chart-accent);outline-offset:2px}.D_mmLG_empty{font:var(--dsw-font-xs-13);color:var(--chart-text-3);text-align:center;justify-content:center;align-items:center;margin:0;display:flex}.D_mmLG_srOnly{clip-path:inset(50%);white-space:nowrap;border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}.D_mmLG_grid{stroke:var(--chart-grid);stroke-width:.5px}.D_mmLG_axis{stroke:var(--chart-axis);stroke-width:.5px}.D_mmLG_tick{font:var(--dsw-font-xxxs-11);font-variant-numeric:tabular-nums;fill:var(--chart-text-3)}.D_mmLG_hover{fill:var(--chart-track)}.D_mmLG_hit{fill:#0000}.D_mmLG_measure{visibility:hidden;pointer-events:none}.D_mmLG_series{transition:opacity var(--ds-transition-duration-fast) var(--ds-ease-in-out)}.D_mmLG_series[data-faded]{opacity:.35}.D_mmLG_overlayArea{fill-opacity:.24}.D_mmLG_overlayLine{fill:none;stroke-width:1.5px}.D_mmLG_dot{stroke:var(--chart-surface);stroke-width:1.5px}.D_mmLG_legend{flex-wrap:wrap;gap:2px 12px;margin:0 0 8px -4px;display:flex}.D_mmLG_legendItem{border-radius:var(--dsw-radius-xs);min-height:20px;font:var(--dsw-font-xxs-12);color:var(--chart-text-2);cursor:pointer;transition:color var(--ds-transition-duration-fast) var(--ds-ease-in-out), background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;align-items:center;gap:6px;padding:0 4px;display:inline-flex}.D_mmLG_legendTotal{font-variant-numeric:tabular-nums}.D_mmLG_legendItem[aria-pressed=false]{color:var(--chart-text-3);text-decoration:line-through}.D_mmLG_legendItem[aria-pressed=false] .D_mmLG_swatch{opacity:.35}.D_mmLG_legendItem:focus-visible{outline:2px solid var(--chart-accent);outline-offset:0}@media (hover:hover){.D_mmLG_legendItem:hover{background:var(--chart-track)}}.D_mmLG_swatch{border-radius:2px;flex:none;width:8px;height:8px;display:inline-block}.D_mmLG_tooltip{z-index:2;box-sizing:border-box;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg);min-width:120px;max-width:240px;color:var(--dsw-static-neutral-bluish-00);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;pointer-events:none;padding:6px 8px;position:absolute}.D_mmLG_tooltip[data-side=end]{transform:translate(12px)}.D_mmLG_tooltip[data-side=start]{transform:translate(calc(-100% - 12px))}.D_mmLG_tooltip[data-side=below]{top:calc(100% + 4px);left:0}.D_mmLG_tooltipTitle{font:var(--dsw-font-xxs-strong-12);overflow-wrap:anywhere;margin:0 0 2px}.D_mmLG_tooltipRow{align-items:center;gap:6px;margin:0;display:flex}.D_mmLG_tooltipLabel{overflow-wrap:anywhere;flex:auto;min-width:0}.D_mmLG_tooltipValue{text-align:right;flex:none;margin-left:12px}.D_mmLG_spark{display:block}.D_mmLG_sparkLine{fill:none;stroke-width:1.5px;stroke-linejoin:round;stroke-linecap:round}.D_mmLG_shareBar{corner-shape:round;background:var(--chart-track);border-radius:999px;gap:1px;height:8px;display:flex;overflow:hidden}.D_mmLG_shareSegment{border-radius:1px;flex:0 auto;min-width:2px;height:100%}.D_mmLG_ranked{flex-direction:column;gap:2px;margin:0 -8px;padding:0;list-style:none;display:flex}.D_mmLG_rankRow{box-sizing:border-box;border-radius:var(--dsw-radius-md);width:100%;color:inherit;font:var(--dsw-font-xxs-12);text-align:left;background:0 0;border:0;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:\"D_mmLG_label D_mmLG_value\"\"D_mmLG_bar D_mmLG_bar\";align-items:center;gap:4px 12px;padding:6px 8px;display:grid}.D_mmLG_rankRow[data-trend]{grid-template-columns:minmax(0,1fr) auto 64px;grid-template-areas:\"D_mmLG_label D_mmLG_value D_mmLG_trend\"\"D_mmLG_bar D_mmLG_bar D_mmLG_trend\"}button.D_mmLG_rankRow{cursor:pointer;transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out)}button.D_mmLG_rankRow:focus-visible{outline:2px solid var(--chart-accent);outline-offset:-2px}@media (hover:hover){button.D_mmLG_rankRow:hover{background:var(--chart-track)}}.D_mmLG_rankLabel{min-width:0;color:var(--chart-text);text-overflow:ellipsis;white-space:nowrap;grid-area:D_mmLG_label;overflow:hidden}.D_mmLG_rankLabel[data-code]{font-family:var(--ds-font-family-code)}.D_mmLG_rankValue{color:var(--chart-text-2);white-space:nowrap;grid-area:D_mmLG_value}.D_mmLG_rankBar{corner-shape:round;background:var(--chart-track);border-radius:999px;grid-area:D_mmLG_bar;height:4px;overflow:hidden}.D_mmLG_rankFill{border-radius:inherit;background:var(--chart-accent);height:100%;display:block}.D_mmLG_rankTrend{grid-area:D_mmLG_trend}.D_mmLG_bulletList{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.D_mmLG_bulletRow{position:relative}.D_mmLG_bulletLine{box-sizing:border-box;border-radius:var(--dsw-radius-md);width:100%;min-height:28px;font:var(--dsw-font-xxs-12);grid-template-columns:minmax(64px,32%) minmax(40px,1fr) auto;grid-template-areas:\"D_mmLG_label D_mmLG_track D_mmLG_value\";align-items:center;column-gap:8px;padding:2px 8px;display:grid}.D_mmLG_chart[data-layout=stacked] .D_mmLG_bulletLine{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:\"D_mmLG_label D_mmLG_label\"\"D_mmLG_track D_mmLG_value\";row-gap:2px;padding-block:4px}.D_mmLG_bulletRow[data-active] .D_mmLG_bulletLine{background:var(--chart-track)}button.D_mmLG_bulletLine{color:inherit;text-align:left;cursor:pointer;background:0 0;border:0}button.D_mmLG_bulletLine:focus-visible{outline:2px solid var(--chart-accent);outline-offset:-2px}.D_mmLG_bulletLabel{min-width:0;color:var(--chart-text-2);text-overflow:ellipsis;white-space:nowrap;grid-area:D_mmLG_label;overflow:hidden}.D_mmLG_bulletTrack{border-radius:var(--dsw-radius-xs);background:var(--chart-track);grid-area:D_mmLG_track;height:10px;position:relative}.D_mmLG_bulletRange{border-radius:inherit;background:var(--dsw-alias-border-l2);position:absolute;inset:0 auto 0 0}.D_mmLG_bulletFill{border-radius:2px;position:absolute;inset:2px auto 2px 0}.D_mmLG_bulletTarget{background:var(--chart-text);border-radius:1px;width:2px;margin-left:-1px;position:absolute;top:-3px;bottom:-3px}.D_mmLG_bulletValue{color:var(--chart-text);white-space:nowrap;grid-area:D_mmLG_value;justify-content:flex-end;gap:6px;display:inline-flex}.D_mmLG_bulletNote{color:var(--chart-text-3)}.D_mmLG_gauge{justify-content:center;display:flex}.D_mmLG_gaugeTrack{fill:var(--chart-track)}.D_mmLG_gaugeValue{font:var(--dsw-font-l-20);font-variant-numeric:tabular-nums;fill:var(--chart-text);text-anchor:middle;dominant-baseline:central}.D_mmLG_gaugeCaption{font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;fill:var(--chart-text-3);text-anchor:middle;dominant-baseline:central}@media (prefers-reduced-motion:reduce){.D_mmLG_series,.D_mmLG_legendItem,button.D_mmLG_rankRow{transition:none}}";
		const tag$19 = "@agent-stash/dsh-skill-scout/charts.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$19)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$19;
			style.textContent = css$19;
			document.head.appendChild(style);
		}
		var charts_module_css_default = {
			"axis": "D_mmLG_axis",
			"bar": "D_mmLG_bar",
			"bulletFill": "D_mmLG_bulletFill",
			"bulletLabel": "D_mmLG_bulletLabel",
			"bulletLine": "D_mmLG_bulletLine",
			"bulletList": "D_mmLG_bulletList",
			"bulletNote": "D_mmLG_bulletNote",
			"bulletRange": "D_mmLG_bulletRange",
			"bulletRow": "D_mmLG_bulletRow",
			"bulletTarget": "D_mmLG_bulletTarget",
			"bulletTrack": "D_mmLG_bulletTrack",
			"bulletValue": "D_mmLG_bulletValue",
			"chart": "D_mmLG_chart",
			"dot": "D_mmLG_dot",
			"empty": "D_mmLG_empty",
			"gauge": "D_mmLG_gauge",
			"gaugeCaption": "D_mmLG_gaugeCaption",
			"gaugeTrack": "D_mmLG_gaugeTrack",
			"gaugeValue": "D_mmLG_gaugeValue",
			"grid": "D_mmLG_grid",
			"hit": "D_mmLG_hit",
			"hover": "D_mmLG_hover",
			"label": "D_mmLG_label",
			"legend": "D_mmLG_legend",
			"legendItem": "D_mmLG_legendItem",
			"legendTotal": "D_mmLG_legendTotal",
			"measure": "D_mmLG_measure",
			"overlayArea": "D_mmLG_overlayArea",
			"overlayLine": "D_mmLG_overlayLine",
			"plot": "D_mmLG_plot",
			"rankBar": "D_mmLG_rankBar",
			"ranked": "D_mmLG_ranked",
			"rankFill": "D_mmLG_rankFill",
			"rankLabel": "D_mmLG_rankLabel",
			"rankRow": "D_mmLG_rankRow",
			"rankTrend": "D_mmLG_rankTrend",
			"rankValue": "D_mmLG_rankValue",
			"series": "D_mmLG_series",
			"shareBar": "D_mmLG_shareBar",
			"shareSegment": "D_mmLG_shareSegment",
			"spark": "D_mmLG_spark",
			"sparkLine": "D_mmLG_sparkLine",
			"srOnly": "D_mmLG_srOnly",
			"svg": "D_mmLG_svg",
			"swatch": "D_mmLG_swatch",
			"tick": "D_mmLG_tick",
			"tooltip": "D_mmLG_tooltip",
			"tooltipLabel": "D_mmLG_tooltipLabel",
			"tooltipRow": "D_mmLG_tooltipRow",
			"tooltipTitle": "D_mmLG_tooltipTitle",
			"tooltipValue": "D_mmLG_tooltipValue",
			"track": "D_mmLG_track",
			"trend": "D_mmLG_trend",
			"value": "D_mmLG_value"
		};
		//#endregion
		//#region src/client/ui/charts/primitives.tsx
		/**
		* 图表共用的部件（design.md 4.8）：跟随容器宽度的测量、指针与键盘共用的当前数据点、悬停提示、图例、
		* 读屏数据表、空状态、文字测量，以及数值轴（从 0 起、3 到 5 个刻度、在尾侧）与时间轴（按实测标签宽度取间隔，首尾两天贴两端）。
		*/
		/**
		* 元素的内容宽度（向下取整的像素）：挂载时读一次，之后跟随 ResizeObserver 更新。
		* 传入 `fixed` 时直接用它，不测量也不观察。
		*/
		function useElementWidth(fixed) {
			const ref = (0, react.useRef)(null);
			const [measured, setMeasured] = (0, react.useState)(0);
			(0, react.useLayoutEffect)(() => {
				if (fixed !== void 0) return void 0;
				const element = ref.current;
				if (element === null) throw new Error("the measured element is not mounted");
				setMeasured(Math.floor(element.clientWidth));
				const observer = new ResizeObserver((entries) => {
					const last = entries.at(-1);
					if (last !== void 0) setMeasured(Math.floor(last.contentRect.width));
				});
				observer.observe(element);
				return () => observer.disconnect();
			}, [fixed]);
			return [ref, fixed ?? measured];
		}
		/** 每个方向的方向键对应的移动步数。 */
		const STEPS = {
			x: /* @__PURE__ */ new Map([["ArrowLeft", -1], ["ArrowRight", 1]]),
			y: /* @__PURE__ */ new Map([["ArrowUp", -1], ["ArrowDown", 1]])
		};
		/**
		* 当前数据点：`count` 是数据点个数，`start` 是键盘聚焦时的起点，
		* `axis` 决定用左右方向键（时间序列、横条）还是上下方向键（逐行排列的列表）移动。
		*/
		function useActivePoint(count, start, axis) {
			const [chosen, setChosen] = (0, react.useState)(null);
			const active = chosen !== null && chosen < count ? chosen : null;
			const origin = start === "first" ? 0 : count - 1;
			const clear = (0, react.useCallback)(() => setChosen(null), []);
			const dismiss = (event) => {
				if (event.key !== "Escape" || active === null) return;
				event.preventDefault();
				event.stopPropagation();
				setChosen(null);
			};
			const keys = (event) => {
				if (count === 0) return;
				const step = STEPS[axis].get(event.key);
				let next;
				if (step !== void 0) next = active === null ? origin : Math.min(count - 1, Math.max(0, active + step));
				else if (event.key === "Home") next = 0;
				else if (event.key === "End") next = count - 1;
				else {
					dismiss(event);
					return;
				}
				event.preventDefault();
				setChosen(next);
			};
			return {
				active,
				point: setChosen,
				clear,
				enter: () => {
					if (active === null && count > 0) setChosen(origin);
				},
				keys,
				dismiss
			};
		}
		/** 浮在图表上的提示，宿主 Tooltip 的材质；不传 `anchor` 时放在父元素下方、左端对齐。 */
		function ChartTooltip({ id, content, anchor }) {
			let side = "below";
			if (anchor !== void 0) side = anchor.flip ? "start" : "end";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "tooltip",
				id,
				className: charts_module_css_default.tooltip,
				"data-side": side,
				style: anchor === void 0 ? void 0 : {
					left: anchor.x,
					top: anchor.y
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: charts_module_css_default.tooltipTitle,
					children: content.title
				}), content.rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: charts_module_css_default.tooltipRow,
					children: [
						row.color !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: charts_module_css_default.swatch,
							style: { background: row.color },
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: charts_module_css_default.tooltipLabel,
							children: row.label
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: charts_module_css_default.tooltipValue,
							children: row.value
						})
					]
				}, row.label))]
			});
		}
		/**
		* 图例，放在绘图区上方：每个序列一个开关按钮，按下的序列显示在图里；
		* 指针或焦点停在按钮上时强调这个序列（`onEmphasis`），其他序列淡下去。
		*/
		function ChartLegend({ items, hidden, onToggle, onEmphasis }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: charts_module_css_default.legend,
				children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: charts_module_css_default.legendItem,
					"data-legend": item.key,
					"aria-pressed": !hidden.has(item.key),
					onClick: () => onToggle(item.key),
					onPointerEnter: () => onEmphasis(item.key),
					onPointerLeave: () => onEmphasis(null),
					onFocus: () => onEmphasis(item.key),
					onBlur: () => onEmphasis(null),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: charts_module_css_default.swatch,
							style: { background: item.color },
							"aria-hidden": "true"
						}),
						item.label,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: charts_module_css_default.legendTotal,
							children: item.total
						})
					]
				}, item.key))
			});
		}
		/** 图例里被关掉的序列。 */
		function useHiddenKeys() {
			const [hidden, setHidden] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			return {
				hidden,
				toggle: (0, react.useCallback)((key) => {
					setHidden((current) => {
						const next = new Set(current);
						if (next.has(key)) next.delete(key);
						else next.add(key);
						return next;
					});
				}, [])
			};
		}
		/** 序列的淡化标记：有强调的序列且不是它时淡到 0.35。 */
		function fadedBy(emphasis, key) {
			return emphasis !== null && emphasis !== key ? true : void 0;
		}
		/** 只给读屏看的数据表：每行一个数据点，每列一个序列。 */
		function ScreenReaderTable({ caption, columns, rows }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
				className: charts_module_css_default.srOnly,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("caption", { children: caption }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {}), columns.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
						scope: "col",
						children: column.text
					}, column.key))] }) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
						scope: "row",
						children: row.header
					}), row.cells.map((cell) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: cell.text }, cell.key))] }, row.key)) })
				]
			});
		}
		/** 没有可画的值：保持图表高度，居中一行说明，不画坐标轴与图例。 */
		function ChartEmpty({ height, text }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: charts_module_css_default.empty,
				"data-empty": "",
				style: { height },
				children: text
			});
		}
		/** 依次尝试的刻度数：d3 会把它当作近似值，挑出落在 3 到 5 个之间的那一种。 */
		const TICK_COUNTS = [
			4,
			5,
			3,
			2,
			6
		];
		function valueScale(top, height) {
			const domainTop = Math.max(top, 2);
			let fallback;
			for (const count of TICK_COUNTS) {
				const y = linear().domain([0, domainTop]).range([height, 0]).nice(count);
				const ticks = y.ticks(count).filter((tick) => Number.isInteger(tick));
				const [, max] = y.domain();
				if (ticks.length >= 3 && ticks.length <= 5 && ticks.at(-1) === max) return {
					y,
					ticks
				};
				fallback ??= {
					y,
					ticks
				};
			}
			if (fallback === void 0) throw new Error("no tick count was tried");
			return fallback;
		}
		/** 数值轴：每个刻度一条横贯绘图区的网格线，刻度标签在绘图区尾侧。 */
		function ValueAxis({ scale, width, format }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: scale.ticks.map((tick) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
				"data-tick": tick,
				transform: `translate(0,${String(scale.y(tick))})`,
				children: [tick !== 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
					className: charts_module_css_default.grid,
					x2: width
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					className: charts_module_css_default.tick,
					x: width + 6,
					dy: "0.32em",
					children: format(tick)
				})]
			}, tick)) });
		}
		/**
		* 量文字宽度：把返回的回调 ref 挂到一个 SVG 元素上，元素里每个 `data-measure` 分组放几段与实际文字同样字体的
		* `<text>`，得到每组最宽的一段（像素）。`key` 标识这些文字：它变化时回调换新，React 用新回调重新量一次。
		* 还没量到当前 `key` 的文字时返回空表。
		*/
		function useTextWidths(key) {
			const [measured, setMeasured] = (0, react.useState)(null);
			return [(0, react.useCallback)((element) => {
				if (element === null) return;
				const widths = /* @__PURE__ */ new Map();
				for (const group of element.querySelectorAll("[data-measure]")) {
					const lengths = [...group.children].flatMap((child) => child instanceof SVGTextElement ? [child.getComputedTextLength()] : []);
					widths.set(group.getAttribute("data-measure") ?? "", Math.max(0, ...lengths));
				}
				setMeasured({
					key,
					widths
				});
			}, [key]), measured?.key === key ? measured.widths : EMPTY_WIDTHS];
		}
		const EMPTY_WIDTHS = /* @__PURE__ */ new Map();
		/** 时间轴两个相邻标签之间至少留的空隙。 */
		const LABEL_GAP = 12;
		/**
		* 时间轴的标签：第一天贴绘图区起点，最后一天贴终点，中间每隔固定天数一个，居中在那一天的柱子上。
		* 间隔取「最宽的标签 + 12px」能容下的天数；放不下的中间标签不画，首尾两个放不下时只留最后一天。
		* @param centers - 每天柱子中线的横坐标，等距。
		* @param width - 绘图区宽度。
		* @param labelWidth - 最宽的标签的实测宽度。
		*/
		function axisTicks(centers, width, labelWidth) {
			const last = centers.length - 1;
			if (last < 0) return [];
			const end = {
				index: last,
				x: width,
				anchor: "end"
			};
			if (last === 0 || 2 * labelWidth + LABEL_GAP > width) return [end];
			const step = (centers[1] ?? 0) - (centers[0] ?? 0);
			const every = Math.max(1, Math.ceil((labelWidth + LABEL_GAP) / step));
			const ticks = [{
				index: 0,
				x: 0,
				anchor: "start"
			}];
			let right = labelWidth;
			const limit = width - labelWidth - LABEL_GAP;
			for (let index = every; index < last; index += every) {
				const center = centers[index] ?? 0;
				if (center - labelWidth / 2 >= right + LABEL_GAP && center + labelWidth / 2 <= limit) {
					ticks.push({
						index,
						x: center,
						anchor: "middle"
					});
					right = center + labelWidth / 2;
				}
			}
			ticks.push(end);
			return ticks;
		}
		/** 横轴：绘图区底部的基线与标签；`keys`、`texts` 按天排列，标签取 `ticks` 指向的那几天。 */
		function BandAxis({ ticks, keys, texts, top, width }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
				transform: `translate(0,${String(top)})`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
					className: charts_module_css_default.axis,
					x2: width
				}), ticks.map((tick) => {
					const key = keys[tick.index] ?? String(tick.index);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						className: charts_module_css_default.tick,
						"data-label": key,
						x: tick.x,
						y: 14,
						textAnchor: tick.anchor,
						children: texts[tick.index]
					}, key);
				})]
			});
		}
		/** 量标签宽度用的隐藏文字：与刻度同样的字体，不占位、读屏不读。 */
		function MeasureTexts({ name, texts, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
				"data-measure": name,
				className: charts_module_css_default.measure,
				"aria-hidden": "true",
				children: [...new Set(texts)].map((text) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					className,
					children: text
				}, text))
			});
		}
		/** SVG 路径生成器只在设置了 canvas context 时返回 null；这里没有 context，拿到 null 就是用错了。 */
		function pathOf(path) {
			if (path === null) throw new Error("the shape generator returned no path");
			return path;
		}
		/** 测量分栏容器（layout.module.css 的 `.page` 或 `.split`），返回它是否窄到只显示一栏。 */
		function useSinglePane() {
			const [ref, width] = useElementWidth(void 0);
			return [ref, width < 760];
		}
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
		/** 列出全部卡片的表面（页面的建议分区、打开的浮层）交给 `listing` 的判断。 */
		function everyItem() {
			return true;
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
		* 结果记在第一个 idea 上。`shown` 认得的卡片不算：它正在详情里显示，或者列在看得见的插件表面上。
		* @internal 导出供测试使用。
		*/
		function finishedItems(before, after, shown) {
			if (before === null) return [];
			const results = [];
			for (const previous of before.items) {
				if (!inFlight(previous) || shown(previous)) continue;
				const same = after.items.find((entry) => entry.id === previous.id);
				const ideas = same === void 0 && previous.ideaIndex === null ? after.items.filter((entry) => entry.leadId === previous.leadId && entry.ideaIndex !== null) : [];
				const next = same ?? ideas[0];
				if (next === void 0 || !SETTLED.has(next.state) || shown(next)) continue;
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
			/** 看得见的插件表面各自列出哪些卡片。 */
			const surfaces = /* @__PURE__ */ new Set();
			let hosts = 0;
			/** 卡片正在详情里显示，或者列在看得见的插件表面上。 */
			const shown = (item) => watching.has(item.id) || [...surfaces].some((surface) => surface.lists(item));
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
				const notice = finishedNotice(finishedItems(state.inbox, inbox, shown));
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
				listing(lists) {
					const surface = { lists };
					surfaces.add(surface);
					return () => {
						surfaces.delete(surface);
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
		//#region \0dsh-css:src/client/inbox.module.css.mjs
		const css$18 = ".Wfa-jG_root{position:relative}.Wfa-jG_trigger{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out), color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;border-radius:28px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex;position:relative}.Wfa-jG_trigger:hover,.Wfa-jG_trigger:focus-visible,.Wfa-jG_trigger[aria-expanded=true]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}.Wfa-jG_trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.Wfa-jG_trigger svg{flex:none}.Wfa-jG_badge{box-sizing:border-box;background:var(--dsw-alias-label-secondary);min-width:14px;height:14px;color:var(--dsw-alias-bg-layer-1);font:var(--dsw-font-xxxs-strong-11);font-variant-numeric:tabular-nums;pointer-events:none;border-radius:7px;justify-content:center;align-items:center;padding:0 3px;display:inline-flex;position:absolute;top:-2px;right:-3px}.Wfa-jG_panel,.Wfa-jG_toast{--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);z-index:100;box-sizing:border-box;background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);animation:Wfa-jG_scout-panel-in .14s var(--ds-ease-in-out);border:0;border-radius:16px;position:fixed}.Wfa-jG_panel{flex-direction:column;width:360px;max-width:calc(100vw - 32px);max-height:min(480px,100vh - 140px);padding:4px;display:flex}.Wfa-jG_panel:focus{outline:none}@keyframes Wfa-jG_scout-panel-in{0%{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:none}}.Wfa-jG_toast{width:320px;max-width:calc(100vw - 32px);padding:4px}.Wfa-jG_head{flex:none;align-items:center;gap:8px;padding:8px 8px 6px 12px;display:flex}.Wfa-jG_title{font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-primary);margin:0}.Wfa-jG_working{min-width:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.Wfa-jG_spacer{flex:1}.Wfa-jG_link{border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-state-business-primary);font:var(--dsw-font-xxs-12);cursor:pointer;background:0 0;border:0;flex:none;padding:2px 4px}.Wfa-jG_link:hover{text-decoration:underline}.Wfa-jG_link:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.Wfa-jG_scroll{flex-direction:column;flex:auto;gap:4px;min-height:0;display:flex;overflow:auto}.Wfa-jG_errorRow{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);align-items:center;gap:8px;padding:6px 12px;display:flex}.Wfa-jG_empty{flex-direction:column;gap:2px;padding:16px 12px 20px;display:flex}.Wfa-jG_emptyTitle{font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-primary);margin:0}.Wfa-jG_emptyFact{font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);margin:0}.Wfa-jG_notice{flex:none;padding-top:4px}@media (prefers-reduced-motion:reduce){.Wfa-jG_panel,.Wfa-jG_toast{animation:none}.Wfa-jG_trigger{transition:none}}";
		const tag$18 = "@agent-stash/dsh-skill-scout/inbox.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$18)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$18;
			style.textContent = css$18;
			document.head.appendChild(style);
		}
		var inbox_module_css_default = {
			"badge": "Wfa-jG_badge",
			"empty": "Wfa-jG_empty",
			"emptyFact": "Wfa-jG_emptyFact",
			"emptyTitle": "Wfa-jG_emptyTitle",
			"errorRow": "Wfa-jG_errorRow",
			"head": "Wfa-jG_head",
			"link": "Wfa-jG_link",
			"notice": "Wfa-jG_notice",
			"panel": "Wfa-jG_panel",
			"root": "Wfa-jG_root",
			"scout-panel-in": "Wfa-jG_scout-panel-in",
			"scroll": "Wfa-jG_scroll",
			"spacer": "Wfa-jG_spacer",
			"title": "Wfa-jG_title",
			"toast": "Wfa-jG_toast",
			"trigger": "Wfa-jG_trigger",
			"working": "Wfa-jG_working"
		};
		//#endregion
		//#region src/client/inbox.tsx
		/**
		* 会话标题栏里的经验提炼入口（design 3.7）：一个圆形图标按钮，有新建议时右上角带一个小计数；
		* 点开是收件箱浮层，点一行在主区域打开「历史回溯提炼」页并选中这条。入口在第一次读取完成前不渲染，避免标题栏闪动。
		* 计数只算打开收件箱之后出现的、等用户决定的摘要与草稿，看过即清零；详情面板里正显示的那条在眼前，不计入。
		* 页面没开着时，提示从入口下方弹出；浮层开着时它列出全部卡片，后台工作结束由行表达，不出提示（design 4.9）。
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
			(0, react.useEffect)(() => open ? inbox.listing(everyItem) : void 0, [inbox, open]);
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
			/** 在页面里打开一行；不传 id 时只打开页面。 */
			const openPage = (id) => {
				setOpen(false);
				showItem(props, id);
			};
			const view = state.inbox;
			const sessions = view?.status.analyzed.sessions ?? 0;
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
							view !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
								inbox: view,
								t
							}),
							view !== null && (view.items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: inbox_module_css_default.empty,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: inbox_module_css_default.emptyTitle,
									children: t("panel.empty.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: inbox_module_css_default.emptyFact,
									children: t(sessions === 1 ? "panel.analyzed.one" : "panel.analyzed.other", { sessions })
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupedItems, {
								items: view.items,
								now,
								t,
								size: "popover",
								selected: null,
								onOpen: openPage,
								onDismiss: (id) => dismissItem(inbox, id)
							}))
						]
					}),
					state.notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: inbox_module_css_default.notice,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResultNotice, {
							text: t(state.notice.key, state.notice.params),
							links: noticeLinks(state.notice, props, t, () => setOpen(false))
						})
					})
				]
			}), document.body) : null;
			const popup = toast === null ? null : (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: toastRef,
				className: inbox_module_css_default.toast,
				style: toastPosition ?? MEASURE_STYLE,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResultNotice, {
					framed: false,
					text: t(toast.key, toast.params),
					links: noticeLinks(toast, props, t),
					close: {
						label: t("notice.close"),
						onClick: () => inbox.clearNotice()
					}
				})
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
				"panel.error": "Could not load suggestions",
				"panel.retry": "Retry",
				"panel.empty.title": "No suggestions",
				"panel.analyzed.one": "{sessions} session analyzed",
				"panel.analyzed.other": "{sessions} sessions analyzed",
				"section.review": "Needs your decision",
				"section.found": "Found locally",
				"section.history": "History",
				"group.expand": "Expand {group}",
				"group.collapse": "Collapse {group}",
				"banner.noModel": "No discovery model is available. Choose one in Skill Scout settings",
				"banner.discoveryOff": "Session analysis is off",
				"banner.secondary": "Another DSH window is analyzing sessions",
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
				"detail.none": "No suggestion selected",
				"detail.back": "Back to the list",
				"detail.siblings": "Other ideas from this summary",
				"detail.tab.summary": "Summary",
				"detail.tab.evidence": "Evidence",
				"detail.tab.skill": "Skill",
				"detail.tab.changes": "Changes",
				"detail.tabs": "Suggestion sections",
				"detail.loading": "Loading the evidence",
				"detail.error": "Could not load this suggestion: {error}",
				"detail.summarizedBy": "Summary by {model}",
				"detail.draftedBy": "Draft by {model}",
				"detail.local": "Local rules found this in tool results. No model has read it yet.",
				"detail.steps": "Steps the rules matched",
				"detail.summaryNote.one": "A summary sends redacted evidence from {count} task to {model}: requests, messages during the task, commands, exit codes, and one error line per failed command. It returns a few lines, not a Skill.",
				"detail.summaryNote.other": "A summary sends redacted evidence from {count} tasks to {model}: requests, messages during the task, commands, exit codes, and one error line per failed command. It returns a few lines, not a Skill.",
				"detail.summarize": "Summarize",
				"detail.resummarize": "Summarize again",
				"detail.summarizing": "{model} is writing the summary",
				"detail.noSummaryModel": "No discovery model is available",
				"detail.next.summarize": "Summarize to have {model} read the redacted evidence",
				"detail.next.draft": "Draft the Skill with {model}, then review it before saving",
				"detail.next.save": "Save to write the Skill file",
				"detail.next.improve": "Add the section to {skill}",
				"detail.next.resummarize": "Summarize again to have {model} reread the evidence",
				"detail.next.summarizing": "Produces the findings and a Skill plan",
				"detail.next.drafting": "Produces a SKILL.md draft to review",
				"detail.next.draftingImprove": "Produces a section to add to {skill}",
				"detail.next.restore": "Restore to return it to the suggestions",
				"detail.failureDetail": "Details",
				"detail.reason": "Reason",
				"detail.found": "Found",
				"detail.description": "Purpose",
				"detail.trigger": "When to use",
				"detail.plan": "Plan",
				"detail.risks": "Risks",
				"detail.verification": "Verify",
				"detail.plan.create": "Create",
				"detail.plan.improve": "Add to",
				"detail.consent": "Drafting sends the same evidence and this plan to {model}, which writes the Skill. You review and edit it before anything is saved.",
				"detail.noDraftModel": "No drafting model is available",
				"detail.draft.create": "Draft Skill",
				"detail.draft.improve": "Draft addition",
				"detail.redraft": "Draft again",
				"detail.drafting": "{model} is drafting the Skill",
				"detail.skipped": "The summary found nothing worth saving.",
				"detail.failed.summary": "Summary failed: {kind}",
				"detail.failed.draft": "Drafting failed: {kind}",
				"detail.openSession": "Open session",
				"detail.cautions": "Check before saving: {list}",
				"list.separator": ", ",
				"pager.previous": "Previous idea",
				"pager.next": "Next idea",
				"pager.position": "Idea {index} of {total}",
				"step.label": "Progress",
				"step.found": "Found",
				"step.summary": "Summary",
				"step.draft": "Draft",
				"step.save": "Save",
				"step.state.done": "done",
				"step.state.warning": "needs you",
				"step.state.ongoing": "in progress",
				"step.state.error": "failed",
				"step.state.idle": "not started",
				"step.state.closed": "closed",
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
				"skill.reset": "Reset",
				"skill.invalid": "Name must be lowercase words joined by hyphens; description and instructions are required",
				"skill.section": "Section added to {skill}",
				"skill.notWritable": "{skill} is not in a project or user Skill folder, so Skill Scout cannot change it",
				"changes.loading": "Preparing the file",
				"changes.error": "Could not prepare the file: {error}",
				"changes.exists": "A file already exists at this path",
				"scope.label": "Save to",
				"scope.project": "Project",
				"scope.user": "User",
				"scope.choose": "Choose where to save",
				"action.save.project": "Save to project",
				"action.save.user": "Save to user folder",
				"action.improve": "Add to {skill}",
				"action.saving": "Saving",
				"action.dismiss": "Dismiss",
				"action.dismissSimilar": "Dismiss similar",
				"action.dismissing": "Dismissing",
				"action.restore": "Restore",
				"action.restoring": "Restoring",
				"action.undo": "Undo",
				"action.undoing": "Undoing",
				"action.retry": "Retry",
				"action.more": "More actions",
				"written.path": "Saved to {path}",
				"written.discovered": "DSH lists the Skill",
				"written.checking": "Waiting for DSH to list the Skill",
				"written.missing": "DSH does not list the Skill yet. Check the file",
				"written.unknown": "Save path not recorded",
				"error.invalid": "This action does not apply to the suggestion in its current state",
				"error.missing": "The suggestion no longer exists",
				"error.busy": "This suggestion is already with the model",
				"error.no-model": "No model is available for this step",
				"error.exists": "A Skill file already exists at that path",
				"error.changed": "The file changed after the preview. Nothing was written",
				"error.outside": "The target is outside the project and user Skill folders",
				"error.unsafe": "The content contains a credential. Remove it and try again",
				"error.empty": "There are no tasks to extract",
				"error.request": "The request failed: {error}",
				"session.state.analyzed.one": "{count} task analyzed",
				"session.state.analyzed.other": "{count} tasks analyzed",
				"session.state.waiting": "Waiting to analyze",
				"session.state.pending": "Not analyzed yet",
				"session.state.failed": "Analysis failed",
				"session.state.subagent": "Subagent session",
				"session.state.subagent.meta": "Not analyzed on its own",
				"session.state.missing": "Session not found",
				"session.state.unread": "Session not loaded",
				"session.analyze": "Analyze now",
				"session.analyzing": "Analyzing",
				"session.extract": "Extract from this session",
				"session.extracting": "Extracting",
				"session.list": "Suggestions and tasks",
				"session.items": "Suggestions citing this session",
				"session.items.empty": "No suggestion cites this session",
				"session.tasks": "Tasks in this session",
				"session.tasks.empty": "No tasks recorded",
				"session.error": "Could not load this session: {error}",
				"task.commands.one": "{count} command",
				"task.commands.other": "{count} commands",
				"task.edits.one": "{count} edit",
				"task.edits.other": "{count} edits",
				"task.recoveries.one": "{count} fix",
				"task.recoveries.other": "{count} fixes",
				"task.more": "+{count}",
				"task.sequence": "Steps: {steps}",
				"search.label": "Search tasks",
				"search.placeholder": "Commands, errors, file paths, or requests",
				"search.outcome": "Outcome",
				"search.outcome.all": "All outcomes",
				"search.scope": "Searches {tasks} from {sessions}",
				"search.scope.tasks.one": "{count} task",
				"search.scope.tasks.other": "{count} tasks",
				"search.scope.sessions.one": "{count} analyzed session",
				"search.scope.sessions.other": "{count} analyzed sessions",
				"search.total.one": "{total} matching task",
				"search.total.other": "{total} matching tasks",
				"search.totalShown": "{total} matching tasks, showing the first {count}",
				"search.empty": "No tasks match \"{query}\"",
				"search.results": "Results",
				"search.more": "Show more",
				"search.clearQuery": "Clear search",
				"search.selection": "Selected tasks",
				"search.extracting": "Extracting",
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
				"stats.unknown": "Not listed yet",
				"stats.coverage.analyzed": "Analyzed",
				"stats.coverage.failed": "Failed",
				"stats.coverage.pending": "Not analyzed",
				"stats.failed": "Sessions that failed analysis",
				"stats.failed.count.one": "{count} session",
				"stats.failed.count.other": "{count} sessions",
				"kpi.analyzed": "Sessions analyzed",
				"kpi.analyzed.of": "of {total}",
				"kpi.analyzed.inRange": "{count} in range",
				"kpi.analyzed.backfilled": "{count} by backfill",
				"kpi.analyzed.share": "Sessions by analysis state",
				"kpi.tasks": "Tasks, last 30 days",
				"kpi.tasks.verified": "{percent} passed a check",
				"kpi.ideas": "Ideas to review",
				"kpi.ideas.ready.one": "{count} draft ready",
				"kpi.ideas.ready.other": "{count} drafts ready",
				"kpi.skills": "Skills saved",
				"kpi.skills.of.one": "of {count} idea",
				"kpi.skills.of.other": "of {count} ideas",
				"stats.tasks": "Tasks per day, last 30 days",
				"stats.tasks.count.one": "{count} task",
				"stats.tasks.count.other": "{count} tasks",
				"stats.tasks.empty": "No tasks in the last 30 days",
				"stats.leads": "Leads by state",
				"stats.leads.count.one": "{count} lead",
				"stats.leads.count.other": "{count} leads",
				"stats.leads.empty": "No leads yet",
				"stats.ideas": "Ideas by state",
				"stats.ideas.count.one": "{count} idea",
				"stats.ideas.count.other": "{count} ideas",
				"stats.ideas.empty": "No ideas yet",
				"funnel.lead.detected": "Waiting for summary",
				"funnel.lead.summarized": "Summarized",
				"funnel.lead.skipped": "Not worth saving",
				"funnel.lead.failed": "Summary failed",
				"funnel.lead.dismissed": "Dismissed",
				"funnel.idea.proposed": "Waiting for you",
				"funnel.idea.ready": "Draft ready",
				"funnel.idea.failed": "Draft failed",
				"funnel.idea.written": "Saved",
				"funnel.idea.dismissed": "Dismissed",
				"stats.newLeads": "New leads per day, last 30 days",
				"stats.newLeads.series": "New leads",
				"stats.newLeads.empty": "No new leads in the last 30 days",
				"stats.actions": "Frequent actions",
				"stats.actions.trend": "{label}, sessions per week, last 8 weeks",
				"stats.actions.empty": "No action repeats across sessions",
				"stats.errors": "Recurring errors",
				"stats.errors.empty": "No error repeats across sessions",
				"stats.searchFor": "Search for {text}",
				"stats.week.current": "This week",
				"stats.week.ago.one": "{count} week ago",
				"stats.week.ago.other": "{count} weeks ago",
				"stats.usage": "Model usage, last 7 days",
				"stats.usage.total.one": "{count} token",
				"stats.usage.total.other": "{count} tokens",
				"stats.usage.empty": "No model calls in the last 7 days",
				"usage.input": "Input",
				"usage.cacheRead": "Cache read",
				"usage.cacheWrite": "Cache write",
				"usage.output": "Output",
				"usage.requests": "{summaries} background · {requested} requested · {failures} failed",
				"stats.calls": "Recent model calls",
				"stats.calls.empty": "No model calls yet",
				"stage.summary": "Summary",
				"stage.draft": "Draft",
				"call.column.item": "Item",
				"call.column.stage": "Stage",
				"call.column.model": "Model",
				"call.column.duration": "Duration",
				"call.column.input": "Input",
				"call.column.output": "Output",
				"call.column.result": "Result",
				"call.column.time": "Time",
				"call.proposed": "Proposed",
				"call.skipped": "Not worth saving",
				"call.drafted": "Drafted",
				"call.failed": "Failed",
				"call.ideas.one": "{count} idea",
				"call.ideas.other": "{count} ideas",
				"call.detail": "{result}: {detail}",
				"chart.total": "Total",
				"chart.day": "{m}/{d}",
				"chart.locale": "en-US",
				"chart.trend.empty": "Not enough data",
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
				"panel.error": "建议加载失败",
				"panel.retry": "重试",
				"panel.empty.title": "暂无建议",
				"panel.analyzed.one": "已分析 {sessions} 个会话",
				"panel.analyzed.other": "已分析 {sessions} 个会话",
				"section.review": "待你决定",
				"section.found": "本地发现",
				"section.history": "历史",
				"group.expand": "展开{group}",
				"group.collapse": "收起{group}",
				"banner.noModel": "没有可用的发现模型，请在经验提炼的设置里选择",
				"banner.discoveryOff": "会话分析已关闭",
				"banner.secondary": "另一个 DSH 窗口正在分析会话",
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
				"detail.none": "未选择建议",
				"detail.back": "返回列表",
				"detail.siblings": "同一线索的其他 idea",
				"detail.tab.summary": "摘要",
				"detail.tab.evidence": "证据",
				"detail.tab.skill": "Skill",
				"detail.tab.changes": "改动",
				"detail.tabs": "建议的内容",
				"detail.loading": "正在加载证据",
				"detail.error": "建议读取失败：{error}",
				"detail.summarizedBy": "摘要：{model}",
				"detail.draftedBy": "草稿：{model}",
				"detail.local": "由本地规则依据工具结果发现，还没有发给任何模型。",
				"detail.steps": "规则匹配到的步骤",
				"detail.summaryNote.one": "生成摘要会把 {count} 个任务的脱敏证据发给 {model}：用户请求、任务中的插话、命令、退出码，以及每条失败命令的一行错误输出。模型只返回几行摘要，不写 Skill。",
				"detail.summaryNote.other": "生成摘要会把 {count} 个任务的脱敏证据发给 {model}：用户请求、任务中的插话、命令、退出码，以及每条失败命令的一行错误输出。模型只返回几行摘要，不写 Skill。",
				"detail.summarize": "生成摘要",
				"detail.resummarize": "重新摘要",
				"detail.summarizing": "{model} 正在写摘要",
				"detail.noSummaryModel": "没有可用的发现模型",
				"detail.next.summarize": "生成摘要，由 {model} 阅读脱敏后的证据",
				"detail.next.draft": "生成草稿，由 {model} 按这份计划写出 Skill，保存前由你审阅",
				"detail.next.save": "保存后写入 Skill 文件",
				"detail.next.improve": "追加这一节到 {skill}",
				"detail.next.resummarize": "重新摘要，由 {model} 再读一遍证据",
				"detail.next.summarizing": "产出发现的内容与 Skill 计划",
				"detail.next.drafting": "产出待你审阅的 SKILL.md 草稿",
				"detail.next.draftingImprove": "产出要追加到 {skill} 的一节",
				"detail.next.restore": "恢复后回到建议列表",
				"detail.failureDetail": "详情",
				"detail.reason": "理由",
				"detail.found": "发现",
				"detail.description": "用途",
				"detail.trigger": "何时使用",
				"detail.plan": "将要做",
				"detail.risks": "风险",
				"detail.verification": "验证方式",
				"detail.plan.create": "新建",
				"detail.plan.improve": "追加到",
				"detail.consent": "生成草稿会把同样的证据和这份计划发给 {model}，由它写出 Skill。保存之前你可以审阅和修改。",
				"detail.noDraftModel": "没有可用的生成模型",
				"detail.draft.create": "生成 Skill 草稿",
				"detail.draft.improve": "生成追加内容",
				"detail.redraft": "重新生成",
				"detail.drafting": "{model} 正在生成 Skill",
				"detail.skipped": "摘要认为没有值得保存的内容。",
				"detail.failed.summary": "摘要失败：{kind}",
				"detail.failed.draft": "生成草稿失败：{kind}",
				"detail.openSession": "打开会话",
				"detail.cautions": "保存前请确认：{list}",
				"list.separator": "、",
				"pager.previous": "上一个 idea",
				"pager.next": "下一个 idea",
				"pager.position": "第 {index} 个 idea，共 {total} 个",
				"step.label": "进度",
				"step.found": "发现",
				"step.summary": "摘要",
				"step.draft": "草稿",
				"step.save": "保存",
				"step.state.done": "已完成",
				"step.state.warning": "等你确认",
				"step.state.ongoing": "进行中",
				"step.state.error": "失败",
				"step.state.idle": "未开始",
				"step.state.closed": "已结束",
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
				"skill.reset": "还原",
				"skill.invalid": "名称只能是用连字符连接的小写单词；描述与内容不能为空",
				"skill.section": "追加到 {skill} 的内容",
				"skill.notWritable": "{skill} 不在项目或用户的 Skill 目录里，经验提炼无法修改它",
				"changes.loading": "正在生成文件",
				"changes.error": "无法生成文件：{error}",
				"changes.exists": "这个路径已经有文件",
				"scope.label": "保存到",
				"scope.project": "项目",
				"scope.user": "用户",
				"scope.choose": "选择保存位置",
				"action.save.project": "保存到项目",
				"action.save.user": "保存到用户目录",
				"action.improve": "追加到 {skill}",
				"action.saving": "正在保存",
				"action.dismiss": "忽略",
				"action.dismissSimilar": "忽略类似建议",
				"action.dismissing": "正在忽略",
				"action.restore": "恢复",
				"action.restoring": "正在恢复",
				"action.undo": "撤销",
				"action.undoing": "正在撤销",
				"action.retry": "重试",
				"action.more": "更多操作",
				"written.path": "已保存到 {path}",
				"written.discovered": "DSH 已列出这个 Skill",
				"written.checking": "正在等 DSH 列出这个 Skill",
				"written.missing": "DSH 还没有列出这个 Skill，请检查文件",
				"written.unknown": "没有记录保存路径",
				"error.invalid": "这条建议当前的状态不支持这个操作",
				"error.missing": "这条建议已不存在",
				"error.busy": "这条建议正在等模型回复",
				"error.no-model": "这一步没有可用的模型",
				"error.exists": "这个路径已经有 Skill 文件",
				"error.changed": "预览之后文件被改过，没有写入任何内容",
				"error.outside": "目标不在项目或用户的 Skill 目录里",
				"error.unsafe": "内容里有凭据，删除后再试",
				"error.empty": "没有可提炼的任务",
				"error.request": "请求失败：{error}",
				"session.state.analyzed.one": "已分析 {count} 个任务",
				"session.state.analyzed.other": "已分析 {count} 个任务",
				"session.state.waiting": "等待分析",
				"session.state.pending": "尚未分析",
				"session.state.failed": "分析失败",
				"session.state.subagent": "子代理会话",
				"session.state.subagent.meta": "不单独分析",
				"session.state.missing": "找不到这个会话",
				"session.state.unread": "未读取会话",
				"session.analyze": "立即分析",
				"session.analyzing": "正在分析",
				"session.extract": "提炼本会话",
				"session.extracting": "正在提炼",
				"session.list": "建议与任务",
				"session.items": "引用本会话的建议",
				"session.items.empty": "还没有建议引用本会话",
				"session.tasks": "本会话的任务",
				"session.tasks.empty": "没有记录到任务",
				"session.error": "无法读取这个会话：{error}",
				"task.commands.one": "{count} 条命令",
				"task.commands.other": "{count} 条命令",
				"task.edits.one": "{count} 处改动",
				"task.edits.other": "{count} 处改动",
				"task.recoveries.one": "{count} 次修复",
				"task.recoveries.other": "{count} 次修复",
				"task.more": "+{count}",
				"task.sequence": "步骤：{steps}",
				"search.label": "搜索任务",
				"search.placeholder": "命令、错误、文件路径或请求",
				"search.outcome": "结果",
				"search.outcome.all": "全部结果",
				"search.scope": "搜索范围：已分析的 {sessions}、{tasks}",
				"search.scope.tasks.one": "{count} 个任务",
				"search.scope.tasks.other": "{count} 个任务",
				"search.scope.sessions.one": "{count} 个会话",
				"search.scope.sessions.other": "{count} 个会话",
				"search.total.one": "{total} 个任务匹配",
				"search.total.other": "{total} 个任务匹配",
				"search.totalShown": "{total} 个任务匹配，显示前 {count} 个",
				"search.empty": "没有与「{query}」匹配的任务",
				"search.results": "搜索结果",
				"search.more": "显示更多",
				"search.clearQuery": "清空搜索",
				"search.selection": "已选任务",
				"search.extracting": "正在提炼",
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
				"stats.unknown": "尚未列出",
				"stats.coverage.analyzed": "已分析",
				"stats.coverage.failed": "分析失败",
				"stats.coverage.pending": "未分析",
				"stats.failed": "分析失败的会话",
				"stats.failed.count.one": "{count} 个会话",
				"stats.failed.count.other": "{count} 个会话",
				"kpi.analyzed": "已分析的会话",
				"kpi.analyzed.of": "共 {total} 个",
				"kpi.analyzed.inRange": "范围内 {count} 个",
				"kpi.analyzed.backfilled": "回溯读入 {count} 个",
				"kpi.analyzed.share": "会话的分析状态",
				"kpi.tasks": "近 30 天的任务",
				"kpi.tasks.verified": "{percent} 通过检查",
				"kpi.ideas": "待你决定的 idea",
				"kpi.ideas.ready.one": "{count} 份草稿可保存",
				"kpi.ideas.ready.other": "{count} 份草稿可保存",
				"kpi.skills": "已保存的 Skill",
				"kpi.skills.of.one": "共 {count} 个 idea",
				"kpi.skills.of.other": "共 {count} 个 idea",
				"stats.tasks": "近 30 天每天的任务",
				"stats.tasks.count.one": "{count} 个任务",
				"stats.tasks.count.other": "{count} 个任务",
				"stats.tasks.empty": "近 30 天没有任务",
				"stats.leads": "线索状态",
				"stats.leads.count.one": "{count} 条线索",
				"stats.leads.count.other": "{count} 条线索",
				"stats.leads.empty": "还没有线索",
				"stats.ideas": "idea 状态",
				"stats.ideas.count.one": "{count} 个 idea",
				"stats.ideas.count.other": "{count} 个 idea",
				"stats.ideas.empty": "还没有 idea",
				"funnel.lead.detected": "待摘要",
				"funnel.lead.summarized": "已摘要",
				"funnel.lead.skipped": "不值得保存",
				"funnel.lead.failed": "摘要失败",
				"funnel.lead.dismissed": "已忽略",
				"funnel.idea.proposed": "待你决定",
				"funnel.idea.ready": "草稿可保存",
				"funnel.idea.failed": "草稿生成失败",
				"funnel.idea.written": "已保存",
				"funnel.idea.dismissed": "已忽略",
				"stats.newLeads": "近 30 天每天的新线索",
				"stats.newLeads.series": "新线索",
				"stats.newLeads.empty": "近 30 天没有新线索",
				"stats.actions": "高频动作",
				"stats.actions.trend": "{label}：近 8 周每周的会话数",
				"stats.actions.empty": "还没有跨会话重复的动作",
				"stats.errors": "反复出现的错误",
				"stats.errors.empty": "还没有跨会话重复的错误",
				"stats.searchFor": "搜索 {text}",
				"stats.week.current": "本周",
				"stats.week.ago.one": "{count} 周前",
				"stats.week.ago.other": "{count} 周前",
				"stats.usage": "近 7 天模型用量",
				"stats.usage.total.one": "{count} token",
				"stats.usage.total.other": "{count} token",
				"stats.usage.empty": "近 7 天没有模型调用",
				"usage.input": "输入",
				"usage.cacheRead": "缓存读取",
				"usage.cacheWrite": "缓存写入",
				"usage.output": "输出",
				"usage.requests": "后台 {summaries} · 手动 {requested} · 失败 {failures}",
				"stats.calls": "最近的模型调用",
				"stats.calls.empty": "还没有模型调用",
				"stage.summary": "摘要",
				"stage.draft": "草稿",
				"call.column.item": "条目",
				"call.column.stage": "阶段",
				"call.column.model": "模型",
				"call.column.duration": "耗时",
				"call.column.input": "输入",
				"call.column.output": "输出",
				"call.column.result": "结论",
				"call.column.time": "时间",
				"call.proposed": "给出 idea",
				"call.skipped": "不值得保存",
				"call.drafted": "已生成草稿",
				"call.failed": "失败",
				"call.ideas.one": "{count} 个 idea",
				"call.ideas.other": "{count} 个 idea",
				"call.detail": "{result}：{detail}",
				"chart.total": "合计",
				"chart.day": "{m}月{d}日",
				"chart.locale": "zh-CN",
				"chart.trend.empty": "数据不足",
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
			reveal: null,
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
		const css$17 = ".FSsC8q_detail{--scout-gutter:24px;min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);flex-direction:column;flex:auto;display:flex}.FSsC8q_detail[data-size=pane]{--scout-gutter:16px}@container (width<=1100px){.FSsC8q_detail[data-size=page]{--scout-gutter:20px}}@container (width<=400px){.FSsC8q_detail[data-size=page]{--scout-gutter:16px}}.FSsC8q_header{padding:20px var(--scout-gutter) 12px;flex-direction:column;flex:none;gap:4px;display:flex}.FSsC8q_titleRow{align-items:flex-start;gap:8px;min-width:0;display:flex}.FSsC8q_back{flex:none;margin:-2px 0 -2px -6px;display:inline-flex}.FSsC8q_heading{flex-wrap:wrap;flex:auto;align-items:center;gap:4px 8px;min-width:0;display:flex}.FSsC8q_title{-webkit-line-clamp:2;min-width:0;font:var(--dsw-font-base-strong-16);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;-webkit-box-orient:vertical;margin:0;display:-webkit-box;overflow:hidden}.FSsC8q_kind{flex:none}.FSsC8q_meta{white-space:nowrap;min-width:0;font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex-wrap:nowrap;margin:0;display:flex;overflow:hidden}.FSsC8q_metaItem{flex:none}.FSsC8q_metaItem[data-fill]{flex:auto;min-width:0;display:flex}.FSsC8q_metaItem:last-child:not([data-fill]){text-overflow:ellipsis;flex-shrink:1;min-width:0;overflow:hidden}.FSsC8q_metaItem+.FSsC8q_metaItem:before{content:\" · \";white-space:pre;flex:none}.FSsC8q_metaItem[data-ink=secondary]{color:var(--dsw-alias-label-secondary)}.FSsC8q_metaItem[data-ink=error]{color:var(--dsw-alias-state-error-primary)}.FSsC8q_steps{margin-top:8px}.FSsC8q_body{min-height:0;padding:20px var(--scout-gutter) 28px;scrollbar-gutter:stable;flex:auto;overflow:auto}.FSsC8q_body:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.FSsC8q_loading{flex-direction:column;gap:12px;display:flex}.FSsC8q_stack{flex-direction:column;gap:20px;min-width:0;display:flex}.FSsC8q_block{flex-direction:column;gap:4px;min-width:0;display:flex}.FSsC8q_label{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);margin:0}.FSsC8q_prose{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0}.FSsC8q_note{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0}.FSsC8q_code{font:var(--dsw-font-xxs-12);font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-primary)}.FSsC8q_outline{font:var(--dsw-font-s-14);flex-direction:column;gap:4px;margin:4px 0 0;padding-left:20px;display:flex}.FSsC8q_sequence{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);flex-direction:column;gap:2px;margin:0;padding-left:20px;display:flex}.FSsC8q_sequence code{font:inherit;font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.FSsC8q_failureDetail{font:var(--dsw-font-xxs-12);font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.FSsC8q_failure{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);margin:0}.FSsC8q_fields{grid-template-columns:96px minmax(0,1fr);gap:6px 12px;margin:0;display:grid}.FSsC8q_fields dt{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}.FSsC8q_fields dd{min-width:0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0}.FSsC8q_document{min-width:0}.FSsC8q_editor{flex-direction:column;gap:12px;display:flex}.FSsC8q_field{flex-direction:column;gap:4px;display:flex}.FSsC8q_input{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);width:100%;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);resize:vertical;transition:border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;padding:6px 10px}.FSsC8q_input:hover{border-color:var(--dsw-alias-border-l2)}.FSsC8q_input:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}.FSsC8q_mono{font:var(--dsw-font-xxs-12);font-family:var(--ds-font-family-code)}.FSsC8q_episode{flex-direction:column;gap:8px;min-width:0;display:flex}.FSsC8q_episode+.FSsC8q_episode{border-top:.5px solid var(--dsw-alias-border-l1);padding-top:20px}.FSsC8q_episodeHead{grid-template-columns:16px minmax(0,1fr) auto;align-items:start;column-gap:8px;display:grid}.FSsC8q_marker{justify-content:center;align-items:center;height:1lh;display:flex}.FSsC8q_episodeText{flex-direction:column;gap:2px;min-width:0;display:flex}.FSsC8q_episodeGoal{font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0}.FSsC8q_episodeHead .FSsC8q_marker{font:var(--dsw-font-xs-strong-13)}.FSsC8q_ref{font:var(--dsw-font-xxs-12);font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-tertiary);margin-right:6px}.FSsC8q_ops{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}.FSsC8q_op{font:var(--dsw-font-xxs-12);grid-template-columns:16px minmax(0,1fr) auto;column-gap:8px;display:grid}.FSsC8q_opBody{flex-direction:column;min-width:0;display:flex}.FSsC8q_opLabel{font:inherit;font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.FSsC8q_op[data-cited] .FSsC8q_opLabel{color:var(--dsw-alias-label-primary)}.FSsC8q_opError{font:inherit;font-family:var(--ds-font-family-code);color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;overflow-wrap:anywhere}.FSsC8q_opRef{font:inherit;font-family:var(--ds-font-family-code);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary)}.FSsC8q_quote{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;flex-direction:column;gap:2px;margin:0;display:flex}.FSsC8q_footer{padding:12px var(--scout-gutter);border-top:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-base);flex-direction:column;flex:none;gap:8px;display:flex}.FSsC8q_detail[data-size=pane] .FSsC8q_footer{border-top-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}.FSsC8q_actions{flex-wrap:wrap;align-items:center;gap:8px;min-width:0;display:flex}.FSsC8q_spacer{flex:1}.FSsC8q_actionError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0}.FSsC8q_working{flex-direction:column;gap:12px;display:flex}.FSsC8q_workingLabel{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);flex-wrap:wrap;align-items:baseline;gap:2px 8px;margin:0;display:flex}.FSsC8q_model,.FSsC8q_elapsed{color:var(--dsw-alias-label-tertiary)}.FSsC8q_elapsed{font-variant-numeric:tabular-nums}.FSsC8q_skeleton{flex-direction:column;gap:10px;display:flex}.FSsC8q_skeletonBar{border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-skeleton);height:10px;animation:2s cubic-bezier(.36,0,.64,1) infinite both FSsC8q_scout-skeleton}.FSsC8q_skeletonGap{height:4px}@keyframes FSsC8q_scout-skeleton{0%{opacity:1}40%{opacity:.6}80%,to{opacity:1}}.FSsC8q_skeletonBar[data-lit]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 35%, transparent);animation:none}.FSsC8q_working[data-motion=reduce] .FSsC8q_skeletonBar{animation:none}@media (prefers-reduced-motion:reduce){.FSsC8q_skeletonBar,.FSsC8q_input{transition:none;animation:none}}";
		const tag$17 = "@agent-stash/dsh-skill-scout/detail.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$17)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$17;
			style.textContent = css$17;
			document.head.appendChild(style);
		}
		var detail_module_css_default = {
			"actionError": "FSsC8q_actionError",
			"actions": "FSsC8q_actions",
			"back": "FSsC8q_back",
			"block": "FSsC8q_block",
			"body": "FSsC8q_body",
			"code": "FSsC8q_code",
			"detail": "FSsC8q_detail",
			"document": "FSsC8q_document",
			"editor": "FSsC8q_editor",
			"elapsed": "FSsC8q_elapsed",
			"episode": "FSsC8q_episode",
			"episodeGoal": "FSsC8q_episodeGoal",
			"episodeHead": "FSsC8q_episodeHead",
			"episodeText": "FSsC8q_episodeText",
			"failure": "FSsC8q_failure",
			"failureDetail": "FSsC8q_failureDetail",
			"field": "FSsC8q_field",
			"fields": "FSsC8q_fields",
			"footer": "FSsC8q_footer",
			"header": "FSsC8q_header",
			"heading": "FSsC8q_heading",
			"input": "FSsC8q_input",
			"kind": "FSsC8q_kind",
			"label": "FSsC8q_label",
			"loading": "FSsC8q_loading",
			"marker": "FSsC8q_marker",
			"meta": "FSsC8q_meta",
			"metaItem": "FSsC8q_metaItem",
			"model": "FSsC8q_model",
			"mono": "FSsC8q_mono",
			"note": "FSsC8q_note",
			"op": "FSsC8q_op",
			"opBody": "FSsC8q_opBody",
			"opError": "FSsC8q_opError",
			"opLabel": "FSsC8q_opLabel",
			"opRef": "FSsC8q_opRef",
			"ops": "FSsC8q_ops",
			"outline": "FSsC8q_outline",
			"prose": "FSsC8q_prose",
			"quote": "FSsC8q_quote",
			"ref": "FSsC8q_ref",
			"scout-skeleton": "FSsC8q_scout-skeleton",
			"sequence": "FSsC8q_sequence",
			"skeleton": "FSsC8q_skeleton",
			"skeletonBar": "FSsC8q_skeletonBar",
			"skeletonGap": "FSsC8q_skeletonGap",
			"spacer": "FSsC8q_spacer",
			"stack": "FSsC8q_stack",
			"steps": "FSsC8q_steps",
			"title": "FSsC8q_title",
			"titleRow": "FSsC8q_titleRow",
			"working": "FSsC8q_working",
			"workingLabel": "FSsC8q_workingLabel"
		};
		//#endregion
		//#region src/client/lifecycle.ts
		const ORDER = [
			"found",
			"summary",
			"draft",
			"save"
		];
		const LABELS = {
			found: "step.found",
			summary: "step.summary",
			draft: "step.draft",
			save: "step.save"
		};
		const WORDS = {
			done: "step.state.done",
			warning: "step.state.warning",
			ongoing: "step.state.ongoing",
			error: "step.state.error",
			idle: "step.state.idle"
		};
		/**
		* 状态本身就决定位置的卡片：当前一步的序号与状态。还没有摘要时停在摘要、未开始；摘要待确认时停在摘要、
		* 等你处理；草稿待保存时停在草稿、等你处理；已保存时没有当前一步。
		*/
		const POSITIONS = {
			detected: {
				index: 1,
				state: "idle"
			},
			summarizing: {
				index: 1,
				state: "ongoing"
			},
			skipped: {
				index: 1,
				state: "idle"
			},
			proposed: {
				index: 1,
				state: "warning"
			},
			drafting: {
				index: 2,
				state: "ongoing"
			},
			ready: {
				index: 2,
				state: "warning"
			},
			written: {
				index: ORDER.length,
				state: "done"
			}
		};
		/** 失败停在出错的那一步；已忽略的卡片停在摘要（还没有摘要）或草稿。 */
		function position(item) {
			if (item.state === "failed") return {
				index: item.failure?.stage === "draft" ? 2 : 1,
				state: "error"
			};
			if (item.state === "dismissed") return {
				index: item.decision === null || item.decision === "skip" ? 1 : 2,
				state: "idle"
			};
			return POSITIONS[item.state];
		}
		function lifecycleOf(t, item) {
			const closed = item.state === "skipped" || item.state === "dismissed";
			const { index, state } = position(item);
			return {
				closed,
				steps: ORDER.map((id, at) => {
					const current = !closed && at === index;
					const stepState = closed ? "idle" : at < index ? "done" : current ? state : "idle";
					return {
						id,
						label: t(LABELS[id]),
						state: stepState,
						current,
						word: closed ? t("step.state.closed") : t(WORDS[stepState])
					};
				})
			};
		}
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
		//#region \0dsh-css:src/client/ui/action-button.module.css.mjs
		const css$16 = ".eQnwUa_button{gap:6px}.eQnwUa_button[aria-disabled=true]{opacity:.4;cursor:default}";
		const tag$16 = "@agent-stash/dsh-skill-scout/action-button.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$16)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$16;
			style.textContent = css$16;
			document.head.appendChild(style);
		}
		var action_button_module_css_default = { "button": "eQnwUa_button" };
		//#endregion
		//#region src/client/ui/action-button.tsx
		/**
		* 带文字的操作按钮（design 4.4）：进行中时按钮里显示转圈的状态点并换成进行时的文字；
		* 因读者能解决的原因不可用时仍可聚焦，带 `aria-disabled` 与禁用外观，悬停提示说明原因。
		*/
		function ActionButton({ variant, label, busyLabel, busy = false, disabled = false, unavailable, onClick, className }) {
			const blocked = unavailable !== null && unavailable !== void 0;
			const button = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant,
				size: "sm",
				className: className === void 0 ? action_button_module_css_default.button : `${action_button_module_css_default.button} ${className}`,
				disabled: disabled || busy,
				"aria-disabled": blocked || void 0,
				onClick: () => {
					if (!blocked) onClick();
				},
				children: [busy && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
					state: "ongoing",
					size: 12
				}), busy && busyLabel !== void 0 ? busyLabel : label]
			});
			return blocked ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: unavailable,
				side: "bottom",
				children: button
			}) : button;
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/detail-tabs.module.css.mjs
		const css$15 = ".cf7n-q_bar{box-sizing:border-box;height:44px;min-height:44px;padding:0 var(--scout-gutter);border-bottom:.5px solid var(--dsw-alias-border-l2);flex-shrink:0;justify-content:space-between;align-items:center;gap:20px;display:flex}.cf7n-q_bar[data-size=pane]{height:37px;min-height:37px}.cf7n-q_tabs{scrollbar-width:none;flex:auto;align-self:flex-end;gap:36px;min-width:0;margin-bottom:-1px;padding-bottom:1px;display:flex;overflow-x:auto}.cf7n-q_tabs::-webkit-scrollbar{display:none}.cf7n-q_tab{font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;flex:none;padding:0 0 13px;position:relative}.cf7n-q_bar[data-size=pane] .cf7n-q_tab{padding-bottom:9px}.cf7n-q_tab:after{content:\"\";background:0 0;border-radius:2px;height:2px;position:absolute;bottom:-1px;left:0;right:0}.cf7n-q_tab:hover{color:var(--dsw-alias-label-secondary)}.cf7n-q_tab[aria-selected=true]{color:var(--dsw-alias-state-business-primary)}.cf7n-q_tab[aria-selected=true]:after{background:var(--dsw-alias-state-business-primary)}.cf7n-q_tab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.cf7n-q_actions{flex:none;align-items:center;gap:2px;margin-right:-8px;display:flex}@media (prefers-reduced-motion:reduce){.cf7n-q_tab{transition:none}}";
		const tag$15 = "@agent-stash/dsh-skill-scout/detail-tabs.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$15)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$15;
			style.textContent = css$15;
			document.head.appendChild(style);
		}
		var detail_tabs_module_css_default = {
			"actions": "cf7n-q_actions",
			"bar": "cf7n-q_bar",
			"tab": "cf7n-q_tab",
			"tabs": "cf7n-q_tabs"
		};
		//#endregion
		//#region src/client/ui/detail-tabs.tsx
		function DetailTabs({ size, items, value, onChange, label, idBase, actions }) {
			/** 左右键在 Tab 之间移动并选中，Home、End 到两端。 */
			const onKeyDown = (event, index) => {
				const target = event.key === "ArrowRight" ? (index + 1) % items.length : event.key === "ArrowLeft" ? (index + items.length - 1) % items.length : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
				const next = target === null ? void 0 : items[target];
				if (next === void 0) return;
				event.preventDefault();
				onChange(next.value);
				document.getElementById(`${idBase}-${next.value}`)?.focus();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: detail_tabs_module_css_default.bar,
				"data-size": size,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: detail_tabs_module_css_default.tabs,
					role: "tablist",
					"aria-label": label,
					children: items.map((item, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						id: `${idBase}-${item.value}`,
						type: "button",
						role: "tab",
						className: detail_tabs_module_css_default.tab,
						"aria-selected": item.value === value,
						"aria-controls": `${idBase}-panel`,
						tabIndex: item.value === value ? 0 : -1,
						onClick: () => onChange(item.value),
						onKeyDown: (event) => onKeyDown(event, index),
						children: item.label
					}, item.value))
				}), actions !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: detail_tabs_module_css_default.actions,
					children: actions
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/pager.module.css.mjs
		const css$14 = ".J4aKSq_pager{flex-shrink:0;align-items:center;gap:6px;display:flex}.J4aKSq_position{border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xs-strong-13);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);white-space:nowrap;word-spacing:-2px;cursor:pointer;transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;padding:0 4px}.J4aKSq_position:hover,.J4aKSq_position[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}.J4aKSq_position:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.J4aKSq_entry{align-items:baseline;gap:8px;min-width:0;display:flex}.J4aKSq_entryTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.J4aKSq_entryWord{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);flex:none}@media (prefers-reduced-motion:reduce){.J4aKSq_position{transition:none}}";
		const tag$14 = "@agent-stash/dsh-skill-scout/pager.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$14)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$14;
			style.textContent = css$14;
			document.head.appendChild(style);
		}
		var pager_module_css_default = {
			"entry": "J4aKSq_entry",
			"entryTitle": "J4aKSq_entryTitle",
			"entryWord": "J4aKSq_entryWord",
			"pager": "J4aKSq_pager",
			"position": "J4aKSq_position"
		};
		//#endregion
		//#region src/client/ui/pager.tsx
		/**
		* 同一来源的一组条目之间的分页器（design 4.5）：照宿主 QuestionComposer 的 `.pager`，两个 24px 圆形按钮夹着
		* 「n / m」；点位置标签打开 `Menu`，每一行以状态点为图标，当前条目打勾。只有两个及以上条目时显示。
		*/
		function Pager({ entries, current, onSelect, labels }) {
			const [open, setOpen] = (0, react.useState)(false);
			if (entries.length < 2) return null;
			const index = Math.max(0, entries.findIndex((entry) => entry.id === current));
			const go = (target) => {
				const entry = entries[target];
				if (entry !== void 0) onSelect(entry.id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: pager_module_css_default.pager,
				role: "group",
				"aria-label": labels.group,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						size: 24,
						label: labels.previous,
						disabled: index === 0,
						onClick: () => go(index - 1),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 14 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open,
						onClose: () => setOpen(false),
						align: "end",
						portal: true,
						autoFocus: true,
						selection: "check",
						selectedId: current,
						items: entries.map((entry) => ({
							id: entry.id,
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: entry.dot }),
							label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: pager_module_css_default.entry,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: pager_module_css_default.entryTitle,
									children: entry.title
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: pager_module_css_default.entryWord,
									children: entry.word
								})]
							})
						})),
						onSelect: (id) => {
							setOpen(false);
							onSelect(id);
						},
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: pager_module_css_default.position,
							"aria-label": labels.position(index + 1, entries.length),
							"aria-haspopup": "menu",
							"aria-expanded": open,
							onClick: () => setOpen(!open),
							children: [
								index + 1,
								" / ",
								entries.length
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						size: 24,
						label: labels.next,
						disabled: index === entries.length - 1,
						onClick: () => go(index + 1),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 })
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/skeleton.module.css.mjs
		const css$13 = ".T6COkW_fill{border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-skeleton);flex:none;max-width:100%;animation:2s cubic-bezier(.36,0,.64,1) infinite T6COkW_scout-skeleton;display:block}.T6COkW_fill[data-shape=block]{border-radius:var(--dsw-radius-md)}@keyframes T6COkW_scout-skeleton{0%{opacity:1}40%{opacity:.6}80%,to{opacity:1}}@media (prefers-reduced-motion:reduce){.T6COkW_fill{animation:none}}.T6COkW_rows{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.T6COkW_row{grid-template-columns:16px minmax(0,1fr);column-gap:8px;padding:8px;display:grid}.T6COkW_marker{border-radius:50%;place-self:center}.T6COkW_lines{font:var(--dsw-font-xs-13);flex-direction:column;gap:2px;display:flex}.T6COkW_line{align-items:center;height:1lh;display:flex}";
		const tag$13 = "@agent-stash/dsh-skill-scout/skeleton.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$13)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$13;
			style.textContent = css$13;
			document.head.appendChild(style);
		}
		var skeleton_module_css_default = {
			"fill": "T6COkW_fill",
			"line": "T6COkW_line",
			"lines": "T6COkW_lines",
			"marker": "T6COkW_marker",
			"row": "T6COkW_row",
			"rows": "T6COkW_rows",
			"scout-skeleton": "T6COkW_scout-skeleton"
		};
		//#endregion
		//#region src/client/ui/skeleton.tsx
		/** 一块占位；屏幕阅读器跳过它，加载状态由外层的 `aria-busy` 或状态文字说明。 */
		function Skeleton({ width, height, shape = "bar", className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: className === void 0 ? skeleton_module_css_default.fill : `${skeleton_module_css_default.fill} ${className}`,
				"data-shape": shape,
				"data-skeleton": "",
				"aria-hidden": "true",
				style: {
					width: typeof width === "number" ? `${String(width)}px` : width ?? "100%",
					height: `${String(height ?? 12)}px`
				}
			});
		}
		/** 列表首次加载：几行与列表行同样排版的占位（标记列、标题、一行元信息）。 */
		function SkeletonRows({ count = 3 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: skeleton_module_css_default.rows,
				"aria-hidden": "true",
				children: Array.from({ length: count }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: skeleton_module_css_default.row,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, {
						width: 10,
						height: 10,
						className: skeleton_module_css_default.marker
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: skeleton_module_css_default.lines,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: skeleton_module_css_default.line,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, { width: index % 2 === 0 ? "min(240px, 70%)" : "min(180px, 55%)" })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: skeleton_module_css_default.line,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, { width: "min(140px, 40%)" })
						})]
					})]
				}, index))
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/split-button.module.css.mjs
		const css$12 = ".mYuvvq_split{flex:none;align-items:stretch;display:inline-flex}.mYuvvq_primary,.mYuvvq_more{border-radius:var(--dsw-radius-md);height:32px;font:var(--dsw-font-xxs-12)}.mYuvvq_primary{border-top-right-radius:0;border-bottom-right-radius:0;gap:6px;padding:0 12px}.mYuvvq_primary[aria-disabled=true]{opacity:.4;cursor:default}.mYuvvq_more{border-left:.5px solid color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);border-top-left-radius:0;border-bottom-left-radius:0;width:32px;padding:0}";
		const tag$12 = "@agent-stash/dsh-skill-scout/split-button.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$12)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$12;
			style.textContent = css$12;
			document.head.appendChild(style);
		}
		var split_button_module_css_default = {
			"more": "mYuvvq_more",
			"primary": "mYuvvq_primary",
			"split": "mYuvvq_split"
		};
		//#endregion
		//#region src/client/ui/split-button.tsx
		/**
		* 带目标选择的主按钮（design 4.4）：照宿主插件页的 `.addGroup`、`.addPrimary`、`.addMore`，
		* 32px 的主按钮写明当前目标，右侧 32px 的箭头按钮打开靠右对齐的 `Menu`，当前目标打勾。
		*/
		function SplitButton({ label, busyLabel, busy, disabled, unavailable, onClick, choices, selected, onChoose, labels }) {
			const [open, setOpen] = (0, react.useState)(false);
			const blocked = unavailable !== null && unavailable !== void 0;
			const primary = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				size: "sm",
				className: split_button_module_css_default.primary,
				disabled: disabled || busy,
				"aria-disabled": blocked || void 0,
				onClick: () => {
					if (!blocked) onClick();
				},
				children: [busy && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
					state: "ongoing",
					size: 12
				}), busy ? busyLabel : label]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: split_button_module_css_default.split,
				role: "group",
				"aria-label": labels.group,
				children: [blocked ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: unavailable,
					side: "bottom",
					children: primary
				}) : primary, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open,
					onClose: () => setOpen(false),
					align: "end",
					portal: true,
					autoFocus: true,
					selection: "check",
					selectedId: selected,
					items: choices.map((choice) => ({
						id: choice.id,
						label: choice.label
					})),
					onSelect: (id) => {
						setOpen(false);
						const choice = choices.find((entry) => entry.id === id);
						if (choice !== void 0) onChoose(choice.id);
					},
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						size: "sm",
						className: split_button_module_css_default.more,
						disabled: disabled || busy,
						"aria-label": labels.choose,
						"aria-haspopup": "menu",
						"aria-expanded": open,
						onClick: () => setOpen(!open),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 })
					})
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/steps.module.css.mjs
		const css$11 = ".jtIVSq_root{flex-direction:column;gap:6px;min-width:0;display:flex;container-type:inline-size}.jtIVSq_steps{font:var(--dsw-font-xxs-12);align-items:center;margin:0;padding:0;list-style:none;display:flex}.jtIVSq_step{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:6px;display:inline-flex}.jtIVSq_step[data-state=done]{color:var(--dsw-alias-label-secondary)}.jtIVSq_step[data-current]{font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-primary)}.jtIVSq_step[data-state=closed]{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}.jtIVSq_line{background:var(--dsw-alias-border-l3);flex:none;width:12px;height:1px;margin:0 8px}.jtIVSq_label{white-space:nowrap}.jtIVSq_next{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0}.jtIVSq_next[data-failed]{color:var(--dsw-alias-state-error-primary)}@container (width<=360px){.jtIVSq_step:not([data-current]) .jtIVSq_label{display:none}}";
		const tag$11 = "@agent-stash/dsh-skill-scout/steps.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$11)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$11;
			style.textContent = css$11;
			document.head.appendChild(style);
		}
		var steps_module_css_default = {
			"label": "jtIVSq_label",
			"line": "jtIVSq_line",
			"next": "jtIVSq_next",
			"root": "jtIVSq_root",
			"step": "jtIVSq_step",
			"steps": "jtIVSq_steps"
		};
		//#endregion
		//#region src/client/ui/steps.tsx
		/**
		* 生命周期步骤条（design 4.6）：每一步是 16px 的步骤状态点加名称，步骤之间是一段 12px 的细线；
		* 下方一行说明下一步。窄于 360px 时只显示当前一步的名称，每一步的名称与状态写在 `aria-label` 里。
		*/
		function Steps({ steps, label, closed = false, next, failed = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: steps_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
					className: steps_module_css_default.steps,
					"aria-label": label,
					"data-closed": closed || void 0,
					children: steps.map((step, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [index > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
						className: steps_module_css_default.line,
						"aria-hidden": "true"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: steps_module_css_default.step,
						"data-state": closed ? "closed" : step.state,
						"data-current": step.current || void 0,
						"aria-label": `${step.label}: ${step.word}`,
						"aria-current": step.current ? "step" : void 0,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
							state: closed ? "idle" : step.state,
							appearance: "step",
							size: 16
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: steps_module_css_default.label,
							"aria-hidden": "true",
							children: step.label
						})]
					})] }, step.id))
				}), next !== void 0 && next !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: steps_module_css_default.next,
					"data-failed": failed || void 0,
					role: failed ? "alert" : void 0,
					children: next
				})]
			});
		}
		//#endregion
		//#region src/client/detail.tsx
		/**
		* 一条建议的详情面板，嵌在会话视图与「历史回溯提炼」页的详情栏（design 3.6）：
		* 固定的标题区（标题、来源标签、元信息、同一线索的分页器、生命周期步骤与下一步说明）、内容 Tab 条
		* （摘要、Skill、改动、证据，尾部是作用于当前 Tab 的图标按钮）、唯一滚动的正文，以及固定的底部操作栏。
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
		const OUTCOMES$1 = /* @__PURE__ */ new Set([
			"verified",
			"succeeded",
			"unverified",
			"disputed",
			"failed",
			"aborted"
		]);
		function isOutcome(outcome) {
			return OUTCOMES$1.has(outcome);
		}
		/** 一次操作的状态点：失败为错误，通过检查或修复后通过为完成，其余为空闲。 */
		function opDot(op) {
			if (!op.ok) return "error";
			return op.role === "verify" || op.role === "recovered" ? "done" : "idle";
		}
		/** 证据里的一个任务：请求、结果与时间，以及按顺序列出的全部操作。 */
		function Episode({ episode, now, openSession, t }) {
			const status = isOutcome(episode.outcome) ? taskStatus(t, episode.outcome) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: detail_module_css_default.episode,
				"aria-label": episode.goal,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.episodeHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.marker,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status?.dot ?? "idle" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.episodeText,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
									className: detail_module_css_default.episodeGoal,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.ref,
										children: episode.ref
									}), episode.goal]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: detail_module_css_default.meta,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: detail_module_css_default.metaItem,
											"data-ink": status?.ink ?? "tertiary",
											children: status?.word ?? episode.outcome
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
											className: detail_module_css_default.metaItem,
											title: absolute(episode.at),
											children: ago(t, episode.at, now)
										}),
										episode.cwd !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: detail_module_css_default.metaItem,
											"data-fill": "",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.PathLabel, { path: episode.cwd })
										})
									]
								})]
							}),
							openSession !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
								size: 24,
								label: t("detail.openSession"),
								onClick: () => openSession(episode.sessionId),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: detail_module_css_default.ops,
						"aria-label": t("evidence.list", { ref: episode.ref }),
						children: episode.ops.map((op) => {
							const notes = [
								...op.role === null ? [] : [t(ROLE_KEYS[op.role])],
								...op.cited ? [t("role.cited")] : [],
								...op.exit !== null && op.exit !== 0 ? [t("evidence.exit", { code: op.exit })] : []
							];
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: detail_module_css_default.op,
								"data-ok": op.ok,
								"data-cited": op.cited || void 0,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.marker,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: opDot(op) })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: detail_module_css_default.opBody,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												className: detail_module_css_default.opLabel,
												"data-kind": op.kind,
												children: op.label
											}),
											notes.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: detail_module_css_default.meta,
												children: notes.map((note) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: detail_module_css_default.metaItem,
													children: note
												}, note))
											}),
											op.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
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
							}, op.ref);
						})
					}),
					episode.reads > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.note,
						children: t(episode.reads === 1 ? "evidence.reads.one" : "evidence.reads.other", { count: episode.reads })
					}),
					keyed(episode.steering).map(({ key, text }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: detail_module_css_default.quote,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: detail_module_css_default.label,
							children: t("evidence.steering")
						}), text]
					}, key)),
					episode.followup !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: detail_module_css_default.quote,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: detail_module_css_default.label,
							children: t("evidence.followup")
						}), episode.followup]
					})
				]
			});
		}
		function FieldsEditor({ fields, onChange, t }) {
			const id = (0, react.useId)();
			const field = (key, rows, mono = false) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: detail_module_css_default.field,
				htmlFor: `${id}-${key}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: detail_module_css_default.label,
					children: t(`skill.${key}`)
				}), rows === 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: `${id}-${key}`,
					className: `${detail_module_css_default.input} ${detail_module_css_default.mono}`,
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
		/** 比较标题时忽略大小写、空白与连字符。 */
		function normalized(text) {
			return text.trim().toLowerCase().replaceAll(/[\s_-]+/gu, " ");
		}
		/**
		* 去掉正文开头与面板标题或 Skill 名称重复的一、二级标题。
		* @internal 导出供测试使用。
		*/
		function withoutTitle(body, titles) {
			const match = /^\s*#{1,2}[ \t]+([^\n]+?)[ \t#]*(?:\n|$)/u.exec(body);
			if (match === null) return body;
			const heading = normalized(match[1] ?? "");
			return titles.some((title) => normalized(title) === heading) ? body.slice(match[0].length).trimStart() : body;
		}
		function line(text) {
			return {
				text,
				failed: false
			};
		}
		function block(label, children) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: detail_module_css_default.block,
				"aria-label": label,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: detail_module_css_default.label,
					children: label
				}), children]
			});
		}
		/** 详情面板；换一张卡片时编辑、预览与页签都重新开始。 */
		function DetailPanel(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Detail, { ...props }, props.item.id);
		}
		/** 按收件箱里的工作状态（两个阶段的模型、默认保存位置）显示一张卡片的详情。 */
		function ItemDetail({ face, view, item, t, onSelect, size, onBack }) {
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
				onSelect,
				size,
				onBack
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
		function Detail({ item, inbox, loadDetail, models, defaultScope, openSession, t, onSelect, size, onBack }) {
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
			const [more, setMore] = (0, react.useState)(false);
			const now = useNow(6e4);
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
			const edited = (create ? fields : section) !== null;
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
				run(similar ? "similar" : "dismiss", {
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
			const reset = () => {
				if (create) setFields(null);
				else setSection(null);
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
			const undo = () => {
				run("undo", {
					action: "undo",
					id
				}, {
					key: "notice.undone",
					params: { skill: item.write?.skill ?? skillName },
					undo: null,
					view: null
				});
			};
			const restore = () => {
				run("restore", {
					action: "restore",
					id
				}, {
					key: "notice.restored",
					params: {},
					undo: null,
					view: null
				});
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
				...(value?.episodes.length ?? 0) > 0 ? [{
					value: "evidence",
					label: t("detail.tab.evidence")
				}] : []
			];
			const autoTab = item.state === "drafting" || item.state === "ready" ? "skill" : "summary";
			const wanted = chosenTab ?? autoTab;
			const activeTab = tabs.some((entry) => entry.value === wanted) ? wanted : "summary";
			const notWritable = !(preview?.status === "ready" && preview.value.kind === "improve" && !preview.value.writable) ? null : t("skill.notWritable", { skill: skillName });
			/**
			* 步骤条下面一行（design 4.6），每种状态都有：能操作时以底栏主操作的动词开头，
			* 运行中写这一步会产出什么，失败时写原因。
			*/
			const nextStep = () => {
				const { state } = item;
				if (state === "failed") return {
					text: item.failure === null ? t(draftFailed ? "state.draftFailed" : "state.failed") : t(draftFailed ? "detail.failed.draft" : "detail.failed.summary", { kind: t(`failure.${item.failure.kind}`) }),
					failed: true
				};
				if (state === "detected" || state === "skipped") {
					if (models.summary === null) return line(t("detail.noSummaryModel"));
					return line(t(state === "detected" ? "detail.next.summarize" : "detail.next.resummarize", { model: models.summary }));
				}
				if (state === "summarizing") return line(t("detail.next.summarizing"));
				if (state === "proposed") return line(models.draft === null ? t("detail.noDraftModel") : t("detail.next.draft", { model: models.draft }));
				if (state === "drafting") return line(create ? t("detail.next.drafting") : t("detail.next.draftingImprove", { skill: skillName }));
				if (state === "ready") return line(create ? t("detail.next.save") : t("detail.next.improve", { skill: skillName }));
				if (state === "dismissed") return line(t("detail.next.restore"));
				if (item.write === null) return line(t("written.unknown"));
				return line(`${t("written.path", { path: item.write.path })} · ${item.write.discovered ? t("written.discovered") : item.write.checking ? t("written.checking") : t("written.missing")}`);
			};
			/** 规则匹配到的步骤，原来的写法，按顺序列出。 */
			const steps = () => item.steps.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: detail_module_css_default.block,
				"aria-label": t("detail.steps"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: detail_module_css_default.label,
					children: t("detail.steps")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
					className: detail_module_css_default.sequence,
					children: keyed(item.steps).map(({ key, text }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: text }) }, key))
				})]
			});
			/** 失败时模型或 Host 给出的原始说明。 */
			const failureDetail = (stage) => item.state === "failed" && item.failure?.stage === stage && item.failure.message !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: detail_module_css_default.block,
				"aria-label": t("detail.failureDetail"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: detail_module_css_default.label,
					children: t("detail.failureDetail")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.failureDetail,
					children: item.failure.message
				})]
			}) : null;
			/** 摘要里的方案：发现了什么、Skill 做什么、何时使用、将要新建或改进哪个 Skill 与提纲、风险、验证方式。 */
			const plan = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				item.found !== null && block(t("detail.found"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.prose,
					children: item.found
				})),
				item.description !== null && block(t("detail.description"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.prose,
					children: item.description
				})),
				item.trigger !== null && block(t("detail.trigger"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.prose,
					children: item.trigger
				})),
				block(t("detail.plan"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: detail_module_css_default.prose,
					children: [
						t(create ? "detail.plan.create" : "detail.plan.improve"),
						" ",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
							className: detail_module_css_default.code,
							children: skillName
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
					className: detail_module_css_default.outline,
					children: keyed(item.outline).map(({ key, text }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: text }, key))
				})] })),
				item.risks.length > 0 && block(t("detail.risks"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: detail_module_css_default.outline,
					children: keyed(item.risks).map(({ key, text }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: text }, key))
				})),
				item.verification !== null && block(t("detail.verification"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.prose,
					children: item.verification
				}))
			] });
			const summaryTab = () => {
				if (item.state === "summarizing") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Working, {
					stage: "summary",
					progress: item.progress,
					model: models.summary,
					t
				}), steps()] });
				if (proposal) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					failureDetail("draft"),
					plan(),
					awaitingConsent && models.draft !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.note,
						children: t("detail.consent", { model: models.draft })
					})
				] });
				if (item.decision === "skip") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.prose,
						children: t("detail.skipped")
					}),
					item.reason !== null && block(t("detail.reason"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.prose,
						children: item.reason
					})),
					steps()
				] });
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					failureDetail("summary"),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.prose,
						children: t("detail.local")
					}),
					item.state !== "written" && item.state !== "dismissed" && models.summary !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: detail_module_css_default.note,
						children: t(item.sessions.length === 1 ? "detail.summaryNote.one" : "detail.summaryNote.other", {
							count: item.sessions.length,
							model: models.summary
						})
					}),
					steps()
				] });
			};
			const evidence = () => value?.episodes.map((episode) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Episode, {
				episode,
				now,
				openSession,
				t
			}, episode.episodeId));
			const cautions = () => item.cautions.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LimitNotice, { text: t("detail.cautions", { list: item.cautions.map((caution) => {
				const key = `caution.${caution}`;
				return isCaution(key) ? t(key) : caution;
			}).join(t("list.separator")) }) });
			const skill = () => {
				if (item.state === "drafting") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Working, {
					stage: "draft",
					progress: item.progress,
					model: models.draft,
					t
				});
				if (create && draft !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [cautions(), editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldsEditor, {
					fields: draft,
					onChange: setFields,
					t
				}), invalid && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.failure,
					role: "alert",
					children: t("skill.invalid")
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
					className: detail_module_css_default.fields,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("skill.name") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
							className: detail_module_css_default.code,
							children: draft.name
						}) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("skill.description") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: draft.description }),
						draft.whenToUse !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("skill.whenToUse") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: draft.whenToUse })] })
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: detail_module_css_default.document,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
						text: withoutTitle(draft.body, [titleOf(item), draft.name]),
						labels: labels.markdown
					})
				})] })] });
				if (improve && shownSection !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					notWritable !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LimitNotice, { text: notWritable }),
					cautions(),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: detail_module_css_default.label,
						children: t("skill.section", { skill: skillName })
					}),
					editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: `${detail_module_css_default.input} ${detail_module_css_default.mono}`,
						"aria-label": t("skill.section", { skill: skillName }),
						rows: 12,
						value: shownSection,
						onChange: (event) => setSection(event.target.value)
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: detail_module_css_default.document,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
							text: withoutTitle(shownSection, [titleOf(item)]),
							labels: labels.markdown
						})
					})
				] });
				return null;
			};
			const changes = () => {
				if (preview === null || preview.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: detail_module_css_default.note,
					role: "status",
					children: t("changes.loading")
				});
				if (preview.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorNotice, { text: t("changes.error", { error: preview.error }) });
				const file = preview.value;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [file.kind === "create" && file.exists && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LimitNotice, { text: t("changes.exists") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DiffBlock, {
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
				})] });
			};
			/** 底栏右侧的主操作：随阶段从生成摘要、同意生成草稿到保存；失败时是重试。 */
			const primary = () => {
				if (item.state === "summarizing" || item.state === "drafting") {
					const label = stateLabel(t, item);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
						variant: "primary",
						label,
						busyLabel: label,
						busy: true,
						onClick: item.state === "summarizing" ? summarize : generate
					});
				}
				if (awaitingConsent) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
					variant: "primary",
					label: draftFailed ? t("action.retry") : create ? t("detail.draft.create") : t("detail.draft.improve"),
					busyLabel: t("state.drafting"),
					busy: busy === "draft",
					disabled: busy !== null,
					unavailable: models.draft === null ? t("detail.noDraftModel") : null,
					onClick: generate
				});
				if (item.state === "ready") {
					const blocked = invalid ? t("skill.invalid") : notWritable;
					if (create) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SplitButton, {
						label: t(scope === "project" ? "action.save.project" : "action.save.user"),
						busyLabel: t("action.saving"),
						busy: busy === "save",
						disabled: busy !== null,
						unavailable: blocked,
						onClick: () => void save(),
						choices: [{
							id: "project",
							label: t("scope.project")
						}, {
							id: "user",
							label: t("scope.user")
						}],
						selected: scope,
						onChoose: setScope,
						labels: {
							group: t("scope.label"),
							choose: t("scope.choose")
						}
					});
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
						variant: "primary",
						label: t("action.improve", { skill: skillName }),
						busyLabel: t("action.saving"),
						busy: busy === "save",
						disabled: busy !== null,
						unavailable: blocked,
						onClick: () => void save()
					});
				}
				const failed = item.state === "failed";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
					variant: item.decision === "skip" ? "outline" : "primary",
					label: failed ? t("action.retry") : item.decision === "skip" ? t("detail.resummarize") : t("detail.summarize"),
					busyLabel: t("state.summarizing"),
					busy: busy === "summarize",
					disabled: busy !== null,
					unavailable: models.summary === null ? t("detail.noSummaryModel") : null,
					onClick: summarize
				});
			};
			/** 底栏左侧的溢出菜单：忽略类似建议、放弃编辑。 */
			const overflow = () => {
				const entries = [{
					id: "similar",
					label: t("action.dismissSimilar")
				}, ...edited ? [{
					id: "reset",
					label: t("skill.reset"),
					danger: true
				}] : []];
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open: more,
					onClose: () => setMore(false),
					align: "start",
					side: "top",
					portal: true,
					autoFocus: true,
					items: entries,
					onSelect: (entry) => {
						setMore(false);
						if (entry === "similar") dismiss(true);
						if (entry === "reset") reset();
					},
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						label: t("action.more"),
						haspopup: "menu",
						expanded: more,
						disabled: busy !== null,
						onClick: () => setMore(!more),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, { size: 14 })
					})
				});
			};
			const footer = () => {
				if (item.state === "written" || item.state === "dismissed") {
					const written = item.state === "written";
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: detail_module_css_default.spacer }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
						variant: "outline",
						label: t(written ? "action.undo" : "action.restore"),
						busyLabel: t(written ? "action.undoing" : "action.restoring"),
						busy: busy === (written ? "undo" : "restore"),
						disabled: busy !== null,
						onClick: written ? undo : restore
					})] });
				}
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
						variant: "ghost",
						label: t("action.dismiss"),
						busyLabel: t("action.dismissing"),
						busy: busy === "dismiss" || busy === "similar",
						disabled: busy !== null,
						onClick: () => dismiss(false)
					}),
					overflow(),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: detail_module_css_default.spacer }),
					primary()
				] });
			};
			/** Skill Tab 尾部的图标按钮：编辑开关与按同一份摘要重新生成。 */
			const tabActions = activeTab === "skill" && item.state === "ready" && drafted ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
				label: t("skill.edit"),
				pressed: editing,
				onClick: () => setEditing(!editing),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 14 })
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
				label: t("detail.redraft"),
				disabled: busy !== null,
				unavailable: models.draft === null ? t("detail.noDraftModel") : null,
				onClick: generate,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 })
			})] }) : void 0;
			const title = titleOf(item);
			const lifecycle = lifecycleOf(t, item);
			const next = nextStep();
			const model = value?.draftCall != null ? t("detail.draftedBy", { model: value.draftCall.model }) : value?.summary != null ? t("detail.summarizedBy", { model: value.summary.model }) : null;
			const metadata = [
				counted(t, "meta.sessions", item.occurrences),
				...item.merged > 0 ? [t("meta.merged", { count: item.merged })] : [],
				...model === null ? [] : [model]
			];
			const siblings = value?.siblings ?? [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: detail_module_css_default.detail,
				"data-size": size,
				"data-state": item.state,
				"aria-label": title,
				"aria-busy": busy !== null || void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: detail_module_css_default.header,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.titleRow,
								children: [
									onBack !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.back,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
											label: t("detail.back"),
											onClick: onBack,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 14 })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: detail_module_css_default.heading,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
											className: detail_module_css_default.title,
											children: title
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
											tone: "outline",
											className: detail_module_css_default.kind,
											children: t(`kind.${item.kind}`)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pager, {
										entries: siblings.map((sibling) => {
											const shown = siblingStatus(t, sibling.state, sibling.id === id ? item : null);
											return {
												id: sibling.id,
												title: sibling.title,
												dot: shown.dot,
												word: shown.word
											};
										}),
										current: id,
										onSelect,
										labels: {
											group: t("detail.siblings"),
											previous: t("pager.previous"),
											next: t("pager.next"),
											position: (index, total) => t("pager.position", {
												index,
												total
											})
										}
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: detail_module_css_default.meta,
								children: [metadata.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: detail_module_css_default.metaItem,
									children: entry
								}, entry)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
									className: detail_module_css_default.metaItem,
									title: absolute(item.updatedAt),
									children: ago(t, item.updatedAt, now)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: detail_module_css_default.steps,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Steps, {
									label: t("step.label"),
									closed: lifecycle.closed,
									steps: lifecycle.steps,
									next: next.text,
									failed: next.failed
								})
							})
						]
					}),
					value !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailTabs, {
						size,
						items: tabs,
						value: activeTab,
						onChange: setChosenTab,
						label: t("detail.tabs"),
						idBase: tabsId,
						actions: tabActions
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.body,
						...value === null ? { "aria-busy": detail.status === "loading" || void 0 } : {
							role: "tabpanel",
							id: `${tabsId}-panel`,
							"aria-labelledby": `${tabsId}-${activeTab}`,
							tabIndex: 0
						},
						children: [
							detail.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.loading,
								role: "status",
								"aria-label": t("detail.loading"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, { width: "min(320px, 80%)" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, { width: "min(440px, 95%)" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, { width: "min(260px, 60%)" })
								]
							}),
							detail.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorNotice, { text: t("detail.error", { error: detail.error }) }),
							value !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.stack,
								"data-tab": activeTab,
								children: [
									activeTab === "summary" && summaryTab(),
									activeTab === "evidence" && evidence(),
									activeTab === "skill" && skill(),
									activeTab === "changes" && changes()
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						className: detail_module_css_default.footer,
						children: [error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: detail_module_css_default.actionError,
							role: "alert",
							children: error
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: detail_module_css_default.actions,
							children: footer()
						})]
					})
				]
			});
		}
		/** 分页器菜单里一个 idea 的状态点与状态词；当前这个用完整的卡片状态，其余只有状态。 */
		function siblingStatus(t, state, current) {
			const status = itemStatus(t, current ?? {
				state,
				failure: null
			});
			return {
				dot: status.dot,
				word: status.word
			};
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/code-line.module.css.mjs
		const css$10 = ".zIOWsq_line{white-space:nowrap;min-width:0;font:var(--dsw-font-xxs-12);font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-secondary);align-items:center;gap:4px;display:flex;overflow:hidden}.zIOWsq_step{text-overflow:ellipsis;min-width:0;font:inherit;overflow:hidden}.zIOWsq_step:first-child{flex:none}.zIOWsq_arrow{color:var(--dsw-alias-label-tertiary);flex:none;display:inline-flex}.zIOWsq_more{color:var(--dsw-alias-label-tertiary);flex:none}.zIOWsq_matches{flex-direction:column;min-width:0;display:flex}.zIOWsq_match{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-xxs-12);font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-secondary);overflow:hidden}";
		const tag$10 = "@agent-stash/dsh-skill-scout/code-line.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$10)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$10;
			style.textContent = css$10;
			document.head.appendChild(style);
		}
		var code_line_module_css_default = {
			"arrow": "zIOWsq_arrow",
			"line": "zIOWsq_line",
			"match": "zIOWsq_match",
			"matches": "zIOWsq_matches",
			"more": "zIOWsq_more",
			"step": "zIOWsq_step"
		};
		//#endregion
		//#region src/client/ui/code-line.tsx
		/**
		* 列表行里的代码行（design 4.10）：命令序列只显示一行（前三步用小箭头连起来，其余写成 +N）；
		* 命中的片段至多两行，每行一条省略号，命中的词用 `<mark>` 标出。
		*/
		/** 一行命令序列；`more` 是其余步数的文案（如「+2」），由调用方翻译。 */
		function CommandSequence({ steps, more, label }) {
			const { shown, more: rest } = sequenceOf(steps);
			if (shown.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: code_line_module_css_default.line,
				"aria-label": label,
				title: steps.join(" → "),
				children: [shown.map((step, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [index > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: code_line_module_css_default.arrow,
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 10 })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
					className: code_line_module_css_default.step,
					children: step
				})] }, `${String(index)}:${step}`)), rest > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: code_line_module_css_default.more,
					children: more(rest)
				})]
			});
		}
		/** 至多两行命中的片段。 */
		function MatchedLines({ lines }) {
			if (lines.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: code_line_module_css_default.matches,
				"data-matches": "",
				children: react.Children.map(lines.slice(0, 2), (line) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
					className: code_line_module_css_default.match,
					children: line
				}))
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/tasks.module.css.mjs
		const css$9 = ".dJ7M_W_pick{width:16px;position:relative}.dJ7M_W_pick>span{clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}";
		const tag$9 = "@agent-stash/dsh-skill-scout/tasks.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$9)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$9;
			style.textContent = css$9;
			document.head.appendChild(style);
		}
		var tasks_module_css_default = { "pick": "dJ7M_W_pick" };
		//#endregion
		//#region src/client/tasks.tsx
		/**
		* 任务（Episode）的一行：会话视图里是建议引用的任务记录，一行命令序列；搜索结果在标记列放勾选框、
		* 标题前放结果状态点，代码行是命中的片段并高亮查询词。元信息以结果开头，后面是时间、数量与工作目录。
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
			const status = taskStatus(t, task.outcome);
			const counts = [
				task.commands > 0 ? counted(t, "task.commands", task.commands) : null,
				task.edits > 0 ? counted(t, "task.edits", task.edits) : null,
				task.recoveries > 0 ? counted(t, "task.recoveries", task.recoveries) : null
			].filter((entry) => entry !== null);
			const sequence = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandSequence, {
				steps: task.steps,
				more: (count) => t("task.more", { count }),
				label: t("task.sequence", { steps: task.steps.join(", ") })
			});
			const dot = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.dot });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListRow, {
				variant: pick === null ? "record" : "select",
				size: pick === null ? "pane" : "page",
				marker: pick === null ? dot : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
					className: tasks_module_css_default.pick,
					label: t("search.pick", { goal: task.goal }),
					checked: pick.checked,
					disabled: pick.disabled,
					onChange: pick.onChange
				}),
				titleDot: pick === null ? void 0 : dot,
				title: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Highlight, {
					text: task.goal,
					terms
				}),
				code: task.matches.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MatchedLines, { lines: task.matches.map((line) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Highlight, {
					text: line,
					terms
				}, line)) }) : sequence,
				status,
				metadata: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
					dateTime: new Date(task.at).toISOString(),
					title: absolute(task.at),
					children: ago(t, task.at, now)
				}, "time"), ...counts],
				metaFill: task.cwd === null ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.PathLabel, { path: task.cwd }),
				selected: pick?.checked ?? false,
				rowData: {
					"data-outcome": task.outcome,
					"data-episode": task.episodeId
				},
				actions: openSession === null ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
					size: 24,
					label: t("detail.openSession"),
					onClick: () => openSession(task.sessionId),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 })
				})
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/empty-state.module.css.mjs
		const css$8 = ".euLnSa_empty{text-align:center;color:var(--dsw-alias-label-tertiary);flex-direction:column;flex:auto;justify-content:center;align-items:center;padding:48px 20px;display:flex}.euLnSa_glyph{color:var(--dsw-alias-label-caption);margin-bottom:12px;display:inline-flex}.euLnSa_text{font:var(--dsw-font-s-14);margin:0}.euLnSa_detail{font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;margin:4px 0 0}.euLnSa_action{margin-top:16px}";
		const tag$8 = "@agent-stash/dsh-skill-scout/empty-state.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$8)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$8;
			style.textContent = css$8;
			document.head.appendChild(style);
		}
		var empty_state_module_css_default = {
			"action": "euLnSa_action",
			"detail": "euLnSa_detail",
			"empty": "euLnSa_empty",
			"glyph": "euLnSa_glyph",
			"text": "euLnSa_text"
		};
		//#endregion
		//#region src/client/ui/empty-state.tsx
		function EmptyState({ glyph, text, detail, action }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: empty_state_module_css_default.empty,
				"data-empty": "",
				children: [
					glyph !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: empty_state_module_css_default.glyph,
						children: glyph
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: empty_state_module_css_default.text,
						children: text
					}),
					detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: empty_state_module_css_default.detail,
						children: detail
					}),
					action !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: empty_state_module_css_default.action,
						children: action
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/search.module.css.mjs
		const css$7 = "._5q2odW_search{flex-direction:column;flex:1;gap:12px;min-width:0;display:flex}._5q2odW_query{flex-wrap:wrap;align-items:center;gap:8px 12px;display:flex}._5q2odW_field{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);min-width:0;height:36px;color:var(--dsw-alias-label-tertiary);transition:border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);border-radius:12px;flex:320px;align-items:center;gap:8px;padding:0 4px 0 10px;display:flex}._5q2odW_field:hover{border-color:var(--dsw-alias-border-l2)}._5q2odW_field:focus-within{border-color:var(--dsw-alias-state-business-primary)}._5q2odW_field>svg{flex:none}._5q2odW_input{min-width:0;height:100%;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);background:0 0;border:0;flex:1;padding:0}._5q2odW_input::placeholder{color:var(--dsw-alias-label-caption)}._5q2odW_input:focus-visible{outline:none}._5q2odW_input::-webkit-search-cancel-button{display:none}._5q2odW_chips{flex-wrap:wrap;align-items:center;gap:4px;display:flex}._5q2odW_chip{height:28px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);white-space:nowrap;cursor:pointer;transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out), color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;border-radius:14px;flex:none;align-items:center;padding:0 10px;display:inline-flex}._5q2odW_chip:hover,._5q2odW_chip[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover)}._5q2odW_chip[aria-pressed=true]{color:var(--dsw-alias-label-primary)}._5q2odW_chip:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}._5q2odW_scope{flex-direction:column;gap:6px;display:flex}._5q2odW_scopeLine{flex-wrap:wrap;align-items:center;gap:4px 12px;display:flex}._5q2odW_scopeText{min-width:0;font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;flex:auto;margin:0;display:flex}._5q2odW_scopeItem+._5q2odW_scopeItem:before{content:\" · \";white-space:pre}._5q2odW_scopeItem[data-ink=error]{color:var(--dsw-alias-state-error-primary)}._5q2odW_scopeActions{flex:none;align-items:center;gap:4px;display:flex}._5q2odW_meter{background:var(--dsw-alias-interactive-bg-hover);border-radius:2px;height:4px;overflow:hidden}._5q2odW_meterFill{background:var(--dsw-alias-state-business-primary);border-radius:2px;height:100%;display:block}._5q2odW_results{flex-direction:column;gap:8px;display:flex}._5q2odW_count{font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);margin:0}._5q2odW_more{border-radius:var(--dsw-radius-md);width:100%;height:32px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);cursor:pointer;transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;justify-content:center;align-items:center;display:flex}._5q2odW_more:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._5q2odW_more:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}._5q2odW_selection{z-index:2;border-top:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-base);align-items:center;gap:8px;margin-top:auto;padding:12px 0;display:flex;position:sticky;bottom:0}._5q2odW_selectionCount{min-width:0;font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);flex-wrap:wrap;flex:1;gap:2px 8px;margin:0;display:flex}._5q2odW_selectionLimit{color:var(--dsw-alias-label-tertiary)}@media (prefers-reduced-motion:reduce){._5q2odW_field,._5q2odW_chip,._5q2odW_more{transition:none}}";
		const tag$7 = "@agent-stash/dsh-skill-scout/search.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$7)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$7;
			style.textContent = css$7;
			document.head.appendChild(style);
		}
		var search_module_css_default = {
			"chip": "_5q2odW_chip",
			"chips": "_5q2odW_chips",
			"count": "_5q2odW_count",
			"field": "_5q2odW_field",
			"input": "_5q2odW_input",
			"meter": "_5q2odW_meter",
			"meterFill": "_5q2odW_meterFill",
			"more": "_5q2odW_more",
			"query": "_5q2odW_query",
			"results": "_5q2odW_results",
			"scope": "_5q2odW_scope",
			"scopeActions": "_5q2odW_scopeActions",
			"scopeItem": "_5q2odW_scopeItem",
			"scopeLine": "_5q2odW_scopeLine",
			"scopeText": "_5q2odW_scopeText",
			"search": "_5q2odW_search",
			"selection": "_5q2odW_selection",
			"selectionCount": "_5q2odW_selectionCount",
			"selectionLimit": "_5q2odW_selectionLimit"
		};
		//#endregion
		//#region src/client/search.tsx
		/**
		* 「历史回溯提炼」页的「搜索」分区（design 3.5）：在插件存的脱敏任务索引里搜索命令、错误行、文件路径、
		* 请求与插话。输入停顿后自动搜索，回车立即搜索；结果按结果筛选，可勾选 1 到 12 个任务交给发现模型提炼，
		* 勾选后底部出现固定的选择栏。索引默认只含已分析的会话，「回溯 90 天」「回溯全部」在后台读入更早的会话。
		*/
		/** 一次读入的任务数；「显示更多」每次再读这么多。 */
		const PAGE = 50;
		/** Host 一次最多返回的任务数。 */
		const MAX_LIMIT = 200;
		/** 输入停顿多久后搜索。 */
		const DEBOUNCE = 250;
		const OUTCOMES = [
			"verified",
			"succeeded",
			"unverified",
			"disputed",
			"failed",
			"aborted"
		];
		/** 索引覆盖的范围，以及回溯更早会话的进度与操作。 */
		function Scope({ face, status, indexed, t }) {
			const { busy, error, run } = useAction(face.inbox, t);
			const backfill = status.backfill;
			const active = backfill !== null && backfill.state !== "done";
			const scope = t("search.scope", {
				sessions: t(indexed.sessions === 1 ? "search.scope.sessions.one" : "search.scope.sessions.other", { count: indexed.sessions }),
				tasks: t(indexed.episodes === 1 ? "search.scope.tasks.one" : "search.scope.tasks.other", { count: indexed.episodes })
			});
			const progress = backfill === null ? null : backfill.state === "listing" ? t("backfill.listing") : backfill.state === "done" ? t(backfill.done === 1 ? "backfill.done.one" : "backfill.done.other", { done: backfill.done }) : t(backfill.state === "paused" ? "backfill.paused" : "backfill.running", {
				done: backfill.done,
				total: backfill.total
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: search_module_css_default.scope,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: search_module_css_default.scopeLine,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: search_module_css_default.scopeText,
							role: "status",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: search_module_css_default.scopeItem,
									children: scope
								}),
								progress !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: search_module_css_default.scopeItem,
									children: progress
								}),
								backfill !== null && backfill.failed > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: search_module_css_default.scopeItem,
									"data-ink": "error",
									children: t("backfill.failed", { count: backfill.failed })
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: search_module_css_default.scopeActions,
							children: active ? backfill.state === "paused" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								disabled: busy,
								onClick: () => void run({
									action: "backfill",
									range: backfill.range
								}),
								children: t("backfill.resume")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								disabled: busy,
								onClick: () => void run({ action: "backfill-pause" }),
								children: t("backfill.pause")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								disabled: busy,
								onClick: () => void run({
									action: "backfill",
									range: "90d"
								}),
								children: t("backfill.90d")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								disabled: busy,
								onClick: () => void run({
									action: "backfill",
									range: "all"
								}),
								children: t("backfill.all")
							})] })
						})]
					}),
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
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorNotice, { text: error })
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
			/** 「显示更多」读到的条数，只对同一组条件有效。 */
			const [more, setMore] = (0, react.useState)({
				key: "",
				limit: PAGE
			});
			const conditions = `${q}\n${nav.outcome ?? ""}`;
			const limit = more.key === conditions ? more.limit : PAGE;
			const [retried, setRetried] = (0, react.useState)(0);
			const result = useLoaded((0, react.useCallback)((_revision, signal) => q === "" ? Promise.resolve(null) : search({
				q,
				outcome: nav.outcome,
				limit
			}, signal), [
				search,
				q,
				nav.outcome,
				limit
			]), `${String(view.status.analyzed.episodes)}:${String(retried)}`);
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
				const lead = sent.leadId ?? null;
				page.update({
					picked: [],
					tab: "suggestions",
					selected: lead,
					reveal: lead
				});
			};
			const full = nav.picked.length >= 12;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: search_module_css_default.search,
				"data-view": "search",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: search_module_css_default.query,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: search_module_css_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 14 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "search",
									className: search_module_css_default.input,
									"aria-label": t("search.label"),
									placeholder: t("search.placeholder"),
									value: nav.query,
									onChange: (event) => page.update({ query: event.target.value }),
									onKeyDown: (event) => {
										if (event.key === "Enter") setSettled(nav.query);
									}
								}),
								nav.query !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
									label: t("search.clearQuery"),
									onClick: () => {
										page.update({ query: "" });
										setSettled("");
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: search_module_css_default.chips,
							role: "group",
							"aria-label": t("search.outcome"),
							children: [null, ...OUTCOMES].map((outcome) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: search_module_css_default.chip,
								"aria-pressed": nav.outcome === outcome,
								onClick: () => page.update({ outcome }),
								children: outcome === null ? t("search.outcome.all") : t(`outcome.${outcome}`)
							}, outcome ?? "all"))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Scope, {
						face,
						status: view.status,
						indexed,
						t
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorNotice, { text: error }),
					result.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorNotice, {
						text: t("search.error", { error: result.error }),
						retry: {
							label: t("panel.retry"),
							onClick: () => setRetried((count) => count + 1)
						}
					}),
					q !== "" && found === null && result.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkeletonRows, {}),
					found !== null && found.hits.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { text: t("search.empty", { query: found.query }) }),
					found !== null && found.hits.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: search_module_css_default.results,
						"aria-label": t("search.results"),
						"aria-busy": result.status === "loading" || void 0,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: search_module_css_default.count,
								role: "status",
								children: found.total > found.hits.length ? t("search.totalShown", {
									total: found.total,
									count: found.hits.length
								}) : t(found.total === 1 ? "search.total.one" : "search.total.other", { total: found.total })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowList, { children: found.hits.map((task) => {
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
							}) }),
							found.total > found.hits.length && limit < MAX_LIMIT && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: search_module_css_default.more,
								onClick: () => setMore({
									key: conditions,
									limit: Math.min(MAX_LIMIT, limit + PAGE)
								}),
								children: t("search.more")
							})
						]
					}),
					nav.picked.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: search_module_css_default.selection,
						role: "region",
						"aria-label": t("search.selection"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: search_module_css_default.selectionCount,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("search.picked", { count: nav.picked.length }) }), full && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: search_module_css_default.selectionLimit,
									children: t("search.limit", { count: 12 })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								disabled: busy,
								onClick: () => page.update({ picked: [] }),
								children: t("search.clear")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
								variant: "primary",
								label: t("search.extract"),
								busyLabel: t("search.extracting"),
								busy,
								unavailable: view.status.models.summary === null ? t("detail.noSummaryModel") : null,
								onClick: () => void extract()
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/ui/charts/format.ts
		const INTEGER = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
		const PERCENT = new Intl.NumberFormat("en", {
			style: "percent",
			maximumFractionDigits: 0
		});
		const SMALL_PERCENT = new Intl.NumberFormat("en", {
			style: "percent",
			maximumFractionDigits: 1
		});
		/** 计数，千位分组：1,234。 */
		function formatNumber(value) {
			return INTEGER.format(value);
		}
		/** 比例（1 为全部）写成百分比：整数，低于 10% 时保留一位小数（0.833 → 83%，0.083 → 8.3%）。 */
		function formatPercent(ratio) {
			return ratio > 0 && ratio < .1 ? SMALL_PERCENT.format(ratio) : PERCENT.format(ratio);
		}
		/** `YYYY-MM-DD` 写成 `{m}/{d}`（10/30）；页面按语言传入自己的日期格式。 */
		function formatDay(day) {
			const [, month = "", date = ""] = day.split("-");
			return `${String(Number(month))}/${String(Number(date))}`;
		}
		//#endregion
		//#region src/client/ui/charts/theme.ts
		/** 着重色：中性图表的第一个系列，也是单系列图表的默认颜色。 */
		const ACCENT_COLOR = "var(--dsw-alias-state-business-primary)";
		/** 同一类别里较早阶段的颜色：原色的 50%。 */
		function half(color) {
			return `color-mix(in srgb, ${color} 50%, transparent)`;
		}
		/** 4.3 的状态类别（统计里没有进行中的类别：进行中的线索与 idea 按请求前的状态计数）。 */
		const STATUS = {
			decision: "var(--dsw-alias-state-warn-primary)",
			failed: "var(--dsw-alias-state-error-primary)",
			done: "var(--dsw-alias-state-success-primary)",
			notStarted: "var(--dsw-alias-state-idle-primary)",
			closed: "var(--dsw-alias-border-l3)"
		};
		/** 结果类别的六档颜色。 */
		const RESULT = {
			strongest: "var(--dsw-alias-state-success-primary)",
			positive: "color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, transparent)",
			unknown: "var(--dsw-alias-state-idle-primary)",
			contested: "var(--dsw-alias-state-warn-primary)",
			negative: "var(--dsw-alias-state-error-primary)",
			cancelled: "var(--dsw-alias-border-l3)"
		};
		/** 会话的分析状态：已分析是完成，分析失败是失败，还没分析是未开始。 */
		const COVERAGE_COLORS = {
			analyzed: STATUS.done,
			failed: STATUS.failed,
			pending: STATUS.notStarted
		};
		/** 任务结果的堆叠顺序，从下往上：通过检查的在底部，取消的在顶部。 */
		const OUTCOME_ORDER = [
			"verified",
			"succeeded",
			"unverified",
			"disputed",
			"failed",
			"aborted"
		];
		/** 任务结果：检查通过最强，成功次之，无法核实未知，用户否定有争议，失败负面，中断取消。 */
		const OUTCOME_COLORS = {
			verified: RESULT.strongest,
			succeeded: RESULT.positive,
			unverified: RESULT.unknown,
			disputed: RESULT.contested,
			failed: RESULT.negative,
			aborted: RESULT.cancelled
		};
		/** 线索状态在占比条里的顺序：完成、未开始、失败、结束（较晚的在前）。 */
		const LEAD_ORDER = [
			"summarized",
			"detected",
			"failed",
			"skipped",
			"dismissed"
		];
		/**
		* 线索的状态：已摘要是完成，等待摘要是未开始，摘要失败是失败；不值得保存与用户忽略都是结束，
		* 用户在摘要前忽略的那一类阶段较早，取 50%。
		*/
		const LEAD_COLORS = {
			summarized: STATUS.done,
			detected: STATUS.notStarted,
			failed: STATUS.failed,
			skipped: STATUS.closed,
			dismissed: half(STATUS.closed)
		};
		/** idea 状态在占比条里的顺序：完成、待决定（较晚的在前）、失败、结束。 */
		const IDEA_ORDER = [
			"written",
			"ready",
			"proposed",
			"failed",
			"dismissed"
		];
		/** idea 的状态：已保存是完成；草稿可保存与等你决定都待决定，阶段较早的后者取 50%；草稿失败是失败，忽略是结束。 */
		const IDEA_COLORS = {
			written: STATUS.done,
			ready: STATUS.decision,
			proposed: half(STATUS.decision),
			failed: STATUS.failed,
			dismissed: STATUS.closed
		};
		/** 用量的堆叠顺序，从下往上。 */
		const USAGE_ORDER = [
			"inputTokens",
			"cacheReadTokens",
			"cacheWriteTokens",
			"outputTokens"
		];
		/** 用量是中性的量：按堆叠顺序取着重色、第三级文字色、着重色 50% 与三级分隔线色。 */
		const USAGE_COLORS = {
			inputTokens: ACCENT_COLOR,
			cacheReadTokens: "var(--dsw-alias-label-tertiary)",
			cacheWriteTokens: half(ACCENT_COLOR),
			outputTokens: "var(--dsw-alias-border-l3)"
		};
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/constant.js
		function constant_default(x) {
			return function constant() {
				return x;
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/math.js
		const abs = Math.abs;
		const atan2 = Math.atan2;
		const cos = Math.cos;
		const max = Math.max;
		const min = Math.min;
		const sin = Math.sin;
		const sqrt = Math.sqrt;
		const pi$1 = Math.PI;
		const halfPi = pi$1 / 2;
		const tau$1 = 2 * pi$1;
		function acos(x) {
			return x > 1 ? 0 : x < -1 ? pi$1 : Math.acos(x);
		}
		function asin(x) {
			return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-path@3.1.0/node_modules/d3-path/src/path.js
		const pi = Math.PI;
		const tau = 2 * pi;
		const epsilon = 1e-6;
		const tauEpsilon = tau - epsilon;
		function append(strings) {
			this._ += strings[0];
			for (let i = 1, n = strings.length; i < n; ++i) this._ += arguments[i] + strings[i];
		}
		function appendRound(digits) {
			let d = Math.floor(digits);
			if (!(d >= 0)) throw new Error(`invalid digits: ${digits}`);
			if (d > 15) return append;
			const k = 10 ** d;
			return function(strings) {
				this._ += strings[0];
				for (let i = 1, n = strings.length; i < n; ++i) this._ += Math.round(arguments[i] * k) / k + strings[i];
			};
		}
		var Path = class {
			constructor(digits) {
				this._x0 = this._y0 = this._x1 = this._y1 = null;
				this._ = "";
				this._append = digits == null ? append : appendRound(digits);
			}
			moveTo(x, y) {
				this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
			}
			closePath() {
				if (this._x1 !== null) {
					this._x1 = this._x0, this._y1 = this._y0;
					this._append`Z`;
				}
			}
			lineTo(x, y) {
				this._append`L${this._x1 = +x},${this._y1 = +y}`;
			}
			quadraticCurveTo(x1, y1, x, y) {
				this._append`Q${+x1},${+y1},${this._x1 = +x},${this._y1 = +y}`;
			}
			bezierCurveTo(x1, y1, x2, y2, x, y) {
				this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x},${this._y1 = +y}`;
			}
			arcTo(x1, y1, x2, y2, r) {
				x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
				if (r < 0) throw new Error(`negative radius: ${r}`);
				let x0 = this._x1, y0 = this._y1, x21 = x2 - x1, y21 = y2 - y1, x01 = x0 - x1, y01 = y0 - y1, l01_2 = x01 * x01 + y01 * y01;
				if (this._x1 === null) this._append`M${this._x1 = x1},${this._y1 = y1}`;
				else if (!(l01_2 > epsilon));
				else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) this._append`L${this._x1 = x1},${this._y1 = y1}`;
				else {
					let x20 = x2 - x0, y20 = y2 - y0, l21_2 = x21 * x21 + y21 * y21, l20_2 = x20 * x20 + y20 * y20, l21 = Math.sqrt(l21_2), l01 = Math.sqrt(l01_2), l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2), t01 = l / l01, t21 = l / l21;
					if (Math.abs(t01 - 1) > epsilon) this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
					this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
				}
			}
			arc(x, y, r, a0, a1, ccw) {
				x = +x, y = +y, r = +r, ccw = !!ccw;
				if (r < 0) throw new Error(`negative radius: ${r}`);
				let dx = r * Math.cos(a0), dy = r * Math.sin(a0), x0 = x + dx, y0 = y + dy, cw = 1 ^ ccw, da = ccw ? a0 - a1 : a1 - a0;
				if (this._x1 === null) this._append`M${x0},${y0}`;
				else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) this._append`L${x0},${y0}`;
				if (!r) return;
				if (da < 0) da = da % tau + tau;
				if (da > tauEpsilon) this._append`A${r},${r},0,1,${cw},${x - dx},${y - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
				else if (da > epsilon) this._append`A${r},${r},0,${+(da >= pi)},${cw},${this._x1 = x + r * Math.cos(a1)},${this._y1 = y + r * Math.sin(a1)}`;
			}
			rect(x, y, w, h) {
				this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${w = +w}v${+h}h${-w}Z`;
			}
			toString() {
				return this._;
			}
		};
		function path() {
			return new Path();
		}
		path.prototype = Path.prototype;
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/path.js
		function withPath(shape) {
			let digits = 3;
			shape.digits = function(_) {
				if (!arguments.length) return digits;
				if (_ == null) digits = null;
				else {
					const d = Math.floor(_);
					if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
					digits = d;
				}
				return shape;
			};
			return () => new Path(digits);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/arc.js
		function arcInnerRadius(d) {
			return d.innerRadius;
		}
		function arcOuterRadius(d) {
			return d.outerRadius;
		}
		function arcStartAngle(d) {
			return d.startAngle;
		}
		function arcEndAngle(d) {
			return d.endAngle;
		}
		function arcPadAngle(d) {
			return d && d.padAngle;
		}
		function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
			var x10 = x1 - x0, y10 = y1 - y0, x32 = x3 - x2, y32 = y3 - y2, t = y32 * x10 - x32 * y10;
			if (t * t < 1e-12) return;
			t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / t;
			return [x0 + t * x10, y0 + t * y10];
		}
		function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
			var x01 = x0 - x1, y01 = y0 - y1, lo = (cw ? rc : -rc) / sqrt(x01 * x01 + y01 * y01), ox = lo * y01, oy = -lo * x01, x11 = x0 + ox, y11 = y0 + oy, x10 = x1 + ox, y10 = y1 + oy, x00 = (x11 + x10) / 2, y00 = (y11 + y10) / 2, dx = x10 - x11, dy = y10 - y11, d2 = dx * dx + dy * dy, r = r1 - rc, D = x11 * y10 - x10 * y11, d = (dy < 0 ? -1 : 1) * sqrt(max(0, r * r * d2 - D * D)), cx0 = (D * dy - dx * d) / d2, cy0 = (-D * dx - dy * d) / d2, cx1 = (D * dy + dx * d) / d2, cy1 = (-D * dx + dy * d) / d2, dx0 = cx0 - x00, dy0 = cy0 - y00, dx1 = cx1 - x00, dy1 = cy1 - y00;
			if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;
			return {
				cx: cx0,
				cy: cy0,
				x01: -ox,
				y01: -oy,
				x11: cx0 * (r1 / r - 1),
				y11: cy0 * (r1 / r - 1)
			};
		}
		function arc_default() {
			var innerRadius = arcInnerRadius, outerRadius = arcOuterRadius, cornerRadius = constant_default(0), padRadius = null, startAngle = arcStartAngle, endAngle = arcEndAngle, padAngle = arcPadAngle, context = null, path = withPath(arc);
			function arc() {
				var buffer, r, r0 = +innerRadius.apply(this, arguments), r1 = +outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) - halfPi, a1 = endAngle.apply(this, arguments) - halfPi, da = abs(a1 - a0), cw = a1 > a0;
				if (!context) context = buffer = path();
				if (r1 < r0) r = r1, r1 = r0, r0 = r;
				if (!(r1 > 1e-12)) context.moveTo(0, 0);
				else if (da > tau$1 - 1e-12) {
					context.moveTo(r1 * cos(a0), r1 * sin(a0));
					context.arc(0, 0, r1, a0, a1, !cw);
					if (r0 > 1e-12) {
						context.moveTo(r0 * cos(a1), r0 * sin(a1));
						context.arc(0, 0, r0, a1, a0, cw);
					}
				} else {
					var a01 = a0, a11 = a1, a00 = a0, a10 = a1, da0 = da, da1 = da, ap = padAngle.apply(this, arguments) / 2, rp = ap > 1e-12 && (padRadius ? +padRadius.apply(this, arguments) : sqrt(r0 * r0 + r1 * r1)), rc = min(abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)), rc0 = rc, rc1 = rc, t0, t1;
					if (rp > 1e-12) {
						var p0 = asin(rp / r0 * sin(ap)), p1 = asin(rp / r1 * sin(ap));
						if ((da0 -= p0 * 2) > 1e-12) p0 *= cw ? 1 : -1, a00 += p0, a10 -= p0;
						else da0 = 0, a00 = a10 = (a0 + a1) / 2;
						if ((da1 -= p1 * 2) > 1e-12) p1 *= cw ? 1 : -1, a01 += p1, a11 -= p1;
						else da1 = 0, a01 = a11 = (a0 + a1) / 2;
					}
					var x01 = r1 * cos(a01), y01 = r1 * sin(a01), x10 = r0 * cos(a10), y10 = r0 * sin(a10);
					if (rc > 1e-12) {
						var x11 = r1 * cos(a11), y11 = r1 * sin(a11), x00 = r0 * cos(a00), y00 = r0 * sin(a00), oc;
						if (da < pi$1) {
							if (oc = intersect(x01, y01, x00, y00, x11, y11, x10, y10)) {
								var ax = x01 - oc[0], ay = y01 - oc[1], bx = x11 - oc[0], by = y11 - oc[1], kc = 1 / sin(acos((ax * bx + ay * by) / (sqrt(ax * ax + ay * ay) * sqrt(bx * bx + by * by))) / 2), lc = sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
								rc0 = min(rc, (r0 - lc) / (kc - 1));
								rc1 = min(rc, (r1 - lc) / (kc + 1));
							} else rc0 = rc1 = 0;
						}
					}
					if (!(da1 > 1e-12)) context.moveTo(x01, y01);
					else if (rc1 > 1e-12) {
						t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
						t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);
						context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);
						if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);
						else {
							context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
							context.arc(0, 0, r1, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
							context.arc(t1.cx, t1.cy, rc1, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
						}
					} else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);
					if (!(r0 > 1e-12) || !(da0 > 1e-12)) context.lineTo(x10, y10);
					else if (rc0 > 1e-12) {
						t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
						t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);
						context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);
						if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);
						else {
							context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
							context.arc(0, 0, r0, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
							context.arc(t1.cx, t1.cy, rc0, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
						}
					} else context.arc(0, 0, r0, a10, a00, cw);
				}
				context.closePath();
				if (buffer) return context = null, buffer + "" || null;
			}
			arc.centroid = function() {
				var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2, a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi$1 / 2;
				return [cos(a) * r, sin(a) * r];
			};
			arc.innerRadius = function(_) {
				return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant_default(+_), arc) : innerRadius;
			};
			arc.outerRadius = function(_) {
				return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant_default(+_), arc) : outerRadius;
			};
			arc.cornerRadius = function(_) {
				return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant_default(+_), arc) : cornerRadius;
			};
			arc.padRadius = function(_) {
				return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant_default(+_), arc) : padRadius;
			};
			arc.startAngle = function(_) {
				return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant_default(+_), arc) : startAngle;
			};
			arc.endAngle = function(_) {
				return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant_default(+_), arc) : endAngle;
			};
			arc.padAngle = function(_) {
				return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant_default(+_), arc) : padAngle;
			};
			arc.context = function(_) {
				return arguments.length ? (context = _ == null ? null : _, arc) : context;
			};
			return arc;
		}
		Array.prototype.slice;
		function array_default(x) {
			return typeof x === "object" && "length" in x ? x : Array.from(x);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/curve/linear.js
		function Linear(context) {
			this._context = context;
		}
		Linear.prototype = {
			areaStart: function() {
				this._line = 0;
			},
			areaEnd: function() {
				this._line = NaN;
			},
			lineStart: function() {
				this._point = 0;
			},
			lineEnd: function() {
				if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
				this._line = 1 - this._line;
			},
			point: function(x, y) {
				x = +x, y = +y;
				switch (this._point) {
					case 0:
						this._point = 1;
						this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
						break;
					case 1: this._point = 2;
					default: this._context.lineTo(x, y);
				}
			}
		};
		function linear_default(context) {
			return new Linear(context);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/point.js
		function x(p) {
			return p[0];
		}
		function y(p) {
			return p[1];
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/line.js
		function line_default(x$1, y$1) {
			var defined = constant_default(true), context = null, curve = linear_default, output = null, path = withPath(line);
			x$1 = typeof x$1 === "function" ? x$1 : x$1 === void 0 ? x : constant_default(x$1);
			y$1 = typeof y$1 === "function" ? y$1 : y$1 === void 0 ? y : constant_default(y$1);
			function line(data) {
				var i, n = (data = array_default(data)).length, d, defined0 = false, buffer;
				if (context == null) output = curve(buffer = path());
				for (i = 0; i <= n; ++i) {
					if (!(i < n && defined(d = data[i], i, data)) === defined0) {
						if (defined0 = !defined0) output.lineStart();
						else output.lineEnd();
					}
					if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
				}
				if (buffer) return output = null, buffer + "" || null;
			}
			line.x = function(_) {
				return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant_default(+_), line) : x$1;
			};
			line.y = function(_) {
				return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant_default(+_), line) : y$1;
			};
			line.defined = function(_) {
				return arguments.length ? (defined = typeof _ === "function" ? _ : constant_default(!!_), line) : defined;
			};
			line.curve = function(_) {
				return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
			};
			line.context = function(_) {
				return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
			};
			return line;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/area.js
		function area_default(x0, y0, y1) {
			var x1 = null, defined = constant_default(true), context = null, curve = linear_default, output = null, path = withPath(area);
			x0 = typeof x0 === "function" ? x0 : x0 === void 0 ? x : constant_default(+x0);
			y0 = typeof y0 === "function" ? y0 : y0 === void 0 ? constant_default(0) : constant_default(+y0);
			y1 = typeof y1 === "function" ? y1 : y1 === void 0 ? y : constant_default(+y1);
			function area(data) {
				var i, j, k, n = (data = array_default(data)).length, d, defined0 = false, buffer, x0z = new Array(n), y0z = new Array(n);
				if (context == null) output = curve(buffer = path());
				for (i = 0; i <= n; ++i) {
					if (!(i < n && defined(d = data[i], i, data)) === defined0) {
						if (defined0 = !defined0) {
							j = i;
							output.areaStart();
							output.lineStart();
						} else {
							output.lineEnd();
							output.lineStart();
							for (k = i - 1; k >= j; --k) output.point(x0z[k], y0z[k]);
							output.lineEnd();
							output.areaEnd();
						}
					}
					if (defined0) {
						x0z[i] = +x0(d, i, data), y0z[i] = +y0(d, i, data);
						output.point(x1 ? +x1(d, i, data) : x0z[i], y1 ? +y1(d, i, data) : y0z[i]);
					}
				}
				if (buffer) return output = null, buffer + "" || null;
			}
			function arealine() {
				return line_default().defined(defined).curve(curve).context(context);
			}
			area.x = function(_) {
				return arguments.length ? (x0 = typeof _ === "function" ? _ : constant_default(+_), x1 = null, area) : x0;
			};
			area.x0 = function(_) {
				return arguments.length ? (x0 = typeof _ === "function" ? _ : constant_default(+_), area) : x0;
			};
			area.x1 = function(_) {
				return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant_default(+_), area) : x1;
			};
			area.y = function(_) {
				return arguments.length ? (y0 = typeof _ === "function" ? _ : constant_default(+_), y1 = null, area) : y0;
			};
			area.y0 = function(_) {
				return arguments.length ? (y0 = typeof _ === "function" ? _ : constant_default(+_), area) : y0;
			};
			area.y1 = function(_) {
				return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant_default(+_), area) : y1;
			};
			area.lineX0 = area.lineY0 = function() {
				return arealine().x(x0).y(y0);
			};
			area.lineY1 = function() {
				return arealine().x(x0).y(y1);
			};
			area.lineX1 = function() {
				return arealine().x(x1).y(y0);
			};
			area.defined = function(_) {
				return arguments.length ? (defined = typeof _ === "function" ? _ : constant_default(!!_), area) : defined;
			};
			area.curve = function(_) {
				return arguments.length ? (curve = _, context != null && (output = curve(context)), area) : curve;
			};
			area.context = function(_) {
				return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
			};
			return area;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/curve/step.js
		function Step(context, t) {
			this._context = context;
			this._t = t;
		}
		Step.prototype = {
			areaStart: function() {
				this._line = 0;
			},
			areaEnd: function() {
				this._line = NaN;
			},
			lineStart: function() {
				this._x = this._y = NaN;
				this._point = 0;
			},
			lineEnd: function() {
				if (0 < this._t && this._t < 1 && this._point === 2) this._context.lineTo(this._x, this._y);
				if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
				if (this._line >= 0) this._t = 1 - this._t, this._line = 1 - this._line;
			},
			point: function(x, y) {
				x = +x, y = +y;
				switch (this._point) {
					case 0:
						this._point = 1;
						this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
						break;
					case 1: this._point = 2;
					default: if (this._t <= 0) {
						this._context.lineTo(this._x, y);
						this._context.lineTo(x, y);
					} else {
						var x1 = this._x * (1 - this._t) + x * this._t;
						this._context.lineTo(x1, this._y);
						this._context.lineTo(x1, y);
					}
				}
				this._x = x, this._y = y;
			}
		};
		function stepAfter(context) {
			return new Step(context, 1);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/offset/none.js
		function none_default$1(series, order) {
			if (!((n = series.length) > 1)) return;
			for (var i = 1, j, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
				s0 = s1, s1 = series[order[i]];
				for (j = 0; j < m; ++j) s1[j][1] += s1[j][0] = isNaN(s0[j][1]) ? s0[j][0] : s0[j][1];
			}
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/order/none.js
		function none_default(series) {
			var n = series.length, o = new Array(n);
			while (--n >= 0) o[n] = n;
			return o;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/stack.js
		function stackValue(d, key) {
			return d[key];
		}
		function stackSeries(key) {
			const series = [];
			series.key = key;
			return series;
		}
		function stack_default() {
			var keys = constant_default([]), order = none_default, offset = none_default$1, value = stackValue;
			function stack(data) {
				var sz = Array.from(keys.apply(this, arguments), stackSeries), i, n = sz.length, j = -1, oz;
				for (const d of data) for (i = 0, ++j; i < n; ++i) (sz[i][j] = [0, +value(d, sz[i].key, j, data)]).data = d;
				for (i = 0, oz = array_default(order(sz)); i < n; ++i) sz[oz[i]].index = i;
				offset(sz, oz);
				return sz;
			}
			stack.keys = function(_) {
				return arguments.length ? (keys = typeof _ === "function" ? _ : constant_default(Array.from(_)), stack) : keys;
			};
			stack.value = function(_) {
				return arguments.length ? (value = typeof _ === "function" ? _ : constant_default(+_), stack) : value;
			};
			stack.order = function(_) {
				return arguments.length ? (order = _ == null ? none_default : typeof _ === "function" ? _ : constant_default(Array.from(_)), stack) : order;
			};
			stack.offset = function(_) {
				return arguments.length ? (offset = _ == null ? none_default$1 : _, stack) : offset;
			};
			return stack;
		}
		arc_default();
		//#endregion
		//#region src/client/ui/charts/sparkline.tsx
		/**
		* 迷你趋势线（design.md 4.8）：没有坐标轴，只有折线与最后一个点的实心圆；排行行里 64×20，KPI 卡片里 80×24。
		* 宽度默认跟随容器；少于两个点时保持高度显示一行说明。可交互时指针或方向键选中一个点并弹出提示；
		* 放进可点的行之类的控件里时传 `interactive={false}`，只留读屏能读到的名称与各点的值。
		*/
		/** 折线离边缘留的空白，放得下末端的圆点。 */
		const PAD = 3;
		function Sparkline({ points, label, empty, height = 24, width: fixedWidth, min = 0, color = ACCENT_COLOR, formatValue = formatNumber, interactive = true }) {
			const [ref, width] = useElementWidth(fixedWidth);
			const { active, point, clear, enter, keys } = useActivePoint(interactive ? points.length : 0, "last", "x");
			const titleId = (0, react.useId)();
			const descId = (0, react.useId)();
			const tipId = (0, react.useId)();
			const values = points.map((entry) => entry.value);
			const x = linear().domain([0, points.length - 1]).range([PAD, width - PAD]);
			const y = linear().domain([min, Math.max(min + 1, ...values)]).range([height - PAD, PAD]);
			const lastIndex = points.length - 1;
			const last = points[lastIndex];
			const current = active === null ? void 0 : points[active];
			let body = null;
			if (points.length < 2 || last === void 0) body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartEmpty, {
				height,
				text: empty
			});
			else if (width > 0) {
				const stroke = pathOf(line_default().x((_, index) => x(index)).y((value) => y(value))(values));
				body = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					className: charts_module_css_default.svg,
					width,
					height,
					role: "img",
					"aria-labelledby": titleId,
					"aria-describedby": current === void 0 ? descId : `${descId} ${tipId}`,
					tabIndex: interactive ? 0 : void 0,
					onFocus: interactive ? enter : void 0,
					onBlur: interactive ? clear : void 0,
					onKeyDown: interactive ? keys : void 0,
					onPointerLeave: interactive ? clear : void 0,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", {
							id: titleId,
							children: label
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("desc", {
							id: descId,
							children: points.map((entry) => `${entry.label} ${formatValue(entry.value)}`).join(", ")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							className: charts_module_css_default.sparkLine,
							d: stroke,
							style: { stroke: color }
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							className: charts_module_css_default.dot,
							"data-point": "last",
							cx: x(lastIndex),
							cy: y(last.value),
							r: 2.5,
							style: { fill: color }
						}),
						active !== null && current !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							className: charts_module_css_default.dot,
							"data-point": "active",
							cx: x(active),
							cy: y(current.value),
							r: 3.5,
							style: { fill: color }
						}),
						interactive && points.map((entry, index) => {
							const from = index === 0 ? 0 : (x(index - 1) + x(index)) / 2;
							const to = index === lastIndex ? width : (x(index) + x(index + 1)) / 2;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								className: charts_module_css_default.hit,
								"data-point-label": entry.label,
								x: from,
								width: to - from,
								height,
								onPointerMove: () => point(index)
							}, entry.label);
						})
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				ref,
				className: `${charts_module_css_default.chart} ${charts_module_css_default.spark}`,
				"data-chart": "sparkline",
				style: { minHeight: height },
				children: [body, active !== null && current !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartTooltip, {
					id: tipId,
					content: {
						title: current.label,
						rows: [{
							label,
							value: formatValue(current.value)
						}]
					},
					anchor: {
						x: x(active),
						y: height + 4,
						flip: x(active) > width * .6
					}
				})]
			});
		}
		//#endregion
		//#region src/client/ui/charts/ranked-list.tsx
		/** 趋势线在行里的尺寸。 */
		const TREND = {
			width: 64,
			height: 20
		};
		function RankedList({ items, label, empty, limit = 5, formatValue = formatNumber, code = false, select }) {
			const shown = items.slice(0, limit);
			const top = Math.max(0, ...shown.map((item) => item.value));
			const content = (item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: charts_module_css_default.rankLabel,
					"data-code": code || void 0,
					title: item.label,
					children: item.label
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: charts_module_css_default.rankValue,
					children: formatValue(item.value)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: charts_module_css_default.rankBar,
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: charts_module_css_default.rankFill,
						"data-part": "fill",
						style: { width: `${String(item.value / top * 100)}%` }
					})
				}),
				item.trend !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: charts_module_css_default.rankTrend,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Sparkline, {
						points: item.trend.points,
						label: item.trend.label,
						empty: "",
						width: TREND.width,
						height: TREND.height,
						interactive: false
					})
				})
			] });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: charts_module_css_default.chart,
				"data-chart": "ranked",
				children: top <= 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartEmpty, {
					height: 28,
					text: empty
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: charts_module_css_default.ranked,
					"aria-label": label,
					children: shown.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
						"data-key": item.key,
						children: select === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: charts_module_css_default.rankRow,
							"data-trend": item.trend === void 0 ? void 0 : "",
							children: content(item)
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: charts_module_css_default.rankRow,
							"data-trend": item.trend === void 0 ? void 0 : "",
							"aria-label": select.label(item),
							onClick: () => select.onSelect(item),
							children: content(item)
						})
					}, item.key))
				})
			});
		}
		//#endregion
		//#region src/client/ui/charts/share-bar.tsx
		/**
		* 占比条（design.md 4.8）：一个整体在至多六个类别间的分布，画成一条 8px 的 100% 横条，轨道是悬停底色。
		* 图例在上方，只列有值的类别并带各自的数量，可以开关类别；不显示图例时（例如放在 KPI 卡片里）
		* 读屏仍能从描述里读到每一类的数量与占比。指针或方向键选中一段时弹出提示并淡化其他段。
		*/
		/** 一条占比条至多的类别数。 */
		const MAX_SEGMENTS = 6;
		function ShareBar({ segments, label, empty, legend = true, formatValue = formatNumber, formatLegend = compact }) {
			const { hidden, toggle } = useHiddenKeys();
			const [emphasis, setEmphasis] = (0, react.useState)(null);
			const present = segments.filter((segment) => segment.value > 0);
			const visible = present.filter((segment) => !hidden.has(segment.key));
			const { active, point, clear, enter, keys } = useActivePoint(visible.length, "first", "x");
			const descId = (0, react.useId)();
			const tipId = (0, react.useId)();
			if (segments.length > MAX_SEGMENTS) throw new Error(`ShareBar shows at most ${String(MAX_SEGMENTS)} categories, got ${String(segments.length)}`);
			const total = visible.reduce((sum, segment) => sum + segment.value, 0);
			const all = present.reduce((sum, segment) => sum + segment.value, 0);
			const share = (value) => total > 0 ? value / total : 0;
			const current = active === null ? void 0 : visible[active];
			const focused = current?.key ?? emphasis;
			let tooltip = null;
			if (active !== null && current !== void 0) {
				const center = visible.slice(0, active).reduce((sum, segment) => sum + share(segment.value), 0) + share(current.value) / 2;
				tooltip = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartTooltip, {
					id: tipId,
					content: {
						title: current.label,
						rows: [{
							label: formatValue(current.value),
							value: formatPercent(share(current.value)),
							color: current.color
						}]
					},
					anchor: {
						x: `${String(center * 100)}%`,
						y: 12,
						flip: center > .6
					}
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: charts_module_css_default.chart,
				"data-chart": "share",
				children: all === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartEmpty, {
					height: legend ? 36 : 20,
					text: empty
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					legend && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartLegend, {
						items: present.map((segment) => ({
							key: segment.key,
							label: segment.label,
							color: segment.color,
							total: formatLegend(segment.value)
						})),
						hidden,
						onToggle: toggle,
						onEmphasis: setEmphasis
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: charts_module_css_default.plot,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: charts_module_css_default.shareBar,
							role: "img",
							"aria-label": label,
							"aria-describedby": tooltip === null ? descId : `${descId} ${tipId}`,
							tabIndex: 0,
							onFocus: enter,
							onBlur: clear,
							onKeyDown: keys,
							onPointerLeave: clear,
							children: visible.map((segment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${charts_module_css_default.shareSegment} ${charts_module_css_default.series}`,
								"data-segment": segment.key,
								"data-faded": fadedBy(focused, segment.key),
								style: {
									width: `${String(share(segment.value) * 100)}%`,
									background: segment.color
								},
								onPointerMove: () => point(index)
							}, segment.key))
						}), tooltip]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						id: descId,
						className: charts_module_css_default.srOnly,
						children: present.map((segment) => `${segment.label} ${formatValue(segment.value)} (${formatPercent(segment.value / all)})`).join(", ")
					})
				] })
			});
		}
		//#endregion
		//#region src/client/ui/charts/stacked-bar-area.tsx
		/**
		* 按天的堆叠柱（design.md 4.8）：每天一根柱，各序列按传入顺序从下往上堆；可以叠一个同单位的阶梯面积。
		* 宽度跟随容器；时间轴每天一格，没有记录的日子留空，标签间隔按实测的最宽标签加 12px 选，首尾两天贴绘图区两端；
		* 数值轴从 0 起、3 到 5 个刻度、在尾侧。图例在上方，只列有值的序列并带合计，可以开关序列。
		* 指针停在某一天的某个序列上时弹出这一天的提示并淡化其他序列；方向键逐天移动提示。
		* 没有任何值时保持高度，只显示一行说明。
		*/
		const MARGIN = {
			top: 8,
			right: 40,
			bottom: 22,
			left: 0
		};
		function valueOf(row, key) {
			return row[key];
		}
		function StackedBarArea({ data, bars, overlay, label, empty, totalLabel, height = 180, width: fixedWidth, formatValue = formatNumber, formatTick = compact, formatDay: formatDay$1 = formatDay }) {
			const [ref, width] = useElementWidth(fixedWidth);
			const { hidden, toggle } = useHiddenKeys();
			const [emphasis, setEmphasis] = (0, react.useState)(null);
			const { active, point, clear, enter, keys } = useActivePoint(data.length, "last", "x");
			const titleId = (0, react.useId)();
			const tipId = (0, react.useId)();
			const days = data.map((row) => row.day);
			if (new Set(days).size !== days.length) throw new Error("StackedBarArea needs one row per day");
			const totalOf = (key) => data.reduce((sum, row) => sum + valueOf(row, key), 0);
			const series = overlay === void 0 ? bars : [...bars, overlay];
			const present = series.filter((entry) => totalOf(entry.key) > 0);
			const dayLabels = days.map(formatDay$1);
			const [measureRef, measured] = useTextWidths(dayLabels.join("\n"));
			const labelWidth = measured.get("day") ?? 0;
			const visible = bars.filter((bar) => !hidden.has(bar.key) && totalOf(bar.key) > 0);
			const shown = overlay !== void 0 && !hidden.has(overlay.key) && totalOf(overlay.key) > 0 ? overlay : void 0;
			const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
			const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
			const x = band().domain(days).range([0, innerWidth]).paddingInner(.25).paddingOuter(.125);
			const step = x.step();
			const band$1 = x.bandwidth();
			const slots = days.map((day) => {
				const start = x(day);
				if (start === void 0) throw new Error(`no band for ${day}`);
				return {
					day,
					left: start - (step - band$1) / 2,
					start,
					center: start + band$1 / 2
				};
			});
			const layers = stack_default().keys(visible.map((bar) => bar.key)).value((row, key) => valueOf(row, key))(data);
			const overlayValues = shown === void 0 ? [] : data.map((row) => valueOf(row, shown.key));
			const scale = valueScale(Math.max(0, ...layers.flatMap((layer) => layer.map((entry) => entry[1])), ...overlayValues), innerHeight);
			const { y } = scale;
			const colorOf = new Map(visible.map((bar) => [bar.key, bar.color]));
			const stacked = /* @__PURE__ */ new Set();
			const groups = layers.map((layer) => ({
				key: layer.key,
				color: colorOf.get(layer.key),
				rects: layer.flatMap((entry, index) => {
					const slot = slots[index];
					if (slot === void 0 || entry[1] === entry[0]) return [];
					const full = y(entry[0]) - y(entry[1]);
					const drawn = stacked.has(index) ? Math.max(0, full - 1) : full;
					stacked.add(index);
					return [{
						day: slot.day,
						x: slot.start,
						y: y(entry[1]),
						height: drawn
					}];
				})
			}));
			let overlayFill = null;
			let overlayLine = null;
			if (shown !== void 0) {
				const edges = slots.map((slot, index) => ({
					x: slot.left,
					value: overlayValues[index] ?? 0
				}));
				const last = edges.at(-1);
				if (last !== void 0) edges.push({
					x: last.x + step,
					value: last.value
				});
				const shape = area_default().x((edge) => edge.x).y0(innerHeight).y1((edge) => y(edge.value)).curve(stepAfter);
				overlayFill = pathOf(shape(edges));
				overlayLine = pathOf(shape.lineY1()(edges));
			}
			/** 指针所在的序列：按指针高度在这一天的堆叠里找。 */
			const pointAt = (index, event) => {
				point(index);
				const svg = event.currentTarget.ownerSVGElement;
				if (svg === null) throw new Error("the hit area is outside the chart");
				const value = y.invert(event.clientY - svg.getBoundingClientRect().top - MARGIN.top);
				const hit = layers.find((layer) => {
					const entry = layer[index];
					return entry !== void 0 && entry[0] <= value && value < entry[1];
				});
				setEmphasis(hit?.key ?? null);
			};
			const leave = () => {
				clear();
				setEmphasis(null);
			};
			const activeSlot = active === null ? void 0 : slots[active];
			const activeRow = active === null ? void 0 : data[active];
			let tooltip = null;
			if (activeSlot !== void 0 && activeRow !== void 0) {
				const rows = (shown === void 0 ? visible.toReversed() : [...visible.toReversed(), shown]).filter((entry) => valueOf(activeRow, entry.key) !== 0).map((entry) => ({
					label: entry.label,
					value: formatValue(valueOf(activeRow, entry.key)),
					color: entry.color
				}));
				if (totalLabel !== void 0) {
					const total = visible.reduce((sum, bar) => sum + valueOf(activeRow, bar.key), 0);
					rows.push({
						label: totalLabel,
						value: formatValue(total)
					});
				}
				const anchorX = MARGIN.left + activeSlot.center;
				tooltip = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartTooltip, {
					id: tipId,
					content: {
						title: formatDay$1(activeSlot.day),
						rows
					},
					anchor: {
						x: anchorX,
						y: MARGIN.top,
						flip: anchorX > width * .6
					}
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref,
				className: charts_module_css_default.chart,
				"data-chart": "stacked",
				children: present.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartEmpty, {
					height,
					text: empty
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartLegend, {
						items: present.map((entry) => ({
							key: entry.key,
							label: entry.label,
							color: entry.color,
							total: formatTick(totalOf(entry.key))
						})),
						hidden,
						onToggle: toggle,
						onEmphasis: setEmphasis
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: charts_module_css_default.plot,
						style: { height },
						children: [width > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							ref: measureRef,
							className: charts_module_css_default.svg,
							width,
							height,
							role: "img",
							"aria-labelledby": titleId,
							"aria-describedby": tooltip === null ? void 0 : tipId,
							tabIndex: 0,
							onFocus: enter,
							onBlur: clear,
							onKeyDown: keys,
							onPointerLeave: leave,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", {
								id: titleId,
								children: label
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
								transform: `translate(${String(MARGIN.left)},${String(MARGIN.top)})`,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueAxis, {
										scale,
										width: innerWidth,
										format: formatTick
									}),
									activeSlot !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
										className: charts_module_css_default.hover,
										"data-hover": activeSlot.day,
										x: activeSlot.left,
										width: step,
										height: innerHeight
									}),
									groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
										className: charts_module_css_default.series,
										"data-series": group.key,
										"data-faded": fadedBy(emphasis, group.key),
										style: { fill: group.color },
										children: group.rects.map((rect) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											x: rect.x,
											y: rect.y,
											width: band$1,
											height: rect.height
										}, rect.day))
									}, group.key)),
									overlayFill !== null && overlayLine !== null && shown !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: charts_module_css_default.series,
										"data-series": shown.key,
										"data-faded": fadedBy(emphasis, shown.key),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: charts_module_css_default.overlayArea,
											"data-overlay": "area",
											d: overlayFill,
											style: { fill: shown.color }
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: charts_module_css_default.overlayLine,
											"data-overlay": "line",
											d: overlayLine,
											style: { stroke: shown.color }
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BandAxis, {
										top: innerHeight,
										width: innerWidth,
										ticks: axisTicks(slots.map((slot) => slot.center), innerWidth, labelWidth),
										keys: days,
										texts: dayLabels
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MeasureTexts, {
										name: "day",
										texts: dayLabels,
										className: charts_module_css_default.tick
									}),
									slots.map((slot, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
										className: charts_module_css_default.hit,
										"data-day": slot.day,
										x: slot.left,
										width: step,
										height: innerHeight,
										onPointerMove: (event) => pointAt(index, event)
									}, slot.day))
								]
							})]
						}), tooltip]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScreenReaderTable, {
						caption: label,
						columns: series.map((entry) => ({
							key: entry.key,
							text: entry.label
						})),
						rows: data.map((row) => ({
							key: row.day,
							header: formatDay$1(row.day),
							cells: series.map((entry) => ({
								key: entry.key,
								text: formatValue(valueOf(row, entry.key))
							}))
						}))
					})
				] })
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/dash-card.module.css.mjs
		const css$6 = ".OkWbuG_card{box-sizing:border-box;border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill);flex-direction:column;gap:12px;min-width:0;padding:14px 16px;display:flex}.OkWbuG_head{justify-content:space-between;align-items:baseline;gap:12px;min-width:0;display:flex}.OkWbuG_title{min-width:0;font:var(--dsw-font-s-strong-14);color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;margin:0;overflow:hidden}.OkWbuG_summary{font:var(--dsw-font-xs-13);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none}";
		const tag$6 = "@agent-stash/dsh-skill-scout/dash-card.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$6)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$6;
			style.textContent = css$6;
			document.head.appendChild(style);
		}
		var dash_card_module_css_default = {
			"card": "OkWbuG_card",
			"head": "OkWbuG_head",
			"summary": "OkWbuG_summary",
			"title": "OkWbuG_title"
		};
		//#endregion
		//#region src/client/ui/dash-card.tsx
		/**
		* 统计页的卡片（design.md 4.11）：设置卡片的材质，标题行起始侧是标题（h2），尾侧是一个汇总数或一个安静的控件。
		*/
		function DashCard({ title, summary, busy = false, children }) {
			const titleId = (0, react.useId)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: dash_card_module_css_default.card,
				"aria-labelledby": titleId,
				"aria-busy": busy || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: dash_card_module_css_default.head,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						id: titleId,
						className: dash_card_module_css_default.title,
						children: title
					}), summary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: dash_card_module_css_default.summary,
						children: summary
					})]
				}), children]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/data-table.module.css.mjs
		const css$5 = ".KPso4a_root{width:100%;min-width:0;position:relative}.KPso4a_measure{visibility:hidden;pointer-events:none;position:absolute;overflow:hidden}.KPso4a_measureHead{font:var(--dsw-font-xxs-strong-12)}.KPso4a_measureCell{font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums}.KPso4a_table{border-spacing:0;table-layout:fixed;width:100%;min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12)}.KPso4a_table th{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l2);height:30px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-strong-12);text-align:left;text-overflow:ellipsis;user-select:none;white-space:nowrap;padding:0 8px;overflow:hidden}.KPso4a_table td{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l1);text-overflow:ellipsis;white-space:nowrap;height:34px;padding:0 8px;overflow:hidden}.KPso4a_table [data-numeric]{text-align:right;font-variant-numeric:tabular-nums}.KPso4a_table tbody tr[data-open]{cursor:pointer;transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out)}@media (hover:hover){.KPso4a_table tbody tr[data-open]:hover{background:var(--dsw-alias-interactive-bg-hover)}}.KPso4a_table tbody tr[data-open]:has(.KPso4a_open:focus-visible){box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary)}.KPso4a_open{box-sizing:border-box;max-width:100%;color:inherit;font:inherit;text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;background:0 0;border:0;outline:none;padding:0;display:block;overflow:hidden}@media (prefers-reduced-motion:reduce){.KPso4a_table tbody tr[data-open]{transition:none}}";
		const tag$5 = "@agent-stash/dsh-skill-scout/data-table.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$5)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$5;
			style.textContent = css$5;
			document.head.appendChild(style);
		}
		var data_table_module_css_default = {
			"measure": "KPso4a_measure",
			"measureCell": "KPso4a_measureCell",
			"measureHead": "KPso4a_measureHead",
			"open": "KPso4a_open",
			"root": "KPso4a_root",
			"table": "KPso4a_table"
		};
		//#endregion
		//#region src/client/ui/data-table.tsx
		/** 宿主表格的紧凑宽度。 */
		const COMPACT_BELOW = 620;
		/** 单元格左右内边距之和。 */
		const CELL_PADDING = 16;
		/**
		* 名称列以外各列的宽度：实测的最长值加内边距，不超过列自己的上限；
		* 合计超过表格宽度的 70% 时按比例缩小，把至少 30% 留给名称列。
		*/
		function columnWidths(measured, tableWidth) {
			const natural = measured.map((column) => ({
				key: column.key,
				width: Math.min(Math.ceil(column.text) + CELL_PADDING, column.max ?? Number.POSITIVE_INFINITY)
			}));
			const total = natural.reduce((sum, column) => sum + column.width, 0);
			const room = tableWidth * .7;
			const scale = total > room ? room / total : 1;
			return new Map(natural.map((column) => [column.key, Math.floor(column.width * scale)]));
		}
		function DataTable({ label, columns, rows, rowKey, onOpen, width: fixedWidth }) {
			const [ref, width] = useElementWidth(fixedWidth);
			const compact = width > 0 && width < COMPACT_BELOW;
			const [name, ...rest] = columns;
			const others = rest.filter((column) => !(compact && column.optional === true));
			const shown = [name, ...others];
			const cells = others.map((column) => [...new Set(rows.map(column.text))]);
			const [measureRef, measured] = useTextWidths(JSON.stringify([others.map((column) => column.header), cells]));
			const widths = measured.size === 0 || width === 0 ? /* @__PURE__ */ new Map() : columnWidths(others.flatMap((column) => {
				const text = measured.get(column.key);
				if (text === void 0 || text === 0) return [];
				return [{
					key: column.key,
					text,
					...column.maxWidth === void 0 ? {} : { max: column.maxWidth }
				}];
			}), width);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref,
				className: data_table_module_css_default.root,
				children: [width > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
					ref: measureRef,
					className: data_table_module_css_default.measure,
					width: 0,
					height: 0,
					"aria-hidden": "true",
					children: others.map((column, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
						"data-measure": column.key,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							className: data_table_module_css_default.measureHead,
							children: column.header
						}), (cells[index] ?? []).map((text) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							className: data_table_module_css_default.measureCell,
							children: text
						}, text))]
					}, column.key))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: data_table_module_css_default.table,
					"aria-label": label,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: shown.map((column) => {
						const columnWidth = widths.get(column.key);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							"data-column": column.key,
							"data-numeric": column.numeric === true || void 0,
							style: columnWidth === void 0 ? void 0 : { width: columnWidth },
							children: column.header
						}, column.key);
					}) }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", {
						"data-row": rowKey(row),
						"data-open": onOpen === void 0 ? void 0 : "",
						onClick: onOpen === void 0 ? void 0 : () => onOpen(row),
						children: shown.map((column, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							"data-column": column.key,
							"data-numeric": column.numeric === true || void 0,
							title: (column.title ?? column.text)(row),
							children: index === 0 && onOpen !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: data_table_module_css_default.open,
								children: column.cell(row)
							}) : column.cell(row)
						}, column.key))
					}, rowKey(row))) })]
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/ui/kpi-tile.module.css.mjs
		const css$4 = ".GHy_ma_tile{box-sizing:border-box;border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill);flex-direction:column;justify-content:flex-start;min-width:0;padding:12px 14px;display:flex}.GHy_ma_label,.GHy_ma_context{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;margin:0;overflow:hidden}.GHy_ma_context[tabindex]:focus-visible{border-radius:var(--dsw-radius-sm);outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.GHy_ma_valueLine{justify-content:space-between;align-items:center;gap:12px;min-width:0;display:flex}.GHy_ma_value{min-width:0;height:1lh;font:var(--dsw-font-xl-24);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);white-space:nowrap;align-items:center;margin:0;display:flex}.GHy_ma_trend{flex:none;width:80px}.GHy_ma_extra{min-width:0;margin-top:8px}";
		const tag$4 = "@agent-stash/dsh-skill-scout/kpi-tile.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$4)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$4;
			style.textContent = css$4;
			document.head.appendChild(style);
		}
		var kpi_tile_module_css_default = {
			"context": "GHy_ma_context",
			"extra": "GHy_ma_extra",
			"label": "GHy_ma_label",
			"tile": "GHy_ma_tile",
			"trend": "GHy_ma_trend",
			"value": "GHy_ma_value",
			"valueLine": "GHy_ma_valueLine"
		};
		//#endregion
		//#region src/client/ui/kpi-tile.tsx
		/**
		* KPI 卡片（design.md 4.10）：标签、24px 的数值、一行上下文自上而下顶部对齐，同一排卡片的标签与数值对齐；
		* 同排卡片撑满同一行高，底边对齐。迷你趋势线（80×24）放在数值一行的尾侧，标签与上下文占满卡片宽度；
		* 上下文只放整体或一个对比数，拆分数值的数字放进上下文的提示里，上下文因此可以用 Tab 聚焦；上下文下方可放占比条。
		* 数值为 null 时是加载中：数值位置画一条 24px 高的骨架条，不显示上下文、趋势线与占比条。
		*/
		function Context({ context, detail }) {
			if (detail === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: kpi_tile_module_css_default.context,
				title: context,
				"data-kpi-context": "",
				children: context
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: detail,
				side: "bottom",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: kpi_tile_module_css_default.context,
					tabIndex: 0,
					"data-kpi-context": "",
					children: context
				})
			});
		}
		function KpiTile({ label, value, context, detail, trend, children }) {
			const labelId = (0, react.useId)();
			const ready = value !== null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: kpi_tile_module_css_default.tile,
				role: "group",
				"aria-labelledby": labelId,
				"aria-busy": ready ? void 0 : true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						id: labelId,
						className: kpi_tile_module_css_default.label,
						title: label,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: kpi_tile_module_css_default.valueLine,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: kpi_tile_module_css_default.value,
							"data-kpi-value": "",
							children: value ?? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, {
								width: 72,
								height: 24
							})
						}), ready && trend !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: kpi_tile_module_css_default.trend,
							children: trend
						})]
					}),
					ready && context !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Context, {
						context,
						detail
					}),
					ready && children !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: kpi_tile_module_css_default.extra,
						children
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/stats.module.css.mjs
		const css$3 = ".rbjRhq_dashboard{flex-direction:column;gap:12px;min-width:0;display:flex;container-type:inline-size}.rbjRhq_kpis{grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;gap:12px;display:grid}.rbjRhq_columns{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:12px;display:grid}.rbjRhq_column{flex-direction:column;gap:12px;min-width:0;display:flex}@container (width<=720px){.rbjRhq_kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rbjRhq_columns{grid-template-columns:minmax(0,1fr)}}.rbjRhq_error{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);margin:0}.rbjRhq_note{font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);margin:0}.rbjRhq_name{align-items:center;gap:8px;min-width:0;display:flex}.rbjRhq_nameText{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.rbjRhq_secondary{color:var(--dsw-alias-label-secondary)}.rbjRhq_tertiary{color:var(--dsw-alias-label-tertiary)}";
		const tag$3 = "@agent-stash/dsh-skill-scout/stats.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$3)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$3;
			style.textContent = css$3;
			document.head.appendChild(style);
		}
		var stats_module_css_default = {
			"column": "rbjRhq_column",
			"columns": "rbjRhq_columns",
			"dashboard": "rbjRhq_dashboard",
			"error": "rbjRhq_error",
			"kpis": "rbjRhq_kpis",
			"name": "rbjRhq_name",
			"nameText": "rbjRhq_nameText",
			"note": "rbjRhq_note",
			"secondary": "rbjRhq_secondary",
			"tertiary": "rbjRhq_tertiary"
		};
		//#endregion
		//#region src/client/stats.tsx
		/**
		* 「历史回溯提炼」页的「统计」分栏（design.md 4.11）：先是一行 KPI（已分析的会话、近 30 天的任务、待你决定的 idea、
		* 已保存的 Skill），然后是全宽的近 30 天每日任务图，两列各自往下排的次要卡片，最后是全宽的最近模型调用表。
		* 两列按同样的顺序排：占比卡（线索、idea 的状态），排行卡（高频动作、反复出现的错误），卡内图表（每天的新线索、
		* 近 7 天的模型用量）；有分析失败的会话时，第二列的排行卡后面多一张列表卡。
		* 每天的新线索与任务数单位不同，按 4.8「一个图只画一个单位」单独画一张图。
		* 高频动作与错误点开后在「搜索」里查；模型调用点开对应的卡片；分析失败的会话可以打开。
		*/
		/** 统计页上的图表高度：主图 180，卡片里的图 140。 */
		const PRIMARY_HEIGHT = 180;
		const CARD_HEIGHT = 140;
		/** 带图例的占比条的高度：一行图例与横条。 */
		const SHARE_HEIGHT = 36;
		/** 表格首次加载时的占位：表头与三行。 */
		const TABLE_SKELETON = 132;
		const DAY = 864e5;
		/** 自由文字列的最大宽度：模型名与结论。 */
		const MODEL_MAX = 160;
		const RESULT_MAX = 240;
		const USAGE_KEYS = {
			inputTokens: "usage.input",
			cacheReadTokens: "usage.cacheRead",
			cacheWriteTokens: "usage.cacheWrite",
			outputTokens: "usage.output"
		};
		/** 按 `count` 取单复数，数字千位分组。 */
		function plural(t, key, count) {
			return t(`${key}.${count === 1 ? "one" : "other"}`, { count: formatNumber(count) });
		}
		/** `YYYY-MM-DD` 按界面语言写成「10/30」或「10月30日」。 */
		function dayLabel(t, day) {
			const [, month = "", date = ""] = day.split("-");
			return t("chart.day", {
				m: Number(month),
				d: Number(date)
			});
		}
		/** 行里的时间：30 天内写相对时间，更早的写日期。 */
		function when(t, at, now) {
			return now - at > 30 * DAY ? dayLabel(t, new Date(at).toISOString().slice(0, 10)) : ago(t, at, now);
		}
		/** 悬停时显示的完整时间。 */
		function exactTime(t, at) {
			return new Intl.DateTimeFormat(t("chart.locale"), {
				dateStyle: "medium",
				timeStyle: "short"
			}).format(at);
		}
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
		/** 调用结论的状态点：给出 idea 与生成草稿是完成，不值得保存是关闭，失败是出错。 */
		const CALL_STATE = {
			proposed: "done",
			drafted: "done",
			skipped: "idle",
			failed: "error"
		};
		/** 一段只在数据到了以后才画的内容；加载中画同样高度的骨架块。 */
		function Loaded({ stats, height, children }) {
			return stats === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, {
				height,
				shape: "block"
			}) : children(stats);
		}
		/** 每天结束的任务数。 */
		function dailyTotal(day) {
			return OUTCOME_ORDER.reduce((total, outcome) => total + day[outcome], 0);
		}
		function sum(values) {
			return values.reduce((total, value) => total + value, 0);
		}
		/** 「已分析的会话」的上下文：全部会话数；还没列出会话时说明尚未列出。 */
		function coverageContext(t, coverage) {
			return coverage.total === null ? t("stats.unknown") : t("kpi.analyzed.of", { total: formatNumber(coverage.total) });
		}
		/** 「已分析的会话」上下文的提示：历史范围内的会话数、回溯读入的会话数。 */
		function coverageDetail(t, coverage) {
			return [...coverage.inRange === null ? [] : [t("kpi.analyzed.inRange", { count: formatNumber(coverage.inRange) })], t("kpi.analyzed.backfilled", { count: formatNumber(coverage.backfilled) })].join(" · ");
		}
		/** 全部会话按分析状态的占比；还没列出会话时没有整体，不画。 */
		function CoverageShare({ coverage, t }) {
			if (coverage.total === null || coverage.total === 0) return null;
			const failed = coverage.failed.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareBar, {
				label: t("kpi.analyzed.share"),
				empty: t("stats.unknown"),
				legend: false,
				segments: [
					{
						key: "analyzed",
						label: t("stats.coverage.analyzed"),
						value: coverage.analyzed,
						color: COVERAGE_COLORS.analyzed
					},
					{
						key: "failed",
						label: t("stats.coverage.failed"),
						value: failed,
						color: COVERAGE_COLORS.failed
					},
					{
						key: "pending",
						label: t("stats.coverage.pending"),
						value: Math.max(0, coverage.total - coverage.analyzed - failed),
						color: COVERAGE_COLORS.pending
					}
				]
			});
		}
		function Kpis({ stats, t }) {
			const coverage = stats?.coverage;
			const totals = stats?.daily.map(dailyTotal) ?? [];
			const tasks = sum(totals);
			const verified = sum(stats?.daily.map((day) => day.verified) ?? []);
			const ideas = stats?.funnel.ideas;
			const allIdeas = ideas === void 0 ? 0 : sum(IDEA_ORDER.map((state) => ideas[state]));
			const waiting = ideas === void 0 ? 0 : ideas.proposed + ideas.ready;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: stats_module_css_default.kpis,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiTile, {
						label: t("kpi.analyzed"),
						value: coverage === void 0 ? null : formatNumber(coverage.analyzed),
						...coverage === void 0 ? {} : {
							context: coverageContext(t, coverage),
							detail: coverageDetail(t, coverage)
						},
						children: coverage === void 0 ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CoverageShare, {
							coverage,
							t
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiTile, {
						label: t("kpi.tasks"),
						value: stats === null ? null : formatNumber(tasks),
						...tasks > 0 ? { context: t("kpi.tasks.verified", { percent: formatPercent(verified / tasks) }) } : {},
						trend: stats === null ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Sparkline, {
							points: stats.daily.map((day, index) => ({
								label: dayLabel(t, day.day),
								value: totals[index] ?? 0
							})),
							label: t("stats.tasks"),
							empty: t("chart.trend.empty"),
							width: 80,
							height: 24
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiTile, {
						label: t("kpi.ideas"),
						value: ideas === void 0 ? null : formatNumber(waiting),
						...ideas === void 0 ? {} : { context: plural(t, "kpi.ideas.ready", ideas.ready) }
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiTile, {
						label: t("kpi.skills"),
						value: ideas === void 0 ? null : formatNumber(ideas.written),
						...ideas === void 0 ? {} : { context: plural(t, "kpi.skills.of", allIdeas) }
					})
				]
			});
		}
		/** 近 8 周的会话数，最早的在前：最后一周是本周。 */
		function weekPoints(t, weeks) {
			return weeks.map((value, index) => {
				const back = weeks.length - 1 - index;
				return {
					label: back === 0 ? t("stats.week.current") : plural(t, "stats.week.ago", back),
					value
				};
			});
		}
		/** 卡片标题行尾侧的数量；加载中不显示。 */
		function countOf(t, stats, key, count) {
			return stats === null ? {} : { summary: plural(t, key, count(stats)) };
		}
		function LeadShare({ stats, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
				title: t("stats.leads"),
				busy: stats === null,
				...countOf(t, stats, "stats.leads.count", (loaded) => sum(LEAD_ORDER.map((state) => loaded.funnel.leads[state]))),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
					stats,
					height: SHARE_HEIGHT,
					children: (loaded) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareBar, {
						label: t("stats.leads"),
						empty: t("stats.leads.empty"),
						segments: LEAD_ORDER.map((state) => ({
							key: state,
							label: t(`funnel.lead.${state}`),
							value: loaded.funnel.leads[state],
							color: LEAD_COLORS[state]
						}))
					})
				})
			});
		}
		function IdeaShare({ stats, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
				title: t("stats.ideas"),
				busy: stats === null,
				...countOf(t, stats, "stats.ideas.count", (loaded) => sum(IDEA_ORDER.map((state) => loaded.funnel.ideas[state]))),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
					stats,
					height: SHARE_HEIGHT,
					children: (loaded) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareBar, {
						label: t("stats.ideas"),
						empty: t("stats.ideas.empty"),
						segments: IDEA_ORDER.map((state) => ({
							key: state,
							label: t(`funnel.idea.${state}`),
							value: loaded.funnel.ideas[state],
							color: IDEA_COLORS[state]
						}))
					})
				})
			});
		}
		/** 排行里点一行：在「搜索」里查这段文字。 */
		function searchFor(face, t) {
			return {
				label: (item) => t("stats.searchFor", { text: item.label }),
				onSelect: (item) => face.page.update({
					tab: "search",
					query: item.label
				})
			};
		}
		function Actions({ stats, face, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
				title: t("stats.actions"),
				busy: stats === null,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
					stats,
					height: CARD_HEIGHT,
					children: (loaded) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankedList, {
						label: t("stats.actions"),
						empty: t("stats.actions.empty"),
						code: true,
						formatValue: (value) => counted(t, "meta.sessions", value),
						items: loaded.actions.map((action) => ({
							key: action.key,
							label: action.label,
							value: action.sessions,
							trend: {
								label: t("stats.actions.trend", { label: action.label }),
								points: weekPoints(t, action.weeks)
							}
						})),
						select: searchFor(face, t)
					})
				})
			});
		}
		function Errors({ stats, face, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
				title: t("stats.errors"),
				busy: stats === null,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
					stats,
					height: CARD_HEIGHT,
					children: (loaded) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankedList, {
						label: t("stats.errors"),
						empty: t("stats.errors.empty"),
						code: true,
						formatValue: (value) => counted(t, "meta.sessions", value),
						items: loaded.errors.map((error) => ({
							key: error.signature,
							label: error.example,
							value: error.sessions
						})),
						select: searchFor(face, t)
					})
				})
			});
		}
		/** 分析失败的会话：状态点、会话 id、错误与时间，点开打开这个会话；没有失败时不显示。 */
		function FailedSessions({ stats, face, t, now }) {
			const failed = stats?.coverage.failed ?? [];
			if (failed.length === 0) return null;
			const { openSession } = face;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
				title: t("stats.failed"),
				summary: plural(t, "stats.failed.count", failed.length),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowList, { children: failed.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListRow, {
					variant: "item",
					size: "pane",
					rowData: { "data-session": entry.sessionId },
					marker: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }),
					title: entry.sessionId,
					summary: entry.message,
					status: {
						word: t("stats.coverage.failed"),
						ink: "error",
						shimmer: false
					},
					metadata: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						title: exactTime(t, entry.at),
						children: when(t, entry.at, now)
					}, "time")],
					onOpen: openSession === null ? void 0 : () => openSession(entry.sessionId)
				}, entry.sessionId)) })
			});
		}
		function NewLeads({ stats, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
				title: t("stats.newLeads"),
				busy: stats === null,
				...countOf(t, stats, "stats.leads.count", (loaded) => sum(loaded.daily.map((day) => day.leads))),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
					stats,
					height: CARD_HEIGHT,
					children: (loaded) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StackedBarArea, {
						data: loaded.daily,
						bars: [{
							key: "leads",
							label: t("stats.newLeads.series"),
							color: ACCENT_COLOR
						}],
						label: t("stats.newLeads"),
						empty: t("stats.newLeads.empty"),
						height: CARD_HEIGHT,
						formatDay: (day) => dayLabel(t, day)
					})
				})
			});
		}
		function Usage({ stats, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
				title: t("stats.usage"),
				busy: stats === null,
				...countOf(t, stats, "stats.usage.total", (loaded) => sum(loaded.usage.flatMap((day) => USAGE_ORDER.map((kind) => day[kind])))),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
					stats,
					height: CARD_HEIGHT,
					children: (loaded) => {
						const requests = {
							summaries: sum(loaded.usage.map((day) => day.summaries)),
							requested: sum(loaded.usage.map((day) => day.requested)),
							failures: sum(loaded.usage.map((day) => day.failures))
						};
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StackedBarArea, {
							data: loaded.usage,
							bars: USAGE_ORDER.map((kind) => ({
								key: kind,
								label: t(USAGE_KEYS[kind]),
								color: USAGE_COLORS[kind]
							})),
							label: t("stats.usage"),
							empty: t("stats.usage.empty"),
							totalLabel: t("chart.total"),
							height: CARD_HEIGHT,
							formatDay: (day) => dayLabel(t, day)
						}), requests.summaries + requests.requested + requests.failures > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: stats_module_css_default.note,
							children: t("usage.requests", requests)
						})] });
					}
				})
			});
		}
		/** 最近的模型调用：条目、阶段、模型、耗时、输入、输出、结论、时间；窄宽度下隐藏阶段、模型与输入。 */
		function callColumns(t, now) {
			return [
				{
					key: "item",
					header: t("call.column.item"),
					cell: (call) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: stats_module_css_default.name,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: CALL_STATE[call.result] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: stats_module_css_default.nameText,
							children: call.title
						})]
					}),
					text: (call) => call.title
				},
				{
					key: "stage",
					header: t("call.column.stage"),
					optional: true,
					cell: (call) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: stats_module_css_default.secondary,
						children: t(`stage.${call.stage}`)
					}),
					text: (call) => t(`stage.${call.stage}`)
				},
				{
					key: "model",
					header: t("call.column.model"),
					optional: true,
					maxWidth: MODEL_MAX,
					cell: (call) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: stats_module_css_default.secondary,
						children: call.model
					}),
					text: (call) => call.model,
					title: (call) => `${call.provider} · ${call.model}`
				},
				{
					key: "duration",
					header: t("call.column.duration"),
					numeric: true,
					cell: (call) => duration(t, call.durationMs),
					text: (call) => duration(t, call.durationMs)
				},
				{
					key: "input",
					header: t("call.column.input"),
					numeric: true,
					optional: true,
					cell: (call) => formatNumber(inputOf(call)),
					text: (call) => formatNumber(inputOf(call))
				},
				{
					key: "output",
					header: t("call.column.output"),
					numeric: true,
					cell: (call) => formatNumber(call.outputTokens),
					text: (call) => formatNumber(call.outputTokens)
				},
				{
					key: "result",
					header: t("call.column.result"),
					maxWidth: RESULT_MAX,
					cell: (call) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: stats_module_css_default.secondary,
						children: callResult(t, call)
					}),
					text: (call) => callResult(t, call)
				},
				{
					key: "time",
					header: t("call.column.time"),
					cell: (call) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: stats_module_css_default.tertiary,
						children: when(t, call.at, now)
					}),
					text: (call) => when(t, call.at, now),
					title: (call) => exactTime(t, call.at)
				}
			];
		}
		/** 一次调用读入的全部输入 token：未命中缓存的、缓存读与缓存写。 */
		function inputOf(call) {
			return call.inputTokens + call.cacheReadTokens + call.cacheWriteTokens;
		}
		function Calls({ stats, face, t, now }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
				title: t("stats.calls"),
				busy: stats === null,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
					stats,
					height: TABLE_SKELETON,
					children: ({ calls }) => calls.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: stats_module_css_default.note,
						children: t("stats.calls.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DataTable, {
						label: t("stats.calls"),
						rows: calls,
						rowKey: (call) => `${String(call.at)}:${call.itemId}:${call.stage}`,
						onOpen: (call) => face.page.update({
							tab: "suggestions",
							selected: call.itemId
						}),
						columns: callColumns(t, now)
					})
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
			const loaded = useLoaded((0, react.useCallback)((_revision, signal) => loadStats(signal), [loadStats]), revision);
			const now = useNow(6e4);
			if (loaded.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: stats_module_css_default.error,
				role: "alert",
				children: t("stats.error", { error: loaded.error })
			});
			const stats = loaded.status === "ready" ? loaded.value : null;
			const card = {
				stats,
				face,
				t
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: stats_module_css_default.dashboard,
				"data-view": "stats",
				"aria-busy": stats === null || void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Kpis, {
						stats,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DashCard, {
						title: t("stats.tasks"),
						busy: stats === null,
						...countOf(t, stats, "stats.tasks.count", (ready) => sum(ready.daily.map(dailyTotal))),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, {
							stats,
							height: PRIMARY_HEIGHT,
							children: (ready) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StackedBarArea, {
								data: ready.daily,
								bars: OUTCOME_ORDER.map((outcome) => ({
									key: outcome,
									label: t(`outcome.${outcome}`),
									color: OUTCOME_COLORS[outcome]
								})),
								label: t("stats.tasks"),
								empty: t("stats.tasks.empty"),
								totalLabel: t("chart.total"),
								height: PRIMARY_HEIGHT,
								formatDay: (day) => dayLabel(t, day)
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: stats_module_css_default.columns,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: stats_module_css_default.column,
							"data-column": "1",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LeadShare, { ...card }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Actions, { ...card }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewLeads, { ...card })
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: stats_module_css_default.column,
							"data-column": "2",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IdeaShare, { ...card }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Errors, { ...card }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FailedSessions, {
									...card,
									now
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Usage, { ...card })
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Calls, {
						...card,
						now
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/layout.module.css.mjs
		const css$2 = ".wUOHyq_page{width:100%;min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font:var(--dsw-font-s-14);display:flex;overflow:hidden;container:wUOHyq_scout-split/inline-size}.wUOHyq_listPane{--scout-pane-bg:var(--dsw-alias-bg-base);flex-direction:column;flex:1;min-width:0;min-height:0;display:flex}.wUOHyq_pageScroll{scrollbar-gutter:stable;flex:1;min-height:0;overflow:auto}.wUOHyq_pageContent{box-sizing:border-box;flex-direction:column;max-width:960px;min-height:100%;margin:0 auto;padding:0 clamp(24px,4vw,48px) 48px;display:flex}.wUOHyq_pageHeading{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px;padding-top:28px;display:flex}[data-platform=darwin] .wUOHyq_pageHeading{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}.wUOHyq_pageTitle{min-width:0;font:var(--dsw-font-l-20);color:var(--dsw-alias-label-primary);margin:0}.wUOHyq_pageTabs{width:fit-content;min-width:240px;margin-bottom:24px}.wUOHyq_noticeRow{margin-bottom:16px}.wUOHyq_tabPanel{flex-direction:column;flex:1;min-width:0;display:flex}.wUOHyq_detailPane{border-left:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-base);flex-direction:column;flex:0 0 47%;min-width:0;min-height:0;display:flex}.wUOHyq_view{box-sizing:border-box;width:100%;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);font:var(--dsw-font-s-14);flex-direction:column;display:flex;overflow:hidden}.wUOHyq_viewNotices{flex-direction:column;flex:none;gap:8px;padding:8px 16px 0;display:flex}.wUOHyq_viewNotices:empty{display:none}.wUOHyq_split{flex:1;min-width:0;min-height:0;display:flex;container:wUOHyq_scout-split/inline-size}.wUOHyq_pane{--scout-pane-bg:var(--dsw-alias-bg-layer-1);box-sizing:border-box;width:clamp(320px,38%,440px);min-height:0;padding:0 8px calc(var(--dsh-composer-height,152px) + 16px);border-right:.5px solid var(--dsw-alias-border-l2);scrollbar-gutter:stable;flex:none;overflow:auto}.wUOHyq_paneDetail{min-width:0;min-height:0;padding-bottom:calc(var(--dsh-composer-height,152px) + 16px);flex-direction:column;flex:1;display:flex}@container wUOHyq_scout-split (width<=759px){.wUOHyq_page[data-open] .wUOHyq_listPane,.wUOHyq_split[data-open] .wUOHyq_pane,.wUOHyq_page:not([data-open]) .wUOHyq_detailPane,.wUOHyq_split:not([data-open]) .wUOHyq_paneDetail{display:none}.wUOHyq_detailPane{border-left:0;flex-basis:100%}.wUOHyq_pane{border-right:0;width:100%}}.wUOHyq_note{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);margin:0}.wUOHyq_error{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);margin:0}.wUOHyq_spacer{flex:1}.wUOHyq_loading{padding-top:8px}";
		const tag$2 = "@agent-stash/dsh-skill-scout/layout.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$2)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$2;
			style.textContent = css$2;
			document.head.appendChild(style);
		}
		var layout_module_css_default = {
			"detailPane": "wUOHyq_detailPane",
			"error": "wUOHyq_error",
			"listPane": "wUOHyq_listPane",
			"loading": "wUOHyq_loading",
			"note": "wUOHyq_note",
			"noticeRow": "wUOHyq_noticeRow",
			"page": "wUOHyq_page",
			"pageContent": "wUOHyq_pageContent",
			"pageHeading": "wUOHyq_pageHeading",
			"pageScroll": "wUOHyq_pageScroll",
			"pageTabs": "wUOHyq_pageTabs",
			"pageTitle": "wUOHyq_pageTitle",
			"pane": "wUOHyq_pane",
			"paneDetail": "wUOHyq_paneDetail",
			"scout-split": "wUOHyq_scout-split",
			"spacer": "wUOHyq_spacer",
			"split": "wUOHyq_split",
			"tabPanel": "wUOHyq_tabPanel",
			"view": "wUOHyq_view",
			"viewNotices": "wUOHyq_viewNotices"
		};
		//#endregion
		//#region src/client/page.tsx
		/**
		* 「历史回溯提炼」页：侧栏入口与主区域页面（design 3.3）。标题下是三个分区：建议（完整收件箱，
		* 列表与右侧详情栏）、搜索、统计。页面开着时，操作与请求结束的提示显示在分区 Tab 下方。
		*/
		/** 侧栏入口的图标；宿主传入边长与是否选中。 */
		function PageIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutlineRegular, { size: size ?? 16 });
		}
		/** 「建议」里显示在详情栏的卡片：选中的那张，没有选中时第一张等你决定的。 */
		function currentItem(view, selected) {
			const groups = groupItems(view.items);
			return resolveItem(view.items, selected) ?? groups.review[0] ?? groups.found[0] ?? view.items[0];
		}
		/**
		* 「建议」分区的列表：限制条件、按状态分组的行。从标题栏、提示或搜索打开的卡片出现在列表里后滚到可见处
		* 并高亮一次；用户在页面里点选或换分区后不再高亮。
		*/
		function Suggestions({ face, view, current, t }) {
			const { page, inbox } = face;
			const { reveal } = useSnapshot(page);
			const now = useNow(6e4);
			const flash = resolveItem(view.items, reveal)?.id ?? null;
			if (view.items.length === 0) {
				const sessions = view.status.analyzed.sessions;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
					inbox: view,
					t
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, {
					text: t("panel.empty.title"),
					detail: t(sessions === 1 ? "panel.analyzed.one" : "panel.analyzed.other", { sessions })
				})] });
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
				inbox: view,
				t
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupedItems, {
				items: view.items,
				now,
				t,
				size: "page",
				selected: current?.id ?? null,
				highlight: flash,
				onOpen: (id) => page.update({
					selected: id,
					reveal: null
				}),
				onDismiss: (id) => dismissItem(inbox, id)
			})] });
		}
		function HistoryPage(props) {
			const { inbox, page, t } = props;
			const state = useSnapshot(inbox);
			const nav = useSnapshot(page);
			const baseId = (0, react.useId)();
			const [pageRef, single] = useSinglePane();
			(0, react.useEffect)(() => inbox.hostNotices(), [inbox]);
			const listsAll = nav.tab === "suggestions";
			(0, react.useEffect)(() => listsAll ? inbox.listing(everyItem) : void 0, [inbox, listsAll]);
			const panelId = `${baseId}-panel`;
			const tab = (value, label) => ({
				value,
				label,
				id: `${baseId}-${value}`,
				panelId
			});
			const view = state.inbox;
			const suggestions = nav.tab === "suggestions" && view !== null;
			const current = suggestions ? currentItem(view, nav.selected) : void 0;
			const notice = state.notice;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: pageRef,
				className: layout_module_css_default.page,
				"data-view": "page",
				"data-tab": nav.tab,
				"data-open": suggestions && nav.selected !== null && current !== void 0 || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: layout_module_css_default.listPane,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: layout_module_css_default.pageScroll,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: layout_module_css_default.pageContent,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
									className: layout_module_css_default.pageHeading,
									"data-window-drag": "",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
										className: layout_module_css_default.pageTitle,
										children: t("page.title")
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedTabs, {
									className: layout_module_css_default.pageTabs,
									label: t("page.tabs"),
									items: [
										tab("suggestions", t("page.tab.suggestions")),
										tab("search", t("page.tab.search")),
										tab("stats", t("page.tab.stats"))
									],
									value: nav.tab,
									onChange: (next) => page.update({
										tab: next,
										reveal: null
									})
								}),
								notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: layout_module_css_default.noticeRow,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResultNotice, {
										text: t(notice.key, notice.params),
										links: noticeLinks(notice, props, t),
										close: {
											label: t("notice.close"),
											onClick: () => inbox.clearNotice()
										}
									})
								}),
								state.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: layout_module_css_default.noticeRow,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorNotice, {
										text: t("panel.error"),
										retry: {
											label: t("panel.retry"),
											onClick: () => void inbox.refresh()
										}
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: layout_module_css_default.tabPanel,
									role: "tabpanel",
									id: panelId,
									"aria-labelledby": `${baseId}-${nav.tab}`,
									children: view === null ? state.status !== "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkeletonRows, {}) : nav.tab === "suggestions" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Suggestions, {
										face: props,
										view,
										current,
										t
									}) : nav.tab === "search" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchTab, {
										face: props,
										view,
										t
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatsTab, {
										face: props,
										view,
										t
									})
								})
							]
						})
					})
				}), suggestions && view !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: layout_module_css_default.detailPane,
					children: current === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { text: t("detail.none") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemDetail, {
						face: props,
						view,
						item: current,
						t,
						size: "page",
						onSelect: (id) => page.update({ selected: id }),
						onBack: single ? () => page.update({ selected: null }) : void 0
					})
				})]
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
		//#region \0dsh-css:src/client/ui/view-header.module.css.mjs
		const css$1 = ".ufK3Da_header{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l2);flex-wrap:wrap;flex:none;align-items:center;gap:4px 12px;min-height:48px;padding:0 16px;display:flex;container-type:inline-size}.ufK3Da_status{flex:auto;align-items:center;gap:8px;min-width:0;height:48px;margin:0;display:flex}.ufK3Da_dot{flex:none;justify-content:center;width:16px;display:inline-flex}.ufK3Da_title{font:var(--dsw-font-s-strong-14);color:var(--dsw-alias-label-primary);flex:none}.ufK3Da_meta{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);overflow:hidden}.ufK3Da_actions{flex:none;align-items:center;gap:8px;margin-left:auto;display:flex}@container (width<=480px){.ufK3Da_meta{display:none}.ufK3Da_actions{padding-bottom:10px}}";
		const tag$1 = "@agent-stash/dsh-skill-scout/view-header.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$1)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-skill-scout";
			style.dataset.pluginCss = tag$1;
			style.textContent = css$1;
			document.head.appendChild(style);
		}
		var view_header_module_css_default = {
			"actions": "ufK3Da_actions",
			"dot": "ufK3Da_dot",
			"header": "ufK3Da_header",
			"meta": "ufK3Da_meta",
			"status": "ufK3Da_status",
			"title": "ufK3Da_title"
		};
		//#endregion
		//#region src/client/ui/view-header.tsx
		/**
		* 会话视图的第一行（design 3.2）：48px，前面是视图自身状态的状态点、状态标题与元信息，后面是动作。
		* 窄时动作换到第二行并保留文字，元信息先隐藏。
		*/
		function ViewHeader({ dot, title, meta, actions }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: view_header_module_css_default.header,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: view_header_module_css_default.status,
					role: "status",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: view_header_module_css_default.dot,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: view_header_module_css_default.title,
							children: title
						}),
						meta !== void 0 && meta !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: view_header_module_css_default.meta,
							children: meta
						})
					]
				}), actions !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: view_header_module_css_default.actions,
					children: actions
				})]
			});
		}
		//#endregion
		//#region src/client/session.tsx
		/** 任务记录超过这个数、且列表里有建议时，任务分组先收起。 */
		const RECORDS_SHOWN = 5;
		/** 视图第一行：本会话的分析状态。 */
		function viewStatus(t, session, scanning, now) {
			const value = session.status === "ready" ? session.value : null;
			if (value === null) return session.status === "error" ? {
				dot: "error",
				title: t("session.state.unread"),
				meta: null
			} : {
				dot: "ongoing",
				title: t("panel.loading"),
				meta: null
			};
			if (value.state === "analyzed") {
				const count = value.tasks.length;
				return {
					dot: scanning ? "ongoing" : "done",
					title: t(count === 1 ? "session.state.analyzed.one" : "session.state.analyzed.other", { count }),
					meta: value.scannedAt === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
						title: absolute(value.scannedAt),
						children: ago(t, value.scannedAt, now)
					})
				};
			}
			if (value.state === "failed") return {
				dot: "error",
				title: t("session.state.failed"),
				meta: value.error
			};
			if (value.state === "waiting" || value.state === "pending") return {
				dot: scanning ? "ongoing" : "idle",
				title: t(`session.state.${value.state}`),
				meta: null
			};
			if (value.state === "subagent") return {
				dot: "idle",
				title: t("session.state.subagent"),
				meta: t("session.state.subagent.meta")
			};
			return {
				dot: "idle",
				title: t("session.state.missing"),
				meta: null
			};
		}
		function SessionTab(props) {
			const { inbox, sessionId, loadSession, t } = props;
			const state = useSnapshot(inbox);
			/** 用户打开的建议；为 null 时两栏显示第一条，单栏显示列表。 */
			const [selected, setSelected] = (0, react.useState)(null);
			const [splitRef, single] = useSinglePane();
			const [acting, setActing] = (0, react.useState)(null);
			/** 用户展开或收起过任务分组；为 null 时按默认。 */
			const [recordsOpen, setRecordsOpen] = (0, react.useState)(null);
			const { busy, error, run } = useAction(inbox, t);
			const now = useNow(6e4);
			(0, react.useEffect)(() => inbox.listing((item) => cites(item, sessionId)), [inbox, sessionId]);
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
			const groups = groupItems(items);
			const current = resolveItem(items, selected) ?? groups.review[0] ?? groups.found[0] ?? items[0];
			const value = session.status === "ready" ? session.value : null;
			const closed = value === null || value.state === "subagent" || value.state === "missing";
			const header = viewStatus(t, session, status?.scanning === true, now);
			/** 分析或提炼本会话；提炼成功后打开 Host 返回的线索，它已有 idea 时落到第一个 idea。 */
			const send = async (kind, action) => {
				setActing(kind);
				const result = await run(action);
				setActing(null);
				setActed((count) => count + 1);
				if (result?.ok === true && result.leadId !== void 0) setSelected(result.leadId);
			};
			const tasks = value?.tasks ?? [];
			const collapsible = tasks.length > RECORDS_SHOWN;
			const recordsShown = recordsOpen ?? !(collapsible && items.length > 0);
			const extractBlocked = status?.models.summary == null ? t("detail.noSummaryModel") : value !== null && value.tasks.length === 0 ? t("error.empty") : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: layout_module_css_default.view,
				"data-view": "session",
				"data-conversation-composer-overlay": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViewHeader, {
						dot: header.dot,
						title: header.title,
						meta: header.meta,
						actions: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
							variant: "ghost",
							label: t("session.analyze"),
							busyLabel: t("session.analyzing"),
							busy: acting === "analyze",
							disabled: closed || busy,
							onClick: () => void send("analyze", {
								action: "analyze-session",
								sessionId
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
							variant: "primary",
							label: t("session.extract"),
							busyLabel: t("session.extracting"),
							busy: acting === "extract",
							disabled: closed || busy,
							unavailable: extractBlocked,
							onClick: () => void send("extract", {
								action: "extract-session",
								sessionId
							})
						})] })
					}),
					(view !== null || error !== null || session.status === "error") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: layout_module_css_default.viewNotices,
						children: [
							view !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Banner, {
								inbox: view,
								t
							}),
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorNotice, { text: error }),
							session.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorNotice, {
								text: t("session.error", { error: session.error }),
								retry: {
									label: t("panel.retry"),
									onClick: () => setActed((count) => count + 1)
								}
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: splitRef,
						className: layout_module_css_default.split,
						"data-open": selected !== null || void 0,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: layout_module_css_default.pane,
							"aria-label": t("session.list"),
							role: "region",
							"aria-busy": status?.scanning === true || void 0,
							children: [view === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: layout_module_css_default.loading,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkeletonRows, {})
							}) : items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Group, {
								title: t("session.items"),
								size: "pane",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupHeader, {
									title: t("session.items"),
									size: "pane",
									sticky: true
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupNote, { children: t("session.items.empty") })]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupedItems, {
								items,
								now,
								t,
								size: "pane",
								sticky: true,
								selected: current?.id ?? null,
								onOpen: setSelected,
								onDismiss: (id) => dismissItem(inbox, id)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Group, {
								title: t("session.tasks"),
								size: "pane",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupHeader, {
										title: t("session.tasks"),
										count: value === null ? void 0 : tasks.length,
										size: "pane",
										sticky: true,
										toggle: collapsible ? {
											expanded: recordsShown,
											label: t(recordsShown ? "group.collapse" : "group.expand", { group: t("session.tasks") }),
											onToggle: () => setRecordsOpen(!recordsShown)
										} : void 0
									}),
									value === null && session.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkeletonRows, {}),
									value !== null && tasks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupNote, { children: t("session.tasks.empty") }),
									tasks.length > 0 && recordsShown && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowList, { children: tasks.map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskRow, {
										task,
										now,
										t,
										terms: [],
										pick: null,
										openSession: null
									}, task.episodeId)) })
								]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: layout_module_css_default.paneDetail,
							children: view !== null && current !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemDetail, {
								face: props,
								view,
								item: current,
								t,
								size: "pane",
								onSelect: setSelected,
								onBack: single ? () => setSelected(null) : void 0
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { text: t("detail.none") })
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
			summaryTimeout: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.summaryTimeout),
			draftProvider: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.draftProvider),
			draftModel: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.draftModel),
			draftEffort: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.draftEffort),
			draftTimeout: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.draftTimeout),
			dailySummaries: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.dailySummaries),
			summaryInterval: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.summaryInterval),
			quietPeriod: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.quietPeriod),
			historyDays: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.historyDays),
			maxSessions: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.maxSessions),
			minOccurrences: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.minOccurrences),
			evidenceBudget: /* @__PURE__ */ fallback(/* @__PURE__ */ number$2(), DEFAULT_SETTINGS.evidenceBudget),
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