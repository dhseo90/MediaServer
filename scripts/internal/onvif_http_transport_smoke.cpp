// 파일 요약: ONVIF HTTP SOAP transport가 실제 HTTP POST와 응답 수신을 수행하는지 검증한다.
// 동작 요약: 로컬 loopback SOAP 서버를 띄워 endpoint/headers/body 전송과 실패 redaction을 확인한다.
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/err.h>
#include <openssl/ssl.h>
#endif

#include <cstdlib>
#include <cstring>
#include <iostream>
#include <memory>
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

std::string BuildSoapHttpResponse() {
    const std::string body = ServicesSoap();
    std::ostringstream response;
    response << "HTTP/1.1 200 OK\r\n"
             << "Content-Type: application/soap+xml\r\n"
             << "Content-Length: " << body.size() << "\r\n"
             << "Connection: close\r\n"
             << "\r\n"
             << body;
    return response.str();
}

int OpenLoopbackListener() {
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
    return listen_fd;
}

int ListenerPort(int listen_fd) {
    sockaddr_in addr {};
    socklen_t addr_len = sizeof(addr);
    Assert(getsockname(listen_fd, reinterpret_cast<sockaddr*>(&addr), &addr_len) == 0, "getsockname failed");
    return ntohs(addr.sin_port);
}

#if MEDIA_SERVER_USE_OPENSSL
struct SslContextDeleter {
    void operator()(SSL_CTX* ctx) const {
        SSL_CTX_free(ctx);
    }
};

struct SslDeleter {
    void operator()(SSL* ssl) const {
        SSL_free(ssl);
    }
};

std::string ReadTlsHttpRequest(SSL* ssl) {
    std::string request;
    char buffer[1024];
    while (request.find("\r\n\r\n") == std::string::npos) {
        const int received = SSL_read(ssl, buffer, sizeof(buffer));
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
        const int received = SSL_read(ssl, buffer, sizeof(buffer));
        if (received <= 0) {
            break;
        }
        request.append(buffer, static_cast<std::size_t>(received));
    }
    return request;
}

void RunHttpsTransportSmoke(const std::string& request_body) {
    const char* cert = std::getenv("MEDIA_SERVER_ONVIF_TLS_SERVER_CERT");
    const char* key = std::getenv("MEDIA_SERVER_ONVIF_TLS_SERVER_KEY");
    const char* ca = std::getenv("MEDIA_SERVER_ONVIF_TLS_CA_FILE");
    Assert(cert != nullptr && cert[0] != '\0', "HTTPS fixture server certificate is not configured");
    Assert(key != nullptr && key[0] != '\0', "HTTPS fixture server key is not configured");
    Assert(ca != nullptr && ca[0] != '\0', "HTTPS fixture CA file is not configured");

    const int listen_fd = OpenLoopbackListener();
    const int port = ListenerPort(listen_fd);
    std::string captured_request;
    std::thread server_thread([&]() {
        std::unique_ptr<SSL_CTX, SslContextDeleter> ctx(SSL_CTX_new(TLS_server_method()));
        Assert(static_cast<bool>(ctx), "TLS server context failed");
        Assert(SSL_CTX_use_certificate_file(ctx.get(), cert, SSL_FILETYPE_PEM) == 1, "TLS server cert load failed");
        Assert(SSL_CTX_use_PrivateKey_file(ctx.get(), key, SSL_FILETYPE_PEM) == 1, "TLS server key load failed");
        const int client_fd = accept(listen_fd, nullptr, nullptr);
        if (client_fd < 0) {
            return;
        }
        std::unique_ptr<SSL, SslDeleter> ssl(SSL_new(ctx.get()));
        Assert(static_cast<bool>(ssl), "TLS server session failed");
        Assert(SSL_set_fd(ssl.get(), client_fd) == 1, "TLS server fd setup failed");
        Assert(SSL_accept(ssl.get()) == 1, "TLS server accept failed");
        captured_request = ReadTlsHttpRequest(ssl.get());
        const std::string response = BuildSoapHttpResponse();
        (void)SSL_write(ssl.get(), response.data(), static_cast<int>(response.size()));
        (void)SSL_shutdown(ssl.get());
        close(client_fd);
    });

    ingress::OnvifSoapRequest request;
    request.action = "GetServices";
    request.endpoint = "https://localhost:" + std::to_string(port) + "/onvif/device_service";
    request.body = request_body;
    request.timeout_ms = 2000;

    const auto response = ingress::SendOnvifSoapHttp(request);
    server_thread.join();
    close(listen_fd);

    Assert(response.ok, "HTTPS SOAP response was not ok: " + response.error);
    Assert(response.status == 200, "HTTPS status mismatch");
    Assert(Contains(response.body, "GetServicesResponse"), "HTTPS SOAP response body missing");
    Assert(Contains(captured_request, "POST /onvif/device_service HTTP/1.1"), "HTTPS request line mismatch");
    Assert(Contains(captured_request, "SOAPAction: \"GetServices\""), "HTTPS SOAPAction missing");
    Assert(Contains(captured_request, request.body), "HTTPS SOAP request body missing");
    std::cout << "[pass] ONVIF HTTPS SOAP transport returns 200 response body\n";
    std::cout << "[pass] ONVIF HTTPS SOAP transport sends service request line\n";
    std::cout << "[pass] ONVIF HTTPS SOAP transport sends SOAPAction header\n";
    std::cout << "[pass] ONVIF HTTPS SOAP transport sends request body\n";

    ingress::OnvifSoapRequest https_userinfo_request;
    https_userinfo_request.action = "GetServices";
    https_userinfo_request.endpoint = "HTTPS://user:pass@localhost:" + std::to_string(port) + "/onvif/device_service";
    https_userinfo_request.body = request_body;
    https_userinfo_request.timeout_ms = 1000;
    const auto https_userinfo_response = ingress::SendOnvifSoapHttp(https_userinfo_request);
    Assert(!https_userinfo_response.ok, "HTTPS transport must reject URL userinfo");
    Assert(Contains(https_userinfo_response.error, "invalid endpoint URL"), "HTTPS userinfo rejection wording mismatch");
    Assert(!Contains(https_userinfo_response.error, "user"), "transport error leaked URL userinfo");
    Assert(!Contains(https_userinfo_response.error, "pass"), "transport error leaked URL password");
    Assert(!Contains(https_userinfo_response.error, "localhost"), "transport error leaked HTTPS host");
    Assert(!Contains(https_userinfo_response.error, "GetServices"), "transport error leaked SOAP action");
    std::cout << "[pass] ONVIF HTTPS SOAP transport rejects URL userinfo\n";
    std::cout << "[pass] ONVIF HTTPS SOAP transport redacts userinfo rejection details\n";
}

