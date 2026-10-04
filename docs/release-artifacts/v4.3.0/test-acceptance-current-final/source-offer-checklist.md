# Third-party Source Offer Checklist

<!-- 이 파일은 ./server.sh source-offer-checklist 명령으로 생성합니다. -->

- schema: media-server.source-offer-checklist.v1
- generatedAt: stable
- status: default-bundle-no-runtime-hit
- inventory: config/third_party_attribution.json
- bundlePolicyReport: docs/release-artifacts/v4.3.0/test-acceptance-current-final/bundle-policy.json

기본 Apache-2.0 소스 공개에는 third-party runtime binary를 포함하지 않습니다.
FFmpeg, libav*, x264/x265, GStreamer GPL-risk plugin, LGPL runtime library를 bundle/container/offline package에 넣는 경우에만 아래 항목을 release gate로 사용합니다.

## Release Gate

- [ ] `./server.sh verify-bundle-policy --bundle-dir <release_bundle_dir> --json-output /tmp/media_server_bundle_policy.json` 결과를 보관했습니다.
- [ ] 포함된 binary와 정확히 대응되는 upstream source URL, tag, package version을 기록했습니다.
- [ ] configure/build flag, patch/diff, local rebuild 절차를 보관했습니다.
- [ ] license text, NOTICE, attribution, source offer 문구를 bundle과 release note에 포함했습니다.
- [ ] LGPL/GPL과 충돌하는 EULA 문구가 없는지 확인했습니다.
- [ ] container image 또는 offline package라면 image/rootfs 파일 목록과 checksum manifest를 보관했습니다.

## Bundle Policy Hits

| 결과 | Rule | 종류 | 파일 | 상세 | 사유 |
| --- | --- | --- | --- | --- | --- |
| PASS | - | - | - | - | 기본 bundle policy 위반 후보가 없습니다. |

## Source Offer 대상 후보

| 구성요소 | License | 배포 형태 | Source | 확인 기준 |
| --- | --- | --- | --- | --- |
| GStreamer, gst-rtsp-server, gst-plugins-base/good/bad | LGPL-family and plugin-specific upstream terms | 외부 runtime/development dependency이며 이 저장소에 vendoring하지 않음 | Homebrew, apt, dnf, pacman 같은 시스템 패키지 관리자 | 기본 bundle에는 GStreamer runtime/plugin 바이너리를 포함하지 않습니다. 포함 배포 시 plugin별 upstream license와 gst-libav/x264/x265/ugly 계열 영향을 별도 검토합니다. |
| libnice and libnice GStreamer plugin | LGPL-family upstream terms | 외부 runtime dependency이며 이 저장소에 vendoring하지 않음 | 시스템 패키지 관리자 | 번들에 포함하면 libnice license text와 upstream attribution을 유지합니다. |
| Cairo and Pango | LGPL/MPL-family upstream terms | 외부 runtime/development dependency이며 이 저장소에 vendoring하지 않음 | 시스템 패키지 관리자 | 번들에 포함하면 Cairo, Pango, 전이 runtime library의 upstream license text를 함께 포함합니다. |
| ONNX Runtime | MIT | Linux에서 ./server.sh install 실행 시 third_party/onnxruntime로 다운로드될 수 있음 | Microsoft ONNX Runtime release archive 또는 시스템 패키지 관리자 | 번들에 포함하면 ONNX Runtime MIT license와 다운로드한 release package 안의 notice 파일을 함께 포함합니다. |
| FFmpeg and ffprobe | LGPL/GPL depending on the installed build configuration | 외부 command-line dependency이며 이 저장소에 vendoring하지 않음 | 시스템 패키지 관리자 | 기본 bundle에는 FFmpeg/ffprobe/libav* 바이너리를 포함하지 않습니다. 포함 배포 시 --enable-gpl/--enable-nonfree/build config와 license 의무를 별도 검토합니다. |
| Transitive linked libraries from media/runtime packages | Upstream project terms by each linked library | 직접 소스 의존성은 아니지만 binary bundle에 복사되면 배포 의무가 생길 수 있음 | 시스템 패키지 관리자 또는 OS SDK | 기본 bundle에는 package manager runtime 전체를 복사하지 않습니다. 포함 배포 시 snapshot과 verify-bundle-policy 결과를 기준으로 license text와 attribution을 추가합니다. |
| CMake, pkg-config, Node.js, Python 3, curl | Upstream project terms | 외부 build/test tool이며 이 저장소에 vendoring하지 않음 | 시스템 패키지 관리자 또는 OS 기본 제공 도구 | 배포물에 도구 runtime을 포함하지 않는 것을 기본으로 합니다. 포함하면 각 upstream license를 함께 포함합니다. |
