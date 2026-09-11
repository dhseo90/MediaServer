// 파일 용도: 완료 증명 티켓을 이용한 녹화 최종화 복구.
#include "recording/recording_finalize_recovery.h"
#include "recording/recording_catalog.h"
#include "recording/recording_media_inspector.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <array>
#include <cerrno>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_GSTREAMER
#include <glib.h>
#endif
namespace recording {
namespace {
bool Fail(std::string* error,const std::string& text){if(error)*error=text;return false;}
std::string Digest(const std::string& value){
#if MEDIA_SERVER_USE_GSTREAMER
    gchar* raw=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(value.data()),value.size());
    const std::string digest=raw?raw:"";g_free(raw);return digest;
#else
    (void)value;return {};
#endif
}
struct Fd {
    int fd{-1};explicit Fd(int value=-1):fd(value){}~Fd(){if(fd>=0)::close(fd);}
    Fd(const Fd&)=delete;Fd& operator=(const Fd&)=delete;
    Fd(Fd&& o) noexcept:fd(o.fd){o.fd=-1;}
    Fd& operator=(Fd&& o) noexcept{if(this!=&o){if(fd>=0)::close(fd);fd=o.fd;o.fd=-1;}return *this;}
};
bool Same(const struct stat& a,const struct stat& b){return a.st_dev==b.st_dev&&a.st_ino==b.st_ino;}
bool StableFile(const struct stat& a,const struct stat& b,nlink_t links=1){
#ifdef __APPLE__
    const auto am=a.st_mtimespec,bm=b.st_mtimespec,ac=a.st_ctimespec,bc=b.st_ctimespec;
#else
    const auto am=a.st_mtim,bm=b.st_mtim,ac=a.st_ctim,bc=b.st_ctim;
#endif
    return Same(a,b)&&S_ISREG(a.st_mode)&&S_ISREG(b.st_mode)&&a.st_nlink==links&&b.st_nlink==links&&a.st_size==b.st_size&&
        am.tv_sec==bm.tv_sec&&am.tv_nsec==bm.tv_nsec&&ac.tv_sec==bc.tv_sec&&ac.tv_nsec==bc.tv_nsec;
}
bool Relative(const std::filesystem::path& p){
    if(p.empty()||p.is_absolute())return false;
    for(const auto& part:p){const auto s=part.string();if(s.empty()||s=="."||s==".."||
        !std::all_of(s.begin(),s.end(),[](unsigned char c){return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='-'||c=='_'||c=='.';}))return false;}
    return true;
}
std::filesystem::path Root(const std::filesystem::path& input){
    if(input.empty())return {};
    for(const auto& c:input)if(c==".."||c.string().find('\0')!=std::string::npos)return {};
    std::error_code ec;auto p=std::filesystem::absolute(input,ec).lexically_normal();if(ec)return {};
#ifdef __APPLE__
    auto s=p.string();if(s=="/tmp"||s.rfind("/tmp/",0)==0||s=="/var"||s.rfind("/var/",0)==0)p="/private"+s;
#endif
    return p;
}
Fd Directory(const std::filesystem::path& absolute){
    Fd fd(::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC));
    for(const auto& c:absolute.relative_path()){
        if(c=="."||c.empty())continue;
        Fd next(::openat(fd.fd,c.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC));if(next.fd<0)return Fd();fd=std::move(next);
    }return fd;
}
struct Parent {
    std::filesystem::path absolute;Fd fd;struct stat status{};
    bool Open(const std::filesystem::path& root,const std::filesystem::path& rel){
        auto r=Root(root);if(r.empty()||!Relative(rel))return false;absolute=r/rel.parent_path();fd=Directory(absolute);
        return fd.fd>=0&&::fstat(fd.fd,&status)==0;
    }
    bool Stable()const{auto now=Directory(absolute);struct stat s{};return now.fd>=0&&::fstat(now.fd,&s)==0&&Same(s,status);}
};
std::filesystem::path TicketPath(const FinalizeReadyTicket& t){return t.final_relative.string()+".finalize-ready";}
bool Validate(const FinalizeReadyTicket& t,std::string* error){
    const bool v2=t.segment_v2.has_value();
    if(v2&&(SerializeRecordingSegmentV1(t.segment)!=SerializeRecordingSegmentV1(RecordingSegmentV1{})||
       !ValidateRecordingSegmentV2(*t.segment_v2,error)||t.segment_v2->retention_class!=RecordingRetentionClass::Continuous||t.event_link))
        return Fail(error,"ready V2 mixed/metadata/provenance 거부");
    const auto& id=v2?t.segment_v2->segment_id:t.segment.segment_id;
    const auto& container=v2?t.segment_v2->container:t.segment.container;
    const auto& checksum=v2?t.segment_v2->checksum_sha256:t.segment.checksum_sha256;
    const auto size=v2?t.segment_v2->size_bytes:t.segment.size_bytes;
    if((!v2&&(!ValidateRecordingSegmentV1(t.segment,error)||t.segment.lifecycle!=RecordingLifecycle::Finalized))||
       size==0||checksum.size()!=64||
       !std::all_of(checksum.begin(),checksum.end(),[](unsigned char c){return (c>='0'&&c<='9')||(c>='a'&&c<='f');})||
       !Relative(t.partial_relative)||!Relative(t.final_relative)||t.partial_relative.parent_path()!=t.final_relative.parent_path()||
       t.final_relative.stem()!=id)return Fail(error,"ready metadata/path 불일치");
    const std::string expected=t.final_relative.filename().string()+".partial.";
    const auto partial=t.partial_relative.filename().string();
    if(partial.rfind(expected,0)!=0)return Fail(error,"ready partial 소유권 불일치");
    const auto nonce=partial.substr(expected.size());
    if(nonce.size()!=36)return Fail(error,"ready nonce 길이 불일치");
    if(nonce[14]!='4'||(nonce[19]!='8'&&nonce[19]!='9'&&nonce[19]!='a'&&nonce[19]!='b'))return Fail(error,"ready nonce version/variant 불일치");
    for(std::size_t i=0;i<nonce.size();++i){const char c=nonce[i];const bool dash=i==8||i==13||i==18||i==23;
        if(dash?c!='-':!((c>='0'&&c<='9')||(c>='a'&&c<='f')))return Fail(error,"ready nonce 형식 불일치");}
    const auto ext=t.final_relative.extension();
    if(!((ext==".mp4"&&container=="mp4")||(ext==".webm"&&container=="webm")||(ext==".ts"&&container=="mpegts")))return Fail(error,"ready container/path 불일치");
    if(v2)return true;
    if(t.segment.retention_class==RecordingRetentionClass::Event){
        if(!t.event_link||!ValidateEventRecordingLinkV1(*t.event_link,error))return Fail(error,"ready event provenance 없음");
        const auto& l=*t.event_link;
        if(l.status!=EventRecordingLinkStatus::Pending||l.derived_segment_id!=std::optional<std::string>(t.segment.segment_id)||
           l.source_id!=t.segment.source_id||l.channel_id!=t.segment.channel_id||!l.requested_range||l.ordered_overlaps.empty()||
           t.segment.start.utc_ms>l.requested_range->start_ms||t.segment.end.utc_ms<l.requested_range->end_ms)
            return Fail(error,"ready event identity/range 불일치");
        const auto epoch=Digest(l.stream_epoch_id);
        const auto id=Digest(l.event_id+"\n"+std::to_string(l.requested_range->start_ms)+"\n"+std::to_string(l.requested_range->end_ms)+"\n"+l.stream_epoch_id);
        if(epoch.empty()||id.empty()||t.segment.stream_epoch_id!="event-epoch-sha256-"+epoch||
           t.segment.segment_id!="event-seg-sha256-"+id)return Fail(error,"ready event epoch/output ID derivation 불일치");
    }else if(t.segment.retention_class!=RecordingRetentionClass::Continuous||t.event_link)return Fail(error,"ready retention/provenance 불일치");
    return true;
}
std::string Serialize(const FinalizeReadyTicket& t){return (t.segment_v2?"{\"version\":2,\"segment\":"+SerializeRecordingSegmentV2(*t.segment_v2):"{\"version\":1,\"segment\":"+SerializeRecordingSegmentV1(t.segment))+
    ",\"partial\":\""+t.partial_relative.generic_string()+"\",\"final\":\""+t.final_relative.generic_string()+"\",\"eventLink\":"+
    (t.event_link?SerializeEventRecordingLinkV1(*t.event_link):"null")+"}";}
