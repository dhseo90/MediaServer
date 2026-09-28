# B10 녹화 UI 31 action·시각 적격 결과

독자: v4.1.0 검증·릴리즈 담당자. 수명: S11 증거 보존. 정책은 AGENTS.md,
31개 개별 정의는 manual-ui-result-template 및 중앙 B10-U05를 따른다.

## 최종 판정

제품 변경 없이 실제 Chrome에서 31/31 action을 실행했다. 메인이 실제 diff,
독립 seed와 응답·DOM·시간/프레임·역할별 HTTP, 8 viewport/theme의 필터와
전체 영상/control 이미지를 교차 확인했다. 녹화 추가 8개 ID는 hybrid 적격으로
판정한다. 기존 별도 baseline 424/424 적격을 포함해 현재 UI 대상은 432개다.
runner의 `uiFulltestPass=false`는 자동 자기승격 금지이며 아래 메인 판정과 구분한다.
이 UI 판정으로 녹화120분·자원 또는 S11 전체를 완료하지 않는다.

- 최종 명령: `node scripts/internal/run_recording_ui_acceptance.mjs --all --output-dir <canonical 소유 임시 경로>`
- 최종 run: `media-server-recording-ui-acceptance-all-Uns0Dl`, exit0, 70,481ms.
- source HEAD: `63cc1799` + 이번 검증기 diff. 제품 SHA256:
  `6c2149d468bb7f86cb29f1d683eec6cb21c7f2b383e0c4619fe4f35db2a6aabc`.
- Playwright 1.62.1 / Chrome 152.0.7977.83. 실제 native 브라우저 자동화+메인 시각 검토.
- 이전 인앱 renderer exit5는 미확정 역사로 유지한다. native Chrome fallback을 공개하며
  기존 차단된 자격증명 파일은 읽지 않았다. 이번 renderer/pageerror 없음, 수동 개입 없음.
- 계정은 실행마다 새 난수, visible 로그인, whoami role/scope 대조. 비밀은 메모리 전달만.
- 독립 재검사에서 artifact containment·SHA/bytes·JSON·PNG header·민감 문자열 검사를 통과했다.
  actual PNG들은 메인이 화면으로 확인했다. 원문 password/cookie/token/network body는 보존하지 않는다.
- 브라우저 동영상 recorder의 설치된 FFmpeg 실행파일이 없어 미지원이다
  (`ffmpeg-1011/ffmpeg-mac` 부재 직접 확인). 추가 설치·placeholder video 없음.
  실제 frame 진행·native 조작 trace·스크린샷을 보존하며 영상 녹화 파일이 있다고 주장하지 않는다.

## 실패·수정·재검증 전수

| 실행 | 명령 범위·exit·결과 | 최초 원인/조치 | 최종 판정 |
| --- | --- | --- | --- |
| all-1 bWWDRf | --all exit1, 5 pass/1 fail/25 notRun | 겹친 원본을 첫 페이지에 있다고 가정. 독립 seed 전체 페이지에서 대상 위치를 찾도록 보완 | 실패 보존 |
| all-2 3amQzV | --all exit1, 15/1/15 | 실제 타 채널 영상은 known 0/unplaced 1인데 known만 검색. 두 목록을 동등하게 조회 | 실패 보존 |
| all-3 GUB2fH | --all exit1, 브라우저 시작 전 | 메인 명령이 /var 별칭을 전달. canonical 소유 경로 정책이 거부했으며 다음 명령에 realpath 적용 | 준비 실패, UI 미실행 |
| all-4 Dgo5pQ | --all exit1, 16/1/14 | auth UI fixture의 LAB 비활성으로 파일 목록 404. 격리 input의 /lab/files 활성·입력 보존 assertion 추가 | 실패 보존; 제품 로직 미변경 |
| all-5 OR3g9z | --all exit1, 18/1/12 | 메뉴 경로를 /ops·/client로 가정. 실제 /ops/home·/client/live로 교정 | 녹화 off/on·입력 불변 PASS, nav 실패 보존 |
| all-6 vHr4Bv | --all exit1, 조작31/31, suite FAIL | 제한 operator users403·no-ops landing403의 기존 계약 결속 누락. whoami·권한 없음 DOM·세션/action·유일 response를 결속하고 중복·다른 세션 반례 거부 | 콘솔 적격 실패 보존 |
| all-7 CXNbjf | --all exit0, 조작31/31 | 승인된 10개 권한/오류 반례·미승인0. 390px native 날짜 필드가 resize 직후 시각상 불명확해 적격 보류 | 조작 PASS, 최종 시각 증거로는 미사용 |
| all-8 Uns0Dl | --all exit0, 조작31/31 | 각 viewport에서 실제 페이지 진입 후 전체 날짜/시간과 영상 준비·프레임을 확인. 390px 시간 표시 정상 | 최종 개별·시각 적격 PASS |

