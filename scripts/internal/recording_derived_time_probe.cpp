// 파일 용도: 실제 writer 파일의 encoded AU 시각과 원본 결박을 측정한다.
#include "recording_media_test_fixture.h"
namespace {
std::string Number(GstClockTime value) {
    return GST_CLOCK_TIME_IS_VALID(value) ? std::to_string(value) : "null";
}
std::string Signed(__int128 value) {
    if (!value) return "0";
    const bool negative = value < 0;
    if (negative) value = -value;
    std::string result;
    while (value) { result.push_back('0' + static_cast<int>(value % 10)); value /= 10; }
    if (negative) result.push_back('-');
    std::reverse(result.begin(), result.end()); return result;
}
struct Stats {
    std::size_t count{0};
    __int128 min_delta{0}, max_delta{0}, min_corrected{0}, max_corrected{0};
    void Add(__int128 delta, __int128 corrected) {
        if (!count) { min_delta = max_delta = delta; min_corrected = max_corrected = corrected; }
        else { min_delta = std::min(min_delta, delta); max_delta = std::max(max_delta, delta);
               min_corrected = std::min(min_corrected, corrected); max_corrected = std::max(max_corrected, corrected); }
        ++count;
    }
};
bool Measure(const std::string& id, Store& store, const Encoded& input, std::int64_t duration, std::size_t expected_segments) {
    recording::GStreamerSegmentWriter::Options options(store.root, duration);
    options.managed_journal = &store.journal; options.managed_catalog = &store.catalog; options.managed_store_id = "probe-store";
    recording::GStreamerSegmentWriter writer(options);
    bool legacy_callback = false; std::string error;
    if (!writer.Start("probe-channel", "unused-legacy-epoch", input.descriptor,
        [&](auto, auto, auto*) { legacy_callback = true; return true; }, &error))
        throw std::runtime_error("writer-start:" + error);
    for (const auto& packet : input.packets) writer.Push(packet, 0);
    writer.Stop();
    const auto segments = store.Segments();
    bool valid = !legacy_callback && !writer.TimeSnapshot() && segments.size() == expected_segments;
    std::size_t total = 0;
    std::map<std::pair<std::string, std::uint64_t>, const media::Packet*> originals;
    for (const auto& packet : input.packets)
        originals.emplace(std::make_pair(packet.observation->source_generation, packet.observation->ordinal), &packet);
    std::size_t segment_index = 0;
    for (const auto& segment : segments) {
        const auto binding = store.catalog.FindSourceBinding(segment.segment_id);
        if (!binding) { valid = false; continue; }
        valid = valid && binding->index_complete && binding->segment_id == segment.segment_id &&
            binding->media_epoch_id == segment.media_epoch_id && binding->source_id == segment.source_id &&
            binding->channel_id == segment.channel_id && binding->store_id == segment.store_id && binding->track_id == "video-0" &&
            !binding->samples.empty() && binding->last_accepted_ordinal == binding->samples.back().ordinal;
        const auto path = store.root / "probe-channel" / (segment.segment_id + ".mp4");
        Pipeline demux("filesrc location=\"" + path.string() +
            "\" ! qtdemux ! h264parse ! video/x-h264,stream-format=byte-stream,alignment=au ! appsink name=out sync=false");
        Stats stats; std::size_t index = 0; bool eos = false;
        std::cout << "[segment] case=" << id << " index=" << segment_index << " id=" << segment.segment_id
                  << " epoch=" << segment.media_epoch_id << " generation=" << binding->source_generation
                  << " generation_order=" << binding->generation_order << " media_start=" << segment.media_start_pts
                  << " media_end=" << (segment.media_end_pts ? std::to_string(*segment.media_end_pts) : "null")
                  << " binding_count=" << binding->samples.size() << '\n';
        for (const auto& mapping : segment.mappings)
            std::cout << "[mapping] case=" << id << " segment=" << segment_index << " start=" << mapping.start_pts
                      << " end=" << (mapping.end_pts ? std::to_string(*mapping.end_pts) : "null")
                      << " provenance=" << mapping.provenance << " reason=" << mapping.reason
                      << " utc_start=" << (mapping.utc_start_ns ? std::to_string(*mapping.utc_start_ns) : "null")
                      << " utc_end=" << (mapping.utc_end_ns ? std::to_string(*mapping.utc_end_ns) : "null") << '\n';
        while (index <= input.packets.size()) {
            GstSample* sample = gst_app_sink_try_pull_sample(GST_APP_SINK(demux.sink), 3 * GST_SECOND);
            if (!sample) { eos = gst_app_sink_is_eos(GST_APP_SINK(demux.sink)); break; }
            GstBuffer* buffer = gst_sample_get_buffer(sample);
            const auto* gst_segment = gst_sample_get_segment(sample);
            const bool pts_valid = GST_BUFFER_PTS_IS_VALID(buffer);
            guint64 stream_time = GST_CLOCK_TIME_NONE;
            const gint stream_sign = gst_segment && gst_segment->format == GST_FORMAT_TIME && pts_valid ?
                gst_segment_to_stream_time_full(gst_segment, GST_FORMAT_TIME, GST_BUFFER_PTS(buffer), &stream_time) : 0;
            valid = valid && pts_valid && gst_segment && gst_segment->format == GST_FORMAT_TIME && index < binding->samples.size();
            if (index < binding->samples.size()) {
                const auto& bound = binding->samples[index];
                const auto original = originals.find({binding->source_generation, bound.ordinal});
                const bool found = original != originals.end();
                valid = valid && found;
                if (found) {
                    const auto& observation = *original->second->observation;
                    valid = valid && observation.pts_ns && *observation.pts_ns == bound.pts_ns &&
                        observation.generation_order == binding->generation_order;
                    const __int128 delta = static_cast<__int128>(bound.pts_ns) - GST_BUFFER_PTS(buffer);
                    const __int128 corrected = delta - segment.media_start_pts;
                    if (pts_valid) stats.Add(delta, corrected);
                    std::cout << "[packet] case=" << id << " segment=" << segment_index << " decode_index=" << index
                        << " ordinal=" << bound.ordinal << " original_pts=" << bound.pts_ns
                        << " original_dts=" << Number(observation.dts_ns.value_or(GST_CLOCK_TIME_NONE))
                        << " original_duration=" << Number(observation.duration_ns.value_or(GST_CLOCK_TIME_NONE))
                        << " observed_utc=" << observation.observed_utc_ns
                        << " file_pts=" << Number(GST_BUFFER_PTS(buffer)) << " file_dts=" << Number(GST_BUFFER_DTS(buffer))
                        << " file_duration=" << Number(GST_BUFFER_DURATION(buffer))
                        << " segment_start=" << (gst_segment ? Number(gst_segment->start) : "null")
                        << " segment_time=" << (gst_segment ? Number(gst_segment->time) : "null")
                        << " stream_time=" << (stream_sign ? Signed(static_cast<__int128>(stream_time) * stream_sign) : "null")
                        << " original_minus_file=" << (pts_valid ? Signed(delta) : "null")
                        << " normalized_delta=" << (pts_valid ? Signed(corrected) : "null") << '\n';
                }
            }
            ++index; gst_sample_unref(sample);
        }
        valid = valid && eos && index == binding->samples.size() && stats.count == index;
        total += index;
        std::cout << "[measurement] case=" << id << " segment=" << segment_index << " packets=" << index
            << " delta_min=" << Signed(stats.min_delta) << " delta_max=" << Signed(stats.max_delta)
            << " constant_offset=" << (stats.min_delta == stats.max_delta ? "true" : "false")
            << " normalized_delta_min=" << Signed(stats.min_corrected) << " normalized_delta_max=" << Signed(stats.max_corrected)
            << " eos=" << (eos ? "true" : "false") << '\n';
        ++segment_index;
    }
    std::cout << "[case-summary] case=" << id << " inputs=" << input.packets.size() << " segments=" << segments.size()
              << " demux_packets=" << total << '\n';
    return valid && total == input.packets.size();
}
} // namespace
int main(int argc, char** argv) {
    if (argc != 2) return 2;
    gst_init(nullptr, nullptr);
    int passed = 0, failed = 0;
    try {
        auto plain = Encode(30, false, false);
        auto split = Encode(60, false, false);
        auto bframes = Encode(30, true, false);
        auto fractional = Encode(30, false, true);
        const char* titles[] = {"C501 H264 실제 파일 시각 측정", "C502 비영점 원본 시각 측정",
            "C503 정상 segment 분할 측정", "C504 B-frame decode preroll 측정", "C505 비영점 B-frame 시각 측정",
            "C506 분수 frame rate 시각 측정", "C507 시계 역행과 미디어 시각 분리", "C508 PTS 초기화 epoch 분리"};
        for (int i = 0; i < 8; ++i) {
            const auto id = "C" + std::to_string(501 + i);
            auto input = i == 2 || i == 7 ? split : i == 3 || i == 4 ? bframes : i == 5 ? fractional : plain;
            if (i == 1 || i == 4) Shift(input, 7000000000ULL);
            if (i == 6) for (std::size_t j = 15; j < input.packets.size(); ++j)
                input.packets[j].observation->observed_utc_ns -= 4034000000LL;
            if (i == 7) for (std::size_t j = 20; j < input.packets.size(); ++j) {
                auto& p = input.packets[j]; p.pts -= 2000000000LL; p.dts -= 2000000000LL;
                auto& o = *p.observation; o.source_generation = "probe-generation-b"; o.generation_order = 2;
                o.ordinal = j - 19; *o.pts_ns -= 2000000000ULL; *o.dts_ns -= 2000000000ULL;
            }
            Store store(std::filesystem::path(argv[1]) / id);
            bool ok = Measure(id, store, input, i == 2 || i == 7 ? 2000 : 10000, i == 2 || i == 7 ? 3 : 1);
            if (i == 6) {
                const auto segments = store.Segments();
                bool remap = segments.size() == 1 && segments[0].mappings.size() == 2;
                if (remap) {
                    const auto& first = segments[0].mappings[0];
                    const auto& second = segments[0].mappings[1];
                    remap = first.provenance == "estimated" && second.provenance == "estimated" &&
                        first.start_pts == 0 && first.end_pts == 1500000000LL &&
                        second.start_pts == 1500000000LL && second.end_pts == 3000000000LL &&
                        first.utc_start_ns && first.utc_end_ns && second.utc_start_ns && second.utc_end_ns &&
                        *second.utc_start_ns < *first.utc_start_ns && *second.utc_end_ns < *first.utc_end_ns;
                }
                std::cout << "[utc-check] case=C507 two_estimated_reverse_ranges=" << (remap ? "true" : "false") << '\n';
                ok = ok && remap;
            }
            if (i == 7) {
                const auto segments = store.Segments();
                const bool distinct = segments.size() == 3 &&
                    segments[0].media_epoch_id != segments[1].media_epoch_id &&
                    segments[1].media_epoch_id == segments[2].media_epoch_id;
                std::cout << "[epoch-check] case=C508 reset_distinct=" << (distinct ? "true" : "false") << '\n';
                ok = ok && distinct;
            }
            std::cout << (ok ? "[pass] " : "[fail] ") << titles[i] << '\n';
            ok ? ++passed : ++failed;
        }
    } catch (const std::exception& error) {
        std::cerr << "[setup-fail] " << error.what() << '\n'; return 2;
    }
    std::cout << "[summary] pass=" << passed << " fail=" << failed << '\n';
    return failed ? 1 : 0;
}
