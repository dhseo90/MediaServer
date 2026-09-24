# LP26-O10 격리 누적 선행 진단 결과

## LP26-O14 누적 경로 분리와 현행 통합 재확인

독자/유지주기: S11 저장·HTTP 지연 원인 대조와 이후 장시간 검증까지. 아래는 이전 O13 실패를 소급 삭제하지 않는 현재 집중 검증 결과다.

- 수동 전체 체크포인트와 동시 타임라인은 2,049개 삭제 원본에서 각 약 8.41초였다. 실제 HTTP 또는 자동 처리의 값이 아니다. 공개 `PutObservationV2` 1,526건으로 자동 진입한 경우는 no-op 1회·전체 재작성 0회였고, 동일 root 재개방에서 ID·손상 0을 확인했다. 자동 전체 재작성의 정상 공개 도달성은 미확인이다. [상세](o14-contention.md) · [원출력](o14-public-diagnostic.log)
- 현행 실제 HTTP 집중 검사는 타임라인 114개 전부 기존 4초 이내(최대 967ms), exit0·포트/root 정리 통과. 최초 sandbox bind EPERM은 환경 준비 실패로 보존한다. [원출력](o14-latency-focused-authorized.log)
- 현행 5단계 통합은 API 35·인증 40·lifecycle 10·default 46·실제 앱 27개를 모두 통과했다. 두 기동 각각 실제 완전 출력 2개·HTTP200/해시·재기동 보존·정상 종료/정리를 확인했다. summary의 `currentIntegrationExecutionPass=true`이고 `fullFoundationPass=false`이므로 S11 전체·120분·UI PASS는 아니다. [원출력](o14-full-integration.log)

이번 턴 제품 로직 변경은 없다. 기존 타임라인 소유권 색인 변경은 현재 HEAD에 이미 포함돼 있으며, 다른 실행 부하의 결과 차이를 단일 수정의 인과효과로 단정하지 않는다.

## LP26-O13 재기동 경계 원인·한정 재검증

독자/유지주기: S11 실제 앱 통합 실패 원인과 실패 이력을 보존한다. 이 절은 전체 통합 PASS가 아니다.

| 실행 | 직접 관측 | 판정·후속 |
| --- | --- | --- |
| `--diagnose-restart-boundary` | 첫 기동 실제 출력 2개 이후 재기동 30초 관측 106표본. 이전 기동 끝 25초와 새 기동 시작 0초가 원본 순서에 함께 남고, 확정 원본 끝과 tap PTS의 250~500ms 창은 0회. 프로세스 exit0·포트 종료·격리 루트 104,936,583B 삭제 | 이전 epoch의 최신 원본을 재기동 tap PTS와 비교한 검증기 선행 조건 오류 확인. 제품 결함은 이 관측으로 확정하지 않음. [원출력](o13-restart-boundary.log) |
| 다음 경계 25초 실제 앱 | 첫 기동 25.333초 이벤트 참조는 생성됐으나 30초 안에 두 출력 미관측. 프로세스 exit0·포트 종료·격리 루트 94,614,343B 삭제 | 실패 보존. fixture EOS에 가까운 세 번째 경계는 두 출력 검증의 안정된 선행 조건이 아님. [원출력](o13-current-integration.log) |
| 두 번째 경계 16.667초 실제 앱 | 첫 기동 완전 출력 2개·HTTP200·해시·종료·재기동 기존 출력 2개 HTTP200 통과. 두 번째 기동은 17.0초 이벤트 후 새 작업 완료가 30초 내 관측되지 않아 실패. 종료 직전 작업은 `failed`; 종료 후 격리 복제본에서 `job-remux: work-cancelled` 확인 | 작업 취소는 검증기 시간초과 뒤 서버 종료에 따른 결과이므로 최초 대기 원인으로 단정하지 않음. 첫 기동의 완료 소요 약 25.4초, 두 번째는 요청 후 약 29.2초에 준비 전이하여 기존 30초 관측 안에 remux 완료 여유가 없었음. [원출력](o13-current-integration-r2.log) |
| 두 번째 경계 실패 정리 | 두 제품 프로세스 exit0·포트 종료. 첫 기동 때 만든 `projection-copy-1`을 두 번째 기동 실패 진단에 재사용해 복제본 불일치로 안전한 상태 기록 실패. 원출력의 격리 루트 239,081,304B가 남음. 종료 후 새 `projection-copy-2`에서 선택 참조 1건의 `failed` 상태·source 2·planned output 2·receipt 2·실제 output 0을 직접 대조. 원출력·상태·실패 코드 보존 후 루트 소유자·0700·실경로를 확인하고 해당 루트만 삭제, 부재 재확인(exit 0) | 원본 복제본의 시점 혼동은 검증기 결함. 재기동의 작업 미완료와 구분한다. 최초 cleanup FAIL 이력은 유지 |
| 재기동 조기 트리거 실제 앱 | 첫 기동 16.933초 완전 파일 2개, 재기동은 첫 기동의 확정된 8.333초 fixture 경계를 힌트로 8.633초 실제 이벤트를 발생시킴. 두 번째 기동도 완전 파일 2개·HTTP200·해시·기존 파일 불변·두 프로세스 exit0/포트 종료까지 확인 | `archiveProbe(2)`에서 전체 store의 `archive-not-regular-single-link`로 실패하므로 최종 통합 PASS 아님. [원출력](o13-current-integration-r3.log) |
| 재기동 조기 트리거 정리 진단 | 종료된 격리 저장소를 읽기 전용으로 확인: 파생 job 상태 `complete` 4, `failed` 1, `committed` 1. 마지막 committed job의 최종 파일 2개와 임시 파일 2개가 각각 동일 inode 하드링크(`nlink=2`)라 전체 store를 단일 링크만 허용하는 archive 검사와 충돌. 원출력의 임시 루트 180,100,905B가 진단 실패 뒤 남음. 원출력·상태 집계·링크 수 보존 뒤 루트 소유자·0700·실경로 확인, 해당 루트만 삭제·부재 확인(exit0) | 선택한 새 이벤트의 출력 성공과 **다른 동시 작업**의 커밋/정리 미완료를 구분해야 함. 서버 종료 전에 파생 publication의 정착을 확인하고 그 뒤 archive 검사 필요. 최초 cleanup FAIL 이력 유지 |
| 같은 경계 정착 보완 후 실제 앱 | 첫 기동 17.033초 이벤트 참조·intent까지 확인, 30초 안 두 출력 미관측. 종료 후 안전한 복제본 상태 진단은 선택 작업 `complete`·출력 2개를 확인했지만 실행 중 관측 FAIL은 유지. 프로세스 exit0·포트 종료·격리 루트 195,828,612B 삭제 | 키프레임 16.667초 경계의 자연 원본 대기와 렌더가 30초 검사 창에 근접한다. 시간제한은 늘리지 않고 실제 입력 키프레임 8.333초를 두 기동 모두에 사용하도록 선행 조건을 바꾼다. [원출력](o13-current-integration-r4.log) |
| 입력 키프레임 8.333초 실제 앱 | ffprobe로 고정 입력의 0/8.333/16.667/25초 키프레임과 30초 길이를 확인. 첫 기동 실제 이벤트·완전 출력2개·HTTP200 후, 별도 archive 정착 15초 조건에 걸려 재기동 미실행. 종료 추적상 같은 프레임 4개 작업은 기동 후 약 23.8/29.4/34.9/40.0초에 모두 complete. 프로세스 exit0·포트 종료·격리 루트 176,520,003B 삭제 | 15초는 선택 출력 관측 뒤 다른 직렬 작업의 종료를 보기에 부족한 검증기 신규 기준이었다. 선택 출력 30초·HTTP 4초는 유지, 종료 전 정착은 제품의 원본 대기 60초 상한에 결박하고 상태별 계측 추가. [원출력](o13-current-integration-r5.log) |
| 정착 대기 보완 후 실제 앱 | 첫 기동 실제 두 출력·복제본 바이트/해시·복구 PASS, 재기동 새 이벤트 두 출력·HTTP200 PASS. 두 번째 정착 조회에서 타임라인 전체 file-group의 펼친 멤버 상한 4,096개가 걸려 `page-bound`로 FAIL. 종료 후 두 프로세스 exit0·포트 종료·루트 413,448,824B 삭제 | 전체 타임라인의 안전 상한을 늘리지 않고 기존 서버 완료 추적의 행별 종단 상태와 저장소 단일 링크 검사만 정착 판정에 사용. [원출력](o13-current-integration-r6.log) |
| 완료 추적 정착 보완 후 단독 실제 앱 | `node scripts/internal/verify_recording_current_app.mjs` exit 0, 개별 27/27. 두 기동 각각 실제 EventRecord·완전 출력 2개·HTTP200·파일 해시와 기존 파일 불변·archive 복구 확인. 두 프로세스 exit0·포트 종료·격리 루트 393,949,346B 삭제 | 단독 실제 앱 범위 PASS. 전체 5단계 통합·누적 자원·장시간/UI PASS로 확대하지 않음. [원출력](o13-current-integration-r7.log) |
| 현행 5단계 통합 | `./server.sh verify-v410-recording-foundation --current-integration` exit 1. HTTP API 35/35, Auth 40/40, lifecycle 10/10, default 구성 46/46 통과. 실제 앱 두 번째 기동의 타임라인 GET 15번째가 HTTP 응답 헤더 4,001ms로 기존 4초 제한을 초과. 해당 단계 19 pass/1 fail, `fullFoundationPass=false`. 두 프로세스 exit0·포트 종료·격리 루트 376,531,172B 삭제 | 전체 통합 FAIL. 반복 실행하지 않고 같은 요청의 지연 증거로 분기: Query 약 3,994ms 중 Finish 약 2,366ms, catalog projection 잠금 점유 약 1,628ms, 잠금 대기 합계 약 1,657ms, 응답 직렬화 약 18ms. 잠금·매체 검증의 비용 개선 계약이 필요하며 HTTP 제한 연장이나 재생 안전성 완화는 하지 않음. [원출력](o13-full-integration.log), [지연 추적](../s11-preparation-mapping/latency-7b820213-4e1a-4f2f-86c9-0399ec607c75.json) |

이 검사에는 외부 서비스·실기기를 사용하지 않았다. HTTP 개별 응답 제한 4초, 제품의 원본 대기 상한 60초는 바꾸지 않았다.
토큰 start/end/consumed는 이 실행의 집계 제공이 없어 미집계다. 실제 경과는 각 원출력의 마지막 요약을 따른다.

## LP26-O12 실제 통합 재검증 진행 중: 실패·정리 기록

독자/유지주기: S11 4번 집중 회귀의 최초 실패와 한정 재검증을 보존한다.
완료 판정이 아니다. 최종 제품 범위·전체 릴리즈 gate는 미확인이다.
`o12-recovery.log`의 두 행끝 공백은 Git 공백 검사 때문에 표시본에서만 제거했다. 원출력 바이트는 [압축본](o12-recovery.log.gz)에 보존했다.

