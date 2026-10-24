// 파일 용도: R99 실제 generation 사전 상태와 새 순환 진행. managed writer fixture 안에서만 포함한다.
// 전체 목록은 기존 bounded catalog API의 일시 반환값이며 사전 baseline은 두 채널의 count/마지막 order뿐이다.
void R99Need(bool ok,const std::string& why){if(!ok)throw std::runtime_error(why);}
void R99Phase(recording::RecordingResourceTrace& trace,const char* phase){
    if(std::string(phase)!="released"&&std::string(phase)!="copy-released")R99Need(trace.Emit("sample"),"resource-trace");
    std::cout<<"[R99-phase] "<<phase<<" "<<getpid()<<std::endl;
    std::string ack;R99Need(bool(std::getline(std::cin,ack))&&ack=="observed","parent-space-observation");
}
std::string R99Asset(recording::EvidencePackageStore& store,const std::string& id){
    std::string error;auto file=store.Open(id,&error);R99Need(bool(file),"package-read:"+error);
    std::string joined=recording::SerializeEvidencePackage(file->manifest());
    for(std::size_t i=0;i<file->manifest().assets.size();++i){
        const auto& asset=file->manifest().assets[i];R99Need(asset.size_bytes<=256*1024,"fixture-asset-limit");
        std::vector<std::uint8_t> b(asset.size_bytes);std::size_t done=0;
        while(done<b.size()){const auto n=pread(file->fd(),b.data()+done,b.size()-done,file->AssetOffset(i)+done);if(n<0&&errno==EINTR)continue;R99Need(n>0,"asset-read");done+=std::size_t(n);}
        const auto hash=recording::EvidenceSha256(b.data(),b.size());R99Need(hash==asset.sha256,"asset-hash");joined+=hash;
    }
    return recording::EvidenceSha256(reinterpret_cast<const std::uint8_t*>(joined.data()),joined.size());
}
int MixedGeneration(const std::filesystem::path& root,Encoded input){
    using namespace recording;
    constexpr std::uint64_t Q=recording_mixed_fixture::kQuota,E=recording_mixed_fixture::kReserved,S=recording_mixed_fixture::kSegmentBytes;
    const auto media=root/"recordings";std::string error;
    RecordingResourceTrace trace("1");
    {
    RecordingRuntimeStorage runtime(media);R99Need(runtime.Open(&error),"generation-open:"+error);
    auto& catalog=runtime.catalog();R99Need(trace.Bind(catalog.SearchResidency(),catalog.ScratchResidency()),"resource-bind");
    R99Phase(trace,"opened");
    input.packets.resize(60);
    for(auto& p:input.packets){auto& o=*p.observation;o.clock_process_id="r99-clock";o.mono_before_ns=1000000000+p.pts;o.mono_after_ns=o.mono_before_ns+1000;o.observed_utc_ns=1789200000000000000LL+p.pts;}
    const auto write=[&](const std::string& channel,GStreamerSegmentWriter::Options options){
        GStreamerSegmentWriter writer(options);R99Need(writer.Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer-start:"+error);
        for(const auto& p:input.packets)writer.Push(p,0);
        writer.Stop();
    };
    // A 채널도 정상 writer로 생성한다. 9101/9201과 ID/순서 충돌은 제품이 검증한다.
    write("1",runtime.WriterOptions(2000));
    struct Baseline{std::string channel,seed,protected_id,package,package_hash,fresh,deleted_path;std::uint64_t count=0,bytes=0,deleted=0;std::int64_t order=0;};
    std::array<Baseline,2> baseline{};
    for(unsigned c=0;c<2;++c){auto& b=baseline[c];b.channel=c?"9201":"9101";write(b.channel,runtime.WriterOptions(2000));
        const auto snapshot=catalog.RetentionSnapshot();
        const auto it=std::find_if(snapshot.candidates.begin(),snapshot.candidates.end(),[&](const auto& row){return row.Channel()==b.channel;});
        R99Need(it!=snapshot.candidates.end()&&it->segment_v2.has_value(),"bound-template");
        const auto seed=*it->segment_v2;const auto file=it->media_path;const auto binding=catalog.FindSourceBinding(seed.segment_id);
        R99Need(binding&&binding->file_evidence&&seed.size_bytes>0&&seed.size_bytes<=S,"bound-template-envelope");
        auto bad_segment=seed;bad_segment.channel_id="other";
        R99Need(!catalog.ValidateBoundFinalizeRecoveryV2(bad_segment,*binding,file.string(),&error),"wrong-channel-rejected");
        bad_segment=seed;bad_segment.checksum_sha256=std::string(64,'0');
        R99Need(!catalog.ValidateBoundFinalizeRecoveryV2(bad_segment,*binding,file.string(),&error),"wrong-hash-rejected");
        auto bad_binding=*binding;bad_binding.segment_id="unbound";
        R99Need(!catalog.ValidateBoundFinalizeRecoveryV2(seed,bad_binding,file.string(),&error),"wrong-binding-rejected");
        bad_binding=*binding;bad_binding.file_evidence->samples.front().original_pts_ns++;
        R99Need(!catalog.ValidateBoundFinalizeRecoveryV2(seed,bad_binding,file.string(),&error),"wrong-sample-time-rejected");
        b.seed=seed.segment_id;b.deleted_path=std::filesystem::relative(file,media).string();b.count=(Q-E)/seed.size_bytes+2;R99Need(b.count<2048,"prestate-count-cap");
        // 실제 full bytes와 file evidence를 각각 확인하며 hardlink가 아닌 독립 파일을 만든다.
        for(std::uint64_t i=1;i<b.count;++i){auto row=seed;row.segment_id="r99-"+b.channel+"-"+std::to_string(i);row.order_request_id="order-"+row.segment_id;
            RecordingOrderReservationV1 order;R99Need(catalog.ReserveRecordingOrder(row.store_id,row.order_request_id,row.segment_id,b.channel,&order,&error),"reserve:"+error);row.order_sequence=order.sequence;
            auto bound=*binding;bound.segment_id=row.segment_id;const auto target=media/b.channel/(row.segment_id+".mp4");std::filesystem::create_directories(target.parent_path());std::filesystem::copy_file(file,target);
            const int fd=open(target.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);R99Need(fd>=0,"clone-open");const bool verified=VerifyRecordingFileEvidenceFd(fd,bound,&error);const int closed=close(fd);R99Need(verified&&closed==0,"clone-file-proof:"+error);
            R99Need(catalog.FinalizeBoundSegmentV2(row,bound,target.string(),&error),"bound-finalize:"+error);
            b.order=row.order_sequence;if(i==b.count-1)b.protected_id=row.segment_id;
            if(i%64==0)R99Phase(trace,"prestate-progress");
        }
        b.bytes=b.count*seed.size_bytes;R99Need(b.bytes+E>Q&&b.bytes<Q,"actual-size-admission-trigger");
        R99Need(catalog.AdjustHoldCount(b.protected_id,1,&error),"protect-last");
        RecordingReadService reader(catalog);RecordingSearchReader search(catalog,reader);std::shared_ptr<const RecordingSearchModel> model;
        R99Need(search.Refresh({b.channel},{},&model,&error),"generation-search:"+error);
        const auto selected=std::find_if(model->documents().begin(),model->documents().end(),[&](const auto& d){return d.segment_id==b.seed&&d.start_ns;});R99Need(selected!=model->documents().end(),"source-search-hit");
        EvidencePackageStore store(media/"evidence-packages",{},catalog.SearchResidency(),catalog.ScratchResidency());R99Need(store.Recover(&error),"evidence-store");
        EvidencePackageBuilder builder(catalog,reader,store);EvidencePackageV1 manifest;
        const bool built=builder.Create(*selected,"structured","",&b.package,&manifest,&error,std::chrono::steady_clock::now()+std::chrono::seconds(5));R99Need(built,"generation-package:"+error);
        b.package_hash=R99Asset(store,b.package);R99Need(!catalog.IsDeletedSegmentId(b.seed)&&std::filesystem::exists(file),"evidence-before-source-present");
        std::cout<<"[R99-baseline] "<<b.channel<<" count="<<b.count<<" bytes="<<b.bytes<<" order="<<b.order<<" segmentBytes="<<seed.size_bytes<<" sha256="<<seed.checksum_sha256<<" samples="<<binding->file_evidence->samples.size()<<" firstPts="<<binding->file_evidence->samples.front().original_pts_ns<<std::endl;
    }
    R99Need(catalog.Checkpoint(&error),"baseline-checkpoint:"+error);R99Phase(trace,"baseline");
    for(auto& b:baseline){
        std::uint64_t removed=0;unsigned allowed=0,denied=0,completed=0;
        RetentionCoordinator retention(catalog,[&]{return catalog.RetentionSnapshot();},[&](auto* bytes,auto*){*bytes=std::filesystem::space(media).available;return true;},
            [&](const auto& file,auto* e){const bool ok=RemoveContainedMediaFile(media,file,e,{},true);if(ok){R99Need(!std::filesystem::exists(file),"retention-file-remains");++removed;}return ok;},{0,E,media});
        RetentionPolicy policy;policy.continuous_max_bytes=Q;policy.event_max_bytes=128ULL*1024*1024;R99Need(retention.UpdateChannelPolicy(b.channel,policy,&error),"profile-policy");
        auto options=runtime.WriterOptions(2000);
        options.admit_segment=[&](const auto& channel,std::uint64_t minimum){auto a=retention.AdmitContinuousWrite(channel,minimum,1789201000000LL);a.allowed?++allowed:++denied;return SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};};
        options.report_segment_progress=[&](const auto& channel,std::uint64_t n){retention.UpdateContinuousWriteProgress(channel,n);};
        options.complete_segment=[&](const auto& channel,std::uint64_t n){++completed;retention.CompleteContinuousWrite(channel,n);};
        write(b.channel,options);R99Need(allowed==1&&denied==0&&completed==1&&removed>0,"new-writer-retention-progress");b.deleted=removed;
        std::uint64_t alive=0,bytes=0,fresh=0;const auto state=catalog.RetentionSnapshot();
        for(const auto& row:state.candidates)if(row.Channel()==b.channel&&row.Lifecycle()==RecordingLifecycle::Finalized){++alive;bytes+=row.Size();R99Need(std::filesystem::file_size(row.media_path)==row.Size(),"usage-file-size");
            if(row.segment_v2&&row.segment_v2->order_sequence>b.order){++fresh;b.fresh=row.Id();R99Need(Decode(row.media_path)==60,"new-file-decode");}}
        std::cout<<"[R99-usage-operands] alive="<<alive<<" removed="<<removed<<" baseline="<<b.count<<" fresh="<<fresh<<" bytes="<<bytes<<" quota="<<Q<<std::endl;
        R99Need(alive+removed==b.count+1&&fresh==1&&bytes<=Q&&!retention.ChannelStatus(b.channel).storage_blocked,"new-count-and-usage");
        R99Need(!catalog.IsDeletedSegmentId(b.protected_id),"protected-survived");
        R99Need(catalog.IsDeletedSegmentId(b.seed)&&!std::filesystem::exists(media/b.deleted_path),"evidence-source-deleted-and-absent");
        EvidencePackageStore store(media/"evidence-packages",{},catalog.SearchResidency(),catalog.ScratchResidency());R99Need(R99Asset(store,b.package)==b.package_hash,"evidence-after-delete-byte-identical");
        R99Need(catalog.AdjustHoldCount(b.protected_id,-1,&error),"release-held");
        std::cout<<"[R99-progress] channel="<<b.channel<<" newFinalized="<<fresh<<" newDeleted="<<removed<<" alive="<<alive<<" bytes="<<bytes<<" availableEvidenceAfterDelete=1"<<std::endl;
        R99Phase(trace,"cyclic");
    }
    std::ofstream receipt(root/"cyclic-receipt.txt");R99Need(bool(receipt),"receipt-open");
    for(const auto& b:baseline)receipt<<std::quoted(b.channel)<<' '<<std::quoted(b.seed)<<' '<<std::quoted(b.fresh)<<' '<<std::quoted(b.package)<<' '<<b.package_hash<<' '<<std::quoted(b.deleted_path)<<' '<<b.count<<' '<<b.deleted<<'\n';
    receipt.close();R99Need(bool(receipt),"receipt-close");
    R99Need(catalog.Checkpoint(&error),"final-checkpoint:"+error);R99Phase(trace,"checkpoint");
    R99Need(trace.Emit("before-Finish"),"trace-before-finish");
    R99Need(runtime.Finish(&error),"generation-finish:"+error);R99Need(trace.Emit("after-Finish"),"trace-after-finish");
    }
    R99Phase(trace,"released");return 0;
}
int MixedGenerationReopen(const std::filesystem::path& root){
    using namespace recording;std::string error;RecordingResourceTrace trace("1");
    {
    RecordingRuntimeStorage runtime(root/"recordings");R99Need(runtime.Open(&error),"copy-reopen:"+error);auto& catalog=runtime.catalog();
    const auto report=catalog.recovery_report();R99Need(report.corrupt_line_count==0&&report.projection_error_count==0&&report.writer_cleanup_error_count==0,"recovery-report-errors");
    R99Need(trace.Bind(catalog.SearchResidency(),catalog.ScratchResidency()),"copy-resource-bind");R99Phase(trace,"copy-opened");
    std::ifstream receipt(root/"cyclic-receipt.txt");std::string channel,deleted,fresh,package,hash,deleted_path;std::uint64_t count=0,removed=0;unsigned rows=0;
    while(receipt>>std::quoted(channel)>>std::quoted(deleted)>>std::quoted(fresh)>>std::quoted(package)>>hash>>std::quoted(deleted_path)>>count>>removed){
        R99Need(++rows<=2&&catalog.IsDeletedSegmentId(deleted)&&!std::filesystem::exists(root/"recordings"/deleted_path),"recovered-deleted");
        const auto segment=catalog.FindSegmentV2ById(fresh);const auto binding=catalog.FindSourceBinding(fresh);RecordingReadService reader(catalog);const auto file=reader.ResolveMedia(channel,fresh);
        R99Need(segment&&binding&&file&&segment->channel_id==channel&&!catalog.IsDeletedSegmentId(fresh),"recovered-available");
        R99Need(VerifyRecordingFileEvidenceFd(file->fd(),*binding,&error),"recovered-source-proof:"+error);
        EvidencePackageStore store(root/"recordings/evidence-packages",{},catalog.SearchResidency(),catalog.ScratchResidency());const bool recovered=store.Recover(&error);R99Need(recovered,"recovered-evidence-store:"+error);R99Need(R99Asset(store,package)==hash,"recovered-evidence-bytes");
        std::uint64_t alive=0;for(const auto& row:catalog.RetentionSnapshot().candidates)if(row.Channel()==channel&&row.Lifecycle()==RecordingLifecycle::Finalized){
            ++alive;
            // 닫힌 copy의 모든 파일을 검증한다. 새 writer 파일의 실제 재생/lease 경로는 위에서 별도 확인했다.
            const auto relative=row.media_path.lexically_relative(root/"recordings");
            R99Need(!relative.empty()&&!relative.is_absolute()&&*relative.begin()!="..","recovered-original-containment");
            // 각 부모도 열린 directory FD에서 no-follow로 내려간다. leaf만 검사하지 않는다.
            int parent=open((root/"recordings").c_str(),O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
            R99Need(parent>=0,"recovered-root-open");
            for(auto part=relative.begin();part!=relative.end();++part){
                auto next=part;++next;if(next==relative.end())break;
                const int child=openat(parent,part->c_str(),O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
                const int result=close(parent);parent=child;
                if(result!=0||parent<0){if(parent>=0)close(parent);throw std::runtime_error("recovered-parent-containment");}
            }
            const int source=openat(parent,relative.filename().c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
            const int parent_closed=close(parent);
            if(source<0||parent_closed!=0){if(source>=0)close(source);throw std::runtime_error("recovered-original-missing");}
            struct stat st{};if(fstat(source,&st)||!S_ISREG(st.st_mode)||st.st_nlink!=1||st.st_uid!=getuid()||std::uint64_t(st.st_size)!=row.Size()){close(source);throw std::runtime_error("recovered-original-size-owner");}
            // 사전 구성에서 sample 표를 실제 파일로 검증했고 copyVerified가 그 원본 bytes를 결박한다.
            // 복구에서는 모든 원본의 현재 bytes/hash를 확인한다. 같은 sample parser를 1,390회 중복 수행하지 않는다.
            std::array<unsigned char,65536> bytes{};auto* sha=g_checksum_new(G_CHECKSUM_SHA256);std::uint64_t at=0;
            while(at<row.Size()){const auto n=pread(source,bytes.data(),std::min<std::uint64_t>(bytes.size(),row.Size()-at),at);if(n<0&&errno==EINTR)continue;
                if(n<=0){g_checksum_free(sha);close(source);throw std::runtime_error("recovered-original-read");}g_checksum_update(sha,bytes.data(),n);at+=std::uint64_t(n);}
            const std::string digest=g_checksum_get_string(sha);g_checksum_free(sha);R99Need(close(source)==0,"recovered-original-close");
            R99Need(row.segment_v2&&digest==row.segment_v2->checksum_sha256,"recovered-original-hash");
            if(alive%128==0)std::cout<<"[R99-recovery-progress] channel="<<channel<<" files="<<alive<<std::endl;
        }
        R99Need(alive+removed==count+1,"recovered-exact-count");
    }
    R99Need(receipt.eof()&&rows==2,"recovery-receipt-complete");R99Need(trace.Emit("before-Finish"),"copy-trace-before-finish");R99Need(runtime.Finish(&error),"copy-finish:"+error);R99Need(trace.Emit("after-Finish"),"copy-trace-after-finish");
    }
    R99Phase(trace,"copy-released");std::cout<<"[R99-recovery] available=2 deleted=2 evidence=2 finish=1"<<std::endl;return 0;
}

// State 전용: 과거 실제 촬영 주장이 아닌 현재 anchor 기반 합성 입력 일정이다.
// encoded AU만 반복한다. 각 MP4와 source binding/file evidence는 Writer가 새로 만든다.
std::int64_t PreseedNowMs(){return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();}
std::string PreseedHash(const std::string& bytes){return recording::EvidenceSha256(bytes.data(),bytes.size());}
void PreseedSave(const std::filesystem::path& file,const std::string& bytes){
    R99Need(bytes.size()<=1024*1024,"preseed-artifact-cap");
    const int fd=open(file.c_str(),O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);R99Need(fd>=0,"preseed-artifact-open");
    std::size_t at=0;bool ok=true;while(at<bytes.size()){const auto n=write(fd,bytes.data()+at,bytes.size()-at);if(n<0&&errno==EINTR)continue;if(n<=0){ok=false;break;}at+=std::size_t(n);}
    const bool synced=fsync(fd)==0;const bool closed=close(fd)==0;
    R99Need(ok&&synced&&closed&&Read(file)==bytes,"preseed-artifact-write-readback");
    const int dir=open(file.parent_path().c_str(),O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);R99Need(dir>=0,"preseed-artifact-parent");
    const bool ds=fsync(dir)==0,dc=close(dir)==0;R99Need(ds&&dc,"preseed-artifact-directory-sync");
}
struct PreseedChannel {
    std::string channel;std::uint64_t count=0,bytes=0,pending=0,pending_bytes=0,deleted=0,deleted_bytes=0,created=0,created_bytes=0,loops=0,visual=0,epochs=0;
    std::int64_t first_order=0,last_order=0,utc_first=0,utc_last=0,pts_min=0,pts_max=0;
    std::uint64_t generation_first=0,generation_last=0;
};
struct PreseedVerified {std::array<PreseedChannel,2> channels{};std::string ledger;};
PreseedVerified PreseedInspect(recording::RecordingRuntimeStorage& runtime,const std::filesystem::path& media,bool protection){
    using namespace recording;std::string error;auto& catalog=runtime.catalog();PreseedVerified result;
    RecordingReadService reader(catalog);RecordingVisualSource visual(catalog,reader);
    std::vector<VisualSearchDocument> docs;std::map<std::string,VisualSourceCoverage> coverage;
    R99Need(visual.Collect({"9101","9201"},1,&docs,&coverage,&error),"preseed-visual:"+error);
    std::set<std::string> doc_ids;std::map<std::string,std::vector<const VisualSearchDocument*>> per_segment;
    for(const auto& doc:docs){R99Need(doc_ids.insert(doc.id).second&&doc.utc_ns.has_value(),"preseed-visual-identity-time");per_segment[doc.segment_id].push_back(&doc);}
    auto snapshot=catalog.RetentionSnapshot();R99Need(snapshot.authoritative&&snapshot.durable_reservations.empty(),"preseed-authority-reservations");
    for(unsigned index=0;index<2;++index){auto& out=result.channels[index];out.channel=index?"9201":"9101";
        std::vector<const RetentionCandidate*> rows;for(const auto& r:snapshot.candidates)if(r.Channel()==out.channel){R99Need(r.segment_v2.has_value(),"preseed-v2-only");rows.push_back(&r);}
        std::sort(rows.begin(),rows.end(),[](const auto* a,const auto* b){return a->segment_v2->order_sequence<b->segment_v2->order_sequence;});
        std::set<std::string> epochs;std::map<std::string,std::pair<std::uint64_t,std::string>> epoch_generation;
        std::int64_t last_end=0;std::uint64_t last_generation=0;std::int64_t last_pts=-1;
        for(const auto* row:rows){
            R99Need(row->segment_v2&&row->Lifecycle()==RecordingLifecycle::Finalized&&!row->Pinned()&&!row->hold_count,"preseed-lifecycle-protection");
            const auto& s=*row->segment_v2;const auto binding=catalog.FindSourceBinding(s.segment_id);
            R99Need(binding&&binding->file_evidence&&binding->file_evidence->samples.size()==60&&s.store_id==runtime.journal().ManagedStoreId()&&s.order_sequence>out.last_order,"preseed-bound-order");
            R99Need(binding->media_epoch_id==s.media_epoch_id&&binding->generation_order>=last_generation&&binding->generation_order>0,"preseed-epoch-generation");
            if(binding->generation_order==last_generation)R99Need(s.media_start_pts>last_pts,"preseed-pts-order");
            const auto association=std::make_pair(binding->generation_order,binding->source_generation);
            const auto inserted=epoch_generation.emplace(s.media_epoch_id,association);R99Need(inserted.second||inserted.first->second==association,"preseed-epoch-alias");
            last_generation=binding->generation_order;last_pts=s.media_start_pts;epochs.insert(s.media_epoch_id);
            std::int64_t lo=std::numeric_limits<std::int64_t>::max(),hi=0;
            for(const auto& m:s.mappings){R99Need(m.utc_start_ns&&m.utc_end_ns&&m.end_pts&&m.provenance!="unknown","preseed-time-mapping");lo=std::min(lo,*m.utc_start_ns);hi=std::max(hi,*m.utc_end_ns);}
            const auto now=PreseedNowMs();R99Need(lo>=last_end&&lo/1000000>=now-3600000&&hi>lo&&(hi+999999)/1000000<=now,"preseed-utc-window");last_end=hi;
            const auto& selected=per_segment[s.segment_id];
            // 30fps 원본 ns: floor(59e9/30)+floor(1e9/30)=1,999,999,999.
            // MP4 native 60/30초와 original PTS+duration 끝을 혼동하지 않는다.
            R99Need(s.media_end_pts&&s.time_base_num==1&&s.time_base_den==1000000000&&*s.media_end_pts-s.media_start_pts==1999999999LL&&selected.size()==2,"preseed-visual-segment-coverage");
            for(unsigned j=0;j<2;++j){const auto& doc=*selected[j];const auto expected_pts=s.media_start_pts+std::int64_t(j)*1000000000LL;
                R99Need(doc.channel_id==out.channel&&doc.media_sha256==s.checksum_sha256&&doc.media_pts==expected_pts&&*doc.utc_ns==lo+std::int64_t(j)*1000000000LL,"preseed-visual-sample-time");
                unsigned matched=0;for(const auto& sample:binding->file_evidence->samples)if(sample.original_pts_ns==doc.media_pts&&sample.sample_sha256==doc.frame_sha256)++matched;
                R99Need(matched==1,"preseed-visual-file-sample");}
            const auto relative=row->media_path.lexically_relative(media);R99Need(!relative.empty()&&!relative.is_absolute()&&*relative.begin()!="..","preseed-media-containment");
            const int fd=open(row->media_path.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);R99Need(fd>=0,"preseed-media-open");struct stat st{};
            const bool stat_ok=fstat(fd,&st)==0&&S_ISREG(st.st_mode)&&st.st_nlink==1&&st.st_uid==getuid()&&std::uint64_t(st.st_size)==s.size_bytes;
            const bool proof=stat_ok&&VerifyRecordingFileEvidenceFd(fd,*binding,&error);const bool closed=close(fd)==0;
            R99Need(proof&&closed&&PreseedHash(Read(row->media_path))==s.checksum_sha256,"preseed-file-proof:"+error);
            if(protection&&out.count==0){
                R99Need(catalog.AdjustHoldCount(s.segment_id,1,&error),"preseed-hold-acquire");
                R99Need(catalog.RequestDeletionForAdmission(s.segment_id,"continuous-capacity",&error)==RecordingDeletionAdmission::Protected,"preseed-held-delete-rejected");
                R99Need(catalog.AdjustHoldCount(s.segment_id,-1,&error),"preseed-hold-release");
                {const auto lease=reader.ResolveMedia(out.channel,s.segment_id);R99Need(bool(lease),"preseed-reader-lease");
                    R99Need(catalog.RequestDeletionForAdmission(s.segment_id,"continuous-capacity",&error)==RecordingDeletionAdmission::Protected,"preseed-reader-delete-rejected");}
                RetentionSnapshot single;RetentionCandidate c;c.segment_v2=s;c.effective_lifecycle=RecordingLifecycle::Finalized;c.media_path=row->media_path;single.candidates.push_back(std::move(c));
                RetentionPlanRequest request;request.channel_id=out.channel;request.policy.continuous_max_bytes=s.size_bytes;request.required_write_bytes=1;request.free_bytes=1024*1024;
                R99Need(RetentionCoordinator::Plan(single,request).deletions.size()==1,"preseed-plan-normal");
                single.candidates[0].segment_v2->pinned=true;R99Need(RetentionCoordinator::Plan(single,request).deletions.empty(),"preseed-plan-pin");
                single.candidates[0].segment_v2->pinned=false;single.candidates[0].hold_count=1;R99Need(RetentionCoordinator::Plan(single,request).deletions.empty(),"preseed-plan-hold");
            }
            if(!out.count){out.first_order=s.order_sequence;out.utc_first=lo/1000000;out.generation_first=binding->generation_order;out.pts_min=s.media_start_pts;}
            out.last_order=s.order_sequence;out.utc_last=(hi+999999)/1000000;out.generation_last=binding->generation_order;out.pts_min=std::min(out.pts_min,s.media_start_pts);out.pts_max=std::max(out.pts_max,*s.media_end_pts);
            ++out.count;out.bytes+=s.size_bytes;out.visual+=selected.size();
            result.ledger+=out.channel+" "+s.segment_id+" "+std::to_string(s.order_sequence)+" "+std::to_string(s.size_bytes)+" "+s.checksum_sha256+" "+PreseedHash(SerializeRecordingSegmentV2(s))+" "+PreseedHash(SerializeRecordingSourceBindingV1(*binding))+"\n";
        }
        out.epochs=epochs.size();R99Need(out.count>0&&out.count<2048&&out.bytes<recording_mixed_fixture::kQuota&&out.bytes+recording_mixed_fixture::kReserved>recording_mixed_fixture::kQuota,"preseed-next-admission-deletes");
        R99Need(coverage.at(out.channel).examined_segments==out.count&&coverage.at(out.channel).unsupported_segments==0&&coverage.at(out.channel).representative_frames==out.visual,"preseed-visual-coverage");
        RecordingLocationCatalogSnapshot locations;R99Need(catalog.SnapshotLocationsV2(out.channel,&locations,&error)&&locations.segments.size()==out.count,"preseed-location-count");
        out.deleted=locations.deleted_segment_ids.size();for(const auto& id:locations.deleted_segment_ids)result.ledger+="deleted "+out.channel+" "+id+"\n";
    }
    return result;
}
std::string PreseedChannelsJson(const PreseedVerified& verified){
    std::ostringstream out;out<<'[';bool comma=false;for(const auto& c:verified.channels){if(comma)out<<',';comma=true;
        out<<"{\"channel\":"<<recording::EvidenceJsonQuote(c.channel)<<",\"finalizedCount\":"<<c.count<<",\"finalizedBytes\":"<<c.bytes<<",\"pendingCount\":0,\"pendingBytes\":0,\"deletedCount\":"<<c.deleted<<",\"deletedBytes\":"<<c.deleted_bytes<<",\"createdCount\":"<<c.created<<",\"createdBytes\":"<<c.created_bytes<<",\"firstOrder\":"<<c.first_order<<",\"lastOrder\":"<<c.last_order<<",\"utcFirstMs\":"<<c.utc_first<<",\"utcLastMs\":"<<c.utc_last<<",\"epochs\":"<<c.epochs<<",\"sourceGenerationFirst\":"<<c.generation_first<<",\"sourceGenerationLast\":"<<c.generation_last<<",\"ptsMinNs\":"<<c.pts_min<<",\"ptsMaxNs\":"<<c.pts_max<<",\"visualFrames\":"<<c.visual<<",\"fileProofCount\":"<<c.count<<",\"segmentDurationNs\":1999999999,\"samplesPerSegment\":60}";
    }out<<']';return out.str();
}
int StatePreseed(const std::filesystem::path& root,Encoded input){
    using namespace recording;constexpr auto Q=recording_mixed_fixture::kQuota,E=recording_mixed_fixture::kReserved;
    R99Need(Q==108ULL*1024*1024&&E==64ULL*1024*1024&&input.packets.size()==120,"preseed-fixed-profile");
    for(std::size_t i=0;i<input.packets.size();++i){const auto& p=input.packets[i];
        R99Need(p.observation&&p.observation->duration_ns==33333333ULL&&p.pts==std::int64_t(i)*1000000000LL/30&&p.dts==p.pts,"preseed-input-time-oracle");}
    const auto anchor=PreseedNowMs(),schedule=anchor-3000000;const auto started=std::chrono::steady_clock::now();const auto media=root/"recordings";
    RecordingResourceTrace trace("1");std::string error;PreseedVerified verified;std::string store;std::int64_t finish_ms=0;
    {
    RecordingRuntimeStorage runtime(media);R99Need(runtime.Open(&error),"preseed-open:"+error);auto& catalog=runtime.catalog();store=runtime.journal().ManagedStoreId();
    R99Need(catalog.RetentionSnapshot().candidates.empty(),"preseed-new-owned-store");R99Need(trace.Bind(catalog.SearchResidency(),catalog.ScratchResidency()),"preseed-resource-bind");R99Phase(trace,"opened");
    std::array<PreseedChannel,2> counters{};for(unsigned i=0;i<2;++i)counters[i].channel=i?"9201":"9101";
    RetentionCoordinator retention(catalog,[&](auto* bytes,auto*){*bytes=std::filesystem::space(media).available;return true;},
        [&](const auto& file,auto* e){auto& c=counters[file.parent_path().filename()=="9101"?0:1];const auto size=std::filesystem::file_size(file);const bool ok=RemoveContainedMediaFile(media,file,e,{},true);if(ok){++c.deleted;c.deleted_bytes+=size;R99Need(!std::filesystem::exists(file),"preseed-unlink");}return ok;},{0,E,media});
    for(auto& c:counters){RetentionPolicy policy;policy.continuous_max_bytes=Q;policy.event_max_bytes=128ULL*1024*1024;policy.continuous_max_age_ms=10800000;policy.event_max_age_ms=10800000;R99Need(retention.UpdateChannelPolicy(c.channel,policy,&error),"preseed-policy");
        while(c.created_bytes-c.deleted_bytes+E<=Q){
            R99Need(c.created<2046&&schedule+std::int64_t(c.loops+1)*4000<=anchor,"preseed-schedule-cap");
            auto options=runtime.WriterOptions(2000);unsigned admitted=0,completed=0;bool rejected=false;
            options.admit_segment=[&](const auto& channel,std::uint64_t minimum){const auto a=retention.AdmitContinuousWrite(channel,minimum,PreseedNowMs());++admitted;rejected|=!a.allowed||a.reserved_bytes!=E;return SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};};
            options.report_segment_progress=[&](const auto& channel,std::uint64_t bytes){retention.UpdateContinuousWriteProgress(channel,bytes);};
            options.complete_segment=[&](const auto& channel,std::uint64_t bytes){retention.CompleteContinuousWrite(channel,bytes);++completed;if(!bytes)rejected=true;else{++c.created;c.created_bytes+=bytes;}};
            GStreamerSegmentWriter writer(options);R99Need(writer.Start(c.channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"preseed-writer-start");
            for(std::size_t i=0;i<input.packets.size();++i){auto packet=input.packets[i];auto& o=*packet.observation;
                R99Need(packet.pts==packet.dts&&packet.pts>=0&&packet.pts<4000000000LL,"preseed-input-pts");
                o.source_generation="state-preseed-"+c.channel+"-"+std::to_string(c.loops+1);o.generation_order=c.loops+1;o.ordinal=i+1;o.pts_ns=packet.pts;o.dts_ns=packet.dts;
                o.clock_process_id="state-preseed-synthetic-clock";o.mono_before_ns=1000000000LL+std::int64_t(c.loops)*4000000000LL+packet.pts;o.mono_after_ns=o.mono_before_ns+1000;
                o.observed_utc_ns=schedule*1000000LL+std::int64_t(c.loops)*4000000000LL+packet.pts;writer.Push(packet,0);
            }
            writer.Stop();R99Need(!rejected&&admitted==2&&completed==2&&!retention.ChannelStatus(c.channel).storage_blocked,"preseed-writer-finalized-admission");++c.loops;
            if(c.loops%32==0)R99Phase(trace,"prestate-progress");
        }
    }
    verified=PreseedInspect(runtime,media,true);
    for(unsigned i=0;i<2;++i){auto& c=verified.channels[i];const auto& n=counters[i];c.created=n.created;c.created_bytes=n.created_bytes;c.deleted=n.deleted;c.deleted_bytes=n.deleted_bytes;
        RecordingLocationCatalogSnapshot locations;R99Need(catalog.SnapshotLocationsV2(c.channel,&locations,&error),"preseed-locations");
        R99Need(locations.deleted_segment_ids.size()==c.deleted&&c.count+c.deleted==c.created&&c.bytes+c.deleted_bytes==c.created_bytes,"preseed-count-conservation");}
    // 사전 단계의 마지막 명시적 checkpoint. 향후 >= cutOrdinal만 새 mutation이다.
    R99Need(catalog.Checkpoint(&error),"preseed-baseline-checkpoint:"+error);R99Phase(trace,"baseline");
    PreseedSave(root/"preseed-media.txt",verified.ledger);
    PreseedSave(root/"preseed-anchor.txt",std::to_string(anchor)+"\n");
    R99Need(trace.Emit("before-Finish"),"preseed-before-finish");const auto f=std::chrono::steady_clock::now();R99Need(runtime.Finish(&error),"preseed-finish:"+error);finish_ms=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-f).count();R99Need(trace.Emit("after-Finish"),"preseed-after-finish");
    }
    const auto manifest_bytes=Read(media/"recording-generation.json");RecordingGenerationManifest manifest;
    R99Need(ParseRecordingGenerationManifest(manifest_bytes,&manifest,&error)&&manifest.store_id==store&&manifest.cut_ordinal>0,"preseed-manifest");
    R99Need(std::filesystem::file_size(media/manifest.active.name)==manifest.active.size,"preseed-checkpoint-tail");
    const auto completed=PreseedNowMs();std::ostringstream out;out<<"{\"schema\":\"state-preseed-v1\",\"storeId\":"<<EvidenceJsonQuote(store)<<",\"generation\":"<<manifest.generation<<",\"cutOrdinal\":"<<manifest.cut_ordinal<<",\"manifestSha256\":"<<EvidenceJsonQuote(PreseedHash(manifest_bytes))<<",\"ledgerSha256\":"<<EvidenceJsonQuote(PreseedHash(verified.ledger))<<",\"anchorMs\":"<<anchor<<",\"preparedAtMs\":"<<completed<<",\"elapsedMs\":"<<std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-started).count()<<",\"finishMs\":"<<finish_ms<<",\"finish\":true,\"checkpointKind\":\"explicit-preparation-only\",\"clockKind\":\"synthetic-past-input-schedule\",\"journalBoundary\":\"next-mutation-ordinal-gte-cut\",\"channels\":"<<PreseedChannelsJson(verified)<<"}\n";
    PreseedSave(root/"preseed-baseline.json",out.str());R99Phase(trace,"released");return 0;
}
int StatePreseedReopen(const std::filesystem::path& root){
    using namespace recording;std::string error;RecordingResourceTrace trace("1");const auto media=root/"recordings";const auto manifest=Read(media/"recording-generation.json");const auto begin=std::chrono::steady_clock::now();
    {
    RecordingRuntimeStorage runtime(media);R99Need(runtime.Open(&error),"preseed-reopen:"+error);const auto r=runtime.catalog().recovery_report();
    R99Need(!r.corrupt_line_count&&!r.projection_error_count&&!r.writer_cleanup_error_count&&!r.truncated_tail_count&&!r.sqlite_quarantined,"preseed-recovery-report");
    R99Need(trace.Bind(runtime.catalog().SearchResidency(),runtime.catalog().ScratchResidency()),"preseed-reopen-resource");R99Phase(trace,"copy-opened");
    const auto verified=PreseedInspect(runtime,media,false);R99Need(verified.ledger==Read(root/"preseed-media.txt"),"preseed-reopen-exact-ledger");
    R99Need(Read(media/"recording-generation.json")==manifest,"preseed-reopen-manifest");
    R99Need(trace.Emit("before-Finish"),"preseed-reopen-before-finish");R99Need(runtime.Finish(&error),"preseed-reopen-finish");R99Need(trace.Emit("after-Finish"),"preseed-reopen-after-finish");
    }
    PreseedSave(root/"preseed-recovery.json","{\"recovery\":true,\"exactLedger\":true,\"manifestUnchanged\":true,\"finish\":true,\"elapsedMs\":"+std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-begin).count())+"}\n");
    R99Phase(trace,"copy-released");return 0;
}

