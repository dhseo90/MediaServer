# 녹화 장시간 저장량·입력 생성 진단

독자: v4.1.0 개발·검증 담당자. 수명: S11 녹화 전용 120분 실패 원인과 재검증 판정까지. 정책은 `AGENTS.md`, 실행 결과의 기준은 `docs/release-test-records.md`다. 이 문서는 짧은 진단 이력이며 120분 PASS가 아니다.

## 실행 범위와 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| LP26-O06-A | `node scripts/internal/recording_current_root_storage.test.mjs`의 범주 합계·상한·부분파일 판정 | pass | 기존 자체검사 5/5 중 2건. 실제 장시간 상한은 448MiB로 유지 |
| LP26-O06-B | 같은 명령의 경로 비노출·심볼릭 링크·하드 링크 거부 | pass | 자체검사 5/5 중 1건. 테스트 소유 root 부재 확인 |
| LP26-O06-C | 같은 명령의 기존 HTTP 4초·정기/실패 계측 연결 | pass | 기존 자체검사 5/5 중 2건. 장시간 실행 판정은 아님 |
| LP26-O07-A | `node scripts/internal/recording_current_fixture_generation.test.mjs`의 성공/오류·원문 비노출 | pass | exit 0, 기존 자체검사 7/7 중 6건. 임시 산출물 없음 |
| LP26-O07-B | `bash scripts/internal/verify_recording_current_observer.sh --app-observe`의 입력 생성 | pass | 격리 밖 실행에서 생성 1,355ms, 파일 62,334,405B, exit 0. 샌드박스 내부에서는 30초 ETIMEDOUT가 먼저 발생했고 제품 녹화 시작 전이었다. 실패 이력은 PASS로 바꾸지 않음 |
| LP26-O06-C 실제 앱 | 위 짧은 실제 앱 실행에서 두 채널 녹화·삭제·정지·재기동·재활성화 | pass | exit 0, 71/71, 총 46,587ms/관측 30,127ms. 채널당 확정 14·삭제 12. 서버 3개 정상 종료·HTTP/RTSP 포트 닫힘·복구 복제본 3개 및 소유 root 292,519,216B 삭제 후 부재 확인. 120분 및 자원 추세 PASS가 아님 |
| LP26-O06-C 구성별 표본 | 같은 짧은 실행의 7개 구성별 계측 | pass | 마지막 표본 root 325,503,715B: 입력 124,668,810B, 확정 매체 124,670,556B, 쓰기 중 매체 62,334,382B, journal 1,000,131B, SQLite 본파일 4,096B, WAL 3,708,032B. 측정은 비원자적 logical bytes이며 실패 당시 37분 구성으로 소급하지 않음 |
| LP26-O06-C 120분 | 녹화 전용 120분 최종 실행 | fail | 이전 1차 실행은 37분 38초에 `observation-root-cap`; 새 계측 코드를 넣은 120분 재실행은 미실행 |

## 저장량 계측 보완 후 단기 결과

실행 전에 중앙 기록과 기능 인벤토리에 LP26-O06-D를 등록했다. 등록 전에 실행한
초안 자체검사 결과는 최종 증거로 사용하지 않는다. 등록 후 원출력은
[LP26-O06 자체검사 로그](lp26-o06-storage-self-20260923.log)에 보존한다.
`node scripts/internal/recording_current_root_storage.test.mjs`는 exit 0,
6 pass·0 fail, 소유 임시 root 삭제·부재 확인이었다. 아래 여섯 행은 로그의
여섯 `[pass]`와 일대일 대응한다. 새 계측으로 실제 120분은 아직 실행하지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| LP26-O06-A/합계 | 제품 녹화·입력·도구·캐시 등 범주 합계와 경로 비노출 | pass | exit 0, 범주 합과 root logical byte 일치 |
| LP26-O06-A/부분 | 쓰기 중 영상·정리 표식의 범주 중복 방지 | pass | exit 0, 확정 영상과 구분 |
| LP26-O06-B/상한 | 448MiB 경계에서 안전 중단 판정 | pass | exit 0, inclusive 상한 유지 |
| LP26-O06-C/경로 | 안전 링크만 허용하고 심볼릭·하드 링크 반례 거부 | pass | exit 0, 소유 root 정리 |
| LP26-O06-D/SQLite | 읽기 전용 페이지 수와 사용·빈 바이트 검증, 읽기 실패 표기 | pass | exit 0, 모의 응답 단위검사이며 실제 SQLite 성공 관측은 미실행 |
| LP26-O06-C/연결 | 빠른 상한 검사와 정기·실패 계측 분리, HTTP 4초 유지 | pass | exit 0, 검증기 정적 연결 검사이며 실제 장시간 판정은 아님 |

실제 앱 실행의 71개 개별 `[pass]` 원출력은 대화 도구 결과로 확인했으나 저장소 파일로 이관되지 않았다. 따라서 이 짧은 실행은 원인 구분용 직접 관측이며 7.6.1의 최종 장시간 전수 증거로 사용하지 않는다. `token start/end/consumed`는 전용 집계가 없어 미집계다.

## 원인 경계

이전 120분의 약 35분 시점 읽기 전용 관측은 영상 디렉터리 약 159MiB, SQLite 약 57MiB·WAL 약 3MiB, V2 journal 약 80MiB, 입력 fixture 약 119MiB였다. 영상은 두 채널에서 oldest-first로 계속 삭제됐지만 journal·SQLite와 메모리 이력은 늘었다. 이 수치와 이번 짧은 계측은 **격리 root 합산 상한 도달**의 설명이며, 실패 순간의 정확한 범주별 바이트나 RSS 원인은 확정하지 못한다. 입력 생성의 macOS 샌드박스 서비스 연결 실패는 저장량 실패와 다른 선수조건 실패다.

다음 제품 결정은 `docs/superpowers/specs/2026-09-19-recording-catalog-cost-contract.md` 4~5절의 삭제 ID·중복·참조·복구 계약을 지켜야 한다. 상한 증액·fixture 축소·시간초과 확대로 120분을 통과시키지 않는다. 실패 상태의 뒤 단계 UI·최종 릴리즈는 보류한다.
