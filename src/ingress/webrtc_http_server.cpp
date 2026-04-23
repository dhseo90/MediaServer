// 파일 용도: WebRTC simple signaling, WHEP consume, WHIP publish HTTP API를 구현한다.
#include "ingress/webrtc_http_server.h"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <atomic>
#include <cerrno>
#include <chrono>
#include <cctype>
#include <cstring>
#include <iostream>
#include <mutex>
#include <optional>
#include <sstream>
#include <string>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

#include "app_config.h"
#include "ingress/request_parser.h"
#include "ingress/webrtc_egress_session.h"
#include "ingress/webrtc_source_session.h"

namespace ingress {

namespace {

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

std::string UrlDecode(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    for (std::size_t i = 0; i < value.size(); ++i) {
        const char ch = value[i];
        if (ch == '+') {
            out.push_back(' ');
            continue;
        }
        if (ch == '%' && i + 2 < value.size()) {
            const std::string hex = value.substr(i + 1, 2);
            char* end = nullptr;
            const long parsed = std::strtol(hex.c_str(), &end, 16);
            if (end != nullptr && *end == '\0') {
                out.push_back(static_cast<char>(parsed));
                i += 2;
                continue;
            }
        }
        out.push_back(ch);
    }
    return out;
}

std::unordered_map<std::string, std::string> ParseQueryString(const std::string& raw) {
    std::unordered_map<std::string, std::string> out;
    std::size_t from = 0;
    while (from < raw.size()) {
        const std::size_t amp = raw.find('&', from);
        const std::string pair = raw.substr(from, amp == std::string::npos ? std::string::npos : amp - from);
        if (!pair.empty()) {
            const std::size_t eq = pair.find('=');
            const std::string key = UrlDecode(pair.substr(0, eq));
            const std::string value = eq == std::string::npos ? std::string() : UrlDecode(pair.substr(eq + 1));
            out[key] = value;
        }
        if (amp == std::string::npos) {
            break;
        }
        from = amp + 1;
    }
    return out;
}

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

std::optional<int> ParseIntField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    std::size_t end = pos;
    while (end < body.size() && std::isdigit(static_cast<unsigned char>(body[end])) != 0) {
        ++end;
    }
    if (end == pos) {
        return std::nullopt;
    }
    return std::stoi(body.substr(pos, end - pos));
}

std::optional<std::string> ParseStringField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find('"', pos);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;
    std::string out;
    bool escaped = false;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            switch (ch) {
                case 'n':
                    out.push_back('\n');
                    break;
                case 'r':
                    out.push_back('\r');
                    break;
                case 't':
                    out.push_back('\t');
                    break;
                default:
                    out.push_back(ch);
                    break;
            }
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            return out;
        }
        out.push_back(ch);
    }
    return std::nullopt;
}

struct HttpRequest {
    std::string method;
    std::string target;
    std::string path;
    std::string query;
    std::unordered_map<std::string, std::string> headers;
    std::string body;
};

struct HttpResponse {
    int status{200};
    std::string status_text{"OK"};
    std::string content_type{"text/plain; charset=utf-8"};
    std::unordered_map<std::string, std::string> headers;
    std::string body;
};

std::string BuildHttpResponse(const HttpResponse& response) {
    std::ostringstream out;
    out << "HTTP/1.1 " << response.status << " " << response.status_text << "\r\n";
    out << "Content-Type: " << response.content_type << "\r\n";
    out << "Content-Length: " << response.body.size() << "\r\n";
    out << "Connection: close\r\n";
    out << "Access-Control-Allow-Origin: *\r\n";
    out << "Access-Control-Allow-Headers: Content-Type\r\n";
    out << "Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS\r\n";
    for (const auto& [key, value] : response.headers) {
        out << key << ": " << value << "\r\n";
    }
    out << "\r\n";
    out << response.body;
    return out.str();
}

