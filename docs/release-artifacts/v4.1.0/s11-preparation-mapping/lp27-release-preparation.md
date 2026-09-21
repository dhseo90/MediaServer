# LP27 — 릴리즈 선행 1~4 순차 작업

독자: v4.1.0 개발·검증 담당자. 수명: 이번 선행 작업의 계약·실행 이력.
정책은 AGENTS.md, 결과는 중앙 테스트 기록이 기준이다. LP26의 과거 결과는 덮어쓰지 않는다.
시작 branch `v4.1.0`, HEAD `f4e58b9cb2efbeec43a7e1132da940fce6afd521`, clean/sync.

## 후속 승인: HW-01 → HW-02 → HW-03 → PREP-01 → CLOSE-01

사용자는 원인 재검토 뒤 위 다섯 항목의 순차 개발·분할 커밋·조건 충족 시 마지막 push를 승인했다.
아래 기존 1~4 표와 실행 실패는 이전 실행 이력이다. 소프트웨어 디코더 우선 권고는 확정 해법이
아니며 HW-01의 관측 이후 선택한다. 설치 패키지 변경·전역 rank 변경·장시간·실제 UI·release action은 자동 승인으로 확대하지 않는다.

| 번호 | 사용자 지시 | 처리 상태 | 결과/완료 기준 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | HW-01 원인·영향 확정 | 완료 | burst/paced 모두 EOS 뒤 늦은 callback→역순 finish→시간값 보정 직접 확인 | 진단03·자체07 |
| 2 | HW-02 한정 해결책 | 구현·관련 단기 확인 완료 | exact tuple의 객체별 선택 제한, 자체78·4셀8·build/GST OFF 확인 | HW-02 결과, 영향 마감은 HW-03 |
| 3 | HW-03 반례·영향 회귀 | 미실행 | 전체 PTS/EOS·일반 입력 손실 반례·변경 코덱/자원 범위 검증 | HW-02 diff 후 |
| 4 | PREP-01 검증 연결 | 미실행 | 초기 exact ID·복합 요구·ENV12·UI/장시간 manifest 연결 | LP26 현행 실행 매핑 |
| 5 | CLOSE-01 정리·코드 고정 | 미실행 | 구형 사용처/소유 확인, 문서·증거 유효성 대조 | 앞 단계 완료 후 |
| 6 | 분할 커밋·조건부 push·잔여 재산정 | 미실행 | 통과 단위만 커밋, 전체 승인 범위 실패/미커밋 없음 확인 후 push | AGENTS3/5/6 |

### HW-01 실행 전 계약

기존 진단기 두 파일만 확장한다. 원인 판정은 메인, 확정 구현은 기존 단일 Astra/medium 담당자이며
하위 위임 금지다. Superpowers 스킬은 현재 미제공이므로 설계·반례·원인 분석·직접 검토 절차를 적용한다.
제품 파일·저장 계약·UTC·입력 PTS/DTS·공개 API·timeout·정상 판정은 바꾸지 않는다.

`--drain-diagnosis`는 normal20/bframe30 × burst/paced의 고정 네 셀을 각 한 번 수행한다.
같은 fixture AU/SHA를 재사용하고 paced는 steady clock으로 DTS 간격만 재현한다. 실제 네트워크 검사는 아니다.
각 셀의 기존 5초 EOS 대기와 프로세스 180초 상한을 유지한다. 준비 오류는 즉시 중단한다.
예상된 제품 불일치는 비교 관측으로 보존하면서 네 셀을 수집하되 제품 PASS로 바꾸지 않는다.
네 셀 완료는 원인 비교의 실행 완료이며, 내부 보정·인과관계 미확정이면 HW-01 완료가 아니다.
첫 실행 전 자체검사의 새 parser assertion은 미구현인 경우에만 예상 RED이고 환경/컴파일 오류는 RED가 아니다.

관측은 설치된 라이브러리의 debug callback을 사용하며 vtdec/videodecoder의 고정 메시지에서만 숫자·enum을 추출한다.
경로·주소·원문·임의 문자열을 공개하지 않는다. callback 자료는 고정 상한이며 초과·알 수 없는 경고·관측 누락은
미확정으로 남긴다. `clearing draining flag`는 비동기 대기와 output pause 이후의 관측이지 정확한 대기 종료 시각이 아니다.
EOS 요청 전/후와 decoder sink EOS 경계도 구분한다. debug handler가 타이밍에 영향을 줄 수 있다는 한계를 기록한다.
wrapper의 소유 0700 임시 root만 사용하며 NULL 완료→callback 해제→root 삭제 순서와 bytes/부재를 확인한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP27-D01 | 안전 내부 로그 parser | drain/callback/push/clamp 숫자 파싱, 미등록·악성·범위초과 거부 자체검사 | v4.1.0 |
| LP27-D02 | 관측 수명·상한 | bounded 수집·overflow·미확인 경고·NULL/handler 해제 및 준비 실패 판정 | v4.1.0 |
| LP27-D03 | normal20 burst | 같은 AU, 입력/출력/EOS·drain/clamp 순서 관측 1회 | v4.1.0 |
| LP27-D04 | normal20 paced | 동일 AU를 원래 DTS 간격으로 공급, D03과 비교 1회 | v4.1.0 |
| LP27-D05 | bframe30 burst | 기존 2.6/2.7→2.8 현상과 내부 보정 대응, 1회 | v4.1.0 |
| LP27-D06 | bframe30 paced | 동일 AU·실제 간격에서 EOS 전후 구분, 1회 | v4.1.0 |

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| HW-01 자체/네 셀 단기 진단 | 진행 대상 | 사용자 순차 개발 | LP27-D01~06, 위 두 진단 파일 | 승인 |
| 제품 빌드/영향 회귀 | 조건부 진행 | HW-02 실제 변경에 따름 | 확정 diff 및 AGENTS7.4 | 관련 개발 범위 승인 |
| 문서/등록 검사 | 진행 대상 | 이번 기록·등록 변경 | diffcheck/docs links/assets/script inventory | 승인 |
| 30분·실제 UI·120분 | 미진행 | 현재 선행 개발이며 코드 미고정 | S11, AGENTS7.6.2 | 이번 실행 밖, 릴리즈 필수 상태 유지 |

기존 LP25 통합156 및 LP26 준비436의 유효 범위를 유지한다. HW 진단 변경만으로 전체를 재실행하지 않는다.
token start/end/consumed는 전용 집계 미제공으로 미집계이며 실행 elapsed/source를 원출력에 기록한다.

### HW-01 parser 개별 사전 정의

명령은 `bash scripts/internal/verify_recording_hw_impact.sh --self-test`다. 기존 OR/GR29개를 유지한다.
새 DP는 D01/D02의 하위 assertion이며 기능 총계를 중복 증가시키지 않는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-DP01 | callback 숫자 분리 | 주소는 저장하지 않고 decode frame 번호만 보존 | v4.1.0 |
| HW-DP02 | push 번호 분리 | 별도의 system frame 번호 보존 | v4.1.0 |
| HW-DP03 | clamp 시각 정밀도 | 2.6/2.8초의 나노초 원값 유지 | v4.1.0 |
| HW-DP04 | 악성 주소 거부 | 포인터 자리 임의 URI를 출력/보관하지 않음 | v4.1.0 |
| HW-DP05 | 꼬리 주입 거부 | 숫자 뒤 임의 문자열 거부 | v4.1.0 |
| HW-DP06 | 잘못된 시각 거부 | 분/초 범위 오류 미확정 처리 | v4.1.0 |
| HW-DP07 | 미등록 경고 | 원문 없이 unknown 계수, 완료 거부 | v4.1.0 |
| HW-DP08 | 배열 상한 | 2048 초과 시 초과 표시와 완료 거부 | v4.1.0 |
| HW-DP09 | 알려진 clamp 관측 | 원인 관측 완료와 제품 PASS 분리 | v4.1.0 |
| HW-DP10 | 없는 로그 날조 금지 | 공식 소스에 없는 wait 완료를 관측했다고 하지 않음 | v4.1.0 |
| HW-DP11 | finish 시각 | 보정 전 frame/PTS와 unknown DTS 보존, 주소 제외 | v4.1.0 |
| HW-DP12 | 정수 overflow | 범위 넘는 숫자를 변환 전에 거부 | v4.1.0 |
| HW-DP13 | 긴 무관 LOG | 선택 prefix가 아닌 LOG를 길이로 실패시키지 않음 | v4.1.0 |
| HW-DP14 | 관련 로그 상한 | 선택 prefix의 길이 초과는 미확정 | v4.1.0 |
| HW-DP15 | callback 예외 | C callback 밖 예외 전파 방지·완료 거부 | v4.1.0 |
| HW-DP16 | 잘못된 DTS | 허용되지 않은 시각 문법을 unknown으로 위장하지 않고 거부 | v4.1.0 |
| HW-DP17 | finish 관측 누락 | 보정 전 frame 관측 없이는 진단 완료 거부 | v4.1.0 |

