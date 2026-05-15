// 파일 요약: ONVIF credential provider 기본 구현을 제공한다.
// 동작 요약: none provider는 secret 저장소 조회 없이 sanitized 상태 코드만 반환한다.
#include "ingress/onvif_credential_provider.h"

namespace ingress {

const char* NoneCredentialSecretProvider::ProviderId() const {
    return "none";
}

CredentialLookupResult NoneCredentialSecretProvider::Lookup(const CredentialLookupRequest& request) const {
    CredentialLookupResult result;
    result.secret_material_present = false;
    result.status = request.credential_ref_present
        ? CredentialLookupStatus::kProviderUnavailable
        : CredentialLookupStatus::kMissing;
    return result;
}

const CredentialSecretProvider& NoneOnvifCredentialProvider() {
    static const NoneCredentialSecretProvider provider;
    return provider;
}

const char* CredentialLookupStatusCode(CredentialLookupStatus status) {
    switch (status) {
        case CredentialLookupStatus::kReady:
            return "credential_ready";
        case CredentialLookupStatus::kNotRequested:
            return "credential_not_requested";
        case CredentialLookupStatus::kMissing:
            return "credential_missing";
        case CredentialLookupStatus::kProviderUnavailable:
            return "credential_provider_unavailable";
        case CredentialLookupStatus::kDenied:
            return "credential_denied";
        case CredentialLookupStatus::kExpired:
            return "credential_expired";
        case CredentialLookupStatus::kMaterialRejected:
            return "credential_material_rejected";
    }
    return "credential_provider_unavailable";
}

const char* CredentialAuthSchemeCode(CredentialAuthScheme scheme) {
    switch (scheme) {
        case CredentialAuthScheme::kNone:
            return "none";
        case CredentialAuthScheme::kHttpBasic:
            return "http_basic";
    }
    return "none";
}

}  // namespace ingress