std::optional<HttpRequest> ReadHttpRequest(int client_fd) {
    std::string raw;
    char buffer[4096];
    std::size_t header_end = std::string::npos;
    while (header_end == std::string::npos) {
        const ssize_t read_bytes = recv(client_fd, buffer, sizeof(buffer), 0);
        if (read_bytes <= 0) {
            return std::nullopt;
        }
        raw.append(buffer, static_cast<std::size_t>(read_bytes));
        header_end = raw.find("\r\n\r\n");
        if (raw.size() > 1024 * 1024) {
            return std::nullopt;
        }
    }

    HttpRequest request;
    std::istringstream header_stream(raw.substr(0, header_end));
    std::string request_line;
    if (!std::getline(header_stream, request_line)) {
        return std::nullopt;
    }
    if (!request_line.empty() && request_line.back() == '\r') {
        request_line.pop_back();
    }
    {
        std::istringstream request_line_stream(request_line);
        request_line_stream >> request.method >> request.target;
    }
    if (request.method.empty() || request.target.empty()) {
        return std::nullopt;
    }

    const std::size_t query_pos = request.target.find('?');
    request.path = query_pos == std::string::npos ? request.target : request.target.substr(0, query_pos);
    request.query = query_pos == std::string::npos ? std::string() : request.target.substr(query_pos + 1);

    std::string header_line;
    while (std::getline(header_stream, header_line)) {
        if (!header_line.empty() && header_line.back() == '\r') {
            header_line.pop_back();
        }
        const std::size_t colon = header_line.find(':');
        if (colon == std::string::npos) {
            continue;
        }
        const std::string key = Trim(header_line.substr(0, colon));
        const std::string value = Trim(header_line.substr(colon + 1));
        request.headers[key] = value;
    }

    std::size_t content_length = 0;
    if (const auto it = request.headers.find("Content-Length"); it != request.headers.end()) {
        content_length = static_cast<std::size_t>(std::stoul(it->second));
    }

    request.body = raw.substr(header_end + 4);
    while (request.body.size() < content_length) {
        const ssize_t read_bytes = recv(client_fd, buffer, sizeof(buffer), 0);
        if (read_bytes <= 0) {
            return std::nullopt;
        }
        request.body.append(buffer, static_cast<std::size_t>(read_bytes));
    }
    if (request.body.size() > content_length) {
        request.body.resize(content_length);
    }

    return request;
}