시간제한·제품 권한·저장·미디어 계약은 변경하지 않았다. 상한을 늘리거나 검사 항목을
삭제하지 않았다. UI 반복은 해당 단기 31 action 범위이며 공통424·30분을 재시작하지 않았다.

## 개별 실행 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| V410-S06-I27 I27-filter | 정상 필터: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I27-filter.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I27 I27-empty | 빈값·빈 결과: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I27-empty.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I27 I27-inverted | 역전 시간: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I27-inverted.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I27 I27-page | 페이지: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I27-page.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I28 I28-event | 이벤트 우선: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I28-event.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I29 I29-original | 원본: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I29-original.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I30 I30-play | 재생: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I30-play.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I30 I30-pause | 정지: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I30-pause.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I30 I30-seek | 탐색: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I30-seek.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I31 I31-partial | partial: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I31-partial.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I31 I31-deleted | 삭제: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I31-deleted.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I31 I31-corrupt | 손상: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I31-corrupt.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I31 I31-pending | 미완결 event: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I31-pending.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I31 I31-gap | 공백: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I31-gap.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I31 I31-error | 오류: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I31-error.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I32 I32-quota | quota: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I32-quota.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I32 I32-active | 활성: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I32-active.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I32 I32-blocked | blocked: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I32-blocked.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I33 I33-navigation | navigation: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I33-navigation.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-admin | admin: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-admin.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-operator | operator scope: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-operator.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-viewer-unauth | viewer·미인증: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-viewer-unauth.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-redaction | redaction: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-redaction.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-320-light | 320 light: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-320-light.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-320-dark | 320 dark: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-320-dark.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-390-light | 390 light: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-390-light.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-390-dark | 390 dark: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-390-dark.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-760-light | 760 light: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-760-light.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-760-dark | 760 dark: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-760-dark.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-1180-light | 1180 light: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-1180-light.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |
| V410-S06-I34 I34-1180-dark | 1180 dark: 실제 control 조작과 독립 seed/응답/DOM/상태 대조. archive 최종 run의 `I34-1180-dark.json`·PNG | pass | exit0, 상세 전후 값·시각·role/viewport/theme는 해당 JSON |

## 시각·정책 교차 판정

| 항목 | 직접 관측·근거 | 판정 |
| --- | --- | --- |
| 320 light/dark | 최종 I34-320-* 필터·영상 PNG, 254px control 안 날짜/시간·checkbox·영상/control, focus outline·Tab/Space 반영 | pass |
| 390 light/dark | 새 페이지 진입의 최종 I34-390-* PNG에서 시간까지 모두 표시. 이전 resize 중간 캡처는 최종으로 사용 안 함 | pass |
| 760 light/dark | I34-760-* PNG의 한 열 필터·전체 영상·control·상태 텍스트, 가로 침범 없음 | pass |
| 1180 light/dark | I34-1180-* PNG의 3열 필터와 영상·control, 65vh 안의 contain 표현·정보 잘림 없음 | pass |
| 대비·focus·label | 캡처의 명시 label과 키보드 focus 확인. 실제 computed RGB로 입력·select·button 대비 light 17.18:1, dark 최소15.23:1. checkbox Space 왕복 | pass |
| 영상·재생 | 1280×720, 10초, native 재생/정지/탐색 시간·프레임·seeking/seeked·같은 파일206. responsive readyState4·프레임4·error 없음. 일부 PNG에 native 로딩 장식이 남지만 영상 영역/control 손상은 없고 이를 재생 진행 증거로 사용하지 않음 | pass |
| 권한·노출 | admin/operator/no-source/no-ops/viewer/anonymous readback·403/404·로그인 redirect. viewer PNG는 비공개 영상/원본URL/디버그 정보 없음 | pass |
| console | 실제 응답 10건에 결속한 승인 반례, 미승인0, warning/pageerror/crash0. 같은 세션/action/GET/경로/상태/유일 응답만 소비 | pass |
| exact·provenance | 31 unique action, 8 feature ID, source/build/policy/template/runner/helper hash, role·scope·viewport·theme·시각. 중앙 사전 정의와 일치 | pass |
| artifacts | 원출력·개별 JSON·시각 PNG·trace·서버 안전 로그·해시/경로/비밀 재검사 | pass |
| browser/server/port | 최종 browserClosed=true, PID28470 exit0, RTSP51082/HTTP51083 ECONNREFUSED, UDP closed, fixture root 삭제 | pass |

AGENTS7.6.3의 녹화 추가 항목에 대한 메인 교차 판정은 적격이다. baseline qualifier를
432개로 변조하지 않았다. 녹화 VA overlay는 이 재생 UI 기능에 존재하지 않아 비대상이며
공통 live/overlay는 별도424 실제 UI 증거로 유지한다.

## 자체검증·보존물

