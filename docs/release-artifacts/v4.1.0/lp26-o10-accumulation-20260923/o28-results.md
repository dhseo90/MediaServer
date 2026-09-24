# O28 근본 원인 분석 개발·비교

독자: v4.1.0 녹화/검증 개발 담당자. 수명: 이번 분석과 후속 수정의 근거 보존.
작업 권한은 AGENTS.md, 실행 정의·결과의 중앙 원장은 `docs/release-test-records.md`다.
이 파일은 실행 증거이며 제품 정책이나 새로운 릴리즈 합격 기준이 아니다.

## 요청과 범위

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 진단→자료 수명→누적 비용→소유 메모리→원인/수정안 순차 개발 | 진행 중 | 선수 단계 통과 전 후속 실행 없음 | 중앙 O28 실행 정의 |
| 2 | 분할 커밋 | 진행 중 | 기존 O27 정리 `bddbdc12` 커밋. O28 각 단계는 검증·검토 후 분리 | Git commit |
| 3 | 최종 푸시 가능 시 푸시 | 미실행 | 마지막에 범위 내 실패·미커밋·원격 상태를 확인 | AGENTS 5 |
| 4 | 종합보고·후속 이슈 | 진행 중 | 확정·가설·미확정과 이번 분석 밖 실제 앱/장시간 판정 구분 | 아래 비교 계약 |

제품 C++·저장 바이트·공개 API·미디어 경로는 바꾸지 않는다. 제품을 소유 임시 복제본으로 계측하며
진단 도구 변경과 제품 성능 개선을 구분한다. 삭제된 O26 데이터는 복원할 수 없으므로 새 합성 입력에서
같은 규모를 측정해도 O26 최초 실패 재현이나 원인 확정으로 쓰지 않는다.

## 비교 전에 고정한 예상 결과

| 구분 | 조건/비교 | 구분 가능한 결과 | 결론의 한계 |
| --- | --- | --- | --- |
| 복구와 전수 검사 | 같은 고정 원장, Open 내부 읽기/검증/SQLite 투영과 이후 조회·매체·종료를 분리 | 종료 위치와 각 소요를 근거로 느린 단계를 특정 | 합성 자료에 실제 남은 영상이 없으면 실제 파일 해시 비용을 대체하지 못함 |
| 누적 이력 | 작은 입력, 약 1,020개 원본, 8,192행 경계 전후 | 삭제된 이력·payload/행 수 증가와 비용의 관계 | 원본 수 하나로 같은 부하라 하지 않음. 작업·참조·파일 상태 차이도 기록 |
| 캐시 | 동일 후보 반복 및 경계 초과로 재사용 불가 | 재사용된 prefix와 다시 적용한 행 수, 읽기/검증/직렬화 비용 분리 | 캐시 탈락은 정상 fallback이며 그 자체가 손상 또는 제품 실패는 아님 |
| 상세 보관 | 같은 프로세스의 소유 handle 획득/해제·반복 조회·체크포인트와 새 프로세스 복구 | resident/weak/cold와 journal/live/shadow/prefix 개수·부분 논리 크기 및 RSS | 개수/부분 capacity는 heap 전체가 아니며 RSS 잔존만으로 누수·allocator 원인을 단정하지 않음 |
| 관측 비용 | 입력 생성/복제/검증기 drain을 제품 호출 계측과 분리 | 검증 준비·관측기 지연과 제품 호출 지연 분리 | 계측 추가 자체의 오버헤드가 있어 실제 HTTP/120분 합격으로 승격 불가 |

HTTP 4초·관측 간격 15초·native snapshot 프로세스 15초는 서로 다른 경계다.
기존 독립 probe의 단계별 15초/전체 기술 상한과 snapshot 전체 15초도 동등한 시험이 아니다.
어느 한쪽의 PASS로 다른 경계의 실패를 해소했다고 하지 않는다.

### O26 입력의 확인 가능한 한계

