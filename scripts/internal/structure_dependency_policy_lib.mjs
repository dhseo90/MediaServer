// 파일 용도: 현행 구조 소비자가 공유하는 exact 소유·파일 연결 판정. 정책을 생성하거나 확장하지 않는다.
export function fileDependencyAllowed(policyValue, source, target, from, to) {
  return (policyValue.allowedDependencyDirections || []).includes(`${from} -> ${to}`) ||
    (policyValue.allowedFileDependencies || []).some(item => item.source === source && item.target === target &&
      item.from === from && item.to === to);
}

export function validateFileDependencyPolicy(policyValue, ownership) {
  const errors = [], seen = new Set();
  const owners = new Set(policyValue.ownerIds || []);
  const byFile = new Map(ownership.map(item => [item.file, item.owner]));
  const exactPath = value => typeof value === "string" && /^(include|src)\/[a-zA-Z0-9_./-]+\.(h|cpp)$/.test(value) &&
    !value.split('/').some(part => part === '.' || part === '..' || part === '');
  for (const item of policyValue.allowedFileDependencies || []) {
    const key = `${item.source} -> ${item.target}`;
    if (!exactPath(item.source) || !exactPath(item.target) || !owners.has(item.from) || !owners.has(item.to) ||
        item.from === item.to || typeof item.reason !== "string" || !item.reason.trim()) errors.push(`policy:invalid-file-dependency:${key}`);
    if (seen.has(key)) errors.push(`policy:duplicate-file-dependency:${key}`);
    seen.add(key);
    if (byFile.get(item.source) !== item.from || byFile.get(item.target) !== item.to) errors.push(`policy:file-owner-mismatch:${key}`);
  }
  return errors;
}

export function classifyModule(file, classifiers) {
  const exact = classifiers.flatMap(item => (item.exactFiles || []).filter(value => value === file).map(() => item));
  if (exact.length > 1) throw new Error(`ambiguous exact production owner: ${file}`);
  const matches = classifiers.filter(item => (item.exactFiles || []).includes(file) ||
    (item.prefixes || []).some(prefix => file.startsWith(prefix)));
  if (!matches.length) throw new Error(`unclassified production file: ${file}`);
  // 기존 exact-before-fallback 순서를 보존하고 이를 가리는 prefix/중복 소유는 거부한다.
  if (exact.length ? matches[0] !== exact[0] : matches.length > 1)
    throw new Error(`ambiguous production owner: ${file}`);
  return matches[0].id;
}
