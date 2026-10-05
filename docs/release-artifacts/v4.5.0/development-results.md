# v4.5.0 개발 실행 결과

이 파일은 이번 순차 개발의 결과·미완료·실패와 재검증 연결만 관리한다.
계약은 [개발 계약](../../superpowers/specs/2026-10-05-v450-va-review-design.md),
정의는 [기능 inventory](../../project-feature-test-inventory.md#v450-va-review)에 둔다.

## V450-01 계약 준비 (2026-10-05)

- source: `5e103ea13d7f7c50ad532c5dd0fc989853856fad` 위 이 계약·정의 문서 변경.
- 환경: macOS, Apple M5, 메모리 25769803776bytes, 논리 CPU 10개(직접 sysctl 조회).
- `git diff --check`: 출력 없음, 문서 공백 오류 없음.
- `./server.sh verify-docs-links`: 301 Markdown, 로컬 링크 9299, 이미지 14, 앵커 394,
  indexed docs 92, 제외 192, failures 0.
- `./server.sh verify-feature-scope-gate`: 현재 기준·후보 권한·승격 항목·보호 계약·dispatch 연결 5 PASS/0 FAIL.
- 제품·실제 모델·UI·장시간 검사는 이 단계에서 미실행. 문서 검사로 제품 PASS를 주장하지 않는다.
- 준비 관측: `ollama list`는 서버 연결 불가. 로컬 Qwen weight 없음. 사용자에게 준비 상태를 알렸고
  `models/v450-ollama` 전용 다운로드·loopback 합성 검증 승인을 받았다. 이 사실은 제품 실패나 예상 TDD RED가 아니다.
- 위 조회와 문서 검사에는 작업 소유 서버·포트·임시 디렉터리 생성 없음. 23451 listener 부재 확인.

## V450-02 증거 입력

- source: `95336eb15` 위 va_review_input·CMake·native 검사 변경. [원출력](02-native.log)의 소스 SHA-256으로 실행 내용을 식별한다.
- `cmake --build build-gst-onnx -j 4`: exit 0, 제품 runtime/server 빌드 완료([빌드 출력](02-build.log)).
- `bash scripts/internal/verify_va_review.sh`: exit 0, 입력 32 PASS/0 FAIL. 1/8 프레임 byte/PTS/unknown UTC,
  metadata 재조회, 추가/중복 field·hash·혼합 원본·byte 상한·권한·취소·빈 partial·손상을 검사했다.
- 검증기는 기존 원본 없이 독립 보존 패키지를 publish/reopen했다. 실제 원본 순환삭제·미디어 혼합 부하 검사는 미실행이다.
- cleanup: 실행 소유 임시 root 부재 확인, 포트/모델 호출 없음. 제품 UI·장시간 검사는 미실행.
- 승인한 모델 다운로드 별도 준비 완료: `qwen3-vl:8b-instruct-q4_K_M`, 6140415975bytes,
  digest `0533d74300e4f9bc367d675d4e64ffd073d50ff16a2b4096cc2e8a1cf8c96319`.
  다운로드 성공을 추론·품질 PASS로 간주하지 않는다. 전용 Ollama PID 2755/loopback 23451은
  후속 로컬 검증용으로 실행 중이며 최종 정리 전이다. weight는 승인한 Git 제외 경로에 유지한다.

## V450-03 결과 계약·불변 저장

- source: `0133b1510` 위 record/store·codec helper·native 검사 변경. 저장 codec에서 재사용하는
  input의 digest 형식을 명시 검증하고 manifest 중복 직렬화를 제거했다.
- `cmake --build build-gst-onnx -j 4`: exit 0([빌드 출력](03-build.log)).
- `bash scripts/internal/verify_va_review.sh`: exit 0, 누적 72 PASS/0 FAIL([개별 원출력](03-native.log)).
  입력 32건과 결과/저장 40건이며 추가·중복 key, 범위 밖/중복/빈 근거, text/claim 상한,
  confidence/unknown, model provenance, 같은 record 중복/별도 revision, reopen,
  설정한 count/byte/reserve 상한, 쓰기 후 취소, 원자 link 직후 중단 복구, hardlink/symlink,
  실제 EACCES 쓰기 실패와 손상을 직접 검사했다. count 검사는 2개로 설정한 경계이며 기본 512개 누적 부하가 아니다.
- `git diff --check`: 공백 오류 없음. cleanup: 소유 임시 root 제거·부재 확인, 권한 변경 원복.
- 실제 모델·운영 서버·UI·장시간·외부 provider는 미실행이다. 준비용 Ollama는 후속 단계에 사용한다.

## V450-04 비동기 작업·격리

- source: `df957d8c9` 위 단일 worker 서비스와 native 수명/혼합 검사 변경.
- `cmake --build build-gst-onnx -j 4`: exit 0([빌드 출력](04-build.log)).
- `bash scripts/internal/verify_va_review.sh`: 최초 124 PASS 뒤 FD/thread 직접 관측 assertion을 추가하여
  재실행, 최종 exit 0 / 126 PASS / 0 FAIL([개별 원출력](04-native.log)). 예상 RED나 제품 실패 없음.
- worker 정확히 1개, queue4·중복 진행·권한/취소·invalid output·missing model·exception,
  실제 단축 deadline/queue 만료·재시작 job 만료·설정한 terminal 이력5개 경계에서 검사했다.
  장애 묶음과 join 후 FD/thread가 최초 값으로 복귀했다. 기본 64개 장기 누적 검사는 아니다.
- provider를 대기시킨 상태에서 실제 GStreamer 30-frame 인코드→원본 녹화 확정,
  카탈로그 검색 갱신·독립 UTC query 1건, EventRecord 파일 쓰기를 확인했다.
  실제 RTSP/WebRTC 송출·metadata/Event POST 전달과 장시간 부하는 이 native 검사에 포함되지 않는다.
- 협력적 provider 취소·worker join 500ms 이내, 임시 root 정리·부재 확인. 실제 모델은 아직 미실행.

## V450-05 로컬 adapter (미완료·인계)

- source: `19c0c8038` 위 provider/curl transport·고정 12-case fixture 변경. 각 로그에 실제 소스 SHA-256을 기록한다.
- 최초 protocol 실행은 fixture 부모 디렉터리 누락으로 exit 1([원출력](05-protocol-first.log)).
  제품 실패나 예상 RED가 아니다. 소유 fixture 부모를 만든 뒤 [재검증](05-protocol.log)은 184 PASS/exit 0이다.
- 실제 모델 최초 실행은 two-right의 4개 배열이 모두 빈 결과여서 strict codec이 거부했다
  ([최초](05-quality-first.log), [protocol 형태 진단](05-quality-diagnostic.log), [배열 개수 진단](05-quality-diagnostic-counts.log)).
  세 실행 모두 exit 1, 첫 사례에서 중단했으며 다음 사례 PASS를 주장하지 않는다.
- 근거 필수 prompt 보완 후 protocol 184 PASS([출력](05-protocol-revised.log)),
  실제 [재검증](05-quality-revised.log)은 정순/역순 4개 구조 통과 뒤 정지 사례의 빈 결과로 exit 1이다.
  이때 `semanticPass` 필드는 category만 검사한 자동 값이었다. 역순 설명이 원래 주장을 반복한 사실을
  직접 발견하여 의미 PASS 주장을 철회하고, 후속 출력은 `categoryPass`와 직접 문장 대조를 분리했다.
- nonempty anyOf schema와 prompt 내 schema 설명을 보완한 protocol은 184 PASS
  ([출력](05-protocol-schema.log)). 실제 [12-case 실행](05-quality-schema.log)은 구조 12/12,
  category 11/12, 부족 사례 3/4로 exit 1이다. occluded-final을 contradiction으로 잘못 분류했다.
  two-left는 category가 맞아도 설명이 실제 위치와 달라 의미 실패다. 필수 부족 사례 100% 기준을 유지한다.
- 위 실행의 RSS+VRAM 합계 최대는 15,620,947,520bytes, 모델 보고 할당은 7,972,486,720bytes다.
  unified memory 중복 가능 합계는 실제 working set으로 단정하지 않는다. 품질 assertion이 먼저 실패해
  이 실행의 자원 gate는 미실행이다. 후속에서는 SDK의 `proc_pid_rusage` 물리 footprint를 직접 측정하며
  기존 14GiB 기준과 기존 합계 관측값을 함께 유지한다.
- 가림 지시 보완 후 [재검증](05-quality-occlusion.log)은 구조 12/12, category 10/12,
  부족 사례 3/4로 exit 1이다. 두 역순 사례는 설명도 실제 위치와 달랐다. 관측한 모델 물리
  footprint 최대 7,837,310,704bytes, native peak RSS 44,187,648bytes다. 품질 실패로 자원 gate까지 통과한 실행은 아니다.
- 모델 wire를 `observations`와 단일 `assessment`로 단순화하고 기존 public output으로 strict 변환했다.
  [protocol](05-protocol-assessment.log)은 214 PASS/exit 0, [실제 모델](05-quality-assessment.log)은
  구조 12/12, category 9/12, 부족 사례 1/4로 exit 1이다. 단일 방향·전체 가림·마지막 가림을
  contradiction으로 잘못 분류했다. 반대 방향의 위치 설명은 개선됐으나 품질 합격은 아니다.
  모델 물리 footprint 최대 7,808,671,424bytes, native peak RSS 44,023,808bytes를 관측했다.
- 마지막 변경은 이미지/주장 뒤에 핵심 불확실성 규칙을 재명시한 prompt다.
  [빌드](05-build-reminder.log)는 exit 0, [native/protocol](05-protocol-reminder.log)은 214 PASS/exit 0이다.
  **이 마지막 prompt의 실제 모델 검증은 사용자 마감 정리 지시에 따라 시작하지 않았다.**
  마지막 실제 실패를 최종 prompt의 실행 결과로 바꾸거나, 미실행을 PASS로 주장하지 않는다.
- runtime은 Ollama 0.21.0이다. `ollama show --template`은 `{{ .Prompt }}`지만 modelfile의
  renderer/parser는 `qwen3-vl-instruct`다. [동일 runtime renderer 소스](https://github.com/ollama/ollama/blob/v0.21.0/model/renderers/qwen3vl.go)는 system 메시지를 포함하므로
  단순 template 문자열만으로 system 누락을 원인으로 확정하지 않았다. 별도 runtime/모델 설치·설정 변경은 하지 않았다.
- 각 실패의 원출력과 중간 build/protocol 로그를 보존했다. 로그의 source hash는 당시 관측이며,
  현재 코드로 모든 중간 실패를 재현했다는 뜻은 아니다. raw provider 응답 대신 합성 결과의 정제 필드만 기록했다.

## 2026-10-05 마감 정리와 재개 지점

- 사용자가 추론모델 변경을 위해 정리·잔여 재산정을 요청했다. 추가 구현·실제 모델 실행은 중단했다.
  Codex 모델 설정이나 제품 VLM을 자동 교체하지 않았다. 01~04는 구현·focused 검증 커밋이며,
  05는 **품질 미달인 미완료 코드/증거 보존 대상**이다. 06 API/UI와 07 외부 adapter는 미착수다.
- 최초 재개 대상: 마지막 prompt를 기존 12-case oracle로 평가할지, 모델/접근법을 재선정할지 판단한다.
  현재 provider는 한 관측 설명과 단일 판정을 supports/contradictions/unclear 중 하나로 변환하며
  questions는 빈 배열이다. public record와 근거 index 검증은 유지한다.
  `outputValidAt8=0` 진단은 새 provider wire를 옛 public-output parser로 읽은 값이므로 새 wire 실행의
  합격 판정이 아니다. 각 `[quality]`의 `schemaValid`는 실제 제품 adapter와 저장 codec 결과다.
- 새 라이브러리·모델 weight·외부 호출이 필요한 변경은 해당 범위를 명시 승인받는다.
  30분·120분·실제 UI 풀테스트·독립 검토와 PR/병합/tag/Release는 이번 실행에 포함되지 않았다.
  릴리즈 잔여 우선순위와 완료 조건은 [현재 backlog](../../development-backlog.md#v450-잔여-개발과-릴리즈-순서)를 따른다.
- `git ls-remote --heads origin main v4.5.0`: 둘 다 정리 전 `5e103ea13d7f7c50ad532c5dd0fc989853856fad`.
  `gh release view --repo dhseo90/MediaServer --json tagName,url,isDraft,isPrerelease,publishedAt`:
  Latest `v4.4.0`, draft/prerelease false, publishedAt `2026-10-05T01:47:56Z`,
  [공개 URL](https://github.com/dhseo90/MediaServer/releases/tag/v4.4.0). 로컬 VERSION/CMake는 4.4.0이며 4.5.0 릴리즈 작업은 미실행이다.
- 전용 Ollama PID 2755는 정상 종료(exit 0), 시작했던 native/compile session은 종료 결과를 회수했다.
  종료 직전 로드된 모델 0개·자식 0개, 종료 후 PID/포트 부재를 확인했다
  ([정리·모델 provenance](05-runtime-cleanup.json)). 6,140,415,975byte weight는 Git 제외 `models/v450-ollama`에 유지한다.
  native fixture root 17개의 부재를 재확인하고, 05 로그 19개를 원본과 SHA-256 대조한 뒤
  소유 임시 root `.media_server.test/v450`을 제거·부재 확인했다. 다운로드 진행/반복 서버 로그는
  모델 provenance와 정리 결과를 보존한 뒤 삭제했다. 승인된 weight는 유지한다.
- 마감 문서 검사: `git diff --check` 공백 오류 없음, [문서 링크](closeout-docs-links.log) 302개 문서·failures 0,
  [범위 gate](closeout-feature-scope.log) 5 PASS/0 FAIL. 제품 품질 PASS와 별개의 문서 확인이다.

## V450-05 재개: 최종 prompt 실제 품질 통과 (2026-10-05)

- source: `38efcb53542e5e55fca6375642f2b59152a82e79`, 제품 코드는 변경하지 않았다.
  `bash scripts/internal/verify_va_review.sh --local http://127.0.0.1:23451`: exit 0,
  [원출력](05-quality-reminder.log)의 source SHA와 모델 digest로 이번 실행을 식별한다.
- 고정 12사례 구조·근거 12/12, 자동 category 12/12, 부족 사례 4/4. 메인이 각 설명·근거 index를
  실제 좌표/색/가림 oracle와 직접 대조해 의미 12/12를 확인했다. 정·역순 설명 모두 실제 방향과
  맞고, 정지는 동일 위치, 색상 부재는 실제 빨강, 단일 이동/방향과 두 가림은 unclear/null이다.
  과거 실패는 그대로 유지하며 이 합성 평가를 일반 영상 정확도로 확대하지 않는다.
- 개별 지연 7,707~18,062ms, native peak RSS 44,040,192bytes, 모델 물리 footprint 최대
  7,815,896,624bytes, 실행 작업공간 최대 183,986,980bytes. 각 예산 통과. 모델 보고 할당은
  7,972,486,720bytes이며 RSS+VRAM 중복 가능 합계와 구분한다.
- 읽기 전용 보조 검토에서 입력 순서/claim/결과 변환의 품질 왜곡 결함을 발견하지 못했다.
  이는 지정 모델의 최종 독립 검토가 아니다. 모델 취소/종료·실제 미디어 병행·Linux·장시간·UI는
  여전히 후속 영향 검증이다. native fixture root 제거와 모델 unload를 확인했다.
  전용 Ollama PID 12473/23451은 후속 통합 검증을 위해 유지 중이며 작업 종료 시 회수한다.
- 05 로컬 adapter의 개발 품질 선행 조건이 충족돼 06 API/UI 연결로 진행한다.

## V450-06 API/UI 연결 (미완료·정리 실패 후 중단)

- 05 품질 통과 뒤 runtime 구성·비동기 현재 권한/session 재확인·Ops API·증거 상세 UI를 구현했다.
  제품 코드의 [빌드](06-build.log)와 [UI 포함 빌드](06-build-ui.log)는 exit 0.
  [native/protocol 회귀](06-native.log)는 214 PASS/exit 0이다.
- UI 담당자의 `node --test scripts/internal/evidence_ui_state.test.mjs` 결과는 기존 6건과 신규 8건,
  14/14 PASS/exit 0이다. 최초 mock disabled null/false 비교 2건 실패 뒤 명시 bool로 수정했고
  추가 경계를 포함해 통과했다. 담당자 도구 출력으로 전달받았으며 별도 원출력 파일은 없다.
  실제 UI 조작/시각/모바일·테마 검증으로 대체하지 않는다.
- `bash scripts/internal/verify_va_review.sh --http-only`는 제품 서버 시작 단계 실패, 개별 API assertion
  실행 0건이다([구조화 실패](06-http.json), [wrapper 원출력](06-http.log)). 서버 stdout/stderr를
  버리는 구성이라 최초 시작 실패 원인은 미확정이며 원출력을 추정 복원하지 않는다.
  이미 종료한 child를 검사하는 `stopServer`가 정상 종료 assertion을 요구하고, 이 예외가
  뒤 provider/UDP/root 정리를 건너뛰었다. wrapper는 70초 뒤 Node를 종료하고 자기 fixture를 정리했다.
- 읽기 검토에서 합성 provider async handler의 미처리 예외가 같은 정리 누락을 만들 수 있는
  별도 경로도 확인했다. handler 오류 전파·자원별 finally·실패 진단 보존이 필요한 검증기 수정이다.
  검증 기준이나 시간 제한을 완화할 사유가 아니다. 서버 권한/수명 읽기 점검에서는 추가 결함을
  발견하지 못했으나 actual HTTP 미실행이므로 06 합격이 아니다. 최종 독립 검토도 아니다.
- AGENTS 4장의 cleanup 실패 기준에 따라 새 구현·검증을 중단하고 재개 판단을 요청했다.
  작업 소유 Node PID 15818과 Ollama PID 12473의 부재, 합성 provider 포트 51841과 Ollama 23451의
  listener 부재를 확인했다. Ollama 모델 0개·자식 0개 확인 후 SIGTERM exit 0이다.
  HTTP root의 생성 시각이 실행 시작 시각과 일치하고, uid/inode·고정 fixture를 대조한 뒤
  제거·부재 확인했다([정리 관측](06-runtime-cleanup.json)). 실패한 검증기가 HTTP/RTSP 포트를
  기록하지 않아 해당 개별 포트의 사후 확인을 주장하지 않는다. 시작 실패·정리 실패 기록은 유지한다.
- 06 API/Auth 통합 합격, 실제 모델 취소/미디어 병행, 07 adapter, 영향 회귀·최종 독립 검토·
  장시간/실제 UI·릴리즈는 남아 있다. 기존 코드·결과는 미완료 보존 대상으로 유지한다.

## V450-06 재개: API/Auth 단기 검증 통과

- 사용자가 검증기 보완 후 06→07 재개를 명시 승인했다. 정리 예외가 뒤 자원 회수를
  건너뛰지 않도록 자원별 종료를 분리하고, provider handler 예외를 주 검사 실패로 전파하며
  시작 오류를 정제 기록했다. 기존 시간/합격 기준을 유지했다.
- [진단 실행](06-http-diagnostic.log)은 managed 녹화 root 초기화 전에 증거를 넣은 fixture 때문에
  저장소 보호 검사에서 거부됐다. [다음 실행](06-http-retest.log)은 root 초기화 통과 뒤 두 채널의
  같은 파일 canonical source 중복을 발견했다. 제품 보호 정책을 바꾸지 않고 fixture의
  정상 저장소 초기화와 서로 다른 파일 경로를 사용했다. 두 실패는 API 0건, 자원/포트/root 회수 확인.
  누적 개별 결과와 각 최초 실패는 [구조화 출력](06-http.json)의 previousRuns에 보존한다.
- 최종 `bash scripts/internal/verify_va_review.sh --http-only`: exit 0, 132 PASS, 6,336ms
  ([원출력](06-http-sources.log)). 실제 제품 서버 3회 시작/정상 종료, HTTP/RTSP/provider TCP 폐쇄,
  UDP 폐쇄·root 제거를 확인했다. 합성 provider의 실제 HTTP이며 실제 모델/실제 UI는 아니다.
  익명·viewer·ops/source·쓰기 경계, strict body·외부 disabled, 불변 재실행, 근거/목록/조회,
  다른 운영자 취소 거부·생성자/admin 취소, 전송 중 최신 scope 회수·로그아웃,
  shutdown 미게시·재시작 record 유지와 job 410을 확인했다.
- 06 제품 source 빌드·214 native/protocol 및 14 UI 상태 결과를 유지한다. 이후 변경은
  검증 fixture·진단/정리와 문서이며 제품 코드를 변경하지 않았다. 실제 UI와 지정 모델의
  최종 독립 검토·미디어 병행/실제 모델 취소는 후속 항목으로 남겨 두고 07 adapter로 진행한다.

## V450-07 선택 외부 adapter (protocol 구현·실호출 미확인)

- 06 `fd9dfc809` 위 Gemini generateContent adapter, 4조건 opt-in, 고정 HTTPS/key header,
  외부 전송 UI 확인을 추가했다. 공식 [API 참조](https://ai.google.dev/api/generate-content)를 확인했다.
  단일 STOP/text·modelVersion과 기존 strict 결과/근거 codec만 수용한다. 외부 자동 fallback은 없다.
- [빌드](07-build.log) exit 0. `bash scripts/internal/verify_va_review.sh`는 [누적 404 PASS](07-protocol.log),
  exit 0이다. 기존 로컬/저장/worker 회귀와 외부 합성 protocol을 포함한다. exact PNG는 독립
  OpenSSL base64 decoder로 대조했고 외부 guard·키/host 변조·취소는 실제 네트워크 전에 거부한다.
  Google TLS 실전송/계정/model 가용성·외부 의미 품질의 검증은 아니다.
- [실제 제품 HTTP 회귀](07-http.log) 132 PASS/5,666ms/exit 0이며 외부는 기본 disabled다.
  누적 구조화 결과는 기존 [HTTP 결과 파일](06-http.json)에만 유지한다.
  [UI 상태](07-ui.log)는 기존 14+외부 3=17/17 PASS/exit 0, 실제 UI 풀테스트가 아니다.
- 보조 읽기 검토에서 외부 opt-in/전송경계/credential 비노출/종료 수명의 직접 결함을 발견하지
  못했다. 지정 모델 최종 독립 검토와 구분한다. native/HTTP 임시 root와 소유 포트/프로세스 정리 확인.
- 외부 계정·사용 모델·일시 credential·privacy 조건을 사용자가 아직 지정하지 않아 실호출하지
  않았다. adapter 구현 완료와 외부 provider 승격 완료를 구분한다. 실호출 또는 명시 제외 결정이 남는다.

## 13:15 종료 한도에 따른 영향 검증과 마감

- 사용자 지정 종료 한도는 2026-10-05 13:15 KST다. 13:12부터 정리/보존으로 전환하도록
  배정했고, 필요한 결과가 먼저 나온 뒤 새 실질 작업을 중단했다. 30분/120분·실제 UI·외부 호출은 시작하지 않았다.
- `bash scripts/internal/verify_va_review.sh --local-lifecycle http://127.0.0.1:23451`: exit 0,
  [21 PASS](08-lifecycle.log), focused 6,388ms. 모델 `/api/ps`의 실제 loaded 관측 후
  Cancel과 Stop을 각각 실행했다. Cancel은 Stop 호출 전에 cancelled를 확인해 서로 구분했다.
  두 경우 모두 record 0, curl reap·worker join·FD 4/thread 1 기준값 회복,
  action 신호 후 모델 목록 empty는 각각 225/226ms(5초 기준)다. native root 제거·부재 확인.
  이 모드는 모델 메모리를 측정하지 않았으며 resource-final의 초기 0값은 사용량 관측이 아니다.
- source graph에 새 14개 파일을 기존 application-service 소유로 등록하고 [현재 graph를 결속](08-graph-bind.log)했다.
  과거 completion/승인 데이터는 유지했다. [graph 4 PASS](08-graph.log),
  [문서 links failures 0](08-docs.log), [범위 5 PASS](08-scope.log),
  [script inventory 13 PASS](08-script-inventory.log), [주석 누락 0](08-comments.log),
  [CI/local parity 6 PASS](08-ci-parity.log), 각 exit 0. 전체 CI/실제 UI 결과로 확대하지 않는다.
- [feature inventory coverage](08-feature-coverage.log)는 **exit 1 / 7 PASS·1 FAIL**이다.
  전체 986개 연결·missing 0이지만 inventorySha256 및 UI-001 owner/dispatch/action,
  UI-002 owner의 독립 승인 blob/body 결속이 현재 변경과 달라 실패했다.
  [검증 정책](../../stream-verification.md#검증-정책)에 따라 일반 manifest 재생성으로
  독립 승인을 복사하지 않았다. 승인된 현재 소스 재검토·결속 갱신이 릴리즈 blocker다.
- 05 품질 증거는 로컬 prompt·입력/normalize 경로가 유지됐고 07은 별도 Gemini 분기를 추가한
  변경 범위에 근거해 유지했다. 이번 lifecycle은 품질 12사례를 재실행한 결과가 아니다.
- 릴리즈 잔여는 [backlog의 6묶음](../../development-backlog.md#v450-잔여-개발과-릴리즈-순서)으로 재산정했다.
  05 로컬 품질·06 API/UI·07 adapter 구현과 릴리즈 가능 여부를 구분한다.

- 최종 소유 정리: Ollama PID 18054 정상 종료(exit 0) 후 PID/23451 listener 부재 확인,
  마지막 모델 0개·자식 0개. native root 9개의 부재와 보존 로그 byte 일치를 확인한 뒤
  `.media_server.test/v450-resume`의 dev/inode/uid를 대조해 제거했다([정리 출력](08-cleanup.json)).
  승인된 모델 weight는 유지한다. [마감 문서 검사](08-closeout-docs.log)와 `git diff --check`로
  기록·링크 정합을 확인하며, 위 feature manifest FAIL은 해소되지 않은 상태로 보존한다.

## 최신 범위 재개: Gemini 제거·Ollama 연결·한국어 네 항목

- 사용자 goal로 개발·분할 커밋·마지막 push를 재개한다. 테스트 동일 단계의 실패가 3회를
  초과하면 새 작업을 중단하고 보고한다. 이전 13:15 종료 작업과 구분하며 과거 실패는 유지한다.
- Gemini 미배포 구현 제거(호환 reader/migration 없음), 자체 호스팅 Ollama만 지원, 원격 주소·
  HTTPS/Bearer/CA, 검증은 로컬만, 네 항목 실제 생성·한국어 응답을 최신 승인 범위로 반영했다.
- 범위 정정 단계: `./server.sh verify-docs-links` exit 0/failures 0
  ([원출력](09-scope-docs.log)), `git diff --check` exit 0. 이 단계 실패 0회.
  제품 수정·모델 재검증·최종 gate는 아직 미완료다. 기존 coverage FAIL을 해소했다고 하지 않는다.

### Gemini 제거 단계

- source: 계약 커밋 `d8c62f7cd` 이후 제품 diff. v4.5.0 Gemini adapter/Google 전송·키·설정·
  UI 선택/동의·externalEnabled·record 분기를 제거했다. 미지원 provider는 400·무호출이며
  Ollama 결과 조회/재시작/권한/취소를 유지한다. 미배포이므로 호환 reader/migration은 없다.
  기존 버전의 무호출 VLM 연구 profile 계약은 이번 실행 adapter 제거와 별개로 유지한다.
- 빌드 exit 0 ([로그](10-gemini-removal-build.log)), UI 상태 14/14 exit 0
  ([로그](10-gemini-removal-ui.log)). 삭제한 Gemini 성공 검사 수를 PASS 수에 포함하지 않는다.
- 최초 native·HTTP 실행은 sandbox loopback listen EPERM으로 각 exit 1, 테스트 실패 누적 2회다
  ([native](10-gemini-removal-native.log), [HTTP](10-gemini-removal-http.log)). 제품 assertion 실패가
  아닌 준비 실패이며 예상 RED로 바꾸지 않는다. HTTP Node의 listen error가 미처리돼 finally를
  건너뛴 원인을 확인하고 provider/UDP 시작 예외를 catch/finally로 전달하도록 보완했다.
- 두 wrapper fixture는 제거됐고, 남은 HTTP 합성 root는 생성 시각·uid/inode·입력 hash·열린 파일
  부재 확인 후 제거했다([정리 관측](10-sandbox-failure-cleanup.json)). 최초 Node가 결과 JSON을
  쓰지 못했으므로 당시 결과를 06-http.json에 추정 복원하지 않는다.
- 동일 합격 기준으로 승인된 loopback 실행 권한을 사용한 재검증: native 217 PASS/exit 0
  ([로그](10-gemini-removal-native-retest.log)), HTTP 135 PASS/5,652ms/exit 0
  ([로그](10-gemini-removal-http-retest.log), [누적 JSON](06-http.json)). 소유 서버 정상 종료,
  HTTP/RTSP/provider 포트 폐쇄·UDP 종료·root 부재를 확인했다. 실제 모델/실제 UI 검증은 아니다.
- 사전 diff 검사에서 EOF 빈 줄 1건을 발견해 수정했고 최종 `git diff --check` exit 0이다.
  이는 위 테스트 실패 2회와 별도의 정적 지적이다. 문서 links failures 0/exit 0
  ([로그](10-gemini-removal-docs.log)). 삭제 외 로컬 prompt/입력/출력 경로는 이번에 바꾸지 않았다.
  후속 원격 연결·한국어 네 항목·최종 검증·기존 coverage FAIL은 미완료다.
