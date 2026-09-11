# S09 UI 실행 67127 실패 기록

독자: S09 검증 담당자. 수명: 실패 증거 보존. 정책은 AGENTS.md, 결과 색인은 release-test-records.md를 따른다.

명령: `./test_ui.sh`; exit 1; 시작1789104049523, 종료1789105578521; elapsed1528998ms(25분28.998초). 기준commit4ebd2cb2fc73dc1fea3d516cb03a05ec28a2df85.

개별424개 중423 pass/1 fail. UI 전체 FAIL. EVT-058의 REQUEST_LIFECYCLE_FAILED/RESPONSE_MISSING(object-112), 요청131/응답130. 주 action reviews200은 이 실패를 상쇄하지 않는다. 원인은 미확정. 최종 정합성은 기본 .media_server/recordings 파일4개 생성에 따른 final-source-end-drift/final-current-source-drift로 FAIL.

Policy v4 qualification, 녹화추가8개ID/31action 및 녹화전용120분 미실행. 개별 child PASS는 전체 UI 적격·시각검수 PASS가 아니다. token start/end/consumed: 미집계(정확한 실행경계 snapshot 없음); source: launcher와 child summary; elapsed는 launcher Date.now 차이.

## 단계

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| preflight | validate actual bundle inputs; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| build | ./server.sh build; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| feature-gates | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| server-longrun-30 | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| ui-environment-bootstrap | bootstrap acceptance-owned throwaway server/auth roles/Playwright storage-state; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| ui-exact-424 | ./server.sh run-v390-ui-native-exact-cases --output-dir <workspace>/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911052110-85870/ui-exact-424 --http-base http://127.0.0.1:55094 --role-state-map /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-RMsiLs/role-state-map.json --server-log /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-RMsiLs/media-server.log --runtime-descriptor /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-RMsiLs/runtime-descriptor.json --build-path build-gst-onnx/media_server; exit 1 | fail | FAIL; 미실행은 완료증거 불가 |
| ui-server-cleanup | stop exact UI throwaway server and verify ports; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| ui-fulltest-qualification | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| longrun-120-decision | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| server-longrun-120 | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| cleanup | validate child cleanup and preserved evidence; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| ui-final-integrity | validate canonical UI parent/424 children/Policy/current run/source/cleanup; exit 1 | fail | FAIL; 미실행은 완료증거 불가 |
| report | write acceptance summary/report; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| final-integrity | ; exit null | fail | not-run; 미실행은 완료증거 불가 |

## UI 전수

