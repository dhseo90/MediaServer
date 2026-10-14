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
