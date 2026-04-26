// 파일 요약: WebRTC용 GStreamer 보정 유틸리티를 선언한다.
// 동작 요약: SDP sanitize, RTCP feedback 제거, pipeline clock/latency 설정 API를 제공한다.
// 동작 요약: egress와 source ingest가 같은 WebRTC workaround를 공유하게 한다.
#pragma once

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/gst.h>
#include <gst/webrtc/webrtc.h>

namespace ingress::webrtc_gst {

struct RtcpWorkaroundStats {
    guint retention_count{0};
    guint timestamp_probe_count{0};
};

void ConfigurePipelineClockAndLatency(GstElement* element);
void ConfigureIceServers(GstElement* webrtcbin);
GstWebRTCSessionDescription* BuildSessionDescriptionWithoutRtcpFeedback(
    const GstWebRTCSessionDescription* description);
RtcpWorkaroundStats ApplyRtcpWorkarounds(GstElement* root, GstElement* pipeline);
void OnDeepElementAdded(GstBin* bin, GstBin* sub_bin, GstElement* element, gpointer user_data);

}  // namespace ingress::webrtc_gst
#endif
