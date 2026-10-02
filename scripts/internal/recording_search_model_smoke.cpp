// 파일 용도: V420-M01~03 read model 독립 기대값. 서버·원장·미디어·포트를 만들지 않는다.
#include "recording/recording_search_model.h"
#include <algorithm>
#include <chrono>
#include <iostream>
#include <limits>
#include <stdexcept>

using namespace recording;
namespace {
int passed = 0;
void Check(bool ok, const char* label) {
    if (!ok) throw std::runtime_error(label);
    ++passed;
    std::cout << "[pass] " << label << '\n';
}
SearchDocument Row(const std::string& id, const std::string& channel, std::optional<std::int64_t> time) {
    SearchDocument d;
    d.id = id; d.channel_id = channel; d.segment_id = "segment-" + id;
    d.start_ns = time;
    if (time) d.end_ns = *time + 1;
    return d;
}
std::vector<std::string> Ids(const RecordingSearchModel& model) {
    std::vector<std::string> ids;
    for (const auto& d : model.documents()) ids.push_back(d.id);
    return ids;
}
}
int main() {
    try {
        std::string error;
        std::shared_ptr<const RecordingSearchModel> model;
        std::vector<SearchDocument> source{Row("older", "a", 100), Row("b", "a", 200),
            Row("unknown", "a", {}), Row("other-channel", "b", 200), Row("a", "a", 200)};
        source[0].zone_ids = {"z2", "z1", "z1"};
        Check(RecordingSearchModel::Build(source, "store-session", 17, &model, &error), "M01 build");
        const std::vector<std::string> expected{"a", "b", "other-channel", "older", "unknown"};
        Check(Ids(*model) == expected, "M01 known-desc/channel/id then unknown");
        Check(model->Channel("a") == std::vector<std::size_t>({0, 1, 3, 4}) &&
            model->Channel("absent").empty(), "M01 channel index and absent channel");
        Check(source[0].id == "older" && source[0].zone_ids == std::vector<std::string>({"z2", "z1", "z1"}) &&
            model->Find("older")->zone_ids == std::vector<std::string>({"z1", "z2"}), "M01 source immutable / normalized projection");
        Check(!model->Find("unknown")->start_ns && !model->Find("absent") &&
            model->revision() == 17 && model->source_instance() == "store-session", "M01 identity and unknown are preserved");
        const auto old = model;
        std::reverse(source.begin(), source.end());
        Check(RecordingSearchModel::Build(source, "store-session", 17, &model, &error) &&
            Ids(*model) == expected, "M01 rebuild independent of input order");
        source.push_back(source.front());
        const auto before_failure = model;
        Check(!RecordingSearchModel::Build(source, "store-session", 18, &model, &error) &&
            error == "search-duplicate-id" && model == before_failure, "M02 duplicate cannot replace published model");
        auto invalid = Row("bad", "a", 10); invalid.end_ns = 10;
        Check(!RecordingSearchModel::Build({invalid}, "store-session", 18, &model, &error) &&
            error == "search-invalid-document" && model == before_failure, "M02 empty interval rejected atomically");
        invalid.end_ns.reset();
        Check(!RecordingSearchModel::Build({invalid}, "store-session", 18, &model, &error), "M02 half-known interval rejected");
        invalid = Row("bad", "a", 10); invalid.event_ids = {"e1"};
        invalid.event_facts = {{"e2", "Intrusion", ""}};
        Check(!RecordingSearchModel::Build({invalid}, "store-session", 18, &model, &error), "M02 unlinked event fact rejected");
        invalid.event_facts = {{"e1", "Intrusion", ""}, {"e1", "LineCrossing", ""}};
        Check(!RecordingSearchModel::Build({invalid}, "store-session", 18, &model, &error), "M02 conflicting event facts rejected");
        auto first = Row("obs1", "a", 10); first.kind = SearchDocumentKind::Observation;
        first.observation_id = "o1"; first.analysis_namespace = "ns1";
        first.stream_epoch_id = "epoch1"; first.track_id = "track-1";
        auto second = first; second.id = "obs2"; second.observation_id = "o2";
        second.analysis_namespace = "ns2"; second.stream_epoch_id = "epoch2";
        Check(RecordingSearchModel::Build({first, second}, "store-session", 18, &model, &error) &&
            model->documents().size() == 2 && model->Find("obs2")->analysis_namespace == "ns2", "M01 numeric track reuse does not merge sessions");
        const auto pair = model;
        Check(!RecordingSearchModel::Build({first, second}, "store-session", 19, &model, &error, {1, 65536}) &&
            error == "search-capacity-exceeded" && model == pair, "M03 row limit overflow atomic");
        Check(RecordingSearchModel::Build({first, second}, "store-session", 19, &model, &error, {2, 65536}), "M03 row limit equality");
        std::vector<SearchDocument> bytes_source{first, second};
        Check(RecordingSearchModel::Build(bytes_source, "store-session", 19, &model, &error), "M03 byte accounting baseline");
        const auto bytes = model->accounted_bytes();
        Check(RecordingSearchModel::Build(bytes_source, "store-session", 19, &model, &error, {2, bytes}), "M03 exact byte budget admitted");
        const auto at_limit = model;
        Check(!RecordingSearchModel::Build(bytes_source, "store-session", 19, &model, &error, {2, bytes - 1}) &&
            model == at_limit && error == "search-capacity-exceeded", "M03 one byte short rejected atomically");
        Check(!RecordingSearchModel::Build({}, "", 1, &model, &error) && model == at_limit, "M02 invalid source rejected");
        Check(RecordingSearchModel::Build({}, "new-session", 0, &model, &error) &&
            model->documents().empty() && error.empty(), "M02 successful empty distinct from failed build");
        Check(Ids(*old) == expected, "M01 retained immutable model survives replacements");
        SearchModelDelta delta;
        delta.source_instance = "store-session"; delta.previous_revision = 17; delta.revision = 18;
        delta.removed_ids = {"b"};
        delta.upserts = {Row("new", "b", 300), Row("older", "c", 250)};
        Check(RecordingSearchModel::ApplyDelta(*old, delta, &model, &error) &&
            Ids(*model) == std::vector<std::string>({"new", "older", "a", "other-channel", "unknown"}),
            "L01 delta adds/updates/deletes and reorders exact expected ids");
        Check(model->revision() == 18 && !model->Find("b") &&
            model->Channel("c") == std::vector<std::size_t>({1}) && Ids(*old) == expected,
            "L02 removal changes new snapshot without mutating held pages");
        const auto updated = model;
        Check(!RecordingSearchModel::ApplyDelta(*updated, delta, &model, &error) &&
            error == "search-delta-rebuild-required" && model == updated, "L01 stale predecessor requires rebuild");
        delta.previous_revision = 18; delta.revision = 19; delta.source_instance = "restarted-store";
        Check(!RecordingSearchModel::ApplyDelta(*updated, delta, &model, &error) &&
            model == updated, "L02 restarted source cannot apply old lineage");
        delta.source_instance = "store-session"; delta.removed_ids = {"new"};
        Check(!RecordingSearchModel::ApplyDelta(*updated, delta, &model, &error) &&
            error == "search-invalid-delta" && model == updated, "L02 upsert/delete same id rejected atomically");
        delta.removed_ids.clear(); delta.upserts.clear();
        Check(RecordingSearchModel::ApplyDelta(*updated, delta, &model, &error) &&
            Ids(*model) == Ids(*updated) && model->revision() == 19, "L01 empty delta advances only revision");
        for (const auto count : {1, 1000, 10000}) {
            std::vector<SearchDocument> many;
            many.reserve(count);
            for (int i = 0; i < count; ++i) many.push_back(Row("r" + std::to_string(i), "c", i));
            const auto start = std::chrono::steady_clock::now();
            Check(RecordingSearchModel::Build(many, "scale", 1, &model, &error) &&
                model->documents().size() == static_cast<std::size_t>(count) &&
                model->documents().front().id == "r" + std::to_string(count - 1) &&
                model->documents().back().id == "r0", "M03 scale explicit endpoints");
            std::cout << "[scale] rows=" << count << " accountedBytes=" << model->accounted_bytes()
                << " elapsedUs=" << std::chrono::duration_cast<std::chrono::microseconds>(
                    std::chrono::steady_clock::now() - start).count() << '\n';
        }
        std::vector<SearchDocument> overflow(100001);
        Check(!RecordingSearchModel::Build(overflow, "scale", 2, &model, &error) &&
            error == "search-capacity-exceeded", "M03 default 100001 rows rejected before projection");
        overflow.resize(100000);
        for (std::size_t i = 0; i < overflow.size(); ++i) overflow[i] = Row("r" + std::to_string(i), "c", i);
        Check(!RecordingSearchModel::Build(overflow, "scale", 2, &model, &error) &&
            error == "search-capacity-exceeded", "M03 100000 valid rows still obey earlier 64MiB limit");
        std::cout << "[search-model] pass=" << passed << " fail=0\n";
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "[fail] " << e.what() << " after=" << passed << '\n';
        return 1;
    }
}
