#include "ingress/gst_pipeline_builder.h"

#include <filesystem>

namespace ingress {

namespace {

std::string BuildVideoBranch(VideoCodec video_codec) {
    if (video_codec == VideoCodec::H265) {
        return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
               "! queue ! decodebin ! queue ! videoconvert ! video/x-raw,format=I420 "
               "! x265enc tune=zerolatency speed-preset=ultrafast bitrate=2048 key-int-max=30 "
               "! h265parse config-interval=-1 ! rtph265pay name=pay0 pt=96 ";
    }

    return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
           "! queue ! decodebin ! queue ! videoconvert ! video/x-raw,format=I420 "
           "! x264enc tune=zerolatency speed-preset=ultrafast bitrate=2048 key-int-max=30 byte-stream=false "
           "! identity ts-offset=-3600000000000000 "
           "! h264parse config-interval=-1 ! rtph264pay name=pay0 pt=96 config-interval=1 ";
}

std::string BuildAudioBranch(media::CodecId audio_codec) {
    switch (audio_codec) {
        case media::CodecId::AAC:
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
