# Changelog

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