사전 정의 B10-U03에 자체검사 파일 이름 참조가 빠져 첫 script inventory는11/1이었다.
기존 정의에 실제 실행 명령을 연결했으며 검사 생략·분류 기준 완화는 하지 않았다.
이 실패는 UI 제품 회귀가 아닌 스크립트 참조 누락이다.

같은 인벤토리 재검증은 exit0, 12/12였다. 아래는 실제 출력의 개별 판정이며
원출력은 이번 도구 실행 기록(session3275)에 있다. 별도 원출력 파일은 남기지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| dispatch parser | bash/node 명시 interpreter 인식 | pass | exit0 |
| dispatch targets | server.sh 대상 파일·실행 권한 | pass | exit0 |
| documented commands | 문서 명령과 dispatch 연결 | pass | exit0 |
| tracked scripts | 추적 스크립트 분류·참조 | pass | 최초 fail 후 중앙 사전 정의의 명령 연결 보완 |
| delegated inventory | 프로젝트 인벤토리의 파일 목록 위임 | pass | exit0 |
| verifier families | 실행 계열 연결·dispatch 중복 부재 | pass | exit0 |
| CTest | 별도 미추적 CTest 등록 부재 | pass | exit0 |
| test entry | test_all에서 진입 가능 | pass | exit0 |
| auth defaults | 고정 테스트 비밀번호 없음 | pass | exit0 |
| EventRecord dispatch | 조기 실패·각 poll dispatch | pass | exit0 |
| result wording | 핵심 검증기 묶음 PASS 오표현 없음 | pass | exit0 |
| option parser | 알 수 없는 JS 옵션 거부 | pass | exit0 |

`node --check`는 runner·before·after·UI contract 네 파일 모두 exit0,
`git diff --check` exit0, 문서 링크 검사는 실패0(360문서·14,483링크),
UI 자산 검사는10/10이었다. 이 정적 검사는 실제31조작의 증거를 대체하지 않는다.

B10-U03 자체검사는 9/9: AU01 CLI, AU02 exact manifest, AU03 비밀 제거,
AU04 containment, AU05 독립 행 선택, AU06 시간/프레임/Range 반례,
AU07 geometry/label, AU08 known/unplaced, AU09 console 세션/중복/오류 반례.
LAB 설정 경계 보완 후 DB01~06도6/6 재확인했다.
원출력은 [실행 로그](b10-ui-runs.log.gz), 원증거는 [압축본](b10-ui-evidence.tar.xz)이다.
최종 run 전부와 앞선 실패의 JSON·최종 화면, 390px 중간 화면을 보존했다.
앞선 중간 PASS PNG 중복은 보존하지 않으며 해당 개별 PASS를 재사용하지 않는다.

- archive 7,969,528 bytes, SHA256 `319bd96d6d319721d91460248fa0641d907001956279aa939e0a57712fd1f898`.
- 원출력 gzip SHA256 `353c13d144103556a0109dba58f69ad3c47f4957db372c622ced6aaa4ca8ac46`.
- token start/end/consumed: 전용 집계 미제공으로 미집계. elapsed source: 각 verifier cleanup 원장.

## 정리

모든 실행의 격리 제품 root·server/port는 각 로그에서 정상 정리됐다.
archive306파일을 추출 스트림으로 원본과 byte 대조한 뒤 아래 소유 root만 제거했다.
필수 증거는 압축본에서 복구할 수 있고 중간 중복 PNG만 영구 제거했다.

| 경로 (소유 temp의 acceptance-all- 접미사) | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| bWWDRf | 실패1 증거 | 1,196,685B | 필수 이관 후 삭제 | 부재 | hash·UID·archive byte 대조 |
| 3amQzV | 실패2 증거 | 4,244,515B | 같은 방식 | 부재 | 같은 직접 대조 |
| GUB2fH | 경로 준비 실패 빈 root | 0B | 빈 소유 root 삭제 | 부재 | 실제 파일0개 |
| Dgo5pQ | 실패4 증거 | 4,426,637B | 필수 이관 후 삭제 | 부재 | hash·UID·archive byte 대조 |
| OR3g9z | 실패5 증거 | 4,923,419B | 같은 방식 | 부재 | 같은 직접 대조 |
| vHr4Bv | console 적격 실패6 | 9,323,574B | 같은 방식 | 부재 | 같은 직접 대조 |
| CXNbjf | 시각 보완 전7 | 9,363,229B | 같은 방식 | 부재 | 같은 직접 대조 |
| Uns0Dl | 최종8 전수 | 9,377,335B | 96파일 전부 이관 후 삭제 | 부재·복구 가능 | 31결과·96파일·원본 대조 |
| /private/tmp/media-server-b10-prep-2iPIvk | 준비·집중·전체 로그 임시 사본 | 46,459B | 기존 커밋/현재 gzip과 대조 후 삭제 | 부재 | 소유 UID·일반 파일·8실행 원문 대조 |
