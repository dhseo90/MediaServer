# B11-G03 녹화 120분 9차 세대 전환 관측 비용

독자: v4.1.0 S11 녹화 장시간 검증·릴리즈 판정 담당자. 수명: v4.1.0 릴리즈까지.
정책 source-of-truth는 `AGENTS.md`이며, 이 문서는 9차 실행의 유효한 누적 관측,
실패 원인, 한정 보완과 정리 결과를 보존한다. 집중 검사를 녹화 120분 PASS로
승격하지 않는다.

## 실행 결과

명령은 `./server.sh verify-v410-recording-longrun --duration-minutes 120`이다.
exit 1, 전체 elapsed 6,503,543ms, 9,061 pass·1 fail이다. 약 108분 동안 두 채널의
녹화·삭제·상태 관측이 진행됐으나 표본 1,299의 세대 전환 관측이 고정 3초를
2.468ms 넘겨 `observer-native-timeout`으로 중단됐다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B11-G03 120분 9차 | 두 채널 상시녹화·순환 삭제·상태/자원 관측 | fail |
| 상태 API | 마지막 HTTP200·약 2ms, 4초 기준 이내 | pass |
| 저장 상한 | failure-live 398,570,869B, post-stop 381,470,099B, 448MiB 미만 | pass |
| 녹화 진행 | finalized 합계 6,464·deleted 합계 6,460, 물리 mutation 25,850 | pass |
| 종료 경계 | 서버 exit0·강제 종료 없음·HTTP/RTSP 포트·UDP 폐쇄·partial0 | pass |
| 제품 진단 | private log의 ERROR·WARNING·storageBlocked 각 0 | pass |
| 자원 원자료 | 1,299표본, 최대 RSS737,820,672B, warmup 뒤 2.204MiB/min, FD +2·thread 0 | pass |
| 세대 전환 관측 | generation 76→77에서 drain 3,002.468ms | fail |

[압축 원출력](b11-recording-120-attempt9.log.gz)의 SHA-256은
`3401c0b6730db2915e3ac72117694dc9f27baf9a4df76af98dfb5d607378846a`다.
[실패 root receipt](b11-recording-120-attempt9-root-receipt.json)의 SHA-256은
`daca7a855a88a53a18d11330ff955ee5dca9760719a818ccced2f6b6f4dbc621`다.
receipt는 경로 원문을 공개하지 않고 녹화 subtree 243,425,499B·171항목의 path/content
hash와 실행 지원 파일, disposable GStreamer cache 모양을 결박한다. token
start/end/consumed는 전용 집계가 없어 미집계다.

자원 값은 원자료 확보 PASS이지 누수 없음 판정이 아니다. 120분을 채우지 못했고
최종 동일 코드의 종료·정리까지 통과하지 않았으므로 자원 최종 판정은 보류한다.

## 확정 원인과 보완 경계

실패 직전 mutation count는 25,850으로 유지된 반면 generation만 76에서 77로 바뀌었다.
기존 persistent 관측기는 새 head를 보더라도 이전 77개 identity shard를 모두 다시 읽고,
정규형·SHA-256·ID/순서/예약 이력을 전수 재계산했다. 보존 복제본 계측에서 첫 strict
관측은 snapshot 약 999ms, chain 약 1,238ms였고 전환과 출력 비용이 겹치면 3초 상한을
넘을 수 있었다. HTTP·제품 writer·저장 상한 문제가 아니라 검증 관측기의 immutable
chain 중복 검증 비용이다.

완전 검증된 chain에 파일 descriptor와 정확한 inode/size/mtime/ctime 결박을 함께
보존하고, 다음 게시 head가 기존 head의 정확한 후속임을 입증한 경우에만 새 shard를
증분 검증하도록 보완했다. active tail은 매 요청마다 전체 정규형 검증하며, 증분 조건이
맞지 않거나 24MiB chain proof 예산을 넘으면 입력을 거부하지 않고 기존 전체 chain
검증으로 복귀한다. 공개 API·영속 schema/바이트·시간/ID·보존/복구·3초/4초/448MiB
기준은 바꾸지 않았다.

## 예상 RED와 집중 검증

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 예상 RED | 동일 관측에서 과거 identity shard를 중복 parse하지 않는 계약 | fail |
| identity 증분 계약 | exact previous head·ordinal·ID identity·archive admission·full 결과 동등성 | pass |
| identity 구성 | OpenSSL on/off 독립 빌드·손상/순서/예약 반례 | pass |
| generation 관측 | checkpoint 증분 1회, snapshot/identity/root 변조 fail-closed | pass |
| metadata 누적 | 4,452 mutation, warm poll 약 22~24ms, one-shot 약 549ms | pass |
| 77 shard cold/warm | 첫 strict chain 약 1,238ms, warm chain 약 42ms, 논리 cache 약 21.3MiB | pass |
| 실제 77→78 전환 | `chainExtensions=1`, snapshot 약 1,014ms·chain 약 84ms | pass |
| checkpoint·consumer 회귀 | crypto/sqlite/backend 조합, 삭제·참조·복구·손상 거부 | pass |
| 관측기 자기검사 | 67/67 | pass |
| build·diffcheck | `./server.sh build`, `git diff --check` | pass |

집중 검증은 세대 전환의 중복 비용과 기존 엄격 판정을 함께 대조한다. 전체 120분
재실행 전에는 B11-G03 또는 S11 최종 local gate를 PASS로 판정하지 않는다.

## 정리 상태

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 9차 실패 소유 root | 입력·녹화·관측 실행물 | 381,470,099B post-stop | 원출력·tree receipt·측정 이관 뒤 제거 | 부재 | 서버 exit0·포트 폐쇄·`lsof +D` 출력 없음·삭제 뒤 부재 |
| 전환 검증 복제본 | 77→78 checkpoint 비교 | 약 233MiB | 전환 결과 확인 뒤 제거 | 부재 | 소유자·프로세스 부재·삭제 뒤 부재 |
| benchmark 복제본 2개 | cold/warm 비용 비교 | 약 9.6MiB·0B | 결과 확인 뒤 제거 | 부재 | 소유자·프로세스 부재·삭제 뒤 부재 |
| 예상 RED/준비 root 3개 | 실패·stale build·최초 GREEN 실행물 | 약 24MiB 합계 | 결과 구분 뒤 제거 | 부재 | 각 소유자·프로세스 부재·삭제 뒤 부재 |
| 원출력 | 9차 전체 로그 | 압축 전 5,238,862B | gzip 이관 | 저장소에 301,059B 보존 | 위 SHA-256·임시 원문 부재 |
| 실패 root receipt | 비민감 path/content hash·지원 파일·cache 모양 | 42,851B | 저장소 이관 | 보존 | 위 SHA-256·raw path 비공개 |

