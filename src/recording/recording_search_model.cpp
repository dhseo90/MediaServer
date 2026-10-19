// 파일 용도: 검색 값 검증·용량 admission·안정 정렬과 채널/ID 인덱스 구성.
#include "recording/recording_search_model.h"
#include "recording/recording_search_diagnostic.h"

#include <algorithm>
#include <new>
#include <limits>
#include <stdexcept>
#include <tuple>
#include <unordered_set>
#include <type_traits>

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

bool SameDocument(const SearchDocument& a,const SearchDocument& b) {
    const auto fields=[](const SearchDocument& d) {return std::tie(
        d.id,d.channel_id,d.kind,d.segment_id,d.source_id,d.store_id,d.media_epoch_id,
        d.playback_segment_id,d.playback_event_id,d.playback_job_id,d.observation_id,d.reference_id,
        d.analysis_namespace,d.stream_epoch_id,d.track_id,d.object,d.start_ns,d.end_ns,
        d.time_provenance,d.uncertainty_ns,d.media_pts,d.media_end_pts,d.time_base_num,d.time_base_den,
        d.event_ids,d.zone_ids,d.rule_ids,d.unavailable_reason);};
    if(fields(a)!=fields(b)||a.event_facts.size()!=b.event_facts.size())return false;
    for(std::size_t i=0;i<a.event_facts.size();++i) {
        const auto& x=a.event_facts[i];const auto& y=b.event_facts[i];
        if(std::tie(x.event_id,x.event_type,x.scenario_name)!=std::tie(y.event_id,y.event_type,y.scenario_name))return false;
    }
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
            if(documents().size()>(SIZE_MAX-sizeof(result))/(2*sizeof(std::size_t)))return Fail(error,"search-capacity-exceeded");
            auto charge=residency_->ReserveOwned(sizeof(result)+2*sizeof(std::size_t)*documents().size(),SearchModelResidency::Category::Matches);
            if(!charge)return Fail(error,"search-capacity-exceeded");
            result.memory=std::move(*charge);
        }
        const auto start=q.start_time_ms*1000000,end=q.end_time_ms*1000000;
        for (const auto& channel:q.channels) for (const auto position:Channel(channel)) {
            const auto& d=Document(position);
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
    return BuildOwnedImpl(std::move(documents),source_instance,revision,output,error,limits,nullptr);
}

bool RecordingSearchModel::BuildOwnedImpl(std::vector<SearchDocument>&& documents,
    const std::string& source_instance, std::uint64_t revision,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits,
    const RecordingSearchModel* base) {
#ifdef RECORDING_SEARCH_TESTING
    search_order_work_test={};
#endif
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
        // No authority or document work is skipped: only reuse the order of
        // fully equal prior documents in this newly authenticated capture.
        const auto append_order=[&]() -> bool {
            if(!base||base->source_instance_!=source_instance||base->revision_>=revision||
               base->documents().empty()||base->documents().size()>=model->documents_.size())return false;
            auto& current=model->documents_;
            const auto n=current.size(),old=base->documents().size();
            if(n>SIZE_MAX/(2*sizeof(std::size_t)))return false;
            const auto scratch_bytes=2*n*sizeof(std::size_t);
            if(scratch_bytes>limits.max_bytes)return false;
            try {
                std::shared_ptr<void> scratch;
                if(limits.residency) {
                    const auto used=limits.residency->used();
                    if(used>limits.residency->limit()||scratch_bytes>limits.residency->limit()-used)return false;
                    scratch=limits.residency->Reserve(scratch_bytes,SearchModelResidency::Category::Preparation);
                    if(!scratch)return false;
                }
                std::vector<std::size_t> positions(old,SIZE_MAX),added,target(n);
                added.reserve(n-old);
                if(positions.capacity()>old||added.capacity()>n-old||target.capacity()>n)return false;
                for(std::size_t i=0;i<n;++i) {
                    const auto& d=current[i];if(d.kind!=SearchDocumentKind::Recording)return false;
                    const auto found=base->ids_.find(d.id);
                    if(found==base->ids_.end()) {
                        if(added.size()==n-old)return false;
                        added.push_back(i);
                    } else {
                        const auto at=found->second;
                        if(at>=old||positions[at]!=SIZE_MAX||!SameDocument(d,base->Document(at)))return false;
                        positions[at]=i;
                    }
                }
                if(added.size()!=n-old||std::find(positions.begin(),positions.end(),SIZE_MAX)!=positions.end())return false;
                std::sort(added.begin(),added.end(),[&](auto a,auto b){return Earlier(current[a],current[b]);});
                std::size_t a=0,b=0;
                for(std::size_t to=0;to<n;++to) {
                    const auto from=(a<old&&(b==added.size()||!Earlier(current[added[b]],current[positions[a]])))
                        ?positions[a++]:added[b++];
                    target[from]=to;
                }
                // target is a complete permutation of the current vector. All
                // allocations/proofs precede this nonthrowing commit; base and
                // snapshots remain untouched. Scratch dies before index build.
                static_assert(std::is_nothrow_swappable_v<SearchDocument>);
                for(std::size_t i=0;i<n;++i)while(target[i]!=i) {
                    const auto to=target[i];std::swap(current[i],current[to]);std::swap(target[i],target[to]);
                }
#ifdef RECORDING_SEARCH_TESTING
                search_order_work_test={0,n-old,n};
#endif
                return true;
            } catch(const std::bad_alloc&) {return false;}
              catch(const std::length_error&) {return false;}
        };
        if(!append_order()) {
#ifdef RECORDING_SEARCH_TESTING
            search_order_work_test={model->documents_.size(),0,0};
#endif
            std::sort(model->documents_.begin(), model->documents_.end(), Earlier);
        }
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

bool RecordingSearchModel::BuildOwnedAppend(std::vector<SearchDocument>&& documents,
    const RecordingSearchModel& base, const std::string& source_instance, std::uint64_t revision,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits) {
    return BuildOwnedImpl(std::move(documents),source_instance,revision,output,error,limits,&base);
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
        for (const auto& d : base.documents()) if (!changed.count(d.id)) ++count;
        if (count > limits.max_documents) return Fail(error, "search-capacity-exceeded");
        // 원본/새 사본과 delta workspace를 합산해, 삭제/갱신 중에도 같은 admission을 지킨다.
        std::size_t bytes = change_bytes;
        if (!Add(base.accounted_bytes_, &bytes, limits.max_bytes))
            return Fail(error, "search-capacity-exceeded");
        std::vector<SearchDocument> merged;
        merged.reserve(count);
        for (const auto& d : base.documents()) if (!changed.count(d.id)) merged.push_back(d);
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
    return found == ids_.end() ? nullptr : &Document(found->second);
}
} // namespace recording

