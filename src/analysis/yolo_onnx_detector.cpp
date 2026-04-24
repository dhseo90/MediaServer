// 파일 용도: ONNX Runtime 기반 YOLO object detector와 ONNX 미사용 빌드용 stub을 구현한다.
#include "analysis/detector.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <fstream>
#include <numeric>

#if MEDIA_SERVER_USE_ONNXRUNTIME
#include <onnxruntime_cxx_api.h>
#endif

namespace analysis {

namespace {

std::vector<std::string> LoadLabels(const std::string& path) {
    std::vector<std::string> labels;
    if (path.empty()) {
        return labels;
    }
    std::ifstream file(path);
    std::string line;
    while (std::getline(file, line)) {
        while (!line.empty() && (line.back() == '\r' || line.back() == '\n')) {
            line.pop_back();
        }
        if (!line.empty()) {
            labels.push_back(line);
        }
    }
    return labels;
}

std::string LabelForClass(const std::vector<std::string>& labels, int class_id) {
    if (class_id >= 0 && static_cast<std::size_t>(class_id) < labels.size()) {
        return labels[static_cast<std::size_t>(class_id)];
    }
    return "class_" + std::to_string(class_id);
}

float Clamp01(float value) {
    return std::max(0.0F, std::min(1.0F, value));
}

float IoU(const RectF& a, const RectF& b) {
    const float ax2 = a.x + a.width;
    const float ay2 = a.y + a.height;
    const float bx2 = b.x + b.width;
    const float by2 = b.y + b.height;
    const float ix1 = std::max(a.x, b.x);
    const float iy1 = std::max(a.y, b.y);
    const float ix2 = std::min(ax2, bx2);
    const float iy2 = std::min(ay2, by2);
    const float iw = std::max(0.0F, ix2 - ix1);
    const float ih = std::max(0.0F, iy2 - iy1);
    const float intersection = iw * ih;
    const float union_area = a.width * a.height + b.width * b.height - intersection;
    return union_area <= 0.0F ? 0.0F : intersection / union_area;
}

std::vector<Detection> ApplyNms(std::vector<Detection> detections, float nms_threshold, int max_detections) {
    std::sort(detections.begin(), detections.end(), [](const Detection& lhs, const Detection& rhs) {
        return lhs.score > rhs.score;
    });

    std::vector<Detection> kept;
    const std::size_t limit = max_detections > 0 ? static_cast<std::size_t>(max_detections) : detections.size();
    for (const auto& detection : detections) {
        bool suppressed = false;
        for (const auto& selected : kept) {
            if (detection.class_id == selected.class_id && IoU(detection.box, selected.box) > nms_threshold) {
                suppressed = true;
                break;
            }
        }
        if (!suppressed) {
            kept.push_back(detection);
            if (kept.size() >= limit) {
                break;
            }
        }
    }
    return kept;
}

std::vector<float> ResizeRgbToNchw(const RawVideoFrame& frame, int target_width, int target_height) {
    std::vector<float> tensor(static_cast<std::size_t>(3 * target_width * target_height), 0.0F);
    if (frame.format != PixelFormat::RGB || frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        return tensor;
    }

    for (int y = 0; y < target_height; ++y) {
        const int src_y = std::min(frame.height - 1, static_cast<int>((static_cast<float>(y) + 0.5F) * frame.height / target_height));
        for (int x = 0; x < target_width; ++x) {
            const int src_x = std::min(frame.width - 1, static_cast<int>((static_cast<float>(x) + 0.5F) * frame.width / target_width));
            const std::size_t src_offset = static_cast<std::size_t>((src_y * frame.width + src_x) * 3);
            const std::size_t dst_offset = static_cast<std::size_t>(y * target_width + x);
            if (src_offset + 2 >= frame.data.size()) {
                continue;
            }
            tensor[dst_offset] = static_cast<float>(frame.data[src_offset]) / 255.0F;
            tensor[static_cast<std::size_t>(target_width * target_height) + dst_offset] =
                static_cast<float>(frame.data[src_offset + 1]) / 255.0F;
            tensor[static_cast<std::size_t>(2 * target_width * target_height) + dst_offset] =
                static_cast<float>(frame.data[src_offset + 2]) / 255.0F;
        }
    }
    return tensor;
}

#if MEDIA_SERVER_USE_ONNXRUNTIME

class YoloOnnxDetector final : public Detector {
public:
    explicit YoloOnnxDetector(AnalysisProfile profile)
        : profile_(std::move(profile)), env_(ORT_LOGGING_LEVEL_WARNING, "media-server-yolo") {}