각 행은 원본 child summary와 policy input에서 추출. SHA는 child summary의 SHA256. 전체 UI 적격 증거로 재사용하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| UI-001 | /; anonymous; 390×844 light;  → ; 1138ms | pass | child execution PASS; SHA ab0728551e341372586e385ee49e840ecaff50b2833aa847484acfedd99d646e |
| UI-002 | /setup; anonymous; 390×844 light; [data-testid="auth-setup-form"] → [data-testid="auth-setup-form"] button[type="submit"]; 2170ms | pass | child execution PASS; SHA e7aca72ba5c77b426b8fadbcfe639853e373e7b0a398d8d306db1b86759dbdee |
| UI-003 | /login; anonymous; 390×844 light; [data-testid="auth-login-form"] → [data-testid="auth-login-form"] button[type="submit"]; 2292ms | pass | child execution PASS; SHA 9d1a3d9f9551390a8986b4ef8dac1a682bdc8b7d98a4bed2e755af2cf9dafe05 |
| UI-004 | /password/change; operator; 390×844 light; [data-testid="auth-password-change-form"] → [data-testid="auth-password-change-form"] button[type="submit"]; 2694ms | pass | child execution PASS; SHA 8d51fe646db14a5c21cb69cd698388a402ca1e9e0afac4913f0f5010fe49a258 |
| UI-005 | /logout; operator; 390×844 light; [data-testid="auth-password-change-form"] → form[action="/logout"] button[type="submit"]; 2059ms | pass | child execution PASS; SHA 1ec5258b96ff712241f8586a3d2fd37a42bac22a95d9970ff16a666dd7be39c6 |
| UI-007 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-testid="auth-invite-setup-form"] button[type="submit"]; 2327ms | pass | child execution PASS; SHA ec543f3f57506776bd81251dc703203368095eda4d38f11c0c9b45cfd070e737 |
| UI-008 | /client/request-access; anonymous; 390×844 light;  → #request-form button[type="submit"]; 2011ms | pass | child execution PASS; SHA ea471f97d8357d54034128143aa088d1563ff5fef9916e1547cd6a7da504ff27 |
| UI-009 | /ops/home; operator; 390×844 light; [data-testid="ops-home-page"] → [data-testid="ops-home-page"]; 1709ms | pass | child execution PASS; SHA d7e7b59f1604c46420c1358d9d230bd74edbe69ed395f4f6676f5afd05db5890 |
| UI-010 | /ops/dashboard; operator; 390×844 light;  → ; 1830ms | pass | child execution PASS; SHA 71e86eb6f7c276b81c31e98e777b889e589383f968c8fd88e925a9f383cfafc1 |
| UI-011 | /ops/sources; operator; 390×844 light; [data-testid="source-reliability-search-metrics"] → [data-testid="source-reliability-search-metrics"]; 1827ms | pass | child execution PASS; SHA 4b73e0126eec75c0c47d69ddc9e3ca3e8e1a3ca70a81737904c5f4f3808e7334 |
| UI-012 | /ops/rules; operator; 390×844 light;  → ; 1688ms | pass | child execution PASS; SHA 3a8fbeb1af4391bfc2301e6a1c5744760b4a130db538cb5a3b3ea9879a000b6d |
| UI-013 | /ops/users; admin; 390×844 light;  → ; 1672ms | pass | child execution PASS; SHA 0d93d9c2e15b402e794828576f04e1b28b9d9546b70e4132c5c5580abf6c346c |
| UI-014 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 1964ms | pass | child execution PASS; SHA 420d4c27d46a6b5afb14daacdac580562a13dc60c1176198e8948a51b27e4452 |
| UI-015 | /client/live; viewer; 390×844 light; [data-testid="client-live-action-reduction"] → [data-testid="client-live-action-reduction"]; 1687ms | pass | child execution PASS; SHA 629c50d6d7c2f4f762f298afdbf2a8503ae7529f536dbb0a5282f34063fa59f4 |
| UI-016 | /client/dashboard; viewer; 390×844 light; [data-testid="client-dashboard-shell"] → [data-testid="client-dashboard-shell"]; 1711ms | pass | child execution PASS; SHA ea5cb9b1ea97b741fb12aa4dcf2ddce75c7f4f807ec5ae6b8d43d65833f02ff9 |
| UI-017 | /client/events; viewer; 390×844 light; .client-viewer-events → .client-viewer-events; 1628ms | pass | child execution PASS; SHA eed52bae4d26e8de4f522375387bf099d5bff120dcf497a4d1df86b03b9b4435 |
| UI-018 | /lab; operator; 390×844 light;  → ; 923ms | pass | child execution PASS; SHA 0810a3cc4ae388a2b662143348f4ccd2b945b27ee52565521f18220460e1aa24 |
| UI-019 | /ops; operator; 390×844 light;  → ; 1644ms | pass | child execution PASS; SHA 7e4409276b19a4add3d8cd0b0e612c3714a531593afd5926e6eb24b553885754 |
| UI-020 | /ops/dashboard; operator; 1440×900 light; .ops-workspace-diagnostic-grid → .ops-workspace-diagnostic-grid; 2014ms | pass | child execution PASS; SHA bdfa78d9ba5dd8f25dfcf4fd63bd8e41de84329dbff5f0ae9f314b02acbdb5e0 |
| UI-021 | /ops; operator; 390×844 light;  → ; 1684ms | pass | child execution PASS; SHA e7c33d241a8df32b4829db6a80177b062a449ffac8eac644d5eeb0ebfae71d48 |
| UI-022 | /ops/vlm; operator; 390×844 light; #opsVlmExternalTransferWarningAck → #opsVlmExternalTransferWarningAck; 1752ms | pass | child execution PASS; SHA 1861b016314d779c3c2719e1dcf14245b963a4b56a041f4dc3b34bc71c7b3993 |
| UI-023 | /ops/vlm; operator; 390×844 light; #opsVlmProfileEnabled → #opsVlmSaveProfile; 2789ms | pass | child execution PASS; SHA 73edc82c3909088325e755b535be9257f7e60ba45192b2c4a5d6ea0d1b1391db |
| UI-024 | /ops/vlm; operator; 390×844 light; #opsVlmPrivacyGuardList → #opsVlmPrivacyGuardList; 1849ms | pass | child execution PASS; SHA cf96446c5f56c9d500f75b9e9b920faabdb083695bc567443e5dd9a5920dc862 |
| UI-025 | /ops/vlm; operator; 390×844 light; #opsVlmDisabledReason → #opsVlmDisabledReason; 1978ms | pass | child execution PASS; SHA 54f8f170a66a54ae39a46bcdfadc0f1dac9700e38d8f59c54fed31634f453e09 |
| UI-026 | /ops/vlm; operator; 390×844 light; [data-vlm-option-id="local-qwen3-vl-4b"] → [data-vlm-option-id="local-qwen3-vl-4b"]; 1989ms | pass | child execution PASS; SHA a1be51a62a54c51be4712eed9efa891400c86c8f40272b6400a1781fd9f4a4d9 |
| UI-027 | /ops/vlm; operator; 390×844 light; #opsVlmRuntimeStatusList → #opsVlmRuntimeStatusList; 1790ms | pass | child execution PASS; SHA 67cbecaf455d32a04c6fb6bf2e5825008d3d09540e2d99ee3e6a8ea6312948e9 |
| UI-028 | /ops/vlm; operator; 390×844 light; #opsVlmProfileEnabled → #opsVlmProfileEnabled; 1980ms | pass | child execution PASS; SHA 443526efd30406aa7ed54982f0edc883bc160d5c3b4a5f060dbe87b03647ccce |
| UI-029 | /ops/vlm; operator; 390×844 light; #v320ActionReadinessChecklistGrid → [data-delete-vlm-profile="ui-029-review4-fixture"]; 3165ms | pass | child execution PASS; SHA b75f2037052a0af03b27efe26aa9eea97dcd159c797aad72f29350c87ba6df3a |
| UI-030 | /ops/vlm; operator; 390×844 light; #opsVlmEvaluationRows → #opsVlmEvaluationRows; 1745ms | pass | child execution PASS; SHA 842ee0c470bb067f8e2403f5e2e3953d934aecf88cd5aa32d1a42e2c56e758ff |
| UI-031 | /ops/vlm; operator; 390×844 light;  → ; 1762ms | pass | child execution PASS; SHA e86dee533395422277fd9ecd21c00e0d996fcc63c472234644a8ceb850036072 |
| UI-032 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 1947ms | pass | child execution PASS; SHA 2c75868a3a92981b0f9458f59cf3fd47f59270d281119ea1495e49cd0c18baaf |
| UI-033 | /ops/vlm; operator; 390×844 light;  → ; 1670ms | pass | child execution PASS; SHA 9b9410374b6ad73cb6e626beaffaa71eadf3cd0e3ac507f12a21b57593438f10 |
| UI-034 | /ops/vlm; operator; 390×844 light; #opsVlmEvaluationRows → #opsVlmEvaluationRows; 1750ms | pass | child execution PASS; SHA cdf7065e5f4763ed2964f18e3c37e3cae639e998c6e4a89093c6d275fe601e58 |
| UI-035 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 1982ms | pass | child execution PASS; SHA a8246887bd69c650ad007dd972af1037eae5c1f4bf45f59069c015a7c568ff91 |
| UI-036 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → [data-vlm-rule-draft-index]; 2035ms | pass | child execution PASS; SHA 7760889e040fa0ddb4673d722b9598f41db14d095b202e2a1b0fd146e0c484ab |
| UI-037 | /ops/events; operator; 390×844 light;  → ; 1665ms | pass | child execution PASS; SHA 511711d49f7093205f8eb33761c347f383b29eea36fb40d457c2974d98b7d436 |
| UI-038 | /ops/events; operator; 390×844 light;  → ; 1686ms | pass | child execution PASS; SHA 817d0d476c9051ec199a8b5433b3e432a7fab806b6803395e8562ec57d1b8745 |
| UI-039 | /ops/events; operator; 390×844 light;  → ; 1686ms | pass | child execution PASS; SHA 3af7db5873bb9a19e967129d7cce0c30c3531473d174d6a5ea7fb68ce016e719 |
| UI-040 | /ops/events; operator; 390×844 light;  → ; 1705ms | pass | child execution PASS; SHA 2bbb1f650b0bb19e3e7bccfb2f821958f0c81fbbf3d4d18593b85c2b1e2a556e |
| UI-041 | /ops/events; operator; 390×844 light;  → ; 1685ms | pass | child execution PASS; SHA 4cefb4909501488e1803d6f0cee57da1ffa375803be0fb582f2776cbf8c2c550 |
| UI-042 | /ops/events; operator; 390×844 light;  → ; 1698ms | pass | child execution PASS; SHA e3c6fc0fc7c7ce227731254de2f08d10bb81c2a492b01d2668acf735156ab038 |
| UI-043 | /ops/events; operator; 390×844 light;  → ; 1666ms | pass | child execution PASS; SHA 0338d7e72a7ff6a44c4c25168c8ff551943123215f8b574c38ec42a866ee9529 |
| UI-044 | /ops/events; operator; 390×844 light;  → ; 1723ms | pass | child execution PASS; SHA 5c751f4a440b37c78d00fe315c46d20fe3eb6aa809ce2d154739fee1ba83bcf9 |
| UI-045 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 1936ms | pass | child execution PASS; SHA 0583bd45d24daa2c509cdd10546cee020984a026045f10bda4729946325daa5d |
| UI-046 | /ops/events; operator; 390×844 light; [data-incident-rule-draft-route] → [data-incident-rule-draft-route]; 2284ms | pass | child execution PASS; SHA e1b964c3fa79aeec7276a0735a3f55c4a8317f9bc5eeba3d5f3fc3e7c46bf806 |
| UI-047 | /ops/sources; operator; 390×844 light; [data-testid="source-backup-recovery-handoff"] → [data-testid="source-backup-recovery-handoff"]; 1757ms | pass | child execution PASS; SHA 92be3538ec6601054551a04d55bc31381eda342df9200986d0ad027584e7c485 |
| UI-048 | /ops/dashboard; operator; 390×844 light;  → ; 1886ms | pass | child execution PASS; SHA 55a9c7d96374b2143f131321ac90181125174e3ff3b472f6beb4c8e4ecb76b4a |
| UI-049 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderType → #opsScenarioBuilderType; 1906ms | pass | child execution PASS; SHA aed2290c8c043be9d760ad4014b969c5f4e1b781f35978a231126881119058f3 |
| UI-050 | /ops/events; operator; 390×844 light;  → ; 1739ms | pass | child execution PASS; SHA 07f19f23a27e1a0daa58cd50d884c8eedb2d2aee0d1fda3c3697134c0803bac6 |
| UI-051 | /ops/events; operator; 390×844 light; #opsIncidentTriageBoardRows → #opsIncidentTriageBoardRows; 1755ms | pass | child execution PASS; SHA f227388cba744bd14753f200184555c6fbdf89994dd06ae65bb19d68e246c94a |
| UI-052 | /ops/events; operator; 390×844 light; [data-testid="ops-operational-action-pack"] → [data-testid="ops-operational-action-pack"]; 1780ms | pass | child execution PASS; SHA 8fc1d213d54a86f98c75d99f88c977bd108c34d545a27e058d7c63c106b016a3 |
| UI-053 | /ops/events; operator; 390×844 light; [data-testid="ops-rule-what-if-preview"] → [data-testid="ops-rule-what-if-preview"]; 1876ms | pass | child execution PASS; SHA a676725480607584539f8e66bcd0a6a1809f2e24e6c3665a0da2b5bc053fdb7f |
| UI-054 | /ops/events; operator; 390×844 light;  → ; 1680ms | pass | child execution PASS; SHA 9915ddca544b14f2567d2e7976381941ccc959c65f2d6f954d3f610a3b0ee7cc |
| UI-055 | /ops/events; operator; 390×844 light;  → ; 1684ms | pass | child execution PASS; SHA 388619cf7ef4008991ad5e890c579723a6d092346cbadbd39868d2fa172df8ef |
| UI-056 | /ops/rules; operator; 390×844 light;  → ; 1765ms | pass | child execution PASS; SHA ca2f230f8f6a13df2a032ced2ac78ab926e7c65c5545fdea46abe4564d3e5de0 |
| UI-057 | /ops/events; operator; 390×844 light;  → ; 1711ms | pass | child execution PASS; SHA 408aeba38bb070873264379fe1b5d8d40dc320f4a56f1040c292a44318d0b246 |
| UI-058 | /ops/events; operator; 390×844 light;  → ; 1701ms | pass | child execution PASS; SHA 3cf8cf440064bf5c3691b081a24a29b60606da7b42de4ff7f22ace1bb1a3edd4 |
| UI-059 | /ops/events; operator; 390×844 light;  → ; 1714ms | pass | child execution PASS; SHA b854a98ac03d417bf51e56cc75da641daee4d8350431bf87abeddf1fab4214cc |
| UI-060 | /ops/events; operator; 390×844 light;  → ; 1695ms | pass | child execution PASS; SHA ade6d8b76ca90714128f7ff0f2063bc1d50c27b2b350d4f9d3744b14668904d4 |
| UI-061 | /ops/events; operator; 390×844 light;  → ; 1676ms | pass | child execution PASS; SHA b68c604b1cbb61a0b33e8feb18b4c2018696e64df39bf75220d0f89101ce8734 |
| UI-062 | /ops/events; operator; 390×844 light; #opsV320ResolutionTimeline → #opsV320ResolutionTimeline; 1789ms | pass | child execution PASS; SHA 847873bb096dff7bde7ce4b386a2975f25ca5297e50043a9b778116d113140a8 |
| UI-063 | /ops/events; operator; 390×844 light;  → ; 1729ms | pass | child execution PASS; SHA bbd5d02f8f3decd1b7d71c342b172c55c835644ba9aa7fde396c0e516809c8da |
| UI-064 | /ops/events; operator; 390×844 light; #v320SourceReliabilityGrid → #v320SourceReliabilityGrid; 1806ms | pass | child execution PASS; SHA 60df23b528b73f225feefbdf186ff5e61b7bcb22d2337e3e173f5749c17bbbe8 |
| UI-065 | /ops/events; operator; 390×844 light; #v320AiReviewQualityGrid → #v320AiReviewQualityGrid; 1819ms | pass | child execution PASS; SHA eab136c6e92c72fc4d24d91703cfdbf1a520208ecb327e9cd859bf7ac3889600 |
| UI-066 | /ops/events; operator; 390×844 light; #v320OperatorResolutionFlowGrid → #v320OperatorResolutionFlowGrid; 1831ms | pass | child execution PASS; SHA fc1f40081107609da3f958b41ae0b9f69ff36932c1004b167889f9d6ce0119dc |
| UI-067 | /ops/events; operator; 390×844 light; #v320ActionReadinessChecklistGrid → #v320ActionReadinessChecklistGrid; 1801ms | pass | child execution PASS; SHA 2eb54e0921bb0df3a01ca2eccccc0aad03279840557fedcdff26238dbd7dd13c |
| UI-068 | /client/live; viewer; 390×844 light; [data-testid="client-safe-resolution-digest"] → [data-testid="client-safe-resolution-digest"]; 1786ms | pass | child execution PASS; SHA a3ebf043ba3e4c133861ebb7584cb11a35fb08a2a4304d9c383e87fdc48f8bb3 |
| UI-069 | /ops/events; operator; 390×844 light; #v320ResolutionSearchMetricsGrid → #v320ResolutionSearchMetricsGrid; 1802ms | pass | child execution PASS; SHA e4cc0d33d860b389430102bd137a930ea6093eff9075f5e91032dd8c33750db9 |
| UI-070 | /ops/events; operator; 390×844 light; #v330IncidentSourceCorrelationGrid → #v330IncidentSourceCorrelationGrid; 1809ms | pass | child execution PASS; SHA cafa9c285f97529ef4f02a26c132ec3fef85ed9efb45f576e4559852c35d1150 |
| UI-071 | /ops/events; operator; 390×844 light; #v330OperatorRecheckRecoveryQueueGrid → #v330OperatorRecheckRecoveryQueueGrid; 1796ms | pass | child execution PASS; SHA 78530106b2d6dd4202bc57ea1c2ae53595bd02d07848b3c0357b2af121cc7c21 |
| UI-072 | /client/live; viewer; 390×844 light; [data-testid="client-safe-source-status-digest"] → [data-testid="client-safe-source-status-digest"]; 1698ms | pass | child execution PASS; SHA dc80f05d609d4ff4a614cb6925224822765c6c4493bba8ce06f305fbe654c6c7 |
| UI-073 | /ops/sources; operator; 390×844 light; [data-testid="source-reliability-search-metrics"] → [data-testid="source-reliability-search-metrics"]; 1790ms | pass | child execution PASS; SHA fe51a186de3c74cdfc2ad3f52f58910279a90d476af54d2e6c5130f97b7d3fab |
| UI-074 | /ops/sources; operator; 390×844 light; [data-testid="source-backup-recovery-handoff"] → [data-testid="source-backup-recovery-handoff"]; 1815ms | pass | child execution PASS; SHA 4ac4d25f6bd130b26d160231e2ccc7fdc61425e8daef5fc57089c7ab3721e018 |
| UI-075 | /ops/sources; operator; 390×844 light; [data-testid="ops-continuity-drill-workspace"] → [data-testid="ops-continuity-drill-workspace"]; 1767ms | pass | child execution PASS; SHA 4c24ebea7c574f7699cea75571339814e776ea739b1720f92efd931173ff4642 |
| UI-076 | /ops/sources; operator; 390×844 light;  → ; 1721ms | pass | child execution PASS; SHA f6ae6958da33fa77505f4b8ed3fa8a4e9d0d6deba1847a8c243621e0922d399b |
| UI-077 | /client/live; viewer; 390×844 light; [data-testid="client-safe-maintenance-digest"] → [data-testid="client-safe-maintenance-digest"]; 1707ms | pass | child execution PASS; SHA 5a2620c77a91e69b81aa4e31c623695f1ff3e984d66453960db43a67b9e47f13 |
| UI-078 | /ops/sources; operator; 390×844 light;  → ; 1709ms | pass | child execution PASS; SHA 237d4f121a5ab437158d1beb2b2cc5ab4feb70baa453093dd8fe21b2368334b6 |
| UI-079 | /ops/sources; operator; 390×844 light;  → ; 1724ms | pass | child execution PASS; SHA aa0c877b7c7d5ad1d0974b37f19664d28fb3bf62a065c136c6aca902908149e8 |
| UI-080 | /ops/events; operator; 390×844 light; #v350IncidentCommandHandoffGrid → #v350IncidentCommandHandoffGrid; 1808ms | pass | child execution PASS; SHA f70ed0b156bde2f853b399e2bf28e6f57dc65b5c08327ba10a5f9c347de0bfa6 |
| UI-081 | /ops/dashboard; operator; 390×844 light;  → ; 1850ms | pass | child execution PASS; SHA 36ee0f8e6058f331dd583305fc88f03ef53a10f9210bb7ec2892fcb1e44e0c6e |
| UI-082 | /ops/dashboard; operator; 390×844 light;  → ; 1865ms | pass | child execution PASS; SHA 6c4db6a78ff617184694ed1b50a74feeb590f6c7e45d95de052cc08502c5e0bd |
| UI-083 | /client/live; viewer; 390×844 light; [data-testid="client-impact-forecast"] → [data-testid="client-impact-forecast"]; 1730ms | pass | child execution PASS; SHA 4350e3ade00955998251899fd0559f06d10c087d679462895865812d12ac71c6 |
| UI-084 | /client/live; viewer; 390×844 light; [data-testid="client-operations-notice"] → [data-testid="client-operations-notice"]; 1752ms | pass | child execution PASS; SHA c61b8e2e934d606d28c5c464d3050b50bf79385a0d389ab5f4e1f97a5e4620d9 |
| UI-085 | /ops/dashboard; operator; 390×844 light; #dashCommandWorkspaceExportBundleMap → #dashCommandWorkspaceExportBundleMap; 1874ms | pass | child execution PASS; SHA 1f43fdcfad02de0ad851254da3a53284209ccb6460960a5116ffc0f570d203f8 |
| UI-086 | /ops/dashboard; operator; 390×844 light;  → ; 1833ms | pass | child execution PASS; SHA 6387cb1acf28d0e5d0f4ea296d75c40c0e0b81b1c1fd96f6235a6dc62af3d6c9 |
| UI-087 | /ops/dashboard; operator; 390×844 light; #dashCommandWorkspaceVlmAssistedExplanation → #dashCommandWorkspaceVlmAssistedExplanation; 1935ms | pass | child execution PASS; SHA c384d411dedce190b72939278bd3ad36619f2998fb66f14726551689c3783e4a |
| UI-088 | /ops/dashboard; operator; 390×844 light; [data-v360-simulation-workspace-entry="simulation-route-family"] → [data-v360-simulation-workspace-entry="simulation-route-family"]; 1890ms | pass | child execution PASS; SHA 3741332238b105a9a00d674b3316878a0f8a8f23f129030da4b6202847edb16f |
| UI-089 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceLedgerList > [data-v360-simulation-run-ledger-entry]:nth-child(2) → #dashSimulationWorkspaceLedgerList > [data-v360-simulation-run-ledger-entry]:nth-child(2); 1927ms | pass | child execution PASS; SHA d5d381e51db9586b69199c42d7a0e901669787754ff9e333f232b0f2c77138d4 |
| UI-090 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceNoticePreviewList > [data-v360-client-notice-preview-entry]:first-child → #dashSimulationWorkspaceNoticePreviewList > [data-v360-client-notice-preview-entry]:first-child; 1928ms | pass | child execution PASS; SHA 731e791be1a5171a0269ab39967ec7fffd933704b8504f03c6ddb7ed5326650b |
| UI-091 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceWhatIfReplayList > [data-v360-rule-va-what-if-replay-entry]:first-child → #dashSimulationWorkspaceWhatIfReplayList > [data-v360-rule-va-what-if-replay-entry]:first-child; 1950ms | pass | child execution PASS; SHA 86708e636ebb6f4d8d9dc780a311dc0a054591449924f8b9015d43afc431b195 |
| UI-092 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceExportBundleList > [data-v360-simulation-export-bundle-entry]:first-child → #dashSimulationWorkspaceExportBundleList > [data-v360-simulation-export-bundle-entry]:first-child; 1913ms | pass | child execution PASS; SHA d025665ed0ae1cb9a7cf80077272108205b3d510080ff6c142456d88fcbbcb6d |
| UI-093 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceFieldEvidenceAdapterList > [data-v360-field-evidence-simulation-adapter-entry]:first-child → #dashSimulationWorkspaceFieldEvidenceAdapterList > [data-v360-field-evidence-simulation-adapter-entry]:first-child; 1938ms | pass | child execution PASS; SHA b0c740d2218fad7593071640420fc87b5057e779ed250a51579e0cc6cce91277 |
| UI-094 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList > [data-v360-vlm-assisted-simulation-explanation-entry]:first-child → #dashSimulationWorkspaceVlmAssistedExplanationList > [data-v360-vlm-assisted-simulation-explanation-entry]:first-child; 1984ms | pass | child execution PASS; SHA ca7f4668dd3552a73bfab29fa601e24c3d4d413b83639c8a534b536c1d81feee |
| UI-095 | /ops/dashboard; operator; 390×844 light; #dashSiteOperationsSiteList > [data-v370-site-operations-workspace-entry]:first-child → #dashSiteOperationsSiteList > [data-v370-site-operations-workspace-entry]:first-child; 1972ms | pass | child execution PASS; SHA 39d81b33deb3a640da39a94bd746608f3401a1bcc6f25b18435e3c7c999e9e50 |
| UI-096 | /ops/dashboard; operator; 390×844 light; #dashSiteClientNoticePreviewList > [data-v370-client-notice-by-site-view-group-entry]:first-child → #dashSiteClientNoticePreviewList > [data-v370-client-notice-by-site-view-group-entry]:first-child; 1885ms | pass | child execution PASS; SHA 12d156a730a4f2ac8dca4ba71f0b19e1ef198347eb5eac4cdf4811eb964e1724 |
| UI-097 | /ops/dashboard; operator; 390×844 light; #dashSiteRuleVaWhatIfCandidateList > [data-v370-rule-va-what-if-by-site-entry]:first-child → #dashSiteRuleVaWhatIfCandidateList > [data-v370-rule-va-what-if-by-site-entry]:first-child; 1916ms | pass | child execution PASS; SHA a0d67ac06b22d9186c485775da72425305b8b86432dfcfad9f8cd91fc3d8a2ed |
| UI-098 | /ops/dashboard; operator; 390×844 light; #dashSiteFieldEvidenceAttachmentList > [data-v370-field-evidence-attachment-entry]:first-child → #dashSiteFieldEvidenceAttachmentList > [data-v370-field-evidence-attachment-entry]:first-child; 1969ms | pass | child execution PASS; SHA 4c779371db498ba9332d6162182812349b9ea2adbf4b412c50cd8476e213d6ae |
| UI-099 | /ops/dashboard; operator; 390×844 light; #dashSiteLimitedSafeExecutionPilotList > [data-v370-limited-safe-execution-pilot-entry]:first-child → #dashSiteLimitedSafeExecutionPilotList > [data-v370-limited-safe-execution-pilot-entry]:first-child; 1916ms | pass | child execution PASS; SHA 0682eaf11d923ab71269bfc715179742cb80e98ed4e415c778eb9cc290b07263 |
| UI-100 | /ops/dashboard; operator; 390×844 light; #dashSiteOutcomeReconciliationSourceList > [data-v370-outcome-reconciliation-entry]:first-child → #dashSiteOutcomeReconciliationSourceList > [data-v370-outcome-reconciliation-entry]:first-child; 1924ms | pass | child execution PASS; SHA 505d48073ca5766f7ed06efb5e429473f9411cb8b7a6ed9ee6b9655f923575aa |
| UI-101 | /ops/dashboard; operator; 390×844 light; #dashSiteExportHandoffBundleList > [data-v370-export-handoff-bundle-entry]:first-child → #dashSiteExportHandoffBundleList > [data-v370-export-handoff-bundle-entry]:first-child; 2027ms | pass | child execution PASS; SHA 37ff1948cc291f229838db7d2523b4a3f1d096115f662566c509106acefe6487 |
| UI-102 | /ops/dashboard; operator; 390×844 light; #dashActionControlRequestList > [data-v380-action-control-entry]:first-child → #dashActionControlRequestList > [data-v380-action-control-entry]:first-child; 1935ms | pass | child execution PASS; SHA a78dab8691494ce12ddf30625350a3158f05ac6c5af5754bf14ec61e9c46936a |
| UI-103 | /client/dashboard; viewer; 390×844 light; [data-testid="client-action-notice-preview"] .client-action-notice-item:first-child → [data-testid="client-action-notice-preview"] .client-action-notice-item:first-child; 1737ms | pass | child execution PASS; SHA 59139d4360a700090e6481249f16e01fa440c1477233d122297f54dcb1c6a243 |
| UI-104 | /ops/dashboard; operator; 390×844 light; #dashActionOutcomeSourceList > [data-v380-outcome-observer-entry]:first-child → #dashActionOutcomeSourceList > [data-v380-outcome-observer-entry]:first-child; 1937ms | pass | child execution PASS; SHA fa0d2925e58200e1595874f12cc3e196c6d7787cce4b90ecad38cdb5129ab315 |
| UI-105 | /ops/dashboard; operator; 390×844 light; #dashActionReceiptBundleList > [data-v380-action-receipt-entry]:first-child → #dashActionReceiptBundleList > [data-v380-action-receipt-entry]:first-child; 1937ms | pass | child execution PASS; SHA 9d37ac105e3d3200eb6355bd676d282b83d36d73b9acc11d92fbd03b8cbd9576 |
| UI-106 | /ops/dashboard; operator; 390×844 light;  → ; 1873ms | pass | child execution PASS; SHA 3cb684eb9393fce8ec14a91d27d18b68da8ba6df1798accd1a7a513f23a4eb65 |
| UI-107 | /ops/dashboard; operator; 390×844 light; #opsIncidentActionReadinessQueueRows → ; 1805ms | pass | child execution PASS; SHA b8c0df2ed66f7ac6345cc515f23d6a7b05ba986cdca5c82864c48457fd61da34 |
| UI-108 | /ops/sources; operator; 390×844 light;  → ; 1713ms | pass | child execution PASS; SHA a6a2ddc00ef819bc35fd84176ca4dab323a18685254778478294a70e822bec24 |
| UI-109 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 3023ms | pass | child execution PASS; SHA e95048ffc73cb70e98a7fe2db5408b018296f52c05f795c029d8915ad7e1753e |
| UI-110 | /ops/rules; operator; 390×844 light; #opsVlmRuleDraftBridgeStatus → #opsVlmRuleDraftBridgeStatus; 1851ms | pass | child execution PASS; SHA 8cba4b34a608be911f0c3f671cc274e864559c5618d24546cb7559b8160c4549 |
| UI-111 | /ops/vlm; operator; 390×844 light; #opsVlmExternalTransferWarningAck → #opsVlmExternalTransferWarningAck; 1725ms | pass | child execution PASS; SHA 1d59b945ec79df99b3b92461164fd7e0140fdcfa8b8d4a5f28e0fd3874e53f6f |
| UI-112 | /ops/sources; operator; 390×844 light;  → ; 1724ms | pass | child execution PASS; SHA a1075a306e46dc3c4d351d71a069fc9c60bd47222a48bc755c9649f94c8a5205 |
| UI-113 | /ops/dashboard; operator; 390×844 light; #dashActionExecutionDeferralList → #dashActionExecutionDeferralList; 1981ms | pass | child execution PASS; SHA b9294ad395576ae8006e2837cf3c2afc3266de43c06fa9544394c06c317c5eb3 |
| UI-114 | /ops/dashboard; operator; 390×844 light; #dashFieldEvidenceBridgeList → #dashFieldEvidenceBridgeList; 1944ms | pass | child execution PASS; SHA bed489bb2dbc60118379c0be22a3812ed88798cd012d141fa1007320b6a3d97a |
| UI-115 | /ops/dashboard; operator; 390×844 light;  → ; 1920ms | pass | child execution PASS; SHA 23586d0fe0e33fe3613698e2dd407cb981ade13f2735295081c9287136a9fce2 |
| AUTH-004 | /login; anonymous; 390×844 light; [data-testid="auth-login-form"] → [data-testid="auth-login-form"] button[type="submit"]; 2326ms | pass | child execution PASS; SHA dd46a051435eb2b432a5bbb2ac9d99d9b73bd423ea7c868cb0adafd92059c99d |
| AUTH-005 | /setup; anonymous; 390×844 light; [data-testid="auth-login-form"] → [data-testid="auth-setup-form"] button[type="submit"]; 2185ms | pass | child execution PASS; SHA 5560a4af789f0363885e03bd33f8e7940f4cb32774f3ce13bd440c9e77a2c736 |
| AUTH-006 | /setup; anonymous; 390×844 light; [data-testid="auth-setup-form"] → [data-testid="auth-setup-form"] button[type="submit"]; 2323ms | pass | child execution PASS; SHA b53d9afd6b02316b33d42036553e9c4294d02f5eeb75b246f9ad52434077569e |
| AUTH-007 | /login; anonymous; 390×844 light; [data-testid="auth-password-policy"] → [data-testid="auth-login-form"] button[type="submit"]; 2064ms | pass | child execution PASS; SHA 449f997c862b9617d1e9f6a9a4391f2ce9e4e7c116a8e16e18a3275f6d3b2fe9 |
| AUTH-012 | /ops/users; admin; 390×844 light;  → ; 1677ms | pass | child execution PASS; SHA 2f9b566be058c154b9b5a8aef52e924fe489a13c0f304da00c61fefd6ce8e283 |
| AUTH-013 | /ops/users; admin; 390×844 light;  → ; 1652ms | pass | child execution PASS; SHA 289de66181c3f9ebf6751e9463bcc750ec27152366e6f4040a3cd34500b5864e |
| AUTH-014 | /login; anonymous; 390×844 light; [data-testid="auth-login-form"] → #user-save-selected; 2238ms | pass | child execution PASS; SHA 8e971ed7ec90cbe1997530e5a7f9b94eb1bf5d649654a3fc27fe58ddcf9509fd |
| AUTH-015 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → #invite-create-form button[type="submit"]; 2220ms | pass | child execution PASS; SHA ecd7b488890716f210d0ad7bb2d807757de27750d62bb5a5075d4631661ee65c |
| AUTH-016 | /ops/users; admin; 390×844 light;  → ; 1642ms | pass | child execution PASS; SHA 3769a9f805092b731d8d858c489531624a0b20e68ab638a11fbe9d4e3b24d2b8 |
| AUTH-018 | /ops/users; admin; 390×844 light;  → #user-save-selected; 2619ms | pass | child execution PASS; SHA 7add09253dd0766c0f38b49c173698dbebb3e18904e475dc5e3df22c40a48f47 |
| AUTH-019 | /ops/users; admin; 390×844 light;  → #user-save-selected; 2754ms | pass | child execution PASS; SHA 0a02372e65e31de41f53cdcdd6ee0163a6b48fd40f006d51f86a28fd75598c8c |
| AUTH-020 | /ops/users; admin; 390×844 light;  → ; 2931ms | pass | child execution PASS; SHA 4e2f8f67eb757dc193585659fcbfad45cbf1bc0ff274b74e80caf4dd4918799a |
| AUTH-021 | /ops/users; admin; 390×844 light;  → ; 1689ms | pass | child execution PASS; SHA 5707e5c2496ea9bed3dd12e8b5fdb333153390a8202f199e8618cbe4c1a6ac96 |
| AUTH-022 | /ops/users; admin; 390×844 light;  → ; 1674ms | pass | child execution PASS; SHA f99b435adc4112dbfddc5f8c52ee8c7b1a44f0b6eb9a7211c8c0b2db9cb53f1c |
| AUTH-023 | /ops/users; admin; 390×844 light;  → ; 1710ms | pass | child execution PASS; SHA 0413289cbb52f2111f776a74c424ff612cdb77293edbcac2cc4d941d62794f2e |
| AUTH-024 | /ops/users; admin; 390×844 light;  → ; 1646ms | pass | child execution PASS; SHA 21db8d4efb57c3c345047bca1a559daa339c19f95c318dffe53cffec8f468a5b |
| AUTH-025 | /ops/users; admin; 390×844 light;  → ; 1665ms | pass | child execution PASS; SHA 573768c804b79135d4df2dcc9ea2aef11cd9f3c296ee9469eeba5099555aefd2 |
| AUTH-026 | /ops/users; admin; 390×844 light;  → ; 1767ms | pass | child execution PASS; SHA 38aceb54fb994e55bf4e691faaa30b9f015baa69a18c254fb66764f8d911d587 |
| AUTH-027 | /ops/users; admin; 390×844 light;  → ; 1658ms | pass | child execution PASS; SHA 2f56ce8a2cc49c86ca3f19698458c7534cf52571876387cfe13178621817c4bb |
| AUTH-028 | /ops/users; admin; 390×844 light;  → ; 1749ms | pass | child execution PASS; SHA 4dc7130cb966cd60b47d57177161d6c911566b6a872d27434f799eb5731344b1 |
| AUTH-029 | /ops/users; admin; 390×844 light;  → ; 1666ms | pass | child execution PASS; SHA ac8df3c4708461c321556119153de1617f2b9cd6cb39ab23e004ff129ce36402 |
| AUTH-030 | /ops/users; admin; 390×844 light;  → ; 1664ms | pass | child execution PASS; SHA b52fcb924dd9ad398f5ad2cbccb14227d468d01ac96ab9efaf033d0aca387a03 |
| AUTH-033 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → #invite-create-form button[type="submit"]; 2245ms | pass | child execution PASS; SHA e48b493e981330fc248221f2de0bc5a65891fcec634af8fdc3453daabb0144d5 |
| AUTH-034 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-testid="auth-invite-setup-form"] button[type="submit"]; 2345ms | pass | child execution PASS; SHA 3277479d29beb22bfbd00986982f91d1fb0fe0ffc282a378aaea722f57f9b0b2 |
| AUTH-035 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-testid="auth-invite-setup-form"] button[type="submit"]; 2464ms | pass | child execution PASS; SHA 8d41565ca18332be2ca4e3494711ae7aa7d58ccf6f6eeb4dc409a9de4660a845 |
| AUTH-036 | /login; anonymous; 390×844 light; #request-form → #request-form button[type="submit"]; 1983ms | pass | child execution PASS; SHA 037857007a17910dc927feae8601fcc6ed048a82dee55bd62a46ea71ab58d155 |
| AUTH-037 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-request-approve="auth-037-review4-fixture"]; 2638ms | pass | child execution PASS; SHA 5c1b12e7805a307606817c53e031423822563844ee79566d4f3937449b48f472 |
| AUTH-038 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-request-reject="auth-038-review4-fixture"]; 3130ms | pass | child execution PASS; SHA c852753aabc6d176d16c91cfc4da5c6d7e0bb6f4a2db45a096a2f4a02e9871f0 |
| AUTH-039 | /ops/users; admin; 390×844 light;  → #request-form button[type="submit"]; 2544ms | pass | child execution PASS; SHA 78ffa46433df682e69be203ef25649575c560a5af034cfbad872600c9bfacb77 |
| AUTH-040 | /ops/users; admin; 390×844 light;  → ; 1709ms | pass | child execution PASS; SHA 4149c49067e4140638ccb22fb87f1778e16741fc1635df6d451ec0aab34367ef |
| SRC-001 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2889ms | pass | child execution PASS; SHA 4fbd736464256a6c3783f6ad8627a2fc580849b15cf01faffb988eecb5e55f77 |
| SRC-002 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2876ms | pass | child execution PASS; SHA 9e6918c911af0959d1d0d70686a03f8300604caf4042bf9fe48d13b50a770f40 |
| SRC-003 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2823ms | pass | child execution PASS; SHA 525434ffc0b67929b0b18c9f6514b5376763056e9b0208b3701a2e344400b4dd |
| SRC-004 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2894ms | pass | child execution PASS; SHA a295aa5d3de170fe806dd64640f2bf228553070c19379dec9a082fba944b60ff |
| SRC-005 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2958ms | pass | child execution PASS; SHA 0f3d781935c40273c9dd7448de830eafe9992d216bd03a1c6095c1de62fc7b4b |
| SRC-006 | /ops/sources; operator; 390×844 light;  → ; 1737ms | pass | child execution PASS; SHA 03af48cd14e58bd03183b587e8a5c2aff0065d1e8e7030e9ad0ad32148256a22 |
| SRC-007 | /ops/sources; operator; 390×844 light;  → ; 1760ms | pass | child execution PASS; SHA 6d91f32dd9fdb81d637bac655e1d37d396040a1be8820ec37db90e10fe4062f7 |
| SRC-008 | /ops/sources; operator; 390×844 light;  → ; 2895ms | pass | child execution PASS; SHA 2b8013dbec7c16c71255ece25f128b48a8d95b8ea4c9cba091bb5f8363997299 |
| SRC-009 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 3115ms | pass | child execution PASS; SHA a8262696e1ab020100303c5f93a48f19300f0e493e99791210578a71e732d022 |
| SRC-010 | /ops/sources; operator; 390×844 light;  → ; 3217ms | pass | child execution PASS; SHA b7e2efb764a4c2c22b5f1b606e1bb200663adb9f61ac2e55b444e3c9c2d8d6aa |
| SRC-011 | /ops/sources; operator; 390×844 light; #channelScopePolicy → ; 1673ms | pass | child execution PASS; SHA 220b6036a7752f21d48341713a54caef84a104d8e4147d0b360514f86980b159 |
| SRC-012 | /ops/sources; operator; 390×844 light;  → ; 1710ms | pass | child execution PASS; SHA 79115f053918b5f1c44182afecfa5dfab43a002f7ca2b300d77323d09cceeef6 |
| SRC-014 | /ops/sources; operator; 390×844 light;  → ; 1737ms | pass | child execution PASS; SHA 903b9d0e1bcf1af168fccee2ac06401ada8e731d4bf302fe8a7d201f40eee8ba |
| SRC-016 | /ops/sources; operator; 390×844 light;  → ; 1667ms | pass | child execution PASS; SHA ad3fddd61bdf0b5fd04a9399dac59f2a162adc6742939b6dcf2daffc1930da60 |
| SRC-017 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2896ms | pass | child execution PASS; SHA 3fb53bc5ed83dd7306588fac97d00b535a800ee42a1166faf3d95ab64770b474 |
| SRC-018 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 3109ms | pass | child execution PASS; SHA a9ad775c0aaa6bd36182d711bb0d3d8281634ca58d575ea843311afa36943951 |
| SRC-019 | /ops/sources; operator; 390×844 light;  → ; 3155ms | pass | child execution PASS; SHA e109ea9f1f26978ef4575be712f74137b072168cf5c4dd8862f05f30952af05a |
| SRC-020 | /ops/sources; operator; 390×844 light;  → ; 1704ms | pass | child execution PASS; SHA 2cfbc4d53b8786843b2b3070c26efc8b9835bc60f7ceb355ecbb90134b8ee7cc |
| SRC-021 | /ops/sources; operator; 390×844 light;  → ; 1719ms | pass | child execution PASS; SHA 3058a0ec96af9b9169fa758178a5a5e304fcbf880b9acb924fce588777208089 |
| SRC-022 | /ops/sources; operator; 390×844 light;  → ; 1700ms | pass | child execution PASS; SHA e48ee90564482399f9ad52e5f7230db0c965a0c3758705658746974fe9775a57 |
| SRC-023 | /ops/sources; operator; 390×844 light;  → ; 1691ms | pass | child execution PASS; SHA 93616516b4bdcddf753b9767454ee27c9509ea6d823dc1d842698dc4046527ea |
| SRC-024 | /ops/sources; operator; 390×844 light; #add-channel → #add-channel; 2133ms | pass | child execution PASS; SHA 835a8265fe9f00748c0c68cd203c0f44474ca9f69b7d10cd491ca4b7aa731b59 |
| SRC-025 | /ops/sources; operator; 390×844 light;  → ; 1725ms | pass | child execution PASS; SHA 4aca0c3a12f444e4d6d902d2a3c27f9e2fbb3d8807ed7ffadc17bdcf23dca334 |
| SRC-026 | /ops/sources; operator; 390×844 light;  → ; 1713ms | pass | child execution PASS; SHA 082b841eca564daed826d0c93f409857c3d26b09a7d1788c363da54860caaba4 |
| SRC-028 | /ops/sources; operator; 390×844 light;  → ; 1704ms | pass | child execution PASS; SHA d01e2ed2f3ff807e74cacd59bec42641e55d9b94f27553d3c7ce98612fbbc5e2 |
| SRC-029 | /ops/sources; operator; 390×844 light;  → ; 1717ms | pass | child execution PASS; SHA 50c9049511f022ab53519fefe47d2688b50da79f35ef5d8f15a4c521c209e4ca |
| SRC-030 | /ops/sources; operator; 390×844 light;  → ; 1729ms | pass | child execution PASS; SHA 7077ef1d7a0887a9f1daa9e2b05bc522d0d30110b5d77ca679dff3066b31089d |
| SRC-031 | /ops/api/onvif/import-draft; operator; 390×844 light;  → ; 2134ms | pass | child execution PASS; SHA 65b45030dab1e2ae9f785b05df1e75c80a006713e2921cda5aebb2874c94c34e |
| SRC-032 | /ops/sources; operator; 390×844 light;  → ; 1697ms | pass | child execution PASS; SHA 0fc5d129cad3c53a85aca3905016d525ef8da819ac159de2adfed06c950122d2 |
| SRC-034 | /ops/api/source-registry/onboarding-quality; operator; 390×844 light;  → ; 1215ms | pass | child execution PASS; SHA 3a5da0871270b25f7f19990da7ff90f5d6134486c5615103093fd517fcae14a8 |
| SRC-035 | /ops/api/source-registry/reliability-timeline; operator; 390×844 light;  → ; 1180ms | pass | child execution PASS; SHA d3adc6a4863a49121cbde2fd2ebb2f733ce746163066a1d863c7aeb2eca7b326 |
| SRC-036 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1201ms | pass | child execution PASS; SHA 8dc1f136f51c9dd13119bedbf61251da205a1d518ae562c84bd1154d0b013a6b |
| SRC-037 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1129ms | pass | child execution PASS; SHA 12b900d2e55a87390e894c7779fd8b437df84c6369ed0e7925fc106bc1e705c3 |
| SRC-038 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="${escapeHtml(testId)}"] → [data-testid="client-safe-source-status-digest"]; 1118ms | pass | child execution PASS; SHA 698fbee03441f0b4c43e0d86d6fafdce9fea62d491945face7401036b957187e |
| SRC-039 | /ops/api/source-registry/reliability-search-metrics; operator; 390×844 light;  → ; 1179ms | pass | child execution PASS; SHA 02fa977f72f14ab504d332e8ded157dc77e987045011896987b21c24f9c603c9 |
| SRC-040 | /ops/api/source-registry/backup-recovery-handoff; operator; 390×844 light;  → ; 1234ms | pass | child execution PASS; SHA 5db2183bc71c4e046acf20f5c046b85d624dfc544cfc2b7df07814ac59ac8f41 |
| SRC-065 | /ops/api/onvif/credential-provider-status; operator; 390×844 light;  → ; 1152ms | pass | child execution PASS; SHA 31418c0a0f5bbd30753f277281c14b807c7b015e1042acb4df81fa399a967228 |
| SRC-066 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 3071ms | pass | child execution PASS; SHA bc16707de8de3951bd34218256eadccb1d518f2e16bc28aebfbf48ee536ef334 |
| SRC-067 | /ops/sources; operator; 390×844 light;  → ; 1717ms | pass | child execution PASS; SHA ef47ec5d24df52e8585c85501a2d1e68c091d47a5a962c7edcca597a489a5c9f |
| SRC-068 | /ops/sources; operator; 390×844 light;  → ; 1698ms | pass | child execution PASS; SHA d959edae521485856fe4ca2a31a703c7b74830eb661a62b39297b8882a3b23f1 |
| RULE-001 | /ops/rules; operator; 390×844 light; #v320ActionReadinessChecklistGrid → #opsVaRuleRows > tr:first-child; 1174ms | pass | child execution PASS; SHA 99015c6b7b1b6cad5d209f99dbf39d5dc1b5fb95002e79bf673eddef45427d13 |
| RULE-002 | /ops/rules; operator; 390×844 light;  → #opsEventRuleRows > tr:first-child; 1179ms | pass | child execution PASS; SHA 5e5f3c57dea195a734cdc5142a06beba999756d5f23d3d3aa5a879805729ac2c |
| RULE-003 | /ops/rules; operator; 390×844 light; #v320ActionReadinessChecklistGrid → #opsProfileRows > tr:first-child; 1209ms | pass | child execution PASS; SHA 5775037fd80ee5d25fd2283778b0248efedbd63ac2bd74e42d10ff82dc348549 |
| RULE-004 | /ops/rules; operator; 390×844 light; #opsVaRuleIdInput → #opsRulesComposerSave; 4635ms | pass | child execution PASS; SHA deb09d0574369ebdf9435ac714f71a3b9202807c508b1ab135835ac816551c51 |
| RULE-005 | /ops/rules; operator; 390×844 light; #opsVaRuleTemplateSeedSelect → #opsRulesComposerSave; 4789ms | pass | child execution PASS; SHA bf2560579a8cf2f60d2754a9ada0b2b9bf706c832e70a67916de2f94d984ffc7 |
| RULE-006 | /ops/rules; operator; 390×844 light; #opsVaRuleTemplateSeedSelect → [data-ops-rule-action="delete-va"]; 3913ms | pass | child execution PASS; SHA 0d2fd957cefffa85379dc366dcdd948e9250320e210590025c0780641be8911e |
| RULE-007 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → ; 1754ms | pass | child execution PASS; SHA 4b4955d74c3a6a58b086069f0ae83c3c5ed8b0a298481430d4cb6fca183487fa |
| RULE-008 | /ops/rules; operator; 390×844 light; #opsVaRuleTemplateSeedSelect → #opsRulesComposerSave; 4750ms | pass | child execution PASS; SHA e1f1f7ca452a7e56411e87e23a37428961f8f0e418ff57009f74f318e3c528f1 |
| RULE-009 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesValidationList; 1840ms | pass | child execution PASS; SHA c8443a5e788dab3ba8dc5576f0b89304177524424d6242f5db92f825f87d900d |
| RULE-010 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackingSummary → #opsVaRuleTemplateSeedSelect; 3992ms | pass | child execution PASS; SHA 30a7c02d5ea2054f6fdd4a35e5cbefd3af5415c8362cc74123adf328d49ee81f |
| RULE-011 | /ops/rules; operator; 390×844 light; #opsVaRuleIdInput → #opsRulesComposerSave; 4706ms | pass | child execution PASS; SHA 231d75fc130f8a58f06e88e4f556bdae95127278681e9772eb048dbc9bc8c708 |
| RULE-012 | /ops/rules; operator; 390×844 light; #opsVaRuleIdInput → #opsRulesComposerSave; 4747ms | pass | child execution PASS; SHA 3e2e7cfbc9e672863d7d2e52574802604f1e909bb47f7afe7df4771191c6edc9 |
| RULE-013 | /ops/rules; operator; 390×844 light; #opsVaRuleGeometryMinimumText → #opsVaRuleGeometrySummary; 3624ms | pass | child execution PASS; SHA 9e78ab5fa7be17f7db1b68f8f4cca947521365cb98453c70cf18691da73c5d15 |
| RULE-014 | /ops/rules; operator; 390×844 light;  → ; 1754ms | pass | child execution PASS; SHA a9645685a5c6571fe3894c0cea4acac3e8efb4b56d2b67b860b6e2b1488b3b74 |
| RULE-015 | /ops/rules; operator; 390×844 light;  → ; 1786ms | pass | child execution PASS; SHA a0fe817379a97b5db963633c542ca9d18001ae87f798347342de4d71fa484499 |
| RULE-016 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 4596ms | pass | child execution PASS; SHA 51ca081cf2a38494fa258fd9dbc1f5474275b98dd24cd9cb620c76fb0934a379 |
| RULE-017 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → #opsEventRuleIdInput; 1798ms | pass | child execution PASS; SHA 4f98966c0f3db22ef19786fe9cbaf8dd002e16cf440cc5ce8f4ea249c6e1addd |
| RULE-018 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSelect → #opsRulesComposerSave; 4645ms | pass | child execution PASS; SHA acaa8250b926754b6987037b281d53c687ec7951e40208cb2cc19e487d57f708 |
| RULE-019 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4717ms | pass | child execution PASS; SHA adbe07ed38bcf89477f57fc22c3c4743f4c5eab11aa560e0b1fafe6c78a0ec56 |
| RULE-020 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → [data-ops-rule-action="delete-event-template"]; 3938ms | pass | child execution PASS; SHA 3003067372f0ad2d7979b7b70ebe9e0c702bca2529c9034aec25e6e35d315b69 |
| RULE-021 | /ops/rules; operator; 390×844 light; #opsEvidenceIntakeFieldReadinessRows → #opsEventRuleDetailSummary; 2838ms | pass | child execution PASS; SHA 06133baa82ccdca50dad6a365fff3fc8e528b6f24429e15f589681101018079d |
| RULE-022 | /ops/rules; operator; 390×844 light; #opsVaRuleReidSelect → #opsRulesComposerSave; 4633ms | pass | child execution PASS; SHA 41b372c704b91efa575cd6f8d54001d916fd241cb7d52fe411f7d39f9abcad82 |
| RULE-023 | /ops/rules; operator; 390×844 light; #opsVaRuleIdInput → #opsRulesComposerSave; 4699ms | pass | child execution PASS; SHA 246343dde9d9d3c365ad43304b0c6e73636dfed2dd0c005b95565c0a01eed2ee |
| RULE-024 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → [data-ops-rule-action="delete-profile"]; 3933ms | pass | child execution PASS; SHA 5c773f31a8f0a860921b6693eb4bf1d16d84a3061809662855cc7b1742c30a13 |
| RULE-025 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → ; 1790ms | pass | child execution PASS; SHA 6ca7afddafecef3272a13b52e69d53f8ab3373611fb3503b70c9de221665a804 |
| RULE-026 | /ops/rules; operator; 390×844 light; #opsProfileDetectorSelect → #opsRulesComposerSave; 4760ms | pass | child execution PASS; SHA ea0dbb78bd9bf260aa0f6b4a249da952809c07b0203282d46534bfc740c1a9f0 |
| RULE-027 | /ops/rules; operator; 390×844 light; #opsProfileDetectorSelect → #opsRulesComposerSave; 4714ms | pass | child execution PASS; SHA 816d606e35f986be96efb20275db7ada84bfc278d7540121d4cff86706feea75 |
| RULE-028 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4700ms | pass | child execution PASS; SHA 014da2bbff2cf4ed5b5d173e641cc50a602747b118468c543f2006b68640ae70 |
| RULE-029 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4777ms | pass | child execution PASS; SHA 51d24974df84f11d9bb809745667c87b1338921d170943be38358f0cc9745c3c |
| RULE-030 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → #opsRulesComposerSave; 4736ms | pass | child execution PASS; SHA 3b7bb8561e54ccce5bc8bc9c1faa5a66e93b7dddc88db6703be2e0d0a3386fb6 |
| RULE-031 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4755ms | pass | child execution PASS; SHA 43e6ca6837e3fe7a5e68605168571b077aa30632af54fda38631c89c3b43dee3 |
| RULE-032 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4768ms | pass | child execution PASS; SHA e6a0720bb5ac2aff36fe3ceb7fa00c46b8877a12d9e3b0fbb5055cbd0fac9658 |
| RULE-033 | /ops/rules; operator; 390×844 light; #opsEventRuleModeSelect → #opsRulesComposerSave; 4775ms | pass | child execution PASS; SHA beb098668025659c5bd33b1d99a7d4621c8f6891756668ad78af18adf569683a |
| RULE-034 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackerSelect → #opsRulesComposerSave; 4729ms | pass | child execution PASS; SHA ef948be83d4f266d726862671bbb20cd51899f70a0e92852ae969fc4ad8b4c20 |
| RULE-035 | /ops/rules; operator; 390×844 light; #dashIncidentTimeline → #opsRulesComposerSave; 4716ms | pass | child execution PASS; SHA e7ee562c9e474696e02c7c1c5aebc5f4832dffc20bc03a31fdac61c7125309a9 |
| RULE-036 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackerSelect → #opsRulesComposerSave; 4748ms | pass | child execution PASS; SHA cec7f802b109b5e244d73ccbabf50bd14b92857515af5809b1a1bf4e73775ccc |
| RULE-037 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackerSelect → #opsRulesComposerSave; 4676ms | pass | child execution PASS; SHA 469c86338dec41c7f0cd38697caa830afa50fbd7ac3633f760c1dc27993159d0 |
| RULE-038 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 4712ms | pass | child execution PASS; SHA 14f8f3bc94ce641c70824ea332bd0342f44a932744fb15dd89143aba35dff118 |
| RULE-039 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackerSelect → #opsRulesComposerSave; 4725ms | pass | child execution PASS; SHA 9ae0fe3efb19909d4c08275891892cff34d3a6588ce027f3302713a0896738d6 |
| RULE-040 | /ops/rules; operator; 390×844 light; #dashReidAssistDecisionList → ; 1763ms | pass | child execution PASS; SHA e61296d0b954cc542466ae15505159fe0b9a54e0f8c7da429aaa7633c638fa51 |
| RULE-041 | /ops/rules; operator; 390×844 light; #dashRootCauseList → #opsRulesComposerSave; 4764ms | pass | child execution PASS; SHA f2fe1efdb7039906b42d255861fc16ff993884c839a4587a83f182cacfcf0b62 |
| RULE-042 | /ops/rules; operator; 390×844 light; #dashRootCauseList → #opsRulesComposerSave; 4684ms | pass | child execution PASS; SHA aeb1e79c0f5f4373669390742ff01d7b61965db1d2695afe43bae3b41751d34a |
| RULE-043 | /ops/rules; operator; 390×844 light; #dashRootCauseList → #opsRulesComposerSave; 4772ms | pass | child execution PASS; SHA bb4b0a3ee183a3993d7509e54eab05ad9d3fc2d8a624ba6d29b85b31ce1dc2a8 |
| RULE-044 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 4708ms | pass | child execution PASS; SHA 81c8ac4138912d8b43794f68be9706f1ec0acb580e62d3c8c1dd87e0ca1f5f48 |
| RULE-045 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderClasses → #opsRulesComposerSave; 4678ms | pass | child execution PASS; SHA aca93f6177dc8056d2fb2444da610d8eb792928a60c39bf96443482683f71de9 |
| RULE-046 | /ops/rules; operator; 390×844 light; #opsEventRuleTriggerDirectionSelect → #opsRulesComposerSave; 4722ms | pass | child execution PASS; SHA fb06a87d4294ef7e4fd98278fc0204a3bbcca2a227c10ee89757332acd735d57 |
| RULE-047 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderClasses → #opsRulesComposerSave; 4766ms | pass | child execution PASS; SHA e054abd3ef4e17db0751c8f73347880f76039091d2f7197253c64c847525dc2e |
| RULE-048 | /ops/rules; operator; 390×844 light; #opsEventRuleTypeSelect → #opsRulesComposerSave; 4766ms | pass | child execution PASS; SHA 921a367b6d0f9c2f0722b9d1a7952309ca9d87681de860661ab276ecc6260f36 |
| RULE-049 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderType → #opsRulesComposerSave; 4799ms | pass | child execution PASS; SHA b38903ba679dec233657f4348c7bb265872cf2eb2e91e88aa636a214ff3c408e |
| RULE-050 | /ops/rules; operator; 390×844 light; [data-testid="ops-scenario-builder"] → #opsRulesComposerSave; 4732ms | pass | child execution PASS; SHA 334647b811d0aff5a93787b17da21d66af08e10e96d76eb23ab807f7e54faf60 |
| RULE-051 | /ops/rules; operator; 390×844 light; #opsEventRuleSettingsHeading → #opsRulesComposerSave; 4715ms | pass | child execution PASS; SHA fb29412fc3b74fdacc047d2bd7f0281242026ee74bd3ac688a78c3ab001ff419 |
| RULE-052 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderType → #opsRulesComposerSave; 4761ms | pass | child execution PASS; SHA 24a6b6166027095e110cbb960138e4ca604d9b758900c9363360972445e7ad93 |
| RULE-053 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4734ms | pass | child execution PASS; SHA 5ab4f9634a65e3123590af8daf994856787512761b6ef4700662ced5dbd2feda |
| RULE-054 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4748ms | pass | child execution PASS; SHA 728a544bb21c3b3a4c1811ea7e1defa38cd1bc1c40509afed164d70e9992e9dd |
| RULE-055 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4758ms | pass | child execution PASS; SHA fadb7894212810cf8fe7407def83c68ff1e8f13a36d1fd77071312196578c300 |
| RULE-056 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4729ms | pass | child execution PASS; SHA 79942ba215ec41e3d830db8df02a3e466f4d6fe6da9faff44a95f7e3ea84e64d |
| RULE-057 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4709ms | pass | child execution PASS; SHA 9bda9ea8548b9271b55e3f34e36d149ff80650d07ea1279120350fa2dad85797 |
| RULE-058 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4808ms | pass | child execution PASS; SHA fd863294ede7ae98f31553c074eb6f87b34cfbf4a4396843a6e01373f91ea5dc |
| RULE-059 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4723ms | pass | child execution PASS; SHA 470f9e26c4244a66e7852adc74f070ed091a210d89b0216265bfedfd5cb9e4aa |
| RULE-060 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4762ms | pass | child execution PASS; SHA 7c5b29416b44585b12ad171a0de7827f1ee9fe9e1578dcf1952ef0507fe81c2f |
| RULE-061 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4775ms | pass | child execution PASS; SHA 6b5e677de10f18c50552dd59dc5271819f0305b29f109706c0873406535efbe8 |
| RULE-062 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4681ms | pass | child execution PASS; SHA ba45f39d5581f41baf4e84d6a807a64bb9750011e5478fc435b09fe52ba697cd |
| RULE-063 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4792ms | pass | child execution PASS; SHA d7988e28d7abac4f79c8f1450dbbd3161597b22efbb6c34fe756156892b702dd |
| RULE-064 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4737ms | pass | child execution PASS; SHA 7db8429e010dab1ce27b76dfabd1162d165bfab4c34cfd1af9c5aa2c15c7ffe6 |
| RULE-065 | /ops/rules; operator; 390×844 light; #dashVaQualityFilterInput → #opsRulesComposerSave; 4717ms | pass | child execution PASS; SHA 47a45f882fb29d0b5b5468c8f6d015c298642d10c4ab7579bacef3aac7eaf0c0 |
| RULE-066 | /ops/rules; operator; 390×844 light; #opsEventRuleTypeSelect → #opsRulesComposerSave; 4752ms | pass | child execution PASS; SHA 139a7e8bbea8ecb1099b40739429df40d952f1ecb373cea862c37e49d52afed0 |
| RULE-067 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4731ms | pass | child execution PASS; SHA e5185b33064cbfc4edf8e8a2ff753fa667ea7da81503d79de196238e4034598a |
| RULE-068 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4767ms | pass | child execution PASS; SHA 57c3751e487f0be8d4381b54f331200fc428870806df114ecb4ee28111fc97d2 |
| RULE-069 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4834ms | pass | child execution PASS; SHA 8f3b599191439bfb5b368cacfb903940c4902fc288851f2b6b53afcbbbc5bfda |
| RULE-070 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4795ms | pass | child execution PASS; SHA b52f0212798c666eb0c15b45e851975814c08d16ea9d15fc0e637dcf9070e2ee |
| RULE-071 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4771ms | pass | child execution PASS; SHA e47f9e0d0724f1c8ca7f537560b889afa03c4fe5b3e4c6a78ed10bd47417cb36 |
| RULE-072 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4746ms | pass | child execution PASS; SHA 9ee15bb7e3381c2904538e7843f54d2ce3525b3840e55282c2e0aeb790da10b6 |
| RULE-073 | /ops/rules; operator; 390×844 light; #opsRulesComposerSave → #opsRulesComposerSave; 4821ms | pass | child execution PASS; SHA 6c44b81780b962b6e91690e8b56c776be13ae8c7c38b3b3baa23ed868ffe1389 |
| RULE-074 | /ops/rules; operator; 390×844 light; #opsVaRuleTemplateSeedSelect → #opsRulesComposerSave; 4695ms | pass | child execution PASS; SHA 204283dce10b446dc08f35414de4f88c4d8245c0e17259b426fc86886316e87e |
| RULE-075 | /ops/rules; operator; 390×844 light; #opsRulesComposerSave → #opsRulesComposerSave; 4738ms | pass | child execution PASS; SHA 40f5fd61ff71ef7d264873386d4ad46cd55164b209cc272745d3e527835c9178 |
| RULE-076 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4789ms | pass | child execution PASS; SHA d511a69afd5df070bf1fc0e440be0ae89a917e65ec4ccffcf39d695033b6f496 |
| RULE-077 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4719ms | pass | child execution PASS; SHA 02435cac79a72abb125d2493c24fb7f9ad9921028c475346d683dc8ed6681c6d |
| RULE-078 | /ops/rules; operator; 390×844 light; [data-testid="ops-scenario-builder"] → #opsRulesComposerSave; 4755ms | pass | child execution PASS; SHA 86e7223cbbd48d97d6c6a3900b3488348379e0a164cd1e80399a35a4266ae30b |
| RULE-079 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4721ms | pass | child execution PASS; SHA 5b9b2df5d897b64002d585d171746feec187b6e671c4fb17e7c881bb9af84e06 |
| RULE-080 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4743ms | pass | child execution PASS; SHA 4f3c3c227cb53ced735132570bdfcd0ff3cba9f2a08528d3ad5b617018f2e953 |
| RULE-081 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4804ms | pass | child execution PASS; SHA 145dafc9b248e28d29a4a9414209ef9632cb41a6b0bf58fdc95032d4749f7def |
| RULE-082 | /ops/rules; operator; 390×844 light; [data-testid="ops-scenario-builder"] → #opsRulesComposerSave; 4745ms | pass | child execution PASS; SHA 7372bc85da85aef9c638ebd54cdf1a2d0fce68ee6d756c75c457c14b01252a41 |
| RULE-083 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4721ms | pass | child execution PASS; SHA d7f123f34e88c7711725eb36a77c9dd74d25c363af986504e9701f098e1e8918 |
| RULE-084 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4714ms | pass | child execution PASS; SHA e920d1271cf11deb97816651c2cdb59a088252809d4c2b152b8fe03266bf391f |
| RULE-085 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4809ms | pass | child execution PASS; SHA 74f27c20a0ecc544d56ffb8b4f91d40aedd539e611a485180ccdff1845cc0289 |
| RULE-086 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4777ms | pass | child execution PASS; SHA 57a96be5485cd204a8893b2da75ad3435f08077bf3f93df9c0729715edd20336 |
| RULE-087 | /ops/rules; operator; 390×844 light; #opsEventRuleLoiteringGroundPlaneToggle → #opsRulesComposerSave; 4725ms | pass | child execution PASS; SHA f221b1b67b0c96fa88a190655b4055ab240a832f0b7e4fab44a69fc882764165 |
| RULE-088 | /ops/rules; operator; 390×844 light; [data-testid="ops-scenario-builder"] → #opsRulesComposerSave; 4730ms | pass | child execution PASS; SHA 0b9b06becd1b2350d7305dce9ca773b20c2e7495f32fb203116275440821522d |
| RULE-089 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4775ms | pass | child execution PASS; SHA ef43a9670286dd91980081d69425e6edb218de92cd1b1de508661c01de1454cf |
| RULE-090 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4770ms | pass | child execution PASS; SHA a90e523161e80d0a97861f0245001b7198dccb9b2e2b85b9ff38f9ff42c4b79f |
| RULE-091 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4725ms | pass | child execution PASS; SHA 6a59980cdb381e6a24ee10826b0b920d2e9045fdd5cab196739582f0dcb43c3a |
| RULE-092 | /ops/rules; operator; 390×844 light; [data-testid="ops-incident-rule-suggestion-review"] → #opsRulesComposerSave; 4213ms | pass | child execution PASS; SHA 265dede604249133b872ab29702911fd91f2edaede2d4733a013245f9c12b52a |
| RULE-093 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 5452ms | pass | child execution PASS; SHA a47f3f31a7d4bd400186a8599c9777a1b7aeeb84dfee6b8a433ddfb717bd2524 |
| RULE-094 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 6008ms | pass | child execution PASS; SHA 532bfc518d13b82a9e748bb9988593b640a1d1400c15a65040c752d4bc5221ee |
| RULE-095 | /ops/rules; operator; 390×844 light;  → #opsRulesRefresh; 3558ms | pass | child execution PASS; SHA 4a4269aa8ff0ad45166b8aa8c8783fefcd060abc6ee8ed1d317b3495c4590148 |
| RULE-096 | /ops/rules; operator; 390×844 light; [data-testid="ops-incident-rule-suggestion-review"] → #opsRulesRefresh; 3929ms | pass | child execution PASS; SHA d171f1e2c56c1ca5d2b51658847333f79ea709d728f1db0377aa226eba8373ea |
| RULE-097 | /ops/rules; operator; 390×844 light;  → [data-testid="client-live-source-tree"]; 3864ms | pass | child execution PASS; SHA 6ca1c26e1732bf0ad71aba41e3c0dad2aaafedf0f8b9d5493986edb09676fee0 |
| RULE-098 | /ops/rules; operator; 390×844 light; #opsVlmRuleDraftKindSelect → #opsRulesValidationList; 2910ms | pass | child execution PASS; SHA b88028f89bfb845eafd7a53d9f3b7f33aa5f8c45414242e142c929c6229bc450 |
| RULE-100 | /ops/rules; operator; 390×844 light; [data-testid="ops-incident-rule-suggestion-review"] → #opsRulesComposerSave; 5658ms | pass | child execution PASS; SHA 2b5eb9d4e4b3c7c84c8b0f584e8737007a834bbfd6c435add57459eb8247070f |
| RULE-101 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → #opsRulesComposerSave; 5685ms | pass | child execution PASS; SHA 22242b416abae6071c8ef4b343a7d86506b72172af4a8e990ba167552ab0e93c |
| RULE-102 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSelect → #opsEventRuleTypeSelect; 2002ms | pass | child execution PASS; SHA 2fbc59e5fcc87327f0dfbcadf04320a5ebb3291b079c2e50530cbb304bc32a03 |
| RULE-103 | /ops/rules; operator; 390×844 light;  → #opsRulesRefresh; 10432ms | pass | child execution PASS; SHA deee4f1880f836431e5528e6a1b2a19dfa02bb574e40a2ffa7387b41bff268fe |
| RULE-104 | /ops/rules; operator; 390×844 light; #opsOperatorOutcomeMemoryRows → [data-approval-gated-rule-draft-route]; 2406ms | pass | child execution PASS; SHA fc949593c0347421b2124761e9efdb6300177fe67b4c6b34c9b9868cc72d9bbb |
| RULE-111 | /ops/rules; operator; 390×844 light; #opsVlmRuleDraftKindSelect → [data-vlm-rule-draft-index]; 2313ms | pass | child execution PASS; SHA c5ae264dac833774e61de87f52cd6ba088998a35a565b1d9e14930e1fa61159c |
| EVT-001 | /ops/dashboard; operator; 390×844 light; #dashRuntimeTrendSparkline → #dashRuntimeTrendSparkline; 2634ms | pass | child execution PASS; SHA d4bba997da97357b7c9ce39335c73bed7649eff62707d7bce4d366bbf989ea4f |
| EVT-003 | /ops/dashboard; operator; 390×844 light; #dashRootCauseActionOutput → #dashRootCauseList; 2441ms | pass | child execution PASS; SHA 05709b10906e4343f91d5f3ded6260e65a636fed08d710bef256c396827e0bed |
| EVT-004 | /ops/events; operator; 390×844 light;  → ; 3167ms | pass | child execution PASS; SHA 4f15e4c25154640c2337e7708c9dd7237b25a5bcdff5af727eba555ae9746623 |
| EVT-007 | /ops/events; operator; 390×844 light;  → ; 4294ms | pass | child execution PASS; SHA 84966c443bb701f3c5207bd9a225b60e86c79f7489caa341998610a38aa4730c |
| EVT-016 | /ops/events; operator; 390×844 light; #opsV320ResolutionTimeline → #opsV320ResolutionTimeline; 1997ms | pass | child execution PASS; SHA 0155f582127135aea8a654a15de9fc7d320c074b41bc2a113fb82d203597b9e8 |
| EVT-017 | /ops/events; operator; 390×844 light;  → ; 2077ms | pass | child execution PASS; SHA 5690df7bd5ab62a6471463af4e2fbbcb365c82411454877d138bd8e694b5c3a9 |
| EVT-018 | /ops/events; operator; 390×844 light; #dashRuntimeOpsList → #alertDeliveryTest; 3355ms | pass | child execution PASS; SHA aa2dc91ea4207af9551ee37a1f1cd6890eac4fb1ce6133817768d2e32f3c2131 |
| EVT-019 | /ops/events; operator; 390×844 light; [data-testid="ops-vlm-event-review-card"] → [data-testid="ops-vlm-event-review-card"]; 2157ms | pass | child execution PASS; SHA c73d8c6d7749d4107bca627c03eccf8d4e627c8c816e6ebef7a4b9cf0a78feb4 |
| EVT-020 | /ops/events; operator; 390×844 light;  → ; 2202ms | pass | child execution PASS; SHA 470698b9dd13e3b25b381ca98e7ea6ed4570b0846dfac1c3ca93a6740713ac69 |
| EVT-021 | /ops/events; operator; 390×844 light; #eventReviewRows → [data-event-review-save]; 3155ms | pass | child execution PASS; SHA 2bd15bf005fc705ec32c366373469cc74635bdc87bbd65bf18b81600f2843572 |
| EVT-022 | /ops/events; operator; 390×844 light; #dashRootCauseActionOutput → #event-review-audit-list; 2328ms | pass | child execution PASS; SHA 4e63191c305bd426a29c90f552bc7253d103dcc84e45b3db02a828f675b6b161 |
| EVT-023 | /ops/dashboard; operator; 390×844 light; #dashCommandWorkspaceLedgerList → #dashCommandWorkspaceLedgerList; 2325ms | pass | child execution PASS; SHA cfb0ec456efa6ed7b929199f7dbf6b650acdfee642e53d85b2476ad5f57cce6c |
| EVT-024 | /ops/dashboard; operator; 390×844 light; #dashRuntimeTrendSparkline → #dashRuntimeTrendSparkline; 3501ms | pass | child execution PASS; SHA 26d845803ec921f2d5b02ca4d7d83d9d9278b163c660821d0b083c3179449ba4 |
| EVT-025 | /ops/dashboard; operator; 390×844 light; #dashRuntimeTrendSparkline → #dashRuntimeTrendSparkline; 2153ms | pass | child execution PASS; SHA e15ae80b6555b629ff8fb026aab93886f2e64004c2a35c7c24e21bd5c0e596e7 |
| EVT-026 | /ops/dashboard; operator; 390×844 light; #dashRootCauseList → #dashRootCauseList; 2652ms | pass | child execution PASS; SHA 589abe9498ec15d695d9b6a525ce2d0790aff6a3e07bfa0582c46d71cf0cc70a |
| EVT-028 | /ops/events; operator; 390×844 light;  → ; 2036ms | pass | child execution PASS; SHA 27736f0803a07dc33fe94a2839f8bd162601d24030b4adc0405e05fd92aa6e5b |
| EVT-030 | /ops/events; operator; 390×844 light; #opsRulesReviewEventRecordLink → ; 2273ms | pass | child execution PASS; SHA ac32ac9e0d8aeaaea3c4eb51b14fcd1186f3ac75ec3243b34b20fdb06786c2c0 |
| EVT-031 | /ops/events; operator; 390×844 light; [data-testid="ops-vlm-event-review-card"] → [data-testid="ops-vlm-event-review-card"]; 2062ms | pass | child execution PASS; SHA ed01920336913abbd7bea28ce1ccbcee7075e2c16c11e898ad7e34b9fa98899a |
| EVT-036 | /ops/events; operator; 390×844 light; #opsRulesDetailPanel → ; 2006ms | pass | child execution PASS; SHA 20f6d184dee9b9afe6f8fe8f3ca0668fc97d0292436468f545ff8fb737489d67 |
| EVT-037 | /ops/events; operator; 390×844 light;  → [data-event-review-save]; 3185ms | pass | child execution PASS; SHA 8f03f6a387d6c4eadefc7851cd99b2d85dce788ae995daf567697a0eeb43a8b8 |
| EVT-038 | /ops/events; operator; 390×844 light;  → #alertDeliveryDryRun; 3344ms | pass | child execution PASS; SHA 9558b59cd68533b344223eed8d8e0f6537ef8908e62b876a66da1a1844900115 |
| EVT-041 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1571ms | pass | child execution PASS; SHA 0f6b607c0ace215e5202b3edfd30cb6e7010691c49f95cfe4b3ef2ba3868293c |
| EVT-042 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2229ms | pass | child execution PASS; SHA 3f940b0d2118c163c00a5f0f1c56b5a64211253a45267c6c8d732029c4a3860e |
| EVT-043 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1998ms | pass | child execution PASS; SHA d70add4937a70ea7f6558f6cb6a800915f5c658c6ab9f15ebfcccf40adebe10e |
| EVT-044 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2457ms | pass | child execution PASS; SHA b8e25e087a23d5780a49449df02a6a284568996130b4dd3405c46715bc15c95d |
| EVT-046 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1556ms | pass | child execution PASS; SHA b55d996b53f838d387fd09860168b07d39598b171e3256d05b1170617b6176c8 |
| EVT-047 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2069ms | pass | child execution PASS; SHA 7cf3dca4919c09051805f2811dfe805be9f0b11036c9e2476084f6d492db3587 |
| EVT-048 | /ops/dashboard; operator; 390×844 light;  → ; 2365ms | pass | child execution PASS; SHA c6041dc2e4bed061b08308404a658284af8eb524ddbc18c0bc9d483c736d8b2a |
| EVT-049 | /ops/events; operator; 390×844 light; #eventRecordsEvidenceSelect → #eventRecordsEvidenceSelect; 2422ms | pass | child execution PASS; SHA 09e7867e762662fb37a9fbeada1b690858e917c5fa849204839e2bd91793e8aa |
| EVT-050 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2243ms | pass | child execution PASS; SHA bd6eff0a27219dc410d730fbc92bb30653c2f6ffe6b95fed646b11b2cc513977 |
| EVT-051 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2031ms | pass | child execution PASS; SHA b92a36c6750a370057871702de8fa21b2eac9bbaef816cacf4f1ce23efecb665 |
| EVT-052 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2208ms | pass | child execution PASS; SHA bd6cec27b38167a1865b6d7fdbea41e193ae34186d5350a1e178c129f0273aa0 |
| EVT-053 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2053ms | pass | child execution PASS; SHA fd67be662430ecf0d9da74615692eebb30e956c79a5a78d76b83340f2529cb63 |
| EVT-054 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2248ms | pass | child execution PASS; SHA bf751015a5074296e25fd3408a22869a3501dc2478a7a8841e781c444743ffd8 |
| EVT-055 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2572ms | pass | child execution PASS; SHA c2d77b4c8e59138f4e10d817e9a692031f70d27fb763e282ce1092b93e48f144 |
| EVT-056 | /ops/events; operator; 390×844 light; #opsApprovalGatedRuleDraftReadinessRows → #opsApprovalGatedRuleDraftReadinessRows; 2126ms | pass | child execution PASS; SHA 29eb19c7267326b656fe9656b242b2d9fdf6bd98e1569078af01f58a31c232c0 |
| EVT-057 | /ops/events; operator; 390×844 light; #opsEvidenceIntakeFieldReadinessRows → ; 2268ms | pass | child execution PASS; SHA 0e07a24374102b6694b026671d649d5eefc534e0500d6fc7b57b88c7cc45c422 |
| EVT-058 | /ops/dashboard; operator; 390×844 light; #dashRuntimeTrendSparkline → #dashRuntimeTrendSparkline; 32022ms | fail | REQUEST_LIFECYCLE_FAILED; SHA 503e9798302bd80353ac66f95e11aeaf5a56c191a3f1946dd1b93f503f9c4ffe |
| EVT-061 | /ops/api/events/reviews; operator; 390×844 light;  → [data-event-review-save]; 3265ms | pass | child execution PASS; SHA 9a452837ad9894f962c328b3b27ed72beb794fdbe17212c4177777ee1726a3ff |
| EVT-064 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2337ms | pass | child execution PASS; SHA 42f874482006a56533c4513fc2db1f513bd0d8349f489cc52510a64bd8c438bb |
| EVT-065 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2231ms | pass | child execution PASS; SHA 13202496310397fc239923a9a9b795347e7cf6437034bf8dd8081d887a6c476c |
| EVT-066 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2409ms | pass | child execution PASS; SHA c5a906eae32fcb83dd959fa0dadd80120144c265f20023e3336fa7b96d59389a |
| EVT-067 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2094ms | pass | child execution PASS; SHA eae21b172675f2d3275b549b3431390fea06e6399bae2e11b01b0b113263e2bb |
| EVT-068 | /ops/api/events/reviews; operator; 390×844 light;  → [data-event-review-save]; 3138ms | pass | child execution PASS; SHA f46de5d801c960c8c858a3fdb5ffdb6464a6365381a8c785e3abf0b8f48f57a9 |
| EVT-069 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2036ms | pass | child execution PASS; SHA fd6ff25202ec2ad9f299e6250341d98c63a84152e9707c35d1624c3f0f71b48c |
| EVT-070 | /ops/events; operator; 390×844 light;  → ; 1538ms | pass | child execution PASS; SHA 1b34d2ee2ceef288dd0254df2a25d3d3b33da02d2b2f8f094cae43b26b9d947d |
| EVT-071 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2017ms | pass | child execution PASS; SHA e0c069e9e5360feb03ac6c72ab1684460ada7a94ba16a6193a8436b9e1bdb222 |
| EVT-072 | /ops/events; operator; 390×844 light;  → ; 2211ms | pass | child execution PASS; SHA 4b2d849a96264485f5bd18e4819367ed00064f5de0e793849f981ea3ac1ced80 |
| EVT-075 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2048ms | pass | child execution PASS; SHA d2a9bd4226a0a900a854edf18f197da550c67d8d88865c0a76d7d3ecc43c74d9 |
| CLIENT-001 | /client/live; viewer; 390×844 light;  → ; 1766ms | pass | child execution PASS; SHA d1a31be885d6a57698b1fb162b0294238c73c8059cb19c9525c39ba5e411095c |
| CLIENT-002 | /client/live; viewer; 390×844 light;  → [data-tile="0"] [data-action="toggle-playback"]; 3413ms | pass | child execution PASS; SHA 7a6956b4d837c7422cb93d6ac0e295d295db5c3ffffdf911e6dd8ebf1b147403 |
| CLIENT-005 | /client/live; viewer; 390×844 light;  → #liveAllStop; 3629ms | pass | child execution PASS; SHA 4bf77cf9db29a2e984a5cce35152aef3e740c3b39bcaa2785f5d846ceb104049 |
| CLIENT-006 | /client/dashboard; viewer; 390×844 light;  → ; 1763ms | pass | child execution PASS; SHA f2864e25272ba766e804a20505c2da9e30dd09527e4c78046b9351c1aab49803 |
| CLIENT-007 | /client/events; viewer; 390×844 light; [data-testid="${escapeHtml(testId)}"] → .client-viewer-events; 1846ms | pass | child execution PASS; SHA f0d97194cf75fcad6f489f63bba23728320e4653776ab37c1bbc5a04ef5a13b8 |
| CLIENT-009 | /client/live; viewer; 390×844 light;  → #liveSaveLayoutPreference; 2746ms | pass | child execution PASS; SHA 7f4b147c6603ffd92badd4a64cef965b817cb508dc9bac5b86616f166c6621e4 |
| CLIENT-010 | /client/live; viewer; 390×844 light;  → ; 1961ms | pass | child execution PASS; SHA ef494e1dc873963a51a088e74f7501009d0347df6dda431a6764b03aa2b2390e |
| CLIENT-011 | /client/live; viewer; 390×844 light;  → ; 1702ms | pass | child execution PASS; SHA c42d74335264f8179d512841a34c65899b4f38619538ed4801be1eaf2cda0a94 |
| CLIENT-012 | /client/live; viewer; 390×844 light;  → ; 1201ms | pass | child execution PASS; SHA 096be6019e9c2dacd260937a055cc6ad5d9a7bbf4f1a64ed7913e6cb5e8b80f6 |
| CLIENT-013 | /client/live; viewer; 390×844 light;  → ; 1212ms | pass | child execution PASS; SHA 12f87d8e30f3429fbd8f13412f374c1951bf9256f6c5c78568972c19c8589db1 |
| CLIENT-014 | /client/live; viewer; 390×844 light; [data-testid="client-live-dock-event-feed"] → ; 1236ms | pass | child execution PASS; SHA cc8dfbe17bdfad2ed559ba964bfa8732ad6803349af5d5011f2f67c78a387d9b |
| CLIENT-015 | /client/live; viewer; 390×844 light;  → ; 1274ms | pass | child execution PASS; SHA df025201106475aa270a2f4624a76174ad1483fea345faf8e11173f448aa8721 |
| CLIENT-016 | /client/live; viewer; 390×844 light;  → ; 1257ms | pass | child execution PASS; SHA ca5ede2443c05c51e9601cc73e51a5c67f083f903a07190e5ff7e874914593a0 |
| CLIENT-017 | /client/live; viewer; 390×844 light; [data-testid="client-live-va-overlay-toggle"] → ; 1309ms | pass | child execution PASS; SHA 614dd1067beb49c60151163bb364300a2236200e7b3c94c8a87901c2219eb36f |
| CLIENT-018 | /client/live; admin; 390×844 light; [data-testid="client-dashboard-shell"] → .client-preview-redaction-strip; 1818ms | pass | child execution PASS; SHA 322e2bce9c3da24be40d0f35366be56fd17f370d368117297bb49a1ea2139219 |
| CLIENT-019 | /client/live; viewer; 390×844 light;  → ; 2156ms | pass | child execution PASS; SHA 5753035dc506917f8bf7b389b366e4db22864409a6005458ce6058d69ae6455d |
| CLIENT-020 | /client/live; viewer; 390×844 light;  → ; 2605ms | pass | child execution PASS; SHA 5082a2b8a789946ee16203fd78012adb58fb85f484539a8788246b984f0a2161 |
| CLIENT-021 | /client/live; viewer; 390×844 light; [data-testid="client-safe-followup-digest"] → [data-tile="0"] [data-mode-action="va-overlay"]; 3534ms | pass | child execution PASS; SHA 18705af5bbc00703d4380a6c0b254bd3c998f9932ac46e30b29b1407c76e95ad |
| CLIENT-022 | /client/live; viewer; 390×844 light;  → ; 1714ms | pass | child execution PASS; SHA e76a1a91ea4c883f3d2b47afcb0d5ba4e07be60045a59f989002a6ee71fe4316 |
| CLIENT-023 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-safe-incident-digest"] → [data-testid="client-safe-incident-digest"]; 1886ms | pass | child execution PASS; SHA dbe09cd903893ef61905d50dfab00f3d072f35d8e3e8f1eb6be80793506bde7c |
| CLIENT-024 | /client/live; viewer; 390×844 light;  → ; 1906ms | pass | child execution PASS; SHA 7ddff8a3870949533b134e5fc7442fe1af33bfdbb6f593ab4e48eb1bc83d1d93 |
| CLIENT-025 | /client/events; viewer; 390×844 light; [data-testid="client-safe-event-digest"] → [data-testid="client-safe-event-digest"]; 1875ms | pass | child execution PASS; SHA 6d4a47225dfad613204932652a609d4ada0122998dae124bc1a27856ea9a4c41 |
| CLIENT-027 | /client/live; viewer; 390×844 light; [data-testid="client-safe-resolution-digest"] → [data-testid="client-safe-resolution-digest"]; 1908ms | pass | child execution PASS; SHA 9e03737a09a8e28f9d2e9b2f5760dfa80a17c15cc58875033ebf10458e28160f |
| CLIENT-028 | /client/live; viewer; 390×844 light; [data-testid="client-safe-source-status-digest"] → [data-testid="client-safe-source-status-digest"]; 1945ms | pass | child execution PASS; SHA 5b56bc9f5b24f7c83664c5b4687978287051e986e1f0d0b84dc0d9845e180cc4 |
| CLIENT-029 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-safe-maintenance-digest"] → [data-testid="client-safe-maintenance-digest"]; 1878ms | pass | child execution PASS; SHA d47f6406de3918f193a8e9eea96c397030484de8157498c63f8b62a88bbc6fb6 |
| CLIENT-031 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-impact-forecast"] → [data-testid="client-impact-forecast"]; 1873ms | pass | child execution PASS; SHA 4ceac318ac03bc22f04edf675c4ff500d89e05e8f3207d14cdbc70ede9707188 |
| CLIENT-032 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-operations-notice"] → [data-testid="client-operations-notice"]; 1877ms | pass | child execution PASS; SHA 584077d950c5ac6c34f615f832248a233930d7c721e2a3e27fa35df00c2dc3e8 |
| CLIENT-040 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-action-notice-preview"] → [data-testid="client-action-notice-preview"]; 1862ms | pass | child execution PASS; SHA 07c1556400e9e5845d1045c89199164fa463ae69c19562ef6e92d7b45cac9851 |
| CLIENT-041 | /ops; operator; 390×844 light;  → ; 1801ms | pass | child execution PASS; SHA 74e737a55eff9b17c2ab481263d8d4a85bcaa359059b909631bc4cd7db8c8a61 |
| CLIENT-042 | /ops; operator; 390×844 light;  → ; 1225ms | pass | child execution PASS; SHA 63345e2af8634d6bc9d01fd3dedaf93492d075c01662f07bf5402fb1789a95b3 |
| MEDIA-016 | /client/live; viewer; 390×844 light;  → ; 2111ms | pass | child execution PASS; SHA ac282d37ffe0d96cae83e3507e5bfdd77b77303262fc300fddf962d7f8c39475 |
| MEDIA-017 | /client/live; viewer; 390×844 light;  → ; 3779ms | pass | child execution PASS; SHA 490c8d5dbad485ef3d42c23e862009cc96e3cfee8c96393a22a605e4dde2d6d6 |
| SAFE-015 | /ops; operator; 390×844 light;  → ; 1339ms | pass | child execution PASS; SHA 4a424cc5161d0c309ef007e79e9d529ee88804b21fea61b6f293a87bf32ec73a |
| SAFE-016 | /ops; operator; 390×844 light;  → ; 1056ms | pass | child execution PASS; SHA 1ae62d2ef15b3761a19998833feb2e0365b66a692de68f94504824b2b7d1b1d1 |
| SAFE-017 | /lab; operator; 390×844 light;  → ; 1063ms | pass | child execution PASS; SHA 547f8800e2a036c63116cd62064fd0490ad38201751c6ac97ca99a23f0de165d |
| SAFE-018 | /client/live; viewer; 390×844 light;  → ; 1226ms | pass | child execution PASS; SHA bd1f47ca6075d6d9e17e294249c73180303b7bdf36aeada9a7d29ca523580ac5 |
| SAFE-019 | /ops; operator; 390×844 light;  → ; 1296ms | pass | child execution PASS; SHA c5f79ac02f78c4e68d196a1ca4156dfa3184bc0e8fcb1af23b63d5dd447f919b |
| SAFE-020 | /ops; operator; 390×844 light;  → ; 1750ms | pass | child execution PASS; SHA 530c3135afee8451d257416079acdb6cc035b328df0167ee77cd8bda93b25b08 |
| SAFE-021 | /ops; operator; 390×844 light;  → ; 1797ms | pass | child execution PASS; SHA e1cf9c5bbedc5ede8c8dfce6215857dcbe6d380958746ae0badfc96476952839 |
| SAFE-024 | /ops; operator; 390×844 light;  → ; 1848ms | pass | child execution PASS; SHA f4a1ba4b7ae97e7e70877772a66bbe75345d802161196cce90a4dceacc3a14fe |
| SAFE-028 | /ops; operator; 390×844 light;  → ; 1301ms | pass | child execution PASS; SHA b3ca7765f5f4af107b5db651cea0b50a61d0491b6ede8eef32dfc9ca302bfd75 |
| SAFE-031 | /client/live; viewer; 390×844 light;  → ; 1266ms | pass | child execution PASS; SHA 31e4a915a603a3ab60ac6c9dcc3adc66b80c2db4045cdfbedba1f9dfed647cf8 |
| SAFE-033 | /ops; operator; 390×844 light;  → ; 1942ms | pass | child execution PASS; SHA 2bd31953c817578173d2c41ed76f0ca221739ef80c7aeaf55789f14d3408bfe8 |
| SAFE-038 | /ops/rules; operator; 390×844 light; #opsVlmRuleDraftKindSelect → [data-vlm-rule-draft-index]; 2154ms | pass | child execution PASS; SHA e6e94ebca65a00d1f6b1386e4b10d0ebd441ece92f03698e68838121be47cbfc |
| SAFE-041 | /ops/api/audit; admin; 390×844 light;  → ; 2116ms | pass | child execution PASS; SHA d8ebb49ef71e36d2421f66d5305c9ee0dd2f85fea1029bf13800cda254af480f |
| SAFE-042 | /ops; operator; 390×844 light;  → ; 1805ms | pass | child execution PASS; SHA a8ea0e3dd11cc2e23c1ecd43dd35a7081a0b64402bf3ba39774bf94433b21136 |
| SAFE-045 | /ops/events; operator; 390×844 light;  → ; 1234ms | pass | child execution PASS; SHA 52ed6ceb4a22d41495c9ddcfd461b5ee7bb70e3c81c8f87ac3038240b9b721f7 |
| SAFE-046 | /ops; operator; 390×844 light;  → ; 1828ms | pass | child execution PASS; SHA e2c0f71710fef1ec4477d2e58fc4d4a6844741e0cdaeabf434c2a6a52e7ef405 |
| SAFE-047 | /ops; operator; 390×844 light;  → ; 1804ms | pass | child execution PASS; SHA 702a64ebb3a8131d6e24bfb3b1c8610f52fc99dd91d46e36f576a85e0e713be7 |
| SAFE-048 | /ops; operator; 390×844 light;  → ; 1851ms | pass | child execution PASS; SHA db2fd0b0238524fb200b1bd94c9ae60cb8bb1da0edf94e6a4b19c7cc0f94b266 |
| SAFE-049 | /ops; operator; 390×844 light;  → ; 1837ms | pass | child execution PASS; SHA de7aa03b6ef6f76aa1f46034a90363342072f93793a04ff909df0db8905ea50e |
| SAFE-050 | /ops; operator; 390×844 light;  → ; 1239ms | pass | child execution PASS; SHA a1ab0b4bfd0aa46f5dd580be292d13a711399120f2bb2824a2f21cccd73cfe38 |
| SAFE-052 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 2327ms | pass | child execution PASS; SHA f2f5e6406591a3e18fc6aecc1342eac5a1fd9c84bdd350ce30fcbd27d81498b3 |
| SAFE-053 | /ops/events; operator; 390×844 light; #opsEventRulePresetSelect → [data-incident-rule-draft-route]; 1981ms | pass | child execution PASS; SHA 9f01c6fb28b70ef2e9e09e16867871dc6ad1c73aabb6e5713fb83ae9c138037d |
| SAFE-054 | /ops; operator; 390×844 light;  → ; 1259ms | pass | child execution PASS; SHA 3fcec983572dbaf53c720516bfebb15e69c7b42bd62422b6ecd2b668be5a4233 |
| SAFE-055 | /ops; operator; 390×844 light;  → ; 1786ms | pass | child execution PASS; SHA 06c93e1712c99791859b30926c7de5d03791f3a83c42d3b3b69ccf1d85e4ed6d |
| SAFE-056 | /ops; operator; 390×844 light;  → ; 1769ms | pass | child execution PASS; SHA c9749157a49f84c53e1f766165fe9e40fc4f4a3549d0828f5486812c6eb75224 |
| SAFE-058 | /ops/events; operator; 390×844 light;  → ; 1998ms | pass | child execution PASS; SHA d021746444dcbc6527988aef734dacecc8ce71788116c1e27e7fd784fcc4efe3 |
| SAFE-059 | /ops/events; operator; 390×844 light;  → ; 2031ms | pass | child execution PASS; SHA 23edb4ec733a454413b73a909d7f325752de6528fe9139347e671cc188773e6a |
| SAFE-060 | /ops/events; operator; 390×844 light; #dashRuntimeOpsList → [data-testid="ops-operational-action-pack"]; 1851ms | pass | child execution PASS; SHA 789581fc66581b18751a2af26941d111ae2172f26126a2a43bf0230bc9e90bd7 |
| SAFE-061 | /ops/events; operator; 390×844 light; #opsEventRulePresetSelect → [data-testid="ops-rule-what-if-preview"]; 1957ms | pass | child execution PASS; SHA 2306bd9b7ea0e0d38cfb779655e68757bbe887ee30e5e0215eb358677fefb4e9 |
| SAFE-062 | /ops; operator; 390×844 light;  → ; 1876ms | pass | child execution PASS; SHA 4a583f67f8a15dded655647da686e575b72fb684c83e7f89a159ad8a94e74892 |
| SAFE-065 | /ops; operator; 390×844 light;  → ; 1836ms | pass | child execution PASS; SHA 2863e93acd2fa127a3c52e59b1d4db1875a6b46f54556617391a6c0352a02c15 |
| SAFE-066 | /ops; operator; 390×844 light;  → ; 1781ms | pass | child execution PASS; SHA bd1a801211ad38a527053d9ab5392de9e7ad5b507e8d886cf572cc3cbb7994bb |
| SAFE-067 | /ops; operator; 390×844 light;  → ; 1800ms | pass | child execution PASS; SHA af2f22a07f7d9ceeb5c4326204608ea7bac3c5684de8c6eef423a66ea4c9e3b0 |
| SAFE-068 | /ops; operator; 390×844 light;  → ; 1815ms | pass | child execution PASS; SHA 6cb36a88e4d7bd78e8eb1201a7d8aad38523f863ff4d5845450895e3829c5917 |
| SAFE-069 | /ops; operator; 390×844 light;  → ; 1905ms | pass | child execution PASS; SHA be9cda5a21a38310704d1ec8ca74ea5d73148dd8dfc75b32120c1e0401e92f77 |
| SAFE-098 | /ops; operator; 390×844 light;  → ; 1838ms | pass | child execution PASS; SHA be621e0090096586d50fd802d29c0c034d0f48bf47539ecef58b56d55e52646d |
| SAFE-104 | /ops/events; operator; 390×844 light;  → ; 1294ms | pass | child execution PASS; SHA 49248fcaa51c2eb7911b6b0df6e89601b3353bc623efc342967091a254bf09fa |
| SAFE-105 | /ops; operator; 390×844 light;  → ; 1791ms | pass | child execution PASS; SHA 4c11910e82738e39e769942c5986b3b562a1b7dca2b112d4383765e7737c88fb |
| SAFE-106 | /ops; operator; 390×844 light;  → ; 1809ms | pass | child execution PASS; SHA 14330b81be6183bb2adbfe7da1f122bd7c33c0b17b37778a709570bf58ab9fd6 |
| SAFE-107 | /ops; operator; 390×844 light;  → ; 1768ms | pass | child execution PASS; SHA 93b94499f2c99521b3c63c54d781b4cb3fa9612d5b460ed772988246a17793f4 |
| SAFE-108 | /ops; operator; 390×844 light;  → ; 1793ms | pass | child execution PASS; SHA a785a2a001cd69ba904ccead2dd7204dcbd02acc17e1ba8bab0b34ef94f21a02 |
| SAFE-109 | /ops; operator; 390×844 light;  → ; 1814ms | pass | child execution PASS; SHA dee0f8a852da7a2eb8d95297a69f70b7fd41eee0ac043d59ef81707af2e8e446 |
| SAFE-110 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-safe-resolution-digest"] → ; 1783ms | pass | child execution PASS; SHA 301c86aa71986789b102b3f0e5200469c9bdab48b4a9d4e9d6f31000f164b5b1 |
| SAFE-111 | /ops; operator; 390×844 light;  → ; 1820ms | pass | child execution PASS; SHA c8194220a2efdc64f9fc118adc1126099ef9a75b2ee76b4cd8db6888f15cd68a |
| SAFE-117 | /ops; operator; 390×844 light;  → ; 1783ms | pass | child execution PASS; SHA e7dbe3ef68561ffe7a0e5ce30c30b96c67786113e586c1bb84058738e669ff9f |
| SAFE-118 | /ops; operator; 390×844 light;  → ; 1794ms | pass | child execution PASS; SHA 74cd48a0edf203ad5e0ca20d0050c12a1a85a24b09ffa6cebcf4463eb17413df |
| SAFE-119 | /client/api/views/{id}/events; viewer; 390×844 light;  → ; 1790ms | pass | child execution PASS; SHA 3b69b3398962755051d7f8ed99135acd1393beca53fd77fdf7098de3cbc95dbb |
| SAFE-121 | /ops; operator; 390×844 light;  → ; 1779ms | pass | child execution PASS; SHA d4c3f616ad6f53081731be7a6325cf2fbbd79cddb467d8612b5fe0bf6c0ed58c |
| SAFE-122 | /ops; operator; 390×844 light;  → ; 1779ms | pass | child execution PASS; SHA bdf2d37f091f314e12c25b79e5db72b96fd1dd0cf0694e6d28199a79d3215063 |
| SAFE-129 | /ops/sources; operator; 390×844 light;  → ; 1762ms | pass | child execution PASS; SHA 4bc9a665fbdbb9f7fb66c8f750bc34843d6cce8031e7e3243046ce5c8fc3afa1 |
| SAFE-130 | /ops; operator; 390×844 light;  → ; 1824ms | pass | child execution PASS; SHA 40b156bd65475b1239593183b599bb3991d379d3d42a6edf4d6bf98e0b0b3de6 |
| SAFE-131 | /ops; operator; 390×844 light;  → ; 1878ms | pass | child execution PASS; SHA 5fcd9f3198325cb29fe1ced989de4ca265e19a58409e7ffee58c71cbb39448aa |
| SAFE-132 | /ops; operator; 390×844 light;  → ; 1796ms | pass | child execution PASS; SHA 7441dcec110e11de7c7f82ed6e1f4c3178886ff5092aac2089a46b401df9ecba |
| SAFE-138 | /ops/events; operator; 390×844 light; #opsEventRulePresetSelect → ; 1229ms | pass | child execution PASS; SHA 1f2f49c172804aee20736d80b0c03102b9f9aa89ae9cc83615e0487ac7e4b73f |
| SAFE-140 | /ops; operator; 390×844 light;  → ; 1784ms | pass | child execution PASS; SHA 164bf74be6b202b8370c1111bebec4af0da0f7fd600c89d72b411dc7e562fdf3 |

