# VLM Model Selection Boundary

이 문서는 v2.0.0 `V200-S01 VLM 후보군/선택 기준`의 source-of-truth입니다.
목표는 Qwen, Gemma, Gemini 같은 VLM 후보군을 특정 기본 모델로 고정하지 않고,
프로젝트 라이선스, local/cloud 실행 경계, privacy, 설치 방식, 성능/비용 검토
기준으로 분류하는 것입니다.

현재 상태:

- gate/catalog/verifier는 마련됐습니다.
- 실제 최신 model card, license, provider terms 확인은 아직 수행하지 않았습니다.
- 1차 사용할 모델, fallback 대안, 제외 모델 결정은 아직 미완료입니다.
- 따라서 이 문서의 현재 catalog는 `classification-only`이며, 모델 선택 완료
  evidence가 아닙니다.

## 범위

이 단계에서 하는 일:

- VLM 후보군을 exact model/version이 아니라 family와 deployment class로 분류
- local runtime, cloud provider API, 설치 방식, license/provenance, privacy/logging
  검토 축 정의
- 후보를 추천하거나 설치하기 전 필요한 evidence checklist 고정
- source-only release와 bundle policy가 VLM model/runtime artifact를 포함하지 않는
  경계 확인

이 단계에서 하지 않는 일:

- VLM 실행, prompt 호출, API 연결, runtime queue 구현
- PC 사양 감지, 추천 엔진, 설치/연결 UI, profile 저장
- VLMObservation sidecar 저장, EventRecord schema 변경
- 기존 Event POST, WebRTC DataChannel, SSE/WS metadata schema 변경
- VLM model/runtime artifact를 repo, release asset, container/offline bundle에 포함
- 특정 VLM 모델을 v2.0.0 기본값 또는 자동 설치 대상으로 확정

## 프로젝트 라이선스 제약

Media Server의 프로젝트 라이선스는 repository root의 `LICENSE` 기준 Apache-2.0입니다.
VLM 후보는 아래 조건을 만족하기 전까지 제품 사용 승인 또는 추천 기본값으로 취급하지
않습니다.

- 후보 license, provider terms, runtime dependency terms가 Apache-2.0 source release와
  충돌하지 않아야 합니다.
- 후보 사용이 프로젝트 license 변경, 추가 copyleft 의무, 비공개 EULA 강제, 또는
  source-only release 정책 위반을 요구하면 제외합니다.
- license 또는 commercial-use 조건이 불명확하면 `not-approved`로 남기고 다음 단계로
  넘기지 않습니다.
- model card, license text, commercial use terms, redistribution terms, attribution,
  NOTICE 반영 필요 여부를 공식 출처로 확인해야 합니다.
- cloud provider 후보는 API terms, data processing, logging/retention, region,
  subprocessors, opt-out 가능 여부를 별도 privacy review로 확인해야 합니다.

이 문서는 법무 검토를 대체하지 않습니다. 불확실한 후보는 사용할 수 있는 후보가
아니라 검토가 필요한 후보입니다.

## 후보 분류 축

| 축 | 기준 |
| --- | --- |
| Deployment class | `local`, `cloud` |
| Runtime/install | Ollama, vLLM, provider API 등. 자동 설치 없음 |
| License | Apache-2.0 프로젝트 license와 비충돌, commercial use, redistribution, attribution |
| Provenance | official model card, publisher, checkpoint source, dataset/provenance note |
| Privacy | 외부 전송 여부, logging/retention, raw response 보관, prompt/source material 노출 |
| Performance | latency class, memory/VRAM/RAM class, queue impact, timeout/fallback 필요성 |
| Output quality | event explanation, false-positive hint, operator question, JSON stability |
| Language | 한국어/영어 설명 품질 |
| Release boundary | model/runtime artifact를 repo/release/bundle에 포함하지 않음 |
| Support | update cadence, provider availability, deprecation/support risk |

## 후보 family 기준

### Local VLM Family

대표 예시는 Qwen 계열 또는 Gemma 계열처럼 사용자가 로컬 runtime으로 직접 준비할 수
있는 multimodal model family입니다. 이 문서에서는 exact model/version을 고정하지
않습니다.

필수 조건:

- 사용자가 하나의 후보를 명시 선택해야 하며 자동 다중 설치는 금지
- model artifact는 사용자 환경에만 두고 repo/release asset에 포함하지 않음
- license/provenance/commercial-use evidence가 없으면 `not-approved`
- local runtime dependency가 bundle policy를 위반하면 기본 release 범위에서 제외
- structured output 안정성, 한국어/영어 설명 품질, latency/memory class는 후속 평가
  harness에서만 비교

### Cloud Provider VLM Family

대표 예시는 Gemini 계열처럼 provider API를 통해 호출하는 multimodal model family입니다.
이 문서에서는 provider API 연결이나 credential 저장을 구현하지 않습니다.

필수 조건:

- 외부 전송 경고와 명시 opt-in 전에는 사용할 수 없음
- provider API terms와 프로젝트 라이선스가 충돌하지 않아야 함
- prompt, raw response, source URL, credential, 내부 모델 정보는 client/viewer에 노출 금지
- data processing, logging/retention, region, subprocessors review 필요
- cloud disabled mode에서는 추천/설치/호출 후보에서 제외

## 완료 판정

`V200-S01`은 아래 evidence가 모두 있어야 완료입니다.

- `docs/development-backlog.md`가 V200-S01 범위와 비범위를 고정
- `test/fixtures/vlm_model_catalog/candidate_families.json`가 후보 family와 review
  필드를 classification-only로 보존
- `./server.sh verify-vlm-model-catalog`가 license/provenance/privacy/bundle guard를 검증
- 공식 model card/license/provider terms 확인 결과가 후보별로 기록됨
- 1차 사용할 모델, fallback 대안, 제외 모델과 제외 사유가 기록됨
- 선택 모델이 Apache-2.0 프로젝트 license와 source-only release 정책을 위반하지
  않는다는 evidence가 기록됨
- `./server.sh verify-bundle-policy`가 VLM model artifact 확장자를 기본 bundle에서 차단
- `./server.sh verify-docs-links`, `./server.sh verify-script-inventory`,
  `git diff --check`가 통과

후속 단계인 PC 사양 감지, 추천 엔진, 설치 UI, profile 저장, VLM 실행/평가/sidecar
저장은 이 단계 완료 조건이 아닙니다.
