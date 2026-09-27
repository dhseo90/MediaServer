# B11-G03 녹화 전용 120분 3차 live root 측정 실패

독자: v4.1.0 녹화·릴리즈 검증 담당자. 수명: 실패·원인·재개 경계를 보존한다.
정책 source-of-truth는 `AGENTS.md`다. 이 기록은 120분 PASS가 아니다.

## 실행 결과

- 명령: `./server.sh verify-v410-recording-longrun --duration-minutes 120`
- source: `59815c3b`
- 결과: exit 1, 1,341,304ms, 1,859 pass·1 fail, 약 22분 21초에서 중단
- 마지막 완료 표본: 267. finalized 1,320·deleted 1,316, drain 503ms,
  HTTP 2ms, root 347,351,557B/448MiB
- 실패 표본: 268. metrics 2ms와 drain 489ms는 완료됐으나 `root-storage`와
  `current-observation`을 출력하기 전 비정형 오류가 발생했다.
- 종료: 서버 exit0, 강제 종료 없음, HTTP·RTSP 포트와 UDP 해제. 서버
  ERROR/WARNING·`storageBlocked` 없음.

실패 직후 별도 최종 측정은 347,945,279B/448MiB로 상한 미달이었다. 268번째 표본의
`storageMs=1.558`과 `root-storage` 부재를 실행 순서와 대조하면 실패 범위는
`measureCurrentRoot` 내부다. 이 함수는 live 디렉터리를 비원자적으로 순회하면서 SQLite
rollback journal 한 종류의 ENOENT만 허용했다. 영상 partial/final rename·삭제 또는 세대
파일 회전이 `readdir`와 `lstat` 사이에 일어나면 원시 파일시스템 오류가 상위에서
`redacted-error`로 축약되는 구조였다.

종료 저장소를 새 observer로 읽은 독립 재생은 42 poll·5,300 mutation·원본1,328·
삭제1,322개를 정확히 처리했다. `seen=1320`의 one-shot도 1.137초·exit0이었다. 따라서
보존 저장소 손상, 압축 active 판독 실패, root 상한, HTTP 지연은 이번 직접 원인이 아니다.

## 보완 계약

파일 하나를 누락해 집계하지 않는다. ENOENT가 발생하면 전체 root 측정을 최대 3회
처음부터 다시 시작하고, 세 번 모두 실패하면 `root-snapshot-retry-exhausted`로 FAIL한다.
EACCES·unsafe link/hardlink·형식 오류는 즉시 기존처럼 실패한다. 448MiB cap, HTTP 4초,
관측 15초, 제품 저장·보존·API 계약은 바꾸지 않는다.

원출력 gzip SHA-256은
`bc5cb4574627a679ac7c0ba676436a3fc393bb3ad424e9510e6294f461be5608`이다.
token start/end/consumed는 전용 집계가 없어 미집계다.

## 보완 확인과 정리

root 저장 단위 반례는 10/10, 실제 앱 단기는 73/73으로 통과했다. 실제 앱에서는 두 채널
녹화·삭제·비활성 재기동·재활성 녹화, stopped-copy 복구 3회, 서버 exit0·포트/UDP 해제와
실행 root 정리를 확인했다. 최종 root는 290,408,558B로 상한 미달이었고 제품 경로에는
새 오류가 없었다. 상세 요약은 [focused 결과](b11-root-stable-focused.log)를 따른다.

실패 원출력과 독립 재생 결과를 이 문서·gzip에 이관한 뒤 소유권을 확인한 실패 root
347,945,279B, wrapper 임시 디렉터리와 진단 출력 2개를 삭제하고 부재를 확인했다.
focused PASS는 120분 전체 PASS를 대체하지 않으며, 동일 120분은 처음부터 다시 실행한다.
