// 파일 용도: 운영 GET 진단의 opt-in·고정 투영·예외 격리 계약을 검증한다.
#include "ingress/site_operations_request_diagnostic.h"
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
int main() {
  using D = ingress::SiteOperationsRequestDiagnostic;
  int failed = 0, passed = 0;
  auto check = [&](bool ok, const char* name) {
    std::cout << (ok ? "PASS: " : "FAIL: ") << name << '\n';
    ok ? ++passed : ++failed;
  };
  check(!D::Enabled(nullptr) && !D::Enabled("") && !D::Enabled("true") &&
        !D::Enabled("01") && !D::Enabled("1 ") && D::Enabled("1"), "SD01 exact opt-in only");
  const auto start = D::Clock::time_point{};
  std::vector<std::string> lines;
  auto sink = [&](std::string_view line) { lines.emplace_back(line); };
  for (auto method : {"POST", "HEAD", "get"}) {
    D d(true, method, "/ops/api/site-operations/impact-graph", start);
    d.EmitTo(D::Phase::Parsed, false, start, sink);
  }
  for (auto route : {"/health", "/ops/api/site-operations/impact-graph?secret=x",
                     "/ops/api/site-operations/impact-graph/"}) {
    D d(true, "GET", route, start); d.EmitTo(D::Phase::Parsed, false, start, sink);
  }
  D off(false, "GET", "/ops/api/site-operations/impact-graph", start);
  off.EmitTo(D::Phase::Parsed, false, start, sink);
  check(lines.empty(), "SD01 non-allowlisted requests and default off emit nothing");
  D impact(true, "GET", "/ops/api/site-operations/impact-graph", start);
  D ledger(true, "GET", "/ops/api/site-operations/runbook-instance-ledger", start);
  impact.EmitTo(D::Phase::Parsed, false, start + std::chrono::microseconds(12), sink);
  ledger.EmitTo(D::Phase::Parsed, false, start + std::chrono::microseconds(23), sink);
  check(lines.size() == 2 && lines[0].find("\"route\":\"impact_graph\",\"requestId\":1,\"elapsedUs\":12") != std::string::npos &&
        lines[1].find("\"route\":\"runbook_instance_ledger\",\"requestId\":2,\"elapsedUs\":23") != std::string::npos,
        "SD02 route enums unique IDs and monotonic elapsed");
  check(lines[0].find("/ops/") == std::string::npos && lines[0].find("secret") == std::string::npos &&
        lines[0].find("sendSuccess\":null") != std::string::npos, "SD03 fixed projection contains no request material");
  bool reached = false;
  impact.EmitTo(D::Phase::Parsed, false, start, [&](std::string_view) { reached = true; throw std::runtime_error("sink failed"); });
  check(reached, "SD04 throwing diagnostic sink does not escape");
  lines.clear();
  impact.EmitTo(D::Phase::SendEnd, true, start, sink);
  impact.EmitTo(D::Phase::SendEnd, false, start, sink);
  check(lines.size() == 2 && lines[0].find("sendSuccess\":true") != std::string::npos &&
        lines[1].find("sendSuccess\":false") != std::string::npos, "SD05 send result preserved without retries");
  std::cout << "summary passed=" << passed << " failed=" << failed << '\n';
  return failed ? 1 : 0;
}
