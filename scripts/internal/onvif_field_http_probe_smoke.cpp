// 파일 요약: 실제 ONVIF HTTP endpoint를 probe하고 sanitized field smoke JSON만 출력한다.
// 동작 요약: RunOnvifProbeAdapter와 HTTP SOAP transport를 연결하되 endpoint/stream URI/credential 원문은 출력하지 않는다.
#include <cstdlib>
#include <iostream>
#include <string>

#include "ingress/onvif_live_import.h"

namespace {

struct Args {
    std::string endpoint;
    int timeout_ms{3000};
    bool credential_ref_present{false};
};

std::string JsonEscape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out += "\\\\";
                break;
            case '"':
                out += "\\\"";
                break;
            case '\n':
                out += "\\n";
                break;
            case '\r':
                out += "\\r";
                break;
            case '\t':
                out += "\\t";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

bool StartsWith(const std::string& value, const std::string& prefix) {
    return value.rfind(prefix, 0) == 0;
}

void PrintUsage(const char* argv0) {
    std::cerr << "Usage: " << argv0
              << " --endpoint <http-url> [--timeout-ms <ms>] [--credential-ref-present]\n";
}

Args ParseArgs(int argc, char** argv) {
    Args args;
    for (int index = 1; index < argc; ++index) {
        const std::string token = argv[index];
        if (token == "--endpoint" && index + 1 < argc) {
            args.endpoint = argv[++index];
            continue;
        }
        if (StartsWith(token, "--endpoint=")) {
            args.endpoint = token.substr(std::string("--endpoint=").size());
            continue;
        }
        if (token == "--timeout-ms" && index + 1 < argc) {
            args.timeout_ms = std::atoi(argv[++index]);
            continue;
        }
        if (StartsWith(token, "--timeout-ms=")) {
            args.timeout_ms = std::atoi(token.substr(std::string("--timeout-ms=").size()).c_str());
            continue;
        }
        if (token == "--credential-ref-present") {
            args.credential_ref_present = true;
            continue;
        }
        PrintUsage(argv[0]);
        std::exit(2);
    }
    return args;
}

void PrintJson(const ingress::OnvifProbeResult& result) {
    std::cout << "{"
              << "\"schema\":\"media-server.onvif-field-http-probe-result.v1\","
              << "\"ok\":" << (result.ok ? "true" : "false") << ","
              << "\"status\":\"" << (result.ok ? "pass" : "fail") << "\","
              << "\"error\":\"" << JsonEscape(result.error) << "\","
              << "\"credentialReferencePresent\":"
              << (result.credential_ref_present ? "true" : "false") << ","
              << "\"plaintextSecretIncluded\":false,"
              << "\"endpointRedacted\":true,"
              << "\"streamUriRedacted\":true,"
              << "\"rawSoapIncluded\":false,"
              << "\"services\":[";
    for (std::size_t index = 0; index < result.services.size(); ++index) {
        if (index > 0) {
            std::cout << ",";
        }
        const auto& service = result.services[index];
        std::cout << "{"
                  << "\"name\":\"" << JsonEscape(service.name) << "\","
                  << "\"available\":" << (service.available ? "true" : "false")
                  << "}";
    }
    std::cout << "],\"profilesDiscovered\":" << result.media_profiles.size();
    const ingress::OnvifMediaProfileSummary* selected = nullptr;
    for (const auto& profile : result.media_profiles) {
        if (profile.selected) {
            selected = &profile;
            break;
        }
    }
    if (selected == nullptr && !result.media_profiles.empty()) {
        selected = &result.media_profiles.front();
    }
    if (selected != nullptr) {
        std::cout << ",\"selectedProfile\":{"
                  << "\"token\":\"" << (selected->token.empty() ? "" : "<redacted-token>") << "\","
                  << "\"name\":\"" << (selected->name.empty() ? "" : "<redacted-name>") << "\","
                  << "\"mediaApi\":\"" << JsonEscape(selected->media_api) << "\","
                  << "\"encoding\":\"" << JsonEscape(selected->encoding) << "\","
                  << "\"width\":" << selected->width << ","
                  << "\"height\":" << selected->height << ","
                  << "\"fps\":" << selected->fps << ","
                  << "\"transport\":\"" << JsonEscape(selected->transport) << "\""
                  << "}";
    }
    std::cout << "}\n";
}

}  // namespace

int main(int argc, char** argv) {
    const Args args = ParseArgs(argc, argv);
    ingress::OnvifProbeRequest request;
    request.endpoint = args.endpoint;
    request.timeout_ms = args.timeout_ms;
    request.credential_ref_present = args.credential_ref_present;

    const auto result = ingress::RunOnvifProbeAdapter(request, ingress::SendOnvifSoapHttp);
    PrintJson(result);
    return result.ok ? 0 : 1;
}
