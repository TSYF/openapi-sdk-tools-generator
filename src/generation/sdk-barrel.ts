import type { SdkGroupIR } from "../extraction/types";
import {
  tagToClientClassName,
  tagToResultClientClassName,
  tagToFileName,
} from "../utils";

export function generateSdkBarrel(
  groups: SdkGroupIR[],
  clientName: string,
): string {
  const lines: string[] = [];

  lines.push(`export * from './errors';`);
  lines.push(`export { ${clientName}, ${clientName}Result, type ClientOptions } from './root';`);
  lines.push(`export { SdkResultAsync } from './base';`);

  for (const group of groups) {
    const promiseName = tagToClientClassName(group.className);
    const resultName = tagToResultClientClassName(group.className);
    const fileName = tagToFileName(group.tag).replace(".ts", "");
    lines.push(
      `export { ${promiseName}, ${resultName} } from './${fileName}';`,
    );
  }

  lines.push("");
  return lines.join("\n");
}
