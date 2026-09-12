# S10 3C-5.2 실제 H264 파생 remux 실행 보고

독자: v4.1.0 개발·검토 담당자. lifecycle: 이번 내부 기능 단위의 보존 증거. 정책은 AGENTS, 설계는 recording foundation design, 실행 결과 source-of-truth는 중앙 release-test-records다. 이 보고는 publish/ready/작업 원장 또는 S11 완료 판정이 아니다.

## 결과와 범위

FD 전용 `DeriveRecordingH264Remux`를 구현했다. 최종 focused **31개(내부 단발 취소 1+실제 media 30)**, 선택 영향 회귀 27개, 기존 시각 probe 8개가 통과했고 최종 build/diffcheck exit 0이다. 총 개별 검증 66개이며 장시간/UI의 대체가 아니다. 메인 최종 diff 검토 완료를 전달받았으며 커밋은 메인이 수행한다.

| 번호 | 승인 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | confirmed 선택→실제 출력·출처 | 구현·검증 | sourcefile VCL와 출력 VCL 전수 대응, source/output decode visible pixel 일치 | final-evidence.log |
| 2 | 모든 시간축·precision·preroll | 구현·검증 | 원본PTS/filePTS·DTS·duration/stream-time/outputPTS·DTS·duration 및 역산90k 잔차 보존 | DerivedRemuxAu, final-evidence.log |
| 3 | FD 보호·총 byte 상한·취소 | 구현·검증 | 빈 regular O_RDWR, O_APPEND/전체 inode별칭/누락source 거부, pread/pwrite offset 유지, 단조 취소 | R06~R14 |
| 4 | TDD/회귀/증거·정리 | 수행 | RED 이력과 전수 결과·22개 임시 root 부재 보존 | 아래 표·cleanup-verified.log |
| 5 | 기존 writer/공개 계약 불변 | 유지 | writer/decoder/public payload 코드 무변경. 기존 probe helper만 분리 | git diff 및 epoch-fingerprints.log |
| 6 | 커밋·푸시/5.3 착수 금지 | 준수 | 담당자는 미수행. 메인 검토 후 별도 진행 | 이번 인계 |

## 구현과 다음 단위 입력

- `include/recording/recording_derived_remux.h`: request/FD/result/AU/미충족 타입. 입력은 5.1 선택과 segment+binding, caller가 보호한 원본 FD·caller가 마련한 빈 출력 FD 목록이다. `max_output_bytes`는 전체 출력 합계이며 반드시 양수다.
- `src/recording/recording_derived_remux.cpp`: 전체 source/channel·confirmed 후보 폐쇄를 생성 전에 검사한다. 기존 FD inspector로 size/SHA를 확인하고, writer v2_origin=segment.media_start_pts를 차감한 filePTS와 전체 binding timestamp의 일대일 대응을 확인한다.
- `ReadAus`는 실제 MP4 demux와 measured stream-time seek를 수행한다. `Nals`는 AnnexB prefix/정렬 표현을 제외한 VCL NAL 길이+payload 정규형 SHA를 비교한다. decode-order만으로 payload를 동일하다고 하지 않는다.
- `Decode`는 I420 visible component 행만 hash하며 stride/plane padding을 제외한다. `WriteTs`는 remux하며 TS를 다시 demux/decode해 출처를 확인한다.
- `Budget`은 전체 30초 이하 deadline과 thread-safe 비차단 취소 callback을 받는다. 취소는 atomic latch로 단조 고정한다. 원본읽기/poll/pwrite/hash 사이에 확인한다. 기존 inspector 호출은 최대5초 또는 남은 전체 budget이며 그 구간 취소 지연은 최대5초다.
- CMake runtime 연결, 실제 fixture/runner, 기존 time-probe의 Encode/Store 공통 helper를 변경했다. 새 외부 의존성 없음.

5.3은 이 API에 caller 소유·보호 FD를 전달하고 반환된 **전체 outputs 목록**, 원래 selection, unfulfilled, modified/cleanup 책임을 원장화해야 한다. `verified_output`과 `request_fully_satisfied`를 합치면 안 된다. 성공/실패 모두 close/unlink/fsync/publish/ready/catalog mutation은 caller 책임이다. 실패 출력도 이미 쓴 size와 cleanup 필요를 반환하며 일부 성공 파일을 전체 성공으로 승격하지 않는다.

## 시간·품질 판정과 한계

