// 파일 용도: 저장 snapshot 후보를 현재 원본 sample/실제 decoded RGB에 결합한다.
#include "recording/recording_visual_source.h"
#include "recording/visual_frame_decoder.h"
#include "analysis/event_snapshot_proof.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <cctype>
#include <cmath>
#include <fcntl.h>
#include <set>
#include <sys/stat.h>
#include <unistd.h>
namespace recording {
namespace {
bool Fail(std::string* e,const char* s){if(e)*e=s;return false;}
struct Fd {int value{-1};explicit Fd(int n=-1):value(n){}~Fd(){if(value>=0)::close(value);}Fd(const Fd&)=delete;Fd& operator=(const Fd&)=delete;};
std::string Token(const std::string& value){std::string out;for(unsigned char c:value)out+=(std::isalnum(c)||c=='-'||c=='_')?char(c):'_';return out.empty()?"event":out;}
int Directory(const std::string& name){
    if(name.empty()||name.find('\0')!=std::string::npos)return -1;
    std::filesystem::path p(name);for(const auto& part:p)if(part=="..")return -1;
    std::error_code ec;p=std::filesystem::absolute(p,ec).lexically_normal();if(ec)return -1;
#ifdef __APPLE__
    const auto s=p.string();if(s=="/tmp"||s.rfind("/tmp/",0)==0||s=="/var"||s.rfind("/var/",0)==0)p="/private"+s;
#endif
    int fd=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);if(fd<0)return -1;
    for(const auto& part:p.relative_path()){if(part.empty()||part==".")continue;int next=::openat(fd,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);::close(fd);fd=next;if(fd<0)return -1;}
    struct stat st{};if(::fstat(fd,&st)||st.st_uid!=::geteuid()||(st.st_mode&0022)){::close(fd);return -1;}return fd;
}
bool Bytes(int fd,std::size_t cap,std::vector<unsigned char>* out){
    struct stat a{},b{};if(fd<0||::fstat(fd,&a)||!S_ISREG(a.st_mode)||a.st_size<=0||std::uint64_t(a.st_size)>cap||a.st_uid!=::geteuid()||(a.st_mode&0022)||a.st_nlink!=1)return false;
    std::vector<unsigned char> bytes(std::size_t(a.st_size));std::size_t offset=0;
    while(offset<bytes.size()){auto n=::pread(fd,bytes.data()+offset,bytes.size()-offset,off_t(offset));if(n<0&&errno==EINTR)continue;if(n<=0)return false;offset+=std::size_t(n);}
    if(::fstat(fd,&b)||a.st_size!=b.st_size||a.st_ino!=b.st_ino||a.st_dev!=b.st_dev)return false;
#ifdef __APPLE__
    if(a.st_mtimespec.tv_sec!=b.st_mtimespec.tv_sec||a.st_mtimespec.tv_nsec!=b.st_mtimespec.tv_nsec||a.st_ctimespec.tv_sec!=b.st_ctimespec.tv_sec||a.st_ctimespec.tv_nsec!=b.st_ctimespec.tv_nsec)return false;
#else
    if(a.st_mtim.tv_sec!=b.st_mtim.tv_sec||a.st_mtim.tv_nsec!=b.st_mtim.tv_nsec||a.st_ctim.tv_sec!=b.st_ctim.tv_sec||a.st_ctim.tv_nsec!=b.st_ctim.tv_nsec)return false;
#endif
    *out=std::move(bytes);return true;
}
struct Snapshot {
    analysis::EventSnapshotProof proof;std::string source,id;std::vector<unsigned char> image;
    Fd image_fd;
};
bool Read(const std::string& root,const std::string& event,const std::string& channel,Snapshot* out){
    if(event.empty()||event.size()>1024||channel.empty()||channel.size()>1024)return false;
    Fd dir(Directory(root));if(dir.value<0)return false;
    const auto base=Token(event)+".snapshot";Fd manifest(::openat(dir.value,(base+".json").c_str(),O_RDONLY|O_NONBLOCK|O_NOFOLLOW|O_CLOEXEC));
    std::vector<unsigned char> bytes;if(!Bytes(manifest.value,65536,&bytes))return false;
    ingress::StrictJsonObjectDocument d;std::string error;
    if(!ingress::ParseStrictJsonObjectDocument(std::string(bytes.begin(),bytes.end()),&d,&error))return false;
    auto s=[&](const char* key){return ingress::StrictJsonStringField(d,key).value_or("");};
    const auto proof=ingress::StrictJsonObjectField(d,"originalFrameProof");
    if(s("schema")!="media-server.va.event-snapshot-hook.v1"||s("captureStatus")!="recorded"||
        ingress::StrictJsonBoolField(d,"recorded")!=std::optional<bool>(true)||s("eventId")!=event||s("channelId")!=channel||
        !proof||!analysis::ParseEventSnapshotProof(*proof,&out->proof)||s("contentType")!="image/jpeg")return false;
    out->source=s("streamId");if(!ValidateRecordingReferenceId(out->source,nullptr))return false;
    // manifest의 mediaPath는 실행 경로로 사용하지 않는다. 고정 basename과 trusted root의 FD만 연다.
    out->image_fd.value=::openat(dir.value,(base+".jpg").c_str(),O_RDONLY|O_NONBLOCK|O_NOFOLLOW|O_CLOEXEC);
    if(!Bytes(out->image_fd.value,16*1024*1024,&out->image)||analysis::SnapshotBytesSha256(out->image.data(),out->image.size())!=out->proof.image_sha256)return false;
    // 전체 manifest hash로 event/channel/source와 proof 변경 모두 cache 재사용에서 분리한다.
    out->id="snapshot:"+analysis::SnapshotBytesSha256(bytes.data(),bytes.size());return out->id.size()==73;
}
}
bool RecordingVisualSource::SnapshotDocument(const std::string& event,const std::string& channel,VisualSearchDocument* out,std::string* error)const{
    Snapshot snapshot;if(!out||!Read(snapshots_,event,channel,&snapshot))return Fail(error,"visual-snapshot-proof-unavailable");
    const auto& p=snapshot.proof.original;RecordingOriginalResult matches;
    if(!catalog_.ResolveOriginalSample(channel,snapshot.source,p.source_generation,p.generation_order,p.track_id,p.ordinal,p.pts_ns,&matches,error)||
        matches.exact.size()!=1||!matches.unknown.empty())return Fail(error,"visual-snapshot-original-unavailable");
    const auto& segment=matches.exact.front().segment;
    const auto binding=catalog_.FindSourceBinding(segment.segment_id);
    if(!binding||!binding->file_evidence||segment.container!="mp4"||segment.video_codecs!=std::vector<std::string>{"h264"}||
        segment.size_bytes>512ULL*1024*1024||!ValidateRecordingSourceBindingForSegment(*binding,segment,error))return Fail(error,"visual-snapshot-original-unavailable");
    const RecordingFileSampleEvidenceV1* sample=nullptr;unsigned count=0;
    for(const auto& s:binding->file_evidence->samples)if(s.ordinal==p.ordinal&&s.original_pts_ns==std::int64_t(p.pts_ns)&&s.native_pts>=binding->file_evidence->edit_media_time){sample=&s;++count;}
    if(count!=1)return Fail(error,"visual-snapshot-original-unavailable");
    VisualSearchDocument doc;doc.id=snapshot.id;doc.event_id=event;doc.channel_id=channel;doc.segment_id=segment.segment_id;
    doc.media_sha256=segment.checksum_sha256;doc.frame_sha256=sample->sample_sha256;doc.media_pts=std::int64_t(p.pts_ns);
    doc.utc_ns=SampleUtc(segment,doc.media_pts);*out=std::move(doc);if(error)error->clear();return true;
}
bool RecordingVisualSource::CollectSnapshots(const std::vector<VisualSnapshotEvent>& events,
    std::vector<VisualSearchDocument>* docs,std::map<std::string,VisualSourceCoverage>* coverage,std::string* error,
    const std::function<bool()>& cancelled)const{
    if(!docs||!coverage||events.size()>20000)return Fail(error,"visual-index-capacity");
    if(snapshots_.empty())return true;
    std::vector<VisualSearchDocument> additions;std::map<std::string,VisualSourceCoverage> counts=*coverage;
    std::set<std::pair<std::string,std::string>> seen;
    for(const auto& event:events){if(cancelled&&cancelled())return Fail(error,"visual-cancelled");
        if(!counts.count(event.channel_id)||!seen.emplace(event.event_id,event.channel_id).second)continue;
        auto& c=counts[event.channel_id];++c.examined_snapshots;VisualSearchDocument doc;std::string reason;
        if(!SnapshotDocument(event.event_id,event.channel_id,&doc,&reason)||!SnapshotMatchesEvent(doc,event.stream_epoch_id)){++c.unsupported_snapshots;continue;}
        if(docs->size()+additions.size()>=20000)return Fail(error,"visual-index-capacity");
        ++c.event_snapshots;additions.push_back(std::move(doc));}
    docs->insert(docs->end(),std::make_move_iterator(additions.begin()),std::make_move_iterator(additions.end()));
    *coverage=std::move(counts);if(error)error->clear();return true;
}
bool RecordingVisualSource::SnapshotMatchesEvent(const VisualSearchDocument& doc,const std::string& event_epoch,std::string* error)const{
    if(error)error->clear();
    if(event_epoch.empty()||doc.event_id.empty())return false;
    Snapshot current;if(!Read(snapshots_,doc.event_id,doc.channel_id,&current))return Fail(error,"visual-snapshot-read-failed");
    return current.id==doc.id&&current.proof.event_epoch==event_epoch;
}
bool RecordingVisualSource::EncodeSnapshot(VisualSearchDocument* doc,analysis::Siglip2Encoder& encoder,std::string* error,
    const std::function<bool()>& cancelled)const{
    SearchSeekTarget seek;std::unique_ptr<ResolvedRecordingMedia> media;
    if(!Resolve(*doc,&seek,&media,error,cancelled))return false;
    Snapshot snapshot;if(!Read(snapshots_,doc->event_id,doc->channel_id,&snapshot)||snapshot.id!=doc->id)return Fail(error,"visual-snapshot-changed");
    const long double ns=static_cast<long double>(seek.seconds)*1000000000;
    if(!std::isfinite(ns)||ns<0||ns>=std::ldexp(1.0L,63))return Fail(error,"visual-invalid-frame-reference");
    VisualRgbFrame original;
    if(!DecodeVisualFrame(media->fd(),media->size_bytes(),std::llround(ns),&original,error,cancelled))return false;
    if(original.width!=snapshot.proof.width||original.height!=snapshot.proof.height||
        analysis::SnapshotBytesSha256(original.rgb.data(),original.rgb.size())!=snapshot.proof.rgb_sha256)return Fail(error,"visual-snapshot-pixels-mismatch");
    VisualRgbFrame image;if(!DecodeVisualFrame(snapshot.image_fd.value,snapshot.image.size(),0,&image,error,cancelled))return false;
    if(image.width!=original.width||image.height!=original.height)return Fail(error,"visual-snapshot-pixels-mismatch");
    if(cancelled&&cancelled())return Fail(error,"visual-cancelled");
    doc->embedding=encoder.EncodeRgb(image.rgb.data(),image.width,image.height,std::size_t(image.width)*3);
    if(error)error->clear();return true;
}
}
