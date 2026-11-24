/**
 * Generates sdk/base.ts — the framework-agnostic SdkBase class that all
 * generated sub-clients extend. Uses HttpAdapter (FetchAdapter by default)
 * and a plugin-driven kernel for result handling and error matching.
 */
export function generateSdkBase(): string {
  return `import {
  FetchAdapter,
  SdkKernel,
  SdkResultAsync,
  mapError,
  type HttpAdapter,
  type SdkErrorMapper,
  type SdkPlugin,
} from '@openapi-sdk-tools/core';

export { SdkResultAsync };
export type { SdkPlugin };

export interface ClientOptions<TError = unknown> {
  baseUrl: string;
  /** Override the HTTP transport. Defaults to FetchAdapter (native fetch). */
  adapter?: HttpAdapter;
  /** Override how raw HTTP errors are mapped to typed error payloads. */
  errorMapper?: SdkErrorMapper<TError>;
  /** Headers merged into every request. */
  defaultHeaders?: Record<string, string>;
  /** Path array to the discriminant field on error objects. Defaults to ['code']. */
  errorDiscriminatorKey?: string[];
  /** API version to send with every request. */
  apiVersion?: \`\$\{number\}\`;
  /** How to transmit the version. 'header' sends x-api-version (default). 'path' prepends /version to every path. */
  apiVersionStrategy?: 'header' | 'path';
  /**
   * Kernel plugins. Supply a result backend (neverthrow, Effect, ...), a
   * match strategy (ts-pattern, ...), and/or an error decoder (Zod, Joi, ...).
   */
  plugins?: SdkPlugin[];
}

export class SdkBase<TError = unknown> {
  private readonly _adapter: HttpAdapter;
  private readonly _errorMapper: SdkErrorMapper<TError>;
  private readonly _discriminatorKey: string[];
  private readonly _kernel: SdkKernel;

  constructor(protected readonly options: ClientOptions<TError>) {
    this._adapter = options.adapter ?? new FetchAdapter();
    this._errorMapper = options.errorMapper ?? ((e) => e as unknown as TError);
    this._discriminatorKey = options.errorDiscriminatorKey ?? ['code'];
    this._kernel = new SdkKernel(options.plugins);
  }

  protected request<T>(
    method: string,
    path: string,
    opts?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined | null>;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    const usePathVersioning =
      this.options.apiVersion && this.options.apiVersionStrategy === 'path';
    const url = usePathVersioning
      ? \`\${this.options.baseUrl}/\${this.options.apiVersion}\${path}\`
      : \`\${this.options.baseUrl}\${path}\`;
    const headers = {
      ...this.options.defaultHeaders,
      ...opts?.headers,
    };
    if (this.options.apiVersion && !usePathVersioning) {
      headers['x-api-version'] = this.options.apiVersion;
    }
    return this._adapter.request<T>({
      method,
      url,
      body: opts?.body,
      query: opts?.query,
      headers,
    });
  }

  protected typedRequest<T, TCode extends string>(
    method: string,
    path: string,
    declaredCodes: readonly TCode[],
    opts?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined | null>;
      headers?: Record<string, string>;
    },
  ): SdkResultAsync<T, TCode, TError> {
    const result = this._kernel.result.fromPromise(
      this.request<T>(method, path, opts),
      (error) =>
        mapError(this._kernel.errorDecoder, this._errorMapper, error),
    );

    return new SdkResultAsync(result, this._kernel, {
      discriminatorKey: this._discriminatorKey,
      declaredCodes,
    });
  }
}
`;
}
