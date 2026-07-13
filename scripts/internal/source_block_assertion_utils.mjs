// 파일 용도: 정적 UI verifier가 제품 source 전체가 아니라 지정 renderer/function block만 검사하도록 범위를 고정한다.

export function extractNamedFunctionBlock(source, functionName) {
  const lines = String(source || "").split(/\r?\n/);
  const escaped = escapeRegExp(functionName);
  const declaration = new RegExp(`^(\\s*)(?:(?:async\\s+)?function\\s+${escaped}\\s*\\(|(?:const|let|var)\\s+${escaped}\\s*=)`);
  let start = -1;
  let indentation = "";
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(declaration);
    if (!match) continue;
    start = index;
    indentation = match[1];
    break;
  }
  if (start < 0) throw new Error(`named function block missing: ${functionName}`);

  const nextDeclaration = new RegExp(
    `^${escapeRegExp(indentation)}(?:(?:async\\s+)?function\\s+[A-Za-z_$][A-Za-z0-9_$]*\\s*\\(|(?:const|let|var)\\s+[A-Za-z_$][A-Za-z0-9_$]*\\s*=)`,
  );
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!nextDeclaration.test(lines[index])) continue;
    end = index;
    break;
  }
  return lines.slice(start, end).join("\n");
}

export function extractCppFunctionBlock(source, signature) {
  const text = String(source || "");
  const start = text.indexOf(signature);
  if (start < 0) throw new Error(`C++ function signature missing: ${signature}`);
  const open = text.indexOf("{", start + signature.length);
  if (open < 0) throw new Error(`C++ function body missing: ${signature}`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < text.length; index += 1) {
    const current = text[index];
    const next = text[index + 1] || "";
    if (lineComment) {
      if (current === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === quote) quote = "";
      continue;
    }
    if (current === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }
    if (current === "{") depth += 1;
    else if (current === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated C++ function body: ${signature}`);
}

export function assertExactFalseFlag(functionBlock, flag) {
  if (exactBooleanFlagValue(functionBlock, flag) !== false) {
    throw new Error(`exact function block false flag missing: ${flag}`);
  }
}

export function exactBooleanFlagValue(functionBlock, flag) {
  const text = String(functionBlock || "");
  const index = text.indexOf(String(flag || ""));
  if (index < 0) throw new Error(`exact function block flag missing: ${flag}`);
  const match = text.slice(index, index + String(flag || "").length + 96).match(/\b(true|false)\b/);
  if (!match) throw new Error(`exact function block boolean value missing: ${flag}`);
  return match[1] === "true";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
