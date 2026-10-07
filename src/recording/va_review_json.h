// 파일 용도: strict parser가 검증한 JSON의 배열·스칼라를 VA 검토 codec에서 읽는다.
#pragma once
#include "domain/strict_json.h"
#include <charconv>
#include <string>
#include <vector>
namespace recording::review_json {
using Doc=ingress::StrictJsonObjectDocument;
using Type=ingress::StrictJsonType;
inline bool Parse(const std::string& text,Doc* out) {return ingress::ParseStrictJsonObjectDocument(text,out,nullptr);}
inline bool Text(const Doc& d,const char* key,std::string* out) {
    const auto v=ingress::StrictJsonStringField(d,key);if(!v)return false;*out=*v;return true;
}
template<class T> bool Number(const Doc& d,const char* key,T* out) {
    const auto* v=d.Find(key);if(!v||v->type!=Type::Number)return false;
    T n{};const auto r=std::from_chars(v->raw.data(),v->raw.data()+v->raw.size(),n);
    if(r.ec!=std::errc{}||r.ptr!=v->raw.data()+v->raw.size())return false;
    *out=n;
    return true;
}
inline bool Array(const Doc& d,const char* key,std::vector<std::string>* output) {
    const auto* v=d.Find(key);if(!v||v->type!=Type::Array)return false;
    std::vector<std::string> items;const auto& raw=v->raw;std::size_t start=1,depth=0;
    bool quoted=false,escaped=false;
    for(std::size_t i=1;i+1<raw.size();++i) {
        const char c=raw[i];
        if(quoted){if(escaped)escaped=false;else if(c=='\\')escaped=true;else if(c=='"')quoted=false;continue;}
        if(c=='"')quoted=true;else if(c=='{'||c=='[')++depth;else if(c=='}'||c==']')--depth;
        else if(c==','&&!depth){items.push_back(raw.substr(start,i-start));start=i+1;}
    }
    const auto tail=raw.substr(start,raw.size()-start-1);
    if(tail.find_first_not_of(" \t\r\n")!=std::string::npos)items.push_back(tail);
    *output=std::move(items);return true;
}
} // namespace recording::review_json
