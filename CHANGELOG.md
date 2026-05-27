# Changelog

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