보존된 `o26-resource-attempt1.log.gz`의 종료 후 숫자 요약을 다시 대조했다. 원본 1,038개 중 삭제 1,032개,
남은 영상 6개 140,255,115바이트, 물리 원장 13,303,408바이트, SQLite main 1,093,632바이트였다.
원장 mutation 종류 요약은 관측기가 소비한 prefix만 뜻한다. raw 원장/영상은 삭제되어 샘플 수·논리 payload 총량과
실패 시점의 개별 영상 상태를 지금 복원할 수 없다. “복제본 약154MB” 전체를 원장 크기로 해석하지 않는다.

`RecordingReadService::ResolveMediaWithContext`는 생존 영상의 SHA와 GStreamer demux를 검사한다.
기존 accumulation fixture는 60샘플/원본·전부 삭제·생존 영상 0개다. 따라서 Open/캐시/삭제 이력 비용 비교에는
유효하지만 O26 snapshot 전체(생존 영상 검사 포함)의 동일 입력 재현은 아니다. 관측된 마지막 phase도 원인 자체가 아니다.

## 실행 상태

### 1번 결과

자식 종료 상세를 성공 assertion 전에 안전한 고정 필드로 출력하고, 후속 JSON/정리 오류가 최초 오류를 덮지 않도록 분리했다.
기존 archive phase 계측을 native snapshot에 연결했다. 제품 소스는 변경하지 않고 임시 catalog 복제본만 계측한다.
snapshot JSON·15초·16KiB 상한은 유지한다. 누적 복구가 통과했다는 결과는 아니다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| profile 최초 | `node --test scripts/internal/recording_archive_diagnostic_profile.test.mjs`, 7/8·exit 1. SQL clear 위치 anchor drift, 실제 준비 실패 | fail |
| profile 보완 후 | 동일 명령 green1/2/3 각각 8/8·exit 0. 마지막 결과에 traceLoss 미확인/null 경계 포함 | pass |
| longrun 진단 | `node --test scripts/internal/recording_current_longrun_diagnostics.test.mjs`, 8/8·exit 0. 실제 장시간 실행 아님 | pass |
| wrapper 직접 호출 | 실행비트 없는 스크립트의 직접 호출 exit 126. native/제품 시작 전 실패, 이후 bash로 실행 | fail |
| native 최초/원인 확인 | `bash scripts/internal/verify_recording_current_observer.sh --self-test`, 각각 11 pass/1 fail·exit 1. 관측 단계와 기대 단계 불일치 | fail |
| native oracle 보완 후 | 같은 검사 65/65·exit 0·28,353ms. 실제 SQLite/rebuild 실행, 동일 preflight 증거 재사용으로 생략되는 rebuild-preflight를 필수 호출로 오인한 검사만 정정 | pass |
| 구문·공백 | 변경 JS 6개 `node --check`, wrapper `bash -n`, `git diff --check`, exit 0 | pass |
| 등록 | `./server.sh verify-project-inventory`, exit 0·18/18·986행 | pass |
| 실행 연결 | `./server.sh verify-feature-inventory-coverage`, exit 0·8/8·986/986·missing 0 | pass |
| 문서 링크 | `./server.sh verify-docs-links`, exit 0·328문서·12,743링크·실패 0 | pass |
| 문서 자산 | `./server.sh verify-docs-ui-assets`, exit 0·10/10 | pass |

