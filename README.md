# Crawlora JavaScript SDK

JavaScript and TypeScript SDK for the public Crawlora API. It works in Node.js
18+ and modern runtimes with `fetch`.

Website: [crawlora.net](https://crawlora.net)

## Get an API Key

Create or sign in to your Crawlora account at [crawlora.net](https://crawlora.net),
then open the dashboard and create an API key. Set it as `CRAWLORA_API_KEY` in
your environment before running the examples or using the SDK.

## Install

```sh
npm install @crawlora-org/sdk@latest
```

For reproducible builds, pin the current package version:

```sh
npm install @crawlora-org/sdk@1.2.0-sdk.12
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
Dynamic calls infer parameter and response types from literal operation ids:

```ts
const result = await crawlora.request("bing-search", { q: "coffee shops" });
result.data?.results?.[0]?.title;
```

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

## Reference

- [Operation reference](docs/operations.md)
- [Usage recipes](docs/recipes.md)

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

This SDK is published to npmjs and mirrored to GitHub Packages. The package
`latest` dist-tag and the moving Git tag named `latest` track the current
promoted beta. Explicit package versions and Git beta tags such as
`1.2.0-sdk.12` / `v1.2.0-sdk.12` remain available for reproducible builds. Pin
an explicit version in production applications and upgrade intentionally.

GitHub Packages installs require a project `.npmrc` that maps the
`@crawlora-org` scope to `https://npm.pkg.github.com` and a GitHub token that
can read packages.

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
