# VLM 로컬 연결 smoke

개발자가 Ollama·OpenAI-compatible 응답 형식과 실패 처리를 확인하는 검증기 안내입니다.
`verify-vlm-local-runtime-smoke`는 자체 HTTP fixture 서버를 `127.0.0.1`의 임의 포트에 열고 실제 요청을 보냅니다.
MediaServer 제품 서버나 설치된 Ollama/vLLM, 사용자 모델은 실행하지 않으며 외부 endpoint 옵션도 없습니다.
[프로필 opt-in metadata](vlm-runtime-opt-in-contract.md)나 Ops의 준비 상태 표시를 실제 모델 연결 결과로 해석하지 않습니다.

## 실행

loopback 실행을 승인받은 환경에서 Node.js와 사용 가능한 로컬 포트가 필요합니다.
먼저 [소유 결과 경로](vlm-runtime-opt-in-contract.md#실행-자료-경로-준비)를 준비합니다.

```sh
: "${vlm_run_root:?이번 실행의 소유 절대 경로를 먼저 준비하세요}"
TMPDIR="$vlm_run_root/tmp" ./server.sh verify-vlm-local-runtime-smoke \
  --report "$vlm_run_root/local-runtime.md" \
  --json-report "$vlm_run_root/local-runtime.json"
```

두 보고서 옵션은 선택 사항이며 생략하면 stdout 요약만 남습니다. 검증기는 별도로 `TMPDIR` 아래에
일시적인 JSON readback 파일을 쓰고 정리합니다. 사례별 `AbortController`와 `finally`로 요청 timeout,
검증기 내부 queue counter, fixture 서버 종료를 처리합니다. 이는 제품 분석 queue나 실사용 runtime의 정리 검사가 아닙니다.

## 사례와 기대값

[cases.json](../test/fixtures/vlm_local_runtime_smoke/cases.json)은
`media-server.vlm-local-runtime-smoke-fixtures.v1`, `targetStep=V210-S02` 형식의 현재 fixture입니다.
예상 성공 사례와 오류 사례 모두 테스트 정의이며 과거·이번 실행 결과가 아닙니다.

| 사례 ID | 요청·상황 | 기대 `outcome` |
| --- | --- | --- |
| `ollama-loopback-chat-pass` | Ollama 형태의 `/api/chat` | `connected-structured-output-accepted` |
| `vllm-openai-compatible-pass` | OpenAI-compatible `/v1/chat/completions` | `connected-structured-output-accepted` |
| `api-compatible-local-pass` | 같은 API의 합성 응답 | `connected-structured-output-accepted` |
| `missing-runtime-fallback` | 예약 후 닫은 포트로 연결 실패 | `blocked-missing-runtime` |
| `timeout-queue-cleanup` | fixture 응답을 timeout보다 늦게 반환 | `timeout-cleanup-ok` |
| `invalid-output-fallback` | content의 structured JSON이 잘못됨 | `rejected-invalid-output-no-sidecar-write` |

요청의 모델명은 합성 식별자 `media-server-local-vlm-fixture`이고 영상·source URL·credential은 보내지 않습니다.
응답 content는 `media-server.vlm-local-runtime-output.v1`, `status=ok`, 문자열 `eventExplanation`,
`sideEffects.sidecarWritten=false`를 검사합니다. 실제 모델의 설명 정확도나 모든 출력 필드를 평가하는 schema validator는 아닙니다.

## 보고서와 실패 판정

JSON schema는 `media-server.vlm-local-runtime-smoke-report.v1`입니다.
`status`, `targetStep`, `generatedAt`, `fixturePath`, `scope`, `summary`, `cases`, `checks`를 포함합니다.

- `scope.runtimeBoundary=loopback-fixture-only`, `actualLocalHttpRoundtrip=true`는 이 검사의 실행 범위입니다.
  중간 실패 시 이를 모든 사례의 완료 증거로 읽지 말고 `status`·`checks`·`cases`를 함께 확인합니다.
- 같은 `scope`의 `actualUserModelQualityChecked=false`, `cloudProviderApiCalled=false`,
  `providerCredentialStored=false`, `sidecarWritten=false`, `eventOrMetadataSchemaChanged=false`,
  `mediaPathChanged=false`는 모델 품질·외부 호출·저장·schema/미디어 변경이 검사 범위 밖임을 명시합니다.
- 각 사례는 `status`, `outcome`, `expectedOutcome`, `runtimeConnected`, `structuredOutputAccepted`,
  `statusCode`, `queueCleanup`, `serverCleanup`, `credentialHeaderSeen`, `sideEffects`를 기록합니다.
- 현재 기대 집계는 연결 3개, missing runtime·timeout·invalid output 각각 1개입니다.
  각 사례의 queue/server cleanup은 `cleanup-ok`, credential header 관측은 false, side effects는 빈 배열이어야 합니다.
- `summary`는 `cases`, `connectedCases`, `missingRuntimeCases`, `timeoutCases`, `invalidOutputCases`, `cleanupOk`입니다.
  검사 실패는 최상위 `status=fail`과 비정상 종료로 전달됩니다. 예상 timeout 사례의 `status=pass`는 오류 처리 통과이지 모델 호출 성공이 아닙니다.

## 검증 경계와 관련 기준

[검증기](../scripts/internal/verify_vlm_local_runtime_smoke.mjs)의 `runCase`·`invokeRuntime`·`startFixtureServer`는
실제 loopback 동작을, 별도 source 검사는 Event POST/EventRecord·viewer/client 비노출 연결을 확인합니다.
fixture의 false flag만으로 운영 서버 전체의 무변경을 동적으로 입증했다고 주장하지 않습니다.
기능 ID는 [inventory](project-feature-test-inventory.md)의 `LAB-056`·`SAFE-034`입니다.
현행 구현 증거에서 `LAB-056`은 이 하위 smoke의 readback, `SAFE-034`는 상위
`verify-v230-vlm-opt-in-operational-evidence`의 비밀·side-effect 경계 readback에 연결됩니다.

이 명령은 credential/prompt/raw response/source URL/raw frame을 결과에 저장하지 않고,
VLMObservation sidecar 저장이나 Event POST/WebRTC DataChannel/SSE/WS metadata·RTSP/WebRTC media path 변경을 수행하지 않습니다.
모델/runtime 설치·다운로드·bundle, 실제 모델 품질·latency, [cloud provider 성공](vlm-cloud-provider-field-smoke-gate.md),
UI 풀테스트·장시간 검증을 대신하지 않습니다. 개인정보 기준은 [전송 guard](vlm-privacy-transfer-guard.md)를 따릅니다.

`verify-vlm-test-rehearsal`은 별도 리허설 명령이며 이 HTTP smoke와 같은 실행 증거가 아닙니다.
`verify-v230-vlm-opt-in-operational-evidence`가 이 smoke를 자식으로 실행하므로 그 묶음 역시 loopback 실행입니다.
승인·미실행·결과 보존 기준은 [공통 검증 안내](vlm-runtime-opt-in-contract.md#검증과-결과-해석)를 따릅니다.
