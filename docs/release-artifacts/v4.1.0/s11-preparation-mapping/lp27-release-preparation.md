# LP27 — 릴리즈 선행 1~4 순차 작업

독자: v4.1.0 개발·검증 담당자. 수명: 이번 선행 작업의 계약·실행 이력.
정책은 AGENTS.md, 결과는 중앙 테스트 기록이 기준이다. LP26의 과거 결과는 덮어쓰지 않는다.
시작 branch `v4.1.0`, HEAD `f4e58b9cb2efbeec43a7e1132da940fce6afd521`, clean/sync.

## 현재 승인: 진단 신뢰성부터 S11 단기 안정화까지 1~5

사용자 최신 요청은 아래 1~5 순차 개발·분할 커밋·조건 충족 시 푸시다. 이전 1~6 표는
과거 실행 상태로 보존한다. `330e48ad`의 진단 자체검사 통과는 실제 로그 형식 전체 대응을
입증하지 못했다. 실제 FFmpeg 8.0.1은 `line='RTSP/1.0 …'`로 출력하지만 기존 parser와
CPD04 fixture는 bare status만 처리했다. 따라서 이전 **진단 완료** 표현을 **부분 완료**로 정정한다.
응답 계수 0은 관측 실패이며 실제 서버 무응답의 증거가 아니다. 과거 제품 실패 원인은 여전히 미확정이다.

| 번호 | 사용자 지시 | 처리 상태 | 결과/완료 기준 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 진단 신뢰성·미재현 기준 | 완료 | CPD24·AST2·실제HTTP8 PASS, RTSP6개 응답/stream 대응·정리 | 아래 진단 신뢰성 결과 |
| 2 | HW-03 마감 | 미실행 | 현재 codec67·ICE8, 정상 종료·정리. 과거 실패 이력은 유지 | HW-A04 |
| 3 | PREP-01 | 미실행 | 초기 ID·복합 요구·ENV12·최종 실행 연결 | LP26 |
| 4 | CLOSE-01·S10 고정 | 미실행 | 구형 사용처·대체 증거·문서 정합·증거 유효성 판정 | roadmap S10 |
| 5 | S11 단기 안정화 | 미실행 | 고정 source의 최종 단기 목록 실제 실행 | roadmap S11·AGENTS7 |

### 미재현 실패의 진행 기준

1. 과거 HTTP `/h264` timeout과 무음 제공기 준비 실패는 historical FAIL/원인 미확정으로 보존한다.
   사용자 권한창 종류를 기억하지 못한 것 자체는 다음 검사 착수의 필수 선수조건이 아니다.
2. 진단의 실제 형식·잘림·오류·비밀 반례와 원래 stdout/exit/deadline을 검증하고,
   실제 HTTP8 한정 검사에서 응답 관측 및 stdout stream 계수가 원래 codec 판정과 대응하는지 확인한다.
   CPD만으로 실제 진단 경로 완료라고 하지 않는다. 이미 유효한 제공기2·prefix28은 반복하지 않는다.
3. 이후 동일 제품/환경의 codec67→ICE8 정식 회귀를 실행한다. 현재 회귀와 종료·정리 통과는
   현재 HW-03 영향 범위를 닫는 근거이며 과거 미재현 원인을 고쳤다는 주장이 아니다.
4. 새 실패는 확보된 진단으로 원인과 영향이 확인된 같은 단계만 보완한다. 원인 미확정·교차 계약이면
   AGENTS8에 따라 중단한다. timeout 확대·검사 삭제·무제한 재실행을 하지 않는다.
5. responseObservation의 not-observed는 **관측 없음**이지 **서버 응답 없음**이 아니다.
   잘림/상한/중단은 incomplete다. request-response correlation·제품 prepare 원인·첫 RTP는
   증거가 없는 한 unknown/미관측으로 유지한다. 진단 trace 모드의 timing 영향도 한계로 남긴다.

CPD19~24는 아래 사전등록 후 실행한다. 먼저 CPD19의 wrapped 200/404/503 계수
`[0,0,0] != [1,1,1]`만 예상 RED로 특정한다. 이외 준비 오류는 예상 RED가 아니다.
단일 Astra/medium 담당자는 Python helper/test만 소유하며 하위 위임 금지다.
main은 정책·실행기·실제 검사·증거·커밋·최종 판정을 맡는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| CPD19 | 실제 응답 형식 | FFmpeg wrapped 200/404/503와 prefix를 고정 class로 집계 | v4.1.0 |
| CPD20 | 분할·잘림 | 모든 chunk 경계와 종료 미완성·행 상한을 구분 | v4.1.0 |
| CPD21 | 관측 부재 | observed/not-observed/incomplete와 실제 무응답 구분 | v4.1.0 |
| CPD22 | 악성 형식 | 임의 wrapper·원문 URL/비밀 반례 거부·비노출 | v4.1.0 |
| CPD23 | stdout stream | 실제 compact stdout의 고정 codec/type 계수, 원래 bytes 보존 | v4.1.0 |
| CPD24 | 원래 판정 | 비0/timeout 및 deadline 유지, 실패를 진단 PASS로 대체 금지 | v4.1.0 |

테스트 영역은 안정화만이다. 30분·실제 UI·120분·외부 릴리즈 작업은 이번 실행 범위 밖이며
릴리즈 필요성은 유지한다. 실제 한정 검사와 전체 회귀는 기존 소유 root·loopback·정리 경계를 사용한다.

### 진단 신뢰성 보완 결과

메인 직접 diff 검토 후 CPD19 예상 RED(exit1·0.080초) → 구현 → CPD01~24 PASS(exit0·0.317초)를 확인했다.
[RED](lp27-response-red.log)·[GREEN](lp27-response-green.log)·[AST](lp27-response-ast.log)는 원본 SHA 동일하게 이관했다.
Python 테스트는 격리 자식만 사용했고 24개 fixture 삭제·부재를 각 행으로 확인했다.
실제 `node scripts/internal/verify_recording_media_impact.mjs --http`는 exit0, 명령25,110ms/전체27,472ms.
[실제 출력](lp27-http-02.log)·[고정 진단](lp27-http-diagnostic-02.jsonl)에 개별 결과·환경·source hash를 보존한다.
6개 RTSP 모두 응답2xx 각각5개, observed, stdout audio/video 각각1, 잘림false, 원래 exit0이다.
이전 인식0이 실제 무응답이 아니라 parser 누락임을 확인했다. 과거20초 실패 원인 해결을 주장하지 않는다.
request-response 상관·첫 RTP·prepare 원인은 여전히 미확정이며 libnice 경고2는 별도 관측이다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| CPD01 normal_stdout_exit | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD02 timeout_124 | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD03 abnormal_exit_preserved | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD04 fixed_trace_fields | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD05 unregistered_trace_unknown | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD06 malicious_material_not_persisted | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD07 output_cap_preparation_failure | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD08 owned_jsonl | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD09 symlink_directory_rejected | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD10 directory_mode_uid_rejected | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD11 file_symlink_mode_rejected | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD12 fields_ordinals_rejected | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD13 diagnostic_failure_preserves_original_exit | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD14 launcher_wait_distinction | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD15 partial_ambiguous_trace_unknown | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD16 default_shell_path_unchanged | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD17 provider_only_valid_config | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD18 provider_only_invalid_mode_config | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD19 actual_wrapped_responses | Python 전체24개·exit0 | PASS | 예상 RED→수정 후 PASS; fixture 삭제·부재 |
| CPD20 chunk_boundaries_and_truncation | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD21 observation_states_distinct | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD22 malicious_wrapper_and_redaction | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD23 compact_stdout_counts_and_preservation | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| CPD24 original_exit_and_timeout_contract | Python 전체24개·exit0 | PASS | 현재 구현 회귀; fixture 삭제·부재 |
| AST helper | ast.parse 실제 코드 | PASS | exit0 |
| AST tests | ast.parse 실제 테스트 | PASS | exit0 |
| HW-MEDIA03 owned server ready, loopback ICE only | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| http_local_h264_aac: RTSP /default -> h264/aac | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| http_local_h264_aac: RTSP /h264 -> h264/aac | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| http_local_h264_aac: RTSP /opus -> h264/opus | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| http_local_h264_aac: WebRTC signaling session created (<redacted>) | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| http_local_h264_video_only: RTSP /default -> h264/aac | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| http_local_h264_video_only: RTSP /h264 -> h264/aac | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| http_local_h264_video_only: RTSP /h265 -> hevc/aac | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| http_local_h264_video_only: WebRTC signaling session created (<redacted>) | 실제 --http·exit0 | PASS | 실제 브라우저 아님 |
| 응답·stdout case1/route1 | 2xx5, observed, audio1/video1, 1.931초 | PASS | 고정 계수만 보존·기존20초 유지 |
| 응답·stdout case1/route2 | 2xx5, observed, audio1/video1, 2.338초 | PASS | 고정 계수만 보존·기존20초 유지 |
| 응답·stdout case1/route3 | 2xx5, observed, audio1/video1, 1.863초 | PASS | 고정 계수만 보존·기존20초 유지 |
| 응답·stdout case2/route1 | 2xx5, observed, audio1/video1, 3.536초 | PASS | 고정 계수만 보존·기존20초 유지 |
| 응답·stdout case2/route2 | 2xx5, observed, audio1/video1, 3.573초 | PASS | 고정 계수만 보존·기존20초 유지 |
| 응답·stdout case2/route3 | 2xx5, observed, audio1/video1, 3.376초 | PASS | 고정 계수만 보존·기존20초 유지 |
| 제품 정상 종료 | exit0·signal null·forced false | PASS | 기존 종료 기준 |
| RTSP port | TCP61302 closed | PASS | 실제 확인 |
| HTTP port | TCP61303 closed | PASS | 실제 확인 |
| 유음 제공기 port | TCP61304 closed | PASS | 실제 확인 |
| 무음 제공기 port | TCP61305 closed | PASS | 실제 확인 |
| STUN 정리 | UDP50281 closed, messages2 | PASS | ICE suite 아님 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR/media-server-hw-media-GZPXg9 | 실행 소유root0700·UID501 | 1,822,390B | 최소 안전증거 이관 후 삭제 | rm0·부재 확인0 | server17005B SHA5d161389c7a6bfb7d2ecc53cd678a12e146b916ad93244bd69d4a1b748e5fd2e |
| /private/tmp/media-server-hw-media-GZPXg9-http_local_h264_aac.http.log | 원시 로그0600·UID501 | 427B | 삭제 | rm0·부재 확인0 | SHA f3795a3d37dd5386bfc105c2db685d8b022929b219b966f7fc661e66763c2eb7 |
| /private/tmp/media-server-hw-media-GZPXg9-http_local_h264_video_only.http.log | 원시 로그0600·UID501 | 471B | 삭제 | rm0·부재 확인0 | SHA9ef251a4f0229774b654c68a2855e2c55b6b213008f9671b86edb65723080d57 |
| TMPDIR/media-server-codec-response-evidence.iv_ccp0o | unit 로그0700·UID501 | 4,534B | RED/GREEN/AST 원본 해시 대조 후 삭제 | rm0·부재 확인0 | 986/3471/77B, 저장소 세 파일과 SHA 동일 |

token start/end/consumed: 전용 집계 없어 미집계. elapsed는 명령 측정치, 실제 UI/장시간/제품수정 없음.

문서 검사: `./server.sh verify-docs-links` exit0·0.046초, md288/link9529/image22/anchor149/fail0.
`git diff --check` exit0·출력0. 테스트 raw 원문 대신 안전한 결과와 해시만 보존했다.

## 최신 승인: 진단 보완부터 S11 단기 안정화까지

사용자1~6 순차 개발·분할커밋·조건충족시push 승인. main은 계약/원인/최종판정,
기존 단일 Astra/medium 담당자는 shell/Python 진단부만 소유하며 하위위임 금지다.
main은 실행기/사전등록/증거와 실제 로컬검사를 맡는다. Superpowers 도구는 이번 환경에 없어
설계·반례검사·원인분리·직접diff검토로 절차를 수행한다.

| 번호 | 사용자 지시 | 처리 상태 | 결과/완료 기준 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 검증 준비·진단 보완 | 당시 완료 보고→부분 완료 정정 | CPD18·HWD4 통과는 실제 wrapped 응답 대응을 입증하지 못함 | 현재 승인·CPD19~24 |
| 2 | 한정 원인 구분 | 한정 실행 완료·원인 미확정 | 제공기2/HTTP8/직전순서28 PASS, 과거 실패 미재현 | HW-A01~03·아래 판정 |
| 3 | 확정원인 보완·HW03마감 | 건너뜀 | 2번 판단 미해소, 추정 제품수정·전체 반복 없음 | HW-A04 |
| 4 | PREP-01 | 건너뜀 | 초기ID/복합요구/ENV12/최종manifest 잔여 | LP26 매핑 |
| 5 | CLOSE-01 | 건너뜀 | 사용처/소유/대체검사·문서·증거·S10고정 잔여 | S10 |
| 6 | S11 최종 단기 안정화 | 건너뜀 | 승인 유지, 선수조건 미충족 | AGENTS7 |
| 7 | 분할commit·조건부push·잔여보고 | 부분 수행 | 1번330e48ad, 이후 미해소/미커밋 보존·push불가 | AGENTS3/5/6 |

불변: ffprobe 인자/codec stdout 판정·원래 timeout(HTTP20초)·launcher40회/0.25초/curl2초 유지.
진단 opt-in에서만 ffprobe trace를 수집해 고정 method/status/track 계수로 변환한다.
첫 RTP를 직접 관측하지 못하면 그 단계를 확정하지 않는다. 내부prepare나디코더원인으로 추정승격금지.
RTSP/GStreamer 기존 lifecycle trace는 검증소유 원시로그 안에서만 읽고 고정진단으로 바꾼다.
공개API/schema/auth/시간/저장/제품선택정책은1번에서 바꾸지 않는다.
진단 파일은 소유0700/0600/no-symlink, 원문URL/session/credential·caps/debug 공개금지.
실패 후 필수진단은cleanup 전확보하고 정리성공으로기능실패를가리지 않는다.
원인이미확정·교차계약이면해당단계에서중단; 새해결정책을자동추가하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 진단도구 자체·한정실제 | 진행 대상 | 사용자1~3 | CPD01~18/HWD01~04/HW-A01~04 | 이번승인,순차 |
| PREP/CLOSE 관련단기 | 진행 대상 | 사용자4~5 | LP26 실행매핑 | 선수통과후정확목록등록 |
| S11 최종안정화 | 진행 대상 | 사용자6 | roadmap S11/AGENTS7 | 이번단기승인,코드고정·최종목록확정후 |
| 30분/실제UI/120분 | 미진행 | 이번1~6밖,릴리즈필수판정유지 | S11/AGENTS7.6 | 이번실행안함·별도승인 |
| 외부서비스/릴리즈action | 미진행 | 이번비범위 | AGENTS4 | 미승인 |

### 진단 준비 사전등록

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| CPD01 | 정상 probe | 원래 codec stdout/exit 보존 | v4.1.0 |
| CPD02 | probe 시간상한 | 기존 deadline/timeout124 유지 | v4.1.0 |
| CPD03 | 비정상 종료 | 원래 비0 exit 보존 | v4.1.0 |
| CPD04 | RTSP 단계 | 허용 method/status·SDP/stream 계수. 요청/응답 대응은 unknown 유지 | v4.1.0 |
| CPD05 | 미등록 trace | unknown으로 남기고 원문미노출 | v4.1.0 |
| CPD06 | 비밀 포함 trace | URL/session/credential canary 비노출 | v4.1.0 |
| CPD07 | 출력 상한 | bounded 준비 실패·미완전결과 PASS금지 | v4.1.0 |
| CPD08 | 정상 진단 경로 | 소유0700 dir/0600 file JSONL | v4.1.0 |
| CPD09 | directory symlink | 거부 | v4.1.0 |
| CPD10 | directory 권한/UID | 거부 | v4.1.0 |
| CPD11 | file symlink/권한 | 거부 | v4.1.0 |
| CPD12 | 진단 입력 형식 | 고정필드·ordinal외 거부 | v4.1.0 |
| CPD13 | 진단 오류 | 기존 비0/timeout 가리지 않음 | v4.1.0 |
| CPD14 | 제공기 상태 | 생존/listen/http/stop wait상태 분리 | v4.1.0 |
| CPD15 | 부분 trace | 모호한순서 unknown | v4.1.0 |
| CPD16 | 기본 경로 불변 | 진단 opt-in 외 기존 probe 인자/기준 | v4.1.0 |
| CPD17 | 제공기 단독 mode | 허용local_http 전용config 수용 | v4.1.0 |
| CPD18 | 제공기 mode 반례 | 잘못된mode/dir누락/외부·혼합config 거부 | v4.1.0 |
| HWD01 | 실행 mode 선택 | providers/http/prefix/run/self-test, 미등록옵션 거부 | v4.1.0 |
| HWD02 | 실행 목록 | provider2·HTTP8·prefix28·full67/ICE8, 외부3 별도 | v4.1.0 |
| HWD03 | 서버 관측 redaction | 고정event/숫자계수만, URL/session/debug본문 비노출 | v4.1.0 |
| HWD04 | 불완전 관측·판정 분리 | 관측상한 명시·첫RTP 추정금지·제공기PASS와제품PASS 분리. 실제 종료/정리는 HW-A에서 확인 | v4.1.0 |
| HW-A01 | 실제 제공기 단독 | 서버 미기동·동일함수로 유음/무음2개 준비와종료 | v4.1.0 |
| HW-A02 | 실제HTTP입력 격리 | 새서버에서HTTP2개 RTSP각3+signaling각1, 총8 | v4.1.0 |
| HW-A03 | 직전 순서 비교 | 필요시 새서버 file2개20→HTTP2개8, 총28. 조건부1회 | v4.1.0 |
| HW-A04 | 관련회귀 마감 | 원인판정후기존codec67/ICE8. 실패하면뒷명령중단 | v4.1.0 |

