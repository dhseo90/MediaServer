// 파일 요약: ONVIF probe adapter가 SOAP action 순서와 sanitize된 실패 요약을 지키는지 검증한다.
// 동작 요약: 네트워크 대신 fake transport를 주입해 endpoint/timeout 전달과 parser 연결을 확인한다.
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

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

bool HasService(const std::vector<ingress::OnvifServiceSummary>& services,
                const std::string& name) {
    for (const auto& service : services) {
        if (service.name == name && service.available) {
            return true;
        }
    }
    return false;
}

std::string ServicesSoap() {
    return R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <tds:GetServicesResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
      <tds:Service><tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace></tds:Service>
      <tds:Service><tds:Namespace>http://www.onvif.org/ver20/media/wsdl</tds:Namespace></tds:Service>
      <tds:Service><tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace></tds:Service>
    </tds:GetServicesResponse>
  </s:Body>
</s:Envelope>
)SOAP";
}

std::string Media2ProfilesSoap() {
    return R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <tr2:GetProfilesResponse xmlns:tr2="http://www.onvif.org/ver20/media/wsdl"
                             xmlns:tt="http://www.onvif.org/ver10/schema">
      <tr2:Profiles token="field-main-h264">
        <tt:Name>Field Main H264</tt:Name>
        <tt:VideoEncoderConfiguration>
          <tt:Encoding>H264</tt:Encoding>
          <tt:Resolution><tt:Width>1920</tt:Width><tt:Height>1080</tt:Height></tt:Resolution>
          <tt:RateControl><tt:FrameRateLimit>30</tt:FrameRateLimit></tt:RateControl>
        </tt:VideoEncoderConfiguration>
      </tr2:Profiles>
    </tr2:GetProfilesResponse>
  </s:Body>
</s:Envelope>
)SOAP";
}

std::string StreamUriSoap() {
    return R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <trt:GetStreamUriResponse xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
                              xmlns:tt="http://www.onvif.org/ver10/schema">
      <trt:MediaUri><tt:Uri>rtsp://192.0.2.30/live/main</tt:Uri></trt:MediaUri>
    </trt:GetStreamUriResponse>
  </s:Body>
</s:Envelope>
)SOAP";
}

}  // namespace

int main() {
    ingress::OnvifProbeRequest request;
    request.endpoint = "http://192.0.2.30/onvif/device_service";
    request.timeout_ms = 2500;
    request.credential_ref_present = true;

    std::vector<std::string> actions;
    const auto result = ingress::RunOnvifProbeAdapter(
        request,
        [&](const ingress::OnvifSoapRequest& soap_request) {
            actions.push_back(soap_request.action);
            Assert(soap_request.endpoint == request.endpoint, "probe endpoint was not passed to transport");
            Assert(soap_request.timeout_ms == request.timeout_ms, "probe timeout was not passed to transport");
            if (soap_request.action == "GetServices") {
                return ingress::OnvifSoapResponse{true, 200, ServicesSoap(), ""};
            }
            if (soap_request.action == "Media2.GetProfiles") {
                return ingress::OnvifSoapResponse{true, 200, Media2ProfilesSoap(), ""};
            }
            if (soap_request.action == "Media2.GetStreamUri") {
                Assert(Contains(soap_request.body, "field-main-h264"), "stream URI request missing profile token");
                return ingress::OnvifSoapResponse{true, 200, StreamUriSoap(), ""};
            }
            return ingress::OnvifSoapResponse{false, 404, "", "not implemented"};
        });

    Assert(result.ok, "probe adapter did not return ok");
    Assert(result.credential_ref_present, "credential reference summary was not preserved");
    Assert(result.plaintext_secret_included == false, "plaintext credential flag must remain false");
    Assert(HasService(result.services, "Device"), "Device service missing");
    Assert(HasService(result.services, "Media2"), "Media2 service missing");
    Assert(result.media_profiles.size() == 1, "live media profile count mismatch");
    Assert(result.media_profiles.front().selected, "first live profile should be selected");
    Assert(result.media_profiles.front().stream_uri == "rtsp://192.0.2.30/live/main", "stream URI mismatch");
    Assert(actions.size() >= 3, "expected service/profile/stream actions");
    Assert(actions[0] == "GetServices", "first action must be GetServices");

    const auto failure = ingress::RunOnvifProbeAdapter(
        request,
        [](const ingress::OnvifSoapRequest&) {
            return ingress::OnvifSoapResponse{false, 401, "", "operator-entered-secret at http://192.0.2.30"};
        });
    Assert(!failure.ok, "failure probe should not be ok");
    Assert(!Contains(failure.error, "operator-entered-secret"), "failure summary leaked credential reference");
    Assert(!Contains(failure.error, "192.0.2.30"), "failure summary leaked endpoint");
    Assert(Contains(failure.error, "GetServices"), "failure summary should include failed step");

    std::cout << "[pass] ONVIF probe adapter action/sanitization smoke\n";
    return 0;
}
