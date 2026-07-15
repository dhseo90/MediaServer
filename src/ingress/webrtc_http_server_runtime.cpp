// 파일 요약: WebRTC HTTP 서버의 공개 runtime lifecycle과 registry 검증 구현이다.
#include "webrtc_http_server_detail.h"

namespace ingress {

using namespace webrtc_http_server_detail;

namespace webrtc_http_server_detail {

std::optional<std::string> ExtractObjectFieldByKey(const std::string& body,
                                                   const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35687 function
std::string InsertObjectFieldIfMissing(std::string document,
                                       const std::string& field_name,
                                       const std::optional<std::string>& object_value) {
    if (!object_value.has_value() || object_value->empty() ||
        ExtractObjectFieldByKey(document, field_name).has_value()) {
        return document;
    }
    const auto closing = document.rfind('}');
    if (closing == std::string::npos) {
        return document;
    }
    std::size_t previous = closing;
    while (previous > 0 && std::isspace(static_cast<unsigned char>(document[previous - 1])) != 0) {
        --previous;
    }
    const bool needs_comma = previous > 0 && document[previous - 1] != '{' &&
                             document[previous - 1] != ',';
    document.insert(closing,
                    std::string(needs_comma ? "," : "") + "\"" + JsonEscape(field_name) +
                        "\":" + *object_value);
    return document;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35710 function
std::optional<std::pair<std::size_t, std::size_t>> FindObjectFieldRangeByKey(
    const std::string& body,
    const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t search_pos = 0;
    while (search_pos < body.size()) {
        const std::size_t key_pos = body.find(needle, search_pos);
        if (key_pos == std::string::npos) {
            return std::nullopt;
        }
        search_pos = key_pos + needle.size();

        std::size_t prev = key_pos;
        while (prev > 0 && std::isspace(static_cast<unsigned char>(body[prev - 1])) != 0) {
            --prev;
        }
        if (prev > 0 && body[prev - 1] != '{' && body[prev - 1] != ',') {
            continue;
        }

        std::size_t pos = key_pos + needle.size();
        while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
            ++pos;
        }
        if (pos >= body.size() || body[pos] != ':') {
            continue;
        }
        ++pos;
        while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
            ++pos;
        }
        if (pos >= body.size() || body[pos] != '{') {
            continue;
        }

        bool in_string = false;
        bool escaped = false;
        int depth = 0;
        const std::size_t start = pos;
        for (; pos < body.size(); ++pos) {
            const char ch = body[pos];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch == '\\' && in_string) {
                escaped = true;
                continue;
            }
            if (ch == '"') {
                in_string = !in_string;
                continue;
            }
            if (in_string) {
                continue;
            }
            if (ch == '{') {
                ++depth;
            } else if (ch == '}') {
                --depth;
                if (depth == 0) {
                    return std::make_pair(start, pos + 1);
                }
            }
        }
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35779 function
std::optional<std::string> ExtractObjectFieldByKey(const std::string& body,
                                                   const std::string& field) {
    const auto range = FindObjectFieldRangeByKey(body, field);
    if (!range.has_value()) {
        return std::nullopt;
    }
    return body.substr(range->first, range->second - range->first);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35788 function
std::optional<std::pair<std::size_t, std::size_t>> FindDelimitedFieldRange(const std::string& body,
                                                                           const std::string& field,
                                                                           char open_ch,
                                                                           char close_ch) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(open_ch, pos);
    if (pos == std::string::npos) {
        return std::nullopt;
    }

    bool in_string = false;
    bool escaped = false;
    int depth = 0;
    const std::size_t start = pos;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch == '\\' && in_string) {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            in_string = !in_string;
            continue;
        }
        if (in_string) {
            continue;
        }
        if (ch == open_ch) {
            ++depth;
        } else if (ch == close_ch) {
            --depth;
            if (depth == 0) {
                return std::make_pair(start, pos + 1);
            }
        }
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35839 function
std::string ReplaceObjectField(std::string document,
                               const std::string& field_name,
                               const std::optional<std::string>& object_value) {
    if (!object_value.has_value() || object_value->empty()) {
        return document;
    }
    const auto range = FindObjectFieldRangeByKey(document, field_name);
    if (!range.has_value()) {
        return InsertObjectFieldIfMissing(std::move(document), field_name, object_value);
    }
    document.replace(range->first, range->second - range->first, *object_value);
    return document;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35853 function
std::optional<std::string> FindRuleDocumentById(const std::vector<std::string>& documents,
                                                const std::string& id) {
    if (id.empty()) {
        return std::nullopt;
    }
    for (const auto& document : documents) {
        if (ParseStringField(document, "id").value_or("") == id) {
            return document;
        }
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35866 function
std::optional<std::string> EventObjectForVaRule(const std::string& va_rule_document,
                                                const std::string& template_document) {
    auto event = ExtractObjectFieldByKey(template_document, "event");
    if (!event.has_value()) {
        return std::nullopt;
    }
    event = ReplaceObjectField(*event, "region", ExtractObjectFieldByKey(va_rule_document, "geometry"));
    return event;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35876 function
std::string ExpandVaRuleForEventEvaluation(const std::string& va_rule_document,
                                           const std::vector<std::string>& rule_documents) {
    if (ExtractObjectFieldByKey(va_rule_document, "event").has_value()) {
        return va_rule_document;
    }
    const auto template_start = ExtractObjectFieldByKey(va_rule_document, "templateStart");
    if (!template_start.has_value()) {
        return va_rule_document;
    }
    const std::string template_rule_id = Trim(ParseStringField(*template_start, "ruleId").value_or(""));
    const auto template_document = FindRuleDocumentById(rule_documents, template_rule_id);
    if (!template_document.has_value()) {
        return va_rule_document;
    }

    std::string expanded = va_rule_document;
    expanded = InsertObjectFieldIfMissing(expanded, "event", EventObjectForVaRule(va_rule_document, *template_document));
    expanded = InsertObjectFieldIfMissing(expanded, "scenario", ExtractObjectFieldByKey(*template_document, "scenario"));
    expanded = InsertObjectFieldIfMissing(
        expanded, "eventActions", ExtractObjectFieldByKey(*template_document, "eventActions"));
    return expanded;
}

}  // namespace webrtc_http_server_detail


std::vector<std::string> WebRtcHttpAnalysisRuleDocumentsSnapshotBackend() {
    auto documents = AnalysisRegistry().RuleDocuments();
    auto va_rule_documents = AnalysisRegistry().VaRuleDocuments();
    for (const auto& va_rule_document : va_rule_documents) {
        documents.push_back(ExpandVaRuleForEventEvaluation(va_rule_document, documents));
    }
    return documents;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35908 function
std::vector<std::string> WebRtcHttpAnalysisProfileDocumentsSnapshotBackend() {
    return AnalysisRegistry().ProfileDocuments();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35912 function
std::vector<std::string> WebRtcHttpVideoAnalysisRuleDocumentsSnapshotBackend() {
    return AnalysisRegistry().VaRuleDocuments();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35916 function
bool ApplyWebRtcHttpVideoAnalysisRuleToRequestBackend(media::IngressRequest* request,
                                                      std::string* error_message) {
    if (request == nullptr) {
        if (error_message != nullptr) {
            *error_message = "request is missing";
        }
        return false;
    }
    if (request->query.find("_vaRuleResolved") != request->query.end()) {
        return true;
    }
    std::string va_rule_id;
    if (const auto it = request->query.find("vaRule"); it != request->query.end()) {
        va_rule_id = it->second;
    } else if (const auto it = request->query.find("vaRuleId"); it != request->query.end()) {
        va_rule_id = it->second;
    }
    if (va_rule_id.empty()) {
        return true;
    }
    if (request->query.find("file") != request->query.end() ||
        request->query.find("url") != request->query.end() ||
        request->query.find("source") != request->query.end()) {
        if (error_message != nullptr) {
            *error_message = "vaRule cannot be combined with file/url/source override";
        }
        return false;
    }
    const auto document = AnalysisRegistry().VaRuleJson(va_rule_id);
    if (!document.has_value()) {
        if (error_message != nullptr) {
            *error_message = "vaRule not found: " + va_rule_id;
        }
        return false;
    }
    const auto source = ExtractObjectField(*document, "source");
    if (!source.has_value()) {
        if (error_message != nullptr) {
            *error_message = "vaRule source is missing: " + va_rule_id;
        }
        return false;
    }
    const std::string source_kind = ParseStringField(*source, "kind").value_or("");
    if (source_kind == "file") {
        const std::string file = ParseStringField(*source, "file").value_or("");
        if (file.empty()) {
            if (error_message != nullptr) {
                *error_message = "vaRule file source is empty: " + va_rule_id;
            }
            return false;
        }
        request->query["file"] = file;
    } else {
        const std::string url = ParseStringField(*source, "url").value_or("");
        if (url.empty()) {
            if (error_message != nullptr) {
                *error_message = "vaRule url source is empty: " + va_rule_id;
            }
            return false;
        }
        request->query["url"] = url;
        request->query["source"] = source_kind.empty() ? "rtsp" : source_kind;
    }
    if (const auto analysis = ExtractObjectField(*document, "analysis"); analysis.has_value()) {
        const std::string profile_id = ParseStringField(*analysis, "profileId").value_or("");
        if (!profile_id.empty()) {
            request->query["profileId"] = profile_id;
        }
    }
    request->query["vaRule"] = va_rule_id;
    request->query["va"] = "1";
    request->query["_vaRuleResolved"] = "1";
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35990 function
bool WebRtcHttpServer::Start(const std::string& listen_address, std::uint16_t port, std::string* error_message) {
    if (running_.load()) {
        return true;
    }

    impl_->listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (impl_->listen_fd < 0) {
        if (error_message != nullptr) {
            *error_message = "failed to create HTTP socket";
        }
        return false;
    }

    int opt = 1;
    setsockopt(impl_->listen_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    if (inet_pton(AF_INET, listen_address.c_str(), &addr.sin_addr) != 1) {
        if (error_message != nullptr) {
            *error_message = "invalid HTTP listen address";
        }
        close(impl_->listen_fd);
        impl_->listen_fd = -1;
        return false;
    }

    if (bind(impl_->listen_fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
        if (error_message != nullptr) {
            *error_message = std::string("failed to bind HTTP socket: ") + std::strerror(errno);
        }
        close(impl_->listen_fd);
        impl_->listen_fd = -1;
        return false;
    }
    if (listen(impl_->listen_fd, 32) != 0) {
        if (error_message != nullptr) {
            *error_message = std::string("failed to listen HTTP socket: ") + std::strerror(errno);
        }
        close(impl_->listen_fd);
        impl_->listen_fd = -1;
        return false;
    }

    impl_->listen_address = listen_address;
    impl_->port = port;
    running_.store(true);

    // 간단한 내장 HTTP 서버다. 연결마다 thread를 만들되 parser timeout과 동시 연결 상한을 둔다.
    impl_->accept_thread = std::thread([this] {
        while (running_.load()) {
            sockaddr_in client_addr{};
            socklen_t client_len = sizeof(client_addr);
            const int client_fd = accept(impl_->listen_fd, reinterpret_cast<sockaddr*>(&client_addr), &client_len);
            if (client_fd < 0) {
                if (running_.load()) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(50));
                }
                continue;
            }

            const int previous_connections = impl_->active_http_connections.fetch_add(1);
            if (previous_connections >= kMaxActiveHttpConnections) {
                impl_->active_http_connections.fetch_sub(1);
                SetHttpSocketTimeouts(client_fd);
                SuppressSocketSigPipe(client_fd);
                (void)SendAll(client_fd,
                              BuildHttpResponse(PlainTextResponse(503,
                                                                  "Service Unavailable",
                                                                  "too many active connections")));
                close(client_fd);
                continue;
            }

            std::thread([this, client_fd] {
                struct ActiveConnectionGuard {
                    std::atomic<int>& active_connections;
                    ~ActiveConnectionGuard() {
                        active_connections.fetch_sub(1);
                    }
                } active_connection_guard{impl_->active_http_connections};

                SetHttpSocketTimeouts(client_fd);
                HttpResponse response;
                auto request_opt = ReadHttpRequest(client_fd, &response);
                bool response_sent = false;
                if (!request_opt.has_value()) {
                    if (response.body.empty()) {
                        response = PlainTextResponse(400, "Bad Request", "bad request");
                    }
                } else {
                    const HttpRequest& request = *request_opt;
                    response = [&]() -> HttpResponse {
                        if (request.method == "OPTIONS") {
                            return CorsPreflightResponse(request);
                        }
                        if (IsCorsOriginDenied(request)) {
                            return CorsForbiddenResponse();
                        }

                        const auto query = ParseQueryString(request.query);
                        const auto& config = GetWebRtcHttpRuntimeConfig();
                        const bool session_auth_mode = config.auth_mode == HttpAuthMode::Session ||
                                                       config.auth_mode == HttpAuthMode::Auto;
                        const bool setup_flow_enabled = session_auth_mode;
                        const auth::BootstrapState bootstrap_state =
                            setup_flow_enabled ? auth::InspectBootstrapState(config)
                                               : auth::BootstrapState{};
                        auto cleanup_expired_auth_sessions = [&]() {
                            const auto now = std::chrono::system_clock::now();
                            for (auto it = impl_->auth_sessions.begin(); it != impl_->auth_sessions.end();) {
                                const bool ttl_expired = it->second.expires_at <= now;
                                const bool idle_expired =
                                    config.auth_session_idle_timeout_seconds > 0 &&
                                    it->second.last_seen_at +
                                            std::chrono::seconds(
                                                config.auth_session_idle_timeout_seconds) <=
                                        now;
                                if (ttl_expired || idle_expired) {
                                    it = impl_->auth_sessions.erase(it);
                                } else {
                                    ++it;
                                }
                            }
                        };
                        auto principal_from_session_cookie = [&]() -> std::optional<auth::Principal> {
                            const auto session_id =
                                auth::ExtractSessionCookie(request.headers, config.auth_cookie_name);
                            if (!session_id.has_value()) {
                                return std::nullopt;
                            }
                            auth::Principal session_principal;
                            {
                                std::lock_guard lock(impl_->auth_mu);
                                cleanup_expired_auth_sessions();
                                const auto it = impl_->auth_sessions.find(*session_id);
                                if (it == impl_->auth_sessions.end()) {
                                    return std::nullopt;
                                }
                                it->second.last_seen_at = std::chrono::system_clock::now();
                                session_principal = it->second.principal;
                            }
                            auth::AuthResult refreshed =
                                auth::RefreshPrincipalFromUser(config, session_principal);
                            if (!refreshed.ok) {
                                std::lock_guard lock(impl_->auth_mu);
                                impl_->auth_sessions.erase(*session_id);
                                return std::nullopt;
                            }
                            {
                                std::lock_guard lock(impl_->auth_mu);
                                const auto it = impl_->auth_sessions.find(*session_id);
                                if (it != impl_->auth_sessions.end()) {
                                    it->second.principal = refreshed.principal;
                                }
                            }
                            return refreshed.principal;
                        };
                        auto build_request_principal = [&]() -> auth::AuthResult {
                            auth::AuthResult result =
                                auth::BuildPrincipalFromRequest(config, request.headers, query);
                            if (result.ok || !session_auth_mode) {
                                return result;
                            }
                            const auto session_principal = principal_from_session_cookie();
                            if (session_principal.has_value()) {
                                return auth::AuthResult{.ok = true,
                                                        .principal = *session_principal,
                                                        .error = ""};
                            }
                            return result;
                        };
                        const auth::AuthResult principal_result = build_request_principal();
                        const std::string route_path = "/" + config.stream_route;
                        auto create_auth_session = [&](const auth::Principal& principal,
                                                       std::string* error_message) -> std::optional<std::string> {
                            auto session_id = auth::GenerateSessionId(error_message);
                            if (!session_id.has_value()) {
                                return std::nullopt;
                            }
                            std::lock_guard lock(impl_->auth_mu);
                            cleanup_expired_auth_sessions();
                            impl_->auth_sessions[*session_id] =
                                Impl::AuthSessionEntry{
                                    .session_id = *session_id,
                                    .principal = principal,
                                    .expires_at = std::chrono::system_clock::now() +
                                                  std::chrono::seconds(config.auth_session_ttl_seconds),
                                    .last_seen_at = std::chrono::system_clock::now(),
                                };
                            return session_id;
                        };
                        auto destroy_auth_session = [&]() {
                            const auto session_id =
                                auth::ExtractSessionCookie(request.headers, config.auth_cookie_name);
                            if (!session_id.has_value()) {
                                return;
                            }
                            std::lock_guard lock(impl_->auth_mu);
                            impl_->auth_sessions.erase(*session_id);
                        };
                        auto revoke_auth_sessions_for = [&](const std::string& username) {
                            if (username.empty()) {
                                return;
                            }
                            std::lock_guard lock(impl_->auth_mu);
                            for (auto it = impl_->auth_sessions.begin(); it != impl_->auth_sessions.end();) {
                                if (it->second.principal.username == username) {
                                    it = impl_->auth_sessions.erase(it);
                                } else {
                                    ++it;
                                }
                            }
                        };
                        auto stream_metadata_sse_response = [&](const std::string& tap_id,
                                                                bool detach_on_close) -> HttpResponse {
                            response_sent = true;
                            impl_->active_sse_metadata_clients.fetch_add(1);
                            (void)StreamVaMetadataSse(client_fd,
                                                       running_,
                                                       impl_->analysis_session_reads,
                                                       tap_id,
                                                       query,
                                                       request);
                            impl_->active_sse_metadata_clients.fetch_sub(1);
                            if (detach_on_close) {
                                (void)DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, tap_id);
                            }
                            return HttpResponse{};
                        };
                        auto stream_metadata_websocket_response = [&](const std::string& tap_id,
                                                                      bool detach_on_close,
                                                                      const std::string& websocket_key) -> HttpResponse {
                            const int max_clients = ParseClampedIntQuery(query, "maxClients", 16, 1, 256);
                            const int previous_clients = impl_->active_ws_metadata_clients.fetch_add(1);
                            if (previous_clients >= max_clients) {
                                impl_->active_ws_metadata_clients.fetch_sub(1);
                                if (detach_on_close) {
                                    (void)DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, tap_id);
                                }
                                return JsonResponse(429,
                                                    "Too Many Requests",
                                                    "{\"error\":\"too many VA metadata WebSocket clients\"}");
                            }
                            response_sent = true;
                            (void)StreamVaMetadataWebSocket(
                                client_fd, running_, impl_->analysis_session_reads, tap_id, query, websocket_key, request);
                            impl_->active_ws_metadata_clients.fetch_sub(1);
                            if (detach_on_close) {
                                (void)DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, tap_id);
                            }
                            return HttpResponse{};
                        };
                        struct CreatedWebRtcSession {
                            std::string session_id;
                            std::string session_capability;
                            std::string offer;
                        };
                        auto close_webrtc_session = [&](const std::string& session_id) -> bool {
                            Impl::SessionEntry entry;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->sessions.find(session_id);
                                if (it == impl_->sessions.end()) {
                                    return false;
                                }
                                entry = it->second;
                                impl_->sessions.erase(it);
                                for (auto client_it = impl_->client_sessions.begin();
                                     client_it != impl_->client_sessions.end();) {
                                    if (client_it->second.session_id == session_id) {
                                        client_it = impl_->client_sessions.erase(client_it);
                                    } else {
                                        ++client_it;
                                    }
                                }
                            }
                            // bridge 정리 전에 stream subscriber를 먼저 제거해 packet callback이
                            // 중지 중인 pipeline에 쓰지 못하게 한다.
                            impl_->session_manager.CloseSession(entry.ingress_client_id);
                            if (!entry.analysis_tap_id.empty()) {
                                DetachAnalysisTapAndReleaseRuntimes(
                                    impl_->analysis_session_lifecycle, entry.analysis_tap_id);
                            }
                            entry.bridge->Stop();
                            return true;
                        };
                        auto create_webrtc_session_response =
                            [&](std::unordered_map<std::string, std::string> session_query,
                                const std::string& session_prefix,
                                CreatedWebRtcSession* created_session) -> HttpResponse {
                            // simple signaling: 서버가 offer를 만들고 브라우저/테스트 클라이언트가 answer를 돌려준다.
                            std::string session_secret_error;
                            const auto generated_secrets =
                                GenerateHttpSessionSecrets(session_prefix, &session_secret_error);
                            if (!generated_secrets.has_value()) {
                                return JsonResponse(
                                    503,
                                    "Service Unavailable",
                                    "{\"error\":\"" + JsonEscape(session_secret_error) + "\"}");
                            }
                            const std::string session_id = generated_secrets->session_id;
                            const std::string session_capability = generated_secrets->session_capability;
                            const std::string ingress_client_id = session_id + "-ingress";
                            media::IngressRequest ingress_request =
                                BuildHttpIngressRequest(route_path, session_query, ingress_client_id);
                            std::string va_rule_error;
                            if (!ApplyApplicationVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(va_rule_error) + "\"}");
                            }
                            auto bridge = std::make_shared<WebRtcEgressSession>();
                            std::string analysis_tap_id;
                            std::string error_message;
                            if (!AttachWebRtcAnalysisOverlay(
                                    impl_->analysis_session_lifecycle,
                                    impl_->analysis_session_reads,
                                    ingress_request,
                                    ingress_request.query,
                                    bridge,
                                    &analysis_tap_id,
                                    &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            auto create_result = impl_->session_manager.CreateSession(
                                ingress_request,
                                [bridge](const media::Packet& packet) { bridge->HandleSample(packet); });
                            if (!create_result.ok) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, analysis_tap_id);
                                }
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(create_result.message) + "\"}");
                            }

                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            std::string offer;
                            if (!bridge->CreateOffer(&offer, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->sessions.emplace(session_id,
                                                        Impl::SessionEntry{
                                                            .session_id = session_id,
                                                            .ingress_client_id = ingress_client_id,
                                                            .analysis_tap_id = analysis_tap_id,
                                                            .session_capability = session_capability,
                                                            .owner_principal = principal_result.principal,
                                                            .request = std::move(ingress_request),
                                                            .bridge = bridge,
                                                        });
                            }
                            if (created_session != nullptr) {
                                *created_session = CreatedWebRtcSession{
                                    .session_id = session_id,
                                    .session_capability = session_capability,
                                    .offer = offer,
                                };
                            }
                            return JsonResponse(200, "OK", SessionJson(session_id, offer, session_capability));
                        };
                        auto route_disabled_response = [](const std::string& route) {
                            return JsonResponse(404,
                                                "Not Found",
                                                "{\"error\":\"" + JsonEscape(route) + " route disabled\"}");
                        };
                        auto require_ops_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_ops) {
                                return route_disabled_response("ops");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::RequireRole(principal_result.principal, {"operator"}) ||
                                !auth::RequireScope(principal_result.principal, "ops:read")) {
                                return JsonResponse(
                                    403,
                                    "Forbidden",
                                    "{\"error\":\"operator role and ops:read scope required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_admin_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_ops) {
                                return route_disabled_response("ops");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::IsAdmin(principal_result.principal)) {
                                return JsonResponse(403, "Forbidden", "{\"error\":\"admin role required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_client_api_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_client) {
                                return route_disabled_response("client");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::RequireRole(principal_result.principal, {"viewer", "operator"}) &&
                                !auth::IsIntegrator(principal_result.principal)) {
                                return JsonResponse(
                                    403,
                                    "Forbidden",
                                    "{\"error\":\"viewer/operator/integrator role required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_client_shell_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_client) {
                                return route_disabled_response("client");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::RequireRole(principal_result.principal, {"viewer", "operator"})) {
                                return JsonResponse(403, "Forbidden", "{\"error\":\"viewer/operator role required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_scope_principal =
                            [&](const std::string& scope,
                                const std::string& error) -> std::optional<HttpResponse> {
                                if (!principal_result.ok) {
                                    return AuthErrorResponse(principal_result.error);
                                }
                                if (!auth::RequireScope(principal_result.principal, scope)) {
                                    return JsonResponse(
                                        403,
                                        "Forbidden",
                                        "{\"error\":\"" + JsonEscape(error) + "\"}");
                                }
                                return std::nullopt;
                            };
                        auto require_source_write_principal = [&]() -> std::optional<HttpResponse> {
                            return require_scope_principal("source:write", "source:write scope required");
                        };
                        auto require_rule_write_principal = [&]() -> std::optional<HttpResponse> {
                            return require_scope_principal("rule:write", "rule:write scope required");
                        };
                        auto require_lab_principal = [&]() -> std::optional<HttpResponse> {
                            if (!config.enable_lab) {
                                return route_disabled_response("lab");
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (!auth::RequireRole(principal_result.principal, {"operator"}) &&
                                !auth::RequireScope(principal_result.principal, "lab:read")) {
                                return JsonResponse(403, "Forbidden", "{\"error\":\"lab scope required\"}");
                            }
                            return std::nullopt;
                        };
                        auto require_generic_media_principal = [&]() -> std::optional<HttpResponse> {
                            if (config.auth_mode == HttpAuthMode::Off) {
                                return std::nullopt;
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            const bool ops_media_allowed =
                                auth::RequireRole(principal_result.principal, {"operator"}) &&
                                auth::RequireScope(principal_result.principal, "ops:read");
                            const bool lab_media_allowed =
                                auth::RequireScope(principal_result.principal, "lab:read");
                            if (!ops_media_allowed && !lab_media_allowed) {
                                return JsonResponse(
                                    403,
                                    "Forbidden",
                                    "{\"error\":\"generic media endpoints require operator ops access or lab scope\"}");
	                            }
	                            return std::nullopt;
	                        };
	                        auto runtime_status_body = [&]() {
	                            std::size_t http_egress_sessions = 0;
	                            std::size_t whip_publish_sessions = 0;
	                            std::vector<WebRtcMetadataChannelStats> metadata_channel_stats;
	                            {
	                                std::lock_guard lock(impl_->mu);
	                                http_egress_sessions = impl_->sessions.size();
	                                whip_publish_sessions = impl_->source_sessions.size();
	                                metadata_channel_stats.reserve(impl_->sessions.size());
	                                for (const auto& [_, entry] : impl_->sessions) {
	                                    if (entry.bridge != nullptr) {
	                                        metadata_channel_stats.push_back(entry.bridge->MetadataChannelStatsSnapshot());
	                                    }
	                                }
	                            }
	                            return RuntimeStatusJson(impl_->session_manager.GetRuntimeStateSnapshot(),
	                                                     http_egress_sessions,
	                                                     whip_publish_sessions,
	                                                     metadata_channel_stats,
	                                                     impl_->active_sse_metadata_clients.load(),
	                                                     impl_->active_ws_metadata_clients.load(),
	                                                     WebRtcSourceRegistry::Instance().Snapshots(),
	                                                     impl_->analysis_session_reads.Snapshots());
	                        };

	                        if (request.method == "GET" && request.path == "/health") {
                            HttpResponse ok;
                            ok.content_type = "application/json; charset=utf-8";
                            ok.body = "{\"status\":\"ok\"}";
                            return ok;
                        }

                        if (request.path == "/setup") {
                            if (!setup_flow_enabled) {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"setup is not enabled for this auth mode\"}");
                            }
                            if (!bootstrap_state.setup_required) {
                                return RedirectResponse("/login");
                            }
                            if (request.method == "GET") {
                                return HtmlPageResponse(SetupPageHtml(bootstrap_state.reason, false));
                            }
                            if (request.method == "POST") {
                                if (!auth::PasswordHashingAvailable()) {
                                    return JsonResponse(
                                        503,
                                        "Service Unavailable",
                                        "{\"error\":\"safe password hashing is unavailable; build with libsodium\"}");
                                }
                                const auto form = ParseQueryString(request.body);
                                const std::string username =
                                    form.count("username") != 0 ? form.at("username") : std::string();
                                const std::string password =
                                    form.count("password") != 0 ? form.at("password") : std::string();
                                const std::string confirm =
                                    form.count("confirm") != 0 ? form.at("confirm") : std::string();
                                if (username != "admin") {
                                    return HtmlPageResponse(
                                        SetupPageHtml("최초 setup username은 admin이어야 합니다.", true),
                                        400,
                                        "Bad Request");
                                }
                                const auth::PasswordPolicyResult policy =
                                    auth::ValidatePasswordPolicy(config, username, password, confirm, nullptr);
                                if (!policy.ok) {
                                    return HtmlPageResponse(SetupPageHtml(policy.message, true),
                                                            400,
                                                            "Bad Request");
                                }
                                std::string setup_error;
                                if (!auth::SaveBootstrapAdmin(config, password, &setup_error)) {
                                    return JsonResponse(500,
                                                        "Internal Server Error",
                                                        "{\"error\":\"" + JsonEscape(setup_error) + "\"}");
                                }
                                return RedirectResponse("/login");
                            }
                            return JsonResponse(405,
                                                "Method Not Allowed",
                                                "{\"error\":\"method not allowed\"}");
                        }

                        if (setup_flow_enabled && bootstrap_state.setup_required) {
                            if (request.path == "/auth/whoami") {
                                HttpResponse ok =
                                    JsonResponse(200, "OK", WhoamiJson(principal_result, bootstrap_state, config));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                            if (request.method == "GET" || request.method == "HEAD") {
                                HttpResponse redirect = RedirectResponse("/setup");
                                if (request.method == "HEAD") {
                                    redirect.body.clear();
                                }
                                return redirect;
                            }
                            return JsonResponse(403,
                                                "Forbidden",
                                                "{\"error\":\"admin setup is required\"}");
                        }

                        if (request.method == "GET" && request.path == "/invite/setup") {
                            if (!session_auth_mode) {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"invite setup is not enabled for this auth mode\"}");
                            }
                            return HtmlPageResponse(InviteSetupPageHtml(
                                query.count("token") != 0 ? query.at("token") : std::string(), "", false));
                        }

                        if (request.method == "POST" && request.path == "/invite/setup") {
                            if (!session_auth_mode) {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"invite setup is not enabled for this auth mode\"}");
                            }
                            const auto form = ParseQueryString(request.body);
                            const std::string token =
                                form.count("token") != 0 ? form.at("token") : std::string();
                            const std::string password =
                                form.count("password") != 0 ? form.at("password") : std::string();
                            const std::string confirm =
                                form.count("confirm") != 0 ? form.at("confirm") : std::string();
                            const auth::AuthUserResult result =
                                auth::CompleteInvitePasswordSetup(config, token, password, confirm);
                            if (result.status >= 200 && result.status < 300 && !result.username.empty()) {
                                revoke_auth_sessions_for(result.username);
                                return RedirectResponse("/login");
                            }
                            const std::string message =
                                ParseStringField(result.body, "error").value_or("invite setup failed");
                            return HtmlPageResponse(InviteSetupPageHtml(token, message, true),
                                                    result.status,
                                                    result.status_text);
                        }

                        if (request.method == "GET" && request.path == "/client/request-access") {
                            if (!config.enable_client) {
                                return route_disabled_response("client");
                            }
                            return HtmlPageResponse(ClientAccessRequestPageHtml());
                        }

                        if (request.method == "POST" && request.path == "/client/api/access-requests") {
                            if (!config.enable_client) {
                                return route_disabled_response("client");
                            }
                            constexpr std::size_t kPublicAccessRequestMaxBodyBytes = 4 * 1024;
                            if (request.body.size() > kPublicAccessRequestMaxBodyBytes) {
                                return JsonResponse(413,
                                                    "Payload Too Large",
                                                    "{\"error\":\"access request body is too large\"}");
                            }
                            int retry_after_seconds = 0;
                            if (!impl_->AllowPublicAccessRequestAttempt(PeerAddress(client_fd),
                                                                        &retry_after_seconds)) {
                                HttpResponse too_many = JsonResponse(
                                    429,
                                    "Too Many Requests",
                                    "{\"error\":\"too many access request attempts\"}");
                                too_many.headers["Retry-After"] = std::to_string(retry_after_seconds);
                                return too_many;
                            }
                            return AuthUserHttpResponse(auth::CreateAccessRequestFromJson(config, request.body));
                        }

                        if (request.method == "GET" && request.path == "/login") {
                            if (session_auth_mode && principal_result.ok) {
                                return RedirectResponse(RoleLandingPath(principal_result.principal, config));
                            }
                            const auto error_it = query.find("error");
                            return HtmlPageResponse(LoginPageHtml(
                                error_it == query.end() ? std::string() : error_it->second,
                                error_it != query.end()));
                        }

                        if (request.method == "POST" && request.path == "/login") {
                            if (!session_auth_mode) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"login requires MEDIA_SERVER_AUTH_MODE=session\"}");
                            }
                            const auto form = ParseQueryString(request.body);
                            const std::string username =
                                form.count("username") != 0 ? form.at("username") : std::string();
                            const std::string password =
                                form.count("password") != 0 ? form.at("password") : std::string();
                            auth::AuthResult login =
                                auth::AuthenticateUserPassword(config, username, password, PeerAddress(client_fd));
                            if (!login.ok) {
                                const std::string message =
                                    login.error == "account is temporarily locked"
                                        ? "로그인 실패가 반복되어 계정이 잠시 잠겼습니다. 잠시 후 다시 시도하세요."
                                        : "로그인 정보가 올바르지 않습니다.";
                                return HtmlPageResponse(LoginPageHtml(message, true), 401, "Unauthorized");
                            }
                            destroy_auth_session();
                            std::string session_error;
                            const auto session_id = create_auth_session(login.principal, &session_error);
                            if (!session_id.has_value()) {
                                return JsonResponse(503,
                                                    "Service Unavailable",
                                                    "{\"error\":\"" + JsonEscape(session_error) + "\"}");
                            }
                            HttpResponse redirect = RedirectResponse(RoleLandingPath(login.principal, config));
                            redirect.headers["Set-Cookie"] =
                                AuthCookieHeader(config, *session_id, config.auth_session_ttl_seconds);
                            return redirect;
                        }

                        if ((request.method == "GET" || request.method == "POST") &&
                            request.path == "/password/change") {
                            if (!session_auth_mode) {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"password change is not enabled for this auth mode\"}");
                            }
                            if (!principal_result.ok) {
                                if (request.method == "GET") {
                                    return RedirectResponse("/login");
                                }
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (request.method == "GET") {
                                return HtmlPageResponse(
                                    PasswordChangePageHtml(
                                        ProductUiPrincipalViewFromAuthPrincipal(principal_result.principal),
                                        "",
                                        false));
                            }
                            const auto form = ParseQueryString(request.body);
                            const std::string current_password =
                                form.count("currentPassword") != 0 ? form.at("currentPassword") : std::string();
                            const std::string password =
                                form.count("password") != 0 ? form.at("password") : std::string();
                            const std::string confirm =
                                form.count("confirm") != 0 ? form.at("confirm") : std::string();
                            std::string change_error;
                            if (!auth::ChangeUserPassword(config,
                                                          principal_result.principal.username,
                                                          current_password,
                                                          password,
                                                          confirm,
                                                          true,
                                                          &change_error)) {
                                return HtmlPageResponse(PasswordChangePageHtml(
                                                            ProductUiPrincipalViewFromAuthPrincipal(
                                                                principal_result.principal),
                                                            change_error,
                                                            true),
                                                        400,
                                                        "Bad Request");
                            }
                            destroy_auth_session();
                            HttpResponse redirect = RedirectResponse("/login");
                            redirect.headers["Set-Cookie"] = ExpiredAuthCookieHeader(config);
                            return redirect;
                        }

                        if (request.method == "POST" && request.path == "/logout") {
                            destroy_auth_session();
                            HttpResponse redirect = RedirectResponse("/login");
                            redirect.headers["Set-Cookie"] = ExpiredAuthCookieHeader(config);
                            return redirect;
                        }

                        if (request.method == "GET" && request.path == "/auth/whoami") {
                            if (!principal_result.ok) {
                                HttpResponse failed = JsonResponse(
                                    401, "Unauthorized", WhoamiJson(principal_result, bootstrap_state, config));
                                failed.headers["WWW-Authenticate"] = "Bearer";
                                failed.headers["Cache-Control"] = "no-store";
                                return failed;
                            }
                            HttpResponse ok =
                                JsonResponse(200, "OK", WhoamiJson(principal_result, bootstrap_state, config));
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (session_auth_mode && principal_result.ok &&
                            principal_result.principal.password_change_required) {
                            if (request.method == "GET" || request.method == "HEAD") {
                                HttpResponse redirect = RedirectResponse("/password/change");
                                if (request.method == "HEAD") {
                                    redirect.body.clear();
                                }
                                return redirect;
                            }
                            return JsonResponse(403,
                                                "Forbidden",
                                                "{\"error\":\"password change is required\"}");
                        }

                        if ((request.method == "GET" || request.method == "HEAD") && request.path == "/") {
                            if (config.auth_mode == HttpAuthMode::Off) {
                                HttpResponse redirect = RedirectResponse(DefaultHomePath(config));
                                if (request.method == "HEAD") {
                                    redirect.body.clear();
                                }
                                return redirect;
                            }
                            if (!principal_result.ok) {
                                HttpResponse redirect = RedirectResponse("/login");
                                if (request.method == "HEAD") {
                                    redirect.body.clear();
                                }
                                return redirect;
                            }
                            HttpResponse redirect =
                                RedirectResponse(RoleLandingPath(principal_result.principal, config));
                            if (request.method == "HEAD") {
                                redirect.body.clear();
                            }
                            return redirect;
                        }

                        if (request.method == "GET" && request.path == "/ops/sources") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_ops) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("운영 콘솔은 admin/operator role과 ops:read scope가 필요합니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(BuildOpsSourcesPageHtml(principal_result.principal));
                        }

                        if (request.method == "GET" && request.path == "/ops/users") {
                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_ops) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("계정 관리는 admin 계정만 접근할 수 있습니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(BuildOpsUsersPageHtml(principal_result.principal));
                        }

                        if (request.method == "GET" && request.path == "/ops/rules") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_ops) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("운영 콘솔은 admin/operator role과 ops:read scope가 필요합니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(OpsShellPageHtml(config.stream_route,
                                                                     config.rtsp_listen_port,
                                                                     ProductUiPrincipalViewFromAuthPrincipal(
                                                                         principal_result.principal),
                                                                     "rules"));
                        }

	                        if (request.path == "/ops/api/users") {
	                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
                            if (request.method == "GET") {
                                return AuthUserHttpResponse(auth::ListAuthUsers(config));
                            }
                            if (request.method == "POST") {
                                const auth::AuthUserResult result =
                                    auth::CreateAuthUserFromJson(config, request.body);
	                                return AuthUserHttpResponse(result);
	                            }
	                        }

	                        if (request.method == "GET" && request.path == "/ops/api/runtime/status") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", runtime_status_body());
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (request.method == "GET" && request.path == "/ops/api/vlm/install-connection/dry-run") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
                                std::string vlm_error;
                                const std::string body = OpsVlmInstallConnectionDryRunJson(query, &vlm_error);
                                if (body.empty()) {
                                    return JsonResponse(400,
                                                        "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(vlm_error) + "\"}");
                                }
	                            HttpResponse ok = JsonResponse(200, "OK", body);
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (request.method == "GET" && request.path == "/ops/api/vlm/evaluation-results") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", OpsVlmEvaluationResultWorkflowJson());
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

                            if (request.method == "GET" && request.path == "/ops/api/vlm/evaluation-promotion-guard") {
                                if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                    return *auth_response;
                                }
                                HttpResponse ok =
                                    JsonResponse(200, "OK", OpsV390VlmEvaluationPromotionGuardJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }

                            if (request.method == "GET" && request.path == "/ops/api/vlm/rule-suggestion-draft-bridge") {
                                if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                    return *auth_response;
                                }
                                HttpResponse ok =
                                    JsonResponse(200, "OK", OpsV390VlmRuleSuggestionDraftBridgeJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }

                            if (request.method == "GET" && request.path == "/ops/api/vlm/rule-suggestion-drafts") {
                                if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                    return *auth_response;
                                }
                                std::string draft_error;
                                const std::string body =
                                    OpsVlmRuleSuggestionDraftWorkflowJson(query, &draft_error);
                                if (body.empty()) {
                                    return JsonResponse(400,
                                                        "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(draft_error) + "\"}");
                                }
                                HttpResponse ok = JsonResponse(200, "OK", body);
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }

                            if (request.path == "/ops/api/vlm/profiles") {
                                if (request.method == "GET") {
                                    if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                        return *auth_response;
                                    }
                                    HttpResponse ok = JsonResponse(200, "OK", OpsVlmProfilesJson());
                                    ok.headers["Cache-Control"] = "no-store";
                                    return ok;
                                }
                                if (request.method == "POST") {
                                    if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                        return *auth_response;
                                    }
                                    if (const auto auth_response = require_rule_write_principal(); auth_response.has_value()) {
                                        return *auth_response;
                                    }
                                    const auto result = AnalysisRegistry().CreateVlmProfile(request.body);
                                    if (!result.ok) {
                                        return AnalysisRegistryMutationErrorResponse(result,
                                                                                     400,
                                                                                     "Bad Request");
                                    }
                                    return JsonResponse(201, "Created", result.response_body);
                                }
                            }

                            const auto ops_vlm_profile_prefix = std::string("/ops/api/vlm/profiles/");
                            if (request.path.rfind(ops_vlm_profile_prefix, 0) == 0) {
                                const std::string id = UrlDecode(request.path.substr(ops_vlm_profile_prefix.size()));
                                if (id.empty()) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"VLM profile id is required\"}");
                                }
                                if (request.method == "GET") {
                                    if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                        return *auth_response;
                                    }
                                    const auto profile = AnalysisRegistry().VlmProfileJson(id);
                                    if (!profile.has_value()) {
                                        return JsonResponse(404, "Not Found",
                                                            "{\"error\":\"VLM profile not found\"}");
                                    }
                                    HttpResponse ok = JsonResponse(200, "OK", "{\"vlmProfile\":" + *profile + "}");
                                    ok.headers["Cache-Control"] = "no-store";
                                    return ok;
                                }
                                if (request.method == "PUT") {
                                    if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                        return *auth_response;
                                    }
                                    if (const auto auth_response = require_rule_write_principal(); auth_response.has_value()) {
                                        return *auth_response;
                                    }
                                    const auto result = AnalysisRegistry().UpsertVlmProfile(id, request.body);
                                    if (!result.ok) {
                                        return AnalysisRegistryMutationErrorResponse(result,
                                                                                     400,
                                                                                     "Bad Request");
                                    }
                                    return JsonResponse(200, "OK", result.response_body);
                                }
                                if (request.method == "DELETE") {
                                    if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                        return *auth_response;
                                    }
                                    if (const auto auth_response = require_rule_write_principal(); auth_response.has_value()) {
                                        return *auth_response;
                                    }
                                    const auto result = AnalysisRegistry().DeleteVlmProfile(id);
                                    if (!result.ok) {
                                        return AnalysisRegistryMutationErrorResponse(result,
                                                                                     404,
                                                                                     "Not Found");
                                    }
                                    return JsonResponse(200, "OK", result.response_body);
                                }
                            }

	                        if (request.method == "GET" && request.path == "/ops/api/source-health") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            HttpResponse ok = JsonResponse(
	                                200,
	                                "OK",
	                                OpsSourceHealthJson(impl_->analysis_session_reads.Snapshots(),
	                                                    WebRtcSourceRegistry::Instance().Snapshots(),
	                                                    impl_->session_manager.SourceDescriptorSnapshots(),
	                                                    impl_->session_manager.SourceReconnectStatsSnapshot(),
	                                                    impl_->session_manager.SourceEgressStatsSnapshot(),
	                                                    &config,
	                                                    &principal_result.principal));
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (request.method == "POST" && request.path == "/ops/api/source-health/bulk") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            HttpResponse ok = JsonResponse(
	                                200,
	                                "OK",
	                                OpsSourceHealthBulkJson(request.body,
	                                                        impl_->analysis_session_reads.Snapshots(),
	                                                        WebRtcSourceRegistry::Instance().Snapshots(),
	                                                        impl_->session_manager.SourceDescriptorSnapshots(),
	                                                        impl_->session_manager.SourceReconnectStatsSnapshot(),
	                                                        impl_->session_manager.SourceEgressStatsSnapshot(),
	                                                        &config,
	                                                        &principal_result.principal));
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

                        if (request.path == "/ops/api/actions/route-boundary") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380ActionRouteBoundaryJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/capability-contract") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380ActionCapabilityContractJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/request-ledger") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380ActionRequestLedgerContractJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/approval-decision-gate") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380ApprovalDecisionGateJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/readiness-preflight") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380ActionReadinessPreflightJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/source-recheck-pilot") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380SourceRecheckActionPilotJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/client-notice-draft-queue") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380ClientNoticeDraftQueueJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/rule-draft-package") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380RuleDraftActionPackageJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/outcome-reconciliation") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380OutcomeObserverReconciliationJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/receipt-bundle") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380ActionReceiptBundleJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/field-connector-evidence-package") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380FieldConnectorEvidencePackageJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/execution-deferral-decision") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (const auto handled =
                                    ops_actions::TryHandleActionExecutionDeferralDecision(
                                        request.method,
                                        request.path);
                                handled.has_value()) {
                                HttpResponse ok = JsonResponse(
                                    handled->status,
                                    handled->reason,
                                    handled->body);
                                ok.headers["Cache-Control"] = handled->cache_control;
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/field-evidence/bridge-decision") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV390FieldEvidenceBridgeDecisionJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/analysis/reid-assist-decision") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV390ReidAssistDecisionJson(config));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/actions/default-off-explanation") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV380DefaultOffActionExplanationJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/source-group-contract") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370SiteSourceGroupContractJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/source-registry-projection") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370SiteAwareSourceRegistryProjectionJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/health-rollup") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370SiteHealthRollupJson(source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/impact-graph") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370SiteImpactGraphJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/simulation-input-pack") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370SiteSimulationInputPackJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/cross-site-safe-apply-readiness") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370CrossSiteSafeApplyReadinessJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/runbook-template-contract") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370RunbookTemplateContractJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/runbook-instance-ledger") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370RunbookInstanceLedgerJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/approval-ticket-workflow") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370ApprovalTicketWorkflowJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/client-notice-by-site-view-group") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370ClientNoticeBySiteViewGroupJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/rule-va-what-if-by-site") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370RuleVaWhatIfBySiteJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/field-evidence-attachment") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370FieldEvidenceAttachmentJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/limited-safe-execution-pilot") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370LimitedSafeExecutionPilotJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/outcome-reconciliation") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370OutcomeReconciliationJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/site-operations/export-handoff-bundle") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV370ExportHandoffBundleJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

	                        if (request.method == "GET" && request.path == "/ops/api/diagnostics/log-tail") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", OpsDiagnosticLogTailJson(query));
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (request.method == "GET" && request.path == "/ops/api/rules/catalog") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", OpsRulesCatalogJson());
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (IsOpsEventStatusRoute(request.method, request.path)) {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            EventStorageApplicationQueryOptions options;
	                            std::string error_message;
	                            if (!BuildEventRecordQueryOptions(query, &options, &error_message)) {
	                                return JsonResponse(400,
	                                                    "Bad Request",
	                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                            }
	                            EventStorageApplicationQueryResult result;
	                            if (!QueryEventRecordsForApplication(options, &result, &error_message)) {
	                                return JsonResponse(500,
	                                                    "Internal Server Error",
	                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                            }
	                            HttpResponse ok = JsonResponse(
	                                200,
	                                "OK",
	                                "{\"status\":\"ops-events\",\"storage\":" +
	                                    AnalysisEventStorageStatusJson() + ",\"post\":" +
	                                    AnalysisEventPostStatusJson() + ",\"records\":" +
	                                    AnalysisEventRecordsJson(result) + "}");
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (IsOpsAlertDeliveryCollectionRoute(request.path)) {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            if (request.method == "GET") {
	                                HttpResponse ok = JsonResponse(200, "OK", OpsAlertDeliveryListJson(config));
	                                ok.headers["Cache-Control"] = "no-store";
	                                return ok;
	                            }
	                            if (request.method == "POST" || request.method == "PUT") {
	                                constexpr std::size_t kOpsAlertDeliveryMaxBodyBytes = 64 * 1024;
	                                if (request.body.size() > kOpsAlertDeliveryMaxBodyBytes) {
	                                    return JsonResponse(
	                                        413,
	                                        "Payload Too Large",
	                                        "{\"error\":\"alert delivery body is too large\"}");
	                                }
	                                OpsAlertDeliveryConfig saved;
	                                std::string error_message;
	                                if (!UpsertOpsAlertDeliveryConfig(config, request.body, &saved, &error_message)) {
	                                    return JsonResponse(400,
	                                                        "Bad Request",
	                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                                }
	                                std::ostringstream audit_body;
	                                audit_body << "{"
	                                           << "\"area\":\"events\","
	                                           << "\"action\":\"alert-delivery-upsert\","
	                                           << "\"target\":\"alert-delivery:" << JsonEscape(saved.id) << "\","
	                                           << "\"summary\":\"Alert delivery integration updated\","
	                                           << "\"after\":" << OpsAlertDeliveryConfigJson(saved, false)
	                                           << "}";
	                                std::string audit_error;
	                                (void)AppendOpsAuditRecord(
	                                    config,
	                                    OpsAuditRecordJson(audit_body.str(), principal_result.principal),
	                                    &audit_error);
	                                HttpResponse ok = JsonResponse(
	                                    200,
	                                    "OK",
	                                    std::string("{\"status\":\"ops-alert-delivery\",")
	                                        + "\"audit\":{\"area\":\"events\",\"action\":\"alert-delivery-upsert\"},"
	                                        + "\"delivery\":" + OpsAlertDeliveryConfigJson(saved, true) + "}");
	                                ok.headers["Cache-Control"] = "no-store";
	                                return ok;
	                            }
	                            return JsonResponse(405,
	                                                "Method Not Allowed",
	                                                "{\"error\":\"method not allowed\"}");
	                        }

	                        if (IsOpsAlertDeliveryDryRunRoute(request.method, request.path)) {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            constexpr std::size_t kOpsAlertDeliveryDryRunMaxBodyBytes = 64 * 1024;
	                            if (request.body.size() > kOpsAlertDeliveryDryRunMaxBodyBytes) {
	                                return JsonResponse(
	                                    413,
	                                    "Payload Too Large",
	                                    "{\"error\":\"alert delivery dry-run body is too large\"}");
	                            }
	                            std::string error_message;
	                            const std::string body = DispatchOpsAlertDeliveryDryRun(
	                                config, principal_result.principal, request.body, &error_message);
	                            if (body.empty()) {
	                                return JsonResponse(400,
	                                                    "Bad Request",
	                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", body);
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (IsOpsAlertDeliveryFixtureRoute(request.method, request.path)) {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            std::string error_message;
	                            const std::string body = DispatchOpsAlertDeliveryFixture(
	                                config, principal_result.principal, request.body, &error_message);
	                            if (body.empty()) {
	                                return JsonResponse(400,
	                                                    "Bad Request",
	                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", body);
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (IsOpsEventReviewCollectionRoute(request.method, request.path)) {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            std::string body;
	                            std::string error_message;
	                            const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
	                                                             WebRtcSourceRegistry::Instance().Snapshots(),
	                                                             impl_->session_manager.SourceDescriptorSnapshots(),
	                                                             impl_->session_manager.SourceReconnectStatsSnapshot(),
	                                                             impl_->session_manager.SourceEgressStatsSnapshot());
	                            if (!OpsEventReviewInboxJson(
                                        config, source_health_snapshot, query, &body, &error_message)) {
	                                return JsonResponse(400,
	                                                    "Bad Request",
	                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                            }
	                            HttpResponse ok = JsonResponse(200, "OK", body);
	                            ok.headers["Cache-Control"] = "no-store";
	                            return ok;
	                        }

	                        if (IsOpsEventReviewItemRoute(request.path)) {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            const std::string event_id =
                                    UrlDecode(OpsEventReviewItemIdFromPath(request.path));
	                            if (!OpsEventReviewEventIdAllowed(event_id)) {
	                                return JsonResponse(400,
	                                                    "Bad Request",
	                                                    "{\"error\":\"eventId is required\"}");
	                            }
	                            if (request.method == "GET") {
	                                std::unordered_map<std::string, std::string> review_query = query;
	                                review_query["eventId"] = event_id;
	                                std::string body;
	                                std::string error_message;
	                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
	                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
	                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
	                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
	                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
	                                if (!OpsEventReviewInboxJson(config,
                                                                 source_health_snapshot,
                                                                 review_query,
                                                                 &body,
                                                                 &error_message)) {
	                                    return JsonResponse(400,
	                                                        "Bad Request",
	                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                                }
	                                HttpResponse ok = JsonResponse(200, "OK", body);
	                                ok.headers["Cache-Control"] = "no-store";
	                                return ok;
	                            }
	                            if (request.method == "PUT" || request.method == "POST") {
	                                constexpr std::size_t kOpsEventReviewMaxBodyBytes = 32 * 1024;
	                                if (request.body.size() > kOpsEventReviewMaxBodyBytes) {
	                                    return JsonResponse(
	                                        413,
	                                        "Payload Too Large",
	                                        "{\"error\":\"event review body is too large\"}");
	                                }
	                                OpsEventReviewState next;
	                                next.event_id = event_id;
	                                next.review_status = ParseStringField(request.body, "reviewStatus")
	                                                         .value_or(ParseStringField(request.body, "status")
	                                                                       .value_or("reviewing"));
	                                next.classification = ParseStringField(request.body, "classification")
	                                                          .value_or("unclassified");
	                                next.incident_id = ParseStringField(request.body, "incidentId").value_or("");
	                                next.incident_status =
	                                    ParseStringField(request.body, "incidentStatus")
	                                        .value_or(ParseStringField(request.body, "actionStatus").value_or("new"));
	                                next.action_target =
	                                    ParseStringField(request.body, "actionTarget").value_or("operator-triage");
	                                if (const auto incident_workflow =
	                                        ExtractObjectField(request.body, "incidentWorkflow");
	                                    incident_workflow.has_value()) {
	                                    next.incident_id =
	                                        ParseStringField(*incident_workflow, "incidentId")
	                                            .value_or(next.incident_id);
	                                    next.incident_status =
	                                        ParseStringField(*incident_workflow, "status")
	                                            .value_or(next.incident_status);
	                                    next.action_target =
	                                        ParseStringField(*incident_workflow, "actionTarget")
	                                            .value_or(next.action_target);
	                                }
	                                OpsEventReviewState resolution_defaults =
	                                    DefaultOpsEventReviewState(event_id);
	                                {
	                                    std::unordered_map<std::string, OpsEventReviewState>
	                                        existing_reviews;
	                                    if (LoadOpsEventReviewStates(config, &existing_reviews, nullptr)) {
	                                        if (const auto existing_it = existing_reviews.find(event_id);
	                                            existing_it != existing_reviews.end()) {
	                                            resolution_defaults =
	                                                OpsResolutionStateFromReview(existing_it->second);
	                                        }
	                                    }
	                                }
	                                next.resolution_status =
	                                    ParseStringField(request.body, "resolutionStatus")
	                                        .value_or(resolution_defaults.resolution_status);
	                                next.resolution_reason =
	                                    ParseStringField(request.body, "resolutionReason")
	                                        .value_or(resolution_defaults.resolution_reason);
	                                next.resolution_note =
	                                    ParseStringField(request.body, "resolutionNote")
	                                        .value_or(resolution_defaults.resolution_note);
	                                next.resolution_transition =
	                                    ParseStringField(request.body, "resolutionTransition")
	                                        .value_or(resolution_defaults.resolution_transition);
	                                next.resolution_closed_at_ms =
	                                    resolution_defaults.resolution_closed_at_ms;
	                                next.resolution_reopened_at_ms =
	                                    resolution_defaults.resolution_reopened_at_ms;
		                                if (const auto resolution =
		                                        ExtractObjectField(request.body, "resolution");
		                                    resolution.has_value()) {
	                                    next.resolution_status =
	                                        ParseStringField(*resolution, "status")
	                                            .value_or(next.resolution_status);
	                                    next.resolution_reason =
	                                        ParseStringField(*resolution, "reason")
	                                            .value_or(next.resolution_reason);
	                                    next.resolution_note =
	                                        ParseStringField(*resolution, "note")
	                                            .value_or(next.resolution_note);
		                                    next.resolution_transition =
		                                        ParseStringField(*resolution, "transition")
		                                            .value_or(next.resolution_transition);
		                                }
		                                next.note = ParseStringField(request.body, "note").value_or("");
		                                if (const auto operator_resolution_flow =
		                                        ExtractObjectField(request.body, "operatorResolutionFlow");
		                                    operator_resolution_flow.has_value()) {
		                                    next.action_target =
		                                        ParseStringField(*operator_resolution_flow, "assignmentTarget")
		                                            .value_or(ParseStringField(*operator_resolution_flow,
		                                                                      "actionTarget")
		                                                          .value_or(next.action_target));
		                                    next.note =
		                                        ParseStringField(*operator_resolution_flow, "operatorNote")
		                                            .value_or(ParseStringField(*operator_resolution_flow, "note")
		                                                          .value_or(next.note));
		                                    next.resolution_note =
		                                        ParseStringField(*operator_resolution_flow, "resolutionNote")
		                                            .value_or(next.resolution_note);
		                                    next.resolution_transition =
		                                        ParseStringField(*operator_resolution_flow, "resolutionTransition")
		                                            .value_or(next.resolution_transition);
		                                    next.resolution_reason =
		                                        ParseStringField(*operator_resolution_flow, "resolutionReason")
		                                            .value_or(next.resolution_reason);
		                                    next.resolution_status =
		                                        ParseStringField(*operator_resolution_flow, "resolutionStatus")
		                                            .value_or(next.resolution_status);
		                                }
		                                if (const auto vlm_action = ExtractObjectField(request.body, "vlmAction");
		                                    vlm_action.has_value()) {
	                                    next.vlm_action = ParseStringField(*vlm_action, "action")
	                                                          .value_or("not-reviewed");
	                                    next.vlm_action_target = ParseStringField(*vlm_action, "target")
	                                                                 .value_or("eventExplanation");
	                                    next.vlm_action_note = ParseStringField(*vlm_action, "note")
	                                                               .value_or("");
	                                }
	                                next.corrected_feature_label =
	                                    ParseStringField(request.body, "correctedFeatureLabel").value_or("");
	                                next.feature_aliases =
	                                    StringArrayFieldValues(request.body, "featureAliases");
	                                next.reanalysis_requested =
	                                    ParseBoolField(request.body, "reanalysisRequested").value_or(false);
	                                next.reanalysis_reason =
	                                    ParseStringField(request.body, "reanalysisReason").value_or("");
	                                if (const auto feature_correction =
	                                        ExtractObjectField(request.body, "featureCorrection");
	                                    feature_correction.has_value()) {
	                                    next.corrected_feature_label =
	                                        ParseStringField(*feature_correction, "correctedFeatureLabel")
	                                            .value_or(next.corrected_feature_label);
	                                    if (auto aliases =
	                                            StringArrayFieldValues(*feature_correction, "featureAliases");
	                                        !aliases.empty()) {
	                                        next.feature_aliases = std::move(aliases);
	                                    }
	                                    next.reanalysis_requested =
	                                        ParseBoolField(*feature_correction, "reanalysisRequested")
	                                            .value_or(next.reanalysis_requested);
	                                    next.reanalysis_reason =
	                                        ParseStringField(*feature_correction, "reanalysisReason")
	                                            .value_or(next.reanalysis_reason);
	                                }
	                                next.actor = principal_result.principal.username.empty()
	                                                 ? principal_result.principal.display_name
	                                                 : principal_result.principal.username;
	                                next.role = principal_result.principal.role;
	                                OpsEventReviewState previous;
	                                std::string error_message;
	                                if (!UpsertOpsEventReviewState(config, next, &previous, &error_message)) {
	                                    return JsonResponse(400,
	                                                        "Bad Request",
	                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                                }
	                                std::unordered_map<std::string, OpsEventReviewState> reviews;
	                                (void)LoadOpsEventReviewStates(config, &reviews, nullptr);
	                                const auto review_it = reviews.find(event_id);
	                                const OpsEventReviewState saved =
	                                    review_it == reviews.end() ? DefaultOpsEventReviewState(event_id)
	                                                               : review_it->second;
	                                std::ostringstream audit_body;
	                                audit_body << "{"
	                                           << "\"area\":\"events\","
	                                           << "\"action\":\"event-review-update\","
	                                           << "\"target\":\"event:" << JsonEscape(event_id) << "\","
	                                           << "\"summary\":\"Rule event review updated\","
	                                           << "\"before\":" << (previous.present
	                                                                   ? OpsEventReviewStateJson(previous)
	                                                                   : std::string("null"))
	                                           << ",\"after\":" << OpsEventReviewStateJson(saved)
	                                           << "}";
	                                std::string audit_error;
	                                (void)AppendOpsAuditRecord(
	                                    config,
	                                    OpsAuditRecordJson(audit_body.str(), principal_result.principal),
	                                    &audit_error);
	                                std::ostringstream incident_audit_body;
	                                incident_audit_body
	                                    << "{"
	                                    << "\"area\":\"events\","
	                                    << "\"action\":\"incident-action-update\","
	                                    << "\"target\":\""
	                                    << JsonEscape(saved.incident_id.empty()
	                                                      ? "incident:" + event_id
	                                                      : saved.incident_id)
	                                    << "\","
	                                    << "\"summary\":\"Incident action workflow updated\","
	                                    << "\"before\":"
	                                    << (previous.present ? OpsEventReviewStateJson(previous)
	                                                         : std::string("null"))
	                                    << ",\"after\":" << OpsEventReviewStateJson(saved)
	                                    << "}";
	                                (void)AppendOpsAuditRecord(
	                                    config,
	                                    OpsAuditRecordJson(incident_audit_body.str(),
	                                                       principal_result.principal),
	                                    &audit_error);
	                                const char* kOpsOperatorFeatureCorrectionAuditAction =
	                                    "operator-feature-correction-update";
	                                const char* kOpsOperatorFeatureCorrectionAuditSummary =
	                                    "Feature correction updated";
	                                std::ostringstream feature_correction_audit_body;
	                                feature_correction_audit_body
	                                    << "{"
	                                    << "\"area\":\"events\","
	                                    << "\"action\":\"" << kOpsOperatorFeatureCorrectionAuditAction << "\","
	                                    << "\"target\":\"event:" << JsonEscape(event_id) << "\","
	                                    << "\"summary\":\"" << kOpsOperatorFeatureCorrectionAuditSummary << "\","
	                                    << "\"before\":"
	                                    << (previous.present ? OpsEventReviewStateJson(previous)
	                                                         : std::string("null"))
	                                    << ",\"after\":" << OpsEventReviewStateJson(saved)
	                                    << "}";
	                                (void)AppendOpsAuditRecord(
	                                    config,
	                                    OpsAuditRecordJson(feature_correction_audit_body.str(),
	                                                       principal_result.principal),
	                                    &audit_error);
	                                const char* kOpsResolutionStateAuditAction =
	                                    "resolution-state-update";
	                                const char* kOpsResolutionStateAuditSummary =
	                                    "Resolution state updated";
	                                std::ostringstream resolution_audit_body;
	                                resolution_audit_body
	                                    << "{"
	                                    << "\"area\":\"events\","
	                                    << "\"action\":\"" << kOpsResolutionStateAuditAction << "\","
	                                    << "\"target\":\"event:" << JsonEscape(event_id) << "\","
	                                    << "\"summary\":\"" << kOpsResolutionStateAuditSummary << "\","
	                                    << "\"before\":"
	                                    << (previous.present ? OpsEventReviewStateJson(previous)
	                                                         : std::string("null"))
	                                    << ",\"after\":" << OpsEventReviewStateJson(saved)
	                                    << "}";
		                                (void)AppendOpsAuditRecord(
		                                    config,
		                                    OpsAuditRecordJson(resolution_audit_body.str(),
		                                                       principal_result.principal),
		                                    &audit_error);
		                                const char* kOpsOperatorResolutionFlowAuditAction =
		                                    "operator-resolution-flow-update";
		                                const char* kOpsOperatorResolutionFlowAuditSummary =
		                                    "Operator resolution flow updated";
		                                std::ostringstream operator_resolution_audit_body;
		                                operator_resolution_audit_body
		                                    << "{"
		                                    << "\"area\":\"events\","
		                                    << "\"action\":\"" << kOpsOperatorResolutionFlowAuditAction << "\","
		                                    << "\"target\":\"event:" << JsonEscape(event_id) << "\","
		                                    << "\"summary\":\"" << kOpsOperatorResolutionFlowAuditSummary
		                                    << "\","
		                                    << "\"before\":"
		                                    << (previous.present ? OpsEventReviewStateJson(previous)
		                                                         : std::string("null"))
		                                    << ",\"after\":" << OpsEventReviewStateJson(saved)
		                                    << "}";
		                                (void)AppendOpsAuditRecord(
		                                    config,
		                                    OpsAuditRecordJson(operator_resolution_audit_body.str(),
		                                                       principal_result.principal),
		                                    &audit_error);
		                                HttpResponse ok = JsonResponse(
		                                    200,
		                                    "OK",
		                                    std::string("{\"status\":\"ops-event-review\",\"persistent\":true,")
		                                        + "\"audit\":{\"area\":\"events\",\"action\":\"event-review-update\"},"
		                                        + "\"operatorResolutionFlow\":" +
		                                        OpsV320OperatorResolutionFlowJson(
		                                            OpsV320OperatorResolutionFlowInfoFor(saved)) +
		                                        ",\"review\":" + OpsEventReviewStateJson(saved) + "}");
	                                ok.headers["Cache-Control"] = "no-store";
	                                return ok;
	                            }
	                            return JsonResponse(405,
	                                                "Method Not Allowed",
	                                                "{\"error\":\"method not allowed\"}");
	                        }

	                        if (request.path == "/ops/api/audit") {
	                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
	                            if (request.method == "GET") {
	                                const std::string format =
	                                    query.count("format") != 0 ? Trim(query.at("format")) : std::string();
	                                HttpResponse ok;
	                                if (format == "csv") {
	                                    ok = PlainTextResponse(200, "OK", OpsAuditEntriesCsv(config, query));
	                                    ok.content_type = "text/csv; charset=utf-8";
	                                    ok.headers["Content-Disposition"] =
	                                        "attachment; filename=\"ops-audit.csv\"";
	                                } else if (format == "diff-json") {
	                                    ok = JsonResponse(200, "OK", OpsAuditEntriesDiffJson(config, query));
	                                    ok.headers["Content-Disposition"] =
	                                        "attachment; filename=\"ops-audit-diff.json\"";
	                                } else {
	                                    ok = JsonResponse(200, "OK", OpsAuditEntriesJson(config, query));
	                                    if (format == "json" || ParseBoolQuery(query, "download", false)) {
	                                        ok.headers["Content-Disposition"] =
	                                            "attachment; filename=\"ops-audit.json\"";
	                                    }
	                                }
	                                ok.headers["Cache-Control"] = "no-store";
	                                return ok;
	                            }
	                            if (request.method == "POST") {
	                                constexpr std::size_t kOpsAuditMaxBodyBytes = 256 * 1024;
	                                if (request.body.size() > kOpsAuditMaxBodyBytes) {
	                                    return JsonResponse(
	                                        413,
	                                        "Payload Too Large",
	                                        "{\"error\":\"audit entry body is too large\"}");
	                                }
	                                const std::string entry =
	                                    OpsAuditRecordJson(request.body, principal_result.principal);
	                                std::string audit_error;
	                                if (!AppendOpsAuditRecord(config, entry, &audit_error)) {
	                                    return JsonResponse(
	                                        500,
	                                        "Internal Server Error",
	                                        "{\"error\":\"" + JsonEscape(audit_error) + "\"}");
	                                }
	                                HttpResponse ok = JsonResponse(
	                                    201,
	                                    "Created",
	                                    "{\"status\":\"ops-audit\",\"persistent\":true,\"entry\":" + entry + "}");
	                                ok.headers["Cache-Control"] = "no-store";
	                                return ok;
	                            }
	                            return JsonResponse(405,
	                                                "Method Not Allowed",
	                                                "{\"error\":\"method not allowed\"}");
	                        }

	                        if (request.path == "/ops/api/invites") {
	                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
	                                return *auth_response;
	                            }
                            if (request.method == "GET") {
                                return AuthUserHttpResponse(auth::ListInvites(config));
                            }
                            if (request.method == "POST") {
                                const auth::AuthUserResult result =
                                    auth::CreateInviteFromJson(config, request.body);
                                return AuthUserHttpResponse(result);
                            }
                        }

                        if (request.path == "/ops/api/access-requests") {
                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                return AuthUserHttpResponse(auth::ListAccessRequests(config));
                            }
                        }

                        if (request.path.rfind("/ops/api/access-requests/", 0) == 0) {
                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string suffix =
                                request.path.substr(std::string("/ops/api/access-requests/").size());
                            const std::size_t slash = suffix.find('/');
                            const std::string request_id =
                                UrlDecode(slash == std::string::npos ? suffix : suffix.substr(0, slash));
                            const std::string action =
                                slash == std::string::npos ? std::string() : suffix.substr(slash + 1);
                            if (request.method == "POST" && action == "approve") {
                                const auth::AuthUserResult result =
                                    auth::ApproveAccessRequestFromJson(config, request_id, request.body);
                                if (result.status >= 200 && result.status < 300 && !result.username.empty()) {
                                    revoke_auth_sessions_for(result.username);
                                }
                                return AuthUserHttpResponse(result);
                            }
                            if (request.method == "POST" && action == "reject") {
                                return AuthUserHttpResponse(auth::RejectAccessRequest(config, request_id));
                            }
                            return JsonResponse(404,
                                                "Not Found",
                                                "{\"error\":\"access request resource not found\"}");
                        }

                        if (request.path.rfind("/ops/api/users/", 0) == 0) {
                            if (const auto auth_response = require_admin_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string suffix =
                                request.path.substr(std::string("/ops/api/users/").size());
                            const std::size_t slash = suffix.find('/');
                            const std::string username =
                                UrlDecode(slash == std::string::npos ? suffix : suffix.substr(0, slash));
                            const std::string action =
                                slash == std::string::npos ? std::string() : suffix.substr(slash + 1);
                            auth::AuthUserResult result;
                            if (request.method == "PUT" && action.empty()) {
                                result = auth::UpdateAuthUserFromJson(config, username, request.body);
                            } else if (request.method == "POST" && action == "reset-password") {
                                result = auth::ResetAuthUserPasswordFromJson(config, username, request.body);
                            } else if (request.method == "POST" && action == "disable") {
                                result = auth::SetAuthUserEnabled(config, username, false);
                            } else if (request.method == "POST" && action == "enable") {
                                result = auth::SetAuthUserEnabled(config, username, true);
                            } else {
                                return JsonResponse(404,
                                                    "Not Found",
                                                    "{\"error\":\"user resource not found\"}");
                            }
                            if (result.status >= 200 && result.status < 300 && !result.username.empty()) {
                                revoke_auth_sessions_for(result.username);
                            }
                            return AuthUserHttpResponse(result);
                        }

                        if (request.path == "/ops/api/source-registry/reliability-timeline") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV330ReliabilityTimelineHealthHistoryJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/reliability-search-metrics") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV330SourceReliabilitySearchMetricsJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/graph") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV350LiveOperationsGraphJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/command-plan") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV350CommandPlanJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/staged-change-plan-impact-preview") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV350StagedChangePlanImpactPreviewJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/drill-run-ledger") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV350DrillRunLedgerPlanComparisonJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/export-bundle-handoff-map") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV350OperationsExportBundleHandoffMapJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/field-evidence-intake") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV350FieldEvidenceIntakeJson(source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/vlm-assisted-explanation") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV350VlmAssistedOpsExplanationJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/input-pack") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360SimulationInputPackJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/run-contract") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360OperationsSimulationRunContractJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/command-plan-dry-run") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360CommandPlanDryRunSimulatorJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/impact-diff") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360SourceRuleImpactDiffJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/safe-apply-readiness") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360SafeApplyReadinessGateJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/run-ledger") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360SimulationRunLedgerComparisonJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/client-notice-preview") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360ClientNoticePreviewJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360RuleVaWhatIfReplayPackJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/export-bundle") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360SimulationExportBundleJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/field-evidence-adapter") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360FieldEvidenceSimulationAdapterJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/live-operations/simulation/vlm-assisted-explanation") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV360VlmAssistedSimulationExplanationJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/source-health-replay-drift-diff") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV340SourceHealthReplayDriftDiffJson(source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/continuity-drill/contract") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV340ContinuityDrillContractJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/recovery-candidate-package") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV340RecoveryCandidatePackageJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/approval-gated-recovery-checklist") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV340ApprovalGatedRecoveryChecklistJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/drill-evidence-export-cleanup-manifest") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV340DrillEvidenceExportCleanupManifestJson(config, source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/field-bridge-condition-gates") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV340FieldBridgeConditionGatesJson(source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.method == "GET" && request.path == "/ops/api/source-registry/staging-restore-validation-handoff") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            HttpResponse ok = JsonResponse(
                                200,
                                "OK",
                                OpsV390StagingRestoreValidationHandoffJson());
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (request.path == "/ops/api/source-registry/backup-recovery-handoff") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                const auto source_health_snapshot =
	                                BuildOpsSourceHealthSnapshot(impl_->analysis_session_reads.Snapshots(),
                                                                 WebRtcSourceRegistry::Instance().Snapshots(),
                                                                 impl_->session_manager.SourceDescriptorSnapshots(),
                                                                 impl_->session_manager.SourceReconnectStatsSnapshot(),
                                                                 impl_->session_manager.SourceEgressStatsSnapshot());
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV330BackupRecoverySourceHandoffJson(source_health_snapshot));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/onboarding-quality") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().SourceOnboardingQualitySummaryJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/source-registry/snapshot") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().SourceRegistrySnapshotIdentityJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/sources") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                return RegistryHttpResponse(SourceViewApplicationService::Instance().SourcesJson());
                            }
                            if (request.method == "POST") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().CreateSource(request.body));
                            }
                        }

                        if (request.path == "/ops/api/channels/bulk") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method != "POST") {
                                return JsonResponse(405,
                                                    "Method Not Allowed",
                                                    "{\"error\":\"method not allowed\"}");
                            }
                            if (const auto auth_response = require_source_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            HttpResponse ok = JsonResponse(200, "OK", OpsChannelBulkJson(request.body));
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (request.path == "/ops/api/onvif/import-draft") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method != "POST") {
                                return JsonResponse(405,
                                                    "Method Not Allowed",
                                                    "{\"error\":\"method not allowed\"}");
                            }
                            if (const auto auth_response = require_source_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            HttpResponse ok = RegistryHttpResponse(BuildOnvifLiveImportDraft(request.body));
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (request.path.rfind("/ops/api/onvif/channels/", 0) == 0) {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method != "PUT") {
                                return JsonResponse(405,
                                                    "Method Not Allowed",
                                                    "{\"error\":\"method not allowed\"}");
                            }
                            if (const auto auth_response = require_source_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            constexpr std::size_t kOnvifPairedSaveMaxBodyBytes = 128 * 1024;
                            if (request.body.size() > kOnvifPairedSaveMaxBodyBytes) {
                                return JsonResponse(413,
                                                    "Payload Too Large",
                                                    "{\"error\":\"ONVIF paired save body is too large\"}");
                            }
                            if (CountJsonFieldOccurrences(request.body, "source") != 1 ||
                                CountJsonFieldOccurrences(request.body, "publishedView") != 1) {
                                return JsonResponse(
                                    400,
                                    "Bad Request",
                                    "{\"error\":\"ONVIF paired save requires exactly one source and publishedView object\"}");
                            }
                            const auto source = ExtractObjectField(request.body, "source");
                            const auto published_view =
                                ExtractObjectField(request.body, "publishedView");
                            if (!source.has_value() || !published_view.has_value()) {
                                return JsonResponse(
                                    400,
                                    "Bad Request",
                                    "{\"error\":\"ONVIF paired save requires source and publishedView objects\"}");
                            }
                            const std::string source_id = UrlDecode(request.path.substr(
                                std::string("/ops/api/onvif/channels/").size()));
                            return RegistryHttpResponse(
                                SourceViewApplicationService::Instance().UpsertOnvifSourceView(
                                    source_id, *source, *published_view));
                        }

                        if (request.path == "/ops/api/onvif/live-import-persist-decision") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV390OnvifLiveImportPersistDecisionJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path == "/ops/api/onvif/credential-provider-status") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    OpsV390OnvifCredentialProviderStatusSummaryJson());
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                        }

                        if (request.path.rfind("/ops/api/sources/", 0) == 0) {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string source_id =
                                UrlDecode(request.path.substr(std::string("/ops/api/sources/").size()));
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().UpsertSource(source_id, request.body));
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().DisableSource(source_id));
                            }
                        }

                        if (request.path == "/ops/api/views") {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                return RegistryHttpResponse(SourceViewApplicationService::Instance().ViewsJson());
                            }
                            if (request.method == "POST") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().CreateView(request.body));
                            }
                        }

                        if (request.path.rfind("/ops/api/views/", 0) == 0) {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string view_id =
                                UrlDecode(request.path.substr(std::string("/ops/api/views/").size()));
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().UpsertView(view_id, request.body));
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_source_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                return RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().DisableView(view_id));
                            }
                        }

                        if (request.path == "/client/api/preferences/live-layout") {
                            if (const auto auth_response = require_client_api_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    ClientLiveLayoutPreferencesJson(
                                        config, principal_result.principal, false));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                            if (request.method == "PUT" || request.method == "POST") {
                                constexpr std::size_t kClientLiveLayoutPreferenceMaxBodyBytes = 24 * 1024;
                                if (request.body.size() > kClientLiveLayoutPreferenceMaxBodyBytes) {
                                    return JsonResponse(
                                        413,
                                        "Payload Too Large",
                                        "{\"error\":\"client live layout preference body is too large\"}");
                                }
                                std::string error_message;
                                if (!UpsertClientLiveLayoutPreference(
                                        config,
                                        principal_result.principal,
                                        request.body,
                                        &error_message)) {
                                    const bool invalid =
                                        error_message.rfind("invalid live layout preference", 0) == 0;
                                    return JsonResponse(
                                        invalid ? 400 : 500,
                                        invalid ? "Bad Request" : "Internal Server Error",
                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                HttpResponse ok = JsonResponse(
                                    200,
                                    "OK",
                                    ClientLiveLayoutPreferencesJson(
                                        config, principal_result.principal, true));
                                ok.headers["Cache-Control"] = "no-store";
                                return ok;
                            }
                            return JsonResponse(405,
                                                "Method Not Allowed",
                                                "{\"error\":\"method not allowed\"}");
                        }

                        if (request.path == "/client/api/views") {
                            if (const auto auth_response = require_client_api_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            if (request.method == "GET") {
                                return RegistryHttpResponse(SourceViewApplicationService::Instance().ClientViewsJson(
                                    MakeClientViewAccessAuthorizer(principal_result.principal)));
                            }
                        }

                        if (request.path.rfind("/client/api/views/", 0) == 0) {
                            if (const auto auth_response = require_client_api_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                            const std::string suffix =
                                request.path.substr(std::string("/client/api/views/").size());
                            const std::size_t slash = suffix.find('/');
                            const std::string view_id =
                                UrlDecode(slash == std::string::npos ? suffix : suffix.substr(0, slash));
                            const std::string subresource =
                                slash == std::string::npos ? std::string() : suffix.substr(slash + 1);
                            if (request.method == "POST" && subresource == "webrtc/session") {
                                if (ClientLiveRequestHasSourceOverride(request.body, query)) {
                                    return JsonResponse(400,
                                                        "Bad Request",
                                                        "{\"error\":\"client live accepts viewId only; source override is not allowed\"}");
                                }
                                SourceViewApplicationService::ClientViewAccess access;
                                const auto access_result =
                                    SourceViewApplicationService::Instance().ResolveClientViewAccess(
                                        view_id,
                                        MakeClientViewAccessAuthorizer(principal_result.principal),
                                        "view:read",
                                        &access);
                                if (access_result.status != 200) {
                                    return RegistryHttpResponse(access_result);
                                }
                                const std::string overlay_mode =
                                    ParseStringField(request.body, "overlayMode")
                                        .value_or(ParseStringField(request.body, "mode")
                                                      .value_or(query.count("overlayMode") != 0
                                                                    ? query.at("overlayMode")
                                                                    : (query.count("mode") != 0 ? query.at("mode")
                                                                                                : "")));
                                const std::string rule_id =
                                    ParseStringField(request.body, "ruleId")
                                        .value_or(query.count("ruleId") != 0 ? query.at("ruleId") : "");
                                std::unordered_map<std::string, std::string> session_query;
                                std::string error_message;
	                                if (!BuildClientLiveWebRtcQuery(access,
	                                                                overlay_mode,
	                                                                rule_id,
	                                                                &session_query,
	                                                                &error_message)) {
	                                    return JsonResponse(400,
	                                                        "Bad Request",
	                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
	                                }
                                    const std::string label_lang =
                                        ParseStringField(request.body, "labelLang")
                                            .value_or(query.count("labelLang") != 0 ? query.at("labelLang") : "");
                                    const std::string normalized_label_lang = LowerAscii(Trim(label_lang));
                                    if (normalized_label_lang == "en" ||
                                        normalized_label_lang == "english") {
                                        session_query["labelLang"] = "en";
                                    } else if (normalized_label_lang == "ko" ||
                                               normalized_label_lang == "korean") {
                                        session_query["labelLang"] = "ko";
                                    }
	                                const int client_view_max_tiles = std::max(1, access.view.max_tiles);
	                                const auto active_client_view_sessions_locked = [&]() {
	                                    std::size_t count = 0;
	                                    for (auto it = impl_->client_sessions.begin();
	                                         it != impl_->client_sessions.end();) {
	                                        if (impl_->sessions.find(it->second.session_id) ==
	                                            impl_->sessions.end()) {
	                                            it = impl_->client_sessions.erase(it);
	                                            continue;
	                                        }
	                                        if (it->second.view_id == view_id &&
	                                            SameSessionOwner(it->second.owner_principal,
	                                                             principal_result.principal)) {
	                                            ++count;
	                                        }
	                                        ++it;
	                                    }
	                                    return count;
	                                };
	                                {
	                                    std::lock_guard lock(impl_->mu);
	                                    if (active_client_view_sessions_locked() >=
	                                        static_cast<std::size_t>(client_view_max_tiles)) {
	                                        return JsonResponse(
	                                            409,
	                                            "Conflict",
	                                            "{\"error\":\"PublishedView maxTiles limit reached\"}");
	                                    }
	                                }
	                                CreatedWebRtcSession created_session;
	                                HttpResponse created_response =
	                                    create_webrtc_session_response(
	                                        std::move(session_query), "client-live-internal", &created_session);
                                if (created_response.status != 200) {
                                    return created_response;
                                }
                                std::string client_session_error;
                                const auto client_session_id =
                                    GeneratePrefixedRandomId("client-live", &client_session_error);
                                if (!client_session_id.has_value()) {
                                    (void)close_webrtc_session(created_session.session_id);
                                    return JsonResponse(
                                        503,
                                        "Service Unavailable",
                                        "{\"error\":\"" + JsonEscape(client_session_error) + "\"}");
	                                }
	                                bool client_session_inserted = false;
	                                bool client_session_limit_reached = false;
	                                {
	                                    std::lock_guard lock(impl_->mu);
	                                    if (active_client_view_sessions_locked() >=
	                                        static_cast<std::size_t>(client_view_max_tiles)) {
	                                        client_session_limit_reached = true;
	                                    } else {
	                                        const auto [_, inserted] = impl_->client_sessions.emplace(
	                                            *client_session_id,
	                                            Impl::ClientSessionEntry{
	                                                .client_session_id = *client_session_id,
	                                                .view_id = view_id,
	                                                .session_id = created_session.session_id,
	                                                .owner_principal = principal_result.principal,
	                                            });
	                                        client_session_inserted = inserted;
	                                    }
	                                }
	                                if (client_session_limit_reached) {
	                                    (void)close_webrtc_session(created_session.session_id);
	                                    return JsonResponse(
	                                        409,
	                                        "Conflict",
	                                        "{\"error\":\"PublishedView maxTiles limit reached\"}");
	                                }
	                                if (!client_session_inserted) {
	                                    (void)close_webrtc_session(created_session.session_id);
	                                    return JsonResponse(
                                        503,
                                        "Service Unavailable",
                                        "{\"error\":\"failed to allocate client session\"}");
                                }
                                return JsonResponse(
                                    200,
                                    "OK",
                                    ClientSessionJson(*client_session_id, created_session.offer));
                            }
                            const std::string client_session_prefix = "webrtc/session/";
                            if (subresource.rfind(client_session_prefix, 0) == 0) {
                                const std::string rest = subresource.substr(client_session_prefix.size());
                                const std::size_t session_slash = rest.find('/');
                                const std::string client_session_id = UrlDecode(
                                    session_slash == std::string::npos ? rest : rest.substr(0, session_slash));
                                const std::string session_suffix =
                                    session_slash == std::string::npos ? std::string() : rest.substr(session_slash);
                                Impl::ClientSessionEntry client_session;
                                Impl::SessionEntry session_entry;
                                {
                                    std::lock_guard lock(impl_->mu);
                                    const auto client_it = impl_->client_sessions.find(client_session_id);
                                    if (client_it == impl_->client_sessions.end() ||
                                        client_it->second.view_id != view_id) {
                                        return JsonResponse(
                                            404,
                                            "Not Found",
                                            "{\"error\":\"unknown client WebRTC session\"}");
                                    }
                                    client_session = client_it->second;
                                    const auto session_it =
                                        impl_->sessions.find(client_session.session_id);
                                    if (session_it == impl_->sessions.end()) {
                                        impl_->client_sessions.erase(client_it);
                                        return JsonResponse(
                                            404,
                                            "Not Found",
                                            "{\"error\":\"unknown client WebRTC session\"}");
                                    }
                                    session_entry = session_it->second;
                                }
                                if (!SameSessionOwner(client_session.owner_principal,
                                                      principal_result.principal)) {
                                    return JsonResponse(
                                        403,
                                        "Forbidden",
                                        "{\"error\":\"client WebRTC session owner required\"}");
                                }
                                if (request.method == "POST" && session_suffix == "/answer") {
                                    std::string error_message;
                                    if (!session_entry.bridge->SetRemoteAnswer(
                                            request.body, &error_message)) {
                                        return JsonResponse(
                                            400,
                                            "Bad Request",
                                            "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                    }
                                    return JsonResponse(200, "OK", "{\"ok\":true}");
                                }
                                if ((request.method == "POST" || request.method == "PATCH") &&
                                    (session_suffix.empty() || session_suffix == "/ice")) {
                                    const auto candidate = ParseStringField(request.body, "candidate");
                                    const auto mline = ParseIntField(request.body, "sdpMLineIndex");
                                    if (!candidate.has_value() || !mline.has_value()) {
                                        return JsonResponse(
                                            400,
                                            "Bad Request",
                                            "{\"error\":\"candidate and sdpMLineIndex are required\"}");
                                    }
                                    session_entry.bridge->AddRemoteIceCandidate(
                                        static_cast<std::uint32_t>(*mline), *candidate);
                                    return JsonResponse(200, "OK", "{\"ok\":true}");
                                }
                                if (request.method == "GET" && session_suffix == "/ice") {
                                    return JsonResponse(
                                        200,
                                        "OK",
                                        IceJson(session_entry.bridge->TakePendingLocalIceCandidates()));
                                }
                                if (request.method == "DELETE" &&
                                    (session_suffix.empty() || session_suffix == "/")) {
                                    if (!close_webrtc_session(client_session.session_id)) {
                                        return JsonResponse(
                                            404,
                                            "Not Found",
                                            "{\"error\":\"unknown client WebRTC session\"}");
                                    }
                                    return JsonResponse(200, "OK", "{\"ok\":true}");
                                }
                                return JsonResponse(
                                    404,
                                    "Not Found",
                                    "{\"error\":\"client WebRTC session resource not found\"}");
                            }
                            if (request.method == "GET") {
                                if (IsClientViewSummaryRoute(subresource) &&
                                    IsClientViewDashboardSummaryRoute(subresource)) {
                                    SourceViewApplicationService::ClientViewAccess access;
                                    const auto access_result =
                                        SourceViewApplicationService::Instance().ResolveClientViewAccess(
                                            view_id,
                                            MakeClientViewAccessAuthorizer(principal_result.principal),
                                            "dashboard:read",
                                            &access);
                                    if (access_result.status != 200) {
                                        return RegistryHttpResponse(access_result);
                                    }
                                    if (!access.view.show_dashboard) {
                                        return JsonResponse(403,
                                                            "Forbidden",
                                                            "{\"error\":\"dashboard is not enabled for this view\"}");
                                    }
                                    return JsonResponse(
                                        200,
                                        "OK",
                                        ClientViewDashboardJson(
                                            access,
                                            principal_result.principal,
                                        impl_->analysis_session_reads.Snapshots()));
                                }
                                if (IsClientViewSummaryRoute(subresource) &&
                                    IsClientViewEventsSearchRoute(subresource)) {
                                    if (!auth::IsIntegrator(principal_result.principal)) {
                                        return JsonResponse(
                                            403,
                                            "Forbidden",
                                            "{\"error\":\"Integrator scoped search requires integrator role\"}");
                                    }
                                    SourceViewApplicationService::ClientViewAccess access;
                                    const auto access_result =
                                        SourceViewApplicationService::Instance().ResolveClientViewAccess(
                                            view_id,
                                            MakeClientViewAccessAuthorizer(principal_result.principal),
                                            "event:read",
                                            &access);
                                    if (access_result.status != 200) {
                                        return RegistryHttpResponse(access_result);
                                    }
                                    if (!access.view.show_events) {
                                        return JsonResponse(
                                            403,
                                            "Forbidden",
                                            "{\"error\":\"events search is not enabled for this view\"}");
                                    }
                                    return JsonResponse(
                                        200,
                                        "OK",
                                        IntegratorScopedEventSearchJson(
                                            access,
                                            principal_result.principal,
                                            ParseQueryString(request.query)));
                                }
                                if (IsClientViewSummaryRoute(subresource) &&
                                    IsClientViewEventsSummaryRoute(subresource)) {
                                    SourceViewApplicationService::ClientViewAccess access;
                                    const auto access_result =
                                        SourceViewApplicationService::Instance().ResolveClientViewAccess(
                                            view_id,
                                            MakeClientViewAccessAuthorizer(principal_result.principal),
                                            "event:read",
                                            &access);
                                    if (access_result.status != 200) {
                                        return RegistryHttpResponse(access_result);
                                    }
                                    if (!access.view.show_events) {
                                        return JsonResponse(403,
                                                            "Forbidden",
                                                            "{\"error\":\"events are not enabled for this view\"}");
                                    }
                                    const auto event_query = ParseQueryString(request.query);
                                    const int limit = ParseClampedIntQuery(event_query, "limit", 20, 1, 50);
                                    return JsonResponse(
                                        200,
                                        "OK",
                                        ClientViewEventsJson(
                                            access,
                                            principal_result.principal,
                                            impl_->analysis_session_reads.Snapshots(),
                                            limit));
                                }
                                if (IsClientViewSummaryRoute(subresource) &&
                                    IsClientViewMetadataSummaryRoute(subresource)) {
                                    SourceViewApplicationService::ClientViewAccess access;
                                    const auto access_result =
                                        SourceViewApplicationService::Instance().ResolveClientViewAccess(
                                            view_id,
                                            MakeClientViewAccessAuthorizer(principal_result.principal),
                                            "metadata:read",
                                            &access);
                                    if (access_result.status != 200) {
                                        return RegistryHttpResponse(access_result);
                                    }
                                    if (!access.view.show_metadata_summary) {
                                        return JsonResponse(
                                            403,
                                            "Forbidden",
                                            "{\"error\":\"metadata summary is not enabled for this view\"}");
                                    }
                                    return JsonResponse(
                                        200,
                                        "OK",
                                        ClientViewMetadataJson(
                                            access, impl_->analysis_session_reads.Snapshots()));
                                }
                                if (!subresource.empty()) {
                                    return JsonResponse(404,
                                                        "Not Found",
                                                        "{\"error\":\"client view resource not found\"}");
                                }
                                return RegistryHttpResponse(
                                    SourceViewApplicationService::Instance().ClientViewJson(view_id,
                                        MakeClientViewAccessAuthorizer(principal_result.principal)));
                            }
                        }

                        if (request.method == "GET" &&
                            (IsOpsOverviewShellRoute(request.path) ||
                             IsOpsEventsPageRoute(request.path))) {
                            if (const auto auth_response = require_ops_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_ops) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("운영 콘솔은 admin/operator role과 ops:read scope가 필요합니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(OpsShellPageHtml(config.stream_route,
                                                                     config.rtsp_listen_port,
                                                                     ProductUiPrincipalViewFromAuthPrincipal(
                                                                         principal_result.principal),
                                                                     OpsOverviewActiveForPath(request.path)));
                        }

                        if (request.method == "GET" && IsClientShellRoute(request.path)) {
                            if (const auto auth_response = require_client_shell_principal(); auth_response.has_value()) {
                                if (!principal_result.ok && session_auth_mode && config.enable_client) {
                                    return RedirectResponse("/login");
                                }
                                if (!principal_result.ok) {
                                    return UnauthorizedPageResponse();
                                }
                                if (auth_response->status == 403) {
                                    return ForbiddenPageResponse("클라이언트 포털은 viewer/operator/admin 계정만 접근할 수 있습니다.");
                                }
                                return *auth_response;
                            }
                            return HtmlPageResponse(ClientShellPageHtml(
                                principal_result.principal, ClientShellActiveForPath(request.path)));
                        }

                        if (request.method == "GET" && request.path == "/favicon.ico") {
                            HttpResponse no_content;
                            no_content.status = 204;
                            no_content.status_text = "No Content";
                            no_content.content_type = "image/x-icon";
                            return no_content;
                        }

                        if (request.method == "GET" && request.path == "/webrtc/config") {
                            HttpResponse ok = JsonResponse(200, "OK", WebRtcBrowserConfigJson());
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        const auto is_lab_api_route = [](const std::string& path) {
                            return path == "/lab/files" ||
                                   path == "/lab/reports" ||
                                   path == "/lab/reports/content" ||
                                   path == "/lab/runtime/status" ||
                                   path.rfind("/lab/analysis/", 0) == 0;
                        };
                        if (is_lab_api_route(request.path)) {
                            if (const auto auth_response = require_lab_principal(); auth_response.has_value()) {
                                return *auth_response;
                            }
                        }

                        if (request.method == "GET" && request.path == "/lab/files") {
                            return JsonResponse(200, "OK", LabFilesJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/reports") {
                            return JsonResponse(200, "OK", LabReportsJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/reports/content") {
                            std::string response_body;
                            std::string error_message;
                            const auto path_it = query.find("path");
                            if (path_it == query.end()) {
                                error_message = "report path is required";
                            }
                            if (path_it == query.end() ||
                                !BuildLabReportContentJson(path_it->second, &response_body, &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK", response_body);
                        }

                        if (IsLabEventEvidenceBundleTokenRoute(request.method, request.path)) {
                            std::string error_message;
                            const std::string response_body = EventEvidenceBundleTokenJson(query, &error_message);
                            if (response_body.empty()) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            HttpResponse ok = JsonResponse(200, "OK", response_body);
                            ok.headers["Cache-Control"] = "no-store";
                            return ok;
                        }

                        if (IsLabEventEvidenceBundleDownloadRoute(request.method, request.path)) {
                            std::string zip_body;
                            std::string download_name;
                            std::string error_message;
                            if (!BuildEventEvidenceBundleZip(query,
                                                             &zip_body,
                                                             &download_name,
                                                             &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            const std::string event_id =
                                Trim(query.find("eventId") == query.end() ? "" : query.at("eventId"));
                            const bool release_safe_requested = EvidenceBundleReleaseSafeRequested(query);
                            const std::string audit_body =
                                BuildEvidenceBundleAuditJson(event_id, download_name, release_safe_requested);
                            std::string audit_error;
                            (void)AppendOpsAuditRecord(config,
                                                       OpsAuditRecordJson(audit_body, principal_result.principal),
                                                       &audit_error);
                            HttpResponse ok;
                            ok.status = 200;
                            ok.status_text = "OK";
                            ok.content_type = "application/zip";
                            ok.headers["Cache-Control"] = "no-store";
                            ok.headers["Content-Disposition"] =
                                "attachment; filename=\"" + JsonEscape(download_name) + "\"";
                            ok.body = std::move(zip_body);
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/events/evidence") {
                            const auto path_it = query.find("path");
                            if (path_it == query.end() || Trim(path_it->second).empty()) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"evidence path is required\"}");
                            }
                            std::filesystem::path resolved;
                            std::string content_type;
                            if (!IsSafeEventEvidencePath(std::filesystem::path(path_it->second),
                                                         &resolved,
                                                         &content_type)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"invalid event evidence path\"}");
                            }
                            std::ifstream input(resolved, std::ios::in | std::ios::binary);
                            if (!input.good()) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"failed to open event evidence file\"}");
                            }
                            std::ostringstream body;
                            body << input.rdbuf();
                            HttpResponse ok;
                            ok.status = 200;
                            ok.status_text = "OK";
                            ok.content_type = content_type;
                            ok.headers["Cache-Control"] = "no-store";
                            if (const auto download_it = query.find("download");
                                download_it != query.end() && Trim(download_it->second) == "1") {
                                ok.headers["Content-Disposition"] =
                                    "attachment; filename=\"" + JsonEscape(resolved.filename().string()) + "\"";
                            }
                            ok.body = body.str();
                            return ok;
                        }
                        if (request.method == "DELETE" && request.path == "/lab/analysis/events/evidence") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            return JsonResponse(
                                403,
                                "Forbidden",
                                "{\"error\":\"evidence file deletion is disabled by policy\","
                                "\"deletePolicy\":{\"evidenceFileDelete\":false,"
                                "\"evidenceFileDeletePermission\":\"blocked-for-all-roles\"}}");
                        }

	                        if (request.method == "GET" && request.path == "/lab/runtime/status") {
	                            return JsonResponse(200,
	                                                "OK",
	                                                runtime_status_body());
	                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/capabilities") {
                            return JsonResponse(200, "OK", AnalysisCapabilitiesJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/event-post/status") {
                            return JsonResponse(200, "OK", AnalysisEventPostStatusJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/event-storage/status") {
                            return JsonResponse(200, "OK", AnalysisEventStorageStatusJson());
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/events/records") {
                            EventStorageApplicationQueryOptions options;
                            std::string error_message;
                            if (!BuildEventRecordQueryOptions(query, &options, &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            EventStorageApplicationQueryResult result;
                            if (!QueryEventRecordsForApplication(options, &result, &error_message)) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK", AnalysisEventRecordsJson(result));
                        }

                        if (request.method == "POST" &&
                            request.path == "/lab/analysis/events/records/compact") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            EventStorageApplicationQueryOptions options;
                            std::string error_message;
                            if (!BuildEventRecordQueryOptions(query, &options, &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            EventStorageApplicationCompactionResult result;
                            if (!CompactEventRecordsForApplication(options, &result, &error_message)) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK", AnalysisEventRecordCompactionJson(result));
                        }

                        if (request.method == "GET" &&
                            request.path == "/lab/analysis/events/records/compactions") {
                            EventStorageApplicationCompactedFileListResult result;
                            std::string error_message;
                            if (!ListCompactedEventRecordFilesForApplication(&result, &error_message)) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200, "OK", AnalysisEventRecordCompactedFilesJson(result));
                        }

                        if (request.method == "POST" &&
                            request.path == "/lab/analysis/events/records/compactions/cleanup") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            std::size_t keep_newest = 10;
                            if (const auto it = query.find("keepNewest");
                                it != query.end() && !Trim(it->second).empty()) {
                                std::uint64_t parsed = 0;
                                if (!ParseStrictUint64(Trim(it->second), &parsed)) {
                                    return JsonResponse(400,
                                                        "Bad Request",
                                                        "{\"error\":\"keepNewest must be a non-negative integer\"}");
                                }
                                keep_newest = static_cast<std::size_t>(parsed);
                            }
                            EventStorageApplicationCompactedFileCleanupResult result;
                            std::string error_message;
                            if (!CleanupCompactedEventRecordFilesForApplication(keep_newest,
                                                                           &result,
                                                                           &error_message)) {
                                return JsonResponse(500,
                                                    "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            return JsonResponse(200,
                                                "OK",
                                                AnalysisEventRecordCompactedFileCleanupJson(result));
                        }

                        const auto compacted_record_prefix =
                            std::string("/lab/analysis/events/records/compactions/");
                        if (request.path.rfind(compacted_record_prefix, 0) == 0) {
                            const std::string file_name =
                                UrlDecode(request.path.substr(compacted_record_prefix.size()));
                            if (file_name.empty()) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"compacted file name is required\"}");
                            }
                            if (request.method == "GET") {
                                EventStorageApplicationCompactedFileInfo file;
                                std::string error_message;
                                if (!ResolveCompactedEventRecordFileForApplication(file_name, &file, &error_message)) {
                                    return JsonResponse(404,
                                                        "Not Found",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                std::ifstream input(file.path, std::ios::in | std::ios::binary);
                                if (!input.good()) {
                                    return JsonResponse(500,
                                                        "Internal Server Error",
                                                        "{\"error\":\"failed to open compacted event record file\"}");
                                }
                                std::ostringstream body;
                                body << input.rdbuf();
                                HttpResponse ok;
                                ok.status = 200;
                                ok.status_text = "OK";
                                ok.content_type = "application/x-ndjson; charset=utf-8";
                                ok.headers["Cache-Control"] = "no-store";
                                ok.headers["Content-Disposition"] =
                                    "attachment; filename=\"" + JsonEscape(file.file_name) + "\"";
                                ok.body = body.str();
                                return ok;
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                EventStorageApplicationCompactedFileInfo file;
                                std::string error_message;
                                if (!DeleteCompactedEventRecordFileForApplication(file_name, &file, &error_message)) {
                                    return JsonResponse(404,
                                                        "Not Found",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisEventRecordCompactedFileDeletedJson(file));
                            }
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/profiles") {
                            return JsonResponse(200, "OK", AnalysisProfilesJson());
                        }

                        if (request.method == "POST" && request.path == "/lab/analysis/profiles") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            const auto result = AnalysisRegistry().CreateProfile(request.body);
                            if (!result.ok) {
                                return AnalysisRegistryMutationErrorResponse(result, 400, "Bad Request");
                            }
                            return JsonResponse(201, "Created", result.response_body);
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/rules") {
                            return JsonResponse(200, "OK", AnalysisRulesJson());
                        }

                        if (request.method == "POST" && request.path == "/lab/analysis/rules") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            const auto result = AnalysisRegistry().CreateRule(request.body);
                            if (!result.ok) {
                                return AnalysisRegistryMutationErrorResponse(result, 400, "Bad Request");
                            }
                            return JsonResponse(201, "Created", result.response_body);
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/va-rules") {
                            return JsonResponse(200, "OK", AnalysisVaRulesJson());
                        }

                        if (request.method == "POST" && request.path == "/lab/analysis/va-rules") {
                            if (const auto auth_response = require_rule_write_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            const auto result = AnalysisRegistry().CreateVaRule(request.body);
                            if (!result.ok) {
                                return AnalysisRegistryMutationErrorResponse(result, 400, "Bad Request");
                            }
                            return JsonResponse(201, "Created", result.response_body);
                        }

                        const auto analysis_profile_prefix = std::string("/lab/analysis/profiles/");
                        if (request.path.rfind(analysis_profile_prefix, 0) == 0) {
                            const std::string id = UrlDecode(request.path.substr(analysis_profile_prefix.size()));
                            if (id.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"profile id is required\"}");
                            }
                            if (request.method == "GET") {
                                const auto profile = AnalysisRegistry().ProfileJson(id);
                                if (!profile.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis profile not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"profile\":" + *profile + "}");
                            }
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                const auto result = AnalysisRegistry().UpsertProfile(id, request.body);
                                if (!result.ok) {
                                    return AnalysisRegistryMutationErrorResponse(result, 400, "Bad Request");
                                }
                                return JsonResponse(200, "OK", result.response_body);
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                const auto result = AnalysisRegistry().DeleteProfile(id);
                                if (!result.ok) {
                                    return AnalysisRegistryMutationErrorResponse(result, 404, "Not Found");
                                }
                                return JsonResponse(200, "OK", result.response_body);
                            }
                        }

                        const auto analysis_rule_prefix = std::string("/lab/analysis/rules/");
                        if (request.path.rfind(analysis_rule_prefix, 0) == 0) {
                            const std::string id = UrlDecode(request.path.substr(analysis_rule_prefix.size()));
                            if (id.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"rule id is required\"}");
                            }
                            if (request.method == "GET") {
                                const auto rule = AnalysisRegistry().RuleJson(id);
                                if (!rule.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis rule not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"rule\":" + *rule + "}");
                            }
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                const auto result = AnalysisRegistry().UpsertRule(id, request.body);
                                if (!result.ok) {
                                    return AnalysisRegistryMutationErrorResponse(result, 400, "Bad Request");
                                }
                                return JsonResponse(200, "OK", result.response_body);
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                const auto result = AnalysisRegistry().DeleteRule(id);
                                if (!result.ok) {
                                    return AnalysisRegistryMutationErrorResponse(result, 404, "Not Found");
                                }
                                return JsonResponse(200, "OK", result.response_body);
                            }
                        }

                        const auto analysis_va_rule_prefix = std::string("/lab/analysis/va-rules/");
                        if (request.path.rfind(analysis_va_rule_prefix, 0) == 0) {
                            const std::string id = UrlDecode(request.path.substr(analysis_va_rule_prefix.size()));
                            if (id.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"vaRule id is required\"}");
                            }
                            if (request.method == "GET") {
                                const auto rule = AnalysisRegistry().VaRuleJson(id);
                                if (!rule.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"vaRule not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"vaRule\":" + *rule + "}");
                            }
                            if (request.method == "PUT") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                const auto result = AnalysisRegistry().UpsertVaRule(id, request.body);
                                if (!result.ok) {
                                    return AnalysisRegistryMutationErrorResponse(result, 400, "Bad Request");
                                }
                                return JsonResponse(200, "OK", result.response_body);
                            }
                            if (request.method == "DELETE") {
                                if (const auto auth_response = require_rule_write_principal();
                                    auth_response.has_value()) {
                                    return *auth_response;
                                }
                                const auto result = AnalysisRegistry().DeleteVaRule(id);
                                if (!result.ok) {
                                    return AnalysisRegistryMutationErrorResponse(result, 404, "Not Found");
                                }
                                return JsonResponse(200, "OK", result.response_body);
                            }
                        }

                        const auto analysis_image_prefix = std::string("/lab/analysis/image");
                        if (request.path == analysis_image_prefix ||
                            request.path.rfind(analysis_image_prefix + "/", 0) == 0) {
                            if (request.method != "GET") {
                                return JsonResponse(405, "Method Not Allowed",
                                                    "{\"error\":\"method not allowed\"}");
                            }
                            const std::string suffix = request.path.size() == analysis_image_prefix.size()
                                                           ? std::string()
                                                           : request.path.substr(analysis_image_prefix.size());

                            StaticImageAnalysis image_analysis;
                            std::string error_message;
                            if (!AnalyzeStaticImage(query, &image_analysis, &error_message)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" +
                                                        JsonEscape(error_message.empty()
                                                                       ? "failed to analyze image"
                                                                       : error_message) +
                                                        "\"}");
                            }

                            if (suffix.empty() || suffix == "/metadata") {
                                return JsonResponse(200, "OK", StaticImageAnalysisJson(image_analysis));
                            }

                            if (suffix == "/snapshot" || suffix == "/snapshot.jpg") {
                                const int quality = ParseClampedIntQuery(query, "quality", 85, 1, 100);
                                ImageCodecEncodedImage image;
                                if (!EncodeJpegForApplication(
                                        ProjectImageCodecFrame(image_analysis.frame), quality, &image, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to encode image snapshot"
                                                                              : error_message};
                                }
                                HttpResponse ok;
                                ok.content_type = image.content_type;
                                ok.headers["Cache-Control"] = "no-store";
                                ok.body.assign(reinterpret_cast<const char*>(image.data.data()), image.data.size());
                                return ok;
                            }

                            if (suffix == "/overlay" || suffix == "/overlay.jpg") {
                                analysis::RawVideoFrame overlay_frame;
                                if (!RenderDetectionOverlayForApplication(
                                        image_analysis.frame,
                                        image_analysis.result,
                                        query,
                                        &overlay_frame,
                                        &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to render image overlay"
                                                                              : error_message};
                                }

                                const int quality = ParseClampedIntQuery(query, "quality", 85, 1, 100);
                                ImageCodecEncodedImage image;
                                if (!EncodeJpegForApplication(
                                        ProjectImageCodecFrame(overlay_frame), quality, &image, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to encode image overlay"
                                                                              : error_message};
                                }
                                HttpResponse ok;
                                ok.content_type = image.content_type;
                                ok.headers["Cache-Control"] = "no-store";
                                ok.body.assign(reinterpret_cast<const char*>(image.data.data()), image.data.size());
                                return ok;
                            }

                            return JsonResponse(404, "Not Found",
                                                "{\"error\":\"analysis image endpoint not found\"}");
                        }

                        if (request.path == "/ws/va-metadata") {
                            if (const auto auth_response = require_lab_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            std::string websocket_key;
                            std::string websocket_error;
                            if (!ValidateWebSocketUpgrade(request, &websocket_key, &websocket_error)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(websocket_error) + "\"}");
                            }
                            if (const auto tap_it = query.find("tapId");
                                tap_it != query.end() && !tap_it->second.empty()) {
                                const std::string tap_id = tap_it->second;
                                const auto snapshot = impl_->analysis_session_reads.Snapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404,
                                                        "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return stream_metadata_websocket_response(tap_id, false, websocket_key);
                            }
                            if (!QueryHasAny(query, {"vaRule", "vaRuleId", "file", "url", "source"})) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"tapId, vaRule, or source query is required\"}");
                            }
                            const std::string tap_client_id =
                                "analysis-ws-" + std::to_string(impl_->next_session_id.fetch_add(1));
                            media::IngressRequest ingress_request =
                                BuildHttpIngressRequest(route_path, query, tap_client_id);
                            std::string va_rule_error;
                            if (!ApplyApplicationVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(va_rule_error) + "\"}");
                            }
                            ingress_request.query["va"] = "1";
                            auto result = impl_->analysis_session_lifecycle.Attach(
                                ProjectAnalysisSessionLifecycleRequest(ingress_request));
                            if (!result.ok) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(result.message) + "\"}");
                            }
                            return stream_metadata_websocket_response(result.tap_id, true, websocket_key);
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/metadata/stream") {
                            if (!QueryHasAny(query, {"vaRule", "vaRuleId", "file", "url", "source"})) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"vaRule or source query is required\"}");
                            }
                            const std::string tap_client_id =
                                "analysis-sse-" + std::to_string(impl_->next_session_id.fetch_add(1));
                            media::IngressRequest ingress_request =
                                BuildHttpIngressRequest(route_path, query, tap_client_id);
                            std::string va_rule_error;
                            if (!ApplyApplicationVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(va_rule_error) + "\"}");
                            }
                            ingress_request.query["va"] = "1";
                            auto result = impl_->analysis_session_lifecycle.Attach(
                                ProjectAnalysisSessionLifecycleRequest(ingress_request));
                            if (!result.ok) {
                                return JsonResponse(400,
                                                    "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(result.message) + "\"}");
                            }
                            return stream_metadata_sse_response(result.tap_id, true);
                        }

                        if (request.path == "/lab/analysis/taps") {
                            if (request.method == "GET") {
                                return JsonResponse(200, "OK",
                                                    AnalysisTapListJson(impl_->analysis_session_reads.Snapshots()));
                            }

                            if (request.method == "POST") {
                                const std::string tap_client_id =
                                    "analysis-http-" + std::to_string(impl_->next_session_id.fetch_add(1));
                                media::IngressRequest ingress_request =
                                    BuildHttpIngressRequest(route_path, query, tap_client_id);
                                std::string va_rule_error;
                                if (!ApplyApplicationVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(va_rule_error) + "\"}");
                                }
                                auto result = impl_->analysis_session_lifecycle.Attach(
                                    ProjectAnalysisSessionLifecycleRequest(ingress_request));
                                if (!result.ok) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(result.message) + "\"}");
                                }
                                return JsonResponse(
                                    200,
                                    "OK",
                                    AnalysisTapCreatedJson(result, impl_->analysis_session_reads.ActiveTapCount()));
                            }
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/metadata") {
                            return JsonResponse(
                                200,
                                "OK",
                                AnalysisGlobalMetadataJson(impl_->analysis_session_reads.Snapshots()));
                        }

                        if (request.method == "GET" && request.path == "/lab/analysis/bbox-diagnostics") {
                            return JsonResponse(
                                200,
                                "OK",
                                AnalysisGlobalBboxDiagnosticsJson(
                                    impl_->analysis_session_reads.Snapshots()));
                        }

                        if (request.method == "GET" &&
                            (request.path == "/lab/analysis/state" ||
                             request.path == "/lab/analysis/state-dump")) {
                            return JsonResponse(
                                200,
                                "OK",
                                AnalysisGlobalStateDumpJson(impl_->analysis_session_reads.Snapshots()));
                        }

                        if (request.method == "GET" &&
                            (request.path == "/lab/analysis/metrics" ||
                             request.path == "/lab/analysis/metrics-dump")) {
                            return JsonResponse(
                                200,
                                "OK",
                                AnalysisGlobalMetricsDumpJson(impl_->analysis_session_reads.Snapshots()));
                        }

                        const auto analysis_tap_prefix = std::string("/lab/analysis/taps/");
                        if (request.path.rfind(analysis_tap_prefix, 0) == 0) {
                            const std::string rest = request.path.substr(analysis_tap_prefix.size());
                            const std::size_t slash = rest.find('/');
                            const std::string tap_id = slash == std::string::npos ? rest : rest.substr(0, slash);
                            const std::string suffix = slash == std::string::npos ? std::string() : rest.substr(slash);
                            if (tap_id.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"tap id is required\"}");
                            }

                            if (request.method == "GET" && suffix.empty()) {
                                const auto snapshot = impl_->analysis_session_reads.Snapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"tap\":" + AnalysisTapSnapshotJson(*snapshot) + "}");
                            }

                            if (request.method == "GET" && suffix == "/metadata/stream") {
                                const auto snapshot = impl_->analysis_session_reads.Snapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return stream_metadata_sse_response(tap_id, false);
                            }

                            if (request.method == "GET" && suffix == "/metadata") {
                                const auto result = impl_->analysis_session_reads.Snapshot(tap_id);
                                if (!result.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    AnalysisMetadataJson(tap_id, result->latest_result));
                            }

                            if (request.method == "GET" && suffix == "/bbox-diagnostics") {
                                const auto snapshot = impl_->analysis_session_reads.Snapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                std::int64_t requested_pts_ms = 0;
                                const auto pts_it = query.find("ptsMs");
                                if (pts_it == query.end() ||
                                    !ParseStrictInt64(pts_it->second, &requested_pts_ms)) {
                                    return JsonResponse(400,
                                                        "Bad Request",
                                                        "{\"error\":\"ptsMs query is required\"}");
                                }
                                const int tolerance_ms =
                                    ParseClampedIntQuery(query, "toleranceMs", 600, 0, 5000);
                                const std::int64_t requested_pts_ns = requested_pts_ms * 1000000LL;
                                const std::int64_t tolerance_ns = static_cast<std::int64_t>(tolerance_ms) * 1000000LL;
                                const auto result = impl_->analysis_session_reads.WaitResultNearPts(
                                    tap_id, requested_pts_ns, tolerance_ns, 0);
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisBboxDiagnosticsJson(tap_id,
                                                                                requested_pts_ms,
                                                                                tolerance_ms,
                                                                                result));
                            }

                            if (request.method == "GET" && (suffix == "/state" || suffix == "/state-dump")) {
                                const auto snapshot = impl_->analysis_session_reads.Snapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                std::optional<EventRuleApplicationEvaluation> evaluation;
                                if (snapshot->latest_result.has_value()) {
                                    auto result = *snapshot->latest_result;
                                    result.debug_state_requested = true;
                                    result.debug_state_log_enabled = false;
                                    evaluation = EvaluateEventRulesForApplication(
                                        result, AcquireEventRuleApplicationRuntime("tap-state-dump:" + tap_id));
                                }
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisStateDumpJson(tap_id,
                                                                          *snapshot,
                                                                          evaluation));
                            }

                            if (request.method == "GET" && (suffix == "/metrics" || suffix == "/metrics-dump")) {
                                const auto snapshot = impl_->analysis_session_reads.Snapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                std::optional<EventRuleApplicationEvaluation> evaluation;
                                if (snapshot->latest_result.has_value()) {
                                    auto result = *snapshot->latest_result;
                                    result.metrics_report_requested = true;
                                    evaluation = EvaluateEventRulesForApplication(
                                        result, AcquireEventRuleApplicationRuntime("tap-metrics:" + tap_id));
                                }
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisMetricsDumpJson(tap_id,
                                                                            *snapshot,
                                                                            evaluation));
                            }

                            if (request.method == "GET" && suffix == "/events") {
                                const auto snapshot = impl_->analysis_session_reads.Snapshot(tap_id);
                                if (!snapshot.has_value()) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                std::optional<EventRuleApplicationEvaluation> evaluation;
                                if (snapshot->latest_result.has_value()) {
                                    evaluation = EvaluateEventRulesForApplication(
                                        *snapshot->latest_result,
                                        AcquireEventRuleApplicationRuntime("tap-events:" + tap_id));
                                    if (ParseBoolQuery(query, "dispatch", false)) {
                                        DispatchEventRecordsForApplication(ProjectEventStorageDispatchRequest(
                                            evaluation->AnnotatedResult(), evaluation->Events()));
                                        DispatchEventPostsForApplication(ProjectEventPostDispatchRequest(
                                            evaluation->AnnotatedResult(), evaluation->Events()));
                                        DispatchOpsAlertDeliveries(config,
                                                                  evaluation->AnnotatedResult(),
                                                                  evaluation->Events());
                                    }
                                }
                                return JsonResponse(200,
                                                    "OK",
                                                    AnalysisEventsJson(tap_id,
                                                                       snapshot->latest_result,
                                                                       evaluation.has_value() ? &*evaluation : nullptr));
                            }

                            if (request.method == "GET" && (suffix == "/snapshot" || suffix == "/snapshot.jpg")) {
                                const auto frame = impl_->analysis_session_reads.LatestFrame(tap_id);
                                if (!frame.has_value()) {
                                    return HttpResponse{404,
                                                        "Not Found",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        "analysis snapshot frame not found"};
                                }
                                const int quality = ParseClampedIntQuery(query, "quality", 85, 1, 100);
                                ImageCodecEncodedImage image;
                                std::string error_message;
                                if (!EncodeJpegForApplication(
                                        *frame, quality, &image, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to encode snapshot" : error_message};
                                }
                                HttpResponse ok;
                                ok.content_type = image.content_type;
                                ok.headers["Cache-Control"] = "no-store";
                                ok.body.assign(reinterpret_cast<const char*>(image.data.data()), image.data.size());
                                return ok;
                            }

                            if (request.method == "GET" && (suffix == "/overlay" || suffix == "/overlay.jpg")) {
                                auto latest = impl_->analysis_session_reads.LatestFrameAndResult(tap_id);
                                if (!latest.has_value()) {
                                    return HttpResponse{404,
                                                        "Not Found",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        "analysis overlay frame not found"};
                                }
                                if (!latest->result.has_value()) {
                                    return HttpResponse{404,
                                                        "Not Found",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        "analysis overlay result not found"};
                                }

                                ImageCodecFrame overlay_frame;
                                const bool debug_overlay =
                                    AnalysisOverlayDebugRequestedForApplication(query);
                                auto overlay_result = *latest->result;
                                overlay_result.debug_state_requested =
                                    overlay_result.debug_state_requested || debug_overlay;
                                overlay_result.debug_state_log_enabled =
                                    overlay_result.debug_state_log_enabled || debug_overlay;
                                const auto evaluation = EvaluateEventRulesForApplication(
                                    overlay_result,
                                    AcquireEventRuleApplicationRuntime("tap-overlay:" + tap_id));
                                std::string error_message;
                                if (!RenderDetectionOverlayForApplication(
                                        std::move(latest->frame),
                                        evaluation.ApplicationAnnotatedResult(),
                                        query,
                                        &overlay_frame,
                                        &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to render analysis overlay" : error_message};
                                }

                                const int quality = ParseClampedIntQuery(query, "quality", 85, 1, 100);
                                ImageCodecEncodedImage image;
                                if (!EncodeJpegForApplication(
                                        overlay_frame, quality, &image, &error_message)) {
                                    return HttpResponse{500,
                                                        "Internal Server Error",
                                                        "text/plain; charset=utf-8",
                                                        {},
                                                        error_message.empty() ? "failed to encode analysis overlay" : error_message};
                                }
                                HttpResponse ok;
                                ok.content_type = image.content_type;
                                ok.headers["Cache-Control"] = "no-store";
                                ok.body.assign(reinterpret_cast<const char*>(image.data.data()), image.data.size());
                                return ok;
                            }

                            if (request.method == "DELETE" && suffix.empty()) {
                                if (!DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, tap_id)) {
                                    return JsonResponse(404, "Not Found",
                                                        "{\"error\":\"analysis tap not found\"}");
                                }
                                return JsonResponse(200, "OK",
                                                    "{\"ok\":true,\"activeTaps\":" +
                                                        std::to_string(impl_->analysis_session_reads.ActiveTapCount()) + "}");
                            }
                        }

                        if (request.method == "POST" && request.path == "/webrtc/session") {
                            if (const auto auth_response = require_generic_media_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            return create_webrtc_session_response(query, "webrtc-http", nullptr);
                        }

                        if (request.method == "POST" && request.path == "/whep") {
                            if (const auto auth_response = require_generic_media_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            // WHEP: 클라이언트 offer를 먼저 받고 서버가 answer SDP를 반환하는 consume endpoint다.
                            std::string session_secret_error;
                            const auto generated_secrets =
                                GenerateHttpSessionSecrets("whep", &session_secret_error);
                            if (!generated_secrets.has_value()) {
                                return JsonResponse(
                                    503,
                                    "Service Unavailable",
                                    "{\"error\":\"" + JsonEscape(session_secret_error) + "\"}");
                            }
                            const std::string session_id = generated_secrets->session_id;
                            const std::string session_capability = generated_secrets->session_capability;
                            const std::string ingress_client_id = session_id + "-ingress";
                            media::IngressRequest ingress_request = BuildHttpIngressRequest(route_path, query, ingress_client_id);
                            std::string va_rule_error;
                            if (!ApplyApplicationVideoAnalysisRuleToRequest(&ingress_request, &va_rule_error)) {
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, va_rule_error};
                            }
                            auto bridge = std::make_shared<WebRtcEgressSession>();
                            std::string analysis_tap_id;
                            std::string error_message;
                            if (!AttachWebRtcAnalysisOverlay(
                                    impl_->analysis_session_lifecycle,
                                    impl_->analysis_session_reads,
                                    ingress_request,
                                    ingress_request.query,
                                    bridge,
                                    &analysis_tap_id,
                                    &error_message)) {
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, error_message};
                            }
                            auto create_result = impl_->session_manager.CreateSession(
                                ingress_request,
                                [bridge](const media::Packet& packet) { bridge->HandleSample(packet); });
                            if (!create_result.ok) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, analysis_tap_id);
                                }
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, create_result.message};
                            }

                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{500, "Internal Server Error", "text/plain; charset=utf-8", {}, error_message};
                            }
                            if (!bridge->SetRemoteOffer(request.body, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, error_message};
                            }

                            std::string answer;
                            if (!bridge->CreateAnswer(&answer, &error_message)) {
                                bridge->Stop();
                                if (!analysis_tap_id.empty()) {
                                    DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, analysis_tap_id);
                                }
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{500, "Internal Server Error", "text/plain; charset=utf-8", {}, error_message};
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->sessions.emplace(session_id,
                                                        Impl::SessionEntry{
                                                            .session_id = session_id,
                                                            .ingress_client_id = ingress_client_id,
                                                            .analysis_tap_id = analysis_tap_id,
                                                            .session_capability = session_capability,
                                                            .owner_principal = principal_result.principal,
                                                            .request = std::move(ingress_request),
                                                            .bridge = bridge,
                                                        });
                            }

                            HttpResponse created;
                            created.status = 201;
                            created.status_text = "Created";
                            created.content_type = "application/sdp";
                            created.headers["Location"] = "/whep/session/" + session_id;
                            created.headers["Accept-Patch"] = "application/trickle-ice-sdpfrag";
                            created.headers["X-Session-Capability"] = session_capability;
                            created.body = answer;
                            return created;
                        }

                        if (request.method == "POST" && request.path == "/whip/publish") {
                            if (const auto auth_response = require_generic_media_principal();
                                auth_response.has_value()) {
                                return *auth_response;
                            }
                            // WHIP publish: 브라우저/테스트 publisher를 sourceId로 등록해 source=webrtc 소비가 가능하게 한다.
                            const auto source_id_it = query.find("sourceId");
                            if (source_id_it == query.end() || source_id_it->second.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"sourceId query parameter is required\"}");
                            }

                            std::string session_secret_error;
                            const auto generated_secrets =
                                GenerateHttpSessionSecrets("whip-publish", &session_secret_error);
                            if (!generated_secrets.has_value()) {
                                return JsonResponse(
                                    503,
                                    "Service Unavailable",
                                    "{\"error\":\"" + JsonEscape(session_secret_error) + "\"}");
                            }
                            const std::string session_id = generated_secrets->session_id;
                            const std::string session_capability = generated_secrets->session_capability;
                            auto bridge = std::make_shared<WebRtcSourceSession>();
                            std::string error_message;
                            if (!bridge->Start(session_id, source_id_it->second, &error_message)) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }
                            if (!bridge->SetRemoteOffer(request.body, &error_message)) {
                                bridge->Stop();
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            std::string answer;
                            if (!bridge->CreateAnswer(&answer, &error_message)) {
                                bridge->Stop();
                                return JsonResponse(500, "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->source_sessions.emplace(session_id,
                                                               Impl::SourceSessionEntry{
                                                                   .session_id = session_id,
                                                                   .source_id = source_id_it->second,
                                                                   .session_capability = session_capability,
                                                                   .owner_principal = principal_result.principal,
                                                                   .bridge = bridge,
                                                               });
                            }

                            HttpResponse created;
                            created.status = 201;
                            created.status_text = "Created";
                            created.content_type = "application/json; charset=utf-8";
                            created.headers["Location"] = "/whip/publish/session/" + session_id;
                            created.headers["X-Session-Capability"] = session_capability;
                            created.body = SourceJson(session_id, source_id_it->second, answer, session_capability);
                            return created;
                        }

                        const auto prefix = std::string("/webrtc/session/");
                        const auto whep_prefix = std::string("/whep/session/");
                        const auto whip_publish_prefix = std::string("/whip/publish/session/");
                        auto with_session = [&](const std::string& path_prefix) -> std::pair<std::string, std::string> {
                            std::string rest = request.path.substr(path_prefix.size());
                            const std::size_t slash = rest.find('/');
                            if (slash == std::string::npos) {
                                return {rest, ""};
                            }
                            return {rest.substr(0, slash), rest.substr(slash)};
                        };
                        auto require_session_owner =
                            [&](const auth::Principal& owner,
                                const std::string& expected_capability,
                                const std::string& provided_capability) -> std::optional<HttpResponse> {
                            if (config.auth_mode == HttpAuthMode::Off) {
                                return std::nullopt;
                            }
                            if (!provided_capability.empty() &&
                                !expected_capability.empty() &&
                                ConstantTimeEquals(provided_capability, expected_capability)) {
                                return std::nullopt;
                            }
                            if (!principal_result.ok) {
                                return AuthErrorResponse(principal_result.error);
                            }
                            if (SameSessionOwner(owner, principal_result.principal)) {
                                return std::nullopt;
                            }
                            return JsonResponse(
                                403,
                                "Forbidden",
                                "{\"error\":\"session owner or session capability required\"}");
                        };

                        if (request.path.rfind(prefix, 0) == 0 || request.path.rfind(whep_prefix, 0) == 0) {
                            const bool is_whep = request.path.rfind(whep_prefix, 0) == 0;
                            const auto parsed = with_session(is_whep ? whep_prefix : prefix);
                            const std::string session_id = parsed.first;
                            const std::string suffix = parsed.second;
                            const std::string provided_capability =
                                RequestSessionCapability(request, query);

                            std::shared_ptr<WebRtcEgressSession> bridge;
                            std::string session_capability;
                            auth::Principal owner_principal;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->sessions.find(session_id);
                                if (it == impl_->sessions.end()) {
                                    return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "unknown session"};
                                }
                                bridge = it->second.bridge;
                                session_capability = it->second.session_capability;
                                owner_principal = it->second.owner_principal;
                            }
                            if (const auto auth_response = require_session_owner(
                                    owner_principal, session_capability, provided_capability);
                                auth_response.has_value()) {
                                return *auth_response;
                            }

                            if (request.method == "POST" && suffix == "/answer") {
                                std::string error_message;
                                if (!bridge->SetRemoteAnswer(request.body, &error_message)) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                                }
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }

                            if ((request.method == "POST" || request.method == "PATCH") && (suffix.empty() || suffix == "/ice")) {
                                if (is_whep && request.method == "PATCH") {
                                    if (auto fragment_response = ApplyWhepSdpFragmentIce(request, bridge);
                                        fragment_response.has_value()) {
                                        return *fragment_response;
                                    }
                                }
                                const auto candidate = ParseStringField(request.body, "candidate");
                                const auto mline = ParseIntField(request.body, "sdpMLineIndex");
                                if (!candidate.has_value() || !mline.has_value()) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"candidate and sdpMLineIndex are required\"}");
                                }
                                bridge->AddRemoteIceCandidate(static_cast<std::uint32_t>(*mline), *candidate);
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }

                            if (request.method == "GET" && suffix == "/ice") {
                                return JsonResponse(200, "OK", IceJson(bridge->TakePendingLocalIceCandidates()));
                            }

                            if (request.method == "DELETE" && (suffix.empty() || suffix == "/")) {
                                if (!close_webrtc_session(session_id)) {
                                    return HttpResponse{
                                        404,
                                        "Not Found",
                                        "text/plain; charset=utf-8",
                                        {},
                                        "unknown session"};
                                }
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }
                        }

                        if (request.path.rfind(whip_publish_prefix, 0) == 0) {
                            const auto parsed = with_session(whip_publish_prefix);
                            const std::string session_id = parsed.first;
                            const std::string suffix = parsed.second;
                            const std::string provided_capability =
                                RequestSessionCapability(request, query);

                            std::shared_ptr<WebRtcSourceSession> bridge;
                            std::string session_capability;
                            auth::Principal owner_principal;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->source_sessions.find(session_id);
                                if (it == impl_->source_sessions.end()) {
                                    return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "unknown source session"};
                                }
                                bridge = it->second.bridge;
                                session_capability = it->second.session_capability;
                                owner_principal = it->second.owner_principal;
                            }
                            if (const auto auth_response = require_session_owner(
                                    owner_principal, session_capability, provided_capability);
                                auth_response.has_value()) {
                                return *auth_response;
                            }

                            if ((request.method == "POST" || request.method == "PATCH") && (suffix.empty() || suffix == "/ice")) {
                                const auto candidate = ParseStringField(request.body, "candidate");
                                const auto mline = ParseIntField(request.body, "sdpMLineIndex");
                                if (!candidate.has_value() || !mline.has_value()) {
                                    return JsonResponse(400, "Bad Request",
                                                        "{\"error\":\"candidate and sdpMLineIndex are required\"}");
                                }
                                bridge->AddRemoteIceCandidate(static_cast<std::uint32_t>(*mline), *candidate);
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }

                            if (request.method == "GET" && suffix == "/ice") {
                                return JsonResponse(200, "OK", IceJson(bridge->TakePendingLocalIceCandidates()));
                            }

                            if (request.method == "DELETE" && (suffix.empty() || suffix == "/")) {
                                bridge->Stop();
                                {
                                    std::lock_guard lock(impl_->mu);
                                    impl_->source_sessions.erase(session_id);
                                }
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }
                        }

                        return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};
                    }();
                }

                if (!response_sent) {
                    SuppressSocketSigPipe(client_fd);
                    const HttpRequest* request_for_headers =
                        request_opt.has_value() ? &request_opt.value() : nullptr;
                    const std::string encoded = BuildHttpResponse(response, request_for_headers);
                    (void)SendAll(client_fd, encoded);
                }
                close(client_fd);
            }).detach();
        }
    });

    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 40635 function
