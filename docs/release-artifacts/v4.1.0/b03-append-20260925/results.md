# B-03 증분 쓰기 실행 결과

독자: 녹화 저장 구현·검증 담당자. 수명: B안 구현의 과거 실행 증거.
정책은 AGENTS.md, 현재 단계는 중앙 테스트 기록이 기준이다. 서버 기본 활성화·회전·전환 완료 증거가 아니다.

## 구현과 경계

내부 `enable_generation_writes` opt-in에서 Catalog 검증 → Journal 소유/ID/순서 확인 →
active append/fsync → 현재 값 적용 → 변경 key SQLite transaction을 연결했다.
예약도 같은 소유 경계에서 현재 order와 최소 identity를 함께 반영한다. 같은 ID/tuple 재시도는
기존 시간·순서·물리 바이트를 보존한다. 정상 append에서 과거 원문 Replay·SQL 전체 재구축을 하지 않는다.
기존 inactive 상세 링크는 추가 append 뒤에도 유효하며, 활성 작업에 필요한 source만 상주한다.

내구 이전 거부는 typed 값·원장·SQL을 보존한다. write/fsync·이후 Apply/SQL 실패는 owner를 차단한다.
완결된 원문은 새 Journal/Catalog의 엄격 Open으로 복구하고 미완결 tail은 자동 truncate하지 않는다.
SQL prepare·trigger step·실제 별도 reader의 COMMIT 방해를 각각 시험했다. 캐시 실패를 fallback PASS로 바꾸지 않았다.
SQL 실패 뒤 `MarkSegmentCorrupt`의 빠른 성공 반환이 권위 검사를 우회한 결함을 확인해 B 진입 검사로 보완했다.

기본 B read-only·구형 format-v1·서버 구성은 유지한다. B checkpoint와 raw Journal 쓰기는 차단한다.
`FinalizeSegmentWithHold`는 B hold 소비자 연결 전 내구 이전 거부하며, 일반 finalize는 지원한다.
이 복합 API·회전·cutover·실제 writer·누적/HTTP·UI/장시간 검증은 이번 단위 완료 범위가 아니다.

## 직접 확인 결과

최종 focused는 217 PASS/0 FAIL이다. W01 70/W02 40/W03 53/W04 38/W05 16이며,
crypto/SQLite/backend 111=133·101=80·011=2·110=2다. 서로 다른 설정의 assertion 수이며 고유 기능 수가 아니다.
전체 제품 빌드는 exit0이다. 메인은 diff·독립 SQL 반례 원출력·최종 30개 source hash 불변을 대조했다.
기존 preappend510·공개읽기106·Journal78·Catalog249·파생작업23도 각각 exit0이다.
focused와 영향 회귀의 최종 assertion 합계는1,183개이며 전체 버전 검증 PASS를 뜻하지 않는다.

[개별 assertion 전수](individual-results.json.gz)와 [원출력·정리 명세](artifact-manifest.json)를 보존한다.
명세에는 각 실제 원출력의 SHA-256·크기·압축 크기·exit·소유 정보와 fixture 부재 확인이 있다.

| 원출력 | 실제 명령 | exit | 결과 |
| --- | --- | --- | --- |
| [red](red.log.gz) | `./server.sh verify-v410-recording-generation-append` | 1 | 공개 B 변경의 read-only 거부: 예상 RED 1개 |
| [최소 연결](first-build.log.gz) | 같은 focused 명령 | 0 | 4 PASS, 최종 전수 검사 아님 |
| [초기 확장](expanded-initial.log.gz) | 같은 focused 명령 | 0 | 156 PASS, 추가 반례 전 |
| [receipt 준비 실패](complete-focused.log.gz) | 같은 focused 명령 | 2 | 71 PASS 뒤 두 receipt 동시 추가의 fixture 오류. 예상 RED 아님 |
| [origin 준비 실패](receipt-fixed.log.gz) | 같은 focused 명령 | 2 | 71 PASS 뒤 split source origin/file PTS fixture 오류. 제품 계약은 변경하지 않음 |
| [SQL 실패 뒤 권위 반례](provenance-fixed.log.gz) | 같은 focused 명령 | 1 | 116 PASS/3 FAIL. 동일 owner 빠른 성공 반환 결함 |
| [권위 보완](authority-fixed.log.gz) | 같은 focused 명령 | 0 | 210 PASS, 마지막 finalize/hold 반례 전 |
| [최종 집중](final-focused.log.gz) | 같은 focused 명령 | 0 | 217 PASS |
| [preappend](regression-preappend.log.gz) | `./server.sh verify-v410-recording-generation-preappend` | 0 | 510 PASS |
| [공개 읽기](regression-readonly.log.gz) | `./server.sh verify-v410-recording-catalog-generation-readonly` | 0 | 106 PASS |
| [Journal](regression-journal.log.gz) | `./server.sh verify-v410-recording-journal-generation-readonly` | 0 | 78 PASS |
| [Catalog](regression-catalog.log.gz) | `./server.sh verify-v410-recording-catalog` | 0 | 249 PASS |
| [파생 작업](regression-derived.log.gz) | `bash scripts/internal/verify_recording_derived_jobs.sh` | 0 | 23 PASS |
| [전체 빌드](build.log.gz) | `./server.sh build` | 0 | 고정된 제품 source 전체 빌드 |

fixture 준비 오류 후 기존 통과한 복수 출력 원형과 Ready 검증의 요청범위·origin·AU/coverage·예약·receipt를
전체 대조하고 동일 focused를 재실행했다. 값 하나의 변경을 제품 시간값 보정으로 대신하지 않았다.
최종 focused 실행 시각은 2026-09-25T06:30:56Z~06:31:43Z(47초), 환경은 Darwin27.0.0 arm64·Apple clang21.0.0이다.
token start/end/consumed는 독립 계측 source가 없어 미집계다. 각 실행의 시작/종료는 원출력에 있는 범위만 사용한다.

## 정리·미실행

소유 fixture13개는 runner가 경로·소유권을 확인해 삭제하고 메인도 부재를 대조했다.
원출력14개155,004B의 원문·SHA와 gzip37,813B의 해제 바이트를 대조해 저장소에 보존했다.
임시 원본 로그는 UID/inode/device·크기·hash 재확인 후 삭제했고 모두 부재다. 복원은 보존 gzip으로 가능하다.
각 경로의 삭제 전 크기·조치·결과는 원출력 명세의 전수 행을 따른다. 중간 assertion도 포함한 결과1,815행을 보존한다.
영상·계정·비밀번호·실제 서버·포트는 이 단위에 없다. `build-gst-onnx`는 제품 빌드로 유지한다.
실제 앱·외부 환경·30분·UI·120분은 미실행이며 이 focused 결과로 대체하지 않는다.

## 문서·등록 마감

`verify-docs-links`(333문서·13,546링크·오류0), `verify-docs-ui-assets`(10/10),
`verify-project-inventory`(986행·18/18)와 `git diff --check`는 각각 exit0이다.
정적 원출력은 같은 디렉터리의 docs-links/docs-assets/inventory gzip에 보존했다.
static-manifest.json에 원문 SHA·소유·삭제 결과, static-results.json.gz에 개별 결과를 보존한다.
임시 원본 로그3개도 gzip 해제 byte·소유 확인 뒤 삭제했고 부재다. 새 제품 실행 증거로 확대하지 않는다.
