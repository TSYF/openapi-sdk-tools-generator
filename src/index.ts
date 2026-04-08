import * as fs from "fs";
import * as path from "path";
import { loadSpec } from "./spec/loader";
import { resolveRefs } from "./spec/resolver";
import { extractAll } from "./extraction";
import {
  generateInterfaceFiles,
  generateEnumFile,
  generateErrorsFile,
  generateSdkBase,
  generateSdkFile,
  generateSdkRoot,
  generateSdkBarrel,
} from "./generation";
import { ensureDir, clearDir, tagToFileName } from "./utils";
import type { GeneratorConfig } from "./config";

export async function generate(config: GeneratorConfig): Promise<void> {
  const { specPath, outputDir, clientName, specHeaders } = config;

  // ── Phase 1: Load + resolve spec
  console.log(`Loading spec: ${specPath}`);
  const rawDoc = await loadSpec(specPath, specHeaders);
  const doc = await resolveRefs(rawDoc);

  // ── Phase 2: Extract IR
  const { schemas, enums, sdkGroups } = extractAll(doc);

  const schemaNames = new Set(schemas.map((s) => s.name));
  const enumNames = new Set(enums.map((e) => e.name));

  if (sdkGroups.length === 0) {
    console.warn("Warning: no operations found in spec. Output will be empty.");
  }

  // ── Phase 3: Write output
  const srcDir = path.join(outputDir, "src");
  const enumsDir = path.join(srcDir, "enums");
  const interfacesDir = path.join(srcDir, "interfaces");
  const sdkDir = path.join(srcDir, "sdk");

  clearDir(outputDir);
  ensureDir(enumsDir);
  ensureDir(interfacesDir);
  ensureDir(sdkDir);

  // Enums
  const enumBarrelExports: string[] = [];
  for (const enumSchema of enums) {
    const { fileName, content } = generateEnumFile(enumSchema);
    fs.writeFileSync(path.join(enumsDir, fileName), content, "utf-8");
    enumBarrelExports.push(
      `export * from './${fileName.replace(".ts", "")}';`,
    );
  }
  fs.writeFileSync(
    path.join(enumsDir, "index.ts"),
    enumBarrelExports.join("\n") + "\n",
    "utf-8",
  );

  // Interfaces
  const nonEnumSchemas = schemas.filter((s) => s.kind !== "enum");
  const interfaceFiles = generateInterfaceFiles(nonEnumSchemas, enumNames);
  const ifaceBarrelExports: string[] = [];
  for (const { fileName, content } of interfaceFiles) {
    fs.writeFileSync(path.join(interfacesDir, fileName), content, "utf-8");
    ifaceBarrelExports.push(
      `export * from './${fileName.replace(".ts", "")}';`,
    );
  }
  fs.writeFileSync(
    path.join(interfacesDir, "index.ts"),
    ifaceBarrelExports.join("\n") + "\n",
    "utf-8",
  );

  // SDK: base
  fs.writeFileSync(
    path.join(sdkDir, "base.ts"),
    generateSdkBase(),
    "utf-8",
  );

  // SDK: errors
  fs.writeFileSync(
    path.join(sdkDir, "errors.ts"),
    generateErrorsFile(sdkGroups),
    "utf-8",
  );

  // SDK: per-tag sub-clients
  for (const group of sdkGroups) {
    const fileName = tagToFileName(group.tag);
    fs.writeFileSync(
      path.join(sdkDir, fileName),
      generateSdkFile(group, schemaNames),
      "utf-8",
    );
  }

  // SDK: root aggregators
  fs.writeFileSync(
    path.join(sdkDir, "root.ts"),
    generateSdkRoot(sdkGroups, clientName),
    "utf-8",
  );

  // SDK: barrel
  fs.writeFileSync(
    path.join(sdkDir, "index.ts"),
    generateSdkBarrel(sdkGroups, clientName),
    "utf-8",
  );

  // Top-level src/index.ts
  const topBarrel = [
    `export * from './enums';`,
    `export * from './interfaces';`,
    `export * from './sdk';`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(srcDir, "index.ts"), topBarrel, "utf-8");

  // package.json + tsconfig for generated SDK
  writeGeneratedPackageJson(outputDir, clientName);
  writeGeneratedTsConfig(outputDir);

  console.log(`Generated SDK written to ${outputDir}`);
  console.log(
    `  Tags: ${sdkGroups.map((g) => g.tag).join(", ")}`,
  );
  console.log(
    `  Schemas: ${schemas.length} interfaces/types, ${enums.length} enums`,
  );
}

function writeGeneratedPackageJson(outputDir: string, clientName: string) {
  const pkg = {
    name: clientName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    version: "0.0.1",
    private: true,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      build: "tsc -p tsconfig.json",
    },
    dependencies: {
      "@openapi-sdk-tools/core": "*",
      neverthrow: "^8.0.0",
    },
    devDependencies: {
      typescript: "^5.5.4",
    },
  };
  fs.writeFileSync(
    path.join(outputDir, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
    "utf-8",
  );
}

function writeGeneratedTsConfig(outputDir: string) {
  const tsconfig = {
    compilerOptions: {
      module: "CommonJS",
      target: "ES2021",
      declaration: true,
      outDir: "dist",
      rootDir: "src",
      strict: false,
      skipLibCheck: true,
      esModuleInterop: true,
    },
    include: ["src/**/*.ts"],
    exclude: ["dist"],
  };
  fs.writeFileSync(
    path.join(outputDir, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2) + "\n",
    "utf-8",
  );
}

export { GeneratorConfig };
