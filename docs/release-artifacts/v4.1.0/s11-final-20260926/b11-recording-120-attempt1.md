# B11-G03 녹화 전용 120분 1차 실패

독자: v4.1.0 녹화·릴리즈 검증 담당자. 수명: 최초 실패 이력 보존.
정책 source-of-truth는 `AGENTS.md`, 저장 계약은
`docs/superpowers/specs/2026-09-19-recording-catalog-cost-contract.md`다.
후속 수정·재검증으로 이 실패를 덮어쓰지 않는다.

## 실행과 판정

- 명령: `./server.sh verify-v410-recording-longrun --duration-minutes 120`
- source commit: `8da6955e`의 부모까지 포함한 실행 시점 HEAD `8da6955e`
- 제품 실행 파일 SHA-256: `8637eb2f73772d373d09fe3c97b7b50628a8605fbdd0f25f14c99e2eb77ef46e`
- 종료: exit 1, 3,114,137ms, 4,337 pass·1 fail, 요청 120분 미달
- 직접 실패: `observation-root-cap`. 최종 논리 파일 합계 470,588,788B가
  고정 상한 469,762,048B를 826,740B 초과했다.
- 서버 PID 94685는 exit 0으로 정상 종료됐고 HTTP 59020·RTSP 59021·UDP는 닫혔다.
  강제 종료, private log overflow, 서버 ERROR/WARNING, `storageBlocked`는 없었다.
- token start/end/consumed는 전용 집계가 없어 미집계다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B11-G03 녹화 120분 1차 | 두 채널 상시녹화·순환 삭제·상태/자원 관측 | fail | 약 51분 51초에 root 상한 초과. `verifiedDurationMs=null`, 전체 120분 PASS 아님 |
| 실패 전 제품 진행 | 실제 세그먼트 생성·삭제·HTTP·증분 관측 | pass | 채널별 finalized 1,547·deleted 1,545, mutation 12,370. 부분 성공을 suite PASS로 확대하지 않음 |
| 상태 응답·관측 지연 | 기존 HTTP 4초·관측 공백 15초 경계 | pass | 실패 직전 HTTP 2ms, 관측 drain 약 1.329초. 이번 직접 실패 원인이 아님 |
| 종료·포트 | 정상 종료·listener/UDP 해제 | pass | process cleanup `archiveSafe=true`, 강제 종료 없음 |

## 저장량 원인 분리

실패 순간은 비원자 live 측정이며 아래 소유자별 수치를 한 시점의 절대 quota로 확대하지 않는다.

| 소유자/종류 | 바이트 | 파일 | 판정 |
| --- | ---: | ---: | --- |
| 전체 실행 root | 470,588,788 | 560 | 고정 상한 초과 |
| 제품 녹화 root | 332,547,953 | 255 | media·원장·snapshot·identity·SQLite 포함 |
| 고정 입력 fixture | 124,668,810 | 2 | 제품 보존 삭제 대상이 아닌 검증 입력 |
| 영상 media | 121,554,698 | 4 | 채널별 128MiB quota 아래 순환 삭제 진행 |
| 작성 중 media partial | 62,336,174 | 2 | 실패 순간 작성 중인 두 파일 |
| 봉인 active 원장 | 125,602,008 | 119 | 세대별 최소 369,450B·최대 1,077,501B |
| identity shard | 5,640,205 | 119 | 최소 ID·순서·cold locator |
| 현재 snapshot | 5,781,697 | 1 | 삭제 영수증 기반 현재 projection |
| SQLite | 11,681,792 | 1 | live 11,669,504B·free 12,288B |

영상 순환 삭제와 상태 API 용량 집계는 동작했다. 증가분은 삭제된 영상의 논리 상세를
복구·충돌 거부용으로 보존하는 봉인 원장이 세대마다 누적된 데서 발생했다. 119개 원장을
그대로 gzip한 진단값은 17,583,847B였으므로 원문은 높은 압축 가능성이 있다. 이는 제품
형식을 gzip으로 교체한다는 뜻이 아니며, 이미 채택된 bounded zlib physical wrapper의
generation 쓰기 연결 여부를 판단하는 근거다.

상한을 늘리거나 고정 fixture를 집계에서 제외하는 것만으로 PASS를 만들지 않는다. 과거
archive·identity·삭제 영수증을 임의 삭제하지도 않는다. 논리 mutation·ID·순서·cold 재획득,
손상 거부·SQLite fallback을 유지하면서 물리 표현만 가역 압축하는 focused 반례를 먼저
통과해야 한다. 그 뒤 같은 120분 명령을 처음부터 다시 실행한다.

## 증거와 정리 경계

- 원출력: `b11-recording-120-attempt1.log.gz`. 압축 전 7,492행·2,612,311B,
  SHA-256 `f099926c3d8fc52ba0b1eaa526fb366a50c3f4372ffc5d0f3b3308f058f87f61`.
- 실행 제품 및 관련 source SHA는 위 제품 hash와 원출력에 결박한다. 원출력에서
  authorization/cookie/password/bearer/RTSP URL/credential 표식은 발견되지 않았다.
- 실패 root는 dev 16777234·inode 160831715·uid 501·0700의 검증 소유 경로다.
  종료·포트와 이 문서·원출력 이관을 확인한 뒤 477,772KiB를 정확한 소유 root 단위로
  삭제하고 부재를 확인했다. 원출력 임시 디렉터리도 저장소 gzip과 byte hash를 대조한 뒤
  삭제했다. 제품/운영 저장소는 대상이 아니다.
- 120분·자원 판정은 fail, S11 최종 gate는 뒤 단계이므로 미실행이다.
