// B active 후보의 물리 bytes/locator 검사다. 과거 archive/domain/제품 Open 검증이 아니다.
#include "recording/recording_generation_active.h"
#include <array>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <openssl/evp.h>
#include <unistd.h>
#endif
using namespace recording;
namespace {
std::array<bool,4> good{{true,true,true,true}};
void Check(unsigned group,bool condition,const char* label) {
    if(!condition){good[group-1]=false;std::cerr<<"B02-A0"<<group<<" assertion: "<<label<<'\n';}
}
void Write(const std::filesystem::path& path,const std::string& bytes) {
    std::ofstream file(path,std::ios::binary|std::ios::trunc);file<<bytes;
    if(!file)throw std::runtime_error("fixture write failed");
}
std::string Read(const std::filesystem::path& path) {
    std::ifstream file(path,std::ios::binary);
    if(!file)throw std::runtime_error("fixture read failed");
    return {std::istreambuf_iterator<char>(file),{}};
}
RecordingGenerationActiveReadResult Sentinel() {
    RecordingGenerationActiveReadResult result;result.manifest.store_id="unchanged";
    result.active_file={"sentinel",9,"untouched"};RecordingGenerationActiveRow row;
    row.mutation.mutation_id="original";row.global_ordinal=11;row.offset=12;row.length=13;row.raw_sha256="original-hash";
    result.rows.push_back(row);return result;
}
bool Unchanged(const RecordingGenerationActiveReadResult& value) {
    return value.manifest.store_id=="unchanged"&&value.active_file.name=="sentinel"&&
        value.active_file.size==9&&value.active_file.sha256=="untouched"&&value.rows.size()==1&&
        value.rows[0].mutation.mutation_id=="original"&&value.rows[0].global_ordinal==11&&
        value.rows[0].offset==12&&value.rows[0].length==13&&value.rows[0].raw_sha256=="original-hash";
}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
std::string Hash(const std::string& bytes) {
    unsigned char digest[32];unsigned length=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&length,EVP_sha256(),nullptr)!=1||length!=32)
        throw std::runtime_error("fixture hash failed");
    const char* hex="0123456789abcdef";std::string result;
    for(const auto c:digest){result+=hex[c>>4];result+=hex[c&15];}return result;
}
std::string Line(const std::string& id) {
    RecordingMutationV1 mutation;mutation.mutation_id=id;mutation.entity_id="event";
    mutation.mutation_type=RecordingMutationType::EventLinkCreated;mutation.occurred_at_ms=42;
    return SerializeRecordingMutationV1(mutation)+"\n";
}
void Manifest(const std::filesystem::path& root,const std::string& active,std::size_t prefix,std::uint64_t cut=10) {
    std::filesystem::create_directories(root);
    RecordingGenerationManifest manifest;manifest.store_id="store";manifest.generation=1;manifest.cut_ordinal=cut;
    manifest.snapshot={"snapshot-1.jsonl",3,Hash("{}\n")};
    manifest.active={"active-1.jsonl",prefix,Hash(active.substr(0,prefix))};
    // snapshot domain은 검증 범위 밖이다. 과거 evidence는 의도적으로 만들지 않는다.
    manifest.evidence={{"evidence-1-0.jsonl",7,Hash("history")}};
    std::string bytes,error;
    if(!SerializeRecordingGenerationManifest(manifest,&bytes,&error))throw std::runtime_error("fixture manifest failed");
    Write(root/"snapshot-1.jsonl","{}\n");Write(root/"active-1.jsonl",active);Write(root/"recording-generation.json",bytes);
}
std::filesystem::path hook_root;
std::string hook_mode;
bool hook_called=false;
void ChangeBinding() {
    hook_called=true;
    const auto active=hook_root/"active-1.jsonl";
    if(hook_mode=="root") {
        std::filesystem::rename(hook_root,hook_root.string()+"-moved");std::filesystem::create_directory(hook_root);
    } else if(hook_mode=="size") {
        std::ofstream file(active,std::ios::app);file<<'x';
    } else if(hook_mode=="same-size") {
        auto bytes=Read(active);bytes[0]=' ';Write(active,bytes);
    } else {
        const auto path=hook_mode=="manifest"?hook_root/"recording-generation.json":active;
        const auto bytes=Read(path);std::filesystem::rename(path,path.string()+"-moved");Write(path,bytes);
    }
}
#endif
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path root(argv[1]);std::filesystem::create_directories(root);
        std::string error;
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        const auto one=Line("one"),two=Line("two"),bytes=one+two;
        const auto valid=root/"valid";Manifest(valid,bytes,one.size());
        const auto manifest_before=Read(valid/"recording-generation.json");
        RecordingGenerationActiveReadResult result;
        Check(1,ReadRecordingGenerationActive(valid,bytes.size(),&result,&error),"prefix and tail read");
        Check(1,result.rows.size()==2&&result.active_file.size==bytes.size()&&result.active_file.sha256==Hash(bytes),"whole active digest");
        if(result.rows.size()==2) {
            Check(1,result.rows[0].global_ordinal==10&&result.rows[1].global_ordinal==11&&
                result.rows[0].offset==0&&result.rows[0].length==one.size()&&result.rows[1].offset==one.size()&&
                result.rows[1].length==two.size()&&result.rows[0].raw_sha256==Hash(one)&&result.rows[1].raw_sha256==Hash(two),"exact ordinal raw locator");
            Check(1,SerializeRecordingMutationV1(result.rows[0].mutation)+"\n"==one&&
                SerializeRecordingMutationV1(result.rows[1].mutation)+"\n"==two,"canonical original envelopes");
        }
        Check(1,Read(valid/"active-1.jsonl")==bytes&&Read(valid/"recording-generation.json")==manifest_before,"original files unchanged");
        const auto empty=root/"empty";Manifest(empty,"",0);
        Check(1,ReadRecordingGenerationActive(empty,0,&result,&error)&&result.rows.empty(),"empty active admission zero");
        const auto retry=root/"retry";Manifest(retry,one+one,0);
        Check(1,ReadRecordingGenerationActive(retry,2*one.size(),&result,&error)&&result.rows.size()==2,"physical retry multiplicity retained");
        const auto reject=[&](unsigned group,const std::filesystem::path& path,std::uint64_t limit,const char* label) {
            auto output=Sentinel();const bool rejected=!ReadRecordingGenerationActive(path,limit,&output,&error);
            Check(group,rejected&&Unchanged(output),label);
        };
        for(const auto& item:std::vector<std::pair<std::string,std::string>>{
            {"partial",one+two.substr(0,two.size()-1)},{"blank",one+"\n"},{"space"," "+one},
            {"duplicate-key",one.substr(0,one.size()-2)+",\"entityId\":\"event\"}\n"},
            {"extra-key",one.substr(0,one.size()-2)+",\"extra\":true}\n"},
            {"malformed","{bad}\n"},{"crlf",one.substr(0,one.size()-1)+"\r\n"}}) {
            const auto path=root/item.first;Manifest(path,item.second,0);reject(2,path,item.second.size(),item.first.c_str());
        }
        const auto mid=root/"prefix-middle";Manifest(mid,bytes,one.size()-1);reject(2,mid,bytes.size(),"prefix LF boundary");
        const auto bad_hash=root/"prefix-hash";Manifest(bad_hash,bytes,one.size());
        Write(bad_hash/"active-1.jsonl",two+one);reject(2,bad_hash,bytes.size(),"prefix hash mismatch");
        const auto short_file=root/"prefix-size";Manifest(short_file,bytes,bytes.size());
        Write(short_file/"active-1.jsonl",one);reject(2,short_file,bytes.size(),"prefix exceeds file");
        for(const std::string kind:{"symlink","hardlink"}) {
            const auto path=root/kind;Manifest(path,bytes,one.size());
            std::filesystem::rename(path/"active-1.jsonl",path/"saved");
            if(kind=="symlink")std::filesystem::create_symlink("saved",path/"active-1.jsonl");
            else std::filesystem::create_hard_link(path/"saved",path/"active-1.jsonl");
            reject(2,path,bytes.size(),kind.c_str());
        }
        for(const std::string kind:{"inode","size","same-size","root","manifest"}) {
            hook_root=root/("race-"+kind);hook_mode=kind;hook_called=false;Manifest(hook_root,bytes,one.size());
            RecordingGenerationActiveBeforeBindingForTest(ChangeBinding);
            reject(2,hook_root,bytes.size(),kind.c_str());Check(2,hook_called,"binding hook reached");
        }
        const auto overflow=root/"overflow";Manifest(overflow,bytes,0,std::numeric_limits<std::uint64_t>::max());
        reject(2,overflow,bytes.size(),"ordinal addition overflow");
        reject(3,valid,bytes.size()-1,"caller admission exact lower bound");
        reject(3,valid,0,"nonempty zero admission");
        const auto admission=root/"admission-first";Manifest(admission,bytes,one.size());
        Write(admission/"snapshot-1.jsonl","broken");
        auto output=Sentinel();
        Check(3,!ReadRecordingGenerationActive(admission,1,&output,&error)&&Unchanged(output)&&
            error=="active size/admission exceeded","admission precedes component content IO");
        const auto sparse=root/"sparse";Manifest(sparse,"",0);
        Check(3,::truncate((sparse/"active-1.jsonl").c_str(),1024*1024)==0,"small sparse fixture");
        reject(3,sparse,16,"oversize active rejected without large allocation");
        Check(3,ReadRecordingGenerationActive(valid,bytes.size(),&result,&error)&&result.rows.size()==2&&
            !std::filesystem::exists(valid/"evidence-1-0.jsonl"),"unread historical evidence absent, active rows only");
        Check(3,!ReadRecordingGenerationActive(valid,bytes.size(),nullptr,&error),"null output rejected");
#else
        Write(root/"recording-generation.json","unchanged-original");auto output=Sentinel();
        Check(4,!ReadRecordingGenerationActive(root,999,&output,&error)&&Unchanged(output)&&
            error.find("unsupported")!=std::string::npos&&Read(root/"recording-generation.json")=="unchanged-original",
            "crypto-off output and original unchanged");
#endif
    }catch(const std::exception& error) {
        std::cerr<<"fixture exception: "<<error.what()<<'\n';return 2;
    }
    bool passed=true;
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    for(unsigned i=0;i<3;++i){std::cout<<"B02-A0"<<i+1<<' '<<(good[i]?"PASS":"FAIL")<<'\n';passed=passed&&good[i];}
#else
    std::cout<<"B02-A04 "<<(good[3]?"PASS":"FAIL")<<'\n';passed=good[3];
#endif
    return passed?0:1;
}
