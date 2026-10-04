// 파일 용도: sample 고유성·원본 hash를 검증한 독립 FD decode와 무손실 PNG 생성.
#include "recording/evidence_frame_extractor.h"
#include "recording/recording_search_reader.h"
#include "recording/visual_frame_decoder.h"
#include <algorithm>
#include <array>
#include <limits>
#include <zlib.h>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording {
namespace {
bool Fail(std::string* error, const char* code) { if (error) *error = code; return false; }
void U32(std::vector<std::uint8_t>& bytes, std::uint32_t n) {
    for (int shift = 24; shift >= 0; shift -= 8) bytes.push_back(static_cast<std::uint8_t>(n >> shift));
}
void Chunk(std::vector<std::uint8_t>& out, const char* type, const std::vector<std::uint8_t>& bytes) {
    U32(out, static_cast<std::uint32_t>(bytes.size()));
    const auto start = out.size();
    out.insert(out.end(), type, type + 4); out.insert(out.end(), bytes.begin(), bytes.end());
    U32(out, static_cast<std::uint32_t>(crc32(0, out.data() + start, static_cast<uInt>(bytes.size() + 4))));
}
bool Png(const VisualRgbFrame& frame, std::vector<std::uint8_t>* output) {
    const std::size_t row = std::size_t(frame.width) * 3;
    if (!row || frame.height <= 0 || frame.rgb.size() != row * frame.height) return false;
    std::vector<std::uint8_t> raw((row + 1) * frame.height, 0);
    for (int y = 0; y < frame.height; ++y)
        std::copy_n(frame.rgb.data() + row * y, row, raw.data() + (row + 1) * y + 1);
    uLongf size = compressBound(static_cast<uLong>(raw.size()));
    std::vector<std::uint8_t> compressed(size);
    if (compress2(compressed.data(), &size, raw.data(), static_cast<uLong>(raw.size()), Z_BEST_SPEED) != Z_OK) return false;
    compressed.resize(size);
    std::vector<std::uint8_t> png{137,80,78,71,13,10,26,10}, header;
    U32(header, frame.width); U32(header, frame.height);
    header.insert(header.end(), {8,2,0,0,0});
    Chunk(png, "IHDR", header); Chunk(png, "IDAT", compressed); Chunk(png, "IEND", {});
    *output = std::move(png); return true;
}
void Time(const RecordingSegmentV2& segment, EvidenceFrameV1* frame) {
    unsigned matches = 0;
    for (const auto& mapping : segment.mappings) {
        if (!mapping.end_pts) continue;
        const __int128 tick = static_cast<__int128>(frame->pts_ns) * segment.time_base_den;
        const __int128 start = static_cast<__int128>(mapping.start_pts) * segment.time_base_num * 1000000000;
        const __int128 end = static_cast<__int128>(*mapping.end_pts) * segment.time_base_num * 1000000000;
        if (tick < start || tick >= end) continue;
        ++matches;
        if (mapping.provenance == "unknown" || !mapping.utc_start_ns || !mapping.utc_end_ns ||
            (tick - start) % segment.time_base_den) continue;
        const __int128 utc = *mapping.utc_start_ns + (tick - start) / segment.time_base_den;
        if (utc < 0 || utc >= *mapping.utc_end_ns || utc >= INT64_MAX) continue;
        frame->utc_ns = static_cast<std::int64_t>(utc);
        frame->time_provenance = mapping.provenance;
        frame->uncertainty_ns = mapping.uncertainty_ns;
    }
    if (matches != 1 || !frame->utc_ns) {
        frame->utc_ns.reset(); frame->uncertainty_ns.reset(); frame->time_provenance = "unknown";
    } else {
        FrameLocatorV1 locator; locator.segment_id = frame->segment_id;
        locator.frame = {*frame->utc_ns / 1000000, frame->pts_ns, 1, 1000000000};
        // source packet ordinal은 frame_index와 같다고 추정하지 않는다.
        frame->locator = std::move(locator);
    }
}
} // namespace
bool EvidenceIsSha256(const std::string& value) {
    return value.size() == 64 && std::all_of(value.begin(), value.end(), [](char c) {
        return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f');
    });
}
std::string EvidenceSha256(const void* bytes, std::size_t size) {
#if MEDIA_SERVER_USE_OPENSSL
    std::array<unsigned char, EVP_MAX_MD_SIZE> digest{}; unsigned length = 0;
    if (!EVP_Digest(bytes, size, digest.data(), &length, EVP_sha256(), nullptr) || length != 32) return {};
    constexpr char hex[] = "0123456789abcdef"; std::string value; value.reserve(64);
    for (unsigned i = 0; i < length; ++i) { value += hex[digest[i] >> 4]; value += hex[digest[i] & 15]; }
    return value;
#else
    (void)bytes; (void)size; return {};
#endif
}
bool EvidenceFrameExtractor::ExtractMedia(const std::string& channel, const std::string& id,
    std::int64_t pts, const std::string& expected, EvidenceFrameV1* output, std::string* error,
    std::chrono::steady_clock::time_point deadline, const std::function<bool()>& cancelled) const {
    const auto expired = [&] { return std::chrono::steady_clock::now() >= deadline || (cancelled && cancelled()); };
    if (!output || pts < 0 || !EvidenceIsSha256(expected) || !ValidateOpaqueId(id, nullptr) ||
        !ValidateRecordingReferenceId(channel, nullptr)) return Fail(error, "evidence-invalid-frame");
    if (expired()) return Fail(error, "evidence-timeout");
    const auto segment = catalog_.FindSegmentV2ById(id);
    if (!segment || segment->channel_id != channel) return Fail(error, "evidence-source-unavailable");
    if (segment->checksum_sha256 != expected) return Fail(error, "evidence-source-changed");
    const auto binding = catalog_.FindSourceBinding(id);
    if (!binding || !binding->file_evidence || !ValidateRecordingSourceBindingForSegment(*binding, *segment, nullptr))
        return Fail(error, "evidence-frame-unsupported");
    const auto& file = *binding->file_evidence;
    const RecordingFileSampleEvidenceV1* selected = nullptr;
    for (const auto& sample : file.samples) if (sample.original_pts_ns == pts) {
        if (selected) return Fail(error, "evidence-frame-ambiguous"); selected = &sample;
    }
    if (!selected || selected->native_pts < file.edit_media_time || !file.timescale)
        return Fail(error, "evidence-frame-not-found");
    MediaInspectionOptions options; options.deadline = deadline; options.cancelled = expired;
    auto media = reader_.ResolveMedia(channel, id, std::move(options));
    if (!media) return Fail(error, expired() ? "evidence-timeout" : "evidence-source-unavailable");
    SearchSeekTarget seek; RecordingSearchReader search(catalog_, reader_);
    if (!search.SourceSeek(channel, id, pts, 1, 1000000000, &seek, error, media.get(), expired, deadline)) return false;
    if (seek.sample_ordinal != selected->ordinal) return Fail(error, "evidence-source-changed");
    const __int128 tick = (static_cast<__int128>(selected->native_pts) - file.edit_media_time) * 1000000000;
    const __int128 target = (tick + file.timescale / 2) / file.timescale;
    if (target < 0 || target > INT64_MAX) return Fail(error, "evidence-invalid-frame");
    const auto remaining = std::chrono::duration_cast<std::chrono::milliseconds>(deadline - std::chrono::steady_clock::now()).count();
    if (remaining <= 0 || expired()) return Fail(error, "evidence-timeout");
    VisualRgbFrame decoded;
    if (!DecodeVisualFrame(media->fd(), media->size_bytes(), static_cast<std::int64_t>(target), &decoded,
        error, expired, static_cast<std::uint32_t>(std::min<std::int64_t>(5000, remaining)))) return false;
    EvidenceFrameV1 result;
    result.segment_id = id; result.media_sha256 = expected; result.sample_sha256 = selected->sample_sha256;
    result.source_generation = binding->source_generation; result.generation_order = binding->generation_order;
    result.media_epoch_id = binding->media_epoch_id; result.track_id = binding->track_id;
    result.sample_ordinal = selected->ordinal; result.pts_ns = pts; result.presentation_ns = decoded.presentation_ns;
    result.width = decoded.width; result.height = decoded.height;
    result.rgb_sha256 = EvidenceSha256(decoded.rgb.data(), decoded.rgb.size());
    if (!Png(decoded, &result.png)) return Fail(error, "evidence-png-failed");
    result.png_sha256 = EvidenceSha256(result.png.data(), result.png.size()); Time(*segment, &result);
    if (!EvidenceIsSha256(result.rgb_sha256) || !EvidenceIsSha256(result.png_sha256)) return Fail(error, "evidence-crypto-unavailable");
    if (expired()) return Fail(error, "evidence-timeout");
    *output = std::move(result); if (error) error->clear(); return true;
}
bool EvidenceFrameExtractor::Extract(const std::string& channel, const FrameLocatorV1& locator,
    const std::string& expected, EvidenceFrameV1* output, std::string* error,
    std::chrono::steady_clock::time_point deadline, const std::function<bool()>& cancelled) const {
    const auto& time = locator.frame;
    // v4.4의 정확성 증명은 원본 sample PTS 기준이다. index→sample 대응을 추정하지 않는다.
    if (locator.frame_index) return Fail(error, "evidence-frame-index-unsupported");
    if (!output || locator.schema != "media-server.frame-locator.v1" || time.pts < 0 || time.utc_ms < 0 ||
        time.time_base_num <= 0 || time.time_base_den <= 0) return Fail(error, "evidence-invalid-frame");
    const __int128 ns = static_cast<__int128>(time.pts) * time.time_base_num * 1000000000;
    if (ns % time.time_base_den || ns / time.time_base_den > INT64_MAX) return Fail(error, "evidence-invalid-frame");
    EvidenceFrameV1 result;
    if (!ExtractMedia(channel, locator.segment_id, static_cast<std::int64_t>(ns / time.time_base_den),
        expected, &result, error, deadline, cancelled)) return false;
    if (!result.utc_ns || *result.utc_ns / 1000000 != time.utc_ms) return Fail(error, "evidence-frame-time-mismatch");
    // optional hints는 기존 계약에 정의되지 않은 source ordinal로 재해석하지 않는다.
    result.locator = locator; *output = std::move(result); if (error) error->clear(); return true;
}
} // namespace recording
