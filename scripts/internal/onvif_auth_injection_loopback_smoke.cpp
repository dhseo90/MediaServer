// 파일 요약: ONVIF credential reference가 있어도 인증 material이 HTTP/SOAP 요청에 주입되지 않는지 검증한다.
// 동작 요약: loopback 401 SOAP 서버가 캡처한 요청 header/body와 adapter 실패 요약의 redaction 경계를 확인한다.
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <cstdlib>
#include <cstring>
#include <iostream>
#include <sstream>
#include <string>
#include <thread>

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

std::string UnauthorizedSoap() {
    return R"SOAP(<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><s:Fault><s:Reason><s:Text>Unauthorized</s:Text></s:Reason></s:Fault></s:Body></s:Envelope>)SOAP";
}

std::string DeviceOnlySoap() {
    return R"SOAP(<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><tds:GetServicesResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><tds:Service><tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace></tds:Service></tds:GetServicesResponse></s:Body></s:Envelope>)SOAP";
}

bool ContainsAuthMaterial(const std::string& request) {
    return Contains(request, "Authorization:") ||
           Contains(request, "Cookie:") ||
           Contains(request, "UsernameToken") ||
           Contains(request, "PasswordDigest") ||
           Contains(request, "Basic ") ||
           Contains(request, "Digest ") ||
           Contains(request, "operator-entered-secret") ||
           Contains(request, "secret-camera-token") ||
           Contains(request, "password=");
}

class BasicFixtureProvider final : public ingress::CredentialSecretProvider {
  public:
    const char* ProviderId() const override {
        return "basic-fixture";
    }

