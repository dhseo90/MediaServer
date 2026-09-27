# B11-G03 녹화 120분 10차 최종 판정

독자: v4.1.0 S11 녹화 장시간 검증·릴리즈 판정 담당자. 수명: v4.1.0 릴리즈까지.
정책 source-of-truth는 `AGENTS.md`이며, 이 문서는 10차 전체 실행과 자원 수동 판정,
종료·복구·정리 결과를 보존한다. 이 결과를 120분보다 긴 무기한 운용의 누수 부재로
확대하지 않는다.

## 실행 결과

명령은 `./server.sh verify-v410-recording-longrun --duration-minutes 120`이다.
exit 0, 전체 elapsed 7,273,913ms, 실제 장시간 관측 7,200,546.871ms,
10,093 pass·0 fail이다. 두 채널은 각각 3,590개를 확정하고 3,588개를 순환
삭제했으며, 합계 7,180개가 최종 관측됐다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B11-G03 120분 10차 | 두 채널 상시녹화·순환 삭제·상태/자원 관측 | pass |
| 상태 API | HTTP 200, 최대 1,017ms로 고정 4초 이내 | pass |
| 관측 drain | 최대 1,614.976ms로 고정 3초 이내 | pass |
| 저장 상한 | final-live/post-stop 413,002,799B로 448MiB 미만, partial 0 | pass |
| 녹화 진행 | 채널별 finalized 3,590·deleted 3,588, 합계 records 7,180 | pass |
| 종료·복구 | 주 PID와 복구 PID 2개 모두 exit 0, 원본 journal/manifest 불변·복구 복제본 정리 | pass |
| 포트·정리 | HTTP/RTSP·UDP 폐쇄, 실행 root 413,002,799B 제거·부재 | pass |
| 자원 상한 | 1,440표본, 최대 RSS 794,443,776B로 1GiB 미만 | pass |
| 자원 핸들 | 전체 thread -3·FD -8, 워밍업 뒤 thread 0·FD +2 | pass |
| 자원 추세 원자료 | 워밍업 뒤 RSS +174,063,616B/6,899,496.607ms, 1.4436MiB/분 | pass |

[압축 원출력](b11-recording-120-attempt10.log.gz)의 SHA-256은
`d2b4154026187bac5c735061e7b6b1945635f319808fd5d94e0a44998ab07d69`다.
token start/end/consumed는 전용 집계가 없어 미집계다. 원출력에서 인증 헤더·쿠키·
비밀번호·source URL 패턴은 발견되지 않았다.

## 자원 수동 판정

`recording_longrun_summary.mjs`는 자원 수치를 자동 합격시키지 않도록
`resourceTrendPass=false`, `reviewRequired=true`를 고정한다. 이는 명령 실패가 아니라
메인 판정 경계다. 직접 계약인 프로세스 1GiB, 소유 root 448MiB, drain 3초, 상태 HTTP
4초를 모두 지켰고 FD/thread 누적 증가가 없으며 정상 종료·복구·정리를 확인했으므로
v4.1.0의 녹화 120분 자원 gate는 PASS로 판정한다.

워밍업 뒤 RSS 기울기는 0이 아니므로 원자료를 그대로 남긴다. 체크포인트의
8,192행/64MiB 입장 상한은 전체 RSS 상한이 아니며 이 판정의 근거로 확대하지 않는다.
이번 결과는 120분·해당 입력·macOS 실행 범위의 상한 준수 증거이고, 무기한 운용에서
RSS가 증가하지 않는다는 주장이나 외부 실기기 증거가 아니다.

## 9차 실패 경계 재검증

9차는 표본 1,299의 generation 76→77 전환에서 immutable identity chain을 전수
재검증해 drain 3,002.468ms로 실패했다. 10차는 표본 1,440과 generation rotation
85개를 끝까지 관측했고, 해당 경계를 지난 뒤 최대 drain도 1,614.976ms였다.
증분 검증 조건을 입증하지 못하면 기존 전체 검증으로 복귀하는 fail-closed 계약과
공개 API·영속 schema/바이트·시간/ID·보존/복구 기준은 그대로다.

## 정리 상태

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 10차 소유 root | 입력·녹화·관측 실행물 | 413,002,799B | 종료 snapshot·복구 확인 뒤 wrapper 제거 | 부재 | summary cleanup `absent=true` |
| 복구 복제본 3개 | 종료·재기동 snapshot | 280,925,316B·280,925,316B·274,751,710B | 원본 불변·복구 확인 뒤 제거 | 부재 | copy-cleanup 3건 `absent=true` |
| snapshot receipt 3개 | 비민감 복구·정리 영수증 | 66,613B·66,613B·66,957B | 중앙 진단 artifact에 보존 | 보존 | raw path·URL·credential 패턴 0 |
| 원출력 | 10차 전체 로그 | 압축 전 약 5.6MiB | gzip 이관 | 저장소에 약 329KiB 보존 | 위 SHA-256·`gzip -t` |

복구 영수증은 기존 중앙 진단 경로의
[`0294ad58`](../lp26-o10-accumulation-20260923/o28-current-snapshot-0294ad58-7c75-489c-9a55-41f79ab2fd17.json),
[`c5f6d9a6`](../lp26-o10-accumulation-20260923/o28-current-snapshot-c5f6d9a6-8a19-4c86-88f6-dfb1f4c47920.json),
[`cdaef98f`](../lp26-o10-accumulation-20260923/o28-current-snapshot-cdaef98f-3c59-4eea-b0fe-066ec884a7f1.json)이다.
