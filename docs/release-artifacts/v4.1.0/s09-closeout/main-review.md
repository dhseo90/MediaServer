# S09 미커밋 정리 메인 대조

독자: 개발·검토 담당자. 이 문서는 정리 실행 이력이며 AGENTS/로드맵을 대체하지 않는다. 당시 실패/미실행을 보존하고 현재 S11 완료로 승격하지 않는다.

## 직접 검토 및 보존 판단

- core 네 파일: 당시 종료 수명 수정 SHA256과 현재 파일이 모두 일치한다. application은 ingress/녹화/분석을 먼저 중지하며 registry/guard가 manager보다 오래 살아 있다. registry는 전체 참조를 유지해 worker부터 종료하고 manager는 예약 취소/진행 중 callback을 drain한다. 새 제품 수정은 하지 않았다.
- UI 안내 두 줄: 선택 해제 시 지원 문구 초기화, 무선택/빈 src metadata 이벤트 무시. 실제 제품 JS VM 실행과 과거 direct-browser 결과는 구분한다.
- 현재 20 JPEG 중18개는 기존 manifest bytes/SHA/JPEG형식 일치, 추가2개는 중앙 기록 SHA와 일치한다. 기존 시각 검수 이력을 재사용하며 이번에 새 UI를 실행했다고 주장하지 않는다.
- 준비 로그20개 전문 직접 읽음: 검사 결과·컴파일 진단·소유 임시 경로만 보존되어 있고 인증 원문 없음. 전체 역사 artifact41파일/1,255,829B 보존. 원문 실패 및 wholeSuitePass=false 유지.
- 1687행 과거 기록은 당시 실행 이력이다. 과거 진행/승인대기 문구의 현재 적용 여부는 중앙 최신 정리 절에서 구분한다.

