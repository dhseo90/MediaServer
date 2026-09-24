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
