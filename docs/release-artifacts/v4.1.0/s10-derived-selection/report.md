# S10 3C-5.1 내부 구간 대응·선택 실행 기록

독자: 현재 브랜치 개발·검토 담당자. lifecycle: v4.1.0의 3C-5.1 구현 증거.
정책 source-of-truth는 AGENTS.md, 실행 정의/결과 색인은 `docs/release-test-records.md`다.
이 기록은 원본 시간 후보 선택과 실제 decoder→분석 전달 검증이며 실제 파생 출력·재생·내구 작업·S11 완료 증거가 아니다.

## 구현 범위와 경계

- `TimestampAssociationHistory::ResolveDuration`은 유일한 exact timestamp 연관에 저장된 원본 duration만 반환한다. nearest/fallback/PTS·duration 부재를 발명하지 않는다.
- `RawVideoDecoder::PullLoop`는 기존 숫자 복원·정규화의 결과를 그대로 두고 원본 duration을 내부 frame에 전달한다.
- `AnalysisManager::HandleFrame`는 sampling 전에 모든 decoder callback을 tap 소유 collector에 넣는다. queue에는 decoded sequence만 추가한다.
- worker의 기존 rollback 판단에서 namespace 최소 sequence를 고정하고 동일 tap mutex 아래 `BeginNamespace`를 호출한다. 기존 namespace 판단/threshold는 바꾸지 않았다.
- worker가 결과 namespace를 확정한 뒤 snapshot을 한 번 생성한다. 최소 sequence 이전과 queued sequence 이후 frame을 제외한다. snapshot은 live observer/event/latest에만 전달하며 512-entry history 복사본에서는 신규 pointer만 제거한다.
- `SelectDerivedRecording`은 불변 reference, 분석 snapshot, 검증된 segment/binding 후보, 동일 조회 기준의 UTC range를 받는 내부 순수 선택 API다. 원본 request/pre/post를 보존하고 반열림 ns 변환에 overflow 검사를 적용한다. UTC mapping과 uncertainty·복수후보·unplaced를 유지한다.
- 결과 `DerivedRecordingSelection`/`DerivedSelectionSlice`/`DerivedSelectionCandidate`는 요청·source/store/epoch/order/track/ordinal·원본 PTS·segment 크기/checksum 후보를 담는다. 이는 파일 hash 재검증/원본 AU payload 동일성/decoded frame identity/재생 가능성의 보장이 아니다.
- catalog 공급 adapter와 실제 bridge 생성 호출, 직렬화된 job/attempt/provenance/예약/ready 원장은 3C-5.2~5.4의 남은 범위다. 현재 실제 bridge는 기존 consumer reference pending을 유지하므로 3C-5 전체 완료가 아니다.

`RecordingConsumerReferenceV1`, EventRecord, SSE/WS/DataChannel, decoder Normalize/숫자 PTS 복원, 기존 writer/journal/schema는 변경하지 않았다.
runtime의 공개 Event metadata 동일성(C112)과 consumer connection 공개 결과/legacy fallback(C418)을 실제 재검증했다.
기존 observation projector는 AnalysisResult 전체를 저장하지 않고 observation/reference로 축약한다. 외부 소유 observer가 pointer를 장기 보관하는 경우 그 수명/상한은 소비자 책임이다.

## 선택 제약·상한

