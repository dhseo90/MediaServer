// 파일 요약: SigLIP2 전처리·토큰화·CPU ONNX 추론. 미사용 빌드는 명확한 disabled 오류이다.
#include "analysis/siglip2_encoder.h"

#include <algorithm>
#include <cerrno>
#include <cstdlib>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <limits>
#include <mutex>
#include <stdexcept>
#include <utility>

#ifndef MEDIA_SERVER_USE_SIGLIP2
#define MEDIA_SERVER_USE_SIGLIP2 0
#endif
#if MEDIA_SERVER_USE_SIGLIP2
#include <glib.h>
#include <onnxruntime_cxx_api.h>
#include <sentencepiece_processor.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif
#ifndef MEDIA_SERVER_SIGLIP2_TEST_IO
#define MEDIA_SERVER_SIGLIP2_TEST_IO 0
#endif
#ifndef MEDIA_SERVER_SIGLIP2_RESOURCE_DIAGNOSTICS
#define MEDIA_SERVER_SIGLIP2_RESOURCE_DIAGNOSTICS 0
#endif
#if MEDIA_SERVER_USE_SIGLIP2 && MEDIA_SERVER_SIGLIP2_RESOURCE_DIAGNOSTICS
#include <chrono>
#include <cstdio>
#include <sys/resource.h>
#if defined(__APPLE__)
#include <mach/mach.h>
#else
#include <unistd.h>
#endif
#endif