bool Parse(const std::string& text,FinalizeReadyTicket* t,std::string* error){
    ingress::StrictJsonObjectDocument d;if(!ingress::ParseStrictJsonObjectDocument(text,&d,error)||d.members.size()!=5)return Fail(error,"ready strict object 실패");
    const auto* version=d.Find("version");const auto segment=ingress::StrictJsonObjectField(d,"segment");
    const auto partial=ingress::StrictJsonStringField(d,"partial"),final=ingress::StrictJsonStringField(d,"final");
    if(!version||version->type!=ingress::StrictJsonType::Number||(version->raw!="1"&&version->raw!="2")||!segment||!partial||!final||!d.Find("eventLink"))return Fail(error,"ready version/필수필드 실패");
    if(version->raw=="2") {RecordingSegmentV2 v;if(!ParseRecordingSegmentV2(*segment,&v,error))return false;t->segment_v2=v;}
    else if(!ParseRecordingSegmentV1(*segment,&t->segment,error))return false;
    t->partial_relative=*partial;t->final_relative=*final;
    if(!ingress::StrictJsonFieldIsNull(d,"eventLink")){const auto event=ingress::StrictJsonObjectField(d,"eventLink");EventRecordingLinkV1 l;
        if(!event||!ParseEventRecordingLinkV1(*event,&l,error))return Fail(error,"ready event parse 실패");t->event_link=l;}
    return Validate(*t,error);
}
bool Read(const std::filesystem::path& root,const std::filesystem::path& relative,FinalizeReadyTicket* t,bool* missing,std::string* error,struct stat* binding=nullptr){
    *missing=false;Parent p;if(!p.Open(root,relative))return Fail(error,"ready parent 열기 실패");
    Fd fd(::openat(p.fd.fd,relative.filename().c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));
    if(fd.fd<0){if(errno==ENOENT){*missing=true;return true;}return Fail(error,"ready 읽기 불가");}
    struct stat before{},after{},leaf{};
    if(::fstat(fd.fd,&before)!=0||!S_ISREG(before.st_mode)||before.st_nlink!=1||before.st_size<=0||before.st_size>1024*1024)return Fail(error,"ready 파일 binding/크기 거부");
    std::string text(static_cast<std::size_t>(before.st_size),'\0');std::size_t done=0;
    while(done<text.size()){const auto n=::pread(fd.fd,text.data()+done,text.size()-done,done);if(n<0&&errno==EINTR)continue;if(n<=0)return Fail(error,"ready read 실패");done+=n;}
    if(::fstat(fd.fd,&after)!=0||::fstatat(p.fd.fd,relative.filename().c_str(),&leaf,AT_SYMLINK_NOFOLLOW)!=0||
       !StableFile(before,after)||!StableFile(before,leaf)||!p.Stable())return Fail(error,"ready 파일 변경");
    if(!Parse(text,t,error)||TicketPath(*t)!=relative)return Fail(error,"ready ticket 경로 불일치");
    if(binding)*binding=after;
    return true;
}
bool Remove(Parent& p,const std::string& name,bool missing_ok,std::string* error,const struct stat* expected=nullptr){
    struct stat s{};if(::fstatat(p.fd.fd,name.c_str(),&s,AT_SYMLINK_NOFOLLOW)!=0)return errno==ENOENT&&missing_ok?true:Fail(error,"ready 정리 stat 실패");
    if(!S_ISREG(s.st_mode)||s.st_nlink!=1||!p.Stable()||(expected&&!StableFile(*expected,s)))return Fail(error,"ready 정리 소유권 실패");
    return (::unlinkat(p.fd.fd,name.c_str(),0)==0&&::fsync(p.fd.fd)==0)||Fail(error,"ready 정리 내구 실패");
}
std::string Binding(const struct stat& s) {
#ifdef __APPLE__
    const auto m=s.st_mtimespec,c=s.st_ctimespec;
#else
    const auto m=s.st_mtim,c=s.st_ctim;
#endif
    return std::to_string(s.st_dev)+":"+std::to_string(s.st_ino)+":"+std::to_string(s.st_size)+":"+
        std::to_string(m.tv_sec)+":"+std::to_string(m.tv_nsec)+":"+
        std::to_string(c.tv_sec)+":"+std::to_string(c.tv_nsec);
}
bool Quarantine(RecordingCatalog& catalog,const std::filesystem::path& root,const FinalizeReadyTicket& t,
                const MediaInspectionResult& inspected,const std::filesystem::path& inspected_relative,
                const struct stat& inspected_binding,const struct stat& ticket_binding,std::string* error) {
    if(inspected.state!=MediaInspectionState::Corrupt)return Fail(error,"검사불가 파일은 격리하지 않음");
    FinalizeReadyTicket current_ticket;
    bool ticket_missing=false;
    struct stat current_binding{},media_now{};
    if(!Read(root,TicketPath(t),&current_ticket,&ticket_missing,error,&current_binding)||ticket_missing||
       Serialize(current_ticket)!=Serialize(t)||!StableFile(ticket_binding,current_binding))
        return Fail(error,"격리 ticket 변경");
    Parent p;
    if(!p.Open(root,t.final_relative)||
       ::fstatat(p.fd.fd,inspected_relative.filename().c_str(),&media_now,AT_SYMLINK_NOFOLLOW)!=0||
       !StableFile(inspected_binding,media_now))return Fail(error,"격리 검사대상 변경");

    // 미디어와 ready는 원위치에 보존한다. 진단이 정상 등록을 금지하는 내구 논리 격리 기록이다.
    const auto diagnostic=TicketPath(t).filename().string()+".corrupt-info";
    const auto contents="{\"reason\":\""+inspected.corruption_reason+"\",\"mediaBinding\":\""+
        Binding(inspected_binding)+"\",\"ticketBinding\":\""+Binding(ticket_binding)+"\",\"media\":\""+
        inspected_relative.generic_string()+"\",\"ticket\":"+Serialize(t)+"}";
    Fd output(::openat(p.fd.fd,diagnostic.c_str(),O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600));
    if(output.fd<0) {
        if(errno!=EEXIST)return Fail(error,"격리 진단 생성 실패");
        Fd existing(::openat(p.fd.fd,diagnostic.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));
        struct stat before{},after{},leaf{};
        if(existing.fd<0||::fstat(existing.fd,&before)!=0||!S_ISREG(before.st_mode)||
           before.st_nlink!=1||before.st_size!=static_cast<off_t>(contents.size()))
            return Fail(error,"격리 진단 종류/크기 충돌");
        std::string actual(contents.size(),'\0');
        std::size_t done=0;
        while(done<actual.size()) {
            const auto n=::pread(existing.fd,actual.data()+done,actual.size()-done,done);
            if(n<0&&errno==EINTR)continue;
            if(n<=0)return Fail(error,"격리 진단 읽기 실패");
            done+=n;
        }
        if(actual!=contents||::fstat(existing.fd,&after)!=0||
           ::fstatat(p.fd.fd,diagnostic.c_str(),&leaf,AT_SYMLINK_NOFOLLOW)!=0||
           !StableFile(before,after)||!StableFile(before,leaf))return Fail(error,"격리 진단 충돌");
    } else {
        std::size_t done=0;
        while(done<contents.size()) {
            const auto n=::write(output.fd,contents.data()+done,contents.size()-done);
            if(n<0&&errno==EINTR)continue;
            if(n<=0)return Fail(error,"격리 진단 부분쓰기 보존");
            done+=n;
        }
        struct stat owned{},leaf{};
        if(::fsync(output.fd)!=0||::fstat(output.fd,&owned)!=0||
           ::fstatat(p.fd.fd,diagnostic.c_str(),&leaf,AT_SYMLINK_NOFOLLOW)!=0||
           !StableFile(owned,leaf)||!p.Stable()||::fsync(p.fd.fd)!=0)
            return Fail(error,"격리 진단 내구 실패");
    }
    if(!p.Stable()||::fstatat(p.fd.fd,inspected_relative.filename().c_str(),&media_now,AT_SYMLINK_NOFOLLOW)!=0||
       !StableFile(inspected_binding,media_now)||
       ::fstatat(p.fd.fd,TicketPath(t).filename().c_str(),&current_binding,AT_SYMLINK_NOFOLLOW)!=0||
       !StableFile(ticket_binding,current_binding))return Fail(error,"격리 적용 직전 binding 변경");
    const auto known=catalog.FindSegmentById(t.segment.segment_id);
    if(known&&!catalog.MarkSegmentCorrupt(t.segment.segment_id,inspected.corruption_reason,error))return false;
    return true;
}
}

