# v4.1.0~v4.9.0 녹화·검색 로드맵

## 문서 상태

- 상태: 2026-09-02 사용자 설계 승인. S00~S08의 기존 단계 구현·검증 이력을 유지하며,
  2026-09-12 사용자 승인으로 S09 통합 검증 단계를 설계 보완 필요에 따라 종료·대체한다.
  S10 녹화 시간·식별 기반 보강과 S11 최종 통합 검증은 계획 상태이며 미구현·미실행이다.
  S06 조회·재생 UI, S07 검색용 관측·FrameLocator,
  S08 최종화·손상·시작 복구가 구현됐다. S08은 `11953256`까지 커밋·푸시했다.
  과거 단계별 실패·수정·개별 테스트 결과는 release-test-records에 보존하며 이 로드맵에
  반복하지 않는다. S09 종료는 성공 또는 버전 전체 UI/장시간·릴리즈 완료를 뜻하지 않는다.
  S10 변경 후 기존 증거의 유효 범위를 대조하며, S11 완료 전 버전 완료로 판정하지 않는다.
- 현재 작성 브랜치: `v4.1.0`
- 공통 반영 시점: v4.1.0을 `main`에 머지할 때 장기 로드맵도 함께 반영
- 이후 소유 브랜치: `main`. 후속 버전 브랜치는 장기 로드맵이 반영된 최신 `main`에서 생성
- 현재 소스 버전: `4.1.0`
- 적용 라이선스: Apache License 2.0 유지
- 세부 설계: [2026-09-02-v410-recording-search-foundation-design.md](superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md)
- 상세 구현계획: [2026-09-02-v410-recording-foundation-implementation-plan.md](superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md)

단계 재편의 현재 기준은 이 문서의 S09~S11 절이다. 기존 설계·구현계획의 S09 실행 내용은
이전 계획과 증거로 보존한다. S10 세부 계약·구현계획은 구현 착수 전에 기존 문서에서
정합성을 맞추며, 이번 로드맵 변경만으로 상세 설계 확정이나 구현 승인을 뜻하지 않는다.

이 로드맵은 v4.1.0에서 안정적인 녹화 기반을 만들고, 이전 버전의 계약을 뜯어고치지
않은 채 구조화 검색, 벡터 검색, 증거 검토, 상관관계 분석, 자연어 질의와 녹화 재생을
순서대로 추가하는 것을 목표로 한다.

최종 사용 흐름은 다음과 같다.

```text
자연어 질문
  -> 버전이 고정된 QueryPlan
  -> 구조화/벡터/관계 검색
  -> 근거 영상과 분석 메타데이터 결합
  -> JSON 결과
  -> 해당 카메라와 시간의 녹화영상 재생
```

예상 질의:

```text
3시에 자동차 근처에 서성인 사람 찾아줘
```

최종 결과는 해석된 시간 범위, 객체, 행동, 공간 관계와 함께 `camera_id`, 녹화
시작/종료 시각, 관련 track/event/evidence ID, 선정 이유, 점수, 재생 위치를 반환해야
한다. 제품 UI와 공개 API는 같은 application service와 결과 계약을 사용한다.

## 최상위 원칙

1. v4.1.0은 녹화 기능에 집중한다. 검색 기능은 구현하지 않지만 검색 가능한 데이터
   기반은 함께 만든다.
2. 상시녹화는 기본 비활성화하고 채널별 명시 설정으로 켠다.
3. 상시녹화는 고정 길이 세그먼트를 연속 기록한다. 설정 용량을 초과하면 가장 오래된
   상시녹화부터 삭제하고 녹화를 계속한다.
4. 상시녹화와 이벤트 녹화의 용량·보존 정책을 분리한다. 이벤트 클립은 이벤트 보존
   한도에 도달하기 전까지 상시녹화 정리로부터 보호한다.
5. 이벤트 발생 시 겹치는 상시녹화 세그먼트에서 pre/event/post 파생 클립을 만들고,
   상시녹화에 공백이 있으면 기존 이벤트 프레임 버퍼 녹화를 fallback으로 사용한다.
6. 동일 시간에 상시녹화와 이벤트 녹화가 모두 있으면 UI/API의 기본 표출과 재생은
   `event > continuous` 우선순위를 따른다.
7. 영상 파일, 메타데이터 원장, 검색 인덱스를 분리한다. 검색·임베딩·상관관계 인덱스는
   모두 재생성 가능한 파생 데이터다.
