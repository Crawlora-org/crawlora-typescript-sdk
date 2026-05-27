# Crawlora JavaScript SDK

GitHub Packages beta SDK for the public Crawlora API. It works in Node.js 18+
and modern runtimes with `fetch`.

## Install

```sh
npm config set @crawlora-org:registry https://npm.pkg.github.com
npm install @crawlora-org/sdk@latest
```

GitHub Packages npm installs require GitHub npm registry authentication. For
project-local installs, add the scoped registry to `.npmrc` and authenticate
with a GitHub token that can read packages.

For reproducible builds, pin the current beta package version:

```sh
npm install @crawlora-org/sdk@1.2.0-sdk.8
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

Failed API calls throw `CrawloraError` with `status`, optional API `code`,
parsed `body`, and the original `response` when available.

## Examples

Runnable examples live under `examples/`:

```sh
CRAWLORA_API_KEY=... npm run example:bing-search
CRAWLORA_API_KEY=... CRAWLORA_YOUTUBE_VIDEO_ID=... npm run example:youtube-transcript
```

Each example also accepts `CRAWLORA_BASE_URL` for staging or local API testing.
The examples exit without making a request when the required live environment
variables are not set. `npm run smoke:live` runs all live examples in sequence.

## Versioning

This SDK is currently released as GitHub Packages beta versions. The package
`latest` dist-tag and the moving Git tag named `latest` track the current
promoted beta. Explicit package versions and Git beta tags such as
`1.2.0-sdk.8` / `v1.2.0-sdk.8` remain available for reproducible builds. Pin an
explicit version in production applications and upgrade intentionally.

## Package Name

The npm package name is `@crawlora-org/sdk`:

```js
import { CrawloraClient } from "@crawlora-org/sdk";
```

The package names `crawlora` and `@crawlora/sdk` are not used by this repository
because they already exist on npm and point to a different package source.

## Optional Live Smoke Test

Default tests use mock `fetch` implementations. The programs under `examples/`
can be used as optional live smoke tests when `CRAWLORA_API_KEY` is available.
Live calls are not part of default CI.
