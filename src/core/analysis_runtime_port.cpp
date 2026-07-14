// 파일 요약: analysis runtime port를 기존 process config, command runner, debug counter에 결속한다.
// 동작 요약: analysis owner에는 core-media 계약만 노출하고 기존 설정·진단·명령 의미는 그대로 위임한다.
#include "core/analysis_runtime_port.h"

#include "app_config.h"
#include "core/command_runner.h"
#include "core/runtime_debug_counters.h"

namespace core {

const AnalysisRuntimeConfig& GetAnalysisRuntimeConfig() {
    return app::GetAppConfig();
}

CommandResult RunAnalysisCommandCapture(const std::vector<std::string>& arguments, int timeout_ms) {
    return core::RunCommandCapture(arguments, timeout_ms);
}

void RecordAnalysisOverlayProbeAttached() {
    core::runtime_debug::RecordOverlayProbeAttached();
}

void RecordAnalysisOverlayProbeRemoved() {
    core::runtime_debug::RecordOverlayProbeRemoved();
}

void RecordAnalysisTapAttached(const std::string& tap_id) {
    core::runtime_debug::RecordAnalysisTapAttached(tap_id);
}

void RecordAnalysisTapDetached(const std::string& tap_id) {
    core::runtime_debug::RecordAnalysisTapDetached(tap_id);
}

void RecordAnalysisTapCreated(const std::string& tap_id,
                              const std::string& reuse_key,
                              std::size_t ref_count) {
    core::runtime_debug::RecordAnalysisTapCreated(tap_id, reuse_key, ref_count);
}

void RecordAnalysisTapReused(const std::string& tap_id,
                             const std::string& reuse_key,
                             std::size_t ref_count) {
    core::runtime_debug::RecordAnalysisTapReused(tap_id, reuse_key, ref_count);
}

void RecordAnalysisTapRejected(const std::string& reuse_key) {
    core::runtime_debug::RecordAnalysisTapRejected(reuse_key);
}

void RecordAnalysisTapRefCount(const std::string& reuse_key, std::size_t ref_count) {
    core::runtime_debug::RecordAnalysisTapRefCount(reuse_key, ref_count);
}

void RecordAnalysisMetadataJsonBuild() {
    core::runtime_debug::RecordMetadataJsonBuild();
}

void RecordAnalysisMetadataJsonBytes(std::uint64_t bytes) {
    core::runtime_debug::RecordMetadataJsonBytes(bytes);
}

}  // namespace core
