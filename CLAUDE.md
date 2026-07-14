# CLAUDE.md - generator package

CLI tool generating TypeScript SDKs from OpenAPI specs.

## Extraction

- `extraction/errors.ts` — Extracts error codes from `x-errors` or 4xx/5xx responses
- `extraction/operations.ts` — Parses operations, groups by tag
- `extraction/schemas.ts` — Converts schemas to TypeScript types

## Generation

- `generation/sdk-base.ts` — Generates `SdkBase<TError>` and `ClientOptions<TError>`
- `generation/sdk-file.ts` — Generates per-tag client classes
- `generation/errors-file.ts` — Emits string-literal error code unions

## Output

Per-operation error types are string-literal unions:
```ts
export type TicketGetAllErrorCodes = "NOT_FOUND" | "VALIDATION_ERROR" | "INTERNAL_SERVER_ERROR" | ...;
```

Generated `typedRequest<T, TCode>` passes declared codes to `SdkResultAsync`.