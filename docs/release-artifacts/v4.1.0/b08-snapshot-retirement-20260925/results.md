# B-08 이전 snapshot 회수 집중 결과

독자: v4.1.0 녹화 개발·검증 담당자. 수명: 이번 구현의 보존 기록.
정책은 AGENTS.md, 실행 전 정의는 중앙 테스트 기록을 따른다. 이 기록은
원래 8번의 회수 구현 단위만 다루며 누적 비용·실제 HTTP·최종 코드 고정 PASS가 아니다.

## 범위와 결과

새 체크포인트 영수증에만 이전 snapshot의 이름·길이·SHA-256·device·inode를
결박했다. 기존 15필드 영수증은 원래 bytes로 읽고 회수 권한을 주지 않는다.
정상 게시에서는 target manifest·생성 파일·SQL 성공을 확인한 뒤 exact 이전
snapshot 한 개를 unlink·root fsync하고 마지막에 receipt를 정리한다.
PREPARED rollback은 이전 snapshot을 보존한다. 재기동 복구는 새 target을
엄격히 재구성한 뒤 삭제를 완료하며, 이미 부재한 exact 대상만 멱등 인정한다.
정상 게시 중 예상 밖 부재는 실패·receipt 보존이다. active·identity·evidence·
원본 미디어·삭제 영수증은 회수 대상이 아니다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B08-R01 최초 RED | 두 회전 후 이전 snapshot이 남음을 확인. [원출력](b08-snapshot-red.log), exit1, B08-R01 1 FAIL | fail |
| B08-R01/R02 receipt | 기존15·신규16필드 codec, 잘못된 소유 descriptor 거부. [원출력](b08-receipt-green.log), exit0, 개별111 PASS | pass |
| B08-R01/R02 checkpoint 첫 GREEN | 새 회수는 통과했으나 SQL fixture가 성공 복구 뒤 이전 snapshot을 읽어 중단. [원출력](b08-checkpoint-green.log), exit2 | fail |
| B08-R01/R02 checkpoint 보완 | SQL 실패 전 보존과 성공 복구 뒤 회수 기대를 분리. [원출력](b08-checkpoint-fixture-fixed.log), exit0, 개별139 PASS | pass |
| B08-R02 transaction 준비 1 | `<fcntl.h>` 누락으로 compile 실패; 제품 미실행. [원출력](b08-transaction-green.log), exit1 | fail |
| B08-R02 transaction 준비 2 | unsupported 구성의 새 검사 함수 미사용으로 compile 실패; 제품 미실행. [원출력](b08-transaction-header-fixed.log), exit1 | fail |
| B08-R02 transaction 첫 통과 | header·빌드 구성을 보완한 중단/교체 검사. [원출력](b08-transaction-main.log), exit0, 개별213 PASS | pass |
| B08-R02 정상 게시 부재 경계 | live ENOENT 거부·복구 ENOENT 인정 추가 뒤 [원출력](b08-transaction-live-missing.log), exit0, 개별216 PASS | pass |
| B08-R01/R02 최종 checkpoint | 위 경계 변경 뒤 4구성 [원출력](b08-checkpoint-main.log), exit0, 개별139 PASS | pass |
| B08-R02 관측기 준비 1 | 기존 검증 헤더의 `strict_json` 간접 include 누락으로 compile 실패, 제품 미실행. [원출력](b08-checkpoint-observer.log), exit1 | fail |
| B08-R02 관측기 준비 2 | crypto-off 구성의 OpenSSL 간접 include 누락으로 compile 실패, 제품 미실행. [원출력](b08-checkpoint-observer-includes.log), exit1 | fail |
| B08-R02 관측기 교차 | 두 비활성 구성의 사전 문법 검사 뒤 4구성 [원출력](b08-checkpoint-observer-final.log), exit0, 개별143 PASS. 이전 manifest 관측은 Busy·새 관측은 단일 현재 세대 | pass |
| 관련 build | [원출력](b08-build.log), exit0, 100% | pass |
| 관련 runtime | [원출력](b08-runtime-generation.log), exit0, 개별33 PASS | pass |
| 관련 소비자 | [원출력](b08-consumers.log), exit0, 개별118 PASS | pass |
| 기능 inventory 최초 | B-08 목록만 추가돼 986개 기존 feature row는 동일하나 manifest의 전체 파일 hash가 달라 exit1. 기존 구현 항목 재생성 없음 | fail |
| 기능 inventory 보완 | 986개 행의 byte/의미 동일 대조 후 hash 한 값만 수정. `verify-feature-implementation-evidence` exit0·986/986 reviewed·negative15/15. [기능 전수 원출력](b08-project-inventory-final.log) exit0·18 PASS/0 FAIL | pass |