자체명령: `python3 -B scripts/internal/codec_probe_diagnostics_test.py`,
`bash -n scripts/internal/verify_codec_matrix.sh`,
`node scripts/internal/verify_recording_media_impact.mjs --self-test`.
실제명령: 같은 Node의 `--providers`→`--http`→조건부`--prefix`→마감`--run`.
전체실제마감은원인판정후만진행하고단독PASS로원래실패를폐기하지않는다.
원시증거/registry는소유root에만보관,안전진단·해시·환경·개별결과이관후정리한다.
token start/end/consumed는실제전용집계없으면미집계로남기며각명령elapsed/exit를기록한다.

### 진단 보완 1번 결과

메인이 shell/Python/Node diff를 직접 검토했다. 제품 바이트·검증 timeout·codec 성공 조건은 유지했다.
Node 준비 실패도 finally에서 소유 root를 보고하도록 port 할당을 try 안으로 옮겼다.
18개 CPD fixture는 두 실행 모두 삭제·부재 확인. 보존용 로그 2개는 원본 SHA와 일치한다.
최초 오류는 실제 실패로 보존하며 예상 RED로 바꾸지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| CPD01 정상 stdout·exit | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD02 timeout124 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD03 비정상 exit | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD04 고정 RTSP 계수 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD05 unknown trace | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD06 비밀 비노출 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초 ERROR: macOS 별칭 fixture→realpath 정정; 제품·보안조건 불변 |
| CPD07 출력 상한 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD08 소유 JSONL | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초 ERROR: macOS 별칭 fixture→realpath 정정; 제품·보안조건 불변 |
| CPD09 directory symlink | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD10 directory 권한·UID | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD11 file symlink·권한 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초 ERROR: macOS 별칭 fixture→realpath 정정; 제품·보안조건 불변 |
| CPD12 필드·ordinal | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD13 진단 오류와 원래 exit | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD14 제공기 종료 구분 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD15 부분·모호 trace | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD16 기본 shell 경로 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD17 제공기 전용 정상 구성 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| CPD18 제공기 잘못된 구성 | Python 자체검사 최종 exit0·18검사·0.300초; [원출력](lp27-diag-self-02.log) | PASS | 최초/최종 PASS |
| HWD01 mode | node --self-test, exit0 | PASS | 미등록 옵션 거부 |
| HWD02 목록 | 같은 자체검사 | PASS | 2/8/28/67+8 구분 |
| HWD03 redaction | 같은 자체검사 | PASS | URL/session canary 비노출 |
| HWD04 관측 한계 | 같은 자체검사 | PASS | overflow·첫RTP unknown·provider 판정 분리 |
| Python AST | agent가 두 파일 ast.parse, exit0 | PASS | import 실행 아님 |
| shell 구문 | bash -n scripts/internal/verify_codec_matrix.sh, exit0·0.005초 | PASS | 최초/최종 모두 정상 |
| Node 구문 | node --check scripts/internal/verify_recording_media_impact.mjs, exit0 | PASS | 실제 실행 아님 |
| 등록: dispatch parser recognizes explicit bash and node interpreters | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: server.sh dispatch targets exist and are executable | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: documented server.sh commands resolve to dispatch table | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: tracked scripts are classified and referenced | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: project inventory delegates script file inventory to this verifier | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: project inventory maps verifier families without duplicating dispatch details | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: CMake does not define a separate untracked CTest registry | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: test entry scripts are reachable from test_all | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: auth verifier has no hardcoded test password defaults | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: VA EventRecord dispatch verifier fails early and dispatches every poll by default | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: critical verifier pass output avoids grouped feature-result wording | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 등록: user-facing JS option parsers reject unknown options | verify-script-inventory, 신규 파일 stage 전후 두 번·각 exit0 | PASS | 각12/0, stage 뒤 신규 Python/Node 포함 |
| 문서 링크 | verify-docs-links 최초 exit0·288md/9511links/22images/142anchors; 결과 링크 추가 후 exit0·9513links/144anchors·실패0 | PASS | 파일/앵커 정합, 실제 UI 아님 |
| 공백 | git diff --check 및 --cached --check exit0 | PASS | 변경·stage 모두 확인 |

Node 자체검사4개는 준비정리 경계 이동 전후 두 번 실행, 모두4/0·exit0이다. 별도 wall집계는 없으며
전용 token start/end/consumed도 미제공이다. CPD 원출력은 [최초](lp27-diag-self-01.log)·[최종](lp27-diag-self-02.log).
최초 CPD06/08/11은 canonical directory 양성fixture가 macOS /var 별칭이라 거부된 것이고,
제품 코드나 보안조건을 완화하지 않고 unit root만 realpath로 정정했다.
실제 trace 형식·제공기·RTSP 경로는 다음 2번에서 확인하며 자체검사 PASS로 대체하지 않는다.
보조 프로세스 목록 읽기는 sandbox에서 ps 권한거부(exit127)였으며 제품 검사 FAIL로 분류하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR/media-server-codec-diag-evidence.2287azw8 | 소유0700·unit 원출력4개 | 7,868B·할당12KiB | 두 비어있지 않은 로그 이관·동일 SHA 확인 후 삭제 | rm exit0·test ! -e exit0 | 최종18 fixture 정리도 각 원출력에 보존 |

1번의 실제 서버·포트 생성은 없었다. 위 임시 원본 삭제는 복구 대상으로 남기지 않았으나
필요한 최초 실패/최종 성공 기록은 저장소 로그2개로 보존했다.

### 한정 비교 2번 중간 결과

1번은 `330e48ad`로 커밋했다. 다음 검사는 외부접속·실제브라우저 없이 소유 loopback에서 실행했다.
제공기 단독 2개 PASS 후 HTTP 전용8개 PASS이므로 사전등록된 직전순서 비교 조건을 충족했다.
제품/binary는 HW02와 동일(SHA `2ce43399ce33fd6863a9aa8d0e21e65ae32975ee52ad08d065b09e065aca9fd7`)이다.
과거 두 실패를 현재 단기 PASS만으로 폐기하거나 원인 해결로 처리하지 않는다.
제공기 실행 후 확인된 기존 /tmp launcher log의0644 생성은 실행 프로세스의 umask077로 제한했다.
HTTP 실행에서는 두 로그0600 확인. 사용자 전역 설정·timeout·성공조건은 그대로이며 제품 변경은 없다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-A01 유음 제공기 | --providers, 준비·LISTEN·HTTP0·stop wait143, 실제command exit0·1,633ms | PASS | 첫 준비2회, 제품서버 없음·제품PASS 아님 |
| HW-A01 무음 제공기 | 같은 실행, 준비·LISTEN·HTTP0·stop wait143 | PASS | 첫 준비1회, 과거 준비실패 원인 확정 아님 |
| HW-A02 유음 /default | --http, RTSP codec h264/aac, command exit0·24,653ms | PASS | ffprobe 약1.900초 |
| HW-A02 유음 /h264 | 같은 실행, RTSP codec h264/aac | PASS | ffprobe 약1.845초, 과거20초 실패 미재현 |
| HW-A02 유음 /opus | 같은 실행, RTSP codec h264/opus | PASS | ffprobe 약1.862초 |
| HW-A02 유음 WebRTC | 같은 실행, signaling session 생성·정리 | PASS | 실제 브라우저 영상/ICE PASS 아님 |
| HW-A02 무음 /default | 같은 실행, RTSP codec h264/aac | PASS | ffprobe 약3.550초, 제품 무음입력 처리 |
| HW-A02 무음 /h264 | 같은 실행, RTSP codec h264/aac | PASS | ffprobe 약3.581초 |
| HW-A02 무음 /h265 | 같은 실행, RTSP codec hevc/aac | PASS | ffprobe 약3.358초 |
| HW-A02 무음 WebRTC | 같은 실행, signaling session 생성·정리 | PASS | 실제 브라우저 영상/ICE PASS 아님 |
| HW-A01 포트·정리 | TCP4개 폐쇄·UDP/제품서버 미생성·소유3경로 삭제/부재 exit0 | PASS | 아래 cleanup 표 |
| HW-A02 종료·정리 | 제품 exit0/강제종료false·TCP4개 폐쇄·UDP종료·소유3경로 삭제/부재 exit0 | PASS | 아래 cleanup 표 |

[제공기 원출력](lp27-providers-01.log)·[고정 진단](lp27-providers-diagnostic-01.jsonl),
[HTTP 원출력](lp27-http-01.log)·[고정 진단](lp27-http-diagnostic-01.jsonl)에 모든 결과와 clock·경과·해시를 보존했다.
전체 elapsed는 제공기1,657ms/HTTP26,776ms, token start/end/consumed 전용집계 없음이다.
현재 ffprobe trace에서 method/SDP는 인식했지만 response/stream-line 수는0이다. 이것을 응답없음으로
해석하지 않는다. codec stdout 판정은 별개이며 trace의 미등록 형식은 unknown으로 남았다.
서버 lifecycle은 수신시각+실행내 ordinal이며 첫RTP 직접증거가 아니다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR/media-server-hw-media-DCGIE0 | 제공기 실행소유root | 66,801B | 안전JSONL·출력·해시 보존 후 삭제 | rm0·부재0 | root0700, 제품미기동·TCP60502~60505 폐쇄 |
| /private/tmp/media-server-hw-media-DCGIE0-http_local_h264_aac.http.log | 제공기 원시로그 | 127B | 삭제 | 부재0 | 실행prefix 소유·wait143 |
| /private/tmp/media-server-hw-media-DCGIE0-http_local_h264_video_only.http.log | 제공기 원시로그 | 127B | 삭제 | 부재0 | 실행prefix 소유·wait143 |
| TMPDIR/media-server-hw-media-eWOhuy | HTTP 실행소유root/registry | 1,821,542B | 안전진단·출력·해시 보존 후 삭제 | rm0·부재0 | server16625B SHA915c12e5189384fc2f3417a1c50dd86dc87a91fe8003b8433b4c0b1756151d45 |
| /private/tmp/media-server-hw-media-eWOhuy-http_local_h264_aac.http.log | HTTP 원시로그0600 | 427B | 삭제 | 부재0 | SHA f7e8913403b504813c0f5656afb5294cd3c488525479989f6e23a5593d458c76 |
| /private/tmp/media-server-hw-media-eWOhuy-http_local_h264_video_only.http.log | HTTP 원시로그0600 | 471B | 삭제 | 부재0 | SHA50b2762f839731253718d120f9eb98a574761c7e008005e470691e28fd96431d |

### 2번 판정: 한정 비교 통과와 과거 원인 미확정

[직전순서 비교 원출력](lp27-prefix-01.log)·[RTSP/제공기 고정 진단](lp27-prefix-diagnostic-01.jsonl).
총28개·exit0, 전체90,949ms, 서버정상종료·포트/UDP해제·임시삭제 확인.
같은 binary에서 HTTP /h264는 단독1.845초, 파일검사후2.018초로 기존20초 안에 끝났다.
무음 제공기는 단독/HTTP/직전순서 모두 준비 성공했다. 별도 제품 수정은 하지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-A03 file_local_h264_aac: RTSP /default -> h264/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: RTSP /h264 -> h264/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: RTSP /h265 -> hevc/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: RTSP /opus -> h264/opus | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: RTSP /h265/opus -> hevc/opus | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: RTSP /pcmu -> h264/pcm_mulaw | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: RTSP /h265/pcmu -> hevc/pcm_mulaw | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: RTSP /pcma -> h264/pcm_alaw | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: RTSP /h265/pcma -> hevc/pcm_alaw | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h264_aac: WebRTC signaling session created (<redacted>) | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /default -> h264/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /h264 -> h264/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /h265 -> hevc/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /opus -> h264/opus | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /h265/opus -> hevc/opus | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /pcmu -> h264/pcm_mulaw | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /h265/pcmu -> hevc/pcm_mulaw | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /pcma -> h264/pcm_alaw | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: RTSP /h265/pcma -> hevc/pcm_alaw | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 file_local_h265_aac: WebRTC signaling session created (<redacted>) | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 http_local_h264_aac: RTSP /default -> h264/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 http_local_h264_aac: RTSP /h264 -> h264/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 http_local_h264_aac: RTSP /opus -> h264/opus | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 http_local_h264_aac: WebRTC signaling session created (<redacted>) | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 http_local_h264_video_only: RTSP /default -> h264/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 http_local_h264_video_only: RTSP /h264 -> h264/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 http_local_h264_video_only: RTSP /h265 -> hevc/aac | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A03 http_local_h264_video_only: WebRTC signaling session created (<redacted>) | --prefix, command exit0·88,641ms | PASS | 기존 파일20개→HTTP8개, 실패 재현 없음 |
| HW-A02 제품 준비 | --http health ready, 소유 loopback 서버 | PASS | 원출력 HW-MEDIA03 |
| HW-A03 제품 준비 | --prefix health ready, 소유 loopback 서버 | PASS | 원출력 HW-MEDIA03 |
| HW-A03 제품 종료 | exitCode0·signal null·forced false | PASS | 기존 stopServer 기준 |
| HW-A03 RTSP 포트 | TCP60630 closed=true | PASS | assertPortClosed |
| HW-A03 HTTP 포트 | TCP60631 closed=true | PASS | assertPortClosed |
| HW-A03 유음 제공기 포트 | TCP60632 closed=true | PASS | 준비PID75880·wait143 |
| HW-A03 무음 제공기 포트 | TCP60633 closed=true | PASS | 준비PID75983·wait143 |
| HW-A03 STUN | 소유 UDP54245 종료, message4 | PASS | ICE suite PASS 아님 |
| HW-A03 임시 정리 | 아래 소유3경로 삭제·부재 exit0 | PASS | 최소 진단 보존 후 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR/media-server-hw-media-xtVPFe | 실행소유root/registry | 1,865,643B | 안전진단·출력 보존 후 삭제 | rm0·부재0 | server35721B SHA24bd362e7fdddfb2b276e3e6d7f55d7019df3f1f677c760b5b4115bc9bd11073 |
| /private/tmp/media-server-hw-media-xtVPFe-http_local_h264_aac.http.log | HTTP 원시로그0600 | 427B | 삭제 | 부재0 | SHA821c45b8c9b96629939c6b3f9974f511270e298473a8416164e957bd4ee9fa17 |
| /private/tmp/media-server-hw-media-xtVPFe-http_local_h264_video_only.http.log | HTTP 원시로그0600 | 471B | 삭제 | 부재0 | SHA97b325740f7219c1433081273fde999fa73549394c7025cd28ea6a224b0c4e1f |

결론은 **원인 해결이 아닌 미재현**이다. 직전 파일 순서를 실행했다는 조건만으로 항상 실패하는 것도 아니다.
당시 누락된 PID/LISTEN·RTSP 단계는 사후 복원할 수 없다. 이번 trace opt-in은 실행 시점을 바꿀 수 있으므로
비계측 실행의 타이밍 의존성을 배제하지 못한다. 사용자가 뒤늦게 승인한 시스템 권한창의 앱/권한 종류도
아직 확인되지 않아 권한이 원인이라고 단정하지 않는다. 기억 여부를 비차단 질문으로 요청했다.
HTTP/prefix에서 libnice 경고2/4는 정상결과와 함께 관측됐지만 과거 bad-fd53과 인과는 미확정이다.

AGENTS3.3/8의 원인 미확정 경계에서 2번을 보류한다. 추가 반복·timeout변경·추정 제품 수정 없이
3번 HW03 마감/ICE, 4번 PREP, 5번 CLOSE, 6번 S11 최종안정화는 건너뜀이다.
미재현 상태를 기록한 채 진단을 켠 정식 HW03 회귀로 진행할지, 환경 당시정보를 먼저 확보할지는
사용자 판단 후 정한다. 미재현을 해결완료로 승격하는 조건 변경을 자동 적용하지 않는다.
기존 저장소/이벤트 통합의 PASS는 그대로 해당범위 증거이며 무관한 재검증을 다시 시작하지 않았다.
이번 actual 명령의 token start/end/consumed는 전용집계 미제공, elapsed/source는 각 보존로그다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 결과 문서 링크 최초 | verify-docs-links, exit1·anchor3개 오류 | FAIL | 제목의 가운데점과 링크 slug 불일치, 제품검사 아님 |
| 결과 문서 링크 재검증 | 제목/링크를 같은 한글 문구로 정정 후 verify-docs-links exit0·288md/9521links/22images/146anchors·오류0 | PASS | 최초 실패 보존 |
| 결과 공백 확인 | git diff --check exit0 | PASS | 최초 링크FAIL 직후에도 공백검사를 실행한 순서 누락은 인정. 이후 exit 확인 뒤 순차 실행으로 정정 |

최종 git 직접대조: HEAD330e48ad, origin/v4.1.0=f4e58b9c·ahead3/behind0,
remote main431397d9·v4.1.0 tag없음(이번 ls-remote exit0). 이번 새 커밋은1개이며 기존2개를 포함해3개 미푸시다.
미커밋은 기존 native 회귀2파일, 현재 runner의 소유로그권한 보완, 최신 진단/기록이다.
원인미확정 단계의 완료커밋으로 묶지 않고 보존했다. 푸시 가능: 아니오 / 수행하지 않음.
제품/API/저장/시간/입력지원 변경 없음. 30분/UI/120분과 공개action 미실행.

## 후속 승인: HW-01 → HW-02 → HW-03 → PREP-01 → CLOSE-01

