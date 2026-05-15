// 파일 요약: ONVIF credential provider의 최소 인터페이스를 선언한다.
// 동작 요약: provider가 명시적으로 제공될 때만 HTTP auth material을 probe 요청에 연결한다.
#pragma once

#include <string>
#include <vector>

namespace ingress {

enum class CredentialLookupStatus {
    kReady,
    kNotRequested,
    kMissing,
    kProviderUnavailable,
    kDenied,
    kExpired,
    kMaterialRejected,
};

enum class CredentialAuthScheme {
    kNone,
    kHttpBasic,
};

struct CredentialSecretMaterial {
    CredentialAuthScheme scheme{CredentialAuthScheme::kNone};
    std::string username;
    std::string password;
};

struct CredentialLookupRequest {
    bool credential_ref_present{false};
    std::string credential_ref;
};

struct CredentialLookupResult {
    CredentialLookupStatus status{CredentialLookupStatus::kNotRequested};
    bool secret_material_present{false};
    CredentialSecretMaterial material;
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
const char* CredentialAuthSchemeCode(CredentialAuthScheme scheme);

}  // namespace ingress
