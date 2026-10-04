# v4.4.0 개발 검증

v4.4.0 로드맵의 개발 구현과 아래 단기 검증을 마쳤다. 공개 릴리즈 완료 기록이 아니다.
작업 브랜치는 `v4.4.0`, 기준 HEAD는 `df60a8dbec737d50283d9d6c66928643dc1c9666`이며
제품·문서·검사 변경은 미커밋 상태다. macOS arm64, 기존 `build-gst-onnx`의
GStreamer/ONNX/SigLIP2 활성 구성을 사용했다. 최종 제품/검사 파일 hash는
[source.json](source.json)에 둔다. 기존 바이너리/모델 의존성을 사용했고 새 설치·외부 호출은 없었다.

## 실행과 판정

사용자 지시에 따라 V440-01~05의 구현·문서·검사 정의를 작성한 뒤 최초 빌드를 실행했다.
최초 실패를 보존하고 원인 수정 뒤 영향 범위만 재검증했다. 아래 PASS는 적힌 범위에 한한다.

| 명령/대상 | 결과와 증거 | 한계 |
| --- | --- | --- |
| `cmake --build build-gst-onnx -j 4` | exit 0, [최종 빌드](build-retest-4.log) | macOS 현재 구성. Linux/다른 빌드 조합 CI 미실행 |
| `bash scripts/internal/verify_evidence_package.sh` | exit 0, [native-final.log](native-final.log), 966 assertion, peak RSS 92,094,464 bytes | 966개 독립 기능이 아니라 PNG 행/CRC 등의 반복 assertion 포함. 작은 합성 영상 단기 검사 |
| `node --test scripts/internal/evidence_ui_state.test.mjs scripts/internal/recording_search_ui_state.test.mjs scripts/internal/visual_search_ui_state.test.mjs` | exit 0, 25/25, [결과](ui-state-retest-1.log) | 제품 script 상태 검사. 실제 UI 결과와 별개 |
| `node scripts/internal/evidence_http_checks.mjs` | exit 0, 비활성·역할·scope 126 checks, [결과](evidence-http.json) | 모델 OFF |
| `bash scripts/internal/verify_evidence_package.sh --http-only` | exit 0, 활성 생성·조회·파일·Range·HEAD·권한·불량 snapshot 21 checks, [결과](evidence-http-enabled.json) | 합성 녹화의 실제 HTTP |
| `bash scripts/internal/verify_evidence_package.sh --visual-http` | exit 0, 설치된 실제 로컬 SigLIP2 검색→증거 6 checks, [결과](evidence-http-visual.json) | 대표 프레임 1개. 이 파일의 고정 `scope` 문구에 남은 model OFF는 기록 문구 오류이며 `modelInference:true`가 실제 실행값이다 |
| `bash scripts/internal/verify_recording_search_lifetime.sh` | exit 0, crypto ON 43/OFF 2, [결과](search-lifetime.log) | snapshot 300초 경계는 fixture clock으로 검사 |
| `bash scripts/internal/verify_recording_retention_v2.sh` | exit 0, GST ON 22/OFF 2, [재검증](retention-regression-retest-1.log) | 기존 pin/hold·재생·삭제 회귀 |
| current architecture graph 생성/결속, `--graph-only` | [최종 결과](architecture-final.log) | 현재 소유/의존/빌드 그래프. 역사 승인·완료 기준은 변경하지 않음 |
| release metadata, docs links, `git diff --check` | [최종 문서 검사](docs-final.log) | 로컬 문서 정합. GitHub 공개 확인·릴리즈 gate가 아님 |

Native 직접 관측은 실제 V2 녹화→정확한 sample 8개 균등 선택→독립 PNG CRC/inflate/RGB oracle,
동일 FrameLocator 재추출, 잘못된 PTS/UTC/channel/index 거부, 실제 unknown UTC의 null locator,
실제 derived service의 clip 생성·출처 연결, 원본과 clip의 실제 retention 삭제 후 패키지 reopen/동일 bytes,
원자 게시 직후 pending link 복구, partial header 정리, symlink·변조·quota·reserve·timeout·취소 거부다.
Frame index는 source packet ordinal과 대응을 추정하지 않고 미지원으로 거부한다.
기존 codec/locator 의미는 변경하지 않았다. 만료·비해당·partial·손상 실패를 서로 구분했다.

## 최초 실패와 수정

