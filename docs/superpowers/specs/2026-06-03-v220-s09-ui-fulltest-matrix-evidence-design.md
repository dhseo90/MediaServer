# v2.2.0 S09 UI Fulltest Matrix Evidence 설계

## 목적

`V220-S09 UI fulltest matrix / evidence`는 v2.2.0에서 재배치한 S05~S08 UI를
manual UI evidence runner와 UI 풀테스트 체크리스트에 빠짐없이 연결합니다. 이 단계는
실제 UI 풀테스트를 실행해 PASS를 만드는 단계가 아니라, UI 풀테스트를 시작하기 전에
확인해야 할 route, control, interaction, responsive viewport, redaction, role guard
matrix를 고정하는 단계입니다.

## 범위

- v2.2.0 S05 Ops, S06 Rules, S07 Client, S08 Auth/setup route를 기능 ID와
  manual evidence 필드에 연결합니다.
- `docs/v220-ui-fulltest-matrix-evidence.md`를 S09 source-of-truth로 추가합니다.
- manual UI 기준 문서, backlog, stream verification, feature inventory에 S09
  matrix 경계를 연결합니다.
- `verify-v220-ui-fulltest-matrix-evidence`를 추가해 문서와 runner 연결을 정적
  검증합니다.

## 비범위

- 실제 인앱 브라우저 UI 풀테스트 PASS 생성
- `verify-predev --soak-minutes 30` 또는 120분 longrun 실행
- release close-out, published metadata, main merge, tag, GitHub Release
- Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path,
  Auth/session/scope, Rule/Profile payload schema 변경
- UI 대상 기능 ID 수 증가 또는 임의 기능 추가

## 설계

S09는 `project-feature-test-inventory.md`의 기존 UI 대상 기능 ID를 그대로 사용합니다.
새 기능 ID를 만들지 않고, v2.2.0 redesign이 영향을 준 기존 기능 ID에 어떤
route/control/interaction evidence가 필요한지 matrix로 명시합니다. Matrix는
`media-server.v220-ui-fulltest-matrix.v1`로 표기하며, runner 입력 schema
`media-server.manual-ui-evidence-input.v1`의 필수 필드와 1:1로 연결합니다.

S09 verifier는 아래를 확인합니다.

- `server.sh`가 `verify-v220-ui-fulltest-matrix-evidence`를 노출합니다.
- S09 문서가 S05~S08 route, 기능 ID, viewport `320/390/760/1180`, light/dark,
  viewer redaction, role guard, raw JSON/source URL 비노출을 모두 담습니다.
- manual UI fulltest/checklist/result template이 v2.2.0 matrix를 참조합니다.
- backlog와 stream verification이 S09 완료/비완료 경계를 분리합니다.
- feature inventory가 S09를 실행 전 update list에 포함하고 UI 대상 count를 바꾸지
  않습니다.

## 검증

S09 집중 검증:

```bash
./server.sh verify-v220-ui-fulltest-matrix-evidence
./server.sh verify-manual-ui-evidence
./server.sh verify-manual-ui-evidence-runner
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-feature-inventory-coverage
git diff --check
```

보조 검증:

```bash
node --check scripts/internal/verify_v220_ui_fulltest_matrix_evidence.mjs
./server.sh verify-script-inventory
./server.sh verify-release-metadata
```

S09 PASS는 matrix와 verifier 연결 PASS입니다. 브라우저 UI 풀테스트, 30분 soak,
120분 longrun, published metadata 재검증은 실행하지 않으면 미실행으로 남깁니다.
