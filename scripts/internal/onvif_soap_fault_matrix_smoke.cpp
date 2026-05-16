// 파일 요약: ONVIF SOAP Fault/malformed response matrix의 실제 adapter 실패 요약을 JSON으로 출력한다.
// 동작 요약: fake transport로 fault/깨진 SOAP를 주입해 raw SOAP와 민감 진단이 실패 요약에 남지 않는지 확인한다.
#include <cstdlib>
#include <iostream>
#include <map>
#include <string>

#include "ingress/onvif_live_import.h"

namespace {

struct CaseResult {
    bool ok{false};
    std::string error;
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

ingress::OnvifProbeRequest BaseRequest() {
    ingress::OnvifProbeRequest request;
    request.endpoint = "http://192.0.2.20/onvif/device_service";
    request.timeout_ms = 3000;
    request.credential_ref_present = true;
    return request;
}

CaseResult FromProbeResult(const ingress::OnvifProbeResult& result) {
    return CaseResult{
        result.ok,
        result.error,
        result.credential_ref_present,
    };
}

std::string Media2ServicesSoap() {
    return R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <tds:GetServicesResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
      <tds:Service><tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace></tds:Service>
      <tds:Service><tds:Namespace>http://www.onvif.org/ver20/media/wsdl</tds:Namespace></tds:Service>
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
        </tt:VideoEncoderConfiguration>
      </tr2:Profiles>
    </tr2:GetProfilesResponse>
  </s:Body>
</s:Envelope>
)SOAP";
}

std::string SoapFault(const std::string& detail) {
    return "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\"><s:Body>"
           "<s:Fault><s:Code><s:Value>s:Receiver</s:Value></s:Code>"
           "<s:Reason><s:Text>" + detail + "</s:Text></s:Reason></s:Fault>"
           "</s:Body></s:Envelope>";
}

std::map<std::string, CaseResult> RunCases() {
    std::map<std::string, CaseResult> results;

    results["get-services-soap-fault"] = FromProbeResult(
        ingress::RunOnvifProbeAdapter(BaseRequest(), [](const ingress::OnvifSoapRequest& request) {
            if (request.action == "GetServices") {
                return ingress::OnvifSoapResponse{true, 200, SoapFault("InvalidArgVal"), ""};
            }
            return ingress::OnvifSoapResponse{false, 404, "", "unexpected action"};
        }));

    results["get-services-malformed-xml"] = FromProbeResult(
        ingress::RunOnvifProbeAdapter(BaseRequest(), [](const ingress::OnvifSoapRequest& request) {
            if (request.action == "GetServices") {
                return ingress::OnvifSoapResponse{
                    true,
                    200,
                    "<s:Envelope><s:Body><tds:GetServicesResponse><tds:Service>",
                    ""};
            }
            return ingress::OnvifSoapResponse{false, 404, "", "unexpected action"};
        }));

    results["get-services-http-500-soap-fault"] = FromProbeResult(
        ingress::RunOnvifProbeAdapter(BaseRequest(), [](const ingress::OnvifSoapRequest& request) {
            if (request.action == "GetServices") {
                return ingress::OnvifSoapResponse{false, 500, SoapFault("Receiver"), "raw fault"};
            }
            return ingress::OnvifSoapResponse{false, 404, "", "unexpected action"};
        }));

    results["get-profiles-soap-fault"] = FromProbeResult(
        ingress::RunOnvifProbeAdapter(BaseRequest(), [](const ingress::OnvifSoapRequest& request) {
            if (request.action == "GetServices") {
                return ingress::OnvifSoapResponse{true, 200, Media2ServicesSoap(), ""};
            }
            if (request.action == "Media2.GetProfiles") {
                return ingress::OnvifSoapResponse{true, 200, SoapFault("InvalidArgVal"), ""};
            }
            return ingress::OnvifSoapResponse{false, 404, "", "unexpected action"};
        }));

    results["get-stream-uri-malformed-xml"] = FromProbeResult(
        ingress::RunOnvifProbeAdapter(BaseRequest(), [](const ingress::OnvifSoapRequest& request) {
            if (request.action == "GetServices") {
                return ingress::OnvifSoapResponse{true, 200, Media2ServicesSoap(), ""};
            }
            if (request.action == "Media2.GetProfiles") {
                return ingress::OnvifSoapResponse{true, 200, Media2ProfilesSoap(), ""};
            }
            if (request.action == "Media2.GetStreamUri") {
                return ingress::OnvifSoapResponse{true, 200, "<s:Envelope><s:Body><tr2:GetStreamUriResponse>", ""};
            }
            return ingress::OnvifSoapResponse{false, 404, "", "unexpected action"};
        }));

    results["get-stream-uri-soap-fault-sensitive-detail"] = FromProbeResult(
        ingress::RunOnvifProbeAdapter(BaseRequest(), [](const ingress::OnvifSoapRequest& request) {
            if (request.action == "GetServices") {
                return ingress::OnvifSoapResponse{true, 200, Media2ServicesSoap(), ""};
            }
            if (request.action == "Media2.GetProfiles") {
                return ingress::OnvifSoapResponse{true, 200, Media2ProfilesSoap(), ""};
            }
            if (request.action == "Media2.GetStreamUri") {
                return ingress::OnvifSoapResponse{
                    true,
                    200,
                    SoapFault("AuthFailed realm=field nonce=secret-camera-token operator-entered-secret"),
                    ""};
            }
            return ingress::OnvifSoapResponse{false, 404, "", "unexpected action"};
        }));

    return results;
}

void PrintJson(const std::map<std::string, CaseResult>& results) {
    std::cout << "{\"schema\":\"media-server.onvif-soap-fault-malformed-actual.v1\",\"results\":{";
    bool first = true;
    for (const auto& [id, result] : results) {
        if (!first) {
            std::cout << ",";
        }
        first = false;
        std::cout << "\"" << JsonEscape(id) << "\":{"
                  << "\"ok\":" << (result.ok ? "true" : "false") << ","
                  << "\"error\":\"" << JsonEscape(result.error) << "\","
                  << "\"credentialRefPresent\":"
                  << (result.credential_ref_present ? "true" : "false")
                  << "}";
    }
    std::cout << "}}\n";
}

}  // namespace

int main() {
    PrintJson(RunCases());
    return 0;
}
