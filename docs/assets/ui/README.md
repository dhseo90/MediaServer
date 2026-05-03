# UI Screenshot Assets

이 디렉터리는 README와 `docs/ui-guide.md`에서 사용할 영상 분석 UI 스크린샷을 역할 기준 파일명으로 보관합니다.

현재 대표 이미지는 2026-05-03 light/dark theme-aware design system 1차 정리 후 dark mode 기준으로 다시 캡처했습니다.

기본 기준:

- 문서 대표 이미지는 dark mode로 캡처한다.
- 영상이 보이는 화면은 실제 객체가 있는 `va_four_scene_sample.mp4` 기준으로 캡처한다.
- 영상 프레임과 영역/라인 캔버스는 하단이 잘리지 않도록 section 경계까지 포함한다.
- Runtime Dashboard는 전체 긴 화면 대신 Health Summary, Warnings, Metadata/Backpressure가 보이는 대표 crop을 사용한다.

파일명 규칙:

- 날짜, 포트, 랜덤값을 넣지 않는다.
- 화면 역할을 기준으로 `analysis-*.png` 형식을 사용한다.
- README에는 대표 화면 3개만 사용하고, 상세 흐름은 `docs/ui-guide.md`에서 사용한다.
- LAN IP, 개인 절대경로, 외부 민감 URL이 보이는 상태로 캡처하지 않는다.
- 상단/하단에서 버튼, 입력, 카드 제목, table row가 반쯤 잘린 이미지는 문서용으로 쓰지 않는다. 긴 화면은 section 경계가 자연스러운 지점에서 대표 구간을 캡처한다.

README 대표 후보:

- `analysis-rule-list.png`
- `analysis-region-canvas.png`
- `analysis-preview.png`

UI 가이드 상세 후보:

- `analysis-rule-list.png`
- `analysis-rule-editor-basic.png`
- `analysis-rule-editor-scenario.png`
- `analysis-region-canvas.png`
- `analysis-preview.png`
- `analysis-developer-url.png`
- `analysis-runtime-dashboard.png`
