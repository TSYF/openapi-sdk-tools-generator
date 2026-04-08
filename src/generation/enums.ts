import type { SchemaIR } from "../extraction/types";
import { toKebab } from "../utils";

export interface EnumFileOutput {
  fileName: string; // e.g. 'user-role.enum.ts'
  enumName: string;
  content: string;
}

export function generateEnumFile(schema: SchemaIR): EnumFileOutput {
  const lines: string[] = [];
  lines.push(`export enum ${schema.name} {`);

  for (const value of schema.enumValues ?? []) {
    if (typeof value === "string") {
      const key = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/^_+|_+$/g, "");
      lines.push(`  ${key} = '${value}',`);
    } else {
      lines.push(`  V${value} = ${value},`);
    }
  }

  lines.push(`}`);
  lines.push("");

  return {
    fileName: `${toKebab(schema.name)}.enum.ts`,
    enumName: schema.name,
    content: lines.join("\n"),
  };
}
