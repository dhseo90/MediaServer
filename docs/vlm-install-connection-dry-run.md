# VLM Install/Connection Dry-run Contract

이 문서는 `v2.0.0 V200-S04 VLM 설치/연결 UI`의 dry-run contract
source-of-truth입니다. 목표는 S03 추천 결과를 Ops UI가 표시할 수 있는 선택 후보로
바꾸되, 실제 설치, profile 저장, cloud provider API 호출, VLM runtime 호출,
sidecar 저장을 하지 않는 것입니다.

## 직접 답

현재 dry-run contract는 `media-server.vlm-install-connection-dry-run.v1`입니다.
입력은 `media-server.vlm-recommendation.v1` 추천 결과 또는 같은 추천을 만들 수 있는
PC capability/privacy mode이며, 출력은 local model 설치 dry-run 후보와 cloud API
연결 dry-run 후보를 함께 제공합니다.

이 단계에서 수행하지 않는 일:

- 실제 설치
- local runtime 또는 model download 실행
- cloud provider API 호출
- credential/API key 저장 또는 echo
- profile 저장
- VLM runtime 호출
- VLMObservation sidecar 저장
- Event POST, WebRTC DataChannel, SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- viewer/client 화면 노출

## Command

```bash
./server.sh vlm-install-connection-dry-run \
  --pc-capability-fixture test/fixtures/vlm_pc_capability/cases.json \
  --fixture-case linux-nvidia-12gb \
  --privacy-mode cloud-allowed \
  --cloud-opt-in acknowledged
```

검증:

```bash
./server.sh verify-vlm-install-connection-dry-run
./server.sh verify-vlm-install-connection-ui
```

## Ops UI 연결

`/ops/vlm`은 이 dry-run contract를 제품 Ops 화면에서 표시하는 V200-S04 전용
route입니다. 화면은 `/ops/api/vlm/install-connection/dry-run` read-only API를
호출해 local/cloud 후보, resource estimate, cloud opt-in guard, 단일 선택 상태,
비추천/조건부 후보, 실행 경계 badge, 접힌 raw details를 보여줍니다.

이 route는 admin/operator용 Ops shell 아래에만 있고 `/ops` primary nav에는 추가하지
않습니다. `/ops/home`의 보조 CTA에서 진입합니다. UI에서 후보를 선택해도 실제 설치,
provider connection, credential 저장, profile 저장, VLM runtime 호출, sidecar 저장은
발생하지 않습니다.

## Output Contract

필수 top-level field:

- `schema`: `media-server.vlm-install-connection-dry-run.v1`
- `targetStep`: `V200-S04`
- `scope`: `install-connection-dry-run-contract-only`
- `sourceRecommendation`: 입력 추천 schema, step, decision status
- `pcCapability`: OS/hardware class/runtime readiness 요약
- `privacy`: privacy mode, cloud opt-in 상태, redaction flags
- `decision`: 사용자 단일 선택 필요 여부, selectable option IDs, blocked reason
- `options`: selectable 또는 disabled local/cloud dry-run 후보
- `disabledOptions`: 추천 엔진이 제외한 후보 요약
- `warnings`: runtime setup, cloud opt-in, dry-run-only 경고
- `nonScope`: 이 단계에서 하지 않는 일
- `contractInvariants`: 설치/연결/호출/저장/schema/media 변경이 없다는 boolean map

`options[].actionType`은 아래 둘 중 하나입니다.

| actionType | 의미 |
| --- | --- |
| `local-model-install-dry-run` | 사용자가 준비할 local runtime/model 후보의 영향만 계산 |
| `cloud-api-connection-dry-run` | cloud provider 연결 후보의 opt-in, 외부 전송, 비용/약관 검토 필요성을 표시 |

모든 option은 `execution.dryRunOnly=true`이고 install, connection, runtime call,
profile storage, sidecar storage, cloud provider API call, credential storage,
model download를 수행하지 않아야 합니다.

## Cloud Opt-in Guard

`privacy-mode=cloud-allowed`는 cloud 후보를 추천 결과에 포함할 수 있다는 뜻일 뿐,
UI의 외부 전송 동의를 완료했다는 뜻이 아닙니다. `--cloud-opt-in acknowledged`가
없으면 cloud option은 `cloud-explicit-opt-in-required`로 disabled되어야 합니다.

## 완료/비범위

완료 조건:

- `./server.sh vlm-install-connection-dry-run`이 dry-run JSON을 출력합니다.
- `test/fixtures/vlm_install_connection_dry_run/cases.json`이 unsupported/local/cloud/
  high/missing-runtime/cloud-opt-in guard case를 보존합니다.
- `./server.sh verify-vlm-install-connection-dry-run`이 schema, fixture matrix,
  side-effect false invariant, redaction boundary, 문서/명령 연결을 검증합니다.
- `./server.sh verify-vlm-install-connection-ui`가 `/ops/vlm` shell route,
  read-only API, cloud opt-in guard, no-write boundary, docs/inventory 연결을 정적으로
  검증합니다.
- `git diff --check`가 문서/fixture/script whitespace drift를 확인합니다.

비범위:

- V200-S04 정적/UI smoke를 넘어선 브라우저 전체 UI 풀테스트 완료 주장
- V200-S05 profile 저장
- VLM runtime 호출
- sidecar 저장
- Event/WebRTC/SSE/WS schema 변경
- model/runtime bundle release