void AssertSanitizedTlsError(const ingress::OnvifSoapResponse& response,
                             const std::string& expected,
                             const std::string& label) {
    Assert(!response.ok, label + " should fail");
    Assert(Contains(response.error, expected), label + " error mismatch: " + response.error);
    Assert(!Contains(response.error, "localhost"), label + " error leaked host");
    Assert(!Contains(response.error, "127.0.0.1"), label + " error leaked loopback address");
    Assert(!Contains(response.error, "GetServices"), label + " error leaked SOAP action");
    Assert(!Contains(response.error, "fixture-user"), label + " error leaked username");
    Assert(!Contains(response.error, "fixture-password"), label + " error leaked password");
}

void RunHttpsTlsServerFailure(const std::string& label,
                              const std::string& cert_path,
                              const std::string& key_path,
                              const std::string& expected_error,
                              const std::string& request_body) {
    Assert(!cert_path.empty(), label + " server certificate is not configured");
    Assert(!key_path.empty(), label + " server key is not configured");

    const int listen_fd = OpenLoopbackListener();
    const int port = ListenerPort(listen_fd);
    std::thread server_thread([&]() {
        std::unique_ptr<SSL_CTX, SslContextDeleter> ctx(SSL_CTX_new(TLS_server_method()));
        if (!ctx ||
            SSL_CTX_use_certificate_file(ctx.get(), cert_path.c_str(), SSL_FILETYPE_PEM) != 1 ||
            SSL_CTX_use_PrivateKey_file(ctx.get(), key_path.c_str(), SSL_FILETYPE_PEM) != 1) {
            return;
        }
        const int client_fd = accept(listen_fd, nullptr, nullptr);
        if (client_fd < 0) {
            return;
        }
        std::unique_ptr<SSL, SslDeleter> ssl(SSL_new(ctx.get()));
        if (ssl && SSL_set_fd(ssl.get(), client_fd) == 1 && SSL_accept(ssl.get()) == 1) {
            const std::string response = BuildSoapHttpResponse();
            (void)SSL_write(ssl.get(), response.data(), static_cast<int>(response.size()));
            (void)SSL_shutdown(ssl.get());
        }
        close(client_fd);
    });

    ingress::OnvifSoapRequest request;
    request.action = "GetServices";
    request.endpoint = "https://localhost:" + std::to_string(port) + "/onvif/device_service";
    request.body = request_body;
    request.timeout_ms = 2000;
    const auto response = ingress::SendOnvifSoapHttp(request);
    server_thread.join();
    close(listen_fd);
    AssertSanitizedTlsError(response, expected_error, label);
    std::cout << "[pass] ONVIF " << label << " reports sanitized TLS error\n";
}

