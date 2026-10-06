// 파일 용도: 모델 공간이 고정된 불변 영상 벡터 색인과 exact cosine 조회 계약.
#pragma once
#include <cstdint>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace recording {
struct VisualEmbeddingContract {
    std::string image_id, text_id, space_id;
    std::size_t dimensions{768};
    static VisualEmbeddingContract Siglip2();
    bool operator==(const VisualEmbeddingContract& other) const;
};
struct VisualSearchDocument {
    std::string id, channel_id, segment_id, event_id;
    std::string media_sha256, frame_sha256;
    std::int64_t media_pts{0};
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    std::optional<std::int64_t> utc_ns;
    std::vector<float> embedding;
};
// 수집 시점의 채널별 제외 정보. 성공한 게시본에만 결속하며 cache에는 저장하지 않는다.
struct VisualSourceCoverage {
    std::size_t examined_segments{0},unsupported_segments{0},representative_frames{0};
    std::size_t examined_snapshots{0},unsupported_snapshots{0},event_snapshots{0};
};
struct VisualIndexLimits {
    std::size_t max_documents{20000};
    // 이전 게시본과 신규 build가 공존하는 비용은 호출자가 별도로 제한한다.
    std::size_t max_bytes{96ULL * 1024 * 1024};
};
struct VisualSearchQuery {
    VisualEmbeddingContract contract;
    std::vector<float> embedding;
    std::vector<std::string> channels;
    std::optional<std::int64_t> start_utc_ns, end_utc_ns;
    std::size_t top_k{20};
    double threshold{0};
};
struct VisualSearchHit {
    std::size_t document_index{0};
    double score{0};
};
class VisualSearchIndex {
public:
    // 성공 시에만 output 교체. 중복 ID/계약/벡터/용량 오류에서 부분 게시하지 않는다.
    static bool Build(const VisualEmbeddingContract&, std::vector<VisualSearchDocument>,
        std::shared_ptr<const VisualSearchIndex>* output, std::string* error,
        VisualIndexLimits limits = {});
    // 호출자가 channels 전체를 먼저 권한 검사한다. eligible은 현재 원본 건강도/삭제를 검사하며
    // false인 문서는 top-k에 들어가지 않는다. 실패/예외에서 output은 불변이다.
    bool Search(const VisualSearchQuery&,
        const std::function<bool(const VisualSearchDocument&)>& eligible,
        std::vector<VisualSearchHit>* output, std::string* error) const;
    const std::vector<VisualSearchDocument>& documents() const { return documents_; }
    const VisualEmbeddingContract& contract() const { return contract_; }
    std::size_t logical_bytes() const { return logical_bytes_; }
private:
    VisualEmbeddingContract contract_;
    std::vector<VisualSearchDocument> documents_;
    std::size_t logical_bytes_{0};
};
} // namespace recording
