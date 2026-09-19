// 기본 writer MP4의 제한된 native 표와 실제 AU를 연결한다. decode/완전성 판정은 별도다.
#include "recording/recording_file_evidence.h"
#include <algorithm>
#include <atomic>
#include <limits>
#include <mutex>
#include <cstring>
#include <string_view>
#include <stdexcept>
#include <unordered_map>
#include <unordered_set>
#ifndef MEDIA_SERVER_USE_GSTREAMER
#define MEDIA_SERVER_USE_GSTREAMER 0
#endif
#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/gst.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
namespace recording {
namespace {
constexpr std::size_t kSamples=4096,kBytes=32U*1024*1024;
void Need(bool value,const char* reason){if(!value)throw std::runtime_error(reason);}
std::string Hash(const unsigned char* data,std::size_t size){gchar* p=g_compute_checksum_for_data(G_CHECKSUM_SHA256,data,size);Need(p,"hash");std::string s(p);g_free(p);return s;}
std::int64_t Time(GstClockTime t){Need(GST_CLOCK_TIME_IS_VALID(t)&&t<=static_cast<std::uint64_t>(INT64_MAX),"timestamp-unavailable");return static_cast<std::int64_t>(t);}
// 진단은 수락 조건을 바꾸지 않는다. 단계/코드를 한 원자값으로 최초 한 번만 보존한다.
enum class CapturePhase : std::uint16_t {AttachCore,AttachParserPad,AttachMuxPad,AttachMuxElement,AttachPlugin,AttachProbe,
    ObserveLock,ObserveSegment,ObserveCount,ObserveBufferSize,ObservePts,ObserveDts,ObserveDuration,ObserveCaps,ObserveAvc,ObserveBufferRead,ObserveVcl,ObserveHash,ObserveAppend,
    AcceptLock,AcceptCount,AcceptOriginalFields,AcceptBufferSize,AcceptPts,AcceptDts,AcceptDuration,AcceptVcl,AcceptAppend,AttachInputCaps};
struct CapturePhaseSpec {const char* name;const char* reasons;};
constexpr CapturePhaseSpec kCapturePhases[]={
    {"attach-core","gstreamer-profile"},{"attach-parser-pad","parser-pad"},{"attach-mux-pad","mux-pad"},{"attach-mux-element","mux-element"},{"attach-plugin","plugin-profile"},{"attach-probe","probe-install"},
    {"observe-lock",""},{"observe-segment","segment-profile"},{"observe-count","sample-cap"},{"observe-buffer-size","buffer-cap"},
    {"observe-pts","timestamp-unavailable"},{"observe-dts","timestamp-unavailable"},{"observe-duration","timestamp-unavailable"},
    {"observe-caps","caps-unavailable"},{"observe-avc","avc-profile"},{"observe-buffer-read","buffer-read"},
    {"observe-vcl","empty-nal nal-size nal-width nal-header nal-bound vcl-missing hash"},{"observe-hash","hash"},{"observe-append",""},
    {"accept-lock",""},{"accept-count","sample-cap"},{"accept-original-fields","original-timestamp"},{"accept-buffer-size","buffer-cap"},
    {"accept-pts","timestamp-unavailable"},{"accept-dts","timestamp-unavailable"},{"accept-duration","timestamp-unavailable"},
    {"accept-vcl","empty-nal nal-size nal-width nal-header nal-bound vcl-missing hash"},{"accept-append",""},
    {"attach-input-caps","input-caps input-format input-alignment input-codec-data input-avcc-header input-nal-width input-codec-conflict"}};
constexpr const char* kCaptureCodes[]={"unknown","gstreamer-profile","parser-pad","mux-pad","mux-element","plugin-profile","probe-install","segment-profile","sample-cap","buffer-cap","timestamp-unavailable","caps-unavailable","avc-profile","buffer-read","empty-nal","nal-size","nal-width","nal-header","nal-bound","vcl-missing","hash","original-timestamp","input-caps","input-format","input-alignment","input-codec-data","input-avcc-header","input-nal-width","input-codec-conflict"};
bool ExactToken(std::string_view list,std::string_view value) noexcept {
    while(!list.empty()){const auto end=list.find(' ');if(list.substr(0,end)==value)return true;if(end==std::string_view::npos)break;list.remove_prefix(end+1);}return false;
}
struct CaptureFailure {
    std::atomic<std::uint32_t> packed{0};
    void Record(CapturePhase phase,const char* what=nullptr) noexcept {
        const auto p=static_cast<std::uint16_t>(phase);std::uint16_t code=0;
        if(p>=std::size(kCapturePhases))return;
        if(what)for(std::uint16_t i=1;i<std::size(kCaptureCodes);++i)if(std::strcmp(what,kCaptureCodes[i])==0&&ExactToken(kCapturePhases[p].reasons,kCaptureCodes[i])){code=i;break;}
        std::uint32_t expected=0;packed.compare_exchange_strong(expected,((static_cast<std::uint32_t>(p)+1)<<16)|code);
    }
    bool Failed() const noexcept {return packed.load()!=0;}
    std::string Reason() const {
        const auto value=packed.load();if(!value)return {};const auto phase=(value>>16)-1,code=value&65535;
        if(phase>=std::size(kCapturePhases)||code>=std::size(kCaptureCodes))return "capture-unknown";
        return std::string("capture-")+kCapturePhases[phase].name+"-"+kCaptureCodes[code];
    }
};
void ReadMuxTimes(GstBuffer* buffer,RecordingFileSampleEvidenceV1& sample,CapturePhase& phase){
    phase=CapturePhase::ObservePts;sample.mux_pts_ns=Time(GST_BUFFER_PTS(buffer));
    phase=CapturePhase::ObserveDts;sample.mux_dts_ns=Time(GST_BUFFER_DTS(buffer));
    phase=CapturePhase::ObserveDuration;sample.mux_duration_ns=Time(GST_BUFFER_DURATION(buffer));
}
unsigned InputNalWidth(const GstCaps* caps){
    Need(caps&&gst_caps_is_fixed(caps)&&gst_caps_get_size(caps)==1,"input-caps");
    const auto* structure=gst_caps_get_structure(caps,0);Need(gst_structure_has_name(structure,"video/x-h264"),"input-caps");
    const auto* alignment=gst_structure_get_string(structure,"alignment");Need(alignment&&std::strcmp(alignment,"au")==0,"input-alignment");
    const auto* format=gst_structure_get_string(structure,"stream-format");Need(format,"input-format");
    const auto* value=gst_structure_get_value(structure,"codec_data");
    if(std::strcmp(format,"byte-stream")==0){Need(!value,"input-codec-conflict");return 0;}
    Need(std::strcmp(format,"avc")==0||std::strcmp(format,"avc3")==0,"input-format");
    Need(value&&GST_VALUE_HOLDS_BUFFER(value),"input-codec-data");auto* buffer=gst_value_get_buffer(value);
    Need(buffer&&gst_buffer_get_size(buffer)>=7&&gst_buffer_get_size(buffer)<=kBytes,"input-avcc-header");
    // NAL framing에 필요한 최소 헤더만 읽는다. SPS/PPS/확장 전체를 검증하는 parser가 아니다.
    unsigned char header[5]{};Need(gst_buffer_extract(buffer,0,header,sizeof(header))==sizeof(header)&&header[0]==1&&(header[4]&0xfc)==0xfc,"input-avcc-header");
    const unsigned width=(header[4]&3)+1;Need(width==1||width==2||width==4,"input-nal-width");return width;
}
const char* FixedFinishReason(const char* what) noexcept {
    static constexpr const char* allowed[]={"hash","empty-nal","nal-size","nal-width","nal-header","nal-bound","vcl-missing",
        "mp4-field-bound","mp4-depth","mp4-box-count","mp4-header","mp4-zero-size-profile","mp4-box-bound","mp4-profile","mp4-duplicate-box","mp4-missing-box","mp4-time-version","mp4-timescale","mp4-table-bound","mp4-video-only","mp4-data-reference-count","mp4-self-contained-reference","mp4-edit-profile","mp4-edit-rate","mp4-description-count","mp4-avc-entry","mp4-avcc-version","mp4-stsz-version","mp4-sample-count","mp4-sample-size","mp4-stts-version","mp4-stts-count","mp4-stts-total","mp4-ctts-version","mp4-ctts-count","mp4-ctts-total","mp4-chunk-table","mp4-chunk-version","mp4-stsc-version","mp4-empty-chunks","mp4-stsc-run","mp4-mdat-offset","mp4-mdat-containment","mp4-native-overflow","mp4-sample-total",
        "file-size-cap","file-binding","file-read","file-hash-binding","segment-unobserved","capture-count","file-open","ambiguous-original-vcl","native-count","ambiguous-mux-raw","mux-file-payload","original-file-vcl",
        "file evidence profile/bound 오류","file evidence identity/timestamp/duplicate 오류","file evidence forward table 오류","file evidence origin/edit 오류"};
    if(what)for(const auto* code:allowed)if(std::strcmp(what,code)==0)return code;
    return "finish-exception";
}
void SetFinishReason(std::string* reason,const char* fixed) noexcept {if(reason)try{*reason=fixed;}catch(...){reason->clear();}}
std::string Vcl(const std::vector<unsigned char>& b,unsigned width) {
    std::vector<unsigned char> canonical;
    auto append=[&](std::size_t first,std::size_t last){Need(first<last,"empty-nal");const unsigned type=b[first]&31;if(type!=1&&type!=5)return;
        Need(last-first<=UINT32_MAX,"nal-size");const auto n=last-first;for(int shift=24;shift>=0;shift-=8)canonical.push_back((n>>shift)&255);
        canonical.insert(canonical.end(),b.begin()+first,b.begin()+last);};
    if(width) {
        Need(width<=4,"nal-width");for(std::size_t p=0;p<b.size();) {Need(width<=b.size()-p,"nal-header");std::size_t n=0;
            for(unsigned j=0;j<width;++j)n=(n<<8)|b[p++];Need(n&&n<=b.size()-p,"nal-bound");append(p,p+n);p+=n;}
    } else {
        std::vector<std::pair<std::size_t,std::size_t>> starts;
        for(std::size_t i=0;i+3<=b.size();) {std::size_t w=0;
            if(i+4<=b.size()&&!b[i]&&!b[i+1]&&!b[i+2]&&b[i+3]==1)w=4;
            else if(!b[i]&&!b[i+1]&&b[i+2]==1)w=3;
            if(w){starts.push_back({i,i+w});i+=w;}else ++i;}
        for(std::size_t i=0;i<starts.size();++i){auto end=i+1<starts.size()?starts[i+1].first:b.size();const auto begin=starts[i].second;
            while(end>begin&&!b[end-1])--end;append(begin,end);}
    }
    Need(!canonical.empty(),"vcl-missing");return Hash(canonical.data(),canonical.size());
}
struct Box {std::size_t data,end;std::string type;std::vector<Box> children;};
struct NativeSample {std::int64_t pts,dts,duration;std::string raw,vcl;};
struct Native {std::uint32_t timescale,movie_timescale;std::int64_t edit_duration,edit_time;std::vector<NativeSample> samples;};
class Mp4 {
    const std::vector<unsigned char>& b_;std::size_t box_count_=0;
    std::uint64_t U(std::size_t p,unsigned n,std::size_t end) const {Need(n<=8&&p<=end&&n<=end-p&&end<=b_.size(),"mp4-field-bound");std::uint64_t v=0;for(unsigned i=0;i<n;++i)v=(v<<8)|b_[p+i];return v;}
    std::vector<Box> Boxes(std::size_t p,std::size_t end,unsigned depth) {
        Need(depth<=8,"mp4-depth");std::vector<Box> out;
        while(p<end){Need(++box_count_<=512,"mp4-box-count");auto size=U(p,4,end);Need(end-p>=8,"mp4-header");const std::string type(reinterpret_cast<const char*>(b_.data()+p+4),4);
            std::size_t head=8;if(size==1){size=U(p+8,8,end);head=16;}Need(size!=0,"mp4-zero-size-profile");
            Need(size>=head&&size<=end-p,"mp4-box-bound");Need(type!="moof"&&type!="mvex"&&type!="stz2","mp4-profile");Box box{p+head,p+static_cast<std::size_t>(size),type,{}};
            if(type=="moov"||type=="trak"||type=="mdia"||type=="minf"||type=="stbl"||type=="edts"||type=="dinf")box.children=Boxes(box.data,box.end,depth+1);
            out.push_back(std::move(box));p+=size;}
        return out;
    }
    const Box& One(const std::vector<Box>& boxes,const std::string& type) const {const Box* result=nullptr;for(const auto& box:boxes)if(box.type==type){Need(!result,"mp4-duplicate-box");result=&box;}Need(result,"mp4-missing-box");return *result;}
    const Box* Optional(const std::vector<Box>& boxes,const std::string& type) const {const Box* result=nullptr;for(const auto& box:boxes)if(box.type==type){Need(!result,"mp4-duplicate-box");result=&box;}return result;}
    std::uint32_t Scale(const Box& box) const {const auto version=U(box.data,1,box.end);Need(version<=1,"mp4-time-version");const auto t=U(box.data+(version?20:12),4,box.end);Need(t,"mp4-timescale");return t;}
    std::uint32_t Count(const Box& box,unsigned stride) const {const auto n=U(box.data+4,4,box.end);Need(n<=kSamples&&box.data+8<=box.end&&n*stride==box.end-box.data-8,"mp4-table-bound");return n;}
public:
    explicit Mp4(const std::vector<unsigned char>& b):b_(b){}
    Native Read() {
        const auto roots=Boxes(0,b_.size(),0);const auto& moov=One(roots,"moov");const auto& mdat=One(roots,"mdat");const auto& trak=One(moov.children,"trak");
        const auto& mdia=One(trak.children,"mdia");const auto& hdlr=One(mdia.children,"hdlr");Need(U(hdlr.data+8,4,hdlr.end)==0x76696465,"mp4-video-only");
        const auto& minf=One(mdia.children,"minf");const auto& stbl=One(minf.children,"stbl");
        const auto& dref=One(One(minf.children,"dinf").children,"dref");
        Need(U(dref.data,4,dref.end)==0&&U(dref.data+4,4,dref.end)==1,"mp4-data-reference-count");
        const auto references=Boxes(dref.data+8,dref.end,0);const auto& local=One(references,"url ");
        Need(references.size()==1&&local.end-local.data==4&&U(local.data,4,local.end)==1,"mp4-self-contained-reference");
        Native n{};n.timescale=Scale(One(mdia.children,"mdhd"));n.movie_timescale=Scale(One(moov.children,"mvhd"));
        const auto& edit=One(One(trak.children,"edts").children,"elst");const auto ev=U(edit.data,1,edit.end);Need(ev<=1&&Count(edit,ev?20:12)==1,"mp4-edit-profile");
        const auto ed=U(edit.data+8,ev?8:4,edit.end),et=U(edit.data+8+(ev?8:4),ev?8:4,edit.end);
        Need(ed<=INT64_MAX&&et<=INT64_MAX&&U(edit.end-4,4,edit.end)==65536,"mp4-edit-rate");n.edit_duration=ed;n.edit_time=et;
        const auto& stsd=One(stbl.children,"stsd");Need(U(stsd.data,4,stsd.end)==0&&U(stsd.data+4,4,stsd.end)==1,"mp4-description-count");
        const auto entries=Boxes(stsd.data+8,stsd.end,0);const auto& avc=One(entries,"avc1");Need(entries.size()==1&&avc.data+78<=avc.end&&U(avc.data+6,2,avc.end)==1,"mp4-avc-entry");
        const auto config=Boxes(avc.data+78,avc.end,0);const auto& avcc=One(config,"avcC");Need(U(avcc.data,1,avcc.end)==1,"mp4-avcc-version");const unsigned width=(U(avcc.data+4,1,avcc.end)&3)+1;
        const auto& stsz=One(stbl.children,"stsz");Need(U(stsz.data,4,stsz.end)==0,"mp4-stsz-version");const auto fixed=U(stsz.data+4,4,stsz.end),count=U(stsz.data+8,4,stsz.end);
        Need(count&&count<=kSamples&&stsz.data+12+(fixed?0:count*4)==stsz.end,"mp4-sample-count");std::vector<std::size_t> sizes;
        for(std::size_t i=0;i<count;++i){const auto size=fixed?fixed:U(stsz.data+12+i*4,4,stsz.end);Need(size&&size<=kBytes,"mp4-sample-size");sizes.push_back(size);}
        std::vector<std::int64_t> duration,offset(count,0);
        const auto& stts=One(stbl.children,"stts");Need(U(stts.data,4,stts.end)==0,"mp4-stts-version");const auto ts_count=Count(stts,8);
        for(std::size_t i=0;i<ts_count;++i){const auto p=stts.data+8+i*8;const auto repeats=U(p,4,stts.end),delta=U(p+4,4,stts.end);Need(repeats&&repeats<=count-duration.size()&&delta,"mp4-stts-count");duration.insert(duration.end(),repeats,delta);}Need(duration.size()==count,"mp4-stts-total");
        if(const auto* ctts=Optional(stbl.children,"ctts")){const auto version=U(ctts->data,4,ctts->end);Need(version==0||version==0x01000000,"mp4-ctts-version");std::size_t index=0;const auto entries_count=Count(*ctts,8);
            for(std::size_t i=0;i<entries_count;++i){const auto p=ctts->data+8+i*8;const auto repeats=U(p,4,ctts->end),raw=U(p+4,4,ctts->end);Need(repeats&&repeats<=count-index,"mp4-ctts-count");
                const std::int64_t delta=version?static_cast<std::int32_t>(raw):static_cast<std::int64_t>(raw);for(std::size_t j=0;j<repeats;++j)offset[index++]=delta;}Need(index==count,"mp4-ctts-total");}
        const auto* chunk=Optional(stbl.children,"stco");const auto* large=Optional(stbl.children,"co64");Need((chunk!=nullptr)!=(large!=nullptr),"mp4-chunk-table");const auto& chunks=chunk?*chunk:*large;Need(U(chunks.data,4,chunks.end)==0,"mp4-chunk-version");const auto chunk_count=Count(chunks,chunk?4:8);
        const auto& stsc=One(stbl.children,"stsc");Need(U(stsc.data,4,stsc.end)==0,"mp4-stsc-version");const auto sc_count=Count(stsc,12);Need(sc_count&&chunk_count,"mp4-empty-chunks");
        struct Run{std::size_t first,samples;};std::vector<Run> runs;
        for(std::size_t i=0;i<sc_count;++i){const auto p=stsc.data+8+i*12;const auto first=U(p,4,stsc.end),num=U(p+4,4,stsc.end),description=U(p+8,4,stsc.end);Need(first&&first<=chunk_count&&num&&num<=count&&description==1&&(i?first>runs.back().first:first==1),"mp4-stsc-run");runs.push_back({static_cast<std::size_t>(first),static_cast<std::size_t>(num)});}
        std::size_t sample=0,run=0,prior_end=mdat.data;std::int64_t dts=0;
        for(std::size_t i=0;i<chunk_count;++i){while(run+1<runs.size()&&runs[run+1].first<=i+1)++run;auto position=U(chunks.data+8+i*(chunk?4:8),chunk?4:8,chunks.end);
            Need(position>=prior_end&&position>=mdat.data&&position<=mdat.end,"mp4-mdat-offset");
            for(std::size_t j=0;j<runs[run].samples;++j){Need(sample<count&&sizes[sample]<=mdat.end-position,"mp4-mdat-containment");const auto size=sizes[sample];
                std::vector<unsigned char> bytes(b_.begin()+position,b_.begin()+position+size);const __int128 pts=static_cast<__int128>(dts)+offset[sample],end=static_cast<__int128>(dts)+duration[sample];
                Need(pts>=0&&pts<=INT64_MAX&&end<=INT64_MAX,"mp4-native-overflow");n.samples.push_back({static_cast<std::int64_t>(pts),dts,duration[sample],Hash(bytes.data(),bytes.size()),Vcl(bytes,width)});
                dts=static_cast<std::int64_t>(end);position+=size;++sample;}prior_end=position;
        }
        Need(sample==count,"mp4-sample-total");return n;
    }
};
std::vector<unsigned char> ReadFile(int fd,std::uint64_t bytes,const std::string& hash) {
    Need(bytes&&bytes<=kBytes,"file-size-cap");struct stat before{},after{};Need(::fstat(fd,&before)==0&&S_ISREG(before.st_mode)&&before.st_size==static_cast<off_t>(bytes),"file-binding");
    std::vector<unsigned char> data(bytes);std::size_t done=0;
    while(done<data.size()){const auto got=::pread(fd,data.data()+done,data.size()-done,done);if(got<0&&errno==EINTR)continue;Need(got>0,"file-read");done+=got;}
    Need(::fstat(fd,&after)==0&&before.st_dev==after.st_dev&&before.st_ino==after.st_ino&&before.st_size==after.st_size&&Hash(data.data(),data.size())==hash,"file-hash-binding");return data;
}
void MatchNative(const Native& n,const RecordingFileEvidenceV1& e) {
    Need(n.timescale==e.timescale&&n.movie_timescale==e.movie_timescale&&n.edit_duration==e.edit_duration&&n.edit_time==e.edit_media_time&&n.samples.size()==e.samples.size(),"native-file-header-mismatch");
    for(std::size_t i=0;i<n.samples.size();++i){const auto& a=n.samples[i];const auto& b=e.samples[i];Need(a.pts==b.native_pts&&a.dts==b.native_dts&&a.duration==b.native_duration&&a.raw==b.sample_sha256&&a.vcl==b.vcl_sha256,"native-file-sample-mismatch");}
}
}
struct RecordingFileEvidenceCollector::Impl {
    std::mutex mutex;std::int64_t origin;CaptureFailure failure;unsigned input_width=0;GstPad* pad=nullptr;gulong probe=0;bool segment=false;
    std::vector<RecordingFileSampleEvidenceV1> accepted,mux;
    explicit Impl(std::int64_t o):origin(o){accepted.reserve(kSamples);mux.reserve(kSamples);}
    ~Impl(){if(pad){if(probe)gst_pad_remove_probe(pad,probe);gst_object_unref(pad);}}
    static GstPadProbeReturn Observe(GstPad* pad,GstPadProbeInfo* info,gpointer pointer) noexcept {
        auto& self=*static_cast<Impl*>(pointer);auto phase=CapturePhase::ObserveLock;
        try {
            std::lock_guard lock(self.mutex);if(self.failure.Failed())return GST_PAD_PROBE_OK;
            if(GST_PAD_PROBE_INFO_TYPE(info)&GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM){auto* event=GST_PAD_PROBE_INFO_EVENT(info);
                if(GST_EVENT_TYPE(event)==GST_EVENT_SEGMENT){phase=CapturePhase::ObserveSegment;const GstSegment* s=nullptr;gst_event_parse_segment(event,&s);Need(s&&s->format==GST_FORMAT_TIME&&s->start==0&&s->time==0&&s->base==0&&s->offset==0&&s->rate==1&&s->applied_rate==1,"segment-profile");self.segment=true;}}
            if(GST_PAD_PROBE_INFO_TYPE(info)&GST_PAD_PROBE_TYPE_BUFFER){phase=CapturePhase::ObserveCount;Need(self.mux.size()<kSamples,"sample-cap");auto* b=GST_PAD_PROBE_INFO_BUFFER(info);phase=CapturePhase::ObserveBufferSize;Need(gst_buffer_get_size(b)<=kBytes,"buffer-cap");
                RecordingFileSampleEvidenceV1 sample;ReadMuxTimes(b,sample,phase);
                phase=CapturePhase::ObserveCaps;auto* caps=gst_pad_get_current_caps(pad);Need(caps,"caps-unavailable");phase=CapturePhase::ObserveAvc;const auto* structure=gst_caps_get_structure(caps,0);const auto* format=gst_structure_get_string(structure,"stream-format");const auto* value=gst_structure_get_value(structure,"codec_data");
                auto* codec=value&&GST_VALUE_HOLDS_BUFFER(value)?gst_value_get_buffer(value):nullptr;unsigned char head[5]{};const bool valid=format&&std::string(format)=="avc"&&codec&&gst_buffer_extract(codec,0,head,5)==5;gst_caps_unref(caps);Need(valid,"avc-profile");
                phase=CapturePhase::ObserveBufferRead;std::vector<unsigned char> bytes(gst_buffer_get_size(b));Need(gst_buffer_extract(b,0,bytes.data(),bytes.size())==bytes.size(),"buffer-read");phase=CapturePhase::ObserveVcl;sample.vcl_sha256=Vcl(bytes,(head[4]&3)+1);phase=CapturePhase::ObserveHash;sample.sample_sha256=Hash(bytes.data(),bytes.size());phase=CapturePhase::ObserveAppend;self.mux.push_back(std::move(sample));}
        }catch(const std::exception& e){self.failure.Record(phase,e.what());}catch(...){self.failure.Record(phase);}
        return GST_PAD_PROBE_OK;
    }
};
RecordingFileEvidenceCollector::RecordingFileEvidenceCollector(std::int64_t o):impl_(std::make_unique<Impl>(o)){}
RecordingFileEvidenceCollector::~RecordingFileEvidenceCollector()=default;
bool RecordingFileEvidenceCollector::Attach(GstElement* parser,const GstCaps* input_caps) noexcept {
    auto phase=CapturePhase::AttachCore;
    try{guint major=0,minor=0,micro=0,nano=0;gst_version(&major,&minor,&micro,&nano);Need(major==1&&minor==28&&micro==1&&nano==0,"gstreamer-profile");
        phase=CapturePhase::AttachInputCaps;impl_->input_width=InputNalWidth(input_caps);
        phase=CapturePhase::AttachParserPad;auto* src=gst_element_get_static_pad(parser,"src");Need(src,"parser-pad");phase=CapturePhase::AttachMuxPad;impl_->pad=gst_pad_get_peer(src);gst_object_unref(src);Need(impl_->pad,"mux-pad");
        phase=CapturePhase::AttachMuxElement;auto* mux=gst_pad_get_parent_element(impl_->pad);Need(mux,"mux-element");phase=CapturePhase::AttachPlugin;
        auto* mux_factory=gst_element_get_factory(mux);
        bool versions=mux_factory&&std::string(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(mux_factory)))=="mp4mux";
        for(auto* element:{parser,mux}) {
            auto* factory=gst_element_get_factory(element);auto* plugin=factory?gst_plugin_feature_get_plugin(GST_PLUGIN_FEATURE(factory)):nullptr;
            versions=versions&&plugin&&std::string(gst_plugin_get_version(plugin))=="1.28.1";
            if(element==mux)versions=versions&&plugin&&std::string(gst_plugin_get_name(plugin))=="isomp4";
            if(plugin)gst_object_unref(plugin);
        }
        gst_object_unref(mux);Need(versions,"plugin-profile");
        phase=CapturePhase::AttachProbe;impl_->probe=gst_pad_add_probe(impl_->pad,static_cast<GstPadProbeType>(GST_PAD_PROBE_TYPE_BUFFER|GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM),Impl::Observe,impl_.get(),nullptr);Need(impl_->probe,"probe-install");return true;
    }catch(const std::exception& e){impl_->failure.Record(phase,e.what());return false;}catch(...){impl_->failure.Record(phase);return false;}
}
void RecordingFileEvidenceCollector::Accept(const media::Packet& packet) noexcept {
    auto phase=CapturePhase::AcceptLock;
    try{std::lock_guard lock(impl_->mutex);if(impl_->failure.Failed())return;phase=CapturePhase::AcceptCount;Need(impl_->accepted.size()<kSamples,"sample-cap");phase=CapturePhase::AcceptOriginalFields;Need(packet.observation&&packet.observation->pts_ns&&packet.observation->dts_ns,"original-timestamp");const auto& o=*packet.observation;phase=CapturePhase::AcceptBufferSize;Need(packet.payload.size()<=kBytes,"buffer-cap");
        RecordingFileSampleEvidenceV1 sample;sample.ordinal=o.ordinal;phase=CapturePhase::AcceptPts;sample.original_pts_ns=Time(*o.pts_ns);phase=CapturePhase::AcceptDts;sample.original_dts_ns=Time(*o.dts_ns);phase=CapturePhase::AcceptDuration;sample.original_duration_ns=o.duration_ns?Time(*o.duration_ns):-1;
        phase=CapturePhase::AcceptVcl;sample.vcl_sha256=Vcl(packet.payload,impl_->input_width);phase=CapturePhase::AcceptAppend;impl_->accepted.push_back(std::move(sample));
    }catch(const std::exception& e){impl_->failure.Record(phase,e.what());}catch(...){impl_->failure.Record(phase);}
}
std::optional<RecordingFileEvidenceV1> RecordingFileEvidenceCollector::Finish(const std::filesystem::path& path,const RecordingSourceBindingV1& binding,std::uint64_t bytes,const std::string& sha,std::string* reason) noexcept {
    int fd=-1;
    try {std::lock_guard lock(impl_->mutex);if(impl_->failure.Failed()){if(reason)*reason=impl_->failure.Reason();return std::nullopt;}Need(impl_->segment,"segment-unobserved");Need(binding.index_complete&&impl_->accepted.size()==binding.samples.size()&&impl_->mux.size()==binding.samples.size(),"capture-count");
        fd=::open(path.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);Need(fd>=0,"file-open");const auto data=ReadFile(fd,bytes,sha);::close(fd);fd=-1;const auto native=Mp4(data).Read();
        RecordingFileEvidenceV1 evidence;evidence.writer_origin_ns=impl_->origin;evidence.file_size_bytes=bytes;evidence.file_sha256=sha;evidence.timescale=native.timescale;evidence.movie_timescale=native.movie_timescale;evidence.edit_duration=native.edit_duration;evidence.edit_media_time=native.edit_time;
        std::unordered_map<std::string,const RecordingFileSampleEvidenceV1*> accepted;
        for(const auto& a:impl_->accepted)Need(accepted.emplace(a.vcl_sha256,&a).second,"ambiguous-original-vcl");
        Need(native.samples.size()==impl_->mux.size(),"native-count");
        std::unordered_map<std::string,const RecordingFileSampleEvidenceV1*> mux;
        for(const auto& m:impl_->mux)Need(mux.emplace(m.sample_sha256,&m).second,"ambiguous-mux-raw");
        for(const auto& n:native.samples){const auto m=mux.find(n.raw);Need(m!=mux.end()&&m->second->vcl_sha256==n.vcl,"mux-file-payload");const auto a=accepted.find(n.vcl);Need(a!=accepted.end(),"original-file-vcl");auto sample=*a->second;
            sample.mux_pts_ns=m->second->mux_pts_ns;sample.mux_dts_ns=m->second->mux_dts_ns;sample.mux_duration_ns=m->second->mux_duration_ns;
            sample.native_pts=n.pts;sample.native_dts=n.dts;sample.native_duration=n.duration;sample.sample_sha256=n.raw;evidence.samples.push_back(std::move(sample));}
        auto candidate=binding;candidate.file_evidence=evidence;std::string error;if(!ValidateRecordingFileEvidence(candidate,&error))throw std::runtime_error(error);if(reason)reason->clear();return evidence;
    }catch(const std::exception& e){if(fd>=0)::close(fd);SetFinishReason(reason,FixedFinishReason(e.what()));return std::nullopt;}catch(...){if(fd>=0)::close(fd);SetFinishReason(reason,"finish-exception");return std::nullopt;}
}
bool VerifyRecordingFileEvidenceFd(int fd,const RecordingSourceBindingV1& binding,std::string* error) {
    if(!binding.file_evidence)return true;
    try{Need(ValidateRecordingFileEvidence(binding,error),"file-evidence-invalid");const auto& evidence=*binding.file_evidence;const auto bytes=ReadFile(fd,evidence.file_size_bytes,evidence.file_sha256);MatchNative(Mp4(bytes).Read(),evidence);if(error)error->clear();return true;}
    catch(const std::exception& e){if(error)*error=e.what();return false;}
}
}
#else
namespace recording {
struct RecordingFileEvidenceCollector::Impl{};
RecordingFileEvidenceCollector::RecordingFileEvidenceCollector(std::int64_t):impl_(std::make_unique<Impl>()){}
RecordingFileEvidenceCollector::~RecordingFileEvidenceCollector()=default;
bool RecordingFileEvidenceCollector::Attach(GstElement*,const GstCaps*) noexcept{return false;}
void RecordingFileEvidenceCollector::Accept(const media::Packet&) noexcept{}
std::optional<RecordingFileEvidenceV1> RecordingFileEvidenceCollector::Finish(const std::filesystem::path&,const RecordingSourceBindingV1&,std::uint64_t,const std::string&,std::string* reason) noexcept{if(reason)*reason="gstreamer-unavailable";return {};}
bool VerifyRecordingFileEvidenceFd(int,const RecordingSourceBindingV1& b,std::string* error){if(!b.file_evidence)return true;if(error)*error="gstreamer-unavailable";return false;}
}
#endif
