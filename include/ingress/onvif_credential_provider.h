// 파일 요약: ONVIF credential provider와 fixture store 경계를 선언한다.
// 동작 요약: provider가 명시적으로 제공될 때만 저장된 HTTP auth material을 probe 요청에 연결한다.
#pragma once

#include <cstddef>
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

class InMemoryCredentialSecretProvider final : public CredentialSecretProvider {
  public:
    explicit InMemoryCredentialSecretProvider(std::string provider_id = "in-memory");

    const char* ProviderId() const override;
    CredentialLookupResult Lookup(const CredentialLookupRequest& request) const override;
    bool UpsertHttpBasic(std::string credential_ref, std::string username, std::string password);
    bool MarkStatus(const std::string& credential_ref, CredentialLookupStatus status);
    bool Erase(const std::string& credential_ref);
    std::size_t Size() const;

  private:
    struct Record {
        std::string credential_ref;
        CredentialLookupStatus status{CredentialLookupStatus::kReady};
        CredentialSecretMaterial material;
    };

    Record* FindMutable(const std::string& credential_ref);
    const Record* Find(const std::string& credential_ref) const;

    std::string provider_id_;
    std::vector<Record> records_;
};

const CredentialSecretProvider& NoneOnvifCredentialProvider();
const char* CredentialLookupStatusCode(CredentialLookupStatus status);
const char* CredentialAuthSchemeCode(CredentialAuthScheme scheme);

}  // namespace ingress
