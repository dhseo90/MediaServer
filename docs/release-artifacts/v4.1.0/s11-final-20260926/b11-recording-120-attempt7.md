# B11-G03 녹화 120분 7차 세그먼트 게시 오판

독자: v4.1.0 S11 녹화 장시간 검증·릴리즈 판정 담당자. 수명: v4.1.0 릴리즈까지.
정책 source-of-truth는 `AGENTS.md`이며, 이 문서는 7차 실행의 실패·원인·재개 경계를
보존한다. 집중 검사를 녹화 120분 PASS로 승격하지 않는다.

## 실행 결과

명령은 `./server.sh verify-v410-recording-longrun --duration-minutes 120`이다.
exit 1, elapsed 1,046,949ms, 1,453 pass·1 fail이며 약 17분 27초에
`root-unsafe-file`로 중단됐다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B11-G03 120분 7차 | 두 채널 상시녹화·순환 삭제·상태/자원 관측 | fail |
| 제품 진행 | reservation1,038·bound final1,036·deleted1,032, 마지막 HTTP200·1ms | pass |
| 저장 상한 | failure-live 316,933,359B, 종료 뒤 292,554,660B, 448MiB 미만 | pass |
| 종료·정리 경계 | 서버 exit0·강제 종료 없음·HTTP/RTSP 포트 폐쇄·UDP 폐쇄 | pass |
| 자원 관측 | 최대 RSS479,854,592B, warmup 뒤 2.284MiB/min, FD -6·thread 0 | pass |
| live root 안전 판정 | 정상 세그먼트 partial→final 무교체 게시의 링크 수2를 영구 hardlink로 오판 | fail |

[압축 원출력](b11-recording-120-attempt7.log.gz)은 7차 실패·종료·자원 결과를 보존하며
SHA-256은 `23d9ff7351dcf63f0c653cf4d6d51ac26272367d07843fc0b7774bc5c7701bea`다.
압축 전 원출력은 851,904B, SHA-256
`391521454423a76d8281a388803e5a703a6c2aa90797b33621dcfe8f5a160166`이다.
제품 private log의 `ERROR`·`WARNING`·`storageBlocked`는 0이다. token
start/end/consumed는 전용 집계가 없어 미집계다.

## 확정 원인과 보완 경계

실패 직전 표본 209는 관측 약364ms이고 바로 앞 상태 요청은 HTTP200·1ms였다. 최초 실패
뒤 측정한 failure-live에는 media 5개와 partial 1개가 있었고, 종료 뒤에는 media 6개와
partial 0개였다. 세대 transaction은 두 측정 모두 0개였으므로 6차 세대 회전과 다른
경로다. 종료 저장소의 recordings 아래 symlink·특수 파일·다중 링크는 없었다.

제품 `FinalizeRecordingFile`은 검증한 partial을 같은 디렉터리의 final 이름으로
`linkat`하여 no-replace 게시하고, 디렉터리 fsync 뒤 partial을 unlink한다. 따라서 게시
중에는 같은 inode를 가진 정확한 `final`과 `final.partial.<UUID>` 두 링크가 잠시 존재한다.
관측기는 이 정상 상태도 즉시 영구 hardlink 손상으로 분류했다.

보완은 같은 디렉터리·규격화된 이름·같은 device/inode·링크 수 1 또는 2로 입증되는
MP4/WebM 게시 쌍에만 제한한다. 부분 합산하지 않고 root 측정 전체를 다시 시작한다.
규격 밖 hardlink, 다른 inode, symlink·특수 파일과 최대32회 뒤에도 남는 게시 쌍은 계속
거부한다. 제품 저장 형식·공개 API·시간/ID·보존/복구 정책·3초/4초/448MiB 기준은
바꾸지 않았다.

## 예상 RED와 집중 검증

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 예상 RED | 실제 final/partial 이름과 inode의 두 링크 반례가 기존 `root-unsafe-file`로 실패 | fail |
| root 안전 계약 | 게시 완료 재측정·지속 게시 거부·일반 hardlink/symlink·ENOENT 포함 13/13 | pass |
| 세대 관측 계약 | `--generation-self-test`, 36/36 | pass |
| 소규모 관측·복구 | `--self-test`, 67/67 | pass |
| 실제 앱 최초 준비 | 샌드박스 macOS 서비스 대기에서 fixture 30초 timeout, 서버 기동 0 | fail |
| 실제 앱 집중 검증 | 동일 상한의 권한 적용 실행, exit0·73/73·실제30.171초 | pass |
| 실제 앱 수명·정리 | 두 채널 finalized28·deleted24, 서버3회 정상 종료·복구·포트/UDP 폐쇄·root 제거 | pass |

[실제 앱 압축 원출력](b11-media-publication-app.log.gz)은 61,311B 원출력의 실행이며
SHA-256은 `4e5e82b66e6ec785dc4d9f539658ee661b8bfbca64f7ea25dcd184b2c595a8ed`다.
[샌드박스 준비 실패](b11-media-publication-sandbox-fail.log.gz)의 SHA-256은
`4452258b9d883dbda55e46883c025c2236e6e9f52170a7a0a83e565408d5c3ff`다.
새 O28 복구 receipt 3개의 SHA-256은
`7023d1df2e78023d6c77f9a6d6ace39fa51a4c9f1b66bc2011d0d76921abef6e`,
`83ef2177da4c71d679a99ae13ea0c5dd1cb8da45b0adaf45f1baaee7dfd4fd56`,
`dfe245af3e345825a5779c7d14a17d3292da60bed5a8ab21818df2c062c74689`다.

## 정리 상태

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 7차 실패 소유 root | 입력·녹화·관측 실행물 | 288,156KiB | 원출력·원인 증거 이관 뒤 제거 | 부재 | 서버 exit0·포트/UDP 폐쇄·`lsof +D` 출력 없음·삭제 뒤 부재 확인 |
| 실제 앱 최초 준비 root | fixture 준비 실패 실행물 | 10,024KiB | 실패 원출력 이관 뒤 제거 | 부재 | 서버 기동0·소유 프로세스0·삭제 뒤 부재 확인 |
| 실제 앱 성공 root | 녹화·복구 실행물 | 292,486,951B | wrapper 정리 | 부재 | 실행 summary의 cleanup absent=true |
| 7차·집중 원출력 | 장시간/집중 원출력 | 918,754B 합계 | gzip 이관 | 60,574B 보존 | 위 SHA-256 |

집중 결과는 재실행 조건만 충족한다. 같은 기준으로 녹화120분 전체가 통과하기 전에는
S11 최종 local gate나 릴리즈 완료 evidence로 사용할 수 없다.
