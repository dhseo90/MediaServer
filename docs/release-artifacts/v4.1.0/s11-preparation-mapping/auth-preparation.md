# 인증 선수조건 구현·단기 자체검사

독자: 구현 검토자. 수명: 이번 준비 변경의 증적. 정책은 AGENTS.md, 사전등록은 중앙 테스트 기록의 AUTH-P01~P09가 source-of-truth다. 자체검사와 실제 인증 3종 결과를 구분하며 S11 최종 검증 PASS는 아니다.

## 범위와 현재 상태

공통 auth workflow의 5개 실행별 CSPRNG 값, stdin 기반 curl config/JSON/Python 전달, 명시 자식 환경, 소유 root와 종료 실패 전파를 구현했다. 기존 role/scope/history assertion은 변경하지 않았다. 명시 visual opt-in은 보존하며 이번 비브라우저 실행에서는 환경값 0을 사용한다. S06의 이미 메모리 생성하는 HTTP auth 앞 구형 operator-env 필수 검사만 제거했다.

제품 src/include/API/schema 변경 없음. 실제 인증 3종은 메인 회수 수정 뒤 순차 재검증하여 모두 exit0으로 완료했다(하단 전수 결과). 브라우저·장시간·최종 suite는 미실행이다. 자체검사의 포트/서버 double과 실제 네트워크 결과를 분리한다.

## 변경 파일

- `scripts/internal/recording_auth_preparation.mjs`: CSPRNG, NUL framing→curl stdin config, 환경 allowlist, root identity 정리, loopback ICE/port helper.
- `scripts/internal/recording_auth_preparation.sh`: shell 비밀 변수의 비export, node/python/curl 전달과 소유 UDP 시작.
- `scripts/internal/verify_auth_workflow.sh`: root/trap, 격리 server 환경, 실패 원문 차단, 종료·포트 실패 보존.
- `scripts/internal/verify_v410_recording_timeline.sh`: 기존 HTTP auth의 메모리 생성 경로 재사용.
- `scripts/internal/verify_script_inventory.mjs`: 구형 env 필수 문자열 대신 현행 보안 연결 검사.
- `scripts/internal/recording_auth_preparation.test.mjs`: 최초 15개에서 typed setup/HTTP 상태 보완 후 17개 자체검사.

## 실행과 실패 이력

| 실행 | 명령 | exit / 결과 | 해석 |
| --- | --- | --- | --- |
| 최초 RED | `node --test scripts/internal/recording_auth_preparation.test.mjs` | 1; 0/1; 80.763625ms | P03 실제 json_quote의 비밀 Node argv 전달 boolean이 true. 사전 지정 assertion과 일치 |
| 확대 준비 오류 | `env -i PATH="$PATH" node --test scripts/internal/recording_auth_preparation.test.mjs` | 1; cancelled 1; 173871.106708ms | P04 fixture가 입력/EOF 없는 fd4 pipe를 읽어 대기. 제품 helper 실패나 예상 RED 아님 |
| 준비 수정 후 | 같은 env-i 명령 | 0; 12/0; 528.886625ms | fd4를 의도적 ValueError로 교체; 원문 비노출 검사 |
| 종료/환경 확대 | 같은 env-i 명령 | 0; 15/0; 1557.794333ms | P05/P06 확대. 이후 port double의 argv 위치 오류를 자체 리뷰에서 발견 |
| 최종 현재 | 같은 env-i 명령 | 0; 15/0; 1536.906583ms | double argv 수정, 양포트 정상 대조 추가; 아래 전수 행 |
| shell 문법 | `bash -n scripts/internal/verify_auth_workflow.sh scripts/internal/recording_auth_preparation.sh scripts/internal/verify_v410_recording_timeline.sh` | 0; 출력 없음 | 제품 실행 없음 |
| bootstrap 실제 최초 | `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp MEDIA_SERVER_VERIFY_AUTH_VISUAL=0 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=0 MEDIA_SERVER_VERIFY_AUTH_SCOPE_PICKER=0 bash scripts/internal/verify_auth_workflow.sh bootstrap` | 1 | setup 전 ICE JSON 검사 위치 오류. users/routes 미실행 |
| typed setup 보완 자체검사 | 위 Node env-i 명령 | 0; 16/0; 1440.001375ms | true 지연/false 검사/잘못된 응답 거부 추가 |
| bootstrap 실제 재검증 | 위 bootstrap env-i 명령 | 1 | setup 완료 후 unauth whoami401. 같은 인증 시점 경계 재발로 메인 회수, 뒤 mode 중지 |
| 메인 HTTP 상태 RED | 새 whoami 상태 assertion만 Node 실행 | 1; 0/1; 31.861ms | `Missing expected exception`; 401true/비정상 상태 거부 미구현 |
| 메인 HTTP 상태 GREEN | 위 Node env-i 명령 | 0; 17/0; 2065.953459ms | 200bool 또는401false만 허용; 500/302/401true/잘못된body 거부 |

