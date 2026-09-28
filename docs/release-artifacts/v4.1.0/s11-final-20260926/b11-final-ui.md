# B11 최종 녹화 UI 31 action 재검증

독자: v4.1.0 검증·릴리즈 담당자. 수명: S11 최종 증거 보존. 정책은 `AGENTS.md`,
개별 정의는 `docs/manual-ui-result-template.md`와 중앙 테스트 기록을 따른다.

## 최종 판정

고정된 B11 backend에서 실제 native Chrome으로 I27~I34의 8개 ID·31개 action을
모두 실행했다. runner 결과는 31 pass·0 fail·0 notRun이며, 메인이 재생·탐색과
320/390/760/1180 light/dark 화면 및 viewer redaction을 직접 대조했다. 공통 UI
424개 기존 적격과 결합해 현행 UI 대상 432개는 적격이다. runner의
`uiFulltestPass=false`는 자동 자기승격 금지 표식이며 메인 hybrid 판정과 구분한다.
이 결과는 녹화 전용 120분·자원 판정을 대신하지 않는다.

- 명령: `node scripts/internal/run_recording_ui_acceptance.mjs --all --output-dir <소유 임시 경로>`
- source commit: `0c14c3405d87fb4cf3cf3b327ef1f4fe4ef1a783`
- 제품 SHA-256: `8637eb2f73772d373d09fe3c97b7b50628a8605fbdd0f25f14c99e2eb77ef46e`
- Playwright 1.62.1 / Chrome 152.0.7977.83 / `qualified-native-automation`
- exit0, verifier 78,565ms, browserClosed=true, manualIntervention=false
- 독립 seed: 146행, 시간 대응 115행, 미확정 31행, 2페이지
- console: 승인된 권한·오류 반례 10건, 미승인 0, warning/page error/crash 0
- artifact: 선언 95개, 경로·크기·SHA 불일치 0, 텍스트 54개 민감 패턴 0

