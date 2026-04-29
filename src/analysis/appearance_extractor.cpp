// 파일 요약: appearance hook의 NoOp 구현과 실험용 ONNX Re-ID extractor factory를 제공한다.
// 동작 요약: 기본값은 NoOp이며, 명시적으로 켠 경우 bbox crop에서 Re-ID embedding을 추출한다.
// 동작 요약: Re-ID는 TrackStateManager policy가 허용한 시점에만 호출되고 media pipeline과 분리된다.
#include "analysis/appearance_extractor.h"

#include "app_config.h"

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cctype>
#include <filesystem>
#include <iostream>
#include <mutex>
#include <numeric>

#if MEDIA_SERVER_USE_ONNXRUNTIME
#include <onnxruntime_cxx_api.h>
#endif

namespace analysis {

namespace {

float Clamp01(float value) {
    return std::max(0.0F, std::min(1.0F, value));
}

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

std::int64_t TimestampMs(std::int64_t timestamp_ns) {
    return timestamp_ns / 1000000LL;
}

std::vector<float> ResizeRgbCropToNchw(const AppearanceExtractionInput& input,
                                       int target_width,
                                       int target_height) {
    std::vector<float> tensor(static_cast<std::size_t>(3 * target_width * target_height), 0.0F);
    if (input.crop_width <= 0 || input.crop_height <= 0 || target_width <= 0 || target_height <= 0 ||
        input.crop_rgb.empty()) {
        return tensor;
    }
    const std::size_t expected =
        static_cast<std::size_t>(input.crop_width) * static_cast<std::size_t>(input.crop_height) * 3U;
    if (input.crop_rgb.size() < expected) {
        return tensor;
    }

    for (int y = 0; y < target_height; ++y) {
        const int src_y = std::min(input.crop_height - 1,
                                   static_cast<int>((static_cast<float>(y) + 0.5F) *
                                                    static_cast<float>(input.crop_height) /
                                                    static_cast<float>(target_height)));
        for (int x = 0; x < target_width; ++x) {
            const int src_x = std::min(input.crop_width - 1,
                                       static_cast<int>((static_cast<float>(x) + 0.5F) *
                                                        static_cast<float>(input.crop_width) /
                                                        static_cast<float>(target_width)));
            const std::size_t src_offset =
                static_cast<std::size_t>((src_y * input.crop_width + src_x) * 3);
            const std::size_t dst_offset = static_cast<std::size_t>(y * target_width + x);
            tensor[dst_offset] = static_cast<float>(input.crop_rgb[src_offset]) / 255.0F;
            tensor[static_cast<std::size_t>(target_width * target_height) + dst_offset] =
                static_cast<float>(input.crop_rgb[src_offset + 1]) / 255.0F;
            tensor[static_cast<std::size_t>(2 * target_width * target_height) + dst_offset] =
                static_cast<float>(input.crop_rgb[src_offset + 2]) / 255.0F;
        }
    }
    return tensor;
}

void NormalizeEmbedding(std::vector<float>* embedding) {
    if (embedding == nullptr || embedding->empty()) {
        return;
    }
    double sum = 0.0;
    for (const float value : *embedding) {
        sum += static_cast<double>(value) * static_cast<double>(value);
    }
    const double norm = std::sqrt(sum);
    if (norm <= 0.0000001) {
        return;
    }
    for (auto& value : *embedding) {
        value = static_cast<float>(static_cast<double>(value) / norm);
    }
}

float EmbeddingQuality(const std::vector<float>& embedding, float detection_confidence) {
    if (embedding.empty()) {
        return 0.0F;
    }
    double sum = 0.0;
    for (const float value : embedding) {
        sum += static_cast<double>(value) * static_cast<double>(value);
    }
    const double norm = std::sqrt(sum);
    const double normalized_norm =
        norm / std::sqrt(std::max<double>(1.0, static_cast<double>(embedding.size())));
    return Clamp01(static_cast<float>(normalized_norm) * Clamp01(detection_confidence));
}

}  // namespace

bool NoOpAppearanceExtractor::Enabled() const {
    return true;
}

AppearanceExtractorStats NoOpAppearanceExtractor::Stats() const {
    AppearanceExtractorStats stats;
    stats.enabled = false;
    stats.extractor_name = "noop";
    return stats;
}

std::optional<AppearanceProfile> NoOpAppearanceExtractor::Extract(
    const AppearanceExtractionInput& input,
    const AppearanceProfile* previous_profile) {
    (void)input;
    (void)previous_profile;
    return std::nullopt;
}

#if MEDIA_SERVER_USE_ONNXRUNTIME

namespace {

bool IsSupportedReidTensorType(ONNXTensorElementDataType type) {
    return type == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT ||
           type == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT16;
}

class ExperimentalOnnxReidExtractor final : public IAppearanceExtractor {
public:
    explicit ExperimentalOnnxReidExtractor(AppearanceExtractorOptions options)
        : options_(std::move(options)), env_(ORT_LOGGING_LEVEL_WARNING, "media-server-reid") {
        std::lock_guard lock(stats_mu_);
        stats_.model_path = options_.model_path;
    }

