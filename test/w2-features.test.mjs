import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CrawloraClient,
  CrawloraError,
  CrawloraClientError,
  CrawloraServerError,
  CrawloraNetworkError,
  OperationIds
} from "../src/index.js";

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

test("OperationIds exposes typo-safe operation id aliases", () => {
  assert.equal(OperationIds.BingSearch, "bing-search");
  assert.equal(OperationIds.ShopifyStore, "shopify-store");
  assert.ok(Object.isFrozen(OperationIds));
});

test("4xx responses throw CrawloraClientError", async () => {
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => jsonResponse({ code: 404, msg: "not found" }, 404)
  });

  await assert.rejects(client.bing.search({ q: "coffee" }), (error) => {
    assert.ok(error instanceof CrawloraClientError);
    assert.ok(error instanceof CrawloraError);
    assert.equal(error.status, 404);
    return true;
  });
});

test("5xx responses throw CrawloraServerError", async () => {
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => jsonResponse({ code: 500, msg: "boom" }, 500)
  });

  await assert.rejects(client.bing.search({ q: "coffee" }), (error) => {
    assert.ok(error instanceof CrawloraServerError);
    assert.equal(error.status, 500);
    return true;
  });
});

test("transport failures throw CrawloraNetworkError", async () => {
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => {
      throw new Error("socket closed");
    }
  });

  await assert.rejects(client.bing.search({ q: "coffee" }), (error) => {
    assert.ok(error instanceof CrawloraNetworkError);
    return true;
  });
});

test("paginate advances the page parameter and stops on empty data", async () => {
  const seenPages = [];
  const client = new CrawloraClient({
    apiKey: "api_test",
    baseUrl: "https://example.test/api/v1",
    fetch: async (url) => {
      const page = Number(new URL(url).searchParams.get("page"));
      seenPages.push(page);
      const data = page < 3 ? [{ id: page }] : [];
      return jsonResponse({ code: 200, msg: "OK", data });
    }
  });

  const pages = [];
  for await (const page of client.paginate("ebay-seller-feedback", { seller: "acme" })) {
    pages.push(page);
  }

  assert.deepEqual(seenPages, [1, 2, 3]);
  assert.equal(pages.length, 3);
  assert.deepEqual(pages[2].data, []);
});

test("paginate rejects operations without a page parameter", async () => {
  const client = new CrawloraClient({ apiKey: "api_test", baseUrl: "https://example.test/api/v1", fetch: async () => jsonResponse({}) });
  await assert.rejects(client.paginate("user-me").next(), /no page or offset query parameter/);
});