namespace recording {
std::optional<std::size_t> RecordingSearchModel::FindPosition(const std::string& id)const {
    const auto it=ids_.find(id);return it==ids_.end()?std::nullopt:std::optional<std::size_t>(it->second);
}
// Only an unpublished, exclusively owned source model is promoted. Its existing
// payload reservation is transferred, never copied; indices keep their own lease.
void RecordingSearchModel::PromoteSourceStorage(SearchModelLimits limits) noexcept {
    if(!residency_||!residency_lease_||documents_.empty()||!shared_documents_.empty())return;
    try {
        const auto n=documents_.size();
        if(n>SIZE_MAX/sizeof(std::shared_ptr<const SearchDocument>))return;
        const auto refs=n*sizeof(std::shared_ptr<const SearchDocument>);
        constexpr std::size_t control=sizeof(DocumentBlock)+128;
        if(refs>SIZE_MAX-control||accounted_bytes_>limits.max_bytes||refs+control>limits.max_bytes-accounted_bytes_)return;
        const auto extra=refs+control;
        if(residency_->used()>residency_->limit()||extra>residency_->limit()-residency_->used())return;
        auto charge=residency_->ReserveOwned(extra,SearchModelResidency::Category::Model);if(!charge)return;
        auto block=std::make_shared<DocumentBlock>();
        std::vector<std::shared_ptr<const SearchDocument>> handles;handles.reserve(n);
        if(handles.capacity()!=n)return;
        std::size_t payload=(documents_.capacity()-n)*sizeof(SearchDocument);
        for(const auto& d:documents_){if(!AccountOwned(d,&payload,SIZE_MAX))return;handles.emplace_back(block,&d);}
        auto original=std::static_pointer_cast<SearchModelResidency::Reservation>(residency_lease_);
        if(payload>original->bytes())return;
        // Two reservations, each owning a distinct allocation, move into block.
        block->memory=original->Split(payload);
        block->overhead=charge->Split(control);
        block->documents=std::move(documents_);
        shared_documents_=std::move(handles);shared_index_memory_=std::move(*charge);
        // Snapshot pool admission remains the full logical model charge. The
        // optional handle/control allocation is additionally charged physically.
    }catch(...){} // Optional representation; the original model remains valid.
}

bool RecordingSearchModel::BuildShared(std::vector<SearchDocument>& added,
    std::vector<std::shared_ptr<const SearchDocument>>& reused,const RecordingSearchModel* base,
    const std::string& instance,std::uint64_t revision,std::shared_ptr<const RecordingSearchModel>* output,
    std::string* error,SearchModelLimits limits) {
    const auto optional=[&]() -> std::shared_ptr<const RecordingSearchModel> {
#ifdef RECORDING_SEARCH_TESTING
        if(search_projection_build_refused_test)return {};
#endif
        if(!limits.residency||reused.empty()||!base||base->residency()!=limits.residency||base->source_instance()!=instance)return {};
        if(added.size()>limits.max_documents||reused.size()>limits.max_documents-added.size())return {};
        const auto count=added.size()+reused.size();
        std::size_t logical=sizeof(RecordingSearchModel)+instance.size(),old_payload=0,new_payload=0;
        const auto account=[&](const SearchDocument& d){return
            d.id.capacity()<=SIZE_MAX/2-1&&d.channel_id.capacity()<=SIZE_MAX/2-1&&
            Add(256,&logical,limits.max_bytes)&&Add(2*(d.id.capacity()+1),&logical,limits.max_bytes)&&
            Add(2*(d.channel_id.capacity()+1),&logical,limits.max_bytes)&&AccountOwned(d,&logical,limits.max_bytes);};
        for(const auto& d:reused)if(!d||!account(*d)||!AccountOwned(*d,&old_payload,SIZE_MAX))return {};
        for(const auto& d:added)if(!Valid(d)||!account(d)||!AccountOwned(d,&new_payload,SIZE_MAX))return {};
        const auto slack=(added.capacity()-added.size())*sizeof(SearchDocument);
        if(!Add(slack,&logical,limits.max_bytes)||!Add(slack,&new_payload,SIZE_MAX))return {};
        constexpr std::size_t control=sizeof(DocumentBlock)+128;
        if(count>SIZE_MAX/sizeof(std::shared_ptr<const SearchDocument>))return {};
        const auto ref_bytes=count*sizeof(std::shared_ptr<const SearchDocument>);
        const auto overhead=2*ref_bytes+control;
        // Preserve strict admission and fall back before consuming input whenever
        // sharing's metadata cannot fit the same envelope.
        if(logical>limits.max_bytes||overhead>limits.max_bytes-logical||old_payload<overhead)return {};
        const auto physical=logical-old_payload+overhead;
        if(limits.residency->used()>limits.residency->limit()||physical>limits.residency->limit()-limits.residency->used())return {};
        auto ticket=limits.residency->ReserveOwned(physical,SearchModelResidency::Category::Model);if(!ticket)return {};
        auto block=std::make_shared<DocumentBlock>();
        auto model=memory_diagnostic::Enabled()?std::shared_ptr<RecordingSearchModel>(new RecordingSearchModel,[](auto* v){
            const auto id=memory_diagnostic::RetireModelKey(v);delete v;memory_diagnostic::DestroyModel(id);
        }):std::make_shared<RecordingSearchModel>();
        model->shared_documents_.reserve(count);if(model->shared_documents_.capacity()!=count)return {};
        auto workspace=ticket->Split(ref_bytes);
        auto& refs=model->shared_documents_;refs.resize(count);
        const auto old_count=base->documents().size();std::size_t old_seen=0,next=old_count;
        bool append=old_count<=count;
        const auto place=[&](std::shared_ptr<const SearchDocument> d) {
            const auto position=base->FindPosition(d->id);
            if(position){if(*position>=count||refs[*position]||!SameDocument(*d,base->Document(*position)))return false;
                refs[*position]=std::move(d);++old_seen;return true;}
            if(next>=count)return false;refs[next++]=std::move(d);return true;
        };
        if(append)for(const auto& d:reused)if(!place(d)){append=false;break;}
        if(append)for(const auto& d:added)if(!place(std::shared_ptr<const SearchDocument>(block,&d))){append=false;break;}
        append=append&&old_seen==old_count&&next==count;
        const auto earlier=[](const auto& a,const auto& b){return Earlier(*a,*b);};
        if(append) {
            std::sort(refs.begin()+old_count,refs.end(),earlier);
            std::vector<std::shared_ptr<const SearchDocument>> merged;merged.reserve(count);
            if(merged.capacity()!=count)return {};
            std::merge(refs.begin(),refs.begin()+old_count,refs.begin()+old_count,refs.end(),std::back_inserter(merged),earlier);
            refs.swap(merged);
        } else {
            refs.clear();for(const auto& d:reused)refs.push_back(d);
            for(const auto& d:added)refs.emplace_back(block,&d);
            std::sort(refs.begin(),refs.end(),earlier);
        }
#ifdef RECORDING_SEARCH_TESTING
        search_order_work_test=append?std::array<std::size_t,3>{0,count-old_count,count}:std::array<std::size_t,3>{count,0,0};
#endif
        for(std::size_t i=0;i<count;++i){const auto& d=*refs[i];
            if(!model->ids_.emplace(d.id,i).second)return {};
            model->channels_[d.channel_id].push_back(i);
        }
        model->source_instance_=instance;model->revision_=revision;model->accounted_bytes_=logical;
        model->residency_=limits.residency;
        block->memory=ticket->Split(new_payload);block->overhead=ticket->Split(control);
        model->shared_index_memory_=std::move(*ticket);
        block->documents=std::move(added); // commit after every throwing preparation
        memory_diagnostic::CreateModel(logical,count,revision,model.get());
        return model;
    };
    try {if(auto model=optional()){*output=std::move(model);if(error)error->clear();return true;}}
    catch(const std::bad_alloc&){}catch(const std::length_error&){}
    // Optional failure leaves both inputs intact. The reader releases every
    // optional owner before a single strict recapture; no uncharged deep-copy
    // fallback and no optional reservation can displace the strict builder.
    return false;
}
} // namespace recording