bool WriteFinalizeReadyTicket(const std::filesystem::path& root,const FinalizeReadyTicket& ticket,std::string* error){
    if(!Validate(ticket,error))return false;const auto text=Serialize(ticket);
    if(text.size()>1024*1024)return Fail(error,"ready envelope 크기 거부");
    Parent p;if(!p.Open(root,TicketPath(ticket)))return Fail(error,"ready parent 불가");
    Fd fd(::openat(p.fd.fd,TicketPath(ticket).filename().c_str(),O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600));
    if(fd.fd<0)return Fail(error,"ready 생성 충돌/실패");std::size_t done=0;
    while(done<text.size()){const auto n=::write(fd.fd,text.data()+done,text.size()-done);if(n<0&&errno==EINTR)continue;if(n<=0)return Fail(error,"ready 부분쓰기: 원본 보존");done+=n;}
    struct stat owned{},leaf{};
    return (::fsync(fd.fd)==0&&::fstat(fd.fd,&owned)==0&&
        ::fstatat(p.fd.fd,TicketPath(ticket).filename().c_str(),&leaf,AT_SYMLINK_NOFOLLOW)==0&&
        owned.st_size==static_cast<off_t>(text.size())&&StableFile(owned,leaf)&&p.Stable()&&::fsync(p.fd.fd)==0)||Fail(error,"ready 내구성 불확실: 원본 보존");
}
bool PreserveFinalizeReadyPartial(const std::filesystem::path& root,const std::filesystem::path& final_relative,
    const std::string& partial_name,bool* preserve,std::string* error){
    FinalizeReadyTicket t;bool missing=false;*preserve=false;
    if(!Read(root,final_relative.string()+".finalize-ready",&t,&missing,error))return false;
    if(missing)return true;
    if(t.final_relative!=final_relative||t.partial_relative.filename()!=partial_name)return Fail(error,"ready/cleanup 소유권 불일치");
    *preserve=true;return true;
}
static bool PublishValidatedReady(const std::filesystem::path& root,const FinalizeReadyTicket& t,std::string* error){
    if(!Validate(t,error))return false;Parent p;if(!p.Open(root,t.final_relative))return Fail(error,"publish parent 불가");
    const auto partial=t.partial_relative.filename().string(),final=t.final_relative.filename().string();struct stat a{},b{};
    const bool has_a=::fstatat(p.fd.fd,partial.c_str(),&a,AT_SYMLINK_NOFOLLOW)==0;const int a_error=errno;
    const bool has_b=::fstatat(p.fd.fd,final.c_str(),&b,AT_SYMLINK_NOFOLLOW)==0;const int b_error=errno;
    if((!has_a&&a_error!=ENOENT)||(!has_b&&b_error!=ENOENT)||(!has_a&&!has_b))return Fail(error,"publish media 불가");
    if(has_a&&has_b){
        if(!S_ISREG(a.st_mode)||!S_ISREG(b.st_mode)||!Same(a,b)||a.st_nlink!=2||b.st_nlink!=2||!p.Stable())return Fail(error,"publish 기존 final 충돌");
        if(t.segment_v2) {
            const auto& v=*t.segment_v2;
            const auto inspected=InspectRecordingPhysicalMediaPair(root,t.partial_relative,t.final_relative,
                {v.container,v.video_codecs,v.size_bytes,v.checksum_sha256,v.retention_class});
            struct stat now_a{},now_b{};
            if(inspected.state!=MediaInspectionState::Healthy||!p.Stable()||
               ::fstatat(p.fd.fd,partial.c_str(),&now_a,AT_SYMLINK_NOFOLLOW)!=0||::fstatat(p.fd.fd,final.c_str(),&now_b,AT_SYMLINK_NOFOLLOW)!=0||
               !StableFile(a,now_a,2)||!StableFile(b,now_b,2))return Fail(error,"publish V2 pair 검사/재결박 실패");
            return (::unlinkat(p.fd.fd,partial.c_str(),0)==0&&::fsync(p.fd.fd)==0)||Fail(error,"publish partial 내구 정리 실패");
        }
        // 이 ticket의 정확한 두 이름이 같은 inode인 중단 상태만 두 번째 link를 제거한다.
        if(::unlinkat(p.fd.fd,partial.c_str(),0)!=0||::fsync(p.fd.fd)!=0)return Fail(error,"publish partial 내구 정리 실패");
    }
    const auto relative=has_b?t.final_relative:t.partial_relative;
    struct stat inspection_binding{};
    if(::fstatat(p.fd.fd,relative.filename().c_str(),&inspection_binding,AT_SYMLINK_NOFOLLOW)!=0||
       !S_ISREG(inspection_binding.st_mode)||inspection_binding.st_nlink!=1)return Fail(error,"publish 검사 binding 불가");
    const auto inspected=t.segment_v2?InspectRecordingPhysicalMedia(root,relative,
        {t.segment_v2->container,t.segment_v2->video_codecs,t.segment_v2->size_bytes,t.segment_v2->checksum_sha256,t.segment_v2->retention_class}):InspectRecordingMedia(root,relative,t.segment);
    if(inspected.state!=MediaInspectionState::Healthy)return Fail(error,"publish 검사 실패: "+inspected.detail);
    if(!p.Stable())return Fail(error,"publish parent 변경");
    struct stat current{};
    if(::fstatat(p.fd.fd,relative.filename().c_str(),&current,AT_SYMLINK_NOFOLLOW)!=0||
       !StableFile(inspection_binding,current))return Fail(error,"publish 검사 후 파일 변경");
    if(has_b)return true;
    if(::linkat(p.fd.fd,partial.c_str(),p.fd.fd,final.c_str(),0)!=0)return Fail(error,"publish noreplace 실패");
    if(::fsync(p.fd.fd)!=0||::unlinkat(p.fd.fd,partial.c_str(),0)!=0||::fsync(p.fd.fd)!=0)return Fail(error,"publish 내구성 불확실");
    return true;
}
bool PublishFinalizeReady(const std::filesystem::path& root,const FinalizeReadyTicket& t,std::string* error){
    if(t.segment_v2)return Fail(error,"V2 publish에는 catalog 검증 필요");
    return PublishValidatedReady(root,t,error);
}
static bool ClearValidatedReady(const std::filesystem::path& root,const FinalizeReadyTicket& t,std::string* error){
    FinalizeReadyTicket current;bool missing=false;struct stat ticket_binding{},marker_binding{};
    if(!Read(root,TicketPath(t),&current,&missing,error,&ticket_binding)||missing||Serialize(current)!=Serialize(t))return Fail(error,"ready cleanup ticket 변경/부재");
    Parent p;if(!p.Open(root,t.final_relative))return Fail(error,"ready cleanup parent 실패");
    const auto marker=t.final_relative.filename().string()+".cleanup-pending";
    Fd marker_fd(::openat(p.fd.fd,marker.c_str(),O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC));
    if(marker_fd.fd>=0){
        struct stat s{},leaf{};std::array<char,512> bytes{};
        const auto n=::pread(marker_fd.fd,bytes.data(),bytes.size(),0);
        const auto expected="recording-cleanup-pending-v2\npartial="+t.partial_relative.filename().string()+"\n";
        if(n<0||static_cast<std::size_t>(n)!=expected.size()||std::string(bytes.data(),n)!=expected||
           ::fstat(marker_fd.fd,&s)!=0||::fstatat(p.fd.fd,marker.c_str(),&leaf,AT_SYMLINK_NOFOLLOW)!=0||!StableFile(s,leaf))return Fail(error,"ready cleanup marker binding 변경");
        marker_binding=s;
    }else if(errno!=ENOENT)return Fail(error,"ready cleanup marker 읽기 불가");
    return Remove(p,marker,true,error,marker_fd.fd>=0?&marker_binding:nullptr)&&Remove(p,TicketPath(t).filename().string(),false,error,&ticket_binding);
}
bool ClearFinalizeReady(const std::filesystem::path& root,const FinalizeReadyTicket& t,std::string* error){
    if(t.segment_v2)return Fail(error,"V2 cleanup에는 catalog commit 확인 필요");
    return ClearValidatedReady(root,t,error);
}
bool RecoverFinalizeReadyTickets(RecordingCatalog& catalog,const std::filesystem::path& root,FinalizeRecoveryReport* report,std::string* error){
    if(report)*report={};
    const auto normalized_root=Root(root);
    if(normalized_root.empty()) {
        if(report)++report->errors;
        return Fail(error,"ready 빈 root 거부");
    }
    std::error_code ec;
    if(!std::filesystem::exists(root,ec))return !ec||Fail(error,"ready root 불가");
    if(Directory(normalized_root).fd<0) {
        if(report)++report->errors;
        return Fail(error,"ready 안전 root 열기 실패");
    }
    std::vector<std::filesystem::path> tickets;
    for(std::filesystem::recursive_directory_iterator it(root,ec),end;!ec&&it!=end;it.increment(ec)){
        if(it->path().extension()==".finalize-ready")tickets.push_back(it->path().lexically_relative(root));
    }
    if(ec)return Fail(error,"ready scan 실패");std::sort(tickets.begin(),tickets.end());
    for(const auto& path:tickets){
        FinalizeReadyTicket t;bool missing=false;bool inserted=false;struct stat ticket_binding{};
        if(!Read(root,path,&t,&missing,error,&ticket_binding)||missing||catalog.IsDeletedSegmentId(t.segment.segment_id)){
            if(report)++report->errors;return Fail(error,"ready invalid 또는 삭제 ID: 원본 보존");}
        if(t.segment_v2) {
            const auto& v=*t.segment_v2;
            // catalog 설정 root와 같은 입력 표기로 전달한다. 물리 접근은 각 helper가 안전 정규화한다.
            const auto final_path=(root/t.final_relative).string();
            if(!catalog.ValidateFinalizeRecoveryV2(v,final_path,error)||!PublishValidatedReady(root,t,error)||
               !catalog.RecoverFinalizedSegmentV2(v,final_path,&inserted,error)||!ClearValidatedReady(root,t,error)) {
                if(report)++report->errors;return false;
            }
            if(report){if(inserted)++report->recovered;else ++report->already_committed;}
            continue;
        }
        const auto known=catalog.FindSegmentById(t.segment.segment_id);
        auto identity=known.value_or(t.segment);
        identity.lifecycle=RecordingLifecycle::Finalized;
        const bool already_corrupt=known&&known->lifecycle==RecordingLifecycle::Corrupt;
        if(already_corrupt) {
            const auto stored_path=catalog.FindSegmentMediaPath(t.segment.segment_id);
            if(!stored_path||Root(*stored_path)!=Root(root)/t.final_relative) {
                if(report)++report->errors;
                return Fail(error,"ready Corrupt stored path 충돌: 원본 보존");
            }
        }
        if(known&&((known->lifecycle!=RecordingLifecycle::Finalized&&!already_corrupt)||
           SerializeRecordingSegmentV1(identity)!=SerializeRecordingSegmentV1(t.segment))){
            if(report)++report->errors;return Fail(error,"ready 기존 ID 충돌: 원본 보존");
        }
        Parent diagnostic_parent;struct stat diagnostic_status{};
        if(!diagnostic_parent.Open(root,t.final_relative)){if(report)++report->errors;return Fail(error,"ready 진단 parent 불가");}
        const bool has_diagnostic=::fstatat(diagnostic_parent.fd.fd,(TicketPath(t).filename().string()+".corrupt-info").c_str(),&diagnostic_status,AT_SYMLINK_NOFOLLOW)==0;
        if(!has_diagnostic&&errno!=ENOENT){if(report)++report->errors;return Fail(error,"ready 진단 조회 불가");}
        if(!already_corrupt&&!catalog.ValidateFinalizeRecovery(t.segment,(Root(root)/t.final_relative).string(),t.event_link,error)){
            if(report)++report->errors;return false;
        }
        const bool logical_quarantine=already_corrupt||has_diagnostic;
        if(logical_quarantine||!PublishFinalizeReady(root,t,error)){
            if(!logical_quarantine&&(!error||error->rfind("publish 검사 실패: ",0)!=0)){if(report)++report->errors;return false;}
            std::error_code exists_error;const bool final_exists=std::filesystem::exists(Root(root)/t.final_relative,exists_error);
            const auto inspected_relative=final_exists?t.final_relative:t.partial_relative;
            Parent inspection_parent;struct stat inspected_binding{};
            if(!inspection_parent.Open(root,inspected_relative)||::fstatat(inspection_parent.fd.fd,inspected_relative.filename().c_str(),&inspected_binding,AT_SYMLINK_NOFOLLOW)!=0){if(report)++report->errors;return Fail(error,"격리 전 media binding 실패");}
            const auto inspected=InspectRecordingMedia(root,inspected_relative,t.segment);
            if(!exists_error&&inspected.state==MediaInspectionState::Corrupt&&inspected.detail!="missing-media"&&Quarantine(catalog,root,t,inspected,inspected_relative,inspected_binding,ticket_binding,error)){
                if(report)++report->quarantined;continue;
            }
            if(report)++report->errors;return Fail(error,"ready 논리 격리 검사/진단 불일치: 원본 보존");
        }
        if(!catalog.RecoverFinalizedSegment(t.segment,(Root(root)/t.final_relative).string(),t.event_link,&inserted,error)||!ClearFinalizeReady(root,t,error)){
            if(report)++report->errors;return false;
        }
        if(report){if(inserted)++report->recovered;else ++report->already_committed;}
    }
    if(error)error->clear();return true;
}
}
