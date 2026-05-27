import { CrawloraClient } from "../src/index.js";

const client = newClient();
if (client) {
  const videoId = process.argv[2] || process.env.CRAWLORA_YOUTUBE_VIDEO_ID;
  if (!videoId) {
    console.error("set CRAWLORA_YOUTUBE_VIDEO_ID or pass a video id to run this live example");
  } else {
    const text = await client.youtube.transcript(
      { id: videoId, format: "text" },
      { responseType: "text" }
    );
    console.log(text);
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
