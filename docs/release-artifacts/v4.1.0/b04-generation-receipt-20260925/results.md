# B-04 게시 영수증 값 계약

독자: 녹화 저장 구현·검증 담당자. 수명: 형식 전환의 내부 값 계약 구현 증거.
작업 정책은 AGENTS.md, 진행 상태는 중앙 테스트 기록이 기준이다.

## 구현과 한계

`recording_generation_receipt.h/.cpp`에 cutover/checkpoint와 prepared/publish-intent,
root/stage·기존 marker/source·이전/목표 manifest·새 파일별 device/inode/hash를 결박하는
strict canonical JSON codec을 추가했다. 현재 snapshot·빈 active·identity head와 이번 evidence가
생성 목록에 있어야 한다. 원문 전체 크기와 구성 파일별1GiB 상한을 구분하며, 생성 목록에는
64개라는 수명 상한을 추가하지 않았다. parser는 caller byte admission을 먼저 적용한다.

파일 I/O·삭제·게시·복구는 하지 않는다. DTO 값이 통과했다고 실제 파일의 내용·소유권·의미를
검증한 것은 아니다. 게시·재기동은 lease/FD/hash/domain을 다시 검증해야 한다.
기존 manifest codec을 재사용하므로 crypto-off에서는 미지원 거부다.
기존 저장 bytes·API·runtime 기본 선택은 바꾸지 않았다. CMake/명령 dispatch에 연결했다.

## 실행 결과

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 최초 RED | `bash scripts/internal/verify_recording_generation_receipt.sh`, exit1. stub의 정상 직렬화 거부1건 | fail |
| 첫 GREEN | 같은 명령, exit0. crypto-on67/off2, 총69개 | pass |
| 최종 집중 | 같은 명령, exit0. literal/필드 대응·추가 반례 보강 후 crypto-on72/off2, 총74개 | pass |
| 전체 빌드 | `./server.sh build`, exit0. 새 codec 연결 | pass |

최초 FAIL은 사전 지정한 stub RED다. 컴파일/환경/제품 회귀 실패는 없었다.
정적 inventory 검사는 최초17 PASS/1 FAIL(exit1)이다. 원인은 새 앞부분을 추가한 문서
SHA와 기존 manifest SHA의 불일치다. 기준73350277의986개 기능 행을 현재 행과 전수 대조해
동일함을 확인했고, SHA만 갱신한 메모리 사본의 기존 구현/검사 매핑 검증도 통과했다.
기능 항목·승인·source/verifier hash를 바꾸지 않고 inventorySha256 한 필드만 재결박한다.
이 실패는 제품74개 PASS와 구분하여 보존하며 동일 정적 검사를 재실행한다.
재실행은986행/18 PASS/0 FAIL(exit0)다. 문서337파일·13591링크/오류0,
자산10 PASS, diffcheck exit0이며 [정적 원출력](static-artifact-manifest.json)·
[정적 개별 결과](static-individual-results.json.gz)를 보존한다.
69→74개는 테스트 보강이며 같은 입력 실패를 반복 실행한 것이 아니다.
[개별144행](individual-results.json.gz)은 RED와 중간 결과까지 보존하고 최종74개에 중복 합산하지 않는다.
[원출력 명세](artifact-manifest.json), [실행 소스 hash](source-sha256.json)를 함께 보존한다.
최종 집중 시각·환경은 final.log.gz에 있다. token start/end/consumed는 실제 집계 source 부재로 미집계다.
빌드에는 별도 시작/끝 시각이 없어 elapsed를 추정하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | 신규 내부 codec·빌드 연결 | B04-R01~R06, 위 실제 명령 | 이번1~9번 개발 승인 |
| 30분 | 미진행 | 현재 단위는 runtime 미연결, 고정 코드 영향 판정 전 | 원래9번 | 이번 단위 실행 안 함 |
| 120분 | 미진행 | 녹화 최종 필요성은 유지하나 선행 전환 미완료 | 원래9번 | 이번 단위 실행 안 함 |
| UI | 미진행 | UI 없는 내부 값 codec | B04-R01~R06 | 이번 단위 실행 안 함 |

## 정리

실제 서버/포트·운영 계정·외부 자료를 사용하지 않았다. 세 번의 임시 컴파일 디렉터리는
runner가 소유 확인 후 제거하고 메인이 부재를 확인했다. 제품 build 산출물은 유지한다.
원출력 로그는 gzip bytes/hash·소유권 대조 후 제거하며 artifact에서 복구할 수 있다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 원출력 명세의 cleanup 경로3개 | 실행 전용 디렉터리 | 266712/862480/875344 bytes | 소유 확인 후 삭제 | 부재 확인 | artifact-manifest.json |
| 원출력 명세의 source4개 | 로그 | 1029/3239/3432/3451 bytes | gzip 이관 후 삭제 | originalRemoved로 확인 | artifact-manifest.json |
| 이 디렉터리 | 비민감 결과·원출력 | 명세 참조 | 보존 | 재현·실패 이력·재검증 범위 판정 | 중앙 기록 연결 |