위 실패는 미구현에 대한 예상 RED가 아니라 실제 계측/검사 준비 결함이다. 초기 실패 로그를 보존했다.
정정: `e320d122`의 개별 결과표 변환에서 Node `✔/✖` 형식을 누락해 일부 로그를 빈 구문 검사 PASS로 오기했고, 등록 결과의 변환 출력이 도구 반환 한도에서 잘렸다. 위 요약·원로그의 실패는 유지되어 있었다. 같은 원로그 전체를 직접 읽어 압축 전수표로 재서식화하고 Node 총계와 대조했다. 첫 정정 대조에서는 Node 끝부분 실패 재출력을 중복 집계한 7/2를 거부했고 파일을 쓰지 않았다. 총계 이전 결과만 처리해 실제 7/1과 일치시켰다. 테스트를 재실행하거나 최초 실패를 PASS로 바꾸지 않았다.
실행 로그는 같은 디렉터리의 `o28-*-20260924.log`, 전수 assertion 행은 `o28-stage1-items.md`에 있다.
원본 C++ 소비자 두 곳(current observer/accumulation)을 대조해 native가 phase header를 직접 include하게 했다.
accumulation 실행은 2번 자료 수명 보완 전이라 아직 하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR의 `media-server-current-observer-sRC6pU` | 첫 native fixture/빌드 | 8,129,520바이트 | wrapper 정리 | 삭제·부재 | run1 로그 |
| TMPDIR의 `media-server-current-observer-eOf8EP` | 진단 추가 fixture/빌드 | 8,129,505바이트 | wrapper 정리 | 삭제·부재 | diagnose2 로그 |
| TMPDIR의 `media-server-current-observer-pAUXwk` | 최종 native fixture/빌드 | 8,131,546바이트 | wrapper 정리 | 삭제·부재 | green3 로그 |

위 1번 판정 당시 2~5번은 실행 전이었다. 후속 결과는 아래에 추가하며 당시 판정을 소급 변경하지 않는다.

### 2번 결과

`snapshotTree → copyVerified → native child → immutable receipt → 확인된 cleanup`으로 자료 수명을 연결했다.
원본/복제 파일 hash·source/build/native hash·검증된 phase prefix·자식 status/signal·고정 실패 사유를 보존한다.
실패와 증거 미확인은 root를 보존하고 정상 완료로 보고하지 않는다. parent 관측 실패와 child 실패를 분리하며
time-cap 이후 group 잔류도 최초 사유를 덮지 않는다. 누적 비교 runner의 실행 전 manifest와 종료 후 manifest를 대조한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 소유/receipt 회귀 최초 | pure 86/88·exit 1. stage1 문자열에 묶인 정적 assertion 2개가 현재 연결과 불일치 | fail |
| 소유/receipt 회귀 보완 | pure 88/88·exit 0. 별도 profile 첫 실행은 12/12 PASS이며 파일명의 red1은 FAIL 근거가 아님 | pass |
| 실제 작은 native | observer 67/67·exit 0. 동일 입력 verified 복제 2개 결과·receipt 동등, 원본 불변, corrupt 복제의 고정 실패 증거 선보존 후 소유 자료 정리 | pass |
| accumulation 1차 보완 | manifest 실제 전/후·process 진단 receipt·group 상태, focused 25/25·exit 0 | pass |
| 마지막 안전 반례 최초 | focused 26/27·exit 1. 기존 guard가 제한된 실행 환경의 프로세스 관측에서 process-observation 반환, 기대 child-remains와 불일치. 실제 자식 잔류를 종료·부재 확인 | fail |
| 현재 group 판정 경로 | 직접 detached 자식의 열린 group→TERM→ESRCH 및 parent/child 실패 분리, focused 27/27·exit 0 | pass |
| 기존 guard 동일 반례 | 관측 권한을 승인받아 `node --test --test-name-pattern=LP17-H11 scripts/internal/recording_catalog_comparison.test.mjs`, 1/1·exit 0. oracle/제품 변경 없이 자식 잔류 감지·group 정리 통과 | pass |
| 메인 최종 focused | profile·longrun 진단 계약 27/27·exit 0. nonzero native 종료의 parent 분류를 native-stage-failed로 유지 | pass |
| 최종 정적·등록 | JS/bash 구문 9개·diff exit 0, inventory 18/18(내부 5,081 assertion), coverage 8/8·986/986, 자산 10/10, docs links exit 0 | pass |

