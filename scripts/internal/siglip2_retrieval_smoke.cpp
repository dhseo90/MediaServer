// 파일 요약: 고정 공개 crop/query를 실제 SigLIP2와 제품 exact index 경로로 조회한다.
#include "analysis/siglip2_encoder.h"
#include "recording/visual_search_index.h"

#include <chrono>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <iterator>
#include <memory>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>
#include <sys/resource.h>

namespace {
using Clock = std::chrono::steady_clock;
double Milliseconds(Clock::time_point begin) {
    return std::chrono::duration<double, std::milli>(Clock::now() - begin).count();
}
std::int64_t UnixMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}
std::string Read(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    if (!input) throw std::runtime_error("retrieval fixture missing");
    return std::string(std::istreambuf_iterator<char>(input), {});
}
void CheckEmbedding(const std::vector<float>& values) {
    if (values.size() != analysis::Siglip2Encoder::kEmbeddingDimension) throw std::runtime_error("retrieval vector dimension");
    double square = 0;
    for (const auto value : values) {
        if (!std::isfinite(value)) throw std::runtime_error("retrieval vector not finite");
        square += double(value) * value;
    }
    if (std::abs(std::sqrt(square) - 1) > 1e-5) throw std::runtime_error("retrieval vector norm");
}
}  // namespace

int main(int argc, char** argv) {
    try {
        if (argc != 5) throw std::runtime_error("retrieval arguments: model, fixture, result, video hash");
        const auto process_start = UnixMs();
        const auto startup_begin = Clock::now();
        analysis::Siglip2Encoder encoder(argv[1]);
        const double startup_ms = Milliseconds(startup_begin);
        const std::filesystem::path fixtures(argv[2]);
        std::ifstream documents_file(fixtures / "documents.txt");
        if (!documents_file) throw std::runtime_error("document manifest missing");
        std::vector<recording::VisualSearchDocument> documents;
        std::unordered_map<std::string, std::string> scenes;
        const auto images_begin = Clock::now();
        std::string id, scene, filename, frame_hash;
        std::int64_t pts;
        std::int32_t num, den;
        int width, height;
        std::size_t stride;
        while (documents_file >> std::quoted(id) >> std::quoted(scene) >> pts >> num >> den
               >> width >> height >> stride >> std::quoted(filename) >> std::quoted(frame_hash)) {
            if (width != 632 || height != 352 || stride != 1896) throw std::runtime_error("crop layout mismatch");
            const auto bytes = Read(fixtures / filename);
            if (bytes.size() != stride * height) throw std::runtime_error("crop byte size mismatch");
            recording::VisualSearchDocument document;
            document.id = id; document.channel_id = "fixture-" + scene;
            document.segment_id = "va-four-scene";
            document.media_sha256 = argv[4]; document.frame_sha256 = frame_hash;
            document.media_pts = pts; document.time_base_num = num; document.time_base_den = den;
            document.embedding = encoder.EncodeRgb(reinterpret_cast<const std::uint8_t*>(bytes.data()), width, height, stride);
            CheckEmbedding(document.embedding);
            if (!scenes.emplace(id, scene).second) throw std::runtime_error("duplicate fixture ID");
            documents.push_back(std::move(document));
        }
        if (!documents_file.eof() || documents.size() != 16) throw std::runtime_error("document manifest count/layout");
        const double image_encode_ms = Milliseconds(images_begin);
        const auto contract = recording::VisualEmbeddingContract::Siglip2();
        std::shared_ptr<const recording::VisualSearchIndex> index;
        std::string error;
        const auto index_begin = Clock::now();
        if (!recording::VisualSearchIndex::Build(contract, std::move(documents), &index, &error)) {
            throw std::runtime_error("retrieval index build failed: " + error);
        }
        const double index_build_ms = Milliseconds(index_begin);
        std::ifstream query_file(fixtures / "queries.txt");
        if (!query_file) throw std::runtime_error("query manifest missing");
        std::ofstream output(argv[3]);
        if (!output) throw std::runtime_error("retrieval result unavailable");
        output << std::setprecision(17) << "{\"startup_ms\":" << startup_ms
               << ",\"image_encode_ms\":" << image_encode_ms << ",\"index_build_ms\":" << index_build_ms
               << ",\"index_logical_bytes\":" << index->logical_bytes() << ",\"cases\":[";
        std::string kind, language, expected;
        std::size_t count = 0;
        while (query_file >> std::quoted(id) >> std::quoted(kind) >> std::quoted(language)
               >> std::quoted(expected) >> std::quoted(filename)) {
            const auto text = Read(fixtures / filename);
            const auto query_begin = Clock::now();
            recording::VisualSearchQuery query;
            query.contract = contract;
            query.embedding = encoder.EncodeText(text);
            const double text_ms = Milliseconds(query_begin);
            CheckEmbedding(query.embedding);
            query.channels = {"fixture-road", "fixture-park", "fixture-living", "fixture-kitchen"};
            query.top_k = 16; query.threshold = -1;
            std::vector<recording::VisualSearchHit> hits;
            const auto search_begin = Clock::now();
            if (!index->Search(query, [](const auto&) { return true; }, &hits, &error)) {
                throw std::runtime_error("retrieval search failed: " + error);
            }
            const double search_ms = Milliseconds(search_begin);
            const double total_ms = Milliseconds(query_begin);
            if (hits.size() != 16) throw std::runtime_error("retrieval hits incomplete");
            if (count++) output << ',';
            output << "{\"id\":" << std::quoted(id) << ",\"kind\":" << std::quoted(kind)
                   << ",\"language\":" << std::quoted(language) << ",\"expected_scene\":" << std::quoted(expected)
                   << ",\"text_encode_ms\":" << text_ms << ",\"search_ms\":" << search_ms
                   << ",\"total_ms\":" << total_ms << ",\"hits\":[";
            for (std::size_t i = 0; i < hits.size(); ++i) {
                const auto& hit = hits[i];
                const auto& document = index->documents().at(hit.document_index);
                if (!std::isfinite(hit.score)) throw std::runtime_error("retrieval score not finite");
                if (i) output << ',';
                output << "{\"document\":" << std::quoted(document.id) << ",\"scene\":"
                       << std::quoted(scenes.at(document.id)) << ",\"score\":" << hit.score << '}';
            }
            output << "]}";
            std::cout << "DONE retrieval " << id << '\n';
        }
        if (!query_file.eof() || count != 24) throw std::runtime_error("query manifest count/layout");
        rusage usage{};
        if (::getrusage(RUSAGE_SELF, &usage) != 0) throw std::runtime_error("retrieval resource measurement failed");
#if defined(__APPLE__)
        const auto rss = static_cast<std::uint64_t>(usage.ru_maxrss);
#else
        const auto rss = static_cast<std::uint64_t>(usage.ru_maxrss) * 1024;
#endif
        output << "],\"max_rss_bytes\":" << rss << ",\"started_unix_ms\":" << process_start
               << ",\"finished_unix_ms\":" << UnixMs() << "}\n";
        output.close();
        if (!output) throw std::runtime_error("retrieval result write failed");
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "FAIL " << error.what() << '\n';
        return 1;
    }
}
