# B-02 공개 읽기·SQLite 결과

독자: 녹화 저장 구현·검증 담당자. 수명: 이번 B 읽기 연결의 과거 검증 증거.
정책은 AGENTS.md, 현재 단계는 중앙 테스트 기록이 기준이다. B 쓰기·회전·전환·전체 릴리즈 완료 증거가 아니다.

## 결론·범위

공개 B Catalog가 검증된 현재 상태와 최소 identity를 복원해 전용 SQLite에 투영한 뒤 게시하도록 연결했다.
기존 v1 캐시·미디어·cleanup marker는 변경하지 않는다. 과거 전체 Replay나 source/job 원문 전수 SQL 복제를 사용하지 않는다.
SQLite Open 불가만 검증된 메모리 fallback이며 Open 이후 prepare/insert/COMMIT·권위 오류는 실패로 남긴다.
Catalog→Journal→SQL 순서에서 COMMIT과 noexcept map 게시를 결박한다. cold 손상 뒤 조회와 같은 인스턴스 Open은 거부한다.
임시 hold는 SQL 성공 후 메모리에 반영하며, 내구 append·예약·checkpoint·writer는 여전히 차단한다.
메인이 실제 diff·106개 개별 oracle·기존 회귀·빌드를 직접 대조했다.

최종 4개 조합(crypto/sqlite/backend=111·101·011·110)에서 Q01 28/Q02 9/Q03 15/Q04 29/Q05 13/Q06 12, 합계106개 pass다.
기존 scratch59·Journal78·Catalog249를 포함한 최종 assertion은 492개다. 앱·누적·30분·UI·120분은 미실행이며 이를 대체하지 않는다.
고정 경로·NOFOLLOW·링크/소유 및 transaction 직전 재검사를 적용했지만, 협력하지 않는 외부 프로세스의 임의 경로 교체까지
완전한 FD-pinned SQLite VFS로 차단했다고 주장하지 않는다. 이번 단위는 기존 managed lease/경로 위협 경계를 유지한다.

## 명령·실패 이력

| 원출력 | 실제 명령 | exit | 판정·처리 |
| --- | --- | --- | --- |
| [red](red.log.gz) | `bash scripts/internal/verify_recording_catalog_generation_readonly.sh` | 1 | 중첩 main 매크로 컴파일 준비 오류; 예상 RED 아님 |
| [red-fixture-fixed](red-fixture-fixed.log.gz) | `bash scripts/internal/verify_recording_catalog_generation_readonly.sh` | 2 | fixture 생성 전 Historical 호출 준비 오류; 예상 RED 아님 |
| [red-ready](red-ready.log.gz) | `bash scripts/internal/verify_recording_catalog_generation_readonly.sh` | 1 | Q01 공개 B 부착 거부의 예상 RED; Q04 차단은 pass |
| [first-green](first-green.log.gz) | `bash scripts/internal/verify_recording_catalog_generation_readonly.sh` | 1 | Journal 전용 빈 객체 active를 Catalog domain fixture에 사용한 준비 오류; 제품 결함 RED 아님 |
| [q-matrix](q-matrix.log.gz) | `./server.sh verify-v410-recording-catalog-generation-readonly` | 1 | 실행기 실행 권한 누락; 검사·임시 자료 생성 전 실패 |
| [q-matrix-executable](q-matrix-executable.log.gz) | `./server.sh verify-v410-recording-catalog-generation-readonly` | 1 | macOS SQLite auto_extension API 지원 및 chmod 헤더 컴파일 오류 |
| [q-hook](q-hook.log.gz) | `./server.sh verify-v410-recording-catalog-generation-readonly` | 1 | Timeline 조회 서비스 링크 의존성 누락 |
| [q-linked](q-linked.log.gz) | `./server.sh verify-v410-recording-catalog-generation-readonly` | 0 | 4개 지원 조합 첫 106개 pass |
| [q-final](q-final.log.gz) | `./server.sh verify-v410-recording-catalog-generation-readonly` | 0 | 권위 검사 보완 후 최종 106개 pass |
| [scratch-regression](scratch-regression.log.gz) | `./server.sh verify-v410-recording-catalog-generation-scratch` | 0 | 기존 scratch 59개 pass |
| [journal-regression](journal-regression.log.gz) | `./server.sh verify-v410-recording-journal-generation-readonly` | 0 | B Journal 78개 pass |
| [build](build.log.gz) | `./server.sh build` | 0 | 전체 제품 빌드 |
| [catalog](catalog.log.gz) | `./server.sh verify-v410-recording-catalog` | 0 | 기존 Catalog 249개 pass |

첫 API 주입은 플랫폼 비지원으로 실패했으므로 production에 포함되지 않는 test-only 한 번 사용 hook으로 변경했다. 삭제/완화로 PASS를 만들지 않았다.
최종 원문 이관 후 조회 응답이 한 번 도구 출력 상한으로 잘렸다. 로컬 원문과 압축 해제 일치·개별 행을 다시 읽었으며 검사를 반복 실행하지 않았다.

## 환경·계측

마감 문서 검사는 아래와 같다. 최초 inventory 실행은 exit0·986행·18/18이지만 도구 반환이
잘려 전수 원출력 보존 증거로 쓰지 않았다. 제품 재실행 없이 같은 정적 inventory만 파일 보존으로
재실행했고 [원출력](inventory.log.gz)·[5,081개 개별 결과](inventory-results.json.gz)를 남겼다.
원문 210,250B, SHA-256 `24bb204e1d76822921986e77bab3a0e0e701cd8577060411f57c0e0b18d29d00`.
JSON의 title/test/result는 각 행 제목·검사내용·pass/fail을 보존한다. 임시 자료·서버는 생성하지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 문서 링크 최초 | `./server.sh verify-docs-links`, exit1,331문서/13,507링크/오류1 | fail | roadmap의 중간점 포함 heading anchor 불일치 |
| 문서 링크 보완 | 같은 명령 exit0,331문서/13,507링크/오류0 | pass | 검증 결과 파일 직접 링크로 수정; 조건 완화 없음 |
| 자산01 | README 대표 제품 UI만 사용 | pass | verify-docs-ui-assets exit0 |
| 자산02 | English README 영문 UI 사용 | pass | 동일 실행 |
| 자산03 | UI guide 공유 자산 사용 | pass | 동일 실행 |
| 자산04 | 자산 정책의 캡처 규칙 | pass | 동일 실행 |
| 자산05 | 관리 자산 manifest 완전성 | pass | 동일 실행 |
| 자산06 | capture script 소유 대상 | pass | 동일 실행 |
| 자산07 | 현재 screenshots 캡처 연결 | pass | 동일 실행 |
| 자산08 | 오래된 baseline 대표 링크 배제 | pass | 동일 실행 |
| 자산09 | 관리 PNG 디렉터리 | pass | 동일 실행 |
| 자산10 | VA 이미지 전체 프레임 경계 | pass | 동일 실행; 실제 UI 재검증 아님 |
| 기능 인벤토리 보존 재실행 | `./server.sh verify-project-inventory`, exit0,986행·18/18 | pass | 원출력 개별5081행을 압축 결과에 전수 보존 |
| 변경 공백 | `git diff --check`, exit0 | pass | 제품·문서 변경 |

Darwin27.0.0 arm64, Apple clang21.0.0. source/hash·시각은 runner 원출력에 보존했다.
Q 최종 2026-09-25T05:22:27Z~05:23:16Z(49초), scratch33초·Journal20초.
기존 Catalog·빌드는 별도 elapsed 집계가 없어 미집계다. token start/end/consumed의 직접 집계 source가 없어 모두 미집계다.

## 원출력 무변경 보존

