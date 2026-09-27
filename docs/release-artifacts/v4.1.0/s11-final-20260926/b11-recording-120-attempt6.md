# B11-G03 녹화 120분 6차 세대 회전 오판

독자: v4.1.0 S11 녹화 장시간 검증·릴리즈 판정 담당자. 수명: v4.1.0 릴리즈까지.
정책 source-of-truth는 `AGENTS.md`이며, 이 문서는 6차 실행의 실패와 재개 경계를
보존한다. 제품 진행 결과나 집중 검사를 녹화 120분 PASS로 승격하지 않는다.

## 실행 결과

명령은 `./server.sh verify-v410-recording-longrun --duration-minutes 120`이다.
exit 1, elapsed 3,304,162ms, 4,597 pass·1 fail이며 약 55분 4초에
`root-unsafe-file`로 중단됐다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B11-G03 120분 6차 | 두 채널 상시녹화·순환 삭제·상태/자원 관측 | fail |
| 제품 진행 | 합계 finalized3,278·deleted3,274, HTTP200·1ms, 저장 차단 없음 | pass |
| 저장 상한 | failure-live 365,923,300B, 종료 뒤 320,001,005B, 448MiB 미만 | pass |
| 종료·정리 경계 | 서버 exit0·강제 종료 없음·HTTP/RTSP 포트 폐쇄·UDP 폐쇄 | pass |
| 자원 관측 | 최대 RSS579,436,544B, warmup 뒤 1.3563MiB/min, FD -6·thread 0 | pass |
| live root 안전 판정 | 정상 세대 transaction 중 잠시 생긴 링크 수 2를 영구 hardlink로 오판 | fail |

[압축 원출력](b11-recording-120-attempt6.log.gz)은 6차 실패·종료·자원 결과를 보존하며
SHA-256은 `c429ffe1945460d198d8db2fbd17353ee46a1605adbd818990cd4ee45e0d3ea0`다.
압축 전 원출력은 2,664,711B, SHA-256
`2e40cd2fa1d66eadea04a8d711c5d0d79841a47cba7eaeb05f00ba360aac9623`이다.
제품 private log의 `ERROR`·`WARNING`·`storageBlocked`는 0이다. token
start/end/consumed는 전용 집계가 없어 미집계다.

## 확정 원인과 보완 경계

실패 직전 표본 660은 관측 약1.089초, HTTP200이며 제품 동작은 정상이었다. 다음 root
순회가 실행되는 동안 세대 원자 commit이 진행돼 generation snapshot 2개와 transaction
파일 1개가 동시에 관측됐다. 제품의 `RecordingGenerationTransaction::Promote`는 생성한
component를 stage에서 root로 `linkat`하고 root를 fsync한 뒤 stage 링크를 제거하므로,
검증된 transaction 중 관리 파일의 링크 수 2는 짧게 존재하는 정상 상태다.

관측기는 `nlink=0`/ENOENT만 전체 재측정 대상으로 두고 모든 `nlink>1`을 즉시
`root-unsafe-file`로 처리했다. 종료 후 보존 root를 다시 검사했을 때 recordings 아래
symlink·특수 파일·다중 링크는 없었고 모든 세대 파일은 일반 파일·링크 수 1이었다.
따라서 영구 손상이나 외부 hardlink가 아니라 검증기와 원자 commit의 경쟁이다.

보완은 검증된 generation transaction 활성 구간의 관리 파일에만 제한한다. 해당 상태는
부분 합산하지 않고 root 측정 전체를 다시 시작한다. transaction 밖 hardlink, `tmp` 등
비관리 경로의 hardlink, symlink·특수 파일, 반복 뒤에도 남는 다중 링크는 계속 거부한다.
제품 저장 형식·공개 API·시간/ID·보존/복구 정책·3초/4초/448MiB 기준은 바꾸지 않는다.

## 정리 상태

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 6차 실패 소유 root | 입력·녹화·관측 실행물 | 317,172KiB | 원출력·원인 증거 이관 뒤 제거 | 부재 | 서버 exit0·포트/UDP 폐쇄·`lsof +D` 출력 없음·삭제 뒤 부재 확인 |
| 6차 원출력 | 장시간 원출력 | 2,664,711B | gzip 이관 | 152,622B 보존 | 위 SHA-256 |

보완 반례·집중 검증과 소유 root 정리가 통과한 뒤에만 120분 전체 재실행 조건이 성립한다.
