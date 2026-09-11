#pragma once
// 파일 용도: 내부 finalize 내구 증명. 공개 V1 schema는 변경하지 않는다.
#include "recording/recording_contracts.h"
#include <filesystem>
#include <optional>
namespace recording {
class RecordingCatalog;
struct FinalizeReadyTicket {
    RecordingSegmentV1 segment;
    std::filesystem::path partial_relative;
    std::filesystem::path final_relative;
    std::optional<EventRecordingLinkV1> event_link;
};
struct FinalizeRecoveryReport { std::size_t recovered{0}, already_committed{0}, quarantined{0}, errors{0}; };
bool WriteFinalizeReadyTicket(const std::filesystem::path& root,const FinalizeReadyTicket& ticket,std::string* error);
bool PublishFinalizeReady(const std::filesystem::path& root,const FinalizeReadyTicket& ticket,std::string* error);
bool ClearFinalizeReady(const std::filesystem::path& root,const FinalizeReadyTicket& ticket,std::string* error);
// marker 정리 전에 ticket 유효성과 정확한 partial 소유권을 확인한다.
bool PreserveFinalizeReadyPartial(const std::filesystem::path& root,const std::filesystem::path& final_relative,
                                 const std::string& partial_name,bool* preserve,std::string* error);
// Catalog.Open 이후, writer/bridge/retention 시작 전에만 호출한다. 예약은 복원하지 않는다.
bool RecoverFinalizeReadyTickets(RecordingCatalog& catalog,const std::filesystem::path& root,FinalizeRecoveryReport* report,std::string* error);
}
