// 파일 용도: /lab/import job의 검증, yt-dlp 실행, 상태 저장을 구현한다.
#include "ingress/lab_import_manager.h"

#include <algorithm>
#include <chrono>
#include <cctype>
#include <filesystem>
#include <mutex>
#include <sstream>
#include <thread>
#include <unordered_map>

#include "app_config.h"
#include "core/command_runner.h"
#include "core/youtube_resolver.h"

namespace ingress {

namespace {

constexpr int kDefaultImportTimeoutMs = 15 * 60 * 1000;
constexpr int kDefaultNormalizeTimeoutMs = 30 * 60 * 1000;

std::int64_t NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

std::string Trim(const std::string& value) {
    std::size_t begin = 0;
    while (begin < value.size() && std::isspace(static_cast<unsigned char>(value[begin])) != 0) {
        ++begin;
    }
    std::size_t end = value.size();
    while (end > begin && std::isspace(static_cast<unsigned char>(value[end - 1])) != 0) {
        --end;
    }
    return value.substr(begin, end - begin);
}

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(),
                   [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
    return value;
}

std::string SanitizeFileStem(const std::string& raw_name) {
    std::string out;
    out.reserve(raw_name.size());
    for (const char ch : raw_name) {
        const bool safe = std::isalnum(static_cast<unsigned char>(ch)) != 0 || ch == '-' || ch == '_' || ch == '.';
        out.push_back(safe ? ch : '_');
    }
    while (!out.empty() && (out.front() == '.' || out.front() == '_')) {
        out.erase(out.begin());
    }
    if (out.empty()) {
        out = "import";
    }
    return out;
}

bool IsSupportedVideoExtension(const std::filesystem::path& path) {
    const std::string ext = ToLower(path.extension().string());
    return ext == ".mp4" || ext == ".mkv" || ext == ".mov" || ext == ".webm" || ext == ".m4v";
}

std::string BuildNormalizeFilter(const app::AppConfig& config) {
    std::ostringstream oss;
    oss << "scale=w=" << config.uri_video_width
        << ":h=" << config.uri_video_height
        << ":force_original_aspect_ratio=decrease:force_divisible_by=2,"
        << "pad=" << config.uri_video_width
        << ":" << config.uri_video_height
        << ":(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p";
    return oss.str();
}

core::CommandResult NormalizeImportedMedia(const std::filesystem::path& input_path,
                                           const std::filesystem::path& output_path) {
    const auto& config = app::GetAppConfig();
    const std::vector<std::string> args{
        "ffmpeg",
        "-y",
        "-i",
        input_path.string(),
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "libx264",
        "-preset",
        config.uri_x264_speed_preset,
        "-pix_fmt",
        "yuv420p",
        "-r",
        std::to_string(config.uri_video_fps),
        "-vf",
        BuildNormalizeFilter(config),
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ac",
        "2",
        "-ar",
        "48000",
        "-movflags",
        "+faststart",
        output_path.string(),
    };
    return core::RunCommandCapture(args, kDefaultNormalizeTimeoutMs);
}

std::string TruncateLog(const std::string& text, std::size_t max_size = 4000) {
    if (text.size() <= max_size) {
        return text;
    }
    return text.substr(0, max_size) + "...";
}

std::filesystem::path BuildUniqueTargetPath(const std::filesystem::path& dir,
                                            const std::string& requested_name,
                                            const std::string& fallback_prefix) {
    std::string stem = SanitizeFileStem(requested_name);
    std::string ext = ".mp4";
    const auto requested_path = std::filesystem::path(stem);
    if (requested_path.has_extension()) {
        ext = requested_path.extension().string();
        stem = requested_path.stem().string();
    }
    if (stem.empty()) {
        stem = fallback_prefix;
    }
    if (ext.empty()) {
        ext = ".mp4";
    }

    std::filesystem::path candidate = dir / (stem + ext);
    int suffix = 1;
    while (std::filesystem::exists(candidate)) {
        candidate = dir / (stem + "_" + std::to_string(suffix) + ext);
        ++suffix;
    }
    return candidate;
}

}  // namespace

struct LabImportManager::State {
    struct JobRecord {
        LabImportJobSnapshot snapshot;
    };

    mutable std::mutex mu;
    std::unordered_map<std::string, JobRecord> jobs;
    std::uint64_t next_job_id{1};
};

LabImportManager::LabImportManager() : state_(std::make_shared<State>()) {}

LabImportManager::~LabImportManager() = default;

LabImportJobSnapshot LabImportManager::CreateJob(const LabImportJobRequest& request, std::string* error_message) {
    LabImportJobSnapshot snapshot;
    snapshot.provider = Trim(request.provider);
    snapshot.source_url = Trim(request.url);
    snapshot.requested_file_name = Trim(request.target_file_name);

    if (snapshot.provider.empty()) {
        snapshot.provider = "youtube";
    }
    if (snapshot.provider != "youtube") {
        if (error_message != nullptr) {
            *error_message = "unsupported lab import provider: " + snapshot.provider;
        }
        return snapshot;
    }
    if (!app::GetAppConfig().enable_experimental_youtube_source) {
        if (error_message != nullptr) {
            *error_message =
                "youtube lab import is disabled; start the server with "
                "MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1";
        }
        return snapshot;
    }
    if (snapshot.source_url.empty()) {
        if (error_message != nullptr) {
            *error_message = "url is required";
        }
        return snapshot;
    }
    if (!core::ValidateYouTubeWatchUrl(snapshot.source_url, error_message)) {
        return snapshot;
    }

    const auto base_dir = std::filesystem::path(app::GetAppConfig().file_root_path) / "imports";
    std::error_code ec;
    std::filesystem::create_directories(base_dir, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "failed to create import directory: " + ec.message();
        }
        return snapshot;
    }

