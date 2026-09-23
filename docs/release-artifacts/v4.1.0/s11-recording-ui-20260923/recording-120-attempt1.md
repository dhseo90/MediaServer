# S11 녹화 전용 120분 1차 실패·진단

독자: v4.1.0 녹화·릴리즈 검증자. 수명: 실패 이력 보존. 정책 source-of-truth는 `AGENTS.md`이며, 이 파일은 최초 실패를 후속 재검증으로 덮어쓰지 않는다.

실행 명령은 `./server.sh verify-v410-recording-longrun --duration-minutes 120`이다. 같은 명령의 최초 약 115초 실행은 원출력 영속 캡처 미설정 확인 후 운영자가 SIGINT로 중단했고, `observation-cancelled`·서버 정상 종료·포트 해제·격리 root 삭제를 확인했다. 이는 120분 판정이 아니다. 아래 1차 정식 실행은 파일 권한 0600·상위 디렉터리 0700의 원출력 캡처를 붙인 동일 기준이다. timeout·상한·제품 코드는 변경하지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 녹화 전용 120분 1차 | 두 채널 실제 상시녹화·순환 삭제·재기동 복구·자원 관측 | fail | exit 1, `observation-root-cap`, 실제 2,258.793초(37분 38초), verifiedDuration 없음, 3,123 pass·1 fail |
| 실패 전 두 채널 진행 | 현행 catalog 관측·세그먼트 확정/삭제·상태 조회 | pass | 최종 샘플에 채널당 finalized 1,123·deleted 1,121, 저장 매체 삭제 확인. 이 항목은 전체 120분 PASS가 아님 |
| 서버·포트 정리 | 종료 시 PID 26665 정상 exit 0, HTTP 56147·RTSP 56148 포트 해제 | pass | 강제 종료 없음, process-cleanup `archiveSafe=true`, UDP 종료 |
| 격리 root 정리 | `media-server-current-observer-d1Qq4n` | pass | 정리 직전 426,873,756 bytes, 스크립트 자체 삭제·`absent=true`; 비밀 원문 서버 로그는 root와 함께 삭제 |

[원출력](recording-120-attempt1.log)은 3,567행·524,331바이트이며 SHA256 `5f7c627dd3a3c1fe5b54c476bda2588fff03b6f1e4e15ba00809fe4a2641add8`이다. 비밀번호·인증/세션·RTSP URL·HTTP URL 표식 검색 결과는 없었다. 복제본과 격리 원본의 SHA가 같고 원본 임시 디렉터리는 정리했다. 원출력의 `resourceTrendPass=false`, `reviewRequired=true`, `longrunObservationCompleted=false`를 그대로 따른다. token start/end/consumed는 전용 계측이 없어 미집계다.

진단 중 읽기 전용 `du`로 확인한 중간값은 약 20분 root 374MiB·recordings 247MiB, 약 30분 root 408MiB·recordings 280MiB, 약 35분 root 407MiB였다. 35분의 recordings 분해는 두 채널 영상 디렉터리 약 79+80MiB, SQLite 본파일 약 57MiB, WAL 약 3MiB, V2 journal 약 80MiB였다. 원본 fixture 디렉터리는 약 119MiB다. 이 수치는 실패 순간의 원자적 snapshot이 아니며 저장·삭제에 따른 변동이 있다. 20분 RSS 약 309MiB → 36분 약 339MiB로 증가했으나, 이 실행만으로 allocator 캐시와 catalog resident의 비중은 확정하지 않는다.

검증기의 root 448MiB 안전 상한과 두 채널 각각 128MiB media quota, fixture 약 119MiB의 관계를 제품 메타데이터 증가와 분리해야 한다. 현재 product의 영상 quota는 media 후보 용량 기준이며 journal·SQLite 전체의 상한을 증명하지 않는다. 따라서 상한 증액·fixture 축소만으로 120분 PASS를 만드는 변경은 하지 않는다. 저장 계약·ID 중복 거부·tombstone·복구/SQLite fallback을 유지하는 해결 범위를 먼저 확정하고 동일 반례를 재검증해야 한다. 미실행 후속 재기동·120분 자원 판정·UI 전체 적격은 PASS가 아니다.
