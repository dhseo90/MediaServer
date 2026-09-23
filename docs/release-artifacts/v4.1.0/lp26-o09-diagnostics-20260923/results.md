# LP26-O09 누적 규모 진단 실행 기록

독자: S11 검증·리뷰 담당자. lifecycle: 2026-09-23 Stage 1 진단 변경 증적을 보존한다.
정책은 AGENTS.md, 실행 정의/색인은 [중앙 테스트 기록](../../../release-test-records.md)을 따른다.
기준 HEAD: `bf02605ce63821044e1f88dfdf63f855479c666d`, branch `v4.1.0`.
본 기록은 커밋 전 working tree의 단기 검증이며 장시간 성공/자원 추세/UI PASS가 아니다.
`red.log`의 실패 문맥과 수치는 그대로 보존하고, Git 공백 검사에 걸린 공백 전용 행의 끝 공백만 정리했다.

## 실행 명령과 결과

```sh
# RED / 최초 GREEN: 아래 focused 명령의 첫 세 test 파일만 실행
node --test scripts/internal/recording_current_longrun_diagnostics.test.mjs scripts/internal/recording_current_http_diagnostics.test.mjs scripts/internal/recording_latency_trace.test.mjs
./server.sh build
node --test scripts/internal/recording_current_longrun_diagnostics.test.mjs scripts/internal/recording_current_http_diagnostics.test.mjs scripts/internal/recording_latency_trace.test.mjs scripts/internal/recording_current_observation.test.mjs scripts/internal/recording_process_cleanup.test.mjs scripts/internal/recording_longrun_progress.test.mjs
node --check scripts/internal/verify_recording_current_longrun.mjs
node --check scripts/internal/recording_longrun_progress.mjs
git diff --check
```

| 실행 | exit | 실제 결과 | 원출력 |
| --- | --- | --- | --- |
| 예상 RED | 1 | 25 pass / 7 fail. 미구현 간격·summary helper, 미등록 route class, 미적용4MiB 상한, 기존trace16385행 대신 마지막64행 기대 assertion 실패 | [red.log](red.log) |
| 최초 GREEN | 0 | 32/32 pass. RED7개 모두 해소 | [green.log](green.log) |
| C++ build | 0 | 변경 catalog/application 및 trace 사용하는 runtime 재컴파일·실행파일 링크 | [build.log](build.log) |
| 관련 focused | 0 | harness75/75, 개별119개 pass | [focused.log](focused.log) |
| 최종 focused | 0 | harness76/76, 개별120개 pass. attempt3 보존 표본의 15초 초과5개 중 첫 초과에서 중단 확인 | [focused-final.log](focused-final.log) |
| 문법·공백 | 0 | 두 node --check 및 git diff --check, 출력 없음 | 명령 결과 직접 확인 |

harness 숫자에는 legacy script의 단일 wrapper가 포함된다. 그 wrapper를 개별45개 결과로 펼쳐
최종 개별120행을 기록한다. 120분을 합성 시간축으로 검사하는 단위 항목은 실제 장시간 실행이 아니다.
환경: macOS, C++17 시스템 c++, 저장소 기존 GStreamer/ONNX build.
token start/end/consumed: 모두 미집계(작업별 usage 집계 도구 없음). source: 실행 원출력 및 명령 exit.
RED elapsed 1339.82175ms, 최초GREEN 1398.218917ms, focused 1433.155459ms, 최종focused 1193.856583ms.
build 경과 약4초는 로그 생성/수정 시각 기준(17:54:03~17:54:07 KST), 정밀 elapsed는 미수집.

## 구현과 판정 경계

- `assertSampleStep`와 verifier cadence가 첫/연속 표본15000ms 상한을 유지하며 최초 초과를 판정한다.
  동기 drain이 event loop를 막는 동안 중단할 수는 없으므로 반환 직후 경계에서 실패한다.
  정상5초 pause는 유지하고, 다음 표본 전에15초 초과가 확정되는 대기는 경계에서 종료한다.
- `sample-timing`은 metrics/drain/root-storage 단계별 elapsed, `http-timing`은 header/body/전체 elapsed를 기록한다.
  HTTP4초·body4MiB·native3초·최종복제15초·기존root448MiB 제한은 변경하지 않았다.
