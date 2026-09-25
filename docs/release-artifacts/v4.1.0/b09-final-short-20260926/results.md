# B09-F01 최종 소스·단기 증거 결속

독자: v4.1.0 검증·릴리즈 담당자. 수명: 이번 코드 고정과 단기 실행 기록.
정책은 AGENTS.md, 실행 전 정의는 중앙 테스트 기록 B09-F01을 따른다.
이 문서는 실행 전 범위와 실제 실행 이력을 구분한다.

## 실행 전 범위·비범위

대상은 B08-R/C/H/I/Q 변경이 반영된 현재 소스다. 저장 형식·공개 API·권한·
HTTP 4초·관측 15초·복구 15초·자원 상한을 바꾸지 않는다. 완전 출력 2개,
HTTP/파일 hash, 재기동 기존/새 데이터는 [B08 실제 앱 결과](../b08-actual-app-20260925/results.md)로
확인한다. 최종 단기에서는 빌드·격리 인증·기존 미디어 영향 근거·환경·문서·
인벤토리·버전/증거의 결속을 확인한다. 30분·실제 UI·120분 및 외부 서비스·
실기기와 PR/병합/태그/Release는 이번 범위 밖이다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화: 빌드·현재 녹화 | 진행 대상 | B08 저장·검증기 변경, 최종 코드 결속 | B08-R01/R02/C01/H01/I01/I02/Q01~Q04 | 승인, B08 집중·실제 앱 증거 재사용 가능 범위 대조 |
| 안정화: 인증 | 진행 대상 | 최종 단기 B09-F01 정의, 인증 fixture 보완 | B09-F01, B08-I01 | 승인, 격리 임시값 자동 생성 |
| 안정화: RTSP/WebRTC codec·ICE | 조건부 진행 | B08 diff는 recording journal/catalog·검증기이며 RTSP/WebRTC 경로 직접 변경은 없음 | B09-F01·AGENTS 7.4, 이전 HW-03 codec67/ICE8 | 최신 diff에서 경계 불변 확인 시 유효한 기존 증거 유지; 실행 확대 승인 아님 |
| 안정화: 녹화 미디어 | 진행 대상 | C++ journal 읽기와 공개 media 소비자 영향 | B08-Q04 public-media46, B08-I01 actual-app27 | 같은 소스의 최신 유효 증거와 build 결속 |
| 안정화: 환경·문서·인벤토리·버전 | 진행 대상 | 현재 source·실행 연결·기록 정합 확인 | B09-F01 | 승인, 실제 명령·exit 기록 |
| 30분 | 미진행 | 이번은 최종 단기까지만 승인 | AGENTS 7.6, B09-F01 | 별도 실행 승인 필요 |
| UI 풀테스트 | 미진행 | 실제 브라우저 실행은 이번 범위 밖 | AGENTS 7.6.3/7.9 | 별도 실행 승인 필요 |
| 공통·녹화 120분 | 미진행 | 직접 저장 변경으로 필요성은 있으나 이번은 단기 범위 | AGENTS 7.6.2, B08-R/C/Q | 별도 실행 승인 필요 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 사용자 지시 | 제외, PASS 아님 |

명령은 `./server.sh build`, 격리 `verify-auth-bootstrap/users/routes`,
`verify-gst-environment`, `verify-project-inventory`, `verify-feature-inventory-coverage`,
`verify-script-inventory`, `verify-docs-links`, `verify-docs-ui-assets`,
`verify-release-metadata`, `verify-release-closeout-helper --dry-run`,
`git diff --check`다. 변경된 녹화 경계의 단기 재검증은 B08 집중 621/52/342,
현재 통합 35+40+10+46+27을 직접 대조해 승계 가능 여부를 판단한다.
실패하면 뒤 명령은 보류하고 같은 단계의 원인·안전 범위를 확정한다.

## 실제 결과

