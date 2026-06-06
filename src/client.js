import { operations, groups } from "./operations.js";

const DEFAULT_BASE_URL = "https://api.crawlora.net/api/v1";
export const VERSION = "1.6.0-sdk.2";
const DEFAULT_USER_AGENT = `crawlora-js-sdk/${VERSION}`;

export class CrawloraError extends Error {
  constructor(message, { status = 0, code, body, headers = {}, response, cause, retryable, requestId } = {}) {
    super(message);
    this.name = "CrawloraError";
    this.status = status;
    this.code = code;
    this.body = body;
    this.headers = headers;
    this.response = response;
    this.cause = cause;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

// Response status 4xx: the request was rejected by the API (bad params, auth,
// not found). Usually not retryable.
export class CrawloraClientError extends CrawloraError {
  constructor(message, options) {
    super(message, options);
    this.name = "CrawloraClientError";
  }
}

// Response status 5xx: the API failed to handle a valid request. Retryable.
export class CrawloraServerError extends CrawloraError {
  constructor(message, options) {
    super(message, options);
    this.name = "CrawloraServerError";
  }
}

// Transport failure, timeout, or abort before a response was received.
export class CrawloraNetworkError extends CrawloraError {
  constructor(message, options) {
    super(message, options);
    this.name = "CrawloraNetworkError";
  }
}

function apiErrorClass(status) {
  return status >= 500 ? CrawloraServerError : CrawloraClientError;
}

/**
 * Client for the Crawlora API.
 *
 * Call operations via grouped helpers (`client.bing.search({ q })`) or
 * dynamically (`client.request("bing-search", { q })`). Supports configurable
 * retries, an `onRetry` hook, opt-in `requestId` and `idempotencyKeys`,
 * `beforeRequest`/`afterResponse` middleware, client-side `rateLimit` /
 * `maxConcurrency`, pagination (`paginate`/`paginateItems`), and
 * `responseType: "stream"`.
 */
export class CrawloraClient {
  constructor(options = {}) {
    // Precedence: explicit option > environment variable > default.
    this.apiKey = options.apiKey || envVar("CRAWLORA_API_KEY") || "";
    this.jwtToken = options.jwtToken || "";
    this.baseUrl = (options.baseUrl || envVar("CRAWLORA_BASE_URL") || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? 30000;
    this.retries = normalizeNonNegativeInteger(options.retries ?? 0);
    this.retryDelay = normalizeNonNegativeNumber(options.retryDelay ?? 250);
    this.maxRetryDelay = normalizeNonNegativeNumber(options.maxRetryDelay ?? 30000);
    this.retryStatuses = options.retryStatuses ? new Set(options.retryStatuses) : null;
    this.isRetryable = typeof options.isRetryable === "function" ? options.isRetryable : null;
    this.onRetry = typeof options.onRetry === "function" ? options.onRetry : null;
    this.requestId = options.requestId === true;
    this.idempotencyKeys = options.idempotencyKeys === true;
    this.logger = typeof options.logger === "function" ? options.logger : null;
    this.beforeRequest = asHookList(options.beforeRequest);
    this.afterResponse = asHookList(options.afterResponse);
    this.limiter = (options.rateLimit > 0 || options.maxConcurrency > 0)
      ? new RateLimiter(options.rateLimit || 0, options.maxConcurrency || 0)
      : null;
    this.headers = { ...(options.headers || {}) };
    this.userAgent = options.userAgent === false ? "" : (options.userAgent || DEFAULT_USER_AGENT);
    this.fetch = options.fetch || globalThis.fetch;

    if (typeof this.fetch !== "function") {
      throw new TypeError("CrawloraClient requires a fetch implementation");
    }

    for (const [groupName, groupOperations] of Object.entries(groups)) {
      this[groupName] = {};
      for (const [methodName, operationId] of Object.entries(groupOperations)) {
        this[groupName][methodName] = (params = {}, requestOptions = {}) =>
          this.request(operationId, params, requestOptions);
      }
    }
  }

  operation(operationId, params = {}, options = {}) {
    return this.request(operationId, params, options);
  }

  async request(operationId, params = {}, options = {}) {
    const operation = operations[operationId];
    if (!operation) {
      throw new TypeError(`Unknown Crawlora operation: ${operationId}`);
    }
    params = params ?? {};
    options = options ?? {};
    const responseType = validateResponseType(options.responseType || "auto");
    this.#log({ event: "request", operation: operationId });
    const maxRetries = options.retries ?? this.retries;
    const isRetryable = typeof options.isRetryable === "function" ? options.isRetryable : null;
    const idempotencyKey = (this.idempotencyKeys && (operation.method === "POST" || operation.method === "PATCH"))
      ? generateId() : undefined;

    let attempt = 0;
    for (;;) {
      try {
        const run = () => this.#send(operation, params, options, responseType, idempotencyKey);
        return await (this.limiter ? this.limiter.run(run, options.signal) : run());
      } catch (error) {
        const retryable = isRetryable ? !!isRetryable(error.status, error) : this.#isRetryable(error.status, error);
        if (!(error instanceof CrawloraError) || error.retryable === false || attempt >= maxRetries || !retryable) {
          throw error;
        }
        attempt++;
        const delay = this.#retryDelayFor(error, attempt);
        this.#log({ event: "retry", operation: operationId, attempt, status: error.status, delay });
        if (this.onRetry) this.onRetry(attempt, error, delay);
        await sleep(delay, options.signal);
      }
    }
  }

  #isRetryable(status, error) {
    if (this.isRetryable) return !!this.isRetryable(status, error);
    if (this.retryStatuses) return status === 0 || this.retryStatuses.has(status);
    return shouldRetry(status);
  }

  #retryDelayFor(error, attempt) {
    const retryAfter = parseRetryAfter(error.headers, this.maxRetryDelay);
    return retryAfter ?? retryDelay(this.retryDelay, attempt);
  }

  #log(event) {
    if (this.logger) this.logger(event);
  }