8. 공개된 ID와 필드 의미를 다음 버전에서 바꾸지 않는다. 새 요구는 additive schema와
   새 contract version으로 추가한다.
9. 외부 LLM이 없어도 기본 시간·객체·행동·관계 질의가 로컬에서 동작해야 한다. 로컬
   또는 외부 LLM은 선택형 query interpretation adapter다.
10. 이 저장소의 Apache-2.0을 유지한다. 호환되지 않거나 라이선스가 불명확한 코드는
    포함하지 않는다.
11. 의도된 공개용 영문 문서를 제외한 모든 문서는 한글을 기본으로 작성한다. 기술
    식별자와 표준 고유명사는 원문을 유지할 수 있지만 설명과 판정은 한글로 기록한다.

## 브랜치 운용 모델

이 장기 로드맵은 v4.1.0 개발 변경에 포함하고 v4.1.0을 `main`에 머지할 때 공통
source-of-truth로 반영한다. 그 뒤 `v4.2.0`, `v4.3.0` 같은 브랜치는 장기 로드맵이
반영된 최신 `main`에서 만들어 같은 문서를 상속한다. 현재 버전의 구현자는 앞 버전의
불변 계약과 뒤 버전의 소비 목적을 함께 확인할 수 있어야 한다.

각 개별 버전 브랜치는 다음 규칙을 따른다.

1. 브랜치의 개발·테스트 범위는 해당 버전 절과 단계에 한정한다.
2. 후속 버전 절은 현재 데이터·API 계약을 왜 안정적으로 유지해야 하는지 설명하는
   설계 문맥이며, 후속 기능을 미리 구현할 권한이 아니다.
3. 현재 버전에서 후속 버전의 구현을 당겨 넣지 않는다. 대신 후속 버전이 소비할 stable
   ID, time, lifecycle, application interface만 현재 버전의 승인 범위에서 고정한다.
4. 현재 버전 구현 중 장기 로드맵 변경이 필요해지면 임의 수정하지 않고 사용자와
   재조율한다. v4.1.0에서는 승인된 변경을 v4.1.0 머지에 포함하고, 이후 버전에서는 다음
   브랜치를 만들기 전에 `main` 공통 로드맵에 반영한다.
5. 버전 브랜치를 종료할 때 해당 절의 실제 구현·미구현·검증 상태만 갱신한다. 후속
   버전의 계획 상태를 완료로 바꾸지 않는다.
6. 다음 버전 브랜치는 이전 버전의 로드맵·계약 변경이 머지된 최신 `main`에서 생성해
   공통 로드맵과 이전 릴리즈 계약 fixture를 함께 상속한다.

따라서 각 브랜치는 `현재 버전 집중 범위`와 `후속 버전 소비 문맥`을 동시에 가지되,
실제 개발은 현재 버전 집중 범위만 수행한다.

## 참고 자료와 독립 구현 경계

다음 자료는 설계 개념을 검토하는 참고 자료이며, MediaServer는 별도 저장소, submodule,
runtime dependency 또는 동기화 대상이 되지 않는다.

