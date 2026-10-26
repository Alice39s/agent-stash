import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
//#region node_modules/.pnpm/pathe@2.0.3/node_modules/pathe/dist/shared/pathe.M-eThtNZ.mjs
const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
	if (!input) return input;
	return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _UNC_REGEX = /^[/\\]{2}/;
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const normalize = function(path) {
	if (path.length === 0) return ".";
	path = normalizeWindowsPath(path);
	const isUNCPath = path.match(_UNC_REGEX);
	const isPathAbsolute = isAbsolute(path);
	const trailingSeparator = path[path.length - 1] === "/";
	path = normalizeString(path, !isPathAbsolute);
	if (path.length === 0) {
		if (isPathAbsolute) return "/";
		return trailingSeparator ? "./" : ".";
	}
	if (trailingSeparator) path += "/";
	if (_DRIVE_LETTER_RE.test(path)) path += "/";
	if (isUNCPath) {
		if (!isPathAbsolute) return `//./${path}`;
		return `//${path}`;
	}
	return isPathAbsolute && !isAbsolute(path) ? `/${path}` : path;
};
const join = function(...segments) {
	let path = "";
	for (const seg of segments) {
		if (!seg) continue;
		if (path.length > 0) {
			const pathTrailing = path[path.length - 1] === "/";
			const segLeading = seg[0] === "/";
			if (pathTrailing && segLeading) path += seg.slice(1);
			else path += pathTrailing || segLeading ? seg : `/${seg}`;
		} else path += seg;
	}
	return normalize(path);
};
function normalizeString(path, allowAboveRoot) {
	let res = "";
	let lastSegmentLength = 0;
	let lastSlash = -1;
	let dots = 0;
	let char = null;
	for (let index = 0; index <= path.length; ++index) {
		if (index < path.length) char = path[index];
		else if (char === "/") break;
		else char = "/";
		if (char === "/") {
			if (lastSlash === index - 1 || dots === 1);
			else if (dots === 2) {
				if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
					if (res.length > 2) {
						const lastSlashIndex = res.lastIndexOf("/");
						if (lastSlashIndex === -1) {
							res = "";
							lastSegmentLength = 0;
						} else {
							res = res.slice(0, lastSlashIndex);
							lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
						}
						lastSlash = index;
						dots = 0;
						continue;
					} else if (res.length > 0) {
						res = "";
						lastSegmentLength = 0;
						lastSlash = index;
						dots = 0;
						continue;
					}
				}
				if (allowAboveRoot) {
					res += res.length > 0 ? "/.." : "..";
					lastSegmentLength = 2;
				}
			} else {
				if (res.length > 0) res += `/${path.slice(lastSlash + 1, index)}`;
				else res = path.slice(lastSlash + 1, index);
				lastSegmentLength = index - lastSlash - 1;
			}
			lastSlash = index;
			dots = 0;
		} else if (char === "." && dots !== -1) ++dots;
		else dots = -1;
	}
	return res;
}
const isAbsolute = function(p) {
	return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
	const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
	if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) segments[0] += "/";
	return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};
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
//#region dsh/shared/host/kit.ts
const STASH_KIT = "@agent-stash/dsh-stash-kit";
const PackageNameSchema = /* @__PURE__ */ object({ name: /* @__PURE__ */ string() });
function stashKitSpec(hostFile) {
	const sibling = join(dirname(dirname(dirname(hostFile))), "kit");
	const manifest = join(sibling, "package.json");
	if (!existsSync(manifest)) return STASH_KIT;
	const { name } = parse(PackageNameSchema, JSON.parse(readFileSync(manifest, "utf8")));
	return name === "@agent-stash/dsh-stash-kit" ? sibling : STASH_KIT;
}
function check(result, plugin, action) {
	if (result.application === "failed") throw new Error(`${plugin}: ${action} the ${STASH_KIT} bundle failed (${result.error?.code ?? "unknown"})`);
}
async function ensureStashKit(manager, plugin, spec) {
	const kit = (await manager.listBundles()).find((bundle) => bundle.name === STASH_KIT);
	if (kit?.enabled === true) return "present";
	if (kit?.installed !== true) {
		const installed = await manager.installBundle(spec);
		if (installed.error?.code !== "already-installed") {
			check(installed, plugin, "installing");
			return "installed";
		}
	}
	check(await manager.setBundleEnabled(STASH_KIT, true), plugin, "enabling");
	return "enabled";
}
function requireStashKit(ctx, plugin, hostFile) {
	ctx.inject(["pluginManager"], (inner) => {
		ensureStashKit(inner.pluginManager, plugin, stashKitSpec(hostFile)).catch((error) => {
			console.error(`[${plugin}] the ${STASH_KIT} bundle is not available:`, error);
		});
	});
}
//#endregion
//#region dsh/shared/prompts.ts
function isUserMessageData(data) {
	if (typeof data !== "object" || data === null) return false;
	const { content, source } = data;
	return Array.isArray(content) && typeof source === "object" && source !== null;
}
function promptOf(event) {
	if (event.type !== "user/message" || !isUserMessageData(event.data)) return void 0;
	if (event.data.source.kind !== "user") return void 0;
	const text = event.data.content.flatMap((block) => block.type === "text" && block.text !== void 0 ? [block.text] : []).join("\n");
	if (text.trim() === "") return void 0;
	return {
		text,
		time: event.time,
		seq: event.seq
	};
}
function sessionPrompts(events) {
	return events.flatMap((event) => {
		const prompt = promptOf(event);
		return prompt === void 0 ? [] : [prompt];
	});
}
function mergeGlobalPrompts(lists, limit) {
	const all = lists.flatMap((list) => list.prompts.map((prompt) => ({
		text: prompt.text,
		time: prompt.time,
		sessionId: list.sessionId,
		...list.title === void 0 ? {} : { title: list.title }
	})));
	all.sort((left, right) => right.time - left.time);
	const seen = /* @__PURE__ */ new Set();
	const merged = [];
	for (const entry of all) {
		if (merged.length >= limit) break;
		if (seen.has(entry.text)) continue;
		seen.add(entry.text);
		merged.push(entry);
	}
	return merged;
}
//#endregion
//#region dsh/shared/host/history.ts
function createPromptHistory(source, limits) {
	const cache = /* @__PURE__ */ new Map();
	function read(id, stamp) {
		const cached = cache.get(id);
		if (cached !== void 0 && (stamp === void 0 || cached.stamp === stamp)) return cached.prompts;
		const prompts = source.prompts(id);
		const entry = {
			stamp,
			prompts
		};
		cache.set(id, entry);
		prompts.catch(() => {
			if (cache.get(id) === entry) cache.delete(id);
		});
		return prompts;
	}
	return {
		session: (id) => read(id, source.stamp(id)),
		async global() {
			const sessions = (await source.sessions()).filter((session) => session.stamp !== null).toSorted((left, right) => right.rank - left.rank).slice(0, limits.maxSessions);
			const lists = [];
			for (const session of sessions) lists.push({
				sessionId: session.id,
				...session.title === void 0 ? {} : { title: session.title },
				prompts: await read(session.id, session.stamp)
			});
			return mergeGlobalPrompts(lists, limits.maxEntries);
		}
	};
}
//#endregion
//#region dsh/shared/host/http.ts
function sendJson(res, status, payload) {
	res.statusCode = status;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.end(JSON.stringify(payload));
}
//#endregion
//#region dsh/shared/host/plugin.ts
const HOST_INJECT = [
	"webServer",
	"connection",
	"sessionQuery",
	"sessions",
	"sessionProjections"
];
const KEYS = ["sessionListMetadata", "title"];
const MAX_SESSIONS = 50;
const MAX_ENTRIES = 500;
function liveSnapshot(ctx, live) {
	return ctx.sessionProjections.cachedSnapshot(live, KEYS) ?? ctx.sessionProjections.snapshot(live, KEYS);
}
function snapshotOf(ctx, header) {
	const live = ctx.sessions.get(header.id);
	if (live !== void 0) return liveSnapshot(ctx, live);
	return ctx.get("sessionProjectionCache")?.cachedSnapshot(header, KEYS);
}
function dshHistorySource(ctx) {
	return {
		async sessions() {
			return (await ctx.sessionQuery.listSessions()).map((record) => record.header).filter((header) => header.cwd !== void 0 && header.origin !== "subagent" && (header.delegationDepth ?? 0) === 0).map((header) => {
				const values = snapshotOf(ctx, header)?.values;
				const stamp = values?.sessionListMetadata?.lastPromptAt;
				const info = {
					id: header.id,
					stamp,
					rank: stamp ?? header.createdAt
				};
				if (typeof values?.title === "string") info.title = values.title;
				return info;
			});
		},
		stamp(id) {
			const live = ctx.sessions.get(id);
			if (live === void 0) return void 0;
			return liveSnapshot(ctx, live).values.sessionListMetadata?.lastPromptAt;
		},
		async prompts(id) {
			return sessionPrompts((await ctx.sessionQuery.readSession(id)).events);
		}
	};
}
function promptRouteHandler(history, rejection) {
	return async (req, res) => {
		const rejected = rejection(req);
		if (rejected !== void 0) {
			res.statusCode = rejected;
			res.end();
			return;
		}
		if (req.method !== "GET") {
			res.setHeader("allow", "GET");
			sendJson(res, 405, { message: "only GET is allowed" });
			return;
		}
		const sessionId = new URL(req.url ?? "/", "http://localhost").searchParams.get("session");
		try {
			sendJson(res, 200, { items: sessionId === null ? await history.global() : (await history.session(sessionId)).map(({ text, time }) => ({
				text,
				time
			})) });
		} catch (error) {
			sendJson(res, 500, { message: `reading prompts of ${sessionId === null ? "global history" : `session "${sessionId}"`} failed: ${String(error)}` });
		}
	};
}
function registerPromptRoute(ctx, path, label) {
	const handler = promptRouteHandler(createPromptHistory(dshHistorySource(ctx), {
		maxSessions: MAX_SESSIONS,
		maxEntries: MAX_ENTRIES
	}), (req) => ctx.connection.requestRejection(req));
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path,
		handler
	}), label);
}
//#endregion
//#region dsh/recall/src/index.ts
const name = "dsh-recall";
const inject = HOST_INJECT;
function apply(ctx) {
	registerPromptRoute(ctx, "/dsh-recall/prompts", "dsh-recall: GET /dsh-recall/prompts");
	requireStashKit(ctx, name, fileURLToPath(import.meta.url));
}
//#endregion
export { apply, inject, name };
