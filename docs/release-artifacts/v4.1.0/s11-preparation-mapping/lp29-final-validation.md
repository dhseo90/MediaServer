# LP29 최종 30분·실제 UI 실행

독자: 개발·릴리즈 검토 담당자. 수명: v4.1.0 최종 검증 이력. 정책은 AGENTS.md,
중앙 결과 source-of-truth는 release-test-records.md다. LP28 단기 결과 다음 실행이며 과거 실패를 덮어쓰지 않는다.

## 승인·범위와 실행 전 정의

### 후속 승인: 주석 보완 후 순차 재개

사용자는 주석만 보완 → 정적 검사·기존 증거 영향 확인 → 실제30분 → 통과 후 실제UI·브라우저미디어를
승인했다. 단계별 분할 커밋, 마지막 조건 충족 시 push까지 포함한다. 아래 최초 실패·권한 이력은 보존한다.
메인이 범위/증거/최종 판정을 맡고 기존 단일 Astra/medium 담당자가 지정160파일 주석만 수정한다.
하위 위임은 금지한다. 제품 로직·문자열 상수·shebang·pragma·공개 계약·검사 기준·timeout은 불변이다.
가능하면 기존 설명 행에 표기만 보완하여 불필요한 위치 이동을 줄인다. 기존 증거는 주석 변경의
내용·위치 영향으로 유지/재결속/재실행을 구분하며 일괄 폐기하거나 무검토 재사용하지 않는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP29-C01 | 주석 정책 보완 | 최초154상단/23영문 지적을 보완, 기존 verify-code-comments 0/0·160파일 전수 대조 | v4.1.0 |
| LP29-C02 | 비주석 동등성 | 실제 diff·추가/삭제 행 대조, 실행 코드·상수·조건 불변 및 shebang/pragma 보존 | v4.1.0 |
| LP29-C03 | 정적 영향 | shell/변경JS·Python 구문, script/project inventory, docs links/assets, 공백을 순차 확인 | v4.1.0 |
| LP29-C04 | 기존 증거 영향 | source/fingerprint·행 위치·주석 의미 변화 검토, 필요한 현재 결속만 갱신·검증 | v4.1.0 |

새로운 제품 기능이 아니므로 기능 ID 추가가 아니라 위 실행 정의를 기존 LP29-L/U와 연결한다.
LP29-C 단기 범위 통과 전 커밋/실제30분/UI로 넘어가지 않는다. 공통·녹화120분·외부release는 이번범위밖,
외부서비스·실기기 명시 제외를 유지한다. 토큰 집계는 전용 실제 값이 없어 미집계 사유를 유지한다.

사용자는30분→실제UI·브라우저미디어 순차 실행, 단계별 커밋·조건 충족 시 push를 승인했다.
외부 서비스·실기기는 명시 제외다.120분·PR/CI/main/tag/Release를 이번에 실행하지 않는다.
제품/API/저장·권한 계약·timeout·assertion을 바꾸지 않는다. 같은 단계의 안전한 준비 보완은
AGENTS3.3 범위이며 새 계약/원인 미확정/정리 실패 시 뒤 단계를 중단한다.

기준: branch `v4.1.0`, 시작 HEAD `2055ed9b5ebc42c3cde58e3dca50bc9364cfd7ae`, upstream 동기·clean.
VERSION/CMake4.1.0, published 문서 기준4.0.0을 유지한다. LP28 빌드·인증·미디어·녹화 단기 증거는
제품/실행 도구 변경이 없어 유지한다. 문서 등록으로 해당 실행을 반복하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | 실행 준비·기존증거 유효성·필요 영향 검사 | LP28/AGENTS7.6.2 | 이번 승인, 기존유효증거 유지 |
| 30분 | 진행 대상 | 사용자1번·AGENTS7.6 | verify_predev_stability.sh main/soak·FINAL-30 | 이번 승인 |
| 실제 UI·브라우저미디어 | 진행 대상 | 사용자2번·AGENTS7.6.3/7.9 | native424/visual matrix·SF/UA/seek·FINAL-browser-media | 이번 승인,30분 통과 후 |
| 공통·녹화120분 | 진행 대상 | media/source/보존·복구 직접변경·로드맵 | S11·AGENTS7.6.2 | 이번 실행 범위 밖 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 최신 지시 | 실행하지 않음·PASS 아님 |

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP29-L01 | 실제30분 | `./server.sh verify-predev --soak-minutes 30 --skip-build --fail-fast`·summary/report 지정. build는LP28 유효 증거 유지 | v4.1.0(기존공통30분 재사용) |
| LP29-L02 | 실제 반복/시간 | 기존 monotonic duration/iteration ledger validator·실제 steps 원출력 대조,1800초 미달PASS 금지 | v4.1.0 |
| LP29-L03 | 격리·정리 | loopback 동적2포트·소유로컬UDP·임시state/event/recording/cache·local env차단,PID/port/자료정리 | v4.1.0 |
| LP29-U01 | native exact424 | 실제 제품브라우저 action·oracle, role/scope·424별 결과·Policy qualifier | v4.1.0(기존정의 유지) |
| LP29-U02 | visual matrix | 기존finalizer의320/390/760/1180×light/dark,영상/overlay/잘림/focus/contrast/accessibility 실증·검토 | v4.1.0 |
| LP29-U03 | 녹화 실UI | 현행 managed seed·SF/UA/seek 조작·Range/재생/시각,준비PASS를실행으로승격금지 | v4.1.0 |
| LP29-U04 | 브라우저미디어 | 실제WebRTC video/ICE/DataChannel/metadata 및종료·debugport/profile정리 | v4.1.0 |

상위 `verify_v390_server_longrun.mjs`는성공한predev세부로그를 `measureAndApplyCleanup`에서삭제한다.
이번에는동일위임명령을직접실행하여모든step원출력을이관전까지보존한다. fixture/quick/skip-redaction을쓰지않고
외부제외만유지한다. 기존시간/반복검증함수를그대로사용하며상위wrapper자체PASS를주장하지않는다.
실행소유root는 `/private/tmp/media-server-lp29.dXgaDi`,predev의별도workDir는실제summary로식별한다.
비밀원문을로그/인자/Git에남기지않으며auth필요단계는실행마다난수5개/격리계정만사용한다.
원출력·전수결과·실패·정리를보존후삭제한다. token start/end/consumed는전용집계없어미집계,elapsed/source는실측한다.

