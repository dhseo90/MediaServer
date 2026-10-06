// 파일 요약: 고정 SigLIP2 image/text 계약의 독립 로컬 encoder이다.
#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace analysis {

class Siglip2Encoder {
public:
    static constexpr std::size_t kEmbeddingDimension = 768;
    static constexpr int kImageSize = 224;
    static constexpr std::size_t kTextLength = 64;
    static constexpr int kMaxImageDimension = 16384;
    static constexpr std::size_t kMaxRgbSpanBytes = 256ULL * 1024 * 1024;
    static constexpr std::size_t kMaxTextBytes = 16 * 1024;
    static constexpr std::size_t kTokenizerBytes = 4241003;
    static constexpr std::size_t kImageOnnxBytes = 371695117;
    static constexpr std::size_t kTextOnnxBytes = 1129352764;
    static constexpr const char* kModelRevision = "75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2";
    static constexpr const char* kWeightsSha256 = "612923381c76ec5a9bed335d1c48827e3f2e506ac31b044b63b2031fadee6a0b";
    static constexpr const char* kTokenizerSha256 = "61a7b147390c64585d6c3543dd6fc636906c9af3865a5548f27f31aee1d4c8e2";
    static constexpr const char* kImageOnnxSha256 = "cca2e4fa86196ebcae3345f4795ccfa3c9910768aac8e2d1f90c43ff518e3cd3";
    static constexpr const char* kTextOnnxSha256 = "b131191ed9673021885c18514d3fc08e04e8c40f603788d21ecb4448d5e9af57";
    static constexpr const char* kPreprocessVersion = "siglip2-rgb-pillow11.3-bilinear-gemma-lower64-v1";

    // model_directory 아래 onnx/{image,text}_encoder.onnx, upstream/tokenizer.model.
    // 오류는 std::runtime_error/invalid_argument로 반환하며 입력 내용을 오류에 넣지 않는다.
    explicit Siglip2Encoder(const std::string& model_directory);
    ~Siglip2Encoder();
    Siglip2Encoder(Siglip2Encoder&&) noexcept;
    Siglip2Encoder& operator=(Siglip2Encoder&&) noexcept;
    Siglip2Encoder(const Siglip2Encoder&) = delete;
    Siglip2Encoder& operator=(const Siglip2Encoder&) = delete;

    std::vector<float> EncodeText(const std::string& text);
    std::vector<float> EncodeRgb(const std::uint8_t* rgb, int width, int height, std::size_t stride);

    struct TextInputInfo {
        std::string original_text, encoder_text;
        std::size_t body_tokens{0};
        bool within_limit{false};
    };
    // 기존 invalid_argument 소비자와 메시지를 유지하면서 검색 입력 오류만 구분한다.
    class TextInputError : public std::invalid_argument {
    public:
        TextInputError(const char* code, const char* message) : std::invalid_argument(message), code_(code) {}
        const char* code() const noexcept { return code_; }
    private:
        const char* code_;
    };
    // EncodeText와 같은 tokenizer를 사용하며 추론 없이 절단 전 정보를 반환한다.
    TextInputInfo InspectText(const std::string& text);

    // 직접 계약 검증용. 입력 버퍼는 (height-1)*stride + width*3 bytes 이상이어야 한다.
    // dimension<=16384, span<=256MiB. 정수 overflow/invalid layout을 거부한다.
    // text는 raw UTF-8<=16KiB이다. frame 버퍼 소유권은 호출자가 유지한다.
    static std::vector<std::uint8_t> ResizeRgb(const std::uint8_t* rgb, int width, int height, std::size_t stride);
    static std::vector<float> PreprocessRgb(const std::uint8_t* rgb, int width, int height, std::size_t stride);
    std::array<std::int64_t, kTextLength> TokenizeText(const std::string& text);

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

}  // namespace analysis
