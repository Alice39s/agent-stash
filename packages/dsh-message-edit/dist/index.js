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
* Disallows inherited object properties and prevents object prototype
* pollution by disallowing certain keys.
*
* @param object The object to check.
* @param key The key to check.
*
* @returns Whether the key is allowed.
*
* @internal
*/
/* @__NO_SIDE_EFFECTS__ */
function _isValidObjectKey(object$1, key) {
	return Object.prototype.hasOwnProperty.call(object$1, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
/**
* Checks whether a value matches a value action requirement.
*
* @param requirement The value action requirement.
* @param value The value to check.
*
* @returns Whether the value matches the requirement.
*
* @internal
*/
/* @__NO_SIDE_EFFECTS__ */
function _isValueMatch(requirement, value$1) {
	return Number.isNaN(requirement) && Number.isNaN(value$1) || requirement <= value$1 && requirement >= value$1;
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
/* @__NO_SIDE_EFFECTS__ */
function getDotPath(issue) {
	if (issue.path) {
		let key = "";
		for (const item of issue.path) if (typeof item.key === "string" || typeof item.key === "number") if (key) key += `.${item.key}`;
		else key += item.key;
		else return null;
		return key;
	}
	return null;
}
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
function notValues(requirement, message$1) {
	return {
		kind: "validation",
		type: "not_values",
		reference: notValues,
		async: false,
		expects: `!${/* @__PURE__ */ _joinExpects(requirement.map((value$1) => value$1 instanceof Date ? value$1.toJSON() : /* @__PURE__ */ _stringify(value$1)), "|")}`,
		requirement,
		message: message$1,
		"~run"(dataset, config$1) {
			if (dataset.typed && this.requirement.some((requirement$1) => /* @__PURE__ */ _isValueMatch(requirement$1, dataset.value))) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
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
/**
* Creates a lazy schema.
*
* @param getter The schema getter.
*
* @returns A lazy schema.
*/
/* @__NO_SIDE_EFFECTS__ */
function lazy(getter) {
	return _standardSchema({
		kind: "schema",
		type: "lazy",
		reference: lazy,
		expects: "unknown",
		async: false,
		getter,
		"~run"(dataset, config$1) {
			return this.getter(dataset.value)["~run"](dataset, config$1);
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
function null_(message$1) {
	return _standardSchema({
		kind: "schema",
		type: "null",
		reference: null_,
		expects: "null",
		async: false,
		message: message$1,
		"~run"(dataset, config$1) {
			if (dataset.value === null) dataset.typed = true;
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
function objectWithRest(entries$1, rest, message$1) {
	return _standardSchema({
		kind: "schema",
		type: "object_with_rest",
		reference: objectWithRest,
		expects: "Object",
		async: false,
		entries: entries$1,
		rest,
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
				if (!dataset.issues || !config$1.abortEarly) {
					for (const key in input) if (/* @__PURE__ */ _isValidObjectKey(input, key) && !Object.prototype.hasOwnProperty.call(this.entries, key)) {
						const valueDataset = this.rest["~run"]({ value: input[key] }, config$1);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: input[key]
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
/**
* Returns the sub issues of the provided datasets for the union issue.
*
* @param datasets The datasets.
*
* @returns The sub issues.
*
* @internal
*/
/* @__NO_SIDE_EFFECTS__ */
function _subIssues(datasets) {
	let issues;
	if (datasets) for (const dataset of datasets) if (issues) for (const issue of dataset.issues) issues.push(issue);
	else issues = dataset.issues;
	return issues;
}
/* @__NO_SIDE_EFFECTS__ */
function union(options, message$1) {
	return _standardSchema({
		kind: "schema",
		type: "union",
		reference: union,
		expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
		async: false,
		options,
		message: message$1,
		"~run"(dataset, config$1) {
			let validDataset;
			let typedDatasets;
			let untypedDatasets;
			for (const schema of this.options) {
				const optionDataset = schema["~run"]({ value: dataset.value }, config$1);
				if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
				else typedDatasets = [optionDataset];
				else {
					validDataset = optionDataset;
					break;
				}
				else if (untypedDatasets) untypedDatasets.push(optionDataset);
				else untypedDatasets = [optionDataset];
			}
			if (validDataset) return validDataset;
			if (typedDatasets) {
				if (typedDatasets.length === 1) return typedDatasets[0];
				_addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
				dataset.typed = true;
			} else if (untypedDatasets?.length === 1) return untypedDatasets[0];
			else _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
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
/**
* Summarize the error messages of issues in a pretty-printable multi-line string.
*
* @param issues The list of issues.
*
* @returns A summary of the issues.
*
* @beta
*/
/* @__NO_SIDE_EFFECTS__ */
function summarize(issues) {
	let summary = "";
	for (const issue of issues) {
		if (summary) summary += "\n";
		summary += `× ${issue.message}`;
		const dotPath = /* @__PURE__ */ getDotPath(issue);
		if (dotPath) summary += `\n  → at ${dotPath}`;
	}
	return summary;
}
//#endregion
//#region src/shared.ts
/**
* Host 与浏览器两半共享的契约：HTTP 路由、请求与响应的结构，以及持久化的版本记录。
* 结构用 valibot 描述，类型由 schema 推导，Host 校验请求体与存储记录，浏览器校验响应。
*/
/** Host 插件在 DSH Web 服务上注册的同源路由。 */
const MESSAGE_EDIT_PATH = "/message-edit";
/** 版本记录所在的 storageDomain 名称与表名。 */
const MESSAGE_EDIT_DOMAIN = "message_edit";
const MESSAGE_EDIT_VERSIONS_TABLE = "versions";
const NonNegativeIntegerSchema = /* @__PURE__ */ pipe(/* @__PURE__ */ number(), /* @__PURE__ */ integer(), /* @__PURE__ */ minValue(0));
const SessionIdSchema = /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ nonEmpty());
/** 修改历史回合后怎样处理它之后的回合：截断，或依次重放后续用户输入。 */
const CascadePolicySchema = /* @__PURE__ */ picklist(["truncate", "preserve"]);
/**
* 存在 storageDomain 里的版本记录，键是子会话 id。
* `parentSessionId` 是这次操作的来源会话，撤销即切回它；会话日志本身只含 DSH 内置事件。
*/
const VersionRecordSchema = /* @__PURE__ */ object({
	parentSessionId: SessionIdSchema,
	createdAt: NonNegativeIntegerSchema,
	effect: /* @__PURE__ */ object({
		id: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ uuid()),
		operation: /* @__PURE__ */ picklist([
			"edit",
			"reroll",
			"retry"
		]),
		cascade: CascadePolicySchema,
		targetTurn: NonNegativeIntegerSchema,
		targetEventSeq: NonNegativeIntegerSchema,
		targetBlockIndex: /* @__PURE__ */ optional(NonNegativeIntegerSchema),
		blockKind: /* @__PURE__ */ optional(/* @__PURE__ */ picklist([
			"user",
			"assistant.reasoning",
			"assistant.response"
		])),
		before: /* @__PURE__ */ optional(/* @__PURE__ */ string()),
		after: /* @__PURE__ */ optional(/* @__PURE__ */ string())
	})
});
/** `POST /message-edit` 接受的操作。 */
const MessageEditOperationSchema = /* @__PURE__ */ variant("action", [
	/* @__PURE__ */ object({
		action: /* @__PURE__ */ literal("edit"),
		sessionId: SessionIdSchema,
		eventSeq: NonNegativeIntegerSchema,
		blockIndex: NonNegativeIntegerSchema,
		text: /* @__PURE__ */ string(),
		cascade: CascadePolicySchema
	}),
	/* @__PURE__ */ object({
		action: /* @__PURE__ */ literal("reroll"),
		sessionId: SessionIdSchema
	}),
	/* @__PURE__ */ object({
		action: /* @__PURE__ */ literal("retry"),
		sessionId: SessionIdSchema,
		turn: NonNegativeIntegerSchema,
		cascade: CascadePolicySchema
	})
]);
//#endregion
//#region src/host/errors.ts
/** 业务冲突错误：请求本身合法，但会话当前的状态不允许这个操作。HTTP 路由把它映射为 409。 */
const CONFLICT_ERROR_NAME = "MessageEditConflict";
/** 创建一个业务冲突错误；消息里写清是哪个会话、哪一处不满足。 */
function conflictError(message, options) {
	const error = new Error(message, options);
	error.name = CONFLICT_ERROR_NAME;
	return error;
}
function isConflictError(error) {
	return error.name === CONFLICT_ERROR_NAME;
}
//#endregion
//#region src/host/dsh-read.ts
/**
* DSH 读取适配：把 live 会话、持久化会话与版本树追踪结果转换成插件的值。
*
* 两版读取完整事件日志的方式不同（0.1.0-rc.3 是 `session.events`，0.2.1-rc.3 是
* `session.snapshotEvents()`），会话格式版本也不同，都在这里分流。插件解读的事件数据先用
* valibot 校验，再进入 `LogEvent` 视图。
*/
const JsonValueSchema = /* @__PURE__ */ lazy(() => /* @__PURE__ */ union([
	/* @__PURE__ */ string(),
	/* @__PURE__ */ number(),
	/* @__PURE__ */ boolean(),
	/* @__PURE__ */ null_(),
	/* @__PURE__ */ array(JsonValueSchema),
	/* @__PURE__ */ record(/* @__PURE__ */ string(), JsonValueSchema)
]));
const TEXTUAL_BLOCK_TYPES = ["text", "reasoning"];
const ContentBlockSchema = /* @__PURE__ */ union([/* @__PURE__ */ objectWithRest({
	type: /* @__PURE__ */ picklist(TEXTUAL_BLOCK_TYPES),
	text: /* @__PURE__ */ string()
}, JsonValueSchema), /* @__PURE__ */ objectWithRest({ type: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ notValues(TEXTUAL_BLOCK_TYPES)) }, JsonValueSchema)]);
const IntegerSchema = /* @__PURE__ */ pipe(/* @__PURE__ */ number(), /* @__PURE__ */ integer(), /* @__PURE__ */ minValue(0));
const TurnDataSchema = /* @__PURE__ */ object({ turn: IntegerSchema });
const UserMessageDataSchema = /* @__PURE__ */ object({
	id: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ nonEmpty()),
	content: /* @__PURE__ */ array(ContentBlockSchema),
	source: /* @__PURE__ */ object({ kind: /* @__PURE__ */ string() })
});
const AssistantMessageDataSchema = /* @__PURE__ */ object({
	turn: IntegerSchema,
	message: /* @__PURE__ */ object({
		id: /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ nonEmpty()),
		content: /* @__PURE__ */ array(ContentBlockSchema),
		source: /* @__PURE__ */ object({
			provider: /* @__PURE__ */ string(),
			model: /* @__PURE__ */ string()
		})
	})
});
const RequestHeaderDataSchema = /* @__PURE__ */ object({ header: /* @__PURE__ */ object({ config: /* @__PURE__ */ object({
	provider: /* @__PURE__ */ string(),
	model: /* @__PURE__ */ string(),
	maxTokens: /* @__PURE__ */ optional(IntegerSchema),
	reasoningEffort: /* @__PURE__ */ optional(/* @__PURE__ */ string())
}) }) });
const PresetSelectedDataSchema = /* @__PURE__ */ object({ agentPreset: /* @__PURE__ */ string() });
/** 按 schema 解读一个事件的数据；结构不符时带上会话、seq 与事件类型抛出。 */
function eventData(schema, sessionId, event) {
	const result = /* @__PURE__ */ safeParse(schema, event.data);
	if (!result.success) throw new Error(`会话 ${sessionId} 的事件 ${String(event.seq)}（${event.type}）结构不符：${/* @__PURE__ */ summarize(result.issues)}`);
	return result.output;
}
/** 解读一个事件；插件不关心的事件类型返回 undefined。 */
function logEvent(sessionId, event) {
	switch (event.type) {
		case "turn/start": return {
			type: "turn/start",
			seq: event.seq,
			turn: eventData(TurnDataSchema, sessionId, event).turn
		};
		case "turn/end": return {
			type: "turn/end",
			seq: event.seq,
			turn: eventData(TurnDataSchema, sessionId, event).turn
		};
		case "user/message": {
			const data = eventData(UserMessageDataSchema, sessionId, event);
			return {
				type: "user/message",
				seq: event.seq,
				time: event.time,
				message: {
					id: data.id,
					sourceKind: data.source.kind,
					content: data.content
				}
			};
		}
		case "assistant/message": {
			const { turn, message } = eventData(AssistantMessageDataSchema, sessionId, event);
			return {
				type: "assistant/message",
				seq: event.seq,
				time: event.time,
				turn,
				message: {
					id: message.id,
					provider: message.source.provider,
					model: message.source.model,
					content: message.content
				}
			};
		}
		case "request/header": {
			const { config } = eventData(RequestHeaderDataSchema, sessionId, event).header;
			return {
				type: "request/header",
				seq: event.seq,
				route: {
					provider: config.provider,
					model: config.model,
					...config.maxTokens === void 0 ? {} : { maxTokens: config.maxTokens },
					...config.reasoningEffort === void 0 ? {} : { reasoningEffort: config.reasoningEffort }
				}
			};
		}
		case "agent-preset/selected": return {
			type: "agent-preset/selected",
			seq: event.seq,
			agentPreset: eventData(PresetSelectedDataSchema, sessionId, event).agentPreset
		};
		default: return;
	}
}
/** 把原始事件日志转换成插件视图，保持 seq 顺序。 */
function parseLogEvents(sessionId, events) {
	return events.flatMap((event) => {
		const parsed = logEvent(sessionId, event);
		return parsed === void 0 ? [] : [parsed];
	});
}
/** 从 header 判定会话格式；两版的 header 校验分别只接受 0 与 4。 */
function sessionFormat(header) {
	switch (header.version) {
		case 0: return 0;
		case 4: return 4;
		default: throw new Error(`会话 ${header.id} 的格式版本 ${String(header.version)} 不受支持，只支持 0（DSH 0.1.0-rc.3）与 4（DSH 0.2.1-rc.3）`);
	}
}
/** live 会话的完整事件日志：0.2.1-rc.3 用 `snapshotEvents()`，0.1.0-rc.3 用 `events`。 */
function liveEvents(session) {
	if (typeof session.snapshotEvents === "function") return session.snapshotEvents();
	if (session.events !== void 0) return session.events;
	throw new Error(`会话 ${session.id} 既没有 snapshotEvents() 也没有 events，无法读取事件日志`);
}
function sessionLog(header, events) {
	return {
		id: header.id,
		format: sessionFormat(header),
		...header.cwd === void 0 ? {} : { cwd: header.cwd },
		...header.agentPreset === void 0 ? {} : { agentPreset: header.agentPreset },
		events,
		view: parseLogEvents(header.id, events)
	};
}
/** 读取 live 会话。 */
function liveSessionLog(session) {
	return sessionLog(session.header, liveEvents(session));
}
/** 读取 `sessionQuery.readSession` 的结果。 */
function storedSessionLog(snapshot) {
	return sessionLog(snapshot.session, snapshot.events);
}
/** 读取一个会话：live 会话直接读内存，否则经 `sessionQuery` 读持久化日志。 */
async function readSessionLog(sources, sessionId) {
	const live = sources.sessions.get(sessionId);
	if (live !== void 0) return liveSessionLog(live);
	return storedSessionLog(await sources.sessionQuery.readSession(sessionId));
}
function lineageNode(header, depth) {
	return {
		sessionId: header.id,
		...header.parentSession === void 0 ? {} : { parentSessionId: header.parentSession },
		createdAt: header.createdAt,
		depth
	};
}
function byCreation(left, right) {
	const a = left.session.header;
	const b = right.session.header;
	return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}
/** 深度优先展开版本树；同一父版本的子版本按创建时间、再按 id 排序。 */
function flattenLineage(root, descendants) {
	const nodes = [lineageNode(root.header, 0)];
	const visit = (children, depth) => {
		for (const child of children.toSorted(byCreation)) {
			nodes.push(lineageNode(child.session.header, depth));
			visit(child.descendants, depth + 1);
		}
	};
	visit(descendants, 1);
	return nodes;
}
/** 读取一个会话所在的整棵可见版本树：先找到最上层的可见祖先，再从它展开。 */
async function readLineage(query, sessionId) {
	const trace = await query.traceSession(sessionId);
	const top = trace.complete ? trace.root : trace.ancestors.at(-1) ?? trace.target;
	const rootTrace = top.header.id === sessionId ? trace : await query.traceSession(top.header.id);
	return flattenLineage(rootTrace.target, rootTrace.descendants);
}
//#endregion
//#region src/host/fork.ts
/** 一条新的用户消息，内容块原样保留。 */
function userMessage(content) {
	return {
		id: crypto.randomUUID(),
		role: "user",
		content,
		source: { kind: "user" }
	};
}
function assistantMessage(manual) {
	return {
		id: crypto.randomUUID(),
		role: "assistant",
		content: manual.reply.content,
		source: {
			kind: "model",
			provider: manual.reply.provider,
			model: manual.reply.model
		}
	};
}
/** 源会话从 seq 0 到 `boundary`（含）的事件；`boundary` 为 -1 时不继承。 */
function inheritedPrefix(source, boundary) {
	if (boundary === -1) return [];
	if (source.events[boundary]?.seq !== boundary) throw new Error(`会话 ${source.id} 的分支边界 ${String(boundary)} 不是连续的事件位置`);
	return source.events.slice(0, boundary + 1);
}
/** 从 `firstSeq` 起连续编号的事件。 */
function sequence(firstSeq, time, entries) {
	return entries.map((entry, index) => ({
		...entry,
		seq: firstSeq + index,
		time
	}));
}
/** 手写回合：开回合、用户输入、一个步骤里的助手回复、关步骤、以 completed 关回合。 */
function manualTurnEvents(format, firstSeq, manual, time) {
	const { turn } = manual;
	const assistant = assistantMessage(manual);
	return sequence(firstSeq, time, [
		{
			type: "turn/start",
			data: { turn }
		},
		{
			type: "user/message",
			data: userMessage(manual.prompt),
			surfaceOp: "append"
		},
		{
			type: "step/start",
			data: {
				turn,
				step: 1
			}
		},
		{
			type: "assistant/message",
			data: format === 4 ? {
				turn,
				step: 1,
				message: assistant,
				stream: []
			} : {
				turn,
				step: 1,
				message: assistant
			},
			surfaceOp: "append"
		},
		{
			type: "step/end",
			data: {
				turn,
				step: 1
			}
		},
		{
			type: "turn/end",
			data: {
				turn,
				reason: { kind: "completed" }
			}
		}
	]);
}
/**
* 构造子版本的 seed 与 meta。
* @param source - 源会话。
* @param plan - 版本操作计划。
* @param agentPreset - 子版本使用的 Agent 预设；部署不按会话组合预设时为 undefined。
* @param time - 手写事件的时间戳。
*/
function forkRequest(source, plan, agentPreset, time) {
	const inherited = inheritedPrefix(source, plan.boundary);
	const lineage = {
		...source.cwd === void 0 ? {} : { cwd: source.cwd },
		parentSession: source.id,
		...agentPreset === void 0 ? {} : { agentPreset }
	};
	if (source.format === 0) return {
		seed: [...inherited, ...plan.manualTurn === void 0 ? [] : manualTurnEvents(0, inherited.length, plan.manualTurn, time)],
		meta: {
			...lineage,
			seedLength: inherited.length
		}
	};
	const marker = {
		type: "session/end-seed",
		seq: inherited.length,
		time,
		data: { inherited: true }
	};
	return {
		seed: [
			...inherited,
			marker,
			...plan.manualTurn === void 0 ? [] : manualTurnEvents(4, inherited.length + 1, plan.manualTurn, time)
		],
		meta: {
			...lineage,
			isSeeded: true
		},
		inheritedEventCount: inherited.length
	};
}
/**
* 子版本或恢复源会话时使用的 Agent 选项：日志里最近的请求路由优先，其次是源 Agent 当前的选项。
* 格式 4 额外带上推理强度；0.1.0-rc.3 的 AgentOptions 没有这个字段。
*/
function agentOptions(sessionId, format, route, current) {
	const provider = route?.provider ?? current?.provider;
	const model = route?.model ?? current?.model;
	if (provider === void 0 || provider === "" || model === void 0 || model === "") throw new Error(`无法从会话 ${sessionId} 的历史或当前 Agent 确定模型路由`);
	const maxTokens = route?.maxTokens ?? current?.maxTokens;
	const reasoningEffort = format === 4 ? route?.reasoningEffort ?? current?.reasoningEffort : void 0;
	return {
		provider,
		model,
		...maxTokens === void 0 ? {} : { maxTokens },
		...reasoningEffort === void 0 ? {} : { reasoningEffort }
	};
}
//#endregion
//#region src/host/model.ts
/** 判断内容块是否可编辑。`dsh-read.ts` 保证 `type` 为 text 或 reasoning 的块一定带字符串 `text`。 */
function isTextualBlock(block) {
	return block.type === "text" || block.type === "reasoning";
}
//#endregion
//#region src/host/history.ts
/** 折叠出已经结束的回合；仍在进行的尾部回合不在结果里。 */
function closedTurns(view) {
	const turns = [];
	let open;
	for (const event of view) switch (event.type) {
		case "turn/start":
			open = {
				turn: event.turn,
				startSeq: event.seq,
				assistants: []
			};
			break;
		case "user/message":
			if (open !== void 0 && open.user === void 0 && event.message.sourceKind === "user") open.user = event;
			break;
		case "assistant/message":
			if (open?.turn === event.turn) open.assistants.push(event);
			break;
		case "turn/end": if (open?.turn === event.turn) {
			turns.push({
				...open,
				endSeq: event.seq
			});
			open = void 0;
		}
	}
	return turns;
}
/** 用户消息里的文本块；思考块只出现在助手消息里。 */
function userBlocks(turn, user) {
	return user.message.content.flatMap((block, blockIndex) => isTextualBlock(block) && block.type === "text" ? [{
		key: `${String(user.seq)}:${String(blockIndex)}`,
		turn,
		eventSeq: user.seq,
		blockIndex,
		kind: "user",
		text: block.text,
		time: user.time
	}] : []);
}
/** 助手消息里的文本与思考块，带上消息 id 供聊天区的消息动作行对应。 */
function assistantBlocks(turn, event) {
	return event.message.content.flatMap((block, blockIndex) => isTextualBlock(block) ? [{
		key: `${String(event.seq)}:${String(blockIndex)}`,
		turn,
		eventSeq: event.seq,
		blockIndex,
		kind: block.type === "reasoning" ? "assistant.reasoning" : "assistant.response",
		text: block.text,
		time: event.time,
		messageId: event.message.id
	}] : []);
}
/** 已结束回合里可以编辑的文本块，按回合内的事件顺序排列。 */
function editableMessages(turns) {
	return turns.flatMap((turn) => [...turn.user === void 0 ? [] : userBlocks(turn.turn, turn.user), ...turn.assistants.flatMap((event) => assistantBlocks(turn.turn, event))]);
}
/** 用户消息的纯文本，各文本块以换行连接。 */
function userText(event) {
	return event.message.content.flatMap((block) => isTextualBlock(block) && block.type === "text" ? [block.text] : []).join("\n");
}
/** 由用户消息触发、可以重试的已结束回合。 */
function retryableTurns(turns) {
	return turns.flatMap((turn) => turn.user === void 0 ? [] : [{
		turn: turn.turn,
		userEventSeq: turn.user.seq,
		preview: userText(turn.user),
		time: turn.user.time
	}]);
}
/** 最近一次请求使用的模型路由；还没有发出过请求时返回 undefined。 */
function latestRoute(view) {
	return view.findLast((event) => event.type === "request/header")?.route;
}
/** 会话实际使用的 Agent 预设：最近一次切换优先，否则是 header 记录的创建时预设。 */
function sessionPreset(view, headerPreset) {
	const selected = view.findLast((event) => event.type === "agent-preset/selected");
	return selected === void 0 ? headerPreset : selected.agentPreset;
}
//#endregion
//#region src/host/plan.ts
function newEffect(draft) {
	return {
		id: crypto.randomUUID(),
		...draft
	};
}
/** 替换一个文本或思考块的文本，块的其余字段与其他块原样保留。 */
function replaceText(content, blockIndex, text) {
	return content.map((block, index) => index === blockIndex && isTextualBlock(block) ? {
		...block,
		text
	} : block);
}
/** 从第 `start` 个回合起，各回合的用户输入；保留级联时依次重放它们。 */
function laterPrompts(turns, start) {
	return turns.slice(start).flatMap((turn) => turn.user === void 0 ? [] : [turn.user.message.content]);
}
function cascadePrompts(cascade, turns, start) {
	return cascade === "preserve" ? laterPrompts(turns, start) : [];
}
function editUserPlan(operation, turns, turnIndex, turn, user) {
	const before = user.message.content[operation.blockIndex];
	if (before === void 0 || !isTextualBlock(before) || before.type !== "text") throw conflictError(`会话 ${operation.sessionId} 的用户消息 ${String(user.seq)} 的第 ${String(operation.blockIndex)} 块不是文本`);
	return {
		boundary: turn.startSeq - 1,
		effect: newEffect({
			operation: "edit",
			cascade: operation.cascade,
			targetTurn: turn.turn,
			targetEventSeq: user.seq,
			targetBlockIndex: operation.blockIndex,
			blockKind: "user",
			before: before.text,
			after: operation.text
		}),
		queuedPrompts: [replaceText(user.message.content, operation.blockIndex, operation.text), ...cascadePrompts(operation.cascade, turns, turnIndex + 1)]
	};
}
function editAssistantPlan(operation, turns, turnIndex, turn, assistant) {
	const before = assistant.message.content[operation.blockIndex];
	if (before === void 0 || !isTextualBlock(before)) throw conflictError(`会话 ${operation.sessionId} 的助手消息 ${String(assistant.seq)} 的第 ${String(operation.blockIndex)} 块不是文本或思考`);
	if (turn.user === void 0) throw conflictError(`会话 ${operation.sessionId} 的回合 ${String(turn.turn)} 没有用户输入，无法重建助手消息 ${String(assistant.seq)}`);
	return {
		boundary: turn.startSeq - 1,
		effect: newEffect({
			operation: "edit",
			cascade: operation.cascade,
			targetTurn: turn.turn,
			targetEventSeq: assistant.seq,
			targetBlockIndex: operation.blockIndex,
			blockKind: before.type === "reasoning" ? "assistant.reasoning" : "assistant.response",
			before: before.text,
			after: operation.text
		}),
		manualTurn: {
			turn: turn.turn,
			prompt: turn.user.message.content,
			reply: {
				provider: assistant.message.provider,
				model: assistant.message.model,
				content: replaceText(assistant.message.content, operation.blockIndex, operation.text).filter(isTextualBlock)
			}
		},
		queuedPrompts: cascadePrompts(operation.cascade, turns, turnIndex + 1)
	};
}
/** 编辑一个文本块：用户消息改写后重新生成，助手消息改写后直接写成已结束回合。 */
function editPlan(operation, turns) {
	const turnIndex = turns.findIndex((turn) => operation.eventSeq > turn.startSeq && operation.eventSeq < turn.endSeq);
	const turn = turns[turnIndex];
	if (turn === void 0) throw conflictError(`会话 ${operation.sessionId} 的事件 ${String(operation.eventSeq)} 不在已结束的回合里`);
	if (turn.user?.seq === operation.eventSeq) return editUserPlan(operation, turns, turnIndex, turn, turn.user);
	const assistant = turn.assistants.find((event) => event.seq === operation.eventSeq);
	if (assistant === void 0) throw conflictError(`会话 ${operation.sessionId} 的事件 ${String(operation.eventSeq)} 不是可编辑的消息`);
	return editAssistantPlan(operation, turns, turnIndex, turn, assistant);
}
/**
* 按原输入重新生成最后一个由用户输入触发的已结束回合。回合报错或被停止、没有文本回复时也是它；
* 效果指向回合里最后一条带文本或思考的助手消息，没有这样的消息时指向用户消息。
*/
function rerollPlan(operation, turns) {
	const turn = turns.findLast((candidate) => candidate.user !== void 0);
	if (turn?.user === void 0) throw conflictError(`会话 ${operation.sessionId} 没有由用户输入触发的已结束回合，无法重新生成`);
	const reply = turn.assistants.findLast((event) => event.message.content.some(isTextualBlock));
	return {
		boundary: turn.startSeq - 1,
		effect: newEffect({
			operation: "reroll",
			cascade: "truncate",
			targetTurn: turn.turn,
			targetEventSeq: (reply ?? turn.user).seq
		}),
		queuedPrompts: [turn.user.message.content]
	};
}
/** 重试一个历史回合：截断时只重放它，保留时连同后续回合的用户输入一起重放。 */
function retryPlan(operation, turns) {
	const turnIndex = turns.findIndex((turn) => turn.turn === operation.turn);
	const turn = turns[turnIndex];
	if (turn?.user === void 0) throw conflictError(`会话 ${operation.sessionId} 的回合 ${String(operation.turn)} 不是由用户输入触发的已结束回合`);
	return {
		boundary: turn.startSeq - 1,
		effect: newEffect({
			operation: "retry",
			cascade: operation.cascade,
			targetTurn: turn.turn,
			targetEventSeq: turn.user.seq
		}),
		queuedPrompts: operation.cascade === "preserve" ? laterPrompts(turns, turnIndex) : [turn.user.message.content]
	};
}
function planOperation(operation, turns) {
	if (operation.action === "edit") return editPlan(operation, turns);
	if (operation.action === "reroll") return rerollPlan(operation, turns);
	return retryPlan(operation, turns);
}
//#endregion
//#region src/host/operation.ts
/** 在 Agent 的空闲阶段运行任务；Agent 正忙时 `runMaintenance` 同步抛出，翻译成业务冲突。 */
function duringMaintenance(agent, sessionId, task) {
	try {
		return agent.runMaintenance(task);
	} catch (error) {
		throw conflictError(`会话 ${sessionId} 正在运行或正在创建其他版本，结束后再试`, { cause: error });
	}
}
/** 拿到源会话的 Agent：live 的直接用，否则临时恢复一个，任务结束后释放。 */
async function withSourceAgent(ctx, sessionId, task) {
	const live = ctx.agents.get(sessionId);
	if (live !== void 0) return duringMaintenance(live, sessionId, () => task(live));
	const stored = storedSessionLog(await ctx.sessionQuery.readSession(sessionId));
	const handle = await ctx.agents.resume({
		resumeSessionId: sessionId,
		agentOptions: agentOptions(sessionId, stored.format, latestRoute(stored.view), void 0)
	});
	try {
		return await duringMaintenance(handle.agent, sessionId, () => task(handle.agent));
	} finally {
		await handle.dispose();
	}
}
/** 子版本沿用源会话的 Agent 预设；部署没有预设服务或会话没有预设时返回 undefined。 */
async function presetSetup(ctx, presetId) {
	const presets = ctx.get("agentPresets");
	if (presets === void 0 || presetId === void 0) return void 0;
	const { id } = await presets.resolve(presetId);
	return {
		id,
		setup: async (scope) => {
			await presets.mount(scope, id);
		}
	};
}
/** 逆序执行撤销步骤，返回失败的步骤抛出的错误。 */
async function rollback(undo) {
	const failures = [];
	for (const step of undo.toReversed()) try {
		await step();
	} catch (failure) {
		failures.push(failure instanceof Error ? failure : new Error(String(failure)));
	}
	return failures;
}
async function createVersion(ctx, versions, operation, source) {
	const log = liveSessionLog(source.session);
	const plan = planOperation(operation, closedTurns(log.view));
	const options = agentOptions(log.id, log.format, latestRoute(log.view), source.options);
	const preset = await presetSetup(ctx, sessionPreset(log.view, log.agentPreset));
	const createdAt = Date.now();
	const fork = forkRequest(log, plan, preset?.id, createdAt);
	const childId = `session-${crypto.randomUUID()}`;
	const undo = [];
	try {
		const child = await ctx.agents.create({
			sessionId: childId,
			seed: fork.seed,
			meta: fork.meta,
			...fork.inheritedEventCount === void 0 ? {} : { inheritedEventCount: fork.inheritedEventCount },
			agentOptions: options,
			...preset === void 0 ? {} : { setup: preset.setup }
		});
		undo.push(() => child.dispose());
		child.agent.inbox.clear();
		await ctx.sessions.flush(child.agent.session);
		await versions.put(childId, {
			parentSessionId: log.id,
			createdAt,
			effect: plan.effect
		});
		undo.push(async () => {
			await versions.delete(childId);
		});
		const workspace = ctx.workspaceRegistry.list().find((candidate) => candidate.sessionIds.includes(log.id));
		if (workspace !== void 0) {
			await workspace.attachSession(childId);
			undo.push(() => workspace.detachSession(childId));
		}
		for (const prompt of plan.queuedPrompts) child.agent.followup(userMessage(prompt));
		return {
			sessionId: childId,
			queuedTurns: plan.queuedPrompts.length
		};
	} catch (error) {
		const failures = await rollback(undo);
		if (failures.length > 0) throw new AggregateError([error, ...failures], `会话 ${log.id} 的 ${operation.action} 版本 ${childId} 创建失败，撤销已完成的步骤也失败`, { cause: error });
		throw error;
	}
}
/** 执行一次版本操作，返回新版本的会话 id 与排队的回合数。 */
function runOperation(ctx, versions, operation) {
	return withSourceAgent(ctx, operation.sessionId, (source) => createVersion(ctx, versions, operation, source));
}
//#endregion
//#region src/host/timeline.ts
/** 版本记录的来源必须就是会话 header 记录的父会话。 */
function assertRecordMatches(node, record) {
	if (record.parentSessionId !== node.parentSessionId) throw new Error(`版本 ${node.sessionId} 的记录来源 ${record.parentSessionId} 与会话的父会话 ${node.parentSessionId ?? "（无）"} 不一致`);
}
/** 从当前版本沿 parentSession 往上能到达的版本。 */
function currentPath(nodes, sessionId) {
	const path = /* @__PURE__ */ new Set();
	for (let cursor = nodes.get(sessionId); cursor !== void 0 && !path.has(cursor.sessionId); cursor = cursor.parentSessionId === void 0 ? void 0 : nodes.get(cursor.parentSessionId)) path.add(cursor.sessionId);
	return path;
}
/** 从当前版本往回、可以逐个撤销到的版本；第一个是直接来源版本。 */
function undoStack(nodes, records, sessionId) {
	const stack = [];
	for (let record = records.get(sessionId); record !== void 0; record = records.get(record.parentSessionId)) {
		const target = record.parentSessionId;
		if (target === sessionId || stack.includes(target)) throw new Error(`会话 ${sessionId} 的撤销链在版本 ${target} 处形成循环`);
		if (!nodes.has(target)) throw new Error(`会话 ${sessionId} 的撤销目标 ${target} 不在可见版本树里`);
		stack.push(target);
	}
	return stack;
}
/** 一个版本的摘要；本插件创建的版本以操作时间为创建时间，并带上效果。 */
function versionSummary(node, record, sessionId, path) {
	return {
		sessionId: node.sessionId,
		...node.parentSessionId === void 0 ? {} : { parentSessionId: node.parentSessionId },
		createdAt: record === void 0 ? node.createdAt : record.createdAt,
		depth: node.depth,
		current: node.sessionId === sessionId,
		onCurrentEffectPath: path.has(node.sessionId),
		...record === void 0 ? {} : { effect: record.effect }
	};
}
function projectTimeline(input) {
	const { sessionId, lineage, records } = input;
	const nodes = new Map(lineage.map((node) => [node.sessionId, node]));
	if (!nodes.has(sessionId)) throw new Error(`会话 ${sessionId} 不在它自己的版本树里`);
	const effectOwners = /* @__PURE__ */ new Map();
	for (const [id, record] of records) {
		const node = nodes.get(id);
		if (node === void 0) throw new Error(`版本记录 ${id} 不在会话 ${sessionId} 的版本树里`);
		assertRecordMatches(node, record);
		const owner = effectOwners.get(record.effect.id);
		if (owner !== void 0) throw new Error(`版本 ${owner} 与 ${id} 记录了同一个效果 ${record.effect.id}`);
		effectOwners.set(record.effect.id, id);
	}
	const path = currentPath(nodes, sessionId);
	const versions = lineage.map((node) => versionSummary(node, records.get(node.sessionId), sessionId, path));
	const redoSessionIds = versions.filter((version) => version.parentSessionId === sessionId && version.effect !== void 0).toSorted((left, right) => left.createdAt - right.createdAt || left.sessionId.localeCompare(right.sessionId)).map((version) => version.sessionId);
	return {
		sessionId,
		messages: editableMessages(input.turns),
		retryableTurns: retryableTurns(input.turns),
		versions,
		undoStack: undoStack(nodes, records, sessionId),
		redoSessionIds
	};
}
/** 读取一个会话的时间线。 */
async function loadTimeline(ctx, versions, sessionId) {
	const [lineage, log] = await Promise.all([readLineage(ctx.sessionQuery, sessionId), readSessionLog(ctx, sessionId)]);
	return projectTimeline({
		sessionId,
		lineage,
		records: new Map(lineage.flatMap((node) => {
			const record = versions.get(node.sessionId);
			return record === void 0 ? [] : [[node.sessionId, record]];
		})),
		turns: closedTurns(log.view)
	});
}
//#endregion
//#region src/host/route.ts
/**
* `MESSAGE_EDIT_PATH` 路由：GET 返回时间线，POST 执行版本操作。
*
* 0.2.1-rc.3 的 `ctx.connection.requestRejection` 对自定义路由执行 Host/Origin 检查与浏览器
* 认证，存在时先过它。请求不合法返回 400，会话状态不允许操作返回 409，其余失败返回 500 并记日志；
* 出错时响应体都是 `{error}`。
*/
const SessionIdParamSchema = /* @__PURE__ */ pipe(/* @__PURE__ */ string("缺少 sessionId 查询参数"), /* @__PURE__ */ nonEmpty());
const OperationBodySchema = /* @__PURE__ */ pipe(/* @__PURE__ */ string(), /* @__PURE__ */ parseJson(), MessageEditOperationSchema);
function invalidRequest(summary) {
	return {
		status: 400,
		body: { error: `请求不合法：${summary}` }
	};
}
async function readBody(request) {
	const decoder = new TextDecoder();
	let text = "";
	for await (const chunk of request) text += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
	return text + decoder.decode();
}
/** 执行一个已经通过校验的请求，把失败按类别映射成状态码。 */
async function settle(logger, action, task) {
	try {
		return {
			status: 200,
			body: await task()
		};
	} catch (error) {
		if (error instanceof Error && isConflictError(error)) return {
			status: 409,
			body: { error: error.message }
		};
		const message = `${action}失败：${error instanceof Error ? error.message : String(error)}`;
		const detail = error instanceof Error ? error.stack ?? error.message : String(error);
		logger.error("%s\n%s", message, detail);
		return {
			status: 500,
			body: { error: message }
		};
	}
}
async function reply(ctx, versions, request) {
	switch (request.method) {
		case "GET": {
			const query = new URL(request.url, "http://message-edit.local").searchParams;
			const sessionId = /* @__PURE__ */ safeParse(SessionIdParamSchema, query.get("sessionId"));
			if (!sessionId.success) return invalidRequest(/* @__PURE__ */ summarize(sessionId.issues));
			return settle(ctx.logger, `读取会话 ${sessionId.output} 的时间线`, () => loadTimeline(ctx, versions, sessionId.output));
		}
		case "POST": {
			const operation = /* @__PURE__ */ safeParse(OperationBodySchema, await readBody(request));
			if (!operation.success) return invalidRequest(/* @__PURE__ */ summarize(operation.issues));
			return settle(ctx.logger, `在会话 ${operation.output.sessionId} 上执行 ${operation.output.action}`, () => runOperation(ctx, versions, operation.output));
		}
		default: return {
			status: 405,
			body: { error: `${MESSAGE_EDIT_PATH} 不支持 ${request.method} 请求` },
			headers: { allow: "GET, POST" }
		};
	}
}
function respond(response, { status, body, headers }) {
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
		...headers
	});
	response.end(JSON.stringify(body));
}
function messageEditRoute(ctx, versions) {
	return {
		kind: "exact",
		path: MESSAGE_EDIT_PATH,
		handler: async (request, response) => {
			const rejection = ctx.connection.requestRejection?.(request);
			if (rejection !== void 0) {
				respond(response, {
					status: rejection,
					body: { error: `DSH 连接鉴权拒绝了这个请求（HTTP ${String(rejection)}）` }
				});
				return;
			}
			respond(response, await reply(ctx, versions, request));
		}
	};
}
//#endregion
//#region src/host/version-store.ts
/**
* 版本记录存在 `ctx.storageDomain` 的 `message_edit` domain 里，键是子会话 id。
*
* 声明写成两版 DSH 都接受的纯对象：0.1.0-rc.3 与 0.2.1-rc.3 的 `open` 只读取 `name`、`version`、
* `tables`，并在打开时对每条存储记录调用 `valueSchema.parse`；不写 `layout` 时 0.2.1-rc.3 的 json
* 后端与 0.1.0-rc.3 一样存成单个 `message_edit.json`。Host bundle 因此不需要 import `defineDomain`。
*/
/** domain 的存储格式版本；存储里记录的版本与它不同时 domain 拒绝打开。 */
const VERSION_DOMAIN_FORMAT = 1;
/** 校验一条存储的版本记录；不符合 `VersionRecordSchema` 时抛出，DSH 会补上记录键再拒绝打开 domain。 */
function parseVersionRecord(raw) {
	const result = /* @__PURE__ */ safeParse(VersionRecordSchema, raw);
	if (!result.success) throw new Error(`版本记录不符合 VersionRecordSchema：${/* @__PURE__ */ summarize(result.issues)}`);
	return result.output;
}
const VERSION_DOMAIN = {
	name: MESSAGE_EDIT_DOMAIN,
	version: VERSION_DOMAIN_FORMAT,
	tables: { [MESSAGE_EDIT_VERSIONS_TABLE]: { valueSchema: { parse: parseVersionRecord } } }
};
//#endregion
//#region src/host/index.ts
/**
* Message Edit 的 Host 半边：把消息编辑、重新生成与重试做成可撤销的会话版本分支。
*
* 同一份产物运行在 DSH 0.1.0-rc.3 与 DSH Desktop 0.2.1-rc.3 上：`inject` 只列两版都有的 Service，
* 版本记录存在 storageDomain 里，会话日志只含 DSH 内置事件。
*/
const name = "agent-stash-message-edit";
/** `agentPresets` 不在这里：两版由不同的包提供，部署也可能没有它，用到时经 `ctx.get` 读取。 */
const inject = [
	"sessions",
	"agents",
	"sessionQuery",
	"workspaceRegistry",
	"webServer",
	"storageDomain",
	"connection"
];
async function apply(ctx) {
	await ctx.effect(async function* () {
		const domain = await ctx.storageDomain.open(VERSION_DOMAIN);
		yield () => domain.close();
		yield ctx.webServer.register(messageEditRoute(ctx, domain.table(MESSAGE_EDIT_VERSIONS_TABLE)));
	}, "message-edit: version domain and HTTP route");
}
//#endregion
export { apply, inject, name };