## 실행 상태

### LP30 승인: 실패 원인 확인부터 UI 마감까지

사용자는 잔여1번 EVT-058 원인 확정·한정 보완/검증, 2번 시각 교차·Policy·녹화 실UI·브라우저미디어
마감, 분할 커밋과 조건 충족 시 push를 승인했다. 공통/녹화120분·외부 release action은 이번 범위 밖이다.
외부서비스·실기기 제외를 유지한다. 제품 시간/저장/권한/API/미디어 계약·timeout·PASS 기준은 바꾸지 않는다.
메인이 원인·계약·최종 판정을 맡으며 기존 단일 Astra/medium 담당자는 읽기 경로 검토 후 확정 구현만 위임받는다.
하위 생성 금지. 이미 보존한 LP29 실패·423개 증거는 덮어쓰거나 현재 PASS로 바꾸지 않는다.

기존 trace의 postActionVisualRoleEvidence·정상 workflow cleanup은 존재한다. 호출 순서상 그 뒤
waitForPendingRequestSnapshot/close 경계를 조사하며, 기록에 최초 예외가 없어 대기 timeout으로 아직 단정하지 않는다.
기존 diagnostic sweep의 명시 case 선택과 안전한 failureDetail을 사용해 EVT-058만1회 실행한다.
관측 실패의 원인을 확보하기 전 전수 UI나 제품 변경으로 넘어가지 않는다. 서로 다른 sourceBinding/run을
합성하는 재개 기능은 현행 canonical runner/Policy에 없으므로 423개를 새 해시로 다시 쓰지 않는다.
한정 원인 해결·영향 검증 뒤 현행 전체 UI entry1회를 수행하는 순서다. 기존30분은 자동 재실행하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화·한정 진단 | 진행 대상 | EVT058 최초 예외 미확정·원인 확정 승인 | LP29 case326·native diagnostic/adapter | 이번 승인 |
| 실제 UI·browser | 진행 대상 | 사용자2번·버전필수 | LP29-U01~04·native424/visual80·I27~34/seek | 이번 승인,1번통과후 |
| 30분 | 미진행 | 현재 바이너리/제품 불변·LP29 PASS 유지 | LP29-L01~03·build SHA | 재실행하지 않음,향후diff 영향판정 |
| 공통·녹화120분 | 진행 대상 | 버전필수·미디어/보존 직접매핑 | S11·AGENTS7.6.2 | 이번 실행 범위 밖 |
| 외부서비스·실기기 | 미진행 | 사용자 명시 제외 | 최신 지시 | 제외·PASS 아님 |

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP30-D01 | 원본 보존·소스 대조 | tar의 EVT058 summary/policy/trace만 소유tmp에 복원,조작/시각/정리 단계와 runner 제어흐름 대조 | v4.1.0 |
| LP30-D02 | 기존 단일 실제 UI 진단 | run-v390-ui-native-diagnostic-sweep --case-id EVT-058·현재빌드·실제Chrome·30초기준. 최초예외/응답관측·정리 보존. 진단 PASS는 canonical UI 전체 PASS 아님 | v4.1.0 |
| LP30-D03 | 원인 한정 보완 | 확정 원인만 구현 전 반례 정의·예상RED→GREEN·관련 단기 회귀. 미확정/교차계약은 뒤단계 중단 | v4.1.0 |
| LP30-D04 | 문서 이동·요청 중계 한정 비교 | 소유 loopback fixture/실제Chrome에서 중계없음·중계중이동·중계응답후이동 각1회. 고정2요청의 browser start/response/finished/failed와 server 수신/send/close를 분리. 인위적 hold·최대60초는 원인 비교 조건이며 제품/UI PASS나 기존30초 완화가 아님 | v4.1.0 |
| LP30-NAV01 | 보조 이동 전 응답 정리 | catalog-source-navigation·catalog-restore-navigation 각각 기존 요청 정리 완료 전 goto 금지, 완료 후 이동·근거 기록 | v4.1.0 |
| LP30-NAV02 | 정리 실패 시 이동 금지 | 기존 timeout이면 goto 0회·실패 유지, timeout 연장 없음 | v4.1.0 |
| LP30-NAV03 | 실제 사용자 이동 불변 | 두 보조 kind 이외 이동에는 새 대기 적용 없음 | v4.1.0 |
| LP30-NAV04 | 미확인 응답·본문 거부 | 응답 누락·safe-body 읽기 미완료/실패를 성공 처리하거나 pending에서 삭제하지 않음 | v4.1.0 |
| LP30-NAV05 | 캡처 수명 유지 | 보조 이동 전 대기는 seal하지 않음·새 문서 요청도 후속 캡처, 최종 cleanup의 seal 유지 | v4.1.0 |
| LP30-NAV06 | 기존 시간 기준 유지 | 최소 관측250ms·quiet25ms·poll10ms·기존 timeoutMs 유지 | v4.1.0 |
| LP30-R01 | 조회 실행 계약 회귀 | node scripts/internal/verify_v390_ui_exact_oracle_runtime_contract.mjs, 기존 보조 이동·readback 의미와 오류 거부 | v4.1.0 |
| LP30-R02 | 문서 소유 요청 회귀 | node scripts/internal/verify_v390_ui_page_owned_request_lifecycle_contract.mjs, 문서/요청 소유·종료 경계 | v4.1.0 |
| LP30-R03 | 요청·조작 소유 회귀 | node scripts/internal/verify_v390_ui_request_action_ownership_scope_contract.mjs, 요청 소유/범위 및 오결속 거부 | v4.1.0 |
| LP30-U01 | 현행 UI 마감 | LP29-U01~04 그대로, source-bound424/visual80/Policy와 녹화실UI/browser를 구분 | v4.1.0 |
| LP30-C01 | 증거·정리·분할 커밋 | 명령/exit/전체항목/hash/소유PID/port/temp,통과단위 커밋·최종push조건 | v4.1.0 |

진단 소유root는 `/private/tmp/media-server-lp30.lgFabk`다. 비밀값은 기존 환경 준비기가 실행마다 생성하고
운영/상속 계정은 쓰지 않는다. 출력 전용 root·cache/state/TMPDIR·local ICE만 사용한다.
실측 token start/end/consumed는 집계 도구 미제공으로 미집계, elapsed/source는 실제값을 기록한다.
기존 진단 entry는 clean current-source를 요구한다. 최신 분할 커밋 승인에 따라 무결성 검증을 마친
LP29 증거 보존·정리 기록과 LP30 실행 전 정의를 문서 준비 단위로 먼저 커밋한다. UI 실패 단계의
구현 완료/검증 PASS 커밋이 아니며 실제 실패·미실행을 유지한다. 이후 runtime 진단 source는 이 커밋이다.

