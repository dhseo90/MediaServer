# 3D-3 B 공개 timeline 투영 실행 기록

독자는 이번 구현·검토 담당자다. lifecycle은 이번 개발의 보존 증적이며 정책은 AGENTS,
현재 계약은 S10 설계/계획, 실행 결과 source-of-truth는 중앙 테스트 기록이다.

## 현재 결과와 범위

신규 focused 최종 `B-Regression-FinalFocused.log`는 **38 PASS/0 FAIL**, exit0이다. B 단위의
구현·승인 단기 회귀·증거 정리를 완료했다. 실제 브라우저는 사용자 제외,
HTTP·전송·인증 통합은 후속 D이고 이 B 결과로 대체하지 않는다.

- `recording_timeline.h`: 기존 질의 입력을 유지하며 안정 itemId, known/unplaced 독립 페이지,
  request 축, UTC ns/미디어 PTS, job·catalog·구간 충족·현재 파일 제공 상태를 분리한다.
- `recording_timeline_projection.cpp`: 같은 catalog 잠금의 원본·job·accepted reference·tombstone을
  compact 값으로 투영한다. 파일 제공 검사는 잠금 밖에서 A의 안전 FD/physical/hash 경계를 사용하며
  같은 출력은 질의당 한 번 검사한다. 완료 당시 상태만으로 현재 가용성을 주장하지 않는다.
- 이벤트 시간은 내구 intent 원본 UTC mapping과 실제 AU original PTS/file duration 합집합의 교집합이다.
  매핑 고정 timebase와 UTC span이 다르거나 정확히 ns로 환산되지 않으면 unplaced로 남긴다.
  원본 UTC를 출력 segment epoch에 복사하거나 양끝 비율로 늘이거나 줄이지 않는다.
- 원본 숨김은 같은 source/store/epoch/segment의 confirmed 요청과 실제 제공 가능한 AU 구간이
  원본 mapping 행 전체를 덮을 때만 표시한다. 부분 중첩은 원본을 유지하며 정확한 원본 ns 구간을 반환한다.
  관련 출력 전체 대조 후 페이지를 자르므로 페이지 밖 이벤트도 동일 기준이다.
- 관련 known 최대4096행, 보수적 snapshot/작업공간64MiB, unknown count+bounded top(offset+limit),
  응답 append 전64MiB 제한이다. 서로 다른 workspace 제한은 별도로 계상한다.
  이 값은 객체/string 여유를 보수 계상한 논리 예산과 응답 byte 상한이며 프로세스 RSS64MiB 보장이 아니다.
  무관한 known 역사4352개가 짧은 질의를 막지 않으며 unknown35074개 첫 페이지도 허용했다.
  깊은 unknown offset의64MiB 초과는 잘린 성공 대신503/조회 실패다.
- `recording_application_service.cpp`: 입력 문법400/권한403/조회 실패503, 시간64비트 문자열 또는 null,
  허용된 응답 필드만 직렬화한다. raw source/store/epoch/path/hash/job/AU JSON은 노출하지 않는다.
- read_service 직접 컴파일 runner11개에 새 TU를 독립 한 줄로 연결했다. 기존 V1 read-model 경로는 유지한다.

## 테스트 입력의 증명 경계

정상/부분 출력은 자체 H264→실제 managed writer→실제 DerivedJobService MPEGTS 결과를 사용한다.
선택의 decoded interval은 packet 기반 fixture이며 AnalysisManager 전체 경로 검사로 표현하지 않는다.
UTC0/64비트/복수 mapping/상한·불일치 metadata는 정상 파일을 복사한 명시적 metadata fixture다.
실제 writer가 그러한 UTC 값을 관측하거나 대용량 영상을 생산했다는 증거가 아니다.
원본 삭제 뒤 이벤트 시각은 durable source mapping에서 투영한 `source-utc-mapping`이며 출력 직접 UTC가 아니다.
unknown 파일이 제공 가능하더라도 조회 시간 귀속이나 영상의 특정 위치 seek를 보장하지 않는다.

## 실패·준비 이력