위 최초 실패는 예상 RED가 아니다. 소규모 native는 마지막 JS 전용 변경과 무관하여 67/67 증거를 재사용했다.
실제 앱·누적 큰 입력·30분·UI·120분은 이 단계에서 실행하지 않았다. 제품 파일·snapshot JSON·시간제한은 변경하지 않았다.
새 receipt만으로 과거 O26 실패를 확정하거나 실패 당시 파일을 복원했다고 하지 않는다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR `media-server-current-observer-MpGVIK` | native 두 복제·corrupt 반례·빌드 | 8,153,116바이트 | 증거 확인 뒤 wrapper 정리 | 부재 확인 | stage2 observer 원로그 |
| stage2 pure/소유 반례의 각 작업 root | 작은 합성 자료 | 개별 원출력 bytes | 자체검사 정리 | 각 removed=true, prefix 잔여0 | stage2 전수 원로그 |
| PID 37475 / PGID 37473 | 제한된 guard 실행의 잔류 합성 자식 | 파일 없음 | 소유 group TERM·exact ps 대조 | 부재 확인 | 담당자 실행 결과, 최초 실패 로그 보존 |
| O28 receipt·원출력 | 비민감 최초 실패/성공 증거 | 개별 파일 | 저장소 보존 | 소스·입력 hash/결과·한계 보존 | stage2 전수표 |

2번 개별 5,480행은 [전수 결과 압축](o28-stage2-items.md.gz)에 보존한다. 37,361바이트,
SHA256 `a2171d365d85c7f50c0ea2edd480491773b6a580cf3abaf390955ee3f02fbc4d`.
Node summary의 tests/pass/fail과 전수 행수를 직접 대조했다. assertion 없는 원출력은 빈 PASS 행으로 만들지 않았다.
위 단계의 root 보존 기능이 실제 실패 데이터에 적용됐다는 주장은 하지 않으며, 실제 적용은 다음 누적 실행에서 확인한다.

token start/end/consumed: 전용 집계가 제공되지 않아 미집계. elapsed/source는 각 실행 로그에 보존한다.

### 3번 최초 누적 비교 — 본문 관측과 마감 실패 분리

`bash scripts/internal/verify_recording_accumulation_probe.sh --run`은 제품 계측 본문을 195,743ms에 끝냈지만
receipt 생성이 실패하여 전체 exit 1(205초)이다. 원출력은 `o28-stage3-accumulation-run1-20260924.log`다.
실패 원인은 전체 임시 root를 데이터 tree로 검사하여 GST plugin symlink를 `tree-owner`로 거부한 것이다.
이 안전장치를 완화하지 않고 case 저장소와 도구/의존성 경계를 분리한다. 큰 누적 비교를 자동 반복하지 않는다.

| 원본/행 | 최초 journal 바이트 | 논리 cache charge | 엄격 복구 | cold checkpoint | repeat checkpoint | repeat 의미 재적용 |
| --- | --- | --- | --- | --- | --- | --- |
| 16 / 64 | 299,331 | 300,163 | 0.074초 | 0.057초 | 0.030초 | 0행 |
| 1,020 / 4,080 | 19,113,993 | 19,167,033 | 5.980초 | 3.544초 | 1.799초 | 0행 |
| 2,048 / 8,192 | 38,401,329 | 38,507,825 | 12.123초 | 7.128초 | 3.623초 | 0행 |
| 2,049 / 8,196 | 38,420,091 | 38,526,639 | 12.133초 | 6.600초 | 7.171초 | 8,196행 |

같은 실행의 같은 seed(원본당60샘플), 전부 삭제/생존 영상0개/이벤트 작업0개다. 단계별15초를 통과했으나
native snapshot 전체15초, HTTP4초, 실제 녹화120분 PASS는 아니다. 64MiB/+1은 admission 함수의 산술 반례이고
64MiB의 유효 저장소 전체 실행이 아니다. 정상 fallback을 기능 오류로 부르지 않는다.

