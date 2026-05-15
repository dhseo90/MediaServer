// 파일 요약: 실장비 없이 로컬 ONVIF simulator fixture로 probe 성공 경로를 검증한다.
// 동작 요약: loopback SOAP 서버가 GetServices/Media2 profile/stream URI 응답을 돌려 실제 HTTP transport와 adapter를 함께 확인한다.
#include <arpa/inet.h>
#include <netinet/in.h>
#include <poll.h>
#include <sys/socket.h>
#include <unistd.h>

#include <cstdlib>
#include <cstring>
#include <iostream>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

#include "ingress/onvif_live_import.h"

namespace {

constexpr int kExpectedRequestCount = 4;

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

std::string ReadHttpRequest(int fd) {
    std::string request;
    char buffer[1024];
    while (request.find("\r\n\r\n") == std::string::npos) {
        const ssize_t received = recv(fd, buffer, sizeof(buffer), 0);
        if (received <= 0) {
            return request;
        }
        request.append(buffer, static_cast<std::size_t>(received));
    }
    const std::size_t header_end = request.find("\r\n\r\n");
    const std::size_t length_header = request.find("Content-Length:");
    if (length_header == std::string::npos) {
        return request;
    }
    std::size_t value_start = length_header + std::string("Content-Length:").size();
    while (value_start < request.size() && request[value_start] == ' ') {
        ++value_start;
    }
    const std::size_t value_end = request.find("\r\n", value_start);
    const std::size_t content_length = static_cast<std::size_t>(
        std::strtoul(request.substr(value_start, value_end - value_start).c_str(), nullptr, 10));
    while (request.size() < header_end + 4 + content_length) {
        const ssize_t received = recv(fd, buffer, sizeof(buffer), 0);
        if (received <= 0) {
            break;
        }
        request.append(buffer, static_cast<std::size_t>(received));
    }
    return request;
}

bool SendAll(int fd, const std::string& payload) {
    std::size_t offset = 0;
    while (offset < payload.size()) {
        const ssize_t sent = send(fd, payload.data() + offset, payload.size() - offset, 0);
        if (sent <= 0) {
            return false;
        }
        offset += static_cast<std::size_t>(sent);
    }
    return true;
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
      <tr2:Profiles token="sim-main-h264">
        <tt:Name>Simulator Main H264</tt:Name>
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

std::string MediaProfilesEmptySoap() {
    return R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <trt:GetProfilesResponse xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
                             xmlns:tt="http://www.onvif.org/ver10/schema"/>
  </s:Body>
</s:Envelope>
)SOAP";
}

std::string StreamUriSoap() {
    return R"SOAP(
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <tr2:GetStreamUriResponse xmlns:tr2="http://www.onvif.org/ver20/media/wsdl"
                              xmlns:tt="http://www.onvif.org/ver10/schema">
      <tr2:MediaUri><tt:Uri>rtsps://192.0.2.60/live/sim-main</tt:Uri></tr2:MediaUri>
    </tr2:GetStreamUriResponse>
  </s:Body>
</s:Envelope>
)SOAP";
}

std::string FaultSoap(const std::string& detail) {
    return "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\"><s:Body>"
           "<s:Fault><s:Reason><s:Text>" + detail + "</s:Text></s:Reason></s:Fault>"
           "</s:Body></s:Envelope>";
}

std::pair<int, std::string> SimulatorResponse(const std::string& request) {
    if (Contains(request, "SOAPAction: \"GetServices\"") || Contains(request, "<tds:GetServices")) {
        return {200, ServicesSoap()};
    }
    if (Contains(request, "SOAPAction: \"Media2.GetProfiles\"") || Contains(request, "<tr2:GetProfiles")) {
        return {200, Media2ProfilesSoap()};
    }
    if (Contains(request, "SOAPAction: \"Media2.GetStreamUri\"") || Contains(request, "<tr2:GetStreamUri")) {
        return {200, StreamUriSoap()};
    }
    if (Contains(request, "SOAPAction: \"Media.GetProfiles\"") || Contains(request, "<trt:GetProfiles")) {
        return {200, MediaProfilesEmptySoap()};
    }
    return {500, FaultSoap("unsupported local simulator action")};
}

void SendHttpResponse(int fd, int status, const std::string& body) {
    std::ostringstream response;
    response << "HTTP/1.1 " << status << (status == 200 ? " OK" : " Fixture Fault") << "\r\n"
             << "Content-Type: application/soap+xml\r\n"
             << "Content-Length: " << body.size() << "\r\n"
             << "Connection: close\r\n"
             << "\r\n"
             << body;
    (void)SendAll(fd, response.str());
}

