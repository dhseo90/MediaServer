// 파일 용도: 검색 값 검증·용량 admission·안정 정렬과 채널/ID 인덱스 구성.
#include "recording/recording_search_model.h"

#include <algorithm>
#include <new>
#include <stdexcept>
#include <tuple>
#include <unordered_set>

namespace recording {
namespace {
bool Fail(std::string* error, const char* reason) {
    if (error) *error = reason;
    return false;
}

bool Text(const std::string& value, bool required = false) {
    return (!required || !value.empty()) && value.size() <= 4096 &&
        std::none_of(value.begin(), value.end(), [](unsigned char ch) { return ch < 0x20 || ch == 0x7f; });
}

bool Valid(const SearchDocument& d) {
    if (!Text(d.id, true) || !Text(d.channel_id, true) ||
        (d.kind != SearchDocumentKind::Recording && d.kind != SearchDocumentKind::Observation)) return false;
    if (d.start_ns.has_value() != d.end_ns.has_value() ||
        (d.start_ns && (*d.start_ns < 0 || *d.start_ns >= *d.end_ns)) ||
        (d.uncertainty_ns && *d.uncertainty_ns < 0) || d.time_base_num <= 0 || d.time_base_den <= 0) return false;
    if (d.kind == SearchDocumentKind::Recording && d.segment_id.empty()) return false;
    if (d.kind == SearchDocumentKind::Observation && d.observation_id.empty()) return false;
    for (const auto* field : {&d.segment_id, &d.observation_id, &d.reference_id, &d.analysis_namespace,
            &d.stream_epoch_id, &d.track_id, &d.object, &d.time_provenance, &d.unavailable_reason})
        if (!Text(*field)) return false;
    for (const auto* values : {&d.event_ids, &d.zone_ids, &d.rule_ids}) {
        if (values->size() > 64) return false;
        for (const auto& value : *values) if (!Text(value, true)) return false;
    }
    if (d.event_facts.size() > 64) return false;
    for (std::size_t i = 0; i < d.event_facts.size(); ++i) {
        const auto& fact = d.event_facts[i];
        if (!Text(fact.event_id, true) || !Text(fact.event_type) || !Text(fact.scenario_name) ||
            std::find(d.event_ids.begin(), d.event_ids.end(), fact.event_id) == d.event_ids.end()) return false;
        for (std::size_t j = 0; j < i; ++j)
            if (d.event_facts[j].event_id == fact.event_id) return false;
    }
    return true;
}

// 잠재적으로 큰 vector capacity도 포함한다. overflow 없이 한도 안에서만 누적한다.
bool Add(std::size_t value, std::size_t* total, std::size_t limit) {
    if (*total > limit || value > limit - *total) return false;
    *total += value;
    return true;
}

bool Account(const SearchDocument& d, std::size_t* total, std::size_t limit) {
    // 입력/게시 중 사본, map node/bucket/key, vector 여유를 보수적으로 계상한다.
    if (!Add(2 * sizeof(SearchDocument) + 256, total, limit)) return false;
    const auto text = [&](const std::string& s) {
        if (limit < 4 || s.capacity() > (limit - 4) / 4) return false;
        return Add(4 * (s.capacity() + 1), total, limit);
    };
    for (const auto* field : {&d.id, &d.channel_id, &d.segment_id, &d.observation_id, &d.reference_id,
            &d.analysis_namespace, &d.stream_epoch_id, &d.track_id, &d.object,
            &d.time_provenance, &d.unavailable_reason}) if (!text(*field)) return false;
    for (const auto* values : {&d.event_ids, &d.zone_ids, &d.rule_ids}) {
        if (values->capacity() > limit / (2 * sizeof(std::string)) ||
            !Add(2 * values->capacity() * sizeof(std::string), total, limit)) return false;
        for (const auto& value : *values) if (!text(value)) return false;
    }
    if (d.event_facts.capacity() > limit / (2 * sizeof(SearchEventFact)) ||
        !Add(2 * d.event_facts.capacity() * sizeof(SearchEventFact), total, limit)) return false;
    for (const auto& fact : d.event_facts)
        if (!text(fact.event_id) || !text(fact.event_type) || !text(fact.scenario_name)) return false;
    return true;
}

bool Earlier(const SearchDocument& a, const SearchDocument& b) {
    if (a.start_ns.has_value() != b.start_ns.has_value()) return a.start_ns.has_value();
    if (a.start_ns != b.start_ns) return a.start_ns > b.start_ns;
    return std::tie(a.channel_id, a.id) < std::tie(b.channel_id, b.id);
}
} // namespace

bool AccountSearchDocument(const SearchDocument& d, std::size_t* bytes, std::size_t limit) {
    return bytes && Valid(d) && Account(d, bytes, limit);
}

bool RecordingSearchModel::Build(const std::vector<SearchDocument>& documents,
    const std::string& source_instance, std::uint64_t revision,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits) {
    if (!output || !Text(source_instance, true)) return Fail(error, "search-invalid-source");
    if (documents.size() > limits.max_documents) return Fail(error, "search-capacity-exceeded");
    std::size_t bytes = sizeof(RecordingSearchModel);
    if (source_instance.size() > limits.max_bytes ||
        !Add(source_instance.size(), &bytes, limits.max_bytes)) return Fail(error, "search-capacity-exceeded");
    const auto unused = documents.capacity() - documents.size();
    if (unused > limits.max_bytes / sizeof(SearchDocument) ||
        !Add(unused * sizeof(SearchDocument), &bytes, limits.max_bytes))
        return Fail(error, "search-capacity-exceeded");
    for (const auto& d : documents) {
        if (!Valid(d)) return Fail(error, "search-invalid-document");
        if (!Account(d, &bytes, limits.max_bytes)) return Fail(error, "search-capacity-exceeded");
    }
    try {
        auto model = std::make_shared<RecordingSearchModel>();
        model->source_instance_ = source_instance;
        model->revision_ = revision;
        model->accounted_bytes_ = bytes;
        model->documents_ = documents;
        for (auto& d : model->documents_) {
            for (auto* values : {&d.event_ids, &d.zone_ids, &d.rule_ids}) {
                std::sort(values->begin(), values->end());
                values->erase(std::unique(values->begin(), values->end()), values->end());
            }
            std::sort(d.event_facts.begin(), d.event_facts.end(), [](const auto& a, const auto& b) {
                return a.event_id < b.event_id;
            });
        }
        std::sort(model->documents_.begin(), model->documents_.end(), Earlier);
        for (std::size_t i = 0; i < model->documents_.size(); ++i) {
            const auto& d = model->documents_[i];
            if (!model->ids_.emplace(d.id, i).second) return Fail(error, "search-duplicate-id");
            model->channels_[d.channel_id].push_back(i);
        }
        *output = std::move(model);
        if (error) error->clear();
        return true;
    } catch (const std::bad_alloc&) {
        return Fail(error, "search-capacity-exceeded");
    } catch (const std::length_error&) {
        return Fail(error, "search-capacity-exceeded");
    }
}

const std::vector<std::size_t>& RecordingSearchModel::Channel(const std::string& channel_id) const {
    static const std::vector<std::size_t> empty;
    const auto found = channels_.find(channel_id);
    return found == channels_.end() ? empty : found->second;
}

bool RecordingSearchModel::ApplyDelta(const RecordingSearchModel& base, const SearchModelDelta& delta,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits) {
    if (!output || delta.source_instance != base.source_instance_ ||
        delta.previous_revision != base.revision_ || delta.revision <= delta.previous_revision)
        return Fail(error, "search-delta-rebuild-required");
    if (delta.upserts.size() > limits.max_documents || delta.removed_ids.size() > limits.max_documents)
        return Fail(error, "search-capacity-exceeded");
    try {
        std::unordered_set<std::string> changed;
        std::size_t change_bytes = 0;
        for (const auto& id : delta.removed_ids) {
            if (!Text(id, true) || !changed.insert(id).second) return Fail(error, "search-invalid-delta");
            if (!Add(128 + id.size() * 2, &change_bytes, limits.max_bytes))
                return Fail(error, "search-capacity-exceeded");
        }
        for (const auto& d : delta.upserts) {
            if (!Valid(d) || !changed.insert(d.id).second) return Fail(error, "search-invalid-delta");
            if (!Account(d, &change_bytes, limits.max_bytes)) return Fail(error, "search-capacity-exceeded");
        }
        std::size_t count = delta.upserts.size();
        for (const auto& d : base.documents_) if (!changed.count(d.id)) ++count;
        if (count > limits.max_documents) return Fail(error, "search-capacity-exceeded");
        // 원본/새 사본과 delta workspace를 합산해, 삭제/갱신 중에도 같은 admission을 지킨다.
        std::size_t bytes = change_bytes;
        if (!Add(base.accounted_bytes_, &bytes, limits.max_bytes))
            return Fail(error, "search-capacity-exceeded");
        std::vector<SearchDocument> merged;
        merged.reserve(count);
        for (const auto& d : base.documents_) if (!changed.count(d.id)) merged.push_back(d);
        merged.insert(merged.end(), delta.upserts.begin(), delta.upserts.end());
        return Build(merged, delta.source_instance, delta.revision, output, error,
                     {limits.max_documents, limits.max_bytes - change_bytes});
    } catch (const std::bad_alloc&) {
        return Fail(error, "search-capacity-exceeded");
    } catch (const std::length_error&) {
        return Fail(error, "search-capacity-exceeded");
    }
}

const SearchDocument* RecordingSearchModel::Find(const std::string& id) const {
    const auto found = ids_.find(id);
    return found == ids_.end() ? nullptr : &documents_[found->second];
}
} // namespace recording
