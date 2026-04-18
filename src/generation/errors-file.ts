import { ERROR_CODE_INTERFACE_MAP } from "@openapi-sdk-tools/core";
import type { SdkGroupIR } from "../extraction/types";
import { customTagToInterfaceName } from "../utils";

/**
 * Generates errors.ts with:
 * - Re-exports of known error interfaces from @openapi-sdk-tools/core
 * - Generated interfaces for custom error tags (e.g. DATABASE_UNAVAILABLE)
 * - Per-operation error type aliases (e.g. FindOneErrors = NotFoundError | DatabaseUnavailableError)
 */
export function generateErrorsFile(groups: SdkGroupIR[]): string {
  const allCodes = new Set<string>();
  for (const group of groups) {
    for (const op of group.operations) {
      for (const code of op.errorCodes) {
        allCodes.add(code);
      }
    }
  }

  const knownInterfaces = new Set<string>();
  const customTags = new Set<string>();
  const codeToInterface = new Map<string, string>();

  for (const code of allCodes) {
    const ifaceName = (ERROR_CODE_INTERFACE_MAP as Record<string, string>)[code];
    if (ifaceName) {
      knownInterfaces.add(ifaceName);
      codeToInterface.set(code, ifaceName);
    } else {
      customTags.add(code);
      codeToInterface.set(code, customTagToInterfaceName(code));
    }
  }

  const lines: string[] = [];

  // Import needed types
  const localImports = new Set<string>(["ServiceError"]);
  for (const iface of knownInterfaces) localImports.add(iface);
  lines.push(
    `import type { ${[...localImports].sort().join(", ")} } from '@openapi-sdk-tools/core';`,
  );
  lines.push("");

  // Re-export known interfaces
  if (knownInterfaces.size > 0) {
    lines.push(
      `export type { ${[...knownInterfaces].sort().join(", ")} } from '@openapi-sdk-tools/core';`,
    );
    lines.push("");
  }

  lines.push(`export type { ServiceError } from '@openapi-sdk-tools/core';`);
  lines.push(`export { matchError, assertNever } from '@openapi-sdk-tools/core';`);
  lines.push("");

  // Generate custom tag interfaces
  if (customTags.size > 0) {
    lines.push(
      `// ─── Custom error interfaces (auto-generated from x-errors tags) ──────────`,
    );
    lines.push("");
    for (const tag of [...customTags].sort()) {
      const ifaceName = codeToInterface.get(tag)!;
      lines.push(`export interface ${ifaceName} extends ServiceError {`);
      lines.push(`  code: '${tag}';`);
      lines.push(`}`);
      lines.push("");
    }
  }

  // Per-operation error type aliases — scoped by group to avoid collisions
  // when multiple groups share operationIds (e.g. every group has "getAll")
  for (const group of groups) {
    for (const op of group.operations) {
      const aliasName = operationErrorTypeName(op.operationId, group.className);

      const members = op.errorCodes
        .map((c) => codeToInterface.get(c))
        .filter(Boolean) as string[];

      lines.push(
        `export type ${aliasName} = ${members.length > 0 ? members.join(" | ") : "ServiceError"};`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Derives the error type alias name from an operationId.
 * e.g. 'usersController_findOne' → 'UsersControllerFindOneErrors'
 * e.g. 'findOne' → 'FindOneErrors'
 */
export function operationErrorTypeName(operationId: string, groupClassName?: string): string {
  const pascal = operationId
    .replace(/[_-]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
  return (groupClassName ?? "") + pascal + "Errors";
}
