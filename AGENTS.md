# AGENTS.md - generator

CLI and templates that emit typed SDKs. Generated packages must depend only on `@openapi-sdk-tools/core`.

## Pipeline

`generate()` in `src/index.ts`: load spec → extract IR (`extraction/`) → generate files (`generation/`) → write package metadata.

Generation modules:

- `generation/interfaces.ts` — per-domain interface files (`src/interfaces/*.interfaces.ts`) and barrel.
- `generation/enums.ts` — enums.
- `generation/errors-file.ts` — per-operation string-literal error unions.
- `generation/sdk-base.ts` — `SdkBase` and `ClientOptions`.
- `generation/sdk-file.ts` — per-tag promise and result clients.
- `generation/sdk-root.ts` — root aggregator clients.
- `generation/sdk-barrel.ts` — SDK barrel.

## Generated Contract

`ClientOptions` includes:

```ts
plugins?: SdkPlugin[];
```

`SdkBase`:

- builds `new SdkKernel(options.plugins)` in the constructor;
- `request<T>()` returns `Promise<T>` from the adapter;
- `typedRequest<T, TCode>()` wraps the promise with `kernel.result.fromPromise(...)`, applies `mapError(kernel.errorDecoder, errorMapper, raw)`, and returns `SdkResultAsync` with the kernel and options.

`sdk-file.ts`:

- promise clients return `this.request<T>(...)` directly;
- result clients call `this.typedRequest<T, TCode>(...)` with declared codes.

Generated package metadata:

- dependency: `@openapi-sdk-tools/core` `^2.0.0`;
- no neverthrow dependency;
- no plugin package dependency.

The generated barrel re-exports `SdkResultAsync` and `type SdkPlugin` from `./base`.

## Rules

- Do not import neverthrow into templates or generated output.
- Do not hand-edit `test-app/lib/sdks/agendashop`; change templates, rebuild, regenerate.
- Preserve the exhaustive error-code contract (`x-errors` or 4xx/5xx responses).
- `writeGeneratedPackageJson` and `writeGeneratedTsConfig` live in `src/index.ts`.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm test
```

`test/generation.test.ts` asserts plugin injection, promise adapters, kernel-wrapped typed requests, and no direct neverthrow import.

Regenerate the smoke SDK with `pnpm fullRebuild` from the repo root.
