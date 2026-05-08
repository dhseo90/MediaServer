#!/usr/bin/env node
// 파일 용도: 제거된 초기 브라우저 WebRTC harness entrypoint의 호환 stub.
// 동작 요약: 현재 제품 UI 기준에서는 verify-ops-client-ui / verify-rule-ui를 사용하도록 명확히 안내한다.

console.error("[browser-check] removed: 초기 WebRTC 테스트 페이지 기반 브라우저 harness는 제품 UI에서 제거되었습니다.");
console.error("[browser-check] use: ./server.sh verify-ops-client-ui, ./server.sh verify-rule-ui, ./server.sh verify-ops-rules-roundtrip");
process.exit(1);
