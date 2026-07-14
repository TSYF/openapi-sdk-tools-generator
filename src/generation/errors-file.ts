import type { SdkGroupIR } from "../extraction/types";

/**
 * Generates errors.ts with:
 * - Per-operation string-literal error code unions (e.g. type TicketGetAllErrorCodes = "NOT_FOUND" | "VALIDATION_ERROR" | ...)
 */
export function generateErrorsFile(groups: SdkGroupIR[]): string {
  const lines: string[] = [];

  // Per-operation error code unions — scoped by group to avoid collisions
  // when multiple groups share operationIds (e.g. every group has "getAll")
  for (const group of groups) {
    for (const op of group.operations) {
      const aliasName = operationErrorTypeName(op.operationId, group.className);

      // Emit string-literal union of declared error codes
      const codeLiterals = op.errorCodes.map((c) => `'${c}'`).join(" | ");
      lines.push(
        `export type ${aliasName} = ${codeLiterals.length > 0 ? codeLiterals : "never"};`,
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
export function operationErrorTypeName(
  operationId: string,
  groupClassName?: string,
): string {
  const pascal = operationId
    .replace(/[_-]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
  return (groupClassName ?? "") + pascal + "Errors";
}
