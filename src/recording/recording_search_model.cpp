// 파일 용도: 검색 값 검증·용량 admission·안정 정렬과 채널/ID 인덱스 구성.
#include "recording/recording_search_model.h"
#include "recording/recording_search_diagnostic.h"

#include <algorithm>
#include <new>
#include <limits>
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
            &d.stream_epoch_id, &d.track_id, &d.object, &d.time_provenance, &d.unavailable_reason, &d.source_id, &d.store_id, &d.media_epoch_id,
            &d.playback_segment_id, &d.playback_event_id, &d.playback_job_id})
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
    if (*total > limit || value > limit - *total) {SearchCapacityReject("bytes-add",*total,value);return false;}
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
            &d.time_provenance, &d.unavailable_reason, &d.source_id, &d.store_id, &d.media_epoch_id,
            &d.playback_segment_id, &d.playback_event_id, &d.playback_job_id}) if (!text(*field)) return false;
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

// 같은 DTO를 두 번 소유하는 Build와 달리 준비 vector 자체를 이전하는 경로다.
// SSO 문자열도 capacity+1로 보수적으로 포함한다. 공유/외부 비용을 할인하지 않는다.
bool AccountOwned(const SearchDocument& d,std::size_t* total,std::size_t limit) {
    if(!Add(sizeof(SearchDocument),total,limit))return false;
    const auto text=[&](const std::string& v){return v.capacity()!=SIZE_MAX&&Add(v.capacity()+1,total,limit);};
    for(const auto* v:{&d.id,&d.channel_id,&d.segment_id,&d.source_id,&d.store_id,&d.media_epoch_id,
        &d.playback_segment_id,&d.playback_event_id,&d.playback_job_id,&d.observation_id,&d.reference_id,
        &d.analysis_namespace,&d.stream_epoch_id,&d.track_id,&d.object,&d.time_provenance,&d.unavailable_reason})
        if(!text(*v))return false;
    for(const auto* list:{&d.event_ids,&d.zone_ids,&d.rule_ids}) {
        if(list->capacity()>limit/sizeof(std::string)||!Add(list->capacity()*sizeof(std::string),total,limit))return false;
        for(const auto& v:*list)if(!text(v))return false;
    }
    if(d.event_facts.capacity()>limit/sizeof(SearchEventFact)||!Add(d.event_facts.capacity()*sizeof(SearchEventFact),total,limit))return false;
    for(const auto& f:d.event_facts)if(!text(f.event_id)||!text(f.event_type)||!text(f.scenario_name))return false;
    return true;
}

bool Earlier(const SearchDocument& a, const SearchDocument& b) {
    if (a.start_ns.has_value() != b.start_ns.has_value()) return a.start_ns.has_value();
    if (a.start_ns != b.start_ns) return a.start_ns > b.start_ns;
    return std::tie(a.channel_id, a.id) < std::tie(b.channel_id, b.id);
}
} // namespace

bool NormalizeSearchQuery(const RecordingSearchQuery& input, RecordingSearchQuery* output, std::string* error) {
    if (!output || input.channels.empty() || input.start_time_ms < 0 ||
        input.end_time_ms <= input.start_time_ms ||
        input.end_time_ms > std::numeric_limits<std::int64_t>::max() / 1000000 ||
        input.end_time_ms - input.start_time_ms > 31LL * 86400000 || !input.limit || input.limit > 200)
        return Fail(error, "search-invalid-query");
    for (const auto* list : {&input.channels, &input.objects, &input.tracks, &input.events,
            &input.zones, &input.rules, &input.behaviours}) {
        if (list->size() > 32) return Fail(error, "search-invalid-query");
        for (const auto& value : *list) if (!Text(value, true)) return Fail(error, "search-invalid-query");
    }
    for (const auto& value : input.behaviours) {
        const bool event = value.compare(0, 6, "event:") == 0 && value.size() > 6;
        const bool scenario = value.compare(0, 9, "scenario:") == 0 && value.size() > 9;
        if (!event && !scenario) return Fail(error, "search-invalid-behaviour");
    }
    try {
        auto normalized = input;
        for (auto* list : {&normalized.channels, &normalized.objects, &normalized.tracks, &normalized.events,
                &normalized.zones, &normalized.rules, &normalized.behaviours}) {
            std::sort(list->begin(), list->end());list->erase(std::unique(list->begin(), list->end()), list->end());
        }
        *output = std::move(normalized);if(error)error->clear();return true;
    } catch (const std::bad_alloc&) {return Fail(error, "search-capacity-exceeded");}
      catch (const std::length_error&) {return Fail(error, "search-capacity-exceeded");}
}