  async #send(operation, params, options, responseType, idempotencyKey) {
    const { url, body, bodyHeaders } = buildRequest(operation, this.baseUrl, params);
    const headers = mergeHeaders(
      this.headers,
      authHeaders(operation.security, this.apiKey, this.jwtToken),
      userAgentHeader(this.userAgent),
      bodyHeaders,
      options.headers
    );
    const requestId = this.requestId ? ensureRequestId(headers) : (headerValue(headers, "x-request-id") || undefined);
    if (idempotencyKey && !headerValue(headers, "idempotency-key")) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    let requestUrl = url;
    let requestHeaders = headers;
    if (this.beforeRequest.length) {
      const ctx = { operationId: operation.id, method: operation.method, url: requestUrl, headers: requestHeaders };
      for (const hook of this.beforeRequest) await hook(ctx);
      requestUrl = ctx.url;
      requestHeaders = ctx.headers;
    }

    const controller = new AbortController();
    const timeoutMs = options.timeout ?? this.timeout;
    let timedOut = false;
    const timeout = timeoutMs > 0 ? setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs) : undefined;
    const signal = composeSignal(controller, options.signal);
    let response;
    try {
      response = await this.fetch(requestUrl, {
        method: operation.method,
        headers: requestHeaders,
        body,
        signal
      });
    } catch (error) {
      if (options.signal?.aborted) {
        throw new CrawloraNetworkError("Crawlora request aborted", { cause: error, retryable: false, requestId });
      }
      if (timedOut) {
        throw new CrawloraNetworkError("Crawlora request timed out", { cause: error, retryable: false, requestId });
      }
      throw new CrawloraNetworkError("Crawlora transport error", { cause: error, requestId });
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    const headersObject = responseHeaders(response);
    // Streaming success returns the raw Response; the caller reads response.body.
    if (responseType === "stream" && response.ok) {
      return response;
    }
    let parsed = await parseResponse(response, responseType === "stream" ? "auto" : responseType, headersObject, requestId);
    if (!response.ok) {
      const code = parsed && typeof parsed === "object" ? parsed.code : undefined;
      const message = parsed && typeof parsed === "object" && parsed.msg ? parsed.msg : response.statusText;
      const ApiError = apiErrorClass(response.status);
      throw new ApiError(message || `Crawlora request failed with status ${response.status}`, {
        status: response.status,
        code,
        body: parsed,
        headers: headersObject,
        response,
        requestId
      });
    }
    if (this.afterResponse.length) {
      for (const hook of this.afterResponse) {
        const result = await hook(operation.id, response.status, headersObject, parsed);
        if (result !== undefined) parsed = result;
      }
    }
    return parsed;
  }

  // Async iterator over pages of a paginated operation. Numeric mode advances
  // the page/offset query parameter and stops on an empty page; cursor mode
  // (cursorParam + nextCursor) sends the cursor and stops when nextCursor is falsy.
  //   for await (const page of client.paginate("ebay-seller-feedback", { seller })) { ... }
  async *paginate(operationId, params = {}, options = {}) {
    const operation = operations[operationId];
    if (!operation) {
      throw new TypeError(`Unknown Crawlora operation: ${operationId}`);
    }
    const maxPages = options.maxPages ?? Infinity;

    if (options.cursorParam || options.nextCursor) {
      if (!(options.cursorParam && options.nextCursor)) {
        throw new TypeError("cursor pagination requires both cursorParam and nextCursor");
      }
      if (!operation.queryParams.some((parameter) => parameter.name === options.cursorParam)) {
        throw new TypeError(`cursorParam ${options.cursorParam} is not a query parameter of ${operationId}`);
      }
      let cursor = options.start;
      for (let i = 0; i < maxPages; i++) {
        const pageParams = { ...params };
        if (cursor !== undefined && cursor !== null) pageParams[options.cursorParam] = cursor;
        const response = await this.request(operationId, pageParams, options);
        yield response;
        cursor = options.nextCursor(response);
        if (!cursor) break;
      }
      return;
    }

    const pageParam = options.pageParam || detectPageParam(operation);
    if (!pageParam) {
      throw new TypeError(`Operation ${operationId} has no page or offset query parameter to paginate`);
    }
    const step = options.step ?? 1;
    let pageValue = options.start ?? (pageParam === "offset" ? 0 : 1);
    for (let i = 0; i < maxPages; i++) {
      const response = await this.request(operationId, { ...params, [pageParam]: pageValue }, options);
      yield response;
      if (pageIsEmpty(response)) break;
      pageValue += step;
    }
  }

  // Async iterator over individual items across pages. `items` extracts the list
  // from a page (default: the Crawlora `data` array).
  async *paginateItems(operationId, params = {}, options = {}) {
    const extract = options.items || defaultItems;
    for await (const page of this.paginate(operationId, params, options)) {
      for (const item of extract(page)) yield item;
    }
  }
}

