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

### Ollama 주소·HTTPS·인증 단계

- source: `69b28567b` 이후 연결 diff. 기존 LOCAL_ENDPOINT 키를 유지하며 DNS/IPv4/괄호 IPv6,
  HTTP/HTTPS·포트·끝 단일 slash를 지원한다. 관리자 endpoint만 사용하고 URL userinfo/query/
  fragment·임의 API 경로·redirect·환경 proxy를 거부한다. Bearer는 HTTPS 전용이며 CA는 연결 전용이다.
  토큰은 composition에서 환경변수를 읽어 provider 메모리→curl stdin으로만 전달한다.
  `/api/tags`·`/api/chat` 모두 동일한 토큰/CA를 사용하며 인증 오류 fallback은 없다.
- 빌드 exit 0 ([로그](11-ollama-connection-build.log)). 실제 제품 HTTP/Auth 회귀 135 PASS,
  6,024ms/exit 0 ([로그](11-ollama-connection-http.log), 기존 누적 JSON).
- 최초 native는 설치 OpenSSL 3.6.2가 `x509 -days -1`을 거부해 fixture 준비 exit 1이다
  ([로그](11-ollama-connection-native.log)). 이 단계 테스트 실패 1회. 최초 stderr는 버리는
  설정이어서 원문을 복원하지 않는다. 설치된 `openssl x509 -help`의 not_before/not_after로
  유효기간을 2000-01-01~02로 명시하고 실패 stderr 보존을 추가했다. root 정리 확인.
- 재검증 281 PASS/exit 0 ([로그](11-ollama-connection-native-retest.log)). 이후 등록된 proxy
  우회 경계를 실제 환경변수로 확인하고 손상 CA·HTTPS 403/429 반례를 추가한 최종 검사는
  284 PASS/exit 0 ([로그](11-ollama-connection-native-final.log)). 정상 TLS/Bearer·무인증,
  누락/잘못된 토큰, 미신뢰·만료·호스트 불일치·손상 CA, redirect·헤더 주입 거부,
  TLS timeout/취소·FD 복귀·curl reap을 실제 loopback TLS에서 확인했다.
- UI 상태 14/14 exit 0 ([최종 로그](11-ollama-connection-ui-final.log),
  [이전 로그](11-ollama-connection-ui.log)); TLS/인증/요청 한도의 정제 오류 문구 포함.
  문서 failures 0/exit 0 ([로그](11-ollama-connection-docs.log)), `git diff --check` exit 0.
- HTTP/native 소유 root·프로세스·포트와 TLS fixture의 임시 키·인증서를 회수했다.
  실제 원격 GPU/컨테이너·원격 추론 취소/메모리는 미검증·사용자 제외다. 모델 품질과 실제 UI는
  이번 연결 검사로 대체하지 않으며 후속 한국어 네 항목 변경에서 로컬 품질을 재평가한다.

### 한국어 네 항목 단계: 실패 4회로 중단

- 사용자 승인: supports/questions/contradictions/unclear 실제 생성과 한국어 응답. 기존 모델·
  12사례의 좌표/색상/가림 oracle·시간/자원 상한은 유지하고 질문만 한국어로 번역했다.
  기준은 실행 전 inventory에 등록했다. Gemini/TLS 완료 커밋 `2c63b42e1` 이후의 작업 트리다.
- 초기 빌드 exit 0 ([로그](12-korean-build.log)), native/TLS 295 PASS/exit 0
  ([로그](12-korean-native.log)), HTTP/Auth 135 PASS/5,606ms/exit 0
  ([로그](12-korean-http.log), 누적 06-http.json), UI 상태 14 PASS/exit 0
  ([로그](12-korean-ui.log)). 이는 아래 최종 prompt/schema 변경 전의 단기 결과다.
- 실제 모델은 기존 승인 전용 경로의 `qwen3-vl:8b-instruct-q4_K_M`, digest
  `0533d74300e4f9bc367d675d4e64ffd073d50ff16a2b4096cc2e8a1cf8c96319`다.
  `OLLAMA_NO_CLOUD=1`, 전용 loopback 23451에서 실행했다. 외부 provider 호출은 없다.
- 동일 한국어 품질 단계의 실패 횟수는 4회다. 명령은 모두
  `bash scripts/internal/verify_va_review.sh --local http://127.0.0.1:23451`, exit 1이다.
  1. [최초](12-korean-quality.log): two-right에서 질문만 생성하고 unclear도 없어 거부됐다.
  2. [관측 우선 지시문](12-korean-quality-retest.log): two-right의 네 배열이 모두 비었다.
  3. [관측 필드 선행](12-korean-quality-grounded.log): two-right 통과 후 two-left의 네 배열이 비었다.
  4. [생성 스키마 비어 있지 않은 그룹 제약](12-korean-quality-nonempty.log): 12사례 실행 후
     schema 12/12, 자동 category 8/12, uncertainty 0/4, 추가 질문 0/4로 필수 품질 gate FAIL.
- 2~4차 각각의 빌드는 exit 0이다([2차](12-korean-build-retest.log),
  [3차](12-korean-build-grounded.log), [4차](12-korean-build-nonempty.log)).
  관측 필드 선행 후 native/TLS 295 PASS ([로그](12-korean-native-grounded.log))는
  4차 anyOf 생성 스키마 변경 전이며 최종 source 전체 PASS로 승격하지 않는다.
- 최종 출력 직접 대조: eight-left는 마지막 위치를 오른쪽으로 잘못 설명했고, two-static은
  동일 위치를 설명한 뒤 “반증되지 않습니다”로 결론을 뒤집었다. eight-static은 첫 프레임
  하나만으로 전체 동일 위치 주장을 뒷받침했다. 따라서 자동 category 8개 중 이 3개도
  의미 합격에서 제외하며, 의미 합격은 최대 5/12다. 근거 부족 4사례 모두 contradictions로
  잘못 분류되고 questions가 비었다. 한국어 문자열/JSON 형식만으로 품질 PASS라 하지 않는다.
- 최종 관측 자원: 모델 physical footprint 7,854,972,584byte, native peak RSS 44,023,808byte,
  fixture workspace 184,159,306byte. 품질 gate가 먼저 실패했으므로 뒤의 자원 assertion을
  실행한 것처럼 보고하지 않는다. 60초/품질 기준을 완화하거나 실패 사례를 제외하지 않았다.
- 4회 실패로 새 구현·재검증을 중단했다. 최종 provider/record/fixture/inventory 수정은
  미완료 작업 트리로 보존하며 제품 완료 커밋·푸시·릴리즈를 수행하지 않는다.
  [정리 관측](12-korean-cleanup.json): 모델 목록 비움, 소유 Ollama PID 23688 종료와
  23451 포트 폐쇄, 네 실행 fixture root 부재를 확인했다. Ollama 실행 tool session도 exit 0이다.
  `/tmp/media-server-v450-korean-ollama.log`는 중단 시 서버 진단 로그로 유지한다.
- 재개에는 이 중단 사유를 해소하는 사용자 지시가 필요하다. 핵심 잔여는 한국어 관측의
  의미 정확도·근거 부족 분류·실제 추가 질문 생성이며, 혼합 회귀/독립 검토/릴리즈 gate는 미진행이다.

### 권장 수정 승인 후 재개: 생성 순서·판단 계약·역할별 필드

- 사용자가 원인 검토의 권장 수정 반영과 목표 재개를 승인했다. 이전 단계의 실패 4회는
  유지하며 이번 재개 구간의 품질 실패도 별도로 4회에 도달해 중단했다. 자동 검사 exit와
  필수 직접 의미 검토 결과를 구분한다. 합격선을 변경하거나 이전 실패를 소급 PASS로 바꾸지 않았다.
- 관측→evidenceStatus→supports/contradictions→unclear→questions 순서로 변경했다.
  충분/부분/부족과 배열·confidence의 일치를 생성/수신 양쪽에서 요구한다. 공개 API/record의
  네 그룹·text·frameIndices 형식은 유지한다. 마지막 후보에서는 내부 문장 키를 observedEvidence,
  missingEvidence, followUpQuestion으로 구분한다. 모델 문장·분류·근거를 그대로 옮기며
  서버에서 자동 분류 보정·고정 질문 생성·추가 모델 호출을 하지 않는다.
- 모델/digest·12개 한국어 질문·합성 이미지·60초/8192 context/1024 생성 한도와 자원 예산을
  유지했다. 관측+status를 합성 검증 로그에 남겨 영상 관측과 결과 작성을 분리해 확인했다.
  모든 실제 모델 명령은 `bash scripts/internal/verify_va_review.sh --local http://127.0.0.1:23451`다.

| 비교 실행 | 자동 검사 | 직접 검토와 품질 판정 |
| --- | --- | --- |
| [판단 계약](13-decision-quality.log) | exit 0, schema 12/12, category 10/12, uncertainty/questions 각각 4/4 | 위치 비교의 주장 반복·누락 근거, 반증 항목의 원 주장 반복, 마지막 가림 questions가 질문 아닌 설명. 품질 FAIL 1회 |
| [근거 작성 지시](13-reasons-quality.log) | exit 0, schema/category 12/12, uncertainty/questions 각각 4/4 | eight-right 주장 반복 제외. 마지막 가림 질문이 필요한 증거 대신 포괄적인 정보 획득 방법만 요청해 구체적 질문 3/4. 품질 FAIL 2회 |
| [구체적 질문 지시](13-questions-quality.log) | exit 0, schema 12/12, category 11/12, uncertainty/questions 각각 4/4 | eight-left 오분류, eight-right 주장 반복, blank-hidden의 unclear에 질문을 그대로 복사, eight-static 전체 판단에 끝점만 인용. 의미 검토 불합격, 품질 FAIL 3회 |
| [역할별 내부 필드](13-fields-quality.log) | exit 1, schema 12/12, category 9/12, uncertainty/questions 각각 4/4 | two-left를 근거 부족으로, eight-left/two-static을 supports로 오분류. 의미 합격 상한 9/12로 기준 10/12 미달. 품질 FAIL 4회 |

- 마지막 후보의 근거 부족 네 사례는 필요한 다른/추가 프레임을 실제로 요청했고, unclear는
  부족한 근거를 기술했다. 네 질문을 직접 대조했다. 근거 부족 경로는 개선됐으나 전체 품질
  합격은 아니다. 잘못 분류한 세 사례는 observations에서 위치/정지를 맞게 읽고도 결과 그룹을
  잘못 골랐다. 현재 핵심 장애물은 관측을 사용자 주장과 대조해 지지·반증을 선택하는 정확도다.
- 각 후보 빌드 exit 0: [판단 계약](13-decision-build.log),
  [근거 지시](13-reasons-build.log), [질문 형식 포함](13-reasons-build-final.log),
  [구체 질문](13-questions-build.log), [역할 필드](13-fields-build.log).
  native/TLS 320 PASS/exit 0 ([판단 계약](13-decision-native.log),
  [최종 역할 필드](13-fields-native.log)); 판단 불일치·누락 질문·unknown status·출력 불변 포함.
  HTTP/Auth 135 PASS/5,653ms/exit 0 ([로그](13-decision-http.log), 누적06-http.json)는
  역할별 필드 변경 전이다. 최종 HTTP/UI/수명/혼합 회귀는 품질 실패로 미실행이며 이전 증거로
  최종 전체 PASS를 주장하지 않는다.
- 마지막 자원 관측: 모델 physical footprint 7,842,684,632byte, native peak RSS 44,236,800byte,
  workspace 184,160,117byte. 품질 assertion 뒤의 자원 gate는 실행되지 않아 PASS로 세지 않는다.
- [정리](13-cleanup.json): 전용 Ollama PID 28215의 모델 목록 비움, 종료와 tool session exit 0,
  23451 포트 폐쇄, 네 품질 실행과 native/HTTP wrapper root 부재를 확인했다. HTTP 자체 root와
  제품 프로세스/포트는 누적06-http.json의 cleanup으로 확인한다.
  `/tmp/media-server-v450-decision-ollama.log`는 진단 로그로 유지한다.
- 4회 중단 조건에 따라 새 수정·테스트·후속 단계를 중단했다. 미완료 코드/fixture와 최초 실패부터의
  증거를 현재 작업 트리에 보존하며 완료 커밋·푸시·릴리즈는 하지 않았다. 재개 판단 전 자동 실행하지 않는다.

### 목표 재개 전 판정 계약·평가 기준 보완

- 사용자는 전체 목표를 재개하기 전에 평가 기준 고정→정답 관측 진단→같은 영상의 주장 반전→
  계약 수정과 기존 12사례 검증을 별도 작업으로 지정했다. 전체 목표는 paused 상태를 유지한다.
  이전 두 구간의 품질 실패 4회+4회와 원출력을 보존한다.
