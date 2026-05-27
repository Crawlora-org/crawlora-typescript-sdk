import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const examples = [
  "examples/bing-search.mjs",
  "examples/google-lens-upload.mjs",
  "examples/youtube-transcript.mjs"
];

test("examples skip cleanly without live credentials", () => {
  for (const example of examples) {
    const result = spawnSync(process.execPath, [example], {
      cwd: new URL("..", import.meta.url),
      env: scrubLiveEnv(process.env),
      encoding: "utf8"
    });

    assert.equal(result.status, 0, `${example} should exit successfully`);
    assert.match(result.stderr, /CRAWLORA_/, `${example} should print the missing live input`);
  }
});

function scrubLiveEnv(env) {
  const next = { ...env };
  delete next.CRAWLORA_API_KEY;
  delete next.CRAWLORA_BASE_URL;
  delete next.CRAWLORA_LENS_IMAGE;
  delete next.CRAWLORA_YOUTUBE_VIDEO_ID;
  return next;
}
