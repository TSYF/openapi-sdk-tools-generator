import { describe, expect, it } from "vitest";
import type { SdkGroupIR } from "../src/extraction/types";
import { generateSdkBase } from "../src/generation/sdk-base";
import { generateSdkFile } from "../src/generation/sdk-file";

const ticketGroup: SdkGroupIR = {
  tag: "ticket",
  className: "Ticket",
  operations: [
    {
      operationId: "getAll",
      sdkTag: "ticket",
      httpMethod: "GET",
      path: "/tickets",
      pathParams: [],
      queryParams: [],
      bodySchema: null,
      responseSchema: "Ticket",
      isArrayResponse: true,
      errorCodes: ["NOT_FOUND"],
    },
  ],
};

describe("generateSdkBase", () => {
  const output = generateSdkBase();

  it("exposes plugin injection through ClientOptions", () => {
    expect(output).toContain("plugins?: SdkPlugin[]");
    expect(output).toContain("this._kernel = new SdkKernel(options.plugins)");
  });

  it("uses promise-based transport with kernel-wrapped results", () => {
    expect(output).toContain("): Promise<T> {");
    expect(output).toContain("this._kernel.result.fromPromise(");
    expect(output).toContain("mapError(this._kernel.errorDecoder");
  });

  it("has no direct neverthrow dependency", () => {
    expect(output).not.toContain("from 'neverthrow'");
  });
});

describe("generateSdkFile", () => {
  const output = generateSdkFile(ticketGroup, new Set(["Ticket"]));

  it("returns promises directly from promise clients", () => {
    expect(output).toContain(
      "return this.request<Ticket[]>('GET', '/tickets', { headers });",
    );
    expect(output).not.toContain(".match(");
  });

  it("still returns SdkResultAsync from typed clients", () => {
    expect(output).toContain(
      "getAll(headers?: Record<string, string>): SdkResultAsync<Ticket[], TicketGetAllErrors>",
    );
    expect(output).toContain("this.typedRequest<Ticket[], TicketGetAllErrors>(");
  });
});