## 메인 단기 검증 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| LC01 registry stops and joins worker-held streams before returning | bash scripts/internal/verify_stream_shutdown_lifecycle.sh; exit0; [Lifecycle.log](Lifecycle.log) | pass | 이번 실제 단기 실행 |
| LC02 registry retains every stream until all workers stop | bash scripts/internal/verify_stream_shutdown_lifecycle.sh; exit0; [Lifecycle.log](Lifecycle.log) | pass | 이번 실제 단기 실행 |
| LC03 manager drains an executing idle callback before returning | bash scripts/internal/verify_stream_shutdown_lifecycle.sh; exit0; [Lifecycle.log](Lifecycle.log) | pass | 이번 실제 단기 실행 |
| LC04 manager cancels pending idle cleanup at destruction | bash scripts/internal/verify_stream_shutdown_lifecycle.sh; exit0; [Lifecycle.log](Lifecycle.log) | pass | 이번 실제 단기 실행 |
| LC05 normal idle grace removes stream and releases admission | bash scripts/internal/verify_stream_shutdown_lifecycle.sh; exit0; [Lifecycle.log](Lifecycle.log) | pass | 이번 실제 단기 실행 |
| LC06 reacquired lease preserves stream across idle grace | bash scripts/internal/verify_stream_shutdown_lifecycle.sh; exit0; [Lifecycle.log](Lifecycle.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I01 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I02 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I03 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I04 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I05 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I06 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I07 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-session-start | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-session-input | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-session-range | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-session-accepted-gap-null | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-session-ambiguous-channel | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-finalize-success-observer-exception-isolated | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-session-restart | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-session-restart-null | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-finalize-failure-no-observer-stop-null | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I08 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I09 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I10 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I11 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I12 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| V410-IDMAP-I13 | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| S07-time-session-blocked-writer-null-nonblocking | bash scripts/internal/verify_recording_identity.sh; exit0; [Identity.log](Identity.log) | pass | 이번 실제 단기 실행 |
| normal selected metadata updates visible support | node scripts/internal/recording_playback_status.test.mjs; exit0; [Playback.log](Playback.log) | pass | 이번 실제 단기 실행 |
| I31-R01 failed timeline clears previous support | node scripts/internal/recording_playback_status.test.mjs; exit0; [Playback.log](Playback.log) | pass | 이번 실제 단기 실행 |
| I31-R01 empty timeline clears previous support | node scripts/internal/recording_playback_status.test.mjs; exit0; [Playback.log](Playback.log) | pass | 이번 실제 단기 실행 |
| I31-R01 unplayable selection clears previous support | node scripts/internal/recording_playback_status.test.mjs; exit0; [Playback.log](Playback.log) | pass | 이번 실제 단기 실행 |
| I31-R02 late metadata cannot contaminate unselected state | node scripts/internal/recording_playback_status.test.mjs; exit0; [Playback.log](Playback.log) | pass | 이번 실제 단기 실행 |
| unselected error preserves selection prompt | node scripts/internal/recording_playback_status.test.mjs; exit0; [Playback.log](Playback.log) | pass | 이번 실제 단기 실행 |
| selected media error shows failure notice | node scripts/internal/recording_playback_status.test.mjs; exit0; [Playback.log](Playback.log) | pass | 이번 실제 단기 실행 |

Build exit0은 [Build.log](Build.log). 제품 경로는 수정하지 않아 이전 core/media 회귀를 현재 전체 릴리즈 PASS로 다시 선언하지 않는다. 30분/120분/UI는 S11 코드 고정 후 영향 범위를 판정한다.

## 과거 임시 로그 정리 전 최소 증거 대조

중앙 S09 실행 기록의 명령·개별 결과·실패 스택·환경·cleanup과 원로그를 대조했다. 숫자 요약은 원로그에서 직접 추출했다.

| 실행 | 원로그 대조 | 완료 경계 |
| --- | --- | --- |
| 8336 | --app-longrun; start1789132799455/end1789132838058; 38603ms; 95 pass/1 fail; AP12 app0 exit=null/SIGABRT | 120분 시작 전 실패 |
| 78768 | --app-observe; start1789133817791/end1789133867146; 49355ms; 295 pass/0 fail; observationCompleted=true | fullFoundationPass=false, resourceTrendPass=false |
| 72162 | --app-longrun; start1789134552362/end1789140174567; 5622205ms; 9872 pass/1 fail; longrun-invalid-segment | longrunObservationCompleted=false; verifiedDurationMs=null; 실패 payload는 당시 소실되어 복원 불가 |
| 92017 | codecs exit0/327136ms, ICE exit0/17731ms, metadata exit0/3037ms; wrapper349777ms | STUN 관측·외부3제외 및 결과전수는 중앙 기존 기록 유지 |
| LC 최초 RED | LC01~03 FAIL, LC04 SIGSEGV, LC05~06 PASS; placement 후 LC01~04 assertion FAIL/LC05~06 PASS | 최초 충돌 이력 유지; 중앙 개별 결과와 일치 |
| LD02 | 기존 recorder98/0 및 실제 UTC 후퇴 4034ms; 중앙 개별98행 보존 | 새 시간 계약이나120분 PASS 아님 |

원시 서버/브라우저 로그의 민감 가능 본문은 추가 Git 보존하지 않는다. 아래 임시 파일은 재현 진단용이며 중앙 최소 증거를 남기고 정리한다. 원문은 Git 미추적이어서 삭제 후 Git 복구 대상이 아니다.

| 경로 | 종류 | 삭제 전 bytes | SHA256 | 조치/결과 |
| --- | --- | ---: | --- | --- |
| .media_server.test/s09-recording120-after-shutdown.log | 임시 진단 | 1560771 | f8dca750bfbdecd1b302d64afece173f8777a0a3873153a33753e4c1391b13b2 | 삭제 완료·부재 확인 |
| .media_server.test/s09-media-regression.mjs | 임시 진단 | 4778 | 7d1d3abb0b2dd0c527a09f61ac2d8c549c0eeb916cbe7b3fcca87514d4c7a806 | 삭제 완료·부재 확인 |
| .media_server.test/s09-shutdown-app-observe.log | 임시 진단 | 66468 | a111189c5d2c965a26fbc73173b5e05c06171d8cd680429f5d784be39c83e319 | 삭제 완료·부재 확인 |
| .media_server.test/s09-recording120-20260911.log | 임시 진단 | 54911 | b6b57c49a3a8a34759e911241a76f91f202429e43075b761b3298b967974bb53 | 삭제 완료·부재 확인 |
| .media_server.test/s09-clock-step-recorder.log | 임시 진단 | 6901 | 1056c7452d4b2166945261c2863955f7ad5a3e44533367c46589455139d8aee8 | 삭제 완료·부재 확인 |
| .media_server.test/s09-lifecycle-tdd/red-placement.log | 임시 진단 | 566 | 2063585b0f6cd2e2929c7a9e92859618fdfc541b407270ca6ed2fc5667978b51 | 삭제 완료·부재 확인 |
| .media_server.test/s09-lifecycle-tdd/red.log | 임시 진단 | 636 | c20fd8e8c6a11a3d8ea924a23204d14654406d2dad7707b8aab13014cee7793a | 삭제 완료·부재 확인 |
| .media_server.test/s09-media-regression/chrome.log | 임시 진단 | 1860 | e7afb86acf61edd80f37cf8f6bfa35f0d05c149659e7297c45df2e0fa75a393a | 삭제 완료·부재 확인 |
| .media_server.test/s09-media-regression/execution.json | 임시 진단 | 438 | 02035663069cadefa0f72ce8e7f2a40e6044f542b5102ce7d66f4aff07e9d0f2 | 삭제 완료·부재 확인 |
| .media_server.test/s09-media-regression/metadata-summary.json | 임시 진단 | 2363 | 3ebb5ea56813ff08f5fbc8de1aebe169ca0aef493c44090d71bec96de305f864 | 삭제 완료·부재 확인 |
| .media_server.test/s09-media-regression/server.log | 임시 진단 | 64581 | 6ff30c5094d162b88c5fb43fd7452ed45a2caf69f16a1a7b23824e8487bd2fae | 삭제 완료·부재 확인 |
| .media_server.test/s09-media-regression/verify-codecs.log | 임시 진단 | 8548 | 6281fc327150e4347ab3997cf1166b7e6ad8c6b918fc5e0976c3b9d8643b6dac | 삭제 완료·부재 확인 |
| .media_server.test/s09-media-regression/verify-webrtc-ice.log | 임시 진단 | 1640 | 599ed46f23588377ce36d66b711d62530372502f713669853d800e296b30a322 | 삭제 완료·부재 확인 |
| .media_server.test/s09-media-regression/verify-webrtc-va-metadata.log | 임시 진단 | 537 | 52b27ef6ae2a794a651805229449c79c8e502f50a6c2cf0e2bea4bb107788012 | 삭제 완료·부재 확인 |

token start/end/consumed: 작업별 집계 없음. elapsed는 각 로그의 도구 관측 또는 내부 시간을 구분했다. build 기존 출력은 유지하며 새 서버·미디어·계정은 main 검증에 생성하지 않았다. 이번 두 임시 binary root는 runner가 제거했고 아래 최종 정리 대조에서 부재를 확인한다.

## 최종 대조

메인은 담당자의 실제 auth/진단/proxy/prep/harness/timeline 원출력과 변경 diff를 직접 확인했다.
도구3개 동결 SHA는 담당 보고와 모두 일치했다. core4개 과거 SHA도 일치하며 새 제품 수정은 없다.
과거 임시파일14개·빈 디렉터리2개·메인 이번 임시binary2개는 삭제 후 부재를 직접 확인했다(exit0).
담당 최초 로그의 소유root10개도 메인이 부재를 대조했다. 이후 보완한 prep 내부 root는 담당 최신 기록을 따른다.
공개 API·auth/scope·녹화 시간 수락 조건 변경은 없다. 이번 도구 진단은 기존 실패를 통과로 바꾸지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 문서 링크 | ./server.sh verify-docs-links exit0: 문서240/링크2001/이미지22/anchor108/색인76/제외154/실패0 | pass | 이번 최종 대조 |
| 대표 README | verify-docs-ui-assets: README uses only representative product UI screenshots | pass | exit0 |
| 영문 README | English README uses English UI screenshots | pass | exit0 |
| UI 안내 자산 | UI guide keeps product screenshots in the shared asset set | pass | exit0 |
| 이미지 정책 | docs UI asset policy documents capture rules | pass | exit0 |
| 자산 manifest | managed UI asset manifest stays complete | pass | exit0 |
| capture 소유 | capture script owns every documented UI asset | pass | exit0 |
| capture 범위 | docs capture covers current screenshots | pass | exit0 |
| 과거 baseline 참조 | representative screenshot docs do not point at stale visual baselines | pass | exit0 |
| 관리 PNG | docs UI asset directory contains managed PNG files | pass | exit0 |
| VA 전체 프레임 | VA documentation images keep full video frame bounds | pass | exit0 |
| diffcheck | git diff --check exit0 | pass | 실패 이력은 과거 결과로 보존 |

준비검사 최종20/0 및 내부 compile root3개·outer root 삭제 증거를 원출력에서 직접 대조했다.
미출력 경로를 추정한 것이 아니라 해당 검사만 재실행하여 실제 이름·KiB·부재 증거를 보완했다.
