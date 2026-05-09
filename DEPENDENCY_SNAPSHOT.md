# Dependency Snapshot

<!-- 이 파일은 ./server.sh dependency-snapshot 명령으로 생성합니다. -->

- schema: media-server.dependency-snapshot.v1
- generatedAt: 2026-05-09T12:57:05.756Z
- inventory: config/third_party_attribution.json
- platform: Darwin 25.4.0 arm64
- binary: build-gst-onnx/media_server

이 snapshot은 현재 개발/배포 환경에서 감지한 dependency 버전과 asset hash입니다.
패키지 매니저로 설치되는 항목은 환경마다 달라질 수 있으므로, release 전에는 이 파일을 다시 생성합니다.

| 구성요소 | 기준 버전/정책 | 감지 결과 | Asset/hash | 주의 |
| --- | --- | --- | --- | --- |
| GStreamer, gst-rtsp-server, gst-plugins-base/good/bad | 미고정. CMake는 pkg-config에서 필요한 GStreamer 1.0 module 존재 여부를 확인합니다. GStreamer 1.0 API 계열을 사용하며, 실제 설치 버전은 pkg-config 결과를 release snapshot에 기록합니다. | gstreamer-1.0: 1.28.1; gstreamer-rtsp-server-1.0: 1.28.1; gstreamer-pbutils-1.0: 1.28.1; gstreamer-app-1.0: 1.28.1; gstreamer-webrtc-1.0: 1.28.1; gstreamer-sdp-1.0: 1.28.1 | - | - |
| libnice and libnice GStreamer plugin | 미고정. 설치 패키지와 GStreamer plugin 호환성을 우선합니다. GStreamer WebRTC ICE 기능에 필요한 libnice 설치 버전을 release snapshot에 기록합니다. | nice: 0.1.23 | - | - |
| Cairo and Pango | 미고정. 없으면 MEDIA_SERVER_USE_PANGOCAIRO=0으로 빌드합니다. PangoCairo가 발견되면 overlay text rendering에 사용하고, 설치 버전은 release snapshot에 기록합니다. | pangocairo: 1.57.0; cairo: 1.18.4; pango: 1.57.0 | - | - |
| ONNX Runtime | 1.20.1 기본 설치 기준. 최신 시스템 패키지도 허용합니다. Linux 자동 설치 기본값은 1.20.1입니다. Homebrew/수동 설치 환경은 감지된 버전을 snapshot에 기록합니다. | libonnxruntime: 1.25.0 | - | - |
| libsodium | 미고정. 없으면 fallback password hashing 경로를 사용합니다. 발견되면 MEDIA_SERVER_USE_LIBSODIUM=1로 빌드하고, 설치 버전은 snapshot에 기록합니다. | libsodium: 1.0.21 | - | - |
| FFmpeg and ffprobe | 미고정. 검증 스크립트는 ffmpeg/ffprobe command 존재 여부와 실제 probe 성공 여부를 기준으로 판단합니다. 패키지 관리자 설치 버전을 사용합니다. release snapshot은 ffmpeg/ffprobe version과 GPL build flag 포함 여부를 기록합니다. | ffmpeg: 8.0.1; ffprobe: 8.0.1 | - | ffmpeg: GPL build flag 감지; ffprobe: GPL build flag 감지 |
| Ultralytics YOLO model asset yolo11n.onnx | 기본 모델 파일명 기준 yolo11n.onnx. URL은 MEDIA_SERVER_YOLO_MODEL_URL로 바꿀 수 있습니다. 기본 다운로드 URL은 Ultralytics assets v8.4.0의 yolo11n.onnx입니다. 실제 파일 hash는 snapshot에 기록합니다. | - | models/yolo11n.onnx: 10930182 bytes, Ultralytics assets v8.4.0, sha256=634279b40c07c6391472c51ad45b81ebc48706a9a1fe72dd3396322acd0c053b | - |
| Optional YOLO layout verification model assets | 선택 검증 전용이라 제품 실행 필수 조건이 아닙니다. 기본 검증 URL은 스크립트에 고정되어 있고 실제 파일 hash는 snapshot에 기록합니다. | - | models/yolov5n.onnx: 3981910 bytes, Ultralytics YOLOv5 v7.0 release asset, sha256=04f0e55c26f58d17145b36045780fe1250d5bd2187543e11568e5141d05b3262; models/yolov8n-640x640-end2end.onnx: 13869046 bytes, YOLOv8 end-to-end ONNX sample, sha256=d056ca1cf43372d39dc0c30cbb044e0c161988fc72d3d16c17071e220879b7fa | - |
| COCO class labels | 고정 파일명 models/coco.names 80개 COCO class label 목록을 생성합니다. snapshot에는 줄 수와 hash를 기록합니다. | - | models/coco.names: 621 bytes, 80 lines, sha256=bd17f1ee35d5f3c862a4894605855abbb9dda4b0621fdb0ac4c2c8c7bb7e730a | - |
| OpenCV Python | 미고정. 예제 client가 import 실패 시 설치 안내를 출력합니다. 예제 client를 실행하는 환경에서 cv2 import version을 snapshot에 기록합니다. | cv2: 4.13.0 | - | - |
| Transitive linked libraries from media/runtime packages | 직접 고정하지 않음. 상위 media/runtime package와 OS SDK가 결정합니다. 정확한 파일 경로와 current version은 `./server.sh dependency-snapshot`의 linked library section에 기록합니다. | - | - | - |
| CMake, pkg-config, Node.js, Python 3, curl | CMake 3.16+, C++17 compiler, Node.js/Python 3/curl/pkg-config command 필요 CMake 최소 요구 버전은 3.16입니다. 나머지 tool의 실제 버전은 snapshot에 기록합니다. | cmake: 4.2.3; pkg-config: 2.5.1; node: 24.13.0; python3: 3.14.4; curl: 8.7.1 | - | - |
| yt-dlp and Deno | 제품 핵심 실행 필수 조건이 아닙니다. YouTube import/source 실험 기능을 켠 환경에서만 필요하며 snapshot에 버전을 기록합니다. | yt-dlp: 2026.03.17; deno: 2.7.13 | - | - |

