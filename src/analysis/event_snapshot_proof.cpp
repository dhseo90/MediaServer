// 파일 용도: snapshot 증거의 엄격한 숫자/크기/해시 계약. 공개 Event payload와 분리한다.
#include "analysis/event_snapshot_proof.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <charconv>
#include <limits>
#include <sstream>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
namespace analysis {
namespace {
bool Hash(const std::string& s){return s.size()==64&&std::all_of(s.begin(),s.end(),[](char c){return (c>='0'&&c<='9')||(c>='a'&&c<='f');});}
bool Token(const std::string& s){return !s.empty()&&s.size()<=1024&&std::all_of(s.begin(),s.end(),[](unsigned char c){return c>=32&&c!=127;});}
bool Valid(const EventSnapshotProof& p){return Token(p.event_epoch)&&Token(p.original.source_generation)&&Token(p.original.track_id)&&
    p.original.generation_order>0&&p.original.ordinal>0&&p.original.pts_ns<=std::uint64_t(INT64_MAX)&&
    p.width>0&&p.width<=4096&&p.height>0&&p.height<=2160&&Hash(p.rgb_sha256)&&Hash(p.image_sha256);}
std::string Quote(const std::string& s){std::string r="\"";for(char c:s){if(c=='"'||c=='\\')r+='\\';r+=c;}return r+'"';}
}
std::string SnapshotBytesSha256(const unsigned char* bytes,std::size_t size){
#if MEDIA_SERVER_USE_OPENSSL
    if(!bytes||!size||size>32ULL*1024*1024)return {};
    unsigned char hash[EVP_MAX_MD_SIZE];unsigned n=0;
    if(EVP_Digest(bytes,size,hash,&n,EVP_sha256(),nullptr)!=1||n!=32)return {};
    constexpr char hex[]="0123456789abcdef";std::string out;out.reserve(64);
    for(unsigned i=0;i<n;++i){out+=hex[hash[i]>>4];out+=hex[hash[i]&15];}return out;
#else
    (void)bytes;(void)size;return {};
#endif
}
std::string SnapshotRgbSha256(const RawVideoFrame& f){
    if(f.format!=PixelFormat::RGB||f.width<1||f.width>4096||f.height<1||f.height>2160)return {};
    const auto row=std::size_t(f.width)*3,padded=(row+3)&~std::size_t(3);
    if(f.data.size()==row*std::size_t(f.height))return SnapshotBytesSha256(f.data.data(),f.data.size());
    if(f.data.size()!=padded*std::size_t(f.height))return {};
    std::vector<unsigned char> packed;packed.reserve(row*std::size_t(f.height));
    for(int y=0;y<f.height;++y)packed.insert(packed.end(),f.data.begin()+y*padded,f.data.begin()+y*padded+row);
    return SnapshotBytesSha256(packed.data(),packed.size());
}
std::optional<EventSnapshotProof> BuildEventSnapshotProof(const RawVideoFrame& f,const std::vector<unsigned char>& encoded,const SourceAssociation& event_source,const std::string& event_epoch){
    if(f.source_association.quality!=SourceAssociationQuality::TimestampMatch||!f.source_association.original||f.pts<0||
        std::uint64_t(f.pts)!=f.source_association.original->pts_ns||f.track_id!=f.source_association.original->track_id)return std::nullopt;
    if(event_source.quality!=SourceAssociationQuality::TimestampMatch||!event_source.original)return std::nullopt;
    const auto& event=*event_source.original;const auto& selected=*f.source_association.original;
    if(event.source_generation!=selected.source_generation||event.generation_order!=selected.generation_order||
        event.track_id!=selected.track_id||!event.ordinal||event.pts_ns>std::uint64_t(INT64_MAX))return std::nullopt;
    EventSnapshotProof p{selected,f.width,f.height,SnapshotRgbSha256(f),SnapshotBytesSha256(encoded.data(),encoded.size()),event_epoch};
    if(!Valid(p))return std::nullopt;return p;
}
std::string SerializeEventSnapshotProof(const EventSnapshotProof& p){
    if(!Valid(p))return "null";
    std::ostringstream out;out<<"{\"schema\":\"media-server.snapshot-original-candidate.v2\",\"sourceGeneration\":"<<Quote(p.original.source_generation)
        <<",\"generationOrder\":\""<<p.original.generation_order<<"\",\"ordinal\":\""<<p.original.ordinal
        <<"\",\"ptsNs\":\""<<p.original.pts_ns<<"\",\"trackId\":"<<Quote(p.original.track_id)
        <<",\"width\":\""<<p.width<<"\",\"height\":\""<<p.height<<"\",\"rgbSha256\":"<<Quote(p.rgb_sha256)
        <<",\"eventEpoch\":"<<Quote(p.event_epoch)<<",\"imageSha256\":"<<Quote(p.image_sha256)<<'}';return out.str();
}
bool ParseEventSnapshotProof(const std::string& json,EventSnapshotProof* output){
    if(!output||json.size()>8192)return false;
    ingress::StrictJsonObjectDocument d;std::string error;if(!ingress::ParseStrictJsonObjectDocument(json,&d,&error)||d.members.size()!=11)return false;
    auto s=[&](const char* key){return ingress::StrictJsonStringField(d,key).value_or("");};
    if(s("schema")!="media-server.snapshot-original-candidate.v2")return false;
    auto number=[&](const char* key,std::uint64_t* out){const auto value=s(key);if(value.empty()||(value.size()>1&&value[0]=='0'))return false;
        const auto parsed=std::from_chars(value.data(),value.data()+value.size(),*out);return parsed.ec==std::errc{}&&parsed.ptr==value.data()+value.size();};
    EventSnapshotProof p;p.original.source_generation=s("sourceGeneration");p.original.track_id=s("trackId");
    p.event_epoch=s("eventEpoch");p.rgb_sha256=s("rgbSha256");p.image_sha256=s("imageSha256");std::uint64_t width=0,height=0;
    if(!number("generationOrder",&p.original.generation_order)||!number("ordinal",&p.original.ordinal)||!number("ptsNs",&p.original.pts_ns)||
        !number("width",&width)||!number("height",&height)||width>4096||height>2160)return false;
    p.width=int(width);p.height=int(height);if(!Valid(p))return false;*output=std::move(p);return true;
}
}
