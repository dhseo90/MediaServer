# 버전 정책

소스 버전, 공개 목표, 기록된 GitHub Release와 미래 계획을 구분하는 기준이다.
실제 검증·승인·기록 보존·태그·공개 절차는 [릴리즈 정책](release-policy.md)에 둔다.

## 버전과 공개 상태

| 구분 | 기준 | 뜻하지 않는 것 |
| --- | --- | --- |
| 소스 버전 | [VERSION](../VERSION), [CMakeLists.txt](../CMakeLists.txt)의 `project(... VERSION ...)` | 같은 버전의 원격 tag/Release가 이미 존재한다는 보장 |
| 공개 목표 | 릴리즈 정책의 `release-metadata` 블록 안 `releaseTarget` | tag 생성·서명·push·GitHub Release 완료 |
| 기록된 공개 관측 | 같은 블록의 `published.tag`, `published.url`, `published.observedAt` | 현재 GitHub Latest를 방금 조회한 결과 |
| 이전 공개 기준 | `priorPublishedTag` | 현재 소스의 기능·검증 결과 |
| 계획 | [녹화·검색 로드맵](v410-v49-recording-search-roadmap.md), [backlog](development-backlog.md) | 구현·선택·실행 완료 |

기계 판정 값은 [릴리즈 정책의 단일 metadata 블록](release-policy.md#소스와-기록된-공개-상태)에 둔다.
`VERSION`과 CMake 값은 같아야 하며 `releaseTarget`은 소스 버전 앞에 `v`를 붙인 값이다.
기록된 공개 관측과 목표가 같아도 로컬 문서 검사가 현재 원격 확인을 수행한 것은 아니다.
문서 정리, 브랜치 이름, 로드맵 제목만으로 버전이나 `observedAt`을 변경하지 않는다.

현재 소스는 상시·이벤트 녹화, 보존, 조회/재생과 구조화 녹화 검색을 포함한다.
정확한 범위·제약은 [녹화 설정과 API](config-reference.md#recording-env),
[사용자 흐름](ui-guide.md), 해당 [릴리즈 노트](release-notes-v4.2.0.md)를 따른다.
`source-only`는 배포 형태이며 녹화 미구현이나 live-only라는 뜻이 아니다.

## 버전 번호의 의미

`MAJOR.MINOR.PATCH`를 사용한다. 변경의 호환성과 사용자 이관 필요성을 먼저 판단하며,
번호를 정했다는 이유로 제품 계약 변경이나 후속 개발을 승인한 것으로 보지 않는다.

| 구분 | 적용 기준 |
| --- | --- |
| `PATCH` | 문서·테스트·버그 수정·UI 문구·guardrail 보강 등 공개 API/설정 호환성을 깨지 않는 변경 |
| `MINOR` | 기존 호환성을 유지하는 source type·rule·UI·운영 기능 추가 |
| `MAJOR` | route/API/config/schema, registry/storage, Auth/Scope, evidence 저장 형식 등 사용자 migration이 필요한 변경 |

호환성을 바꿀 때는 영향을 받는 기존 소비자·설정·저장 자료와 복구/이관 방안을 설계하고
명시 승인을 먼저 받는다. 과거 major의 정책 정리나 승인된 예외를 현재 변경의 자동 승인으로 쓰지 않는다.
Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC 경로·worker 수명, 녹화 형식·순서·보호,
Rule/Profile payload와 Auth/Role/Scope 등 [제품 불변 계약](../AGENTS.md#3-제품-불변-계약)은
버전 번호와 별개로 유지한다.

## 기능·배포·계획의 경계

- 기본 공개는 Apache-2.0 소스·문서다. binary/app/container/offline 및 runtime/model 포함
  배포는 [배포 정책](distribution-policy.md)의 별도 승인·RC·라이선스/출처 검토 대상이다.
  고객/현장 영상·운영 evidence·auth store·로그를 배포물에 넣지 않는다.
- 현재 제한된 녹화·재생 지원을 완성된 VMS/NVR, 무제한 장기 보관, ONVIF Profile G
  recording/replay 또는 미구현 자연어 영상 검색으로 확대 설명하지 않는다.
  후속 검색·저장 기능은 로드맵의 구현/잔여 상태를 구분한다.
- VLM default-on, 실제 provider 성공, 모델/runtime binary 배포나 embedding provider의
  기본 의존성 채택은 버전 상승에 따라 자동 적용되지 않는다.
  [VLM opt-in 계약](vlm-runtime-opt-in-contract.md)과 [개인정보 경계](vlm-privacy-transfer-guard.md)를 따른다.
- Re-ID/tracker default-on이나 OC-SORT/BoT-SORT/DeepSORT runtime 승격은 버전명으로
  정하지 않는다. [분석 설정](config-reference.md)과 [분석 계약](video-analysis.md)의 실제
  선택·fallback·제외·라이선스/출처·운영 제한을 확인한다.
- ONVIF 실장비·외부 TURN/WHEP·cloud provider 성공은 별도 조건과 실제 실행 증거가 필요하다.
  fixture/준비 검사나 릴리즈 tag만으로 실장비·외부 성공을 보장하지 않는다.

## 버전 변경과 공개

1. 승인된 변경 범위와 호환성에 맞춰 번호를 결정한다. `VERSION`, CMake, 릴리즈 metadata와
   공개 진입점·노트의 연결을 함께 갱신한다. 실제 공개 관측 값은 관측 근거 없이 갱신하지 않는다.
2. `./server.sh verify-release-metadata`로 로컬 일관성을 확인한다. 이 명령은 제품 검증·
   실제 UI·30분/120분·CI·공개 실행을 대신하지 않는다. 검사와 기록 정리는 릴리즈 정책을 따른다.
3. `vMAJOR.MINOR.PATCH` tag는 검증·보존/정리를 마친 최종 main 커밋에 signed annotated
   형식으로 만든다. 개별 생성/push 승인을 확인하고 로컬 서명·원격 대상 hash·GitHub Verified 및
   API `verified=true`/`reason=valid`를 확인한다. unsigned/lightweight/UI 자동 태그는 사용하지 않는다.
4. 승인된 GitHub Release 공개 후 `verify-release-metadata --published`로 실제 상태를 확인한다.
   목표 번호만으로 공개 완료라 하지 않으며 tag/Release/branch 삭제·rollback은 별도 승인 대상이다.

이미 공개한 tag를 문서·증거 정리 때문에 옮기지 않는다. 후속 유지보수는 별도 커밋으로 하고
필요한 다음 버전은 별도 승인 아래 정한다. 과거 관측·PASS/FAIL·모델·source provenance는 변경하지 않는다.
원본이 보존된 과거 2.x 전환 정책과 3.x/4.x 버전별 상세 범위는
[릴리즈 정책의 작은 이력 색인](release-policy.md#릴리즈-노트와-이전-기록)에서 조회한다.
종료된 단계별 완료 목록을 현행 버전 계약이나 새로운 실행 결과로 복사하지 않는다.
