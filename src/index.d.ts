import type {
  CrawloraGeneratedGroups,
  OperationId,
  OperationParamsMap,
  OperationRequestArgs,
  OperationResponseMap
} from "./types.js";

export type CrawloraParams = Record<string, unknown>;

export type CrawloraLogEvent = { event: string; [key: string]: unknown };

export interface CrawloraRequestContext {
  operationId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
}
export type CrawloraBeforeRequest = (ctx: CrawloraRequestContext) => void | Promise<void>;
export type CrawloraAfterResponse = (
  operationId: string,
  status: number,
  headers: Record<string, string>,
  body: unknown
) => unknown;

export interface CrawloraClientOptions {
  apiKey?: string;
  jwtToken?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  /** Cap on backoff and Retry-After delays in ms (default 30000). */
  maxRetryDelay?: number;
  /** Override the retryable HTTP status set (network status 0 stays retryable). */
  retryStatuses?: Iterable<number>;
  /** Full predicate; supersedes retryStatuses when set. */
  isRetryable?: (status: number, error: CrawloraError) => boolean;
  /** Called before each retry sleep with (attempt, error, delayMs). */
  onRetry?: (attempt: number, error: CrawloraError, delay: number) => void;
  /** Generate an x-request-id header when absent. */
  requestId?: boolean;
  /** Attach a stable Idempotency-Key on POST/PATCH, reused across retries. */
  idempotencyKeys?: boolean;
  /** Cap outgoing requests to at most this many per second. */
  rateLimit?: number;
  /** Cap the number of in-flight requests. */
  maxConcurrency?: number;
  /** Structured event sink (request/retry); never logs on its own. */
  logger?: (event: CrawloraLogEvent) => void;
  /** Hook(s) run before each request; mutate ctx.headers / ctx.url. */
  beforeRequest?: CrawloraBeforeRequest | Iterable<CrawloraBeforeRequest>;
  /** Hook(s) run on the parsed success body; return a value to replace it. */
  afterResponse?: CrawloraAfterResponse | Iterable<CrawloraAfterResponse>;
  headers?: Record<string, string>;
  userAgent?: string | false;
  fetch?: typeof globalThis.fetch;
}

export interface CrawloraRequestOptions {
  headers?: Record<string, string>;
  responseType?: "auto" | "json" | "text" | "stream";
  timeout?: number;
  signal?: AbortSignal;
  /** Per-request retry count, overriding the client default. */
  retries?: number;
  /** Per-request retry predicate, overriding the client default. */
  isRetryable?: (status: number, error: CrawloraError) => boolean;
}

export type OperationMethod = <T = unknown>(
  params?: CrawloraParams,
  options?: CrawloraRequestOptions
) => Promise<T>;

export interface OperationDefinition {
  id: string;
  method: string;
  path: string;
  pathParams: string[];
  queryParams: Array<{ name: string; in?: "query"; collectionFormat?: string; type?: string; required?: boolean; enum?: string[] }>;
  formParams: Array<{ name: string; in?: "formData"; type?: string; required?: boolean; enum?: string[] }>;
  bodyParam?: string;
  bodyRequired?: boolean;
  consumes: string[];
  produces: string[];
  security: string[];
  paginatable?: boolean;
  cursorParams?: string[];
}

export class CrawloraError extends Error {
  status: number;
  code?: number;
  body: unknown;
  headers: Record<string, string>;
  response?: Response;
  cause?: unknown;
  retryable?: boolean;
  requestId?: string;
}

// Thrown for 4xx API responses (request rejected by the API).
export class CrawloraClientError extends CrawloraError {}
// Thrown for 5xx API responses (API failed to handle a valid request).
export class CrawloraServerError extends CrawloraError {}
// Thrown for transport failures, timeouts, and aborts before a response.
export class CrawloraNetworkError extends CrawloraError {}

export interface CrawloraPaginateOptions extends CrawloraRequestOptions {
  // Numeric query parameter to advance. Auto-detected as "page" or "offset".
  pageParam?: string;
  // Cursor/token query parameter (cursor mode). Requires nextCursor.
  cursorParam?: string;
  // Extracts the next cursor from a page; iteration stops when it returns falsy.
  nextCursor?: (page: unknown) => unknown;
  // First page value (numeric) or initial cursor value.
  start?: unknown;
  // Amount added to the page parameter after each page. Defaults to 1.
  step?: number;
  // Maximum number of pages to fetch. Defaults to unbounded.
  maxPages?: number;
}

export interface CrawloraPaginateItemsOptions extends CrawloraPaginateOptions {
  // Extracts the item list from a page (default: the `data` array).
  items?: (page: unknown) => Iterable<unknown>;
}

export class CrawloraClient {
  constructor(options?: CrawloraClientOptions);
  request<I extends OperationId>(
    operationId: I,
    ...args: OperationRequestArgs<I>
  ): Promise<OperationResponseMap[I]>;
  operation<I extends OperationId>(
    operationId: I,
    ...args: OperationRequestArgs<I>
  ): Promise<OperationResponseMap[I]>;
  paginate<I extends OperationId>(
    operationId: I,
    params?: OperationParamsMap[I],
    options?: CrawloraPaginateOptions
  ): AsyncGenerator<OperationResponseMap[I], void, unknown>;
  paginateItems<I extends OperationId>(
    operationId: I,
    params?: OperationParamsMap[I],
    options?: CrawloraPaginateItemsOptions
  ): AsyncGenerator<unknown, void, unknown>;
  [group: string]: unknown;
}

export interface CrawloraClient extends CrawloraGeneratedGroups {}

export const operations: Record<string, OperationDefinition>;
export const groups: Record<string, Record<string, string>>;
export const operationCount: number;
export const OperationIds: Readonly<Record<string, OperationId>>;
export const VERSION: string;
export * from "./types.js";
