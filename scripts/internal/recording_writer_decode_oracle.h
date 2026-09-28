#pragma once
#include <algorithm>
#include <cstdint>
#include <vector>
namespace writer_decode_oracle {
inline std::vector<std::uint64_t> Presentation(std::vector<std::uint64_t> input){std::sort(input.begin(),input.end());return input;}
// 파일 용도: 입력에서 산출한 전체 presentation과 대조한다. 합법적인 중복 PTS도 그대로 보존한다.
inline bool MatchesPresentation(const std::vector<std::uint64_t>& expected,const std::vector<std::uint64_t>& observed){
 return !expected.empty()&&expected==observed;
}
struct Status {bool decoder_available=true,configured=true,started=true,bus_error=false,corrupted=false,invalid_pts=false,eos=true,limit=false;};
inline const char* Failure(const Status& s){
 if(!s.decoder_available)return "decoder-unavailable";
 if(!s.configured)return "decoder-configuration";
 if(!s.started)return "start-failure";
 if(s.bus_error)return "bus-error";
 if(s.corrupted)return "corrupted-buffer";
 if(s.invalid_pts)return "invalid-pts";
 if(s.limit)return "frame-limit";
 if(!s.eos)return "missing-eos";
 return "none";
}
inline bool Accepted(const Status& s){return s.decoder_available&&s.configured&&s.started&&!s.bus_error&&!s.corrupted&&!s.invalid_pts&&s.eos&&!s.limit;}
}
