# v3.9.0 REVIEW4 잔여 이슈 55~65 구현 계획 및 현재 기록

이 문서는 REVIEW4 55~65 개발의 현재 실행 경계를 기록하며 roadmap과 release evidence를 대체하지 않습니다.
현재 frontier는 62/65번 독립 acceptance 실행 인터페이스 correction입니다. 64번 구조 안정화는 완료·커밋됐고,
65번은 기존 fail-stop 기록을 보존한 채 사용자가 인자·환경변수 없이 30분·120분·UI·release 중 하나의
root launcher만 실행하는 4-launcher interface와 실행기 소유 port/secret/browser lifecycle을 보강했습니다. 실제 30분·exact UI·120분은 이번
correction에서 재실행하지 않았습니다.

| 항목 | 현재 상태 | 다음 경계 |
| --- | --- | --- |
| REVIEW4-64 | 완료. Slice 32 구조 final target 충족, commit `b9a45740` | REVIEW4-65의 입력 commit으로 고정 |
| REVIEW4-65 | 진행 중. Historical actual 35/35와 real 30분은 PASS했으나 exact UI가 implementation binding drift로 browser 실행 전 0/424 FAIL. Official binding refresh, current 36 gate, structured pre-execution summary와 measured cleanup 계약을 보강 | correction checkpoint commit/push 뒤 `./test_release.sh` fresh actual 실행 |

## Slice 30A Analysis Session read application 경계

Standard-only Analysis Session read port/service, canonical adapter와 internal mapping을 추가했습니다. Transport의
canonical read는 71건에서 0건으로 줄었고 application 호출은 Snapshot 11, Snapshots 54, WaitResultNearPts 2,
LatestFrame 1, LatestFrameAndResult 1, ActiveTapCount 2입니다. Event Rule, VA metadata, overlay, JSON, Ops, SSE,
WS, WebRTC는 application DTO를 소비합니다.

Focused verifier의 최초 실패는 parser/exact binding의 transient 문제였고 수정 후 6/0입니다. Structure15/0,
build100%, analysis181/0, SSE5/0, side-channel5/0, WS9/0, WebRTC8/0, RTSP6/0, LAB core PASS,
source health6/0, diff-check PASS, listener0을 확인했습니다.

Current graph는 production208/C++101, application41/C++17, edge17, 위반2, SCC0, transport→analysis1,
transport→core-media4입니다. Graph SHA는
`7b589b4df78580e71edbf7e49a5d5953e454a475c50c98a5e1a33db23ebd1f8c`, policy SHA는
`808cf2395f6d8f8871bc33ae1691d3ed615a5907b23a782bbcacfedd80a315d2`입니다.

Slice 30A의 PASS는 64번 전체 완료, 65번 acceptance, exact 424 UI, 장시간, field 또는 release PASS를 의미하지
않습니다. 당시 남아 있던 Attach/Detach, tap create, provider open lifecycle은 아래 Slice 30B에서 닫았습니다.

## Slice 30B Analysis Session lifecycle application 경계

Standard lifecycle DTO/port와 canonical adapter, data-only legacy application types facade를 추가했습니다.
Transport 호출은 Attach 4, Detach 1, shared helper 15이고 request 4필드, attach result 8필드, detach result
5필드를 explicit mapping합니다. Shared helper는 `removed=true`일 때만 exact 5개 runtime key를 해제하며
RTSP/read/lifecycle/provider는 shared canonical identity를 유지합니다.

첫 build는 hidden value-type completeness 실패 뒤 facade 수정으로 100%가 됐습니다. Focused verifier 최초
anchor/transitive adapter blocker도 수정한 뒤 6/0입니다. Analysis181/0, SSE5/0, side-channel5/0, WS9/0,
WebRTC8/0, RTSP6/0, Ops lifecycle PASS, LAB core PASS, structure15/0, cleanup, diff-check PASS와 listener0을 확인했습니다.

