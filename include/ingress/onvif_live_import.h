// 파일 요약: ONVIF live source import draft 생성 API를 선언한다.
// 동작 요약: ONVIF probe/fixture 결과를 기존 SourceRegistry/PublishedView 저장 draft로 변환한다.
#pragma once

#include <functional>
#include <string>
#include <vector>

#include "ingress/source_view_registry.h"

namespace ingress {

struct OnvifServiceSummary {
    std::string name;
    std::string namespace_uri;
    bool available{false};
};

struct OnvifMediaProfileSummary {
    std::string token;
    std::string name;
    std::string media_api;
    std::string encoding;
    int width{0};
    int height{0};
    int fps{0};
    std::string transport;
    std::string stream_uri;
    bool selected{false};
};

struct OnvifProbeRequest {
    std::string endpoint;
    int timeout_ms{3000};
    bool credential_ref_present{false};
};

struct OnvifSoapRequest {
    std::string action;
    std::string endpoint;
    std::string body;
    int timeout_ms{3000};
};

struct OnvifSoapResponse {
    bool ok{false};
    int status{0};
    std::string body;
    std::string error;
};

struct OnvifProbeResult {
    bool ok{false};
    std::string error;
    bool credential_ref_present{false};
    bool plaintext_secret_included{false};
    std::vector<OnvifServiceSummary> services;
    std::vector<OnvifMediaProfileSummary> media_profiles;
};

using OnvifSoapTransport = std::function<OnvifSoapResponse(const OnvifSoapRequest&)>;

RegistryResult BuildOnvifLiveImportDraft(const std::string& body);
std::vector<OnvifServiceSummary> ParseOnvifServicesSoap(const std::string& soap);
std::vector<OnvifMediaProfileSummary> ParseOnvifMediaProfilesSoap(const std::string& soap,
                                                                  const std::string& media_api);
bool AttachOnvifStreamUriSoap(const std::string& soap, OnvifMediaProfileSummary* profile);
OnvifProbeResult RunOnvifProbeAdapter(const OnvifProbeRequest& request,
                                      const OnvifSoapTransport& transport);
OnvifSoapResponse SendOnvifSoapHttp(const OnvifSoapRequest& request);

}  // namespace ingress