## Linked Library Snapshot

- status: ok
- command: `otool -L build-gst-onnx/media_server`


```text
/opt/homebrew/opt/onnxruntime/lib/libonnxruntime.1.25.0.dylib (compatibility version 0.0.0, current version 1.25.0)
/opt/homebrew/opt/gstreamer/lib/libgstrtspserver-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/gstreamer/lib/libgstapp-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/gstreamer/lib/libgstwebrtc-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/gstreamer/lib/libgstsdp-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/gstreamer/lib/libgstpbutils-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/gstreamer/lib/libgstaudio-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/gstreamer/lib/libgstvideo-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/gstreamer/lib/libgstbase-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/gstreamer/lib/libgstreamer-1.0.0.dylib (compatibility version 2802.0.0, current version 2802.0.0)
/opt/homebrew/opt/pango/lib/libpangocairo-1.0.0.dylib (compatibility version 5701.0.0, current version 5701.0.0)
/opt/homebrew/opt/pango/lib/libpango-1.0.0.dylib (compatibility version 5701.0.0, current version 5701.0.0)
/opt/homebrew/opt/cairo/lib/libcairo.2.dylib (compatibility version 2.0.0, current version 2.0.0)
/opt/homebrew/opt/harfbuzz/lib/libharfbuzz.0.dylib (compatibility version 61311.0.0, current version 61311.0.0)
/opt/homebrew/opt/glib/lib/libgobject-2.0.0.dylib (compatibility version 8601.0.0, current version 8601.4.0)
/opt/homebrew/opt/glib/lib/libglib-2.0.0.dylib (compatibility version 8601.0.0, current version 8601.4.0)
/opt/homebrew/opt/gettext/lib/libintl.8.dylib (compatibility version 13.0.0, current version 13.6.0)
/opt/homebrew/opt/libsodium/lib/libsodium.26.dylib (compatibility version 30.0.0, current version 30.0.0)
/usr/lib/libc++.1.dylib (compatibility version 1.0.0, current version 2100.43.0)
/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1356.0.0)
```

