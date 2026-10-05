// 파일 용도: 기존 녹화 증명과 영상 색인 문서를 연결하는 내부 adapter.
#pragma once
#include "analysis/siglip2_encoder.h"
#include "recording/recording_search_reader.h"
#include "recording/visual_search_index.h"
#include <functional>
#include <map>
namespace recording {
struct VisualSnapshotEvent {
    std::string event_id,channel_id,stream_epoch_id;
};
struct VisualSourceCoverage {
    std::size_t examined_segments{0},unsupported_segments{0},representative_frames{0};
    std::size_t examined_snapshots{0},unsupported_snapshots{0},event_snapshots{0};
};
class RecordingVisualSource {
public:
    RecordingVisualSource(RecordingCatalog& catalog,RecordingReadService& reader,std::string snapshots={})
        :catalog_(catalog),reader_(reader),snapshots_(std::move(snapshots)){}
    bool CollectSnapshots(const std::vector<VisualSnapshotEvent>& event_channels,
        std::vector<VisualSearchDocument>*,std::map<std::string,VisualSourceCoverage>*,std::string*,
        const std::function<bool()>& cancelled={}) const;
    bool SnapshotMatchesEvent(const VisualSearchDocument&,const std::string& event_epoch,std::string* error = nullptr) const;
    // 지원하지 않는 구형/무증명 원본은 채널별 수로 명시한다. 용량 초과에서 부분 결과를 내지 않는다.
    bool Collect(const std::vector<std::string>& channels,unsigned sample_period_seconds,
        std::vector<VisualSearchDocument>*,std::map<std::string,VisualSourceCoverage>*,
        std::string* error,const std::function<bool()>& cancelled={}) const;
    using PreparedSource=RecordingSearchReader::PreparedSource;
    bool Encode(VisualSearchDocument*,analysis::Siglip2Encoder&,std::string* error,
        const std::function<bool()>& cancelled={},const PreparedSource* prepared=nullptr) const;
    // 원본 hash/sample과 현재 파일 재생을 확인한다. 성공 FD가 caller 반환/추출 동안 보존 보호한다.
    bool Resolve(const VisualSearchDocument&,SearchSeekTarget*,std::unique_ptr<ResolvedRecordingMedia>*,std::string*,
        const std::function<bool()>& cancelled = {},
        std::chrono::steady_clock::time_point deadline = std::chrono::steady_clock::time_point::max()) const;
    std::unique_ptr<PreparedSource> Prepare(const VisualSearchDocument&,std::string*,const std::function<bool()>&,
        std::chrono::steady_clock::time_point) const;
    bool ResolvePrepared(const VisualSearchDocument&,const PreparedSource&,SearchSeekTarget*,std::string*,
        const std::function<bool()>&,std::chrono::steady_clock::time_point) const;
    bool IsDeleted(const VisualSearchDocument& doc) const { return catalog_.IsDeletedSegmentId(doc.segment_id); }
    static bool SelectSamples(const RecordingSegmentV2&,const RecordingSourceBindingV1&,unsigned period_seconds,
        std::vector<VisualSearchDocument>*,std::string* error,std::optional<std::int64_t> previous_pts={});
private:
    RecordingCatalog& catalog_;RecordingReadService& reader_;
    std::string snapshots_;
    static std::optional<std::int64_t> SampleUtc(const RecordingSegmentV2&,std::int64_t);
    bool CurrentDocument(const VisualSearchDocument&,std::string*) const;
    bool SnapshotDocument(const std::string& event,const std::string& channel,VisualSearchDocument*,std::string*) const;
    bool EncodeSnapshot(VisualSearchDocument*,analysis::Siglip2Encoder&,std::string*,const std::function<bool()>&) const;
};
} // namespace recording
