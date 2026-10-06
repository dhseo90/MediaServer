// 파일 요약: 독립 SigLIP2 adapter의 pixel/모델/오류 계약 직접 실행 도구이다.
#include "analysis/siglip2_encoder.h"

#include <algorithm>
#include <cmath>
#include <chrono>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>
#include <sys/resource.h>
#include <fcntl.h>

namespace {
using analysis::Siglip2Encoder;

std::int64_t UnixMilliseconds() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}

struct ProcessResource {
    std::int64_t started = UnixMilliseconds();
    ~ProcessResource() {
        rusage usage{};
        if (getrusage(RUSAGE_SELF, &usage) != 0) {
            std::cout << "RESOURCE_ERROR getrusage failed\n";
            return;
        }
#if defined(__APPLE__)
        const auto bytes = static_cast<std::uint64_t>(usage.ru_maxrss);
#else
        const auto bytes = static_cast<std::uint64_t>(usage.ru_maxrss) * 1024;
#endif
        std::cout << "RESOURCE {\"started_unix_ms\":" << started
                  << ",\"finished_unix_ms\":" << UnixMilliseconds()
                  << ",\"max_rss_bytes\":" << bytes << "}\n";
    }
};

std::string ReadText(const std::filesystem::path& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) throw std::runtime_error("fixture input missing");
    return std::string(std::istreambuf_iterator<char>(file), {});
}

template <typename T>
void Write(const std::filesystem::path& path, const T* values, std::size_t count) {
    std::ofstream output(path, std::ios::binary);
    output.write(reinterpret_cast<const char*>(values), count * sizeof(T));
    if (!output) throw std::runtime_error("fixture output failed");
}

std::vector<int> OpenDescriptors() {
    std::vector<int> result;
    {
        for (const auto& entry : std::filesystem::directory_iterator("/dev/fd")) {
            result.push_back(std::stoi(entry.path().filename().string()));
        }
    }
    result.erase(std::remove_if(result.begin(), result.end(), [](int fd) { return ::fcntl(fd, F_GETFD) < 0; }), result.end());
    std::sort(result.begin(), result.end());
    return result;
}

template <typename Callable>
void Reject(Callable call, const std::string& case_id, const std::string& expected_reason = "") {
    const auto before = OpenDescriptors();
    try { call(); }
    catch (const std::exception& error) {
        if (OpenDescriptors() != before) throw std::runtime_error("descriptor leak: " + case_id);
        if (std::string(error.what()).empty()) throw std::runtime_error("empty failure reason");
        if (!expected_reason.empty() && std::string(error.what()).find(expected_reason) == std::string::npos) {
            throw std::runtime_error("rejection reason mismatch: " + case_id);
        }
        std::cout << "PASS reject " << case_id << "\n";
        return;
    }
    throw std::runtime_error("expected rejection: " + case_id);
}

std::vector<std::uint8_t> ReadRgb(const std::filesystem::path& path, int width, int height,
                                 std::size_t stride) {
    if (width <= 0 || height <= 0 || stride < static_cast<std::size_t>(width) * 3 ||
        stride > std::numeric_limits<std::size_t>::max() / static_cast<std::size_t>(height)) {
        throw std::runtime_error("invalid fixture layout");
    }
    const auto bytes = ReadText(path);
    if (bytes.size() != stride * height) throw std::runtime_error("fixture size mismatch");
    return std::vector<std::uint8_t>(bytes.begin(), bytes.end());
}

void CheckEmbedding(const std::vector<float>& output) {
    if (output.size() != Siglip2Encoder::kEmbeddingDimension) throw std::runtime_error("output size mismatch");
    double square = 0;
    for (auto value : output) {
        if (!std::isfinite(value)) throw std::runtime_error("nonfinite embedding");
        square += static_cast<double>(value) * value;
    }
    if (std::abs(std::sqrt(square) - 1.0) > 1e-5) throw std::runtime_error("embedding norm mismatch");
}

}  // namespace

