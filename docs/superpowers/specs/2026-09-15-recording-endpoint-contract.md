# 녹화 종료점 계산 계약

독자: 녹화 생성·복구·타임라인 구현자. 수명: v4.1.0 이후 내부 시간 계약의 설계 기준.
작업 정책은 AGENTS.md, 실행 증거는 release-test-records, 진행 범위는 녹화 foundation plan이 기준이다.
이 문서는 사용자 승인 2번의 **계산 방식 확정**이다. 제품 적용·저장 schema 선택은 3번 이후이며 아직 미구현이다.

## 결론과 적용 경계

### 2026-09-16 재검토 정정 및 3-A~4 재개

사용자는 3-A 계약 보완, 3-B 수집·저장·복구, 4번 대기 정책을 순서대로 개발하고
단계별 커밋 후 최종 푸시하도록 승인했다. 공개 API·요청 충족 기준·지원 입력 범위는 유지한다.

아래 2026-09-15의 두 후보는 역변환 fitting의 비유일성만 보인다. 실제 writer→parser→mux의
forward 변환으로 그 후보들이 생성되는지는 검사하지 않았다. 따라서 원천 유리수 위상을 요구하거나
사용자에게 완전 녹화의 의미 변경을 먼저 선택하게 한 결론은 철회한다. 과거 검사 결과는 삭제하지 않는다.

파일 무결성, 원본 AU 대응, 요청 구간 충족, UTC 대응 품질은 구분한다. 기존 `verified_output`과
`request_fully_satisfied`도 같은 값이 아니다. 파일이 정상이라고 요청 충족을 승격하지 않으며,
UTC 품질이 불명확하다고 파일에 실제 누락이 있다고 단정하지 않는다. 기존 partial 자동 승격은 금지한다.

3-A는 기본 mux 설정을 바꾸지 않은 실제 writer에서 입력 수락·parser/mux 경계·실제 파일을
관측하여 원본 AU와 native 시간의 대응 근거를 확정한다. 단순 순번·count·가까운 PTS나
역산한 phase로 대응을 만들지 않는다. 내용 식별, 변환 전후 시각, 파일 표를 함께 대조한다.
같은 내용의 반복 AU는 hash만으로 고유 원본이라고 판정하지 않는다. 실제 변환 근거와 독립된
오류·경계 oracle가 확인되기 전 저장 형식을 확정하거나 3-B를 완료로 처리하지 않는다.

이번 승인 순서는 3-A → 3-B → 4다. 생성/Ready/타임라인 공통 소비 및 실제 2출력 통합은
후속 5번이며 이번 완료로 포함하지 않는다. 장시간·브라우저·release action은 이번 실행 범위 밖이다.

### 3-A 채택 계약: 원본 identity와 실제 파일 표시 구간

FW01~04는 실제 기본 writer 372 AU/5파일에서 수락 원본 → 고유 canonical VCL → mux AVC bytes →
native sample의 전수 대응과 정방향 round를 확인했다. 이는 일반 입력 전체나 제품 완료의 증거는 아니다.
이 근거에 따라 §1.5의 수치 일치만 사용하는 연관 조건을 아래 강한 결박으로 대체한다.
`request_fully_satisfied`는 여전히 같은 요청 좌표의 전체 포함 조건이며 허용 오차를 추가하지 않는다.

- `original_pts_ns`는 수락된 원본 샘플 identity의 정수 PTS다. 파일 표시 시각으로 덮어쓰지 않는다.
- 실제 writer가 입력 PTS/DTS에서 뺀 정수 원점 `O`를 보존한다. fitted phase나 앞 파일 끝에서 구하지 않는다.
- 파일 표시 구간은 `[O + P*1e9/T, O + (P+D)*1e9/T)`의 정확 유리수다. `F(t)=O+t`는
  실제 원점 이동이며 잃은 원본 정밀도의 역복원 함수가 아니다. 원본 PTS와 파일 시작의 잔차는 별도 사실이다.
- 이 연결에는 source/store/channel/epoch/generation/track/ordinal, 수락 원본, parser/mux 경계,
  실제 파일 hash·sample 내용·native 표의 결박이 모두 필요하다. 중복·불일치·미지원 변환이면 새 증거를 부여하지 않는다.
- 요청 합집합/포함은 유리수에서 판단한다. 파일 내부 native 양수 gap과 파일 간 이동된 유리수 gap을
  정수 ns로 절삭해 없애지 않는다. selection·decode/payload·파일 가용성·UTC anchor 조건은 별도로 유지한다.