최종 유효 집중 실행의 **621개 개별 결과**는 [전수표](items.md)에서 원출력·
실행 구성별로 대조한다. 앞선139 checkpoint 행은 같은 제품 코드의 유효
PASS를 사용하고, 뒤에 추가한 관측기 교차 4행은 최종 실행을 결속했다.
최초 실패를 최종 PASS로 덮어쓰지 않았다.

## 반례·한계

- PREPARED, PUBLISH_INTENT 게시 전/후, unlink 직후·fsync 직후 중단, 실제
  SQL 실패 후 재개방을 구분했다. 이전 파일의 symlink·hardlink·같은 내용의
  다른 inode·변경 hash는 삭제하지 않고 receipt를 보존했다. 옛 receipt는
  이전 snapshot을 지우지 않는다.
- 열린 불변 파일 FD는 unlink 뒤에도 원래 bytes를 읽었다. 테스트 전용
  관측기에 이전 manifest 취득 직후 checkpoint를 일으켜 `Busy`를 확인했고,
  새 관측은 단일 현재 세대만 반환했다. 실제 앱의 JS normalization·HTTP는
  아직 확인하지 않았으며 뒤 단계에서 다룬다.
- 과거 버전에서 독립적으로 남은 옛 snapshot을 이름으로 탐색해 지우지
  않는다. 따라서 이 구현만으로 모든 기존 저장소의 물리 사용량이 즉시
  줄어든다고 주장하지 않는다. 1/16/32·1,020/2,049 누적 재측정과 실제
  HTTP/5단계 통합은 아직 미실행이다.
- token start/end/consumed는 이 로컬 명령 묶음에 신뢰할 계측기가 없어
  미집계다. elapsed는 원출력의 start/end가 있는 명령만 직접 확인한다.
  `source=로컬 명령 원출력`, 비용·HTTP·장시간 evidence로 확대하지 않는다.

## 임시 산출물 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| `media-server-generation-checkpoint.*` (7회) | RED·중간·최종 focused fixture | 18,384,857 / 18,306,136 / 49,491,544 / 49,491,544 / 0 / 34,630,512 / 49,695,106B | runner 소유 검사 후 삭제 | 모두 부재 | 해당 checkpoint 원출력 |
| `media-server-generation-receipt.FFuy7c` | codec fixture | 1,005,776B | runner 소유 검사 후 삭제 | 부재 | receipt 원출력 |
| `media-server-cutover-transaction.*` (4회) | 최초 compile·중간·최종 fixture | 0 / 8,272,896 / 22,075,039 / 22,080,839B | runner 소유 검사 후 삭제 | 모두 부재 | 해당 transaction 원출력 |
| `media-server-runtime-generation.OQH4Xq` | runtime fixture | 9,693,273B | runner 소유 검사 후 삭제 | 부재 | runtime 원출력 |
| `media-server-generation-consumers.US5N6x` | 소비자 fixture | 33,703,416B | runner 소유 검사 후 삭제 | 부재 | consumers 원출력 |
| `/private/tmp/b08-*.log` (16개) | 비민감 임시 원출력 | 각 파일 938~210,250B | redaction 검색·저장소 복제·byte 대조 후 원본 정리 | 저장소 복제 보존, 원본 16개 부재 | 이 디렉터리의 원출력 |

fixture 부모는 `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T`이며,
각 runner의 `removed=true`와 소유 경로 부재 14건을 직접 확인했다. 전체 build는
기존 관리 build 디렉터리를 갱신했으며 임시 fixture가 아니다.
