// 파일 요약: 실장비 없이 로컬 ONVIF simulator fixture로 probe 성공/실패 variant를 검증한다.
// 동작 요약: loopback SOAP 서버가 Device/Media2/Media 응답 variant를 돌려 실제 HTTP transport와 adapter를 함께 확인한다.
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
#include <utility>
#include <vector>

#include "ingress/onvif_live_import.h"

namespace {

struct SimulatedProfile {
    std::string token;
    std::string name;
    std::string media_api;
    std::string encoding;
    int width{0};
    int height{0};
    int fps{0};
    std::string stream_uri;
};

struct LocalSimulatorScenario {
    std::string id;
    bool media2_available{false};
    bool media_available{false};
    std::vector<SimulatedProfile> media2_profiles;
    std::vector<SimulatedProfile> media_profiles;
    std::vector<std::string> expected_actions;
    bool expect_ok{false};
    SimulatedProfile expected_profile;
    std::string expected_error;
};

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

std::string MediaPrefix(const std::string& media_api) {
    return media_api == "Media2" ? "tr2" : "trt";
}

std::string MediaNamespace(const std::string& media_api) {
    return media_api == "Media2"
        ? "http://www.onvif.org/ver20/media/wsdl"
        : "http://www.onvif.org/ver10/media/wsdl";
}

std::string ServicesSoap(const LocalSimulatorScenario& scenario) {
    std::ostringstream out;
    out << "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\">"
        << "<s:Body>"
        << "<tds:GetServicesResponse xmlns:tds=\"http://www.onvif.org/ver10/device/wsdl\">"
        << "<tds:Service><tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace></tds:Service>";
    if (scenario.media2_available) {
        out << "<tds:Service><tds:Namespace>http://www.onvif.org/ver20/media/wsdl</tds:Namespace></tds:Service>";
    }
    if (scenario.media_available) {
        out << "<tds:Service><tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace></tds:Service>";
    }
    out << "</tds:GetServicesResponse></s:Body></s:Envelope>";
    return out.str();
}

std::string ProfilesSoap(const std::string& media_api, const std::vector<SimulatedProfile>& profiles) {
    const std::string prefix = MediaPrefix(media_api);
    std::ostringstream out;
    out << "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\">"
        << "<s:Body>"
        << "<" << prefix << ":GetProfilesResponse xmlns:" << prefix << "=\""
        << MediaNamespace(media_api) << "\" xmlns:tt=\"http://www.onvif.org/ver10/schema\">";
    for (const auto& profile : profiles) {
        out << "<" << prefix << ":Profiles token=\"" << profile.token << "\">"
            << "<tt:Name>" << profile.name << "</tt:Name>"
            << "<tt:VideoEncoderConfiguration>"
            << "<tt:Encoding>" << profile.encoding << "</tt:Encoding>"
            << "<tt:Resolution><tt:Width>" << profile.width << "</tt:Width><tt:Height>"
            << profile.height << "</tt:Height></tt:Resolution>"
            << "<tt:RateControl><tt:FrameRateLimit>" << profile.fps
            << "</tt:FrameRateLimit></tt:RateControl>"
            << "</tt:VideoEncoderConfiguration>"
            << "</" << prefix << ":Profiles>";
    }
    out << "</" << prefix << ":GetProfilesResponse></s:Body></s:Envelope>";
    return out.str();
}

std::string StreamUriSoap(const std::string& media_api, const std::string& uri) {
    const std::string prefix = MediaPrefix(media_api);
    std::ostringstream out;
    out << "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\">"
        << "<s:Body>"
        << "<" << prefix << ":GetStreamUriResponse xmlns:" << prefix << "=\""
        << MediaNamespace(media_api) << "\" xmlns:tt=\"http://www.onvif.org/ver10/schema\">"
        << "<" << prefix << ":MediaUri><tt:Uri>" << uri << "</tt:Uri></" << prefix << ":MediaUri>"
        << "</" << prefix << ":GetStreamUriResponse>"
        << "</s:Body></s:Envelope>";
    return out.str();
}

std::string FaultSoap(const std::string& detail) {
    return "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\"><s:Body>"
           "<s:Fault><s:Reason><s:Text>" + detail + "</s:Text></s:Reason></s:Fault>"
           "</s:Body></s:Envelope>";
}

const SimulatedProfile* FindProfile(const std::vector<SimulatedProfile>& profiles,
                                    const std::string& request) {
    for (const auto& profile : profiles) {
        if (Contains(request, profile.token)) {
            return &profile;
        }
    }
    return profiles.empty() ? nullptr : &profiles.front();
}

std::pair<int, std::string> SimulatorResponse(const LocalSimulatorScenario& scenario,
                                              const std::string& request) {
    if (Contains(request, "SOAPAction: \"GetServices\"") || Contains(request, "<tds:GetServices")) {
        return {200, ServicesSoap(scenario)};
    }
    if (Contains(request, "SOAPAction: \"Media2.GetProfiles\"") || Contains(request, "<tr2:GetProfiles")) {
        return {200, ProfilesSoap("Media2", scenario.media2_profiles)};
    }
    if (Contains(request, "SOAPAction: \"Media2.GetStreamUri\"") || Contains(request, "<tr2:GetStreamUri")) {
        const auto* profile = FindProfile(scenario.media2_profiles, request);
        return profile == nullptr
            ? std::make_pair(500, FaultSoap("missing Media2 simulator profile"))
            : std::make_pair(200, StreamUriSoap("Media2", profile->stream_uri));
    }
    if (Contains(request, "SOAPAction: \"Media.GetProfiles\"") || Contains(request, "<trt:GetProfiles")) {
        return {200, ProfilesSoap("Media", scenario.media_profiles)};
    }
    if (Contains(request, "SOAPAction: \"Media.GetStreamUri\"") || Contains(request, "<trt:GetStreamUri")) {
        const auto* profile = FindProfile(scenario.media_profiles, request);
        return profile == nullptr
            ? std::make_pair(500, FaultSoap("missing Media simulator profile"))
            : std::make_pair(200, StreamUriSoap("Media", profile->stream_uri));
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

int BindLoopbackSocket() {
    const int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    Assert(listen_fd >= 0, "socket create failed");
    int reuse = 1;
    (void)setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    sockaddr_in addr {};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = 0;
    Assert(bind(listen_fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == 0, "loopback bind failed");
    return listen_fd;
}

int BoundPort(int listen_fd) {
    sockaddr_in addr {};
    socklen_t addr_len = sizeof(addr);
    Assert(getsockname(listen_fd, reinterpret_cast<sockaddr*>(&addr), &addr_len) == 0, "getsockname failed");
    return ntohs(addr.sin_port);
}

void ValidateSelectedProfile(const std::string& id,
                             const ingress::OnvifProbeResult& result,
                             const SimulatedProfile& expected) {
    Assert(result.media_profiles.size() == 1, id + ": live media profile count mismatch");
    const auto& profile = result.media_profiles.front();
    Assert(profile.selected, id + ": simulator profile should be selected");
    Assert(profile.token == expected.token, id + ": profile token mismatch");
    Assert(profile.name == expected.name, id + ": profile name mismatch");
    Assert(profile.media_api == expected.media_api, id + ": profile media API mismatch");
    Assert(profile.encoding == expected.encoding, id + ": profile encoding mismatch");
    Assert(profile.width == expected.width, id + ": profile width mismatch");
    Assert(profile.height == expected.height, id + ": profile height mismatch");
    Assert(profile.fps == expected.fps, id + ": profile fps mismatch");
    Assert(profile.transport == "RTSP", id + ": profile transport mismatch");
    Assert(profile.stream_uri == expected.stream_uri, id + ": profile stream URI mismatch");
}

void RunScenario(const LocalSimulatorScenario& scenario) {
    const int listen_fd = BindLoopbackSocket();
    Assert(listen(listen_fd, static_cast<int>(scenario.expected_actions.size())) == 0, "listen failed");
    const int port = BoundPort(listen_fd);

    std::vector<std::string> captured_requests;
    std::string server_error;
    std::thread server_thread([&]() {
        for (std::size_t handled = 0; handled < scenario.expected_actions.size(); ++handled) {
            pollfd pfd {};
            pfd.fd = listen_fd;
            pfd.events = POLLIN;
            const int poll_rc = poll(&pfd, 1, 3000);
            if (poll_rc <= 0) {
                server_error = scenario.id + ": local simulator timed out waiting for SOAP request";
                return;
            }
            const int client_fd = accept(listen_fd, nullptr, nullptr);
            if (client_fd < 0) {
                server_error = scenario.id + ": local simulator accept failed";
                return;
            }
            const std::string request = ReadHttpRequest(client_fd);
            captured_requests.push_back(request);
            const auto response = SimulatorResponse(scenario, request);
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
    Assert(captured_requests.size() == scenario.expected_actions.size(),
           scenario.id + ": local simulator request count mismatch");
    for (std::size_t index = 0; index < scenario.expected_actions.size(); ++index) {
        Assert(Contains(captured_requests[index], "SOAPAction: \"" + scenario.expected_actions[index] + "\""),
               scenario.id + ": SOAP action mismatch at request " + std::to_string(index + 1));
        Assert(Contains(captured_requests[index], "POST /onvif/device_service HTTP/1.1"),
               scenario.id + ": request line mismatch");
        Assert(!ContainsCredentialMaterial(captured_requests[index]),
               scenario.id + ": local simulator request leaked credential material");
    }

    Assert(result.credential_ref_present, scenario.id + ": credential reference summary was not preserved");
    Assert(result.plaintext_secret_included == false, scenario.id + ": plaintext credential flag must remain false");

    if (scenario.expect_ok) {
        Assert(result.ok, scenario.id + ": local simulator probe did not return ok: " + result.error);
        Assert(HasService(result.services, "Device"), scenario.id + ": Device service missing");
        Assert(HasService(result.services, "Media2") == scenario.media2_available,
               scenario.id + ": Media2 service availability mismatch");
        Assert(HasService(result.services, "Media") == scenario.media_available,
               scenario.id + ": Media service availability mismatch");
        ValidateSelectedProfile(scenario.id, result, scenario.expected_profile);
    } else {
        Assert(!result.ok, scenario.id + ": local simulator failure variant unexpectedly returned ok");
        Assert(result.error == scenario.expected_error,
               scenario.id + ": failure wording mismatch: " + result.error);
        Assert(result.media_profiles.empty(), scenario.id + ": failure variant should not preserve live profiles");
    }

    std::cout << "[pass] ONVIF local simulator fixture variant: " << scenario.id << "\n";
}

SimulatedProfile Profile(const std::string& token,
                         const std::string& name,
                         const std::string& media_api,
                         const std::string& encoding,
                         int width,
                         int height,
                         int fps,
                         const std::string& stream_uri) {
    SimulatedProfile profile;
    profile.token = token;
    profile.name = name;
    profile.media_api = media_api;
    profile.encoding = encoding;
    profile.width = width;
    profile.height = height;
    profile.fps = fps;
    profile.stream_uri = stream_uri;
    return profile;
}

}  // namespace

int main() {
    const auto media2_primary = Profile(
        "sim-main-h264",
        "Simulator Main H264",
        "Media2",
        "H264",
        1920,
        1080,
        30,
        "rtsps://192.0.2.60/live/sim-main");
    const auto media_fallback = Profile(
        "sim-fallback-h265",
        "Simulator Fallback H265",
        "Media",
        "H265",
        1280,
        720,
        25,
        "rtsp://192.0.2.61/live/fallback");
    const auto media_only = Profile(
        "sim-media-only-h264",
        "Simulator Media Only H264",
        "Media",
        "H264",
        640,
        360,
        15,
        "rtsp://192.0.2.62/live/media-only");
    const auto non_rtsp = Profile(
        "sim-non-rtsp",
        "Simulator Non RTSP",
        "Media2",
        "H264",
        1920,
        1080,
        30,
        "http://192.0.2.63/live/not-rtsp.m3u8");

    const std::vector<LocalSimulatorScenario> scenarios = {
        LocalSimulatorScenario{
            "media2-primary-rtsps",
            true,
            true,
            {media2_primary},
            {},
            {"GetServices", "Media2.GetProfiles", "Media2.GetStreamUri", "Media.GetProfiles"},
            true,
            media2_primary,
            ""},
        LocalSimulatorScenario{
            "media-fallback-after-empty-media2",
            true,
            true,
            {},
            {media_fallback},
            {"GetServices", "Media2.GetProfiles", "Media.GetProfiles", "Media.GetStreamUri"},
            true,
            media_fallback,
            ""},
        LocalSimulatorScenario{
            "media-only",
            false,
            true,
            {},
            {media_only},
            {"GetServices", "Media.GetProfiles", "Media.GetStreamUri"},
            true,
            media_only,
            ""},
        LocalSimulatorScenario{
            "non-rtsp-stream-uri-failure",
            true,
            true,
            {non_rtsp},
            {},
            {"GetServices", "Media2.GetProfiles", "Media2.GetStreamUri", "Media.GetProfiles"},
            false,
            SimulatedProfile{},
            "ONVIF probe failed at GetStreamUri: no live RTSP profile discovered"},
    };

    for (const auto& scenario : scenarios) {
        RunScenario(scenario);
    }

    std::cout << "[summary] ONVIF local simulator fixture smoke complete: no real device endpoint used\n";
    return 0;
}
