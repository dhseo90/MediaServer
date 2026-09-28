# S11 녹화 UI 일부 실행·실패 기록

독자: v4.1.0 검증·릴리즈 담당자. 수명: S11 실패 이력 보존. 정책은 `AGENTS.md`,
사전 정의는 `docs/manual-ui-result-template.md`를 따른다. 실제 브라우저 조작의
대화 도구 관측을 정리한 것이며 screenshot/trace 저장소 증거가 없어 Policy v4
개별 적격이나 전체 432개 PASS가 아니다.

실행 환경: source `4fc1b768`, 바이너리 SHA-256
`6c2149d468bb7f86cb29f1d683eec6cb21c7f2b383e0c4619fe4f35db2a6aabc`,
macOS arm64, Codex 인앱 브라우저, 격리된 로컬 server.
인증-off 기능 fixture 명령은
`node scripts/internal/verify_v410_recording_ui_contract.mjs --ui-direct --ui-anchor-utc-ms 1790387894111 --ui-seek-fixture`였다.
인증 fixture는 같은 anchor의 `--ui-auth-direct`로 별도 기동했으나 실제 로그인 전 종료했다.
두 fixture 준비기는 `actualUiPass=false`로 보고하므로 브라우저 조작 PASS와 혼동하지 않는다.

## 실행 결과

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등) |
| --- | --- | --- | --- |
| I27 정상 필터 | `/ops/events` 채널1, 현지 2026-09-26 10:57~11:00 입력·조회 | pass | 시간 확인115·첫 페이지100, 선택 영상 반영. UI 보존 screenshot/trace 없음 |
| I27 빈값·빈 결과 | 시작값 제거 후 native required 검증; 채널2 조회 | pass | valueMissing=true, 채널2 목록0·빈 결과 안내. UI 보존 screenshot/trace 없음 |
| I27 역전 시간 | 11:01~11:00 입력 후 조회 | pass | 올바른 시작·종료 시간 안내, 선택 영상 해제. UI 보존 screenshot/trace 없음 |
| I27 페이지 | 채널1 다음·이전 조작 | pass | 100행→15개 중14표시(겹친 원본 숨김)→100행. UI 보존 screenshot/trace 없음 |
| I28 이벤트 우선 | 겹친 event 기본 선택·우선 표시 | pass | 선택부에 `이벤트 우선`·작업 완료·부분 구간, 상시 원본과 분리. UI 보존 screenshot/trace 없음 |
| I29 원본 | 두 번째 페이지의 원본 보기 체크·원본 버튼 선택 | pass | 14→15표시, `상시녹화 원본` 및 중첩 구간, 1초 MP4 metadata. UI 보존 screenshot/trace 없음 |
| I30 실제 재생 | 10초 H.264 MP4 원본 선택 후 영상 control의 Space 재생 | pass | 1280×720·readyState4, paused=false, currentTime 0.129→7.741초. UI 보존 screenshot/trace 없음 |
| I30 일시정지 | Space 후 pause 상태 확인, 이어 내장 버튼 조작 | fail | paused=false 관측 후 인앱 탭 `This page crashed`; 원인 미확정. 같은 조작 반복하지 않음 |

위 7개 관측 pass도 저장소에 screenshot/trace/브라우저 provenance가 완비되지 않아
릴리즈 UI 증거로 사용하지 않는다. I30 실패를 후속 PASS로 덮지 않는다.

## 미실행·미확인

