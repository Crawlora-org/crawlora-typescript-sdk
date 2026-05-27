# Crawlora JavaScript SDK

Git-only beta SDK for the public Crawlora API.

## Install

```sh
npm install git+https://github.com/crawlora/crawlora-typescript-sdk.git#v1.2.0-sdk.1
```

## Usage

```js
import { CrawloraClient } from "crawlora";

const crawlora = new CrawloraClient({ apiKey: process.env.CRAWLORA_API_KEY });
const result = await crawlora.google.search({ q: "coffee shops", num: 10 });
```