사용자는 원인 재검토 뒤 위 다섯 항목의 순차 개발·분할 커밋·조건 충족 시 마지막 push를 승인했다.
아래 기존 1~4 표와 실행 실패는 이전 실행 이력이다. 소프트웨어 디코더 우선 권고는 확정 해법이
아니며 HW-01의 관측 이후 선택한다. 설치 패키지 변경·전역 rank 변경·장시간·실제 UI·release action은 자동 승인으로 확대하지 않는다.

| 번호 | 사용자 지시 | 처리 상태 | 결과/완료 기준 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | HW-01 원인·영향 확정 | 완료 | burst/paced 모두 EOS 뒤 늦은 callback→역순 finish→시간값 보정 직접 확인 | 진단03·자체07 |
| 2 | HW-02 한정 해결책 | 구현·관련 단기 확인 완료 | exact tuple의 객체별 선택 제한, 자체78·4셀8·build/GST OFF 확인 | HW-02 결과, 영향 마감은 HW-03 |
| 3 | HW-03 반례·영향 회귀 | 부분 완료·FAIL | 자체99·native81 PASS, 기존 codec23 PASS/2 FAIL, ICE건너뜀 | HW-03 실제 미디어 중단 판정 |
| 4 | PREP-01 검증 연결 | 건너뜀 | 초기 exact ID·복합 요구·ENV12·UI/장시간 manifest 연결 잔여 | HW-03 미해소·LP26 현행 매핑 |
| 5 | CLOSE-01 정리·코드 고정 | 건너뜀 | 구형 사용처/소유 확인, 문서·증거 유효성 대조 잔여 | 앞 단계 미완료 |
| 6 | 분할 커밋·조건부 push·잔여 재산정 | 부분 수행 | HW01 d3d0dbc6·HW02 d5a0710b 커밋. HW03미커밋·푸시불가, 잔여표 갱신 | AGENTS3/5/6·현재 readiness |

### HW-03 실제 미디어 회귀 중단 판정

최신 native 자체04는99 PASS, 실제04는81 PASS다. 보완한 선택 경계의 전체 PTS/EOS·반복32 graph·
H264/H265/VP8·URI MP4 검사를 통과했지만 기존 미디어 회귀 마감과 동일하지 않다.
HW-02 제품 변경은 `d5a0710b`로 커밋됐으며 HW-03 수행 중 제품 바이트는 바꾸지 않았다.

`node scripts/internal/verify_recording_media_impact.mjs --run`은 기존 codec/ICE 명령을
소유 loopback 서버·HTTP 제공기·UDP STUN으로 격리한다. 기존 codec timeout/판정은 그대로다.
[실행 원출력](lp27-hw03-media-01.log), [안전 진단·25개 전수 결과·원문 해시](lp27-hw03-media-diagnostic.json)를 보존했다.
실행 101,535ms, codec 98,989ms/exit1·23 PASS·2 FAIL·skip0이다.
outer runner600초 상한은 발생하지 않았고, 첫 실패는 ffprobe20초다. 새 재실행은 하지 않았다.

| 실패 | 확정된 사실 | 미확정·금지할 단정 |
| --- | --- | --- |
| HTTP H264/AAC → /dhseo/h264 | ffprobe20초 timeout. 같은 입력 /default·/opus·WebRTC signaling은 PASS. 서버 URI ready4회(833/821/823/816ms) | 입력 준비는 첫 RTP 전달 완료 증거가 아님. decoder 선택 보완과 인과 미확정 |
| HTTP H264 무음 제공기 | launcher readiness 실패·로그0B·GET0·early-exit 메시지0. verify_codec_matrix.sh의 제품 요청 이전 반환 | Python 시작/리스닝 실패 원인은 미확정. 앞의 제품 요청 실패와 같은 원인으로 묶지 않음 |
| 관련 경고 | GLib bad-fd53, libnice missing-component3. helper 설치/신호계약/동적설치 실패·CRITICAL·not-negotiated 각0 | 경고가 원인이라고도 무관하다고도 확정하지 않음 |

원인 불명 상태에서 timeout 확대·제품 추가 수정·전체 matrix 반복을 하지 않는다(AGENTS3.3/8).
다음의 최소 원인 구분은 **실패 세션의 prepare→source-ready→첫 video/audio RTP 관측**과
**제공기 PID 생존·LISTEN·HTTP 준비·종료코드**를 분리하는 것이다.
안전한 고정 코드/계수만 추가하고 공개 schema·기존 성공 기준·외부 환경은 유지하는 범위부터 재개해야 한다.
다음 ICE·PREP-01·CLOSE-01은 건너뜀이다. 기존 저장소 비용/이벤트 통합 실패를 다시 열 근거는 없다.
HW-03 변경은 회귀 도구·실패 증거로 필요하므로 보존하되 미완료 단계 커밋을 하지 않는다.
푸시 가능: 아니오(이번 범위 실제 회귀 실패·미커밋). 푸시 미수행. 앞선 유효한 두 커밋은 유지한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| file_local_h264_aac: RTSP /default -> h264/aac | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: RTSP /h264 -> h264/aac | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: RTSP /h265 -> hevc/aac | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: RTSP /opus -> h264/opus | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: RTSP /h265/opus -> hevc/opus | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: RTSP /pcmu -> h264/pcm_mulaw | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: RTSP /h265/pcmu -> hevc/pcm_mulaw | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: RTSP /pcma -> h264/pcm_alaw | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: RTSP /h265/pcma -> hevc/pcm_alaw | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h264_aac: WebRTC signaling session created (<redacted>) | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /default -> h264/aac | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /h264 -> h264/aac | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /h265 -> hevc/aac | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /opus -> h264/opus | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /h265/opus -> hevc/opus | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /pcmu -> h264/pcm_mulaw | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /h265/pcmu -> hevc/pcm_mulaw | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /pcma -> h264/pcm_alaw | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: RTSP /h265/pcma -> hevc/pcm_alaw | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| file_local_h265_aac: WebRTC signaling session created (<redacted>) | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| http_local_h264_aac: RTSP /default -> h264/aac | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| http_local_h264_aac: OnMediaConfigure RTSP probe failed (route=/dhseo/h264, sourceKind=http) | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | FAIL | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| http_local_h264_aac: RTSP /opus -> h264/opus | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| http_local_h264_aac: WebRTC signaling session created (<redacted>) | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | PASS | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| http_local_h264_video_only: local HTTP launcher did not become ready | 기존 verify-codecs 개별 결과; exit1 묶음·전체98,989ms | FAIL | 안전 진단 JSON과 대조, 실제 브라우저 아님 |
| ISO01 explicit owned loopback accepted | node --test scripts/internal/verify_local_ice_guard.test.mjs, exit0·전체30.333833ms | PASS | 실제 ICE 회귀가 아닌 격리 자체검사 |
| ISO02 empty STUN rejected | node --test scripts/internal/verify_local_ice_guard.test.mjs, exit0·전체30.333833ms | PASS | 실제 ICE 회귀가 아닌 격리 자체검사 |
| ISO03 external STUN rejected | node --test scripts/internal/verify_local_ice_guard.test.mjs, exit0·전체30.333833ms | PASS | 실제 ICE 회귀가 아닌 격리 자체검사 |
| ISO04 mixed server ICE rejected | node --test scripts/internal/verify_local_ice_guard.test.mjs, exit0·전체30.333833ms | PASS | 실제 ICE 회귀가 아닌 격리 자체검사 |
| ISO05 TURN rejected | node --test scripts/internal/verify_local_ice_guard.test.mjs, exit0·전체30.333833ms | PASS | 실제 ICE 회귀가 아닌 격리 자체검사 |
| ISO06 unowned port rejected | node --test scripts/internal/verify_local_ice_guard.test.mjs, exit0·전체30.333833ms | PASS | 실제 ICE 회귀가 아닌 격리 자체검사 |
| ISO07 unexpected credentials rejected | node --test scripts/internal/verify_local_ice_guard.test.mjs, exit0·전체30.333833ms | PASS | 실제 ICE 회귀가 아닌 격리 자체검사 |
| 새 실행기 구문 | node --check scripts/internal/verify_recording_media_impact.mjs, exit0 | PASS | 전체 실행 PASS 아님 |
| HW-MEDIA03 서버 준비 | owned loopback 서버 health·ICE 환경/config 확인 | PASS | 실제 codec 실행 전 |
| HW-MEDIA03 서버 종료 | exit0·signal없음·forced=false | PASS | 실패 후 정상 정리 |
| HW-MEDIA03 TCP 59636 | assertPortClosed | PASS | 종료 후 해당 listener 없음 |
| HW-MEDIA03 TCP 59637 | assertPortClosed | PASS | 종료 후 해당 listener 없음 |
| HW-MEDIA03 TCP 59638 | assertPortClosed | PASS | 종료 후 해당 listener 없음 |
| HW-MEDIA03 TCP 59639 | assertPortClosed | PASS | 종료 후 해당 listener 없음 |
| HW-MEDIA03 TCP 59640 | assertPortClosed | PASS | 종료 후 해당 listener 없음 |
| HW-MEDIA03 TCP 59641 | assertPortClosed | PASS | 종료 후 해당 listener 없음 |
| HW-MEDIA03 TCP 59642 | assertPortClosed | PASS | 종료 후 해당 listener 없음 |
| HW-MEDIA03 TCP 59643 | assertPortClosed | PASS | 종료 후 해당 listener 없음 |
| HW-MEDIA03 UDP62165 | 소유 socket close, 메시지3; lsof exit1/output0 | PASS | 외부 STUN/TURN 없음 |
| HW-MEDIA03 열린 파일 | lsof +D 소유 root, exit1/output0 | PASS | 삭제 전 접근 없음 |
| HW-MEDIA03 안전 증거 대조 | 25행·원시5파일 길이/SHA256 일치, exit0 | PASS | URL/session/caps/debug 원문 제외 |
| HW-MEDIA03 임시 정리 | 아래3개 소유 경로 삭제·부재 확인, exit0 | PASS | 정리는 기능 실패를 대체하지 않음 |

| 항목 | 실행 상태 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| codec 남은 local matrix | 미완료 | 앞 두 실패 뒤 기존 runner 조기 종료 | 전체67 PASS 아님, 남은44개 성공을 추정하지 않음 |
| 외부 source3개 | 제외·실행 전 중단 | 원래 config 비활성·외부승인 없음 | 출력 skip0을 실행/통과로 승격하지 않음 |
| 기존 ICE8 | 건너뜀 | codec 실패 | ISO7 자체 PASS로 대체 불가 |
| 실제 브라우저·30분·120분 | 미실행 | 이번 HW-03 범위 밖·최종 묶음 별도 | 릴리즈 면제 아님 |
| PREP-01/CLOSE-01 | 건너뜀 | HW-03 영향 마감 실패 | 준비/코드 고정 완료 아님 |

소유 자료 삭제 전 원출력 hash5개·명령·source/binary fingerprint·환경·개별25행·고정 진단값을
위 안전 JSON/원출력으로 보존했다. 원시 session/URL/debug·registry는 최종 증거로 복사하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-media-qD95Ha | 실행root·registry·원시로그·설정 | 1,814,763B | manifest 소유·realpath·해시 확인 후 삭제 | 부재 확인 | execution manifest·safe JSON·lsof |
| /private/tmp/media-server-hw-media-qD95Ha-http_local_h264_aac.http.log | 임시 HTTP로그 | 427B | 원문 해시·진단 보존 후 삭제 | 부재 확인 | owned manifest |
| /private/tmp/media-server-hw-media-qD95Ha-http_local_h264_video_only.http.log | 임시 HTTP로그 | 0B | 비어 있음·hash 보존 후 삭제 | 부재 확인 | owned manifest |

manifest의 나머지 HLS로그/HLS디렉터리·RTSP로그3개·WHIP로그는 생성되지 않아 각각 부재를 확인했다.
삭제한 원시 임시자료는 복구되지 않으며 비민감 최소 증거는 저장소에 보존한다.
token start/end/consumed: 전용 집계 미제공으로 미집계. source: 실제 도구 출력, elapsed는 각 로그.
마감 문서 검사는 제품 재실행이 아니며 뒤 개발 단계 착수도 아니다.

### HW-03 중단 기록 마감 검사

제품 실패 뒤 뒤 개발 단계를 실행한 것이 아니라 실행 증거·문서·정리의 정합성을 확인했다.
문서 링크288개md/9490links/22images/141anchors/실패0, 자산10 PASS, script inventory12 PASS,
작업트리 공백검사exit0이다. elapsed는 문서검사 별도집계 없음, token 미집계(전용 집계 미제공).
최종binary SHA `2ce43399ce33fd6863a9aa8d0e21e65ae32975ee52ad08d065b09e065aca9fd7`,
미디어 runner SHA `eb393cc76850b9bdb99c37e480b4328a4b6b7f37a05ddd9200c224729002c8c3`로
실제 media01과 동일하다. 두 소스의 유효성 확인이며 제품검증 재실행이 아니다.
읽기 전용 원격조회 첫 sandbox DNS실패(exit128) 후 승인된 네트워크 조회exit0으로
origin/v4.1.0=f4e58b9c, main431397d9, v4.1.0 remote tag없음을 확인했다.
로컬d5a0710b는ahead2/behind0이고, 현재 HW03 도구/증거·중앙/색인/잔여 문서는 미커밋이다.
이 소유 변경은 유효한 개발/실패 기록이어서 삭제하지 않았으며 제품파일 미커밋은 없다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 스크립트: dispatch parser recognizes explicit bash and node interpreters | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: server.sh dispatch targets exist and are executable | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: documented server.sh commands resolve to dispatch table | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: tracked scripts are classified and referenced | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: project inventory delegates script file inventory to this verifier | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: project inventory maps verifier families without duplicating dispatch details | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: CMake does not define a separate untracked CTest registry | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: test entry scripts are reachable from test_all | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: auth verifier has no hardcoded test password defaults | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: VA EventRecord dispatch verifier fails early and dispatches every poll by default | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: critical verifier pass output avoids grouped feature-result wording | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 스크립트: user-facing JS option parsers reject unknown options | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-script-inventory, exit0 | PASS | 자체/등록 검사 |
| 자산: README uses only representative product UI screenshots | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: English README uses English UI screenshots | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: UI guide keeps product screenshots in the shared asset set | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: docs UI asset policy documents capture rules | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: managed UI asset manifest stays complete | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: capture script owns every documented UI asset | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: docs capture covers current screenshots | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: representative screenshot docs do not point at stale visual baselines | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: docs UI asset directory contains managed PNG files | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| 자산: VA documentation images keep full video frame bounds | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets, exit0 | PASS | 실제 화면 확인 아님 |
| HW03 문서 링크 | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-links, exit0·288md/9490links/실패0 | PASS | 원출력 집계와 대조 |
| HW03 공백 검사 | git diff --check, exit0 | PASS | stage/commit 미수행 |
| HW03 실행 바이트 대조 | shasum -a 256 binary/runner, exit0·두 hash동일 | PASS | 실패 실행 이후 바이트 보존 |

미완료: HTTP RTSP/launcher 원인·기존 codec/ICE 마감·PREP/CLOSE·S11·외부release.
공개 API/schema·입력 시간값·녹화/보존/저장·auth는 이번 제품 보완에서 변경하지 않았다.
제품 영향은 객체별 decoder 선택뿐이며 CPU 증가의 실제 다채널/장시간 판정은 남아 있다.
푸시 가능: 아니오. 이유: 실제 미디어 회귀 미해소 및 HW03 미커밋. 수행: 아니오.

### HW-03 실행 전 계약과 개별 정의

