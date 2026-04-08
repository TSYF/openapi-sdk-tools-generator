#!/usr/bin/env node
import { generate } from "./index";

/**
 * CLI entry point.
 *
 * Usage:
 *   openapi-sdk-gen <specPath|URL> <outputDir> <clientName> [--header key=value ...]
 *
 * Examples:
 *   openapi-sdk-gen ./openapi.yaml ./client-sdk MyApiClient
 *   openapi-sdk-gen https://api.example.com/openapi.json ./client-sdk MyApiClient
 *   openapi-sdk-gen http://localhost:3000/api-json ./client-sdk MyApiClient --header Authorization="Bearer token"
 */

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error(
    "Usage: openapi-sdk-gen <specPath|URL> <outputDir> <clientName> [--header key=value ...]",
  );
  process.exit(1);
}

const [specPath, outputDir, clientName, ...rest] = args;

// Parse --header flags
const specHeaders: Record<string, string> = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === "--header" && rest[i + 1]) {
    const [key, ...valueParts] = rest[i + 1].split("=");
    specHeaders[key.trim()] = valueParts.join("=").trim();
    i++;
  }
}

generate({
  specPath,
  outputDir,
  clientName,
  specHeaders: Object.keys(specHeaders).length > 0 ? specHeaders : undefined,
}).catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
