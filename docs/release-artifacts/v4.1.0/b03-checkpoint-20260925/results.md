# B-03 세대 회전 실행 결과

독자: 녹화 저장 구현·검증 담당자. 수명: B안 세대 회전의 과거 실행 증거.
정책은 AGENTS.md, 현재 단계는 중앙 테스트 기록이 기준이다. 서버 기본 활성화·형식 전환 완료 증거가 아니다.

## 구현과 안전 경계

명시 opt-in B Catalog에서 현재 증분을 봉인하고, 새 identity 조각·현재 snapshot·빈 active를
준비한 뒤 manifest를 원자 게시한다. 기존 공개 manifest 도구의 전체 검증은 유지하고,
정상 회전만 Journal의 독점 lease·같은 현재 세대에 결박된 일회 게시 권위를 사용한다.
Catalog→Journal 잠금 순서를 유지하며 snapshot 생성은 Journal 잠금 밖, Catalog 잠금 안에서 수행한다.
기존 과거 상세 파일을 새 세대에 복사하거나 다시 직렬화하지 않는다.

참조는 특정 vector slot 대신 같은 owner의 epoch·mutation ID·최초 ordinal·identity로
현재 위치를 재확인한다. 두 번의 회전 뒤에도 같은 원본을 취득하고, 다른 owner·fork·변조는 거부한다.
현재 값·예약·진행 작업·복수 출력 계획을 보존하며, SQL은 세대/cut만 transaction으로 갱신한다.
빈 active의 checkpoint는 새 파일을 만들지 않는다. 유효한 신규 행이 기존 1MiB 회전 기준 또는
caller active admission에 도달하면 append 전에 회전한다. 잘못된 입력·ID 재시도는 회전을 만들지 않는다.
행 자체·snapshot·identity·archive 수·ordinal 상한은 회전으로 우회하지 않는다.

게시 전 실패에서는 device/inode·예정 bytes·전후 size/mtime/ctime·경로 결박을 모두 확인한
이번 호출의 준비물만 회수한다. 낯선 충돌 파일·내용이 바뀐 파일은 보존한다.
manifest rename 후 fsync 불확실 또는 SQL 실패는 같은 owner의 읽기·쓰기를 막고 새 owner로만 복구한다.
불완전 active tail을 임의 truncate하지 않는다. 중단된 준비물의 자동 재시작 처리는 다음 전환/복구 단위다.

## 집중 검증

`./server.sh verify-v410-recording-generation-checkpoint`의 최종 결과는 exit0,
123 PASS/0 FAIL이다. C01 16·C02 8·C03 44·C04 4·C05 38·C06 13개이며
서로 다른 빌드 조합의 assertion 합계이지 고유 기능 수가 아니다.
실제 별도 SQLite 연결의 UPDATE trigger와 reader lock에 따른 COMMIT 실패를
메인이 독립 반례로 작성했다. manifest의 정확한 새 generation/cut, SQL rollback,
같은 owner 차단, 새 owner의 current/SQL 복구와 과거 파일 byte 불변을 직접 대조했다.

과거 상세 원문 820B와 3,358,720B 비교는 동일 현재 상태·신규 한 행·최소 ID 수를 유지하고,
모든 과거 물리 행의 ordinal/offset을 identity에 등록하고 같은 파일을 predecessor manifest.evidence에도
결박했다. 과거 공개 전체 검증 경로를 잘못 호출하면 이 검사에서 검출한다. 준비는 계측에서 제외했다.
두 규모 모두 회전 중 archive 읽기0·mutation parse0·mutation serialize1(현재 증분)이었다.
이는 과거 상세 재처리 제거의 작은 독립 증거이며, 전체 RAM/디스크가 상수이거나
실제 HTTP·누적 규모·120분 자원 판정까지 통과했다는 뜻은 아니다.

최종 focused 실행 시각은 2026-09-25T07:20:47Z~07:21:35Z(48초)다.
메인은 제품 diff·독립 SQL 반례 원출력·최종 focused source33개 hash 불변을 확인했다.
최종 제품 source의 `./server.sh build`도 exit0이다. 집중·영향 회귀 합계는1,463 assertion PASS다.
manifest/files는 각각16/6개 논리 결과 아래113/42 assertion을 집계하는 기존 원출력 형식을 유지한다.

[개별 원출력 결과 전수](individual-results.json.gz)와 [원출력·정리 명세](artifact-manifest.json)를 보존한다.
개별 결과는 중간 실행을 포함한1,775행이며, 묶음 출력의 assertionCount를 별도로 명시한다.

