# 주석 검사 회귀의 고정 입력

CC03 승인과 CC01 원장의 기존 원본을 CI에서 읽을 수 있게 보존한 fixture다. 새 승인이나 실행 결과를 만들지 않는다. 승인 기록·사용자 요청문은 `../../../config/code-comment-approval/`에 있다. 그 안의 과거 절대 경로는 출처 정보이며 현재 파일을 읽는 경로가 아니다.

- `contract.json`: 정확한 역사 finding 5건의 승인 계약 원본.
- `findings.json.gz`: CC01 1280건 원장 전체 바이트의 무손실 gzip. 회귀에서 해제한 전체 SHA256을 기존 anchor와 대조한다.
- `prior-checker.mjs.txt`, `prior-policy.json`: 기존 검사 범위와 정책을 대조하는 원본. 검사기를 실행하지 않는다.
- `python-original.py.txt`: CC01-0578 문자열 과검출과 실제 주석을 재현하는 원본. 모듈을 import하거나 제품을 실행하지 않는다.

원본 바이트를 주석 정리 대상으로 편집하지 않는다. 경로 이동은 승인 범위를 바꾸지 않으며 일반 Source 위반 면제를 추가하지 않는다.
