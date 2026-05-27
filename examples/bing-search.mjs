import { CrawloraClient } from "../src/index.js";

const client = newClient();
if (client) {
  const result = await client.bing.search({ q: "coffee shops", count: 5 });
  console.log(JSON.stringify(result, null, 2));
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
