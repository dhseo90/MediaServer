// 파일 용도: 운영 timeline의 조회 전용 투영.
#include "recording/recording_read_service.h"
#include "recording/recording_media_inspector.h"
#include <algorithm>
#include <charconv>
#include <cerrno>
#include <limits>
#include <tuple>
#include <set>
#include "domain/strict_json.h"
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>

namespace recording {
std::optional<ConfirmedMediaInterval> IntersectConfirmedMediaIntervals(
        const ConfirmedMediaInterval& a, const ConfirmedMediaInterval& b) {
    if(a.source_id.empty()||a.store_id.empty()||a.media_epoch_id.empty()||a.segment_id.empty()||
       a.source_id!=b.source_id||a.store_id!=b.store_id||a.media_epoch_id!=b.media_epoch_id||a.segment_id!=b.segment_id||
       a.time_base_num<=0||a.time_base_den<=0||a.time_base_num!=b.time_base_num||a.time_base_den!=b.time_base_den||
       a.start_pts<0||b.start_pts<0||a.start_pts>=a.end_pts||b.start_pts>=b.end_pts)return std::nullopt;
    auto out = a;
    out.start_pts = std::max(a.start_pts, b.start_pts);
    out.end_pts = std::min(a.end_pts, b.end_pts);
    return out.start_pts<out.end_pts?std::optional<ConfirmedMediaInterval>(out):std::nullopt;
}
bool RecordingReadService::ResolveConsumerReference(const RecordingConsumerReferenceV1& reference,
        ConsumerReferenceResolution* output, std::string* error) const {
    if (output) *output = {};
    if (!output || !ValidateRecordingConsumerReferenceV1(reference, error)) return false;
    if (reference.association_quality != "timestamp-match") {
        output->reason = reference.association_quality;
        if (error) error->clear();
        return true;
    }
    const auto& original = *reference.original;
    RecordingOriginalResult candidates;
    if(!catalog_.ResolveOriginalSample(reference.channel_id,reference.source_id,original.source_generation,
        original.generation_order,original.track_id,original.ordinal,original.pts_ns,&candidates,error))return false;
    output->unindexed=candidates.unknown;
    for(const auto& candidate:candidates.exact) {
        const auto& segment=candidate.segment;
        const __int128 numerator=static_cast<__int128>(original.pts_ns)*segment.time_base_den;
        const __int128 denominator=static_cast<__int128>(1000000000)*segment.time_base_num;
        // 정상 binding은 이미 exact 변환을 검증한다. 방어 경계에서도 원본 후보는 숨기지 않는다.
        if (denominator <= 0 || numerator % denominator ||
            numerator / denominator > std::numeric_limits<std::int64_t>::max()) {
            RecordingLocationResult unknown;
            unknown.state = RecordingLocationState::Unknown;
            unknown.has_unknown = true;
            output->exact.push_back({candidate, std::move(unknown), "unrepresentable-media-time"});
            continue;
        }
        RecordingLocationResult location;
        if(!ResolveMediaLocation(reference.channel_id,segment.segment_id,static_cast<std::int64_t>(numerator/denominator),&location,error))return false;
        // catalog 조회 사이 삭제/손상된 후보를 확정 위치로 돌려주지 않는다.
        if(location.state==RecordingLocationState::Deleted||location.state==RecordingLocationState::None)continue;
        output->exact.push_back({candidate,std::move(location),{}});
    }
    if(output->exact.empty())output->reason=output->unindexed.empty()?"none":"sample-index-cap";
    if (error) error->clear();
    return true;
}
namespace {
RecordingRangeCandidate RangeCandidate(const RecordingSegmentV2& segment,
                                       const RecordingUtcMappingV1& mapping) {
    return {segment.store_id, segment.segment_id, segment.media_epoch_id, segment.order_sequence,
            segment.time_base_num, segment.time_base_den, mapping, std::nullopt, std::nullopt, {}};
}
void SortRangeCandidates(std::vector<RecordingRangeCandidate>& candidates) {
    std::sort(candidates.begin(), candidates.end(), [](const auto& a, const auto& b) {
        return std::tie(a.store_id, a.order_sequence, a.segment_id, a.mapping.mapping_id) <
               std::tie(b.store_id, b.order_sequence, b.segment_id, b.mapping.mapping_id);
    });
}
void AddRangeBoundary(std::vector<std::int64_t>& boundaries, std::int64_t point,
                      std::int64_t start, std::int64_t end) {
    if (point > start && point < end) boundaries.push_back(point);
}
void SortRangeBoundaries(std::vector<std::int64_t>& boundaries) {
    std::sort(boundaries.begin(), boundaries.end());
    boundaries.erase(std::unique(boundaries.begin(), boundaries.end()), boundaries.end());
}
bool PlacedUtc(const RecordingUtcMappingV1& mapping) {
    return mapping.provenance != "unknown" && mapping.utc_start_ns &&
           mapping.utc_end_ns && mapping.end_pts;
}
std::optional<std::int64_t> InverseRangeBound(const RecordingSegmentV2& segment,
                                            const RecordingUtcMappingV1& mapping,
                                            std::int64_t utc, bool end, std::string& reason) {
    // 64비트 차이 × 양수 32비트 timebase는 signed int128 안이다.
    const __int128 numerator = (static_cast<__int128>(utc) - *mapping.utc_start_ns) * segment.time_base_den;
    const __int128 denominator = static_cast<__int128>(1000000000) * segment.time_base_num;
    if (denominator <= 0 || numerator % denominator != 0) {
        reason = "non-integral-media-bound";
        return std::nullopt;
    }
    const __int128 pts = static_cast<__int128>(mapping.start_pts) + numerator / denominator;
    if (pts < std::numeric_limits<std::int64_t>::min() ||
        pts > std::numeric_limits<std::int64_t>::max()) {
        reason = "media-bound-overflow";
        return std::nullopt;
    }
    if (pts < mapping.start_pts || (end ? pts > *mapping.end_pts : pts >= *mapping.end_pts)) {
        reason = "outside-mapping-media-bounds";
        return std::nullopt;
    }
    return static_cast<std::int64_t>(pts);
}
bool InvalidRange(std::string* error) {
    if (error) *error = "invalid range input";
    return false;
}
} // namespace

bool RecordingReadService::ResolveMediaRange(const std::string& channel, const std::string& id,
                                             std::int64_t start, std::int64_t end,
                                             RecordingRangeResult* result, std::string* error) const {
    if (result) *result = {};
    if (!result || start >= end || !ValidateOpaqueId(channel, error) || !ValidateOpaqueId(id, error))
        return InvalidRange(error);
    RecordingLocationCatalogSnapshot snapshot;
    if (!catalog_.SnapshotLocationsV2(channel, &snapshot, error)) return false;
    RecordingRangeResult output;
    if (std::binary_search(snapshot.deleted_segment_ids.begin(), snapshot.deleted_segment_ids.end(), id)) {
        output.deleted = true;
    } else {
        const RecordingSegmentV2* selected = nullptr;
        std::vector<std::int64_t> boundaries{start, end};
        for (const auto& segment : snapshot.segments) {
            if (segment.segment_id != id) continue;
            selected = &segment;
            for (const auto& mapping : segment.mappings) {
                AddRangeBoundary(boundaries, mapping.start_pts, start, end);
                if (mapping.end_pts) AddRangeBoundary(boundaries, *mapping.end_pts, start, end);
            }
            break;
        }
        SortRangeBoundaries(boundaries);
        for (std::size_t i = 1; i < boundaries.size(); ++i) {
            RecordingRangeSlice slice{boundaries[i-1], boundaries[i], RecordingRangeCoverage::Gap, {}};
            if (selected) for (const auto& mapping : selected->mappings) {
                if (slice.start < mapping.start_pts || (mapping.end_pts && slice.start >= *mapping.end_pts)) continue;
                auto candidate = RangeCandidate(*selected, mapping);
                candidate.media_start_pts = slice.start;
                if (mapping.end_pts) {
                    candidate.media_end_pts = slice.end;
                    slice.coverage = RecordingRangeCoverage::Confirmed;
                } else {
                    candidate.reason = "open-media-end";
                    slice.coverage = RecordingRangeCoverage::Unknown;
                }
                slice.candidates.push_back(std::move(candidate));
            }
            SortRangeCandidates(slice.candidates);
            output.slices.push_back(std::move(slice));
        }
    }
    *result = std::move(output);
    if (error) error->clear();
    return true;
}

bool RecordingReadService::ResolveUtcRange(const std::string& channel, std::int64_t start, std::int64_t end,
                                           RecordingRangeResult* result, std::string* error) const {
    if (result) *result = {};
    if (!result || start >= end || !ValidateOpaqueId(channel, error)) return InvalidRange(error);
    RecordingLocationCatalogSnapshot snapshot;
    if (!catalog_.SnapshotLocationsV2(channel, &snapshot, error)) return false;
    RecordingRangeResult output;
    std::vector<std::int64_t> boundaries{start, end};
    struct Overlap {
        const RecordingSegmentV2* segment;
        const RecordingUtcMappingV1* mapping;
    };
    struct BoundaryEvent {
        std::int64_t point;
        std::size_t index;
        bool entering;
    };
    std::vector<Overlap> overlaps;
    std::vector<BoundaryEvent> events;
    for (const auto& segment : snapshot.segments) for (const auto& mapping : segment.mappings) {
        if (!PlacedUtc(mapping)) {
            auto candidate = RangeCandidate(segment, mapping);
            candidate.media_start_pts = mapping.start_pts;
            candidate.media_end_pts = mapping.end_pts;
            candidate.reason = "utc-unplaced";
            output.unplaced.push_back(std::move(candidate));
            continue;
        }
        if (*mapping.utc_end_ns <= start || *mapping.utc_start_ns >= end) continue;
        const auto first = std::max(start, *mapping.utc_start_ns);
        const auto last = std::min(end, *mapping.utc_end_ns);
        const auto index = overlaps.size();
        overlaps.push_back({&segment, &mapping});
        events.push_back({first, index, true});
        events.push_back({last, index, false});
        AddRangeBoundary(boundaries, first, start, end);
        AddRangeBoundary(boundaries, last, start, end);
    }
    SortRangeBoundaries(boundaries);
    std::sort(events.begin(), events.end(), [](const auto& a, const auto& b) {
        return std::tie(a.point, a.entering, a.index) < std::tie(b.point, b.entering, b.index);
    });
    std::set<std::size_t> active;
    std::size_t next_event = 0;
    for (std::size_t i = 1; i < boundaries.size(); ++i) {
        RecordingRangeSlice slice{boundaries[i-1], boundaries[i], RecordingRangeCoverage::Gap, {}};
        // 인접 구간은 전체 mapping을 다시 읽지 않고 변화한 활성 집합만 갱신한다.
        while (next_event < events.size() && events[next_event].point <= slice.start) {
            const auto& event = events[next_event++];
            if (event.entering) active.insert(event.index);
            else active.erase(event.index);
        }
        bool confirmed = false;
        for (const auto index : active) {
            const auto& segment = *overlaps[index].segment;
            const auto& mapping = *overlaps[index].mapping;
            auto candidate = RangeCandidate(segment, mapping);
            candidate.media_start_pts = InverseRangeBound(segment, mapping, slice.start, false, candidate.reason);
            candidate.media_end_pts = InverseRangeBound(segment, mapping, slice.end, true, candidate.reason);
            confirmed = confirmed || (candidate.media_start_pts && candidate.media_end_pts);
            slice.candidates.push_back(std::move(candidate));
        }
        if (!slice.candidates.empty()) {
            slice.coverage = confirmed ? RecordingRangeCoverage::Confirmed : RecordingRangeCoverage::Unknown;
        }
        SortRangeCandidates(slice.candidates);
        output.slices.push_back(std::move(slice));
    }
    SortRangeCandidates(output.unplaced);
    *result = std::move(output);
    if (error) error->clear();
    return true;
}
namespace {
RecordingLocationCandidate LocationCandidate(const RecordingSegmentV2& s,std::int64_t pts,
                                              const RecordingUtcMappingV1& m) {
    return {s.store_id,s.segment_id,s.media_epoch_id,s.order_sequence,pts,s.time_base_num,s.time_base_den,m};
}
bool LocationError(std::string* error){if(error)*error="invalid location input";return false;}
void SortLocations(RecordingLocationResult* result) {
    std::sort(result->candidates.begin(),result->candidates.end(),[](const auto& a,const auto& b){
        // 이 경로의 후보는 닫힌 mapping 검사를 통과한 LocationCandidate에서만 생성된다.
        return std::tie(a.store_id,a.order_sequence,a.segment_id,a.mapping->mapping_id)<
               std::tie(b.store_id,b.order_sequence,b.segment_id,b.mapping->mapping_id);
    });
}
}
bool RecordingReadService::ResolveMediaLocation(const std::string& channel,const std::string& id,std::int64_t pts,
                                                RecordingLocationResult* result,std::string* error) const {
    if(result)*result={};
    if(!result||!ValidateOpaqueId(channel,error)||!ValidateOpaqueId(id,error))return LocationError(error);
    RecordingLocationCatalogSnapshot snapshot;
    if(!catalog_.SnapshotLocationsV2(channel,&snapshot,error))return false;
    RecordingLocationResult output;
    if(std::binary_search(snapshot.deleted_segment_ids.begin(),snapshot.deleted_segment_ids.end(),id))
        output.state=RecordingLocationState::Deleted;
    else for(const auto& segment:snapshot.segments) {
        if(segment.segment_id!=id||pts<segment.media_start_pts||(segment.media_end_pts&&pts>=*segment.media_end_pts))continue;
        for(const auto& mapping:segment.mappings) {
            if(pts<mapping.start_pts||(mapping.end_pts&&pts>=*mapping.end_pts))continue;
            if(!mapping.end_pts) {output.state=RecordingLocationState::Unknown;output.has_unknown=true;break;}
            output.candidates.push_back(LocationCandidate(segment,pts,mapping));
            output.state=RecordingLocationState::Single;output.has_unknown=mapping.provenance=="unknown";break;
        }
    }
    *result=std::move(output);if(error)error->clear();return true;
}
bool RecordingReadService::ResolveUtcLocations(const std::string& channel,std::int64_t utc,
                                               RecordingLocationResult* result,std::string* error) const {
    if(result)*result={};
    if(!result||!ValidateOpaqueId(channel,error))return LocationError(error);
    RecordingLocationCatalogSnapshot snapshot;
    if(!catalog_.SnapshotLocationsV2(channel,&snapshot,error))return false;
    RecordingLocationResult output;
    for(const auto& segment:snapshot.segments)for(const auto& mapping:segment.mappings) {
        if(mapping.provenance=="unknown"||!mapping.utc_start_ns||!mapping.utc_end_ns||!mapping.end_pts) {
            output.has_unknown=true;continue;
        }
        if(utc<*mapping.utc_start_ns||utc>=*mapping.utc_end_ns)continue;
        // 최대 64비트 차이와 양수 32비트 timebase 곱은 int128 안이다. 끝점 간 보간은 하지 않는다.
        const __int128 numerator=(static_cast<__int128>(utc)-*mapping.utc_start_ns)*segment.time_base_den;
        const __int128 denominator=static_cast<__int128>(1000000000)*segment.time_base_num;
        if(denominator<=0||numerator%denominator!=0) {output.has_unknown=true;continue;}
        const __int128 pts=static_cast<__int128>(mapping.start_pts)+numerator/denominator;
        if(pts<std::numeric_limits<std::int64_t>::min()||pts>std::numeric_limits<std::int64_t>::max()||
           pts<mapping.start_pts||pts>=*mapping.end_pts) {output.has_unknown=true;continue;}
        output.candidates.push_back(LocationCandidate(segment,static_cast<std::int64_t>(pts),mapping));
    }
    SortLocations(&output);
    if(output.candidates.size()>1)output.state=RecordingLocationState::Multiple;
    else if(output.has_unknown)output.state=RecordingLocationState::Unknown;
    else if(output.candidates.size()==1)output.state=RecordingLocationState::Single;
    *result=std::move(output);if(error)error->clear();return true;
}
namespace {
// 루트부터 각 구성요소를 fd로 고정한다. FIFO도 block하지 않고 fstat에서 거부한다.
int OpenMedia(const std::filesystem::path& root, const std::filesystem::path& relative) {
    if (relative.empty() || relative.is_absolute()) return -1;
    for (const auto& part : relative) {
        if (part == ".." || part == "." || part.empty()) return -1;
    }
    std::error_code ec;
    const auto absolute_root = std::filesystem::absolute(root, ec);
    if (ec) return -1;
    int current = ::open("/", O_RDONLY | O_DIRECTORY | O_CLOEXEC);
    if (current < 0) return -1;
    auto descend = [&](const std::filesystem::path& part, bool directory) {
        const int next = ::openat(current, part.c_str(), O_RDONLY | O_NOFOLLOW |
                                 O_CLOEXEC | O_NONBLOCK | (directory ? O_DIRECTORY : 0));
        ::close(current);
        current = next;
        return next >= 0;
    };
    for (const auto& part : absolute_root.relative_path()) {
        if (part == "." || part.empty()) continue;
        if (part == "..") { ::close(current); return -1; }
        if (!descend(part, true)) return -1;
    }
    for (auto it = relative.begin(); it != relative.end(); ++it) {
        auto next = it; ++next;
        if (!descend(*it, next != relative.end())) return -1;
    }
    return current;
}

std::vector<EventRecordingLinkV1> AllLinks(RecordingCatalog& catalog) {
    std::vector<EventRecordingLinkV1> result;
    for (const auto status : {EventRecordingLinkStatus::Pending, EventRecordingLinkStatus::Complete,
                              EventRecordingLinkStatus::Partial, EventRecordingLinkStatus::Failed}) {
        for (auto& link : catalog.ListEventLinks(status)) result.push_back(std::move(link));
    }
    return result;
}

std::filesystem::path RelativeLocator(const std::filesystem::path& root,
                                      const std::string& locator) {
    if (root.empty() || locator.empty() || locator.find('\0') != std::string::npos) return {};
    std::error_code ec;
    const auto absolute_root = std::filesystem::absolute(root, ec);
    if (ec) return {};
    const auto absolute_path = std::filesystem::absolute(locator, ec);
    if (ec) return {};
    return absolute_path.lexically_relative(absolute_root);
}
}  // namespace

ResolvedRecordingMedia::~ResolvedRecordingMedia() {
    if (fd_ >= 0) ::close(fd_);
    if (catalog_) catalog_->AdjustHoldCount(segment_id_, -1, nullptr);
}

std::unique_ptr<ResolvedRecordingMedia> RecordingReadService::ResolveMedia(
    const std::string& channel_id, const std::string& segment_id) const {
    if (!ValidateOpaqueId(segment_id, nullptr)) return {};
    const auto segment = catalog_.FindSegmentById(segment_id);
    const auto segment_v2 = catalog_.FindSegmentV2ById(segment_id);
    const auto links = AllLinks(catalog_);
    const EventRecordingLinkV1* fallback = nullptr;
    const EventRecordingLinkV1* derived = nullptr;
    for (const auto& link : links) {
        if (link.fallback_evidence_id == segment_id) {
            // segment 스냅샷 뒤 tombstone 확인: 두 조회 사이 삭제 완료도 재사용하지 않는다.
            if (fallback || segment || segment_v2 || catalog_.IsDeletedSegmentId(segment_id)) return {};
            fallback = &link;
        }
        if (link.derived_segment_id == segment_id) {
            if (derived) return {};
            derived = &link;
        }
    }
    if(segment_v2) {
        if(derived||fallback||segment_v2->channel_id!=channel_id||
           segment_v2->retention_class!=RecordingRetentionClass::Continuous||
           catalog_.SegmentLifecycleV2(segment_id)!=RecordingLifecycle::Finalized)return {};
        auto media=std::unique_ptr<ResolvedRecordingMedia>(new ResolvedRecordingMedia);
        std::string error;
        if(!catalog_.AdjustHoldCount(segment_id,1,&error))return {};
        media->catalog_=&catalog_;media->segment_id_=segment_id;
        const auto location=catalog_.FindSegmentMediaLocation(segment_id);
        if(!location)return {};
        media->fd_=OpenMedia(location->first,location->second);
        const auto inspected=InspectRecordingPhysicalMediaFd(media->fd_,{
            segment_v2->container,segment_v2->video_codecs,segment_v2->size_bytes,
            segment_v2->checksum_sha256,segment_v2->retention_class});
        if(inspected.state!=MediaInspectionState::Healthy)return {};
        media->size_bytes_=segment_v2->size_bytes;
        if(segment_v2->container=="mp4")media->content_type_="video/mp4";
        else if(segment_v2->container=="webm")media->content_type_="video/webm";
        else if(segment_v2->container=="mpegts"||segment_v2->container=="ts")media->content_type_="video/mp2t";
        else return {};
        return media;
    }
    if (fallback) {
        if (derived || fallback->channel_id != channel_id || !fallback->fallback_media_locator) return {};
        auto manifest = std::unique_ptr<ResolvedRecordingMedia>(new ResolvedRecordingMedia);
        manifest->fd_ = OpenMedia(event_root_, RelativeLocator(event_root_, *fallback->fallback_media_locator));
        struct stat info {};
        if (manifest->fd_ < 0 || ::fstat(manifest->fd_, &info) != 0 || !S_ISREG(info.st_mode) ||
            info.st_size <= 0 || info.st_size > 65536) return {};
        std::string json(static_cast<std::size_t>(info.st_size), '\0');
        std::size_t offset = 0;
        while (offset < json.size()) {
            const auto n = ::pread(manifest->fd_, json.data() + offset, json.size() - offset,
                                   static_cast<off_t>(offset));
            if (n < 0 && errno == EINTR) continue;
            if (n <= 0) return {};
            offset += static_cast<std::size_t>(n);
        }
        ingress::StrictJsonObjectDocument doc, encoded;
        if (!ingress::ParseStrictJsonObjectDocument(json, &doc, nullptr) ||
            ingress::StrictJsonStringField(doc, "schema") != "media-server.va.event-clip-hook.v1" ||
            ingress::StrictJsonStringField(doc, "eventId") != fallback->event_id) return {};
        const auto raw_stream = ingress::StrictJsonStringField(doc, "streamId");
        const auto raw_channel = ingress::StrictJsonStringField(doc, "channelId");
        if (!raw_stream || !raw_channel) return {};
        if (IsBoundRecordingFallbackNamespace(*fallback->fallback_evidence_id)) {
            const auto expected = BoundRecordingFallbackId(fallback->event_id, fallback->link_id,
                fallback->source_id, fallback->channel_id, *raw_stream, *raw_channel);
            // 지원하지 않는 version/잘린 prefix/잘못된 hex도 legacy로 강등하지 않는다.
            if (expected.empty() || expected != *fallback->fallback_evidence_id) return {};
        } else if (*raw_stream != fallback->source_id || *raw_channel != channel_id) {
            return {};
        }
        const auto nested = ingress::StrictJsonObjectField(doc, "encodedClip");
        if (!nested || !ingress::ParseStrictJsonObjectDocument(*nested, &encoded, nullptr) ||
            ingress::StrictJsonStringField(encoded, "schema") != "media-server.encoded-event-clip-contract.v1" ||
            ingress::StrictJsonStringField(encoded, "status") != "completed" ||
            ingress::StrictJsonStringField(encoded, "format") != "webm" ||
            ingress::StrictJsonStringField(encoded, "contentType") != "video/webm") return {};
        const auto codec = ingress::StrictJsonStringField(encoded, "codec");
        const auto path = ingress::StrictJsonStringField(encoded, "mediaPath");
        const auto* size = encoded.Find("byteSize");
        if (!path || (codec != "vp8" && codec != "vp9") || !size ||
            size->type != ingress::StrictJsonType::Number) return {};
        std::uint64_t bytes = 0;
        const auto parsed = std::from_chars(size->raw.data(), size->raw.data() + size->raw.size(), bytes);
        if (parsed.ec != std::errc{} || parsed.ptr != size->raw.data() + size->raw.size() || bytes == 0) return {};
        auto media = std::unique_ptr<ResolvedRecordingMedia>(new ResolvedRecordingMedia);
        media->fd_ = OpenMedia(event_root_, RelativeLocator(event_root_, *path));
        if (media->fd_ < 0 || ::fstat(media->fd_, &info) != 0 || !S_ISREG(info.st_mode) ||
            info.st_size <= 0 || static_cast<std::uint64_t>(info.st_size) != bytes) return {};
        media->size_bytes_ = bytes;
        media->content_type_ = "video/webm";
        return media;
    }
    if (!segment || segment->channel_id != channel_id || !IsPlayable(segment->lifecycle)) return {};
    if (segment->retention_class == RecordingRetentionClass::Event &&
        (!derived || derived->channel_id != channel_id || derived->source_id != segment->source_id ||
         !derived->derived_actual_range || derived->derived_actual_range->start_ms != segment->start.utc_ms ||
         derived->derived_actual_range->end_ms != segment->end.utc_ms ||
         (derived->status != EventRecordingLinkStatus::Complete &&
          derived->status != EventRecordingLinkStatus::Partial))) return {};
    auto media = std::unique_ptr<ResolvedRecordingMedia>(new ResolvedRecordingMedia);
    // AdjustHoldCount는 finalized 판정과 증가를 RequestDeletion과 같은 mutex에서 처리한다.
    if (!catalog_.AdjustHoldCount(segment_id, 1, nullptr)) return {};
    media->catalog_ = &catalog_;
    media->segment_id_ = segment_id;
    const auto location = catalog_.FindSegmentMediaLocation(segment_id);
    if (!location) return {};
    media->fd_ = OpenMedia(location->first, location->second);
    struct stat info {};
    if (media->fd_ < 0 || ::fstat(media->fd_, &info) != 0 || !S_ISREG(info.st_mode) ||
        info.st_size <= 0 || static_cast<std::uint64_t>(info.st_size) != segment->size_bytes) return {};
    if (segment->container == "mp4") media->content_type_ = "video/mp4";
    else if (segment->container == "webm") media->content_type_ = "video/webm";
    else if (segment->container == "mpegts" || segment->container == "ts") media->content_type_ = "video/mp2t";
    else return {};
    media->size_bytes_ = segment->size_bytes;
    return media;
}

bool RecordingReadService::QueryTimeline(const RecordingTimelineQuery& query,
                                         RecordingTimelineResult* result,
                                         std::string* error) const {
    if (!result) {
        if (error) *error = "timeline result is required";
        return false;
    }
    *result = {};
    // channel ID는 opaque media ID가 아니다. 기존 숫자형 채널 식별자를 유지한다.
    if (query.channel_id.empty() || query.channel_id.size() > 256 ||
        query.channel_id.find('\0') != std::string::npos || query.start_ms < 0 ||
        query.end_ms <= query.start_ms || query.limit == 0 || query.limit > 1000) {
        if (error) *error = "invalid timeline query";
        return false;
    }
    const auto segments = catalog_.QuerySegments(query.channel_id, query.start_ms, query.end_ms);
    std::vector<EventRecordingLinkV1> links;
    for (auto& link : AllLinks(catalog_))
        if (link.channel_id == query.channel_id) links.push_back(std::move(link));
    for (const auto& segment : segments) {
        RecordingTimelineItem item;
        item.segment_id = segment.segment_id;
        item.channel_id = segment.channel_id;
        const bool event = segment.retention_class == RecordingRetentionClass::Event;
        item.kind = event ? "event" : "continuous";
        item.display_priority = event ? 200 : 100;
        item.start_ms = segment.start.utc_ms;
        item.end_ms = segment.end.utc_ms;
        item.actual_range = UtcRangeV1{item.start_ms, item.end_ms};
        item.completeness = IsPlayable(segment.lifecycle) ? "complete" : "missing";
        const auto resolved = ResolveMedia(query.channel_id, segment.segment_id);
        item.playable = static_cast<bool>(resolved);
        if (resolved) item.content_type = resolved->content_type();
        if (event) {
            const EventRecordingLinkV1* binding = nullptr;
            bool ambiguous = false;
            for (const auto& link : links) {
                if (link.derived_segment_id != segment.segment_id) continue;
                if (binding) { ambiguous = true; break; }
                binding = &link;
            }
            if (!binding || ambiguous || binding->source_id != segment.source_id ||
                !binding->derived_actual_range ||
                binding->derived_actual_range->start_ms != segment.start.utc_ms ||
                binding->derived_actual_range->end_ms != segment.end.utc_ms) {
                item.playable = false;
                item.completeness = "missing";
            } else {
                item.event_id = binding->event_id;
                item.requested_range = binding->requested_range;
                item.completeness = binding->status == EventRecordingLinkStatus::Complete ? "complete" :
                    binding->status == EventRecordingLinkStatus::Partial ? "partial" : "missing";
                if (binding->status != EventRecordingLinkStatus::Complete &&
                    binding->status != EventRecordingLinkStatus::Partial) item.playable = false;
            }
        } else {
            for (const auto& link : links) {
                if (!link.requested_range) continue;
                for (const auto& overlap : link.ordered_overlaps) {
                    if (overlap.segment_id == segment.segment_id &&
                        HalfOpenRangesOverlap(overlap.range.start_ms, overlap.range.end_ms,
                                              query.start_ms, query.end_ms)) {
                        item.superseded_by_event_ids.push_back(link.event_id);
                    }
                }
            }
            auto& ids = item.superseded_by_event_ids;
            std::sort(ids.begin(), ids.end());
            ids.erase(std::unique(ids.begin(), ids.end()), ids.end());
        }
        if (item.playable) item.playback_url = "/ops/api/recordings/media/" + item.segment_id;
        result->items.push_back(std::move(item));
    }
    for (const auto& link : links) {
        if (!link.fallback_evidence_id || !link.requested_range ||
            !HalfOpenRangesOverlap(link.requested_range->start_ms, link.requested_range->end_ms,
                                   query.start_ms, query.end_ms)) continue;
        if (link.derived_segment_id && ResolveMedia(query.channel_id, *link.derived_segment_id)) continue;
        RecordingTimelineItem item;
        item.segment_id = *link.fallback_evidence_id;
        item.channel_id = query.channel_id;
        item.kind = "event";
        item.display_priority = 200;
        item.start_ms = link.requested_range->start_ms;
        item.end_ms = link.requested_range->end_ms;
        item.requested_range = link.requested_range;
        item.event_id = link.event_id;
        item.range_basis = "requested-fallback";
        const auto resolved = ResolveMedia(query.channel_id, item.segment_id);
        item.playable = static_cast<bool>(resolved);
        if (resolved) item.content_type = resolved->content_type();
        // fallback frame buffer 영상의 전체 요청 구간 충족 여부는 아직 보장하지 않는다.
        item.completeness = item.playable ? "partial" : "missing";
        if (item.playable) item.playback_url = "/ops/api/recordings/media/" + item.segment_id;
        result->items.push_back(std::move(item));
    }
    std::sort(result->items.begin(), result->items.end(), [](const auto& a, const auto& b) {
        if (a.start_ms != b.start_ms) return a.start_ms > b.start_ms;
        if (a.display_priority != b.display_priority) return a.display_priority > b.display_priority;
        return a.segment_id < b.segment_id;
    });
    result->total = result->items.size();
    const auto begin = std::min(query.offset, result->total);
    const auto count = std::min(query.limit, result->total - begin);
    std::vector<RecordingTimelineItem> page;
    page.reserve(count);
    for (std::size_t i = 0; i < count; ++i) page.push_back(std::move(result->items[begin + i]));
    result->items = std::move(page);
    if (error) error->clear();
    return true;
}
}  // namespace recording