bool RecordingSearchModel::Query(const RecordingSearchQuery& input, RecordingSearchMatches* output,
    std::string* error) const {
    return QueryImpl(input,output,error,false);
}

bool RecordingSearchModel::BehaviourCandidates(const RecordingSearchQuery& input, RecordingSearchMatches* output,
    std::string* error) const {
    return QueryImpl(input,output,error,true);
}

bool RecordingSearchModel::QueryImpl(const RecordingSearchQuery& input, RecordingSearchMatches* output,
    std::string* error, bool skip_behaviour) const {
    if (!output) return Fail(error, "search-invalid-output");
    RecordingSearchQuery q;if(!NormalizeSearchQuery(input,&q,error))return false;
    const bool metadata = !q.objects.empty() || !q.tracks.empty() || !q.events.empty() ||
        !q.zones.empty() || !q.rules.empty() || !q.behaviours.empty();
    const auto scalar = [](const auto& values, const std::string& value) {
        return values.empty() || std::binary_search(values.begin(), values.end(), value);
    };
    const auto overlap = [&](const auto& query, const auto& values) {
        return query.empty() || std::any_of(values.begin(),values.end(),[&](const auto& value){return scalar(query,value);});
    };
    try {
        RecordingSearchMatches result;
        if(residency_) {
            if(documents_.size()>(SIZE_MAX-sizeof(result))/(2*sizeof(std::size_t)))return Fail(error,"search-capacity-exceeded");
            auto charge=residency_->ReserveOwned(sizeof(result)+2*sizeof(std::size_t)*documents_.size(),SearchModelResidency::Category::Matches);
            if(!charge)return Fail(error,"search-capacity-exceeded");
            result.memory=std::move(*charge);
        }
        const auto start=q.start_time_ms*1000000,end=q.end_time_ms*1000000;
        for (const auto& channel:q.channels) for (const auto position:Channel(channel)) {
            const auto& d=documents_[position];
            if ((d.kind==SearchDocumentKind::Observation)!=metadata)continue;
            if (d.start_ns ? (*d.start_ns>=end || *d.end_ns<=start) : !q.include_unplaced)continue;
            if (!scalar(q.objects,d.object)||!scalar(q.tracks,d.track_id)||!overlap(q.zones,d.zone_ids)||
                !overlap(q.rules,d.rule_ids)||!overlap(q.events,d.event_ids))continue;
            if (!skip_behaviour && !q.behaviours.empty()) {
                const bool matched=std::any_of(d.event_facts.begin(),d.event_facts.end(),[&](const auto& fact){
                    // event+behaviour는 동일한 연결 이벤트에서 동시에 성립해야 한다.
                    return scalar(q.events,fact.event_id) &&
                        ((!fact.event_type.empty()&&scalar(q.behaviours,"event:"+fact.event_type)) ||
                         (!fact.scenario_name.empty()&&scalar(q.behaviours,"scenario:"+fact.scenario_name)));
                });
                if(!matched) {
                    // 알려진 일치가 없을 때만, 결과를 바꿀 수 있는 동일 이벤트의 누락을 검사한다.
                    const bool incomplete=std::any_of(d.event_ids.begin(),d.event_ids.end(),[&](const auto& id){
                        return scalar(q.events,id) && std::none_of(d.event_facts.begin(),d.event_facts.end(),
                            [&](const auto& fact){return fact.event_id==id;});
                    });
                    if(incomplete)return Fail(error,"search-event-evidence-incomplete");
                    continue;
                }
            }
            result.positions.push_back(position);
            if(d.start_ns)++result.known_count;else ++result.unplaced_count;
        }
        std::sort(result.positions.begin(),result.positions.end());
        *output=std::move(result);if(error)error->clear();return true;
    } catch (const std::bad_alloc&) {return Fail(error, "search-capacity-exceeded");}
      catch (const std::length_error&) {return Fail(error, "search-capacity-exceeded");}
}

bool AccountSearchDocument(const SearchDocument& d, std::size_t* bytes, std::size_t limit) {
    return bytes && Valid(d) && Account(d, bytes, limit);
}

