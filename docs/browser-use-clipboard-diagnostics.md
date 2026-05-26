# Browser Use Clipboard Diagnostics

이 문서는 Codex 인앱 Browser Use 환경의 clipboard 한계와 제품 UI의
clipboard fallback 회귀를 분리해서 판단하기 위한 기준입니다.

## 증상

다음 메시지는 제품 UI가 아니라 브라우저 자동화 환경에서 먼저 확인합니다.

```text
Browser Use virtual clipboard is not installed
```

이 메시지가 보이면 자동화 도구가 가상 clipboard를 준비하지 못한 상태일 수
있습니다. 이 상태만으로 `/ops/dashboard` 링크 복사, client copy action,
Rule WebRTC 링크 복사를 제품 회귀로 판정하지 않습니다.

## 구분 기준

| 항목 | 제품 회귀 후보 | Browser Use 환경 후보 |
| --- | --- | --- |
| 실제 브라우저 수동 클릭 | 복사 실패 또는 fallback 미표시 | 정상 동작 |
| `verify-ops-click-e2e` clipboard 실패 주입 | fallback toast 실패 | 통과 |
| Browser Use copy/paste action | 제품 UI와 무관하게 실패 | `virtual clipboard is not installed` |
| `data-*` copy payload | source/debug/raw 정보 포함 | payload 자체는 정상 |

## 진단 순서

1. 자동화 오류 메시지에 `Browser Use virtual clipboard is not installed`가 있는지 확인합니다.
2. 제품 UI에서 직접 `링크 복사` 또는 copy 버튼을 클릭합니다.
3. 실패 toast가 뜨면 문구가 사용자를 수동 복사 경로로 안내하는지 확인합니다.
4. `./server.sh verify-ops-click-e2e`를 실행해 강제 clipboard 실패 주입과 fallback toast를 확인합니다.
5. client/viewer 화면의 copy payload에 source URL, Developer URL, raw JSON, debug counter가 섞이지 않았는지 확인합니다.

## Browser Use 환경 보정

- Browser Use 가상 clipboard 설치/활성화가 가능한 환경이면 먼저 보정합니다.
- 보정이 불가능하면 입력은 실제 key press 또는 Computer Use 클릭으로 진행합니다.
- 제품 fallback 검증은 Browser Use clipboard 성공 여부가 아니라 UI toast, fallback textarea, copy payload 비노출 기준으로 판단합니다.
- Browser Use 환경 문제로 실행하지 못한 항목은 `미확인` 또는 `건너뜀`으로 보고합니다.

## Browser/Computer Use fallback 절차

수동 UI evidence는 실제 화면 조작을 기준으로 남깁니다. Browser Use, Chrome,
Computer Use가 같은 화면을 서로 대체할 수는 있지만, raw JSON/API-only 확인은
수동 UI 클릭 evidence가 아닙니다.

1. Codex 인앱 Browser Use로 대상 route를 열고 직접 click/type을 시도합니다.
2. password field, clipboard, local fetch/CDP, focus, permission 오류가 나면
   tool 이름, route, selector 또는 화면 영역, 마지막으로 직접 확인한 상태를 기록합니다.
3. 같은 throwaway fixture에서 Chrome 직접 조작을 시도합니다. 로그인/session이 다른
   프로필에 묶이면 기능 결과 행은 `FAIL`로 남기고, 환경 제한 사유를 별도 기록합니다.
4. Browser/Chrome이 field 입력이나 클릭을 완료하지 못할 때만 Computer Use로 보이는
   화면을 클릭/입력합니다. 비밀번호 원문, invite token 원문, session cookie,
   OS clipboard 내용은 기록하지 않습니다.
5. Computer Use도 완료하지 못하면 자동 smoke 결과를 `대체 검증`으로만 기록하고,
   수동 UI 항목의 기능 결과 행은 `FAIL`로 닫습니다. 사용자가 명시 제외한 항목만
   결과 행에서 빼고 별도 `제외 기록`에 남깁니다.
6. 수동 UI 완료 보고에는 실제 클릭한 화면과 자동 smoke로 대체 확인한 항목을 분리합니다.

fallback 후에도 제품 회귀로 볼 수 있는 경우는 같은 fixture에서 실제 화면 클릭이
가능했는데도 UI toast/fallback, redirect, 비노출 기준이 깨진 경우입니다.
도구가 화면을 조작하지 못한 것만으로 제품 회귀라고 단정하지 않습니다.

## 보고 형식

```text
확인됨:
- 실제 클릭한 copy 버튼:
- 표시된 toast/fallback:
- 실행한 verifier:

미확인:
- Browser Use clipboard 자체 성공 여부:
- 실제 OS clipboard 내용:
- Browser/Chrome/Computer Use 실패 지점:
- raw JSON/API-only 대체 여부:

판정:
- 제품 회귀: 예/아니오
- 환경 이슈: 예/아니오
```
