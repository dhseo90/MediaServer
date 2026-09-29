# 저장된 VLM 요약의 검색 후보

개발자가 [observation sidecar](vlm-observation-sidecar.md)에 저장된 텍스트를 검색 후보로
제공하는 계약이다. 현재 구현은 `sidecar-summary-token-candidate`이며 임베딩·vector index나
자연어 영상 검색 엔진이 아니다. 운영자는 Ops incident memory에서 후보를 수동 검토할 수 있다.

## 검색 방식과 결과

[vlm_observation_store.cpp](../src/analysis/vlm_observation_store.cpp)의
`SummarySearchTerms/MatchedSearchTerms/BuildVlmSummarySearchCandidatesJson`이 기준이다.
query를 ASCII 소문자·공백 기준으로 정규화해 중복 없는 최대 16개 term으로 나누고
sidecar 텍스트의 부분 문자열과 비교한다. 힌트·질문 배열까지 읽기 위한 절충으로
observation JSON 한 줄 전체도 검색하므로 내용 외 key/metadata가 일치할 수 있다.

한 term 이상 일치하면 후보이며 `matchScore=일치 term 수/전체 term 수`다.
점수 내림차순, 동점이면 저장 행 순서로 정렬한다. `sourceId/privacyMode` 필터와
offset/limit을 사용하며 builder의 limit은 기본 25, 최대 100이다.
빈 query는 오류, 파일 부재는 `fileExists=false`의 빈 후보 결과로 구분한다.

| 필드 | 계약 |
| --- | --- |
| 응답 schema | `media-server.vlm-summary-search-candidates.v1` |
| 후보 schema | `media-server.vlm-summary-search-candidate.v1` |
| `searchMode` | `sidecar-summary-token-candidate` |
| `candidateStatus` | `candidate-only-not-product-search` |
| `correlationKey` | `eventId` |
| `contract` | 자동 적용·외부 payload 변경·runtime 호출을 하지 않는 후보 경계 |
| 검색·페이지 | `query/queryTerms[]/candidates[]/matchedTerms[]/matchScore`, `offset/limit/nextOffset/matchedCandidates/hasMore/truncated/skippedCorruptLines` |

기존 `summary/eventExplanation/falsePositiveHints[]/operatorReviewQuestions[]`를 사용하고
EventRecord에는 결과를 복사하지 않는다. 기본 fixture 질문은 `문 근처에서 멈춘 사람`이다.
fallback은 eventId/sourceId로 좁힌 sidecar 조회와 Ops 수동 검토다.
`vector-index-candidate`·`provider-rerank-candidate`는 대안으로 남지만 이 builder는 실행하지 않는다.

## 현재 Ops 연결

[webrtc_http_server_ops_incidents.cpp](../src/ingress/webrtc_http_server_ops_incidents.cpp)의
`OpsVlmSummaryCandidateReviewJson`은 incident memory에
`media-server.ops.vlm-summary-candidate-review.v1`을 붙인다.
`candidateStatus=ops-manual-review-not-auto-applied`이며 기존 report를 `sourceCandidateReport`에
담는다. 검색어가 없거나 report 생성에 실패하면 해당 값은 null이고 오류를 따로 표시한다.
현재 wrapper는 최대 6개 후보를 요청한다.

`/ops/events`는 Ops 진단·검토 경로이지 primary nav 항목이 아니다.
Ops operator/admin·`ops:read` 경계 안에서 검토하며 viewer/client 검색 화면은 제공하지 않는다.
현행 Ops wrapper가 있다는 사실과 범용 제품 semantic search 미구현은 구분한다.

## 안전·검증 경계

새 모델/runtime/provider/artifact를 추가하지 않는다. 기존 profile의 license/provenance와
[privacy guard](vlm-privacy-transfer-guard.md)를 유지하며 raw prompt/provider response·credential·
source URL·raw frame을 후보 자료에 넣지 않는다. builder의 contract flag는 임의 sidecar 입력을
자동 정제했다는 보증이 아니므로 [저장 전 정제 책임](vlm-observation-sidecar.md#입력-정제-책임)을 따른다.
runtime 재질의·cloud rerank·자동 Rule/Profile 적용은 하지 않고 기존 EventRecord/Event POST/
WebRTC DataChannel/SSE/WS·RTSP/WebRTC 경로를 유지한다.
규칙 후보는 [별도 수동 draft 계약](vlm-rule-suggestion-candidates.md)이다.

```bash
./server.sh verify-vlm-summary-search-candidates
./server.sh verify-v260-incident-memory-productization
./server.sh verify-analysis-state
./server.sh verify-ops-client-ui
./server.sh verify-event-post
./server.sh verify-ws-metadata
```

[fixture](../test/fixtures/vlm_summary_search/cases.json)는
`media-server.vlm-summary-search-fixtures.v1`, 사례는 `door-stop-person`이다.
후보 검증기는 fixture 계산·C++ source/smoke 연결을 읽는 정적 검사(EVT-032·LAB-054)이며,
Lab API 경로의 LAB-043 검증은 별도 명령이다. 실제 C++ 조회는 `verify-analysis-state`,
브라우저·인증·외부 payload는 각 영향 검사 범위를 따른다.
[검증 정책](stream-verification.md#검증-정책)과 [UI 풀테스트](manual-ui-fulltest.md)에 따라
미실행을 구분하며 검색 의미 품질·vector/rerank 품질·장시간 완료를 주장하지 않는다.
