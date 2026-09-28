# B11-G03 녹화 120분 5차 실패와 관측기 누적 비용 보완

독자: v4.1.0 S11 녹화 장시간 검증·릴리즈 판정 담당자. 수명: v4.1.0 릴리즈까지.
정책 source-of-truth는 `AGENTS.md`이며, 이 문서는 5차 실행의 실패와 같은 범위의
관측기 보완 증거다. 집중 검사 통과를 녹화 120분 PASS로 승격하지 않는다.

## 실행 결과

명령은 `./server.sh verify-v410-recording-longrun --duration-minutes 120`이다.
exit 1, elapsed 6,374,818ms, 8,885 pass·1 fail이며 약 106분 15초에
`observer-native-timeout`으로 중단됐다. 표본 1,272의 drain은 2,972.172ms였고
표본 1,273은 3,002.592ms로 고정 3,000ms 상한을 2.592ms 넘었다. timeout을 늘리거나
검사를 제외하지 않았다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B11-G03 120분 5차 | 두 채널 상시녹화·순환 삭제·상태/자원 관측 | fail |
| 제품 상태 | 실패 직전 mutation25,354, 두 채널 합계 finalized6,340·deleted6,336, HTTP200·2ms | pass |
| 저장 상한 | failure-live 424,124,908B, 종료 뒤 400,595,842B, 448MiB 미만 | pass |
| 종료·정리 경계 | 서버 exit0·강제 종료 없음·HTTP/RTSP 포트 폐쇄·UDP 폐쇄·post-stop SQLite page5,755 | pass |
| 자원 관측 | 최대 RSS712,179,712B, warmup 뒤 3.7856MiB/min, FD -6·thread 0 | pass |
| 관측기 고정 상한 | persistent native 응답이 3,002.592ms로 3초 초과 | fail |

[압축 원출력](b11-recording-120-attempt5.log.gz)은 5차 실패·종료·자원 결과를 보존하며
SHA-256은 `caac99db0a9e9205cfaecde71944e8bdf641235180d306419a90aa78b0c01d3c`다.
제품 private log에는 `ERROR`·`WARNING`·`storageBlocked`가 없었다. token
start/end/consumed는 전용 집계가 없어 미집계다.

## 원인과 보완 경계

종료 저장소의 snapshot은 약11.8MiB, identity shard는 76개·약11.4MiB였다.
기존 세션은 8MiB를 넘는 snapshot을 보관하지 못해 매 표본마다 snapshot 전체 파싱,
identity chain 검증, 누적 prefix 직렬화·비교를 반복했다. 따라서 실패는 제품 HTTP나
저장 상한이 아니라 검증 전용 관측기의 누적 재처리 비용이다.

보완은 다음 범위로 제한했다.

- 완전 검증한 큰 snapshot은 원문 객체 대신 manifest·descriptor·inode/stat·identity head의
  작은 정확 증명을 세션에 보존한다.
- 응답 전후 snapshot의 inode·mode·link·size·mtime·ctime을 다시 확인한다. 교체·변조·root
  변경·pending transaction·manifest 변경은 기존처럼 fail-closed다.
- persistent 세션은 기존 prefix 전체 대신 시작·종단 SHA-256 증명과 최대128개 delta만
  반환한다. one-shot의 기존 전체 prefix 응답은 유지한다.
- JS 수신기는 delta 전체를 임시 검증한 뒤 ID·prefix·byte budget을 한 번에 반영한다.
  잘못된 종단 증명은 부분 상태를 남기지 않는다.
- live 파일의 unlink 직후 macOS가 `nlink=0`을 반환하면 항목을 허용하거나 누락하지 않고
  root 측정 전체를 다시 시작한다. `nlink>1` hardlink와 특수 파일은 계속 거부한다.

공개 API·제품 녹화 format·시간/ID·보존/복구 정책·3초 관측 상한은 변경하지 않았다.

## 집중 검증

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 세대 관측 계약 | `--generation-self-test`, 36/36 | pass |
| 소규모 관측·복구 | `--self-test`, 67/67 | pass |
| 큰 metadata drain | `--metadata-self-test`, 5/5·4,452 mutation | pass |
| metadata warm 응답 | 43.852~45.003ms, one-shot720.039ms, snapshot hit40/miss1 | pass |
| 5차 종료 저장소 cold reconnect | seen25,354→42행, 2,887.136ms | pass |
| 5차 종료 저장소 warm complete | seen25,396→0행, 1,287.417ms | pass |
| live unlink 반례 | root 저장 자체검사 11/11, nlink0 전체 재시작·hardlink 거부 | pass |
| 실제 앱 최초 재검증 | live 삭제 교차를 `root-unsafe-file`로 잘못 분류, 서버 exit0·포트 폐쇄 | fail |
| 실제 앱 보완 재검증 | 동일 명령 exit0·74/74·실제30.199초·서버3회 종료·root 정리 | pass |

원출력은 [세대36개](b11-observer-generation-final.log.gz),
[소규모67개](b11-observer-self-final.log.gz),
[metadata5개](b11-observer-metadata-final.log.gz),
[실제 앱 최초 실패](b11-observer-app-attempt1.log.gz),
[실제 앱 최종 통과](b11-observer-app-attempt2.log.gz),
[5차 저장소 비용](public-evidence-ed394a4b90675f0c.txt)에 보존한다. 실제 앱 최종 실행의 O28
snapshot receipt 3개도 중앙 O28 artifact 디렉터리에 보존한다.

## 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 5차 실패 소유 root | 입력·녹화·관측 실행물 | 약406MiB | 파일 사용 프로세스 부재와 증거 이관 뒤 삭제 | 부재 | exit0·포트 폐쇄·`lsof +D` 출력 없음 |
| 최초 환경 실패 소유 root | fixture 준비 실행물 | 약9.8MiB | 실패 로그 이관 뒤 삭제 | 부재 | 서버 미기동·`lsof +D` 출력 없음 |
| 실제 앱 nlink 실패 소유 root | 입력·녹화·관측 실행물 | 약276MiB | 실패 로그 이관·서버 exit0·사용 프로세스 부재 뒤 삭제 | 부재 | 포트 폐쇄·`lsof +D` 출력 없음 |
| 실제 앱 최종 통과 root | 입력·녹화·관측 실행물 | 257,158,113B | wrapper 정상 정리 | 부재 | `absent=true` |
| O28 snapshot receipt 3개 | 비민감 복구 receipt | 각 약8~9KiB | 저장소 보존 | 보존 | 원본/manifest 불변·raw path/body 비공개 |

집중 결과는 120분 재실행 조건을 충족하지만 120분 완료 증거가 아니다. 다음 단계는 같은
코드·같은 3초/4초/448MiB/1GiB 기준으로 녹화 전용 120분을 처음부터 한 번 실행하는 것이다.
