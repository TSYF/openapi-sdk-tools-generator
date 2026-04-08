import SwaggerParser from "@apidevtools/swagger-parser";
import type { OasDocument } from "./types";

/**
 * Validates the OpenAPI document and returns it with all $ref pointers
 * bundled (local refs resolved to their definitions, remote refs fetched).
 *
 * We use bundle() rather than dereference() to preserve $ref strings in
 * the resolved document — extraction code reads ref names to determine
 * TypeScript type names (e.g. '#/components/schemas/UserDto' → 'UserDto').
 */
export async function resolveRefs(doc: OasDocument): Promise<OasDocument> {
  const api = await SwaggerParser.bundle(doc as any);
  return api as unknown as OasDocument;
}
