# v4.1.1 별도 녹화 120분 실행·증거 검토

녹화 지속·순환 삭제·재기동·복제본 정합·cleanup의 실행 결과는 **PASS**다. 자원 표본 검토는 완료했지만 **RSS 안정성 승인은 보류**한다. 초기 준비 이후에도 RSS의 구간 중앙값이 상승했으며, 이 자료만으로 누수와 누적 메타데이터·캐시·할당기 고수위의 기여를 구분할 수 없다. 제품 누수를 확정하거나 전체 릴리즈 완료로 판정하지 않는다.

## 실행 대상과 범위

- 실제 HEAD: `860aa46b4d616291e0fad5cadb17ea127ebf2dc8`, tree: `acb4a3b4284e118b7b308b81b6ebaae22b56d428`, branch: `v4.1.1`.
- 제품 SHA-256: `ec93cbc5418bd1fe0c83eb4a90bf3fb837d9acd0f76356c6771b042e37d60c25`.
- runtime archive SHA-256: `d857542636a2ac9aafd4165c0f4530120fffb29f582e6fb413725289a5f92ba5`.
- 명령: `./server.sh verify-v410-recording-longrun --duration-minutes 120`, 실제 호출 **1회**, exit **0**. 재시도·짧은 대체 실행 없음.
- 실행·검토: 현재 대화의 메인 Codex AI. 인간/사용자 승인이나 독립 C2 검토로 표시하지 않는다. 현행 장시간 경로와 검증 정책은 별도 독립 증거 검토자를 필수로 요구하지 않아 추가 agent를 사용하지 않았다.
- 2026-10-02 07:53:53.662~09:55:06.366 KST. launcher 경과 7,272.657초, runner 경과 7,269.735초, **실제 녹화 관측 7,200.450초**를 구분한다. fixture 생성은 1.301초였다.

준비 시 기존 바이너리·archive 해시와 녹화 코드의 빌드 시각을 확인했다. 전체 제품 빌드는 하지 않았다. wrapper가 기존 C++17/warning/라이브러리 조건으로 임시 관측용 프로그램을 컴파일했다. 기존 latency trace와 관측용 catalog instrumentation도 wrapper의 원래 경로이며 제품 바이너리는 바꾸지 않았다. 최근 actual-app live scan 수정은 별도 경로이고, 이 장시간 wrapper/공통 관측기/HTTP helper는 로컬 remote-tracking 기준 이후 변경되지 않았다. 원격을 새로 조회했다는 뜻은 아니다.

준비용 GStreamer 버전 조회는 sandbox의 macOS 서비스 오류로 정체되어 소유 그룹을 종료(exit 143)했다. 해당 최초 출력도 보존했다. 기존 권한 경로의 도구·플러그인 준비는 exit 0이었다. 이 두 준비 조회는 녹화 명령 호출 횟수가 아니다. 설치·업데이트·timeout/주기/상한 변경은 없었다.

## 실제 실행과 정합

| 검토 대상 | 실제 근거와 판단 |
| --- | --- |
| 120분 녹화·순환 보존 | 주 관측 PID 10392에서 채널 9101/9201 각각 확정 3,592개·삭제 3,590개. 이는 관측 종료 시점이며 이후 정상 종료·재활성화 구간의 추가 진행과 구분한다. |
| 표본 연속성 | 1,440개, PID/start identity 각 1개. 중복·역전 0, 15초 초과 공백 0. 최대 간격 5,014.139ms, 시작/끝 경계 공백 303.863/446.030ms. sample timing 번호도 1~1,440으로 일치한다. |
| mutation/파일 대응 | 관측 mutation 2→28,730. 7,184개 segment 기록의 확정·삭제 전이, 삭제된 물리 파일 부재 검사가 수행됐다. 종료 후 partial/backlog 없는 닫힌 journal도 통과했다. |
| 비활성화·정상 종료 | 두 채널의 revision을 반영한 disabled 설정과 첫 서버 exit 0, 강제 종료 없음. HTTP/RTSP 해제 확인. |
| 첫 복제본 검증 | 원본 전체 경로·크기·해시와 복제본 결속, native catalog recovery·surviving/deleted state 확인. 원본과 입력 manifest 불변. |
| 비활성 상태 재기동 | PID 14521에서 기대 채널 집합 전체 disabled/inactive. 채널 9101/9201의 API continuousBytes가 실제 생존 파일 합계 62,855,707/67,530,582 bytes와 각각 일치하며 eventBytes는 0. 채널별 삭제 3,591개와 과거 누적 바이트가 별도로 확인됐다. |
| 재기동 전후 동일성 | 두 번째 정상 종료 뒤 native snapshot 결과의 catalog/media 상태가 첫 결과와 정확히 동일. 원본 파일 전체와 입력 manifest 불변. |
| 재활성화 | PID 14588에서 두 채널을 활성화하고 각각 기존 finalized 수를 넘는 새 진행을 실제 확인. 정상 종료와 최종 closed journal 확인. |
| 마지막 복제본·정리 | native snapshot 총 3회 exit 0, signal/error 없음, 각 10.453/10.428/10.474초로 기존 15초 제한 이내. 3개 copy root 모두 삭제·부재 확인. |