HW-02 제품 바이트를 고정하고 기존 단일 담당자가 native 회귀 도구 두 파일만 확장한다.
메인은 기존 codec/ICE 검사를 로컬 격리해 실행한다. 실제 브라우저·외부 STUN/TURN·장시간은 포함하지 않는다.
입력 PTS/DTS·전체 대응 oracle·EOS 5초·paced 3초·native 180초·고정 배열 상한을 유지한다.
반복 검사는 재현될 때까지 재시도하는 방식이 아니라 실행 전에 고정한 16회×2종 한 묶음이다.
URI는 실제 uridecodebin 경계 확인이며 전체 HLS/HTTP/source worker 검증으로 확대하지 않는다.
자원 비교는 같은 1280×720/30fps/90frame 입력의 미보완/보완 1회씩이다. 준비 비용을 제외한 graph 수명
CPU·wall 및 현재 RSS 전후를 기록한다. peak RSS는 프로세스 누적값이며 순간 할당·장시간 누수로 해석하지 않는다.
미보완의 알려진 시간값 불일치는 진단으로 보존하고, 준비 오류 또는 보완 경로 실패에는 뒤 검사를 중단한다.
새 임의 CPU/RAM 제품 상한을 만들지 않고 실제 차이와 한계를 판단한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-RP01-N | 일반20 회차1 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP01-B | B-frame30 회차1 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP02-N | 일반20 회차2 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP02-B | B-frame30 회차2 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP03-N | 일반20 회차3 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP03-B | B-frame30 회차3 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP04-N | 일반20 회차4 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP04-B | B-frame30 회차4 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP05-N | 일반20 회차5 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP05-B | B-frame30 회차5 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP06-N | 일반20 회차6 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP06-B | B-frame30 회차6 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP07-N | 일반20 회차7 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP07-B | B-frame30 회차7 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP08-N | 일반20 회차8 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP08-B | B-frame30 회차8 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP09-N | 일반20 회차9 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP09-B | B-frame30 회차9 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP10-N | 일반20 회차10 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP10-B | B-frame30 회차10 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP11-N | 일반20 회차11 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP11-B | B-frame30 회차11 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP12-N | 일반20 회차12 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP12-B | B-frame30 회차12 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP13-N | 일반20 회차13 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP13-B | B-frame30 회차13 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP14-N | 일반20 회차14 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP14-B | B-frame30 회차14 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP15-N | 일반20 회차15 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP15-B | B-frame30 회차15 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP16-N | 일반20 회차16 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-RP16-B | B-frame30 회차16 | fresh graph의 전체 PTS·EOS와 exact 후보 제외 각각 확인 | v4.1.0 |
| HW-CC01 | H264→H265 | 전체 PTS/EOS, 후보 선택, RTP H265/EOS 세 assertion | v4.1.0 |
| HW-CC02 | VP8→H264 | unknown DTS 유지, 전체 PTS/EOS·선택·RTP H264/EOS | v4.1.0 |
| HW-CC03 | H265→H264 | 전체 PTS/EOS·선택·RTP H264/EOS | v4.1.0 |
| HW-UC01 | URI 입력 독립 기준 | MP4 입력 origin0/100ms 간격을 원본 AU로 대조 | v4.1.0 |
| HW-UC02 | URI decoder 대응 | 실제 uridecodebin의 전체 PTS·EOS | v4.1.0 |
| HW-UC03 | URI 선택과 downstream | 한정 제외와 consumer PTS·EOS 보존 | v4.1.0 |
| HW-RS01 | 기준 자원 관측 | baseline CPU/wall·current RSS 유효성, 알려진 제품 반례와 준비 오류 구분 | v4.1.0 |
| HW-RS02 | 보완 자원 관측 | corrected CPU/wall·current RSS 유효성, peak는 process lifetime으로 명시 | v4.1.0 |
| HW-RS03 | 자원 입력 동등성 | 두 graph에 같은90frame AU·PTS/DTS·SHA, 원시각 그대로 | v4.1.0 |
| HW-RS04 | 자원 비교 중 기능 | corrected 전체 PTS·EOS 대응 | v4.1.0 |
| HW-RS05 | 자원 비교 중 선택 | corrected exact 후보 정책 준수, 새 자원 합격 상한 없음 | v4.1.0 |
| HW-RF01 | VP8 unknown DTS | 허용 입력, 임의 보충 금지 | v4.1.0 |
| HW-RF02 | 비VP8 unknown DTS | 준비 오류 거부 | v4.1.0 |
| HW-RF03 | MP4 원본 기준 | origin0/100ms 간격 수용 | v4.1.0 |
| HW-RF04 | 잘못된 MP4 기준 | origin 변경 거부 | v4.1.0 |
| HW-RF05 | RTP 출력 증거 | 올바른 encoding-name·EOS 수용 | v4.1.0 |
| HW-RF06 | RTP 반례 | 잘못된 encoding-name·EOS 누락 거부 | v4.1.0 |
| HW-RF07 | 자원 정상 표본 | 유효한 단조 CPU/wall 차이 수용 | v4.1.0 |
| HW-RF08 | 자원 반례 | 감소 CPU 등 무효 표본 거부 | v4.1.0 |
| HW-IO03 | 요약 누락 거부 | regression exit0이라도 완전 summary 없으면 exit2 | v4.1.0 |
| HW-MEDIA01 | 기존 codec 회귀 | 기존 config의 로컬67개, 외부 비활성3개는 제외 그대로 | v4.1.0 |
| HW-MEDIA02 | 기존 ICE 회귀 | 기존8개, owned UDP STUN·TURN 없음·환경/config guard | v4.1.0 |
| HW-MEDIA03 | 격리·정리 | owned server/launcher/UDP/port/temp, 실패 자료 보존 후 정리·기존ISO01~07 자체검사 | v4.1.0 |

명령: `bash scripts/internal/verify_recording_hw_impact.sh --self-test` (예정87 assertion)
→ `--regression-impact` (예정81 assertion) → 격리된 기존 `./server.sh verify-codecs`
→ `./server.sh verify-webrtc-ice`. 기존 media gate의 case별 정의는 codec config·중앙 S10 미디어 기록을
재사용하며 개별 결과를 이번 원출력과 대조한다. test 자체검사와 실제 제품 영향 결과를 합산해 제품 PASS로 만들지 않는다.
실행 순서·시간상한은 기존 기준 그대로이며 실제 브라우저 metadata는 이번 사용자 제외에 따라 미실행이다.
문서·스크립트 검사는 마감 시 실행한다. token 집계 미제공, elapsed는 실행 로그의 실측값을 쓴다.

### HW-03 최초 실제 검사와 관측 진단 보완

자체01은 native84+IO3=87 PASS, exit0/1792ms, stderr0, root1940068B 삭제·부재다.
실제01은 반복64와 CC01 시간/선택2 PASS 뒤 RTP 관측1 FAIL(exit1/1722ms)이다.
encoding H265·CAPS1·EOS1·invalid1, decoder/consumer20개 시간값 모두 정상·bus/경고0이었다.
실제 실패를 RED 또는 제품 통과로 바꾸지 않는다. CC02 이후·codec/ICE·PREP/CLOSE는 건너뛰었다.
원출력: [자체01](lp27-hw03-self-01.log), [실제01](lp27-hw03-impact-01.log).

메인·단일 담당자의 읽기 검토에서 CAPS fixed 검사는 이미 통과했으며, 이벤트16 초과와 media name
불일치의 원인 구분 필드가 빠져 있음을 확인했다. 같은 단계 검증 준비 결함으로 고정 숫자/boolean
진단 필드만 추가하고 관측 overflow를 제품 오류와 분리한다. 기존16 상한·PTS/EOS·제품코드는 유지한다.
미확인 상태를 PASS시키지 않으며 아래 자체 반례 후 동일 단기 검사1회로 실제 원인을 구별한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-RF09 | RTP 관측 초과 | events17에서 overflow·PASS 거부 | v4.1.0 |
| HW-RF10 | 오류 종류 분리 | media name mismatch를 overflow와 구분, PASS 거부 | v4.1.0 |

이후 자체검사 예정89(native86+IO3)다. 실제01의 소유root1940068B 삭제·부재이며 서버/포트 없음.

### HW-03 관측 원인 확정과 수정

자체02는89 PASS(exit0/1575ms), 실제02는 같은CC01까지66 PASS/1 FAIL(exit2/1691ms)이다.
`events17/caps1/eos1/event_overflow1/caps_shape_invalid0/media_name_matches1`로
RTP 총 제어 이벤트16 제한이 원인임을 확정했다. 이 한계는 새 관측기에 잘못 붙인 조건이며
제품 RTP 형식/시간/EOS 실패가 아니다. 최초exit1의 제품 오류처럼 보이는 분류를 정정한다.
제품·영상128행·기존Trace의CAPS/SEGMENT16·EOS5초·프로세스180초는 변경하지 않는다.
RTP 관측은 payload를 저장하지 않으므로 총 이벤트 수가 메모리 사용량과 비례하지 않는다.
고정6종 enum counter로 **모든** 이벤트를 계수하고 정수 초과는 포화·FAIL 처리한다.
RTP CAPS16 상한·형태·encoding·EOS1 검사는 유지한다. 기록/검사 삭제나 제품 합격 기준 완화가 아니다.
기존RF09는 잘못된 전체event 상한 반례에서 실제CAPS 관측 상한 반례로 교정하며 과거실패는 보존한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-RF09 현행 | CAPS 상한 유지 | CAPS17 overflow·PASS 거부 | v4.1.0 |
| HW-RF11 | 정상 반복 제어 이벤트 | TAG17개를 모두 계수, payload 저장 없이 RTP 계약 유지 | v4.1.0 |
| HW-RF12 | 계수 overflow | 최대값 뒤 증가를 포화·FAIL 처리, wrap 금지 | v4.1.0 |

다음 자체 예정91(native88+IO3). 원출력 [자체02](lp27-hw03-self-02.log),
[실제02](lp27-hw03-impact-02.log), 각1940132B 소유root 삭제·부재, 서버/포트 없음.

### HW-03 H265 fallback 관측 보완

자체03은91 PASS(exit0/1575ms), 실제03은RP64와CC01/02·CC03 RTP의71 PASS 및
CC03 입력/선택2 FAIL(exit2/1784ms)이다. RTP 총17개는 CAPS1/EOS1/stream-start1/segment1/TAG12/other1로
모두 집계됐다. 앞의 RTP 관측 결함은 해결됐으나 HW-03 전체 PASS는 아니다.
H265는 첫 후보vtdec_hw에CAPS만 전달된 뒤 avdec_h265로 fallback했고 consumer20프레임·PTS·EOS는
정상이었다. 관측기가 첫 decoder만 추적하고 생성후보1개를 전제한 준비 결함을 확인했다.
제품 후보 선택이나 입력을 바꾸지 않고 기존8개 후보 상한 내 각각 고정128frame/16event 경계를 관측한다.
NULL 완료 뒤 실제 버퍼를 처리한 유일후보만 전체 대응 판정에 사용하고, 둘 이상/초과/없음/부분 관측은 거부한다.
CAPS만 받은 미선택 후보의 계수도 보존한다. 메인 판단 후 기존 단일 담당자에게 이 관측부만 위임했다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-DC01 | 실제 fallback 선택 | CAPS-only 첫 후보+실제 버퍼 둘째 후보 수용 | v4.1.0 |
| HW-DC02 | 두 실처리 후보 | 모호한 동시 처리 거부 | v4.1.0 |
| HW-DC03 | 후보 상한 | 8개 초과 거부 | v4.1.0 |
| HW-DC04 | 실제 관측 없음 | 버퍼 없는 후보만 있을 때 거부 | v4.1.0 |
| HW-DC05 | 일부 경계 누락 | sink/src 한쪽만 존재하면 거부 | v4.1.0 |

같은 원인 전수 대조에서 기존Trace도 총 이벤트 횟수를16개 저장량으로 잘못 취급함을 확인했다.
90프레임 자원 입력 등 정상TAG 반복에도 같은 준비 실패가 생길 수 있으므로 같은 수정 묶음에서
전체계수는 포화 scalar, 실제CAPS/SEGMENT 저장배열은16개 그대로 유지한다. 제품의 합격 조건은 동일하다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-DC06 | Trace 정상 제어 반복 | 17개 이벤트 계수는 정상, 동적 payload 저장 없음 | v4.1.0 |
| HW-DC07 | 실제 배열 상한 | CAPS17개 저장 시 overflow·판정 거부 | v4.1.0 |
| HW-DC08 | 총계 포화 | scalar overflow는 포화·관측 불완전 거부 | v4.1.0 |

다음 자체 예정99(native96+IO3). 원출력 [자체03](lp27-hw03-self-03.log),
[실제03](lp27-hw03-impact-03.log), 각1956756B 소유root 삭제·부재, 서버/포트 없음.
URI/자원·기존codec/ICE·PREP/CLOSE는 아직 건너뜀이다. 제품HW-02 바이트는 그대로다.

### HW-03 native 실행 전수 결과

아래는 각 원출력의 모든 pass/fail 행을 제목별로 대조한 것이다. 각 회차의 실제 판정을 비고에 보존하며,
후속 실행에서 없는 항목은 실행하지 않은 것으로 해석한다. 실제03 이전의 URI/자원 검사는 미실행이다.
RF09의 옛 총계 제한 자체검사는 폐기된 관측 방식의 역사적 결과이며 현행 제품 증거로 쓰지 않는다.
코드 고정 후 최종 유효 native 결과는 self04의99·impact04의81이다.

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| HW-IO01 pipe output and exit status preserved | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-IO02 incomplete mitigation summary cannot pass | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-IO03 incomplete regression summary cannot pass | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR01 reorder accepted | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR02 same-count duplicate omission rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR02 same-count omission replacement rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR03 legitimate duplicate preserved | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR04 missing frame rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR05 invalid PTS rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR06 missing EOS rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR07 overflow rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR08 duplicate EOS rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR09 missing SEGMENT rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR10 non-TIME SEGMENT rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR11 complete oracle accepted | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR12 input mismatch is inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR13 decoder mismatch is failure | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR14 overlay mismatch is failure | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR15 invalid observation is inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR16 overflow is inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR17 missing probe is inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR18 missing bus EOS is inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR19 bus ERROR is inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR20 known error classification excludes raw text | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR21 unknown error classification excludes raw text | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR22 CAPS fixed allowlist rejects arbitrary values | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-GR01 actual product parse-launch PLACE_IN_BIN creates inspectable bin | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-GR02 no generated ghost sink occupies pending links | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-GR03 pay0 src connects directly to owned sink | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-GR04 dynamic downstream queue sink remains unoccupied | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-GR05 legacy automatic ghost occupies queue sink before PLAYING | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-OR23 delayed-link has fixed classification | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP01 callback retains decode number without pointers | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP02 push retains independent system number | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP03 decreasing warning preserves exact nanoseconds | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP04 malicious pointer token rejected without disclosure | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP05 trailing injected field rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP06 invalid timestamp rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP07 unknown warning makes diagnosis inconclusive without raw retention | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP08 debug array overflow makes diagnosis inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP09 known decreasing warning completes diagnosis without product PASS | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP10 absent source log is not fabricated as wait completion | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP11 finish frame preserves pre-clamp PTS and unknown DTS without pointer | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP12 numeric overflow rejected before conversion | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP13 unrelated long LOG ignored before selected-prefix bound | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP14 selected-prefix oversized message is inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP15 callback exception boundary makes diagnosis inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP16 malformed DTS rejected without inventing source formats | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP17 missing finish-frame observation is inconclusive | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP18 official entry-only finish log is not pre-clamp evidence | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP19 session-create error retains only signed numeric code | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-DP20 session-create error rejects arbitrary suffix | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP01 exact macOS H264 vtdec_hw tuple skips | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP02 exact macOS H264 vtdec tuple skips | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP03 other platform preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP04 nonfixed ANY or ambiguous caps preserve selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP05 empty caps preserve selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP06 H265 input preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP07 VP8 input preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP08 other factory preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP09 other plugin preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP10 older version preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP11 newer version preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP12 unknown version preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP13 unknown factory preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP14 unknown plugin preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MP15 raw input preserves selection | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH01 existing decodebin hook follows platform gate | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH02 repeated installation does not duplicate hooks | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH03 dynamically nested decodebin hook follows platform gate | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH04 installation leaves global factory ranks unchanged | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH05 root and decoder lifetimes retain no external references | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH09 actual H264 signal returns SKIP only for installed affected tuple | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH10 actual ANY caps signal returns TRY | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH11 actual H265 caps signal returns TRY | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH12 actual avdec_h264 candidate signal returns TRY | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH06 in-progress marker is not completion on macOS and untouched elsewhere | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH07 failed marker remains failed across repeated installation | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-MH08 dynamic installation failure posts bus ERROR only on macOS | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF01 VP8 observed unknown DTS is retained and allowed for burst fixture | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF02 unknown DTS permission does not extend to H264 | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF03 normal MP4 independent zero origin and exact 100ms premise accepted | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF04 altered MP4 PTS origin rejected without oracle adjustment | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF05 exact RTP encoding-name and single EOS accepted | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF06 wrong RTP encoding or missing EOS rejected | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF07 monotonic CPU wall and available RSS observations accepted without performance target | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF08 decreasing process CPU invalidates resource observation | HW03 self01·self02·self03·self04 실제 assertion | pass | self01=pass, self02=pass, self03=pass, self04=pass |
| HW-RF09 RTP observation overflow cannot become product PASS | HW03 self02 실제 assertion | pass | self02=pass |
| HW-RF10 media mismatch and observation overflow remain distinct | HW03 self02·self03·self04 실제 assertion | pass | self02=pass, self03=pass, self04=pass |
| HW-RF09 RTP CAPS observation overflow cannot become product PASS | HW03 self03·self04 실제 assertion | pass | self03=pass, self04=pass |
| HW-RF11 repeated TAG counted without payload allocation or RTP contract rejection | HW03 self03·self04 실제 assertion | pass | self03=pass, self04=pass |
| HW-RF12 counter overflow is saturated and cannot pass | HW03 self03·self04 실제 assertion | pass | self03=pass, self04=pass |
| HW-DC01 caps-only first and sole active second decoder selected | HW03 self04 실제 assertion | pass | self04=pass |
| HW-DC02 multiple data-processing decoders rejected | HW03 self04 실제 assertion | pass | self04=pass |
| HW-DC03 more than eight decoder candidates rejected | HW03 self04 실제 assertion | pass | self04=pass |
| HW-DC04 no data-processing decoder rejected | HW03 self04 실제 assertion | pass | self04=pass |
| HW-DC05 partial or incomplete decoder observation rejected | HW03 self04 실제 assertion | pass | self04=pass |
| HW-DC06 seventeen TAG events use bounded scalar count without false overflow | HW03 self04 실제 assertion | pass | self04=pass |
| HW-DC07 seventeenth CAPS still rejects fixed-array overflow | HW03 self04 실제 assertion | pass | self04=pass |
| HW-DC08 total event counter saturates and rejects arithmetic overflow | HW03 self04 실제 assertion | pass | self04=pass |
| HW-RP01-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP01-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP01-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP01-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP02-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP02-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP02-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP02-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP03-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP03-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP03-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP03-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP04-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP04-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP04-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP04-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP05-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP05-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP05-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP05-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP06-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP06-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP06-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP06-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP07-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP07-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP07-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP07-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP08-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP08-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP08-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP08-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP09-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP09-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP09-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP09-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP10-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP10-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP10-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP10-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP11-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP11-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP11-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP11-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP12-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP12-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP12-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP12-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP13-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP13-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP13-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP13-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP14-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP14-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP14-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP14-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP15-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP15-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP15-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP15-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP16-N exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP16-N selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP16-B exact full PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-RP16-B selected factory respects exact compatibility tuple | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-CC01-H264-to-H265 exact input decoder consumer PTS and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-CC01-H264-to-H265 input-scoped decoder policy | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=pass, impact02=pass, impact03=pass, impact04=pass |
| HW-CC01-H264-to-H265 actual pay0 RTP encoding-name and EOS | HW03 impact01·impact02·impact03·impact04 실제 assertion | pass | impact01=fail, impact02=fail, impact03=pass, impact04=pass |
| HW-CC02-VP8-to-H264 exact input decoder consumer PTS and EOS | HW03 impact03·impact04 실제 assertion | pass | impact03=pass, impact04=pass |
| HW-CC02-VP8-to-H264 input-scoped decoder policy | HW03 impact03·impact04 실제 assertion | pass | impact03=pass, impact04=pass |
| HW-CC02-VP8-to-H264 actual pay0 RTP encoding-name and EOS | HW03 impact03·impact04 실제 assertion | pass | impact03=pass, impact04=pass |
| HW-CC03-H265-to-H264 exact input decoder consumer PTS and EOS | HW03 impact03·impact04 실제 assertion | pass | impact03=fail, impact04=pass |
| HW-CC03-H265-to-H264 input-scoped decoder policy | HW03 impact03·impact04 실제 assertion | pass | impact03=fail, impact04=pass |
| HW-CC03-H265-to-H264 actual pay0 RTP encoding-name and EOS | HW03 impact03·impact04 실제 assertion | pass | impact03=pass, impact04=pass |
| HW-UC01 independent normal MP4 fixture and immutable file | HW03 impact04 실제 assertion | pass | impact04=pass |
| HW-UC02 uridecodebin exact input decoder consumer PTS and EOS | HW03 impact04 실제 assertion | pass | impact04=pass |
| HW-UC03 local URI policy selection and downstream exact PTS EOS | HW03 impact04 실제 assertion | pass | impact04=pass |
| HW-RS01 baseline process CPU wall and RSS observations valid | HW03 impact04 실제 assertion | pass | impact04=pass |
| HW-RS02 corrected process CPU wall and RSS observations valid | HW03 impact04 실제 assertion | pass | impact04=pass |
| HW-RS03 identical AU bytes and PTS DTS used for both graphs | HW03 impact04 실제 assertion | pass | impact04=pass |
| HW-RS04 corrected normal90 exact full PTS and EOS | HW03 impact04 실제 assertion | pass | impact04=pass |
| HW-RS05 corrected normal90 selected factory respects exact compatibility tuple | HW03 impact04 실제 assertion | pass | impact04=pass |

