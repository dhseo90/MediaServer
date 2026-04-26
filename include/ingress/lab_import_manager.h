// 파일 요약: /lab/import 개발용 import job manager를 선언한다.
// 동작 요약: job 생성, 조회, 목록, 상태 snapshot, worker 실행 계약을 제공한다.
// 동작 요약: 외부 URL을 repo video root의 재사용 가능한 샘플 파일로 정규화한다.
#pragma once

#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace ingress {

struct LabImportJobRequest {
    std::string provider;
    std::string url;
    std::string target_file_name;
};

struct LabImportJobSnapshot {
    std::string job_id;
    std::string provider;
    std::string source_url;
    std::string requested_file_name;
    std::string stored_file_token;
    std::string status;
    std::string error_message;
    std::string log_excerpt;
    int exit_code{-1};
    std::int64_t created_at_ms{0};
    std::int64_t updated_at_ms{0};
    std::int64_t started_at_ms{0};
    std::int64_t finished_at_ms{0};
};

class LabImportManager {
public:
    LabImportManager();
    ~LabImportManager();

    LabImportJobSnapshot CreateJob(const LabImportJobRequest& request, std::string* error_message);
    std::vector<LabImportJobSnapshot> ListJobs() const;
    std::optional<LabImportJobSnapshot> GetJob(const std::string& job_id) const;

private:
    struct State;

    std::shared_ptr<State> state_;
};

}  // namespace ingress
