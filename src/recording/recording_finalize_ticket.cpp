// 파일 용도: finalize ticket의 바이트·경로·inode 검증과 partial 보호를 저장 계층에서 구현한다.
#include "recording/recording_finalize_ticket_io.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <cerrno>
#if MEDIA_SERVER_USE_GSTREAMER
#include <glib.h>
#endif
namespace recording::detail::finalize_ticket {
bool Fail(std::string* error,const std::string& text){if(error)*error=text;return false;}
std::string Digest(const std::string& value){
#if MEDIA_SERVER_USE_GSTREAMER
    gchar* raw=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(value.data()),value.size());
    const std::string digest=raw?raw:"";g_free(raw);return digest;
#else
    (void)value;return {};
#endif
}
bool Same(const struct stat& a,const struct stat& b){return a.st_dev==b.st_dev&&a.st_ino==b.st_ino;}
bool StableFile(const struct stat& a,const struct stat& b,nlink_t links){
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
std::filesystem::path TicketPath(const FinalizeReadyTicket& t){return t.final_relative.string()+".finalize-ready";}
bool Validate(const FinalizeReadyTicket& t,std::string* error){
    const bool v2=t.segment_v2.has_value();
    if(t.source_binding&&(!v2||!ValidateRecordingSourceBindingForSegment(*t.source_binding,*t.segment_v2,error)))
        return Fail(error,"ready 원본 결박 불일치");
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
std::string Serialize(const FinalizeReadyTicket& t){return (t.segment_v2?std::string("{\"version\":")+(t.source_binding?"3":"2")+",\"segment\":"+SerializeRecordingSegmentV2(*t.segment_v2):"{\"version\":1,\"segment\":"+SerializeRecordingSegmentV1(t.segment))+
    ",\"partial\":\""+t.partial_relative.generic_string()+"\",\"final\":\""+t.final_relative.generic_string()+"\",\"eventLink\":"+
    (t.event_link?SerializeEventRecordingLinkV1(*t.event_link):"null")+
    (t.source_binding?",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(*t.source_binding):"")+"}";}
bool Parse(const std::string& text,FinalizeReadyTicket* t,std::string* error){
    ingress::StrictJsonObjectDocument d;if(!ingress::ParseStrictJsonObjectDocument(text,&d,error))return Fail(error,"ready strict object 실패");
    const auto* version=d.Find("version");const auto segment=ingress::StrictJsonObjectField(d,"segment");
    const auto partial=ingress::StrictJsonStringField(d,"partial"),final=ingress::StrictJsonStringField(d,"final");
    if(!version||version->type!=ingress::StrictJsonType::Number||(version->raw!="1"&&version->raw!="2"&&version->raw!="3")||!segment||!partial||!final||!d.Find("eventLink"))return Fail(error,"ready version/필수필드 실패");
    const bool bound=version->raw=="3";
    // 증거 바인딩 2MiB 이하 + 세그먼트 1MiB 이하 + 제한된 경로·필드 부가 용량.
    if(d.members.size()!=(bound?6U:5U)||text.size()>(bound?3U*1024*1024+16U*1024:1024U*1024))
        return Fail(error,"ready version별 field/크기 오류");
    *t=FinalizeReadyTicket{};
    if(bound) {
        const auto json=ingress::StrictJsonObjectField(d,"sourceBinding");RecordingSourceBindingV1 binding;
        if(!json||!ParseRecordingSourceBindingV1(*json,&binding,error))return Fail(error,"ready sourceBinding 오류");
        t->source_binding=std::move(binding);
        if(!t->source_binding->file_evidence&&text.size()>2U*1024*1024)return Fail(error,"legacy ready envelope 크기 오류");
    }
    if(version->raw!="1") {RecordingSegmentV2 v;if(!ParseRecordingSegmentV2(*segment,&v,error))return false;t->segment_v2=v;}
    else if(!ParseRecordingSegmentV1(*segment,&t->segment,error))return false;
    t->partial_relative=*partial;t->final_relative=*final;
    if(!ingress::StrictJsonFieldIsNull(d,"eventLink")){const auto event=ingress::StrictJsonObjectField(d,"eventLink");EventRecordingLinkV1 l;
        if(!event||!ParseEventRecordingLinkV1(*event,&l,error))return Fail(error,"ready event parse 실패");t->event_link=l;}
    return Validate(*t,error);
}
bool Read(const std::filesystem::path& root,const std::filesystem::path& relative,FinalizeReadyTicket* t,bool* missing,std::string* error,struct stat* binding){
    *missing=false;Parent p;if(!p.Open(root,relative))return Fail(error,"ready parent 열기 실패");
    Fd fd(::openat(p.fd.fd,relative.filename().c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));
    if(fd.fd<0){if(errno==ENOENT){*missing=true;return true;}return Fail(error,"ready 읽기 불가");}
    struct stat before{},after{},leaf{};
    if(::fstat(fd.fd,&before)!=0||!S_ISREG(before.st_mode)||before.st_nlink!=1||before.st_size<=0||before.st_size>3*1024*1024+16*1024)return Fail(error,"ready 파일 binding/크기 거부");
    std::string text(static_cast<std::size_t>(before.st_size),'\0');std::size_t done=0;
    while(done<text.size()){const auto n=::pread(fd.fd,text.data()+done,text.size()-done,done);if(n<0&&errno==EINTR)continue;if(n<=0)return Fail(error,"ready read 실패");done+=n;}
    if(::fstat(fd.fd,&after)!=0||::fstatat(p.fd.fd,relative.filename().c_str(),&leaf,AT_SYMLINK_NOFOLLOW)!=0||
       !StableFile(before,after)||!StableFile(before,leaf)||!p.Stable())return Fail(error,"ready 파일 변경");
    if(!Parse(text,t,error)||TicketPath(*t)!=relative)return Fail(error,"ready ticket 경로 불일치");
    if(binding)*binding=after;
    return true;
}
} // namespace recording::detail::finalize_ticket
namespace recording {
using namespace detail::finalize_ticket;
bool WriteFinalizeReadyTicket(const std::filesystem::path& root,const FinalizeReadyTicket& ticket,std::string* error){
    if(!Validate(ticket,error))return false;const auto text=Serialize(ticket);
    const std::size_t envelope_limit=ticket.source_binding?(ticket.source_binding->file_evidence?3U*1024*1024+16U*1024:2U*1024*1024):1024U*1024;
    if(text.size()>envelope_limit)return Fail(error,"ready envelope 크기 거부");
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
} // namespace recording
