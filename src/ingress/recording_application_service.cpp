// 파일 용도: 녹화 HTTP 응답의 범위·숫자·JSON 계약을 transport와 분리한다.
#include "ingress/recording_application_service.h"
#include "recording/recording_latency_trace.h"
#include <charconv>
#include <sstream>
#include <limits>
#include <stdexcept>

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
    return "{\"timeBasis\":\"utc-ms\",\"startTimeMs\":" + Quote(std::to_string(range->start_ms)) +
           ",\"endTimeMs\":" + Quote(std::to_string(range->end_ms)) + "}";
}
std::string Decimal(const std::optional<std::int64_t>& value){return value?Quote(std::to_string(*value)):"null";}
std::string RequestJson(const recording::RecordingTimelineItem& item){
    if(!item.request)return RangeJson(item.requested_range);
    const auto& q=*item.request;
    return "{\"timeBasis\":"+Quote(q.time_basis)+",\"startTimeMs\":"+Quote(std::to_string(q.start_ms))+
        ",\"endTimeMs\":"+Quote(std::to_string(q.end_ms))+",\"preMs\":"+Quote(std::to_string(q.pre_ms))+
        ",\"postMs\":"+Quote(std::to_string(q.post_ms))+"}";
}
// 응답은 append 전 상한을 검사한다. 전체를 만든 뒤 크기를 재는 방식으로 초과 메모리를 허용하지 않는다.
class TimelineBuffer final : public std::streambuf {
public:
    std::string Take(){return std::move(value_);}
protected:
    std::streamsize xsputn(const char* data,std::streamsize count) override {
        if(count<0||static_cast<std::uint64_t>(count)>64ULL*1024*1024-value_.size())throw std::length_error("timeline-response-limit");
        value_.append(data,static_cast<std::size_t>(count));return count;
    }
    int_type overflow(int_type ch) override {
        if(traits_type::eq_int_type(ch,traits_type::eof()))return traits_type::not_eof(ch);
        const char value=traits_type::to_char_type(ch);xsputn(&value,1);return ch;
    }
private:
    std::string value_;
};
void TimelineJson(std::ostream& out,const recording::RecordingTimelineItem& item){
    const auto id=item.item_id.empty()?"legacy:"+item.segment_id:item.item_id;
    out<<"{\"itemId\":"<<Quote(id)<<",\"segmentId\":"<<(item.segment_id.empty()?"null":Quote(item.segment_id))
       <<",\"channelId\":"<<Quote(item.channel_id)<<",\"kind\":"<<Quote(item.kind)<<",\"displayPriority\":"<<item.display_priority
       <<",\"startTimeMs\":"<<(item.unplaced?"null":Quote(std::to_string(item.start_ms)))
       <<",\"endTimeMs\":"<<(item.unplaced?"null":Quote(std::to_string(item.end_ms)))
       <<",\"eventId\":"<<Quote(item.event_id)<<",\"referenceId\":"<<Quote(item.reference_id)<<",\"jobId\":"<<Quote(item.job_id)
       <<",\"jobState\":"<<Quote(item.job_state)<<",\"catalogState\":"<<Quote(item.catalog_state)
       <<",\"completeness\":"<<Quote(item.completeness)<<",\"playable\":"<<item.playable
       <<",\"unavailableReason\":"<<Quote(item.unavailable_reason)<<",\"playbackUrl\":"<<Quote(item.playback_url)
       <<",\"contentType\":"<<Quote(item.content_type)<<",\"rangeBasis\":"<<Quote(item.range_basis)
       <<",\"requestedRange\":"<<RequestJson(item)<<",\"actualRange\":"<<RangeJson(item.actual_range)
       <<",\"orderSequence\":"<<Decimal(item.order_sequence)<<",\"utcRange\":";
    if(item.utc_start_ns&&item.utc_end_ns)out<<"{\"startNs\":"<<Decimal(item.utc_start_ns)<<",\"endNs\":"<<Decimal(item.utc_end_ns)
        <<",\"provenance\":"<<Quote(item.range_basis=="source-utc-mapping"?item.range_basis:item.mapping_provenance)
        <<",\"mappingProvenance\":"<<Quote(item.mapping_provenance)<<",\"mappingId\":"<<Quote(item.mapping_id)
        <<",\"uncertaintyNs\":"<<Decimal(item.uncertainty_ns)<<'}';else out<<"null";
    out<<",\"mediaRange\":";
    if(item.media_start_pts)out<<"{\"timeBasis\":"<<Quote(item.media_axis)<<",\"startPts\":"<<Decimal(item.media_start_pts)
        <<",\"endPts\":"<<Decimal(item.media_end_pts)<<",\"timeBaseNum\":"<<Quote(std::to_string(item.time_base_num))
        <<",\"timeBaseDen\":"<<Quote(std::to_string(item.time_base_den))<<'}';else out<<"null";
    out<<",\"hideByEvent\":"<<item.hide_by_event<<",\"supersededByEventIds\":[";
    for(std::size_t i=0;i<item.superseded_by_event_ids.size();++i){if(i)out<<',';out<<Quote(item.superseded_by_event_ids[i]);}
    out<<"],\"eventOverlaps\":[";
    for(std::size_t i=0;i<item.event_overlaps.size();++i){if(i)out<<',';const auto& overlap=item.event_overlaps[i];
        out<<"{\"itemId\":"<<Quote(overlap.item_id)<<",\"timeBasis\":\"source-media-ns\",\"startNs\":"<<Quote(std::to_string(overlap.start_ns))
           <<",\"endNs\":"<<Quote(std::to_string(overlap.end_ns))<<'}';}
    out<<"]}";
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
    recording::latency::Scope latency_scope(recording::latency::Operation::Timeline,recording::latency::Source::Application,__LINE__,true,true);
    const auto channel = query.find("channelId");
    if (channel == query.end() || channel->second.empty() || channel->second.size()>256 ||
        channel->second.find('\0')!=std::string::npos) return BadQuery();
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
        offset > std::numeric_limits<std::size_t>::max() || limit == 0 || limit > 1000 || end<=start) return BadQuery();
    parsed.start_ms = static_cast<std::int64_t>(start);
    parsed.end_ms = static_cast<std::int64_t>(end);
    parsed.offset = static_cast<std::size_t>(offset);
    parsed.limit = static_cast<std::size_t>(limit);
    recording::RecordingTimelineResult result;
    if (!reader_.QueryTimeline(parsed, &result, nullptr)) return {503,"Service Unavailable","{\"error\":\"recording timeline unavailable\"}"};
    try {
    recording::latency::Scope serialize_scope(recording::latency::Operation::Serialize,recording::latency::Source::Application,__LINE__,true);
    TimelineBuffer buffer;std::ostream out(&buffer);out.exceptions(std::ios::badbit|std::ios::failbit);
    out << std::boolalpha << "{\"total\":" << result.total << ",\"unplacedTotal\":"<<result.unplaced_total<<",\"offset\":" << offset
        << ",\"limit\":" << limit << ",\"items\":[";
    bool comma=false;
    for(const auto& item:result.items){if(comma)out<<',';comma=true;TimelineJson(out,item);}
    out<<"],\"unplacedItems\":[";comma=false;
    for(const auto& item:result.unplaced_items){if(comma)out<<',';comma=true;TimelineJson(out,item);}
    out<<"]}";
    return {200, "OK", buffer.Take()};
    }catch(const std::exception&){return {503,"Service Unavailable","{\"error\":\"recording timeline unavailable\"}"};}
}

std::unique_ptr<recording::ResolvedRecordingMedia> RecordingApplicationService::Media(
    const std::string& opaque_id, const ChannelAuthorizer& authorize) const {
    if (!authorize || !recording::ValidateOpaqueId(opaque_id, nullptr)) return {};
    const auto segment = catalog_.FindSegmentById(opaque_id);
    const auto segment_v2 = catalog_.FindSegmentV2ById(opaque_id);
    if(segment_v2){
        if(segment||!authorize(segment_v2->channel_id))return {};
        return reader_.ResolveMedia(segment_v2->channel_id,opaque_id);
    }
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
