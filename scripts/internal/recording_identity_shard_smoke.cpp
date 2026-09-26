// 파일 용도: 녹화 세대 identity shard와 chain 무결성을 smoke로 검증한다.
// 순수 값/chain fixture이며 제품 Open/Append/Checkpoint나 archive 원문 의미를 검증하지 않는다.
#include "recording/recording_identity_shard.h"
#include <iostream>
#include <limits>
#include <map>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

using namespace recording;
namespace {
int failures = 0;
struct Scenario {
    const char* id;
    bool good{true};
    void Check(bool value, const char* assertion) {
        if (!value) { good = false; std::cerr << id << " assertion: " << assertion << '\n'; }
    }
    ~Scenario() {
        std::cout << id << ' ' << (good ? "PASS" : "FAIL") << '\n';
        if (!good) ++failures;
    }
};
std::string error;
RecordingIdentityShard Base() {
    RecordingIdentityShard shard;
    shard.store_id = "store-a";
    shard.generation = 1;
    shard.archives.push_back({"active-1.jsonl", 1000, std::string(64, 'a')});
    RecordingIdentityRow reservation;
    reservation.mutation_id = "request-a";
    reservation.type = RecordingMutationType::RecordingOrderReserved;
    reservation.entity_id = "segment-a";
    reservation.occurred_at_ms = -10;
    reservation.identity = std::string(64, 'b');
    reservation.length = 10;
    reservation.raw_sha256 = std::string(64, 'c');
    reservation.reservation = RecordingOrderReservationV1{};
    auto& order = *reservation.reservation;
    order.store_id = shard.store_id;
    order.request_id = reservation.mutation_id;
    order.segment_id = reservation.entity_id;
    order.channel_id = "channel-a";
    order.sequence = 3;
    shard.rows.push_back(reservation);
    auto ordinary = reservation;
    ordinary.mutation_id = "mutation-a";
    ordinary.type = RecordingMutationType::SegmentFinalized;
    ordinary.reservation.reset();
    ordinary.global_ordinal = 2;
    ordinary.offset = 10;
    shard.rows.push_back(ordinary);
    reservation.global_ordinal = 4;
    reservation.offset = 20;
    shard.rows.push_back(reservation);
    return shard;
}
bool Encode(const RecordingIdentityShard& shard, std::string* bytes) {
    return SerializeRecordingIdentityShard(shard, bytes, &error);
}
[[maybe_unused]] bool Rejected(const RecordingIdentityShard& shard) {
    std::string output = "unchanged";
    return !Encode(shard, &output) && output == "unchanged";
}
[[maybe_unused]] std::string Replace(std::string value, const std::string& from, const std::string& to) {
    const auto at = value.find(from);
    if (at != std::string::npos) value.replace(at, from.size(), to);
    return value;
}
[[maybe_unused]] bool BadJson(const std::string& bytes) {
    RecordingIdentityShard output;
    output.store_id = "unchanged";
    return !ParseRecordingIdentityShard(bytes, &output, &error) && output.store_id == "unchanged";
}
#if MEDIA_SERVER_USE_OPENSSL
std::string Hash(const std::string& bytes) {
    unsigned char digest[32];
    unsigned count = 0;
    if (EVP_Digest(bytes.data(), bytes.size(), digest, &count, EVP_sha256(), nullptr) != 1 || count != 32)
        return {};
    std::string hash;
    constexpr char hex[] = "0123456789abcdef";
    for (auto c : digest) { hash += hex[c >> 4]; hash += hex[c & 15]; }
    return hash;
}
struct Chain {
    std::map<std::string, std::string> files;
    bool archive_read{false};
    RecordingGenerationFile Add(const RecordingIdentityShard& shard) {
        std::string bytes;
        if (!Encode(shard, &bytes)) return {};
        const auto name = "identity-" + std::to_string(shard.generation) + ".jsonl";
        files[name] = bytes;
        return {name, static_cast<std::uint64_t>(bytes.size()), Hash(bytes)};
    }
    bool Read(const RecordingGenerationFile& file, const RecordingIdentityChainLimits& limits,
              RecordingIdentityChainResult* result) {
        return ValidateRecordingIdentityShardChain(file,
            [&](const RecordingGenerationFile& descriptor, std::uint64_t limit,
                std::string* bytes, std::string*) {
                if (descriptor.name.rfind("identity-", 0) != 0) archive_read = true;
                const auto found = files.find(descriptor.name);
                if (found == files.end() || found->second.size() > limit) return false;
                *bytes = found->second;
                return true;
            }, limits, result, &error);
    }
};
#endif
} // namespace