| 실행 | 관측 결과 | 원출력 |
| --- | --- | --- |
| 첫 `--current-integration` | 앞 네 단계 PASS. 실제 앱의 선택 참조는 네 번째 직렬 렌더 작업으로 15.549초 대기했고, 관측 제한 종료 직후 job complete·출력2개를 복제본에서 확인했다. 타임라인의 두 출력 관측은 FAIL로 유지 | [첫 실행](o12-current-integration.log) |
| 첫 실행 정리 | 실제 앱 프로세스 exit0·HTTP/RTSP 포트 종료·격리 root 172,594,186B 삭제 확인 | [첫 실행](o12-current-integration.log) |
| 두 번째 `--current-integration` | 검증기를 dispatch 응답 첫 이벤트 선택으로 바꾸고 같은 시간 제한으로 재검증. 첫 기동 실제 출력2개·HTTP200·파일 해시·원본 불변·정상 종료 PASS. 두 번째 기동 기존 출력2개 HTTP200 뒤 좁은 경계 포착이 `interior-source-boundary-timeout`으로 FAIL; 새 이벤트/출력·전체 통합 PASS 아님 | [두 번째 실행](o12-current-integration-r2.log) |
| 두 번째 실행 정리 | 두 제품 프로세스 exit0·포트 종료. 진단기가 첫 기동 참조를 두 번째 기동 실패에 사용해 state evidence를 확보하지 못했고, 격리 root 104,744,895B가 남아 최초 cleanup FAIL. 원출력·요약 보존과 소유자/경로 확인 후 해당 root만 삭제하고 부재 재확인(exit0). 최초 FAIL은 유지 | [두 번째 실행](o12-current-integration-r2.log) |
| 세 번째 `--current-integration` | 같은 경계에서 tap PTS를 8회까지 빠르게 재관측하고 이전 기동 참조를 초기화한 뒤 원래 제한으로 실행. 첫 기동 출력2개·HTTP200·해시·기존 데이터 재조회 PASS. 두 번째 기동에서 동일 `interior-source-boundary-timeout`으로 FAIL. 따라서 좁은 창만이 원인이라는 가설은 불충분하며 전체 통합은 미완료 | [세 번째 실행](o12-current-integration-r3.log) |
| 세 번째 실행 정리 | 두 제품 프로세스 exit0·HTTP/RTSP 포트 종료, 격리 root 105,119,536B 삭제·부재 확인. 진단은 해당 기동의 참조 부재로 미실행이며 첫 기동 참조를 오용하지 않음 | [세 번째 실행](o12-current-integration-r3.log) |

두 번째 기동은 source finalize가 진행됐고 새 epoch도 발생했다. 타임라인 조회가 약 0.5초여서
좁은 tap PTS 창 누락을 의심했지만, 창 안 재관측 후에도 같은 실패가 반복됐다. 최신 원본의
epoch/순서와 tap PTS가 같은 축인지, 재기동 시 원본 선택이 맞는지 직접 계측해야 한다.
이는 제품 결함 확정도, 검증기 PASS도 아니다. 같은 전체 검사를 근거 없이 반복하지 않는다.
HTTP 4초·복구 15초 기준은 변경하지 않았다. token start/end/consumed는 집계 제공이 없어 미집계.
LP26-O12 경계 재관측 자체검사의 첫 fixture는 250ms 하한값을 실패로 잘못 예상해
50/51 FAIL이었다. 하한 포함 계약대로 입력을 249.999999ms로 바로잡고 동일 검사를 재실행해 51/51 PASS했다.
이는 실제 앱 통합 PASS를 대체하지 않는다.

### LP26-O12 실행 개별 결과 전수

