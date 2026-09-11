// 파일 용도: 녹화 HTTP 응답의 범위·숫자·JSON 계약을 transport와 분리한다.
#include "ingress/recording_application_service.h"
#include <charconv>
#include <sstream>
#include <limits>

namespace ingress {
namespace {
bool Unsigned(const std::string& text, std::uint64_t* value) {
    if (text.empty()) return false;
    const auto result = std::from_chars(text.data(), text.data() + text.size(), *value);
    return result.ec == std::errc{} && result.ptr == text.data() + text.size();
}

std::string Quote(const std::string& value) {
    static constexpr char hex[] = "0123456789abcdef";
    std::string result = "\"";
    for (unsigned char ch : value) {
        if (ch == '"' || ch == '\\') { result += '\\'; result += static_cast<char>(ch); }
        else if (ch < 32) { result += "\\u00"; result += hex[ch >> 4]; result += hex[ch & 15]; }
        else result += static_cast<char>(ch);
    }
    return result + '"';
}
std::string RangeJson(const std::optional<recording::UtcRangeV1>& range) {
    if (!range) return "null";
    return "{\"startTimeMs\":" + std::to_string(range->start_ms) +
           ",\"endTimeMs\":" + std::to_string(range->end_ms) + "}";
}
ApplicationServiceResult BadQuery() { return {400, "Bad Request", "{\"error\":\"invalid recording query\"}"}; }
}  // namespace

std::optional<RecordingByteRange> ParseRecordingByteRange(const std::string& header,
                                                         std::uint64_t file_size) {
    if (file_size == 0) return std::nullopt;
    if (header.empty()) return RecordingByteRange{0, file_size, false};
    if (header.compare(0, 6, "bytes=") != 0 || header.find(',') != std::string::npos) return std::nullopt;
    const auto spec = header.substr(6);
    const auto dash = spec.find('-');
    if (dash == std::string::npos || spec.find('-', dash + 1) != std::string::npos) return std::nullopt;
    const auto first = spec.substr(0, dash), last = spec.substr(dash + 1);
    std::uint64_t start = 0, end = 0;
    if (first.empty()) {
        if (!Unsigned(last, &end) || end == 0) return std::nullopt;
        const auto length = std::min(end, file_size);
        return RecordingByteRange{file_size - length, length, true};
    }
    if (!Unsigned(first, &start) || start >= file_size) return std::nullopt;
    if (last.empty()) return RecordingByteRange{start, file_size - start, true};
    if (!Unsigned(last, &end) || end < start || end >= file_size) return std::nullopt;
    return RecordingByteRange{start, end - start + 1, true};
}

ApplicationServiceResult RecordingApplicationService::Status(const ChannelAuthorizer& authorize, bool include_global_observations) const {
    std::vector<RecordingChannelStatus> channels;
    if (!authorize || !status_provider_ || !status_provider_(&channels))
        return {503, "Service Unavailable", "{\"error\":\"recording status unavailable\"}"};
    const auto recovery = catalog_.recovery_report();
    std::ostringstream out;
    out << std::boolalpha << "{\"enabled\":" << enabled_ << ",\"catalogMode\":" << Quote(catalog_.catalog_mode())
        << ",\"degraded\":" << (catalog_.catalog_mode() != "sqlite-primary" || recovery.projection_error_count != 0 ||
                                     recovery.corrupt_line_count != 0 || recovery.writer_cleanup_error_count != 0)
        << ",\"recovery\":{\"corruptLines\":" << recovery.corrupt_line_count
        << ",\"projectionErrors\":" << recovery.projection_error_count
        << ",\"cleanupErrors\":" << recovery.writer_cleanup_error_count << "},\"channels\":[";
    bool comma = false;
    for (const auto& channel : channels) {
        if (!authorize(channel.channel_id)) continue;
        if (comma) out << ',';
        comma = true;
        out << "{\"channelId\":" << Quote(channel.channel_id) << ",\"displayName\":" << Quote(channel.display_name)
            << ",\"enabled\":" << channel.enabled << ",\"active\":" << channel.active
            << ",\"storageBlocked\":" << channel.storage_blocked
            << ",\"continuousBytes\":" << channel.continuous_bytes << ",\"eventBytes\":" << channel.event_bytes
            << ",\"continuousMaxBytes\":" << channel.continuous_max_bytes
            << ",\"eventMaxBytes\":" << channel.event_max_bytes << '}';
    }
    out << ']';
    if (include_global_observations && observation_status_provider_) {
        const auto status = observation_status_provider_();
        out << ",\"observations\":{\"queued\":" << status.queued << ",\"pending\":" << status.pending
            << ",\"activeTracks\":" << status.tracks << ",\"stored\":" << status.stored
            << ",\"intervalDropped\":" << status.interval_dropped
            << ",\"criticalRejected\":" << status.critical_rejected
            << ",\"storageErrors\":" << status.storage_errors
            << ",\"lastError\":" << Quote(status.last_error) << '}';
    }
    out << '}';
    return {200, "OK", out.str()};
}

ApplicationServiceResult RecordingApplicationService::Timeline(
    const std::unordered_map<std::string, std::string>& query, const ChannelAuthorizer& authorize) const {
    const auto channel = query.find("channelId");
    if (channel == query.end() || channel->second.empty()) return BadQuery();
    if (!authorize || !authorize(channel->second)) return {403, "Forbidden", "{\"error\":\"recording channel forbidden\"}"};
    recording::RecordingTimelineQuery parsed;
    parsed.channel_id = channel->second;
    auto number = [&](const char* key, std::uint64_t default_value, bool required, std::uint64_t* value) {
        const auto it = query.find(key);
        if (it == query.end()) { *value = default_value; return !required; }
        return Unsigned(it->second, value);
    };
    std::uint64_t start = 0, end = 0, offset = 0, limit = 100;
    if (!number("startTimeMs", 0, true, &start) || !number("endTimeMs", 0, true, &end) ||
        !number("offset", 0, false, &offset) || !number("limit", 100, false, &limit) ||
        start > static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()) ||
        end > static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()) ||
        offset > std::numeric_limits<std::size_t>::max() || limit > 1000) return BadQuery();
    parsed.start_ms = static_cast<std::int64_t>(start);
    parsed.end_ms = static_cast<std::int64_t>(end);
    parsed.offset = static_cast<std::size_t>(offset);
    parsed.limit = static_cast<std::size_t>(limit);
    recording::RecordingTimelineResult result;
    if (!reader_.QueryTimeline(parsed, &result, nullptr)) return BadQuery();
    std::ostringstream out;
    out << std::boolalpha << "{\"total\":" << result.total << ",\"offset\":" << offset
        << ",\"limit\":" << limit << ",\"items\":[";
    bool comma = false;
    for (const auto& item : result.items) {
        if (comma) out << ',';
        comma = true;
        out << "{\"segmentId\":" << Quote(item.segment_id) << ",\"channelId\":" << Quote(item.channel_id)
            << ",\"kind\":" << Quote(item.kind) << ",\"displayPriority\":" << item.display_priority
            << ",\"startTimeMs\":" << item.start_ms << ",\"endTimeMs\":" << item.end_ms
            << ",\"eventId\":" << Quote(item.event_id) << ",\"completeness\":" << Quote(item.completeness)
            << ",\"playable\":" << item.playable << ",\"playbackUrl\":" << Quote(item.playback_url)
            << ",\"contentType\":" << Quote(item.content_type)
            << ",\"rangeBasis\":" << Quote(item.range_basis)
            << ",\"requestedRange\":" << RangeJson(item.requested_range)
            << ",\"actualRange\":" << RangeJson(item.actual_range) << ",\"supersededByEventIds\":[";
        for (std::size_t i = 0; i < item.superseded_by_event_ids.size(); ++i) {
            if (i) out << ',';
            out << Quote(item.superseded_by_event_ids[i]);
        }
        out << "]}";
    }
    out << "]}";
    return {200, "OK", out.str()};
}

std::unique_ptr<recording::ResolvedRecordingMedia> RecordingApplicationService::Media(
    const std::string& opaque_id, const ChannelAuthorizer& authorize) const {
    if (!authorize || !recording::ValidateOpaqueId(opaque_id, nullptr)) return {};
    const auto segment = catalog_.FindSegmentById(opaque_id);
    if (segment) {
        if (!authorize(segment->channel_id)) return {};
        return reader_.ResolveMedia(segment->channel_id, opaque_id);
    }
    std::optional<std::string> channel;
    for (const auto status : {recording::EventRecordingLinkStatus::Pending, recording::EventRecordingLinkStatus::Complete,
                              recording::EventRecordingLinkStatus::Partial, recording::EventRecordingLinkStatus::Failed}) {
        for (const auto& link : catalog_.ListEventLinks(status)) {
            if (link.fallback_evidence_id != opaque_id) continue;
            if (channel) return {};
            channel = link.channel_id;
        }
    }
    if (!channel || !authorize(*channel)) return {};
    return reader_.ResolveMedia(*channel, opaque_id);
}
}  // namespace ingress
