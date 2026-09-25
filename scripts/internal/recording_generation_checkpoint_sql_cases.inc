// C03 독립 SQL 반례: 게시된 manifest와 실패한 캐시 트랜잭션을 구분한다.
// 별도 실제 SQLite 연결만 사용하며 fixture는 상위 focused runner 소유다.
namespace SQL_CHECKPOINT_CASES {
#if MEDIA_SERVER_USE_SQLITE3 && MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
struct Db {
    sqlite3* value{nullptr};
    explicit Db(const std::filesystem::path& path) {
        if(sqlite3_open_v2(path.c_str(),&value,SQLITE_OPEN_READWRITE,nullptr)!=SQLITE_OK) {
            if(value)sqlite3_close(value);
            value=nullptr;throw std::runtime_error("SQL checkpoint fixture open 실패");
        }
    }
    ~Db(){if(value)sqlite3_close(value);}
    Db(const Db&)=delete;Db& operator=(const Db&)=delete;
    void Exec(const char* sql) {
        if(sqlite3_exec(value,sql,nullptr,nullptr,nullptr)!=SQLITE_OK)
            throw std::runtime_error("SQL checkpoint fixture statement 실패");
    }
    std::string Text(const char* sql) {
        sqlite3_stmt* query=nullptr;
        if(sqlite3_prepare_v2(value,sql,-1,&query,nullptr)!=SQLITE_OK)
            throw std::runtime_error("SQL checkpoint fixture query 준비 실패");
        if(sqlite3_step(query)!=SQLITE_ROW){sqlite3_finalize(query);throw std::runtime_error("SQL checkpoint fixture query 행 없음");}
        const auto* text=sqlite3_column_text(query,0);
        std::string result=text?reinterpret_cast<const char*>(text):"";
        sqlite3_finalize(query);return result;
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
void One(const std::filesystem::path& root,bool commit_fault) {
    Fixture(root);ActiveRows(root,{});
    // 기본 fixture의 미사용 placeholder도 재기동이 검증할 수 있는 실제 원문으로 구성한다.
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
    const auto marker=Read(root/".recording-store-format");
    const auto snapshot=Read(root/"snapshot-2.jsonl");
    const auto legacy=Read(root/"recording-v2-mutations.jsonl");
    std::string sealed;
    {
        RecordingJournal journal(Options(root));Need(journal.Open(&error));
        RecordingCatalog catalog(journal,Writable(root));Need(catalog.Open(&error));
        Need(catalog.MarkSegmentCorrupt("segment","missing-media",&error));
        sealed=Read(root/"active-2.jsonl");Need(!sealed.empty());
        Db db(root/"recording-generation-catalog.sqlite3");
        Need(SqlLifecycle(db)==RecordingLifecycle::Corrupt);
        Need(db.Text("SELECT generation||':'||cut FROM b_meta")=="2:10");
        const auto identity_count=db.Text("SELECT count(*) FROM b_identity");
        if(commit_fault) {
            Need(db.Text("PRAGMA journal_mode")=="delete");
            db.Exec("BEGIN");(void)db.Text("SELECT generation FROM b_meta");
        } else {
            db.Exec("CREATE TRIGGER owned_reject_generation BEFORE UPDATE ON b_meta BEGIN SELECT RAISE(ABORT,'owned-test-failure'); END");
        }
        Check("B03-C03",!catalog.Checkpoint(&error),commit_fault?
            "actual SQLite reader makes checkpoint COMMIT fail after manifest publication":
            "actual SQLite trigger makes checkpoint metadata UPDATE fail after manifest publication");
        RecordingGenerationManifest published;
        Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&published,&error));
        Check("B03-C03",published.generation==3&&published.cut_ordinal==11&&
            published.active.name=="active-3.jsonl"&&published.active.size==0&&Read(root/"active-3.jsonl").empty(),
            "post-publication SQL failure preserves independently expected new generation and cut");
        Check("B03-C03",db.Text("SELECT generation||':'||cut FROM b_meta")=="2:10"&&
            db.Text("SELECT count(*) FROM b_identity")==identity_count&&SqlLifecycle(db)==RecordingLifecycle::Corrupt,
            "failed checkpoint SQL transaction preserves prior cache metadata and current content");
        RecordingLocationCatalogSnapshot locations;
        Check("B03-C03",!catalog.SnapshotLocationsV2("channel",&locations,&error)&&!catalog.Open(&error),
            "post-publication SQL failure blocks same-owner reads and reopen");
        Check("B03-C03",!catalog.Checkpoint(&error)&&!catalog.MarkSegmentCorrupt("segment","missing-media",&error)&&
            !journal.HasManagedLease()&&Read(root/"active-2.jsonl")==sealed&&Read(root/"active-3.jsonl").empty(),
            "poisoned authority refuses further checkpoint or write without changing durable bytes");
        if(commit_fault)db.Exec("ROLLBACK");else db.Exec("DROP TRIGGER owned_reject_generation");
    }
    {
        RecordingJournal journal(Options(root));Need(journal.Open(&error));
        RecordingCatalog catalog(journal,Writable(root));Need(catalog.Open(&error));
        Db db(root/"recording-generation-catalog.sqlite3");
        Check("B03-C03",db.Text("SELECT generation||':'||cut FROM b_meta")=="3:11"&&
            SqlLifecycle(db)==RecordingLifecycle::Corrupt,
            "new owner rebuilds SQL from published snapshot with exact cut and lifecycle");
        RecordingLocationCatalogSnapshot locations;
        Check("B03-C03",catalog.SnapshotLocationsV2("channel",&locations,&error)&&
            Read(root/"active-3.jsonl").empty(),"new owner recovers usable current state without additional journal append");
    }
    Check("B03-C03",Read(root/".recording-store-format")==marker&&Read(root/"snapshot-2.jsonl")==snapshot&&
        Read(root/"identity-2.jsonl")==identity&&Read(root/"evidence-1-0.jsonl")==original&&
        Read(root/"recording-v2-mutations.jsonl")==legacy&&Read(root/"active-2.jsonl")==sealed,
        "failed checkpoint and recovery preserve old authority files and sealed active exactly");
}
#endif
void Run(const std::filesystem::path& base) {
#if MEDIA_SERVER_USE_SQLITE3 && MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
    One(base/"sql-step",false);One(base/"sql-commit",true);
#else
    (void)base;
#endif
}
} // namespace SQL_CHECKPOINT_CASES