첫 진단 source는 `a0a95a04`이며 실제 EVT058 단일 실행은 exit0/8.639초·1PASS/0FAIL,
서버 PID76706·HTTP50459/RTSP50460·임시 역할root273,211B 정리 PASS다. 자동 재시도0,
diagnosticOnly=true/releaseEvidenceEligible=false/uiFulltestPass=false를 유지한다. 바이너리는 LP29와 동일하다.
이 결과는 최초 원인 해결이 아니라 미재현이다. 기존 실패의 누락2요청은 최초dashboard의
background-refresh(request57/58)이고 다음request60이 `/ops/events`로의 readback 이동이다.
복귀 후 같은2endpoint(object253/254)의 응답은200이었다. 서버의 지속적인 무응답으로 단정하지 않는다.
LP30-D04로 요청 중계/문서 이동의 관측 경계를 한정 비교한 뒤 수정 필요성을 판단한다.

LP30-D04 첫 비교는3조건 중2조건을 관측했으나 마지막 조건의 fixture가 응답 본문을 소비하지 않아
requestfinished 대기가 끝나지 않았다(exit2/6.643초). 제품 실패나 예상 RED가 아니다.
본문 소비를 추가한 동일3조건 비교는 exit0/1.994초다. 중계 없는 이동은 서버가2요청 수신·취소를
확인했지만 브라우저 response/finished/failed가 없었고, 중계 보류 중 이동은 서버 수신0·브라우저
종료 관측0이었다. 응답 완료 뒤 이동한 대조군은2요청 모두 response/finished가 남았다.
각 조건1회·명시적 인위 hold를 사용했으므로 과거 요청57/58의 서버 수신 여부나 최초 예외 원문까지
확정한 것은 아니다. 확인한 결함은 검증기의 보조 readback 이동이 진행 중 요청의 terminal 관측을
유실시킬 수 있다는 점이다. 제품 API/사용자 이동을 바꾸지 않고 두 보조 이동만 기존 정리 기준을
충족한 뒤 수행하도록 한정한다. 기존 LP29 실패를 PASS로 승격하지 않는다.

NAV01의 첫 예상 RED와 첫83개 GREEN은 LP30-D03 포괄 정의 이후지만 NAV 개별 등록 전에 실행됐다.
기존77PASS·신규1FAIL/exit1 및83PASS/exit0을 이력으로만 남기고 사전등록된 TDD 증거로 사용하지 않는다.
위 NAV01~06 등록 후 기존 소스 반례와 변경 소스 검증을 다시 수행한다. 무관한 제품·30분 증거는 유지한다.

등록 후 HEAD 본문의 NAV01만 메모리에서 재실행하여 동일 assertion의 예상 RED(exit1/38.4ms)를
확인했다. 현재 소스는83PASS/0FAIL(exit0/596.5ms), 구문2개·diffcheck 각각 exit0다.
관련 R01 조회 실행67개·R02 문서 소유 요청11개·R03 요청/조작 소유4개도 exit0다.
메인이 실제 diff·원출력·외부 호출을 검토했고, 공개 snapshot 호출은 기존 runner 한 곳에서
250ms/25ms만 전달하며 기본 seal을 유지한다. 두 보조 이동은 seal=false로 관측을 계속하고
기존 deadline 안에서 응답/본문 증거가 부족하면 이동 전에 실패한다. 제품 파일 변경은 없다.

[165개 등록 후 단기 검사·정리 전수](lp30-navigation-items.md),
[구조화 진단·명령 결과](lp30-navigation-result.json),
[진단·3조건 비교·최초 오류·도구·전체 원출력](lp30-navigation-evidence.json.gz)을 보존했다.
압축1,244,864B/48파일 복원 해시 일치, 소유 PID4개 부재·TCP50459/50460·UDP51896 재바인딩,
두 임시root 삭제·277cache 링크 대상 보존을 확인했다. 큰14MB 생성 manifest는 압축물 안에만
있으며 별도 소스 파일로 복제하지 않는다. 이 커밋 단위는 검증기 한정 수정·단기 회귀 완료다.
실제 수정 후 EVT058·canonical424·visual80·Policy·녹화UI·브라우저미디어는 뒤의 실행 단계에서
판정하며 아직 완료하지 않았다. LP29 실제30분은 동일 제품 바이너리 증거로 유지한다.
문서 마감 `./server.sh verify-docs-links` exit0:299문서/9692링크/22이미지/164anchor,
indexed76·제외214·오류0. `git diff --check` exit0. 기존 UI 이미지·30분 증거를 수정하지 않았다.

### LP30 실제 UI 재검증·기준 참조 불일치

`1ab70939` 커밋 후 EVT058 단일 실제 Chrome 진단은 exit0/9.001초·1PASS/0FAIL,
runtime PID78664·HTTP50993/RTSP50994·273303B 정리 PASS다. 이어 같은 clean source에서
`./test_ui.sh`를 실행했다(UTC22:34:47.211~23:01:00.479,2026-09-21,exit1/1573.274초).
424개 전부PASS·미실행0·자동재시도0, EVT058은 요청131/응답131·오류0·3.013초다.
시각80개 수집도 PASS·비밀검사/서버정리PASS지만 최종 qualifier는 다음2이유로 FAIL이다.
`canonical-case-manifest-implementation-controlAction-drift`,
`canonical-implementation-evidence-projection-drift`. 개별 qualifiedCaseCount424를 전체PASS로 바꾸지 않는다.
final-integrity의2오류는 해당 qualifier 실패와 firstFailure 보존에 따른 후속 판정이다.
녹화8개·별도 브라우저미디어는 실행하지 않았다.