- [native-initial.log](native-initial.log): 검사 코드의 이종 initializer list 컴파일 실패. 명시적인 `vector<string>`으로 수정 후 [재검증](native-retest-1.log) 성공.
- [HTTP previousRuns](evidence-http.json): 첫 readiness에서 SIGBUS. macOS 진단의 `Thread stack size exceeded`와 HTTP handler 위치로 새 256KiB 스택 버퍼가 원인임을 확인했다. 같은 크기의 힙 버퍼로 수정해 동일 HTTP 검사를 통과했다.
- [native-retest-2.log](native-retest-2.log), [native-retest-3.log](native-retest-3.log): clip을 포함하도록 확장한 fixture의 삭제 실패. 첫 실행은 상세 원인 출력이 없었다. 다음 실행에서 `catalog retention coordinator 소유권 거부`를 직접 확인했다. fixture의 관리자를 하나로 통합하고 실제 hold snapshot을 검사했으며 [재검증](native-http-retest-4.log)의 native 부분과 최종 native가 통과했다. 제품 retention 규칙은 변경하지 않았다.
- [활성 HTTP previousRuns](evidence-http-enabled.json): disabled fixture의 동일 파일 두 번 등록이 활성 supervisor에서 거부됐다. 정제된 오류를 확보한 뒤 두 번째 소유 입력 파일로 분리했다. 이후 잘못된 snapshot 형식이 503으로 노출된 문제를 발견해 새 evidence route에서 400으로 처리하고, 올바른 형식의 만료/미존재 handle은 410으로 별도 확인했다.
- 실제 UI 첫 실행: 이미지 1·2·3·6·8만 160×90으로 표시되고 4·5·7은 naturalWidth 0, 오류 안내가 표시됐다. [화면](ui-initial-failure.jpg). 화면의 8개 동시 요청과 서버 읽기 4개 제한의 충돌로 판단해 UI만 순차 로딩으로 수정했다. 서버 제한을 완화하지 않았다. 순차 로딩·실패 시 다음 이미지·이전 화면 대기열 중단 상태 검사를 추가했고 실제 브라우저 재검증에서 8/8 정상 표시를 확인했다.
- [retention-regression.log](retention-regression.log): 기존 독립 검사 링크 목록에 `recording_catalog_snapshot.cpp`가 없어 실패했다. 해당 기존 파일만 링크 목록에 추가하여 ON/OFF 재검증을 통과했다.

## 변경 영역 실제 UI

`bash scripts/internal/verify_evidence_package.sh --ui`로 준비한 소유 로컬 서버를
Codex in-app browser에서 직접 조작했다. [준비·정리 결과](evidence-http-ui-preparation.json)의
PASS는 준비 성공이며 `actualUiPass:false`는 전체 UI gate를 판정하지 않았다는 뜻이다.

재검증에서 관리자 로그인→2026-09-12 17:00~17:01 현지 시각 검색→결과 1개→증거 보존→
완료 안내→8개 이미지 모두 complete/naturalWidth 160/naturalHeight 90→보존 목록 2개→
새 항목 상세 재조회를 직접 확인했다. 1280px 라이트와 390×844 다크에서 확인했고,
모바일 증거 section의 scrollWidth 초과가 없으며 모든 이미지가 viewport 안에 있었다.
Viewer는 Live/Dashboard 메뉴만 보였고 `/ops/events` 직접 접근은 Access Denied였다.
[라이트 화면](ui-light.jpg), [모바일 화면](ui-mobile-dark.jpg)은 당시 viewport/영역 참고 캡처이며
긴 목록 전체나 풀테스트 증거가 아니다. 합성 공 영상으로 확인했으며 4신 VA overlay·보존 clip의
브라우저 재생·원본 삭제 안내의 실제 UI는 이번 확인에 포함하지 않았다.

## 정리와 릴리즈 잔여

각 native wrapper가 소유 임시 root 부재를 확인했다. HTTP/모델/UI 서버는 종료 exit 0,
HTTP/RTSP 포트 폐쇄, UDP socket 폐쇄, 인증 저장소를 포함한 임시 root 부재를 구조화 결과에 남겼다.
최초 SIGBUS 프로세스도 종료·포트 폐쇄·root 정리를 확인했다. 생성한 브라우저 탭을 닫고
모바일 viewport override를 해제했다. 사용자 기존 파일·캐시·모델·OS 진단 원본은 삭제하지 않았다.