    std::string Name() const override {
        return "onnx-yolo";
    }

    bool Start(std::string* error_message) override {
        if (profile_.model_path.empty()) {
            if (error_message != nullptr) {
                *error_message = "YOLO detector requires model query parameter";
            }
            return false;
        }
        if (profile_.model_input_width <= 0 || profile_.model_input_height <= 0) {
            if (error_message != nullptr) {
                *error_message = "YOLO detector input size must be positive";
            }
            return false;
        }

        try {
            Ort::SessionOptions options;
            options.SetIntraOpNumThreads(1);
            options.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_EXTENDED);
            session_ = std::make_unique<Ort::Session>(env_, profile_.model_path.c_str(), options);

            Ort::AllocatorWithDefaultOptions allocator;
            auto input_name = session_->GetInputNameAllocated(0, allocator);
            auto output_name = session_->GetOutputNameAllocated(0, allocator);
            input_name_ = input_name.get();
            output_name_ = output_name.get();
            labels_ = LoadLabels(profile_.labels_path);
        } catch (const Ort::Exception& ex) {
            if (error_message != nullptr) {
                *error_message = std::string("failed to start YOLO ONNX detector: ") + ex.what();
            }
            return false;
        }

        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }

    void Stop() override {
        session_.reset();
    }

    bool Analyze(const RawVideoFrame& frame, AnalysisResult* result, std::string* error_message) override {
        if (result == nullptr) {
            if (error_message != nullptr) {
                *error_message = "missing analysis result output";
            }
            return false;
        }
        if (session_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = "YOLO ONNX detector is not running";
            }
            return false;
        }
        if (frame.format != PixelFormat::RGB || frame.width <= 0 || frame.height <= 0) {
            if (error_message != nullptr) {
                *error_message = "YOLO detector requires RGB raw frame";
            }
            return false;
        }

