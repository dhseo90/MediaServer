# GStreamer 환경 보완 재검증 개별 결과

이번 실행의 직접 결과다. 이전 진단이나 UI/장시간/다른 PC 검증을 대체하지 않는다.

## 환경 fixture

명령: `./server.sh verify-gst-environment`, exit 0, 20개 통과, 5.758초.

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| test_cli_no_gst_side_effects | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_concurrent | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_custom_paths | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_custom_so_plugins | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_dispatch_environment | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_explicit_prefix | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_filter | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_inherited_custom_paths | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_invalid_profile | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_launchd_environment | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_linux_unchanged | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_nohup_environment | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_override_order | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_prefix_discovery | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_reapply | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_registry | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_system_profile | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_tampered_cache | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_unsafe_cache | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |
| test_upgrade | Bash 3.2 격리 fixture 실행, assertion 통과 | pass | 이전 실패·추가 RED는 release-test-records.md에 보존 |

## 실제 macOS 명령 전수

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| 실제 공통 환경 | `/bin/bash -c "set -euo pipefail; source '/Users/dhseo/Workspace/mediaServer/scripts/internal/env_common.sh'; media_server_apply_homebrew_gst_env; '/Users/dhseo/.nvm/versions/node/v24.13.0/bin/node' -e 'process.stdout.write(JSON.stringify(process.env))'"`; exit 0, 149ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| cold 검색 | `gst-inspect-1.0`; exit 0, 1103ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| warm 검색 | `gst-inspect-1.0`; exit 0, 88ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| blacklist 관찰 | `gst-inspect-1.0 -b`; exit 0, 81ms | pass | Blacklisted files:<br>  libgstvalidatessim.dylib<br><br>Total count: 1 blacklisted file<br> |
| GStreamer 개발 flags | `pkg-config --cflags --libs gstreamer-1.0`; exit 0, 19ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory probe compile | `"c++" "-std=c++17" -Wall -Wextra -Werror /private/tmp/media-server-gst-env-recheck.YEjVi4/factory.cpp -I/opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -I/opt/homebrew/Cellar/glib/2.86.4/include -I/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -I/opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -I/opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -I/opt/homebrew/opt/gettext/include -I/opt/homebrew/Cellar/pcre2/10.47_1/include -L/opt/homebrew/Cellar/gstreamer/1.28.1/lib -lgstreamer-1.0 "-Wl,-rpath,/opt/homebrew/Cellar/gstreamer/1.28.1/lib" -L/opt/homebrew/Cellar/glib/2.86.4/lib -lgobject-2.0 -lglib-2.0 -L/opt/homebrew/opt/gettext/lib -lintl -o /private/tmp/media-server-gst-env-recheck.YEjVi4/factory`; exit 0, 260ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory inspect appsrc | `gst-inspect-1.0 appsrc`; exit 0, 84ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make appsrc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory appsrc`; exit 0, 458ms | pass | {"factory":"appsrc","created":true,"ready":false}<br> |
| factory inspect appsink | `gst-inspect-1.0 appsink`; exit 0, 90ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make appsink | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory appsink`; exit 0, 32ms | pass | {"factory":"appsink","created":true,"ready":false}<br> |
| factory inspect filesrc | `gst-inspect-1.0 filesrc`; exit 0, 82ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make filesrc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory filesrc`; exit 0, 33ms | pass | {"factory":"filesrc","created":true,"ready":false}<br> |
| factory inspect filesink | `gst-inspect-1.0 filesink`; exit 0, 79ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make filesink | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory filesink`; exit 0, 32ms | pass | {"factory":"filesink","created":true,"ready":false}<br> |
| factory inspect fdsink | `gst-inspect-1.0 fdsink`; exit 0, 78ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make fdsink | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory fdsink`; exit 0, 33ms | pass | {"factory":"fdsink","created":true,"ready":false}<br> |
| factory inspect queue | `gst-inspect-1.0 queue`; exit 0, 86ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make queue | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory queue`; exit 0, 32ms | pass | {"factory":"queue","created":true,"ready":false}<br> |
| factory inspect identity | `gst-inspect-1.0 identity`; exit 0, 79ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make identity | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory identity`; exit 0, 36ms | pass | {"factory":"identity","created":true,"ready":false}<br> |
| factory inspect fakesink | `gst-inspect-1.0 fakesink`; exit 0, 80ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make fakesink | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory fakesink`; exit 0, 35ms | pass | {"factory":"fakesink","created":true,"ready":false}<br> |
| factory inspect concat | `gst-inspect-1.0 concat`; exit 0, 87ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make concat | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory concat`; exit 0, 33ms | pass | {"factory":"concat","created":true,"ready":false}<br> |
| factory inspect qtdemux | `gst-inspect-1.0 qtdemux`; exit 0, 79ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make qtdemux | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory qtdemux`; exit 0, 33ms | pass | {"factory":"qtdemux","created":true,"ready":false}<br> |
| factory inspect qtmux | `gst-inspect-1.0 qtmux`; exit 0, 81ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make qtmux | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory qtmux`; exit 0, 36ms | pass | {"factory":"qtmux","created":true,"ready":false}<br> |
| factory inspect mp4mux | `gst-inspect-1.0 mp4mux`; exit 0, 85ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make mp4mux | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory mp4mux`; exit 0, 34ms | pass | {"factory":"mp4mux","created":true,"ready":false}<br> |
| factory inspect matroskamux | `gst-inspect-1.0 matroskamux`; exit 0, 83ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make matroskamux | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory matroskamux`; exit 0, 35ms | pass | {"factory":"matroskamux","created":true,"ready":false}<br> |
| factory inspect matroskademux | `gst-inspect-1.0 matroskademux`; exit 0, 111ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make matroskademux | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory matroskademux`; exit 0, 34ms | pass | {"factory":"matroskademux","created":true,"ready":false}<br> |
| factory inspect h264parse | `gst-inspect-1.0 h264parse`; exit 0, 77ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make h264parse | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory h264parse`; exit 0, 35ms | pass | {"factory":"h264parse","created":true,"ready":false}<br> |
| factory inspect mpegtsmux | `gst-inspect-1.0 mpegtsmux`; exit 0, 82ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make mpegtsmux | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory mpegtsmux`; exit 0, 35ms | pass | {"factory":"mpegtsmux","created":true,"ready":false}<br> |
| factory inspect tsdemux | `gst-inspect-1.0 tsdemux`; exit 0, 86ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make tsdemux | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory tsdemux`; exit 0, 35ms | pass | {"factory":"tsdemux","created":true,"ready":false}<br> |
| factory inspect avdec_h264 | `gst-inspect-1.0 avdec_h264`; exit 0, 88ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make avdec_h264 | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory avdec_h264`; exit 0, 43ms | pass | {"factory":"avdec_h264","created":true,"ready":false}<br> |
| factory inspect videoconvert | `gst-inspect-1.0 videoconvert`; exit 0, 80ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make videoconvert | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory videoconvert`; exit 0, 33ms | pass | {"factory":"videoconvert","created":true,"ready":false}<br> |
| factory inspect videoscale | `gst-inspect-1.0 videoscale`; exit 0, 83ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make videoscale | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory videoscale`; exit 0, 33ms | pass | {"factory":"videoscale","created":true,"ready":false}<br> |
| factory inspect videorate | `gst-inspect-1.0 videorate`; exit 0, 83ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make videorate | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory videorate`; exit 0, 33ms | pass | {"factory":"videorate","created":true,"ready":false}<br> |
| factory inspect jpegenc | `gst-inspect-1.0 jpegenc`; exit 0, 75ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make jpegenc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory jpegenc`; exit 0, 33ms | pass | {"factory":"jpegenc","created":true,"ready":false}<br> |
| factory inspect rtspsrc | `gst-inspect-1.0 rtspsrc`; exit 0, 90ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make rtspsrc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory rtspsrc`; exit 0, 35ms | pass | {"factory":"rtspsrc","created":true,"ready":false}<br> |
| factory inspect rtph264pay | `gst-inspect-1.0 rtph264pay`; exit 0, 86ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make rtph264pay | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory rtph264pay`; exit 0, 35ms | pass | {"factory":"rtph264pay","created":true,"ready":false}<br> |
| factory inspect rtph264depay | `gst-inspect-1.0 rtph264depay`; exit 0, 84ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make rtph264depay | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory rtph264depay`; exit 0, 36ms | pass | {"factory":"rtph264depay","created":true,"ready":false}<br> |
| factory inspect rtph265pay | `gst-inspect-1.0 rtph265pay`; exit 0, 90ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make rtph265pay | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory rtph265pay`; exit 0, 35ms | pass | {"factory":"rtph265pay","created":true,"ready":false}<br> |
| factory inspect rtph265depay | `gst-inspect-1.0 rtph265depay`; exit 0, 85ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make rtph265depay | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory rtph265depay`; exit 0, 34ms | pass | {"factory":"rtph265depay","created":true,"ready":false}<br> |
| factory inspect h265parse | `gst-inspect-1.0 h265parse`; exit 0, 76ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make h265parse | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory h265parse`; exit 0, 34ms | pass | {"factory":"h265parse","created":true,"ready":false}<br> |
| factory inspect webrtcbin | `gst-inspect-1.0 webrtcbin`; exit 0, 89ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make webrtcbin | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory webrtcbin`; exit 0, 37ms | pass | {"factory":"webrtcbin","created":true,"ready":false}<br> |
| factory inspect nicesrc | `gst-inspect-1.0 nicesrc`; exit 0, 80ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make nicesrc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory nicesrc`; exit 0, 34ms | pass | {"factory":"nicesrc","created":true,"ready":false}<br> |
| factory inspect nicesink | `gst-inspect-1.0 nicesink`; exit 0, 82ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make nicesink | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory nicesink`; exit 0, 35ms | pass | {"factory":"nicesink","created":true,"ready":false}<br> |
| factory inspect dtlsenc | `gst-inspect-1.0 dtlsenc`; exit 0, 88ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make dtlsenc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory dtlsenc`; exit 0, 36ms | pass | {"factory":"dtlsenc","created":true,"ready":false}<br> |
| factory inspect dtlsdec | `gst-inspect-1.0 dtlsdec`; exit 0, 91ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make dtlsdec | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory dtlsdec`; exit 0, 36ms | pass | {"factory":"dtlsdec","created":true,"ready":false}<br> |
| factory inspect srtpenc | `gst-inspect-1.0 srtpenc`; exit 0, 85ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make srtpenc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory srtpenc`; exit 0, 36ms | pass | {"factory":"srtpenc","created":true,"ready":false}<br> |
| factory inspect srtpdec | `gst-inspect-1.0 srtpdec`; exit 0, 81ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make srtpdec | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory srtpdec`; exit 0, 35ms | pass | {"factory":"srtpdec","created":true,"ready":false}<br> |
| factory inspect rtpbin | `gst-inspect-1.0 rtpbin`; exit 0, 87ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make rtpbin | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory rtpbin`; exit 0, 35ms | pass | {"factory":"rtpbin","created":true,"ready":false}<br> |
| factory inspect vp8enc | `gst-inspect-1.0 vp8enc`; exit 0, 79ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make vp8enc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory vp8enc`; exit 0, 34ms | pass | {"factory":"vp8enc","created":true,"ready":false}<br> |
| factory inspect vp8dec | `gst-inspect-1.0 vp8dec`; exit 0, 82ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make vp8dec | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory vp8dec`; exit 0, 34ms | pass | {"factory":"vp8dec","created":true,"ready":false}<br> |
| factory inspect opusenc | `gst-inspect-1.0 opusenc`; exit 0, 86ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make opusenc | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory opusenc`; exit 0, 35ms | pass | {"factory":"opusenc","created":true,"ready":false}<br> |
| factory inspect opusdec | `gst-inspect-1.0 opusdec`; exit 0, 84ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make opusdec | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory opusdec`; exit 0, 35ms | pass | {"factory":"opusdec","created":true,"ready":false}<br> |
| factory inspect audioconvert | `gst-inspect-1.0 audioconvert`; exit 0, 79ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make audioconvert | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory audioconvert`; exit 0, 35ms | pass | {"factory":"audioconvert","created":true,"ready":false}<br> |
| factory inspect audioresample | `gst-inspect-1.0 audioresample`; exit 0, 82ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make audioresample | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory audioresample`; exit 0, 34ms | pass | {"factory":"audioresample","created":true,"ready":false}<br> |
| factory inspect rtpopuspay | `gst-inspect-1.0 rtpopuspay`; exit 0, 83ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make rtpopuspay | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory rtpopuspay`; exit 0, 34ms | pass | {"factory":"rtpopuspay","created":true,"ready":false}<br> |
| factory inspect rtpopusdepay | `gst-inspect-1.0 rtpopusdepay`; exit 0, 76ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| factory make rtpopusdepay | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory rtpopusdepay`; exit 0, 34ms | pass | {"factory":"rtpopusdepay","created":true,"ready":false}<br> |
| WebRTC READY | `/private/tmp/media-server-gst-env-recheck.YEjVi4/factory --ready`; exit 0, 39ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| 무음 H264 decode | `gst-launch-1.0 -q filesrc location=/Users/dhseo/Workspace/mediaServer/video/sample_h264_video_only.mp4 "!" qtdemux "!" h264parse "!" avdec_h264 "!" fakesink sync=false`; exit 0, 129ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| priority compile 0 | `"c++" "-std=c++17" -dynamiclib -fPIC "-DENV_TEST_FACTORY=\"envpriorityfirst\"" /private/tmp/media-server-gst-env-recheck.YEjVi4/priority.cpp -I/opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -I/opt/homebrew/Cellar/glib/2.86.4/include -I/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -I/opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -I/opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -I/opt/homebrew/opt/gettext/include -I/opt/homebrew/Cellar/pcre2/10.47_1/include -L/opt/homebrew/Cellar/gstreamer/1.28.1/lib -lgstreamer-1.0 "-Wl,-rpath,/opt/homebrew/Cellar/gstreamer/1.28.1/lib" -L/opt/homebrew/Cellar/glib/2.86.4/lib -lgobject-2.0 -lglib-2.0 -L/opt/homebrew/opt/gettext/lib -lintl -o "/private/tmp/media-server-gst-env-recheck.YEjVi4/priority 0/libgstenvpriority.so"`; exit 0, 83ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| priority compile 1 | `"c++" "-std=c++17" -dynamiclib -fPIC "-DENV_TEST_FACTORY=\"envprioritysecond\"" /private/tmp/media-server-gst-env-recheck.YEjVi4/priority.cpp -I/opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -I/opt/homebrew/Cellar/glib/2.86.4/include -I/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -I/opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -I/opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -I/opt/homebrew/opt/gettext/include -I/opt/homebrew/Cellar/pcre2/10.47_1/include -L/opt/homebrew/Cellar/gstreamer/1.28.1/lib -lgstreamer-1.0 "-Wl,-rpath,/opt/homebrew/Cellar/gstreamer/1.28.1/lib" -L/opt/homebrew/Cellar/glib/2.86.4/lib -lgobject-2.0 -lglib-2.0 -L/opt/homebrew/opt/gettext/lib -lintl -o "/private/tmp/media-server-gst-env-recheck.YEjVi4/priority 1/libgstenvpriority.so"`; exit 0, 84ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| 사용자 root 순서 적용 | `/bin/bash -c "set -euo pipefail; source '/Users/dhseo/Workspace/mediaServer/scripts/internal/env_common.sh'; media_server_apply_homebrew_gst_env; '/Users/dhseo/.nvm/versions/node/v24.13.0/bin/node' -e 'process.stdout.write(JSON.stringify(process.env))'"`; exit 0, 142ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| 실제 중복 basename 선택 | `gst-inspect-1.0 envpriority`; exit 0, 1449ms | pass | 원문은 runtime-results.json의 동일 id 참조 |
| S05 회귀 | `./server.sh verify-v410-event-recording`; exit 1, 220ms | fail | [S05 등록/결과 대조] FAIL: legacy 986 + S05 27 총계 불일치<br> |