2,049개 복구 12.133초 중 journal Open 1.461초, catalog Open 10.672초였다. catalog 안에서는 preflight 4.535초,
정상 Apply 4.453초, SQLite rebuild 1.556초가 관측됐다(inclusive이므로 그 하위 scope와 중복 합산하지 않음).
preflight의 binding Parse 2,049회 뒤 정상 Apply에서도 1,985회 Parse가 발생했다. 직접 코드의 복구 재사용
`limit=64`와 일치한다. 작은 입력의 재사용 성공을 누적 전체의 중복 제거로 확장할 수 없다.
`ReadCatalogReplay` 자체 값 복제 구간의 exclusive 약3.51ms는 이 실행의 주된 시간 원인이 아니었다.

8,192행 repeat는 의미 재적용0행이어도 원장 재읽기2.599초를 포함해3.623초였다. 8,196행 repeat는 재읽기2.592초와
의미 재적용4.450초로7.171초였다. 즉 cache 경계를 넘을 때 비용이 불연속적으로 커지고, 경계 안에서도 전체 재읽기 비용은 남는다.
실제 public reserve/finalize/delete 96회에서는 자동 full checkpoint1회7.670초(재읽기2.689초·의미 재적용4.765초),
수동 full checkpoint와 같은 mutex의 timeline 조회는7.186초가 관측됐다. 이 마지막 값은 HTTP 요청이 아니다.

여기까지의 수치는 종료 로그가 남은 본문 관측이다. 전체 실행의 receipt/cleanup 실패를 PASS로 바꾸지 않는다.
측정 당시 binary hash가 원출력에 없으므로 이후 확보하는 hash는 사후값으로만 기록한다.

### 3번 보완·판정 마감

receipt 대상은 `case-16/1020/2048/2049` 저장소로 한정했다. 의존성 symlink는 데이터가 아니며,
저장소 내부 symlink/외부 경로 거부는 그대로 유지했다. 고친 마감 경로는 case16 전체 실행으로 확인했다.
큰 실행의 비용 본문·source hash는 유효한 진단 관측으로 유지하되 전체 실행 PASS로 승격하지 않는다.
이 변경은 제품 계측 결과를 바꾸지 않아 큰 비교를 재실행하지 않았다(AGENTS 7.6.2 부분 영향 판정).

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 사전 정의 RED | focused 42/46·exit 1, 2048 case·추가 scope·기존 receipt 범위의 예상 불일치 | fail |
| 첫 구현 | focused 46/46·exit 0 | pass |
| 누적 본문과 마감 | 네 규모 본문 완료·자식 모두 status0/group 종료, 전체 receipt `tree-owner`·exit1 | fail |
| receipt 자체검사 보완 중 | 46/47·exit1 세 번: 정확 오류 이름 불일치 → 고정 alias 잔류 → 존재하지 않는 fs API. 실제 준비 결함이며 RED 아님 | fail |
| receipt 자체검사 최종 | helper 18/18, 전체 focused 47/47·exit0 | pass |
| case16 전체 | 동일 wrapper `--case 16`·exit0, native/관측/receipt/정리 완료. 비용 본문 2,781ms | pass |
| 최종 정적 검사 | plan5/5, JS/bash 구문·diff exit0 | pass |
| 메인 문서 검사 | `./server.sh verify-docs-links` exit0·328문서/12,750링크/실패0, `git diff --check` exit0 | pass |

