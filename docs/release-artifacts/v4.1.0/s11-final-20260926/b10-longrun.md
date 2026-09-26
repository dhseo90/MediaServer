# B10-L01 녹화 120분·자원 판정

독자: v4.1.0 검증·릴리즈 담당자. 수명: 이번 승인된 장시간 실행과 증거 유효성 판정.
작업 정책은 AGENTS.md, 사전 정의는 중앙 테스트 기록 B10-L01이다.
이 기록은 실제 관측과 미완료를 구분하며 실행 중 상태를 PASS로 사용하지 않는다.

## 실행 기준

- 선행 UI: [31개 실제 조작·시각 적격](b10-ui.md), 커밋 `c60d5129426e9927500b9afc3e5401809f5149c4`.
- 명령: `./server.sh verify-v410-recording-longrun --duration-minutes 120`.
- 서버 SHA256: `6c2149d468bb7f86cb29f1d683eec6cb21c7f2b383e0c4619fe4f35db2a6aabc`.
- 환경: macOS27.0 build26A428·arm64, Node24.13.0, pkg-config의 GStreamer1.28.1.
- 독립 두 채널, 상시/이벤트 각128MiB 설정. 실제 상시 생산·순환 삭제·상태 HTTP·관측 원장,
  종료 후 복제본 복구·비활성 재기동 상태 보존·다시 활성화한 새 녹화와 정리를 확인한다.
- HTTP4초·표본 간격15초·복구 자식15초·격리 root448MiB·총 실행 deadline123분을 유지한다.
  전체 실행의 논리 디스크 상한과 제품 RSS/지원 채널 수를 혼동하지 않는다.
- 자원 자동 출력의 `resourceTrendPass=false/reviewRequired=true`는 측정 요약이다.
  메인이 워밍업5분 이후 RSS/FD/thread·구성별 저장량·HTTP/관측/복구 추세를 별도로 판정한다.
  새 제품 전역 RSS 수치나 처리량 SLO를 사후 신설하지 않는다.
- 현행 source/binary를 변경하지 않으며 외부 서비스·실기기·공통120분 재실행은 포함하지 않는다.

환경 버전 조회용 `gst-launch-1.0 --version`은 sandbox에서 macOS 서비스 연결 오류와
무응답을 보여 작업 소유 PID31694에 TERM을 보냈다(exit143). 제품 검증 실행 전이며
준비 PASS로 쓰지 않는다. 다른 PID·제품·운영 저장소는 건드리지 않았다.
실제 장시간 실행은 로컬 소켓·GStreamer 사용 권한으로 시작했다.

## 현재 상태

2026-09-26 첫 실행은 `observer-native-timeout`으로 exit1이었다. 약18분48초 뒤
정상 종료·포트 해제를 확인했으며, 120분·자원·S11 전체 완료가 아니다.
token start/end/consumed는 전용 집계가 없어 미집계이며 시간/표본 source는 실행기 원출력이다.

### 같은 단계의 사후 진단 정의

종료 뒤 보존된 작업 소유 root에 대해 기존 read-only helper의
`--observe-generation <root>/recordings 4422`를 기존3초 제한으로 한 번만 실행한다.
4422는 실패 직전 성공 표본의 누적 mutation 수다. 정상 종료 중 추가된 tail이 있으므로
실패 순간과 완전히 같은 입력이라고 주장하지 않는다. 실행 전후 전체 파일 hash·stat,
자식 종료·stdout/stderr 크기·고정 오류 코드만 보존하며 원문 비밀·경로 출력은 하지 않는다.
제품 수정·기준 완화·장시간 재시도·다음 단계 실행을 포함하지 않는다.

## 실제 실행·원인 판정

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B10-L01 120분 실행 | 승인된 동일 명령·현재 binary, 요청7,200,000ms | fail | exit1, 전체1,128,140ms. `observer-native-timeout`; 120분 미달 |
| 개별 성공 관측 | 생성·삭제·활성 채널 등 실제1555행 | pass | [1,556개 전수 행](b10-recording-120-items.json.gz). 실패1행 포함이며 suite PASS 아님 |
| 서버·포트·UDP | PID31761 exit0, 강제 종료 없음, HTTP52075/RTSP52076 closed, UDP closed | pass | archiveSafe=true, processesClosed=true |
| 사후 read-only 진단 | 기존 helper·seen4422·3초, 종료 뒤 원본 불변 대조 | pass | exit0,2,630.124ms·stderr0, 자식34597 종료. [실제 결과](b10-observer-poststop.json) |

[전체 원출력](b10-recording-120.log.gz)은 최초 실패·225개 자원 표본·HTTP 단계·느린
완결 구간64개와 정리를 보존한다. 실제 성공 관측은 최종224개이며,225번째에는
외부 프로세스 측정 뒤 원장 drain이 실패했다. 중간 PASS를120분 PASS로 합산하지 않는다.