| 제목 | 테스트내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| B09-F01 빌드 | `./server.sh build`, 현재 C++·설정 | pass | exit0, AI on·YouTube off. [원출력](build.log) |
| B09-F01 인증 첫 실행 | `verify-auth-bootstrap` 격리 UDP 준비 | fail | exit1. 제품 인증 검사 전 UDP 제공기 실패와 기존 cleanup의 종료 미확인. [원출력](auth-bootstrap-first.log) |
| B09-F01 인증 재실행 | 로컬 소켓 권한에서 `verify-auth-bootstrap` | pass | exit0, 19/19·격리 root 부재. [원출력](auth-bootstrap.log) |
| B09-F01 계정·scope | `verify-auth-users` | pass | exit0, 72/72·격리 root 부재. [원출력](auth-users.log) |
| B09-F01 route·scope | `verify-auth-routes` | pass | exit0, 146/146·격리 root 부재. [무손실 압축 원출력](auth-routes.log.gz) |
| B09-F01 GStreamer 환경 | `verify-gst-environment` | pass | exit0, 20/20 fixture 및 각 소유 root 정리. [원출력](gst-environment.log) |
| B09-F01 기능 인벤토리 첫 실행 | `verify-project-inventory` | fail | exit1, 17/18. 기능986개 행은 유지됐으나 B08 결과표 변경으로 전체 문서 hash만 drift. [원출력 압축](project-inventory-first.log.gz) |
| B09-F01 기능 인벤토리 재실행 | 구현 증적 manifest의 inventory hash 갱신 뒤 동일 명령 | pass | exit0, 18/18·기능986개. [원출력 압축](project-inventory-final.log.gz) |
| B09-F01 기능 커버리지 | `verify-feature-inventory-coverage` | pass | exit0, 986/986·missing0·8/8. [원출력](feature-coverage.log) |
| B09-F01 버전·공개 경계 | `verify-release-metadata` | pass | exit0, 18/18. published 원격 확인은 수행하지 않음. [원출력](release-metadata.log) |
| B09-F01 릴리즈 절차 모의 | `verify-release-closeout-helper --dry-run` | pass | exit0, 6/6. push/tag 등 실제 동작 없음. [원출력](closeout-dryrun.log) |
| B09-F01 문서 이미지 | `verify-docs-ui-assets` | pass | exit0, 10/10. 실제 UI 시각 검증은 아님. [원출력](docs-assets.log) |
| B09-F01 문서 링크 | `verify-docs-links` | pass | exit0, Markdown 351·로컬 링크 14,414·오류0. [원출력](docs-links.log) |
| B09-F01 스크립트 등록 | `verify-script-inventory` | pass | exit0, 12/12·신규 B08 Q 검증기 등록 대조. [원출력](script-inventory.log) |
| B09-F01 공백 검사 | `git diff --check` | pass | exit0, 현재 문서·manifest diff; stage 후 검사 별도 |

첫 인증 시도는 격리 환경의 UDP bind 단계에서 실패했다. 서버는 시작되지 않았고,
PID 39225 및 TCP 8091/8565의 잔존 프로세스·LISTEN 없음, 소유 root의 열린 FD 없음,
파일은 sample_h264.mp4 하나(du 300KiB)임을 직접 확인했다. 소유 UID 501,
device 16777234, inode 159678046을 대조한 뒤 정확한 root를 전용 cleanup으로
삭제했고 부재를 확인했다. 제품 실패나 인증 PASS로 처리하지 않는다.
같은 명령을 필요한 로컬 소켓 권한에서 재실행하고 원래 실패 이력을 유지한다.
뒤 검사는 재실행의 통과 전에는 수행하지 않는다.

기능 인벤토리 첫 실패도 보존한다. 변경 전 커밋 `624be882`의 문서 SHA256은
manifest의 기존 `83be1ac3…`과 같고, 현재 문서는 `b1e88cf6…`이다.
`parseFeatureRows`로 두 시점의 구현 대상 986개 행을 대조해 JSON 값이 완전히
같음을 확인했다. B08 결과 상태를 적은 문서 상단만 달라졌으므로 manifest의
`inventorySha256` 한 필드만 갱신했다. 승인된 기능별 source-flow/심사 결과는
변경하지 않았고 재실행 18/18 및 커버리지 986/986에서 기존 결속을 확인했다.
별도로 시도한 `verify-feature-implementation-evidence` 전체 음성 반례 검사는
약 10분 무출력·약 1.3GiB RSS 후 이번 작업의 정확한 PID에 TERM을 보내
exit143으로 종료했다. 이 검사를 PASS로 기록하지 않으며 B09의 계획된 필수 명령에도
포함하지 않는다. 동일 검사의 재실행은 하지 않았다.

현재 media/RTSP/WebRTC source·schema 직접 변경은 없다. B08의 같은 소스에서
요청 증명 집중 52/52, 관련 원장·Catalog·공개 timeline/media 회귀 342개,
두 기동의 실제 영상·HTTP·파일 hash를 포함한 현행 5단계 158개를 확인했다.
기존 HW-03 codec 67개·ICE 8개는 해당 media 경로 불변 범위에서 이전 직접
증거로 유지한다. 이를 이번에 새로 실행한 결과나 실제 브라우저 재생으로
표현하지 않는다. 소스 기준 HEAD는 `b7156fd46549000afd6b9e1d82d7164ecf2f98a5`이며
이후 변경은 문서와 구현 증적 manifest의 문서 해시뿐이다. 빌드된 서버 SHA256은
`6c2149d468bb7f86cb29f1d683eec6cb21c7f2b383e0c4619fe4f35db2a6aabc`다.
제품 source digest는 catalog `c16359679e044304d31c3e71d8c1de689367047175a3c51c576ad6dc1c94f79b`,
journal `c0253f469766a682d260ed83457852cfb36724efb6915529f34131a2f60aac78`이다.

## 기존 증거 영향과 미실행