원출력은 도구 반환에서 아래로 이관했다. 초기 전체 원출력의 파일 직접 capture는 하지 않았으며 비밀 원문을 추정 복원하지 않았다. 최초 RED 핵심은 `비밀 인자가 child argv에 전달됨`, `true !== false`. 준비 오류 원출력은 `Promise resolution is still pending but the event loop has already resolved`, `cancelled 1`이다.

## 최종 자체검사 전수 결과

| 제목 | 테스트내용 | 결과 | 비고 |
| --- | --- | --- | --- |
| AUTH-P03 json_quote | 실제 함수→Node argv 비밀 부재·JSON roundtrip | PASS | 최초 RED 후 수정 |
| AUTH-P01 CSPRNG | 두 실행 각 5개·총 10개 고유·정책 문자 | PASS | 값 출력 없음 |
| AUTH-P02 상속 | xtrace/allexport 진입·helper 자식 credential/PYTHONPATH 부재 | PASS | 임의 host 환경 전체 보장 아님 |
| AUTH-P03 curl 전달 | 실제 helper→curl double argv/config/env | PASS | 실제 HTTP 아님 |
| AUTH-P03 URL/config | 외부 URL·newline·옵션주입 거부, escaping | PASS | @file 의미는 config 문자열 보존 |
| AUTH-P04 JSON | 빈값·따옴표·역슬래시·개행·한글 | PASS | stdin roundtrip |
| AUTH-P04 Python | heredoc argv 의미·의도적 예외 원문 비노출 | PASS | fd4 준비 오류 이력 보존 |
| AUTH-P05 root | 0700/0600·identity 불일치 보존·정상 제거 | PASS | 소유 fixture만 |
| AUTH-P06 allowlist | proxy/provider/credential 제거 | PASS | pure helper |
| AUTH-P07 dispatch | unsupported mode root 생성 전 exit2 | PASS | 기존 세 제품 mode 실행 아님 |
| AUTH-P08 S06 | env 부재, read-model/API/auth/lifecycle 순서 | PASS | child double |
| AUTH-P09 inventory | 실제 검사 함수 현행 허용·구형 env 강제 거부 | PASS | 전체 inventory 실행 아님 |
| AUTH-P05 cleanup 실행 | 실제 함수 exit0/7/130 보존·stop 실패 root 유지 | PASS | 원래 상태와 정리 실패 구분 |
| AUTH-P05 stop 실행 | 자식 exit7 거부·양포트 정상·HTTP/RTSP 실패 | PASS | 포트 double, 소유 PID kill-0 부재 assertion |
| AUTH-P06 server 실행 | 실제 start_server→실행파일 double 환경 관측 | PASS | 제품 서버·소켓 없음 |
| AUTH-P06 setup 상태 | 실제 shell 함수 true 지연·false config·잘못된 typed 상태 거부 | PASS | HTTP401 실제 정책은 이 double이 검사하지 않음 |
| AUTH-P06 whoami HTTP | 200 boolean/401 false 허용·500/302/401 true/잘못된body 거부 | PASS | 메인 RED→GREEN; 실제 상태와 body 결합 |

## 정리와 한계

각 `media-server-auth-unit-*`는 test가 mkdtemp로 생성하고 finally rmSync 후 부재를 확인했다. cleanup 거부 fixture의 보존 root도 상위 test 소유 root 정리에서 제거했다. 크기는 test가 직계 lstat 합으로 기록하며 재귀 총량으로 주장하지 않는다.