namespace analysis {
namespace {

constexpr std::int64_t kCoefficientScale = 1LL << 22;

void Diagnostic(const char* stage) {
#if MEDIA_SERVER_USE_SIGLIP2 && MEDIA_SERVER_SIGLIP2_RESOURCE_DIAGNOSTICS
    rusage usage{};
    if (getrusage(RUSAGE_SELF, &usage) != 0) return;
    std::uint64_t current = 0;
#if defined(__APPLE__)
    mach_task_basic_info_data_t info{};
    mach_msg_type_number_t count = MACH_TASK_BASIC_INFO_COUNT;
    const bool available = task_info(mach_task_self(), MACH_TASK_BASIC_INFO,
                                    reinterpret_cast<task_info_t>(&info), &count) == KERN_SUCCESS;
    if (available) current = info.resident_size;
    const auto peak = static_cast<std::uint64_t>(usage.ru_maxrss);
#else
    std::ifstream file("/proc/self/statm");
    std::uint64_t pages = 0, resident = 0;
    const auto page_size = sysconf(_SC_PAGESIZE);
    const bool available = static_cast<bool>(file >> pages >> resident) && page_size > 0;
    if (available) current = resident * static_cast<std::uint64_t>(page_size);
    const auto peak = static_cast<std::uint64_t>(usage.ru_maxrss) * 1024;
#endif
    const auto utc = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    std::fprintf(stderr, "LOAD_RESOURCE {\"stage\":\"%s\",\"utc_unix_ms\":%lld,\"current_rss_available\":%s,\"current_rss_bytes\":%llu,\"peak_rss_bytes\":%llu}\n",
                 stage, static_cast<long long>(utc), available ? "true" : "false",
                 static_cast<unsigned long long>(current), static_cast<unsigned long long>(peak));
#else
    (void)stage;
#endif
}

std::size_t CheckedMultiply(std::size_t a, std::size_t b) {
    if (b != 0 && a > std::numeric_limits<std::size_t>::max() / b) {
        throw std::invalid_argument("SigLIP2 RGB layout overflows address space");
    }
    return a * b;
}

void ValidateRgb(const std::uint8_t* rgb, int width, int height, std::size_t stride) {
    if (!rgb || width <= 0 || height <= 0) {
        throw std::invalid_argument("SigLIP2 requires non-null RGB and positive dimensions");
    }
    if (width > Siglip2Encoder::kMaxImageDimension || height > Siglip2Encoder::kMaxImageDimension) {
        throw std::invalid_argument("SigLIP2 RGB dimensions exceed the input limit");
    }
    const auto row = CheckedMultiply(static_cast<std::size_t>(width), 3);
    if (stride < row) throw std::invalid_argument("SigLIP2 RGB stride is shorter than the row");
    const auto offset = CheckedMultiply(static_cast<std::size_t>(height - 1), stride);
    if (offset > std::numeric_limits<std::size_t>::max() - row ||
        offset + row > static_cast<std::size_t>(std::numeric_limits<std::ptrdiff_t>::max())) {
        throw std::invalid_argument("SigLIP2 RGB layout overflows address space");
    }
    if (offset + row > Siglip2Encoder::kMaxRgbSpanBytes) {
        throw std::invalid_argument("SigLIP2 RGB span exceeds the input limit");
    }
    CheckedMultiply(static_cast<std::size_t>(height), Siglip2Encoder::kImageSize * 3);
}

struct FilterRow {
    int first;
    std::vector<std::int32_t> weights;
};

// Pillow 11.3 RGB BILINEAR와의 독립적인 호환 구현이다.
// 참조: src/libImaging/Resample.c (Pillow/MIT-CMU); Pillow 소스를 컴파일하거나 링크하지 않는다.
// 반 픽셀 중심, 축소 비율에 따른 삼각 필터 확장, 경계 자르기와 정규화를 적용한다.
// 22비트 계수와 uint8 가로·세로 각 단계 뒤 반올림을 사용한다.
std::vector<FilterRow> Filters(int input_size) {
    const double scale = static_cast<double>(static_cast<float>(input_size)) / Siglip2Encoder::kImageSize;
    const double support = std::max(1.0, scale);
    std::vector<FilterRow> filters;
    filters.reserve(Siglip2Encoder::kImageSize);
    for (int out = 0; out < Siglip2Encoder::kImageSize; ++out) {
        const double center = (out + 0.5) * scale;
        const double lower = std::max(0.0, center - support + 0.5);
        const double upper = std::min(static_cast<double>(input_size), center + support + 0.5);
        const int first = static_cast<int>(lower);
        const int last = static_cast<int>(upper);
        FilterRow row{first, {}};
        std::vector<double> weights;
        double sum = 0;
        for (int index = first; index < last; ++index) {
            const double distance = std::abs((index - center + 0.5) / support);
            const double weight = distance < 1.0 ? 1.0 - distance : 0.0;
            weights.push_back(weight);
            sum += weight;
        }
        if (sum <= 0) throw std::runtime_error("SigLIP2 resize produced an empty filter");
        for (const auto weight : weights) {
            row.weights.push_back(static_cast<std::int32_t>(0.5 + weight / sum * kCoefficientScale));
        }
        filters.push_back(std::move(row));
    }
    return filters;
}

std::uint8_t Quantize(std::int64_t sum) {
    return static_cast<std::uint8_t>(std::clamp<std::int64_t>(sum >> 22, 0, 255));
}

#if !MEDIA_SERVER_USE_SIGLIP2
[[noreturn]] void Disabled() {
    throw std::runtime_error("SigLIP2 encoder is disabled in this build");
}
#else
std::vector<std::uint8_t> VerifiedBytes(const std::filesystem::path& path, std::size_t size,
                                       const char* expected_digest) {
    std::error_code error;
    if (!std::filesystem::is_regular_file(path, error) || error ||
        std::filesystem::file_size(path, error) != size || error) {
        throw std::runtime_error("SigLIP2 asset is missing or has an invalid size");
    }
    std::ifstream file(path, std::ios::binary);
    if (!file) throw std::runtime_error("SigLIP2 asset read failed");
    std::vector<std::uint8_t> bytes(size);
    file.read(reinterpret_cast<char*>(bytes.data()), static_cast<std::streamsize>(size));
    if (file.gcount() != static_cast<std::streamsize>(size) || file.peek() != std::char_traits<char>::eof()) {
        throw std::runtime_error("SigLIP2 asset changed while reading");
    }
    gchar* digest = g_compute_checksum_for_data(G_CHECKSUM_SHA256, bytes.data(), bytes.size());
    if (!digest) throw std::runtime_error("SigLIP2 asset checksum failed");
    const bool matches = std::string(digest) == expected_digest;
    g_free(digest);
    if (!matches) throw std::runtime_error("SigLIP2 asset SHA256 mismatch");
    return bytes;
}

class ScopedFd {
public:
    explicit ScopedFd(int value) : value_(value) {}
    ~ScopedFd() { if (value_ >= 0) ::close(value_); }
    ScopedFd(const ScopedFd&) = delete;
    ScopedFd& operator=(const ScopedFd&) = delete;
    int Get() const { return value_; }
    void Close() {
        const int value = std::exchange(value_, -1);
        if (value >= 0 && ::close(value) != 0) throw std::runtime_error("SigLIP2 asset descriptor close failed");
    }
private:
    int value_;
};

// 생성 후 오류 경로에서도 소유 FD만 남는 비공개 inode를 사용한다.
// 고정 크기와 SHA 검증 후 원본 경로를 다시 열지 않는다.
class VerifiedTemporaryFile {
public:
    VerifiedTemporaryFile(const std::filesystem::path& path, std::size_t size, const char* digest) {
        try {
            std::error_code error;
            const auto base = std::filesystem::temp_directory_path(error);
            if (error) throw std::runtime_error("SigLIP2 temporary directory unavailable");
            const auto pattern = (base / "media-server-siglip2-XXXXXX").string();
            std::vector<char> directory(pattern.begin(), pattern.end()); directory.push_back(0);
            if (!::mkdtemp(directory.data())) throw std::runtime_error("SigLIP2 private temporary directory failed");
            directory_ = directory.data();
            struct stat info{};
            if (::lstat(directory_.c_str(), &info) != 0 || !S_ISDIR(info.st_mode) ||
                info.st_uid != ::getuid() || (info.st_mode & 0777) != 0700) {
                throw std::runtime_error("SigLIP2 temporary directory ownership mismatch");
            }
            const auto file_pattern = directory_ + "/model-XXXXXX";
            std::vector<char> name(file_pattern.begin(), file_pattern.end()); name.push_back(0);
            fd_ = ::mkstemp(name.data());
            if (fd_ < 0) throw std::runtime_error("SigLIP2 private temporary file failed");
            pathname_ = name.data();
            if (::fcntl(fd_, F_SETFD, FD_CLOEXEC) != 0 || ::fchmod(fd_, 0600) != 0 ||
                ::fstat(fd_, &info) != 0 || !S_ISREG(info.st_mode) || info.st_uid != ::getuid() ||
                (info.st_mode & 0777) != 0600) {
                throw std::runtime_error("SigLIP2 temporary file ownership mismatch");
            }
            if (::unlink(pathname_.c_str()) != 0) throw std::runtime_error("SigLIP2 temporary file unlink failed");
            pathname_.clear();
            if (::rmdir(directory_.c_str()) != 0) throw std::runtime_error("SigLIP2 temporary directory removal failed");
            directory_.clear();
            CopyVerified(path, size, digest);
        } catch (...) { Cleanup(); throw; }
    }
    ~VerifiedTemporaryFile() { Cleanup(); }
    VerifiedTemporaryFile(const VerifiedTemporaryFile&) = delete;
    VerifiedTemporaryFile& operator=(const VerifiedTemporaryFile&) = delete;
    std::string DescriptorPath() const {
#if defined(__APPLE__)
        return "/dev/fd/" + std::to_string(fd_);
#else
        return "/proc/self/fd/" + std::to_string(fd_);
#endif
    }
    void Close() {
        const int value = std::exchange(fd_, -1);
        if (value >= 0 && ::close(value) != 0) throw std::runtime_error("SigLIP2 temporary descriptor close failed");
    }
private:
    int fd_ = -1;
    std::string directory_, pathname_;
    void Cleanup() noexcept {
        if (fd_ >= 0) { ::close(fd_); fd_ = -1; }
        if (!pathname_.empty()) { ::unlink(pathname_.c_str()); pathname_.clear(); }
        if (!directory_.empty()) { ::rmdir(directory_.c_str()); directory_.clear(); }
    }
    void CopyVerified(const std::filesystem::path& path, std::size_t size, const char* expected) {
        ScopedFd source(::open(path.c_str(), O_RDONLY | O_CLOEXEC));
        struct stat info{};
        if (source.Get() < 0 || ::fstat(source.Get(), &info) != 0 || !S_ISREG(info.st_mode) ||
            info.st_size < 0 || static_cast<std::uint64_t>(info.st_size) != size) {
            throw std::runtime_error("SigLIP2 asset is missing or has an invalid size");
        }
        std::unique_ptr<GChecksum, decltype(&g_checksum_free)> hash(g_checksum_new(G_CHECKSUM_SHA256), g_checksum_free);
        if (!hash) throw std::runtime_error("SigLIP2 asset checksum failed");
        std::vector<std::uint8_t> buffer(1024 * 1024);
#if MEDIA_SERVER_SIGLIP2_TEST_IO
        const char* requested = std::getenv("MEDIA_SERVER_SIGLIP2_IO_FAULT");
        const std::string fault = requested ? requested : "";
        bool read_interrupted = false, write_interrupted = false;
#endif
        std::size_t copied = 0;
        while (copied < size) {
            ssize_t amount;
            do {
#if MEDIA_SERVER_SIGLIP2_TEST_IO
                if (fault == "eintr" && !read_interrupted) { read_interrupted = true; errno = EINTR; amount = -1; }
                else
#endif
                amount = ::read(source.Get(), buffer.data(), std::min(buffer.size(), size - copied));
            } while (amount < 0 && errno == EINTR);
            if (amount <= 0) throw std::runtime_error("SigLIP2 asset stream read failed");
            g_checksum_update(hash.get(), buffer.data(), static_cast<gssize>(amount));
            std::size_t written = 0;
            while (written < static_cast<std::size_t>(amount)) {
                ssize_t result;
                do {
#if MEDIA_SERVER_SIGLIP2_TEST_IO
                    if (fault == "eintr" && !write_interrupted) { write_interrupted = true; errno = EINTR; result = -1; }
                    else if (fault == "no_space") { errno = ENOSPC; result = -1; }
                    else if (fault == "short_write") result = ::write(fd_, buffer.data() + written,
                            std::min<std::size_t>(4096, static_cast<std::size_t>(amount) - written));
                    else
#endif
                    result = ::write(fd_, buffer.data() + written, static_cast<std::size_t>(amount) - written);
                } while (result < 0 && errno == EINTR);
                if (result <= 0) throw std::runtime_error("SigLIP2 asset temporary write failed");
                written += static_cast<std::size_t>(result);
            }
            copied += static_cast<std::size_t>(amount);
        }
        std::uint8_t extra = 0;
        ssize_t tail;
        do { tail = ::read(source.Get(), &extra, 1); } while (tail < 0 && errno == EINTR);
        if (tail != 0) throw std::runtime_error("SigLIP2 asset changed while reading");
        if (std::string(g_checksum_get_string(hash.get())) != expected) throw std::runtime_error("SigLIP2 asset SHA256 mismatch");
        if (::fstat(fd_, &info) != 0 || static_cast<std::uint64_t>(info.st_size) != size ||
            ::lseek(fd_, 0, SEEK_SET) != 0) throw std::runtime_error("SigLIP2 temporary asset seek/size failed");
        source.Close();
    }
};
#endif

}  // namespace

std::vector<std::uint8_t> Siglip2Encoder::ResizeRgb(const std::uint8_t* rgb, int width, int height,
                                                  std::size_t stride) {
    ValidateRgb(rgb, width, height, stride);
    constexpr int target = kImageSize;
    const auto horizontal = Filters(width);
    const auto vertical = Filters(height);
    std::vector<std::uint8_t> intermediate(CheckedMultiply(static_cast<std::size_t>(height), target * 3));
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < target; ++x) {
            for (int c = 0; c < 3; ++c) {
                auto sum = kCoefficientScale / 2;
                if (width == target) {
                    intermediate[(static_cast<std::size_t>(y) * target + x) * 3 + c] =
                        rgb[static_cast<std::size_t>(y) * stride + x * 3 + c];
                    continue;
                }
                const auto& row = horizontal[x];
                for (std::size_t i = 0; i < row.weights.size(); ++i) {
                    sum += rgb[static_cast<std::size_t>(y) * stride +
                               (static_cast<std::size_t>(row.first) + i) * 3 + c] * row.weights[i];
                }
                intermediate[(static_cast<std::size_t>(y) * target + x) * 3 + c] = Quantize(sum);
            }
        }
    }
    std::vector<std::uint8_t> result(target * target * 3);
    for (int y = 0; y < target; ++y) {
        for (int x = 0; x < target; ++x) {
            for (int c = 0; c < 3; ++c) {
                auto sum = kCoefficientScale / 2;
                if (height == target) {
                    result[(y * target + x) * 3 + c] = intermediate[(y * target + x) * 3 + c];
                    continue;
                }
                const auto& row = vertical[y];
                for (std::size_t i = 0; i < row.weights.size(); ++i) {
                    sum += intermediate[((static_cast<std::size_t>(row.first) + i) * target + x) * 3 + c] * row.weights[i];
                }
                result[(y * target + x) * 3 + c] = Quantize(sum);
            }
        }
    }
    return result;
}

