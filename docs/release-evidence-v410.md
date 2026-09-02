# v4.1.0 로컬 개발 증적

이 문서는 v4.1.0 단계별 구현 위치와 직접 실행한 local 검증을 기록한다. local verifier
PASS는 UI 풀테스트, 30분/120분 장시간 테스트, PR/main merge, tag, GitHub Release 또는
published metadata 완료를 뜻하지 않는다.

## V410-S00 표준·오픈소스·IP 게이트와 source baseline

- 상태: local focused PASS
- 구현 위치:
  - `VERSION`, `CMakeLists.txt`: source target `4.1.0`
  - `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`,
    `docs/development-backlog.md`, `docs/versioning-policy.md`, `docs/release-policy.md`,
    `docs/public-repo-final-review.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`:
    current source와 latest published baseline 분리
  - `config/docs_ui_assets.json`, `scripts/internal/verify_docs_ui_assets.mjs`:
    current source `4.1.0`, latest published `v4.0.0`, 기존 캡처·직접 검수 날짜 보존
  - `docs/v410-v49-recording-search-roadmap.md`: S00 완료 및 S01~S09 미착수 경계
  - `docs/research/v410-recording-storage-open-source-review.md`: 공개 표준·revision·license·참고 범위
  - `docs/research/v410-recording-ip-risk-gate.md`: 접근별 허용/재설계/보류와 clean-room 차단선
  - `scripts/internal/verify_v410_research_gate.sh`: 자료별 provenance와 IP 차단선 검증
  - `scripts/internal/verify_v410_entry_baseline.sh`: branch/source/current roadmap/published baseline 검증
  - `scripts/internal/verify_release_metadata_consistency.mjs`: source `v4.1.0`과 published
    `v4.0.0` 분리, v4.0.0 release note source 보존
  - `server.sh`: 두 focused verifier dispatch
- RED 확인:
  - `./server.sh verify-v410-research-gate`: 조사 문서 부재로 예상 실패
  - `./server.sh verify-v410-entry-baseline`: source `4.0.0`과 문서 미정렬로 예상 실패
- GREEN 확인:
  - `bash -n scripts/internal/verify_v410_research_gate.sh scripts/internal/verify_v410_entry_baseline.sh`:
    PASS
  - `./server.sh verify-v410-research-gate`: PASS, source record 8개, IP 접근 결정 5개,
    특정 특허 상세 반입 `false`, 법률 의견/FTO 대체 안 함
  - `./server.sh verify-v410-entry-baseline`: PASS, `pass=33 fail=0`
  - `./server.sh verify-release-metadata`: 최초 `source-only/live-only` 정책 문구 누락으로
    `pass=17 fail=1` FAIL, 문구 복원 후 `pass=18 fail=0` PASS
  - `./server.sh verify-docs-ui-assets`: 최초 manifest source/published pin 불일치로
    `pass=9 fail=1` FAIL, manifest와 검증 상수 정렬 후 `pass=10 fail=0` PASS
  - `./server.sh verify-script-inventory`: 최초 S01~S09 planned verifier ID가 현재 실행
    명령처럼 적혀 `pass=10 fail=1` FAIL. 가짜 dispatch를 만들지 않고 구현계획의 미래
    명령을 `planned-command`로 명시한 뒤 `pass=11 fail=0` PASS
  - `./server.sh verify-docs-links`: PASS, Markdown 218개, local link 979개, failure 0
  - `git diff --check`: PASS
- 미실행: 제품 build, 안정화 묶음, UI 풀테스트, 30분/120분 장시간 테스트,
  external TURN/WHEP, ONVIF 실기기, 외부 VLM/provider, published metadata
- 비범위: V410-S01~S09 기능 구현, 녹화 API/schema/media path/UI 변경
- 영향 범위: source/release metadata, 공개 문서, 조사 기록, local verifier dispatch만 변경.
  C++ 제품 로직, 기존 API/schema/event payload, RTSP/WebRTC media path, 제품 UI 동작은 변경하지 않음
- 회귀 가능성: current source/published tag 분리 문구와 UI asset manifest pin drift. S00 entry,
  release metadata, docs UI asset, docs link, script inventory verifier로 방어
