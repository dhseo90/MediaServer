# v4.1.0 녹화 IP 위험 차단 게이트

## 문서 경계

- checkedAt: 2026-09-03
- screeningRegions: KR, US, EP, PCT
- screeningMethod: exclusion-first-no-patent-detail-ingestion
- legalBoundary: not-legal-opinion-not-fto
- specificPatentDetailsConsumed: false
- patentNumberCopied: false
- claimTextCopied: false
- implementationDetailCopied: false
- cleanRoomConfirmed: true

이 문서는 특허 아이디어를 수집하는 조사가 아니다. 사용자의 원칙에 따라 위험 가능성이 있는
특허 정보는 제품 설계 입력으로 읽거나 복제하지 않는다. KR/US/EP/PCT는 출시 전 확인해야 할
권역 범위를 나타내며, 이번 S00에서는 특정 특허 문서·번호·청구항·구현 상세를 소비하지 않는
차단 방식으로만 screening했다. 따라서 이 결과는 법률 의견, 비침해 판단 또는 FTO를
대체하지 않는다.

권역별 공통 판정은 다음과 같다.

| 권역 | S00 공학 게이트 | 특정 특허 상세 반입 | 법률/FTO 상태 |
| --- | --- | --- | --- |
| KR | 공개 표준·독립 요구만 허용 | 없음 | 미수행·대체 불가 |
| US | 공개 표준·독립 요구만 허용 | 없음 | 미수행·대체 불가 |
| EP | 공개 표준·독립 요구만 허용 | 없음 | 미수행·대체 불가 |
| PCT | 공개 표준·독립 요구만 허용 | 없음 | 미수행·대체 불가 |

## approachId: segment-keyframe-rotation

- functionality: 고정 시간 segment를 keyframe 경계에서 닫고 다음 segment 기록을 계속함
- decision: 허용
- decisionBasis: 공식 GStreamer 공개 동작 의미와 MediaServer의 독립 녹화 요구만 사용
- cleanRoomAction: 외부 구현 코드를 복사하지 않고 기존 packet fan-out과 공개 API로 독립 구현

## approachId: atomic-fragment-finalize

- functionality: 임시 경로 기록 뒤 finalize된 fragment만 catalog에 게시함
- decision: 재설계
- decisionBasis: 외부 제품 구현을 참고하지 않고 공개 finalize 의미와 일반 filesystem 원자 게시 경계로 축소
- cleanRoomAction: temporary-write, close/finalize, project-owned rename와 recovery 상태를 자체 계약으로 정의

## approachId: oldest-first-quota-retention

- functionality: 설정 용량 초과 시 삭제 가능한 가장 오래된 상시녹화부터 제거하고 녹화를 계속함
- decision: 허용
- decisionBasis: 사용자가 직접 승인한 일반 quota 제품 요구와 독립 정렬 규칙만 사용
- cleanRoomAction: event 보호, pin, disk reserve, tombstone을 MediaServer 정책으로 새로 구현

## approachId: event-overlap-derived-clip

- functionality: 이벤트 시간과 겹치는 상시 segment를 연결하고 pre/event/post 재생 구간을 제공함
- decision: 재설계
- decisionBasis: 외부 구현 상세 없이 시간 범위 교집합과 프로젝트 기존 event frame buffer만 사용
- cleanRoomAction: 원본 segment link를 우선하고 필요한 경우 자체 remux, 공백은 기존 bounded buffer fallback으로 제한

## approachId: future-semantic-search-techniques

- functionality: embedding, vector ranking, evidence review, 자연어 query planning
- decision: 보류
- decisionBasis: v4.1.0 녹화 범위가 아니며 별도 라이선스·IP·품질 게이트 없이 선구현하지 않음
- cleanRoomAction: v4.1.0에서는 stable ID와 bounded observation만 저장하고 검색 알고리즘은 v4.2.0 이후 재검토

## 구현자 차단 규칙

1. 위 `허용`은 공학적 설계 입력 허용일 뿐 권리 비침해 보증이 아니다.
2. `재설계` 항목은 이 문서의 기능·결정·clean-room action만 사용한다. 특정 특허 자료나
   외부 제품 구현 상세를 추가하지 않는다.
3. `보류` 항목은 해당 버전의 사용자 승인과 별도 공개 표준·라이선스·IP 게이트가 생길
   때까지 코드, dependency, schema로 구현하지 않는다.
4. 이후 개발 중 특허 위험 가능성이 제기되면 상세 정보를 구현자 문서로 옮기지 않고 해당
   접근을 즉시 중단해 `재설계` 또는 `보류`로 되돌린다.
5. 실제 배포 전 법률 검토가 필요하면 별도 전문 절차로 수행하며, 그 결과를 이 공학 문서의
   PASS로 대체하지 않는다.
