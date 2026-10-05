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
