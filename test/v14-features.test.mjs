import assert from "node:assert/strict";
import { test } from "node:test";
import { CrawloraClient, CrawloraError, CrawloraServerError } from "../src/index.js";

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

test("retry predicate and onRetry hook", async () => {
  let calls = 0;
  const retries = [];
  const client = new CrawloraClient({
    apiKey: "k",
    baseUrl: "https://x/api/v1",
    retries: 1,
    retryDelay: 0,
    isRetryable: (status) => status === 500,
    onRetry: (attempt, error, delay) => retries.push({ attempt, status: error.status }),
    fetch: async () => {
      calls++;
      return calls === 1 ? jsonResponse({ code: 500, msg: "x" }, 500) : jsonResponse({ code: 200, data: { ok: true } });
    }
  });
  const r = await client.bing.search({ q: "c" });
  assert.equal(r.data.ok, true);
  assert.equal(calls, 2);
  assert.deepEqual(retries, [{ attempt: 1, status: 500 }]);
});

test("auto request id is sent and attached to errors", async () => {
  let sent;
  const client = new CrawloraClient({
    apiKey: "k",
    baseUrl: "https://x/api/v1",
    requestId: true,
    fetch: async (_url, init) => {
      sent = init.headers["x-request-id"];
      return jsonResponse({ code: 500, msg: "x" }, 500);
    }
  });
  await assert.rejects(client.bing.search({ q: "c" }), (error) => {
    assert.ok(error instanceof CrawloraServerError);
    assert.ok(sent);
    assert.equal(error.requestId, sent);
    return true;
  });
});

test("cursor pagination advances and stops on falsy cursor", async () => {
  const seen = [];
  const client = new CrawloraClient({
    apiKey: "k",
    baseUrl: "https://x/api/v1",
    fetch: async (url) => {
      const cur = new URL(url).searchParams.get("cursor") || "";
      seen.push(cur);
      const next = { "": "a", a: "b", b: "" }[cur];
      return jsonResponse({ code: 200, data: [cur], next });
    }
  });
  const pages = [];
  for await (const page of client.paginate("producthunt-leaderboard", {}, { cursorParam: "cursor", nextCursor: (p) => p.next })) {
    pages.push(page);
  }
  assert.equal(pages.length, 3);
  assert.deepEqual(seen, ["", "a", "b"]);
});

test("cursorParam must be a query parameter", async () => {
  const client = new CrawloraClient({ apiKey: "k", baseUrl: "https://x/api/v1", fetch: async () => jsonResponse({}) });
  await assert.rejects(
    client.paginate("producthunt-leaderboard", {}, { cursorParam: "bogus", nextCursor: () => null }).next(),
    /not a query parameter/
  );
});

test("paginateItems yields items across pages", async () => {
  const client = new CrawloraClient({
    apiKey: "k",
    baseUrl: "https://x/api/v1",
    fetch: async (url) => {
      const page = Number(new URL(url).searchParams.get("page"));
      return jsonResponse({ code: 200, data: page < 3 ? [{ n: page }] : [] });
    }
  });
  const items = [];
  for await (const item of client.paginateItems("ebay-seller-feedback", { seller: "a" })) items.push(item);
  assert.deepEqual(items, [{ n: 1 }, { n: 2 }]);
});

test("streaming response returns the raw Response", async () => {
  const client = new CrawloraClient({
    apiKey: "k",
    baseUrl: "https://x/api/v1",
    fetch: async () => new Response("streamed", { status: 200, headers: { "content-type": "application/octet-stream" } })
  });
  const res = await client.request("bing-search", { q: "c" }, { responseType: "stream" });
  assert.ok(res instanceof Response);
  assert.equal(await res.text(), "streamed");
});

test("env vars provide config fallback", async () => {
  process.env.CRAWLORA_API_KEY = "env_key";
  process.env.CRAWLORA_BASE_URL = "https://env/api/v1";
  try {
    let header;
    const client = new CrawloraClient({ fetch: async (_url, init) => { header = init.headers["x-api-key"]; return jsonResponse({ code: 200, data: {} }); } });
    assert.equal(client.baseUrl, "https://env/api/v1");
    await client.bing.search({ q: "c" });
    assert.equal(header, "env_key");
  } finally {
    delete process.env.CRAWLORA_API_KEY;
    delete process.env.CRAWLORA_BASE_URL;
  }
});