| 명령 회차 | 실제 실행·판정 | elapsed/source | 원출력 |
| --- | --- | --- | --- |
| self01 | exit0, pass87/fail0 | 1792ms/Node 실행 계측 | [로그](lp27-hw03-self-01.log) |
| self02 | exit0, pass89/fail0 | 1575ms/Node 실행 계측 | [로그](lp27-hw03-self-02.log) |
| self03 | exit0, pass91/fail0 | 1575ms/Node 실행 계측 | [로그](lp27-hw03-self-03.log) |
| self04 | exit0, pass99/fail0 | 1570ms/Node 실행 계측 | [로그](lp27-hw03-self-04.log) |
| impact01 | exit1, pass66/fail1 | 1722ms/Node 실행 계측 | [로그](lp27-hw03-impact-01.log) |
| impact02 | exit2, pass66/fail1 | 1691ms/Node 실행 계측 | [로그](lp27-hw03-impact-02.log) |
| impact03 | exit2, pass71/fail2 | 1784ms/Node 실행 계측 | [로그](lp27-hw03-impact-03.log) |
| impact04 | exit0, pass81/fail0 | 8135ms/Node 실행 계측 | [로그](lp27-hw03-impact-04.log) |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-impact.vGwD7c | 소유 probe/cache | 1940068B | wrapper 삭제 | 부재true | self01 cleanup |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-impact.MjW3p6 | 소유 probe/cache | 1940132B | wrapper 삭제 | 부재true | self02 cleanup |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-impact.b0msCh | 소유 probe/cache | 1956756B | wrapper 삭제 | 부재true | self03 cleanup |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-impact.MnXt90 | 소유 probe/cache | 1958276B | wrapper 삭제 | 부재true | self04 cleanup |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-impact.jXfRhj | 소유 probe/cache | 1940068B | wrapper 삭제 | 부재true | impact01 cleanup |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-impact.eGnISu | 소유 probe/cache | 1940132B | wrapper 삭제 | 부재true | impact02 cleanup |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-impact.b62Lgk | 소유 probe/cache | 1956756B | wrapper 삭제 | 부재true | impact03 cleanup |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-hw-impact.fXYbaJ | 소유 probe/cache/MP4 | 1979115B | wrapper 삭제 | 부재true | impact04 cleanup |

현재 macOS arm64/GStreamer1.28.1에서 일반20·B30×16회의 전체 PTS·EOS, H264→H265/VP8→H264/H265→H264,
로컬 MP4 uridecodebin 경계가 통과했다. H265의 CAPS-only vtdec_hw 후보와 실제 avdec_h265 fallback을 구분했다.
URI 파일20839B의 SHA가 전후 일치했다. 이는 네트워크/브라우저/전체worker 장시간 검증이 아니다.

동일720p/30fps/90frame의 graph 전체(디코더만이 아님) 순차 비교:
기준wall2994986us/CPU855069us, 보완wall2985322us/CPU1221883us.
프로세스 CPU는 약42.9% 증가했으나 입력 실시간 간격의wall은 약2.99초로 유사했다.
RSS 기준152403968→161792000B, 보완161792000→162643968B.
뒤의 보완 실행은 캐시가 데워진 상태이므로 RSS증가량을 메모리 우위·장시간 누수 없음으로 해석하지 않는다.
새 자원 상한·성능 보장을 만들지 않고 소프트웨어 전환 비용을 공개한다. S11 다채널/장시간 자원판정은 남는다.
원출력stderr0·소유root 정리완료다. 관련 기존codec/ICE 실행은 별도 결과이며 아직 전체HW-03 완료로 쓰지 않는다.
token start/end/consumed는 도구 전용 집계 미제공으로 미집계다.

### HW-01 실행 전 계약

기존 진단기 두 파일만 확장한다. 원인 판정은 메인, 확정 구현은 기존 단일 Astra/medium 담당자이며
하위 위임 금지다. Superpowers 스킬은 현재 미제공이므로 설계·반례·원인 분석·직접 검토 절차를 적용한다.
제품 파일·저장 계약·UTC·입력 PTS/DTS·공개 API·timeout·정상 판정은 바꾸지 않는다.

`--drain-diagnosis`는 normal20/bframe30 × burst/paced의 고정 네 셀을 각 한 번 수행한다.
같은 fixture AU/SHA를 재사용하고 paced는 steady clock으로 DTS 간격만 재현한다. 실제 네트워크 검사는 아니다.
각 셀의 기존 5초 EOS 대기와 프로세스 180초 상한을 유지한다. 준비 오류는 즉시 중단한다.
예상된 제품 불일치는 비교 관측으로 보존하면서 네 셀을 수집하되 제품 PASS로 바꾸지 않는다.
네 셀 완료는 원인 비교의 실행 완료이며, 내부 보정·인과관계 미확정이면 HW-01 완료가 아니다.
첫 실행 전 자체검사의 새 parser assertion은 미구현인 경우에만 예상 RED이고 환경/컴파일 오류는 RED가 아니다.

관측은 설치된 라이브러리의 debug callback을 사용하며 vtdec/videodecoder의 고정 메시지에서만 숫자·enum을 추출한다.
경로·주소·원문·임의 문자열을 공개하지 않는다. callback 자료는 고정 상한이며 초과·알 수 없는 경고·관측 누락은
미확정으로 남긴다. `clearing draining flag`는 비동기 대기와 output pause 이후의 관측이지 정확한 대기 종료 시각이 아니다.
EOS 요청 전/후와 decoder sink EOS 경계도 구분한다. debug handler가 타이밍에 영향을 줄 수 있다는 한계를 기록한다.
wrapper의 소유 0700 임시 root만 사용하며 NULL 완료→callback 해제→root 삭제 순서와 bytes/부재를 확인한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP27-D01 | 안전 내부 로그 parser | drain/callback/push/clamp 숫자 파싱, 미등록·악성·범위초과 거부 자체검사 | v4.1.0 |
| LP27-D02 | 관측 수명·상한 | bounded 수집·overflow·미확인 경고·NULL/handler 해제 및 준비 실패 판정 | v4.1.0 |
| LP27-D03 | normal20 burst | 같은 AU, 입력/출력/EOS·drain/clamp 순서 관측 1회 | v4.1.0 |
| LP27-D04 | normal20 paced | 동일 AU를 원래 DTS 간격으로 공급, D03과 비교 1회 | v4.1.0 |
| LP27-D05 | bframe30 burst | 기존 2.6/2.7→2.8 현상과 내부 보정 대응, 1회 | v4.1.0 |
| LP27-D06 | bframe30 paced | 동일 AU·실제 간격에서 EOS 전후 구분, 1회 | v4.1.0 |

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| HW-01 자체/네 셀 단기 진단 | 진행 대상 | 사용자 순차 개발 | LP27-D01~06, 위 두 진단 파일 | 승인 |
| 제품 빌드/영향 회귀 | 조건부 진행 | HW-02 실제 변경에 따름 | 확정 diff 및 AGENTS7.4 | 관련 개발 범위 승인 |
| 문서/등록 검사 | 진행 대상 | 이번 기록·등록 변경 | diffcheck/docs links/assets/script inventory | 승인 |
| 30분·실제 UI·120분 | 미진행 | 현재 선행 개발이며 코드 미고정 | S11, AGENTS7.6.2 | 이번 실행 밖, 릴리즈 필수 상태 유지 |

기존 LP25 통합156 및 LP26 준비436의 유효 범위를 유지한다. HW 진단 변경만으로 전체를 재실행하지 않는다.
token start/end/consumed는 전용 집계 미제공으로 미집계이며 실행 elapsed/source를 원출력에 기록한다.

### HW-01 parser 개별 사전 정의

명령은 `bash scripts/internal/verify_recording_hw_impact.sh --self-test`다. 기존 OR/GR29개를 유지한다.
새 DP는 D01/D02의 하위 assertion이며 기능 총계를 중복 증가시키지 않는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-DP01 | callback 숫자 분리 | 주소는 저장하지 않고 decode frame 번호만 보존 | v4.1.0 |
| HW-DP02 | push 번호 분리 | 별도의 system frame 번호 보존 | v4.1.0 |
| HW-DP03 | clamp 시각 정밀도 | 2.6/2.8초의 나노초 원값 유지 | v4.1.0 |
| HW-DP04 | 악성 주소 거부 | 포인터 자리 임의 URI를 출력/보관하지 않음 | v4.1.0 |
| HW-DP05 | 꼬리 주입 거부 | 숫자 뒤 임의 문자열 거부 | v4.1.0 |
| HW-DP06 | 잘못된 시각 거부 | 분/초 범위 오류 미확정 처리 | v4.1.0 |
| HW-DP07 | 미등록 경고 | 원문 없이 unknown 계수, 완료 거부 | v4.1.0 |
| HW-DP08 | 배열 상한 | 2048 초과 시 초과 표시와 완료 거부 | v4.1.0 |
| HW-DP09 | 알려진 clamp 관측 | 원인 관측 완료와 제품 PASS 분리 | v4.1.0 |
| HW-DP10 | 없는 로그 날조 금지 | 공식 소스에 없는 wait 완료를 관측했다고 하지 않음 | v4.1.0 |
| HW-DP11 | finish 시각 | 보정 전 frame/PTS와 unknown DTS 보존, 주소 제외 | v4.1.0 |
| HW-DP12 | 정수 overflow | 범위 넘는 숫자를 변환 전에 거부 | v4.1.0 |
| HW-DP13 | 긴 무관 LOG | 선택 prefix가 아닌 LOG를 길이로 실패시키지 않음 | v4.1.0 |
| HW-DP14 | 관련 로그 상한 | 선택 prefix의 길이 초과는 미확정 | v4.1.0 |
| HW-DP15 | callback 예외 | C callback 밖 예외 전파 방지·완료 거부 | v4.1.0 |
| HW-DP16 | 잘못된 DTS | 허용되지 않은 시각 문법을 unknown으로 위장하지 않고 거부 | v4.1.0 |
| HW-DP17 | finish 관측 누락 | 보정 전 frame 관측 없이는 진단 완료 거부 | v4.1.0 |

최종 사전 개수는 기존29+DP17=46이다. 네 셀의 실행 ID `HW-DG01~04`는 위 D03~06에 순서대로 대응한다.
실행 명령은 자체검사 통과 후 `bash scripts/internal/verify_recording_hw_impact.sh --drain-diagnosis`이며
진단의 exit1은 제품 불일치 관측, exit2는 준비/관측 불완전, exit3은 네 셀 미재현이다. 어느 것도 제품 해결 PASS가 아니다.

### HW-01 최초 실행과 준비 보완

자체05는46/46 PASS·exit0·1931ms(wrapper3초), root1864596B 삭제·부재([원출력](lp27-hw-self-05.log)).
진단01은normal20-burst에서exit2·1663ms(wrapper3초)로 중단했다([원출력](lp27-hw-drain-01.log)).
vtdec_hw 후보의 입력/출력은0, overlay는20이어서 단일 decoder 관측 전제가 성립하지 않았다.
debug 관측은finish20/unsupported20/unknown warning2,drain callback/push0이었다. 제품 반례 결과가 아니라 준비 실패다.
뒤의 세 셀 및 HW-02 이후는 실행하지 않았다. root1864596B 삭제·부재, 서버/포트 생성 없음.

메인 회수의 읽기 확인: 공식 gstvideodecoder.c에는 상세 finish LOG 외에 포인터만 있는 진입 LOG도 있다(3471행).
이것을 미지원 상세 로그로 잘못 집계한 parser 결함을 보완한다. 상세 finish 관측 필수 조건은 유지한다.
공식 vtdec.c 677행의 `VTDecompressionSessionCreate returned %d`와 GST_ELEMENT_ERROR의 `error:` 접두사를
고정 분류해 숫자 코드만 남기고, 자동선택의 후보 factory 목록을 상한8개로 기록한다. 알려진 오류도 준비 실패로 유지한다.
첫 실행의 하드웨어 준비 부재가 실행 권한과 관련되는지는 아직 미확정이다. 자체검사 통과 후 동일 격리 진단의
VideoToolbox 접근 조건을 권한 절차로 분리한다. timeout·제품·판정 변경 없이 진단을 재개하며 설치 패키지를 바꾸지 않는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-DP18 | 공식 진입 LOG 구분 | 포인터만 있는 finish LOG는 상세 PTS 증거로 세지 않음 | v4.1.0 |
| HW-DP19 | VT 생성 오류 분류 | 원문 대신 부호·정수 코드만 수집, 준비 실패 유지 | v4.1.0 |
| HW-DP20 | 오류 원문 주입 거부 | 고정 오류 코드 뒤 임의 꼬리를 거부 | v4.1.0 |

자체06 사전 개수는49개다. 공식 로그 출처는 GStreamer 1.28.1 vtdec.c/gstvideodecoder.c와 설치된 gstelement.h이며,
새 failure를 제품 실패나 예상 RED로 바꾸지 않는다. 메인 첫 patch는 문맥 불일치로 미적용 후 정확한 행에 적용했다.

자체06은49PASS/exit0/1620ms,root1865156B 삭제·부재([로그](lp27-hw-self-06.log)).
승인된 일반 실행 권한의 진단02는 단일 vtdec_hw 실제 입력으로 normal burst/paced 모두20개 전체PTS/EOS 일치를 확인했다.
B-frame burst의 decoder출력 2.8초3개까지 보존됐으나 로그가중간에잘려 네 셀 판정/내부 보정 증거가 보존되지 않았다.
[진단02](lp27-hw-drain-02.log)는wrapper exit1/7초,root1865156B 삭제·부재이며 원출력 부재분은 추정 복원하지 않는다.
해당 결과는 HW-01 완료로 쓰지 않는다. 제품/source/AU는불변,첫실행과권한조건을구분한다.

원인은 wrapper Node의 `process.stdout.write` 직후 `process.exit`였다. pipe 출력의 비동기 전송이 끝나기 전에
프로세스가 종료해 약64KiB 이후와execution summary가 유실됐다. 메인이 회수해 자연 종료(exitCode)로 보완한다.
제품실행을 바꾸지 않고 동일 emit 함수에256KiB+tail·exit7 음성 대조를 추가한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-IO01 | 긴 출력과 실패 exit 보존 | 같은 emit 함수의256KiB pipe,정확tail,exit7,stderr0 대조 | v4.1.0 |

자체07 사전 개수는native49+wrapper IO1=50이다. 통과 뒤 진단03을 동일 권한/네 셀로 실행해
처음부터 정의한 증거를 완전하게 보존한다. 이 보완은 제품수정/timeout확대/합격기준완화가 아니다.

## HW-01 최종 판정과 개별 결과

HW-01 원인 구분은 완료했다. 진단03 네 셀의 관측은 모두 완전하며, 제품 정확도는 두 셀 PASS/두 셀 FAIL이다.
자체07은 native49+출력 IO1=50PASS,exit0/1457ms(wrapper3초), 진단03은exit1/6350ms(wrapper7초).
[자체07 원출력](lp27-hw-self-07.log), [진단03 원출력](lp27-hw-drain-03.log)을 최종 증거로 보존한다.
진단01 준비 실패·진단02 출력 유실은 위에 남기며 최종 결과로 삭제하지 않는다.

