# v4.1.0 녹화 저장 표준·오픈소스 검토 기록

## 문서 목적과 적용 원칙

- checkedAt: 2026-09-03
- reviewPolicy: public-standard-and-license-metadata-only
- repositoryPolicy: original-repositories-unchanged
- implementationPolicy: independent-clean-room-reimplementation
- incompatibleOrUnknownLicensePolicy: implementation-reference-excluded

이 문서는 v4.1.0 녹화 저장 계약을 고정하기 전에 공개 표준의 의미, 공식 문서의 동작,
참고 저장소의 revision·license 상태만 확인한 기록이다. 외부 소스 코드는 복사하지 않았고,
새 runtime dependency나 submodule을 추가하지 않았다. 아래 `runtimeDependency: false`는 해당
자료 검토 때문에 새 의존성을 추가하지 않았다는 뜻이며, 프로젝트가 이미 사용하는
GStreamer 자체를 제거한다는 뜻이 아니다.

## sourceId: gstreamer-splitmuxsink

- url: https://gstreamer.freedesktop.org/documentation/multifile/splitmuxsink.html
- revision: GStreamer 1.28 계열 API 참조, 2026-09-03 확인본
- checkedAt: 2026-09-03
- license: LGPL-2.1-or-later 계열 GStreamer Good Plug-ins, 공식 API 문서 참고
- referenceScope: keyframe 경계 분할, GOP 제약, async-finalize와 fragment 수명 의미
- codeCopied: false
- runtimeDependency: false
- submodule: false
- adoptedSemantics: segment는 video keyframe 경계에서 닫고 finalize 중 다음 fragment 기록을 계속할 수 있음
- notAdopted: max-files만으로 전체 retention을 대신하거나 예제 pipeline을 제품 코드로 복사하는 방식
- implementationReference: allowed-public-runtime-semantics-only

공식 문서는 크기·시간 임계점에서 keyframe 경계로 파일을 나누며, 최소 fragment가 1 GOP이고
closed GOP가 개별 재생성에 중요하다고 설명한다. `async-finalize`는 이전 muxer/sink가 파일을
마치는 동안 새 fragment를 계속 기록할 수 있게 한다. v4.1.0은 이 공개 동작 의미만 채택하고,
quota·pin·event 보호는 별도 MediaServer retention coordinator가 소유한다.

## sourceId: onvif-profile-g

- url: https://www.onvif.org/profiles/profile-g/
- revision: ONVIF Profile G 공식 공개 개요, 2026-09-03 확인본
- checkedAt: 2026-09-03
- license: ONVIF 저작권 표준 문서, 소스 코드 라이선스 해당 없음
- referenceScope: recording 구성·요청·제어와 storage/retrieval 의미 체계
- codeCopied: false
- runtimeDependency: false
- submodule: false
- adoptedSemantics: 녹화 원본, 조회, 재생을 서로 다른 논리 책임으로 분리
- notAdopted: Profile G conformance 주장, 장치 제어 API 복제, ONVIF recording service 구현
- implementationReference: allowed-standard-semantics-only

Profile G의 edge storage/retrieval 개념은 catalog와 playback locator의 책임 분리에만 사용한다.
v4.1.0은 ONVIF Profile G 적합성이나 장치 녹화 제어를 제품 범위로 주장하지 않는다.

## sourceId: onvif-profile-m

- url: https://www.onvif.org/profiles/profile-m/
- revision: ONVIF Profile M 공식 공개 개요, 2026-09-03 확인본
- checkedAt: 2026-09-03
- license: ONVIF 저작권 표준 문서, 소스 코드 라이선스 해당 없음
- referenceScope: analytics metadata, object classification, event와 metadata stream의 분리
- codeCopied: false
- runtimeDependency: false
- submodule: false
- adoptedSemantics: 영상과 분석 metadata를 분리하고 object/event provenance를 유지
- notAdopted: 얼굴·번호판 인식, MQTT 전송, Profile M conformance와 외부 장치 설정
- implementationReference: allowed-standard-semantics-only

Profile M은 metadata가 영상 관심 구간 저장·검색에 쓰일 수 있음을 설명한다. v4.1.0은
후속 검색이 소비할 bounded observation과 provenance 의미만 반영하며 새 분석 종류나 외부
프로토콜을 구현하지 않는다.

## sourceId: onvif-analytics

- url: https://www.onvif.org/specs/2206/Analytics.html
- revision: ONVIF Analytics Service Specification 22.06
- checkedAt: 2026-09-03
- license: ONVIF 저작권 표준 문서, 소스 코드 라이선스 해당 없음
- referenceScope: UTC frame association, scene/object/appearance/behaviour metadata 의미
- codeCopied: false
- runtimeDependency: false
- submodule: false
- adoptedSemantics: UTC와 media timebase를 함께 보존해 분석 observation을 정확한 frame에 연결
- notAdopted: XML schema 복제, ONVIF service/WSDL 구현, vendor extension 자동 수용
- implementationReference: allowed-standard-semantics-only

공식 specification은 frame의 필수 `UtcTime`이 video frame과 정확히 매핑돼야 하며 analytics
metadata frame이 video frame과 반드시 1:1은 아니라고 설명한다. 따라서 v4.1.0은 UTC만으로
frame을 추측하지 않고 segment ID, PTS/timebase, frame offset을 함께 보존한다.

