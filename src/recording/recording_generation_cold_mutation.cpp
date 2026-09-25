#include "recording/recording_generation_cold_mutation.h"
#include "domain/strict_json.h"
#include <charconv>
#include <limits>
#include <tuple>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <openssl/evp.h>
#endif

namespace recording {
namespace {
bool Fail(std::string* error,const char* message) {
    if(error)*error=message;
    return false;
}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
bool Number(const std::string& text,bool positive,std::uint64_t* value) {
    const auto parsed=std::from_chars(text.data(),text.data()+text.size(),*value);
    return parsed.ec==std::errc{}&&parsed.ptr==text.data()+text.size()&&
        (!positive||*value>0)&&text==std::to_string(*value);
}
bool ArchiveName(const std::string& name,std::uint64_t current,bool* active) {
    if(name.size()<7||name.compare(name.size()-6,6,".jsonl")!=0)return false;
    std::uint64_t generation=0,slot=0;
    if(name.rfind("active-",0)==0) {
        *active=true;
        return Number(name.substr(7,name.size()-13),true,&generation)&&generation<current;
    }
    if(name.rfind("evidence-",0)!=0)return false;
    *active=false;
    const auto split=name.find('-',9);
    return split!=std::string::npos&&split<name.size()-6&&
        Number(name.substr(9,split-9),true,&generation)&&generation<=current&&
        Number(name.substr(split+1,name.size()-split-7),false,&slot);
}
std::string Hash(const std::string& bytes) {
    unsigned char digest[32];unsigned length=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&length,EVP_sha256(),nullptr)!=1||length!=32)return {};
    const char* hex="0123456789abcdef";std::string result;
    for(const auto byte:digest){result+=hex[byte>>4];result+=hex[byte&15];}return result;
}
bool SameOrder(const RecordingOrderReservationV1& a,const RecordingOrderReservationV1& b) {
    return std::tie(a.schema,a.store_id,a.request_id,a.segment_id,a.channel_id,a.sequence)==
        std::tie(b.schema,b.store_id,b.request_id,b.segment_id,b.channel_id,b.sequence);
}
#endif
}

bool ReadVerifiedRecordingIdentityMutation(const std::filesystem::path& root,
    const RecordingGenerationManifest& manifest,const RecordingIdentityFirstAcceptance& acceptance,
    std::uint64_t admission,RecordingMutationV1* output,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    try {
        const auto& row=acceptance.first_row;const auto& archive=acceptance.first_archive;
        bool active=false;std::string manifest_bytes;
        if(!output||!acceptance.occurrences||acceptance.mutation_id!=row.mutation_id||
            acceptance.first_global_ordinal!=row.global_ordinal||row.global_ordinal>=manifest.cut_ordinal||
            !row.length||row.length>admission||row.offset>archive.size||row.length>archive.size-row.offset||
            !SerializeRecordingGenerationManifest(manifest,&manifest_bytes,error)||
            !ArchiveName(archive.name,manifest.generation,&active))
            return Fail(error,"cold mutation descriptor/first identity invalid");
        std::string raw;
        const bool read=active?ReadVerifiedRecordingGenerationSealedActiveRange(root,archive,manifest.generation,
            row.offset,row.length,admission,&raw,error):ReadVerifiedRecordingGenerationImmutableRange(root,archive,
            row.offset,row.length,admission,&raw,error);
        if(!read)return false;
        if(raw.empty()||raw.back()!='\n'||raw.find('\n')!=raw.size()-1||Hash(raw)!=row.raw_sha256)
            return Fail(error,"cold mutation raw row/LF/hash mismatch");
        raw.pop_back();RecordingMutationV1 result;
        if(!ParseRecordingMutationV1(raw,&result,error))return false;
        const auto logical=SerializeRecordingMutationV1(result);
        const auto& physical=result.physical_json.empty()?logical:result.physical_json;
        if(physical!=raw||result.mutation_id!=row.mutation_id||result.mutation_type!=row.type||
            result.entity_id!=row.entity_id||result.occurred_at_ms!=row.occurred_at_ms)
            return Fail(error,"cold mutation canonical/metadata mismatch");
        std::string identity;
        if(result.mutation_type==RecordingMutationType::EventLinkReceipt) {
            ingress::StrictJsonObjectDocument receipt;
            if(!ingress::ParseStrictJsonObjectDocument(result.payload_json,&receipt,error))return false;
            identity=ingress::StrictJsonStringField(receipt,"originalSha256").value_or("");
        }else identity=Hash(logical);
        if(identity.empty()||identity!=row.identity)return Fail(error,"cold mutation logical identity mismatch");
        if(result.mutation_type==RecordingMutationType::RecordingOrderReserved) {
            RecordingOrderReservationV1 reservation;
            if(!row.reservation||!ParseRecordingOrderReservationV1(result.payload_json,&reservation,error)||
                !SameOrder(reservation,*row.reservation)||reservation.store_id!=manifest.store_id)
                return Fail(error,"cold mutation reservation tuple mismatch");
        }else if(row.reservation)return Fail(error,"cold nonreservation tuple forbidden");
        *output=std::move(result);if(error)error->clear();return true;
    }catch(...){return Fail(error,"cold mutation allocation/read failure");}
#else
    (void)root;(void)manifest;(void)acceptance;(void)admission;(void)output;
    return Fail(error,"cold mutation unsupported: POSIX/OpenSSL required");
#endif
}
} // namespace recording