std::vector<float> Siglip2Encoder::PreprocessRgb(const std::uint8_t* rgb, int width, int height,
                                               std::size_t stride) {
    const auto resized = ResizeRgb(rgb, width, height, stride);
    constexpr std::size_t plane = kImageSize * kImageSize;
    std::vector<float> result(plane * 3);
    for (std::size_t pixel = 0; pixel < plane; ++pixel) {
        for (std::size_t c = 0; c < 3; ++c) {
            result[c * plane + pixel] = (static_cast<float>(resized[pixel * 3 + c]) / 255.0f - 0.5f) / 0.5f;
        }
    }
    return result;
}

#if MEDIA_SERVER_USE_SIGLIP2
struct Siglip2Encoder::Impl {
    Ort::Env env{ORT_LOGGING_LEVEL_FATAL, "siglip2"};
    std::unique_ptr<Ort::Session> image;
    std::unique_ptr<Ort::Session> text;
    sentencepiece::SentencePieceProcessor tokenizer;
    std::mutex mutex;

    explicit Impl(const std::string& directory) {
        Diagnostic("initial");
        const auto root = std::filesystem::path(directory);
        const auto token_path = root / "upstream/tokenizer.model";
        {
            const auto bytes = VerifiedBytes(token_path, kTokenizerBytes, kTokenizerSha256);
            Diagnostic("sp_hash");
            const absl::string_view serialized(reinterpret_cast<const char*>(bytes.data()), bytes.size());
            if (!tokenizer.LoadFromSerializedProto(serialized).ok()) {
                throw std::runtime_error("SigLIP2 tokenizer is invalid");
            }
            Diagnostic("sp_loaded");
        }
        Diagnostic("sp_buffer_free");
        Ort::SessionOptions options;
        options.SetIntraOpNumThreads(1);
        options.SetInterOpNumThreads(1);
        options.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_EXTENDED);
        {
            VerifiedTemporaryFile bytes(root / "onnx/image_encoder.onnx", kImageOnnxBytes, kImageOnnxSha256);
            Diagnostic("image_hash");
            try { image = std::make_unique<Ort::Session>(env, bytes.DescriptorPath().c_str(), options); }
            catch (const Ort::Exception&) { throw std::runtime_error("SigLIP2 image model is invalid"); }
            Diagnostic("image_ort");
            bytes.Close();
        }
        Diagnostic("image_fd_closed");
        {
            VerifiedTemporaryFile bytes(root / "onnx/text_encoder.onnx", kTextOnnxBytes, kTextOnnxSha256);
            Diagnostic("text_hash");
            try { text = std::make_unique<Ort::Session>(env, bytes.DescriptorPath().c_str(), options); }
            catch (const Ort::Exception&) { throw std::runtime_error("SigLIP2 text model is invalid"); }
            Diagnostic("text_ort");
            bytes.Close();
        }
        Diagnostic("text_fd_closed");
        Validate(*image, "pixel_values", ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT, {1, 3, 224, 224});
        Validate(*text, "input_ids", ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64, {1, 64});
    }

    static void Validate(Ort::Session& session, const char* name, ONNXTensorElementDataType type,
                         const std::vector<std::int64_t>& shape) {
        if (session.GetInputCount() != 1 || session.GetOutputCount() != 1) {
            throw std::runtime_error("SigLIP2 ONNX input/output contract mismatch");
        }
        Ort::AllocatorWithDefaultOptions allocator;
        auto input_name = session.GetInputNameAllocated(0, allocator);
        auto output_name = session.GetOutputNameAllocated(0, allocator);
        const auto input_type = session.GetInputTypeInfo(0);
        const auto output_type = session.GetOutputTypeInfo(0);
        const auto input = input_type.GetTensorTypeAndShapeInfo();
        const auto output = output_type.GetTensorTypeAndShapeInfo();
        if (std::string(input_name.get()) != name || std::string(output_name.get()) != "embedding" ||
            input.GetElementType() != type || input.GetShape() != shape ||
            output.GetElementType() != ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT ||
            output.GetShape() != std::vector<std::int64_t>{1, 768}) {
            throw std::runtime_error("SigLIP2 ONNX shape/type/name contract mismatch");
        }
    }

    std::array<std::int64_t, kTextLength> Tokens(const std::string& value) {
        if (value.size() > kMaxTextBytes) throw std::invalid_argument("SigLIP2 text exceeds the input limit");
        if (value.size() > static_cast<std::size_t>(std::numeric_limits<gssize>::max()) ||
            value.find('\0') != std::string::npos || !g_utf8_validate(value.data(), value.size(), nullptr)) {
            throw std::invalid_argument("SigLIP2 text must be valid UTF-8 without NUL");
        }
        bool content = false;
        for (const char* current = value.c_str(); *current; current = g_utf8_next_char(current)) {
            if (!g_unichar_isspace(g_utf8_get_char(current))) { content = true; break; }
        }
        if (!content) throw std::invalid_argument("SigLIP2 text query is empty");
        gchar* lower = g_utf8_strdown(value.data(), value.size());
        if (!lower) throw std::runtime_error("SigLIP2 lowercase failed");
        const std::string normalized(lower);
        g_free(lower);
        std::vector<int> content_ids;
        if (!tokenizer.Encode(normalized, &content_ids).ok()) throw std::runtime_error("SigLIP2 tokenization failed");
        std::array<std::int64_t, kTextLength> ids{};
        const auto count = std::min(content_ids.size(), kTextLength - 1);
        for (std::size_t i = 0; i < count; ++i) ids[i] = content_ids[i];
        ids[count] = 1;
        return ids;
    }

    static std::vector<float> Infer(Ort::Session& session, const char* name, Ort::Value& input) {
        const char* names[] = {name};
        const char* outputs[] = {"embedding"};
        std::vector<Ort::Value> output;
        try { output = session.Run(Ort::RunOptions{nullptr}, names, &input, 1, outputs, 1); }
        catch (const Ort::Exception&) { throw std::runtime_error("SigLIP2 local inference failed"); }
        Diagnostic(std::string(name) == "pixel_values" ? "image_inference" : "text_inference");
        if (output.size() != 1 || !output[0].IsTensor() ||
            output[0].GetTensorTypeAndShapeInfo().GetElementCount() != kEmbeddingDimension) {
            throw std::runtime_error("SigLIP2 output dimension mismatch");
        }
        const auto* data = output[0].GetTensorData<float>();
        std::vector<float> result(data, data + kEmbeddingDimension);
        double squares = 0;
        for (const auto value : result) {
            if (!std::isfinite(value)) throw std::runtime_error("SigLIP2 output is not finite");
            squares += static_cast<double>(value) * value;
        }
        if (!(squares > 0) || !std::isfinite(squares)) throw std::runtime_error("SigLIP2 output norm is invalid");
        const double norm = std::sqrt(squares);
        for (auto& value : result) value = static_cast<float>(value / norm);
        return result;
    }
};
#else
struct Siglip2Encoder::Impl {};
#endif