1. **P0 릴리즈 검증:** 승인된 공통 안정화/gate, 30분, 실제 UI 풀테스트를 실행해야 한다.
   이번 직접 UI는 변경 영역 일부이며 풀테스트 PASS가 아니다. 혼합 녹화/검색/보존 부하,
   최대 패키지·총량/동시 생성/종료 경계, 큰 저장소 목록 비용, 장시간 누수·drift,
   clip 재생·partial/삭제 안내·실제 VA 입력을 포함한 기능별 정의의 잔여 범위를 확인한다.
   120분은 미디어/수명 영향과 최종 gate에 따라 필요성을 판정하고 별도 실행 승인을 확인한다.
2. **P0 독립 검토·CI:** 별도 승인된 독립 검토와 정확한 최종 source에 대한 required CI가 남았다.
   이번 메인 검토나 이전 버전의 PASS로 대체하지 않는다.
3. **P1 기록 보존·정리:** 버전 마감 승인 후 원본 바이트의 commit/ref 보존을 확인하고
   실행 기록 정리 커밋을 별도로 만든다. 지금은 실행 결과를 삭제하거나 보존 커밋을 만들지 않았다.
4. **P1 Git/공개:** 범위별 stage/commit·push·PR·main 병합·signed annotated tag·Release는
   각각 승인과 정책 조건을 확인한 뒤 수행한다. 태그 전 VERSION/CMake/HEAD/원격/CI를 대조하고
   서명 검증, GitHub Verified, 실제 Latest·URL·원격 tag hash까지 확인해야 공개 완료다.
5. **P2 브랜치 삭제:** main 병합·태그/Release·보존·작업 트리 정리 확인 후 별도 승인으로
   로컬/원격 `v4.4.0` 종료·삭제를 수행한다. 현재 로컬 브랜치와 미커밋 변경을 유지했다.

범위 밖 VLM 판단·교차 카메라 Entity·자연어 검색·자동 evidence 만료/삭제는 구현하지 않았다.
외부 공개/브랜치 삭제는 이번 보고 요청만으로 실행 권한을 추정하지 않았다.

## 후속 릴리즈 실행

후속 사용자 지시 `릴리즈 진행. 이슈 발생시 수정 후 계속 진행`에 따라 릴리즈 준비를 시작했다.
위 개발 실행의 시각·결과·승인 범위는 그대로 유지한다. 새 검사는 별도 파일에 기록한다.
릴리즈 완료는 아직 판정하지 않았다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 단기 정적·문서·공개 준비 | 진행 대상 | 현재 cut의 Preflight/guardrails와 source-only 배포 | `.github/workflows/preflight.yml`, `licensing-artifact-guardrails.yml`, 릴리즈 정책 | 릴리즈 지시 범위 |
| build·Auth·미디어·변경 기능 회귀 | 진행 대상 | 신규 HTTP/UI·decoder·저장·종료 경로 | V440-C01/F01/F02/M01/S01/A01/R01/U01 | 단기 실행 가능, 안정화 선행 실패 시 후속 보류 |
| 30분 | 진행 대상 | 릴리즈 필수이며 새 보존 요청과 녹화/검색 병행 영향 | 릴리즈 정책, V440-R01 | 후속 사용자 `승인` 확인, 안정화 성공 후 실행 |
| 120분 | 진행 대상 | `RunMediaServerApplication`에서 새 evidence service Stop을 HTTP Stop 앞에 추가한 종료/정리 수명 변경 | `src/application/media_server_application.cpp`, V440-A01/R01 | 후속 사용자 `승인` 확인, 선행 검사 성공 후 실행 |
| 실제 UI 풀테스트 | 진행 대상 | 신규 검색 보존·상세·PNG/clip과 권한/상태/반응형 | V440-U01, 실제 UI Policy v4 | 후속 사용자 `승인` 확인, 안정화 성공 후 실행 |
| 외부 서비스·실기기 | 미진행 | 이번 source-only 변경의 승인 대상 아님 | 릴리즈 정책의 외부 실행 경계 | 승인 없음 |

단기 정적 검사는 작업 프로세스·listen port를 만들지 않는 명령부터 순차 실행하며 첫 실패에서
후속 검사를 보류한다. 원출력·command/exit·source hash는 `release-preflight-*.json`과 연결 로그에
보존한다. 이 경로는 이번 실행의 소유 결과이며 임의 삭제하지 않는다. 별도 임시 fixture를
생성하는 명령은 기존 cleanup과 부재 확인을 확인한 뒤 실행한다.

릴리즈 준비 1차 결과:

