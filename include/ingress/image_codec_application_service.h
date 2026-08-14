// 파일 요약: HTTP transport와 analysis image codec 사이의 dependency-free application 계약을 선언한다.
// 동작 요약: raw frame의 모든 scalar/byte 필드와 JPEG MIME/bytes를 손실 없이 전달한다.
// 동작 요약: path 승인과 HTTP 응답 정책은 transport에 남기고 decode/encode 호출만 analysis owner에 위임한다.
#pragma once

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace ingress {

enum class ImageCodecPixelFormat {
    Unknown,
    I420,
    RGB,
    BGR,
    Gray8,
};

struct ImageCodecFrame {
    std::string source_key;
    std::string track_id;
    int width{0};
    int height{0};
    ImageCodecPixelFormat format{ImageCodecPixelFormat::Unknown};
    std::int64_t pts{0};
    std::vector<unsigned char> data;
};

struct ImageCodecEncodedImage {
    std::string content_type;
    std::vector<unsigned char> data;
};

bool DecodeImageForApplication(const std::filesystem::path& image_path,
                               ImageCodecFrame* output,
                               std::string* error_message = nullptr);

bool EncodeJpegForApplication(const ImageCodecFrame& frame,
                              int quality,
                              ImageCodecEncodedImage* output,
                              std::string* error_message = nullptr);

}  // namespace ingress
