import { CrawloraClient } from "../src/index.js";

const client = newClient();
if (client) {
  const seller = process.env.CRAWLORA_EBAY_SELLER || "garlandcomputer";
  let count = 0;
  for await (const item of client.paginateItems("ebay-seller-feedback", { seller }, { maxPages: 3 })) {
    count += 1;
  }
  console.log(`collected ${count} feedback items across up to 3 pages`);
}

function newClient() {
  if (!process.env.CRAWLORA_API_KEY) {
    console.error("set CRAWLORA_API_KEY to run this live example");
    return null;
  }
  return new CrawloraClient({
    apiKey: process.env.CRAWLORA_API_KEY,
    baseUrl: process.env.CRAWLORA_BASE_URL
  });
}
