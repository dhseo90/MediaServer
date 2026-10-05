// 파일 용도: 격리 패키지를 사용한 VA 검토 계약·저장·수명 직접 검사.
#include "recording/va_review_input.h"
#include "recording/va_review_store.h"
#include <fcntl.h>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <sys/stat.h>
#include <unistd.h>
#include <zlib.h>

namespace {
unsigned checks=0;
void Check(bool ok,const std::string& name) {
    if(!ok) throw std::runtime_error(name);
    ++checks; std::cout<<"[pass] "<<name<<std::endl;
}
void Be(std::vector<std::uint8_t>& bytes,std::uint32_t n) {
    for(int shift=24;shift>=0;shift-=8) bytes.push_back(std::uint8_t(n>>shift));
}
void Chunk(std::vector<std::uint8_t>& png,const std::string& type,const std::vector<std::uint8_t>& value) {
    Be(png,value.size()); const auto start=png.size();
    png.insert(png.end(),type.begin(),type.end()); png.insert(png.end(),value.begin(),value.end());
    Be(png,crc32(0,png.data()+start,type.size()+value.size()));
}
std::vector<std::uint8_t> Png(unsigned color) {
    std::vector<std::uint8_t> png{137,80,78,71,13,10,26,10}, header;
    Be(header,1);Be(header,1);header.insert(header.end(),{8,2,0,0,0});Chunk(png,"IHDR",header);
    const std::vector<std::uint8_t> raw{0,std::uint8_t(color),0,0};
    uLongf size=compressBound(raw.size());std::vector<std::uint8_t> compressed(size);
    if(compress(compressed.data(),&size,raw.data(),raw.size())!=Z_OK)throw std::runtime_error("fixture-png");
    compressed.resize(size);Chunk(png,"IDAT",compressed);Chunk(png,"IEND",{});return png;
}
recording::EvidencePackageV1 Manifest(std::size_t count,std::vector<recording::EvidencePayload>* payloads) {
    recording::EvidencePackageV1 v;
    v.channel_id="camera-1";v.hit_id="hit-1";v.query_kind="structured";v.created_at_ms=1;
    v.status="complete";v.time_provenance="unknown";v.store_id="store-1";v.media_epoch_id="epoch-1";
    v.references.push_back({"recording","segment-1","referenced","","",std::nullopt,{}});
    v.references.push_back({"clip","none","not-applicable","no-event-clip","",std::nullopt,{}});
    for(std::size_t i=0;i<count;++i) {
        auto png=Png(unsigned(i+1)); const auto hash=recording::EvidenceSha256(png.data(),png.size());
        recording::EvidenceFrameV1 f;
        f.segment_id="segment-1";f.media_sha256=std::string(64,'a');f.sample_sha256=std::string(64,'b');
        f.rgb_sha256=std::string(64,'c');f.png_sha256=hash;f.source_generation="generation-1";
        f.media_epoch_id="epoch-1";f.track_id="track-1";f.generation_order=1;f.sample_ordinal=i+1;
        f.pts_ns=1000000*std::int64_t(i);f.presentation_ns=f.pts_ns;f.time_provenance="unknown";
        f.width=1;f.height=1;
        v.frames.push_back(f);v.assets.push_back({"asset-"+std::to_string(i),"image/png",hash,png.size()});
        v.references.push_back({"frame",f.segment_id+":"+std::to_string(f.pts_ns),"preserved","",hash,i,{}});
        payloads->push_back({std::move(png),{}});
    }
    return v;
}
void InputChecks(const std::filesystem::path& root) {
    const auto permit=[](const std::string& c){return c=="camera-1";};
    recording::EvidencePackageStore store(root/"evidence",{});std::string error;
    Check(store.Recover(&error),"V450-I01 isolated store recovery");
    std::string id;
    recording::VaReviewInput input;
    for(auto n:{1U,8U}) {
        std::vector<recording::EvidencePayload> payloads;auto manifest=Manifest(n,&payloads);
        Check(store.Publish(manifest,payloads,&id,&error),"V450-I01 publish "+std::to_string(n)+" frames: "+error);
        Check(recording::LoadVaReviewInput(store,id,"사람의 이동을 뒷받침하는 근거가 있습니까?",permit,&input,&error),
            "V450-I01 load "+std::to_string(n)+" frames: "+error);
        Check(input.pngs.size()==n && input.asset_indices.size()==n,"V450-I01 exact frame count");
        for(std::size_t i=0;i<n;++i) Check(input.pngs[i]==Png(unsigned(i+1)) && input.asset_indices[i]==i &&
            input.manifest.frames[i].pts_ns==std::int64_t(i)*1000000 && !input.manifest.frames[i].utc_ns,
            "V450-I01 independent sequence bytes/PTS/unknown UTC "+std::to_string(i));
    }
    const auto json=recording::SerializeVaReviewInput(input);recording::VaReviewInput decoded;
    Check(recording::ParseVaReviewInput(json,&decoded,&error) && recording::SerializeVaReviewInput(decoded)==json &&
        decoded.pngs.empty(),"V450-I01 metadata replay excludes raw pixels");
    const auto rejects=[&](const std::string& bad,const std::string& label){
        decoded=input;Check(!recording::ParseVaReviewInput(bad,&decoded,&error) &&
            recording::SerializeVaReviewInput(decoded)==json,"V450-I01 "+label+" output unchanged");
    };
    rejects(json.substr(0,json.size()-1)+",\"extra\":1}","extra field");
    rejects(json.substr(0,json.size()-1)+",\"question\":\"duplicate\"}","duplicate field");
    auto bad=input;bad.manifest_sha256=std::string(64,'f');rejects(recording::SerializeVaReviewInput(bad),"manifest hash");
    bad=input;bad.manifest.frames[1].pts_ns=0;rejects(recording::SerializeVaReviewInput(bad),"frame order");
    bad=input;bad.question="https://source.invalid/private";rejects(recording::SerializeVaReviewInput(bad),"source locator");
    bad=input;bad.manifest.frames[1].source_generation="another-generation";
    auto manifest_json=recording::SerializeEvidencePackage(bad.manifest);
    bad.manifest_sha256=recording::EvidenceSha256(manifest_json.data(),manifest_json.size());
    rejects(recording::SerializeVaReviewInput(bad),"mixed source generations");
    bad=input;bad.manifest.assets[0].size_bytes=recording::kVaReviewInputBytes+1;
    manifest_json=recording::SerializeEvidencePackage(bad.manifest);
    bad.manifest_sha256=recording::EvidenceSha256(manifest_json.data(),manifest_json.size());
    rejects(recording::SerializeVaReviewInput(bad),"input byte cap");
    decoded=input;
    Check(!recording::LoadVaReviewInput(store,id,"review",[](const auto&){return false;},&decoded,&error) &&
        error=="review-forbidden" && recording::SerializeVaReviewInput(decoded)==json,"V450-I01 unauthorized no publish");
    Check(!recording::LoadVaReviewInput(store,id,"review",permit,&decoded,&error,[]{return true;}) &&
        error=="review-cancelled","V450-I01 cancelled before I/O");
    Check(!recording::LoadVaReviewInput(store,"../bad","review",permit,&decoded,&error),"V450-I01 path ID rejected");
    std::vector<recording::EvidencePayload> payloads;auto empty=Manifest(0,&payloads);
    empty.status="partial";empty.references.push_back({"frame","absent","missing","no-frame","",std::nullopt,{}});
    std::string empty_id;Check(store.Publish(empty,payloads,&empty_id,&error),"V450-I01 valid empty partial fixture");
    Check(!recording::LoadVaReviewInput(store,empty_id,"review",permit,&decoded,&error) &&
        error=="review-no-frames","V450-I01 empty partial distinguished");
    // 원본 카탈로그/미디어 없이도 보존 패키지만으로 위 입력을 만들었다. 새 owner에서도 같은 byte를 대조한다.
    recording::EvidencePackageStore reopened(root/"evidence",{});
    Check(recording::LoadVaReviewInput(reopened,id,input.question,permit,&decoded,&error) &&
        recording::SerializeVaReviewInput(decoded)==json && decoded.pngs==input.pngs,
        "V450-I01 reopen independent of original media");
    const int fd=::open((root/"evidence"/(id+".evp")).c_str(),O_WRONLY|O_CLOEXEC|O_NOFOLLOW);
    Check(fd>=0,"V450-I01 own corruption fixture opened");const char corrupt='!';
    const auto wrote=::pwrite(fd,&corrupt,1,0);::close(fd);
    Check(wrote==1 && !recording::LoadVaReviewInput(store,id,"review",permit,&decoded,&error),
        "V450-I01 corrupted package rejected");
}
recording::VaReviewRecord Record(const std::filesystem::path& root) {
    recording::EvidencePackageStore evidence(root/"record-input",{});std::string error,id;
    std::vector<recording::EvidencePayload> payloads;const auto manifest=Manifest(2,&payloads);
    Check(evidence.Recover(&error)&&evidence.Publish(manifest,payloads,&id,&error),"V450-C01 evidence setup");
    recording::VaReviewRecord v;
    Check(recording::LoadVaReviewInput(evidence,id,"움직임을 확인할 수 있습니까?",[](const auto&){return true;},
        &v.input,&error),"V450-C01 input setup");
    v.output.supports.push_back({"두 프레임에서 밝기가 다릅니다.",{0,1}});
    v.output.unclear.push_back({"이 프레임만으로 사람의 이동 여부를 알 수 없습니다.",{}});
    v.output.confidence=0.5;v.revision_id="revision-1";v.provider="ollama";
    v.model="qwen3-vl:8b-instruct-q4_K_M";v.model_revision=std::string(64,'d');
    v.prompt_sha256=std::string(64,'e');v.adapter_version="ollama-chat-v1";
    v.created_at_ms=1700000000000;v.latency_ms=123;return v;
}
void RecordChecks(const std::filesystem::path& root) {
    auto record=Record(root);std::string error;
    const auto json=recording::SerializeVaReviewOutput(record.output);
    recording::VaReviewOutput output;
    Check(recording::ParseVaReviewOutput(json,2,&output,&error)&&recording::SerializeVaReviewOutput(output)==json,
        "V450-C01 grounded claims/uncertainty roundtrip");
    const auto rejects=[&](const std::string& bad,const char* label){
        output=record.output;
        Check(!recording::ParseVaReviewOutput(bad,2,&output,&error)&&recording::SerializeVaReviewOutput(output)==json,
            std::string("V450-C01 rejected ")+label+" unchanged");
    };
    rejects(json.substr(0,json.size()-1)+",\"extra\":false}","extra key");
    rejects(json.substr(0,json.size()-1)+",\"confidence\":0}","duplicate key");
    auto invalid=record.output;invalid.supports[0].frame_indices={2};rejects(recording::SerializeVaReviewOutput(invalid),"unknown frame");
    invalid=record.output;invalid.supports[0].frame_indices={0,0};rejects(recording::SerializeVaReviewOutput(invalid),"duplicate frame");
    invalid=record.output;invalid.supports[0].frame_indices.clear();rejects(recording::SerializeVaReviewOutput(invalid),"ungrounded support");
    invalid=record.output;invalid.supports[0].text=std::string(513,'x');rejects(recording::SerializeVaReviewOutput(invalid),"overlong text");
    invalid=record.output;invalid.confidence=1.0001;rejects(recording::SerializeVaReviewOutput(invalid),"confidence above one");
    invalid.confidence=-0.1;rejects(recording::SerializeVaReviewOutput(invalid),"negative confidence");
    invalid.confidence=std::numeric_limits<double>::infinity();rejects(recording::SerializeVaReviewOutput(invalid),"infinity");
    invalid=record.output;invalid.supports.clear();rejects(recording::SerializeVaReviewOutput(invalid),"confidence without evidence");
    invalid.confidence.reset();
    Check(recording::ParseVaReviewOutput(recording::SerializeVaReviewOutput(invalid),2,&output,&error)&&!output.confidence,
        "V450-C01 unknown confidence and ungrounded uncertainty accepted");
    invalid=record.output;invalid.supports.resize(17,invalid.supports.front());rejects(recording::SerializeVaReviewOutput(invalid),"claim count");
    const auto record_json=recording::SerializeVaReviewRecord(record);recording::VaReviewRecord decoded;
    Check(recording::ParseVaReviewRecord(record_json,&decoded,&error)&&
        recording::SerializeVaReviewRecord(decoded)==record_json&&decoded.input.pngs.empty(),"V450-C01 record provenance replay");
    auto bad_record=record;bad_record.model_revision="unverified";
    Check(!recording::ValidateVaReviewRecord(bad_record,&error),"V450-C01 local model digest required");
    bad_record=record;bad_record.adapter_version="gemini-generate-content-v1";
    Check(!recording::ValidateVaReviewRecord(bad_record,&error),"V450-C01 provider provenance mismatch");
    recording::VaReviewStore::Limits limits;limits.records=2;
    recording::VaReviewStore store(root/"reviews",limits);
    Check(store.Recover(&error),"V450-S01 store startup");
    std::string id,second;
    Check(store.Publish(record,&id,&error)&&store.Read(id,&decoded,&error)&&
        recording::SerializeVaReviewRecord(decoded)==record_json,"V450-S01 durable readback");
    Check(store.Publish(record,&second,&error)&&second==id,"V450-S01 same record idempotent publication");
    record.revision_id="revision-2";
    Check(store.Publish(record,&second,&error)&&second!=id,"V450-S01 new revision never overwrites");
    record.revision_id="revision-3";std::string untouched="unchanged";
    Check(!store.Publish(record,&untouched,&error)&&error=="review-capacity"&&untouched=="unchanged",
        "V450-S01 configured count boundary fails closed");
    recording::VaReviewStore reopened(root/"reviews",limits);std::vector<std::string> ids;
    Check(reopened.Recover(&error)&&reopened.List(&ids,&error)&&ids.size()==2&&reopened.Read(id,&decoded,&error)&&
        recording::SerializeVaReviewRecord(decoded)==record_json,"V450-S01 restart original revision preserved");
    auto tiny=limits;tiny.record_bytes=record_json.size()-1;
    recording::VaReviewStore oversized(root/"too-large",tiny);
    record.revision_id="revision-1";
    Check(!oversized.Publish(record,&untouched,&error)&&error=="review-record-too-large","V450-S01 record byte cap");
    tiny=limits;tiny.bytes=record_json.size()+7;
    recording::VaReviewStore capacity(root/"capacity",tiny);
    Check(!capacity.Publish(record,&untouched,&error)&&error=="review-capacity","V450-S01 store byte cap includes header");
    tiny=limits;tiny.reserve_bytes=std::numeric_limits<std::uint64_t>::max();
    recording::VaReviewStore reserve(root/"reserve",tiny);
    Check(!reserve.Publish(record,&untouched,&error)&&error=="review-disk-reserve","V450-S01 disk reserve");
    recording::VaReviewStore cancelled(root/"cancelled",limits);unsigned cancel_checks=0;
    Check(!cancelled.Publish(record,&untouched,&error,[&]{return ++cancel_checks>=3;})&&error=="review-cancelled"&&
        !std::filesystem::exists(root/"cancelled/.pending-review-v1")&&cancelled.List(&ids,&error)&&ids.empty(),
        "V450-S01 cancellation after write cleans pending/no publication");
    const auto pending_path=root/"reviews/.pending-review-v1";
    {std::ofstream f(pending_path);f<<"MSVA";}::chmod(pending_path.c_str(),0600);
    Check(reopened.Recover(&error)&&!std::filesystem::exists(pending_path),"V450-S01 interrupted partial header recovered");
    Check(::link((root/"reviews"/(id+".review")).c_str(),pending_path.c_str())==0,"V450-S01 published pending fixture");
    Check(reopened.Recover(&error)&&reopened.Read(id,&decoded,&error),"V450-S01 crash after atomic link keeps result");
    const auto hardlink=root/"owned-hardlink";
    Check(::link((root/"reviews"/(id+".review")).c_str(),hardlink.c_str())==0&&!reopened.Read(id,&decoded,&error),
        "V450-S01 unexpected hardlink rejected");
    Check(::unlink(hardlink.c_str())==0,"V450-S01 own hardlink removed");
    std::filesystem::create_directory_symlink(root/"reviews",root/"review-link");
    recording::VaReviewStore linked(root/"review-link",limits);
    Check(!linked.Read(id,&decoded,&error),"V450-S01 symlink directory rejected");
    Check(!store.Read("../record",&decoded,&error),"V450-S01 path ID rejected");
    recording::VaReviewStore unwritable(root/"unwritable",limits);
    Check(unwritable.Recover(&error)&&::chmod((root/"unwritable").c_str(),0500)==0,"V450-S01 write-failure setup");
    Check(!unwritable.Publish(record,&untouched,&error)&&error=="review-write-failed","V450-S01 failed write not published");
    Check(::chmod((root/"unwritable").c_str(),0700)==0,"V450-S01 own permissions restored");
    const int fd=::open((root/"reviews"/(id+".review")).c_str(),O_WRONLY|O_CLOEXEC|O_NOFOLLOW);
    Check(fd>=0,"V450-S01 corruption fixture opened");const char corrupt='x';
    const auto wrote=::pwrite(fd,&corrupt,1,9);::close(fd);
    Check(wrote==1&&!reopened.Read(id,&decoded,&error)&&!reopened.Recover(&error),"V450-S01 corrupt read/startup rejected");
}
}
int main(int argc,char** argv) {
    try {
        if(argc!=2)throw std::runtime_error("owned fixture root required");
        InputChecks(argv[1]);
        RecordChecks(argv[1]);
        std::cout<<"[summary] pass="<<checks<<" fail=0\n";return 0;
    } catch(const std::exception& e) {std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}
}
