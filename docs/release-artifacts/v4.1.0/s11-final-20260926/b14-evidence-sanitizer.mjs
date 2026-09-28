// 파일 용도: B14 공개 증거의 경로만 정제하고 원본 판정과 수치를 보존한다.
import {createHash} from "node:crypto";
import path from "node:path";

const HOME_PATH = /\/(?:Users|home)\/[^/\s"'\\]+\//gu;
const ESCAPED_HOME_PATH = /\\\/(?:Users|home)\\\/[^/\s"'\\]+\\\//gu;
const TEMP_PATH = /\/private\/var\/folders\//u;
const TERMINAL_HOME = /\/(?:Users|home)\/[^/\s"'\\`]+(?=["'\\`\s]|$)/gu;
const TERMINAL_TEMP_ROOT = /\/private\/var\/folders\/[^/\s"'\\]+\/[^/\s"'\\]+\/(?:T|C)(?=[\s"'`]|$)/gu;
const ESCAPED_TEMP_PATH = /\\\/private\\\/var\\\/folders\\\//u;
const PLAIN_TEMP_ROOT = /\/private\/var\/folders\/[^/\s"'\\]+\/[^/\s"'\\]+\/(?:T|C)\//gu;
const ESCAPED_TEMP_ROOT = /\\\/private\\\/var\\\/folders\\\/[^/\s"'\\]+\\\/[^/\s"'\\]+\\\/(?:T|C)\\\//gu;

function fixedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function policyHasSecret(text, policy) {
  const patterns = policy?.secretPatterns ?? [];
  if (!Array.isArray(patterns)) {
    throw fixedError("B14_INVALID_POLICY");
  }

  const compiled = patterns.map((item) => {
    if (item && typeof item === "object" && !(item instanceof RegExp)) {
      if (typeof item.id !== "string" || item.id.trim().length === 0 ||
          typeof item.pattern !== "string" || item.pattern.length === 0) {
        throw fixedError("B14_INVALID_POLICY");
      }
      try {
        return new RegExp(item.pattern, "m");
      } catch {
        throw fixedError("B14_INVALID_POLICY");
      }
    }
    if (item instanceof RegExp) {
      return item;
    }
    if (typeof item === "string" && item.length > 0) return item;
    throw fixedError("B14_INVALID_POLICY");
  });

  return compiled.some((pattern) => {
    if (pattern instanceof RegExp) {
      pattern.lastIndex = 0;
      const found = pattern.test(text);
      pattern.lastIndex = 0;
      return found;
    }
    return text.includes(pattern);
  });
}

export function findDeniedContent(text, policy = {}) {
  if (typeof text !== "string") {
    throw fixedError("B14_INVALID_TRANSCRIPT");
  }

  const denied = [];
  HOME_PATH.lastIndex = 0;
  ESCAPED_HOME_PATH.lastIndex = 0;
  if (HOME_PATH.test(text) || ESCAPED_HOME_PATH.test(text)) {
    denied.push("B14_DENIED_HOME_PATH");
  }
  if (TEMP_PATH.test(text) || ESCAPED_TEMP_PATH.test(text)) {
    denied.push("B14_DENIED_TEMP_PATH");
  }
  if (policyHasSecret(text, policy)) {
    denied.push("B14_DENIED_SECRET_PATTERN");
  }
  return denied;
}

export function sanitizeTranscript(text, policy = {}) {
  if (typeof text !== "string") {
    throw fixedError("B14_INVALID_TRANSCRIPT");
  }
  if (policyHasSecret(text, policy)) {
    throw fixedError("B14_SECRET_DETECTED");
  }

  const counts = {home: 0, temp: 0};
  let sanitized = text.replace(HOME_PATH, () => {
    counts.home += 1;
    return "<home>/";
  });
  sanitized = sanitized.replace(ESCAPED_HOME_PATH, () => {
    counts.home += 1;
    return "<home>/";
  });
  sanitized = sanitized.replace(TERMINAL_HOME, () => {
    counts.home += 1;
    return "<home>";
  });
  sanitized = sanitized.replace(PLAIN_TEMP_ROOT, () => {
    counts.temp += 1;
    return "<owned-temp>/";
  });
  sanitized = sanitized.replace(ESCAPED_TEMP_ROOT, () => {
    counts.temp += 1;
    return "<owned-temp>/";
  });

  sanitized = sanitized.replace(TERMINAL_TEMP_ROOT, () => {
    counts.temp += 1;
    return "<owned-temp>";
  });
  if (findDeniedContent(sanitized, policy).length > 0) {
    throw fixedError("B14_SANITIZATION_INCOMPLETE");
  }
  return {text: sanitized, counts};
}

export function publicTranscriptPath(relativeSource) {
  const prefix = "docs/release-artifacts/v4.1.0/";
  const invalid = typeof relativeSource !== "string" ||
    relativeSource.length === 0 ||
    /[\0\r\n]/u.test(relativeSource) ||
    relativeSource.includes("\\") ||
    relativeSource.includes("//") ||
    path.posix.isAbsolute(relativeSource) ||
    !relativeSource.startsWith(prefix) ||
    !/\.(?:log|txt|gz)$/u.test(relativeSource) ||
    relativeSource.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
  if (invalid) {
    throw fixedError("B14_INVALID_SOURCE_PATH");
  }

  const digest = createHash("sha256").update(relativeSource, "utf8").digest("hex").slice(0, 16);
  return path.posix.join(path.posix.dirname(relativeSource), `public-evidence-${digest}.txt`);
}
