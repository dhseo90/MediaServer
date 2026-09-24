// 값/구조 결박 fixture다. 파일 SHA, domain 의미, 제품 Open/Append/Checkpoint는 검증하지 않는다.
#include "recording/recording_catalog_snapshot.h"
#include <algorithm>
#include <iostream>
#include <limits>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
using namespace recording;
namespace {
int failures = 0;
std::string error;
struct Scenario {
    const char* id;
    bool good{true};
    void Check(bool condition, const char* detail) {
        if (!condition) { good = false; std::cerr << id << " assertion: " << detail << '\n'; }
    }
    ~Scenario() {
        std::cout << id << ' ' << (good ? "PASS" : "FAIL") << '\n';
        if (!good) ++failures;
    }
};
RecordingCatalogSnapshot Empty() {
    RecordingCatalogSnapshot value;
    value.store_id = "store-a";
    value.generation = 2;
    value.cut_ordinal = 100;
    value.identity_head = {"identity-2.jsonl", 123, std::string(64, 'a')};
    return value;
}
bool Encode(const RecordingCatalogSnapshot& value, std::string* bytes) {
    return SerializeRecordingCatalogSnapshot(value, bytes, &error);
}
bool Decode(const std::string& bytes, RecordingCatalogSnapshot* value) {
    return ParseRecordingCatalogSnapshot(bytes, 1024 * 1024, value, &error);
}
[[maybe_unused]] bool BadValue(const RecordingCatalogSnapshot& value) {
    std::string bytes = "unchanged";
    return !Encode(value, &bytes) && bytes == "unchanged";
}
[[maybe_unused]] bool BadBytes(const std::string& bytes) {
    auto value = Empty(); value.store_id = "unchanged";
    return !Decode(bytes, &value) && value.store_id == "unchanged";
}
[[maybe_unused]] std::string Replace(std::string bytes, const std::string& from, const std::string& to) {
    const auto offset = bytes.find(from);
    if (offset != std::string::npos) bytes.replace(offset, from.size(), to);
    return bytes;
}
RecordingGenerationManifest Manifest(const RecordingCatalogSnapshot& snapshot) {
    RecordingGenerationManifest result;
    result.store_id = snapshot.store_id;
    result.generation = snapshot.generation;
    result.cut_ordinal = snapshot.cut_ordinal;
    std::string bytes;
    if (!Encode(snapshot, &bytes)) return result;
    // 임의 SHA다. 구조 결박 함수가 암호학적 파일 검증을 하지 않는 경계를 명시한다.
    result.snapshot = {"snapshot-2.jsonl", static_cast<std::uint64_t>(bytes.size()), std::string(64, 'b')};
    return result;
}
[[maybe_unused]] RecordingIdentityChainResult Chain(const RecordingCatalogSnapshot& snapshot) {
    // 검증 완료 결과의 구조 fixture이며 실제 descriptor bytes/hash 검증은 다른 suite 경계다.
    RecordingIdentityChainResult result;
    result.head = snapshot.identity_head;
    result.shards = 2;
    result.physical_rows = 2;
    result.maximum_global_ordinal = 9; // 최초 7 이후 동일 ID의 물리 재시도를 포함한다.
    RecordingIdentityFirstAcceptance first;
    first.mutation_id = "mutation-a";
    first.first_global_ordinal = 7;
    first.occurrences = 2;
    first.first_row.mutation_id = first.mutation_id;
    first.first_row.global_ordinal = 7;
    first.first_row.type = RecordingMutationType::SegmentFinalized;
    result.first_acceptances.push_back(first);
    return result;
}
[[maybe_unused]] RecordingCatalogSnapshot Accepted() {
    auto value = Empty();
    value.rows.push_back({"accepted-state", "mutation-a",
        "{\"mutationId\":\"mutation-a\",\"globalOrdinal\":7,\"type\":\"segment_finalized\"}"});
    return value;
}
} // namespace
int main() {
#if MEDIA_SERVER_USE_OPENSSL
    {
        Scenario s{"B02-S01"};
        auto value = Empty();
        std::string bytes, again;
        RecordingCatalogSnapshot parsed;
        const std::string literal = "{\"schema\":\"media-server.recording-catalog-snapshot.v1\",\"storeId\":\"store-a\",\"generation\":2,\"cutOrdinal\":100,\"identityHead\":{\"name\":\"identity-2.jsonl\",\"size\":123,\"sha256\":\"" +
            std::string(64, 'a') + "\"}}\n";
        s.Check(Encode(value, &bytes) && bytes == literal && Decode(bytes, &parsed), "independent empty header literal");
        for (const auto* kind : {"accepted-state", "consumer-reference", "derived-job", "event-link",
            "observation-v1", "observation-v2", "referenced-observation", "segment-v1", "segment-v2",
            "source-binding", "state-v2", "tombstone-v1", "tombstone-v2"})
            value.rows.push_back({kind, "key-a", "{\"z\": [1, {\"a\":\"x,y\\u0021\"}], \"b\":2}"});
        value.rows.push_back({"deletion-reason", "key-a", "\"reason\\nline\""});
        value.rows.push_back({"media-path", "key-a", "\"path/file.mp4\""});
        value.rows.push_back({"derived-reference-accepted", "key-a", "true"});
        std::sort(value.rows.begin(), value.rows.end(), [](const auto& a, const auto& b) { return a.kind < b.kind; });
        s.Check(Encode(value, &bytes) && Decode(bytes, &parsed) && Encode(parsed, &again) && bytes == again &&
                parsed.rows.size() == 16, "every kind raw payload roundtrip");
        value = Empty(); value.rows = {{"segment-v1", "key-a", "{\"z\": 1,\"a\":\"\\u0061\"}"}};
        s.Check(Encode(value, &bytes) && bytes == literal +
                "{\"kind\":\"segment-v1\",\"key\":\"key-a\",\"value\":{\"z\": 1,\"a\":\"\\u0061\"}}\n",
                "outer literal preserves inner order/whitespace/escape, no domain claim");
    }
    {
        Scenario s{"B02-S02"};
        auto value = Empty(); value.rows = {{"segment-v1", "key-a", "{}"}};
        std::string bytes; s.Check(Encode(value, &bytes), "fixture encode");
        for (const auto& bad : {std::string{}, bytes + "\n", bytes.substr(0, bytes.size() - 1),
            Replace(bytes, "snapshot.v1", "snapshot.v2"),
            Replace(bytes, "\"generation\":2", "\"generation\":18446744073709551616"),
            Replace(bytes, "\"cutOrdinal\":100", "\"cutOrdinal\":-1"),
            Replace(bytes, "\"generation\":2", "\"generation\":2,\"generation\":2"),
            Replace(bytes, "\"storeId\":", "\"extra\":0,\"storeId\":"),
            Replace(bytes, "\"kind\":", "\"extra\":0,\"kind\":"),
            Replace(bytes, "\"value\":{}", "\"value\":{\"a\":1,\"a\":2}"),
            Replace(bytes, "\"value\":{}", "\"value\":{\"a\":[1,,2]}"),
            Replace(bytes, "\"value\":{}", "\"value\":{\"a\":\"\\q\"}"),
            Replace(bytes, "\"value\":{}", "\"value\":[]"),
            Replace(bytes, "\"kind\":", "\"kind\" :"),
            Replace(bytes, "segment-v1", "unsupported")})
            s.Check(BadBytes(bad), "strict malformed/extra/duplicate/type/overflow/outer canonical");
        value.rows.push_back(value.rows[0]);
        s.Check(BadValue(value), "duplicate kind/key");
        value.rows[0].key = "key-z";
        s.Check(BadValue(value), "key order");
        value.rows = {{"segment-v2", "key-a", "{}"}, {"segment-v1", "key-a", "{}"}};
        s.Check(BadValue(value), "kind order");
        value.rows = {{"derived-reference-accepted", "key-a", "false"}};
        s.Check(BadValue(value), "accepted reference true only");
        value.rows = {{"media-path", "key-a", "{}"}};
        s.Check(BadValue(value), "path string only");
        value.rows = {{"segment-v1", "key-a", "{\n}"}};
        s.Check(BadValue(value), "physical multiline payload forbidden");
        RecordingCatalogSnapshot unchanged; unchanged.store_id = "unchanged";
        s.Check(!ParseRecordingCatalogSnapshot(bytes, bytes.size() - 1, &unchanged, &error) &&
                unchanged.store_id == "unchanged", "caller byte admission and output preservation");
        s.Check(!ParseRecordingCatalogSnapshot(bytes, 0, &unchanged, &error), "zero admission");
    }
    {
        Scenario s{"B02-S03"};
        const auto value = Empty();
        const auto manifest = Manifest(value);
        s.Check(ValidateRecordingCatalogSnapshotManifest(value, manifest, &error), "matching structural binding");
        auto changed = manifest; changed.store_id = "store-b";
        s.Check(!ValidateRecordingCatalogSnapshotManifest(value, changed, &error), "store mismatch");
        changed = manifest; ++changed.generation;
        s.Check(!ValidateRecordingCatalogSnapshotManifest(value, changed, &error), "generation mismatch");
        changed = manifest; ++changed.cut_ordinal;
        s.Check(!ValidateRecordingCatalogSnapshotManifest(value, changed, &error), "cut mismatch");
        changed = manifest; ++changed.snapshot.size;
        s.Check(!ValidateRecordingCatalogSnapshotManifest(value, changed, &error), "snapshot exact size");
        changed = manifest; changed.snapshot.name = "../snapshot-2.jsonl";
        s.Check(!ValidateRecordingCatalogSnapshotManifest(value, changed, &error), "snapshot basename");
        auto bad = value; bad.generation = 0;
        s.Check(BadValue(bad), "positive generation");
        for (const auto* name : {"identity-1.jsonl", "identity-3.jsonl", "identity-02.jsonl", "../identity-2.jsonl"}) {
            bad = value; bad.identity_head.name = name;
            s.Check(BadValue(bad), "head exact current generation basename");
        }
        bad = value; bad.identity_head.size = 0;
        s.Check(BadValue(bad), "nonempty identity shard");
        bad.identity_head.size = kRecordingCatalogSnapshotMaxBytes + 1;
        s.Check(BadValue(bad), "immutable descriptor 1GiB bound");
        bad = value; bad.identity_head.sha256[0] = 'G';
        s.Check(BadValue(bad), "lowercase hex SHA");
        bad = value; bad.cut_ordinal = std::numeric_limits<std::uint64_t>::max();
        std::string bytes;
        s.Check(Encode(bad, &bytes), "uint64 cut boundary permitted");
        bad.cut_ordinal = 0;
        s.Check(Encode(bad, &bytes), "empty exclusive cut permitted");
    }
    {
        Scenario s{"B02-S04"};
        auto value = Accepted(); const auto chain = Chain(value);
        s.Check(ValidateRecordingCatalogSnapshotAcceptedStates(value, chain, &error), "first acceptance and ordinal gap");
        auto changed = chain; changed.head.sha256[0] = 'b';
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "verified head digest mismatch");
        changed = chain; ++changed.head.size;
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "verified head size mismatch");
        changed = chain; changed.first_acceptances.clear();
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "missing accepted identity");
        changed = chain; changed.first_acceptances.push_back(changed.first_acceptances[0]);
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "duplicate first ID");
        changed = chain; changed.maximum_global_ordinal = value.cut_ordinal;
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "later retry at exclusive cut rejected");
        changed.maximum_global_ordinal = value.cut_ordinal + 1;
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "later retry beyond cut rejected");
        changed = chain; changed.maximum_global_ordinal.reset();
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "nonempty chain needs maximum");
        value.rows.clear();
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, chain, &error), "required accepted-state omitted");
        for (auto type : {RecordingMutationType::ReferencedObservationPut, RecordingMutationType::DerivedReferenceAccepted,
             RecordingMutationType::ConsumerReferencePut, RecordingMutationType::DerivedJobIntent,
             RecordingMutationType::DerivedJobFiles, RecordingMutationType::DerivedJobReady,
             RecordingMutationType::DerivedJobCommitted, RecordingMutationType::DerivedJobComplete,
             RecordingMutationType::DerivedJobFailed, RecordingMutationType::SegmentFinalized,
             RecordingMutationType::SegmentV2State, RecordingMutationType::SegmentV2Deleted,
             RecordingMutationType::SegmentV2Finalized, RecordingMutationType::SegmentV2BoundFinalized,
             RecordingMutationType::CorruptionDetected}) {
            changed = chain; changed.first_acceptances[0].first_row.type = type;
            s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "each catalog accepted-state kind required");
            auto matching = Accepted();
            matching.rows[0].value_json = Replace(matching.rows[0].value_json, "segment_finalized", RecordingMutationTypeName(type));
            s.Check(ValidateRecordingCatalogSnapshotAcceptedStates(matching, changed, &error), "each accepted-state kind complete");
        }
        changed = chain; changed.first_acceptances[0].first_row.type = RecordingMutationType::ObservationPut;
        s.Check(ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "ordinary identity needs no accepted-state");
        auto extra = Accepted();
        extra.rows[0].value_json = Replace(extra.rows[0].value_json, "segment_finalized", "observation_put");
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(extra, changed, &error), "ordinary extra accepted-state forbidden");
        changed = chain; changed.physical_rows = 0; changed.maximum_global_ordinal.reset();
        changed.first_acceptances.clear(); value.cut_ordinal = 0;
        s.Check(ValidateRecordingCatalogSnapshotAcceptedStates(value, changed, &error), "empty chain permits zero exclusive cut");
        value = Accepted();
        value.cut_ordinal = 7;
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, chain, &error), "exclusive cut rejects equal ordinal");
        value = Accepted(); value.rows[0].key = "other";
        s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, chain, &error), "row key binding");
        for (const auto& bad : {
            Replace(Accepted().rows[0].value_json, "mutation-a", "other"),
            Replace(Accepted().rows[0].value_json, "segment_finalized", "segment_v2_state"),
            Replace(Accepted().rows[0].value_json, "\"globalOrdinal\":7", "\"globalOrdinal\":9"),
            Replace(Accepted().rows[0].value_json, "\"type\":", "\"extra\":0,\"type\":")}) {
            value = Accepted(); value.rows[0].value_json = bad;
            s.Check(!ValidateRecordingCatalogSnapshotAcceptedStates(value, chain, &error), "ID/type/retry ordinal/extra conflict");
        }
    }
#else
    {
        Scenario s{"B02-S05"};
        const auto value = Empty();
        std::string bytes; RecordingCatalogSnapshot parsed;
        s.Check(Encode(value, &bytes) && Decode(bytes, &parsed) &&
                ValidateRecordingCatalogSnapshotManifest(parsed, Manifest(parsed), &error),
                "crypto-off structural codec/binding, not file digest verification");
        const auto accepted = Accepted();
        s.Check(ValidateRecordingCatalogSnapshotAcceptedStates(accepted, Chain(accepted), &error),
                "crypto-off structural DTO comparison, not a successful crypto chain proof");
    }
#endif
    return failures ? 1 : 0;
}
