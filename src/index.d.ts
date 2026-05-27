export type CrawloraParams = Record<string, unknown>;

export interface CrawloraClientOptions {
  apiKey?: string;
  jwtToken?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
}

export interface CrawloraRequestOptions {
  headers?: Record<string, string>;
  responseType?: "auto" | "json" | "text";
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
  queryParams: Array<{ name: string; collectionFormat?: string }>;
  formParams: Array<{ name: string; type?: string }>;
  bodyParam?: string;
  consumes: string[];
  produces: string[];
  security: string[];
}

export class CrawloraError extends Error {
  status: number;
  code?: number;
  body: unknown;
  response: Response;
}

export class CrawloraClient {
  constructor(options?: CrawloraClientOptions);
  request<T = unknown>(
    operationId: string,
    params?: CrawloraParams,
    options?: CrawloraRequestOptions
  ): Promise<T>;
  operation<T = unknown>(
    operationId: string,
    params?: CrawloraParams,
    options?: CrawloraRequestOptions
  ): Promise<T>;
  [group: string]: unknown;
}

export const operations: Record<string, OperationDefinition>;
export const groups: Record<string, Record<string, string>>;