최종 사전 개수는 기존29+DP17=46이다. 네 셀의 실행 ID `HW-DG01~04`는 위 D03~06에 순서대로 대응한다.
실행 명령은 자체검사 통과 후 `bash scripts/internal/verify_recording_hw_impact.sh --drain-diagnosis`이며
진단의 exit1은 제품 불일치 관측, exit2는 준비/관측 불완전, exit3은 네 셀 미재현이다. 어느 것도 제품 해결 PASS가 아니다.

### HW-01 최초 실행과 준비 보완

자체05는46/46 PASS·exit0·1931ms(wrapper3초), root1864596B 삭제·부재([원출력](lp27-hw-self-05.log)).
진단01은normal20-burst에서exit2·1663ms(wrapper3초)로 중단했다([원출력](lp27-hw-drain-01.log)).
vtdec_hw 후보의 입력/출력은0, overlay는20이어서 단일 decoder 관측 전제가 성립하지 않았다.
debug 관측은finish20/unsupported20/unknown warning2,drain callback/push0이었다. 제품 반례 결과가 아니라 준비 실패다.
뒤의 세 셀 및 HW-02 이후는 실행하지 않았다. root1864596B 삭제·부재, 서버/포트 생성 없음.

메인 회수의 읽기 확인: 공식 gstvideodecoder.c에는 상세 finish LOG 외에 포인터만 있는 진입 LOG도 있다(3471행).
이것을 미지원 상세 로그로 잘못 집계한 parser 결함을 보완한다. 상세 finish 관측 필수 조건은 유지한다.
공식 vtdec.c 677행의 `VTDecompressionSessionCreate returned %d`와 GST_ELEMENT_ERROR의 `error:` 접두사를
고정 분류해 숫자 코드만 남기고, 자동선택의 후보 factory 목록을 상한8개로 기록한다. 알려진 오류도 준비 실패로 유지한다.
첫 실행의 하드웨어 준비 부재가 실행 권한과 관련되는지는 아직 미확정이다. 자체검사 통과 후 동일 격리 진단의
VideoToolbox 접근 조건을 권한 절차로 분리한다. timeout·제품·판정 변경 없이 진단을 재개하며 설치 패키지를 바꾸지 않는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-DP18 | 공식 진입 LOG 구분 | 포인터만 있는 finish LOG는 상세 PTS 증거로 세지 않음 | v4.1.0 |
| HW-DP19 | VT 생성 오류 분류 | 원문 대신 부호·정수 코드만 수집, 준비 실패 유지 | v4.1.0 |
| HW-DP20 | 오류 원문 주입 거부 | 고정 오류 코드 뒤 임의 꼬리를 거부 | v4.1.0 |

자체06 사전 개수는49개다. 공식 로그 출처는 GStreamer 1.28.1 vtdec.c/gstvideodecoder.c와 설치된 gstelement.h이며,
새 failure를 제품 실패나 예상 RED로 바꾸지 않는다. 메인 첫 patch는 문맥 불일치로 미적용 후 정확한 행에 적용했다.

자체06은49PASS/exit0/1620ms,root1865156B 삭제·부재([로그](lp27-hw-self-06.log)).
승인된 일반 실행 권한의 진단02는 단일 vtdec_hw 실제 입력으로 normal burst/paced 모두20개 전체PTS/EOS 일치를 확인했다.
B-frame burst의 decoder출력 2.8초3개까지 보존됐으나 로그가중간에잘려 네 셀 판정/내부 보정 증거가 보존되지 않았다.
[진단02](lp27-hw-drain-02.log)는wrapper exit1/7초,root1865156B 삭제·부재이며 원출력 부재분은 추정 복원하지 않는다.
해당 결과는 HW-01 완료로 쓰지 않는다. 제품/source/AU는불변,첫실행과권한조건을구분한다.

원인은 wrapper Node의 `process.stdout.write` 직후 `process.exit`였다. pipe 출력의 비동기 전송이 끝나기 전에
프로세스가 종료해 약64KiB 이후와execution summary가 유실됐다. 메인이 회수해 자연 종료(exitCode)로 보완한다.
제품실행을 바꾸지 않고 동일 emit 함수에256KiB+tail·exit7 음성 대조를 추가한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-IO01 | 긴 출력과 실패 exit 보존 | 같은 emit 함수의256KiB pipe,정확tail,exit7,stderr0 대조 | v4.1.0 |

자체07 사전 개수는native49+wrapper IO1=50이다. 통과 뒤 진단03을 동일 권한/네 셀로 실행해
처음부터 정의한 증거를 완전하게 보존한다. 이 보완은 제품수정/timeout확대/합격기준완화가 아니다.

## HW-01 최종 판정과 개별 결과

HW-01 원인 구분은 완료했다. 진단03 네 셀의 관측은 모두 완전하며, 제품 정확도는 두 셀 PASS/두 셀 FAIL이다.
자체07은 native49+출력 IO1=50PASS,exit0/1457ms(wrapper3초), 진단03은exit1/6350ms(wrapper7초).
[자체07 원출력](lp27-hw-self-07.log), [진단03 원출력](lp27-hw-drain-03.log)을 최종 증거로 보존한다.
진단01 준비 실패·진단02 출력 유실은 위에 남기며 최종 결과로 삭제하지 않는다.

확정 원인 경로: macOS arm64/applemedia1.28.1/vtdec_hw의 EOS drain이 비동기 callback 완료 전에 정렬 대기를 해제한다.
burst에서는 drain-row168 set-draining 뒤 frame24의2.8초가 먼저 출력되고,
뒤늦은 callback25→frame25의2.6초→decreasing2.6<2.8→출력2.8초가 실제 순서로 확인된다(187~197).
paced도 EOS 전25개 정상 출력 뒤 set-draining199→frame27의3.1초 출력→늦은 callback29→
frame29의3.0초→decreasing3.0<3.1→출력3.1초(213~223)로 같은 경로가 확인된다.
기저 디코더는 이후 reordered_output 보정도 하므로 모든 시간값 변경을 clamp 경고 하나로 일대일 해석하지 않는다.

