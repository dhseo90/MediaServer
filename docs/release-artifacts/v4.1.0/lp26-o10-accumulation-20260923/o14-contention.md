# LP26-O14 누적 체크포인트·타임라인 잠금 경쟁 반례

독자: v4.1.0 녹화 저장·검증 담당자. 수명: S11 차단 원인과 후속 수정·재검증까지 보존하는 실패 기록. 완료 기준은 `AGENTS.md`와 녹화 저장 비용 계약 문서가 우선한다.

## 실행과 판정

| 항목 | 실제 결과 | 근거 |
| --- | --- | --- |
| 준비·소규모 | `./server.sh build` exit 0, 공개 타임라인 66/66, 축적 probe 16개 검사 exit 0 | [타임라인 원출력](o14-timeline-focused.log), 현재 실행 명령 결과 |
| 누적 단독 1,020 | `bash scripts/internal/verify_recording_accumulation_probe.sh --case 1020` exit 0. 원장 4,080행, 복구 5.967초, 타임라인 투영 0.003866초, 관측 initial 5.635초/rotated 5.314초, cleanup 부재 확인 | [원출력](o14-accumulation-1020.log) |
| 누적 단독 2,049 | `bash scripts/internal/verify_recording_accumulation_probe.sh --case 2049` exit 0. 원장 8,196행, 복구 12.128초, 타임라인 투영 0.009199초, 관측 initial 11.038초/rotated 10.748초, cleanup 부재 확인 | [원출력](o14-accumulation-2049.log) |
| 잠금 경쟁 2,049 | probe가 수동 `Checkpoint`와 `SnapshotTimelineV2`를 동시 호출. catalog 잠금 점유 관측, 둘 다 계산 성공. 타임라인 호출 전체 8.435488초로 4초 비교 기준 초과. 명령 exit 1, 프로세스 종료·격리 루트 삭제 확인 | [실패 원출력](o14-contention-2049.log) |
| 내부 합성 경로(이전 진단) | `--case 2049` exit 0. 삭제 원본 2,049개 타임라인 ID·총계·비재생 상태 전수 확인. 수동 전체 체크포인트와 동시 타임라인의 전체 호출 8.423/8.430초를 각각 계측. 내부 `AppendAndApplyLocked` 직접 호출로 자동 진입을 만든 763행 합성 반례는 전체 체크포인트 약 8.895초·최대 단일 쓰기 잠금 약 8.899초로 분류. 정리 루트 부재 확인. 이 결과는 **공개 제품 호출의 동일 조건 도달성이나 HTTP 실패 원인 입증이 아니다** | [합성 진단 원출력](o14-diagnostic-final.log) |
| 공개 API 최종 진단 | 보완한 `--case 2049` exit 0. 수동 전체 체크포인트/동시 타임라인 호출은 8.410/8.418초. 공개 `PutObservationV2`의 서로 다른 유효 관측 1,526건(직렬화 payload 1,049,194B)으로 자동 체크포인트에 진입해 no-op 1회, 전체 재작성 0회, 물리 쓰기 0회. 공개 단일 호출 최대 18.508ms. 동일 root 재개방 후 관측 ID 1,526개·손상/투영/정리 오류 0. 프로세스 exit0·격리 root 삭제 확인 | [공개 경로 원출력](o14-public-diagnostic.log) |
| 실제 HTTP 집중 확인 | 최초 sandbox 실행은 localhost bind EPERM으로 제품 요청 전에 중단·정리됐다. 허용된 격리 재실행은 타임라인 HTTP 114개 전부 기존 4초 이내, 최대 967ms. 제품 프로세스 exit0·HTTP/RTSP 포트 해제·소유 root 삭제 | [준비 실패](o14-latency-focused.log), [실제 실행](o14-latency-focused-authorized.log) |
| 현행 5단계 통합 | `./server.sh verify-v410-recording-foundation --current-integration` exit0. HTTP API 35/35, 인증 40/40, lifecycle 10/10, default 46/46, 실제 앱 27/27. 두 기동의 EventRecord·각 완전 출력 2개·HTTP200·파일 해시·기존 영상 보존·재개방·정상 종료/포트 해제·격리 root 삭제 확인. 검증기 summary의 `currentIntegrationExecutionPass=true`, `fullFoundationPass=false`, `resourceTrendPass=false`, `uiFulltestPass=false`를 그대로 유지 | [통합 원출력](o14-full-integration.log) |

