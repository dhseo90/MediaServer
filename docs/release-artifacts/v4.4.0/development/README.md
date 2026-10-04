# v4.4.0 개발 검증

> 최신 상태는 아래 「중단 후 테스트·릴리즈 잔여 재산정」을 따른다. 본문의 이전 미커밋·승인·실행 예정 문구는 당시 기록이며 현재 실행 허가가 아니다.

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

## PR #77 후속 수정과 검증

사용자는 PR #77의 리뷰 6건을 v4.4.0에 포함하고, 실행 중인 원래 릴리즈 테스트를 중단하지
않도록 지시했다. 원래 `v4.4.0`/`7895831`의 실행은 유지하고 분리 worktree에서 수정했다.
아래 결과는 수정된 source hash·실제 runtime archive에 대한 단기 관측이다. 이전 HEAD의
장시간·공통 UI 결과를 이 수정의 PASS로 바꾸지 않는다. 현행 final integrity gate는 동일
HEAD를 요구하므로 최종 코드 고정 뒤 새 canonical 묶음이 필요하다.

| PR 리뷰 | 반영 범위 | 직접 단기 검증 |
| --- | --- | --- |
| 4176918446 | 요청 채널별 EventFacts 수집, 요청 채널 전체 20,000행/8MiB 유지 | 타 채널20,001행이 있어도 검색/seek 성공, 선택 채널 및 두 선택 채널 합산 상한 거부 |
| 4176918451 | 재색인 실패 시 이전 완성본을 ready로 유지, 정제된 갱신 오류 안내 | 실제 cache 저장 실패 후 이전 결과 검색, 최초 실패503, worker 성공/실패/취소/예외 자원 해제 |
| 4176918462 | SigLIP2 활성 구성에서 GStreamer 필수 | 비지원 구성 configure 거부, 지원 구성 실제 빌드·frame 검색 |
| 4176957099 | snapshot 손상·I/O 실패는 전체 수집 실패, 정상 미지원/삭제는 명시 제외 | JPEG·manifest·symlink 실패와 docs/coverage 보존, missing/null proof·manifest-only·정상 삭제 제외, 실제 실패 후 복구 |
| 4176957106 | SigLIP2 활성 구성에서 OpenSSL 필수 | 두 discovery 경로 모두 없으면 거부, CMake fallback 성공, crypto OFF proof 안전 실패 |
| 4176957112 | 요청/단일 Rebuild의 물리 증명 재사용, 현재 원장·파일·권한 재검 유지 | 파일/원장 변조·교체·fork/owner 거부, append/회전 strict 재획득, hold/취소/출력 불변, 실제200결과 |

[구성 검사](pr77-cmake-1.json), [최종 원장/source/application 단기 검사](pr77-focused-7.json),
[other-row 수정 재검](pr77-proof-9.json), [snapshot 경계 검사](pr77-boundaries-10.json)에 명령·exit·source와
원출력을 연결했다. 독립 검토가 지적한 `other-row` 입력 중복은 기존 해당 증거만 무효로 기록하고,
별도 원장 행을 추가해 그 행을 훼손하는 입력으로 다시 통과했다.

사용자 결정에 따라 최초 색인 준비 **45초**, 검색 **5초**, 실제 결과 **200개**를 유지했다.
처음에는 물리/native 증명, 원장 파싱, 프레임 순차 decode, 단일 CPU 연산이 누적돼 실패했다.
[단계별 직접 측정](pr77-stage-profile-1.json)과 [연산 스레드 비교](pr77-thread-profile-1.json) 뒤
현재 파일 결속·행 읽기/SHA를 유지한 private immutable proof, 정확한 이전 keyframe seek,
단일 추론을 유지한 세션 내부 ORT 4/1 연산을 적용했다. 실패 원출력은 focused1~6에 남겼다.
Focused6의 최초 색인은 통과했으나200개 검색은503이었고, 이를 최종 통과로 덮어쓰지 않았다.

Focused7은210개 실제 frame 색인 준비31.9405초,200개 결과3회 각1087.29/1078.36/1053.5ms,
네 동시 검색24회 p95 247.289ms/max277.196ms, process peak RSS3,214,442,496bytes였다.
[동일 입력 연산 비교](pr77-siglip2-parity-6.log)는12개embedding/8개token 값이 일치했고,
[기존 고정24개 질의](pr77-retrieval-8.json)는16개 positive의 Hit@1/MRR1.0과 기존 latency/RSS 기준을 통과했다.
cache8MiB는 추정 보관량의 논리 상한이며 전체 RSS·임시 파싱·응답 hold의 총량이 아니다.
completion trace의 preparation/reuse는 물리 디스크 읽기 byte량이나 전체 FD 수가 아니다.

