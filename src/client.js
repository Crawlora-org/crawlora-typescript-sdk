import { operations, groups } from "./operations.js";

const DEFAULT_BASE_URL = "https://api.crawlora.net/api/v1";
export const VERSION = "1.2.0-sdk.12";
const DEFAULT_USER_AGENT = `crawlora-js-sdk/${VERSION}`;

export class CrawloraError extends Error {
  constructor(message, { status = 0, code, body, response, cause } = {}) {
    super(message);
    this.name = "CrawloraError";
    this.status = status;
    this.code = code;
    this.body = body;
    this.response = response;
    this.cause = cause;
  }
}

export class CrawloraClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || "";
    this.jwtToken = options.jwtToken || "";
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? 30000;
    this.retries = normalizeNonNegativeInteger(options.retries ?? 0);
    this.retryDelay = normalizeNonNegativeNumber(options.retryDelay ?? 250);
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

    let attempt = 0;
    for (;;) {
      try {
        return await this.#send(operation, params, options);
      } catch (error) {
        if (!(error instanceof CrawloraError) || attempt >= this.retries || !shouldRetry(error.status)) {
          throw error;
        }
        attempt++;
        await sleep(retryDelay(this.retryDelay, attempt), options.signal);
      }
    }
  }

  async #send(operation, params, options) {
    const { url, body, bodyHeaders } = buildRequest(operation, this.baseUrl, params);
    const headers = {
      ...this.headers,
      ...authHeaders(operation.security, this.apiKey, this.jwtToken),
      ...userAgentHeader(this.userAgent),
      ...bodyHeaders,
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timeoutMs = options.timeout ?? this.timeout;
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    const signal = composeSignal(controller, options.signal);
    let response;
    try {
      response = await this.fetch(url, {
        method: operation.method,
        headers,
        body,
        signal
      });
    } catch (error) {
      throw new CrawloraError("Crawlora transport error", { cause: error });
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    const parsed = await parseResponse(response, options.responseType || "auto");
    if (!response.ok) {
      const code = parsed && typeof parsed === "object" ? parsed.code : undefined;
      const message = parsed && typeof parsed === "object" && parsed.msg ? parsed.msg : response.statusText;
      throw new CrawloraError(message || `Crawlora request failed with status ${response.status}`, {
        status: response.status,
        code,
        body: parsed,
        response
      });
    }
    return parsed;
  }
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

function composeSignal(controller, signal) {
  if (!signal) return controller.signal;
  if (signal.aborted) controller.abort();
  signal.addEventListener("abort", () => controller.abort(), { once: true });
  return controller.signal;
}

async function parseResponse(response, responseType) {
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
        response,
        cause: error
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
      reject(new CrawloraError("Crawlora request aborted", { cause: signal.reason }));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new CrawloraError("Crawlora request aborted", { cause: signal.reason }));
    }, { once: true });
  });
}