큰 입력 사후 자료는 `o28-stage3-run1-post-run-receipt.json`에 별도 저장했다. 자동 receipt 복구 여부는 false이며
사후 binary hash를 실행 당시 값으로 둔갑시키지 않았다. 네 case 33파일·65,815,282바이트의 총 hash는
`4e24d17f29629b36b537cbe7cd506dcada64a9a3c631e03efa451ccd426822f6`이다.
메인이 원자료·원로그·binary hash, 제품 소스와 runtime 불변, root uid/mode/dev/ino, 열린 FD 부재를 대조한 뒤
정리했다. 최초 exit1은 유지한다. 개별 검사는 [3번 전수표](o28-stage3-items.md.gz)와 원로그에 보존한다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR `media-server-catalog-cost.4Htlkm` | 큰 합성 저장소·계측 빌드 | 80,816,657바이트 | 사후 증거·소유/불변/종료 확인 후 exact root 삭제 | 부재 확인, 원자료 자체는 삭제·동일 생성법 보존 | `o28-stage3-run1-cleanup.json` |
| TMPDIR `media-server-catalog-cost.dsznZZ` | 보완 후 case16 | 15,388,335바이트 | 검증된 receipt 후 wrapper 정리 | removed=true | case16 원로그·receipt |
| stage3 pure roots·alias | 자체검사 합성 자료 | 개별 원출력 | finally/후속 소유 확인 정리 | 당시 잔여0 보고는 정정. 아래 kMisBJ 잔여를 후속 확인·정리 | focused 원로그·추가 정리 기록 |

3번의 진단 도구 보완과 관측 판정은 마쳤다. 실제 앱의 HTTP4초·snapshot전체15초·O26 RSS 원인은 아직
해결 완료가 아니다. 다음 4번은 제품 수정 없이 같은 생성법의 메모리 소유자만 분리한다.

### 4번 소유 메모리 분리 — 실행 관측

`bash scripts/internal/verify_recording_accumulation_probe.sh --ownership-case N`을 16→1020→2048→2049 순서로 실행했다.
기존 comparison의 31열 계측을 재사용했고 기본 cost 진입은 별도 유지했다. 각 실행은 생성→소유 수명→별도 프로세스
재개방→receipt→정리를 포함한다. 네 최종 실행 모두 exit0, 각 소유 출력26행, 최대8 ID/16개 동시 상세 객체였다.
모든 상세 객체의 weak16개가 해제 후 만료됐고, 재조회와 새 프로세스의 직렬화 SHA256은 일치했다.
삭제 ID가 공개 `FindSourceBinding`으로 반환되지 않는 경계도 최초/새 프로세스에서 확인했다.

| 원본 | checkpoint 뒤 journal 부분량 | live 부분량 | shadow/prefix 부분량 | checkpoint 뒤 RSS | 새 프로세스 재개방 RSS |
| --- | --- | --- | --- | --- | --- |
| 16 | 39,296 | 28,416 | 28,416 / 4,608 | 32,964,608 | 32,325,632 |
| 1,020 | 2,505,120 | 1,811,520 | 1,811,520 / 293,760 | 200,720,384 | 173,359,104 |
| 2,048 | 5,029,888 | 3,637,248 | 3,637,248 / 589,824 | 371,097,600 | 316,424,192 |
| 2,049 | 5,032,344 | 3,639,024 | 0 / 0 | 368,885,760 | 316,948,480 |

단위는 바이트다. 부분량은 기존 계측의 stringCapacity+vectorCapacityBytes+entryStorageBytes+locationStorageBytes만
합친 값이다. map/node/allocator/라이브러리/일시 객체를 포함한 전체 heap이 아니며 RSS와 빼서 미확인 부분의 주인을
단정하지 않는다. journal/live/shadow/prefix의 실제 공유 상세는 기존 owner 집합으로 중복 집계를 피한다.
reader가 별도로 잡은16개 객체와 검증용 canonical 문자열은 이 표의 catalog 강한 소유량에 포함되지 않는다.
snapshot 관측은 실제 소유 첫 페이지(최대1000행)의 개수이며 전체 timeline 건수를 실제 할당량으로 사용하지 않았다.

네 규모 모두 journal 행이 cold였고 live/존재하는 shadow의 상세 resident binding은0이었다.
2,049에서는 checkpoint cache가 아예 없어도 RSS가 약369MB였고 새 프로세스에서는 약317MB였다.
따라서 이 입력에서 RSS 전체를 checkpoint cache 또는 살아 있는 binding 상세로 설명할 수 없다.
한편 live의 thin binding/segment/tombstone·mutation index는 계속 남아 있다. 재개방 뒤 shadow/prefix는0으로 돌아갔다.
일시 할당의 잔존·allocator 특성·다른 heap 소유의 귀속은 이번 부분 관측만으로 확정하지 않았다.

