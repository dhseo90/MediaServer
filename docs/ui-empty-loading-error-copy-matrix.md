# UI Empty/Loading/Error Copy Matrix

schema: `media-server.ui-copy-matrix.v1`
updated: 2026-05-16

이 문서는 v1.2.0 UI visual regression 후속에서 Ops/Client 제품 화면의 빈 상태, 로딩 상태, 오류 상태 문구를 고정합니다. 문구는 운영자가 다음 행동을 알 수 있게 쓰되, viewer/client 화면에는 source URL, raw JSON, debug counter, Developer URL을 노출하지 않습니다.

## 원칙

| 상태 | 기준 문구 | 사용 기준 |
| --- | --- | --- |
| Loading | `불러오는 중` / `현장 상태 불러오는 중` | 네트워크 요청이 진행 중이고 사용자가 아직 조치할 수 없을 때 |
| Empty | `없습니다` / `미제공` | 정상 응답이지만 표시할 항목이 없거나 값이 수집되지 않았을 때 |
| Error | `불러오지 못했습니다` / `오류` | 요청 실패, 권한 실패, 설정 오류처럼 사용자가 재시도 또는 관리자 확인이 필요한 때 |

## Matrix

| 화면 | Empty | Loading | Error | CTA / 다음 행동 |
| --- | --- | --- | --- | --- |
| `/client/live` | `Live view가 없습니다`, `할당된 PublishedView가 없습니다` | tile 상태 `연결 중` | tile chip `오류`, detail `상태를 불러오지 못했습니다` | viewer는 `/client/request-access`, admin preview는 `/ops/sources` |
| `/client/dashboard` | `비교할 채널이 없습니다`, `필터에 맞는 채널이 없습니다`, `최근 이벤트 없음` | `현장 상태 불러오는 중` | `상태를 불러오지 못했습니다` | 필터 변경 또는 접근 요청 |
| `/client/events` | `이벤트 채널이 없습니다`, `최근 이벤트 없음` | `현장 상태 불러오는 중` | `상태를 불러오지 못했습니다` | 채널 선택 또는 접근 요청 |
| `/ops/dashboard` | `최근 인시던트 없음`, `활성 시나리오 인스턴스가 없습니다.`, `트래킹 이슈 없음` | `런타임 상태를 불러오는 중입니다.` | `VA 런타임 디버그를 불러오지 못했습니다.` | 관련 화면 이동 또는 root-cause action |
| `/ops/rules` | `저장된 채널 분석 설정이 없습니다.`, `저장 전 차단 항목이 없습니다.` | `불러오는 중` | `룰 편집기 로드 실패`, `저장 전 검증 실패` | prerequisite 생성 또는 validation 수정 |
| `/ops/events` | `조회된 이벤트 기록이 없습니다.` | `불러오는 중` | `조회 실패`, `bundle token 발급 실패` | 필터 변경 또는 evidence 설정 확인 |
| Ops audit panels | `아직 기록된 변경 이력이 없습니다.` | `불러오는 중` | `서버 감사 로그를 불러오지 못했습니다.` | 필터 변경 또는 서버 audit 확인 |

## 검증

- 정적 검증: `./server.sh verify-ui-copy-matrix`
- 언어 parity: `./server.sh verify-ui-copy-i18n-parity`
- Client Live tile 숨김 접근성 문구 snapshot: `test/fixtures/client_live_tile_a11y_i18n_snapshot.json`
- UI smoke: `./server.sh verify-ops-client-ui`
- 시각 회귀: `./server.sh verify-ops-client-ui --screenshots`
- 문서 링크: `./server.sh verify-docs-links`
