# VLM observation 별도 저장 계약

개발자가 VLM 결과를 EventRecord와 분리해 저장·조회하는 C++ 계약이다.
[vlm_observation_store.h](../include/analysis/vlm_observation_store.h)와
[vlm_observation_store.cpp](../src/analysis/vlm_observation_store.cpp)가 기준이며,
저장 기능의 존재가 실제 모델 결과를 자동 생성·저장한다는 뜻은 아니다.

## 저장·조회와 상관관계

`FileVlmObservationStore::Store`는 `eventId`가 있는 observation을 지정 경로에 JSONL로
append한다. 기본 경로는 `DefaultVlmObservationStorePath`가 EventRecord active path의
stem 뒤에 `.vlm-observations`를 넣고 확장자를 유지해 만든다.
`events.jsonl`이면 `events.vlm-observations.jsonl`이며 확장자가 없으면 `.jsonl`을 사용한다.

`QueryVlmObservations`는 eventId/sourceId/provider/model/privacyMode 및 offset/limit으로
조회한다. 파일 부재와 빈 결과, 열기 오류를 구분하며 손상된 JSON/과대 행은 건너뛰어
`skippedCorruptLines`에 집계한다. 현재 저장은 append 방식이므로 저장소 전체를
원자 확정·자동 보존/복구하는 녹화 저장소와 같은 보장으로 설명하지 않는다.

| 항목 | 현재 직렬화 |
| --- | --- |
| schema | `media-server.vlm-observation.v1` |
| 식별·입력 | `observationId/eventId/sourceId/ruleId/scenarioId/inputType/inputEvidenceRefs` |
| 설명 | `summary/eventExplanation`, 문자열 배열 `falsePositiveHints[]/operatorReviewQuestions[]` |
| 후보·불확실성 | JSON object 또는 null인 `ruleSuggestion`, 숫자 `uncertainty` |
| 출처·시각 | 문자열 `provider/model/promptProfile/privacyMode`, 정수 `latencyMs/createdAt` |
| 경계 | `storageScope=vlm-observation-store-only`, `redactionReview`, `contractInvariants`, `metadata` |

`createdAt`은 호출자가 준 `created_at_ms` 그대로이며 저장 함수가 현재 시각을 생성하지 않는다.
[설명 생성기](vlm-event-explanation-hints.md)의 객체형 힌트·prompt·불확실성 및 ISO 시각은
그대로 호환되는 입력이 아니므로 저장 전 명시적 변환이 필요하다.

`BuildVlmObservationCorrelationReportJson`은
`media-server.vlm-observation-correlation-report.v1`에 두 schema와 `eventIdMatched`,
`eventRecordTopLevelObservationFieldsPresent`, `externalPayloadChanged=false`를 담는다.
상관 키는 `eventId`이며 EventRecord 최상위·Event POST·WebRTC DataChannel·SSE/WS에
VLM 결과를 복사하지 않는다. [Ops 검토](vlm-ops-event-review-ui.md)는 별도 조회 모델을 사용한다.

## 입력 정제 책임

raw prompt/provider response·credential·source URL·raw frame bytes를 입력이나 임의
`metadata/inputEvidenceRefs/ruleSuggestion`에 넣지 않는다.
serializer는 문자열 escaping과 object 모양 처리를 하지만 임의 문자열의 비밀을 자동 제거하지 않는다.
`redactionReview`의 `rawPromptStored/rawResponseStored/sourceUrlExposed/credentialMaterialStored/rawMediaEmbedded=false`는
고정 계약 표기이지 저장한 모든 값의 무해성 증명은 아니다. 호출자가 정제된 DTO를 제공해야 한다.
라이선스·출처·cloud 전송 판단은 [privacy guard](vlm-privacy-transfer-guard.md)와 profile 기준을 유지한다.

## 검사와 실제 실행 구분

[fixture](../test/fixtures/vlm_observation_store/observations.json)는
`media-server.vlm-observation-fixtures.v1`이고 EVT-030·LAB-040·LAB-053과 연결된다.

```bash
./server.sh verify-vlm-observation-sidecar
./server.sh verify-analysis-state
./server.sh verify-event-post
./server.sh verify-ws-metadata
```

첫 명령은 fixture와 C++ store/query/correlation·smoke source 연결을 읽는 정적 검사다.
실제 C++ 저장·조회는 별도 `verify-analysis-state`가 실행한다.
기존 외부 payload 회귀도 각 명령의 범위에서 별도로 기록한다.
자동 Rule/Profile 적용·runtime/provider 호출·미디어 경로 변경·viewer/client 노출은 하지 않는다.
[검증 정책](stream-verification.md#검증-정책)과 [UI 풀테스트](manual-ui-fulltest.md)에 따라
실제 모델·UI·장시간 미실행을 구분한다.
