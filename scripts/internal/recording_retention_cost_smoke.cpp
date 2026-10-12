// 실제 원본 append/삭제로 이력만 증가시킨 뒤 같은 retention 후보의 비용을 비교한다.
#define main RetentionCostMediaFixtureMain
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording/recording_latency_trace.h"
#include <set>
#include "recording_writer_test_isolation.h"
#include "recording/recording_runtime_composition.h"

int main(int argc,char** argv) try {
    if(argc!=2)return 2;
    if(!RecordingWriterTestIsolation(std::filesystem::path(argv[1])))return 2;
    gst_init(nullptr,nullptr);const std::filesystem::path root=argv[1];
    auto input=Encode(12,false,false);const auto original=Record(root/"input",input).at(0);
    std::string error;std::map<std::string,std::string> expected;
    {
        const auto store_root=root/"store";RecordingRuntimeStorage store(store_root);
        Check(store.Open(&error)&&store.catalog().ScratchResidency()->usage().disk_bytes>0,"R92 actual generation Open "+error);
        const auto add=[&](const std::string& id){
            auto o=original;o.root=store_root;o.file=store_root/(id+".mp4");
            o.segment.store_id=store.journal().ManagedStoreId();o.binding.store_id=o.segment.store_id;
            o.segment.segment_id=id;o.segment.order_request_id="order-"+id;o.binding.segment_id=id;
            RecordingOrderReservationV1 order;
            Check(store.catalog().ReserveRecordingOrder(o.segment.store_id,o.segment.order_request_id,id,o.segment.channel_id,&order,&error),"R92 reserve "+error);
            o.segment.order_sequence=order.sequence;
            std::filesystem::copy_file(original.file,o.file);
            Check(store.catalog().FinalizeBoundSegmentV2(o.segment,o.binding,o.file.string(),&error),"R92 finalize "+error);
            return o;
        };
        for(unsigned i=0;i<16;++i){const auto o=add("keep-"+std::to_string(i));expected.emplace(o.segment.segment_id,SerializeRecordingSegmentV2(o.segment));}
        const auto measure=[&](unsigned history){
            for(unsigned round=0;round<6;++round){
                latency::history_node_reads=0;const auto begin=Clock::now();
                const auto snapshot=store.catalog().RetentionSnapshot();const auto elapsed=Us(begin);
                const auto nodes=latency::history_node_reads;Check(nodes>0,"R92 observed history nodes");
                Check(snapshot.authoritative&&snapshot.candidates.size()==16,"R92 exact active count");
                std::vector<std::string> expected_ids;for(const auto& row:expected)expected_ids.push_back(row.first);
                Check(store.catalog().FinalizedSegmentIdsForStartup()==expected_ids,"R101 startup list keeps active IDs and excludes growing retired history");
                std::set<std::string> seen;
                for(const auto& row:snapshot.candidates){
                    Check(row.segment_v2&&expected.at(row.segment_v2->segment_id)==SerializeRecordingSegmentV2(*row.segment_v2)&&
                        row.effective_lifecycle==RecordingLifecycle::Finalized&&row.hold_count==0&&
                        row.media_path==store_root/(row.segment_v2->segment_id+".mp4")&&seen.insert(row.segment_v2->segment_id).second,"R92 independent active row");
                }
                if(round){const auto scratch=store.catalog().ScratchResidency()->usage();
                    std::cout<<"[retention-cost] {\"history\":"<<history<<",\"active\":16,\"round\":"<<round<<",\"us\":"<<elapsed
                        <<",\"nodeReads\":"<<nodes<<",\"ownedRam\":"<<store.catalog().SearchResidency()->used()
                        <<",\"scratchBytes\":"<<scratch.disk_bytes<<",\"scratchFd\":"<<scratch.file_descriptors<<"}"<<std::endl;}
            }
        };
        measure(0);
        for(unsigned i=0;i<128;++i){
            const auto o=add("gone-"+std::to_string(i));
            Check(store.catalog().RequestDeletion(o.segment.segment_id,"continuous-age",&error),"R92 deletion intent "+error);
            Check(std::filesystem::remove(o.file),"R92 own media removed");
            RecordingTombstoneV2 tomb;tomb.tombstone_id="tomb-"+o.segment.segment_id;tomb.segment=o.segment;tomb.deleted_at_ms=1000+i;tomb.deletion_reason="continuous-age";
            Check(store.catalog().CompleteDeletionV2(tomb,&error)&&store.catalog().IsDeletedSegmentId(o.segment.segment_id),"R92 exact durable deletion "+error);
            if(i==31||i==127)measure(i+1);
        }
        const auto exact=store.catalog().RetentionSnapshot(RetentionSnapshotSelection::Candidate,"keep-0");
        const auto no_pending=store.catalog().RetentionSnapshot(RetentionSnapshotSelection::Pending);
        const auto gone=store.catalog().RetentionSnapshot(RetentionSnapshotSelection::Candidate,"gone-127");
        const auto authority=store.catalog().RetentionSnapshot(RetentionSnapshotSelection::Authority);
        Check(exact.authoritative&&exact.candidates.size()==1&&exact.candidates[0].Id()=="keep-0"&&
            SerializeRecordingSegmentV2(*exact.candidates[0].segment_v2)==expected.at("keep-0")&&
            no_pending.authoritative&&no_pending.candidates.empty()&&gone.authoritative&&gone.candidates.empty()&&
            authority.authoritative&&authority.candidates.empty(),"R101 exact/pending/authority generation and retired exclusion");
        Check(store.catalog().AdjustHoldCount("keep-0",1,&error),"R92 hold");
        const auto held=store.catalog().RetentionSnapshot();
        const auto row=std::find_if(held.candidates.begin(),held.candidates.end(),[](const auto& r){return r.segment_v2&&r.segment_v2->segment_id=="keep-0";});
        Check(row!=held.candidates.end()&&row->hold_count==1&&!store.catalog().RequestDeletion("keep-0","continuous-age",&error),"R92 held reader protected");
        Check(store.catalog().AdjustHoldCount("keep-0",-1,&error)&&store.catalog().Checkpoint(&error),"R92 release and checkpoint "+error);
        Check(store.journal().Finish(&error),"R92 explicit Finish "+error);
    }
    {RecordingRuntimeStorage reopened(root/"store");Check(reopened.Open(&error),"R92 runtime reopen "+error);const auto snapshot=reopened.catalog().RetentionSnapshot();
     Check(snapshot.authoritative&&snapshot.candidates.size()==16&&reopened.catalog().IsDeletedSegmentId("gone-127"),"R92 reopened membership");
     for(const auto& row:snapshot.candidates)Check(row.segment_v2&&expected.at(row.segment_v2->segment_id)==SerializeRecordingSegmentV2(*row.segment_v2),"R92 reopened original bytes");
     Check(reopened.journal().Finish(&error),"R92 reopened Finish "+error);}
    std::cout<<"[retention-cost-complete] PASS checks="<<passes<<std::endl;return 0;
}catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<std::endl;return 1;}
