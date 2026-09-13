# 5.3b 최종 개별 검증과 정리

독자: 구현·검토 담당자. lifecycle: 이번 실행의 보존 증거. 중앙 release-test-records의 상세 전수표이며 현재 정책을 정의하지 않는다. 원출력의 개별 [pass] 행을 자동 추출했고, 이전 실패·범위가 작은 중간 실행은 보고서와 원출력에 별도 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| F12 실제 remux의 다른 selection 결박 거부 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 66행 |
| F12 실제 remux provenance의 요청 범위 위조 거부 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 67행 |
| F12 실제 remux의 foreign unfulfilled 범위 거부 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 68행 |
| F01 실제 writer→선택→Intent→파생 파일→게시→Complete | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 69행 |
| F01 실제 catalog/file/hash/단일 commit/hold 해제/cleanup 및 직접 decode | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 73행 |
| F15 단일 service·동시 Run·외부 terminal release 거부 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 74행 |
| F16 active source 삭제 거부·동일 사유 비보호 원본 삭제 positive control | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 75행 |
| F02 두 출력 독립 epoch·unknown UTC·실제 AU/visible 출처 보존 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 76행 |
| F12 Complete 출처 전수 canonical roundtrip | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 77행 |
| F12 Ready 포함 Intent 잘못된 상태 거부 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 78행 |
| F12 미지원 필드 엄격 거부 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 79행 |
| F14 Ready JSON 4MiB 명시 상한 거부 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 80행 |
| F12 출력 receipt inode 별칭 거부 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 81행 |
| F03 Intent 생성 전 프로세스 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 83행 |
| F04 receipt 전 실물의 소유권 미확인 보호 유지 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 84행 |
| F05 receipt 이후 Intent 중단 소유물 정리 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 85행 |
| F06 Ready 중단 뒤 재렌더 없이 완료 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 86행 |
| F07 첫 출력 link 중단 쌍 복구 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 87행 |
| F07 두 번째 출력 link 중단 쌍 복구 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 88행 |
| F08 전체 publish 후 commit 전 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 89행 |
| F09 원자 commit 후 cleanup 전 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 90행 |
| F10 첫 temp 삭제 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 91행 |
| F10 두 번째 temp 삭제 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 92행 |
| F10 attempt 디렉터리 삭제 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 93행 |
| F10 job 디렉터리 삭제 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 94행 |
| F10 Complete mutation 직전 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 95행 |
| F10 Failed cleanup attempt 삭제 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 96행 |
| F10 Failed cleanup job 삭제 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 97행 |
| F10 Failed mutation 직전 중단 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 98행 |
| F11 hash 오류 거부·보호/예약 유지 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 99행 |
| F11 missing 오류 거부·보호/예약 유지 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 100행 |
| F11 foreign 오류 거부·보호/예약 유지 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 101행 |
| F11 symlink 오류 거부·보호/예약 유지 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 102행 |
| F11 fifo 오류 거부·보호/예약 유지 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 103행 |
| F11 hardlink 오류 거부·보호/예약 유지 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 104행 |
| F11 parent 오류 거부·보호/예약 유지 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 105행 |
| F14 cancel-before-create 생성 중단·소유 cleanup·예약 해제 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 106행 |
| F14 cancel 생성 중단·소유 cleanup·예약 해제 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 107행 |
| F14 small 생성 중단·소유 cleanup·예약 해제 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 108행 |
| F14 deadline 생성 중단·소유 cleanup·예약 해제 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 109행 |
| F12 SQLite projection·journal fallback job/output 일치 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 110행 |
| F12 SQLite rebuild·checkpoint 재개방 job/output 일치 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 111행 |
| F13 Complete output tombstone 뒤 재생성 없음 | bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ProjectionFirst.log) 112행 |
| F11 anchored root 교체 거부·새 catalog에서 파일/원장 무변경 | MEDIA_SERVER_DERIVED_JOB_GROUP=closing bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ClosingFinalFixed.log) 9행 |
| F16 다른 journal/root/catalog의 Run·Reconcile 무변경 거부 | MEDIA_SERVER_DERIVED_JOB_GROUP=closing bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ClosingFinalFixed.log) 10행 |
| F12 실제 committed 중첩 output의 미예약 order 위조 거부 | MEDIA_SERVER_DERIVED_JOB_GROUP=closing bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ClosingFinalFixed.log) 11행 |
| F15 active snapshot 8개 상한·초과 명시·다음 호출 수렴 | MEDIA_SERVER_DERIVED_JOB_GROUP=closing bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ClosingFinalFixed.log) 12행 |
| F12 journal Ready→Complete 불법 전이 replay 거부 | MEDIA_SERVER_DERIVED_JOB_GROUP=closing bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ClosingFinalFixed.log) 13행 |
| F09 재개 전 source/output holds·정상 삭제사유 거부와 cleanup 후 해제 | MEDIA_SERVER_DERIVED_JOB_GROUP=closing bash scripts/internal/verify_recording_derived_job_service.sh, exit 0 | pass | [원출력](ClosingFinalFixed.log) 14행 |
| J01 실제 선택→compact 내구 job 계약 왕복 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 1행 |
| J17 무관source8개 추가에도 동일선택 jobID 유지 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 3행 |
| J18 cleanup wall시계 역행 허용·순서는상태로검사 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 4행 |
| J04 단일 Intent 원장·보호·예약 원자 가시성 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 5행 |
| J19 후발 coordinator 일반·파생 admission 및 복구 차단 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 6행 |
| J02 이후 시각 재Build ID 유지·선택 변경 새 ID | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 7행 |
| J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 8행 |
| J16 소유 경로·attempt·order 계획 조작 거부 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 9행 |
| J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 10행 |
| J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 11행 |
| J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 12행 |
| J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 13행 |
| J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 19행 |
| J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 20행 |
| J10 checkpoint 전후 job·보호·예약 유지 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 21행 |
| J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 22행 |
| J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 29행 |
| J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 30행 |
| J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 31행 |
| J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 32행 |
| J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 33행 |
| J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 34행 |
| J20 append 거부 후 원장 복원해도 공통 mutation 차단 | bash scripts/internal/verify_recording_derived_jobs.sh, exit 0 | pass | [원출력](JobsRegression.log) 35행 |
| journal open:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 1행 |
| fallback catalog open:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 2행 |
| SQLite off mode 표시 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 3행 |
| segment finalize journal+projection:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 4행 |
| fallback range query | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 5행 |
| event link FK 위반 거부 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 6행 |
| FK 위반 transaction/journal 전체 rollback | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 7행 |
| 최초 durable mutation 1개 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 8행 |
| 동일 mutation 중복 append | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 9행 |
| 손상 사이 정상 durable mutation 보존 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 10행 |
| 중간 corrupt line count | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 11행 |
| 마지막 truncated line skip | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 12행 |
| fallback replay open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 13행 |
| 같은 mutation idempotent replay | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 14행 |
| 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 15행 |
| 중복 replay row/합계 불증가 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 16행 |
| 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 17행 |
| writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 18행 |
| v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 19행 |
| SQLite catalog open/rebuild:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 20행 |
| SQLite primary mode 표시 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 21행 |
| SQLite on/off range query ID·순서 parity | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 22행 |
| journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 23행 |
| journal 없는 손상 media orphan 구분 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 24행 |
| projection failover journal open:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 25행 |
| projection failover catalog open:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 26행 |
| 실제 SQLite INSERT 실패 trigger 설치 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 27행 |
| SQLite 투영 실패 뒤 journal+memory finalize 유지:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 28행 |
| SQLite 투영 실패 즉시 JSONL fallback 전환 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 29행 |
| 재시작 rebuild 전 실패 trigger 제거 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 30행 |
| 투영 실패 직후 in-memory query 정합성 유지 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 31행 |
| projection failover 재시작 journal rebuild:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 32행 |
| 재시작 후 journal에서 누락 SQLite projection 복구 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 33행 |
| 재시작 후 SQLite primary 복귀 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 34행 |
| 재시작 journal rebuild가 실제 SQLite row 복원 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 35행 |
| tombstone journal open:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 36행 |
| tombstone catalog open:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 37행 |
| tombstone 대상 segment finalize:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 38행 |
| tombstone 대상 deletion request:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 39행 |
| tombstone 완료 기록:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 40행 |
| catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 41행 |
| 손상 SQLite 격리 후 journal rebuild:  | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 42행 |
| 손상 SQLite 원본 격리 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 43행 |
| 격리 SQLite 파일 보존 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 44행 |
| 격리 후 journal rebuild 결과 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 45행 |
| S10-3A future-schema journal read open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 46행 |
| S10-3A future-schema unsupported classification | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 47행 |
| S10-3A future-schema catalog open denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 48행 |
| S10-3A future-schema catalog retry denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 49행 |
| S10-3A future-schema journal bytes preserved | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 50행 |
| S10-3A future-schema SQLite bytes preserved | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 51행 |
| S10-3A future-schema writer cleanup untouched | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 52행 |
| S10-3A arbitrary-schema journal read open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 53행 |
| S10-3A arbitrary-schema unsupported classification | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 54행 |
| S10-3A arbitrary-schema catalog open denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 55행 |
| S10-3A arbitrary-schema catalog retry denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 56행 |
| S10-3A arbitrary-schema journal bytes preserved | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 57행 |
| S10-3A arbitrary-schema SQLite bytes preserved | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 58행 |
| S10-3A arbitrary-schema writer cleanup untouched | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 59행 |
| S10-3A empty-schema journal read open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 60행 |
| S10-3A empty-schema unsupported classification | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 61행 |
| S10-3A empty-schema catalog open denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 62행 |
| S10-3A empty-schema catalog retry denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 63행 |
| S10-3A empty-schema journal bytes preserved | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 64행 |
| S10-3A empty-schema SQLite bytes preserved | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 65행 |
| S10-3A empty-schema writer cleanup untouched | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 66행 |
| S10-3A future-type journal read open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 67행 |
| S10-3A future-type unsupported classification | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 68행 |
| S10-3A future-type catalog open denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 69행 |
| S10-3A future-type catalog retry denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 70행 |
| S10-3A future-type journal bytes preserved | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 71행 |
| S10-3A future-type SQLite bytes preserved | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 72행 |
| S10-3A future-type writer cleanup untouched | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 73행 |
| S10-3A malformed journal open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 74행 |
| S10-3A malformed JSON missing fields and wrong types remain corrupt | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 75행 |
| S10-O01 reservation journal open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 76행 |
| S10-O01 first reservation returns four IDs and sequence one | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 77행 |
| S10-O01 versioned reservation payload replays | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 78행 |
| S10-O01 new reservation records actual occurred time | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 79행 |
| S10-O02 identical retry preserves sequence and bytes | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 80행 |
| S10-O03 reopened instance allocates next sequence | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 81행 |
| S10-O03 new process resumes durable sequence | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 82행 |
| S10-O04 different store rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 83행 |
| S10-O04 reused request with different segment rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 84행 |
| S10-O04 reused request with different channel rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 85행 |
| S10-O04 reused segment with different request rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 86행 |
| S10-O04 conflicts preserve original bytes | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 87행 |
| S10-O05/O06 reject and preserve corrupt | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 88행 |
| S10-O05/O06 reject and preserve unsupported-schema | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 89행 |
| S10-O05/O06 reject and preserve unsupported-type | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 90행 |
| S10-O05/O06 reject and preserve tail | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 91행 |
| S10-O05/O06 reject and preserve payload-zero | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 92행 |
| S10-O05/O06 reject and preserve payload-negative | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 93행 |
| S10-O05/O06 reject and preserve payload-fraction | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 94행 |
| S10-O05/O06 reject and preserve payload-overflow | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 95행 |
| S10-O05/O06 reject and preserve duplicate-sequence | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 96행 |
| S10-O05/O06 reject and preserve decreasing-sequence | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 97행 |
| S10-O05/O06 reject and preserve duplicate-request | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 98행 |
| S10-O05/O06 reject and preserve duplicate-segment | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 99행 |
| S10-O05/O06 reject and preserve store-conflict | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 100행 |
| S10-O05/O06 reject and preserve ordinary-before | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 101행 |
| S10-O05/O06 reject and preserve ordinary-after | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 102행 |
| S10-O05/O06 reject and preserve line-cap | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 103행 |
| S10-O05 reservation entity envelope binding rejects mismatch | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 104행 |
| S10-O05 reservation request envelope binding rejects mismatch | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 105행 |
| S10-O01 strict reservation parser accepts versioned literal | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 106행 |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 107행 |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 108행 |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 109행 |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 110행 |
| S10-O06 INT64_MAX identical retry remains valid | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 111행 |
| S10-O06 sequence overflow rejected without write | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 112행 |
| S10-O02 identical durable reservation duplicates remain idempotent | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 113행 |
| S10-O06 sequence gaps remain valid and allocate above maximum | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 114행 |
| S10-O07 four simultaneous processes finish reservations | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 115행 |
| S10-O07 concurrent sequences are unique and complete | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 116행 |
| S10-O07 next sequence follows concurrent reservations | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 117행 |
| S10-O08 ordinary Append cannot reserve orders | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 118행 |
| S10-O08 unopened journal rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 119행 |
| S10-O08 null result rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 120행 |
| S10-O08 invalid opaque ID rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 121행 |
| S10-O08 failed reservation does not expose tentative result | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 122행 |
| S10-O09 unsafe file binding rejected and original preserved inode | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 123행 |
| S10-O09 unsafe file binding rejected and original preserved parent | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 124행 |
| S10-O09 unsafe file binding rejected and original preserved symlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 125행 |
| S10-O09 unsafe file binding rejected and original preserved hardlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 126행 |
| S10-O10 reservation and normal segment coexist in catalog | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 127행 |
| S10-O04 reserve then finalize permits identical retry | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 128행 |
| S10-O10 reservation survives catalog rebuild without changing segment query | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 129행 |
| S10-O04 legacy segment cannot acquire retroactive reservation | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 130행 |
| S10-M06 opened catalog accepts fresh exact reservation V2 finalize | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 131행 |
| S10-M07 V2 find preserves complete metadata | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 132행 |
| S10-M07 identical V2 recovery is idempotent | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 133행 |
| S10-M07 V2 is absent from V1 range query | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 134행 |
| S10-M07 V2 registered path is not orphan | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 135행 |
| S10-M07 SQLite exact V2 JSON and path match | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 136행 |
| S10-M07 JSONL restart preserves V2 exact payload | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 137행 |
| S10-M06 wrong reservation tuple rejected store | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 138행 |
| S10-M06 wrong reservation tuple rejected request | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 139행 |
| S10-M06 wrong reservation tuple rejected segment | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 140행 |
| S10-M06 wrong reservation tuple rejected channel | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 141행 |
| S10-M06 wrong reservation tuple rejected sequence | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 142행 |
| S10-M09 immutable V2 mapping mismatch rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 143행 |
| S10-M09 bad V2 startup retry preserves original state bad-payload | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 144행 |
| S10-M09 bad V2 startup retry preserves original state missing-order | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 145행 |
| S10-M09 bad V2 startup retry preserves original state bad-order | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 146행 |
| S10-M09 bad V2 startup retry preserves original state conflicting-order | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 147행 |
| S10-M09 bad V2 startup retry preserves original state tail | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 148행 |
| S10-M09 bad V2 startup retry preserves original state corrupt | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 149행 |
| S10-M09 bad V2 startup retry preserves original state unsafe-path | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 150행 |
| S10-M09 default off rejects V2 before SQLite changes | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 151행 |
| S10-M09 V2 replay namespace and deletion duplicate | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 152행 |
| S10-M09 V2 replay namespace and deletion deleted | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 153행 |
| S10-M09 V2 replay namespace and deletion v1-before | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 154행 |
| S10-M09 V2 replay namespace and deletion v1-after | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 155행 |
| S10-M09 V2 replay namespace and deletion deleted-before | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 156행 |
| S10-M09 V2 replay namespace and deletion resurrection | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 157행 |
| S10-M09 V2 replay namespace and deletion mutation-collision | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 158행 |
| S10-M09 V2 finalize rejects missing media | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 159행 |
| S10-M09 V2 finalize rejects directory media | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 160행 |
| S10-M09 fresh candidate rejects mapping | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 161행 |
| S10-M09 fresh candidate rejects path | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 162행 |
| S10-M09 fresh candidate rejects tombstone | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 163행 |
| S10-SW01 managed empty root opens with lifetime lease | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 164행 |
| S10-SW02 same process second managed owner denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 165행 |
| S10-SW03 different process owner and inherited use denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 166행 |
| S10-SW12 managed duplicate descriptors are close-on-exec | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 167행 |
| S10-SW05 managed reserve append replay use owned descriptor | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 168행 |
| S10-SW06 raw managed access and legacy default path denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 169행 |
| S10-SW01 managed Reserve rejects different store identity | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 170행 |
| S10-SW10 catalog connection can inspect managed lease | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 171행 |
| S10-SW04 owner destruction releases lease | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 172행 |
| S10-SW01 managed reopen rejects different store identity | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 173행 |
| S10-SW11 managed incomplete tail rejects append without changing bytes | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 174행 |
| S10-SW07 legacy nonempty root preserved without conversion | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 175행 |
| S10-SW08 partial initialization retry validates exact state lease | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 176행 |
| S10-SW08 partial initialization retry validates exact state init | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 177행 |
| S10-SW08 partial initialization retry validates exact state barrier | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 178행 |
| S10-SW08 partial initialization retry validates exact state journal | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 179행 |
| S10-SW08 partial initialization retry validates exact state incomplete | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 180행 |
| S10-SW08 partial initialization retry validates exact state unknown | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 181행 |
| S10-SW09 symlink inode and malformed marker rejected journal | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 182행 |
| S10-SW09 symlink inode and malformed marker rejected marker | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 183행 |
| S10-SW09 symlink inode and malformed marker rejected barrier | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 184행 |
| S10-SW09 symlink inode and malformed marker rejected root-symlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 185행 |
| S10-SB01 second managed catalog is denied | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 186행 |
| S10-SB02 failed catalog cannot mutate journal or holds | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 187행 |
| S10-SB03 attached catalog blocks unowned append but permits reservation | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 188행 |
| S10-SB04 catalog destruction releases attachment | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 189행 |
| S10-SB05 managed catalog rejects unsafe options outside | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 190행 |
| S10-SB05 managed catalog rejects unsafe options dotdot | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 191행 |
| S10-SB05 managed catalog rejects unsafe options media-symlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 192행 |
| S10-SB05 managed catalog rejects unsafe options sqlite-symlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 193행 |
| S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 194행 |
| S10-SB05 managed catalog rejects unsafe options disabled | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 195행 |
| S10-SB06 failed open releases catalog attachment | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 196행 |
| S10-SB07 managed SQLite sidecar rejected -wal symlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 197행 |
| S10-SB07 managed SQLite sidecar rejected -wal hardlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 198행 |
| S10-SB07 managed SQLite sidecar rejected -shm symlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 199행 |
| S10-SB07 managed SQLite sidecar rejected -shm hardlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 200행 |
| S10-SB07 managed SQLite sidecar rejected -journal symlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 201행 |
| S10-SB07 managed SQLite sidecar rejected -journal hardlink | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 202행 |
| S10-SC01 managed repeated event fixture is valid | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 203행 |
| S10-SC02 managed reservations avoid history reads | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 204행 |
| S10-SC03 managed V2 finalize avoids full replay | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 205행 |
| S10-SC04 checkpoint reduces superseded event payload bytes | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 206행 |
| S10-SC05 checkpoint preserves latest event and all record identities | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 207행 |
| S10-SC06 checkpoint is idempotent and preserves V2 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 208행 |
| S10-SC08 receipt preserves retry identity and rejects direct append | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 209행 |
| S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 210행 |
| S10-SC09 managed checkpoint SQL V2 payload and path | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 211행 |
| S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 212행 |
| S10-SC10 checkpoint prefix recovers before writes | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 213행 |
| S10-SC11 checkpoint mismatch preserves bytes and poisons owner | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 214행 |
| S10-SC12 first accepted mutation controls latest event | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 215행 |
| S10-SC16 automatic checkpoint uses accumulated growth | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 216행 |
| S10-SC07 raw checkpoint is rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 217행 |
| S10-SC18 checkpoint syscall failure poisons and reopens write | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 218행 |
| S10-SC21 poison rejects hold mutation write | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 219행 |
| S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 220행 |
| S10-SC21 poison rejects hold mutation file-fsync | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 221행 |
| S10-SC18 checkpoint syscall failure poisons and reopens rename | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 222행 |
| S10-SC21 poison rejects hold mutation rename | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 223행 |
| S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 224행 |
| S10-SC21 poison rejects hold mutation dir-fsync | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 225행 |
| S10-SC17 checkpoint preserves holds observations and deletion | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 226행 |
| S10-SC17 checkpoint SQL hold observation tombstone | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 227행 |
| S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 228행 |
| S10-SC17 checkpoint SQL restart observation tombstone | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 229행 |
| S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 230행 |
| S10-SC19 invalid managed history remains unchanged malformed | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 231행 |
| S10-SC19 invalid managed history remains unchanged unsupported | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 232행 |
| S10-SC19 invalid managed history remains unchanged conflict | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 233행 |
| S10-SC20 raw catalog rejects receipt before side effects | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 234행 |
| S10-SC13 crypto off raw remains usable | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 236행 |
| S10-SC14 crypto off checkpoint is rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 237행 |
| S10-SC15 crypto off receipt reopen is rejected | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 238행 |
| source 저장 callback reconcile 연결 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 239행 |
| policy revision idempotency | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 240행 |
| 5초 safety reconcile | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 241행 |
| composition root journal 선행 open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 242행 |
| composition root catalog rebuild/open | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 243행 |
| 서버 전 supervisor 시작 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 244행 |
| ingress 전 event bridge 등록 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 245행 |
| ingress 종료 뒤 recorder finalize | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 246행 |
| composition root 시작/종료 순서 | bash scripts/internal/verify_v410_recording_catalog.sh, exit 0 | pass | [원출력](CatalogRegression.log) 247행 |
| continuous quota는 end_utc_ms, segment_id oldest-first | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 1행 |
| continuous/event quota가 자기 등급 artifact만 선택 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 2행 |
| continuous/event 보존 기간을 독립적으로 적용 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 3행 |
| continuous 보존 기간은 event와 독립적으로 적용 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 4행 |
| event 보존 기간은 continuous와 독립적으로 적용 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 5행 |
| 새 segment 예상 용량까지 continuous quota에 선반영 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 6행 |
| pinned event와 hold_count>0 continuous 자동 삭제 제외 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 7행 |
| disk reserve 부족은 eligible continuous부터 정리 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 8행 |
| journal 실패 시 media unlink와 tombstone 중단 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 9행 |
| unlink 실패는 deletion_pending 유지, 회수 byte 0 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 10행 |
| tombstone journal 실패는 pending으로 남겨 다음 tick 복구 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 11행 |
| channel retention policy 등록:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 12행 |
| 삭제 불가 시 해당 channel writer만 storage-blocked | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 13행 |
| 공간 회복 뒤 새 keyframe용 epoch 재발급 신호 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 14행 |
| 다중 channel reserve policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 15행 |
| 동시 channel admission이 물리 여유 공간을 중복 예약하지 않음 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 16행 |
| segment finalize 후 in-flight reserve 반환으로 다른 channel 재개 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 17행 |
| segment hard bound policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 18행 |
| 최소 packet보다 작은 continuous quota는 쓰기 전에 차단 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 19행 |
| 진행량 정산 policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 20행 |
| 물리 free에 반영된 partial 쓰기량은 예약에서 이중 차감하지 않음 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 21행 |
| 실제 동시 admission policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 22행 |
| 두 실제 thread의 동시 admission 중 하나만 reserve 획득 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 23행 |
| cleanup 미해결 reservation policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 24행 |
| cleanup 미해결 channel 재활성화 policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 25행 |
| 정책 비활성·재활성 뒤에도 미해결 파일 reservation을 유지해 fail-closed | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 26행 |
| stale free-space policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 27행 |
| unlink 뒤에도 filesystem 여유 공간이 부족하면 회수량을 추정해 허용하지 않음 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 28행 |
| 통합 journal open:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 29행 |
| 통합 catalog open:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 30행 |
| 통합 segment finalize:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 31행 |
| tombstone은 남고 media path와 원본 bytes는 제거 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 32행 |
| hold overflow segment finalize:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 33행 |
| hold_count int64 최댓값 저장:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 34행 |
| hold_count int64 오버플로 거부 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 35행 |
| hold race segment finalize:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 36행 |
| hold_count 획득:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 37행 |
| 계획 뒤 획득된 hold도 삭제 transition에서 재검증 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 38행 |
| pending recovery segment finalize:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 39행 |
| pending recovery 삭제 요청:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 40행 |
| pending recovery media 사전 제거 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 41행 |
| unlink 뒤 tombstone 실패 상태를 다음 tick에서 idempotent 재완료 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 42행 |
| pending 복구 격리 policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 43행 |
| 한 channel의 pending 복구 실패가 다른 channel admission/tick을 차단하지 않음 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 44행 |
| 정책이 없거나 비활성인 channel의 pending도 주기적으로 tombstone 완료 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 45행 |
| event 압력 독립 policy 등록 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 46행 |
| event 예상 회수량을 제외하고 continuous만으로 reserve와 admission 처리 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 47행 |
| malicious journal open:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 48행 |
| malicious mutation append:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 49행 |
| malicious catalog open:  | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 50행 |
| journal mediaRelpath가 root 밖이면 retention 후보에서 격리 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 51행 |
| unlink 직전 symlink 전환 준비 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 52행 |
| unlink 직전 root 밖 symlink 생성 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 53행 |
| journal 이후 unlink 직전 canonical root containment 재검증 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 54행 |
| dirfd에 결박된 unlink는 검증 뒤 상위 경로 교체에도 외부 파일을 보호 | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 55행 |
| storage root가 비어 있으면 안전 unlink를 fail-closed | bash scripts/internal/verify_v410_recording_retention.sh, exit 0 | pass | [원출력](RetentionRegression.log) 56행 |
| B01 V2 tombstone preserves immutable segment without legacy UTC range | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 1행 |
| B02 V2 state records reject malformed payload entity and duplicate conflicts | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 2행 |
| B03 V2 pending corrupt and deleted overlays never mutate finalized payload | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 3행 |
| B04 V2 invalid transitions and finalize retries cannot resurrect state | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 4행 |
| B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 5행 |
| B06 V2 capacity deletion follows durable order despite reversed UTC | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 6행 |
| B07 mixed legacy and multiple stores use deterministic nonchronological ordering | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 7행 |
| B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 8행 |
| B09 V2 unknown or overflowing age remains capacity eligible | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 9행 |
| B10 V2 class quotas and disk reserve remain separated | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 10행 |
| B11 V2 pin and hold protect deletion and corruption | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 11행 |
| B12 V2 pending and corrupt bytes remain charged but are not automatic victims | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 12행 |
| B13 V2 apply persists pending before unlink and tombstone after unlink | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 13행 |
| B14 V2 interrupted deletion recovers without resurrection | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 14행 |
| B15 V2 corrupt cleanup requires explicit manual reason | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 15행 |
| B16 V2 continuous media with unknown UTC resolves a healthy held fd | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 16행 |
| B17 V2 wrong channel event and fallback collision cannot expose media | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 17행 |
| B18 V2 missing symlink and multiple hardlink media reject without hold leak | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 18행 |
| B19 V2 same size corruption and invalid container reject without hold leak | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 19행 |
| B20 V2 deletion and playback hold races have one safe winner | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 20행 |
| B21 borrowed fd inspection preserves caller ownership and detects file changes | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 21행 |
| B23 legacy store port refuses unsupported V2 deletion | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 22행 |
| B22 V2 playback is unavailable without GStreamer | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 24행 |
| B23 legacy store port refuses unsupported V2 deletion | bash scripts/internal/verify_recording_retention_v2.sh, exit 0 | pass | [원출력](RetentionV2Regression.log) 25행 |
| R14 단발 true→false 취소의 단조 고정 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 1행 |
| D22 실제 분수frame 요청 선택 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 4행 |
| R01 실제 source-AU→TS-AU payload·decode 일치 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 58행 |
| R11 confirmed source 누락은 생성전 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 59행 |
| R03 분수 duration 미충족과 검증성공 분리 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 60행 |
| R08 양수 byte 상한 필수 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 61행 |
| R08 byte 상한 초과 전 중단·partial cleanup | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 62행 |
| R09 미지원 codec 명시 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 63행 |
| R09 ambiguous 자동 선택 금지 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 64행 |
| R11 중복 segment 입력 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 65행 |
| R11 reference source 결박 불일치 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 66행 |
| R11 reference channel 결박 불일치 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 67행 |
| R06 원본·출력 별칭 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 68행 |
| R06 O_APPEND 출력 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 69행 |
| R07 원본 hash 불일치 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 70행 |
| R13 시작 전 취소·쓰기 없음 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 71행 |
| R13 유효 전체시간 상한 필수 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 72행 |
| R10 unknown 요청 보존·partial 출력 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 73행 |
| R06 borrowed FD offset 보존 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 74행 |
| R13 출력 후 취소·partial 소유권 보존 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 75행 |
| R13 1ms 전체 deadline 초과는 검증성공 아님 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 76행 |
| R07 출력 중 원본 변경 재확인 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 77행 |
| R02 B-frame 실제 seek·nonzero 원본축 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 91행 |
| R04 요청 외 keyframe preroll·GOP 의존 범위 분리 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 92행 |
| R12 162×94 visible plane 픽셀 대응 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 93행 |
| R05 인접 same-epoch 실제 source별 독립 출력 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 129행 |
| R06 output끼리 전체 inode 교차 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 130행 |
| R06 다른 source의 원본FD를 출력으로 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 131행 |
| R06 다른 segment의 중복 원본FD 거부 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 132행 |
| R08 모든 출력 합계 byte 상한·부분 실패 목록 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 133행 |
| R05 실제 epoch 변경 원본→독립 출력 목록 | bash scripts/internal/verify_recording_derived_remux.sh, exit 0 | pass | [원출력](RemuxRegression.log) 169행 |