Current graph는 production212/C++102, application45/C++18, edge16, 위반1, SCC0, transport→analysis0,
transport→core-media4입니다. Graph SHA는
`dc68a9bacd49888a89f5689eff85fff8a48a3244596a2aafbd765a3e812017e9`, policy SHA는
`808cf2395f6d8f8871bc33ae1691d3ed615a5907b23a782bbcacfedd80a315d2`입니다. Slice 30B의 PASS는
64번 전체 완료나 65번 acceptance PASS가 아닙니다. Core-media 방향 4건이 남아 64번은 진행 중이고
65번은 미착수입니다.

## Slice 32 WebRTC media application 경계

표준 라이브러리 타입만 노출하는 deep DTO와 opaque egress/source session port, canonical adapter를 추가했습니다.
Transport가 직접 결속하던 SessionManager, WebRTC egress/source session, source registry 네 core-media witness를
application service 뒤로 이동해 transport→core-media는 4건에서 0건이 됐습니다. Application→core-media 4건은
canonical adapter의 허용된 결속으로 남습니다.

Focused verifier 8/8, predecessor 6종 40/40, structure 15/15, source bundle 6/6, physical split 6/6,
build 100%, analysis-state 181/181을 확인했습니다. 최종 semantic review의 verifier false-PASS P1 1건은
exact output/input mapping과 paired-swap·descriptor omission RED로 수정했습니다. Current graph는 production 215/C++ 103,
위반 0, SCC 0이며 graph SHA는
`215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a`입니다.

Runtime은 승인된 sandbox 밖 auth-off throwaway 서버에서 ICE 8/8, codec 67/67(외부 3건 제외), SSE 5/5,
side-channel 5/5, WS 9/9, WebRTC metadata 8/8, RTSP overlay policy 6/6, Ops lifecycle/source health와
LAB core를 통과했습니다. 최초 sandbox 격리 FAIL, auth-on 401, auth-off codec empty-array nounset FAIL은 각각
정확한 auth-off 명령과 Bash 3.2-safe optional argument 수정 뒤 재검증했습니다. 임시 파일 30개/32,763바이트를
삭제했고 8081/8555 listener는 0입니다. Slice 32와 REVIEW4-64 구조 개발은 완료됐지만 parked evidence를 확정하는
REVIEW4-65 독립 acceptance PASS는 아닙니다.

## REVIEW4-65 current HEAD 독립 acceptance correction

Source `911446e802a5eb984843d929238715563722261a`의 canonical run
`v390-test-acceptance-20260717153927-36826`은 historical actual feature gate 35/35와 real 30분
runner 2,360.544초/delegated 2,358초, 118 PASS/0 FAIL/2 제외를 통과했습니다. UI environment도
정상 bootstrap/cleanup됐지만 exact manifest의 implementation source binding drift가 browser 실행 전에 발생해
0/424 FAIL했고, Policy v4·120분·final integrity는 not-run입니다. 기존 UI runner가 이 pre-execution 예외에
summary를 쓰지 않아 root cleanup은 child summary missing으로 FAIL했습니다.

Official generator 전후 구조 비교는 canonical/native binding 및 derived digest만 변경했고, exact 424의 ordered
ID·route·role·viewport·theme·control action·workflow·completion oracle·cleanup non-hash drift는 0입니다.
Current acceptance는 `verify-v390-ui-native-exact-cases-contract`를 longrun 전 unique gate로 추가한 36개 feature
gate를 사용합니다. Runner는 manifest validation 실패도 0/424·browser false·Policy not-run·resource 미획득으로
구조화하며, acceptance는 summary 누락을 계속 FAIL 처리하고 resource 미획득일 때만 acceptance-owned PID/port/temp
cleanup 실측 PASS로 child cleanup을 대체합니다. 이 correction에서는 실제 acceptance/30분/UI/Policy/120분을
재실행하지 않습니다. Fresh semantic candidate `9d8ba38065bb169d2c7ac0b163106d565d95404b95732958f47ca447f2f99548`는
981행 strict-equivalent와 `UI-018`, `SAFE-202`, `SAFE-212`, `OPS-169`, `OPS-179` 다섯 independent-review
행으로 분리됐고 approval coverage 986/986을 확인했습니다. Semantic manifest 적용 후 official generator를
재실행한 최종 canonical/native fixture SHA는 `0aecda8305a02954b574adfb7453c4034cb8afcb2c4fb2ac8c18ec0b3dd630bc`와
`764138aa45842eb7fe425efb582a11825c115aad81b7d98b2e44e8ebb8621aa3`이며 non-hash drift는 여전히 0입니다.