| 원출력 | 실제 명령 | exit | 결과 |
| --- | --- | --- | --- |
| [준비 오류](red.log.gz) | `bash scripts/internal/verify_recording_generation_checkpoint.sh` | 1 | include hash 대상 부재; 제품 검사 미실행 |
| [예상 RED](red-ready.log.gz) | 같은 직접 runner | 1 | writable Checkpoint 거부 1 FAIL |
| [초안](green-draft.log.gz) | 같은 직접 runner | 0 | 85 PASS, 최종 전수 아님 |
| [확장](expanded.log.gz) | 같은 직접 runner | 0 | 115 PASS |
| [초기 최종](final.log.gz) | `./server.sh verify-v410-recording-generation-checkpoint` | 0 | 121 PASS |
| [정리 결박 보완](final-binding.log.gz) | 같은 focused 명령 | 0 | 123 PASS |
| [최종 비용 반례](final-evidence.log.gz) | 같은 focused 명령 | 0 | 123 PASS, predecessor evidence 보강 |
| [manifest](regression-manifest.log.gz) | `./server.sh verify-v410-recording-generation` | 0 | 113 assertion |
| [files](regression-files.log.gz) | `./server.sh verify-v410-recording-generation-files` | 0 | 42 assertion |
| [append](regression-append.log.gz) | `./server.sh verify-v410-recording-generation-append` | 0 | 219 PASS |
| [preappend](regression-preappend.log.gz) | `./server.sh verify-v410-recording-generation-preappend` | 0 | 510 PASS |
| [공개읽기](regression-readonly.log.gz) | `./server.sh verify-v410-recording-catalog-generation-readonly` | 0 | 106 PASS |
| [Journal](regression-journal.log.gz) | `./server.sh verify-v410-recording-journal-generation-readonly` | 0 | 78 PASS |
| [Catalog](regression-catalog.log.gz) | `./server.sh verify-v410-recording-catalog` | 0 | 249 PASS |
| [파생작업](regression-derived.log.gz) | `bash scripts/internal/verify_recording_derived_jobs.sh` | 0 | 23 PASS |
| [초기 빌드](build.log.gz) | `./server.sh build` | 0 | 최종 정리 결박 보완 전 source |
| [최종 빌드](build-final.log.gz) | `./server.sh build` | 0 | 최종 제품 source; 이후 비용 반례만 보강 |

## 최초 실패와 보완 이력

- 첫 runner 실행은 아직 없는 include의 source hash 수집에서 exit1로 끝났다. 제품 검사가 실행되지 않았으며 예상 RED가 아니다.
- runner의 source/include/hash·4조합·정리를 확인한 뒤 writable Checkpoint 미구현 assertion 1개로 예상 RED(exit1)를 확보했다.
- 초안 집중 검사는 통과했지만, 과거 상세 증가 fixture의 물리행 등록과 실제 단일 행 admission 반례를 보강했다. 이전 PASS를 최종 전수로 승격하지 않았다.
- 리뷰에서 부분 준비 실패 시 아직 비어 있는 result.manifest에 cleanup이 의존하는 문제를 보완했다. 계획에서 확정한 파일 이름으로 이번 호출의 소유물을 구분한다.
- cleanup 도중 같은 inode/크기로 내용이 바뀌는 경계에 전후 stat 대조와 독립 반례를 추가했다. 이전 빌드·집중 성공과 이 보완 뒤 최종 성공은 다른 source 증거로 보존한다.
- 마지막 리뷰에서 C04의 과거 원문이 identity에만 결박되어 있던 한계를 발견했다. predecessor evidence에도 같은 원문을 결박해 집중검사만 재실행했다. 제품 source 불변이므로 통과한 영향 회귀·빌드는 재실행하지 않았다.

## 미실행·정리 경계

서버 기본 구성, 기존 형식 전환, 실제 writer·보존·재생 소비자, 누적/HTTP·UI·30분·120분은
이 단위의 완료 범위가 아니다. 공개 API·녹화/보존 정책·구형 format-v1 동작은 바꾸지 않았다.
검증은 작업 소유 fixture만 사용하며 서버·포트·계정·비밀번호·외부 데이터는 사용하지 않았다.
최종 focused fixture 48,036,436B는 runner가 제거했고 메인도 부재를 확인했다.
경로·크기가 기록된 fixture13개는 모두 부재다. 구형 manifest/files runner는 removed=true만
출력해 당시 개별 경로·크기는 미기록이며 추정 복원하지 않는다. 실행 임시 부모의 해당 prefix 잔여는0이다.
원출력17개166,967B를 SHA·소유·gzip 해제 바이트로 대조하고39,614B로 보존했다.
임시 원출력의 소유/hash 재확인 뒤 삭제 결과는 artifact-manifest.json에 남긴다.
제품 빌드 디렉터리는 보존한다. 계정·실제 영상·포트 정리 대상은 없다.
token start/end/consumed는 독립 계측 source가 없어 미집계다. 과거 실패 기록은 삭제하지 않는다.

## 문서·등록 마감

`verify-docs-links`, `verify-docs-ui-assets`, `verify-project-inventory`, `git diff --check`는 각각 exit0이다.
개별 결과·실제 counts는 [정적 원출력 명세](static-manifest.json)와
[정적 결과 전수](static-results.json.gz)에 보존한다. 문서·등록 검사를 제품 실행 PASS로 확대하지 않는다.
