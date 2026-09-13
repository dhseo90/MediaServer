# S10 3C-5.3a 내구 job 실행 기록

독자: 개발·검토 담당자. lifecycle: 이번 내구 계약/보호·예약 단위의 증거. 정책은 AGENTS, 중앙 실행 기록은 release-test-records다. 5.3a 구현·승인 단기 검증을 마쳐 메인에게 인계하며 Ready/실제 파일/게시·5.3b/3D/S11 완료 증거가 아니다.

최종 유효 assertion은 focused23 + catalog246 + retention56 + V2 retention24 =349개 모두 PASS다. [개별 349행과 cleanup20행](results.md), [source/run SHA-256](fingerprints.log), [전수 hash 확인](fingerprint-check.log), [환경](environment.log)을 보존한다. build·docs-links·diffcheck는 assertion 수와 별개다.

## 범위와 구현 경계

- `recording_derived_job.h/.cpp`: 4MiB 상한의 엄격 내부 Intent/Record JSON, compact 선택 source-index, 논리 job ID·attempt1·출력 ID/소유 상대경로 계획. evidence 입력 256개와 실제 참조 source table 8개를 구분하며 무관 원본은 ID에 포함하지 않는다. source/output 목록은 동일 store/channel의 기존 영속 `order_sequence` 정순이다.
- `RecordingCatalog`: 기존 소유 journal에 단일 Intent mutation을 append하여 요청/선택/source binding·보호·양수 예약을 함께 가시화한다. 기존 SQLite projection/rebuild/checkpoint에 job을 포함한다. active job의 보호/예약은 job record에서 파생하며 generic hold/pin과 별개다. append 불확실 후 공통 쓰기 guard가 fail-closed한다.
- `RetentionCoordinator`: catalog-backed 인스턴스는 생성 시 단일 소유자로 결박하며 정확한 소유자 소멸 때만 해제한다. 후발 인스턴스는 일반/파생 admission·삭제 snapshot을 사용할 수 없다. mock StorePort는 기존 독립 계약을 유지한다. lock 방향은 admission→catalog이며 catalog가 retention을 역호출하지 않는다.
- 같은 reference/selection을 이후 `created_at_ms`로 다시 Build해도 job ID는 같고, admission은 최초 intent 시각을 유지하여 멱등 조회한다. 동일 ID의 예약량·경로·선택 충돌은 거부한다. terminal Failed 재요청은 새 attempt를 만들지 않는다.
- event quota는 같은 채널의 기존 메모리 event 예약 전체와 durable 예약 전체를 함께 계산한다. disk reserve는 continuous/event/derived 모두의 outstanding을 포함한다. 진행 bytes를 영속화하지 않는 durable job은 전체 예약을 보수적으로 유지한다.

5.3a는 Intent와 caller cleanup 완료 후 Failed만 구현한다. Ready/Committed/Complete payload와 실제 파일·inode 소유 증명·no-replace publish·소유 파일 복구·출력 독립 시간축은 5.3b에 남아 있다. 이번 fixture의 source 파일은 12byte 내부 catalog metadata fixture이며 실제 재생 가능한 입력이나 remux를 증명하지 않는다. cleanup API의 caller 진술을 실제 inode 검증 완료로 승격하지 않는다.

기존 direct catalog/retention runner20개에는 `recording_derived_job.cpp` 링크 입력만 추가했다. 신규 runner와 합쳐21개 입력의 누락이 없는지 직접 대조했으며 실행한 것은 아래 승인 focused·catalog/retention 영향 회귀뿐이다. 모든 변경 source/run 입력은 fingerprint 목록에 포함한다. 기존 writer·공개 Event/SSE/WS/schema·기본 서버 구성은 변경하지 않았다.

## 실행 이력

