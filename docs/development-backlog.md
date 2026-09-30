# 개발 backlog

현재 남은 일과 알려진 제한을 관리한다. 버전별 목표·순서·완료 기준은
[녹화·검색 로드맵](v410-v49-recording-search-roadmap.md)에 둔다.
과거 실행 결과를 현재 미완료 작업이나 이번 실행의 검증 결과로 해석하지 않는다.

## 현재 기준

- 소스 버전은 `VERSION` 기준 `4.1.0`이다. `v4.1.1` 브랜치는 문서 정리 중이며
  버전 번호 변경이나 v4.1.1 공개 완료를 뜻하지 않는다.
- 저장소에 기록된 공개 버전은 `v4.1.0`이다. 관측 시각과 공개 URL의 기준은
  [릴리즈 metadata](release-policy.md#소스와-기록된-공개-상태)이며 원격 상태의 실시간 확인과 구분한다.
- v4.1.0 녹화 기반은 [릴리즈 노트](release-notes-v4.1.0.md)의 구현 범위로 마감됐다.
  옛 S05·S10·S11 진행·실패 기록은 [Git 이력](history/README.md)에 있으며 현재 개발 과제가 아니다.
- 다음 제품 개발은 문서 정리 뒤 별도 승인할 v4.2.0이다. 이 backlog는 구현 권한을 부여하지 않는다.

## 현재 남은 문서 정리

대상은 프로젝트의 모든 문서이며 README와 AGENTS가 주요 진입점이다.
이미 정리한 분야를 이번 단계에서 다시 감사하지 않는다.

1. **최종 정합·마감:** 현행 링크·문서 소비자·버전 설명을 맞추고 문서 정리 결과와
   과거 제품 검증을 구분한다. 임시 리뷰의 유효한 잔여는 이 문서로 이관하며 전수 목록 확인을
   전체 전문 검토로 간주하지 않는다. 중앙 기록 소비자 전환·정리 검증이 마감된 뒤 별도 지시로 진행한다.
2. **별도 승인 릴리즈:** 앞 단계 완료만으로 push·PR·병합·태그·Release를 실행하지 않는다.

구조 분류와 저장 값·수명 경계의 제한 수정은 현행
[소유 graph](../test/fixtures/v390_structure_stabilization_current_graph.json)에 반영했다.
소유 분류 완료는 모든 의존 관계의 허용이나 독립 검토 완료를 뜻하지 않는다.
현재 허용되지 않은 연결은 `include/recording/segment_writer.h → include/media_types.h`와
`src/recording/recording_runtime_composition.cpp → include/recording/recording_cutover_candidate.h`다.
각각 packet 자료형 소비와 저장소 cutover 복구 제한값 생성에 사용된다. 기존 정책에서
정상으로 바꾸려면 별도의 정확한 허용 또는 제품 경계 수정 판단이 필요하며 포괄 예외로 처리하지 않는다.
이 연결의 처리와 과거 graph 수치에 고정된 직접 소비자 정합을 마친 뒤 C1 검토 후보를 고정한다.
C2 독립 검토·C3 결속과 coverage/readiness 판정은 별도 단계이며 아직 완료되지 않았다.

## 알려진 제한과 별도 결정 후보

### 기능 후보의 범위 결정

후보의 발견과 구현 승인은 다르다. 다음 상태는 작업 분류이며 승인 기록이나 실행 결과가 아니다.
실제 구현 권한은 사용자의 명시 지시에서 확인하고, 후보를 승인된 작업에 자동 추가하지 않는다.
상세 안전 기준은 [AGENTS](../AGENTS.md#2-범위와-승인), 검사는
`./server.sh verify-feature-scope-gate`와 [검증 안내](stream-verification.md)를 따른다.

| 상태 | 구현 권한 |
| --- | --- |
| candidate-only | 없음 |
| approved-next-roadmap | 승인된 범위만 |
| deferred-non-scope | 없음 |

승격 검토에서는 아래 항목을 빠뜨리지 않는다. 이 표의 존재만으로 승인을 받았다고 판단하지 않는다.

| 검토 항목 | 조건 |
| --- | --- |
| owner approval | 사용자 명시 승인 |
| target version | 승인 대상 버전 |
| contract impact | 아래 보호 계약에 대한 영향 |
| non-scope | 제외 범위 |
| verification | 정상·오류·경계 검증 |

보호 계약: WebRTC DataChannel, Event POST, SSE/WS metadata, Auth/Role/Scope와
인증·세션, RTSP/WebRTC media path. 계약 변경은 별도 승인된 호환·복구 방안 없이
일반 기능 후보로 승격하지 않는다. 현재 후보와 제한은 아래 표에 두고 완료 이력을 누적하지 않는다.

| 항목 | 현재 경계와 후속 결정 |
| --- | --- |
| 녹화·검색 | 녹화 기반과 분석 관측은 구현됐지만, 녹화 전체를 대상으로 하는 구조화·벡터·자연어 검색은 후속 계획이다. 기존 이벤트 검색과 새 녹화 검색을 혼동하지 않는다. |
| 시간과 재생 | 원본·미디어 위치와 UTC 품질은 별개다. 불명·모호·삭제 상태를 정상 단일 결과로 만들지 않으며 모든 카메라의 촬영 시각 동기화나 자동 후속 세그먼트 재생을 보장하지 않는다. |
| 운영 기능 승격 | `action-execution`, `persistent-credential-store`, `production-restore`, `external-vlm-provider-call`, `model-backed-reid-session`은 로컬 정책의 보류·실험 경계를 유지한다. 상태/결정 조회나 fixture 성공을 실제 실행 기능으로 승격하지 않는다. |
| 제품화 후보 | Incident OS primary nav 승격, Evidence default-on, 로컬 Action Execution, 영구 credential store, tracker 기본 선택, 로컬 VLM 운영 경로는 버전·범위 재승인 전 미배정 후보다. 과거의 “v4.1.0에서 구현” 문구는 현행 일정이 아니다. |
| 추적·Re-ID 연구 | 연구 또는 opt-in 경계를 유지한다. BoT-SORT/DeepSORT·OC-SORT의 연구 자료를 현재 지원 tracker나 기본 선택으로 간주하지 않는다. |
| 검증 범위 | 외부 서비스·실기기 검증은 사용자 제외이며 PASS가 아니다. 로컬·한정 시간의 결과를 다른 장비나 무기한 운용의 보장으로 확대하지 않는다. |
| 표시 언어 | 영문 운영 사용자 목록의 숫자 채널 권한 보조 문구에 한글이 남을 수 있다. 권한 결함과는 구분하며 수정 일정은 미정이다. |
| 참고 자료 | 외부 저장소는 원본 용도로 유지하며 MediaServer에 종속시키지 않는다. 라이선스 미확인 자료와 특허 위험 접근은 구현 참고에서 제외한다. 세부 기준은 로드맵의 참고·조사 경계를 따른다. |
| 의존성 스냅샷 | `DEPENDENCY_SNAPSHOT.md`의 `generatedAt: stable`·plugin 조회 timeout은 당시 수집 상태다. 현행 설치 실패나 라이선스 문제의 증거가 아니다. 최종 문서 정합에서 시점·수집 범위를 attribution과 구분하며 새로운 의존성 조사로 확대하지 않는다. |

운영·계약의 상세 기준은 [문서 색인](README.md), [UI 가이드](ui-guide.md),
[설정 참조](config-reference.md), [검증 정책](stream-verification.md),
[버전 정책](versioning-policy.md)을 따른다. 미래 검색의 상세 요구는 여기 복제하지 않는다.
