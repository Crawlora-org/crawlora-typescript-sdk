import type {
  CrawloraGeneratedGroups,
  OperationId,
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
  [group: string]: unknown;
}

export interface CrawloraClient extends CrawloraGeneratedGroups {}

export const operations: Record<string, OperationDefinition>;
export const groups: Record<string, Record<string, string>>;
export const operationCount: number;
export const VERSION: string;
export * from "./types.js";