원인은 LP28 `fa5afd8d`의 승인 구현 증적7행 actionAnchor 변경을 canonical 목록에 동기화하지 않은 것이다.
대상은 SRC009,RULE001/002/003/013/014/016이며 ID·route·selector·role·viewport·theme는 동일하다.
메인과 단일 담당자가 원본·현재 projection·native 실행 소비처를 읽어 대조했다. 실제 조작/예상값
변경 근거는 없지만 canonical/native/source hash는 엄격히 묶여 있으므로 원 실행물을 새 값으로 덮어쓰지 않는다.
같은 승인2번 검증 준비 결함으로 목록7행을 정합화하고 기존 Policy의 동일한 입력 정합 검사를
실제 실행 전에도 적용한다. Policy 의미·제품 코드·timeout 변경은 금지한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP30-PF01 | 기준 목록 정합 보완 |7개 anchor·projection hash만 현행 승인 증적과 대조,424 ID/route/selector/role/viewport/theme 불변 및 native 동작 projection 동등성 확인 | v4.1.0 |
| LP30-PF02 | 실행 전 동일 정합 검사 | 실제 qualifier와 공통 입력 검사 사용; stale anchor·projection·누락/순서/route drift를 거부하고 서버/빌드 전에 중단, 정상 현재목록 허용 | v4.1.0 |
| LP30-PF03 | 단기 영향 회귀 | Policy v4 contract·acceptance bundle contract·native manifest contract 및 구문·공백·문서검사, 최초 실패 이력 보존 | v4.1.0 |
| LP30-PF04 | 수정 후 실제 UI | PF01~03 통과·clean commit 후 현행 ./test_ui.sh, 기존 source-bound 전수 절차 유지. 원424PASS/80수집을 새source PASS로 자동 승격하지 않음 | v4.1.0 |
| LP30-PF05 | 독립 oracle 재결속 검토 | canonical7행의 core12필드와 core288개 출력 차이를 전수 대조. 실행 route/method/status/selector/expectedBehavior·상태/정리 조건을 유지하는 참조 갱신만 명시 승인, core→combined→native 영향 계약 순차 검사. hash 자동 승인·guard 제거 금지 | v4.1.0 |
| LP30-PF06 | 현재·공개 버전 기대값 정합 | 기존 seed dry-run의 고정 과거 버전 대신 독립 VERSION 및 공개 docs policy 기준을 대조. current와published 역할·잘못된 fixture 거부 유지. bundle 동일 검사·후속 runtime 계약 실행 | v4.1.0 |
| LP30-PF07 | 변경된 검증 소스 결속 | 변경 mjs 참조4ID(SAFE202/OPS169/SAFE212/OPS179)의 현재 역할·본문·assertion 대조. 후보·이전승인·독립검토 분리, 동등행만 승계하고 실제변경은 별도 검토. 원장/manifest·native 입력정합 및 기존 반례 검증 | v4.1.0 |

PF 준비의 최초 RED는 신규 validator 부재3건 외 기존 stale binding4건도 실패했다. 후자는 예상 RED가
아니라 이미 확인한 준비 실패다. 목록의7개 anchor·참조 hash를 기존 생성기로 갱신한 뒤 Policy 검사
재개는 core 독립 binding guard에서 import 실패(exit1/91.6ms)하여 개별 검사에 진입하지 못했다.
후속 검사는 중단했고 메인이 재결속 경계를 회수했다. 이 guard는 canonical anchor도 직접 보호하므로,
일치시키기 위해 값을 무조건 바꾸지 않고 위 PF05의 전수 차이·소비처를 검토한다.
canonical 갱신 명령 내부 import는 갱신 이전 파일을 읽기 때문에 같은 프로세스의 성공만으로
다음 프로세스의 독립 core 결속까지 검증됐다고 볼 수 없다. 별도 core/native/Policy 검사를 유지한다.

PF05에서 core288개 중281개 동등·7개 변경을 확인했다. anchor뿐 아니라 semanticTokens에 포함된
과거 anchor 토큰1개도 제거된다(새 actionHandler 심볼은 이미 포함). SRC009/RULE016의
requests.body.requiredFields에도 반영되므로 단순 주석·hash 변경으로 표현하지 않는다.
메인은 observeRequest 전체와 primary endpoint 실행을 대조했다. 전자는 method/path/status 및
requiredJsonPaths/requiredBodyTokens/forbidden/response 정책을 소비하며 설명용 body.requiredFields를
제품 전송 payload나 응답 assertion으로 사용하지 않는다. 후자의 body는 별도 caseRuntimeOwner가
만든 endpointActionRequest이며 core의 설명 payload와 다르다. 실제 기대 결과·필드·권한·DOM·
상태/cleanup 조건은 바뀌지 않고 검토된 소스 참조만 일치시킨다. 독립 guard·반례 검사를 유지하며
상수2개를 `cd5a649a…85695`로 명시 재결속한다. 후속 native는 새 core catalog hash를 반영하여
다시 생성·차이를 검토한다. 과거 UI source/hash는 그대로 유지한다.

명시 재결속·native 재생성 후 core17/combined3/native60/Policy32개는 PASS였다.
다음 bundle은37PASS/1FAIL(exit1/9.089초)로 중단했다. 기존 seed 검사634~636행이
current=v4.0.0/published=v3.9.1을 고정 기대하는 오류이며 신규 PF04는 PASS다.
원출력은 그대로 보존하고 PF06 범위에서 버전 기준만 보완한다. 후속 runtime·실제 UI는 아직 미실행이다.

PF06 보완 후 bundle38개·runtime67개, 수정6파일 구문·공백검사 모두 exit0다. 메인은 추가한
사전검사가 참조하는4개 기능의 source proof 영향도 확인했다. 변경 없는 소스 본문과 행 이동은
실제 변화를 구분하고, runRealStage의 사전검사 추가를 내용 동등으로 승계하지 않는다.
이 영향 결속까지 닫은 뒤 clean source 실제 UI로 진행한다. 30분/제품 실행물은 불변이다.

PF07의 현재 후보986행은 미해소0, 이전과 동등한982행을 승계하고 SAFE-202/SAFE-212/OPS-169/OPS-179
네 행은 고정 diff·임시 index tree와 현재 본문을 대조해 재검토했다. 후보 생성자는 메인이고 검토자는
기존 단일 담당자다. 검토자의 일부 구현 참여를 공개했으며 별도 제3자 검토로 표현하지 않는다.
메인이 실제 diff·판정 근거를 확인한 뒤 기존 producer를 실행했다(exit0/78.030초).
전체986행 구현/검토 원장·canonical 입력·native424의 기존 검증 함수는 exit0/39.592초·오류0이다.
기본 source-audit CLI의 반례15개를 이번에 다시 실행한 것은 아니다. 해당 검증기 본문과 기준은
변경하지 않아 기존 유효 반례 증거를 유지하고, 변경된 현재 전체행 결속은 직접 확인했다.