- source binding에는 원본 duration·payload hash가 없다. file duration을 원본 duration으로 복원하지 않는다. actual_original_end_ns의 basis는 `file-duration-on-source-pts-axis`이며 원본 observation 또는 decoded frame identity 증명이 아니다.
- original_association_quality는 전체 filePTS↔binding timestamp 대응이다. sourcefile→output VCL/visible decode 증거는 별도 output_payload_quality다. 품질 필드는 verified 여부와 함께 해석한다.
- TS 90k 값은 GST demux ns에서 역산한 후보다. raw PES 직접 측정이라고 주장하지 않는다. 잔차·fileduration 미충족은 삭제하지 않는다.
- fractional 실제 decoder 경로는 60frame 입력·60decoded를 관측했고 요청 [7000,8001)ms가 30개 confirmed slice로 선택됐다. 1ns 중첩의 가짜 ambiguity는 이 실제 fixture에서 재현되지 않아 5.1 selector를 변경하지 않았다. 분수 remux는 verified=true이나 fileduration 1ns 공백으로 fully=false다.
- B-frame 162×94 fixture는 비영점 원본축·실제 seek·요청보다 앞선 keyframe preroll을 검증했다. B-frame/분할 fixture의 선택 증거는 encoded observation adapter이며 실제 decoder→collector 연결 검증은 fractional D22다.
- 같은 epoch도 source별 독립 출력이다. 이번 실행은 실제 인접 source 3개→TS 3개를 확인했다. 추가 R05에서 실제 writer Stop→Start로 두 epoch의 원본을 만들고 원본3개→독립 TS3개·epoch두개 유지·전체요청 충족을 확인했다. 서로 다른 epoch를 한 파일로 합치는 기능은 없다. 기존 probe C508을 이 remux 검증 대신 사용하지 않았다.
- H264/MP4→video-only MPEGTS만 지원하며 audio는 명시 누락 이유를 반환한다. 재인코딩/여러 source 병합/playlist/기존 UTC EventClipDeriver 변경 없음.
- 상한: source8개, 개별 입력32MiB, 각 demux/decoded AU4096개, 선택 slice4096개, 전체 출력256MiB 이하, 작업30초 이하. 상한 초과는 오류이며 긴 pre/post 범위 전체 지원이라고 하지 않는다. 기존 selector의 작업2백만 상한도 유지된다.
- UTC별 remux, 라이브 job adapter·durable capture·보존과 게시·5.4 소비자는 이번 미구현/미검증이다. 서버·port·외부서비스·운영입력·비밀 사용 없음.

## 실행·실패 이력

명령은 remux 로그마다 `bash scripts/internal/verify_recording_derived_remux.sh`, probe는 `bash scripts/internal/verify_recording_derived_time_probe.sh`, selection은 `bash scripts/internal/verify_recording_derived_selection.sh`다. 원출력은 같은 디렉터리 동명 log다.

| 실행 | exit | 실제 판정과 이력 |
| --- | --- | --- |
| fractional-prep-failure | 1 | 공통 helper의 unused 함수 -Werror. 선수 컴파일 실패이며 RED 아님. 함수 위치 복원 후 진행 |
| fractional-count-initial / fractional-count-probe | 2 / 2 | burst 입력 decoder-count 미충족, 후자 observed0. 제품 RED 아님. PushPacket은 성공했으나 bus 원인 직접 확인 불가. live leaky queue 영향은 추정만 보존 |
| fractionalred | 0 | 입력 duration pacing 후 decoded60·선택 PASS1. 표적 중첩 결함 미재현이며 이름과 달리 RED 아님 |
| remuxred | 1 | not-implemented가 실제 출력 R01을 충족 못함. 사전 지정 예상 RED 1PASS/1FAIL |
| remuxgreen-attempt | 0 | 첫 실제 remux 2PASS |
| closure-red / closure-green | 1 / 0 | 누락 source가 성공으로 승격되는 R11 반례 2PASS/1FAIL→생성 전 검사 3PASS |
| budget-api-compile-preparation | 1 | 신규 callback aggregate 초기화 -Werror, RED 아님. 명시 member 초기화로 수정. 임시 root RnEBsT 0byte 제거. 당시 원출력은 대화 도구 출력에 있으며 별도 원출력 파일 미보존 |
| expanded-green / multi-green / final-focused | 0 / 0 / 0 | 단계별 20/24/26PASS. 현재 최종 증거와 구분 |
| reference-red / final-remux | 1 / 0 | source/channel ref 불일치 26PASS/2FAIL→28PASS |
| probe-regression | 0 | 8PASS summary이나 출력 반환 cap으로 C501~C507 세부 유실. 제품 실패가 아닌 출력보존 누락, 최종 전수 증거로 사용하지 않음 |
| probe-complete | 0 | 재실행 8PASS·전체 packet 측정 105201자 보존 |
| cancel-red | 1 | 단발 true→false callback에서 Check 미거부. 예상 RED 0PASS/1FAIL |
| verified-final | 0 | atomic latch 보완 1+28PASS. 최종과 별도 보존 |
| final-evidence | 0 | epoch 추가 전 단발 취소1+실제media29=30PASS, FAIL0 |
| epoch-final | 1 | epoch fixture의 <set> include 누락 컴파일 준비 오류, 제품 RED 아님. include 추가 |
| epoch-verified | 0 | 최종 단발 취소1+실제media30=31PASS, FAIL0. 두 epoch·원본3개·출력3개 |
| selection-regression | 0 | 직접 선택 회귀27PASS |
| verified-build | 0 | `cmake --build build-gst-onnx -j2`, 최종 latch 제품 build |
| diffcheck | 0 | `git diff --check`, 최종 문서 정리 후 재확인 |
| docs-links(메인 실행) | 0 | `./server.sh verify-docs-links`: markdown242/local links2289/images22/anchors110/indexed76/exclusions157/failures0. 메인 전달 원출력 요약이며 제품 assertion66개와 별도. 서버/임시물 생성 없음 |