확정 원인 경로: macOS arm64/applemedia1.28.1/vtdec_hw의 EOS drain이 비동기 callback 완료 전에 정렬 대기를 해제한다.
burst에서는 drain-row168 set-draining 뒤 frame24의2.8초가 먼저 출력되고,
뒤늦은 callback25→frame25의2.6초→decreasing2.6<2.8→출력2.8초가 실제 순서로 확인된다(187~197).
paced도 EOS 전25개 정상 출력 뒤 set-draining199→frame27의3.1초 출력→늦은 callback29→
frame29의3.0초→decreasing3.0<3.1→출력3.1초(213~223)로 같은 경로가 확인된다.
기저 디코더는 이후 reordered_output 보정도 하므로 모든 시간값 변경을 clamp 경고 하나로 일대일 해석하지 않는다.

범위: 현재 설치버전·H264 입력의 유한 EOS 경계 및 overlay 전달까지 확인했다. RTSP 네트워크/client,
HTTP/HLS 전체 운영, 다른 codec/버전/OS 전체 영향은 이번 결과로 확정하지 않는다.
과거 WR01 일반20→19 손실은 이번 두 normal 셀에서 재현하지 않았으며 과거 실패를 보존한다.
HW-02는 확인된 구현의 선택 제한 후보를 검토하며 PTS 덮어쓰기·timeout 변경·전역HW비활성화를 하지 않는다.
제품 소스/빌드 archive는 불변이며 LP25/LP26 기존 증거 범위는 유지된다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-DG01 / D03 | normal20 burst,20/20/20·입력/출력 전체PTS·EOS | PASS | 진단03 셀exit0 |
| HW-DG02 / D04 | normal20 paced,20/20/20·입력/출력 전체PTS·EOS | PASS | 진단03 셀exit0 |
| HW-DG03 / D05 제품 정확도 | bframe30 burst,30개이나2.6/2.7누락·2.8중복 | FAIL | 입력 정상, 실제clamp1건·후속시간재배치 |
| HW-DG04 / D06 제품 정확도 | bframe30 paced,30개이나3.0누락·3.1중복 | FAIL | 실제간격 공급도 EOS 뒤clamp1건 |
| HW-01 원인 관측 완전성 | 네셀 complete1,미지원/미확인경고/초과/예외0·원출력 완결 | PASS | 제품 해결 PASS가 아님; 다음 단계는 이 결함 수정 |
| `HW-IO01 pipe output and exit status preserved` | 자체07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR01 reorder accepted` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR02 same-count duplicate omission rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR02 same-count omission replacement rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR03 legitimate duplicate preserved` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR04 missing frame rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR05 invalid PTS rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR06 missing EOS rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR07 overflow rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR08 duplicate EOS rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR09 missing SEGMENT rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR10 non-TIME SEGMENT rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR11 complete oracle accepted` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR12 input mismatch is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR13 decoder mismatch is failure` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR14 overlay mismatch is failure` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR15 invalid observation is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR16 overflow is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR17 missing probe is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR18 missing bus EOS is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR19 bus ERROR is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR20 known error classification excludes raw text` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR21 unknown error classification excludes raw text` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR22 CAPS fixed allowlist rejects arbitrary values` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR01 actual product parse-launch PLACE_IN_BIN creates inspectable bin` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR02 no generated ghost sink occupies pending links` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR03 pay0 src connects directly to owned sink` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR04 dynamic downstream queue sink remains unoccupied` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR05 legacy automatic ghost occupies queue sink before PLAYING` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR23 delayed-link has fixed classification` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP01 callback retains decode number without pointers` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP02 push retains independent system number` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP03 decreasing warning preserves exact nanoseconds` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP04 malicious pointer token rejected without disclosure` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP05 trailing injected field rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP06 invalid timestamp rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP07 unknown warning makes diagnosis inconclusive without raw retention` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP08 debug array overflow makes diagnosis inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP09 known decreasing warning completes diagnosis without product PASS` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP10 absent source log is not fabricated as wait completion` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP11 finish frame preserves pre-clamp PTS and unknown DTS without pointer` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP12 numeric overflow rejected before conversion` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP13 unrelated long LOG ignored before selected-prefix bound` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP14 selected-prefix oversized message is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP15 callback exception boundary makes diagnosis inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP16 malformed DTS rejected without inventing source formats` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP17 missing finish-frame observation is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP18 official entry-only finish log is not pre-clamp evidence` | 자체06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP19 session-create error retains only signed numeric code` | 자체06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP20 session-create error rejects arbitrary suffix` | 자체06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| media-server-hw-impact.NdzVed | 자체05 binary/cache/registry | 1864596B | 자식 종료 후 삭제 | 부재 | self05 cleanup |
| media-server-hw-impact.x5yc9V | 진단01 binary/cache/registry | 1864596B | 자식 종료 후 삭제 | 부재 | drain01 cleanup |
| media-server-hw-impact.s5CdpK | 자체06 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | self06 cleanup |
| media-server-hw-impact.oUQq9k | 진단02 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | drain02 cleanup, 출력 누락 별도 기록 |
| media-server-hw-impact.3FuN3W | 자체07 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | self07 cleanup |
| media-server-hw-impact.cPiRx5 | 진단03 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | drain03 cleanup |
| media-server-hw-impact.y2sYkV | 자체08 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | self08 cleanup |

서버/포트/계정/운영 자료는 생성·변경하지 않았다. 로그는 안전 수치/hash/원인 순서와 개별 결과만 보존한다.
HW-01 커밋 전 문서/공백/스크립트 등록 검사를 수행한다. 커밋 완료와 HW-02 이후 완료를 구분한다.
등록 검사 첫 실행은11PASS/1FAIL이었다. grouped 출력 방지 문자열 검사가 출력이 아닌
invalid와 overflow bool을 쉼표로 함께 초기화하는 선언을 오탐했다. verifier는 유지하고 선언만 두 줄로 분리했다.
진단의 동작·ABI·시간값 처리는 같으므로 HW-01 네 셀 증거를 유지하고 자체검사/등록 검사만 재확인한다.
이 기록 편집 중 patch 문맥/행접두사 오류와 파일 검색 glob 불일치는 각각 미적용/읽기 실패로 끝났으며
제품·실행 증거를 바꾸지 않았다.
자체08은50/50 PASS·exit0·1840ms(wrapper3초), stderr0이다([로그](lp27-hw-self-08.log)).
등록 재검사02에서도 원래 선언을 인용한 이 문서가 같은 문자열 검사에 걸렸다(11PASS/1FAIL).
원래 선언 인용을 설명으로 바꾸고 검사 대상 전부에 금지 문자열이 없는지 확인한 뒤 재검사한다.
문서 링크02는 이전 이력으로 바꾼 제목을 가리키는 기존 anchor1개가 남아 실패했다. 해당 링크를 현재 제목으로 정정한다.

### HW-01 커밋 전 기록 검사

문서 링크03은288개 문서/9346링크/135anchor/failure0·exit0, 자산10/0·exit0,
등록03은12/0·exit0이다. bash 구문·working/staged diffcheck exit0.
등록 실패 로그01/02는 이력까지 검사하는 정적 문자열 규칙과 충돌하므로 문제 쉼표만 U+002C로
표기하고 원문 SHA를 파일 안에 보존했다. 둘 다 변환본이며 처음 FAIL을 유지한다.
진단 실행 로그와 제품 실패는 변환하지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 문서 링크02 | 제목 변경 후 기존 anchor1개 남음, exit1 | FAIL | 링크03에서 수정 확인 |
| 문서 링크03 | 288문서/9346링크/135anchor, exit0 | PASS | lp27-hw01-docs-links-03.log |
| bash 구문 | 진단 wrapper bash -n, exit0 | PASS | 의미 변경 없는 선언 분리 |
| 공백 검사 | git diff --check 및 --cached --check, exit0 | PASS | 커밋 직전 재확인 |
| 자산: README uses only representative product UI screenshots | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: English README uses English UI screenshots | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: UI guide keeps product screenshots in the shared asset set | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: docs UI asset policy documents capture rules | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: managed UI asset manifest stays complete | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: capture script owns every documented UI asset | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: docs capture covers current screenshots | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: representative screenshot docs do not point at stale visual baselines | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: docs UI asset directory contains managed PNG files | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: VA documentation images keep full video frame bounds | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: dispatch parser recognizes explicit bash and node interpreters | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: server.sh dispatch targets exist and are executable | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: documented server.sh commands resolve to dispatch table | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: tracked scripts are classified and referenced | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: project inventory delegates script file inventory to this verifier | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: project inventory maps verifier families without duplicating dispatch details | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: CMake does not define a separate untracked CTest registry | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: test entry scripts are reachable from test_all | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: auth verifier has no hardcoded test password defaults | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: VA EventRecord dispatch verifier fails early and dispatches every poll by default | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: critical verifier pass output avoids grouped feature-result wording | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: user-facing JS option parsers reject unknown options | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |

## HW-02 실행 전 계약과 한정 보완

HW-01 진단 커밋: `d3d0dbc6`. 확정 구현 담당은 기존 단일 Astra/medium이며 하위 위임 금지다.
메인은 실제 diff·합격 기준·최종 판정을 담당한다. 적용은 macOS + applemedia 정확한1.28.1 +
실제 fixed `video/x-h264` 입력 + `vtdec_hw`/`vtdec` 후보의 교집합이다. plugin/version/codec
미확인은 대상이라고 추정하지 않으며, Linux·다른 버전·H265/VP8/audio 선택은 유지한다.
해당 객체의 autoplug-select에서만 후보를 SKIP하고 나머지는 TRY한다. 후보 부재는 기존 실패로 남기며
무조건 avdec_h264 성공을 보장하지 않는다. 출력 route codec으로 입력 decoder를 결정하지 않는다.

