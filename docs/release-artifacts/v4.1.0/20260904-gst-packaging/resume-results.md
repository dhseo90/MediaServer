# GStreamer 패키징 재개 검증 개별 결과

현재 macOS arm64의 임시 후보 환경 검증이다. 제품 기본값 적용, 다른 PC/OS, 장시간·UI 통과를 의미하지 않는다.
[기계 판독 결과](resume-results.json), [최초 실패 기록](individual-results.json), [테스트 기록 기준](../../../release-test-records.md)을 함께 읽는다.
테스트 원문 메시지는 식별 정확성을 위해 원문으로 보존한다. 모의 application 검사와 실제 미디어·저장 큐 검사는 구분한다.

실행 시작: 2026-09-04T11:19:21.138Z. 마지막 실행 갱신: 2026-09-04T11:22:30.959Z. 명령 실측 누적 70311ms.
token start/end/consumed: 미집계. source: goal 기반 계측 없음. 개별 elapsedMs는 JSON에 보존한다.

## 실제 실행 명령 전수

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| PKG-NODE | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node "-p" "JSON.stringify({version:process.version,exe:process.execPath})"; exit=0; 19ms; {"version":"v24.13.0","exe":"/Users/dhseo/.nvm/versions/node/v24.13.0/bin/node"} | pass | stderr 경고 0 |
| PKG-02-prepare | /bin/bash "-c" "source \"$1\"; media_server_apply_homebrew_gst_env; exec \"$2\" -e \"$3\"" "media-server-env-capture" "/Users/dhseo/Workspace/mediaServer/scripts/internal/env_common.sh" "/Users/dhseo/.nvm/versions/node/v24.13.0/bin/node" "process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(GST_\|GI_\|DYLD_\|PKG_CONFIG_PATH$\|HOMEBREW_PREFIX$\|PATH$)/.test(k)))))"; exit=0; 53ms; {"GST_PLUGIN_SCANNER":"/opt/homebrew/Cellar/gstreamer/1.28.1/libexec/gstreamer-1.0/gst-plugin-scanner","DYLD_FALLBACK_LIBRARY_PATH":"/opt/homebrew/lib:/usr/local/lib:/usr/lib","PATH":"/opt/homebrew/bin:/Users/dhseo/.nvm/versions/node/v24.13.0/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin","HOMEBREW_PREFIX":"/opt/homebrew","DYLD_LIBRARY_PATH":"/opt/homebrew/lib:/usr/local/lib:/usr/lib","GST_PLUGIN_PATH":"/opt/homebrew/lib/gstreamer-1.0:/opt/homebrew/opt/libnice-gstreamer/libexec/gstreamer-1.0","PKG_CONFIG_PATH":"/opt/homebrew/lib/pkgconfig:/opt/homebrew/share/pkgconfig","GI_TYPELIB_PATH":"/opt/homebrew/lib/girepository-1.0"} | pass | 최초 경로 가정 실패 후 실제 process.execPath 사용으로 pass |
| PKG-01 | /opt/homebrew/bin/gst-inspect-1.0; exit=0; 1189ms; Total count: 281 plugins (2 blacklist entries not shown), 1527 features | pass | 관찰 명령만 pass. GTK 6/GI 3 경고 재현; 무경고 통과 아님 |
| PKG-02 | /opt/homebrew/bin/gst-inspect-1.0; exit=0; 1420ms; Total count: 281 plugins (1 blacklist entry not shown), 1527 features | pass | 관찰 명령만 pass. GTK 6/GI 0 경고 재현; 무경고 통과 아님 |
| PKG-03 | /opt/homebrew/bin/gst-inspect-1.0; exit=0; 1111ms; Total count: 278 plugins (2 blacklist entries not shown), 1525 features | pass | 관찰 명령만 pass. GTK 0/GI 3 경고 재현; 무경고 통과 아님 |
| PKG-04 | /opt/homebrew/bin/gst-inspect-1.0; exit=0; 1007ms; Total count: 277 plugins (1 blacklist entry not shown), 1525 features | pass | stderr 경고 0 |
| PKG-05 | /opt/homebrew/bin/gst-inspect-1.0; exit=0; 58ms; Total count: 277 plugins (1 blacklist entry not shown), 1525 features | pass | stderr 경고 0 |
| PKG-F-appsrc | /opt/homebrew/bin/gst-inspect-1.0 "appsrc"; exit=0; 48ms;   Long-name                AppSrc /   Name                     app /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstapp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-appsink | /opt/homebrew/bin/gst-inspect-1.0 "appsink"; exit=0; 48ms;   Long-name                AppSink /   Name                     app /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstapp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-filesrc | /opt/homebrew/bin/gst-inspect-1.0 "filesrc"; exit=0; 45ms;   Long-name                File Source /   Name                     coreelements /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstcoreelements.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-filesink | /opt/homebrew/bin/gst-inspect-1.0 "filesink"; exit=0; 46ms;   Long-name                File Sink /   Name                     coreelements /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstcoreelements.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-fdsink | /opt/homebrew/bin/gst-inspect-1.0 "fdsink"; exit=0; 45ms;   Long-name                Filedescriptor Sink /   Name                     coreelements /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstcoreelements.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-queue | /opt/homebrew/bin/gst-inspect-1.0 "queue"; exit=0; 49ms;   Long-name                Queue /   Name                     coreelements /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstcoreelements.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-identity | /opt/homebrew/bin/gst-inspect-1.0 "identity"; exit=0; 49ms;   Long-name                Identity /   Name                     coreelements /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstcoreelements.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-fakesink | /opt/homebrew/bin/gst-inspect-1.0 "fakesink"; exit=0; 51ms;   Long-name                Fake Sink /   Name                     coreelements /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstcoreelements.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-concat | /opt/homebrew/bin/gst-inspect-1.0 "concat"; exit=0; 46ms;   Long-name                Concat /   Name                     coreelements /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstcoreelements.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-qtdemux | /opt/homebrew/bin/gst-inspect-1.0 "qtdemux"; exit=0; 50ms;   Long-name                QuickTime demuxer /   Name                     isomp4 /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstisomp4.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-qtmux | /opt/homebrew/bin/gst-inspect-1.0 "qtmux"; exit=0; 51ms;   Long-name                QuickTime Muxer /   Name                     isomp4 /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstisomp4.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-mp4mux | /opt/homebrew/bin/gst-inspect-1.0 "mp4mux"; exit=0; 51ms;   Long-name                MP4 Muxer /   Name                     isomp4 /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstisomp4.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-matroskamux | /opt/homebrew/bin/gst-inspect-1.0 "matroskamux"; exit=0; 53ms;   Long-name                Matroska muxer /   Name                     matroska /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstmatroska.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-matroskademux | /opt/homebrew/bin/gst-inspect-1.0 "matroskademux"; exit=0; 51ms;   Long-name                Matroska demuxer /   Name                     matroska /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstmatroska.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-h264parse | /opt/homebrew/bin/gst-inspect-1.0 "h264parse"; exit=0; 47ms;   Long-name                H.264 parser /   Name                     videoparsersbad /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstvideoparsersbad.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-mpegtsmux | /opt/homebrew/bin/gst-inspect-1.0 "mpegtsmux"; exit=0; 51ms;   Long-name                MPEG Transport Stream Muxer /   Name                     mpegtsmux /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstmpegtsmux.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-tsdemux | /opt/homebrew/bin/gst-inspect-1.0 "tsdemux"; exit=0; 50ms;   Long-name                MPEG transport stream demuxer /   Name                     mpegtsdemux /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstmpegtsdemux.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-avdec_h264 | /opt/homebrew/bin/gst-inspect-1.0 "avdec_h264"; exit=0; 59ms;   Long-name                libav H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 decoder /   Name                     libav /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstlibav.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-videoconvert | /opt/homebrew/bin/gst-inspect-1.0 "videoconvert"; exit=0; 48ms;   Long-name                Video colorspace converter /   Name                     videoconvertscale /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstvideoconvertscale.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-videoscale | /opt/homebrew/bin/gst-inspect-1.0 "videoscale"; exit=0; 50ms;   Long-name                Video scaler /   Name                     videoconvertscale /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstvideoconvertscale.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-videorate | /opt/homebrew/bin/gst-inspect-1.0 "videorate"; exit=0; 53ms;   Long-name                Video rate adjuster /   Name                     videorate /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstvideorate.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-jpegenc | /opt/homebrew/bin/gst-inspect-1.0 "jpegenc"; exit=0; 47ms;   Long-name                JPEG image encoder /   Name                     jpeg /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstjpeg.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-rtspsrc | /opt/homebrew/bin/gst-inspect-1.0 "rtspsrc"; exit=0; 63ms;   Long-name                RTSP packet receiver /   Name                     rtsp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstrtsp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-rtph264pay | /opt/homebrew/bin/gst-inspect-1.0 "rtph264pay"; exit=0; 57ms;   Long-name                RTP H264 payloader /   Name                     rtp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstrtp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-rtph264depay | /opt/homebrew/bin/gst-inspect-1.0 "rtph264depay"; exit=0; 50ms;   Long-name                RTP H264 depayloader /   Name                     rtp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstrtp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-rtph265pay | /opt/homebrew/bin/gst-inspect-1.0 "rtph265pay"; exit=0; 46ms;   Long-name                RTP H265 payloader /   Name                     rtp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstrtp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-rtph265depay | /opt/homebrew/bin/gst-inspect-1.0 "rtph265depay"; exit=0; 46ms;   Long-name                RTP H265 depayloader /   Name                     rtp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstrtp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-h265parse | /opt/homebrew/bin/gst-inspect-1.0 "h265parse"; exit=0; 45ms;   Long-name                H.265 parser /   Name                     videoparsersbad /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstvideoparsersbad.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-webrtcbin | /opt/homebrew/bin/gst-inspect-1.0 "webrtcbin"; exit=0; 51ms;   Long-name                WebRTC Bin /   Name                     webrtc /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstwebrtc.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-nicesrc | /opt/homebrew/bin/gst-inspect-1.0 "nicesrc"; exit=0; 49ms;   Long-name                ICE source /   Name                     nice /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstnice.dylib /   Version                  0.1.23 | pass | stderr 경고 0 |
| PKG-F-nicesink | /opt/homebrew/bin/gst-inspect-1.0 "nicesink"; exit=0; 48ms;   Long-name                ICE sink /   Name                     nice /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstnice.dylib /   Version                  0.1.23 | pass | stderr 경고 0 |
| PKG-F-dtlsenc | /opt/homebrew/bin/gst-inspect-1.0 "dtlsenc"; exit=0; 45ms;   Long-name                DTLS Encoder /   Name                     dtls /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstdtls.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-dtlsdec | /opt/homebrew/bin/gst-inspect-1.0 "dtlsdec"; exit=0; 50ms;   Long-name                DTLS Decoder /   Name                     dtls /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstdtls.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-srtpenc | /opt/homebrew/bin/gst-inspect-1.0 "srtpenc"; exit=0; 46ms;   Long-name                SRTP encoder /   Name                     srtp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstsrtp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-srtpdec | /opt/homebrew/bin/gst-inspect-1.0 "srtpdec"; exit=0; 46ms;   Long-name                SRTP decoder /   Name                     srtp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstsrtp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-rtpbin | /opt/homebrew/bin/gst-inspect-1.0 "rtpbin"; exit=0; 48ms;   Long-name                RTP Bin /   Name                     rtpmanager /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstrtpmanager.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-vp8enc | /opt/homebrew/bin/gst-inspect-1.0 "vp8enc"; exit=0; 48ms;   Long-name                On2 VP8 Encoder /   Name                     vpx /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstvpx.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-vp8dec | /opt/homebrew/bin/gst-inspect-1.0 "vp8dec"; exit=0; 46ms;   Long-name                On2 VP8 Decoder /   Name                     vpx /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstvpx.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-opusenc | /opt/homebrew/bin/gst-inspect-1.0 "opusenc"; exit=0; 47ms;   Long-name                Opus audio encoder /   Name                     opus /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstopus.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-opusdec | /opt/homebrew/bin/gst-inspect-1.0 "opusdec"; exit=0; 50ms;   Long-name                Opus audio decoder /   Name                     opus /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstopus.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-audioconvert | /opt/homebrew/bin/gst-inspect-1.0 "audioconvert"; exit=0; 47ms;   Long-name                Audio converter /   Name                     audioconvert /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstaudioconvert.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-audioresample | /opt/homebrew/bin/gst-inspect-1.0 "audioresample"; exit=0; 47ms;   Long-name                Audio resampler /   Name                     audioresample /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstaudioresample.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-rtpopuspay | /opt/homebrew/bin/gst-inspect-1.0 "rtpopuspay"; exit=0; 46ms;   Long-name                RTP Opus payloader /   Name                     rtp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstrtp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-F-rtpopusdepay | /opt/homebrew/bin/gst-inspect-1.0 "rtpopusdepay"; exit=0; 46ms;   Long-name                RTP Opus packet depayloader /   Name                     rtp /   Filename                 /private/tmp/media-server-gst-packaging-resume.9NfixH/no-gtk-python plugins with spaces/libgstrtp.dylib /   Version                  1.28.1 | pass | stderr 경고 0 |
| PKG-probe-flags | /opt/homebrew/bin/pkg-config "--cflags" "--libs" "gstreamer-1.0"; exit=0; 11ms; -I/opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -I/opt/homebrew/Cellar/glib/2.86.4/include -I/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -I/opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -I/opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -I/opt/homebrew/opt/gettext/include -I/opt/homebrew/Cellar/pcre2/10.47_1/include -L/opt/homebrew/Cellar/gstreamer/1.28.1/lib -lgstreamer-1.0 -Wl,-rpath,/opt/homebrew/Cellar/gstreamer/1.28.1/lib -L/opt/homebrew/Cellar/glib/2.86.4/lib -lgobject-2.0 -lglib-2.0 -L/opt/homebrew/opt/gettext/lib -lintl | pass | stderr 경고 0 |
| PKG-probe-build | /usr/bin/c++ "-std=c++17" "/private/tmp/media-server-gst-packaging-resume.9NfixH/probe.cpp" "-I/opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0" "-I/opt/homebrew/Cellar/glib/2.86.4/include" "-I/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi" "-I/opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0" "-I/opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include" "-I/opt/homebrew/opt/gettext/include" "-I/opt/homebrew/Cellar/pcre2/10.47_1/include" "-L/opt/homebrew/Cellar/gstreamer/1.28.1/lib" "-lgstreamer-1.0" "-Wl,-rpath,/opt/homebrew/Cellar/gstreamer/1.28.1/lib" "-L/opt/homebrew/Cellar/glib/2.86.4/lib" "-lgobject-2.0" "-lglib-2.0" "-L/opt/homebrew/opt/gettext/lib" "-lintl" "-o" "/private/tmp/media-server-gst-packaging-resume.9NfixH/probe"; exit=0; 282ms;  | pass | stderr 경고 0 |
| PKG-factory-create | /private/tmp/media-server-gst-packaging-resume.9NfixH/probe "appsrc" "appsink" "filesrc" "filesink" "fdsink" "queue" "identity" "fakesink" "concat" "qtdemux" "qtmux" "mp4mux" "matroskamux" "matroskademux" "h264parse" "mpegtsmux" "tsdemux" "avdec_h264" "videoconvert" "videoscale" "videorate" "jpegenc" "rtspsrc" "rtph264pay" "rtph264depay" "rtph265pay" "rtph265depay" "h265parse" "webrtcbin" "nicesrc" "nicesink" "dtlsenc" "dtlsdec" "srtpenc" "srtpdec" "rtpbin" "vp8enc" "vp8dec" "opusenc" "opusdec" "audioconvert" "audioresample" "rtpopuspay" "rtpopusdepay"; exit=0; 506ms; 44개 생성과 READY 출력 확인 | pass | stderr 경고 0 |
| PKG-08 | /opt/homebrew/bin/gst-launch-1.0 "-q" "filesrc" "location=/Users/dhseo/Workspace/mediaServer/video/sample_h264_video_only.mp4" "!" "qtdemux" "!" "h264parse" "!" "avdec_h264" "!" "fakesink" "sync=false"; exit=0; 471ms;  | pass | stderr 경고 0 |
| PKG-09 | ./server.sh "verify-v410-event-recording"; exit=0; 25210ms; [v410-s05-inventory-unit] pass=26 fail=0 / [verify-v410-event-recording] pass=140 fail=0 / - summary: pass=7 fail=0 / [s05-runtime-summary] case=disabled-admit pass=7 fail=0 / [s05-runtime-summary] case=disabled-recover pass=3 fail=0 / [s05-runtime-summary] case=enabled-admit pass=7 fail=0 / [s05-runtime-summary] case=enabled-recover pass=3 fail=0 / [s05-runtime-negative] pass=2 fail=0 elapsedMs=14733 / [S05 개별 실행] pass=27 fail=0 | pass | stderr 경고 0 |
| PKG-10 | ./server.sh "build"; exit=0; 36819ms; [env] local override skipped / [1/2] configure: /Users/dhseo/Workspace/mediaServer/build-gst-onnx (ai=1, youtube=0) / -- Configuring done (0.1s) / -- Generating done (0.0s) / [ 98%] Built target media_server_runtime / [100%] Built target media_server / [done] build=/Users/dhseo/Workspace/mediaServer/build-gst-onnx/media_server | pass | stderr 경고 0 |

