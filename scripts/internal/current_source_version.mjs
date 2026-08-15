// 파일 용도: current-source fixture/qualifier가 패치 버전 숫자를 고정하지 않고 VERSION만 따른다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CURRENT_SOURCE_VERSION_TOKEN = "current";

export function currentRepositoryVersion() {
  return fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..", "VERSION"),
    "utf8",
  ).trim();
}

export function isCurrentSourceVersionToken(value) {
  return String(value || "") === CURRENT_SOURCE_VERSION_TOKEN;
}

export function resolveCurrentSourceVersion(value) {
  return isCurrentSourceVersionToken(value) ? currentRepositoryVersion() : String(value || "");
}
