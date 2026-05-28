# Crawlora JavaScript SDK Publishing Notes

This repo publishes `@crawlora-org/sdk` to npmjs and mirrors the same release
to GitHub Packages.

## Release Flow

1. Bump `package.json` and `src/client.js` to the same SDK version.
2. Update README pinned install examples and add a `CHANGELOG.md` entry.
3. Run the local checks:

   ```sh
   npm test
   npm run typecheck
   npm run pack:check
   ```

4. Verify the version is not already on npmjs:

   ```sh
   npm pack @crawlora-org/sdk@VERSION --dry-run --json --registry=https://registry.npmjs.org/
   ```

   A missing version returns `ETARGET`. An existing version returns tarball
   metadata.

5. Commit the release, tag it as `vVERSION`, move the `latest` tag, and push
   `main` plus both tags.
6. The tag push should trigger:

   - `CI`
   - `Publish npmjs`
   - `Publish GitHub Packages`

7. Confirm npmjs after publish:

   ```sh
   npm view @crawlora-org/sdk@latest version homepage --registry=https://registry.npmjs.org/
   npm install @crawlora-org/sdk@latest --registry=https://registry.npmjs.org/
   ```

## Registry Lessons

- npmjs package metadata such as `homepage` comes from the latest published
  package manifest. Changing it requires publishing a new version.
- `npm view` can briefly return `E404` right after a successful publish even
  when the tarball is installable. `npm pack package@version --dry-run` was the
  more reliable existence check.
- Keep `publishConfig.registry` set to `https://registry.npmjs.org` in
  `package.json`. The GitHub Packages workflow temporarily overrides the
  registry before publishing its mirror.
- The npmjs workflow needs the repository secret `NPM_TOKEN`. The token should
  never be committed or written to `.npmrc` in this repo.
- Local GitHub Packages readback may fail with `403` if the local token lacks
  package scopes. Treat the GitHub Actions publish job's install verification as
  the source of truth for the mirror.

## CI/CD Practices

- Release workflows run on `v*` tags and manual dispatch, not on every `main`
  push.
- Release workflows validate that the tag name matches the package version
  (`v${package.json.version}`) before publishing.
- Publish jobs are idempotent: they check whether the exact package version
  exists before attempting `npm publish`.
- CI regenerates SDK output and runs `git diff --exit-code`; generated docs must
  be committed when generator behavior changes.
- Keep npmjs and GitHub Packages verification steps in the workflows. A release
  is not complete until install verification passes from the target registry.

## Operational Notes

- On this machine, SSH may authenticate to GitHub as an account without write
  access to `Crawlora-org`. Use an HTTPS push with a temporary askpass helper if
  needed, and do not store tokens in repo config.
- If `gh` is unavailable, GitHub Actions secrets can be updated through the
  GitHub REST API by encrypting the secret with the repository Actions public
  key.
- Keep public README copy focused on user-facing install and API-key setup.
  Put maintainer-only release details in this file.
