# S10 3D-3 A 실제 미디어 제공

독자: 구현·검토 담당자. lifecycle: 승인된 A 단위의 격리 개발·검증 기록. 정책은 AGENTS, 개별 정의/결과 source-of-truth는 중앙 release-test-records다. B timeline·C UI·D 전체 관련 검증 완료 문서가 아니다.

## 결과·구현

최종 focused46 + retention24 + 실제 derived service43 = **113 pass / 0 fail**. [전수 결과](A-results.md)에 현재113행·historical104행·소유 임시 root7개 삭제/부재를 보존했다. 제품 build와 diffcheck exit0. 브라우저는 사용자 명시 제외이며 실제 재생 PASS로 확대하지 않는다.

| 파일·함수 | 실제 변경과 불변 계약 |
| --- | --- |
| recording_catalog.h/.cpp — MediaV2EligibleLocked | 같은 catalog 잠금에서 현재 finalized V2·V1/legacy link 충돌을 대조. Event는 유일한 job output, Complete, ready verified, canonical persisted segment와 최종 경로를 확인 |
| 같은 파일 — AcquireMediaV2, ValidateMediaV2 | 검증된 snapshot+경로와 hold 획득을 같은 mu에서 처리. 기존 AdjustHoldCount SQL/상한 코드를 Locked helper로 재사용. 검사 뒤 현재 상태·metadata/경로 재대조 |
| recording_read_service.cpp — ResolveMedia | V2 Continuous와 승인된 Event 모두 catalog 획득→safe open→기존 실제 physical/hash 검사→현재 snapshot 재확인. MIME도 획득 snapshot 사용. 실패/성공 소멸 시 fd close 후 RAII hold 반환 |
| recording_application_service.cpp — Media | V2 channel 조회 뒤 authorizer, 이후에만 reader 호출. V1/V2 충돌은 거부, 기존 V1/fallback 경로 유지 |
| recording_public_media_smoke.cpp / verify_recording_public_media.sh | 자체 H264→managed writer→실제 DerivedJobService의 정상/partial2출력과 권한·hold·삭제·변조·미결박 검사. HTTP 서버 없이 실제 application Media 함수 사용 |

Event 검증은 엄격 `SerializeDerivedJobRecord`를 재사용하여 source_index, intent/selection, manifest, source/출력 provenance와 AU 결박을 확인한다. 저장된 source 값이 근거이며 현재 원본 파일/현재 원본 segment 생존을 재생 선수조건으로 추가하지 않았다. 실제 원본 tombstone 이후 출력 제공을 확인했다. Ready/Committed, orphan/manual Event, wrong channel/권한 거부, 손상 파일은 허용하지 않는다. 요청 partial이어도 검증된 출력별 제공은 허용하며 fullySatisfied를 변경하지 않는다.

등록된 registry/accepted schema, 공개 Event POST/SSE/WS, auth 정책, streaming/codec 경로는 변경하지 않았다. 조회 응답/UI 계약은 B/C로 남긴다. 실제 파일 제공은 hold와 검사 시점의 검증이며 이후 비협력 외부 프로세스가 같은 inode를 변경하는 것을 영구 방지한다는 주장이 아니다.

## 실제 명령·실패 이력

저장소 root에서 실행하고 각 stdout/stderr를 해당 파일로 직접 redirect했다.

| 명령 | exit / 결과 | 원출력·이력 |
| --- | --- | --- |
| `bash scripts/internal/verify_recording_public_media.sh` 최초 | 1 / 컴파일 준비 오류 | [A-Red.log](A-Red.log). fixture progress callback 이름/시그니처 오류3개. 실제 선언에 맞춰 수정, 예상 RED 아님 |
| 같은 focused, 예상 RED | 1 / 18pass12fail | [A-ExpectedRed.log](A-ExpectedRed.log). 현재 Continuous-only gate에 정상/partial Event 및 application 제공 거부, 종속 hold assertion 실패 |
| 같은 focused, 첫 GREEN | 0 / 30pass | [A-FirstGreen.log](A-FirstGreen.log) |
| 같은 focused, 오류/삭제 확장 | 0 / 44pass | [A-Extended.log](A-Extended.log) |
| 같은 focused, 최종 | 0 / 46pass | [A-FinalFocused.log](A-FinalFocused.log). 같은 크기 내용 변조2개 추가, 실제 TS sync byte·size/type·원본 삭제·hold 확인 |
| `bash scripts/internal/verify_recording_retention_v2.sh` | 0 / 24pass | [A-RetentionRegression.log](A-RetentionRegression.log) |
| `bash scripts/internal/verify_recording_derived_job_service.sh` | 0 / 43pass | [A-ServiceRegression.log](A-ServiceRegression.log). 실제 파일/원장/복구/replay/삭제 직접 영향 |
| `./server.sh build` | 0 | [A-PreparationBuild.log](A-PreparationBuild.log), [A-Build.log](A-Build.log), [A-FinalBuild.log](A-FinalBuild.log), 마지막 [A-FrozenBuild.log](A-FrozenBuild.log) |
| `git diff --check` | 0 | [A-DiffCheck.log](A-DiffCheck.log) |
| 신규 원출력 줄끝 공백 검사 | 0 / 11개 로그 trailing whitespace 0 | [A-LogWhitespace.log](A-LogWhitespace.log), Node로 각 줄 `/[ \t]+$/` 전수 검사. 원출력 수정 없음 |
| `shasum -a 256 -c .../A-fingerprints.log` | 0 / 6개 OK | [fingerprints](A-fingerprints.log), [대조](A-FingerprintCheck.log) |

retention/service 회귀 이후 수정은 read 응답 MIME을 이미 검사한 current snapshot으로 통일한 부분이며, 해당 read focused46과 build를 다시 실행했다. catalog/service 코드는 그대로라 두 회귀의 유효 증거를 유지했다. 기존 전체5.3b429개·D02 전체를 반복하지 않았다.

## 정리·미실행·인계

- 소유 임시 root7개는 준비 실패 포함 bytes를 보존하고 trap 삭제·현재 부재 확인했다. 실제 media/바이너리/SQLite·JSONL fixture는 제거하고 텍스트 로그·hash·전수표만 증거로 보존했다. 기존 build directory는 재사용 제품 산출물이다.
- macOS 실제 실행. Linux·외부 입력·운영 root·HTTP 서버·브라우저·장시간은 미실행이다. 비밀/계정 데이터는 사용하지 않았다.
- 안정화는 승인된 A focused/build/직접 영향 회귀 진행 대상. 30분은 이번 미승인, 120분은 S11 최종 영향 범위 대조의 조건부 진행이며 이번 미승인. UI는 사용자 명시 제외이며 D08 실제 재생 증거가 아니다.
- token start/end/consumed는 담당자별 실제 계측 도구 부재로 미집계. elapsed는 runner bash SECONDS 원출력(최종 focused2초, retention13초, service26초), build는 별도 시간 미집계다.
- A 단위만 구현·검증했다. B/C/D는 미구현/미완료이며 메인 인계 후 착수한다. 담당자 커밋/푸시 미수행, 메인 최종 검토·승인 범위 커밋/푸시가 별도다.
