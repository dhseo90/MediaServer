// 파일 용도: 검증 스크립트에서 임시 numeric id를 안전하게 선택한다.

export function assertNumericId(value, label = "id") {
  const text = String(value ?? "");
  if (!/^[0-9]+$/.test(text)) {
    throw new Error(`${label} must be numeric: ${text}`);
  }
  return text;
}

export function nextNumericIds(usedIds, options = {}) {
  const count = Number(options.count || 1);
  const start = Number(options.start || 9801);
  const end = Number(options.end || 9999);
  const label = options.label || "temporary id";
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`${label}: count must be a positive integer`);
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
    throw new Error(`${label}: invalid numeric id range`);
  }
  const used = new Set(Array.from(usedIds || []).map((value) => String(value)));
  const ids = [];
  for (let candidate = start; candidate <= end && ids.length < count; candidate += 1) {
    const text = String(candidate);
    if (!used.has(text)) ids.push(text);
  }
  if (ids.length < count) {
    throw new Error(`${label}: not enough temporary numeric ids available`);
  }
  return ids.map((id) => assertNumericId(id, label));
}
