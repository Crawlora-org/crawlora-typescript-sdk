# Crawlora JavaScript SDK

Git-installable beta SDK for the public Crawlora API. It works in Node.js 18+
and modern runtimes with `fetch`.

## Install

```sh
npm install git+https://github.com/Crawlora-org/crawlora-typescript-sdk.git#v1.2.0-sdk.4
```

## Usage

```js
import { CrawloraClient } from "crawlora";

const crawlora = new CrawloraClient({ apiKey: process.env.CRAWLORA_API_KEY });
const result = await crawlora.bing.search({ q: "coffee shops", count: 10 });
console.log(result);
```

Generated TypeScript declarations cover operation ids, endpoint groups,
parameter objects, enum values, request options, and response aliases.

## Configuration

```js
const crawlora = new CrawloraClient({
  apiKey: process.env.CRAWLORA_API_KEY,
  baseUrl: "https://api.crawlora.net/api/v1",
  retries: 2,
  retryDelay: 250,
  headers: { "x-client": "example" }
});
```

Per-request options support headers, timeout, abort signals, and response mode:

```js
const text = await crawlora.youtube.transcript(
  { id: "VIDEO_ID", format: "text" },
  { responseType: "text", timeout: 10000 }
);
```

Multipart upload endpoints accept values supported by `FormData`:

```js
const result = await crawlora.google.lens({ image: new Blob(["image-bytes"]) });
```

Failed API calls throw `CrawloraError` with `status`, optional API `code`,
parsed `body`, and the original `response` when available.

## Versioning

This SDK is currently released as Git beta tags. Pin an explicit tag in
applications and upgrade intentionally.

## Regeneration

The committed `openapi/public.json` is the SDK contract source. Regenerate after
updating that file:

```sh
npm run generate
npm test
npm run typecheck
```

## Optional Live Smoke Test

Default tests use mock `fetch` implementations. For live API checks, set
`CRAWLORA_API_KEY` in your own environment and call a low-cost endpoint
manually. Live calls are not part of default CI.
