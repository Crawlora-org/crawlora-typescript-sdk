# Crawlora JavaScript SDK Recipes

## Authentication

```js
const crawlora = new CrawloraClient({ apiKey: process.env.CRAWLORA_API_KEY });
```

Self-service account endpoints can use JWT auth:

```js
const crawlora = new CrawloraClient({ jwtToken: process.env.CRAWLORA_JWT_TOKEN });
```

## Typed Endpoints

```ts
const result = await crawlora.bing.search({ q: "coffee shops", count: 10 });
result.data?.results?.[0]?.title;
```

## Typed Dynamic Operations

```ts
const result = await crawlora.request("bing-search", { q: "coffee shops" });
result.data?.results?.[0]?.title;
```

Literal operation ids infer parameter and response types in TypeScript. Use the
grouped endpoint methods when you want the shortest call shape, and dynamic
operation calls when you store operation ids in app-level routing or jobs.

## Reddit And Brand

Newer platforms are grouped like every other endpoint:

```ts
const posts = await crawlora.reddit.search({ q: "typescript", subreddit: "programming" });
const brand = await crawlora.brand.retrieve({ domain: "stripe.com" });
```

## Airbnb Host Profiles

Look up a public Airbnb host, then page through their listings and guest reviews.

```ts
const host = await crawlora.airbnb.host({ id: "65056940" });
const listings = await crawlora.airbnb.hostListings({ id: "65056940", page: 1 });
const reviews = await crawlora.airbnb.hostReviews({ id: "65056940", page: 1 });
```



## Airbnb Markets Dataset

Aggregate Airbnb short-term-rental market data — listing supply, ratings and nightly-price bands rolled up by country, metro and geo cell. Aggregate-only.

```ts
const markets = await crawlora.datasets.airbnbMarketsSearch({ group_by: "country", sort: "listings_desc" });
const fr = await crawlora.datasets.airbnbMarketsItem({ country: "FR" });
const density = await crawlora.datasets.airbnbMarketsNearby({ lat: 48.86, lon: 2.35, radius_m: 5000 });
```

## Airbnb Markets Dataset

Aggregate Airbnb short-term-rental market data — listing supply, ratings and nightly-price bands rolled up by country, metro and geo cell. Aggregate-only.

```ts
const markets = await client.datasets.airbnbMarketsSearch({ group_by: "country", sort: "listings_desc" });
const fr = await client.datasets.airbnbMarketsItem({ country: "FR" });
const density = await client.datasets.airbnbMarketsNearby({ lat: 48.86, lon: 2.35, radius_m: 5000 });
```

## TrustMRR Verified Startup Revenues

Browse verified startup revenues and the acquisition marketplace on TrustMRR: the marketplace snapshot, the revenue leaderboard, startup detail, and categories.

```ts
const deals = await client.trustMrr.trustmrrMarketplace();
const board = await client.trustMrr.trustmrrLeaderboard({ metric: "mrr" });
const startup = await client.trustMrr.trustmrrStartup({ slug: "stan" });
const cats = await client.trustMrr.trustmrrCategories();
const saas = await client.trustMrr.trustmrrCategory({ slug: "saas" });
```

## Film, TV, Music, And Books

Query four credential-free media catalogs — Discogs (music releases, artists and
labels), Letterboxd (films, ratings and members), TMDB (movies, TV and people),
and Goodreads (books, authors and lists):

```ts
// Discogs — the music database
const release = await client.discogs.release({ id: "249504" });
const artist = await client.discogs.artist({ id: "1289" });
const discogsHits = await client.discogs.search({ q: "daft punk", type: "artist" });

// Letterboxd — films, ratings and members
const film = await client.letterboxd.film({ slug: "parasite-2019" });
const histogram = await client.letterboxd.filmRatingHistogram({ slug: "parasite-2019" });
const popular = await client.letterboxd.popular({ period: "week" });

// TMDB — The Movie Database
const movie = await client.tmdb.movie({ id: "27205" });
const topRated = await client.tmdb.movieList({ category: "top_rated" });
const tmdbHits = await client.tmdb.search({ query: "inception", type: "movie" });

// Goodreads — books, authors and lists
const book = await client.goodreads.book({ id: "2767052" });
const reviews = await client.goodreads.bookReviews({ id: "2767052" });
const authorBooks = await client.goodreads.authorBooks({ id: "153394" });
```