| 대상 | 실제 동작/경계 |
| --- | --- |
| media-pts-ms | namespace와 source generation/order/track가 일치하고 exact 숫자 PTS·원본 duration이 증명하는 구간의 union만 선택한다. 한 점 offset 외삽/표본 사이 보간은 없다 |
| duration 없음 | 원본 PTS가 있어도 구간 대응 미확인이다. FPS·DTS 간격·다음 PTS로 끝을 만들지 않는다 |
| 불완전 source/binding | 요청 source/channel에 해당하는 손상 후보는 정상 후보 한 개로 숨기지 않고 Unknown을 유지한다 |
| epoch | 후보의 epoch를 그대로 보존한다. 다른 epoch를 하나의 출력으로 합치는 기능은 없다 |
| Gap/AwaitingPostRoll | 현재 직접 증거가 없어 반환하지 않는다. read-service mapping Gap/마지막 관측 PTS는 영상 공백/신뢰된 watermark가 아니므로 Unknown이다 |
| bounded collector | frame 4096개. 소실된 범위는 incomplete/discarded_end에 남기고 요청이 그 범위에 걸치면 Unknown이다 |
| namespace reset | 이전 namespace frame/eviction을 종료한다. 새 namespace가 다시 4096개를 넘겨도 과거 큰 PTS가 섞이지 않으며 최근 작은 구간은 선택 가능(D21) |
| reset 전 새 namespace 자료도 이미 소실 | min sequence 이후 자료의 복원이 불가하면 그 namespace는 명시 incomplete로 남고 시간 선택을 확정하지 않는다. 다음 실제 namespace reset이 회복 조건이며 인위적 reset/성공 절단은 하지 않는다 |
| 선택 자원 | 입력 frame 4096, source 256, UTC slice/unplaced 각4096, 결과 candidate4096, 작업 iteration200만 상한. 초과는 명시 오류이며 부분 성공으로 자르지 않는다 |
| 정상 길이 한계 | 현재 nested scan이므로 약1400frame 수준에서도 경계 수/후보 수에 따라 작업 상한에 도달할 수 있다. 4096-frame 요청 전체 지원을 주장하지 않는다. 보편적 pre/post 길이·장시간 이벤트 지원은 후속 통합에서 확인한다 |
| 파일 검증 | segment checksum/size를 선택 출처로 보존하지만 실제 파일 open/hash/decode를 이 단계에서 수행하지 않는다 |
| snapshot 수명 | queue당4096복사와512 history 장기복제를 피했다. live/latest의 bounded snapshot과 collector만 제품 기본 소유이며 재시작 후 복구 증거는 아직 없다 |

## 실행·실패 이력

| 순서 | 명령/범위 | exit·실제 결과 | 근거/조치 |
| --- | --- | --- | --- |
| 1 | derived-selection focused 준비 | 1; unused private field `incomplete_`가 `-Werror`로 실패 | 예상 RED 아님. stub가 멤버를 읽도록 준비 수정. 소유 S0q5vk root 0 bytes 삭제 확인 |
| 2 | 동일 focused 미구현 | 1; 0 PASS/22 FAIL | [initial-red.log](initial-red.log) |
| 3 | D09 oracle 정정 후 미구현 focused | 1; 0 PASS/22 FAIL | [corrected-red.log](corrected-red.log). UTC mapping을 줄이는 것이 영상공백이 아닌 저장계약 invalid임을 수정 |
| 4 | pure 구현 GREEN | 0; 22/22 | [green22.log](green22.log) |
| 5 | D14~17 추가 예상 RED | 1; 기존22 PASS/신규4 FAIL | 손상 후보 혼재·queued sequence·namespace eviction·duration전달 assertion. 소유 WT1FkG 1,012,168 bytes 삭제 |
| 6 | D14~17 GREEN | 0; 26/26 | 당시 tool 원출력 확인; 소유 i9W96z 1,014,152 bytes 삭제. 최종 focused가 같은 항목을 재검증 |
| 7 | 신규 ABI 선언만 빌드 | 0; build100% | `cmake --build build-gst-onnx -j2`; 연결 전 runtime RED를 위한 빌드 |
| 8 | 실제 runtime 연결 전 RED | 1; 기존15 PASS/신규4 FAIL | [runtime-red.log](runtime-red.log); 파생영상/서버 없이 실제 VP8 decoder/manager |
| 9 | decoder/manager 연결 후 build/runtime | 0; runtime19/19+cleanup | [runtimegreen.log](runtimegreen.log); 후속 D21 전 범위 증거 |
| 10 | D21 추가 예상 RED | 1; 기존26 PASS/신규1 FAIL | [d21red.log](d21red.log); 이전 큰 PTS의 재eviction 재등장 |
| 11 | BeginNamespace 보완 | 0; 27/27 | [finalfocused.log](finalfocused.log); D21 최근 구간 선택 assertion 보강 전 경계 확인 |
| 12 | 최종 focused·실제 runtime | 0; focused27/27, runtime19/19+cleanup | [finalfocused2.log](finalfocused2.log), [finalruntime.log](finalruntime.log). D21 실제 최근 작은 구간 선택 포함 |
| 13 | 최종 build | 0; 100% | [finalbuild.log](finalbuild.log) |
| 14 | range/reference/connection/association | 모두0; 16/19/22/10 PASS | 각각 아래 전수표와 원출력 |
| 15 | `git diff --check` | 0; 출력 없음 | 최종 제품/테스트 diff 확인. 문서 마무리 후 메인이 최종 확인 가능 |