[217개 단기 개별 결과와 최초 실패](lp30-ui-preflight-items.md),
[986/424 결속 결과](lp30-ui-preflight-result.json),
[전체 원출력·명령·diff·독립 검토 압축물](lp30-ui-preflight-evidence.json.gz)을 보존했다.
압축2,170,029B/61파일·복원 해시 일치다. 준비 변경은 실제 UI 전체 PASS가 아니다.
준비 단위의 실행은 종료됐으며 관련 단기 fixture는 각 검증기가 정리했다. 기존 실제UI 원본 root와
이번 소유 작업 root는 다음 실제UI의 증거 보존·최종 정리까지 유지한다. 삭제·전체 cleanup 완료로
표현하지 않는다. 실제UI 실패 원본은 덮어쓰지 않고 작업 root 안으로 이동 보존한 뒤 새 실행한다.
token start/end/consumed는 실측 집계가 없어 미집계, 명령별 elapsed/UTC/exit는 압축 원출력에 있다.

### 실제 UI 실패 — 현재 최종 판정

주석 단계 `b9454076`, 실제30분 단계 `9c5b4316`을 각각 커밋한 뒤 clean source
`9c5b4316b741dbd2cda2d2d4f7b246b51549826f`에서 `./test_ui.sh`를 실행했다.
UTC 2026-09-21T20:47:38.535Z~21:13:45.056Z, exit1/signal없음, elapsed1566.522초다.
실제 Chrome152.0.7977.83·Playwright1.62.1로 exact424개를 실행하여 423PASS/1FAIL,
notRun/unsupported/runnerAbort0이다. **UI 전체 FAIL이며 Policy v4 적격 판정·uiFulltestPass는 미충족이다.**
사전 준비·전체 빌드·임시 역할 bootstrap·서버/브라우저 정리·실패 census 정합은 PASS다.
새 빌드 실행물 SHA256은 앞선30분과 같아, 현재 실패만으로30분 증거를 무효화하지 않는다.
제품/검증기 로직·합격 기준·timeout 변경이나 같은 UI 반복 실행은 하지 않았다.

실패는 `EVT-058`(operator, `/ops/dashboard`, 390×844/light, `#dashRuntimeTrendSparkline`)이다.
trace의 wait-visible/assert-visible-read-model/verify-independent-readback은 모두 PASS이나,
case-execution의 `CASE_EXECUTION_FAILED`가 기록됐다. 함께 관측한 `RESPONSE_MISSING` 두 건은
GET `/ops/api/site-operations/impact-graph`, GET `/ops/api/site-operations/runbook-instance-ledger`다.
요청131/응답129, 분류누락0/중복0/captureErrors0이며 해당 두 요청의 response/finished/failed가 없다.
primaryFailureEvidence는 null, marker lifecycle은 not-reached다. **응답 관측 부재가 실제 서버
무응답 또는 최초 예외의 원인이라는 근거는 아직 없다.** 브라우저 console은 비어 있고 실패 화면은
메인이 직접 보았으나 이것으로 시각 전수 PASS나 원인 확정을 주장하지 않는다.

기존 canonical parent는 개별 case 실패 뒤에도 같은 배치의 나머지 case 결과를 수집한다.
이번424전수 수집은 그 기존 동작이며 새 후속 단계 실행이 아니다. aggregate FAIL 뒤 visual80/finalizer,
Policy qualification, 별도 녹화 I27~34/seek 실제UI와 브라우저미디어 검증은 진행하지 않았다.
423개 결과를 자동화 적격423개로 승격하지 않으며, 향후 변경 영향·증거 경계로 재사용 여부를 판정한다.

사용자는 **전체 증거 약19MB 보존**을 승인했다. [전체 압축물](lp29-ui-full-evidence.tar.gz)은
19,045,901B/1,852파일/해제180,909,290B, SHA256
`963679bb8c63c5a78dfda63f7620cdc9f718ddd7de43226420095f41cddbc9cd`다.
경로 containment·전체 파일 해시/크기 복원 일치·기존 비밀 스캔 PASS를 확인했다.
이는 생성된 전체 자료 보존이지 모든 적격 증거가 충족됐다는 뜻은 아니다.
[424개·1089action·실행/미실행·정리 전수](lp29-ui-items.md), [구조화 요약](lp29-ui-result.json),
[실행/정리 도구·원출력](lp29-ui-run-outputs.json.gz)을 연결한다.
token start/end/consumed는 실측 집계 제공 도구가 없어 미집계이며 elapsed/source는 실측이다.

UI runtime/임시계정1,668,883B는 runner가 삭제했다. 서버 PID42523 및 wrapper40896/41958 부재,
TCP59853/59854·UDP60030 재바인딩을 확인했다. canonical180,909,290B와 외부temp201,592,125B는
증거 이관 후 삭제·부재 확인했다. temp 크기에는 복원 대조 사본과 압축물 중복이 포함된다.
정리 helper는 처음 cache 링크를 거부했고, 다음 한정 경로식이 validate 하위4개를 빠뜨려 삭제 전
중단했다. 실제277개 위치와 두 Cellar 버전 대상을 확인한 뒤 임시 링크만 삭제했고 대상은 유지했다.
두 준비 오류와 보완 결과는 cleanupHistory에 보존한다. 제품/UI 실패와 구분하며 최종 cleanup PASS다.

분할 커밋2개는 유지한다. 현재 UI 실패·후속 미실행 때문에 이 실패 단계를 커밋하지 않았고,
증거/기록만 미커밋으로 남긴다. **푸시 가능: 아니오 / 푸시 수행: 없음.**
기록 마감의 링크 검사는 새 색인의 anchor1건 오류(exit1)를 보존한 뒤 파일 링크로 정정하여
exit0/오류0을 확인했다. 문서 자산10PASS·공백검사exit0이며 UI 재검증이 아니다.
[문서 명령·원출력·최초 실패](lp29-ui-doc-checks.json)를 보존한다.
다음은 보존한 실패 자료에서 최초 예외·후속 화면 전환·요청 수명 관측의 경계를 확정하고,
확인된 원인만 보완·한정 검증한 뒤 UI 마감 순서로 복귀하는 것이다. 원인 없이 timeout 확대,
UI/30분 전체 재시작, 제품 경로 수정은 하지 않는다. [릴리즈 전수표](release-readiness-20260916.md)를 따른다.