std::string BuildTestPageHtml() {
    return R"(<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Media Server WebRTC Test</title>
  <style>
    :root {
      --bg: #0d1b1e;
      --panel: #163037;
      --ink: #ecf3ef;
      --muted: #9ab6ae;
      --accent: #ff8c42;
      --line: rgba(236,243,239,0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Pretendard", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(255,140,66,0.22), transparent 28%),
        linear-gradient(135deg, #081114 0%, var(--bg) 45%, #13282e 100%);
      min-height: 100vh;
    }
    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }
    .card {
      background: rgba(22,48,55,0.82);
      border: 1px solid var(--line);
      border-radius: 24px;
      backdrop-filter: blur(10px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.24);
      overflow: hidden;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
      padding: 24px;
    }
    h1 { margin: 0 0 8px; font-size: 34px; letter-spacing: -0.03em; }
    p { color: var(--muted); line-height: 1.5; }
    .controls {
      display: grid;
      gap: 12px;
      align-content: start;
    }
    label {
      display: grid;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
    }
    input, select, button, textarea {
      width: 100%;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(9,20,23,0.92);
      color: var(--ink);
      padding: 12px 14px;
      font: inherit;
    }
    button {
      background: linear-gradient(135deg, var(--accent), #ffb067);
      color: #111;
      border: 0;
      font-weight: 700;
      cursor: pointer;
    }
    button.secondary {
      background: rgba(255,255,255,0.08);
      color: var(--ink);
      border: 1px solid var(--line);
    }
    video {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 18px;
      border: 1px solid var(--line);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 0 24px 24px;
    }
    textarea { min-height: 220px; }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: rgba(9,20,23,0.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      min-height: 220px;
      margin: 0;
      color: #cfe4db;
    }
    @media (max-width: 900px) {
      .hero, .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <div class="hero">
        <div>
          <h1>WebRTC Pull Test</h1>
          <p>Simple signaling, WHEP playback, and WHIP-style publish endpoints run from the same media server.</p>
          <video id="video" autoplay playsinline controls></video>
        </div>
        <div class="controls">
          <label>Source Type
            <select id="sourceType">
              <option value="file">file</option>
              <option value="url">rtsp url</option>
              <option value="http">http media url</option>
              <option value="hls">hls media url</option>
              <option value="youtube">youtube watch/live url</option>
              <option value="webrtc">published webrtc source id</option>
            </select>
          </label>
          <label>File Name
            <input id="fileInput" value="sample_h264.mp4" />
          </label>
          <label>Source URL
            <input id="urlInput" value="rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4" />
          </label>
          <label>WebRTC Source ID
            <input id="webrtcSourceInput" value="publisher-demo" />
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <button id="startBtn">Start</button>
            <button id="stopBtn" class="secondary">Stop</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <button id="whepBtn" class="secondary">Test WHEP</button>
            <button id="clearBtn" class="secondary">Clear Log</button>
          </div>
        </div>
      </div>
      <div class="grid">
        <div>
          <label>Session Log</label>
          <pre id="log"></pre>
        </div>
        <div>
          <label>Remote SDP</label>
          <textarea id="sdpBox" spellcheck="false"></textarea>
        </div>
      </div>
      <div class="grid">
        <div>
          <label>Publisher Preview</label>
          <video id="publisherVideo" autoplay playsinline controls muted></video>
        </div>
        <div class="controls">
          <label>Publish Source ID
            <input id="publishSourceIdInput" value="publisher-demo" />
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <button id="publishBtn" class="secondary">Start Publish</button>
            <button id="stopPublishBtn" class="secondary">Stop Publish</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <button id="consumePublishedBtn" class="secondary">Play Published</button>
            <button id="consumePublishedWhepBtn" class="secondary">Play Published WHEP</button>
          </div>
          <p style="margin:0;color:var(--muted);font-size:0.9rem;">
            publish 완료 후 `sourceType=webrtc`와 같은 source id로 RTSP/WebRTC consume을 바로 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  </main>
  <script>
    const logEl = document.getElementById('log');
    const videoEl = document.getElementById('video');
    const publisherVideoEl = document.getElementById('publisherVideo');
    const sdpBox = document.getElementById('sdpBox');
    const sourceTypeEl = document.getElementById('sourceType');
    const fileInputEl = document.getElementById('fileInput');
    const urlInputEl = document.getElementById('urlInput');
    const webrtcSourceInputEl = document.getElementById('webrtcSourceInput');
    const publishSourceIdInputEl = document.getElementById('publishSourceIdInput');
    let pc = null;
    let sessionId = null;
    let pollTimer = null;
    let sessionBase = '/webrtc/session';
    let publisherPc = null;
    let publisherSessionId = null;
    let publisherPollTimer = null;
    let publisherStream = null;
    let consumerLocalIceCount = 0;
    let consumerRemoteIceCount = 0;
    let publisherLocalIceCount = 0;
    let publisherRemoteIceCount = 0;
    let consumerEmptyIcePolls = 0;
    let publisherEmptyIcePolls = 0;
    const consumerTrackKinds = new Set();
    const publisherTrackKinds = new Set();

    function log(message) {
      const ts = new Date().toLocaleTimeString();
      logEl.textContent += `[${ts}] ${message}\n`;
      logEl.scrollTop = logEl.scrollHeight;
    }

    function snapshotState() {
      return {
        sessionId,
        publisherSessionId,
        consumerConnectionState: pc ? pc.connectionState : '',
        consumerIceConnectionState: pc ? pc.iceConnectionState : '',
        publisherConnectionState: publisherPc ? publisherPc.connectionState : '',
        publisherIceConnectionState: publisherPc ? publisherPc.iceConnectionState : '',
        consumerLocalIceCount,
        consumerRemoteIceCount,
        publisherLocalIceCount,
        publisherRemoteIceCount,
        consumerHasStream: !!videoEl.srcObject,
        consumerTrackKinds: Array.from(consumerTrackKinds),
        consumerReadyState: videoEl.readyState,
        consumerCurrentTime: Number(videoEl.currentTime || 0),
        consumerVideoWidth: Number(videoEl.videoWidth || 0),
        consumerVideoHeight: Number(videoEl.videoHeight || 0),
        publisherHasStream: !!publisherVideoEl.srcObject,
        publisherTrackKinds: Array.from(publisherTrackKinds),
        publisherReadyState: publisherVideoEl.readyState,
        publisherCurrentTime: Number(publisherVideoEl.currentTime || 0),
        publisherVideoWidth: Number(publisherVideoEl.videoWidth || 0),
        publisherVideoHeight: Number(publisherVideoEl.videoHeight || 0),
        sourceType: sourceTypeEl.value,
        webrtcSourceId: webrtcSourceInputEl.value,
        publishSourceId: publishSourceIdInputEl.value,
        log: logEl.textContent
      };
    }

    async function collectPeerStats(peer) {
      const summary = {
        inboundVideoBytes: 0,
        inboundVideoFramesDecoded: 0,
        inboundAudioBytes: 0,
        outboundVideoBytes: 0,
        outboundAudioBytes: 0
      };
      if (!peer) {
        return summary;
      }
      const stats = await peer.getStats();
      stats.forEach((report) => {
        const mediaType = report.kind || report.mediaType || '';
        if (report.type === 'inbound-rtp' && mediaType === 'video') {
          summary.inboundVideoBytes += Number(report.bytesReceived || 0);
          summary.inboundVideoFramesDecoded += Number(report.framesDecoded || 0);
        } else if (report.type === 'inbound-rtp' && mediaType === 'audio') {
          summary.inboundAudioBytes += Number(report.bytesReceived || 0);
        } else if (report.type === 'outbound-rtp' && mediaType === 'video') {
          summary.outboundVideoBytes += Number(report.bytesSent || 0);
        } else if (report.type === 'outbound-rtp' && mediaType === 'audio') {
          summary.outboundAudioBytes += Number(report.bytesSent || 0);
        }
      });
      return summary;
    }

    async function waitForPlayback(kind, timeoutMs = 15000, options = {}) {
      const targetVideo = kind === 'publisher' ? publisherVideoEl : videoEl;
      const targetPeer = kind === 'publisher' ? publisherPc : pc;
      const targetTrackKinds = kind === 'publisher' ? publisherTrackKinds : consumerTrackKinds;
      const shouldMute = kind === 'publisher' || options.muted === true;
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        if (targetVideo.srcObject) {
          targetVideo.muted = shouldMute;
          try {
            const playPromise = targetVideo.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {});
            }
          } catch (_) {}
        }
        const connected = targetPeer && ['connected', 'completed'].includes(targetPeer.connectionState || '');
        const ready = targetVideo.readyState >= 2;
        const hasFrame = Number(targetVideo.videoWidth || 0) > 0;
        const hasTime = Number(targetVideo.currentTime || 0) > 0;
        const stats = await collectPeerStats(targetPeer);
        const expectsVideo = targetTrackKinds.has('video');
        const expectsAudio = targetTrackKinds.has('audio');
        const hasDecodedVideo = stats.inboundVideoFramesDecoded > 0 || (ready && hasFrame && (kind === 'publisher' || hasTime));
        const hasAudioTraffic = stats.inboundAudioBytes > 0;
        const hasExpectedConsumerMedia = kind === 'consumer' && (
          (expectsVideo && hasDecodedVideo) ||
          (!expectsVideo && expectsAudio && hasAudioTraffic) ||
          (!expectsVideo && !expectsAudio && (stats.inboundVideoBytes > 0 || stats.inboundAudioBytes > 0))
        );
        if (connected && ((ready && hasFrame && (kind === 'publisher' || hasTime)) || hasExpectedConsumerMedia)) {
          return { ...snapshotState(), stats };
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const timeoutStats = await collectPeerStats(targetPeer);
      throw new Error(`timed out waiting for ${kind} playback: ${JSON.stringify({ ...snapshotState(), stats: timeoutStats })}`);
    }

    function buildQuery() {
      const params = new URLSearchParams();
      if (sourceTypeEl.value === 'file') {
        params.set('file', fileInputEl.value);
      } else if (sourceTypeEl.value === 'webrtc') {
        params.set('source', 'webrtc');
        params.set('url', webrtcSourceInputEl.value);
      } else if (sourceTypeEl.value === 'url') {
        params.set('url', urlInputEl.value);
      } else {
        params.set('source', sourceTypeEl.value);
        params.set('url', urlInputEl.value);
      }
      return params.toString();
    }

    async function stopSession() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (sessionId) {
        await fetch(`${sessionBase}/${sessionId}`, { method: 'DELETE' }).catch(() => {});
      }
      sessionId = null;
      consumerLocalIceCount = 0;
      consumerRemoteIceCount = 0;
      consumerEmptyIcePolls = 0;
      consumerTrackKinds.clear();
      if (pc) {
        pc.close();
        pc = null;
      }
      videoEl.srcObject = null;
      log('session stopped');
    }

    async function stopPublisher() {
      if (publisherPollTimer) {
        clearInterval(publisherPollTimer);
        publisherPollTimer = null;
      }
      if (publisherSessionId) {
        await fetch(`/whip/publish/session/${publisherSessionId}`, { method: 'DELETE' }).catch(() => {});
      }
      publisherSessionId = null;
      publisherLocalIceCount = 0;
      publisherRemoteIceCount = 0;
      publisherEmptyIcePolls = 0;
      publisherTrackKinds.clear();
      if (publisherPc) {
        publisherPc.close();
        publisherPc = null;
      }
      if (publisherStream) {
        for (const track of publisherStream.getTracks()) {
          track.stop();
        }
        publisherStream = null;
      }
      publisherVideoEl.srcObject = null;
      log('publisher stopped');
    }

    async function pollIce() {
      if (!sessionId) return;
      const response = await fetch(`${sessionBase}/${sessionId}/ice`);
      if (!response.ok) return;
      const payload = await response.json();
      const candidates = payload.candidates || [];
      for (const item of candidates) {
        await pc.addIceCandidate(item);
        consumerRemoteIceCount += 1;
      }
      if (candidates.length > 0) {
        consumerEmptyIcePolls = 0;
        log(`consumer remote ICE +${candidates.length} (total=${consumerRemoteIceCount})`);
      } else if (pc && ['connected', 'completed'].includes(pc.iceConnectionState || '')) {
        consumerEmptyIcePolls += 1;
        if (consumerEmptyIcePolls >= 3 && pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
          log('consumer ICE polling stopped');
        }
      }
    }

    async function pollPublisherIce() {
      if (!publisherSessionId || !publisherPc) return;
      const response = await fetch(`/whip/publish/session/${publisherSessionId}/ice`);
      if (!response.ok) return;
      const payload = await response.json();
      const candidates = payload.candidates || [];
      for (const item of candidates) {
        await publisherPc.addIceCandidate(item);
        publisherRemoteIceCount += 1;
      }
      if (candidates.length > 0) {
        publisherEmptyIcePolls = 0;
        log(`publisher remote ICE +${candidates.length} (total=${publisherRemoteIceCount})`);
      } else if (publisherPc && ['connected', 'completed'].includes(publisherPc.iceConnectionState || '')) {
        publisherEmptyIcePolls += 1;
        if (publisherEmptyIcePolls >= 3 && publisherPollTimer) {
          clearInterval(publisherPollTimer);
          publisherPollTimer = null;
          log('publisher ICE polling stopped');
        }
      }
    }

    async function startSimple() {
      await stopSession();
      sessionBase = '/webrtc/session';
      pc = new RTCPeerConnection();
      pc.onconnectionstatechange = () => log(`consumer connectionState=${pc.connectionState}`);
      pc.oniceconnectionstatechange = () => log(`consumer iceConnectionState=${pc.iceConnectionState}`);
      pc.ontrack = (event) => {
        videoEl.srcObject = event.streams[0];
        videoEl.muted = false;
        videoEl.volume = 1.0;
        consumerTrackKinds.add(event.track.kind);
        log(`consumer ontrack kind=${event.track.kind}`);
      };
      pc.onicecandidate = async (event) => {
        if (!sessionId || !event.candidate) return;
        consumerLocalIceCount += 1;
        log(`consumer local ICE +1 (total=${consumerLocalIceCount})`);
        await fetch(`${sessionBase}/${sessionId}/ice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          })
        });
      };

      const response = await fetch(`/webrtc/session?${buildQuery()}`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'failed to create WebRTC session');
      }

      sessionId = payload.sessionId;
      sdpBox.value = payload.offer;
      await pc.setRemoteDescription({ type: 'offer', sdp: payload.offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await fetch(`${sessionBase}/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: answer.sdp
      });
      log(`simple signaling session created: ${sessionId}`);
      pollTimer = setInterval(() => { pollIce().catch((error) => log(error.message)); }, 1000);
    }

    async function startWhep() {
      await stopSession();
      sessionBase = '/whep/session';
      pc = new RTCPeerConnection();
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.onconnectionstatechange = () => log(`consumer connectionState=${pc.connectionState}`);
      pc.oniceconnectionstatechange = () => log(`consumer iceConnectionState=${pc.iceConnectionState}`);
      pc.ontrack = (event) => {
        videoEl.srcObject = event.streams[0];
        videoEl.muted = false;
        videoEl.volume = 1.0;
        consumerTrackKinds.add(event.track.kind);
        log(`consumer ontrack kind=${event.track.kind}`);
      };
      pc.onicecandidate = async (event) => {
        if (!sessionId || !event.candidate) return;
        consumerLocalIceCount += 1;
        log(`consumer local ICE +1 (total=${consumerLocalIceCount})`);
        await fetch(`${sessionBase}/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          })
        });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const response = await fetch(`/whep?${buildQuery()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp
      });
      const answer = await response.text();
      if (!response.ok) {
        throw new Error(answer || 'failed to create WHEP session');
      }
      const location = response.headers.get('Location') || '';
      sessionId = location.split('/').pop();
      sdpBox.value = answer;
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
      log(`whep session created: ${sessionId}`);
      pollTimer = setInterval(() => { pollIce().catch((error) => log(error.message)); }, 1000);
    }

    async function startPublish() {
      await stopPublisher();
      publisherPc = new RTCPeerConnection();
      publisherPc.onconnectionstatechange = () => log(`publisher connectionState=${publisherPc.connectionState}`);
      publisherPc.oniceconnectionstatechange = () => log(`publisher iceConnectionState=${publisherPc.iceConnectionState}`);
      publisherStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      publisherVideoEl.srcObject = publisherStream;
      for (const track of publisherStream.getTracks()) {
        publisherTrackKinds.add(track.kind);
        publisherPc.addTrack(track, publisherStream);
      }

      if (window.RTCRtpSender && typeof RTCRtpSender.getCapabilities === 'function') {
        for (const transceiver of publisherPc.getTransceivers()) {
          if (!transceiver.sender || !transceiver.sender.track) continue;
          const kind = transceiver.sender.track.kind;
          const caps = RTCRtpSender.getCapabilities(kind);
          if (!caps || !Array.isArray(caps.codecs)) continue;
          if (kind === 'video') {
            const preferred = caps.codecs.filter((codec) => {
              const mime = (codec.mimeType || '').toLowerCase();
              return mime === 'video/h264' || mime === 'video/rtx';
            });
            if (preferred.length > 0) {
              transceiver.setCodecPreferences(preferred);
              log('publisher codec preference: H264');
            }
          } else if (kind === 'audio') {
            const preferred = caps.codecs.filter((codec) => {
              const mime = (codec.mimeType || '').toLowerCase();
              return mime === 'audio/opus' || mime === 'audio/red' || mime === 'audio/rtx';
            });
            if (preferred.length > 0) {
              transceiver.setCodecPreferences(preferred);
              log('publisher codec preference: Opus');
            }
          }
        }
      }

      publisherPc.onicecandidate = async (event) => {
        if (!publisherSessionId || !event.candidate) return;
        publisherLocalIceCount += 1;
        log(`publisher local ICE +1 (total=${publisherLocalIceCount})`);
        await fetch(`/whip/publish/session/${publisherSessionId}/ice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          })
        });
      };

      const offer = await publisherPc.createOffer();
      await publisherPc.setLocalDescription(offer);
      const response = await fetch(`/whip/publish?sourceId=${encodeURIComponent(publishSourceIdInputEl.value)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'failed to create WHIP publish session');
      }

      publisherSessionId = payload.sessionId;
      await publisherPc.setRemoteDescription({ type: 'answer', sdp: payload.answer });
      sourceTypeEl.value = 'webrtc';
      webrtcSourceInputEl.value = payload.sourceId;
      publishSourceIdInputEl.value = payload.sourceId;
      log(`publisher session created: ${publisherSessionId} sourceId=${payload.sourceId}`);
      publisherPollTimer = setInterval(() => { pollPublisherIce().catch((error) => log(error.message)); }, 1000);
    }

    async function playPublishedSimple() {
      sourceTypeEl.value = 'webrtc';
      await startSimple();
    }

    async function playPublishedWhep() {
      sourceTypeEl.value = 'webrtc';
      await startWhep();
    }

    document.getElementById('startBtn').onclick = () => startSimple().catch((error) => log(error.message));
    document.getElementById('whepBtn').onclick = () => startWhep().catch((error) => log(error.message));
    document.getElementById('stopBtn').onclick = () => stopSession().catch((error) => log(error.message));
    document.getElementById('publishBtn').onclick = () => startPublish().catch((error) => log(error.message));
    document.getElementById('stopPublishBtn').onclick = () => stopPublisher().catch((error) => log(error.message));
    document.getElementById('consumePublishedBtn').onclick = () => playPublishedSimple().catch((error) => log(error.message));
    document.getElementById('consumePublishedWhepBtn').onclick = () => playPublishedWhep().catch((error) => log(error.message));
    document.getElementById('clearBtn').onclick = () => { logEl.textContent = ''; };
    window.__mediaServerTestApi = {
      startSimple,
      startWhep,
      stopSession,
      startPublish,
      stopPublisher,
      playPublishedSimple,
      playPublishedWhep,
      waitForPlayback,
      snapshotState,
      collectPeerStats
    };
    window.addEventListener('beforeunload', () => { stopSession(); stopPublisher(); });
  </script>
</body>
</html>)";
}

}  // namespace

struct WebRtcHttpServer::Impl {
    struct SessionEntry {
        std::string session_id;
        std::string ingress_client_id;
        media::IngressRequest request;
        std::shared_ptr<WebRtcEgressSession> bridge;
    };

    struct SourceSessionEntry {
        std::string session_id;
        std::string source_id;
        std::shared_ptr<WebRtcSourceSession> bridge;
    };

    explicit Impl(core::SessionManager& manager) : session_manager(manager) {}

    core::SessionManager& session_manager;
    std::string listen_address;
    std::uint16_t port{0};
    int listen_fd{-1};
    std::thread accept_thread;
    std::mutex mu;
    std::unordered_map<std::string, SessionEntry> sessions;
    std::unordered_map<std::string, SourceSessionEntry> source_sessions;
    std::atomic<std::uint64_t> next_session_id{1};
};

WebRtcHttpServer::WebRtcHttpServer(core::SessionManager& session_manager)
    : session_manager_(session_manager), impl_(std::make_unique<Impl>(session_manager)) {}

WebRtcHttpServer::~WebRtcHttpServer() {
    Stop();
}

namespace {

HttpResponse JsonResponse(int status, const std::string& status_text, const std::string& body) {
    HttpResponse response;
    response.status = status;
    response.status_text = status_text;
    response.content_type = "application/json; charset=utf-8";
    response.body = body;
    return response;
}

media::IngressRequest BuildHttpIngressRequest(const std::string& path,
                                              const std::unordered_map<std::string, std::string>& query,
                                              const std::string& client_id) {
    media::IngressRequest request;
    request.protocol = "http";
    request.path = path;
    request.query = query;
    request.client_id = client_id;
    return request;
}

std::string SessionJson(const std::string& session_id, const std::string& offer) {
    std::ostringstream out;
    out << "{"
        << "\"sessionId\":\"" << JsonEscape(session_id) << "\","
        << "\"offer\":\"" << JsonEscape(offer) << "\""
        << "}";
    return out.str();
}

std::string IceJson(const std::vector<WebRtcIceCandidate>& candidates) {
    std::ostringstream out;
    out << "{\"candidates\":[";
    for (std::size_t i = 0; i < candidates.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"candidate\":\"" << JsonEscape(candidates[i].candidate) << "\","
            << "\"sdpMLineIndex\":" << candidates[i].sdp_mline_index
            << "}";
    }
    out << "]}";
    return out.str();
}

std::string SourceJson(const std::string& session_id, const std::string& source_id, const std::string& answer) {
    std::ostringstream out;
    out << "{"
        << "\"sessionId\":\"" << JsonEscape(session_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"answer\":\"" << JsonEscape(answer) << "\""
        << "}";
    return out.str();
}

bool SendAll(int fd, const std::string& data) {
    std::size_t sent = 0;
    while (sent < data.size()) {
        const ssize_t bytes = send(fd, data.data() + sent, data.size() - sent, 0);
        if (bytes <= 0) {
            return false;
        }
        sent += static_cast<std::size_t>(bytes);
    }
    return true;
}

}  // namespace

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

    // 간단한 내장 HTTP 서버다. 연결마다 짧은 thread를 만들어 signaling 요청을 처리한다.
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

            std::thread([this, client_fd] {
                auto request_opt = ReadHttpRequest(client_fd);
                HttpResponse response;
                if (!request_opt.has_value()) {
                    response.status = 400;
                    response.status_text = "Bad Request";
                    response.body = "bad request";
                } else {
                    const HttpRequest& request = *request_opt;
                    response = [&]() -> HttpResponse {
                        if (request.method == "OPTIONS") {
                            return HttpResponse{};
                        }

                        const auto query = ParseQueryString(request.query);
                        const auto& config = app::GetAppConfig();
                        const std::string route_path = "/" + config.stream_route;

                        if (request.method == "GET" && request.path == "/health") {
                            HttpResponse ok;
                            ok.content_type = "application/json; charset=utf-8";
                            ok.body = "{\"status\":\"ok\"}";
                            return ok;
                        }

                        if (request.method == "GET" && request.path == "/favicon.ico") {
                            HttpResponse no_content;
                            no_content.status = 204;
                            no_content.status_text = "No Content";
                            no_content.content_type = "image/x-icon";
                            return no_content;
                        }

                        if (request.method == "GET" && request.path == "/webrtc/test") {
                            HttpResponse ok;
                            ok.content_type = "text/html; charset=utf-8";
                            ok.body = BuildTestPageHtml();
                            return ok;
                        }

                        if (request.method == "POST" && request.path == "/webrtc/session") {
                            // simple signaling: 서버가 offer를 만들고 브라우저/테스트 클라이언트가 answer를 돌려준다.
                            const std::string session_id = "webrtc-http-" + std::to_string(impl_->next_session_id.fetch_add(1));
                            const std::string ingress_client_id = session_id + "-ingress";
                            media::IngressRequest ingress_request = BuildHttpIngressRequest(route_path, query, ingress_client_id);
                            auto bridge = std::make_shared<WebRtcEgressSession>();
                            auto create_result = impl_->session_manager.CreateSession(
                                ingress_request,
                                [bridge](const media::Packet& packet) { bridge->HandleSample(packet); });
                            if (!create_result.ok) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"" + JsonEscape(create_result.message) + "\"}");
                            }

                            std::string error_message;
                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500, "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            std::string offer;
                            if (!bridge->CreateOffer(&offer, &error_message)) {
                                bridge->Stop();
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return JsonResponse(500, "Internal Server Error",
                                                    "{\"error\":\"" + JsonEscape(error_message) + "\"}");
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->sessions.emplace(session_id,
                                                        Impl::SessionEntry{
                                                            .session_id = session_id,
                                                            .ingress_client_id = ingress_client_id,
                                                            .request = std::move(ingress_request),
                                                            .bridge = bridge,
                                                        });
                            }
                            return JsonResponse(200, "OK", SessionJson(session_id, offer));
                        }

                        if (request.method == "POST" && request.path == "/whep") {
                            // WHEP: 클라이언트 offer를 먼저 받고 서버가 answer SDP를 반환하는 consume endpoint다.
                            const std::string session_id = "whep-" + std::to_string(impl_->next_session_id.fetch_add(1));
                            const std::string ingress_client_id = session_id + "-ingress";
                            media::IngressRequest ingress_request = BuildHttpIngressRequest(route_path, query, ingress_client_id);
                            auto bridge = std::make_shared<WebRtcEgressSession>();
                            auto create_result = impl_->session_manager.CreateSession(
                                ingress_request,
                                [bridge](const media::Packet& packet) { bridge->HandleSample(packet); });
                            if (!create_result.ok) {
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, create_result.message};
                            }

                            std::string error_message;
                            if (!bridge->Start(session_id, create_result.stream, &error_message)) {
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{500, "Internal Server Error", "text/plain; charset=utf-8", {}, error_message};
                            }
                            if (!bridge->SetRemoteOffer(request.body, &error_message)) {
                                bridge->Stop();
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{400, "Bad Request", "text/plain; charset=utf-8", {}, error_message};
                            }

                            std::string answer;
                            if (!bridge->CreateAnswer(&answer, &error_message)) {
                                bridge->Stop();
                                impl_->session_manager.CloseSession(ingress_client_id);
                                return HttpResponse{500, "Internal Server Error", "text/plain; charset=utf-8", {}, error_message};
                            }

                            {
                                std::lock_guard lock(impl_->mu);
                                impl_->sessions.emplace(session_id,
                                                        Impl::SessionEntry{
                                                            .session_id = session_id,
                                                            .ingress_client_id = ingress_client_id,
                                                            .request = std::move(ingress_request),
                                                            .bridge = bridge,
                                                        });
                            }

                            HttpResponse created;
                            created.status = 201;
                            created.status_text = "Created";
                            created.content_type = "application/sdp";
                            created.headers["Location"] = "/whep/session/" + session_id;
                            created.body = answer;
                            return created;
                        }

                        if (request.method == "POST" && request.path == "/whip/publish") {
                            // WHIP publish: 브라우저/테스트 publisher를 sourceId로 등록해 source=webrtc 소비가 가능하게 한다.
                            const auto source_id_it = query.find("sourceId");
                            if (source_id_it == query.end() || source_id_it->second.empty()) {
                                return JsonResponse(400, "Bad Request",
                                                    "{\"error\":\"sourceId query parameter is required\"}");
                            }

                            const std::string session_id =
                                "whip-publish-" + std::to_string(impl_->next_session_id.fetch_add(1));
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
                                                                   .bridge = bridge,
                                                               });
                            }

                            HttpResponse created;
                            created.status = 201;
                            created.status_text = "Created";
                            created.content_type = "application/json; charset=utf-8";
                            created.headers["Location"] = "/whip/publish/session/" + session_id;
                            created.body = SourceJson(session_id, source_id_it->second, answer);
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

                        if (request.path.rfind(prefix, 0) == 0 || request.path.rfind(whep_prefix, 0) == 0) {
                            const bool is_whep = request.path.rfind(whep_prefix, 0) == 0;
                            const auto parsed = with_session(is_whep ? whep_prefix : prefix);
                            const std::string session_id = parsed.first;
                            const std::string suffix = parsed.second;

                            std::shared_ptr<WebRtcEgressSession> bridge;
                            std::string ingress_client_id;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->sessions.find(session_id);
                                if (it == impl_->sessions.end()) {
                                    return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "unknown session"};
                                }
                                bridge = it->second.bridge;
                                ingress_client_id = it->second.ingress_client_id;
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
                                impl_->session_manager.CloseSession(ingress_client_id);
                                {
                                    std::lock_guard lock(impl_->mu);
                                    impl_->sessions.erase(session_id);
                                }
                                return JsonResponse(200, "OK", "{\"ok\":true}");
                            }
                        }

                        if (request.path.rfind(whip_publish_prefix, 0) == 0) {
                            const auto parsed = with_session(whip_publish_prefix);
                            const std::string session_id = parsed.first;
                            const std::string suffix = parsed.second;

                            std::shared_ptr<WebRtcSourceSession> bridge;
                            {
                                std::lock_guard lock(impl_->mu);
                                const auto it = impl_->source_sessions.find(session_id);
                                if (it == impl_->source_sessions.end()) {
                                    return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "unknown source session"};
                                }
                                bridge = it->second.bridge;
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

                const std::string encoded = BuildHttpResponse(response);
                (void)SendAll(client_fd, encoded);
                close(client_fd);
            }).detach();
        }
    });

    return true;
}

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
        for (auto& [_, entry] : impl_->source_sessions) {
            source_sessions.push_back(entry);
        }
        impl_->source_sessions.clear();
    }
    for (auto& entry : sessions) {
        entry.bridge->Stop();
        impl_->session_manager.CloseSession(entry.ingress_client_id);
    }
    for (auto& entry : source_sessions) {
        entry.bridge->Stop();
    }
}

bool WebRtcHttpServer::IsRunning() const {
    return running_.load();
}

}  // namespace ingress
