// 파일 용도: v2.5.0 S02 local incident memory index의 SQLite/JSONL fallback 계약을 검증한다.
// 동작 요약: S01 projection document를 local index에 적재하고 deterministic BM25 검색 parity를 확인한다.
#include "analysis/incident_memory.h"

#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

namespace {

void Expect(bool condition, const std::string& message) {
    if (!condition) {
        std::cerr << "[fail] " << message << "\n";
        std::exit(1);
    }
}

analysis::IncidentProjectionDocument MakeDocument(const std::string& id,
                                                  const std::string& kind,
                                                  const std::string& incident_id,
                                                  const std::string& title,
                                                  const std::string& summary,
                                                  const std::string& source_id) {
    analysis::IncidentProjectionDocument doc;
    doc.document_id = id;
    doc.source_kind = kind;
    doc.record_id = id;
    doc.event_id = incident_id.rfind("incident:", 0) == 0 ? incident_id.substr(9) : incident_id;
    doc.incident_id = incident_id;
    doc.source_id = source_id;
    doc.title = title;
    doc.summary = summary;
    doc.searchable_text = title + "\n" + summary + "\nsource " + source_id;
    doc.tokens = analysis::IncidentProjectionTokens(doc.searchable_text);
    return doc;
}

std::vector<std::string> Ids(const std::vector<analysis::IncidentMemorySearchHit>& hits) {
    std::vector<std::string> ids;
    for (const auto& hit : hits) {
        ids.push_back(hit.document_id);
    }
    return ids;
}

void ExpectIds(const std::vector<analysis::IncidentMemorySearchHit>& hits,
               const std::vector<std::string>& expected,
               const std::string& label) {
    const std::vector<std::string> actual = Ids(hits);
    if (actual != expected) {
        std::cerr << "[debug] expected:";
        for (const auto& id : expected) {
            std::cerr << " " << id;
        }
        std::cerr << "\n[debug] actual:";
        for (const auto& id : actual) {
            std::cerr << " " << id;
        }
        std::cerr << "\n";
    }
    Expect(actual == expected, label + " unexpected hit order");
}

void IndexDocuments(analysis::IncidentMemoryIndex* index) {
    std::string error;
    const std::vector<analysis::IncidentProjectionDocument> docs = {
        MakeDocument("event-record:evt-incident-loading-bay",
                     "event-record",
                     "incident:evt-incident-loading-bay",
                     "Loading bay person dwell",
                     "operator acknowledged loading bay intrusion dwell person event",
                     "dock-cam"),
        MakeDocument("ops-audit:audit-loading-bay",
                     "ops-audit",
                     "incident:evt-incident-loading-bay",
                     "Operator action acknowledged",
                     "acknowledged loading bay incident action by operator",
                     "dock-cam"),
        MakeDocument("source-health:dock-cam:stale:metadata-aged",
                     "source-health",
                     "source-health:dock-cam:stale:metadata-aged",
                     "Source health stale metadata",
                     "metadata aged on dock camera",
                     "dock-cam"),
        MakeDocument("alert-dry-run:alert-dock",
                     "alert-dry-run",
                     "incident:evt-incident-loading-bay",
                     "Alert delivery dry-run",
                     "dry-run webhook skipped for loading bay incident",
                     "dock-cam"),
    };
    for (const auto& doc : docs) {
        Expect(index->Upsert(doc, &error), "upsert failed: " + error);
    }
}

std::vector<analysis::IncidentMemorySearchHit> Search(analysis::IncidentMemoryIndex* index,
                                                      const std::string& query) {
    std::string error;
    std::vector<analysis::IncidentMemorySearchHit> hits;
    analysis::IncidentMemorySearchOptions options;
    options.query = query;
    options.limit = 4;
    Expect(index->Search(options, &hits, &error), "search failed: " + error);
    return hits;
}

}  // namespace

int main(int argc, char** argv) {
    Expect(argc == 2, "usage: incident_memory_index_smoke <work-dir>");
    const std::filesystem::path work_dir(argv[1]);
    std::filesystem::create_directories(work_dir);

    std::string error;
    analysis::IncidentMemoryIndex primary;
    analysis::IncidentMemoryIndexConfig primary_config;
    primary_config.sqlite_path = (work_dir / "incident-memory.sqlite").string();
    primary_config.jsonl_path = (work_dir / "incident-memory-primary.jsonl").string();
    primary_config.prefer_sqlite_fts5 = true;
    Expect(primary.Open(primary_config, &error), "primary open failed: " + error);

    const auto primary_report = primary.Report();
    Expect(primary_report.schema == "media-server.incident-memory-index.v1", "primary report schema");
    Expect(primary_report.backend == "sqlite-fts5", "primary backend must be sqlite-fts5");
    Expect(primary_report.sqlite_fts5_available, "sqlite fts5 must be available for primary smoke");
    Expect(!primary_report.model_provider_dependency, "primary index must not depend on model/provider");
    IndexDocuments(&primary);

    analysis::IncidentMemoryIndex fallback;
    analysis::IncidentMemoryIndexConfig fallback_config;
    fallback_config.sqlite_path = (work_dir / "incident-memory-disabled.sqlite").string();
    fallback_config.jsonl_path = (work_dir / "incident-memory-fallback.jsonl").string();
    fallback_config.prefer_sqlite_fts5 = true;
    fallback_config.force_jsonl_bm25_fallback = true;
    Expect(fallback.Open(fallback_config, &error), "fallback open failed: " + error);
    const auto fallback_report = fallback.Report();
    Expect(fallback_report.backend == "jsonl-bm25", "fallback backend must be jsonl-bm25");
    Expect(fallback_report.fallback_active, "fallback report must mark fallback active");
    Expect(!fallback_report.model_provider_dependency, "fallback must not depend on model/provider");
    IndexDocuments(&fallback);

    const auto primary_loading = Search(&primary, "loading bay acknowledged");
    const auto fallback_loading = Search(&fallback, "loading bay acknowledged");
    ExpectIds(primary_loading,
              {"event-record:evt-incident-loading-bay",
               "ops-audit:audit-loading-bay",
               "alert-dry-run:alert-dock"},
              "primary loading query");
    Expect(Ids(primary_loading) == Ids(fallback_loading), "fallback loading query parity");

    const auto primary_health = Search(&primary, "metadata aged stale");
    const auto fallback_health = Search(&fallback, "metadata aged stale");
    ExpectIds(primary_health,
              {"source-health:dock-cam:stale:metadata-aged"},
              "primary health query");
    Expect(Ids(primary_health) == Ids(fallback_health), "fallback health query parity");

    Expect(std::filesystem::exists(fallback_config.jsonl_path), "fallback JSONL path must exist");
    Expect(!analysis::IncidentProjectionContainsForbiddenMaterial(primary_report.backend),
           "backend report must not contain forbidden material");
    Expect(!analysis::IncidentProjectionContainsForbiddenMaterial(fallback_report.backend),
           "fallback backend report must not contain forbidden material");

    std::cout << "[pass] incident memory index smoke\n";
    return 0;
}