### 실제30분 마감 — 현재 결과

주석 단계는 `b9454076`으로 분할 커밋했다. 그 clean source에서 등록한 실제 명령을 1회 재개했다.
UTC 2026-09-21T20:01:20.619Z~20:41:23.380Z, exit0/signal없음, monotonic2402.756초.
통합 사전검사569초 후 실제30분 loop20회, 상위108PASS/0FAIL/skip2/notRun0이다.
기존 duration validator eligible=true, iteration validator 오류0이며 run_soak_loop의1800초 deadline을
유지했다. 순수 soak 전용 시작/끝 timestamp는 원 도구가 별도로 수집하지 않으므로 전체2402초를
순수 관측 시간이라고 부르지 않는다. integrated21PASS/0FAIL/skip9와 상위집계를 혼합하지 않는다.

[개별 결과·미실행·정리](lp29-30-pass-items.md), [시간·원장·명령 요약](lp29-30-pass-summary.json),
[원출력308개·자식결과1254행](lp29-30-pass-outputs.json.gz)을 보존했다.
압축66,735B/해제1,208,873B, SHA256 `5c3ba9d573595b364d838bb4854ceb92164e7e9155aa57bfad287655edea11a1`.
로컬 RTSP 입력URL14개를 제거했고 계정/원본영상은 이관하지 않았다.
소유3root의16,655,992B를 삭제하고 부재·PID4개종료·TCP2/UDP1재바인딩을 확인했다.
277개 임시 플러그인 링크의 실제 시스템 대상은 삭제하지 않았다. 서버 wait exit/signal은 미수집이다.
처음 주석 FAIL 기록은 유지한다. 이 결과는 `9c5b4316`으로 커밋했고 후속 실제UI 결과는 위에 기록했다.

### 주석 보완 마감 — 당시 판정

LP29-C01~04를 완료했다. 160파일의 주석만 수정했고 154상단 형식·23영문 전용 행 지적은
기존 검사1161파일에서 각각0이 됐다. 비주석160파일 동일, shell20/JS49/Python2 구문71개,
script inventory12·project inventory 전체·native exact 계약60·문서 링크/자산10·공백을 통과했다.
이 값은 실제 기능986개/UI424개 실행 PASS가 아니다.

기존986 source-flow 중985개는 엄격 동등성 승계, MEDIA-003만 독립 검토 뒤 producer로 갱신했다.
메인은 실제 diff와 생성된 fixture leaf 변경을 검토했다. audit의 실제 변경은 MEDIA-003의
sourceFlowDigest·readback trackedBlobSha256·verifierFileSha256 및 전역 candidateDigest뿐이다.
manifest/approval의 넓은 diff는 승인 날짜·승계 근거·연쇄 digest 갱신이며 route/control/action/assertion은
변경되지 않았다. native424 manifest는 바이트 동일하다. 담당자는 주석 구현 이력이 있어 완전히 무관한
제3자 검토는 아니며, 메인 candidate 생성과 담당자의 scoped 검토·메인의 최종 검토를 분리했다.

기존 제품 빌드/기능 증거는 비주석 동등성·실제 diff·동일 실행물에 한해 유지한다.
binary SHA256=`2ce43399ce33fd6863a9aa8d0e21e65ae32975ee52ad08d065b09e065aca9fd7`.
파일 원문 hash가 바뀌었으므로 과거 S10 freeze 원문 hash를 현재 hash라고 주장하지 않는다.
새 빌드/실제30분/UI 통과를 뜻하지 않는다. 다음 실행 root는
`/private/tmp/media-server-lp29-soak.BceqcQ`이며 준비된 실행 파일만 있고 아직 실행하지 않았다.