- 과거 수동 판정의 정정: `13-reasons`와 `13-questions`의 eight-right는 [0,7]을 인용하여
  실제로 맞는 상대 위치를 설명했다. 주장과 문구가 같다는 이유만으로 이를 탈락시킨 설명은
  부정확했다. 반면 두 실행의 eight-static은 모두 [0,7]만 인용했으므로 전체 프레임을 다룬
  근거로는 부족하다. `13-reasons`에서 이 부족을 일관되게 지적하지 않은 점을 정정한다.
  이 정정으로 과거 실행의 전체 품질 PASS나 실패 횟수를 소급 변경하지 않는다.
- 현행 inventory에 분류·설명·근거 범위·질문·한국어의 기준과 예/반례를 고정했다.
  기존 fixture에 주장 반전 3쌍을 추가하고 검증기에 `--diagnostic-text`/
  `--diagnostic-inversion`을 추가했다. text 진단은 제품 전송을 검증기 안에서 감싸 영상만
  독립 좌표 관측문으로 바꾸며, 제품 런타임에는 진단 우회 경로를 추가하지 않는다.
- 로컬 진단 서버 시작은 자동 승인 검토가 두 번 거부했다. 사유는 “4회 실패 후 명시적
  재개 승인이 없다”이며 최신 준비 작업 지시를 재검토 근거로 제시한 재시도도 거부됐다.
  서버/모델/진단은 실행되지 않았고, 준비 작업 한정 재승인을 요청했다. 이 시점에는
  진단 결과를 요구하는 다음 제품 계약 수정·12사례 검증을 시작하지 않았다.
- 준비 코드 확인: `c++ -std=c++17 -Wall -Wextra -Werror ... -fsyntax-only
  scripts/internal/va_review_smoke.cpp`, `bash -n scripts/internal/verify_va_review.sh`,
  wrapper 내 Python `compile`, 진단 파일 링크 및 `git diff --check`는 exit 0이다.
  제품 동작/모델 품질 검증은 아니다. loopback 23451 listener는 없으며 새 소유 프로세스와
  실행 fixture root는 만들지 않았다. 커밋·푸시는 수행하지 않았다.

### 명시적 목표 재개 후 주장 판정 계약 수정

- 위 자동 승인 거부 보고 이후 사용자가 “개발 목표 재개”를 명시했다. 목표 active를 확인하고
  기존 전용 Ollama/PID 37235·loopback 23451을 시작했다. 모델/digest·8192 context·1024 생성·
  호출당 60초·wrapper 800초·기존 자원 상한은 유지했다. 새로운 모델/외부 호출은 없다.
- 변경 전 사전 계획한 원인 진단 두 건은 알려진 실패를 구분하기 위한 실행이다.
  `bash scripts/internal/verify_va_review.sh --diagnostic-text http://127.0.0.1:23451`
  ([로그](14-baseline-text.log))와 `--diagnostic-inversion` ([로그](14-baseline-inversion.log))은
  각각 schema 6/6·category 3/6, 반전 쌍 0/3이다. wrapper exit 0은 실행/자원/정리 성공이며
  품질 PASS가 아니다. 좌표를 정답으로 제공해도 반증 세 건의 사실을 supports에 넣어,
  영상 인식만으로 설명되지 않는 원 주장 대조 결함을 직접 재현했다.
- provider v3/adapter `ollama-chat-v3`는 원문을 빠짐없이 덮는 주장별 claim→observations→
  verdict→실제 네 그룹을 생성한다. supported/contradicted/insufficient와 그룹의 일치를
  서버도 검사한다. 복합 질문의 지지·반증·부족을 각각 보존하고 네 공개 그룹으로 문장/근거를
  그대로 합친다. 공개 output/record 형식·수명·권한·시간 한도는 유지한다.
- [최초 빌드](14-contract-build.log) exit 0, [native](14-contract-native.log) 439 PASS/exit 0.
  소스 검토 중 허용된 앞뒤 공백 원문까지 보존하도록 보완했고
  [최종 빌드](14-contract-build-final.log) exit 0,
  [native](14-contract-native-final.log) 453 PASS/exit 0이다. 미지원/누락 판정, 원문 변조/누락,
  그룹 불일치, 복합 질문, 전체 부족 confidence, 잘못된 응답에서 출력 불변을 포함한다.
- 수정 후 같은 `--diagnostic-text`는 [6/6](14-contract-text.log),
  `--diagnostic-inversion`은 [6/6·쌍 3/3](14-contract-inversion.log), 모두 exit 0이다.
  직접 검토에서도 각 결과의 좌표/위치 관계·정지 설명·양 끝 참조·한국어가 기대와 일치한다.
  영상 쌍의 동일 package ID도 확인했다. text 진단 후 앞뒤 공백 수신 처리만 바뀌었으며
  사용한 공백 없는 여섯 원문·prompt/schema·모델 입력은 동일하므로 해당 진단을 유지한다.
- 최종 계약 후보의 HTTP/Auth/재시작: [135 PASS·5,868ms·exit 0](14-contract-http.log),
  세부 정리는 누적 06-http.json에 보존했다. UI 상태: [14 PASS·exit 0](14-contract-ui.log).
  둘 다 실제 UI 풀테스트가 아니다. 전체 12사례 품질과 실제 모델 취소/종료 결과는 아래에 기록한다.
- 첫 수정 후보의 [기존 12사례](14-contract-quality.log)는 exit 1이다. schema 12/12,
  category 8/12, uncertainty 0/4, 질문 0/4로 이번 재개 구간의 품질 실패 1회다.
  추가로 eight-left 내부 관측문은 마지막 위치를 오른쪽이라고 잘못 기술했으므로,
  공개 반증이 맞더라도 의미 합격 상한은 7/12다. 단일 이미지에서 정지를 단정하거나
  가려진 대상이 보이지 않는 것을 이동 주장 반증으로 해석한 네 건을 실패로 보존한다.
- 후속 후보는 주장별 명시 판정을 유지하면서 evidenceStatus 충분성 단계를 별도로 복원한다.
  부족이면 insufficient 판정과 unclear/questions, 충분하면 지지/반증만 허용하도록 생성/
  수신 계약을 함께 수정한다. 이전 후보의 진단 6/6은 이 후보의 최종 품질 PASS가 아니다.
- 충분성 복원 후보: [빌드](15-sufficiency-build.log) exit 0,
  [native](15-sufficiency-native.log) 469 PASS/exit 0.
  [실제 12사례](15-sufficiency-quality.log)는 자동 exit 0·schema 12/12·category 11/12·
  uncertainty 4/4·questionPresence 4/4지만 직접 품질 검토는 FAIL 2회다.
  two-static 오분류, eight-left의 잘못된 마지막 위치 관측, one-direction의 단일 프레임
  “움직임 없음” 단정으로 의미 상한은 9/12다. one-motion/one-direction 질문은 명령형 문장으로
  실제 질문 조건을 충족하지 못해 질문 합격 상한도 2/4다. 진행 보고에서 정지 비교가 맞다고
  잘못 말한 부분은 two-static 출력 확인 후 즉시 정정했다.
- 다음 후보는 충분성/주장 판정을 유지하고, 실제 입력 프레임 수 명시·끝점 비교와 중간
  구간 이동의 구분·질문형 출력의 생성/수신 제약을 보완한다. 단어 하나를 서버가 덧붙여
  질문으로 바꾸거나 모델의 분류를 보정하지 않는다. 동일 12사례와 기존 기준을 유지한다.
- 세 번째 후보: [빌드](16-question-build.log) exit 0,
  [native](16-question-native.log) 477 PASS/exit 0.
  [실제 품질](16-question-quality.log) exit 1·FAIL 3회: 앞 네 사례 뒤 two-static에서
  done_reason=length·58,535ms·잘린 JSON으로 거부됐다. 뒤 일곱 사례는 미실행이다.
  응답 크기는 2,878byte이며 정제 관측기가 잘린 본문 자체는 보존하지 않았으므로
  정확히 어느 필드에서 길어졌는지는 이 로그만으로 단정하지 않는다.
