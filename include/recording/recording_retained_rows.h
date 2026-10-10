// 파일 용도: 검증된 비영속 Catalog 행을 한 값씩 읽는 내부 보존 자료 소유 경계.
#pragma once
#include <map>
#include <iterator>
#include <functional>
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <utility>
#include "domain/strict_json.h"

namespace recording {
class RecordingRetainedRowStore {
public:
    virtual ~RecordingRetainedRowStore()=default;
    virtual bool Get(const std::string&,const std::string&,std::string*,bool*,std::string*)=0;
    virtual bool Put(const std::string&,const std::string&,const std::string&,std::string*)=0;
    virtual bool Next(const std::string&,const std::string&,std::string*,std::string*,bool*,std::string*)=0;
    virtual bool Visit(const std::string&,const std::function<bool(const std::string&,const std::string&,std::string*)>&,std::string*)=0;
    virtual std::uint64_t Count(const std::string&)const=0;
};
class RecordingRetainedReadError : public std::runtime_error {
public:using std::runtime_error::runtime_error;
};
// RAM fallback is only the pre-existing non-generation backend. A bound store never
// falls back after a cold error. Iterators own one immutable row, not an ID list.
template<class T,bool(*Parse)(const std::string&,T*,std::string*),std::string(*Serialize)(const T&)>
class RecordingRetainedRows {
    using Pair=std::pair<const std::string,T>;
    using Map=std::map<std::string,T>;
public:
    class const_iterator {
        friend class RecordingRetainedRows;
        const RecordingRetainedRows* owner_{nullptr};
        std::shared_ptr<const Pair> row_;
        typename Map::const_iterator ram_;
        const_iterator(const RecordingRetainedRows* owner,typename Map::const_iterator it):owner_(owner),ram_(it){}
        const_iterator(const RecordingRetainedRows* owner,std::shared_ptr<const Pair> row):owner_(owner),row_(std::move(row)){}
    public:
        using iterator_category=std::input_iterator_tag;
        using value_type=Pair;using difference_type=std::ptrdiff_t;using pointer=const Pair*;using reference=const Pair&;
        const Pair& operator*()const{return owner_->store_?*row_:*ram_;}
        const Pair* operator->()const{return &**this;}
        const_iterator& operator++(){if(owner_->store_)*this=owner_->Next(row_->first);else ++ram_;return *this;}
        bool operator==(const const_iterator& rhs)const {
            if(owner_!=rhs.owner_)return false;
            if(!owner_->store_)return ram_==rhs.ram_;
            return (!row_&&!rhs.row_)||(row_&&rhs.row_&&row_->first==rhs.row_->first);
        }
        bool operator!=(const const_iterator& rhs)const{return !(*this==rhs);}
    };
    using iterator=const_iterator;
    using value_type=Pair;
    void Bind(std::shared_ptr<RecordingRetainedRowStore> store,std::string kind) {
        if(!ram_.empty()||store_)throw std::logic_error("retained row binding must precede input");
        store_=std::move(store);kind_=std::move(kind);
    }
    bool cold()const{return bool(store_);}
    std::size_t resident_size()const{return ram_.size();}
    std::size_t size()const{return store_?store_->Count(kind_):ram_.size();}
    bool empty()const{return size()==0;}
    const_iterator begin()const{return store_?Next({}):const_iterator(this,ram_.begin());}
    const_iterator end()const{return store_?const_iterator(this,std::shared_ptr<const Pair>{}):const_iterator(this,ram_.end());}
    const_iterator find(const std::string& id)const {
        if(!store_)return const_iterator(this,ram_.find(id));
        std::string value,error;bool found=false;
        if(!store_->Get(kind_,id,&value,&found,&error))throw RecordingRetainedReadError(error);
        return found?Decode(id,value):end();
    }
    template<class F> bool ForEach(F&& visitor)const {
        if(!store_){for(const auto& row:ram_)if(!visitor(row.second))return false;return true;}
        bool refused=false;std::string error;
        const bool ok=store_->Visit(kind_,[&](const auto& id,const auto& bytes,std::string*){
            const auto row=Decode(id,bytes);if(!visitor(row->second)){refused=true;return false;}return true;
        },&error);
        if(!ok&&!refused)throw RecordingRetainedReadError(error);
        return ok;
    }
    std::size_t count(const std::string& id)const{return find(id)!=end();}
    std::pair<const_iterator,bool> emplace(const std::string& id,T value) {
        const auto previous=find(id);if(previous!=end())return {previous,false};
        Set(id,std::move(value));return {find(id),true};
    }
    void Set(const std::string& id,T value) {
        if(!store_){ram_[id]=std::move(value);return;}
        std::string error;if(!store_->Put(kind_,id,Serialize(value),&error))throw RecordingRetainedReadError(error);
    }
    T at(const std::string& id)const {const auto row=find(id);if(row==end())throw std::out_of_range("retained row absent");return row->second;}
    std::size_t erase(const std::string& id) {
        if(!store_)return ram_.erase(id);
        if(!count(id))return 0;
        std::string error;if(!store_->Put(kind_,id,{},&error))throw RecordingRetainedReadError(error);return 1;
    }
    void clear(){ram_.clear();store_.reset();kind_.clear();}
    void swap(RecordingRetainedRows& other)noexcept{ram_.swap(other.ram_);store_.swap(other.store_);kind_.swap(other.kind_);}
private:
    const_iterator Decode(const std::string& id,const std::string& value)const {
        T parsed;std::string error;
        if(!Parse(value,&parsed,&error)||Serialize(parsed)!=value)throw RecordingRetainedReadError("retained row canonical/domain mismatch: "+error);
        return const_iterator(this,std::make_shared<const Pair>(id,std::move(parsed)));
    }
    const_iterator Next(const std::string& after)const {
        std::string id,value,error;bool found=false;
        if(!store_->Next(kind_,after,&id,&value,&found,&error))throw RecordingRetainedReadError(error);
        return found?Decode(id,value):end();
    }
    Map ram_;
    std::shared_ptr<RecordingRetainedRowStore> store_;
    std::string kind_;
};
inline bool ParseRetainedText(const std::string& bytes,std::string* value,std::string* error) {
    ingress::StrictJsonObjectDocument object;
    if(!ingress::ParseStrictJsonObjectDocument("{\"value\":"+bytes+"}",&object,error))return false;
    const auto parsed=ingress::StrictJsonStringField(object,"value");if(!parsed)return false;*value=*parsed;return true;
}
inline std::string SerializeRetainedText(const std::string& text) {
    std::string result="\"";const char* hex="0123456789abcdef";
    for(unsigned char c:text){switch(c){case '"':result+="\\\"";break;case '\\':result+="\\\\";break;
        case '\n':result+="\\n";break;case '\r':result+="\\r";break;case '\t':result+="\\t";break;
        default:if(c<32){result+="\\u00";result+=hex[c>>4];result+=hex[c&15];}else result+=static_cast<char>(c);}}
    return result+'"';
}
using RecordingRetainedTextRows=RecordingRetainedRows<std::string,ParseRetainedText,SerializeRetainedText>;
inline bool ParseRetainedAcceptance(const std::string& bytes,bool* value,std::string*) {
    if(bytes!="true")return false;
    *value=true;return true;
}
inline std::string SerializeRetainedAcceptance(const bool& value){return value?"true":"false";}
class RecordingRetainedAcceptedSet {
    using Rows=RecordingRetainedRows<bool,ParseRetainedAcceptance,SerializeRetainedAcceptance>;
    Rows rows_;
public:
    class const_iterator {
        Rows::const_iterator it_;
    public:
        using iterator_category=std::input_iterator_tag;using value_type=std::string;
        using difference_type=std::ptrdiff_t;using pointer=const std::string*;using reference=const std::string&;
        explicit const_iterator(Rows::const_iterator it):it_(std::move(it)){}
        reference operator*()const{return it_->first;}pointer operator->()const{return &it_->first;}
        const_iterator& operator++(){++it_;return *this;}
        bool operator==(const const_iterator& rhs)const{return it_==rhs.it_;}
        bool operator!=(const const_iterator& rhs)const{return !(*this==rhs);}
    };
    void Bind(std::shared_ptr<RecordingRetainedRowStore> store){rows_.Bind(std::move(store),"derived-reference-accepted");}
    bool cold()const{return rows_.cold();}std::size_t resident_size()const{return rows_.resident_size();}
    std::size_t size()const{return rows_.size();}bool empty()const{return rows_.empty();}
    std::size_t count(const std::string& id)const{return rows_.count(id);}
    void insert(const std::string& id){rows_.Set(id,true);}
    void clear(){rows_.clear();}void swap(RecordingRetainedAcceptedSet& rhs)noexcept{rows_.swap(rhs.rows_);}
    const_iterator begin()const{return const_iterator(rows_.begin());}const_iterator end()const{return const_iterator(rows_.end());}
};
}