- TP03 첫 원본 PTS66666666과 파일 시작66666666⅔은 서로 다른 값이다. 요청이66666666에서
  시작하면⅔ns 미충족이며 complete가 아니다. TP01 파일 경계는 실제 O를 사용하면⅓ns overlap이다.
- 기존 파일에는 증거를 추정하여 추가하거나 partial을 소급 승격하지 않는다. 새 증거를 수집하지 못해도
  기존 녹화 지원 자체를 축소하지 않는다. 이번 단계는 증거 저장까지이며 실제 소비 전환은 후속5번이다.

공식 GStreamer1.28.1 `gst_qt_mux_add_buffer`의 별도 PTS/DTS round와 decode 끝점 차분을
실제 native 표와 대조했다. 근거: [공식 소스](https://github.com/GStreamer/gstreamer/blob/1.28.1/subprojects/gst-plugins-good/gst/isomp4/gstqtmux.c),
[실측](../../release-artifacts/v4.1.0/s11-preparation-mapping/forward-probe-data/forward-probe-output.txt).
소스는 읽기 참고만 했고 코드 반입은 없다. `originalPTS + chosenDTSduration`은 TP03에서 같은
native 경계에 상충하는 값을 만들므로 폐기한다. 관측된 기본 경로 밖의 edit/rate/DTS 보정은
입증 없이 이 profile로 승인하지 않는다. AVC/AnnexB 표현 차이는 canonical VCL과 실제 파일 bytes로 확인한다.

### 3-B 내부 저장 구현 경계

새 증거는 source binding에 명시적 버전의 선택적 `file_evidence`로 결박한다. 없는 기존 binding의
직렬화 바이트는 그대로 유지한다. 공개 route/payload·기존 segment/원본 identity는 변경하지 않는다.
증거가 있다고 자동으로 새 complete 판정을 사용하지 않는다. 후속5번이 명시적으로 소비해야 한다.

최소 내용은 실제 정수 writer origin, 파일 hash/크기, native track/movie 단위와 edit 근거,
각 수락 ordinal·원본 PTS/DTS·원본 duration, mux PTS/DTS/duration, canonical VCL hash,
파일 sample raw hash·native PTS/DTS/duration이다. 중복된 identity 문자열은 부모 binding을 사용한다.
수치 배열을 사용하더라도 필드 순서·정수 범위·길이는 버전 계약으로 고정하며 부정확한 JS number를 쓰지 않는다.

수집과 파일 검사·내용 hash는 catalog 잠금 밖에서 수행한다. callback은 writer mutex를 재획득하지
않는 별도 bounded collector이며 GStreamer로 예외를 던지지 않는다. appsrc 수락이 확인된 원본만
사용하고 EOS/파일 확정 전 관측을 파일 수록 증거로 게시하지 않는다. source index와 동일4096 상한이다.
현재 실제 writer가 만든 H264/MP4 기본 profile에서만 새 증거를 발급한다. VP8/WebM 등 기존 녹화는
그대로 계속하며 입증하지 않은 profile에 허위 증거를 붙이지 않는다. 새 parser 때문에 녹화를 실패시키지 않는다.

파일 검사는 단일 video track·비분할 MP4의 실제 byte range·STTS/CTTS·edit를 경계 검사한다.
복잡한/모순된 edit, fragment, cap 초과, 내용·변환 대응 실패에는 증거 없음/사유를 유지한다.
파일 parser의 제한을 녹화 입력의 새 제한으로 만들지 않는다. 운영 파일 재작성·외부 의존성 설치는 없다.
기존 derived profile의 입력32MiB 상한 안에서 검사하며 파일 전체를 catalog 잠금 아래 다시 읽지 않는다.

source binding 전체 직렬화는2MiB 이하, ready envelope는기존 크기 경계와 대조하여 필요한 최소
상한을 명시한다. 무제한 추가는 금지한다. finalized mutation과 동일 Ready ticket에 원자 결박하며
SQLite/JSONL/checkpoint 복구에서 같은 strict parser를 사용한다. field 누락/추가·범위·중복·identity·hash·
forward 표 불일치는 거부한다. 검증된 기존 object를 매 잠금 전이마다 전량 재파싱하지 않는다.
파일을 실제 다시 검증해야 하는 finalize recovery와 순수 저장 구조 검증을 구분한다.

#### 기존 파생 job의 비소비 경계

기존 파생 job은 최대8개 원본 binding을 복제하며 JSON4MiB 상한을 갖는다. 선택적 증거를
추가했다는 이유로 기존 profile의 저장량·ID·지원 원본 수가 달라지지 않게 신규 기존-profile job에는
기존13필드를 모두 보존한 명시적 binding projection을 사용한다. 원본 catalog/Ready/bound mutation의
`file_evidence`는 삭제하지 않는다. 생성·복구·타임라인이 새 증거를 소비하는 후속5번의 완료는 아니다.

catalog의 live-source 대조도 job에 선택적 증거가 없는 경우에만 같은 projection을 비교한다.
source/store/epoch/generation/track/ordinal/PTS/index와 segment 전체(파일 hash 포함)의 동일성은
기존대로 검사한다. 이미 증거가 포함된 job은 projection하거나 ID를 재계산하지 않고 전량 strict 대조한다.
기존 job은 새 증거의 변경을 identity에 포함하지 않는다는 한계를 명시하며, 그 job을 새 증거 기반
완전 판정으로 승격하지 않는다. 후속5번은 새 증거의 불변 참조·소비와 job identity 경계를 별도로 확정해야 한다.
이번에는 job/journal 상한을 늘리거나 이미 저장된 job을 재작성하지 않는다.

### 2026-09-15 3-A 선수 확인: 시간 변환의 식별 가능성

이 절의 선택 요청·착수 중단 결론은 당시 이력이다. 현행 재개 판단은 위 2026-09-16 정정을 따른다.

3-A/3-B 개발 승인 후 기존 숫자 증거로 MAP-A01~03 특성화를 실행했다. 세 검사는 통과했지만
이는 제품 수정이나 3-A 설계 완료가 아니다. 아래의 **미확정 계약 결정** 때문에 3-B는 착수하지 않는다.
이전 종료점 산술 모델·기존 partial 거부 규칙은 변경하지 않는다.

TP01의 첫 파일 끝은 `25000/3000초 = 25000000000/3ns`다. 두 번째 파일의50개 local PTS에 대해
다음 두 변환은 **모두 실제 원본 정수 ns와 일치**한다.

- 후보A: `floor(local_tick * 1e9 / 3000 + 25000000000/3)`
- 후보B: `floor(local_tick * 1e9 / 3000 + 25000000000/3 + 1/6)`

후보A에서는 앞 파일 끝과 뒤 파일 시작 사이 gap이0, 후보B에서는1/6ns다. 두 시작점의 정수 ns는
동일하게8333333333이다. 따라서 원본 정수PTS와native표에 잘 맞는 변환식을 찾았다는 사실만으로
sub-ns 간격까지 없는 정확한 원본축 연속성을 증명할 수 없다. **실제1/6ns 누락이 발생했다는 뜻은 아니다.**
writer에 전달된 origin은 정수 ns이고, 이 후보의 유리수 위상을 원천에서 수집한 증거는 현재 없다.
TP03 PTS용 fitted 위상−2/3ns 역시 DTS0에 적용하면−1ns로 바뀌므로 공통 PTS/DTS 변환으로 쓰지 않는다.

설계 선택 경계:

1. 기존 엄격 기준 유지: 원천 유리수 시간·변환 근거를 확보한 입력만 정확한 원본축 판정.
   근거가 없는 입력은 녹화를 계속하되 해당 원본축 판정은 unknown/partial로 유지한다.
   모든 현행 입력에서 근거 확보가 가능하거나 실제2개 complete가 달성된다고 보장할 수 없다.
2. 파일 native 표시축을 녹화 구간의 판정 기준으로 삼고 원본 식별 및 원본/UTC 시간 정밀도를 별도 취급.
   후속 검색·재생에 자연스러운 후보이나 기존 `request_fully_satisfied` 의미 및 공개 소비 영향 대조가 필요하다.
   이는 기존 원본축 합격 기준의 단순 구현이 아니라 의미 변경이므로 사용자 결정 전 적용하지 않는다.

메인 권장은2의 의미·영향을 먼저 명확히 협의하는 것이다. 파일에서 입증되지 않은 누락을 숨기거나
unknown을 기존complete로 바꾸자는 뜻은 아니다. 이 결정 전에는 새 schema에 추정 phase/offset을 저장하지 않는다.
단순히 기존 mux 단위를 유지하면 해결된다는 이전 제안은 이 조건을 생략한 불완전한 제안이었다.

직접 증거: `scripts/internal/recording_mapping_ambiguity.test.mjs` 및 중앙 release-test-records의 MAP-A 기록.
수학 반례는 원본과 파일의 내용 동일성을 검증하지 않는다. AU 대응 검증 역시 별도로 필요하다.

### 기존 2번 승인 계산 규칙

선택: **파일의 native presentation 시작·종료점과 입증된 원본축 변환을 사용하고,
두 끝점을 각각 한 번 변환한다.** parser가 재작성한 duration이나 DTS 기준 duration을
presentation PTS에 더하지 않는다. 시작점 연관을 입증하지 못하면 끝점 계산만 성공해도 연결을 거부한다.

native 구간은 파일의 표시 시간 증거이지 카메라가 그 시간 내 모든 장면을 포착했다는 증명이 아니다.
기존 분석 구간의 Confirmed/Unknown/Ambiguous, 파일 가용성, payload·decode 검증을 대체하지 않는다.
전체 요청의 완전 판정은 기존 선택 증거와 실제 출력 구간이 모두 충족돼야 한다.

근거는 [실제 시간 경계 계측](../../release-artifacts/v4.1.0/s11-preparation-mapping/timing-probe-report.md)이다.

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| parser duration 유지·일괄 +1ns | 제외 | VFR에서는 ms 단위 길이도 바뀌고 실제 누락을 숨김 |
| demux PTS+demux duration | 일반 해법에서 제외 | B-frame18/30에서 native presentation 끝과 불일치, DTS 기준 duration을 섞음 |
| 다음 PTS/고정FPS/입력 duration으로 종료 추정 | 제외 | 재정렬·마지막 샘플·파일에 반영되지 않은 입력70ms 반례 |
| native presentation interval+입증된 원본축 변환 | 채택 | 한 원천의 끝점으로 계산하며 불충분한 증거는 거부 가능 |

## 1. 계산 규칙

지원된 파일 시간 표현에서 sample의 presentation tick을 `P`, sample의 native 길이를 `D`,
timescale을 `T`라고 한다. PTS와 DTS, movie timescale과 media timescale, GstSegment stream time은 서로 다른 값이다.
계측된 MP4는 STTS delta와 CTTS를 보존한다. 이를 모든 MP4/edit/재정렬 조합의 표시 길이 증명으로 일반화하지 않는다.
VFR+B-frame 복합 입력·복잡한 edit/clipping에서 interval을 입증하지 못하면 미지원/unknown으로 남긴다.

1. native presentation 구간은 `[P, P+D)`이며 `D>0`, `T>0`이어야 한다.
2. 원본축 변환 `F`는 source/store/channel/epoch/track/sample·파일에 결박돼야 한다.
   변환을 모르면 추정하지 않는다. edit list의 media_time을 무조건 PTS에서 빼거나 stream time을 대용하지 않는다.
3. 정확 구간은 `[F(P/T), F((P+D)/T))`이다. native 덧셈과 변환을 먼저 수행한다.
4. 입증된 정수 ns 이동 `O`만 필요한 단순 구간은
   `start = O + floor(P*1e9/T)`, `end = O + floor((P+D)*1e9/T)`다.
   `start + floor(D*1e9/T)`가 아니다. 실제 한 프레임 길이를 보고 +1ns 여부를 정하지 않는다.
5. 기존 timestamp-only 증거는 원본 PTS와 정확히 일치해야 하며 이 경로의 검사 완화는 금지한다.
   새 3-A 증거는 원본 identity와 파일 시각을 분리하고 내용·수락·forward 변환을 모두 입증한다.
   source sample count나 decode-order만 같다는 이유로 새 연관을 만들지 않는다.
6. 구간은 반열림이다. native 축에서 실제 간격·중첩을 먼저 구분하고, 재정렬은 presentation 순으로 다룬다.
   ns로 줄였을 때 사라지는 양수 간격도 complete로 합치지 않는다. 표현 불가하면 unknown/partial이며 표시용 ns와 판정 증거를 분리한다.
7. 마지막 sample도 자체 native 길이를 사용한다. 길이 부재/0/모순이면 unknown 또는 거부한다.
   입력 duration·이전 sample·평균FPS로 보충하지 않는다.
8. 계산에는 검사된 정수/유리수를 사용한다. 검증 모델은 BigInt, 후속 C++에서는 동일 범위를 확인한 정수 산술이 필요하다.
   이번 모델은 비음수 signed64 tick/ns와 uint32 timescale을 제한한다. 음수/0길이/0단위/overflow/미지원 변환을 거부한다.

## 2. 이번에 확정된 반례와 거부 조건

| 항목 | 확정 결과 | 제품 적용 조건 |
| --- | --- | --- |
| TP01/236 | 23600+100 ticks, T3000 →7900000000ns. parser 합산7899999999ns는 잘못된 파일 구간 근거 | native 끝 증거 보존·공통 계산 |
| TP02 | 30000/1001에서도 parser duration 절삭 | 고정30fps 특례 금지 |
| TP03 | DTS 기준 duration의 round-up을 PTS에 더하면 1ns 부족/초과 모두 발생 | CTTS를 포함한 presentation 축, 시작 결박 검증 |
| TP01 tail | 원본 시작16/50 불일치 | 종료점 수정과 별개 blocker. tolerance로 통과시키지 않음 |
| TP03 원본 | 시작20/30 불일치 | 재정렬 산술 지원과 원본 연결 가능 여부를 구분 |
| TP04 last | 입력70ms지만 파일은33.333333ms, end403333333ns | 440000000ns까지 존재한다고 주장 금지 |

tail 불일치는 정수로 변환된 origin과 local PTS를 따로 더한 값만으로 원본축을 항상 복원할 수 없음을 보여준다.
정확한 위상/변환 또는 샘플 연관 증거를 새로 확보할 수 있는지는 **3번 저장·연결 설계의 선행 조건**이다.
현재 ns 값만 보고 사라진 정밀도를 발명하거나 FPS로 역산하지 않는다. 입증 불가한 데이터는 거부/부분 상태가 정답이다.

## 3. 신뢰성과 후속 구현 인터페이스

계산 입력은 (파일 식별/hash, source/epoch/track/ordinal 결박, native 시작·길이·단위,
원본축 변환 증거)이고 출력은 (확정 구간 또는 unknown/거부 사유)다.
검증 모델의 `mapping=identity-file-axis` 문자열은 단순 산술 전제 표시이며 인증/증거 검증을 구현한 것이 아니다.
파일 parser·hash 인증·원본 sample 대응·edit 지원·실제 출력 검증은 모델 밖이다.

생성, Ready 검증/복구, 타임라인은 같은 종료점/간격 판정 계약을 소비해야 한다.
읽기 화면에서만 끝점을 늘리거나 생성에서만 미충족을 없애지 않는다.
현재 `DerivedRemuxAu.file_duration_ns`와 `actual_range_basis` 및 기존 Ready parser만으로 새 증거를 표현할 수 있는지,
정규화된 값·native 근거·버전 식별을 어떤 최소 구조로 저장할지는 3번에서 확정한다.
이 문서로 기존 필드 의미를 소급 변경하지 않는다. 과거 partial을 자동 complete로 승격하거나 데이터를 삭제하지 않는다.
이번 검증용 MP4 파서를 제품 parser로 재사용하는 결정도 하지 않았다.

## 4. 검증과 완료 범위

`scripts/internal/recording_endpoint_contract.test.mjs`는 TP01/236의 독립 절삭 반례를 먼저 RED로 확인한 뒤
native 끝 단일 변환 모델로 EP01~08을 검증한다. literal 기대값은 계측/손계산을 사용하며 모델 함수로 기대값을 만들지 않는다.
분수fps, 실제1ns·sub-ns 양수 간격, VFR, 재정렬, 마지막 길이 부재, 무효값, 시작 결박 불일치를 포함한다.
이 테스트는 제품 해결이나 일반 MP4·재생·복구·UTC·UI PASS가 아니다.

검증 모델의 `nativeGap`은 같은 입증된 공통축의 두 구간에 한정한 비교 예시다. 전체 요청 병합/완전성 알고리즘은 제품에 구현되지 않았다.
기존 R03 partial 검사는 변경하지 않는다. 후속 적용 때 새 증거로 complete를 입증하는 별도 양성과
실제 duration 부재·원본 불일치·미지원 변환을 계속 거부하는 음성을 함께 유지해야 한다.

## 5. 남은 3~5번

| 순서 | 우선순위 | 작업 | 완료 기준 |
| --- | --- | --- | --- |
| 3 | P0 | 최소 증거 저장·원본 연결 | tail/B-frame 시작 불일치에 필요한 실제 연관 증거 확보 방법 결정, native 끝·변환·원본 식별의 최소 저장 및 손상 거부·기존 데이터 정책. 임의 tolerance 금지 |
| 4 | P0 | 대기 정책 | 미확정 원본/증거 부족/실제 누락 구분, 긴GOP·복수 요청 공정성·보존·취소·상한과 부분 결과 검증 |
| 5 | P0 | 공통 적용·실제 통합 | 생성/Ready/복구/타임라인 동일 판정·위조/손상/누락 음성, 실제 완전 출력2개 HTTP/hash, 재기동 보존·새 녹화, 기존5stage 검증 |

3~5번은 이번 미착수다. 이후 S11 최종 안정화/30분/UI 및 필요성 판정된120분과 release action은 별도 권한/완료 기준을 따른다.
