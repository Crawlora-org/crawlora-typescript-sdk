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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
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

test("wraps API errors with status code and body", async () => {
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => jsonResponse({ code: 429, msg: "rate limited" }, 429)
  });

  await assert.rejects(
    () => client.bing.search({ q: "coffee" }),
    (error) => {
      assert.equal(error instanceof CrawloraError, true);
      assert.equal(error.status, 429);
      assert.equal(error.code, 429);
      assert.equal(error.message, "rate limited");
      assert.equal(error.body.msg, "rate limited");
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
  assert.equal(operationCount, 303);
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
});