## 최종 개별 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| R14 단발 true→false 취소의 단조 고정 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| D22 실제 분수frame 요청 선택 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R01 실제 source-AU→TS-AU payload·decode 일치 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R11 confirmed source 누락은 생성전 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R03 분수 duration 미충족과 검증성공 분리 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R08 양수 byte 상한 필수 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R08 byte 상한 초과 전 중단·partial cleanup | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R09 미지원 codec 명시 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R09 ambiguous 자동 선택 금지 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R11 중복 segment 입력 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R11 reference source 결박 불일치 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R11 reference channel 결박 불일치 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R06 원본·출력 별칭 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R06 O_APPEND 출력 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R07 원본 hash 불일치 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R13 시작 전 취소·쓰기 없음 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R13 유효 전체시간 상한 필수 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R10 unknown 요청 보존·partial 출력 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R06 borrowed FD offset 보존 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R13 출력 후 취소·partial 소유권 보존 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R13 1ms 전체 deadline 초과는 검증성공 아님 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R07 출력 중 원본 변경 재확인 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R02 B-frame 실제 seek·nonzero 원본축 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R04 요청 외 keyframe preroll·GOP 의존 범위 분리 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R12 162×94 visible plane 픽셀 대응 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R05 인접 same-epoch 실제 source별 독립 출력 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R06 output끼리 전체 inode 교차 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R06 다른 source의 원본FD를 출력으로 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R06 다른 segment의 중복 원본FD 거부 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| R08 모든 출력 합계 byte 상한·부분 실패 목록 | remux 실제 assertion; 위 명령 exit0; [epoch-verified.log](epoch-verified.log) | pass | 원출력 개별 행 대조 |
| D01 callback 누적·불변 snapshot | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D02 유효0·fallback·duration/원본부재 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D04 exact union 정상 선택·파일식별 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D03 pre/post·음수요청 보존 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D03 ns 변환 overflow 거부 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D05 한점 외삽 금지 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D06 namespace 격리 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D06 generation 합성 금지 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D06 track 합성 금지 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D07 중복 PTS 모호성 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D07 복수 원본 후보 보존 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D08 cap 초과범위 미확인 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D09 삭제 원본 구분 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D09 불완전 mapping을 영상공백으로 승격 금지 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D09 epoch identity 유지 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D11 비표현 유리수 잔차 거부 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D12 watermark 없는 postroll 미확인 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D13 source/channel 결박 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D13 checksum 없는 원본 거부 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D10 UTC 품질·불확실성 유지 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D10 UTC 역행 복수후보 보존 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D10 UTC unplaced 차단 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D14 정상후보가 손상후보를 숨기지 않음 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D15 queued sequence 미래제외 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D16 namespace reset 과거eviction 격리 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D17 decoder exact duration·fallback 격리 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| D21 namespace reset 이후 재eviction 최근작은구간 선택 | selection 실제 assertion; 위 명령 exit0; [selection-regression.log](selection-regression.log) | pass | 원출력 개별 행 대조 |
| C501 H264 실제 파일 시각 측정 | probe 실제 assertion; 위 명령 exit0; [probe-complete.log](probe-complete.log) | pass | 원출력 개별 행 대조 |
| C502 비영점 원본 시각 측정 | probe 실제 assertion; 위 명령 exit0; [probe-complete.log](probe-complete.log) | pass | 원출력 개별 행 대조 |
| C503 정상 segment 분할 측정 | probe 실제 assertion; 위 명령 exit0; [probe-complete.log](probe-complete.log) | pass | 원출력 개별 행 대조 |
| C504 B-frame decode preroll 측정 | probe 실제 assertion; 위 명령 exit0; [probe-complete.log](probe-complete.log) | pass | 원출력 개별 행 대조 |
| C505 비영점 B-frame 시각 측정 | probe 실제 assertion; 위 명령 exit0; [probe-complete.log](probe-complete.log) | pass | 원출력 개별 행 대조 |
| C506 분수 frame rate 시각 측정 | probe 실제 assertion; 위 명령 exit0; [probe-complete.log](probe-complete.log) | pass | 원출력 개별 행 대조 |
| C507 시계 역행과 미디어 시각 분리 | probe 실제 assertion; 위 명령 exit0; [probe-complete.log](probe-complete.log) | pass | 원출력 개별 행 대조 |
| C508 PTS 초기화 epoch 분리 | probe 실제 assertion; 위 명령 exit0; [probe-complete.log](probe-complete.log) | pass | 원출력 개별 행 대조 |

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| R05 실제 epoch 변경 원본→독립 출력 목록 | remux 실제 writer 재시작 및 출력 epoch 전수 대조; exit0; [epoch-verified.log](epoch-verified.log) | pass | 기존 R05 사전등록 보완 |
| 문서 local links | 메인 실행 verify-docs-links exit0; markdown242/local links2289/images22/anchors110/indexed76/exclusions157/failures0 | pass | 제품 assertion66개와 별도, 서버/temp 없음 |

