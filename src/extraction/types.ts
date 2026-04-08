// ─── Intermediate Representation (IR) ────────────────────────────────────────
// Fully decoupled from OpenAPI spec structure.
// Generation phase works exclusively with these types.

export interface ParamIR {
  name: string;
  typeName: string; // TypeScript type string
  required: boolean;
}

export interface PropertyIR {
  name: string;
  typeName: string; // TypeScript type string
  optional: boolean;
}

export interface SchemaIR {
  name: string;
  kind: "interface" | "enum" | "alias";
  properties?: PropertyIR[]; // kind === 'interface'
  enumValues?: (string | number)[]; // kind === 'enum'
  aliasType?: string; // kind === 'alias'
}

export interface OperationIR {
  operationId: string;
  sdkTag: string;
  httpMethod: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string; // OAS format: /users/{id}
  pathParams: ParamIR[];
  queryParams: ParamIR[];
  bodySchema: string | null; // TypeScript type (may be a schema name or inline)
  responseSchema: string | null; // TypeScript type for success response
  isArrayResponse: boolean;
  errorCodes: string[];
  // Versioning hooks (inactive — wired in for future use)
  apiVersion?: string;
  versionLifecycle?: "stable" | "deprecated" | "sunset";
}

export interface SdkGroupIR {
  tag: string;
  className: string; // PascalCase tag, e.g. 'Users'
  operations: OperationIR[];
}