const PAGE_PARAM_NAMES = ["page", "offset"];

function defaultItems(response) {
  if (response && typeof response === "object" && Array.isArray(response.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
}

function detectPageParam(operation) {
  for (const name of PAGE_PARAM_NAMES) {
    if (operation.queryParams.some((parameter) => parameter.name === name)) return name;
  }
  return undefined;
}

function pageIsEmpty(response) {
  if (response === undefined || response === null) return true;
  let data = response;
  if (typeof response === "object" && !Array.isArray(response) && "data" in response) {
    data = response.data;
  }
  if (data === undefined || data === null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") return Object.keys(data).length === 0;
  return !data;
}

function buildRequest(operation, baseUrl, params) {
  validateRequiredParams(operation, params);
  validateEnumParams(operation, params);
  let path = operation.path;
  for (const name of operation.pathParams) {
    const value = params[name];
    if (value === undefined || value === null || value === "") {
      throw new TypeError(`Missing required path parameter: ${name}`);
    }
    path = path.replace(`{${name}}`, encodeURIComponent(String(value)));
  }

  const query = new URLSearchParams();
  for (const parameter of operation.queryParams) {
    const value = params[parameter.name];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) query.append(parameter.name, String(item));
    } else {
      query.append(parameter.name, String(value));
    }
  }

  const suffix = query.toString();
  const url = `${baseUrl}${path}${suffix ? `?${suffix}` : ""}`;
  const bodyHeaders = {};
  let body;

  if (operation.formParams.length > 0) {
    const form = new FormData();
    for (const parameter of operation.formParams) {
      const value = params[parameter.name];
      if (value !== undefined && value !== null) form.append(parameter.name, value);
    }
    body = form;
  } else if (operation.bodyParam) {
    const value = params[operation.bodyParam] ?? params.body;
    if (value !== undefined) {
      body = JSON.stringify(value);
      bodyHeaders["content-type"] = "application/json";
    }
  }

  return { url, body, bodyHeaders };
}

function validateRequiredParams(operation, params) {
  for (const parameter of [...operation.pathParams.map((name) => ({ name, in: "path", required: true })), ...operation.queryParams, ...operation.formParams]) {
    if (parameter.required && isMissing(params[parameter.name])) {
      throw new TypeError(`Missing required ${parameter.in || "request"} parameter: ${parameter.name}`);
    }
  }
  if (operation.bodyRequired && isMissing(params[operation.bodyParam]) && isMissing(params.body)) {
    throw new TypeError(`Missing required body parameter: ${operation.bodyParam}`);
  }
}

function validateEnumParams(operation, params) {
  for (const parameter of [...operation.queryParams, ...operation.formParams]) {
    if (!parameter.enum?.length || isMissing(params[parameter.name])) continue;
    const values = Array.isArray(params[parameter.name]) ? params[parameter.name] : [params[parameter.name]];
    for (const value of values) {
      if (!parameter.enum.includes(String(value))) {
        throw new TypeError(`invalid ${parameter.in || "request"} parameter ${parameter.name}: expected one of ${parameter.enum.join(", ")}`);
      }
    }
  }
}

function isMissing(value) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function authHeaders(security, apiKey, jwtToken) {
  const headers = {};
  if (security.includes("ApiKeyAuth") && apiKey) {
    headers["x-api-key"] = apiKey;
  }
  if (security.includes("JWTAuth") && jwtToken) {
    headers.Authorization = /^(Token|Bearer)\s+/i.test(jwtToken) ? jwtToken : `Token ${jwtToken}`;
  }
  return headers;
}

function userAgentHeader(userAgent) {
  if (!userAgent || typeof process === "undefined" || !process.versions?.node) {
    return {};
  }
  return { "user-agent": userAgent };
}

function mergeHeaders(...sources) {
  const headers = {};
  const names = new Map();
  for (const source of sources) {
    for (const [name, value] of Object.entries(source || {})) {
      if (value === undefined || value === null) continue;
      const lower = name.toLowerCase();
      const existing = names.get(lower);
      if (existing && existing !== name) delete headers[existing];
      headers[name] = String(value);
      names.set(lower, name);
    }
  }
  return headers;
}

function composeSignal(controller, signal) {
  if (!signal) return controller.signal;
  if (signal.aborted) controller.abort();
  signal.addEventListener("abort", () => controller.abort(), { once: true });
  return controller.signal;
}

function validateResponseType(responseType) {
  if (responseType === "auto" || responseType === "json" || responseType === "text" || responseType === "stream") {
    return responseType;
  }
  throw new TypeError("Invalid responseType: expected one of auto, json, text, stream");
}

async function parseResponse(response, responseType, headers, requestId) {
  if (responseType === "text") return response.text();
  const contentType = response.headers.get("content-type") || "";
  if (responseType === "json" || contentType.toLowerCase().includes("application/json")) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch (error) {
      throw new CrawloraError("Crawlora JSON parse error", {
        status: response.status,
        body: text,
        headers,
        response,
        cause: error,
        requestId
      });
    }
  }
  return response.text();
}