| 명령/원출력 | exit | 실제 결과 | 구분 |
| --- | --- | --- | --- |
| focused / ContractRed.log | 1 | J01 0/1 | 미구현 계약의 예상 RED |
| focused / ContractGreen.log | 0 | J01 1/0 | 초기 계약 GREEN |
| focused / IntentRed.log | 2 | channel 부모 디렉터리 준비 누락 | setup 실패, RED 아님 |
| focused / ContractBoundaryRed.log | 1 | J01 PASS, J17/J18 FAIL | 무관 source와 wall 역행 예상 RED |
| focused / BoundaryGreenIntentRed.log | 2 | J01/J17/J18 PASS 후 managed 기존 데이터 준비 순서 오류 | setup 실패, Intent RED 아님 |
| focused / IntentExpectedRed.log | 1 | 실제 PASS3/FAIL1(J04) | 예상 RED; 당시 summary 1/1은 fixture 집계 오류로 실제 개별 행과 다름 |
| focused / IntentGreen.log | 0 | 4/0 | Intent 원장 연결 GREEN |
| focused / OwnerRed.log | 1 | 4/1(J19) | 후발 coordinator 예상 RED |
| focused / OwnerGreen.log | 0 | 5/0 | 단일 소유 GREEN |
| focused / GuardRed.log | 2 | 잘못된 삭제 사유 continuous-quota | setup 실패, RED 아님 |
| focused / GuardExpectedRed.log | 1 | 4/2(J04/J20) | J04는 확장 fixture의 V1 필드 참조 오류, J20은 예상 RED |
| focused / GuardIsolatedRed.log | 1 | 5/1(J20) | V2 Id() oracle 정정 후 공통 guard 예상 RED |
| focused / ExtendedRed.log | 1 | 22/1(J16 order) | 원장/자원 확장 묶음, UUID 역순 출력계획 예상 RED |
| focused / ExtendedGreen.log | 0 | 23/0 | 영속 order 순서 포함 확장 GREEN |
| ./server.sh build / Build.log | 0 | media_server target 완료 | 빌드; assertion 수와 별개 |
| bash scripts/internal/verify_v410_recording_catalog.sh / CatalogRegression.log | 0 | catalog 234/0 및 crypto-off·정적 연결 개별 PASS | 직접 영향 회귀 |
| bash scripts/internal/verify_v410_recording_retention.sh / RetentionRegression.log | 0 | 56/0 | 직접 영향 회귀 |
| bash scripts/internal/verify_recording_retention_v2.sh / RetentionV2Regression.log | 1 | 21/1(B14) | 기존 fixture가 B13 coordinator를 생존시킨 채 B14 후발 coordinator를 생성; 새 단일 소유 계약으로 거부 |
| 같은 V2 회귀 / RetentionV2Verified.log | 1 | undeclared coordinator/untouched 3 compile 오류 | 메인 승인 B13 scope 종료 후 B18의 기존 변수 재사용을 놓친 fixture 오류, 제품 RED 아님 |
| 같은 V2 회귀 / RetentionV2Final.log | 0 | 실제 media22/0 + GStreamer-off2/0 | B13 scope 종료·B18 현재 owner 재사용으로 수명 보정, assertion 유지 |
| focused / FinalFocused.log | 0 | 23/0 | 최종 계약 소스 고정·가독성 정리 후 확인 |
| 메인 ./server.sh verify-docs-links | 0 | markdown244/local2663/images22/anchors110/indexed76/exclusions158/failures0 | results.md 추가 후 최종 실행; 제품 assertion349개와 별개 |
| 메인 git diff --check | 0 | whitespace 오류 없음 | 별도 정적 확인 |

focused 명령은 모두 `bash scripts/internal/verify_recording_derived_jobs.sh`다. 원출력은 위 파일에 직접 redirect했으며 도구 응답 복사본이 아니다. 모든 실행 소유 root는 각 로그의 cleanup 행에 bytes와 removed=true를 보존했다. 서버·port·외부 입력·비밀은 사용하지 않았다. V2 retention 회귀는 기존 짧은 자체 생성 영상 fixture를 사용했으며 파생 job 영상 생성은 아니다.

## 미실행과 계측

| 항목 | 상태 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- |
| 5.3b Ready/파일 생성/게시/중단 복구 | 미실행·이번 범위 밖 | Intent/Failed 계약 검사가 실제 파일 소유·게시를 대신하지 않음 |
| 30분/UI | 미실행·미승인 | S11 최종 cut의 필수 evidence를 이번 focused로 대체하지 않음 |
| 120분 | 조건부 진행; S11 최종 cut에서 영향 범위 대조, 이번 실행 미승인 | 미실행 |
| token start/end/consumed | 미집계 | 이 담당자 실행에는 실제 토큰 계측 source가 제공되지 않음 |
| elapsed | focused와 V2 회귀는 각 로그의 bash-SECONDS | build/catalog/기존 retention runner는 별도 elapsed를 출력하지 않아 미집계 |
| commit/push | 미수행 | 메인 검토·커밋 담당, 담당자 직접 수행 금지 |
