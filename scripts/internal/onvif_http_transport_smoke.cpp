// 파일 요약: ONVIF HTTP SOAP transport가 실제 HTTP POST와 응답 수신을 수행하는지 검증한다.
// 동작 요약: 로컬 loopback SOAP 서버를 띄워 endpoint/headers/body 전송과 실패 redaction을 확인한다.
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

std::string ServicesSoap() {
    return R"SOAP(<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><tds:GetServicesResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><tds:Service><tds:Namespace>http://www.onvif.org/ver20/media/wsdl</tds:Namespace></tds:Service></tds:GetServicesResponse></s:Body></s:Envelope>)SOAP";
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
        const std::string body = ServicesSoap();
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

    ingress::OnvifSoapRequest request;
    request.action = "GetServices";
    request.endpoint = "http://127.0.0.1:" + std::to_string(port) + "/onvif/device_service";
    request.body = "<s:Envelope><s:Body><GetServices/></s:Body></s:Envelope>";
    request.timeout_ms = 2000;

    const auto response = ingress::SendOnvifSoapHttp(request);
    server_thread.join();
    close(listen_fd);

    Assert(response.ok, "HTTP SOAP response was not ok: " + response.error);
    Assert(response.status == 200, "HTTP status mismatch");
    Assert(Contains(response.body, "GetServicesResponse"), "SOAP response body missing");
    Assert(Contains(captured_request, "POST /onvif/device_service HTTP/1.1"), "request line mismatch");
    Assert(Contains(captured_request, "Content-Type: application/soap+xml"), "content-type missing");
    Assert(Contains(captured_request, "SOAPAction: \"GetServices\""), "SOAPAction missing");
    Assert(Contains(captured_request, request.body), "SOAP request body missing");

    ingress::OnvifSoapRequest https_request;
    https_request.action = "GetServices";
    https_request.endpoint = "https://192.0.2.40/onvif/device_service";
    https_request.body = request.body;
    https_request.timeout_ms = 1000;
    const auto https_response = ingress::SendOnvifSoapHttp(https_request);
    Assert(!https_response.ok, "HTTPS transport should fail closed in current HTTP-only transport");
    Assert(!Contains(https_response.error, "192.0.2.40"), "transport error leaked endpoint");

    std::cout << "[pass] ONVIF HTTP SOAP transport smoke\n";
    return 0;
}
