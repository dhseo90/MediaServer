// 파일 용도: 큰 event completeness 설명의 무손실·유한 버퍼 소비 계약.
#pragma once
#include "recording/recording_memory_reservation.h"
#include <functional>
#include <string>
#include <string_view>
namespace recording {
using RecordingTextSink=std::function<bool(std::string_view,std::string*)>;
class RecordingTextSource {
public:
    virtual ~RecordingTextSource()=default;
    virtual std::size_t size()const=0;
    virtual std::size_t encoded_size()const=0;
    virtual bool Visit(const RecordingTextSink&,bool encoded,std::string*)const=0;
    virtual std::shared_ptr<SearchModelResidency> memory()const=0;
    virtual bool Finish(std::string*)const=0;
};
struct RecordingOwnedText {
    SearchModelResidency::Reservation memory;std::string text;
    RecordingOwnedText()=default;
    RecordingOwnedText(RecordingOwnedText&&)=default;
    RecordingOwnedText(const RecordingOwnedText&)=default;
    RecordingOwnedText& operator=(RecordingOwnedText value)noexcept{memory.swap(value.memory);text.swap(value.text);return *this;}
};
class RecordingLazyText {
    std::string text_;
    std::shared_ptr<const RecordingTextSource> source_;
public:
    RecordingLazyText()=default;
    RecordingLazyText(const char* text):text_(text){}
    RecordingLazyText(std::string text):text_(std::move(text)){}
    RecordingLazyText& operator=(const char* text){return *this=std::string(text);}
    RecordingLazyText& operator=(std::string text){text_=std::move(text);source_.reset();return *this;}
    void clear(){text_.clear();source_.reset();}
    bool empty()const{return size()==0;}
    std::size_t size()const{return source_?source_->size():text_.size();}
    std::size_t capacity()const{return text_.capacity();}
    bool lazy()const{return bool(source_);}
    const std::string& small()const{if(source_)throw RecordingResourceUnavailable();return text_;}
    void Bind(std::shared_ptr<const RecordingTextSource> source){text_.clear();source_=std::move(source);}
    const std::shared_ptr<const RecordingTextSource>& source()const{return source_;}
    bool Visit(const RecordingTextSink& sink,std::string* error)const{
        // The callback may release its DTO. This in-flight reader owns the backing
        // independently until the final chunk/exception has returned.
        const auto source=source_;
        return source?source->Visit(sink,false,error):sink(text_,error);
    }
    bool ReadOwned(RecordingOwnedText* output,const std::shared_ptr<SearchModelResidency>& owner,std::string* error)const {
        if(!output||!owner||(source_&&source_->memory()!=owner))return false;
        auto charge=owner->ReserveOwned(size()+65);if(!charge)throw RecordingResourceUnavailable();
        RecordingOwnedText value;value.memory=std::move(*charge);value.text.reserve(size());
        if(!Visit([&](std::string_view bytes,std::string*){value.text.append(bytes);return true;},error))return false;
        *output=std::move(value);return true;
    }
    bool Finish(std::string* error){
        if(source_&&source_.use_count()==1&&!source_->Finish(error))return false;
        clear();return true;
    }
    bool operator==(std::string_view text)const {
        if(size()!=text.size())return false;
        if(!source_)return text_==text;
        std::size_t offset=0;bool same=true;std::string error;
        if(!Visit([&](std::string_view chunk,std::string*){same=same&&text.substr(offset,chunk.size())==chunk;offset+=chunk.size();return true;},&error))throw std::runtime_error(error);
        return same&&offset==text.size();
    }
    bool operator!=(std::string_view text)const{return !(*this==text);}
};
}