## Retries, Timeouts, Headers, And Abort Signals

```js
const controller = new AbortController();
const crawlora = new CrawloraClient({
  apiKey: process.env.CRAWLORA_API_KEY,
  retries: 2,
  retryDelay: 250,
  headers: { "x-client": "example" }
});

const result = await crawlora.bing.search(
  { q: "coffee shops" },
  { timeout: 10000, signal: controller.signal }
);
```

Request headers override default auth, user-agent, and content headers
case-insensitively. Retryable API responses honor positive `Retry-After`
headers, capped at 30 seconds. Externally aborted requests are not retried.

## Text Responses

`responseType` must be `auto`, `json`, or `text`.

```js
const text = await crawlora.youtube.transcript(
  { id: "VIDEO_ID", format: "text" },
  { responseType: "text" }
);
```

## Errors

```js
try {
  await crawlora.bing.search({ q: "coffee shops" });
} catch (error) {
  if (error instanceof CrawloraError) {
    console.log(error.status, error.code, error.body, error.headers);
  }
}
```

## Custom Retries And Observability

```js
const crawlora = new CrawloraClient({
  retries: 3,
  maxRetryDelay: 10000,
  retryStatuses: [429, 503],                       // or:
  isRetryable: (status, error) => status >= 500,
  onRetry: (attempt, error, delay) => console.warn(`retry ${attempt} after ${delay}ms`, error.status),
  requestId: true,                                  // sets x-request-id; available as error.requestId
  logger: (event) => console.debug(event)
});
```

Branch on `CrawloraClientError` (4xx), `CrawloraServerError` (5xx), and
`CrawloraNetworkError` (transport).

## Pagination

```js
// page/offset (auto-detected)
for await (const page of crawlora.paginate("ebay-seller-feedback", { seller: "acme" })) { /* ... */ }

// per-item iteration
for await (const item of crawlora.paginateItems("ebay-seller-feedback", { seller: "acme" })) { /* ... */ }

// cursor/token pagination
for await (const page of crawlora.paginate("producthunt-leaderboard", {}, {
  cursorParam: "cursor",
  nextCursor: (p) => p.next_cursor
})) { /* ... */ }
```

## Streaming Responses

```js
const res = await crawlora.request("bing-search", { q: "coffee" }, { responseType: "stream" });
for await (const chunk of res.body) { /* ... */ }
```

## Environment Variables

`CRAWLORA_API_KEY` and `CRAWLORA_BASE_URL` are used when not set explicitly
(precedence: option > env > default).

## Middleware

```js
const crawlora = new CrawloraClient({
  beforeRequest: (ctx) => { ctx.headers["x-signature"] = sign(ctx); },
  afterResponse: (operationId, status, headers, body) => body // return a value to transform
});
```

## Idempotency And Per-Request Retries

```js
const crawlora = new CrawloraClient({ idempotencyKeys: true }); // stable key on POST/PATCH retries

await crawlora.request("bing-search", { q: "coffee" }, {
  retries: 5,
  isRetryable: (status) => status >= 500
});
```

## Rate Limiting

```js
const crawlora = new CrawloraClient({ rateLimit: 10, maxConcurrency: 4 });
```

## Optional Live Smoke Tests

```sh
CRAWLORA_API_KEY=... npm run example:bing-search
CRAWLORA_API_KEY=... CRAWLORA_YOUTUBE_VIDEO_ID=... npm run example:youtube-transcript
```
