import * as fs from "fs";
import * as path from "path";
import type { OasDocument } from "./types";

/**
 * Load an OpenAPI spec from:
 * - A local file path (JSON or YAML)
 * - An HTTP/HTTPS URL (fetches over the network)
 *
 * Returns the raw parsed document object (refs not yet resolved).
 * Pass the result to resolveRefs() before extraction.
 */
export async function loadSpec(
  specPath: string,
  headers?: Record<string, string>,
): Promise<OasDocument> {
  if (specPath.startsWith("http://") || specPath.startsWith("https://")) {
    return fetchSpec(specPath, headers);
  }
  return readSpec(path.resolve(specPath));
}

async function fetchSpec(
  url: string,
  headers?: Record<string, string>,
): Promise<OasDocument> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenAPI spec from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (contentType.includes("yaml") || url.endsWith(".yaml") || url.endsWith(".yml")) {
    // Dynamically require js-yaml only when needed
    const yaml = await import("js-yaml");
    return yaml.load(text) as OasDocument;
  }

  return JSON.parse(text) as OasDocument;
}

function readSpec(filePath: string): OasDocument {
  if (!fs.existsSync(filePath)) {
    throw new Error(`OpenAPI spec file not found: ${filePath}`);
  }

  const text = fs.readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".yaml" || ext === ".yml") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yaml = require("js-yaml");
    return yaml.load(text) as OasDocument;
  }

  return JSON.parse(text) as OasDocument;
}