function shouldRetry(status) {
  return status === 0 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function retryDelay(baseDelay, attempt) {
  if (!baseDelay || baseDelay <= 0) return 0;
  const delay = baseDelay * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * Math.max(1, baseDelay / 2));
  return delay + jitter;
}

function parseRetryAfter(headers, cap = 30000) {
  const value = headerValue(headers, "retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, cap);
  }
  const date = Date.parse(value);
  if (Number.isFinite(date)) {
    const delay = date - Date.now();
    if (delay > 0) return Math.min(delay, cap);
  }
  return undefined;
}

function asHookList(value) {
  if (!value) return [];
  return typeof value === "function" ? [value] : Array.from(value);
}

// Optional client-side throttle: caps concurrency and spaces requests to a
// maximum rate (requests per second).
class RateLimiter {
  constructor(rps, concurrency) {
    this.interval = rps > 0 ? 1000 / rps : 0;
    this.limit = concurrency > 0 ? concurrency : Infinity;
    this.active = 0;
    this.waiters = [];
    this.nextAllowed = 0;
  }

  async run(fn, signal) {
    await this.#acquire();
    try {
      await this.#rateWait(signal);
      return await fn();
    } finally {
      const next = this.waiters.shift();
      if (next) {
        next(); // transfer the slot to the next waiter (active unchanged)
      } else {
        this.active--;
      }
    }
  }

  #acquire() {
    if (this.active < this.limit) {
      this.active++;
      return Promise.resolve();
    }
    // Wait for a slot to be transferred to us (active stays at the limit).
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async #rateWait(signal) {
    if (!this.interval) return;
    const now = Date.now();
    const wait = Math.max(0, this.nextAllowed - now);
    this.nextAllowed = Math.max(now, this.nextAllowed) + this.interval;
    if (wait > 0) await sleep(wait, signal);
  }
}

function envVar(name) {
  return (typeof process !== "undefined" && process.env && process.env[name]) || undefined;
}

function generateId() {
  return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureRequestId(headers) {
  const existing = headerValue(headers, "x-request-id");
  if (existing) return existing;
  const id = generateId();
  headers["x-request-id"] = id;
  return id;
}

function headerValue(headers, name) {
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === name.toLowerCase()) return value;
  }
  return "";
}

function responseHeaders(response) {
  return Object.fromEntries(response.headers.entries());
}

function normalizeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.trunc(number);
}

function normalizeNonNegativeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return number;
}

function sleep(ms, signal) {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CrawloraError("Crawlora request aborted", { cause: signal.reason, retryable: false }));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new CrawloraError("Crawlora request aborted", { cause: signal.reason, retryable: false }));
    }, { once: true });
  });
}
