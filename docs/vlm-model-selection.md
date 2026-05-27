# VLM Model Selection

이 문서는 `v2.0.0 V200-S01 VLM 후보군/선택 기준`의 source-of-truth입니다.
목표는 후보 catalog를 만드는 데서 멈추지 않고, 현재 제품 기준에서 어떤 모델을
1차 기준으로 삼을지와 어떤 기준으로 향후 모델을 승격/제외할지 고정하는 것입니다.

## 직접 답

현재 V200-S01 결정은 다음과 같습니다.

| 역할 | 선택 | 조건 |
| --- | --- | --- |
| 1차 local standard | `Qwen/Qwen3-VL-8B-Instruct` | 사용자가 직접 준비한 local runtime에서 실행합니다. 모델/weight/runtime은 repo나 release asset에 포함하지 않습니다. |
| local low-spec fallback | `Qwen/Qwen3-VL-4B-Instruct` | PC 사양이 standard 등급보다 낮거나 latency가 우선일 때 선택합니다. 품질 저하는 예상값으로 표시합니다. |
| cloud opt-in fallback | `gemini-2.5-flash` | 사용자가 cloud 전송을 명시 허용한 경우에만 사용합니다. 외부 전송, provider 약관, logging/retention 검토가 필수입니다. |
| 조건부 user-supplied | Gemma 계열 | Gemma Terms 또는 별도 license/사용 제한 수락이 필요하므로 기본값이나 추천 baseline으로 두지 않습니다. |

이 결정은 VLM 호출, 설치 UI, profile 저장, sidecar 저장, Event POST/WebRTC/SSE/WS
schema 변경을 포함하지 않습니다. 이 단계의 산출물은 모델 선택 기준과 선택 결정,
그리고 해당 결정이 프로젝트 라이선스와 배포 정책을 어기지 않도록 막는 정적 검증입니다.

## 공식 출처와 license 판정

| 후보 | 공식 출처 | 판정 |
| --- | --- | --- |
| `Qwen/Qwen3-VL-8B-Instruct` | <https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct> | Hugging Face 공식 model card 기준 `License: apache-2.0`이고 image-text 입력 및 local/vLLM 실행 안내가 있어 1차 local standard로 둡니다. |
| `Qwen/Qwen3-VL-4B-Instruct` | <https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct> | Hugging Face 공식 model card 기준 `License: apache-2.0`이고 8B보다 낮은 PC 등급 fallback으로 둡니다. |
| `gemini-2.5-flash` | <https://ai.google.dev/gemini-api/docs/models> | Google Gemini API 모델 문서 기준 price-performance 목적의 cloud 후보입니다. local 모델이 아니므로 명시 opt-in과 외부 전송 검토가 없으면 사용할 수 없습니다. |
| Gemma 계열 | <https://ai.google.dev/gemma/terms> | Gemma Terms가 별도 사용/배포 조건을 두므로 Apache-2.0 project baseline의 기본 모델로 승격하지 않습니다. 사용자가 직접 준비한 경우에도 별도 license review가 필요합니다. |

## Hard Gates

아래 중 하나라도 실패하면 `primary`, `fallback`, `default`로 둘 수 없습니다.

| Gate | 기준 |
| --- | --- |
| `G0-official-source` | 공식 model card 또는 provider 문서 URL이 있어야 합니다. |
| `G0-license-compatible` | 프로젝트 Apache-2.0 source release 정책과 충돌하지 않아야 합니다. Custom terms, gated access, field-of-use 제한은 조건부 또는 제외로 둡니다. |
| `G0-no-bundle` | model weight, runtime package, credential, download token을 repo/release/bundle에 포함하지 않습니다. |
| `G0-user-supplied-runtime` | local 모델은 사용자가 설치한 Ollama/vLLM/호환 runtime 또는 외부 provider API를 전제로 합니다. |
| `G0-cloud-opt-in` | cloud 모델은 외부 전송 경고와 명시 opt-in 없이는 사용할 수 없습니다. |
| `G0-image-input` | event snapshot, bbox crop, short clip evidence 후보를 해석할 image/text 입력 경로가 있어야 합니다. |
| `G0-structured-output-plan` | 후속 평가 harness에서 JSON/structured output 안정성을 검증할 수 있어야 합니다. |
| `G0-no-contract-drift` | Event POST, WebRTC DataChannel, SSE/WS metadata schema, RTSP/WebRTC media path를 이 단계에서 변경하지 않습니다. |
| `G0-viewer-redaction` | viewer/client에 prompt, raw response, source URL, credential, 내부 모델 정보를 노출하지 않습니다. |

