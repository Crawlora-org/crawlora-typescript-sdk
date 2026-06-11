import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CrawloraClient, CrawloraError, operationCount } from "../src/index.js";

test("sends API key auth and query parameters", async () => {
  const calls = [];
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ code: 200, msg: "OK", data: { ok: true } });
    }
  });

  const response = await client.bing.search({ q: "coffee", count: 3 });

  assert.equal(response.data.ok, true);
  assert.equal(calls[0].url, "https://example.test/api/v1/bing/search?q=coffee&count=3");
  assert.equal(calls[0].init.headers["x-api-key"], "api_test");
  assert.match(calls[0].init.headers["user-agent"], /^crawlora-js-sdk\//);
});

test("sends JWT auth for self-service endpoints", async () => {
  let headers;
  const client = new CrawloraClient({
    jwtToken: "jwt_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async (_url, init) => {
      headers = init.headers;
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await client.user.me();
  assert.equal(headers.Authorization, "Token jwt_test");
});

test("preserves existing JWT auth schemes case-insensitively", async () => {
  let headers;
  const client = new CrawloraClient({
    jwtToken: "bearer jwt_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async (_url, init) => {
      headers = init.headers;
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await client.user.me();
  assert.equal(headers.Authorization, "bearer jwt_test");
});

test("fails before fetch when required parameters are missing", async () => {
  let calls = 0;
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => {
      calls++;
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await assert.rejects(
    () => client.bing.search(),
    /Missing required query parameter: q/
  );
  await assert.rejects(
    () => client.google.search(),
    /Missing required body parameter: searchOption/
  );
  assert.equal(calls, 0);
});

test("fails before fetch when enum parameters are invalid", async () => {
  let calls = 0;
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => {
      calls++;
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await assert.rejects(
    () => client.operation("amazon-product", { asin: "B000000000", language: "fr_FR" }),
    /invalid query parameter language: expected one of en_US/
  );
  assert.equal(calls, 0);
});

test("normalizes negative retry options", () => {
  const client = new CrawloraClient({
    retries: -3,
    retryDelay: -10,
    fetch: async () => jsonResponse({ code: 200, msg: "OK", data: {} })
  });

  assert.equal(client.retries, 0);
  assert.equal(client.retryDelay, 0);
});

test("returns text responses", async () => {
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => new Response("hello", { status: 200, headers: { "content-type": "text/plain" } })
  });

  const response = await client.youtube.transcript({ id: "abc123", format: "text" });
  assert.equal(response, "hello");
});

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

test("sends custom headers and preserves false zero and arrays", async () => {
  const calls = [];
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await client.operation("datasets-google-map-businesses-search", {
    q: "coffee",
    page: 0,
    has_website: false
  }, { headers: { "x-test": "yes" } });
  assert.match(calls[0].url, /page=0/);
  assert.match(calls[0].url, /has_website=false/);
  assert.equal(calls[0].init.headers["x-test"], "yes");

  await client.operation("tripadvisor-search", {
    q: "hotel",
    geo_id: "293919",
    type: "hotel",
    amenities: [1, 2],
    online_options: ["3", "4"]
  });
  assert.match(calls[1].url, /amenities=1/);
  assert.match(calls[1].url, /amenities=2/);
  assert.match(calls[1].url, /online_options=3/);
  assert.match(calls[1].url, /online_options=4/);
});

test("request headers override default auth and content headers", async () => {
  let headers;
  const client = new CrawloraClient({
    apiKey: "api_default",
    baseUrl: "https://example.test/api/v1",
    fetch: async (_url, init) => {
      headers = init.headers;
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await client.google.search(
    { searchOption: { q: "coffee" } },
    { headers: { "X-API-KEY": "api_request", "Content-Type": "application/custom+json" } }
  );

  assert.equal(headers["X-API-KEY"], "api_request");
  assert.equal(headers["Content-Type"], "application/custom+json");
  assert.equal(Object.keys(headers).filter((key) => key.toLowerCase() === "x-api-key").length, 1);
  assert.equal(Object.keys(headers).filter((key) => key.toLowerCase() === "content-type").length, 1);
});

test("fails before fetch when response type is invalid", async () => {
  let calls = 0;
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => {
      calls++;
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await assert.rejects(
    () => client.bing.search({ q: "coffee" }, { responseType: "xml" }),
    /Invalid responseType: expected one of auto, json, text/
  );
  assert.equal(calls, 0);
});

test("serializes valid enum parameters", async () => {
  const calls = [];
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await client.operation("amazon-product", { asin: "B000000000", language: "en_US" });
  assert.match(calls[0].url, /language=en_US/);
});

test("serializes JSON body requests", async () => {
  let body;
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async (_url, init) => {
      body = init.body;
      return jsonResponse({ code: 200, msg: "OK", data: {} });
    }
  });

  await client.google.search({ searchOption: { q: "coffee" } });
  assert.equal(body, JSON.stringify({ q: "coffee" }));
});

test("wraps API errors with status code body and headers", async () => {
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => jsonResponse({ code: 429, msg: "rate limited" }, 429, { "retry-after": "1" })
  });

  await assert.rejects(
    () => client.bing.search({ q: "coffee" }),
    (error) => {
      assert.equal(error instanceof CrawloraError, true);
      assert.equal(error.status, 429);
      assert.equal(error.code, 429);
      assert.equal(error.message, "rate limited");
      assert.equal(error.body.msg, "rate limited");
      assert.equal(error.headers["retry-after"], "1");
      return true;
    }
  );
});

test("wraps invalid JSON responses", async () => {
  const parseCauseName = "SyntaxError";
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => new Response("{not-json", {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  });

  await assert.rejects(
    () => client.bing.search({ q: "coffee" }),
    (error) => {
      assert.equal(error instanceof CrawloraError, true);
      assert.equal(error.status, 200);
      assert.equal(error.message, "Crawlora JSON parse error");
      assert.equal(error.body, "{not-json");
      assert.equal(error.headers["content-type"], "application/json");
      assert.equal(error.cause.name, parseCauseName);
      return true;
    }
  );
});

test("retries retryable API failures", async () => {
  let calls = 0;
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    retries: 1,
    retryDelay: 0,
    fetch: async () => {
      calls++;
      if (calls === 1) return jsonResponse({ code: 503, msg: "try again" }, 503);
      return jsonResponse({ code: 200, msg: "OK", data: { ok: true } });
    }
  });

  const response = await client.bing.search({ q: "coffee" });
  assert.equal(response.data.ok, true);
  assert.equal(calls, 2);
});

test("retry delay honors positive Retry-After header", async () => {
  let calls = 0;
  const sleeps = [];
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, ms, ...args) => {
    sleeps.push(ms);
    callback(...args);
    return 0;
  };
  globalThis.clearTimeout = () => {};
  try {
    const client = new CrawloraClient({
      apiKey: "api_test",
      baseUrl: "https://example.test/api/v1",
      timeout: 0,
      retries: 1,
      retryDelay: 0,
      fetch: async () => {
        calls++;
        if (calls === 1) return jsonResponse({ code: 429, msg: "slow down" }, 429, { "retry-after": "0.001" });
        return jsonResponse({ code: 200, msg: "OK", data: { ok: true } });
      }
    });

    const response = await client.bing.search({ q: "coffee" });
    assert.equal(response.data.ok, true);
    assert.equal(calls, 2);
    assert.deepEqual(sleeps, [1]);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("external abort is not retried", async () => {
  const controller = new AbortController();
  let calls = 0;
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    retries: 2,
    fetch: async () => {
      calls++;
      controller.abort(new Error("stop"));
      throw new DOMException("The operation was aborted", "AbortError");
    }
  });

  await assert.rejects(
    () => client.bing.search({ q: "coffee" }, { signal: controller.signal }),
    (error) => {
      assert.equal(error instanceof CrawloraError, true);
      assert.equal(error.message, "Crawlora request aborted");
      assert.equal(error.retryable, false);
      return true;
    }
  );
  assert.equal(calls, 1);
});

test("wraps transport errors", async () => {
  const cause = new Error("socket closed");
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => {
      throw cause;
    }
  });

  await assert.rejects(
    () => client.bing.search({ q: "coffee" }),
    (error) => {
      assert.equal(error instanceof CrawloraError, true);
      assert.equal(error.status, 0);
      assert.equal(error.cause, cause);
      return true;
    }
  );
});

