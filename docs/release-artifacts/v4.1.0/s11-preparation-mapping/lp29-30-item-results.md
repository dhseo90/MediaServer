# LP29 30분 시도 개별 결과

독자: 검증·릴리즈 검토 담당자. 수명: v4.1.0 실패 실행 증적. 정책은 AGENTS.md, 중앙은 release-test-records.md다.

실제 실행은 41.066775125초·exit1이며 30분 관측은 시작하지 못했다. 아래 주석177행은 정적 진단 항목이며 제품 기능177개 실패를 의미하지 않는다.
원출력23파일은 [압축 보존물](lp29-30-failure-outputs.json.gz), 값·해시는 [요약](lp29-30-failure-summary.json)에 있다.

## 실행한 항목

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| server-start-queue-256 | run_server_foreground; 0초 | PASS | 원출력: /tmp/media_server_predev-1790009537-4075/server.log |
| integrated-smoke | MEDIA_SERVER_LISTEN_PORT=50459 MEDIA_SERVER_HTTP_LISTEN_PORT=50458 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --fail-fast --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction; 35초 | FAIL | 원출력: /tmp/media_server_predev-1790009537-4075/integrated_smoke.log |
| ports-clean | lsof predev ports; 0초 | PASS | 원출력: /tmp/media_server_predev-1790009537-4075/ports-clean.log |
| summary-report | ./server.sh summarize-reports /private/tmp/media-server-lp29-resume.uXBuZl/output/predev-summary.json --output /private/tmp/media-server-lp29-resume.uXBuZl/output/predev-report.md --html-output /private/tmp/media-server-lp29-resume.uXBuZl/output/predev-report.html ; 1초 | PASS | 원출력: /tmp/media_server_predev-1790009537-4075/summary_report.log |
| 스크립트 문법 | bash -n server.sh scripts/internal/*.sh | PASS | 통합 검사1번 |
| 스크립트 인벤토리 | ./server.sh verify-script-inventory; 12/0 | PASS | 통합 검사2번 |
| 코드 주석 | ./server.sh verify-code-comments; 1161파일, 상단154·영문23 | FAIL | 통합 검사3번; 이후 fail-fast 중단 |
| 인벤토리 개별 | dispatch parser recognizes explicit bash and node interpreters | PASS |  |
| 인벤토리 개별 | server.sh dispatch targets exist and are executable | PASS |  |
| 인벤토리 개별 | documented server.sh commands resolve to dispatch table | PASS |  |
| 인벤토리 개별 | tracked scripts are classified and referenced | PASS |  |
| 인벤토리 개별 | project inventory delegates script file inventory to this verifier | PASS |  |
| 인벤토리 개별 | project inventory maps verifier families without duplicating dispatch details | PASS |  |
| 인벤토리 개별 | CMake does not define a separate untracked CTest registry | PASS |  |
| 인벤토리 개별 | test entry scripts are reachable from test_all | PASS |  |
| 인벤토리 개별 | auth verifier has no hardcoded test password defaults | PASS |  |
| 인벤토리 개별 | VA EventRecord dispatch verifier fails early and dispatches every poll by default | PASS |  |
| 인벤토리 개별 | critical verifier pass output avoids grouped feature-result wording | PASS |  |
| 인벤토리 개별 | user-facing JS option parsers reject unknown options | PASS |  |
| 상단 주석 형식 | include/core/gst_decode_compatibility.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_completion_trace.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_derived_event_worker.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_evidence_observer.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_file_evidence.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_latency_trace.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_native_coverage.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_presentation_interval.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_runtime_composition.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | include/recording/recording_write_boundaries.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/build_recording_current_archive_probe.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/codec_probe_diagnostics_test.py: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/codec_probe_diagnostics.py: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/gst_environment_actual_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_application_evidence_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_archive_diagnostic_profile.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_archive_diagnostic_profile.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_archive_phase_trace.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_auth_preparation.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_auth_preparation.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_auth_preparation.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_bounded_wait_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_compaction_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_comparison_build.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_comparison_guard.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_comparison_job_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_comparison_ownership.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_comparison_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_comparison_run.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_comparison.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_cost_probe_run.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_cost_probe_timer.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_cost_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_parse_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_query_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_query_guard.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_query_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_query.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_scale_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_catalog_thin_link_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_checkpoint_cache_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_checkpoint_envelope_cost_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_checkpoint_identity_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_checkpoint_noop_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_checkpoint_noop_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_checkpoint_reproduction_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_completion_trace_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_completion_trace.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_completion_trace.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_app_helpers.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_archive_probe_fixture.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_archive_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_archive_probe.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_http_diagnostics.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_integration_suite.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_integration.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_latency.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_observation.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_observer_native.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_observer.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_observer.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_current_state_diagnostics.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_derived_job_validation_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_derived_transition_reuse_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_endpoint_contract.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_event_correlation.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_failure_capture.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_failure_capture.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_file_evidence_avc_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_file_evidence_capture_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_file_evidence_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_forward_probe_main.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_forward_probe_run.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_forward_probe_writer.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_hw_impact_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_immutable_ownership_build.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_immutable_ownership_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_content_proof_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_content_proof_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_ownership_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_read_context_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_read_context_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_read_context.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_transition_comparison_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_transition_comparison_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_validation_context_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_job_validation_context_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_journal_location_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_journal_location_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_latency_trace_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_latency_trace.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_latency_trace.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_mapping_ambiguity.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_memory_phase.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_native_derived_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_preparation_contracts.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_presentation_interval_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_process_cleanup.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_process_cleanup.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_process_memory_probe_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_process_memory_probe.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_process_memory_probe.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_recovery_content_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_recovery_content_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_recovery_content.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_selection_trace.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_selection_trace.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_snapshot_offload_counter.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_snapshot_offload_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_time_policy_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_time_policy_probe.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_timing_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_timing_probe.js: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_timing_profile_analyze.js: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_timing_profile_probe.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_timing_profile_writer.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_typed_lifetime_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_utc_observation_diagnostic.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_write_boundaries_smoke.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_writer_decode_diagnostics.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/recording_writer_decode_oracle.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_gst_environment_actual.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_local_ice_guard.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_local_ice_guard.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_application_evidence.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_checkpoint_cache.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_current_app.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_current_longrun.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_current_observer.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_derived_job_validation.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_derived_transition_reuse.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_file_evidence_avc.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_file_evidence_capture.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_file_evidence.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_hw_impact.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_immutable_ownership.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_job_read_context.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_media_impact.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_preparation_contracts.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_presentation_interval.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_recovery_content.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_time_policy_probe.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_recording_write_boundaries.sh: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_review4_locator_resolution.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_whep_local_signaling.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/verify_whep_local_signaling.test.mjs: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | scripts/internal/whep_local_offer.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | src/core/gst_decode_compatibility.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | src/recording/recording_checkpoint_validation.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | src/recording/recording_derived_job_context.h: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | src/recording/recording_derived_job_service.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | src/recording/recording_evidence_observer.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | src/recording/recording_file_evidence.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 상단 주석 형식 | src/recording/recording_runtime_composition.cpp: 첫8줄에 파일 용도/파일 요약/동작 요약 없음 | FAIL | 주석 자체가 없다는 뜻은 아님 |
| 한글 설명 주석 | include/recording/recording_catalog.h:188:    // Runtime-only token: snapshot and bounded protection are acquired under the same lock. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | include/recording/recording_derived_event_worker.h:34:    // UTC request coordinates cannot be compared to decoded media PTS here. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | include/recording/recording_derived_event_worker.h:45:    // Decision-time snapshot. Callback duration is not included and is not added to the wait budget. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | include/recording/recording_derived_event_worker.h:56:// Bounded value-only summary, not an admission API. IDs stay internal; external formatters must hash them. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | include/recording/recording_derived_event_worker.h:72:    // Opt-in; all aggregation/callback exceptions are isolated. Must be thread-safe/nonblocking. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | include/recording/recording_derived_event_worker.h:73:    // Invoked outside worker/catalog locks with the exact selection decision inputs. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | include/recording/recording_latency_trace.h:17:// k: 0=lock span, 1=phase span, 2=fast aggregate, 3=diagnostic loss. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | scripts/internal/recording_bounded_wait_smoke.cpp:169:            // The diagnostic callback precedes ready-lease transfer; wait for a second evaluation turn. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | scripts/internal/recording_current_archive_probe_fixture.cpp:15:  // Synthetic direct interval control isolates native file-duration coverage, not a decoder observation. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | scripts/internal/recording_current_archive_probe.cpp:241:            // Basic capture must precede any GStreamer/media inspection or replay. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | scripts/internal/recording_current_archive_probe.test.mjs:20: // Never inherit a registry or managed/plugin search path from another run. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_catalog.cpp:2307:        // Missing decoded duration never invents source-wait coverage. This list only | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_catalog.cpp:2308:        // protects already proven native intervals under the same snapshot lock. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_event_worker.cpp:249:                    // Allocation must succeed before the only owner of ID/lease moves. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_event_worker.cpp:284:                    // The durable Intent now protects sources before this runtime token is released. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_event_worker.cpp:304:        // Refresh before every decision, including an already-expired queued request. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_event_worker.cpp:372:            // Existing finalized binding validation is reused. Only unavailable lifecycle | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_event_worker.cpp:373:            // candidates need a separate validity check, and only for opt-in diagnostics. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_job.cpp:574:// namespace recording | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_selection.cpp:141:    // A proof-less eligible source keeps the entire request on the legacy profile. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_selection.cpp:211:    // Sweep starts/ends instead of rescanning all observations at every atom. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_derived_selection.cpp:235:        // Unknown observation length cannot justify recovering a later suffix. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 한글 설명 주석 | src/recording/recording_finalize_recovery.cpp:126:    // evidence binding <=2MiB + segment <=1MiB + bounded path/field overhead. | FAIL | 정책 예외를 추가하거나 삭제하여 통과시키지 않음 |
| 시간 증거 판독 | 기존 buildMonotonicDurationEvidence; 실제40초 < 1800초 | FAIL | eligibleRealDuration=false; 관측 미시작 |
| 반복 원장 판독 | 기존 validateIterationLedger; observedIterations=0 | FAIL | 실제 반복 없음 |
| 프로세스 종료 | 4075: aliveAfter=false | PASS | 서버 자체 exit/signal 미수집; 정상 종료 코드로 확대하지 않음 |
| 프로세스 종료 | 4091: aliveAfter=false | PASS | 서버 자체 exit/signal 미수집; 정상 종료 코드로 확대하지 않음 |
| 프로세스 종료 | 4093: aliveAfter=false | PASS | 서버 자체 exit/signal 미수집; 정상 종료 코드로 확대하지 않음 |
| 포트 해제 | TCP 50458: 재바인딩 성공 | PASS | 확인용 socket도 닫음 |
| 포트 해제 | TCP 50459: 재바인딩 성공 | PASS | 확인용 socket도 닫음 |
| 포트 해제 | UDP 55388: 재바인딩 성공 | PASS | 확인용 socket도 닫음 |
| 원출력 보존 | 23파일, RTSP URL4곳 제거; gzip 해제 일치 | PASS | 13927B; SHA256 307b04f6d774cec65b542ef3dd8b260851f665fd535e29673cbf46da3e78bdab |
| 소유 자료 정리 | /private/tmp/media-server-lp29-resume.uXBuZl; 1782591B; file16/link277 | PASS | 부재 확인; symlink 대상 무수정 |
| 소유 자료 정리 | /private/tmp/media_server_predev-1790009537-4075; 25249B; file11/link0 | PASS | 부재 확인; symlink 대상 무수정 |
| 소유 자료 정리 | /Users/dhseo/Workspace/mediaServer/.media_server.test/20260922-015219; 13511B; file4/link0 | PASS | 부재 확인; symlink 대상 무수정 |

실행·진단·정리 결과 행: 208개. 중첩 요약을 포함하므로 고유 제품 테스트 총계로 합산하지 않는다. 최초 실패 후 수정·재실행은 없다.

## 미실행·제외

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| build | --skip-build | skip:  | 이번 PASS 아님 |
| external-turn-hard-gate | ./server.sh verify-webrtc-ice --external-turn | not-run: not run after first failure integrated-smoke: integrated smoke failure | 이번 PASS 아님 |
| soak-case-loop | duration soak case loop | not-run: not run after first failure integrated-smoke: pre-soak failure | 이번 PASS 아님 |
| main-runtime-idle | curl -fsS http://127.0.0.1:50458/lab/runtime/status | not-run: not run after first failure integrated-smoke: pre-runtime-idle failure | 이번 PASS 아님 |
| server-start-queue-2 | run_server_foreground | not-run: not run after first failure integrated-smoke: earlier first failure | 이번 PASS 아님 |
| event-post-queue | ./server.sh verify-event-post --mode queue | not-run: not run after first failure integrated-smoke: earlier first failure | 이번 PASS 아님 |
| queue-runtime-idle | curl -fsS http://127.0.0.1:50458/lab/runtime/status | not-run: not run after first failure integrated-smoke: earlier first failure | 이번 PASS 아님 |
| 실제 UI·브라우저미디어 | native424/visual80/녹화I27~34/metadata | 선수 실패 후 미실행 | 준비 검토는 실제 UI PASS 아님 |
| 공통·녹화120분 | 별도 장시간 | 이번 범위 밖 | 실제 지속 관측 없음 |
| 외부 서비스·실기기 | 사용자 명시 제외 | 실행하지 않음 | PASS 아님 |

## 정리 상세

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/tmp/media-server-lp29-resume.uXBuZl | 파일16/링크277 | 1782591B | 필요 원출력 보존 후 정확 소유 root만 삭제 | 부재 확인·링크 대상 보존 | 요약 cleanup |
| /private/tmp/media_server_predev-1790009537-4075 | 파일11/링크0 | 25249B | 필요 원출력 보존 후 정확 소유 root만 삭제 | 부재 확인·링크 대상 보존 | 요약 cleanup |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/20260922-015219 | 파일4/링크0 | 13511B | 필요 원출력 보존 후 정확 소유 root만 삭제 | 부재 확인·링크 대상 보존 | 요약 cleanup |

토큰 start/end/consumed: 전용 집계 없어 미집계. elapsed는 process.hrtime.bigint, source는 2055ed9b5ebc42c3cde58e3dca50bc9364cfd7ae.
