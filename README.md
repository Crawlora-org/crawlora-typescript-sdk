# Crawlora JavaScript SDK

Git-only beta SDK for the public Crawlora API.

## Install

```sh
npm install git+https://github.com/Crawlora-org/crawlora-typescript-sdk.git#v1.2.0-sdk.3
```

## Usage

```js
import { CrawloraClient } from "crawlora";

const crawlora = new CrawloraClient({ apiKey: process.env.CRAWLORA_API_KEY });
const result = await crawlora.bing.search({ q: "coffee shops", count: 10 });
```

Generated TypeScript declarations cover operation ids, endpoint groups,
parameter objects, enum values, and response aliases.

## Configuration

```js
const crawlora = new CrawloraClient({
  apiKey: process.env.CRAWLORA_API_KEY,
  baseUrl: "https://api.crawlora.net/api/v1",
  retries: 2
});
```

Per-request options support headers, timeout, abort signals, and response mode:

```js
const text = await crawlora.youtube.transcript(
  { id: "VIDEO_ID", format: "text" },
  { responseType: "text", timeout: 10000 }
);
```

Failed API calls throw `CrawloraError` with `status`, optional API `code`,
parsed `body`, and the original `response` when available.
