import type { OpenAPIV3 } from "openapi-types";
import type { OasDocument } from "../spec/types";
import type { OperationIR, ParamIR, SdkGroupIR } from "./types";
import { oasSchemaToTsType } from "./schemas";
import { extractErrorCodes } from "./errors";
import { pascalCase } from "../utils";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

export function extractOperations(doc: OasDocument): OperationIR[] {
  const operations: OperationIR[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) continue;

    // Path-level parameters (inherited by all operations in this path)
    const pathLevelParams = (pathItem.parameters ?? []) as OpenAPIV3.ParameterObject[];

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as any)[method] as
        | OpenAPIV3.OperationObject
        | undefined;
      if (!operation) continue;

      const ext = operation as any;

      // Grouping tag
      const sdkTag: string =
        ext["x-sdk-tag"] ?? operation.tags?.[0] ?? "Default";

      // Merge path-level and operation-level parameters
      const allParams = [
        ...pathLevelParams,
        ...((operation.parameters ?? []) as OpenAPIV3.ParameterObject[]),
      ];

      const pathParams: ParamIR[] = [];
      const queryParams: ParamIR[] = [];

      for (const param of allParams) {
        if ("$ref" in param) continue; // swagger-parser should have bundled these
        const p = param as OpenAPIV3.ParameterObject;
        const rawType = p.schema ? oasSchemaToTsType(p.schema) : "string";
        const typeName = p.in === "query" && rawType === "unknown" ? "string" : rawType;

        if (p.in === "path") {
          pathParams.push({ name: p.name, typeName, required: true });
        } else if (p.in === "query") {
          queryParams.push({
            name: p.name,
            typeName,
            required: p.required ?? false,
          });
        }
      }

      // Infer any path params from URL template not declared in spec
      const declared = new Set(pathParams.map((p) => p.name));
      for (const match of path.matchAll(/\{(\w+)\}/g)) {
        const name = match[1];
        if (!declared.has(name)) {
          pathParams.push({ name, typeName: "string", required: true });
          declared.add(name);
        }
      }

      // Request body
      let bodySchema: string | null = null;
      const requestBody = operation.requestBody;
      if (requestBody && !("$ref" in requestBody)) {
        const content = (requestBody as OpenAPIV3.RequestBodyObject).content?.[
          "application/json"
        ];
        if (content?.schema) {
          bodySchema = oasSchemaToTsType(content.schema);
        }
      }

      // Success response
      let responseSchema: string | null = null;
      let isArrayResponse = false;
      const successResponse =
        operation.responses?.["200"] ??
        operation.responses?.["201"] ??
        operation.responses?.["204"] ??
        operation.responses?.["default"];

      if (successResponse && !("$ref" in successResponse)) {
        const content = (successResponse as OpenAPIV3.ResponseObject).content?.[
          "application/json"
        ];
        if (content?.schema) {
          const schema = content.schema;
          if (
            !("$ref" in schema) &&
            (schema as OpenAPIV3.SchemaObject).type === "array"
          ) {
            isArrayResponse = true;
            const arraySchema = schema as OpenAPIV3.ArraySchemaObject;
            responseSchema = arraySchema.items ? oasSchemaToTsType(arraySchema.items) : "unknown";
          } else {
            responseSchema = oasSchemaToTsType(schema);
          }
        }
      }

      // Error codes
      const errorCodes = extractErrorCodes(operation);

      // Versioning metadata (inactive)
      const apiVersion: string | undefined = ext["x-api-version"];
      const versionLifecycle: OperationIR["versionLifecycle"] =
        ext["x-sdk-version-lifecycle"];

      const operationId =
        operation.operationId ??
        `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+|_+$/g, "")}`;

      operations.push({
        operationId,
        sdkTag,
        httpMethod: method.toUpperCase() as OperationIR["httpMethod"],
        path,
        pathParams,
        queryParams,
        bodySchema,
        responseSchema,
        isArrayResponse,
        errorCodes,
        apiVersion,
        versionLifecycle,
      });
    }
  }

  return operations;
}

export function groupOperationsByTag(operations: OperationIR[]): SdkGroupIR[] {
  const groups = new Map<string, OperationIR[]>();

  for (const op of operations) {
    const existing = groups.get(op.sdkTag);
    if (existing) {
      existing.push(op);
    } else {
      groups.set(op.sdkTag, [op]);
    }
  }

  return [...groups.entries()].map(([tag, ops]) => ({
    tag,
    className: pascalCase(tag),
    operations: ops,
  }));
}
