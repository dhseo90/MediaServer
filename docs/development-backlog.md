# 개발 backlog

현재 남은 일과 알려진 제한을 관리한다. 버전별 목표·순서·완료 기준은
[녹화·검색 로드맵](v410-v49-recording-search-roadmap.md)에 둔다.
과거 실행 결과를 현재 미완료 작업이나 이번 실행의 검증 결과로 해석하지 않는다.

## 현재 기준

- 소스 버전과 릴리즈 목표는 `4.4.0`이다. 증거 패키지 개발 범위와 검증·공개 상태는
  [릴리즈 노트](release-notes-v4.4.0.md)에서 구분한다.
- 저장소의 기록된 공개 버전·관측 시각·공개 URL의 기준은
  [릴리즈 metadata](release-policy.md#소스와-기록된-공개-상태)이며 원격 상태의 실시간 확인과 구분한다.
- v4.1.0 녹화 기반은 [릴리즈 노트](release-notes-v4.1.0.md)의 구현 범위로 마감됐다.
  옛 S05·S10·S11 진행·실패 기록은 [Git 이력](history/README.md)에 있으며 현재 개발 과제가 아니다.
- v4.2.0 개발 범위와 제한은 [릴리즈 노트](release-notes-v4.2.0.md)를 따른다.
  v4.3.0의 공개 관측은 릴리즈 metadata에 기록돼 있다. 이번 개발의 검증으로 대체하지 않는다. [개발 계약](superpowers/specs/2026-10-04-v430-visual-vector-search-design.md)을 따른다.

## v4.5.0 잔여 개발과 릴리즈 순서

`v4.5.0` 브랜치의 01~04 구현·단기 검증을 보존했고, 2026-10-05 재개 평가에서
05 최종 prompt의 실제 로컬 품질 기준과 06 API/Auth·UI 상태 단기 검증을 통과했다.
06 fixture 시작/정리 실패는 재개 승인 후 수정·재검증했고 07 외부 adapter/protocol도 구현했다.
외부 실제 모델 조건과 검증/제외 결정, 최종 영향 회귀·릴리즈 gate는 아직 남아 있다.
정확한 실패·최종 코드의 미실행 경계·정리는 [개발 실행 결과](release-artifacts/v4.5.0/development-results.md)에만 둔다.
아래 중요도는 현재 출시 차단 기준이며 원래 [개발 순서](v410-v49-recording-search-roadmap.md#개발-우선순위와-선행-관계)를 변경하지 않는다.

| 순서·중요도 | 남은 일과 완료 조건 | 근거·승인/검증 경계 |
| --- | --- | --- |
| 3 · P2 | V450-07: 구현한 선택 Gemini adapter의 실제 계정/model/credential/privacy 조건을 확정하고 실호출 또는 제외 상태 명시 | adapter·무호출 guard·합성 protocol과 외부 UI 상태 통과. 실제 Google 전송/품질은 미실행이며 조건 미확정 |
| 4 · P0 | V450-04 잔여 영향 + 08: 실제 RTSP/WebRTC·metadata/Event POST·녹화/검색의 모델 병행 진행, 실제 모델 취소/종료와 자원 회수, API/Auth 영향·지원 Linux·구조 graph/배포 소비자 확인 | 현재 native 검사는 일부 녹화/event append/검색뿐이다. 소스/환경 차이에서 도출한 잔여 범위이며 미실행을 PASS로 삼지 않음 |
| 5 · P0 | 코드 고정 후 독립 검토, 필수 30분과 실제 UI 풀테스트, worker/자원 수명에 매핑된 120분 수행·잔여 실패 해소 | AGENTS·검증/릴리즈 정책의 직접 기준. 장시간·UI 풀테스트·지정 모델 독립 검토는 별도 명시 승인 필요 |
| 6 · P0 | 최종 버전·CMake·릴리즈 노트/metadata·운영 안내 정합, 검증 기록 보존 후 승인된 정리, required CI·main 최종 hash·서명/Verified·공개 확인 | VERSION은 아직 4.4.0. PR·병합·signed tag·GitHub Release는 각각 별도 승인, 브랜치 push를 릴리즈로 간주하지 않음 |

## 별도 승인 릴리즈

v4.1.1 당시 C1 소스·구조 정합, C2 독립 검토와 C3 승인 원장 적용·coverage/readiness는 완료된 과거 범위다.
마감된 상세 실행·검토 기록은 [Git 이력](history/README.md)에 연결하며 진행 일지를 여기 누적하지 않는다.
실제 UI·30분·필요한 120분의 실행 범위와 기존 증거 유효성은 누적 제품 변경 영향을 기준으로
[릴리즈 정책](release-policy.md#출시-전-검증-판정)에 따라 판정한다. 문서·후보 준비로 면제하거나
새 PASS로 간주하지 않는다. PR·CI·main 병합·서명 태그·공개는 후속 4단계의 별도 승인 범위다.

구조 분류와 저장 값·수명 경계의 제한 수정은 현행
[소유 graph](../test/fixtures/v390_structure_stabilization_current_graph.json)에 반영했다.
소유 분류는 모든 의존 관계를 허용하는 것이 아니다.
SegmentWriter는 기존 packet 계약 진입점을 사용하며 `media_types.h`의 전이 의존은 남는다.
runtime composition의 cutover 제한값 생성은 승인된 정확한 파일 연결로 제한한다.
현행 graph 소비자는 실제 소스·CMake·파일별 정책을 대조하고, 과거 completion snapshot은 보존한다.

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
| 녹화·검색 | 녹화 기반과 구조화 검색을 제공한다. v4.3.0 개발에서는 로컬 SigLIP2 대표 프레임 및 원본 픽셀 대조를 거친 이벤트 snapshot 검색을 연결했다. focused 실제 UI·제품 독립 검토를 마쳤다. 공통 안정화·30분·120분·기존 실제 UI 424건을 통과했다. v4.3.0의 해당 결과는 실제 모델의 지속 혼합 부하와 신규 UI의 미실행 경계까지 검증한 것은 아니다. v4.4.0의 수정 후 혼합30/120분·UI 보완 범위는 [릴리즈 노트](release-notes-v4.4.0.md)를 따른다. 기존 이벤트/관측/영상 유사 결과의 의미를 구분한다. |
| 녹화 자원 수명 | 순환삭제 후에도 catalog/identity의 이력 크기가 증가할 수 있다. v4.4.0의120분 혼합 관측은 정해진 자원 상한 이내였으나 RSS 증가가 남아 있으며 무기한 운용·누수 없음의 보장이 아니다. 장기 이력 상한/압축은 별도 범위 결정이 필요하다. |
| 시간과 재생 | 원본·미디어 위치와 UTC 품질은 별개다. 불명·모호·삭제 상태를 정상 단일 결과로 만들지 않으며 모든 카메라의 촬영 시각 동기화나 자동 후속 세그먼트 재생을 보장하지 않는다. |
| 운영 기능 승격 | `action-execution`, `persistent-credential-store`, `production-restore`, `external-vlm-provider-call`, `model-backed-reid-session`은 로컬 정책의 보류·실험 경계를 유지한다. 상태/결정 조회나 fixture 성공을 실제 실행 기능으로 승격하지 않는다. |
| 제품화 후보 | Incident OS primary nav 승격, Evidence default-on, 로컬 Action Execution, 영구 credential store, tracker 기본 선택은 버전·범위 재승인 전 미배정 후보다. 로컬 VLM 운영 경로 중 불변 증거 기반 VA Review 01~07은 v4.5.0의 approved-next-roadmap이며 실제 품질·외부 호출·릴리즈 조건은 위 잔여 항목을 따른다. 과거의 “v4.1.0에서 구현” 문구는 현행 일정이 아니다. |
| 추적·Re-ID 연구 | 연구 또는 opt-in 경계를 유지한다. BoT-SORT/DeepSORT·OC-SORT의 연구 자료를 현재 지원 tracker나 기본 선택으로 간주하지 않는다. |
| 검증 범위 | 외부 서비스·실기기 검증은 사용자 제외이며 PASS가 아니다. 로컬·한정 시간의 결과를 다른 장비나 무기한 운용의 보장으로 확대하지 않는다. |
| 표시 언어 | 영문 운영 사용자 목록의 숫자 채널 권한 보조 문구에 한글이 남을 수 있다. 권한 결함과는 구분하며 수정 일정은 미정이다. |
| 참고 자료 | 외부 저장소는 원본 용도로 유지하며 MediaServer에 종속시키지 않는다. 라이선스 미확인 자료와 특허 위험 접근은 구현 참고에서 제외한다. 세부 기준은 로드맵의 참고·조사 경계를 따른다. |
| 의존성 스냅샷 | `DEPENDENCY_SNAPSHOT.md`의 `generatedAt: stable`·plugin 조회 timeout은 당시 수집 상태다. 현행 설치 실패나 라이선스 문제의 증거가 아니다. 최종 문서 정합에서 시점·수집 범위를 attribution과 구분하며 새로운 의존성 조사로 확대하지 않는다. |

### 녹화 누적 이력의 메모리 운영 한계

장기 운용 한계는 남아 있다. v4.3.0에서는 사전에 정한 단기 규모에서 이력 중복·검색 수명과
실제 모델/녹화 혼합 예산을 검증했다([개발 기록](history/README.md#v430-개발과-로컬-검증)).
무제한 이력이나 일반 운영 장비의 장시간 안정성 보장은 아니다. 현재 generation 경로의 Catalog/Journal은 mutation identity·order를 중복·충돌·예약 재사용 방지에,
retired receipt·source 요약을 미디어 삭제 후의 참조·삭제·조회 판단에 사용한다.
이 이력은 미디어 삭제·녹화 off·checkpoint로 함께 지워지지 않으므로 파일 quota/age는 이력 RAM 상한이 아니다.

기존 일반 acceptance·UI432·녹화 단기 통합·녹화120분의 기능·저장·재기동·cleanup PASS는
각 실행의 소스·환경 범위에서 유지한다([검증과 보존 위치](release-notes-v4.1.1.md#검증과-공개-상태)).
정상 off 후 footprint·heap 감소와 빈 allocator 영역 관측으로 높은 RSS 전부를 미해제 객체량으로 보는
해석은 해소했지만, 지원 이력 규모·RAM 예산·장기 관리 범위와 off 후 live 할당의 세부 귀속은 일부 미확정이다.
추가 스택 진단은 16MiB 출력 수집 한도로 중단됐다. 제품 OOM·녹화 assertion 실패가 아니며,
부분 스택은 하한이다. 미수집 부분과 해당 진단의 off 관측을 추정하지 않는다.
근거는 원본 보존 `bf81919f0ac3bc1b9726ce22f01f2aa1d4933149`와 대조·정리 `c4995e0ee2c912c3bf15923f369cc282b0a5fcfb`의
[RSS 보완 판단](https://github.com/dhseo90/MediaServer/blob/c4995e0ee2c912c3bf15923f369cc282b0a5fcfb/docs/release-artifacts/v4.1.1/recording-rss-followup-20261002/review.md)과 연결된 원자료에 둔다.

v4.2.0의 후속 기능 검증과 자원 검토도 이 제한을 해소하지 않았습니다([최신 검증 범위](release-notes-v4.2.0.md#검증과-공개-상태)).

후속 개발 대상은 v4.3.0으로 배정한다. 벡터 검색 확장에 앞서 누적 이력 RAM과 검색 동시 부하의
지원 범위·예산·수명을 다루며, 순서와 완료 기준은 [v4.3.0 선행 과제](v410-v49-recording-search-roadmap.md#선행-과제-누적-이력-ram과-검색-동시-부하)에 둔다.
현재 승인된 개발의 유한한 지원 범위·예산은 [v4.3.0 개발 계약](superpowers/specs/2026-10-04-v430-visual-vector-search-design.md)에 확정했다.
과거 진단의 한계와 새 개발 검증의 범위를 구분한다.

과거 추가 스택 진단은 종료 상태를 유지한다. v4.3.0 개발 승인은 별도이며 장기 운영 범위를
자동 확대하지 않는다.
2채널·120분 관측을 지원 상한으로 바꾸거나 관측 메모리 값을 새 합격선으로 삼지 않는다.

운영·계약의 상세 기준은 [문서 색인](README.md), [UI 가이드](ui-guide.md),
[설정 참조](config-reference.md), [검증 정책](stream-verification.md),
[버전 정책](versioning-policy.md)을 따른다. 미래 검색의 상세 요구는 여기 복제하지 않는다.