| 제목 | 테스트내용 | 상태 | 사유·완료 evidence 경계 |
| --- | --- | --- | --- |
| I30 탐색 | native seek·시간/화면·Range206 | 미실행 | 탭 충돌 뒤 중단; 재생 PASS로 대체 불가 |
| I31 partial | 부분 구간·재생 가능 | 미실행 | 탭 충돌 뒤 중단 |
| I31 삭제 | 삭제 fixture 재생 차단 | 미실행 | 탭 충돌 뒤 중단 |
| I31 손상 | 손상 fixture 재생 차단 | 미실행 | 탭 충돌 뒤 중단 |
| I31 미완결 event | Pending link·출력 없음 | 미실행 | 탭 충돌 뒤 중단 |
| I31 공백 | 영상 선택 해제·오인 재생 방지 | 미실행 | 탭 충돌 뒤 중단 |
| I31 오류 | 조회 오류·stale 상태 처리 | 미실행 | 탭 충돌 뒤 중단 |
| I32 quota | 상시/이벤트 용량·상한 | 미실행 | 탭 충돌 뒤 중단 |
| I32 활성 | 실제 on/off·상태 카드 | 미실행 | 탭 충돌 뒤 중단 |
| I32 blocked | storage-blocked 안내 | 미실행 | 탭 충돌 뒤 중단 |
| I33 navigation | primary nav·배치 | 미실행 | 탭 충돌 뒤 중단 |
| I34 admin | 실제 admin 로그인·자료 접근 | 미실행 | 임시 자격증명 파일의 브라우저 접근이 보안 정책에 차단됨. 우회하지 않음 |
| I34 operator scope | 실제 operator 허용/거부 | 미실행 | 실제 로그인 전 중단 |
| I34 viewer·미인증 | 각 세션 접근 제한 | 미실행 | 실제 로그인 전 중단 |
| I34 redaction | 역할별 민감 정보 비노출 | 미실행 | 실제 로그인 전 중단 |
| I34 320 light | video/form·focus·접근성 | 미실행 | 탭 충돌 뒤 중단 |
| I34 320 dark | video/form·focus·접근성 | 미실행 | 탭 충돌 뒤 중단 |
| I34 390 light | video/form·focus·접근성 | 미실행 | 탭 충돌 뒤 중단 |
| I34 390 dark | video/form·focus·접근성 | 미실행 | 탭 충돌 뒤 중단 |
| I34 760 light | video/form·focus·접근성 | 미실행 | 탭 충돌 뒤 중단 |
| I34 760 dark | video/form·focus·접근성 | 미실행 | 탭 충돌 뒤 중단 |
| I34 1180 light | video/form·focus·접근성 | 미실행 | 탭 충돌 뒤 중단 |
| I34 1180 dark | video/form·focus·접근성 | 미실행 | 탭 충돌 뒤 중단 |

## 원인 경계와 정리

인앱 탭 충돌 직후 제품 서버 PID 21466은 TCP 63053 LISTEN을 유지했고 별도
`GET /ops/events`가 HTTP 200이었다. 이는 제품 프로세스 종료가 아니라 브라우저
탭 충돌이라는 구분만 확정한다. 브라우저 내장 영상 버튼·렌더러·제품 리소스 중
어느 원인이었는지는 미확정이다. timeout이나 PASS 기준을 바꾸지 않았고 같은
실패 동작을 재시도하지 않았다.

인증-off fixture는 exit0, PID 21466 정상 종료, RTSP63052/HTTP63053 닫힘,
격리 root 약 15.3MB 삭제를 확인했다. 인증 fixture도 exit0, PID 21316 정상 종료,
RTSP62936/HTTP62937 닫힘, proxy62969 LISTEN 없음, 임시 계정 파일 및 격리 root
약 31.8MB 부재를 확인했다. 충돌한 인앱 탭은 브라우저 URL 정책이 닫기 호출을
거부해 명시적 종료 확인 불가이며 작업 종료 시 자동 임시 탭 정리 여부는 미확인이다.

후속 읽기 진단에서 Codex 앱 로그의 2026-09-26T02:14:22.396Z 항목은
탭13 `render process gone`, `reason=crashed`, `exitCode=5`를 확인했다.
renderer 충돌 계층은 확정하되 내부 유발 원인을 제품 또는 브라우저 버그로 단정하지 않는다.
같은 진단에서 인앱 탭 목록이 빈 배열임을 확인해 탭 잔존의 cleanup 미확인은 해소했다.
공통424 실행기와 달리 이번 직접 조작의 screenshot/trace 보존과 안전한 인증 연결을
먼저 준비하지 못한 것은 실행 준비 결함으로 분리한다. 관련 보완은 중앙 기록 B10이다.

token start/end/consumed는 전용 집계가 없어 미집계다. source는 실제 브라우저
접근성/DOM 관측, fixture 종료 원장 및 로컬 HTTP·LISTEN 대조다.
