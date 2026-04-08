import type { OasDocument } from "../spec/types";
import type { OperationIR, SchemaIR, SdkGroupIR } from "./types";
import { extractSchemas } from "./schemas";
import { extractOperations, groupOperationsByTag } from "./operations";
import { extractEnums } from "./enums";

export interface ExtractionResult {
  operations: OperationIR[];
  schemas: SchemaIR[];
  enums: SchemaIR[];
  sdkGroups: SdkGroupIR[];
}

export function extractAll(doc: OasDocument): ExtractionResult {
  const schemas = extractSchemas(doc);
  const enums = extractEnums(schemas);
  const operations = extractOperations(doc);
  const sdkGroups = groupOperationsByTag(operations);

  return { operations, schemas, enums, sdkGroups };
}

export { extractSchemas, extractOperations, groupOperationsByTag, extractEnums };
export type { OperationIR, SchemaIR, SdkGroupIR } from "./types";