- `finally`가 실패에도 확보된 sample resource 요약을 남긴다. 부족/invalid는 별도 상태이며
  `resourceTrendPass:false`이다. 제품 성능 개선/누수 해결로 확대하지 않는다.
- catalog 기존 Lock wrapper의 wait/hold, checkpoint 전체 및 read/prepare/replay/candidate/cache-links/commit/release,
  application Status/provider를 기존 code/line 숫자로 계측한다. 제품 JSON/API/저장·media 계약 변경 없음.
- 테스트 `MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE=1`과 `MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY=1`일 때
  wait 또는 hold10ms 이상 완료 구간만 마지막64행 메모리 ring에 보존한다. 정상 종료 시 한번 stderr에 배출한다.
  fast20000행 뒤 slow80행 테스트에서 마지막64행이 유지됐다. 고정 최대64×512+512=33280bytes/process이며
  별도 파일/FD/경로 권한을 추가하지 않는다. 기존 private stdout+stderr 합산4MiB cap은 그대로다.
- HTTP 실패도 catch→finally→기존 process stop→로그 읽기→숫자 decoder 순서로 처리한다.
  비정상/강제 종료나 진행 중인 span은 완전한 지연 증거가 아니다. summary 누락/불일치/비숫자/추가 필드는
  unavailable, 정상종료 미확인은 incomplete이며 진단 완료/PASS로 승격하지 않는다.
- 새 계측을 켠 실앱 실행은 이번 범위에서 미실행이다. 단기 helper/C++ smoke/build 결과를 실제120분/실기기/브라우저 PASS로 사용하지 않는다.

## 개별 실행 결과

