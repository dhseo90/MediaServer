# 신규 ns profile 원인 계측 — NP01 실패로 중단

독자: v4.1.0 녹화 증거 저장 설계자. Lifecycle: 2026-09-15 승인된 테스트 전용 실험의 고정 증거.
정책은 AGENTS.md, 실행 정의·판정 source-of-truth는 `docs/release-test-records.md`다.
이 문서는 영구 제품 profile 또는 제품 저장/API 변경 승인이 아니다.

## 결론

실제 writer factory에서 mp4mux의 track/movie timescale을 모두 1e9로 설정하면 첫 파일 native PTS/DTS는
원본 ns와 250개 전수 일치한다. 그러나 이 profile은 이번 실행에서 **FAIL**이다.
첫 파일250sample 중 qtdemux/h264parse 출력이122개에 그쳤다. NP02~04와 NP04-L은 뒤 단계로 건너뛰었다.
메인은 같은 edit 길이 문제가 track-only 대안에서도 재현된 뒤 작업을 회수했다.
**두 후보 모두 현재 제품 적용 후보에서 배제, 사용자 3번 최소 증거 저장·원본 연결은 미완료**다.
실패 단계는 커밋하지 않으며, 추가 실험과 제품 변경은 중단했다.

| 직접 확인 항목 | 실제값 | 판정 범위 |
| --- | --- | --- |
| factory property readback | trak-timescale=1000000000, movie-timescale=1000000000 | 테스트 wrapper 설정 확인 |
| writer checkpoint | 입력300, finalized250/unfinalized50 | 기존 TP01과 같은 긴 GOP 조건 |
| 파일 metadata | MDHD v1 duration8333333333, MVHD v1 duration8333333333, 양쪽 timescale1e9 | 8.333초 파일에서 v1 자동 선택 직접 확인 |
| native sample | STTS250개; 첫2개33333333,다음33333334 등 반복; 마지막PTS8300000000,duration33333333 | 원본 첫250개 PTS/DTS 불일치0 |
| edit list | elst size28, duration4038366037, media_time0, rate65536 | duration이8333333333−4294967296와 정확히 일치 |
| demux/parser | 각각122개, 마지막index121 PTS/DTS4033333333,duration33333333 | 기존 count250 assertion FAIL |
| payload | 출력된122개 native sample SHA256=qtdemux SHA256 | 나머지128개 출력은 없어 검증되지 않음 |

`elst`는 제한 reader가 version에 맞는 폭을 선택하여 읽었다. 28byte 단일 entry라는 크기 및 duration 값은
v0 32bit edit duration으로 해석되며, 값이 전체길이의 modulo2^32와 정확히 같다.
**강한 원인 근거:** native sample과 MDHD/MVHD는 남아 있지만 edit 종료가 약4.038초여서 출력이 그 구간으로 제한된다.
GStreamer 내부 edit 생성 소스의 대입/cast 위치는 이번에 직접 읽지 못했으므로 해당 내부 코드 위치까지 확정하지 않는다.
이후 별도 사전등록한 track만1e9/movie property0 대안도 아래와 같이 실패했다.

실제 파일 크기228400B, SHA256 `7e32f37fd159885a3e6d5de8409d3b13c70f33df370590a520d871d109f4bc07`.
native 표/box offset/250개 sample hash는 [native JSON](timing-profile-data/TP01/segment-0-native.json),
각 파일 크기/hash는 [보존 manifest](timing-profile-data/manifest.csv)에 있다.

## 실행과 실패 보존

명령은 두 실행 모두 `bash scripts/internal/recording_timing_profile_run.sh`다. GStreamer1.28.1, 격리 actual writer를 링크했다.
`recording_timing_profile_writer.cpp`가 실제 제품 writer cpp를 포함하되 mp4mux factory 생성에만 테스트 설정을 적용한다.
`recording_timing_profile_probe.cpp`는 기존 TP fixture/계측을 수정 없이 포함한다. 제품·공통fixture·TP코드는 수정하지 않았다.
기존 TP와 비교하는 실제 writer/catalog/media inspector source에 diff가 없는 것을 읽기 확인했다.

| 실행 | exit/elapsed | 결과 및 보완 |
| --- | --- | --- |
| 최초 | 1/6초 | boundary-count 실패. TP01→NP01 rename 전 예외가 발생해 exporter가 CSV를 보존하지 못함. capture.log만 보존, 완료 증거로 사용 불가 |
| 원인 계측 | 1/6초 | 메인 승인 후 실패 폴더 export와 실패 후 native 분석을 보완. count assertion은 유지. native250/demux122/parser122와 edit 값을 확보했고 같은 실패를 PASS로 바꾸지 않음 |

