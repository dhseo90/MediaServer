// 파일 용도: event-link의 단일 canonical 설명 필드만 분리하는 내부 스트림.
#pragma once
#include "recording_history_index.h"
#include "recording/recording_lazy_text.h"
#include <mutex>
namespace recording {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
class RecordingEventReason final:public RecordingTextSource {
    mutable std::recursive_mutex mu_;
    mutable bool visiting_{false};
    mutable RecordingHistoryIndex index_;
    std::string pending_;
    std::uint64_t parts_{0};std::size_t encoded_{0},decoded_{0};
    unsigned escape_{0},unicode_{0};bool sealed_{false};
    bool Flush(std::string* error){
        if(pending_.empty())return true;
        if(!index_.ReserveRows(parts_+1,error))return false;
        const auto digits=std::to_string(parts_++);
        if(!index_.Put(std::string(20-digits.size(),'0')+digits,pending_,false,error))return false;
        pending_.clear();return true;
    }
    static bool Fail(std::string* error){if(error)*error="event reason canonical string invalid";return false;}
public:
    ~RecordingEventReason()override{try{Finish(nullptr);}catch(...){if(index_.resources())index_.resources()->ReportReaderCleanupFailure();}}
    bool Create(const std::shared_ptr<RecordingScratchResidency>& resources,std::string* error){return index_.Create(std::filesystem::canonical(std::filesystem::temp_directory_path()).string(),RecordingHistoryIndex::BytesForRows(0),error,resources)&&index_.BeginSequentialBuild(error);}
    bool Append(char c,std::string* error){
        if(sealed_)return Fail(error);
        const auto byte=static_cast<unsigned char>(c);
        if(escape_==0){if(byte<32||c=='"')return Fail(error);if(c=='\\')escape_=1;else ++decoded_;}
        else if(escape_==1){
            if(c=='"'||c=='\\'||c=='b'||c=='f'||c=='n'||c=='r'||c=='t'){++decoded_;escape_=0;}
            else if(c=='u'){escape_=2;unicode_=0;}else return Fail(error);
        }else {
            unsigned nibble=0;if(c>='0'&&c<='9')nibble=c-'0';else if(c>='a'&&c<='f')nibble=c-'a'+10;else return Fail(error);
            unicode_=unicode_*16+nibble;
            if(++escape_==6){if(unicode_>=32||unicode_==8||unicode_==9||unicode_==10||unicode_==12||unicode_==13)return Fail(error);++decoded_;escape_=0;}
        }
        pending_+=c;++encoded_;return pending_.size()<RecordingHistoryIndex::kValueBytes||Flush(error);
    }
    bool Seal(std::string* error){if(escape_||!Flush(error)||!index_.SealSequentialBuild(error))return Fail(error);sealed_=true;return true;}
    std::size_t size()const override{return decoded_;}
    std::size_t encoded_size()const override{return encoded_;}
    std::shared_ptr<SearchModelResidency> memory()const override{return index_.resources()->memory();}
    bool Finish(std::string* error)const override {std::lock_guard<std::recursive_mutex> lock(mu_);if(visiting_)return Fail(error);const bool ok=index_.Close(error);if(!ok&&index_.resources())index_.resources()->ReportReaderCleanupFailure();return ok;}
    bool Visit(const RecordingTextSink& sink,bool encoded,std::string* error)const override {
        std::lock_guard<std::recursive_mutex> lock(mu_);if(!sealed_||!sink||visiting_)return Fail(error);
        visiting_=true;struct Guard{bool& active;~Guard(){active=false;}} guard{visiting_};
        std::uint64_t part=0;std::size_t bytes=0,decoded=0;unsigned state=0,unicode=0;
        const bool ok=index_.Visit([&](const std::string& key,const std::string& raw,std::string* detail){
            const auto digits=std::to_string(part++);if(key!=std::string(20-digits.size(),'0')+digits)return Fail(detail);
            bytes+=raw.size();if(encoded)return sink(raw,detail);
            std::string out;out.reserve(raw.size());
            for(char c:raw){if(state==0){if(c=='\\')state=1;else out+=c;}
                else if(state==1){if(c=='u'){state=2;unicode=0;}else {out+=c=='b'?'\b':c=='f'?'\f':c=='n'?'\n':c=='r'?'\r':c=='t'?'\t':c;state=0;}}
                else{unicode=unicode*16+(c<='9'?c-'0':c-'a'+10);if(++state==6){out+=static_cast<char>(unicode);state=0;}}}
            decoded+=out.size();return out.empty()||sink(out,detail);
        },error);
        return ok&&part==parts_&&bytes==encoded_&&(encoded||(!state&&decoded==decoded_));
    }
};
// Only an exact canonical key at the requested object depth can select the field.
// The normal strict parser still validates all remaining bytes, duplicate keys,
// value types and domain/canonical constraints. No other JSON value is elided.
class RecordingEventReasonSplitter {
    SearchModelResidency::Reservation compact_memory_;
    std::shared_ptr<RecordingScratchResidency> resources_;
    const unsigned target_depth_;
    unsigned depth_{0};bool quoted_{false},escaped_{false},selected_{false},seen_{false};
    bool key_candidate_{false};std::string token_,reason_buffer_;
    std::shared_ptr<RecordingEventReason> reason_;
public:
    std::string compact;
    explicit RecordingEventReasonSplitter(unsigned depth,std::shared_ptr<RecordingScratchResidency> resources=RecordingScratchResidency::Current())
        :resources_(resources?std::move(resources):RecordingScratchResidency::Default(std::filesystem::canonical(std::filesystem::temp_directory_path()).string())),target_depth_(depth){}
    SearchModelResidency::Reservation TakeMemory(){return std::move(compact_memory_);}
    const std::shared_ptr<SearchModelResidency>& memory()const{return resources_->memory();}
    void Grow(){
        if(compact.size()+4<=compact.capacity())return;
        const auto capacity=std::max<std::size_t>(4096,compact.capacity()*2+8);
        auto ticket=memory()->ReserveOwned(2*capacity+131072);
        if(!ticket)throw RecordingResourceUnavailable();
        compact.reserve(capacity);compact_memory_.swap(*ticket);
    }
    bool Append(std::string_view input,std::string* error){
        for(char c:input){
            if(!selected_)Grow();
            if(selected_){
                if(c=='"'&&!escaped_){
                    if(reason_){if(!reason_->Seal(error))return false;compact+='x';}
                    else{
                        const auto wanted=compact.size()+reason_buffer_.size()+8;auto ticket=memory()->ReserveOwned(2*wanted+131072);
                        if(!ticket)throw RecordingResourceUnavailable();
                        compact.reserve(wanted);compact+=reason_buffer_;compact_memory_.swap(*ticket);reason_buffer_.clear();
                    }
                    selected_=false;quoted_=false;compact+='"';
                }else{
                    if(!reason_&&reason_buffer_.size()==65536){
                        reason_=std::make_shared<RecordingEventReason>();if(!reason_->Create(resources_,error))return false;
                        for(char buffered:reason_buffer_)if(!reason_->Append(buffered,error))return false;
                        reason_buffer_.clear();
                    }
                    if(reason_){if(!reason_->Append(c,error))return false;}else reason_buffer_+=c;
                    escaped_=!escaped_&&c=='\\';
                }
                continue;
            }
            compact+=c;
            if(quoted_){
                if(c=='"'&&!escaped_){quoted_=false;key_candidate_=depth_==target_depth_&&token_=="completeness_reason";}
                else if(token_.size()<64)token_+=c;
                escaped_=!escaped_&&c=='\\';continue;
            }
            if(c=='"'){
                if(key_candidate_){
                    if(seen_){if(error)*error="duplicate event completeness reason";return false;}
                    seen_=true;selected_=true;
                }
                quoted_=true;escaped_=false;token_.clear();key_candidate_=false;
            }else if(c=='{'||c=='['){++depth_;key_candidate_=false;}
            else if(c=='}'||c==']'){if(depth_)--depth_;key_candidate_=false;}
            else if(c!=':')key_candidate_=false;
        }
        return true;
    }
    bool Finish(std::string* error){
        if(selected_||quoted_){if(error)*error="event reason incomplete string";return false;}
        return true;
    }
    std::shared_ptr<const RecordingTextSource> reason()const{return reason_;}
};
#endif
}
