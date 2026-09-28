# 실제 writer 파일 시간 경계 계측

독자: v4.1.0 녹화 시간 계약 검토자. Lifecycle: 2026-09-15 S11 준비 단계의 고정 실행 증거.
정책 source-of-truth는 AGENTS.md, 정의/결과의 중앙 기록은 `docs/release-test-records.md`다.
이 문서는 계측 전수 CSV/MP4 native table의 해설이며 제품 수정·릴리즈·기존 R03 판정 변경 증거가 아니다.

## 범위와 결과

`bash scripts/internal/verify_recording_timing_probe.sh` 최종 exit 0, 6초, TP01~04 특성화 4 PASS/0 FAIL.
TP04-W는 TP04의 사전등록된 parser 입력 하위 계측이다. 테스트 전용 C++/JS/runner만 추가했다.
source HEAD `f5510f6358583d9953f2e1bace3f69821d4be8e5`, Darwin 27.0.0 arm64,
GStreamer 1.28.1, Node v24.13.0. 최종 원출력은 [timing-probe-output.txt](timing-probe-output.txt).
원출력은 실제 tool 반환에서 그대로 저장했다. 생성 MP4 5개의 SHA256/크기/box offset은 native JSON과 원출력에 있다.

**원인 확정:** TP01의 문제 구간에서 qtdemux는 정확한 33,333,334ns duration을 내보냈지만
그 다음 h264parse가 33,333,333ns로 바꿨다. 따라서 MP4 tick 소실이나 qtdemux 단독 오류로 설명할 수 없다.
TP03은 DTS 기반 duration을 presentation PTS에 더하는 것 자체가 native presentation 끝과 18/30개 다르다.
TP01 두 번째 파일과 TP03에서는 원본 PTS 결박도 어긋난다. native 끝 계산만 고쳐도 전체 문제가 해결되지 않는다.
기존 `file_pts + origin == original_pts` 엄격 결박은 유지해야 하며 불일치를 허용하는 제품 수정은 하지 않았다.

## 전수 정의와 산출물

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 도입 |
| --- | --- | --- | --- |
| TP01 | 실제 30fps/GOP250 long-GOP | Encode(501,false,false,160,90,30,250) 중 300개 writer Push; Stop 전 finalized250/unfinalized50, Stop 후 250/50 두 파일 | v4.1.0 |
| TP02 | 30000/1001 | 30개 실제 encoded AU, native STTS1001/timescale30000과 각 경계 비교 | v4.1.0 |
| TP03 | B-frame/CTTS/edit | bframes2 30개, native STTS/CTTS/elst와 decode-order 전수 PTS/DTS 비교 | v4.1.0 |
| TP04 | VFR/last sample | 12개 입력20/50ms 교차, 마지막70ms; native STTS와 경계별 duration 전수 | v4.1.0 |
| TP04-W | 입력 parser proxy | writer와 동일 descriptor caps/appsrc is-live/block/format 및 h264parse, AVC AU 출력12개 | v4.1.0 |

각 `timing-probe-data/TP0*/`의 input.csv는 writer 입력 전수 PTS/DTS/duration/bytes/SHA256,
manifest.csv는 실제 파일명·segment·원본 ordinal·binding count·media_start다.
각 segment별 `-native.json`은 raw MP4에서 직접 읽은 mdhd/mvhd timescale, STTS/CTTS/elst, stsz/stsc/stco 기반
sample ticks/SHA256 및 box offset/size다. `-demux.csv`, `-parse.csv`는 실제 pad probe 원출력이다.
`-comparison.csv`는 입력/native/demux/parser/sample 끝/다음 decode-order PTS를 한 행으로 결합한다.
TP04 input-parser.csv는 추가 proxy 원출력이다. 파일29개, input372행, native/demux/parser/comparison 각각372 sample,
proxy12행을 보존했다. 헤더/manifest 행은 sample 수에 포함하지 않는다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| TP01 | input300=250+50 native/demux/parser count, 각 native sample SHA256=qtdemux payload, STTS literal3000/100, 1ns 관측99회 | pass |
| TP02 | input30=count30, payload 동일, STTS literal30000/1001, parser duration33366666 | pass |
| TP03 | input30=count30, payload 동일, STTS literal3000/100 및 CTTS/edit 실측 | pass |
| TP04 | input12=count12, payload 동일, STTS literal20/50ms교차+마지막100tick | pass |
| TP04-W | input-parser12개 PTS/DTS 동일, duration 전부33333333, 마지막 입력70000000 | pass |

PASS는 현상을 재현하고 전수 계측한 결과다. 1ns gap 제거, 정상 파생 결과, R03 complete, UI 또는 release PASS가 아니다.
native→demux payload SHA256은 372개 전수 exact 비교했다. Annex-B↔AVC 포맷이 바뀌므로 입력↔parser 전체 payload hash 동일성은 주장하지 않는다.

