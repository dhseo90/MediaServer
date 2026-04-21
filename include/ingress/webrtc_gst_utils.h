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
GstWebRTCSessionDescription* BuildSessionDescriptionWithoutRtcpFeedback(
    const GstWebRTCSessionDescription* description);
RtcpWorkaroundStats ApplyRtcpWorkarounds(GstElement* root, GstElement* pipeline);
void OnDeepElementAdded(GstBin* bin, GstBin* sub_bin, GstElement* element, gpointer user_data);

}  // namespace ingress::webrtc_gst
#endif
