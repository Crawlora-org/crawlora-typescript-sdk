import type { BingSearchResponse, GoogleSearchBody } from "../src/types.js";
import { CrawloraClient } from "../src/index.js";

declare const client: CrawloraClient;

const searchResponse: BingSearchResponse = await client.bing.search({ q: "coffee" });
searchResponse.data?.results?.[0]?.title?.toUpperCase();

const searchBody: GoogleSearchBody = {
  country: "us",
  keyword: "coffee",
  language: "en"
};

await client.google.search({ searchOption: searchBody });

const dynamicResponse = await client.request("bing-search", { q: "coffee" });
dynamicResponse.data?.results?.[0]?.title?.toUpperCase();

const dynamicOperationResponse = await client.operation("google-search", { searchOption: searchBody });
dynamicOperationResponse.data?.result?.[0]?.title?.toUpperCase();

// @ts-expect-error q is required for bing-search.
await client.request("bing-search", {});

// @ts-expect-error count must be numeric when supplied.
await client.request("bing-search", { q: "coffee", count: "10" });
