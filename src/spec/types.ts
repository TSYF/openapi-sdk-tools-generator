import type { OpenAPIV3 } from "openapi-types";

export type OasDocument = OpenAPIV3.Document;
export type OasPathItem = OpenAPIV3.PathItemObject;
export type OasOperation = OpenAPIV3.OperationObject;
export type OasSchema = OpenAPIV3.SchemaObject;
export type OasParameter = OpenAPIV3.ParameterObject;
export type OasResponse = OpenAPIV3.ResponseObject;
export type OasReferenceObject = OpenAPIV3.ReferenceObject;
export type OasSchemaOrRef = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
