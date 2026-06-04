# v2.2.0 Ops VLM UI containment 정리

이 문서는 `V220-F04 Ops VLM UI containment 정리`의 산출물입니다. 목적은 `/ops/vlm`을
Ops 보조 작업으로 유지하면서 privacy, default-off, profile 상태를 읽기 쉽게
분리하는 것입니다.

## 범위

- `/ops/vlm`
  - `ops-vlm-containment-workspace`
  - `data-vlm-containment="ops-aux-default-off"`
  - `data-vlm-task="ops-aux"`
  - `data-vlm-task="default-off"`
  - `data-vlm-task="privacy"`
  - `data-vlm-task="profile-state"`
  - `data-vlm-task="boundary"`
  - `data-vlm-task="raw-debug"`

## 구현 기준

- Ops 보조 작업은 `ops-vlm-aux-panel`로 묶고 기존 dry-run 입력, recommendation,
  evaluation result workflow hook을 유지합니다.
- default-off 상태는 `ops-vlm-default-off-panel`과 기존 runtime status selector로
  표시합니다. profile 저장이나 후보 선택만으로 runtime call, queue start, provider
  call이 자동 발생하지 않습니다.
- privacy 상태는 `ops-vlm-privacy-panel`로 묶고 외부 전송 경고, provider
  logging/retention 검토, redaction guard를 분리해 보여줍니다.
- profile 상태는 `ops-vlm-profile-state-panel`로 묶고 evaluation, activation,
  fallback, disabled reason, enabled 상태를 같은 저장 경계 안에서 보여줍니다.
- raw JSON은 운영자 debug details인 `opsVlmRawDetails` 안에만 유지합니다.

## 변경하지 않는 것

- VLM runtime opt-in contract
- VLM profile storage schema와 CRUD API
- VLM privacy/transfer guard schema
- VLM dry-run/recommendation/evaluation fixture contract
- Auth/session/scope/role contract
- Event POST, WebRTC DataChannel, SSE/WS metadata schema
- RTSP/WebRTC media path
- Client/viewer VLM 비노출 경계

## 검증

```bash
./server.sh verify-v220-ops-vlm-containment
./server.sh verify-vlm-runtime-opt-in-contract
./server.sh verify-vlm-runtime-status-ui
./server.sh verify-vlm-profile-storage
./server.sh verify-vlm-privacy-transfer-guard
./server.sh verify-vlm-install-connection-ui
./server.sh verify-ops-client-ui --screenshots
git diff --check
```

위 명령은 F04 route/CSS/문서 연결과 기존 VLM containment verifier를 확인합니다. 실제
provider 호출, model 설치, 30분 soak, 120분 longrun, 인앱 브라우저 UI 풀테스트는
실행하지 않으면 미실행으로 분리해 보고합니다.
