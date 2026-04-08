import type { OpenAPIV3 } from "openapi-types";
import type { OasDocument, OasSchemaOrRef } from "../spec/types";
import type { PropertyIR, SchemaIR } from "./types";

// ─── $ref helpers ─────────────────────────────────────────────────────────────

export function refToName(ref: string): string {
  return ref.split("/").pop()!;
}

// ─── Schema → TypeScript type string ─────────────────────────────────────────

/**
 * Converts an OAS schema (or $ref) to a TypeScript type string.
 * $refs are resolved to their component name (e.g. 'UserDto').
 * Inline schemas are mapped to equivalent TS types.
 */
export function oasSchemaToTsType(schema: OasSchemaOrRef): string {
  if ("$ref" in schema) {
    return refToName(schema.$ref);
  }
  return oasInlineToTsType(schema as OpenAPIV3.SchemaObject);
}

function oasInlineToTsType(schema: OpenAPIV3.SchemaObject): string {
  // oneOf / anyOf → union
  if (schema.oneOf || schema.anyOf) {
    const members = (schema.oneOf ?? schema.anyOf)!;
    return members.map(oasSchemaToTsType).join(" | ") || "unknown";
  }

  // allOf → intersection
  if (schema.allOf) {
    return schema.allOf.map(oasSchemaToTsType).join(" & ") || "unknown";
  }

  // Inline enum → literal union
  if (schema.enum) {
    const literals = schema.enum.map((v) =>
      typeof v === "string" ? `'${v}'` : String(v),
    );
    const base = literals.join(" | ") || "never";
    return schema.nullable ? `${base} | null` : base;
  }

  let base: string;

  switch (schema.type) {
    case "string":
      base = "string";
      break;
    case "integer":
    case "number":
      base = "number";
      break;
    case "boolean":
      base = "boolean";
      break;
    case "array": {
      const arr = schema as OpenAPIV3.ArraySchemaObject;
      base = arr.items ? `${oasSchemaToTsType(arr.items)}[]` : "unknown[]";
      break;
    }
    case "object":
      if (schema.additionalProperties === true) {
        base = "Record<string, unknown>";
      } else if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        base = `Record<string, ${oasSchemaToTsType(schema.additionalProperties as OasSchemaOrRef)}>`;
      } else {
        base = "Record<string, unknown>";
      }
      break;
    default:
      base = "unknown";
  }

  return schema.nullable ? `${base} | null` : base;
}

// ─── Error schema detection ───────────────────────────────────────────────────

/**
 * Returns true if this component schema represents a discriminated error shape.
 * Heuristic: has required `code` (string with single-value enum) + required `status` (integer).
 */
export function isErrorSchema(schema: OpenAPIV3.SchemaObject): boolean {
  if (!schema.properties || !schema.required) return false;
  if (!schema.required.includes("code") || !schema.required.includes("status")) {
    return false;
  }

  const codeProp = schema.properties.code;
  if (!codeProp || "$ref" in codeProp) return false;
  if ((codeProp as OpenAPIV3.SchemaObject).type !== "string") return false;
  const codeEnum = (codeProp as OpenAPIV3.SchemaObject).enum;
  if (!codeEnum || codeEnum.length === 0) return false;

  const statusProp = schema.properties.status;
  if (!statusProp || "$ref" in statusProp) return false;
  if ((statusProp as OpenAPIV3.SchemaObject).type !== "integer") return false;

  return true;
}

// ─── Component schema extraction ─────────────────────────────────────────────

export function extractSchemas(doc: OasDocument): SchemaIR[] {
  const schemas = doc.components?.schemas;
  if (!schemas) return [];

  const results: SchemaIR[] = [];

  for (const [name, schemaOrRef] of Object.entries(schemas)) {
    if ("$ref" in schemaOrRef) continue;
    const schema = schemaOrRef as OpenAPIV3.SchemaObject;

    // Skip error schemas — not emitted as interfaces, used for error discrimination
    if (isErrorSchema(schema)) continue;

    if (schema.enum) {
      // Top-level enum
      results.push({
        name,
        kind: "enum",
        enumValues: schema.enum as (string | number)[],
      });
      continue;
    }

    if (schema.type === "object" || schema.properties) {
      // Interface
      const properties: PropertyIR[] = [];
      const required = new Set(schema.required ?? []);

      for (const [propName, propSchema] of Object.entries(schema.properties ?? {})) {
        properties.push({
          name: propName,
          typeName: oasSchemaToTsType(propSchema),
          optional: !required.has(propName),
        });
      }

      results.push({ name, kind: "interface", properties });
      continue;
    }

    // Everything else (allOf, oneOf, primitive aliases) → type alias
    results.push({
      name,
      kind: "alias",
      aliasType: oasInlineToTsType(schema),
    });
  }

  return results;
}
