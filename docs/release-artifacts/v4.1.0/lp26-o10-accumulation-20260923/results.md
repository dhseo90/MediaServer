# LP26-O10 격리 누적 선행 진단 결과

### 문서 마감 검증

기록 담당 실행: `./server.sh verify-docs-links` exit0(318md/12065local links/22images/174anchors/fail0),
`./server.sh verify-docs-ui-assets` exit0(10/10), `git diff --check` exit0. 테스트/제품 재실행은 없다.
token start/end/consumed 미집계(집계 미제공), 도구 wall 각1초 미만이며 정확한 suite elapsed 출력은 없다.
임시root/서버/port 생성 없음. 다음은 assets 개별 결과다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| docs links | 위 local link/anchor 전수,stage2 실제 절 anchor 포함 | pass |
| assets1 | README uses only representative product UI screenshots | pass |
| assets2 | English README uses English UI screenshots | pass |
| assets3 | UI guide keeps product screenshots in the shared asset set | pass |
| assets4 | docs UI asset policy documents capture rules | pass |
| assets5 | managed UI asset manifest stays complete | pass |
| assets6 | capture script owns every documented UI asset | pass |
| assets7 | docs capture covers current screenshots | pass |
| assets8 | representative screenshot docs do not point at stale visual baselines | pass |
| assets9 | docs UI asset directory contains managed PNG files | pass |
| assets10 | VA documentation images keep full video frame bounds | pass |
| diffcheck | git diff --check | pass |

## Stage2 bounded focused 최종 기록

독자/유지주기: S11 2번 집중 안정화의 소스변경·실패·재검증·정리 보존. 기존 O10 A~G와 LP24 정의의
승인된 재검증으로 실행했으며 **제품 보완에 대한 새 실행 전 정의가 있었다고 소급 주장하지 않는다**.
source 기준 HEAD `dbdfcba2cb941a8d6fc9b372a1351021eddf5c29` 위 미커밋 변경이며,
O10 최종 원출력 앞부분의 실제 source SHA256으로 초기 원본과 구분한다.

### 구현과 범위

메인 담당은 `recording_catalog.h/cpp`에서 Open-local strict 검증이 끝난 **동일 전체 원장**에만 SQLite 재구축의
두번째 Preflight를 생략했다. 변경/pending/독립 rebuild는 strict 경로를 유지한다.
Rebuild는 DELETE부터 전 행 projection까지 단일 SQLite transaction으로 묶고 RAII rollback을 둔다.
기존 단건 append projection은 transaction 소유 경로를 유지한다.
SQLite 재구축의 bound 재사용은 원장 view/link/내용에 결박된 이미 검증된 live binding에 한정하며
비정규 입력은 기존 canonical SQLite bytes를 유지한다. JSON/API/schema·시간/ID·원장내구성·한도를 바꾸지 않았다.
관측기 cadence 변경은 앞 G절의5초 start-to-start 목표이며 HTTP4초/native3초/표본15초/복구15초는 유지한다.

LP24 검증기는 새 내부 projection 함수로 계측 위치를 옮기고 같은 원장일 때 rebuild Preflight의 예상 재파싱을0으로 교정했다.
이 준비 수정의 실제 실패2회를 아래에 보존한다. 숫자0만 맞추고 strict/변경/권한/ordinal 반례를 제거한 것이 아니다.

### 실행 결과와 최초/중간 실패

| 명령/시점 | exit·결과 | 증거·해석 |
| --- | --- | --- |
| `./server.sh build` 최종 |0, 메인 직접 관측|이번 원출력 미보존. 과거 build로그로 대체하지 않음 |
| `bash scripts/internal/verify_recording_checkpoint_cache.sh` 최종 |0,46/46 메인 직접 관측|이번 원출력 미보존; 개별46행을 추정복원하지 않음 |
| LP24 full 최초 sandbox |실패,compile SIGTERM/EPERM|[batch-green](../s11-preparation-mapping/lp24-recovery-lp26-batch-green.txt): process 관측권한 오류, 제품회귀 아님. 초기 cleanup 미완료는 아래 사후 정리로 닫음 |
| LP24 full elevated |1,13pass/1fail|[elevated](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt): SQLite preflight/projection 재사용 oracle 실패 |
| LP24 full oracle 교정 중간 |1,13pass/1fail|[oracle](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt): 동일 제목 실패 재현; 계측 위치/예상호출 교정 이력 |
| LP24 full batch-contract |0,14/14|[contract](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt): 중간 소스 결과, 최종과 구분 |
| `node scripts/internal/verify_recording_recovery_content.mjs green lp24-recovery-lp26-bound-proof full` 최종 |0,14/14|[bound-proof](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt), compile0,focused3599ms |
| preflight-only2049 |복구15초 실패, 메인 직접 관측|원출력 미보존. initial11.211초 등 수치는 참고보고이며 직접 보존증거로 승격하지 않음 |
| `bash scripts/internal/verify_recording_accumulation_probe.sh --case 2049` batch |1/38초|[batch2049](measurement-2049-batch.log), 복구15초 중단·뒤 단계 건너뜀 |
| 동일 wrapper `--case 1020` batch |0/36초|[batch1020](measurement-1020-batch.log), 복구7.520484초,cp4.130977/2.405867초. 최종 bound-proof 이전 소스 |
| 동일 wrapper `--case 2049` 최종 |0/62초|[bound-proof2049](measurement-2049-bound-proof.log), 아래 전 단계 완료 |
| `bash scripts/internal/verify_recording_current_observer.sh --app-observe` 최종 |0, 메인 관측 전체 약53초|[app](app-observe-bound-proof.log):71pass/0fail, Node46877ms,관측30140.199ms,child3종료·UDP종료·root삭제 |