    ingress::CredentialLookupResult Lookup(const ingress::CredentialLookupRequest& request) const override {
        ingress::CredentialLookupResult result;
        if (!request.credential_ref_present) {
            result.status = ingress::CredentialLookupStatus::kMissing;
            return result;
        }
        result.status = ingress::CredentialLookupStatus::kReady;
        result.secret_material_present = true;
        result.material.scheme = ingress::CredentialAuthScheme::kHttpBasic;
        result.material.username = "fixture-user";
        result.material.password = "fixture-password";
        return result;
    }
};

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
    Assert(listen(listen_fd, 1) == 0, "listen failed");

    socklen_t addr_len = sizeof(addr);
    Assert(getsockname(listen_fd, reinterpret_cast<sockaddr*>(&addr), &addr_len) == 0, "getsockname failed");
    const int port = ntohs(addr.sin_port);

    std::string captured_request;
    std::thread server_thread([&]() {
        const int client_fd = accept(listen_fd, nullptr, nullptr);
        if (client_fd < 0) {
            return;
        }
        captured_request = ReadHttpRequest(client_fd);
        const std::string body = UnauthorizedSoap();
        std::ostringstream response;
        response << "HTTP/1.1 401 Unauthorized\r\n"
                 << "Content-Type: application/soap+xml\r\n"
                 << "WWW-Authenticate: Digest realm=\"redacted-fixture\", nonce=\"fixture-nonce\"\r\n"
                 << "Content-Length: " << body.size() << "\r\n"
                 << "Connection: close\r\n"
                 << "\r\n"
                 << body;
        const std::string text = response.str();
        (void)send(client_fd, text.data(), text.size(), 0);
        close(client_fd);
    });

    ingress::OnvifProbeRequest request;
    request.endpoint = "http://127.0.0.1:" + std::to_string(port) + "/onvif/device_service";
    request.timeout_ms = 2000;
    request.credential_ref_present = true;

    const auto result = ingress::RunOnvifProbeAdapter(request, ingress::SendOnvifSoapHttp);
    server_thread.join();
    close(listen_fd);

    Assert(!result.ok, "credential reference auth loopback should fail without auth injection");
    Assert(result.credential_ref_present, "credential reference presence was not preserved");
    Assert(result.plaintext_secret_included == false, "plaintext credential flag must remain false");
    Assert(result.error == "ONVIF probe failed at GetServices: HTTP 401", "sanitized 401 summary mismatch");
    Assert(Contains(captured_request, "POST /onvif/device_service HTTP/1.1"), "request line mismatch");
    Assert(Contains(captured_request, "SOAPAction: \"GetServices\""), "SOAPAction missing");
    Assert(!ContainsAuthMaterial(captured_request), "auth material was injected into ONVIF SOAP request");
    Assert(!Contains(result.error, "redacted-fixture"), "failure summary leaked auth realm");
    Assert(!Contains(result.error, "fixture-nonce"), "failure summary leaked auth nonce");
    Assert(!Contains(result.error, "127.0.0.1"), "failure summary leaked endpoint");

    const int auth_listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    Assert(auth_listen_fd >= 0, "auth socket create failed");
    (void)setsockopt(auth_listen_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    sockaddr_in auth_addr {};
    auth_addr.sin_family = AF_INET;
    auth_addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    auth_addr.sin_port = 0;
    Assert(bind(auth_listen_fd, reinterpret_cast<sockaddr*>(&auth_addr), sizeof(auth_addr)) == 0,
           "auth loopback bind failed");
    Assert(listen(auth_listen_fd, 1) == 0, "auth listen failed");

    socklen_t auth_addr_len = sizeof(auth_addr);
    Assert(getsockname(auth_listen_fd, reinterpret_cast<sockaddr*>(&auth_addr), &auth_addr_len) == 0,
           "auth getsockname failed");
    const int auth_port = ntohs(auth_addr.sin_port);

    std::string captured_auth_request;
    std::thread auth_server_thread([&]() {
        const int client_fd = accept(auth_listen_fd, nullptr, nullptr);
        if (client_fd < 0) {
            return;
        }
        captured_auth_request = ReadHttpRequest(client_fd);
        const std::string body = DeviceOnlySoap();
        std::ostringstream response;
        response << "HTTP/1.1 200 OK\r\n"
                 << "Content-Type: application/soap+xml\r\n"
                 << "Content-Length: " << body.size() << "\r\n"
                 << "Connection: close\r\n"
                 << "\r\n"
                 << body;
        const std::string text = response.str();
        (void)send(client_fd, text.data(), text.size(), 0);
        close(client_fd);
    });

    ingress::OnvifProbeRequest auth_request;
    auth_request.endpoint = "http://127.0.0.1:" + std::to_string(auth_port) + "/onvif/device_service";
    auth_request.timeout_ms = 2000;
    auth_request.credential_ref_present = true;
    auth_request.credential_ref = "redacted-reference";

    const BasicFixtureProvider basic_provider;
    const auto auth_result = ingress::RunOnvifProbeAdapter(
        auth_request,
        ingress::SendOnvifSoapHttp,
        basic_provider);
    auth_server_thread.join();
    close(auth_listen_fd);

    Assert(!auth_result.ok, "basic auth fixture should stop after device-only service response");
    Assert(auth_result.credential_ref_present, "auth credential reference presence was not preserved");
    Assert(auth_result.plaintext_secret_included == false, "auth plaintext credential flag must remain false");
    Assert(auth_result.error == "ONVIF probe failed at GetServices: Media or Media2 service is required",
           "auth sanitized service summary mismatch");
    Assert(Contains(captured_auth_request,
                    "Authorization: Basic Zml4dHVyZS11c2VyOmZpeHR1cmUtcGFzc3dvcmQ="),
           "HTTP Basic Authorization header missing");
    Assert(!Contains(captured_auth_request, "fixture-user:fixture-password"),
           "auth request leaked unencoded basic credential");
    Assert(!Contains(captured_auth_request, "UsernameToken"), "unexpected UsernameToken was injected");
    Assert(!Contains(auth_result.error, "fixture-user"), "auth failure summary leaked username");
    Assert(!Contains(auth_result.error, "fixture-password"), "auth failure summary leaked password");
    Assert(!Contains(auth_result.error, "redacted-reference"), "auth failure summary leaked credential reference");

    std::cout << "[pass] ONVIF auth injection loopback smoke (default reference-only and provider Basic)\n";
    return 0;
}
