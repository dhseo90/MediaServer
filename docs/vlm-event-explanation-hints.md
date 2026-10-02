# VLM 이벤트 설명·오탐 힌트 fixture

개발자가 이벤트 설명의 출력 모양과 재현성을 확인하는 안내다. 현재 생성기는
영상이나 모델을 분석하지 않고 fixture의 사건·객체·영역 관계를 결정적 문장으로 조합한다.
실제 이벤트 판정을 대체하지 않으며, 운영 화면 연결은 [Ops 이벤트 검토](vlm-ops-event-review-ui.md)를 따른다.

## 입력과 출력

기준 구현은 [generate_vlm_event_explanation.mjs](../scripts/internal/generate_vlm_event_explanation.mjs)의
`buildExplanation`·`validateExplanation`이다.
[fixture](../test/fixtures/vlm_event_explanation/cases.json)의 schema는
`media-server.vlm-event-explanation-fixtures.v1`이며 다음 세 사례를 보존한다.

- `line-crossing-person-ko`: 사람의 라인 통과 설명과 오탐 질문
- `zone-dwell-person-en`: 영역 체류의 영어 설명
- `restricted-zone-vehicle-ko`: 제한 영역의 차량·polygon 관계

각 입력에는 `previousFrame`, `eventFrame`, `nextFrame`, `bboxCrop` 참조,
객체 label, 관계, 오탐 요인과 운영자 질문이 필요하다. 참조 파일의 영상 내용을 읽지는 않는다.

| 출력 | 계약 |
| --- | --- |
| 전체 report | `media-server.vlm-event-explanation-report.v1`; `status`는 `passed` 또는 `review-required` |
| 개별 explanation | `media-server.vlm-event-explanation.v1`; `eventId/sourceId/ruleId/scenarioId/eventType/language` |
| 설명 | `summary`, `eventExplanation`, `objectAreaRelations[]`, `falsePositiveHints[]`, `operatorReviewQuestions[]`, `uncertainty` |
| 입력·출처 | `inputEvidenceRefs`, `provider=fixture-only`, `model=deterministic-template-v1`, `promptProfile`, `privacyMode` |
| 결정적 값 | `createdAt=1970-01-01T00:00:00Z`, `latencyMs=0` |

`jsonStability`는 고정 시각·지연과 입력 순서를 명시한다. 검증기는 동일 fixture 출력 두 번을
바이트로 비교하며, 필수 용어·객체 관계·질문/힌트 수·참조 완전성을 확인한다.
이는 실제 설명 품질이나 모델 지연 측정이 아니다.

`storageScope=observation-store-compatible`는 용도 표시이지 자동 저장·형식 변환이 아니다.
생성기의 힌트/uncertainty/promptProfile은 객체이고 시각은 ISO 문자열이다.
[C++ sidecar](vlm-observation-sidecar.md)의 문자열 배열·숫자·문자열·정수 시각에 맞추려면
호출자가 명시적으로 변환하고 정제해야 한다.

## 명령과 판정

아래 출력 경로는 이번 실행에 소유권이 확인된 절대 디렉터리로 먼저 지정한다.

```bash
: "${vlm_run_root:?이번 실행의 소유 절대 경로를 지정하세요}"
./server.sh generate-vlm-event-explanation \
  --fixture test/fixtures/vlm_event_explanation/cases.json \
  --json-output "$vlm_run_root/explanation.json" \
  --report "$vlm_run_root/explanation.md"
./server.sh verify-vlm-event-explanation-hints
```

`--case line-crossing-person-ko`로 한 사례만 생성할 수 있다. 생성기는 JSON을 stdout에도
출력한다. `review-required` 자체를 프로세스 실패로 바꾸지는 않으므로 report 상태를 읽어야 한다.
검증기는 기대 결과 불일치 시 exit 1이다. 기능 연결은 EVT-028·EVT-031·LAB-041이다.

출력에는 raw prompt/provider response·credential·source URL·raw frame을 넣지 않는다.
고정 redaction flag는 임의 fixture 문자열의 비밀을 자동 탐지했다는 뜻이 아니다.
모델/runtime/provider 호출·다운로드·sidecar 쓰기·자동 Rule/Profile 적용·viewer/client 노출과
Event POST/WebRTC DataChannel/SSE/WS schema·RTSP/WebRTC 경로 변경은 하지 않는다.
실행 승인과 결과 보존은 [검증 정책](stream-verification.md#검증-정책),
실제 UI 판정은 [UI 풀테스트](manual-ui-fulltest.md)를 따른다.
