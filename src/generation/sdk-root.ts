import type { SdkGroupIR } from "../extraction/types";
import {
  tagToClientClassName,
  tagToResultClientClassName,
  tagToFileName,
} from "../utils";

/**
 * Generates the root aggregator classes:
 *
 *   export class MyApiClient {
 *     public readonly users: UsersClient;
 *     constructor(options: ClientOptions) {
 *       this.users = new UsersClient(options);
 *     }
 *   }
 *
 *   export class MyApiResultClient { ... }
 *
 * The root client is the primary DX entry point.
 * Consumers instantiate it directly or inject it via NestSdkModule.
 */
export function generateSdkRoot(groups: SdkGroupIR[], clientName: string): string {
  const lines: string[] = [];

  lines.push(`import { type ClientOptions } from './base';`);

  for (const group of groups) {
    const promiseName = tagToClientClassName(group.className);
    const resultName = tagToResultClientClassName(group.className);
    const fileName = tagToFileName(group.tag).replace(".ts", "");
    lines.push(
      `import { ${promiseName}, ${resultName} } from './${fileName}';`,
    );
  }

  lines.push("");
  lines.push(`export type { ClientOptions } from './base';`);
  lines.push("");

  // ── Promise root client
  lines.push(`export class ${clientName} {`);
  for (const group of groups) {
    lines.push(
      `  public readonly ${camelTag(group.tag)}: ${tagToClientClassName(group.className)};`,
    );
  }
  lines.push("");
  lines.push(`  constructor(options: ClientOptions) {`);
  for (const group of groups) {
    lines.push(
      `    this.${camelTag(group.tag)} = new ${tagToClientClassName(group.className)}(options);`,
    );
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push("");

  // ── ResultAsync root client
  lines.push(`export class ${clientName}Result {`);
  for (const group of groups) {
    lines.push(
      `  public readonly ${camelTag(group.tag)}: ${tagToResultClientClassName(group.className)};`,
    );
  }
  lines.push("");
  lines.push(`  constructor(options: ClientOptions) {`);
  for (const group of groups) {
    lines.push(
      `    this.${camelTag(group.tag)} = new ${tagToResultClientClassName(group.className)}(options);`,
    );
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push("");

  return lines.join("\n");
}

/** 'UserManagement' → 'userManagement' */
function camelTag(tag: string): string {
  const pascal = tag.replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase());
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
