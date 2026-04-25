// 파일 용도: 이벤트 POST 요청을 bounded queue에 넣고 background worker에서 curl로 전송한다.
#include "analysis/event_post_dispatcher.h"

#include <algorithm>
#include <chrono>
#include <condition_variable>
#include <ctime>
#include <deque>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <sstream>
#include <thread>
#include <unordered_map>

#include "app_config.h"
#include "core/command_runner.h"

namespace analysis {

namespace {

struct EventPostRequest {
    std::string url;
    std::string payload;
    std::string dedupe_key;
    int cooldown_ms{0};
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

std::uint64_t NowMs() {
    return static_cast<std::uint64_t>(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch())
            .count());
}

std::string IsoTimestamp(std::uint64_t timestamp_ms) {
    const std::time_t seconds = static_cast<std::time_t>(timestamp_ms / 1000ULL);
    std::tm utc{};
    gmtime_r(&seconds, &utc);
    std::ostringstream out;
    out << std::put_time(&utc, "%Y-%m-%dT%H:%M:%S") << ".";
    out << std::setw(3) << std::setfill('0') << (timestamp_ms % 1000ULL) << "Z";
    return out.str();
}

std::string TrimForLog(std::string value) {
    value.erase(std::remove(value.begin(), value.end(), '\n'), value.end());
    value.erase(std::remove(value.begin(), value.end(), '\r'), value.end());
    constexpr std::size_t kMaxLogLength = 240;
    if (value.size() > kMaxLogLength) {
        value.resize(kMaxLogLength);
        value += "...";
    }
    return value;
}

std::string QuantizedBoxKey(const RectF& box) {
    std::ostringstream out;
    out << static_cast<int>(box.x * 100.0F) << ":"
        << static_cast<int>(box.y * 100.0F) << ":"
        << static_cast<int>(box.width * 100.0F) << ":"
        << static_cast<int>(box.height * 100.0F);
    return out.str();
}

std::string DedupeKey(const AnalysisResult& result, const AnalysisEvent& event) {
    std::ostringstream out;
    out << event.post_url << "|" << result.source_key << "|" << event.rule_id << "|"
        << event.event_type << "|" << event.class_id << "|" << event.label << "|"
        << QuantizedBoxKey(event.box);
    return out.str();
}

std::string BuildPayload(const AnalysisResult& result,
                         const AnalysisEvent& event,
                         std::uint64_t timestamp_ms,
                         std::uint64_t sequence) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event.v1\","
        << "\"eventId\":\"evt_" << timestamp_ms << "_" << sequence << "\","
        << "\"timestamp\":\"" << IsoTimestamp(timestamp_ms) << "\","
        << "\"timestampMs\":" << timestamp_ms << ","
        << "\"source\":{"
        << "\"key\":\"" << JsonEscape(result.source_key) << "\","
        << "\"profileKey\":\"" << JsonEscape(result.profile_key) << "\","
        << "\"pts\":" << result.pts
        << "},"
        << "\"rule\":{"
        << "\"id\":\"" << JsonEscape(event.rule_id) << "\","
        << "\"type\":\"" << JsonEscape(event.event_type) << "\""
        << "},"
        << "\"object\":{"
        << "\"classId\":" << event.class_id << ","
        << "\"class\":\"" << JsonEscape(event.label) << "\","
        << "\"confidence\":" << event.score << ","
        << "\"bbox\":{"
        << "\"x\":" << event.box.x << ","
        << "\"y\":" << event.box.y << ","
        << "\"width\":" << event.box.width << ","
        << "\"height\":" << event.box.height
        << "}},"
        << "\"action\":{"
        << "\"highlight\":{\"enabled\":" << (event.highlight_enabled ? "true" : "false")
        << ",\"mode\":\"blink\",\"color\":\"" << JsonEscape(event.highlight_color)
        << "\",\"durationMs\":" << event.highlight_duration_ms << "},"
        << "\"post\":{\"enabled\":true,\"method\":\"POST\","
        << "\"payloadFormat\":\"media-server.va.event.v1\"}"
        << "}"
        << "}";
    return out.str();
}

class EventPostDispatcher {
public:
    ~EventPostDispatcher() {
        Stop();
    }

    void Enqueue(EventPostRequest request) {
        const auto& config = app::GetAppConfig();
        if (!config.analysis_event_post_enabled || request.url.empty()) {
            return;
        }

        const std::uint64_t now = NowMs();
        std::lock_guard lock(mu_);
        const auto last_it = last_enqueued_ms_by_key_.find(request.dedupe_key);
        if (last_it != last_enqueued_ms_by_key_.end() &&
            request.cooldown_ms > 0 &&
            now < last_it->second + static_cast<std::uint64_t>(request.cooldown_ms)) {
            ++suppressed_count_;
            return;
        }
        last_enqueued_ms_by_key_[request.dedupe_key] = now;

        if (queue_.size() >= config.analysis_event_post_max_queue) {
            queue_.pop_front();
            ++dropped_count_;
        }
        queue_.push_back(std::move(request));
        ++enqueued_count_;
        StartWorkerLocked();
        cv_.notify_one();
    }