범위: 현재 설치버전·H264 입력의 유한 EOS 경계 및 overlay 전달까지 확인했다. RTSP 네트워크/client,
HTTP/HLS 전체 운영, 다른 codec/버전/OS 전체 영향은 이번 결과로 확정하지 않는다.
과거 WR01 일반20→19 손실은 이번 두 normal 셀에서 재현하지 않았으며 과거 실패를 보존한다.
HW-02는 확인된 구현의 선택 제한 후보를 검토하며 PTS 덮어쓰기·timeout 변경·전역HW비활성화를 하지 않는다.
제품 소스/빌드 archive는 불변이며 LP25/LP26 기존 증거 범위는 유지된다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-DG01 / D03 | normal20 burst,20/20/20·입력/출력 전체PTS·EOS | PASS | 진단03 셀exit0 |
| HW-DG02 / D04 | normal20 paced,20/20/20·입력/출력 전체PTS·EOS | PASS | 진단03 셀exit0 |
| HW-DG03 / D05 제품 정확도 | bframe30 burst,30개이나2.6/2.7누락·2.8중복 | FAIL | 입력 정상, 실제clamp1건·후속시간재배치 |
| HW-DG04 / D06 제품 정확도 | bframe30 paced,30개이나3.0누락·3.1중복 | FAIL | 실제간격 공급도 EOS 뒤clamp1건 |
| HW-01 원인 관측 완전성 | 네셀 complete1,미지원/미확인경고/초과/예외0·원출력 완결 | PASS | 제품 해결 PASS가 아님; 다음 단계는 이 결함 수정 |
| `HW-IO01 pipe output and exit status preserved` | 자체07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR01 reorder accepted` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR02 same-count duplicate omission rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR02 same-count omission replacement rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR03 legitimate duplicate preserved` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR04 missing frame rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR05 invalid PTS rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR06 missing EOS rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR07 overflow rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR08 duplicate EOS rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR09 missing SEGMENT rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR10 non-TIME SEGMENT rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR11 complete oracle accepted` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR12 input mismatch is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR13 decoder mismatch is failure` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR14 overlay mismatch is failure` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR15 invalid observation is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR16 overflow is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR17 missing probe is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR18 missing bus EOS is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR19 bus ERROR is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR20 known error classification excludes raw text` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR21 unknown error classification excludes raw text` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR22 CAPS fixed allowlist rejects arbitrary values` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR01 actual product parse-launch PLACE_IN_BIN creates inspectable bin` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR02 no generated ghost sink occupies pending links` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR03 pay0 src connects directly to owned sink` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR04 dynamic downstream queue sink remains unoccupied` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-GR05 legacy automatic ghost occupies queue sink before PLAYING` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-OR23 delayed-link has fixed classification` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP01 callback retains decode number without pointers` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP02 push retains independent system number` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP03 decreasing warning preserves exact nanoseconds` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP04 malicious pointer token rejected without disclosure` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP05 trailing injected field rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP06 invalid timestamp rejected` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP07 unknown warning makes diagnosis inconclusive without raw retention` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP08 debug array overflow makes diagnosis inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP09 known decreasing warning completes diagnosis without product PASS` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP10 absent source log is not fabricated as wait completion` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP11 finish frame preserves pre-clamp PTS and unknown DTS without pointer` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP12 numeric overflow rejected before conversion` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP13 unrelated long LOG ignored before selected-prefix bound` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP14 selected-prefix oversized message is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP15 callback exception boundary makes diagnosis inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP16 malformed DTS rejected without inventing source formats` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP17 missing finish-frame observation is inconclusive` | 자체05/06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP18 official entry-only finish log is not pre-clamp evidence` | 자체06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP19 session-create error retains only signed numeric code` | 자체06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |
| `HW-DP20 session-create error rejects arbitrary suffix` | 자체06/07/08, 해당 assertion 실행·각 exit0 | PASS | 원출력의 개별 행과 대조 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| media-server-hw-impact.NdzVed | 자체05 binary/cache/registry | 1864596B | 자식 종료 후 삭제 | 부재 | self05 cleanup |
| media-server-hw-impact.x5yc9V | 진단01 binary/cache/registry | 1864596B | 자식 종료 후 삭제 | 부재 | drain01 cleanup |
| media-server-hw-impact.s5CdpK | 자체06 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | self06 cleanup |
| media-server-hw-impact.oUQq9k | 진단02 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | drain02 cleanup, 출력 누락 별도 기록 |
| media-server-hw-impact.3FuN3W | 자체07 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | self07 cleanup |
| media-server-hw-impact.cPiRx5 | 진단03 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | drain03 cleanup |
| media-server-hw-impact.y2sYkV | 자체08 binary/cache/registry | 1865156B | 자식 종료 후 삭제 | 부재 | self08 cleanup |

서버/포트/계정/운영 자료는 생성·변경하지 않았다. 로그는 안전 수치/hash/원인 순서와 개별 결과만 보존한다.
HW-01 커밋 전 문서/공백/스크립트 등록 검사를 수행한다. 커밋 완료와 HW-02 이후 완료를 구분한다.
등록 검사 첫 실행은11PASS/1FAIL이었다. grouped 출력 방지 문자열 검사가 출력이 아닌
invalid와 overflow bool을 쉼표로 함께 초기화하는 선언을 오탐했다. verifier는 유지하고 선언만 두 줄로 분리했다.
진단의 동작·ABI·시간값 처리는 같으므로 HW-01 네 셀 증거를 유지하고 자체검사/등록 검사만 재확인한다.
이 기록 편집 중 patch 문맥/행접두사 오류와 파일 검색 glob 불일치는 각각 미적용/읽기 실패로 끝났으며
제품·실행 증거를 바꾸지 않았다.
자체08은50/50 PASS·exit0·1840ms(wrapper3초), stderr0이다([로그](lp27-hw-self-08.log)).
등록 재검사02에서도 원래 선언을 인용한 이 문서가 같은 문자열 검사에 걸렸다(11PASS/1FAIL).
원래 선언 인용을 설명으로 바꾸고 검사 대상 전부에 금지 문자열이 없는지 확인한 뒤 재검사한다.
문서 링크02는 이전 이력으로 바꾼 제목을 가리키는 기존 anchor1개가 남아 실패했다. 해당 링크를 현재 제목으로 정정한다.

### HW-01 커밋 전 기록 검사

문서 링크03은288개 문서/9346링크/135anchor/failure0·exit0, 자산10/0·exit0,
등록03은12/0·exit0이다. bash 구문·working/staged diffcheck exit0.
등록 실패 로그01/02는 이력까지 검사하는 정적 문자열 규칙과 충돌하므로 문제 쉼표만 U+002C로
표기하고 원문 SHA를 파일 안에 보존했다. 둘 다 변환본이며 처음 FAIL을 유지한다.
진단 실행 로그와 제품 실패는 변환하지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 문서 링크02 | 제목 변경 후 기존 anchor1개 남음, exit1 | FAIL | 링크03에서 수정 확인 |
| 문서 링크03 | 288문서/9346링크/135anchor, exit0 | PASS | lp27-hw01-docs-links-03.log |
| bash 구문 | 진단 wrapper bash -n, exit0 | PASS | 의미 변경 없는 선언 분리 |
| 공백 검사 | git diff --check 및 --cached --check, exit0 | PASS | 커밋 직전 재확인 |
| 자산: README uses only representative product UI screenshots | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: English README uses English UI screenshots | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: UI guide keeps product screenshots in the shared asset set | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: docs UI asset policy documents capture rules | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: managed UI asset manifest stays complete | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: capture script owns every documented UI asset | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: docs capture covers current screenshots | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: representative screenshot docs do not point at stale visual baselines | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: docs UI asset directory contains managed PNG files | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 자산: VA documentation images keep full video frame bounds | 해당 명령 exit0, [자산 로그](lp27-hw01-docs-assets.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: dispatch parser recognizes explicit bash and node interpreters | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: server.sh dispatch targets exist and are executable | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: documented server.sh commands resolve to dispatch table | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: tracked scripts are classified and referenced | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: project inventory delegates script file inventory to this verifier | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: project inventory maps verifier families without duplicating dispatch details | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: CMake does not define a separate untracked CTest registry | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: test entry scripts are reachable from test_all | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: auth verifier has no hardcoded test password defaults | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: VA EventRecord dispatch verifier fails early and dispatches every poll by default | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: critical verifier pass output avoids grouped feature-result wording | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |
| 등록03: user-facing JS option parsers reject unknown options | 해당 명령 exit0, [등록03 로그](lp27-hw01-script-inventory-03.log) | PASS | 등록 최초11/1 → 최종12/0 이력 별도 보존 |

## HW-02 실행 전 계약과 한정 보완

HW-01 진단 커밋: `d3d0dbc6`. 확정 구현 담당은 기존 단일 Astra/medium이며 하위 위임 금지다.
메인은 실제 diff·합격 기준·최종 판정을 담당한다. 적용은 macOS + applemedia 정확한1.28.1 +
실제 fixed `video/x-h264` 입력 + `vtdec_hw`/`vtdec` 후보의 교집합이다. plugin/version/codec
미확인은 대상이라고 추정하지 않으며, Linux·다른 버전·H265/VP8/audio 선택은 유지한다.
해당 객체의 autoplug-select에서만 후보를 SKIP하고 나머지는 TRY한다. 후보 부재는 기존 실패로 남기며
무조건 avdec_h264 성공을 보장하지 않는다. 출력 route codec으로 입력 decoder를 결정하지 않는다.

공통 helper는 RTSP media root 준비 전과 URI uridecodebin PLAYING 전에 설치한다.
동적 child 관측 연결을 먼저 만들고 기존 tree를 순회하며 중복 설치·객체 해제·iterator 변경을 처리한다.
외부 callback 상태/root ref를 계속 보유하지 않는다. GStreamer OFF 컴파일 경계를 유지한다.
전역 rank·패키지·기존 payload/schema·녹화/ID/시간값·미디어 blocking·timeout은 불변이다.
공식 [decodebin autoplug-select](https://gstreamer.freedesktop.org/documentation/playback/decodebin.html#autoplug-select)의
TRY/SKIP·handler 누적 규칙을 사용한다. 버전 업그레이드 또는 upstream 소스 복사는 이번 범위가 아니다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-MP01~15 | 순수 선택 조건별 반례 | 두 대상·플랫폼·fixed/empty·codec·factory·plugin·version을 독립 assertion으로 확인, 실행 전 정확 목록 결박 | v4.1.0 |
| HW-MH01 | 기존 decodebin | 실제 signal에 설치 후 대상 SKIP, 나머지 TRY | v4.1.0 |
| HW-MH02 | 재설치 | 동일 객체 반복 설치 뒤 handler 중복 없음 | v4.1.0 |
| HW-MH03 | 동적 nested | 설치 뒤 추가된 bin/decodebin에도 정책 적용 | v4.1.0 |
| HW-MH04 | 전역 rank | 모든 대상/대조 factory rank 전후 불변 | v4.1.0 |
| HW-MH05 | 객체 수명 | root/child 해제·약한 참조 소멸, 외부 보유 없음 | v4.1.0 |
| HW-MH06 | 미완료 설치 | in-progress marker를 완료로 처리하지 않고 false, Linux는 무변경 no-op | v4.1.0 |
| HW-MH07 | 실패 설치 | 실패 marker 재호출도 false, Linux는 무변경 no-op | v4.1.0 |
| HW-MH08 | 동적 설치 실패 전달 | child 설치 실패를 고정문구 bus ERROR로 전달, 경고만으로 계속하지 않음 | v4.1.0 |
| HW-MH09 | 실제 H264 선택 신호 | 실제 factory/caps로 signal emit, 확인 tuple이면 SKIP·나머지 TRY | v4.1.0 |
| HW-MH10 | 실제 ANY 선택 신호 | ANY caps signal emit은 TRY | v4.1.0 |
| HW-MH11 | 실제 H265 선택 신호 | H265 caps signal emit은 TRY | v4.1.0 |
| HW-MH12 | 실제 SW 선택 신호 | avdec_h264 후보 signal emit은 TRY | v4.1.0 |
| HW-MI01-PTS | normal20 burst 정확도 | 제품 helper 적용한 실제 RTSP builder, 전체 입력/출력/overlay PTS·EOS | v4.1.0 |
| HW-MI01-SELECT | normal20 burst 선택 | 실제 관측 factory에서 해당 vtdec 후보 제외 | v4.1.0 |
| HW-MI02-PTS | normal20 paced 정확도 | DTS 간격, 동일 oracle·5초 EOS 유지 | v4.1.0 |
| HW-MI02-SELECT | normal20 paced 선택 | 실제 관측 factory 확인 | v4.1.0 |
| HW-MI03-PTS | B-frame30 burst 정확도 | 같은 HW-01 입력, 전체PTS multiset·EOS 유지 | v4.1.0 |
| HW-MI03-SELECT | B-frame30 burst 선택 | 실제 관측 factory 확인 | v4.1.0 |
| HW-MI04-PTS | B-frame30 paced 정확도 | 실제 간격 입력·동일 oracle, 보정 없이 원값 보존 | v4.1.0 |
| HW-MI04-SELECT | B-frame30 paced 선택 | 실제 관측 factory 확인 | v4.1.0 |
| HW-BUILD | 현재 전체 빌드 | 격리 GStreamer cache, local override 제외, ./server.sh build | v4.1.0 |
| HW-NOGST | GST OFF 경계 | 새 helper의 GST OFF 컴파일, GST header/symbol 의존 없음 | v4.1.0 |

메인 중간 검토로 Linux 실제 설치 no-op·동적 설치 실패 전달/marker 반례와 실제 signal 반환값을 보완했다.
반환 diff 검토에서 선택 oracle도 exact tuple만 거부하도록 맞췄다(다른 버전 vtdec를 무조건 거부하지 않음).
wrapper는 mitigation exit0이어도 완결 summary가 없으면 exit2이며 IO02로 직접 반례를 확인한다.
최종 자체 예상은 기존50+MP15+MH12+IO02=78이다. MP의 실행 전 정확 항목은 다음과 같다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| HW-MP01 | exact macOS H264 vtdec_hw tuple skips | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP02 | exact macOS H264 vtdec tuple skips | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP03 | other platform preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP04 | nonfixed ANY or ambiguous caps preserve selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP05 | empty caps preserve selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP06 | H265 input preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP07 | VP8 input preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP08 | other factory preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP09 | other plugin preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP10 | older version preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP11 | newer version preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP12 | unknown version preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP13 | unknown factory preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP14 | unknown plugin preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-MP15 | raw input preserves selection | 선택 predicate의 독립 참/거짓 assertion | v4.1.0 |
| HW-IO02 | 미완결 결과의 거짓 PASS 방지 | mitigation exit0+summary 부재→2, 정상/실패/자체 모드 원 exit 유지 | v4.1.0 |
`--mitigation-impact`만 제품 정책을 적용하고 기존 `--drain-diagnosis`/`--rtsp-impact`는 보존한다.
관측 불완전/제품FAIL을 즉시 실패로 유지하고 다음 단계로 넘어가지 않는다.
미디어 기본 회귀7.4 중 실제 브라우저 metadata는 사용자 제외에 따라 이번 실행하지 않는다.
codec/ICE의 기존 명령은 외부/기존 서버에 연결하지 않도록 격리 선수조건을 확인한 뒤 HW-03에서 판정한다.
HW-03의 실제 코덱·URI 경계·자원 영향과 S11 최종 묶음을 이 자체검사 PASS로 대체하지 않는다.

기존 증거 유지 판단(이 helper/두 호출부 외 제품 변경이 없을 때): LP25 실제 앱은
`verify_recording_current_app.mjs`의 source9101 `kind:file`/identity.mp4를 사용하고,
LP26 장시간 준비도 `verify_recording_current_longrun.mjs`의 file source다. 두 경로는
UriSourceWorker와 RTSP egress 자동 decoder를 사용하지 않는다. API/Auth/managed 저장·파생 구현도
변경하지 않으므로 LP25 156/LP26 436의 해당 단기 증거를 이번 인계만으로 재실행하지 않는다.
URI/RTSP 회귀 및 S11 최종 cut PASS로 확장하지 않으며, 실제 diff가 이 경계를 넘으면 재판정한다.

### HW-02 구현·실행 결과

제품 변경은 공통 `core::ShouldSkipAppleH264Decoder`/`InstallDecodeCompatibility`,
UriSourceWorker::Start/OnMediaConfigure의 설치 호출과 CMake 등록이다. 기존 입력/출력 codec,
PTS/DTS·저장·공개 API·전역 rank는 변경하지 않았다. 설치된 VideoToolbox를 고친 것이 아니라
확인된 조합의 제품 자동선택을 회피한 해결책이다. 다른 OS/버전은 이번 macOS 실행으로 검증했다고 주장하지 않는다.
메인이 실제 diff를 검토하고 반환 뒤 exact tuple oracle와 미완결 summary 거부를 직접 보완했다.

`./server.sh build` exit0(전체 runtime/server), 새 helper의 `c++ -std=c++17 -Wall -Wextra -Werror
-Iinclude -DMEDIA_SERVER_USE_GSTREAMER=0 -fsyntax-only src/core/gst_decode_compatibility.cpp` exit0.
빌드/GST OFF elapsed는 명령에 타이머가 없어 미계측이며 token 집계도 미제공이다. Linux 실기기 실행은 아니다.
`bash scripts/internal/verify_recording_hw_impact.sh --self-test` 자체01은78PASS·exit0·1871ms/3초,
`--mitigation-impact` 보완01은4셀/8PASS·exit0·6292ms/7초, stderr0·EOS/입력/decoder/overlay 모두 일치.
둘은 같은 archive `de62559c57ea2ed918615990af970ef10cb5df29d8a9d7fe226b4eab5655f585`에 결박했다.
일반/B-frame 모든 셀의 실제 decoder는 avdec_h264/libav1.28.1이었다. 원래 HW-01 실패는 여전히 유효한 과거 반례다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-BUILD | 격리 cache·local override 제외, 전체 configure/build exit0 | PASS | [빌드 출력](lp27-hw02-build.log) |
| HW-NOGST | 위 GST OFF helper 컴파일 exit0, 원출력 없음 | PASS | 전체 Linux 실행 아님 |
| `HW-IO01 pipe output and exit status preserved` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-IO02 incomplete mitigation summary cannot pass` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR01 reorder accepted` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR02 same-count duplicate omission rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR02 same-count omission replacement rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR03 legitimate duplicate preserved` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR04 missing frame rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR05 invalid PTS rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR06 missing EOS rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR07 overflow rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR08 duplicate EOS rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR09 missing SEGMENT rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR10 non-TIME SEGMENT rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR11 complete oracle accepted` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR12 input mismatch is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR13 decoder mismatch is failure` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR14 overlay mismatch is failure` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR15 invalid observation is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR16 overflow is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR17 missing probe is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR18 missing bus EOS is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR19 bus ERROR is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR20 known error classification excludes raw text` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR21 unknown error classification excludes raw text` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR22 CAPS fixed allowlist rejects arbitrary values` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR01 actual product parse-launch PLACE_IN_BIN creates inspectable bin` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR02 no generated ghost sink occupies pending links` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR03 pay0 src connects directly to owned sink` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR04 dynamic downstream queue sink remains unoccupied` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-GR05 legacy automatic ghost occupies queue sink before PLAYING` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-OR23 delayed-link has fixed classification` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP01 callback retains decode number without pointers` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP02 push retains independent system number` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP03 decreasing warning preserves exact nanoseconds` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP04 malicious pointer token rejected without disclosure` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP05 trailing injected field rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP06 invalid timestamp rejected` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP07 unknown warning makes diagnosis inconclusive without raw retention` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP08 debug array overflow makes diagnosis inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP09 known decreasing warning completes diagnosis without product PASS` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP10 absent source log is not fabricated as wait completion` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP11 finish frame preserves pre-clamp PTS and unknown DTS without pointer` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP12 numeric overflow rejected before conversion` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP13 unrelated long LOG ignored before selected-prefix bound` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP14 selected-prefix oversized message is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP15 callback exception boundary makes diagnosis inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP16 malformed DTS rejected without inventing source formats` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP17 missing finish-frame observation is inconclusive` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP18 official entry-only finish log is not pre-clamp evidence` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP19 session-create error retains only signed numeric code` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-DP20 session-create error rejects arbitrary suffix` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP01 exact macOS H264 vtdec_hw tuple skips` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP02 exact macOS H264 vtdec tuple skips` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP03 other platform preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP04 nonfixed ANY or ambiguous caps preserve selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP05 empty caps preserve selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP06 H265 input preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP07 VP8 input preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP08 other factory preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP09 other plugin preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP10 older version preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP11 newer version preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP12 unknown version preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP13 unknown factory preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP14 unknown plugin preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MP15 raw input preserves selection` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH01 existing decodebin hook follows platform gate` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH02 repeated installation does not duplicate hooks` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH03 dynamically nested decodebin hook follows platform gate` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH04 installation leaves global factory ranks unchanged` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH05 root and decoder lifetimes retain no external references` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH09 actual H264 signal returns SKIP only for installed affected tuple` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH10 actual ANY caps signal returns TRY` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH11 actual H265 caps signal returns TRY` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH12 actual avdec_h264 candidate signal returns TRY` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH06 in-progress marker is not completion on macOS and untouched elsewhere` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH07 failed marker remains failed across repeated installation` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MH08 dynamic installation failure posts bus ERROR only on macOS` | 자체01의 해당 assertion, 명령 exit0 | PASS | [자체01](lp27-hw02-self-01.log)의 개별 행 대조 |
| `HW-MI01-normal20-burst exact full PTS and EOS` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI01-normal20-burst selected factory respects exact compatibility tuple` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI02-normal20-paced exact full PTS and EOS` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI02-normal20-paced selected factory respects exact compatibility tuple` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI03-bframe30-burst exact full PTS and EOS` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI03-bframe30-burst selected factory respects exact compatibility tuple` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI04-bframe30-paced exact full PTS and EOS` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |
| `HW-MI04-bframe30-paced selected factory respects exact compatibility tuple` | 보완01의 해당 assertion, 명령 exit0 | PASS | [보완01](lp27-hw02-impact-01.log)의 개별 행 대조 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/tmp/media-server-hw-build.ZkXWIf | build cache/symlink mirror | 62691B | 실제 소유/0700/정규경로 확인 후 삭제 | 부재 | 메인 cleanup exit0 |
| media-server-hw-impact.EzPd0G | 자체01 binary/cache/registry | 1886868B | 자식 종료 후 삭제 | 부재 | 자체01 cleanup |
| media-server-hw-impact.HYcKB3 | 보완01 binary/cache/registry | 1886868B | 자식 종료 후 삭제 | 부재 | 보완01 cleanup |

새 서버/포트/계정은 사용하지 않았다. 빌드 산출물은 기존 build-gst-onnx에 유지한다.
HW-03 영향·PREP/CLOSE 및 S11 최종 검증은 아직 미실행이며 이번 PASS 범위 밖이다.

HW-02 마감: 문서 링크288개/9455링크/135anchor·실패0, 등록12/0·exit0, bash구문/diffcheck exit0.
이미지·자산 참조 변경은 없어 HW-01 자산10PASS의 유효 범위를 유지했다.
출력이 없는 GST OFF 컴파일의 빈 로그 파일은 불필요하여 제거했으며 실제 command/exit는 위에 보존했다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-02 문서 링크 | 위288문서/9455링크/135anchor·exit0 | PASS | [문서 출력](lp27-hw02-docs-links.log) |
| HW-02 bash 구문 | bash -n scripts/internal/verify_recording_hw_impact.sh exit0 | PASS | 실제 실행 전/마감 확인 |
| HW-02 공백 | git diff --check 및 --cached --check exit0 | PASS | stage 범위 확인 |
| dispatch parser recognizes explicit bash and node interpreters | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| server.sh dispatch targets exist and are executable | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| documented server.sh commands resolve to dispatch table | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| tracked scripts are classified and referenced | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| project inventory delegates script file inventory to this verifier | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| project inventory maps verifier families without duplicating dispatch details | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| CMake does not define a separate untracked CTest registry | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| test entry scripts are reachable from test_all | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| auth verifier has no hardcoded test password defaults | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| VA EventRecord dispatch verifier fails early and dispatches every poll by default | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| critical verifier pass output avoids grouped feature-result wording | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |
| user-facing JS option parsers reject unknown options | HW-02 등록검사 exit0 | PASS | [등록 출력](lp27-hw02-script-inventory.log) |

## 이전 승인 범위와 순서

| 번호 | 사용자 지시 | 상태 | 산출물·완료 기준 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | HW 디코딩 영향 판정·필요 경로 보완 | 부분 완료·수정 방침 판단 대기 | 실제 RTSP builder graph에서 decoder PTS 불일치 및 overlay 전달 확인. 제품 선택 정책 보완은 미실행 | 자체04·영향03 |
| 2 | 검증 준비 마감 | 건너뜀 | 1번 미해소. 초기 기능 ID/복합 요구·실환경 실행·최종 대상 결박 잔여 | LP26 실행 매핑 |
| 3 | 구형 코드·개발 자료 정리 | 건너뜀 | 1번 미해소. 소유·사용처·대체 검사를 확인하고 불필요 부분만 삭제할 예정 | LP26 릴리즈 전수 대조 |
| 4 | 문서·S10 코드/증거 고정 | 건너뜀 | 1번 미해소. 이번 중단 기록 작성은 S10 고정 완료가 아님 | AGENTS3/6/7/12 |
| 5 | 분할 커밋·푸시·종합 보고 | 커밋/푸시 미수행·보고 정리 | 승인 유지하되 1번 실패 및 미커밋 상태로 조건 미충족. 종합 잔여는 이 문서와 최신 전수표 | 사용자 최신 지시·AGENTS5 |

장시간/실제 UI·verify-predev·PR/merge/tag/Release·후속 브랜치·외부 실기기는 이번 실행 범위 밖이다.
기존 저장/API/시간/ID/보존·미디어 blocking 계약, 비밀 보호·격리·정리 경계를 유지한다.
HW 실패를 없애려고 설치 패키지·전역 factory rank·timeout·합격 oracle를 바꾸지 않는다.
근거가 확인되지 않은 동일 재실행은 하지 않는다. 1번이 해결되지 않으면 2~4로 넘어가지 않는다.
메인이 안전 설계·공식 source/제품 경로·최종 판정을 맡는다. 기존 단일 Astra/medium 담당자는 확정된 독립 범위만 수행하며 하위 위임 금지.
현재 Superpowers 스킬은 가용 목록에 없으므로 설계·원인 분리·반례·검토·영향 검증을 직접 적용한다.

## 1번 직접 확인과 진단 기준

기존 동일 SHA 파일 대조는 qtdemux/parser 입력이 정상인 상태에서 vtdec_hw의 count 감소 및 PTS 누락/중복을 확인했다.
WR01은20→19, WR05는30→29이며 EOS가 관측되었다. SW 대조는 정상이나 HW 해결 근거는 아니다.
원본 녹화 writer/remux는 압축 packet을 저장하며 분석 raw decoder와 파생 remux의 H264 decode는 명시 avdec_h264다.
자동 선택은 UriSourceWorker의 HTTP/HLS/해석된 YouTube 입력, RTSP egress의 BuildFactoryLaunch에 남아 있다.
URI downstream의 leaky queue/videorate와 subscriber queue는 별도 손실 경계다. decoder 자체 PTS 손실과 혼동하지 않는다.

[GStreamer 1.28.1 vtdec 공식 구현](https://raw.githubusercontent.com/GStreamer/gstreamer/1.28.1/subprojects/gst-plugins-bad/sys/applemedia/vtdec.c)의
drain/finish·비동기 callback을 참고하되 이 일반 구현만으로 plugin/VideoToolbox 내부 원인을 확정하지 않는다.
외부 코드 복사·설치/수정 없음. 특허 자료를 검색·참고하지 않는다.

### 사전 등록

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP27-H01 | 동일 입력/소스 결박 | 격리 생성한 H264 일반/B-frame AU·파일 SHA·PTS/DTS를 고정하고 제품 factory/builder 재사용 여부 확인 | v4.1.0 |
| LP27-H02 | 실제 decoder 경계 | 실제 factory·sink/src의 buffer/PTS·EOS·SEGMENT와 누락 관측 수를 비교 | v4.1.0 |
| LP27-H03 | 제품 downstream 경계 | URI raw 입력/encoder 이전, RTSP analysis_overlay raw 입력의 PTS 대응. leaky/rate 정책과 decoder 오류 분리 | v4.1.0 |
| LP27-H04 | 독립 oracle | 같은 개수의 중간 누락/중복, EOS 이전 중단, 관측 누락·source 불일치 거부. 정상 재정렬은 presentation 비교 | v4.1.0 |
| LP27-H05 | 종료·안전 | 제한된 실행·thread/pipeline 종료·probe 수명·소유 root/포트 정리·원본 불변 | v4.1.0 |
| LP27-H06 | 판정 분리 | 관측 성공과 제품 정상 PASS 분리. bounded 미재현은 무영향/해결이 아님, 최초 불일치 보존 | v4.1.0 |

#### 최초 실행 명령·회수 기준

1. `bash scripts/internal/verify_recording_hw_impact.sh --self-test`: 독립 oracle의 정상/누락/중복/EOS/관측 상한 반례.
2. 1번 통과 후 `bash scripts/internal/verify_recording_hw_impact.sh --rtsp-impact`: 실제 제품 BuildFactoryLaunch를 링크한
   video branch를 진단 소유 sink로 소비하며 decoder sink/src와 analysis_overlay sink를 대조한다.
   실제 RTSP 네트워크/클라이언트 검사가 아니며 HTTP/HLS source worker 전체 영향으로 확대하지 않는다.

normal20/B-frame30 AU를 각각 한 번 생성하고 동일 입력으로 최대16round(총32graph)만 관측한다.
실제 ConfigureFactory는 BuildFactoryLaunch를 그대로 사용한다(gstreamer_rtsp_server.cpp:299).
PushToAppSrc는 PTS/DTS/DELTA만 전달하고 duration을 설정하지 않는다(rtsp_egress_session.cpp:152).
따라서 probe도 duration을 설정하지 않으며 원본 AU duration은 입력 증거로만 남긴다. 최초 실행 전 조건을 제품과 일치시켰다.
첫 불일치/관측 오류에서 전체 종료하며 다음 정상 실행으로 실패를 대체하지 않는다.
전체 presentation multiset을 비교해 같은 count의 중복·누락도 거부한다. QoS/경계 관측 부재는 정상으로 추정하지 않는다.
기존 helper의 encoder EOS 미관측 한계 때문에 AU 생성 성공만으로 무손실 입력이라 하지 않고 실제 decoder sink 입력과 전체 AU를 대조한다.
성공 단기 oracle exit0, 실제 mismatch exit1, 준비/관측 실패 exit2, bounded 미재현 exit3을 구분한다.
미재현은 기존 WD05/08 해소/제품 무영향 PASS가 아니다. 외부 패키지·디코더 선택 정책 변경이 필요하면 중단해 범위를 보고한다.
wrapper의180초는 32graph 진단 전체 안전상한이며 각graph5초 drain/sample3초의 기존 기준을 늘리지 않는다.
소유0700root 내 compile/cache/registry만 생성한다. 프로세스 종료 후 크기·삭제·부재를 기록하며 운영 자료/외부입력/네트워크를 사용하지 않는다.
임시 자료 외 필요한 원출력은 비민감 수치/PTS/hash만 LP27 artifact로 보존하고 raw GStreamer stderr는 bytes/hash/고정 분류만 공개한다.
관측기 자체 critical/warning도 정상 판정으로 덮지 않고 준비 오류exit2로 반환한다.
실행 전 메인 리뷰는 segment 시각 근거·관측불완전과 제품 불일치 구분·예외에서도NULL→callback해제 수명·root 소유 검사를 보완한다.
`--self-test`의 관련 반례를 추가하며 최초 실제 실행 전에 이 기준을 고정한다.

GStreamer 공식 1.28 release notes에는 후속 vtdec 수정 이력이 있으나 이번 프레임/PTS 문제의 수정 여부나
현 환경 업그레이드 적합성은 확인되지 않았다. 이것을 원인 확정이나 패키지 교체 승인으로 사용하지 않는다.
출처: [공식 1.28 변경 기록](https://gstreamer.freedesktop.org/releases/1.28/).

예상된 RED는 명시 반례 oracle의 미구현 assertion으로만 한정한다. 빌드·환경·기존 제품 실패는 RED가 아니다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 관련 단기 자체/제품 영향 | 진행 대상 | 1~4 개발 요청 | LP27-H01~06·후속 단계 사전정의 | 승인·단계별 실행 |
| 제품 전체 빌드/영향 회귀 | 조건부 진행 | 실제 제품 수정 시 해당 영향 | 변경 diff 확정 후 선정 | 개발 관련 범위만 승인 |
| 30분·120분·실제 UI | 미진행 | 현재 선행 개발 단계 | AGENTS7.6.2·S11 | 이번 실행 제외, 릴리즈 필수 여부는 유지 |
| 문서/등록 정합 | 진행 대상 | 실행/문서 변경 | diffcheck·docs-links/assets·script inventory | 승인된 변경 단기 검증 |
| 외부 release action | 미진행 | 개발 브랜치 push만 승인 | AGENTS4/5 | PR/merge/tag/Release 별도 |

## 실행 결과·정리

첫 자체검사 exit0/20PASS, 실행499ms·wrapper1초, root279787B 삭제·부재 확인. [원출력](lp27-hw-self-01.log).
첫 실제 graph는 normal20 round1에서 exit2/1669ms·wrapper2초. 입력 push20은 수용됐으나
decoder sink8/EOS0→src1/EOS0→overlay0·SEGMENT0, busERROR1/WARNING1으로 관측 전제가 미충족됐다.
선택은 vtdec_hw/applemedia1.28.1/rank257. 이것은 과거20→19 재현이나제품무영향 증거가 아니다.
원출력 [impact01](lp27-hw-impact-01.log), root1819636B 삭제·부재. 2~4번은 실행하지 않았다.

진단 준비의 누락: bus 코드/분류를 보존하지 않아 ERROR 원인을 확정할 수 없다.
동일 단계에서 source factory/domain/code 및 허용된 고정 negotiation/stream/decoder 오류 분류,
CAPS의 안전한 media/format/width/height/memory feature만 추가한다. raw 오류/debug/URI/codec_data는 출력하지 않는다.
LP27-H02/H05 관측 oracle를 보완하고 자체검사 뒤 같은 단기 진단1회로 오류를 분리한다.
timeout·pipeline·자동선택·합격 조건은 변경하지 않는다. 분류할 수 없는 오류는 unknown으로 남기며 맹목 반복하지 않는다.

읽기 탐색에서 존재하지 않는 추정 소스/문서 경로 및 없는 .agents 디렉터리에 대한 rg exit2는
실행 실패/제품 회귀가 아니라 경로 탐색 오류이며, rg --files로 실제 위치를 확인했다.
token start/end/consumed는 전용 집계 미제공으로 미집계. elapsed/source는 실제 실행 원출력 범위로 기록한다.

### 안전 분류 보완 후 재검사와 준비 결함 확정

자체02는 exit0/23PASS,590ms·wrapper2초,root298987B 삭제·부재([로그](lp27-hw-self-02.log)).
영향02는 exit2/1398ms·wrapper2초,normal20 round1에서 중단([로그](lp27-hw-impact-02.log)).
`gst_parse_error` code7은 로컬 gstparse.h의 `GST_PARSE_ERROR_DELAYED_LINK`다.
decodebin warning 뒤 appsrc stream-error code1, decoder sink8/src1/overlay0, sink·src EOS0이었다.
decoder 출력은 NV12/SystemMemory160x90이며, 영상 형식 자체가 원인이라고 단정하지 않는다.
root1838836B 삭제·부재. 이전과 같은 입력 SHA를 유지했고 제품 정상/과거20→19 재현 증거가 아니다.

공식1.28.1 소스를 읽어 진단의 구성 차이를 확인했다.
[RTSP factory default_create_element](https://raw.githubusercontent.com/GStreamer/gstreamer/1.28.1/subprojects/gst-rtsp-server/gst/rtsp-server/rtsp-media-factory.c)는
`gst_parse_launch_full`+`GST_PARSE_FLAG_PLACE_IN_BIN`을 사용한다.
반면 최초 probe의 `gst_parse_bin_from_description(...,TRUE)`는
[gstutils 자동 ghost 처리](https://raw.githubusercontent.com/GStreamer/gstreamer/1.28.1/subprojects/gstreamer/gst/gstutils.c)에서
아직 동적 연결을 기다리는 downstream queue sink까지 외부 ghost target으로 점유할 수 있다.
이는 제품의 생성 방식과 다른 진단 준비 결함이다. pipeline 표현/timeout/rank를 바꾸지 않고
제품과 같은 생성 함수를 사용하며 pay0 출력만 진단 sink에 연결하도록 수정한다.
LP27-H03/H04에 생성 방식·추가 ghost sink 부재·pay0 출력 연결·동적 sink 미점유 자체검사를 실행 전 추가한다.
수정 후 자체검사 통과 시 동일 영향 검사를1회 재개한다. 이 차이가 해결돼도 과거 HW 손실이 해결된 것으로 간주하지 않는다.
자체검사에 기존 자동ghost 방식의 queue sink 점유를 NULL 상태에서 직접 확인하는 음성 대조도 추가한다.
이 assertion이 실제 통과하기 전에는 연결 실패의 확정 원인 증거로 사용하지 않는다.
자체03은28PASS/1FAIL(exit1,1620ms)이며 GR05에서 기존 자동ghost의 queue 점유를 직접 확인했다.
GR04 수정된 생성 방식의 pending queue 미점유도 PASS이나 GR02는 recursive 전체 ghost sink0을 요구해 실패했다.
decodebin이 원래 갖는 내부 ghost sink와 진단의 외부 자동ghost를 구분하지 않은 검사 오류다.
메인이 회수해 branch 외부 ghost sink0 및 queue target 점유0으로 수정한다. 실제 동적 연결 대기 queue1 기준은 유지한다.
이것은 새 제품 합격 기준이 아니라 진단이 제품 graph를 바꾸지 않는 조건의 정확한 검사다.
영향03은 아직 실행하지 않았다. root1840420B 삭제·부재, 원출력 [자체03](lp27-hw-self-03.log).
공식 원문 조회는 읽기 전용이며 각 curl+rg exit0, 파일 저장·외부 코드 복사·패키지 변경은 없었다.
웹 읽기 도구의 cache miss 후 같은 공식 source를 curl로 읽었다. 문구 수정 patch1회는 대상 행 불일치로 미적용 후 정확한 행으로 적용했다.

### 자체02 개별 결과

명령 `bash scripts/internal/verify_recording_hw_impact.sh --self-test`,exit0.
자체01의 처음20개는 동일 제목으로 PASS였고,02에서 안전 분류3개를 추가했다. 전체 원출력은 각 실행 로그에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-OR01 reorder accepted | `--self-test`, exit0·HW-OR01 reorder accepted | PASS | 안전 분류 추가 후 자체02 |
| HW-OR02 same-count duplicate omission rejected | `--self-test`, exit0·HW-OR02 same-count duplicate omission rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR02 same-count omission replacement rejected | `--self-test`, exit0·HW-OR02 same-count omission replacement rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR03 legitimate duplicate preserved | `--self-test`, exit0·HW-OR03 legitimate duplicate preserved | PASS | 안전 분류 추가 후 자체02 |
| HW-OR04 missing frame rejected | `--self-test`, exit0·HW-OR04 missing frame rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR05 invalid PTS rejected | `--self-test`, exit0·HW-OR05 invalid PTS rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR06 missing EOS rejected | `--self-test`, exit0·HW-OR06 missing EOS rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR07 overflow rejected | `--self-test`, exit0·HW-OR07 overflow rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR08 duplicate EOS rejected | `--self-test`, exit0·HW-OR08 duplicate EOS rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR09 missing SEGMENT rejected | `--self-test`, exit0·HW-OR09 missing SEGMENT rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR10 non-TIME SEGMENT rejected | `--self-test`, exit0·HW-OR10 non-TIME SEGMENT rejected | PASS | 안전 분류 추가 후 자체02 |
| HW-OR11 complete oracle accepted | `--self-test`, exit0·HW-OR11 complete oracle accepted | PASS | 안전 분류 추가 후 자체02 |
| HW-OR12 input mismatch is inconclusive | `--self-test`, exit0·HW-OR12 input mismatch is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR13 decoder mismatch is failure | `--self-test`, exit0·HW-OR13 decoder mismatch is failure | PASS | 안전 분류 추가 후 자체02 |
| HW-OR14 overlay mismatch is failure | `--self-test`, exit0·HW-OR14 overlay mismatch is failure | PASS | 안전 분류 추가 후 자체02 |
| HW-OR15 invalid observation is inconclusive | `--self-test`, exit0·HW-OR15 invalid observation is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR16 overflow is inconclusive | `--self-test`, exit0·HW-OR16 overflow is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR17 missing probe is inconclusive | `--self-test`, exit0·HW-OR17 missing probe is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR18 missing bus EOS is inconclusive | `--self-test`, exit0·HW-OR18 missing bus EOS is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR19 bus ERROR is inconclusive | `--self-test`, exit0·HW-OR19 bus ERROR is inconclusive | PASS | 안전 분류 추가 후 자체02 |
| HW-OR20 known error classification excludes raw text | `--self-test`, exit0·HW-OR20 known error classification excludes raw text | PASS | 안전 분류 추가 후 자체02 |
| HW-OR21 unknown error classification excludes raw text | `--self-test`, exit0·HW-OR21 unknown error classification excludes raw text | PASS | 안전 분류 추가 후 자체02 |
| HW-OR22 CAPS fixed allowlist rejects arbitrary values | `--self-test`, exit0·HW-OR22 CAPS fixed allowlist rejects arbitrary values | PASS | 안전 분류 추가 후 자체02 |

### 실제 제품 경계 관측 결과와 중단 이유

자체04는29PASS/0FAIL,exit0·1526ms·wrapper2초([로그](lp27-hw-self-04.log)).
영향03은 실제 제품과 같은 parse 방식에서 normal20 round1의 전체PTS/EOS 일치를 확인한 뒤,
B-frame30 round1에서 최초 `decoder-pts-mismatch`로 종료했다(exit1·1394ms·wrapper2초).
[영향03 원출력](lp27-hw-impact-03.log)은 source/입력 SHA·각 AU·세 경계 PTS·EOS·CAPS를 포함한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| H01 동일 입력 | normal20 SHA0becff01… / B-frame30 SHA3d4812da…; 영향01/02/03 동일 | PASS | 비디오 원본 파일 변조가 아닌 동일 생성 AU |
| H03 제품 graph 생성 | 외부 ghost0/queue target 점유0/pending queue1/pay0 연결1 | PASS | 앞선 진단 준비 결함 수정. RTSP 네트워크 검사는 아님 |
| H02 일반 입력 round1 | sink20/src20/overlay20·전체 PTS 일치·EOS 각1 | PASS | 한 round 한정. 과거 일반 입력 손실 해소를 뜻하지 않음 |
| H02 B-frame 입력 round1 | sink30·입력 PTS 일치·EOS1 | PASS | decoder에 모든 입력 전달 확인 |
| H02 B-frame 출력 round1 | src30이나 PTS2.6/2.7초 없음,2.8초3개 | FAIL | decoder 출력 경계에서 처음 불일치. 영상 픽셀 중복/손실까지 단정하지 않음 |
| H03 B-frame overlay round1 | overlay30,decoder의 PTS 불일치 그대로 전달 | FAIL | downstream queue/videoconvert가 고친다고 가정할 수 없음 |
| H05 관측·종료 | EOS각1/busEOS1,error0/warning0/QoS0/invalid0/overflow0,process 정상 exit1 | PASS | 오류 코드 없는 정상 종료와 제품 정확도 PASS는 다름 |
| H06 최초 실패 보존 | attempts2 후 종료,다음 round나SW로 실패 덮지 않음 | PASS | 제품 판정은 FAIL 유지 |

메인이 확인한 범위:

- 확인: macOS arm64/GStreamer1.28.1의 vtdec_hw 선택, 실제 BuildFactoryLaunch H264 graph 내부에서 PTS 불일치가 발생·전달된다.
- 확인: 원본 File/RTSP recorder는 압축 packet 경로, analysis/raw_video_decoder 및 derived_remux H264 decode는 명시 avdec_h264다. 이번 도구는 이들 제품 경로를 바꾸지 않았다.
- 미확인: 실제 RTSP 네트워크/client와 HTTP/HLS UriSourceWorker 전체 동작. latter는 자동 decoder 선택 코드가 있어 영향 가능성이 있으나 동일 실제 실행 근거는 없다.
- 추론: 공식 vtdec1.28.1은 drain flag를 켠 뒤 비동기 frame 완료를 기다리며 output loop는 drain 중 reorder 깊이 조건 없이 출력한다. 이 순서가 말단 B-frame PTS 현상과 관련될 가능성은 있지만 callback·기본 GstVideoDecoder 내부를 직접 계측하지 않았으므로 근본 내부 결함을 확정하지 않는다.
- 금지: PTS를 downstream에서 임의 재부여해 정상으로 만들기, HW 실패를 SW PASS로 덮기, timeout 확대, 전역 rank/설치 패키지 변경.

권장 재개 범위는 영향을 받는 제품 H264 자동선택 경로의 로컬 SW 우선 보완과 동일 exact PTS/종료 회귀다.
디코더 선택 정책 및 HW 사용/자원 영향이 바뀌므로 사용자에게 범위 결정을 요청했다.
승인 전에는 해당 제품 변경·반복 실행·2~4번·실패 단계 커밋·푸시를 진행하지 않는다.
기존 LP25의 실제5단계156PASS 및 LP26 준비436개는 해당 동일 소스/범위의 과거 증거로 유지하며,
이번 HW 실패를 이유 없이 기존 저장/HTTP 실패로 바꿔 재등록하지 않는다. 최종 제품 수정 시 영향 범위를 다시 판정한다.

### 자체03→04의 추가 개별 결과

자체04에서 앞 표의23개는 모두 다시 PASS였다. 아래6개가 추가 실행됐다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HW-GR01 | 제품 parse-launch PLACE_IN_BIN 생성/검사 | PASS | 03/04 각PASS |
| HW-GR02 | 외부 자동ghost 및 queue target 점유 없음 | PASS | 03 FAIL:정상 decodebin 내부ghost까지 집계 → 04 수정후PASS. 최초FAIL 유지 |
| HW-GR03 | pay0와 소유 sink 직접 연결 | PASS | 03/04 각PASS |
| HW-GR04 | 동적 downstream queue sink 미점유1 | PASS | 03/04 각PASS |
| HW-GR05 | 구형 자동ghost의 queue 점유 음성 대조 | PASS | 03/04 각PASS,PLAYING 안 함 |
| HW-OR23 | delayed-link 고정 분류 | PASS | 03/04 각PASS |

### 문서·도구 정리 검증 사전 정의

제품 실패 뒤 다음 개발 단계가 아니라 이번 중단 기록과 진단 도구의 정합만 검사한다.
`bash -n scripts/internal/verify_recording_hw_impact.sh`, `git diff --check`,
`./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-script-inventory`를 순차 실행한다.
새 untracked helper는 tracked inventory 검사 밖이라는 한계를 명시하고 실제wrapper/native참조를 직접 대조한다.
이 문서 검사를 제품 실패·최종 안정화·1번 전체 PASS로 사용하지 않는다.

실행은 위 순서대로 exit0이었다. 링크288md/9334links/실패0,자산10/스크립트12PASS,
bash 구문 및 공백 검사 통과. [원출력](lp27-record-checks.log).
새 wrapper/native의 상호참조 및 이 기록의 호출 명령은 직접 확인했으나 tracked inventory12개가
untracked 파일까지 정식 등록 완료로 판정한 것은 아니다. 커밋 조건 충족 시 stage 후 재확인 대상이다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 셸 구문 | bash -n scripts/internal/verify_recording_hw_impact.sh,exit0 | PASS | 실행 아님 |
| 공백 | git diff --check,exit0 | PASS | tracked 변경 기준, 신규 파일 최종 별도 확인 |
| 문서 링크 | verify-docs-links,exit0·288/9334/0 | PASS | 실제 UI 검증 아님 |
| README uses only representative product UI screenshots | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| English README uses English UI screenshots | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| UI guide keeps product screenshots in the shared asset set | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| docs UI asset policy documents capture rules | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| managed UI asset manifest stays complete | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| capture script owns every documented UI asset | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| docs capture covers current screenshots | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| representative screenshot docs do not point at stale visual baselines | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| docs UI asset directory contains managed PNG files | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| VA documentation images keep full video frame bounds | `./server.sh verify-docs-ui-assets`,exit0 | PASS | 문서/도구 정합 한정 |
| dispatch parser recognizes explicit bash and node interpreters | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| server.sh dispatch targets exist and are executable | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| documented server.sh commands resolve to dispatch table | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| tracked scripts are classified and referenced | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| project inventory delegates script file inventory to this verifier | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| project inventory maps verifier families without duplicating dispatch details | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| CMake does not define a separate untracked CTest registry | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| test entry scripts are reachable from test_all | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| auth verifier has no hardcoded test password defaults | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| VA EventRecord dispatch verifier fails early and dispatches every poll by default | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| critical verifier pass output avoids grouped feature-result wording | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |
| user-facing JS option parsers reject unknown options | `./server.sh verify-script-inventory`,exit0 | PASS | 문서/도구 정합 한정 |

### 소유 임시 자료 정리

경로의 공통 상위는 `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/`다.
원출력에는 각 절대 경로를 보존했다. 아래 모든 실행은 자식 종료 후wrapper가 삭제했고 마지막 읽기 확인에서 모두 부재였다.
삭제한 자료는 재생성 가능한 실행 전용 binary/cache/registry이며 필요한 비민감 값은 연결 로그에 보존했다.
실제 서버·RTSP listener·HTTP listener를 만들지 않아 포트 정리 대상은 없다. 운영 자료·기존 영상 삭제 없음.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| media-server-hw-impact.mpmo60 | 자체01 임시 binary/cache | 279787B | 자식 종료 후 삭제 | 부재 | self01 cleanup |
| media-server-hw-impact.gcANKq | 영향01 임시 binary/cache | 1819636B | 자식 종료 후 삭제 | 부재 | impact01 cleanup |
| media-server-hw-impact.vg506a | 자체02 임시 binary/cache | 298987B | 자식 종료 후 삭제 | 부재 | self02 cleanup |
| media-server-hw-impact.sbv7UB | 영향02 임시 binary/cache | 1838836B | 자식 종료 후 삭제 | 부재 | impact02 cleanup |
| media-server-hw-impact.IXwbV7 | 자체03 임시 binary/cache | 1840420B | 자식 종료 후 삭제 | 부재 | self03 cleanup |
| media-server-hw-impact.zbUg3T | 자체04 임시 binary/cache | 1840420B | 자식 종료 후 삭제 | 부재 | self04 cleanup |
| media-server-hw-impact.HVa1bX | 영향03 임시 binary/cache | 1840420B | 자식 종료 후 삭제 | 부재 | impact03 cleanup |
| lp27-hw-*.log·lp27-record-checks.log | 안전 수치/PTS/hash/자체결과 | 각 파일 Git diff 기준 | 저장소 보존 | 비디오·원문오류·비밀 없음 | 실패 재현/판정에 필요한 원출력 |

원격 읽기 결과: `git ls-remote` exit0,main431397d9b86af69f1690aff6fa6f3e61ea4fbe03,
v4.1.0 f4e58b9cb2efbeec43a7e1132da940fce6afd521,원격v4.1.0 tag 없음.
`gh release view` exit0:tagv4.0.0,draft=false,prerelease=false;
`gh pr list --head v4.1.0 --state open` 및 `gh run list --branch v4.1.0 --limit 5`는 각각빈배열/exit0.
HEAD/upstream은 같지만 미커밋 파일이 남아 있으므로 clean은 아니다. 푸시 가능: 아니오/미수행.
당시 전체 릴리즈 잔여는 [LP27 이전 전수표](release-readiness-20260916.md#2026-09-21-lp27-이전-전수-대조)에 보존했다.

잔여표 반영 후 링크 재검사는288md/9337links/실패0(exit0),공백 검사exit0이었다.
신규 소유파일11개는 범위와 행말공백을 별도 검사해exit0을 확인했다. 제품/native source는 자체04·영향03 이후 바뀌지 않았다.
상세 source SHA는 각 원출력, 신규파일 크기/보존 내용은 실제파일에 있으며 raw media·비밀은 포함하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 최종 잔여표 링크 | verify-docs-links,exit0·288/9337/0 | PASS | 앞선9334링크 검사 후 추가된3링크 포함 |
| 최종 공백 | git diff --check,exit0 | PASS | 잔여표 반영 후 |
| 신규파일 범위/공백 | git ls-files --others 목록11개·허용경로·행말공백 Node검사,exit0 | PASS | git diff 미추적 경계 보완 |
