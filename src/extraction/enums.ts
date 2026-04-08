import type { SchemaIR } from "./types";

export function extractEnums(schemas: SchemaIR[]): SchemaIR[] {
  return schemas.filter((s) => s.kind === "enum");
}