실제 Chrome의 실패 안내/검색과 증거 보존·권한·반응형·실제 만료 사례, 변경 경로 혼합 장시간,
새 source canonical 묶음, 최종 CI·공개는 아직 진행 대상이다. 소유 PR77 임시 fixture와 격리
worktree는 후속 검증·증거 보존을 위해 유지 중이며 cleanup 완료를 주장하지 않는다.


[실제 캐시 경계 재검](pr77-cache-boundaries-12.json)은446 assertion을 통과했다.
8MiB/200개 LRU eviction 뒤 원본 재검증·응답 hold·FD 해제와 단일 oversized uncached 경로를 확인했다.
첫11회는 fixture 설명900,000자가8MiB 증명에 못 미쳐 실패했고,
공개1MiB JSON 계약 내1,047,552바이트 입력으로 보정한12회에서 실제 비용8,408,012바이트를 관측했다.
제품 상한은 변경하지 않았다. 검증 wrapper의 예외 시 오보고 경로도 수정했으며
[missing-build 오류 검사](pr77-cache-wrapper-missing-build-13.json)는 미실행FAIL·소유 root 정리를 확인했다.

[정상 실제UI](actual-ui-normal-2.json) 10개 action, [보존 clip/partial/손상](actual-ui-rich-3.json) 3개,
[비활성](actual-ui-disabled-1.json) 1개가 native Chrome와 메인 시각 확인을 통과했다.
실제301초 만료, 권한 차단,320/390/760/1180 light/dark, PR77 재색인 실패 뒤 이전 결과 검색을 포함한다.
전체424 canonical UI를 대체하지 않는 변경 영역 addendum이다. 합성 공 영상을 사용했고4신 VA overlay는 이 추가검사 범위가 아니다.
최초normal의 늦은 응답 route handler 순서 오류는 [실패 기록](actual-ui-normal-1.json)에 남겼다.
rich1/2의 native 방향키 끝 탐색 가정 오류는 각각 기록을 보존하고, 실제 End 키로 재검했다.
각 서버·Chrome 종료와 HTTP/RTSP/UDP 폐쇄·격리 인증 root 부재를 확인했다.
변경 경로 혼합 장시간·최종 source canonical 묶음·required CI·공개는 여전히 미완료다.


혼합 준비에서 발견한 실제 GStreamer `<64hex>/001` track ID의 증거 manifest 거부를 수정했다.
원본 source binding의 기존 nonempty/1024byte/control-free 계약에 frame track 검사만 맞췄으며,
파일 참조 ID와 자산 경로·권한·시간·생성 상한은 그대로다. [수정 전 RED](evidence-track-red-1.json)는
실제 생성에서 `evidence-invalid-manifest`였고, [재검증](evidence-track-green-3.json)은1028 assertion을 통과했다.
GREEN2는 새 track과 fixture event 참조의 기존 `video-0` 불일치로 clip 단계에서 실패했으며 결과를 보존했다.
독립 읽기 검토는 source binding 계약 동일성과 track이 경로에 사용되지 않음을 확인했다.
이 codec 수정은 기존 UI 표시·역할·만료 계약을 바꾸지 않아 해당 UI addendum을 유지한다.
실제 stream track의 생성·보존은 새 native/혼합 검사로 보완하며 최종 source 전체 묶음은 별도다.

[혼합 준비 원출력](mixed-preparation/preservation.json)은 최초 quota/삭제 시점 입력 오류와 실제 제품 실패를 분리한다.
64KiB quota가64MiB 생산 write 예약보다 작았던 입력 오류,64KiB 보관 여유분에서 약2초 만에 삭제된
색인 원본, 실제 track manifest 거부, 아직 보관 중인 원본을 삭제 확인 대상으로 선택한 실패를 남겼다.
제품 quota·45초 색인·5초 검색 기준을 변경하지 않았다. 입력을256KiB 보관 여유분으로 설정하고
관측된 오래된 live visual 원본을 선택한 [단기6회](mixed-preparation/mixed-short-6/execution.json)는
30.1285초 관측과111 assertion을 통과했다. 네 client 각2회 검색, 실제 시각 결과40개,
시각·구조화 증거 각1개, 원본 삭제와 두 패키지의 재시작 후 manifest/PNG 불변을 확인했다.
세 프로세스·포트·UDP 종료와 해당 소유 root 부재를 확인했으나, 실패 진단 root들은 증거 보존 후 정리가 남아 있다.
이 결과는 장시간 PASS가 아니다. 동일 고정 binary의 승인된30분 혼합 검사를 이어 실행한다.


