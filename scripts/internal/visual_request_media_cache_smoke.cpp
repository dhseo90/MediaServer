// 파일 용도: 제품 RequestMedia의 실제 용량/항목 eviction과 큰 증명의 uncached 경로를 검사한다.
// wrapper는 제품 cpp에서 이 클래스의 관측 필드 접근만 공개한 소유 복사본을 생성한다.
#include "recording_media_test_fixture.h"
#include "recording_writer_test_isolation.h"
#include "recording/recording_runtime_composition.h"
#include "visual_request_media_cache_under_test.cpp"
#include <fstream>
#include <future>
#include <fcntl.h>
#include <unistd.h>
namespace {
unsigned cache_checks=0;
void CacheCheck(bool ok,const std::string& name){++cache_checks;if(!ok)throw std::runtime_error(name);std::cout<<"PASS "<<name<<'\n';}
using Document=recording::VisualSearchDocument;
using Hold=std::shared_ptr<const recording::ResolvedRecordingMedia>;
using Cache=ingress::RequestMedia;
using Key=std::pair<std::string,std::string>;
int Descriptors(){int count=0;for(int fd=0;fd<4096;++fd)if(::fcntl(fd,F_GETFD)!=-1)++count;return count;}
auto End(){return std::chrono::steady_clock::now()+std::chrono::seconds(5);}
template<class Storage> std::vector<Document> Documents(Storage& runtime){
    std::vector<Document> result;std::string error;
    auto ids=runtime.catalog().FinalizedSegmentIdsForStartup();
    std::sort(ids.begin(),ids.end(),[&](const auto& a,const auto& b){return runtime.catalog().FindSegmentV2ById(a)->order_sequence<runtime.catalog().FindSegmentV2ById(b)->order_sequence;});
    for(const auto& id:ids){const auto segment=runtime.catalog().FindSegmentV2ById(id);const auto binding=runtime.catalog().FindSourceBinding(id);std::vector<Document> frames;
        CacheCheck(segment&&binding&&recording::RecordingVisualSource::SelectSamples(*segment,*binding,1,&frames,&error)&&!frames.empty(),"supported exact source frame");result.push_back(frames.front());}
    return result;
}
struct LegacyStorage {
            std::filesystem::path root_;recording::RecordingJournal journal_;recording::RecordingCatalog catalog_;
            static recording::RecordingCatalog::Options Options(const std::filesystem::path& p){recording::RecordingCatalog::Options o{p/"recording-catalog.sqlite3",p,true};o.enable_v2_storage=true;return o;}
            explicit LegacyStorage(const std::filesystem::path& p):root_(p),journal_(recording::RecordingJournal::ManagedOptions{p,{}}),catalog_(journal_,Options(p)){}
            bool Open(std::string* e){return journal_.Open(e)&&catalog_.Open(e);}
            recording::GStreamerSegmentWriter::Options WriterOptions(std::int64_t ms){
                recording::GStreamerSegmentWriter::Options o{root_,ms};o.managed_journal=&journal_;o.managed_catalog=&catalog_;o.managed_store_id=journal_.ManagedStoreId();return o;
            }
            auto& journal(){return journal_;}auto& catalog(){return catalog_;}
        };
template<class Storage> void Seed(Storage& runtime,int frames,int key,int duration){
    auto input=Encode(frames,false,false,160,90,30,key);Shift(input,7000000000ULL);std::string error;
    recording::GStreamerSegmentWriter writer(runtime.WriterOptions(duration));
    CacheCheck(writer.Start("cache-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"owned source writer");
    for(const auto& packet:input.packets)writer.Push(packet,0);
    writer.Stop();
}
void Resolve(Cache& cache,const Document& doc,Hold* hold=nullptr){
    recording::SearchSeekTarget target;std::string error;
    CacheCheck(cache.Resolve(doc,&target,hold,&error)&&target.seconds>=0&&target.seconds<.04&&target.basis=="verified-native-file-presentation","exact native result through cache: "+error);
}
void Limits(const Cache& cache){std::size_t sum=0;for(const auto& entry:cache.entries_)sum+=entry.second.bytes;
    std::cout<<"CACHE bytes="<<cache.bytes_<<" entries="<<cache.entries_.size()<<" prepared="<<cache.prepared_<<" peak="<<cache.peak_bytes_<<std::endl;
    CacheCheck(cache.bytes_==sum&&cache.bytes_<=8U*1024*1024&&cache.entries_.size()<=200,"actual cache entry and byte accounting bounded");}
}
int main(int argc,char** argv){try{
    if(argc!=2)return 2;
    const std::filesystem::path root(argv[1]);if(!RecordingWriterTestIsolation(root))return 2;
    gst_init(nullptr,nullptr);std::string error;
    {
        LegacyStorage runtime(root/"byte-limit");CacheCheck(runtime.Open(&error),"byte-limit store");Seed(runtime,12600,30,105000);
        const auto docs=Documents(runtime);CacheCheck(docs.size()==4,"four exact-capacity legacy 3150-sample files exercise common RequestMedia byte cap");
        recording::RecordingReadService reader(runtime.catalog());recording::RecordingVisualSource source(runtime.catalog(),reader);Hold response;
        const int baseline=Descriptors();
        // 결정적 순서: 준비된 reader를 유지한 채 다른 thread의 동일 파일 변경을 완료시킨다.
        {auto proof=source.Prepare(docs[0],&error,{},End());CacheCheck(bool(proof),"MEM88 prepared current source");
            const auto location=*runtime.catalog().FindSegmentMediaLocation(docs[0].segment_id);
            const auto file=location.first/location.second;
            std::promise<void> allow,changed,restore;auto start=allow.get_future();auto done=changed.get_future();auto resume=restore.get_future();
            auto mutation=std::async(std::launch::async,[&]{start.wait();std::fstream bytes(file,std::ios::binary|std::ios::in|std::ios::out);char saved=0;bytes.read(&saved,1);bytes.seekp(0);bytes.put(char(saved^1));bytes.flush();changed.set_value();resume.wait();bytes.seekp(0);bytes.put(saved);bytes.flush();return bool(bytes);});
            allow.set_value();done.wait();recording::SearchSeekTarget target;target.seconds=42;
            bool rejected=false;try{rejected=!source.ResolvePrepared(docs[0],*proof,&target,&error,{},End());}
            catch(...){restore.set_value();mutation.get();throw;}
            restore.set_value();const bool restored=mutation.get();
            CacheCheck(restored&&rejected&&target.seconds==42,"MEM88 held reader rejects concurrent same-file modification without publishing target");
        }
        {
            Cache cache(source,{},End());Resolve(cache,docs[0],&response);for(std::size_t i=1;i<docs.size();++i)Resolve(cache,docs[i]);Limits(cache);
            CacheCheck(!cache.entries_.empty()&&cache.entries_.size()<docs.size()&&cache.prepared_==docs.size()&&!cache.entries_.count(Key{docs[0].channel_id,docs[0].segment_id}),"8MiB actual LRU eviction occurs");
            CacheCheck(!runtime.catalog().RequestDeletion(docs[0].segment_id,"continuous-capacity",&error),"response hold protects evicted media");
            const auto location=*runtime.catalog().FindSegmentMediaLocation(docs[0].segment_id);const auto file=location.first/location.second;
            std::fstream bytes(file,std::ios::binary|std::ios::in|std::ios::out);char saved=0;bytes.read(&saved,1);bytes.seekp(0);bytes.put(char(saved^1));bytes.flush();
            recording::SearchSeekTarget target;target.seconds=42;const bool rejected=!cache.Resolve(docs[0],&target,nullptr,&error);
            bytes.seekp(0);bytes.put(saved);bytes.flush();CacheCheck(bool(bytes),"owned media byte restored");
            CacheCheck(rejected&&target.seconds==42&&!cache.entries_.count(Key{docs[0].channel_id,docs[0].segment_id}),"evicted source is fully rechecked and tamper preserves output");
            Resolve(cache,docs[0]);Limits(cache);CacheCheck(cache.prepared_==docs.size()+1,"evicted valid source requires new full preparation");
        }
        CacheCheck(!runtime.catalog().RequestDeletion(docs[0].segment_id,"continuous-capacity",&error),"response hold survives entire cache destruction");response.reset();
        CacheCheck(Descriptors()==baseline&&runtime.catalog().RequestDeletion(docs[0].segment_id,"continuous-capacity",&error),"byte-limit request releases FD and retention holds");
    }
    {
        recording::RecordingRuntimeStorage runtime(root/"entry-limit");CacheCheck(runtime.Open(&error),"entry-limit store");Seed(runtime,201,1,1);
        const auto docs=Documents(runtime);CacheCheck(docs.size()==201,"201 exact single-frame segments");
        recording::RecordingReadService reader(runtime.catalog());recording::RecordingVisualSource source(runtime.catalog(),reader);Hold response;
        const int baseline=Descriptors();
        {
            Cache cache(source,{},End());
            for(std::size_t i=0;i<docs.size();++i)Resolve(cache,docs[i],i==0?&response:nullptr);
            Limits(cache);CacheCheck(cache.entries_.size()==200&&cache.prepared_==201&&!cache.entries_.count(Key{docs[0].channel_id,docs[0].segment_id}),"200-entry actual LRU eviction occurs");
            Resolve(cache,docs[0]);Limits(cache);CacheCheck(cache.prepared_==202&&!cache.entries_.count(Key{docs[1].channel_id,docs[1].segment_id}),"entry eviction reacquires oldest source and updates LRU");
        }
        CacheCheck(!runtime.catalog().RequestDeletion(docs[0].segment_id,"continuous-capacity",&error),"entry eviction retains separate response hold");response.reset();
        {
            // Same selection/error order. Reacquiring an early final source must
            // not evict another final source when a discarded candidate exists.
            const std::vector<recording::VisualSearchHit> selected{{0,1},{1,.9},{2,.8},{1,.7}};
            Cache cache(source,{},End());for(const auto& doc:docs)Resolve(cache,doc);
            cache.FinalResults(selected,docs);Resolve(cache,docs[0]);
            CacheCheck(cache.prepared_==202&&cache.entries_.count(Key{docs[1].channel_id,docs[1].segment_id})&&
                !cache.entries_.count(Key{docs[3].channel_id,docs[3].segment_id}),"final miss evicts nonselected candidate before still-needed source");
            Resolve(cache,docs[1]);CacheCheck(cache.entries_.at(Key{docs[1].channel_id,docs[1].segment_id}).remaining_results==1,"same source remains needed for a later selected sample");
            Resolve(cache,docs[2]);Resolve(cache,docs[1]);Limits(cache);
            CacheCheck(cache.prepared_==202&&cache.final_next_==selected.size(),"final sources revalidate without cascading re-preparation");
        }
        CacheCheck(Descriptors()==baseline,"final selection borrowing releases all descriptors");
        CacheCheck(Descriptors()==baseline&&runtime.catalog().RequestDeletion(docs[0].segment_id,"continuous-capacity",&error),"entry-limit request releases FD and retention holds");
        // 유효 V2 JSON의 큰 선택적 설명은 큰 증명을 cache 밖에서 다루는 정상 입력이다.
        const auto large_case=[&](auto& oversized,const std::filesystem::path& large_root,bool compact){
        const bool large_open=oversized.Open(&error);CacheCheck(large_open,"large store: "+error);
        auto segment=*runtime.catalog().FindSegmentV2ById(docs[1].segment_id);auto binding=*runtime.catalog().FindSourceBinding(docs[1].segment_id);
        const auto original=*runtime.catalog().FindSegmentMediaLocation(segment.segment_id);recording::RecordingOrderReservationV1 order;
        const auto store=oversized.journal().ManagedStoreId();CacheCheck(oversized.catalog().ReserveRecordingOrder(store,"oversized-order","oversized-segment","cache-channel",&order,&error),"oversized native reservation");
        segment.segment_id=order.segment_id;segment.order_request_id=order.request_id;segment.store_id=store;segment.order_sequence=order.sequence;segment.audio_omitted_reason="x";
        const std::size_t target_json_bytes=1024U*1024-1024;
        const auto initial_json_bytes=recording::SerializeRecordingSegmentV2(segment).size();
        CacheCheck(initial_json_bytes<target_json_bytes,"oversized fixture has description capacity");
        segment.audio_omitted_reason.assign(target_json_bytes-initial_json_bytes+1,'x');
        CacheCheck(recording::SerializeRecordingSegmentV2(segment).size()==target_json_bytes,"oversized segment remains below 1MiB JSON limit");
        binding.segment_id=segment.segment_id;binding.store_id=store;
        CacheCheck(recording::ValidateRecordingSegmentV2(segment,&error)&&recording::ValidateRecordingSourceBindingForSegment(binding,segment,&error),"oversized input remains in public V2 contract");
        const auto file=large_root/"cache-channel/oversized.mp4";std::filesystem::create_directories(file.parent_path());std::filesystem::copy_file(original.first/original.second,file);
        CacheCheck(oversized.catalog().FinalizeBoundSegmentV2(segment,binding,file.string(),&error),"oversized original finalized: "+error);
        const auto large_docs=Documents(oversized);CacheCheck(large_docs.size()==1,"oversized exact document");
        recording::RecordingReadService large_reader(oversized.catalog());recording::RecordingVisualSource large_source(oversized.catalog(),large_reader);
        const int large_baseline=Descriptors();
        {auto proof=large_source.Prepare(large_docs[0],&error,{},End());
            std::cout<<"OBS oversized segmentJsonBytes="<<recording::SerializeRecordingSegmentV2(segment).size()<<" retainedBytes="<<(proof?proof->retained_bytes():0)<<" cacheLimitBytes="<<8U*1024*1024<<'\n';
            CacheCheck(proof&&(compact?proof->retained_bytes()<=8U*1024*1024:proof->retained_bytes()>8U*1024*1024),"real compact/fallback single proof byte boundary");}
        {Cache cache(large_source,{},End());Resolve(cache,large_docs[0],&response);Resolve(cache,large_docs[0]);Limits(cache);
            CacheCheck(compact?(cache.entries_.size()==1&&cache.prepared_==1&&cache.reused_==1):(cache.entries_.empty()&&cache.bytes_==0&&cache.prepared_==2&&cache.reused_==0),"compact large proof caches; oversized legacy proof remains uncached");}
        CacheCheck(!oversized.catalog().RequestDeletion(segment.segment_id,"continuous-capacity",&error),"oversized temporary proof retains response hold");response.reset();
        CacheCheck(Descriptors()==large_baseline&&oversized.catalog().RequestDeletion(segment.segment_id,"continuous-capacity",&error),"oversized request releases FD and retention holds");
        };
        recording::RecordingRuntimeStorage compact_large(root/"large-compact");large_case(compact_large,root/"large-compact",true);
        LegacyStorage legacy_large(root/"large-legacy");
        large_case(legacy_large,root/"large-legacy",false);
    }
    std::cout<<"PASS cache boundaries checks="<<cache_checks<<'\n';return 0;
}catch(const std::exception& e){std::cerr<<"FAIL cache boundary "<<e.what()<<" checks="<<cache_checks<<'\n';return 1;}}
