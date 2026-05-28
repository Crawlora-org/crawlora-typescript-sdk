# Crawlora JavaScript SDK Recipes

## Authentication

```js
const crawlora = new CrawloraClient({ apiKey: process.env.CRAWLORA_API_KEY });
```

Self-service account endpoints can use JWT auth:

```js
const crawlora = new CrawloraClient({ jwtToken: process.env.CRAWLORA_JWT_TOKEN });
```

## Typed Endpoints

```ts
const result = await crawlora.bing.search({ q: "coffee shops", count: 10 });
result.data?.results?.[0]?.title;
```

## Typed Dynamic Operations

```ts
const result = await crawlora.request("bing-search", { q: "coffee shops" });
result.data?.results?.[0]?.title;
```

Literal operation ids infer parameter and response types in TypeScript. Use the
grouped endpoint methods when you want the shortest call shape, and dynamic
operation calls when you store operation ids in app-level routing or jobs.

## Retries, Timeouts, Headers, And Abort Signals

```js
const controller = new AbortController();
const crawlora = new CrawloraClient({
  apiKey: process.env.CRAWLORA_API_KEY,
  retries: 2,
  retryDelay: 250,
  headers: { "x-client": "example" }
});

const result = await crawlora.bing.search(
  { q: "coffee shops" },
  { timeout: 10000, signal: controller.signal }
);
```

## Text Responses

```js
const text = await crawlora.youtube.transcript(
  { id: "VIDEO_ID", format: "text" },
  { responseType: "text" }
);
```

## Errors

```js
try {
  await crawlora.bing.search({ q: "coffee shops" });
} catch (error) {
  if (error instanceof CrawloraError) {
    console.log(error.status, error.code, error.body);
  }
}
```

## Optional Live Smoke Tests

```sh
CRAWLORA_API_KEY=... npm run example:bing-search
CRAWLORA_API_KEY=... CRAWLORA_YOUTUBE_VIDEO_ID=... npm run example:youtube-transcript
```