독립 probe는 HTTP 서버 자체를 열지 않는다. 8.435초는 **타임라인 호출 전체 시간**이며 순수 잠금 대기 시간이나 실제 HTTP 응답 시간이 아니다. 같은 catalog 잠금을 쓰는 수동 전체 체크포인트의 위험 후보이지만, 실제 자동 체크포인트의 해당 분기 진입이나 이전 실제 HTTP 실패의 원인을 입증하지 않는다. 2,049개 fixture는 삭제 완료 원본이므로 활성 이벤트 출력의 대량 매체 검사까지 검증하지 않는다.

## 확정 원인과 미해소 경계

- `RecordingCatalog::Checkpoint()`가 `mu_`를 잡은 채 `CheckpointLocked()` 전체를 실행한다. 직전 **순차 실행**의 잠금 점유는 8.428초였다. 동시 실행에서 같은 호출의 잠금 점유·세부 구간은 계측되지 않았다.
- 직전 순차 실행의 원장 전수 읽기·파싱은 약 3.829초, 원본 의미 재적용은 약 4.470초였다. 두 값은 동시 조회 8.435초와 동일 호출의 분해값이 아니다.
- 제품의 `AppendAndApplyLocked`는 자동 체크포인트 때 먼저 적격 no-op 경로를 시도하고, 부적격일 때 전체 경로로 간다. 8,196행이 cache 입장 상한을 넘는다는 사실만으로 매번 전체 경로를 실행한다고 판단하지 않는다.
- 위 합성 반례는 별도 mutation ID로 이미 삭제된 원본의 동일 tombstone을 내부 함수에 넣었다. 공개 `CompleteDeletionV2`는 같은 삭제를 중복 요청하면 조기 반환하므로, 이 합성 입력을 실제 운영 write 부하로 부르지 않는다. 공개 관측 쓰기는 자동 no-op까지만 도달했다. 새 원본의 유효 삭제 등으로 자동 전체 재작성에 도달하는 조건과 비용은 미확인이다.
- 앞서 실패한 실제 앱 HTTP 추적에는 느린 전체 체크포인트가 없다. 해당 실패는 타임라인 투영과 파생 작업 전이의 경쟁을 별도로 확인해야 한다.
- 재현 테스트는 의도적으로 기존 4초 조건에서 실패한다. timeout 연장, 체크포인트 주기 연장, 기존 검증 생략으로 PASS 처리하지 않는다.
- 기존 5단계 FAIL 뒤 현재 코드의 재실행은 통과했다. 앞선 실패를 지우거나 동일 부하에서 반드시 재현되지 않는다고 주장하지 않는다. 이번 턴에는 제품 코드를 바꾸지 않았으므로 다른 실행 조건의 지연 차이를 특정 수정의 인과 효과로 단정하지 않는다.

후속 판정: 공개 관측 부하에서는 자동 no-op과 재개방만 확인했다. 자동 전체 재작성의 정상 공개 호출 조건은 미확인으로 남겨 실제 장시간 검증에서 체크포인트·HTTP 지연 신호가 나오는지 대조한다. 신호 없이 수동 합성 수치만으로 잠금 구조를 변경하지 않는다. 코드가 변경되면 관련 복구/삭제/손상·SQLite fallback과 실제 5단계 통합의 증거 유효성을 다시 판단한다. 승인된 녹화 120분·새 소스 UI 및 최종 S11 판정은 이 집중 검증으로 대체하지 않는다.

토큰 start/end/consumed: 실행별 전용 집계 제공 없음. 실제 경과·정리 정보는 각 원출력의 `[exit]`, `[probe-process]`, `[cleanup]`에 보존했다.