아래 행은 원출력의 `[pass]`·`[fail]` 전수다. 실행하지 않은 항목은 이 표에 넣지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| o12-current-integration.log:4 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:48 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:97 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:98 | D3D-07 valid MP4 free atom64MiB·최종 physical/hash 검증 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:114 | D02-03 동일 source/channel/ns immutable snapshot 전달 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:115 | D02-03 다른 channel 증거 혼합 거부 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:116 | D02-03 stop namespace 증거 삭제 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:117 | D02-03 cache capacity 이전 namespace eviction · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:118 | D02-03 전체 stop 후 publication/query 거부 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:119 | D02-01 신규 root 자동 내구 store identity · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:120 | D02-01 재개방 동일 store identity · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:121 | D02-01 서로 다른 root 난수 identity 구별 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:122 | D02-02 managed lease 동시 소유 거부 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:123 | D02-01 명시 ID 기존 계약 유지 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:124 | D02-02 명시 ID 충돌 원본 marker 보존 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:125 | D02-02 같은 init 내구 ID 복구 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:126 | D02-02 legacy nonempty 변환·삭제 거부 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:127 | D02-02 손상/unknown marker 덮어쓰기 거부 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:128 | D02-06 실제 H264 입력 준비 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:131 | D02-05 실제 V2 finalized startup 미디어 전수 검사 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:132 | D02-05 실제 V2 size/hash 손상 감지·catalog Mark · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:133 | D02-10 default 준비16s·500ms·33회 예산 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:134 | D02-10 overflow 요청은60s/121회 capped 사유 보존 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:135 | D02-06 on 구성의 동일 managed store/catalog writer 결박 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:136 | D02-07 빈 저장소 runtime 복구 함수 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:137 | D02-06 off managed 형식 유지·미디어 비생산 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:138 | D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:139 | D02-11 raw stream/channel/sourcecontext 모순은 신규 저장·접수 없음 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:142 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:143 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:144 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:145 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:146 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:147 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:149 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:150 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:151 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:152 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:153 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:154 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:155 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:156 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:158 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:159 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:167 | D02-04/10 실제 default10s+post5s 후행 finalize·동시 실제decoder cache·2출력 decode · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:169 | D02-01 crypto-off OS CSPRNG 생성/재개방 identity · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:170 | D02-08 provider 조회 재진입·동시 멱등·Stop 후 Submit 재검사 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:173 | D02-07 runtime startup committed-parent recovery/보호/물리검사 순서 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:176 | D02-07 runtime startup blocked-parent recovery/보호/물리검사 순서 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:178 | D02-07 runtime startup intent recovery/보호/물리검사 순서 · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:201 | S11-CI09 product-1 healthy isolated ICE · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:541 | S11-CI07 run1 actual tuple EventRecord reference · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:1185 | LP03-B diagnostic copy bytes/hash exact · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-current-integration.log:1188 | LP03-B original unchanged after diagnostic · [원출력](o12-current-integration.log) | pass | 해당 개별 assertion |
| o12-recovery.log:2 | truncated open · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:3 | truncated uncommitted before append · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:4 | truncated append:  · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:5 | truncated valid2 and next ID preserved · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:6 | truncated quarantine byte exact · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:7 | truncated restart no mutation · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:8 | truncated second append retained · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:9 | truncated no redundant archive · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:10 | complete-no-lf open · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:11 | complete-no-lf uncommitted before append · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:12 | complete-no-lf append:  · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:13 | complete-no-lf valid2 and next ID preserved · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:14 | complete-no-lf quarantine byte exact · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:15 | complete-no-lf restart no mutation · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:16 | complete-no-lf second append retained · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:17 | complete-no-lf no redundant archive · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:18 | empty journal is valid · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:19 | empty append retained · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:20 | large newline prefix byte preserved · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:21 | middle corrupt line preserved and valid entries read · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:22 | directory quarantine journal open · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:23 | directory quarantine failure original unchanged · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:24 | symlink quarantine journal open · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:25 | symlink quarantine failure original unchanged · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:26 | hardlink quarantine journal open · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:27 | hardlink quarantine failure original unchanged · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:28 | exact quarantine journal open · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:29 | existing exact quarantine restart reuse · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:30 | journal symlink refused · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:31 | journal hardlink refused · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:32 | inode pin open · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:33 | replacement inode append/reopen/replay refused · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:34 | catalog refuses failed journal Replay · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:35 | user parent symlink refused · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:36 | parent traversal refused · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:37 | deleted journal initial open · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:38 | deleted journal reopen does not recreate · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:39 | deleted parent reopen does not recreate · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:40 | macOS tmp system alias allowed · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-recovery.log:41 | oversized tail fails closed with original bytes · [원출력](o12-recovery.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:4 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:48 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:97 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:98 | D3D-07 valid MP4 free atom64MiB·최종 physical/hash 검증 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:114 | D02-03 동일 source/channel/ns immutable snapshot 전달 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:115 | D02-03 다른 channel 증거 혼합 거부 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:116 | D02-03 stop namespace 증거 삭제 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:117 | D02-03 cache capacity 이전 namespace eviction · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:118 | D02-03 전체 stop 후 publication/query 거부 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:119 | D02-01 신규 root 자동 내구 store identity · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:120 | D02-01 재개방 동일 store identity · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:121 | D02-01 서로 다른 root 난수 identity 구별 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:122 | D02-02 managed lease 동시 소유 거부 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:123 | D02-01 명시 ID 기존 계약 유지 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:124 | D02-02 명시 ID 충돌 원본 marker 보존 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:125 | D02-02 같은 init 내구 ID 복구 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:126 | D02-02 legacy nonempty 변환·삭제 거부 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:127 | D02-02 손상/unknown marker 덮어쓰기 거부 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:128 | D02-06 실제 H264 입력 준비 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:131 | D02-05 실제 V2 finalized startup 미디어 전수 검사 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:132 | D02-05 실제 V2 size/hash 손상 감지·catalog Mark · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:133 | D02-10 default 준비16s·500ms·33회 예산 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:134 | D02-10 overflow 요청은60s/121회 capped 사유 보존 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:135 | D02-06 on 구성의 동일 managed store/catalog writer 결박 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:136 | D02-07 빈 저장소 runtime 복구 함수 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:137 | D02-06 off managed 형식 유지·미디어 비생산 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:138 | D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:139 | D02-11 raw stream/channel/sourcecontext 모순은 신규 저장·접수 없음 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:142 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:143 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:144 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:145 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:146 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:147 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:149 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:150 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:151 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:152 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:153 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:154 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:155 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:156 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:158 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:159 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:167 | D02-04/10 실제 default10s+post5s 후행 finalize·동시 실제decoder cache·2출력 decode · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:169 | D02-01 crypto-off OS CSPRNG 생성/재개방 identity · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:170 | D02-08 provider 조회 재진입·동시 멱등·Stop 후 Submit 재검사 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:173 | D02-07 runtime startup committed-parent recovery/보호/물리검사 순서 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:176 | D02-07 runtime startup blocked-parent recovery/보호/물리검사 순서 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:178 | D02-07 runtime startup intent recovery/보호/물리검사 순서 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:197 | S11-CI09 product-1 healthy isolated ICE · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:456 | S11-CI07 run1 actual tuple EventRecord reference · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:782 | S11-CI07 run1 literal two output files all pages · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:784 | S11-CI07 run1 output1 HTTP200 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:786 | S11-CI07 run1 output2 HTTP200 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:791 | S11-CI08 product-1 exit0 ports returned · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:792 | S11-CI11 copy1 bytes/hash exact before Open · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:793 | S11-CI11 copy1 same-axis request two sources typed proof · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:794 | S11-CI11 original1 unchanged by copy recovery · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:795 | S11-CI07 output owned regular hash dj-d1f4bd090f2d25fb2c22c3efccfb35514044a3539953e58f24b251eb386a8621-o0 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:796 | S11-CI07 output owned regular hash dj-d1f4bd090f2d25fb2c22c3efccfb35514044a3539953e58f24b251eb386a8621-o1 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:820 | S11-CI09 product-2 healthy isolated ICE · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:825 | S11-CI08 retained output HTTP200 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:827 | S11-CI08 retained output HTTP200 · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-current-integration-r3.log:1061 | current actual app: interior-source-boundary-timeout · [원출력](o12-current-integration-r3.log) | fail | 최초·반복 실패 유지 |
| o12-current-integration-r3.log:1065 | S11-CI08 product-2 exit0 ports returned · [원출력](o12-current-integration-r3.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:1 | B01 V2 tombstone preserves immutable segment without legacy UTC range · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:2 | B02 V2 state records reject malformed payload entity and duplicate conflicts · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:3 | B03 V2 pending corrupt and deleted overlays never mutate finalized payload · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:4 | B04 V2 invalid transitions and finalize retries cannot resurrect state · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:5 | B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:6 | B06 V2 capacity deletion follows durable order despite reversed UTC · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:7 | B07 mixed legacy and multiple stores use deterministic nonchronological ordering · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:8 | B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:9 | B09 V2 unknown or overflowing age remains capacity eligible · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:10 | B10 V2 class quotas and disk reserve remain separated · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:11 | B11 V2 pin and hold protect deletion and corruption · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:12 | B12 V2 pending and corrupt bytes remain charged but are not automatic victims · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:13 | B13 V2 apply persists pending before unlink and tombstone after unlink · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:14 | B14 V2 interrupted deletion recovers without resurrection · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:15 | B15 V2 corrupt cleanup requires explicit manual reason · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:16 | B16 V2 continuous media with unknown UTC resolves a healthy held fd · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:17 | B17 V2 wrong channel event and fallback collision cannot expose media · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:18 | B18 V2 missing symlink and multiple hardlink media reject without hold leak · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:19 | B19 V2 same size corruption and invalid container reject without hold leak · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:20 | B20 V2 deletion and playback hold races have one safe winner · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:21 | B21 borrowed fd inspection preserves caller ownership and detects file changes · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:22 | B23 legacy store port refuses unsupported V2 deletion · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:24 | B22 V2 playback is unavailable without GStreamer · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-retention-v2.log:25 | B23 legacy store port refuses unsupported V2 deletion · [원출력](o12-retention-v2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:4 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:48 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:97 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:98 | D3D-07 valid MP4 free atom64MiB·최종 physical/hash 검증 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:114 | D02-03 동일 source/channel/ns immutable snapshot 전달 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:115 | D02-03 다른 channel 증거 혼합 거부 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:116 | D02-03 stop namespace 증거 삭제 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:117 | D02-03 cache capacity 이전 namespace eviction · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:118 | D02-03 전체 stop 후 publication/query 거부 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:119 | D02-01 신규 root 자동 내구 store identity · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:120 | D02-01 재개방 동일 store identity · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:121 | D02-01 서로 다른 root 난수 identity 구별 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:122 | D02-02 managed lease 동시 소유 거부 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:123 | D02-01 명시 ID 기존 계약 유지 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:124 | D02-02 명시 ID 충돌 원본 marker 보존 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:125 | D02-02 같은 init 내구 ID 복구 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:126 | D02-02 legacy nonempty 변환·삭제 거부 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:127 | D02-02 손상/unknown marker 덮어쓰기 거부 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:128 | D02-06 실제 H264 입력 준비 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:131 | D02-05 실제 V2 finalized startup 미디어 전수 검사 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:132 | D02-05 실제 V2 size/hash 손상 감지·catalog Mark · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:133 | D02-10 default 준비16s·500ms·33회 예산 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:134 | D02-10 overflow 요청은60s/121회 capped 사유 보존 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:135 | D02-06 on 구성의 동일 managed store/catalog writer 결박 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:136 | D02-07 빈 저장소 runtime 복구 함수 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:137 | D02-06 off managed 형식 유지·미디어 비생산 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:138 | D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:139 | D02-11 raw stream/channel/sourcecontext 모순은 신규 저장·접수 없음 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:142 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:143 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:144 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:145 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:146 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:147 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:149 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:150 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:151 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:152 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:153 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:154 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:155 | D02-06 off/on 재개방 동일 store identity · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:156 | D02-07 실제 producer 시작 전 runtime 복구 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:158 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:159 | D02-08 실제 source/session 종료 owner0 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:167 | D02-04/10 실제 default10s+post5s 후행 finalize·동시 실제decoder cache·2출력 decode · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:169 | D02-01 crypto-off OS CSPRNG 생성/재개방 identity · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:170 | D02-08 provider 조회 재진입·동시 멱등·Stop 후 Submit 재검사 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:173 | D02-07 runtime startup committed-parent recovery/보호/물리검사 순서 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:176 | D02-07 runtime startup blocked-parent recovery/보호/물리검사 순서 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:178 | D02-07 runtime startup intent recovery/보호/물리검사 순서 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:197 | S11-CI09 product-1 healthy isolated ICE · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:533 | S11-CI07 run1 actual tuple EventRecord reference · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:862 | S11-CI07 run1 literal two output files all pages · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:864 | S11-CI07 run1 output1 HTTP200 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:866 | S11-CI07 run1 output2 HTTP200 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:871 | S11-CI08 product-1 exit0 ports returned · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:872 | S11-CI11 copy1 bytes/hash exact before Open · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:873 | S11-CI11 copy1 same-axis request two sources typed proof · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:874 | S11-CI11 original1 unchanged by copy recovery · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:875 | S11-CI07 output owned regular hash dj-b4306e48e6127a063b0f474937b2f2084d82c1fcd733d6bdbbaf6c0715b48b24-o0 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:876 | S11-CI07 output owned regular hash dj-b4306e48e6127a063b0f474937b2f2084d82c1fcd733d6bdbbaf6c0715b48b24-o1 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:900 | S11-CI09 product-2 healthy isolated ICE · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:905 | S11-CI08 retained output HTTP200 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:907 | S11-CI08 retained output HTTP200 · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:1111 | current actual app: interior-source-boundary-timeout · [원출력](o12-current-integration-r2.log) | fail | 최초·반복 실패 유지 |
| o12-current-integration-r2.log:1115 | S11-CI08 product-2 exit0 ports returned · [원출력](o12-current-integration-r2.log) | pass | 해당 개별 assertion |
| o12-current-integration-r2.log:2165 | LP03-B diagnostic unavailable · [원출력](o12-current-integration-r2.log) | fail | 최초·반복 실패 유지 |
| o12-corruption.log:2 | journal open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:3 | catalog seed open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:4 | seed finalized · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:5 | corruption durable append · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:6 | catalog replay open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:7 | corruption replay lifecycle is Corrupt · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:8 | fallback journal open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:9 | fallback catalog open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:10 | fallback seed base · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:11 | fallback resolved locator literal segment UTC PTS · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:12 | fallback observation stored before corruption · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:13 | fallback observation locator initially available · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:14 | fallback unknown ID and reason refused noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:15 | fallback acquire hold · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:16 | fallback held corruption refused noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:17 | fallback release hold · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:18 | fallback mark corruption · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:19 | fallback repeat corruption noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:20 | fallback only lifecycle changed bytes identity preserved · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:21 | fallback corrupt media location blocked · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:22 | fallback V2 locator revoked · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:23 | fallback pending link segments seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:24 | fallback pending link seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:25 | fallback pending source output refused noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:26 | fallback event link metadata preserved · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:27 | fallback deletion-pending deletion seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:28 | fallback deletion-pending mark rejected noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:29 | fallback deletion-done deletion seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:30 | fallback tombstone seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:31 | fallback deletion-done mark rejected noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:32 | fallback identical finalized replay seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:33 | fallback conflicting finalized seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:34 | fallback entity mismatch seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:35 | fallback invalid first valid later same mutation ID seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:36 | fallback malformed and deletion-priority seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:37 | fallback same mutation ID different payload seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:38 | fallback restart · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:39 | fallback restart never resurrects corrupt identity · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:40 | fallback query keeps corrupt pending excludes deleted · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:41 | fallback deletion priority and unknown no creation · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:42 | fallback invalid mutations diagnosed exact count · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:43 | sqlite journal open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:44 | sqlite catalog open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:45 | sqlite seed base · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:46 | sqlite resolved locator literal segment UTC PTS · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:47 | sqlite observation stored before corruption · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:48 | sqlite observation locator initially available · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:49 | sqlite unknown ID and reason refused noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:50 | sqlite acquire hold · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:51 | sqlite held corruption refused noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:52 | sqlite release hold · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:53 | sqlite mark corruption · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:54 | sqlite repeat corruption noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:55 | sqlite only lifecycle changed bytes identity preserved · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:56 | sqlite corrupt media location blocked · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:57 | sqlite V2 locator revoked · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:58 | sqlite SQL lifecycle corrupt · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:59 | sqlite SQL codecs_json original metadata · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:60 | sqlite pending link segments seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:61 | sqlite pending link seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:62 | sqlite pending source output refused noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:63 | sqlite event link metadata preserved · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:64 | sqlite deletion-pending deletion seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:65 | sqlite deletion-pending mark rejected noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:66 | sqlite deletion-done deletion seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:67 | sqlite tombstone seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:68 | sqlite deletion-done mark rejected noappend · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:69 | sqlite identical finalized replay seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:70 | sqlite conflicting finalized seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:71 | sqlite entity mismatch seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:72 | sqlite invalid first valid later same mutation ID seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:73 | sqlite malformed and deletion-priority seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:74 | sqlite same mutation ID different payload seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:75 | sqlite restart · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:76 | sqlite restart never resurrects corrupt identity · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:77 | sqlite query keeps corrupt pending excludes deleted · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:78 | sqlite deletion priority and unknown no creation · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:79 | sqlite invalid mutations diagnosed exact count · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:80 | sqlite restart SQL lifecycle parity · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:81 | sqlite SQL deletion precedence · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:82 | sqlite rebuild excludes rejected envelopes · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:83 | sqlite invalid first valid later SQL exact binding · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:84 | sqlite projection failover seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:85 | sqlite SQLite failure trigger · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:86 | sqlite projection failure keeps durable memory state · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:87 | sqlite remove projection trigger · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:88 | sqlite fallback restart SQL repaired · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:89 | order journal open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:90 | order corruption-before-create-after seed · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:91 | order catalog open · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:92 | order memory corrupt · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |
| o12-corruption.log:93 | identical envelope accepted ordinal SQL parity · [원출력](o12-corruption.log) | pass | 해당 개별 assertion |

### 문서 마감 검증

기록 담당 실행: `./server.sh verify-docs-links` exit0(318md/12065local links/22images/174anchors/fail0),
`./server.sh verify-docs-ui-assets` exit0(10/10), `git diff --check` exit0. 테스트/제품 재실행은 없다.
token start/end/consumed 미집계(집계 미제공), 도구 wall 각1초 미만이며 정확한 suite elapsed 출력은 없다.
임시root/서버/port 생성 없음. 다음은 assets 개별 결과다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| docs links | 위 local link/anchor 전수,stage2 실제 절 anchor 포함 | pass |
| assets1 | README uses only representative product UI screenshots | pass |
| assets2 | English README uses English UI screenshots | pass |
| assets3 | UI guide keeps product screenshots in the shared asset set | pass |
| assets4 | docs UI asset policy documents capture rules | pass |
| assets5 | managed UI asset manifest stays complete | pass |
| assets6 | capture script owns every documented UI asset | pass |
| assets7 | docs capture covers current screenshots | pass |
| assets8 | representative screenshot docs do not point at stale visual baselines | pass |
| assets9 | docs UI asset directory contains managed PNG files | pass |
| assets10 | VA documentation images keep full video frame bounds | pass |
| diffcheck | git diff --check | pass |

## Stage2 bounded focused 최종 기록

독자/유지주기: S11 2번 집중 안정화의 소스변경·실패·재검증·정리 보존. 기존 O10 A~G와 LP24 정의의
승인된 재검증으로 실행했으며 **제품 보완에 대한 새 실행 전 정의가 있었다고 소급 주장하지 않는다**.
source 기준 HEAD `dbdfcba2cb941a8d6fc9b372a1351021eddf5c29` 위 미커밋 변경이며,
O10 최종 원출력 앞부분의 실제 source SHA256으로 초기 원본과 구분한다.

### 구현과 범위

메인 담당은 `recording_catalog.h/cpp`에서 Open-local strict 검증이 끝난 **동일 전체 원장**에만 SQLite 재구축의
두번째 Preflight를 생략했다. 변경/pending/독립 rebuild는 strict 경로를 유지한다.
Rebuild는 DELETE부터 전 행 projection까지 단일 SQLite transaction으로 묶고 RAII rollback을 둔다.
기존 단건 append projection은 transaction 소유 경로를 유지한다.
SQLite 재구축의 bound 재사용은 원장 view/link/내용에 결박된 이미 검증된 live binding에 한정하며
비정규 입력은 기존 canonical SQLite bytes를 유지한다. JSON/API/schema·시간/ID·원장내구성·한도를 바꾸지 않았다.
관측기 cadence 변경은 앞 G절의5초 start-to-start 목표이며 HTTP4초/native3초/표본15초/복구15초는 유지한다.

LP24 검증기는 새 내부 projection 함수로 계측 위치를 옮기고 같은 원장일 때 rebuild Preflight의 예상 재파싱을0으로 교정했다.
이 준비 수정의 실제 실패2회를 아래에 보존한다. 숫자0만 맞추고 strict/변경/권한/ordinal 반례를 제거한 것이 아니다.

### 실행 결과와 최초/중간 실패

| 명령/시점 | exit·결과 | 증거·해석 |
| --- | --- | --- |
| `./server.sh build` 최종 |0, 메인 직접 관측|이번 원출력 미보존. 과거 build로그로 대체하지 않음 |
| `bash scripts/internal/verify_recording_checkpoint_cache.sh` 최종 |0,46/46 메인 직접 관측|이번 원출력 미보존; 개별46행을 추정복원하지 않음 |
| LP24 full 최초 sandbox |실패,compile SIGTERM/EPERM|[batch-green](../s11-preparation-mapping/lp24-recovery-lp26-batch-green.txt): process 관측권한 오류, 제품회귀 아님. 초기 cleanup 미완료는 아래 사후 정리로 닫음 |
| LP24 full elevated |1,13pass/1fail|[elevated](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt): SQLite preflight/projection 재사용 oracle 실패 |
| LP24 full oracle 교정 중간 |1,13pass/1fail|[oracle](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt): 동일 제목 실패 재현; 계측 위치/예상호출 교정 이력 |
| LP24 full batch-contract |0,14/14|[contract](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt): 중간 소스 결과, 최종과 구분 |
| `node scripts/internal/verify_recording_recovery_content.mjs green lp24-recovery-lp26-bound-proof full` 최종 |0,14/14|[bound-proof](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt), compile0,focused3599ms |
| preflight-only2049 |복구15초 실패, 메인 직접 관측|원출력 미보존. initial11.211초 등 수치는 참고보고이며 직접 보존증거로 승격하지 않음 |
| `bash scripts/internal/verify_recording_accumulation_probe.sh --case 2049` batch |1/38초|[batch2049](measurement-2049-batch.log), 복구15초 중단·뒤 단계 건너뜀 |
| 동일 wrapper `--case 1020` batch |0/36초|[batch1020](measurement-1020-batch.log), 복구7.520484초,cp4.130977/2.405867초. 최종 bound-proof 이전 소스 |
| 동일 wrapper `--case 2049` 최종 |0/62초|[bound-proof2049](measurement-2049-bound-proof.log), 아래 전 단계 완료 |
| `bash scripts/internal/verify_recording_current_observer.sh --app-observe` 최종 |0, 메인 관측 전체 약53초|[app](app-observe-bound-proof.log):71pass/0fail, Node46877ms,관측30140.199ms,child3종료·UDP종료·root삭제 |

최초 합산15초 fixture 오류와 초기2049 실패는 위 초기 이력에 그대로 남는다.
LP24 파일명 `green`은 판정이 아니다. 실제 phase expected=false/code1 또는 EPERM 실패를 표에서 FAIL로 보존했다.
LP24의 `[not-run] realistic fifteen-second fixture: 2`는 실제 fixture2개 미실행이다.
O10 synthetic과 LP24 focused가 이 두 실제 fixture나 실제 누적 HTTP 검사까지 대체하지 않는다.

### 최종2049 직접 측정

| 항목 | 값 | 판정 경계 |
| --- | ---: | --- |
| initial drain |11.256초/8196행|관측15초 안,exact count/type |
| strict recovery |12.126757초|독립15초 안,count8196/deleted2049/zero recovery error |
| 비활성 첫/끝 binding |0.005318초|cold 상세 재획득 |
| cold checkpoint |7.836503초|독립15초 안,originalApplied8196 |
| repeat checkpoint |8.427043초|독립15초 안,originalApplied8196 |
| cache |둘 다 false,재사용0|8196>8192로 full fallback 실제 확인;64MiB 기준 변경 없음 |
| 실제 inode회전 후 drain |10.802480초|fresh0,rotation1,동일prefix |
| native high-water |367,738,880B|1GiB 안,누수 판정 아님 |
| catalog process 전체 |28.448929초|단계합계이며15초 복구기준과 혼동 금지,기술적65초 안 |
| 소유root 최종 |38,457,729B|448MiB 안,삭제·부재 확인 |

cold/repeat checkpoint가4초보다 길다는 사실은 실제4초 HTTP 안전성의 보장이 없음을 뜻한다.
실제 앱30초 준비 실행은 두채널 각각 finalized14/deleted12,표본7,maxGap5003.754ms,
disable/restart/reenable 새녹화를 확인했지만 규모는106 observed mutations 수준이다.
HTTP4초 검사 실행과 통과는 해당 짧은 환경에 한정한다. 헤더 연결 준비 중 error 진단행은 존재하므로
전체 로그가 HTTP error0이라고 주장하지 않는다. resourceTrendPass=false,postWarmup=insufficient,
longrunObservationCompleted=false,uiFulltestPass=false를 유지한다.

### 증거 유효 범위와4번 잔여

| 항목 | 유지/무효/미실행 | 이유·다음 경계 |
| --- | --- | --- |
| 초기 RED·fixture오류·2049 FAIL |역사적 증거 유지|최종PASS가 삭제/소급 대체하지 않음 |
| 초기/중간 복구·projection 성능값 |최종 제품 성능증거로 무효|catalog구현 변경; 원인분석 비교자료로만 유지 |
| 기존 cadence 표본/간격 evidence |변경된 관측기 장시간 성공 근거로 사용불가|추가 고정5초 제거; 실제 최종120분 미실행 |
| 최종 LP24·O10·앱준비 |bounded focused 범위만 유효|현재소스 raw와 명시된 oracle이 있는 범위 |
| build·LP15 최종 |메인 직접 관측,raw미보존|완전한 개별 원출력 감사 불가,과거로그 대체 금지 |
| 누적1020 동시 HTTP/retention/checkpoint |4번 잔여·미실행|실제 병행 lock wait/header/body·15초관측 안전성 미확정 |
| 최종120분·전체통합·UI |4번 잔여·미실행|집중 synthetic/30초 준비는 대체증거 아님 |

따라서 stage2 **bounded focused 통과**이지 전체 release gate 완료/누적 실제HTTP 해결/장시간 PASS는 아니다.
raw 미보존 build/LP15와 preflight-only 실행 한계는 해소됐다고 기록하지 않는다.

### Stage2 개별 원출력 결과

아래는 원출력의 모든 pass/fail 행을 실행별 순서대로 보존한다. app 반복채널 assertion도 개별 행이며,
계측 cost 전수와 HTTP timing의 안전 routeClass/elapsed/status 개별행은 링크한 원출력에 보존한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| measurement-2049-batch.log #1: FC01 exact insertion checks count=102 | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #2: seed FE02 writer start | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #3: seed FE04 bound finalized mutation segment0 | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #4: LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #5: LP26-O10-B 2049 initial exact-count-prefix | [동일 원출력](measurement-2049-batch.log) | pass |
| measurement-2049-batch.log #6: LP26-O10 stage-time-cap | [동일 원출력](measurement-2049-batch.log) | fail |
| measurement-1020-batch.log #1: FC01 exact insertion checks count=102 | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #2: seed FE02 writer start | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #3: seed FE04 bound finalized mutation segment0 | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #4: LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #5: LP26-O10-B 1020 initial exact-count-prefix | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #6: LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #7: LP26-O10-C02 cache prefix or full fallback exact oracle | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #8: LP26-O10-B 1020 rotated exact-count-prefix | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-1020-batch.log #9: LP26-O10-E01 malformed mutation rejected | [동일 원출력](measurement-1020-batch.log) | pass |
| measurement-2049-bound-proof.log #1: FC01 exact insertion checks count=102 | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #2: seed FE02 writer start | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #3: seed FE04 bound finalized mutation segment0 | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #4: LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #5: LP26-O10-B 2049 initial exact-count-prefix | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #6: LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #7: LP26-O10-C02 cache prefix or full fallback exact oracle | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #8: LP26-O10-B 2049 rotated exact-count-prefix | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| measurement-2049-bound-proof.log #9: LP26-O10-E01 malformed mutation rejected | [동일 원출력](measurement-2049-bound-proof.log) | pass |
| app-observe-bound-proof.log #1: LP26-O05 fixed current executable | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #2: LP26-O05 original bounded retention fixture | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #3: LP26-O05 distinct canonical sources | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #4: LP26-O05 isolated server healthy | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #5: LP26-O05 independent initial channels | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #6: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #7: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #8: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #9: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #10: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #11: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #12: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #13: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #14: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #15: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #16: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #17: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #18: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #19: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #20: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #21: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #22: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #23: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #24: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #25: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #26: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #27: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #28: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #29: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #30: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #31: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #32: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #33: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #34: LP26-O05 active 9101 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #35: LP26-O05 active 9201 | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #36: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #37: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #38: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #39: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #40: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #41: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #42: LP26-O04 sample coverage | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #43: LP26-O05 both channels retained and progressed | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #44: LP26-O05 setting 9101 false | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #45: LP26-O05 setting 9201 false | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #46: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #47: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #48: LP26-O02 closed journal no partial tail | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #49: LP26-O05 stopped copy native catalog recovery | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #50: LP26-O05 native surviving and deleted states | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #51: LP26-O05 original journal bytes unchanged | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #52: LP26-O05 recovery copy cleanup | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #53: LP26-O05 isolated server healthy | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #54: LP26-O05 disabled restart | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #55: LP26-O05 stopped copy native catalog recovery | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #56: LP26-O05 native surviving and deleted states | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #57: LP26-O05 original journal bytes unchanged | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #58: LP26-O05 recovery copy cleanup | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #59: LP26-O05 restart exact catalog media state | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #60: LP26-O05 isolated server healthy | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #61: LP26-O05 setting 9101 true | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #62: LP26-O05 setting 9201 true | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #63: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #64: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #65: LP26-O05 reenabled recording after restart | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #66: LP26-O03 deleted media absent | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #67: LP26-O02 final restart closed journal no partial tail | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #68: LP26-O05 stopped copy native catalog recovery | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #69: LP26-O05 native surviving and deleted states | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #70: LP26-O05 original journal bytes unchanged | [동일 원출력](app-observe-bound-proof.log) | pass |
| app-observe-bound-proof.log #71: LP26-O05 recovery copy cleanup | [동일 원출력](app-observe-bound-proof.log) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #1: recovery first preflight retains strict content validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #2: recovery actual apply reuses validated content and preserves transitions | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #3: recovery sqlite preflight and projection reuse exact validated content | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | fail |
| lp24-recovery-lp26-batch-elevated-green.txt #4: recovery sqlite and jsonl return identical public values and durable bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #5: recovery new open performs fresh strict validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #6: recovery proof rejects changed envelope identity and payload | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #7: recovery proof preserves physical ordinal and duplicate collision rules | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #8: recovery proof never substitutes latest job for historical transition | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #9: recovery reused content preserves reservation source deletion and hold checks | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #10: recovery journal change invalidates reuse and retains strict corruption rejection | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #11: recovery pending checkpoint uses strict fallback | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #12: recovery budget exhaustion and admission exception preserve strict results | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #13: recovery proof ownership ends on success failure and exception | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt #14: recovery noncanonical binding preserves existing sqlite canonical bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #1: recovery first preflight retains strict content validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #2: recovery actual apply reuses validated content and preserves transitions | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #3: recovery sqlite preflight and projection reuse exact validated content | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | fail |
| lp24-recovery-lp26-batch-oracle-green.txt #4: recovery sqlite and jsonl return identical public values and durable bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #5: recovery new open performs fresh strict validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #6: recovery proof rejects changed envelope identity and payload | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #7: recovery proof preserves physical ordinal and duplicate collision rules | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #8: recovery proof never substitutes latest job for historical transition | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #9: recovery reused content preserves reservation source deletion and hold checks | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #10: recovery journal change invalidates reuse and retains strict corruption rejection | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #11: recovery pending checkpoint uses strict fallback | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #12: recovery budget exhaustion and admission exception preserve strict results | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #13: recovery proof ownership ends on success failure and exception | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt #14: recovery noncanonical binding preserves existing sqlite canonical bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #1: recovery first preflight retains strict content validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #2: recovery actual apply reuses validated content and preserves transitions | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #3: recovery sqlite preflight and projection reuse exact validated content | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #4: recovery sqlite and jsonl return identical public values and durable bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #5: recovery new open performs fresh strict validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #6: recovery proof rejects changed envelope identity and payload | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #7: recovery proof preserves physical ordinal and duplicate collision rules | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #8: recovery proof never substitutes latest job for historical transition | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #9: recovery reused content preserves reservation source deletion and hold checks | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #10: recovery journal change invalidates reuse and retains strict corruption rejection | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #11: recovery pending checkpoint uses strict fallback | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #12: recovery budget exhaustion and admission exception preserve strict results | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #13: recovery proof ownership ends on success failure and exception | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt #14: recovery noncanonical binding preserves existing sqlite canonical bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #1: recovery first preflight retains strict content validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #2: recovery actual apply reuses validated content and preserves transitions | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #3: recovery sqlite preflight and projection reuse exact validated content | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #4: recovery sqlite and jsonl return identical public values and durable bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #5: recovery new open performs fresh strict validation | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #6: recovery proof rejects changed envelope identity and payload | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #7: recovery proof preserves physical ordinal and duplicate collision rules | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #8: recovery proof never substitutes latest job for historical transition | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #9: recovery reused content preserves reservation source deletion and hold checks | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #10: recovery journal change invalidates reuse and retains strict corruption rejection | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #11: recovery pending checkpoint uses strict fallback | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #12: recovery budget exhaustion and admission exception preserve strict results | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #13: recovery proof ownership ends on success failure and exception | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt #14: recovery noncanonical binding preserves existing sqlite canonical bytes | [동일 원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-batch-green.txt compile | exit=null,signal=SIGTERM,stop=resource-observation,elapsed=255ms,groupClean=false; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-green.txt) | fail |
| lp24-recovery-lp26-batch-elevated-green.txt compile | exit=0,signal=none,stop=none,elapsed=3979ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | pass |
| lp24-recovery-lp26-batch-elevated-green.txt focused | exit=1,signal=none,stop=none,elapsed=3535ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-elevated-green.txt) | fail |
| lp24-recovery-lp26-batch-oracle-green.txt compile | exit=0,signal=none,stop=none,elapsed=3995ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | pass |
| lp24-recovery-lp26-batch-oracle-green.txt focused | exit=1,signal=none,stop=none,elapsed=3562ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-oracle-green.txt) | fail |
| lp24-recovery-lp26-batch-contract-green.txt compile | exit=0,signal=none,stop=none,elapsed=3982ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-batch-contract-green.txt focused | exit=0,signal=none,stop=none,elapsed=3552ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-batch-contract-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt compile | exit=0,signal=none,stop=none,elapsed=4025ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |
| lp24-recovery-lp26-bound-proof-green.txt focused | exit=0,signal=none,stop=none,elapsed=3599ms,groupClean=true; [원출력](../s11-preparation-mapping/lp24-recovery-lp26-bound-proof-green.txt) | pass |

### Stage2 cleanup

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.dxigQ9` | 소유 실행root | 52749717B | 자식/reader 종료 뒤 삭제 | absent=true | [원출력](measurement-2049-batch.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.pnSCNx` | 소유 실행root | 26269511B | 자식/reader 종료 뒤 삭제 | absent=true | [원출력](measurement-1020-batch.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.9V3hUZ` | 소유 실행root | 38457729B | 자식/reader 종료 뒤 삭제 | absent=true | [원출력](measurement-2049-bound-proof.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-Mrcbqj` | 소유 실행root | 292201506B | 자식/reader 종료 뒤 삭제 | absent=true | [원출력](app-observe-bound-proof.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.AVTW1r` |초기 LP24 소유root|345,622B|메인이 owner dhseo/mode0700 확인,exactroot pgrep exit1 후 rm -r exactpath|test ! -e exit0,메인 직접관측|초기 raw는group-unconfirmed/removed=false로 보존; 사후 정리 원출력 미보존 |
| preflight-only2049 소유root |원출력 미보존 실행root|57,582,908B(메인 보고)|SIGTERM 뒤 소유root 삭제|부재 메인 직접관측,경로/raw미보존|보존증거와 구분 |
| LP24 elevated/oracle/contract/final 각 소유root |컴파일/fixture/cache|11,472,907/11,472,875/11,472,875/11,474,759B|각groupClean=true 후삭제|각removed=true|각LP24 raw command의exactroot·cleanup JSON |
| stage2 원출력9개 |비민감 텍스트|150689B|첫실패/계측/계약/정리 감사 보존|저장소 보존|제품raw payload/credentials/영상 파일을 복사하지 않음 |

메인은 사후 TMPDIR 최상위의 `media-server-catalog-cost.*` 경로 검색 결과 없음(exit0)을 직접 확인했다.
이는 현재 잔여 없음의 보조관측이며 preflight-only exactroot/raw미보존을 복원하지 않는다.
stage2 원출력9개는 O10의 batch2049/batch1020/bound-proof2049/app4개와 LP24 준비/재검증5개,
합계150,689B다. 초기 진단과 G01 로그는 이9개에 포함하지 않는다.
실제 앱이 만든 private stderr/media는 위 소유root와 함께 제거됐고 요약/해시만 보존한다.
이번 기록 담당은 제품/검증기를 수정하거나 이 실험을 재실행하지 않았다. 커밋/푸시 미수행.
token start/end/consumed는 미집계(하위작업 집계 없음);elapsed/source는 각 실제 summary/phase/bashed SECONDS,
앱 전체약53초/build/LP15는 메인 직접관측이다.


독자: S11 녹화 누적 비용 분석 담당자. lifecycle: 이번 선행진단의 최초 실패·교정·단회 재검증을 보존한다.
정책 source-of-truth는 AGENTS.md, 실행 정의와 색인은 [중앙 기록](../../../release-test-records.md)을 따른다.

최종 stage2 판정은 **bounded focused 통과**다. 제품 복구 보완 후2049원본/8196행의 독립 복구와
checkpoint·회전 관측 및 실제 앱30초 준비 실행을 통과했다. 누적 실제HTTP·120분·전체통합은4번 잔여다.
[stage2 최종 기록](#stage2-bounded-focused-최종-기록)의 제품 변경/최종 결과와 아래 최초 진단 이력을 구분한다.
아래 초기1020/2049 측정은 제품 무변경 시점의 역사적 기록이다. 초기2049는 **복구15초 제한에서 중단**했고
그 실행의 뒤 단계는 미완료다. 후속 PASS가 최초 실패를 지우거나 실제 장시간 실패 해결을 확정하지 않는다.

## 기준과 독립 oracle

- 작업 시작: HEAD `dccd425f`, `v4.1.0` clean 직접 확인.
- 측정 source: 메인 담당의 LP15 wrapper 호환 커밋 후 `4f39b2f6cf5e31c78f55e3291ade962e2b653f84`.
  원본/소유복제본 SHA256, compiler/library 버전은 각 measurement 로그 앞부분에 있다.
- macOS Darwin arm64, Apple clang21, GStreamer1.28.1, SQLite3.51.0, OpenSSL3.6.2.
  C++17 **명시적인 -O 없음**, FC01 소유복제본 중첩계측 켬; overhead를 빼지 않았다.
  해당 fixture의 시간은 최적화된 실제 서버 성능과 동등한 증거가 아니다.
- 실제 writer가 생성한 60 AU 원본1개의 파일증거를 검증한 뒤, 각 ID/order의 segment·binding·tombstone을
  typed struct 및 기존 serializer로 다시 생성했다. 별도 strict catalog Open의 zero recovery errors·4N mutation·N tombstone이 oracle이다.
  모든 scaled 원본은 삭제 완료 상태이고 media 파일을 생성하지 않는다. seed 실제파일도 생성 뒤 삭제한다.
- 작은16/64행, 실패근접1020/4080행, record상한초과2049/8196행.
  실제 보존 실패4071행과 synthetic4080행은9행 차이가 있다. 시간축·동시성·실제 payload 전체는 동일하지 않다.
- 64MiB·8192행 exact/plus1은 별도 admission 함수의 논리경계 검사다. 임의 payload를 쓴 경계검사가
  유효한 대용량 저장/복구 PASS를 뜻하지 않는다.

## 실행과 실패 이력

```sh
node --test scripts/internal/recording_accumulation_plan.test.mjs
bash scripts/internal/verify_recording_accumulation_probe.sh --run
bash scripts/internal/verify_recording_accumulation_probe.sh --case 1020
bash scripts/internal/verify_recording_accumulation_probe.sh --case 2049
bash -n scripts/internal/verify_recording_accumulation_probe.sh
node --check scripts/internal/recording_accumulation_run.mjs
node --check scripts/internal/recording_accumulation_prepare.mjs
git diff --check
```

| 실행 | exit | 실제 결과 | 근거 |
| --- | --- | --- | --- |
| 단위 RED | 1 | 미구현 helper assertion3개 예상 RED | [red.log](red.log) |
| 최초 단위 GREEN | 0 | 3/3 | [green.log](green.log) |
| 최초 전체계획 측정 | 1 |34초; small 통과,1020 두번째 checkpoint에서 합산 fixture15초 제한 | [measurement-attempt1.log](measurement-attempt1.log) |
| 단계 경계 교정 unit | 0 |4/4 | [stage-oracle.log](stage-oracle.log) |
| 1020 단회 재검증 | 0 |39초; 독립 각 단계15초 안 완료 | [measurement-1020-recheck.log](measurement-1020-recheck.log) |
| 2049 단회 측정 | 1 |38초; recovery 독립15초 제한, 뒤 단계 건너뜀 | [measurement-2049.log](measurement-2049.log) |
| 최종 unit | 0 |4/4; begin 없는 null wall 거부 포함 | [final-unit.log](final-unit.log) |
| 문법/공백 | 0 |bash -n, 두 node --check, git diff --check | 도구 exit 직접 확인 |

`red.log`의 의미 없는 공백-only 줄 6개는 저장소 공백 검사를 위해 빈 줄로 정규화했다. 실패 내용·순서·판정은 변경하지 않았다.

최초 합산15초는 fixture 정의 오류였다. 당시 **복구9.803초, 첫checkpoint4.197초는 각각 완료**됐고
두번째 checkpoint는 측정되지 않았다. 제품 복구 timeout으로 해석하지 않는다.
원래 실패를 보존하고 메인 지시에 따라 단계 begin/wall의 순서를 검사하는 독립15초 watchdog을 구현했다.
전체65초는 process cleanup을 위한 기술적 상한으로만 남겼다. 1020을 한 번 재검증한 뒤 메인 지시로2049를 한 번 실행했다.
HTTP4초·표본15초·native normalize3초·복구15초·원장 계약은 바꾸지 않았다.

각 실행에서 native probe/normalizer/metrics 컴파일을 독립60초 상한으로 수행했으며 모두 exit0,
생성은60초, 출력은4MiB, 소유root는448MiB, 각 측정프로세스 RSS는1GiB 경계를 사용했다.
장시간/실제 HTTP/브라우저를 실행하지 않았다. 마지막 malformed mutation 거부는1020 실행에서 통과했다.
2049 실행은 recovery 실패 뒤 해당 거부 검사를 다시 실행하지 않았다.

## 규모와 비용 직접 측정

| 항목 | 작은16/64행(첫 실행) | 실패근접1020/4080행(재검증) | record초과2049/8196행 |
| --- | ---: | ---: | ---: |
| 원장 원본 bytes |299,331|19,113,993|38,420,091|
| cache 논리 charge bytes |300,163|19,167,033|38,526,639|
| 논리 입장 예상 |허용|허용|record수로 거부,64MiB 미초과|
| initial observer drain |0.445초/1poll|5.590초/1poll|11.224초/2poll|
| strict recovery wall |0.088644초|9.931961초|독립15초 중단·미완료|
| recovery catalog hold |0.076018초|9.205167초|미확인|
| 첫·끝 비활성 binding2개 cold획득 |0.004856초|0.005232초|미실행|
| 첫 checkpoint wall/hold |0.067713초|4.179822초|미실행|
| 첫 checkpoint 원본적용/cache |64/retained|4080/retained|미실행|
| 반복 checkpoint wall/hold |0.038450초|2.435146초|미실행|
| 반복 checkpoint 재사용/원본적용 |64/0|4080/0|미실행|
| 실제 checkpoint inode교체 뒤 observer drain |0.130724초/fresh0|5.339934초/fresh0|미실행|
| native 확인 RSS high-water |32,817,152B|242,024,448B|외부 관측최대333,676,544B,종료시 self peak 미확인|

모든 completed catalog lock wait는 단일스레드의 수백ns 수준(1020 recovery208ns/cold250ns/warm125ns)이었다.
이는 실제 요청 경합의 wait를 측정한 것이 아니다. 관측기 parent RSS와 native child RSS도 구분하며 합산peak라고 주장하지 않는다.
1020 parent는 drain 전69,369,856B→initial후130,809,856B→회전후153,960,448B,
2049 parent는67,944,448B→initial후174,948,352B→종료시196,427,776B였다.
단회 high-water/current 변화는 leak/drift 판정이 아니다.

### 1020 checkpoint 비용 분해

| 완료 구간 | cold inclusive | warm inclusive | 의미/겹침 |
| --- | ---: | ---: | --- |
| catalog hold 전체 |4.179820초|2.435144초|아래 중첩단계를 포함 |
| CheckpointLocked 전체 |4.179761초|2.435081초|hold 내부 |
| ReadCheckpointRecords |1.263542초|1.923362초|warm에서도 원장 전체 읽기/해석 비용 존재 |
| originalSemantic |2.239350초|42ns|warm prefix4080 재사용으로 originalApplied0 |
| PrepareCheckpoint |0.167862초|0.001134초|candidate 준비 |
| CommitCheckpoint |0.199485초|0.006351초|원본 semantic 검증과 별도 |
| CheckpointLocked exclusive |0.308444초|0.503080초|계측된 자식 구간 외 비용, 임의로 특정 함수에 귀속하지 않음 |

inclusive 수치를 서로 중복 합산하지 않는다. 세부 함수별 inclusive/exclusive/count는 원출력 cost 행 전부에 보존했다.
ReadCheckpointRecords가 cached prefix 판정보다 먼저 수행되는 현행 구조와 warm측정이 일치한다.
cache 입장 거부가1020의 원인이라는 주장은 직접 evidence와 맞지 않는다: 논리charge약19.17MB·4080행이며 실제cache 유지/재사용이 확인됐다.
2049는 record상한을 넘지만 actual fallback 단계까지 도달하지 않아 그 경로 비용은 미확인이다.

## 직접 확인·가설·미확정 구분

| 항목 | 분류 | 결론 |
| --- | --- | --- |
| 1020 cold hold4.180초 | 직접 확인 | 이 계측 fixture의 catalog 단일 잠금 보유가4초를 넘었다 |
| 실제 HTTP4초 timeout 가능성 | 가설 | cold checkpoint와 같은 mutex를 요구하는 요청이 겹치면 대기 위험이 있다. 요청 시작시점·기타 대기·최적화/계측 차이를 미측정 |
| 1020 warm hold2.435초 | 직접 확인 | 이 단일 구간만으로4초 초과를 입증하지 않는다. 기타 단계/경합을 합쳐 확정하지 않음 |
| 기존 pause5초+drain 비용 | 계산/가설 |1020 회전drain5.340+pause5=10.340초;15초까지4.660초가 metrics/root/status 등 나머지 예산이다 |
| 2049 관측 간격 위험 | 계산/가설 |initial drain11.224+pause5=16.224초. 동일비용이 실제 반복루프에서 발생한다면 부가작업 없이15초를 넘긴다. 실제 반복 환경 재현은 아님 |
| 장시간 원래 HTTP timeout/15초 gap5건 | 미확정 |이번은 paused synthetic 단일스레드·60AU·삭제완료 표본이며 실제 앱의 source/retention 동시성·HTTP·전송/부하를 재현하지 않았다 |
| recovery 초과 | 직접 확인 |2049 fixture의 recovery는15초 안 완료되지 않았다. 종료된 scope의 세부 cost만 배출하는 계측이라 미완료 recovery 내부 원인별 시간은 없다 |

## 개별 실행 결과

아래 pass/fail은 표시된 oracle/단계의 실제 결과이며 전체제품·성능 PASS가 아니다.
예상RED·최초 fixture 시간 오류·2049 중단을 삭제하지 않는다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-F01 복구·checkpoint별15초 독립 경계와 정확한 순서 | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| FC01 exact insertion checks count=102 | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 initial exact-count-prefix | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-C02 cache prefix or full fallback exact oracle | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 rotated exact-count-prefix | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-E01 malformed mutation rejected | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 완료단계 1 recovery | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=9931961, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 2 cold-binding | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=5232, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 3 checkpoint-cold | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=4179822, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 4 checkpoint-repeat | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=2435146, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 compile probe | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| FC01 exact insertion checks count=102 | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 2049 initial exact-count-prefix | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 stage-time-cap | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10 compile probe | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| FC01 exact insertion checks count=102 | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 records8192 admitted | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 records8193 rejected | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 charge64MiB admitted | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 charge64MiBplus1 rejected | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 16 initial exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-C02 cache prefix or full fallback exact oracle | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 16 rotated exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 initial exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 time-cap | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10 완료단계 1 recovery | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=88644, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 2 cold-binding | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=4856, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 3 checkpoint-cold | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=67713, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 4 checkpoint-repeat | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=38450, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 5 recovery | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=9802854, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 6 cold-binding | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=5209, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 7 checkpoint-cold | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=4197420, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 compile probe | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-F01 복구·checkpoint별15초 독립 경계와 정확한 순서 | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |

## 미완료/미실행

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 최초1020 반복/회전 |둘째checkpoint·observer 재읽기|잘못된 합산15초 fixture 중단|첫실행은 FAIL 보존, 후속 단회 별도 결과로 구분 |
| 2049 strict Open |recovery 완주·count·projection oracle|독립15초 watchdog FAIL|단지 생성/initial parser 통과로 catalog strict PASS를 대체하지 않음 |
| 2049 cold/cache/회전 |cold binding·두checkpoint·회전재읽기|선수 recovery 실패 뒤 건너뜀|actual fallback 비용 미확인 |
| 64MiB 초과 유효누적저장 |대형 binding payload와 full Open|이번에는 순수 admission 경계만 실행|64MiB exact/plus1 함수 PASS만 있음 |
| 실제 앱/HTTP/장시간/UI |실제 sourceworker 동시성·HTTP status·120분·브라우저|이번 범위 밖|기존 실패 원인 확정/해결 및 release PASS로 사용 불가 |
| 제품 수정 |catalog/status/cadence 변경|메인 담당 판단 영역|이 담당자 미수행 |
| 커밋/푸시 |stage/commit/push|담당 범위 아님|이 담당자 미수행 |

## cleanup·보존·사용량

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.ulmhn1` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |26266579bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-1020-recheck.log](measurement-1020-recheck.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.QyQTUO` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |55913499bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-2049.log](measurement-2049.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.3y8WBr` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |68194882bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-attempt1.log](measurement-attempt1.log)|
| final-unit.log | 비민감 실행 원출력 |420bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| green.log | 비민감 실행 원출력 |329bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-1020-recheck.log | 비민감 실행 원출력 |21725bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-2049.log | 비민감 실행 원출력 |3764bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-attempt1.log | 비민감 실행 원출력 |34163bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| red.log | 비민감 실행 원출력 |3097bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| stage-oracle.log | 비민감 실행 원출력 |417bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|

서버/listening port/운영 계정/운영 원장은 만들지 않았다. compiler와 측정 자식은 bounded-exit/probe-process close로 종료를 확인했다.
2049와 최초실패 native는 소유 process group에 SIGTERM을 보내 close를 관찰했으며 강제SIGKILL 사용 evidence는 없다.
raw payload·영상·source URL·credentials는 보존하지 않았다. source/fixture hashes는 비민감 provenance다.

| 실행 영역 | token start | token end | token consumed | elapsed | source |
| --- | --- | --- | --- | --- | --- |
| 안정화 RED |미집계|미집계|미집계|31.544ms|node test summary; 작업별 usage 집계 없음 |
| 안정화 GREEN |미집계|미집계|미집계|29.386708ms|node test summary |
| 단계경계 unit |미집계|미집계|미집계|29.67775ms|node test summary |
| 최종 unit |미집계|미집계|미집계|30.170833ms|node test summary |
| 첫 측정 |미집계|미집계|미집계|34초(측정run26.430초)|bash SECONDS / Node performance |
| 1020 재검증 |미집계|미집계|미집계|39초(측정run30.283초)|bash SECONDS / Node performance |
| 2049 측정 |미집계|미집계|미집계|38초(측정run29.882초)|bash SECONDS / Node performance |
| 30분/120분/UI |미집계|미집계|미집계|미실행|이번 범위 밖 |

## LP26-O10-G 관측기 시작간격 보완

별도 메인 승인으로 동일2번의 관측기 대기만 보완했다. source HEAD `dbdfcba2cb941a8d6fc9b372a1351021eddf5c29` 위 작업이며
서버 catalog/status/media 제품 코드는 바꾸지 않았다. 위2049 recovery FAIL은 별도 미해결로 유지한다.

- `recording_longrun_progress.mjs::nextSampleDelay`: `max(0,min(5000-(now-phaseAt),end-now))`.
  유한·비음수 시간/역행을 검사하고15초 초과는 기존 `sample-gap`으로 거부한다.
- `verify_recording_current_longrun.mjs`: sample/drain/status 처리 뒤 helper를 호출하고 양수일 때만 대기한다.
  기존 고정5초 추가대기를 제거했다. 처리5초 이상은0이고 정확15초에서도 추가 대기가 없다.
- 목표는5초 start-to-start이지 실제 정시 실행 보장이 아니다. 다음 metrics 비용과 event-loop 지연은 남으며
  기존 cadence 전후 검사와 assertSampleStep의15초 초과 조기FAIL, finally 자원요약을 유지한다.
- HTTP4초/native3초/표본15초 및 출력4MiB·cleanup 계약은 바꾸지 않았다.
  실제 앱/장시간은 미실행이므로 기존 timeout/gap 해결로 확대하지 않는다.

### 명령·실패 이력

| 명령 | exit | 결과/시간 | 근거 |
| --- | --- | --- | --- |
| `node --test scripts/internal/recording_longrun_cadence.test.mjs` RED |1|helper export 미구현4개 예상 assertion 실패/36.005458ms|[원출력](cadence-red.log.gz)|
| 동일 GREEN |0|4/4,31.563708ms|[원출력](cadence-green.log)|
| `node scripts/internal/recording_longrun_progress.test.mjs` |0|45/45,57ms|[원출력](cadence-recording_longrun_progress.test.mjs.log)|
| `node scripts/internal/recording_current_longrun_diagnostics.test.mjs` |0|6/6,6.23725ms|[원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log)|
| `node scripts/internal/recording_longrun_summary.test.mjs` |0|51/51,21ms|[원출력](cadence-recording_longrun_summary.test.mjs.log)|
| `node scripts/internal/recording_current_http_diagnostics.test.mjs` |0|5/5,5.722542ms|[원출력](cadence-recording_current_http_diagnostics.test.mjs.log)|
| `node --check scripts/internal/verify_recording_current_longrun.mjs` |0|문법 정상|도구 exit|
| `git diff --check` |0|공백 정상|도구 exit|

GREEN111개와 최초 RED4개를 아래 개별 행 및 원출력과 대조했다. 실제 장시간/서버/브라우저/2049 재실행 없음.
token start/end/consumed는 모두 미집계(하위작업 usage 집계 미제공), elapsed/source는 위 실제 summary다.

### cadence 개별 결과

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| LP26-O10-G01 5초 시작간격은 이미 처리한 시간을 차감한다 | 최초 미구현 assertion; [RED](cadence-red.log.gz) exit1 | fail |
| LP26-O10-G01 종료 잔여시간까지만 대기한다 | 최초 미구현 assertion; [RED](cadence-red.log.gz) exit1 | fail |
| LP26-O10-G01 기존15초 초과는 즉시 실패한다 | 최초 미구현 assertion; [RED](cadence-red.log.gz) exit1 | fail |
| LP26-O10-G01 비정상 시간은 거부한다 | 최초 미구현 assertion; [RED](cadence-red.log.gz) exit1 | fail |
| LP26-O10-G01 5초 시작간격은 이미 처리한 시간을 차감한다 | 구현 후 독립 시간 oracle; [GREEN](cadence-green.log) exit0 | pass |
| LP26-O10-G01 종료 잔여시간까지만 대기한다 | 구현 후 독립 시간 oracle; [GREEN](cadence-green.log) exit0 | pass |
| LP26-O10-G01 기존15초 초과는 즉시 실패한다 | 구현 후 독립 시간 oracle; [GREEN](cadence-green.log) exit0 | pass |
| LP26-O10-G01 비정상 시간은 거부한다 | 구현 후 독립 시간 oracle; [GREEN](cadence-green.log) exit0 | pass |
| explicit 120 minutes accepted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI [] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI ["120"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI ["--duration-minutes","30"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI ["--duration-minutes","120","extra"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid CLI ["--unknown","120"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| two channels progress and ordered deletion | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| stall rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| duplicate rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| UTC regression rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| completion without request rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid media metadata rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| duration cannot be shortened | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| unknown channel cannot satisfy progress | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| backward clock rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample continuous accepted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample gap rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample wrong PID rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample wrong identity rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample missing beginning rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample missing end rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| sample insufficient rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| actual golden schema accepted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| full duration distributed progress accepted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| last moment only cannot pass | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| ID limit rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| UTF8 byte limit rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| queried revision advanced disable | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| missing source rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| duplicate source rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| invalid revision rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects [] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects ["120"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects ["--duration-minutes","30"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects ["--duration-minutes","120","extra"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| public CLI rejects ["--unknown","120"] | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| completed batch returns media path once | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| missing media path rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| media path byte limit rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| ENOENT media absent | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| regular media present rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| dangling symlink present rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| media permission error rejected | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| S09-LD01 invalid segment diagnostics are specific and redacted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| S09-LD01 missing timestamp diagnostics remain specific and redacted | `node scripts/internal/recording_longrun_progress.test.mjs`, exit0; [원출력](cadence-recording_longrun_progress.test.mjs.log) | pass |
| LP26-O09-A01 15초 첫/중간 경계와 즉시 실패 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-A02 identity·clock·pid 불일치 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-A03 보존 attempt3의 초과5건 중 첫 간격에서 실패 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-D01 실패 표본도 자원 요약에 보존하고 PASS 금지 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-D02 부족 표본과 잘못된 표본은 명시 상태 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LP26-O09-C02 slow 숫자행·완료/미완료·비밀 거부 | `node scripts/internal/recording_current_longrun_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_longrun_diagnostics.test.mjs.log) | pass |
| LS01 separate restart PID groups | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS01 literal first last max delta elapsed | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS01 postwarmup negative rate literal | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS01 new PID warmup resets and insufficient null | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS01 zero warmup rate separate PIDs | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 same PID gap explicitly measured | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 one sample gap and trend insufficient | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 FD zero valid | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 no resource or longrun pass | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 workload delta not reset by PID | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS03 raw input excluded from output | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 missing-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 zero-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 negative-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 infinite-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 nan-rss rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 zero-thread rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 negative-fd rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 missing-fd rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 zero-pid rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 zero-time rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid-identity rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 missing-counter rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 missing-types rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 pending-journal rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 duplicate time rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 backward time rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 same PID identity change rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 global counters cannot reset at restart | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative segment_finalized decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative event_link_created decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative observation_put decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative observation_v2_put decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative deletion_requested decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative deletion_completed decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative corruption_detected decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative mutationCount decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative uniqueMutationIds decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative uniqueEntityIds decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative storedIdCount decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative idUtf8Bytes decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 cumulative consumedOffset decrease rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid warmup undefined | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid warmup -1 | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid warmup 0.5 | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 invalid warmup Infinity | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 empty input rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 10000 samples accepted | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 over 10000 samples rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 64 PID groups accepted | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LS02 over 64 groups rejected | `node scripts/internal/recording_longrun_summary.test.mjs`, exit0; [원출력](cadence-recording_longrun_summary.test.mjs.log) | pass |
| LP26-O09-B01 status/source-item 안전 분류 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |
| LP26-O09-B02 지정4MiB 초과는 body 실패 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |
| P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |
| P0-DIAG02 header timeout 고정 진단과 실패 유지 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |
| P0-DIAG03 body timeout 부분 수신 측정·완료 거부 | `node scripts/internal/recording_current_http_diagnostics.test.mjs`, exit0; [원출력](cadence-recording_current_http_diagnostics.test.mjs.log) | pass |

### cadence cleanup

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 없음 | 임시root/서버/port/미디어 |0|생성하지 않음|정리할 임시 산출물 없음|순수 helper·회귀, CLI 자식5건은 동기 exit2 확인|
| 이 디렉터리의 cadence-*.log 6개 |비민감 테스트 원출력|합계9,791bytes|실패/GREEN/회귀 감사 보존|저장소 보존|개별 title/count/exit 재확인용|

커밋·푸시 미수행. 이 보완의 직접 증거는 순수 시간계산·기존 실패/연속성/요약 회귀이며
실제 HTTP·장시간 증거의 대체나2049 복구 해결 증거가 아니다.

## LP26-O11 상태 용량 집계 독립 기록

독자: S11 3번 용량 집계 검토 담당자. lifecycle: 최초환경실패·제품RED·수정후GREEN·집중화면 대조를 보존한다.
기존 O10 진단과 별개이며, 중앙 O11 실행전 정의를 따른다. 문서작성 시 HEAD는
`7018d4670b6810e09024200615c71cccefb7f6f1`; 그 위 메인의 제품 수정은
`src/application/media_server_application.cpp` 상태공급자의 v1직접필드 대신
RetentionCandidate `Channel()/Class()/Size()` 사용이다. v1/v2 보존 후보를 올바르게 합산하며
기존 포화합산·quota·API JSON/UI 문자열을 바꾸지 않는다.

### 실패·실행·증거 경계

| 명령/환경 | exit | 결과·원출력 |
| --- | --- | --- |
| `bash scripts/internal/verify_recording_current_observer.sh --app-observe` 비승격 |1|[status-usage-red](status-usage-red.log),fixture생성ETIMEDOUT/SIGTERM30010ms,Node30025ms,1pass/1fail,process0 |
| 동일 명령 승격 제품RED |1|[status-usage-product-red](status-usage-product-red.log),fixture1338ms로 생성성공,9101 independent status usage FAIL,53pass/1fail,Node38193ms,process2 |
| `./server.sh build` 메인 수행 |0|메인 직접관측,이번 원출력 미보존 |
| 동일 앱 명령 수정후 승격GREEN |0|[status-usage-green](status-usage-green.log),73pass/0fail,Node47028ms,관측30155.139ms,process3 |
| `node scripts/internal/verify_v410_recording_ui_contract.mjs --ui-direct` elevated PTY |0|메인 직접관측;raw/screenshot/trace 미보존 |

비승격 첫 실행은 fixture 준비 실패이지 예상제품RED가 아니다. GStreamer sandbox 관련 실패로 분류하되
원출력 자체는ETIMEDOUT/SIGTERM이며 내부 상세 원인은 확인하지 않았다. 같은30초 제한을 유지한
승격 준비성공 뒤 실제9101 assertion 실패가 제품RED다. 최초실패를 최종PASS로 덮어쓰지 않는다.
후속 UI는 별도 소규모 fixture이므로 API GREEN의 대용량 수치와 동일 실행이라고 합치지 않는다.

### 독립 용량 oracle

| 채널 | 남은 실제 원본 bytes | 역사적 총 bytes | 삭제완료 개수 | API continuous/event bytes | 결과 |
| --- | ---: | ---: | ---: | --- | --- |
|9101|62,855,707|468,034,566|13|62,855,707 /0|pass|
|9201|67,010,843|472,189,702|13|67,010,843 /0|pass|

GREEN의 `[status-usage]` 행은 physicalFilesChecked=true다. 삭제된13개를 현재량에서 제외하고
현재 남은 파일과 원장 예상량/API를 일치시켰다. 30초 관측 phase의deleted12와 재기동뒤 usage의deleted13은
시점이 다르므로 같은 시점 개수로 혼동하지 않는다. 장시간 자원/성능 PASS는 아니다.

### 실제 브라우저 집중 대조

메인이 IAB 임시탭의 `http://127.0.0.1:63025/ops/events` AX에서 상태문자열을 직접 읽고,
같은 격리 서버의 `GET /ops/api/recordings/status` HTTP200과 대조했다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| O11-UI ch1 상시 | AX1,192,771B = API continuous1,192,771B | pass |
| O11-UI ch1 이벤트 | AX77,038B = API event77,038B | pass |
| O11-UI ch2 상시 | AX0B = API continuous0B | pass |
| O11-UI ch2 이벤트 | AX0B = API event0B | pass |
| O11-UI GET | 같은 격리 API HTTP200,위 값 exact 일치 | pass |
| O11-UI cleanup | 임시탭닫음·서버종료·RTSP63024/HTTP63025 closed·root삭제 | pass |

이 표는 메인 직접관측 보고이며 문서담당의 재실행/직접 브라우저 확인이 아니다.
screenshot/trace/raw 미보존으로 전체 시각품질·동작·정책 적격성을 증명하지 않는다.
**UI full424 PASS가 아닌 집중 표시 대조**다.

### 원출력 개별 결과

3로그의 실제 assertion1+53+73=127pass와2fail을 아래129행으로 대조했다.
제품RED 뒤 9201 usage 등 후속 검사는 그 실행에서 미실행이고GREEN에서만 인정한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| status-usage-red.log #1 | LP26-O05 fixed current executable ([raw](status-usage-red.log)) | pass |
| status-usage-red.log #2 | current observation: LP26-O05 original bounded retention fixture ([raw](status-usage-red.log)) | fail |
| status-usage-product-red.log #1 | LP26-O05 fixed current executable ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #2 | LP26-O05 original bounded retention fixture ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #3 | LP26-O05 distinct canonical sources ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #4 | LP26-O05 isolated server healthy ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #5 | LP26-O05 independent initial channels ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #6 | LP26-O05 active 9101 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #7 | LP26-O05 active 9201 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #8 | LP26-O05 active 9101 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #9 | LP26-O05 active 9201 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #10 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #11 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #12 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #13 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #14 | LP26-O05 active 9101 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #15 | LP26-O05 active 9201 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #16 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #17 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #18 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #19 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #20 | LP26-O05 active 9101 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #21 | LP26-O05 active 9201 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #22 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #23 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #24 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #25 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #26 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #27 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #28 | LP26-O05 active 9101 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #29 | LP26-O05 active 9201 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #30 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #31 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #32 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #33 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #34 | LP26-O05 active 9101 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #35 | LP26-O05 active 9201 ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #36 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #37 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #38 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #39 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #40 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #41 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #42 | LP26-O04 sample coverage ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #43 | LP26-O05 both channels retained and progressed ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #44 | LP26-O05 setting 9101 false ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #45 | LP26-O05 setting 9201 false ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #46 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #47 | LP26-O03 deleted media absent ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #48 | LP26-O02 closed journal no partial tail ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #49 | LP26-O05 stopped copy native catalog recovery ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #50 | LP26-O05 native surviving and deleted states ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #51 | LP26-O05 original journal bytes unchanged ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #52 | LP26-O05 recovery copy cleanup ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #53 | LP26-O05 isolated server healthy ([raw](status-usage-product-red.log)) | pass |
| status-usage-product-red.log #54 | current observation: LP26-O11 independent status usage 9101 ([raw](status-usage-product-red.log)) | fail |
| status-usage-green.log #1 | LP26-O05 fixed current executable ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #2 | LP26-O05 original bounded retention fixture ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #3 | LP26-O05 distinct canonical sources ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #4 | LP26-O05 isolated server healthy ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #5 | LP26-O05 independent initial channels ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #6 | LP26-O05 active 9101 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #7 | LP26-O05 active 9201 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #8 | LP26-O05 active 9101 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #9 | LP26-O05 active 9201 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #10 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #11 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #12 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #13 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #14 | LP26-O05 active 9101 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #15 | LP26-O05 active 9201 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #16 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #17 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #18 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #19 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #20 | LP26-O05 active 9101 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #21 | LP26-O05 active 9201 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #22 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #23 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #24 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #25 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #26 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #27 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #28 | LP26-O05 active 9101 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #29 | LP26-O05 active 9201 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #30 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #31 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #32 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #33 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #34 | LP26-O05 active 9101 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #35 | LP26-O05 active 9201 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #36 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #37 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #38 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #39 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #40 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #41 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #42 | LP26-O04 sample coverage ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #43 | LP26-O05 both channels retained and progressed ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #44 | LP26-O05 setting 9101 false ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #45 | LP26-O05 setting 9201 false ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #46 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #47 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #48 | LP26-O02 closed journal no partial tail ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #49 | LP26-O05 stopped copy native catalog recovery ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #50 | LP26-O05 native surviving and deleted states ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #51 | LP26-O05 original journal bytes unchanged ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #52 | LP26-O05 recovery copy cleanup ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #53 | LP26-O05 isolated server healthy ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #54 | LP26-O11 independent status usage 9101 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #55 | LP26-O11 independent status usage 9201 ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #56 | LP26-O05 disabled restart ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #57 | LP26-O05 stopped copy native catalog recovery ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #58 | LP26-O05 native surviving and deleted states ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #59 | LP26-O05 original journal bytes unchanged ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #60 | LP26-O05 recovery copy cleanup ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #61 | LP26-O05 restart exact catalog media state ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #62 | LP26-O05 isolated server healthy ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #63 | LP26-O05 setting 9101 true ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #64 | LP26-O05 setting 9201 true ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #65 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #66 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #67 | LP26-O05 reenabled recording after restart ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #68 | LP26-O03 deleted media absent ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #69 | LP26-O02 final restart closed journal no partial tail ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #70 | LP26-O05 stopped copy native catalog recovery ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #71 | LP26-O05 native surviving and deleted states ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #72 | LP26-O05 original journal bytes unchanged ([raw](status-usage-green.log)) | pass |
| status-usage-green.log #73 | LP26-O05 recovery copy cleanup ([raw](status-usage-green.log)) | pass |

### 정리·보존

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-ssh599` |격리 app소유root|6019579B|자식종료 뒤 삭제|absent=true|[raw](status-usage-red.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-Bi5Eb4` |격리 app소유root|265074108B|자식종료 뒤 삭제|absent=true|[raw](status-usage-product-red.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-7X3Rr3` |격리 app소유root|291199559B|자식종료 뒤 삭제|absent=true|[raw](status-usage-green.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-vxz6tD` |UI 격리root|6,268,038B|서버종료 뒤삭제|absent=true,63024/63025 closed|메인 직접관측,raw미보존 |
| status-usage-*.log3개 |비민감 실패/성공 요약|94128B|저장소 보존|보존|최초실패/제품RED/GREEN/cleanup 감사 |

제품RED의process2·GREEN의process3 모두processesClosed=true/udpClosed=true다.
raw 원문영상·private stderr·임시계정은 root와 함께 제거됐으며 보존 로그는 안전요약이다.
token start/end/consumed는미집계(하위작업 집계없음),elapsed는 위 Node/fixture 실제summary 기준이다.
UI/build의 정확한elapsed·token은 미집계, source는메인 직접관측이다.

### 미실행/증거 유효 범위

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 환경실패뒤 앱검사 |첫 실행 실제 API/녹화|fixture 준비 실패|제품 정상/비정상 판정 아님 |
| 제품RED뒤 후속검사 |9201 usage·재활성화 등|9101 실패에서 중단|GREEN 재실행 결과만 사용 |
| 실제 누적1020 HTTP/전체통합 |장시간보존과 병행 상태부하|4번 잔여|이번소규모 focused로 대체불가 |
|30분/120분|최종장시간실행|이번3번범위밖|30초 준비는30분/120분이 아님 |
|UI full424/시각품질|전수 control/action·screenshot/trace|미실행/미보존|집중 AX값 대조와 다름 |

기존 잘못된 상태용량을 전제로 한 제품증거는 수정후 상태량 검증을 대체할 수 없다.
기존저장/복구 원출력은 역사적 근거로 유지하되 신규 제품변경의 전체통합PASS로 확대하지 않는다.
기록담당은 문서만 수정했고제품/검증기/로그를 수정하거나실험을재실행하지 않았다. 커밋/푸시 미수행.

### O11 문서 마감 결과

`./server.sh verify-docs-links` exit0(318md/12202links/176anchors/22images/fail0),
`./server.sh verify-docs-ui-assets` exit0(10/10), `git diff --check` exit0.
도구 wall 합계0.093초,전용token미집계. 임시root/childserver/port 생성 없음.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| O11 docs links | local links/anchors 전수, O11 상세 anchor 포함 | pass |
| O11 assets1 | README 대표 제품 screenshot | pass |
| O11 assets2 | 영문 README 영문 screenshot | pass |
| O11 assets3 | UI guide 공용 제품 asset | pass |
| O11 assets4 | UI asset capture 정책 | pass |
| O11 assets5 | managed manifest 완결성 | pass |
| O11 assets6 | capture script 소유 asset | pass |
| O11 assets7 | 현재 screenshot capture coverage | pass |
| O11 assets8 | stale visual baseline 링크 부재 | pass |
| O11 assets9 | managed PNG 존재 | pass |
| O11 assets10 | VA full video frame bounds | pass |
| O11 diffcheck | git diff --check | pass |