Clean commit `edc89771`의 세 번째 canonical run은 build/34 feature gate와 real 30분 1,800초
118 PASS/0 FAIL을 통과한 뒤 published `v3.8.0` seed와 current-only helper 정책 충돌로 UI bootstrap에서
fail-stop했습니다. Exact 424, Policy v4, 120분, final integrity는 실행되지 않았고 이 30분 결과만으로
acceptance PASS를 주장하지 않습니다.

Helper 기본 current strict 정책은 유지하고 acceptance/one-shot만 `config/docs_ui_assets.json`에 결속된
`--published-seed-baseline`을 사용하도록 수정했습니다. 이어진 current-HEAD 사전 검증에서 canonical
`/client/api/views/{id}/events`와 observed `/client/events`를 혼용하던 8개 client-events UI 증적을 분리했습니다.
Canonical route와 control projection은 API 경로를 유지하고 `uiEvidence.screenRoute`와 native observed route만
`/client/events`로 맞췄습니다. Coverage contract 12/12, native exact 15/15, current evidence 7/7,
Policy producer 8/8, independence 10/10, eligibility 7/7, visual 6/6, acceptance contract 13/13,
fixture cleanup 11/11, feature evidence 986행 validation/global error 0을 확인했습니다.

Correction commit `c8dc5340`의 다음 canonical run은 build/34 feature gate와 real 30분 1,800초
118 PASS/0 FAIL을 다시 통과하고 published seed 정책 오류도 넘었지만, UI server ownership 확인에서
정상 `lsof -t` 출력의 trailing 빈 줄을 PID `0`으로 변환해 `http=5200,0`, `rtsp=5200,0`으로 판정하면서
8회 bounded retry 뒤 fail-stop했습니다. Exact 424 이후 단계는 not-run이고 UI/root cleanup은 PASS입니다.
Listener parser는 trim 뒤 빈 줄을 먼저 제거하고 양의 정수 PID만 dedupe하도록 수정했으며 trailing newline,
duplicate, zero, invalid, blank 입력 contract를 추가해 acceptance contract 13/13을 통과했습니다.

Correction candidate `bd9b9834d0d8f75b34e2285dc555d2ede97dc5c75833ec9dbe036d97dd75f021`는
독립 reviewer가 986행 전부 재계산해 승인 986, 거절·불확실·오류 0으로 판정했습니다. 이전 후보의 985행은
불변이고 `OPS-179`만 readback 위치 이동으로 갱신됐으며 required outcome과 5-edge는 유지됩니다. 새 approval
ledger와 implementation manifest 적용은 완료했지만 actual acceptance 판정은 correction commit 뒤 clean HEAD
canonical 전체 재실행 결과만 사용합니다. 최초 exact binding 갱신은 implementation manifest 적용보다 먼저
수행해 4건 stale FAIL이었고, 적용 후 canonical/exact/current SHA를 순서대로 다시 결속해 exact 15/15와
current evidence 7/7을 통과했습니다.

Clean correction commit `17393ef5`의 canonical run `v390-test-acceptance-20260716104906-28392`는 build/34
feature gate, real 30분 runner 2,374.022초·delegated 2,372초, ordered soak 22회/110 cases와 전체
118 PASS/0 FAIL, cleanup을 통과했습니다. UI bootstrap/listener도 통과한 뒤 exact 첫 case `UI-001`에서
canonical `/` 요청의 실제 setup-complete anonymous browser location `/login`을 observed `/`로 기대해
fail-stop했습니다. Exact 나머지 423건·Policy v4·120분·final integrity는 not-run입니다. 제품 redirect는
정상이며 root canonical request `/`와 runtime screen `/login`을 typed projection으로 분리해 contract에
고정했습니다. 수정 commit 뒤 clean HEAD canonical 전체를 다시 실행합니다.