- 원격 read-only 확인: `main`은 `df60a8dbec737d50283d9d6c66928643dc1c9666`, Latest는
  v4.3.0이며 v4.4.0 remote branch/tag는 없었다. main ruleset의 required checks는
  `static-gates`, `guardrails`다. 기존 v4.3.0 tag API는 `verified=true`, `reason=valid`였으며
  이는 v4.4.0 공개 증거가 아니다.
- [1차 정적 검사](release-preflight-1.json): diff check와 script inventory는 exit 0.
  feature inventory coverage는 exit 1(7 PASS/1 FAIL): inventory hash와 변경된 HTTP/UI
  source body의 REVIEW4 결속 불일치. 후속 묶음은 실행하지 않았다.
- [소스 후보 대조](release-source-comparison.json)에서 297개 flow의 결속 변경과 6개
  모호한 anchor의 좌표 이탈을 확인했다. main 원본과 현행 코드의 anchor/context hash가
  같은 여섯 위치만 [보정](release-proof-coordinate-repair.json)했다. 독립 승인 원장·과거
  검토일·승인 digest는 바꾸지 않았다. [재대조](release-source-comparison-retest-1.json)는
  후보 준비이며 독립 승인 또는 feature gate PASS가 아니다.
- 대표 이미지의 현재 사용 대상 버전 세 필드와 안내를 v4.4.0에 맞췄다. 촬영일·검토일·
  이미지 bytes/hash·과거 공개 기준은 유지했다. [관련 재검사](release-doc-assets-retest-1.json)는
  exit 0, 10 PASS/0 FAIL이며 재촬영이나 실제 UI 검증을 뜻하지 않는다.
- [미커밋 파일 공개 준비 scan](release-working-tree-scan.json)은 개발/후속 로그의 개인 경로와
  임시 경로를 발견했다. 외부 공개 전 정제가 필요하며 현재 Git에 stage/commit/push하지 않았다.
- 후속 정제에서 해당 18개 파일의 개인/임시 경로 접두사만 `<repo>`·`<home>`·`<tmp>`로
  치환했다. [원본·정제본 hash 대조](release-path-redaction.json)에 바이트 차이를 기록했으며
  현재 파일은 원본과 동일 바이트의 증거가 아니다. 실행 시각·결과·exit·source hash는 유지했다.
  [재검사](release-working-tree-scan-retest-1.json)는 수정·미추적 텍스트 101개에서 해당 정책
  검출 0건이다. Git 전체 이력·최종 배포 트리의 공개 준비 PASS는 아직 판정하지 않았다.
  원본 바이트는 정제 중 메모리에서만 대조했고 별도 임시 파일·서버·포트를 만들지 않았다.
- 이번 실행은 서버·브라우저·listen port를 생성하지 않았다. 정적 검사와 후보 생성 프로세스는
  모두 종료했다. 실행 증거는 현재 로컬 미커밋 상태로 유지하며, 장시간·실제 UI·독립 검토는
  별도 승인 질문의 답변 대기 상태다.

후속 사용자의 `승인`으로 30분·120분·실제 UI 풀테스트와 gpt-6-astra/xhigh 독립 검토를
재개한다. 위 대기·실패 기록은 당시 상태이며 삭제하지 않는다. 독립 검토는 개발 대화가 없는
별도 담당자에게 현재 diff/신규 파일과 source-flow 후보를 전달했고, main이 수정·최종 판정을
책임진다. 서비스 tier는 실행 도구에서 지정·확인할 수 없어 적용을 주장하지 않는다.

독립 검토와 수정 결과:

- [독립 검토](release-independent-review.json)는 최초 발견·재검토를 구분한다. 실제
  `Refresh→WithPlayback`의 event 우선 clip 선택 ID가 manifest에서 빠지는 문제와,
  영상 event snapshot의 기존 연결 clip 누락을 수정했다. 대표 frame에는 event를 추정하지 않는다.
- 최초 [native 실패](release-review-fix-native-1.log)와 [직접 진단](release-review-fix-native-probe-1.log)은
  legacy job이 상세 native frame 증명을 저장하지 않는 정상 계약을 새 builder가 오해한 결과다.
  catalog의 현재 binding을 재획득한 [2차 검사](release-review-fix-native-2.log)는 통과했다.
  추가 대조를 강화한 [3차 검사](release-review-fix-native-3.log)는 삭제 원본의 public binding 조회가
  Finalized 상태만 허용해 실패했다. tombstone이 확인된 원본에 한해서 durable job의 기존 검증
  계보를 유지하도록 수정한 [4차 검사](release-review-fix-native-4.log)는 통과했다.