새 프로세스 Open+8개 ID 재확인은 0.140/6.640/13.353/13.391초였다. 각 단계15초 경계는 통과했으나
생존 영상·이벤트 작업이 없는 합성 입력이고, 실제 앱 snapshot전체15초·HTTP4초·녹화120분은 여전히 미실행이다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR `media-server-catalog-cost.P7l0cw` | 최종16개 소유 비교 | 15,571,837바이트 | receipt 확인 후 wrapper 정리 | absent=true | case16-run3 |
| TMPDIR `media-server-catalog-cost.d6kSJk` | 1020개 소유 비교 | 27,431,598바이트 | 동일 | absent=true | case1020-run1 |
| TMPDIR `media-server-catalog-cost.Pb7oMU` | 2048개 소유 비교 | 39,597,926바이트 | 동일 | absent=true | case2048-run1 |
| TMPDIR `media-server-catalog-cost.dTl83e` | 2049개 소유 비교 | 39,612,963바이트 | 동일 | absent=true | case2049-run1 |

각 파일의 환경·제품 원문/임시 계측 hash·runtime archive hash·자식 종료·receipt를 원출력에 보존한다.
네 규모를 하나의 실제 서버 장시간 검증이라고 하지 않는다. 원출력에서 미세한 RSS 차이를 통계적 개선율로 해석하지 않는다.

### 4번 보완·회귀·정리 판정

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 최초 사전 RED | plan7개 중5 PASS/2 FAIL·exit1, ownership 미구현 assertion | fail |
| 최초 focused | 42개 중38 PASS/4 FAIL·exit1. 새 검사 아닌 기존 LP17 H06/07/08/H11 process 관측 실패 | fail |
| 동일 process 검사 | 승인된 process 관측 권한으로 `node --test scripts/internal/recording_catalog_comparison.test.mjs` 15/15·exit0. 기존 oracle/코드 변경 없음 | pass |
| 작은 native 최초 | ownership-case16 run1·exit1, 관측 카운터 block scope 컴파일 오류. 제품 호출 전 실패 | fail |
| 작은 native 두 번째 | run2·exit1, native 두 자식 모두 status0이나 collector가 동시 객체16개를8개 상한으로 오판. parent 사유는 당시 unknown | fail |
| 최종 focused | plan/profile27/27·exit0. 공유8/독립16, owner/memory 누락, 해시/개수 모순, 실패 prefix와 기본 command 보존 반례 포함 | pass |
| 네 규모 소유 비교 | case16 run3/1020/2048/2049 각각 exit0·12/28/46/46초. 각 native·receipt·root 정리 완료 | pass |
| 기본 cost 연결 최초 | `--case 16`·exit2, Bash3 `set -u`에서 빈 macro 배열 준비 실패 | fail |
| 기본 cost 연결 보완 | 같은 명령 run2·exit0·11초. 기본 macro를 명시했고 cost 계측/의미는 유지 | pass |

동일 원인 재발도 별도로 정정한다. 2번에서 확인했던 process 관측 권한 조건을 4번 첫 묶음에 제대로 적용하지
못해 기존 네 반례가 다시 실패했다. 이후 권한 실행 PASS는 그 새 실행의 종료만 증명하며 첫 실행을 소급 정리하지 않는다.
메인 최종 점검에서 합성 `setInterval` 자식 PID41242/PPID1/PGID41240 잔류를 발견했다. 생성 시각20:45:19는
실패 로그 생성 시각과 같았고, exact 합성 command hash·repo cwd·단독 group을 대조해 이번 검사의 잔류로 판단했다.
당시 로그에는 PID가 없다는 한계는 남긴다. 메인이 해당 PID만 TERM한 뒤 PID/group 모두 ESRCH를 직접 확인했다.
증거는 `o28-stage4-descendant-cleanup.json`이다. 파일 정리 성공을 프로세스 종료로 확대했던 담당자의 보고를 정정한다.