## 실제 결과 assertion 전수

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| cold 경고 없음 | stderr bytes=0 | pass | 실제 프로세스 출력 대조 |
| warm 경고 없음 | stderr bytes=0 | pass | 실제 프로세스 출력 대조 |
| cold warm 전체 feature 동일 | {"count":1525} | pass | 실제 프로세스 출력 대조 |
| feature 전수 수량 | {"actual":1525,"expected":1525} | pass | 실제 프로세스 출력 대조 |
| factory appsrc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory appsink | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory filesrc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory filesink | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory fdsink | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory queue | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory identity | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory fakesink | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory concat | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory qtdemux | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory qtmux | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory mp4mux | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory matroskamux | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory matroskademux | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory h264parse | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory mpegtsmux | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory tsdemux | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory avdec_h264 | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory videoconvert | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory videoscale | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory videorate | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory jpegenc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory rtspsrc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory rtph264pay | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory rtph264depay | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory rtph265pay | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory rtph265depay | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory h265parse | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory webrtcbin | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory nicesrc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory nicesink | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory dtlsenc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory dtlsdec | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory srtpenc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory srtpdec | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory rtpbin | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory vp8enc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory vp8dec | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory opusenc | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory opusdec | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory audioconvert | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory audioresample | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory rtpopuspay | {"created":true} | pass | 실제 프로세스 출력 대조 |
| factory rtpopusdepay | {"created":true} | pass | 실제 프로세스 출력 대조 |
| READY 상태 | 실제 READY, 브라우저 ICE 아님 | pass | 실제 프로세스 출력 대조 |
| decode 경고 없음 | EOS exit 0 | pass | 실제 프로세스 출력 대조 |
| 첫 사용자 root 우선 선택 | 동일 basename의 실제 두 .so 중 A 선택 | pass | 실제 프로세스 출력 대조 |

