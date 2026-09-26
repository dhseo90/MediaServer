// 파일 용도: 녹화 세대 카탈로그의 readonly 소비 경계를 격리 smoke로 검증한다.
// 공개 B 읽기 복원 검증. 기존 fixture 생성기를 재사용하되 이전 suite main은 실행하지 않는다.
#define RECORDING_SCRATCH_MAIN GenerationScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
#include <sys/stat.h>
#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif

#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
RecordingCatalog::Options PublicOptions(const std::filesystem::path& root,bool sql=true) {
    RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,sql);o.enable_v2_storage=true;return o;
}
void PublicFixture(const std::filesystem::path& root,bool active=false) {
    Fixture(root);std::vector<RecordingMutationV1> rows;
    std::filesystem::create_directories(root/"channel");Write(root/"channel/file.mp4","owned-media-sentinel");
    if(active){auto m=Mutation();m.mutation_id="corrupt";m.entity_id="segment";m.mutation_type=RecordingMutationType::CorruptionDetected;m.payload_json="{\"reason\":\"missing-media\"}";rows.push_back(m);}
    ActiveRows(root,rows);
}
bool ReadFailure(RecordingCatalog& catalog) {
    RecordingCatalogStatusSnapshot status;RecordingTimelineResult timeline;
    RecordingLocationCatalogSnapshot locations;locations.segments.push_back(InputValue().source.segment);
    return !catalog.SnapshotStatus(&status,&error)&&!catalog.RetentionSnapshot().authoritative&&
        !catalog.SnapshotTimelineV2({"channel",0,3000,0,10,false},&timeline,&error)&&
        !catalog.SnapshotLocationsV2("channel",&locations,&error)&&locations.segments.empty()&&!catalog.Open(&error);
}
#if MEDIA_SERVER_USE_SQLITE3
void Sql(const std::filesystem::path& path,const std::string& sql) {
    sqlite3* db=nullptr;Need(sqlite3_open(path.c_str(),&db)==SQLITE_OK);
    const bool ok=sqlite3_exec(db,sql.c_str(),nullptr,nullptr,nullptr)==SQLITE_OK;
    if(!ok)error=sqlite3_errmsg(db);sqlite3_close(db);Need(ok);
}
std::string Scalar(const std::filesystem::path& path,const char* sql) {
    sqlite3* db=nullptr;Need(sqlite3_open_v2(path.c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK);
    sqlite3_stmt* s=nullptr;Need(sqlite3_prepare_v2(db,sql,-1,&s,nullptr)==SQLITE_OK);Need(sqlite3_step(s)==SQLITE_ROW);
    const auto* text=sqlite3_column_text(s,0);std::string value=text?reinterpret_cast<const char*>(text):"";
    sqlite3_finalize(s);sqlite3_close(db);return value;
}
std::filesystem::path tamper_path;
void Tamper(sqlite3_context* context,int,sqlite3_value**) {
    std::ofstream out(tamper_path);out<<"changed-by-test\n";out.close();sqlite3_result_int(context,1);
}
#endif
#endif

int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path base(argv[1]);std::filesystem::create_directories(base);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        for(bool sql:{false,true})for(bool active:{false,true}) {
            const auto root=base/(std::string(sql?"sql":"memory")+(active?"-active":"-empty"));PublicFixture(root,active);
            Write(root/"recording-catalog.sqlite3","legacy-cache-preserved");Write(root/"channel/file.mp4.cleanup-pending","untouched cleanup");
            const auto original=Original(root);
            {
                RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog catalog(journal,PublicOptions(root,sql));
                const bool opened=catalog.Open(&error);
                Check("B02-Q01",opened,"public B Open publishes verified current rows");
                if(!opened)continue;
                const auto segment=catalog.FindSegmentById("segment");
                Check("B02-Q01",segment&&segment->lifecycle==(active?RecordingLifecycle::Corrupt:RecordingLifecycle::Finalized),"empty or valid active independent current state");
                RecordingTimelineResult timeline;RecordingCatalogStatusSnapshot status;
                Check("B02-Q01",catalog.SnapshotTimelineV2({"channel",0,3000,0,10,false},&timeline,&error)&&catalog.SnapshotStatus(&status,&error)&&catalog.RetentionSnapshot().authoritative,"public Timeline Status Retention read authority");
                RecordingOrderReservationV1 reserved;
                Check("B02-Q04",!catalog.Checkpoint(&error)&&!catalog.CompleteDeletion(Tomb("segment"),&error)&&
                    !catalog.RequestDeletion("segment","continuous-age",&error)&&!catalog.ValidateManagedWriterBinding(journal,root,"store",&error)&&
                    !journal.Append(Mutation(),&error)&&!journal.ReserveRecordingOrder("store","new","new","channel",&reserved,&error),"durable writes reservation checkpoint writer remain closed");
                if(!active)Check("B02-Q04",catalog.AdjustHoldCount("segment",1,&error),"read-only temporary hold permitted");
#if MEDIA_SERVER_USE_SQLITE3
                if(sql) {
                    const auto cache=root/"recording-generation-catalog.sqlite3";
                    Check("B02-Q02",Scalar(cache,"SELECT store||':'||generation||':'||cut FROM b_meta")=="store:2:10"&&
                        Scalar(cache,"SELECT count(*) FROM b_identity")==std::to_string(active?2:1)&&
                        Scalar(cache,"SELECT count(*) FROM b_current WHERE kind='segment-v1'")=="1","SQLite current typed rows identity and generation metadata");
                    RecordingSegmentV1 sql_segment;
                    Check("B02-Q02",ParseRecordingSegmentV1(Scalar(cache,"SELECT value_json FROM b_current WHERE kind='segment-v1' AND id='segment'"),&sql_segment,&error)&&
                        sql_segment.segment_id=="segment"&&sql_segment.channel_id=="channel"&&sql_segment.source_id=="source"&&
                        sql_segment.lifecycle==(active?RecordingLifecycle::Corrupt:RecordingLifecycle::Finalized),"SQLite actual segment typed fields match independent active state");
                    if(!active) {
                        Check("B02-Q04",Scalar(cache,"SELECT count FROM b_hold WHERE id='segment'")=="1","temporary hold reaches B table");
                        Sql(cache,"CREATE TRIGGER reject_hold BEFORE UPDATE ON b_hold BEGIN SELECT RAISE(ABORT,'fixture'); END;");
                        Check("B02-Q03",!catalog.AdjustHoldCount("segment",1,&error)&&Scalar(cache,"SELECT count FROM b_hold WHERE id='segment'")=="1"&&catalog.RetentionSnapshot().candidates.at(0).hold_count==1,"hold SQL failure keeps SQL and memory count");
                        Sql(cache,"DROP TRIGGER reject_hold;");
                    }
                }
#else
                Check("B02-Q05",!std::filesystem::exists(root/"recording-generation-catalog.sqlite3"),"SQLite unsupported falls back without creating cache");
#endif
                Check("B02-Q04",Original(root)==original&&Read(root/"recording-catalog.sqlite3")=="legacy-cache-preserved"&&
                    Read(root/"channel/file.mp4.cleanup-pending")=="untouched cleanup"&&Read(root/"channel/file.mp4")=="owned-media-sentinel","source old cache actual cleanup marker and media unchanged");
            }
            {RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog catalog(journal,PublicOptions(root,sql));
                Check("B02-Q05",catalog.Open(&error)&&catalog.FindSegmentById("segment").has_value(),"new owner strict reopen returns current state");}
        }
        {
            const auto root=base/"invalid-active";PublicFixture(root);ActiveRows(root,{Mutation()});const auto original=Original(root);
            RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog catalog(journal,PublicOptions(root));
            Check("B02-Q03",!catalog.Open(&error)&&!catalog.FindSegmentById("segment")&&!journal.HasManagedLease()&&
                !std::filesystem::exists(root/"recording-generation-catalog.sqlite3")&&Original(root)==original,"domain-invalid active poisons owner before SQL or live publication");
        }
        for(bool job:{false,true}) {
            const auto root=base/(job?"cold-job":"cold-source");auto input=InputValue();auto fixture=Active(input);
            if(job) {
                auto failed=input.job;failed.state=DerivedJobState::Failed;failed.failure_reason="fixture-failure";failed.cleaned_at_ms=30;
                fixture.Add(RecordingMutationType::DerivedJobFailed,"failed",failed.intent.job_id,SerializeDerivedJobRecord(failed));
                for(auto& row:fixture.snapshot.rows)if(row.kind=="derived-job") {
                    RecordingCatalogJobSummary s;Need(ParseRecordingCatalogJobSummary(row.value_json,&s,&error));s.state=DerivedJobState::Failed;s.latest_mutation_id="failed";
                    Need(SerializeRecordingCatalogJobSummary(s,&row.value_json,&error));
                }
            }else {
                fixture.snapshot.rows.erase(std::remove_if(fixture.snapshot.rows.begin(),fixture.snapshot.rows.end(),[](const auto& r){return r.kind=="derived-job"||(r.kind=="accepted-state"&&r.key=="job-mutation");}),fixture.snapshot.rows.end());
                fixture.chain.first_acceptances.pop_back();fixture.archive.resize(fixture.chain.first_acceptances.back().first_row.offset+fixture.chain.first_acceptances.back().first_row.length);
            }
            Install(fixture,root);RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog catalog(journal,PublicOptions(root));Need(catalog.Open(&error));
            std::optional<DerivedJobRecordV1> result;
            const bool obtained=job?(catalog.FindDerivedJob(input.job.intent.job_id,&result,&error)&&result&&result->state==DerivedJobState::Failed):catalog.FindSourceBinding("segment").has_value();
            Check("B02-Q01",obtained,"real archive cold source or inactive job detail obtained on use");result.reset();
#if MEDIA_SERVER_USE_SQLITE3
            const auto cache=root/"recording-generation-catalog.sqlite3";
            Check("B02-Q02",Scalar(cache,"SELECT count(*) FROM b_source_summary")=="1"&&Scalar(cache,"SELECT count(*) FROM b_current WHERE kind='source-binding' OR kind='derived-job'")=="0","thin summaries are separate from full payload rows");
            RecordingCatalogSourceSummary source_summary;
            Check("B02-Q02",ParseRecordingCatalogSourceSummary(Scalar(cache,"SELECT summary_json FROM b_source_summary WHERE id='segment'"),&source_summary,&error)&&
                source_summary.id=="segment"&&source_summary.source=="source"&&source_summary.latest_mutation_id=="bound"&&source_summary.sample_count==2,"SQLite source summary actual fields remain thin and current");
            if(job){RecordingCatalogJobSummary job_summary;
                Check("B02-Q02",ParseRecordingCatalogJobSummary(Scalar(cache,"SELECT summary_json FROM b_job_summary"),&job_summary,&error)&&
                    job_summary.state==DerivedJobState::Failed&&job_summary.latest_mutation_id=="failed"&&job_summary.source_ids==std::vector<std::string>{"segment"}&&
                    job_summary.output_ids==std::vector<std::string>{input.job.intent.outputs[0].output_id},"SQLite inactive job summary state latest identity and source output IDs");}
#endif
            Write(root/"evidence-1-0.jsonl","corrupt-after-first-use");
            const bool refused=job?!catalog.FindDerivedJob(input.job.intent.job_id,&result,&error):!catalog.FindSourceBinding("segment");
            Check("B02-Q06",refused&&ReadFailure(catalog),"late cold corruption closes detail Timeline Status Retention Locations and same-instance Open");
        }
#if MEDIA_SERVER_USE_SQLITE3
        for(const std::string mode:{"prepare","insert","commit","authority"}) {
            const auto root=base/("sql-fail-"+mode);PublicFixture(root);const auto original=Original(root);const auto cache=root/"recording-generation-catalog.sqlite3";
            std::string setup="CREATE TABLE b_meta(schema TEXT,store TEXT,generation TEXT,cut TEXT);INSERT INTO b_meta VALUES('sentinel','old','1','1');";
            if(mode=="prepare")setup+="CREATE TABLE b_current(wrong TEXT);";
            else {
                setup+="CREATE TABLE b_current(kind TEXT,id TEXT,value_json TEXT,PRIMARY KEY(kind,id)";
                setup+=");";
                if(mode=="insert")setup+="CREATE TRIGGER reject_row BEFORE INSERT ON b_current BEGIN SELECT RAISE(ABORT,'fixture'); END;";
                if(mode=="authority")setup+="CREATE TRIGGER replace_authority BEFORE INSERT ON b_current BEGIN SELECT q_tamper(); END;";
            }
            Sql(cache,setup);RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog catalog(journal,PublicOptions(root));
            if(mode=="authority") {
                tamper_path=root/".recording-store-format";
                RecordingCatalogGenerationScratchProbe::SqlOpenHook([](sqlite3* db){Need(sqlite3_create_function_v2(db,"q_tamper",0,SQLITE_UTF8,nullptr,Tamper,nullptr,nullptr,nullptr)==SQLITE_OK);});
            }
            if(mode=="commit")RecordingCatalogGenerationScratchProbe::SqlOpenHook([](sqlite3* db){sqlite3_commit_hook(db,[](void*){return 1;},nullptr);});
            const bool opened=catalog.Open(&error);
            Check("B02-Q03",RecordingCatalogGenerationScratchProbe::SqlOpenHookEmpty(),"connection injection consumed once");
            RecordingCatalogGenerationScratchProbe::SqlOpenHook({});
            Check("B02-Q03",!opened&&!catalog.FindSegmentById("segment")&&!journal.HasManagedLease()&&Scalar(cache,"SELECT schema FROM b_meta")=="sentinel",("SQL "+mode+" failure rolls cache back and publishes no live state").c_str());
            if(mode!="authority")Check("B02-Q03",Original(root)==original,"SQL failure source bytes unchanged");
            else Check("B02-Q03",Read(root/".recording-store-format")=="changed-by-test\n","authority replacement is not repaired or overwritten");
        }
        {
            const auto root=base/"open-fallback";PublicFixture(root);RecordingJournal journal(Options(root));Need(journal.Open(&error));
            Need(::chmod(root.c_str(),0500)==0);RecordingCatalog catalog(journal,PublicOptions(root));const bool opened=catalog.Open(&error);Need(::chmod(root.c_str(),0700)==0);
            Check("B02-Q05",opened&&catalog.catalog_mode()=="generation-jsonl-readonly","SQLite Open unavailable falls back only before transaction");
        }
#endif
        for(bool hard:{false,true})for(bool sidecar:{false,true}) {
            const auto root=base/(std::string(hard?"hard":"sym")+(sidecar?"-sidecar":"-db"));PublicFixture(root);Write(root/"target","sentinel");
            const auto path=root/(sidecar?"recording-generation-catalog.sqlite3-wal":"recording-generation-catalog.sqlite3");
            if(hard)std::filesystem::create_hard_link(root/"target",path);else std::filesystem::create_symlink("target",path);
            RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog catalog(journal,PublicOptions(root));
            Check("B02-Q04",!catalog.Open(&error)&&Read(root/"target")=="sentinel","cache or sidecar symlink hardlink rejected before SQLite");
        }
        V1(base/"v1-regression","B02-Q06");
#else
        const auto root=base/"unsupported";std::filesystem::create_directories(root);Write(root/".recording-store-format",Marker());
        RecordingJournal journal(Options(root));RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,true);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);
        Check("B02-Q06",!journal.Open(&error)&&!catalog.Open(&error)&&Read(root/".recording-store-format")==Marker(),"unsupported crypto or backend rejects actual public B Open");
#endif
        return failures?1:0;
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}
}