[혼합30분 첫 실행](mixed-preparation/mixed-30-7/execution.json)은 약405초 관측에서5초 요청 timeout으로 실패했다.
성공 검색 지연도 최대4161.99ms로 증가했으며 전체30분 PASS가 아니다. 소유 서버·HTTP/RTSP/UDP는 종료했고 실패 저장소는 진단용으로 유지했다.
[수정 전 저장소 복사본](mixed-preparation/mixed-profile-8/execution.json)에서 재생 후보 조회는932~951ms,
실제로 소비하지 않는 continuous 삭제 이력을 포함한 full timeline6654행을 만들었다.
private 이벤트 후보 경로에서 이 행 생성만 생략하고 관련 job·원본·출력 strict 검증과 현재 authority/source guard는 유지했다.
[수정 후 같은 저장소 복사본](mixed-preparation/mixed-profile-9/execution.json)은 후보2.17~2.26ms,
공개 full timeline6654행/922~942ms로 관측됐다. 별도 archive의 사용하지 않는 과거 continuous 상세는 lazy 검증하며,
full timeline이 해당 상세를 소비해 손상을 검출한 뒤에는 후보도 권위 상실로 거부한다.
[직접 회귀](pr77-playback-7.json)는27항목 PASS: 기존 full timeline과 후보/공개 JSON의 동일성,
intent/partial/미배치/누락복구/원본·출력삭제/타채널/실제B전환·재개방/관련 archive cold·warm 손상과 전체 출력 불변을 확인했다.
앞선1~5회 fixture 실패(512mapping 상한, 비허용 삭제 사유, 압축·봉인 원장 파일 선택)를 각 원출력에 보존했다.
기존 job 원장 손상 검증은pr77-proof-9이며, 신규 B 검사는tombstone archive를 대상으로 한다.
공개 JSON 비교는 후보 호출 전후 비교이고 이전 바이너리 JSON과의 비교는 아니다.
내부 completion trace는 기존 구조 정책이 허용한 RecordingReadService adapter에서 같은 시점/필드로 기록한다.
구조1/2 실패는 금지된 직접 include였으며, 정책을 완화하지 않은 [구조3](pr77-structure-3.json)에서 현재 graph 생성·결속을 통과했다.
[혼합 준비 실패 root 정리](mixed-preparation/cleanup.json)는1~5회 root 부재를 확인했다. 이후 실패/진단 root는 추가 보존·정리 대상이다.

[최종 독립 소스 검토](pr77-independent-final.json)는 위 source/test diff hash에서 추가 릴리즈 차단 결함을 발견하지 못했다. 메인이 같은 diff와 신규 cache 파일 hash를 대조했다. 혼합30분·최종 canonical·CI 통과를 뜻하지 않는다.
[공개 timeline](pr77-public-timeline-1.json)66개와 [실제 derived seek](pr77-derived-seek-1.json)10개 회귀를 통과했다. [계측 adapter](pr77-trace-adapter-2.json)는 두 reference hash·시간·카운터를 확인했다. 첫 adapter1의 상대시계 최초값0을 금지한 fixture 가정은 실패로 보존하고 기존 begin≥0 계약에 맞춰 재검했다.


제품 수정은 `5f124c9be5b49f5128e93135da24fa024342f78e`(실제 track ID codec),
`505b2dac45fcccecda5423bb7921b4fc5aa97576`(PR77와 검색 후보 비용)에 반영했다.
원본 checkout과 격리 worktree의 제품 binary SHA는
`4eaf41faebabb057958b3d9fcf55a2ceafb08b6eabd6baa024e7039c9b70314d`로 같았다.

