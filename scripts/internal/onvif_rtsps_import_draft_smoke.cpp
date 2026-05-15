// 파일 요약: ONVIF automatic import draft가 rtsps:// live URI를 허용하는지 검증한다.
// 동작 요약: 합성 JSON만 사용해 rtsps:// streamUri가 기존 kind=rtsp source draft로 축약되는지 확인한다.
#include <cstdlib>
#include <iostream>
#include <string>

#include "ingress/onvif_live_import.h"

namespace {

void Assert(bool condition, const std::string& message) {
    if (!condition) {
        std::cerr << "[fail] " << message << "\n";
        std::exit(1);
    }
}

bool Contains(const std::string& value, const std::string& needle) {
    return value.find(needle) != std::string::npos;
}

}  // namespace

int main() {
    const std::string body = R"JSON(
{
  "device": {
    "endpoint": "http://192.0.2.35/onvif/device_service",
    "manufacturer": "SecureExample",
    "model": "SE-TLS"
  },
  "auth": {
    "required": false,
    "plaintextSecretIncluded": false
  },
  "profiles": [
    {
      "token": "secure-main",
      "name": "Secure Main",
      "mediaApi": "Media2",
      "encoding": "H264",
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "transport": "RTSP",
      "streamUri": "rtsps://192.0.2.35/live/secure-main",
      "selected": true
    }
  ],
  "importDecision": {
    "selectedProfileToken": "secure-main",
    "expectedSourceDraft": {
      "sourceId": "73",
      "displayName": "SecureExample Main",
      "kind": "rtsp",
      "rtspUrl": "rtsps://192.0.2.35/live/secure-main",
      "enabled": true,
      "tags": ["onvif", "live", "profile-t"],
      "ownerGroup": "ops"
    },
    "expectedPublishedViewDraft": {
      "viewId": "73",
      "displayName": "SecureExample Main",
      "sourceId": "73",
      "allowedOverlayModes": ["raw", "va-overlay", "va-rule"],
      "showDashboard": true,
      "showEvents": true,
      "showMetadataSummary": true,
      "clientGroups": ["default"],
      "maxTiles": 1,
      "enabled": true
    }
  }
}
)JSON";

    const auto result = ingress::BuildOnvifLiveImportDraft(body);
    Assert(result.status == 200, "rtsps import draft should be accepted");
    Assert(Contains(result.body, "\"ok\":true"), "draft response must be ok");
    Assert(Contains(result.body, "\"kind\":\"rtsp\""), "source draft kind must remain rtsp");
    Assert(Contains(result.body, "\"rtspUrl\":\"rtsps://192.0.2.35/live/secure-main\""),
           "source draft must preserve rtsps URL in rtspUrl");
    Assert(!Contains(result.body, "\"credentialRef\""), "draft response must not expose credentialRef");
    Assert(!Contains(result.body, "\"streamUri\""), "selectedProfile must not duplicate streamUri");

    std::cout << "[pass] ONVIF RTSPS import draft smoke\n";
    return 0;
}
