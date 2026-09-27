# B11-G03 녹화 전용 120분 4차 검증기 간섭 실패

독자: v4.1.0 녹화·릴리즈 검증 담당자. 수명: 실패·원인·보완·재개 경계를 보존한다.
정책 source-of-truth는 `AGENTS.md`다. 이 기록은 120분 PASS가 아니다.

## 실행 결과

- 명령: `./server.sh verify-v410-recording-longrun --duration-minutes 120`
- source: `deb329c6`
- 결과: exit 1, 869,813ms, 1,201 pass·1 fail. 약 14분 30초에서 중단
- 마지막 정상 상태: 두 채널 각각 finalized 427·deleted 425, 원장 mutation 3,410,
  세대 회전 10회, root 308,094,395B/448MiB
- 실패: 표본 174 직후 `GET /ops/api/recordings/status`가 1ms 만에 HTTP 503을 반환
- 종료: 서버 exit 0, 강제 종료 없음, HTTP·RTSP 포트와 UDP 해제

실패 직전까지 상태 API는 200이었고 저장 root도 상한을 넘지 않았다. 실패 저장소에는
동일 영상의 `.finalize-ready`와 `.cleanup-pending`이 함께 남았으며 서버 로그는
`finalize recovery pending; writer admission blocked until restart`와
`input rejected reason=durable-order-reservation`을 기록했다. 종료 저장소의 read-only
복제본은 native snapshot 복구를 통과했고 segment 855, deleted 850, available 5,
digest `d5e274f…`를 반환했다. 따라서 영속 자료 손상이나 용량 상한이 직접 원인은 아니다.

## 원인과 보완 계약

검증기는 모든 live 표본에서 별도 `sqlite3 -readonly` 프로세스로
`PRAGMA page_size/page_count/freelist_count`를 실행했다. 같은 시점에 제품 writer는 rollback
mode SQLite의 `BEGIN IMMEDIATE` 전이를 수행한다. 4차 실패는 live PRAGMA가 끝난 바로 다음
writer 확정에서 발생했고, 제품 DB에는 별도 busy 대기 정책이 없다. 이 외부 reader가
제품 커밋과 충돌하면 writer가 세대 owner를 fail-closed로 전환하고 위 503까지 이어질 수
있는 구조가 확인됐다.

제품 저장·보존·API·timeout을 바꾸지 않는다. live 표본은 논리 파일 크기만 측정하고,
SQLite page 통계는 모든 제품 프로세스가 정상 종료된 뒤 `post-stop`에서 한 번 측정한다.
종료 후 측정 실패도 그대로 FAIL한다. 448MiB cap, HTTP 4초, 관측 15초와 기존 손상 거부는
유지한다.

## 집중 검증과 한계

root 저장 계약 11/11, 실제 앱 단기 73/73이 통과했다. 실제 앱은 두 채널 녹화·삭제,
비활성 재기동·재활성 녹화, stopped-copy 복구, 정상 종료·포트/UDP 해제와 실행 root 정리를
확인했다. live `root-storage`에는 SQLite page 통계가 없고, 모든 서버 종료 뒤
`post-stop`에만 pageSize 4,096·pageCount 59·livePageCount 59가 기록됐다.

원출력 gzip SHA-256은
`56053726bd6a65e4d1fd30c7107e90cac9456ed18ebe7430209d8f318b536560`이다.
token start/end/consumed는 전용 집계가 없어 미집계다. 집중 PASS는 120분 전체 PASS를
대체하지 않는다. 이전 실패 규모 854개 원본을 넘는 누적 진단을 먼저 통과한 뒤 동일
120분을 처음부터 다시 실행한다.
