#pragma once
// 파일 용도: finalize ticket 값·엄격 저장·읽기 기반 partial 보호. 공개 저장 형식은 유지한다.
#include "recording/recording_contracts.h"
#include <filesystem>
#include <optional>
namespace recording {
struct FinalizeReadyTicket {
    RecordingSegmentV1 segment;
    std::filesystem::path partial_relative;
    std::filesystem::path final_relative;
    std::optional<EventRecordingLinkV1> event_link;
    std::optional<RecordingSegmentV2> segment_v2{};
    std::optional<RecordingSourceBindingV1> source_binding{};
};
bool WriteFinalizeReadyTicket(const std::filesystem::path& root,const FinalizeReadyTicket& ticket,std::string* error);
// marker 정리 전에 ticket 유효성과 정확한 partial 소유권을 확인한다.
bool PreserveFinalizeReadyPartial(const std::filesystem::path& root,const std::filesystem::path& final_relative,
                                 const std::string& partial_name,bool* preserve,std::string* error);
}
