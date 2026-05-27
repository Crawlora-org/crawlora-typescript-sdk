# Crawlora JavaScript SDK

Git-installable beta SDK for the public Crawlora API. It works in Node.js 18+
and modern runtimes with `fetch`.

## Install

```sh
npm install git+https://github.com/Crawlora-org/crawlora-typescript-sdk.git#v1.2.0-sdk.6
```

## Usage

```js
import { CrawloraClient } from "@crawlora-org/sdk";

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

## Examples

Runnable examples live under `examples/`:

```sh
CRAWLORA_API_KEY=... npm run example:bing-search
CRAWLORA_API_KEY=... CRAWLORA_YOUTUBE_VIDEO_ID=... npm run example:youtube-transcript
CRAWLORA_API_KEY=... CRAWLORA_LENS_IMAGE=./image.jpg npm run example:google-lens
```

Each example also accepts `CRAWLORA_BASE_URL` for staging or local API testing.
The examples exit without making a request when the required live environment
variables are not set. `npm run smoke:live` runs all live examples in sequence.

## Versioning

This SDK is currently released as Git beta tags. Pin an explicit tag in
applications and upgrade intentionally.

## Registry Readiness

The future npm package target is `@crawlora-org/sdk`:

```js
import { CrawloraClient } from "@crawlora-org/sdk";
```

The package names `crawlora` and `@crawlora/sdk` are not used by this repository
because they already exist on npm and point to a different package source.

## Regeneration

The committed `openapi/public.json` is the SDK contract source. Regenerate after
updating that file:

```sh
npm run generate
npm test
npm run typecheck
```

## Optional Live Smoke Test

Default tests use mock `fetch` implementations. The programs under `examples/`
can be used as optional live smoke tests when `CRAWLORA_API_KEY` is available.
Live calls are not part of default CI.