전수 대조: 429행. 원출력별 ProjectionFirst.log=43, ClosingFinalFixed.log=6, JobsRegression.log=23, CatalogRegression.log=246, RetentionRegression.log=56, RetentionV2Regression.log=24, RemuxRegression.log=31.

## 소유 임시물 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.2DGOgF | 격리 fixture·실제 미디어·원장·실행 파일 | 6171952 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](BeforeCreateCancelGreen.log) 10행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.0X79zW | 격리 fixture·실제 미디어·원장·실행 파일 | 6117929 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](BeforeCreateCancelRed.log) 10행 |
| /tmp/media_server_v410_recording_catalog-99280 | 격리 fixture·실제 미디어·원장·실행 파일 | 26148350 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](CatalogRegression.log) 248행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.LoXpuB | 격리 fixture·실제 미디어·원장·실행 파일 | 0 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](ClosingFinal.log) 8행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.8TU2Wd | 격리 fixture·실제 미디어·원장·실행 파일 | 7645216 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](ClosingFinalFixed.log) 16행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.d9kvWE | 격리 fixture·실제 미디어·원장·실행 파일 | 5565497 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](ClosingFirst.log) 3행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.XYHDik | 격리 fixture·실제 미디어·원장·실행 파일 | 7210023 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](ClosingFixed.log) 12행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.r6t0q1 | 격리 fixture·실제 미디어·원장·실행 파일 | 11273390 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](FaultFirst.log) 58행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.HEoJ45 | 격리 fixture·실제 미디어·원장·실행 파일 | 14864615 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](IndependentOracle.log) 108행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.lksyCt | 격리 fixture·실제 미디어·원장·실행 파일 | 4071879 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](InitialRed.log) 4행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.9PFIvT | 격리 fixture·실제 미디어·원장·실행 파일 | 8464623 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](JobsRegression.log) 39행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.L8XgRL | 격리 fixture·실제 미디어·원장·실행 파일 | 5411593 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](NormalFirst.log) 7행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.TTkQgZ | 격리 fixture·실제 미디어·원장·실행 파일 | 13688847 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](OwnershipFirst.log) 84행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.8uB7yQ | 격리 fixture·실제 미디어·원장·실행 파일 | 14887312 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](ProjectionFirst.log) 114행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-remux.rItOf2 | 격리 fixture·실제 미디어·원장·실행 파일 | 9823950 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](RemuxRegression.log) 171행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.lF2Mo2 | 격리 fixture·실제 미디어·원장·실행 파일 | 4748247 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](RequestBindingExpectedRed.log) 7행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-job-service.zeidyp | 격리 fixture·실제 미디어·원장·실행 파일 | 5018311 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](RequestBindingRed.log) 2행 |
| /tmp/media_server_v410_recording_retention-99495 | 격리 fixture·실제 미디어·원장·실행 파일 | 4273004 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](RetentionRegression.log) 58행 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-retention-v2.KbvW2M | 격리 fixture·실제 미디어·원장·실행 파일 | 9640986 bytes | runner 소유 containment 검사 후 재귀 삭제 | 삭제 후 부재 재확인 | [원출력](RetentionV2Regression.log) 27행 |

정리 전수 19개 root, 현재 남은 root 0개. raw media/소유 FIFO·symlink·fault 원장·임시 실행 파일은 모두 정리했으며 텍스트 로그만 보존한다. 서버/port/브라우저/자격증명 생성은 없다.
