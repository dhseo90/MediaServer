// 파일 용도: 녹화 세대 작업 receipt의 생성·직렬화·검증 로직을 구현한다.
#include "recording/recording_generation_receipt.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <charconv>
#include <limits>
#include <set>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
namespace recording {
namespace {
constexpr std::uint64_t kComponentLimit=1024ULL*1024*1024;
constexpr const char* kEmptySha="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
std::string Hash(const std::string& bytes) {
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char digest[32];unsigned length=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&length,EVP_sha256(),nullptr)!=1||length!=32)return {};
    std::string out;const char* hex="0123456789abcdef";
    for(const auto value:digest){out+=hex[value>>4];out+=hex[value&15];}
    return out;
#else
    (void)bytes;return {};
#endif
}
std::string Marker(const std::string& store,bool generation) {
    return "{\"format\":\"media-server.managed-recording-store."+std::string(generation?"v2":"v1")+
        "\",\"storeId\":\""+store+"\","+(generation?"\"manifest\":\"recording-generation.json\"":"\"journal\":\"recording-v2-mutations.jsonl\"")+"}\n";
}
bool Fail(std::string* error,const char* message) {
    if(error)*error=message;
    return false;
}
bool Hex(const std::string& s,std::size_t n) {
    return s.size()==n&&std::all_of(s.begin(),s.end(),[](char c){
        return (c>='0'&&c<='9')||(c>='a'&&c<='f');
    });
}
bool Unsigned(const std::string& s,std::uint64_t* value) {
    if(s.empty())return false;
    const auto r=std::from_chars(s.data(),s.data()+s.size(),*value);
    return r.ec==std::errc{}&&r.ptr==s.data()+s.size()&&s==std::to_string(*value);
}
bool Number(const ingress::StrictJsonObjectDocument& d,const char* key,std::uint64_t* value) {
    const auto* m=d.Find(key);
    return m&&m->type==ingress::StrictJsonType::Number&&Unsigned(m->raw,value);
}
bool Same(const RecordingGenerationFile& a,const RecordingGenerationFile& b) {
    return a.name==b.name&&a.size==b.size&&a.sha256==b.sha256;
}
bool NameGeneration(const std::string& name,std::uint64_t* generation) {
    if(name.size()<7||name.compare(name.size()-6,6,".jsonl")!=0)return false;
    for(const std::string prefix:{"identity-","snapshot-","active-"}) {
        if(name.rfind(prefix,0)==0)
            return Unsigned(name.substr(prefix.size(),name.size()-prefix.size()-6),generation)&&*generation;
    }
    if(name.rfind("evidence-",0)!=0)return false;
    const auto separator=name.find('-',9);
    std::uint64_t slot=0;
    return separator!=std::string::npos&&separator<name.size()-6&&
        Unsigned(name.substr(9,separator-9),generation)&&*generation&&
        Unsigned(name.substr(separator+1,name.size()-separator-7),&slot);
}
std::string OwnedJson(const RecordingGenerationOwnedFile& f) {
    return "{\"name\":\""+f.file.name+"\",\"size\":"+std::to_string(f.file.size)+
        ",\"sha256\":\""+f.file.sha256+"\",\"device\":"+std::to_string(f.device)+
        ",\"inode\":"+std::to_string(f.inode)+"}";
}
bool ParseOwned(const std::string& raw,RecordingGenerationOwnedFile* out,std::string* error) {
    ingress::StrictJsonObjectDocument d;
    if(!ingress::ParseStrictJsonObjectDocument(raw,&d,error)||d.members.size()!=5)return false;
    const auto name=ingress::StrictJsonStringField(d,"name"),hash=ingress::StrictJsonStringField(d,"sha256");
    if(!name||!hash||!Number(d,"size",&out->file.size)||!Number(d,"device",&out->device)||
       !Number(d,"inode",&out->inode))return false;
    out->file.name=*name;out->file.sha256=*hash;
    return true;
}
bool ParseCreated(const std::string& raw,std::vector<RecordingGenerationOwnedFile>* out,std::string* error) {
    // 외부 strict parser가 JSON 문법·중복 키를 먼저 확인했다. 최상위 object 배열만 분리한다.
    if(raw.size()<2||raw.front()!='['||raw.back()!=']')return false;
    std::size_t start=1;int depth=0;bool quoted=false,escape=false;
    const auto append=[&](std::size_t end){
        RecordingGenerationOwnedFile f;
        if(!ParseOwned(raw.substr(start,end-start),&f,error))return false;
        out->push_back(std::move(f));return true;
    };
    for(std::size_t i=1;i+1<raw.size();++i) {
        const char c=raw[i];
        if(quoted) {
            if(escape)escape=false;
            else if(c=='\\')escape=true;
            else if(c=='"')quoted=false;
        } else if(c=='"')quoted=true;
        else if(c=='{')++depth;
        else if(c=='}')--depth;
        else if(c==','&&depth==0) {
            if(!append(i))return false;
            start=i+1;
        }
    }
    return raw.size()==2||append(raw.size()-1);
}
bool Valid(const RecordingGenerationReceipt& r,std::string* target,std::string* previous,std::string* error) {
    if(r.operation!=RecordingGenerationOperation::Cutover&&r.operation!=RecordingGenerationOperation::Checkpoint)
        return Fail(error,"generation receipt operation invalid");
    if(r.phase!=RecordingGenerationPhase::Prepared&&r.phase!=RecordingGenerationPhase::PublishIntent)
        return Fail(error,"generation receipt phase invalid");
    constexpr const char* prefix=".recording-generation-prepare-";
    if(r.stage_name.rfind(prefix,0)!=0||!Hex(r.stage_name.substr(std::char_traits<char>::length(prefix)),32)||
       r.root_device!=r.stage_device||r.root_inode==r.stage_inode)
        return Fail(error,"generation receipt root/stage invalid");
    if(r.marker.file.name!=".recording-store-format"||!r.marker.file.size||r.marker.file.size>512||
       !Hex(r.marker.file.sha256,64)||!Hex(r.source.file.sha256,64)||
       r.marker.device!=r.root_device||r.source.device!=r.root_device||
       r.marker.inode==r.source.inode||r.marker.inode==r.root_inode||r.marker.inode==r.stage_inode||
       r.source.inode==r.root_inode||r.source.inode==r.stage_inode)
        return Fail(error,"generation receipt original binding invalid");
    if(!SerializeRecordingGenerationManifest(r.target,target,error))return false;
    const auto marker=Marker(r.target.store_id,r.operation==RecordingGenerationOperation::Checkpoint);
    if(r.marker.file.size!=marker.size()||r.marker.file.sha256!=Hash(marker))
        return Fail(error,"generation receipt marker/store bytes mismatch");
    if(r.target.active.size||r.target.active.sha256!=kEmptySha||!r.target.snapshot.size)
        return Fail(error,"generation receipt target components invalid");
    if(r.operation==RecordingGenerationOperation::Cutover) {
        if(r.predecessor||r.predecessor_file||r.predecessor_snapshot||!r.replacement_marker||r.source.file.name!="recording-v2-mutations.jsonl")
            return Fail(error,"generation cutover predecessor/source invalid");
        const auto replacement=Marker(r.target.store_id,true);
        if(r.replacement_marker->file.name!=".recording-marker-v2"||
           r.replacement_marker->file.size!=replacement.size()||r.replacement_marker->file.sha256!=Hash(replacement))
            return Fail(error,"generation cutover replacement marker invalid");
        *previous="null";
    } else {
        if(r.replacement_marker||!r.predecessor_file||!r.predecessor||!SerializeRecordingGenerationManifest(*r.predecessor,previous,error))
            return Fail(error,"generation checkpoint predecessor invalid");
        if(r.predecessor_file->file.name!="recording-generation.json"||
           r.predecessor_file->file.size!=previous->size()||r.predecessor_file->file.sha256!=Hash(*previous))
            return Fail(error,"generation checkpoint predecessor file mismatch");
        const auto& p=*r.predecessor;
        if(r.predecessor_snapshot&&!Same(r.predecessor_snapshot->file,p.snapshot))
            return Fail(error,"generation checkpoint predecessor snapshot mismatch");
        if(p.store_id!=r.target.store_id||p.generation==std::numeric_limits<std::uint64_t>::max()||
           r.target.generation!=p.generation+1||r.target.cut_ordinal<p.cut_ordinal||
           r.source.file.name!=p.active.name||r.source.file.size<p.active.size||
           (r.source.file.size==p.active.size&&r.source.file.sha256!=p.active.sha256))
            return Fail(error,"generation checkpoint source/target mismatch");
        previous->pop_back();
    }
    target->pop_back();
    std::set<std::uint64_t> inodes{r.root_inode,r.stage_inode,r.marker.inode,r.source.inode};
    for(const auto* optional:{&r.replacement_marker,&r.predecessor_file,&r.predecessor_snapshot})
        if(*optional&&((*optional)->device!=r.root_device||!inodes.insert((*optional)->inode).second))
            return Fail(error,"generation receipt metadata ownership invalid");
    std::string last;
    bool snapshot=false,active=false,identity=false;
    std::size_t evidence=0;
    for(const auto& f:r.created) {
        std::uint64_t generation=0;
        if(f.device!=r.root_device||!inodes.insert(f.inode).second||f.file.name<=last||
           !Hex(f.file.sha256,64)||f.file.size>kComponentLimit||!NameGeneration(f.file.name,&generation)||
           generation>r.target.generation||
           (r.operation==RecordingGenerationOperation::Checkpoint&&generation!=r.target.generation))
            return Fail(error,"generation receipt created ownership/name invalid");
        last=f.file.name;
        if(f.file.name.rfind("active-",0)==0) {
            if(!Same(f.file,r.target.active))return Fail(error,"generation receipt foreign active");
            active=true;
        } else if(f.file.name.rfind("snapshot-",0)==0) {
            if(!Same(f.file,r.target.snapshot))return Fail(error,"generation receipt foreign snapshot");
            snapshot=true;
        } else if(f.file.name.rfind("identity-",0)==0) {
            if(!f.file.size)return Fail(error,"generation receipt empty identity");
            if(generation==r.target.generation)identity=true;
        } else if(generation==r.target.generation) {
            const auto it=std::find_if(r.target.evidence.begin(),r.target.evidence.end(),[&](const auto& e){return Same(e,f.file);});
            if(it==r.target.evidence.end())return Fail(error,"generation receipt unlisted current evidence");
            ++evidence;
        }
    }
    if(!snapshot||!active||!identity||evidence!=r.target.evidence.size())
        return Fail(error,"generation receipt required created component absent");
    return true;
}
} // namespace
bool SerializeRecordingGenerationReceipt(const RecordingGenerationReceipt& r,std::string* out,std::string* error) {
    if(!out)return Fail(error,"generation receipt output absent");
    std::string target,previous;
    if(!Valid(r,&target,&previous,error))return false;
    std::string bytes="{\"schema\":\"media-server.recording-generation-transaction.v1\",\"operation\":\""+
        std::string(r.operation==RecordingGenerationOperation::Cutover?"cutover":"checkpoint")+
        "\",\"phase\":\""+(r.phase==RecordingGenerationPhase::Prepared?"prepared":"publish-intent")+
        "\",\"rootDevice\":"+std::to_string(r.root_device)+",\"rootInode\":"+std::to_string(r.root_inode)+
        ",\"stageDevice\":"+std::to_string(r.stage_device)+",\"stageInode\":"+std::to_string(r.stage_inode)+
        ",\"stageName\":\""+r.stage_name+"\",\"marker\":"+OwnedJson(r.marker)+",\"source\":"+OwnedJson(r.source)+
        ",\"replacementMarker\":"+(r.replacement_marker?OwnedJson(*r.replacement_marker):"null")+
        ",\"predecessorFile\":"+(r.predecessor_file?OwnedJson(*r.predecessor_file):"null")+
        (r.predecessor_snapshot?",\"predecessorSnapshot\":"+OwnedJson(*r.predecessor_snapshot):"")+
        ",\"predecessor\":"+previous+",\"target\":"+target+",\"created\":[";
    for(std::size_t i=0;i<r.created.size();++i) {
        if(i)bytes+=',';
        bytes+=OwnedJson(r.created[i]);
    }
    bytes+="]}\n";
    *out=std::move(bytes);
    if(error)error->clear();
    return true;
}
bool ParseRecordingGenerationReceipt(const std::string& bytes,std::uint64_t admission,
    RecordingGenerationReceipt* out,std::string* error) {
    if(!out||!admission||bytes.size()>admission)return Fail(error,"generation receipt admission/output invalid");
    ingress::StrictJsonObjectDocument d;RecordingGenerationReceipt r;
    if(!ingress::ParseStrictJsonObjectDocument(bytes,&d,error)||(d.members.size()!=15&&d.members.size()!=16)||
       ingress::StrictJsonStringField(d,"schema")!="media-server.recording-generation-transaction.v1")
        return Fail(error,"generation receipt schema invalid");
    const auto operation=ingress::StrictJsonStringField(d,"operation"),phase=ingress::StrictJsonStringField(d,"phase");
    if(operation=="cutover")r.operation=RecordingGenerationOperation::Cutover;
    else if(operation=="checkpoint")r.operation=RecordingGenerationOperation::Checkpoint;
    else return Fail(error,"generation receipt operation invalid");
    if(phase=="prepared")r.phase=RecordingGenerationPhase::Prepared;
    else if(phase=="publish-intent")r.phase=RecordingGenerationPhase::PublishIntent;
    else return Fail(error,"generation receipt phase invalid");
    const auto stage=ingress::StrictJsonStringField(d,"stageName"),marker=ingress::StrictJsonObjectField(d,"marker"),
        source=ingress::StrictJsonObjectField(d,"source"),target=ingress::StrictJsonObjectField(d,"target");
    const auto* created=d.Find("created");const auto* previous=d.Find("predecessor");
    if(!stage||!marker||!source||!target||!created||created->type!=ingress::StrictJsonType::Array||!previous||
       !Number(d,"rootDevice",&r.root_device)||!Number(d,"rootInode",&r.root_inode)||
       !Number(d,"stageDevice",&r.stage_device)||!Number(d,"stageInode",&r.stage_inode)||
       !ParseOwned(*marker,&r.marker,error)||!ParseOwned(*source,&r.source,error)||
       !ParseRecordingGenerationManifest(*target+"\n",&r.target,error)||!ParseCreated(created->raw,&r.created,error))
        return Fail(error,"generation receipt fields invalid");
    if(previous->type!=ingress::StrictJsonType::Null) {
        RecordingGenerationManifest p;
        if(previous->type!=ingress::StrictJsonType::Object||!ParseRecordingGenerationManifest(previous->raw+"\n",&p,error))
            return Fail(error,"generation receipt predecessor invalid");
        r.predecessor=std::move(p);
    }
    for(const auto& pair:{std::make_pair("replacementMarker",&r.replacement_marker),std::make_pair("predecessorFile",&r.predecessor_file)}) {
        const auto* m=d.Find(pair.first);
        if(!m)return Fail(error,"generation receipt metadata descriptor absent");
        if(m->type!=ingress::StrictJsonType::Null) {
            RecordingGenerationOwnedFile file;
            if(m->type!=ingress::StrictJsonType::Object||!ParseOwned(m->raw,&file,error))
                return Fail(error,"generation receipt metadata descriptor invalid");
            *pair.second=std::move(file);
        }
    }
    if(const auto* m=d.Find("predecessorSnapshot")) {
        RecordingGenerationOwnedFile file;
        if(m->type!=ingress::StrictJsonType::Object||!ParseOwned(m->raw,&file,error))
            return Fail(error,"generation receipt predecessor snapshot invalid");
        r.predecessor_snapshot=std::move(file);
    }
    r.stage_name=*stage;
    std::string canonical;
    if(!SerializeRecordingGenerationReceipt(r,&canonical,error)||canonical!=bytes)
        return Fail(error,"generation receipt noncanonical/invalid");
    *out=std::move(r);
    if(error)error->clear();
    return true;
}
}