3번의 `잔여0`도 정정한다. 후속 검사에서 발견한 kMisBJ는 case16/1020/2048/2049 숫자14바이트와 /dev/null 거부
검사용 symlink2개(18바이트)가 정확히 일치하는 O28-C04 fixture였다. 당시 `fs.lexistsSync` finally 실패와 구조가
일치하고 dev/ino/uid/mode·열린 FD 부재를 확인해 메인이 제거했다. 원출력/hash와 새 직접 부재 증거를 보존했다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| TMPDIR `media-server-catalog-cost.dLrVct` | compile 실패 준비물 | 524KiB | canonical 경로·FD 부재 확인 후 삭제 | absent=true | run1-cleanup JSON. basename 결속은 당시 도구 출력에만 존재 |
| TMPDIR `media-server-catalog-cost.UhPDos` | collector 실패 합성 자료 | 15,236KiB | 실패 receipt 보존 뒤 삭제 | absent=true | run2-cleanup JSON·동일 이름 receipt |
| TMPDIR `media-server-catalog-cost.5Lv5bJ` | Bash 준비 실패 자료 | 512KiB | FD 부재 확인 뒤 삭제 | absent=true | cost-case16-run1-cleanup JSON. basename 결속은 당시 도구 출력에만 존재 |
| TMPDIR `media-server-catalog-cost.kMisBJ` | 3번 자체검사 누락 잔여 | 파일/링크32바이트, 디렉터리 제외 | exact 내용/소유/FD 대조 후 삭제 | 부재 직접 확인, link target는 미변경 | `o28-stage3-late-fixture-cleanup.json` |
| PID41242/PGID41240 | 최초 LP17 관측 실패의 합성 자식으로 사후 판단 | 파일 없음 | exact command·시각·cwd·group 대조 뒤 PID만 TERM | PID/group ESRCH | descendant-cleanup JSON |

compile 실패 root의 초기 cleanup 두 번은 `/var`와 canonical `/private/var` 불일치로 거부됐다.
그 두 실패의 별도 원출력 파일은 없고 도구 출력만 있으며 추정 복원하지 않는다. 최종 cleanup JSON은 그 횟수와
성공한 사후 부재만 보존한다. 이 자료 누락을 제품 실패나 진단 비교 PASS로 사용하지 않는다.
개별 테스트·관측값은 [4번 전수표](o28-stage4-items.md.gz)와 각 stage4 원로그에 보존한다.

메인 최종 확인: `o28-final-cleanup-audit.json`의 확인된8개 root 부재·현재 exact 합성 자식0.
이는 사후 현재 상태의 직접 증거이고 최초 실패 당시의 종료 증거를 소급 생성하지 않는다.
`o28-stage4-main-static.log`의 각 명령은 모두 exit0이다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| plan 구문 | `node --check scripts/internal/recording_accumulation_plan.mjs` | pass |
| plan 검사 구문 | `node --check scripts/internal/recording_accumulation_plan.test.mjs` | pass |
| prepare 구문 | `node --check scripts/internal/recording_accumulation_prepare.mjs` | pass |
| runner 구문 | `node --check scripts/internal/recording_accumulation_run.mjs` | pass |
| profile 구문 | `node --check scripts/internal/recording_archive_diagnostic_profile.mjs` | pass |
| profile 검사 구문 | `node --check scripts/internal/recording_archive_diagnostic_profile.test.mjs` | pass |
| wrapper 구문 | `bash -n scripts/internal/verify_recording_accumulation_probe.sh` | pass |
| 문서 링크 | `./server.sh verify-docs-links` | pass |
| 공백 | `git diff --check` | pass |
