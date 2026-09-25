#include "recording/recording_generation_receipt.h"
#include <algorithm>
#include <functional>
#include <iostream>
#include <limits>
using namespace recording;
namespace {
constexpr const char* emptySha="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
int passed=0,failed=0;
void Check(bool ok,const char* id,const std::string& title) {
    std::cout<<id<<' '<<(ok?"PASS":"FAIL")<<' '<<title<<'\n';ok?++passed:++failed;
}
RecordingGenerationReceipt Normal() {
    RecordingGenerationReceipt r;
    r.root_device=r.stage_device=1;r.root_inode=10;r.stage_inode=11;
    r.stage_name=".recording-generation-prepare-0123456789abcdef0123456789abcdef";
    r.marker={{".recording-store-format",83,std::string(64,'a')},1,12};
    r.source={{"recording-v2-mutations.jsonl",0,std::string(64,'b')},1,13};
    r.target.store_id="store";r.target.generation=1;
    r.target.snapshot={"snapshot-1.jsonl",100,std::string(64,'c')};
    r.target.active={"active-1.jsonl",0,emptySha};
    r.created={{r.target.active,1,14},{{"identity-1.jsonl",100,std::string(64,'e')},1,15},{r.target.snapshot,1,16}};
    return r;
}
#if MEDIA_SERVER_USE_OPENSSL
std::string Literal() {
    return "{\"schema\":\"media-server.recording-generation-transaction.v1\",\"operation\":\"cutover\",\"phase\":\"prepared\","
        "\"rootDevice\":1,\"rootInode\":10,\"stageDevice\":1,\"stageInode\":11,"
        "\"stageName\":\".recording-generation-prepare-0123456789abcdef0123456789abcdef\","
        "\"marker\":{\"name\":\".recording-store-format\",\"size\":83,\"sha256\":\""+std::string(64,'a')+"\",\"device\":1,\"inode\":12},"
        "\"source\":{\"name\":\"recording-v2-mutations.jsonl\",\"size\":0,\"sha256\":\""+std::string(64,'b')+"\",\"device\":1,\"inode\":13},"
        "\"predecessor\":null,\"target\":{\"schema\":\"media-server.recording-generation.v1\",\"storeId\":\"store\",\"generation\":1,\"cutOrdinal\":0,"
        "\"snapshot\":{\"name\":\"snapshot-1.jsonl\",\"size\":100,\"sha256\":\""+std::string(64,'c')+"\"},"
        "\"active\":{\"name\":\"active-1.jsonl\",\"size\":0,\"sha256\":\""+emptySha+"\"},\"evidence\":[]},"
        "\"created\":[{\"name\":\"active-1.jsonl\",\"size\":0,\"sha256\":\""+emptySha+"\",\"device\":1,\"inode\":14},"
        "{\"name\":\"identity-1.jsonl\",\"size\":100,\"sha256\":\""+std::string(64,'e')+"\",\"device\":1,\"inode\":15},"
        "{\"name\":\"snapshot-1.jsonl\",\"size\":100,\"sha256\":\""+std::string(64,'c')+"\",\"device\":1,\"inode\":16}]}\n";
}
std::string Replace(std::string bytes,const std::string& from,const std::string& to) {
    const auto pos=bytes.find(from);
    if(pos==std::string::npos)throw std::runtime_error("fixture replacement absent");
    bytes.replace(pos,from.size(),to);return bytes;
}
bool Roundtrip(const RecordingGenerationReceipt& r) {
    std::string bytes,again,error;RecordingGenerationReceipt out;
    return SerializeRecordingGenerationReceipt(r,&bytes,&error)&&
        ParseRecordingGenerationReceipt(bytes,bytes.size(),&out,&error)&&
        SerializeRecordingGenerationReceipt(out,&again,&error)&&bytes==again&&
        out.operation==r.operation&&out.phase==r.phase&&out.target.generation==r.target.generation&&
        out.target.cut_ordinal==r.target.cut_ordinal&&out.target.store_id==r.target.store_id&&
        out.source.file.size==r.source.file.size&&out.predecessor.has_value()==r.predecessor.has_value()&&
        (!r.predecessor||out.predecessor->generation==r.predecessor->generation)&&
        out.created.size()==r.created.size();
}
void RejectValue(const char* id,const char* title,const std::function<void(RecordingGenerationReceipt&)>& change,
    RecordingGenerationReceipt r=Normal()) {
    change(r);std::string bytes="unchanged",error;
    Check(!SerializeRecordingGenerationReceipt(r,&bytes,&error)&&bytes=="unchanged"&&!error.empty(),id,title);
}
void RejectBytes(const std::string& bytes,const char* title) {
    auto out=Normal();out.stage_name="unchanged";std::string error;
    Check(!ParseRecordingGenerationReceipt(bytes,bytes.size()+1,&out,&error)&&out.stage_name=="unchanged"&&!error.empty(),"B04-R02",title);
}
#endif
}
int main() {
    std::string bytes,error;auto r=Normal();
#if !MEDIA_SERVER_USE_OPENSSL
    bytes="unchanged";
    Check(!SerializeRecordingGenerationReceipt(r,&bytes,&error)&&bytes=="unchanged"&&!error.empty(),"B04-R06","crypto-off unsupported serialization");
    r.stage_name="unchanged";
    Check(!ParseRecordingGenerationReceipt("{}\n",3,&r,&error)&&r.stage_name=="unchanged","B04-R06","crypto-off parse failclosed");
#else
    Check(SerializeRecordingGenerationReceipt(r,&bytes,&error)&&bytes==Literal(),"B04-R01","independent canonical literal");
    Check(Roundtrip(r),"B04-R01","cutover prepared roundtrip");
    r.phase=RecordingGenerationPhase::PublishIntent;
    Check(Roundtrip(r),"B04-R01","cutover publish intent roundtrip");
    Check(SerializeRecordingGenerationReceipt(r,&bytes,&error)&&bytes==Replace(Literal(),"\"phase\":\"prepared\"","\"phase\":\"publish-intent\""),"B04-R01","independent publish phase literal");
    r=Normal();r.operation=RecordingGenerationOperation::Checkpoint;r.predecessor=r.target;
    r.source.file={"active-1.jsonl",200,std::string(64,'f')};r.target.generation=2;r.target.cut_ordinal=4;
    r.target.snapshot.name="snapshot-2.jsonl";r.target.active.name="active-2.jsonl";
    r.created[0].file=r.target.active;r.created[1].file.name="identity-2.jsonl";r.created[2].file=r.target.snapshot;
    const auto checkpoint=r;
    Check(Roundtrip(r),"B04-R01","checkpoint prepared active tail");
    r.phase=RecordingGenerationPhase::PublishIntent;
    Check(Roundtrip(r),"B04-R01","checkpoint publish intent");
    r=Normal();r.target.evidence={{"evidence-1-0.jsonl",20,std::string(64,'f')}};
    r.created.insert(r.created.begin()+1,{r.target.evidence[0],1,17});
    Check(Roundtrip(r),"B04-R01","required evidence descriptor");
    const auto literal=Literal();
    RejectBytes("{","malformed");RejectBytes(literal.substr(0,literal.size()-2),"truncated");
    RejectBytes(Replace(literal,"\"operation\":\"cutover\"","\"operation\":\"cutover\",\"operation\":\"cutover\""),"duplicate key");
    RejectBytes(Replace(literal,"\"rootDevice\":1","\"extra\":1,\"rootDevice\":1"),"unknown key");
    RejectBytes(Replace(literal,"transaction.v1","transaction.v2"),"unknown schema");
    RejectBytes(Replace(literal,"\"cutover\"","\"other\""),"unknown operation");
    RejectBytes(Replace(literal,"\"prepared\"","\"done\""),"unknown phase");
    for(const auto n:{"-1","1.0","1e0","01","18446744073709551616","\"1\""})
        RejectBytes(Replace(literal,"\"rootDevice\":1",std::string("\"rootDevice\":")+n),n);
    RejectBytes(" "+literal,"noncanonical whitespace");
    RejectBytes(literal.substr(0,literal.size()-1),"missing final LF");
    RejectBytes(Replace(literal,"\"marker\":{","\"marker\":{\"extra\":1,"),"nested unknown");
    RejectBytes(Replace(literal,"\"created\":[{","\"created\":[null,{"),"nonobject list item");
    RejectBytes(Replace(literal,"\"predecessor\":null","\"predecessor\":false"),"wrong predecessor type");
    RejectValue("B04-R03","cutover predecessor",[](auto& v){v.predecessor=v.target;});
    RejectValue("B04-R03","cutover source",[](auto& v){v.source.file.name="active-1.jsonl";});
    RejectValue("B04-R03","wrong marker",[](auto& v){v.marker.file.name="other";});
    RejectValue("B04-R03","marker limit",[](auto& v){v.marker.file.size=513;});
    RejectValue("B04-R03","cross-device stage",[](auto& v){v.stage_device=2;});
    RejectValue("B04-R03","stage aliases root",[](auto& v){v.stage_inode=v.root_inode;});
    RejectValue("B04-R03","stage escape",[](auto& v){v.stage_name="../stage";});
    RejectValue("B04-R03","source aliases marker",[](auto& v){v.source.inode=v.marker.inode;});
    RejectValue("B04-R03","source bad hash",[](auto& v){v.source.file.sha256="bad";});
    RejectValue("B04-R03","predecessor absent",[](auto& v){v.predecessor.reset();},checkpoint);
    RejectValue("B04-R03","store mismatch",[](auto& v){v.predecessor->store_id="foreign";},checkpoint);
    RejectValue("B04-R03","generation skip",[](auto& v){v.predecessor->generation=2;v.predecessor->active.name="active-2.jsonl";v.predecessor->snapshot.name="snapshot-2.jsonl";},checkpoint);
    RejectValue("B04-R03","cut backwards",[](auto& v){v.predecessor->cut_ordinal=5;},checkpoint);
    RejectValue("B04-R03","source name mismatch",[](auto& v){v.source.file.name="active-2.jsonl";},checkpoint);
    RejectValue("B04-R03","source smaller than prefix",[](auto& v){v.predecessor->active.size=201;},checkpoint);
    RejectValue("B04-R03","same-size source wrong hash",[](auto& v){v.predecessor->active.size=200;},checkpoint);
    RejectValue("B04-R04","created duplicate",[](auto& v){v.created.push_back(v.created.back());});
    RejectValue("B04-R04","created inode alias",[](auto& v){v.created[1].inode=v.created[0].inode;});
    RejectValue("B04-R04","created source alias",[](auto& v){v.created[1].inode=v.source.inode;});
    RejectValue("B04-R04","created cross-device",[](auto& v){v.created[1].device=2;});
    RejectValue("B04-R04","created escape",[](auto& v){v.created[1].file.name="../identity-1.jsonl";});
    RejectValue("B04-R04","future generation",[](auto& v){v.created[1].file.name="identity-2.jsonl";});
    RejectValue("B04-R04","unsorted",[](auto& v){std::swap(v.created[0],v.created[1]);});
    RejectValue("B04-R04","component cap",[](auto& v){v.created[1].file.size=(1ULL<<30)+1;});
    RejectValue("B04-R04","missing identity",[](auto& v){v.created.erase(v.created.begin()+1);});
    RejectValue("B04-R04","empty identity",[](auto& v){v.created[1].file.size=0;});
    RejectValue("B04-R04","snapshot mismatch",[](auto& v){v.created[2].file.size++;});
    RejectValue("B04-R04","missing snapshot",[](auto& v){v.created.pop_back();});
    RejectValue("B04-R04","missing active",[](auto& v){v.created.erase(v.created.begin());});
    RejectValue("B04-R04","active nonempty",[](auto& v){v.target.active.size=1;v.created[0].file=v.target.active;});
    RejectValue("B04-R04","active wrong empty hash",[](auto& v){v.target.active.sha256=std::string(64,'a');v.created[0].file=v.target.active;});
    RejectValue("B04-R04","old created checkpoint",[](auto& v){v.created[1].file.name="identity-1.jsonl";},checkpoint);
    RejectValue("B04-R04","missing target evidence",[](auto& v){v.target.evidence={{"evidence-1-0.jsonl",20,std::string(64,'f')}};});
    RejectValue("B04-R04","unlisted current evidence",[](auto& v){v.created.insert(v.created.begin()+1,{{"evidence-1-0.jsonl",20,std::string(64,'f')},1,17});});
    RejectValue("B04-R04","noncanonical file generation",[](auto& v){v.created[1].file.name="identity-01.jsonl";});
    RejectValue("B04-R04","old source in created",[](auto& v){v.created[1].file.name="recording-v2-mutations.jsonl";});
    RejectValue("B04-R04","foreign snapshot",[](auto& v){v.created[2].file.name="snapshot-0.jsonl";});
    r=Normal();r.target.generation=65;r.target.snapshot.name="snapshot-65.jsonl";r.target.active.name="active-65.jsonl";
    r.created={{r.target.active,1,100},{r.target.snapshot,1,101}};
    for(std::uint64_t i=1;i<=65;++i)r.created.push_back({{"identity-"+std::to_string(i)+".jsonl",100,std::string(64,'e')},1,101+i});
    std::sort(r.created.begin(),r.created.end(),[](const auto& a,const auto& b){return a.file.name<b.file.name;});
    Check(r.created.size()>64&&Roundtrip(r),"B04-R05","67 created files no lifetime 64 limit");
    r=Normal();r.source.file.size=std::numeric_limits<std::uint64_t>::max();
    Check(Roundtrip(r),"B04-R05","large source not component cap");
    r.target.cut_ordinal=std::numeric_limits<std::uint64_t>::max();
    Check(Roundtrip(r),"B04-R05","uint64 cut maximum");
    RejectValue("B04-R05","predecessor overflow",[](auto& v){auto& p=*v.predecessor;p.generation=std::numeric_limits<std::uint64_t>::max();p.snapshot.name="snapshot-18446744073709551615.jsonl";p.active.name="active-18446744073709551615.jsonl";},checkpoint);
    r=Normal();r.stage_name="unchanged";
    Check(!ParseRecordingGenerationReceipt(literal,literal.size()-1,&r,&error)&&r.stage_name=="unchanged","B04-R06","caller admission");
    Check(!ParseRecordingGenerationReceipt(literal,0,&r,&error),"B04-R06","zero admission refused");
    Check(!ParseRecordingGenerationReceipt(literal,literal.size(),nullptr,&error),"B04-R06","null parse output");
    Check(!SerializeRecordingGenerationReceipt(Normal(),nullptr,&error),"B04-R06","null serialize output");
    RejectValue("B04-R06","operation enum",[](auto& v){v.operation=static_cast<RecordingGenerationOperation>(99);});
    RejectValue("B04-R06","phase enum",[](auto& v){v.phase=static_cast<RecordingGenerationPhase>(99);});
#endif
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
