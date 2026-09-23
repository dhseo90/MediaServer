// 파일 용도: 실제 managed H264 writer와 decoder의 파생 선택/remux 경계를 검증한다.
#include "recording_media_test_fixture.h"
#include "analysis/raw_video_decoder.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_remux.h"
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <condition_variable>
#include <mutex>
#include <thread>
#include <set>

void Dump(const char* name,const recording::DerivedRemuxResult& result) {
    std::cout<<"[provenance] case="<<name<<" verified="<<result.verified_output<<" fully="<<result.request_fully_satisfied<<" unfulfilled="<<result.unfulfilled.size()<<'\n';
    for(const auto& output:result.outputs) {
        std::cout<<"[output] segment="<<output.segment_id<<" epoch="<<output.media_epoch_id<<" size="<<output.size_bytes<<" sha256="<<output.checksum_sha256
            <<" range="<<output.actual_original_start_ns<<':'<<output.actual_original_end_ns<<" request="<<output.requested_media_start_ns<<':'<<output.requested_media_end_ns
            <<" seek_stream_ns="<<output.seek_stream_time_ns<<" origin_ns="<<output.source_origin_ns<<" basis="<<output.actual_range_basis<<'\n';
        for(const auto& au:output.access_units)std::cout<<"[au] ordinal="<<au.ordinal<<" original="<<au.original_pts_ns<<" file="<<au.file_pts_ns<<" file_duration="<<au.file_duration_ns
            <<" output="<<au.output_pts_ns<<" output_duration="<<au.output_duration_ns<<" recovered90k="<<au.output_pts_90k.value_or(-1)<<" residual_numerator="<<au.output_pts_residual_numerator.value_or(-1)
            <<" source_vcl="<<au.source_vcl_sha256<<" output_vcl="<<au.output_vcl_sha256<<'\n';
    }
    for(const auto& gap:result.unfulfilled)std::cout<<"[unfulfilled] axis="<<gap.axis<<" range="<<gap.start<<':'<<gap.end<<" reason="<<gap.reason<<'\n';
}

bool Mp4Header(int fd) {
    unsigned char header[8]{};
    return ::pread(fd,header,sizeof(header),0)==static_cast<ssize_t>(sizeof(header))&&
        header[4]=='f'&&header[5]=='t'&&header[6]=='y'&&header[7]=='p';
}

