import assert from "node:assert/strict";
import { test } from "node:test";
import { CrawloraClient, CrawloraServerError } from "../src/index.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("beforeRequest injects a header", async () => {
  let sent;
  const client = new CrawloraClient({
    apiKey: "k", baseUrl: "https://x/api/v1",
    beforeRequest: (ctx) => { ctx.headers["x-sig"] = "sig-" + ctx.operationId; },
    fetch: async (_url, init) => { sent = init.headers["x-sig"]; return jsonResponse({ code: 200, data: {} }); }
  });
  await client.bing.search({ q: "c" });
  assert.equal(sent, "sig-bing-search");
});

test("afterResponse transforms the body", async () => {
  const client = new CrawloraClient({
    apiKey: "k", baseUrl: "https://x/api/v1",
    afterResponse: (op, status, headers, body) => ({ ...body, _op: op }),
    fetch: async () => jsonResponse({ code: 200, data: {} })
  });
  const result = await client.bing.search({ q: "c" });
  assert.equal(result._op, "bing-search");
});

test("idempotency key is stable across retries on POST", async () => {
  const keys = [];
  let calls = 0;
  const client = new CrawloraClient({
    apiKey: "k", baseUrl: "https://x/api/v1", retries: 1, retryDelay: 0, idempotencyKeys: true,
    fetch: async (_url, init) => {
      keys.push(init.headers["Idempotency-Key"]);
      calls++;
      return calls === 1 ? jsonResponse({ code: 503 }, 503) : jsonResponse({ code: 200, data: {} });
    }
  });
  await client.google.search({ searchOption: { q: "c" } }); // POST
  assert.equal(keys.length, 2);
  assert.ok(keys[0]);
  assert.equal(keys[0], keys[1]);
});

test("no idempotency key on GET", async () => {
  let header;
  const client = new CrawloraClient({
    apiKey: "k", baseUrl: "https://x/api/v1", idempotencyKeys: true,
    fetch: async (_url, init) => { header = init.headers["Idempotency-Key"]; return jsonResponse({ code: 200, data: {} }); }
  });
  await client.bing.search({ q: "c" });
  assert.equal(header, undefined);
});

test("per-request retries override the client default", async () => {
  let calls = 0;
  const client = new CrawloraClient({
    apiKey: "k", baseUrl: "https://x/api/v1", retries: 5, retryDelay: 0,
    fetch: async () => { calls++; return jsonResponse({ code: 503 }, 503); }
  });
  await assert.rejects(client.request("bing-search", { q: "c" }, { retries: 0 }), (e) => e instanceof CrawloraServerError);
  assert.equal(calls, 1);
});

test("maxConcurrency caps in-flight requests", async () => {
  let active = 0;
  let max = 0;
  const client = new CrawloraClient({
    apiKey: "k", baseUrl: "https://x/api/v1", maxConcurrency: 2,
    fetch: async () => {
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 15));
      active--;
      return jsonResponse({ code: 200, data: {} });
    }
  });
  await Promise.all(Array.from({ length: 6 }, () => client.bing.search({ q: "c" })));
  assert.ok(max <= 2, `max concurrent ${max}`);
});
