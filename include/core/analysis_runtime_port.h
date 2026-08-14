// 파일 요약: analysis owner가 process 전역 utility를 직접 참조하지 않도록 runtime 설정·진단·명령 port를 선언한다.
// 동작 요약: dependency-free config data와 debug/command adapter를 core-media 경계로 제공한다.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "core/analysis_runtime_config_data.h"
#include "core/command_runner.h"
#include "core/stream_key.h"

namespace core {

// Analysis owner는 utility 소유 namespace를 직접 명명하지 않고 이 port re-export만 사용한다.
namespace analysis_runtime_defaults {
using namespace analysis_defaults;
}  // namespace analysis_runtime_defaults

using AnalysisRuntimeConfig = AnalysisRuntimeConfigData;

const AnalysisRuntimeConfig& GetAnalysisRuntimeConfig();

CommandResult RunAnalysisCommandCapture(const std::vector<std::string>& arguments, int timeout_ms);

void RecordAnalysisOverlayProbeAttached();
void RecordAnalysisOverlayProbeRemoved();
void RecordAnalysisTapAttached(const std::string& tap_id);
void RecordAnalysisTapDetached(const std::string& tap_id);
void RecordAnalysisTapCreated(const std::string& tap_id,
                              const std::string& reuse_key,
                              std::size_t ref_count);
void RecordAnalysisTapReused(const std::string& tap_id,
                             const std::string& reuse_key,
                             std::size_t ref_count);
void RecordAnalysisTapRejected(const std::string& reuse_key);
void RecordAnalysisTapRefCount(const std::string& reuse_key, std::size_t ref_count);
void RecordAnalysisMetadataJsonBuild();
void RecordAnalysisMetadataJsonBytes(std::uint64_t bytes);

}  // namespace core
