// 파일 용도: 유한 정규화 벡터 admission과 안정 ID 순서의 bounded exact top-k.
#include "recording/visual_search_index.h"
#include "analysis/siglip2_encoder.h"
#include <algorithm>
#include <cmath>
#include <queue>
#include <stdexcept>
#include <unordered_set>

namespace recording {
namespace {
bool Fail(std::string* error, const char* reason) { if (error) *error = reason; return false; }
bool Text(const std::string& s, bool required = true) {
    return (!required || !s.empty()) && s.size() <= 1024 &&
        std::none_of(s.begin(), s.end(), [](unsigned char c) { return c < 32 || c == 127; });
}
bool Hash(const std::string& s) {
    return s.size() == 64 && std::all_of(s.begin(), s.end(), [](char c) {
        return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'); });
}
bool Vector(const std::vector<float>& v, std::size_t dimensions) {
    if (v.size() != dimensions) return false;
    double norm = 0;
    for (float x : v) { if (!std::isfinite(x)) return false; norm += double(x) * x; }
    return std::isfinite(norm) && std::abs(norm - 1.0) <= 1e-4;
}
bool Add(std::size_t n, std::size_t* total, std::size_t limit) {
    if (*total > limit || n > limit - *total) return false;
    *total += n; return true;
}
} // namespace

VisualEmbeddingContract VisualEmbeddingContract::Siglip2() {
    using E = analysis::Siglip2Encoder;
    // 계약 ID는 축약 이름이 아니라 동일 공간을 결정하는 전체 고정 값이다.
    const std::string shared = std::string("siglip2/") + E::kModelRevision + "/" +
        E::kWeightsSha256 + "/" + E::kPreprocessVersion + "/fp32-l2-768-cosine-v1";
    const auto image = shared + "/image/" + E::kImageOnnxSha256;
    const auto text = shared + "/text/" + E::kTextOnnxSha256 + "/" + E::kTokenizerSha256;
    return {image, text, image + "+" + text, E::kEmbeddingDimension};
}
bool VisualEmbeddingContract::operator==(const VisualEmbeddingContract& c) const {
    return image_id == c.image_id && text_id == c.text_id && space_id == c.space_id && dimensions == c.dimensions;
}
bool VisualSearchIndex::Build(const VisualEmbeddingContract& contract,
    std::vector<VisualSearchDocument> docs, std::shared_ptr<const VisualSearchIndex>* output,
    std::string* error, VisualIndexLimits limits) {
    if (!output || !(contract == VisualEmbeddingContract::Siglip2())) return Fail(error, "visual-contract-mismatch");
    if (!limits.max_documents || !limits.max_bytes || docs.size() > limits.max_documents)
        return Fail(error, "visual-index-capacity");
    try {
        std::size_t bytes = sizeof(VisualSearchIndex);
        if (docs.capacity() > limits.max_bytes / sizeof(VisualSearchDocument) ||
            !Add(docs.capacity() * sizeof(VisualSearchDocument), &bytes, limits.max_bytes))
            return Fail(error, "visual-index-capacity");
        for (const auto* s : {&contract.image_id, &contract.text_id, &contract.space_id})
            if (!Add(s->capacity() + 1, &bytes, limits.max_bytes)) return Fail(error, "visual-index-capacity");
        std::unordered_set<std::string> ids;
        for (const auto& d : docs) {
            if (!Text(d.id) || !Text(d.channel_id) || !Text(d.segment_id) || !Text(d.event_id, false) ||
                !Hash(d.media_sha256) || !Hash(d.frame_sha256) || d.time_base_num <= 0 || d.time_base_den <= 0 ||
                (d.utc_ns && *d.utc_ns < 0) || !Vector(d.embedding, contract.dimensions))
                return Fail(error, "visual-invalid-document");
            // admission의 임시 ID set과 allocator 여유를 보수적으로 포함한다.
            if (!Add(256, &bytes, limits.max_bytes)) return Fail(error, "visual-index-capacity");
            for (const auto* s : {&d.id, &d.channel_id, &d.segment_id, &d.event_id, &d.media_sha256, &d.frame_sha256}) {
                if (s->capacity() > limits.max_bytes / 4 ||
                    !Add(4 * (s->capacity() + 1), &bytes, limits.max_bytes)) return Fail(error, "visual-index-capacity");
            }
            if (d.embedding.capacity() > limits.max_bytes / sizeof(float) ||
                !Add(d.embedding.capacity() * sizeof(float), &bytes, limits.max_bytes)) return Fail(error, "visual-index-capacity");
            if (!ids.insert(d.id).second) return Fail(error, "visual-duplicate-id");
        }
        std::sort(docs.begin(), docs.end(), [](const auto& a, const auto& b) { return a.id < b.id; });
        auto index = std::shared_ptr<VisualSearchIndex>(new VisualSearchIndex);
        index->contract_ = contract; index->documents_ = std::move(docs); index->logical_bytes_ = bytes;
        *output = std::move(index);
        if (error) error->clear();
        return true;
    } catch (const std::bad_alloc&) { return Fail(error, "visual-index-capacity"); }
      catch (const std::length_error&) { return Fail(error, "visual-index-capacity"); }
}
bool VisualSearchIndex::Search(const VisualSearchQuery& q,
    const std::function<bool(const VisualSearchDocument&)>& eligible,
    std::vector<VisualSearchHit>* output, std::string* error) const {
    if (!output || !eligible || !(q.contract == contract_)) return Fail(error, "visual-contract-mismatch");
    if (!Vector(q.embedding, contract_.dimensions) || q.channels.empty() || q.channels.size() > 32 ||
        !q.top_k || q.top_k > 200 || !std::isfinite(q.threshold) || q.threshold < -1 || q.threshold > 1 ||
        q.start_utc_ns.has_value() != q.end_utc_ns.has_value() ||
        (q.start_utc_ns && (*q.start_utc_ns < 0 || *q.start_utc_ns >= *q.end_utc_ns)))
        return Fail(error, "visual-invalid-query");
    for (const auto& c : q.channels) if (!Text(c)) return Fail(error, "visual-invalid-query");
    try {
        const auto better = [&](const VisualSearchHit& a, const VisualSearchHit& b) {
            return a.score != b.score ? a.score > b.score : documents_[a.document_index].id < documents_[b.document_index].id;
        };
        std::priority_queue<VisualSearchHit, std::vector<VisualSearchHit>, decltype(better)> heap(better);
        for (std::size_t i = 0; i < documents_.size(); ++i) {
            const auto& d = documents_[i];
            if (std::find(q.channels.begin(), q.channels.end(), d.channel_id) == q.channels.end() ||
                (q.start_utc_ns && (!d.utc_ns || *d.utc_ns < *q.start_utc_ns || *d.utc_ns >= *q.end_utc_ns))) continue;
            double score = 0;
            for (std::size_t j = 0; j < contract_.dimensions; ++j) score += double(q.embedding[j]) * d.embedding[j];
            score = std::clamp(score, -1.0, 1.0);
            if (score < q.threshold) continue;
            const VisualSearchHit hit{i, score};
            // 원본 유효성에서 탈락한 상위 후보가 정상 후보의 자리를 차지하지 않는다.
            if ((heap.size() < q.top_k || better(hit, heap.top())) && eligible(d)) {
                heap.push(hit);
                if (heap.size() > q.top_k) heap.pop();
            }
        }
        std::vector<VisualSearchHit> hits;
        hits.reserve(heap.size());
        while (!heap.empty()) { hits.push_back(heap.top()); heap.pop(); }
        std::sort(hits.begin(), hits.end(), better);
        *output = std::move(hits);
        if (error) error->clear();
        return true;
    } catch (const std::bad_alloc&) { return Fail(error, "visual-index-capacity"); }
      catch (const std::exception&) { return Fail(error, "visual-source-unavailable"); }
}
} // namespace recording
