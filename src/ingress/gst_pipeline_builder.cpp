// 파일 용도: 요청 route의 video/audio codec에 맞는 RTSP egress GStreamer pipeline 문자열을 만든다.
#include "ingress/gst_pipeline_builder.h"

#include <filesystem>

namespace ingress {

namespace {

std::string BuildVideoBranch(VideoCodec video_codec) {
    if (video_codec == VideoCodec::H265) {
        // H265 route는 어떤 입력이 오더라도 decode 후 x265로 재인코딩해 route contract를 맞춘다.
        return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
               "! queue ! decodebin ! queue ! videoconvert ! video/x-raw,format=I420 "
               "! x265enc tune=zerolatency speed-preset=ultrafast bitrate=2048 key-int-max=30 "
               "! h265parse config-interval=-1 ! rtph265pay name=pay0 pt=96 ";
    }

    // H264 route도 decode/encode 경로를 유지해 H265/WebRTC/HTTP source를 모두 H264로 변환한다.
    // x264enc가 만들 수 있는 큰 timestamp offset은 identity에서 보정해 RTSP preroll timeout을 막는다.
    return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
           "! queue ! decodebin ! queue ! videoconvert ! video/x-raw,format=I420 "
           "! x264enc tune=zerolatency speed-preset=ultrafast bitrate=2048 key-int-max=30 byte-stream=false "
           "! identity ts-offset=-3600000000000000 "
           "! h264parse config-interval=-1 ! rtph264pay name=pay0 pt=96 config-interval=1 ";
}

std::string BuildAudioBranch(media::CodecId audio_codec) {
    switch (audio_codec) {
        case media::CodecId::AAC:
            // default audio route는 모든 입력 audio를 AAC RTP로 통일한다.
            return "appsrc name=audio_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! decodebin ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=48000 "
                   "! avenc_aac bitrate=128000 ! aacparse ! rtpmp4gpay name=pay1 pt=97 ";
        case media::CodecId::Opus:
            return "appsrc name=audio_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! decodebin ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=48000 "
                   "! opusenc bitrate=64000 ! rtpopuspay name=pay1 pt=97 ";
        case media::CodecId::PCMU:
            return "appsrc name=audio_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! decodebin ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=8000,channels=1 "
                   "! mulawenc ! rtppcmupay name=pay1 pt=0 ";
        case media::CodecId::PCMALaw:
            return "appsrc name=audio_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! decodebin ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=8000,channels=1 "
                   "! alawenc ! rtppcmapay name=pay1 pt=8 ";
        case media::CodecId::Unknown:
        case media::CodecId::VP8:
        case media::CodecId::H264:
        case media::CodecId::H265:
            return {};
    }
    return {};
}

}  // namespace

std::string BuildFactoryLaunch(VideoCodec video_codec, media::CodecId audio_codec) {
    const std::string audio_branch = BuildAudioBranch(audio_codec);
    // gst-rtsp-server는 pay0/pay1 이름을 보고 SDP media stream을 자동 수집한다.
    return "( " + BuildVideoBranch(video_codec) + audio_branch + ")";
}

std::string BuildSourceUriForDecodeBin(const media::SourceSpec& spec) {
    if (spec.kind == media::SourceSpec::Kind::Rtsp ||
        spec.kind == media::SourceSpec::Kind::WebRtc ||
        spec.kind == media::SourceSpec::Kind::Hls ||
        spec.kind == media::SourceSpec::Kind::Http ||
        spec.kind == media::SourceSpec::Kind::Youtube) {
        return spec.uri;
    }

    if (spec.uri.rfind("file://", 0) == 0) {
        return spec.uri;
    }

    std::filesystem::path path(spec.uri);
    if (path.is_relative()) {
        path = std::filesystem::absolute(path);
    }
    return std::string("file://") + path.string();
}

bool ShouldLoopOnEos(const media::SourceSpec& spec) {
    return spec.kind == media::SourceSpec::Kind::File;
}

}  // namespace ingress
