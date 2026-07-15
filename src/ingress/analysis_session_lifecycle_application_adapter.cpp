#include "ingress/analysis_session_lifecycle_application_adapter.h"

#include <utility>

#include "analysis/analysis_query.h"

namespace ingress {
namespace {

class CanonicalAnalysisSessionLifecycleApplicationAdapter final
    : public AnalysisSessionLifecycleApplicationService {
public:
    explicit CanonicalAnalysisSessionLifecycleApplicationAdapter(
        analysis::AnalysisSessionService& service)
        : service_(service) {}

    AnalysisSessionLifecycleApplicationAttachResult Attach(
        const AnalysisSessionLifecycleApplicationRequest& request) override {
        media::IngressRequest canonical_request;
        canonical_request.protocol = request.protocol;
        canonical_request.path = request.path;
        canonical_request.query = request.query;
        canonical_request.client_id = request.client_id;
        const auto result = service_.AttachAnalysisTap(
            canonical_request,
            BuildAnalysisProfileFromQuery(canonical_request.query));
        AnalysisSessionLifecycleApplicationAttachResult output;
        output.ok = result.ok;
        output.message = result.message;
        output.tap_id = result.tap_id;
        output.stream_key = result.stream_key;
        output.stream_created = result.stream_created;
        output.reused = result.reused;
        output.reuse_key = result.reuse_key;
        output.ref_count = result.ref_count;
        return output;
    }

    AnalysisSessionLifecycleApplicationDetachResult Detach(
        const std::string& tap_id) override {
        const auto result = service_.DetachAnalysisTapRef(tap_id);
        AnalysisSessionLifecycleApplicationDetachResult output;
        output.ok = result.ok;
        output.removed = result.removed;
        output.tap_id = result.tap_id;
        output.reuse_key = result.reuse_key;
        output.ref_count = result.ref_count;
        return output;
    }

private:
    analysis::AnalysisSessionService& service_;
};

}  // namespace

std::unique_ptr<AnalysisSessionLifecycleApplicationService>
MakeAnalysisSessionLifecycleApplicationAdapter(analysis::AnalysisSessionService& service) {
    return std::make_unique<CanonicalAnalysisSessionLifecycleApplicationAdapter>(service);
}

}  // namespace ingress
