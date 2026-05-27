import { operations, groups } from "./operations.js";

const DEFAULT_BASE_URL = "https://api.crawlora.net/api/v1";

export class CrawloraError extends Error {
  constructor(message, { status, code, body, response }) {
    super(message);
    this.name = "CrawloraError";
    this.status = status;
    this.code = code;
    this.body = body;
    this.response = response;
  }
}

export class CrawloraClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || "";
    this.jwtToken = options.jwtToken || "";
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? 30000;
    this.retries = options.retries ?? 0;
    this.headers = { ...(options.headers || {}) };
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

    let attempt = 0;
    for (;;) {
      try {
        return await this.#send(operation, params, options);
      } catch (error) {
        if (!(error instanceof CrawloraError) || attempt >= this.retries || !shouldRetry(error.status)) {
          throw error;
        }
        attempt++;
      }
    }
  }

  async #send(operation, params, options) {
    const { url, body, bodyHeaders } = buildRequest(operation, this.baseUrl, params);
    const headers = {
      ...this.headers,
      ...authHeaders(operation.security, this.apiKey, this.jwtToken),
      ...bodyHeaders,
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);
    let response;
    try {
      response = await this.fetch(url, {
        method: operation.method,
        headers,
        body,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
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

async function parseResponse(response, responseType) {
  if (responseType === "text") return response.text();
  const contentType = response.headers.get("content-type") || "";
  if (responseType === "json" || contentType.includes("application/json")) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  return response.text();
}

function shouldRetry(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