recording::DerivedRemuxResult BFrameCase(const std::filesystem::path& root) {
    auto encoded=Encode(40,true,false,162,94);Shift(encoded,9000000000ULL);
    Store store(root);recording::GStreamerSegmentWriter::Options options(store.root,10000);
    options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter writer(options);std::string error;
    if(!writer.Start("probe-channel","unused",encoded.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
    for(const auto& packet:encoded.packets)writer.Push(packet,0);writer.Stop();
    const auto segments=store.Segments();if(segments.size()!=1)throw std::runtime_error("bframe-writer-count");
    const auto binding=store.catalog.FindSourceBinding(segments[0].segment_id);
    analysis::DecodedIntervalCollector collector;
    // 이 fixture는 encoded observation→선택 adapter다. 실제 decoder 경로는 D22에서 별도 검증한다.
    for(const auto& p:encoded.packets) {
        analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=p.pts;e.duration_ns=p.observation->duration_ns;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{
            p.observation->source_generation,p.observation->generation_order,p.observation->ordinal,p.track_id,*p.observation->pts_ns}};
        collector.Append(std::move(e));
    }
    recording::RecordingConsumerReferenceV1 ref;ref.reference_id="bframe-ref";ref.kind="event";ref.owner_id="bframe-event";
    ref.source_id="probe-channel";ref.channel_id="probe-channel";ref.analysis_namespace="bframe-r0";ref.analysis_track_id="track-1";
    ref.association_quality="timestamp-match";
    ref.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",*encoded.packets[0].observation->pts_ns};
    ref.request=recording::RecordingConsumerRequestV1{"media-pts-ms",10400,11200,0,0};
    recording::DerivedRemuxRequest request;request.max_output_bytes=8*1024*1024;
    if(!recording::SelectDerivedRecording(ref,*collector.Snapshot("bframe-r0"),{{segments[0],binding,false}},nullptr,&request.selection,&error))throw std::runtime_error(error);
    const int input=::open((store.root/"probe-channel"/(segments[0].segment_id+".mp4")).c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    const int output=::open((store.root/"bframe.mp4").c_str(),O_RDWR|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);
    if(input<0||output<0)throw std::runtime_error("bframe-fd");
    request.sources={{segments[0],*binding,input,output}};auto result=recording::DeriveRecordingH264Remux(request);
    Dump("bframe",result);::close(input);::close(output);return result;
}

std::vector<std::pair<std::string,bool>> MultiCase(const std::filesystem::path& root,bool split_epoch=false) {
    auto encoded=Encode(40,false,false);Store store(root);
    recording::GStreamerSegmentWriter::Options options(store.root,1000);
    options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter writer(options);std::string error;
    if(!writer.Start("probe-channel","unused",encoded.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
    for(std::size_t i=0;i<encoded.packets.size();++i) {
        if(split_epoch&&i==20){writer.Stop();
            if(!writer.Start("probe-channel","unused-restart",encoded.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);}
        writer.Push(encoded.packets[i],0);
    }
    writer.Stop();
    auto segments=store.Segments();if(segments.size()<3)throw std::runtime_error("multi-source-count");
    analysis::DecodedIntervalCollector collector;
    for(const auto& p:encoded.packets){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=p.pts;e.duration_ns=p.observation->duration_ns;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"probe-generation-a",1,p.observation->ordinal,p.track_id,*p.observation->pts_ns}};collector.Append(std::move(e));}
    recording::RecordingConsumerReferenceV1 ref;ref.reference_id="multi-ref";ref.kind="event";ref.owner_id="multi-event";
    ref.source_id="probe-channel";ref.channel_id="probe-channel";ref.analysis_namespace="multi-r0";ref.analysis_track_id="track-1";ref.association_quality="timestamp-match";
    ref.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",0};
    ref.request=recording::RecordingConsumerRequestV1{"media-pts-ms",0,3000,0,0};
    std::vector<recording::DerivedSourceEvidence> evidence;
    for(const auto& s:segments)evidence.push_back({s,store.catalog.FindSourceBinding(s.segment_id),false});
    recording::DerivedRemuxRequest request;request.max_output_bytes=8*1024*1024;
    if(!recording::SelectDerivedRecording(ref,*collector.Snapshot("multi-r0"),evidence,nullptr,&request.selection,&error))throw std::runtime_error(error);
    for(const auto& e:evidence){bool selected=false;for(const auto& slice:request.selection.slices)for(const auto& c:slice.candidates)selected|=c.segment.segment_id==e.segment.segment_id;
        if(!selected)continue;
        const int in=::open((store.root/"probe-channel"/(e.segment.segment_id+".mp4")).c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
        const int out=::open((store.root/(e.segment.segment_id+".ts")).c_str(),O_RDWR|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);
        if(in<0||out<0)throw std::runtime_error("multi-fd-open");request.sources.push_back({e.segment,*e.binding,in,out});}
    const auto normal=recording::DeriveRecordingH264Remux(request);
    Dump(split_epoch?"multi-epoch":"multi",normal);
    std::cout<<"[detail] multi_error="<<normal.error<<" inputs="<<request.sources.size()<<" outputs="<<normal.outputs.size()<<'\n';
    std::vector<std::pair<std::string,bool>> checks;
    if(split_epoch){std::set<std::string> epochs;for(const auto& output:normal.outputs)epochs.insert(output.media_epoch_id);
        checks.push_back({"R05 실제 epoch 변경 원본→독립 출력 목록",normal.verified_output&&normal.request_fully_satisfied&&normal.outputs.size()==request.sources.size()&&epochs.size()==2});
        for(const auto& s:request.sources){::close(s.source_fd);::close(s.output_fd);}return checks;}
    checks.push_back({"R05 인접 same-epoch 실제 source별 독립 출력",normal.verified_output&&normal.request_fully_satisfied&&normal.outputs.size()>=2});
    auto reset=[&]{for(const auto& s:request.sources)if(::ftruncate(s.output_fd,0))throw std::runtime_error("multi-reset");};
    reset();auto alias=request;alias.sources[1].output_fd=alias.sources[0].output_fd;
    auto aliased=recording::DeriveRecordingH264Remux(alias);checks.push_back({"R06 output끼리 전체 inode 교차 거부",!aliased.verified_output&&aliased.error=="fd-inode-alias"});
    alias=request;alias.sources[1].output_fd=alias.sources[0].source_fd;
    aliased=recording::DeriveRecordingH264Remux(alias);checks.push_back({"R06 다른 source의 원본FD를 출력으로 거부",!aliased.verified_output&&!aliased.error.empty()});
    alias=request;alias.sources[1].source_fd=alias.sources[0].source_fd;
    aliased=recording::DeriveRecordingH264Remux(alias);checks.push_back({"R06 다른 segment의 중복 원본FD 거부",!aliased.verified_output&&aliased.error=="fd-inode-alias"});
    reset();auto limited=request;limited.max_output_bytes=normal.outputs.empty()?2000:normal.outputs[0].size_bytes+1316;
    auto partial=recording::DeriveRecordingH264Remux(limited);std::uint64_t total=0;
    for(const auto& s:request.sources){struct stat st{};if(::fstat(s.output_fd,&st))throw std::runtime_error("multi-stat");total+=st.st_size;}
    checks.push_back({"R08 모든 출력 합계 byte 상한·부분 실패 목록",!partial.verified_output&&!partial.request_fully_satisfied&&total<=limited.max_output_bytes&&partial.outputs.size()>=2&&partial.outputs.front().verified_output&&!partial.outputs.back().verified_output});
    for(const auto& s:request.sources){::close(s.source_fd);::close(s.output_fd);}return checks;
}

int main(int argc,char** argv) {
    if(argc!=2)return 2;
    gst_init(nullptr,nullptr);
    try {
        auto input=Encode(60,false,true);Shift(input,7000000000ULL);
        Store store(std::filesystem::path(argv[1])/"fractional-selection");
        recording::GStreamerSegmentWriter::Options options(store.root,10000);
        options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);std::string error;
        if(!writer.Start("probe-channel","unused-legacy-epoch",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        for(const auto& p:input.packets)writer.Push(p,0);
        writer.Stop();const auto segments=store.Segments();
        if(segments.size()!=1)throw std::runtime_error("fractional-writer-segment-count");
        std::mutex mu;std::condition_variable cv;analysis::DecodedIntervalCollector collector;std::size_t decoded=0;
        auto decoder=analysis::CreateRawVideoDecoder({"probe-channel",input.descriptor.tracks[0]},[&](analysis::RawVideoFrame frame){
            analysis::DecodedIntervalEvidence evidence;evidence.analysis_pts_ns=frame.pts;evidence.association=frame.source_association;
            evidence.duration_ns=frame.source_duration_ns;
            {std::lock_guard lock(mu);collector.Append(std::move(evidence));++decoded;}cv.notify_all();
        });
        if(!decoder||!decoder->Start(&error))throw std::runtime_error("fractional-decoder-start");
        for(const auto& p:input.packets) {
            if(!decoder->PushPacket(p,&error))throw std::runtime_error("fractional-decoder-push");
            std::this_thread::sleep_for(std::chrono::nanoseconds(*p.observation->duration_ns));
        }
        {std::unique_lock lock(mu);cv.wait_for(lock,std::chrono::seconds(5),[&]{return decoded>=30;});}
        decoder->Stop();
        if(decoded<30) {
            std::cerr<<"[detail] fractional-decoder-count requested-prefix=30 observed="<<decoded<<'\n';
            throw std::runtime_error("fractional-decoder-count");
        }
        const auto snapshot=collector.Snapshot("fractional-r0");
        recording::RecordingConsumerReferenceV1 r;r.reference_id="fractional-reference";r.kind="event";r.owner_id="fractional-event";
        r.source_id="probe-channel";r.channel_id="probe-channel";r.analysis_namespace="fractional-r0";r.analysis_track_id="track-1";
        r.association_quality="timestamp-match";r.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",7000000000ULL};
        r.request=recording::RecordingConsumerRequestV1{"media-pts-ms",7000,8001,0,0};
        recording::DerivedSourceEvidence source{segments[0],store.catalog.FindSourceBinding(segments[0].segment_id),false};
        recording::DerivedRecordingSelection selection;
        if(!recording::SelectDerivedRecording(r,*snapshot,{source},nullptr,&selection,&error))throw std::runtime_error(error);
        std::size_t ambiguous=0;for(const auto& s:selection.slices)if(s.state==recording::DerivedSliceState::Ambiguous)++ambiguous;
        const bool selected=selection.complete&&ambiguous==0;
        std::cout<<"[detail] decoded="<<decoded<<" slices="<<selection.slices.size()<<" ambiguous="<<ambiguous<<" complete="<<selection.complete<<'\n';
        std::cout<<(selected?"[pass] ":"[fail] ")<<"D22 실제 분수frame 요청 선택\n";
        const auto source_path=store.root/"probe-channel"/(segments[0].segment_id+".mp4");
        const int source_fd=::open(source_path.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
        const int output_fd=::open((store.root/"output.mp4").c_str(),O_RDWR|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);
        if(source_fd<0||output_fd<0)throw std::runtime_error("fixture-fd-open");
        recording::DerivedRemuxRequest request;request.selection=selection;
        request.sources={{segments[0],*source.binding,source_fd,output_fd}};request.max_output_bytes=8*1024*1024;
        const auto remux=recording::DeriveRecordingH264Remux(request);
        Dump("fractional",remux);
        const bool generated=remux.verified_output&&remux.outputs.size()==1&&!remux.outputs[0].access_units.empty()&&
            !remux.outputs[0].source_decoded_sha256.empty()&&remux.outputs[0].source_decoded_sha256==remux.outputs[0].output_decoded_sha256;
        std::cout<<"[detail] remux_error="<<remux.error<<" outputs="<<remux.outputs.size()<<'\n';
        std::cout<<(generated?"[pass] ":"[fail] ")<<"R01 실제 source-AU→출력-AU payload·decode 일치\n";
        const bool browser_container=generated&&Mp4Header(output_fd);
        std::cout<<(browser_container?"[pass] ":"[fail] ")<<"S11-I30-R01 출력 MP4 ftyp 서명\n";
        if(::ftruncate(output_fd,0)!=0)throw std::runtime_error("fixture-output-reset");
        auto legacy_request=request;legacy_request.output_container="mpegts";
        const auto legacy=recording::DeriveRecordingH264Remux(legacy_request);
        unsigned char sync=0;
        const bool legacy_ts=legacy.verified_output&&legacy.outputs.size()==1&&
            legacy.outputs[0].source_decoded_sha256==legacy.outputs[0].output_decoded_sha256&&
            ::pread(output_fd,&sync,1,0)==1&&sync==0x47;
        std::cout<<(legacy_ts?"[pass] ":"[fail] ")<<"S11-I30-R02 영속 TS profile remux 유지\n";
        if(::ftruncate(output_fd,0)!=0)throw std::runtime_error("fixture-output-reset");
        auto incomplete=request;auto missing=incomplete.selection.slices.back();
        missing.candidates[0].segment.segment_id="missing-source";incomplete.selection.slices.push_back(missing);
        const auto missing_result=recording::DeriveRecordingH264Remux(incomplete);
        struct stat output_stat{};const bool missing_rejected=!missing_result.verified_output&&!missing_result.error.empty()&&
            ::fstat(output_fd,&output_stat)==0&&output_stat.st_size==0;
        std::cout<<(missing_rejected?"[pass] ":"[fail] ")<<"R11 confirmed source 누락은 생성전 거부\n";
        int passed=(selected?1:0)+(generated?1:0)+(browser_container?1:0)+(legacy_ts?1:0)+(missing_rejected?1:0),failed=5-passed;
        auto check=[&](const char* title,bool ok){std::cout<<(ok?"[pass] ":"[fail] ")<<title<<'\n';ok?++passed:++failed;};
        auto reset=[&]{if(::ftruncate(output_fd,0))throw std::runtime_error("fixture-reset");};
        auto reject=[&](recording::DerivedRemuxRequest bad){reset();auto result=recording::DeriveRecordingH264Remux(bad);struct stat st{};
            return !result.verified_output&&!result.error.empty()&&::fstat(output_fd,&st)==0&&st.st_size==0;};
        check("R03 분수 duration 미충족과 검증성공 분리",generated&&!remux.request_fully_satisfied&&!remux.unfulfilled.empty());
        auto bad=request;bad.max_output_bytes=0;check("R08 양수 byte 상한 필수",reject(bad));
        bad=request;bad.max_output_bytes=2000;reset();auto bounded=recording::DeriveRecordingH264Remux(bad);
        check("R08 byte 상한 초과 전 중단·partial cleanup",!bounded.verified_output&&!bounded.outputs.empty()&&bounded.outputs[0].size_bytes<=2000&&bounded.outputs[0].caller_cleanup_required);
        bad=request;bad.sources[0].segment.video_codecs={"vp8"};check("R09 미지원 codec 명시 거부",reject(bad));
        bad=request;bad.selection.slices[0].state=recording::DerivedSliceState::Ambiguous;check("R09 ambiguous 자동 선택 금지",reject(bad));
        bad=request;bad.sources.push_back(bad.sources[0]);check("R11 중복 segment 입력 거부",reject(bad));
        bad=request;bad.selection.reference.source_id="other-source";check("R11 reference source 결박 불일치 거부",reject(bad));
        bad=request;bad.selection.reference.channel_id="other-channel";check("R11 reference channel 결박 불일치 거부",reject(bad));
        bad=request;bad.sources[0].output_fd=source_fd;check("R06 원본·출력 별칭 거부",reject(bad));
        const int flags=::fcntl(output_fd,F_GETFL);::fcntl(output_fd,F_SETFL,flags|O_APPEND);
        check("R06 O_APPEND 출력 거부",reject(request));::fcntl(output_fd,F_SETFL,flags);
        bad=request;bad.sources[0].segment.checksum_sha256=std::string(64,'0');
        for(auto& s:bad.selection.slices)for(auto& c:s.candidates)c.segment=bad.sources[0].segment;
        check("R07 원본 hash 불일치 거부",reject(bad));
        bad=request;bad.cancelled=[] {return true;};check("R13 시작 전 취소·쓰기 없음",reject(bad));
        bad=request;bad.max_work_ms=0;check("R13 유효 전체시간 상한 필수",reject(bad));
        bad=request;bad.selection.complete=false;auto unknown=bad.selection.slices.back();unknown.state=recording::DerivedSliceState::Unknown;
        unknown.reason="fixture-outside-confirmed";unknown.candidates.clear();bad.selection.slices.push_back(unknown);
        reset();::lseek(source_fd,17,SEEK_SET);::lseek(output_fd,19,SEEK_SET);
        auto partial=recording::DeriveRecordingH264Remux(bad);
        check("R10 unknown 요청 보존·partial 출력",partial.verified_output&&!partial.request_fully_satisfied&&!partial.unfulfilled.empty());
        check("R06 borrowed FD offset 보존",::lseek(source_fd,0,SEEK_CUR)==17&&::lseek(output_fd,0,SEEK_CUR)==19);
        bad=request;reset();bad.cancelled=[output_fd]{struct stat st{};return ::fstat(output_fd,&st)==0&&st.st_size>0;};
        auto cancelled=recording::DeriveRecordingH264Remux(bad);
        check("R13 출력 후 취소·partial 소유권 보존",!cancelled.verified_output&&!cancelled.outputs.empty()&&cancelled.outputs[0].caller_cleanup_required&&cancelled.outputs[0].size_bytes>0);
        bad=request;bad.max_work_ms=1;reset();auto deadline=recording::DeriveRecordingH264Remux(bad);
        check("R13 1ms 전체 deadline 초과는 검증성공 아님",!deadline.verified_output&&!deadline.error.empty());
        const int mutate=::open(source_path.c_str(),O_RDWR|O_CLOEXEC|O_NOFOLLOW);unsigned char original=0;
        if(mutate<0||::pread(mutate,&original,1,0)!=1)throw std::runtime_error("fixture-mutate-open");
        std::atomic<bool> changed{false};reset();bad=request;
        bad.cancelled=[&]{struct stat st{};if(::fstat(output_fd,&st)==0&&st.st_size>0&&!changed.exchange(true)){
                const unsigned char byte=original^1;if(::pwrite(mutate,&byte,1,0)!=1)return true;}return false;};
        const auto mutated=recording::DeriveRecordingH264Remux(bad);
        check("R07 출력 중 원본 변경 재확인 거부",changed&&!mutated.verified_output&&mutated.error=="source-file-changed");
        if(::pwrite(mutate,&original,1,0)!=1)throw std::runtime_error("fixture-mutate-restore");::close(mutate);
        ::close(source_fd);::close(output_fd);
        const auto bframe=BFrameCase(std::filesystem::path(argv[1])/"bframe-visible");
        std::cout<<"[detail] bframe_error="<<bframe.error<<" outputs="<<bframe.outputs.size()<<'\n';
        check("R02 B-frame 실제 seek·nonzero 원본축",bframe.verified_output&&bframe.request_fully_satisfied&&bframe.outputs[0].seek_stream_time_ns>0);
        check("R04 요청 외 keyframe preroll·GOP 의존 범위 분리",bframe.verified_output&&bframe.outputs[0].actual_original_start_ns<bframe.outputs[0].requested_media_start_ns);
        check("R12 162×94 visible plane 픽셀 대응",bframe.verified_output&&bframe.outputs[0].source_decoded_sha256==bframe.outputs[0].output_decoded_sha256);
        for(const auto& item:MultiCase(std::filesystem::path(argv[1])/"multi-source"))check(item.first.c_str(),item.second);
        for(const auto& item:MultiCase(std::filesystem::path(argv[1])/"multi-epoch",true))check(item.first.c_str(),item.second);
        std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
    } catch(const std::exception& e) {std::cerr<<"[setup-fail] "<<e.what()<<'\n';return 2;}
}