초기 준비 실패와 D14~17 중간 실행, 중간 build의 원출력 전체는 이 디렉터리에 별도 파일로 보존하지 못했고 도구 응답/위 실제 수치로 기록한다. 추정 원출력을 복원하지 않는다.
이 중간 자료를 최종 PASS 증거로 사용하지 않으며 최종 소스의 focused/runtime/영향 회귀 원출력 전수는 모두 보존했다.

token start/end/consumed: 미집계(서브에이전트 도구가 해당 집계를 제공하지 않음).
elapsed/source: focused 최종2초, range6초, reference4초, connection6초, association1초는 각 runner SECONDS 원출력이다.
runtime/build의 전체 elapsed는 기존 runner가 출력하지 않아 미집계다. 도구 poll 대기 시간을 전체 실행 시간으로 바꾸지 않았다.
환경: macOS Darwin25.6.0 arm64, 기존 `build-gst-onnx`와 기존 GStreamer/SQLite/OpenSSL 의존성. 새 의존성 설치 없음.
검증 소스의 기준 HEAD와 변경 코드/fixture SHA-256은 [source.sha256](source.sha256)에 보존했다. 첫 행은 HEAD, 이후 행은 파일 SHA-256이다.

## 개별 실행 결과 전수

대표만 기록하지 않고 최종 원출력의 모든 PASS/개별 detail 행을 아래에 보존한다.
runtime 제품 assertion19개와 별도 임시 cleanup1개를 구분한다. reference의 C356 replay detail10개도 보존했다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| D01 callback 누적·불변 snapshot | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D02 유효0·fallback·duration/원본부재 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D04 exact union 정상 선택·파일식별 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D03 pre/post·음수요청 보존 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D03 ns 변환 overflow 거부 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D05 한점 외삽 금지 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D06 namespace 격리 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D06 generation 합성 금지 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D06 track 합성 금지 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D07 중복 PTS 모호성 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D07 복수 원본 후보 보존 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D08 cap 초과범위 미확인 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D09 삭제 원본 구분 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D09 불완전 mapping을 영상공백으로 승격 금지 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D09 epoch identity 유지 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D11 비표현 유리수 잔차 거부 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D12 watermark 없는 postroll 미확인 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D13 source/channel 결박 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D13 checksum 없는 원본 거부 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D10 UTC 품질·불확실성 유지 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D10 UTC 역행 복수후보 보존 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D10 UTC unplaced 차단 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D14 정상후보가 손상후보를 숨기지 않음 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D15 queued sequence 미래제외 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D16 namespace reset 과거eviction 격리 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D17 decoder exact duration·fallback 격리 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| D21 namespace reset 이후 재eviction 최근작은구간 선택 | `bash scripts/internal/verify_recording_derived_selection.sh`; exit 0; [finalfocused2.log](finalfocused2.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-configured-interval | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-status-limited-scope | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-status-global-scope | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-real-vp8-fixture | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-attach | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-observer-exception-isolation | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-tap-lock-reentry | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-live-fanout-unblocked | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| S10-C111 실제 manager 전달 | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-captured-provenance-immutable | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-tracking-disabled-independent | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-built-event-record-observer | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| S10-C112 미관측 입력 기존 동작 | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| S10-D18 실제decoder-manager 직접구간 union 선택 | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| S10-D15 실제 queued sequence 미래제외 | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| S10-D20 live/latest 증거보존·history 신규포인터 제외 | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| S10-D19 실제PTS rollback namespace 증거격리 | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-rollback-and-tap-stop-once | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime-subscriber-cleanup | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| runtime temporary cleanup | `bash scripts/internal/verify_v410_recording_observation_runtime.sh`; exit 0; [finalruntime.log](finalruntime.log) | PASS | 예상 RED 후 해당 GREEN; 시간선택/내부 전달 범위 |
| S10-C201 미디어 구간 mapping 경계 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C202 unknown UTC의 미디어 위치 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C203 미디어 범위 밖 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C204 미확정 끝 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C205 UTC 중첩 mapping | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C206 저장소 경계·결정 순서 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C207 정상 segment 분할 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C208 반열린 구간 경계 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C209 유리수·비정수 경계 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C210 정수 범위 안전성 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C211 UTC 공백·unplaced 구분 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C212 입력 오류 초기화 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C213 삭제·채널 경계 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C214 재시작 SQL·JSONL 동등 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C215 원본 mapping·조회 불변 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| S10-C216 unknown 채널 격리 | `bash scripts/internal/verify_recording_range_resolution.sh`; exit 0; [range.log](range.log) | PASS | 직접 영향 회귀 |
| C341 계약 왕복 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C342 unknown/중복 필드 거부 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C343 ID·종류·소유자 제약 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C344 품질·원본 nullable 조합 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C345 원본 수치·track 경계 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C346 event 요청·시간축 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C347 observation 요청 금지 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C348 요청 음수·역전·padding | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C419 media-pts 초기 요청 원문 왕복 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C420 UTC 초기 요청 원문 왕복 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C421 0·최대 pre 요청 및 오류 경계 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C349 미지원 schema 거부 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C350 실제 원장 저장·조회 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C351 동일 참조 멱등 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C352 동일 ID 충돌 거부 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C353 opt-in·미open 거부 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C354 SQL·JSONL 재시작 동등 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C355 checkpoint 참조 보존 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C356 손상·충돌 replay 선차단 | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 직접 영향 회귀 |
| C356 malformed preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 conflict preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 unknown preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 tail preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 optout preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 entity preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 extra preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 same-id preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 cross-before preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C356 cross-after preserved=true | `bash scripts/internal/verify_recording_consumer_reference.sh`; exit 0; [reference.log](reference.log) | PASS | 개별 replay 보존 상세 |
| C401 관측·참조 원자 저장 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C402 쌍 identity 불일치 거부 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C403 동일 원본 재전달·event 병합 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C405 SQL·JSONL·checkpoint 쌍 복구 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C404 다른 원본 동일PTS 구분 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C406 실제 OnResult 원본 참조 저장 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C407 OnEvent 강제 표본 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C408 종료track 과거참조 보존 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C409 종료track 참조부재 unknown | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C410 sampling·queue·StopAndDrain 회귀 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C411 exact·미색인 복수 후보 보존 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C412 nearest/ambiguous/unavailable 미승격 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C413 UTC unknown·삭제 상태 재판정 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C414 실제 TryResolve 요청참조 저장 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C415 event 재전달·확장·세대 구분 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C416 source/channel 충돌 거부 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C417 같은 원본 미디어 교집합 우선 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C418 공개 결과·구형 fallback 불변 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C422 실제 bridge 초기 pre-roll 수락·pending 유지 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C423 초기 요청 멱등·갱신·generation 분리 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C424 초기 요청 SQL·JSONL 복구 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| C425 초기 요청 checkpoint 복구 | `bash scripts/internal/verify_recording_consumer_connection.sh`; exit 0; [connection.log](connection.log) | PASS | 직접 영향 회귀 |
| S10-C101 유일 timestamp 연관 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C102 최근접 추정 분리 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C103 중복 timestamp 모호성 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C104 원본 미관측 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C105 출력 PTS 부재 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C106 원본 PTS 부재·범위 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C107 bounded 이력 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C108 충돌·동일 입력 재전달 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C109 세대·track 분리 | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |
| S10-C110 자체 영상 실제 decoder | `bash scripts/internal/verify_recording_frame_correlation.sh`; exit 0; [association.log](association.log) | PASS | 직접 영향 회귀 |

## cleanup

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-selection.jS5SSV` | fixture binary/store | 1015416 bytes | runner 삭제 | 부재 확인 | [finalfocused2.log](finalfocused2.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-range.kMLbW3` | fixture binary/store | 3779242 bytes | runner 삭제 | 부재 확인 | [range.log](range.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.br2e0t` | fixture binary/store | 3504765 bytes | runner 삭제 | 부재 확인 | [reference.log](reference.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-connection.jB9RvN` | fixture binary/store | 4560948 bytes | runner 삭제 | 부재 확인 | [connection.log](connection.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-frame-correlation.YVXXlI` | fixture binary/store | 273656 bytes | runner 삭제 | 부재 확인 | [association.log](association.log) |
| `TMPDIR/media-server-s07-runtime.XSu8Ti` | runtime binary/격리 저장소 | 6272 KiB (du -sk) | 기존 runner trap 삭제 | 부재 확인 | [finalruntime.log](finalruntime.log) |
| `TMPDIR/media-server-s07-runtime.DBFvXq` | runtime RED | 6252 KiB | runner 삭제 | 부재 확인 | [runtime-red.log](runtime-red.log) |
| `TMPDIR/media-server-s07-runtime.4H6VzH` | runtime 중간 GREEN | 6272 KiB | runner 삭제 | 부재 확인 | [runtimegreen.log](runtimegreen.log) |
| `TMPDIR/media-server-derived-selection.S0q5vk` | 준비 실패 | 0 bytes | runner 삭제 | 부재 확인 | 실제 실패 tool 응답 |
| `TMPDIR/media-server-derived-selection.dVry59` | 최초 RED | 759672 bytes | runner 삭제 | 부재 확인 | [initial-red.log](initial-red.log) |
| `TMPDIR/media-server-derived-selection.mIpg3u` | oracle 정정 RED | 759672 bytes | runner 삭제 | 부재 확인 | [corrected-red.log](corrected-red.log) |
| `TMPDIR/media-server-derived-selection.2mDLJ4` | 최초 GREEN22 | 947880 bytes | runner 삭제 | 부재 확인 | [green22.log](green22.log) |
| `TMPDIR/media-server-derived-selection.WT1FkG` | 추가 RED4 | 1012168 bytes | runner 삭제 | 부재 확인 | 실제 tool 응답 |
| `TMPDIR/media-server-derived-selection.i9W96z` | GREEN26 | 1014152 bytes | runner 삭제 | 부재 확인 | 실제 tool 응답 |
| `TMPDIR/media-server-derived-selection.iPzKsi` | D21 RED | 1014344 bytes | runner 삭제 | 부재 확인 | [d21red.log](d21red.log) |
| `TMPDIR/media-server-derived-selection.HIjW3N` | D21 중간 GREEN | 1015320 bytes | runner 삭제 | 부재 확인 | [finalfocused.log](finalfocused.log) |
| 본 디렉터리의 log/report | 비민감 최소 증거 | Git 추적 대상 작은 텍스트 | 보존 | 임시 원본 미디어 없음 | 재현 명령·실패·전수판정 보존 |
| `build-gst-onnx` | 기존 개발 build cache | 기존 저장소 산출물 | 유지 | 작업 전용 임시 root 아님 | 승인된 기존 build |

서버/port/browser는 생성하지 않았으며 raw media/credential을 evidence로 복사하지 않았다. 모든 생성 fixture root의 삭제가 확인됐다.
문서 마무리 시 read-only `lstat`으로 위 소유 임시 root 16개를 다시 대조했고 모두 ENOENT였다(exit0). `git diff --check`도 출력 없이 exit0이었다.

## 미실행·완료 경계

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 3C-5.2 실제 출력 | remux/seek/decode/AU 출처 | 이번5.1 밖 | 생성·재생 PASS 아님 |
| 3C-5.3 내구 작업 | job/attempt 보호·예약·ready 복구 | 이번5.1 밖 | 재시작 복구 PASS 아님 |
| 3C-5.4 bridge 통합 | 실제 event→파생 출력 | 이번5.1 밖 | 기존 pending을 전체3C-5 완료로 보고하지 않음 |
| 30분/120분/UI/S11 | 최종 장시간·실제UI | 별도 승인/후속 판단 | 실행하지 않음 |
| commit/push | 외부 Git 변경 | 메인 담당 | 이 담당자는 수행하지 않음 |

120분 판정은 조건부 진행이다. S11 최종 cut에서 내부 decoder 증거 전달과 bounded collector의 영향범위를 대조하며, 이번 실행은 미승인·미실행이다.
