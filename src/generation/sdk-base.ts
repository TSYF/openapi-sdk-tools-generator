/**
 * Generates sdk/base.ts — the framework-agnostic SdkBase class that all
 * generated sub-clients extend. Uses HttpAdapter (FetchAdapter by default).
 */
export function generateSdkBase(): string {
  return `import { ResultAsync } from 'neverthrow';
import {
  FetchAdapter,
  parseServiceErrorGeneric,
  SdkResultAsync,
  type HttpAdapter,
  type HttpRequestError,
  type ServiceError,
  type SdkErrorMapper,
} from '@openapi-sdk-tools/core';

export { SdkResultAsync };

export interface ClientOptions {
  baseUrl: string;
  /** Override the HTTP transport. Defaults to FetchAdapter (native fetch). */
  adapter?: HttpAdapter;
  /** Override how raw HTTP errors are mapped to ServiceError objects. */
  errorMapper?: SdkErrorMapper;
  /** Headers merged into every request. */
  defaultHeaders?: Record<string, string>;
  /** Property name on error objects used to dispatch exhaustive match handlers. Defaults to 'code'. */
  errorDiscriminatorKey?: string;
  /** API version to send with every request. */
  apiVersion?: \`\$\{number\}\`;
  /** How to transmit the version. 'header' sends x-api-version (default). 'path' prepends /version to every path. */
  apiVersionStrategy?: 'header' | 'path';
}

export class SdkBase {
  private readonly _adapter: HttpAdapter;
  private readonly _errorMapper: SdkErrorMapper;
  private readonly _discriminatorKey: string;

  constructor(protected readonly options: ClientOptions) {
    this._adapter = options.adapter ?? new FetchAdapter();
    this._errorMapper = options.errorMapper ?? parseServiceErrorGeneric;
    this._discriminatorKey = options.errorDiscriminatorKey ?? 'code';
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
    const prefix = this.options.apiVersion ? \`/\${this.options.apiVersion}\` : '';
    const url = \`\${this.options.baseUrl}\${prefix}\${path}\`;
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
  ): SdkResultAsync<T, E> {
    return new SdkResultAsync(
      this.request<T>(method, path, opts).mapErr(
        (e) => this._errorMapper(e) as E,
      ),
      this._discriminatorKey,
    );
  }
}
`;
}
