import type {
  CrawloraGeneratedGroups,
  OperationId,
  OperationParamsMap,
  OperationRequestArgs,
  OperationResponseMap
} from "./types.js";

export type CrawloraParams = Record<string, unknown>;

export interface CrawloraClientOptions {
  apiKey?: string;
  jwtToken?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  userAgent?: string | false;
  fetch?: typeof globalThis.fetch;
}

export interface CrawloraRequestOptions {
  headers?: Record<string, string>;
  responseType?: "auto" | "json" | "text";
  timeout?: number;
  signal?: AbortSignal;
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
}

export class CrawloraError extends Error {
  status: number;
  code?: number;
  body: unknown;
  headers: Record<string, string>;
  response?: Response;
  cause?: unknown;
  retryable?: boolean;
}

// Thrown for 4xx API responses (request rejected by the API).
export class CrawloraClientError extends CrawloraError {}
// Thrown for 5xx API responses (API failed to handle a valid request).
export class CrawloraServerError extends CrawloraError {}
// Thrown for transport failures, timeouts, and aborts before a response.
export class CrawloraNetworkError extends CrawloraError {}

export interface CrawloraPaginateOptions extends CrawloraRequestOptions {
  // Query parameter to advance. Auto-detected as "page" or "offset" when omitted.
  pageParam?: string;
  // First value for the page parameter. Defaults to 1 for "page", 0 for "offset".
  start?: number;
  // Amount added to the page parameter after each page. Defaults to 1.
  step?: number;
  // Maximum number of pages to fetch. Defaults to unbounded.
  maxPages?: number;
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
  [group: string]: unknown;
}

export interface CrawloraClient extends CrawloraGeneratedGroups {}

export const operations: Record<string, OperationDefinition>;
export const groups: Record<string, Record<string, string>>;
export const operationCount: number;
export const OperationIds: Readonly<Record<string, OperationId>>;
export const VERSION: string;
export * from "./types.js";
