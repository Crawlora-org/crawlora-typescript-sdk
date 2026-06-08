# Changelog

## v1.7.0-sdk.1

- Added six new platforms, regenerated from the public API contract (now 491
  operations): **Polymarket**, **Kalshi**, and **Metaculus** (prediction
  markets); **IMDb**, **Rotten Tomatoes**, and **Box Office Mojo** (film/TV).
- Expanded **Reddit**: subreddit about/comments, multi-subreddit posts,
  domain posts, user posts/comments, and trends.

## v1.6.0-sdk.1

- Added the **Reddit** platform (`reddit.search`, `reddit.post`,
  `reddit.comments`, `reddit.subredditPosts`) and the **Brand** platform
  (`brand.retrieve`), plus Yahoo Finance `yahooFinance.lookup`. Regenerated from
  the public API contract.

## v1.5.0-sdk.1

- Added `beforeRequest`/`afterResponse` middleware hooks (mutate the outgoing
  request context, transform the parsed response).
- Added opt-in `idempotencyKeys` (stable `Idempotency-Key` on POST/PATCH, reused
  across retries) and per-request `retries`/`isRetryable` overrides.
- Added client-side `rateLimit` (requests/sec) and `maxConcurrency` throttling.
- Errors now carry `requestId`.

## v1.4.0-sdk.1

- Configurable retries: `maxRetryDelay`, `retryStatuses`, and an `isRetryable`
  predicate; added an `onRetry` hook, opt-in `requestId` (x-request-id, also on
  `error.requestId`), and a `logger` event sink.
- Pagination: cursor/token mode (`cursorParam` + `nextCursor`) and a
  `paginateItems` per-item async iterator; operation metadata now exposes
  `paginatable` and `cursorParams`.
- Streaming: `responseType: "stream"` returns the raw `Response` on success.
- Config: `CRAWLORA_API_KEY` / `CRAWLORA_BASE_URL` environment fallback.

## v1.3.0-sdk.1

- Added `CrawloraClientError`, `CrawloraServerError`, and `CrawloraNetworkError`
  subclasses of `CrawloraError` so callers can branch on 4xx vs 5xx vs transport
  failures.
- Added `client.paginate(operationId, params, options?)`, an async iterator that
  advances the page/offset query parameter and stops on an empty page.
- Added the generated `OperationIds` map for typo-safe dynamic operation ids,
  e.g. `client.request(OperationIds.BingSearch, { q: "coffee" })`.
- The generator now shares a single language-neutral core with the Go and Python
  SDKs; generated output is unchanged.

## v1.2.0-sdk.19

- Regenerated the public SDK contract with the promoted Shopify endpoint family.
- Added the generated `shopify` group with 11 active Shopify operations.
- Updated the generated operation reference to 330 public SDK operations.

## v1.2.0-sdk.18

- Regenerated the public SDK contract for the Shop.app endpoint family.
- Added the generated `shopApp` group with 16 active Shop.app operations.
- Kept not-yet-promoted Shopify routes out of the public SDK contract.

## v1.2.0-sdk.17

- Expanded npmjs package keywords for Crawlora SDK, scraping API, data
  extraction, search, marketplace, media, maps, and finance discovery.
- Kept the generated operation contract unchanged.

## v1.2.0-sdk.16

- Documented response headers on `CrawloraError`, case-insensitive header
  overrides, strict response modes, `Retry-After` retries, and abort semantics.
- Added docs coverage checks for the release-polish behavior.
- Kept the generated operation contract unchanged.

## v1.2.0-sdk.15

- Added case-insensitive request header overrides across auth, user-agent, and
  content headers.
- Added strict response mode validation, response headers on SDK errors, and
  `Retry-After` aware retry delays capped at 30 seconds.
- Clarified timeout and external abort errors without retrying user-aborted
  requests.

## v1.2.0-sdk.14

- Aligned the promoted SDK beta tag with the Python and Go SDKs.
- Added explicit coverage for request-level header overrides.

## v1.2.0-sdk.13

- Updated the published npmjs package homepage to `https://crawlora.net`.

## v1.2.0-sdk.12

- Added tag/manual CI/CD workflows for npmjs publishing and GitHub Packages
  mirroring.
- Added generated public operation reference docs and usage recipes.
- Included docs in the published package for easier offline reference.

## v1.2.0-sdk.11

- Added operation-id parameter and response maps so dynamic `request` and
  `operation` calls infer types from literal operation ids.
- Added type-usage coverage for typed dynamic calls and kept runtime call
  shapes unchanged.
- Published the SDK to npmjs while keeping the GitHub Packages mirror active.

## v1.2.0-sdk.10

- Generated OpenAPI schema model interfaces and aliases for endpoint responses
  and body parameters.
- Updated typed endpoint declarations to return concrete response aliases while
  keeping runtime call shapes unchanged.

## v1.2.0-sdk.9

- Added fail-fast enum validation for generated query and form parameters.
- Wrapped malformed JSON responses in `CrawloraError` with response status,
  raw response text, and parser cause details.

## v1.2.0-sdk.8

- Regenerated from the SDK spec that excludes deprecated endpoints.
- Removed the deprecated Google Lens example and generated SDK surface.

## v1.2.0-sdk.7

- Added fail-fast validation for required query, form, and body parameters.
- Normalized negative retry settings while preserving the public client API.

## v1.2.0-sdk.6

- Added runnable Bing search, YouTube transcript, and Google Lens upload
  examples.
- Added npm example scripts and an optional `smoke:live` command that skips
  cleanly when live credentials or inputs are absent.
- Published the beta SDK to GitHub Packages as `@crawlora-org/sdk`.

## v1.2.0-sdk.5

- Prepared the SDK for future npm publishing as `@crawlora-org/sdk`.
- Updated package identity, public import examples, and registry-readiness
  documentation.

## v1.2.0-sdk.4

- Added release-readiness files, CI, license, fuller README guidance, and npm
  package metadata.
- Kept endpoint behavior and generated operation contract unchanged.

## v1.2.0-sdk.3

- Added generated TypeScript endpoint declarations for operation ids, groups,
  params, enum values, and response aliases.

## v1.2.0-sdk.2

- Improved retries, request options, user agent handling, multipart support,
  response parsing, and SDK error details.

## v1.2.0-sdk.1

- Cleaned public SDK docs to avoid maintainer-only generation details.

## Initial SDK

- Added the first Git-installable Crawlora JavaScript SDK generated from the
  public API contract.
