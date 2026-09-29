# VLM fixture 출력 평가

개발자가 저장된 후보 출력의 채점 규칙을 비교하는 안내다. `fixture-captured-output-only`
방식이며 모델 실행·설치·다운로드나 provider 호출을 하지 않는다. 모델 이름과 지연값은
fixture 데이터이지 현재 장비의 성능 측정 또는 최신 모델 추천이 아니다.

## 입력과 채점

[evaluate_vlm_harness.mjs](../scripts/internal/evaluate_vlm_harness.mjs)의
`evaluateCandidate`가 [cases.json](../test/fixtures/vlm_evaluation_harness/cases.json)을 읽는다.
입력 schema는 `media-server.vlm-evaluation-fixtures.v1`이다.
각 사례는 event ID/source/rule, `previousFrame/eventFrame/nextFrame/bboxCrop` 문자열 참조와
후보의 `structuredJsonText`, `latencyMs`, 언어, prompt profile을 제공한다.
기본 `fixture://` 참조는 실제 이미지 바이트를 읽는 경로가 아니다.
제품의 파일 참조 생성은 [이벤트 evidence](vlm-event-evidence-extraction.md)와 구분한다.

| dimension | 실제 판정 |
| --- | --- |
| `latency` | 입력 `latencyMs`가 양의 유한수이고 사례의 `maxLatencyMs` 이내인지 확인 |
| `jsonStability` | JSON parse, `media-server.vlm-event-review.v1`, 필수 필드·eventId·evidence 참조 및 raw material 패턴 확인 |
| `explanationQuality` | 필수 용어 포함 비율과 threshold 비교 |
| `hallucination` | 금지 문구와 입력 `unsupportedClaims`가 없는지 확인 |
| `languageQuality` | language 필드 및 한글/영문 패턴 확인; 언어 능력 전반의 평가가 아님 |

총점 가중치는 순서대로 0.18/0.24/0.24/0.20/0.14다.
`line-crossing-ko-ab`는 한국어 A/B,
`intrusion-en-json-stability`는 영어 정상/오류 출력을 비교한다.
`bad-json-hallucination-en`은 invalid JSON·hallucination·latency 오류를 가진
의도된 실패 후보다.

## 결과 해석

출력 schema는 `media-server.vlm-evaluation-report.v1`이다.
`cases[].candidates[]`에 `status`, `expectedStatus`, `failedDimensions`,
`dimensions`, `score`가 있으며 case에는 `bestCandidateId`와
`summary.blockingFailures`가 있다.

후보의 `failed`와 전체 report의 `passed`는 모순이 아니다. 전체 상태는
후보 결과가 fixture의 기대값과 일치하는지로 결정되므로 의도된 실패도 일치하면 통과한다.
`bestCandidateId`는 점수순 선택이지 운영 profile 활성화가 아니다.
실제 Ops draft 승격은 [평가 결과 workflow](vlm-evaluation-result-workflow.md)의 서버 catalog를 따른다.

## 명령

```bash
: "${vlm_run_root:?이번 실행의 소유 절대 경로를 지정하세요}"
./server.sh evaluate-vlm-harness \
  --fixture test/fixtures/vlm_evaluation_harness/cases.json \
  --json-output "$vlm_run_root/evaluation.json" \
  --report "$vlm_run_root/evaluation.md"
./server.sh evaluate-vlm-harness --case line-crossing-ko-ab
./server.sh verify-vlm-evaluation-harness
```

평가기의 stdout도 JSON이며 `review-required`만으로 exit 1을 내지는 않는다.
검증기는 2개 사례/4개 후보, 의도된 오류, 보고서 출력과 명령 연결을 확인하고 불일치 시
exit 1이다. 기능 정의 LAB-039·LAB-052와 연결되며 실제 모델 benchmark를 대신하지 않는다.

`runtimeVlmCallPerformed=false`, `cloudProviderApiCalled=false`, `sidecarStored=false`를 유지한다.
Event POST/WebRTC DataChannel/SSE/WS schema·RTSP/WebRTC 경로와 viewer/client 노출을
바꾸지 않는다. [검증 정책](stream-verification.md#검증-정책)과
[UI 풀테스트 기준](manual-ui-fulltest.md)의 실행 승인·증거 요건은 별개다.
