# B11-G03 녹화 전용 120분 2차 준비 실패와 관측기 보완

독자: v4.1.0 녹화·릴리즈 검증 담당자. 수명: 실패와 같은 범위의 보완 이력을 보존한다.
정책 source-of-truth는 `AGENTS.md`다. 이 기록은 120분 PASS가 아니다.

## 실패와 원인

- 명령: `./server.sh verify-v410-recording-longrun --duration-minutes 120`
- source: `42320ac4` 및 그 시점의 clean working tree
- 결과: exit 1, 11,049ms, 7 pass·1 fail, `shortPreparationPass=false`
- 직접 실패: 첫 압축 `segment_v2_bound_finalized` 행이 active generation 원장에 추가된 뒤
  검증 전용 native observer가 `observer-native-rejected`로 종료됐다.
- 실패 시 전체 root는 262,873,004B/448MiB로 상한 미달이었다. 서버는 exit 0,
  강제 종료 없음, HTTP·RTSP 포트와 UDP 해제를 확인했다. 서버 ERROR/WARNING과
  `storageBlocked`는 없었다.

원인은 제품 writer·제품 reader가 아니라 `recording_generation_observation.h`의 active
tail 검증이었다. 이 경로는 `ParseRecordingMutationV1`으로 가역 wrapper를 정상 복원한
뒤에도 논리 재직렬화 결과가 물리 wrapper 원문과 같아야 한다고 요구했다. 뒤쪽 cold/raw
대조는 이미 `physical_json`을 사용하고 있어 active tail 앞단만 계약이 달랐다.

## 한정 보완과 검증

active tail도 plain 행이면 논리 직렬화, wrapper 행이면 검증된 `physical_json`을 원문과
대조하도록 통일했다. 압축 codec·제품 저장 형식·제품 reader/writer·공개 API·시간·ID·
보존 정책은 바꾸지 않았다. 실제 writer가 만든 압축 active 행을 checkpoint 전에 읽는
`B11-O02` 반례를 추가했다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B11-O02 generation observer | `--generation-self-test` | pass | 34/34, 압축 active 행·session/cache·손상 거부 |
| B11-O02 observer 회귀 | `--self-test` | pass | 67/67, 물리 압축 누적·삭제·복구·prefix 불변 |
| B11-O02 실제 앱 단기 | `--app-observe` | pass | 73/73, 30.207초·두 채널 finalized14/deleted12·재기동·HTTP·정리 |
| 샌드박스 준비 이력 | 첫 `--app-observe` | fail | 제품 기동 전 fixture가 macOS 서비스 대기로 30초 timeout. 동일 상한의 권한 조정 1회에서 1.4초 생성·전체 PASS |

원출력 SHA-256은 generation
`19de2955c08f1137825a284357cdea7d64cf45e724d4a31a10b0e22e668d5be6`,
observer `75934d5e765f4a23ea693e3ab147150a48fbbd05da764578d1488fd75db3d45a`,
actual app `7ce08125e636254cfa646266a56e90cbb6b8d8d94ae4758480053396dbb2cd80`다.
120분 실패 원출력 gzip SHA-256은
`35a997005a26099d3c1b621fdf64e2f14aba9be3759be059fdc026435b19aebd`다.

## 정리와 다음 경계

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 120분 2차 소유 root | 녹화·입력·관측 도구 | 논리 262,873,004B | 원출력 이관·원인 재현 뒤 exact root 삭제 | 부재 | 실패 로그의 root/process/port 원장 |
| 실패 focused root 2개 | 초기 테스트 경로 반례 | 각각 약 10MiB | 경로 선수조건을 고친 뒤 삭제 | 부재 | 실패 자기검사와 후속 34/34 |
| 샌드박스 준비 실패 root | 미생성 fixture·도구 | 10,282,895B | 환경 분리 후 삭제 | 부재 | 제품 프로세스 0, 후속 실제 앱 PASS |
| 성공 focused/실제 앱 root | fixture·녹화·복구 사본 | 로그별 12~284MiB | runner EXIT 정리 | 모두 부재 | 각 원출력 `cleanup.absent=true` |
| 원출력 wrapper temp | 16,999B plain log | gzip 이관·hash 대조 뒤 삭제 | 부재·gzip 보존 | 위 SHA-256 |

token start/end/consumed는 전용 집계가 없어 미집계다. 120분은 처음부터 다시 실행해야
하며 이 focused PASS나 30초 실제 앱 PASS로 대체하지 않는다.