    bool Start(std::string* error_message) {
        try {
            Ort::SessionOptions session_options;
            session_options.SetIntraOpNumThreads(1);
            session_options.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_EXTENDED);
            session_ = std::make_unique<Ort::Session>(env_, options_.model_path.c_str(), session_options);

            Ort::AllocatorWithDefaultOptions allocator;
            auto input_name = session_->GetInputNameAllocated(0, allocator);
            auto output_name = session_->GetOutputNameAllocated(0, allocator);
            input_name_ = input_name.get();
            output_name_ = output_name.get();
            input_element_type_ =
                session_->GetInputTypeInfo(0).GetTensorTypeAndShapeInfo().GetElementType();
            output_element_type_ =
                session_->GetOutputTypeInfo(0).GetTensorTypeAndShapeInfo().GetElementType();
            if (!IsSupportedReidTensorType(input_element_type_) ||
                !IsSupportedReidTensorType(output_element_type_)) {
                if (error_message != nullptr) {
                    *error_message = "ONNX Re-ID extractor supports fp32/fp16 input and output tensors only";
                }
                session_.reset();
                return false;
            }
        } catch (const Ort::Exception& ex) {
            if (error_message != nullptr) {
                *error_message = std::string("failed to start ONNX Re-ID extractor: ") + ex.what();
            }
            session_.reset();
            return false;
        }
        return true;
    }

    bool Enabled() const override {
        return options_.enabled && session_ != nullptr;
    }

    AppearanceExtractorStats Stats() const override {
        std::lock_guard lock(stats_mu_);
        return stats_;
    }

