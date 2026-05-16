// 파일 요약: ONVIF credential provider 기본 구현과 fixture store를 제공한다.
// 동작 요약: none provider는 닫힌 상태를, in-memory provider는 명시 저장된 Basic material만 반환한다.
#include "ingress/onvif_credential_provider.h"

#include <algorithm>
#include <utility>

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

InMemoryCredentialSecretProvider::InMemoryCredentialSecretProvider(std::string provider_id)
    : provider_id_(std::move(provider_id)) {
    if (provider_id_.empty()) {
        provider_id_ = "in-memory";
    }
}

const char* InMemoryCredentialSecretProvider::ProviderId() const {
    return provider_id_.c_str();
}

CredentialLookupResult InMemoryCredentialSecretProvider::Lookup(
    const CredentialLookupRequest& request) const {
    CredentialLookupResult result;
    result.secret_material_present = false;
    if (!request.credential_ref_present || request.credential_ref.empty()) {
        result.status = CredentialLookupStatus::kMissing;
        return result;
    }
    const Record* record = Find(request.credential_ref);
    if (record == nullptr) {
        result.status = CredentialLookupStatus::kMissing;
        return result;
    }
    if (record->status != CredentialLookupStatus::kReady) {
        result.status = record->status;
        return result;
    }
    if (record->material.scheme != CredentialAuthScheme::kHttpBasic ||
        record->material.username.empty() ||
        record->material.password.empty()) {
        result.status = CredentialLookupStatus::kMaterialRejected;
        return result;
    }
    result.status = CredentialLookupStatus::kReady;
    result.secret_material_present = true;
    result.material = record->material;
    return result;
}

bool InMemoryCredentialSecretProvider::UpsertHttpBasic(std::string credential_ref,
                                                       std::string username,
                                                       std::string password) {
    if (credential_ref.empty() || username.empty() || password.empty()) {
        return false;
    }
    CredentialSecretMaterial material;
    material.scheme = CredentialAuthScheme::kHttpBasic;
    material.username = std::move(username);
    material.password = std::move(password);
    Record* existing = FindMutable(credential_ref);
    if (existing != nullptr) {
        existing->status = CredentialLookupStatus::kReady;
        existing->material = std::move(material);
        return true;
    }
    Record record;
    record.credential_ref = std::move(credential_ref);
    record.status = CredentialLookupStatus::kReady;
    record.material = std::move(material);
    records_.push_back(std::move(record));
    return true;
}

bool InMemoryCredentialSecretProvider::MarkStatus(const std::string& credential_ref,
                                                  CredentialLookupStatus status) {
    Record* record = FindMutable(credential_ref);
    if (record == nullptr || status == CredentialLookupStatus::kNotRequested) {
        return false;
    }
    record->status = status;
    return true;
}

bool InMemoryCredentialSecretProvider::Erase(const std::string& credential_ref) {
    const auto before = records_.size();
    records_.erase(
        std::remove_if(records_.begin(), records_.end(), [&](const Record& record) {
            return record.credential_ref == credential_ref;
        }),
        records_.end());
    return records_.size() != before;
}

std::size_t InMemoryCredentialSecretProvider::Size() const {
    return records_.size();
}

InMemoryCredentialSecretProvider::Record* InMemoryCredentialSecretProvider::FindMutable(
    const std::string& credential_ref) {
    for (auto& record : records_) {
        if (record.credential_ref == credential_ref) {
            return &record;
        }
    }
    return nullptr;
}

const InMemoryCredentialSecretProvider::Record* InMemoryCredentialSecretProvider::Find(
    const std::string& credential_ref) const {
    for (const auto& record : records_) {
        if (record.credential_ref == credential_ref) {
            return &record;
        }
    }
    return nullptr;
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
