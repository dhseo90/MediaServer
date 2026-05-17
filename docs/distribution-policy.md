# Distribution Policy

이 문서는 public repo, binary bundle, container image 배포 기준을 구분합니다.
Release asset 기준은 [release-policy.md](./release-policy.md)에서 함께 관리합니다.

## 기본 원칙

- 기본 공개 단위는 Apache-2.0 원본 소스와 문서입니다.
- 기본 binary bundle에는 FFmpeg, FFprobe, libav*, x264/x265, GStreamer GPL-risk plugin 바이너리를 포함하지 않습니다.
- ONNX Runtime package와 YOLO/Re-ID/model binary는 기본 release asset에 포함하지 않습니다.
- FFmpeg/GStreamer runtime은 사용자 package manager 설치물로 취급합니다.
- bundle, app package, container image, offline package를 만들 때는 `./server.sh verify-bundle-policy --bundle-dir <release_bundle_dir>`를 실행합니다.
- GPL-risk runtime을 의도적으로 포함하면 별도 라이선스 검토, upstream license text, source offer, attribution을 준비합니다.

## 배포 유형

| 유형 | 기준 | 필수 확인 |
| --- | --- | --- |
| Source release | 소스/문서/LICENSE/NOTICE만 공개 | `write-dependency-notice --check`, `verify-bundle-policy` |
| Local binary bundle | `media_server`와 문서만 묶음 | `verify-release-bundle-dry-run --candidate local-binary`, `verify-bundle-policy --bundle-dir <dir>` |
| Offline package without runtime/model | `media_server`, 문서, 설치 안내만 묶음 | `verify-release-bundle-dry-run --candidate offline-package`, `verify-bundle-policy --bundle-dir <dir>` |
| Runtime/model 포함 bundle | GStreamer/FFmpeg/plugin/ONNX Runtime/model까지 복사 | 별도 법무/라이선스 검토, source offer, license text, attribution, model provenance/checksum |
| Container image without runtime/model | 사용자가 runtime/model layer를 직접 선택 | `verify-release-bundle-dry-run --candidate container-root`, README에 설치 의존성 명시 |
| Container image with runtime/model | image 안에 FFmpeg/GStreamer/plugin/ONNX Runtime/model 포함 | image filesystem에 대해 `verify-bundle-policy` 실행, 위반 시 기본 release 대상 제외 |

## Container 정책

권장 container는 runtime 미포함 또는 최소 runtime image입니다.
FFmpeg/GStreamer plugin을 image 안에 넣는 경우에는 image를 binary bundle로 취급합니다.

Container release 전 확인:

```bash
./server.sh verify-release-bundle-dry-run --candidate container-root
./server.sh dependency-snapshot --stable --output /tmp/media_server_dependency_snapshot.md
./server.sh verify-bundle-policy --bundle-dir <extracted_image_root> --json-output /tmp/media_server_bundle_policy.json
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
```

위반 항목이 나오면 기본 release 대상이 아닙니다.
의도적으로 포함하는 경우에만 `--allow-risky-runtime`으로 경고 리포트를 만들고,
그 리포트를 release 검토 기록에 첨부합니다.

## Source Offer Checklist

LGPL/GPL runtime을 포함하는 배포를 선택한 경우:

- `./server.sh source-offer-checklist --bundle-policy-report <bundle_policy.json>`로 검토 문서를 생성합니다.
- 포함된 binary와 정확히 대응되는 upstream source 위치를 기록합니다.
- local build config와 configure line을 보관합니다.
- 수정 사항이 있으면 patch 또는 diff를 보관합니다.
- license text와 attribution을 bundle 안에 포함합니다.
- download page, release note, About/Notice 문서에 사용 사실을 표시합니다.
- reverse engineering 금지처럼 LGPL/GPL과 충돌할 수 있는 EULA 문구를 넣지 않습니다.