    std::optional<AppearanceProfile> Extract(const AppearanceExtractionInput& input,
                                             const AppearanceProfile* previous_profile) override {
        IncrementRequest();
        if (!Enabled()) {
            return std::nullopt;
        }
        if (input.crop_width <= 0 || input.crop_height <= 0 || input.crop_rgb.empty()) {
            IncrementMissingCrop();
            return std::nullopt;
        }

        std::unique_lock inference_lock(inference_mu_, std::try_to_lock);
        if (!inference_lock.owns_lock()) {
            IncrementBusyDrop();
            return std::nullopt;
        }

        const auto started_at = std::chrono::steady_clock::now();
        try {
            Ort::MemoryInfo memory_info =
                Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
            std::vector<float> input_tensor =
                ResizeRgbCropToNchw(input, options_.input_width, options_.input_height);
            std::vector<Ort::Float16_t> input_fp16;
            std::optional<Ort::Value> input_tensor_holder;
            std::array<std::int64_t, 4> shape = {
                1, 3, options_.input_height, options_.input_width};
            if (input_element_type_ == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT16) {
                input_fp16.reserve(input_tensor.size());
                std::transform(input_tensor.begin(),
                               input_tensor.end(),
                               std::back_inserter(input_fp16),
                               [](float value) { return Ort::Float16_t(value); });
                input_tensor_holder.emplace(Ort::Value::CreateTensor<Ort::Float16_t>(
                    memory_info, input_fp16.data(), input_fp16.size(), shape.data(), shape.size()));
            } else {
                input_tensor_holder.emplace(Ort::Value::CreateTensor<float>(
                    memory_info, input_tensor.data(), input_tensor.size(), shape.data(), shape.size()));
            }

            const char* input_names[] = {input_name_.c_str()};
            const char* output_names[] = {output_name_.c_str()};
            auto outputs =
                session_->Run(Ort::RunOptions{nullptr}, input_names, &*input_tensor_holder, 1, output_names, 1);
            if (outputs.empty() || !outputs.front().IsTensor()) {
                RecordFailure("ONNX Re-ID output is not a tensor");
                return std::nullopt;
            }

            auto embedding = ReadEmbedding(outputs.front());
            if (embedding.empty()) {
                RecordFailure("ONNX Re-ID output embedding is empty");
                return std::nullopt;
            }
            const float quality = EmbeddingQuality(embedding, input.confidence);
            NormalizeEmbedding(&embedding);

            AppearanceProfile profile = previous_profile != nullptr ? *previous_profile : AppearanceProfile{};
            profile.embedding = std::move(embedding);
            profile.embedding_quality = quality;
            profile.last_updated_time_ns = input.timestamp_ns;
            profile.last_updated_time_ms =
                input.timestamp_ms > 0 ? input.timestamp_ms : TimestampMs(input.timestamp_ns);
            profile.sample_count = previous_profile != nullptr ? previous_profile->sample_count + 1 : 1;
            const auto finished_at = std::chrono::steady_clock::now();
            const double elapsed_ms =
                std::chrono::duration<double, std::milli>(finished_at - started_at).count();
            RecordSuccess(elapsed_ms, input);
            return profile;
        } catch (const Ort::Exception& ex) {
            RecordFailure(std::string("ONNX Re-ID inference failed: ") + ex.what());
            return std::nullopt;
        }
    }

private:
    std::vector<float> ReadEmbedding(Ort::Value& output) const {
        auto shape_info = output.GetTensorTypeAndShapeInfo();
        const auto output_type = shape_info.GetElementType();
        const std::size_t element_count =
            std::min<std::size_t>(shape_info.GetElementCount(), options_.max_embedding_dim);
        if (element_count == 0 || !IsSupportedReidTensorType(output_type)) {
            return {};
        }
        std::vector<float> embedding;
        embedding.reserve(element_count);
        if (output_type == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT) {
            const float* data = output.GetTensorData<float>();
            embedding.assign(data, data + element_count);
        } else {
            const Ort::Float16_t* data = output.GetTensorData<Ort::Float16_t>();
            for (std::size_t i = 0; i < element_count; ++i) {
                embedding.push_back(static_cast<float>(data[i]));
            }
        }
        embedding.erase(std::remove_if(embedding.begin(),
                                       embedding.end(),
                                       [](float value) { return !std::isfinite(value); }),
                        embedding.end());
        return embedding;
    }

    void IncrementRequest() {
        std::lock_guard lock(stats_mu_);
        ++stats_.request_count;
    }

    void IncrementMissingCrop() {
        std::lock_guard lock(stats_mu_);
        ++stats_.missing_crop_count;
        ++stats_.dropped_count;
        stats_.last_error = "missing RGB crop for Re-ID extraction";
    }

    void IncrementBusyDrop() {
        std::lock_guard lock(stats_mu_);
        ++stats_.busy_drop_count;
        ++stats_.dropped_count;
        stats_.last_error = "Re-ID extractor is busy; request dropped";
    }

    void RecordSuccess(double elapsed_ms, const AppearanceExtractionInput& input) {
        std::lock_guard lock(stats_mu_);
        ++stats_.completed_count;
        stats_.last_inference_time_ms = elapsed_ms;
        stats_.max_inference_time_ms = std::max(stats_.max_inference_time_ms, elapsed_ms);
        stats_.total_inference_time_ms += static_cast<std::uint64_t>(std::max(0.0, elapsed_ms));
        stats_.last_error.clear();
        if (options_.log_enabled) {
            std::cerr << "[analysis][appearance] onnx-reid stream=" << input.stream_id
                      << " channel=" << input.channel_id
                      << " track=" << input.track_id
                      << " elapsedMs=" << elapsed_ms << "\n";
        }
    }

    void RecordFailure(const std::string& error) {
        std::lock_guard lock(stats_mu_);
        ++stats_.failed_count;
        stats_.last_error = error;
        if (options_.log_enabled) {
            std::cerr << "[analysis][appearance] " << error << "\n";
        }
    }