// NATIVE-LIFETIME-01: bounded ownership only; no retention/automatic-rotation claim.
namespace native_lifetime {
using namespace recording;
constexpr const char* Channel="9101";
struct State {std::string store,ledger;std::uint64_t count=0,bytes=0;std::int64_t last_order=0,utc_first=0,utc_last=0;};
void Need(bool ok,const std::string& code){R99Need(ok,"lifetime-"+code);}
void Phase(RecordingResourceTrace& trace,const char* name){R99Phase(trace,name);}
void Recovery(RecordingCatalog& catalog){const auto r=catalog.recovery_report();Need(!r.corrupt_line_count&&!r.projection_error_count&&!r.writer_cleanup_error_count&&!r.truncated_tail_count&&!r.sqlite_quarantined,"recovery-report");}
std::string HashFile(const std::filesystem::path& p){return PreseedHash(Read(p));}
RecordingGenerationManifest Manifest(const std::filesystem::path& root){RecordingGenerationManifest m;std::string error;Need(ParseRecordingGenerationManifest(Read(root/"recordings/recording-generation.json"),&m,&error),"manifest:"+error);return m;}
void Write(RecordingRuntimeStorage& runtime,const std::filesystem::path& media,const Encoded& input,std::int64_t anchor,unsigned generation){
    Need(input.packets.size()==120&&generation>=1&&generation<=2,"input-bound");std::string error;
    RetentionCoordinator retention(runtime.catalog(),[&](auto* bytes,auto*){*bytes=std::filesystem::space(media).available;return true;},
        [](const auto&,auto* e){if(e)*e="lifetime-unexpected-delete";return false;},{0,recording_mixed_fixture::kReserved,media});
    RetentionPolicy policy;policy.continuous_max_bytes=recording_mixed_fixture::kQuota;policy.event_max_bytes=128ULL*1024*1024;policy.continuous_max_age_ms=10800000;policy.event_max_age_ms=10800000;
    Need(policy.continuous_max_bytes==108ULL*1024*1024&&recording_mixed_fixture::kReserved==64ULL*1024*1024&&retention.UpdateChannelPolicy(Channel,policy,&error),"policy");
    auto options=runtime.WriterOptions(2000);unsigned admitted=0,completed=0;bool rejected=false;
    options.admit_segment=[&](const auto& channel,std::uint64_t minimum){const auto a=retention.AdmitContinuousWrite(channel,minimum,PreseedNowMs());++admitted;rejected|=!a.allowed||a.reserved_bytes!=recording_mixed_fixture::kReserved;return SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};};
    options.report_segment_progress=[&](const auto& channel,std::uint64_t bytes){retention.UpdateContinuousWriteProgress(channel,bytes);};
    options.complete_segment=[&](const auto& channel,std::uint64_t bytes){retention.CompleteContinuousWrite(channel,bytes);++completed;rejected|=bytes==0;};
    GStreamerSegmentWriter writer(options);Need(writer.Start(Channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer-start:"+error);
    for(std::size_t i=0;i<input.packets.size();++i){auto p=input.packets[i];Need(p.observation&&p.pts==std::int64_t(i)*1000000000LL/30&&p.dts==p.pts&&p.observation->duration_ns==33333333ULL,"input-time");auto& o=*p.observation;
        o.source_generation="native-lifetime-"+std::to_string(generation);o.generation_order=generation;o.ordinal=i+1;o.pts_ns=p.pts;o.dts_ns=p.dts;
        o.clock_process_id="native-lifetime-synthetic-clock";o.mono_before_ns=1000000000LL+std::int64_t(generation-1)*4000000000LL+p.pts;o.mono_after_ns=o.mono_before_ns+1000;
        o.observed_utc_ns=(anchor-60000+std::int64_t(generation-1)*4000)*1000000LL+p.pts;writer.Push(p,0);
    }
    writer.Stop();Need(!rejected&&admitted==2&&completed==2&&!retention.ChannelStatus(Channel).storage_blocked,"writer-admission-finalize");
}
State Inspect(RecordingRuntimeStorage& runtime,std::int64_t anchor,unsigned expected){
    Need(expected==2||expected==4,"count-bound");State out;out.store=runtime.journal().ManagedStoreId();auto& catalog=runtime.catalog();
    const auto snapshot=catalog.RetentionSnapshot();Need(snapshot.authoritative&&snapshot.durable_reservations.empty()&&snapshot.candidates.size()==expected,"catalog-shape");
    std::vector<const RetentionCandidate*> rows;for(const auto& r:snapshot.candidates)rows.push_back(&r);
    std::sort(rows.begin(),rows.end(),[](auto* a,auto* b){return a->segment_v2&&b->segment_v2?a->segment_v2->order_sequence<b->segment_v2->order_sequence:a->Id()<b->Id();});
    std::string error;RecordingReadService reader(catalog);std::map<unsigned,std::string> epochs;
    for(std::size_t i=0;i<rows.size();++i){const auto& row=*rows[i];Need(row.segment_v2&&row.Channel()==Channel&&row.Lifecycle()==RecordingLifecycle::Finalized&&!row.Pinned(),"active-row");const auto& s=*row.segment_v2;
        const unsigned generation=unsigned(i/2+1);const auto binding=catalog.FindSourceBinding(s.segment_id);Need(binding&&binding->file_evidence&&binding->samples.size()==60&&binding->file_evidence->samples.size()==60,"file-binding");
        Need(s.store_id==out.store&&s.order_sequence>out.last_order&&s.size_bytes>0&&s.size_bytes<=recording_mixed_fixture::kSegmentBytes,"order-size-store");
        Need(binding->generation_order==generation&&binding->source_generation=="native-lifetime-"+std::to_string(generation)&&binding->media_epoch_id==s.media_epoch_id&&!s.media_epoch_id.empty(),"source-epoch");
        auto inserted=epochs.emplace(generation,s.media_epoch_id);Need(inserted.second||inserted.first->second==s.media_epoch_id,"epoch-alias");
        const std::int64_t start=std::int64_t(i%2)*2000000000LL;
        Need(s.media_start_pts==start&&s.media_end_pts&&*s.media_end_pts==start+1999999999LL&&s.time_base_num==1&&s.time_base_den==1000000000,"pts-range");
        for(std::size_t j=0;j<60;++j){const auto ordinal=(i%2)*60+j+1;const auto pts=std::int64_t(ordinal-1)*1000000000LL/30;const auto& a=binding->samples[j];const auto& f=binding->file_evidence->samples[j];Need(a.ordinal==ordinal&&a.pts_ns==std::uint64_t(pts)&&f.ordinal==ordinal&&f.original_pts_ns==pts&&f.original_dts_ns==pts,"sample-time");}
        std::int64_t lo=std::numeric_limits<std::int64_t>::max(),hi=0;
        for(const auto& m:s.mappings){Need(m.utc_start_ns&&m.utc_end_ns&&m.end_pts&&m.provenance!="unknown","utc-mapping");lo=std::min(lo,*m.utc_start_ns);hi=std::max(hi,*m.utc_end_ns);}
        const auto expected_utc=(anchor-60000+std::int64_t(i)*2000)*1000000LL;
        Need(lo==expected_utc&&hi==lo+1999999999LL&&lo/1000000>=PreseedNowMs()-3600000&&(hi+999999)/1000000<=anchor,"utc-range");
        const auto media=reader.ResolveMedia(Channel,s.segment_id);Need(bool(media),"media-resolve");struct stat st{};
        Need(fstat(media->fd(),&st)==0&&S_ISREG(st.st_mode)&&st.st_uid==getuid()&&st.st_nlink==1&&std::uint64_t(st.st_size)==s.size_bytes&&VerifyRecordingFileEvidenceFd(media->fd(),*binding,&error)&&HashFile(row.media_path)==s.checksum_sha256,"file-proof:"+error);
        if(!out.count)out.utc_first=lo/1000000;out.utc_last=(hi+999999)/1000000;out.last_order=s.order_sequence;++out.count;out.bytes+=s.size_bytes;
        out.ledger+=std::to_string(s.order_sequence)+" "+s.segment_id+" "+std::to_string(s.size_bytes)+" "+s.checksum_sha256+" "+PreseedHash(SerializeRecordingSegmentV2(s))+" "+PreseedHash(SerializeRecordingSourceBindingV1(*binding))+"\n";
    }
    if(expected==4)Need(epochs.at(1)!=epochs.at(2),"distinct-epochs");
    RecordingLocationCatalogSnapshot locations;Need(catalog.SnapshotLocationsV2(Channel,&locations,&error)&&locations.deleted_segment_ids.empty(),"no-deletion-history");return out;
}
std::int64_t Anchor(const std::filesystem::path& root){std::istringstream in(Read(root/"lifetime-anchor.txt"));std::int64_t n=0;Need(bool(in>>n)&&n>0&&(in>>std::ws).eof()&&n<=PreseedNowMs()&&n>=PreseedNowMs()-3600000,"anchor");return n;}
std::uint64_t CatalogHolds(RecordingCatalog& catalog,const std::string& selected){
    // Fresh authority, not the deliberately retained historical DTO.
    const auto snapshot=catalog.RetentionSnapshot();Need(snapshot.authoritative,"hold-authority");bool found=false;std::uint64_t held=0;
    for(const auto& row:snapshot.candidates){if(!selected.empty()&&row.Id()==selected){Need(!found,"hold-duplicate");found=true;held=row.hold_count;}else Need(row.hold_count==0,"other-hold-remains");}
    Need(selected.empty()||found,"hold-selected-missing");return held;
}
void SaveState(const std::filesystem::path& root,const char* label,const State& s,std::int64_t anchor){
    const auto m=Manifest(root);Need(m.store_id==s.store&&m.generation>0&&m.cut_ordinal>0&&std::filesystem::file_size(root/"recordings"/m.active.name)==m.active.size,"cut");
    const std::string stem="lifetime-"+std::string(label);PreseedSave(root/(stem+".ledger"),s.ledger);
    const auto source=Read(root/"lifetime-source.json");Need(!source.empty()&&source.size()<16384,"source-binding");
    std::ostringstream out;out<<"{\"schema\":\"native-lifetime-v1\",\"phase\":"<<EvidenceJsonQuote(label)<<",\"storeId\":"<<EvidenceJsonQuote(s.store)<<",\"generation\":"<<m.generation<<",\"cutOrdinal\":"<<m.cut_ordinal<<",\"lastOrder\":"<<s.last_order<<",\"count\":"<<s.count<<",\"bytes\":"<<s.bytes<<",\"anchorMs\":"<<anchor<<",\"utcFirstMs\":"<<s.utc_first<<",\"utcLastMs\":"<<s.utc_last<<",\"ptsMinNs\":0,\"ptsMaxNs\":3999999999,\"sourceGenerations\":"<<s.count/2<<",\"epochs\":"<<s.count/2<<",\"fileProofCount\":"<<s.count<<",\"manifestSha256\":"<<EvidenceJsonQuote(HashFile(root/"recordings/recording-generation.json"))<<",\"ledgerSha256\":"<<EvidenceJsonQuote(PreseedHash(s.ledger))<<",\"source\":"<<source<<",\"finish\":true,\"catalogHoldsAtFinish\":0,\"runtimeDestroyed\":true,\"checkpointKind\":\"explicit-only\",\"scope\":\"object-lifetime-only\"}\n";
    PreseedSave(root/(stem+".json"),out.str());
}
std::string HeldAsset(const EvidencePackageFile& file){std::string joined=SerializeEvidencePackage(file.manifest());for(std::size_t i=0;i<file.manifest().assets.size();++i){const auto& a=file.manifest().assets[i];Need(a.size_bytes<=256*1024,"asset-cap");std::vector<std::uint8_t> bytes(a.size_bytes);std::size_t at=0;while(at<bytes.size()){const auto n=pread(file.fd(),bytes.data()+at,bytes.size()-at,file.AssetOffset(i)+at);if(n<0&&errno==EINTR)continue;Need(n>0,"asset-read");at+=std::size_t(n);}const auto hash=EvidenceSha256(bytes.data(),bytes.size());Need(hash==a.sha256,"asset-sha");joined+=hash;}return PreseedHash(joined);}
// Only live public handles and weak references are observed; no diagnostic owner is manufactured.
void Owners(RecordingResourceTrace& trace,const char* stage,const std::unique_ptr<RecordingSearchReader::PreparedSource>& prepared,
 const std::shared_ptr<const ResolvedRecordingMedia>& alias,const std::shared_ptr<const RecordingSearchModel>& old,
 const RecordingSearchPage& page,const std::unique_ptr<RecordingSearchSnapshots>& pool,const std::weak_ptr<const RecordingSearchModel>& weak,
 const std::shared_ptr<const RecordingSearchModel>& next,const std::shared_ptr<EvidencePackageFile>& evidence,const std::optional<RetentionSnapshot>& dto,std::uint64_t old_id,RecordingCatalog& catalog,const std::string& selected){
    const auto held=CatalogHolds(catalog,selected);Need(held==(alias?1U:0U),"catalog-hold-return");
    std::cout<<"[lifetime-owner] {\"stage\":"<<EvidenceJsonQuote(stage)<<",\"prepared\":"<<bool(prepared)<<",\"alias\":"<<bool(alias)<<",\"oldDirect\":"<<bool(old)<<",\"page\":"<<bool(page.model)<<",\"pool\":"<<bool(pool)<<",\"oldAlive\":"<<!weak.expired()<<",\"newModel\":"<<bool(next)<<",\"evidence\":"<<bool(evidence)<<",\"dto\":"<<bool(dto)<<",\"oldId\":"<<old_id<<",\"catalogHolds\":"<<held<<",\"newId\":"<<(next?next->diagnostic_identity():0)<<"}"<<std::endl;
    Phase(trace,stage);
}
}
int NativeLifetime(const std::filesystem::path& root,const std::string& mode,Encoded input){
    using namespace recording;using namespace native_lifetime;const bool prepare=mode=="--lifetime-prepare",observe=mode=="--lifetime-observe";const auto media=root/"recordings";
    const auto anchor=prepare?PreseedNowMs():Anchor(root);if(prepare)PreseedSave(root/"lifetime-anchor.txt",std::to_string(anchor)+"\n");
    RecordingResourceTrace trace("1");std::string error;State final;
    {
        RecordingRuntimeStorage runtime(media);Need(runtime.Open(&error),"open:"+error);auto& catalog=runtime.catalog();Recovery(catalog);
        Need(trace.Bind(catalog.SearchResidency(),catalog.ScratchResidency()),"resource-bind");Phase(trace,"opened");
        if(prepare){Need(catalog.RetentionSnapshot().candidates.empty(),"fresh-store");Write(runtime,media,input,anchor,1);final=Inspect(runtime,anchor,2);Need(catalog.Checkpoint(&error),"prepare-checkpoint:"+error);Phase(trace,"baseline");}
        else if(observe){
            const auto before=Inspect(runtime,anchor,2);Need(before.ledger==Read(root/"lifetime-prepare.ledger"),"baseline-ledger");Phase(trace,"baseline");
            {
                RecordingReadService reader(catalog);RecordingSearchReader search(catalog,reader);
                std::shared_ptr<const RecordingSearchModel> old,next;Need(search.Refresh({Channel},{},&old,&error),"old-model:"+error);Need(old&&old->documents().size()==2,"old-documents");
                const auto selected=std::find_if(old->documents().begin(),old->documents().end(),[](const auto& d){return d.channel_id==Channel&&d.start_ns&&d.media_pts;});Need(selected!=old->documents().end(),"search-hit");const auto hit=*selected;
                auto prepared=search.PrepareSource(Channel,hit.segment_id,&error);Need(bool(prepared),"prepared:"+error);auto alias=prepared->Hold();Need(bool(alias),"alias");std::weak_ptr<const ResolvedRecordingMedia> weak_media=alias;
                SearchSeekTarget target;Need(search.SourceSeekPrepared(*prepared,*hit.media_pts,hit.time_base_num,hit.time_base_den,&target,&error),"seek-before:"+error);
                RecordingSearchQuery query;query.channels={Channel};query.start_time_ms=anchor-3600000;query.end_time_ms=anchor;query.limit=1;
                auto pool=std::make_unique<RecordingSearchSnapshots>();RecordingSearchPage page;Need(pool->Begin(old,query,"native-lifetime","9101",&page,&error)&&page.model==old&&page.positions.size()==1&&!page.next_cursor.empty(),"snapshot-page:"+error);
                EvidencePackageStore store(media/"evidence-packages",{},catalog.SearchResidency(),catalog.ScratchResidency());Need(store.Recover(&error),"package-store");EvidencePackageBuilder builder(catalog,reader,store);EvidencePackageV1 manifest;std::string package;
                Need(builder.Create(hit,"structured","",&package,&manifest,&error,std::chrono::steady_clock::now()+std::chrono::seconds(5)),"package-create:"+error);
                auto evidence=store.Open(package,&error);Need(bool(evidence),"package-open");std::weak_ptr<EvidencePackageFile> weak_package=evidence;const auto package_hash=HeldAsset(*evidence);std::optional<RetentionSnapshot> dto=catalog.RetentionSnapshot();
                std::weak_ptr<const RecordingSearchModel> weak_old=old;const auto old_id=old->diagnostic_identity();Need(old_id>0,"old-diagnostic-id");
                const auto witness=[&](const char* stage){Owners(trace,stage,prepared,alias,old,page,pool,weak_old,next,evidence,dto,old_id,catalog,hit.segment_id);};witness("held");
                Write(runtime,media,input,anchor,2);final=Inspect(runtime,anchor,4);Need(final.last_order>before.last_order&&final.ledger.compare(0,before.ledger.size(),before.ledger)==0,"append-prefix");
                Need(search.Refresh({Channel},old,&next,&error)&&next&&next!=old&&next->documents().size()==4&&next->diagnostic_identity()!=old_id,"new-model:"+error);witness("appended");
                Need(catalog.Checkpoint(&error),"observe-checkpoint:"+error);Need(search.SourceSeekPrepared(*prepared,*hit.media_pts,hit.time_base_num,hit.time_base_den,&target,&error)&&HeldAsset(*evidence)==package_hash,"held-after-checkpoint:"+error);witness("checkpoint-held");
                prepared.reset();Need(!weak_media.expired()&&alias,"alias-last-owner");struct stat st{};Need(fstat(alias->fd(),&st)==0&&S_ISREG(st.st_mode),"alias-fd");witness("prepared-released");
                alias.reset();Need(weak_media.expired(),"reader-last-reference");witness("reader-released");
                old.reset();Need(!weak_old.expired()&&page.model,"page-pool-retain");witness("direct-released");
                page=RecordingSearchPage{};Need(!weak_old.expired(),"pool-retains");witness("page-released");
                pool.reset();Need(weak_old.expired(),"model-last-reference");witness("pool-released");
                evidence.reset();Need(weak_package.expired(),"package-last-reference");witness("evidence-released");
                dto.reset();next.reset();witness("objects-released");
                PreseedSave(root/"lifetime-package.txt",package+" "+package_hash+"\n");
            } // reader/search/builder/store and aliases die before Catalog Finish.
        }else{
            const auto manifest=Read(media/"recording-generation.json");final=Inspect(runtime,anchor,4);Need(final.ledger==Read(root/"lifetime-observe.ledger"),"reopen-ledger");
            {std::istringstream receipt(Read(root/"lifetime-package.txt"));std::string id,hash;Need(bool(receipt>>id>>hash)&&(receipt>>std::ws).eof(),"package-receipt");EvidencePackageStore store(media/"evidence-packages",{},catalog.SearchResidency(),catalog.ScratchResidency());Need(store.Recover(&error),"package-recover");auto file=store.Open(id,&error);Need(file&&HeldAsset(*file)==hash,"package-reopen");}
            Need(Read(media/"recording-generation.json")==manifest,"reopen-manifest");Phase(trace,"baseline");
        }
        Need(CatalogHolds(catalog,{})==0,"finish-holds");Need(trace.Emit("before-Finish"),"before-finish");Need(runtime.Finish(&error),"finish:"+error);Need(trace.Emit("after-Finish"),"after-finish");
    }
    SaveState(root,prepare?"prepare":observe?"observe":"reopen",final,anchor);Phase(trace,"released");return 0;
}

// NATIVE-RETENTION-01: synthetic single-channel retention, not a long-run/Visual test.
namespace native_retention {
using namespace recording;
constexpr const char* Channel="9101";
constexpr std::uint64_t Q=108ULL*1024*1024,E=64ULL*1024*1024;
void Need(bool ok,const std::string& code){R99Need(ok,"retention-"+code);}
struct State {std::string store,ledger;std::uint64_t count=0,bytes=0;std::int64_t order=0;std::set<std::string> deleted;};
struct Removed {std::string id,path,segment_sha;std::uint64_t bytes;};
struct History {std::uint64_t next=0,count=0,finalized=0,deleted=0,pending=0,reserved=0;std::string rows,chain;std::uint64_t journal_bytes=0;std::string journal_sha;};
RecordingGenerationActiveReadResult Active(const std::filesystem::path& media){RecordingGenerationActiveReadResult a;std::string error;
    Need(ReadRecordingGenerationActive(media,1024*1024,&a,&error),"active-read:"+error);return a;}
void Absent(const std::filesystem::path& path){struct stat st{};errno=0;Need(lstat(path.c_str(),&st)<0&&errno==ENOENT,"deleted-file-enoent");}
State Inspect(RecordingCatalog& catalog,const std::filesystem::path& media,const std::array<std::string,3>& protected_ids,bool held){
    State out;const auto snapshot=catalog.RetentionSnapshot();Need(snapshot.authoritative&&snapshot.durable_reservations.empty(),"snapshot-authority");
    std::vector<const RetentionCandidate*> rows;for(const auto& r:snapshot.candidates)rows.push_back(&r);
    std::sort(rows.begin(),rows.end(),[](auto* a,auto* b){return a->segment_v2&&b->segment_v2?a->segment_v2->order_sequence<b->segment_v2->order_sequence:a->Id()<b->Id();});
    std::string error;std::set<std::string> ids;std::uint64_t holds=0,pins=0;
    for(const auto* row:rows){Need(row->segment_v2&&row->Channel()==Channel&&row->Lifecycle()==RecordingLifecycle::Finalized,"pending-or-invalid-row");const auto& s=*row->segment_v2;
        if(out.store.empty())out.store=s.store_id;Need(s.store_id==out.store&&s.order_sequence>out.order&&s.size_bytes>0&&ids.insert(s.segment_id).second,"store-order-size");
        const auto binding=catalog.FindSourceBinding(s.segment_id);Need(binding&&binding->file_evidence&&binding->samples.size()==60&&binding->file_evidence->samples.size()==60,"file-binding");
        const int fd=open(row->media_path.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);Need(fd>=0,"file-open");struct stat st{};
        const bool valid=fstat(fd,&st)==0&&S_ISREG(st.st_mode)&&st.st_uid==getuid()&&st.st_nlink==1&&std::uint64_t(st.st_size)==s.size_bytes&&VerifyRecordingFileEvidenceFd(fd,*binding,&error);const int closed=close(fd);Need(valid&&closed==0,"file-proof:"+error);
        const auto expected_hold=held&&(s.segment_id==protected_ids[0]||s.segment_id==protected_ids[2])?1U:0U;
        Need(row->hold_count==expected_hold&&row->Pinned()==(s.segment_id==protected_ids[1]),"hold-pin-protection");holds+=row->hold_count;pins+=row->Pinned();
        ++out.count;out.bytes+=s.size_bytes;out.order=s.order_sequence;
        out.ledger+=std::to_string(s.order_sequence)+" "+s.segment_id+" "+std::to_string(s.size_bytes)+" "+s.checksum_sha256+" "+PreseedHash(SerializeRecordingSegmentV2(s))+" "+PreseedHash(SerializeRecordingSourceBindingV1(*binding))+" "+std::to_string(s.pinned)+"\n";
    }
    Need(out.count>3&&out.count<2048&&holds==(held?2U:0U)&&pins==1,"active-protection-count");for(const auto& id:protected_ids)Need(ids.count(id)==1,"protected-id-missing");
    RecordingLocationCatalogSnapshot locations;Need(catalog.SnapshotLocationsV2(Channel,&locations,&error),"locations:"+error);
    out.deleted.insert(locations.deleted_segment_ids.begin(),locations.deleted_segment_ids.end());Need(out.deleted.size()==locations.deleted_segment_ids.size(),"duplicate-tombstone");
    for(const auto& id:out.deleted){Need(!ids.count(id),"active-deleted-alias");Absent(media/Channel/(id+".mp4"));}
    return out;
}
History ObserveHistory(const std::filesystem::path& media,const RecordingGenerationManifest& baseline,const std::string& prior,
 const State& before,const State& after,const std::vector<Removed>& removed){
    const auto a=Active(media);Need(a.manifest.store_id==baseline.store_id&&a.manifest.generation==baseline.generation&&a.manifest.cut_ordinal==baseline.cut_ordinal,"unexpected-generation-transition");
    History h;h.journal_bytes=a.active_file.size;h.journal_sha=a.active_file.sha256;h.next=baseline.cut_ordinal+a.rows.size();std::set<std::string> mutations,deleted,pending,finalized;std::string error;
    for(const auto& row:a.rows){const auto& m=row.mutation;Need(row.global_ordinal==baseline.cut_ordinal+h.count&&mutations.insert(m.mutation_id).second,"mutation-ordinal-duplicate");
        if(h.count++)h.rows+=",";h.rows+="{\"ordinal\":"+std::to_string(row.global_ordinal)+",\"id\":"+EvidenceJsonQuote(m.mutation_id)+",\"entity\":"+EvidenceJsonQuote(m.entity_id)+",\"type\":"+std::to_string(int(m.mutation_type))+",\"rawSha256\":"+EvidenceJsonQuote(row.raw_sha256)+"}";
        h.chain+=std::to_string(row.global_ordinal)+" "+m.mutation_id+" "+row.raw_sha256+"\n";
        if(m.mutation_type==RecordingMutationType::RecordingOrderReserved)++h.reserved;
        else if(m.mutation_type==RecordingMutationType::SegmentV2BoundFinalized){Need(finalized.insert(m.entity_id).second,"duplicate-finalize");++h.finalized;}
        else if(m.mutation_type==RecordingMutationType::SegmentV2State){RecordingSegmentStateV2 state;Need(ParseRecordingSegmentStateV2(m.payload_json,&state,&error)&&state.segment_id==m.entity_id&&state.lifecycle==RecordingLifecycle::DeletionPending&&pending.insert(m.entity_id).second,"pending-payload");++h.pending;}
        else if(m.mutation_type==RecordingMutationType::SegmentV2Deleted){RecordingTombstoneV2 t;Need(ParseRecordingTombstoneV2(m.payload_json,&t,&error)&&t.segment.segment_id==m.entity_id&&t.segment.store_id==baseline.store_id&&t.segment.channel_id==Channel&&t.deleted_at_ms>0&&pending.count(m.entity_id)&&deleted.insert(m.entity_id).second,"tombstone-payload");
            const auto match=std::find_if(removed.begin(),removed.end(),[&](const auto& r){return r.id==m.entity_id;});
            if(match!=removed.end())Need(t.segment.size_bytes==match->bytes&&PreseedHash(SerializeRecordingSegmentV2(t.segment))==match->segment_sha,"tombstone-file-binding");++h.deleted;}
        else Need(false,"unexpected-mutation-type");
    }
    Need(h.chain.compare(0,prior.size(),prior)==0&&h.chain.size()>prior.size(),"history-prefix");
    Need(deleted==after.deleted&&pending==deleted&&h.finalized>0&&h.reserved==h.finalized&&h.count==2*h.finalized+2*h.deleted,"history-conservation");
    Need(after.deleted.size()==before.deleted.size()+removed.size(),"deletion-set-count");
    for(const auto& r:removed){Need(!before.deleted.count(r.id)&&after.deleted.count(r.id)&&deleted.count(r.id),"independent-deletion");Absent(media/r.path);}
    return h;
}
void Save(const std::filesystem::path& root,const std::string& phase,const State& state,const RecordingGenerationManifest& baseline,
 std::uint64_t initial_next,std::uint64_t n,std::uint64_t seed_bytes,const History& h,std::uint64_t new_deleted,std::uint64_t removed_bytes,
 const std::array<std::string,3>& protected_ids,bool held,bool finished,const std::string& extra=""){
    const auto manifest=native_lifetime::Manifest(root);const auto stem="retention-"+phase;PreseedSave(root/(stem+".ledger"),state.ledger);
    std::ostringstream out;out<<"{\"schema\":\"native-retention-v1\",\"phase\":"<<EvidenceJsonQuote(phase)<<",\"channel\":\"9101\",\"scope\":"<<EvidenceJsonQuote(extra.empty()?"synthetic-retention-two-cycles":"synthetic-retention-eight-cycles")<<",\"storeId\":"<<EvidenceJsonQuote(state.store)<<",\"generation\":"<<manifest.generation<<",\"cutOrdinal\":"<<manifest.cut_ordinal<<",\"baselineGeneration\":"<<baseline.generation<<",\"baselineCut\":"<<baseline.cut_ordinal<<",\"initialNextOrdinal\":"<<initial_next<<",\"preparationMutations\":"<<baseline.cut_ordinal-initial_next<<",\"initialCount\":"<<n<<",\"seedBytes\":"<<seed_bytes<<",\"activeCount\":"<<state.count<<",\"activeBytes\":"<<state.bytes<<",\"lastOrder\":"<<state.order<<",\"pendingCount\":0,\"deletedCount\":"<<state.deleted.size()<<",\"newDeleted\":"<<new_deleted<<",\"removedBytes\":"<<removed_bytes<<",\"observedFinalized\":"<<h.finalized<<",\"observedMutations\":"<<h.count<<",\"nextOrdinal\":"<<h.next<<",\"historySha256\":"<<EvidenceJsonQuote(PreseedHash(h.chain))<<",\"historyRows\":["<<h.rows<<"],\"holds\":"<<(held?2:0)<<",\"pinCount\":1,\"protectedIds\":[";
    for(unsigned i=0;i<3;++i){if(i)out<<',';out<<EvidenceJsonQuote(protected_ids[i]);}out<<"],\"deletedIds\":[";bool comma=false;for(const auto& id:state.deleted){if(comma)out<<',';comma=true;out<<EvidenceJsonQuote(id);}out<<"],\"admissionRejected\":0,\"fileProofCount\":"<<state.count<<",\"ledgerSha256\":"<<EvidenceJsonQuote(PreseedHash(state.ledger))<<",\"manifestSha256\":"<<EvidenceJsonQuote(native_lifetime::HashFile(root/"recordings/recording-generation.json"))<<",\"source\":"<<Read(root/"retention-source.json")<<",\"finish\":"<<(finished?"true":"false")<<",\"runtimeDestroyed\":"<<(finished?"true":"false")<<",\"checkpointKind\":\"explicit-preparation-and-final-only\""<<extra<<"}\n";
    PreseedSave(root/(stem+".json"),out.str());
}
}
int NativeRetention(const std::filesystem::path& root,const std::string& mode,Encoded input){
    using namespace recording;using namespace native_retention;
    const bool window=mode=="--retention-history-live"||mode=="--retention-history-reopen";
    const bool live=mode=="--retention-live"||mode=="--retention-history-live";const unsigned cycles=window?8U:2U;
    const std::array<const char*,8> cycle_names{{"cycle-one","cycle-two","cycle-three","cycle-four","cycle-five","cycle-six","cycle-seven","cycle-eight"}};
    const auto window_begin=std::chrono::steady_clock::now();
    const auto elapsed=[&]{return std::uint64_t(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-window_begin).count());};
    std::uint64_t resource_seq=0,window_index=0,window_seq=0,start_ms=0,writer_ms=0,inspect_ms=0,history_ms=0,max_cycle_ms=6538;
    const auto extra=[&](const History& h){if(!window)return std::string{};std::ostringstream o;
        o<<",\"historyWindow\":{\"plannedCycles\":8,\"cycleIndex\":"<<window_index<<",\"pid\":"<<getpid()<<",\"resourceSequence\":"<<window_seq
         <<",\"observedJournalBytes\":"<<h.journal_bytes<<",\"observedJournalSha256\":"<<EvidenceJsonQuote(h.journal_sha)
         <<",\"startMs\":"<<start_ms<<",\"writerDoneMs\":"<<writer_ms<<",\"inspectDoneMs\":"<<inspect_ms<<",\"historyDoneMs\":"<<history_ms<<"}";return o.str();};const auto media=root/"recordings";
    RecordingResourceTrace trace("1");
    const auto phase=[&](const char* name){if(std::string(name)!="released")++resource_seq;R99Phase(trace,name);};
    const auto saved=[&](const char* name){if(!window)return;const auto file=root/("retention-"+std::string(name)+".json");
        std::cout<<"[retention-window] {\"phase\":"<<EvidenceJsonQuote(name)<<",\"cycleIndex\":"<<window_index<<",\"resourceSequence\":"<<window_seq
                 <<",\"pid\":"<<getpid()<<",\"artifactSavedMs\":"<<elapsed()<<",\"receiptSha256\":"<<EvidenceJsonQuote(PreseedHash(Read(file)))<<"}"<<std::endl;};
    std::string error;State final;History history;RecordingGenerationManifest boundary;std::uint64_t initial_next=0,n=0,seed_bytes=0;std::array<std::string,3> protected_ids;
    {
      RecordingRuntimeStorage runtime(media);Need(runtime.Open(&error),"open:"+error);auto& catalog=runtime.catalog();native_lifetime::Recovery(catalog);
      Need(trace.Bind(catalog.SearchResidency(),catalog.ScratchResidency()),"trace-bind");phase("opened");
      if(live){
        const auto initial=Active(media);Need(initial.rows.empty()&&catalog.RetentionSnapshot().candidates.empty(),"fresh-state");initial_next=initial.manifest.cut_ordinal;
        Need(input.packets.size()==120&&recording_mixed_fixture::kQuota==Q&&recording_mixed_fixture::kReserved==E,"fixed-input-policy");input.packets.resize(60);const auto anchor=PreseedNowMs();
        for(auto& p:input.packets){Need(bool(p.observation),"observation");auto& o=*p.observation;o.clock_process_id="native-retention-synthetic";o.mono_before_ns=1000000000LL+p.pts;o.mono_after_ns=o.mono_before_ns+1000;o.observed_utc_ns=(anchor-60000)*1000000LL+p.pts;}
        std::vector<Removed> removed;std::map<std::string,Removed> eligible;bool callback_error=false;unsigned admitted=0,completed=0,rejected=0;
        RetentionCoordinator retention(catalog,[&](auto* bytes,auto*){*bytes=std::filesystem::space(media).available;return true;},
          [&](const auto& file,auto* e){try{const auto key=std::filesystem::relative(file,media).string();const auto it=eligible.find(key);if(it==eligible.end()){callback_error=true;if(e)*e="unrecognized-delete";return false;}const bool ok=RemoveContainedMediaFile(media,file,e,{},true);if(ok){Absent(file);removed.push_back(it->second);}return ok;}catch(...){callback_error=true;return false;}},{0,E,media});
        RetentionPolicy policy;policy.continuous_max_bytes=Q;policy.event_max_bytes=128ULL*1024*1024;policy.continuous_max_age_ms=10800000;policy.event_max_age_ms=10800000;Need(retention.UpdateChannelPolicy(Channel,policy,&error),"policy");
        const auto write=[&]{auto options=runtime.WriterOptions(2000);admitted=completed=rejected=0;callback_error=false;
          options.admit_segment=[&](const auto& channel,std::uint64_t minimum){try{const auto a=retention.AdmitContinuousWrite(channel,minimum,PreseedNowMs());a.allowed?++admitted:++rejected;callback_error|=a.reserved_bytes!=E;return SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};}catch(...){callback_error=true;return SegmentAdmissionDecision{false,false,0};}};
          options.report_segment_progress=[&](const auto& channel,std::uint64_t bytes){try{retention.UpdateContinuousWriteProgress(channel,bytes);}catch(...){callback_error=true;}};
          options.complete_segment=[&](const auto& channel,std::uint64_t bytes){try{retention.CompleteContinuousWrite(channel,bytes);++completed;callback_error|=bytes==0;}catch(...){callback_error=true;}};
          GStreamerSegmentWriter writer(options);Need(writer.Start(Channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer-start:"+error);for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();
          Need(!callback_error&&admitted==1&&completed==1&&rejected==0&&!retention.ChannelStatus(Channel).storage_blocked,"writer-admission-completion");};
        write();Need(removed.empty(),"preparation-deletion");
        {
          const auto seed_snapshot=catalog.RetentionSnapshot();Need(seed_snapshot.authoritative&&seed_snapshot.candidates.size()==1&&seed_snapshot.candidates[0].segment_v2,"seed-row");const auto& source=seed_snapshot.candidates[0];const auto seed=*source.segment_v2;
          const auto binding=catalog.FindSourceBinding(seed.segment_id);Need(binding&&binding->file_evidence&&seed.size_bytes>0&&seed.size_bytes<=recording_mixed_fixture::kSegmentBytes,"seed-proof");seed_bytes=seed.size_bytes;n=(Q-E)/seed_bytes+2;Need(n>4&&n<2048,"initial-count-cap");protected_ids[0]=seed.segment_id;
          for(std::uint64_t i=1;i<n;++i){auto row=seed;row.segment_id="native-retention-"+std::to_string(i);row.order_request_id="order-"+row.segment_id;row.pinned=i==1;
            RecordingOrderReservationV1 order;Need(catalog.ReserveRecordingOrder(row.store_id,row.order_request_id,row.segment_id,Channel,&order,&error),"reserve:"+error);row.order_sequence=order.sequence;
            auto bound=*binding;bound.segment_id=row.segment_id;const auto target=media/Channel/(row.segment_id+".mp4");std::filesystem::copy_file(source.media_path,target);
            const int fd=open(target.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);Need(fd>=0,"clone-open");const bool valid=VerifyRecordingFileEvidenceFd(fd,bound,&error);const int closed=close(fd);Need(valid&&closed==0,"clone-proof:"+error);
            Need(catalog.FinalizeBoundSegmentV2(row,bound,target.string(),&error),"bound-finalize:"+error);if(i<3)protected_ids[i]=row.segment_id;if(i%64==0)phase("prestate-progress");
          }
        }
        {
          Need(catalog.AdjustHoldCount(protected_ids[0],1,&error),"manual-hold");RecordingReadService reader(catalog);auto lease=reader.ResolveMedia(Channel,protected_ids[2]);Need(bool(lease),"reader-hold");
          auto previous=Inspect(catalog,media,protected_ids,true);Need(previous.count==n&&previous.bytes==n*seed_bytes&&previous.deleted.empty()&&previous.bytes+E>Q&&previous.bytes<Q,"initial-admission");
          Need(catalog.Checkpoint(&error),"baseline-checkpoint:"+error);const auto a=Active(media);Need(a.rows.empty()&&a.manifest.cut_ordinal>initial_next,"baseline-cut");boundary=a.manifest;history.next=boundary.cut_ordinal;history.journal_bytes=a.active_file.size;history.journal_sha=a.active_file.sha256;window_seq=resource_seq+1;
          Save(root,"baseline",previous,boundary,initial_next,n,seed_bytes,history,0,0,protected_ids,true,false,extra(history));saved("baseline");phase("baseline");
          for(unsigned cycle=1;cycle<=cycles;++cycle){
            if(window){const auto now=elapsed();const auto required=std::uint64_t(cycles-cycle+1)*2*max_cycle_ms+30000;
                Need(now<=180000&&required<=180000-now,"history-budget-before-writer");}
            start_ms=elapsed();Need(previous.bytes+E>Q,"next-admission-boundary");eligible.clear();removed.clear();
            {const auto state=catalog.RetentionSnapshot();Need(state.authoritative,"eligible-authority");for(const auto& r:state.candidates)if(!r.hold_count&&!r.Pinned()&&r.segment_v2){const auto relative=std::filesystem::relative(r.media_path,media).string();eligible.emplace(relative,Removed{r.Id(),relative,PreseedHash(SerializeRecordingSegmentV2(*r.segment_v2)),r.Size()});}}
            write();writer_ms=elapsed();Need(!removed.empty(),"no-actual-deletion");auto current=Inspect(catalog,media,protected_ids,true);inspect_ms=elapsed();std::uint64_t deleted_bytes=0;for(const auto& r:removed)deleted_bytes+=r.bytes;
            Need(current.count+removed.size()==previous.count+1&&current.bytes+deleted_bytes==previous.bytes+seed_bytes&&current.bytes<=Q&&current.order==previous.order+1,"cycle-count-bytes-order");
            {const auto state=catalog.RetentionSnapshot();unsigned fresh=0;for(const auto& r:state.candidates)if(r.segment_v2&&r.segment_v2->order_sequence>previous.order){++fresh;Need(r.Size()==seed_bytes&&r.Lifecycle()==RecordingLifecycle::Finalized,"fresh-finalized");}Need(fresh==1,"fresh-finalized-count");}
            if(window&&cycle>=2)Need(removed.size()==1&&current.count==previous.count&&current.bytes==previous.bytes,"fixed-active-cycle");
            auto next=ObserveHistory(media,boundary,history.chain,previous,current,removed);Need(next.finalized==cycle&&next.deleted==current.deleted.size(),"cycle-history");history=std::move(next);history_ms=elapsed();
            struct stat st{};Need(fstat(lease->fd(),&st)==0&&std::uint64_t(st.st_size)==seed_bytes,"reader-after-deletion");eligible.clear();
            window_index=cycle;window_seq=resource_seq+1;const auto name=cycle_names.at(cycle-1);
            Save(root,name,current,boundary,initial_next,n,seed_bytes,history,removed.size(),deleted_bytes,protected_ids,true,false,extra(history));saved(name);phase(name);
            max_cycle_ms=std::max(max_cycle_ms,elapsed()-start_ms);previous=std::move(current);
          }
          lease.reset();Need(catalog.AdjustHoldCount(protected_ids[0],-1,&error),"release-manual-hold");
        }
        final=Inspect(catalog,media,protected_ids,false);Need(catalog.Checkpoint(&error),"final-checkpoint:"+error);const auto last=Active(media);Need(last.rows.empty()&&last.manifest.cut_ordinal==history.next&&last.manifest.generation==boundary.generation+1,"final-cut");
        PreseedSave(root/"retention-recovery.txt",std::to_string(initial_next)+" "+std::to_string(n)+" "+std::to_string(seed_bytes)+" "+std::to_string(boundary.generation)+" "+std::to_string(boundary.cut_ordinal)+" "+protected_ids[0]+" "+protected_ids[1]+" "+protected_ids[2]+"\n");phase("checkpoint");
      }else{
        std::istringstream meta(Read(root/"retention-recovery.txt"));Need(bool(meta>>initial_next>>n>>seed_bytes>>boundary.generation>>boundary.cut_ordinal>>protected_ids[0]>>protected_ids[1]>>protected_ids[2])&&(meta>>std::ws).eof(),"recovery-receipt");
        const auto manifest=Read(media/"recording-generation.json");final=Inspect(catalog,media,protected_ids,false);Need(final.ledger==Read(root/"retention-final.ledger"),"recovery-ledger");
        std::ostringstream ids;for(const auto& id:final.deleted)ids<<id<<'\n';Need(ids.str()==Read(root/"retention-deleted.txt"),"recovery-deleted-set");
        {RecordingReadService reader(catalog);for(const auto& id:protected_ids)Need(bool(reader.ResolveMedia(Channel,id)),"recovery-reader");for(const auto& id:final.deleted)Need(!reader.ResolveMedia(Channel,id),"recovery-deleted-reader");}
        Need(Read(media/"recording-generation.json")==manifest,"recovery-manifest");R99Phase(trace,"baseline");
      }
      Need(native_lifetime::CatalogHolds(catalog,{})==0,"finish-holds");native_lifetime::Recovery(catalog);Need(trace.Emit("before-Finish"),"trace-before-finish");Need(runtime.Finish(&error),"finish:"+error);Need(trace.Emit("after-Finish"),"trace-after-finish");
    }
    if(live){std::ostringstream ids;for(const auto& id:final.deleted)ids<<id<<'\n';PreseedSave(root/"retention-deleted.txt",ids.str());Save(root,"final",final,boundary,initial_next,n,seed_bytes,history,0,0,protected_ids,false,true,extra(history));}
    else {Need(final.ledger==Read(root/"retention-final.ledger"),"recovered-final-state");PreseedSave(root/"retention-recovered.json","{\"finish\":true,\"runtimeDestroyed\":true,\"exactLedger\":true,\"exactDeletedSet\":true,\"reader\":true,\"manifestUnchanged\":true}\n");}
    phase("released");return 0;
}