## 경계 통계와 대표 실제값

native→demux PTS/DTS는 `floor(tick*1e9/timescale)`, duration은
`floor((DTS_tick+STTS_delta)*1e9/timescale)-floor(DTS_tick*1e9/timescale)`와 전수 일치했다.
demux→parser PTS/DTS 변경은 0이다. 아래 끝 비교는 native **presentation** 끝의 단일 변환과 비교했다.

| case/segment | samples | demux→parser duration 변경 | demuxPTS+duration vs native presentation 끝 불일치 | originalPTS vs media_start+nativePTSfloor 불일치 |
| --- | --- | --- | --- | --- |
| TP01/0 | 250 | 83 | 0 | 0 |
| TP01/1 | 50 | 16 | 0 | 16 |
| TP02/0 | 30 | 20 | 0 | 0 |
| TP03/0 | 30 | 10 | 18 | 20 |
| TP04/0 | 12 | 11 | 0 | 0 |

| case/index | 원본/MP4 | qtdemux | h264parse/해석 |
| --- | --- | --- | --- |
| TP01/0/236 | originalPTS7866666666,duration33333334; nativePTS23600+delta100,scale3000 → end7900000000 | PTS7866666666,duration33333334,end7900000000 | duration33333333,end7899999999,nextPTS7900000000: 1ns 손실 위치 확정 |
| TP02/0/1 | nativePTS1001+delta1001,scale30000 → end66733333 | PTS33366666,duration33366667 | duration33366666,end66733332 |
| TP03/0/0 | nativePTS200+delta100,scale3000 → end100000000 | PTS66666666,duration33333333,end99999999 | parser 이전에도 presentation 끝 1ns 부족 |
| TP03/0/2 | nativePTS300+delta100 → end133333333 | PTS100000000,duration33333334,end133333334 | DTS round-up duration을 PTS에 더하면 1ns 초과 |
| TP03/0/1 | originalPTS133333332 vs nativePTS400/3000 →133333333 | PTS133333333 | 원본 시작 결박 1ns 불일치 |
| TP04/0/11 | 입력PTS370000000,duration70000000; nativePTS1110+delta100/3000 →end403333333 | duration33333333 | 마지막 요청 duration70ms는 native 이전부터 보존되지 않음 |

TP01/1의 16개 원본축 시작 불일치 역시 실제 두 번째 파일의 독립 문제다. 이는 마지막 native 끝만 복구하여 해결되는 조건이 아니다.
TP03의 `gap_ns`는 **decode order 다음 AU**와의 차이로, B-frame의 표시 순서가 바뀌므로 실제 미디어 누락 판정에 사용할 수 없다.
원출력 TP03 observed_1ns_gaps=3도 같은 제한을 갖는다.

## TP04 writer 내부 원인 범위

제품 writer는 `src/recording/gstreamer_segment_writer.cpp:331`부터 appsrc→h264parse→mp4mux→fdsink를 구성한다.
343행의 is-live=true/block=true/format=time,346~352행의 descriptor caps,403~408행 PTS/DTS/duration 주입과
동일한 입력을 테스트 proxy에 사용했다. proxy는 mp4mux 대신 AVC/AU capsfilter와 appsink를 둔다.
실제 writer 내부 pad hook은 추가하지 않았다. 따라서 proxy는 내부 scheduling 전체와 완전히 같은 파이프라인이라는 주장이 아니다.
동일 입력 parser proxy에서 마지막70ms→33333333ns가 직접 관측되어 **h264parse만으로 마지막 duration 변경을 재현**했다.
실제 writer native 마지막 delta100/3000도 일치한다. 중간20/50ms가 native STTS에 유지되는 이유를
mp4mux의 인접 DTS 차이 계산으로 해석하는 것은 소스/내부 pad 직접 확인 없는 추론이다.

## 파서 한계와 미실행 경계

