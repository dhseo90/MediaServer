# v4.2.0 구조화 녹화 검색 개발 계약

## 목적과 승인 범위

2026-10-03 사용자가 승인한 개발은 [로드맵](../../v410-v49-recording-search-roadmap.md)의
구조화 검색과 결과의 정확한 재생 연결이다. 1~10을 순서대로 구현하고 단계별 단기 검증,
분할 커밋, 마지막 브랜치 push까지 수행한다. 30분·120분·릴리즈 UI 풀테스트·predev·PR·병합·
태그·Release는 이번 목표에 포함하지 않는다. 개발 중 변경 기능의 단기 API/브라우저 검증은
릴리즈 검증과 구분한다. 구현 완료와 릴리즈 가능 판정은 별개다.

기준 source는 `5990bbcc`의 v4.1.1이며 새 검색은 기존 녹화·저장·권한 계약을 유지한다.
이 문서는 현재 설계와 작업 순서 한 곳을 소유하고, 기능 ID와 독립 기대값은
[테스트 목록](../../project-feature-test-inventory.md#v420-구조화-검색)에 둔다.
진행·실행 결과는 [개발 기록](../../release-artifacts/v4.2.0/development.md)에만 둔다.

## 1. 결과와 질의 계약

- 공개 진입점은 Ops의 `GET /ops/api/recordings/search`다. 기존 timeline/media endpoint와
  Event Search DSL의 payload·offset 의미를 변경하지 않는다.
- `channelIds`는 명시한 채널 집합이다. 1~32개, 중복은 정규화한다. 전체 권한 채널을
  암묵적으로 확장하지 않는다. 모든 채널이 허용돼야 하며 일부만 허용되면 전체 요청을 거부한다.
- `startTimeMs`/`endTimeMs`는 UTC 밀리초의 반개구간 `[start,end)`다. 정수 문자열로 파싱하고
  음수·역전·overflow를 거부한다. 최대 조회 폭은 31일이다. UI만 로컬 시각을 UTC로 변환한다.
- 필터는 `object`, `track`, `event`, `zone`, `rule`, `behaviour`다. 필드 사이는 AND,
  같은 필드의 값 목록은 OR이며 각 목록은 최대 32개다. 자유식·정규식·임의 SQL은 받지 않는다.
- 객체는 저장된 class label과 정확히 비교한다. track은 분석 namespace/stream epoch/채널과
  함께 내부 식별하고, 같은 숫자 track ID를 다른 세션의 동일 개체로 합치지 않는다.
- 메타데이터 필터가 없는 카메라·시간 질의는 녹화 구간을 반환한다. 메타데이터 필터가 있으면
  저장된 개별 관측을 반환한다. 관측 사이의 빈 시간에 객체가 있었다고 보간하지 않는다.
  결과에 `kind`와 원본 observation/recording 참조를 두고 건수의 단위를 명시한다.
- 객체·track·zone·rule·event 조건은 동일 관측에서 충족돼야 한다. 다른 관측의 조건을
  track 전체의 태그 집합으로 합쳐 AND를 충족시키지 않는다. 분석이 없던 녹화는 카메라·시간
  검색에는 포함되며 객체·행동을 추정해서 채우지 않는다.
- UTC가 불명인 자료는 시간 범위와 일치한다고 단정하지 않는다. `includeUnplaced=true`일 때
  별도 시간 미확인 결과로 제공하고 건수·상태를 분리한다. 기본값은 false다.
- 결과에는 안정 ID, channel, kind, 시간/시간 품질, 확인 가능한 관측·이벤트 참조,
  선정 이유, 재생 가능 상태와 사유를 둔다. 파일 경로·source URL·raw JSON·인증 정보는 제외한다.

## 2. 행동 근거

`behaviour` 값은 `event:<EventRecord.event_type>` 또는
`scenario:<EventRecord.scenario_name>`의 명시적 이름 공간을 사용한다.
Intrusion/LineCrossing과 기존 scenario 이름은 저장 당시 값 그대로 비교한다.
새 행동 추론·자연어 동의어·VLM 분류·관계 추론은 추가하지 않는다.

관측의 `event_ids`가 가리키는 EventRecord를 기존 application 경계를 통해 읽는다.
event ID·channel·track 등 확인 가능한 연결이 맞는 경우에만 그 이벤트의 행동 사실을 사용한다.
관측에 연결되지 않은 같은 시각의 이벤트로 빈 근거를 메우지 않는다. EventRecord가 없거나
읽기 범위가 불완전하면 근거 미확인을 표현하고 행동 일치를 생성하지 않는다.
`scenario_ids`와 `scenario_name`은 다른 값이며 상호 대입하지 않는다.
한 질의에 event와 behaviour가 함께 있으면 동일한 연결 이벤트가 두 조건을 만족해야 한다.
검색 전용 이벤트 읽기는 채널별 최대 10,000행/논리 8MiB이며 먼저 도달하는 한도를 적용한다.
상한 초과·손상·부분 줄·동일 event ID의 사실 충돌은 incomplete/오류로 처리하고 행동 일치로 사용하지 않는다.
원본 JSON/미디어 경로는 검색 사실 DTO에 포함하지 않는다.

## 3. read model과 갱신

- 검색은 원본을 소유하지 않는 재구축 가능한 별도 read model과 인덱스를 가진다.
  초기 구현은 bounded memory projection으로 하며 SQLite의 설치를 새 필수 조건으로 만들지 않는다.
  저장 형식 migration은 기존 reader를 통한 소비와 검색 projection 재구축으로 수행한다.
- 원본 카탈로그·현재 V2 관측/참조·이벤트 저장 application 경계로 입력한다. 검색/UI가
  JSONL·generation 파일·SQLite 내부 테이블을 독자 해석하지 않는다.
- 카탈로그 adapter는 성공/빈 결과/미준비/손상을 구분하고 일관된 revision과 값을 제공한다.
  카탈로그 잠금 아래 외부 callback, 파일 전체 검사, 검색 정렬, 네트워크 전송을 수행하지 않는다.
- 초기 projection 후 변화분을 반영한다. 변경 이력 유실·재시작은 명시적 재구축으로 전환한다.
  새 모델 완성 전에는 부분 결과를 정상 전체 결과로 게시하지 않는다. 실패는 이전 모델을
  현재 상태로 위장하지 않고 재시도 가능한 미준비/오류로 전달한다.
- 관측 추가, 원본 확정, 이벤트 결과 확정, 삭제·손상·채널 변경은 projection을 무효화하거나
  갱신한다. 검색 snapshot은 재생 lease가 아니며 retention을 막지 않는다.
- 조회 준비와 갱신은 요청/검색 실행 경계에 두고 미디어·분석 callback의 동기 작업에 추가하지 않는다.

## 4. 정렬과 cursor

정렬은 known UTC 내림차순, channel ID 오름차순, 안정 result ID 오름차순이다.
시간 미확인 결과는 known 결과 뒤에서 channel/ID로 결정적으로 정렬한다.
한 결과의 이벤트/상시 선택과 중복 처리는 페이지 분할 전에 수행한다.

첫 요청은 불변 결과 snapshot을 만든다. 후속 cursor는 schema version, 정규화한 질의의
SHA-256 checksum, 요청 principal 및 채널 scope 경계, snapshot ID, 마지막 정렬 위치에
결박한다. checksum은 권한 증명이 아니다. 매 요청에서 현재 principal·scope를 검증한다.
cursor는 서버가 발급한 불투명 토큰이며 변조·다른 조건·다른 사용자·재시작·만료를 거부한다.
snapshot 유효기간은 5분이고, 서버 한도에 따른 축출도 명시적 만료로 응답한다.

진행 중 새 관측·이벤트 확정은 새 검색에서 보인다. 기존 페이지의 멤버십·정렬·건수는
snapshot 기준이다. 삭제/손상/권한은 후속 결과와 재생에서 현재 상태를 적용한다.
삭제된 hit를 다른 hit로 바꿔 페이지 중복·누락을 만들지 않는다. 재검색 시 삭제 상태 정책을
반영한 새 snapshot을 얻는다. limit 기본 50, 최대 200이며 질의 checksum에 포함한다.

## 5. 동일 원본의 이벤트 우선

이벤트 우선의 동등성은 source/store/media epoch/원본 segment와 입증된 미디어 구간이다.
UTC만 같은 두 원본은 독립 결과다. event 출력은 건강한 파일과 원본 대응을 확인한 경우에만
우선 재생 대상으로 삼는다. partial 이벤트는 입증된 범위만 덮고 나머지 원본을 유지한다.
fallback·누락·미완성 영상은 근거 없이 complete로 승격하지 않는다.
관측 검색에서는 hit를 유지한 채 해당 시점을 포함하는 이벤트 재생 후보를 우선 선택한다.
복수 유효 이벤트의 순서는 안정 ID로 고정한다. 클라이언트는 자체 우선순위를 계산하지 않는다.

## 6. 재생 위치

원본 PTS/time base/consumer reference에서 선택된 실제 파일의 presentation time으로
변환한다. UTC 차이나 requested event range의 시작을 파일 seek offset으로 쓰지 않는다.
현재 file evidence와 원본/파생 provenance를 재사용하고, 파일 대응을 입증할 수 없으면
`seek-unavailable`로 반환한다. 이 경우 파일 시작 재생과 검색 시점 이동을 UI에서 구분한다.

검색 재생 응답은 허용된 media URL, 파일 내 target seconds, 시간 품질·사유를 포함한다.
URL과 위치만으로 권한이나 파일 존재를 보장하지 않으며 기존 media 경로에서 재검증하고
기존 fd/hold 수명을 유지한다. 선택 변경·늦은 loadedmetadata/seek 응답이 이전 파일 위치를
새 파일에 적용하지 않도록 한다. 불명·복수 원본에서는 임의 단일 위치를 선택하지 않는다.

단기 실제 영상 검증은 저장된 frame별 독립 표시값/디코딩 기대 위치를 기준으로 한다.
기준 영상에서 목표 presentation 시각 대비 허용 오차는 한 frame duration 이내다.
컨테이너·GOP별 미지원은 명시하며 keyframe 도착만으로 정확한 위치 PASS를 만들지 않는다.
임의 장치의 촬영 시각 동기화·자동 후속 파일 재생·프레임 추출 제품은 범위 밖이다.

## 7. 자원과 권한 경계

초기 admission은 projection 최대 100,000행/논리 64MiB, 서버의 보관 snapshot 합계 논리
128MiB/최대 8개다. 문자열·vector·인덱스와 갱신 중 사본의 비용을 계상하고 초과를 조용한
truncation으로 바꾸지 않는다. 논리 예산은 RSS 보장이 아니며 실측 결과를 따로 보고한다.
지원 행 수 이내라도 바이트 한도가 먼저 적용될 수 있다. 기존 Catalog 누적 RAM 문제의
상한이나 해소를 의미하지 않는다. 크기 한도 오류는 `search-capacity-exceeded`로 구분한다.

1/1,000/10,000행의 독립 fixture로 결과 동일성과 비용을 확인하고 100,000/100,001행 및
64MiB 경계에서 admission을 검사한다. 한도는 실패 후 PASS를 위해 확대하지 않는다.
검색의 반복 준비가 녹화 쓰기 잠금·미디어 worker 수명을 점유하지 않는지 단기 통합으로 확인한다.

기존 admin/operator + `ops:read` + 모든 요청 채널의 `source:read:<channel>`을 요구한다.
viewer/integrator로 녹화 검색 권한을 확대하지 않는다. 결과·건수·cursor·에러에서 금지 채널의
정보를 노출하지 않는다. 권한 없는 요청은 source 읽기와 snapshot 조회 전에 거부한다.

## 8. 제품 UI

기존 `/ops/events` 녹화 영역에 카메라·시간과 메타데이터 필터, 검색 결과, 다음 페이지,
검색 시점 재생을 연결한다. primary nav 및 Client/Viewer 경계를 유지한다.
동일 서비스가 필터·건수·정렬·이벤트 우선·재생 후보를 결정한다.
loading/empty/invalid/expired/unavailable 및 시간 미확인 상태와 재검색 동작을 제공한다.
light/dark·모바일/데스크톱에서 결과와 플레이어가 잘리지 않도록 변경 영역을 직접 확인한다.

## 9. 조사와 독립 구현

확인일 2026-10-03. 아래 공식 문서의 공개 의미만 참고하며 코드·schema·prompt를 복사하지 않는다.

| 자료 | 채택 의미 | 출처·권리와 제외 |
| --- | --- | --- |
| [SQLite Row Values](https://sqlite.org/rowvalue.html) | 복합 정렬 키 이후의 페이지라는 일반 비교 의미 | SQL 예제·외부 구현 복제 없음; 메모리 index에도 같은 독립 요구 적용 |
| [SQLite Isolation](https://sqlite.org/isolation.html) | 읽기 중 다른 쓰기와 구분되는 snapshot 의미 | SQLite의 특정 transaction을 장시간 열어두도록 요구하지 않음 |
| [SQLite Copyright](https://sqlite.org/copyright.html) | SQLite core의 public-domain 고지 확인 | 별도 확장/문서의 권리를 core와 같다고 추정하지 않음; 새 의존성 없음 |
| [WHATWG media](https://html.spec.whatwg.org/multipage/media.html#dom-media-currenttime) | currentTime과 비동기 seeking의 공개 동작 | 코드 복제 없음; 설정값만으로 실제 표시 frame 일치가 입증되지 않음 |

[기존 IP 게이트](../../research/v410-recording-ip-risk-gate.md)의 exclusion-first 경계를 적용한다.
이번 채택은 명시 필터의 집합 교집합, 일반 정렬/페이지, 기존 원본-파일 시간 대응의 독립 구현이다.
특정 특허의 번호·청구항·상세 구현은 소비하지 않았으며 권역별 특허 검색/FTO는 수행하지 않았다.
외부 벡터·semantic search·자동 행동 추론·VARuleLens 구현은 제외한다.
새 권리 위험이나 새 runtime dependency가 필요한 접근은 그 접근의 범위를 먼저 재판정한다.

## 10. 순차 작업과 완료 증거

| 단계 | 작업 | 다음 단계 전 확인 |
| --- | --- | --- |
| 1 | 본 계약·조사·기능별 기대값 | 링크·diff·원본 계약과 대조 |
| 2 | 별도 read model/index | 원본 불변·identity·빈/불명·admission 단기 검사 |
| 3 | source adapter·증분/재구축·삭제/복구 | 실제 catalog V2·원장 재개방·실패 원자성 |
| 4 | 8종 필터 | 각 필터 및 교차 관측/이벤트 반례 |
| 5 | 안정 정렬·cursor | 동률·변경·삭제·범위/사용자 변경·만료 |
| 6 | 이벤트 우선 | 같은 원본/다른 원본·부분·미완성 독립 기대값 |
| 7 | 정확한 재생 | 실제 파일·PTS 변환·독립 영상 위치·보호 수명 |
| 8 | API·권한 | 실제 HTTP 정상/오류·역할/scope·정보 비노출 |
| 9 | UI | 변경 영역 직접 조작·페이지·재생·상태·theme/viewport |
| 10 | 호환/영향 회귀·문서·버전·push | 기존 golden hash/reader·현재 V2·빌드·단기 통합·정리·누적 diff |

v4.1.0 golden 바이트/digest는 변경하지 않는다. 새 사례는 별도 fixture로 작성한다.
각 단계의 검증은 다음 단계 전에 실행하며 최종 단계에서 관련 회귀를 묶는다.
릴리즈용 검증 제외는 PASS가 아니라 이번 목표의 미실행으로 기록한다.
완료 보고는 1~10의 실제 증거, 제한, 커밋과 push 원격 대상 hash를 확인한 뒤 작성한다.
