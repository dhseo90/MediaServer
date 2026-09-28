// 파일 용도: 녹화 순서 이력 snapshot의 직렬화·검증 계약을 smoke로 검증한다.
// 순수 DTO codec 검증. 제품 Open/원장/SQLite/manifest 게시를 실행하지 않는다.
#include "recording/recording_order_history_snapshot.h"
#include <algorithm>
#include <array>
#include <iostream>
#include <limits>
#include <stdexcept>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif

namespace {
recording::RecordingOrderHistorySnapshot Example() {
    recording::RecordingOrderHistorySnapshot result;
    result.bound_store = "store-a";
    result.maximum = 9;
    result.reservations = {
        {{"media-server.recording-order.v1", "store-a", "req-b", "seg-b", "camera:2", 9}, 200},
        {{"media-server.recording-order.v1", "store-a", "req-a", "seg-a", "123", 3}, -100}};
    result.ordinary_ids = {"ordinary-z", "ordinary-a"};
    result.legacy_segments = {"legacy-z", "legacy-a"};
    return result;
}
std::string Replace(std::string text, const std::string& before, const std::string& after) {
    const auto offset = text.find(before);
    if (offset == std::string::npos) throw std::runtime_error("fixture replacement missing");
    text.replace(offset, before.size(), after);
    return text;
}
} // namespace
int main() {
    using namespace recording;
    std::array<bool, 6> result{true, true, true, true, true, true};
    std::array<unsigned, 6> assertions{};
    const std::array<const char*, 6> titles{
        "B03-O01 roundtrip", "B03-O02 canonical ordering and boundaries", "B03-O03 reservation conflicts",
        "B03-O04 ID sets", "B03-O05 strict JSON", "B03-O06 crypto-off"};
    const auto check = [&](unsigned group, bool ok, const char* detail) {
        ++assertions[group - 1];
        result[group - 1] = result[group - 1] && ok;
        if (!ok) std::cout << "[assertion] " << titles[group - 1] << ": " << detail << '\n';
    };
    std::string error, raw;
    RecordingOrderHistorySnapshot parsed;
    const auto rejected = [&](unsigned group, const RecordingOrderHistorySnapshot& value, const char* detail) {
        std::string output = "unchanged";
        const bool accepted = SerializeRecordingOrderHistorySnapshot(value, &output, &error);
        check(group, !accepted && output == "unchanged", detail);
    };
    try {
        RecordingOrderHistorySnapshot empty;
        check(1, SerializeRecordingOrderHistorySnapshot(empty, &raw, &error), "empty serialize");
        check(1, raw == "{\"schema\":\"media-server.recording-order-history.v1\",\"boundStore\":\"\",\"maximum\":0,\"reservations\":[],\"ordinaryIds\":[],\"legacySegments\":[]}\n",
              "independent empty canonical literal");
        check(1, ParseRecordingOrderHistorySnapshot(raw, &parsed, &error) && parsed.bound_store.empty() &&
            parsed.maximum == 0 && parsed.reservations.empty(), "empty parse");
        empty.ordinary_ids = {"old-mutation"}; empty.legacy_segments = {"old-segment"};
        check(1, SerializeRecordingOrderHistorySnapshot(empty, &raw, &error) &&
            ParseRecordingOrderHistorySnapshot(raw, &parsed, &error) && parsed.ordinary_ids == empty.ordinary_ids &&
            parsed.legacy_segments == empty.legacy_segments, "empty reservations retain historical ID sets");
        const auto sample = Example();
        check(1, SerializeRecordingOrderHistorySnapshot(sample, &raw, &error), "normal serialize");
        const auto canonical = raw;
        check(1, ParseRecordingOrderHistorySnapshot(raw, &parsed, &error) && parsed.bound_store == "store-a" &&
            parsed.maximum == 9 && parsed.reservations.size() == 2 &&
            parsed.reservations[0].order.sequence == 3 && parsed.reservations[0].occurred_at_ms == -100 &&
            parsed.reservations[0].order.channel_id == "123", "tuple and signed time restored");
        std::vector<std::string> segments;
        check(1, RecordingOrderHistorySegments(sample, &segments, &error) &&
            segments == std::vector<std::string>({"seg-a", "seg-b"}), "segments reconstructed");

        auto shuffled = sample;
        std::reverse(shuffled.reservations.begin(), shuffled.reservations.end());
        std::reverse(shuffled.ordinary_ids.begin(), shuffled.ordinary_ids.end());
        std::reverse(shuffled.legacy_segments.begin(), shuffled.legacy_segments.end());
        check(2, SerializeRecordingOrderHistorySnapshot(shuffled, &raw, &error) && raw == canonical,
              "input order does not change canonical bytes; gaps accepted");
        auto boundaries = sample;
        boundaries.maximum = std::numeric_limits<std::int64_t>::max();
        boundaries.reservations[0].order.sequence = boundaries.maximum;
        boundaries.reservations[0].occurred_at_ms = std::numeric_limits<std::int64_t>::max();
        boundaries.reservations[1].occurred_at_ms = std::numeric_limits<std::int64_t>::min();
        check(2, SerializeRecordingOrderHistorySnapshot(boundaries, &raw, &error) &&
            ParseRecordingOrderHistorySnapshot(raw, &parsed, &error) && parsed.maximum == boundaries.maximum &&
            parsed.reservations[0].occurred_at_ms == std::numeric_limits<std::int64_t>::min(), "int64 endpoints");
        boundaries = sample;
        boundaries.bound_store = "store.with:parts";
        for (auto& entry : boundaries.reservations) entry.order.store_id = boundaries.bound_store;
        check(2, SerializeRecordingOrderHistorySnapshot(boundaries, &raw, &error), "existing punctuation ID contract");

        auto invalid = sample; invalid.reservations.push_back(sample.reservations[0]);
        rejected(3, invalid, "identical request duplicates rejected in snapshot set");
        invalid = sample; invalid.reservations[1].order.segment_id = invalid.reservations[0].order.segment_id;
        rejected(3, invalid, "duplicate segment");
        invalid = sample; invalid.reservations[1].order.sequence = 9;
        rejected(3, invalid, "duplicate sequence");
        invalid = sample; invalid.reservations[1].order.store_id = "other-store";
        rejected(3, invalid, "store mismatch");
        invalid = sample; invalid.maximum = 8; rejected(3, invalid, "maximum below actual");
        invalid = sample; invalid.maximum = 10; rejected(3, invalid, "maximum above actual");
        invalid = sample; invalid.bound_store.clear(); rejected(3, invalid, "reservations with empty store");
        invalid = {}; invalid.bound_store = "store-a"; rejected(3, invalid, "empty history with bound store");
        invalid = {}; invalid.maximum = 1; rejected(3, invalid, "empty history nonzero maximum");
        invalid = sample; invalid.reservations[1].order.sequence = 0; rejected(3, invalid, "zero sequence");
        invalid = sample; invalid.reservations[1].order.schema = "other"; rejected(3, invalid, "reservation schema");

        invalid = sample; invalid.ordinary_ids.push_back("req-a"); rejected(4, invalid, "ordinary versus request");
        invalid = sample; invalid.legacy_segments.push_back("seg-a"); rejected(4, invalid, "legacy versus reserved segment");
        invalid = sample; invalid.ordinary_ids.push_back(invalid.ordinary_ids[0]); rejected(4, invalid, "ordinary duplicates");
        invalid = sample; invalid.legacy_segments.push_back(invalid.legacy_segments[0]); rejected(4, invalid, "legacy duplicates");
        invalid = sample; invalid.ordinary_ids = {"123"}; rejected(4, invalid, "numeric opaque ID");
        invalid = sample; invalid.legacy_segments = {"../segment"}; rejected(4, invalid, "path ID");
        invalid = sample; invalid.reservations[1].order.channel_id = "bad/channel"; rejected(4, invalid, "channel ID path");
        invalid = sample; invalid.reservations[1].order.request_id = std::string(129, 'r'); rejected(4, invalid, "existing ID bound");
        auto allowed = sample;
        allowed.ordinary_ids = {"seg-a", "shared"}; allowed.legacy_segments = {"req-a", "shared"};
        check(4, SerializeRecordingOrderHistorySnapshot(allowed, &raw, &error), "unrestricted namespace crossings preserved");
        allowed = sample; allowed.reservations[1].order.request_id = "seg-a";
        check(4, SerializeRecordingOrderHistorySnapshot(allowed, &raw, &error), "request may equal own segment ID");

        const auto reject_json = [&](const std::string& input, const char* detail) {
            RecordingOrderHistorySnapshot output; output.bound_store = "sentinel";
            check(5, !ParseRecordingOrderHistorySnapshot(input, &output, &error) &&
                output.bound_store == "sentinel" && output.reservations.empty(), detail);
        };
        reject_json(Replace(canonical, "recording-order-history.v1", "recording-order-history.v2"), "outer schema");
        reject_json(Replace(canonical, "recording-order.v1", "recording-order.v2"), "nested reservation schema");
        reject_json(Replace(canonical, "{\"schema\"", "{\"extra\":0,\"schema\""), "extra field");
        reject_json(Replace(canonical, "{\"schema\"", "{\"maximum\":9,\"schema\""), "duplicate outer key");
        reject_json(Replace(canonical, "\"sequence\":3", "\"sequence\":3,\"sequence\":3"), "duplicate nested key");
        reject_json(Replace(canonical, "\"sequence\":3", "\"sequence\":3,\"extra\":0"), "extra nested key");
        reject_json(Replace(canonical, "\"maximum\":9", "\"maximum\":\"9\""), "numeric string rejected");
        reject_json(Replace(canonical, "\"maximum\":9", "\"maximum\":9223372036854775808"), "maximum overflow");
        reject_json(Replace(canonical, "\"sequence\":3", "\"sequence\":9223372036854775808"), "sequence overflow");
        reject_json(Replace(canonical, "\"occurredAtMs\":-100", "\"occurredAtMs\":-9223372036854775809"), "timestamp underflow");
        reject_json(Replace(canonical, "\"sequence\":3", "\"sequence\":3e0"), "exponent noncanonical integer");
        reject_json(Replace(canonical, "\"ordinary-a\"", "[\"nested,a\",\"nested-b\"]"), "nested array comma boundaries");
        reject_json(Replace(canonical, "\"ordinary-a\"", "\"bad,id\""), "quoted comma remains string");
        reject_json(Replace(canonical, "\"ordinary-a\"", "\"bad\\\",id\""), "escaped quote before comma");
        reject_json(Replace(canonical, "\"ordinary-a\"", "\"bad\\\\,id\""), "escaped backslash before comma");
        reject_json(Replace(canonical, "\"req-a\"", "\"\\u0072eq-a\""), "decoded valid ID but noncanonical escape");
        reject_json(Replace(canonical, "\"ordinary-a\",\"ordinary-z\"", "\"ordinary-z\",\"ordinary-a\""), "unsorted wire set");
        reject_json(" " + canonical, "leading whitespace noncanonical");
        reject_json(canonical.substr(0, canonical.size() - 2), "truncated JSON");
        reject_json(Replace(canonical, "\"ordinary-a\"", "\"bad\\q\""), "invalid escape");
#if !MEDIA_SERVER_USE_OPENSSL
        check(6, SerializeRecordingOrderHistorySnapshot(sample, &raw, &error) &&
            ParseRecordingOrderHistorySnapshot(raw, &parsed, &error), "codec works without crypto");
        check(6, !ParseRecordingOrderHistorySnapshot("{}", &parsed, &error), "crypto-off strict rejection");
#endif
    } catch (const std::exception& exception) {
        std::cerr << exception.what() << '\n';
        for (unsigned group : {1, 2, 3, 4, 5}) check(group, false, "fixture aborted");
    }
    unsigned passed = 0, failed = 0;
    for (std::size_t i = 0; i < result.size(); ++i) {
        if (!assertions[i]) continue;
        (result[i] ? passed : failed)++;
        std::cout << (result[i] ? "[pass] " : "[fail] ") << titles[i] << " assertions=" << assertions[i] << '\n';
    }
    std::cout << "[summary] pass=" << passed << " fail=" << failed << '\n';
    return failed ? 1 : 0;
}