        try {
            std::vector<float> input = ResizeRgbToNchw(frame, profile_.model_input_width, profile_.model_input_height);
            std::array<std::int64_t, 4> shape = {1, 3, profile_.model_input_height, profile_.model_input_width};
            Ort::MemoryInfo memory_info = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
            Ort::Value input_tensor = Ort::Value::CreateTensor<float>(
                memory_info, input.data(), input.size(), shape.data(), shape.size());
            const char* input_names[] = {input_name_.c_str()};
            const char* output_names[] = {output_name_.c_str()};
            auto outputs = session_->Run(Ort::RunOptions{nullptr}, input_names, &input_tensor, 1, output_names, 1);
            if (outputs.empty() || !outputs.front().IsTensor()) {
                if (error_message != nullptr) {
                    *error_message = "YOLO detector output is not a tensor";
                }
                return false;
            }

            result->source_key = frame.source_key;
            result->pts = frame.pts;
            result->detections = ParseOutput(outputs.front());
            if (error_message != nullptr) {
                error_message->clear();
            }
            return true;
        } catch (const Ort::Exception& ex) {
            if (error_message != nullptr) {
                *error_message = std::string("YOLO ONNX inference failed: ") + ex.what();
            }
            return false;
        }
    }

private:
    std::vector<Detection> ParseOutput(Ort::Value& output) const {
        auto type_info = output.GetTensorTypeAndShapeInfo();
        if (type_info.GetElementType() != ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT) {
            return {};
        }
        const std::vector<std::int64_t> shape = type_info.GetShape();
        const float* data = output.GetTensorData<float>();
        if (data == nullptr || shape.size() < 3 || shape[0] != 1) {
            return {};
        }

        std::int64_t candidates = 0;
        std::int64_t attrs = 0;
        bool channels_first = false;
        if (shape[1] > 0 && shape[2] > 0 && shape[1] < shape[2]) {
            attrs = shape[1];
            candidates = shape[2];
            channels_first = true;
        } else {
            candidates = shape[1];
            attrs = shape[2];
        }
        if (attrs < 6 || candidates <= 0) {
            return {};
        }

        const bool has_objectness = profile_.yolo_has_objectness || attrs == 85;
        const std::int64_t class_offset = has_objectness ? 5 : 4;
        const std::int64_t class_count = attrs - class_offset;
        if (class_count <= 0) {
            return {};
        }

        auto at = [&](std::int64_t candidate, std::int64_t attr) -> float {
            if (channels_first) {
                return data[attr * candidates + candidate];
            }
            return data[candidate * attrs + attr];
        };

        std::vector<Detection> detections;
        for (std::int64_t i = 0; i < candidates; ++i) {
            int best_class = -1;
            float best_class_score = 0.0F;
            for (std::int64_t cls = 0; cls < class_count; ++cls) {
                const float score = at(i, class_offset + cls);
                if (score > best_class_score) {
                    best_class_score = score;
                    best_class = static_cast<int>(cls);
                }
            }
            const float objectness = has_objectness ? at(i, 4) : 1.0F;
            const float score = objectness * best_class_score;
            if (best_class < 0 || score < profile_.confidence_threshold) {
                continue;
            }

            const float cx = at(i, 0);
            const float cy = at(i, 1);
            const float width = at(i, 2);
            const float height = at(i, 3);
            const bool normalized = std::max({std::fabs(cx), std::fabs(cy), std::fabs(width), std::fabs(height)}) <= 2.0F;
            const float inv_w = normalized ? 1.0F : 1.0F / static_cast<float>(profile_.model_input_width);
            const float inv_h = normalized ? 1.0F : 1.0F / static_cast<float>(profile_.model_input_height);
            const float x1 = Clamp01((cx - width * 0.5F) * inv_w);
            const float y1 = Clamp01((cy - height * 0.5F) * inv_h);
            const float x2 = Clamp01((cx + width * 0.5F) * inv_w);
            const float y2 = Clamp01((cy + height * 0.5F) * inv_h);
            if (x2 <= x1 || y2 <= y1) {
                continue;
            }

            detections.push_back(Detection{
                .class_id = best_class,
                .label = LabelForClass(labels_, best_class),
                .score = score,
                .box = RectF{.x = x1, .y = y1, .width = x2 - x1, .height = y2 - y1},
            });
        }
        return ApplyNms(std::move(detections), profile_.nms_threshold, profile_.max_detections);
    }

    AnalysisProfile profile_;
    Ort::Env env_;
    std::unique_ptr<Ort::Session> session_;
    std::string input_name_;
    std::string output_name_;
    std::vector<std::string> labels_;
};

#else

class YoloOnnxDetector final : public Detector {
public:
    explicit YoloOnnxDetector(AnalysisProfile profile) : profile_(std::move(profile)) {}

    std::string Name() const override {
        return "onnx-yolo-unavailable";
    }

    bool Start(std::string* error_message) override {
        if (error_message != nullptr) {
            *error_message = "YOLO detector requires MEDIA_SERVER_USE_ONNXRUNTIME=ON and ONNX Runtime development files";
        }
        return false;
    }

    bool Analyze(const RawVideoFrame& /*frame*/, AnalysisResult* /*result*/, std::string* error_message) override {
        if (error_message != nullptr) {
            *error_message = "YOLO detector is unavailable in this build";
        }
        return false;
    }

private:
    AnalysisProfile profile_;
};

#endif

}  // namespace

std::unique_ptr<Detector> CreateYoloOnnxDetector(AnalysisProfile profile) {
    return std::make_unique<YoloOnnxDetector>(std::move(profile));
}

}  // namespace analysis