전수 개별 결과·명령/exit/시간은 [주석 검사 요약·전수 행](lp29-comments-summary.json),
원출력·동등성160행·migration986행·검토 결정·실패 준비 패키지·실제 fixture leaf diff는
[주석 보완 압축 증적](lp29-comments-outputs.json.gz)에 보존했다. 기존 audit/approval 원문은 시작
커밋2055ed9b에 있으므로 중복 대용량 사본 대신 hash/복원 근거만 보존한다. 선택 파일41개에
정적 자료만 선택했으며 계정/실제 영상/브라우저 trace는 없다. 최초 helper의 출력 버퍼 ENOBUFS도
읽기 보조 도구 오류로 보존하고, 버퍼 수용량만 보완해 fixture 대조를 완료했다. timeout 변경이 아니다.
토큰 시작/종료/소비는 전용 실측 없음으로 미집계다. 각 명령 elapsed/UTC/source는 JSON에 있다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/tmp/media-server-lp29-comments.u7CQ7s` | 정적 검사·candidate·임시 index·소유 cache,46파일/2디렉터리/링크0 | 21,809,115B | 원출력/hash/개별결과 이관 후 정확root 삭제 | 부재 확인 | archive hash 및 final-docs/project/native/diff exit0 재확인 |
| `lp29-comments-outputs.json.gz` | 비민감 정적 증적41파일·fixture변경·동등성 | 767,899B(해제5,196,649B) | 보존 | gzip roundtrip·SHA256 검증 | `72c62a3524e81bd2a132c0ef04cfc26566237c6475a27f84d17dd19b69da90bb` |
| `/private/tmp/media-server-lp29-soak.BceqcQ` | 다음 실제30분 실행 준비 | 실행 스크립트1개 | 다음 승인 단계에 사용 | 미실행·별도소유 | comment cleanup 대상 아님 |

주석 단계는 실제 서버·브라우저·port를 생성하지 않았다. 따라서 이 단계의 runtime cleanup 대상은 없다.

아래 최초 실패와 당시 미완료 표는 과거 이력이며 현재 주석 마감 결과로 덮어쓰지 않는다.

### 주석 보완 중 실제 판정 이력

주석 검사1161파일 상단0/영문0·공백검사 PASS. 메인 비주석160파일 동일·스크립트 구문71개 PASS,
기존 바이너리 SHA256 불변을 확인했다. 새 빌드가 아니라 기존 실행물의 유효 범위를 유지한다.
첫 candidate 생성은 exit0이었다. 첫 migration 호출은 `--trust-rebind-id MEDIA-003`을 지정했으나
전체 verifier 해시가 sourceFlowDigest에도 포함되어 `trust-only rebind cannot include semantic field drift`로
exit1이었다. 실제 변경 필드는 sourceFlowDigest·readback trackedBlob·verifierFileSha256 세 개이며
WHEP assertion/route/action/state/line은 동일하다. 메인의 비교 모드 선택 오류다.
trust-only 지정 대신 기존 일반 delta 모드로 독립 검토 대상으로 분류한다. 검사 기준·제품은 변경하지 않고
최초 실패 원출력을 보존한다. 앞선 문서 보완 apply_patch 문맥 불일치는 파일 무변경 도구 오류로 별도 구분한다.

독립 읽기 검토는 WHEP 내용 동등성을 확인했으나 최초 검토 패키지의 diff 결속을 기각했다.
임시 index를 채운 뒤 diff까지 그 index로 비교해 빈 diff를 기록한 메인 준비 오류였다.
실제 index 기준 diff와 임시 index의 tree를 분리해 다시 묶는다. 최초 패키지는 보존하고 승인/producer를
먼저 실행하지 않는다. 검토 기준 완화·제품 변경·기존 실패 삭제 없이 같은 C04 준비 범위에서 보완한다.

최신 사용자가 “실제 30분 검증과 통과 후 UI·브라우저 미디어 검증 실행 승인”을 직접 승인했다.
아래 두 차례 실행 전 거절 이력을 보존한 채 동일 명령을 새 소유 root
`/private/tmp/media-server-lp29-resume.uXBuZl`에서 재개한다. 시간제한·합격 기준은 변경하지 않는다.
실제 재개 결과는 아래와 같다. 두 차례 권한 거절은 과거 실행 전 이력이며 현재 막힘은 권한이 아니다.

### 명시 승인 후 실제 실행 결과

`node /private/tmp/media-server-lp29-resume.uXBuZl/run-30.mjs`는 승인 후 실행됐다.
위임 명령은 등록한 `verify-predev --soak-minutes 30 --skip-build --fail-fast`와 동일하다.
UTC 2026-09-21T16:52:17.707Z~16:52:58.765Z, monotonic 41.066775125초, exit1/signal 없음.
predev 요약은 PASS3/FAIL1/skip1/notRun6, 실제 soak 반복0이며 30분 관측에는 진입하지 못했다.

- integrated-smoke 내부 문법 검사와 script inventory12는 PASS.
- 세 번째 `verify-code-comments`가 1161파일 중 상단 형식154파일·영문 전용 설명23행을 FAIL로 판정했다.
- 겹치는 파일을 제외하면 기존 추적 파일160개다. 상단154개는 include10/scripts137/src7이다.
  일부는 한글 설명이 이미 있지만 첫8줄에 `파일 용도/파일 요약/동작 요약` 문구가 없어 실패했다.
  주석 전체 부재나 제품 기능160개 실패로 해석하지 않는다. 런타임 녹화/HTTP 실패 증거도 아니다.
- 변경 없이 같은 검사를 반복하거나 timeout/검사 기준을 완화하지 않았다. UI는 순차 선수 실패로 미실행이다.

**이전 완료 표현 정정:** LP28의 실제 빌드·인증·녹화·환경 등 개별 PASS는 유지한다.
그러나 그 실행 manifest에서 공통 주석 검사가 누락됐으므로 `S11 최종 단기 완료`라는 전체 표현은
부분 완료로 정정한다. 영향 기록은 LP28 마지막 `2055ed9b`의 단기 완료 설명과 중앙/릴리즈 상태다.
과거 실행 결과를 지우지 않으며 이번 정정은 새로운 제품 회귀나 기존 모든 증거의 폐기를 뜻하지 않는다.

원출력23개·RTSP URL4곳 제거·gzip 해제 동일성·해시는
[실행 요약](lp29-30-failure-summary.json), [압축 원출력](lp29-30-failure-outputs.json.gz),
[개별 결과·전체 주석 지적·정리](lp29-30-item-results.md)에 보존했다.
기존 duration/iteration validator는 1800초 미달·빈 반복 원장을 거부했다. 이를 PASS로 바꾸지 않는다.
서버 PID4093 및 wrapper/호출 PID4091/4075 부재, TCP50458/50459·UDP55388 재바인딩을 확인했다.
기존 predev는 server wait exit/signal을 보존하지 않으므로 **서버 정상 종료 코드 확인**으로 확대하지 않는다.

현재 승인은 고정 코드 검증 실행이다. 160파일 주석 보완과 그에 따른 source 결속 영향 검토는
별도 구현 범위로 제시한다. 권장: 주석만 보완 → 공통 정적 검사·동등성/영향 결속 판정 → 30분 재개 → UI.
주석만 바뀐 부분의 유효 제품 증거까지 일괄 폐기하지 않으며 새 전체 장시간 검사를 무조건 추가하지 않는다.
분할 커밋·푸시는 승인된 검증 단계가 미완료여서 미수행이다. 푸시 가능: 아니오.

### 권한 심사 결과

정확 요청 명령은 `node /private/tmp/media-server-lp29.dXgaDi/run-30.mjs`였다.
[실행 환경·명령 원본](lp29-run-30-not-executed.txt)은 비밀값 없이 보존했다.

| 번호 | 요청 | 실제 결과 | 실행 상태 |
| --- | --- | --- | --- |
| 1 | 사용자1번 승인에 따른30분loopback 격리 실행 | CreateProcess Rejected: 구체적 장시간 실행 승인 근거 부족 | 프로세스 생성 전 거절·exit 없음 |
| 2 | 동일명령,직전1번=30분 및 최신사용자승인문구를 명시하여 재심사 | CreateProcess Rejected: 번호 참조 승인으로 구체적 장시간 승인 확인 불가 | 프로세스 생성 전 거절·exit 없음 |

명령 변경·다른 실행 도구·권한 우회로 재시도하지 않았다. root에는 실행파일4086B 하나뿐이고
output/run-start.json 및 output 폴더가 없어 실행 미진입을 확인했다. 이 두 거절을 제품 FAIL이나
실행된30분 FAIL로 기록하지 않는다. 이후 직접 승인으로 재개한 실제 실패는 위 별도 절에 기록했다.

### UI 읽기 준비 결과

- 기존 단일 담당자 Astra/medium 읽기 검토만 수행했다. 파일 수정/서버/UI 실행·하위생성 없음.
- `test_ui.sh`는 현재 실제 acceptance entry이며 fixed `.media_server.test/v4.1.0/ui-acceptance-current`를
  사용한다. 재개 시 기존 소유root 상태부터 확인한다. native424와 finalizer visualMatrix·Policy v4를 구분한다.
- 424행 자체는390폭423/1440폭1·light424이며, 기존 finalizer의320/390/760/1180×light/dark 실제 실행과
  reviewRequired/영상/잘림/초점/대비를 별도로 판정해야 한다. source/contract PASS로 확대하지 않는다.
- `verify_v410_recording_ui_contract.mjs --ui-auth-direct --ui-anchor-utc-ms <명시UTCms> --ui-seek-fixture`는
  실제 managed 저장소 준비다. actualUiPass=false를 유지하고 SF/UA/seek의 실제조작·Range·영상 확인이 필요하다.
- 브라우저미디어는 `verify-webrtc-va-metadata`의 기본45초/hold0·실제8항목과 종료/포트/profile 정리를 확인한다.
- 기존 acceptance 환경의 상속STUN/TURN은 실행시 소유loopback ICE·빈TURN으로 고정해야 한다.
  실제 운영계정/외부서비스는 사용하지 않는다. 역할state·rawtrace·Chrome원출력은 비공개root에서
  redaction/해시 검토 후 필요한 증거만 보존한다. 정책·완료 기준을 새로 완화하지 않는다.

## 미실행·미완료

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 30분 | 실제 verify-predev duration/iteration/정리 | 실제 실행41.067초·공통 주석 FAIL,soak0 | 전체 FAIL·관측 미완료 |
| 실제 UI/브라우저미디어 | native/visual/녹화/metadata | 순차 선수30분 실패 | 읽기 준비는 실행 PASS 아님 |
| 커밋·푸시 | 이번1/2 단계완료분 | 완료한 검증 단계 없음,문서 준비 미커밋 | LP28의2055ed9b 푸시는 이전 결과 |
| 120분·외부릴리즈 | 후속3~6 | 이번 실행범위 밖 | 이번에 실행하지 않음 |
| 외부서비스·실기기 | 실제 환경검증 | 사용자명시제외 | PASS 아님·잔여검증으로 재추가 금지 |

## 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/tmp/media-server-lp29.dXgaDi/run-30.mjs` | 이번 미실행 실행환경 스크립트 | 4086B | 위txt에 보존 후 정확파일 삭제·빈root rmdir | exit0·root 부재 확인 | stat/readdir/삭제 명령 |
| 위root/output 및 검증 서버·port·storage | 미생성 | 없음 | 삭제 대상 없음 | 런타임미진입 | 권한거절·output 부재 |