raw summary의 `passed=10097`, `failed=0`은 이 반복 실행의 실제 check 호출 수다. 새로운 기능 ID 수나 별도 검사 10,097종으로 해석하지 않는다. 생성 fixture는 서로 다른 canonical 입력 2개이며 파일당 62,334,405 bytes, 해시는 [generated-inputs.json](generated-inputs.json)에 있다.

기동 전 health poll의 error 214건은 첫/두 번째/세 번째 기동 준비 구간에 각각 12/101/101건이다. 모두 기존 준비 제한 안에서 health 200으로 전환됐고, 준비 완료 뒤 health error는 0이다. 녹화 status 요청 1,441건은 모두 성공했다. 사후 예외 목록을 추가하지 않았다. 서버의 기존 정제 진단에서 ERROR/WARNING/storageBlocked/file-evidence-unavailable 집계는 모두 0이며 private log 상한 초과도 없다.

## 자원 표본 검토

아래 값은 주 관측 PID 10392, `macos:1790895237:863063`의 동일 구간이다. 재기동 PID 14521/14588의 표본을 합치지 않았다. 두 재기동 서버는 준비·정합·정리 결과가 있으며 장기 RSS/스레드/FD 추세 표본은 없다.

| 자원 | 시작 → 끝 / 최대 | 실제 판단 |
| --- | --- | --- |
| RSS | 89.484 → 470.984 MiB / 508.109 MiB | 시작은 pipeline 준비 구간이다. 기존 5분 warmup 이후에도 +193.188 MiB로 증가했으므로 시작/끝 차이만의 문제는 아니다. 안정성 승인 보류. |
| 스레드 | 28 → 25 / 28 | warmup 이후 대부분 25, 전체 표본에 26의 일시 표본이 있으나 누적 증가 없음. |
| FD | 29 → 23 / 30 | 전체 19~30 범위에서 변동하고 각 구간 중앙값 23. 누적 증가 관측 없음. 이 사실만으로 모든 FD 수명 결함 부재를 증명하지 않는다. |

RSS 10~20분 중앙값은 351.336 MiB, 50~60분 394.445 MiB, 90~100분 452.641 MiB, 110~120분 468.633 MiB였다. 말기에도 평탄화가 입증되지 않았다. 기존 helper의 warmup 이후 시작/끝 환산은 +1.680 MiB/min이며, 전체 점을 사용한 설명용 회귀는 5분 이후 +1.279 MiB/min이다. 이 계산을 새 합격 상한으로 사용하지 않았다. 순간 감소도 있지만 구간 수준의 상승은 남아 있다.

mutation과 확정·삭제량이 지속 증가하는 동시에 journal·generation metadata도 누적됐다. 이는 처리량과 메모리 상승의 동시 관측이며 원인 분해가 아니다. heap/할당 구성/회수 가능성 자료는 기존 실행기가 수집하지 않았으므로 누수 확정도, 무누수·안정성 PASS도 하지 않는다. 필요한 미확인 범위는 **지속되는 RSS 상승의 구성과 회수 가능성**이다. 이를 해결하기 위한 새 검사·진단·정책을 이번 작업에서 시작하지 않았다.

표본 처리 시간의 중앙값/95백분위/최대는 295.040/476.874/1,425.196ms였다. 수집기·관측 drain·저장소 측정에 실패나 표본 공백은 없었다. slow trace는 기존 10ms 기준과 64행 상한을 적용한 완료 구간 자료다. 첫 서버에서 seen 19,928 중 64행이 남으므로 보존되지 않은 전체 내부 지연의 최대값을 추정하지 않는다.