| 파일 | 원문 바이트 | gzip 바이트 | 원문 SHA-256 |
| --- | --- | --- | --- |
| [red.log](red.log.gz) | 4125 | 1801 | `71081563311ab2a7362c1ae8b6e245b1d4bf9cf218b7bbe2e1fc72a514fb9c6b` |
| [red-fixture-fixed.log](red-fixture-fixed.log.gz) | 3359 | 1586 | `0cbb7f09a86459aaa2b492bc86d56c20475123a1222eed0ced270816fa82447a` |
| [red-ready.log](red-ready.log.gz) | 3561 | 1765 | `cf8247a252a1572b261674b212490a7ed637677f93561069f7ba374bb81926b3` |
| [first-green.log](first-green.log.gz) | 3509 | 1688 | `7aa46686e2c3dc88e18b917e0486d189dce7c5eb9c2ad613100ff4d164506a1b` |
| [q-matrix.log](q-matrix.log.gz) | 125 | 118 | `57e0a2ace5d083896dfb9a8e958fa966f0999d98b8f91ca3a3a5b0df1248a8b0` |
| [q-matrix-executable.log](q-matrix-executable.log.gz) | 6467 | 2331 | `b193a5e2b8a476f3b42ca72914f701aacf029bdf6d8dfac8dc7f2004de9f8feb` |
| [q-hook.log](q-hook.log.gz) | 4625 | 2052 | `686056fab1926f3c2d9c49068bdaa43eb7733fb10ab659e17606dd17b0947170` |
| [q-linked.log](q-linked.log.gz) | 10564 | 2626 | `febbea48a2014c5c2ffc8f52ddf7de1b635c5790acda084bad7c48b9669dcebe` |
| [q-final.log](q-final.log.gz) | 10680 | 2644 | `d816ba9792e1b1393d4be5571a68a38bf4c040024f00abd4e7195ff75895ae28` |
| [scratch-regression.log](scratch-regression.log.gz) | 10569 | 2876 | `0826ed48ea3b787e0ba7e3dde36bb8d6752ae81ae34dfbe69210345d97d99094` |
| [journal-regression.log](journal-regression.log.gz) | 6243 | 2138 | `23d09c97fdff9e893eb7390de58ebdfb2739368819f1427d77489c47b2b68767` |
| [build.log](build.log.gz) | 4126 | 692 | `441d76cd10ee374824d90254d66b7976aebb1855b3df312c8792ee52cb7a2039` |
| [catalog.log](catalog.log.gz) | 14660 | 3727 | `3c59a6019752fef7631d56be99602ca9485171d8b24ab6091c0a113004dfbea7` |

## 정리

