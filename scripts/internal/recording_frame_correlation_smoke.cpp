// 파일 용도: 원본 timestamp 연관과 실제 decoder 전달을 격리 검증한다.
#include "analysis/frame_source_association.h"
#include "analysis/raw_video_decoder.h"
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <condition_variable>
#include <chrono>
#include <mutex>
#include <iostream>
namespace {
    int passes=0,failures=0;
    void Check(bool ok,const char* title) {
        std::cout<<(ok?"[pass] ":"[fail] ")<<title<<'\n';
        ok?++passes:++failures;
    }
    media::Packet Packet(){
        media::Packet packet;
        packet.track_id="video-0";
        media::SampleObservation observation;
        observation.source_generation="generation-a";
        observation.generation_order=7;
        observation.ordinal=9;
        observation.pts_ns=123;
        packet.observation=observation;
        return packet;
    }
    bool ActualDecoder(){
        gst_init(nullptr,nullptr);
        GError* error=nullptr;
        auto* pipeline=gst_parse_launch("videotestsrc num-buffers=8 ! video/x-raw,width=160,height=90,framerate=10/1 ! vp8enc deadline=1 ! appsink name=sink sync=false",&error);
        if(!pipeline) {
            if(error)g_error_free(error);
            throw std::runtime_error("encoder setup");
        }
        auto* sink=gst_bin_get_by_name(GST_BIN(pipeline),"sink");
        gst_element_set_state(pipeline,GST_STATE_PLAYING);
        std::vector<media::Packet> packets;
        media::TrackInfo track;
        while(auto* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),2*GST_SECOND)) {
            auto* buffer=gst_sample_get_buffer(sample);
            GstMapInfo map{};
            if(gst_buffer_map(buffer,&map,GST_MAP_READ)) {
                auto packet=Packet();
                packet.codec=media::CodecId::VP8;
                packet.kind=media::MediaKind::Video;
                packet.pts=5000000000LL+GST_BUFFER_PTS(buffer);
                packet.dts=packet.pts;
                packet.is_key_frame=!GST_BUFFER_FLAG_IS_SET(buffer,GST_BUFFER_FLAG_DELTA_UNIT);
                packet.observation->pts_ns=packet.pts;
                packet.observation->ordinal=packets.size()+1;
                packet.payload.assign(map.data,map.data+map.size);
                packets.push_back(std::move(packet));
                gst_buffer_unmap(buffer,&map);
            }
            if(track.track_id.empty()) {
                auto* caps=gst_caps_to_string(gst_sample_get_caps(sample));
                track={"video-0",media::MediaKind::Video,media::CodecId::VP8,"vp8",caps,0,0};
                g_free(caps);
            }
            gst_sample_unref(sample);
        }
        gst_element_set_state(pipeline,GST_STATE_NULL);
        gst_object_unref(sink);
        gst_object_unref(pipeline);
        if(packets.size()!=8)throw std::runtime_error("encoder frame count");
        std::mutex mu;
        std::condition_variable cv;
        std::vector<analysis::RawVideoFrame> frames;
        auto decoder=analysis::CreateRawVideoDecoder({"source",track},[&](auto frame) {
            std::lock_guard lock(mu);
            frames.push_back(std::move(frame));
            cv.notify_all();
        });
        std::string message;
        if(!decoder->Start(&message))throw std::runtime_error("decoder setup");
        bool ok=true;
        for(std::size_t i=0;i<packets.size();++i){
            ok=decoder->PushPacket(packets[i],&message)&&ok;
            std::unique_lock lock(mu);
            if(!cv.wait_for(lock,std::chrono::seconds(2),[&]{return frames.size()>i;})) {
                ok=false;
                break;
            }
        }
        decoder->Stop();
        if(frames.size()!=8)return false;
        for(std::size_t i=0;i<frames.size();++i) {
            const auto& f=frames[i];
            const auto& a=f.source_association;
            ok=ok&&!f.data.empty()&&f.width==160&&f.height==90&&f.pts==5000000000LL+static_cast<std::int64_t>(i)*100000000&&
            a.quality==analysis::SourceAssociationQuality::TimestampMatch&&a.original&&a.original->source_generation=="generation-a"&&
            a.original->generation_order==7&&a.original->ordinal==i+1&&a.original->track_id=="video-0"&&a.original->pts_ns==static_cast<std::uint64_t>(5000000000LL+i*100000000);
        }
        return ok;
    }
}
int main() {
    try {
        using Q=analysis::SourceAssociationQuality;
        auto packet=Packet();
        analysis::TimestampAssociationHistory history;
        history.Append(10,123,packet);
        const auto result=history.Resolve(10);
        const bool ok=result.quality==analysis::SourceAssociationQuality::TimestampMatch&&result.original&&
        result.original->source_generation=="generation-a"&&result.original->generation_order==7&&
        result.original->ordinal==9&&result.original->track_id=="video-0"&&result.original->pts_ns==123;
        Check(ok,"S10-C101 유일 timestamp 연관");
        Check(history.Resolve(11).quality==Q::Nearest&&!history.Resolve(11).original,"S10-C102 최근접 추정 분리");
        auto other=packet;
        other.observation->ordinal=10;
        history.Append(10,123,other);
        Check(history.Resolve(10).quality==Q::Ambiguous&&!history.Resolve(10).original,"S10-C103 중복 timestamp 모호성");
        bool invalid=true;
        for(int mode=0;mode<4;++mode) {
            auto p=Packet();
            if(mode==0)p.observation.reset();
            if(mode==1)p.observation->source_generation.clear();
            if(mode==2)p.observation->generation_order=0;
            if(mode==3)p.observation->ordinal=0;
            analysis::TimestampAssociationHistory h;
            h.Append(10,123,p);
            invalid=invalid&&h.Resolve(10).quality==Q::Unavailable&&!h.Resolve(10).original;
        }
        Check(invalid,"S10-C104 원본 미관측");
        Check(history.Resolve(std::nullopt).quality==Q::Unavailable&&!history.Resolve(std::nullopt).original,"S10-C105 출력 PTS 부재");
        auto p=Packet();
        p.observation->pts_ns=0;
        analysis::TimestampAssociationHistory zero;
        zero.Append(0,0,p);
        bool pts_ok=zero.Resolve(0).original&&zero.Resolve(0).original->pts_ns==0;
        p.observation->pts_ns.reset();
        analysis::TimestampAssociationHistory missing;
        missing.Append(0,0,p);
        pts_ok=pts_ok&&!missing.Resolve(0).original;
        p.observation->pts_ns=std::numeric_limits<std::uint64_t>::max();
        analysis::TimestampAssociationHistory overflow;
        overflow.Append(0,0,p);
        Check(pts_ok&&!overflow.Resolve(0).original,"S10-C106 원본 PTS 부재·범위");
        analysis::TimestampAssociationHistory bounded;
        for(int i=0;i<4097;++i)bounded.Append(i,123,packet);
        Check(bounded.mappings().size()==4096&&bounded.Resolve(0).quality==Q::Unavailable&&!bounded.Resolve(0).original,"S10-C107 bounded 이력");
        analysis::TimestampAssociationHistory duplicate;
        duplicate.Append(10,123,packet);
        duplicate.Append(10,123,packet);
        const bool same=duplicate.Resolve(10).quality==Q::TimestampMatch;
        other=packet;
        other.observation->duration_ns=1;
        duplicate.Append(10,123,other);
        analysis::TimestampAssociationHistory partial;
        partial.Append(10,123,packet);
        other.observation.reset();
        partial.Append(10,123,other);
        analysis::TimestampAssociationHistory conflicting_source_pts;
        conflicting_source_pts.Append(10,123,packet);
        conflicting_source_pts.Append(10,124,packet);
        Check(same&&duplicate.Resolve(10).quality==Q::Ambiguous&&!duplicate.Resolve(10).original&&
              partial.Resolve(10).quality==Q::Ambiguous&&!partial.Resolve(10).original&&
              conflicting_source_pts.Resolve(10).quality==Q::Ambiguous&&!conflicting_source_pts.Resolve(10).original,
              "S10-C108 충돌·동일 입력 재전달");
        bool separated=true;
        for(int mode=0;mode<2;++mode) {
            analysis::TimestampAssociationHistory h;
            h.Append(10,123,packet);
            other=packet;
            if(mode==0)other.observation->source_generation="other";
            else other.track_id="video-1";
            h.Append(10,123,other);
            separated=separated&&h.Resolve(10).quality==Q::Ambiguous&&!h.Resolve(10).original;
        }
        Check(separated,"S10-C109 세대·track 분리");
        Check(ActualDecoder(),"S10-C110 자체 영상 실제 decoder");
    } catch(const std::exception& e) {
        std::cout<<"[setup-error] "<<e.what()<<'\n';
        return 2;
    }
    std::cout<<"[summary] pass="<<passes<<" fail="<<failures<<'\n';
    return failures?1:0;
}
