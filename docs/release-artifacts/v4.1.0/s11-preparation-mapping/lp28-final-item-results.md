# LP28 S11 단기 검증 개별 결과

독자: 개발·릴리즈 검토 담당자. 수명: v4.1.0 단기 실행 이력. 중앙 source-of-truth는 release-test-records.md, 정책은 AGENTS.md다.
이 문서는 실제 UI·30분·120분·릴리즈 결과가 아니다. 정의/선택은 [실행 manifest](lp27-release-preparation.md#최종-실행-manifest), 해석과 실패 이력은 [LP28](lp28-locator-closure.md#s11-최종-단기-실행)을 따른다.

## 명령·원출력

모든 로그는 무손실 gzip이며 각 원본 SHA·압축 SHA·명령·UTC·elapsed·exit는 [구조화 전수](lp28-final-short-summary.json)에 있다. 토큰 시작/종료/소비는 전용 집계 부재로 미집계다. gzip 해제 후 로그 행 번호를 따른다.

| 실행 | 명령 | exit | elapsed(ms) | 원본/보존(B) | 원출력 |
| --- | --- | --- | --- | --- | --- |
| final-assets-01.log | ./server.sh verify-docs-ui-assets | 0 | 57 | 1027/603 | [전체 로그](lp28-final-assets-01.log.gz) |
| final-auth-bootstrap-01.log | env MEDIA_SERVER_VERIFY_AUTH_VISUAL=0 ./server.sh verify-auth-bootstrap | 0 | 6905 | 1873/896 | [전체 로그](lp28-final-auth-bootstrap-01.log.gz) |
| final-auth-routes-01.log | env MEDIA_SERVER_VERIFY_AUTH_VISUAL=0 ./server.sh verify-auth-routes | 0 | 18001 | 8657/2402 | [전체 로그](lp28-final-auth-routes-01.log.gz) |
| final-auth-users-01.log | env MEDIA_SERVER_VERIFY_AUTH_VISUAL=0 ./server.sh verify-auth-users | 0 | 9868 | 4229/1650 | [전체 로그](lp28-final-auth-users-01.log.gz) |
| final-build-01.log | env MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_ENABLE_AI=1 MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 MEDIA_SERVER_BUILD_DIR=/Users/dhseo/Workspace/mediaServer/build-gst-onnx MEDIA_SERVER_GST_CACHE_DIR=/private/tmp/media-server-lp28.K2YANY/s11-build-cache ./server.sh build | 0 | 850 | 1054/613 | [전체 로그](lp28-final-build-01.log.gz) |
| final-closeout-01.log | ./server.sh verify-release-closeout-helper --dry-run | 1 | 104 | 1002/612 | [전체 로그](lp28-final-closeout-01.log.gz) |
| final-closeout-02.log | ./server.sh verify-release-closeout-helper --dry-run | 0 | 86 | 935/571 | [전체 로그](lp28-final-closeout-02.log.gz) |
| final-diff-01.log | git diff --check | 0 | 46 | 374/292 | [전체 로그](lp28-final-diff-01.log.gz) |
| final-docs-01.log | ./server.sh verify-docs-links | 0 | 161 | 574/419 | [전체 로그](lp28-final-docs-01.log.gz) |
| final-entry-01.log | ./server.sh verify-v410-entry-baseline | 0 | 92 | 1587/626 | [전체 로그](lp28-final-entry-01.log.gz) |
| final-entry-02.log | ./server.sh verify-v410-entry-baseline | 0 | 107 | 1588/625 | [전체 로그](lp28-final-entry-02.log.gz) |
| final-env-fixture-01.log | bash scripts/internal/verify_gst_environment.sh | 0 | 4386 | 5656/1075 | [전체 로그](lp28-final-env-fixture-01.log.gz) |
| final-metadata-01.log | ./server.sh verify-release-metadata | 0 | 76 | 1741/787 | [전체 로그](lp28-final-metadata-01.log.gz) |
| final-metadata-02.log | ./server.sh verify-release-metadata | 0 | 78 | 1741/787 | [전체 로그](lp28-final-metadata-02.log.gz) |
| final-recording-01.log | bash scripts/internal/verify_v410_recording_foundation.sh --current-integration | 0 | 125422 | 621780/41583 | [전체 로그](lp28-final-recording-01.log.gz) |

## 개별 판정 전수

원출력의 판정/단위검사 546행을 전수 보존한다. 보조 검사·재검증 중복을 포함하므로 제품 기능 수로 합산하지 않는다. 인증 요약19/72/146과 routes 출력148행, 녹화 stage156과 seed/보조 출력행을 구분한다.

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| README uses only representative product UI screenshots | final-assets-01.log · 원출력 2행 | PASS | 실제 출력 판정 |
| English README uses English UI screenshots | final-assets-01.log · 원출력 3행 | PASS | 실제 출력 판정 |
| UI guide keeps product screenshots in the shared asset set | final-assets-01.log · 원출력 4행 | PASS | 실제 출력 판정 |
| docs UI asset policy documents capture rules | final-assets-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| managed UI asset manifest stays complete | final-assets-01.log · 원출력 6행 | PASS | 실제 출력 판정 |
| capture script owns every documented UI asset | final-assets-01.log · 원출력 7행 | PASS | 실제 출력 판정 |
| docs capture covers current screenshots | final-assets-01.log · 원출력 8행 | PASS | 실제 출력 판정 |
| representative screenshot docs do not point at stale visual baselines | final-assets-01.log · 원출력 9행 | PASS | 실제 출력 판정 |
| docs UI asset directory contains managed PNG files | final-assets-01.log · 원출력 10행 | PASS | 실제 출력 판정 |
| VA documentation images keep full video frame bounds | final-assets-01.log · 원출력 11행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-bootstrap-01.log · 원출력 4행 | PASS | 실제 출력 판정 |
| missing users root redirect: 302:/setup | final-auth-bootstrap-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| setup auth shell selectors | final-auth-bootstrap-01.log · 원출력 6행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-bootstrap-01.log · 원출력 9행 | PASS | 실제 출력 판정 |
| existing users file with hashless admin redirects to setup: 302:/setup | final-auth-bootstrap-01.log · 원출력 10행 | PASS | 실제 출력 판정 |
| hashless admin login blocked by setup gate: 403 | final-auth-bootstrap-01.log · 원출력 11행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-bootstrap-01.log · 원출력 14행 | PASS | 실제 출력 판정 |
| weak admin password rejected: 400 | final-auth-bootstrap-01.log · 원출력 15행 | PASS | 실제 출력 판정 |
| initial admin password setup: 302 | final-auth-bootstrap-01.log · 원출력 16행 | PASS | 실제 출력 판정 |
| auth users file owner-only mode: 600 | final-auth-bootstrap-01.log · 원출력 17행 | PASS | 실제 출력 판정 |
| setup blocked after completion: 302:/login | final-auth-bootstrap-01.log · 원출력 18행 | PASS | 실제 출력 판정 |
| unauthenticated root redirect: 302:/login | final-auth-bootstrap-01.log · 원출력 19행 | PASS | 실제 출력 판정 |
| login auth shell selectors | final-auth-bootstrap-01.log · 원출력 20행 | PASS | 실제 출력 판정 |
| client access request auth shell selectors | final-auth-bootstrap-01.log · 원출력 21행 | PASS | 실제 출력 판정 |
| passwordless admin login rejected: 401 | final-auth-bootstrap-01.log · 원출력 22행 | PASS | 실제 출력 판정 |
| admin login landing: 302:/ops/home | final-auth-bootstrap-01.log · 원출력 23행 | PASS | 실제 출력 판정 |
| admin whoami username and role | final-auth-bootstrap-01.log · 원출력 24행 | PASS | 실제 출력 판정 |
| logout redirects to login landing: 302:/login | final-auth-bootstrap-01.log · 원출력 25행 | PASS | 실제 출력 판정 |
| logout invalidates session: 401 | final-auth-bootstrap-01.log · 원출력 26행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-routes-01.log · 원출력 4행 | PASS | 실제 출력 판정 |
| setup required root: 302:/setup | final-auth-routes-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| weak admin password rejected: 400 | final-auth-routes-01.log · 원출력 6행 | PASS | 실제 출력 판정 |
| initial admin password setup: 302 | final-auth-routes-01.log · 원출력 7행 | PASS | 실제 출력 판정 |
| auth users file owner-only mode: 600 | final-auth-routes-01.log · 원출력 8행 | PASS | 실제 출력 판정 |
| setup blocked after completion: 302:/login | final-auth-routes-01.log · 원출력 9행 | PASS | 실제 출력 판정 |
| logout root: 302:/login | final-auth-routes-01.log · 원출력 10행 | PASS | 실제 출력 판정 |
| admin login landing: 302:/ops/home | final-auth-routes-01.log · 원출력 11행 | PASS | 실제 출력 판정 |
| admin whoami username and role | final-auth-routes-01.log · 원출력 12행 | PASS | 실제 출력 판정 |
| admin root: 302:/ops/home | final-auth-routes-01.log · 원출력 13행 | PASS | 실제 출력 판정 |
| SourceRegistry API field/type freeze SHA-256=d6db4f603fbde478e5a4097daa8f5da4ba41e7cbdb42dea26bbda0546380763f | final-auth-routes-01.log · 원출력 14행 | PASS | 실제 출력 판정 |
| operator login route: 302:/ops/home | final-auth-routes-01.log · 원출력 15행 | PASS | 실제 출력 판정 |
| AUTH-029 operator with source write scope sees enabled source write UI | final-auth-routes-01.log · 원출력 16행 | PASS | 실제 출력 판정 |
| readonly operator login route: 302:/ops/home | final-auth-routes-01.log · 원출력 17행 | PASS | 실제 출력 판정 |
| Set-Cookie session viewer login route: 302:/client/live | final-auth-routes-01.log · 원출력 18행 | PASS | 실제 출력 판정 |
| integrator login keeps API-only landing: 302:/auth/whoami | final-auth-routes-01.log · 원출력 19행 | PASS | 실제 출력 판정 |
| viewer ops denied: 403 | final-auth-routes-01.log · 원출력 20행 | PASS | 실제 출력 판정 |
| viewer VLM install/connection UI denied: 403 | final-auth-routes-01.log · 원출력 21행 | PASS | 실제 출력 판정 |
| undefined route BuildHttpResponse returns 404: 404 | final-auth-routes-01.log · 원출력 22행 | PASS | 실제 출력 판정 |
| legacy /lab product UI BuildHttpResponse returns 404: 404 | final-auth-routes-01.log · 원출력 23행 | PASS | 실제 출력 판정 |
| unauth ops sources API denied: 401 | final-auth-routes-01.log · 원출력 24행 | PASS | 실제 출력 판정 |
| unauth ops views API denied: 401 | final-auth-routes-01.log · 원출력 25행 | PASS | 실제 출력 판정 |
| unauth ops runtime API denied: 401 | final-auth-routes-01.log · 원출력 26행 | PASS | 실제 출력 판정 |
| unauth ops rules catalog API denied: 401 | final-auth-routes-01.log · 원출력 27행 | PASS | 실제 출력 판정 |
| unauth ops events API denied: 401 | final-auth-routes-01.log · 원출력 28행 | PASS | 실제 출력 판정 |
| unauth ops ONVIF import draft API denied: 401 | final-auth-routes-01.log · 원출력 29행 | PASS | 실제 출력 판정 |
| unauth ops ONVIF probe draft API denied: 401 | final-auth-routes-01.log · 원출력 30행 | PASS | 실제 출력 판정 |
| unauth ops users API denied: 401 | final-auth-routes-01.log · 원출력 31행 | PASS | 실제 출력 판정 |
| unauth ops invites API denied: 401 | final-auth-routes-01.log · 원출력 32행 | PASS | 실제 출력 판정 |
| unauth ops access requests API denied: 401 | final-auth-routes-01.log · 원출력 33행 | PASS | 실제 출력 판정 |
| viewer ops sources API denied: 403 | final-auth-routes-01.log · 원출력 34행 | PASS | 실제 출력 판정 |
| viewer ops views API denied: 403 | final-auth-routes-01.log · 원출력 35행 | PASS | 실제 출력 판정 |
| viewer ops runtime API denied: 403 | final-auth-routes-01.log · 원출력 36행 | PASS | 실제 출력 판정 |
| viewer ops ONVIF import draft API denied: 403 | final-auth-routes-01.log · 원출력 37행 | PASS | 실제 출력 판정 |
| viewer ops ONVIF probe draft API denied: 403 | final-auth-routes-01.log · 원출력 38행 | PASS | 실제 출력 판정 |
| viewer ops users API denied: 403 | final-auth-routes-01.log · 원출력 39행 | PASS | 실제 출력 판정 |
| viewer ops invites API denied: 403 | final-auth-routes-01.log · 원출력 40행 | PASS | 실제 출력 판정 |
| viewer ops access requests API denied: 403 | final-auth-routes-01.log · 원출력 41행 | PASS | 실제 출력 판정 |
| readonly operator ops read allowed: 200 | final-auth-routes-01.log · 원출력 42행 | PASS | 실제 출력 판정 |
| ops runtime API read allowed: 200 | final-auth-routes-01.log · 원출력 43행 | PASS | 실제 출력 판정 |
| ops rules catalog API read allowed: 200 | final-auth-routes-01.log · 원출력 44행 | PASS | 실제 출력 판정 |
| ops events status API read allowed: 200 | final-auth-routes-01.log · 원출력 45행 | PASS | 실제 출력 판정 |
| AUTH-028 readonly operator sees ops sources UI with source write lock policy | final-auth-routes-01.log · 원출력 46행 | PASS | 실제 출력 판정 |
| readonly operator admin users API denied: 403 | final-auth-routes-01.log · 원출력 47행 | PASS | 실제 출력 판정 |
| readonly operator invite API denied: 403 | final-auth-routes-01.log · 원출력 48행 | PASS | 실제 출력 판정 |
| readonly operator invite list API denied: 403 | final-auth-routes-01.log · 원출력 49행 | PASS | 실제 출력 판정 |
| readonly operator access requests API denied: 403 | final-auth-routes-01.log · 원출력 50행 | PASS | 실제 출력 판정 |
| source write scope required for view create: 403 | final-auth-routes-01.log · 원출력 51행 | PASS | 실제 출력 판정 |
| source write scope required for ONVIF import draft: 403 | final-auth-routes-01.log · 원출력 52행 | PASS | 실제 출력 판정 |
| source write scope required for ONVIF probe draft: 403 | final-auth-routes-01.log · 원출력 53행 | PASS | 실제 출력 판정 |
| source write scope required for view update: 403 | final-auth-routes-01.log · 원출력 54행 | PASS | 실제 출력 판정 |
| source write scope required for source update: 403 | final-auth-routes-01.log · 원출력 55행 | PASS | 실제 출력 판정 |
| rule write scope required for lab rule write: 403 | final-auth-routes-01.log · 원출력 56행 | PASS | 실제 출력 판정 |
| rule write scope required for lab vaRule write: 403 | final-auth-routes-01.log · 원출력 57행 | PASS | 실제 출력 판정 |
| rule write scope required for lab profile write: 403 | final-auth-routes-01.log · 원출력 58행 | PASS | 실제 출력 판정 |
| unauth VLM profile API denied: 401 | final-auth-routes-01.log · 원출력 59행 | PASS | 실제 출력 판정 |
| viewer VLM profile API denied: 403 | final-auth-routes-01.log · 원출력 60행 | PASS | 실제 출력 판정 |
| readonly operator VLM profile read allowed: 200 | final-auth-routes-01.log · 원출력 61행 | PASS | 실제 출력 판정 |
| rule write scope required for VLM profile write: 403 | final-auth-routes-01.log · 원출력 62행 | PASS | 실제 출력 판정 |
| invalid VLM profile fixture rejected: 400 | final-auth-routes-01.log · 원출력 63행 | PASS | 실제 출력 판정 |
| VLM profile write creates storage document | final-auth-routes-01.log · 원출력 64행 | PASS | 실제 출력 판정 |
| VLM profile read lists stored profile with canonical evaluation status | final-auth-routes-01.log · 원출력 65행 | PASS | 실제 출력 판정 |
| VLM profile delete allowed for admin: 200 | final-auth-routes-01.log · 원출력 66행 | PASS | 실제 출력 판정 |
| VLM profile delete readback confirms vlm-route-smoke absence | final-auth-routes-01.log · 원출력 67행 | PASS | 실제 출력 판정 |
| AUTH-029 operator source write scope creates source | final-auth-routes-01.log · 원출력 68행 | PASS | 실제 출력 판정 |
| AUTH-029 operator rule write scope saves profile: 200 | final-auth-routes-01.log · 원출력 69행 | PASS | 실제 출력 판정 |
| ONVIF import draft API allowed for source writer | final-auth-routes-01.log · 원출력 70행 | PASS | 실제 출력 판정 |
| ONVIF import draft redacts credential reference and endpoint | final-auth-routes-01.log · 원출력 71행 | PASS | 실제 출력 판정 |
| ONVIF probe draft API allowed for source writer | final-auth-routes-01.log · 원출력 72행 | PASS | 실제 출력 판정 |
| ONVIF probe draft redacts credential reference and endpoint | final-auth-routes-01.log · 원출력 73행 | PASS | 실제 출력 판정 |
| WHEP source registry create allowed | final-auth-routes-01.log · 원출력 74행 | PASS | 실제 출력 판정 |
| WHEP source canonical duplicate denied: 409 | final-auth-routes-01.log · 원출력 75행 | PASS | 실제 출력 판정 |
| WHEP source visible to ops API | final-auth-routes-01.log · 원출력 76행 | PASS | 실제 출력 판정 |
| integrator client shell denied: 403 | final-auth-routes-01.log · 원출력 77행 | PASS | 실제 출력 판정 |
| unauth client views API denied: 401 | final-auth-routes-01.log · 원출력 78행 | PASS | 실제 출력 판정 |
| unauth client live layout preference API denied: 401 | final-auth-routes-01.log · 원출력 79행 | PASS | 실제 출력 판정 |
| unauth client dashboard API denied: 401 | final-auth-routes-01.log · 원출력 80행 | PASS | 실제 출력 판정 |
| unauth client WebRTC wrapper denied: 401 | final-auth-routes-01.log · 원출력 81행 | PASS | 실제 출력 판정 |
| public access request API remains unauthenticated: 201 | final-auth-routes-01.log · 원출력 82행 | PASS | 실제 출력 판정 |
| Client PublishedView projection field/type freeze SHA-256=f289c7a2e21e47ca7439ecdf12949cc106c9aa2b6e1b80eeaab4327980bc6d62 | final-auth-routes-01.log · 원출력 83행 | PASS | 실제 출력 판정 |
| viewer assigned view visible in client API | final-auth-routes-01.log · 원출력 84행 | PASS | 실제 출력 판정 |
| SRC-022 viewer client API keeps PublishedView allowedRuleIds list | final-auth-routes-01.log · 원출력 85행 | PASS | 실제 출력 판정 |
| SRC-022 viewer client API omits unassigned vaRule from allowedRuleIds | final-auth-routes-01.log · 원출력 86행 | PASS | 실제 출력 판정 |
| SRC-022 viewer client detail API keeps PublishedView allowedRuleIds list | final-auth-routes-01.log · 원출력 87행 | PASS | 실제 출력 판정 |
| viewer unassigned view hidden from client API | final-auth-routes-01.log · 원출력 88행 | PASS | 실제 출력 판정 |
| viewer client live layout preference separates user and role presets | final-auth-routes-01.log · 원출력 89행 | PASS | 실제 출력 판정 |
| viewer client live layout preference save allowed: 200 | final-auth-routes-01.log · 원출력 90행 | PASS | 실제 출력 판정 |
| viewer client live layout preference rejects source URL material: 400 | final-auth-routes-01.log · 원출력 91행 | PASS | 실제 출력 판정 |
| viewer cross-view dashboard denied: 403 | final-auth-routes-01.log · 원출력 92행 | PASS | 실제 출력 판정 |
| viewer cross-view WebRTC wrapper denied: 403 | final-auth-routes-01.log · 원출력 93행 | PASS | 실제 출력 판정 |
| integrator client views list omits live views | final-auth-routes-01.log · 원출력 94행 | PASS | 실제 출력 판정 |
| integrator event scope allowed: 200 | final-auth-routes-01.log · 원출력 95행 | PASS | 실제 출력 판정 |
| unauth scoped event search denied: 401 | final-auth-routes-01.log · 원출력 96행 | PASS | 실제 출력 판정 |
| viewer scoped event search role denied: 403 | final-auth-routes-01.log · 원출력 97행 | PASS | 실제 출력 판정 |
| integrator scoped event search allowed: 200 | final-auth-routes-01.log · 원출력 98행 | PASS | 실제 출력 판정 |
| integrator scoped event search cross-view denied: 403 | final-auth-routes-01.log · 원출력 99행 | PASS | 실제 출력 판정 |
| integrator metadata scope allowed: 200 | final-auth-routes-01.log · 원출력 100행 | PASS | 실제 출력 판정 |
| integrator dashboard scope denied: 403 | final-auth-routes-01.log · 원출력 101행 | PASS | 실제 출력 판정 |
| unauth generic WebRTC denied: 401 | final-auth-routes-01.log · 원출력 102행 | PASS | 실제 출력 판정 |
| viewer generic WebRTC denied: 403 | final-auth-routes-01.log · 원출력 103행 | PASS | 실제 출력 판정 |
| unauth WHEP denied: 401 | final-auth-routes-01.log · 원출력 104행 | PASS | 실제 출력 판정 |
| viewer WHEP denied: 403 | final-auth-routes-01.log · 원출력 105행 | PASS | 실제 출력 판정 |
| unauth WHIP publish denied: 401 | final-auth-routes-01.log · 원출력 106행 | PASS | 실제 출력 판정 |
| viewer WHIP publish denied: 403 | final-auth-routes-01.log · 원출력 107행 | PASS | 실제 출력 판정 |
| unauth metadata websocket denied: 401 | final-auth-routes-01.log · 원출력 108행 | PASS | 실제 출력 판정 |
| viewer metadata websocket denied: 403 | final-auth-routes-01.log · 원출력 109행 | PASS | 실제 출력 판정 |
| plain request omits CORS allow origin: | final-auth-routes-01.log · 원출력 110행 | PASS | 실제 출력 판정 |
| cross-origin actual request denied: 403 | final-auth-routes-01.log · 원출력 111행 | PASS | 실제 출력 판정 |
| cross-origin response omits CORS allow origin: | final-auth-routes-01.log · 원출력 112행 | PASS | 실제 출력 판정 |
| same-origin actual reflects origin: http://127.0.0.1:8091 | final-auth-routes-01.log · 원출력 113행 | PASS | 실제 출력 판정 |
| cross-origin preflight denied: 403 | final-auth-routes-01.log · 원출력 114행 | PASS | 실제 출력 판정 |
| same-origin preflight allowed: 204 | final-auth-routes-01.log · 원출력 115행 | PASS | 실제 출력 판정 |
| same-origin preflight reflects origin: http://127.0.0.1:8091 | final-auth-routes-01.log · 원출력 116행 | PASS | 실제 출력 판정 |
| invalid content-length rejected: 400 | final-auth-routes-01.log · 원출력 117행 | PASS | 실제 출력 판정 |
| server survives invalid content-length: 200 | final-auth-routes-01.log · 원출력 118행 | PASS | 실제 출력 판정 |
| oversized content-length rejected: 413 | final-auth-routes-01.log · 원출력 119행 | PASS | 실제 출력 판정 |
| server survives oversized content-length: 200 | final-auth-routes-01.log · 원출력 120행 | PASS | 실제 출력 판정 |
| WebRTC session id uses random token shape | final-auth-routes-01.log · 원출력 121행 | PASS | 실제 출력 판정 |
| WebRTC session capability issued | final-auth-routes-01.log · 원출력 122행 | PASS | 실제 출력 판정 |
| unauth session follow-up denied: 401 | final-auth-routes-01.log · 원출력 123행 | PASS | 실제 출력 판정 |
| viewer session follow-up denied: 403 | final-auth-routes-01.log · 원출력 124행 | PASS | 실제 출력 판정 |
| session capability follow-up allowed: 200 | final-auth-routes-01.log · 원출력 125행 | PASS | 실제 출력 판정 |
| session capability delete allowed: 200 | final-auth-routes-01.log · 원출력 126행 | PASS | 실제 출력 판정 |
| client WebRTC wrapper returns client session alias | final-auth-routes-01.log · 원출력 127행 | PASS | 실제 출력 판정 |
| client WebRTC wrapper hides internal signaling detail | final-auth-routes-01.log · 원출력 128행 | PASS | 실제 출력 판정 |
| client PublishedView maxTiles enforced: 409 | final-auth-routes-01.log · 원출력 129행 | PASS | 실제 출력 판정 |
| client WebRTC wrapper source override denied: 400 | final-auth-routes-01.log · 원출력 130행 | PASS | 실제 출력 판정 |
| client alias rejected on generic session route: 404 | final-auth-routes-01.log · 원출력 131행 | PASS | 실제 출력 판정 |
| client wrapper ICE allowed: 200 | final-auth-routes-01.log · 원출력 132행 | PASS | 실제 출력 판정 |
| client wrapper delete allowed: 200 | final-auth-routes-01.log · 원출력 133행 | PASS | 실제 출력 판정 |
| client vaRule matching PublishedView source allowed | final-auth-routes-01.log · 원출력 134행 | PASS | 실제 출력 판정 |
| client vaRule wrapper delete allowed: 200 | final-auth-routes-01.log · 원출력 135행 | PASS | 실제 출력 판정 |
| client vaRule source mismatch denied: 400 | final-auth-routes-01.log · 원출력 136행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-routes-01.log · 원출력 138행 | PASS | 실제 출력 판정 |
| admin login landing: 302:/ops/home | final-auth-routes-01.log · 원출력 139행 | PASS | 실제 출력 판정 |
| admin whoami username and role | final-auth-routes-01.log · 원출력 140행 | PASS | 실제 출력 판정 |
| malformed source registry fail closed: 500 | final-auth-routes-01.log · 원출력 141행 | PASS | 실제 출력 판정 |
| malformed source registry not overwritten | final-auth-routes-01.log · 원출력 142행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-routes-01.log · 원출력 144행 | PASS | 실제 출력 판정 |
| admin login landing: 302:/ops/home | final-auth-routes-01.log · 원출력 145행 | PASS | 실제 출력 판정 |
| admin whoami username and role | final-auth-routes-01.log · 원출력 146행 | PASS | 실제 출력 판정 |
| malformed published view registry fail closed: 500 | final-auth-routes-01.log · 원출력 147행 | PASS | 실제 출력 판정 |
| malformed published view registry not overwritten | final-auth-routes-01.log · 원출력 148행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-routes-01.log · 원출력 150행 | PASS | 실제 출력 판정 |
| token mode unauthenticated request denied: 401 | final-auth-routes-01.log · 원출력 151행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-routes-01.log · 원출력 153행 | PASS | 실제 출력 판정 |
| auth off root redirects to ops: 302:/ops/home | final-auth-routes-01.log · 원출력 154행 | PASS | 실제 출력 판정 |
| auth off development admin accesses users API: 200 | final-auth-routes-01.log · 원출력 155행 | PASS | 실제 출력 판정 |
| server health ok (http://127.0.0.1:8091) | final-auth-users-01.log · 원출력 4행 | PASS | 실제 출력 판정 |
| weak admin password rejected: 400 | final-auth-users-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| initial admin password setup: 302 | final-auth-users-01.log · 원출력 6행 | PASS | 실제 출력 판정 |
| auth users file owner-only mode: 600 | final-auth-users-01.log · 원출력 7행 | PASS | 실제 출력 판정 |
| setup blocked after completion: 302:/login | final-auth-users-01.log · 원출력 8행 | PASS | 실제 출력 판정 |
| admin login landing: 302:/ops/home | final-auth-users-01.log · 원출력 9행 | PASS | 실제 출력 판정 |
| admin whoami username and role | final-auth-users-01.log · 원출력 10행 | PASS | 실제 출력 판정 |
| ops users access request selectors | final-auth-users-01.log · 원출력 11행 | PASS | 실제 출력 판정 |
| permissive auth users file re-hardened: 600 | final-auth-users-01.log · 원출력 12행 | PASS | 실제 출력 판정 |
| viewer view scope assigned | final-auth-users-01.log · 원출력 13행 | PASS | 실제 출력 판정 |
| viewer privileged scopes blocked | final-auth-users-01.log · 원출력 14행 | PASS | 실제 출력 판정 |
| user API hash redaction | final-auth-users-01.log · 원출력 15행 | PASS | 실제 출력 판정 |
| viewer custom privileged scope rejected: 400 | final-auth-users-01.log · 원출력 16행 | PASS | 실제 출력 판정 |
| integrator live view scope rejected: 400 | final-auth-users-01.log · 원출력 17행 | PASS | 실제 출력 판정 |
| viewer login: 302 | final-auth-users-01.log · 원출력 18행 | PASS | 실제 출력 판정 |
| viewer ops forbidden: 403 | final-auth-users-01.log · 원출력 19행 | PASS | 실제 출력 판정 |
| admin reset password: 200 | final-auth-users-01.log · 원출력 20행 | PASS | 실제 출력 판정 |
| admin reset revokes existing viewer session: 401 | final-auth-users-01.log · 원출력 21행 | PASS | 실제 출력 판정 |
| admin reset forces next-login password change | final-auth-users-01.log · 원출력 22행 | PASS | 실제 출력 판정 |
| mustChangePassword landing: 302:/password/change | final-auth-users-01.log · 원출력 23행 | PASS | 실제 출력 판정 |
| password change auth shell selectors | final-auth-users-01.log · 원출력 24행 | PASS | 실제 출력 판정 |
| password change to temporary password succeeds: 302 | final-auth-users-01.log · 원출력 25행 | PASS | 실제 출력 판정 |
| temporary password login succeeds: 302 | final-auth-users-01.log · 원출력 26행 | PASS | 실제 출력 판정 |
| password_history original password immediate history reuse rejected: 400 | final-auth-users-01.log · 원출력 27행 | PASS | 실제 출력 판정 |
| password history count rotation succeeds: 302 | final-auth-users-01.log · 원출력 28행 | PASS | 실제 출력 판정 |
| history rotation password login succeeds: 302 | final-auth-users-01.log · 원출력 29행 | PASS | 실제 출력 판정 |
| original password restored after history count rotation: 302 | final-auth-users-01.log · 원출력 30행 | PASS | 실제 출력 판정 |
| SaveUsersFile-backed password change lifecycle final login succeeds: 302 | final-auth-users-01.log · 원출력 31행 | PASS | 실제 출력 판정 |
| admin disables viewer: 200 | final-auth-users-01.log · 원출력 32행 | PASS | 실제 출력 판정 |
| disabled user login rejected: 401 | final-auth-users-01.log · 원출력 33행 | PASS | 실제 출력 판정 |
| admin restores viewer: 200 | final-auth-users-01.log · 원출력 34행 | PASS | 실제 출력 판정 |
| restored viewer login succeeds: 302 | final-auth-users-01.log · 원출력 35행 | PASS | 실제 출력 판정 |
| last active admin disable rejected: 409 | final-auth-users-01.log · 원출력 36행 | PASS | 실제 출력 판정 |
| last active admin role downgrade rejected: 409 | final-auth-users-01.log · 원출력 37행 | PASS | 실제 출력 판정 |
| login lockout stored | final-auth-users-01.log · 원출력 38행 | PASS | 실제 출력 판정 |
| invite token issued once | final-auth-users-01.log · 원출력 39행 | PASS | 실제 출력 판정 |
| invite expiry and setup URL visible once | final-auth-users-01.log · 원출력 40행 | PASS | 실제 출력 판정 |
| invite list API exposes issued invite summary | final-auth-users-01.log · 원출력 41행 | PASS | 실제 출력 판정 |
| invite list API redacts token material | final-auth-users-01.log · 원출력 42행 | PASS | 실제 출력 판정 |
| users-only save after pending invite: 200 | final-auth-users-01.log · 원출력 43행 | PASS | 실제 출력 판정 |
| pending invite preserved across users save | final-auth-users-01.log · 원출력 44행 | PASS | 실제 출력 판정 |
| invite setup HTTP response renders required form | final-auth-users-01.log · 원출력 45행 | PASS | 실제 출력 판정 |
| invite setup auth shell selectors | final-auth-users-01.log · 원출력 46행 | PASS | 실제 출력 판정 |
| invite password setup: 302 | final-auth-users-01.log · 원출력 47행 | PASS | 실제 출력 판정 |
| invited viewer login: 302 | final-auth-users-01.log · 원출력 48행 | PASS | 실제 출력 판정 |
| invite.used consumed/expired token runtime status split: 401:410 | final-auth-users-01.log · 원출력 49행 | PASS | 실제 출력 판정 |
| existing invite target baseline login: 302 | final-auth-users-01.log · 원출력 50행 | PASS | 실제 출력 판정 |
| existing invite baseline scope visible | final-auth-users-01.log · 원출력 51행 | PASS | 실제 출력 판정 |
| pending invite keeps existing session: 200 | final-auth-users-01.log · 원출력 52행 | PASS | 실제 출력 판정 |
| pending invite does not change existing role/scope | final-auth-users-01.log · 원출력 53행 | PASS | 실제 출력 판정 |
| pending invite future scope not applied | final-auth-users-01.log · 원출력 54행 | PASS | 실제 출력 판정 |
| existing invite accepted: 302 | final-auth-users-01.log · 원출력 55행 | PASS | 실제 출력 판정 |
| accepted invite revokes previous session: 401 | final-auth-users-01.log · 원출력 56행 | PASS | 실제 출력 판정 |
| existing invite new password login: 302 | final-auth-users-01.log · 원출력 57행 | PASS | 실제 출력 판정 |
| accepted invite applies role/scope | final-auth-users-01.log · 원출력 58행 | PASS | 실제 출력 판정 |
| duplicate pending access request rejected: 409 | final-auth-users-01.log · 원출력 59행 | PASS | 실제 출력 판정 |
| access request unsafe viewId rejected: 400 | final-auth-users-01.log · 원출력 60행 | PASS | 실제 출력 판정 |
| oversized access request body rejected: 413 | final-auth-users-01.log · 원출력 61행 | PASS | 실제 출력 판정 |
| access request rate budget allows fourth counted attempt | final-auth-users-01.log · 원출력 62행 | PASS | 실제 출력 판정 |
| access request rate budget allows fifth counted attempt: 201 | final-auth-users-01.log · 원출력 63행 | PASS | 실제 출력 판정 |
| access request per-peer rate limit enforced: 429 | final-auth-users-01.log · 원출력 64행 | PASS | 실제 출력 판정 |
| ops users access request reject API: 200 | final-auth-users-01.log · 원출력 65행 | PASS | 실제 출력 판정 |
| rejected access request visible in ops API | final-auth-users-01.log · 원출력 66행 | PASS | 실제 출력 판정 |
| pending access request form and pending-state copy | final-auth-users-01.log · 원출력 67행 | PASS | 실제 출력 판정 |
| pending form submission remains denied login before approval: 401 | final-auth-users-01.log · 원출력 68행 | PASS | 실제 출력 판정 |
| approved request invite expiry visible once | final-auth-users-01.log · 원출력 69행 | PASS | 실제 출력 판정 |
| approved request keeps user pending until invite setup | final-auth-users-01.log · 원출력 70행 | PASS | 실제 출력 판정 |
| users-only save after approved request: 200 | final-auth-users-01.log · 원출력 71행 | PASS | 실제 출력 판정 |
| approved request preserved across users save | final-auth-users-01.log · 원출력 72행 | PASS | 실제 출력 판정 |
| approved request invite preserved across users save | final-auth-users-01.log · 원출력 73행 | PASS | 실제 출력 판정 |
| approved request password setup: 302 | final-auth-users-01.log · 원출력 74행 | PASS | 실제 출력 판정 |
| approved request viewer login: 302 | final-auth-users-01.log · 원출력 75행 | PASS | 실제 출력 판정 |
| release close-out commands are available | final-closeout-01.log · 원출력 2행 | PASS | 실제 출력 판정 |
| release docs keep publish gates manual: release policy missing snippet: v4.1.0 Release Close-out Runbook | final-closeout-01.log · 원출력 3행 | FAIL | 최초 문서 실패; 같은 제목 02에서 보완 후 PASS |
| release visual baseline automation is wired for release workflow | final-closeout-01.log · 원출력 4행 | PASS | 실제 출력 판정 |
| dry-run report marks release actions as not executed | final-closeout-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| one-shot close-out gate is ordered and fail-stop | final-closeout-01.log · 원출력 6행 | PASS | 실제 출력 판정 |
| one-shot close-out docs keep destructive actions manual | final-closeout-01.log · 원출력 7행 | PASS | 실제 출력 판정 |
| release close-out commands are available | final-closeout-02.log · 원출력 2행 | PASS | 실제 출력 판정 |
| release docs keep publish gates manual | final-closeout-02.log · 원출력 3행 | PASS | 실제 출력 판정 |
| release visual baseline automation is wired for release workflow | final-closeout-02.log · 원출력 4행 | PASS | 실제 출력 판정 |
| dry-run report marks release actions as not executed | final-closeout-02.log · 원출력 5행 | PASS | 실제 출력 판정 |
| one-shot close-out gate is ordered and fail-stop | final-closeout-02.log · 원출력 6행 | PASS | 실제 출력 판정 |
| one-shot close-out docs keep destructive actions manual | final-closeout-02.log · 원출력 7행 | PASS | 실제 출력 판정 |
| VERSION=4.1.0 | final-entry-01.log · 원출력 2행 | PASS | 실제 출력 판정 |
| branch context=v4.1.0 | final-entry-01.log · 원출력 3행 | PASS | 실제 출력 판정 |
| CMake source version | final-entry-01.log · 원출력 4행 | PASS | 실제 출력 판정 |
| README source version | final-entry-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| README current roadmap | final-entry-01.log · 원출력 6행 | PASS | 실제 출력 판정 |
| README published tag | final-entry-01.log · 원출력 7행 | PASS | 실제 출력 판정 |
| README published baseline | final-entry-01.log · 원출력 8행 | PASS | 실제 출력 판정 |
| English README source version | final-entry-01.log · 원출력 9행 | PASS | 실제 출력 판정 |
| English README current roadmap | final-entry-01.log · 원출력 10행 | PASS | 실제 출력 판정 |
| docs index source version | final-entry-01.log · 원출력 11행 | PASS | 실제 출력 판정 |
| docs index current roadmap | final-entry-01.log · 원출력 12행 | PASS | 실제 출력 판정 |
| English docs index source version | final-entry-01.log · 원출력 13행 | PASS | 실제 출력 판정 |
| English docs index current roadmap | final-entry-01.log · 원출력 14행 | PASS | 실제 출력 판정 |
| versioning policy source version | final-entry-01.log · 원출력 15행 | PASS | 실제 출력 판정 |
| versioning policy current roadmap | final-entry-01.log · 원출력 16행 | PASS | 실제 출력 판정 |
| release policy source version | final-entry-01.log · 원출력 17행 | PASS | 실제 출력 판정 |
| release policy current roadmap | final-entry-01.log · 원출력 18행 | PASS | 실제 출력 판정 |
| public review source version | final-entry-01.log · 원출력 19행 | PASS | 실제 출력 판정 |
| UI guide source version | final-entry-01.log · 원출력 20행 | PASS | 실제 출력 판정 |
| UI assets source version | final-entry-01.log · 원출력 21행 | PASS | 실제 출력 판정 |
| UI asset manifest source version | final-entry-01.log · 원출력 22행 | PASS | 실제 출력 판정 |
| UI asset manifest published baseline | final-entry-01.log · 원출력 23행 | PASS | 실제 출력 판정 |
| UI asset verifier published baseline | final-entry-01.log · 원출력 24행 | PASS | 실제 출력 판정 |
| backlog source version | final-entry-01.log · 원출력 25행 | PASS | 실제 출력 판정 |
| backlog current roadmap | final-entry-01.log · 원출력 26행 | PASS | 실제 출력 판정 |
| roadmap source version | final-entry-01.log · 원출력 27행 | PASS | 실제 출력 판정 |
| roadmap S00 status | final-entry-01.log · 원출력 28행 | PASS | 실제 출력 판정 |
| latest published baseline remains v4.0.0 | final-entry-01.log · 원출력 29행 | PASS | 실제 출력 판정 |
| release evidence exists | final-entry-01.log · 원출력 30행 | PASS | 실제 출력 판정 |
| research gate dispatch | final-entry-01.log · 원출력 31행 | PASS | 실제 출력 판정 |
| entry baseline dispatch | final-entry-01.log · 원출력 32행 | PASS | 실제 출력 판정 |
| release metadata current tag | final-entry-01.log · 원출력 33행 | PASS | 실제 출력 판정 |
| release metadata current roadmap | final-entry-01.log · 원출력 34행 | PASS | 실제 출력 판정 |
| VERSION=4.1.0 | final-entry-02.log · 원출력 2행 | PASS | 실제 출력 판정 |
| branch context=v4.1.0 | final-entry-02.log · 원출력 3행 | PASS | 실제 출력 판정 |
| CMake source version | final-entry-02.log · 원출력 4행 | PASS | 실제 출력 판정 |
| README source version | final-entry-02.log · 원출력 5행 | PASS | 실제 출력 판정 |
| README current roadmap | final-entry-02.log · 원출력 6행 | PASS | 실제 출력 판정 |
| README published tag | final-entry-02.log · 원출력 7행 | PASS | 실제 출력 판정 |
| README published baseline | final-entry-02.log · 원출력 8행 | PASS | 실제 출력 판정 |
| English README source version | final-entry-02.log · 원출력 9행 | PASS | 실제 출력 판정 |
| English README current roadmap | final-entry-02.log · 원출력 10행 | PASS | 실제 출력 판정 |
| docs index source version | final-entry-02.log · 원출력 11행 | PASS | 실제 출력 판정 |
| docs index current roadmap | final-entry-02.log · 원출력 12행 | PASS | 실제 출력 판정 |
| English docs index source version | final-entry-02.log · 원출력 13행 | PASS | 실제 출력 판정 |
| English docs index current roadmap | final-entry-02.log · 원출력 14행 | PASS | 실제 출력 판정 |
| versioning policy source version | final-entry-02.log · 원출력 15행 | PASS | 실제 출력 판정 |
| versioning policy current roadmap | final-entry-02.log · 원출력 16행 | PASS | 실제 출력 판정 |
| release policy source version | final-entry-02.log · 원출력 17행 | PASS | 실제 출력 판정 |
| release policy current roadmap | final-entry-02.log · 원출력 18행 | PASS | 실제 출력 판정 |
| public review source version | final-entry-02.log · 원출력 19행 | PASS | 실제 출력 판정 |
| UI guide source version | final-entry-02.log · 원출력 20행 | PASS | 실제 출력 판정 |
| UI assets source version | final-entry-02.log · 원출력 21행 | PASS | 실제 출력 판정 |
| UI asset manifest source version | final-entry-02.log · 원출력 22행 | PASS | 실제 출력 판정 |
| UI asset manifest published baseline | final-entry-02.log · 원출력 23행 | PASS | 실제 출력 판정 |
| UI asset verifier published baseline | final-entry-02.log · 원출력 24행 | PASS | 실제 출력 판정 |
| backlog source version | final-entry-02.log · 원출력 25행 | PASS | 실제 출력 판정 |
| backlog current roadmap | final-entry-02.log · 원출력 26행 | PASS | 실제 출력 판정 |
| roadmap source version | final-entry-02.log · 원출력 27행 | PASS | 실제 출력 판정 |
| roadmap S00 status | final-entry-02.log · 원출력 28행 | PASS | 실제 출력 판정 |
| latest published baseline remains v4.0.0 | final-entry-02.log · 원출력 29행 | PASS | 실제 출력 판정 |
| release evidence exists | final-entry-02.log · 원출력 30행 | PASS | 실제 출력 판정 |
| research gate dispatch | final-entry-02.log · 원출력 31행 | PASS | 실제 출력 판정 |
| entry baseline dispatch | final-entry-02.log · 원출력 32행 | PASS | 실제 출력 판정 |
| release metadata current tag | final-entry-02.log · 원출력 33행 | PASS | 실제 출력 판정 |
| release metadata current roadmap | final-entry-02.log · 원출력 34행 | PASS | 실제 출력 판정 |
| test_cli_no_gst_side_effects (__main__.EnvironmentTests.test_cli_no_gst_side_effects) | final-env-fixture-01.log · 원출력 2행 | PASS | 실제 출력 판정 |
| test_concurrent (__main__.EnvironmentTests.test_concurrent) | final-env-fixture-01.log · 원출력 3행 | PASS | 실제 출력 판정 |
| test_custom_paths (__main__.EnvironmentTests.test_custom_paths) | final-env-fixture-01.log · 원출력 4행 | PASS | 실제 출력 판정 |
| test_custom_so_plugins (__main__.EnvironmentTests.test_custom_so_plugins) | final-env-fixture-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| test_dispatch_environment (__main__.EnvironmentTests.test_dispatch_environment) | final-env-fixture-01.log · 원출력 6행 | PASS | 실제 출력 판정 |
| test_explicit_prefix (__main__.EnvironmentTests.test_explicit_prefix) | final-env-fixture-01.log · 원출력 7행 | PASS | 실제 출력 판정 |
| test_filter (__main__.EnvironmentTests.test_filter) | final-env-fixture-01.log · 원출력 8행 | PASS | 실제 출력 판정 |
| test_inherited_custom_paths (__main__.EnvironmentTests.test_inherited_custom_paths) | final-env-fixture-01.log · 원출력 9행 | PASS | 실제 출력 판정 |
| test_invalid_profile (__main__.EnvironmentTests.test_invalid_profile) | final-env-fixture-01.log · 원출력 10행 | PASS | 실제 출력 판정 |
| test_launchd_environment (__main__.EnvironmentTests.test_launchd_environment) | final-env-fixture-01.log · 원출력 11행 | PASS | 실제 출력 판정 |
| test_linux_unchanged (__main__.EnvironmentTests.test_linux_unchanged) | final-env-fixture-01.log · 원출력 12행 | PASS | 실제 출력 판정 |
| test_nohup_environment (__main__.EnvironmentTests.test_nohup_environment) | final-env-fixture-01.log · 원출력 13행 | PASS | 실제 출력 판정 |
| test_override_order (__main__.EnvironmentTests.test_override_order) | final-env-fixture-01.log · 원출력 14행 | PASS | 실제 출력 판정 |
| test_prefix_discovery (__main__.EnvironmentTests.test_prefix_discovery) | final-env-fixture-01.log · 원출력 15행 | PASS | 실제 출력 판정 |
| test_reapply (__main__.EnvironmentTests.test_reapply) | final-env-fixture-01.log · 원출력 16행 | PASS | 실제 출력 판정 |
| test_registry (__main__.EnvironmentTests.test_registry) | final-env-fixture-01.log · 원출력 17행 | PASS | 실제 출력 판정 |
| test_system_profile (__main__.EnvironmentTests.test_system_profile) | final-env-fixture-01.log · 원출력 18행 | PASS | 실제 출력 판정 |
| test_tampered_cache (__main__.EnvironmentTests.test_tampered_cache) | final-env-fixture-01.log · 원출력 19행 | PASS | 실제 출력 판정 |
| test_unsafe_cache (__main__.EnvironmentTests.test_unsafe_cache) | final-env-fixture-01.log · 원출력 20행 | PASS | 실제 출력 판정 |
| test_upgrade (__main__.EnvironmentTests.test_upgrade) | final-env-fixture-01.log · 원출력 21행 | PASS | 실제 출력 판정 |
| VERSION matches CMake project VERSION | final-metadata-01.log · 원출력 2행 | PASS | 실제 출력 판정 |
| README.md points to the current published release | final-metadata-01.log · 원출력 3행 | PASS | 실제 출력 판정 |
| README.md keeps release source-of-truth links lightweight | final-metadata-01.log · 원출력 4행 | PASS | 실제 출력 판정 |
| README.en.md points to the current published release | final-metadata-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| README.en.md keeps release source-of-truth links lightweight | final-metadata-01.log · 원출력 6행 | PASS | 실제 출력 판정 |
| historical v2.9 source-of-truth remains distinct from latest published v2.8 | final-metadata-01.log · 원출력 7행 | PASS | 실제 출력 판정 |
| default mode records published metadata verification as external gate | final-metadata-01.log · 원출력 8행 | PASS | 실제 출력 판정 |
| versioning policy separates source version and published release | final-metadata-01.log · 원출력 9행 | PASS | 실제 출력 판정 |
| versioning policy pins semver source fields | final-metadata-01.log · 원출력 10행 | PASS | 실제 출력 판정 |
| release policy separates source version and published release | final-metadata-01.log · 원출력 11행 | PASS | 실제 출력 판정 |
| release policy preserves latest published release note source | final-metadata-01.log · 원출력 12행 | PASS | 실제 출력 판정 |
| release policies require future signed tags | final-metadata-01.log · 원출력 13행 | PASS | 실제 출력 판정 |
| development backlog pins current source roadmap and public release boundary | final-metadata-01.log · 원출력 14행 | PASS | 실제 출력 판정 |
| docs index points to backlog as current release source of truth | final-metadata-01.log · 원출력 15행 | PASS | 실제 출력 판정 |
| public entry docs keep release evidence source-of-truth deduped | final-metadata-01.log · 원출력 16행 | PASS | 실제 출력 판정 |
| public review pins current release wording | final-metadata-01.log · 원출력 17행 | PASS | 실제 출력 판정 |
| UI guide pins current release wording | final-metadata-01.log · 원출력 18행 | PASS | 실제 출력 판정 |
| UI asset policy pins current source and published baseline wording | final-metadata-01.log · 원출력 19행 | PASS | 실제 출력 판정 |
| VERSION matches CMake project VERSION | final-metadata-02.log · 원출력 2행 | PASS | 실제 출력 판정 |
| README.md points to the current published release | final-metadata-02.log · 원출력 3행 | PASS | 실제 출력 판정 |
| README.md keeps release source-of-truth links lightweight | final-metadata-02.log · 원출력 4행 | PASS | 실제 출력 판정 |
| README.en.md points to the current published release | final-metadata-02.log · 원출력 5행 | PASS | 실제 출력 판정 |
| README.en.md keeps release source-of-truth links lightweight | final-metadata-02.log · 원출력 6행 | PASS | 실제 출력 판정 |
| historical v2.9 source-of-truth remains distinct from latest published v2.8 | final-metadata-02.log · 원출력 7행 | PASS | 실제 출력 판정 |
| default mode records published metadata verification as external gate | final-metadata-02.log · 원출력 8행 | PASS | 실제 출력 판정 |
| versioning policy separates source version and published release | final-metadata-02.log · 원출력 9행 | PASS | 실제 출력 판정 |
| versioning policy pins semver source fields | final-metadata-02.log · 원출력 10행 | PASS | 실제 출력 판정 |
| release policy separates source version and published release | final-metadata-02.log · 원출력 11행 | PASS | 실제 출력 판정 |
| release policy preserves latest published release note source | final-metadata-02.log · 원출력 12행 | PASS | 실제 출력 판정 |
| release policies require future signed tags | final-metadata-02.log · 원출력 13행 | PASS | 실제 출력 판정 |
| development backlog pins current source roadmap and public release boundary | final-metadata-02.log · 원출력 14행 | PASS | 실제 출력 판정 |
| docs index points to backlog as current release source of truth | final-metadata-02.log · 원출력 15행 | PASS | 실제 출력 판정 |
| public entry docs keep release evidence source-of-truth deduped | final-metadata-02.log · 원출력 16행 | PASS | 실제 출력 판정 |
| public review pins current release wording | final-metadata-02.log · 원출력 17행 | PASS | 실제 출력 판정 |
| UI guide pins current release wording | final-metadata-02.log · 원출력 18행 | PASS | 실제 출력 판정 |
| UI asset policy pins current source and published baseline wording | final-metadata-02.log · 원출력 19행 | PASS | 실제 출력 판정 |
| D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | final-recording-01.log · 원출력 5행 | PASS | 실제 출력 판정 |
| D3D-01 generated2출력 manifest/containment/hash | final-recording-01.log · 원출력 8행 | PASS | 실제 출력 판정 |
| I01 실제 status projection | final-recording-01.log · 원출력 9행 | PASS | 실제 출력 판정 |
| I03/I06 실제 HTTP generated2출력·jobComplete timeline | final-recording-01.log · 원출력 10행 | PASS | 실제 출력 판정 |
| I07 HTTP 전체/부분 중첩 원본 구별 | final-recording-01.log · 원출력 11행 | PASS | 실제 출력 판정 |
| D3D-02 accepted 미확인 독립 목록 | final-recording-01.log · 원출력 12행 | PASS | 실제 출력 판정 |
| D3D-02 문자열 시간·요청축 보존 | final-recording-01.log · 원출력 13행 | PASS | 실제 출력 판정 |
| D3D-04 actual Event output 전체 byte/hash·MIME | final-recording-01.log · 원출력 14행 | PASS | 실제 출력 판정 |
| D3D-04 actual Event output 전체 byte/hash·MIME | final-recording-01.log · 원출력 15행 | PASS | 실제 출력 판정 |
| I17 HTTP 내부 path 비노출 | final-recording-01.log · 원출력 16행 | PASS | 실제 출력 판정 |
| I04 HTTP 잘못된 query 거부 8 | final-recording-01.log · 원출력 17행 | PASS | 실제 출력 판정 |
| I04 HTTP 잘못된 query 거부 9 | final-recording-01.log · 원출력 18행 | PASS | 실제 출력 판정 |
| I04 HTTP 잘못된 query 거부 10 | final-recording-01.log · 원출력 19행 | PASS | 실제 출력 판정 |
| I04 HTTP 잘못된 query 거부 11 | final-recording-01.log · 원출력 20행 | PASS | 실제 출력 판정 |
| I04 HTTP 잘못된 query 거부 12 | final-recording-01.log · 원출력 21행 | PASS | 실제 출력 판정 |
| I20 Range status expected=206 actual=206 | final-recording-01.log · 원출력 22행 | PASS | 실제 출력 판정 |
| I20 Range Content-Range 일치 | final-recording-01.log · 원출력 23행 | PASS | 실제 출력 판정 |
| I20 Range body expected=4 actual=4 byte 일치 | final-recording-01.log · 원출력 24행 | PASS | 실제 출력 판정 |
| I20 range status expected=206 actual=206 | final-recording-01.log · 원출력 25행 | PASS | 실제 출력 판정 |
| I20 range Content-Range 일치 | final-recording-01.log · 원출력 26행 | PASS | 실제 출력 판정 |
| I20 range body expected=4 actual=4 byte 일치 | final-recording-01.log · 원출력 27행 | PASS | 실제 출력 판정 |
| I20 rAnGe status expected=206 actual=206 | final-recording-01.log · 원출력 28행 | PASS | 실제 출력 판정 |
| I20 rAnGe Content-Range 일치 | final-recording-01.log · 원출력 29행 | PASS | 실제 출력 판정 |
| I20 rAnGe body expected=4 actual=4 byte 일치 | final-recording-01.log · 원출력 30행 | PASS | 실제 출력 판정 |
| I20/I21 실제 Range bytes=2-5 | final-recording-01.log · 원출력 31행 | PASS | 실제 출력 판정 |
| I20/I21 실제 Range bytes=10- | final-recording-01.log · 원출력 32행 | PASS | 실제 출력 판정 |
| I20/I21 실제 Range bytes=-7 | final-recording-01.log · 원출력 33행 | PASS | 실제 출력 판정 |
| I24 HTTP 전체 byte 일치 | final-recording-01.log · 원출력 34행 | PASS | 실제 출력 판정 |
| I22 HTTP 범위 거부 bytes=1-0 | final-recording-01.log · 원출력 35행 | PASS | 실제 출력 판정 |
| I22 HTTP 범위 거부 bytes=-0 | final-recording-01.log · 원출력 36행 | PASS | 실제 출력 판정 |
| I22 HTTP 범위 거부 bytes=0-1,3-4 | final-recording-01.log · 원출력 37행 | PASS | 실제 출력 판정 |
| I22 HTTP 범위 거부 bytes=18446744073709551616- | final-recording-01.log · 원출력 38행 | PASS | 실제 출력 판정 |
| I22 HTTP 범위 거부 bytes=0-14476 | final-recording-01.log · 원출력 39행 | PASS | 실제 출력 판정 |
| I22 HTTP 범위 거부 invalid | final-recording-01.log · 원출력 40행 | PASS | 실제 출력 판정 |
| I23 실제 HEAD full | final-recording-01.log · 원출력 41행 | PASS | 실제 출력 판정 |
| I23 실제 HEAD bytes=2-5 | final-recording-01.log · 원출력 42행 | PASS | 실제 출력 판정 |
| I17 HTTP 없는 opaque ID 거부 | final-recording-01.log · 원출력 43행 | PASS | 실제 출력 판정 |
| D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | final-recording-01.log · 원출력 49행 | PASS | 실제 출력 판정 |
| D3D-01 generated2출력 manifest/containment/hash | final-recording-01.log · 원출력 52행 | PASS | 실제 출력 판정 |
| I12~I16 principal 0 route 0 expected=200 actual=200 | final-recording-01.log · 원출력 53행 | PASS | 실제 출력 판정 |
| I02 principal 0 허용 채널만 status 반환 | final-recording-01.log · 원출력 54행 | PASS | 실제 출력 판정 |
| I01 principal 0 실제 비녹화 상태 | final-recording-01.log · 원출력 55행 | PASS | 실제 출력 판정 |
| S07-http-observations-global | final-recording-01.log · 원출력 56행 | PASS | 실제 출력 판정 |
| I02/I17 principal 0 route 0 민감 field 비노출 | final-recording-01.log · 원출력 57행 | PASS | 실제 출력 판정 |
| I12~I16 principal 0 route 1 expected=200 actual=200 | final-recording-01.log · 원출력 58행 | PASS | 실제 출력 판정 |
| I02/I17 principal 0 route 1 민감 field 비노출 | final-recording-01.log · 원출력 59행 | PASS | 실제 출력 판정 |
| I12~I16 principal 0 route 2 expected=200 actual=200 | final-recording-01.log · 원출력 60행 | PASS | 실제 출력 판정 |
| I12~I16 principal 1 route 0 expected=200 actual=200 | final-recording-01.log · 원출력 61행 | PASS | 실제 출력 판정 |
| I02 principal 1 허용 채널만 status 반환 | final-recording-01.log · 원출력 62행 | PASS | 실제 출력 판정 |
| I01 principal 1 실제 비녹화 상태 | final-recording-01.log · 원출력 63행 | PASS | 실제 출력 판정 |
| S07-http-observations-limited principal 1 | final-recording-01.log · 원출력 64행 | PASS | 실제 출력 판정 |
| I02/I17 principal 1 route 0 민감 field 비노출 | final-recording-01.log · 원출력 65행 | PASS | 실제 출력 판정 |
| I12~I16 principal 1 route 1 expected=200 actual=200 | final-recording-01.log · 원출력 66행 | PASS | 실제 출력 판정 |
| I02/I17 principal 1 route 1 민감 field 비노출 | final-recording-01.log · 원출력 67행 | PASS | 실제 출력 판정 |
| I12~I16 principal 1 route 2 expected=200 actual=200 | final-recording-01.log · 원출력 68행 | PASS | 실제 출력 판정 |
| I12~I16 principal 2 route 0 expected=403 actual=403 | final-recording-01.log · 원출력 69행 | PASS | 실제 출력 판정 |
| I02/I17 principal 2 route 0 민감 field 비노출 | final-recording-01.log · 원출력 70행 | PASS | 실제 출력 판정 |
| I12~I16 principal 2 route 1 expected=403 actual=403 | final-recording-01.log · 원출력 71행 | PASS | 실제 출력 판정 |
| I02/I17 principal 2 route 1 민감 field 비노출 | final-recording-01.log · 원출력 72행 | PASS | 실제 출력 판정 |
| I12~I16 principal 2 route 2 expected=403 actual=403 | final-recording-01.log · 원출력 73행 | PASS | 실제 출력 판정 |
| I12~I16 principal 3 route 0 expected=200 actual=200 | final-recording-01.log · 원출력 74행 | PASS | 실제 출력 판정 |
| I02 principal 3 허용 채널만 status 반환 | final-recording-01.log · 원출력 75행 | PASS | 실제 출력 판정 |
| I01 principal 3 실제 비녹화 상태 | final-recording-01.log · 원출력 76행 | PASS | 실제 출력 판정 |
| S07-http-observations-limited principal 3 | final-recording-01.log · 원출력 77행 | PASS | 실제 출력 판정 |
| I02/I17 principal 3 route 0 민감 field 비노출 | final-recording-01.log · 원출력 78행 | PASS | 실제 출력 판정 |
| I12~I16 principal 3 route 1 expected=403 actual=403 | final-recording-01.log · 원출력 79행 | PASS | 실제 출력 판정 |
| I02/I17 principal 3 route 1 민감 field 비노출 | final-recording-01.log · 원출력 80행 | PASS | 실제 출력 판정 |
| I12~I16 principal 3 route 2 expected=404 actual=404 | final-recording-01.log · 원출력 81행 | PASS | 실제 출력 판정 |
| I12~I16 principal 4 route 0 expected=403 actual=403 | final-recording-01.log · 원출력 82행 | PASS | 실제 출력 판정 |
| I02/I17 principal 4 route 0 민감 field 비노출 | final-recording-01.log · 원출력 83행 | PASS | 실제 출력 판정 |
| I12~I16 principal 4 route 1 expected=403 actual=403 | final-recording-01.log · 원출력 84행 | PASS | 실제 출력 판정 |
| I02/I17 principal 4 route 1 민감 field 비노출 | final-recording-01.log · 원출력 85행 | PASS | 실제 출력 판정 |
| I12~I16 principal 4 route 2 expected=403 actual=403 | final-recording-01.log · 원출력 86행 | PASS | 실제 출력 판정 |
| I15 미인증 API expected=401 actual=401 | final-recording-01.log · 원출력 87행 | PASS | 실제 출력 판정 |
| I15 미인증 API expected=401 actual=401 | final-recording-01.log · 원출력 88행 | PASS | 실제 출력 판정 |
| I15 미인증 API expected=401 actual=401 | final-recording-01.log · 원출력 89행 | PASS | 실제 출력 판정 |
| I16 operator의 다른 채널 조회 거부 | final-recording-01.log · 원출력 90행 | PASS | 실제 출력 판정 |
| I34 viewer 녹화 화면 거부 status=403 | final-recording-01.log · 원출력 91행 | PASS | 실제 출력 판정 |
| I17 인증 fixture plaintext 저장 없음 | final-recording-01.log · 원출력 92행 | PASS | 실제 출력 판정 |
| D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | final-recording-01.log · 원출력 98행 | PASS | 실제 출력 판정 |
| D3D-07 valid MP4 free atom64MiB·최종 physical/hash 검증 | final-recording-01.log · 원출력 99행 | PASS | 실제 출력 판정 |
| D3D-01 generated2출력 manifest/containment/hash | final-recording-01.log · 원출력 102행 | PASS | 실제 출력 판정 |
| I24 큰 파일 status/길이 | final-recording-01.log · 원출력 103행 | PASS | 실제 출력 판정 |
| I24 64MiB 전체 streaming hash 일치 | final-recording-01.log · 원출력 104행 | PASS | 실제 출력 판정 |
| I25 전체 응답 뒤 hold0 | final-recording-01.log · 원출력 105행 | PASS | 실제 출력 판정 |
| I24 256KiB 경계 Range byte 일치 | final-recording-01.log · 원출력 106행 | PASS | 실제 출력 판정 |
| I26 disconnect 전 실제 hold1 | final-recording-01.log · 원출력 107행 | PASS | 실제 출력 판정 |
| I26 disconnect 뒤 실제 hold0 | final-recording-01.log · 원출력 108행 | PASS | 실제 출력 판정 |
| I26 disconnect 뒤 서버 health200 | final-recording-01.log · 원출력 109행 | PASS | 실제 출력 판정 |
| I26 서버 종료 전 실제 hold1 | final-recording-01.log · 원출력 110행 | PASS | 실제 출력 판정 |
| I26 활성 전송 중 정상 종료 | final-recording-01.log · 원출력 111행 | PASS | 실제 출력 판정 |
| I26 정상 종료 후 영속 hold0 | final-recording-01.log · 원출력 112행 | PASS | 실제 출력 판정 |
| D02-03 동일 source/channel/ns immutable snapshot 전달 | final-recording-01.log · 원출력 115행 | PASS | 실제 출력 판정 |
| D02-03 다른 channel 증거 혼합 거부 | final-recording-01.log · 원출력 116행 | PASS | 실제 출력 판정 |
| D02-03 stop namespace 증거 삭제 | final-recording-01.log · 원출력 117행 | PASS | 실제 출력 판정 |
| D02-03 cache capacity 이전 namespace eviction | final-recording-01.log · 원출력 118행 | PASS | 실제 출력 판정 |
| D02-03 전체 stop 후 publication/query 거부 | final-recording-01.log · 원출력 119행 | PASS | 실제 출력 판정 |
| D02-01 신규 root 자동 내구 store identity | final-recording-01.log · 원출력 120행 | PASS | 실제 출력 판정 |
| D02-01 재개방 동일 store identity | final-recording-01.log · 원출력 121행 | PASS | 실제 출력 판정 |
| D02-01 서로 다른 root 난수 identity 구별 | final-recording-01.log · 원출력 122행 | PASS | 실제 출력 판정 |
| D02-02 managed lease 동시 소유 거부 | final-recording-01.log · 원출력 123행 | PASS | 실제 출력 판정 |
| D02-01 명시 ID 기존 계약 유지 | final-recording-01.log · 원출력 124행 | PASS | 실제 출력 판정 |
| D02-02 명시 ID 충돌 원본 marker 보존 | final-recording-01.log · 원출력 125행 | PASS | 실제 출력 판정 |
| D02-02 같은 init 내구 ID 복구 | final-recording-01.log · 원출력 126행 | PASS | 실제 출력 판정 |
| D02-02 legacy nonempty 변환·삭제 거부 | final-recording-01.log · 원출력 127행 | PASS | 실제 출력 판정 |
| D02-02 손상/unknown marker 덮어쓰기 거부 | final-recording-01.log · 원출력 128행 | PASS | 실제 출력 판정 |
| D02-06 실제 H264 입력 준비 | final-recording-01.log · 원출력 129행 | PASS | 실제 출력 판정 |
| D02-05 실제 V2 finalized startup 미디어 전수 검사 | final-recording-01.log · 원출력 132행 | PASS | 실제 출력 판정 |
| D02-05 실제 V2 size/hash 손상 감지·catalog Mark | final-recording-01.log · 원출력 133행 | PASS | 실제 출력 판정 |
| D02-10 default 준비16s·500ms·33회 예산 | final-recording-01.log · 원출력 134행 | PASS | 실제 출력 판정 |
| D02-10 overflow 요청은60s/121회 capped 사유 보존 | final-recording-01.log · 원출력 135행 | PASS | 실제 출력 판정 |
| D02-06 on 구성의 동일 managed store/catalog writer 결박 | final-recording-01.log · 원출력 136행 | PASS | 실제 출력 판정 |
| D02-07 빈 저장소 runtime 복구 함수 | final-recording-01.log · 원출력 137행 | PASS | 실제 출력 판정 |
| D02-06 off managed 형식 유지·미디어 비생산 | final-recording-01.log · 원출력 138행 | PASS | 실제 출력 판정 |
| D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 | final-recording-01.log · 원출력 139행 | PASS | 실제 출력 판정 |
| D02-11 raw stream/channel/sourcecontext 모순은 신규 저장·접수 없음 | final-recording-01.log · 원출력 140행 | PASS | 실제 출력 판정 |
| D02-06 off/on 재개방 동일 store identity | final-recording-01.log · 원출력 143행 | PASS | 실제 출력 판정 |
| D02-07 실제 producer 시작 전 runtime 복구 | final-recording-01.log · 원출력 144행 | PASS | 실제 출력 판정 |
| D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | final-recording-01.log · 원출력 145행 | PASS | 실제 출력 판정 |
| D02-08 실제 source/session 종료 owner0 | final-recording-01.log · 원출력 146행 | PASS | 실제 출력 판정 |
| D02-06 off/on 재개방 동일 store identity | final-recording-01.log · 원출력 147행 | PASS | 실제 출력 판정 |
| D02-07 실제 producer 시작 전 runtime 복구 | final-recording-01.log · 원출력 148행 | PASS | 실제 출력 판정 |
| D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | final-recording-01.log · 원출력 150행 | PASS | 실제 출력 판정 |
| D02-08 실제 source/session 종료 owner0 | final-recording-01.log · 원출력 151행 | PASS | 실제 출력 판정 |
| D02-06 off/on 재개방 동일 store identity | final-recording-01.log · 원출력 152행 | PASS | 실제 출력 판정 |
| D02-07 실제 producer 시작 전 runtime 복구 | final-recording-01.log · 원출력 153행 | PASS | 실제 출력 판정 |
| D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | final-recording-01.log · 원출력 154행 | PASS | 실제 출력 판정 |
| D02-08 실제 source/session 종료 owner0 | final-recording-01.log · 원출력 155행 | PASS | 실제 출력 판정 |
| D02-06 off/on 재개방 동일 store identity | final-recording-01.log · 원출력 156행 | PASS | 실제 출력 판정 |
| D02-07 실제 producer 시작 전 runtime 복구 | final-recording-01.log · 원출력 157행 | PASS | 실제 출력 판정 |
| D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | final-recording-01.log · 원출력 159행 | PASS | 실제 출력 판정 |
| D02-08 실제 source/session 종료 owner0 | final-recording-01.log · 원출력 160행 | PASS | 실제 출력 판정 |
| D02-04/10 실제 default10s+post5s 후행 finalize·동시 실제decoder cache·2출력 decode | final-recording-01.log · 원출력 168행 | PASS | 실제 출력 판정 |
| D02-01 crypto-off OS CSPRNG 생성/재개방 identity | final-recording-01.log · 원출력 170행 | PASS | 실제 출력 판정 |
| D02-08 provider 조회 재진입·동시 멱등·Stop 후 Submit 재검사 | final-recording-01.log · 원출력 171행 | PASS | 실제 출력 판정 |
| D02-07 runtime startup committed-parent recovery/보호/물리검사 순서 | final-recording-01.log · 원출력 174행 | PASS | 실제 출력 판정 |
| D02-07 runtime startup blocked-parent recovery/보호/물리검사 순서 | final-recording-01.log · 원출력 177행 | PASS | 실제 출력 판정 |
| D02-07 runtime startup intent recovery/보호/물리검사 순서 | final-recording-01.log · 원출력 179행 | PASS | 실제 출력 판정 |
| S11-CI09 product-1 healthy isolated ICE | final-recording-01.log · 원출력 199행 | PASS | 실제 출력 판정 |
| S11-CI07 run1 actual tuple EventRecord reference | final-recording-01.log · 원출력 535행 | PASS | 실제 출력 판정 |
| S11-CI07 run1 literal two output files all pages | final-recording-01.log · 원출력 861행 | PASS | 실제 출력 판정 |
| S11-CI07 run1 output1 HTTP200 | final-recording-01.log · 원출력 863행 | PASS | 실제 출력 판정 |
| S11-CI07 run1 output2 HTTP200 | final-recording-01.log · 원출력 865행 | PASS | 실제 출력 판정 |
| S11-CI08 product-1 exit0 ports returned | final-recording-01.log · 원출력 870행 | PASS | 실제 출력 판정 |
| S11-CI11 copy1 bytes/hash exact before Open | final-recording-01.log · 원출력 871행 | PASS | 실제 출력 판정 |
| S11-CI11 copy1 same-axis request two sources typed proof | final-recording-01.log · 원출력 872행 | PASS | 실제 출력 판정 |
| S11-CI11 original1 unchanged by copy recovery | final-recording-01.log · 원출력 873행 | PASS | 실제 출력 판정 |
| S11-CI07 output owned regular hash dj-2b5d0532d8b1e8a4a1d49c54afcc5205519619be57294675e7f605a97585177f-o0 | final-recording-01.log · 원출력 874행 | PASS | 실제 출력 판정 |
| S11-CI07 output owned regular hash dj-2b5d0532d8b1e8a4a1d49c54afcc5205519619be57294675e7f605a97585177f-o1 | final-recording-01.log · 원출력 875행 | PASS | 실제 출력 판정 |
| S11-CI09 product-2 healthy isolated ICE | final-recording-01.log · 원출력 902행 | PASS | 실제 출력 판정 |
| S11-CI08 retained output HTTP200 | final-recording-01.log · 원출력 907행 | PASS | 실제 출력 판정 |
| S11-CI08 retained output HTTP200 | final-recording-01.log · 원출력 909행 | PASS | 실제 출력 판정 |
| S11-CI07 run2 actual tuple EventRecord reference | final-recording-01.log · 원출력 968행 | PASS | 실제 출력 판정 |
| S11-CI07 run2 literal two output files all pages | final-recording-01.log · 원출력 1065행 | PASS | 실제 출력 판정 |
| S11-CI07 run2 output1 HTTP200 | final-recording-01.log · 원출력 1067행 | PASS | 실제 출력 판정 |
| S11-CI07 run2 output2 HTTP200 | final-recording-01.log · 원출력 1069행 | PASS | 실제 출력 판정 |
| S11-CI08 retained IDs/hash and new event/reference/job/output separated | final-recording-01.log · 원출력 1071행 | PASS | 실제 출력 판정 |
| S11-CI08 product-2 exit0 ports returned | final-recording-01.log · 원출력 1075행 | PASS | 실제 출력 판정 |
| S11-CI11 copy2 bytes/hash exact before Open | final-recording-01.log · 원출력 1076행 | PASS | 실제 출력 판정 |
| S11-CI11 copy2 same-axis request two sources typed proof | final-recording-01.log · 원출력 1077행 | PASS | 실제 출력 판정 |
| S11-CI11 original2 unchanged by copy recovery | final-recording-01.log · 원출력 1078행 | PASS | 실제 출력 판정 |
| S11-CI07 output owned regular hash dj-15a3baeae4f608a1c5141fed7cbb0535ecd9430c98dfd365660dfefd0abccb31-o0 | final-recording-01.log · 원출력 1079행 | PASS | 실제 출력 판정 |
| S11-CI07 output owned regular hash dj-15a3baeae4f608a1c5141fed7cbb0535ecd9430c98dfd365660dfefd0abccb31-o1 | final-recording-01.log · 원출력 1080행 | PASS | 실제 출력 판정 |

## 실행 소유 정리 전수

각 경로·크기·부재·프로세스/포트 확인은 다음 실제 출력이다. 상위 이관/빌드 캐시는 LP28 마지막 정리 표에서 별도로 판정한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| final-auth-bootstrap-01.log 31행 정리 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-auth-bootstrap.81Ci3j kib=2096 absent=true | PASS |
| final-auth-routes-01.log 160행 정리 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-auth-routes.X7PhNo kib=13824 absent=true | PASS |
| final-auth-users-01.log 80행 정리 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-auth-users.fQxy52 kib=2132 absent=true | PASS |
| final-env-fixture-01.log 27행 정리 | [cleanup] __main__.EnvironmentTests.test_cli_no_gst_side_effects: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_a6clftil files=16 bytes=231725 removed=true | PASS |
| final-env-fixture-01.log 28행 정리 | [cleanup] __main__.EnvironmentTests.test_concurrent: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_i3qyg29y files=15 bytes=2005 removed=true | PASS |
| final-env-fixture-01.log 29행 정리 | [cleanup] __main__.EnvironmentTests.test_custom_paths: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_dtgdcaeo files=17 bytes=2424 removed=true | PASS |
| final-env-fixture-01.log 30행 정리 | [cleanup] __main__.EnvironmentTests.test_custom_so_plugins: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_i_ze3etq files=21 bytes=2470 removed=true | PASS |
| final-env-fixture-01.log 31행 정리 | [cleanup] __main__.EnvironmentTests.test_dispatch_environment: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_sqrtrk61 files=19 bytes=222004 removed=true | PASS |
| final-env-fixture-01.log 32행 정리 | [cleanup] __main__.EnvironmentTests.test_explicit_prefix: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_ieu8a9oe files=15 bytes=2005 removed=true | PASS |
| final-env-fixture-01.log 33행 정리 | [cleanup] __main__.EnvironmentTests.test_filter: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_rpb6kk15 files=15 bytes=2005 removed=true | PASS |
| final-env-fixture-01.log 34행 정리 | [cleanup] __main__.EnvironmentTests.test_inherited_custom_paths: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_7rg16fzn files=21 bytes=4078 removed=true | PASS |
| final-env-fixture-01.log 35행 정리 | [cleanup] __main__.EnvironmentTests.test_invalid_profile: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_e5pcgs7y files=15 bytes=2005 removed=true | PASS |
| final-env-fixture-01.log 36행 정리 | [cleanup] __main__.EnvironmentTests.test_launchd_environment: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_kk9_nhi8 files=18 bytes=8903 removed=true | PASS |
| final-env-fixture-01.log 37행 정리 | [cleanup] __main__.EnvironmentTests.test_linux_unchanged: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_opyy9rn6 files=11 bytes=361 removed=true | PASS |
| final-env-fixture-01.log 38행 정리 | [cleanup] __main__.EnvironmentTests.test_nohup_environment: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_wo44lgpu files=19 bytes=6218 removed=true | PASS |
| final-env-fixture-01.log 39행 정리 | [cleanup] __main__.EnvironmentTests.test_override_order: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_cbvh2lk_ files=11 bytes=362 removed=true | PASS |
| final-env-fixture-01.log 40행 정리 | [cleanup] __main__.EnvironmentTests.test_prefix_discovery: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_nqshyw_h files=15 bytes=2005 removed=true | PASS |
| final-env-fixture-01.log 41행 정리 | [cleanup] __main__.EnvironmentTests.test_reapply: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_e09ada2c files=15 bytes=2005 removed=true | PASS |
| final-env-fixture-01.log 42행 정리 | [cleanup] __main__.EnvironmentTests.test_registry: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_iu_dk72o files=15 bytes=2005 removed=true | PASS |
| final-env-fixture-01.log 43행 정리 | [cleanup] __main__.EnvironmentTests.test_system_profile: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_rbi8no6c files=11 bytes=362 removed=true | PASS |
| final-env-fixture-01.log 44행 정리 | [cleanup] __main__.EnvironmentTests.test_tampered_cache: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_mc0ap_vy files=16 bytes=2137 removed=true | PASS |
| final-env-fixture-01.log 45행 정리 | [cleanup] __main__.EnvironmentTests.test_unsafe_cache: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_dzhh0sad files=11 bytes=362 removed=true | PASS |
| final-env-fixture-01.log 46행 정리 | [cleanup] __main__.EnvironmentTests.test_upgrade: path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_tciyk0l9 files=19 bytes=3638 removed=true | PASS |
| final-recording-01.log 6행 정리 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.MQvakv bytes=6677832 removed=true | PASS |
| final-recording-01.log 45행 정리 | [cleanup] PASS {"root":"/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-MVp1F6","rootBeforeBytes":2181571,"rootBeforeEntries":311,"rootSymlinksNotFollowed":277,"rootAbsent":true,"process":{"pid":99228,"exitCode":0,"signalCode":null,"graceful":true},"ports":[{"kind":"rtsp","port":65236,"closed":true,"evidence":"ECONNREFUSED"},{"kind":"http","port":65237,"closed":true,"evidence":"ECONNREFUSED"}],"attempted":6,"failureCount":0,"cleanupElapsedMs":609,"verifierElapsedMs":4020} | PASS |
| final-recording-01.log 50행 정리 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.vJ2Tns bytes=6677832 removed=true | PASS |
| final-recording-01.log 94행 정리 | [cleanup] PASS {"root":"/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-HFoZvb","rootBeforeBytes":2453757,"rootBeforeEntries":314,"rootSymlinksNotFollowed":277,"rootAbsent":true,"process":{"pid":99310,"exitCode":0,"signalCode":null,"graceful":true},"ports":[{"kind":"rtsp","port":65280,"closed":true,"evidence":"ECONNREFUSED"},{"kind":"http","port":65281,"closed":true,"evidence":"ECONNREFUSED"}],"attempted":6,"failureCount":0,"cleanupElapsedMs":303,"verifierElapsedMs":3737} | PASS |
| final-recording-01.log 100행 정리 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.hB24XA bytes=6677832 removed=true | PASS |
| final-recording-01.log 114행 정리 | [cleanup] PASS {"root":"/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-YbbwZF","rootBeforeBytes":69292320,"rootBeforeEntries":312,"rootSymlinksNotFollowed":277,"rootAbsent":true,"process":{"pid":99393,"exitCode":0,"signalCode":null,"graceful":true},"ports":[{"kind":"rtsp","port":65330,"closed":true,"evidence":"ECONNREFUSED"},{"kind":"http","port":65331,"closed":true,"evidence":"ECONNREFUSED"}],"attempted":6,"failureCount":0,"cleanupElapsedMs":14,"verifierElapsedMs":4086} | PASS |
| final-recording-01.log 180행 정리 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.SrMNHQ bytes=15247260 removed=true | PASS |
| final-recording-01.log 2178행 정리 | [cleanup] {"root":"/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-85Qovw","bytes":267045861,"rootAbsent":true,"failureCount":0,"processes":[{"schema":"recording-process-cleanup-v1","attemptCount":1,"pid":99520,"exitCode":0,"signalCode":null,"exitedObserved":true,"stopCode":"complete","forcedTermination":"not-used","normalExitPass":true,"normalShutdownPass":true,"archiveSafe":true,"ports":[{"kind":"http","port":65365,"status":"pass","code":"closed","closed":true},{"kind":"rtsp","port":65366,"status":"pass","code":"closed","closed":true}]},{"schema":"recording-process-cleanup-v1","attemptCount":1,"pid":99586,"exitCode":0,"signalCode":null,"exitedObserved":true,"stopCode":"complete","forcedTermination":"not-used","normalExitPass":true,"normalShutdownPass":true,"archiveSafe":true,"ports":[{"kind":"http","port":49281,"status":"pass","code":"closed","closed":true},{"kind":"rtsp","port":49282,"status":"pass","code":"closed","closed":true}]}],"evidencePreservedOrNotRequired":true,"udpClosed":true} | PASS |

## 결과의 경계

- 녹화 실제 앱은 eventOutputs의 jobState/completeness=complete, 두 파일, 전체 페이지 검사를 거쳐 HTTP/file hash·재기동을 확인했다. terminal 관측기 fullOutputPass=false는 관측만으로 완전성을 보증하지 않는 고정 플래그이며 별도 전체 판정을 대체하지 않는다.
- latencyPass=false는 이번 actual-app 모드가 전용 latency-only 모드가 아님을 뜻한다. HTTP 346건(health 제외)의 실제 최대2882ms/오류0은 관측값이며 새 latency-only 실행 PASS로 기록하지 않는다.
- fullFoundationPass/resourceTrendPass/uiFulltestPass=false 유지. 환경 fixture20과 이전 actual94·codec67/ICE8 유효 증거 재사용은 서로 구분한다.
- 외부 서비스·실기기는 사용자 명시 제외다. 로컬 격리 endpoint/fixture는 외부 검증이 아니다. 실제 UI·30분·120분은 릴리즈 전 필수 잔여다.
