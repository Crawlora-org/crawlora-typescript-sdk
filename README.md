# Crawlora JavaScript SDK

Official JavaScript and TypeScript client for the public Crawlora API. Use it
to call Crawlora scraping, search, social, developer, marketplace, media, maps, finance,
travel, prediction-market, brand, books, gaming, and usage endpoints with a small `fetch`-based client and generated
TypeScript types.

- Runtime: Node.js 18+ or any modern runtime with `fetch`
- Auth: `x-api-key`
- Default API base URL: `https://api.crawlora.net/api/v1`
- Reference: [operations](docs/operations.md) and [recipes](docs/recipes.md)

## Install

Install the latest published npm package:

```sh
npm install @crawlora-org/sdk
```

For reproducible builds, pin a published package version:

```sh
npm install @crawlora-org/sdk@VERSION
```

## API Key

Create or sign in to your Crawlora account at [crawlora.net](https://crawlora.net),
then create an API key in the dashboard.

```sh
read -r CRAWLORA_API_KEY
export CRAWLORA_API_KEY
```

## First Request

```js
import { CrawloraClient } from "@crawlora-org/sdk";

const crawlora = new CrawloraClient({
  apiKey: process.env.CRAWLORA_API_KEY
});

const response = await crawlora.bing.search({
  q: "coffee shops",
  count: 10
});

console.log(response.data?.results?.[0]);
```

Endpoint groups are generated from the public API contract, so common calls are
available as methods such as `crawlora.bing.search(...)`,
`crawlora.youtube.transcript(...)`, and `crawlora.google.mapSearch(...)`.

## Typed Dynamic Calls

You can also call by operation id. Literal operation ids infer parameter and
response types in TypeScript:

```ts
const response = await crawlora.request("bing-search", {
  q: "coffee shops",
  count: 10
});

response.data?.results?.[0]?.title;
```

Generated declarations include operation ids, endpoint groups, request
parameters, enum values, response aliases, and request options.

## Configuration

```js
const crawlora = new CrawloraClient({
  apiKey: process.env.CRAWLORA_API_KEY,
  baseUrl: "https://api.crawlora.net/api/v1",
  timeout: 30_000,
  retries: 2,
  retryDelay: 250,
  headers: {
    "x-client": "my-app"
  }
});
```

Per-request options can override headers, timeout, abort signal, and response
mode. Header names are matched case-insensitively, so request headers can
override default auth, user-agent, and content headers without duplicating
variants such as `x-api-key` and `X-API-KEY`:

```js
const controller = new AbortController();

const response = await crawlora.bing.search(
  { q: "coffee shops" },
  {
    timeout: 10_000,
    signal: controller.signal,
    headers: { "x-request-id": "search-001" }
  }
);
```

## Text Responses

Most endpoints return JSON. `responseType` must be `auto`, `json`, or `text`.
Endpoints that support alternate text output, such as YouTube transcripts, can
opt into text mode:

```js
const transcript = await crawlora.youtube.transcript(
  { id: "VIDEO_ID", format: "text" },
  { responseType: "text" }
);

console.log(transcript);
```

## Errors

Failed API calls throw `CrawloraError`:

```js
import { CrawloraClient, CrawloraError } from "@crawlora-org/sdk";

try {
  await crawlora.bing.search({ q: "coffee shops" });
} catch (error) {
  if (error instanceof CrawloraError) {
    console.error(error.status, error.code, error.body);
  }
  throw error;
}
```

The error includes `status`, optional API `code`, parsed `body`, response
`headers`, the original `response` when available, and a parser or transport
`cause` when relevant. Retryable responses honor positive `Retry-After`
headers, capped at 30 seconds. Externally aborted requests fail with
`Crawlora request aborted` and are not retried.

`CrawloraError` has three subclasses so you can branch on the failure kind:
`CrawloraClientError` (4xx, request rejected), `CrawloraServerError` (5xx), and
`CrawloraNetworkError` (transport failure, timeout, or abort before a response).

## Pagination

`client.paginate` is an async iterator that advances the page/offset query
parameter and stops when a page returns no data:

```js
for await (const page of crawlora.paginate("ebay-seller-feedback", { seller: "acme" })) {
  for (const review of page.data) console.log(review);
}
```

Override detection with `{ pageParam, start, step, maxPages }`.

## Examples

Runnable examples live under `examples/` and skip cleanly when required
environment variables are missing:

```sh
npm run example:bing-search
npm run example:youtube-transcript
```

Set `CRAWLORA_BASE_URL` to point examples at a staging or local API.

## Package Notes

The npm package name is `@crawlora-org/sdk`:

```js
import { CrawloraClient } from "@crawlora-org/sdk";
```

The package names `crawlora` and `@crawlora/sdk` are not used by this
repository because they already exist on npm and point to different package
sources.

This SDK is published to npmjs and may also be mirrored to GitHub Packages. Pin
an explicit published version for production applications and upgrade
intentionally.
