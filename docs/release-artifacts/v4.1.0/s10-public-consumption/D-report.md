# 3D-3 D 실제 HTTP 안정화 기록

독자는 이번 구현·검토 담당자다. 이번 실행 보존 증적이며 정책은 AGENTS, 현재 계약은 S10 설계/계획,
실행 결과 source-of-truth는 중앙 테스트 기록이다. [실행 전 정의](D-definition.md)를 기준으로 한다.

## 결과와 경계

실제 HTTP API **35**, 인증·권한 **40**, 대용량 전송·hold·종료 **10**개가 모두 PASS다.
기존 harness는 **5개 시나리오/내부40 checks** PASS이고 제품 최종 build exit0이다.
HTTP/API/권한85행과 harness5행, 유효 seed 준비8행을 구분하며 cleanup은 별도 표다.
실제 브라우저는 사용자 제외, 실제 서버 종료 후 두 번째 기동은 미실행이다.
seed 프로세스 종료 후 제품의 첫 기동이 내구 job/segment를 복구해 동일 generated IDs/bytes를
제공하는 **내구 시작복구/재개방**만 확인했다. 이를 서버 재시작·D08 재생·UI 풀테스트로 확대하지 않는다.

## 변경과 불변

- `recording_http_seed.cpp`: `recording_media_test_fixture.h` 자체 H264를 실제 managed writer에 공급하고,
  숫자 source/channel1의 실제 DerivedJobService Complete2출력을 생성한다. 단일 sample 반복 파일을
  Event로 수동 finalize하지 않는다. packet 기반 선택 증거 fixture이며 AnalysisManager 전체 검증은 아니다.
- `verify_recording_http_seed.sh`: 제품 archive/header freshness 확인, 소유 prefix/빈 root/상대경로·manifest
  경계, 독립 compile 임시물 정리. 생성 파일은 외부 서비스/운영 저장소가 아닌 Node 소유 root에만 둔다.
- `verify_v410_recording_ui_contract.mjs`: HTTP 전용 모드만 managed seed/manifest와 문자열·unknown DTO,
  generated output 목록으로 전환했다. 실제 output 둘의 MIME/전체 byte/hash, full/Range/HEAD/416,
  전체/부분 원본 중첩, accepted 미확인 목록, 허용/금지 role·scope를 실제 응답으로 확인한다.
- lifecycle은 별도 Continuous MP4에 합법적인 trailing `free` atom을 붙여 총64MiB를 만든 뒤 최종
  size/hash로 등록했다. seed와 제품 startup의 physical 검증 및 HTTP 전체 hash가 통과했다.
  writer가64MiB를 직접 만들었다거나 파생 Event 출력이64MiB라는 증거가 아니다.
- V2 `recording_segment_states_v2.hold_count`를 실제 생성ID로 조회하여 pause hold1,
  disconnect/full completion hold0, 활성 전송 중 정상 서버 종료 뒤 영속 hold0을 확인했다.
- auth는 매 실행 서로 다른 CSPRNG 난수5개를 Node 메모리에서 생성하여 fetch body에만 쓴다.
  argv/로그/파일/handoff/자식 env로 전달하지 않으며 종료 때 보유 참조를 해제한다(메모리 소거 보장 아님).
  격리 users 저장소에 plaintext가 없음을 실제 검사했고 계정/쿠키 저장소는 root와 함께 삭제했다.
- 제품 코드는 B 이후 변경하지 않았다. browser mode/기존 legacy seed는 수정·실행하지 않았으며
  현재 managed 기본 제품용 브라우저 준비 완료로 주장하지 않는다. 이 미준비 경계는 후속 legacy 정리/S11 대상이다.

## 실제 실행과 실패 이력

