# 3D-3 C 녹화 화면 소비 결과

독자는 이번 구현·검토 담당자다. 이번 실행의 보존 증적이며 현재 정책은 AGENTS,
중앙 기록은 release-test-records, 실행 전 정의는 [C-definition](C-definition.md)이다.
메인이 화면 소비를 직접 구현·검토했다. 실제 브라우저 검증은 사용자 제외다.

## 결과와 경계

`node scripts/internal/recording_playback_status.test.mjs` 최종 **29 PASS/0 FAIL**, exit0.
기존 재생 상태 7개와 추가 소비 22개를 실제 제품 스크립트 VM 실행으로 검사했다.
실제 DOM 렌더링·영상 디코딩·반응형 시각 품질·브라우저 console·서버 HTTP 확인은 이 검사 범위가 아니다.
동일 제품 스크립트와 격리 응답/DOM double의 handler 결과만 증명한다. D08 또는 UI 풀테스트 PASS가 아니다.

- `product_ui_page_scripts.cpp`: 문자열 UTC/유효0/unknown/날짜 범위 구분, 독립 itemId 선택,
  unplaced 목록·독립 수량 pagination, 서버 hideByEvent 소비, 부분 중첩 안내, 요청 축·작업·구간·등록 상태 분리.
- `product_ui_server_pages.cpp`: 시간 귀속 미확인 전용 상태와 목록 host. primary nav 등 다른 흐름은 변경 없음.
- `product_ui_css.cpp`: 기존 chip의 긴 구간 안내 줄바꿈만 보완. 시각 검증 미실행.
- 파일 시작 재생을 안내하며 UTC/PTS 기반 seek·자동 다음 파일·새 decoder는 추가하지 않았다.
  canPlayType 및 metadata 이벤트는 재생 성공으로 표시하지 않는다.
- source URL/path/raw JSON은 열거하지 않고 허용된 DTO 필드만 textContent로 표시한다.

## 실행·실패 보존

| 실행 | 실제 명령 | exit/결과 | 원출력 | 의미 |
| --- | --- | --- | --- | --- |
| 최초 RED | 위 Node 명령 | 1;10 PASS/19 FAIL;21ms | [C-ExpectedRed.log](C-ExpectedRed.log) | 신규 DTO 소비 미구현의 사전 특정 assertion. 기존7개는 PASS |
| 첫 GREEN | 동일 | 0;29 PASS/0 FAIL;16ms | [C-FirstGreen.log](C-FirstGreen.log) | 첫 구현 확인 |
| 중첩 안내 RED | 동일 | 1;28 PASS/1 FAIL;18ms | [C-OverlapRed.log](C-OverlapRed.log) | C05에 확인된 원본 ns 중첩 안내 assertion을 실행 전 추가. 안내 미구현만 실패 |
| 최종 focused | 동일 | 0;29 PASS/0 FAIL;16ms | [C-FinalFocused.log](C-FinalFocused.log) | 중첩 안내 보완 후 전수 통과 |
| diffcheck | `git diff --check` | 0;출력 없음 | 본 기록 | 당시 tracked 변경 whitespace 검사. 최종 stage 후 전체 검사는 별도 |

4회 각29개인116개 원출력 행을 보존한다. 최종29행은 [C-results](C-results.md)와 대조했다.
최초 RED 뒤 스크립트 구현, C05 추가 RED 뒤 정확한 구간 안내 구현 외 합격 기준 완화는 없다.

## 실행 환경·정리

- fingerprint 확인 UTC: `2026-09-13T09:48:52Z`; Darwin arm64, Node `v24.13.0`.
- [C-fingerprints.log](C-fingerprints.log): 최종 제품 script/markup/CSS/test의 SHA-256.
- token start/end/consumed: 미집계(실행별 토큰 계측 도구 없음). elapsed: 각 Node summary.
  source: 최종 fingerprint 및 원출력. 중간 실행 source는 해당 RED/수정 이력으로 구분한다.
- 서버·포트·계정·비밀번호·외부 서비스·브라우저는 사용하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 임시 파일/프로세스 없음 | 메모리 fixture | 0 | Node 프로세스 종료 | 네 실행 종료·tempArtifacts0 | 각 원출력 summary |
| 이 폴더 C 정의/결과/로그/fingerprint | 소형 텍스트 증적 | 최종 이관 집계에 포함 | 보존 | 최초 실패·실제 결과·재현 근거 유지 | AGENTS7.6.1/7.8 |

제품 전체 build·HTTP 권한/전송 회귀 및 문서 gate는 D에서 통합 확인한다. C 단독 커밋/푸시는 미수행이다.
