// 파일 용도: 검증 전용 recvonly H264 offer. stdout은 부모의 bounded memory pipe이며 공개 로그가 아니다.
#include <gst/gst.h>
#include <gst/sdp/sdp.h>
#include <gst/webrtc/webrtc.h>
#include <iostream>

int main(int argc, char**) {
    if (argc != 1) return 2;
    gst_init(nullptr, nullptr);
    GstElement* pipeline = gst_pipeline_new(nullptr);
    GstElement* rtc = gst_element_factory_make("webrtcbin", nullptr);
    if (!pipeline || !rtc) {
        if (pipeline) gst_object_unref(pipeline);
        if (rtc) gst_object_unref(rtc);
        return 2;
    }
    if (!gst_bin_add(GST_BIN(pipeline), rtc)) {
        gst_object_unref(rtc);
        gst_object_unref(pipeline);
        return 2;
    }
    // ICE gathering/외부 STUN 호출을 시작하지 않는다. 제품 서버의 ICE는 부모가 별도로 격리한다.
    g_object_set(rtc, "bundle-policy", GST_WEBRTC_BUNDLE_POLICY_MAX_BUNDLE,
                 "stun-server", nullptr, "turn-server", nullptr, nullptr);
    GstCaps* caps = gst_caps_from_string(
        "application/x-rtp,media=video,encoding-name=H264,clock-rate=90000,"
        "payload=96,packetization-mode=(string)1");
    GstWebRTCRTPTransceiver* transceiver = nullptr;
    if (caps) {
        g_signal_emit_by_name(rtc, "add-transceiver",
                             GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_RECVONLY, caps, &transceiver);
        gst_caps_unref(caps);
    }
    bool ok = transceiver && gst_element_set_state(pipeline, GST_STATE_READY) != GST_STATE_CHANGE_FAILURE;
    if (transceiver) gst_object_unref(transceiver);
    GstWebRTCSessionDescription* offer = nullptr;
    if (ok) {
        GstPromise* promise = gst_promise_new();
        g_signal_emit_by_name(rtc, "create-offer", nullptr, promise);
        // 부모가 전체 native process를 10초로 제한한다. promise 대기를 성공으로 추정하지 않는다.
        ok = gst_promise_wait(promise) == GST_PROMISE_RESULT_REPLIED;
        const GstStructure* reply = ok ? gst_promise_get_reply(promise) : nullptr;
        ok = reply && gst_structure_get(reply, "offer", GST_TYPE_WEBRTC_SESSION_DESCRIPTION, &offer, nullptr);
        gst_promise_unref(promise);
    }
    gchar* text = ok && offer ? gst_sdp_message_as_text(offer->sdp) : nullptr;
    if (!text) ok = false;
    if (offer) gst_webrtc_session_description_free(offer);
    if (gst_element_set_state(pipeline, GST_STATE_NULL) == GST_STATE_CHANGE_FAILURE) ok = false;
    GstState state = GST_STATE_VOID_PENDING;
    if (gst_element_get_state(pipeline, &state, nullptr, 3 * GST_SECOND) == GST_STATE_CHANGE_FAILURE ||
        state != GST_STATE_NULL) {
        g_free(text);
        // callback이 살아 있는 객체를 해제하지 않는다. 부모는 비정상 종료로 판정한다.
        return 2;
    }
    gst_object_unref(pipeline);
    if (ok) std::cout << text;
    g_free(text);
    return ok ? 0 : 2;
}