검증용 Node MP4 파서는 이 실행의 단일 unfragmented track만 대상으로 한다. 파일16MiB 미만, box크기/깊이,
table10000항목/전체 sample10000개, expanded STTS/CTTS count, timestamp safe integer를 검사한다.
복수 track, moof/mvex/stz2, 지원하지 않는 mdhd/ctts/elst version은 거부한다.
mvhd timescale과 edit list의 원 tick/rate를 보존하지만 일반 edit 변환을 구현하지 않는다.
TP03 edit media_time200/rate65536을 무시하고 presentation interval을 공통축으로 취급해서는 안 된다.
악성/모든 유효 MP4에 대한 안전 parser 테스트는 미실행이며, 이 도구를 제품에 투입하는 것은 범위 밖이다.
ffprobe는 설치 여부만 확인했고 native tick 증거 생성에는 사용하지 않았다.

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 제품 전체 안정화 | server build/full verifier | 계측 전용 compile/run만 승인 범위 | 제품 gate PASS 아님 |
| 30분/120분/UI | 장시간/실제 브라우저 | 이번 단기 계측 범위 밖 | release evidence 아님 |
| 외부/운영 서버 | 서버접속/endpoint/credential | 격리 fixture만 사용 | 운영 결과 아님 |
| R03/worker 정책 | 기존 fractional partial/worker 재검증·수정 | 변경 금지, 이번 실행 제외 | 기존 판정 유지 |
| 일반 MP4/edit 변환 | 복잡한 edit/multiple track/negative presentation | 제한 검증 파서 | 범용 종료점 구현 증거 아님 |

## 실패·보완 이력과 cleanup

모든 실행 명령은 위 runner 동일하다. 컴파일 실패를 예상 TDD RED로 재분류하지 않았다.

| 실행 | exit/elapsed | 상태와 원인/조치 |
| --- | --- | --- |
| 1 | 1/7초 | 준비 실패: fixture Shift 미사용 -Werror. 공통fixture 수정 없이 Shift(input,0) 호출 추가 |
| 2 | 0/7초 | 계측4pass였지만 exporter regex 오류로 CSV/JSON 보존0개. 완료 증거 무효. exporter와 copy count/hash 동등검증 보완 |
| 3 | 0/6초 | 28개 export 보존 검증. literal/native경계 oracle 보강 전 증거 |
| 4 | 0/6초 | 28개, native→demux 전수 timing 및 literal 검증 추가 |
| 5 | 0/6초 | 사전등록 TP04-W 추가,29개,경계 끝/원본 시작 불일치 통계 |
| 6 최종 | 0/6초 | proxy appsrc live/block 제품값 일치 보완 후 재실행,29개 copy검증; 최종 원출력/데이터 보존 |

각 임시root는 runner mktemp로만 생성했다. 운영/외부 데이터와 port/server 생성은 없다.
원출력에는 매 실행 실제 raw 파일 hash와 크기·판정이 남았으나 실행2 CSV 전체는 보존되지 않아 추정복원하지 않았다.
실행1~5는 위 실패/보완 및 cleanup 이력을 보존하고 최종29개 데이터를 현재 증거로 사용한다.

| 경로(TMPDIR의 media-server-timing-probe.*) | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| PCqlLx | 실행1 임시root | 0 B | 삭제 | removed=true | 실패 cleanup 원출력 |
| HhLbO5 | 실행2 binary/media/registry/CSV | 5574854 B | 삭제 | removed=true; CSV보존누락 명시 | 실행2 cleanup |
| Q5slVf | 실행3 binary/media/registry/CSV | 5574854 B | 시각/해시28파일 복사 후 삭제 | removed=true | 실행3 cleanup |
| RdBy9T | 실행4 binary/media/registry/CSV | 5574985 B | 28파일 복사 후 삭제 | removed=true | 실행4 cleanup |
| o0wlCy | 실행5 binary/media/registry/CSV | 5577994 B | 29파일 복사 후 삭제 | removed=true | 실행5 cleanup |
| tQAMx5 | 최종 binary/media/registry/CSV | 5577994 B | 29파일 복사 검증 후 삭제 | removed=true | timing-probe-output.txt |
| timing-probe-data | 비민감 numeric/hash/box CSV/JSON | 約316KiB disk allocation | 보존 | 파일29개 | 재현/원인 검토, raw media 불포함 |

임시root 부모의 실제 절대경로는 최종 원출력에 있다. root containment/symlink 검사 후 삭제했으며 부재를 검사했다.
대용량 raw media는 저장소에 보존하지 않았다. token start/end/consumed는 제공된 자동 집계가 없어 미집계;
elapsed source는 bash SECONDS, 전체6회 실행 합계38초(코드 작성/검토 시간 제외)다.
커밋/푸시는 서브에이전트가 수행하지 않았다. 최종 diff/중앙기록/커밋 판정은 메인 담당이다.

## 메인 완료 대조

메인은 계측 C++/JS/runner diff, 최종 stdout, TP01/236·TP03·TP04 CSV와 native 표를 직접 읽었다.
`verify-docs-links` exit0(Markdown272/links8564/images22/anchors110/failures0), `git diff --check` exit0.
manifest29개에 대해 Node fs.readFileSync와 SHA256으로 크기/해시를 재대조했다. 기능·미디어 검증 재실행은 아니며 인계만으로 기존 실행을 반복하지 않았다.