- [MyLocalLLM `VATester-Vector-Search-cpp`](https://github.com/dhseo90/MyLocalLLM/tree/VATester-Vector-Search-cpp):
  임베딩 계약, 벡터 검색 정렬·커서·평가 방식 참고
- [VARuleLens](https://github.com/dhseo90/VARuleLens): 증거 패키지, frame sequence,
  supports/questions/contradictions/unclear 형태의 검토 개념 참고
- [공유 GPT 대화](https://chatgpt.com/share/6a982ed2-2dd4-83ee-b78b-07f9f4b34861):
  Recording -> Search -> Evidence -> Correlation -> Investigation 단계 참고

원본 두 저장소는 그대로 유지하며 수정하지 않는다. 필요한 설계와 로직은 MediaServer의
구조와 Apache-2.0 경계 안에서 독립적으로 재구현한다. 소스 코드를 직접 복사하지 않는다.

## 표준·오픈소스·지식재산 조사 게이트

저장 계약을 고정하기 전에 아래를 조사하고 결과를 설계 결정 기록으로 남긴다.

- [ONVIF Profile G](https://www.onvif.org/profiles/profile-g/)의 녹화 검색·재생 의미 체계
- [ONVIF Profile M](https://www.onvif.org/profiles/profile-m/)과
  [ONVIF Analytics](https://www.onvif.org/specs/2206/Analytics.html)의 UTC frame,
  object, appearance, behaviour 의미 체계
- [GStreamer `splitmuxsink`](https://gstreamer.freedesktop.org/documentation/multifile/splitmuxsink.html)의
  keyframe 경계 분할과 fragment finalize 동작
- Apache-2.0과 호환되는 공개 구현의 세그먼트·보존·복구 패턴
- 한국, 미국, 유럽 및 PCT 계열의 특허 위험 screening

특허 조사는 아이디어를 얻는 용도가 아니라 위험 접근을 제외하는 필터로만 사용한다.
활성 특허와 실질적으로 겹칠 가능성이 있으면 상세 구현을 설계 입력으로 사용하지 않고
해당 접근 전체를 제외한다. 제품 설계 근거에는 공개 표준, 권리 상태가 안전한 자료,
호환 오픈소스와 독립 설계만 남긴다. 불확실하면 기능을 축소하거나 구현을 보류한다.
이 기록은 법률 의견이나 FTO 검토를 대신하지 않는다.

## 버전 경계

| 버전 | 목표 | 이전 버전에서 소비하는 불변 기반 | 이 버전의 명시적 비범위 |
| --- | --- | --- | --- |
| v4.1.0 | Recording Foundation | 기존 EventRecord, FrameRef, event clip | 구조화 검색 UI, 임베딩, 자연어 질의 |
| v4.2.0 | Structured Search | v4.1 녹화 카탈로그와 분석 요약 | 벡터 유사도, VLM 판단 |
| v4.3.0 | Visual Vector Search | v4.1 FrameLocator, v4.2 결과 계약 | 증거 판단, Entity 확정 |
| v4.4.0 | Evidence Package | 녹화·프레임·트랙·이벤트 ID | VLM 결론, 교차 카메라 동일성 |
| v4.5.0 | VA Review | v4.4 불변 증거 패키지 | 교차 카메라 Entity 확정 |
| v4.6.0 | Correlation | track/event/evidence와 검토 결과 | 자연어 조사 UI |
| v4.7.0 | Natural Language Query API | 구조화·벡터·증거·상관관계 service | 대화형 제품 UI |
| v4.8.0 | Conversational Search & Playback | v4.7 QueryPlan/JSON response | 공개 API 호환성 종료 선언 |
| v4.9.0 | Stabilization & Public API | v4.1~v4.8 고정 계약 | 호환성을 깨는 major 변경 |

v5.0.0은 자동 조사 agent, 분산 검색 또는 호환성을 깨는 데이터 모델 변경처럼 실제
major 변경이 확인될 때만 별도로 설계한다. 현재 목표를 이유로 v4.7~v4.9를 건너뛰지
않는다.

## v4.1.0 — Recording Foundation

목표:

```text
상시녹화를 중단 없이 순환 보관하고 이벤트 구간을 우선 증거로 연결하며, 후속 검색이
원본 녹화 구조를 변경하지 않고 사용할 수 있는 시간·ID·분석 메타데이터 기반을 만든다.
```

| 단계 | ID | 우선순위 | 산출물 |
| --- | --- | --- | --- |
| 0 | V410-S00 | P0 | 표준·오픈소스·IP screening, 라이선스·provenance 기록, 최종 설계 freeze |
| 1 | V410-S01 | P0 | RecordingSegmentV1, FrameLocatorV1, EventRecordingLinkV1, AnalysisObservationV1 계약과 migration/rebuild 규칙 |
| 2 | V410-S02 | P0 | 채널별 opt-in 연속 세그먼트 recorder, keyframe 경계, atomic finalize, 재시작 복구 |
| 3 | V410-S03 | P0 | SQLite 메타데이터 카탈로그와 append-only JSONL 복구 저널, SQLite 미사용 fallback |
| 4 | V410-S04 | P0 | 완료: 상시/이벤트 용량·기간 분리, oldest-first 순환 삭제, pin·hold·tombstone, 채널별 pending 복구, dirfd 결박 unlink/truncate, 실제 쓰기량 정산, 채널 간 in-flight disk reserve·writer admission, 내구 cleanup 마커 재시작 복구 |
| 5 | V410-S05 | P0 | 구현 완료·실제 foreground/nohup/launchd PASS: finalized 원본 연결, 명시적 PTS/UTC 시간축, 비동기 H.264/MP4→MPEG-TS remux, 실측 범위, fallback, quota·hold, UUID v2 partial·재시작 복구. 종료 시 미래 post-event frame 대기만 취소하고 접수 EventRecord를 drain한다. 개별 ID 27개·check 92개, 등록기 35·C++ 140·application 7·runtime 23·mutation 2·계약 45·build 통과. 정식 payload 판독 12/0, foreground 22/0, 실제 nohup/launchd 각 29/0 통과 |
| 6 | V410-S06 | P0 | 구현·단계 검증 완료: event 우선 timeline/status API, 권한별 채널 투영, opaque GET/HEAD·Range 재생, fd/hold·삭제 경쟁·종료 보호, Ops 필터·페이지·원본 전환·player. 최종 focused152/API31/auth37/lifecycle10 및 관련 회귀·범위 한정 직접 UI 통과. 개별 결과와 실패 수정 이력은 release-test-records의 잔여 3~6번을 따름. 버전 전체 UI·30분/120분 완료는 아님 |
| 7 | V410-S07 | P1 | 구현·단계 검증 완료: 기존 V1과 분리된 V2 관측, start/interval/event/end·요약, bounded 비동기 저장, 입력 시점 PTS/epoch와 finalize 위치 연결. 모호한 시간축은 null. 상세 구현·검증은 release-evidence-v410의 S07 절 |
| 8 | V410-S08 | P0 | crash/disk-full/corrupt catalog/gap/migration/호환성 검증과 문서·evidence 연결 |
| 9 | V410-S09 | P0 | 종료·대체됨(성공 완료 아님): 기존 통합 검증의 성과·실패·수정 이력 보존. 설계 보강은 S10, 최종 검증은 S11로 분리 |
| 10 | V410-S10 | P0 | 계획·미구현: 미디어 시간·UTC 매핑·영속 녹화 순서 분리, 공통 시간 해석, 불연속·식별·복구·기존 데이터 호환 계약과 관련 구현·단기 회귀 |
| 11 | V410-S11 | P0 | 계획·미실행: S10 완료·코드 고정 후 기존 증거 유효성 대조와 승인된 최종 안정화·30분·UI·필요한 120분 녹화 검증 및 버전 완료 판정 |

### S09 종료·대체와 기존 작업 보존

S09에서 발견한 시간·식별 기반의 설계 이슈를 통합 테스트의 잔여 수정으로 계속 확장하지 않는다.
기존 종료 충돌 보완, UI 보완, 검증 도구와 개별 PASS/FAIL 기록은 폐기하거나 성공으로 덮어쓰지 않는다.
특히 약 93분에 실패한 녹화 검증은 120분 PASS가 아니며, S11 결과로 과거 실패를 지우지 않는다.
기존 미커밋 변경은 S09 성과 보존·S10 영향 수정·S11 검증 준비로 소속을 대조한 뒤 처리한다.
단계 재편만으로 파일 삭제, 커밋, 되돌리기 또는 기존 제품 수정의 완료 판정을 하지 않는다.

### S10 녹화 시간·식별 기반 보강

목적은 v4.2 이후 검색·증거·상관관계·재생이 같은 녹화 시간·식별 계약을 소비하게 하는 것이다.
다음 순서로 범위를 고정하고 진행한다. 아래는 개발 계획이며 상세 schema·임계값의 확정 기록은 아니다.

1. **계약 확정:** 물리 세그먼트 ID, 미디어 연속 구간, UTC 매핑 구간, 영속 녹화 순서의 역할을
   분리한다. 촬영/수신/추정 시각의 출처·유효 범위·불확실성을 명시한다. 기존 `stream_epoch_id`의
   의미를 조용히 바꾸지 않고, 필요한 확장은 버전이 명시된 계약으로 정의한다.
2. **입력·불연속 설계:** 관측 지점, PTS/DTS 및 재정렬, 소스 재시작, 시각 후퇴·전진·드리프트를
   구분한다. 시계 보정 감지 기준과 키프레임 사이의 매핑 경계 처리를 확정한다.
   시스템 UTC 차이를 미디어 경과 시간으로 대신하거나 PTS 감소만으로 재시작을 단정하지 않는다.
3. **원장·복구:** 시간 매핑과 녹화 순서를 영속화하고 재시작·JSONL rebuild·SQLite projection에서
   동일하게 복원한다. finalize 순서·UTC 정렬·ID 문자열을 녹화 순서로 추정하지 않는다.
   보존의 oldest-first 기준과 기존 데이터의 순서 불확실성 처리도 계약에 포함한다.
4. **기존 소비자 연결:** writer, 시간 snapshot, 분석 FrameLocator, 이벤트 연결, 조회·재생 위치가
   공통 시간 해석을 사용하게 한다. 중복 UTC·공백·삭제·모호한 위치를 정상 단일 결과로 꾸미지 않는다.
   기존 미디어·ID·확정 증거는 보존하고, 표현 불가능한 V1 결과를 의미 변경으로 감추지 않는다.
5. **구현·관련 검증:** 확정한 계약의 기능 항목을 사전 등록하고, 짧은 결정적 재현과 영향 회귀로
   보강한다. 정상 입력, 시간 불연속, PTS 재정렬/재시작, 경계 프레임, 복구, 보존·삭제,
   분석/이벤트의 동일 프레임 연결과 기존 데이터 호환을 확인한다.

완료 조건은 계약·호환 방안 확정, 승인 범위 구현, 개별 검증 증거와 영향 범위 기록이다.
시각 보정만으로 원본 녹화를 버리거나 과거 UTC를 임의 보정하지 않는다. 기존 저장 데이터를 새 촬영
시각으로 승격하지 않으며, 상세 보정 기준·입력 특성·전환 방식이 미정이면 구현 완료로 표시하지 않는다.

비범위: 구조화/벡터 검색, 자연어 질의, 자동 연속 재생 UI, 모든 카메라의 촬영 시각 동기화,
새 외부 의존성·실기기 검증의 자동 추가. 후속 재생을 위한 식별·순서 계약은 포함하되 제품 기능은 당겨 넣지 않는다.

### S11 최종 통합 검증

S10 완료와 코드 고정 후 S09에서 의도했던 버전 최종 검증을 수행한다. 단계 이름만 바꿔 기존
결과를 PASS로 승격하거나 전체를 무조건 다시 실행하지 않는다.

1. S09 보존 증거와 최종 diff·실행 환경·판정 조건을 대조해 유지/부분 무효/전체 무효를 기록한다.
   소실·불충분 증거와 실제 실패는 유효 PASS로 사용하지 않는다.
2. AGENTS.md 7.6.2에 따라 안정화·30분·UI·120분 영역의 최종 대상과 실행 승인 상태를 확정한다.
   30분/UI의 버전 완료 필수 조건을 유지하고, 녹화 전용 120분과 공통 장시간 검증을 서로 대체하지 않는다.
3. 승인된 대상만 실행하며 실패가 생기면 원인·영향을 먼저 특정한다. 수정 후 영향받는 결과를
   재검증하고, 새 설계 범위를 검증 단계에 자동 편입하지 않는다.
4. 실패 증거 보존·임시 산출물 정리·남은 조건을 확인한 뒤 최종 버전 완료 가능 여부를 판정한다.
   커밋·푸시·PR·merge·tag·Release는 별도 명시 승인 대상이다.

기존 S00~S08의 단계별 완료 이력은 유지하되 S10 변경 후의 제품 전체 PASS를 의미하지 않는다.
이번 단계 재편은 S11 실행 승인이나 기존 테스트 전수 재실행 지시가 아니다.

### S10·S11 담당 및 모델 기준

| 단계 | 런타임 패밀리 | 담당 | 추천 모델 | 추론 수준 | 선정 근거 |
| --- | --- | --- | --- | --- | --- |
| S10 | Codex | 메인 설계·안전 계약·최종 판정, 확정 구현은 단일 서브 위임 가능 | gpt-6-astra | medium 기본, 사용자 설정 유지 | 영향2/불확실2/검증2/범위2=8. 시간·저장·복구의 교차 계약을 메인이 판단한다. 추가 추론 사용은 승인과 실제 설정 확인 후이며 이번 문서 변경으로 상향하지 않음 |
| S11 | Codex | 메인 증거 유효성·완료 판정, 확정 검증 수집은 단일 서브 위임 가능 | gpt-6-astra | medium 기본, 사용자 설정 유지 | 영향2/불확실1/검증2/범위1=6. 기존 증거와 최종 코드의 교차 대조가 필요하다. 반복 실패는 메인 회수하며 자동 상향하지 않음 |

S05 후속 환경 보완(2026-09-04)은 **수정·제한 범위 재검증 통과**다. `env_common.sh`·
`gst_plugin_cache.py`의 프로젝트 한정 플러그인 검색/캐시와 wrapper 환경 전달을 추가했다.
최초 Bash 3.2·fixture 실패 뒤 상속 경로·`.so`·root 순서·CLI 초기화 범위도 보완해 환경
20/0을 확인했다. macOS arm64 실제 cold/warm 1525 features 일치·필수 factory 44개·
READY·무음 H264·plugin 우선순위, S05 전체와 증분 build를 재검증했다. S05 등록기 총계는
별도 승인 후 보완했으며 기존 986개/S05 27개 검증을 유지한다. 다른 PC·UI·장시간은
미실행이다. SSIM blacklist는 Homebrew GStreamer에 포함된 GstValidate 전용 모듈을 일반
plugin scanner가 validate 초기화 전에 읽을 때의 의도된 실패로 확정했고, 제품은 해당
모듈을 링크·호출하지 않는다. S06 전 종료 범위
격리를 위해 `MEDIA_SERVER_STATE_DIR`와 고유 `MEDIA_SERVER_LAUNCHD_LABEL`을 추가했다.
명시 상태에서는 exact label·설정/기록 포트의 listener PID만 종료하고 기본 포트·label
fallback을 사용하지 않는다. start도 이미 등록된 exact label을 선제 종료하지 않고
fail-closed한다. 13개 실행 기반 fixture와 기존 환경 20개, 실제 nohup/launchd lifecycle
각 29개가 통과했다. 실제 검증은 격리된 로컬 macOS arm64 한 대의 결과이며 다른 PC나
장시간 운용 PASS가 아니다.
파일·함수·개별 결과·최초 실패는 `docs/release-test-records.md`에 보존한다.

V410-S00 완료: 공개 표준과 라이선스 metadata, 특정 특허 상세를 반입하지 않는 IP
clean-room 차단선, source `4.1.0` baseline을 고정했다. V410-S01 완료: segment/frame/
event link/analysis observation/tombstone v1 계약과 golden JSONL 호환 경계를 고정했다.
V410-S02 완료: 채널별 opt-in Recorder subscriber, H.264/MP4·VP8/WebM keyframe segment,
atomic finalize와 source policy round-trip을 구현했다. V410-S03 완료: fsync JSONL 원장,
SQLite primary/rebuild와 fallback projection, source policy supervisor를 제품 composition root에
연결했다. V410-S04 완료: 등급별 quota·기간, oldest-first 선택, journal 선행 삭제 상태기,
pin·hold 보호, 채널별 pending 재시도, dirfd 결박 unlink, 예상 segment 크기·partial 실제
쓰기량·다중 채널 in-flight 예약을 반영한 disk reserve, event quota와 continuous admission
독립 판정, SQLite projection 장애의 JSONL fallback, 채널별 `storage-blocked`/새 epoch 재개를
제품 composition에 연결했다. writer cleanup 마커를 내구 기록하고 재시작 catalog에서 추적
media 보존·미추적 orphan 정리 또는 fail-closed하도록 연결했다. V410-S05 local 완료: EventStorage와
녹화 catalog 사이에 narrow bridge를 두고 명시적 `utc-ms`/`media-pts-ms` 시간축만 연결한다.
겹치는 finalized continuous segment를 원자적으로 hold한 뒤 별도 worker에서 검증된
video-only H.264/MP4를 video 재인코딩 없이 MPEG-TS로 overlap remux하고, 실제 출력 packet
timestamp로 요청 범위와 keyframe 확대 범위를 함께 기록한다. VP8/WebM event 파생은 재생
불가능한 결과를 허용하지 않고 fail-closed해 기존
bounded frame-buffer fallback으로 보낸다. 공백·epoch/codec 불일치·시간축 불명확은 complete로
승격하지 않으며 기존 bounded
frame-buffer 결과를 같은 link의 fallback evidence로 남긴다. 이벤트 파생물은 Event 등급
quota로만 admission/oldest-first 정리하고 동일 event ID와 재시작은 SHA-256 결정
link/segment ID로 중복 생성을 막는다. anchor 없는 media PTS는 UTC로 추측하지 않고 segment
mapping으로만 복구하며 같은 process에서 segment finalize 뒤 재시도한다. EventRecord bounded
queue보다 link 내구 기록을 먼저 수행하고 queue/worker 포화 pending도 durable catalog에서
다시 흡수한다. 실제 remux 중에는 다른 event의 link admission lock을 풀며, marker 제거 뒤
terminal resource-release pending을 기록하고 source/output hold와 reservation 해제가
끝난 뒤에만 complete로 승격한다. UUID v2 marker가 지목한 단일-link partial만 재시작
정리하고 v1/foreign final·partial, tombstone ID 재사용을 보수적으로 거부한다.
아래는 S05 단계의 검증 이력이며, 현재 단계 상태는 문서 상단을 따른다.
S05의 `event_storage_recording_runtime_smoke.cpp`와 전용 runner는
고정 설정·시각·가용량과 latch를 제외한 실제 EventStorage·catalog·journal·bridge·deriver를 실행한다.
JSONL 활성/비활성 모두 queue=2/enqueued=5/dropped=2와 연결 5개 보존, 별도 프로세스에서
새 SQLite 재구축·후행 H264 source 연결·파생 5개·재접수 ID 불변을 확인했다.
기존 runtime check 20개와 source mutation 2개에 종료 취소 check 3개를 더해 S05 gate에
필수 연결했으며,
이는 HTTP/전체 서버 재시작, 장시간/UI/field smoke를 대체하지 않는다.
terminal complete 기록 전까지 catalog가 참조 source/output의 삭제를 차단하며, 복구 중
후속 event/fallback 갱신은 단계를 보존하고 UTC 확장은 내구 대기 후 순서대로 파생한다.
anchor 없는 후속 PTS 확장도 같은 epoch의 segment map으로 변환하거나 별도 내구 대기하며,
복구할 finalized 파생물이 없으면 확장 요청을 먼저 소비해 Partial/Failed로 수렴한다.

v4.1.0에서 검색-ready 메타데이터를 저장하지만 검색 DSL, 검색 결과 랭킹, 벡터 인덱스,
자연어 해석은 구현하지 않는다. 객체의 모든 분석 frame을 무제한 저장하지 않고,
event/track 시작·종료·요약은 보존하며 중간 관측은 대표 frame 또는 설정 주기로 저장한다.

## v4.2.0 — Structured Search

1. v4.1.0 카탈로그를 소비하는 별도 read model을 만든다.
2. 카메라, 시간, 객체, track, event, zone, rule, behaviour filter를 제공한다.
3. 안정 정렬과 query checksum에 묶인 cursor pagination을 고정한다.
4. 검색 결과에서 원본 녹화의 정확한 시간으로 이동한다.
5. 같은 시간의 이벤트 녹화를 상시녹화보다 우선 반환한다.
6. v4.1.0 fixture를 수정하지 않고 migration·query compatibility를 검증한다.

## v4.3.0 — Visual Vector Search

1. image/text/cross-modal embedding contract와 contract ID를 versioning한다.
2. 이벤트 snapshot과 대표 frame부터 색인한다.
3. exact top-k를 기준 구현으로 먼저 두고 안정 정렬과 threshold를 고정한다.
4. 텍스트에서 영상 대표 frame을 찾는 cross-modal 검색을 추가한다.
5. 상시녹화의 설정 주기 대표 frame 색인을 후반 단계로 확장한다.
6. Hit@K, MRR, 지연시간, memory/disk 사용량 fixture를 유지한다.

임베딩은 파생 데이터이며 embedding contract가 바뀌면 새 공간으로 재색인한다. 오래된
벡터를 의미가 다른 새 contract로 자동 승격하지 않는다.

## v4.4.0 — Evidence Package

1. 검색 결과를 녹화, clip, 대표 frame, track, event, observation과 묶는 EvidencePackageV1을 고정한다.
2. `FrameLocatorV1`로 같은 frame을 결정적으로 다시 추출한다.
3. package manifest에 시간 범위, provenance, checksum, 누락·삭제 상태를 포함한다.
4. 원본 녹화가 순환 삭제돼도 보존 등급이 높은 파생 evidence의 독립성을 검증한다.

## v4.5.0 — VA Review

1. VARuleLens의 개념을 참고하되 MediaServer 내부에서 독립 구현한다.
2. 단일 이미지뿐 아니라 시간 순서가 있는 frame sequence를 입력으로 사용한다.
3. supports, questions, contradictions, unclear와 confidence를 구조화해 저장한다.
4. 외부 LLM/VLM 실패가 녹화, event, search 결과를 막지 않게 한다.
5. local-first와 provider opt-in 정책을 유지한다.

## v4.6.0 — Correlation

1. track과 event 위에 별도의 versioned EntityLink를 추가한다.
2. 같은 카메라의 시간 연속 관계부터 시작하고 교차 카메라 후보로 확장한다.
3. 자동 동일성 확정과 후보 관계를 구분하고 근거·불확실성을 보존한다.
4. 기존 track/event ID를 변경하거나 재사용하지 않는다.

## v4.7.0 — Natural Language Query API

1. 자연어를 `QueryPlanV1`으로 변환한다.
2. 시간대, 카메라 범위, 객체, 행동, 공간 관계, 결과 제한을 명시적으로 표현한다.
3. 구조화·벡터·증거·상관관계 검색을 하나의 application service에서 조합한다.
4. UI와 외부 client가 함께 사용하는 JSON response를 고정한다.
5. 결과마다 camera/time/track/event/evidence/recording/playback locator와 선정 이유를 반환한다.
6. 모호한 시간이나 조건은 임의 확정하지 않고 interpretation과 uncertainty를 반환한다.

## v4.8.0 — Conversational Search & Playback

1. GPT 형태의 자연어 입력 UI를 제공한다.
2. 결과 card에 카메라, 시간, 대표 image, 근거와 confidence를 표시한다.
3. 선택한 결과를 정확한 녹화 위치에서 재생한다.
4. 이벤트 clip이 있으면 이를 우선하고 없으면 원본 segment range를 재생한다.
5. 후속 질문은 기존 `QueryPlanV1`을 명시적으로 좁히는 방식으로 처리한다.
6. UI 전용 검색 로직을 만들지 않고 v4.7.0 application service만 소비한다.

## v4.9.0 — Stabilization & Public API

1. 자연어 표현과 camera/time/object/relation별 품질 fixture를 고정한다.
2. 다중 camera와 장시간 녹화에서 latency와 resource budget을 검증한다.
3. role/scope/camera 접근 권한, redaction, query·playback audit를 완성한다.
4. long-running query의 async state, cancel, timeout, pagination을 안정화한다.
5. v4.1.0부터의 schema migration과 이전 fixture compatibility를 검증한다.
6. 공개 API 문서와 semantic versioning 경계를 확정한다.

## 버전 간 재작업 방지 규칙

- ID는 path, SQLite rowid, 화면 순서에 종속시키지 않는다.
- ID는 삭제 뒤 재사용하지 않는다.
- UTC wall clock과 media PTS/time base를 모두 보존한다.
- segment는 finalize 후 불변으로 취급하고 교체가 필요하면 새 ID를 만든다.
- field의 기존 의미를 바꾸지 않고 optional field 또는 새 contract version을 추가한다.
- catalog migration은 forward migration과 JSONL rebuild를 함께 검증한다.
- 각 릴리즈의 golden fixture는 다음 릴리즈에서 수정하지 않는다.
- 검색, embedding, review, correlation은 source-of-truth가 아니라 재구축 가능한 projection이다.
- 다음 버전은 이전 버전의 application contract를 사용하고 내부 파일을 직접 해석하지 않는다.
- 호환성을 깨야 하면 minor 버전에서 숨기지 않고 별도 major 설계 승인을 받는다.

## 기존 v4.1.0 후보 재분류

기존 backlog의 Incident OS 제품 승격, Evidence default-on, 로컬 Action Execution,
credential store, tracker 기본 선택, 로컬 VLM 운영 경로는 이번 v4.1.0 범위가 아니다.
해당 항목은 삭제하지 않고 보류 후보로 유지하되, 사용자가 별도 버전과 순서를 승인하기
전에는 이 로드맵 단계에 자동 편입하지 않는다.

## 완료 판정 경계

이 문서의 단계는 계획일 뿐이다. 각 단계는 해당 구현, 관련 개별 테스트, 문서/evidence,
`git diff --check`, 영향·회귀 보고가 모두 갖춰져야 완료다. 안정화 테스트, 30분, UI
풀테스트, 120분, commit, push, PR, merge, tag, GitHub Release는 AGENTS.md와 사용자의
명시 승인 범위에서만 실행한다.