| 경로(`/tmp/` 아래) | 종류 | 삭제 전 직계 bytes | 조치/결과 |
| --- | --- | --- | --- |
| media-server-auth-unit-cwGHPj | 준비 오류 실행 curl double | 159 | 제거·부재 |
| media-server-auth-unit-CymDLn | 12개 실행 double | 159 | 제거·부재 |
| media-server-auth-unit-yy4AQY | 12개 실행 root fixture | 0 | 제거·부재 |
| media-server-auth-unit-EbVHrO | 최초 15개 double | 159 | 제거·부재 |
| media-server-auth-unit-bYD1dz | 최초 15개 root fixture | 0 | 제거·부재 |
| media-server-auth-unit-4ehUVq | 최초 15개 cleanup fixture | 64 | 제거·부재 |
| media-server-auth-unit-mkd101 | 최초 15개 port double | 68 | 제거·부재 |
| media-server-auth-unit-q9r45T | 최초 15개 server double | 573 | 제거·부재 |
| media-server-auth-unit-l6j5k0 | 최종 curl double | 159 | 제거·부재 |
| media-server-auth-unit-p8XeyD | 최종 root fixture | 0 | 제거·부재 |
| media-server-auth-unit-G9Mmbl | 최종 cleanup fixture | 64 | 제거·부재 |
| media-server-auth-unit-aXW0CE | 최종 port double | 68 | 제거·부재 |
| media-server-auth-unit-FQv4kE | 최종 server double | 573 | 제거·부재 |
| media-server-auth-bootstrap.fm2tsc (`/private/tmp`) | 최초 실제 bootstrap root | 2076KiB(재귀 du) | 정상 종료·HTTP/RTSP 확인 후 제거·부재 |
| media-server-auth-unit-MhCEvD | 16개 curl double | 159 | 제거·부재 |
| media-server-auth-unit-T2RWsB | 16개 root fixture | 0 | 제거·부재 |
| media-server-auth-unit-orAHAJ | 16개 cleanup fixture | 64 | 제거·부재 |
| media-server-auth-unit-TNKRZ0 | 16개 port double | 68 | 제거·부재 |
| media-server-auth-unit-HhX52g | 16개 server double | 573 | 제거·부재 |
| media-server-auth-bootstrap.D8zdQr (`/private/tmp`) | 재실행 bootstrap root | 2080KiB(재귀 du) | 정상 종료·HTTP/RTSP 확인 후 제거·부재 |
| media-server-auth-unit-lzfMly | 메인 17개 curl double | 159 | 메인 제거·부재 확인 |
| media-server-auth-unit-sWRZ8Y | 메인 17개 root fixture | 0 | 메인 제거·부재 확인 |
| media-server-auth-unit-D2iEba | 메인 17개 cleanup fixture | 64 | 메인 제거·부재 확인 |
| media-server-auth-unit-YQ4UaX | 메인 17개 port double | 68 | 메인 제거·부재 확인 |
| media-server-auth-unit-IUwE2C | 메인 17개 server double | 573 | 메인 제거·부재 확인 |

실제 실패 원출력: [최초](auth-bootstrap.log), [재실행](auth-bootstrap-retry.log). 첫 실패는 runtime.cpp995의 setup 전체 GET redirect와 충돌한 config JSON 파싱이었다. 메인 승인으로 typed whoami 상태 확인 후 setup 완료로 시점을 이동했으나, runtime.cpp1180의 unauth whoami401을 `curl -f`가 거부했다. 두 번째는 config 요청 전 실패다. 같은 인증 준비 경계 재발로 중지·메인 회수했다. 메인은 정상401 JSON과 공개 config route를 구분하여 `-sS -w`로 HTTP 상태와 body를 함께 엄격 검사하도록 수정했고 17개 자체검사 후 실제 순차 실행을 다시 승인했다. 제품 auth 정책이나 ICE 검사는 완화하지 않았다.

준비 오류 exec 세션 종료 뒤 필터한 프로세스 조회에서 해당 Node/Python 후보는 없었다. 최초 실행은 자식 exact PID 미수집으로 exact PID 정리 대조가 불가능하다. 조회용 shell/rg만 출력됐으며 credential 출력은 없었다. 이후 stop fixture는 소유 PID를 변수로 유지하여 wait 및 kill-0 부재를 검사한다. 운영 프로세스 종료나 광역 삭제는 하지 않았다.

token start/end/consumed: 미집계(이 하위 작업의 신뢰 가능한 전용 사용량 계측 없음). elapsed는 위 Node runner 실제값, source는 실행 도구 반환이다. 실제 auth 전체 wall elapsed는 별도 계측하지 않았으며 추정하지 않는다. 커밋/푸시는 미수행이며 메인 전담이다.

