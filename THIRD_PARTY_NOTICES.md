# Third-Party Notices

<!-- 이 파일은 ./server.sh write-dependency-notice 명령으로 생성합니다. -->

- schema: media-server.third-party-attribution.v1
- source inventory: config/third_party_attribution.json
- scope: binary bundle과 운영 배포 전에 확인해야 하는 third-party runtime/tool/model attribution

이 문서는 이 저장소의 Apache-2.0 라이선스가 third-party 구성요소를 재라이선스하지 않는다는 점을 명확히 하기 위한 배포 점검용 문서입니다.
실제 binary bundle에 포함되는 파일 목록은 배포 방식마다 달라질 수 있으므로, release 전에 포함 library/plugin/model/tool을 다시 확인해야 합니다.

| 구성요소 | 라이선스 | 용도 | 출처 | 배포 형태 | 번들 기준 |
| --- | --- | --- | --- | --- | --- |
| GStreamer, gst-rtsp-server, gst-plugins-base/good/bad | LGPL-family and plugin-specific upstream terms | RTSP/RTP/WebRTC 파이프라인, 디코딩, 인코딩, appsrc/appsink, RTSP 서버 연동 | Homebrew, apt, dnf, pacman 같은 시스템 패키지 관리자 | 외부 runtime/development dependency이며 이 저장소에 vendoring하지 않음 | binary bundle에 GStreamer library/plugin을 포함하면 upstream license text와 plugin notice를 함께 포함합니다. |
| libnice and libnice GStreamer plugin | LGPL-family upstream terms | GStreamer WebRTC의 ICE transport 지원 | 시스템 패키지 관리자 | 외부 runtime dependency이며 이 저장소에 vendoring하지 않음 | 번들에 포함하면 libnice license text와 upstream attribution을 유지합니다. |
| Cairo and Pango | LGPL/MPL-family upstream terms | 선택 overlay text rendering과 glyph 지원 | 시스템 패키지 관리자 | 외부 runtime/development dependency이며 이 저장소에 vendoring하지 않음 | 번들에 포함하면 Cairo, Pango, 전이 runtime library의 upstream license text를 함께 포함합니다. |
| ONNX Runtime | MIT | 선택 YOLO detector runtime과 실험적 Re-ID hook | Microsoft ONNX Runtime release archive 또는 시스템 패키지 관리자 | Linux에서 ./server.sh install 실행 시 third_party/onnxruntime로 다운로드될 수 있음 | 번들에 포함하면 ONNX Runtime MIT license와 다운로드한 release package 안의 notice 파일을 함께 포함합니다. |
| libsodium | ISC | 환경에 있을 때 선택 password hashing과 crypto 지원 | 시스템 패키지 관리자 | 외부 optional dependency이며 이 저장소에 vendoring하지 않음 | 번들에 포함하면 libsodium ISC license text를 함께 포함합니다. |
| FFmpeg and ffprobe | LGPL/GPL depending on the installed build configuration | 검증 스크립트, sample probing, media diagnostics, 선택 helper workflow | 시스템 패키지 관리자 | 외부 command-line dependency이며 이 저장소에 vendoring하지 않음 | FFmpeg는 Apache-2.0 적용 대상으로 보지 않습니다. 번들 FFmpeg build가 GPL component를 켰는지 확인합니다. |
| Ultralytics YOLO model asset yolo11n.onnx | Provider-specific model terms; not relicensed by this repository | ./server.sh install이 다운로드하는 기본 선택 object detection model | Ultralytics GitHub release assets | 다운로드 asset이며 이 저장소에 commit하지 않음 | 재배포하거나 상업적으로 사용하기 전에 모델 제공자 license를 이 저장소 license와 별도로 확인합니다. |
| COCO class labels | Dataset/annotation source terms apply | object detection 표시 이름에 사용하는 models/coco.names label | install script가 표준 COCO class name에서 생성 | 생성되는 로컬 파일이며 dataset 자체에 Apache-2.0을 부여하는 것이 아님 | 번들에 포함하면 dataset/label attribution을 유지하고 프로젝트 원본 콘텐츠처럼 표시하지 않습니다. |
| yt-dlp and Deno | Upstream project terms | 선택 실험 기능인 YouTube import helper path | 시스템 패키지 관리자 | 외부 optional tool이며 이 저장소에 vendoring하지 않음 | 번들에 포함하면 각 tool의 upstream license를 포함하고 YouTube import는 실험 기능으로 유지합니다. |

## Release Checklist

- [ ] binary bundle 안의 동적 library와 plugin 목록을 확인했습니다.
- [ ] model file과 sample media가 bundle에 포함되는지 확인했습니다.
- [ ] 포함되는 third-party license text와 attribution을 bundle에 함께 넣었습니다.
- [ ] FFmpeg/GStreamer plugin build가 GPL component를 포함하는지 확인했습니다.
- [ ] YOLO model asset 재배포/상업 사용 조건을 별도로 확인했습니다.