## 임시 산출물 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_y8adcwsg | fixture | 225704B / 16파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_ahrk_cs0 | fixture | 2005B / 15파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_g599r0a2 | fixture | 2424B / 17파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_ihkvsjry | fixture | 2470B / 21파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_0f_m9zhy | fixture | 215983B / 19파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_z0e9tt0w | fixture | 2005B / 15파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_li7tdcog | fixture | 2005B / 15파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_9yovbybu | fixture | 4078B / 21파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_7zuk14qs | fixture | 2005B / 15파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_ophwe_hl | fixture | 8903B / 18파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_7xherpno | fixture | 361B / 11파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_ojl4y3t0 | fixture | 6218B / 19파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_jv32vpyc | fixture | 362B / 11파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_9_me3c9j | fixture | 2005B / 15파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_ckiv3y2m | fixture | 2005B / 15파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_l5dimy98 | fixture | 2005B / 15파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_9o2bglp0 | fixture | 362B / 11파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_1ru69tri | fixture | 2137B / 16파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_mjcnti07 | fixture | 362B / 11파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_gst_env_td702sz9 | fixture | 3638B / 19파일 | 소유한 전용 root 삭제 | 부재 확인 | unit-results.json |
| /private/tmp/media-server-gst-env-recheck.YEjVi4 | 실제 plugin·registry·probe | 3303755B / 566파일 | 전용 root 삭제 | 부재 확인 | runtime-results.json |

원본 sample·사용자 registry·GTK3/GTK4/Python 플러그인 5개 SHA는 모두 불변이다. JSON의 원문에는 credential/session/token이 포함되지 않는 최소 테스트 환경만 기록했다.

시작 2026-09-04T12:00:05.678Z, 종료 2026-09-04T12:00:15.298Z. 실제 명령 101개 중 100개 exit 0/1개 exit 1. 별도 assertion 51개 통과. S05 등록 수 대조 실패 이후 build는 미실행이다. token start/end/consumed는 goal 계측 부재로 미집계.
