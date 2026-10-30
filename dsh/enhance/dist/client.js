window.__ModuleLoader__.load({
	id: "@agent-stash/dsh-enhance",
	factory(require) {
		const exports = {};
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region dsh/shared/client/resources.ts
		function installDictionaries(ctx, ns, dictionaries) {
			for (const [locale, dict] of Object.entries(dictionaries)) ctx.effect(() => ctx.locale.register(ns, locale, dict), `${ns}: ${locale} dictionary`);
		}
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
		function _isValidObjectKey(object$1, key) {
			return Object.prototype.hasOwnProperty.call(object$1, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
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
		function maxValue(requirement, message$1) {
			return {
				kind: "validation",
				type: "max_value",
				reference: maxValue,
				async: false,
				expects: `<=${requirement instanceof Date ? requirement.toJSON() : /* @__PURE__ */ _stringify(requirement)}`,
				requirement,
				message: message$1,
				"~run"(dataset, config$1) {
					if (dataset.typed && !(dataset.value <= this.requirement)) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
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
		function record(key, value$1, message$1) {
			return _standardSchema({
				kind: "schema",
				type: "record",
				reference: record,
				expects: "Object",
				async: false,
				key,
				value: value$1,
				message: message$1,
				"~run"(dataset, config$1) {
					const input = dataset.value;
					if (input && typeof input === "object") {
						dataset.typed = true;
						dataset.value = {};
						for (const entryKey in input) if (/* @__PURE__ */ _isValidObjectKey(input, entryKey)) {
							const entryValue = input[entryKey];
							const keyDataset = this.key["~run"]({ value: entryKey }, config$1);
							if (keyDataset.issues) {
								const pathItem = {
									type: "object",
									origin: "key",
									input,
									key: entryKey,
									value: entryValue
								};
								for (const issue of keyDataset.issues) {
									issue.path = [pathItem];
									dataset.issues?.push(issue);
								}
								if (!dataset.issues) dataset.issues = keyDataset.issues;
								if (config$1.abortEarly) {
									dataset.typed = false;
									break;
								}
							}
							const valueDataset = this.value["~run"]({ value: entryValue }, config$1);
							if (valueDataset.issues) {
								const pathItem = {
									type: "object",
									origin: "value",
									input,
									key: entryKey,
									value: entryValue
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
							if (!keyDataset.typed || !valueDataset.typed) dataset.typed = false;
							if (keyDataset.typed) dataset.value[keyDataset.value] = valueDataset.value;
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
		//#region dsh/shared/client/composer.ts
		function findComposer(anchor) {
			const card = anchor.closest("[data-composer-card]");
			const editable = card?.querySelector("[contenteditable=\"true\"]");
			return card === null || card === void 0 || editable === null || editable === void 0 ? void 0 : {
				card,
				editable
			};
		}
		function useComposer() {
			const [elements, setElements] = (0, react.useState)();
			return [(0, react.useCallback)((node) => {
				setElements(node === null ? void 0 : findComposer(node));
			}, []), elements];
		}
		//#endregion
		//#region dsh/enhance/src/locales.ts
		const en = {
			enhance: "Enhance prompt",
			undo: "Undo enhancement",
			cancel: "Stop enhancing",
			tip: "Click to enhance the prompt",
			tipLinked: "Click to enhance the prompt (last {n} turns linked)",
			tipLinkedOne: "Click to enhance the prompt (last turn linked)",
			estimate: "This rewrite will use about {tokens} tokens",
			estimateLinked: "This rewrite will use about {tokens} tokens, with the last {n} turns linked",
			estimateLinkedOne: "This rewrite will use about {tokens} tokens, with the last turn linked",
			working: "Enhancing…",
			unchanged: "Already clear, nothing changed",
			references: "Remove the reference chips to enhance this draft",
			manage: "Manage presets…",
			"preset.polish": "Polish prompt",
			"preset.polish.hint": "Structure, then expand within your intent in a natural voice",
			"preset.structure": "Structure only",
			"preset.structure.hint": "Reorganize for the AI without changing the meaning",
			"preset.concise": "Make it concise",
			"preset.concise.hint": "Keep the key points, good for dictated text",
			"preset.untitled": "Untitled preset",
			"error.timeout": "No result within {n} s",
			"error.model": "The model request failed",
			"error.truncated": "The result was cut off",
			"error.empty": "The model returned nothing",
			"error.invalid": "Unusable result, draft kept",
			"error.no-model": "No model available",
			"error.preset": "This preset's instructions cannot be used",
			"error.context": "Could not read the session",
			"error.network": "Could not reach DSH",
			dismiss: "Dismiss",
			summary: "Model, session context, shortcut, and presets",
			unavailable: "This DSH does not expose the settings of this plugin.",
			readOnly: "This profile is read-only.",
			saveFailed: "Saving failed. Your changes are kept, try again.",
			save: "Save",
			saving: "Saving…",
			model: "Model",
			modelHint: "Follow the session uses the model and reasoning effort of the current conversation.",
			modelFollow: "Follow the session",
			modelLoading: "Loading models…",
			modelFailed: "Could not load the model list.",
			modelRetry: "Retry",
			modelMissing: "{name} (unavailable)",
			effort: "Reasoning effort",
			effortDefault: "Model default",
			timeout: "Timeout (seconds)",
			contextToggle: "Include recent turns",
			contextHint: "Helps the rewriter resolve words like “this” or “the earlier plan”. Only message text is sent, without tool output, reasoning, or recognizable secrets.",
			contextTurns: "Turns to include",
			shortcut: "Keyboard shortcut",
			shortcutHint: "{keys} opens the menu, stops a running rewrite, or undoes the last one.",
			shortcutNone: "No keys bound. Assign them on the Shortcuts settings page.",
			presets: "Presets",
			presetTitle: "Name",
			presetDescription: "Description",
			presetPrompt: "Instructions",
			presetPromptCustom: "What the rewriter should do with the draft",
			presetUp: "Move up",
			presetDown: "Move down",
			presetRemove: "Remove",
			presetReset: "Restore built-in",
			presetAdd: "Add preset",
			presetEdit: "Edit",
			presetDone: "Done",
			presetNeedsPrompt: "A custom preset needs instructions.",
			presetBuiltin: "Built-in",
			presetBuiltinEdited: "Built-in, edited"
		};
		const zh = {
			enhance: "增强提示词",
			undo: "撤销增强",
			cancel: "停止增强",
			tip: "点我增强提示词",
			tipLinked: "点我增强提示词（已关联最近 {n} 轮上下文）",
			tipLinkedOne: "点我增强提示词（已关联最近 1 轮上下文）",
			estimate: "本轮润色请求将消耗大约 {tokens} Tokens",
			estimateLinked: "本轮润色请求将消耗大约 {tokens} Tokens，已关联最近 {n} 轮上下文",
			estimateLinkedOne: "本轮润色请求将消耗大约 {tokens} Tokens，已关联最近 1 轮上下文",
			working: "正在增强…",
			unchanged: "已经很清楚，无需改动",
			references: "移除草稿里的引用块后才能增强",
			manage: "管理预设…",
			"preset.polish": "润色 Prompt",
			"preset.polish.hint": "先整理结构，再在原意内发散，去掉 AI 腔",
			"preset.structure": "仅结构化整理",
			"preset.structure.hint": "不改原意，整理成 AI 更易理解的结构",
			"preset.concise": "使 Prompt 更精炼",
			"preset.concise.hint": "提炼核心要点，适合整理语音输入",
			"preset.untitled": "未命名预设",
			"error.timeout": "{n} 秒内没有结果",
			"error.model": "模型请求失败",
			"error.truncated": "结果被截断",
			"error.empty": "模型没有返回内容",
			"error.invalid": "结果不可用，已保留原稿",
			"error.no-model": "没有可用的模型",
			"error.preset": "这个预设的改写指令无法使用",
			"error.context": "读取会话失败",
			"error.network": "无法连接 DSH",
			dismiss: "关闭",
			summary: "模型、会话上下文、快捷键与预设",
			unavailable: "当前 DSH 没有开放本插件的配置。",
			readOnly: "当前 profile 只读。",
			saveFailed: "保存失败，改动已保留，请重试。",
			save: "保存",
			saving: "正在保存…",
			model: "模型",
			modelHint: "跟随会话时使用当前对话的模型与推理强度。",
			modelFollow: "跟随会话",
			modelLoading: "正在读取模型列表…",
			modelFailed: "读取模型列表失败。",
			modelRetry: "重试",
			modelMissing: "{name}（不可用）",
			effort: "推理强度",
			effortDefault: "模型默认",
			timeout: "超时（秒）",
			contextToggle: "附带最近几轮对话",
			contextHint: "让改写器理解「这个」「刚才的方案」指的是什么。只发送消息正文，不含工具输出、推理过程和可识别的密钥。",
			contextTurns: "附带轮数",
			shortcut: "快捷键",
			shortcutHint: "按 {keys} 打开菜单；增强进行中按它停止，完成后按它撤销。",
			shortcutNone: "未绑定按键，可在「快捷键」设置页指定。",
			presets: "预设",
			presetTitle: "名称",
			presetDescription: "说明",
			presetPrompt: "改写指令",
			presetPromptCustom: "改写器要怎样处理草稿",
			presetUp: "上移",
			presetDown: "下移",
			presetRemove: "删除",
			presetReset: "恢复内置",
			presetAdd: "添加预设",
			presetEdit: "编辑",
			presetDone: "完成",
			presetNeedsPrompt: "自定义预设需要填写改写指令。",
			presetBuiltin: "内置",
			presetBuiltinEdited: "内置 · 已修改"
		};
		function format(template, values) {
			return template.replace(/\{(\w+)\}/gu, (match, name) => name in values ? String(values[name]) : match);
		}
		//#endregion
		//#region dsh/enhance/src/presets.ts
		const BUILTIN_PRESETS = [
			"polish",
			"structure",
			"concise"
		];
		const DEFAULT_PRESETS = BUILTIN_PRESETS.map((id) => ({
			id,
			title: "",
			description: "",
			prompt: ""
		}));
		function isBuiltin(id) {
			return BUILTIN_PRESETS.includes(id);
		}
		const UNCHANGED = "UNCHANGED";
		const ORGANIZE_STEPS = `- Keep every piece of information: each request, reason, example, constraint, and question.
- Put the main request first. Group the rest by role, such as background, requirements, constraints, and expected output. Use only the groups the draft actually contains.
- Use a numbered list for steps or anything the user ordered, and bullet points for two or more parallel items. Keep a single point as a sentence. If a lead sentence states a count, make it match the number of items.
- Keep the order of steps whose order matters.`;
		const BUILTIN_INSTRUCTIONS = {
			polish: `<mode name="polish">
<goal>First organize the draft as the structure step describes. Then polish it into a fuller prompt that helps the coding assistant think more widely about what the user asked for, while staying inside the user's intent. The result should read as if the user wrote it carefully, not as generated text.</goal>

<step name="structure">
${ORGANIZE_STEPS}
</step>

<step name="expand">
- State the main goal in the first sentence.
- Spell out what the draft implies but leaves unsaid: the scope it names, the expected result, and how to check the result.
- Open up the solution space: ask the assistant to consider alternatives, trade-offs, edge cases, or risks that relate to the stated goal, and to say which option it recommends and why. Phrase these as points to consider, not as new requirements.
- Replace hedging ("maybe", "if you could", "可能", "看看能不能") with direct requests. If the hedge shows real uncertainty about what the user wants, keep it as an open question for the assistant to investigate.
- When the draft changes existing work, ask the assistant to keep the behavior that the change does not target.
- When the draft lacks information the task needs, tell the assistant to state its assumptions or ask before acting. Do not guess the missing values.
</step>

<boundaries>
- Every sentence must trace back to the draft, to the conversation context, or to a general engineering practice that applies to the stated goal, such as measuring before optimizing or adding a test for a fix.
- Do not invent files, APIs, numbers, libraries, product names, deadlines, or decisions.
- At most 3 times the length of the draft, and at most about 250 English words or 500 Chinese characters.
- Use short paragraphs or lists. Markdown lists and inline code are fine. Use headings only when the draft has several separate parts.
</boundaries>

<style>
Write the sentences you add or change without AI writing patterns, and keep the user's voice. Apply the pattern lists and principles of the style guides below to your own wording. Their workflows, their output formats, and their instructions to ask the user questions, to add a "What changed" section, or to edit files do not apply here: <output_format> decides what you return, and <rules> keep their priority.
- The draft is the writer's voice sample. Match its tone, directness, and level of formality.
- The draft and the conversation context are the working session. Options the user dropped or corrected stay out of the result, and the result does not mention why they are gone.
<include ref="humanizer" />
<include ref="no-ai-slop" />
<include ref="no-negative-echo" />
</style>

<example>
<draft_prompt>登录页好像有点慢，看看能不能优化一下</draft_prompt>
<good_result>In Chinese: asks to find out why the login page loads slowly and fix it; asks the assistant to measure first and name the main causes, to compare a few fixes and recommend one, and to keep the current login behavior unchanged. It names no file and no target time, because the draft names none.</good_result>
</example>
</mode>`,
			structure: `<mode name="structure">
<goal>Reorganize the draft so the coding assistant can parse it quickly. Do not change what it says.</goal>

<steps>
${ORGANIZE_STEPS}
- Keep the user's wording. You may fix obvious typos and punctuation, remove pure filler words and word-for-word repeats, and split run-on sentences.
</steps>

<do_not>
- Rephrase for style, change the tone, or make the text more formal.
- Add titles or labels the content does not need. A short label in front of a group is fine when there are three or more groups.
- Add, drop, or merge points. Do not make vague wording more specific, except where the context-for-references rule resolves a reference.
</do_not>

<limits>The result is about as long as the draft.</limits>
</mode>`,
			concise: `<mode name="concise">
<goal>The draft is often raw speech-to-text. Pull out its core points and state each one briefly.</goal>

<steps>
- Remove filler words, hesitations, false starts, and repeated phrases. Keep repetition that is clearly for emphasis.
- When the user corrects themselves ("no wait", "I mean", "actually make it", "不对", "改成", "应该是", "算了"), keep only the final version and drop both the discarded part and the correction marker. If a correction changes a count ("three things" but only two remain), update the count.
- "Not A but B" without a correction marker is a deliberate contrast. Keep it. "Don't change it to X" is a real negation. Keep it.
- Merge points that say the same thing. Keep every distinct point, constraint, and question.
- Fix obvious speech-recognition errors only when the context or common technical vocabulary makes the intended word certain. Otherwise keep the word as written.
- Write spoken numbers as digits.
- For one point, write one sentence. For two or more distinct points, write a lead sentence and then a list: numbered if the user gave an order, bullets otherwise. Keep requests as requests and questions as questions.
</steps>

<limits>The result is shorter than the draft. If the draft is already minimal, output ${UNCHANGED}. Add nothing that was not said.</limits>

<example>
<draft_prompt>嗯那个你帮我把 config.ts 里的超时，呃，改成 30 秒，不对，60 秒吧，然后就是那个，日志也加一下，加在 retry 那里，对，retry 那里</draft_prompt>
<good_result>把 \`config.ts\` 里的超时改成 60 秒，并在 retry 处加日志。</good_result>
</example>
</mode>`
		};
		function editablePrompt(preset) {
			if (preset.prompt !== "" || !isBuiltin(preset.id)) return preset.prompt;
			return BUILTIN_INSTRUCTIONS[preset.id];
		}
		function storedPrompt(id, text) {
			return isBuiltin(id) && text.trim() === BUILTIN_INSTRUCTIONS[id].trim() ? "" : text;
		}
		//#endregion
		//#region dsh/enhance/src/wire.ts
		const REWRITE_PATH = "/dsh-enhance/rewrite";
		const CONTEXT_PATH = "/dsh-enhance/context";
		const NonEmptySchema = /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ minLength(1));
		const SessionModelSchema = /* @__PURE__ */ object({
			provider: NonEmptySchema,
			model: NonEmptySchema,
			reasoningEffort: /* @__PURE__ */ optional(NonEmptySchema)
		});
		const RewriteResultSchema = /* @__PURE__ */ object({
			text: /* @__PURE__ */ string(),
			unchanged: /* @__PURE__ */ boolean(),
			turns: /* @__PURE__ */ number()
		});
		const ContextResultSchema = /* @__PURE__ */ object({
			turns: /* @__PURE__ */ number(),
			tokens: /* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ number())
		});
		const FailureSchema = /* @__PURE__ */ object({
			reason: /* @__PURE__ */ picklist([
				"timeout",
				"model",
				"truncated",
				"empty",
				"invalid",
				"no-model",
				"preset",
				"context"
			]),
			message: /* @__PURE__ */ string()
		});
		//#endregion
		//#region dsh/enhance/src/request.ts
		function relative(path) {
			return path.slice(1);
		}
		async function requestRewrite(payload, signal) {
			let response;
			try {
				response = await fetch(relative(REWRITE_PATH), {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify(payload),
					signal
				});
			} catch (error) {
				if (signal.aborted) throw error;
				return {
					ok: false,
					reason: "network",
					message: `POST ${REWRITE_PATH}: ${String(error)}`
				};
			}
			const body = await response.json().catch(() => void 0);
			if (response.ok) {
				const parsed = /* @__PURE__ */ safeParse(RewriteResultSchema, body);
				if (parsed.success) return {
					ok: true,
					value: parsed.output
				};
				return {
					ok: false,
					reason: "network",
					message: `POST ${REWRITE_PATH}: unexpected response`
				};
			}
			const failure = /* @__PURE__ */ safeParse(FailureSchema, body);
			if (failure.success) return {
				ok: false,
				...failure.output
			};
			const message = typeof body === "object" && body !== null && "message" in body ? String(body.message) : response.statusText;
			return {
				ok: false,
				reason: "network",
				message: `POST ${REWRITE_PATH} ${String(response.status)}: ${message}`
			};
		}
		async function requestContext(sessionId, signal) {
			const url = `${relative(CONTEXT_PATH)}?session=${encodeURIComponent(sessionId)}`;
			const response = await fetch(url, {
				headers: { accept: "application/json" },
				signal
			});
			if (!response.ok) throw new Error(`GET ${CONTEXT_PATH} answered ${String(response.status)}`);
			return parse(ContextResultSchema, await response.json());
		}
		//#endregion
		//#region dsh/enhance/src/state.ts
		const IDLE = { kind: "idle" };
		function followDraft(state, draft) {
			if (state.kind === "running") return draft === state.source ? void 0 : IDLE;
			if (state.kind === "note") return draft === state.draft ? void 0 : IDLE;
			if (state.kind !== "done") return void 0;
			if (state.applied === void 0) return draft === state.before ? void 0 : {
				...state,
				applied: draft
			};
			return draft === state.applied ? void 0 : IDLE;
		}
		//#endregion
		//#region dsh/enhance/src/store.ts
		function createValueStore(initial, same = Object.is) {
			let value = initial;
			const listeners = /* @__PURE__ */ new Set();
			return {
				get: () => value,
				set(next) {
					if (same(value, next)) return;
					value = next;
					for (const listener of listeners) listener();
				},
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				}
			};
		}
		function useValue(store) {
			return (0, react.useSyncExternalStore)(store.subscribe, store.get);
		}
		//#endregion
		//#region dsh/enhance/src/styles.ts
		const K = "dsh-enhance";
		const BUSY = `data-${K}-busy`;
		const MENU_CLASS = `${K}-menu`;
		const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
		function enhanceCss() {
			const p = `.${K}`;
			return `
${p}-root {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
${p}-button {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
@media (hover: hover) {
  ${p}-button:hover {
    background: var(--dsw-alias-interactive-bg-hover);
    color: var(--dsw-alias-label-secondary);
  }
}
${p}-button[aria-expanded="true"],
${p}-button[data-state="running"],
${p}-button[data-state="done"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
}
${p}-button[aria-disabled="true"] {
  opacity: 0.4;
  cursor: default;
}
${p}-button:focus-visible {
  outline-style: solid;
  outline-offset: 1px;
}
${p}-button:active:not([aria-disabled="true"]) {
  transform: scale(0.94);
}
${p}-icon {
  display: grid;
  place-items: center;
}
${p}-running {
  display: grid;
}
${p}-running > span {
  display: grid;
  place-items: center;
  grid-area: 1 / 1;
}
${p}-spin svg {
  animation: ${K}-spin 900ms linear infinite;
}
${p}-stop {
  opacity: 0;
}
@media (hover: hover) {
  ${p}-button:hover ${p}-spin {
    opacity: 0;
  }
  ${p}-button:hover ${p}-stop {
    opacity: 1;
  }
}
${p}-button:focus-visible ${p}-spin {
  opacity: 0;
}
${p}-button:focus-visible ${p}-stop {
  opacity: 1;
}
${p}-root[data-motion="lively"] ${p}-button {
  animation: ${K}-pop 200ms ${EASE_OUT};
}
${p}-root[data-motion="lively"] ${p}-icon {
  animation: ${K}-icon 180ms ${EASE_OUT};
}
${p}-root[data-motion="subtle"] ${p}-button {
  animation: ${K}-fade 140ms ease;
}
${p}-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 240px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
${p}-status svg {
  flex: none;
}
${p}-status[data-tone="error"] {
  color: var(--dsw-alias-state-error-primary);
}
${p}-status-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
${p}-root[data-motion="lively"] ${p}-status {
  animation: ${K}-status 180ms ${EASE_OUT};
}
${p}-root[data-motion="subtle"] ${p}-status {
  animation: ${K}-fade 140ms ease;
}
${p}-dismiss {
  display: grid;
  place-items: center;
  flex: none;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
}
@media (hover: hover) {
  ${p}-dismiss:hover {
    opacity: 1;
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
${p}-dismiss:focus-visible {
  outline-style: solid;
}
@container (max-width: 480px) {
  ${p}-status {
    max-width: 120px;
  }
}
${p}-menu {
  min-width: 248px;
}
${p}-estimate {
  box-sizing: border-box;
  width: 0;
  min-width: 100%;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 15px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}
${p}-row-slot {
  display: contents;
}
${p}-row {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
${p}-row-title {
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-row-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
[data-composer-card][${BUSY}] [contenteditable="true"] {
  animation: ${K}-dim 200ms ease forwards;
  cursor: progress;
}
@keyframes ${K}-spin {
  to { transform: rotate(360deg); }
}
@keyframes ${K}-pop {
  from { opacity: 0; transform: scale(0.8); filter: blur(2px); }
}
@keyframes ${K}-icon {
  from { opacity: 0; transform: scale(0.6); filter: blur(2px); }
}
@keyframes ${K}-status {
  from { opacity: 0; transform: translateX(4px); filter: blur(1px); }
}
@keyframes ${K}-fade {
  from { opacity: 0; }
}
@keyframes ${K}-dim {
  to { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  ${p}-root[data-motion] ${p}-button,
  ${p}-root[data-motion] ${p}-status {
    animation: ${K}-fade 140ms ease;
  }
  ${p}-root[data-motion] ${p}-icon {
    animation: none;
  }
  ${p}-button:active:not([aria-disabled="true"]) {
    transform: none;
  }
}
${settingsCss(p)}`;
		}
		function settingsCss(p) {
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
${p}-field-stack {
  flex-direction: column;
  align-items: stretch;
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
${p}-field-hint,
${p}-notice {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-invalid,
${p}-catalog-error {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-state-error-primary);
}
${p}-catalog-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
${p}-number {
  width: 96px;
}
${p}-models {
  display: grid;
  gap: 2px;
  min-width: 0;
  max-height: 300px;
  margin: 0;
  padding: 6px;
  overflow: auto;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-lg);
}
${p}-model-group {
  display: grid;
  gap: 2px;
}
${p}-model-group + ${p}-model-group {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 0.5px solid var(--dsw-alias-border-l3);
}
${p}-provider {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-model {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px;
  border-radius: var(--dsw-radius-md);
  cursor: pointer;
}
@media (hover: hover) {
  ${p}-model:hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
${p}-model-name,
${p}-model-route {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
${p}-model-name {
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-model-route {
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-presets {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}
${p}-preset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
${p}-preset {
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-lg);
}
${p}-preset-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 6px 8px 6px 12px;
}
${p}-preset-index {
  flex: none;
  width: 16px;
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}
${p}-preset-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
${p}-preset-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-preset-title-text,
${p}-preset-hint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
${p}-preset-tag {
  flex: none;
  padding: 0 5px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-interactive-bg-hover);
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary);
}
${p}-preset-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-preset-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
}
${p}-icon-button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
@media (hover: hover) {
  ${p}-icon-button:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
${p}-icon-button:disabled {
  opacity: 0.35;
  cursor: default;
}
${p}-icon-button:focus-visible {
  outline-style: solid;
}
${p}-preset-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 12px 12px;
}
${p}-preset-label {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}
${p}-preset-form > span {
  width: 100%;
  box-sizing: border-box;
}
${p}-textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 132px;
  padding: 8px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  outline: none;
  background: var(--dsw-alias-bg-layer-1);
  font: inherit;
  font-family: var(--ds-font-family-code, ui-monospace, monospace);
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  resize: vertical;
  field-sizing: content;
  max-height: 480px;
}
${p}-textarea:focus {
  border-color: var(--dsw-alias-state-business-primary);
}
${p}-textarea[aria-invalid="true"] {
  border-color: var(--dsw-alias-state-error-primary);
}
${p}-textarea::placeholder {
  color: var(--dsw-alias-label-dimmed);
}
${p}-preset-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
${p}-add {
  align-self: flex-start;
}
`;
		}
		//#endregion
		//#region dsh/enhance/src/tokens.ts
		const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
		function estimateTokens(text) {
			const wide = text.match(WIDE)?.length ?? 0;
			const all = text.match(/[\s\S]/gu)?.length ?? 0;
			return Math.ceil(wide * .6 + (all - wide) * .3);
		}
		const GROUPED = new Intl.NumberFormat("en-US");
		function formatTokens(tokens) {
			return GROUPED.format(tokens);
		}
		//#endregion
		//#region dsh/enhance/src/button.tsx
		const NUMBERED = 9;
		const INFO_MS = 4e3;
		function presetLabel(preset, t) {
			const builtin = isBuiltin(preset.id) ? preset.id : void 0;
			const custom = preset.title.trim() !== "";
			return {
				title: custom ? preset.title : builtin === void 0 ? t("preset.untitled") : t(`preset.${builtin}`),
				hint: preset.description.trim() !== "" ? preset.description : builtin !== void 0 && !custom ? t(`preset.${builtin}.hint`) : ""
			};
		}
		function tipLabel(turns, t) {
			if (turns === void 0 || turns === 0) return t("tip");
			return turns === 1 ? t("tipLinkedOne") : format(t("tipLinked"), { n: turns });
		}
		function estimateLabel(context, preset, draft, t) {
			const base = preset === void 0 ? void 0 : context?.tokens[preset];
			if (context === void 0 || base === void 0) return void 0;
			const values = {
				tokens: formatTokens(base + estimateTokens(draft)),
				n: context.turns
			};
			if (context.turns === 0) return format(t("estimate"), values);
			return format(t(context.turns === 1 ? "estimateLinkedOne" : "estimateLinked"), values);
		}
		function modelKey(view) {
			const next = view?.next;
			return next === null || next === void 0 ? void 0 : JSON.stringify(next);
		}
		function parseModel(key) {
			return key === void 0 ? void 0 : parse(SessionModelSchema, JSON.parse(key));
		}
		function useContext(sessionId, active, key) {
			const [context, setContext] = (0, react.useState)();
			const stamp = `${sessionId}:${key}`;
			(0, react.useEffect)(() => {
				if (!active) return void 0;
				const controller = new AbortController();
				requestContext(sessionId, controller.signal).then((value) => setContext({
					key: stamp,
					value
				}), (error) => {
					if (controller.signal.aborted) return;
					console.error(`[${K}] reading the context of session "${sessionId}" failed:`, error);
				});
				return () => controller.abort();
			}, [
				sessionId,
				active,
				stamp
			]);
			return active && context?.key === stamp ? context.value : void 0;
		}
		function focusEnd(editable) {
			if (!editable.isConnected) return;
			editable.focus();
			const selection = editable.ownerDocument.getSelection();
			selection?.selectAllChildren(editable);
			selection?.collapseToEnd();
		}
		function createEnhanceButton(kit, shared) {
			return function EnhanceButton({ sessionId, useInput, inputActions, useProjection, t }) {
				const [anchor, composer] = useComposer();
				const button = (0, react.useRef)(null);
				const draft = useInput((state) => state.draft);
				const plain = useInput((state) => state.phase === "plain");
				const references = useInput((state) => state.occurrences.length > 0);
				const stamp = useProjection("sessionListMetadata", (value) => value?.lastPromptAt ?? null);
				const sessionModel = useProjection("modelSelection", modelKey);
				const settings = useValue(shared.settings);
				const keys = useValue(shared.shortcut.keys);
				const motion = useValue(kit.appearance).motion;
				const [state, setState] = (0, react.useState)(IDLE);
				const [owner, setOwner] = (0, react.useState)(sessionId);
				const [open, setOpen] = (0, react.useState)(false);
				const moved = owner === sessionId ? void 0 : IDLE;
				if (moved !== void 0) setOwner(sessionId);
				const followed = moved ?? followDraft(state, draft);
				if (followed !== void 0) setState(followed);
				const current = followed ?? state;
				const empty = draft.trim() === "";
				const context = useContext(sessionId, !empty, JSON.stringify([
					stamp,
					settings.context,
					settings.contextTurns,
					settings.presets
				]));
				const [pointed, setPointed] = (0, react.useState)();
				if (!open && pointed !== void 0) setPointed(void 0);
				const running = current.kind === "running";
				(0, react.useLayoutEffect)(() => {
					if (!running || composer === void 0) return void 0;
					const { card, editable } = composer;
					editable.inert = true;
					editable.setAttribute("aria-busy", "true");
					card.setAttribute(BUSY, "");
					button.current?.focus();
					const onKeyDown = (event) => {
						if (event.key !== "Escape" || event.isComposing) return;
						event.preventDefault();
						event.stopPropagation();
						setState(IDLE);
						requestAnimationFrame(() => focusEnd(editable));
					};
					card.addEventListener("keydown", onKeyDown, true);
					return () => {
						card.removeEventListener("keydown", onKeyDown, true);
						editable.inert = false;
						editable.removeAttribute("aria-busy");
						card.removeAttribute(BUSY);
					};
				}, [running, composer]);
				const controller = current.kind === "running" ? current.controller : void 0;
				(0, react.useEffect)(() => controller === void 0 ? void 0 : () => controller.abort(), [controller]);
				const info = current.kind === "note" && current.note.tone === "info";
				(0, react.useEffect)(() => {
					if (!info) return void 0;
					const timer = setTimeout(() => setState(IDLE), INFO_MS);
					return () => clearTimeout(timer);
				}, [info]);
				const focusEditor = () => {
					if (composer !== void 0) focusEnd(composer.editable);
				};
				const run = (preset) => {
					setOpen(false);
					fromShortcut.current = false;
					const source = draft;
					const original = current.kind === "done" ? current.original : source;
					const request = new AbortController();
					setState({
						kind: "running",
						source,
						original,
						controller: request
					});
					const model = parseModel(sessionModel);
					requestRewrite({
						session: sessionId,
						preset: preset.id,
						draft: source,
						...model === void 0 ? {} : { model }
					}, request.signal).then((response) => {
						if (request.signal.aborted) return;
						if (!response.ok) setState({
							kind: "note",
							draft: source,
							note: {
								tone: "error",
								reason: response.reason,
								detail: response.message
							}
						});
						else if (response.value.unchanged) setState({
							kind: "note",
							draft: source,
							note: {
								tone: "info",
								reason: "unchanged"
							}
						});
						else {
							setState({
								kind: "done",
								original,
								before: source,
								applied: void 0
							});
							inputActions.setDraft(response.value.text);
							if (composer !== void 0) kit.swapDraft(composer.card, "restore");
						}
						requestAnimationFrame(focusEditor);
					}, (error) => {
						if (request.signal.aborted) return;
						console.error(`[${K}] the rewrite request failed:`, error);
						setState({
							kind: "note",
							draft: source,
							note: {
								tone: "error",
								reason: "network",
								detail: String(error)
							}
						});
						requestAnimationFrame(focusEditor);
					});
				};
				const undo = (original) => {
					setState(IDLE);
					inputActions.setDraft(original);
					if (composer !== void 0) kit.swapDraft(composer.card, "restore");
					requestAnimationFrame(focusEditor);
				};
				const stop = () => {
					setState(IDLE);
					requestAnimationFrame(focusEditor);
				};
				const presets = settings.presets;
				const blocked = references || !plain || presets.length === 0;
				const toggleMenu = () => {
					if (current.kind === "running") stop();
					else if (!blocked) setOpen(!open);
				};
				const fromShortcut = (0, react.useRef)(false);
				const closeMenu = () => {
					setOpen(false);
					if (!fromShortcut.current) return;
					fromShortcut.current = false;
					requestAnimationFrame(focusEditor);
				};
				const shortcut = () => {
					if (current.kind === "done") undo(current.original);
					else if (current.kind === "running") stop();
					else if (open) closeMenu();
					else if (!blocked) {
						fromShortcut.current = true;
						button.current?.focus();
						setOpen(true);
					}
				};
				const latest = (0, react.useRef)(shortcut);
				(0, react.useLayoutEffect)(() => {
					latest.current = shortcut;
				});
				const card = composer?.card;
				const visible = !empty || running;
				(0, react.useEffect)(() => {
					if (card === void 0 || !visible) return void 0;
					return shared.shortcut.attach({
						card,
						trigger: () => latest.current()
					});
				}, [card, visible]);
				if (!visible) return null;
				const onMenuKeyDown = (event) => {
					if (!open || event.metaKey || event.ctrlKey || event.altKey) return;
					const index = Number.parseInt(event.key, 10) - 1;
					const preset = index >= 0 && index < NUMBERED ? presets[index] : void 0;
					if (preset === void 0) return;
					event.preventDefault();
					run(preset);
				};
				const tooltip = running ? t("cancel") : references ? t("references") : tipLabel(context?.turns, t);
				const estimate = estimateLabel(context, pointed ?? presets[0]?.id, draft, t);
				const trigger = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: tooltip,
					shortcutKeys: running ? ["Esc"] : keys.length > 0 && current.kind !== "done" ? keys : void 0,
					side: "top",
					delayMs: 400,
					portal: true,
					disabled: open,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						ref: button,
						type: "button",
						className: `${K}-button`,
						"data-state": running ? "running" : "idle",
						"aria-label": running ? t("cancel") : t("enhance"),
						"aria-haspopup": running ? void 0 : "menu",
						"aria-expanded": open,
						"aria-disabled": !running && blocked,
						onClick: toggleMenu,
						children: running ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: `${K}-icon ${K}-running`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${K}-spin`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, { size: 16 })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${K}-stop`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconStopFillRegular, { size: 12 })
							})]
						}, "running") : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${K}-icon`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkleRegular, { size: 16 })
						}, "idle")
					})
				});
				const manage = open ? shared.settingsLink() : void 0;
				const rows = presets.map((preset, index) => {
					const { title, hint } = presetLabel(preset, t);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: `${K}-row-slot`,
						onPointerEnter: () => setPointed(preset.id),
						onFocus: () => setPointed(preset.id),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
							...index < NUMBERED ? { shortcut: { keys: [String(index + 1)] } } : {},
							onSelect: () => run(preset),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: `${K}-row`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${K}-row-title`,
									children: title
								}), hint !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `dsh-enhance-row-hint`,
									children: hint
								})]
							})
						})
					}, preset.id);
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: anchor,
					className: `${K}-root`,
					"data-motion": motion,
					onKeyDown: onMenuKeyDown,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Status, {
							state: current,
							timeout: settings.timeout,
							t,
							onDismiss: () => setState(IDLE)
						}),
						current.kind === "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: t("undo"),
							shortcutKeys: keys.length > 0 ? keys : void 0,
							side: "top",
							delayMs: 400,
							portal: true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `dsh-enhance-button`,
								"data-state": "done",
								"aria-label": t("undo"),
								onClick: () => undo(current.original),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `dsh-enhance-icon`,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 15 })
								})
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open,
							anchor: trigger,
							side: "top",
							align: "end",
							portal: true,
							autoFocus: true,
							listClassName: MENU_CLASS,
							onClose: closeMenu,
							footer: manage === void 0 ? [] : [{
								id: "manage",
								label: t("manage"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutlineRegular, { size: 14 })
							}],
							onSelect: (id) => {
								if (id !== "manage") return;
								fromShortcut.current = false;
								setOpen(false);
								manage?.();
							},
							children: [estimate !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `dsh-enhance-estimate`,
								role: "presentation",
								children: estimate
							}), rows]
						})
					]
				});
			};
		}
		const DETAILED = /* @__PURE__ */ new Set([
			"model",
			"invalid",
			"preset",
			"context",
			"network"
		]);
		function Status({ state, timeout, t, onDismiss }) {
			if (state.kind === "running") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `${K}-status`,
				role: "status",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TextShimmer, {
					active: true,
					children: t("working")
				})
			});
			if (state.kind !== "note") return null;
			const { note } = state;
			if (note.tone === "info") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: `${K}-status`,
				"data-tone": "info",
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { size: 12 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: `${K}-status-text`,
					children: t("unchanged")
				})]
			});
			const label = format(t(`error.${note.reason}`), { n: timeout });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: `${K}-status`,
				"data-tone": "error",
				role: "alert",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 12 }),
					DETAILED.has(note.reason) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: note.detail,
						side: "top",
						delayMs: 300,
						portal: true,
						maxWidth: 360,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${K}-status-text`,
							tabIndex: 0,
							children: label
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${K}-status-text`,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${K}-dismiss`,
						"aria-label": t("dismiss"),
						onClick: onDismiss,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 10 })
					})
				]
			});
		}
		//#endregion
		//#region dsh/enhance/src/dsh.ts
		const CLIENT_INJECT = [
			"slots",
			"locale",
			"stashKit"
		];
		const DEFAULT_SETTINGS = {
			provider: "",
			model: "",
			effort: "",
			timeout: 60,
			context: true,
			contextTurns: 3,
			shortcut: false,
			presets: DEFAULT_PRESETS
		};
		const PresetSchema = /* @__PURE__ */ object({
			id: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ minLength(1)),
			title: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), ""),
			description: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), ""),
			prompt: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), "")
		});
		const SettingsSchema = /* @__PURE__ */ object({
			provider: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.provider),
			model: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.model),
			effort: /* @__PURE__ */ fallback(/* @__PURE__ */ string(), DEFAULT_SETTINGS.effort),
			timeout: /* @__PURE__ */ fallback(/* @__PURE__ */ pipe(/* @__PURE__ */ number(), /* @__PURE__ */ integer(), /* @__PURE__ */ minValue(5), /* @__PURE__ */ maxValue(600)), 60),
			context: /* @__PURE__ */ fallback(/* @__PURE__ */ boolean(), DEFAULT_SETTINGS.context),
			contextTurns: /* @__PURE__ */ fallback(/* @__PURE__ */ pipe(/* @__PURE__ */ number(), /* @__PURE__ */ integer(), /* @__PURE__ */ minValue(1), /* @__PURE__ */ maxValue(10)), 3),
			shortcut: /* @__PURE__ */ fallback(/* @__PURE__ */ boolean(), DEFAULT_SETTINGS.shortcut),
			presets: /* @__PURE__ */ fallback(/* @__PURE__ */ array(PresetSchema), [...DEFAULT_PRESETS])
		});
		function parseSettings(value) {
			return parse(SettingsSchema, typeof value === "object" && value !== null ? value : {});
		}
		//#endregion
		//#region dsh/enhance/src/shortcut.ts
		const COMMAND_ID = "dsh-enhance.enhance";
		const BINDING = {
			code: "KeyE",
			modifiers: ["primary", "shift"]
		};
		const DEFAULT_BINDINGS = {
			"desktop:macos": BINDING,
			"desktop:windows": BINDING,
			"desktop:linux": BINDING,
			"web:macos": BINDING,
			"web:windows": BINDING
		};
		function defaultKeys(platform) {
			return /mac|iphone|ipad/iu.test(platform) ? [
				"⇧",
				"⌘",
				"E"
			] : [
				"Ctrl",
				"Shift",
				"E"
			];
		}
		function keysText(keys) {
			if (keys.includes("+")) return keys.join("");
			return keys.every((key) => key.length === 1) ? keys.join("") : keys.join("+");
		}
		function createShortcutBridge() {
			const targets = [];
			return {
				keys: createValueStore([], (left, right) => left.join(" ") === right.join(" ")),
				attach(target) {
					targets.push(target);
					return () => {
						const index = targets.indexOf(target);
						if (index >= 0) targets.splice(index, 1);
					};
				},
				pick(focus) {
					const focused = targets.find((target) => focus !== null && target.card.contains(focus));
					if (focused !== void 0) return focused;
					return targets.findLast((target) => target.card.isConnected && target.card.getClientRects().length > 0);
				}
			};
		}
		function ownMenuOnTop() {
			const layers = document.querySelectorAll(_deepseek_ai_dsh_client_ui_primitives.modalSelector);
			return layers[layers.length - 1]?.classList.contains(MENU_CLASS) === true;
		}
		function registerCommand(shortcuts, bridge, label) {
			const command = (defaults) => ({
				id: COMMAND_ID,
				label,
				aliases: [
					"enhance",
					"prompt",
					"增强",
					"润色"
				],
				defaults,
				regions: ["page", "editable"],
				modals: ["other"],
				resolve(context) {
					if (context.modal !== null && !ownMenuOnTop()) return { status: "pass" };
					const target = bridge.pick(context.target);
					return target === void 0 ? { status: "pass" } : {
						status: "handled",
						run: target.trigger
					};
				}
			});
			let dispose;
			try {
				dispose = shortcuts.register(command(DEFAULT_BINDINGS));
			} catch (error) {
				console.warn(`[dsh-enhance] the default keys of ${COMMAND_ID} overlap another command; registering it unbound:`, error);
				dispose = shortcuts.register(command({}));
			}
			const publish = () => {
				const entry = shortcuts.catalog.getSnapshot().find((row) => row.id === COMMAND_ID);
				bridge.keys.set(entry === void 0 || entry.binding === null ? [] : entry.keys);
			};
			publish();
			const unsubscribe = shortcuts.catalog.subscribe(publish);
			return () => {
				unsubscribe();
				dispose();
				bridge.keys.set([]);
			};
		}
		//#endregion
		//#region dsh/enhance/src/settings.tsx
		function useCatalog(load, round) {
			const [catalog, setCatalog] = (0, react.useState)();
			(0, react.useEffect)(() => {
				if (load === void 0) return void 0;
				let live = true;
				load().then((groups) => {
					if (live) setCatalog({
						round,
						value: {
							status: "ready",
							groups
						}
					});
				}, (error) => {
					console.error(`[${K}] loading the model catalog failed:`, error);
					if (live) setCatalog({
						round,
						value: { status: "error" }
					});
				});
				return () => {
					live = false;
				};
			}, [load, round]);
			if (load === void 0) return { status: "error" };
			return catalog?.round === round ? catalog.value : { status: "loading" };
		}
		const FIELDS = [
			"provider",
			"model",
			"effort",
			"timeout",
			"context",
			"contextTurns",
			"shortcut"
		];
		function samePresets(left, right) {
			return left.length === right.length && left.every((preset, index) => {
				const other = right[index];
				return other !== void 0 && preset.id === other.id && preset.title === other.title && preset.description === other.description && preset.prompt === other.prompt;
			});
		}
		function settingsOps(base, next) {
			const ops = FIELDS.filter((field) => base[field] !== next[field]).map((field) => ({
				op: "set",
				path: [field],
				value: next[field]
			}));
			if (!samePresets(base.presets, next.presets)) {
				const presets = next.presets.map((preset) => ({ ...preset }));
				ops.push({
					op: "set",
					path: ["presets"],
					value: presets
				});
			}
			return ops;
		}
		function invalidPresets(presets) {
			return presets.length === 0 || presets.some((preset) => !isBuiltin(preset.id) && preset.prompt.trim() === "");
		}
		function Field({ label, hint, htmlFor, stack = false, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: stack ? `${K}-field ${K}-field-stack` : `${K}-field`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${K}-field-text`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: `${K}-field-label`,
						htmlFor,
						children: label
					}), hint !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `dsh-enhance-field-hint`,
						children: hint
					})]
				}), children]
			});
		}
		function clampInteger(text, min, max, fallback) {
			const value = Number.parseInt(text, 10);
			if (!Number.isFinite(value)) return fallback;
			return Math.min(max, Math.max(min, value));
		}
		function ModelRow({ name, checked, locked, title, route, onPick }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: `${K}-model`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "radio",
					name,
					checked,
					disabled: locked,
					onChange: onPick
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: `${K}-model-name`,
					children: title
				}), route !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: `dsh-enhance-model-route`,
					children: route
				})] })]
			});
		}
		function ModelFields({ id, shown, locked, catalog, retry, stage, t }) {
			const follow = shown.provider === "" || shown.model === "";
			const groups = catalog.status === "ready" ? catalog.groups : [];
			const find = (provider, model) => groups.find((group) => group.id === provider)?.models.find((entry) => entry.id === model);
			const chosen = follow ? void 0 : find(shown.provider, shown.model);
			const efforts = chosen?.reasoning?.efforts ?? [];
			const name = `${id}-model`;
			const pick = (provider, model) => stage({
				...shown,
				provider,
				model,
				effort: ""
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Field, {
				label: t("model"),
				hint: t("modelHint"),
				stack: true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `${K}-models`,
						role: "radiogroup",
						"aria-label": t("model"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `${K}-model-group`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelRow, {
									name,
									checked: follow,
									locked,
									title: t("modelFollow"),
									route: void 0,
									onPick: () => pick("", "")
								})
							}),
							groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: `${K}-model-group`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: `${K}-provider`,
									children: group.name
								}), group.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelRow, {
									name,
									checked: !follow && shown.provider === group.id && shown.model === model.id,
									locked,
									title: model.name,
									route: `${group.id}/${model.id}`,
									onPick: () => pick(group.id, model.id)
								}, model.id))]
							}, group.id)),
							!follow && catalog.status === "ready" && chosen === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `dsh-enhance-model-group`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelRow, {
									name,
									checked: true,
									locked,
									title: format(t("modelMissing"), { name: shown.model }),
									route: `${shown.provider}/${shown.model}`,
									onPick: () => {}
								})
							})
						]
					}),
					catalog.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: `dsh-enhance-notice`,
						role: "status",
						children: t("modelLoading")
					}),
					catalog.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `dsh-enhance-catalog-error`,
						role: "alert",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("modelFailed") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							onClick: retry,
							children: t("modelRetry")
						})]
					})
				]
			}), efforts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
				label: t("effort"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
					id: `${id}-effort`,
					label: t("effort"),
					value: efforts.some((effort) => effort.id === shown.effort) ? shown.effort : "",
					disabled: locked,
					options: [{
						value: "",
						label: t("effortDefault")
					}, ...efforts.map((effort) => ({
						value: effort.id,
						label: effort.name
					}))],
					onChange: (effort) => stage({
						...shown,
						effort
					})
				})
			})] });
		}
		function PresetEditor({ presets, locked, stage, t }) {
			const id = (0, react.useId)();
			const [editing, setEditing] = (0, react.useState)();
			const replace = (index, preset) => stage(presets.map((candidate, at) => at === index ? preset : candidate));
			const move = (index, step) => {
				const next = [...presets];
				const [moved] = next.splice(index, 1);
				if (moved === void 0) return;
				next.splice(index + step, 0, moved);
				stage(next);
			};
			const add = () => {
				const preset = {
					id: `custom-${crypto.randomUUID().slice(0, 8)}`,
					title: "",
					description: "",
					prompt: ""
				};
				stage([...presets, preset]);
				setEditing(preset.id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: `${K}-presets`,
				"aria-labelledby": `${id}-presets`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						id: `${id}-presets`,
						className: `${K}-field-label`,
						children: t("presets")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: `${K}-preset-list`,
						children: presets.map((preset, index) => {
							const { title, hint } = presetLabel(preset, t);
							const builtin = isBuiltin(preset.id);
							const open = editing === preset.id;
							const missing = !builtin && preset.prompt.trim() === "";
							const edited = builtin && (preset.title !== "" || preset.description !== "" || preset.prompt !== "");
							const field = (name) => `${id}-${preset.id}-${name}`;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: `${K}-preset`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: `${K}-preset-head`,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: `${K}-preset-index`,
											children: index + 1
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: `${K}-preset-text`,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: `${K}-preset-title`,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: `${K}-preset-title-text`,
														children: title
													}), builtin && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: `dsh-enhance-preset-tag`,
														children: edited ? t("presetBuiltinEdited") : t("presetBuiltin")
													})]
												}),
												hint !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: `dsh-enhance-preset-hint`,
													children: hint
												}),
												missing && !open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: `dsh-enhance-invalid`,
													children: t("presetNeedsPrompt")
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: `${K}-preset-actions`,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: `${K}-icon-button`,
													"aria-label": t("presetUp"),
													disabled: locked || index === 0,
													onClick: () => move(index, -1),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutlineRegular, { size: 14 })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: `${K}-icon-button`,
													"aria-label": t("presetDown"),
													disabled: locked || index === presets.length - 1,
													onClick: () => move(index, 1),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 14 })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: `${K}-icon-button`,
													"aria-label": t("presetRemove"),
													disabled: locked || presets.length === 1,
													onClick: () => stage(presets.filter((_, at) => at !== index)),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													size: "sm",
													disabled: locked,
													"aria-expanded": open,
													onClick: () => setEditing(open ? void 0 : preset.id),
													children: open ? t("presetDone") : t("presetEdit")
												})
											]
										})
									]
								}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: `dsh-enhance-preset-form`,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											className: `dsh-enhance-preset-label`,
											htmlFor: field("title"),
											children: t("presetTitle")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											id: field("title"),
											value: preset.title,
											placeholder: title,
											disabled: locked,
											onChange: (event) => replace(index, {
												...preset,
												title: event.target.value
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											className: `dsh-enhance-preset-label`,
											htmlFor: field("description"),
											children: t("presetDescription")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											id: field("description"),
											value: preset.description,
											placeholder: hint,
											disabled: locked,
											onChange: (event) => replace(index, {
												...preset,
												description: event.target.value
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											className: `dsh-enhance-preset-label`,
											htmlFor: field("prompt"),
											children: t("presetPrompt")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											id: field("prompt"),
											className: `dsh-enhance-textarea`,
											value: editablePrompt(preset),
											rows: 6,
											spellCheck: false,
											placeholder: t("presetPromptCustom"),
											"aria-invalid": missing,
											disabled: locked,
											onChange: (event) => replace(index, {
												...preset,
												prompt: storedPrompt(preset.id, event.target.value)
											})
										}),
										missing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: `dsh-enhance-invalid`,
											children: t("presetNeedsPrompt")
										}),
										edited && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: `dsh-enhance-preset-footer`,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												size: "sm",
												disabled: locked,
												onClick: () => replace(index, {
													id: preset.id,
													title: "",
													description: "",
													prompt: ""
												}),
												children: t("presetReset")
											})
										})
									]
								})]
							}, preset.id);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						className: `${K}-add`,
						disabled: locked,
						onClick: add,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }), t("presetAdd")]
					})
				]
			});
		}
		function createSettingsPage(shared) {
			return function SettingsPage({ view, form, t }) {
				const id = (0, react.useId)();
				const [draft, setDraft] = (0, react.useState)();
				const [saving, setSaving] = (0, react.useState)(false);
				const [failed, setFailed] = (0, react.useState)(false);
				const [round, setRound] = (0, react.useState)(0);
				const load = useValue(shared.catalog);
				const keys = useValue(shared.keys);
				const catalog = useCatalog(view === "page" ? load : void 0, round);
				if (view === "summary") return t("summary");
				const current = parseSettings(form?.state.value);
				const shown = draft ?? current;
				const ops = settingsOps(current, shown);
				const dirty = ops.length > 0;
				const invalid = invalidPresets(shown.presets);
				const available = form !== void 0 && form.state.status !== "unavailable";
				const writable = available && form.state.status === "ready" && form.state.writable;
				const locked = !writable || saving;
				const stage = (next) => {
					setDraft(next);
					setFailed(false);
				};
				const save = async () => {
					if (form === void 0 || !dirty) return;
					setSaving(true);
					setFailed(false);
					try {
						if (await form.mutate(ops, form.state.revision)) setDraft(void 0);
						else setFailed(true);
					} catch (error) {
						console.error(`[${K}] saving the settings failed:`, error);
						setFailed(true);
					} finally {
						setSaving(false);
					}
				};
				const bound = keys.length > 0 ? keys : shared.defaultKeys;
				const shortcutHint = shown.shortcut && current.shortcut && keys.length === 0 ? t("shortcutNone") : format(t("shortcutHint"), { keys: keysText(bound) });
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: `${K}-settings`,
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
							invalid,
							saving,
							failed
						},
						onSave: () => void save(),
						onDiscard: () => setDraft(void 0),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelFields, {
								id,
								shown,
								locked,
								catalog,
								retry: () => setRound(round + 1),
								stage,
								t
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: t("timeout"),
								htmlFor: `${id}-timeout`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: `${id}-timeout`,
									className: `${K}-number`,
									type: "number",
									inputMode: "numeric",
									min: 5,
									max: 600,
									value: shown.timeout,
									disabled: locked,
									onChange: (event) => stage({
										...shown,
										timeout: clampInteger(event.target.value, 5, 600, shown.timeout)
									})
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: t("contextToggle"),
								hint: t("contextHint"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
									checked: shown.context,
									label: t("contextToggle"),
									disabled: locked,
									onChange: (next) => stage({
										...shown,
										context: next
									})
								})
							}),
							shown.context && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: t("contextTurns"),
								htmlFor: `${id}-turns`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: `${id}-turns`,
									className: `dsh-enhance-number`,
									type: "number",
									inputMode: "numeric",
									min: 1,
									max: 10,
									value: shown.contextTurns,
									disabled: locked,
									onChange: (event) => stage({
										...shown,
										contextTurns: clampInteger(event.target.value, 1, 10, shown.contextTurns)
									})
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: t("shortcut"),
								hint: shortcutHint,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
									checked: shown.shortcut,
									label: t("shortcut"),
									disabled: locked,
									onChange: (next) => stage({
										...shown,
										shortcut: next
									})
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetEditor, {
								presets: shown.presets,
								locked,
								stage: (presets) => stage({
									...shown,
									presets
								}),
								t
							})
						]
					})
				});
			};
		}
		//#endregion
		//#region dsh/enhance/src/client.tsx
		const PLUGIN = K;
		const PACKAGE = "@agent-stash/dsh-enhance";
		const inject = CLIENT_INJECT;
		function apply(ctx) {
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset["plugin"] = PLUGIN;
				tag.textContent = enhanceCss();
				document.head.append(tag);
				return () => tag.remove();
			}, `${PLUGIN}: stylesheet`);
			installDictionaries(ctx, PLUGIN, {
				en,
				zh
			});
			const t = ctx.locale.bind(PLUGIN);
			const settings = createValueStore(DEFAULT_SETTINGS);
			const shortcut = createShortcutBridge();
			const catalog = createValueStore(void 0);
			ctx.inject(["configForms"], (inner) => {
				const form = inner.configForms.get(PLUGIN);
				inner.effect(() => {
					const update = () => {
						const snapshot = form.getSnapshot();
						if (snapshot.status === "ready") settings.set(parseSettings(snapshot.value));
					};
					update();
					return form.subscribe(update);
				}, `${PLUGIN}: settings`);
			});
			ctx.inject(["shortcuts"], (inner) => {
				inner.effect(() => {
					let dispose;
					const sync = () => {
						const wanted = settings.get().shortcut;
						if (wanted && dispose === void 0) dispose = registerCommand(inner.shortcuts, shortcut, () => t("enhance"));
						else if (!wanted && dispose !== void 0) {
							dispose();
							dispose = void 0;
						}
					};
					sync();
					const unsubscribe = settings.subscribe(sync);
					return () => {
						unsubscribe();
						dispose?.();
					};
				}, `${PLUGIN}: shortcut`);
			});
			ctx.inject(["remote", "remote.session"], (inner) => {
				inner.effect(() => {
					catalog.set(async () => {
						const response = await inner.remote.session.modelCatalog();
						if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
						return response.value.groups;
					});
					return () => catalog.set(void 0);
				}, `${PLUGIN}: model catalog`);
			});
			const EnhanceButton = createEnhanceButton(ctx.stashKit, {
				settings,
				shortcut,
				settingsLink: () => {
					const navigation = ctx.get("pluginNavigation");
					return navigation === void 0 ? void 0 : () => navigation.openBundle(PACKAGE);
				}
			});
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: PLUGIN,
				order: 50,
				locale: PLUGIN
			}, EnhanceButton));
			const SettingsPage = createSettingsPage({
				catalog,
				keys: shortcut.keys,
				defaultKeys: defaultKeys(navigator.platform)
			});
			ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
				name: "plugins.row.config",
				key: `${PACKAGE}#${PLUGIN}`,
				locale: PLUGIN
			}, SettingsPage));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return exports;
	}
});