| 증거 | 현재 판정 | 이유·후속 조건 |
| --- | --- | --- |
| B08 집중·실제 앱 | 유지 | 위 소스에 대해 621개 회수·52개 요청 증명·342개 영향 회귀·5단계158개 직접 실행. 이후 제품 변경 없음 |
| HW-03 codec67·ICE8 | 해당 경계 한정 유지 | RTSP/WebRTC decoder·codec·ICE 경로 직접 diff 없음. 이번 새 실행 아님 |
| 이전 기본 UI424·시각80 | 과거 결과 보존, 현행 전체 적격 미판정 | 저장 조회·녹화 UI·증거 수명 변경 영향과 exact case source를 대조한 뒤 유지/부분 재검증 판단. 이번 실제 UI 실행 없음 |
| 이전 30분 | 과거 결과 보존, 현행 승계 미판정 | runtime 저장·복구 경계 변경. 최종 코드의 30분은 별도 승인·실행 필요 |
| 이전 공통120분 | 과거 결과 보존, 현행 승계 미판정 | 공통 source lifecycle과 storage Open 영향 대조 필요. 이번 실행 없음 |
| 녹화 전용120분 | 이전 FAIL 보존, 최종 PASS 없음 | 저장 보존·삭제·복구 직접 변경으로 현행120분이 release 전 필요하나 별도 실행 승인 대상 |
| 외부 서비스·실기기 | 제외 | 사용자 명시 제외, PASS 아님 |
| PR·병합·서명 태그·Release | 미실행 | 개발 브랜치 push와 별도의 명시 승인 필요 |

개별 원출력은 표의 로그에 보존한다. project inventory의 5,087줄 원출력은
압축 전후 바이트 대조했으며, 기능 ID 986개를 실제 제품 테스트 PASS로
승격하지 않는다. token start/end/consumed는 전용 집계 부재로 미집계,
source는 각 로컬 명령 원출력이다. 문서 변경 뒤 링크14,414개·오류0,
버전18/18을 다시 확인했다. 이후 변경은 실행 결과 서술과 cleanup 표뿐이다.

## 정리와 현재 판정

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `media-server-auth-bootstrap.l8DyLK` | 첫 UDP 준비 실패의 작업 소유 격리 root | du 300KiB | UID/device/inode·FD·PID·포트 확인 후 전용 cleanup | 부재 확인 | 첫 실패 원출력·직접 stat/lsof/ps |
| 인증 재실행 3개 root | 격리 사용자·쿠키·서버 자료 | 각 로그의 1,932/1,968/13,660KiB | verifier 자체 정리 | 세 root 모두 absent=true | 인증3 로그 |
| GStreamer fixture 20개 root | 환경 검사 임시 자료 | 각 로그에 bytes 기록 | verifier 자체 정리 | 20개 removed=true | 환경 로그 |
| B08 실제 앱 두 기동 root | 소유 서버·녹화 자료 | 394,258,863B | 원출력 보존 후 verifier 자체 정리 | 서버2 exit0·포트4 closed·root absent | [B08 최종 원출력](../b08-actual-app-20260925/b08-current-integration-i02-fixed.log) |
| `/private/tmp/b08-*.log` 14개 | 이번 재검증 임시 원출력 | 개별 값 미계측 | 저장소 사본과 byte 비교 후 정확한 파일만 삭제 | 임시 14개 부재; 저장소 사본 보존 | B08 기록·직접 cmp |
| `/private/tmp/b09-*.log` 17개 | 이번 최종 단기 임시 원출력 | 개별 값 미계측 | 필요한 출력은 저장소로 이관·cmp/gzip 해제 대조; 중단된 추가 진단의 빈 로그 포함 | 임시 17개 부재; 필요한 원출력 보존 | 이 문서 링크·직접 cmp |
| 이번 실행이 만든 참조 없는 진단 JSON 16개 | snapshot·latency·process·state 중간 출력 | 합계 약 1.0MiB | 문서 참조 부재 확인 뒤 정확한 소유 파일만 삭제 | 16개 부재 | 실행 전후 Git 상태·참조 검색 |
| `latency-83e1…json` | 첫 실제 HTTP 지연의 최소 진단 | 8KiB | 비밀 패턴 검사 뒤 보존 | [원형 보존](../s11-preparation-mapping/latency-83e1acd8-5f57-416b-a27c-8da348ffb245.json) | [B08 원인 기록](../b08-actual-app-20260925/results.md) |

이 정리는 이번 작업 소유의 임시 자료만 대상으로 했고 시스템 패키지·운영
자료·과거 기록은 삭제하지 않았다. 30분/UI/120분은 이번 실행에서 미실행이다.
현재 소스의 B09-F01 **단기 gate는 통과**, S11 전체와 v4.1.0 릴리즈는
미완료다. 분할 커밋 전 staged diff·원격 상태를 마지막으로 확인한다.