## 필수 factory 실제 생성 전수

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| PKG-CREATE-appsrc | gst_element_factory_make("appsrc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-appsink | gst_element_factory_make("appsink") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-filesrc | gst_element_factory_make("filesrc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-filesink | gst_element_factory_make("filesink") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-fdsink | gst_element_factory_make("fdsink") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-queue | gst_element_factory_make("queue") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-identity | gst_element_factory_make("identity") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-fakesink | gst_element_factory_make("fakesink") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-concat | gst_element_factory_make("concat") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-qtdemux | gst_element_factory_make("qtdemux") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-qtmux | gst_element_factory_make("qtmux") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-mp4mux | gst_element_factory_make("mp4mux") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-matroskamux | gst_element_factory_make("matroskamux") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-matroskademux | gst_element_factory_make("matroskademux") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-h264parse | gst_element_factory_make("h264parse") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-mpegtsmux | gst_element_factory_make("mpegtsmux") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-tsdemux | gst_element_factory_make("tsdemux") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-avdec_h264 | gst_element_factory_make("avdec_h264") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-videoconvert | gst_element_factory_make("videoconvert") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-videoscale | gst_element_factory_make("videoscale") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-videorate | gst_element_factory_make("videorate") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-jpegenc | gst_element_factory_make("jpegenc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-rtspsrc | gst_element_factory_make("rtspsrc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-rtph264pay | gst_element_factory_make("rtph264pay") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-rtph264depay | gst_element_factory_make("rtph264depay") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-rtph265pay | gst_element_factory_make("rtph265pay") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-rtph265depay | gst_element_factory_make("rtph265depay") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-h265parse | gst_element_factory_make("h265parse") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-webrtcbin | gst_element_factory_make("webrtcbin") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-nicesrc | gst_element_factory_make("nicesrc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-nicesink | gst_element_factory_make("nicesink") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-dtlsenc | gst_element_factory_make("dtlsenc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-dtlsdec | gst_element_factory_make("dtlsdec") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-srtpenc | gst_element_factory_make("srtpenc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-srtpdec | gst_element_factory_make("srtpdec") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-rtpbin | gst_element_factory_make("rtpbin") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-vp8enc | gst_element_factory_make("vp8enc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-vp8dec | gst_element_factory_make("vp8dec") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-opusenc | gst_element_factory_make("opusenc") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-opusdec | gst_element_factory_make("opusdec") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-audioconvert | gst_element_factory_make("audioconvert") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-audioresample | gst_element_factory_make("audioresample") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-rtpopuspay | gst_element_factory_make("rtpopuspay") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |
| PKG-CREATE-rtpopusdepay | gst_element_factory_make("rtpopusdepay") 실제 객체 반환 및 해제; PKG-factory-create exit 0 | pass | 조회 결과만으로 대체하지 않음 |

## 환경 보조 판정과 원본 보존

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| PKG-06 공백 경로 | 공백이 포함된 plugin/registry 경로로 PKG-04/05 실행, 동일 목록·경고 0 | pass | 임시 경로 전용 |
| PKG-07 WebRTC READY | 실제 webrtcbin 객체 GST_STATE_READY 전환과 get_state 결과 확인 | pass | 브라우저·ICE 연결 아님 |
| 전체 feature 대조 | 1527 → 1525; gtksink·gtk4paintablesink만 제외, 추가 0; typefind 포함 개별 행 수가 Total count와 일치 | pass | 두 공백 형식의 1364/1362 부분 집계도 JSON에 별도 보존; 전체 비교는 1527/1525 |
| PKG-BL blacklist 조회 | gst-inspect-1.0 -b; exit 0; libgstvalidatessim.dylib 1개; stderr 비어 있음 | pass | 이름 조회만 pass. blacklist 원인은 미확인 |
| 원본 불변: /Users/dhseo/Workspace/mediaServer/video/sample_h264_video_only.mp4 | 실행 전후 SHA-256 b1d90231de3c6b816e58715c9b12ba54bd31583301d08e943e678e46b02ad18b 일치 | pass | 패키지·사용자 캐시·sample 변경 없음 |
| 원본 불변: /Users/dhseo/.cache/gstreamer-1.0/registry.aarch64.bin | 실행 전후 SHA-256 26dfd301fee0f2cd5935c96595811064853a6326ddb9a76ca10837bdd35c0de4 일치 | pass | 패키지·사용자 캐시·sample 변경 없음 |
| 원본 불변: /opt/homebrew/lib/gstreamer-1.0/libgstgtk.dylib | 실행 전후 SHA-256 1253d26477c27edfb5676eb5b5d2cd371b5ea62b85212a3e0a79ed010f828925 일치 | pass | 패키지·사용자 캐시·sample 변경 없음 |
| 원본 불변: /opt/homebrew/lib/gstreamer-1.0/libgstgtk4.dylib | 실행 전후 SHA-256 33c231ab3c7ea8a667e41382df12e039e46bca3b1421f0ff30062c2fe9ac8fb0 일치 | pass | 패키지·사용자 캐시·sample 변경 없음 |
| 원본 불변: /opt/homebrew/lib/gstreamer-1.0/libgstpython.dylib | 실행 전후 SHA-256 46ba5e8149b924d255eff589d00c6fbfdccf41dff6348cca2cbc29d04c9cc257 일치 | pass | 패키지·사용자 캐시·sample 변경 없음 |
| PKG-11 변경 경계 | git diff --check exit 0; src/include/scripts/CMakeLists.txt 변경 없음 | pass | 문서와 결과 파일만 변경 |
| PKG-12 cleanup | 전용 root /private/tmp/media-server-gst-packaging-resume.9NfixH: 682개(559개 symlink 포함), 7714945바이트 삭제; 열린 파일 없음; rm/test ! -e exit 0 | pass | 설치 원본은 symlink 대상이므로 삭제하지 않음 |
| S05 runtime cleanup | /private/tmp/media-server-gst-packaging-resume.9NfixH/media_server_s05_storage_runtime_G73peG: 41개/9740816바이트, removed=true; 상위 전용 root 부재까지 확인 | pass | 기존 wrapper의 자체 mktemp도 EXIT trap으로 제거; 개별 크기는 미집계 |

## S05 등록기 단위 검사 26개

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| S05-UNIT-01 | 정상 정식 등록 27개; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-02 | 누락 ID; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-03 | 중복 ID; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-04 | 추가 ID; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-05 | 빈 테스트 영역; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-06 | 없는 구현 심볼; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-07 | 없는 테스트 함수; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-08 | 없는 check; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-09 | 중복 check ID; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-10 | 문서 행 누락; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-11 | 실행 소비자 정상 합성 입력; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-12 | 실제 check 결과 누락; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-13 | EOS assertion 제거와 감소한 summary도 거부; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-14 | 실패 summary; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-15 | 성공 summary만으로 PASS 금지; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-16 | 중복 application 결과; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-17 | runtime 로그 전체 누락; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-18 | runtime 시나리오 누락; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-19 | runtime assertion 누락 및 감소 summary; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-20 | runtime assertion 중복 및 증가 summary; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-21 | runtime summary 실패; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-22 | runtime summary 중복; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-23 | runtime failure marker; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-24 | runtime mutation 결과 누락; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-25 | runtime mutation 결과 중복; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |
| S05-UNIT-26 | runtime negative summary 실패; 정식 S05 내부 실행 | pass | 합성 입력을 이용한 등록기 검사; 제품 실행 대체 아님 |

## S05 C++ assertion 140개

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| S05-CPP-001 | 기본 pending event link가 유효해야 함: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-002 | terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-003 | terminal 대기 요청이 현재 범위를 축소하면 거부해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-004 | 미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-005 | 미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-006 | 서로 겹치는 ordered overlap을 거부해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-007 | overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-008 | unknown link status를 영속 계약으로 허용하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-009 | locator 없는 fallback evidence를 거부해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-010 | journal open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-011 | catalog open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-012 | event link 갱신은 SQLite primary projection에서 검증해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-013 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-014 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-015 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-016 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-017 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-018 | retention policy 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-019 | 이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-020 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-021 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-022 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-023 | 완전한 archive 파생 완료 뒤 ready clip을 반환해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-024 | event link ID와 derived clip path가 반환되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-025 | 반개구간 overlap은 맞닿기만 한 segment를 제외해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-026 | media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-027 | overlap segment가 UTC 순서로 전달되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-028 | 파생 성공 link가 catalog complete로 저장되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-029 | 파생 완료 뒤 원본 hold가 해제되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-030 | 파생 완료 뒤 원본 hold가 해제되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-031 | 파생 완료 뒤 원본 hold가 해제되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-032 | 같은 event update는 파생 clip을 중복 생성하지 않아야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-033 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-034 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-035 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-036 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-037 | 완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-038 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-039 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-040 | cam-b policy 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-041 | archive gap이 있으면 complete로 표시하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-042 | link가 정확한 missing UTC range를 보존해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-043 | frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-044 | 같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-045 | cam-late policy 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-046 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-047 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-048 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-049 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-050 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-051 | anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-052 | PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-053 | anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-054 | 같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-055 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-056 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-057 | 파생 중 원본 segment hold가 유지되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-058 | 확장 회귀 journal open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-059 | 확장 회귀 initial catalog open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-060 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-061 | cleanup 확장 fixture 저장 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-062 | cleanup 확장 fixture 저장 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-063 | 확장 회귀 restart catalog open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-064 | 확장 policy 실패; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-065 | cleanup 확장 remux 실패는 한 번만 실행되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-066 | 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-067 | 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-068 | PTS 확장은 다른 범위 ID를 사용해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-069 | 미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-070 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-071 | PTS 확장 2회는 최초 포함 총 3회 파생해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-072 | quota journal open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-073 | quota catalog open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-074 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-075 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-076 | quota policy 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-077 | event quota는 oldest event를 정리해 새 event write를 허용해야 함: ok; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-078 | event quota 충족을 위해 continuous를 삭제하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-079 | event quota는 oldest eligible event를 삭제해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-080 | policy 재등록 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-081 | policy 제거가 진행 중 event reservation을 지우면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-082 | 명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-083 | queue journal open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-084 | queue catalog open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-085 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-086 | queue policy 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-087 | bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-088 | 긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-089 | cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-090 | terminal marker unlink 실패 시 source/output hold를 유지해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-091 | terminal marker unlink 실패 시 event reservation을 유지해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-092 | marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-093 | terminal hold 해제 실패를 Complete로 기록하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-094 | terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-095 | 복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-096 | terminal complete commit retry fixture 저장 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-097 | complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-098 | overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-099 | hold overflow fixture 준비 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-100 | event source lease hold_count overflow를 사전에 거부해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-101 | hold fixture journal open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-102 | hold fixture catalog open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-103 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-104 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-105 | hold pending link 저장 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-106 | hold replay journal open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-107 | hold replay catalog open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-108 | 재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-109 | terminal stage fixture event link 조회; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-110 | terminal stage fixture 저장 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-111 | terminal stage replay journal open: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-112 | terminal stage catalog open: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-113 | complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-114 | terminal Complete 기록 전 source 삭제 요청을 차단해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-115 | terminal Complete 기록 전 output 삭제 요청을 차단해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-116 | restart journal open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-117 | restart catalog open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-118 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-119 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-120 | restart pending link 저장 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-121 | 재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-122 | 재시작 복구에서 event clip을 중복 파생하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-123 | segment finalize 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-124 | conflict pending link 저장 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-125 | 다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-126 | segment ID conflict에서 파생을 실행하면 안 됨; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-127 | 실제 H264/MP4 source를 video 재인코딩 없이 remux해야 함: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-128 | remux 결과 파일과 size가 일치해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-129 | event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-130 | event clip이 source segment 전체 단순 연결보다 작아야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-131 | remux 결과 checksum과 crash cleanup marker를 남겨야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-132 | 동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-133 | 파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-134 | nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-135 | event remux recovery journal open 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-136 | 재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-137 | owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-138 | VP8/WebM test source 생성 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-139 | VP8/WebM test source demux 실패: ; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |
| S05-CPP-140 | 검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함; 정식 S05 pass=140/fail=0의 해당 실제 assertion | pass | 동일 메시지 반복도 실행 순서별 보존 |

## S05 application 검사 7개

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| S05-APP-1 | application header is standard-only with exact DTO/default manifests | pass | 정적/컴파일된 fake 경계 검사 포함; 실제 저장 큐 검증은 별도 |
| S05-APP-2 | application source owns exact canonical mapping and overwrite semantics | pass | 정적/컴파일된 fake 경계 검사 포함; 실제 저장 큐 검증은 별도 |
| S05-APP-3 | transport has zero canonical bypass and exact projection/call ordering | pass | 정적/컴파일된 fake 경계 검사 포함; 실제 저장 큐 검증은 별도 |
| S05-APP-4 | recording link is durably admitted before the bounded storage queue can drop an event | pass | 정적/컴파일된 fake 경계 검사 포함; 실제 저장 큐 검증은 별도 |
| S05-APP-5 | event clip output remains fd-bound and measured before no-replace publication | pass | 정적/컴파일된 fake 경계 검사 포함; 실제 저장 큐 검증은 별도 |
| S05-APP-6 | compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | pass | 정적/컴파일된 fake 경계 검사 포함; 실제 저장 큐 검증은 별도 |
| S05-APP-7 | S05 composition starts the bridge before ingress and drains it after storage | pass | 정적/컴파일된 fake 경계 검사 포함; 실제 저장 큐 검증은 별도 |

## S05 실제 저장 큐·복구 20개

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| S05-RUNTIME-01 | disabled-admit: 실제 EventStorage worker 진입을 관찰한다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-02 | disabled-admit: worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-03 | disabled-admit: 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-04 | disabled-admit: 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-05 | disabled-admit: 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-06 | disabled-admit: JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-07 | disabled-admit: JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-08 | disabled-recover: 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-09 | disabled-recover: 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-10 | disabled-recover: 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-11 | enabled-admit: 실제 EventStorage worker 진입을 관찰한다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-12 | enabled-admit: worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-13 | enabled-admit: 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-14 | enabled-admit: 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-15 | enabled-admit: 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-16 | enabled-admit: JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-17 | enabled-admit: JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-18 | enabled-recover: 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-19 | enabled-recover: 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |
| S05-RUNTIME-20 | enabled-recover: 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | pass | 실제 EventStorage/SQLite/journal/파생 코드 실행 |

## S05 음성 대조 2개

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| S05-MUTATION-1 | [s05-runtime-mutation] disabled-guard: PASS (실제 assertion의 RED 확인) | pass | 임시 source mutation의 기대 assertion 실패를 확인한 negative 통과 |
| S05-MUTATION-2 | [s05-runtime-mutation] prequeue-admission: PASS (실제 assertion의 RED 확인) | pass | 임시 source mutation의 기대 assertion 실패를 확인한 negative 통과 |

## S05 등록 action 27개

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| V410-S05-I01 | 선택 시간축 DTO 왕복; 3개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I02 | 저장 큐 이전 내구 접수; 21개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I03 | 명시적 PTS UTC 및 pre/post; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I04 | anchor 없는 PTS 내구 복구; 3개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I05 | 이벤트 중복 및 범위별 ID; 3개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I06 | 링크 계약과 가산 필드; 8개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I07 | 정렬 overlap 및 누락 구간; 4개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I08 | 원본 lease 획득 및 해제; 2개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I09 | 이벤트 용량과 예약 분리; 4개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I10 | 긴 remux 접수 비차단; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I11 | 포화 큐 내구 재흡수; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I12 | frame-buffer fallback 연결; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I13 | 완료 파생 clip 반환; 3개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I14 | H264 무재인코딩 실측 출력; 5개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I15 | 출력 무덮어쓰기와 fd 결박; 2개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I16 | 소유 crash partial 복구; 2개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I17 | VP8 파생 거부; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I18 | segment ID 충돌 거부; 2개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I19 | finalized 파생물 재시작 연결; 2개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I20 | terminal 단계와 삭제 보호; 5개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I21 | 보류 확장 및 재시작 수렴; 5개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I22 | hold overflow 거부; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I23 | SQLite 동일 링크 갱신; 2개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I24 | terminal replay 및 삭제 차단; 4개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I25 | 전송 DTO 경계; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I26 | 출력 fd 검증 계약; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |
| V410-S05-I27 | 제품 시작·종료 순서; 1개 check가 실제 로그에서 통과 | pass | 기존 등록 ID 유지 |

## S05 등록 check 89개

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| V410-S05-I01-C01 | application header is standard-only with exact DTO/default manifests | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I01-C02 | application source owns exact canonical mapping and overwrite semantics | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I01-C03 | compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C01 | recording link is durably admitted before the bounded storage queue can drop an event | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C02 | 실제 EventStorage worker 진입을 관찰한다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C03 | worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C04 | 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C05 | 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C06 | 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C07 | JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C08 | JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C09 | 실제 EventStorage worker 진입을 관찰한다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C10 | worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C11 | 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C12 | 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C13 | 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C14 | JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C15 | JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C16 | 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C17 | 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C18 | 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C19 | 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C20 | 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I02-C21 | 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I03-C01 | media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I04-C01 | anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I04-C02 | PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I04-C03 | anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I05-C01 | 같은 event update는 파생 clip을 중복 생성하지 않아야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I05-C02 | 완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I05-C03 | 같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I06-C01 | terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I06-C02 | terminal 대기 요청이 현재 범위를 축소하면 거부해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I06-C03 | 미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I06-C04 | 미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I06-C05 | 서로 겹치는 ordered overlap을 거부해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I06-C06 | overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I06-C07 | unknown link status를 영속 계약으로 허용하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I06-C08 | locator 없는 fallback evidence를 거부해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I07-C01 | 반개구간 overlap은 맞닿기만 한 segment를 제외해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I07-C02 | overlap segment가 UTC 순서로 전달되어야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I07-C03 | archive gap이 있으면 complete로 표시하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I07-C04 | link가 정확한 missing UTC range를 보존해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I08-C01 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 assertion 연결 횟수 14 |
| V410-S05-I08-C02 | 파생 완료 뒤 원본 hold가 해제되어야 함 | pass | 실제 assertion 연결 횟수 3 |
| V410-S05-I09-C01 | event quota 충족을 위해 continuous를 삭제하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I09-C02 | event quota는 oldest eligible event를 삭제해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I09-C03 | policy 제거가 진행 중 event reservation을 지우면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I09-C04 | 명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I10-C01 | 긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I11-C01 | bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I12-C01 | frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I13-C01 | 완전한 archive 파생 완료 뒤 ready clip을 반환해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I13-C02 | event link ID와 derived clip path가 반환되어야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I13-C03 | 파생 성공 link가 catalog complete로 저장되어야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I14-C01 | remux 결과 파일과 size가 일치해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I14-C02 | event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I14-C03 | event clip이 source segment 전체 단순 연결보다 작아야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I14-C04 | remux 결과 checksum과 crash cleanup marker를 남겨야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I14-C05 | 파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함:  | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I15-C01 | 동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I15-C02 | nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I16-C01 | 재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함:  | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I16-C02 | owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함:  | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I17-C01 | 검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I18-C01 | 다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I18-C02 | segment ID conflict에서 파생을 실행하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I19-C01 | 재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I19-C02 | 재시작 복구에서 event clip을 중복 파생하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I20-C01 | cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I20-C02 | terminal marker unlink 실패 시 source/output hold를 유지해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I20-C03 | terminal marker unlink 실패 시 event reservation을 유지해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I20-C04 | terminal hold 해제 실패를 Complete로 기록하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I20-C05 | complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I21-C01 | cleanup 확장 remux 실패는 한 번만 실행되어야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I21-C02 | 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | pass | 실제 assertion 연결 횟수 2 |
| V410-S05-I21-C03 | PTS 확장은 다른 범위 ID를 사용해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I21-C04 | 미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I21-C05 | PTS 확장 2회는 최초 포함 총 3회 파생해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I22-C01 | event source lease hold_count overflow를 사전에 거부해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I23-C01 | event link 갱신은 SQLite primary projection에서 검증해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I23-C02 | 같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I24-C01 | 재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I24-C02 | complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I24-C03 | terminal Complete 기록 전 source 삭제 요청을 차단해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I24-C04 | terminal Complete 기록 전 output 삭제 요청을 차단해야 함 | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I25-C01 | transport has zero canonical bypass and exact projection/call ordering | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I26-C01 | event clip output remains fd-bound and measured before no-replace publication | pass | 실제 assertion 연결 횟수 1 |
| V410-S05-I27-C01 | S05 composition starts the bridge before ingress and drains it after storage | pass | 실제 assertion 연결 횟수 1 |

## 미실행·경계

| 항목 | 상태·사유 | 완료 evidence 사용 |
| --- | --- | --- |
| 다른 PC 신규 설치 | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |
| macOS Intel | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |
| Linux | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |
| 브라우저 ICE/offer-answer 연결 | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |
| 외부 RTSP 카메라 | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |
| 30분 | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |
| 120분 | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |
| UI 풀테스트 | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |
| verify-predev | 이번 범위 밖 또는 별도 실행 환경·승인 미제공 | 불가 |

libgstvalidatessim은 [공식 문서](https://gstreamer.freedesktop.org/documentation/gst-devtools/plugins/ssim.html)의 프레임 회귀 비교용 플러그인이다. 해당 기능은 이번 필수 44개에 포함되지 않으며 blacklist 원인은 확정하지 않았다. 이 파일을 삭제하거나 성공으로 재분류하지 않았다.

제품 source/API/UI/설치 패키지 변경 없음. build-gst-onnx 산출물은 요청한 제품 빌드 결과이므로 유지한다. 커밋·푸시 미수행.
