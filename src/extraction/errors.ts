import type { OpenAPIV3 } from "openapi-types";
import { STATUS_TO_CODE_MAP } from "@openapi-sdk-tools/core";
import { oasSchemaToTsType, refToName } from "./schemas";

/**
 * Extract error codes for an operation.
 *
 * Priority:
 * 1. x-errors extension: explicit flat list of code strings
 * 2. Fallback: scan 4xx/5xx response schemas for code.enum values
 * 3. Minimum: ['INTERNAL_SERVER_ERROR']
 */
export function extractErrorCodes(
  operation: OpenAPIV3.OperationObject,
): string[] {
  const ext = operation as any;

  // Priority 1: explicit x-errors
  if (Array.isArray(ext["x-errors"]) && ext["x-errors"].length > 0) {
    return ext["x-errors"] as string[];
  }

  // Priority 2: scan responses
  const codes = extractErrorCodesFromResponses(
    operation.responses ?? {},
  );

  return codes.length > 0 ? codes : ["INTERNAL_SERVER_ERROR"];
}

function extractErrorCodesFromResponses(
  responses: OpenAPIV3.ResponsesObject,
): string[] {
  const codes: string[] = [];

  for (const [statusStr, responseOrRef] of Object.entries(responses)) {
    const statusNum = parseInt(statusStr);
    if (isNaN(statusNum) || statusNum < 400) continue;
    if (!responseOrRef || "$ref" in responseOrRef) {
      // Ref to a response — map status if known
      const code = STATUS_TO_CODE_MAP[statusNum];
      if (code) codes.push(code);
      continue;
    }

    const response = responseOrRef as OpenAPIV3.ResponseObject;
    const content = response.content?.["application/json"];

    if (!content?.schema) {
      const code = STATUS_TO_CODE_MAP[statusNum];
      if (code) codes.push(code);
      continue;
    }

    const schema = content.schema;

    if ("$ref" in schema) {
      // Named component — will be an error schema; extract code from its name pattern
      // At extraction time we don't have the full component map, so fall back to status
      const code = STATUS_TO_CODE_MAP[statusNum];
      if (code) codes.push(code);
      continue;
    }

    const oasSchema = schema as OpenAPIV3.SchemaObject;

    // Direct object with code.enum → single error code
    if (oasSchema.type === "object" && oasSchema.properties?.code) {
      const codeProp = oasSchema.properties.code as OpenAPIV3.SchemaObject;
      if (codeProp.enum?.length === 1) {
        codes.push(String(codeProp.enum[0]));
        continue;
      }
    }

    // oneOf / anyOf → multiple error codes
    const arms = oasSchema.oneOf ?? oasSchema.anyOf;
    if (arms) {
      for (const arm of arms) {
        if ("$ref" in arm) {
          // Can't read code value from a ref without the component map
          // At minimum add a status-based code
          const code = STATUS_TO_CODE_MAP[statusNum];
          if (code && !codes.includes(code)) codes.push(code);
        } else {
          const armSchema = arm as OpenAPIV3.SchemaObject;
          const codeProp = armSchema.properties?.code as
            | OpenAPIV3.SchemaObject
            | undefined;
          if (codeProp?.enum?.length === 1) {
            codes.push(String(codeProp.enum[0]));
          }
        }
      }
      continue;
    }

    // Fallback: use status-based code
    const fallback = STATUS_TO_CODE_MAP[statusNum];
    if (fallback) codes.push(fallback);
  }

  // Deduplicate
  return [...new Set(codes)];
}
