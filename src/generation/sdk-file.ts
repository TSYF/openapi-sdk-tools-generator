import type { OperationIR, SdkGroupIR } from "../extraction/types";
import { tagToClientClassName, tagToResultClientClassName, toKebab } from "../utils";
import { operationErrorTypeName } from "./errors-file";

/**
 * Converts an OAS path like /users/{id}/posts/{postId}
 * into a template literal expression: `/users/${id}/posts/${postId}`
 */
function buildPathExpression(path: string): string {
  const hasParams = path.includes("{");
  if (!hasParams) return `'${path}'`;

  const expr = path.replace(/\{(\w+)\}/g, "${$1}");
  return `\`${expr}\``;
}

interface MethodSig {
  operationId: string;
  paramsStr: string;
  returnType: string;
  httpVerb: string;
  pathExpr: string;
  optsStr: string;
  errorTypeName: string;
}

function buildMethodSig(op: OperationIR, groupClassName: string): MethodSig {
  const sdkParams: string[] = [];

  // Path params first
  for (const p of op.pathParams) {
    sdkParams.push(`${p.name}: ${p.typeName}`);
  }

  // Query params
  let hasQuery = false;
  let queryOptsExpr = "";
  if (op.queryParams.length > 0) {
    hasQuery = true;
    if (op.queryParams.length === 1) {
      const p = op.queryParams[0];
      const opt = p.required ? "" : "?";
      sdkParams.push(`${p.name}${opt}: ${p.typeName}`);
      queryOptsExpr = `{ ${p.name} }`;
    } else {
      const fields = op.queryParams
        .map((p) => `${p.name}${p.required ? "" : "?"}: ${p.typeName}`)
        .join("; ");
      sdkParams.push(`query: { ${fields} }`);
      queryOptsExpr = "query";
    }
  }

  // Body
  let hasBody = false;
  let bodyParamName = "";
  if (op.bodySchema) {
    hasBody = true;
    bodyParamName = "body";
    sdkParams.push(`body: ${op.bodySchema}`);
  }

  // Optional headers
  sdkParams.push("headers?: Record<string, string>");

  // Return type
  const returnType = op.responseSchema
    ? op.isArrayResponse
      ? `${op.responseSchema}[]`
      : op.responseSchema
    : "void";

  // request opts
  const opts: string[] = [];
  if (hasBody) opts.push(`body`);
  if (hasQuery) opts.push(`query: ${queryOptsExpr}`);
  opts.push("headers");

  return {
    operationId: op.operationId,
    paramsStr: sdkParams.join(", "),
    returnType,
    httpVerb: op.httpMethod,
    pathExpr: buildPathExpression(op.path),
    optsStr: `{ ${opts.join(", ")} }`,
    errorTypeName: operationErrorTypeName(op.operationId, groupClassName),
  };
}

export function generateSdkFile(group: SdkGroupIR, schemaNames: Set<string>): string {
  const promiseClass = tagToClientClassName(group.className);
  const resultClass = tagToResultClientClassName(group.className);

  const lines: string[] = [];

  // Collect imports
  const typeImports = new Set<string>();
  const errorTypeImports = new Set<string>();

  for (const op of group.operations) {
    if (op.bodySchema && isSchemaName(op.bodySchema, schemaNames)) {
      typeImports.add(op.bodySchema.replace(/\[\]$/, ""));
    }
    if (op.responseSchema && isSchemaName(op.responseSchema, schemaNames)) {
      typeImports.add(op.responseSchema.replace(/\[\]$/, ""));
    }
    errorTypeImports.add(operationErrorTypeName(op.operationId, group.className));
  }

  lines.push(`import { SdkBase, SdkResultAsync, type ClientOptions } from './base';`);
  if (typeImports.size > 0) {
    lines.push(
      `import type { ${[...typeImports].sort().join(", ")} } from '../interfaces';`,
    );
  }
  if (errorTypeImports.size > 0) {
    lines.push(
      `import type { ${[...errorTypeImports].sort().join(", ")} } from './errors';`,
    );
  }
  lines.push("");

  const sigs = group.operations.map((op) => buildMethodSig(op, group.className));

  // ── Promise class (throws on error)
  lines.push(`export class ${promiseClass} extends SdkBase {`);
  for (const sig of sigs) {
    lines.push("");
    lines.push(
      `  async ${sig.operationId}(${sig.paramsStr}): Promise<${sig.returnType}> {`,
    );
    lines.push(
      `    return this.request<${sig.returnType}>('${sig.httpVerb}', ${sig.pathExpr}, ${sig.optsStr})`,
    );
    lines.push(`      .match(`);
    lines.push(`        (v) => v,`);
    lines.push(`        (e) => { throw e; },`);
    lines.push(`      );`);
    lines.push(`  }`);
  }
  lines.push(`}`);
  lines.push("");

  // ── ResultAsync class (typed errors)
  lines.push(`export class ${resultClass} extends SdkBase {`);
  for (const sig of sigs) {
    lines.push("");
    lines.push(
      `  ${sig.operationId}(${sig.paramsStr}): SdkResultAsync<${sig.returnType}, ${sig.errorTypeName}> {`,
    );
    lines.push(
      `    return this.typedRequest<${sig.returnType}, ${sig.errorTypeName}>('${sig.httpVerb}', ${sig.pathExpr}, ${sig.optsStr});`,
    );
    lines.push(`  }`);
  }
  lines.push(`}`);
  lines.push("");

  return lines.join("\n");
}

function isSchemaName(typeName: string, schemaNames: Set<string>): boolean {
  // Strip array suffix
  const base = typeName.endsWith("[]") ? typeName.slice(0, -2) : typeName;
  return schemaNames.has(base);
}