원출력은 [최초 실행](timing-profile-output-1.txt), [원인 계측](timing-profile-output-2.txt).
실행2 capture.log/analyze.log 및 입력300행·manifest1행·native250sample·demux122행·parser122행 총7개 파일을 보존했다.
CSV 헤더는 sample 수에서 제외한다. 원인 계측의 node 분석도 count oracle에서 exit1로 끝났으며 comparison CSV는 생성되지 않았다.
최초 미보존 numeric 값을 추정복원하지 않았다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| NP01 | 원본300입력/250+50 writer 및 native/demux/parser 전수 count | fail |

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| NP01 tail | 두 번째50sample native/demux 비교 | 첫 파일 count 실패로 중단 | tail 원본 exact 미확인 |
| NP02 | fractional ns profile | NP01 실패 뒤 건너뜀 | 결과 없음 |
| NP03 | B-frame/CTTS/edit ns profile | NP01 실패 뒤 건너뜀 | 결과 없음 |
| NP04 | VFR/마지막70ms | NP01 실패 뒤 건너뜀 | 결과 없음 |
| NP04-L | 5초 DTS delta/마지막5초 duration | NP01 실패 뒤 건너뜀 | STTS32bit 실측 미확인 |
| 제품 profile/저장/4번 대기정책 | 실제 제품 변경/검증 | 설계 실험 범위 밖 | 구현·완료 아님 |

## Cleanup 및 한계

| 경로(TMPDIR의 media-server-timing-profile.*) | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| ZVCUo5 | 최초 binary/raw media/catalog/CSV | 4749573 B | 원출력1파일 보존 후 삭제 | removed=true; numeric 보존 누락 | output-1 |
| LMno11 | 원인 계측 binary/raw media/catalog/CSV | 4810157 B | numeric/hash/log7파일 copy검증 후 삭제 | removed=true | output-2 |
| timing-profile-data | numeric/hash/log | manifest 각 실제bytes 참조 | 보존 | 7파일+manifest | 실패 재현/원인 판정 |

원본/운영 media·서버·port·credential을 사용하지 않았다. synthetic sample만 생성했다.
raw MP4/SQLite/binary는 삭제했고, 파일 생성/보존은 테스트 산출물에 한정한다.
최초 두 실행 합계12초, 아래 track-only까지 총18초. elapsed source=bash SECONDS. token start/end/consumed는 자동집계 미제공으로 미집계다.
`git diff --check` exit0은 문서/도구 형식 확인이며 NP01 FAIL을 대체하지 않는다. 커밋/푸시 미수행.

## 별도 대안 NP-T: track1e9/movie default0

새 직접근거와 메인 승인 후 NP-T01~04/NP-T04-L을 별도 사전등록하고
`bash scripts/internal/recording_timing_profile_run.sh --track-only`를 실행했다. exit1/6초, NP-T01 FAIL이다.
원출력은 [track-only output](timing-profile-track-output.txt), 별도 보존물은
[track-only manifest](timing-profile-track-data/manifest.csv)다. 앞선 NP 실패 증거를 덮어쓰지 않았다.

| 단계 | 직접값 | 결과 |
| --- | --- | --- |
| factory readback | trak-timescale1e9, movie-timescale0 | 요청한 별도 설정 확인 |
| 실제 파일 | track1e9, **movie1e9**, MDHD/MVHDv1 duration8333333333 | movie property0은 낮은 timescale 유지가 아니라 자동 선택 |
| edit/sample | elst duration4038366037, native250,demux122,parser122 | 원래 실패와 동일, count oracle FAIL |
| 원본 ns | 첫250개 nativePTS/DTS와 original 불일치0 | native timing 일치가 파일 전체 가용성을 보장하지 않음 |
| NP-T01 tail/NP-T02/NP-T03/NP-T04/NP-T04-L | 미실행 | 첫 파일 실패 뒤 모두 건너뜀 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR/media-server-timing-profile.Cojbo0 | track-only binary/media/catalog/CSV | 4809678 B | 7개 numeric/hash/log 복사·검증 후 삭제 | removed=true | track-output |
| timing-profile-track-data | 실패 시각/해시/log | 별도 manifest actualbytes | 보존 | 7개+manifest | 원래NP와 독립 |

명시적으로 낮은 movie timescale을 지정한 새 변형은 **실행하지 않았다**.
공식 [GstBaseQTMux 속성 문서](https://gstreamer.freedesktop.org/documentation/isomp4/GstBaseQTMux.html)는
track/movie 단위 설정과0의 자동/기본 선택을 설명한다. 실제 자동 선택 값과 이번 edit 문제는 위 로컬 파일 증거로 판단한다.
이 문서만으로 모든 GStreamer 버전의 내부 cast 위치나 다른 muxer의 동작을 확정하지 않는다.
5초 delta 실험 역시 NP04-L/NP-T04-L 모두 앞 단계에서 건너뛰었고 baseline 동일2샘플도 실행하지 않았다.
읽기 소스상 기존 writer PushV2Locked는 signed64 PTS/DTS·증가순서·origin을 검사하며 4.29초 delta 상한은 없다.
기존 TP01의 T3000에서 5초delta=15000tick, T1e9에서는5000000000tick이다.
따라서 신규profile의 STTS32bit 한계를 이유로5초간격을 제품에서 거부하면 기존 수용영역이 줄어들 위험이 있다.
baseline 실제 정상 저장은 미확인이며, 이 산술을 근거로 신규 제품 제한을 도입하지 않았다.
