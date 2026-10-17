// R152: 단일 canonical store의 synthetic 입력/실제 서비스 적격성. 비용 계측 아님.
#define RECORDING_DEGRADED_HTTP_NO_MAIN
#include "recording_degraded_http_smoke.cpp"
#include "ingress/va_review_application_service.h"
#include <sodium.h>

namespace {
std::string Q152(const std::string& s){return recording::EvidenceJsonQuote(s);}
std::atomic<bool> failed152{false}, outputFailed153{false};
std::mutex eventMutex153, failureMutex153;
void Event152(const char* phase,const std::string& fields=""){
 const auto row="[R153] {\"phase\":"+Q152(phase)+",\"monoNs\":"+std::to_string(SourceHttpSteadyNs())+fields+"}\n";
 std::lock_guard<std::mutex> lock(eventMutex153);
 if(std::fwrite(row.data(),1,row.size(),stdout)!=row.size()||std::fflush(stdout)!=0){outputFailed153=true;throw std::runtime_error("diagnostic output failure");}
}
void Failure152(const std::string& error) noexcept {
 std::lock_guard<std::mutex> firstFailureLock(failureMutex153);
 if(failed152.exchange(true))return;
 try {auto safe=error.substr(0,256);if(safe.find('/')!=std::string::npos||safe.find("Bearer")!=std::string::npos)safe="private detail redacted";
 Event152("first-failure",",\"error\":"+Q152(safe));}
 catch(...){outputFailed153=true;std::fputs("[R153-output-failure] first error output failed\n",stderr);std::fflush(stderr);}
}
template<class F> void CaptureFailure153(F&& action){try{action();}catch(const std::exception& e){Failure152(e.what());throw;}catch(...){Failure152("unknown fixture failure");throw;}}
template<class F> bool Cleanup153(const char* stage,F&& action) noexcept {
 try{action();return true;}catch(...){Failure152("cleanup operation failed");try{Event152("cleanup-error",",\"stage\":"+Q152(stage));}catch(...){outputFailed153=true;}return false;}
}
std::string FdHash153(int fd,std::uint64_t expected){
 struct stat before{},after{};NeedHttp(fd>=0&&fstat(fd,&before)==0&&S_ISREG(before.st_mode)&&before.st_size>=0&&std::uint64_t(before.st_size)==expected,"media FD regular/size");
 crypto_hash_sha256_state hash;crypto_hash_sha256_init(&hash);std::array<unsigned char,65536> buffer{};std::uint64_t offset=0;
 while(offset<expected){const auto wanted=std::min<std::uint64_t>(buffer.size(),expected-offset);ssize_t n;do{n=pread(fd,buffer.data(),wanted,offset);}while(n<0&&errno==EINTR);NeedHttp(n>0&&std::uint64_t(n)<=wanted,"media short read");crypto_hash_sha256_update(&hash,buffer.data(),n);offset+=n;}
 unsigned char extra;ssize_t n;do{n=pread(fd,&extra,1,expected);}while(n<0&&errno==EINTR);
 NeedHttp(n==0&&fstat(fd,&after)==0&&before.st_dev==after.st_dev&&before.st_ino==after.st_ino&&before.st_size==after.st_size,"media EOF/current size");
 unsigned char digest[crypto_hash_sha256_BYTES];crypto_hash_sha256_final(&hash,digest);char hex[crypto_hash_sha256_BYTES*2+1];sodium_bin2hex(hex,sizeof(hex),digest,sizeof(digest));return hex;
}
void VerifyMedia153(recording::RecordingCatalog& catalog,recording::RecordingReadService& reader,const recording::RecordingSegmentV2& segment,const recording::RecordingSourceBindingV1& binding,bool decode){
 std::string error;NeedHttp(recording::ValidateRecordingSourceBindingForSegment(binding,segment,&error),"media source binding identity");
 auto media=reader.ResolveMedia(segment.channel_id,segment.segment_id);NeedHttp(bool(media),"V2 media resolve/inspection");
 NeedHttp(media->size_bytes()==segment.size_bytes&&FdHash153(media->fd(),segment.size_bytes)==segment.checksum_sha256,"media FD hash");
 NeedHttp(binding.file_evidence&&binding.file_evidence->file_size_bytes==segment.size_bytes&&binding.file_evidence->file_sha256==segment.checksum_sha256,"binding file evidence");
 if(decode){recording::VisualRgbFrame frame;NeedHttp(recording::DecodeVisualFrame(media->fd(),media->size_bytes(),0,&frame,&error,{},5000,recording::StoredVisualIndexDecodePolicy()),"representative exact decode");NeedHttp(frame.presentation_ns==0&&!frame.rgb.empty(),"representative target0");Event152("media-decode",",\"channel\":"+Q152(segment.channel_id)+",\"segment\":"+Q152(segment.segment_id)+",\"targetNs\":0");}
 const auto current=catalog.FindSegmentV2ById(segment.segment_id);const auto bound=catalog.FindSourceBinding(segment.segment_id);
 NeedHttp(current&&bound&&recording::SameRecordingSegmentV2Content(segment,*current)&&recording::ValidateRecordingSourceBindingForSegment(*bound,*current,&error),"media final binding");
}
std::string Text152(const std::string& json,const char* field){StrictJsonObjectDocument d;std::string e;NeedHttp(ParseStrictJsonObjectDocument(json,&d,&e),"JSON object");auto s=StrictJsonStringField(d,field);NeedHttp(s&&!s->empty(),field);return *s;}
std::string Escape152(const std::string& s){return recording_public_fresh_oracle::QueryEscape(s);}
struct Response152 {std::string body;double ms;};
Response152 Http152(std::uint16_t port,const std::string& route,unsigned id,int expected=200,
 const std::string& body="",int auth=1,int connected=-1) try {
 Socket c;c.fd=connected;NeedHttp(!failed152.load(),"prior failure blocks HTTP");
 const auto begin=Clock::now();HttpObservation observation{id,"r152",route,begin};
 if(c.fd<0){c.fd=socket(AF_INET,SOCK_STREAM,0);NeedHttp(c.fd>=0,"socket");sockaddr_in a{};a.sin_family=AF_INET;a.sin_port=htons(port);inet_pton(AF_INET,"127.0.0.1",&a.sin_addr);NeedHttp(!connect(c.fd,reinterpret_cast<sockaddr*>(&a),sizeof(a)),"connect");}
 timeval timeout{5,0};setsockopt(c.fd,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));setsockopt(c.fd,SOL_SOCKET,SO_SNDTIMEO,&timeout,sizeof(timeout));
 const std::string token=auth==1?"owned-http85-admin-token":auth==2?"owned-http85-viewer-token":"";
 const std::string request=(body.empty()?"GET ":"POST ")+route+" HTTP/1.1\r\nHost: localhost\r\n"+(token.empty()?"":"Authorization: Bearer "+token+"\r\n")+"Connection: close\r\n"+(body.empty()?"":"Content-Type: application/json\r\nContent-Length: "+std::to_string(body.size())+"\r\n")+"\r\n"+body;
 NeedHttp(webrtc_http_server_detail::SendAll(c.fd,request),"send");const auto wire=Drain(c.fd,begin+std::chrono::seconds(5),observation);
 const auto end=wire.find("\r\n\r\n");NeedHttp(end!=std::string::npos&&wire.size()>=12,"HTTP complete headers");
 const double ms=std::chrono::duration<double,std::milli>(Clock::now()-begin).count();
 const auto length=wire.find("Content-Length: ");NeedHttp(length!=std::string::npos&&length<end,"HTTP content length");NeedHttp(std::stoull(wire.substr(length+16))==wire.size()-end-4,"HTTP complete body");
 const int status=std::stoi(wire.substr(9,3));Event152("http",",\"id\":"+std::to_string(id)+",\"status\":"+std::to_string(status)+",\"ms\":"+std::to_string(ms)+",\"bytes\":"+std::to_string(wire.size()));
 if(status!=expected){std::cerr<<"[R152-http-error] "<<wire.substr(end+4)<<std::endl;throw std::runtime_error("unexpected HTTP status");}
 NeedHttp(ms<=5000,"HTTP deadline");if(id>=10&&id<=13)NeedHttp(ms<=2000,"normal search latency bound");return {wire.substr(end+4),ms};
}catch(const std::exception& e){Failure152(e.what());throw;}
std::string First152(const std::string& json,const char* track=nullptr){StrictJsonObjectDocument d;std::string e,id;NeedHttp(ParseStrictJsonObjectDocumentObjectArray(json,"items",&d,[&](const auto& item){
 if(id.empty()&&(!track||StrictJsonStringField(item,"track")==std::optional<std::string>(track)))id=StrictJsonStringField(item,"id").value_or("");return true;},&e),"search items");NeedHttp(!id.empty(),"search hit");return id;}
