#pragma once
// 파일 증거의 원점/native tick을 위한 정확한 내부 구간. 원본 식별 인증은 호출자 책임이다.
#include <cstdint>
#include <algorithm>
#include <limits>
#include <numeric>
#include <stdexcept>
#include <vector>
namespace recording {
struct PresentationTime {
    std::int64_t ns{0};
    std::uint32_t numerator{0},denominator{1};
};
struct PresentationInterval { PresentationTime start,end; };
inline bool ValidPresentationTime(const PresentationTime& t) {
    return t.denominator>0&&t.numerator<t.denominator&&std::gcd(t.numerator,t.denominator)==1&&
        (t.ns!=std::numeric_limits<std::int64_t>::max()||t.numerator==0);
}
inline int ComparePresentationTime(const PresentationTime& a,const PresentationTime& b) {
    if(!ValidPresentationTime(a)||!ValidPresentationTime(b))throw std::invalid_argument("invalid-presentation-time");
    if(a.ns!=b.ns)return a.ns<b.ns?-1:1;
    const auto left=static_cast<std::uint64_t>(a.numerator)*b.denominator;
    const auto right=static_cast<std::uint64_t>(b.numerator)*a.denominator;
    return left==right?0:(left<right?-1:1);
}
inline bool MakePresentationInterval(std::int64_t origin,std::uint32_t scale,std::int64_t pts,std::int64_t duration,PresentationInterval* out) {
    if(out)*out={};
    if(!out||origin<0||scale==0||pts<0||duration<=0)return false;
    const __int128 tick_end=static_cast<__int128>(pts)+duration;
    if(tick_end>std::numeric_limits<std::int64_t>::max())return false;
    const __int128 a=static_cast<__int128>(origin)*scale+static_cast<__int128>(pts)*1000000000;
    const __int128 b=static_cast<__int128>(origin)*scale+tick_end*1000000000;
    if(b>static_cast<__int128>(std::numeric_limits<std::int64_t>::max())*scale)return false;
    const auto time=[&](__int128 n){
        const auto remainder=static_cast<std::uint32_t>(n%scale),divisor=std::gcd(remainder,scale);
        return PresentationTime{static_cast<std::int64_t>(n/scale),remainder/divisor,scale/divisor};
    };
    *out={time(a),time(b)};return true;
}
inline bool ValidPresentationInterval(const PresentationInterval& v) {
    return ValidPresentationTime(v.start)&&ValidPresentationTime(v.end)&&ComparePresentationTime(v.start,v.end)<0;
}
inline bool MergePresentationIntervals(std::vector<PresentationInterval> input,std::vector<PresentationInterval>* out) {
    if(out)out->clear();
    if(!out||input.size()>4096||!std::all_of(input.begin(),input.end(),ValidPresentationInterval))return false;
    std::sort(input.begin(),input.end(),[](const auto& a,const auto& b){const int c=ComparePresentationTime(a.start,b.start);return c<0||(c==0&&ComparePresentationTime(a.end,b.end)<0);});
    for(const auto& v:input) {
        if(out->empty()||ComparePresentationTime(v.start,out->back().end)>0)out->push_back(v);
        else if(ComparePresentationTime(v.end,out->back().end)>0)out->back().end=v.end;
    }
    return true;
}
inline bool MissingPresentationIntervals(const std::vector<PresentationInterval>& input,PresentationInterval request,std::vector<PresentationInterval>* out) {
    if(out)out->clear();
    if(!out||!ValidPresentationInterval(request))return false;
    std::vector<PresentationInterval> merged;if(!MergePresentationIntervals(input,&merged))return false;
    auto cursor=request.start;
    for(const auto& v:merged) {
        if(ComparePresentationTime(v.end,cursor)<=0)continue;
        if(ComparePresentationTime(v.start,request.end)>=0)break;
        if(ComparePresentationTime(v.start,cursor)>0)out->push_back({cursor,v.start});
        cursor=ComparePresentationTime(v.end,request.end)<0?v.end:request.end;
        if(ComparePresentationTime(cursor,request.end)==0)break;
    }
    if(ComparePresentationTime(cursor,request.end)<0)out->push_back({cursor,request.end});
    return true;
}
inline bool PresentationEnvelope(PresentationInterval interval,std::int64_t* start,std::int64_t* end) {
    if(!start||!end||!ValidPresentationInterval(interval))return false;
    *start=interval.start.ns;*end=interval.end.ns+(interval.end.numerator?1:0);return true;
}
}
