window.__ModuleLoader__.load({
	id: "@agent-stash/dsh-message-edit",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
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
		/**
		* [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) regex.
		*/
		const UUID_REGEX = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu;
		/* @__NO_SIDE_EFFECTS__ */
		function integer(message$1) {
			return {
				kind: "validation",
				type: "integer",
				reference: integer,
				async: false,
				expects: null,
				requirement: Number.isInteger,
				message: message$1,
				"~run"(dataset, config$1) {
					if (dataset.typed && !this.requirement(dataset.value)) _addIssue(this, "integer", dataset, config$1);
					return dataset;
				}
			};
		}
		/* @__NO_SIDE_EFFECTS__ */
		function minValue(requirement, message$1) {
			return {
				kind: "validation",
				type: "min_value",
				reference: minValue,
				async: false,
				expects: `>=${requirement instanceof Date ? requirement.toJSON() : /* @__PURE__ */ _stringify(requirement)}`,
				requirement,
				message: message$1,
				"~run"(dataset, config$1) {
					if (dataset.typed && !(dataset.value >= this.requirement)) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
					return dataset;
				}
			};
		}
		/* @__NO_SIDE_EFFECTS__ */
		function nonEmpty(message$1) {
			return {
				kind: "validation",
				type: "non_empty",
				reference: nonEmpty,
				async: false,
				expects: "!0",
				message: message$1,
				"~run"(dataset, config$1) {
					if (dataset.typed && dataset.value.length === 0) _addIssue(this, "length", dataset, config$1, { received: "0" });
					return dataset;
				}
			};
		}
		/* @__NO_SIDE_EFFECTS__ */
		function uuid(message$1) {
			return {
				kind: "validation",
				type: "uuid",
				reference: uuid,
				async: false,
				expects: null,
				requirement: UUID_REGEX,
				message: message$1,
				"~run"(dataset, config$1) {
					if (dataset.typed && !this.requirement.test(dataset.value)) _addIssue(this, "UUID", dataset, config$1);
					return dataset;
				}
			};
		}
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
		/**
		* Parses an unknown input based on a schema.
		*
		* @param schema The schema to be used.
		* @param input The input to be parsed.
		* @param config The parse configuration.
		*
		* @returns The parsed input.
		*/
		function parse(schema, input, config$1) {
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
		* Host 与浏览器两半共享的契约：HTTP 路由、请求与响应的结构，以及持久化的版本记录。
		* 结构用 valibot 描述，类型由 schema 推导，Host 校验请求体与存储记录，浏览器校验响应。
		*/
		/** Host 插件在 DSH Web 服务上注册的同源路由。 */
		const MESSAGE_EDIT_PATH = "/message-edit";
		const NonNegativeIntegerSchema = /* @__PURE__ */ pipe(/* @__PURE__ */ number(), /* @__PURE__ */ integer(), /* @__PURE__ */ minValue(0));
		const SessionIdSchema = /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ nonEmpty());
		/** 修改历史回合后怎样处理它之后的回合：截断，或依次重放后续用户输入。 */
		const CascadePolicySchema = /* @__PURE__ */ picklist(["truncate", "preserve"]);
		/** 一个子版本代表的用户操作。 */
		const VersionOperationSchema = /* @__PURE__ */ picklist([
			"edit",
			"reroll",
			"retry"
		]);
		/** 可编辑的消息块种类。 */
		const EditableBlockKindSchema = /* @__PURE__ */ picklist([
			"user",
			"assistant.reasoning",
			"assistant.response"
		]);
		/** `GET /message-edit?sessionId=` 的响应，时间线视图与标题栏控件共用。 */
		const MessageEditTimelineSchema = /* @__PURE__ */ object({
			sessionId: SessionIdSchema,
			messages: /* @__PURE__ */ array(/* @__PURE__ */ object({
				key: /* @__PURE__ */ string(),
				turn: NonNegativeIntegerSchema,
				eventSeq: NonNegativeIntegerSchema,
				blockIndex: NonNegativeIntegerSchema,
				kind: EditableBlockKindSchema,
				text: /* @__PURE__ */ string(),
				time: NonNegativeIntegerSchema,
				/** 助手块所属 `assistant/message` 的消息 id，对应聊天区消息动作行的 `messageId`。 */
				messageId: /* @__PURE__ */ optional(/* @__PURE__ */ string())
			})),
			retryableTurns: /* @__PURE__ */ array(/* @__PURE__ */ object({
				turn: NonNegativeIntegerSchema,
				userEventSeq: NonNegativeIntegerSchema,
				preview: /* @__PURE__ */ string(),
				time: NonNegativeIntegerSchema
			})),
			versions: /* @__PURE__ */ array(/* @__PURE__ */ object({
				sessionId: SessionIdSchema,
				parentSessionId: /* @__PURE__ */ optional(SessionIdSchema),
				createdAt: NonNegativeIntegerSchema,
				depth: NonNegativeIntegerSchema,
				current: /* @__PURE__ */ boolean(),
				onCurrentEffectPath: /* @__PURE__ */ boolean(),
				/** 本插件创建的版本才有效果；其他方式派生的分支没有。 */
				effect: /* @__PURE__ */ optional(/* @__PURE__ */ object({
					id: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ uuid()),
					operation: VersionOperationSchema,
					cascade: CascadePolicySchema,
					targetTurn: NonNegativeIntegerSchema,
					targetEventSeq: NonNegativeIntegerSchema,
					targetBlockIndex: /* @__PURE__ */ optional(NonNegativeIntegerSchema),
					blockKind: /* @__PURE__ */ optional(EditableBlockKindSchema),
					before: /* @__PURE__ */ optional(/* @__PURE__ */ string()),
					after: /* @__PURE__ */ optional(/* @__PURE__ */ string())
				}))
			})),
			/** 从当前版本往回、可以逐个撤销的版本，第一个是直接父版本。 */
			undoStack: /* @__PURE__ */ array(SessionIdSchema),
			/** 当前版本的直接子版本，按创建时间升序，最后一个最新。 */
			redoSessionIds: /* @__PURE__ */ array(SessionIdSchema)
		});
		/** 子会话发布、后续输入排队之后 Host 的应答。 */
		const MessageEditOperationResultSchema = /* @__PURE__ */ object({
			sessionId: SessionIdSchema,
			queuedTurns: NonNegativeIntegerSchema
		});
		/** 路由出错时的响应体。 */
		const MessageEditErrorSchema = /* @__PURE__ */ object({ error: /* @__PURE__ */ string() });
		//#endregion
		//#region \0dsh-css:src/client/assistant-actions.module.css.mjs
		const css$7 = ".aM0HKa_failure{min-width:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);text-overflow:ellipsis;white-space:nowrap;flex:0 auto;padding-left:4px;overflow:hidden}";
		const tag$7 = "@agent-stash/dsh-message-edit/assistant-actions.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$7)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-message-edit";
			style.dataset.pluginCss = tag$7;
			style.textContent = css$7;
			document.head.appendChild(style);
		}
		var assistant_actions_module_css_default = { "failure": "aM0HKa_failure" };
		//#endregion
		//#region src/client/class-names.ts
		/** 拼接 CSS Module 类名，跳过未启用的项。 */
		function cx(...names) {
			return names.filter((name) => typeof name === "string" && name !== "").join(" ");
		}
		//#endregion
		//#region \0dsh-css:src/client/controls.module.css.mjs
		const css$6 = ".Pabjua_iconButton,.Pabjua_quiet,.Pabjua_button,.Pabjua_listRow,.Pabjua_field{box-sizing:border-box;transition:color var(--ds-transition-duration-fast) var(--ds-ease-in-out), background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out), border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out), opacity var(--ds-transition-duration-fast) var(--ds-ease-in-out);margin:0}.Pabjua_iconButton,.Pabjua_quiet,.Pabjua_button,.Pabjua_listRow{background:0 0;border:0}.Pabjua_iconButton svg,.Pabjua_quiet svg,.Pabjua_button svg{flex:none}.Pabjua_iconButton[aria-busy=true],.Pabjua_quiet[aria-busy=true],.Pabjua_button[aria-busy=true]{cursor:default}.Pabjua_iconButton{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none;justify-content:center;align-items:center;display:inline-flex}.Pabjua_iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.Pabjua_iconButton:disabled{opacity:.4;cursor:default}.Pabjua_iconButton:focus-visible{outline:var(--message-edit-focus-width) solid var(--dsw-alias-state-business-primary);outline-offset:2px}.Pabjua_iconHeader{corner-shape:round;border-radius:28px;padding:0}.Pabjua_iconHeader:focus-visible{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.Pabjua_iconRow{border-radius:var(--message-edit-radius-sm);padding:6px}.Pabjua_quiet{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);white-space:nowrap;cursor:pointer;flex:none;align-items:center;display:inline-flex}.Pabjua_quiet:disabled{opacity:.4;cursor:default}.Pabjua_quietHeader{border-radius:var(--message-edit-radius-sm);gap:3px;min-height:28px;padding:3px 2px}.Pabjua_quietHeader:hover:not(:disabled),.Pabjua_quietHeader:focus-visible{color:var(--dsw-alias-label-secondary)}.Pabjua_quietHeader:focus-visible{outline:var(--message-edit-focus-width) solid var(--dsw-alias-state-business-primary);outline-offset:2px}.Pabjua_quietToolbar{border-radius:var(--message-edit-radius-sm);gap:4px;height:20px;padding:0 5px}.Pabjua_quietToolbar[role=radio]{padding:0 7px}.Pabjua_quietToolbar:hover:not(:disabled),.Pabjua_quietToolbar[aria-checked=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Pabjua_quietToolbar:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.Pabjua_failed,.Pabjua_failed:hover:not(:disabled),.Pabjua_failed:focus-visible{color:var(--dsw-alias-state-error-primary)}.Pabjua_button{border-radius:var(--message-edit-radius-md);color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);white-space:nowrap;cursor:pointer;flex:none;justify-content:center;align-items:center;gap:4px;padding:0 14px;display:inline-flex}.Pabjua_button:disabled{opacity:.4;cursor:not-allowed}.Pabjua_button:focus-visible{outline:var(--message-edit-focus-width) solid var(--dsw-alias-state-business-primary);outline-offset:2px}.Pabjua_md{height:36px}.Pabjua_sm{border-radius:var(--message-edit-radius-sm);height:28px;font:var(--dsw-font-xxs-12);padding:0 10px}.Pabjua_primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}.Pabjua_primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.Pabjua_outline{border:.5px solid var(--dsw-alias-border-l3)}.Pabjua_outline:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.Pabjua_listRow{border-radius:var(--message-edit-radius-md);width:100%;min-width:0;min-height:34px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);text-align:start;align-items:center;gap:6px;padding:6px 8px;display:flex}button.Pabjua_listRow{cursor:pointer}button.Pabjua_listRow:hover:not(:disabled),button.Pabjua_listRow:focus-visible:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);outline:none}button.Pabjua_listRow:disabled{opacity:.4;cursor:not-allowed}.Pabjua_listRow[aria-current=true]{background:var(--dsw-alias-interactive-bg-active)}.Pabjua_option{flex-direction:column;align-items:stretch;gap:2px}.Pabjua_tree{--message-edit-tree-inset:8px;padding-left:var(--message-edit-tree-inset);align-items:flex-start;gap:8px;position:relative}.Pabjua_tree[data-indent=\"1\"]{--message-edit-tree-inset:20px}.Pabjua_tree[data-indent=\"2\"]{--message-edit-tree-inset:32px}.Pabjua_tree[data-indent=\"3\"]{--message-edit-tree-inset:44px}.Pabjua_tree[data-indent=\"4\"]{--message-edit-tree-inset:56px}.Pabjua_tree[data-indent=\"5\"]{--message-edit-tree-inset:68px}.Pabjua_tree[data-indent=\"6\"]{--message-edit-tree-inset:80px}.Pabjua_tree:before{content:\"\";top:-1px;bottom:-1px;left:calc(var(--message-edit-tree-inset) + 4.5px);background:var(--dsw-alias-border-l2);width:1px;position:absolute}.Pabjua_tree>*{position:relative}.Pabjua_field{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--message-edit-radius-lg);background:var(--dsw-alias-bg-layer-1);width:100%;min-height:160px;max-height:360px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);field-sizing:content;resize:none;padding:12px 14px;display:block}.Pabjua_field::placeholder{color:var(--dsw-alias-label-caption)}.Pabjua_field:focus{border-color:var(--dsw-alias-border-l3);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary);outline:none}.Pabjua_field:read-only{color:var(--dsw-alias-label-dimmed)}.Pabjua_spinner{color:var(--dsw-alias-label-tertiary);flex:none}.Pabjua_spinnerMotion{transform-origin:50%;animation:1.5s linear infinite Pabjua_spin}.Pabjua_spinnerTrack,.Pabjua_spinnerArc{fill:none;stroke:currentColor;stroke-width:2px;stroke-linecap:round}.Pabjua_spinnerTrack{opacity:.25}.Pabjua_spinnerArc{stroke-dasharray:12 150;animation:1.5s ease-in-out infinite Pabjua_dash}@keyframes Pabjua_spin{to{transform:rotate(360deg)}}@keyframes Pabjua_dash{0%{stroke-dasharray:12 150;stroke-dashoffset:0}50%{stroke-dasharray:24 150;stroke-dashoffset:-6px}to{stroke-dasharray:12 150;stroke-dashoffset:0}}.Pabjua_dot{flex:none;width:10px;height:10px;display:inline-block;position:relative}.Pabjua_dot:after{content:\"\";corner-shape:round;background:currentColor;border-radius:50%;position:absolute;inset:20%}.Pabjua_dot[data-tone=current]{color:var(--dsw-alias-state-business-primary)}.Pabjua_dot[data-tone=ancestor]{color:var(--dsw-alias-label-secondary)}.Pabjua_dot[data-tone=other]{color:var(--dsw-alias-label-caption)}.Pabjua_radioGroup{flex:none;align-items:center;gap:2px;display:inline-flex}.Pabjua_radioLabel{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);white-space:nowrap;margin-right:4px}@media (prefers-reduced-motion:reduce){.Pabjua_iconButton,.Pabjua_quiet,.Pabjua_button,.Pabjua_listRow,.Pabjua_field{transition:none}.Pabjua_spinnerMotion,.Pabjua_spinnerArc{animation:none}.Pabjua_spinnerArc{stroke-dasharray:18 150;stroke-dashoffset:-3px}}";
		const tag$6 = "@agent-stash/dsh-message-edit/controls.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$6)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-message-edit";
			style.dataset.pluginCss = tag$6;
			style.textContent = css$6;
			document.head.appendChild(style);
		}
		var controls_module_css_default = {
			"button": "Pabjua_button",
			"dash": "Pabjua_dash",
			"dot": "Pabjua_dot",
			"failed": "Pabjua_failed",
			"field": "Pabjua_field",
			"iconButton": "Pabjua_iconButton",
			"iconHeader": "Pabjua_iconHeader",
			"iconRow": "Pabjua_iconRow",
			"listRow": "Pabjua_listRow",
			"md": "Pabjua_md",
			"option": "Pabjua_option",
			"outline": "Pabjua_outline",
			"primary": "Pabjua_primary",
			"quiet": "Pabjua_quiet",
			"quietHeader": "Pabjua_quietHeader",
			"quietToolbar": "Pabjua_quietToolbar",
			"radioGroup": "Pabjua_radioGroup",
			"radioLabel": "Pabjua_radioLabel",
			"sm": "Pabjua_sm",
			"spin": "Pabjua_spin",
			"spinner": "Pabjua_spinner",
			"spinnerArc": "Pabjua_spinnerArc",
			"spinnerMotion": "Pabjua_spinnerMotion",
			"spinnerTrack": "Pabjua_spinnerTrack",
			"tree": "Pabjua_tree"
		};
		//#endregion
		//#region \0dsh-css:src/client/surface.module.css.mjs
		const css$5 = "._0oN6mq_root{--message-edit-radius-xs:4px;--message-edit-radius-sm:8px;--message-edit-radius-md:12px;--message-edit-radius-lg:16px;--message-edit-radius-panel:28px;--message-edit-focus-width:2px}._0oN6mq_visuallyHidden{clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}";
		const tag$5 = "@agent-stash/dsh-message-edit/surface.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$5)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-message-edit";
			style.dataset.pluginCss = tag$5;
			style.textContent = css$5;
			document.head.appendChild(style);
		}
		var surface_module_css_default = {
			"root": "_0oN6mq_root",
			"visuallyHidden": "_0oN6mq_visuallyHidden"
		};
		function placeTooltip(anchor, bubble, viewport) {
			const center = (anchor.left + anchor.right) / 2;
			const left = Math.max(12, Math.min(center - bubble.width / 2, viewport.width - 12 - bubble.width));
			const below = anchor.bottom + 8;
			const above = anchor.top - 8 - bubble.height;
			return !(below + bubble.height <= viewport.height - 12) && above >= 12 ? {
				left,
				top: above,
				side: "top"
			} : {
				left,
				top: below,
				side: "bottom"
			};
		}
		/** 点 (x, y) 是否在矩形之外；落在边上算在矩形内。 */
		function outsideBox(box, x, y) {
			return x < box.left || x > box.right || y < box.top || y > box.bottom;
		}
		//#endregion
		//#region \0dsh-css:src/client/tooltip.module.css.mjs
		const css$4 = ".D4tala_bubble{box-sizing:border-box;border-radius:var(--message-edit-radius-sm);background:var(--dsw-alias-tooltip-bg);width:max-content;max-width:min(50vw,100vw - 24px);height:auto;max-height:calc(100vh - 24px);color:var(--dsw-static-neutral-bluish-00);font:var(--dsw-font-xs-13);text-align:start;white-space:pre-line;overflow-wrap:break-word;pointer-events:none;animation:D4tala_tooltipIn .15s var(--ds-ease-in-out);border:0;margin:0;padding:3px 7px;position:fixed;inset:auto;overflow:auto}@keyframes D4tala_tooltipIn{0%{opacity:0}}@media (prefers-reduced-motion:reduce){.D4tala_bubble{animation:none}}";
		const tag$4 = "@agent-stash/dsh-message-edit/tooltip.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$4)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-message-edit";
			style.dataset.pluginCss = tag$4;
			style.textContent = css$4;
			document.head.appendChild(style);
		}
		var tooltip_module_css_default = {
			"bubble": "D4tala_bubble",
			"tooltipIn": "D4tala_tooltipIn"
		};
		//#endregion
		//#region src/client/tooltip.tsx
		/**
		* 控件的说明气泡，行为取自宿主 `Tooltip`（`side="bottom"`）：没有显示延迟；指针移入或键盘聚焦
		* （`:focus-visible`）时出现；悬停与聚焦是两个独立的触发源，两者都结束才消失；点击触发元素立即消失。
		*
		* 宿主标题栏的标题行声明了 `container-type`，会成为 `position: fixed` 的包含块；气泡因此用
		* Popover API（`popover="manual"`）进入 top layer，再按触发元素的 `getBoundingClientRect()` 定位，
		* 窗口尺寸变化时重新定位。气泡节点留在插件自己的子树里，不挂到 `document.body`。
		*/
		const IDLE = {
			hover: false,
			focus: false
		};
		/**
		* 显示中的气泡：挂上后进入 top layer 并按触发元素定位，窗口尺寸变化时重新定位。
		* 文字变化时调用方换 `key` 重新挂载，新尺寸随之重新定位。
		*/
		function Bubble({ label, anchor }) {
			const bubble = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const element = bubble.current;
				if (element === null) throw new Error("tooltip bubble is not mounted");
				const fit = () => {
					const { left, right, top, bottom } = anchor.getBoundingClientRect();
					const box = {
						left,
						right,
						top,
						bottom
					};
					const { width, height } = element.getBoundingClientRect();
					const placement = placeTooltip(box, {
						width,
						height
					}, {
						width: window.innerWidth,
						height: window.innerHeight
					});
					element.style.left = `${String(placement.left)}px`;
					element.style.top = `${String(placement.top)}px`;
					element.dataset.side = placement.side;
				};
				element.showPopover();
				fit();
				window.addEventListener("resize", fit);
				return () => {
					window.removeEventListener("resize", fit);
				};
			}, [anchor]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				ref: bubble,
				popover: "manual",
				role: "tooltip",
				className: cx(surface_module_css_default.root, tooltip_module_css_default.bubble),
				children: label
			});
		}
		function Tooltip({ label, children }) {
			const [triggers, setTriggers] = (0, react.useState)(IDLE);
			const [anchor, setAnchor] = (0, react.useState)(null);
			const visible = triggers.hover || triggers.focus;
			const own = children.props;
			const set = (patch) => {
				setTriggers((current) => ({
					...current,
					...patch
				}));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react.cloneElement)(children, {
				onMouseEnter: (event) => {
					own.onMouseEnter?.(event);
					setAnchor(event.currentTarget);
					set({ hover: true });
				},
				onMouseLeave: (event) => {
					own.onMouseLeave?.(event);
					set({ hover: false });
				},
				onClick: (event) => {
					own.onClick?.(event);
					setTriggers(IDLE);
				},
				onFocus: (event) => {
					own.onFocus?.(event);
					if (!event.currentTarget.matches(":focus-visible")) return;
					setAnchor(event.currentTarget);
					set({ focus: true });
				},
				onBlur: (event) => {
					own.onBlur?.(event);
					set({ focus: false });
				}
			}), visible && anchor !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bubble, {
				label,
				anchor
			}, label)] });
		}
		//#endregion
		//#region src/client/view-model.ts
		/** 后续回合策略的两个选项，按界面顺序排列。 */
		const CASCADE_POLICIES = ["truncate", "preserve"];
		/** 块种类的名称。 */
		const BLOCK_LABEL_KEYS = {
			user: "block.user",
			"assistant.reasoning": "block.assistant.reasoning",
			"assistant.response": "block.assistant.response"
		};
		/** 编辑对话框在文本步骤的标题。 */
		const DIALOG_TITLE_KEYS = {
			user: "dialog.title.user",
			"assistant.reasoning": "dialog.title.assistant.reasoning",
			"assistant.response": "dialog.title.assistant.response"
		};
		const CASCADE_LABEL_KEYS = {
			truncate: "cascade.truncate",
			preserve: "cascade.preserve"
		};
		const CASCADE_HINT_KEYS = {
			truncate: "cascade.truncate.hint",
			preserve: "cascade.preserve.hint"
		};
		/** 后续回合策略选项的名称与说明。 */
		function cascadeCopy(t, policy) {
			return {
				label: t(CASCADE_LABEL_KEYS[policy]),
				hint: t(CASCADE_HINT_KEYS[policy])
			};
		}
		/** 有操作在进行，或时间线不是就绪状态时，发起操作的控件都不可用；控制器在这两种情况下也会拒绝操作。 */
		function operationsBlocked(state) {
			return state.pending !== null || state.status !== "ready";
		}
		/** 按回合号升序分组可编辑块与可重试回合。 */
		function turnGroups(timeline) {
			return [.../* @__PURE__ */ new Set([...timeline.messages.map((block) => block.turn), ...timeline.retryableTurns.map((retry) => retry.turn)])].toSorted((left, right) => left - right).map((turn) => ({
				turn,
				retry: timeline.retryableTurns.find((retry) => retry.turn === turn),
				blocks: timeline.messages.filter((block) => block.turn === turn)
			}));
		}
		/** 最后一个已结束回合的回合号；没有回合时为 undefined。 */
		function lastTurn(timeline) {
			const turns = [...timeline.messages.map((block) => block.turn), ...timeline.retryableTurns.map((retry) => retry.turn)];
			return turns.length === 0 ? void 0 : Math.max(...turns);
		}
		/**
		* 找到 `messageId` 对应的助手消息。消息不在时间线里，或所在回合没有用户输入
		* （Host 无法重建这样的回合），都返回 undefined。
		*/
		function messageTarget(timeline, messageId) {
			const own = timeline.messages.filter((block) => block.messageId === messageId);
			const turn = own[0]?.turn;
			if (turn === void 0) return void 0;
			const retry = timeline.retryableTurns.find((candidate) => candidate.turn === turn);
			if (retry === void 0) return void 0;
			return {
				retry,
				choices: [...timeline.messages.filter((block) => block.turn === turn && block.kind === "user"), ...own.toSorted((left, right) => left.blockIndex - right.blockIndex)],
				hasLaterTurns: lastTurn(timeline) !== turn
			};
		}
		/** Host 只重新生成由用户消息触发、带有助手文本的最后一个回合；没有这样的回合时不提供重新生成。 */
		function canReroll(timeline) {
			return timeline.retryableTurns.some((retry) => timeline.messages.some((block) => block.turn === retry.turn && block.kind !== "user"));
		}
		/** 编辑对话框里说明保存后果的一行。 */
		function dialogHintKey(hasLaterTurns, cascade) {
			if (!hasLaterTurns) return "dialog.hint.last";
			return cascade === "truncate" ? "dialog.hint.truncate" : "dialog.hint.preserve";
		}
		/** 与 Host 计算 `redoSessionIds` 相同的规则：带效果的直接子版本里创建最晚的一个。 */
		function newestChild(versions, sessionId) {
			return versions.filter((version) => version.parentSessionId === sessionId && version.effect !== void 0).toSorted((left, right) => left.createdAt - right.createdAt || left.sessionId.localeCompare(right.sessionId)).at(-1)?.sessionId;
		}
		function stepper(timeline) {
			const next = timeline.redoSessionIds.at(-1);
			let forward = 0;
			for (let cursor = next; cursor !== void 0; cursor = newestChild(timeline.versions, cursor)) forward += 1;
			const position = timeline.undoStack.length + 1;
			return {
				previous: timeline.undoStack[0],
				next,
				branches: timeline.redoSessionIds.length,
				position,
				total: position + forward
			};
		}
		function versionRows(timeline) {
			return timeline.versions.map((version) => ({
				version,
				indent: Math.min(version.depth, 6),
				tone: version.current ? "current" : version.onCurrentEffectPath ? "ancestor" : "other"
			}));
		}
		/** 版本行的标题：操作与回合；没有效果的版本按是否有父版本称为原始版本或分支。 */
		function versionTitle(version, t) {
			const effect = version.effect;
			if (effect === void 0) return t(version.parentSessionId === void 0 ? "version.original" : "version.branch");
			const params = { turn: effect.targetTurn };
			if (effect.operation !== "edit") return t(`version.${effect.operation}`, params);
			return t(effect.blockKind === void 0 ? "version.edit" : `version.edit.${effect.blockKind}`, params);
		}
		/** radiogroup 的方向键导航：返回新选中项的下标，其他按键返回 undefined。 */
		function nextRadioIndex(index, key, count) {
			switch (key) {
				case "ArrowLeft":
				case "ArrowUp": return (index - 1 + count) % count;
				case "ArrowRight":
				case "ArrowDown": return (index + 1) % count;
				case "Home": return 0;
				case "End": return count - 1;
				default: return;
			}
		}
		const ROW_GLYPH_SIZE = 15;
		/** 让页面上所有转圈的动画都从文档时间零点开始，彼此同相。 */
		function pinSpinner(element) {
			for (const animation of element.getAnimations({ subtree: true })) animation.startTime = 0;
		}
		function syncSpinner(element) {
			if (element === null) return;
			pinSpinner(element);
			element.addEventListener("animationstart", () => {
				pinSpinner(element);
			});
		}
		/** 进行中的转圈，或版本树的圆点标记。只做装饰，旁边总有文字或无障碍名称。 */
		function StateDot(props) {
			if (props.state !== "ongoing") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: controls_module_css_default.dot,
				"data-tone": props.state,
				"aria-hidden": "true"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				ref: syncSpinner,
				className: controls_module_css_default.spinner,
				width: props.size,
				height: props.size,
				viewBox: "0 0 24 24",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
					className: controls_module_css_default.spinnerMotion,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						className: controls_module_css_default.spinnerTrack,
						cx: "12",
						cy: "12",
						r: "9.5"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						className: controls_module_css_default.spinnerArc,
						cx: "12",
						cy: "12",
						r: "9.5"
					})]
				})
			});
		}
		/** 控件的图形：操作进行中时换成同尺寸的转圈。 */
		function Glyph$1({ icon: IconComponent, size, busy }) {
			return busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateDot, {
				state: "ongoing",
				size
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconComponent, { size });
		}
		function IconButton({ variant, label, icon, busy = false, disabled = false, onClick }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
				label,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: cx(surface_module_css_default.root, controls_module_css_default.iconButton, variant === "header" ? controls_module_css_default.iconHeader : controls_module_css_default.iconRow),
					"aria-label": label,
					"aria-busy": busy || void 0,
					disabled,
					onClick: busy ? void 0 : onClick,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph$1, {
						icon,
						size: variant === "header" ? 14 : ROW_GLYPH_SIZE,
						busy
					})
				})
			});
		}
		/** 透明的文字动作，悬停时才提亮。 */
		function QuietAction({ variant, tooltip, failed = false, children, ...native }) {
			const button = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				...native,
				className: cx(controls_module_css_default.quiet, variant === "header" ? controls_module_css_default.quietHeader : controls_module_css_default.quietToolbar, failed && controls_module_css_default.failed),
				children
			});
			return tooltip === void 0 ? button : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
				label: tooltip,
				children: button
			});
		}
		/** `md`：对话框按钮；`sm` 描边：窗格里的重试。 */
		function Button({ variant, size, children, ...native }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				...native,
				className: cx(controls_module_css_default.button, controls_module_css_default[variant], controls_module_css_default[size]),
				children
			});
		}
		function ListRow({ variant, indent, current = false, autofocus = false, onClick, children }) {
			const className = cx(controls_module_css_default.listRow, controls_module_css_default[variant]);
			if (current) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className,
				"data-indent": indent,
				"aria-current": "true",
				children
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className,
				"data-indent": indent,
				"data-modal-autofocus": autofocus || void 0,
				onClick,
				children
			});
		}
		/** 多行文本框；对话框打开时得到初始焦点，光标放在末尾。 */
		function TextField({ label, value, readOnly, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
				className: controls_module_css_default.field,
				"aria-label": label,
				value,
				readOnly,
				"data-modal-autofocus": "",
				onChange: (event) => {
					onChange(event.currentTarget.value);
				}
			});
		}
		/** 后续回合策略的 radiogroup：方向键在选项间移动并选中，只有选中项在 Tab 序列里。 */
		function CascadeToggle({ t, value, disabled, onChange }) {
			const labelId = (0, react.useId)();
			const onKeyDown = (event) => {
				const index = nextRadioIndex(CASCADE_POLICIES.indexOf(value), event.key, CASCADE_POLICIES.length);
				if (index === void 0 || disabled) return;
				const policy = CASCADE_POLICIES[index];
				if (policy === void 0) throw new Error(`no cascade policy at index ${String(index)}`);
				event.preventDefault();
				onChange(policy);
				event.currentTarget.querySelectorAll("[role=\"radio\"]").item(index).focus();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "radiogroup",
				"aria-labelledby": labelId,
				className: controls_module_css_default.radioGroup,
				onKeyDown,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					id: labelId,
					className: controls_module_css_default.radioLabel,
					children: t("cascade.label")
				}), CASCADE_POLICIES.map((policy) => {
					const copy = cascadeCopy(t, policy);
					const checked = policy === value;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuietAction, {
						variant: "toolbar",
						role: "radio",
						"aria-checked": checked,
						tabIndex: checked ? 0 : -1,
						disabled,
						tooltip: copy.hint,
						onClick: () => {
							onChange(policy);
						},
						children: copy.label
					}, policy);
				})]
			});
		}
		//#endregion
		//#region src/client/composition.ts
		function createCompositionGuard() {
			let composing = false;
			let ended = false;
			return {
				start() {
					composing = true;
				},
				end() {
					composing = false;
					ended = true;
				},
				release() {
					ended = false;
				},
				guards(event) {
					const guarded = composing || ended || event.isComposing;
					ended = false;
					return guarded;
				}
			};
		}
		//#endregion
		//#region \0dsh-css:src/client/dialog.module.css.mjs
		const css$3 = ".pVzT_G_dialog{box-sizing:border-box;border-radius:var(--message-edit-radius-panel);background:var(--dsw-alias-bg-layer-2);width:min(560px,100% - 48px);max-width:none;max-height:calc(100% - 48px);box-shadow:0 0 0 .5px var(--dsw-alias-border-l4), var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);text-align:start;white-space:normal;cursor:auto;border:0;margin:auto;padding:0;overflow:hidden}.pVzT_G_dialog[open]{animation:pVzT_G_modalEnter var(--ds-transition-duration) var(--ds-ease-in-out);flex-direction:column;gap:20px;padding-bottom:24px;display:flex}.pVzT_G_dialog::backdrop{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);animation:pVzT_G_modalEnter var(--ds-transition-duration) var(--ds-ease-in-out)}.pVzT_G_dialog:focus{outline:none}@keyframes pVzT_G_modalEnter{0%{opacity:0}to{opacity:1}}.pVzT_G_content{flex-direction:column;flex:auto;min-height:0;display:flex}.pVzT_G_header{flex:none;justify-content:space-between;align-items:center;gap:8px;padding:22px 14px 12px 24px;display:flex}.pVzT_G_title{min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-base-strong-16);overflow-wrap:anywhere;margin:0}.pVzT_G_close{border-radius:var(--message-edit-radius-sm);width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out), opacity var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;flex:none;justify-content:center;align-items:center;margin:0;padding:0;display:inline-flex}.pVzT_G_close:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.pVzT_G_close:disabled{opacity:.4;cursor:default}.pVzT_G_close:focus-visible{outline:var(--message-edit-focus-width) solid var(--dsw-alias-state-business-primary);outline-offset:2px}.pVzT_G_description{color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);flex:none;margin:0;padding:0 24px}.pVzT_G_body{flex-direction:column;flex:auto;min-width:0;min-height:0;margin-top:18px;padding:2px 24px;display:flex;overflow-y:auto}.pVzT_G_footer{flex:none;justify-content:flex-end;align-items:center;gap:8px;padding:0 24px;display:flex}@media (prefers-reduced-motion:reduce){.pVzT_G_dialog[open],.pVzT_G_dialog::backdrop{animation:none}.pVzT_G_close{transition:none}}";
		const tag$3 = "@agent-stash/dsh-message-edit/dialog.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$3)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-message-edit";
			style.dataset.pluginCss = tag$3;
			style.textContent = css$3;
			document.head.appendChild(style);
		}
		var dialog_module_css_default = {
			"body": "pVzT_G_body",
			"close": "pVzT_G_close",
			"content": "pVzT_G_content",
			"description": "pVzT_G_description",
			"dialog": "pVzT_G_dialog",
			"footer": "pVzT_G_footer",
			"header": "pVzT_G_header",
			"modalEnter": "pVzT_G_modalEnter",
			"title": "pVzT_G_title"
		};
		//#endregion
		//#region src/client/icons.tsx
		function Glyph({ size, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				strokeWidth: 1,
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true",
				children
			});
		}
		/** `IconEditOutlineRegular` */
		function IconEdit({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Glyph, {
				size,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z",
					fill: "currentColor"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M7.7849 8.23878L13.888 2.13574",
					stroke: "currentColor"
				})]
			});
		}
		/** `IconRefreshOutlineRegular` */
		function IconRefresh({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Glyph, {
				size,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1",
					stroke: "currentColor"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M14.4999 1.5V5.1H10.8999",
					stroke: "currentColor"
				})]
			});
		}
		/** `IconChevronLeftOutlineRegular` */
		function IconChevronLeft({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
				size,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M10 4L6.70711 7.29289C6.31658 7.68342 6.31658 8.31658 6.70711 8.70711L10 12",
					stroke: "currentColor"
				})
			});
		}
		/** `IconChevronRightOutlineRegular` */
		function IconChevronRight({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
				size,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M6 12L9.29289 8.70711C9.68342 8.31658 9.68342 7.68342 9.29289 7.29289L6 4",
					stroke: "currentColor"
				})
			});
		}
		/** `IconCloseOutlineRegular` */
		function IconClose({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Glyph, {
				size,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.5 2.5L13.5 13.5",
					stroke: "currentColor"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M13.5 2.5L2.5 13.5",
					stroke: "currentColor"
				})]
			});
		}
		//#endregion
		//#region src/client/dialog.tsx
		/**
		* 模态对话框，结构取自宿主 `Modal.tsx`，键盘行为取自 `useModalLayer.ts`。
		*
		* 对话框是调用方子树里的原生 `<dialog>`：挂上时 `showModal()` 进入 top layer，不受宿主
		* `container-type` 或 transform 祖先影响，也不往 `document.body` 加节点。卸载时 React 先解绑 ref
		* 再移除节点，`close()` 因而在节点仍在文档里时执行，浏览器把焦点还给打开前聚焦的控件。
		* 宿主快捷键据 `role="dialog"` 与 `aria-modal="true"` 判断前台有模态框。
		*
		* 初始焦点给带 `data-modal-autofocus` 的控件，文本框的光标放在末尾；`step` 变化时重新聚焦。
		* `busy` 期间关闭按钮、点击遮罩与 Escape 都不生效。输入法组字期间 Enter 与 Escape 不起作用。
		*/
		/** 聚焦初始控件；文本框的光标放到末尾。 */
		function focusInitial(dialog) {
			const target = dialog.querySelector("[data-modal-autofocus]");
			if (target === null) return;
			target.focus();
			if (target instanceof HTMLTextAreaElement) target.setSelectionRange(target.value.length, target.value.length);
		}
		/** 指针事件是否落在 dialog 的遮罩上：target 是 dialog 自身，且落点在卡片矩形之外。 */
		function onBackdrop(event) {
			return event.target === event.currentTarget && outsideBox(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
		}
		function Dialog({ title, closeLabel, description, step, busy, onClose, onSubmit, children, footer }) {
			const element = (0, react.useRef)(null);
			const pressedOutside = (0, react.useRef)(false);
			const [composition] = (0, react.useState)(createCompositionGuard);
			const attach = (0, react.useCallback)((node) => {
				if (node === null) {
					element.current?.close();
					element.current = null;
					return;
				}
				element.current = node;
				node.showModal();
				focusInitial(node);
			}, []);
			/** 换步骤后把焦点交给新步骤的初始控件。 */
			(0, react.useEffect)(() => {
				const node = element.current;
				if (node === null) throw new Error(`dialog for step ${step} is not mounted`);
				focusInitial(node);
			}, [step]);
			const close = () => {
				if (!busy) onClose();
			};
			const onKeyDown = (event) => {
				const composing = composition.guards(event.nativeEvent);
				if (event.key === "Escape" && composing) {
					event.preventDefault();
					return;
				}
				if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !composing && onSubmit !== void 0) {
					event.preventDefault();
					onSubmit();
				}
			};
			/** Escape 触发的 cancel 一律接管，忙时不关闭。 */
			const onCancel = (event) => {
				event.preventDefault();
				close();
			};
			/** 浏览器强制关闭（连续 Escape 时 cancel 不可取消）后同步状态。 */
			const onNativeClose = (event) => {
				if (!event.currentTarget.open) onClose();
			};
			/**
			* dialog 元素就是卡片，遮罩上的点击也以它为 target；落点在卡片矩形外才算点遮罩。
			* 按下与松开都在遮罩上才关闭，拖选文字越界不算。
			*/
			const onPointerDown = (event) => {
				pressedOutside.current = onBackdrop(event);
			};
			const onClick = (event) => {
				if (pressedOutside.current && onBackdrop(event)) close();
				pressedOutside.current = false;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dialog", {
				ref: attach,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": title,
				"aria-busy": busy || void 0,
				className: cx(surface_module_css_default.root, dialog_module_css_default.dialog),
				onCancel,
				onClose: onNativeClose,
				onKeyDown,
				onKeyUp: () => {
					composition.release();
				},
				onCompositionStart: () => {
					composition.start();
				},
				onCompositionEnd: () => {
					composition.end();
				},
				onPointerDown,
				onClick,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: dialog_module_css_default.content,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: dialog_module_css_default.header,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: dialog_module_css_default.title,
								children: title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: dialog_module_css_default.close,
								"aria-label": closeLabel,
								disabled: busy,
								onClick: close,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconClose, { size: 14 })
							})]
						}),
						description !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: dialog_module_css_default.description,
							children: description
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: dialog_module_css_default.body,
							children
						})
					]
				}), footer !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: dialog_module_css_default.footer,
					children: footer
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/edit-dialog.module.css.mjs
		const css$2 = ".J08Aha_options{flex-direction:column;gap:2px;display:flex}.J08Aha_optionTitle{font:var(--dsw-font-xs-strong-13)}.J08Aha_optionPreview{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.J08Aha_placeholder{color:var(--dsw-alias-label-caption)}.J08Aha_message{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);overflow-wrap:anywhere;margin:8px 0 0}.J08Aha_message[role=status]{color:var(--dsw-alias-label-secondary)}.J08Aha_message[role=alert]{color:var(--dsw-alias-state-error-primary)}.J08Aha_cascade{margin-top:12px;display:flex}";
		const tag$2 = "@agent-stash/dsh-message-edit/edit-dialog.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$2)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-message-edit";
			style.dataset.pluginCss = tag$2;
			style.textContent = css$2;
			document.head.appendChild(style);
		}
		var edit_dialog_module_css_default = {
			"cascade": "J08Aha_cascade",
			"message": "J08Aha_message",
			"optionPreview": "J08Aha_optionPreview",
			"options": "J08Aha_options",
			"optionTitle": "J08Aha_optionTitle",
			"placeholder": "J08Aha_placeholder"
		};
		//#endregion
		//#region src/client/hooks.ts
		/**
		* 组件共用的 React Hook。Hook 都定义在模块顶层，组件每次渲染调用的是同一个函数。
		*/
		/** 订阅一份不可变快照；快照引用变化时组件重新渲染。服务端渲染（组件测试）读同一份快照。 */
		function useSnapshot(store) {
			const subscribe = (0, react.useCallback)((listener) => store.subscribe(listener), [store]);
			const getSnapshot = (0, react.useCallback)(() => store.getSnapshot(), [store]);
			return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
		}
		/** 每隔 `intervalMs` 更新一次的当前时间，供相对时间显示；渲染期间不直接读时钟。 */
		function useNow(intervalMs) {
			const [now, setNow] = (0, react.useState)(Date.now);
			(0, react.useEffect)(() => {
				const timer = setInterval(() => setNow(Date.now()), intervalMs);
				return () => clearInterval(timer);
			}, [intervalMs]);
			return now;
		}
		//#endregion
		//#region src/client/edit-dialog.tsx
		/**
		* 编辑对话框，时间线视图与消息动作按钮共用；只在打开期间挂载。
		*
		* 有多个可编辑块时先显示选项行，选中后在同一张卡片里换成文本步骤；只有一个块时直接进入文本步骤。
		* 块所在回合之后还有回合时，文本步骤里可以切换后续回合策略。保存进行中文本框只读、所有关闭途径
		* 都不生效；保存成功后关闭，失败时保留草稿并显示错误。
		*/
		function EditDialog({ t, store, edit, choices, hasLaterTurns, initialCascade, onClose }) {
			const first = choices[0];
			if (first === void 0) throw new Error("the edit dialog needs at least one block");
			const single = choices.length === 1;
			const state = useSnapshot(store);
			const [block, setBlock] = (0, react.useState)(single ? first : void 0);
			const [draft, setDraft] = (0, react.useState)(single ? first.text : "");
			const [cascade, setCascade] = (0, react.useState)(initialCascade);
			const [saving, setSaving] = (0, react.useState)(false);
			const [failed, setFailed] = (0, react.useState)(false);
			const canSave = block !== void 0 && !saving && !operationsBlocked(state) && draft !== block.text;
			const save = () => {
				if (block === void 0 || !canSave) return;
				setSaving(true);
				setFailed(false);
				edit(block, draft, cascade).then((applied) => {
					if (applied) {
						onClose();
						return;
					}
					setSaving(false);
					setFailed(true);
				});
			};
			if (block === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Dialog, {
				title: t("dialog.title.pick", { turn: first.turn }),
				closeLabel: t("dialog.close"),
				description: t("dialog.pick"),
				step: "pick",
				busy: false,
				onClose,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: edit_dialog_module_css_default.options,
					children: choices.map((choice, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ListRow, {
						variant: "option",
						autofocus: index === 0,
						onClick: () => {
							setBlock(choice);
							setDraft(choice.text);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: edit_dialog_module_css_default.optionTitle,
							children: t(BLOCK_LABEL_KEYS[choice.kind])
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cx(edit_dialog_module_css_default.optionPreview, choice.text === "" && edit_dialog_module_css_default.placeholder),
							children: choice.text === "" ? t("block.empty") : choice.text
						})]
					}, choice.key))
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Dialog, {
				title: t(DIALOG_TITLE_KEYS[block.kind]),
				closeLabel: t("dialog.close"),
				step: block.key,
				busy: saving,
				onClose,
				onSubmit: save,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					!single && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "md",
						disabled: saving,
						onClick: () => {
							setBlock(void 0);
							setFailed(false);
						},
						children: t("dialog.back")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "md",
						disabled: saving,
						onClick: onClose,
						children: t("dialog.cancel")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "primary",
						size: "md",
						disabled: !saving && !canSave,
						"aria-busy": saving || void 0,
						onClick: saving ? void 0 : save,
						children: saving ? t("pending.edit") : t("dialog.save")
					})
				] }),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextField, {
						label: t(BLOCK_LABEL_KEYS[block.kind]),
						value: draft,
						readOnly: saving,
						onChange: setDraft
					}),
					saving ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: edit_dialog_module_css_default.message,
						role: "status",
						children: t("pending.edit")
					}) : failed && state.error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: edit_dialog_module_css_default.message,
						role: "alert",
						children: t("error.save", { error: state.error })
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: edit_dialog_module_css_default.message,
						children: t(dialogHintKey(hasLaterTurns, cascade))
					}),
					hasLaterTurns && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: edit_dialog_module_css_default.cascade,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CascadeToggle, {
							t,
							value: cascade,
							disabled: saving,
							onChange: setCascade
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/assistant-actions.tsx
		/**
		* 助手消息动作行里的按钮（`conversation.chat.assistant-actions`）：编辑在前，重试在后。
		* 编辑打开对话框，可以选择本回合的用户消息或这条消息的思考与回复；重试以截断策略重跑本回合。
		*
		* 时间线还没到时按钮显示为不可用；首次载入失败时按钮不可用，后面跟一行失败提示。这条消息不在
		* 时间线里，或所在回合没有用户输入时不渲染。
		*/
		function noop() {}
		/** 按钮后面的一行状态，过长时省略，完整文字放在 `title` 里。 */
		function StatusLine({ text }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: assistant_actions_module_css_default.failure,
				role: "status",
				title: text,
				children: text
			});
		}
		function AssistantActions({ t, messageId, store, acquire, edit, retry }) {
			(0, react.useEffect)(() => acquire(), [acquire]);
			const state = useSnapshot(store);
			const timeline = state.timeline;
			const target = (0, react.useMemo)(() => timeline === null ? void 0 : messageTarget(timeline, messageId), [timeline, messageId]);
			const [editing, setEditing] = (0, react.useState)(false);
			const [retrying, setRetrying] = (0, react.useState)(false);
			const [failed, setFailed] = (0, react.useState)(false);
			if (timeline === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
					variant: "row",
					label: t("action.edit"),
					icon: IconEdit,
					disabled: true,
					onClick: noop
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
					variant: "row",
					label: t("action.retry"),
					icon: IconRefresh,
					disabled: true,
					onClick: noop
				}),
				state.status === "error" && state.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusLine, { text: t("error.load", { error: state.error }) })
			] });
			if (target === void 0) return null;
			const busy = retrying && state.pending === "retry";
			const onRetry = () => {
				setRetrying(true);
				setFailed(false);
				retry(target.retry.turn, "truncate").then((applied) => {
					setRetrying(false);
					setFailed(!applied);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
					variant: "row",
					label: t("action.edit"),
					icon: IconEdit,
					disabled: state.pending !== null,
					onClick: () => {
						setFailed(false);
						setEditing(true);
					}
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
					variant: "row",
					label: busy ? t("pending.retry") : t("action.retry"),
					icon: IconRefresh,
					busy,
					disabled: !busy && operationsBlocked(state),
					onClick: onRetry
				}),
				failed && state.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusLine, { text: t("error.retry", { error: state.error }) }),
				editing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditDialog, {
					t,
					store,
					edit,
					choices: target.choices,
					hasLaterTurns: target.hasLaterTurns,
					initialCascade: "truncate",
					onClose: () => {
						setEditing(false);
					}
				})
			] });
		}
		//#endregion
		//#region src/client/api.ts
		/** 浏览器端访问 Host 路由：请求与响应都按 shared.ts 的 schema 校验。 */
		async function parseResponse(response, schema) {
			const body = await response.json();
			if (!response.ok) {
				const error = /* @__PURE__ */ safeParse(MessageEditErrorSchema, body);
				throw new Error(error.success ? error.output.error : `${MESSAGE_EDIT_PATH} responded ${response.status}`);
			}
			return parse(schema, body);
		}
		/** 读取一个会话的时间线投影。 */
		async function fetchTimeline(sessionId, signal) {
			const query = new URLSearchParams({ sessionId });
			return parseResponse(await fetch(`${MESSAGE_EDIT_PATH}?${query}`, {
				headers: { accept: "application/json" },
				cache: "no-store",
				signal
			}), MessageEditTimelineSchema);
		}
		/** 提交一次编辑、重新生成或重试，返回新版本会话。 */
		async function postOperation(operation) {
			return parseResponse(await fetch(MESSAGE_EDIT_PATH, {
				method: "POST",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(operation)
			}), MessageEditOperationResultSchema);
		}
		//#endregion
		//#region src/client/store.ts
		function createSnapshotStore(initial) {
			let snapshot = initial;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => snapshot,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				update(next) {
					const value = next(snapshot);
					if (Object.is(value, snapshot)) return;
					snapshot = value;
					for (const listener of listeners) listener();
				}
			};
		}
		//#endregion
		//#region src/client/controller.ts
		/** 一阵连续的会话变化合并成一次刷新。 */
		const REFRESH_DELAY_MS = 300;
		const NOOP = () => {};
		const INITIAL_STATE = {
			status: "idle",
			error: null,
			pending: null,
			timeline: null
		};
		function messageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* 与 `sessionId` 同属一棵版本树的会话及其父子关系，序列化成一个字符串；
		* 版本树增删会话或改变父子关系时它才会变化。
		*/
		function lineageRevision(list, sessionId) {
			const rootOf = (id) => {
				const seen = /* @__PURE__ */ new Set();
				let cursor = id;
				while (!seen.has(cursor)) {
					seen.add(cursor);
					const parent = list.byId[cursor]?.parentId;
					if (parent === void 0 || list.byId[parent] === void 0) return cursor;
					cursor = parent;
				}
				return cursor;
			};
			const root = rootOf(sessionId);
			return list.ids.filter((id) => rootOf(id) === root).toSorted().map((id) => `${id}>${list.byId[id]?.parentId ?? ""}`).join("|");
		}
		/** 会话快照里能反映回合开始与结束的字段。 */
		function sessionRevision(snapshot) {
			return [
				snapshot.running,
				snapshot.openState,
				snapshot.removed
			].join("|");
		}
		/** 打开一个会话：0.1.0-rc.3 用 `sessions.open`，0.2.1 用 `uiWorkspace.openSession`。 */
		function openSession(ctx, sessionId) {
			if (ctx.sessions.open !== void 0) {
				ctx.sessions.open(sessionId);
				return;
			}
			const workspace = ctx.get("uiWorkspace");
			if (workspace === void 0) throw new Error(`cannot open session ${sessionId}: neither sessions.open nor uiWorkspace`);
			workspace.openSession(sessionId);
		}
		/** 会话出现在 Host 会话列表里之后再打开它，避免打开一个列表还不认识的会话。 */
		function openWhenListed(ctx, sessionId) {
			const listed = () => ctx.sessions.list.getSnapshot().ids.includes(sessionId);
			if (listed()) {
				openSession(ctx, sessionId);
				return NOOP;
			}
			const unsubscribe = ctx.sessions.list.subscribe(() => {
				if (!listed()) return;
				unsubscribe();
				openSession(ctx, sessionId);
			});
			return unsubscribe;
		}
		function createMessageEditController(ctx, sessionId) {
			const store = createSnapshotStore(INITIAL_STATE);
			let users = 0;
			let generation = 0;
			let inflight = null;
			let rerun = false;
			let stopObserving = null;
			const navigations = /* @__PURE__ */ new Set();
			const patch = (next) => {
				store.update((state) => ({
					...state,
					...next
				}));
			};
			const load = () => {
				if (inflight !== null) {
					rerun = true;
					return;
				}
				const abort = new AbortController();
				const current = ++generation;
				inflight = abort;
				patch({
					status: "loading",
					error: null
				});
				fetchTimeline(sessionId, abort.signal).then((timeline) => {
					if (current === generation) patch({
						status: "ready",
						error: null,
						timeline
					});
				}, (error) => {
					if (current === generation) patch({
						status: "error",
						error: messageOf(error)
					});
				}).finally(() => {
					if (inflight === abort) inflight = null;
					if (rerun && users > 0) {
						rerun = false;
						load();
					}
				});
			};
			/** 跟随版本树与会话进展刷新；返回的函数撤销全部订阅与计时器。 */
			const observe = () => {
				let timer;
				const schedule = () => {
					if (timer !== void 0 || store.getSnapshot().status === "idle") return;
					timer = setTimeout(() => {
						timer = void 0;
						load();
					}, REFRESH_DELAY_MS);
				};
				let lineage = lineageRevision(ctx.sessions.list.getSnapshot(), sessionId);
				let session;
				let progress = "";
				let unsubscribeSession = NOOP;
				/** 会话打开、关闭或换了绑定对象时，改订新的会话快照。 */
				const bindSession = () => {
					const next = ctx.sessions.binding(sessionId)?.session;
					if (next === session) return;
					unsubscribeSession();
					session = next;
					if (next === void 0) {
						progress = "";
						unsubscribeSession = NOOP;
						return;
					}
					progress = sessionRevision(next.getSnapshot());
					unsubscribeSession = next.subscribe(() => {
						const revision = sessionRevision(next.getSnapshot());
						if (revision === progress) return;
						progress = revision;
						schedule();
					});
				};
				bindSession();
				const unsubscribeList = ctx.sessions.list.subscribe(() => {
					bindSession();
					const revision = lineageRevision(ctx.sessions.list.getSnapshot(), sessionId);
					if (revision === lineage) return;
					lineage = revision;
					schedule();
				});
				return () => {
					if (timer !== void 0) clearTimeout(timer);
					unsubscribeList();
					unsubscribeSession();
					for (const cancel of navigations) cancel();
					navigations.clear();
					generation += 1;
					inflight?.abort();
					inflight = null;
					rerun = false;
				};
			};
			const mutate = async (operation) => {
				const state = store.getSnapshot();
				if (state.pending !== null || state.status !== "ready") return false;
				patch({
					pending: operation.action,
					error: null
				});
				try {
					const result = await postOperation(operation);
					patch({ pending: null });
					navigations.add(openWhenListed(ctx, result.sessionId));
					return true;
				} catch (error) {
					patch({
						pending: null,
						error: messageOf(error)
					});
					return false;
				}
			};
			return {
				face: {
					store,
					acquire() {
						users += 1;
						if (users === 1) {
							stopObserving = ctx.effect(observe, `message-edit: observe ${sessionId}`);
							load();
						}
						let released = false;
						return () => {
							if (released) return;
							released = true;
							users -= 1;
							if (users > 0) return;
							const stop = stopObserving;
							stopObserving = null;
							stop?.();
						};
					},
					load,
					edit: (block, text, cascade) => mutate({
						action: "edit",
						sessionId,
						eventSeq: block.eventSeq,
						blockIndex: block.blockIndex,
						text,
						cascade
					}),
					retry: (turn, cascade) => mutate({
						action: "retry",
						sessionId,
						turn,
						cascade
					}),
					reroll: () => mutate({
						action: "reroll",
						sessionId
					}),
					openVersion: (target) => {
						openSession(ctx, target);
					}
				},
				refreshIfLoaded() {
					if (users > 0 && store.getSnapshot().status !== "idle") load();
				}
			};
		}
		//#endregion
		//#region src/client/format.ts
		/**
		* 界面上的时间、计数、位置与标识符格式，跟随字典声明的界面语言。
		* 时间规则取自宿主消息时钟（ui-chat `message-chrome.ts`）：同一天 `HH:mm`，同一年带月日，跨年带年月日。
		*/
		/** 两版 DSH 内置的界面语言。 */
		const FormatLocaleSchema = /* @__PURE__ */ picklist(["en", "zh"]);
		/** 标识符只显示前 8 个字符，完整值放在 tooltip 里。 */
		const SHORT_ID_LENGTH = 8;
		/** DSH 会话 id 的固定前缀，所有会话都一样，缩写时略去。 */
		const SESSION_ID_PREFIX = "session-";
		/** 当前字典对应的界面语言，取自字典键 `format.locale`。 */
		function formatLocale(t) {
			return parse(FormatLocaleSchema, t("format.locale"));
		}
		function pad2(value) {
			return String(value).padStart(2, "0");
		}
		/** 本地时间的消息时钟：同一天 `HH:mm`，同一年加月日模板，跨年加年月日模板，不显示秒。 */
		function formatClock(time, t, now) {
			const date = new Date(time);
			const today = new Date(now);
			const clock = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
			const sameYear = date.getFullYear() === today.getFullYear();
			if (sameYear && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) return clock;
			const params = {
				y: date.getFullYear(),
				m: date.getMonth() + 1,
				d: date.getDate()
			};
			return `${t(sameYear ? "clock.md" : "clock.ymd", params)} ${clock}`;
		}
		/** 按界面语言格式化的整数。 */
		function formatCount(count, locale) {
			return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(count);
		}
		function formatPlural(t, key, count, locale) {
			return t(`${key}.${new Intl.PluralRules(locale).select(count) === "one" ? "one" : "other"}`, { count: formatCount(count, locale) });
		}
		/** 会话 id 的短形式：去掉公共前缀后的前 8 个字符。 */
		function shortId(id) {
			return (id.startsWith(SESSION_ID_PREFIX) ? id.slice(8) : id).slice(0, SHORT_ID_LENGTH);
		}
		//#endregion
		//#region \0dsh-css:src/client/header-controls.module.css.mjs
		const css$1 = "._0gtNZW_root{flex:none;align-items:center;gap:8px;min-width:0;display:inline-flex}._0gtNZW_stepper{align-items:center;gap:2px;display:inline-flex}._0gtNZW_position{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;white-space:nowrap;padding:0 2px}@container (width<=540px){._0gtNZW_position,._0gtNZW_label{display:none}}";
		const tag$1 = "@agent-stash/dsh-message-edit/header-controls.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag$1)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-message-edit";
			style.dataset.pluginCss = tag$1;
			style.textContent = css$1;
			document.head.appendChild(style);
		}
		var header_controls_module_css_default = {
			"label": "_0gtNZW_label",
			"position": "_0gtNZW_position",
			"root": "_0gtNZW_root",
			"stepper": "_0gtNZW_stepper"
		};
		//#endregion
		//#region src/client/header-controls.tsx
		/**
		* 标题栏控件组（`conversation.session.header.actions`）：上一版本、位置、下一版本与重新生成。
		* 数据到达之前、或没有任何控件可用时不渲染。重新生成失败时文字动作改为失败标签，4 秒后复原。
		*/
		/** 失败标签停留的时长，取自宿主 ui-jobs 的 `KILL_FAILED_MS`。 */
		const HEADER_FAILURE_MS = 4e3;
		function HeaderControls({ t, store, acquire, reroll, openVersion }) {
			(0, react.useEffect)(() => acquire(), [acquire]);
			const state = useSnapshot(store);
			/** 每次失败一个新标记，重新开始计时。 */
			const [failure, setFailure] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const timer = failure === null ? void 0 : setTimeout(() => {
					setFailure(null);
				}, HEADER_FAILURE_MS);
				return () => {
					clearTimeout(timer);
				};
			}, [failure]);
			const timeline = state.timeline;
			if (timeline === null) return null;
			const steps = stepper(timeline);
			const stepping = steps.total > 1;
			const rerollable = canReroll(timeline);
			if (!stepping && !rerollable) return null;
			const locale = formatLocale(t);
			const rerolling = state.pending === "reroll";
			const failed = failure !== null && !rerolling;
			const open = (target) => {
				if (target === void 0) throw new Error("no version to open in this direction");
				openVersion(target);
			};
			const onReroll = () => {
				setFailure(null);
				reroll().then((applied) => {
					if (!applied) setFailure(Symbol("reroll failed"));
				});
			};
			const rerollName = rerolling ? t("pending.reroll") : failed ? t("header.failed") : t("action.reroll");
			const failureDetail = failed && state.error !== null ? t("error.operation", { error: state.error }) : void 0;
			const params = {
				position: formatCount(steps.position, locale),
				total: formatCount(steps.total, locale)
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cx(surface_module_css_default.root, header_controls_module_css_default.root),
				children: [
					stepping && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: header_controls_module_css_default.stepper,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
								variant: "header",
								label: t("action.undo"),
								icon: IconChevronLeft,
								disabled: steps.previous === void 0,
								onClick: () => {
									open(steps.previous);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: header_controls_module_css_default.position,
								"aria-hidden": "true",
								children: t("position.label", params)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: surface_module_css_default.visuallyHidden,
								children: t("position.description", params)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
								variant: "header",
								label: steps.branches > 1 ? formatPlural(t, "action.redoBranches", steps.branches, locale) : t("action.redo"),
								icon: IconChevronRight,
								disabled: steps.next === void 0,
								onClick: () => {
									open(steps.next);
								}
							})
						]
					}),
					rerollable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(QuietAction, {
						variant: "header",
						"aria-label": rerollName,
						"aria-busy": rerolling || void 0,
						tooltip: failureDetail ?? rerollName,
						failed,
						disabled: !rerolling && operationsBlocked(state),
						onClick: rerolling ? void 0 : onReroll,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph$1, {
							icon: IconRefresh,
							size: 14,
							busy: rerolling
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: header_controls_module_css_default.label,
							children: rerolling ? t("pending.reroll") : failed ? t("header.failed") : t("action.rerollShort")
						})]
					}),
					failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: surface_module_css_default.visuallyHidden,
						role: "status",
						children: failureDetail ?? t("header.failed")
					})
				]
			});
		}
		//#endregion
		//#region src/client/locale.ts
		const MESSAGE_EDIT_LOCALE = "message-edit";
		const EN = {
			"format.locale": "en",
			"clock.md": "{m}/{d}",
			"clock.ymd": "{y}-{m}-{d}",
			"view.label": "Timeline",
			"status.loading": "Loading timeline",
			"status.refreshing": "Refreshing",
			"status.reload": "Reload",
			"status.empty": "This session has no finished turns",
			"error.load": "Could not load the timeline: {error}",
			"error.refresh": "Could not refresh the timeline: {error}",
			"error.operation": "Could not create a new version; the current version is unchanged: {error}",
			"error.save": "Could not save the edit; the current version is unchanged: {error}",
			"error.retry": "Could not retry the turn: {error}",
			"header.failed": "Could not regenerate",
			"section.versions": "Versions",
			"versions.count.one": "{count} version",
			"versions.count.other": "{count} versions",
			"position.label": "{position} / {total}",
			"position.description": "Version {position} of {total}",
			"turn.title": "Turn {turn}",
			"turn.emptyInput": "No input",
			"block.user": "Message",
			"block.assistant.reasoning": "Reasoning",
			"block.assistant.response": "Reply",
			"block.empty": "No text",
			"action.edit": "Edit",
			"action.retry": "Retry turn",
			"action.reroll": "Regenerate last reply",
			"action.rerollShort": "Regenerate",
			"action.undo": "Previous version",
			"action.redo": "Next version",
			"action.redoBranches.one": "Newest of {count} next version",
			"action.redoBranches.other": "Newest of {count} next versions",
			"pending.edit": "Saving",
			"pending.reroll": "Regenerating",
			"pending.retry": "Retrying",
			"cascade.label": "Later turns",
			"cascade.truncate": "Drop",
			"cascade.preserve": "Replay",
			"cascade.truncate.hint": "Remove the turns after the changed one",
			"cascade.preserve.hint": "Send the later messages again in order",
			"dialog.title.pick": "Edit turn {turn}",
			"dialog.pick": "Choose the part of this turn to edit.",
			"dialog.title.user": "Edit message",
			"dialog.title.assistant.reasoning": "Edit reasoning",
			"dialog.title.assistant.response": "Edit reply",
			"dialog.hint.last": "Saving creates a new version from this turn. The current version stays unchanged.",
			"dialog.hint.truncate": "Saving creates a new version that ends at this turn. The current version stays unchanged.",
			"dialog.hint.preserve": "Saving creates a new version and sends the later messages again. The current version stays unchanged.",
			"dialog.save": "Save",
			"dialog.cancel": "Cancel",
			"dialog.back": "Back",
			"dialog.close": "Close",
			"version.original": "Original",
			"version.branch": "Branch",
			"version.edit": "Edited turn {turn}",
			"version.edit.user": "Edited message in turn {turn}",
			"version.edit.assistant.reasoning": "Edited reasoning in turn {turn}",
			"version.edit.assistant.response": "Edited reply in turn {turn}",
			"version.reroll": "Regenerated turn {turn}",
			"version.retry": "Retried turn {turn}",
			"version.current": "Current",
			"version.ancestor": "Earlier version",
			"version.before": "Before",
			"version.after": "After"
		};
		const ZH = {
			"format.locale": "zh",
			"clock.md": "{m}月{d}日",
			"clock.ymd": "{y}年{m}月{d}日",
			"view.label": "时间线",
			"status.loading": "正在载入时间线",
			"status.refreshing": "正在刷新",
			"status.reload": "重新载入",
			"status.empty": "这个会话还没有已结束的回合",
			"error.load": "时间线载入失败：{error}",
			"error.refresh": "时间线刷新失败：{error}",
			"error.operation": "新版本创建失败，当前版本保持不变：{error}",
			"error.save": "修改保存失败，当前版本保持不变：{error}",
			"error.retry": "回合重试失败：{error}",
			"header.failed": "重新生成失败",
			"section.versions": "版本",
			"versions.count.one": "{count} 个版本",
			"versions.count.other": "{count} 个版本",
			"position.label": "{position} / {total}",
			"position.description": "第 {position} 个版本，共 {total} 个",
			"turn.title": "回合 {turn}",
			"turn.emptyInput": "无输入",
			"block.user": "消息",
			"block.assistant.reasoning": "思考",
			"block.assistant.response": "回复",
			"block.empty": "无内容",
			"action.edit": "编辑",
			"action.retry": "重试本回合",
			"action.reroll": "重新生成最后的回复",
			"action.rerollShort": "重新生成",
			"action.undo": "上一版本",
			"action.redo": "下一版本",
			"action.redoBranches.one": "{count} 个下一版本中最新的一个",
			"action.redoBranches.other": "{count} 个下一版本中最新的一个",
			"pending.edit": "正在保存",
			"pending.reroll": "正在重新生成",
			"pending.retry": "正在重试",
			"cascade.label": "后续回合",
			"cascade.truncate": "丢弃",
			"cascade.preserve": "重放",
			"cascade.truncate.hint": "移除改动回合之后的回合",
			"cascade.preserve.hint": "按顺序重新发送之后的消息",
			"dialog.title.pick": "编辑回合 {turn}",
			"dialog.pick": "选择这一回合中要编辑的部分。",
			"dialog.title.user": "编辑消息",
			"dialog.title.assistant.reasoning": "编辑思考",
			"dialog.title.assistant.response": "编辑回复",
			"dialog.hint.last": "保存后从这一回合生成新版本，当前版本保持不变。",
			"dialog.hint.truncate": "保存后生成到这一回合为止的新版本，当前版本保持不变。",
			"dialog.hint.preserve": "保存后生成新版本并重新发送之后的消息，当前版本保持不变。",
			"dialog.save": "保存",
			"dialog.cancel": "取消",
			"dialog.back": "返回",
			"dialog.close": "关闭",
			"version.original": "原始版本",
			"version.branch": "分支",
			"version.edit": "编辑了回合 {turn}",
			"version.edit.user": "编辑了回合 {turn} 的消息",
			"version.edit.assistant.reasoning": "编辑了回合 {turn} 的思考",
			"version.edit.assistant.response": "编辑了回合 {turn} 的回复",
			"version.reroll": "重新生成了回合 {turn}",
			"version.retry": "重试了回合 {turn}",
			"version.current": "当前",
			"version.ancestor": "上游版本",
			"version.before": "修改前",
			"version.after": "修改后"
		};
		/** 注册两种语言的字典，返回注销函数。 */
		function registerLocale(locale) {
			const disposers = [locale.register(MESSAGE_EDIT_LOCALE, "en", EN), locale.register(MESSAGE_EDIT_LOCALE, "zh", ZH)];
			return () => {
				for (const dispose of disposers) dispose();
			};
		}
		//#endregion
		//#region \0dsh-css:src/client/timeline-view.module.css.mjs
		const css = ".NU5tZW_root{box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);width:100%;height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;display:flex;overflow:hidden;container-type:inline-size}.NU5tZW_toolbar{z-index:4;box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);flex:none;align-items:center;gap:8px;height:32px;padding:0 6px;display:flex;position:sticky;top:0}.NU5tZW_toolbarActions{flex-wrap:wrap;align-items:center;gap:2px;display:flex}.NU5tZW_refreshing{flex:none;align-items:center;margin-left:auto;padding:0 4px;display:inline-flex}.NU5tZW_notice{border-bottom:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxs-12);overflow-wrap:anywhere;flex:none;margin:0;padding:6px 12px}.NU5tZW_split{flex:1;min-width:0;min-height:0;display:flex;overflow:hidden;container-type:inline-size}.NU5tZW_primary{min-width:0;padding-bottom:calc(var(--dsh-composer-height,152px) + 16px);flex:1;overflow:hidden auto}.NU5tZW_secondary{border-left:.5px solid var(--dsw-alias-border-l2);flex-direction:column;flex:none;width:clamp(320px,38%,440px);min-width:0;max-width:calc(100% - 280px);min-height:0;display:flex}.NU5tZW_paneHeader{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l2);flex:none;justify-content:space-between;align-items:center;gap:8px;height:42px;padding:0 8px 0 12px;display:flex}.NU5tZW_paneTitle{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13);margin:0}.NU5tZW_paneCount{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums}.NU5tZW_treeScroll{min-height:0;padding:8px 8px calc(var(--dsh-composer-height,152px) + 16px);flex:1;overflow:hidden auto}.NU5tZW_statusLine{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);margin:0;padding:16px}.NU5tZW_failure{color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere;flex-wrap:wrap;align-items:center;gap:10px;padding:16px;display:flex}.NU5tZW_failureText{min-width:0;margin:0}.NU5tZW_groupHeader{z-index:1;box-sizing:border-box;background:var(--dsw-alias-button-ghost-active-fill);height:44px;position:sticky;top:0}.NU5tZW_groupInner{box-sizing:border-box;align-items:center;gap:12px;max-width:880px;height:100%;margin:0 auto;padding:0 16px;display:flex}.NU5tZW_groupTitle{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13);font-variant-numeric:tabular-nums;flex:none;margin:0}.NU5tZW_groupPreview{min-width:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.NU5tZW_items{box-sizing:border-box;max-width:880px;margin:0 auto;padding:0;list-style:none}.NU5tZW_item{padding:8px 16px}.NU5tZW_item+.NU5tZW_item{border-top:.5px solid var(--dsw-alias-border-l1)}.NU5tZW_itemHeader{align-items:center;gap:8px;min-height:28px;display:flex}.NU5tZW_itemKind{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);flex:none}.NU5tZW_itemTime{min-width:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;flex:1}.NU5tZW_itemText{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);white-space:pre-wrap;overflow-wrap:anywhere;-webkit-line-clamp:6;-webkit-box-orient:vertical;margin:4px 0 0;display:-webkit-box;overflow:hidden}.NU5tZW_placeholder{color:var(--dsw-alias-label-caption)}.NU5tZW_tree{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.NU5tZW_markerSlot{flex:none;margin-top:5px;display:inline-flex}.NU5tZW_versionMain{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.NU5tZW_versionTitle{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}[aria-current=true]>.NU5tZW_versionMain .NU5tZW_versionTitle{font:var(--dsw-font-xs-strong-13)}.NU5tZW_versionMeta{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.NU5tZW_versionId{font:var(--dsw-font-xxxs-11);font-family:var(--ds-font-family-code);margin-left:6px}.NU5tZW_diffLine{font:var(--dsw-font-xxs-12);white-space:pre-wrap;overflow-wrap:anywhere;-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.NU5tZW_diffBefore{color:var(--dsw-alias-label-tertiary)}.NU5tZW_diffAfter{color:var(--dsw-alias-label-secondary)}.NU5tZW_diffLabel{margin-right:4px}.NU5tZW_skeletonRow{flex-direction:column;gap:8px;padding:12px 16px;display:flex}.NU5tZW_skeletonBar{border-radius:var(--message-edit-radius-xs);background:var(--dsw-alias-bg-skeleton);width:min(280px,85%);height:12px;animation:2s cubic-bezier(.36,0,.64,1) infinite NU5tZW_skeletonPulse;display:block}.NU5tZW_skeletonShort{width:min(144px,60%)}@keyframes NU5tZW_skeletonPulse{0%{opacity:1}40%{opacity:.6}80%,to{opacity:1}}@container (width<=760px){.NU5tZW_toolbar{flex-wrap:wrap;row-gap:4px;height:auto;min-height:32px;padding-block:6px}.NU5tZW_split{flex-direction:column}.NU5tZW_secondary{border-bottom:.5px solid var(--dsw-alias-border-l2);border-left:0;order:-1;width:100%;max-width:none;max-height:40%}.NU5tZW_treeScroll{padding-bottom:8px}}@media (prefers-reduced-motion:reduce){.NU5tZW_skeletonBar{animation:none}}";
		const tag = "@agent-stash/dsh-message-edit/timeline-view.module.css";
		if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag)}]`) === null) {
			const style = document.createElement("style");
			style.dataset.plugin = "@agent-stash/dsh-message-edit";
			style.dataset.pluginCss = tag;
			style.textContent = css;
			document.head.appendChild(style);
		}
		var timeline_view_module_css_default = {
			"diffAfter": "NU5tZW_diffAfter",
			"diffBefore": "NU5tZW_diffBefore",
			"diffLabel": "NU5tZW_diffLabel",
			"diffLine": "NU5tZW_diffLine",
			"failure": "NU5tZW_failure",
			"failureText": "NU5tZW_failureText",
			"groupHeader": "NU5tZW_groupHeader",
			"groupInner": "NU5tZW_groupInner",
			"groupPreview": "NU5tZW_groupPreview",
			"groupTitle": "NU5tZW_groupTitle",
			"item": "NU5tZW_item",
			"itemHeader": "NU5tZW_itemHeader",
			"itemKind": "NU5tZW_itemKind",
			"items": "NU5tZW_items",
			"itemText": "NU5tZW_itemText",
			"itemTime": "NU5tZW_itemTime",
			"markerSlot": "NU5tZW_markerSlot",
			"notice": "NU5tZW_notice",
			"paneCount": "NU5tZW_paneCount",
			"paneHeader": "NU5tZW_paneHeader",
			"paneTitle": "NU5tZW_paneTitle",
			"placeholder": "NU5tZW_placeholder",
			"primary": "NU5tZW_primary",
			"refreshing": "NU5tZW_refreshing",
			"root": "NU5tZW_root",
			"secondary": "NU5tZW_secondary",
			"skeletonBar": "NU5tZW_skeletonBar",
			"skeletonPulse": "NU5tZW_skeletonPulse",
			"skeletonRow": "NU5tZW_skeletonRow",
			"skeletonShort": "NU5tZW_skeletonShort",
			"split": "NU5tZW_split",
			"statusLine": "NU5tZW_statusLine",
			"toolbar": "NU5tZW_toolbar",
			"toolbarActions": "NU5tZW_toolbarActions",
			"tree": "NU5tZW_tree",
			"treeScroll": "NU5tZW_treeScroll",
			"versionId": "NU5tZW_versionId",
			"versionMain": "NU5tZW_versionMain",
			"versionMeta": "NU5tZW_versionMeta",
			"versionTitle": "NU5tZW_versionTitle"
		};
		//#endregion
		//#region src/client/timeline-view.tsx
		/**
		* 时间线视图（`conversation.view`）：工具栏放后续回合策略、版本步进与重新生成；主栏按回合列出
		* 可编辑块，编辑在对话框里进行；副栏是版本树，点击非当前版本切换过去。
		*/
		/** 载入骨架每栏的行数。 */
		const SKELETON_ROWS = [
			0,
			1,
			2
		];
		/** 时间标签只区分今天与更早的日期，每分钟刷新一次当前时间就够了。 */
		const CLOCK_REFRESH_MS = 6e4;
		/** 控件在前侧，刷新状态在后侧。 */
		function Toolbar({ t, state, locale, cascade, onCascade, onReroll, openVersion }) {
			const timeline = state.timeline;
			const steps = timeline === null ? void 0 : stepper(timeline);
			const rerolling = state.pending === "reroll";
			const rerollable = timeline !== null && canReroll(timeline);
			const open = (target) => {
				if (target === void 0) throw new Error("no version to open in this direction");
				openVersion(target);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: timeline_view_module_css_default.toolbar,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CascadeToggle, {
						t,
						value: cascade,
						disabled: timeline === null,
						onChange: onCascade
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_view_module_css_default.toolbarActions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(QuietAction, {
								variant: "toolbar",
								disabled: steps?.previous === void 0,
								onClick: () => {
									open(steps?.previous);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronLeft, { size: 14 }), t("action.undo")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(QuietAction, {
								variant: "toolbar",
								disabled: steps?.next === void 0,
								tooltip: steps !== void 0 && steps.branches > 1 ? formatPlural(t, "action.redoBranches", steps.branches, locale) : void 0,
								onClick: () => {
									open(steps?.next);
								},
								children: [t("action.redo"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronRight, { size: 14 })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(QuietAction, {
								variant: "toolbar",
								"aria-busy": rerolling || void 0,
								disabled: !rerolling && (!rerollable || operationsBlocked(state)),
								onClick: rerolling ? void 0 : onReroll,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph$1, {
									icon: IconRefresh,
									size: 14,
									busy: rerolling
								}), rerolling ? t("pending.reroll") : t("action.reroll")]
							})
						]
					}),
					timeline !== null && state.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: timeline_view_module_css_default.refreshing,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateDot, {
							state: "ongoing",
							size: 14
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: surface_module_css_default.visuallyHidden,
							role: "status",
							children: t("status.refreshing")
						})]
					})
				]
			});
		}
		function TurnGroupView({ t, group, now, retrying, retryBlocked, editBlocked, onRetry, onEdit }) {
			const titleId = (0, react.useId)();
			const retry = group.retry;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"aria-labelledby": titleId,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: timeline_view_module_css_default.groupHeader,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_view_module_css_default.groupInner,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							id: titleId,
							className: timeline_view_module_css_default.groupTitle,
							children: t("turn.title", { turn: group.turn })
						}), retry !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cx(timeline_view_module_css_default.groupPreview, retry.preview === "" && timeline_view_module_css_default.placeholder),
							children: retry.preview === "" ? t("turn.emptyInput") : retry.preview
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							"aria-busy": retrying || void 0,
							disabled: !retrying && retryBlocked,
							onClick: retrying ? void 0 : () => {
								onRetry(group.turn);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph$1, {
								icon: IconRefresh,
								size: 14,
								busy: retrying
							}), retrying ? t("pending.retry") : t("action.retry")]
						})] })]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
					className: timeline_view_module_css_default.items,
					children: group.blocks.map((block) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: timeline_view_module_css_default.item,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_view_module_css_default.itemHeader,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: timeline_view_module_css_default.itemKind,
									children: t(BLOCK_LABEL_KEYS[block.kind])
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: timeline_view_module_css_default.itemTime,
									children: formatClock(block.time, t, now)
								}),
								retry !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
									variant: "row",
									label: t("action.edit"),
									icon: IconEdit,
									disabled: editBlocked,
									onClick: () => {
										onEdit(block);
									}
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: cx(timeline_view_module_css_default.itemText, block.text === "" && timeline_view_module_css_default.placeholder),
							children: block.text === "" ? t("block.empty") : block.text
						})]
					}, block.key))
				})]
			});
		}
		/** 修改前或修改后的一行文字，空值显示占位文案。 */
		function DiffLine({ label, text, t, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: cx(timeline_view_module_css_default.diffLine, className),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: timeline_view_module_css_default.diffLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: cx(text === "" && timeline_view_module_css_default.placeholder),
					children: text === "" ? t("block.empty") : text
				})]
			});
		}
		function VersionContent({ t, version, tone, now }) {
			const effect = version.effect;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: timeline_view_module_css_default.markerSlot,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateDot, { state: tone })
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: timeline_view_module_css_default.versionMain,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: timeline_view_module_css_default.versionTitle,
						children: [
							versionTitle(version, t),
							tone === "current" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: surface_module_css_default.visuallyHidden,
								children: ` ${t("version.current")}`
							}),
							tone === "ancestor" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: surface_module_css_default.visuallyHidden,
								children: ` ${t("version.ancestor")}`
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: timeline_view_module_css_default.versionMeta,
						children: [formatClock(version.createdAt, t, now), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_view_module_css_default.versionId,
							title: version.sessionId,
							children: shortId(version.sessionId)
						})]
					}),
					effect?.before !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffLine, {
						label: t("version.before"),
						text: effect.before,
						t,
						className: timeline_view_module_css_default.diffBefore
					}),
					effect?.after !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffLine, {
						label: t("version.after"),
						text: effect.after,
						t,
						className: timeline_view_module_css_default.diffAfter
					})
				]
			})] });
		}
		function SkeletonRows() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"aria-hidden": "true",
				children: SKELETON_ROWS.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: timeline_view_module_css_default.skeletonRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: cx(timeline_view_module_css_default.skeletonBar, timeline_view_module_css_default.skeletonShort) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: timeline_view_module_css_default.skeletonBar })]
				}, row))
			});
		}
		function PrimaryContent({ t, timeline, state, now, retryingTurn, onRetry, onEdit }) {
			const groups = turnGroups(timeline);
			if (groups.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: timeline_view_module_css_default.statusLine,
				children: t("status.empty")
			});
			return groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TurnGroupView, {
				t,
				group,
				now,
				retrying: retryingTurn === group.turn,
				retryBlocked: operationsBlocked(state),
				editBlocked: state.pending !== null,
				onRetry,
				onEdit
			}, group.turn));
		}
		function TimelineView({ t, store, acquire, load, edit, retry, reroll, openVersion }) {
			(0, react.useEffect)(() => acquire(), [acquire]);
			const state = useSnapshot(store);
			const now = useNow(CLOCK_REFRESH_MS);
			const [cascade, setCascade] = (0, react.useState)("truncate");
			/** 这个视图发起、仍在进行的重试所在的回合。 */
			const [retryingTurn, setRetryingTurn] = (0, react.useState)(null);
			const [editing, setEditing] = (0, react.useState)(null);
			const versionsTitleId = (0, react.useId)();
			const locale = formatLocale(t);
			const timeline = state.timeline;
			const loading = state.status === "idle" || state.status === "loading";
			const primary = timeline !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrimaryContent, {
				t,
				timeline,
				state,
				now,
				retryingTurn: state.pending === "retry" ? retryingTurn : null,
				onRetry: (turn) => {
					setRetryingTurn(turn);
					retry(turn, cascade).finally(() => {
						setRetryingTurn(null);
					});
				},
				onEdit: setEditing
			}) : state.error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: timeline_view_module_css_default.failure,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: timeline_view_module_css_default.failureText,
					role: "alert",
					children: t("error.load", { error: state.error })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: "sm",
					onClick: load,
					children: t("status.reload")
				})]
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: surface_module_css_default.visuallyHidden,
				role: "status",
				children: t("status.loading")
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkeletonRows, {})] });
			const secondary = timeline !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
				className: timeline_view_module_css_default.tree,
				children: versionRows(timeline).map(({ version, tone, indent }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListRow, {
					variant: "tree",
					indent,
					current: version.current,
					onClick: () => {
						openVersion(version.sessionId);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VersionContent, {
						t,
						version,
						tone,
						now
					})
				}) }, version.sessionId))
			}) : loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkeletonRows, {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cx(surface_module_css_default.root, timeline_view_module_css_default.root),
				"data-conversation-composer-overlay": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toolbar, {
						t,
						state,
						locale,
						cascade,
						onCascade: setCascade,
						onReroll: () => {
							reroll();
						},
						openVersion
					}),
					timeline !== null && state.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: timeline_view_module_css_default.notice,
						role: "alert",
						children: state.status === "error" ? t("error.refresh", { error: state.error }) : t("error.operation", { error: state.error })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_view_module_css_default.split,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: timeline_view_module_css_default.primary,
							"aria-busy": loading || void 0,
							children: primary
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: timeline_view_module_css_default.secondary,
							"aria-labelledby": versionsTitleId,
							"aria-busy": loading || void 0,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: timeline_view_module_css_default.paneHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									id: versionsTitleId,
									className: timeline_view_module_css_default.paneTitle,
									children: t("section.versions")
								}), timeline !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: timeline_view_module_css_default.paneCount,
									children: formatPlural(t, "versions.count", timeline.versions.length, locale)
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: timeline_view_module_css_default.treeScroll,
								children: secondary
							})]
						})]
					}),
					editing !== null && timeline !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditDialog, {
						t,
						store,
						edit,
						choices: [editing],
						hasLaterTurns: lastTurn(timeline) !== editing.turn,
						initialCascade: cascade,
						onClose: () => {
							setEditing(null);
						}
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* 浏览器半边入口：给每个会话建一个时间线控制器，向三个 Slot 登记界面。
		*
		* - `conversation.view`：时间线视图，列出回合与版本树。
		* - `conversation.session.header.actions`：标题栏里的版本前后切换与重新生成。
		* - `conversation.chat.assistant-actions`：每条已结束助手消息动作行里的编辑与重试按钮。
		*/
		/** 宿主后台任务按钮的 order 是 20，标题栏控件排在它后面。 */
		const HEADER_ORDER = 25;
		/** 宿主反馈按钮的 order 是 10，编辑与重试按钮排在它后面。 */
		const ASSISTANT_ACTIONS_ORDER = 15;
		/** 两版 DSH 都提供的 Service；打开会话用的 `uiWorkspace` 只在 0.2.1 存在，调用时再取。 */
		const inject = [
			"slots",
			"sessions",
			"locale"
		];
		function apply(ctx) {
			ctx.effect(() => registerLocale(ctx.locale), "message-edit: locale");
			const controllers = /* @__PURE__ */ new Map();
			const faceOf = (sessionId) => {
				let controller = controllers.get(sessionId);
				if (controller === void 0) {
					controller = createMessageEditController(ctx, sessionId);
					controllers.set(sessionId, controller);
				}
				return controller.face;
			};
			ctx.on("connection/reset", () => {
				for (const controller of controllers.values()) controller.refreshIfLoaded();
			});
			const t = ctx.locale.bind(MESSAGE_EDIT_LOCALE);
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "message-edit-timeline",
				order: 15,
				label: () => t("view.label"),
				locale: MESSAGE_EDIT_LOCALE,
				inject: faceOf
			}, TimelineView));
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "message-edit-controls",
				order: HEADER_ORDER,
				locale: MESSAGE_EDIT_LOCALE,
				inject: faceOf
			}, HeaderControls));
			ctx.slots.inject("conversation.chat.assistant-actions", () => ctx.slots.register({
				name: "conversation.chat.assistant-actions",
				id: "message-edit-actions",
				order: ASSISTANT_ACTIONS_ORDER,
				locale: MESSAGE_EDIT_LOCALE,
				inject: faceOf
			}, AssistantActions));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map