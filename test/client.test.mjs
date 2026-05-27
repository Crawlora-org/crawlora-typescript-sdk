import assert from "node:assert/strict";
import { test } from "node:test";
import { CrawloraClient } from "../src/index.js";

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
