# VLM 평가 후보를 profile draft로 옮기기

운영자는 `/ops/vlm`의 `data-testid="ops-vlm-evaluation-result-workflow"` 패널에서
fixture 기반 평가 후보를 비교하고 저장 폼에 반영할 수 있다.
조회는 Ops operator/admin과 `ops:read`, profile 저장은 추가 `rule:write`가 필요하다.
Client/viewer에게 이 패널·평가 내부 정보를 제공하지 않는다.

## 현재 catalog와 선택

`GET /ops/api/vlm/evaluation-results`의 schema는
`media-server.ops.vlm-evaluation-result-workflow.v1`이다.
기준은 [vlm_evaluation_promotion.cpp](../src/ingress/vlm_evaluation_promotion.cpp)의
`Candidates`·`VlmEvaluationResultWorkflowJson`이다. 이 API는 요청 때 모델을 실행하거나
새 평가 파일을 읽지 않고 immutable catalog를 반환한다.

| candidateId | model / prompt profile | catalog 상태·용도 |
| --- | --- | --- |
| `eval-qwen8b-event-review-default` | `Qwen/Qwen3-VL-8B-Instruct` / `event-review-default` | `passed`, 기본 추천 후보 |
| `eval-qwen4b-false-positive-review` | `Qwen/Qwen3-VL-4B-Instruct` / `false-positive-review` | `review-required`, 영어 품질 검토가 남은 fallback |
| `eval-qwen4b-operator-question-review` | `Qwen/Qwen3-VL-4B-Instruct` / `operator-question-review` | `failed`, JSON·latency·hallucination 오류로 draft 제외 |

이는 저장된 fixture/catalog의 결정이며 최신 모델 추천이나 실제 모델 benchmark가 아니다.
앞의 두 후보는 draft에 넣을 수 있지만 기본 activation은 `pending-evaluation`,
enabled는 false다. `review-required` 후보는 active로 승격할 수 없다.

## 저장 전 신뢰 경계

1. 평가·latency·JSON 안정성·설명·hallucination·한국어/영어 품질을 읽고 후보를 선택한다.
2. `profile draft 반영`은 선택 가능한 option/model/prompt와 서버 후보 참조를 폼에 채운다.
3. 운영자가 별도로 저장한다. 서버의 `ValidateVlmEvaluationPromotion`이
   `candidateId`, `expectedCatalogRevision`, `expectedProvenanceDigest`와
   option/model/prompt ID·version·language를 대조한다.
4. 서버가 canonical `evaluation`과 `media-server.vlm-evaluation-provenance.v1`을 생성한다.
   client가 선언한 `passed`·score·dimensions·case 결과·provenance는 신뢰하지 않는다.

현재 `catalogRevision=v390-add1-03-2026-07-10`은 계약 식별자로 유지한다.
provenance에는 workflow fixture·harness fixture·evaluator·model catalog SHA-256과
candidate digest가 포함된다. unknown/stale/mismatched 후보는 거부하며, 후보 없이 저장하면
서버 평가 상태는 `not-run`이다. 선택 자체는 profile 저장·활성화·runtime/provider 호출을 하지 않는다.
UI 연결은 [product_ui_page_scripts.cpp](../src/ingress/product_ui_page_scripts.cpp)의
`applyOpsVlmEvaluationCandidate`이며 활성화 제한은 [runtime 계약](vlm-runtime-opt-in-contract.md)을 따른다.

## 검증 정의

[workflow fixture](../test/fixtures/vlm_evaluation_result_workflow/cases.json)는
`media-server.vlm-evaluation-result-workflow-fixtures.v1`이고 기능 연결은 LAB-059다.

```bash
./server.sh verify-vlm-evaluation-result-workflow
./server.sh verify-vlm-evaluation-harness
./server.sh verify-vlm-recommendation-engine
./server.sh verify-vlm-profile-storage
./server.sh verify-v390-vlm-promotion-trust-boundary
```

첫 명령은 fixture·source/API/UI 연결의 정적 검사이며 화면 클릭·저장 실행을 대신하지 않는다.
각 명령의 실행 범위와 승인은 [검증 정책](stream-verification.md#검증-정책),
실제 화면은 [UI 풀테스트](manual-ui-fulltest.md)를 따른다.
하위 [평가 harness](vlm-evaluation-harness.md)의 PASS는 운영 default 승격이 아니다.

이 workflow는 모델 설치·다운로드, sidecar 쓰기, Event POST/WebRTC/SSE/WS schema·
RTSP/WebRTC 경로 변경, 자동 profile 활성화나 viewer/client 노출을 추가하지 않는다.