소유 root의 출력에 남은 최대 논리 크기는 **469,627,506 bytes = 447.872 MiB**로 기존 **448MiB** 상한 미만이다. 여유는 **134,542 bytes(131.389KiB)**로 작았지만 실제 상한 초과는 0이다. 이 상한은 RSS 상한이 아니다. peak에는 fixture 124,668,810 bytes, media 124,670,556 bytes, partial 62,334,382 bytes와 누적 journal/metadata 등이 포함된다. 종료 뒤 root는 413,604,253 bytes였고 partial은 0이다. 새 여유 기준을 사후 도입해 실패 또는 성공으로 바꾸지 않았다.

## 원본 필드와 보존

- [runner-summary.json](runner-summary.json)은 stdout 최종 JSON 행을 바이트 그대로 추출했다. SHA-256: `382c51de7094dd617d174bfed3f4cdbe4aca8680418a364e10b78ace255f7d4a`.
- 원본의 `longrunObservationCompleted=true`, `resourceTrendPass=false`, `reviewRequired=true`, `uiFulltestPass=false`는 수정하지 않았다. 이번 별도 검토는 자원 판단을 담으며 UI의 기존 PASS를 취소하지 않는다.
- [launcher.stdout.log.gz](launcher.stdout.log.gz)는 5,847,516 bytes 원출력의 무손실 압축이다. 해제한 원본 SHA-256: `a6bb5c93ca7237142ee125fe04fec08f0d463234eee8543b8a04afd1eaa34d49`. 압축 파일 해시는 [preservation-manifest.json](preservation-manifest.json)에 별도로 둔다. stderr는 0 bytes.
- [evidence-analysis.json](evidence-analysis.json)은 원출력에 대한 파생 집계·검토다. 원본이나 별도 제품 실행으로 표시하지 않는다. 전체 표본은 압축 원출력 한 곳에 보존했다.
- 기존 `v4.1.0/lp26-o10-accumulation-20260923` receipt 211개는 불변이다. 이번 UUID receipt 3개만 [receipts](receipts)에 원문 바이트로 보존하고, Git 재조회 후 이번 중복 원본만 정리한다.
- 생성 media, private log 원문, 임시 관측 바이너리는 성공 시 wrapper가 정리했다. media 원본이나 private 로그 전체를 Git에 보존했다고 주장하지 않는다. 생성 입력 해시, 원래 정제 진단·원문 hash/크기·제한된 trace, snapshot receipt만 남겼다.

## Cleanup·기존 증거·마감 판단

세 제품 서버 모두 exit 0, 강제 종료 없음. launcher 그룹과 각 PID 부재, HTTP/RTSP 6개 포트의 listener 부재와 loopback bind 가능을 재확인했다. UDP는 runner의 close 완료가 기록됐다. wrapper root와 snapshot copy 3개도 실제 부재다. 기본 `.media_server/recordings`는 전후 모두 없고, 상속 외부 저장소 변수도 없었다. 서버 환경은 기존 허용 목록과 테스트 소유 root, local-env 차단을 사용했다. 정리 근거는 [cleanup-observation.json](cleanup-observation.json)에 있다.

제품·UI·CMake·binary/archive·검사기·정책·fixture 기대값·승인 입력을 수정하지 않았다. 실행 전후 추적 diff와 index가 불변이고 준비 시 기록한 입력 hash도 일치한다. 따라서 candidate/독립 소스 검토/producer는 실행하지 않았다. c888ac9b의 일반 acceptance, 완료된 녹화 단기, 기본424+녹화8의 UI432 판단은 각각 기존 실행 증거로 유지한다. Opus timeout·snapshot ENOENT의 과거 FAIL과 원인 미확정도 그대로다.

이번 **예정된 녹화120분 실행은 완료**, 실행·정합·재기동·cleanup은 PASS다. **자원 안정성 판단에는 RSS 항목이 남아 있어 전체 검증 마감 가능으로 승인하지 않는다.** 새로운 제품 결함을 확정하거나 기존 PASS를 일괄 무효화하지 않는다. 로컬 보존·원본 대조 후 종료하며, 추가 진단·장시간 재시도·전체 기록 삭제·push/PR/병합/tag/Release는 하지 않는다.
