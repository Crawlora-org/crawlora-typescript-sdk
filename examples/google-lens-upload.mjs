import { readFile } from "node:fs/promises";
import { CrawloraClient } from "../src/index.js";

const client = newClient();
if (client) {
  const imagePath = process.argv[2] || process.env.CRAWLORA_LENS_IMAGE;
  if (!imagePath) {
    console.error("set CRAWLORA_LENS_IMAGE or pass an image path to run this live example");
  } else {
    const image = new Blob([await readFile(imagePath)]);
    const result = await client.google.lens({ image });
    console.log(JSON.stringify(result, null, 2));
  }
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
