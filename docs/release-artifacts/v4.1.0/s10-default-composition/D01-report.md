# S10 3D-2 D01 숫자 참조 검증

독자: 구현·검토 담당자. lifecycle: 이번 격리 단기 실행·실패 이력 보존. 정책은 AGENTS, 개별 정의/결과 source-of-truth는 중앙 release-test-records다. D02 구성·D03 이후 공개 조회/UI의 완료 증거가 아니다.

## 변경 경계

`ValidateRecordingReferenceId`는 기존 opaque의 길이 128·문자·경로 제약을 유지하고 숫자-only 참조를 허용한다. `ValidateOpaqueId`는 그 공통 검증 뒤 숫자-only를 계속 거부한다. source/channel 원문은 재명명·정수 변환하지 않으며 `007`이 그대로 보존된다. 제품 `source_view_registry.cpp`의 `IsNumericRegistryId` 사용과 대조했다.

| 적용부 | 실제 변경 |
| --- | --- |
| recording_contracts.h/.cpp | 새 helper, V2 segment/source binding/consumer reference source·channel 검증. 생성 ID는 기존 opaque 유지 |
| recording_journal.cpp | order parser/예약의 channel만 참조 helper 사용 |
| recording_catalog.cpp | original sample·location snapshot·referenced observation·consumer 목록의 source/channel 검사 |
| recording_read_service.cpp | media/UTC range·location channel 입력 검사 |
| 신규 focused/runner | 실제 자체 H264→managed writer→binding/segment→consumer→재개방, 숫자/경계/생성 ID 위조 검사 |
| 보존한 계약 | V1 내부 ValidateReferenceId(길이256/path-only), 기존 observation/locator 저장 parser의 문자 허용 범위는 강화하지 않음. 생성 opaque ID·공개 DTO/route·application 구성 무변경 |

## 실행 이력

| 제목 | 명령/관측 | 결과 |
| --- | --- | --- |
| 최초 준비 오류 | `bash scripts/internal/verify_recording_numeric_reference.sh`, exit 1. 공유 fixture Shift 미사용 `-Werror`; PTS shift를 실제 입력에 적용 | fail |
| 관리 root 준비 오류 | 같은 명령 exit 134. 실행 바이너리와 managed root를 함께 사용해 기존 nonempty root 거부. store 전용 하위 디렉터리로 fixture 수정; 제품 안전 guard 유지 | fail |
| 예상 RED | 같은 명령 exit 1, 3 pass/6 fail. D01-01/04/06/07/08/09 숫자 opaque 거부와 사전 지정 일치 | fail |
| 첫 GREEN | 같은 명령 exit 0, 9 pass/0 fail | pass |
| 최종 focused | 같은 명령 exit 0, 11 pass/0 fail. D01-10/11 기존 길이·문자·생성 ID 제약 추가 확인 | pass |
| 제품 build | `./server.sh build`, exit 0 | pass |

원출력은 각각 `D01-Red.log`, `D01-ExpectedRed.log`, `D01-ExpectedRedFixed.log`, `D01-Green.log`, `D01-FinalFocused.log`, `D01-Build.log`다. 준비 오류를 예상 RED로 소급하지 않았다. exit134의 PID 9596에 대응하는 `/cores/core.9596`은 부재였으며 공유 시스템 crash 자료를 삭제하지 않았다. 소유 runner root는 실패를 포함해 삭제·부재 확인했다.

## 제한·인계

최종 유효 **361 pass / 0 fail**의 개별 행과 historical 결과·정리는 [전수 결과](D01-results.md)에 보존했다. [제품/fixture 7개 fingerprint](D01-fingerprints.log)는 이 D01 checkpoint의 코드이며 이후 D02 변경의 해시가 아니다.

| 명령 | exit / 개별 결과 | 원출력 |
| --- | --- | --- |
| `bash scripts/internal/verify_recording_numeric_reference.sh` | 0 / 11 pass | D01-FinalFocused.log |
| `bash scripts/internal/verify_recording_identity.sh` | 0 / 23 pass | D01-Identity.log |
| `bash scripts/internal/verify_recording_consumer_reference.sh` | 0 / 19 pass | D01-Reference.log |
| `bash scripts/internal/verify_recording_consumer_connection.sh` | 0 / 22 pass | D01-Connection.log |
| `bash scripts/internal/verify_recording_range_resolution.sh` | 0 / 16 pass | D01-Range.log |
| 새 `mktemp -d /private/tmp/media-server-d01-catalog.XXXXXX`를 `MEDIA_SERVER_VERIFY_V410_RECORDING_CATALOG_BUILD_DIR`로 전달한 `bash scripts/internal/verify_v410_recording_catalog.sh` | 0 / 246 pass | D01-Catalog.log |
| `bash scripts/internal/verify_recording_retention_v2.sh` | 0 / 24 pass | D01-Retention.log |

D01-08은 실제 위치가 있다는 주장이 아니라 숫자 channel 입력을 허용한다는 검사다. 0..1 범위에 영상을 추정하지 않는다. 테스트별 삭제 전 크기·정리 결과는 전수표에 보존한다.

- 실제 미디어 검사는 격리 fixture이며 운영/외부 입력·서버/port를 사용하지 않는다. 원출력/해시/전수표만 보존하고 실제 미디어는 정리한다.
- D01만 수행한다. D02 application 구성/수명, 공개 조회/UI, 장시간·S11은 완료로 주장하지 않는다. 120분은 S11 최종 cut 영향 대조의 조건부 진행이며 이번 실행 미승인이다.
- token start/end/consumed는 하위 작업별 계측 도구 부재로 미집계다. elapsed는 각 지원 runner의 bash SECONDS 원출력을 사용하고 출력 없는 기존 runner는 미집계다.
- 커밋·푸시는 메인이 수행하며 담당자는 실행하지 않는다.
