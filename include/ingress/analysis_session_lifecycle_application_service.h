#pragma once

#include <cstddef>
#include <string>
#include <unordered_map>

namespace ingress {

struct AnalysisSessionLifecycleApplicationRequest {
    std::string protocol;
    std::string path;
    std::unordered_map<std::string, std::string> query;
    std::string client_id;
};

struct AnalysisSessionLifecycleApplicationAttachResult {
    bool ok{false};
    std::string message;
    std::string tap_id;
    std::string stream_key;
    bool stream_created{false};
    bool reused{false};
    std::string reuse_key;
    std::size_t ref_count{0};
};

struct AnalysisSessionLifecycleApplicationDetachResult {
    bool ok{false};
    bool removed{false};
    std::string tap_id;
    std::string reuse_key;
    std::size_t ref_count{0};
};

class AnalysisSessionLifecycleApplicationService {
public:
    virtual ~AnalysisSessionLifecycleApplicationService() = default;

    virtual AnalysisSessionLifecycleApplicationAttachResult Attach(
        const AnalysisSessionLifecycleApplicationRequest& request) = 0;
    virtual AnalysisSessionLifecycleApplicationDetachResult Detach(
        const std::string& tap_id) = 0;
};

}  // namespace ingress