확정된 직접 실패는 **검증용 `--observe-generation` 자식의3초 상한**이다.
`pollGeneration()`은 매번 새 프로세스를 만들고, `Observe()`는 전체 snapshot을 읽어
`ParseRecordingCatalogSnapshot`·`ValidateRecordingCatalogSnapshotManifest`로 다시
파싱/직렬화한 뒤 전체 identity chain과 기존 prefix를 구성한다.
새 row 출력128개 제한은 이 앞단의 전체 처리량을 제한하지 않는다.

| 관측 표본 | 원장 drain 시간 | 의미 |
| --- | ---: | --- |
| 1 | 408.5ms | 초기 관측 |
| 61 | 904.3ms | 누적 증가 |
| 121 | 1,603.2ms | 같은 실행·같은 관측 경로 |
| 181 | 2,417.6ms | 같은 실행 |
| 224 | 2,988.2ms | 마지막 성공 |
| 225 | 3,003.7ms | native timeout, 이후 storage 측정 미실행 |

실패 직전 원본1,108개·삭제1,102개·mutation4,422개·세대 회전41회를 관측했다.
상태 HTTP는 초기1회+관측224회인225회 모두200, 전체 성공 HTTP 최대1,548ms였다.
초기 `/health` 연결 대기 오류13회는 서버 준비 전 재시도이며 숨기지 않는다.
관측 최대 간격5,006ms, 최종 실패 전 root426,067,818B(약406.3MiB)는448MiB 미만이다.
따라서 이번 실패를 HTTP4초·표본15초·디스크 상한 초과로 바꾸지 않는다.
RSS 최대653,443,072B(약623.2MiB), 워밍업5분 이후 증가39,534,592B·약2.757MiB/분이다.
장시간 미완주이므로 누수 부재·장시간 안정성은 미판정이다.

### 관측기만의 단순 timeout 수정으로 닫을 수 없는 이유

종료 뒤 현재 snapshot은 **27,212,677B**였다. 같은 파일의 실제 kind별 집계다.

| 현재 snapshot 내용 | 행수 | 바이트 |
| --- | ---: | ---: |
| segment-v2 | 1,102 | 12,799,847 |
| tombstone-v2 | 1,097 | 12,926,231 |
| accepted-state | 3,296 | 511,170 |
| deletion-reason | 1,097 | 111,894 |
| media-path | 1,102 | 135,546 |
| source-binding | 1,102 | 464,435 |
| state-v2 | 1,097 | 263,280 |

`RecordingCatalog::ApplyMutationLocked`의 삭제 전이는 tombstone을 추가하지만
기존 `segments_v2_` 상세를 유지한다. `ExportGenerationValuesLocked`는 두 map을 현재 snapshot으로
다시 직렬화한다. segment/tombstone 두 종류만25,726,078B로 전체의 약94.5%다.
영상 파일 순환 삭제와 과거 상세의 현재 snapshot 보관은 별개이며, 삭제 영상의 상세가
두 표현에 남아 있다. B안의 활성 상태·최소 삭제 증거와 cold 상세 분리 목적에 대한
구현 정합 보완이 필요하다. 이를 단순 cache 용량 문제나 OS/GPU 문제로 단정하지 않는다.

관측기는 매 호출 전체 읽기 합계도32MiB로 제한한다. snapshot만 이미약26MiB이고,
identity/active/필요 archive 읽기가 추가된다. 따라서 시간만 줄여도 같은 방식의
전체 누적 읽기와 별도 byte 상한 문제를 닫았다고 할 수 없다.32MiB 자체를 올리거나
snapshot 검증을 생략하는 변경은 하지 않았다.

이전 누적2049개 검사는160×90·60sample의 template를 복제한 자료와 제한된 관측이었다.
실제120분의640×360·시간 mapping 분포·반복 checkpoint와 동일한 상세 바이트 분포가
아니다(`recording_generation_scale_probe.cpp:124`). 개수만 같다는 이유로 장시간
준비가 충분하다고 판단해서는 안 된다. 이전 PASS는 그 입력 범위의 이력으로 유지한다.

사후 진단은 원본 불변 상태에서도2.63초였지만 실패 순간의 세부 하위 단계별 CPU/IO
기여는 계측하지 않았다.3초를 넘긴 정확한 순간의 scheduling·동시 쓰기 기여는 미확정이다.
확정된 전체 재처리 구조와 상세 누적을 먼저 다뤄야 하며, 장시간을 근거 없이 반복하지 않는다.

## 실패 입력·보존 경계

관측기에 필요한 metadata88개73,051,814B를 [1,427,528B 압축본](b10-observer-metadata.tar.xz)에
보존했다. [입력·소스 manifest](b10-observer-input-manifest.json)에88개 파일의 개별hash/크기와
현재 source/native/binary hash를 기록했다. tar 항목·모든 파일 byte를 원본과 대조했고
URL·password·authorization·cookie·사용자 절대 경로 패턴 검사는0건이었다.
이는 생성된 로컬 검증 자료이며 운영·사용자 인증 자료가 아니다.
영상·SQLite·input·GStreamer cache·실행 binary는 포함하지 않는다. 기존 read-only
관측 경로의 재현 입력이며 제품 전체 미디어 복구 fixture로 사용할 수 없다.
종료 후 자료이므로 최초 실패 순간과 같은 byte라고 주장하지 않는다.