## 개별 실행 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| V410-S06-I27 I27-filter | 정상 필터: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I27-filter.json`, `I27-filter.png` |
| V410-S06-I27 I27-empty | 빈값·빈 결과: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I27-empty.json`, `I27-empty.png` |
| V410-S06-I27 I27-inverted | 역전 시간: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I27-inverted.json`, `I27-inverted.png` |
| V410-S06-I27 I27-page | 페이지: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I27-page.json`, `I27-page.png` |
| V410-S06-I28 I28-event | 이벤트 우선: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I28-event.json`, `I28-event.png` |
| V410-S06-I29 I29-original | 원본 전환: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I29-original.json`, `I29-original.png` |
| V410-S06-I30 I30-play | 재생: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I30-play.json`, `I30-play.png` |
| V410-S06-I30 I30-pause | 정지: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I30-pause.json`, `I30-pause.png` |
| V410-S06-I30 I30-seek | 탐색: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I30-seek.json`, `I30-seek.png` |
| V410-S06-I31 I31-partial | partial: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I31-partial.json`, `I31-partial.png` |
| V410-S06-I31 I31-deleted | 삭제: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I31-deleted.json`, `I31-deleted.png` |
| V410-S06-I31 I31-corrupt | 손상: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I31-corrupt.json`, `I31-corrupt.png` |
| V410-S06-I31 I31-pending | 미완결 event: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I31-pending.json`, `I31-pending.png` |
| V410-S06-I31 I31-gap | 공백: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I31-gap.json`, `I31-gap.png` |
| V410-S06-I31 I31-error | 오류: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I31-error.json`, `I31-error.png` |
| V410-S06-I32 I32-quota | quota: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I32-quota.json`, `I32-quota.png` |
| V410-S06-I32 I32-active | 활성: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I32-active.json`, `I32-active.png` |
| V410-S06-I32 I32-blocked | blocked: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I32-blocked.json`, `I32-blocked.png` |
| V410-S06-I33 I33-navigation | navigation: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I33-navigation.json`, `I33-navigation.png` |
| V410-S06-I34 I34-admin | admin: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I34-admin.json`, `I34-admin.png` |
| V410-S06-I34 I34-operator | operator scope: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I34-operator.json`, `I34-operator.png` |
| V410-S06-I34 I34-viewer-unauth | viewer·미인증: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I34-viewer-unauth.json`, `I34-viewer-unauth.png` |
| V410-S06-I34 I34-redaction | redaction: 실제 control 조작과 응답·DOM·상태·시각 증거 대조 | pass | `I34-redaction.json`, `I34-redaction.png` |
| V410-S06-I34 I34-320-light | 320 light: control·영상 전체 영역 시각 대조 | pass | `I34-320-light.json`, PNG·geometry |
| V410-S06-I34 I34-320-dark | 320 dark: control·영상 전체 영역 시각 대조 | pass | `I34-320-dark.json`, PNG·geometry |
| V410-S06-I34 I34-390-light | 390 light: control·영상 전체 영역 시각 대조 | pass | `I34-390-light.json`, PNG·geometry |
| V410-S06-I34 I34-390-dark | 390 dark: control·영상 전체 영역 시각 대조 | pass | `I34-390-dark.json`, PNG·geometry |
| V410-S06-I34 I34-760-light | 760 light: control·영상 전체 영역 시각 대조 | pass | `I34-760-light.json`, PNG·geometry |
| V410-S06-I34 I34-760-dark | 760 dark: control·영상 전체 영역 시각 대조 | pass | `I34-760-dark.json`, PNG·geometry |
| V410-S06-I34 I34-1180-light | 1180 light: control·영상 전체 영역 시각 대조 | pass | `I34-1180-light.json`, PNG·geometry |
| V410-S06-I34 I34-1180-dark | 1180 dark: control·영상 전체 영역 시각 대조 | pass | `I34-1180-dark.json`, PNG·geometry |

## 메인 시각·미디어 교차 판정

| 항목 | 직접 관측 | 판정 |
| --- | --- | --- |
| 재생 | 10초·1280×720 MP4, readyState4, 0→0.665초·0→25프레임, error 없음 | pass |
| 일시정지 | 359ms 동안 0.785초·28프레임 유지 | pass |
| 탐색 | 0.785→2.785초, 28→265프레임, seeking/seeked와 동일 파일 HTTP206 Range | pass |
| 반응형·테마 | 320/390/760/1180 light/dark의 필터·날짜·조회·원본 checkbox·영상/control 전체 표시, 화면 밖 침범 없음 | pass |
| 권한·redaction | admin/operator/viewer/anonymous 경계와 403/404 결속, viewer 화면에 원본 URL·raw debug·비밀 없음 | pass |
| native 로딩 장식 | 일부 캡처에 브라우저 native spinner가 있으나 영상/control을 가리지 않음. 재생 PASS 근거로 사용하지 않음 | pass |

## 자체검증·보존·정리

`recording_ui_acceptance.test.mjs` 9/9, `recording_ui_driver_boundary.test.mjs` 6/6,
`verify_v410_recording_ui_auth_prep.test.mjs`의 auth/seed 경계를 통과했다. 마지막 검사의
파일 증거 profile/bound 오류 문구 5건은 실제 managed seed의 이후 oracle 7건 PASS와 정리 PASS를
막지 않은 기존 관측 메시지이며 이번 UI action 실패가 아니다.

[전체 증거 압축본](b11-final-ui-evidence.tar.xz)은 6,894,344바이트, SHA-256
`05c0693e514fc59b25c189fc53b4fe4676a767131910231a0908927f5b877e8d`다.
95개 선언 artifact를 archive stream에서 다시 꺼내 원본 SHA와 전수 대조했고 불일치 0,
XZ integrity PASS다. [실행 원출력](b11-final-ui.log.gz)은 1,450바이트, SHA-256
`690abbe00ff1af3c8369074c24d74a7cf2aeb7fd8fe00973ccce9356a20d16ad`다.
token start/end/consumed는 전용 집계가 없어 미집계다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 제품 격리 root `media-server-v410-s06-tbbJZ4` | 인증·녹화 fixture 444항목 | 17,386,436B | runner 정리 | 부재 | PID93479 exit0, RTSP58100·HTTP58101·UDP 닫힘 |
| acceptance root `media-server-recording-ui-acceptance-ogrit0` | 96파일·31결과·95 artifact | 약 9.2MiB | archive 전수 해시 대조 후 삭제 | 부재·archive 복구 가능 | 위 archive hash·95/95 대조 |
| `/private/tmp/media-server-s11-ui-log-w7ja8W` | 실행 원출력 1파일 | 3,296B | gzip 이관 후 삭제 | 부재·gzip 보존 | 위 gzip hash |

마지막 두 소유 임시 root는 문서·archive 검증 후 제거하고 부재를 확인했다. 과거 B10 실패와 최종
PASS 이력은 기존 `b10-ui.md`에 그대로 보존하며 이번 재검증으로 삭제하지 않는다.
첫 port 재확인 명령은 한 `lsof` 호출에 TCP `LISTEN` 필터를 중복 지정해 usage 오류가 났다.
58100과 58101을 독립 호출하는 동일 판정으로 바로잡아 둘 다 LISTEN 없음으로 확인했으며,
이 절차 오류를 제품 또는 UI 실패로 바꾸지 않는다.
