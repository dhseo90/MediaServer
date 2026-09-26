// 파일 용도: 녹화 카탈로그 cutover 입력 수집과 검증 계약을 smoke로 검증한다.
#include "recording/recording_cutover_input.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <limits>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#include <zlib.h>
#endif
using namespace recording;
namespace {
unsigned failures=0;
[[maybe_unused]] void Check(unsigned group,bool ok,const char* label) {
    std::cout<<"B04-P0"<<group<<' '<<(ok?"PASS":"FAIL")<<' '<<label<<'\n';
    if(!ok)++failures;
}
#if MEDIA_SERVER_USE_OPENSSL
std::string Hash(const std::string& bytes) {
    unsigned char digest[32]; unsigned length=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&length,EVP_sha256(),nullptr)!=1 || length!=32)
        throw std::runtime_error("fixture hash");
    std::string result; const char* hex="0123456789abcdef";
    for(auto c:digest){result+=hex[c>>4];result+=hex[c&15];}return result;
}
std::string Compress(const std::string& logical) {
    std::string packed(compressBound(logical.size()),'\0'); uLongf size=packed.size();
    if(compress2(reinterpret_cast<Bytef*>(packed.data()),&size,reinterpret_cast<const Bytef*>(logical.data()),logical.size(),Z_DEFAULT_COMPRESSION)!=Z_OK)
        throw std::runtime_error("fixture compression");
    std::string data(4*((size+2)/3)+1,'\0');
    data.resize(EVP_EncodeBlock(reinterpret_cast<unsigned char*>(data.data()),reinterpret_cast<const unsigned char*>(packed.data()),size));
    const auto crc=crc32(crc32(0,Z_NULL,0),reinterpret_cast<const Bytef*>(logical.data()),logical.size());
    return "{\"schema\":\"media-server.recording-compressed-mutation.v1\",\"codec\":\"zlib-base64\",\"length\":"+std::to_string(logical.size())+",\"crc32\":"+std::to_string(crc)+",\"data\":\""+data+"\"}";
}
void Cases(const std::filesystem::path& root,RecordingMutationV1 mutation) {
    const auto path=root/"cases";
    const auto canonical=SerializeRecordingMutationV1(mutation)+"\n";
    auto run=[&](const std::string& bytes,const RecordingCutoverInputVisitor& visitor,
                 RecordingCutoverInputSummary* summary,auto alter) {
        {std::ofstream out(path,std::ios::binary);out<<bytes;if(!out)throw std::runtime_error("fixture write");}
        int fd=open(path.c_str(),O_RDONLY);struct stat st{};
        if(fd<0||fstat(fd,&st))throw std::runtime_error("fixture open");
        RecordingCutoverInputDescriptor descriptor{static_cast<std::uint64_t>(st.st_dev),static_cast<std::uint64_t>(st.st_ino),static_cast<std::uint64_t>(st.st_size),Hash(bytes)};
        alter(fd,descriptor);
        lseek(fd,3,SEEK_SET);std::string error;
        const bool result=VisitRecordingCutoverInput(fd,descriptor,visitor,summary,&error);
        const bool offset=lseek(fd,0,SEEK_CUR)==3;
        close(fd);if(!offset)throw std::runtime_error("borrowed offset changed");
        return result;
    };
    auto unchanged=[](int,RecordingCutoverInputDescriptor&){};
    auto accept=[](const RecordingCutoverInputRow&,std::string*){return true;};
    RecordingCutoverInputSummary summary;
    unsigned visits=0;
    const auto noncanonical=" { \"extra\":true, "+canonical.substr(1,canonical.size()-2)+" \n";
    Check(1,run("\n"+noncanonical+"\n",[&](const auto& row,std::string*){
        ++visits;return row.ordinal==0&&row.offset==1&&row.length==noncanonical.size()&&row.canonical_bytes==canonical;
    },&summary,unchanged)&&visits==1&&summary.blank_lines==2&&summary.sha256==Hash("\n"+noncanonical+"\n"),"outer whitespace extra field and blank offsets");
    const std::string payload="{ \"z\": 1, \"a\": \"\\u0061\" }";
    const auto reordered="{\"payload\":"+payload+",\"entityId\":\"entity\",\"occurredAtMs\":0,\"mutationType\":\"event_link_created\",\"mutationId\":\"id\",\"schema\":\"media-server.recording-mutation.v1\"}\n";
    Check(1,run(reordered,[&](const auto& row,std::string*){return row.mutation.payload_json==payload&&row.canonical_bytes.find(payload)!=std::string::npos;},&summary,unchanged),"reordered outer fields preserve payload bytes");
    auto receipt=mutation;receipt.mutation_type=RecordingMutationType::EventLinkReceipt;
    receipt.payload_json="{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+Hash(canonical.substr(0,canonical.size()-1))+"\"}";
    auto packed=mutation;packed.mutation_type=RecordingMutationType::SegmentV2BoundFinalized;
    const auto wrapper=Compress(SerializeRecordingMutationV1(packed));
    const auto rr=SerializeRecordingMutationV1(receipt)+"\n";
    visits=0;
    Check(2,run(canonical+canonical+rr+wrapper+"\n",[&](const auto& row,std::string*){
        const auto index=visits++;return row.ordinal==index&&
            (index<2?row.canonical_bytes==canonical:index==2?row.mutation.payload_json==receipt.payload_json:row.canonical_bytes==wrapper+"\n"&&row.mutation.physical_json==wrapper);
    },&summary,unchanged)&&visits==4,"retry receipt and compressed physical bytes");
    for(const auto& bad: {std::string("{}\n"),canonical.substr(0,canonical.size()-1),std::string(" \n"),std::string(16U*1024U*1024U+1,'x')+"\n"}) {
        summary.rows=99;summary.sha256="sentinel";
        Check(3,!run(bad,accept,&summary,unchanged)&&summary.rows==99&&summary.sha256=="sentinel","malformed incomplete whitespace or oversized row unchanged");
    }
    visits=0;summary.rows=99;
    Check(3,!run(canonical+"{}\n",[&](const auto&,std::string*){++visits;return true;},&summary,unchanged)&&visits==1&&summary.rows==99,"prior visit is not completion");
    Check(3,!run(canonical,[](const auto&,std::string*){return false;},&summary,unchanged)&&summary.rows==99,"callback rejection unchanged");
    Check(3,!run(canonical,[](const auto&,std::string*)->bool{throw std::runtime_error("callback");},&summary,unchanged)&&summary.rows==99,"callback exception unchanged");
    auto unknown=canonical;unknown.replace(unknown.find("recording-mutation.v1"),21,"recording-mutation.v9");
    Check(3,!run(unknown,accept,&summary,unchanged)&&summary.rows==99,"unknown schema refused");
    visits=0;
    Check(3,!run(canonical,[&](const auto&,std::string*){++visits;return true;},&summary,[](int,auto& d){d.sha256=std::string(64,'0');})&&summary.rows==99&&visits==1,"wrong whole SHA after partial visit");
    Check(4,!run(canonical,accept,&summary,[](int,auto& d){++d.inode;})&&summary.rows==99,"wrong inode");
    {std::string error;RecordingCutoverInputDescriptor descriptor{0,0,0,Hash("")};
        Check(4,!VisitRecordingCutoverInput(-1,descriptor,accept,&summary,&error)&&summary.rows==99,"invalid FD refused");
        const int directory=open(root.c_str(),O_RDONLY);struct stat st{};fstat(directory,&st);
        descriptor.device=st.st_dev;descriptor.inode=st.st_ino;descriptor.size=st.st_size;
        Check(4,!VisitRecordingCutoverInput(directory,descriptor,accept,&summary,&error)&&summary.rows==99,"directory FD refused");close(directory);
    }
    Check(4,!run(canonical,accept,&summary,[](int,auto& d){d.size=std::numeric_limits<std::uint64_t>::max();})&&summary.rows==99,"offset representability overflow");
    Check(4,!run(canonical,[&](const auto&,std::string*){
        int writer=open(path.c_str(),O_WRONLY);const char byte='!';const bool ok=writer>=0&&pwrite(writer,&byte,1,0)==1; if(writer>=0)close(writer);return ok;
    },&summary,unchanged)&&summary.rows==99,"same length source modification");
    int borrowed=-1;
    const auto replacement=root/"replacement";
    {std::ofstream out(replacement);out<<canonical;}
    Check(4,!run(canonical,[&](const auto&,std::string*){
        const int other=open(replacement.c_str(),O_RDONLY);
        const bool ok=other>=0&&dup2(other,borrowed)==borrowed;
        if(other>=0)close(other);
        if(ok)lseek(borrowed,3,SEEK_SET);
        return ok;
    },&summary,[&](int fd,auto&){borrowed=fd;})&&summary.rows==99,"borrowed FD replaced with equal bytes");
    Check(4,!run(canonical,[&](const auto&,std::string*){
        const int writer=open(path.c_str(),O_WRONLY|O_APPEND);
        const bool ok=writer>=0&&write(writer,"\n",1)==1;
        if(writer>=0)close(writer);return ok;
    },&summary,unchanged)&&summary.rows==99,"source grew after visit");
    Check(4,!run(canonical,accept,&summary,[&](int,auto&){std::filesystem::create_hard_link(path,root/"hardlink");})&&summary.rows==99,"hardlink refused");
    std::filesystem::remove(root/"hardlink");
    auto large=mutation;
    large.payload_json="{\"value\":\"\"}";
    const auto overhead=SerializeRecordingMutationV1(large).size();
    large.payload_json="{\"value\":\""+std::string(16U*1024U*1024U-overhead,'x')+"\"}";
    const auto boundary=SerializeRecordingMutationV1(large)+"\n";
    Check(3,boundary.size()==16U*1024U*1024U+1&&run(boundary,accept,&summary,unchanged),"exact strict physical row limit accepted");
    for(unsigned rows: {1U,4096U}) {
        std::string bytes;for(unsigned i=0;i<rows;++i)bytes+=canonical;
        visits=0;
        Check(5,run(bytes,[&](const auto& row,std::string*){return row.ordinal==visits++&&row.length==canonical.size()&&row.canonical_bytes==canonical;},&summary,unchanged)&&
            visits==rows&&summary.rows==rows&&summary.source_bytes==bytes.size()&&summary.sha256==Hash(bytes),"stream sequence and independent cumulative SHA");
    }
    Check(6,run("",accept,&summary,unchanged)&&summary.rows==0&&summary.sha256==Hash(""),"empty source");
}
#endif
}
int main(int argc, char** argv) {
    if (argc != 2) return 2;
    std::filesystem::create_directories(argv[1]);
    const auto path = std::filesystem::path(argv[1]) / "input";
    RecordingMutationV1 mutation;
    mutation.mutation_id="id"; mutation.entity_id="entity";
    mutation.mutation_type=RecordingMutationType::EventLinkCreated;
    mutation.payload_json="{}";
    const auto bytes=SerializeRecordingMutationV1(mutation)+"\n";
    { std::ofstream out(path); out<<bytes; }
    const int fd=open(path.c_str(),O_RDONLY);
    struct stat st{}; if(fd<0 || fstat(fd,&st)!=0) return 2;
    RecordingCutoverInputDescriptor descriptor;
    descriptor.device=st.st_dev; descriptor.inode=st.st_ino; descriptor.size=st.st_size;
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char hash[32]; unsigned length=0;
    EVP_Digest(bytes.data(),bytes.size(),hash,&length,EVP_sha256(),nullptr);
    const char* hex="0123456789abcdef";
    for(auto c:hash){descriptor.sha256+=hex[c>>4];descriptor.sha256+=hex[c&15];}
#endif
    RecordingCutoverInputSummary summary; summary.rows=99;
    unsigned visits=0; std::string error;
    const bool result=VisitRecordingCutoverInput(fd,descriptor,
        [&](const RecordingCutoverInputRow& row,std::string*) {++visits;return row.canonical_bytes==bytes;},&summary,&error);
    close(fd);
#if MEDIA_SERVER_USE_OPENSSL
    const bool pass=result && visits==1 && summary.rows==1;
    std::cout<<"B04-P01 "<<(pass?"PASS":"FAIL")<<" normal row visited: "<<error<<'\n';
#else
    const bool pass=!result && visits==0 && summary.rows==99;
    std::cout<<"B04-P06 "<<(pass?"PASS":"FAIL")<<" crypto off unchanged\n";
#endif
#if MEDIA_SERVER_USE_OPENSSL
    Cases(argv[1],mutation);
#endif
    return pass&&failures==0?0:1;
}
