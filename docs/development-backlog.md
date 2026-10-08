# 개발 backlog

현재 남은 일과 알려진 제한을 관리한다. 버전별 목표·순서·완료 기준은
[녹화·검색 로드맵](v410-v49-recording-search-roadmap.md)에 둔다.
과거 실행 결과를 현재 미완료 작업이나 이번 실행의 검증 결과로 해석하지 않는다.

## 현재 기준

- VERSION/CMake의 소스 표기는 `4.4.0`, 현재 개발 브랜치의 목표는 `v4.5.0`이다.
  버전 표기 전환은 아래 최종 마감에 남기며, v4.4.0 증거 패키지의 검증·공개 상태는
  [릴리즈 노트](release-notes-v4.4.0.md)에서 구분한다.
- 저장소의 기록된 공개 버전·관측 시각·공개 URL의 기준은
  [릴리즈 metadata](release-policy.md#소스와-기록된-공개-상태)이며 원격 상태의 실시간 확인과 구분한다.
- v4.1.0 녹화 기반은 [릴리즈 노트](release-notes-v4.1.0.md)의 구현 범위로 마감됐다.
  옛 S05·S10·S11 진행·실패 기록은 [Git 이력](history/README.md)에 있으며 현재 개발 과제가 아니다.
- v4.2.0 개발 범위와 제한은 [릴리즈 노트](release-notes-v4.2.0.md)를 따른다.
  v4.3.0의 공개 관측은 릴리즈 metadata에 기록돼 있다. 이번 개발의 검증으로 대체하지 않는다. [개발 계약](superpowers/specs/2026-10-04-v430-visual-vector-search-design.md)을 따른다.

## v4.5.0 잔여 개발과 릴리즈 순서

현행 우선 목표와 세 묶음의 범위는 [설계52절](superpowers/specs/2026-10-05-v450-va-review-design.md#52-검색-마감-범위와-질의-입력)을 따른다.
기존 한영 장면 검색의 질의·명시 조건·검색 범위 확인과 재생/증거 보존을 먼저 마감한다.
묶음1의 질의 절단 차단·적용 조건 표시는 [52 구현/검증](release-artifacts/v4.5.0/52-validation.json)을
재사용한다. 묶음2의 게시 색인/통계 결속·갱신 상태·조건 재사용은 [53 구현/검증](release-artifacts/v4.5.0/53-validation.json)으로 완료했다. 첫 두 묶음을 다시 개발하지 않는다. 묶음3의 첫 범위인 실행 경계·ID/소비자·직접 검증은
[54 재개 검증](release-artifacts/v4.5.0/54-resume-validation.json)에 보존하며, 아래 출시 마감은 별도 잔여다.

[55 독립 검토](release-artifacts/v4.5.0/55-validation.json)는 입력/판단을 보존했으며 승인 결속은
55 당시 미완료다. [56 지적 수정·검토·결속](release-artifacts/v4.5.0/56-validation.json)에서
A 진행 조회/과거 결과 수명과 K05/K07/K08/U02 전용 회귀·역방향 누락 탐지를 보완했다.
현재 필수28개 독립 판단과 legacy986개 조건부 producer/readback·정적 결속은 완료했다.
미배정5개·역사 실험8개는 미채택 상태를 유지한다. 전체 UI·장시간·지원 OS·공개 절차는
여전히 별도 승인·검증 범위다.
고정 ClaimSpec/core, 40 관측 출처 보존, 41 결과/저장, 42 사용자 확인 A API/UI,
46 서버 자료 요청 안내는 완료 유지다. A는 분석 기록 일관성이며 독립 영상 사실 검증이 아니다.
Gemini 제거와 Ollama 연결·TLS/인증의 확인된 로컬 범위도 완료다. 컨테이너/원격 GPU는 연결 지원과
실환경 미검증을 구분한다. 개별 실행과 실패는 [개발 기록](release-artifacts/v4.5.0/development-results.md)에만 둔다.

38 정밀 관측, 43·45 모델 질문 표현 후보는 미충족 종료다. 47은 의미 보존을 확인했으나
편집 품질·실익 미충족으로 미채택이다.49 품질 미충족과50·51 제한 진단도 유지한다.
재실행이나 모델 문장화는 아래 기능의 선행 조건이 아니다.
자료 요청 표현의 현행 요구는46이며 자유질문 해석·실제 영상 관측은 여전히 미완료다.

| 개발 순서·중요도 | 현재 남은 일·완료 조건 | 경계 |
| --- | --- | --- |
| 묶음3 첫 범위 완료 | 모델 신규 Submit 서버 거부·A/이력 유지, 검색/A 출시 명령과 명시 모델 실험 분리, 저장 S01/검색 T01 정합·직접 HTTP/변경 화면 검증 | 독립 검토·승인 결속과 최종 릴리즈 검증의 완료는 아님 |

묶음3의 마감 순서는 아래와 같다. 새 개발 묶음을 추가하거나 v4.9로 미루는 목록이 아니다.

| 순서·중요도 | 출시 마감의 완료 조건 | 필요한 확인/승인 |
| --- | --- | --- |
| 1 · P0 | 최종 경로의 취소/Stop·권한 회수·실패 격리, 미디어/녹화/event/search 혼합 회귀와 지원 OS 검증 | 검색 후보/필터/재생/지연과 영상 주장 품질을 분리. macOS를 Linux 검증으로 대신하지 않음; 원격 GPU/컨테이너 실환경 제외 유지 |
| 2 · P0 | VERSION/CMake·release metadata·v4.5.0 노트·설정/UI 문서와 source-only 범위 고정 | 4.5.0 후보로 정합화. 실제 최종 검증과 공개 완료는 별도 |
| 3 · 완료 유지 | 56 source의 독립 변경분 검토·필수28개와 legacy986개 승인 결속 완료 | 버전/문서 준비의 실제 결속 영향만 확인. 의미 변경 시 독립 재검토 필요 |
| 4 · P0 | 승인된 최종 안정화 → 일반30분·필요한 일반120분·실제 UI | Q01/N03 일반120분 필요성 유지. 녹화 전용120분은 변경 영향으로 별도 판단. 각 영역 별도 실행 승인 |
| 5 · P0 | 필수 증거의 로컬/원격 원본 보존 확인 → 승인된 기록 정리 커밋·소유 자원 회수 | 과거FAIL·미실행·현행 계약/fixture 보호, 반복 archive·대량 임의 삭제 없음 |
| 6 · P0 | 최종 push·PR·required CI·main 병합 | 각각 실행 승인 확인. 실제 검사 소비자 정합을 이 전에 완료 |
| 7 · P0 | 최종 main의 서명 태그·GitHub Release·Latest/URL 확인 | source-only. 서명·원격 hash/Verified와 외부 실행 승인 필요 |
| 8 · 공개 후 정리 | 승인된 로컬/원격 v4.5.0 브랜치 삭제 | 공개·병합·보존 확인 뒤 별도 승인; 기능 합격 조건/후속 버전 자동 착수 아님 |

57 후보 준비에서 버전/문서 정합과 정적 coverage를 확인했으나, 기존 Linux sid/arm64 이미지에
ONNX C++ 개발 헤더·SentencePiece가 없어 제품 빌드 전 중단했다.
[준비·차단 원본](release-artifacts/v4.5.0/57-validation.json)을 보존하며 정식 acceptance는0회다.
58에서 별도 파생 이미지의 공식 ONNX Runtime1.23.2·SentencePiece0.2.0 C++ 준비와 제품 빌드는
통과했다. 한영 토큰/텍스트 벡터 회귀 후 실제 영상 검색이 기존 GStreamer1.28.1 증거 계약과
이미지의1.28.7 충돌로 실패해 후속 Linux 검사·정식 acceptance는 중단했다.
[58 환경·실행 원본](release-artifacts/v4.5.0/58-validation.json)과
[재현 recipe](release-artifacts/v4.5.0/58-linux.Dockerfile)를 보존한다. 재개에는1.28.1 증거
계약을 충족하는 Linux 환경 또는 별도로 승인된 호환성 검토가 필요하며, 제품 조건은 완화하지 않았다.

[59 제한 호환성 검증](release-artifacts/v4.5.0/59-validation.json)에서 정확한 Linux arm64
GStreamer1.28.7 core/parser/mux 조합을 별도 profile로 검증·독립 승인했다. 파일 증거·별도
readback·seek·작은 영상 검색과 Linux A/저장/transport/decoder 단기 검사가 통과했다.
호스트 정식 acceptance는1회 실행했으나 문서 UI 자산 manifest의4.4.0 기준과 제품4.5.0의
불일치로 중단했다. 해당 자산의 현행성·시각 검토 근거 정합 후 새 실행이 필요하며,
일반30분·전체/보완UI·일반120분은 미실행이다. 녹화·검색·A 혼합120분은 별도 승인 잔여다.

[60 문서 자산 재사용·정식 실행](release-artifacts/v4.5.0/60-validation.json)에서는 관리 이미지20개의
과거 촬영/검토 기록을 유지하고 현재 사용 대상을4.5.0으로 정합화했다. 새 acceptance1회에서
기능 gate48개·일반30분·canonical UI424개 실행은 통과했으나, A HTTP/UI 검사의12개 산출물이
허용 output root 밖에 생겨 source patch 결속과 전체 UI 적격성이 실패했다. 제품 소스는 불변이다.
출력 경로 충돌의 제한 수정과 새 실행 승인이 필요하며, 일반120분·필수 보완UI는 미실행이다.

[61 출력 전달·정식 실행](release-artifacts/v4.5.0/61-validation.json)에서 두 HTTP/UI 검사의
PNG·JSON·checkpoint를 부모 run 아래로 결속하고, 일반30분 전 소스 지문 확인을 추가했다.
직접 반례·실제 하위 실행·독립 변경분 검토와 producer/readback을 마친 후보의 새 acceptance1회는
기능 gate48개·일반30분·canonical424개/Policy v4 적격성·일반120분·최종 무결성을 통과했다.
녹화31·구조화 검색38·장면 검색/증거23 action과 A/409/자료 안내의 실제 보완 실행은 별도 보존한다.
다만 증거 UI 오류/clip 상태 전수와 보완 실행 전체의 적격성 결속은 미완료다. 최초 시간 fixture
준비 오류와 수정 후 결과, 역사 default contract의 문서 부재 오류도 유지한다. 전체 출시 검증
완료가 아니며, 구체적 보완 범위는 61의 `remainingQualification`을 따른다.

[62 원격 보존 복구·보완 UI](release-artifacts/v4.5.0/62-validation.json)에서 기존7개 커밋의
일반 푸시와 원격 증거 객체 확인을 마쳤으며, 61의 정식 acceptance는 재실행 없이 유지한다.
녹화/구조화 검색의 기존 근거를 독립 검토하고, 증거/clip22 action·A285·자료 안내197 검사를
추가 실행했다. 모델409/이력 보완 실행은 서버 시작 전 `K09 absent track package` 준비 실패로
중단했으며 원인은 미확정이다. 만료/비활성 안내와 일부 dark clip의 시각 근거도 미완료이므로
전체 보완 UI 적격성 승인은 보류한다. 최초 실패·진단의 비재현·독립 판단을 별도로 보존한다.

[63 필수 보완 UI 마감](release-artifacts/v4.5.0/63-validation.json)에서 원래 연속 seed 준비와
모델409/이력 HTTP·UI를 통과하고, 만료/비활성 안내·dark clip 및 부족했던 장면 검색 근거를
보완했다. 기존 유효 근거와 새 실행·시각·정보 비노출 근거의 독립 적격성 검토에서 필수 보류가
해소됐다. 62 seed 실패 원인은 여전히 미확정이며 새 성공으로 과거 실패를 변경하지 않는다.
61 acceptance는 실제 실행 소스 기준으로 유지하고 재실행하지 않았다. 제품 계약은 불변이며
혼합 전용120분·기록 정리·공개 절차는 별도 잔여다.

v4.4.0 변경120분 source 이후 catalog의 관측 출처 저장과 snapshot 잠금·A 저장/취소 수명이
추가돼 녹화/검색/A 혼합의 전용120분 영향 검증이 필요하다. [64 단회 실행](release-artifacts/v4.5.0/64-validation.json)은
약29분의 동시 진행과 A29건 완료 뒤 새 A 증거 패키지 생성의 `503 evidence-create-failed`로 중단됐다.
내부 원인은 미확정이며120분·취소/복구·재시작·재활성화는 미충족이다. 최초 실패와 부분 실행을
보존하고 자동 재실행하지 않는다. 실패 원인 판단과 후속 실행 승인이 필요하며 일반120분으로 대체하지 않는다.

[65 과도한 무효화 수정](release-artifacts/v4.5.0/65-validation.json)은 실제 무관한 녹화 확정/삭제로
A 증거 생성이 거부되는 결함을 결정적으로 재현하고, 선택 자료의 유한 사본 재검증과 원자 게시로
수정했다. 직접 반례·독립 재조회·짧은 녹화/검색/A 통합과 독립 변경분 검토가 통과했다.
64 당시 내부 원인은 여전히 미확정이며, 수정 소스의 새 혼합120분·자원 안정성은 미실행이다.
59 Linux·61 acceptance·63 UI는 각각 당시 소스/환경의 근거로 유지한다.

이 목록은 현재 잔여와 완료 조건이며 모델 평가·제품 구현·장시간·외부 공개의 실행 승인을
새로 부여하지 않는다. ClaimSpec 자유질문 해석·C 영상 사실/시퀀스 검토와 공개 연결은
**버전 미배정·미완료**다. 설계48의 계약과49~51의 품질/진단 이력을 보존하고
[재편입 조건](v410-v49-recording-search-roadmap.md#버전-미배정-모델-기능과-재편입-조건)을 따른다.
검색용 QueryPlan(v4.7)과 다른 기능이며 v4.6 관계 계산·v4.8 대화 UI의 필수 선행 조건이 아니다.
v4.6~v4.9의 잔여·추가 결정은 [요구 배치 대조](v410-v49-recording-search-roadmap.md#기존-요구의-배치-대조)에
두며 이 backlog에서 별도 구현 목록을 중복 관리하지 않는다. 종료된 모델 실험을 재개하지 않는다.

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
| 제품화 후보 | Incident OS primary nav 승격, Evidence default-on, 로컬 Action Execution, 영구 credential store, tracker 기본 선택은 버전·범위 재승인 전 미배정 후보다. 불변 증거 기반 VA Review는 v4.5.0 부분 구현 상태이며, 완료된 A 경로와 미완료 모델 기능·릴리즈 조건은 위 잔여 항목을 따른다. 외부 공급자는 제외됐다. 과거의 “v4.1.0에서 구현” 문구는 현행 일정이 아니다. |
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
