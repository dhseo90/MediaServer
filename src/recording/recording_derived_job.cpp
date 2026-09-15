// 파일 용도: 내부 파생 job의 compact 선택·엄격 JSON 계약.
#include "recording/recording_derived_job.h"
#include "recording/recording_derived_selection.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <array>
#include <charconv>
#include <iomanip>
#include <map>
#include <set>
#include <sstream>
#include <stdexcept>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
namespace recording {
    namespace {
        constexpr std::size_t kCap=4*1024*1024;
        using Doc=ingress::StrictJsonObjectDocument;
        using Type=ingress::StrictJsonType;
        void Need(bool ok,const char* reason){
            if(!ok)throw std::runtime_error(reason);
        }
        std::string Q(const std::string& value){
            std::ostringstream out;
            out<<'"';
            for(unsigned char c:value){
                if(c=='"'||c=='\\')out<<'\\'<<c;
                else if(c<32)out<<"\\u"<<std::hex<<std::setw(4)<<std::setfill('0')<<static_cast<int>(c)<<std::dec;
                else out<<c;
            }
            out<<'"';
            return out.str();
        }
        Doc Obj(const std::string& json,std::initializer_list<const char*> keys){
            Doc d;
            Need(json.size()<=kCap&&ingress::ParseStrictJsonObjectDocument(json,&d,nullptr),"job-json-object");
            Need(d.members.size()==keys.size(),"job-json-fields");
            for(auto key:keys)Need(d.Find(key)!=nullptr,"job-json-missing-field");
            return d;
        }
        const ingress::StrictJsonMember& F(const Doc& d,const char* key,Type type){
            const auto* f=d.Find(key);
            Need(f&&f->type==type,"job-json-type");
            return *f;
        }
        std::string S(const Doc& d,const char* key){
            return F(d,key,Type::String).string_value;
        }
        std::string O(const Doc& d,const char* key){
            return F(d,key,Type::Object).raw;
        }
        bool B(const Doc& d,const char* key){
            return F(d,key,Type::Bool).bool_value;
        }
        template<class T=std::int64_t>T N(const Doc& d,const char* key){
            const auto& raw=F(d,key,Type::Number).raw;
            T v{};
            auto r=std::from_chars(raw.data(),raw.data()+raw.size(),v);
            Need(r.ec==std::errc{}
            &&r.ptr==raw.data()+raw.size(),"job-integer");
            return v;
        }
        std::optional<std::int64_t> ON(const Doc& d,const char* key){
            const auto* f=d.Find(key);
            Need(f!=nullptr,"job-nullable");
            return f->type==Type::Null?std::nullopt:std::optional<std::int64_t>(N(d,key));
        }
        std::string Num(std::optional<std::int64_t> n){
            return n?std::to_string(*n):"null";
        }
        std::vector<std::string> A(const Doc& d,const char* key,std::size_t cap){
            const auto& raw=F(d,key,Type::Array).raw;
            std::vector<std::string> out;
            std::size_t start=1;
            int depth=0;
            bool quote=false,escape=false;
            for(std::size_t i=1;
            i+1<raw.size();
            ++i){
                char c=raw[i];
                if(quote){
                    if(escape)escape=false;
                    else if(c=='\\')escape=true;
                    else if(c=='"')quote=false;
                    continue;
                }
                if(c=='"')quote=true;
                else if(c=='{'||c=='[')++depth;
                else if(c=='}'||c==']')--depth;
                else if(c==','&&!depth){
                    out.push_back(raw.substr(start,i-start));
                    start=i+1;
                    Need(out.size()<=cap,"job-array-cap");
                }
            }
            const auto tail=raw.substr(start,raw.size()-start-1);
            if(tail.find_first_not_of(" \r\n\t")!=std::string::npos)out.push_back(tail);
            Need(out.size()<=cap,"job-array-cap");
            return out;
        }
        std::string Arr(const std::vector<std::string>& items){
            std::string out="[";
            for(const auto& item:items){
                if(out.size()>1)out+=",";
                out+=item;
                Need(out.size()<=kCap,"job-json-cap");
            }
            return out+"]";
        }
        std::string Mapping(const RecordingUtcMappingV1& m){
            return Q(m.schema)+Q(m.mapping_id)+std::to_string(m.start_pts)+":"+Num(m.end_pts)+Q(m.provenance)+Num(m.utc_start_ns)+":"+Num(m.utc_end_ns)+":"+Num(m.uncertainty_ns)+Q(m.reason);
        }
        std::size_t MappingIndex(const RecordingSegmentV2& s,const RecordingUtcMappingV1& m){
            for(std::size_t i=0;
            i<s.mappings.size();
            ++i)if(Mapping(s.mappings[i])==Mapping(m))return i;
            throw std::runtime_error("job-mapping-not-in-source");
        }
        std::string Original(const std::optional<RecordingConsumerOriginalV1>& o){
            if(!o)return "null";
            return "{\"generation\":"+Q(o->source_generation)+",\"order\":"+std::to_string(o->generation_order)+",\"ordinal\":"+std::to_string(o->ordinal)+",\"track\":"+Q(o->track_id)+",\"pts\":"+std::to_string(o->pts_ns)+"}";
        }
        std::optional<RecordingConsumerOriginalV1> Original(const Doc& d,const RecordingConsumerReferenceV1& reference){
            const auto* m=d.Find("original");
            Need(m,"job-original-required");
            if(m->type==Type::Null)return {};
            const auto p=Obj(O(d,"original"),{
                "generation","order","ordinal","track","pts"
            }
            );
            RecordingConsumerOriginalV1 value{
                S(p,"generation"),N<std::uint64_t>(p,"order"),N<std::uint64_t>(p,"ordinal"),S(p,"track"),N<std::uint64_t>(p,"pts")
            };
            auto ref=reference;
            ref.association_quality="timestamp-match";
            ref.original=value;
            Need(ValidateRecordingConsumerReferenceV1(ref,nullptr),"job-original-invalid");
            return value;
        }
        std::string State(DerivedSliceState s){
            switch(s){
                case DerivedSliceState::Confirmed:return "confirmed";
                case DerivedSliceState::Unknown:return "unknown";
                case DerivedSliceState::Gap:return "gap";
                case DerivedSliceState::Deleted:return "deleted";
                case DerivedSliceState::Ambiguous:return "ambiguous";
                case DerivedSliceState::AwaitingPostRoll:return "awaiting-postroll";
            }
            throw std::runtime_error("job-slice-state");
        }
        DerivedSliceState State(const std::string& s){
            for(auto v:{
                DerivedSliceState::Confirmed,DerivedSliceState::Unknown,DerivedSliceState::Gap,DerivedSliceState::Deleted,DerivedSliceState::Ambiguous,DerivedSliceState::AwaitingPostRoll
            }
            )if(State(v)==s)return v;
            throw std::runtime_error("job-slice-state");
        }
        std::string Compact(const DerivedRecordingSelection& selection,const std::vector<DerivedSourceEvidence>& sources){
            Need(selection.slices.size()<=4096&&selection.unplaced.size()<=4096&&sources.size()<=256,"job-selection-cap");
            std::map<std::string,RecordingSegmentV2> table;
            std::map<std::string,const DerivedSourceEvidence*> available;
            for(const auto& s:sources)Need(available.emplace(s.segment.segment_id,&s).second,"job-source-duplicate");
            for(const auto& slice:selection.slices)for(const auto& c:slice.candidates){
                const auto r=table.emplace(c.segment.segment_id,c.segment);
                Need(SerializeRecordingSegmentV2(r.first->second)==SerializeRecordingSegmentV2(c.segment),"job-source-conflict");
                const auto supplied=available.find(c.segment.segment_id);
                if(supplied!=available.end())Need(SerializeRecordingSegmentV2(supplied->second->segment)==SerializeRecordingSegmentV2(c.segment),"job-source-conflict");
            }
            for(const auto& c:selection.unplaced){
                const auto found=available.find(c.segment_id);
                Need(found!=available.end(),"job-unplaced-source-missing");
                table.emplace(c.segment_id,found->second->segment);
            }
            Need(table.size()<=8,"job-source-table-cap");
            std::vector<std::string> segments,slices,unplaced;
            std::map<std::string,std::size_t> indices;
            for(const auto& [id,s]:table){
                Need(ValidateRecordingSegmentV2(s,nullptr),"job-source-invalid");
                indices[id]=segments.size();
                segments.push_back(SerializeRecordingSegmentV2(s));
            }
            for(const auto& s:selection.slices){
                std::vector<std::string> candidates;
                Need(s.candidates.size()<=8,"job-candidate-cap");
                for(const auto& c:s.candidates)candidates.push_back("{\"source\":"+std::to_string(indices.at(c.segment.segment_id))+",\"original\":"+Original(c.original)+",\"start\":"+std::to_string(c.media_start_pts)+",\"end\":"+std::to_string(c.media_end_pts)+",\"mapping\":"+(c.utc_mapping?std::to_string(MappingIndex(c.segment,*c.utc_mapping)):"null")+"}");
                slices.push_back("{\"start\":"+std::to_string(s.start_ns)+",\"end\":"+std::to_string(s.end_ns)+",\"state\":"+Q(State(s.state))+",\"reason\":"+Q(s.reason)+",\"candidates\":"+Arr(candidates)+"}");
            }
            for(const auto& c:selection.unplaced){
                const auto& s=table.at(c.segment_id);
                Need(c.store_id==s.store_id&&c.media_epoch_id==s.media_epoch_id&&c.order_sequence==s.order_sequence&&c.time_base_num==s.time_base_num&&c.time_base_den==s.time_base_den,"job-unplaced-conflict");
                unplaced.push_back("{\"source\":"+std::to_string(indices.at(c.segment_id))+",\"mapping\":"+std::to_string(MappingIndex(s,c.mapping))+",\"start\":"+Num(c.media_start_pts)+",\"end\":"+Num(c.media_end_pts)+",\"reason\":"+Q(c.reason)+"}");
            }
            return "{\"schema\":\"media-server.derived-selection-compact.v1\",\"start\":"+std::to_string(selection.expanded_start_ns)+",\"end\":"+std::to_string(selection.expanded_end_ns)+",\"complete\":"+(selection.complete?"true":"false")+",\"reason\":"+Q(selection.reason)+",\"segments\":"+Arr(segments)+",\"slices\":"+Arr(slices)+",\"unplaced\":"+Arr(unplaced)+"}";
        }
        DerivedRecordingSelection Restore(const DerivedJobIntentV1& job){
            const auto d=Obj(job.selection_json,{
                "schema","start","end","complete","reason","segments","slices","unplaced"
            }
            );
            Need(S(d,"schema")=="media-server.derived-selection-compact.v1","job-selection-schema");
            DerivedRecordingSelection result;
            result.reference=job.reference;
            result.expanded_start_ns=N(d,"start");
            result.expanded_end_ns=N(d,"end");
            result.complete=B(d,"complete");
            result.reason=S(d,"reason");
            Need(job.reference.request&&result.reason.size()<=1024,"job-selection-reference");
            const auto& r=*job.reference.request;
            Need(static_cast<__int128>(result.expanded_start_ns)==(static_cast<__int128>(r.start_ms)-r.pre_ms)*1000000&&static_cast<__int128>(result.expanded_end_ns)==(static_cast<__int128>(r.end_ms)+r.post_ms)*1000000&&result.expanded_start_ns<result.expanded_end_ns,"job-selection-request-range");
            std::vector<RecordingSegmentV2> segments;
            std::string previous;
            for(const auto& raw:A(d,"segments",8)){
                RecordingSegmentV2 s;
                Need(ParseRecordingSegmentV2(raw,&s,nullptr)&&SerializeRecordingSegmentV2(s)==raw&&s.segment_id>previous,"job-segment-table");
                previous=s.segment_id;
                Need(s.source_id==job.reference.source_id&&s.channel_id==job.reference.channel_id,"job-source-channel");
                segments.push_back(s);
            }
            auto cursor=result.expanded_start_ns;
            bool complete=true;
            for(const auto& raw:A(d,"slices",4096)){
                const auto d=Obj(raw,{
                    "start","end","state","reason","candidates"
                }
                );
                DerivedSelectionSlice s;
                s.start_ns=N(d,"start");
                s.end_ns=N(d,"end");
                s.state=State(S(d,"state"));
                s.reason=S(d,"reason");
                Need(s.start_ns==cursor&&s.start_ns<s.end_ns&&s.end_ns<=result.expanded_end_ns&&s.reason.size()<=1024,"job-slice-range");
                cursor=s.end_ns;
                for(const auto& raw:A(d,"candidates",8)){
                    const auto c=Obj(raw,{
                        "source","original","start","end","mapping"
                    }
                    );
                    const auto index=N<std::size_t>(c,"source");
                    Need(index<segments.size(),"job-source-index");
                    DerivedSelectionCandidate item;
                    item.segment=segments[index];
                    item.original=Original(c,job.reference);
                    item.media_start_pts=N(c,"start");
                    item.media_end_pts=N(c,"end");
                    Need(item.media_start_pts<item.media_end_pts&&item.media_start_pts>=item.segment.media_start_pts&&item.segment.media_end_pts&&item.media_end_pts<=*item.segment.media_end_pts,"job-candidate-range");
                    const auto mapping=ON(c,"mapping");
                    if(mapping){
                        Need(*mapping>=0&&static_cast<std::size_t>(*mapping)<item.segment.mappings.size(),"job-mapping-index");
                        item.utc_mapping=item.segment.mappings[*mapping];
                    }
                    s.candidates.push_back(std::move(item));
                }
                Need(s.state!=DerivedSliceState::Confirmed||s.candidates.size()==1,"job-confirmed-not-unique");
                complete&=s.state==DerivedSliceState::Confirmed;
                result.slices.push_back(std::move(s));
            }
            Need(!result.slices.empty()&&cursor==result.expanded_end_ns,"job-selection-incomplete-shape");
            for(const auto& raw:A(d,"unplaced",4096)){
                const auto c=Obj(raw,{
                    "source","mapping","start","end","reason"
                }
                );
                const auto index=N<std::size_t>(c,"source"),mapping=N<std::size_t>(c,"mapping");
                Need(index<segments.size()&&mapping<segments[index].mappings.size(),"job-unplaced-index");
                const auto& s=segments[index];
                RecordingRangeCandidate item;
                item.store_id=s.store_id;
                item.segment_id=s.segment_id;
                item.media_epoch_id=s.media_epoch_id;
                item.order_sequence=s.order_sequence;
                item.time_base_num=s.time_base_num;
                item.time_base_den=s.time_base_den;
                item.mapping=s.mappings[mapping];
                item.media_start_pts=ON(c,"start");
                item.media_end_pts=ON(c,"end");
                item.reason=S(c,"reason");
                Need(item.reason.size()<=1024,"job-reason-cap");
                result.unplaced.push_back(std::move(item));
            }
            Need(result.complete==(complete&&result.unplaced.empty()),"job-completeness-conflict");
            return result;
        }
        std::string Sources(const DerivedJobIntentV1& job){
            std::vector<std::string> rows;
            for(const auto& s:job.sources)rows.push_back("{\"segment\":"+SerializeRecordingSegmentV2(s.segment)+",\"binding\":"+SerializeRecordingSourceBindingV1(s.binding)+"}");
            return Arr(rows);
        }
        std::string Identity(const DerivedJobIntentV1& job){
            #if MEDIA_SERVER_USE_OPENSSL
            const auto logical="{\"profile\":"+Q(job.profile)+",\"reference\":"+SerializeRecordingConsumerReferenceV1(job.reference)+",\"selection\":"+job.selection_json+",\"sources\":"+Sources(job)+"}";
            std::array<unsigned char,EVP_MAX_MD_SIZE> bytes{};
            unsigned int size=0;
            Need(EVP_Digest(logical.data(),logical.size(),bytes.data(),&size,EVP_sha256(),nullptr)==1&&size==32,"job-sha256-failed");
            std::ostringstream out;
            out<<"dj-"<<std::hex<<std::setfill('0');
            for(unsigned int i=0;
            i<size;
            ++i)out<<std::setw(2)<<static_cast<int>(bytes[i]);
            return out.str();
            #else
            (void)job;
            throw std::runtime_error("job-crypto-unavailable");
            #endif
        }
        std::string Json(const DerivedJobIntentV1& job){
            std::vector<std::string> outputs;
            for(const auto& o:job.outputs)outputs.push_back("{\"source\":"+std::to_string(o.source_index)+",\"id\":"+Q(o.output_id)+",\"order\":"+Q(o.order_request_id)+",\"temporary\":"+Q(o.temporary_relpath)+",\"final\":"+Q(o.final_relpath)+"}");
            return "{\"schema\":"+Q(job.schema)+",\"job_id\":"+Q(job.job_id)+",\"attempt_id\":"+Q(job.attempt_id)+",\"protection_token\":"+Q(job.protection_token)+",\"profile\":"+Q(job.profile)+",\"reference\":"+SerializeRecordingConsumerReferenceV1(job.reference)+",\"selection\":"+job.selection_json+",\"sources\":"+Sources(job)+",\"outputs\":"+Arr(outputs)+",\"reserved_bytes\":"+std::to_string(job.reserved_bytes)+",\"created_at_ms\":"+std::to_string(job.created_at_ms)+"}";
        }
        DerivedRecordingSelection Validate(const DerivedJobIntentV1& job){
            Need(job.schema=="media-server.derived-job-intent.v1"&&job.profile=="h264-mp4-to-mpegts-video-only-v1","job-schema-profile");
            Need(job.reserved_bytes>0&&job.reserved_bytes<=256*1024*1024&&job.created_at_ms>0&&!job.sources.empty()&&job.sources.size()<=8&&job.outputs.size()==job.sources.size(),"job-resource-cap");
            Need(ValidateRecordingConsumerReferenceV1(job.reference,nullptr)&&job.reference.request,"job-reference-invalid");
            const auto selection=Restore(job);
            std::map<std::string,std::string> selected;
            for(const auto& s:selection.slices){
                Need(s.state!=DerivedSliceState::Ambiguous,"job-ambiguous-selection");
                if(s.state==DerivedSliceState::Confirmed){
                    const auto& segment=s.candidates[0].segment;
                    // Restore는 strict unique segment table에서만 candidate를 복사한다.
                    // 동일 ID의 canonical 검사는 slice 수와 무관하게 한 번이면 충분하다.
                    if(selected.find(segment.segment_id)==selected.end())
                        selected.emplace(segment.segment_id,SerializeRecordingSegmentV2(segment));
                }
            }
            Need(selected.size()==job.sources.size(),"job-confirmed-source-closure");
            std::int64_t previous_order=0;
            std::set<std::string> source_ids;
            const auto& store=job.sources.front().segment.store_id;
            for(const auto& s:job.sources){
                Need(s.segment.store_id==store&&s.segment.channel_id==job.reference.channel_id&&
                    s.segment.order_sequence>previous_order&&source_ids.insert(s.segment.segment_id).second,
                    "job-source-durable-order-duplicate");
                previous_order=s.segment.order_sequence;
                const auto found=selected.find(s.segment.segment_id);
                Need(found!=selected.end()&&found->second==SerializeRecordingSegmentV2(s.segment),"job-selection-source-conflict");
                Need(ValidateRecordingSourceBindingForSegment(s.binding,s.segment,nullptr)&&s.binding.index_complete&&s.binding.samples.size()<=4096&&s.segment.size_bytes<=32*1024*1024&&s.segment.container=="mp4"&&s.segment.video_codecs==std::vector<std::string>{
                    "h264"
                }
                ,"job-source-binding-profile");
            }
            Need(job.job_id==Identity(job)&&job.attempt_id==job.job_id+"-a1"&&job.protection_token==job.attempt_id+"-protect","job-identity-conflict");
            for(std::size_t i=0;
            i<job.outputs.size();
            ++i){
                const auto& o=job.outputs[i];
                const auto id=job.job_id+"-o"+std::to_string(i);
                Need(o.source_index==i&&o.output_id==id&&o.order_request_id==id+"-order"&&o.temporary_relpath==".derived-jobs/"+job.job_id+"/"+job.attempt_id+"/"+id+".partial.ts"&&o.final_relpath==job.reference.channel_id+"/"+id+".ts","job-output-ownership-plan");
            }
            Need(Json(job).size()<=kCap,"job-json-cap");
            return selection;
        }
        template<class Fn>bool Guard(std::string* error,Fn fn){
            try{
                fn();
                if(error)error->clear();
                return true;
            }
            catch(const std::exception& e){
                if(error)*error=e.what();
                return false;
            }
        }
    }
    bool BuildDerivedJobIntent(const DerivedRecordingSelection& selection,const std::vector<DerivedSourceEvidence>& sources,std::uint64_t bytes,std::int64_t now,DerivedJobIntentV1* out,std::string* error){
        if(out)*out={};
        return Guard(error,[&]{
            Need(out,"job-output-null");
            DerivedJobIntentV1 job;
            job.reference=selection.reference;
            job.selection_json=Compact(selection,sources);
            job.reserved_bytes=bytes;
            job.created_at_ms=now;
            std::set<std::string> selected;
            for(const auto& s:selection.slices)if(s.state==DerivedSliceState::Confirmed){
                Need(s.candidates.size()==1,"job-confirmed-not-unique");
                selected.insert(s.candidates[0].segment.segment_id);
            }
            for(const auto& id:selected){
                const auto source=std::find_if(sources.begin(),sources.end(),[&](const auto& s){
                    return s.segment.segment_id==id;
                }
                );
                Need(source!=sources.end()&&source->binding&&!source->deleted,"job-confirmed-source-missing");
                job.sources.push_back({
                    source->segment,*source->binding
                }
                );
            }
            std::sort(job.sources.begin(),job.sources.end(),[](const auto& a,const auto& b){
                return a.segment.order_sequence<b.segment.order_sequence;
            });
            job.job_id=Identity(job);
            job.attempt_id=job.job_id+"-a1";
            job.protection_token=job.attempt_id+"-protect";
            for(std::size_t i=0;
            i<job.sources.size();
            ++i){
                DerivedJobOutputPlanV1 o;
                o.source_index=i;
                o.output_id=job.job_id+"-o"+std::to_string(i);
                o.order_request_id=o.output_id+"-order";
                o.temporary_relpath=".derived-jobs/"+job.job_id+"/"+job.attempt_id+"/"+o.output_id+".partial.ts";
                o.final_relpath=job.reference.channel_id+"/"+o.output_id+".ts";
                job.outputs.push_back(std::move(o));
            }
            Validate(job);
            *out=std::move(job);
        }
        );
    }
    bool RestoreDerivedJobSelection(const DerivedJobIntentV1& job,DerivedRecordingSelection* out,std::string* error){
        return Guard(error,[&]{
            Need(out,"job-selection-output-null");
            *out=Validate(job);
        }
        );
    }
    bool MatchesDerivedJobSelection(const DerivedJobIntentV1& job,const DerivedRecordingSelection& selection,std::string* error){
        return Guard(error,[&]{
            Validate(job);
            Need(SerializeRecordingConsumerReferenceV1(selection.reference)==SerializeRecordingConsumerReferenceV1(job.reference),"job-remux-reference-conflict");
            std::vector<DerivedSourceEvidence> sources;
            const auto document=Obj(job.selection_json,{"schema","start","end","complete","reason","segments","slices","unplaced"});
            for(const auto& raw:A(document,"segments",8)){
                DerivedSourceEvidence source;
                Need(ParseRecordingSegmentV2(raw,&source.segment,nullptr),"job-selection-source");
                sources.push_back(std::move(source));
            }
            Need(Compact(selection,sources)==job.selection_json,"job-remux-selection-conflict");
        });
    }
    bool ValidateDerivedJobIntent(const DerivedJobIntentV1& job,std::string* error){
        return Guard(error,[&]{
            Validate(job);
        }
        );
    }
    std::string SerializeDerivedJobIntent(const DerivedJobIntentV1& job){
        try{
            Validate(job);
            return Json(job);
        }
        catch(...){
            return {};
        }
    }
    bool ParseDerivedJobIntent(const std::string& json,DerivedJobIntentV1* out,std::string* error){
        if(out)*out={};
        return Guard(error,[&]{
            Need(out,"job-output-null");
            const auto d=Obj(json,{
                "schema","job_id","attempt_id","protection_token","profile","reference","selection","sources","outputs","reserved_bytes","created_at_ms"
            }
            );
            DerivedJobIntentV1 job;
            job.schema=S(d,"schema");
            job.job_id=S(d,"job_id");
            job.attempt_id=S(d,"attempt_id");
            job.protection_token=S(d,"protection_token");
            job.profile=S(d,"profile");
            Need(ParseRecordingConsumerReferenceV1(O(d,"reference"),&job.reference,error),"job-reference-parse");
            job.selection_json=O(d,"selection");
            job.reserved_bytes=N<std::uint64_t>(d,"reserved_bytes");
            job.created_at_ms=N(d,"created_at_ms");
            for(const auto& raw:A(d,"sources",8)){
                const auto d=Obj(raw,{
                    "segment","binding"
                }
                );
                DerivedJobSourceV1 s;
                Need(ParseRecordingSegmentV2(O(d,"segment"),&s.segment,error)&&ParseRecordingSourceBindingV1(O(d,"binding"),&s.binding,error),"job-source-parse");
                job.sources.push_back(s);
            }
            for(const auto& raw:A(d,"outputs",8)){
                const auto d=Obj(raw,{
                    "source","id","order","temporary","final"
                }
                );
                job.outputs.push_back({
                    N<std::uint32_t>(d,"source"),S(d,"id"),S(d,"order"),S(d,"temporary"),S(d,"final")
                }
                );
            }
            Validate(job);
            Need(Json(job)==json,"job-noncanonical-or-unknown-nested-field");
            *out=std::move(job);
        }
        );
    }
    bool DerivedJobActive(const DerivedJobRecordV1& record){
        return record.state!=DerivedJobState::Complete&&record.state!=DerivedJobState::Failed;
    }
}
// namespace recording
