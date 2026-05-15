// 파일 요약: ONVIF credential provider의 최소 인터페이스를 선언한다.
// 동작 요약: 현재는 none provider로 secret 조회를 닫고 sanitized 상태 코드만 반환한다.
#pragma once

#include <string>

namespace ingress {

enum class CredentialLookupStatus {
    kNotRequested,
    kMissing,
    kProviderUnavailable,
    kDenied,
    kExpired,
    kMaterialRejected,
};

struct CredentialLookupRequest {
    bool credential_ref_present{false};
};

struct CredentialLookupResult {
    CredentialLookupStatus status{CredentialLookupStatus::kNotRequested};
    bool secret_material_present{false};
};

class CredentialSecretProvider {
  public:
    virtual ~CredentialSecretProvider() = default;

    virtual const char* ProviderId() const = 0;
    virtual CredentialLookupResult Lookup(const CredentialLookupRequest& request) const = 0;
};

class NoneCredentialSecretProvider final : public CredentialSecretProvider {
  public:
    const char* ProviderId() const override;
    CredentialLookupResult Lookup(const CredentialLookupRequest& request) const override;
};

const CredentialSecretProvider& NoneOnvifCredentialProvider();
const char* CredentialLookupStatusCode(CredentialLookupStatus status);

}  // namespace ingress