int main(int argc, char** argv) {
    ProcessResource resource;
    try {
        if (argc < 2) throw std::runtime_error("missing smoke mode");
        const std::string mode = argv[1];
        if (mode == "pixel" && argc == 7) {
            const int width = std::stoi(argv[2]);
            const int height = std::stoi(argv[3]);
            const auto stride = static_cast<std::size_t>(std::stoull(argv[4]));
            const auto rgb = ReadRgb(argv[5], width, height, stride);
            auto resized = Siglip2Encoder::ResizeRgb(rgb.data(), width, height, stride);
            auto pixels = Siglip2Encoder::PreprocessRgb(rgb.data(), width, height, stride);
            Write(std::string(argv[6]) + ".rgb", resized.data(), resized.size());
            Write(std::string(argv[6]) + ".f32", pixels.data(), pixels.size());
            std::cout << "PASS pixel output\n";
        } else if (mode == "model" && argc == 5) {
            const auto before = OpenDescriptors();
            Siglip2Encoder encoder(argv[2]);
            if (OpenDescriptors() != before) throw std::runtime_error("model constructor descriptor leak");
            std::cout << "PASS normal constructor descriptors closed\n";
            const auto fixtures = std::filesystem::path(argv[3]);
            const auto results = std::filesystem::path(argv[4]);
            std::ifstream manifest(fixtures / "manifest.txt");
            std::string type, case_id, input;
            while (manifest >> type >> case_id) {
                std::vector<float> output;
                if (type == "text") {
                    manifest >> input;
                    const auto text = ReadText(fixtures / input);
                    auto tokens = encoder.TokenizeText(text);
                    Write(results / (case_id + ".i64"), tokens.data(), tokens.size());
                    output = encoder.EncodeText(text);
                } else if (type == "image") {
                    int width, height;
                    std::size_t stride;
                    manifest >> width >> height >> stride >> input;
                    const auto rgb = ReadRgb(fixtures / input, width, height, stride);
                    output = encoder.EncodeRgb(rgb.data(), width, height, stride);
                } else {
                    throw std::runtime_error("unknown fixture type");
                }
                if (!manifest) throw std::runtime_error("fixture manifest is malformed");
                CheckEmbedding(output);
                Write(results / (case_id + ".f32"), output.data(), output.size());
                std::cout << "PASS embedding " << case_id << "\n";
            }
        } else if (mode == "query" && argc == 3) {
            Siglip2Encoder encoder(argv[2]);
            const auto check=[](bool ok,const char* name){if(!ok)throw std::runtime_error(name);std::cout<<"PASS query "<<name<<"\n";};
            for (const auto count : {62U,63U,64U}) {
                std::string text;for(unsigned i=0;i<count;++i){if(i)text+=" ";text+="red";}
                const auto info=encoder.InspectText(text);const auto ids=encoder.TokenizeText(text);
                check(info.body_tokens==count,"exact repeated-word body count");
                check(info.within_limit==(count<=63),"62/63/64 acceptance boundary");
                check(ids[std::min(count,63U)]==1,"EOS unchanged");
                for(std::size_t i=count+1;i<64;++i)check(ids[i]==0,"padding unchanged");
            }
            for(const auto& pair:std::vector<std::pair<std::string,std::string>>{
                {"ÄBC RED 붉은 공 TWO dogs NOT behind a car","äbc red 붉은 공 two dogs not behind a car"},
                {"두 사람이 차 뒤에 있지 않음","두 사람이 차 뒤에 있지 않음"},
                {"  RED\t scene\n","  red\t scene\n"}}) {
                const auto info=encoder.InspectText(pair.first);
                check(info.original_text==pair.first&&info.encoder_text==pair.second,"Unicode and semantic words retained before tokenizer");
                check(encoder.TokenizeText(pair.first)==encoder.TokenizeText(pair.second),"same normalization and token IDs");
            }
            std::string dense;for(unsigned i=0;i<24;++i)dense+="㐀";
            const auto info=encoder.InspectText(dense);check(info.body_tokens>63&&!info.within_limit&&dense.size()<128,"short many-token UTF-8 input");
            for(const auto& text:std::vector<std::string>{""," \t\n","　","\xff",std::string("a\0b",3)})
                Reject([&]{encoder.InspectText(text);},"inspection rejects invalid/empty");
            const auto base=std::filesystem::path(argv[2])/"adapter";
            for(const auto id:{0,1,2,3,6,7,8,9}) {
                const auto name="text-"+std::to_string(id);const auto text=ReadText(base/"fixtures"/(name+".txt"));
                const auto old_ids=ReadText(base/"results"/(name+".i64"));const auto ids=encoder.TokenizeText(text);
                check(old_ids.size()==ids.size()*sizeof(ids[0])&&old_ids==std::string(reinterpret_cast<const char*>(ids.data()),old_ids.size()),"preserved token IDs exact");
                const auto raw=ReadText(base/"results"/(name+".f32"));check(raw.size()==768*sizeof(float),"preserved vector size");
                std::vector<float> previous(768);std::memcpy(previous.data(),raw.data(),raw.size());
                const auto actual=encoder.EncodeText(text);double dot=0,a=0,b=0,max_error=0;
                for(std::size_t i=0;i<actual.size();++i){dot+=double(actual[i])*previous[i];a+=double(actual[i])*actual[i];b+=double(previous[i])*previous[i];max_error=std::max(max_error,std::abs(double(actual[i])-previous[i]));}
                check(max_error<=1e-4&&dot/std::sqrt(a*b)>=.99999&&std::abs(std::sqrt(a)-1)<=1e-5,"preserved text vector tolerance");
                std::cout<<"PARITY "<<name<<" maxAbs="<<max_error<<" cosine="<<dot/std::sqrt(a*b)<<"\n";
            }
        } else if (mode == "errors" && argc == 4) {
            Siglip2Encoder encoder(argv[2]);
            Reject([&] { encoder.EncodeText(""); }, "empty_text");
            Reject([&] { encoder.EncodeText(" \t\n"); }, "whitespace_text");
            Reject([&] { encoder.EncodeText("\xE3\x80\x80"); }, "unicode_whitespace_text");
            Reject([&] { encoder.EncodeText("\xFF"); }, "invalid_utf8");
            Reject([&] { encoder.EncodeText(std::string("a\0b", 3)); }, "nul_text");
            Reject([&] { encoder.EncodeText(std::string(Siglip2Encoder::kMaxTextBytes + 1, 'a')); },
                   "text_limit_plus_one", "text exceeds the input limit");
            std::uint8_t pixel[3]{};
            Reject([&] { encoder.EncodeRgb(nullptr, 1, 1, 3); }, "null_rgb");
            Reject([&] { encoder.EncodeRgb(pixel, 0, 1, 3); }, "zero_width");
            Reject([&] { encoder.EncodeRgb(pixel, 1, -1, 3); }, "negative_height");
            Reject([&] { encoder.EncodeRgb(pixel, 2, 1, 3); }, "short_stride");
            Reject([&] { encoder.EncodeRgb(pixel, 1, 3, std::numeric_limits<std::size_t>::max()); }, "span_overflow");
            Reject([&] { encoder.EncodeRgb(pixel, Siglip2Encoder::kMaxImageDimension + 1, 1,
                                         (Siglip2Encoder::kMaxImageDimension + 1) * 3); },
                   "dimension_limit_plus_one", "RGB dimensions exceed the input limit");
            Reject([&] { encoder.EncodeRgb(pixel, 1, 2, Siglip2Encoder::kMaxRgbSpanBytes - 2); },
                   "span_limit_plus_one", "RGB span exceeds the input limit");
            CheckEmbedding(encoder.EncodeText(std::string(Siglip2Encoder::kMaxTextBytes, 'a')));
            std::cout << "PASS boundary text_limit\n";
            std::vector<std::uint8_t> wide(Siglip2Encoder::kMaxImageDimension * 3, 123);
            CheckEmbedding(encoder.EncodeRgb(wide.data(), Siglip2Encoder::kMaxImageDimension, 1, wide.size()));
            std::cout << "PASS boundary dimension_limit\n";
            std::vector<std::uint8_t> large_span(Siglip2Encoder::kMaxRgbSpanBytes, 123);
            CheckEmbedding(encoder.EncodeRgb(large_span.data(), 1, 2, Siglip2Encoder::kMaxRgbSpanBytes - 3));
            std::cout << "PASS boundary span_limit\n";
            const auto negative = std::filesystem::path(argv[3]);
            for (const auto* name : {"missing", "bad_tokenizer", "bad_image", "bad_text", "wrong_shape", "wrong_type"}) {
                Reject([&] { Siglip2Encoder invalid((negative / name).string()); }, name);
            }
            for (const auto* name : {"same_size_bad_tokenizer", "same_size_bad_image"}) {
                Reject([&] { Siglip2Encoder invalid((negative / name).string()); }, name, "asset SHA256 mismatch");
            }
        } else if (mode == "loader-io" && argc == 4) {
            const std::string fault = argv[3];
            if (fault != "short_write" && fault != "eintr" && fault != "no_space") throw std::runtime_error("invalid loader fault");
            if (::setenv("MEDIA_SERVER_SIGLIP2_IO_FAULT", fault.c_str(), 1) != 0) throw std::runtime_error("fault setup failed");
            if (fault == "no_space") {
                Reject([&] { Siglip2Encoder encoder(argv[2]); }, "space_error", "temporary write failed");
            } else {
                const auto before = OpenDescriptors();
                Siglip2Encoder encoder(argv[2]);
                if (OpenDescriptors() != before) throw std::runtime_error("loader constructor descriptor leak");
                CheckEmbedding(encoder.EncodeText("A red car"));
                const std::uint8_t rgb[3]{123, 15, 210};
                CheckEmbedding(encoder.EncodeRgb(rgb, 1, 1, 3));
                std::cout << "PASS loader " << fault << "\n";
            }
            ::unsetenv("MEDIA_SERVER_SIGLIP2_IO_FAULT");
        } else if (mode == "disabled" && argc == 2) {
            Siglip2Encoder encoder("unused");
            auto require_disabled = [](auto call) {
                try { call(); }
                catch (const std::runtime_error& error) {
                    if (std::string(error.what()).find("disabled") != std::string::npos) return;
                    throw;
                }
                throw std::runtime_error("disabled build accepted inference");
            };
            require_disabled([&] { encoder.EncodeText("test"); });
            require_disabled([&] { encoder.EncodeRgb(nullptr, 1, 1, 3); });
            require_disabled([&] { encoder.TokenizeText("test"); });
            std::cout << "PASS disabled build\n";
        } else {
            throw std::runtime_error("invalid smoke arguments");
        }
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "FAIL " << error.what() << "\n";
        return 1;
    }
}