bool AccountOwnedSearchDocument(const SearchDocument& d,std::size_t* bytes,std::size_t limit) {
    return bytes&&Valid(d)&&AccountOwned(d,bytes,limit);
}

bool AppendOwnedSearchDocument(std::vector<SearchDocument>* documents,SearchDocument&& document,
    std::size_t* bytes,SearchModelLimits limits) {
    search_capacity_diagnostic.documents=documents->size();
    search_capacity_diagnostic.capacity=documents->capacity();
    search_capacity_diagnostic.index=documents->size();
    if(documents->size()>=limits.max_documents) {
        SearchCapacityReject("document-count",documents->size(),1);return false;
    }
    auto next=*bytes;
    if(!AccountOwnedSearchDocument(document,&next,limits.max_bytes))return false;
    const auto required=documents->size()+1;
    const auto capacity=documents->capacity()<required?
        required+std::min({documents->capacity()?documents->capacity()-1:std::size_t{0},
            std::size_t{1023},limits.max_documents-required}):documents->capacity();
    const auto extra=capacity-required+(documents->capacity()<required?documents->capacity():0);
    if(next>limits.max_bytes||extra>(limits.max_bytes-next)/sizeof(SearchDocument)) {
        SearchCapacityReject("vector-relocation",next,extra>SIZE_MAX/sizeof(SearchDocument)?SIZE_MAX:extra*sizeof(SearchDocument));return false;
    }
    if(documents->capacity()<required)documents->reserve(capacity);
    if(documents->capacity()-required>(limits.max_bytes-next)/sizeof(SearchDocument)) {
        SearchCapacityReject("vector-capacity",next,(documents->capacity()-required)*sizeof(SearchDocument));return false;
    }
    documents->push_back(std::move(document));*bytes=next;return true;
}

bool RecordingSearchModel::Build(const std::vector<SearchDocument>& documents,
    const std::string& source_instance, std::uint64_t revision,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits) {
    if (!output || !Text(source_instance, true)) return Fail(error, "search-invalid-source");
    SearchCapacityBegin("model-build",limits.max_documents,limits.max_bytes,documents.size(),documents.capacity());
    if (documents.size() > limits.max_documents) {
        SearchCapacityReject("document-count",documents.size(),0);
        return Fail(error, "search-capacity-exceeded");
    }
    std::size_t bytes = sizeof(RecordingSearchModel);
    if (source_instance.size() > limits.max_bytes ||
        !Add(source_instance.size(), &bytes, limits.max_bytes)) return Fail(error, "search-capacity-exceeded");
    const auto unused = documents.capacity() - documents.size();
    if (unused > limits.max_bytes / sizeof(SearchDocument) ||
        !Add(unused * sizeof(SearchDocument), &bytes, limits.max_bytes))
        return Fail(error, "search-capacity-exceeded");
    for (const auto& d : documents) {
        search_capacity_diagnostic.index=static_cast<std::size_t>(&d-documents.data());
        if (!Valid(d)) return Fail(error, "search-invalid-document");
        if (!Account(d, &bytes, limits.max_bytes)) return Fail(error, "search-capacity-exceeded");
    }
    try {
        auto lease=limits.residency?limits.residency->Reserve(bytes,SearchModelResidency::Category::Model):std::shared_ptr<void>{};
        if(limits.residency&&!lease) {
            SearchCapacityReject("shared-reservation",0,bytes);
            return Fail(error,"search-capacity-exceeded");
        }
        auto model = memory_diagnostic::Enabled()
            ? std::shared_ptr<RecordingSearchModel>(new RecordingSearchModel,[](auto* value){
                const auto id=memory_diagnostic::RetireModelKey(value);delete value;memory_diagnostic::DestroyModel(id);
              }) : std::make_shared<RecordingSearchModel>();
        model->residency_=limits.residency;model->residency_lease_=std::move(lease);
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
        memory_diagnostic::CreateModel(model->accounted_bytes_,model->documents_.size(),model->revision_,model.get());
        *output = std::move(model);
        if (error) error->clear();
        return true;
    } catch (const std::bad_alloc&) {
        SearchCapacityReject("allocation-exception",0,0);
        return Fail(error, "search-capacity-exceeded");
    } catch (const std::length_error&) {
        SearchCapacityReject("length-exception",0,0);
        return Fail(error, "search-capacity-exceeded");
    }
}