## Tier 기준

| Tier | 의미 | 현재 배정 |
| --- | --- | --- |
| `T1-primary-local-standard` | license/provenance/privacy gate를 통과한 1차 local 기준 모델 | `Qwen/Qwen3-VL-8B-Instruct` |
| `T2-local-low-spec-fallback` | 같은 gate를 통과하지만 낮은 PC 등급과 낮은 latency를 우선하는 local fallback | `Qwen/Qwen3-VL-4B-Instruct` |
| `T3-cloud-opt-in-fallback` | local 실행이 어렵거나 품질 우선일 때 쓰는 provider API fallback | `gemini-2.5-flash` |
| `T4-conditional-user-supplied` | 사용자가 직접 준비할 수 있으나 custom terms/gated access/재배포 조건 때문에 기본값이 아닌 후보 | Gemma 계열 |
| `T5-excluded-or-blocked` | hard gate 실패 또는 공식 출처/license 불명으로 제외 | unofficial mirror, license 불명 모델, bundle 요구 모델 |

## PC 등급 기준

아래 등급은 추천 엔진 구현 전의 planning class입니다. 실제 latency, memory, cost는
`V200-S03` 추천 엔진과 `V200-S06` 평가 harness에서 측정해야 하며, 이 문서의 숫자를
benchmark PASS로 보고하지 않습니다.

| 등급 | 기준 | 허용 Tier |
| --- | --- | --- |
| `local-low` | 4B class quantized/local runtime 후보. 대략 16GB RAM 또는 8GB 이상 VRAM급을 planning 기준으로 둡니다. | T2 |
| `local-standard` | 7B/8B class quantized/local runtime 후보. 대략 24GB RAM, 12GB 이상 VRAM, 또는 16GB 이상 Apple unified memory급을 planning 기준으로 둡니다. | T1 |
| `local-high` | 12B 이상 또는 더 큰 모델. v2.0.0 기본 후보가 아니며 owner가 별도 승인해야 합니다. | 없음 |
| `cloud-allowed` | PC 사양 부족 또는 품질 우선으로 cloud 전송을 명시 허용한 상태입니다. | T3 |
| `cloud-disabled` | 외부 전송 미허용 상태입니다. | T1, T2만 가능 |

## 향후 모델 추가 규칙

새 모델은 아래 항목을 모두 채운 뒤에만 후보표에 추가합니다.

1. 공식 source URL과 license URL
2. hard gate 결과
3. Tier 배정
4. PC 등급 또는 cloud opt-in 요구사항
5. 선택 역할: primary, fallback, conditional, excluded 중 하나
6. 제외 또는 조건부 사유
7. repo/release/bundle에 model artifact를 포함하지 않는다는 확인
8. `./server.sh verify-vlm-selection-decision` 통과

새 모델이 출시되더라도 `T1` 승격은 자동으로 하지 않습니다. 공식 출처, license,
privacy, structured output, 한국어/영어 설명 품질, latency/cost, 설치 방식이 기존
기준보다 낫다는 evidence가 있어야 합니다.

## 완료/비범위

V200-S01 완료 조건:

- 이 문서에 1차 모델, local fallback, cloud fallback, 조건부/제외 사유가 존재합니다.
- `test/fixtures/vlm_model_catalog/selection_decision.json`이 같은 결정을 구조화해 보존합니다.
- `./server.sh verify-vlm-selection-decision`이 선택 결정과 license/privacy/bundle gate를 직접 검사합니다.
- `./server.sh verify-bundle-policy`가 VLM model artifact를 기본 bundle에서 차단합니다.
- `git diff --check`가 문서/fixture/script whitespace drift를 확인합니다.

이 단계에서 하지 않는 일:

- PC 사양 자동 감지
- 추천 엔진 구현
- 설치/연결 UI 구현
- profile 저장
- VLM runtime 호출
- VLMObservation sidecar 저장
- Event POST/WebRTC/SSE/WS metadata schema 변경
- 제품 UI 직접 노출