test("operation metadata count is stable", () => {
  assert.equal(operationCount, 499);
});

test("deprecated endpoints are not generated", () => {
  assert.equal(typeof new CrawloraClient({ fetch: async () => jsonResponse({}) }).google.lens, "undefined");
});

test("generated declarations include typed endpoint groups", () => {
  const types = readFileSync(new URL("../src/types.d.ts", import.meta.url), "utf8");
  assert.match(types, /export interface ModelBingSearchResponse/);
  assert.match(types, /"results"\?: Array<ModelBingSearchResult>;/);
  assert.match(types, /export interface ModelBingSearchResponseDoc/);
  assert.match(types, /"data"\?: ModelBingSearchResponse;/);
  assert.match(types, /export type BingSearchResponse = CrawloraResponse<ModelBingSearchResponseDoc>;/);
  assert.match(types, /export interface BingSearchParams/);
  assert.match(types, /"q": string;/);
  assert.match(types, /"count"\?: number;/);
  assert.match(types, /export interface GoogleSearchParams/);
  assert.match(types, /export type GoogleSearchBody = CrawloraBody<ModelGoogleSearchOption>;/);
  assert.match(types, /"searchOption": GoogleSearchBody;/);
  assert.match(types, /export interface CrawloraGeneratedGroups/);
  assert.match(types, /export interface OperationParamsMap/);
  assert.match(types, /"bing-search": BingSearchParams;/);
  assert.match(types, /export interface OperationResponseMap/);
  assert.match(types, /"bing-search": BingSearchResponse;/);
  assert.match(types, /export type OperationRequestArgs<I extends OperationId>/);
});

test("docs cover operations and recipes", () => {
  const operationsDoc = readFileSync(new URL("../docs/operations.md", import.meta.url), "utf8");
  const recipesDoc = readFileSync(new URL("../docs/recipes.md", import.meta.url), "utf8");

  assert.match(operationsDoc, /Total operations: `499`/);
  assert.match(operationsDoc, /`bing-search`/);
  assert.match(operationsDoc, /`GET \/bing\/search`/);
  assert.match(operationsDoc, /`bing\.search`/);
  assert.match(operationsDoc, /`BingSearchResponse`/);
  assert.match(operationsDoc, /`shopify-store`/);
  assert.match(operationsDoc, /`GET \/shopify\/store`/);
  assert.match(operationsDoc, /`shopify\.store`/);
  assert.doesNotMatch(operationsDoc, /google-lens/);

  assert.match(recipesDoc, /Typed Dynamic Operations/);
  assert.match(recipesDoc, /crawlora\.request\("bing-search"/);
  assert.match(recipesDoc, /responseType: "text"/);
  assert.match(recipesDoc, /Retry-After/);
  assert.match(recipesDoc, /error\.headers/);
});
