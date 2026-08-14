// 파일 용도: 대형 generated JSON artifact의 의미를 유지한 compact 직렬화를 제공한다.

export function serializeCompactJsonArtifact(value) {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string") {
    throw new Error("JSON artifact root must be serializable");
  }
  return `${serialized}\n`;
}