void WebRtcHttpServer::Stop() {
    if (!running_.exchange(false)) {
        return;
    }

    if (impl_->listen_fd >= 0) {
        shutdown(impl_->listen_fd, SHUT_RDWR);
        close(impl_->listen_fd);
        impl_->listen_fd = -1;
    }
    if (impl_->accept_thread.joinable()) {
        impl_->accept_thread.join();
    }

    std::vector<Impl::SessionEntry> sessions;
    std::vector<Impl::SourceSessionEntry> source_sessions;
    {
        std::lock_guard lock(impl_->mu);
        for (auto& [_, entry] : impl_->sessions) {
            sessions.push_back(entry);
        }
        impl_->sessions.clear();
        impl_->client_sessions.clear();
        for (auto& [_, entry] : impl_->source_sessions) {
            source_sessions.push_back(entry);
        }
        impl_->source_sessions.clear();
    }
    for (auto& entry : sessions) {
        entry.bridge->Stop();
        if (!entry.analysis_tap_id.empty()) {
            DetachAnalysisTapAndReleaseRuntimes(impl_->analysis_session_lifecycle, entry.analysis_tap_id);
        }
        impl_->session_manager.CloseSession(entry.ingress_client_id);
    }
    for (auto& entry : source_sessions) {
        entry.bridge->Stop();
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 40675 function
bool WebRtcHttpServer::IsRunning() const {
    return running_.load();
}

namespace webrtc_http_server_detail {

bool AnalysisDocumentRegistry::ValidateCanonicalVlmProfileEnvelopeLocked(
    const std::string& expected_id,
    const std::string& body,
    std::string* error_message) {
    VlmProfileJsonDocument profile_document;
    std::string parse_error;
    if (!VlmProfileJsonDocument::Parse(body, &profile_document, &parse_error)) {
        SetRegistryError(error_message, "VLM profile JSON is invalid: " + parse_error);
        return false;
    }
    for (const std::string& field :
         {"apiKey", "credential", "providerCredential", "prompt", "rawPrompt",
          "rawResponse", "sourceUrl", "sourceLocator", "imageData", "frameBytes"}) {
        if (profile_document.ContainsKey(field)) {
            SetRegistryError(error_message,
                             "VLM profile must not include credentials, prompts, raw responses, source locators, or frame bytes");
            return false;
        }
    }
    if (profile_document.StringField("schema").value_or("") != "media-server.vlm-profile.v1") {
        SetRegistryError(error_message, "VLM profile schema must be media-server.vlm-profile.v1");
        return false;
    }
    if (!profile_document.HasTopLevelField("id")) {
        SetRegistryError(error_message, "VLM profile must include exactly one id");
        return false;
    }
    const std::string id = Trim(profile_document.StringField("id").value_or(""));
    if (!IsSafeVlmProfileId(id) || id != expected_id) {
        SetRegistryError(error_message, "stored VLM profile id is invalid or mismatched");
        return false;
    }
    const std::string selected_option_id =
        Trim(profile_document.StringField("selectedOptionId").value_or(""));
    if (!IsSafeVlmProfileId(selected_option_id)) {
        SetRegistryError(error_message, "VLM profile selectedOptionId is required");
        return false;
    }
    const std::string provider = Trim(profile_document.StringField("provider").value_or(""));
    const std::string model = Trim(profile_document.StringField("model").value_or(""));
    const std::string runtime = Trim(profile_document.StringField("runtime").value_or(""));
    const std::string privacy_mode = Trim(profile_document.StringField("privacyMode").value_or(""));
    if (!IsOneOf(provider, {"user-supplied-local-runtime", "cloud-provider-api"}) ||
        !IsOneOf(model,
                 {"Qwen/Qwen3-VL-4B-Instruct",
                  "Qwen/Qwen3-VL-8B-Instruct",
                  "Qwen/Qwen3-VL-30B-A3B-Instruct",
                  "gemini-2.5-flash"}) ||
        !IsOneOf(runtime, {"ollama", "vllm", "provider-api", "not-configured"}) ||
        !IsOneOf(privacy_mode, {"local-only", "cloud-disabled", "cloud-allowed"})) {
        SetRegistryError(error_message, "VLM profile provider/model/runtime/privacy contract is invalid");
        return false;
    }
    const bool cloud_profile = provider == "cloud-provider-api";
    const bool cloud_opt_in_acknowledged =
        profile_document.BoolField("cloudOptInAcknowledged").value_or(false);
    if (cloud_profile) {
        if (model != "gemini-2.5-flash" || runtime != "provider-api" ||
            privacy_mode != "cloud-allowed" || !cloud_opt_in_acknowledged) {
            SetRegistryError(error_message, "cloud VLM profile contract is invalid");
            return false;
        }
    } else if (model == "gemini-2.5-flash" || runtime == "provider-api" ||
               privacy_mode == "cloud-allowed") {
        SetRegistryError(error_message, "local VLM profile must remain local-only or cloud-disabled");
        return false;
    }
    if (!ValidateVlmPrivacyGuardContract(body, cloud_profile, error_message)) {
        return false;
    }
    const auto prompt_profile = profile_document.ObjectField("promptProfile");
    VlmProfileJsonDocument prompt_profile_document;
    if (!prompt_profile.has_value() ||
        !VlmProfileJsonDocument::Parse(*prompt_profile, &prompt_profile_document, &parse_error) ||
        Trim(prompt_profile_document.StringField("id").value_or("")).empty()) {
        SetRegistryError(error_message, "VLM profile promptProfile.id is required");
        return false;
    }
    const auto evaluation = profile_document.ObjectField("evaluation");
    VlmProfileJsonDocument evaluation_document;
    if (!evaluation.has_value() ||
        !VlmProfileJsonDocument::Parse(*evaluation, &evaluation_document, &parse_error) ||
        evaluation_document.StringField("source").value_or("") !=
            "server-verified-evaluation-catalog" ||
        !evaluation_document.ObjectField("provenance").has_value() ||
        !IsOneOf(Trim(evaluation_document.StringField("status").value_or("")),
                 {"passed", "review-required", "failed", "not-run"})) {
        SetRegistryError(error_message, "VLM profile evaluation must be server canonical");
        return false;
    }
    const auto activation = profile_document.ObjectField("activation");
    if (!activation.has_value()) {
        SetRegistryError(error_message, "VLM profile activation object is required");
        return false;
    }
    VlmProfileJsonDocument activation_document;
    if (!VlmProfileJsonDocument::Parse(*activation, &activation_document, &parse_error)) {
        SetRegistryError(error_message, "VLM profile activation JSON is invalid: " + parse_error);
        return false;
    }
    const std::string evaluation_status =
        Trim(evaluation_document.StringField("status").value_or(""));
    const std::string activation_status =
        Trim(activation_document.StringField("status").value_or(""));
    const bool activation_enabled = activation_document.BoolField("enabled").value_or(false);
    const std::string fallback_profile_id =
        Trim(activation_document.StringField("fallbackProfileId").value_or(""));
    const std::string disabled_reason =
        Trim(activation_document.StringField("disabledReason").value_or(""));
    if (!IsOneOf(activation_status, {"pending-evaluation", "active", "disabled", "fallback"}) ||
        (activation_enabled && (evaluation_status != "passed" || activation_status != "active")) ||
        (!activation_enabled && activation_status == "active") ||
        (activation_status == "disabled" && disabled_reason.empty()) ||
        (activation_status == "fallback" &&
         (fallback_profile_id.empty() || !IsSafeVlmProfileId(fallback_profile_id) ||
          fallback_profile_id == id))) {
        SetRegistryError(error_message, "VLM profile activation contract is invalid");
        return false;
    }
    if (!profile_document.ObjectField("runtimeContract").has_value() ||
        !ValidateVlmRuntimeOptInContract(body,
                                         provider,
                                         runtime,
                                         activation_enabled,
                                         activation_status,
                                         error_message)) {
        return false;
    }
    const auto invariants = profile_document.ObjectField("contractInvariants");
    if (!invariants.has_value()) {
        SetRegistryError(error_message, "VLM profile contractInvariants object is required");
        return false;
    }
    VlmProfileJsonDocument invariants_document;
    if (!VlmProfileJsonDocument::Parse(*invariants, &invariants_document, &parse_error)) {
        SetRegistryError(error_message, "VLM profile contractInvariants JSON is invalid: " + parse_error);
        return false;
    }
    for (const std::string& field :
         {"runtimeVlmCallPerformed",
          "sidecarStored",
          "cloudProviderApiCalled",
          "credentialStored",
          "eventPostPayloadChanged",
          "webrtcDataChannelSchemaChanged",
          "sseMetadataSchemaChanged",
          "wsMetadataSchemaChanged",
          "rtspOrWebrtcMediaPathChanged",
          "viewerClientExposureAdded"}) {
        if (invariants_document.BoolField(field).value_or(true)) {
            SetRegistryError(error_message, "VLM profile invariant must be false: " + field);
            return false;
        }
    }
    return true;
}

}  // namespace webrtc_http_server_detail

}  // namespace ingress