공통 helper는 RTSP media root 준비 전과 URI uridecodebin PLAYING 전에 설치한다.
동적 child 관측 연결을 먼저 만들고 기존 tree를 순회하며 중복 설치·객체 해제·iterator 변경을 처리한다.
외부 callback 상태/root ref를 계속 보유하지 않는다. GStreamer OFF 컴파일 경계를 유지한다.
전역 rank·패키지·기존 payload/schema·녹화/ID/시간값·미디어 blocking·timeout은 불변이다.
공식 [decodebin autoplug-select](https://gstreamer.freedesktop.org/documentation/playback/decodebin.html#autoplug-select)의
TRY/SKIP·handler 누적 규칙을 사용한다. 버전 업그레이드 또는 upstream 소스 복사는 이번 범위가 아니다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-MP01~15 | 순수 선택 조건별 반례 | 두 대상·플랫폼·fixed/empty·codec·factory·plugin·version을 독립 assertion으로 확인, 실행 전 정확 목록 결박 | v4.1.0 |
| HW-MH01 | 기존 decodebin | 실제 signal에 설치 후 대상 SKIP, 나머지 TRY | v4.1.0 |
| HW-MH02 | 재설치 | 동일 객체 반복 설치 뒤 handler 중복 없음 | v4.1.0 |
| HW-MH03 | 동적 nested | 설치 뒤 추가된 bin/decodebin에도 정책 적용 | v4.1.0 |
| HW-MH04 | 전역 rank | 모든 대상/대조 factory rank 전후 불변 | v4.1.0 |
| HW-MH05 | 객체 수명 | root/child 해제·약한 참조 소멸, 외부 보유 없음 | v4.1.0 |
| HW-MH06 | 미완료 설치 | in-progress marker를 완료로 처리하지 않고 false, Linux는 무변경 no-op | v4.1.0 |
| HW-MH07 | 실패 설치 | 실패 marker 재호출도 false, Linux는 무변경 no-op | v4.1.0 |
| HW-MH08 | 동적 설치 실패 전달 | child 설치 실패를 고정문구 bus ERROR로 전달, 경고만으로 계속하지 않음 | v4.1.0 |
| HW-MH09 | 실제 H264 선택 신호 | 실제 factory/caps로 signal emit, 확인 tuple이면 SKIP·나머지 TRY | v4.1.0 |
| HW-MH10 | 실제 ANY 선택 신호 | ANY caps signal emit은 TRY | v4.1.0 |
| HW-MH11 | 실제 H265 선택 신호 | H265 caps signal emit은 TRY | v4.1.0 |
| HW-MH12 | 실제 SW 선택 신호 | avdec_h264 후보 signal emit은 TRY | v4.1.0 |
| HW-MI01-PTS | normal20 burst 정확도 | 제품 helper 적용한 실제 RTSP builder, 전체 입력/출력/overlay PTS·EOS | v4.1.0 |
| HW-MI01-SELECT | normal20 burst 선택 | 실제 관측 factory에서 해당 vtdec 후보 제외 | v4.1.0 |
| HW-MI02-PTS | normal20 paced 정확도 | DTS 간격, 동일 oracle·5초 EOS 유지 | v4.1.0 |
| HW-MI02-SELECT | normal20 paced 선택 | 실제 관측 factory 확인 | v4.1.0 |
| HW-MI03-PTS | B-frame30 burst 정확도 | 같은 HW-01 입력, 전체PTS multiset·EOS 유지 | v4.1.0 |
| HW-MI03-SELECT | B-frame30 burst 선택 | 실제 관측 factory 확인 | v4.1.0 |
| HW-MI04-PTS | B-frame30 paced 정확도 | 실제 간격 입력·동일 oracle, 보정 없이 원값 보존 | v4.1.0 |
| HW-MI04-SELECT | B-frame30 paced 선택 | 실제 관측 factory 확인 | v4.1.0 |
| HW-BUILD | 현재 전체 빌드 | 격리 GStreamer cache, local override 제외, ./server.sh build | v4.1.0 |
| HW-NOGST | GST OFF 경계 | 새 helper의 GST OFF 컴파일, GST header/symbol 의존 없음 | v4.1.0 |

메인 중간 검토로 Linux 실제 설치 no-op·동적 설치 실패 전달/marker 반례와 실제 signal 반환값을 보완했다.
반환 diff 검토에서 선택 oracle도 exact tuple만 거부하도록 맞췄다(다른 버전 vtdec를 무조건 거부하지 않음).
wrapper는 mitigation exit0이어도 완결 summary가 없으면 exit2이며 IO02로 직접 반례를 확인한다.
최종 자체 예상은 기존50+MP15+MH12+IO02=78이다. MP의 실행 전 정확 항목은 다음과 같다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-MP01 | exact macOS H264 vtdec_hw tuple skips | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP02 | exact macOS H264 vtdec tuple skips | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP03 | other platform preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP04 | nonfixed ANY or ambiguous caps preserve selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP05 | empty caps preserve selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP06 | H265 input preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP07 | VP8 input preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP08 | other factory preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP09 | other plugin preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP10 | older version preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP11 | newer version preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP12 | unknown version preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP13 | unknown factory preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP14 | unknown plugin preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP15 | raw input preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-IO02 | 미완결 결과의 거짓 PASS 방지 | mitigation exit0+summary 부재→2, 정상/실패/자체 모드 원 exit 유지 | v4.1.0 |
`--mitigation-impact`만 제품 정책을 적용하고 기존 `--drain-diagnosis`/`--rtsp-impact`는 보존한다.
관측 불완전/제품FAIL을 즉시 실패로 유지하고 다음 단계로 넘어가지 않는다.
미디어 기본 회귀7.4 중 실제 브라우저 metadata는 사용자 제외에 따라 이번 실행하지 않는다.
codec/ICE의 기존 명령은 외부/기존 서버에 연결하지 않도록 격리 선수조건을 확인한 뒤 HW-03에서 판정한다.
HW-03의 실제 코덱·URI 경계·자원 영향과 S11 최종 묶음을 이 자체검사 PASS로 대체하지 않는다.

기존 증거 유지 판단(이 helper/두 호출부 외 제품 변경이 없을 때): LP25 실제 앱은
`verify_recording_current_app.mjs`의 source9101 `kind:file`/identity.mp4를 사용하고,
LP26 장시간 준비도 `verify_recording_current_longrun.mjs`의 file source다. 두 경로는
UriSourceWorker와 RTSP egress 자동 decoder를 사용하지 않는다. API/Auth/managed 저장·파생 구현도
변경하지 않으므로 LP25 156/LP26 436의 해당 단기 증거를 이번 인계만으로 재실행하지 않는다.
URI/RTSP 회귀 및 S11 최종 cut PASS로 확장하지 않으며, 실제 diff가 이 경계를 넘으면 재판정한다.

### HW-02 구현·실행 결과

제품 변경은 공통 `core::ShouldSkipAppleH264Decoder`/`InstallDecodeCompatibility`,
UriSourceWorker::Start/OnMediaConfigure의 설치 호출과 CMake 등록이다. 기존 입력/출력 codec,
PTS/DTS·저장·공개 API·전역 rank는 변경하지 않았다. 설치된 VideoToolbox를 고친 것이 아니라
확인된 조합의 제품 자동선택을 회피한 해결책이다. 다른 OS/버전은 이번 macOS 실행으로 검증했다고 주장하지 않는다.
메인이 실제 diff를 검토하고 반환 뒤 exact tuple oracle와 미완결 summary 거부를 직접 보완했다.

`./server.sh build` exit0(전체 runtime/server), 새 helper의 `c++ -std=c++17 -Wall -Wextra -Werror
-Iinclude -DMEDIA_SERVER_USE_GSTREAMER=0 -fsyntax-only src/core/gst_decode_compatibility.cpp` exit0.
빌드/GST OFF elapsed는 명령에 타이머가 없어 미계측이며 token 집계도 미제공이다. Linux 실기기 실행은 아니다.
`bash scripts/internal/verify_recording_hw_impact.sh --self-test` 자체01은78PASS·exit0·1871ms/3초,
`--mitigation-impact` 보완01은4셀/8PASS·exit0·6292ms/7초, stderr0·EOS/입력/decoder/overlay 모두 일치.
둘은 같은 archive `de62559c57ea2ed918615990af970ef10cb5df29d8a9d7fe226b4eab5655f585`에 결박했다.
일반/B-frame 모든 셀의 실제 decoder는 avdec_h264/libav1.28.1이었다. 원래 HW-01 실패는 여전히 유효한 과거 반례다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-BUILD | 격리 cache·local override 제외, 전체 configure/build exit0 | PASS | [빌드 출력](lp27-hw02-build.log) |
| HW-NOGST | 위 GST OFF helper 컴파일 exit0, 원출력 없음 | PASS | 전체 Linux 실행 아님 |
| `HW-IO01 pipe output and exit status preserved` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-IO02 incomplete mitigation summary cannot pass` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR01 reorder accepted` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR02 same-count duplicate omission rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR02 same-count omission replacement rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR03 legitimate duplicate preserved` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR04 missing frame rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR05 invalid PTS rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR06 missing EOS rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR07 overflow rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR08 duplicate EOS rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR09 missing SEGMENT rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR10 non-TIME SEGMENT rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR11 complete oracle accepted` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR12 input mismatch is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR13 decoder mismatch is failure` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR14 overlay mismatch is failure` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR15 invalid observation is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR16 overflow is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR17 missing probe is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR18 missing bus EOS is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR19 bus ERROR is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR20 known error classification excludes raw text` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR21 unknown error classification excludes raw text` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR22 CAPS fixed allowlist rejects arbitrary values` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR01 actual product parse-launch PLACE_IN_BIN creates inspectable bin` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR02 no generated ghost sink occupies pending links` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR03 pay0 src connects directly to owned sink` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR04 dynamic downstream queue sink remains unoccupied` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR05 legacy automatic ghost occupies queue sink before PLAYING` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR23 delayed-link has fixed classification` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP01 callback retains decode number without pointers` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP02 push retains independent system number` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP03 decreasing warning preserves exact nanoseconds` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP04 malicious pointer token rejected without disclosure` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP05 trailing injected field rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP06 invalid timestamp rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP07 unknown warning makes diagnosis inconclusive without raw retention` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP08 debug array overflow makes diagnosis inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP09 known decreasing warning completes diagnosis without product PASS` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP10 absent source log is not fabricated as wait completion` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP11 finish frame preserves pre-clamp PTS and unknown DTS without pointer` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP12 numeric overflow rejected before conversion` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP13 unrelated long LOG ignored before selected-prefix bound` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP14 selected-prefix oversized message is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP15 callback exception boundary makes diagnosis inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP16 malformed DTS rejected without inventing source formats` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP17 missing finish-frame observation is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP18 official entry-only finish log is not pre-clamp evidence` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP19 session-create error retains only signed numeric code` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP20 session-create error rejects arbitrary suffix` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP01 exact macOS H264 vtdec_hw tuple skips` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP02 exact macOS H264 vtdec tuple skips` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP03 other platform preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP04 nonfixed ANY or ambiguous caps preserve selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP05 empty caps preserve selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP06 H265 input preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP07 VP8 input preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP08 other factory preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP09 other plugin preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP10 older version preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP11 newer version preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP12 unknown version preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP13 unknown factory preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP14 unknown plugin preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP15 raw input preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH01 existing decodebin hook follows platform gate` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH02 repeated installation does not duplicate hooks` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH03 dynamically nested decodebin hook follows platform gate` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH04 installation leaves global factory ranks unchanged` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH05 root and decoder lifetimes retain no external references` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH09 actual H264 signal returns SKIP only for installed affected tuple` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH10 actual ANY caps signal returns TRY` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH11 actual H265 caps signal returns TRY` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH12 actual avdec_h264 candidate signal returns TRY` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH06 in-progress marker is not completion on macOS and untouched elsewhere` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH07 failed marker remains failed across repeated installation` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH08 dynamic installation failure posts bus ERROR only on macOS` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MI01-normal20-burst exact full PTS and EOS` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI01-normal20-burst selected factory respects exact compatibility tuple` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI02-normal20-paced exact full PTS and EOS` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI02-normal20-paced selected factory respects exact compatibility tuple` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI03-bframe30-burst exact full PTS and EOS` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI03-bframe30-burst selected factory respects exact compatibility tuple` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI04-bframe30-paced exact full PTS and EOS` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI04-bframe30-paced selected factory respects exact compatibility tuple` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/tmp/media-server-hw-build.ZkXWIf | build cache/symlink mirror | 62691B | 실제 소유/0700/정규경로 확인 후 삭제 | 부재 | 메인 cleanup exit0 |
| media-server-hw-impact.EzPd0G | 자체01 binary/cache/registry | 1886868B | 자식 종료 후 삭제 | 부재 | 자체01 cleanup |
| media-server-hw-impact.HYcKB3 | 보완01 binary/cache/registry | 1886868B | 자식 종료 후 삭제 | 부재 | 보완01 cleanup |

새 서버/포트/계정은 사용하지 않았다. 빌드 산출물은 기존 build-gst-onnx에 유지한다.
HW-03 영향·PREP/CLOSE 및 S11 최종 검증은 아직 미실행이며 이번 PASS 범위 밖이다.

HW-02 마감: 문서 링크288개/9455링크/135anchor·실패0, 등록12/0·exit0, bash구문/diffcheck exit0.
이미지·자산 참조 변경은 없어 HW-01 자산10PASS의 유효 범위를 유지했다.
출력이 없는 GST OFF 컴파일의 빈 로그 파일은 불필요하여 제거했으며 실제 command/exit는 위에 보존했다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-02 문서 링크 | 위288문서/9455링크/135anchor·exit0 | PASS | [문서 출력](lp27-hw02-docs-links.log) |
| HW-02 bash 구문 | bash -n scripts/internal/verify_recording_hw_impact.sh exit0 | PASS | 실제 실행 전/마감 확인 |
| HW-02 공백 | git diff --check 및 --cached --check exit0 | PASS | stage 범위 확인 |
| dispatch parser recognizes explicit bash and node interpreters | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| server.sh dispatch targets exist and are executable | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| documented server.sh commands resolve to dispatch table | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| tracked scripts are classified and referenced | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| project inventory delegates script file inventory to this verifier | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| project inventory maps verifier families without duplicating dispatch details | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| CMake does not define a separate untracked CTest registry | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| test entry scripts are reachable from test_all | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| auth verifier has no hardcoded test password defaults | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| VA EventRecord dispatch verifier fails early and dispatches every poll by default | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| critical verifier pass output avoids grouped feature-result wording | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| user-facing JS option parsers reject unknown options | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |

## 이전 승인 범위와 순서

| 번호 | 사용자 지시 | 상태 | 산출물·완료 기준 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | HW 디코딩 영향 판정·필요 경로 보완 | 부분 완료·수정 방침 판단 대기 | 실제 RTSP builder graph에서 decoder PTS 불일치 및 overlay 전달 확인. 제품 선택 정책 보완은 미실행 | 자체04·영향03 |
| 2 | 검증 준비 마감 | 건너뜀 | 1번 미해소. 초기 기능 ID/복합 요구·실환경 실행·최종 대상 결박 잔여 | LP26 실행 매핑 |
| 3 | 구형 코드·개발 자료 정리 | 건너뜀 | 1번 미해소. 소유·사용처·대체 검사를 확인하고 불필요 부분만 삭제할 예정 | LP26 릴리즈 전수 대조 |
| 4 | 문서·S10 코드/증거 고정 | 건너뜀 | 1번 미해소. 이번 중단 기록 작성은 S10 고정 완료가 아님 | AGENTS3/6/7/12 |
| 5 | 분할 커밋·푸시·종합 보고 | 커밋/푸시 미수행·보고 정리 | 승인 유지하되 1번 실패 및 미커밋 상태로 조건 미충족. 종합 잔여는 이 문서와 최신 전수표 | 사용자 최신 지시·AGENTS5 |

장시간/실제 UI·verify-predev·PR/merge/tag/Release·후속 브랜치·외부 실기기는 이번 실행 범위 밖이다.
기존 저장/API/시간/ID/보존·미디어 blocking 계약, 비밀 보호·격리·정리 경계를 유지한다.
HW 실패를 없애려고 설치 패키지·전역 factory rank·timeout·합격 oracle를 바꾸지 않는다.
근거가 확인되지 않은 동일 재실행은 하지 않는다. 1번이 해결되지 않으면 2~4로 넘어가지 않는다.
메인이 안전 설계·공식 source/제품 경로·최종 판정을 맡는다. 기존 단일 Astra/medium 담당자는 확정된 독립 범위만 수행하며 하위 위임 금지.
현재 Superpowers 스킬은 가용 목록에 없으므로 설계·원인 분리·반례·검토·영향 검증을 직접 적용한다.

## 1번 직접 확인과 진단 기준

기존 동일 SHA 파일 대조는 qtdemux/parser 입력이 정상인 상태에서 vtdec_hw의 count 감소 및 PTS 누락/중복을 확인했다.
WR01은20→19, WR05는30→29이며 EOS가 관측되었다. SW 대조는 정상이나 HW 해결 근거는 아니다.
원본 녹화 writer/remux는 압축 packet을 저장하며 분석 raw decoder와 파생 remux의 H264 decode는 명시 avdec_h264다.
자동 선택은 UriSourceWorker의 HTTP/HLS/해석된 YouTube 입력, RTSP egress의 BuildFactoryLaunch에 남아 있다.
URI downstream의 leaky queue/videorate와 subscriber queue는 별도 손실 경계다. decoder 자체 PTS 손실과 혼동하지 않는다.

[GStreamer 1.28.1 vtdec 공식 구현](https://raw.githubusercontent.com/GStreamer/gstreamer/1.28.1/subprojects/gst-plugins-bad/sys/applemedia/vtdec.c)의
drain/finish·비동기 callback을 참고하되 이 일반 구현만으로 plugin/VideoToolbox 내부 원인을 확정하지 않는다.
외부 코드 복사·설치/수정 없음. 특허 자료를 검색·참고하지 않는다.

### 사전 등록

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP27-H01 | 동일 입력/소스 결박 | 격리 생성한 H264 일반/B-frame AU·파일 SHA·PTS/DTS를 고정하고 제품 factory/builder 재사용 여부 확인 | v4.1.0 |
| LP27-H02 | 실제 decoder 경계 | 실제 factory·sink/src의 buffer/PTS·EOS·SEGMENT와 누락 관측 수를 비교 | v4.1.0 |
| LP27-H03 | 제품 downstream 경계 | URI raw 입력/encoder 이전, RTSP analysis_overlay raw 입력의 PTS 대응. leaky/rate 정책과 decoder 오류 분리 | v4.1.0 |
| LP27-H04 | 독립 oracle | 같은 개수의 중간 누락/중복, EOS 이전 중단, 관측 누락·source 불일치 거부. 정상 재정렬은 presentation 비교 | v4.1.0 |
| LP27-H05 | 종료·안전 | 제한된 실행·thread/pipeline 종료·probe 수명·소유 root/포트 정리·원본 불변 | v4.1.0 |
| LP27-H06 | 판정 분리 | 관측 성공과 제품 정상 PASS 분리. bounded 미재현은 무영향/해결이 아님, 최초 불일치 보존 | v4.1.0 |

#### 최초 실행 명령·회수 기준

1. `bash scripts/internal/verify_recording_hw_impact.sh --self-test`: 독립 oracle의 정상/누락/중복/EOS/관측 상한 반례.
2. 1번 통과 후 `bash scripts/internal/verify_recording_hw_impact.sh --rtsp-impact`: 실제 제품 BuildFactoryLaunch를 링크한
   video branch를 진단 소유 sink로 소비하며 decoder sink/src와 analysis_overlay sink를 대조한다.
   실제 RTSP 네트워크/클라이언트 검사가 아니며 HTTP/HLS source worker 전체 영향으로 확대하지 않는다.

normal20/B-frame30 AU를 각각 한 번 생성하고 동일 입력으로 최대16round(총32graph)만 관측한다.
실제 ConfigureFactory는 BuildFactoryLaunch를 그대로 사용한다(gstreamer_rtsp_server.cpp:299).
PushToAppSrc는 PTS/DTS/DELTA만 전달하고 duration을 설정하지 않는다(rtsp_egress_session.cpp:152).
따라서 probe도 duration을 설정하지 않으며 원본 AU duration은 입력 증거로만 남긴다. 최초 실행 전 조건을 제품과 일치시켰다.
첫 불일치/관측 오류에서 전체 종료하며 다음 정상 실행으로 실패를 대체하지 않는다.
전체 presentation multiset을 비교해 같은 count의 중복·누락도 거부한다. QoS/경계 관측 부재는 정상으로 추정하지 않는다.
기존 helper의 encoder EOS 미관측 한계 때문에 AU 생성 성공만으로 무손실 입력이라 하지 않고 실제 decoder sink 입력과 전체 AU를 대조한다.
성공 단기 oracle exit0, 실제 mismatch exit1, 준비/관측 실패 exit2, bounded 미재현 exit3을 구분한다.
미재현은 기존 WD05/08 해소/제품 무영향 PASS가 아니다. 외부 패키지·디코더 선택 정책 변경이 필요하면 중단해 범위를 보고한다.
wrapper의180초는 32graph 진단 전체 안전상한이며 각graph5초 drain/sample3초의 기존 기준을 늘리지 않는다.
소유0700root 내 compile/cache/registry만 생성한다. 프로세스 종료 후 크기·삭제·부재를 기록하며 운영 자료/외부입력/네트워크를 사용하지 않는다.
임시 자료 외 필요한 원출력은 비민감 수치/PTS/hash만 LP27 artifact로 보존하고 raw GStreamer stderr는 bytes/hash/고정 분류만 공개한다.
관측기 자체 critical/warning도 정상 판정으로 덮지 않고 준비 오류exit2로 반환한다.
실행 전 메인 리뷰는 segment 시각 근거·관측불완전과 제품 불일치 구분·예외에서도NULL→callback해제 수명·root 소유 검사를 보완한다.
`--self-test`의 관련 반례를 추가하며 최초 실제 실행 전에 이 기준을 고정한다.

GStreamer 공식 1.28 release notes에는 후속 vtdec 수정 이력이 있으나 이번 프레임/PTS 문제의 수정 여부나
현 환경 업그레이드 적합성은 확인되지 않았다. 이것을 원인 확정이나 패키지 교체 승인으로 사용하지 않는다.
출처: [공식 1.28 변경 기록](https://gstreamer.freedesktop.org/releases/1.28/).

예상된 RED는 명시 반례 oracle의 미구현 assertion으로만 한정한다. 빌드·환경·기존 제품 실패는 RED가 아니다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 관련 단기 자체/제품 영향 | 진행 대상 | 1~4 개발 요청 | LP27-H01~06·후속 단계 사전정의 | 승인·단계별 실행 |
| 제품 전체 빌드/영향 회귀 | 조건부 진행 | 실제 제품 수정 시 해당 영향 | 변경 diff 확정 후 선정 | 개발 관련 범위만 승인 |
| 30분·120분·실제 UI | 미진행 | 현재 선행 개발 단계 | AGENTS7.6.2·S11 | 이번 실행 제외, 릴리즈 필수 여부는 유지 |
| 문서/등록 정합 | 진행 대상 | 실행/문서 변경 | diffcheck·docs-links/assets·script inventory | 승인된 변경 단기 검증 |
| 외부 release action | 미진행 | 개발 브랜치 push만 승인 | AGENTS4/5 | PR/merge/tag/Release 별도 |

## 실행 결과·정리

첫 자체검사 exit0/20PASS, 실행499ms·wrapper1초, root279787B 삭제·부재 확인. [원출력](lp27-hw-self-01.log).
첫 실제 graph는 normal20 round1에서 exit2/1669ms·wrapper2초. 입력 push20은 수용됐으나
decoder sink8/EOS0→src1/EOS0→overlay0·SEGMENT0, busERROR1/WARNING1으로 관측 전제가 미충족됐다.
선택은 vtdec_hw/applemedia1.28.1/rank257. 이것은 과거20→19 재현이나제품무영향 증거가 아니다.
원출력 [impact01](lp27-hw-impact-01.log), root1819636B 삭제·부재. 2~4번은 실행하지 않았다.

진단 준비의 누락: bus 코드/분류를 보존하지 않아 ERROR 원인을 확정할 수 없다.
동일 단계에서 source factory/domain/code 및 허용된 고정 negotiation/stream/decoder 오류 분류,
CAPS의 안전한 media/format/width/height/memory feature만 추가한다. raw 오류/debug/URI/codec_data는 출력하지 않는다.
LP27-H02/H05 관측 oracle를 보완하고 자체검사 뒤 같은 단기 진단1회로 오류를 분리한다.
timeout·pipeline·자동선택·합격 조건은 변경하지 않는다. 분류할 수 없는 오류는 unknown으로 남기며 맹목 반복하지 않는다.

읽기 탐색에서 존재하지 않는 추정 소스/문서 경로 및 없는 .agents 디렉터리에 대한 rg exit2는
실행 실패/제품 회귀가 아니라 경로 탐색 오류이며, rg --files로 실제 위치를 확인했다.
token start/end/consumed는 전용 집계 미제공으로 미집계. elapsed/source는 실제 실행 원출력 범위로 기록한다.

### 안전 분류 보완 후 재검사와 준비 결함 확정

자체02는 exit0/23PASS,590ms·wrapper2초,root298987B 삭제·부재([로그](lp27-hw-self-02.log)).
영향02는 exit2/1398ms·wrapper2초,normal20 round1에서 중단([로그](lp27-hw-impact-02.log)).
`gst_parse_error` code7은 로컬 gstparse.h의 `GST_PARSE_ERROR_DELAYED_LINK`다.
decodebin warning 뒤 appsrc stream-error code1, decoder sink8/src1/overlay0, sink·src EOS0이었다.
decoder 출력은 NV12/SystemMemory160x90이며, 영상 형식 자체가 원인이라고 단정하지 않는다.
root1838836B 삭제·부재. 이전과 같은 입력 SHA를 유지했고 제품 정상/과거20→19 재현 증거가 아니다.

공식1.28.1 소스를 읽어 진단의 구성 차이를 확인했다.
[RTSP factory default_create_element](https://raw.githubusercontent.com/GStreamer/gstreamer/1.28.1/subprojects/gst-rtsp-server/gst/rtsp-server/rtsp-media-factory.c)는
`gst_parse_launch_full`+`GST_PARSE_FLAG_PLACE_IN_BIN`을 사용한다.
반면 최초 probe의 `gst_parse_bin_from_description(...,TRUE)`는
[gstutils 자동 ghost 처리](https://raw.githubusercontent.com/GStreamer/gstreamer/1.28.1/subprojects/gstreamer/gst/gstutils.c)에서
아직 동적 연결을 기다리는 downstream queue sink까지 외부 ghost target으로 점유할 수 있다.
이는 제품의 생성 방식과 다른 진단 준비 결함이다. pipeline 표현/timeout/rank를 바꾸지 않고
제품과 같은 생성 함수를 사용하며 pay0 출력만 진단 sink에 연결하도록 수정한다.
LP27-H03/H04에 생성 방식·추가 ghost sink 부재·pay0 출력 연결·동적 sink 미점유 자체검사를 실행 전 추가한다.
수정 후 자체검사 통과 시 동일 영향 검사를1회 재개한다. 이 차이가 해결돼도 과거 HW 손실이 해결된 것으로 간주하지 않는다.
자체검사에 기존 자동ghost 방식의 queue sink 점유를 NULL 상태에서 직접 확인하는 음성 대조도 추가한다.
이 assertion이 실제 통과하기 전에는 연결 실패의 확정 원인 증거로 사용하지 않는다.
자체03은28PASS/1FAIL(exit1,1620ms)이며 GR05에서 기존 자동ghost의 queue 점유를 직접 확인했다.
GR04 수정된 생성 방식의 pending queue 미점유도 PASS이나 GR02는 recursive 전체 ghost sink0을 요구해 실패했다.
decodebin이 원래 갖는 내부 ghost sink와 진단의 외부 자동ghost를 구분하지 않은 검사 오류다.
메인이 회수해 branch 외부 ghost sink0 및 queue target 점유0으로 수정한다. 실제 동적 연결 대기 queue1 기준은 유지한다.
이것은 새 제품 합격 기준이 아니라 진단이 제품 graph를 바꾸지 않는 조건의 정확한 검사다.
영향03은 아직 실행하지 않았다. root1840420B 삭제·부재, 원출력 [자체03](lp27-hw-self-03.log).
공식 원문 조회는 읽기 전용이며 각 curl+rg exit0, 파일 저장·외부 코드 복사·패키지 변경은 없었다.
웹 읽기 도구의 cache miss 후 같은 공식 source를 curl로 읽었다. 문구 수정 patch1회는 대상 행 불일치로 미적용 후 정확한 행으로 적용했다.

### 자체02 개별 결과

명령 `bash scripts/internal/verify_recording_hw_impact.sh --self-test`,exit0.
자체01의 처음20개는 동일 제목으로 PASS였고,02에서 안전 분류3개를 추가했다. 전체 원출력은 각 실행 로그에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-OR01 reorder accepted | `--self-test`, exit0·HW-OR01 reorder accepted | PASS | 안전 분류 추가 후 자체02 |
| HW-OR02 same-count duplicate omission rejected | `--self-test`, exit0·HW-OR02 same-count duplicate omission rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR02 same-count omission replacement rejected | `--self-test`, exit0·HW-OR02 same-count omission replacement rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR03 legitimate duplicate preserved | `--self-test`, exit0·HW-OR03 legitimate duplicate preserved | PASS | 안전 분류 추가 후 자체02 |
| HW-OR04 missing frame rejected | `--self-test`, exit0·HW-OR04 missing frame rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR05 invalid PTS rejected | `--self-test`, exit0·HW-OR05 invalid PTS rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR06 missing EOS rejected | `--self-test`, exit0·HW-OR06 missing EOS rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR07 overflow rejected | `--self-test`, exit0·HW-OR07 overflow rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR08 duplicate EOS rejected | `--self-test`, exit0·HW-OR08 duplicate EOS rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR09 missing SEGMENT rejected | `--self-test`, exit0·HW-OR09 missing SEGMENT rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR10 non-TIME SEGMENT rejected | `--self-test`, exit0·HW-OR10 non-TIME SEGMENT rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR11 complete oracle accepted | `--self-test`, exit0·HW-OR11 complete oracle accepted | PASS | 안전 분류 추가 후 자체02 |
| HW-OR12 input mismatch is inconclusive | `--self-test`, exit0·HW-OR12 input mismatch is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR13 decoder mismatch is failure | `--self-test`, exit0·HW-OR13 decoder mismatch is failure | PASS | 안전 분류 추가 후 자체02 |
| HW-OR14 overlay mismatch is failure | `--self-test`, exit0·HW-OR14 overlay mismatch is failure | PASS | 안전 분류 추가 후 자체02 |
| HW-OR15 invalid observation is inconclusive | `--self-test`, exit0·HW-OR15 invalid observation is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR16 overflow is inconclusive | `--self-test`, exit0·HW-OR16 overflow is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR17 missing probe is inconclusive | `--self-test`, exit0·HW-OR17 missing probe is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR18 missing bus EOS is inconclusive | `--self-test`, exit0·HW-OR18 missing bus EOS is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR19 bus ERROR is inconclusive | `--self-test`, exit0·HW-OR19 bus ERROR is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR20 known error classification excludes raw text | `--self-test`, exit0·HW-OR20 known error classification excludes raw text | PASS | 안전 분류 추가 후 자체02 |
| HW-OR21 unknown error classification excludes raw text | `--self-test`, exit0·HW-OR21 unknown error classification excludes raw text | PASS | 안전 분류 추가 후 자체02 |
| HW-OR22 CAPS fixed allowlist rejects arbitrary values | `--self-test`, exit0·HW-OR22 CAPS fixed allowlist rejects arbitrary values | PASS | 안전 분류 추가 후 자체02 |

### 실제 제품 경계 관측 결과와 중단 이유

자체04는29PASS/0FAIL,exit0·1526ms·wrapper2초([로그](lp27-hw-self-04.log)).
영향03은 실제 제품과 같은 parse 방식에서 normal20 round1의 전체PTS/EOS 일치를 확인한 뒤,
B-frame30 round1에서 최초 `decoder-pts-mismatch`로 종료했다(exit1·1394ms·wrapper2초).
[영향03 원출력](lp27-hw-impact-03.log)은 source/입력 SHA·각 AU·세 경계 PTS·EOS·CAPS를 포함한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| H01 동일 입력 | normal20 SHA0becff01… / B-frame30 SHA3d4812da…; 영향01/02/03 동일 | PASS | 비디오 원본 파일 변조가 아닌 동일 생성 AU |
| H03 제품 graph 생성 | 외부 ghost0/queue target 점유0/pending queue1/pay0 연결1 | PASS | 앞선 진단 준비 결함 수정. RTSP 네트워크 검사는 아님 |
| H02 일반 입력 round1 | sink20/src20/overlay20·전체 PTS 일치·EOS 각1 | PASS | 한 round 한정. 과거 일반 입력 손실 해소를 뜻하지 않음 |
| H02 B-frame 입력 round1 | sink30·입력 PTS 일치·EOS1 | PASS | decoder에 모든 입력 전달 확인 |
| H02 B-frame 출력 round1 | src30이나 PTS2.6/2.7초 없음,2.8초3개 | FAIL | decoder 출력 경계에서 처음 불일치. 영상 픽셀 중복/손실까지 단정하지 않음 |
| H03 B-frame overlay round1 | overlay30,decoder의 PTS 불일치 그대로 전달 | FAIL | downstream queue/videoconvert가 고친다고 가정할 수 없음 |
| H05 관측·종료 | EOS각1/busEOS1,error0/warning0/QoS0/invalid0/overflow0,process 정상 exit1 | PASS | 오류 코드 없는 정상 종료와 제품 정확도 PASS는 다름 |
| H06 최초 실패 보존 | attempts2 후 종료,다음 round나SW로 실패 덮지 않음 | PASS | 제품 판정은 FAIL 유지 |

메인이 확인한 범위:

- 확인: macOS arm64/GStreamer1.28.1의 vtdec_hw 선택, 실제 BuildFactoryLaunch H264 graph 내부에서 PTS 불일치가 발생·전달된다.
- 확인: 원본 File/RTSP recorder는 압축 packet 경로, analysis/raw_video_decoder 및 derived_remux H264 decode는 명시 avdec_h264다. 이번 도구는 이들 제품 경로를 바꾸지 않았다.
- 미확인: 실제 RTSP 네트워크/client와 HTTP/HLS UriSourceWorker 전체 동작. latter는 자동 decoder 선택 코드가 있어 영향 가능성이 있으나 동일 실제 실행 근거는 없다.
- 추론: 공식 vtdec1.28.1은 drain flag를 켠 뒤 비동기 frame 완료를 기다리며 output loop는 drain 중 reorder 깊이 조건 없이 출력한다. 이 순서가 말단 B-frame PTS 현상과 관련될 가능성은 있지만 callback·기본 GstVideoDecoder 내부를 직접 계측하지 않았으므로 근본 내부 결함을 확정하지 않는다.
- 금지: PTS를 downstream에서 임의 재부여해 정상으로 만들기, HW 실패를 SW PASS로 덮기, timeout 확대, 전역 rank/설치 패키지 변경.

권장 재개 범위는 영향을 받는 제품 H264 자동선택 경로의 로컬 SW 우선 보완과 동일 exact PTS/종료 회귀다.
디코더 선택 정책 및 HW 사용/자원 영향이 바뀌므로 사용자에게 범위 결정을 요청했다.
승인 전에는 해당 제품 변경·반복 실행·2~4번·실패 단계 커밋·푸시를 진행하지 않는다.
기존 LP25의 실제5단계156PASS 및 LP26 준비436개는 해당 동일 소스/범위의 과거 증거로 유지하며,
이번 HW 실패를 이유 없이 기존 저장/HTTP 실패로 바꿔 재등록하지 않는다. 최종 제품 수정 시 영향 범위를 다시 판정한다.

### 자체03→04의 추가 개별 결과

자체04에서 앞 표의23개는 모두 다시 PASS였다. 아래6개가 추가 실행됐다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-GR01 | 제품 parse-launch PLACE_IN_BIN 생성/검사 | PASS | 03/04 각PASS |
| HW-GR02 | 외부 자동ghost 및 queue target 점유 없음 | PASS | 03 FAIL:정상 decodebin 내부ghost까지 집계 → 04 수정후PASS. 최초FAIL 유지 |
| HW-GR03 | pay0와 소유 sink 직접 연결 | PASS | 03/04 각PASS |
| HW-GR04 | 동적 downstream queue sink 미점유1 | PASS | 03/04 각PASS |
| HW-GR05 | 구형 자동ghost의 queue 점유 음성 대조 | PASS | 03/04 각PASS,PLAYING 안 함 |
| HW-OR23 | delayed-link 고정 분류 | PASS | 03/04 각PASS |

### 문서·도구 정리 검증 사전 정의

제품 실패 뒤 다음 개발 단계가 아니라 이번 중단 기록과 진단 도구의 정합만 검사한다.
`bash -n scripts/internal/verify_recording_hw_impact.sh`, `git diff --check`,
`./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-script-inventory`를 순차 실행한다.
새 untracked helper는 tracked inventory 검사 밖이라는 한계를 명시하고 실제wrapper/native참조를 직접 대조한다.
이 문서 검사를 제품 실패·최종 안정화·1번 전체 PASS로 사용하지 않는다.

실행은 위 순서대로 exit0이었다. 링크288md/9334links/실패0,자산10/스크립트12PASS,
bash 구문 및 공백 검사 통과. [원출력](lp27-record-checks.log).
새 wrapper/native의 상호참조 및 이 기록의 호출 명령은 직접 확인했으나 tracked inventory12개가
untracked 파일까지 정식 등록 완료로 판정한 것은 아니다. 커밋 조건 충족 시 stage 후 재확인 대상이다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 셸 구문 | bash -n scripts/internal/verify_recording_hw_impact.sh,exit0 | PASS | 실행 아님 |
| 공백 | git diff --check,exit0 | PASS | tracked 변경 기준, 신규 파일 최종 별도 확인 |
| 문서 링크 | verify-docs-links,exit0·288/9334/0 | PASS | 실제 UI 검증 아님 |
| README uses only representative product UI screenshots | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| English README uses English UI screenshots | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| UI guide keeps product screenshots in the shared asset set | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| docs UI asset policy documents capture rules | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| managed UI asset manifest stays complete | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| capture script owns every documented UI asset | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| docs capture covers current screenshots | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| representative screenshot docs do not point at stale visual baselines | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| docs UI asset directory contains managed PNG files | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| VA documentation images keep full video frame bounds | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| dispatch parser recognizes explicit bash and node interpreters | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| server.sh dispatch targets exist and are executable | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| documented server.sh commands resolve to dispatch table | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| tracked scripts are classified and referenced | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| project inventory delegates script file inventory to this verifier | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| project inventory maps verifier families without duplicating dispatch details | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| CMake does not define a separate untracked CTest registry | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| test entry scripts are reachable from test_all | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| auth verifier has no hardcoded test password defaults | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| VA EventRecord dispatch verifier fails early and dispatches every poll by default | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| critical verifier pass output avoids grouped feature-result wording | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| user-facing JS option parsers reject unknown options | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |

### 소유 임시 자료 정리

경로의 공통 상위는 `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/`다.
원출력에는 각 절대 경로를 보존했다. 아래 모든 실행은 자식 종료 후wrapper가 삭제했고 마지막 읽기 확인에서 모두 부재였다.
삭제한 자료는 재생성 가능한 실행 전용 binary/cache/registry이며 필요한 비민감 값은 연결 로그에 보존했다.
실제 서버·RTSP listener·HTTP listener를 만들지 않아 포트 정리 대상은 없다. 운영 자료·기존 영상 삭제 없음.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| media-server-hw-impact.mpmo60 | 자체01 임시 binary/cache | 279787B | 자식 종료 후 삭제 | 부재 | self01 cleanup |
| media-server-hw-impact.gcANKq | 영향01 임시 binary/cache | 1819636B | 자식 종료 후 삭제 | 부재 | impact01 cleanup |
| media-server-hw-impact.vg506a | 자체02 임시 binary/cache | 298987B | 자식 종료 후 삭제 | 부재 | self02 cleanup |
| media-server-hw-impact.sbv7UB | 영향02 임시 binary/cache | 1838836B | 자식 종료 후 삭제 | 부재 | impact02 cleanup |
| media-server-hw-impact.IXwbV7 | 자체03 임시 binary/cache | 1840420B | 자식 종료 후 삭제 | 부재 | self03 cleanup |
| media-server-hw-impact.zbUg3T | 자체04 임시 binary/cache | 1840420B | 자식 종료 후 삭제 | 부재 | self04 cleanup |
| media-server-hw-impact.HVa1bX | 영향03 임시 binary/cache | 1840420B | 자식 종료 후 삭제 | 부재 | impact03 cleanup |
| lp27-hw-*.log·lp27-record-checks.log | 안전 수치/PTS/hash/자체결과 | 각 파일 Git diff 기준 | 저장소 보존 | 비디오·원문오류·비밀 없음 | 실패 재현/판정에 필요한 원출력 |

원격 읽기 결과: `git ls-remote` exit0,main431397d9b86af69f1690aff6fa6f3e61ea4fbe03,
v4.1.0 f4e58b9cb2efbeec43a7e1132da940fce6afd521,원격v4.1.0 tag 없음.
`gh release view` exit0:tagv4.0.0,draft=false,prerelease=false;
`gh pr list --head v4.1.0 --state open` 및 `gh run list --branch v4.1.0 --limit 5`는 각각빈배열/exit0.
HEAD/upstream은 같지만 미커밋 파일이 남아 있으므로 clean은 아니다. 푸시 가능: 아니오/미수행.
당시 전체 릴리즈 잔여는 [LP27 이전 전수표](release-readiness-20260916.md#2026-09-21-lp27-이전-전수-대조)에 보존했다.

잔여표 반영 후 링크 재검사는288md/9337links/실패0(exit0),공백 검사exit0이었다.
신규 소유파일11개는 범위와 행말공백을 별도 검사해exit0을 확인했다. 제품/native source는 자체04·영향03 이후 바뀌지 않았다.
상세 source SHA는 각 원출력, 신규파일 크기/보존 내용은 실제파일에 있으며 raw media·비밀은 포함하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 최종 잔여표 링크 | verify-docs-links,exit0·288/9337/0 | PASS | 앞선9334링크 검사 후 추가된3링크 포함 |
| 최종 공백 | git diff --check,exit0 | PASS | 잔여표 반영 후 |
| 신규파일 범위/공백 | git ls-files --others 목록11개·허용경로·행말공백 Node검사,exit0 | PASS | git diff 미추적 경계 보완 |