Siglip2Encoder::Siglip2Encoder(const std::string& directory) {
#if MEDIA_SERVER_USE_SIGLIP2
    impl_ = std::make_unique<Impl>(directory);
#else
    (void)directory;
#endif
}
Siglip2Encoder::~Siglip2Encoder() = default;
Siglip2Encoder::Siglip2Encoder(Siglip2Encoder&&) noexcept = default;
Siglip2Encoder& Siglip2Encoder::operator=(Siglip2Encoder&&) noexcept = default;

std::array<std::int64_t, Siglip2Encoder::kTextLength> Siglip2Encoder::TokenizeText(const std::string& value) {
#if MEDIA_SERVER_USE_SIGLIP2
    if (!impl_) throw std::runtime_error("SigLIP2 encoder is not initialized");
    const std::lock_guard<std::mutex> guard(impl_->mutex);
    return impl_->Tokens(value);
#else
    (void)value;
    Disabled();
#endif
}

std::vector<float> Siglip2Encoder::EncodeText(const std::string& value) {
#if MEDIA_SERVER_USE_SIGLIP2
    if (!impl_) throw std::runtime_error("SigLIP2 encoder is not initialized");
    const std::lock_guard<std::mutex> guard(impl_->mutex);
    auto ids = impl_->Tokens(value);
    const std::array<std::int64_t, 2> shape{1, 64};
    const auto memory = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
    auto input = Ort::Value::CreateTensor<std::int64_t>(memory, ids.data(), ids.size(), shape.data(), shape.size());
    return Impl::Infer(*impl_->text, "input_ids", input);
#else
    (void)value;
    Disabled();
#endif
}

std::vector<float> Siglip2Encoder::EncodeRgb(const std::uint8_t* rgb, int width, int height, std::size_t stride) {
#if MEDIA_SERVER_USE_SIGLIP2
    if (!impl_) throw std::runtime_error("SigLIP2 encoder is not initialized");
    const std::lock_guard<std::mutex> guard(impl_->mutex);
    auto pixels = PreprocessRgb(rgb, width, height, stride);
    const std::array<std::int64_t, 4> shape{1, 3, 224, 224};
    const auto memory = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
    auto input = Ort::Value::CreateTensor<float>(memory, pixels.data(), pixels.size(), shape.data(), shape.size());
    return Impl::Infer(*impl_->image, "pixel_values", input);
#else
    (void)rgb; (void)width; (void)height; (void)stride;
    Disabled();
#endif
}

}  // namespace analysis