최초 합산15초 fixture 오류와 초기2049 실패는 위 초기 이력에 그대로 남는다.
LP24 파일명 `green`은 판정이 아니다. 실제 phase expected=false/code1 또는 EPERM 실패를 표에서 FAIL로 보존했다.
LP24의 `[not-run] realistic fifteen-second fixture: 2`는 실제 fixture2개 미실행이다.
O10 synthetic과 LP24 focused가 이 두 실제 fixture나 실제 누적 HTTP 검사까지 대체하지 않는다.

### 최종2049 직접 측정

| 항목 | 값 | 판정 경계 |
| --- | ---: | --- |
| initial drain |11.256초/8196행|관측15초 안,exact count/type |
| strict recovery |12.126757초|독립15초 안,count8196/deleted2049/zero recovery error |
| 비활성 첫/끝 binding |0.005318초|cold 상세 재획득 |
| cold checkpoint |7.836503초|독립15초 안,originalApplied8196 |
| repeat checkpoint |8.427043초|독립15초 안,originalApplied8196 |
| cache |둘 다 false,재사용0|8196>8192로 full fallback 실제 확인;64MiB 기준 변경 없음 |
| 실제 inode회전 후 drain |10.802480초|fresh0,rotation1,동일prefix |
| native high-water |367,738,880B|1GiB 안,누수 판정 아님 |
| catalog process 전체 |28.448929초|단계합계이며15초 복구기준과 혼동 금지,기술적65초 안 |
| 소유root 최종 |38,457,729B|448MiB 안,삭제·부재 확인 |

cold/repeat checkpoint가4초보다 길다는 사실은 실제4초 HTTP 안전성의 보장이 없음을 뜻한다.
실제 앱30초 준비 실행은 두채널 각각 finalized14/deleted12,표본7,maxGap5003.754ms,
disable/restart/reenable 새녹화를 확인했지만 규모는106 observed mutations 수준이다.
HTTP4초 검사 실행과 통과는 해당 짧은 환경에 한정한다. 헤더 연결 준비 중 error 진단행은 존재하므로
전체 로그가 HTTP error0이라고 주장하지 않는다. resourceTrendPass=false,postWarmup=insufficient,
longrunObservationCompleted=false,uiFulltestPass=false를 유지한다.

### 증거 유효 범위와4번 잔여

| 항목 | 유지/무효/미실행 | 이유·다음 경계 |
| --- | --- | --- |
| 초기 RED·fixture오류·2049 FAIL |역사적 증거 유지|최종PASS가 삭제/소급 대체하지 않음 |
| 초기/중간 복구·projection 성능값 |최종 제품 성능증거로 무효|catalog구현 변경; 원인분석 비교자료로만 유지 |
| 기존 cadence 표본/간격 evidence |변경된 관측기 장시간 성공 근거로 사용불가|추가 고정5초 제거; 실제 최종120분 미실행 |
| 최종 LP24·O10·앱준비 |bounded focused 범위만 유효|현재소스 raw와 명시된 oracle이 있는 범위 |
| build·LP15 최종 |메인 직접 관측,raw미보존|완전한 개별 원출력 감사 불가,과거로그 대체 금지 |
| 누적1020 동시 HTTP/retention/checkpoint |4번 잔여·미실행|실제 병행 lock wait/header/body·15초관측 안전성 미확정 |
| 최종120분·전체통합·UI |4번 잔여·미실행|집중 synthetic/30초 준비는 대체증거 아님 |

따라서 stage2 **bounded focused 통과**이지 전체 release gate 완료/누적 실제HTTP 해결/장시간 PASS는 아니다.
raw 미보존 build/LP15와 preflight-only 실행 한계는 해소됐다고 기록하지 않는다.

### Stage2 개별 원출력 결과

