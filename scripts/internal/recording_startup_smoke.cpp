// 파일 용도: 실제 catalog/retention/inspector startup 경계. 제품 test hook 없이 파일과 원장으로 구성한다.
#include "recording/recording_catalog.h"
#include "recording/recording_startup_recovery.h"
#include <filesystem>
#include <fstream>
#include <gst/gst.h>
#include <iostream>
#include <iterator>
#include <sqlite3.h>
#include <stdexcept>
namespace fs = std::filesystem;
using namespace recording;
namespace {
int passed = 0, failed = 0;
void Check(bool ok, const std::string &label) {
    std::cout << (ok ? "[pass] " : "[fail] ") << label << '\n';
    ok ? ++passed : ++failed;
}
void Need(bool ok, const std::string &error) {
    if (!ok)
        throw std::runtime_error(error);
}
std::string Bytes(const fs::path &p) {
    std::ifstream f(p, std::ios::binary);
    return {std::istreambuf_iterator<char>(f), {}};
}
void Write(const fs::path &p, const std::string &data) {
    fs::create_directories(p.parent_path());
    std::ofstream f(p, std::ios::binary);
    f << data;
    f.close();
    Need(!f.fail(), "fixture write");
}
RecordingSegmentV1 Segment(const std::string &bytes) {
    RecordingSegmentV1 s;
    s.segment_id = "startup-one";
    s.source_id = "source-one";
    s.channel_id = "channel-one";
    s.stream_epoch_id = "epoch-one";
    s.start = {1000, 0, 1, 1000000000};
    s.end = {2000, 1000000000, 1, 1000000000};
    s.container = "mp4";
    s.video_codecs = {"h264"};
    s.audio_omitted_reason = "source-no-audio";
    s.size_bytes = bytes.size();
    auto *hash = g_compute_checksum_for_data(
        G_CHECKSUM_SHA256, reinterpret_cast<const guchar *>(bytes.data()), bytes.size());
    s.checksum_sha256 = hash;
    g_free(hash);
    s.created_at_ms = 1000;
    s.finalized_at_ms = 2000;
    s.lifecycle = RecordingLifecycle::Finalized;
    return s;
}
std::string Scalar(const fs::path &p, const std::string &query) {
    sqlite3 *db = nullptr;
    Need(sqlite3_open_v2(p.c_str(), &db, SQLITE_OPEN_READONLY, nullptr) == SQLITE_OK, "SQL open");
    sqlite3_stmt *stmt = nullptr;
    Need(sqlite3_prepare_v2(db, query.c_str(), -1, &stmt, nullptr) == SQLITE_OK, "SQL prepare");
    std::string value;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        const auto *text = sqlite3_column_text(stmt, 0);
        if (text)
            value = reinterpret_cast<const char *>(text);
    }
    sqlite3_finalize(stmt);
    sqlite3_close(db);
    return value;
}
struct Context {
    fs::path root;
    RecordingJournal journal;
    RecordingCatalog catalog;
    RetentionCoordinator retention;
    std::string error;
    Context(fs::path p, bool sqlite)
        : root(std::move(p)), journal(root / "journal.jsonl"),
          catalog(journal, {root / "catalog.db", root, sqlite}),
          retention(
              catalog, [this] { return catalog.RetentionSnapshot(); }, {},
              [this](const auto &file, std::string *e) {
                  return RemoveContainedMediaFile(root, file, e);
              },
              RetentionCoordinator::Options{0, 0, root}) {
        fs::create_directories(root);
        Need(journal.Open(&error) && catalog.Open(&error), error);
    }
    bool Recover(RecordingStartupRecoveryReport *r, MediaInspectionOptions o = {}) {
        return RecoverRecordingAtStartup(catalog, retention, root, 3000, r, &error, o);
    }
    void Seed(const RecordingSegmentV1 &s, const std::string &data) {
        Write(root / (s.segment_id + ".mp4"), data);
        Need(catalog.FinalizeSegment(s, (root / (s.segment_id + ".mp4")).string(), &error), error);
    }
};
void Suite(const fs::path &root, bool sqlite, const std::string &media) {
    const std::string tag = sqlite ? "sqlite " : "fallback ";
    const auto s = Segment(media);
    {
        Context c(root / "healthy", sqlite);
        c.Seed(s, media);
        const auto before = Bytes(c.journal.path());
        RecordingStartupRecoveryReport r;
        Check(c.Recover(&r) && r.healthy == 1 && r.corrupt == 0 &&
                  Bytes(c.journal.path()) == before,
              tag + "ST02 healthy noappend");
        Check(c.catalog.catalog_mode() == (sqlite ? "sqlite-primary" : "jsonl-fallback"),
              tag + "ST11 actual mode");
    }
    for (const std::string kind : {"missing", "checksum", "size"}) {
        const auto dir = root / kind;
        {
            Context c(dir, sqlite);
            c.Seed(s, media);
            const auto p = dir / (s.segment_id + ".mp4");
            if (kind == "missing")
                fs::remove(p);
            else {
                auto changed = media;
                if (kind == "checksum")
                    changed[0] ^= 1;
                else
                    changed += 'x';
                Write(p, changed);
            }
            RecordingStartupRecoveryReport r;
            Check(c.Recover(&r) && r.corrupt == 1 &&
                      c.catalog.FindSegmentById(s.segment_id)->lifecycle ==
                          RecordingLifecycle::Corrupt,
                  tag + "ST01/11 " + kind + " Corrupt memory");
            Check((c.catalog.QuerySegments(s.channel_id, 1000, 2000).size() == 1 &&
                   c.catalog.QuerySegments(s.channel_id, 1000, 2000)[0].lifecycle ==
                       RecordingLifecycle::Corrupt) &&
                      !c.catalog.FindSegmentMediaLocation(s.segment_id),
                  tag + "ST11 " + kind + " query Corrupt and media location blocked");
            if (sqlite) {
                Check(Scalar(dir / "catalog.db", "SELECT lifecycle FROM recording_segments") ==
                          "corrupt",
                      tag + "ST11 " + kind + " SQL actual lifecycle");
                Check(Scalar(dir / "catalog.db", "SELECT codecs_json FROM recording_segments") ==
                          SerializeRecordingSegmentV1(s),
                      tag + "ST11 original codec metadata preserved");
            }
        }
        Context reopened(dir, sqlite);
        const auto before = Bytes(reopened.journal.path());
        RecordingStartupRecoveryReport r;
        Check(reopened.Recover(&r) && r.inspected == 0 &&
                  Bytes(reopened.journal.path()) == before &&
                  reopened.catalog.FindSegmentById(s.segment_id)->lifecycle ==
                      RecordingLifecycle::Corrupt,
              tag + "ST10/11 " + kind + " restart no resurrection/append");
    }
    {
        Context c(root / "held", sqlite);
        c.Seed(s, media);
        Need(c.catalog.AdjustHoldCount(s.segment_id, 1, &c.error), c.error);
        fs::remove(c.root / (s.segment_id + ".mp4"));
        const auto before = Bytes(c.journal.path());
        RecordingStartupRecoveryReport r;
        Check(!c.Recover(&r) && r.failed_stage == "corruption-apply" &&
                  Bytes(c.journal.path()) == before &&
                  c.catalog.FindSegmentById(s.segment_id)->lifecycle ==
                      RecordingLifecycle::Finalized,
              tag + "ST09 held corruption fails startup/noappend");
    }
    for (const bool output_missing : {false, true}) {
        const auto dir = root / (output_missing ? "pending-output" : "pending-source");
        {
            Context c(dir, sqlite);
            c.Seed(s, media);
            auto output = s;
            output.segment_id = "startup-output";
            output.retention_class = RecordingRetentionClass::Event;
            c.Seed(output, media);
            EventRecordingLinkV1 link;
            link.link_id = "pending-link";
            link.event_id = "pending-event";
            link.source_id = s.source_id;
            link.channel_id = s.channel_id;
            link.stream_epoch_id = s.stream_epoch_id;
            link.requested_range = {1000, 2000};
            link.ordered_overlaps = {{s.segment_id, {1000, 2000}}};
            link.derived_segment_id = output.segment_id;
            link.status = EventRecordingLinkStatus::Pending;
            link.time_basis = "utc-ms";
            link.created_at_ms = 2000;
            link.updated_at_ms = 2000;
            Need(c.catalog.PutEventLink(link, &c.error), c.error);
            fs::remove(dir / ((output_missing ? output.segment_id : s.segment_id) + ".mp4"));
        }
        Context c(dir, sqlite);
        const auto before = Bytes(c.journal.path());
        RecordingStartupRecoveryReport r;
        Check(!c.Recover(&r) && r.failed_stage == "corruption-apply" &&
                  Bytes(c.journal.path()) == before,
              tag + "ST09 Pending " + (output_missing ? "output" : "source") +
                  " restart protects corruption");
        Check(c.catalog.FindEventLinkByEventId("pending-event")->status ==
                  EventRecordingLinkStatus::Pending,
              tag + "ST09 Pending link unchanged");
    }
    {
        Context c(root / "timeout", sqlite);
        c.Seed(s, media);
        const auto before = Bytes(c.journal.path());
        RecordingStartupRecoveryReport r;
        Check(!c.Recover(&r, MediaInspectionOptions{std::chrono::milliseconds(0)}) &&
                  r.failed_stage == "media-inspection" && Bytes(c.journal.path()) == before,
              tag + "ST08 unavailable timeout noappend");
    }
    {
        Context c(root / "unsafe", sqlite);
        c.Seed(s, media);
        fs::rename(c.root / (s.segment_id + ".mp4"), c.root / "outside");
        fs::create_symlink(c.root / "outside", c.root / (s.segment_id + ".mp4"));
        Check(c.catalog.FinalizedSegmentsForStartup().size() == 1,
              tag + "ST12 unsafe path remains in metadata snapshot");
        const auto before = Bytes(c.journal.path());
        RecordingStartupRecoveryReport r;
        Check(!c.Recover(&r) && r.failed_stage == "media-inspection" &&
                  Bytes(c.journal.path()) == before,
              tag + "ST12 unsafe path startup fails");
    }
}
} // namespace
int main(int argc, char **argv) {
    if (argc != 3)
        return 2;
    gst_init(nullptr, nullptr);
    try {
        const auto media = Bytes(argv[2]);
        Need(!media.empty(), "actual fixture empty");
        Suite(fs::path(argv[1]) / "fallback", false, media);
        Suite(fs::path(argv[1]) / "sqlite", true, media);
    } catch (const std::exception &e) {
        std::cerr << "fixture/실행 오류: " << e.what() << '\n';
        ++failed;
    }
    std::cout << "[startup-unit] pass=" << passed << " fail=" << failed << '\n';
    return failed ? 1 : 0;
}