    EventPostDispatcherSnapshot Snapshot() const {
        const auto& config = app::GetAppConfig();
        std::lock_guard lock(mu_);
        EventPostDispatcherSnapshot snapshot;
        snapshot.enabled = config.analysis_event_post_enabled;
        snapshot.queue_size = queue_.size();
        snapshot.max_queue_size = config.analysis_event_post_max_queue;
        snapshot.enqueued_count = enqueued_count_;
        snapshot.sent_count = sent_count_;
        snapshot.failed_count = failed_count_;
        snapshot.dropped_count = dropped_count_;
        snapshot.suppressed_count = suppressed_count_;
        snapshot.last_error = last_error_;
        return snapshot;
    }

    void Stop() {
        {
            std::lock_guard lock(mu_);
            stop_ = true;
            cv_.notify_all();
        }
        if (worker_.joinable()) {
            worker_.join();
        }
    }

private:
    void StartWorkerLocked() {
        if (worker_started_) {
            return;
        }
        worker_started_ = true;
        worker_ = std::thread([this] { WorkerLoop(); });
    }

    void WorkerLoop() {
        while (true) {
            EventPostRequest request;
            {
                std::unique_lock lock(mu_);
                cv_.wait(lock, [this] { return stop_ || !queue_.empty(); });
                if (stop_ && queue_.empty()) {
                    return;
                }
                request = std::move(queue_.front());
                queue_.pop_front();
            }

            const auto& config = app::GetAppConfig();
            const int timeout_ms = std::max(1, config.analysis_event_post_timeout_ms);
            const int curl_timeout_s = std::max(1, (timeout_ms + 999) / 1000);
            const int connect_timeout_s = std::max(1, std::min(curl_timeout_s, 3));
            const core::CommandResult result = core::RunCommandCapture(
                {"curl",
                 "-fsS",
                 "--max-time",
                 std::to_string(curl_timeout_s),
                 "--connect-timeout",
                 std::to_string(connect_timeout_s),
                 "-X",
                 "POST",
                 "-H",
                 "Content-Type: application/json",
                 "--data-raw",
                 request.payload,
                 request.url},
                timeout_ms + 1000);

            std::lock_guard lock(mu_);
            if (result.exit_code == 0 && !result.timed_out && result.error_message.empty()) {
                ++sent_count_;
                continue;
            }
            ++failed_count_;
            last_error_ = result.timed_out ? "event POST timed out"
                                           : (!result.error_message.empty() ? result.error_message
                                                                            : TrimForLog(result.stderr_text));
            std::cerr << "[event-post] failed url=" << request.url
                      << " exit=" << result.exit_code
                      << " error=" << last_error_ << "\n";
        }
    }

    mutable std::mutex mu_;
    std::condition_variable cv_;
    std::deque<EventPostRequest> queue_;
    std::unordered_map<std::string, std::uint64_t> last_enqueued_ms_by_key_;
    std::thread worker_;
    bool worker_started_{false};
    bool stop_{false};
    std::uint64_t enqueued_count_{0};
    std::uint64_t sent_count_{0};
    std::uint64_t failed_count_{0};
    std::uint64_t dropped_count_{0};
    std::uint64_t suppressed_count_{0};
    std::string last_error_;
};

EventPostDispatcher& Dispatcher() {
    static EventPostDispatcher dispatcher;
    return dispatcher;
}

}  // namespace

void DispatchEventPosts(const AnalysisResult& result, const std::vector<AnalysisEvent>& events) {
    if (events.empty()) {
        return;
    }

    const auto& config = app::GetAppConfig();
    if (!config.analysis_event_post_enabled) {
        return;
    }

    for (const auto& event : events) {
        if (!event.post_enabled || event.post_url.empty()) {
            continue;
        }
        const std::uint64_t timestamp_ms = NowMs();
        static std::mutex sequence_mu;
        static std::uint64_t sequence = 0;
        std::uint64_t event_sequence = 0;
        {
            std::lock_guard lock(sequence_mu);
            event_sequence = ++sequence;
        }
        EventPostRequest request;
        request.url = event.post_url;
        request.payload = BuildPayload(result, event, timestamp_ms, event_sequence);
        request.dedupe_key = DedupeKey(result, event);
        request.cooldown_ms = std::max(config.analysis_event_post_cooldown_ms,
                                       std::max(500, event.highlight_duration_ms));
        Dispatcher().Enqueue(std::move(request));
    }
}

EventPostDispatcherSnapshot GetEventPostDispatcherSnapshot() {
    return Dispatcher().Snapshot();
}

void StopEventPostDispatcher() {
    Dispatcher().Stop();
}

}  // namespace analysis
