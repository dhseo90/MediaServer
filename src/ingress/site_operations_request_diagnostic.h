// 파일 용도: 허용된 두 운영 GET의 opt-in 최소 진단을 안전한 고정 필드로 출력한다.
#pragma once
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <string_view>

namespace ingress {
class SiteOperationsRequestDiagnostic {
 public:
  using Clock = std::chrono::steady_clock;
  enum class Phase { Parsed, HandlerBegin, HandlerEnd, SendEnd };
  static bool Enabled(const char* value) noexcept {
    return value != nullptr && std::strcmp(value, "1") == 0;
  }
  SiteOperationsRequestDiagnostic(bool enabled, std::string_view method,
                                  std::string_view path, Clock::time_point accepted) noexcept
      : accepted_(accepted) {
    if (!enabled || method != "GET") return;
    if (path == "/ops/api/site-operations/impact-graph") route_ = "impact_graph";
    else if (path == "/ops/api/site-operations/runbook-instance-ledger") route_ = "runbook_instance_ledger";
    if (route_ != nullptr) id_ = next_id_.fetch_add(1, std::memory_order_relaxed) + 1;
  }
  template <typename Sink>
  void EmitTo(Phase phase, bool sent, Clock::time_point now, Sink&& sink) const noexcept {
    if (route_ == nullptr) return;
    try {
      const char* name = nullptr;
      switch (phase) {
        case Phase::Parsed: name = "parsed"; break;
        case Phase::HandlerBegin: name = "handler_begin"; break;
        case Phase::HandlerEnd: name = "handler_end"; break;
        case Phase::SendEnd: name = "send_end"; break;
      }
      if (name == nullptr) return;
      const auto elapsed = std::chrono::duration_cast<std::chrono::microseconds>(now - accepted_).count();
      char line[320];
      const int size = std::snprintf(line, sizeof(line),
          "[site-request-diagnostic] {\"route\":\"%s\",\"requestId\":%llu,\"elapsedUs\":%lld,\"phase\":\"%s\",\"sendSuccess\":%s}\n",
          route_, static_cast<unsigned long long>(id_), static_cast<long long>(elapsed), name,
          phase == Phase::SendEnd ? (sent ? "true" : "false") : "null");
      if (size > 0 && static_cast<std::size_t>(size) < sizeof(line)) sink(std::string_view(line, size));
    } catch (...) {
      // 진단 sink 오류는 원래 HTTP 요청 처리 결과에 전파하지 않는다.
    }
  }
  void Emit(Phase phase, bool sent = false) const noexcept {
    if (route_ == nullptr) return;
    EmitTo(phase, sent, Clock::now(), [](std::string_view line) {
      (void)std::fwrite(line.data(), 1, line.size(), stderr);
    });
  }
 private:
  inline static std::atomic<unsigned long long> next_id_{0};
  Clock::time_point accepted_;
  const char* route_ = nullptr;
  unsigned long long id_ = 0;
};
}  // namespace ingress