## sourceId: sqlite-transactional-storage

- url: https://sqlite.org/lang_transaction.html
- revision: SQLite Transaction 공식 문서, 2026-09-03 확인본
- checkedAt: 2026-09-03
- license: SQLite public domain, 공식 문서 참고
- referenceScope: transaction commit/rollback, 단일 write transaction과 read snapshot 의미
- codeCopied: false
- runtimeDependency: false
- submodule: false
- adoptedSemantics: SQLite catalog write를 transaction으로 묶고 media/journal을 원장으로 재구축 가능하게 유지
- notAdopted: SQLite 파일을 유일한 미디어 원장으로 취급하거나 DB row와 media file 원자성을 가정
- implementationReference: allowed-public-domain-semantics-only

SQLite는 transaction 안에서 read/write가 수행되고 동시에 하나의 write transaction만 허용한다.
v4.1.0은 이 제한을 catalog writer 설계에 반영하되, catalog 손상 시 append-only journal과
finalized segment를 통해 rebuild할 수 있게 한다.

## sourceId: mylocalllm-vatester-vector-search-cpp

- url: https://github.com/dhseo90/MyLocalLLM/tree/VATester-Vector-Search-cpp
- revision: 74587423bbf384be9b9bec05a731311e3ffb13d0
- checkedAt: 2026-09-03
- license: Apache-2.0, GitHub API의 repository/LICENSE metadata로 확인
- referenceScope: v4.3.0 이후 embedding contract·정렬·평가 개념의 향후 검토 경계만 기록
- codeCopied: false
- runtimeDependency: false
- submodule: false
- adoptedSemantics: 현재 v4.1.0에서는 stable recording/frame/observation ID가 후속 index 입력이 된다는 방향만 유지
- notAdopted: source code, build 구성, vector index 구현, 저장 형식, runtime dependency
- implementationReference: excluded-from-v410-implementation

이 저장소는 원본 용도로 그대로 유지한다. MediaServer는 해당 branch를 수정·vendor·submodule
처리하지 않으며 v4.1.0 코드의 구현 근거로 사용하지 않는다.

## sourceId: varulelens

- url: https://github.com/dhseo90/VARuleLens
- revision: e2cd18e8d7dc185b2b6f54e4af931ff86c7b2d42
- checkedAt: 2026-09-03
- license: GitHub repository license metadata 없음, LICENSE endpoint 404
- referenceScope: v4.4.0 이후 evidence package와 sequence review 개념의 향후 제품 요구만 기록
- codeCopied: false
- runtimeDependency: false
- submodule: false
- adoptedSemantics: 현재 v4.1.0에서는 녹화·frame·track·event provenance가 후속 evidence 입력이 된다는 방향만 유지
- notAdopted: source code, prompt, schema, build 구성, 저장 형식, runtime dependency
- implementationReference: excluded-license-unverified

라이선스가 확인되지 않았으므로 구현 참고에서 제외한다. 저장소의 기능명·구현 상세·코드는
v4.1.0 설계 입력으로 사용하지 않고, 사용자가 합의한 상위 제품 목적만 MediaServer 요구로
독립 정의한다.

## sourceId: shared-gpt-conversation

- url: https://chatgpt.com/share/6a982ed2-2dd4-83ee-b78b-07f9f4b34861
- revision: 사용자 제공 공유 URL, 2026-09-03 기준 대화 맥락
- checkedAt: 2026-09-03
- license: 대화 참고 자료, 소스 코드 라이선스 해당 없음
- referenceScope: Recording에서 Search·Evidence·Correlation·Investigation으로 확장하는 제품 방향
- codeCopied: false
- runtimeDependency: false
- submodule: false
- adoptedSemantics: 버전별 기능 경계와 최종 자연어 질의·JSON 응답·녹화 재생 목표
- notAdopted: 대화 속 미검증 구현 상세, 코드, 외부 의존성, 완료 주장
- implementationReference: product-direction-only

공유 대화는 사용자가 승인한 장기 방향을 이해하는 자료이며 실행 가능한 코드나 법적·기술적
근거로 사용하지 않는다.

## v4.1.0 채택 결론

1. 녹화 fragment는 keyframe/GOP 재생 경계를 존중하고 finalize된 뒤 불변으로 다룬다.
2. media file, append-only journal, SQLite query projection의 책임을 분리한다.
3. `FrameLocatorV1`은 UTC, PTS/timebase, segment·frame locator를 함께 보존한다.
4. quota 초과 삭제, event 보호, pin, tombstone은 GStreamer의 `max-files`에 위임하지 않고
   MediaServer 정책으로 독립 구현한다.
5. 두 사용자 참고 저장소와 공유 대화는 원본을 유지하며 v4.1.0 코드·의존성으로 가져오지
   않는다. 라이선스가 확인되지 않은 VARuleLens는 구현 참고에서 명시적으로 제외한다.

이 결론은 공개 동작 의미와 독립 제품 요구를 결합한 설계 입력이다. 외부 구현의 표현이나
코드를 복제했다는 뜻이 아니다.
