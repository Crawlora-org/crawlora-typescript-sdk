import type { BingSearchResponse, WebEmailVerifyBody, WebEmailVerifyResponse } from "../src/types.js";
import { CrawloraClient } from "../src/index.js";

declare const client: CrawloraClient;

const searchResponse: BingSearchResponse = await client.bing.search({ q: "coffee" });
searchResponse.data?.results?.[0]?.title?.toUpperCase();

const emailVerifyBody: WebEmailVerifyBody = {
  emails: ["jane@example.com"]
};

const emailVerifyResponse: WebEmailVerifyResponse = await client.web.emailVerify({ option: emailVerifyBody });
emailVerifyResponse.data?.results?.[0]?.address;

const dynamicResponse = await client.request("bing-search", { q: "coffee" });
dynamicResponse.data?.results?.[0]?.title?.toUpperCase();

const dynamicOperationResponse = await client.operation("email-verify", { option: emailVerifyBody });
dynamicOperationResponse.data?.results?.[0]?.address;

// @ts-expect-error q is required for bing-search.
await client.request("bing-search", {});

// @ts-expect-error count must be numeric when supplied.
await client.request("bing-search", { q: "coffee", count: "10" });
