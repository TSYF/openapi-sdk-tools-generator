/**
 * Generates sdk/base.ts — the framework-agnostic SdkBase class that all
 * generated sub-clients extend. Uses HttpAdapter (FetchAdapter by default).
 */
export function generateSdkBase(): string {
  return `import { ResultAsync } from 'neverthrow';
import {
  FetchAdapter,
  parseServiceErrorGeneric,
  type HttpAdapter,
  type HttpRequestError,
  type ServiceError,
  type SdkErrorMapper,
} from '@openapi-sdk-tools/core';

export interface ClientOptions {
  baseUrl: string;
  /** Override the HTTP transport. Defaults to FetchAdapter (native fetch). */
  adapter?: HttpAdapter;
  /** Override how raw HTTP errors are mapped to ServiceError objects. */
  errorMapper?: SdkErrorMapper;
  /** Headers merged into every request. */
  defaultHeaders?: Record<string, string>;
}

export class SdkBase {
  private readonly _adapter: HttpAdapter;
  private readonly _errorMapper: SdkErrorMapper;

  constructor(protected readonly options: ClientOptions) {
    this._adapter = options.adapter ?? new FetchAdapter();
    this._errorMapper = options.errorMapper ?? parseServiceErrorGeneric;
  }

  protected request<T>(
    method: string,
    path: string,
    opts?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined | null>;
      headers?: Record<string, string>;
    },
  ): ResultAsync<T, HttpRequestError> {
    const url = \`\${this.options.baseUrl}\${path}\`;
    return this._adapter.request<T>({
      method,
      url,
      body: opts?.body,
      query: opts?.query,
      headers: {
        ...this.options.defaultHeaders,
        ...opts?.headers,
      },
    });
  }

  protected typedRequest<T, E extends ServiceError = ServiceError>(
    method: string,
    path: string,
    opts?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined | null>;
      headers?: Record<string, string>;
    },
  ): ResultAsync<T, E> {
    return this.request<T>(method, path, opts).mapErr(
      (e) => this._errorMapper(e) as E,
    );
  }
}
`;
}