## 원본 결속

| 파일 | bytes | SHA256 |
| --- | ---: | --- |
| summary.json | 62126 | 8ddc5a2681e7d705e83c43a11e58ba70f71d23c53e1752783b78f2cc81a1e8e4 |
| test-run-summary.json | 97564 | 2d8f7ad0045971e240c84184e72bf1458bfafd820fc7dcad1aea01acdc48ccd6 |
| runs/v390-test-acceptance-20260911052110-85870/ui-final-integrity.json | 2441 | 7f97f9884b4003f8aa4d52c11027ece355e7d4d81259101b7cb518018681d401 |
| runs/v390-test-acceptance-20260911052110-85870/ui-exact-424/summary.json | 502884 | f213651452a5527f689e1c2dc533ea06ee3906411dc2a05cc7fe818ccb61c99f |
| runs/v390-test-acceptance-20260911052110-85870/ui-server-cleanup.log | 2059 | 032a373899d3010eb616d0a84113190c03298891ac70326e99381ad3d99b19c2 |
| runs/v390-test-acceptance-20260911052110-85870/cleanup.log | 827 | ddd749b92f9877ea3b3a52b1b5ca5066def738e83fdf8fc68945288df5188f7c |

## 정리 상태

## 후속 단일 진단 사전조건 실패