| 실행 | 결과 | 판정과 원인 |
| --- | --- | --- |
| B-ExpectedRed | exit1, C++ 준비 오류 | fixture의 존재하지 않는 status_code 사용. 실제 expected RED 아님 |
| B-ExpectedRedFixed | exit1,0 PASS/1 FAIL | 사전 특정 V2 원본 조회/새 응답 부재 RED |
| B-FirstGreen | exit0,1 PASS | 기본 원본 투영 구현 |
| B-MappingRed | exit1,1 PASS/2 FAIL | 사전 추가 고정 축 mismatch/non-integral assertion RED |
| B-Extended | exit0,21 PASS | 고정 축·tombstone·문법400 및 실제 출력/겹침 경계 |
| B-Boundaries | exit0,29 PASS | 64비트/복수 mapping/독립 페이지/관련4096 상한 |
| B-OutputBoundaries | exit1,제품 미실행 | 메인 동시 C UI 변경 뒤 build freshness 선수조건 실패, temp 생성 전 |
| B-OutputBoundariesRetry | exit1,제품 미실행 | fixture FailDerivedJobAfterCleanup의 attempt_id 인자 누락 컴파일 오류; 소유 temp0bytes 정리 |
| B-OutputBoundariesFixed | exit0,34 PASS | 실제 partial 출력 mismatch·Failed·다른 계보·동일size 변조 포함 |
| B-BoundedFocused | exit0,36 PASS | unknown35074 첫 페이지와64MiB deep workspace 거부 포함 |
| B-Regression-Event | exit1 | C++158 PASS, 등록기35 PASS, application6 PASS 뒤 기존 종료 순서 oracle1 FAIL. 메인 원인 판단으로 회수, 후속 회귀 중단 |
| B-CompositionFixed | exit0,28 PASS | 기존6+4경로+18변형. 이후 application-only exact 등록7개와 분리하기 전 중간 검사 |
| B-Regression-EventFixed | exit1,제품 미실행 | 구형 S05 I27 literal check 이름 결박으로 등록기 준비 실패·temp0bytes 정리 |
| B-CompositionSelfTestFinal / B-CompositionFinal | exit0,22/7 PASS | 별도4경로+18변형 exact22, 일반 application-only 기존6+통합1 exact7. ID/개수/strict 결과집합 유지 |
| B-Regression-EventFinal | exit1 | C++158·등록35·application7 PASS 뒤 중첩 Node의 derived worker/job 링크 누락. 실제5 runtime 프로세스 미실행, inner/outer temp 정리 |
| B-EventRuntimeFixed | exit0 | Node 직접 compile 의존 TU/gst-video 보완 후 기존5프로세스·2음성 대조 유지. elapsed37714ms·소유 temp 정리 |

원출력은 이 디렉터리의 동명 `.log` 파일에 직접 capture했다. 과거 실패를 최종 PASS로 지우지 않는다.
회귀 명령/exit/elapsed는 [B-Regression-commands](B-Regression-commands.jsonl)에 보존한다.

## 최종 명령과 전수 판정

