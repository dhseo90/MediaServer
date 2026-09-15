# 녹화 종료점 계산 계약

독자: 녹화 생성·복구·타임라인 구현자. 수명: v4.1.0 이후 내부 시간 계약의 설계 기준.
작업 정책은 AGENTS.md, 실행 증거는 release-test-records, 진행 범위는 녹화 foundation plan이 기준이다.
이 문서는 사용자 승인 2번의 **계산 방식 확정**이다. 제품 적용·저장 schema 선택은 3번 이후이며 아직 미구현이다.

## 결론과 적용 경계

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
5. 시작점이 기존 원본 샘플 PTS와 정확히 일치해야 한다. 일치하지 않으면 그 source의 strict binding을 거부한다.
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
