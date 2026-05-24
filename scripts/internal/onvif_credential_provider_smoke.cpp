// 파일 요약: ONVIF credential provider와 fixture store를 컴파일 smoke로 검증한다.
// 동작 요약: none provider는 닫힌 상태를, in-memory provider는 저장된 Basic material만 반환하는지 확인한다.
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
    std::cout << "[pass] ONVIF none credential provider missing lookup returns no material\n";

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
    std::cout << "[pass] ONVIF none credential provider referenced lookup returns unavailable without material\n";

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
    std::cout << "[pass] ONVIF credential provider ready status code is stable\n";
    std::cout << "[pass] ONVIF credential provider denied status code is stable\n";
    std::cout << "[pass] ONVIF credential provider expired status code is stable\n";
    std::cout << "[pass] ONVIF credential provider material-rejected status code is stable\n";
    std::cout << "[pass] ONVIF credential provider none auth scheme code is stable\n";
    std::cout << "[pass] ONVIF credential provider http-basic auth scheme code is stable\n";

    ingress::InMemoryCredentialSecretProvider store("fixture-store");
    Assert(std::string(store.ProviderId()) == "fixture-store", "in-memory provider id mismatch");
    Assert(store.Size() == 0, "new in-memory store should be empty");
    Assert(!store.UpsertHttpBasic("", "fixture-user", "fixture-password"),
           "empty credential ref should be rejected");
    Assert(!store.UpsertHttpBasic("operator-entered-secret", "", "fixture-password"),
           "empty username should be rejected");
    Assert(!store.UpsertHttpBasic("operator-entered-secret", "fixture-user", ""),
           "empty password should be rejected");
    Assert(store.UpsertHttpBasic("operator-entered-secret", "fixture-user", "fixture-password"),
           "valid Basic credential should be stored");
    Assert(store.Size() == 1, "stored credential count mismatch");
    std::cout << "[pass] ONVIF in-memory credential provider stores only valid Basic credentials\n";

    ingress::CredentialLookupRequest lookup_request;
    lookup_request.credential_ref_present = true;
    lookup_request.credential_ref = "operator-entered-secret";
    const auto ready = store.Lookup(lookup_request);
    Assert(ready.status == ingress::CredentialLookupStatus::kReady, "store ready status mismatch");
    Assert(ready.secret_material_present, "store ready lookup should expose material to probe runtime");
    Assert(ready.material.scheme == ingress::CredentialAuthScheme::kHttpBasic,
           "store ready auth scheme mismatch");
    Assert(ready.material.username == "fixture-user", "store ready username mismatch");
    Assert(ready.material.password == "fixture-password", "store ready password mismatch");
    std::cout << "[pass] ONVIF in-memory credential provider ready lookup exposes runtime material\n";

    Assert(store.MarkStatus("operator-entered-secret", ingress::CredentialLookupStatus::kDenied),
           "store status mark failed");
    const auto denied = store.Lookup(lookup_request);
    Assert(denied.status == ingress::CredentialLookupStatus::kDenied, "store denied status mismatch");
    Assert(!denied.secret_material_present, "denied lookup should not expose material");
    std::cout << "[pass] ONVIF in-memory credential provider denied status hides material\n";

    Assert(store.MarkStatus("operator-entered-secret", ingress::CredentialLookupStatus::kExpired),
           "store expired mark failed");
    const auto expired = store.Lookup(lookup_request);
    Assert(expired.status == ingress::CredentialLookupStatus::kExpired, "store expired status mismatch");
    Assert(!expired.secret_material_present, "expired lookup should not expose material");
    std::cout << "[pass] ONVIF in-memory credential provider expired status hides material\n";

    Assert(store.UpsertHttpBasic("operator-entered-secret", "fixture-user", "fixture-password"),
           "credential refresh should restore ready material");
    Assert(store.Erase("operator-entered-secret"), "credential erase should succeed");
    const auto erased = store.Lookup(lookup_request);
    Assert(erased.status == ingress::CredentialLookupStatus::kMissing, "erased status mismatch");
    Assert(!erased.secret_material_present, "erased lookup should not expose material");
    std::cout << "[pass] ONVIF in-memory credential provider erased lookup returns missing without material\n";

    std::cout << "[summary] ONVIF credential provider skeleton smoke complete\n";
    return 0;
}