명령: `node scripts/internal/run_v390_ui_native_diagnostic_sweep.mjs --case-id EVT-058 --output-dir .media_server.test/v3.9.0/ui-diagnostic-sweep/s09-evt058-1789106562662` (설치된 Playwright/Chrome 경로 명시).
시작1789106562662, 종료1789106563551, elapsed889ms, exit1. UI 브라우저·서버·컴파일 미실행.
원본 summary는 `diagnostic-current-source-build-failed`, `DIAGNOSTIC_CURRENT_SOURCE_BUILD_FAILED`, actualBrowserExecution=false다.
main이 `buildCurrentSourceBoundBinary`를 확인했으며 첫 clean-worktree assertion이 spawnSync(build)보다 먼저 실패했다. 제품 빌드 실패로 해석하지 않는다.
summary SHA256: `c656c27c6305e27752e51cd7c271ea506a507cba2f618b6aeb85d34727e76203`.
token start7322309/end7340216/차이17907은 진단 준비·후처리를 포함한 goal 전체 차이이며889ms 테스트 단독 사용량이 아니다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| EVT-058 진단 사전조건 | clean current-source worktree 요구를 미충족하여 exit1 | fail | 실제 UI·컴파일 전에 중단; 사전확인 누락 |
| EVT-058 실제 UI | 브라우저 action 미실행 | fail | 사전조건 실패로 건너뜀; PASS 근거 없음 |
| 격리 실제 재현 | 새 runtime 기동 미실행 | fail | root 설정의 actual runtime 검증을 대체하지 않음 |