    AppearanceExtractorOptions options_;
    Ort::Env env_;
    std::unique_ptr<Ort::Session> session_;
    std::string input_name_;
    std::string output_name_;
    ONNXTensorElementDataType input_element_type_{ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT};
    ONNXTensorElementDataType output_element_type_{ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT};
    mutable std::mutex inference_mu_;
    mutable std::mutex stats_mu_;
    AppearanceExtractorStats stats_{
        .enabled = true,
        .extractor_name = "onnx-reid",
    };
};

}  // namespace

#endif

AppearanceUpdatePolicy BuildAppearanceUpdatePolicyFromConfig(const app::AppConfig& config) {
    AppearanceUpdatePolicy policy;
    policy.enabled = config.analysis_appearance_enabled;
    policy.on_track_created = config.analysis_appearance_on_track_created;
    policy.every_n_seconds = std::max(0, config.analysis_appearance_every_n_seconds);
    policy.on_track_lost = config.analysis_appearance_on_track_lost;
    policy.on_reacquire_candidate = config.analysis_appearance_on_reacquire_candidate;
    policy.on_low_confidence_association =
        config.analysis_appearance_on_low_confidence_association;
    policy.async_enabled = config.analysis_appearance_async_enabled;
    policy.max_queue_size = std::max<std::size_t>(1, config.analysis_appearance_max_queue);
    policy.global_max_queue_size =
        std::max<std::size_t>(1, config.analysis_appearance_global_max_queue);
    policy.per_stream_rate_limit_ms =
        std::max(0, config.analysis_appearance_per_stream_rate_limit_ms);
    policy.max_job_age_ms = std::max(0, config.analysis_appearance_max_job_age_ms);
    return policy;
}

AppearanceExtractorOptions BuildAppearanceExtractorOptionsFromConfig(const app::AppConfig& config) {
    AppearanceExtractorOptions options;
    options.enabled = config.analysis_appearance_enabled;
    options.extractor_name = ToLower(config.analysis_appearance_extractor);
    options.model_path = config.analysis_appearance_model_path;
    options.input_width = std::max(1, config.analysis_appearance_input_width);
    options.input_height = std::max(1, config.analysis_appearance_input_height);
    options.max_embedding_dim = std::max<std::size_t>(1, config.analysis_appearance_max_embedding_dim);
    options.log_enabled = config.analysis_appearance_log_enabled;
    options.async_enabled = config.analysis_appearance_async_enabled;
    options.max_queue_size = std::max<std::size_t>(1, config.analysis_appearance_max_queue);
    options.global_max_queue_size =
        std::max<std::size_t>(1, config.analysis_appearance_global_max_queue);
    options.per_stream_rate_limit_ms =
        std::max(0, config.analysis_appearance_per_stream_rate_limit_ms);
    options.max_job_age_ms = std::max(0, config.analysis_appearance_max_job_age_ms);
    return options;
}

std::shared_ptr<IAppearanceExtractor> CreateAppearanceExtractorFromConfig(const app::AppConfig& config) {
    const auto options = BuildAppearanceExtractorOptionsFromConfig(config);
    if (!options.enabled || options.extractor_name.empty() || options.extractor_name == "noop") {
        return std::make_shared<NoOpAppearanceExtractor>();
    }
    if (options.extractor_name != "onnx-reid") {
        std::cerr << "[analysis][appearance] unsupported extractor '" << options.extractor_name
                  << "', falling back to NoOp\n";
        return std::make_shared<NoOpAppearanceExtractor>();
    }
    if (options.model_path.empty() || !std::filesystem::exists(options.model_path)) {
        std::cerr << "[analysis][appearance] ONNX Re-ID model is missing, falling back to NoOp: "
                  << options.model_path << "\n";
        return std::make_shared<NoOpAppearanceExtractor>();
    }

#if MEDIA_SERVER_USE_ONNXRUNTIME
    auto extractor = std::make_shared<ExperimentalOnnxReidExtractor>(options);
    std::string error_message;
    if (!extractor->Start(&error_message)) {
        std::cerr << "[analysis][appearance] " << error_message << "; falling back to NoOp\n";
        return std::make_shared<NoOpAppearanceExtractor>();
    }
    return extractor;
#else
    std::cerr << "[analysis][appearance] ONNX Re-ID extractor requires MEDIA_SERVER_USE_ONNXRUNTIME=ON; "
                 "falling back to NoOp\n";
    return std::make_shared<NoOpAppearanceExtractor>();
#endif
}

}  // namespace analysis