void RunHttpsHandshakeFailure(const std::string& request_body) {
    const int listen_fd = OpenLoopbackListener();
    const int port = ListenerPort(listen_fd);
    std::thread server_thread([&]() {
        const int client_fd = accept(listen_fd, nullptr, nullptr);
        if (client_fd < 0) {
            return;
        }
        const std::string text = "not a tls server\r\n";
        (void)send(client_fd, text.data(), text.size(), 0);
        close(client_fd);
    });

    ingress::OnvifSoapRequest request;
    request.action = "GetServices";
    request.endpoint = "https://localhost:" + std::to_string(port) + "/onvif/device_service";
    request.body = request_body;
    request.timeout_ms = 2000;
    const auto response = ingress::SendOnvifSoapHttp(request);
    server_thread.join();
    close(listen_fd);
    AssertSanitizedTlsError(response, "TLS handshake failed", "HTTPS handshake failure");
    std::cout << "[pass] ONVIF HTTPS handshake failure reports sanitized TLS error\n";
}

void RunHttpsConnectionRefused(const std::string& request_body) {
    const int listen_fd = OpenLoopbackListener();
    const int port = ListenerPort(listen_fd);
    close(listen_fd);

    ingress::OnvifSoapRequest request;
    request.action = "GetServices";
    request.endpoint = "https://127.0.0.1:" + std::to_string(port) + "/onvif/device_service";
    request.body = request_body;
    request.timeout_ms = 500;
    const auto response = ingress::SendOnvifSoapHttp(request);
    AssertSanitizedTlsError(response, "connect failed", "HTTPS connection refused");
    std::cout << "[pass] ONVIF HTTPS connection refused reports sanitized TLS error\n";
}

void RunHttpsTransportFailureMatrix(const std::string& request_body) {
    const char* untrusted_cert = std::getenv("MEDIA_SERVER_ONVIF_TLS_UNTRUSTED_SERVER_CERT");
    const char* untrusted_key = std::getenv("MEDIA_SERVER_ONVIF_TLS_UNTRUSTED_SERVER_KEY");
    const char* mismatch_cert = std::getenv("MEDIA_SERVER_ONVIF_TLS_MISMATCH_SERVER_CERT");
    const char* mismatch_key = std::getenv("MEDIA_SERVER_ONVIF_TLS_MISMATCH_SERVER_KEY");
    RunHttpsTlsServerFailure("HTTPS untrusted CA failure",
                             untrusted_cert == nullptr ? "" : untrusted_cert,
                             untrusted_key == nullptr ? "" : untrusted_key,
                             "TLS certificate verification failed",
                             request_body);
    RunHttpsTlsServerFailure("HTTPS hostname mismatch failure",
                             mismatch_cert == nullptr ? "" : mismatch_cert,
                             mismatch_key == nullptr ? "" : mismatch_key,
                             "TLS certificate verification failed",
                             request_body);
    RunHttpsHandshakeFailure(request_body);
    RunHttpsConnectionRefused(request_body);
}
#endif

}  // namespace

int main() {
    const int listen_fd = OpenLoopbackListener();
    const int port = ListenerPort(listen_fd);

    std::string captured_request;
    std::thread server_thread([&]() {
        const int client_fd = accept(listen_fd, nullptr, nullptr);
        if (client_fd < 0) {
            return;
        }
        captured_request = ReadHttpRequest(client_fd);
        const std::string text = BuildSoapHttpResponse();
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
    std::cout << "[pass] ONVIF HTTP SOAP transport returns 200 response body\n";
    std::cout << "[pass] ONVIF HTTP SOAP transport sends service request line\n";
    std::cout << "[pass] ONVIF HTTP SOAP transport sends application/soap+xml content type\n";
    std::cout << "[pass] ONVIF HTTP SOAP transport sends SOAPAction header\n";
    std::cout << "[pass] ONVIF HTTP SOAP transport sends request body\n";

#if MEDIA_SERVER_USE_OPENSSL
    RunHttpsTransportSmoke(request.body);
    RunHttpsTransportFailureMatrix(request.body);
#else
    ingress::OnvifSoapRequest https_request;
    https_request.action = "GetServices";
    https_request.endpoint = "https://192.0.2.40/onvif/device_service";
    https_request.body = request.body;
    https_request.timeout_ms = 1000;
    const auto https_response = ingress::SendOnvifSoapHttp(https_request);
    Assert(!https_response.ok, "HTTPS transport without OpenSSL should report unsupported");
    Assert(Contains(https_response.error, "https transport requires OpenSSL support"),
           "HTTPS unsupported wording mismatch");
    Assert(!Contains(https_response.error, "192.0.2.40"), "transport error leaked endpoint");
    std::cout << "[pass] ONVIF HTTPS SOAP transport fails closed without OpenSSL\n";
    std::cout << "[pass] ONVIF HTTPS SOAP transport redacts endpoint without OpenSSL\n";
#endif

    std::cout << "[summary] ONVIF HTTP/HTTPS SOAP transport smoke complete\n";
#if MEDIA_SERVER_USE_OPENSSL
    std::cout << "[summary] ONVIF HTTPS transport failure matrix complete\n";
#endif
    return 0;
}