marker 교체·manifest 게시·crash 복구·실제 앱/장시간·UI는 아직 이 단위의 결과가 아니다.

## 실제 교체 파일 결박 보완

게시 연결에 앞서 cutover의 `replacementMarker`와 checkpoint의 `predecessorFile`을
추가했다. 값 codec은 각각 필수/금지 조건, 고정 파일명, store별 canonical marker 또는
이전 manifest의 정확한 길이/SHA, root와 같은 device 및 고유 inode를 검사한다.
교체 marker의 inode는 rename 뒤 실제 marker와 같아야 한다. 이 descriptor도 실제 파일을
검증한 권위는 아니며 coordinator가 FD·lease·원본/domain을 다시 대조해야 한다.
이전13필드 영수증은 제품 영속 경로에 연결되지 않았으므로 사용자 저장 자료를 변환하지 않았다.

정적 리뷰에서 기존 `ValidateOpaqueId`가 허용하는 `store:one.part`를 manifest만 거부하는
차이를 발견했다. 정상 값 거부를 사전 등록한 RED로 확인한 뒤 store 문자열의 점/콜론을
수용했다. 구성 파일명·디렉터리·경로 검사는 바꾸지 않았고 점 단독·연속 점·slash·quote는
계속 거부한다. 공개 domain ID 정책이나 runtime 기본 선택은 변경하지 않았다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| R07 최초 RED | receipt focused exit1, 기존72 PASS·새 교체 descriptor 소실1 FAIL | fail |
| R07 GREEN | receipt focused exit0, crypto91/off2 총93 PASS | pass |
| R07 반례 독립성 보완 | predecessor 관계 반례가 hash 오류에 가려지지 않게 fixture를 보완, exit0 총93 PASS | pass |
| R08 최초 RED | receipt focused exit1,98 PASS·기존 점/콜론 store 정상 거부1 FAIL | fail |
| R01~R08 최종 | `bash scripts/internal/verify_recording_generation_receipt.sh`, exit0, crypto99/off2 총101 PASS | pass |
| manifest 영향 회귀 | `bash scripts/internal/verify_recording_generation_manifest.sh`, exit0,16개 그룹·113 assertions | pass |

각 중간 결과와 두 예상 RED는 [보완 원출력](metadata-artifact-manifest.json)과
[개별 결과](metadata-individual-results.json.gz)에 보존한다. 최종 receipt 실행은
2026-09-25T08:52:30Z~08:52:33Z(3초)이며 실제 시작/끝 원문이 우선이다.
manifest 기존 runner는 정확한 시작/끝 시각·임시 경로/크기를 출력하지 않아 미집계로 남긴다.
이를 추정 복원하지 않는다. 두 C++ 단위 모두 crypto-on/off를 실제 컴파일·실행했고
이 단위의 전체 서버 재빌드는 미실행이다. Journal/Catalog 게시 구현이 병행 중이므로
그 소스 고정 뒤 통합 빌드에서 판정한다. 이전 서버 빌드를 이번 변경의 새 PASS로 쓰지 않는다.
token start/end/consumed는 집계 source 부재로 미집계다.

임시 receipt fixture는 원출력에 기록된 소유 경로·삭제 전 크기와 부재를 대조한다.
manifest runner는 소유 전용 경로 정리 성공만 보고하며, 정확 경로/크기 원출력 누락은
위 한계로 남긴다. 실제 서버·포트·계정은 사용하지 않았다. 로그는 hash·gzip byte 일치 확인 뒤
삭제하고 이 디렉터리의 압축 원문에서 복구할 수 있다. 새 파일 형식의 실제 게시·복구는 여전히
미완료이며 이 결과를 그 PASS로 확대하지 않는다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| metadata 명세의 fixture5개 | 전용 임시 빌드 디렉터리 | 각 cleanup.bytes | runner 소유 정리 후 부재 대조 | 모두 부재 | metadata-artifact-manifest.json |
| metadata 명세의 source6개 | 집중/회귀 원출력 | 총21,828 bytes | 소유 inode/hash·압축 byte 일치 뒤 삭제 | 복구 가능한 gzip 보존, 원문 부재 | metadata-artifact-manifest.json |
| metadata-static 명세의 source4개 | 문서/등록/자산 원출력 | 총211,260 bytes | 같은 소유·보존 검증 뒤 삭제 | gzip 보존, 원문 부재 | metadata-static-artifact-manifest.json |

기존986개 기능 행이 HEAD와 동일함을 확인한 뒤 in-memory manifest 전체 검증을 통과했고
`inventorySha256`만 갱신했다. 이후 실제 inventory18 PASS/0 FAIL, 문서338파일/최종13606링크 오류0,
자산10 PASS, diffcheck exit0다. [정적 명세](metadata-static-artifact-manifest.json)와
[개별5091행](metadata-static-individual-results.json.gz)을 보존한다. 이 검사는 실행 매핑 정합이며
현재 제품 UI·장시간 PASS를 뜻하지 않는다. [보완 소스 hash](metadata-source-sha256.json)로
집중 검사 대상을 구분한다.