[수정 후 혼합30분](mixed-preparation/mixed-30-9/execution.json)은 실제 관측1801.522초,
5798 assertion PASS/0 FAIL이었다. 4 client 성공 검색482회(p95 732.531ms/max1033.073ms),
명시503 2회, structured 생성120회(complete116/partial4), visual 생성120회를 관측했다.
2채널 합계1796개 확정/1782개 삭제, 선택 원본의 실제 삭제 뒤 보존 manifest/PNG와 재시작을 확인했다.
프로세스 RSS 최대3,190,276,096bytes와 fixture 한도는 통과했다. 5분 warmup 이후25분 RSS는
67,354,624bytes 증가했고 평탄 구간은 확인하지 못했다. FD 변화1/thread 변화0이며,
자동 `resourceTrendPass:false/reviewRequired:true`를 수동으로 덮어쓰지 않는다.
[메인·독립 자원 검토](mixed-preparation/mixed-30-9/assessment.json)는 최종 canonical 실행 전에
수정해야 할 새 제품 결함을 확인하지 못했다. 최종 30·120분 결과와 자원 추세의 판정은 남아 있다.
원출력은 해당 run.log, receipt와 [복사 대조](mixed-preparation/copy-8-9.json)에 있으며 소유 서버/포트/root는 정리됐다.

[고정 데이터 진단](mixed-preparation/memory-fixed-10/assessment.json)은 준비45초를 유지해27.227초,
200개 검색23회 최대1242.07ms였다. query5~23의 요청/응답 임시 객체 해제 후 live heap은32bytes 범위였다.
[저장 이력 분리](mixed-preparation/memory-history-13/assessment.json)는 모델 없이200회 확정/삭제와
fresh B 재개방(live1/deleted200)을 확인했고 owner 파괴 후 heap은 최초/재개방 모두3,629,408bytes였다.
앞선11/12의 잘못된 V1 예약/Replay fixture 호출 실패는 원출력과 failure-cause에 남겼다.
[디코딩·추론 분리](mixed-preparation/memory-decode-14/assessment.json)는 worker embedding 재사용 없이
실제 DecodeVisualFrame/EncodeRgb100회와 각768차원/정규화 결과를 확인했다.
세 진단은 저장 이력·할당 예약과 검색/디코더 수명을 구분하는 단기 근거다. 원래30분의64.23MiB를
특정 원인에 전부 귀속하거나 전체 누수 없음/120분 완료로 승격하지 않는다. 각 소유 임시 root는 제거됐다.

녹화 UI는 [3회차 시각 판정](pr77-recording-ui-3-visual.json)의31개 조작/57장 직접 검토로 마쳤다.
검색 UI는 [3회차](pr77-search-ui-3-visual.json)의38개 조작과106장 검토 중 확인된 캡처 누락을
[4회차](pr77-search-ui-4-visual.json)의38개 재조작/24장 보완 시각 확인으로 연결했다.
동일 제품의 무관한3회차 시각 근거는 유지하고, 파생0초 frame·오류 전체 player·마지막 결과·페이지 버튼·epoch 상태만4회차로 보완했다.
4회차129장 전체를 다시 직접 봤다는 뜻은 아니다. 앞선 recording1/2 및 search1/2의 실패·부분 증거도 보존했다.
선택자는 결과 hit만 세도록 고치되 오류/늦은 응답의 모든 button0 검사는 유지했다.
보완은 `716edc9132a3679f128c44f21a99621ce80dad56`의 검사 도구4파일뿐이며 제품 코드는 바뀌지 않았다.
[도구 자체검사](pr77-ui-runner-unit-2.log)는10항목 PASS이고 각 실행 서버/브라우저/포트와 복사 완료 임시 output은 정리됐다.
이 UI addendum은 canonical424와 별개다. 기존 canonical의7895831 소스 결과는 수정 후 소스의 최종 PASS가 아니며,
영향 경로의120분·정적 마감 검사·required CI·공개는 아직 남아 있다. 사용자는 현재 development와 test-acceptance-current-final 자료 및
같은 두 경로의 최종 재검증 자료를 누적1GiB 이내로 Git 보존하고, 바이트 대조 후 별도 정리하는 범위를 승인했다.

UI 캡처 도구 수정 뒤 [소스·승인 연결 재검사](pr77-source-audit-3.json)는51항목/986 feature 연결을 통과했다.
[추가 임시 정리](mixed-preparation/cleanup.json)는 진단 복사본4개와 종료된 mixed30-7 실패 root의 부재를 확인했다.
정리 전에 원출력 바이트·소유권·열린 파일 부재를 확인했고 GStreamer 캐시는 링크만 제거했다.
상위 UI 준비 작업공간도123개 출력·소스·계획의 보존 바이트와 열린 파일 부재를 확인한 뒤 제거했다.
[격리 worktree 정리](pr77-worktree-evidence-copy.json)는 원본과 동일한 중복 기록280개와 빌드 산출물366개를 제거했다.
제품 실행 파일은 원본과 동일했고 소스 변경34개도 통합본과 같았다. 과거 정리 기록1개는 변경 전 바이트를 유지했다.
앱의 보관 도구는 고정된 작업/작업공간 보호 때문에 checkout 보관을 거부했다. worktree는 그대로 남아 있으며 강제 삭제하지 않았다.