## 정리 전수

원출력·해시·숫자·실패 이력만 보존하고 원본/출력 media·SQLite·실행파일은 각 runner trap에서 삭제했다. 아래 값은 실제 cleanup 원출력에서 옮겼으며 최종 부재 확인은 [cleanup-verified.log](cleanup-verified.log)다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.A2PqJL | 소유 fixture root | 0 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | fractional-prep-failure |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.Eul9cP | 소유 fixture root | 3595809 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | fractional-count-initial |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.RYzFVH | 소유 fixture root | 3595809 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | fractional-count-probe |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.e3tAd0 | 소유 fixture root | 3627972 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | fractionalred |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.4Nl5RX | 소유 fixture root | 3705892 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | remuxred |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.wZBPzd | 소유 fixture root | 3982536 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | remuxgreen-attempt |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.ws01js | 소유 fixture root | 4004552 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | closure-red |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.5GWZ1A | 소유 fixture root | 3992980 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | closure-green |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.bCRL2z | 소유 fixture root | 4254636 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | expanded-green |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.Lw60Hz | 소유 fixture root | 4554078 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | multi-green |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.HTYQEn | 소유 fixture root | 4624430 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | final-focused |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.M9Uj0f | 소유 fixture root | 4628318 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | reference-red |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.Ps1PtW | 소유 fixture root | 4628278 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | final-remux |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-time.NljU4O | 소유 fixture root | 4799554 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | probe-regression |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-time.Z2lDzg | 소유 fixture root | 4799554 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | probe-complete |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-selection.FePhuB | 소유 fixture root | 1015416 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | selection-regression |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.LZhTXB | 소유 fixture root | 3190544 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | cancel-red |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.5nGbIx | 소유 fixture root | 7818982 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | verified-final |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.5xWz8x | 소유 fixture root | 7819086 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | final-evidence |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.RnEBsT | 소유 fixture root | 0 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | budget-api-compile-preparation |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.tikVWX | 소유 fixture root | 3190544 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | epoch-final |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.TvOX40 | 소유 fixture root | 8104849 bytes | containment 확인 후 재귀 삭제 | 삭제 후 부재 | epoch-verified |

## 환경·측정·미실행

macOS26.6.2(25G83), GStreamer/video1.28.1, HEAD317d5d9796888d7bdc7c14f5f5a557412b166c0f. 최종 원출력 생성일 2026-09-13 KST. 소스별 SHA256은 [epoch-fingerprints.log](epoch-fingerprints.log). 생성 fixture의 sourcefile/output AU hash는 final-evidence.log에 보존하며 비밀/운영영상이 아니다.

| 영역 | 판정 | 실행 상태·증거 경계 |
| --- | --- | --- |
| 안정화 | 진행 대상 | 승인 focused31+selection27+probe8, build·diffcheck만 수행 |
| 30분 | 미진행 | 이번 실행 미승인, 버전 완료 evidence 대체 없음 |
| 120분 | 조건부 진행 | S11 최종cut에서 영향범위 대조, 이번 실행 미승인 |
| UI | 미진행 | backend 내부 FD API에 UI 없어야 정상, 버전 UI 풀테스트는 별도 미실행 |

Token start/end/consumed: 미집계(서브에이전트별 실제 사용량 계측 포트 없음). elapsed는 각 runner의 bash-SECONDS 원출력(최종 remux5초, probe4초, selection2초); source는 실제 runner다. 안정화 증거를 장시간/운영/릴리즈 PASS로 확대하지 않는다. 커밋·푸시 미수행. 푸시 가능: 아니오(메인 최종 검토·승인 커밋 전).
