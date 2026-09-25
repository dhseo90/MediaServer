// 호출 시 지정 archive/행의 결박만 검사한다. 전체 chain/domain/제품 Open PASS가 아니다.
#include "recording/recording_generation_cold_mutation.h"
#include <array>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <openssl/evp.h>
#include <zlib.h>
#endif
using namespace recording;
namespace {
std::array<bool,4> good{{true,true,true,true}};
void Check(unsigned group,bool condition,const char* label) {
    if(!condition){good[group-1]=false;std::cerr<<"B02-C0"<<group<<" assertion: "<<label<<'\n';}
}
void Write(const std::filesystem::path& file,const std::string& bytes) {
    std::ofstream out(file,std::ios::binary|std::ios::trunc);out<<bytes;
    if(!out)throw std::runtime_error("fixture write failed");
}
std::string Read(const std::filesystem::path& file) {
    std::ifstream in(file,std::ios::binary);if(!in)throw std::runtime_error("fixture read failed");
    return {std::istreambuf_iterator<char>(in),{}};
}
RecordingMutationV1 Sentinel() {
    RecordingMutationV1 result;result.mutation_id="unchanged";result.entity_id="sentinel";
    result.mutation_type=RecordingMutationType::EventLinkCreated;result.payload_json="{\"sentinel\":true}";
    result.physical_json="physical-sentinel";return result;
}
bool Unchanged(const RecordingMutationV1& output) {
    return SerializeRecordingMutationV1(output)==SerializeRecordingMutationV1(Sentinel())&&
        output.physical_json==Sentinel().physical_json;
}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
std::string Hash(const std::string& bytes) {
    unsigned char digest[32];unsigned size=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&size,EVP_sha256(),nullptr)!=1||size!=32)
        throw std::runtime_error("fixture hash failed");
    const char* hex="0123456789abcdef";std::string result;
    for(const auto c:digest){result+=hex[c>>4];result+=hex[c&15];}return result;
}
RecordingGenerationManifest Manifest() {
    RecordingGenerationManifest result;result.store_id="store";result.generation=2;result.cut_ordinal=100;
    result.snapshot={"snapshot-2.jsonl",0,Hash("")};result.active={"active-2.jsonl",0,Hash("")};return result;
}
RecordingMutationV1 Ordinary() {
    RecordingMutationV1 result;result.mutation_id="ordinary";result.entity_id="entity";
    result.mutation_type=RecordingMutationType::EventLinkCreated;result.occurred_at_ms=-42;
    result.payload_json="{\"value\":\"original\"}";return result;
}
RecordingIdentityFirstAcceptance Acceptance(const RecordingMutationV1& mutation,const std::string& raw,
    const std::string& archive,std::uint64_t offset,const std::string& name="evidence-1-0.jsonl") {
    RecordingIdentityFirstAcceptance result;result.mutation_id=mutation.mutation_id;result.occurrences=1;
    result.first_global_ordinal=7;result.first_archive={name,archive.size(),Hash(archive)};
    auto& row=result.first_row;row.mutation_id=mutation.mutation_id;row.type=mutation.mutation_type;
    row.entity_id=mutation.entity_id;row.occurred_at_ms=mutation.occurred_at_ms;row.global_ordinal=7;
    row.offset=offset;row.length=raw.size();row.raw_sha256=Hash(raw);row.identity=Hash(SerializeRecordingMutationV1(mutation));
    return result;
}
std::string Compress(const std::string& logical) {
    std::string compressed(compressBound(logical.size()),'\0');uLongf size=compressed.size();
    if(compress2(reinterpret_cast<Bytef*>(compressed.data()),&size,reinterpret_cast<const Bytef*>(logical.data()),logical.size(),Z_DEFAULT_COMPRESSION)!=Z_OK)
        throw std::runtime_error("fixture compression failed");
    compressed.resize(size);std::string base64(4*((size+2)/3)+1,'\0');
    const auto length=EVP_EncodeBlock(reinterpret_cast<unsigned char*>(base64.data()),reinterpret_cast<const unsigned char*>(compressed.data()),compressed.size());
    if(length<0)throw std::runtime_error("fixture base64 failed");base64.resize(length);
    const auto checksum=crc32(crc32(0,Z_NULL,0),reinterpret_cast<const Bytef*>(logical.data()),logical.size());
    return "{\"schema\":\"media-server.recording-compressed-mutation.v1\",\"codec\":\"zlib-base64\",\"length\":"+
        std::to_string(logical.size())+",\"crc32\":"+std::to_string(checksum)+",\"data\":\""+base64+"\"}";
}
std::filesystem::path hook_path;bool hook_ran=false;
void Replace() {
    hook_ran=true;const auto bytes=Read(hook_path);
    std::filesystem::rename(hook_path,hook_path.string()+"-saved");Write(hook_path,bytes);
}
#endif
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path root(argv[1]);std::filesystem::create_directories(root);std::string error;
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        const auto manifest=Manifest();const auto ordinary=Ordinary();const auto raw=SerializeRecordingMutationV1(ordinary)+"\n";
        const std::string prefix="historical-prefix\n",suffix="historical-suffix\n",archive=prefix+raw+suffix;
        const auto accepted=Acceptance(ordinary,raw,archive,prefix.size());Write(root/accepted.first_archive.name,archive);
        RecordingMutationV1 output;
        Check(1,ReadVerifiedRecordingIdentityMutation(root,manifest,accepted,raw.size(),&output,&error)&&
            SerializeRecordingMutationV1(output)==SerializeRecordingMutationV1(ordinary),"ordinary located envelope");
        auto order=ordinary;order.mutation_id="request";order.entity_id="segment";order.mutation_type=RecordingMutationType::RecordingOrderReserved;
        order.payload_json="{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"store\",\"requestId\":\"request\",\"segmentId\":\"segment\",\"channelId\":\"channel\",\"sequence\":3}";
        const auto order_raw=SerializeRecordingMutationV1(order)+"\n";
        auto reserved=Acceptance(order,order_raw,order_raw,0,"evidence-1-1.jsonl");RecordingOrderReservationV1 tuple;
        if(!ParseRecordingOrderReservationV1(order.payload_json,&tuple,&error))throw std::runtime_error("fixture order failed");
        reserved.first_row.reservation=tuple;Write(root/reserved.first_archive.name,order_raw);
        Check(1,ReadVerifiedRecordingIdentityMutation(root,manifest,reserved,order_raw.size(),&output,&error)&&output.mutation_id=="request","reservation tuple");
        auto receipt=ordinary;receipt.mutation_type=RecordingMutationType::EventLinkReceipt;
        const auto original_hash=Hash(SerializeRecordingMutationV1(ordinary));
        receipt.payload_json="{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+original_hash+"\"}";
        const auto receipt_raw=SerializeRecordingMutationV1(receipt)+"\n";
        auto receipted=Acceptance(receipt,receipt_raw,receipt_raw,0,"evidence-1-2.jsonl");receipted.first_row.identity=original_hash;
        Write(root/receipted.first_archive.name,receipt_raw);
        Check(1,ReadVerifiedRecordingIdentityMutation(root,manifest,receipted,receipt_raw.size(),&output,&error)&&output.mutation_type==RecordingMutationType::EventLinkReceipt,"receipt original identity");
        auto compressed=ordinary;compressed.mutation_type=RecordingMutationType::SegmentV2BoundFinalized;
        compressed.payload_json="{\"padding\":\""+std::string(2048,'x')+"\"}";
        compressed.physical_json=Compress(SerializeRecordingMutationV1(compressed));const auto compressed_raw=compressed.physical_json+"\n";
        auto packed=Acceptance(compressed,compressed_raw,compressed_raw,0,"evidence-1-3.jsonl");Write(root/packed.first_archive.name,compressed_raw);
        Check(1,ReadVerifiedRecordingIdentityMutation(root,manifest,packed,compressed_raw.size(),&output,&error)&&
            output.physical_json==compressed.physical_json&&SerializeRecordingMutationV1(output)==SerializeRecordingMutationV1(compressed),"compressed physical/logical identity");
        auto sealed=accepted;sealed.first_archive.name="active-1.jsonl";Write(root/sealed.first_archive.name,archive);
        Check(1,ReadVerifiedRecordingIdentityMutation(root,manifest,sealed,raw.size(),&output,&error),"sealed past active");
        const auto reject=[&](unsigned group,const RecordingIdentityFirstAcceptance& value,std::uint64_t admission,const char* label) {
            auto untouched=Sentinel();Check(group,!ReadVerifiedRecordingIdentityMutation(root,manifest,value,admission,&untouched,&error)&&Unchanged(untouched),label);
        };
        for(const std::string field:{"id","type","entity","time","digest","raw","ordinal","occurrences","offset","length","size","file-hash"}) {
            auto bad=accepted;
            if(field=="id")bad.first_row.mutation_id="different";
            if(field=="type")bad.first_row.type=RecordingMutationType::ObservationPut;
            if(field=="entity")bad.first_row.entity_id="different";
            if(field=="time")++bad.first_row.occurred_at_ms;
            if(field=="digest")bad.first_row.identity=std::string(64,'0');
            if(field=="raw")bad.first_row.raw_sha256=std::string(64,'0');
            if(field=="ordinal")++bad.first_global_ordinal;
            if(field=="occurrences")bad.occurrences=0;
            if(field=="offset")bad.first_row.offset=std::numeric_limits<std::uint64_t>::max();
            if(field=="length")bad.first_row.length=0;
            if(field=="size")++bad.first_archive.size;
            if(field=="file-hash")bad.first_archive.sha256=std::string(64,'0');
            reject(2,bad,raw.size(),field.c_str());
        }
        auto bad=reserved;bad.first_row.reservation->channel_id="other";reject(2,bad,order_raw.size(),"reservation tuple mismatch");
        bad=reserved;bad.first_row.reservation.reset();reject(2,bad,order_raw.size(),"missing reservation");
        bad=accepted;bad.first_row.reservation=tuple;reject(2,bad,raw.size(),"ordinary reservation forbidden");
        bad=receipted;bad.first_row.identity=Hash(SerializeRecordingMutationV1(receipt));reject(2,bad,receipt_raw.size(),"receipt must use original hash");
        bad=packed;bad.first_row.identity=Hash(compressed.physical_json);reject(2,bad,compressed_raw.size(),"compressed must use logical identity");
        auto altered=ordinary;altered.payload_json="{\"value\":\"changed\"}";
        const auto changed_raw=SerializeRecordingMutationV1(altered)+"\n";
        bad=Acceptance(altered,changed_raw,changed_raw,0,"evidence-1-4.jsonl");bad.first_row.identity=accepted.first_row.identity;
        Write(root/bad.first_archive.name,changed_raw);reject(2,bad,changed_raw.size(),"same ID different payload");
        for(const auto& bytes:std::vector<std::string>{raw.substr(0,raw.size()-1)," "+raw,raw+raw,raw.substr(0,raw.size()-2)+",\"extra\":true}\n"}) {
            bad=Acceptance(ordinary,bytes,bytes,0,"evidence-1-5.jsonl");Write(root/bad.first_archive.name,bytes);
            reject(2,bad,bytes.size(),"incomplete/noncanonical/multiple envelope");
        }
        for(const std::string name:{"../evidence-1-0.jsonl","snapshot-1.jsonl","identity-1.jsonl","evidence-01-0.jsonl","evidence-1-00.jsonl","evidence-0-0.jsonl","evidence-3-0.jsonl","active-2.jsonl","active-3.jsonl"}) {
            bad=accepted;bad.first_archive.name=name;reject(2,bad,raw.size(),name.c_str());
        }
        bad=accepted;bad.first_archive.name="evidence-1-6.jsonl";
        std::filesystem::create_symlink(accepted.first_archive.name,root/bad.first_archive.name);reject(2,bad,raw.size(),"symlink");
        bad.first_archive.name="evidence-1-7.jsonl";Write(root/"hard-source",archive);
        std::filesystem::create_hard_link(root/"hard-source",root/bad.first_archive.name);reject(2,bad,raw.size(),"hardlink");
        bad.first_archive.name="evidence-1-8.jsonl";Write(root/bad.first_archive.name,archive);hook_path=root/bad.first_archive.name;
        RecordingGenerationImmutableBeforeBindingForTest(Replace);reject(2,bad,raw.size(),"inode changed after read");Check(2,hook_ran,"binding hook reached");
        Write(root/accepted.first_archive.name,prefix+raw+"different-suffix\n");reject(2,accepted,raw.size(),"corruption outside selected row");
        Write(root/accepted.first_archive.name,archive);
        reject(3,accepted,raw.size()-1,"physical admission lower bound");
        bad=accepted;bad.first_archive.size=1024ULL*1024*1024+1;reject(3,bad,raw.size(),"descriptor 1GiB bound without allocation");
        Check(3,ReadVerifiedRecordingIdentityMutation(root,manifest,accepted,raw.size(),&output,&error)&&
            output.payload_json==ordinary.payload_json&&Read(root/accepted.first_archive.name)==archive,"only selected row returned and original preserved");
        Check(3,ReadVerifiedRecordingIdentityMutation(root,manifest,packed,compressed_raw.size(),&output,&error)&&
            output.payload_json.size()>compressed_raw.size(),"physical admission distinct from bounded logical expansion");
        Check(3,!ReadVerifiedRecordingIdentityMutation(root,manifest,accepted,raw.size(),nullptr,&error),"null output");
#else
        Write(root/"evidence-1-0.jsonl","original");auto output=Sentinel();
        Check(4,!ReadVerifiedRecordingIdentityMutation(root,{}, {},100,&output,&error)&&Unchanged(output)&&
            error.find("unsupported")!=std::string::npos&&Read(root/"evidence-1-0.jsonl")=="original","crypto-off preserves output and bytes");
#endif
    }catch(const std::exception& error){std::cerr<<"fixture exception: "<<error.what()<<'\n';return 2;}
    bool passed=true;
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    for(unsigned i=0;i<3;++i){std::cout<<"B02-C0"<<i+1<<' '<<(good[i]?"PASS":"FAIL")<<'\n';passed=passed&&good[i];}
#else
    std::cout<<"B02-C04 "<<(good[3]?"PASS":"FAIL")<<'\n';passed=good[3];
#endif
    return passed?0:1;
}