    snapshot.created_at_ms = NowMs();
    snapshot.updated_at_ms = snapshot.created_at_ms;
    snapshot.status = "queued";

    {
        std::lock_guard lock(state_->mu);
        snapshot.job_id = "import-" + std::to_string(state_->next_job_id++);
        state_->jobs[snapshot.job_id] = State::JobRecord{.snapshot = snapshot};
    }

    const auto state = state_;
    const std::filesystem::path import_dir = base_dir;
    std::thread([state, import_dir, snapshot]() mutable {
        std::filesystem::path job_work_dir = import_dir / (snapshot.job_id + "_tmp");
        std::filesystem::create_directories(job_work_dir);

        {
            std::lock_guard lock(state->mu);
            auto& job = state->jobs[snapshot.job_id].snapshot;
            job.status = "running";
            job.started_at_ms = NowMs();
            job.updated_at_ms = job.started_at_ms;
        }

        const std::filesystem::path target_path =
            BuildUniqueTargetPath(import_dir, snapshot.requested_file_name, snapshot.job_id);
        const std::filesystem::path output_template = job_work_dir / "payload.%(ext)s";
        const std::vector<std::string> args{
            app::GetAppConfig().youtube_resolver_bin,
            "--no-warnings",
            "--no-progress",
            "--no-playlist",
            "--restrict-filenames",
            "-f",
            app::GetAppConfig().youtube_format,
            "--merge-output-format",
            "mp4",
            "-o",
            output_template.string(),
            snapshot.source_url,
        };

        const core::CommandResult result = core::RunCommandCapture(args, kDefaultImportTimeoutMs);
        std::string stored_file_token;
        std::string error;
        std::string log_excerpt = TruncateLog(result.stdout_text + "\n" + result.stderr_text);

        if (!result.error_message.empty()) {
            error = result.error_message;
        } else if (result.timed_out) {
            error = "lab import timed out";
        } else if (result.exit_code != 0) {
            error = "lab import command failed with exit code " + std::to_string(result.exit_code);
        } else {
            std::filesystem::path downloaded_path;
            for (const auto& entry : std::filesystem::directory_iterator(job_work_dir)) {
                if (!entry.is_regular_file()) {
                    continue;
                }
                if (!IsSupportedVideoExtension(entry.path())) {
                    continue;
                }
                downloaded_path = entry.path();
                break;
            }
            if (downloaded_path.empty()) {
                error = "lab import completed but no video file was found";
            } else {
                const std::filesystem::path normalized_path = job_work_dir / "normalized.mp4";
                const core::CommandResult normalize_result = NormalizeImportedMedia(downloaded_path, normalized_path);
                log_excerpt = TruncateLog(result.stdout_text + "\n" + result.stderr_text +
                                          "\n[normalize]\n" + normalize_result.stdout_text + "\n" +
                                          normalize_result.stderr_text);
                if (!normalize_result.error_message.empty()) {
                    error = "ffmpeg normalize failed: " + normalize_result.error_message;
                } else if (normalize_result.timed_out) {
                    error = "ffmpeg normalize timed out";
                } else if (normalize_result.exit_code != 0) {
                    error = "ffmpeg normalize failed with exit code " +
                            std::to_string(normalize_result.exit_code);
                } else if (!std::filesystem::exists(normalized_path)) {
                    error = "ffmpeg normalize completed but no output file was found";
                }

                std::filesystem::path final_target = target_path;
                final_target.replace_extension(".mp4");
                if (std::filesystem::exists(final_target)) {
                    final_target = BuildUniqueTargetPath(import_dir,
                                                         final_target.filename().string(),
                                                         snapshot.job_id);
                    final_target.replace_extension(".mp4");
                }
                if (error.empty()) {
                    std::error_code move_ec;
                    std::filesystem::rename(normalized_path, final_target, move_ec);
                    if (move_ec) {
                        error = "failed to move imported file: " + move_ec.message();
                    } else {
                        stored_file_token = std::filesystem::relative(final_target,
                                                                      std::filesystem::path(app::GetAppConfig().file_root_path))
                                                .generic_string();
                    }
                }
            }
        }

        std::error_code cleanup_ec;
        std::filesystem::remove_all(job_work_dir, cleanup_ec);

        {
            std::lock_guard lock(state->mu);
            auto& job = state->jobs[snapshot.job_id].snapshot;
            job.updated_at_ms = NowMs();
            job.finished_at_ms = job.updated_at_ms;
            job.exit_code = result.exit_code;
            job.log_excerpt = std::move(log_excerpt);
            job.stored_file_token = std::move(stored_file_token);
            if (error.empty()) {
                job.status = "ready";
            } else {
                job.status = "failed";
                job.error_message = std::move(error);
            }
        }
    }).detach();

    return GetJob(snapshot.job_id).value_or(snapshot);
}

std::vector<LabImportJobSnapshot> LabImportManager::ListJobs() const {
    std::vector<LabImportJobSnapshot> jobs;
    std::lock_guard lock(state_->mu);
    jobs.reserve(state_->jobs.size());
    for (const auto& [job_id, record] : state_->jobs) {
        jobs.push_back(record.snapshot);
    }
    std::sort(jobs.begin(), jobs.end(), [](const auto& left, const auto& right) {
        return left.created_at_ms > right.created_at_ms;
    });
    return jobs;
}

std::optional<LabImportJobSnapshot> LabImportManager::GetJob(const std::string& job_id) const {
    std::lock_guard lock(state_->mu);
    const auto it = state_->jobs.find(job_id);
    if (it == state_->jobs.end()) {
        return std::nullopt;
    }
    return it->second.snapshot;
}

}  // namespace ingress
