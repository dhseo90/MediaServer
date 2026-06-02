# Runtime/Model Bundle RC Rehearsal

이 문서는 `v2.1.0 V210-S11 Runtime/model bundle RC rehearsal`의
source-of-truth입니다. 실제 binary/runtime/model bundle을 만들거나 release asset을
업로드하지 않고, 향후 RC에서 runtime/model 포함 배포를 검토할 때 필요한 차단 조건과
evidence 구조만 rehearsal합니다.

## 직접 답

v2.1.0 기본 release에서 쓰기로 한 배포 형태는 계속 `source-only`입니다.
runtime/model bundle, ONNX Runtime package, FFmpeg/GStreamer GPL-risk runtime,
YOLO/Re-ID/VLM model artifact, release asset 업로드는 이번 S11에서 선택하지
않습니다.

S11의 1차 gate는 `./server.sh verify-runtime-model-bundle-rc-rehearsal`입니다.
이 gate는 `media-server.runtime-model-bundle-rc-rehearsal-fixtures.v1` fixture로
source-only 기본값, no-runtime/no-model dry-run 후보, blocked runtime/model 후보,
GPL-risk binary exclusion, hash/provenance/license/source-offer 조건을 확인합니다.

## 결정값

| 항목 | 결정 |
| --- | --- |
| 기본 release | source-only source/doc release |
| 1차 bundle 후보 | 없음. 실제 bundle release를 만들지 않음 |
| RC rehearsal 후보 | local-binary, offline-package, container-root shape만 dry-run 가능 |
| fallback | source-only 유지 |
| blocked 후보 | runtime/model 포함 bundle, GPL-risk runtime 포함 bundle, model provenance/hash/license 누락 후보, release asset 업로드 |
| release asset 업로드 | 금지. GitHub 자동 source archive 외 binary/runtime/model asset 없음 |
| hash/provenance/license | dependency snapshot, bundle policy report, source offer checklist, model card/license/checksum manifest가 모두 있어야 별도 RC 검토 가능 |

## Fixture Matrix

`test/fixtures/runtime_model_bundle_rc_rehearsal/cases.json`는 아래 case를 고정합니다.

| case | 의미 |
| --- | --- |
| `source-only-default-pass` | source/doc release가 기본값이며 runtime/model asset을 만들지 않음 |
| `local-binary-no-runtime-model-rc-only` | binary shape은 RC rehearsal만 가능하고 기본 release asset은 아님 |
| `offline-package-no-runtime-model-rc-only` | offline package shape은 runtime/model 없이만 rehearsal 가능 |
| `container-root-no-runtime-model-rc-only` | container root shape은 사용자 설치 runtime/model 전제로만 rehearsal 가능 |
| `runtime-model-included-blocked` | ONNX Runtime/model artifact 포함 후보는 기본 release에서 blocked |
| `gpl-risk-runtime-binary-blocked` | FFmpeg/GStreamer GPL-risk runtime 포함 후보는 blocked |
| `missing-hash-provenance-license-blocked` | hash/provenance/license/source-offer evidence 누락 후보는 blocked |
| `release-asset-upload-blocked` | binary/runtime/model release asset 업로드는 blocked |

## 실행 절차

```bash
./server.sh verify-runtime-model-bundle-rc-rehearsal \
  --report /tmp/media_server_runtime_model_bundle_rc_rehearsal.md \
  --json-report /tmp/media_server_runtime_model_bundle_rc_rehearsal.json
./server.sh verify-bundle-policy \
  --output /tmp/media_server_bundle_policy.md \
  --json-output /tmp/media_server_bundle_policy.json
./server.sh verify-release-bundle-dry-run --candidate source-only
./server.sh dependency-snapshot \
  --stable \
  --no-linked-libs \
  --output /tmp/media_server_dependency_snapshot_s11.md \
  --json-output /tmp/media_server_dependency_snapshot_s11.json
git diff --check
```

`verify-release-bundle-dry-run --candidate source-only`는 실제 release asset을 만들지
않는 dry-run workspace입니다. local-binary/offline/container 후보는 별도 RC에서만
확대 실행하며, runtime/model 포함 후보는 `verify-bundle-policy` negative fixture와
이 문서의 blocked case로만 확인합니다.

## Report Schema

`media-server.runtime-model-bundle-rc-rehearsal-report.v1` report는 아래를 포함해야 합니다.

- `targetStep=V210-S11`
- `defaultReleaseBoundary=source-only`
- `actualBundleCreated=false`
- `releaseAssetUploaded=false`
- `runtimeModelBundleSelected=false`
- `rcRehearsalOnly=true`
- `sourceOnlyDefault=true`
- `cases[]`
- `policyEvidence.verifyBundlePolicy`
- `policyEvidence.verifyReleaseBundleDryRun`
- `policyEvidence.dependencySnapshot`
- `policyEvidence.sourceOfferChecklist`

## 완료 판정

S11 개발 완료는 아래가 모두 참일 때만 보고합니다.

- `verify-runtime-model-bundle-rc-rehearsal`가 fixture와 문서 연결을 PASS로 확인
- `verify-bundle-policy`가 기본 repository/source policy 위반 없음으로 PASS
- source-only dry-run이 runtime/model/GPL-risk negative fixture 분리를 확인
- dependency snapshot이 hash/provenance/license review 입력으로 생성 가능
- 실제 runtime/model bundle, binary release asset, GitHub Release asset upload를 수행하지 않음
- Event POST/WebRTC/SSE/WS metadata schema, RTSP/WebRTC media path, 제품 UI를 변경하지 않음