void ReadPackage152(recording::RecordingCatalog& catalog,const std::filesystem::path& store,std::uint16_t port,const std::string& id,unsigned request,bool analysis=false){
 recording::EvidencePackageStore packages(store/"evidence-packages",{},catalog.SearchResidency(),catalog.ScratchResidency());std::string error;
 auto file=packages.Open(id,&error);NeedHttp(bool(file),error.c_str());NeedHttp(!file->manifest().frames.empty()&&!file->manifest().assets.empty(),"real evidence frames/assets");
 const std::string route=analysis?"/ops/api/recordings/a-record-packages/":"/ops/api/recordings/evidence/";
 (void)Http152(port,route+id,request);
 for(std::size_t i=0;i<file->manifest().assets.size();++i){const auto response=Http152(port,route+id+"/assets/"+std::to_string(i),request+1+i);const auto& a=file->manifest().assets[i];NeedHttp(response.body.size()==a.size_bytes&&recording::EvidenceSha256(response.body.data(),response.body.size())==a.sha256,"independent HTTP asset readback");}
 Event152("package-readback",",\"id\":"+Q152(id)+",\"assets\":"+std::to_string(file->manifest().assets.size()));
}
void Accumulate152(recording::RecordingRuntimeStorage& runtime,const std::filesystem::path& root){
 auto input=MixedInput(root);std::filesystem::copy_file(root/"mixed-input.mp4",root/"input"/"r118.mp4");
 NeedHttp(input.packets.size()==120,"fixed input sample count");
 for(const auto* channel:{"9101","9201"})for(unsigned g=0;g<4;++g){
  auto batch=input;const std::string label=std::string("r152-synthetic-")+channel+"-"+std::to_string(g);const auto generation=recording::EvidenceSha256(label.data(),label.size());
  for(auto& p:batch.packets){auto& o=*p.observation;o.source_generation=generation;o.generation_order=g+1;o.clock_process_id="r152-owned-clock";o.mono_before_ns=1000000000+p.pts;o.mono_after_ns=o.mono_before_ns+1000;o.observed_utc_ns=1791887400000000000LL+g*4000000000LL+p.pts;}
  recording::GStreamerSegmentWriter writer(runtime.WriterOptions(2000));std::string e;NeedHttp(writer.Start(channel,"r152",batch.descriptor,[](auto,auto,auto*){return false;},&e),e.c_str());for(const auto& p:batch.packets)writer.Push(p,0);writer.Stop();
 }
}
void Manifest152(recording::RecordingCatalog& catalog,recording::RecordingReadService& reader,const std::string& a_id){
 std::map<std::string,unsigned> files,samples;std::map<std::string,std::set<std::pair<std::string,std::uint64_t>>> ordinals;
 std::string rows="[";bool comma=false;
 for(const auto& id:catalog.FinalizedSegmentIdsForStartup()){
  const auto segment=catalog.FindSegmentV2ById(id);const auto b=catalog.FindSourceBinding(id);NeedHttp(segment&&b&&b->file_evidence,"finalized binding evidence");const auto channel=segment->channel_id;
  NeedHttp(channel=="1"||channel=="9101"||channel=="9201","channel set");VerifyMedia153(catalog,reader,*segment,*b,channel!="1"&&files[channel]==0);
  ++files[channel];samples[channel]+=b->samples.size();for(const auto& s:b->samples){NeedHttp(ordinals[channel].emplace(b->source_generation,s.ordinal).second,"duplicate generation/ordinal");if(channel!="1")NeedHttp(s.ordinal>=1&&s.ordinal<=120&&b->generation_order>=1&&b->generation_order<=4,"fixed generation/ordinal range");}
  if(comma)rows+=',';comma=true;rows+="{\"channel\":"+Q152(channel)+",\"segment\":"+Q152(id)+",\"generation\":"+Q152(b->source_generation)+",\"bindingSegment\":"+Q152(b->segment_id)+",\"bindingChannel\":"+Q152(b->channel_id)+",\"inspection\":true,\"samples\":"+std::to_string(b->samples.size())+",\"firstOrdinal\":"+std::to_string(b->samples.front().ordinal)+",\"lastOrdinal\":"+std::to_string(b->samples.back().ordinal)+",\"bytes\":"+std::to_string(segment->size_bytes)+",\"sha256\":"+Q152(segment->checksum_sha256)+"}";
 }
 NeedHttp(files["1"]==1&&files["9101"]==8&&files["9201"]==8&&samples["1"]==30&&samples["9101"]==480&&samples["9201"]==480,"fixed accumulated counts");
 for(const auto* channel:{"9101","9201"})for(unsigned g=0;g<4;++g){const std::string label=std::string("r152-synthetic-")+channel+"-"+std::to_string(g);const auto generation=recording::EvidenceSha256(label.data(),label.size());for(unsigned n=1;n<=120;++n)NeedHttp(ordinals[channel].count({generation,n})==1,"fixed expected sample set");}
 NeedHttp(catalog.FindSourceBinding(a_id).has_value(),"A binding retained");Event152("manifest",",\"synthetic\":true,\"rows\":"+rows+"]");
}
}
#ifndef RECORDING_ACCUMULATED_NO_MAIN
int main(int argc,char** argv){
 if(argc!=3||!RecordingWriterTestIsolation(argv[1]))return 2;
 (void)&Request; // included legacy GET helper; R152 uses its bounded Drain with POST too.
 std::shared_ptr<recording::SearchModelResidency> owner;std::shared_ptr<recording::RecordingScratchResidency> scratch;
 try{const std::filesystem::path root(argv[1]),store=root/"recording";Observer107(nullptr);gst_init(nullptr,nullptr);std::string error;
 {recording::RecordingRuntimeStorage runtime(store);CaptureFailure153([&]{NeedHttp(runtime.Open(&error),error.c_str());});struct Finish152{recording::RecordingRuntimeStorage& runtime;bool done=false;~Finish152(){if(!done)Cleanup153("runtime-finish",[&]{std::string e;const bool ok=runtime.Finish(&e);Event152("failure-cleanup-finish",",\"ok\":"+std::string(ok?"true":"false"));if(!ok)throw std::runtime_error("failure Finish");});}} finish{runtime};CaptureFailure153([&]{auto& catalog=runtime.catalog();owner=catalog.SearchResidency();scratch=catalog.ScratchResidency();
 const auto initial=catalog.FinalizedSegmentIdsForStartup();NeedHttp(initial.size()==1,"A seed first and only finalized source");const auto a_id=initial.front();const auto a_raw=Read(store/"confirmed-seed.json");const auto a_package=Text152(a_raw,"packageId");const auto a_bytes=Read(store/"evidence-packages"/(a_package+".evp"));NeedHttp(!a_bytes.empty(),"seed package");
 Event152("seed-verified",",\"segment\":"+Q152(a_id)+",\"package\":"+Q152(a_package));
 recording::RecordingReadService reader(catalog);
 Accumulate152(runtime,root);Manifest152(catalog,reader,a_id);NeedHttp(Read(store/"evidence-packages"/(a_package+".evp"))==a_bytes,"A seed package unchanged after accumulation");
 {
 std::unique_ptr<VisualSearchApplicationService> visualOwner;std::unique_ptr<EvidenceApplicationService> evidenceOwner;std::unique_ptr<VaReviewApplicationService> reviewsOwner;std::unique_ptr<RecordingApplicationService> appOwner;
 Media media;Lifecycle lifecycle;Reads reads;std::unique_ptr<WebRtcHttpServer> serverOwner;
 struct Stop153 {decltype(serverOwner)& server;decltype(visualOwner)& visual;decltype(evidenceOwner)& evidence;decltype(reviewsOwner)& reviews;bool done=false,ok=true;
 void Run() noexcept {if(done)return;done=true;if(server)ok=Cleanup153("http-stop",[&]{server->Stop();})&&ok;if(visual)ok=Cleanup153("visual-stop",[&]{visual->Stop();})&&ok;if(reviews)ok=Cleanup153("review-stop",[&]{reviews->Stop();})&&ok;if(evidence)ok=Cleanup153("evidence-stop",[&]{evidence->Stop();})&&ok;}
 ~Stop153(){Run();}} stop{serverOwner,visualOwner,evidenceOwner,reviewsOwner};
 CaptureFailure153([&]{VisualSearchApplicationService::Options options;options.enabled=true;options.model_directory=argv[2];options.cache_directory=(store/"visual-cache").string();options.scan_seconds=1;options.sample_seconds=1;
 Observer107("model");visualOwner=std::make_unique<VisualSearchApplicationService>(catalog,reader,options,[](auto* channels){*channels={"9101","9201"};return true;});auto& visual=*visualOwner;
 Observer107("live");evidenceOwner=std::make_unique<EvidenceApplicationService>(catalog,reader,true,store/"evidence-packages",64ULL*1024*1024);auto& evidence=*evidenceOwner;
 reviewsOwner.reset(new VaReviewApplicationService(store,true,{},64ULL*1024*1024,{},std::chrono::minutes(5),owner,scratch));auto& reviews=*reviewsOwner;
 appOwner.reset(new RecordingApplicationService(reader,catalog,true,{}, {},&visual,&evidence,&reviews));
 WebRtcHttpRuntimeConfig config;config.auth_mode=HttpAuthMode::Token;config.auth_admin_token="owned-http85-admin-token";config.auth_viewer_token="owned-http85-viewer-token";config.enable_ops=true;config.auth_users_file=(root/"users.json").string();config.source_registry_path=(root/"sources.json").string();config.analysis_registry_path=(root/"analysis.json").string();config.file_root_path=(root/"input").string();
 serverOwner=std::make_unique<WebRtcHttpServer>(media,lifecycle,reads,config,appOwner.get());auto& server=*serverOwner;
 auto authorize=[](const std::string& c){return c=="9101"||c=="9201";};const auto ready_end=Clock::now()+std::chrono::seconds(60);bool ready=false;
 while(Clock::now()<ready_end){if(visual.Status(authorize).body.find("\"searchAvailable\":true")!=std::string::npos){ready=true;break;}std::this_thread::sleep_for(std::chrono::milliseconds(100));}NeedHttp(ready,"visual readiness within60s");
 {const auto view=VisualSearchPublicationTestProbe::View(visual);NeedHttp(view.index&&view.publication,"real index");std::set<std::string> indexed;for(const auto& d:view.index->documents())indexed.insert(d.segment_id);for(const auto& id:catalog.FinalizedSegmentIdsForStartup())if(id!=a_id)NeedHttp(indexed.count(id),"all accumulated media actually indexed");Event152("visual-ready",",\"documents\":"+std::to_string(view.index->documents().size()));}
 NeedHttp(server.Start("127.0.0.1",0,&error),error.c_str());const auto port=RecordingHttpOwnershipProbe::Port(server);Event152("server",",\"port\":"+std::to_string(port));
 const std::string sq="channelIds=9101&startTimeMs=1791887399000&endTimeMs=1791887420000&limit=20&includeUnplaced=true";
 (void)Http152(port,"/ops/api/recordings/search?"+sq,1,401,"",0);
 (void)Http152(port,"/ops/api/recordings/a-record-reviews/drafts",2,403,"{}",2);
 (void)Http152(port,"/ops/api/recordings/a-record-packages/"+a_package,3);
 const auto original_media=Http152(port,"/ops/api/recordings/media/"+a_id,4);NeedHttp(recording::EvidenceSha256(original_media.body.data(),original_media.body.size())==catalog.FindSegmentV2ById(a_id)->checksum_sha256,"A original HTTP byte readback");WaitIdle(server);Event152("auth-seed-ready");
 std::atomic<unsigned> writes{0},removed{0};std::atomic<std::uint64_t> started{0};std::exception_ptr bgerror;
 std::thread background([&]{try{RunHttpSources(runtime,root,1200,writes,removed,&started);}catch(const std::exception& e){Failure152(e.what());bgerror=std::current_exception();}catch(...){Failure152("unknown background failure");bgerror=std::current_exception();}});
 struct Join152{std::thread& t;~Join152(){if(t.joinable())t.join();}} join{background};
 try {
 const auto source_end=Clock::now()+std::chrono::seconds(10);while(!started&&Clock::now()<source_end)std::this_thread::sleep_for(std::chrono::milliseconds(10));NeedHttp(started!=0,"background source started");
 // Four connected sockets are observed by the real server before simultaneous request release.
 std::array<Socket,4> sockets;for(auto& c:sockets){c.fd=socket(AF_INET,SOCK_STREAM,0);NeedHttp(c.fd>=0,"parallel socket");sockaddr_in a{};a.sin_family=AF_INET;a.sin_port=htons(port);inet_pton(AF_INET,"127.0.0.1",&a.sin_addr);NeedHttp(!connect(c.fd,reinterpret_cast<sockaddr*>(&a),sizeof(a)),"parallel connect");}
 const auto accept_end=Clock::now()+std::chrono::seconds(1);while(RecordingHttpOwnershipProbe::Active(server)<4&&Clock::now()<accept_end)std::this_thread::sleep_for(std::chrono::milliseconds(1));NeedHttp(RecordingHttpOwnershipProbe::Active(server)>=4,"four actual accepted connections");Event152("four-accepted");
 std::promise<void> release;auto released=release.get_future().share();std::array<std::future<Response152>,4> futures;
 struct Release152{std::promise<void>& p;bool done=false;~Release152(){if(!done)p.set_value();}} release_guard{release};
 try {for(unsigned i=0;i<4;++i){const int fd=sockets[i].fd;futures[i]=std::async(std::launch::async,[&,i,fd]{released.wait();return Http152(port,i<2?"/ops/api/recordings/search?"+sq:"/ops/api/recordings/visual-search?channelIds=9101,9201&text=ball&limit=20&threshold=-1",10+i,200,"",1,fd);});sockets[i].fd=-1;}}catch(const std::exception& e){Failure152(e.what());throw;}release.set_value();release_guard.done=true;std::array<Response152,4> responses;for(unsigned i=0;i<4;++i){responses[i]=futures[i].get();NeedHttp(!First152(responses[i].body).empty(),"nonempty search");}Event152("four-complete");
 const auto selected=sq+"&snapshotId="+Escape152(Text152(responses[0].body,"snapshotId"))+"&hitId="+Escape152(First152(responses[0].body));
 auto package=Http152(port,"/ops/api/recordings/search/evidence?"+selected,20,201,"{}");ReadPackage152(catalog,store,port,Text152(package.body,"id"),21);
 // Visual response carries exact channel, not the multi-channel query as a seek scope.
 StrictJsonObjectDocument vd;std::string visual_id,visual_channel;NeedHttp(ParseStrictJsonObjectDocumentObjectArray(responses[2].body,"items",&vd,[&](const auto& item){if(visual_id.empty()){visual_id=StrictJsonStringField(item,"id").value_or("");visual_channel=StrictJsonStringField(item,"channelId").value_or("");}return true;},&error),"visual selection");
 package=Http152(port,"/ops/api/recordings/visual-search/evidence?channelId="+Escape152(visual_channel)+"&hitId="+Escape152(visual_id),40,201,"{}");ReadPackage152(catalog,store,port,Text152(package.body,"id"),41);Event152("evidence-complete");
 StrictJsonObjectDocument seed;NeedHttp(ParseStrictJsonObjectDocument(a_raw,&seed,&error),"seed metadata");NeedHttp(seed.Find("startTimeMs")&&seed.Find("endTimeMs"),"seed time fields");
 std::string aq="channelIds=1&object=synthetic-target&includeUnplaced=true&startTimeMs="+seed.Find("startTimeMs")->raw+"&endTimeMs="+seed.Find("endTimeMs")->raw;
 Event152("a-prepare-start");const auto found=Http152(port,"/ops/api/recordings/search?"+aq,60);aq+="&snapshotId="+Escape152(Text152(found.body,"snapshotId"))+"&hitId="+Escape152(First152(found.body,"track-77"));
 package=Http152(port,"/ops/api/recordings/search/a-record-evidence?"+aq,61,201,"{}");const auto pid=Text152(package.body,"id");ReadPackage152(catalog,store,port,pid,62,true);const auto pack=Http152(port,"/ops/api/recordings/a-record-packages/"+pid,75);
 NeedHttp(Text152(pack.body,"targetLabel")=="track-77"&&Text152(pack.body,"analysisNamespace")=="synthetic-analysis-tap","A exact current binding");
 const auto draft=Http152(port,"/ops/api/recordings/a-record-reviews/drafts",76,201,"{\"packageId\":"+Q152(pid)+",\"targetKey\":"+Q152(Text152(pack.body,"targetKey"))+",\"question\":\"synthetic A visibility\",\"claims\":[{\"relation\":\"visibility-at\",\"requiredColor\":\"red\",\"requiredVisible\":true,\"frames\":[0]}]}");
 (void)Http152(port,"/ops/api/recordings/a-record-reviews/drafts/"+Text152(draft.body,"id")+"/confirm",77,200,"{\"revision\":"+Q152(Text152(draft.body,"revision"))+"}");Event152("a-prepare-complete");
 background.join();if(bgerror)std::rethrow_exception(bgerror);NeedHttp(writes>=6,"background durable progress");NeedHttp(Read(store/"evidence-packages"/(a_package+".evp"))==a_bytes,"A original package preserved");Event152("background-complete",",\"writes\":"+std::to_string(writes)+",\"removed\":"+std::to_string(removed));
 }catch(const std::exception& e){Failure152(e.what());throw;}
 WaitIdle(server);stop.Run();NeedHttp(stop.ok,"normal service cleanup");Socket probe;probe.fd=socket(AF_INET,SOCK_STREAM,0);sockaddr_in addr{};addr.sin_family=AF_INET;addr.sin_port=htons(port);inet_pton(AF_INET,"127.0.0.1",&addr.sin_addr);NeedHttp(connect(probe.fd,reinterpret_cast<sockaddr*>(&addr),sizeof(addr))!=0&&errno==ECONNREFUSED,"port closed");Event152("services-stopped");
 });}
 NeedHttp(runtime.Finish(&error),error.c_str());finish.done=true;Event152("finish");
 });}
 const auto usage=scratch->usage();NeedHttp(owner->used()==0&&usage.ram_bytes==0&&usage.disk_bytes==0&&usage.file_descriptors==0,"final logical owner release");Event152("complete",",\"logicalRam\":0,\"scratch\":0,\"fd\":0");return 0;
 }catch(const std::exception& e){Failure152(e.what());try{Event152("terminal",",\"exit\":1,\"outputFailed\":"+std::string(outputFailed153?"true":"false"));}catch(...){}return 1;
 }catch(...){if(!failed152.load())Failure152("unknown outer fixture failure");try{Event152("terminal",",\"exit\":1,\"outputFailed\":"+std::string(outputFailed153?"true":"false"));}catch(...){}return 1;}
}

#endif
