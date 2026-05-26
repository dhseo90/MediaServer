// 파일 요약: ONVIF SOAP parser가 service/profile/stream URI를 내부 live profile 모델로 축약하는지 검증한다.
// 동작 요약: 합성 SOAP 응답 문자열만 사용해 media path 없이 parser 단위 동작을 확인한다.
#include <iostream>
#include <cstdlib>
#include <string>
#include <vector>

#include "ingress/onvif_live_import.h"

namespace {

bool HasService(const std::vector<ingress::OnvifServiceSummary>& services,
                const std::string& name) {
    for (const auto& service : services) {
        if (service.name == name && service.available) {
            return true;
        }
    }
    return false;
}

void Assert(bool condition, const std::string& message) {
    if (!condition) {
        std::cerr << "[fail] " << message << "\n";
        std::exit(1);
    }
}

}  // namespace

int main() {
    const std::string services_soap = R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <tds:GetServicesResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
      <tds:Service>
        <tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace>
      </tds:Service>
      <tds:Service>
        <tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace>
      </tds:Service>
      <tds:Service>
        <tds:Namespace>http://www.onvif.org/ver20/media/wsdl</tds:Namespace>
      </tds:Service>
    </tds:GetServicesResponse>
  </s:Body>
</s:Envelope>
)SOAP";

    const auto services = ingress::ParseOnvifServicesSoap(services_soap);
    Assert(HasService(services, "Device"), "Device service missing");
    Assert(HasService(services, "Media"), "Media service missing");
    Assert(HasService(services, "Media2"), "Media2 service missing");
    std::cout << "[pass] ONVIF SOAP parser extracts Device service\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media service\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media2 service\n";

    const std::string media2_profiles_soap = R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <tr2:GetProfilesResponse xmlns:tr2="http://www.onvif.org/ver20/media/wsdl"
                             xmlns:tt="http://www.onvif.org/ver10/schema">
      <tr2:Profiles token="field-main-h264">
        <tt:Name>Field Main H264</tt:Name>
        <tt:VideoEncoderConfiguration>
          <tt:Encoding>H264</tt:Encoding>
          <tt:Resolution>
            <tt:Width>1920</tt:Width>
            <tt:Height>1080</tt:Height>
          </tt:Resolution>
          <tt:RateControl>
            <tt:FrameRateLimit>30</tt:FrameRateLimit>
          </tt:RateControl>
        </tt:VideoEncoderConfiguration>
      </tr2:Profiles>
    </tr2:GetProfilesResponse>
  </s:Body>
</s:Envelope>
)SOAP";

    auto media2_profiles = ingress::ParseOnvifMediaProfilesSoap(media2_profiles_soap, "Media2");
    Assert(media2_profiles.size() == 1, "Media2 profile count mismatch");
    auto& main_profile = media2_profiles.front();
    Assert(main_profile.token == "field-main-h264", "Media2 profile token mismatch");
    Assert(main_profile.name == "Field Main H264", "Media2 profile name mismatch");
    Assert(main_profile.media_api == "Media2", "Media2 profile api mismatch");
    Assert(main_profile.encoding == "H264", "Media2 profile encoding mismatch");
    Assert(main_profile.width == 1920, "Media2 profile width mismatch");
    Assert(main_profile.height == 1080, "Media2 profile height mismatch");
    Assert(main_profile.fps == 30, "Media2 profile fps mismatch");
    std::cout << "[pass] ONVIF SOAP parser extracts Media2 profile token\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media2 profile name\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media2 profile api\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media2 profile encoding\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media2 profile width\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media2 profile height\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media2 profile fps\n";

    const std::string stream_uri_soap = R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <trt:GetStreamUriResponse xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
                              xmlns:tt="http://www.onvif.org/ver10/schema">
      <trt:MediaUri>
        <tt:Uri>rtsp://192.0.2.20/live/main</tt:Uri>
      </trt:MediaUri>
    </trt:GetStreamUriResponse>
  </s:Body>
</s:Envelope>
)SOAP";

    Assert(ingress::AttachOnvifStreamUriSoap(stream_uri_soap, &main_profile), "stream URI attach failed");
    Assert(main_profile.transport == "RTSP", "stream URI transport mismatch");
    Assert(main_profile.stream_uri == "rtsp://192.0.2.20/live/main", "stream URI mismatch");
    std::cout << "[pass] ONVIF SOAP parser attaches RTSP stream URI\n";

    const std::string media_profiles_soap = R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <trt:GetProfilesResponse xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
                             xmlns:tt="http://www.onvif.org/ver10/schema">
      <trt:Profiles token="field-sub-h265">
        <tt:Name>Field Sub H265</tt:Name>
        <tt:VideoEncoderConfiguration>
          <tt:Encoding>H.265</tt:Encoding>
          <tt:Resolution>
            <tt:Width>640</tt:Width>
            <tt:Height>360</tt:Height>
          </tt:Resolution>
          <tt:RateControl>
            <tt:FrameRateLimit>15</tt:FrameRateLimit>
          </tt:RateControl>
        </tt:VideoEncoderConfiguration>
      </trt:Profiles>
    </trt:GetProfilesResponse>
  </s:Body>
</s:Envelope>
)SOAP";

    const auto media_profiles = ingress::ParseOnvifMediaProfilesSoap(media_profiles_soap, "Media");
    Assert(media_profiles.size() == 1, "Media profile count mismatch");
    Assert(media_profiles.front().encoding == "H265", "Media profile H265 normalization mismatch");
    Assert(media_profiles.front().width == 640, "Media profile width mismatch");
    Assert(media_profiles.front().height == 360, "Media profile height mismatch");
    Assert(media_profiles.front().fps == 15, "Media profile fps mismatch");
    std::cout << "[pass] ONVIF SOAP parser normalizes Media H265 encoding\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media profile width\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media profile height\n";
    std::cout << "[pass] ONVIF SOAP parser extracts Media profile fps\n";

    std::cout << "[summary] ONVIF SOAP parser service/profile/stream smoke complete\n";
    return 0;
}