각 제목은 원출력과 동일하다. RED 이력은 삭제하지 않고 후속 동일 제목 pass 행과 함께 보존한다.

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| LP26-O09-B01 status/source-item 안전 분류 | [red.log](red.log)의 해당 assertion/반례 | fail | 예상 RED; 후속 GREEN 및 최종 focused에서 pass됨 |
| LP26-O09-B02 지정4MiB 초과는 body 실패 | [red.log](red.log)의 해당 assertion/반례 | fail | 예상 RED; 후속 GREEN 및 최종 focused에서 pass됨 |
| P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| P0-DIAG02 header timeout 고정 진단과 실패 유지 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| P0-DIAG03 body timeout 부분 수신 측정·완료 거부 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-A01 15초 첫/중간 경계와 즉시 실패 | [red.log](red.log)의 해당 assertion/반례 | fail | 예상 RED; 후속 GREEN 및 최종 focused에서 pass됨 |
| LP26-O09-A02 identity·clock·pid 불일치 | [red.log](red.log)의 해당 assertion/반례 | fail | 예상 RED; 후속 GREEN 및 최종 focused에서 pass됨 |
| LP26-O09-D01 실패 표본도 자원 요약에 보존하고 PASS 금지 | [red.log](red.log)의 해당 assertion/반례 | fail | 예상 RED; 후속 GREEN 및 최종 focused에서 pass됨 |
| LP26-O09-D02 부족 표본과 잘못된 표본은 명시 상태 | [red.log](red.log)의 해당 assertion/반례 | fail | 예상 RED; 후속 GREEN 및 최종 focused에서 pass됨 |
| LP26-O09-C01 slow-only 초기20000행 생략·마지막64·33KiB 상한 | [red.log](red.log)의 해당 assertion/반례 | fail | 예상 RED; 후속 GREEN 및 최종 focused에서 pass됨 |
| LP13-T01 collector 존재 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid null 무출력 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "" 무출력 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "0" 무출력 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "true" 무출력 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "01" 무출력 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "1 " 무출력 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T02 fast aggregate count/sum/max 정확 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 부분증거 parent/target 실패와 phase누락 미완료 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T02 실제 동일 mutex 경합·다른 mutex·unlock 후 sink | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 600 poll·15fastlocks/poll·5400worker 합성 예산 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 1800 poll·15fastlocks/poll·5400worker 합성 예산 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 tls-cap 손실 명시 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 cap 손실 명시 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 split·safe부분보존·순번누락 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 enum 거부 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 numeric 거부 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 time 거부 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 count 거부 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 linecap 거부 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 incomplete 거부 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T05 cost instrumentation 신규wrapper 단일치환·trace중복거부 | [red.log](red.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-B01 status/source-item 안전 분류 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-B02 지정4MiB 초과는 body 실패 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| P0-DIAG02 header timeout 고정 진단과 실패 유지 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| P0-DIAG03 body timeout 부분 수신 측정·완료 거부 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-A01 15초 첫/중간 경계와 즉시 실패 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-A02 identity·clock·pid 불일치 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-D01 실패 표본도 자원 요약에 보존하고 PASS 금지 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-D02 부족 표본과 잘못된 표본은 명시 상태 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-C01 slow-only 초기20000행 생략·마지막64·33KiB 상한 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 collector 존재 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid null 무출력 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "" 무출력 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "0" 무출력 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "true" 무출력 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "01" 무출력 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "1 " 무출력 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T02 fast aggregate count/sum/max 정확 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 부분증거 parent/target 실패와 phase누락 미완료 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T02 실제 동일 mutex 경합·다른 mutex·unlock 후 sink | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 600 poll·15fastlocks/poll·5400worker 합성 예산 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 1800 poll·15fastlocks/poll·5400worker 합성 예산 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 tls-cap 손실 명시 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 cap 손실 명시 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 split·safe부분보존·순번누락 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 enum 거부 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 numeric 거부 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 time 거부 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 count 거부 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 linecap 거부 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 incomplete 거부 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T05 cost instrumentation 신규wrapper 단일치환·trace중복거부 | [green.log](green.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-B01 status/source-item 안전 분류 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-B02 지정4MiB 초과는 body 실패 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| P0-DIAG02 header timeout 고정 진단과 실패 유지 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| P0-DIAG03 body timeout 부분 수신 측정·완료 거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-A01 15초 첫/중간 경계와 즉시 실패 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-A02 identity·clock·pid 불일치 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-D01 실패 표본도 자원 요약에 보존하고 PASS 금지 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-D02 부족 표본과 잘못된 표본은 명시 상태 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-C02 slow 숫자행·완료/미완료·비밀 거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP22-O01 optional page observation preserves values and captures every page | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP22-O02 callback exceptions do not replace original page failure | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP22-O03 same total ready complete mixture retains individual page states | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP22-O04 changed totals fail then a fresh cycle fetches every page again | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP22-O05 late complete observation cannot erase the original transition timeout | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP22-O04 wait keeps late successful return and reports its client deadline overrun | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP22-O06 diagnostic report failure remains explicit without hiding primary error | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O01 complete page survives later total change while full collection fails | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O01 changed page is independently validated and observed before total mismatch | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O01 cross-page duplicate with stable total remains fatal | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O01 cross-page duplicate with total change retains retry reason | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O02 ready complete mixture is observed but never promoted to complete full page | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O02 strict consumer exceptions propagate independently of swallowed diagnostic errors | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O02 reference conflict after complete cannot disappear behind prior terminal observation | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O02 job conflict after complete cannot disappear behind prior terminal observation | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O02 state conflict after complete cannot disappear behind prior terminal observation | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O02 failed conflict after complete cannot disappear behind prior terminal observation | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O02 media conflict after complete cannot disappear behind prior terminal observation | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O03 complete observation cannot erase a following HTTP failure | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O03 no terminal state retains original thirty second wait timeout | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O02 terminal retention stays bounded across cycles and does not retain group members | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O04 invalid offset page is rejected before strict consumer | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O04 invalid limit page is rejected before strict consumer | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O04 invalid count page is rejected before strict consumer | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O04 invalid duplicate page is rejected before strict consumer | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP25-O04 invalid truncated page is rejected before strict consumer | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-C01 slow-only 초기20000행 생략·마지막64·33KiB 상한 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-C03 slow flag만으로 trace 활성화 금지 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 collector 존재 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid null 무출력 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "" 무출력 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "0" 무출력 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "true" 무출력 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "01" 무출력 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T01 disabled/invalid "1 " 무출력 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T02 fast aggregate count/sum/max 정확 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 부분증거 parent/target 실패와 phase누락 미완료 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T02 실제 동일 mutex 경합·다른 mutex·unlock 후 sink | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 600 poll·15fastlocks/poll·5400worker 합성 예산 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 1800 poll·15fastlocks/poll·5400worker 합성 예산 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 tls-cap 손실 명시 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T03 cap 손실 명시 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 split·safe부분보존·순번누락 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 enum 거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 numeric 거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 time 거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 count 거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 linecap 거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T04 incomplete 거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP13-T05 cost instrumentation 신규wrapper 단일치환·trace중복거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| explicit 120 minutes accepted | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| invalid CLI [] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| invalid CLI ["120"] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| invalid CLI ["--duration-minutes","30"] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| invalid CLI ["--duration-minutes","120","extra"] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| invalid CLI ["--unknown","120"] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| two channels progress and ordered deletion | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| stall rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| duplicate rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| UTC regression rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| completion without request rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| invalid media metadata rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| duration cannot be shortened | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| unknown channel cannot satisfy progress | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| backward clock rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| sample continuous accepted | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| sample gap rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| sample wrong PID rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| sample wrong identity rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| sample missing beginning rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| sample missing end rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| sample insufficient rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| actual golden schema accepted | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| full duration distributed progress accepted | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| last moment only cannot pass | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| ID limit rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| UTF8 byte limit rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| queried revision advanced disable | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| missing source rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| duplicate source rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| invalid revision rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| public CLI rejects [] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| public CLI rejects ["120"] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| public CLI rejects ["--duration-minutes","30"] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| public CLI rejects ["--duration-minutes","120","extra"] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| public CLI rejects ["--unknown","120"] | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| completed batch returns media path once | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| missing media path rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| media path byte limit rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| ENOENT media absent | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| regular media present rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| dangling symlink present rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| media permission error rejected | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| S09-LD01 invalid segment diagnostics are specific and redacted | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| S09-LD01 missing timestamp diagnostics remain specific and redacted | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D01 종료 관측 helper 존재 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D01 정상 exit0·두port·중복/동시호출 최초결과 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D02 exit7 FAIL과archiveSafe 분리 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D02 signal FAIL과archiveSafe 분리 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D02 forced SIGKILL은실패지만관측종료/port확인 보존 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D02 미관측 timeout·중복stop 무한재시도금지 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D03 http port실패에도다른port독립검사 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D03 rtsp port실패에도다른port독립검사 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D03 canary원문미노출·최초실패유지·종료뒤port오류별도보존 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D03 서버 SIGTERM 전달 실패 고정코드 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D03 서버 SIGKILL 전달 실패 고정코드 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D03 porttimeout 및 비표준 signal원문거부 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D04 소유실제Node자식 SIGTERM→exit0 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP14-D04 소유실제Node자식 SIGTERM→exit7 | [focused.log](focused.log)의 해당 assertion/반례 | pass | 중간 결과 보존 |
| LP26-O09-B01 status/source-item 안전 분류 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-B02 지정4MiB 초과는 body 실패 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| P0-DIAG02 header timeout 고정 진단과 실패 유지 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| P0-DIAG03 body timeout 부분 수신 측정·완료 거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-A01 15초 첫/중간 경계와 즉시 실패 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-A02 identity·clock·pid 불일치 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-A03 보존 attempt3의 초과5건 중 첫 간격에서 실패 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-D01 실패 표본도 자원 요약에 보존하고 PASS 금지 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-D02 부족 표본과 잘못된 표본은 명시 상태 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-C02 slow 숫자행·완료/미완료·비밀 거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP22-O01 optional page observation preserves values and captures every page | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP22-O02 callback exceptions do not replace original page failure | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP22-O03 same total ready complete mixture retains individual page states | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP22-O04 changed totals fail then a fresh cycle fetches every page again | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP22-O05 late complete observation cannot erase the original transition timeout | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP22-O04 wait keeps late successful return and reports its client deadline overrun | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP22-O06 diagnostic report failure remains explicit without hiding primary error | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O01 complete page survives later total change while full collection fails | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O01 changed page is independently validated and observed before total mismatch | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O01 cross-page duplicate with stable total remains fatal | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O01 cross-page duplicate with total change retains retry reason | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O02 ready complete mixture is observed but never promoted to complete full page | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O02 strict consumer exceptions propagate independently of swallowed diagnostic errors | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O02 reference conflict after complete cannot disappear behind prior terminal observation | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O02 job conflict after complete cannot disappear behind prior terminal observation | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O02 state conflict after complete cannot disappear behind prior terminal observation | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O02 failed conflict after complete cannot disappear behind prior terminal observation | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O02 media conflict after complete cannot disappear behind prior terminal observation | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O03 complete observation cannot erase a following HTTP failure | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O03 no terminal state retains original thirty second wait timeout | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O02 terminal retention stays bounded across cycles and does not retain group members | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O04 invalid offset page is rejected before strict consumer | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O04 invalid limit page is rejected before strict consumer | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O04 invalid count page is rejected before strict consumer | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O04 invalid duplicate page is rejected before strict consumer | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP25-O04 invalid truncated page is rejected before strict consumer | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-C01 slow-only 초기20000행 생략·마지막64·33KiB 상한 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP26-O09-C03 slow flag만으로 trace 활성화 금지 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T01 collector 존재 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T01 disabled/invalid null 무출력 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T01 disabled/invalid "" 무출력 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T01 disabled/invalid "0" 무출력 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T01 disabled/invalid "true" 무출력 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T01 disabled/invalid "01" 무출력 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T01 disabled/invalid "1 " 무출력 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T02 fast aggregate count/sum/max 정확 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T04 부분증거 parent/target 실패와 phase누락 미완료 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T02 실제 동일 mutex 경합·다른 mutex·unlock 후 sink | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T03 600 poll·15fastlocks/poll·5400worker 합성 예산 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T03 1800 poll·15fastlocks/poll·5400worker 합성 예산 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T03 tls-cap 손실 명시 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T03 cap 손실 명시 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T04 split·safe부분보존·순번누락 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T04 enum 거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T04 numeric 거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T04 time 거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T04 count 거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T04 linecap 거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T04 incomplete 거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP13-T05 cost instrumentation 신규wrapper 단일치환·trace중복거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| explicit 120 minutes accepted | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| invalid CLI [] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| invalid CLI ["120"] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| invalid CLI ["--duration-minutes","30"] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| invalid CLI ["--duration-minutes","120","extra"] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| invalid CLI ["--unknown","120"] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| two channels progress and ordered deletion | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| stall rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| duplicate rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| UTC regression rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| completion without request rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| invalid media metadata rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| duration cannot be shortened | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| unknown channel cannot satisfy progress | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| backward clock rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| sample continuous accepted | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| sample gap rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| sample wrong PID rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| sample wrong identity rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| sample missing beginning rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| sample missing end rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| sample insufficient rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| actual golden schema accepted | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| full duration distributed progress accepted | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| last moment only cannot pass | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| ID limit rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| UTF8 byte limit rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| queried revision advanced disable | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| missing source rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| duplicate source rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| invalid revision rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| public CLI rejects [] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| public CLI rejects ["120"] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| public CLI rejects ["--duration-minutes","30"] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| public CLI rejects ["--duration-minutes","120","extra"] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| public CLI rejects ["--unknown","120"] | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| completed batch returns media path once | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| missing media path rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| media path byte limit rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| ENOENT media absent | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| regular media present rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| dangling symlink present rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| media permission error rejected | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| S09-LD01 invalid segment diagnostics are specific and redacted | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| S09-LD01 missing timestamp diagnostics remain specific and redacted | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D01 종료 관측 helper 존재 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D01 정상 exit0·두port·중복/동시호출 최초결과 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D02 exit7 FAIL과archiveSafe 분리 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D02 signal FAIL과archiveSafe 분리 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D02 forced SIGKILL은실패지만관측종료/port확인 보존 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D02 미관측 timeout·중복stop 무한재시도금지 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D03 http port실패에도다른port독립검사 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D03 rtsp port실패에도다른port독립검사 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D03 canary원문미노출·최초실패유지·종료뒤port오류별도보존 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D03 서버 SIGTERM 전달 실패 고정코드 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D03 서버 SIGKILL 전달 실패 고정코드 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D03 porttimeout 및 비표준 signal원문거부 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D04 소유실제Node자식 SIGTERM→exit0 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |
| LP14-D04 소유실제Node자식 SIGTERM→exit7 | [focused-final.log](focused-final.log)의 해당 assertion/반례 | pass | 최종 관련 단기 결과 |

## cleanup과 보존

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-latency-3iC4Cx` | 실행 전용 C++ smoke·instrument fixture | 515050 bytes | unit after hook 삭제 | 부재 재확인 | [red.log](red.log) cleanup removed=true |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-latency-SBdb6d` | 실행 전용 C++ smoke·instrument fixture | 517634 bytes | unit after hook 삭제 | 부재 재확인 | [green.log](green.log) cleanup removed=true |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-latency-nnxazq` | 실행 전용 C++ smoke·instrument fixture | 517634 bytes | unit after hook 삭제 | 부재 재확인 | [focused.log](focused.log) cleanup removed=true |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-latency-JOoZKT` | 실행 전용 C++ smoke·instrument fixture | 517634 bytes | unit after hook 삭제 | 부재 재확인 | [focused-final.log](focused-final.log) cleanup removed=true |
| 소유 Node 자식 | 종료 oracle용 자식2개/회 | 파일 없음 | SIGTERM·exit 관측 | 최종 PID54595(exit0),54606(exit7) 모두 종료 | focused-final.log child-cleanup; 실제 서버/listening port 없음 |
| build.log | redaction된 단기 실행 원출력 | 1035 bytes | 저장소 보존 | 보존 | 최초 실패·재검증·cleanup 감사 근거, URL/응답 본문/credentials 없음 |
| focused-final.log | redaction된 단기 실행 원출력 | 8443 bytes | 저장소 보존 | 보존 | 최초 실패·재검증·cleanup 감사 근거, URL/응답 본문/credentials 없음 |
| focused.log | redaction된 단기 실행 원출력 | 8343 bytes | 저장소 보존 | 보존 | 최초 실패·재검증·cleanup 감사 근거, URL/응답 본문/credentials 없음 |
| green.log | redaction된 단기 실행 원출력 | 2653 bytes | 저장소 보존 | 보존 | 최초 실패·재검증·cleanup 감사 근거, URL/응답 본문/credentials 없음 |
| red.log | redaction된 단기 실행 원출력 | 8588 bytes | 저장소 보존 | 보존 | 최초 실패·재검증·cleanup 감사 근거, URL/응답 본문/credentials 없음 |

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 30분/120분 | verify-predev·녹화 장시간 | 이번 범위 실행 없음 | 기존 FAIL은 유지; 단기 PASS로 대체 불가 |
| 실제 앱/브라우저 | 제품 server·UI 실행 | 이번 Stage 1은 focused/build로 제한 | 실제 프로세스 장시간 trace 회수와 UI는 미확인 |
| 다음 잔여이슈 | 누적 규모 synthetic fixture·제품 원인 수정 | 이번1번 범위 밖 | 미착수 |
| 커밋/푸시 | 외부 변경 | 메인 담당 별도 처리 | 이 담당자 미수행 |

## 1번 계측 이후 기존 LP15 검사 연결 보완

CheckpointLocked에 단계 계측을 넣으면서 소유 복제본 검사기의 정확한 문자열 삽입 위치가 달라졌다.
검사기만 현행 호출식에 다시 결박했다. 최초 실행은 기능 assertion 46개가 통과했지만 macOS
/usr/bin/time -l의 sysctl kern.clockrate 접근이 실행 환경에서 거부되어 peak RSS가
미집계였고 최종 exit 2였다. 이를 제품 실패나 PASS로 바꾸지 않았다.

검사 실행파일 자체의 getrusage(RUSAGE_SELF) 최대 RSS를 사용하도록 검사기만 보완했다.
동일 명령 bash scripts/internal/verify_recording_checkpoint_cache.sh를 다시 실행한 결과,
LP15 기능 46/46, peak RSS 179,994,624B ≤ 536,870,912B, 전체 exit 0, 17초였다.
원출력 전체는 [cache-compatibility-full.log](cache-compatibility-full.log)에 보존했다.
소유 임시 root 약 17.6MB 삭제와 부재를 확인했다. 별도 bash -n과 git diff --check도 exit 0이다.
이는 검사기 호환 회귀와 자원 측정의 PASS이지 1,020개 누적·실제 HTTP·120분 PASS는 아니다.