int main() {
#if MEDIA_SERVER_USE_OPENSSL
    {
        Scenario s{"B02-H01"};
        auto value = Base();
        std::string bytes, again;
        RecordingIdentityShard parsed;
        s.Check(Encode(value, &bytes) && ParseRecordingIdentityShard(bytes, &parsed, &error) &&
                Encode(parsed, &again) && bytes == again, "canonical roundtrip");
        s.Check(parsed.rows.size() == 3 && parsed.rows[0].occurred_at_ms == -10 &&
                parsed.rows[2].global_ordinal == 4, "physical retry and signed time preserved");
        value.rows.clear(); value.archives.clear();
        s.Check(Encode(value, &bytes) && ParseRecordingIdentityShard(bytes, &parsed, &error), "empty root");
        s.Check(bytes == "{\"schema\":\"media-server.recording-identity-shard.v1\",\"storeId\":\"store-a\",\"generation\":1,\"previous\":null,\"archives\":[],\"rows\":[]}\n",
                "independent canonical schema literal");
        value = Base();
        value.rows[0].occurred_at_ms = value.rows[2].occurred_at_ms = std::numeric_limits<std::int64_t>::min();
        s.Check(Encode(value, &bytes) && ParseRecordingIdentityShard(bytes, &parsed, &error), "int64 minimum");
    }
    {
        Scenario s{"B02-H02"};
        for (const auto* name : {"../active-1.jsonl", "active-0.jsonl", "active-01.jsonl",
                                 "active-2.jsonl", "identity-1.jsonl", "evidence-1--1.jsonl"}) {
            auto value = Base(); value.archives[0].name = name;
            s.Check(Rejected(value), "fixed basename/generation");
        }
        auto value = Base(); value.archives[0].name = "evidence-1-0.jsonl";
        std::string bytes;
        s.Check(Encode(value, &bytes), "evidence slot zero");
        value = Base(); value.rows[0].archive_slot = 1;
        s.Check(Rejected(value), "archive slot bound");
        value = Base(); value.rows[2].offset = std::numeric_limits<std::uint64_t>::max();
        s.Check(Rejected(value), "offset overflow");
        value = Base(); value.rows[2].length = std::numeric_limits<std::uint64_t>::max();
        s.Check(Rejected(value), "length overflow");
        value = Base(); value.rows[2].offset = 19;
        s.Check(Rejected(value), "overlap");
        value = Base(); value.archives.push_back(value.archives[0]);
        s.Check(Rejected(value), "duplicate archive");
        value = Base(); value.previous = RecordingGenerationFile{"identity-1.jsonl", 1, std::string(64, 'a')};
        s.Check(Rejected(value), "self-cycle forbidden");
        value.previous->name = "identity-2.jsonl";
        s.Check(Rejected(value), "future predecessor forbidden");
    }
    {
        Scenario s{"B02-H03"};
        auto value = Base(); std::string bytes;
        s.Check(Encode(value, &bytes), "identical retry retained, ordinal gaps accepted");
        value.rows[2].occurred_at_ms++;
        s.Check(Rejected(value), "retry time conflict");
        value = Base(); value.rows[2].identity[0] = 'd';
        s.Check(Rejected(value), "retry digest conflict");
        value = Base(); value.rows[2].reservation->channel_id = "channel-b";
        s.Check(Rejected(value), "retry full tuple conflict");
        value = Base(); value.rows[2].global_ordinal = 2;
        s.Check(Rejected(value), "duplicate ordinal");
        value = Base(); value.rows[2].global_ordinal = 1;
        s.Check(Rejected(value), "backward ordinal");
        value = Base(); value.rows[0].reservation.reset();
        s.Check(Rejected(value), "reservation required");
        value = Base(); value.rows[1].reservation = value.rows[0].reservation;
        s.Check(Rejected(value), "ordinary tuple forbidden");
        value = Base(); value.rows[0].reservation->store_id = "other-store";
        s.Check(Rejected(value), "tuple store binding");
        value = Base(); value.rows[2].mutation_id = "request-b";
        value.rows[2].reservation->request_id = "request-b";
        s.Check(Rejected(value), "segment reservation collision");
        value.rows[2].entity_id = value.rows[2].reservation->segment_id = "segment-b";
        s.Check(Rejected(value), "sequence reservation collision");
        value.rows[2].reservation->sequence = 2;
        s.Check(Rejected(value), "decreasing initial reservation sequence");
        value = Base(); value.rows.erase(value.rows.begin());
        value.rows[0].type = RecordingMutationType::EventLinkCreated;
        value.rows[1] = value.rows[0];
        value.rows[1].type = RecordingMutationType::EventLinkReceipt;
        value.rows[1].global_ordinal = 4; value.rows[1].offset = 20;
        value.rows[1].raw_sha256 = std::string(64, 'd');
        s.Check(Encode(value, &bytes), "receipt original identity with different raw digest");
    }
    {
        Scenario s{"B02-H04"};
        std::string bytes; s.Check(Encode(Base(), &bytes), "fixture encoded");
        for (const auto& bad : {
            Replace(bytes, "shard.v1", "shard.v2"),
            Replace(bytes, "\"generation\":1", "\"generation\":18446744073709551616"),
            Replace(bytes, "\"generation\":1", "\"generation\":1,\"generation\":1"),
            Replace(bytes, "\"rows\":[", "\"extra\":0,\"rows\":["),
            Replace(bytes, "\"archives\":[", "\"archives\":[,"),
            Replace(bytes, "\"rows\":[", "\"rows\":[["),
            Replace(bytes, "\"sequence\":3", "\"sequence\":3,\"sequence\":3"),
            Replace(bytes, "store-a", "store\\q-a"),
            Replace(bytes, "store-a", "store\\u002da"),
            Replace(bytes, "request-a", "request\\\",a"),
            bytes + " ", bytes.substr(0, bytes.size() - 1)})
            s.Check(BadJson(bad), "strict schema/keys/array/escape/canonical and output unchanged");
    }
    {
        Scenario s{"B02-H05"};
        Chain chain;
        const auto root = chain.Add(Base());
        auto next = Base(); next.generation = 2; next.previous = root;
        next.archives[0].name = "evidence-2-0.jsonl";
        next.rows = {next.rows[1]}; next.rows[0].global_ordinal = 10; next.rows[0].offset = 0;
        const auto head = chain.Add(next);
        RecordingIdentityChainLimits limits{100000, 10, 10};
        RecordingIdentityChainResult result;
        s.Check(chain.Read(head, limits, &result) && result.shards == 2 && result.physical_rows == 4 &&
                result.maximum_global_ordinal == std::optional<std::uint64_t>{10} &&
                result.head.name == head.name && result.head.size == head.size &&
                result.head.sha256 == head.sha256 &&
                result.first_acceptances.size() == 2 && result.first_acceptances[0].first_global_ordinal == 0 &&
                result.first_acceptances[0].occurrences == 2 && result.first_acceptances[1].occurrences == 2,
                "two-generation multiplicity and first ordinal");
        s.Check(result.store_id == "store-a" && result.order_history.bound_store == "store-a" && result.order_history.maximum == 3 &&
                result.order_history.legacy_segments.empty() && result.order_history.reservations.size() == 1 &&
                result.order_history.ordinary_ids == std::vector<std::string>{"mutation-a"} &&
                result.first_acceptances.size() == 2 &&
                result.first_acceptances[0].first_row.reservation.has_value() &&
                result.first_acceptances[0].first_row.reservation->channel_id == "channel-a" &&
                result.first_acceptances[0].first_row.identity == std::string(64, 'b') &&
                result.first_acceptances[0].first_archive.name == "active-1.jsonl" &&
                result.first_acceptances[1].first_archive.name == "active-1.jsonl",
                "validated identity/order projection returned atomically");
        auto third = next; third.generation = 3; third.previous = head;
        third.archives.clear(); third.rows.clear();
        s.Check(chain.Read(chain.Add(third), limits, &result) && result.shards == 3 &&
                result.maximum_global_ordinal == std::optional<std::uint64_t>{10}, "empty newer shard retains maximum");
        Chain empty_chain;
        auto empty = Base(); empty.rows.clear(); empty.archives.clear();
        s.Check(empty_chain.Read(empty_chain.Add(empty), limits, &result) && result.physical_rows == 0 &&
                !result.maximum_global_ordinal, "empty chain has no maximum ordinal");
        auto bad = head; bad.sha256[0] = bad.sha256[0] == '0' ? '1' : '0';
        result.shards = 99;
        s.Check(!chain.Read(bad, limits, &result) && result.shards == 99, "hash mismatch and output preserved");
        bad = head; ++bad.size;
        s.Check(!chain.Read(bad, limits, &result), "exact byte length");
        auto limited = limits; limited.max_shard_bytes = 1;
        s.Check(!chain.Read(head, limited, &result), "byte admission");
        limited = limits; limited.max_unique_ids = 1;
        s.Check(!chain.Read(head, limited, &result), "ID admission");
        limited = limits; limited.max_archives = 1;
        s.Check(!chain.Read(head, limited, &result), "archive admission");
        auto altered = next; altered.store_id = "store-b";
        s.Check(!chain.Read(chain.Add(altered), limits, &result), "store chain mismatch");
        altered = next; altered.rows[0].identity[0] = 'd';
        s.Check(!chain.Read(chain.Add(altered), limits, &result), "cross-shard identity collision");
        altered = next; altered.rows[0].global_ordinal = 4;
        s.Check(!chain.Read(chain.Add(altered), limits, &result), "cross-shard ordinal collision");
        altered = next; altered.rows = {Base().rows[0]};
        altered.rows[0].global_ordinal = 10; altered.rows[0].reservation->channel_id = "channel-b";
        s.Check(!chain.Read(chain.Add(altered), limits, &result), "cross-shard reservation tuple collision");
        chain.Add(next);
        chain.files.erase(root.name);
        s.Check(!chain.Read(head, limits, &result), "missing predecessor");
        s.Check(!chain.archive_read, "only identity shard bytes loaded; no archive semantic claim");
    }
#else
    {
        Scenario s{"B02-H06"};
        std::string bytes; RecordingIdentityShard parsed;
        s.Check(Encode(Base(), &bytes) && ParseRecordingIdentityShard(bytes, &parsed, &error), "crypto-off value codec");
        bool called = false;
        RecordingIdentityChainResult result; result.shards = 99;
        s.Check(!ValidateRecordingIdentityShardChain({}, [&](const auto&, auto, auto*, auto*) {
                    called = true; return true;
                }, {10000, 10, 10}, &result, &error) && !called && result.shards == 99 &&
                error.find("unsupported") != std::string::npos, "crypto-off chain fail closed");
    }
#endif
    return failures ? 1 : 0;
}
