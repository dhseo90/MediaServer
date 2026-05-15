// 파일 요약: ONVIF credential provider interface skeleton을 컴파일 smoke로 검증한다.
// 동작 요약: none provider가 secret material 없이 sanitized 상태 코드만 반환하는지 확인한다.
#include <cstdlib>
#include <iostream>
#include <string>

#include "ingress/onvif_credential_provider.h"

namespace {

void Assert(bool condition, const std::string& message) {
    if (!condition) {
        std::cerr << "[fail] " << message << "\n";
        std::exit(1);
    }
}

}  // namespace

int main() {
    const auto& provider = ingress::NoneOnvifCredentialProvider();
    Assert(std::string(provider.ProviderId()) == "none", "provider id mismatch");

    ingress::CredentialLookupRequest missing_request;
    missing_request.credential_ref_present = false;
    const auto missing = provider.Lookup(missing_request);
    Assert(missing.status == ingress::CredentialLookupStatus::kMissing, "missing status mismatch");
    Assert(!missing.secret_material_present, "missing lookup exposed secret material");
    Assert(missing.material.scheme == ingress::CredentialAuthScheme::kNone, "missing auth scheme mismatch");
    Assert(std::string(ingress::CredentialLookupStatusCode(missing.status)) == "credential_missing",
           "missing status code mismatch");

    ingress::CredentialLookupRequest referenced_request;
    referenced_request.credential_ref_present = true;
    const auto referenced = provider.Lookup(referenced_request);
    Assert(referenced.status == ingress::CredentialLookupStatus::kProviderUnavailable,
           "referenced status mismatch");
    Assert(!referenced.secret_material_present, "referenced lookup exposed secret material");
    Assert(referenced.material.scheme == ingress::CredentialAuthScheme::kNone, "referenced auth scheme mismatch");
    Assert(std::string(ingress::CredentialLookupStatusCode(referenced.status)) ==
               "credential_provider_unavailable",
           "referenced status code mismatch");

    Assert(std::string(ingress::CredentialLookupStatusCode(ingress::CredentialLookupStatus::kReady)) ==
               "credential_ready",
           "ready status code mismatch");
    Assert(std::string(ingress::CredentialAuthSchemeCode(ingress::CredentialAuthScheme::kNone)) == "none",
           "none auth scheme code mismatch");
    Assert(std::string(ingress::CredentialAuthSchemeCode(ingress::CredentialAuthScheme::kHttpBasic)) ==
               "http_basic",
           "basic auth scheme code mismatch");

    Assert(std::string(ingress::CredentialLookupStatusCode(ingress::CredentialLookupStatus::kDenied)) ==
               "credential_denied",
           "denied status code mismatch");
    Assert(std::string(ingress::CredentialLookupStatusCode(ingress::CredentialLookupStatus::kExpired)) ==
               "credential_expired",
           "expired status code mismatch");
    Assert(std::string(ingress::CredentialLookupStatusCode(
               ingress::CredentialLookupStatus::kMaterialRejected)) == "credential_material_rejected",
           "material rejected status code mismatch");

    std::cout << "[pass] ONVIF credential provider skeleton smoke\n";
    return 0;
}