아래는 원출력의 모든 pass/fail 행을 실행별 순서대로 보존한다. app 반복채널 assertion도 개별 행이며,
계측 cost 전수와 HTTP timing의 안전 routeClass/elapsed/status 개별행은 링크한 원출력에 보존한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| measurement-2049-batch.log #1: FC01 exact insertion checks count=102 | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #2: seed FE02 writer start | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #3: seed FE04 bound finalized mutation segment0 | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #4: LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #5: LP26-O10-B 2049 initial exact-count-prefix | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #6: LP26-O10 stage-time-cap | [동일 원출력](measurement-2049-batch.log) | fail |
| measurement-1020-batch.log #1: FC01 exact insertion checks count=102 | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #2: seed FE02 writer start | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #3: seed FE04 bound finalized mutation segment0 | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #4: LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #5: LP26-O10-B 1020 initial exact-count-prefix | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #6: LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #7: LP26-O10-C02 cache prefix or full fallback exact oracle | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #8: LP26-O10-B 1020 rotated exact-count-prefix | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #9: LP26-O10-E01 malformed mutation rejected | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-2049-bound-proof.log #1: FC01 exact insertion checks count=102 | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #2: seed FE02 writer start | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #3: seed FE04 bound finalized mutation segment0 | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #4: LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #5: LP26-O10-B 2049 initial exact-count-prefix | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #6: LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #7: LP26-O10-C02 cache prefix or full fallback exact oracle | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #8: LP26-O10-B 2049 rotated exact-count-prefix | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #9: LP26-O10-E01 malformed mutation rejected | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| app-observe-bound-proof.log #1: LP26-O05 fixed current executable | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #2: LP26-O05 original bounded retention fixture | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #3: LP26-O05 distinct canonical sources | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #4: LP26-O05 isolated server healthy | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #5: LP26-O05 independent initial channels | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #6: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #7: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #8: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #9: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #10: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #11: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #12: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #13: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #14: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #15: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #16: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #17: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #18: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #19: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #20: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #21: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #22: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #23: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #24: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #25: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #26: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #27: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #28: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #29: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #30: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #31: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #32: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #33: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #34: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #35: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #36: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #37: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #38: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #39: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #40: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #41: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #42: LP26-O04 sample coverage | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #43: LP26-O05 both channels retained and progressed | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #44: LP26-O05 setting 9101 false | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #45: LP26-O05 setting 9201 false | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #46: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #47: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #48: LP26-O02 closed journal no partial tail | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #49: LP26-O05 stopped copy native catalog recovery | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #50: LP26-O05 native surviving and deleted states | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #51: LP26-O05 original journal bytes unchanged | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #52: LP26-O05 recovery copy cleanup | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #53: LP26-O05 isolated server healthy | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #54: LP26-O05 disabled restart | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #55: LP26-O05 stopped copy native catalog recovery | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #56: LP26-O05 native surviving and deleted states | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #57: LP26-O05 original journal bytes unchanged | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #58: LP26-O05 recovery copy cleanup | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #59: LP26-O05 restart exact catalog media state | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #60: LP26-O05 isolated server healthy | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #61: LP26-O05 setting 9101 true | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #62: LP26-O05 setting 9201 true | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #63: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #64: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #65: LP26-O05 reenabled recording after restart | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #66: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #67: LP26-O02 final restart closed journal no partial tail | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #68: LP26-O05 stopped copy native catalog recovery | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #69: LP26-O05 native surviving and deleted states | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #70: LP26-O05 original journal bytes unchanged | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #71: LP26-O05 recovery copy cleanup | [동일 원출력](app-observe-bound-proof.log) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #1: recovery first preflight retains strict content validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #2: recovery actual apply reuses validated content and preserves transitions | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #3: recovery sqlite preflight and projection reuse exact validated content | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | fail |
| lp24-recovery-lp26-batch-elevated-green.txt #4: recovery sqlite and jsonl return identical public values and durable bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #5: recovery new open performs fresh strict validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #6: recovery proof rejects changed envelope identity and payload | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #7: recovery proof preserves physical ordinal and duplicate collision rules | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #8: recovery proof never substitutes latest job for historical transition | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #9: recovery reused content preserves reservation source deletion and hold checks | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #10: recovery journal change invalidates reuse and retains strict corruption rejection | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #11: recovery pending checkpoint uses strict fallback | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #12: recovery budget exhaustion and admission exception preserve strict results | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #13: recovery proof ownership ends on success failure and exception | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #14: recovery noncanonical binding preserves existing sqlite canonical bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #1: recovery first preflight retains strict content validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #2: recovery actual apply reuses validated content and preserves transitions | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #3: recovery sqlite preflight and projection reuse exact validated content | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | fail |
| lp24-recovery-lp26-batch-oracle-green.txt #4: recovery sqlite and jsonl return identical public values and durable bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #5: recovery new open performs fresh strict validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #6: recovery proof rejects changed envelope identity and payload | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #7: recovery proof preserves physical ordinal and duplicate collision rules | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #8: recovery proof never substitutes latest job for historical transition | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #9: recovery reused content preserves reservation source deletion and hold checks | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #10: recovery journal change invalidates reuse and retains strict corruption rejection | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #11: recovery pending checkpoint uses strict fallback | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #12: recovery budget exhaustion and admission exception preserve strict results | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #13: recovery proof ownership ends on success failure and exception | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #14: recovery noncanonical binding preserves existing sqlite canonical bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #1: recovery first preflight retains strict content validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #2: recovery actual apply reuses validated content and preserves transitions | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #3: recovery sqlite preflight and projection reuse exact validated content | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #4: recovery sqlite and jsonl return identical public values and durable bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #5: recovery new open performs fresh strict validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #6: recovery proof rejects changed envelope identity and payload | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #7: recovery proof preserves physical ordinal and duplicate collision rules | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #8: recovery proof never substitutes latest job for historical transition | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #9: recovery reused content preserves reservation source deletion and hold checks | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #10: recovery journal change invalidates reuse and retains strict corruption rejection | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #11: recovery pending checkpoint uses strict fallback | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #12: recovery budget exhaustion and admission exception preserve strict results | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #13: recovery proof ownership ends on success failure and exception | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #14: recovery noncanonical binding preserves existing sqlite canonical bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #1: recovery first preflight retains strict content validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #2: recovery actual apply reuses validated content and preserves transitions | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #3: recovery sqlite preflight and projection reuse exact validated content | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #4: recovery sqlite and jsonl return identical public values and durable bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #5: recovery new open performs fresh strict validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #6: recovery proof rejects changed envelope identity and payload | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #7: recovery proof preserves physical ordinal and duplicate collision rules | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #8: recovery proof never substitutes latest job for historical transition | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #9: recovery reused content preserves reservation source deletion and hold checks | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #10: recovery journal change invalidates reuse and retains strict corruption rejection | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #11: recovery pending checkpoint uses strict fallback | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #12: recovery budget exhaustion and admission exception preserve strict results | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #13: recovery proof ownership ends on success failure and exception | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #14: recovery noncanonical binding preserves existing sqlite canonical bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-batch-green.txt compile | exit=null,signal=SIGTERM,stop=resource-observation,elapsed=255ms,groupClean=false; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-green.txt) | fail |
| lp24-recovery-lp26-batch-elevated-green.txt compile | exit=0,signal=none,stop=none,elapsed=3979ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt focused | exit=1,signal=none,stop=none,elapsed=3535ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | fail |
| lp24-recovery-lp26-batch-oracle-green.txt compile | exit=0,signal=none,stop=none,elapsed=3995ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt focused | exit=1,signal=none,stop=none,elapsed=3562ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | fail |
| lp24-recovery-lp26-batch-contract-green.txt compile | exit=0,signal=none,stop=none,elapsed=3982ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt focused | exit=0,signal=none,stop=none,elapsed=3552ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt compile | exit=0,signal=none,stop=none,elapsed=4025ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt focused | exit=0,signal=none,stop=none,elapsed=3599ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |

