// 파일 요약: dependency-free application image DTO와 canonical analysis codec 계약을 연결한다.
// 동작 요약: pixel format, frame metadata, raw bytes, JPEG MIME/bytes와 오류를 그대로 보존한다.
#include "ingress/image_codec_application_service.h"

#include "analysis/image_frame_loader.h"
#include "analysis/snapshot_encoder.h"

namespace ingress {
namespace {

ImageCodecPixelFormat ProjectPixelFormat(analysis::PixelFormat format) {
    switch (format) {
        case analysis::PixelFormat::Unknown:
            return ImageCodecPixelFormat::Unknown;
        case analysis::PixelFormat::I420:
            return ImageCodecPixelFormat::I420;
        case analysis::PixelFormat::RGB:
            return ImageCodecPixelFormat::RGB;
        case analysis::PixelFormat::BGR:
            return ImageCodecPixelFormat::BGR;
        case analysis::PixelFormat::Gray8:
            return ImageCodecPixelFormat::Gray8;
    }
    return ImageCodecPixelFormat::Unknown;
}

analysis::PixelFormat RestorePixelFormat(ImageCodecPixelFormat format) {
    switch (format) {
        case ImageCodecPixelFormat::Unknown:
            return analysis::PixelFormat::Unknown;
        case ImageCodecPixelFormat::I420:
            return analysis::PixelFormat::I420;
        case ImageCodecPixelFormat::RGB:
            return analysis::PixelFormat::RGB;
        case ImageCodecPixelFormat::BGR:
            return analysis::PixelFormat::BGR;
        case ImageCodecPixelFormat::Gray8:
            return analysis::PixelFormat::Gray8;
    }
    return analysis::PixelFormat::Unknown;
}

ImageCodecFrame ProjectFrame(analysis::RawVideoFrame frame) {
    ImageCodecFrame projected;
    projected.source_key = std::move(frame.source_key);
    projected.track_id = std::move(frame.track_id);
    projected.width = frame.width;
    projected.height = frame.height;
    projected.format = ProjectPixelFormat(frame.format);
    projected.pts = frame.pts;
    projected.data = std::move(frame.data);
    return projected;
}

analysis::RawVideoFrame RestoreFrame(const ImageCodecFrame& frame) {
    analysis::RawVideoFrame restored;
    restored.source_key = frame.source_key;
    restored.track_id = frame.track_id;
    restored.width = frame.width;
    restored.height = frame.height;
    restored.format = RestorePixelFormat(frame.format);
    restored.pts = frame.pts;
    restored.data = frame.data;
    return restored;
}

}  // namespace

bool DecodeImageForApplication(const std::filesystem::path& image_path,
                               ImageCodecFrame* output,
                               std::string* error_message) {
    if (output == nullptr) {
        return analysis::DecodeImageFileToRawFrame(image_path, nullptr, error_message);
    }
    *output = ImageCodecFrame{};
    analysis::RawVideoFrame decoded;
    if (!analysis::DecodeImageFileToRawFrame(image_path, &decoded, error_message)) {
        return false;
    }
    *output = ProjectFrame(std::move(decoded));
    return true;
}

bool EncodeJpegForApplication(const ImageCodecFrame& frame,
                              int quality,
                              ImageCodecEncodedImage* output,
                              std::string* error_message) {
    const analysis::RawVideoFrame restored = RestoreFrame(frame);
    if (output == nullptr) {
        return analysis::EncodeJpeg(restored, quality, nullptr, error_message);
    }
    *output = ImageCodecEncodedImage{};
    analysis::EncodedImage encoded;
    if (!analysis::EncodeJpeg(restored, quality, &encoded, error_message)) {
        return false;
    }
    output->content_type = std::move(encoded.content_type);
    output->data = std::move(encoded.data);
    return true;
}

}  // namespace ingress
