#include "recording/recording_presentation_interval.h"
#include <climits>
#include <iostream>
using namespace recording;
int main() {
    int failed=0;const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';if(!ok)++failed;};
    PresentationInterval a,b,c;std::vector<PresentationInterval> merged,missing;
    check(MakePresentationInterval(0,3000,23600,100,&a)&&a.start.ns==7866666666LL&&a.start.numerator==2&&a.start.denominator==3&&a.end.ns==7900000000LL&&a.end.numerator==0,"LP09-N01 exact native end does not add separately truncated duration");
    check(MakePresentationInterval(0,30000,1001,1001,&a)&&a.start.ns==33366666&&a.end.ns==66733333&&a.end.numerator==1&&a.end.denominator==3,"LP09-N02 fractional FPS exact endpoint");
    bool gaps=MakePresentationInterval(0,1000000000,0,100,&a)&&MakePresentationInterval(0,1000000000,101,10,&b)&&MergePresentationIntervals({a,b},&merged)&&merged.size()==2&&MissingPresentationIntervals(merged,{{0},{111}},&missing)&&missing.size()==1&&missing[0].start.ns==100&&missing[0].end.ns==101;
    gaps=MakePresentationInterval(0,2000000000,0,200,&a)&&MakePresentationInterval(0,2000000000,201,19,&b)&&MergePresentationIntervals({a,b},&merged)&&merged.size()==2&&MissingPresentationIntervals(merged,{{0},{110}},&missing)&&missing.size()==1&&missing[0].start.ns==100&&missing[0].end.ns==100&&missing[0].end.numerator==1&&missing[0].end.denominator==2&&gaps;
    check(gaps,"LP09-N03 positive one-ns and sub-ns gaps survive union");
    check(MakePresentationInterval(0,3000,0,25000,&a)&&MakePresentationInterval(8333333333LL,3000,0,100,&b)&&MergePresentationIntervals({b,a},&merged)&&merged.size()==1&&merged[0].start.ns==0&&ComparePresentationTime(merged[0].end,b.end)==0,"LP09-N04 actual integer origin preserves one-third-ns overlap");
    check(MakePresentationInterval(0,3000,200,100,&a)&&MakePresentationInterval(0,3000,400,100,&b)&&MakePresentationInterval(0,3000,300,100,&c)&&MergePresentationIntervals({b,a,c},&merged)&&merged.size()==1&&MakePresentationInterval(0,3000,0,60,&a)&&MakePresentationInterval(0,3000,60,150,&b)&&MergePresentationIntervals({b,a},&merged)&&merged.size()==1&&merged[0].end.ns==70000000,"LP09-N05 B-frame presentation ordering and VFR own durations");
    check(!MakePresentationInterval(0,0,0,1,&a)&&!MakePresentationInterval(-1,3000,0,1,&a)&&!MakePresentationInterval(0,3000,-1,1,&a)&&!MakePresentationInterval(0,3000,0,0,&a)&&!MakePresentationInterval(0,1,INT64_MAX,1,&a)&&!MakePresentationInterval(INT64_MAX,1000000000,0,1,&a)&&!ValidPresentationTime({1,2,4})&&!ValidPresentationTime({1,1,1})&&!ValidPresentationTime({1,0,0}),"LP09-N06 malformed rational and native/ns overflow rejected");
    std::int64_t lo=0,hi=0;check(MakePresentationInterval(0,3000,200,100,&a)&&PresentationEnvelope(a,&lo,&hi)&&lo==66666666&&hi==100000000&&MissingPresentationIntervals({a},{{66666666},{100000000}},&missing)&&missing.size()==1&&missing[0].end.numerator==2&&missing[0].end.denominator==3,"LP09-N07 outward integer display cannot hide fractional request gap");
    check(!MergePresentationIntervals(std::vector<PresentationInterval>(4097,{{0},{1}}),&merged)&&MergePresentationIntervals({{{10},{20}},{{0},{10}},{{0},{5}}},&merged)&&merged.size()==1&&merged.front().start.ns==0&&merged.front().end.ns==20,"LP09-N08 bounded deterministic union");
    std::cout<<"[summary] pass="<<8-failed<<" fail="<<failed<<'\n';return failed?1:0;
}
