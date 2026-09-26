# S11 녹화 UI 실행 준비 보완 결과

독자: v4.1.0 검증 담당자. 수명: B10 실행 및 릴리즈 증거 보존. 작업 정책은 AGENTS.md,
실행 정의는 중앙 테스트 기록의 B10-U01/U02다. 이 문서는 실제 UI 통과를 뜻하지 않는다.

## 범위와 불변 조건

- 격리 fixture가 실행마다 생성한 계정을 동일 프로세스 메모리의 driver에 전달한다.
  기존에 보안 정책에 차단된 자격증명 파일을 다시 읽거나 우회하지 않는다.
- 기존 CLI hold·HTTP 검사·15/60분 상한·제품 auth/schema/media/storage 계약은 유지한다.
- driver 성공/실패/취소 이후 브라우저 종료를 기다리고 기존 서버·포트·root 정리를 수행한다.
  로그 수집 또는 서버 상태 실패는 취소 후 FAIL이다. 참조 해제는 메모리 소거 보장이 아니다.
- 공통 UI 424개·30분의 제품 코드와 실행기는 수정하지 않았다. 그 증거를 전면 무효화하지 않는다.

## 실행 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| DB01 | driver가 새 계정을 파일 없이 메모리 context로만 받음 | pass | 전달·freeze·비출력·handoff 없음 |
| DB02 | driver 오류를 비밀 없는 실패로 반환 | pass | 원문 비밀 출력 안 함 |
| DB03 | timeout AbortSignal 후 cleanup settle 대기 | pass | timeout FAIL 유지 |
| DB04 | UI 이외 mode·비함수 driver 시작 전 거부 | pass | 서버 미실행 |
| DB05 | handoff 경로 분리·공통 cleanup 연결 | pass | 정적 구조 검사이며 실 UI PASS 아님 |
| DB06 | 관측 실패 취소·정리 및 종료 직전 재확인 | pass | 메인 검토 보완 뒤 6/6 |
| SF01 optional seek fixture is accepted only with explicit UI anchor | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA01 anchor bounds and unknown options are rejected | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA05 inherited anchor and auth values are removed from seed environment | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA02 random temporary passwords are distinct with sufficient length | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| B08-H01 temporary passwords avoid product policy pattern rejection | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA03 actual bootstrap function orders setup five logins and four users | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA04 one-time handoff is mode0600 and refuses overwrite | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA07 live source payload distinguishes active quota from blocked reservation | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA01 new auth direct mode rejects missing anchor before preparation | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA08-anchored current seed compile root cleanup | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA06 LP26-U02~06 actual managed catalog anchored scenarios and reopen | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA08-unknown current seed compile root cleanup | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA05 LP26-U02 no anchor remains unknown rather than fake 1970 UTC | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| LP26-U01~05 invalid anchor duplicate row hash and completeness rejected | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| SF02 bounded owned seek fixture generation completes | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| SF03 actual H264 silent 1280x720 ten-second first-keyframe fixture | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| SF06 malformed media metadata and symlink input directory are rejected | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA08-seek current seed compile root cleanup | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| SF04 LP26-U08 managed original seek file actual size SHA and duration | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| SF05 LP26-U08 other originals remain short and actual derived outputs remain MP4 | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| UA08 test root cleanup | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP01 fixed loopback upstream and origin-form target only | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP01 same-origin POST preserves proxy Host and external Origin rejection | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP02 streaming preserves 206 bytes and Range headers | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP03 cookie forwarded but absent from observation | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP04 nonmedia and invalid metadata never expose payload | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP05 upstream failure records incomplete safely | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP06 client disconnect closes upstream and records incomplete | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP07 close drains or destroys sockets and releases port | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP08 private log mode0600 bounded failure is latched | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP09 harness proxy cleanup failure still runs owned server cleanup | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |
| RP10 one-shot timeline fault clears after one browser request | 기존 인증·fixture 또는 HTTP proxy 회귀의 실제 assertion | pass | 실행 exit 0; 원출력에 동일 행 보존 |

| 명령 | exit | 범위·시간·원출력 |
| --- | --- | --- |
| `node scripts/internal/recording_ui_driver_boundary.test.mjs` | 0 | 6/6, 도구 원출력 및 위 전수 6행 |
| `node scripts/internal/verify_v410_recording_ui_auth_prep.test.mjs` | 0 | 21/21, 27,531ms, [원출력](b10-auth-prep.log) |
| `node scripts/internal/recording_ui_range_proxy.test.mjs` | 0 | 11/11, 61ms, [원출력](b10-range-proxy.log) |

## 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 실행 소유 `media-server-current-ui-seed.MzGLsL` 및 native compile root 3개 | seed·영상·임시 인증 파일 | parent 25,476,179 bytes; 하위 compile 원출력 참조 | 각 검증기 자체 정리 | 부재 | UA08·개별 cleanup |
| 실행 소유 `s09-range-proxy-test-24rFN2` | proxy 관측기·HTTP 서버 | 1,720 bytes | 검증기 자체 정리 | 부재·소켓 종료 | RP07·cleanup |
| DB 검사 root | 가상 계정 context·임시 디렉터리 | 파일 없음 | finally 정리 | 제거 | 단위 검사 구현·exit 0 |

실제 browser UI, I30 원인 구분, 31 action 적격, 120분은 이 준비 검사의 PASS 범위 밖이다.
토큰 start/end/consumed는 별도 계측 미제공으로 미집계. 시간 source는 각 검증기 원출력이다.

## 준비 단계 정적·문서 확인

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 문법 준비기 | `node --check scripts/internal/verify_v410_recording_ui_contract.mjs` | pass | exit0 |
| 문법 자체검사 | `node --check scripts/internal/recording_ui_driver_boundary.test.mjs` | pass | exit0 |
| 공백 | `git diff --check` | pass | exit0 |
| 문서 링크 | `./server.sh verify-docs-links` | pass | exit0; failures0, local anchors202, indexed docs76 |
| 자산1 | README uses only representative product UI screenshots | pass | `verify-docs-ui-assets` exit0 |
| 자산2 | English README uses English UI screenshots | pass | 같은 명령 개별 행 |
| 자산3 | UI guide keeps product screenshots in the shared asset set | pass | 같은 명령 개별 행 |
| 자산4 | docs UI asset policy documents capture rules | pass | 같은 명령 개별 행 |
| 자산5 | managed UI asset manifest stays complete | pass | 같은 명령 개별 행 |
| 자산6 | capture script owns every documented UI asset | pass | 같은 명령 개별 행 |
| 자산7 | docs capture covers current screenshots | pass | 같은 명령 개별 행 |
| 자산8 | representative screenshot docs do not point at stale visual baselines | pass | 같은 명령 개별 행 |
| 자산9 | docs UI asset directory contains managed PNG files | pass | 같은 명령 개별 행 |
| 자산10 | VA documentation images keep full video frame bounds | pass | 같은 명령 개별 행; 합계10/0 |