## 최종 검증 범위 재판정

사용자의 전체 재실행 질문에 따라 실제 `7895831..505b2dac4` 제품 diff와 소비자를 메인·독립 검토가 다시 대조했다.
전체 canonical을 반드시 새로 실행해야 한다는 앞선 설명은 과도했다. [범위 판정](mixed-preparation/mixed-30-9/assessment.json)의
근거대로 미변경 Auth/VA/Event POST/SourceRegistry/RTSP/WebRTC와 baseline424 UI·공통30/120 증거를 유지한다.
기존 canonical 원출력은 `a5046c7f1f8a91075229bac48e0315c1a85af13f`의
`docs/release-artifacts/v4.4.0/test-acceptance-current-final`에서 재조회하며 실행 source7895831을 바꾸지 않는다.
변경 영역은 완료된 focused·mixed30-9·recordingUI3·searchUI3/4·actual-ui addendum을 기능별로 연결한다.

`a5046c7f1`에서 시작한 전체 실행은2026-10-04T22:03:31Z에10.106초/exit1로 종료했다.
현재 latest run `v390-test-acceptance-20261004220328-82798`의 code-comments 최초FAIL과 후속30/UI/120 not-run,
cleanup PASS를 그대로 남긴다. 정적 실패는 보존 코드의 용도 주석15개와 영어 주석6개,
현행 검사 도구2파일의 주석이었다. 원문은 기존 해시·경로·행 예외에 결속했고 현행 주석만 보완했다.
[주석 재검](pr77-code-comments-retest-1.log)은1433파일 누락0/영어 주석0이다. 제품 동작 변경이나 checker 완화는 없다.

남은 장시간 대상은 [120분 실행 전 계획](mixed-preparation/mixed-120-15/mixed-plan.json)의 실제 변경 경로다.
관측120분/총123분이며 기존 검색·RSS·저장소·sample gap·readiness 상한을 유지한다. 준비/구문 검사는 실행 PASS가 아니다.
기존 canonical의 동일HEAD/build final-integrity 조건을 이월 판단으로 통과했다고 주장하지 않으며,
실제 영향 검증 판정과 해당 실행기의 기계 판정은 구분한다.


## 중단 후 테스트·릴리즈 잔여 재산정

사용자의 테스트 전면 중단 지시 후 실행 중 제품 테스트·검증 서버가 없음을 프로세스 목록으로 확인했다.
`mixed-120-15`는 execution.json/run.log가 없고 미시작이다. 후속 지시는 미커밋 정리·커밋·푸시와
필요 테스트·브랜치 삭제까지의 잔여 작업·예상시간 산정이다. 제품 테스트, 검증 명령, CI dispatch,
PR 생성·병합·태그·Release·브랜치 삭제의 실행 재개로 해석하지 않는다.
이번 커밋 준비에서 수행하는 diff·Git 원문/hash·민감정보 대조는 공개 전 파일 검토이며 제품 테스트가 아니다.

현재 제품 수정은 `5f124c9be`와 `505b2dac4`, UI 검사 보완은 `716edc913`에 있다.
그 이후 `src`·`include`·CMake에는 변경이 없다. PR #77의 GitHub 리뷰 6건을 다시 대조했으며
V440-PR77-01~06과 각각 대응한다. PR #77 자체는 v4.3.0에서 이미 병합됐고, 이번 수정의 공개는 아직 아니다.
미커밋은 주석/보존 원문 예외, 테스트 정의의 설명·inventory hash 연결, 실패/재검사 기록과 미실행 계획이다.
`pr77-source-audit-4`의60초 초과/exit124는 그대로 보존한다. 986개 기능 행·승인 내용을 바꾸지 않고
설명 문서 hash만 맞춘 뒤 실행한 `pr77-manifest-retest-5`는51.848초/exit0이었다.

### 테스트 판정