fixture 서버·포트는 사용하지 않았다. runner가 소유 fixture와 실행 바이너리를 종료 후 제거했다.
원본 로그는 gzip 해제 일치 확인 후 아래 결과에 따라 정리하며 build-gst-onnx는 제품 빌드 산출물로 유지한다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-generation-readonly.oCCqly` | 실행 전용 fixture·바이너리 | 0B | runner 삭제 | 부재 확인 | [red 원출력](red.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-generation-readonly.9B1NE3` | 실행 전용 fixture·바이너리 | 7504552B | runner 삭제 | 부재 확인 | [red-fixture-fixed 원출력](red-fixture-fixed.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-generation-readonly.efXbMG` | 실행 전용 fixture·바이너리 | 7506862B | runner 삭제 | 부재 확인 | [red-ready 원출력](red-ready.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-generation-readonly.WsBFx7` | 실행 전용 fixture·바이너리 | 7692606B | runner 삭제 | 부재 확인 | [first-green 원출력](first-green.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-generation-readonly.kxqSQV` | 실행 전용 fixture·바이너리 | 0B | runner 삭제 | 부재 확인 | [q-matrix-executable 원출력](q-matrix-executable.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-generation-readonly.NF5zHp` | 실행 전용 fixture·바이너리 | 0B | runner 삭제 | 부재 확인 | [q-hook 원출력](q-hook.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-generation-readonly.2LQwOU` | 실행 전용 fixture·바이너리 | 31414697B | runner 삭제 | 부재 확인 | [q-linked 원출력](q-linked.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-generation-readonly.Xl2FOP` | 실행 전용 fixture·바이너리 | 31417913B | runner 삭제 | 부재 확인 | [q-final 원출력](q-final.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.ZyYqzn` | 실행 전용 fixture·바이너리 | 21012879B | runner 삭제 | 부재 확인 | [scratch-regression 원출력](scratch-regression.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-journal-generation-readonly.J6yLnm` | 실행 전용 fixture·바이너리 | 11665212B | runner 삭제 | 부재 확인 | [journal-regression 원출력](journal-regression.log.gz) |
| `/tmp/media_server_v410_recording_catalog-91208` | 실행 전용 fixture·바이너리 | 28793506B | runner 삭제 | 부재 확인 | [catalog 원출력](catalog.log.gz) |
| q-matrix | fixture | 0 | 생성 전 실행 권한 오류 | 생성 없음 | 원출력 |
| build-gst-onnx | 제품 빌드 | 해당 없음 | 유지 | 보존 | 이번 제품 빌드 |

원본 로그 13개는 모두 아래와 같이 정리했다. fixture 부재도 메인이 재확인했다. 보존 자료의 압축 전 총합은 82613B이며 압축 후 26044B다. 계정·비밀번호·영상·원본 URL은 포함하지 않는다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/tmp/b02-public-read-red.log` | 압축 전 원출력 | 4125B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](red.log.gz) |
| `/private/tmp/b02-public-read-red-fixture-fixed.log` | 압축 전 원출력 | 3359B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](red-fixture-fixed.log.gz) |
| `/private/tmp/b02-public-read-red-ready.log` | 압축 전 원출력 | 3561B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](red-ready.log.gz) |
| `/private/tmp/b02-public-read-first-green.log` | 압축 전 원출력 | 3509B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](first-green.log.gz) |
| `/private/tmp/b02-public-read-q-matrix.log` | 압축 전 원출력 | 125B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](q-matrix.log.gz) |
| `/private/tmp/b02-public-read-q-matrix-executable.log` | 압축 전 원출력 | 6467B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](q-matrix-executable.log.gz) |
| `/private/tmp/b02-public-read-q-hook.log` | 압축 전 원출력 | 4625B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](q-hook.log.gz) |
| `/private/tmp/b02-public-read-q-linked.log` | 압축 전 원출력 | 10564B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](q-linked.log.gz) |
| `/private/tmp/b02-public-read-q-final.log` | 압축 전 원출력 | 10680B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](q-final.log.gz) |
| `/private/tmp/b02-public-read-scratch-regression.log` | 압축 전 원출력 | 10569B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](scratch-regression.log.gz) |
| `/private/tmp/b02-public-read-journal-regression.log` | 압축 전 원출력 | 6243B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](journal-regression.log.gz) |
| `docs/release-artifacts/v4.1.0/b02-public-read-20260925/build.log` | 압축 전 원출력 | 4126B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](build.log.gz) |
| `docs/release-artifacts/v4.1.0/b02-public-read-20260925/catalog.log` | 압축 전 원출력 | 14660B | inode/UID/SHA·압축 해제 일치 후 삭제 | 부재 확인 | [무변경 보존](catalog.log.gz) |

## 개별 결과 전수

같은 assertion 이름도 지원 조합·실행 순번을 분리했다. 영어 assertion은 원출력 식별자이며 모든 설명은 한글이다.

### red-ready

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| red-ready-1 | B02-Q01 FAIL public B Open publishes verified current rows (expected RED before implementation) | fail | 기본; [원출력](red-ready.log.gz) |
| red-ready-2 | B02-Q04 PASS public read Open leaves recording bytes unchanged | pass | 기본; [원출력](red-ready.log.gz) |

### first-green

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| first-green-1 | B02-Q01 FAIL public B Open publishes verified current rows (expected RED before implementation) | fail | 기본; [원출력](first-green.log.gz) |
| first-green-2 | B02-Q04 PASS public read Open leaves recording bytes unchanged | pass | 기본; [원출력](first-green.log.gz) |

### q-linked

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| q-linked-1 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-2 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-3 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-4 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-5 | B02-Q04 PASS read-only temporary hold permitted | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-6 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-7 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-8 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-9 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-10 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-11 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-12 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-13 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-14 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-15 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-16 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-17 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-18 | B02-Q04 PASS read-only temporary hold permitted | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-19 | B02-Q02 PASS SQLite current typed rows identity and generation metadata | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-20 | B02-Q02 PASS SQLite actual segment typed fields match independent active state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-21 | B02-Q04 PASS temporary hold reaches B table | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-22 | B02-Q03 PASS hold SQL failure keeps SQL and memory count | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-23 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-24 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-25 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-26 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-27 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-28 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-29 | B02-Q02 PASS SQLite current typed rows identity and generation metadata | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-30 | B02-Q02 PASS SQLite actual segment typed fields match independent active state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-31 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-32 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-33 | B02-Q03 PASS domain-invalid active poisons owner before SQL or live publication | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-34 | B02-Q01 PASS real archive cold source or inactive job detail obtained on use | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-35 | B02-Q02 PASS thin summaries are separate from full payload rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-36 | B02-Q02 PASS SQLite source summary actual fields remain thin and current | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-37 | B02-Q06 PASS late cold corruption closes detail Timeline Status and Retention | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-38 | B02-Q01 PASS real archive cold source or inactive job detail obtained on use | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-39 | B02-Q02 PASS thin summaries are separate from full payload rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-40 | B02-Q02 PASS SQLite source summary actual fields remain thin and current | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-41 | B02-Q02 PASS SQLite inactive job summary state latest identity and source output IDs | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-42 | B02-Q06 PASS late cold corruption closes detail Timeline Status and Retention | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-43 | B02-Q03 PASS connection injection consumed once | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-44 | B02-Q03 PASS SQL prepare failure rolls cache back and publishes no live state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-45 | B02-Q03 PASS SQL failure source bytes unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-46 | B02-Q03 PASS connection injection consumed once | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-47 | B02-Q03 PASS SQL insert failure rolls cache back and publishes no live state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-48 | B02-Q03 PASS SQL failure source bytes unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-49 | B02-Q03 PASS connection injection consumed once | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-50 | B02-Q03 PASS SQL commit failure rolls cache back and publishes no live state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-51 | B02-Q03 PASS SQL failure source bytes unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-52 | B02-Q03 PASS connection injection consumed once | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-53 | B02-Q03 PASS SQL authority failure rolls cache back and publishes no live state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-54 | B02-Q03 PASS authority replacement is not repaired or overwritten | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-55 | B02-Q05 PASS SQLite Open unavailable falls back only before transaction | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-56 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-57 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-58 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-59 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-60 | B02-Q06 PASS backend-enabled v1 open append replay | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-61 | B02-Q06 PASS v1 checkpoint remains available | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-62 | B02-Q06 PASS v1 reopen unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-63 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-64 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-65 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-66 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-67 | B02-Q04 PASS read-only temporary hold permitted | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-68 | B02-Q05 PASS SQLite unsupported falls back without creating cache | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-69 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-70 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-71 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-72 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-73 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-74 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-75 | B02-Q05 PASS SQLite unsupported falls back without creating cache | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-76 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-77 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-78 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-79 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-80 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-81 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-82 | B02-Q04 PASS read-only temporary hold permitted | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-83 | B02-Q05 PASS SQLite unsupported falls back without creating cache | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-84 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-85 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-86 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-87 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-88 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-89 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-90 | B02-Q05 PASS SQLite unsupported falls back without creating cache | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-91 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-92 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-93 | B02-Q03 PASS domain-invalid active poisons owner before SQL or live publication | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-94 | B02-Q01 PASS real archive cold source or inactive job detail obtained on use | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-95 | B02-Q06 PASS late cold corruption closes detail Timeline Status and Retention | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-96 | B02-Q01 PASS real archive cold source or inactive job detail obtained on use | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-97 | B02-Q06 PASS late cold corruption closes detail Timeline Status and Retention | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-98 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-99 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-100 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-101 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-102 | B02-Q06 PASS backend-enabled v1 open append replay | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-103 | B02-Q06 PASS v1 checkpoint remains available | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-104 | B02-Q06 PASS v1 reopen unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-linked.log.gz) |
| q-linked-105 | B02-Q06 PASS unsupported crypto or backend rejects actual public B Open | pass | [config] crypto=0 sqlite=1 backend=1; [원출력](q-linked.log.gz) |
| q-linked-106 | B02-Q06 PASS unsupported crypto or backend rejects actual public B Open | pass | [config] crypto=1 sqlite=1 backend=0; [원출력](q-linked.log.gz) |

### q-final

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| q-final-1 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-2 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-3 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-4 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-5 | B02-Q04 PASS read-only temporary hold permitted | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-6 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-7 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-8 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-9 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-10 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-11 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-12 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-13 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-14 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-15 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-16 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-17 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-18 | B02-Q04 PASS read-only temporary hold permitted | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-19 | B02-Q02 PASS SQLite current typed rows identity and generation metadata | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-20 | B02-Q02 PASS SQLite actual segment typed fields match independent active state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-21 | B02-Q04 PASS temporary hold reaches B table | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-22 | B02-Q03 PASS hold SQL failure keeps SQL and memory count | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-23 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-24 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-25 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-26 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-27 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-28 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-29 | B02-Q02 PASS SQLite current typed rows identity and generation metadata | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-30 | B02-Q02 PASS SQLite actual segment typed fields match independent active state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-31 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-32 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-33 | B02-Q03 PASS domain-invalid active poisons owner before SQL or live publication | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-34 | B02-Q01 PASS real archive cold source or inactive job detail obtained on use | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-35 | B02-Q02 PASS thin summaries are separate from full payload rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-36 | B02-Q02 PASS SQLite source summary actual fields remain thin and current | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-37 | B02-Q06 PASS late cold corruption closes detail Timeline Status Retention Locations and same-instance Open | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-38 | B02-Q01 PASS real archive cold source or inactive job detail obtained on use | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-39 | B02-Q02 PASS thin summaries are separate from full payload rows | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-40 | B02-Q02 PASS SQLite source summary actual fields remain thin and current | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-41 | B02-Q02 PASS SQLite inactive job summary state latest identity and source output IDs | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-42 | B02-Q06 PASS late cold corruption closes detail Timeline Status Retention Locations and same-instance Open | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-43 | B02-Q03 PASS connection injection consumed once | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-44 | B02-Q03 PASS SQL prepare failure rolls cache back and publishes no live state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-45 | B02-Q03 PASS SQL failure source bytes unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-46 | B02-Q03 PASS connection injection consumed once | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-47 | B02-Q03 PASS SQL insert failure rolls cache back and publishes no live state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-48 | B02-Q03 PASS SQL failure source bytes unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-49 | B02-Q03 PASS connection injection consumed once | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-50 | B02-Q03 PASS SQL commit failure rolls cache back and publishes no live state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-51 | B02-Q03 PASS SQL failure source bytes unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-52 | B02-Q03 PASS connection injection consumed once | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-53 | B02-Q03 PASS SQL authority failure rolls cache back and publishes no live state | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-54 | B02-Q03 PASS authority replacement is not repaired or overwritten | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-55 | B02-Q05 PASS SQLite Open unavailable falls back only before transaction | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-56 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-57 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-58 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-59 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-60 | B02-Q06 PASS backend-enabled v1 open append replay | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-61 | B02-Q06 PASS v1 checkpoint remains available | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-62 | B02-Q06 PASS v1 reopen unchanged | pass | [config] crypto=1 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-63 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-64 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-65 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-66 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-67 | B02-Q04 PASS read-only temporary hold permitted | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-68 | B02-Q05 PASS SQLite unsupported falls back without creating cache | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-69 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-70 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-71 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-72 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-73 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-74 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-75 | B02-Q05 PASS SQLite unsupported falls back without creating cache | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-76 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-77 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-78 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-79 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-80 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-81 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-82 | B02-Q04 PASS read-only temporary hold permitted | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-83 | B02-Q05 PASS SQLite unsupported falls back without creating cache | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-84 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-85 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-86 | B02-Q01 PASS public B Open publishes verified current rows | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-87 | B02-Q01 PASS empty or valid active independent current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-88 | B02-Q01 PASS public Timeline Status Retention read authority | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-89 | B02-Q04 PASS durable writes reservation checkpoint writer remain closed | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-90 | B02-Q05 PASS SQLite unsupported falls back without creating cache | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-91 | B02-Q04 PASS source old cache actual cleanup marker and media unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-92 | B02-Q05 PASS new owner strict reopen returns current state | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-93 | B02-Q03 PASS domain-invalid active poisons owner before SQL or live publication | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-94 | B02-Q01 PASS real archive cold source or inactive job detail obtained on use | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-95 | B02-Q06 PASS late cold corruption closes detail Timeline Status Retention Locations and same-instance Open | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-96 | B02-Q01 PASS real archive cold source or inactive job detail obtained on use | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-97 | B02-Q06 PASS late cold corruption closes detail Timeline Status Retention Locations and same-instance Open | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-98 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-99 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-100 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-101 | B02-Q04 PASS cache or sidecar symlink hardlink rejected before SQLite | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-102 | B02-Q06 PASS backend-enabled v1 open append replay | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-103 | B02-Q06 PASS v1 checkpoint remains available | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-104 | B02-Q06 PASS v1 reopen unchanged | pass | [config] crypto=1 sqlite=0 backend=1; [원출력](q-final.log.gz) |
| q-final-105 | B02-Q06 PASS unsupported crypto or backend rejects actual public B Open | pass | [config] crypto=0 sqlite=1 backend=1; [원출력](q-final.log.gz) |
| q-final-106 | B02-Q06 PASS unsupported crypto or backend rejects actual public B Open | pass | [config] crypto=1 sqlite=1 backend=0; [원출력](q-final.log.gz) |

### scratch-regression

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| scratch-regression-1 | B02-Y01 PASS snapshot plus active corruption and same-ID retry | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-2 | B02-Y02 PASS live SQLite and original remain unpublished | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-3 | B02-Y02 PASS successful recovery is one-shot without ending link lease | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-4 | B02-Y02 PASS public Open write and replay remain closed | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-5 | B02-Y02 PASS active second domain failure preserves candidate live bytes SQLite and poisons owner | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-6 | B02-Y02 PASS new Journal strict reopen succeeds but unchanged domain-invalid candidate still fails | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-7 | B02-Y02 PASS identity conflict rejected before restore | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-8 | B02-Y03 PASS active job source retains resident bound to verified identity | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-9 | B02-Y03 PASS inactive source archive is not read during scratch | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-10 | B02-Y03 PASS cold missing archive fails at actual detail use | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-11 | B02-Y04 PASS pending source hold rederived without SQLite | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-12 | B02-Y04 PASS active terminal completion clears snapshot hold | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-13 | B02-Y01 PASS active reservation gap then finalization accepted | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-14 | B02-Y01 PASS later reservation rejected by Journal before scratch | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-15 | B02-Y01 PASS all sixteen snapshot row kinds imported | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-16 | B02-Z01 PASS managed actual history and strict reopen: v1-tomb-on-v2 | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-17 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-18 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-19 | B02-Z02 PASS EXPECTED RED actual history cut equivalence: v1-tomb-on-v2 | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-20 | B02-Z01 PASS managed actual history and strict reopen: job-v1-output | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-21 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-22 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-23 | B02-Z02 PASS EXPECTED RED actual history cut equivalence: job-v1-output | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-24 | B02-Z01 PASS managed actual history and strict reopen: job-tomb-output | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-25 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-26 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-27 | B02-Z02 PASS EXPECTED RED actual history cut equivalence: job-tomb-output | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-28 | B02-Z01 PASS managed actual history and strict reopen: source-wrapper | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-29 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-30 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-31 | B02-Z02 PASS EXPECTED RED actual history cut equivalence: source-wrapper | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-32 | B02-Z01 PASS managed actual history and strict reopen: job-source-tomb | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-33 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-34 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-35 | B02-Z02 PASS EXPECTED RED actual history cut equivalence: job-source-tomb | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-36 | B02-Z01 PASS managed actual history and strict reopen: v2-deleted-tomb | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-37 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-38 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-39 | B02-Z02 PASS EXPECTED RED actual history cut equivalence: v2-deleted-tomb | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-40 | B02-Z01 PASS managed actual history and strict reopen: committed-tomb | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-41 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-42 | B02-Z03 PASS candidate cuts leave live and original unchanged | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-43 | B02-Z02 PASS EXPECTED RED actual history cut equivalence: committed-tomb | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-44 | B02-Z01 PASS unmanaged S10-O10-equivalent explicit V2-opt-in reopen | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-45 | B02-Z01 PASS managed reservation then V1 finalize and reopen | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-46 | B02-Z02 PASS reserved then V1 finalization early cut | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-47 | B02-Z02 PASS reserved then V1 finalization late cut | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-48 | B02-Z01 PASS managed public V1 tombstone different identity accepted with independent deleted state | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-49 | B02-Z01 PASS public RequestDeletion after deleted is rejected without new bytes | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-50 | B02-Z01 PASS managed strict reopen preserves mismatched V1 tombstone state | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-51 | B02-Z03 PASS cut comparison never publishes live SQLite or changes bytes | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-52 | B02-Z03 PASS cut comparison never publishes live SQLite or changes bytes | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-53 | B02-Z02 PASS EXPECTED RED same actual managed history must restore same deleted identity on both cuts | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-54 | B02-Z01 PASS direct Journal DeletionRequested after deleted survives strict reopen unlike public request | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-55 | B02-Z03 PASS direct request cuts preserve live and original | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-56 | B02-Z03 PASS direct request cuts preserve live and original | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-57 | B02-Z02 PASS EXPECTED RED direct accepted request after deleted cut equivalence | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-58 | B02-Y02 PASS unsupported scratch remains closed | pass | 기본; [원출력](scratch-regression.log.gz) |
| scratch-regression-59 | B02-Y02 PASS unsupported scratch remains closed | pass | 기본; [원출력](scratch-regression.log.gz) |

### journal-regression

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| journal-regression-1 | B02-J04 PASS nonempty B read-only open | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-2 | B02-J04 PASS B path identifies active journal rather than preserved legacy file | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-3 | B02-J04 PASS active lease FD CLOEXEC | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-4 | B02-J04 PASS exclusive lease rejects second owner | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-5 | B02-J05 PASS writes attachment and misleading replay denied | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-6 | B02-J05 PASS fork authority rejected | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-7 | B02-J04 PASS read-only original bytes preserved | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-8 | B02-J04 PASS destructor closes active and lease | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-9 | B02-J04 PASS lease released and B reopen | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-10 | B02-J04 PASS fixed current/active accepts growing unopened historical descriptor | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-11 | B02-J04 PASS fixed current/active accepts growing unopened historical descriptor | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-12 | B02-J05 PASS marker | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-13 | B02-J05 PASS manifest | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-14 | B02-J05 PASS snapshot | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-15 | B02-J05 PASS identity | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-16 | B02-J05 PASS active | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-17 | B02-J05 PASS store | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-18 | B02-J05 PASS admission | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-19 | B02-J05 PASS symlink | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-20 | B02-J05 PASS hardlink | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-21 | B02-J06 PASS missing-marker | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-22 | B02-J06 PASS missing-manifest | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-23 | B02-J06 PASS ordinal | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-24 | B02-J05 PASS zero B admission refused without changing v1 defaults | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-25 | B02-J05 PASS opened component replacement rejected | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-26 | B02-J05 PASS restoring replaced component does not clear poison | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-27 | B02-J05 PASS opened component replacement rejected | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-28 | B02-J05 PASS restoring replaced component does not clear poison | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-29 | B02-J05 PASS opened component replacement rejected | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-30 | B02-J05 PASS restoring replaced component does not clear poison | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-31 | B02-J06 PASS backend-enabled v1 open append replay | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-32 | B02-J06 PASS v1 checkpoint remains available | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-33 | B02-J06 PASS v1 reopen unchanged | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-34 | B02-J08 PASS historical-identical-retry | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-35 | B02-J08 PASS active-identical-retry | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-36 | B02-J08 PASS reservation-same-retry-and-gap | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-37 | B02-J09 PASS historical-payload-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-38 | B02-J09 PASS historical-time-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-39 | B02-J09 PASS active-payload-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-40 | B02-J09 PASS active-type-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-41 | B02-J09 PASS reservation-timestamp-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-42 | B02-J09 PASS reservation-tuple-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-43 | B02-J09 PASS reservation-retrograde | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-44 | B02-J09 PASS reservation-segment-reuse | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-45 | B02-J09 PASS reservation-ordinary-id-collision | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-46 | B02-J09 PASS reservation-legacy-segment-collision | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-47 | B02-J09 PASS reservation-store-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-48 | B02-J09 PASS first-reservation-store-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-49 | B02-J09 PASS ordinary-reservation-id-collision | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-50 | B02-J08 PASS event-receipt-compatible | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-51 | B02-J08 PASS historical event accepts compatible receipt | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-52 | B02-J08 PASS historical receipt accepts original event retry | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-53 | B02-J09 PASS receipt-original-digest-conflict | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-54 | B02-J08 PASS last uint64 ordinal accepted read-only | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-55 | B02-J09 PASS ordinal overflow rejected | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-56 | B02-J10 PASS active opaque link reacquires physical row | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-57 | B02-J11 PASS ended link rejected with output and lease preserved | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-58 | B02-J10 PASS new session does not revive ended link | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-59 | B02-J11 PASS old epoch remains invalid | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-60 | B02-J11 PASS fork link rejected | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-61 | B02-J11 PASS missing ID preserves output link | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-62 | B02-J11 PASS same-size active tamper poisons without replacing output | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-63 | B02-J10 PASS reservation | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-64 | B02-J10 PASS receipt | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-65 | B02-J10 PASS uint64 | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-66 | B02-J11 PASS recording-generation.json | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-67 | B02-J11 PASS .recording-store-format | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-68 | B02-J10 PASS historical ordinal seven cold acquisition preserves original | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-69 | B02-J11 PASS foreign instance rejected without poisoning owner | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-70 | B02-J11 PASS historical archive corruption preserves output | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-71 | B02-J11 PASS destroyed owner link rejected after reopen | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-72 | B02-J06 PASS disabled backend or crypto refuses B | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-73 | B02-J06 PASS backend-enabled v1 open append replay | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-74 | B02-J06 PASS v1 reopen unchanged | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-75 | B02-J06 PASS disabled backend or crypto refuses B | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-76 | B02-J06 PASS backend-enabled v1 open append replay | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-77 | B02-J06 PASS v1 checkpoint remains available | pass | 기본; [원출력](journal-regression.log.gz) |
| journal-regression-78 | B02-J06 PASS v1 reopen unchanged | pass | 기본; [원출력](journal-regression.log.gz) |

### catalog

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-1 | [pass] journal open:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-2 | [pass] fallback catalog open:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-3 | [pass] SQLite off mode 표시 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-4 | [pass] segment finalize journal+projection:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-5 | [pass] fallback range query | pass | 기본; [원출력](catalog.log.gz) |
| catalog-6 | [pass] event link FK 위반 거부 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-7 | [pass] FK 위반 transaction/journal 전체 rollback | pass | 기본; [원출력](catalog.log.gz) |
| catalog-8 | [pass] 최초 durable mutation 1개 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-9 | [pass] 동일 mutation 중복 append | pass | 기본; [원출력](catalog.log.gz) |
| catalog-10 | [pass] 손상 사이 정상 durable mutation 보존 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-11 | [pass] 중간 corrupt line count | pass | 기본; [원출력](catalog.log.gz) |
| catalog-12 | [pass] 마지막 truncated line skip | pass | 기본; [원출력](catalog.log.gz) |
| catalog-13 | [pass] fallback replay open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-14 | [pass] 같은 mutation idempotent replay | pass | 기본; [원출력](catalog.log.gz) |
| catalog-15 | [pass] 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-16 | [pass] 중복 replay row/합계 불증가 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-17 | [pass] 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-18 | [pass] writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | fail | 기본; [원출력](catalog.log.gz) |
| catalog-19 | [pass] v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | fail | 기본; [원출력](catalog.log.gz) |
| catalog-20 | [pass] SQLite catalog open/rebuild:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-21 | [pass] SQLite primary mode 표시 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-22 | [pass] SQLite on/off range query ID·순서 parity | pass | 기본; [원출력](catalog.log.gz) |
| catalog-23 | [pass] journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-24 | [pass] journal 없는 손상 media orphan 구분 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-25 | [pass] projection failover journal open:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-26 | [pass] projection failover catalog open:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-27 | [pass] 실제 SQLite INSERT 실패 trigger 설치 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-28 | [pass] SQLite 투영 실패 뒤 journal+memory finalize 유지:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-29 | [pass] SQLite 투영 실패 즉시 JSONL fallback 전환 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-30 | [pass] 재시작 rebuild 전 실패 trigger 제거 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-31 | [pass] 투영 실패 직후 in-memory query 정합성 유지 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-32 | [pass] projection failover 재시작 journal rebuild:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-33 | [pass] 재시작 후 journal에서 누락 SQLite projection 복구 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-34 | [pass] 재시작 후 SQLite primary 복귀 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-35 | [pass] 재시작 journal rebuild가 실제 SQLite row 복원 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-36 | [pass] tombstone journal open:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-37 | [pass] tombstone catalog open:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-38 | [pass] tombstone 대상 segment finalize:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-39 | [pass] tombstone 대상 deletion request:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-40 | [pass] tombstone 완료 기록:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-41 | [pass] catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-42 | [pass] 손상 SQLite 격리 후 journal rebuild:  | pass | 기본; [원출력](catalog.log.gz) |
| catalog-43 | [pass] 손상 SQLite 원본 격리 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-44 | [pass] 격리 SQLite 파일 보존 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-45 | [pass] 격리 후 journal rebuild 결과 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-46 | [pass] S10-3A future-schema journal read open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-47 | [pass] S10-3A future-schema unsupported classification | pass | 기본; [원출력](catalog.log.gz) |
| catalog-48 | [pass] S10-3A future-schema catalog open denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-49 | [pass] S10-3A future-schema catalog retry denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-50 | [pass] S10-3A future-schema journal bytes preserved | pass | 기본; [원출력](catalog.log.gz) |
| catalog-51 | [pass] S10-3A future-schema SQLite bytes preserved | pass | 기본; [원출력](catalog.log.gz) |
| catalog-52 | [pass] S10-3A future-schema writer cleanup untouched | pass | 기본; [원출력](catalog.log.gz) |
| catalog-53 | [pass] S10-3A arbitrary-schema journal read open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-54 | [pass] S10-3A arbitrary-schema unsupported classification | pass | 기본; [원출력](catalog.log.gz) |
| catalog-55 | [pass] S10-3A arbitrary-schema catalog open denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-56 | [pass] S10-3A arbitrary-schema catalog retry denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-57 | [pass] S10-3A arbitrary-schema journal bytes preserved | pass | 기본; [원출력](catalog.log.gz) |
| catalog-58 | [pass] S10-3A arbitrary-schema SQLite bytes preserved | pass | 기본; [원출력](catalog.log.gz) |
| catalog-59 | [pass] S10-3A arbitrary-schema writer cleanup untouched | pass | 기본; [원출력](catalog.log.gz) |
| catalog-60 | [pass] S10-3A empty-schema journal read open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-61 | [pass] S10-3A empty-schema unsupported classification | pass | 기본; [원출력](catalog.log.gz) |
| catalog-62 | [pass] S10-3A empty-schema catalog open denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-63 | [pass] S10-3A empty-schema catalog retry denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-64 | [pass] S10-3A empty-schema journal bytes preserved | pass | 기본; [원출력](catalog.log.gz) |
| catalog-65 | [pass] S10-3A empty-schema SQLite bytes preserved | pass | 기본; [원출력](catalog.log.gz) |
| catalog-66 | [pass] S10-3A empty-schema writer cleanup untouched | pass | 기본; [원출력](catalog.log.gz) |
| catalog-67 | [pass] S10-3A future-type journal read open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-68 | [pass] S10-3A future-type unsupported classification | pass | 기본; [원출력](catalog.log.gz) |
| catalog-69 | [pass] S10-3A future-type catalog open denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-70 | [pass] S10-3A future-type catalog retry denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-71 | [pass] S10-3A future-type journal bytes preserved | pass | 기본; [원출력](catalog.log.gz) |
| catalog-72 | [pass] S10-3A future-type SQLite bytes preserved | pass | 기본; [원출력](catalog.log.gz) |
| catalog-73 | [pass] S10-3A future-type writer cleanup untouched | pass | 기본; [원출력](catalog.log.gz) |
| catalog-74 | [pass] S10-3A malformed journal open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-75 | [pass] S10-3A malformed JSON missing fields and wrong types remain corrupt | pass | 기본; [원출력](catalog.log.gz) |
| catalog-76 | [pass] S10-O01 reservation journal open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-77 | [pass] S10-O01 first reservation returns four IDs and sequence one | pass | 기본; [원출력](catalog.log.gz) |
| catalog-78 | [pass] S10-O01 versioned reservation payload replays | pass | 기본; [원출력](catalog.log.gz) |
| catalog-79 | [pass] S10-O01 new reservation records actual occurred time | pass | 기본; [원출력](catalog.log.gz) |
| catalog-80 | [pass] S10-O02 identical retry preserves sequence and bytes | pass | 기본; [원출력](catalog.log.gz) |
| catalog-81 | [pass] S10-O03 reopened instance allocates next sequence | pass | 기본; [원출력](catalog.log.gz) |
| catalog-82 | [pass] S10-O03 new process resumes durable sequence | pass | 기본; [원출력](catalog.log.gz) |
| catalog-83 | [pass] S10-O04 different store rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-84 | [pass] S10-O04 reused request with different segment rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-85 | [pass] S10-O04 reused request with different channel rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-86 | [pass] S10-O04 reused segment with different request rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-87 | [pass] S10-O04 conflicts preserve original bytes | pass | 기본; [원출력](catalog.log.gz) |
| catalog-88 | [pass] S10-O05/O06 reject and preserve corrupt | pass | 기본; [원출력](catalog.log.gz) |
| catalog-89 | [pass] S10-O05/O06 reject and preserve unsupported-schema | pass | 기본; [원출력](catalog.log.gz) |
| catalog-90 | [pass] S10-O05/O06 reject and preserve unsupported-type | pass | 기본; [원출력](catalog.log.gz) |
| catalog-91 | [pass] S10-O05/O06 reject and preserve tail | pass | 기본; [원출력](catalog.log.gz) |
| catalog-92 | [pass] S10-O05/O06 reject and preserve payload-zero | pass | 기본; [원출력](catalog.log.gz) |
| catalog-93 | [pass] S10-O05/O06 reject and preserve payload-negative | pass | 기본; [원출력](catalog.log.gz) |
| catalog-94 | [pass] S10-O05/O06 reject and preserve payload-fraction | pass | 기본; [원출력](catalog.log.gz) |
| catalog-95 | [pass] S10-O05/O06 reject and preserve payload-overflow | pass | 기본; [원출력](catalog.log.gz) |
| catalog-96 | [pass] S10-O05/O06 reject and preserve duplicate-sequence | pass | 기본; [원출력](catalog.log.gz) |
| catalog-97 | [pass] S10-O05/O06 reject and preserve decreasing-sequence | pass | 기본; [원출력](catalog.log.gz) |
| catalog-98 | [pass] S10-O05/O06 reject and preserve duplicate-request | pass | 기본; [원출력](catalog.log.gz) |
| catalog-99 | [pass] S10-O05/O06 reject and preserve duplicate-segment | pass | 기본; [원출력](catalog.log.gz) |
| catalog-100 | [pass] S10-O05/O06 reject and preserve store-conflict | pass | 기본; [원출력](catalog.log.gz) |
| catalog-101 | [pass] S10-O05/O06 reject and preserve ordinary-before | pass | 기본; [원출력](catalog.log.gz) |
| catalog-102 | [pass] S10-O05/O06 reject and preserve ordinary-after | pass | 기본; [원출력](catalog.log.gz) |
| catalog-103 | [pass] S10-O05/O06 reject and preserve line-cap | pass | 기본; [원출력](catalog.log.gz) |
| catalog-104 | [pass] S10-O05 reservation entity envelope binding rejects mismatch | pass | 기본; [원출력](catalog.log.gz) |
| catalog-105 | [pass] S10-O05 reservation request envelope binding rejects mismatch | pass | 기본; [원출력](catalog.log.gz) |
| catalog-106 | [pass] S10-O01 strict reservation parser accepts versioned literal | pass | 기본; [원출력](catalog.log.gz) |
| catalog-107 | [pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | 기본; [원출력](catalog.log.gz) |
| catalog-108 | [pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | 기본; [원출력](catalog.log.gz) |
| catalog-109 | [pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | 기본; [원출력](catalog.log.gz) |
| catalog-110 | [pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | 기본; [원출력](catalog.log.gz) |
| catalog-111 | [pass] S10-O06 INT64_MAX identical retry remains valid | pass | 기본; [원출력](catalog.log.gz) |
| catalog-112 | [pass] S10-O06 sequence overflow rejected without write | pass | 기본; [원출력](catalog.log.gz) |
| catalog-113 | [pass] S10-O02 identical durable reservation duplicates remain idempotent | pass | 기본; [원출력](catalog.log.gz) |
| catalog-114 | [pass] S10-O06 sequence gaps remain valid and allocate above maximum | pass | 기본; [원출력](catalog.log.gz) |
| catalog-115 | [pass] S10-O07 four simultaneous processes finish reservations | pass | 기본; [원출력](catalog.log.gz) |
| catalog-116 | [pass] S10-O07 concurrent sequences are unique and complete | pass | 기본; [원출력](catalog.log.gz) |
| catalog-117 | [pass] S10-O07 next sequence follows concurrent reservations | pass | 기본; [원출력](catalog.log.gz) |
| catalog-118 | [pass] S10-O08 ordinary Append cannot reserve orders | pass | 기본; [원출력](catalog.log.gz) |
| catalog-119 | [pass] S10-O08 unopened journal rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-120 | [pass] S10-O08 null result rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-121 | [pass] S10-O08 invalid opaque ID rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-122 | [pass] S10-O08 failed reservation does not expose tentative result | pass | 기본; [원출력](catalog.log.gz) |
| catalog-123 | [pass] S10-O09 unsafe file binding rejected and original preserved inode | pass | 기본; [원출력](catalog.log.gz) |
| catalog-124 | [pass] S10-O09 unsafe file binding rejected and original preserved parent | pass | 기본; [원출력](catalog.log.gz) |
| catalog-125 | [pass] S10-O09 unsafe file binding rejected and original preserved symlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-126 | [pass] S10-O09 unsafe file binding rejected and original preserved hardlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-127 | [pass] S10-O10 reservation and normal segment coexist in catalog | pass | 기본; [원출력](catalog.log.gz) |
| catalog-128 | [pass] S10-O04 reserve then finalize permits identical retry | pass | 기본; [원출력](catalog.log.gz) |
| catalog-129 | [pass] S10-O10 reservation survives catalog rebuild without changing segment query | pass | 기본; [원출력](catalog.log.gz) |
| catalog-130 | [pass] S10-O04 legacy segment cannot acquire retroactive reservation | pass | 기본; [원출력](catalog.log.gz) |
| catalog-131 | [pass] S10-M06 opened catalog accepts fresh exact reservation V2 finalize | pass | 기본; [원출력](catalog.log.gz) |
| catalog-132 | [pass] S10-M07 V2 find preserves complete metadata | pass | 기본; [원출력](catalog.log.gz) |
| catalog-133 | [pass] S10-M07 identical V2 recovery is idempotent | pass | 기본; [원출력](catalog.log.gz) |
| catalog-134 | [pass] S10-M07 V2 is absent from V1 range query | pass | 기본; [원출력](catalog.log.gz) |
| catalog-135 | [pass] S10-M07 V2 registered path is not orphan | pass | 기본; [원출력](catalog.log.gz) |
| catalog-136 | [pass] S10-M07 SQLite exact V2 JSON and path match | pass | 기본; [원출력](catalog.log.gz) |
| catalog-137 | [pass] S10-M07 JSONL restart preserves V2 exact payload | pass | 기본; [원출력](catalog.log.gz) |
| catalog-138 | [pass] S10-M06 wrong reservation tuple rejected store | pass | 기본; [원출력](catalog.log.gz) |
| catalog-139 | [pass] S10-M06 wrong reservation tuple rejected request | pass | 기본; [원출력](catalog.log.gz) |
| catalog-140 | [pass] S10-M06 wrong reservation tuple rejected segment | pass | 기본; [원출력](catalog.log.gz) |
| catalog-141 | [pass] S10-M06 wrong reservation tuple rejected channel | pass | 기본; [원출력](catalog.log.gz) |
| catalog-142 | [pass] S10-M06 wrong reservation tuple rejected sequence | pass | 기본; [원출력](catalog.log.gz) |
| catalog-143 | [pass] S10-M09 immutable V2 mapping mismatch rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-144 | [pass] S10-M09 bad V2 startup retry preserves original state bad-payload | pass | 기본; [원출력](catalog.log.gz) |
| catalog-145 | [pass] S10-M09 bad V2 startup retry preserves original state missing-order | pass | 기본; [원출력](catalog.log.gz) |
| catalog-146 | [pass] S10-M09 bad V2 startup retry preserves original state bad-order | pass | 기본; [원출력](catalog.log.gz) |
| catalog-147 | [pass] S10-M09 bad V2 startup retry preserves original state conflicting-order | pass | 기본; [원출력](catalog.log.gz) |
| catalog-148 | [pass] S10-M09 bad V2 startup retry preserves original state tail | pass | 기본; [원출력](catalog.log.gz) |
| catalog-149 | [pass] S10-M09 bad V2 startup retry preserves original state corrupt | pass | 기본; [원출력](catalog.log.gz) |
| catalog-150 | [pass] S10-M09 bad V2 startup retry preserves original state unsafe-path | pass | 기본; [원출력](catalog.log.gz) |
| catalog-151 | [pass] S10-M09 default off rejects V2 before SQLite changes | pass | 기본; [원출력](catalog.log.gz) |
| catalog-152 | [pass] S10-M09 V2 replay namespace and deletion duplicate | pass | 기본; [원출력](catalog.log.gz) |
| catalog-153 | [pass] S10-M09 V2 replay namespace and deletion deleted | pass | 기본; [원출력](catalog.log.gz) |
| catalog-154 | [pass] S10-M09 V2 replay namespace and deletion v1-before | pass | 기본; [원출력](catalog.log.gz) |
| catalog-155 | [pass] S10-M09 V2 replay namespace and deletion v1-after | pass | 기본; [원출력](catalog.log.gz) |
| catalog-156 | [pass] S10-M09 V2 replay namespace and deletion deleted-before | pass | 기본; [원출력](catalog.log.gz) |
| catalog-157 | [pass] S10-M09 V2 replay namespace and deletion resurrection | pass | 기본; [원출력](catalog.log.gz) |
| catalog-158 | [pass] S10-M09 V2 replay namespace and deletion mutation-collision | pass | 기본; [원출력](catalog.log.gz) |
| catalog-159 | [pass] S10-M09 V2 finalize rejects missing media | pass | 기본; [원출력](catalog.log.gz) |
| catalog-160 | [pass] S10-M09 V2 finalize rejects directory media | pass | 기본; [원출력](catalog.log.gz) |
| catalog-161 | [pass] S10-M09 fresh candidate rejects mapping | pass | 기본; [원출력](catalog.log.gz) |
| catalog-162 | [pass] S10-M09 fresh candidate rejects path | pass | 기본; [원출력](catalog.log.gz) |
| catalog-163 | [pass] S10-M09 fresh candidate rejects tombstone | pass | 기본; [원출력](catalog.log.gz) |
| catalog-164 | [pass] S10-SW01 managed empty root opens with lifetime lease | pass | 기본; [원출력](catalog.log.gz) |
| catalog-165 | [pass] S10-SW02 same process second managed owner denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-166 | [pass] S10-SW03 different process owner and inherited use denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-167 | [pass] S10-SW12 managed duplicate descriptors are close-on-exec | pass | 기본; [원출력](catalog.log.gz) |
| catalog-168 | [pass] S10-SW05 managed reserve append replay use owned descriptor | pass | 기본; [원출력](catalog.log.gz) |
| catalog-169 | [pass] S10-SW06 raw managed access and legacy default path denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-170 | [pass] S10-SW01 managed Reserve rejects different store identity | pass | 기본; [원출력](catalog.log.gz) |
| catalog-171 | [pass] S10-SW10 catalog connection can inspect managed lease | pass | 기본; [원출력](catalog.log.gz) |
| catalog-172 | [pass] S10-SW04 owner destruction releases lease | pass | 기본; [원출력](catalog.log.gz) |
| catalog-173 | [pass] S10-SW01 managed reopen rejects different store identity | pass | 기본; [원출력](catalog.log.gz) |
| catalog-174 | [pass] S10-SW11 managed incomplete tail rejects append without changing bytes | pass | 기본; [원출력](catalog.log.gz) |
| catalog-175 | [pass] S10-SW07 legacy nonempty root preserved without conversion | pass | 기본; [원출력](catalog.log.gz) |
| catalog-176 | [pass] S10-SW08 partial initialization retry validates exact state lease | pass | 기본; [원출력](catalog.log.gz) |
| catalog-177 | [pass] S10-SW08 partial initialization retry validates exact state init | pass | 기본; [원출력](catalog.log.gz) |
| catalog-178 | [pass] S10-SW08 partial initialization retry validates exact state barrier | pass | 기본; [원출력](catalog.log.gz) |
| catalog-179 | [pass] S10-SW08 partial initialization retry validates exact state journal | pass | 기본; [원출력](catalog.log.gz) |
| catalog-180 | [pass] S10-SW08 partial initialization retry validates exact state incomplete | pass | 기본; [원출력](catalog.log.gz) |
| catalog-181 | [pass] S10-SW08 partial initialization retry validates exact state unknown | pass | 기본; [원출력](catalog.log.gz) |
| catalog-182 | [pass] S10-SW09 symlink inode and malformed marker rejected journal | pass | 기본; [원출력](catalog.log.gz) |
| catalog-183 | [pass] S10-SW09 symlink inode and malformed marker rejected marker | pass | 기본; [원출력](catalog.log.gz) |
| catalog-184 | [pass] S10-SW09 symlink inode and malformed marker rejected barrier | pass | 기본; [원출력](catalog.log.gz) |
| catalog-185 | [pass] S10-SW09 symlink inode and malformed marker rejected root-symlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-186 | [pass] B02-G01 manifest presence or exact v2 marker rejects v1 fallback and preserves bytes; normal v1 reopen retained | pass | 기본; [원출력](catalog.log.gz) |
| catalog-187 | [pass] B02-G02 live v1 read/write/binding reject manifest appearance or exact v2 marker replacement without byte changes | pass | 기본; [원출력](catalog.log.gz) |
| catalog-188 | [pass] B02-P02 current Catalog export and independent rejection; not cutover/import/raw locator validation | pass | 기본; [원출력](catalog.log.gz) |
| catalog-189 | [pass] S10-SB01 second managed catalog is denied | pass | 기본; [원출력](catalog.log.gz) |
| catalog-190 | [pass] S10-SB02 failed catalog cannot mutate journal or holds | pass | 기본; [원출력](catalog.log.gz) |
| catalog-191 | [pass] S10-SB03 attached catalog blocks unowned append but permits reservation | pass | 기본; [원출력](catalog.log.gz) |
| catalog-192 | [pass] S10-SB04 catalog destruction releases attachment | pass | 기본; [원출력](catalog.log.gz) |
| catalog-193 | [pass] S10-SB05 managed catalog rejects unsafe options outside | pass | 기본; [원출력](catalog.log.gz) |
| catalog-194 | [pass] S10-SB05 managed catalog rejects unsafe options dotdot | pass | 기본; [원출력](catalog.log.gz) |
| catalog-195 | [pass] S10-SB05 managed catalog rejects unsafe options media-symlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-196 | [pass] S10-SB05 managed catalog rejects unsafe options sqlite-symlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-197 | [pass] S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-198 | [pass] S10-SB05 managed catalog rejects unsafe options disabled | pass | 기본; [원출력](catalog.log.gz) |
| catalog-199 | [pass] S10-SB06 failed open releases catalog attachment | pass | 기본; [원출력](catalog.log.gz) |
| catalog-200 | [pass] S10-SB07 managed SQLite sidecar rejected -wal symlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-201 | [pass] S10-SB07 managed SQLite sidecar rejected -wal hardlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-202 | [pass] S10-SB07 managed SQLite sidecar rejected -shm symlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-203 | [pass] S10-SB07 managed SQLite sidecar rejected -shm hardlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-204 | [pass] S10-SB07 managed SQLite sidecar rejected -journal symlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-205 | [pass] S10-SB07 managed SQLite sidecar rejected -journal hardlink | pass | 기본; [원출력](catalog.log.gz) |
| catalog-206 | [pass] S10-SC01 managed repeated event fixture is valid | pass | 기본; [원출력](catalog.log.gz) |
| catalog-207 | [pass] S10-SC02 managed reservations avoid history reads | pass | 기본; [원출력](catalog.log.gz) |
| catalog-208 | [pass] S10-SC03 managed V2 finalize avoids full replay | pass | 기본; [원출력](catalog.log.gz) |
| catalog-209 | [pass] S10-SC04 checkpoint reduces superseded event payload bytes | pass | 기본; [원출력](catalog.log.gz) |
| catalog-210 | [pass] S10-SC05 checkpoint preserves latest event and all record identities | pass | 기본; [원출력](catalog.log.gz) |
| catalog-211 | [pass] S10-SC06 checkpoint is idempotent and preserves V2 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-212 | [pass] S10-SC08 receipt preserves retry identity and rejects direct append | pass | 기본; [원출력](catalog.log.gz) |
| catalog-213 | [pass] S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | pass | 기본; [원출력](catalog.log.gz) |
| catalog-214 | [pass] S10-SC09 managed checkpoint SQL V2 payload and path | pass | 기본; [원출력](catalog.log.gz) |
| catalog-215 | [pass] S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | pass | 기본; [원출력](catalog.log.gz) |
| catalog-216 | [pass] S10-SC10 checkpoint prefix recovers before writes | pass | 기본; [원출력](catalog.log.gz) |
| catalog-217 | [pass] S10-SC11 checkpoint mismatch preserves bytes and poisons owner | pass | 기본; [원출력](catalog.log.gz) |
| catalog-218 | [pass] S10-SC12 first accepted mutation controls latest event | pass | 기본; [원출력](catalog.log.gz) |
| catalog-219 | [pass] S10-SC16 automatic checkpoint uses accumulated growth | pass | 기본; [원출력](catalog.log.gz) |
| catalog-220 | [pass] S10-SC07 raw checkpoint is rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-221 | [pass] S10-SC18 checkpoint syscall failure poisons and reopens write | pass | 기본; [원출력](catalog.log.gz) |
| catalog-222 | [pass] S10-SC21 poison rejects hold mutation write | pass | 기본; [원출력](catalog.log.gz) |
| catalog-223 | [pass] S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | pass | 기본; [원출력](catalog.log.gz) |
| catalog-224 | [pass] S10-SC21 poison rejects hold mutation file-fsync | pass | 기본; [원출력](catalog.log.gz) |
| catalog-225 | [pass] S10-SC18 checkpoint syscall failure poisons and reopens rename | pass | 기본; [원출력](catalog.log.gz) |
| catalog-226 | [pass] S10-SC21 poison rejects hold mutation rename | pass | 기본; [원출력](catalog.log.gz) |
| catalog-227 | [pass] S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | pass | 기본; [원출력](catalog.log.gz) |
| catalog-228 | [pass] S10-SC21 poison rejects hold mutation dir-fsync | pass | 기본; [원출력](catalog.log.gz) |
| catalog-229 | [pass] S10-SC17 checkpoint preserves holds observations and deletion | pass | 기본; [원출력](catalog.log.gz) |
| catalog-230 | [pass] S10-SC17 checkpoint SQL hold observation tombstone | pass | 기본; [원출력](catalog.log.gz) |
| catalog-231 | [pass] S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | pass | 기본; [원출력](catalog.log.gz) |
| catalog-232 | [pass] S10-SC17 checkpoint SQL restart observation tombstone | pass | 기본; [원출력](catalog.log.gz) |
| catalog-233 | [pass] S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | pass | 기본; [원출력](catalog.log.gz) |
| catalog-234 | [pass] S10-SC19 invalid managed history remains unchanged malformed | pass | 기본; [원출력](catalog.log.gz) |
| catalog-235 | [pass] S10-SC19 invalid managed history remains unchanged unsupported | pass | 기본; [원출력](catalog.log.gz) |
| catalog-236 | [pass] S10-SC19 invalid managed history remains unchanged conflict | pass | 기본; [원출력](catalog.log.gz) |
| catalog-237 | [pass] S10-SC20 raw catalog rejects receipt before side effects | pass | 기본; [원출력](catalog.log.gz) |
| catalog-238 | [pass] S10-SC13 crypto off raw remains usable | pass | 기본; [원출력](catalog.log.gz) |
| catalog-239 | [pass] S10-SC14 crypto off checkpoint is rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-240 | [pass] S10-SC15 crypto off receipt reopen is rejected | pass | 기본; [원출력](catalog.log.gz) |
| catalog-241 | [pass] source 저장 callback reconcile 연결 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-242 | [pass] policy revision idempotency | pass | 기본; [원출력](catalog.log.gz) |
| catalog-243 | [pass] 5초 safety reconcile | pass | 기본; [원출력](catalog.log.gz) |
| catalog-244 | [pass] composition root 관리 저장소 선행 open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-245 | [pass] composition helper journal 다음 catalog rebuild/open | pass | 기본; [원출력](catalog.log.gz) |
| catalog-246 | [pass] 서버 전 supervisor 시작 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-247 | [pass] ingress 전 event bridge 등록 | pass | 기본; [원출력](catalog.log.gz) |
| catalog-248 | [pass] ingress 종료 뒤 recorder finalize | pass | 기본; [원출력](catalog.log.gz) |
| catalog-249 | [pass] composition root 시작/종료 순서 | pass | 기본; [원출력](catalog.log.gz) |