bool ContainsCredentialMaterial(const std::string& request) {
    return Contains(request, "operator-entered-secret") ||
           Contains(request, "Authorization:") ||
           Contains(request, "password=") ||
           Contains(request, "token-secret");
}

}  // namespace

int main() {
    const int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    Assert(listen_fd >= 0, "socket create failed");
    int reuse = 1;
    (void)setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    sockaddr_in addr {};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = 0;
    Assert(bind(listen_fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == 0, "loopback bind failed");
    Assert(listen(listen_fd, kExpectedRequestCount) == 0, "listen failed");

    socklen_t addr_len = sizeof(addr);
    Assert(getsockname(listen_fd, reinterpret_cast<sockaddr*>(&addr), &addr_len) == 0, "getsockname failed");
    const int port = ntohs(addr.sin_port);

    std::vector<std::string> captured_requests;
    std::string server_error;
    std::thread server_thread([&]() {
        for (int handled = 0; handled < kExpectedRequestCount; ++handled) {
            pollfd pfd {};
            pfd.fd = listen_fd;
            pfd.events = POLLIN;
            const int poll_rc = poll(&pfd, 1, 3000);
            if (poll_rc <= 0) {
                server_error = "local simulator timed out waiting for SOAP request";
                return;
            }
            const int client_fd = accept(listen_fd, nullptr, nullptr);
            if (client_fd < 0) {
                server_error = "local simulator accept failed";
                return;
            }
            const std::string request = ReadHttpRequest(client_fd);
            captured_requests.push_back(request);
            const auto response = SimulatorResponse(request);
            SendHttpResponse(client_fd, response.first, response.second);
            close(client_fd);
        }
    });

    ingress::OnvifProbeRequest request;
    request.endpoint = "http://127.0.0.1:" + std::to_string(port) + "/onvif/device_service";
    request.timeout_ms = 2500;
    request.credential_ref_present = true;

    const auto result = ingress::RunOnvifProbeAdapter(request, ingress::SendOnvifSoapHttp);
    server_thread.join();
    close(listen_fd);

    Assert(server_error.empty(), server_error);
    Assert(result.ok, "local simulator probe did not return ok: " + result.error);
    Assert(result.credential_ref_present, "credential reference summary was not preserved");
    Assert(result.plaintext_secret_included == false, "plaintext credential flag must remain false");
    Assert(HasService(result.services, "Device"), "Device service missing");
    Assert(HasService(result.services, "Media2"), "Media2 service missing");
    Assert(HasService(result.services, "Media"), "Media service missing");
    Assert(result.media_profiles.size() == 1, "live media profile count mismatch");

    const auto& profile = result.media_profiles.front();
    Assert(profile.selected, "simulator profile should be selected");
    Assert(profile.token == "sim-main-h264", "profile token mismatch");
    Assert(profile.name == "Simulator Main H264", "profile name mismatch");
    Assert(profile.media_api == "Media2", "profile media API mismatch");
    Assert(profile.encoding == "H264", "profile encoding mismatch");
    Assert(profile.width == 1920, "profile width mismatch");
    Assert(profile.height == 1080, "profile height mismatch");
    Assert(profile.fps == 30, "profile fps mismatch");
    Assert(profile.transport == "RTSP", "profile transport mismatch");
    Assert(profile.stream_uri == "rtsps://192.0.2.60/live/sim-main", "profile stream URI mismatch");

    Assert(captured_requests.size() == static_cast<std::size_t>(kExpectedRequestCount),
           "local simulator request count mismatch");
    Assert(Contains(captured_requests[0], "SOAPAction: \"GetServices\""), "GetServices request missing");
    Assert(Contains(captured_requests[1], "SOAPAction: \"Media2.GetProfiles\""),
           "Media2.GetProfiles request missing");
    Assert(Contains(captured_requests[2], "SOAPAction: \"Media2.GetStreamUri\""),
           "Media2.GetStreamUri request missing");
    Assert(Contains(captured_requests[2], "sim-main-h264"), "stream URI request missing selected profile token");
    Assert(Contains(captured_requests[3], "SOAPAction: \"Media.GetProfiles\""),
           "Media fallback profile request missing");
    for (const auto& captured : captured_requests) {
        Assert(Contains(captured, "POST /onvif/device_service HTTP/1.1"), "request line mismatch");
        Assert(!ContainsCredentialMaterial(captured), "local simulator request leaked credential material");
    }

    std::cout << "[pass] ONVIF local simulator fixture smoke (no real device endpoint used)\n";
    return 0;
}