| 카테고리 | 판정과 필요성 | 정확한 범위/근거 | 실행 상태·추가 예상시간 |
| --- | --- | --- | --- |
| 빌드·v4.4.0 native/HTTP/Auth·PR77 단기·오류·경계 | 기존 증거 유지 | 현재 제품과 기존 증거의 source/diff 대조. 채널 제한, 이전 색인 유지, CMake 필수 의존성, snapshot 실패 전파, proof/cache/decoder/200결과45초/5초 기준, 공개 timeline·재생 회귀 | 완료 자료 유지, 추가0분. 제품 수정 시 영향 항목만 다시 산정 |
| 변경 경로30분 | 기존 증거 유지 | mixed-30-9의 실제1801.522초 관측, 5798 assertion, 녹화/검색/보존/삭제/재시작 | 실행 총1844.808초, 추가0분 |
| 실제 UI | 기존 증거의 미변경 부분 유지+수정 후 보완 | baseline424의 미변경 기능, recordingUI3 31조작, searchUI3/4 38조작, actual-ui 정상/partial/disabled 보완. 캡처 누락과 보완의 연결 유지 | 추가0분. 기존 source의 PASS를 새 실행으로 바꾸지 않음 |
| 공통30분·공통120분 | 추가 미진행 | 미변경 VA/Event POST/redaction/runtime 경계의 원래7895831 결과 유지. 새 색인/캐시의 검증 대용이 아님 | 추가0분 |
| 변경 경로120분 | 필요 판정 유지, 실행은 사용자 중단 | V440-PR77-02/06·S01/R01: 실제 worker/decoder/cache/보호 수명 변경과30분 RSS+64.23MiB 신호. 누수 확정은 아님 | 미실행. 재개 시 실제120분, 준비·정리 포함123분 한도. 외부 총예산 강제 준비 미완료 |
| 최종 정합성10개 | 기록·문서 정리 후1회 필요 | 아래 정확한10명령. 이전 제품 기능검사 전체36개를 자동 재실행하지 않음 | 지금 미실행. 과거 동일 항목196.246초, 예상4~6분 |
| 원격 required CI | 최종PR와 병합main 각 필요 | main ruleset의 static-gates·guardrails. PR 최종 SHA와 병합 후 main SHA의 실제 결과/annotation | 지금 미실행. 각 시점5~10분, 두 시점 총10~20분 예상; 큐 지연 별도 |
| 전체 test_release.sh·전체424/공통30/공통120 재실행 | 이번 추가 계획에서 미진행 | release-policy의 diff/source/환경/경계별 증거 유지. 원격 required gate에도 canonical 단일 실행은 없음 | 과거 전체1회는 약3시간24분. 이 시간을 다시 더하지 않음 |
| 외부 장비/서비스·다른제품범위 | 미진행 | 이번 변경·승인 범위 밖 | 0분 |

120분의 부하는 2채널 I420 160×90/30fps·2초 segment·1초 실제 SigLIP2 scan/sample,
15초마다 structured2+visual2 검색과 양쪽 증거 보존이다. 이 혼합 부하의limit20과 별도 focused의
200개 결과/최초색인45초 기준을 혼동하지 않는다. 원본 순환삭제·원장 회전·현재권위 재획득·보존 PNG/manifest
동일성·off/on·재시작을 확인한다. 성공 검색 p95≤2초/max≤5초, RSS≤4GiB, variable root≤448MiB,
observer100000 ID/32MiB, private log≤4MiB, sample gap≤15초와 기존15초 readiness를 유지한다.
원장 회전 횟수, visual503의 시간 분포, RSS/FD/thread/진행을 직접 판정한다. 수치 한도 이내만으로 누수 없음이라
하지 않으며 새로운 기울기0 기준도 만들지 않는다. Auth·snapshot 오류 주입·세밀한 hold 경계는 기존 focused 증거다.

마감 정합성10개는 아래9개 `./server.sh` 명령과 `git diff --check`다.

