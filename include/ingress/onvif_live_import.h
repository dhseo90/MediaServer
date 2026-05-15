// 파일 요약: ONVIF live source import draft 생성 API를 선언한다.
// 동작 요약: ONVIF probe/fixture 결과를 기존 SourceRegistry/PublishedView 저장 draft로 변환한다.
#pragma once

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

RegistryResult BuildOnvifLiveImportDraft(const std::string& body);
std::vector<OnvifServiceSummary> ParseOnvifServicesSoap(const std::string& soap);
std::vector<OnvifMediaProfileSummary> ParseOnvifMediaProfilesSoap(const std::string& soap,
                                                                  const std::string& media_api);
bool AttachOnvifStreamUriSoap(const std::string& soap, OnvifMediaProfileSummary* profile);

}  // namespace ingress