이 진단 생성물3파일14011755bytes 및 capture2파일424bytes는 값 이관 후 정확 경로·크기를 재확인해 삭제했고 부재를 확인했다. 실제 녹화 기본 경로는 생성되지 않았다. 커밋 조건을 우회하지 않고 진단 준비 변경을 먼저 커밋해야 재개할 수 있다.

최종 보정: 아래 초기 정리 문장은 당시 상태 기록이다. 이후 메인이 권한을 갖춘 ps/lsof로 서버 PID84796/86459·포트55094/55095·DB 열린 핸들 부재를 확인했다. 모든424 summary SHA와 실패 파일 복사본 SHA를 대조했다. capture25129bytes, UI출력152603313bytes, 빈 recordings131072bytes를 정확 경로로 삭제하고 부재를 확인했다. runtime root도 부재다. 정리 완료이며 테스트 판정 FAIL은 변하지 않는다.

보존 정책 정정: 실패 trace707719bytes와 화면·콘솔은 원본 SHA 대조 후 공개 후보에서 제외하고 gitignore된 .media_server.test/v4.1.0/s09-evt058-diagnostic-source/로 이동했다. 진단 중 임시자료이며 최종 증거 링크가 아니다. 필요한 값만 이 문서로 이관한 뒤 삭제한다. credential 패턴0건, 실패화면 직접확인. 원시자료 정리는 진단 종료까지 미완료다.

runner 기록: PID86459 종료, 포트55094/55095 해제, 소유 runtime root1462336bytes 삭제 후0. 메인 ps 조회는 sandbox에서 거부되어 성공으로 기록하지 않는다. 전체 output1853파일/152603313bytes, capture root, 기본 recordings의 최종 보존·삭제는 진행 중이며 cleanup 완료 아님. 실패 화면은 메인이 직접 확인했으나 전체 시각 검수는 미완료.