## 실제 인증 3종 최종 결과

동일 명령 prefix: `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp MEDIA_SERVER_VERIFY_AUTH_VISUAL=0 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=0 MEDIA_SERVER_VERIFY_AUTH_SCOPE_PICKER=0 bash scripts/internal/verify_auth_workflow.sh` 뒤에 각 mode를 지정했다. stdout/stderr를 아래 로그로 직접 capture했다. raw 서버 로그·응답·cookie·임시 비밀번호는 이관하지 않았다.

| mode | exit / summary | 원출력 PASS 행 | 원출력 |
| --- | --- | --- | --- |
| bootstrap | 0 / 19·0 | 19 | [로그](auth-bootstrap-final.log) |
| users | 0 / 72·0 | 72 | [로그](auth-users.log) |
| routes | 0 / 146·0 | 148 | [로그](auth-routes.log) |

총 summary237개, 실제 PASS239행이다. 차이2행은 기존 workflow413/451의 Python SourceRegistry/PublishedView field/type freeze 출력이며 shell pass_count를 증가시키지 않는다. 오류나 누락으로 숨기지 않고 아래239행에 포함한다. 초기 bootstrap 재실행의11개 PASS와 최종239개는 중복 집계하지 않는다. 최초 실패 로그의 고정 error행2/3은 독립 assertion 수가 아니라 같은 실패의 전달 단계다.

| 경로 | 종류 | 삭제 전 크기 | 조치/결과 |
| --- | --- | --- | --- |
| /private/tmp/media-server-auth-bootstrap.rP0Or4 | 실제 bootstrap 소유 root | 2084KiB | 정리·부재 |
| /private/tmp/media-server-auth-users.ftKnTc | 실제 users 소유 root | 2120KiB | 정리·부재 |
| /private/tmp/media-server-auth-routes.m1HBLV | 실제 routes 소유 root | 13812KiB | 정리·부재 |

각 mode cleanup은 server wait exit0, HTTP/RTSP 반환 확인, 소유 UDP SIGTERM handler 종료 wait0 뒤 root identity 확인/삭제를 수행했다. 세 mode 모두 cleanup 성공 출력과 exit0이다. 명시 visual3값0이므로 실제 브라우저 실행은 없다. 이 결과는 auth 준비1단위이며 S11 현행 통합2번·장시간·최종suite 완료가 아니다.

