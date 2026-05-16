# Manual UI Checklist

이 문서는 자동 smoke가 아니라 사람이 브라우저에서 직접 눌러 확인하는
v1.2.0 제품 UI 체크리스트입니다. 자동 검증 결과를 대체하지 않고,
`verify-ops-client-ui`, `verify-auth-*`, `verify-rule-ui` 이후 마지막 육안
검수 기준으로 사용합니다.
결과 기록은 [manual-ui-result-template.md](./manual-ui-result-template.md)를
사용해 `확인됨`, `미확인`, `건너뜀`을 분리합니다.

## 1. 공통 준비

- 서버는 검증 전용 포트와 임시 users/source/view 파일로 띄웁니다.
- auth on 검증은 `MEDIA_SERVER_AUTH_MODE=auto`에서 admin을 직접 생성합니다.
- UI smoke 전용 HTML selector 검증은 `MEDIA_SERVER_AUTH_MODE=off` 서버에서
  `./server.sh verify-ops-client-ui --screenshots`를 별도로 실행합니다.
- destructive action은 운영 데이터가 아닌 throwaway fixture 계정과 요청만 사용합니다.
- 실행하지 않은 화면, 건너뛴 destructive action, 실패한 테스트는 완료로 표시하지 않습니다.
- Browser Use clipboard 오류는 [browser-use-clipboard-diagnostics.md](./browser-use-clipboard-diagnostics.md)
  기준으로 제품 회귀와 환경 문제를 분리합니다.

## 2. Auth Shell

- `/setup`: 약한 비밀번호가 거절되고, 강한 admin 비밀번호 설정 후 `/login`으로 이동합니다.
- `/login`: admin 로그인은 `/ops/home`, viewer 로그인은 `/client/live`로 이동합니다.
- `/password/change`: reset 또는 must-change 계정에서 새 비밀번호 설정 flow가 보입니다.
- `/lab`, `/lab/rules`, `/lab/import`: 제품 화면으로 열리지 않고 404 상태를 유지합니다.

## 3. Ops

- `/ops/home`: 운영 구성, 실시간 상태, 최근 이벤트 요약이 겹침 없이 보입니다.
- `/ops/dashboard`: root cause, incident timeline, VA quality, scenario timeline panel이 열립니다.
- `/ops/sources`: source/PubishedView 목록, ONVIF/WHEP 입력, detail panel, audit export가 동작합니다.
- `/ops/rules`: VA/Event/Profile tab, 저장 전 validation, preview geometry가 동작합니다.
- `/ops/users`: 사용자 상세, 저장, reset password, disable/restore, 마지막 admin 보호를 확인합니다.
- `/ops/users`: 접근 요청 table에서 pending 요청, 승인 채널 ID, 승인 invite 출력, 거절 상태를 확인합니다.
- `/ops/events`: evidence policy, evidence filter, include archives, prev/next, signed bundle export를 확인합니다.

## 4. Client

- `/client/live`: Live/Dashboard nav만 보이고 Ops/Lab nav, source URL, raw JSON, debug counter가 보이지 않습니다.
- `/client/live`: tile start/reconnect/stop, density, copy fallback, keyboard focus 이동을 확인합니다.
- `/client/dashboard`: 상태/이벤트 비교, 정렬, copy action이 viewer 범위 안에서 동작합니다.
- `/client/request-access`: 요청 제출 후 승인 전 로그인/채널 접근이 열리지 않는다는 문구가 보입니다.
- 승인된 요청은 invite setup 전 로그인 401, invite setup 후 `/client/live` 접근 200, `/ops/home` 접근 403을 확인합니다.

## 5. 반응형/테마

- 320px, 390px, 760px, 1180px에서 nav, table row action, form input, button text가 부모 폭을 넘지 않습니다.
- light/dark 전환 후 shell, card, table, form, badge contrast가 유지됩니다.
- client/viewer 화면에는 운영자 debug details 또는 raw JSON이 노출되지 않습니다.

## 6. 종료 보고

수동 검수 보고에는 다음 항목을 분리합니다.

- 확인됨: 실제 클릭한 화면, 통과한 명령, 생성한 fixture, 수정/커밋 파일
- 미확인: 열지 않은 화면, 실행하지 않은 장시간 테스트, 추정 원인
- 건너뜀: destructive action을 fixture가 없어 수행하지 않은 경우
- 푸시: 명시 요청 전에는 수행하지 않고, 푸시 가능 여부만 보고합니다.
- 템플릿: [manual-ui-result-template.md](./manual-ui-result-template.md)