필요한 실행 준비 내용은 txt에서 복원할 수 있다. 제품 파일·시스템 패키지·기존 데이터는 변경/삭제하지 않았다.

재개 실행 소유 root는 파일16/링크277·1,782,591B, predev workDir 파일11·25,249B,
통합 로그 root 파일4·13,511B를 필요한 원출력 보존 후 삭제했다. 총1,821,351B이며 모두 부재 확인했다.
277개는 임시 GStreamer 링크만 제거했고 실제 시스템 파일은 보존했다. 정리 도구·실행 환경 원본도 압축물에 있다.
보존 gzip은13,927B, 해제74,714B이며 신규 실제 영상/trace/계정 원문은 없다.

## 준비 문서 검증

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 문서 링크 | `./server.sh verify-docs-links`,exit0,295문서/9650링크/22이미지/163anchor/index76/exclusion210/오류0 | PASS |
| 공백 | `git diff --check`,exit0·출력없음 | PASS |

위 두 검사는 준비 기록의 문서 검사뿐이며30분/UI의 미실행 상태를 바꾸지 않는다.
토큰 시작/종료/소비는 전용 집계 부재로 미집계,도구 반환 wall time은 각각0.015244083초/0.00003725초다.

### 실제 실패 기록 후 문서 검증

순서는 공백 → 링크 → 자산이며 각각 exit0이다. 문서 검사가 제품/30분 실패를 대체하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| 공백 | `git diff --check`,exit0·출력 없음 | PASS | 실패 기록·정정 문서 범위 |
| 문서 링크 | `./server.sh verify-docs-links`,exit0·296문서/9657링크/22이미지/164anchor/오류0 | PASS | actual UI 시각검사 아님 |
| 대표 이미지 구성 | `./server.sh verify-docs-ui-assets`·README 대표 제품 이미지 | PASS | 실제 화면 확인 아님 |
| 영문 README 이미지 | 동일명령·영문 이미지 연결 | PASS | 실제 화면 확인 아님 |
| UI 가이드 공유 자산 | 동일명령·공유 이미지 집합 사용 | PASS | 실제 화면 확인 아님 |
| 캡처 정책 | 동일명령·규칙 문서 | PASS | 실제 캡처 미실행 |
| 자산 manifest | 동일명령·관리 목록 완전성 | PASS | 파일 연결 검사 |
| 캡처 소유권 | 동일명령·문서 자산 스크립트 연결 | PASS | 실제 캡처 미실행 |
| 현재 screenshot 목록 | 동일명령·캡처 대상 연결 | PASS | 실제 캡처 미실행 |
| 오래된 baseline 참조 | 동일명령·대표 문서 참조 검사 | PASS | 실제 UI 비교 아님 |
| PNG 자산 | 동일명령·관리 경로 존재 | PASS | 실제 시각 확인 아님 |
| VA 이미지 프레임 범위 | 동일명령·기존 자산 정책 검사 | PASS | 이번 제품 영상 재생 PASS 아님 |

원출력(토큰 전용 집계 없음, wall time은 링크0.012727667초·자산0.000006959초):

```text
== Docs link verification summary ==
- markdown files: 296
- local links: 9657
- local images: 22
- local anchors: 164
- indexed docs: 76
- index coverage exclusions: 210
- failures: 0
[pass] README uses only representative product UI screenshots
[pass] English README uses English UI screenshots
[pass] UI guide keeps product screenshots in the shared asset set
[pass] docs UI asset policy documents capture rules
[pass] managed UI asset manifest stays complete
[pass] capture script owns every documented UI asset
[pass] docs capture covers current screenshots
[pass] representative screenshot docs do not point at stale visual baselines
[pass] docs UI asset directory contains managed PNG files
[pass] VA documentation images keep full video frame bounds

== Docs UI asset verification summary ==
- pass: 10
- fail: 0
```