| 제목 | 테스트내용(실제 원출력) | 결과 |
| --- | --- | --- |
| bootstrap-1 | server health ok (http://127.0.0.1:8091) | PASS |
| bootstrap-2 | missing users root redirect: 302:/setup | PASS |
| bootstrap-3 | setup auth shell selectors | PASS |
| bootstrap-4 | server health ok (http://127.0.0.1:8091) | PASS |
| bootstrap-5 | existing users file with hashless admin redirects to setup: 302:/setup | PASS |
| bootstrap-6 | hashless admin login blocked by setup gate: 403 | PASS |
| bootstrap-7 | server health ok (http://127.0.0.1:8091) | PASS |
| bootstrap-8 | weak admin password rejected: 400 | PASS |
| bootstrap-9 | initial admin password setup: 302 | PASS |
| bootstrap-10 | auth users file owner-only mode: 600 | PASS |
| bootstrap-11 | setup blocked after completion: 302:/login | PASS |
| bootstrap-12 | unauthenticated root redirect: 302:/login | PASS |
| bootstrap-13 | login auth shell selectors | PASS |
| bootstrap-14 | client access request auth shell selectors | PASS |
| bootstrap-15 | passwordless admin login rejected: 401 | PASS |
| bootstrap-16 | admin login landing: 302:/ops/home | PASS |
| bootstrap-17 | admin whoami username and role | PASS |
| bootstrap-18 | logout redirects to login landing: 302:/login | PASS |
| bootstrap-19 | logout invalidates session: 401 | PASS |
| users-1 | server health ok (http://127.0.0.1:8091) | PASS |
| users-2 | weak admin password rejected: 400 | PASS |
| users-3 | initial admin password setup: 302 | PASS |
| users-4 | auth users file owner-only mode: 600 | PASS |
| users-5 | setup blocked after completion: 302:/login | PASS |
| users-6 | admin login landing: 302:/ops/home | PASS |
| users-7 | admin whoami username and role | PASS |
| users-8 | ops users access request selectors | PASS |
| users-9 | permissive auth users file re-hardened: 600 | PASS |
| users-10 | viewer view scope assigned | PASS |
| users-11 | viewer privileged scopes blocked | PASS |
| users-12 | user API hash redaction | PASS |
| users-13 | viewer custom privileged scope rejected: 400 | PASS |
| users-14 | integrator live view scope rejected: 400 | PASS |
| users-15 | viewer login: 302 | PASS |
| users-16 | viewer ops forbidden: 403 | PASS |
| users-17 | admin reset password: 200 | PASS |
| users-18 | admin reset revokes existing viewer session: 401 | PASS |
| users-19 | admin reset forces next-login password change | PASS |
| users-20 | mustChangePassword landing: 302:/password/change | PASS |
| users-21 | password change auth shell selectors | PASS |
| users-22 | password change to temporary password succeeds: 302 | PASS |
| users-23 | temporary password login succeeds: 302 | PASS |
| users-24 | password_history original password immediate history reuse rejected: 400 | PASS |
| users-25 | password history count rotation succeeds: 302 | PASS |
| users-26 | history rotation password login succeeds: 302 | PASS |
| users-27 | original password restored after history count rotation: 302 | PASS |
| users-28 | SaveUsersFile-backed password change lifecycle final login succeeds: 302 | PASS |
| users-29 | admin disables viewer: 200 | PASS |
| users-30 | disabled user login rejected: 401 | PASS |
| users-31 | admin restores viewer: 200 | PASS |
| users-32 | restored viewer login succeeds: 302 | PASS |
| users-33 | last active admin disable rejected: 409 | PASS |
| users-34 | last active admin role downgrade rejected: 409 | PASS |
| users-35 | login lockout stored | PASS |
| users-36 | invite token issued once | PASS |
| users-37 | invite expiry and setup URL visible once | PASS |
| users-38 | invite list API exposes issued invite summary | PASS |
| users-39 | invite list API redacts token material | PASS |
| users-40 | users-only save after pending invite: 200 | PASS |
| users-41 | pending invite preserved across users save | PASS |
| users-42 | invite setup HTTP response renders required form | PASS |
| users-43 | invite setup auth shell selectors | PASS |
| users-44 | invite password setup: 302 | PASS |
| users-45 | invited viewer login: 302 | PASS |
| users-46 | invite.used consumed/expired token runtime status split: 401:410 | PASS |
| users-47 | existing invite target baseline login: 302 | PASS |
| users-48 | existing invite baseline scope visible | PASS |
| users-49 | pending invite keeps existing session: 200 | PASS |
| users-50 | pending invite does not change existing role/scope | PASS |
| users-51 | pending invite future scope not applied | PASS |
| users-52 | existing invite accepted: 302 | PASS |
| users-53 | accepted invite revokes previous session: 401 | PASS |
| users-54 | existing invite new password login: 302 | PASS |
| users-55 | accepted invite applies role/scope | PASS |
| users-56 | duplicate pending access request rejected: 409 | PASS |
| users-57 | access request unsafe viewId rejected: 400 | PASS |
| users-58 | oversized access request body rejected: 413 | PASS |
| users-59 | access request rate budget allows fourth counted attempt | PASS |
| users-60 | access request rate budget allows fifth counted attempt: 201 | PASS |
| users-61 | access request per-peer rate limit enforced: 429 | PASS |
| users-62 | ops users access request reject API: 200 | PASS |
| users-63 | rejected access request visible in ops API | PASS |
| users-64 | pending access request form and pending-state copy | PASS |
| users-65 | pending form submission remains denied login before approval: 401 | PASS |
| users-66 | approved request invite expiry visible once | PASS |
| users-67 | approved request keeps user pending until invite setup | PASS |
| users-68 | users-only save after approved request: 200 | PASS |
| users-69 | approved request preserved across users save | PASS |
| users-70 | approved request invite preserved across users save | PASS |
| users-71 | approved request password setup: 302 | PASS |
| users-72 | approved request viewer login: 302 | PASS |
| routes-1 | server health ok (http://127.0.0.1:8091) | PASS |
| routes-2 | setup required root: 302:/setup | PASS |
| routes-3 | weak admin password rejected: 400 | PASS |
| routes-4 | initial admin password setup: 302 | PASS |
| routes-5 | auth users file owner-only mode: 600 | PASS |
| routes-6 | setup blocked after completion: 302:/login | PASS |
| routes-7 | logout root: 302:/login | PASS |
| routes-8 | admin login landing: 302:/ops/home | PASS |
| routes-9 | admin whoami username and role | PASS |
| routes-10 | admin root: 302:/ops/home | PASS |
| routes-11 | SourceRegistry API field/type freeze SHA-256=d6db4f603fbde478e5a4097daa8f5da4ba41e7cbdb42dea26bbda0546380763f | PASS |
| routes-12 | operator login route: 302:/ops/home | PASS |
| routes-13 | AUTH-029 operator with source write scope sees enabled source write UI | PASS |
| routes-14 | readonly operator login route: 302:/ops/home | PASS |
| routes-15 | Set-Cookie session viewer login route: 302:/client/live | PASS |
| routes-16 | integrator login keeps API-only landing: 302:/auth/whoami | PASS |
| routes-17 | viewer ops denied: 403 | PASS |
| routes-18 | viewer VLM install/connection UI denied: 403 | PASS |
| routes-19 | undefined route BuildHttpResponse returns 404: 404 | PASS |
| routes-20 | legacy /lab product UI BuildHttpResponse returns 404: 404 | PASS |
| routes-21 | unauth ops sources API denied: 401 | PASS |
| routes-22 | unauth ops views API denied: 401 | PASS |
| routes-23 | unauth ops runtime API denied: 401 | PASS |
| routes-24 | unauth ops rules catalog API denied: 401 | PASS |
| routes-25 | unauth ops events API denied: 401 | PASS |
| routes-26 | unauth ops ONVIF import draft API denied: 401 | PASS |
| routes-27 | unauth ops ONVIF probe draft API denied: 401 | PASS |
| routes-28 | unauth ops users API denied: 401 | PASS |
| routes-29 | unauth ops invites API denied: 401 | PASS |
| routes-30 | unauth ops access requests API denied: 401 | PASS |
| routes-31 | viewer ops sources API denied: 403 | PASS |
| routes-32 | viewer ops views API denied: 403 | PASS |
| routes-33 | viewer ops runtime API denied: 403 | PASS |
| routes-34 | viewer ops ONVIF import draft API denied: 403 | PASS |
| routes-35 | viewer ops ONVIF probe draft API denied: 403 | PASS |
| routes-36 | viewer ops users API denied: 403 | PASS |
| routes-37 | viewer ops invites API denied: 403 | PASS |
| routes-38 | viewer ops access requests API denied: 403 | PASS |
| routes-39 | readonly operator ops read allowed: 200 | PASS |
| routes-40 | ops runtime API read allowed: 200 | PASS |
| routes-41 | ops rules catalog API read allowed: 200 | PASS |
| routes-42 | ops events status API read allowed: 200 | PASS |
| routes-43 | AUTH-028 readonly operator sees ops sources UI with source write lock policy | PASS |
| routes-44 | readonly operator admin users API denied: 403 | PASS |
| routes-45 | readonly operator invite API denied: 403 | PASS |
| routes-46 | readonly operator invite list API denied: 403 | PASS |
| routes-47 | readonly operator access requests API denied: 403 | PASS |
| routes-48 | source write scope required for view create: 403 | PASS |
| routes-49 | source write scope required for ONVIF import draft: 403 | PASS |
| routes-50 | source write scope required for ONVIF probe draft: 403 | PASS |
| routes-51 | source write scope required for view update: 403 | PASS |
| routes-52 | source write scope required for source update: 403 | PASS |
| routes-53 | rule write scope required for lab rule write: 403 | PASS |
| routes-54 | rule write scope required for lab vaRule write: 403 | PASS |
| routes-55 | rule write scope required for lab profile write: 403 | PASS |
| routes-56 | unauth VLM profile API denied: 401 | PASS |
| routes-57 | viewer VLM profile API denied: 403 | PASS |
| routes-58 | readonly operator VLM profile read allowed: 200 | PASS |
| routes-59 | rule write scope required for VLM profile write: 403 | PASS |
| routes-60 | invalid VLM profile fixture rejected: 400 | PASS |
| routes-61 | VLM profile write creates storage document | PASS |
| routes-62 | VLM profile read lists stored profile with canonical evaluation status | PASS |
| routes-63 | VLM profile delete allowed for admin: 200 | PASS |
| routes-64 | VLM profile delete readback confirms vlm-route-smoke absence | PASS |
| routes-65 | AUTH-029 operator source write scope creates source | PASS |
| routes-66 | AUTH-029 operator rule write scope saves profile: 200 | PASS |
| routes-67 | ONVIF import draft API allowed for source writer | PASS |
| routes-68 | ONVIF import draft redacts credential reference and endpoint | PASS |
| routes-69 | ONVIF probe draft API allowed for source writer | PASS |
| routes-70 | ONVIF probe draft redacts credential reference and endpoint | PASS |
| routes-71 | WHEP source registry create allowed | PASS |
| routes-72 | WHEP source canonical duplicate denied: 409 | PASS |
| routes-73 | WHEP source visible to ops API | PASS |
| routes-74 | integrator client shell denied: 403 | PASS |
| routes-75 | unauth client views API denied: 401 | PASS |
| routes-76 | unauth client live layout preference API denied: 401 | PASS |
| routes-77 | unauth client dashboard API denied: 401 | PASS |
| routes-78 | unauth client WebRTC wrapper denied: 401 | PASS |
| routes-79 | public access request API remains unauthenticated: 201 | PASS |
| routes-80 | Client PublishedView projection field/type freeze SHA-256=f289c7a2e21e47ca7439ecdf12949cc106c9aa2b6e1b80eeaab4327980bc6d62 | PASS |
| routes-81 | viewer assigned view visible in client API | PASS |
| routes-82 | SRC-022 viewer client API keeps PublishedView allowedRuleIds list | PASS |
| routes-83 | SRC-022 viewer client API omits unassigned vaRule from allowedRuleIds | PASS |
| routes-84 | SRC-022 viewer client detail API keeps PublishedView allowedRuleIds list | PASS |
| routes-85 | viewer unassigned view hidden from client API | PASS |
| routes-86 | viewer client live layout preference separates user and role presets | PASS |
| routes-87 | viewer client live layout preference save allowed: 200 | PASS |
| routes-88 | viewer client live layout preference rejects source URL material: 400 | PASS |
| routes-89 | viewer cross-view dashboard denied: 403 | PASS |
| routes-90 | viewer cross-view WebRTC wrapper denied: 403 | PASS |
| routes-91 | integrator client views list omits live views | PASS |
| routes-92 | integrator event scope allowed: 200 | PASS |
| routes-93 | unauth scoped event search denied: 401 | PASS |
| routes-94 | viewer scoped event search role denied: 403 | PASS |
| routes-95 | integrator scoped event search allowed: 200 | PASS |
| routes-96 | integrator scoped event search cross-view denied: 403 | PASS |
| routes-97 | integrator metadata scope allowed: 200 | PASS |
| routes-98 | integrator dashboard scope denied: 403 | PASS |
| routes-99 | unauth generic WebRTC denied: 401 | PASS |
| routes-100 | viewer generic WebRTC denied: 403 | PASS |
| routes-101 | unauth WHEP denied: 401 | PASS |
| routes-102 | viewer WHEP denied: 403 | PASS |
| routes-103 | unauth WHIP publish denied: 401 | PASS |
| routes-104 | viewer WHIP publish denied: 403 | PASS |
| routes-105 | unauth metadata websocket denied: 401 | PASS |
| routes-106 | viewer metadata websocket denied: 403 | PASS |
| routes-107 | plain request omits CORS allow origin:  | PASS |
| routes-108 | cross-origin actual request denied: 403 | PASS |
| routes-109 | cross-origin response omits CORS allow origin:  | PASS |
| routes-110 | same-origin actual reflects origin: http://127.0.0.1:8091 | PASS |
| routes-111 | cross-origin preflight denied: 403 | PASS |
| routes-112 | same-origin preflight allowed: 204 | PASS |
| routes-113 | same-origin preflight reflects origin: http://127.0.0.1:8091 | PASS |
| routes-114 | invalid content-length rejected: 400 | PASS |
| routes-115 | server survives invalid content-length: 200 | PASS |
| routes-116 | oversized content-length rejected: 413 | PASS |
| routes-117 | server survives oversized content-length: 200 | PASS |
| routes-118 | WebRTC session id uses random token shape | PASS |
| routes-119 | WebRTC session capability issued | PASS |
| routes-120 | unauth session follow-up denied: 401 | PASS |
| routes-121 | viewer session follow-up denied: 403 | PASS |
| routes-122 | session capability follow-up allowed: 200 | PASS |
| routes-123 | session capability delete allowed: 200 | PASS |
| routes-124 | client WebRTC wrapper returns client session alias | PASS |
| routes-125 | client WebRTC wrapper hides internal signaling detail | PASS |
| routes-126 | client PublishedView maxTiles enforced: 409 | PASS |
| routes-127 | client WebRTC wrapper source override denied: 400 | PASS |
| routes-128 | client alias rejected on generic session route: 404 | PASS |
| routes-129 | client wrapper ICE allowed: 200 | PASS |
| routes-130 | client wrapper delete allowed: 200 | PASS |
| routes-131 | client vaRule matching PublishedView source allowed | PASS |
| routes-132 | client vaRule wrapper delete allowed: 200 | PASS |
| routes-133 | client vaRule source mismatch denied: 400 | PASS |
| routes-134 | server health ok (http://127.0.0.1:8091) | PASS |
| routes-135 | admin login landing: 302:/ops/home | PASS |
| routes-136 | admin whoami username and role | PASS |
| routes-137 | malformed source registry fail closed: 500 | PASS |
| routes-138 | malformed source registry not overwritten | PASS |
| routes-139 | server health ok (http://127.0.0.1:8091) | PASS |
| routes-140 | admin login landing: 302:/ops/home | PASS |
| routes-141 | admin whoami username and role | PASS |
| routes-142 | malformed published view registry fail closed: 500 | PASS |
| routes-143 | malformed published view registry not overwritten | PASS |
| routes-144 | server health ok (http://127.0.0.1:8091) | PASS |
| routes-145 | token mode unauthenticated request denied: 401 | PASS |
| routes-146 | server health ok (http://127.0.0.1:8091) | PASS |
| routes-147 | auth off root redirects to ops: 302:/ops/home | PASS |
| routes-148 | auth off development admin accesses users API: 200 | PASS |

## 메인 별도 gate

| 제목 | 테스트내용 | 결과 |
| --- | --- | --- |
| script dispatch parser | 메인 실제 실행 개별 항목 | PASS |
| script dispatch target | 메인 실제 실행 개별 항목 | PASS |
| script docs commands | 메인 실제 실행 개별 항목 | PASS |
| script tracked classified | 메인 실제 실행 개별 항목 | PASS |
| script project delegation | 메인 실제 실행 개별 항목 | PASS |
| script families | 메인 실제 실행 개별 항목 | PASS |
| script CMake | 메인 실제 실행 개별 항목 | PASS |
| script test_all | 메인 실제 실행 개별 항목 | PASS |
| script auth bootstrap | 메인 실제 실행 개별 항목 | PASS |
| script EventRecord dispatch | 메인 실제 실행 개별 항목 | PASS |
| script critical wording | 메인 실제 실행 개별 항목 | PASS |
| script option parser | 메인 실제 실행 개별 항목 | PASS |
| assets README representative screenshots | 메인 실제 실행 개별 항목 | PASS |
| assets English README English UI | 메인 실제 실행 개별 항목 | PASS |
| assets UI guide shared asset set | 메인 실제 실행 개별 항목 | PASS |
| assets capture policy | 메인 실제 실행 개별 항목 | PASS |
| assets manifest complete | 메인 실제 실행 개별 항목 | PASS |
| assets capture script ownership | 메인 실제 실행 개별 항목 | PASS |
| assets current screenshot coverage | 메인 실제 실행 개별 항목 | PASS |
| assets no stale visual baseline | 메인 실제 실행 개별 항목 | PASS |
| assets managed PNG directory | 메인 실제 실행 개별 항목 | PASS |
| assets full VA video frame | 메인 실제 실행 개별 항목 | PASS |

제품 auth와 별도인 메인 실행 결과다. scripts inventory 12/0 exit0: dispatch parser, dispatch target, docs commands, tracked classified, project delegation, families, CMake, test_all, auth bootstrap, EventRecord dispatch, critical wording, option parser. docs assets10/0 exit0. docs links 최초1165FAIL은 기존2매핑문서 절대경로+행 링크의 준비 오류이며 메인 기계변환 후 exit0(md269/local8080/images22/anchors110/index76/exclusions184/fail0), 이력은 같은 디렉터리 README에 보존됐다. diffcheck exit0. 이 gate들로 실제 UI/장시간 PASS를 주장하지 않는다.
