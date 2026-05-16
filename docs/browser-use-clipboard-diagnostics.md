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

## 보고 형식

```text
확인됨:
- 실제 클릭한 copy 버튼:
- 표시된 toast/fallback:
- 실행한 verifier:

미확인:
- Browser Use clipboard 자체 성공 여부:
- 실제 OS clipboard 내용:

판정:
- 제품 회귀: 예/아니오
- 환경 이슈: 예/아니오
```
