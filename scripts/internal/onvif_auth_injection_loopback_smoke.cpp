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

    std::cout << "[pass] ONVIF auth injection loopback smoke (reference-only, no secret material)\n";
    return 0;
}