| 실제 명령 | exit | 개별 결과 | 원출력 |
| --- | --- | --- | --- |
| `./server.sh build` | 0 | 제품 build, assertion 수와 별도 | [B-BoundedBuild](B-BoundedBuild.log); 앞선 First/Mapping/Extended/OutputPreparation build도 각각 exit0 |
| `bash scripts/internal/verify_recording_public_timeline.sh` | 0 | 38 PASS/0 FAIL,34.608s | [최종 focused](B-Regression-FinalFocused.log) |
| `bash scripts/internal/verify_v410_recording_timeline.sh --read-model` | 0 | 166 PASS,cleanup1별도 | [LegacyTimeline](B-Regression-LegacyTimeline.log) |
| `bash scripts/internal/verify_recording_location_resolution.sh` | 0 | 14 PASS | [Location](B-Regression-Location.log) |
| `bash scripts/internal/verify_recording_source_binding.sh` | 0 | 20 PASS | [SourceBinding](B-Regression-SourceBinding.log) |
| `bash scripts/internal/verify_recording_consumer_reference.sh` | 0 | 19 PASS | [Reference](B-Regression-Reference.log) |
| `bash scripts/internal/verify_recording_retention_v2.sh` | 0 | 24 PASS | [Retention](B-Regression-Retention.log) |
| `bash scripts/internal/verify_v410_recording_finalize_recovery.sh --integration` | 0 | 140 PASS | [Finalize](B-Regression-Finalize.log) |
| `bash scripts/internal/verify_recording_range_resolution.sh` | 0 | 16 PASS | [Range](B-Regression-Range.log) |
| `bash scripts/internal/verify_recording_consumer_connection.sh` | 0 | 22 PASS | [Connection](B-Regression-Connection.log) |
| `bash scripts/internal/verify_v410_event_recording.sh` | 0 | C++158+application7+runtime23+음성2 PASS, 등록기35/정식ID27별도 | [EventClosed](B-Regression-EventClosed.log) |
| `bash scripts/internal/verify_recording_identity.sh` | 0 | 23 PASS | [Identity](B-Regression-Identity.log) |
| `bash scripts/internal/verify_recording_derived_jobs.sh` | 0 | 23 PASS | [Jobs](B-Regression-Jobs.log) |
| `node scripts/internal/verify_v390_event_storage_application_boundary.mjs --composition-self-test` | 0 | exact22 PASS | [구성 자체 검사](B-CompositionSelfTestFinal.log) |
| `git diff --check` | 0 | assertion 합계와 별도 | [B-DiffCheck](B-DiffCheck.log) |
| `shasum -a 256 -c docs/release-artifacts/v4.1.0/s10-public-consumption/B-fingerprints.log` | 0 | 24파일 OK | [FingerprintCheck](B-FingerprintCheck.log) |

최종 focused38+구성 self22+직접 회귀657+등록기35+정식ID27=**779개 판정행**을
[B-results](B-results.md)에 원출력과 일대일 연결했다. 정식 ID/등록기를 제품 assertion으로 중복 승격하지 않는다.
역사적 실행607행은 같은 파일의 별도 절이다. 표 생성 중 escape 오류로 첫 추출이 실패한 이력은
[B-ResultsGenerationError](B-ResultsGenerationError.log)에 보존하고 재생성 후779/607행을 실제 대조했다.
이는 문서 생성 오류이며 제품 검증 실패나 재실행 사유가 아니다. 신규 원출력40파일의 trailing whitespace0은
[B-LogWhitespaceFinal](B-LogWhitespaceFinal.log)에 보존했다. C의 메인 실행29개는 별도 C 보고서이며 B 합계에 넣지 않는다.

## 미실행·정리·계측

브라우저/D08·장시간·외부 입력·운영 저장소는 사용하지 않았다. B 서버/포트/비밀번호/계정 생성 없음.
각 standalone runner는 소유 mktemp 경로를 종료 trap에서 제거하고 결과를 원출력에 남긴다.
[B-cleanup](B-cleanup.md)의 원출력에 기록된 소유 임시경로27개는 모두 실제 부재를 재확인했다.
application boundary 내부 header/app 두 prefix는 개별 경로·삭제 전 크기 원출력 미기록이며,
기존 finally 삭제와 메인의 현재 prefix 잔여0 확인으로 별도 기록했다. 경로/크기를 추정 복원하지 않았다.
[B-fingerprints](B-fingerprints.log)는 변경 제품/신규 fixture/직접 runner/정정한 S05 manifest24개다.
문서 gate는 메인 최신 사용법·계획을 포함해 D 최종 묶음에서 실행한다. A 안전 helper 자체는 B에서 변경하지 않아
인계만을 이유로 A46을 반복하지 않았고, 공유 read/catalog의 직접 링크 경계는 위11개 runner로 확인했다.
token start/end/consumed는 실행별 토큰 계측 도구 부재로 미집계다. elapsed는 runner 또는 Node spawn 측정,
source는 현재 제품/fixture/runner fingerprint로 남긴다. 커밋·푸시는 담당자가 수행하지 않는다.
