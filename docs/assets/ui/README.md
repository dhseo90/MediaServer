# UI Screenshot Assets

이 디렉터리는 README와 `docs/ui-guide.md`에서 사용할 제품 UI 스크린샷을 역할 기준 파일명으로 보관합니다.

현재 대표 제품 이미지는 2026-05-09 기준으로 다시 캡처했습니다.
재캡처는 `scripts/internal/capture_docs_ui_assets.mjs` 기준으로 관리합니다.
기준 검증은 `./server.sh verify-docs-ui-assets`로 수행합니다.

기본 기준:

- 문서 대표 이미지는 dark mode로 캡처한다.
- 영상이 보이는 화면은 `va_four_scene_sample.mp4` 4신 영상 기준으로 캡처한다.
- VA overlay가 가능한 화면은 객체 bbox/label이 실제로 표출된 상태를 캡처한다.
- 영상이 보이는 화면은 실제 출력 프레임이 보이고 하단이 잘리지 않는 상태로 캡처한다.
- 상하좌우 공백이 과하게 크거나 주요 UI/영상이 한쪽으로 치우친 이미지는 다시 캡처한다.
- 운영/개발 진단 화면은 대표 제품 화면과 섞지 않는다.

파일명 규칙:

- 날짜, 포트, 랜덤값을 넣지 않는다.
- 화면 역할을 기준으로 `ops-*.png`, `client-*.png`, `auth-*.png` 형식을 사용한다.
- README에는 대표 제품 화면만 사용하고, 운영/개발 진단과 분석 상세 흐름은 `docs/ui-guide.md`에서 분리한다.
- LAN IP, 개인 절대경로, 외부 민감 URL이 보이는 상태로 캡처하지 않는다.
- 상단/하단에서 버튼, 입력, 카드 제목, table row가 반쯤 잘린 이미지는 문서용으로 쓰지 않는다.
- 긴 화면은 section 경계가 자연스러운 지점에서 대표 구간을 캡처한다.

README 대표 후보:

- `ops-home.png`
- `ops-channels.png`
- `ops-rules.png`
- `ops-rules-preview.png`
- `ops-users.png`
- `client-live.png`

UI 가이드 상세 후보:

- `ops-dashboard.png`
- `client-dashboard.png`
- `auth-login.png`

주의:

- 개발자/진단 성격의 이미지는 대표 제품 화면으로 쓰지 않습니다.
- 제품 문서에서 사용할 때도 운영/개발 진단 맥락을 분명히 적고, 일반 사용자 화면처럼 배치하지 않습니다.
- primary nav에 없는 실시간 진단 화면은 대표 자산으로 보관하지 않고, 별도 검증 스크립트 결과로만 확인합니다.
