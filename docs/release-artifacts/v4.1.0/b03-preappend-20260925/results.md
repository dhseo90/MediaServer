# B-03 내구 기록 전 검증 결과

독자: 녹화 저장 개발·검증 담당자. 수명: B안 구현의 과거 실행 증거.
정책은 AGENTS.md, 현재 단계는 중앙 테스트 기록이 기준이다. 실제 B 쓰기 완료 증거가 아니다.

## 결과와 한계

Catalog의 기존 domain Apply와 OrderHistoryIndex의 검사 분기를 공유하고 적용 여부만 분리했다.
비변경 검사에서는 현재 값·ID·revision·hold·accepted provenance·원장/SQL bytes가 불변이다.
기존 cold weak 캐시 갱신과 실제 손상 발견 시 poison은 유지한다. 전체 Catalog 복사나 과거 replay는 추가하지 않았다.
빈 관리 저장소의 다른 store 예약은 관리 store 결박으로 거부하고 비관리의 기존 수용은 유지한다.
검증 결과는 호출 시점 판단이며 보관 가능한 proof가 아니다. 실제 내구 append·예약·checkpoint는 계속 차단한다.
적용 도중 자원 실패의 강한 예외 보장·실제 쓰기·회전·누적 비용까지 PASS로 확대하지 않는다.

메인이 제품 diff·공유 분기·개별 oracle·원출력과 최종 29개 source hash 불변을 직접 확인했다.
최종 focused510와 영향 회귀515, 합계1,025개가 통과했다. 최종 제품 빌드도 exit0이다.
[개별 결과 전수](individual-results.json.gz)는 중간 실패를 포함한 1,824개 title/test/result/config/raw 행이다.
[원출력 명세](artifact-manifest.json)는 원문 길이·SHA-256·압축 크기·UID/inode·fixture 정리를 보존한다.

## 실제 실행·실패 이력

| 원출력 | 실제 명령 | exit | 결과 |
| --- | --- | --- | --- |
| [red](red.log.gz) | `./server.sh verify-v410-recording-generation-preappend` | 2 | Journal.Open 누락 fixture 준비 오류. 예상 RED 아님 |
| [red-fixture-fixed](red-fixture-fixed.log.gz) | 같은 focused 명령 | 1 | stub 정상 finalize 거부의 예상 RED. 1 pass/1 fail |
| [green-first](green-first.log.gz) | 같은 focused 명령 | 2 | Complete cleaned_at_ms 누락 fixture 오류. 126 pass/1 fail, 제품 RED 아님 |
| [green-fixture-fixed](green-fixture-fixed.log.gz) | 같은 focused 명령 | 0 | 당시 494 pass. 추가 store 반례 전 증거 |
| [store-red](store-red.log.gz) | 같은 focused 명령 | 1 | 빈 managed store의 외부 store 예약 반례. 175 pass/1 fail |
| [final](final.log.gz) | `./server.sh verify-v410-recording-generation-preappend` | 0 | 510 pass/0 fail; V01 130/V02 296/V03 72/V04 12 |
| [scratch](scratch-regression.log.gz) | `./server.sh verify-v410-recording-catalog-generation-scratch` | 0 | 59 pass |
| [공개 읽기](readonly-regression.log.gz) | `./server.sh verify-v410-recording-catalog-generation-readonly` | 0 | 106 pass |
| [Journal](journal-regression.log.gz) | `./server.sh verify-v410-recording-journal-generation-readonly` | 0 | 78 pass |
| [Catalog](catalog-regression.log.gz) | `MEDIA_SERVER_VERIFY_V410_RECORDING_CATALOG_BUILD_DIR=<소유 mktemp> ./server.sh verify-v410-recording-catalog` | 0 | 249 pass |
| [파생 작업](derived-regression.log.gz) | `bash scripts/internal/verify_recording_derived_jobs.sh` | 0 | 23 pass |
| [빌드 최초](build.log.gz) | `./server.sh build` | 0 | store 결박 보완 전 코드; 최종 빌드로 대체 |
| [빌드 최종](build-final.log.gz) | `./server.sh build` | 0 | 최종 source 전체 제품 빌드 |

Catalog 원출력은 리다이렉션 누락으로 도구 응답을 사후 보존했다. 실행 시작 소유경로와 종료 출력까지
전수 회수·대조했고 truncation은 없었다. 다른 실행은 파일에 직접 보존했다. 누락을 추정 복원하지 않았다.
focused는 crypto/SQLite/backend 111·101·011·110 조합이며 미지원 B는 차단하는 검사다.
Darwin27.0.0 arm64·Apple clang21.0.0; 시각·source hash는 각 runner 원출력이다.
최종 focused 2026-09-25T05:49:55Z~05:50:43Z, 파생 작업9초. 그 외 elapsed와
token start/end/consumed는 독립 계측 source가 없어 미집계다.

## 정리

원출력 13개 146,768B를 무변경 gzip 30,241B로 보존했고 해제 결과와 SHA를 대조했다.
계정·비밀번호·영상은 포함하지 않는다. 11개 실행 fixture는 runner의 소유 확인 후 삭제됐고 메인도 부재를 확인했다.
원문 임시 로그의 삭제 전 크기·UID/inode와 fixture 경로/크기는 명세의 각 행에 전수 보존한다.
원문 로그 13개는 UID/inode/device·SHA·gzip 해제 일치 재확인 후 삭제했고 모두 부재다.
fixture 11개도 부재이며, 보존된 명세의 각 경로에 같은 조치를 적용했다. 제품 build-gst-onnx는 유지한다.
실제 앱·외부 서비스·포트·30분·UI·120분은 실행하지 않았다.

## 마감 문서 검사

`verify-docs-links`, `verify-docs-ui-assets`(10/10), `verify-project-inventory`(986행·18/18),
`git diff --check`는 각각 exit0이다. [링크 원출력](verify-docs-links.log.gz),
[자산 원출력](verify-docs-ui-assets.log.gz), [인벤토리 원출력](verify-project-inventory.log.gz),
[정적 개별 결과](static-results.json.gz)를 보존한다. 이번 문서 검사로 제품 PASS 범위를 넓히지 않는다.