bool RecordingSearchModel::BuildOwned(std::vector<SearchDocument>&& documents,
    const std::string& source_instance, std::uint64_t revision,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits) {
    if (!output || !Text(source_instance, true)) return Fail(error, "search-invalid-source");
    SearchCapacityBegin("model-build-owned",limits.max_documents,limits.max_bytes,documents.size(),documents.capacity());
    if (documents.size() > limits.max_documents) {
        SearchCapacityReject("document-count",documents.size(),0);
        return Fail(error, "search-capacity-exceeded");
    }
    std::size_t bytes = sizeof(RecordingSearchModel);
    if (source_instance.size() > limits.max_bytes ||
        !Add(source_instance.size(), &bytes, limits.max_bytes)) return Fail(error, "search-capacity-exceeded");
    const auto unused = documents.capacity() - documents.size();
    if (unused > limits.max_bytes / sizeof(SearchDocument) ||
        !Add(unused * sizeof(SearchDocument), &bytes, limits.max_bytes))
        return Fail(error, "search-capacity-exceeded");
    for (const auto& d : documents) {
        search_capacity_diagnostic.index=static_cast<std::size_t>(&d-documents.data());
        if (!Valid(d)) return Fail(error, "search-invalid-document");
        // ID node/key, channel node/key, bucket arrays and per-channel positions.
        // 256 includes two node/control envelopes and four pointer/index slots per document.
        if (d.id.capacity()>SIZE_MAX/2-1 || d.channel_id.capacity()>SIZE_MAX/2-1 ||
            !Add(256, &bytes, limits.max_bytes) ||
            !Add(2*(d.id.capacity()+1), &bytes, limits.max_bytes) ||
            !Add(2*(d.channel_id.capacity()+1), &bytes, limits.max_bytes) ||
            !AccountOwned(d, &bytes, limits.max_bytes)) return Fail(error, "search-capacity-exceeded");
    }
    try {
        auto lease=limits.residency?limits.residency->Reserve(bytes,SearchModelResidency::Category::Model):std::shared_ptr<void>{};
        if(limits.residency&&!lease) {
            SearchCapacityReject("shared-reservation",0,bytes);
            return Fail(error,"search-capacity-exceeded");
        }
        auto model = memory_diagnostic::Enabled()
            ? std::shared_ptr<RecordingSearchModel>(new RecordingSearchModel,[](auto* value){
                const auto id=memory_diagnostic::RetireModelKey(value);delete value;memory_diagnostic::DestroyModel(id);
              }) : std::make_shared<RecordingSearchModel>();
        model->residency_=limits.residency;model->residency_lease_=std::move(lease);
        model->source_instance_ = source_instance;
        model->revision_ = revision;
        model->accounted_bytes_ = bytes;
        model->documents_ = std::move(documents);
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
        memory_diagnostic::CreateModel(model->accounted_bytes_,model->documents_.size(),model->revision_,model.get());
        *output = std::move(model);
        if (error) error->clear();
        return true;
    } catch (const std::bad_alloc&) {
        SearchCapacityReject("allocation-exception",0,0);
        return Fail(error, "search-capacity-exceeded");
    } catch (const std::length_error&) {
        SearchCapacityReject("length-exception",0,0);
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
    if(!limits.residency)limits.residency=base.residency_;
    try {
        auto workspace=limits.residency?limits.residency->Reserve(limits.max_bytes,SearchModelResidency::Category::Preparation):std::shared_ptr<void>{};
        if(limits.residency&&!workspace)return Fail(error,"search-capacity-exceeded");
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
        return BuildOwned(std::move(merged), delta.source_instance, delta.revision, output, error,
                     {limits.max_documents, limits.max_bytes - change_bytes,limits.residency});
    } catch (const std::bad_alloc&) {
        SearchCapacityReject("allocation-exception",0,0);
        return Fail(error, "search-capacity-exceeded");
    } catch (const std::length_error&) {
        SearchCapacityReject("length-exception",0,0);
        return Fail(error, "search-capacity-exceeded");
    }
}

const SearchDocument* RecordingSearchModel::Find(const std::string& id) const {
    const auto found = ids_.find(id);
    return found == ids_.end() ? nullptr : &documents_[found->second];
}
} // namespace recording