- `verify-code-comments`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`
- `verify-feature-implementation-evidence`, `verify-project-inventory`, `verify-feature-inventory-coverage`
- `verify-release-evidence-index`, `verify-script-inventory`
- `git diff --check`

과거 단일 canonical은3시간24분12초 범위이며, 내장36개 gate는413.357초였다.
선택한 정합성10개 합계196.246초는 해당 보존 summary의 각 durationMs 합이다.
최근5개 성공 Preflight는3분54초~4분43초, guardrails는19~24초이며 두 job은 같은 시점에 병렬이다.
현재 branch/PR에 대한 CI 성공이 아니라 예상시간의 과거 근거다. 중복 parent/child·병렬 실행을 더해
이 브랜치 전체의 정확한 누적 테스트 시간이라고 주장하지 않는다.

검사 실행만의 예상은 120~123분+정합성4~6분+CI 두 시점10~20분으로 **약2시간14분~2시간29분**이다.
120분을 제외하는 별도 결정이면 정합성+CI만14~26분이지만, 빠진 수명/자원 증거를 PASS나 일반 릴리즈 완료로
바꿀 수 없다. 준비10~20분, 결과 검토·보존/문서 정리20~40분, Git/서명/공개/종료10~20분은 테스트 시간이
아닌 별도 작업 예상이다. 실패 수정·외부 검토 대기·CI 큐·보호 worktree 해제 대기는 이 예상에 포함하지 않는다.

기존 증거를 유지할 수 있다는 정책 판단과 단일 canonical 실행의 기계적 PASS를 구분한다.
`verify_v390_final_evidence_integrity`는 동일HEAD/build/명령집합의 단일 bundle을 요구하므로
이월 자료를 넣어 현재 실행 PASS로 만들지 않는다. 최근10초 canonical의code-comments FAIL과 후속not-run은
그대로 보존하고 해당 실패의 실제 주석 재검만 연결한다. 이번 cut의 릴리즈 판단은 현행 정책의 기능별 영향
증거 유지/보완을 따르며 검사 삭제·source 변경·과거 결과 재라벨을 하지 않는다. 정확 UI 기능 연결과120분
결과/cleanup 및 최종 정합성·CI 확인 전에는 출시 가능으로 판정하지 않는다.

### 브랜치 삭제까지의 잔여 순서

| 순서·우선순위 | 잔여 작업 | 완료 조건·의존성 | 이번 지시의 실행 범위 |
| --- | --- | --- | --- |
| 1 P0 | 미커밋 정리·실패/미실행 보존·브랜치 push | 정확한 파일 stage, 기존4624개 삭제 원문이a5046c7에 존재함을 대조, 새 기록 바이트 readback, origin/v4.4.0=로컬HEAD, 작업 트리 정리 | 승인됨. 테스트 PASS/릴리즈 준비 완료 커밋으로 쓰지 않음 |
| 2 P0 | 테스트 재개 범위·시간 결정 | 이 재산정 보고 검토와 명시적 재개. 120분 전체예산 관리 준비 후 실행; 최초 실패면 후속 보류·원인 보고 | 산정만 승인, 실행 중단 유지 |
| 3 P0 | 필요한120분 및 결과 판정 | 위 정상/오류/경계·RSS 추세·프로세스/포트/임시root 정리 확인 | 재개 지시 필요 |
| 4 P0 | 기능별 기존 증거 적용과 최종 검토 | baseline7895831과수정505b2/5f124c/도구716edc의 기능 연결·실패→재검·미실행을 누락 없이 대조. PR77 6건 해결 근거 연결 | 현재 정책/원출력 읽기 검토만 수행 |
| 5 P1 | 최종 기록 보존·공개 트리 정리·문서 | 승인된2경로 누적1GiB 한도, Git 원문/hash 확인 후 별도 삭제 커밋. 현행 정의/fixture 유지, 작은 이력 색인, 임시 주석 예외 제거, 릴리즈 노트 실제 상태 갱신 | 이번에는 기존 미커밋 보존까지만. 최종 삭제는 검증 완료 뒤 |
| 6 P0 | 마감 정합성·PR·required CI | 정확한 최종 source에서10검사, PR의static-gates/guardrails 성공과annotation 확인. build/Auth/media의 기존 적용 근거 유지 | PR 생성 시 CI가 시작되므로 현재 생성하지 않음 |
| 7 P1 | main 병합·병합후CI·서명tag·Release | 최신main·VERSION/CMake·원격·깨끗한 트리 확인, main CI, signed annotated v4.4.0 로컬/GitHub Verified/hash 확인, source-only Latest/URL 확인 | 지금 실행하지 않음 |
| 8 P2 | 로컬/원격v4.4.0 브랜치 삭제 | 위 모든 단계 완료, main에 포함·증거 원격 보존·복구 ref 확인, main으로 전환, 로컬/원격 branch 부재 확인 | 삭제를 포함한 산정만 요청됨. 실제 삭제는 별도 승인 필요 |
| 9 P2 | 격리worktree 정리 | 통합 소스·고유 기록 보존 확인 후 관리 도구로 보관. 기존 시도는 pinned task/workspace 보호로 거부됐으며 강제 삭제하지 않음 | 보호 해제 판단이 남음. 브랜치 삭제와 별개 |

원격 읽기 확인 시 main은df60a8d, v4.4.0 branch/PR/tag는 없고 Latest는v4.3.0이었다.
main required checks는static-gates·guardrails이며 PR #77은이미merged이다.
따라서 이번 승인된 신규브랜치 push 자체로 CI는 시작되지 않는 현재 workflow 조건이다.
브랜치 삭제는 출시와 보존 완료 뒤의 마지막 작업이며 지금 삭제하지 않는다.


새 목표 `잔여이슈 해결 / 이슈 발생시 수정 후 계속 / 커밋 및 푸시 승인`에 따라 실행 전 남은 총예산 경계를
보완했다. 직전 전면 중단을 해제하는 테스트 재개 여부는 사용자에게 별도 확인 중이며 실행하지 않았다.
`mixed-120-15/run-bounded.py`는 컴파일부터 관측·재시작·정리까지7380초를 제한하고 최종Git/hash/receipt도
남은 시간 내에 처리한다. 초과 후에는 새 검사를 하지 않으며 소유 종료와 제한된 실패 기록 보존만 수행한다.
현재 recorder helper의 `runCurrentRecovery`에 기본null인 `onGroup` 등록을 추가해 이120분 driver만 사용한다.
별도 snapshot 그룹은 생성과 실제 부재 확인을 기록하며 상위 실행기도 이를 종료·대조한다.
제품 코드와 검색·색인·메모리·시간 합격 기준은 변경하지 않았다. 기존 helper 호출은 opt-in을 하지 않는다.
독립 소스 검토가 지적한 최종 결속 예외/무한 대기, 별도 그룹, 준비 실패 후RUNNING 잔류 경계를 보완했다.
이것은 실행 검증 PASS가 아니다. 계획의6개 실행기/등록 오류 확인은 총30초 이내의 도구 준비 검사이며
제품/모델/서버 부하를 실행하지 않는다. 이 검사도 현재 재개 응답 대기 상태다.

2026-10-05 사용자 `승인`으로 위120분/총123분, 준비 확인, 마감 정합성, required CI의 재개가 승인됐다.
첫 실행기 검사 `launcher-checks.py`는exit1이다. `deadline.log`에 생성 자식PID가 남았으나
정리 경로의 `os.killpg(group, 0)`에서PermissionError가 나 최종 결과JSON 보존도 중단됐다.
개별 PASS나 최초 내부 예외를 사후 복원하지 않는다. 이후 소유 fixture와 제품 실행 명령 부재,
알려진 자식PID 부재, 임시root의 열린 파일 부재를 확인하고 로그3개를hash 대조 보존 후root를 제거했다.
전체 생성PGID의 기록이 없어 실행 중 종료 계약을 통과했다고 판정할 수 없다.
원출력·남은 로그·정리 관측은 `mixed-120-15/launcher-checks-1/`에 보존했다.
제품120분은 미시작이며 기존 제품 검증을 무효화하는 제품 변경도 없다.
AGENTS 4장의cleanup 실패 중단 규정에 따라 새 수정/재검/위임을 멈추고 실행기 원인 수정과
종료 검증 재개 판단을 요청한다. 오류를 그룹 부재로 처리하거나 검사·시간 한도를 완화하지 않는다.

이후 사용자 `테스트 재개.` 지시로 실행기 원인 수정·재검을 재개했다. 직접 관측 0.066초에서 macOS의
종료·미회수 자식은 killpg(0)에 EPERM을, wait로 회수한 뒤에는 ESRCH를 반환했다.
실행기는 EPERM을 잔존/미확인으로 유지하고 자식 poll을 먼저 수행해 ESRCH로 부재를 확인한다.
`launcher-checks-2.json`의 동일 6경계는 12.061초/exit0/PASS, 소유 10그룹과 임시 root 부재를 확인했다.
시간 초과 시 자식 exit0이어도 FAIL/124, 별도 recovery 그룹 회수, 비소유 sentinel 생존, 기본 등록 훅 미사용,
기록/등록 실패 전파도 확인했다. 최초 실패는 그대로 유지한다. 제품 코드/바이너리는 변경 없다.
준비 소스와 실행 결과를 커밋해 고정한 뒤 실제 120분 관측을 실행한다. 총 7380초와 기존 기능/성능 한도는 그대로다.