### Stage2 cleanup

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.dxigQ9` | 소유 실행root | 52749717B | 자식/reader 종료 뒤 삭제 | absent=true | [원출력](measurement-2049-batch.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.pnSCNx` | 소유 실행root | 26269511B | 자식/reader 종료 뒤 삭제 | absent=true | [원출력](measurement-1020-batch.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.9V3hUZ` | 소유 실행root | 38457729B | 자식/reader 종료 뒤 삭제 | absent=true | [원출력](measurement-2049-bound-proof.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-Mrcbqj` | 소유 실행root | 292201506B | 자식/reader 종료 뒤 삭제 | absent=true | [원출력](app-observe-bound-proof.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.AVTW1r` |초기 LP24 소유root|345,622B|메인이 owner dhseo/mode0700 확인,exactroot pgrep exit1 후 rm -r exactpath|test ! -e exit0,메인 직접관측|초기 raw는group-unconfirmed/removed=false로 보존; 사후 정리 원출력 미보존 |
| preflight-only2049 소유root |원출력 미보존 실행root|57,582,908B(메인 보고)|SIGTERM 뒤 소유root 삭제|부재 메인 직접관측,경로/raw미보존|보존증거와 구분 |
| LP24 elevated/oracle/contract/final 각 소유root |컴파일/fixture/cache|11,472,907/11,472,875/11,472,875/11,474,759B|각groupClean=true 후삭제|각removed=true|각LP24 raw command의exactroot·cleanup JSON |
| stage2 원출력9개 |비민감 텍스트|150689B|첫실패/계측/계약/정리 감사 보존|저장소 보존|제품raw payload/credentials/영상 파일을 복사하지 않음 |

메인은 사후 TMPDIR 최상위의 `media-server-catalog-cost.*` 경로 검색 결과 없음(exit0)을 직접 확인했다.
이는 현재 잔여 없음의 보조관측이며 preflight-only exactroot/raw미보존을 복원하지 않는다.
stage2 원출력9개는 O10의 batch2049/batch1020/bound-proof2049/app4개와 LP24 준비/재검증5개,
합계150,689B다. 초기 진단과 G01 로그는 이9개에 포함하지 않는다.
실제 앱이 만든 private stderr/media는 위 소유root와 함께 제거됐고 요약/해시만 보존한다.
이번 기록 담당은 제품/검증기를 수정하거나 이 실험을 재실행하지 않았다. 커밋/푸시 미수행.
token start/end/consumed는 미집계(하위작업 집계 없음);elapsed/source는 각 실제 summary/phase/bashed SECONDS,
앱 전체약53초/build/LP15는 메인 직접관측이다.


독자: S11 녹화 누적 비용 분석 담당자. lifecycle: 이번 선행진단의 최초 실패·교정·단회 재검증을 보존한다.
정책 source-of-truth는 AGENTS.md, 실행 정의와 색인은 [중앙 기록](../../../release-test-records.md)을 따른다.

최종 stage2 판정은 **bounded focused 통과**다. 제품 복구 보완 후2049원본/8196행의 독립 복구와
checkpoint·회전 관측 및 실제 앱30초 준비 실행을 통과했다. 누적 실제HTTP·120분·전체통합은4번 잔여다.
[stage2 최종 기록](#stage2-bounded-focused-최종-기록)의 제품 변경/최종 결과와 아래 최초 진단 이력을 구분한다.
아래 초기1020/2049 측정은 제품 무변경 시점의 역사적 기록이다. 초기2049는 **복구15초 제한에서 중단**했고
그 실행의 뒤 단계는 미완료다. 후속 PASS가 최초 실패를 지우거나 실제 장시간 실패 해결을 확정하지 않는다.

## 기준과 독립 oracle

- 작업 시작: HEAD `dccd425f`, `v4.1.0` clean 직접 확인.
- 측정 source: 메인 담당의 LP15 wrapper 호환 커밋 후 `4f39b2f6cf5e31c78f55e3291ade962e2b653f84`.
  원본/소유복제본 SHA256, compiler/library 버전은 각 measurement 로그 앞부분에 있다.
- macOS Darwin arm64, Apple clang21, GStreamer1.28.1, SQLite3.51.0, OpenSSL3.6.2.
  C++17 **명시적인 -O 없음**, FC01 소유복제본 중첩계측 켬; overhead를 빼지 않았다.
  해당 fixture의 시간은 최적화된 실제 서버 성능과 동등한 증거가 아니다.
- 실제 writer가 생성한 60 AU 원본1개의 파일증거를 검증한 뒤, 각 ID/order의 segment·binding·tombstone을
  typed struct 및 기존 serializer로 다시 생성했다. 별도 strict catalog Open의 zero recovery errors·4N mutation·N tombstone이 oracle이다.
  모든 scaled 원본은 삭제 완료 상태이고 media 파일을 생성하지 않는다. seed 실제파일도 생성 뒤 삭제한다.
- 작은16/64행, 실패근접1020/4080행, record상한초과2049/8196행.
  실제 보존 실패4071행과 synthetic4080행은9행 차이가 있다. 시간축·동시성·실제 payload 전체는 동일하지 않다.
- 64MiB·8192행 exact/plus1은 별도 admission 함수의 논리경계 검사다. 임의 payload를 쓴 경계검사가
  유효한 대용량 저장/복구 PASS를 뜻하지 않는다.

## 실행과 실패 이력

```sh
node --test scripts/internal/recording_accumulation_plan.test.mjs
bash scripts/internal/verify_recording_accumulation_probe.sh --run
bash scripts/internal/verify_recording_accumulation_probe.sh --case 1020
bash scripts/internal/verify_recording_accumulation_probe.sh --case 2049
bash -n scripts/internal/verify_recording_accumulation_probe.sh
node --check scripts/internal/recording_accumulation_run.mjs
node --check scripts/internal/recording_accumulation_prepare.mjs
git diff --check
```

| 실행 | exit | 실제 결과 | 근거 |
| --- | --- | --- | --- |
| 단위 RED | 1 | 미구현 helper assertion3개 예상 RED | [red.log](red.log) |
| 최초 단위 GREEN | 0 | 3/3 | [green.log](green.log) |
| 최초 전체계획 측정 | 1 |34초; small 통과,1020 두번째 checkpoint에서 합산 fixture15초 제한 | [measurement-attempt1.log](measurement-attempt1.log) |
| 단계 경계 교정 unit | 0 |4/4 | [stage-oracle.log](stage-oracle.log) |
| 1020 단회 재검증 | 0 |39초; 독립 각 단계15초 안 완료 | [measurement-1020-recheck.log](measurement-1020-recheck.log) |
| 2049 단회 측정 | 1 |38초; recovery 독립15초 제한, 뒤 단계 건너뜀 | [measurement-2049.log](measurement-2049.log) |
| 최종 unit | 0 |4/4; begin 없는 null wall 거부 포함 | [final-unit.log](final-unit.log) |
| 문법/공백 | 0 |bash -n, 두 node --check, git diff --check | 도구 exit 직접 확인 |

`red.log`의 의미 없는 공백-only 줄 6개는 저장소 공백 검사를 위해 빈 줄로 정규화했다. 실패 내용·순서·판정은 변경하지 않았다.

최초 합산15초는 fixture 정의 오류였다. 당시 **복구9.803초, 첫checkpoint4.197초는 각각 완료**됐고
두번째 checkpoint는 측정되지 않았다. 제품 복구 timeout으로 해석하지 않는다.
원래 실패를 보존하고 메인 지시에 따라 단계 begin/wall의 순서를 검사하는 독립15초 watchdog을 구현했다.
전체65초는 process cleanup을 위한 기술적 상한으로만 남겼다. 1020을 한 번 재검증한 뒤 메인 지시로2049를 한 번 실행했다.
HTTP4초·표본15초·native normalize3초·복구15초·원장 계약은 바꾸지 않았다.

각 실행에서 native probe/normalizer/metrics 컴파일을 독립60초 상한으로 수행했으며 모두 exit0,
생성은60초, 출력은4MiB, 소유root는448MiB, 각 측정프로세스 RSS는1GiB 경계를 사용했다.
장시간/실제 HTTP/브라우저를 실행하지 않았다. 마지막 malformed mutation 거부는1020 실행에서 통과했다.
2049 실행은 recovery 실패 뒤 해당 거부 검사를 다시 실행하지 않았다.

## 규모와 비용 직접 측정

| 항목 | 작은16/64행(첫 실행) | 실패근접1020/4080행(재검증) | record초과2049/8196행 |
| --- | ---: | ---: | ---: |
| 원장 원본 bytes |299,331|19,113,993|38,420,091|
| cache 논리 charge bytes |300,163|19,167,033|38,526,639|
| 논리 입장 예상 |허용|허용|record수로 거부,64MiB 미초과|
| initial observer drain |0.445초/1poll|5.590초/1poll|11.224초/2poll|
| strict recovery wall |0.088644초|9.931961초|독립15초 중단·미완료|
| recovery catalog hold |0.076018초|9.205167초|미확인|
| 첫·끝 비활성 binding2개 cold획득 |0.004856초|0.005232초|미실행|
| 첫 checkpoint wall/hold |0.067713초|4.179822초|미실행|
| 첫 checkpoint 원본적용/cache |64/retained|4080/retained|미실행|
| 반복 checkpoint wall/hold |0.038450초|2.435146초|미실행|
| 반복 checkpoint 재사용/원본적용 |64/0|4080/0|미실행|
| 실제 checkpoint inode교체 뒤 observer drain |0.130724초/fresh0|5.339934초/fresh0|미실행|
| native 확인 RSS high-water |32,817,152B|242,024,448B|외부 관측최대333,676,544B,종료시 self peak 미확인|

모든 completed catalog lock wait는 단일스레드의 수백ns 수준(1020 recovery208ns/cold250ns/warm125ns)이었다.
이는 실제 요청 경합의 wait를 측정한 것이 아니다. 관측기 parent RSS와 native child RSS도 구분하며 합산peak라고 주장하지 않는다.
1020 parent는 drain 전69,369,856B→initial후130,809,856B→회전후153,960,448B,
2049 parent는67,944,448B→initial후174,948,352B→종료시196,427,776B였다.
단회 high-water/current 변화는 leak/drift 판정이 아니다.

### 1020 checkpoint 비용 분해

| 완료 구간 | cold inclusive | warm inclusive | 의미/겹침 |
| --- | ---: | ---: | --- |
| catalog hold 전체 |4.179820초|2.435144초|아래 중첩단계를 포함 |
| CheckpointLocked 전체 |4.179761초|2.435081초|hold 내부 |
| ReadCheckpointRecords |1.263542초|1.923362초|warm에서도 원장 전체 읽기/해석 비용 존재 |
| originalSemantic |2.239350초|42ns|warm prefix4080 재사용으로 originalApplied0 |
| PrepareCheckpoint |0.167862초|0.001134초|candidate 준비 |
| CommitCheckpoint |0.199485초|0.006351초|원본 semantic 검증과 별도 |
| CheckpointLocked exclusive |0.308444초|0.503080초|계측된 자식 구간 외 비용, 임의로 특정 함수에 귀속하지 않음 |

inclusive 수치를 서로 중복 합산하지 않는다. 세부 함수별 inclusive/exclusive/count는 원출력 cost 행 전부에 보존했다.
ReadCheckpointRecords가 cached prefix 판정보다 먼저 수행되는 현행 구조와 warm측정이 일치한다.
cache 입장 거부가1020의 원인이라는 주장은 직접 evidence와 맞지 않는다: 논리charge약19.17MB·4080행이며 실제cache 유지/재사용이 확인됐다.
2049는 record상한을 넘지만 actual fallback 단계까지 도달하지 않아 그 경로 비용은 미확인이다.

## 직접 확인·가설·미확정 구분

| 항목 | 분류 | 결론 |
| --- | --- | --- |
| 1020 cold hold4.180초 | 직접 확인 | 이 계측 fixture의 catalog 단일 잠금 보유가4초를 넘었다 |
| 실제 HTTP4초 timeout 가능성 | 가설 | cold checkpoint와 같은 mutex를 요구하는 요청이 겹치면 대기 위험이 있다. 요청 시작시점·기타 대기·최적화/계측 차이를 미측정 |
| 1020 warm hold2.435초 | 직접 확인 | 이 단일 구간만으로4초 초과를 입증하지 않는다. 기타 단계/경합을 합쳐 확정하지 않음 |
| 기존 pause5초+drain 비용 | 계산/가설 |1020 회전drain5.340+pause5=10.340초;15초까지4.660초가 metrics/root/status 등 나머지 예산이다 |
| 2049 관측 간격 위험 | 계산/가설 |initial drain11.224+pause5=16.224초. 동일비용이 실제 반복루프에서 발생한다면 부가작업 없이15초를 넘긴다. 실제 반복 환경 재현은 아님 |
| 장시간 원래 HTTP timeout/15초 gap5건 | 미확정 |이번은 paused synthetic 단일스레드·60AU·삭제완료 표본이며 실제 앱의 source/retention 동시성·HTTP·전송/부하를 재현하지 않았다 |
| recovery 초과 | 직접 확인 |2049 fixture의 recovery는15초 안 완료되지 않았다. 종료된 scope의 세부 cost만 배출하는 계측이라 미완료 recovery 내부 원인별 시간은 없다 |

## 개별 실행 결과

아래 pass/fail은 표시된 oracle/단계의 실제 결과이며 전체제품·성능 PASS가 아니다.
예상RED·최초 fixture 시간 오류·2049 중단을 삭제하지 않는다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-F01 복구·checkpoint별15초 독립 경계와 정확한 순서 | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| FC01 exact insertion checks count=102 | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 initial exact-count-prefix | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-C02 cache prefix or full fallback exact oracle | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 rotated exact-count-prefix | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-E01 malformed mutation rejected | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 완료단계 1 recovery | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=9931961, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 2 cold-binding | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=5232, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 3 checkpoint-cold | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=4179822, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 4 checkpoint-repeat | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=2435146, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 compile probe | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| FC01 exact insertion checks count=102 | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 2049 initial exact-count-prefix | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 stage-time-cap | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10 compile probe | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| FC01 exact insertion checks count=102 | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 records8192 admitted | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 records8193 rejected | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 charge64MiB admitted | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 charge64MiBplus1 rejected | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 16 initial exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-C02 cache prefix or full fallback exact oracle | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 16 rotated exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 initial exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 time-cap | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10 완료단계 1 recovery | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=88644, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 2 cold-binding | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=4856, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 3 checkpoint-cold | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=67713, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 4 checkpoint-repeat | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=38450, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 5 recovery | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=9802854, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 6 cold-binding | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=5209, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 7 checkpoint-cold | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=4197420, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 compile probe | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-F01 복구·checkpoint별15초 독립 경계와 정확한 순서 | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |

## 미완료/미실행

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 최초1020 반복/회전 |둘째checkpoint·observer 재읽기|잘못된 합산15초 fixture 중단|첫실행은 FAIL 보존, 후속 단회 별도 결과로 구분 |
| 2049 strict Open |recovery 완주·count·projection oracle|독립15초 watchdog FAIL|단지 생성/initial parser 통과로 catalog strict PASS를 대체하지 않음 |
| 2049 cold/cache/회전 |cold binding·두checkpoint·회전재읽기|선수 recovery 실패 뒤 건너뜀|actual fallback 비용 미확인 |
| 64MiB 초과 유효누적저장 |대형 binding payload와 full Open|이번에는 순수 admission 경계만 실행|64MiB exact/plus1 함수 PASS만 있음 |
| 실제 앱/HTTP/장시간/UI |실제 sourceworker 동시성·HTTP status·120분·브라우저|이번 범위 밖|기존 실패 원인 확정/해결 및 release PASS로 사용 불가 |
| 제품 수정 |catalog/status/cadence 변경|메인 담당 판단 영역|이 담당자 미수행 |
| 커밋/푸시 |stage/commit/push|담당 범위 아님|이 담당자 미수행 |

## cleanup·보존·사용량

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.ulmhn1` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |26266579bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-1020-recheck.log](measurement-1020-recheck.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.QyQTUO` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |55913499bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-2049.log](measurement-2049.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.3y8WBr` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |68194882bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-attempt1.log](measurement-attempt1.log)|
| final-unit.log | 비민감 실행 원출력 |420bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| green.log | 비민감 실행 원출력 |329bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-1020-recheck.log | 비민감 실행 원출력 |21725bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-2049.log | 비민감 실행 원출력 |3764bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-attempt1.log | 비민감 실행 원출력 |34163bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| red.log | 비민감 실행 원출력 |3097bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| stage-oracle.log | 비민감 실행 원출력 |417bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|

서버/listening port/운영 계정/운영 원장은 만들지 않았다. compiler와 측정 자식은 bounded-exit/probe-process close로 종료를 확인했다.
2049와 최초실패 native는 소유 process group에 SIGTERM을 보내 close를 관찰했으며 강제SIGKILL 사용 evidence는 없다.
raw payload·영상·source URL·credentials는 보존하지 않았다. source/fixture hashes는 비민감 provenance다.

| 실행 영역 | token start | token end | token consumed | elapsed | source |
| --- | --- | --- | --- | --- | --- |
| 안정화 RED |미집계|미집계|미집계|31.544ms|node test summary; 작업별 usage 집계 없음 |
| 안정화 GREEN |미집계|미집계|미집계|29.386708ms|node test summary |
| 단계경계 unit |미집계|미집계|미집계|29.67775ms|node test summary |
| 최종 unit |미집계|미집계|미집계|30.170833ms|node test summary |
| 첫 측정 |미집계|미집계|미집계|34초(측정run26.430초)|bash SECONDS / Node performance |
| 1020 재검증 |미집계|미집계|미집계|39초(측정run30.283초)|bash SECONDS / Node performance |
| 2049 측정 |미집계|미집계|미집계|38초(측정run29.882초)|bash SECONDS / Node performance |
| 30분/120분/UI |미집계|미집계|미집계|미실행|이번 범위 밖 |

## LP26-O10-G 관측기 시작간격 보완

별도 메인 승인으로 동일2번의 관측기 대기만 보완했다. source HEAD `dbdfcba2cb941a8d6fc9b372a1351021eddf5c29` 위 작업이며
서버 catalog/status/media 제품 코드는 바꾸지 않았다. 위2049 recovery FAIL은 별도 미해결로 유지한다.

- `recording_longrun_progress.mjs::nextSampleDelay`: `max(0,min(5000-(now-phaseAt),end-now))`.
  유한·비음수 시간/역행을 검사하고15초 초과는 기존 `sample-gap`으로 거부한다.
- `verify_recording_current_longrun.mjs`: sample/drain/status 처리 뒤 helper를 호출하고 양수일 때만 대기한다.
  기존 고정5초 추가대기를 제거했다. 처리5초 이상은0이고 정확15초에서도 추가 대기가 없다.
- 목표는5초 start-to-start이지 실제 정시 실행 보장이 아니다. 다음 metrics 비용과 event-loop 지연은 남으며
  기존 cadence 전후 검사와 assertSampleStep의15초 초과 조기FAIL, finally 자원요약을 유지한다.
- HTTP4초/native3초/표본15초 및 출력4MiB·cleanup 계약은 바꾸지 않았다.
  실제 앱/장시간은 미실행이므로 기존 timeout/gap 해결로 확대하지 않는다.

### 명령·실패 이력

| 명령 | exit | 결과/시간 | 근거 |
| --- | --- | --- | --- |
| `node --test scripts/internal/recording_longrun_cadence.test.mjs` RED |1|helper export 미구현4개 예상 assertion 실패/36.005458ms|[원출력](cadence-red.log.gz)|
| 동일 GREEN |0|4/4,31.563708ms|[원출력](cadence-green.log)|
| `node scripts/internal/recording_longrun_progress.test.mjs` |0|45/45,57ms|[원출력](cadence-recording_longrun_progress.test.mjs.log)|
| `node scripts/internal/recording_current_longrun_diagnostics.test.mjs` |0|6/6,6.23725ms|[원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log)|
| `node scripts/internal/recording_longrun_summary.test.mjs` |0|51/51,21ms|[원출력](cadence-recording_longrun_summary.test.mjs.log)|
| `node scripts/internal/recording_current_http_diagnostics.test.mjs` |0|5/5,5.722542ms|[원출력](cadence-recording_current_http_diagnostics.test.mjs.log)|
| `node --check scripts/internal/verify_recording_current_longrun.mjs` |0|문법 정상|도구 exit|
| `git diff --check` |0|공백 정상|도구 exit|

GREEN111개와 최초 RED4개를 아래 개별 행 및 원출력과 대조했다. 실제 장시간/서버/브라우저/2049 재실행 없음.
token start/end/consumed는 모두 미집계(하위작업 usage 집계 미제공), elapsed/source는 위 실제 summary다.

### cadence 개별 결과

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| LP26-O10-G01 5초 시작간격은 이미 처리한 시간을 차감한다 | 최초 미구현 assertion; [RED](cadence-red.log.gz) exit1 | fail |
| LP26-O10-G01 종료 잔여시간까지만 대기한다 | 최초 미구현 assertion; [RED](cadence-red.log.gz) exit1 | fail |
| LP26-O10-G01 기존15초 초과는 즉시 실패한다 | 최초 미구현 assertion; [RED](cadence-red.log.gz) exit1 | fail |
| LP26-O10-G01 비정상 시간은 거부한다 | 최초 미구현 assertion; [RED](cadence-red.log.gz) exit1 | fail |
| LP26-O10-G01 5초 시작간격은 이미 처리한 시간을 차감한다 | 구현 후 독립 시간 oracle; [GREEN](cadence-green.log) exit0 | pass |
| LP26-O10-G01 종료 잔여시간까지만 대기한다 | 구현 후 독립 시간 oracle; [GREEN](cadence-green.log) exit0 | pass |
| LP26-O10-G01 기존15초 초과는 즉시 실패한다 | 구현 후 독립 시간 oracle; [GREEN](cadence-green.log) exit0 | pass |
| LP26-O10-G01 비정상 시간은 거부한다 | 구현 후 독립 시간 oracle; [GREEN](cadence-green.log) exit0 | pass |
| explicit 120 minutes accepted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI [] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI ["120"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI ["--duration-minutes","30"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI ["--duration-minutes","120","extra"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI ["--unknown","120"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| two channels progress and ordered deletion | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| stall rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| duplicate rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| UTC regression rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| completion without request rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid media metadata rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| duration cannot be shortened | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| unknown channel cannot satisfy progress | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| backward clock rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample continuous accepted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample gap rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample wrong PID rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample wrong identity rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample missing beginning rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample missing end rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample insufficient rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| actual golden schema accepted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| full duration distributed progress accepted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| last moment only cannot pass | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| ID limit rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| UTF8 byte limit rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| queried revision advanced disable | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| missing source rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| duplicate source rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid revision rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects [] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects ["120"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects ["--duration-minutes","30"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects ["--duration-minutes","120","extra"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects ["--unknown","120"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| completed batch returns media path once | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| missing media path rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| media path byte limit rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| ENOENT media absent | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| regular media present rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| dangling symlink present rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| media permission error rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| S09-LD01 invalid segment diagnostics are specific and redacted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| S09-LD01 missing timestamp diagnostics remain specific and redacted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| LP26-O09-A01 15초 첫/중간 경계와 즉시 실패 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-A02 identity·clock·pid 불일치 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-A03 보존 attempt3의 초과5건 중 첫 간격에서 실패 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-D01 실패 표본도 자원 요약에 보존하고 PASS 금지 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-D02 부족 표본과 잘못된 표본은 명시 상태 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-C02 slow 숫자행·완료/미완료·비밀 거부 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LS01 separate restart PID groups | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS01 literal first last max delta elapsed | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS01 postwarmup negative rate literal | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS01 new PID warmup resets and insufficient null | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS01 zero warmup rate separate PIDs | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 same PID gap explicitly measured | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 one sample gap and trend insufficient | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 FD zero valid | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 no resource or longrun pass | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 workload delta not reset by PID | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 raw input excluded from output | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 missing-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 zero-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 negative-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 infinite-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 nan-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 zero-thread rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 negative-fd rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 missing-fd rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 zero-pid rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 zero-time rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid-identity rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 missing-counter rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 missing-types rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 pending-journal rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 duplicate time rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 backward time rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 same PID identity change rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 global counters cannot reset at restart | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative segment_finalized decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative event_link_created decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative observation_put decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative observation_v2_put decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative deletion_requested decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative deletion_completed decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative corruption_detected decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative mutationCount decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative uniqueMutationIds decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative uniqueEntityIds decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative storedIdCount decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative idUtf8Bytes decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative consumedOffset decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid warmup undefined | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid warmup -1 | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid warmup 0.5 | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid warmup Infinity | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 empty input rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 10000 samples accepted | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 over 10000 samples rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 64 PID groups accepted | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 over 64 groups rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LP26-O09-B01 status/source-item 안전 분류 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |
| LP26-O09-B02 지정4MiB 초과는 body 실패 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |
| P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |
| P0-DIAG02 header timeout 고정 진단과 실패 유지 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |
| P0-DIAG03 body timeout 부분 수신 측정·완료 거부 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |

### cadence cleanup

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 없음 | 임시root/서버/port/미디어 |0|생성하지 않음|정리할 임시 산출물 없음|순수 helper·회귀, CLI 자식5건은 동기 exit2 확인|
| 이 디렉터리의 cadence-*.log 6개 |비민감 테스트 원출력|합계9,791bytes|실패/GREEN/회귀 감사 보존|저장소 보존|개별 title/count/exit 재확인용|

커밋·푸시 미수행. 이 보완의 직접 증거는 순수 시간계산·기존 실패/연속성/요약 회귀이며
실제 HTTP·장시간 증거의 대체나2049 복구 해결 증거가 아니다.
