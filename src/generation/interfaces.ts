import type { SchemaIR } from "../extraction/types";
import { toKebab } from "../utils";

/**
 * Group interface schemas by a common prefix (first word of PascalCase name)
 * so related types end up in the same file.
 * e.g. UserDto, UserCreateDto → user.interfaces.ts
 */
function groupKey(name: string): string {
  // Split PascalCase on capital letters, take the first segment
  const match = name.match(/^[A-Z][a-z0-9]*/);
  return match ? match[0].toLowerCase() : "common";
}

export interface InterfaceFileOutput {
  fileName: string; // e.g. 'user.interfaces.ts'
  content: string;
}

export function generateInterfaceFiles(
  schemas: SchemaIR[],
  enumNames: Set<string>,
): InterfaceFileOutput[] {
  const interfaces = schemas.filter((s) => s.kind === "interface");
  const aliases = schemas.filter((s) => s.kind === "alias");

  // Group by prefix
  const groups = new Map<string, SchemaIR[]>();
  for (const schema of [...interfaces, ...aliases]) {
    const key = groupKey(schema.name);
    const existing = groups.get(key);
    if (existing) existing.push(schema);
    else groups.set(key, [schema]);
  }

  const outputs: InterfaceFileOutput[] = [];

  for (const [key, group] of groups.entries()) {
    const lines: string[] = [];

    // Collect all $ref-resolved names used in this file to know which
    // enums/interfaces to import from sibling files
    const referencedNames = new Set<string>();
    for (const schema of group) {
      if (schema.kind === "interface" && schema.properties) {
        for (const prop of schema.properties) {
          collectReferencedNames(prop.typeName, referencedNames);
        }
      } else if (schema.kind === "alias" && schema.aliasType) {
        collectReferencedNames(schema.aliasType, referencedNames);
      }
    }

    // Remove self-references
    for (const schema of group) {
      referencedNames.delete(schema.name);
    }

    // Import enums referenced in this file
    const enumImports = [...referencedNames].filter((n) => enumNames.has(n));
    if (enumImports.length > 0) {
      lines.push(
        `import { ${enumImports.sort().join(", ")} } from '../enums';`,
      );
      lines.push("");
    }

    for (const schema of group) {
      if (schema.kind === "interface") {
        lines.push(`export interface ${schema.name} {`);
        for (const prop of schema.properties ?? []) {
          const opt = prop.optional ? "?" : "";
          lines.push(`  ${prop.name}${opt}: ${prop.typeName};`);
        }
        lines.push(`}`);
      } else if (schema.kind === "alias") {
        lines.push(`export type ${schema.name} = ${schema.aliasType};`);
      }
      lines.push("");
    }

    outputs.push({
      fileName: `${toKebab(key)}.interfaces.ts`,
      content: lines.join("\n"),
    });
  }

  return outputs;
}

/** Extract bare type names from a TS type string (e.g. 'UserDto | null' → ['UserDto']) */
function collectReferencedNames(typeName: string, out: Set<string>) {
  // Match identifiers that start with uppercase (likely schema names)
  const matches = typeName.match(/\b[A-Z][A-Za-z0-9]*\b/g) ?? [];
  for (const m of matches) {
    out.add(m);
  }
}
