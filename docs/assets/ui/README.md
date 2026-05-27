# UI Screenshot Assets

이 디렉터리는 README와 `docs/ui-guide.md`에서 사용할 제품 UI 스크린샷을 역할 기준 파일명으로 보관합니다.

현재 대표 제품 이미지는 2026-05-23 캡처 자산을 v1.9.0 release baseline 화면으로
유지합니다. 특히 Client Live 이미지는 source tree, dock event feed,
workspace preset, tile-level disconnect/action, VA overlay tile이 보이는 현재
제품 구조를 기준으로 합니다.

README, README.en, `docs/ui-guide.md`, `docs/video-analysis.md`에서 참조하는 UI/VA
이미지는 `verify-docs-ui-assets` 정적 gate로 관리합니다. 정적 gate만 실행하고
수동 브라우저 재검수까지 완료했다고 과장하지 않습니다.
관리 대상 파일, 캡처 task, 최소 크기, 직접 이미지 검수 요구사항은
`config/docs_ui_assets.json`의 managed asset list에서 단일 관리합니다.
`ops-rules-preview`는 전체 페이지 캡처가 아니라 Rule preview/editor 대표 구간
캡처로 유지합니다.
재캡처는 `scripts/internal/capture_docs_ui_assets.mjs` 기준으로 관리합니다.
기준 검증은 `./server.sh verify-docs-ui-assets`로 수행합니다.
`ops-rules-preview` 캡처와 `verify-rule-ui` smoke는
`scripts/internal/rule_preview_fixture_helpers.mjs`의 공통 profile/event/VA rule
fixture를 사용해 preview prerequisite drift를 막습니다.

직접 이미지 검수 checklist:

- 재캡처 뒤 한국어/영어 PNG를 모두 직접 엽니다.
- 현재 v1.9.0 release baseline과 화면 구조가 맞는지 확인합니다.
- 영상 screenshot은 video viewport, control, status, VA overlay가 잘리지 않는지 확인합니다.
- client/viewer screenshot에 source URL, Developer URL, raw JSON, debug counter,
  BBox diagnostics, model path, credential, session material이 보이지 않는지 확인합니다.
- 열지 않은 이미지는 PASS가 아니라 `미확인`으로 기록합니다.

English visual copy QA checklist:

- English 캡처는 `?lang=en` 또는 language selector로 실제 제품 English UI를 띄운 상태에서만 사용합니다.
- Ops primary nav는 Home, Dashboard, Channels, Rules, Users, Client Preview로 보이는지 확인합니다.
- Client primary nav는 Live, Dashboard만 보이는지 확인합니다.
- nav, card title, table header, table action, tile control text가 부모 폭을 넘거나 줄바꿈으로 겹치지 않는지 확인합니다.
- English PNG에 Korean residue가 보이면 screenshot은 `FAIL`로 기록하고 translation map 또는 capture flow를 수정합니다.

재캡처 예시:

```bash
node scripts/internal/capture_docs_ui_assets.mjs --lang=ko
node scripts/internal/capture_docs_ui_assets.mjs --lang=en
```

기본 기준:

- 문서 대표 이미지는 dark mode로 캡처한다.
- 한글 문서는 `docs/assets/ui/`, 영문 문서는 `docs/assets/ui/en/` 이미지를 사용한다.
- 영문 이미지는 실제 제품 UI의 English 선택 상태에서 캡처한다. 이미지 편집으로 텍스트만 바꾸지 않는다.
- English screenshots are stored in `docs/assets/ui/en/` with the same role-based
  filenames as the Korean captures. Do not keep a separate English README in
  that directory; these shared rules are the single screenshot policy.
- Before updating English README screenshots, review visible text for current
  live-only wording. Non-goal terms such as VMS, NVR, long-term recording,
  playback/search, and Profile G must appear only as explicit non-goals or
  short event evidence/debug context.
- Do not use client screenshots where source URLs, ONVIF endpoints, raw
  diagnostic JSON, or rule/profile editors are visible.
- 영상이 보이는 화면은 `va_four_scene_sample.mp4` 4신 영상 기준으로 캡처한다.
- VA overlay가 가능한 화면은 overlay를 켜고 객체 bbox/label이 실제로 표출된 상태를
  캡처한다.
- 영상이 보이는 화면은 실제 출력 프레임 전체가 보여야 한다. 상단, 하단, 좌우가
  잘린 이미지는 문서용으로 쓰지 않는다.
- 특히 video viewport 하단 control/status/overlay 영역이 잘린 스크린샷은 금지한다.
- 상하좌우 공백이 과하게 크거나 주요 UI/영상이 한쪽으로 치우친 이미지는 다시 캡처한다.
- 운영/개발 진단 화면은 대표 제품 화면과 섞지 않는다.

파일명 규칙:

- 날짜, 포트, 랜덤값을 넣지 않는다.
- 화면 역할을 기준으로 `ops-*.png`, `client-*.png`, `auth-*.png` 형식을 사용한다.
- README에는 대표 제품 화면만 사용하고, 운영/개발 진단과 분석 상세 흐름은 `docs/ui-guide.md`에서 분리한다.
- LAN IP, 개인 절대경로, 외부 민감 URL이 보이는 상태로 캡처하지 않는다.
- 상단/하단에서 버튼, 입력, 카드 제목, table row가 반쯤 잘린 이미지는 문서용으로 쓰지 않는다.
- 긴 화면은 section 경계가 자연스러운 지점에서 대표 구간을 캡처한다.

README 대표 후보:

- `ops-home.png`
- `ops-channels.png`
- `ops-rules.png`
- `ops-rules-preview.png`
- `ops-users.png`
- `client-live.png`

UI 가이드 상세 후보:

- `ops-dashboard.png`
- `client-dashboard.png`
- `auth-login.png`

주의:

- 개발자/진단 성격의 이미지는 대표 제품 화면으로 쓰지 않습니다.
- 제품 문서에서 사용할 때도 운영/개발 진단 맥락을 분명히 적고, 일반 사용자 화면처럼 배치하지 않습니다.
- primary nav에 없는 실시간 진단 화면은 대표 자산으로 보관하지 않고, 별도 검증 스크립트 결과로만 확인합니다.