| 실제 명령 | exit/판정 | 원출력 | 경계 |
| --- | --- | --- | --- |
| `bash scripts/internal/verify_recording_http_seed.sh --self-test` 최초 | 1,준비 실패 | [D-SeedExpectedRed](D-SeedExpectedRed.log) | stub이 공유 Encode/Shift를 사용하지 않아 Werror 컴파일 실패; 예상RED 아님 |
| 같은 명령 RED | 1,사전 특정1 FAIL | [D-SeedExpectedRedFixed](D-SeedExpectedRedFixed.log) | 실제 managed 원본/Complete2출력 fixture 부재 assertion |
| 같은 명령 GREEN | 0,1 PASS | [D-SeedGreen](D-SeedGreen.log) | 실제 생성·physical 검증 및 compile temp 정리 |
| `node scripts/internal/verify_v410_recording_ui_contract.mjs --http-api` 첫 실행 | 1,준비 실패 | [D-HttpApi](D-HttpApi.log) | seed 검증 뒤 sandbox listen EPERM; 제품 서버 미시작·temp 정리 |
| 같은 명령 loopback 실행 권한 승인 후 | 0,35 PASS | [D-HttpApiAuthorized](D-HttpApiAuthorized.log) | 실제 API,5075ms/cleanup612ms |
| `node scripts/internal/verify_v410_recording_ui_contract.mjs --http-auth` | 0,40 PASS | [D-HttpAuth](D-HttpAuth.log) | 실제 auth/scope,4517ms/cleanup346ms; 전체 Auth wrapper 미실행 |
| `node scripts/internal/verify_v410_recording_ui_contract.mjs --http-lifecycle` | 0,10 PASS | [D-HttpLifecycle](D-HttpLifecycle.log) | 유효64MiB·hold·종료,4998ms/cleanup28ms |
| `bash scripts/internal/verify_v410_recording_timeline.sh --harness-self-test` | 0,5시나리오/40checks PASS | [D-Harness](D-Harness.log) | 기존 H01/H02/H03/H03-R01/H03-R02,31ms |
| `./server.sh build` | 0 | [D-FinalBuild](D-FinalBuild.log) | 현재 제품 최종 build, assertion 수와 별도 |
| `./server.sh verify-docs-links` | 0,failures0 | [D-DocsLinks](D-DocsLinks.log) | 메인 최종 spec/plan/roadmap·공개 사용법 포함; 실제 수치는 원출력 |
| `./server.sh verify-docs-ui-assets` | 0,10 PASS | [D-DocsAssets](D-DocsAssets.log) | 자산 정책 정적 검사; 실제 브라우저/시각 검증 아님 |

최초 실패→수정→동일 범위 재검증을 보존했다. loopback 실행 권한은 승인된 소유 서버에만 사용했다.
비밀/외부 입력/운영 저장소/장시간/브라우저 작업은 수행하지 않았다.
문서 gate는 메인 최신 문서 상태 확정 후 실행했다. 결과 기록을 연결한 최종 상태도 같은 문서 gate로 확인하며 제품 검증은 반복하지 않는다.
최종 문서 링크는 markdown264/local5861/images22/anchors110/indexed76/exclusions168/failures0,
자산10/0이다. `git diff --check` exit0, D 원출력 로그14개 trailing-whitespace0,
결과101행=최종98+과거3, 기록된 임시경로12개 현재 존재0을 직접 대조했다.
상세 대조는 같은 디렉터리의 D-FinalEvidenceCheck.log와 D-DiffCheck.log에 보존했다.

## 기존 증거의 유효 범위

메인이 A 이전 snapshot을 현재 파일에 대조한 결과 catalog.h/read_service.cpp/application_service.cpp는
B의 승인된 추가 변경으로 hash가 달랐고(exit1), catalog.cpp와 A fixture/runner 3개는 일치했다.
A 안전 helper 유지와 B의 직접 영향 회귀로 범위를 대조한 역사적 snapshot 차이이며 제품 회귀가 아니다.
A 원 fingerprint는 덮어쓰지 않았고 A 전체 파일이 현재 코드와 같다고 주장하지 않는다.
메인 C fingerprint4개는 모두 일치했다. B의 알려진 temp27개와 별개인 내부 v390-event-storage
2prefix는 개별 경로/삭제 전 크기 원출력 미기록이며, finally 정리 경계와 현재 prefix 잔여0 확인을
[B 정리 기록](B-cleanup.md)에 보존했다.

## 계측과 정리

token start/end/consumed는 실행별 계측 도구 부재로 미집계다. elapsed는 각 Node/runner 실제 측정,
source는 최종 제품/fixture/runner fingerprint와 원출력이다. 실제 서버3개 모두 exit0/SIGKILL없음,
RTSP/HTTP 동적 포트6개는 ECONNREFUSED, 소유 root는 모두 삭제됐다.
[D-results](D-results.md)는 최종98행/과거3행, [D-cleanup](D-cleanup.md)은 기록된 소유 임시경로12개와
프로세스/포트를 전수 보존한다. [D-fingerprints](D-fingerprints.log)는 변경 fixture/runner와 공통 helper,
실행된 최종 binary/archive8개이며 [실제 확인](D-FingerprintCheck.log)은 모두 OK다.
커밋·푸시는 담당자가 수행하지 않았으며 메인이 최종 검토 후 수행한다.
