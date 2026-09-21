// 파일 용도: FE01~08: 실제 파일·저장·복구 경계의 단기 검증.
#include "recording_media_test_fixture.h"
#include "recording/recording_file_evidence.h"
#include "recording/recording_finalize_recovery.h"
#include "recording/recording_derived_job.h"
#include "recording/recording_derived_selection.h"
#include "recording/retention_coordinator.h"
#include <chrono>
#include <fstream>
#include <functional>
#include <fcntl.h>
#include <unistd.h>
using namespace recording;
namespace {
using Clock=std::chrono::steady_clock;
int passes=0;
std::string context;
void Check(bool v,const std::string& n){if(!v)throw std::runtime_error(context+" "+n);++passes;std::cout<<"[pass] "<<context<<' '<<n<<'\n';}
long long Us(Clock::time_point t){return std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-t).count();}
std::string Bytes(const std::filesystem::path& p){std::ifstream in(p,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};}
void Write(const std::filesystem::path& p,const std::string& b){std::ofstream out(p,std::ios::binary);out.write(b.data(),b.size());if(!out)throw std::runtime_error("fixture-write");}
std::string Digest(const std::string& b){gchar* p=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(b.data()),b.size());std::string s(p);g_free(p);return s;}
struct Output {RecordingSegmentV2 segment;RecordingSourceBindingV1 binding;std::filesystem::path root,file;};
std::vector<Output> Record(const std::filesystem::path& root,Encoded& input,std::int64_t ms=10000000) {
 context=root.filename().string();
 Store store(root);GStreamerSegmentWriter::Options options(root,ms);options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
 GStreamerSegmentWriter w(options);std::string error;Check(w.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"FE02 writer start");
 const auto begin=Clock::now();for(const auto& p:input.packets)w.Push(p,0);w.Stop();
 std::vector<Output> out;for(const auto& s:store.Segments()){const auto b=store.catalog.FindSourceBinding(s.segment_id);Check(b.has_value(),"FE04 bound finalized mutation segment"+std::to_string(out.size()));out.push_back({s,*b,root,root/"probe-channel"/(s.segment_id+"."+s.container)});}
 std::cout<<"[measure] writer_push_finalize_us="<<Us(begin)<<" input_aus="<<input.packets.size()<<" segments="<<out.size()<<'\n';return out;
}
bool Verify(const Output& o){const int fd=::open(o.file.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);std::string error;const bool v=fd>=0&&VerifyRecordingFileEvidenceFd(fd,o.binding,&error);if(fd>=0)::close(fd);return v;}
void Reopen(const Output& o,bool sql,bool checkpoint) {
 context=o.root.filename().string()+(sql?"/sqlite":"/jsonl")+(checkpoint?"/checkpoint":"/replay");
 RecordingJournal j(RecordingJournal::ManagedOptions{o.root,"probe-store"});std::string error;Check(j.Open(&error),"FE05 journal reopen");
 RecordingCatalog::Options opts(o.root/"recording-catalog.sqlite3",o.root,sql);opts.enable_v2_storage=true;RecordingCatalog c(j,opts);Check(c.Open(&error),sql?"FE05 SQLite reopen":"FE05 JSONL fallback reopen");
 const auto b=c.FindSourceBinding(o.segment.segment_id);Check(b&&SerializeRecordingSourceBindingV1(*b)==SerializeRecordingSourceBindingV1(o.binding),"FE05 exact evidence roundtrip");
 if(checkpoint){const auto begin=Clock::now();Check(c.Checkpoint(&error),"FE05 checkpoint");std::cout<<"[measure] checkpoint_us="<<Us(begin)<<'\n';}
}
void Contracts(const Output& o) {
 const auto json=SerializeRecordingSourceBindingV1(o.binding);RecordingSourceBindingV1 parsed;std::string error;
 Check(o.binding.file_evidence&&ParseRecordingSourceBindingV1(json,&parsed,&error)&&SerializeRecordingSourceBindingV1(parsed)==json,"FE01 strict evidence roundtrip");
 auto legacy=o.binding;legacy.file_evidence.reset();const auto old=SerializeRecordingSourceBindingV1(legacy);const auto pos=json.find(",\"file_evidence\":");
 Check(pos!=std::string::npos&&old==json.substr(0,pos)+"}"&&ParseRecordingSourceBindingV1(old,&parsed,&error)&&!parsed.file_evidence,"FE01 absent existing bytes unchanged");
 const std::vector<std::pair<std::string,std::function<void(RecordingSourceBindingV1&)>>> cases={
 {"ordinal",[](auto& b){++b.file_evidence->samples[0].ordinal;}},{"original PTS",[](auto& b){++b.file_evidence->samples[0].original_pts_ns;}},
 {"origin",[](auto& b){++b.file_evidence->writer_origin_ns;}},{"mux DTS",[](auto& b){++b.file_evidence->samples[0].mux_dts_ns;}},
 {"native PTS",[](auto& b){++b.file_evidence->samples[0].native_pts;}},{"native duration",[](auto& b){++b.file_evidence->samples[0].native_duration;}},
 {"timescale",[](auto& b){++b.file_evidence->timescale;}},{"duplicate VCL",[](auto& b){b.file_evidence->samples[1].vcl_sha256=b.file_evidence->samples[0].vcl_sha256;}},
 {"duplicate raw",[](auto& b){b.file_evidence->samples[1].sample_sha256=b.file_evidence->samples[0].sample_sha256;}},
 {"missing sample",[](auto& b){b.file_evidence->samples.pop_back();}},{"profile",[](auto& b){b.file_evidence->profile="unknown";}},
 {"hash format",[](auto& b){b.file_evidence->file_sha256="invalid";}},{"overflow",[](auto& b){b.file_evidence->samples[0].native_duration=INT64_MAX;}}};
 for(const auto& t:cases){auto b=o.binding;t.second(b);Check(!ValidateRecordingSourceBindingV1(b,&error),"FE06 reject "+t.first);}
 auto bad=o;bad.binding.file_evidence->file_sha256=std::string(64,'a');Check(!ValidateRecordingSourceBindingForSegment(bad.binding,bad.segment,&error)&&!Verify(bad),"FE06 reject file hash binding");
 unsigned bad_index=0;for(const auto& b:{json.substr(0,json.size()-1)+",\"extra\":1}",json.substr(0,json.size()-1)+",\"file_evidence\":{}}",std::string(2U*1024*1024+1,' ')}){const char* labels[]={"unknown field","duplicate field","oversize"};Check(!ParseRecordingSourceBindingV1(b,&parsed,&error),std::string("FE06 JSON ")+labels[bad_index++]);}
 auto wrong=json;const auto v=wrong.find("\"version\":1");wrong.replace(v,11,"\"version\":2");Check(!ParseRecordingSourceBindingV1(wrong,&parsed,&error),"FE06 reject evidence version");
}
std::size_t Box(const std::string& b,const std::string& t){const auto p=b.find(t);if(p<4||p==std::string::npos)throw std::runtime_error("fixture-box");return p-4;}
void U32(std::string& b,std::size_t p,std::uint32_t v){for(unsigned i=0;i<4;++i)b.at(p+i)=static_cast<char>((v>>(24-i*8))&255);}
void ParserFailures(const Output& good,const std::filesystem::path& root) {
 const auto bytes=Bytes(good.file);
 const std::vector<std::pair<std::string,std::function<void(std::string&)>>> cases={
 {"zero box",[](auto& b){U32(b,Box(b,"stts"),0);}},{"duplicate box",[](auto& b){const auto p=Box(b,"moov");b.append(b.substr(p));}},
 {"outside mdat",[](auto& b){U32(b,Box(b,"stco")+16,0);}},{"table count",[](auto& b){U32(b,Box(b,"stts")+12,0xffffffffU);}},
 {"sample count overflow",[](auto& b){U32(b,Box(b,"stsz")+16,0xffffffffU);}},{"box overflow",[](auto& b){U32(b,Box(b,"moov"),0xffffffffU);}},
 {"edit rate",[](auto& b){U32(b,Box(b,"elst")+24,32768);}},{"edit version",[](auto& b){b.at(Box(b,"elst")+8)=2;}},
 {"truncated",[](auto& b){b.resize(b.size()-7);}},
 {"data reference index",[](auto& b){b.at(Box(b,"avc1")+15)=2;}},
 {"external data reference",[](auto& b){U32(b,Box(b,"url ")+8,0);}},
 {"data reference count",[](auto& b){U32(b,Box(b,"dref")+12,2);}}};
 for(const auto& t:cases){auto bytes2=bytes;t.second(bytes2);auto o=good;o.file=root/("malformed-"+std::to_string(passes)+".mp4");Write(o.file,bytes2);
 o.binding.file_evidence->file_size_bytes=bytes2.size();o.binding.file_evidence->file_sha256=Digest(bytes2);Check(!Verify(o),"FE03 reject "+t.first+" with recomputed file hash");}
}
void Ready(const Output& o) {
 context=o.root.filename().string()+"/ready";
 FinalizeReadyTicket t;t.segment_v2=o.segment;t.source_binding=o.binding;t.final_relative=std::filesystem::relative(o.file,o.root);t.partial_relative=t.final_relative.string()+".partial.12345678-1234-4234-8234-123456789abc";
 std::string error;Check(WriteFinalizeReadyTicket(o.root,t,&error),"FE04 write exact evidence Ready");
 RecordingJournal j(RecordingJournal::ManagedOptions{o.root,"probe-store"});Check(j.Open(&error),"FE05 Ready journal");RecordingCatalog c(j,Store::Options(o.root));Check(c.Open(&error),"FE05 Ready catalog");FinalizeRecoveryReport report;
 Check(RecoverFinalizeReadyTickets(c,o.root,&report,&error)&&report.already_committed==1,"FE05 Ready replay actual file verification");
 Check(!std::filesystem::exists(o.root/(t.final_relative.string()+".finalize-ready")),"FE04 Ready cleaned");
 for(unsigned mode=0;mode<3;++mode){
  const auto root=o.root.parent_path()/("ready-physical-"+std::to_string(mode));Store isolated(root);
  auto candidate=t;candidate.final_relative=o.segment.segment_id+".mp4";candidate.partial_relative=candidate.final_relative.string()+".partial.12345678-1234-4234-8234-123456789abc";
  RecordingOrderReservationV1 order;
  Check(isolated.journal.ReserveRecordingOrder(o.segment.store_id,o.segment.order_request_id,o.segment.segment_id,o.segment.channel_id,&order,&error)&&order.sequence==o.segment.order_sequence,"FE06-R reservation mode"+std::to_string(mode));
  std::filesystem::copy_file(o.file,root/candidate.partial_relative);
  if(mode<2)candidate.source_binding->file_evidence->samples[0].sample_sha256=std::string(64,'b');
  Check(WriteFinalizeReadyTicket(root,candidate,&error),"FE06-R persisted Ready mode"+std::to_string(mode));
  const auto before=isolated.journal.Replay().mutations.size();FinalizeRecoveryReport recovered;
  const bool ok=mode==1?RecoverFinalizeReadyTickets(isolated.catalog,root,&recovered,&error):CommitFinalizeReadyV2(isolated.catalog,root,candidate,&error);
  const auto ticket=root/(candidate.final_relative.string()+".finalize-ready");
  if(mode<2){
   Check(!ok&&error=="publish file evidence 실제 파일 불일치","FE06-R physical rejection exact error mode"+std::to_string(mode));
   Check(!isolated.catalog.FindSegmentV2ById(o.segment.segment_id)&&!isolated.catalog.FindSourceBinding(o.segment.segment_id)&&isolated.journal.Replay().mutations.size()==before,"FE06-R rejection no durable or memory mutation mode"+std::to_string(mode));
   Check(std::filesystem::exists(ticket)&&std::filesystem::exists(root/candidate.partial_relative)&&!std::filesystem::exists(root/candidate.final_relative),"FE06-R rejected original files preserved mode"+std::to_string(mode));
  }else Check(ok&&isolated.catalog.FindSourceBinding(o.segment.segment_id)&&std::filesystem::exists(root/candidate.final_relative)&&!std::filesystem::exists(root/candidate.partial_relative)&&!std::filesystem::exists(ticket),"FE06-R valid proof publishes commits and cleans");
 }
}
DerivedJobIntentV1 Job(const Output& o) {
 DerivedRecordingSelection s;auto& r=s.reference;r.reference_id="compat-ref";r.kind="event";r.owner_id="compat-event";r.source_id=o.segment.source_id;r.channel_id=o.segment.channel_id;r.analysis_namespace="compat-ns";r.analysis_track_id="compat-track";r.association_quality="timestamp-match";
 r.original=RecordingConsumerOriginalV1{o.binding.source_generation,o.binding.generation_order,o.binding.samples.front().ordinal,o.binding.track_id,o.binding.samples.front().pts_ns};r.request=RecordingConsumerRequestV1{"media-pts-ms",0,1000,0,0};s.expanded_end_ns=1000000000;s.complete=true;
 DerivedSelectionSlice slice;slice.end_ns=1000000000;slice.state=DerivedSliceState::Confirmed;slice.candidates.push_back({o.segment,r.original,0,1000000000,{}});s.slices.push_back(slice);
 DerivedJobIntentV1 job;std::string error;if(!BuildDerivedJobIntent(s,{{o.segment,o.binding,false}},32U*1024*1024,1,&job,&error))throw std::runtime_error(error);return job;
}
void Reidentify(DerivedJobIntentV1& job) {
 std::string sources="[";for(std::size_t i=0;i<job.sources.size();++i){if(i)sources+=',';sources+="{\"segment\":"+SerializeRecordingSegmentV2(job.sources[i].segment)+",\"binding\":"+SerializeRecordingSourceBindingV1(job.sources[i].binding)+"}";}sources+=']';
 const auto logical="{\"profile\":\""+job.profile+"\",\"reference\":"+SerializeRecordingConsumerReferenceV1(job.reference)+",\"selection\":"+job.selection_json+",\"sources\":"+sources+"}";
 job.job_id="dj-"+Digest(logical);job.attempt_id=job.job_id+"-a1";job.protection_token=job.attempt_id+"-protect";
 for(std::size_t i=0;i<job.outputs.size();++i){auto& out=job.outputs[i];out.output_id=job.job_id+"-o"+std::to_string(i);out.order_request_id=out.output_id+"-order";out.temporary_relpath=".derived-jobs/"+job.job_id+"/"+job.attempt_id+"/"+out.output_id+".partial.ts";out.final_relpath=job.reference.channel_id+"/"+out.output_id+".ts";}
}
void Compatibility(const Output& o) {
 context="cap4096/legacy-job";auto projected=Job(o);auto legacy_input=o;legacy_input.binding.file_evidence.reset();const auto legacy=Job(legacy_input);
 Check(!projected.sources[0].binding.file_evidence&&SerializeDerivedJobIntent(projected)==SerializeDerivedJobIntent(legacy),"FE08 new job identity and bytes unchanged");
 auto invalid=o;++invalid.binding.file_evidence->samples[0].native_pts;bool refused=false;try{(void)Job(invalid);}catch(const std::exception&){refused=true;}Check(refused,"FE08 invalid optional proof is rejected before projection");
 auto proof=projected;proof.sources[0].binding=o.binding;Reidentify(proof);std::string error;DerivedJobIntentV1 restored;
 const auto stored=SerializeDerivedJobIntent(proof);Check(!stored.empty()&&ParseDerivedJobIntent(stored,&restored,&error)&&restored.sources[0].binding.file_evidence&&SerializeDerivedJobIntent(restored)==stored,"FE08 preexisting proof job retains proof and ID");
 {
 RecordingJournal j(RecordingJournal::ManagedOptions{o.root,"probe-store"});Check(j.Open(&error),"FE08 compatibility journal");RecordingCatalog c(j,Store::Options(o.root));Check(c.Open(&error),"FE08 compatibility catalog");
 RetentionCoordinator coordinator(c,[&]{return c.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,o.root});
 Check(coordinator.UpdateChannelPolicy(o.segment.channel_id,{1024ULL*1024*1024,1000000,1024ULL*1024*1024,1000000},&error),"FE08 admission policy registered");
 for(unsigned change=0;change<4;++change){auto altered=o;
  altered.binding.file_evidence.reset();
  if(change==0)altered.binding.source_generation+="-changed";
  if(change==1){altered.binding.samples.back().ordinal=9000;altered.binding.last_accepted_ordinal=9000;}
  if(change==2)++altered.binding.samples[1].pts_ns;
  if(change==3)altered.segment.checksum_sha256=std::string(64,'c');
  const auto changed=Job(altered);const auto result=coordinator.AdmitDerivedJob(c,changed,1);Check(ValidateDerivedJobIntent(changed,&error)&&!result.accepted&&result.message==(change==3?"derived job live source snapshot 없음":"derived job live source 결박 거부"),"FE08 live legacy rejects source/ordinal/PTS/hash variant"+std::to_string(change));
 }
 auto tampered=proof;tampered.sources[0].binding.file_evidence->samples[0].sample_sha256=std::string(64,'d');Reidentify(tampered);
 const auto bad_admission=coordinator.AdmitDerivedJob(c,tampered,1);
 Check(ValidateDerivedJobIntent(tampered,&error)&&!bad_admission.accepted&&bad_admission.message=="derived job live source 결박 거부","FE08 proof job requires full live evidence match");
 Check(coordinator.AdmitDerivedJob(c,projected,1).accepted,"FE08 legacy job accepts exact live identity with optional proof");
 Check(coordinator.AdmitDerivedJob(c,proof,1).accepted,"FE08 proof job accepts exact full live proof");
 Check(c.Checkpoint(&error),"FE08 proof and legacy job checkpoint");
 }
 for(bool sql:{true,false}){RecordingJournal j(RecordingJournal::ManagedOptions{o.root,"probe-store"});Check(j.Open(&error),"FE08 job recovery journal sql"+std::to_string(sql));auto opts=Store::Options(o.root);opts.prefer_sqlite=sql;RecordingCatalog c(j,opts);Check(c.Open(&error),"FE08 job recovery catalog sql"+std::to_string(sql));
 for(const auto* expected:{&projected,&proof}){std::optional<DerivedJobRecordV1> record;Check(c.FindDerivedJob(expected->job_id,&record,&error)&&record&&SerializeDerivedJobIntent(record->intent)==SerializeDerivedJobIntent(*expected),"FE08 immutable recovered job proof"+std::to_string(expected==&proof)+" sql"+std::to_string(sql));}}
}
void CatalogCost(const Output& original,const std::filesystem::path& root,bool legacy) {
 context=legacy?"cap4096/catalog8-legacy":"cap4096/catalog8-evidence";Store store(root);std::string error;long long total=0,maximum=0;std::vector<Output> outputs;
 for(unsigned i=0;i<8;++i){auto o=original;o.root=root;o.segment.segment_id="cost-"+std::to_string(i);o.segment.order_request_id="cost-order-"+std::to_string(i);o.binding.segment_id=o.segment.segment_id;o.file=root/(o.segment.segment_id+".mp4");
 RecordingOrderReservationV1 order;Check(store.journal.ReserveRecordingOrder("probe-store",o.segment.order_request_id,o.segment.segment_id,o.segment.channel_id,&order,&error),"FE07 catalog8 reserve"+std::to_string(i));o.segment.order_sequence=order.sequence;
 std::filesystem::copy_file(original.file,o.file);Check(Verify(o),"FE07 catalog8 verify outside catalog"+std::to_string(i));if(legacy)o.binding.file_evidence.reset();const auto begin=Clock::now();Check(store.catalog.FinalizeBoundSegmentV2(o.segment,o.binding,o.file.string(),&error),"FE07 catalog8 commit"+std::to_string(i));const auto elapsed=Us(begin);total+=elapsed;maximum=std::max(maximum,elapsed);std::cout<<"[measure] legacy="<<legacy<<" catalog_commit_index="<<i<<" us="<<elapsed<<'\n';outputs.push_back(o);}
 const auto reference=Job(outputs.front()).reference;std::vector<RecordingDerivedSourceSnapshotEntry> snapshot;const auto begin=Clock::now();Check(store.catalog.SnapshotDerivedSources(reference,&snapshot,&error)&&snapshot.size()==8,"FE07 catalog8 source snapshot");std::cout<<"[measure] legacy="<<legacy<<" catalog8_snapshot_us="<<Us(begin)<<" total_commit_us="<<total<<" max_commit_us="<<maximum<<'\n';
 const auto checkpoint=Clock::now();Check(store.catalog.Checkpoint(&error),"FE07 catalog8 checkpoint");std::cout<<"[measure] legacy="<<legacy<<" catalog8_checkpoint_us="<<Us(checkpoint)<<'\n';
}
void Capacity(const Output& o) {
 context="cap4096/capacity";
 const auto begin=Clock::now();const auto json=SerializeRecordingSourceBindingV1(o.binding);RecordingSourceBindingV1 parsed;std::string error;
 Check(o.binding.samples.size()==4096&&o.binding.file_evidence&&json.size()<=2U*1024*1024&&ParseRecordingSourceBindingV1(json,&parsed,&error),"FE07 actual4096 within2MiB");
 std::cout<<"[measure] binding_bytes="<<json.size()<<" serialize_parse_us="<<Us(begin)<<'\n';
 // 숫자 폭과 escaping의 보수적 상한도 실제 4096 AU와 별도로 확인한다.
 // 이 합성 binding은 저장 계약 검사이며 실제 파일 대응 증거로 사용하지 않는다.
 auto wide=o.binding;auto& proof=*wide.file_evidence;
 const std::int64_t offset=INT64_MAX/2;
 proof.writer_origin_ns+=offset;wide.generation_order=UINT64_MAX;
 for(auto* id:{&wide.segment_id,&wide.source_id,&wide.channel_id,&wide.store_id,&wide.media_epoch_id,&wide.source_generation})*id=std::string(128,'x');
 wide.track_id=std::string(1024,'"');
 for(std::size_t i=0;i<wide.samples.size();++i){const auto ordinal=UINT64_MAX-wide.samples.size()+i+1;wide.samples[i].ordinal=ordinal;wide.samples[i].pts_ns+=offset;proof.samples[i].ordinal=ordinal;proof.samples[i].original_pts_ns+=offset;proof.samples[i].original_dts_ns+=offset;}
 wide.last_accepted_ordinal=UINT64_MAX;
 const auto wide_json=SerializeRecordingSourceBindingV1(wide);
 Check(!wide_json.empty()&&ParseRecordingSourceBindingV1(wide_json,&parsed,&error)&&SerializeRecordingSourceBindingV1(parsed)==wide_json,"FE07 wide integer and escaped track roundtrip");
 // 12요소 tuple: 숫자10개 각각20자리, hash2개 각각64자리+따옴표, 구분자/괄호.
 // 기존 sample object는 키 포함80B, 나머지 모든 header에는16KiB를 예약한다.
 const std::size_t conservative_bound=4096U*(10U*20U+2U*66U+13U+80U)+16U*1024U;
 Check(wide_json.size()<=conservative_bound&&conservative_bound<2U*1024U*1024U,"FE07 numeric width conservative envelope below2MiB");
 std::cout<<"[measure] wide_binding_bytes="<<wide_json.size()<<" conservative_binding_bytes="<<conservative_bound<<" synthetic_only=true\n";
 const auto timing=Clock::now();for(int i=0;i<10;++i)Check(ValidateRecordingSourceBindingForSegment(o.binding,o.segment,&error),"FE07 structure-only validation iteration"+std::to_string(i));std::cout<<"[measure] structure_validate10_us="<<Us(timing)<<'\n';
 auto over=o.binding;over.samples.push_back({4097,0});Check(!ValidateRecordingSourceBindingV1(over,&error),"FE07 4097 structure refusal");
 std::map<unsigned,std::string> projected;
 for(bool legacy:{false,true})for(unsigned count:{2U,8U}){
 DerivedRecordingSelection sel;auto& ref=sel.reference;ref.reference_id="capacity-ref";ref.kind="event";ref.owner_id="capacity-event";ref.source_id=ref.channel_id="probe-channel";ref.analysis_namespace="capacity-ns";ref.analysis_track_id="capacity-track";ref.association_quality="timestamp-match";
 ref.original=RecordingConsumerOriginalV1{o.binding.source_generation,o.binding.generation_order,1,o.binding.track_id,o.binding.samples.front().pts_ns};ref.request=RecordingConsumerRequestV1{"media-pts-ms",0,static_cast<std::int64_t>(count)*1000,0,0};sel.expanded_end_ns=static_cast<std::int64_t>(count)*1000000000;sel.complete=true;
 std::vector<DerivedSourceEvidence> sources;for(unsigned i=0;i<count;++i){auto s=o.segment;auto b=o.binding;s.segment_id="capacity-"+std::to_string(i);s.order_sequence=i+1;b.segment_id=s.segment_id;if(legacy)b.file_evidence.reset();sources.push_back({s,b,false});DerivedSelectionSlice slice;slice.start_ns=static_cast<std::int64_t>(i)*1000000000;slice.end_ns=slice.start_ns+1000000000;slice.state=DerivedSliceState::Confirmed;slice.candidates.push_back({s,ref.original,slice.start_ns,slice.end_ns,{}});sel.slices.push_back(slice);}
 DerivedJobIntentV1 intent,roundtrip;error.clear();const bool built=BuildDerivedJobIntent(sel,sources,32U*1024*1024,1,&intent,&error);const auto serialized=built?SerializeDerivedJobIntent(intent):std::string{};const bool restored=built&&ParseDerivedJobIntent(serialized,&roundtrip,&error);
 std::cout<<"[observation] FE07 legacy="<<legacy<<" derived_sources="<<count<<" built="<<built<<" bytes="<<serialized.size()<<" parse="<<restored<<" error="<<error<<'\n';
 Check(built&&restored,"FE07 intent roundtrip source"+std::to_string(count)+" legacy"+std::to_string(legacy));
 if(!legacy)projected[count]=serialized;else Check(projected[count]==serialized,"FE08 projection preserves full intent bytes and ID source"+std::to_string(count));
 }
 Reopen(o,true,true);Reopen(o,false,false);
}
}
int main(int argc,char** argv) {
 if(argc!=2)return 2;gst_init(nullptr,nullptr);const std::filesystem::path root=argv[1];
 try{
 Output first;
 for(int which=1;which<=4;++which){auto input=which==1?Encode(501,false,false,160,90,30,250):Encode(which==4?12:30,which==3,which==2,160,90,30,250);Shift(input,0);if(which==1)input.packets.resize(300);
 if(which==4){std::int64_t t=0;for(std::size_t i=0;i<input.packets.size();++i){auto& p=input.packets[i];p.pts=p.dts=t;p.observation->pts_ns=t;p.observation->dts_ns=t;p.observation->duration_ns=i+1==input.packets.size()?70000000:(i%2?50000000:20000000);t+=*p.observation->duration_ns;}}
 const auto outputs=Record(root/("actual-"+std::to_string(which)),input,which==1?2000:10000);Check(outputs.size()==(which==1?2U:1U),"FE02 expected segment count");
 std::size_t output_index=0;for(const auto& o:outputs){context="TP0"+std::to_string(which)+"/segment"+std::to_string(output_index++);Check(o.binding.file_evidence.has_value(),"FE01 actual evidence persisted");const auto t=Clock::now();Check(Verify(o),"FE02 physical native and hash verification");std::cout<<"[measure] file_verify_us="<<Us(t)<<" file_bytes="<<o.segment.size_bytes<<'\n';}
 if(which==1)first=outputs.front();
 }
 context="TP01/contract";Contracts(first);context="TP01/malformed";ParserFailures(first,root);Reopen(first,true,true);Reopen(first,false,false);Ready(first);
 auto big=Encode(4096,false,false,160,90,30,10000);const auto full=Record(root/"cap4096",big);Check(full.size()==1,"FE07 4096 single segment");Capacity(full.front());Compatibility(full.front());CatalogCost(full.front(),root/"catalog8",false);CatalogCost(full.front(),root/"catalog8-legacy",true);
 auto capped=big;auto extra=capped.packets.back();++extra.observation->ordinal;extra.pts+=33333333;extra.dts+=33333333;extra.observation->pts_ns=extra.pts;extra.observation->dts_ns=extra.dts;capped.packets.push_back(extra);const auto overflow=Record(root/"cap4097",capped);
 Check(overflow.size()==1&&!overflow[0].binding.file_evidence&&!overflow[0].binding.index_complete,"FE08 cap keeps existing recording");
 auto repeated=Encode(12,false,false,160,90,30,250);for(auto& p:repeated.packets){p.payload=repeated.packets.front().payload;p.is_key_frame=true;}const auto duplicate=Record(root/"duplicate",repeated);Check(duplicate.size()==1&&!duplicate[0].binding.file_evidence,"FE08 ambiguous VCL keeps recording");
 auto missing=Encode(12,false,false,160,90,30,250);for(auto& p:missing.packets)p.observation->dts_ns.reset();const auto unsupported=Record(root/"missing-dts",missing);Check(unsupported.size()==1&&!unsupported[0].binding.file_evidence,"FE08 unsupported original DTS keeps recording");
 std::cout<<"[summary] checks_pass="<<passes<<" checks_fail=0 scope=file-evidence-storage-only derived-eight-cap=legacy-projection request_fully_satisfied=not-evaluated\n";return 0;
 }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}
}