Correction candidate `743da5ac892a45ea47e1bdd602c1a839c7c5bf7ee459fbb23a8a9549c24faa87`의
독립 검토는 승인 986/거절 0/불확실 0입니다. 이전 후보 대비 `UI-018` 한 행만 exact verifier 위치 이동으로
갱신됐고 404 oracle·required outcome·5-edge는 유지됩니다. Coverage는 최초 UI-001 canonical/observed 혼용으로
11/12 FAIL한 뒤 canonical `/`와 observed `/login`을 별도 assertion으로 분리해 12/12 PASS했습니다.

이 correction 검증도 actual exact 424 browser 실행이나 120분 PASS가 아닙니다. 수정 commit 뒤 source tree가
clean인 current HEAD에서 canonical bundle 전체를 처음부터 다시 실행해야 REVIEW4-65 완료를 판정합니다.

## REVIEW4-62/65 무옵션 실행 인터페이스 correction

사용자 진입점은 repository root의 `./test_server_30min.sh`, `./test_server_120min.sh`, `./test_ui.sh`,
`./test_release.sh` 네 개입니다. 모두 인자를 exit 64로 거부하며 actual 실행 전에
`verify-v390-user-test-launchers-contract`를 통과해야 합니다. `test_release.sh`는 repository canonical output을,
`test_ui.sh`는 repository-local transient `.media_server.test/v3.9.0/ui-acceptance-current`를 사용하며
30분/120분 server launcher만 OS temp output을 자동 생성합니다. Server launcher는 runner-owned ephemeral port를
사용하고 30분/120분만 각각 위임하며, 직접 120분 launcher 실행 자체를 사용자 승인 evidence로 기록합니다.
UI launcher는 exact 424·Policy v4와 필요한 throwaway runtime/cleanup만 선택합니다. Lower-level option은 내부용입니다.

`v390_acceptance_ui_environment.mjs`는 admin/operator/viewer/integrator 비밀번호를 모두 crypto random으로
서로 다르게 생성합니다. 상속된 legacy admin/role-secret env는 provenance child보다 먼저 폐기하고 local env
override도 배제합니다. 실제 값은 argv·파일·summary/report·일반 child env에 넣지 않으며 exact UI child에만
memory-only envelope로 전달합니다. Exact와 throwaway runtime artifact byte scan이 끝난 뒤 envelope와 in-memory
secret 목록을 해제합니다.

`verify_v390_user_test_launchers_contract.mjs`는 네 파일 존재/실행권한/금지 인자 exit 64, exact suite 위임,
runner-owned port, 직접 120분 승인, first-fail/later not-run, UI-only stage, release trigger 없음 `not-required`,
다섯 AGENTS 7.6.2 변경 영역 trigger를 13/13으로 검증했습니다. Acceptance contract 14/14와 longrun contract 9/9도
회귀 통과했습니다. Release launcher는 무조건 `--run-120`을 전달하지 않고 내부 `--auto-run-120`을 사용합니다.
대용량 dirty/untracked 목록은 기존 산출물을 삭제하지 않고 64 MiB git capture buffer로 검증합니다. 실제
build·30분·exact 424·Policy v4·120분 acceptance와 커밋·푸시는 수행하지 않았습니다.

## REVIEW4-65 clean-checkout VA media fixture correction

`video/imports/va_tracking_event_long_1280x720_30fps_h264.mp4`는 re-entry scenario seed의 tracked input입니다.
`.gitignore`는 이 exact path만 exception으로 허용하며 fixture metadata는 7,284,400 bytes와 SHA-256
`24147fb07bb3a1e1f86bb41d2cce6274a6f39eb75671a299a61ca9852f37a122`를 고정합니다.
`prepare_manual_ui_fulltest_seed.mjs`는 integrity metadata가 있는 file source에 대해 실제 bytes와 SHA-256을 대조하고,
acceptance contract는 missing fixture, size drift, SHA drift를 각각 negative subprocess로 거부합니다. 이 보정은
clean-checkout input 재현성만 닫으며 actual 30분·exact 424·Policy v4·120분 acceptance는 실행하지 않습니다.
