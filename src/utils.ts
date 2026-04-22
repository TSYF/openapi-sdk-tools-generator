import * as fs from "fs";

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function clearDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  ensureDir(dir);
}

export function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function pascalCase(input: string): string {
  return input
    .replace(/(^|_|-|\s)+(.)/g, (_m, _p1, p2) => p2.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, "");
}

/**
 * Convert a SCREAMING_SNAKE_CASE custom tag to a PascalCase interface name.
 * e.g. 'DATABASE_UNAVAILABLE' → 'DatabaseUnavailableError'
 */
export function customTagToInterfaceName(tag: string): string {
  const pascal = tag
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return pascal + "Error";
}

/** e.g. 'Users' → 'UsersClient' */
export function tagToClientClassName(tag: string): string {
  return pascalCase(tag) + "Client";
}

/** e.g. 'Users' → 'UsersResultClient' */
export function tagToResultClientClassName(tag: string): string {
  return pascalCase(tag) + "ResultClient";
}

/** e.g. 'Users' → 'users.ts' */
export function tagToFileName(tag: string): string {
  return toKebab(tag) + ".ts";
}