- metadata archive SHA256: `d0eba4711feb83742d17ff28af2f803069d92ca9f7e105d6b7e7402574f3a3ab`.
- 원출력 gzip SHA256: `a2ecc4deb503468828dfdb6b4a491de6a0ddb6a95ee4c2e5001713176736692a`.
- 전수 행 gzip SHA256: `7439ef468f967ac28d23df8416be5b483a1742f96123cbf2cd12b82d471cb367`.

단순 파일 집계 초안은 기존 legacy 이름의 directory를 파일로 읽어 EISDIR이었다.
일반 파일 여부를 먼저 확인한 읽기 집계로 보완했다. 제품/장시간 실패와 별개이며
그 오류 출력을 제품 결함이나 테스트 PASS로 취급하지 않는다.

## 정리와 중단 경계

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 소유 TMPDIR의 `media-server-current-observer-D6wjyr` | 생성 영상·입력·SQLite·cache·관측 binary·비밀 비포함 fixture | 364,869,931B·385파일 | metadata·로그 이관 후 정확한 root만 삭제 | 부재. 영상은 삭제, metadata는 압축본에서 복구 가능 | dev16777234/ino160633927/uid501, PID31761/34597 부재·포트 정리·88hash 재대조 |
| `/private/tmp/media-server-b10-longrun-JEoYMT` | 로그·metadata archive 임시 사본 | 2,373,334B·2파일 | 저장소 사본과 byte 비교 뒤 삭제 | 부재 | gzip 해제·archive 완전일치 |

이번5단계의1~3은 분할 커밋했고4번은 실패,5번은 건너뜀이다. 실패 원인·영향 범위를
확인하지 않은 단순 재시도를 하지 않았으며, 종료 뒤 read-only 진단1회만 수행했다.
관측기의 검증 의미와 제품 현재 상태/cold 상세의 소유 계약을 함께 확정해야 한다.
제품 저장 표현 변경은 이번 검증 마감에 임의로 끼워 넣지 않는다(AGENTS3.3·8).
실패 단계의 제품 수정·커밋·푸시는 하지 않았고, 현재 실패 기록은 미커밋으로 남긴다.
실패 기록·현행 잔여표 반영 뒤 `verify-docs-links`는361문서·14,520링크·오류0,
`git diff --check`는 exit0이었다. 이는 실패 기록의 정합 검사이며5번 S11 마감 PASS가 아니다.

## 기존 공통120분의 승계 경계

과거 [공통120분](../s11-recording-ui-20260923/common-120-pass.md)은 7,859초·80회·409 PASS,
이전 서버 SHA `beca63166d0db227adbac8036149947b22516127d5d213b02f231046f9c9a35e`에 결속된다.
그 실행 기록 커밋 `d58d450e`와 현재 제품 diff를 메인이 직접 대조하고 기존 단일 담당자가
읽기 전용으로 반례를 교차 검토했다. 인계만으로 동일 검사를 다시 실행하지 않는다.

| 경계 | 직접 대조 | 증거 판정 |
| --- | --- | --- |
| 일반 RTSP/WebRTC·auth·Event POST·redaction | 해당 구현 직접 diff 없음. 변경44파일은 녹화 내부·상태 provider 및 CMake 연결 | 해당 구성요소의 과거 반복 관측 유지. 현행 전체 프로세스 장시간 PASS로 확대하지 않음 |
| 저장소 시작·복구 | `media_server_application.cpp:328`에서 녹화 off도 Open/recovery 실행. `recording_runtime_composition.cpp:34`의 probe/복구/전환/owner reset 변경 | 이전 시작·종료·runtime idle 결과의 현행 전체 승계 불가. 현행30분·현재 녹화120분의 실제 시작/재기동/정리와 별도 대조 |
| 중단 거래 복구 | B05 runtime33개에 실제 전환·중단 복구, B04의 private 복구·원자게시 증거 존재 | [B05](../b05-consumers-runtime-20260925/results.md)의 해당 focused 증거를 사용. 정상120분 재기동이 pending 복구 반례까지 검증했다고 주장하지 않음 |
| 녹화 상태·용량·조회 | status snapshot+검증과 generation backend 변경 | 과거 공통120분으로 승계 안 함. 현행 B08 통합·UI·이번120분의 각각 실제 범위 사용 |
| 파생 이벤트 worker | ready queue·예약·저장 경로 변경 | 일반 Event POST 반복을 파생 녹화 장시간 증거로 사용 안 함. [B08 실제 두 출력·통합](../b08-actual-app-20260925/results.md)과 관련 집중 검사 사용 |
| CMake/ZLIB·현행 binary | generation backend·ZLIB 추가, 서버 SHA 변경 | [B09 빌드·단기](../b09-final-short-20260926/results.md)와 현행30분/120분으로 판정. 과거 binary의 전체 RSS/종료 안정성 자동 승계 금지 |

공통120분과 녹화120분은 같은 검사나 상호 대체가 아니다. 위 구분과 현행 실행의 결과가
모두 확인된 뒤 최종 승계·잔여 조건을 판정한다. 현재 표는 녹화120분 통과 선언이 아니다.
