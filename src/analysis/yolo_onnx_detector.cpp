// 파일 용도: ONNX Runtime 기반 YOLO object detector와 ONNX 미사용 빌드용 stub을 구현한다.
#include "analysis/detector.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <iterator>
#include <numeric>
#include <optional>

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

struct YoloPreprocessInfo {
    int frame_width{0};
    int frame_height{0};
    int input_width{0};
    int input_height{0};
    float scale_x{1.0F};
    float scale_y{1.0F};
    float pad_x{0.0F};
    float pad_y{0.0F};
    bool letterbox{true};
};

std::vector<float> ResizeRgbToNchwStretch(const RawVideoFrame& frame,
                                          int target_width,
                                          int target_height,
                                          YoloPreprocessInfo* info) {
    std::vector<float> tensor(static_cast<std::size_t>(3 * target_width * target_height), 0.0F);
    if (frame.format != PixelFormat::RGB || frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        return tensor;
    }
    if (info != nullptr) {
        info->frame_width = frame.width;
        info->frame_height = frame.height;
        info->input_width = target_width;
        info->input_height = target_height;
        info->scale_x = static_cast<float>(target_width) / static_cast<float>(frame.width);
        info->scale_y = static_cast<float>(target_height) / static_cast<float>(frame.height);
        info->pad_x = 0.0F;
        info->pad_y = 0.0F;
        info->letterbox = false;
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

std::vector<float> ResizeRgbToNchwLetterbox(const RawVideoFrame& frame,
                                            int target_width,
                                            int target_height,
                                            YoloPreprocessInfo* info) {
    constexpr float kYoloPadValue = 114.0F / 255.0F;
    std::vector<float> tensor(static_cast<std::size_t>(3 * target_width * target_height), kYoloPadValue);
    if (frame.format != PixelFormat::RGB || frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        return tensor;
    }

    const float scale = std::min(static_cast<float>(target_width) / static_cast<float>(frame.width),
                                 static_cast<float>(target_height) / static_cast<float>(frame.height));
    const int resized_width = std::max(1, static_cast<int>(std::round(static_cast<float>(frame.width) * scale)));
    const int resized_height = std::max(1, static_cast<int>(std::round(static_cast<float>(frame.height) * scale)));
    const int pad_left = std::max(0, (target_width - resized_width) / 2);
    const int pad_top = std::max(0, (target_height - resized_height) / 2);

    if (info != nullptr) {
        info->frame_width = frame.width;
        info->frame_height = frame.height;
        info->input_width = target_width;
        info->input_height = target_height;
        info->scale_x = scale;
        info->scale_y = scale;
        info->pad_x = static_cast<float>(pad_left);
        info->pad_y = static_cast<float>(pad_top);
        info->letterbox = true;
    }

    for (int y = 0; y < resized_height; ++y) {
        const int src_y =
            std::min(frame.height - 1, static_cast<int>((static_cast<float>(y) + 0.5F) / scale));
        const int dst_y = pad_top + y;
        if (dst_y < 0 || dst_y >= target_height) {
            continue;
        }
        for (int x = 0; x < resized_width; ++x) {
            const int src_x =
                std::min(frame.width - 1, static_cast<int>((static_cast<float>(x) + 0.5F) / scale));
            const int dst_x = pad_left + x;
            if (dst_x < 0 || dst_x >= target_width) {
                continue;
            }
            const std::size_t src_offset = static_cast<std::size_t>((src_y * frame.width + src_x) * 3);
            const std::size_t dst_offset = static_cast<std::size_t>(dst_y * target_width + dst_x);
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

std::vector<float> PreprocessRgbToNchw(const RawVideoFrame& frame,
                                       const AnalysisProfile& profile,
                                       YoloPreprocessInfo* info) {
    if (profile.yolo_preprocess_mode == "stretch") {
        return ResizeRgbToNchwStretch(frame, profile.model_input_width, profile.model_input_height, info);
    }
    return ResizeRgbToNchwLetterbox(frame, profile.model_input_width, profile.model_input_height, info);
}

std::vector<std::uint8_t> ResizeRgbToHwcUint8Stretch(const RawVideoFrame& frame,
                                                     int target_width,
                                                     int target_height,
                                                     YoloPreprocessInfo* info) {
    std::vector<std::uint8_t> tensor(static_cast<std::size_t>(target_width * target_height * 3), 0U);
    if (frame.format != PixelFormat::RGB || frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        return tensor;
    }
    if (info != nullptr) {
        info->frame_width = frame.width;
        info->frame_height = frame.height;
        info->input_width = target_width;
        info->input_height = target_height;
        info->scale_x = static_cast<float>(target_width) / static_cast<float>(frame.width);
        info->scale_y = static_cast<float>(target_height) / static_cast<float>(frame.height);
        info->pad_x = 0.0F;
        info->pad_y = 0.0F;
        info->letterbox = false;
    }

    for (int y = 0; y < target_height; ++y) {
        const int src_y = std::min(frame.height - 1, static_cast<int>((static_cast<float>(y) + 0.5F) * frame.height / target_height));
        for (int x = 0; x < target_width; ++x) {
            const int src_x = std::min(frame.width - 1, static_cast<int>((static_cast<float>(x) + 0.5F) * frame.width / target_width));
            const std::size_t src_offset = static_cast<std::size_t>((src_y * frame.width + src_x) * 3);
            const std::size_t dst_offset = static_cast<std::size_t>((y * target_width + x) * 3);
            if (src_offset + 2 >= frame.data.size() || dst_offset + 2 >= tensor.size()) {
                continue;
            }
            tensor[dst_offset] = frame.data[src_offset];
            tensor[dst_offset + 1] = frame.data[src_offset + 1];
            tensor[dst_offset + 2] = frame.data[src_offset + 2];
        }
    }
    return tensor;
}

std::vector<std::uint8_t> ResizeRgbToHwcUint8Letterbox(const RawVideoFrame& frame,
                                                       int target_width,
                                                       int target_height,
                                                       YoloPreprocessInfo* info) {
    constexpr std::uint8_t kYoloPadValue = 114U;
    std::vector<std::uint8_t> tensor(static_cast<std::size_t>(target_width * target_height * 3), kYoloPadValue);
    if (frame.format != PixelFormat::RGB || frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        return tensor;
    }

    const float scale = std::min(static_cast<float>(target_width) / static_cast<float>(frame.width),
                                 static_cast<float>(target_height) / static_cast<float>(frame.height));
    const int resized_width = std::max(1, static_cast<int>(std::round(static_cast<float>(frame.width) * scale)));
    const int resized_height = std::max(1, static_cast<int>(std::round(static_cast<float>(frame.height) * scale)));
    const int pad_left = std::max(0, (target_width - resized_width) / 2);
    const int pad_top = std::max(0, (target_height - resized_height) / 2);

    if (info != nullptr) {
        info->frame_width = frame.width;
        info->frame_height = frame.height;
        info->input_width = target_width;
        info->input_height = target_height;
        info->scale_x = scale;
        info->scale_y = scale;
        info->pad_x = static_cast<float>(pad_left);
        info->pad_y = static_cast<float>(pad_top);
        info->letterbox = true;
    }

    for (int y = 0; y < resized_height; ++y) {
        const int src_y =
            std::min(frame.height - 1, static_cast<int>((static_cast<float>(y) + 0.5F) / scale));
        const int dst_y = pad_top + y;
        if (dst_y < 0 || dst_y >= target_height) {
            continue;
        }
        for (int x = 0; x < resized_width; ++x) {
            const int src_x =
                std::min(frame.width - 1, static_cast<int>((static_cast<float>(x) + 0.5F) / scale));
            const int dst_x = pad_left + x;
            if (dst_x < 0 || dst_x >= target_width) {
                continue;
            }
            const std::size_t src_offset = static_cast<std::size_t>((src_y * frame.width + src_x) * 3);
            const std::size_t dst_offset = static_cast<std::size_t>((dst_y * target_width + dst_x) * 3);
            if (src_offset + 2 >= frame.data.size() || dst_offset + 2 >= tensor.size()) {
                continue;
            }
            tensor[dst_offset] = frame.data[src_offset];
            tensor[dst_offset + 1] = frame.data[src_offset + 1];
            tensor[dst_offset + 2] = frame.data[src_offset + 2];
        }
    }
    return tensor;
}

std::vector<std::uint8_t> PreprocessRgbToHwcUint8(const RawVideoFrame& frame,
                                                  const AnalysisProfile& profile,
                                                  YoloPreprocessInfo* info) {
    if (profile.yolo_preprocess_mode == "stretch") {
        return ResizeRgbToHwcUint8Stretch(frame, profile.model_input_width, profile.model_input_height, info);
    }
    return ResizeRgbToHwcUint8Letterbox(frame, profile.model_input_width, profile.model_input_height, info);
}

std::optional<RectF> MapYoloBoxToFrame(float cx,
                                       float cy,
                                       float width,
                                       float height,
                                       bool normalized,
                                       const YoloPreprocessInfo& info) {
    if (info.frame_width <= 0 || info.frame_height <= 0 || info.input_width <= 0 || info.input_height <= 0) {
        return std::nullopt;
    }

    if (normalized) {
        cx *= static_cast<float>(info.input_width);
        width *= static_cast<float>(info.input_width);
        cy *= static_cast<float>(info.input_height);
        height *= static_cast<float>(info.input_height);
    }

    const float input_x1 = cx - width * 0.5F;
    const float input_y1 = cy - height * 0.5F;
    const float input_x2 = cx + width * 0.5F;
    const float input_y2 = cy + height * 0.5F;
    const float x_scale = std::max(0.0001F, info.scale_x);
    const float y_scale = std::max(0.0001F, info.scale_y);
    const float frame_x1 = (input_x1 - info.pad_x) / x_scale;
    const float frame_y1 = (input_y1 - info.pad_y) / y_scale;
    const float frame_x2 = (input_x2 - info.pad_x) / x_scale;
    const float frame_y2 = (input_y2 - info.pad_y) / y_scale;

    const float clamped_x1 = std::max(0.0F, std::min(static_cast<float>(info.frame_width), frame_x1));
    const float clamped_y1 = std::max(0.0F, std::min(static_cast<float>(info.frame_height), frame_y1));
    const float clamped_x2 = std::max(0.0F, std::min(static_cast<float>(info.frame_width), frame_x2));
    const float clamped_y2 = std::max(0.0F, std::min(static_cast<float>(info.frame_height), frame_y2));
    if (clamped_x2 <= clamped_x1 || clamped_y2 <= clamped_y1) {
        return std::nullopt;
    }

    const float inv_frame_w = 1.0F / static_cast<float>(info.frame_width);
    const float inv_frame_h = 1.0F / static_cast<float>(info.frame_height);
    return RectF{
        .x = Clamp01(clamped_x1 * inv_frame_w),
        .y = Clamp01(clamped_y1 * inv_frame_h),
        .width = Clamp01((clamped_x2 - clamped_x1) * inv_frame_w),
        .height = Clamp01((clamped_y2 - clamped_y1) * inv_frame_h),
    };
}

std::optional<RectF> MapYoloCornersToFrame(float x1,
                                           float y1,
                                           float x2,
                                           float y2,
                                           bool normalized,
                                           const YoloPreprocessInfo& info) {
    if (info.frame_width <= 0 || info.frame_height <= 0 || info.input_width <= 0 || info.input_height <= 0) {
        return std::nullopt;
    }

    if (normalized) {
        x1 *= static_cast<float>(info.input_width);
        x2 *= static_cast<float>(info.input_width);
        y1 *= static_cast<float>(info.input_height);
        y2 *= static_cast<float>(info.input_height);
    }

    if (x2 < x1) {
        std::swap(x1, x2);
    }
    if (y2 < y1) {
        std::swap(y1, y2);
    }

    const float x_scale = std::max(0.0001F, info.scale_x);
    const float y_scale = std::max(0.0001F, info.scale_y);
    const float frame_x1 = (x1 - info.pad_x) / x_scale;
    const float frame_y1 = (y1 - info.pad_y) / y_scale;
    const float frame_x2 = (x2 - info.pad_x) / x_scale;
    const float frame_y2 = (y2 - info.pad_y) / y_scale;

    const float clamped_x1 = std::max(0.0F, std::min(static_cast<float>(info.frame_width), frame_x1));
    const float clamped_y1 = std::max(0.0F, std::min(static_cast<float>(info.frame_height), frame_y1));
    const float clamped_x2 = std::max(0.0F, std::min(static_cast<float>(info.frame_width), frame_x2));
    const float clamped_y2 = std::max(0.0F, std::min(static_cast<float>(info.frame_height), frame_y2));
    if (clamped_x2 <= clamped_x1 || clamped_y2 <= clamped_y1) {
        return std::nullopt;
    }

    const float inv_frame_w = 1.0F / static_cast<float>(info.frame_width);
    const float inv_frame_h = 1.0F / static_cast<float>(info.frame_height);
    return RectF{
        .x = Clamp01(clamped_x1 * inv_frame_w),
        .y = Clamp01(clamped_y1 * inv_frame_h),
        .width = Clamp01((clamped_x2 - clamped_x1) * inv_frame_w),
        .height = Clamp01((clamped_y2 - clamped_y1) * inv_frame_h),
    };
}

#if MEDIA_SERVER_USE_ONNXRUNTIME

bool IsSupportedYoloTensorType(ONNXTensorElementDataType type) {
    return type == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT || type == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT16;
}

bool IsSupportedYoloInputTensorType(ONNXTensorElementDataType type) {
    return IsSupportedYoloTensorType(type) || type == ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8;
}

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
            const auto input_info = session_->GetInputTypeInfo(0);
            auto input_shape_info = input_info.GetTensorTypeAndShapeInfo();
            input_element_type_ = input_shape_info.GetElementType();
            input_shape_ = input_shape_info.GetShape();
            const auto output_info = session_->GetOutputTypeInfo(0);
            output_element_type_ = output_info.GetTensorTypeAndShapeInfo().GetElementType();
            input_hwc_uint8_ = input_element_type_ == ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8 &&
                               input_shape_.size() == 3 && input_shape_[2] == 3;
            if (!IsSupportedYoloInputTensorType(input_element_type_) ||
                !IsSupportedYoloTensorType(output_element_type_) ||
                (input_element_type_ == ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8 && !input_hwc_uint8_)) {
                if (error_message != nullptr) {
                    *error_message = "YOLO detector supports fp32/fp16 NCHW models and uint8 HWC models only";
                }
                session_.reset();
                return false;
            }
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

    bool UpdateProfile(const AnalysisProfile& profile, std::string* error_message) override {
        profile_ = profile;
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
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
            YoloPreprocessInfo preprocess_info;
            Ort::MemoryInfo memory_info = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
            std::vector<float> input;
            std::vector<Ort::Float16_t> input_fp16;
            std::vector<std::uint8_t> input_uint8;
            std::optional<Ort::Value> input_tensor_holder;
            if (input_hwc_uint8_) {
                input_uint8 = PreprocessRgbToHwcUint8(frame, profile_, &preprocess_info);
                std::array<std::int64_t, 3> shape = {profile_.model_input_height, profile_.model_input_width, 3};
                input_tensor_holder.emplace(Ort::Value::CreateTensor<std::uint8_t>(
                    memory_info, input_uint8.data(), input_uint8.size(), shape.data(), shape.size()));
            } else if (input_element_type_ == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT16) {
                input = PreprocessRgbToNchw(frame, profile_, &preprocess_info);
                std::array<std::int64_t, 4> shape = {1, 3, profile_.model_input_height, profile_.model_input_width};
                input_fp16.reserve(input.size());
                std::transform(input.begin(), input.end(), std::back_inserter(input_fp16), [](float value) {
                    return Ort::Float16_t(value);
                });
                input_tensor_holder.emplace(Ort::Value::CreateTensor<Ort::Float16_t>(
                    memory_info, input_fp16.data(), input_fp16.size(), shape.data(), shape.size()));
            } else {
                input = PreprocessRgbToNchw(frame, profile_, &preprocess_info);
                std::array<std::int64_t, 4> shape = {1, 3, profile_.model_input_height, profile_.model_input_width};
                input_tensor_holder.emplace(Ort::Value::CreateTensor<float>(
                    memory_info, input.data(), input.size(), shape.data(), shape.size()));
            }
            const char* input_names[] = {input_name_.c_str()};
            const char* output_names[] = {output_name_.c_str()};
            auto outputs =
                session_->Run(Ort::RunOptions{nullptr}, input_names, &*input_tensor_holder, 1, output_names, 1);
            if (outputs.empty() || !outputs.front().IsTensor()) {
                if (error_message != nullptr) {
                    *error_message = "YOLO detector output is not a tensor";
                }
                return false;
            }

            result->source_key = frame.source_key;
            result->pts = frame.pts;
            result->detections = ParseOutput(outputs.front(), preprocess_info);
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
    std::vector<Detection> ParseOutput(Ort::Value& output, const YoloPreprocessInfo& preprocess_info) const {
        auto type_info = output.GetTensorTypeAndShapeInfo();
        const ONNXTensorElementDataType output_type = type_info.GetElementType();
        if (!IsSupportedYoloTensorType(output_type)) {
            return {};
        }
        const std::vector<std::int64_t> shape = type_info.GetShape();
        const float* data_fp32 = output_type == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT ? output.GetTensorData<float>()
                                                                                    : nullptr;
        const Ort::Float16_t* data_fp16 =
            output_type == ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT16 ? output.GetTensorData<Ort::Float16_t>() : nullptr;
        if ((data_fp32 == nullptr && data_fp16 == nullptr) || shape.size() < 2) {
            return {};
        }

        std::int64_t candidates = 0;
        std::int64_t attrs = 0;
        bool channels_first = false;
        if (shape.size() == 2) {
            candidates = shape[0];
            attrs = shape[1];
        } else if (shape[0] != 1) {
            return {};
        } else if (profile_.yolo_output_layout == "channels-first") {
            attrs = shape[1];
            candidates = shape[2];
            channels_first = true;
        } else if (profile_.yolo_output_layout == "channels-last") {
            candidates = shape[1];
            attrs = shape[2];
        } else if (shape[1] > 0 && shape[2] > 0 && shape[1] < shape[2]) {
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

        const bool score_class_mode = profile_.yolo_score_mode == "score-class";
        const bool class_score_mode = profile_.yolo_score_mode == "class-score";
        bool has_objectness = profile_.yolo_has_objectness || attrs == 85;
        if (profile_.yolo_score_mode == "class-only") {
            has_objectness = false;
        } else if (profile_.yolo_score_mode == "objectness-class") {
            has_objectness = true;
        }
        const std::int64_t class_offset = has_objectness ? 5 : 4;
        const std::int64_t class_count = attrs - class_offset;
        if (!score_class_mode && !class_score_mode && class_count <= 0) {
            return {};
        }

        auto at = [&](std::int64_t candidate, std::int64_t attr) -> float {
            std::int64_t index = 0;
            if (channels_first) {
                index = attr * candidates + candidate;
            } else {
                index = candidate * attrs + attr;
            }
            if (data_fp32 != nullptr) {
                return data_fp32[index];
            }
            return static_cast<float>(data_fp16[index]);
        };

        std::vector<Detection> detections;
        for (std::int64_t i = 0; i < candidates; ++i) {
            int best_class = -1;
            float score = 0.0F;
            if (score_class_mode) {
                score = at(i, 4);
                best_class = static_cast<int>(std::round(at(i, 5)));
            } else if (class_score_mode) {
                best_class = static_cast<int>(std::round(at(i, 4)));
                score = at(i, 5);
            } else {
                float best_class_score = 0.0F;
                for (std::int64_t cls = 0; cls < class_count; ++cls) {
                    const float class_score = at(i, class_offset + cls);
                    if (class_score > best_class_score) {
                        best_class_score = class_score;
                        best_class = static_cast<int>(cls);
                    }
                }
                const float objectness = has_objectness ? at(i, 4) : 1.0F;
                score = objectness * best_class_score;
            }
            if (best_class < 0 || score < profile_.confidence_threshold) {
                continue;
            }

            const float b0 = at(i, 0);
            const float b1 = at(i, 1);
            const float b2 = at(i, 2);
            const float b3 = at(i, 3);
            const bool normalized = std::max({std::fabs(b0), std::fabs(b1), std::fabs(b2), std::fabs(b3)}) <= 2.0F;
            const auto box = profile_.yolo_box_format == "xyxy"
                                 ? MapYoloCornersToFrame(b0, b1, b2, b3, normalized, preprocess_info)
                                 : MapYoloBoxToFrame(b0, b1, b2, b3, normalized, preprocess_info);
            if (!box.has_value()) {
                continue;
            }

            detections.push_back(Detection{
                .class_id = best_class,
                .label = LabelForClass(labels_, best_class),
                .score = score,
                .box = *box,
            });
        }
        return ApplyNms(std::move(detections), profile_.nms_threshold, profile_.max_detections);
    }

    AnalysisProfile profile_;
    Ort::Env env_;
    std::unique_ptr<Ort::Session> session_;
    std::string input_name_;
    std::string output_name_;
    ONNXTensorElementDataType input_element_type_{ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT};
    ONNXTensorElementDataType output_element_type_{ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT};
    std::vector<std::int64_t> input_shape_;
    bool input_hwc_uint8_{false};
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

    bool UpdateProfile(const AnalysisProfile& profile, std::string* error_message) override {
        profile_ = profile;
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
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
