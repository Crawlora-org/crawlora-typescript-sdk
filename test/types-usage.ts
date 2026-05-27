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