- 추가 확인한 [llama.cpp upstream 변환기](https://github.com/ggml-org/llama.cpp/blob/master/common/json-schema-to-grammar.cpp)는
  string pattern이 있으면 min/max length 분기보다 먼저 반환한다. 설치된 Ollama 바이너리의
  동일 구현 여부를 확정한 증거는 아니다. 질문의 `.*`를 제거하고 정규식 자체에 1~159자+
  물음표 한도를 넣으며 JSON 따옴표/역슬래시/제어문자를 삼키지 않도록 보완한다.
  수신의 길이/질문 조건과 1,024토큰·60초 한도는 유지한다. 다음 실패면 4회 중단한다.
- 네 번째 후보: [빌드](17-bounded-build.log) exit 0,
  [native](17-bounded-native.log) 477 PASS/exit 0.
  [실제 12사례](17-bounded-quality.log)는 자동 exit 0·schema 12/12·category 11/12·
  uncertainty 4/4·questionPresence 4/4다. bounded pattern 뒤 JSON 길이 초과는 재발하지 않았고
  실제 질문형 문장도 생성했으나, 직접 의미 검토는 FAIL 4회다. two-static은 같은 위치를
  확인하고도 insufficient로 오분류했고, eight-left 관측은 마지막 위치를 오른쪽으로 잘못
  기술했으며, one-motion 관측은 단일 이미지에서 “정지 상태로 보입니다”라고 추정했다.
  마지막 두 건은 공개 결과가 각각 반증/부족이어도 내부 관측의 사실 오류를 제외하지 않는다.
  의미 합격 상한 9/12로 기존 10/12 기준에 미달한다. 자동 exit 0을 전체 품질 PASS로 바꾸지 않는다.
- 이번 재개 구간은 품질 후보 4회 실패로 중단한다. 앞선 두 구간의 4회+4회도 유지하며,
  baseline 두 진단은 알려진 결함 재현으로 별도 표기한다. 다섯 번째 수정·실행은 하지 않았다.
  마지막 자원 gate는 실행됐으며 모델 physical footprint 7,824,957,000byte,
  native peak RSS 44,154,880byte, fixture workspace 184,260,703byte로 기존 상한 이내다.
- [정리](17-cleanup.json): 모델 목록 비움, 소유 Ollama PID 37235 종료·tool session exit 0,
  23451 listener 부재와 이번 14개 실행 fixture root 부재를 확인했다. HTTP 자원 정리는
  누적 06-http.json에 있다. `/tmp/media-server-v450-contract-ollama.log`는 진단용으로 유지한다.
  모델 weight와 기존 12/13 구간 서버 로그도 유지했다. 새 커밋·푸시는 하지 않았고,
  미완료 제품/fixture/정의 변경과 실패 원출력을 작업 트리에 보존했다.
- 최종 후보의 HTTP·실제 모델 Cancel/Stop·혼합 회귀·독립 검토·장시간·실제 UI·릴리즈는
  미실행이다. 14 구간 HTTP/상태 UI와 과거 수명 검사를 최종 후보 전체 PASS로 승격하지 않는다.
  재개 판단에는 관측 사실 오류와 충분성 오판을 안정적으로 분리할 다음 접근의 결정이 필요하다.
  모델 변경이나 추가 추론 호출·예산 확대는 이번 중단 뒤 자동 적용하지 않았다.

### 원인 분리 조치 적용 재개: 실행 승인 검토 차단

- 사용자가 “조치 내용 적용해서 목표 재개”를 명시했고 목표 active를 확인했다.
  inventory에 내부 관측·공개 결과·상호 일관성의 구분을 명시했다. 기존 의미 10/12와
  부족/질문 4/4는 유지하며 과거 실패를 소급 PASS로 변경하지 않았다.
- 현재 계약 그대로 `--diagnostic-text http://127.0.0.1:23451`을 실행하려 했으나 자동 승인
  검토가 “4회 실패 이후 새 명시 승인이 없음”으로 거부했다. 최신 사용자 재개 지시와
  goal active를 명시한 재요청도 같은 이유로 거부됐다. 명령은 실행되지 않았고
  `18-current-text.log`도 생성되지 않았다. 다른 경로로 우회 실행하지 않았다.
- 이번에 시작한 전용 Ollama PID 50363은 TERM 후 tool session exit 0, 23451 listener
  부재를 확인했다. 새 검증 fixture는 생성되지 않았다. 시작 로그
  `/tmp/media-server-v450-reassessment-ollama.log`와 기존 모델은 보존한다.
  제품 수정·모델 진단·테스트·커밋·푸시는 이번에 수행하지 않았다. 자동 검토 차단 해소 후
  현재 계약의 정답 관측문/동일 영상 반전 진단부터 진행해야 한다.

### 로컬 진단 재승인 후 현재 계약 대조

- 사용자가 로컬 진단 실행 요청을 인용해 “승인”했다. 기존 모델/digest와 provider v3를
  바꾸지 않고 전용 Ollama PID 50990/23451에서 아래 두 명령을 순서대로 실행했다.
  이전 후보 실패와 자동 승인 거부 이력은 유지한다. 이번 두 실행은 사전 계획한 원인 분리
  진단이며 수정 후보의 12사례 품질 재검증이 아니다.
- `bash scripts/internal/verify_va_review.sh --diagnostic-text http://127.0.0.1:23451`:
  [18-current-text.log](18-current-text.log), exit 0. schema/category/reference 각 6/6,
  주장 반전 쌍 3/3. 정답 좌표를 주면 충분성·방향·같음/다름 판정이 모두 기대와 일치한다.
  모델 unloaded와 fixture 제거 확인. 영상 품질 PASS로 사용하지 않는다.
- `bash scripts/internal/verify_va_review.sh --diagnostic-inversion http://127.0.0.1:23451`:
  [18-current-inversion.log](18-current-inversion.log), exit 1. schema 6/6,
  category 5/6·반전 쌍 2/3. 같은 두 이미지에서 “다르다”는 insufficient, “같다”는 supported다.
  eight-left-right는 내부 관측이 마지막을 오른쪽으로 잘못 기술하지만 공개 반증은 왼쪽으로
  맞게 설명한다. eight-left-left 내부 관측도 마지막을 중앙 근처로 기술한다(실제 x=64).
  따라서 정답 텍스트에서는 재현되지 않는 영상 기반 충분성 오판과 내부 관측/공개 결과의
  불일치가 현재 계약에서 재현됐다. 특정 필드·모델 양자화가 원인이라고 확정하지 않는다.
- 이미지 진단의 native 종료 이후 wrapper가 `/api/ps` 단회 확인에서
  `RuntimeError: model runner not unloaded`로 실패했다. 당시 모델 목록 본문은 보존되지
  않아 목록/해제 지연을 추정하지 않는다. 후속 조회는 `{"models":[]}`였고 자식 PID는 없었다.
  후속 빈 목록으로 최초 실패를 PASS로 바꾸지 않는다. AGENTS 4장 cleanup 실패 중단 기준에
  따라 새 제품 수정·검증은 보류했다. 다음 조치 후보는 기존 수명 검사의 해제 5초 기준을
  품질 wrapper에서도 관측하되 최초 목록/해제 경과를 보존하는 것이다. 아직 적용하지 않았다.
- [18-cleanup.json](18-cleanup.json): 소유 서버 TERM·tool session exit 0, 23451 listener와
  두 fixture root 부재 확인. 시작 로그 `/tmp/media-server-v450-approved-diagnostic-ollama.log`
  및 모델 weight는 유지한다. 이번 제품 변경·커밋·푸시는 없다.

### 모델 해제 관측 보완 승인 후 재개

- 사용자가 “모델 해제 검증기 보완 후 재개 승인”을 인용해 승인했다. 소유 Ollama
  PID 53458/23451, 기존 weight/digest·한국어·8192 context/1024 출력·60초 호출 한도 유지.
- wrapper는 native 종료부터 최대 5초 및 기존 800초 이내에서 모델 목록을 관측한다.
  최초/후속 모델 수와 경과를 기록하고 조회 오류·한도 초과를 실패로 전파한다. 명령/모델
  재시도나 inference timeout 확대는 없다. 최초 18 구간 실패를 소급 PASS로 변경하지 않는다.
  실제 모델명/원문 응답 대신 모델 수를 남기며 해제 상태의 시간 관측에 한정한다.
- 실제 helper를 추출한 합성 clock 검사 [19-unload-helper.log](19-unload-helper.log):
  즉시/지연 해제, 계속 점유, 늦게 끝난 조회, 조회 오류, wrapper 예산 소진 6건 PASS/exit 0.
  `bash -n scripts/internal/verify_va_review.sh`, `git diff --check` exit 0.
- `bash scripts/internal/verify_va_review.sh --diagnostic-inversion http://127.0.0.1:23451`:
  [19-unload-inversion.log](19-unload-inversion.log) exit 0, 해제 최초 관측 6ms/모델 0개와
  fixture 제거 확인. 기존 v3 분류 5/6·근거 오류는 유지되며 이번 성공은 실행/해제 검증이다.
- 첫 수정 후보는 provider v4/adapter v4로 문장을 entries에 한 번 생성하고 모델이 네 그룹에
  index를 지정한다. 모든 entry의 정확히 한 번 사용·역할·참조·판정 일치를 검사하며 서버는
  문장을 생성/재분류하지 않는다. 공개 output/record v1은 그대로다. 모든 생성 문장을 평가한다.
  [20-entry-build.log](20-entry-build.log) 빌드 exit 0,
  [20-entry-native.log](20-entry-native.log) native exit 0(945 assertion, helper 호출 포함).
- `--diagnostic-text`: [20-entry-text.log](20-entry-text.log) exit 0, 6/6 및 쌍 3/3,
  사실·근거 직접 대조 일치. `--diagnostic-inversion`:
  [20-entry-inversion.log](20-entry-inversion.log) 자동 exit 0, 분류 6/6·쌍 3/3지만
  eight-left-right의 마지막 위치를 오른쪽으로, eight-left-left를 중앙 근처로 기술했다.
  같은 위치의 비대칭은 해소됐으나 관측 사실 오류가 남아 후보 품질 FAIL 1회다.
  실패를 내부 관측 제거로 숨기지 않았고 이 후보의 원래 12사례는 실행하지 않았다.
- 두 번째 후보는 prompt/schema/모델/PNG 바이트·순서를 유지하고 각 PNG를 index가 명시된
  개별 user 메시지에 연결한다(adapter v5, provider schema v4 유지). 마지막 메시지에 같은
  원 질문·전체 시간 metadata를 전달한다. [Ollama chat](https://docs.ollama.com/api/chat)의
  messages와 [vision](https://docs.ollama.com/capabilities/vision)의 메시지별 images를 사용한다.
  text 진단은 같은 메시지 경계를 유지하며 이미지만 정답 관측문으로 대체한다.
- [21-labeled-build.log](21-labeled-build.log) 빌드 exit 0,
  [21-labeled-native.log](21-labeled-native.log) native exit 0(1,021 assertion, helper 호출 포함).
  이미지 결속/순서와 기존 오류 거부를 검사했다. 뒤에 미사용된 v3 fixture 인자/출력 변환 코드를
  제거했으며 모델 요청/판정 경로는 바뀌지 않았다. 현재 helper 소스는 후속 검사에서 다시 컴파일한다.
- `--diagnostic-inversion`: [21-labeled-inversion.log](21-labeled-inversion.log),
  `--diagnostic-text`: [21-labeled-text.log](21-labeled-text.log), 각각 exit 0,
  schema/category/reference 6/6·쌍 3/3. 두 진단의 모든 실제 설명/근거도 기대와 일치한다.
  8프레임 역순과 동일 위치 반전의 기존 오류가 이번 입력 배치에서 재현되지 않았다.
  인과는 이 고정 모델/입력 비교 범위에 한정하며 일반 영상 정확성을 보장하지 않는다.
  영상의 prompt_eval_count는 2프레임 1,619/8프레임 2,741로 기록됐고, 해제/fixture 제거 확인.
- 같은 계약의 `--local` 원래 12사례 [21-labeled-quality.log](21-labeled-quality.log)는
  exit 1이다. 앞 6건은 분류·실제 설명이 맞았지만 one-blue를 insufficient로 판단하고
  동일 missing entry를 unclear/questions에 중복 사용해 제품이 거부했다. 이후 5건 미실행.
  두 번째 후보 품질 FAIL 2회이며 자동 observer의 outputValidAt8은 제품 수신 성공이 아니다.
- 다음 수정은 “화면에 보인다”는 존재/색상 주장과 가림/단일 이미지의 상태·시간 변화
  판단을 구분한다. 부족에는 서로 다른 missing/question이 필요하므로 생성 schema의
  entries 최소 수도 2개로 맞춘다. 기존 요구·oracle·상한은 변경하지 않았다.
- [22-visibility-build.log](22-visibility-build.log) exit 2: schema 문자열 결합에서
  const char 배열끼리 더한 C++ 오류. 빌드 결과 확인 전 요청한 native는
  [22-visibility-native.log](22-visibility-native.log)에서 product build required로
  fixture/모델 실행 전에 거부됐다. 두 결과는 같은 빌드 원인의 실패 묶음 1회이며 예상 RED가
  아니다. 이번 재개 누적 검증 실패는 품질 2회+빌드 1회=3회로 관리한다.
- 같은 위치를 std::string 결합으로 수정한
  [22-visibility-build-repair.log](22-visibility-build-repair.log) exit 0 확인 후,
  [22-visibility-native-repair.log](22-visibility-native-repair.log) native 1,021 assertion/exit 0.
  `--diagnostic-text` [22-visibility-text.log](22-visibility-text.log)와
  `--diagnostic-inversion` [22-visibility-inversion.log](22-visibility-inversion.log)는
  각각 exit 0, 분류/근거 6/6·쌍 3/3. 정적 두 프레임의 동일 위치 표현은 제공된 프레임 범위로
  평가했으며 미관측 중간 구간이 정지했다는 증명으로 사용하지 않는다.
- `--local` [22-visibility-quality.log](22-visibility-quality.log) exit 1:
  schema 12/12·category 9/12·referenceCoverage 12/12·uncertainty 1/4·questionPresence 1/4.
  one-blue 오류는 해소됐지만 one-motion/one-direction/occluded-final을 반증으로 처리했다.
  단일 이미지에서 “정지 상태”도 단정했다. 유일한 blank-hidden 질문은 화면 밖 존재 여부만
  물어 이동 확인의 전후/가림 없는 자료를 요구하는 구체성 기준도 충족하지 않는다.
  모델 physical footprint 7,816,683,152byte/native RSS 44,204,032byte는 관측값이며,
  native 실패로 후속 wrapper 자원 합격 gate는 실행되지 않았다.
- 현재 schema는 `observation` entry 선택 시 supported/contradicted 분기만 남고
  insufficient 분기는 missing/question만 허용한다. 즉 관측 문장 생성 때 판정 분기가 먼저
  고정될 수 있다. 세 실패 사례는 실제 observation을 먼저 생성했다. 이 구조 제약은 확인됐지만
  모든 품질 실패를 단독으로 설명한다고 확정하지 않는다. 추가 수정/실험은 하지 않았다.
- 품질 실패 3회+빌드 실패 1회로 사용자 중단 조건(동일 단계 3회 초과)에 도달했다.
  과거 구간 실패 이력도 유지한다. 후속 HTTP/실제 모델 Cancel·Stop/혼합 회귀/독립 검토/
  장시간/실제 UI/릴리즈는 미실행이다. 미완료 품질 코드는 커밋하지 않았다.
- 검증 완료된 해제 관측만 선택 stage하여 `455226d97`로 분할 커밋했다. hook 우회 없음.
  최종 푸시는 수행하지 않았다. [22-cleanup.json](22-cleanup.json): 모델 목록 비움 확인 후
  소유 PID 53458 TERM·tool session exit 0, 23451 listener와 12개 fixture root 부재 확인.
  선택 stage용 임시 patch도 삭제했다. `/tmp/media-server-v450-unload-fixed-ollama.log`와
  기존 모델 weight는 유지한다. 실패 원출력과 미완료 source/정의/fixture는 작업 트리에 보존한다.

### 관측·충분성 계약 분리 승인 후 수정

- 사용자가 원인 분석의 수정 방향(schema/수신 검증 동시 수정, 부분 관측+판단 불가 검증,
  기존 12사례/합격선 유지)을 승인했다. 과거 실패 이력과 중단 상태를 소급 변경하지 않는다.
  이번 범위는 계약 수정·관련 단기 검증과 전체 잔여 재산정이며 장시간/릴리즈 실행이 아니다.
- 앞 절의 “observation을 먼저 생성했다”는 순서 단정은 정정한다. 보존 로그는 파서 출력 순서이며
  실제 생성 순서의 증거가 아니다. v4 schema의 분기 제약은 확인됐지만 단독 원인으로 확정하지 않는다.
- provider v5/adapter v6는 entry 유형과 충분성/판정을 공통 schema에서 독립 선택한다.
  unclear에 부분 observation과 필수 missing을 함께 참조할 수 있고 question은 별도 필수다.
  모든 entry는 한 번만 공개되며 observation의 프레임 참조, 기존 수신 오류 거부, output/record v1,
  동일 모델·60초·800초·자원·의미 10/12·부족/구체 질문 4/4 기준을 유지한다.
- `bash scripts/internal/verify_va_review.sh`: [23-contract-red.log](23-contract-red.log)는
  sandbox loopback bind PermissionError/exit 1로 예상 RED가 아니다. 소유 root 제거를 확인했다.
  같은 명령의 sandbox 권한 재실행 [23-contract-red-retry.log](23-contract-red-retry.log)는
  사전 지정한 `partial observation coexists with insufficient evidence unchanged` assertion에서
  exit 1인 예상 RED이며 cleanup=true다.
- `cmake --build build-gst-onnx -j 4`: [23-contract-build.log](23-contract-build.log) exit 0.
  같은 native 명령의 [23-contract-native.log](23-contract-native.log)는 exit 0,
  1,096 assertion PASS/0 FAIL이다. 부분 관측+부족 수용, missing 누락/관측 참조 누락 거부,
  schema 유형/판정 분리와 기존 입력·저장·큐·로컬 HTTP/TLS 회귀를 포함한다. 모델 품질 PASS가 아니다.
- 텍스트 원인 진단은 기존 주장 반전 6건에 기존 판단 불가 4건을 포함한 10건으로 보완했다.
  가림은 보이지 않는다고만 기술하며 숨겨진 위치/정답 판정을 입력하지 않는다.
  inversion 6건과 실제 영상 12건의 독립 oracle·합격선은 유지한다.
- 전용 Ollama 0.21.0/PID 65326/127.0.0.1:23451, 기존 승인 weight/digest로 실행한다.
  초기 `/api/ps`는 빈 목록, `OLLAMA_NO_CLOUD=1`·병렬 1·최대 loaded model 1이며 다운로드는 없다.
- `--diagnostic-text http://127.0.0.1:23451`: [23-contract-text.log](23-contract-text.log)
  exit 1, schema 5/10·category 1/10·부족/질문 존재 1/4. 부분 관측+부족을 실제로 표현한
  occluded-final은 수용됐지만 결정 가능한 비교를 부족으로 처리하고 일부는 미참조 entry나
  question의 unclear 참조로 거부됐다. 이번 첫 계약 후보의 실제 모델 진단 실패다.
  native 실패로 wrapper 자원 합격 gate는 미실행이다. 소유 root는 제거됐다.
- 다음 원인 분리 수정은 schema/수신기/프레임 입력/판정 지시/예산을 그대로 두고,
  SystemPrompt의 단일 insufficient JSON 예시만 제거한다. 예시의 고정 unclear [0,1]과
  questions [2]가 실제 다른 entry 구성에도 따라 나오는 현상과 부족 편향을 구분한다.
  문장 추가·합격선 변경·서버 재분류 없이 현재 format schema로 구조를 전달한다.
- 예시 제거: [24-no-example-build.log](24-no-example-build.log)와
  [24-no-example-native.log](24-no-example-native.log)는 exit 0(native 1,096/0).
  [24-no-example-text.log](24-no-example-text.log)는 exit 1, schema/category 3/10,
  부족/질문 0/4. 예시만 제거해도 불필요한 entry/참조 불일치는 남았으며 원인 해소가 아니다.
  두 번째 모델 진단 실패다. 두 진단은 영상 품질 실행으로 세지 않는다.
- 세 번째 후보는 prompt/수신기/입력을 유지하고 schema의 판정별 필수 그룹·충분성 제약을
  복원한다. 단, 기존 v4와 달리 observation은 세 분기 모두에서 허용하므로 부분 관측이
  insufficient를 차단하지 않는다. missing/question은 부족 응답에서 허용한다. native는
  세 분기 모두 observation 가능과 부분 관측+부족 수용을 검사한다. 단순 공통 shape가 허용한
  필수 질문/부족 이유 누락을 수신기까지 보내는 문제를 제한하며 합격선은 바꾸지 않는다.
- [25-branch-build.log](25-branch-build.log) exit 0,
  [25-branch-native.log](25-branch-native.log) exit 0 / 1,124 assertion PASS/0 FAIL.
- `bash scripts/internal/verify_va_review.sh --diagnostic-text http://127.0.0.1:23451`:
  [25-branch-text.log](25-branch-text.log) exit 1, schema 9/10·category 6/10·부족/질문 0/4.
  앞 주장 반전 6건은 분류·좌표 근거가 맞았다. 단일 이미지 이동/방향은 존재·위치 관측을
  supports로 지정했고, 전체 가림은 안 보인다는 사실을 contradictions로 지정했다.
  마지막 가림은 insufficient로 선택했으나 observation을 unclear/questions에 중복 참조하고
  missing과 실제 question을 생성하지 않아 strict 수신기가 거부했다. 의미 품질은 FAIL이다.
- 부분 관측+판단 불가의 표현/수용 제약은 native와 첫 진단의 실제 응답으로 해소를 확인했지만,
  최종 모델 응답에서는 주장의 참/거짓과 관측 사실의 참/거짓을 혼동하고 부족 이유/질문 생성도
  실패한다. schema의 기존 제약을 단독 원인으로 볼 수 없으며 영상이 없는 정답 관측문에서도
  재현됐다. 모델 변경·자동 재분류·질문 자동 생성·추가 후보는 적용하지 않았다.
- 이번 구간 실패는 sandbox 실행 오류 1회+실제 모델 진단 3회=4회다. 사전 지정 예상 RED는
  여기에 포함하지 않는다. 사용자 한도에 따라 새 구현·모델 실행·후속 검증을 중단했다.
  최신 계약의 영상 반전 6건/실제 영상 12건·HTTP/상태 UI·실제 Cancel/Stop은 미실행이다.
  과거 22 품질 12사례를 현재 계약의 결과로 승계하지 않는다. 기존 영상 합격선은 그대로다.
- 마지막 모델 physical footprint 7,642,259,064byte, native RSS 44,466,176byte,
  작업공간 184,210,819byte는 관측값이다. 진단 실패로 wrapper 자원 합격 gate는 미실행이다.
- 중단 전에 `./server.sh verify-docs-links` [25-docs.log](25-docs.log) exit 0/failures 0,
  `git diff --check` 출력 없음. 이후에는 결과·정리 기록과 backlog의 최소 상태만 보존했다.
- [25-cleanup.json](25-cleanup.json): 모델 목록 비움 확인 후 소유 PID 65326 TERM,
  서버 session exit 0, PID/23451 listener/이번 fixture root 8개 부재 확인. 종료 확인의 최초
  ps 조회는 기본 sandbox에서 차단됐으나 권한 조회로 부재를 확인했다. 승인 weight와
  `/tmp/media-server-v450-separated-contract-ollama.log`는 유지한다.
- 현재 미완료 제품 변경은 작업 트리에 보존했다. 이번 제품 커밋·push·PR·병합·tag·Release·
  브랜치 삭제는 미실행이다. 전체 후속 순서/승인 경계는 기존 backlog를 갱신했으며 별도 원장은 없다.

### 잔여 1~2 재개: 주장 요구·관측·평가 분리

- 사용자가 잔여 1~2(판정/부족/질문 오류 해결과 현 계약 진단·영상 12사례)를 재개 승인했다.
  과거 실패·중단 이력은 유지하며 새 모델/외부 호출/장시간/릴리즈 실행 범위는 추가하지 않았다.
- provider v6/adapter v7은 claim 다음에 requirement를 생성하고 observations와 evaluation을
  분리한다. 관측은 판정과 독립적이며 부족 이유/질문은 별도 문장 배열로 직접 생성한다.
  모든 관측은 한 공개 그룹으로, 모델의 missing은 unclear로 원문 보존한다. 시간 비교를
  충분하다고 선언하려면 서로 다른 두 프레임 이상의 근거가 필요하다. 위반은 거부하며
  서버가 판정을 바꾸거나 질문을 만들지 않는다. 모델 requirement 타당성도 의미 검토 대상이다.
- `cmake --build build-gst-onnx -j 4`: [26-requirement-build.log](26-requirement-build.log) exit 0.
  `bash scripts/internal/verify_va_review.sh`: [26-requirement-native.log](26-requirement-native.log)
  exit 0 / 904 assertion PASS/0 FAIL. 관측/평가 분리, 부분 관측+부족 수용, missing/질문 누락,
  관측 index를 질문 대신 사용, 시간 비교의 단일 근거와 기존 원문/참조/출력 불변 거부를 포함한다.
  이전 1,124 대비 합성 응답 helper의 반복 assertion 수가 줄었으며 제품 기능 수가 아니다.
  기존 오류 mode 1~37과 부분 관측 38~40을 유지·새 계약으로 대응하고 41~42를 추가했다.
- 전용 Ollama PID 70878/127.0.0.1:23451, Ollama 0.21.0, 기존 승인 Qwen 8B Instruct Q4
  digest/weight를 그대로 사용한다. 초기 모델 목록 0, cloud off·병렬1·최대 loaded1이며
  새 다운로드는 없다. 호출당 60초·wrapper 800초·14GiB/4GiB/8GiB와 기존 합격선을 유지한다.
- [26-requirement-text.log](26-requirement-text.log) `--diagnostic-text` exit 1:
  schema/category 3/10·부족/질문 1/4. 앞 여섯 사례의 원 판정과 좌표 관측은 맞지만 네 사례에서
  일부 observation을 결과에 연결하지 않아 거부됐다. 단일 이동/방향·전체 가림은 원 verdict가
  insufficient였으나 실제 수용은 한 건이며, 명령문에 물음표를 붙인 질문도 의미 실패다.
  마지막 가림은 여전히 반증으로 선택했다. 영상 품질 PASS가 아니며 이번 재개 첫 실패다.
- 다음 후보(provider v7/adapter v8)는 전체 관측 목록의 observationGroup을 모델이 직접
  명시하고 서버가 모든 관측을 그대로 그 그룹에 연결한다. 판정에 맞춰 서버가 그룹을 바꾸거나
  일부 잘못된 관측을 숨기지 않는다. 가림/단일 프레임은 comparisonAvailable 확인을 별도로
  거치며 false/충분 판정 조합을 schema·수신기에서 거부한다. 질문 객체를 별도 생성하고
  한국어 의문형 끝맺음을 제한한다. 문법 통과를 질문 구체성 PASS로 사용하지 않는다.
  기존 합격선·시간·자원은 유지한다. 기존 index 누락 거부는 전체 관측 보존 검증으로 대체되며
  임의 index 선택 필드와 잘못된 그룹 유형/값은 거부한다. 프레임 index 무결성 검사는 유지한다.
- [27-evidence-build.log](27-evidence-build.log)와 [27-evidence-native.log](27-evidence-native.log)
  exit 0, native 941 assertion/0 FAIL. [27-evidence-text.log](27-evidence-text.log) exit 1,
  schema 10/10·category 9/10·부족/질문 존재 4/4. 연결 누락과 부족 분류는 개선됐으나
  eight-left-right에서 보이는 두 위치가 있는데 comparisonAvailable=false로 오판했다.
  blank-hidden 질문은 열거 반복 후 문장이 깨졌고 occluded-final 질문은 필요한 가림 없는 시야를
  명시하지 않았다. 자동 질문 존재 4/4를 구체적 질문 품질 PASS로 취급하지 않는다. 이번 두 번째 실패다.
- 세 번째 후보는 schema 구조/모델/입력/예산을 유지하고 비교 가능 여부가 주장 참/거짓과
  독립임을 명시한다. 질문은 시간 부족의 전후 자료·가림의 보이는 시야를 구체적으로 묻도록 한다.
  직전 후보의 좁은 “있나요/가능한가요” 끝맺음은 자연스러운 “있는가요”에서 종료하지 못하고
  반복을 이어가는 응답과 함께 관측됐다. 의문형 나요/가요/습니까/까요를 생성·수신에서 허용하며
  명령형+물음표는 여전히 거부한다. 기존 의미/구체성/Korean 합격선은 변경하지 않는다.
- [28-comparison-build.log](28-comparison-build.log)와 [28-comparison-native.log](28-comparison-native.log)
  exit 0, native 973 assertion/0 FAIL. [28-comparison-text.log](28-comparison-text.log) exit 1,
  schema 10/10·category 8/10·부족/질문 존재 3/4. eight-left-right의 비교 불가 오판이 남고
  occluded-final은 반증으로 회귀했다. 질문은 반복 명령문 뒤 “빨간나요?”, “프나요?” 등으로
  깨졌으며 의미 FAIL이다. 이번 세 번째 실패로 영상 단계는 보류했다. fixture root 회수와
  모델 목록 0을 확인했다. suffix 문법만 바꾸는 접근은 충분하지 않았다.
- 마지막 후보(provider v8/adapter v9)는 비교 가능 boolean 대신 비교할 대상 상태가 실제
  보이는 comparableFrameIndices를 모델이 직접 생성한다. 충분한 시간 비교는 서로 다른
  관측 근거 두 개 이상을 요구하고, 부족 응답은 두 개 이상도 허용하여 다른 근거 부족을
  표현한다. 서버는 목록을 검증할 뿐 판정을 재분류하지 않는다. 질문 생성의 suffix regex는
  제거하되 수신 의문형 검증·명령형 거부와 기존 구체성/한국어 품질 기준은 유지한다.
  정확한 좌표와 비교 불가 판정의 혼동, 강제 suffix와 반복 질문을 각각 확인하는 후보다.
  기존 10/6/12사례·모델·호출 수·합격선·예산은 유지한다. 추가 실제 실패 시 사용자 한도에
  따라 새 구현·검증을 중단하고 소유 자원 회수 및 최소 기록만 수행한다.
- `cmake --build build-gst-onnx -j 4` [29-frame-evidence-build.log](29-frame-evidence-build.log)
  exit 0. `bash scripts/internal/verify_va_review.sh`
  [29-frame-evidence-native.log](29-frame-evidence-native.log) exit 0 / 1,063 assertion PASS/0 FAIL.
  비교 프레임 중복/범위/유형·관측에 없는 index 거부, 두 관측의 충분 판정과 두 프레임이
  있어도 다른 근거가 부족한 응답 수용, 질문 suffix grammar 부재·수신 명령형 거부를 확인했다.
- `bash scripts/internal/verify_va_review.sh --diagnostic-text http://127.0.0.1:23451`
  [29-frame-evidence-text.log](29-frame-evidence-text.log) exit 1. 최종 수용 기준으로
  schema 7/10·category 6/10·referenceCoverage 7/10·부족/질문 존재 0/4다.
  앞 주장 반전 6건은 모두 맞았고 eight-left-right의 비교 프레임은 [0,7]로 회복됐다.
  one-motion/one-direction은 원 verdict가 insufficient였으나 질문 대신 “확인해 주세요.”를
  생성하여 수신 거부됐다. blank-hidden도 원 verdict는 insufficient지만 “존재하지 않아”라는
  사실 미확인 설명과 보이지 않는 프레임 [0,1]을 비교 근거로 만들었고 질문 끝맺음도 실패했다.
  occluded-final은 보이지 않는 마지막 프레임을 비교 가능 근거로 포함해 여전히 contradicted다.
  분류 필드만 9/10 일치한 것을 의미/완성 결과 PASS로 사용하지 않는다. 질문 반복은 줄었으나
  실제 의문문 생성 실패가 드러났고, schema 변경만으로 가림/부재 혼동이 해소되지 않았다.
- 이번 재개는 모델 진단 묶음 4회 FAIL이다. 내부 빌드/native PASS를 품질 진척 완료로 세지 않으며,
  사용자 “동일 스텝 3번 초과 실패 시 중단” 한도에 따라 새 수정/실행을 멈췄다.
  현재 계약의 영상 반전 6건·실제 영상 12건은 선행 진단 실패로 미실행이다. 과거 영상 결과를
  승계하지 않는다. HTTP/API/Auth·UI·실제 모델 Cancel/Stop도 이번 계약으로 재검증하지 않았다.
- 마지막 native peak RSS 44,515,328byte, 모델 physical footprint 7,645,585,040byte,
  작업공간 184,226,499byte는 관측값이며 진단 실패로 wrapper의 최종 자원 합격 gate는 미실행이다.
  호출당 60초·전체 800초·num_ctx 8192·num_predict 1024·temperature 0·기존 모델/품질선은 유지했다.
- 마지막 진단 전 `./server.sh verify-docs-links` [29-docs.log](29-docs.log) exit 0/failures 0,
  `node --check scripts/internal/va_review_http_checks.mjs` exit 0, `git diff --check` 출력 없음.
  중단 이후에는 소유 자원 종료와 최소 실행/잔여 기록 보존만 수행한다.
- [29-cleanup.json](29-cleanup.json): 모델 목록 0 확인 뒤 소유 PID 70878 TERM, 서버 session
  exit 0. PID/23451 listener와 이번 26~29 fixture root 8개 부재 확인. 승인 weight와
  `/tmp/media-server-v450-requirement-ollama.log`는 유지한다. cleanup 미확인은 없다.
- 제품 변경은 미완료 상태로 작업 트리에 보존한다. 이번 추가 커밋/push는 하지 않았으며
  HEAD `455226d97` 유지, 로컬 tracking 기준 ahead 4(원격 최신 재조회 아님)다.
  잔여 1~2는 완료되지 않았고 릴리즈 blocker다. 전체 잔여 순서·승인 경계는 backlog에 갱신했다.

### 잔여 1~2 재개: 생성 구조를 모델 입력에도 명시

- 사용자가 1~2 완료와 후속 이슈 재산정을 지시했다. 기존 실패 이력과 3회 초과 시 중단 조건을
  유지한다. 새 모델/외부 provider·호출 확대·시간/품질 완화는 하지 않는다.
- 직전 소스는 schema를 format에만 전달했다. [Ollama 구조화 출력 문서](https://docs.ollama.com/capabilities/structured-outputs)는
  응답 근거를 위해 schema 문자열을 prompt에도 전달하도록 권장한다. 이 누락이 의미 실패의
  단독 원인이라고 단정하지 않으며, 동일 schema를 실제 모델 입력에도 제공하는 후보를 검사한다.
  지시는 간결하게 정리하고 가림/부재 구분, 실제 한국어 의문문 예시(차량/문)를 제공한다.
  fixture의 좌표·색상·정답은 prompt에 넣지 않는다. provider v8/adapter v9 수신 계약과
  공개 output/record v1은 유지하고 prompt hash로 후보를 구분한다.
- 먼저 build/native의 schema 입력 일치 및 기존 거부/보존 계약을 확인한 뒤 기존 text 10건,
  영상 반전 6건, 영상 12건을 순차 수행한다. 선행 의미 실패는 다음 단계 PASS로 대체하지 않는다.
  60초/800초, 8192 context/1024 생성, 기존 자원·합격선과 승인 모델을 그대로 유지한다.
- [30-schema-grounded-build.log](30-schema-grounded-build.log) exit 0,
  [30-schema-grounded-native.log](30-schema-grounded-native.log) exit 0 / 1,064 assertion PASS.
  [30-schema-grounded-text.log](30-schema-grounded-text.log) exit 1: 앞 6건은 최종 category가 맞지만
  static-different/static-same의 requirement가 single-frame-state라 내부 의미 FAIL이다.
  7번째 one-motion은 60,058ms review-timeout으로 중단했으며 나머지 3건은 미실행이다.
  timeout 응답 본문은 없으므로 정확한 반복 필드나 token 수는 추정하지 않는다. 최초 정답 관측
  2프레임 입력은 prompt 2,804 tokens/27,268ms였으며 이전 후보보다 큰 입력을 직접 확인했다.
  모델 목록 비움·fixture 회수 확인. 이번 재개 첫 실패이며 시간 한도를 늘리지 않는다.
- 다음 후보는 반복된 evidence shape를 $defs로 공유하되 format과 모델 입력의 schema 일치를
  유지한다. 컵/불투명 상자의 완전한 부족 응답 예시로 실제 관측·보이지 않는 상태·질문 역할을
  보여 준다. fixture의 도형/색상/좌표·정답은 넣지 않고 정지 비교도 temporal이라는 의미를
  명확히 한다. 수신기·공개 계약·고정 사례·예산/합격선은 그대로다.
- 전용 Ollama PID 79978/127.0.0.1:23451, 초기 모델 목록 0, Ollama 0.21.0,
  기존 승인 Qwen 8B Q4 digest/6,140,415,975byte weight를 사용한다. cloud off·병렬1·loaded1,
  신규 다운로드 없음. 서버 로그 `/tmp/media-server-v450-schema-grounded-ollama-79978.log`.
- [31-grounded-example-build.log](31-grounded-example-build.log) exit 0,
  [31-grounded-example-native.log](31-grounded-example-native.log) exit 0 / 1,070 assertion PASS.
  [31-grounded-example-text.log](31-grounded-example-text.log) exit 1. 앞 6건은 requirement와
  실제 좌표 관계·원 주장 분류 모두 맞아 static의 내부 오류도 해소됐다. 그러나 one-motion에서
  다시 60,055ms review-timeout이며 뒤 3건은 미실행이다. 두 번째 실패다.
- 새 후보를 추측해서 반복하기 전에 같은 소스의 SystemPrompt/Schema/reminder를 직접
  추출하고 one-motion 정답 관측문 한 건을 stream=true로만 바꿔 최대 60초 관측한다.
  첫 부분에서 반복/필드 혼동이 보이는지와 정상적으로 짧게 종료하는지를 구분한다.
  1024 생성/8192 context/temperature0/keep_alive0 유지, 임시 컴파일 60초 이내, 실제 제품
  비스트리밍의 합격 증거로 사용하지 않는다. 합성 본문만 보존하고 소유 임시 root를 회수한다.
- [32-one-motion-stream-diagnostic.json](32-one-motion-stream-diagnostic.json): 관측 script exit 0,
  모델 응답은 60,001ms에 미완료/TimeoutError. 제품 품질 PASS가 아니다. 첫 assessment는 실제
  부분 관측+insufficient+의문문을 생성했으나, 동일 claim/assessment를 완성된 형태로 6회 반복하고
  7번째를 쓰다가 한도에 도달했다. 이는 stream=true 경로에서 직접 관측한 반복이며 앞 두
  nonstream timeout의 본문을 소급 복원한 것은 아니다. 임시 컴파일 root 제거 확인.
  이번 재개에서 제품 진단 실패 2회와 이 추가 timeout 관측 1회를 보수적으로 세어 3회로 둔다.
- 다음 후보는 기존 claim 원문 순차 소비 계약을 생성 지시에도 명시하여 단일 주장은 assessment
  하나만 생성하고 원문을 다루었으면 배열/JSON을 끝내도록 한다. schema의 uniqueItems도
  명시하되, 디코더의 중복 방지 보장은 주장하지 않는다. 수신기의 중복/누락 거부는 유지하고
  출력 일부만 잘라 성공시키거나 질문을 보정하지 않는다. 질문에는 시간 비교의 전후 상태와
  가림 없는 시야를 구체적으로 묻도록 한다. 실제 추가 실패 시 현재 한도에 따라 중단한다.
- [33-single-coverage-build.log](33-single-coverage-build.log) exit 0,
  [33-single-coverage-native.log](33-single-coverage-native.log) exit 0 / 1,071 assertion PASS.
  [33-single-coverage-text.log](33-single-coverage-text.log) exit 1: schema/category/referenceCoverage
  9/10, uncertainty/questionPresence 3/4. 10건 모두 60초 안에 응답했지만 품질 FAIL이다.
  앞 6건의 요구 종류·좌표 관계·분류는 맞았다. one-motion은 원문 전체를 같은 assessment로
  두 번 생성하여 수신기가 거부했고, 단일 프레임의 위치를 “고정되어 있습니다”라고 추정했다.
  따라서 종료 지시와 uniqueItems만으로 중복 생성이 방지됐다고 볼 수 없다.
- 실제 질문/근거 검토: one-motion은 다른 프레임에서 변화가 보이지 않느냐는 유도 질문으로
  필요한 자료 확보 질문이 아니다. one-direction은 대상이 있는 다른 프레임만 묻고 전후 상태
  비교를 구체화하지 않는다. blank-hidden은 대상이 전혀 안 보이는 [0,1]을 비교 근거로 지정하고
  다시 가려진 대상의 존재를 확인할 프레임을 물어 이동 판단의 부족을 해소하지 못한다.
  occluded-final도 보이지 않는 프레임 1을 비교 근거에 넣고, 이동 위치가 아닌 가림 여부만 묻는다.
  마지막 두 사례의 원 verdict는 insufficient로 바뀌었지만 내부 근거/질문 오류를 숨기고
  완성 품질 PASS로 처리하지 않는다. questionPresence 3/4는 구체적인 질문 합격률이 아니다.
- 이번 구간은 제품 text 묶음 FAIL 3회(30/31/33)와 한 건의 추가 timeout 관측(32)이다.
  앞서 명시한 보수적 실행 실패 집계 4회에 따라 새 구현·검증을 중단했다. 32는 관측 script
  exit 0/품질 PASS 아님으로 구분하며 이를 제품 suite FAIL 4회라고 바꾸어 기록하지 않는다.
  현 소스의 영상 반전 6건·영상 12건은 미실행이며 이전 버전의 영상 증거를 승계하지 않는다.
  API/UI·실제 모델 Cancel/Stop·장시간·독립 검토·릴리즈는 이번 범위에서 실행하지 않았다.
- 마지막 native peak RSS 44,531,712byte, 모델 physical footprint 7,635,590,728byte,
  작업공간 184,232,965byte는 관측값이다. 실패로 wrapper 최종 자원/해제 합격 gate는 미실행이며
  이후 실제 모델 목록 비움을 별도 정리로 확인했다. 한도나 합격선은 확대하지 않았다.
- 마지막 실행 전에 [33-docs.log](33-docs.log) 문서 링크 검사 exit 0/failures 0,
  git diff --check 출력 없음. 중단 뒤에는 최소 결과·잔여 기록과 소유 자원 정리만 수행했다.
- [33-cleanup.json](33-cleanup.json): 모델 목록 0 확인 후 소유 PID 79978 TERM, 서버 session
  exit 0, PID/23451 listener 부재. native/text root 6개와 단일 관측 root 1개, 총 7개 부재 확인.
  승인 weight와 서버 log는 유지한다. 추가 커밋/push 없음, HEAD 455226d97 그대로다.
- 잔여 1은 중복 생성의 구조적 종료 보장, 관측 가능한 비교 근거, 부족을 해소할 구체적 질문으로
  다시 좁혔다. 단순 종료 지시/uniqueItems의 충분성은 이번 응답으로 반증됐으며 추가 형식
  재설계가 필요하다. 잔여 2의 고정 text 10/영상 반전 6/영상 12와 이후 릴리즈 순서는 backlog를 따른다.

### 제한된 내부 계약 보완: 사용자 지정 네 단계

- 이번 요청이 기존 중단을 해당 범위에서만 해제했다. 원격/HEAD는 `455226d975ebecae72c23c09275af6a2bba7313e`,
  index는 비었고 로컬 11개 수정 및 12~33 실행 자료 109개가 존재했다. 원격 영문 단일 결과를
  기준으로 되돌리지 않았다. [출발 diff](34-local-start.patch)와 [기존 파일/증거 hash](34-local-start.json)에
  실제 로컬 출발점을 보존했다. 33 로그의 A 중복·B 보이지 않는 비교 근거·C 다른 목적 질문을
  반례로 고정했다. 새 native 반례는 보존된 필드 값을 새 wire로 표현하며 수집되지 않은 원응답을 복원하지 않는다.
- 실제 설치 client `ollama 0.21.0`, 승인 manifest SHA `0533d74300e4f9bc367d675d4e64ffd073d50ff16a2b4096cc2e8a1cf8c96319` 확인.
  설치에는 실행 바이너리만 있고 독립 grammar 검사 도구는 없다. 공식 v0.21.0의
  [SchemaToGrammar 경로](https://github.com/ollama/ollama/blob/v0.21.0/llama/llama.go)와 실제 `/api/chat` format 전달을 대조한다.
  합성 transport/schema 선언 확인을 설치 decoder의 강제 검증 PASS로 기록하지 않는다.
- 2/4는 provider v9/adapter v10: 제한된 claim key, 입력 범위 frame key, 속성/대상/시각 연결,
  claim에 종속된 gap/질문을 구현한다. 자유 질문의 의미 분할은 모델 담당이며 정확한 입력 claim 수를
  생성 전에 확보한 것은 아니다. 공개 v1·PNG·worker/권한·모델/options/60초/800초는 유지한다.
- 3/4는 V450-K03 반례와 직접 영향만, 4/4는 고정 source에서 text10→반전6→영상12 각각 최대1회다.
  품질 실패 뒤 재수정/모델 재호출 없이 증거·미완료 체크포인트를 보존하고 일반 push한다.
  전체 acceptance/장시간/UI 풀테스트/PR/main/tag/Release는 이번에 실행하지 않는다.
- 2/4 구현은 [현재 계약](../../superpowers/specs/2026-10-05-v450-va-review-design.md#입력과-결과)에 반영했다.
  생성 단계는 제한된 c0~c15/f0~fN/gap 객체와 필드/길이/범위를 제공한다. 원문 coverage,
  visibility/property·identity/time·scope/gap의 상호 일치는 수신기에서 확인한다. 특히 scope와 gap의
  조합은 아직 생성 schema가 결박하지 않으므로 수신 거부가 생성 품질 해결을 뜻하지 않는다.
- 3/4 `cmake --build build-gst-onnx -j 4` [build](34-contract-build.log) exit 0,
  `bash scripts/internal/verify_va_review.sh --contract-only` [focused](34-contract-focused.log) exit 0/162,
  동일 명령의 기본 [native](34-contract-native.log) exit 0/368, `--http-only`
  [HTTP](34-contract-http.log) exit 0/135. 기존 worker·권한·PNG/hash·저장·취소·자원 회수와
  adapter v1~v10 record byte roundtrip을 검사했다. 실행 중 코드 오류/재실행은 없었다.
  검사 개수는 반복적인 이전 schema assertion의 개수와 품질 지표로 비교하지 않는다.
  문서 링크 [34-docs.log](34-docs.log) exit 0/failures 0, node/bash syntax와 diff 확인을 수행했다.
- 4/4 시작 전에 [18개 source/기준·binary·모델/options 고정](34-evaluation-freeze.json)을 남겼다.
  전용 server 0.21.0/PID 88661/23451, 승인 모델 digest와 초기 model 목록 0을 확인했다.
  `--diagnostic-text http://127.0.0.1:23451` [실제 원응답/수신 사유/공개 결과](34-contract-text.log)는
  1회/10호출/exit 1이다. 사례별 여섯 축·직접 의미 검토·실행 수·자원은
  [구조화 평가](34-evaluation.json)에만 상세히 둔다. 같은 구현 assistant가 검토했으며 독립 검토가 아니다.
- 이번 표본은 모두 c0 한 번과 정상 stop JSON을 생성했고 숨겨진 위치값은 null이었다.
  실제 관측문과 원 verdict는 맞았으나 one-motion/one-direction의 single+additional-frame,
  occluded-final의 endpoints+unobserved-interval이 충돌하여 수신기가 거부했다.
  질문은 시간 순서를 둔 위치 비교/가림 없는 자료 확보 대신 다른 위치·원 주장 확인을 묻거나
  이동을 전제했다. 질문의 필요 필드가 연결됐어도 실제 질문 의미는 해결되지 않았다.
- 고정 텍스트 gate FAIL에 따라 영상 반전 6건·영상 12건은 notRun이다. 모델·예시·prompt/schema를
  다시 고치거나 두 번째 품질 실행을 하지 않았다. A/B의 이번 표본 진척을 일반 영상 품질이나
  decoder의 부정 사례 강제 검증으로 확대하지 않는다. 코드 고정 후 source hash는 모두 일치한다.
- 후속 검토점은 scope/요구 관계와 gap을 생성 시 함께 제한하는 계약, 중립적인 실제 근거 확보 질문이다.
  추가로 unobserved-property 검사가 identity 불명과 관측 불가의 공존을 과도하게 거부할 가능성을
  코드에서 확인했다. 이번 실제 응답은 그 gap 조합을 쓰지 않았으며 추가 실행/수정은 하지 않는다.
- [정리](34-cleanup.json): 모델 목록 0 후 전용 server TERM/session exit 0, PID/23451 부재,
  native/HTTP/text fixture 5개와 소유 구현 임시 파일 2개 부재, 기본 `.media_server/recordings`는
  전후 모두 부재다. weight/server log는 유지한다. 실패로 wrapper의 최종 자원/5초 해제 gate는
  미실행이며 뒤의 model 목록 0 관측을 5초 gate PASS로 대체하지 않는다.
- 품질 미완료 체크포인트와 실행 증거를 분리해 커밋한다. 원격 기준 차이·검증 대상은 위 freeze와
  출발 patch로 추적하며 증거 커밋 때문에 모델을 재실행하지 않는다. v4.5.0 릴리즈 완료가 아니다.
- 코드 체크포인트 `4bc437a64041f34aed587e60d63bb3fff99af3db`의 18개 평가 source/기준 파일 hash가 freeze와 모두 일치한다.
  실행 증거와 과거 실패 원본은 후속 보존 커밋으로 분리하며 일반 push 뒤 실제 원격 SHA는 최종 보고에서 확인한다.

### 35: 충분 판정과 부족 설명 분리 — 사용자 지정 세 단계

- 기준 HEAD/원격 `d6342dadf99215f2982e98b555a7b5a6db4b54e3`, clean tree/index에서 시작했다.
  AGENTS SHA256 `647c508aa5e855784a8f8c711643cb3488c682736540df4be54262a5cf1420ba`를 확인했다.
  34의 10개 원응답을 그대로 읽고 기존 scope/gap 3건 거부와 질문 0/4를 변경하지 않았다.
- provider v10/adapter v11은 공통 scope와 gap의 중복 target/property를 제거했다. 충분은
  verdict+basis, 부족은 verdict+gaps 두 형식이며 속성 관측·unknown/other identity·PTS를
  독립 계산한다. 공개 v1, 원문/PNG, 무효 출력 거부·저장 방지, 기존 모델/options/예산은 유지한다.
  34의 자연어·관측값·verdict를 바꾸지 않고 새 wire로 옮긴 합성 반례는 기존 fixture 위치에
  별도 표시했다. 원 모델 응답의 새 PASS나 decoder 강제 보장으로 간주하지 않는다.
- 실제 실행 전에 inventory에서 질문/문맥을 중립성·새 자료 요청·대상/속성·시간/구간·중복으로
  나눠 해석을 명확히 했다. 특정 정답 문구 대신 실제 의미를 평가하고 34의 기준/결과는 보존했다.
- `cmake --build build-gst-onnx -j 4`: [최초 build](35-contract-build-initial.log)는 exit0이나
  adapter allowlist 편집의 comma 경고가 있었다. 조건 연산자로 수정한 [build](35-contract-build.log)는 exit0/경고 없음.
  native 첫 실행 요청은 자동 승인 검토 서비스의 capacity 오류로 실행되지 않았고 동일 검토 재요청은 통과했다.
  [native 컴파일 실패](35-contract-native-compile-fail.log)는 합성 fixture 로더의 초기값 누락이다.
  exit1/검사 본체 미실행/임시 root 회수였으며, 초기화 수정 후 아래 묶음을 한 번 실행했다.
- `bash scripts/internal/verify_va_review.sh`: [native](35-contract-native.log) exit0/428 assertion.
  정적/시간 비교·관측 불가+동일성 불명 공존·미충족 충분 판정 거부·원문 coverage·혼합 주장·
  34 변환10건·저장/취소/권한·TLS와 adapter v1~v11 byte roundtrip을 포함한다.
  `--http-only`: [HTTP](35-contract-http.log) exit0/135, 기존 결과를 보존한 `06-http.json`에 추가했다.
  [문서 링크](35-docs.log) exit0/failures0, node/bash syntax 및 diff 확인도 수행했다.
- 실제 평가 전 [19개 source/기준·binary·모델 고정](35-evaluation-freeze.json)을 기록했다.
  전용 Ollama0.21.0/PID92909/23451, 기존 digest·options·60초/호출 및 text 공유800초를 유지했다.
  `--diagnostic-text-uncertain` [원응답·수신·공개 결과](35-text-uncertain.log)는 1회/4호출/exit1이다.
  정상 stop JSON4/4, 수신3/4, 부족 판정1/4, 질문 존재1/4, 필수 질문 의미0/4로 전체 FAIL이다.
  [축별 수동 평가](35-evaluation.json)는 같은 구현 assistant의 검토이며 독립 검토가 아니다.
- one-motion은 한 장으로 정지/반증을, occluded-final은 가시성으로 이동 반증을 생성하여
  수신 가능한 의미 오답이 됐다. blank-hidden도 이동을 가시성으로 바꾸었으며 unknown identity
  관측으로 충분 판정하여 수신기가 올바르게 거부했다. 이는 과거 유효 부족 응답의 scope 충돌과 다르다.
  one-direction만 부족 판정을 했고 질문은 중립적 새 이미지 요청/대상·위치를 충족했지만 시간 순서가
  빠졌다. missing의 무변화/비교 정보 부재 표현도 불명확하다. 질문만 남은 실패로 축소하지 않는다.
- 첫4 필수 gate 실패에 따라 text나머지6·영상반전6·영상12는 notRun이다. 추가 수정/후보/호출은
  하지 않았다. 현재 모델의 이 네 응답을 일반 능력 한계로 단정하지 않으며 후속 설계 방향은 별도 결정이다.
  native와 실제 모델 종료 후 frozen19개 source 및 과거34 증거 hash가 모두 일치했다.
- [정리](35-cleanup.json): 사후 모델 목록0 후 소유 server TERM/session exit0, PID/23451 부재,
  실패한 컴파일을 포함한 wrapper root4개와 HTTP inner root1개 부재, 구현 임시 파일 회수 확인.
  기본 recording 저장소는 전후 부재이며 승인 weight와 전용 server log는 유지한다.
  품질 실패로 최종 자원/5초 unload gate는 notRun이다. 사후 모델 부재를 해당 gate PASS로 바꾸지 않는다.
- 검증된 내부 코드·반례와 실제 FAIL/미실행 증거를 별도 미완료 체크포인트 커밋으로 보존한다.
  원격 변경 확인 후 일반 push 범위만 수행하며 PR/main/tag/Release·장시간/UI 실행은 비범위다.
- 코드 체크포인트 `b9520c7f32469926db8c62fec5e03873c9d1732f`의19개 source/기준 hash와 평가 freeze가 일치한다.
  최종 기록 링크 검사 `35-final-docs.log`도 exit0/failures0이며 실행 증거는 후속 별도 커밋이다.
- 증거 stage 후 `git diff --cached --check`는 exit2: native 원출력21/22/25/26행의
  끝 공백4곳을 보고했다. 실제 stdout bytes 보존을 위해 로그를 정제하지 않았다. 앞선 source/문서
  diff 확인은 exit0이며 이 원출력 공백을 제품 검사 실패나 전체 형식 PASS로 바꾸지 않는다.

### 36: 원인 분리 조사 — 제품 불변

- 기준 HEAD/원격 `fd27e87fb5c5f08d45d8fb53f568710e31f715af`, clean tree/index,
  AGENTS hash와 기존 모델/설치를 확인했다. 제품 source/실행 binary는35와 동일하다.
- `bash scripts/internal/verify_va_review.sh --cause-offline`: [오프라인](36-offline.log) exit0,
  119개 진단 assertion/모델0회다. 35 원응답4건과 같은 A 요청 hash를 재구성해 오통과·
  검증 경로 선택·공개 예산 충돌을 재현했다. assertion 성공은 품질 PASS가 아니다.
- [요청12개 고정](36-request-freeze.json)과 [source·모델·기준 고정](36-evaluation-freeze.json)을
  실제 호출 전에 남겼다. `--cause-ab http://127.0.0.1:23451` [비교 원출력](36-comparison.log)은
  exit0/12호출/재시도0이다. 진단 제어 assertion201개를 제품 native PASS 수로 합산하지 않는다.
  기존 전체 native/HTTP·text10/영상반전6/영상12·장시간/UI는 실행하지 않았다.
- 축별 수동 판단·34/35 공통4 비교·예산 계산·한계는 [조사 결과](36-diagnosis.json)에,
  최종 원인/책임 분리 권장안은 [기존 설계의 제안 절](../../superpowers/specs/2026-10-05-v450-va-review-design.md#원인-분리-조사와-구조-변경-제안-36-미구현)에 둔다.
  같은 구현 assistant의 검토이며 독립 검토가 아니다. 과거 응답/FAIL/source hash를 수정하지 않았다.
- [정리](36-cleanup.json): resource gate와 native 종료+5초 unload gate를 통과했다.
  unload helper 관측은9ms/모델1→72ms/모델0이며 사후 조회에서도0이다. 소유 PID95413
  TERM/session exit0, listener23451 부재, offline/실제 비교 임시 root2개 부재를 확인했다.
  승인 weight·전용 server log는 유지한다. 기본 recording 저장소는 전후 부재다.
- 제품은 변경하지 않고 진단 코드·필요 증거·제안만 커밋/일반 push한다. 이번 완료 범위는
  원인 분리와 구조 제안 확정이며 제품 품질이나 v4.5.0 개발/릴리즈 완료가 아니다.
- 진단 코드 `57ccddf3f23113dda24e5fd25ac30b006baaad26`의17개 평가 source/기준 hash가 freeze와 일치한다.
  문서 링크 `36-final-docs.log` exit0/failures0, source/문서 공백 검사 exit0이다.
- 실제 비교 stdout의 `model metadata transport` 성공 행 13곳에는 끝 공백이 있다.
  원출력 bytes를 보존하며 증거 전체 공백 검사 경고와 source/문서 검사 결과를 구분한다.


### 37: 판정 핵심 구현과 제한된 관측 검증 — 공개 경로 미연결

- 사용자 승인: 36 조사 종료·사용자 확인 의도/서버 판정 방향 채택. 이번에는 1묶음의 내부 핵심,
  직접 검사, 최대8 이미지 관측과 커밋/일반 푸시만 수행한다. 2묶음 API/UI·권한·저장 연결은 미실행.
- 실행 코드 `d867e69709b977c46b7841ff879493de4b421d1c`, 기준 `447486c5c87fca899ea5da8137bb556ea6bf273a`.
  [source/설정 freeze](37-evaluation-freeze.json), [요청8개](37-request-freeze.json),
  [픽셀 직접 oracle](37-pixel-oracle.json), [축별 결과](37-evaluation.json)를 연결한다.
  과거34~36 byte/hash는 불변이며 동일 구현자의 검토로 독립 검토가 아니다.
- `cmake --build build-gst-onnx --target media_server_runtime -j 4`: 최초 [정수형 빌드 실패](37-build.log)
  exit2→자료형/양수 검사 수정→[재빌드](37-build-fixed.log) exit0. 개별 gap 상한 보완 후
  [최종 빌드](37-build-final.log) exit0. 전체 제품 테스트는 실행하지 않았다.
- `bash scripts/internal/verify_va_review.sh --core-only`: [초기 컴파일](37-core.log) exit1
  (검사 변수 초기화 경고)→수정 후 [직접 검사](37-core-fixed.log) exit1
  (fixture의 공백 포함 JSON 문자열을 raw 비교하여 다른 대상 입력 누락)→strict scalar 파싱 후
  [반례 검사](37-core-fixture-fixed.log) exit1 (잘못된 anchor 반례가 유효 자기 anchor였음).
  의도한 잘못된 anchor를 구성하고 유효 별도 anchor 부족 대조도 추가했다. 기존 기대값은 유지했다.
  [최종 직접 검사](37-core-final.log) exit0: fixture41·예산10경계, assertion168. 실제 모델0회.
- `bash scripts/internal/verify_va_review.sh --observe-local http://127.0.0.1:23451`:
  [원출력](37-observation.log) exit0/8호출/재시도0/정상종료 JSON8. 제어 assertion62는 품질 PASS가 아니다.
  입력 허용5·좌표 범위 오류 거부3, 주어진 허용 관측에 대한 서버 판정5/5,
  픽셀/관측 품질3/8·조합 label5/8·관측과 조합 모두 적합3/8이다. 의미 오류 뒤 재질문/수정은 하지 않았다.
  단일 두 사례는 범위 안 오좌표, 가림 끝점·정상 전후 비교3건은 범위 밖 좌표이며 두 비교에는
  잘못된 different 동일성도 포함된다. 허용5의 판정이 맞아도 관측 오류를 해결한 것은 아니다.
- 위8회의 ClaimSpec은 명시 판정기 입력이다. 이동 원문 해석/연속 경로/한국어 질문 생성/
  제품 전체 품질/실제 CCTV/장시간/UI/릴리즈는 검증하지 않았다. 기존 provider/API/UI/record/저장
  경로는 변경하지 않아 기존 공개 오통과가 차단됐다고 주장하지 않는다.
- [정리](37-cleanup.json): 자원 상한과 native 완료 후5초 unload gate 통과. helper의6ms/모델1→
  64ms/모델0은 helper 시작 기준이며, 사후 조회에서도0을 확인했다. 소유 Ollama PID99196
  TERM/세션 exit0, 포트23451·임시 root5개 부재, 기본 recording 저장소 전후 부재를 확인했다.
  기존 승인 weight와 전용 server log는 유지한다. 추가 모델 실행은 하지 않는다.
- 문서 링크 최초 [검사](37-docs.log)는 신규37절 anchor 철자 오류1건으로 실패했다.
  source/문서 공백 검사 exit0, 코드 고정 뒤 공개 기존 경로 diff 없음과 freeze의 source/34~36
  hash 불변을 다시 확인했다.
  최초 shell exit0는 후속 공백 검사 결과이며 링크 검사의 개별 exit는 수집하지 않았다.
  anchor 링크 수정 뒤 `node scripts/internal/verify_docs_links.mjs` 단독 [재검사](37-docs-fixed.log)는
  exit0/failures0이다. 추가 제품·모델 검사는 실행하지 않았다.


### 38: 관측 좌표·동일성 연결 보완 — 미완료 관측 체크포인트

- 기준 HEAD/원격 `aaf04f98e37965ef3ddd72d5b3ba1f483541408a`와 clean tree/index를 확인했다.
  후보 코드 `9c0d0015b0d83ca98c6cbb27aed12f46db4c7de1`은 상대 bbox→원본 중심 변환과
  직접 검사만 변경한다. core 및 공개 provider/API/UI/record/store는 불변이며 2묶음은 시작하지 않았다.
- [입력·공식 계약 확인](38-input-contract.json): 37 보존 요청의 PNG12회분을 직접 디코딩해
  512×288 크기·순서·key/PTS·hash·독립 픽셀을 확인했다. 새 fixture PNG/base64/프레임 message도
  같은 바이트다. 설치0.21.0 대응 소스와 GGUF metadata상 이 입력은512×288로 계산되지만
  내부 tensor/최종 prompt의 실행 계측은 아니다. 37의 원 픽셀 응답/FAIL/3/8은 재해석하지 않았다.
- `cmake --build build-gst-onnx --target media_server_runtime -j 4`: [빌드](38-build.log) exit0.
  `bash scripts/internal/verify_va_review.sh --observer-only`: [직접 검사](38-offline.log) exit0,
  assertion132/변환15/기존 core13사례/모델0회. 불량 값 자동 보정 없이 오류로 거부한다.
- [요청 바이트](38-request-freeze.json)와 [source/모델/options/평가 고정](38-evaluation-freeze.json) 후
  `bash scripts/internal/verify_va_review.sh --observe-local http://127.0.0.1:23451`을 한 번 실행했다.
  [원출력](38-observation.log) exit0, 고유 모델6회/재시도0, 명세8사례다. 바이트가 같은 단일2개와
  정적2개만 각각 응답을 공유한다. 제어 assertion76은 관측 품질 PASS가 아니다.
- [축별 결과](38-evaluation.json): relative bbox6개는 범위/형식 적합하지만 환산 중심 ±1px 충족0개.
  가시성10/10·정적 색상1/1(고유 요청 기준), 수신 허용3/6요청→판정5/8명세, 허용 관측에 대한
  판정5/5는 맞았다. unknown+anchor 모순3요청은 오류로 거부했고 두 좌우 비교의 different 근거는
  여전히 위치 변화뿐이다. 정상 좌우 지지/반증 미도달. 조합 label5/8, 관측까지 적합3/8(고유2/6)이다.
  거부 응답의 환산 좌표는 고정 수식에 따른 감사 계산이며 core로 반환된 관측으로 표시하지 않는다.
- 실제 실행은 개별 최대11.301초/호출 합계56.328초, 자원 한도 이내다. [정리](38-cleanup.json)는
  native 종료+5초 unload gate 통과(helper6ms/모델0), 별도 사후 모델0, 소유 PID2865 세션 exit0,
  포트23451·runner·소유 임시 root/조사 script 부재를 구분해 확인했다. 승인 weight와 서버 log는 유지한다.
- 정확한 위치 추출과 근거 있는 시간 간 대상 연결이 남은 차단이다. 모델/관측 수단 또는 정밀도·
  동일성 근거가 필요한 지원 관계의 범위를 별도 결정해야 한다. 허용 오차 확대/프롬프트 재시도/
  질문·저장 버전으로 우회하지 않는다. 같은 구현자의 검토이며 독립 검토나 전체 품질/릴리즈 완료가 아니다.
- 문서 링크 최초 [검사](38-docs.log)는 새38절 anchor의 Unicode 구분자 불일치1건으로 exit1이다.
  해당 링크를 기존 기록 문서로 수정한 뒤 [재검사](38-docs-fixed.log) exit0/failures0을 확인했다. 제품/모델 재호출은 없다.


### 39: 요구와 관측 자료 출처 확인 — 연결 보류

- 기준 branch `v4.5.0`, HEAD/원격 `0de7059941276df35d4240c158a94dea58a6bff6`, clean tree/index,
  ahead/behind0을 확인했다. 38 실험은 미충족으로 종료하며 같은 모델의 bbox/identity 재평가는 추가하지 않는다.
- [기존 설계](../../superpowers/specs/2026-10-05-v450-va-review-design.md)의39절에 계산 정확성·관측 위치 정확성·
  core 관계 허용 오차의 출처를 구분했다. 원 로드맵에 공통 ±1px 요구가 없으므로 로드맵은 중복 수정하지 않았다.
- 읽기 범위는 projector의 ReferencedObservation 저장→검색 결과→패키지 builder/프레임 추출 한 경로와
  38의 합성 입력 생성 코드다. 운영/고객 DB·영상은 열람하지 않았다. bbox가 별도 카탈로그에 저장된다는 사실과
  선택 package에 per-frame 관측·좌표 변환 출처가 보존되지 않는 경계를 구분했다. 전체 저장 구조 감사가 아니다.
- 실제 선택 입력에 A 관측이 없어 adapter·오프라인 연결 검사는 미실행이다. synthetic oracle를 제품 관측으로
  대체하지 않았다. 필요한 보존 시점/필드와 A/B/C 판단 범위는 설계에만 기록했다. 제품 source/fixture/공개 계약은 불변이다.
- 모델0회, 설치0회, 제품 빌드/전체 native·HTTP/acceptance/UI/장시간 미실행. 소유 서버·포트·모델·임시 자료를 만들지 않았다.
  이번 산출물은 요구/자료 출처 경계와 최소 보존 변경안이며 VLM 품질 또는 VA Review 전체 완료가 아니다.
- `node scripts/internal/verify_docs_links.mjs`: 최초 [검사](39-docs.log) exit1, 새 로드맵 anchor의
  Unicode 구분자 불일치1건. 문서 링크로 수정한 뒤 [재검사](39-docs-fixed.log) exit0/failures0을 확인했다.
  `git diff --check` exit0. 기준 HEAD와 비교해 기존 문서2개에만 append됐고 기존 절·34~38 파일·
  제품 source/fixture의 diff가 없음을 직접 검사했다(exit0). 문서 변경만 커밋/일반 푸시한다.

## 40: 선택적 분석 관측의 출처 보존·재현 경로

새 실행 승인에 따라 실제 YOLO 좌표 출처→projector→versioned catalog→선택 sample 관측 사본→
패키지 전용 reader→기존 core를 구현했다. 지원 범위/버전/상한/공개 경계는
[설계40](../../superpowers/specs/2026-10-05-v450-va-review-design.md#40-선택적-분석-관측의-출처-보존·재현-경로)에 둔다.
코드는 `a36fb92a0`이며 [실행 source hash](40-source.json)와 [개별 명령·exit·결과](40-validation.json)에 결속한다.
실제 원본/catalog 제거 뒤 새 프로세스의 package-only readback과 정상/부재/미확인/변조·취소/경쟁 검사가 통과했다.
이는 모의 VA 출력의 자료 전달/재현 검사이며 A 기록 일관성을 독립 영상 사실 검증으로 승격하지 않는다.

최초 fixture geometry 실패는 [원로그](40-initial-failure.log.gz)에 남겼다. burst 입력 조건을 수정한 중간 검사와
최종 검사를 구분했다. [전역 주석 검사](40-comments.log.gz)는 수정하지 않은 기존 파일의 13건으로 FAIL이며
baseline의 해당 줄과 전체 파일 바이트를 대조했다. 이번 변경 파일의 주석 위반은 0건이다.
기존 34~39 원문/실패·38 요청 동결은 수정하지 않았다. 모델 호출·설치·추론 품질 평가 0회,
임시 fixture/process 정리 완료이며 5초 모델 unload gate는 실행하지 않았다(소유 모델 없음).
공개 API/UI·VA 결과/record 전환·추가 모델 평가·릴리즈는 미실행이다.

증거 커밋 `8a05ec4ab`의 원문 stdout 공백은 내용 삭제 없이 gzip으로 보존했다. 복원 바이트/hash를 대조했으며
원래 로그와 첫 실패는 이전 커밋에도 유지된다. 제품 코드·검사 결과를 변경하거나 다시 실행하지 않았다.


## 41: 출처가 결속된 내부 결과·저장 버전

[설계41](../../superpowers/specs/2026-10-05-v450-va-review-design.md#41-출처가-결속된-내부-검토-결과와-저장-v2)의
record/output v2와 package v2→A reader→core→기존 원자 저장 경로를 구현했다. 코드 `40e83ebdebc09c96f5963a4de3a7be6c0176b58d`,
[실행 대상](41-source.json), [명령별 종료 코드·한계·최초 실패와 재검증](41-validation.json)에 결속한다.
최종 직접 실행은 생성/저장93, 별도 프로세스 readback17, v1 record52, core168건 PASS다.
명시 mock VA/ClaimSpec의 저장·재현 결과이며 A 기록 관계를 독립 영상 사실 검증으로 승격하지 않는다.

record는 명세·실제 분석 대상·sample·관측 출처·정책과 판정을 보존한다. 원본/catalog를 제거한 뒤 새
프로세스에서 동일 바이트를 읽었다. package 부재는 근거 열람 unavailable, 변조는 오류이며 저장 판정은
변경하지 않는다. 구형 표시 가능/한도 초과/미지원은 별도 상태이고 서버 template는 모델 생성 문장이 아니다.
공개 기존 목록/get은 내부 v2를 노출하지 않으며 v1 codec/hash·quota는 유지한다.

최초 신규 fixture는 기존 core의 종류별 gap 묶음을 프레임별 네 객체로 잘못 가정해 실패했다.
원로그와 당시 source hash를 보존하고, 기존 core/fixture를 유지한 채 두 종류에 두 frame 참조가 모두 남는지
직접 검사했다. 초기 include의 + 토큰 경고도 수정했다. 최종 코드는 검사 당시 source hash와 일치한다.
전역 주석 검사13건은 기존 원문 그대로 FAIL이며 [대조](41-existing-comments.json)에서 새 위반0건을 확인했다.
구조4·script 분류13·문서 링크·공백 검사 PASS다. 모델/설치/검출기 추론0회, 소유 fixture/자식 프로세스 정리 완료.
질문 생성·사용자 확인 API/UI·VLM 품질·공개 전환·릴리즈는 미완료이며 자동 시작하지 않는다.


## 42: 사용자 확인 기반 A 기록 검토 API/UI 연결

사용자가 지정한 package·분석 대상·관계·시점·원문을 서버 principal/revision/만료와 결속하고,
확인→명시 실행→기존 A worker/core→record v3→조회/근거 열람을 `/ops/events`에서 연결했다.
주석 전용 커밋 `dc68b6818aeeec1179813cd3a187f6d81c2de67c`와 구현 `2ad11440fc0db8028ec268b178f03585a6464d7d`, [실행 source](42-source.json),
[명령별 결과·최초 실패·수정·미실행 범위](42-validation.json), [실제 HTTP/브라우저](42-http-6.json)에 결속한다.

새 직접 검사84건, 기존 v1/v2 저장·core 회귀330건, HTTP/브라우저281 assertions가 통과했다.
브라우저는 취소 DELETE와 이미 게시된 결과의 경합을 확인했고, 실행 중 취소·게시 전 권한 회수는
모델 없는 직접 A worker 상태 검사로 확인했다. 만료는 주입한 짧은 TTL 직접 검사와 실제 HTTP 재시작으로
구분했다. 실제 변경 화면의 desktop/mobile·light/dark와 정상 근거 PNG8개를 시각 확인했다.
전체 UI 풀테스트 PASS는 아니다. 전역 주석13건은 실행 코드 불변의 별도 patch로 보정했고 새 주석 검사0건,
현재 구조4·script 분류13·문서 링크·공백 검사가 통과했다.

처음에는 일반 녹화 hit의 분석 대상 부재, 검사기의 잘못된 package 선택, 부재 fixture 위치가 실패했다.
시각 검토에서 발견한 PNG 동시 요청 제한 오류는 기존 제한을 유지하고 순차 로드로 고쳤다. 원출력과 최초
실패는 그대로 보존한다. 최종 실행 이후 제품 소스 변경은 없고 구조 측정 metadata만 갱신했다.

A 기록 관계/engine-track을 독립 영상 사실이나 물리 동일성 인증으로 승격하지 않는다.
기존 v1·내부 not-confirmed v2는 유지하고 확인은 새 v3 envelope에만 기록한다. 구형 투영 불가에서도
구조화 claim/gap 전체를 표시하며 서버 규칙 문구와 미생성 모델 질문을 구분한다.
모델 호출·설치·검출기 추론0회, 소유 서버/브라우저/포트/임시 root 정리 확인.
자유질문 해석·VLM 시퀀스 의미·한국어 질문 품질·VA Review 전체·릴리즈는 미완료이며 자동 진행하지 않는다.


## 43: 고정 gap의 한국어 자료 요청 표현 — 품질 미완료 체크포인트

내부 adapter 구현 `36dcdf869608fb87c53947f49b64892ee6352057`은 기존 v3 또는 명시 core 입력을
검증하고 실제 gap의 슬롯만 모델에 보낸다. 모델은 한국어 문장만 반환하며 core/gap/기존 record와
A API/UI는 변경하지 않는다. 모델 없는106검사와 빌드·주석·구조·문서·구문·공백 검사는 통과했다.
최초 fixture의 숫자 track ID 실패와 수정은 원출력으로 보존했다.

[고정 모델·source·한도](43-evaluation-freeze.json), [요청 바이트](43-request-freeze.json),
[실제 원응답 로그](43-local.log.gz), [형식과 구현자 직접 의미 평가](43-evaluation.json)에 결속한다.
고유6요청/각1회/재시도0으로9슬롯 모두 형식 수용했지만, 필수 의미 조건은6사례 모두 미충족이다.
추가 시점 위치 누락, 순서 대신 위치 자료 요구, 구체적인 연결 근거 부족, A 연결을 물리 동일성
확인으로 확대, 충분한 프레임 재요청, 위치값 대신 누락 이유 요청이 남았다. 일부 적절한 슬롯과
자연스러운 문장이 있어도 전체 사례 PASS로 만들지 않았다. 별도 심판/영상/설치/재질문은0회다.

[정리](43-cleanup.json): wrapper의5초 unload gate를 실제 수행해 통과했다. 첫 조회에서 모델0개를
확인한 것이며 정확한 unload 소요 시간을7ms로 주장하지 않는다. 별도 사후 모델 부재, 서버 정상 종료,
소유 프로세스 그룹/포트/임시 root 부재도 확인했다. 기존 승인 모델 파일과34~42 원자료는 유지한다.
공개 연결은 보류하며 prompt 추가·재평가를 자동 시작하지 않는다. 다음에는 모델 변경 또는 모델 생성
요구 변경의 판단이 필요하다. 40~42 완료 상태와 미완료 자유질문 해석/영상 의미/전체 질문 품질은 유지한다.


## 44: qwen3.5:9b 질문 후보 비교 — 환경 차단

43번 입력·prompt/schema·의미 기준을 유지한 비교를 요청받았으나, Ollama0.21.0의 공식
`qwen3.5:9b` pull이 manifest 단계에서412(더 최신 Ollama 필요)로 종료됐다.
[환경·모델 출처·미실행·정리 기록](44-evaluation.json)에 실제 확보 script와 CLI/server 원출력을 결속한다.
모델 다운로드/설치는 완료되지 않았고 생성0회, 6요청·9슬롯의 형식/의미는 모두 미평가다.
43번의 품질0/6을 재분류하지 않으며 새 후보의 품질 FAIL이나 두 모델 비교 완료로 표시하지 않는다.

소유 서버 정상 종료·그룹/포트 부재를 확인했다. 모델 load가 없어5초 unload gate는 미실행이며
별도 사후 `/api/ps` 확인과 혼동하지 않는다. 기존 모델 파일,40~43 기록, 제품·A 경로·harness는 유지했다.
업데이트·재시도·대체 모델은 수행하지 않았다. 재개하려면 Ollama 업데이트를 별도 승인할지 결정해야 한다.
