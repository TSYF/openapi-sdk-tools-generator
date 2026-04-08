export interface GeneratorConfig {
  /** Path to OpenAPI spec file or http(s):// URL */
  specPath: string;
  /** Directory where generated SDK files will be written */
  outputDir: string;
  /** Name of the root client class, e.g. 'MyApiClient' */
  clientName: string;
  /** Additional HTTP headers for fetching remote specs (e.g. auth tokens) */
  specHeaders?: Record<string, string>;
  /**
   * Versioning strategy. Currently inactive — wired in for future use.
   * @default 'none'
   */
  versionStrategy?: "none" | "path-prefix" | "tag";
}
