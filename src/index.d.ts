import type { CrawloraGeneratedGroups, OperationId } from "./types.js";

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
  response?: Response;
  cause?: unknown;
}

export class CrawloraClient {
  constructor(options?: CrawloraClientOptions);
  request<T = unknown>(
    operationId: OperationId,
    params?: CrawloraParams,
    options?: CrawloraRequestOptions
  ): Promise<T>;
  operation<T = unknown>(
    operationId: OperationId,
    params?: CrawloraParams,
    options?: CrawloraRequestOptions
  ): Promise<T>;
  [group: string]: unknown;
}

export interface CrawloraClient extends CrawloraGeneratedGroups {}

export const operations: Record<string, OperationDefinition>;
export const groups: Record<string, Record<string, string>>;
export const operationCount: number;
export const VERSION: string;
export * from "./types.js";