- 독립 검토의 native 30fps 경계 관측을 반영해 원본 PTS와 rational tick의 수치 비교를
  정확한 generation/order/track/ordinal/PTS identity로 교체했다. 실제 native clip 생성과
  GOP 의존 표본의 비연관을 포함한 [최종 빌드](release-review-fix-build-5.log) 및
  [native 재검증](release-review-fix-native-5.log)은 exit 0, 982 assertion,
  peak RSS 93,110,272 bytes, 임시 root 정리 확인이다. 테스트 중 실패를 삭제하지 않았다.
- [UI 상태 검사](release-review-fix-ui-state.log)는 25/25, [HTTP](release-review-fix-http.log)와
  [실제 로컬 모델 HTTP](release-review-fix-visual-http.log)는 exit 0이다. HTTP 실행 이후의
  수정은 event snapshot clip의 native identity 분기이며, 해당 HTTP의 구조화/대표 frame
  경로는 바뀌지 않았다. 이 증거는 실제 UI 풀테스트·장시간 검사를 대체하지 않는다.
- [정적 준비 2차](release-preflight-2.json)는 8개 명령 모두 exit 0이다. 최근 500개 커밋을
  포함한 tracked public readiness와 source-only bundle dry-run도 통과했다. 미추적 실행
  기록은 별도 정제·scan 후 보존해야 하며, 이 결과는 원격 required CI가 아니다.
- 현재 source-flow 후보는 986개 전부 해석됐고 689개는 엄격 동등, 297개는 독립 승인
  대상이다. [migration](release-source-migration-evidence.json)은 분류 근거이며 승인 자체가 아니다.
  최종 수정 파일과 바이너리 hash는 [후속 source](release-reviewed-source.json)에 둔다.

독립 source 승인 적용과 공개 형식 확인:

- [최종 검토 package](release-independent-source-package.json)와 [독립 decisions](release-independent-source-decisions.json)의 297개 개별 승인, 689개 엄격 동등 행을 기존 producer로 적용했다. [적용 출력](release-source-approval-apply.log)과 [적용 후 검사](release-source-approval-checks.json)는 source audit·승인·inventory·native UI 연결·주석·문서·diff 검사 모두 exit 0이다.
- producer가 확장한 implementation manifest는 기존 compact serializer로 되돌렸다. [형식 대조](release-manifest-format-equality.json)는 전체 parsed JSON 값의 동일성과 25MiB 이하를 확인한다. 실행 결과는 [형식 변경 후 검사](release-manifest-format-checks.json)에 둔다. 독립 승인 의미나 과거 검토 provenance는 변경하지 않았다.

구현 커밋 `eddbb684f1c1f8ebe5e681b356534600b18cc252`에 제품·테스트·현행 문서를 저장했다. 신규 파일 stage 검사에서 발견한 후행 공백 한 개는 [실패·수정 대조](release-staged-whitespace.json)대로 제거했고 재검사는 exit 0이다. 형식 변경 후 세 검사도 모두 exit 0이다.

1차 canonical acceptance는 `6127e64f`의 clean source에서 빌드와 선행 31개 feature gate를 통과한 뒤 `verify-project-inventory`에서 중단됐다. 원인은 inventory의 현재 release 목표와 VA seed의 releaseTarget이 v4.3.0인 메타데이터 두 건이다. 해당 source 목표만 v4.4.0으로 수정하고 공개 baseline v4.0.0, fixture 입력, 판정 기준은 유지한다. 30분·424 UI·120분은 not-run이며 cleanup PASS다. [최초 실패](../test-acceptance-current-final/first-failure.json)와 원출력은 재실행 전 Git에 보존한다. 경로 정제 관계는 기존 [정제 기록](release-path-redaction.json)에 연결했다.

후속 검사에서 신규 `evidence_ui_state.test.mjs`와 `verify_evidence_package.sh`의 현행 문서 참조 누락도 발견했다. 기능 목록에 실제 실행 명령과 UI 준비 경계를 추가했다. 두 메타데이터 수정의 원출력과 후속 결과는 [1차 검사](release-inventory-binding-checks.json), [수정 후 재검사](release-inventory-binding-retest.json)에 둔다. 제품 코드와 986개 독립 source 승인 값은 그대로이며 implementation manifest의 inventorySha256만 달라졌다.
