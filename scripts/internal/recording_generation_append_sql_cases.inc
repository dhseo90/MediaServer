// W03의 독립 SQL 반례. 실제 제품 연결과 별도 SQLite 연결만 사용한다.
// 호출한 focused runner가 소유한 fixture root 안에서만 동작한다.
namespace SQL_APPEND_CASES {
#if MEDIA_SERVER_USE_SQLITE3 && MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
struct Db {
    sqlite3* value{nullptr};
    explicit Db(const std::filesystem::path& path) {
        if(sqlite3_open_v2(path.c_str(),&value,SQLITE_OPEN_READWRITE,nullptr)!=SQLITE_OK) {
            if(value)sqlite3_close(value);
            value=nullptr;throw std::runtime_error("SQL fixture open 실패");
        }
    }
    ~Db(){if(value)sqlite3_close(value);}
    Db(const Db&)=delete;Db& operator=(const Db&)=delete;
    void Exec(const char* sql) {
        if(sqlite3_exec(value,sql,nullptr,nullptr,nullptr)!=SQLITE_OK)
            throw std::runtime_error("SQL fixture statement 실패");
    }
    std::string Text(const char* sql) {
        sqlite3_stmt* query=nullptr;
        if(sqlite3_prepare_v2(value,sql,-1,&query,nullptr)!=SQLITE_OK)
            throw std::runtime_error("SQL fixture query 준비 실패");
        const auto cleanup=[&]{sqlite3_finalize(query);};
        if(sqlite3_step(query)!=SQLITE_ROW){cleanup();throw std::runtime_error("SQL fixture query 행 없음");}
        const auto* text=sqlite3_column_text(query,0);
        std::string result=text?reinterpret_cast<const char*>(text):"";
        cleanup();return result;
    }
};
RecordingCatalog::Options Writable(const std::filesystem::path& root) {
    RecordingCatalog::Options value(root/"recording-catalog.sqlite3",root,true);
    value.enable_v2_storage=true;value.enable_generation_writes=true;return value;
}
RecordingLifecycle SqlLifecycle(Db& db) {
    RecordingSegmentV1 segment;
    const auto json=db.Text("SELECT value_json FROM b_current WHERE kind='segment-v1' AND id='segment'");
    Need(ParseRecordingSegmentV1(json,&segment,&error));return segment.lifecycle;
}
void One(const std::filesystem::path& root,int fault) {
    Fixture(root);ActiveRows(root,{});
    // 기본 fixture의 미사용 archive placeholder를 실제 보존 원문으로 바꾼다.
    const auto original=SerializeRecordingMutationV1(Historical(root))+"\n";
    RecordingIdentityShard shard;
    Need(ParseRecordingIdentityShard(Read(root/"identity-2.jsonl"),&shard,&error));
    Need(shard.rows.size()==1&&shard.rows.front().raw_sha256==Hash(original));
    shard.archives.front().size=original.size();shard.archives.front().sha256=Hash(original);
    Write(root/"evidence-1-0.jsonl",original);
    std::string identity;Need(SerializeRecordingIdentityShard(shard,&identity,&error));
    Write(root/"identity-2.jsonl",identity);
    RecordingCatalogSnapshot current;
    Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&current,&error));
    current.identity_head.size=identity.size();current.identity_head.sha256=Hash(identity);SaveSnapshot(root,current);
    const auto manifest=Read(root/"recording-generation.json");
    const auto snapshot=Read(root/"snapshot-2.jsonl");
    const auto archive=Read(root/"evidence-1-0.jsonl");
    std::string durable;
    {
        RecordingJournal journal(Options(root));Need(journal.Open(&error));
        RecordingCatalog catalog(journal,Writable(root));Need(catalog.Open(&error));
        Db db(root/"recording-generation-catalog.sqlite3");
        Need(SqlLifecycle(db)==RecordingLifecycle::Finalized);
        const auto identity_count=db.Text("SELECT count(*) FROM b_identity");
        if(fault==0)db.Exec("DROP TABLE b_current");
        if(fault==1)db.Exec("CREATE TRIGGER owned_reject_identity BEFORE INSERT ON b_identity BEGIN SELECT RAISE(ABORT,'owned-test-failure'); END");
        if(fault==2){
            // 실제 read transaction이 COMMIT을 막는다. timeout을 늘리지 않는다.
            Need(db.Text("PRAGMA journal_mode")=="delete");
            db.Exec("BEGIN");(void)db.Text("SELECT count(*) FROM b_identity");
        }
        const char* label=fault==0?"SQL prepare failure remains failure after durable append":
            fault==1?"SQL step failure rolls back changed keys":"actual reader lock makes COMMIT failure explicit";
        Check("B03-W03",!catalog.MarkSegmentCorrupt("segment","missing-media",&error),label);
        durable=Read(root/"active-2.jsonl");
        RecordingMutationV1 mutation;
        Check("B03-W03",!durable.empty()&&durable.back()=='\n'&&
            ParseRecordingMutationV1(durable.substr(0,durable.size()-1),&mutation,&error)&&
            mutation.mutation_type==RecordingMutationType::CorruptionDetected&&mutation.entity_id=="segment",
            "failed SQL leaves one complete intended durable mutation");
        Check("B03-W03",db.Text("SELECT count(*) FROM b_identity")==identity_count,
            "failed SQL transaction publishes no new identity");
        if(fault!=0)Check("B03-W03",SqlLifecycle(db)==RecordingLifecycle::Finalized,
            "failed SQL transaction preserves prior independently observed lifecycle");
        RecordingLocationCatalogSnapshot locations;
        Check("B03-W03",!catalog.SnapshotLocationsV2("channel",&locations,&error)&&!catalog.Open(&error),
            "durable SQL failure closes same-owner public reads and reopen");
        Check("B03-W03",!catalog.MarkSegmentCorrupt("segment","missing-media",&error)&&
            Read(root/"active-2.jsonl")==durable,"poisoned owner refuses subsequent write without new bytes");
        if(fault==1)db.Exec("DROP TRIGGER owned_reject_identity");
        if(fault==2)db.Exec("ROLLBACK");
    }
    {
        RecordingJournal journal(Options(root));Need(journal.Open(&error));
        RecordingCatalog catalog(journal,Writable(root));Need(catalog.Open(&error));
        Db db(root/"recording-generation-catalog.sqlite3");
        Check("B03-W03",SqlLifecycle(db)==RecordingLifecycle::Corrupt,
            "new owner rebuild recovers durable corruption independently of old SQL cache");
        Check("B03-W03",Read(root/"active-2.jsonl")==durable,
            "new owner recovery does not append or rewrite the intended mutation");
    }
    Check("B03-W04",Read(root/"recording-generation.json")==manifest&&
        Read(root/"snapshot-2.jsonl")==snapshot&&Read(root/"evidence-1-0.jsonl")==archive,
        "SQL failure and recovery leave immutable authority files unchanged");
}
#endif
void Run(const std::filesystem::path& base) {
#if MEDIA_SERVER_USE_SQLITE3 && MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
    for(int fault=0;fault!=3;++fault)One(base/("sql-public-"+std::to_string(fault)),fault);
#else
    (void)base;
#endif
}
} // namespace SQL_APPEND_CASES
