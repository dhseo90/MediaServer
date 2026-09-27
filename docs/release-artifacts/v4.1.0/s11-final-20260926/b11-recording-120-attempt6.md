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

## 보완과 집중 검증

관리 세대 범주는 snapshot·identity·evidence·manifest·transaction으로 고정했다. 관측된
링크 수가 정확히 2일 때 같은 파일을 다시 확인하고, 링크가 1로 해소됐거나 링크 수 1의
활성 transaction receipt가 있을 때만 `root-generation-transition`으로 전체 root 측정을
다시 시작한다. 일반 경로 hardlink, 링크 수 2 초과, symlink·특수 파일은 기존처럼 즉시
거부한다. transaction이 계속 남으면 최대32회 뒤
`root-generation-transition-retry-exhausted`로 실패한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 예상 RED | 활성 transaction의 관리 snapshot 두 링크 반례가 기존 `root-unsafe-file`로 실패 | fail |
| root 안전 계약 | 새 반례·일반 hardlink/symlink·지속 transaction·ENOENT 포함 12/12 | pass |
| 세대 관측 계약 | `--generation-self-test`, 36/36 | pass |
| 소규모 관측·복구 | `--self-test`, 67/67 | pass |
| 실제 앱 집중 검증 | `--app-observe`, exit0·73/73·실제30.188초 | pass |
| 실제 앱 수명·정리 | 서버3회 정상 종료·복구 receipt3개·포트/UDP 폐쇄·289,373,785B root 제거 | pass |

[실제 앱 압축 원출력](b11-generation-transition-app.log.gz)의 SHA-256은
`5061c6af7cb903d120a3587518d0a12a8461598dfda0e89fc1ea174a1d7abf68`이다.
새 O28 receipt 3개의 SHA-256은
`64a61546159ce0867f8cdbf33a763e21b752a6634aba4b69fcb57f57f9ce721e`,
`4e255e075519128efb51ab23fe5ce3a4ce5a6a44b1029044f03884c159029151`,
`a5b56ce585c5c049d85a36a8376f0dd272df6c61c4031924809cdb32994b5f83`다.
집중 결과와 임시 root 정리는 통과했지만 녹화 120분 전체 PASS는 아직 아니다.
